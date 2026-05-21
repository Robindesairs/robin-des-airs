/**
 * Collecte automatique de preuves (METAR/TAF + vol API) → Netlify Blobs + Airtable.
 * Pas de Playwright sur Netlify — captures locales via PROOFS_PLAYWRIGHT_WEBHOOK_URL (Make).
 */

const crypto = require('crypto');
const { SITE_URL, airtablePatch } = require('./airtable-robin');
const { fetchAerodatabox, parisYmd, rapidApiKey } = require('./aerodatabox-flight');

const STORE_NAME = 'robin-proofs';
const PROOFS_PREFIX = 'dossier/';

let netlifyBlobsModule = null;
try {
  netlifyBlobsModule = require('@netlify/blobs');
} catch (e) {}

function proofsSecret() {
  return (
    process.env.PROOFS_COLLECT_SECRET ||
    process.env.AIRTABLE_WEBHOOK_SECRET ||
    process.env.AIRTABLE_SYNC_SECRET ||
    ''
  ).trim();
}

function reportSecret() {
  return (process.env.PROOFS_REPORT_SECRET || proofsSecret() || '').trim();
}

function extractIata(raw) {
  const s = String(raw || '').trim().toUpperCase();
  const m = s.match(/\b([A-Z]{3})\b/);
  return m ? m[1] : s.length === 3 && /^[A-Z]{3}$/.test(s) ? s : '';
}

function normalizeDateYmd(raw) {
  const s = String(raw || '').trim();
  if (!s) return parisYmd();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dm = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dm) {
    return `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
  }
  return parisYmd();
}

function proofReportToken(ref) {
  const secret = reportSecret();
  if (!secret || !ref) return '';
  return crypto.createHmac('sha256', secret).update(String(ref)).digest('base64url').slice(0, 22);
}

function proofReportUrl(ref) {
  const t = proofReportToken(ref);
  if (!t || !ref) return '';
  const base = SITE_URL.replace(/\/$/, '');
  return `${base}/api/proof-report?ref=${encodeURIComponent(ref)}&t=${encodeURIComponent(t)}`;
}

async function fetchAviationWeather(kind, ids) {
  const list = [...new Set(ids.filter((x) => /^[A-Z]{3}$/.test(x)))];
  if (!list.length) return { ok: false, error: 'aucun IATA', items: [] };
  const url = `https://aviationweather.gov/api/data/${kind}?ids=${list.join(',')}&format=json`;
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'RobinDesAirs-Proofs/1.0' },
    });
    const text = await r.text();
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}`, items: [] };
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: 'non-JSON', items: [] };
    }
    const items = Array.isArray(json) ? json : [];
    return { ok: true, items };
  } catch (e) {
    return { ok: false, error: e.message, items: [] };
  }
}

function summarizeMetar(items) {
  return items.map((m) => {
    const id = m.icaoId || m.stationId || m.icao || '?';
    const raw = m.rawOb || m.rawText || '';
    const obs = m.obsTime || m.reportTime || '';
    return { id, obs, raw: String(raw).slice(0, 500) };
  });
}

function summarizeTaf(items) {
  return items.map((t) => {
    const id = t.icaoId || t.stationId || '?';
    const raw = t.rawTAF || t.rawOb || '';
    return { id, raw: String(raw).slice(0, 800) };
  });
}

async function collectProofReport(input) {
  const ref = (input.ref || '').trim();
  const vol = String(input.vol || '')
    .trim()
    .toUpperCase()
    .replace(/\s/g, '');
  const dateYmd = normalizeDateYmd(input.date);
  let dep = extractIata(input.depart);
  let arr = extractIata(input.arrivee);
  const errors = [];
  const sources = [];

  let flight = null;
  const key = rapidApiKey();
  if (vol && key) {
    try {
      const rows = await fetchAerodatabox(vol, dateYmd, key);
      flight = rows[0] || null;
      if (flight) {
        if (!dep) dep = flight.departure?.iataCode || '';
        if (!arr) arr = flight.arrival?.iataCode || '';
        sources.push('aerodatabox');
      }
    } catch (e) {
      errors.push({ step: 'flight', message: e.message });
    }
  } else if (vol && !key) {
    errors.push({ step: 'flight', message: 'RAPIDAPI_KEY absent — vol API ignoré' });
  }

  const airports = [...new Set([dep, arr].filter(Boolean))];
  const [metarRes, tafRes] = await Promise.all([
    fetchAviationWeather('metar', airports),
    fetchAviationWeather('taf', airports),
  ]);
  if (metarRes.ok) sources.push('aviationweather-metar');
  else if (airports.length) errors.push({ step: 'metar', message: metarRes.error || 'échec' });
  if (tafRes.ok) sources.push('aviationweather-taf');
  else if (airports.length) errors.push({ step: 'taf', message: tafRes.error || 'échec' });

  const reportUrl = proofReportUrl(ref);
  const fr24 = vol ? `https://www.flightradar24.com/data/flights/${vol.toLowerCase()}` : '';
  const flightstats = dep ? `https://www.flightstats.com/v2/airport-conditions/${dep}` : '';

  const summaryLines = [
    `[Preuves auto ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC]`,
    vol ? `Vol ${vol} (${dateYmd})` : null,
    dep && arr ? `Route ${dep}→${arr}` : dep || arr ? `Aéroports ${airports.join(', ')}` : null,
    flight?.arrival?.delay != null && flight.arrival.delay > 0
      ? `Retard arrivée estimé API: ${flight.arrival.delay} min`
      : null,
    metarRes.items?.length ? `METAR: ${summarizeMetar(metarRes.items).map((x) => x.id).join(', ')}` : null,
    reportUrl ? `Rapport: ${reportUrl}` : null,
  ].filter(Boolean);

  return {
    ref,
    capturedAt: new Date().toISOString(),
    vol,
    dateYmd,
    depart: dep,
    arrivee: arr,
    flight,
    metar: summarizeMetar(metarRes.items || []),
    taf: summarizeTaf(tafRes.items || []),
    links: { report: reportUrl, fr24, flightstats },
    sources,
    errors,
    summaryText: summaryLines.join(' | ').slice(0, 900),
  };
}

function buildProofHtml(report) {
  const esc = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const f = report.flight;
  const delay = f?.arrival?.delay;
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Preuves ${esc(report.ref)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;line-height:1.45}
h1{font-size:1.25rem}pre{background:#f4f4f5;padding:.75rem;overflow:auto;font-size:.8rem;border-radius:6px}
.meta{color:#555;font-size:.9rem}a{color:#0b57d0}</style></head><body>
<h1>Preuves dossier ${esc(report.ref)}</h1>
<p class="meta">Capturé ${esc(report.capturedAt)} — sources: ${esc((report.sources || []).join(', ') || '—')}</p>
<p><strong>Vol</strong> ${esc(report.vol || '—')} · <strong>Date</strong> ${esc(report.dateYmd)} · <strong>Route</strong> ${esc(report.depart)}→${esc(report.arrivee)}</p>
${f ? `<p><strong>API vol</strong> ${esc(f.airline)} · statut ${esc(f.status)} · retard arrivée ${delay != null ? delay + ' min' : '—'}</p>` : ''}
<h2>METAR</h2>
${(report.metar || []).map((m) => `<pre>${esc(m.id)} ${esc(m.obs)}\n${esc(m.raw)}</pre>`).join('') || '<p>—</p>'}
<h2>TAF</h2>
${(report.taf || []).map((t) => `<pre>${esc(t.id)}\n${esc(t.raw)}</pre>`).join('') || '<p>—</p>'}
<h2>Liens</h2>
<ul>
${report.links?.report ? `<li><a href="${esc(report.links.report)}">Ce rapport (URL signée)</a></li>` : ''}
${report.links?.fr24 ? `<li><a href="${esc(report.links.fr24)}">FlightRadar24</a></li>` : ''}
${report.links?.flightstats ? `<li><a href="${esc(report.links.flightstats)}">FlightStats (${esc(report.depart)})</a></li>` : ''}
</ul>
${report.errors?.length ? `<h2>Avertissements</h2><pre>${esc(JSON.stringify(report.errors, null, 2))}</pre>` : ''}
<p class="meta">Robin des Airs — preuve contextuelle CE 261. METAR/TAF : aviationweather.gov (NOAA).</p>
</body></html>`;
}

function connectBlobs(event) {
  if (!netlifyBlobsModule) return null;
  const blobs = netlifyBlobsModule;
  if (blobs.connectLambda && event) blobs.connectLambda(event);
  return blobs.getStore(STORE_NAME);
}

async function persistProofReport(event, ref, report) {
  const store = connectBlobs(event);
  if (!store || !ref) return false;
  const safeRef = String(ref).replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${PROOFS_PREFIX}${safeRef}`;
  await store.setJSON(`${key}/report.json`, report);
  await store.set(`${key}/report.html`, buildProofHtml(report), {
    metadata: { contentType: 'text/html; charset=utf-8' },
  });
  return true;
}

async function loadProofReport(event, ref) {
  const store = connectBlobs(event);
  if (!store || !ref) return null;
  const safeRef = String(ref).replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${PROOFS_PREFIX}${safeRef}/report.json`;
  try {
    return await store.get(key, { type: 'json' });
  } catch {
    return null;
  }
}

async function syncProofsToAirtable(cfg, recordId, report, prevRemarques) {
  if (!cfg || !recordId) return;
  const L = cfg.labels;
  const prev = String(prevRemarques || '').trim();
  const block = report.summaryText || '';
  let remarques = prev ? `${prev} | ${block}` : block;
  if (remarques.length > 900) remarques = remarques.slice(-900);

  const patch = {};
  patch[L.remarques] = remarques;

  const colMetar = (process.env.AIRTABLE_COL_PREUVES_METAR || '').trim();
  if (colMetar && report.metar?.length) {
    patch[colMetar] = report.metar.map((m) => m.raw).join('\n---\n').slice(0, 9000);
  }

  const colLien = (process.env.AIRTABLE_COL_LIEN_PREUVES || '').trim();
  if (colLien && report.links?.report) {
    patch[colLien] = report.links.report;
  }

  const colVol = (process.env.AIRTABLE_COL_PREUVES_VOL || '').trim();
  if (colVol && report.flight) {
    const f = report.flight;
    patch[colVol] = [
      `${report.vol} ${report.dateYmd}`,
      `${f.departure?.iataCode}→${f.arrival?.iataCode}`,
      f.arrival?.delay ? `retard ${f.arrival.delay} min` : '',
      f.status || '',
    ]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 9000);
  }

  await airtablePatch(cfg, recordId, patch);
}

async function notifyPlaywrightWebhook(payload) {
  const url = (process.env.PROOFS_PLAYWRIGHT_WEBHOOK_URL || '').trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        script: 'npm run proofs:capture',
        callback: `${SITE_URL.replace(/\/$/, '')}/api/collect-proofs`,
      }),
    });
  } catch (e) {
    console.warn('proofs: playwright webhook', e.message);
  }
}

/**
 * Pipeline complet : collecte → blob → Airtable (+ webhook Make optionnel).
 */
async function runProofsPipeline(event, cfg, input) {
  const ref = (input.ref || '').trim();
  const recordId = (input.recordId || '').trim();
  if (!ref) throw new Error('ref manquante');

  const report = await collectProofReport(input);
  await persistProofReport(event, ref, report);
  if (cfg && recordId) {
    await syncProofsToAirtable(cfg, recordId, report, input.remarques);
  }

  const iata = report.depart || extractIata(input.depart);
  if (report.vol && iata) {
    notifyPlaywrightWebhook({
      ref,
      recordId,
      vol: report.vol,
      iata,
      date: report.dateYmd,
    }).catch(() => {});
  }

  return report;
}

function scheduleProofsAfterDossier(event, cfg, created, body) {
  const waitMs = Math.min(
    15000,
    Math.max(0, parseInt(process.env.PROOFS_COLLECT_WAIT_MS || '6000', 10) || 6000)
  );
  const job = runProofsPipeline(event, cfg, {
    ref: created.ref,
    recordId: created.recordId,
    vol: body.vol,
    date: body.date,
    depart: body.depart,
    arrivee: body.arrivee,
  }).catch((e) => console.warn('proofs pipeline:', e.message));

  if (waitMs <= 0) return job;
  return Promise.race([job, new Promise((r) => setTimeout(r, waitMs))]);
}

function verifyProofsRequest(body, headers) {
  const expected = proofsSecret();
  if (!expected) return { ok: false, error: 'PROOFS_COLLECT_SECRET non configuré' };
  const fromBody = body && body.secret;
  const fromHeader =
    headers['x-proofs-secret'] || headers['X-Proofs-Secret'] || headers['x-airtable-secret'];
  if (fromBody === expected || fromHeader === expected) return { ok: true };
  return { ok: false, error: 'Secret invalide' };
}

module.exports = {
  STORE_NAME,
  collectProofReport,
  runProofsPipeline,
  scheduleProofsAfterDossier,
  persistProofReport,
  loadProofReport,
  proofReportToken,
  proofReportUrl,
  verifyProofsRequest,
  buildProofHtml,
};

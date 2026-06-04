/**
 * Enquêteur retard — assemble pour un vol retardé/annulé :
 *   1. Faits vol (AeroDataBox brut : ICAO départ/arrivée, immat, statut, retard, horaires)
 *   2. Météo officielle METAR + TAF (NOAA aviationweather.gov, par code ICAO — gratuit)
 *   3. Rotation précédente de l'appareil (l'avion est-il arrivé en retard ? → retard en cascade)
 *   4. Cause probable + qualification « circonstance extraordinaire » via Claude (web_search)
 * Résultat mis en cache (Netlify Blobs) par VOL_DATE — une enquête coûte 1 appel IA, on ne la rejoue pas.
 *
 * Variables Netlify : ANTHROPIC_API_KEY (cause IA), RAPIDAPI_KEY (vol + rotation).
 *   RADAR_ENQUETE_MODEL — modèle Claude (défaut claude-opus-4-8, raisonnement juridique max).
 *                         Mettre claude-haiku-4-5 pour réduire fortement le coût/token.
 */

const { ADB_HOST, rapidApiKey, parisYmd } = require('./aerodatabox-flight');

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}

const STORE = 'robin-radar-enquetes';
const FRESH_MS = 12 * 3600 * 1000; // une enquête reste valable 12 h
const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-opus-4-8';

function enqueteModel() {
  return (process.env.RADAR_ENQUETE_MODEL || DEFAULT_MODEL).trim();
}

function blobStore(event) {
  if (!blobs) return null;
  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    return blobs.getStore(STORE);
  } catch (_) { return null; }
}

function cacheKey(vol, date) {
  return `${String(vol || '').toUpperCase()}_${date}`.replace(/[^A-Z0-9_-]/gi, '_');
}

async function loadCache(event, vol, date) {
  const store = blobStore(event);
  if (!store) return null;
  try { return await store.get(cacheKey(vol, date), { type: 'json' }); }
  catch (_) { return null; }
}

async function saveCache(event, vol, date, data) {
  const store = blobStore(event);
  if (!store) return;
  try { await store.setJSON(cacheKey(vol, date), data); } catch (_) {}
}

// ─── AeroDataBox brut ────────────────────────────────────────────────────────
async function adbFetch(path, key) {
  const url = `https://${ADB_HOST}${path}`;
  try {
    const r = await fetch(url, {
      headers: { 'x-rapidapi-host': ADB_HOST, 'x-rapidapi-key': key, Accept: 'application/json' },
    });
    if (!r.ok) return [];
    const j = await r.json().catch(() => null);
    if (Array.isArray(j)) return j;
    for (const k of ['flights', 'data', 'results', 'items']) if (Array.isArray(j && j[k])) return j[k];
    return [];
  } catch (_) { return []; }
}

function tms(timeObj) {
  if (!timeObj) return null;
  const s = timeObj.utc || timeObj.local;
  if (!s) return null;
  const v = Date.parse(String(s).replace(' ', 'T'));
  return Number.isNaN(v) ? null : v;
}

// Retard d'un segment (départ ou arrivée) en minutes, à partir des horaires.
function segDelay(seg) {
  if (!seg) return null;
  if (typeof seg.delay === 'number') return Math.round(seg.delay);
  const sch = tms(seg.scheduledTime);
  const act = tms(seg.actualTime) || tms(seg.revisedTime) || tms(seg.estimatedTime);
  if (sch != null && act != null) return Math.round((act - sch) / 60000);
  return null;
}

function hhmm(timeObj) {
  const ms = tms(timeObj);
  if (ms == null) return null;
  return new Date(ms).toISOString().slice(11, 16) + 'Z';
}

function pickRow(rows, dep, arr) {
  if (!rows.length) return null;
  if (dep || arr) {
    const m = rows.find((r) => {
      const d = (r.departure?.airport?.iata || '').toUpperCase();
      const a = (r.arrival?.airport?.iata || '').toUpperCase();
      return (!dep || d === dep.toUpperCase()) && (!arr || a === arr.toUpperCase());
    });
    if (m) return m;
  }
  return rows[0];
}

// ─── Rotation précédente (par immatriculation) ──────────────────────────────
async function previousRotation(reg, date, depIata, schedDepMs, key) {
  if (!reg || !key) return null;
  const rows = await adbFetch(`/flights/reg/${encodeURIComponent(reg)}/${date}/${date}`, key);
  if (!rows.length) return null;
  // legs arrivant à notre aéroport de départ, avant notre départ programmé
  let best = null;
  for (const r of rows) {
    const arrIata = (r.arrival?.airport?.iata || '').toUpperCase();
    const arrMs = tms(r.arrival?.scheduledTime);
    if (depIata && arrIata !== depIata.toUpperCase()) continue;
    if (schedDepMs && arrMs && arrMs > schedDepMs) continue;
    if (!best || (arrMs && tms(best.arrival?.scheduledTime) && arrMs > tms(best.arrival?.scheduledTime))) best = r;
  }
  if (!best) return null;
  return {
    flight: best.number || best.callSign || '',
    from: best.departure?.airport?.iata || '',
    to: best.arrival?.airport?.iata || '',
    arrivalDelayMin: segDelay(best.arrival),
    scheduledArrival: hhmm(best.arrival?.scheduledTime),
    actualArrival: hhmm(best.arrival?.actualTime) || hhmm(best.arrival?.revisedTime),
    status: best.status || '',
  };
}

// ─── Météo METAR (par ICAO, NOAA) ────────────────────────────────────────────
async function fetchMetar(icaos) {
  const ids = [...new Set((icaos || []).filter((x) => /^[A-Z]{4}$/.test(x)))];
  if (!ids.length) return [];
  try {
    const r = await fetch(`https://aviationweather.gov/api/data/metar?ids=${ids.join(',')}&format=json`, {
      headers: { Accept: 'application/json', 'User-Agent': 'RobinDesAirs-Enquete/1.0' },
    });
    if (!r.ok) return [];
    const j = await r.json().catch(() => []);
    return (Array.isArray(j) ? j : []).map((m) => ({
      id: m.icaoId || m.stationId || '?',
      raw: String(m.rawOb || m.rawText || '').slice(0, 300),
      obs: m.obsTime || m.reportTime || '',
    }));
  } catch (_) { return []; }
}

// ─── Cause probable via Claude (web_search) ──────────────────────────────────
const SYSTEM = `Tu es l'Enquêteur retard de Robin des Airs (indemnisation CE 261/2004). À partir des FAITS d'un vol retardé ou annulé, tu détermines la CAUSE PROBABLE et si elle constitue une « circonstance extraordinaire » exonérant la compagnie.

QUALIFICATION (décisif pour l'indemnisation) :
- NON extraordinaire (compagnie REDEVABLE — bon pour le passager) : problème technique courant de l'appareil, retard en cascade (avion arrivé en retard de sa rotation précédente), surbooking, manque/retard d'équipage, problème d'organisation interne.
- Extraordinaire (compagnie EXONÉRÉE) : météo dangereuse avérée, grève EXTERNE (contrôleurs aériens, aéroport), décision/restriction ATC, sûreté/sécurité, instabilité politique, catastrophe.
- LA ROTATION PRÉCÉDENTE EST DÉCISIVE : si l'avion est arrivé en retard de son vol précédent, le retard est très probablement EN CASCADE → NON extraordinaire, SAUF si la cause amont était elle-même extraordinaire (à vérifier).

MÉTHODE : utilise web_search pour vérifier l'actualité du jour (grève contrôleurs/compagnie/aéroport, météo, restriction d'espace aérien) sur la date et les aéroports concernés. Croise avec le METAR fourni. Cite tes sources (URL).

RÉPONDS EN FRANÇAIS, BREF, EXACTEMENT dans ce format (une ligne par champ) :
CAUSE: <1-2 phrases>
EXTRAORDINAIRE: OUI | NON | INCERTAIN — <raison en 1 phrase>
ROTATION: <ce que montre la rotation précédente de l'appareil pour ce retard>
AUTRES: <autres vols perturbés au même aéroport ce jour-là, sinon ->
SOURCES: <url1 ; url2>`;

async function callClaude(apiKey, model, userText) {
  const body = {
    model,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: 'user', content: userText }],
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
  };
  if (!/haiku/i.test(model)) body.output_config = { effort: 'low' };

  let res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = await res.json();
  if (!res.ok) throw new Error((json && json.error && json.error.message) || `HTTP ${res.status}`);

  // Boucle outil serveur (web_search) : pause_turn → relancer avec l'historique.
  let guard = 0;
  const convo = [{ role: 'user', content: userText }];
  while (json.stop_reason === 'pause_turn' && guard < 4) {
    convo.push({ role: 'assistant', content: json.content });
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, messages: convo }),
    });
    json = await res.json();
    if (!res.ok) throw new Error((json && json.error && json.error.message) || `HTTP ${res.status}`);
    guard += 1;
  }
  return (Array.isArray(json.content) ? json.content : [])
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim();
}

function field(text, label) {
  const m = new RegExp(`^${label}:\\s*(.+)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

function parseReply(text) {
  const extraLine = field(text, 'EXTRAORDINAIRE');
  let extra = 'INCERTAIN';
  if (/^\s*non/i.test(extraLine)) extra = 'NON';
  else if (/^\s*oui/i.test(extraLine)) extra = 'OUI';
  const sources = (field(text, 'SOURCES') || '')
    .split(/[;\n]/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s)).slice(0, 5);
  return {
    cause: field(text, 'CAUSE') || (text || '').slice(0, 300),
    extraordinaire: extra,
    extraordinaireRaison: extraLine.replace(/^(oui|non|incertain)\s*[—-]?\s*/i, '').trim(),
    rotationAnalyse: field(text, 'ROTATION'),
    autres: field(text, 'AUTRES'),
    sources,
    rawText: text || '',
  };
}

/**
 * Lance (ou retourne en cache) l'enquête d'un vol.
 * @returns enquête { vol, date, route, statut, retardMin, meteo[], rotation, cause, extraordinaire, ... }
 */
async function runEnquete(event, input, opts = {}) {
  const vol = String(input.vol || '').toUpperCase().replace(/\s/g, '');
  const date = /^\d{4}-\d{2}-\d{2}/.test(String(input.date)) ? String(input.date).slice(0, 10) : parisYmd();
  if (!vol) return { ok: false, error: 'vol requis' };

  if (!opts.force) {
    const cached = await loadCache(event, vol, date);
    if (cached && cached.analyzedAt && Date.now() - Date.parse(cached.analyzedAt) < FRESH_MS) {
      return { ...cached, cached: true };
    }
  }

  const key = rapidApiKey();
  const sources = [];
  const errors = [];

  // 1) Faits vol (ICAO, immat, retard, horaires)
  let dep = (input.dep || '').toUpperCase();
  let arr = (input.arr || '').toUpperCase();
  let depIcao = '', arrIcao = '', reg = '', statut = input.cancelled ? 'Annulé' : '';
  let retardMin = input.delayMin != null ? input.delayMin : null;
  let schedDepMs = null, aircraftModel = '';
  if (key) {
    const rows = await adbFetch(`/flights/number/${encodeURIComponent(vol)}/${date}/${date}`, key);
    const row = pickRow(rows, dep, arr);
    if (row) {
      sources.push('aerodatabox');
      dep = dep || (row.departure?.airport?.iata || '').toUpperCase();
      arr = arr || (row.arrival?.airport?.iata || '').toUpperCase();
      depIcao = (row.departure?.airport?.icao || '').toUpperCase();
      arrIcao = (row.arrival?.airport?.icao || '').toUpperCase();
      reg = row.aircraft?.reg || row.aircraft?.registration || '';
      aircraftModel = row.aircraft?.model || '';
      statut = row.status || statut;
      schedDepMs = tms(row.departure?.scheduledTime);
      const d = segDelay(row.arrival);
      if (d != null) retardMin = d;
    } else {
      errors.push('vol introuvable AeroDataBox');
    }
  } else {
    errors.push('RAPIDAPI_KEY absent — vol/rotation/ICAO indisponibles');
  }

  // 2) Météo METAR (ICAO)
  const meteo = await fetchMetar([depIcao, arrIcao]);
  if (meteo.length) sources.push('aviationweather-metar');

  // 3) Rotation précédente de l'appareil
  let rotation = null;
  if (reg) {
    rotation = await previousRotation(reg, date, dep, schedDepMs, key);
    if (rotation) sources.push('aerodatabox-rotation');
  }

  // 4) Cause via Claude (web_search)
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  let analysis = null;
  if (apiKey) {
    const facts = [
      `Vol ${vol} du ${date}`,
      dep && arr ? `Route ${dep} → ${arr}` : null,
      input.cancelled ? 'Statut : ANNULÉ' : (retardMin != null ? `Retard à l'arrivée : ${retardMin} min` : 'Retard détecté'),
      statut ? `Statut API : ${statut}` : null,
      reg ? `Appareil : ${reg}${aircraftModel ? ' (' + aircraftModel + ')' : ''}` : null,
      rotation
        ? `Rotation précédente : ${rotation.flight || 'vol amont'} ${rotation.from}→${rotation.to}, retard arrivée ${rotation.arrivalDelayMin != null ? rotation.arrivalDelayMin + ' min' : 'inconnu'} (l'appareil ${rotation.arrivalDelayMin > 30 ? 'EST arrivé en retard' : 'est arrivé à l\'heure'} avant ce vol)`
        : "Rotation précédente : non disponible",
      meteo.length
        ? `METAR : ${meteo.map((m) => `${m.id} ${m.raw}`).join(' || ')}`
        : 'METAR : non disponible',
    ].filter(Boolean).join('\n');

    try {
      const reply = await callClaude(apiKey, enqueteModel(), facts);
      analysis = parseReply(reply);
      sources.push('claude-web_search');
    } catch (e) {
      errors.push('cause IA : ' + e.message);
    }
  } else {
    errors.push('ANTHROPIC_API_KEY absent — cause non recherchée');
  }

  const result = {
    ok: true,
    vol,
    date,
    route: dep && arr ? `${dep} → ${arr}` : (input.route || ''),
    dep, arr,
    statut,
    retardMin,
    cancelled: !!input.cancelled,
    reg,
    aircraftModel,
    meteo,
    rotation,
    cause: analysis ? analysis.cause : '',
    extraordinaire: analysis ? analysis.extraordinaire : null,
    extraordinaireRaison: analysis ? analysis.extraordinaireRaison : '',
    rotationAnalyse: analysis ? analysis.rotationAnalyse : '',
    autres: analysis ? analysis.autres : '',
    sources: analysis ? analysis.sources : [],
    apiSources: [...new Set(sources)],
    errors,
    analyzedAt: new Date().toISOString(),
    model: apiKey ? enqueteModel() : null,
  };

  await saveCache(event, vol, date, result);
  return result;
}

module.exports = { runEnquete, loadCache };

/**
 * submit-mandat — Robin des Airs
 * Signature mandat.html → Blobs + Airtable + webhook bot Wati (POST /mandat_signed).
 *
 * POST /api/submit-mandat
 */

let netlifyBlobsModule = null;
try { netlifyBlobsModule = require('@netlify/blobs'); } catch (e) {}

const STORE_NAME = 'robin-signatures';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://robindesairs.eu',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

const INCIDENT_AT = {
  delay: 'Retard +3h',
  cancel: 'Annulation',
  denied: 'Surbooking',
};

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').toUpperCase();
}

function generateCertId(phone, ref, ts) {
  const date = (ts || new Date().toISOString()).substring(0, 10).replace(/-/g, '');
  const shortPhone = (phone || '').replace(/\D/g, '').slice(-4) || 'XXXX';
  const shortRef = (ref || '').replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() || 'AAAAAA';
  return `RDA-${date}-${shortPhone}-${shortRef}`;
}

function airtableCfg() {
  const key = (process.env.AIRTABLE_API_KEY || '').trim();
  const base = (process.env.AIRTABLE_BASE_ID || 'appv72lKbQtjt7EIP').trim();
  const table = (process.env.AIRTABLE_TABLE_ID || 'tblfg688AGxaywi7O').trim();
  if (!key || !base || !table) return null;
  return {
    key,
    base,
    table,
    fRef: (process.env.AIRTABLE_F_REF_DOSSIER || 'flduSWqrqxeNoQkKW').trim(),
    fWa: (process.env.AIRTABLE_F_WHATSAPP || 'fldsFH0PoWe3AV0sI').trim(),
    fRemarques: (process.env.AIRTABLE_F_REMARQUES || 'fldqks5asIPXar8BD').trim(),
    fStatutSuivi: (process.env.AIRTABLE_F_STATUT_SUIVI || 'fldUnBUQFKeoKf8LL').trim(),
    fCompagnie: (process.env.AIRTABLE_F_COMPAGNIE || 'fld8Ku1jGMOPWnrQc').trim(),
    fVol: (process.env.AIRTABLE_F_NUMERO_VOL || 'fldcVnS4B86eZntjr').trim(),
    fDateVol: (process.env.AIRTABLE_F_DATE_VOL || 'flduDNEC3osPnTMAv').trim(),
    fPnr: (process.env.AIRTABLE_F_PNR || 'fld7scWE20q3DRPUa').trim(),
    fIncident: (process.env.AIRTABLE_F_TYPE_INCIDENT || 'fldci5VnHb0HpOoKL').trim(),
    fItineraire: (process.env.AIRTABLE_F_ITINERAIRE || 'fldtCISegQZ58Yvrl').trim(),
    statutSuiviSigne: (process.env.AIRTABLE_STATUT_SUIVI_MANDAT_SIGNE || 'Mandat signé').trim(),
  };
}

function atHeaders(key) {
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function escapeFormulaValue(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function airtableFindByRef(cfg, ref) {
  const formula = `{${cfg.fRef}}='${escapeFormulaValue(ref)}'`;
  const url = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=20`;
  const r = await fetch(url, { headers: atHeaders(cfg.key) });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Airtable find ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  return data.records || [];
}

function flightDateForAirtable(isoOrDash) {
  const s = (isoOrDash || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

async function patchAirtableSigned(record) {
  const cfg = airtableCfg();
  if (!cfg) {
    console.warn('submit-mandat: Airtable non configuré (AIRTABLE_API_KEY)');
    return { skipped: true };
  }
  const ref = (record.ref || '').trim();
  if (!ref) return { skipped: true, reason: 'no ref' };

  let recs = await airtableFindByRef(cfg, ref);
  const phone = (record.whatsapp || '').trim();
  if (!recs.length && phone && cfg.fWa) {
    const formula = `{${cfg.fWa}}='${escapeFormulaValue(phone)}'`;
    const url = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=5`;
    const r = await fetch(url, { headers: atHeaders(cfg.key) });
    if (r.ok) {
      const data = await r.json();
      recs = data.records || [];
    }
  }
  if (!recs.length) {
    console.warn(`submit-mandat: aucune ligne Airtable pour ref=${ref}`);
    return { updated: 0, created: false };
  }

  const signedNote = `Mandat signé le ${record.signed_at || new Date().toISOString()} (cert ${record.cert_id || '—'})`;
  const addr = (record.address || '').trim();
  const itin = [record.depAirport, record.arrAirport].filter(Boolean).join(' → ');
  const incidentLabel = INCIDENT_AT[record.incident] || record.incident || '';

  const common = {};
  if (cfg.fStatutSuivi && cfg.statutSuiviSigne) common[cfg.fStatutSuivi] = cfg.statutSuiviSigne;
  if (cfg.fCompagnie && record.airline) common[cfg.fCompagnie] = record.airline;
  if (cfg.fVol && record.flightNum) common[cfg.fVol] = record.flightNum;
  const fd = flightDateForAirtable(record.flightDate);
  if (cfg.fDateVol && fd) common[cfg.fDateVol] = fd;
  if (cfg.fPnr && record.pnr) common[cfg.fPnr] = String(record.pnr).trim().toUpperCase();
  if (cfg.fIncident && incidentLabel) common[cfg.fIncident] = incidentLabel;
  if (cfg.fItineraire && itin) common[cfg.fItineraire] = itin;
  if (cfg.fWa && phone) common[cfg.fWa] = phone;

  const updates = recs.map((rec, i) => {
    const f = { ...common };
    if (cfg.fRemarques) {
      const prev = (rec.fields && rec.fields[cfg.fRemarques]) || '';
      const extra = [signedNote, addr ? `Adresse: ${addr}` : '', record.email ? `Email: ${record.email}` : '']
        .filter(Boolean)
        .join(' | ');
      f[cfg.fRemarques] = prev ? `${prev} | ${extra}` : extra;
    }
    if (i === 0 && record.passengerNames && record.passengerNames.length) {
      f._note_pax = record.passengerNames.join(', ');
    }
    return { id: rec.id, fields: f };
  });

  const patchUrl = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}`;
  const pr = await fetch(patchUrl, {
    method: 'PATCH',
    headers: atHeaders(cfg.key),
    body: JSON.stringify({ records: updates }),
  });
  if (!pr.ok) {
    const t = await pr.text();
    throw new Error(`Airtable patch ${pr.status}: ${t.slice(0, 300)}`);
  }
  console.log(`submit-mandat: Airtable PATCH ${updates.length} ligne(s) ref=${ref}`);
  return { updated: updates.length };
}

async function forwardBotWebhook(record) {
  const url = (process.env.MANDAT_SIGNED_WEBHOOK_URL || '').trim();
  if (!url) return;
  const secret = (process.env.MANDAT_SIGNED_WEBHOOK_SECRET || '').trim();
  const body = {
    ref: record.ref,
    secret,
    phone: record.whatsapp,
    waId: record.whatsapp,
    cert_id: record.cert_id,
    signed_at: record.signed_at,
    source: record.source || 'mandat.html',
  };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-Mandat-Secret': secret } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error('submit-mandat: bot webhook', r.status, await r.text().then((t) => t.slice(0, 200)));
  } catch (e) {
    console.error('submit-mandat: bot webhook error:', e.message);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Corps JSON invalide' }) };
  }

  const phone = (body.whatsapp || body.phone || '').trim();
  const ref = (body.ref || '').trim();
  if (!phone || !ref) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'ref et whatsapp obligatoires' }),
    };
  }

  const ts = body.signedAt || new Date().toISOString();
  const certId = generateCertId(phone, ref, ts);

  const rawIp = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || event.headers?.['client-ip']
    || 'unknown';
  const ipHash = hashString(rawIp + ts.substring(0, 10));

  const record = {
    cert_id: certId,
    ref,
    signed_at: ts,
    ip_hash: ipHash,
    user_agent: (event.headers?.['user-agent'] || '').substring(0, 150),
    firstName: body.firstName || '',
    lastName: body.lastName || '',
    whatsapp: phone,
    email: body.email || '',
    address: body.address || '',
    startNow: !!body.startNow,
    coPassAgreement: !!body.coPassAgreement,
    airline: body.airline || '',
    flightNum: body.flightNum || '',
    flightDate: body.flightDate || '',
    pnr: body.pnr || '',
    incident: body.incident || '',
    pax: body.pax || 1,
    passengerNames: body.passengerNames || [],
    passengersData: body.passengersData || [],
    depAirport: body.depAirport || '',
    arrAirport: body.arrAirport || '',
    signCity: body.signCity || '',
    signDate: body.signDate || '',
    signatureImg: body.signatureImg || '',
    source: body.source || 'web',
  };

  if (netlifyBlobsModule) {
    try {
      const blobs = netlifyBlobsModule;
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE_NAME);
      const phoneKey = phone.replace(/\D/g, '');
      await store.setJSON(`sig/${phoneKey}/${ref}`, record);

      let index = [];
      try { index = await store.getJSON('__index') || []; } catch { index = []; }
      index.unshift({
        cert_id: certId,
        ref,
        phone_hash: hashString(phone),
        flightNum: record.flightNum,
        signed_at: ts,
      });
      if (index.length > 500) index = index.slice(0, 500);
      await store.setJSON('__index', index);
    } catch (e) {
      console.error('submit-mandat: Blobs error:', e.message);
    }
  }

  let airtableResult = { skipped: true };
  try {
    airtableResult = await patchAirtableSigned(record);
  } catch (e) {
    console.error('submit-mandat: Airtable error:', e.message);
    airtableResult = { error: e.message };
  }

  await forwardBotWebhook(record);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      cert_id: certId,
      ref,
      airtable: airtableResult,
    }),
  };
};

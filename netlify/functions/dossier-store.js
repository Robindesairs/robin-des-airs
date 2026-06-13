/**
 * Stockage durable d'un dossier de mandat (Netlify Blobs).
 * Appelé par le bot WhatsApp (Railway) à la fin de l'entonnoir.
 * → Permet un lien court : robindesairs.eu/mandat.html?r=REF
 *
 * POST { ref, dossier, secret }
 *   secret = WATI_WEBHOOK_SECRET (le bot le connaît déjà)
 *   dossier = objet { ref, name, dob, address, phone, vol, compagnie, pnr, date,
 *                     indemnite, pax, passengers:[{name,dob}], ... }
 *
 * Stocke sous la clé m/<ref> dans le store 'mandats' (persistant).
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { safeEqualString } = require('./lib/safe-compare');
const { syncNewDossierToAirtable } = require('./lib/dossier-airtable-sync');

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://robindesairs.eu', 'Access-Control-Allow-Headers': 'Content-Type' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }

  const secret = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (secret && !safeEqualString(String(b.secret || '').trim(), secret)) return { statusCode: 401, headers: H, body: JSON.stringify({ error: 'unauthorized' }) };

  const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (!ref || !b.dossier || typeof b.dossier !== 'object') return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'ref + dossier requis' }) };

  try {
    const st = getBlobStore(event, 'mandats');
    if (!st) return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'store indisponible' }) };
    await st.setJSON('m/' + ref, { ...b.dossier, _ts: new Date().toISOString() });

    // Best-effort : créer le dossier dans Airtable s'il manque (non-signé compris), sans
    // jamais toucher un dossier déjà présent. Un échec Airtable ne casse pas le dépôt Blobs.
    let airtable = null;
    try { airtable = await syncNewDossierToAirtable({ ...b.dossier, ref }); }
    catch (e) { airtable = { ok: false, error: e.message }; }

    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, ref, airtable }) };
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};

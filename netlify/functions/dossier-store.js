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

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }

  const secret = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (secret && b.secret !== secret) return { statusCode: 401, headers: H, body: JSON.stringify({ error: 'unauthorized' }) };

  const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (!ref || !b.dossier || typeof b.dossier !== 'object') return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'ref + dossier requis' }) };

  try {
    const st = getBlobStore(event, 'mandats');
    if (!st) return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'store indisponible' }) };
    await st.setJSON('m/' + ref, { ...b.dossier, _ts: new Date().toISOString() });
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, ref }) };
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};

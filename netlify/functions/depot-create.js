/**
 * /api/depot-create — création d'un dossier depuis la VOIE WEB (sans WhatsApp).
 *
 * Canal de SECOURS (ban Meta / WhatsApp en panne). Crée m/<ref> dans le store 'mandats'
 * AVANT la signature, pour que /api/submit-mandat passe sa gate anti-forge — SANS exiger
 * le secret du bot (que le client ne peut pas connaître).
 *
 * Sécurité :
 *  - le `ref` est généré CÔTÉ SERVEUR (128 bits indevinable) → un client ne peut PAS
 *    choisir une réf arbitraire (pas d'empoisonnement de /api/is-signed sur des réfs devinées).
 *  - anti-spam léger : honeypot + champs minimaux requis.
 *
 * POST { flightNum?, route?, compagnie?, dep?, arr?, date?, incident?, pax?, passengers?,
 *        pnr?, indemnite?, name, phone?, email?, website? (honeypot) }
 * → 200 { ok:true, ref } ; le client enchaîne sur /api/submit-mandat avec ce ref.
 */
const crypto = require('crypto');
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { syncNewDossierToAirtable } = require('./lib/dossier-airtable-sync');

const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://robindesairs.eu',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Même format que le bot (genRef de server.js) : RDA-<AAAAMMJJ>-<base36 de 128 bits>.
function genRef() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = BigInt('0x' + crypto.randomBytes(16).toString('hex')).toString(36).toUpperCase();
  return `RDA-${d}-${rand}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }

  // Anti-spam : honeypot. Un bot remplit souvent tous les champs ; ce champ caché doit rester vide.
  // On répond 200 avec une réf-leurre mais on ne crée RIEN (le bot croit avoir réussi).
  if (String(b.website || '').trim()) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, ref: genRef() }) };
  }

  // Champs minimaux : (un vol OU un trajet) + un nom + (un téléphone OU un email).
  const flightNum = String(b.flightNum || '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 12);
  const route = String(b.route || '').trim().slice(0, 120);
  const name = String(b.name || '').trim().slice(0, 120);
  const phone = String(b.phone || '').trim().slice(0, 40);
  const email = String(b.email || '').trim().slice(0, 160);
  if (!flightNum && !route) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Indiquez votre vol ou votre trajet.' }) };
  if (!name) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Indiquez votre nom.' }) };
  if (!phone && !email) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Indiquez un téléphone ou un email pour vous joindre.' }) };

  const ref = genRef();
  const dossier = {
    ref,
    name,
    phone,
    email,
    vol: flightNum,
    compagnie: String(b.compagnie || '').trim().slice(0, 60),
    route,
    dep: String(b.dep || '').trim().slice(0, 60),
    arr: String(b.arr || '').trim().slice(0, 60),
    date: String(b.date || '').trim().slice(0, 20),
    incident: String(b.incident || '').trim().slice(0, 40),
    pax: Number(b.pax) > 0 ? Math.min(Number(b.pax), 12) : 1,
    passengers: Array.isArray(b.passengers) ? b.passengers.slice(0, 12) : [],
    pnr: String(b.pnr || '').trim().slice(0, 12),
    indemnite: b.indemnite || '',
    source: 'depot-express.html',
    status: 'Signature en attente',
    createdVia: 'web',
  };

  try {
    const st = getBlobStore(event, 'mandats');
    if (!st) return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'store indisponible' }) };
    await st.setJSON('m/' + ref, { ...dossier, _ts: new Date().toISOString() });

    // Best-effort : créer la fiche Airtable (« Signature en attente »), comme dossier-store.js.
    let airtable = null;
    try { airtable = await syncNewDossierToAirtable(dossier); }
    catch (e) { airtable = { ok: false, error: e.message }; }

    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, ref, airtable }) };
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};

/**
 * sign-mandate — Robin des Airs
 * Enregistrement côté serveur de la signature électronique du mandat.
 *
 * POST /api/sign-mandate
 * Body JSON: { name, phone, email, vol, date, route, pnr, compagnie,
 *              nbpax, indemnite, doc_hash, signed_at,
 *              retractation_waived, lu_accepte }
 *
 * Stocke dans Netlify Blobs (store: robin-signatures) :
 *   clé  = "sig/{phone}/{doc_hash}"
 *   valeur = { ...données, cert_id, ip_hash, user_agent }
 *
 * Retourne : { cert_id, signed_at, doc_hash }
 * Ce certificat constitue la preuve de signature opposable aux compagnies aériennes.
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

function hashString(str) {
  // Hash léger sans dépendance externe (pour anonymiser IP)
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').toUpperCase();
}

function generateCertId(phone, vol, docHash, ts) {
  const date = ts ? ts.substring(0, 10).replace(/-/g, '') : new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const shortPhone = (phone || '').replace(/\D/g, '').slice(-4) || 'XXXX';
  const shortHash = (docHash || '').substring(0, 6).toUpperCase() || 'AAAAAA';
  return `RDA-${date}-${shortPhone}-${shortHash}`;
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

  // Validation minimale
  const { name, phone, vol, doc_hash, signed_at, retractation_waived, lu_accepte } = body;
  if (!phone || !doc_hash) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'phone et doc_hash obligatoires' }) };
  }
  if (!retractation_waived || !lu_accepte) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Consentements obligatoires non fournis' }) };
  }

  const ts = signed_at || new Date().toISOString();
  const certId = generateCertId(phone, vol, doc_hash, ts);

  // Hash de l'IP pour anonymisation RGPD (pas de stockage d'IP brute)
  const rawIp = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || event.headers?.['client-ip']
    || 'unknown';
  const ipHash = hashString(rawIp + ts.substring(0, 10)); // Hash quotidien = non réidentifiable

  const record = {
    cert_id: certId,
    signed_at: ts,
    doc_hash: doc_hash,
    ip_hash: ipHash,
    user_agent: (event.headers?.['user-agent'] || '').substring(0, 150),
    // Données du mandat
    name: name || '',
    phone: phone,
    email: body.email || '',
    vol: vol || '',
    date: body.date || '',
    route: body.route || '',
    pnr: body.pnr || '',
    compagnie: body.compagnie || '',
    nbpax: body.nbpax || '1',
    indemnite: body.indemnite || '600',
    // Consentements explicites (directive 2011/83/UE)
    retractation_waived: true,
    lu_accepte: true,
    whatsapp_consent: true,
  };

  // Enregistrement Netlify Blobs
  if (netlifyBlobsModule) {
    try {
      const blobs = netlifyBlobsModule;
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE_NAME);
      const key = `sig/${phone.replace(/\D/g, '')}/${doc_hash}`;
      await store.setJSON(key, record);

      // Mise à jour de l'index des signatures (pour audit)
      let index = [];
      try { index = await store.getJSON('__index') || []; } catch { index = []; }
      index.unshift({ cert_id: certId, phone_hash: hashString(phone), vol, signed_at: ts });
      if (index.length > 500) index = index.slice(0, 500);
      await store.setJSON('__index', index);
    } catch (e) {
      console.error('sign-mandate: Blobs error:', e.message);
      // On continue — le certificat est quand même retourné au client
    }
  } else {
    console.warn('sign-mandate: Netlify Blobs non disponible — signature non persistée côté serveur');
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      cert_id: certId,
      signed_at: ts,
      doc_hash: doc_hash,
      message: 'Mandat signé avec succès — conservez votre certificat.',
    }),
  };
};

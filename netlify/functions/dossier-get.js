/**
 * Lecture d'un dossier de mandat (Netlify Blobs) pour le lien court.
 * Appelé par mandat.html : GET /api/dossier-get?r=REF
 * → renvoie le dossier pré-rempli (même origine que mandat.html = pas de CORS).
 *
 * La REF est la capacité d'accès (non listable, non devinable de masse).
 * Ne renvoie que des données déjà fournies par le client lui-même.
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://robindesairs.eu', 'Cache-Control': 'no-store' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  const q = event.queryStringParameters || {};
  const ref = String(q.r || q.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (!ref) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'r requis' }) };

  try {
    const st = getBlobStore(event, 'mandats');
    if (!st) return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'store indisponible' }) };
    const d = await st.get('m/' + ref, { type: 'json' });
    if (!d) return { statusCode: 404, headers: H, body: JSON.stringify({ error: 'dossier introuvable' }) };
    return { statusCode: 200, headers: H, body: JSON.stringify(d) };
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};

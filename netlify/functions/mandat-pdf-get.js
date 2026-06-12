/**
 * Récupère le PDF signé ARCHIVÉ d'un mandat (GET public, par RÉF).
 *   GET /api/mandat-pdf?r=REF  →  le PDF (application/pdf), byte-identique à la copie signée+envoyée.
 *
 * Source : store 'robin-signatures', clé pdf/<ref> (base64, écrit par submit-mandat à la signature).
 * La RÉF est la capacité d'accès (non listable, non devinable de masse) — même modèle que
 * /api/dossier-get. Ne renvoie que le document que le signataire a lui-même produit.
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');

const J = (code, obj) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://robindesairs.eu', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': 'https://robindesairs.eu' }, body: '' };
  const q = event.queryStringParameters || {};
  const ref = String(q.r || q.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (!ref) return J(400, { error: 'r requis' });

  try {
    const st = getBlobStore(event, 'robin-signatures');
    if (!st) return J(500, { error: 'store indisponible' });
    const b64 = await st.get('pdf/' + ref, { type: 'text' });
    if (!b64) return J(404, { error: 'PDF non archivé pour cette référence' });
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Mandat-Robin-des-Airs-${ref}.pdf"`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': 'https://robindesairs.eu',
      },
      body: b64,
      isBase64Encoded: true,
    };
  } catch (e) {
    return J(500, { error: e.message });
  }
};

/**
 * Récupère le PDF signé ARCHIVÉ d'un mandat (GET public, par RÉF).
 *   GET /api/mandat-pdf?r=REF              →  PDF français (copie signée du client).
 *   GET /api/mandat-pdf?r=REF&bilingue=1   →  PDF BILINGUE FR/EN (à envoyer aux compagnies étrangères).
 *
 * Source : store 'robin-signatures', clés pdf/<ref> (FR) et pdf-bilingue/<ref> (FR/EN),
 *   écrites par submit-mandat à la signature.
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
  const bilingue = /^(1|true|oui|en|fr-en)$/i.test(String(q.bilingue || q.lang || ''));

  try {
    const st = getBlobStore(event, 'robin-signatures');
    if (!st) return J(500, { error: 'store indisponible' });
    const key = bilingue ? 'pdf-bilingue/' + ref : 'pdf/' + ref;
    const b64 = await st.get(key, { type: 'text' });
    if (!b64) return J(404, { error: bilingue ? 'PDF bilingue non archivé pour cette référence' : 'PDF non archivé pour cette référence' });
    const filename = bilingue ? `Mandat-bilingue-FR-EN-${ref}.pdf` : `Mandat-Robin-des-Airs-${ref}.pdf`;
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
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

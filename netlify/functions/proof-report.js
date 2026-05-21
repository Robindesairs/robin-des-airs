/**
 * Rapport HTML des preuves (stocké dans Netlify Blobs).
 * GET /api/proof-report?ref=RDA-…&t=<token HMAC>
 */

const { loadProofReport, proofReportToken, buildProofHtml } = require('./lib/proofs-collect');

const HEADERS_HTML = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, max-age=300',
};

exports.handler = async (event) => {
  const ref = (event.queryStringParameters?.ref || '').trim();
  const token = (event.queryStringParameters?.t || '').trim();

  if (!ref || !token) {
    return { statusCode: 400, headers: HEADERS_HTML, body: '<p>ref et t requis</p>' };
  }

  const expected = proofReportToken(ref);
  if (!expected || token !== expected) {
    return { statusCode: 403, headers: HEADERS_HTML, body: '<p>Accès refusé</p>' };
  }

  const report = await loadProofReport(event, ref);
  if (!report) {
    return {
      statusCode: 404,
      headers: HEADERS_HTML,
      body: `<p>Aucun rapport pour ${ref}. Lancez la collecte (création dossier ou POST /api/collect-proofs).</p>`,
    };
  }

  return {
    statusCode: 200,
    headers: HEADERS_HTML,
    body: buildProofHtml(report),
  };
};

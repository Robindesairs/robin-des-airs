/**
 * Vérifie la signature d’un lien mandat (GET, public).
 */

const { verifyMandatQuery } = require('./lib/mandat-sign');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const qs = event.queryStringParameters || {};
  const params = new URLSearchParams();
  Object.keys(qs).forEach((k) => {
    if (qs[k] != null) params.set(k, qs[k]);
  });

  const result = verifyMandatQuery(params);
  return {
    statusCode: result.ok ? 200 : 403,
    headers,
    body: JSON.stringify(result),
  };
};

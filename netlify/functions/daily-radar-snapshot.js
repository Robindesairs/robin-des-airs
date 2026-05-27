/**
 * Snapshot matin — bandeau 10 vols + rapport email expert@robindesairs.eu
 * POST /api/daily-radar-snapshot
 */

const { handler: monitorHandler } = require('./radar-monitor');
const { verifyInternalSecret, publicCorsHeaders } = require('./lib/internal-auth');

exports.handler = async (event) => {
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {}
  const auth = verifyInternalSecret(event, body);
  if (!auth.ok) {
    return {
      statusCode: 401,
      headers: publicCorsHeaders(),
      body: JSON.stringify({ ok: false, error: auth.error }),
    };
  }

  const ev = {
    ...event,
    httpMethod: event.httpMethod || 'POST',
    queryStringParameters: {
      ...(event.queryStringParameters || {}),
      force: 'morning',
    },
  };
  try {
    return await monitorHandler(ev);
  } catch (e) {
    console.error('daily-radar-snapshot:', e);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: e.message || 'Erreur snapshot',
        hint: 'Vérifier RAPIDAPI_KEY, abonnement AeroDataBox, logs radar-monitor',
      }),
    };
  }
};

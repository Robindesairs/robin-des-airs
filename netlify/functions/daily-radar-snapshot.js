/**
 * Snapshot matin — bandeau 10 vols + rapport email expert@robindesairs.eu
 * POST /api/daily-radar-snapshot
 */

const { handler: monitorHandler } = require('./radar-monitor');

exports.handler = async (event) => {
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

/**
 * Alias — même job que radar-ticker-refresh (bandeau 10 vols EU ↔ Afrique).
 * POST /.netlify/functions/daily-radar-snapshot
 * GET  /.netlify/functions/daily-radar-snapshot  (idem)
 */

const { handler } = require('./radar-ticker-refresh');

exports.handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'GET or POST only' }),
    };
  }
  return handler(event);
};

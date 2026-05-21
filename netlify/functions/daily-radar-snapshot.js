/**
 * Alias — même job que radar-ticker-refresh (bandeau 10 vols EU ↔ Afrique).
 * POST /.netlify/functions/daily-radar-snapshot
 * GET  /.netlify/functions/daily-radar-snapshot  (idem)
 */

/** Alias manuel → créneau matin (bandeau + email). */
const { handler } = require('./radar-monitor');
const inner = handler;

exports.handler = async (event) => {
  const ev = Object.assign({}, event, {
    queryStringParameters: Object.assign({}, event.queryStringParameters || {}, {
      force: 'morning',
    }),
  });
  return inner(ev);
};

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

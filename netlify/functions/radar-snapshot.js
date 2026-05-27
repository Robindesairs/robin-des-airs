/**
 * radar-snapshot — Robin des Airs
 *
 * Retourne le snapshot quotidien des 10 vols les plus impactés
 * (annulés ou retardés, routes Europe↔Afrique), généré chaque matin à 8h
 * par la fonction daily-radar-snapshot.
 *
 * GET /api/radar-snapshot
 * Réponse : { flights, date, updatedAt, total, dataSource }
 */

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}

const { publicCorsHeaders } = require('./lib/auth-config');
const { checkRateLimit } = require('./lib/rate-limit');

const STORE_NAME = 'robin-radar';

const HEADERS = publicCorsHeaders({
  'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const rl = await checkRateLimit(event, { key: 'radar-snapshot', max: 60, windowSec: 60 });
  if (!rl.ok) return rl.response;

  if (!blobs) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Netlify Blobs non disponible', flights: [] }),
    };
  }

  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    const store = blobs.getStore(STORE_NAME);
    const snapshot = await store.getJSON('radar-daily-snapshot');

    if (!snapshot || !Array.isArray(snapshot.flights)) {
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ flights: [], date: null, updatedAt: null, total: 0, fresh: false }),
      };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ...snapshot, fresh: true }),
    };
  } catch (e) {
    console.error('radar-snapshot: blobs error', e.message);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ flights: [], error: e.message, fresh: false }),
    };
  }
};

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

const { getBlobStore } = require('./lib/netlify-blobs-store');
const { publicCorsHeaders } = require('./lib/auth-config');
const { checkRateLimit } = require('./lib/rate-limit');

const STORE_NAME = 'robin-radar';
const SNAPSHOT_KEY = 'radar-daily-snapshot';

const HEADERS = publicCorsHeaders({
  'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const rl = await checkRateLimit(event, { key: 'radar-snapshot', max: 60, windowSec: 60 });
  if (!rl.ok) return rl.response;

  const store = getBlobStore(event, STORE_NAME);
  if (!store) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({
        error: 'Netlify Blobs non disponible — activez Storage sur le site Netlify puis redéployez.',
        flights: [],
      }),
    };
  }

  try {
    const snapshot = await store.get(SNAPSHOT_KEY, { type: 'json' });

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

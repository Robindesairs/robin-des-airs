/**
 * Bandeau accueil — 10 derniers vols impactés Europe ↔ Afrique (cache quotidien).
 * GET /api/vol-ticker
 */

let netlifyBlobsModule = null;
try {
  netlifyBlobsModule = require('@netlify/blobs');
} catch (e) {}

const STORE_NAME = 'robin-radar-ticker';
const CACHE_KEY = 'banner/latest.json';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400',
};

const {
  fetchRadarFlightsForDate,
  filterImpactedEuAfricaFlights,
  sortImpactedForTicker,
  parisDateYmd,
} = require('./radar');

async function readBlobCache(event) {
  if (!netlifyBlobsModule) return null;
  try {
    const blobs = netlifyBlobsModule;
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    const store = blobs.getStore(STORE_NAME);
    return await store.get(CACHE_KEY, { type: 'json' });
  } catch {
    return null;
  }
}

async function buildLiveFallback() {
  const payload = await fetchRadarFlightsForDate(parisDateYmd());
  const impacted = filterImpactedEuAfricaFlights(payload.flights || []);
  const sorted = sortImpactedForTicker(impacted).slice(0, 10);
  return {
    flights: sorted,
    viewDate: payload.viewDate || parisDateYmd(),
    updatedAt: new Date().toISOString(),
    dataSource: 'aerodatabox-live',
    tickerMode: 'eu-africa-impacted',
    count: sorted.length,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({ error: 'RAPIDAPI_KEY manquant', flights: [] }),
    };
  }

  try {
    let data = await readBlobCache(event);
    const staleHours = parseInt(process.env.TICKER_STALE_HOURS || '30', 10) || 30;
    const staleMs = staleHours * 3600000;
    const updated = data && data.updatedAt ? Date.parse(data.updatedAt) : 0;
    const isStale = !updated || Date.now() - updated > staleMs;

    if (!data || !Array.isArray(data.flights) || !data.flights.length || isStale) {
      try {
        data = await buildLiveFallback();
      } catch (e) {
        console.warn('vol-ticker live fallback:', e.message);
        if (!data) {
          return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify({
              flights: [],
              updatedAt: new Date().toISOString(),
              error: e.message,
            }),
          };
        }
      }
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify(data),
    };
  } catch (e) {
    console.error('vol-ticker:', e);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        flights: [],
        updatedAt: new Date().toISOString(),
        error: e.message,
      }),
    };
  }
};

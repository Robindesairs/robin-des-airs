/**
 * Bandeau accueil — jusqu’à 9 vols impactés Europe ↔ Afrique (scan multi-jours + cache).
 * GET /api/vol-ticker
 */

const { getBlobStore } = require('./lib/netlify-blobs-store');

const STORE_NAME = 'robin-radar-ticker';
const CACHE_KEY = 'banner/latest.json';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400',
};

const {
  fetchBannerImpactedFlights,
  mergeTickerBannerFlights,
  parisDateYmd,
} = require('./radar');

async function readBlobCache(event) {
  const store = getBlobStore(event, STORE_NAME);
  if (!store) return null;
  try {
    return await store.get(CACHE_KEY, { type: 'json' });
  } catch {
    return null;
  }
}

async function buildLiveFallback(event) {
  const cached = await readBlobCache(event);
  const liveScanDays = Math.min(
    7,
    Math.max(1, parseInt(process.env.TICKER_LIVE_SCAN_DAYS || '4', 10) || 4)
  );
  const payload = await fetchBannerImpactedFlights({ maxDaysThisRun: liveScanDays });
  const merged = mergeTickerBannerFlights(cached && cached.flights, payload.flights);
  return {
    flights: merged,
    viewDate: payload.viewDate || parisDateYmd(),
    daysScanned: payload.daysScanned,
    maxDays: payload.maxDays,
    targetCount: payload.targetCount,
    updatedAt: new Date().toISOString(),
    dataSource: 'aerodatabox-live',
    tickerMode: 'eu-africa-impacted',
    count: merged.length,
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
    const needsMore =
      !data || !Array.isArray(data.flights) || data.flights.length < 1 || isStale;

    if (needsMore) {
      try {
        data = await buildLiveFallback(event);
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

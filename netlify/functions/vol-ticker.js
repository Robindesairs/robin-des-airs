/**
 * Bandeau accueil — jusqu’à 9 vols impactés Europe ↔ Afrique (cache Blobs + scan rapide).
 * GET /api/vol-ticker
 */

const { getBlobStore } = require('./lib/netlify-blobs-store');

const STORE_NAME = 'robin-radar-ticker';
const CACHE_KEY = 'banner/latest.json';
const TARGET = 9;

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400',
};

const {
  fetchBannerImpactedFlights,
  mergeTickerBannerFlights,
  BANNER_TARGET_COUNT,
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

async function writeBlobCache(event, data) {
  const store = getBlobStore(event, STORE_NAME);
  if (!store || !data) return false;
  try {
    await store.setJSON(CACHE_KEY, data);
    return true;
  } catch (e) {
    console.warn('vol-ticker blob write:', e.message);
    return false;
  }
}

function buildResponse(base, flights) {
  const list = flights || [];
  return Object.assign({}, base, {
    flights: list,
    count: list.length,
    targetCount: BANNER_TARGET_COUNT || TARGET,
    updatedAt: new Date().toISOString(),
    tickerMode: 'eu-africa-impacted',
  });
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
    const cached = await readBlobCache(event);
    const cachedFlights = (cached && cached.flights) || [];
    const staleHours = parseInt(process.env.TICKER_STALE_HOURS || '30', 10) || 30;
    const staleMs = staleHours * 3600000;
    const updated = cached && cached.updatedAt ? Date.parse(cached.updatedAt) : 0;
    const isStale = !updated || Date.now() - updated > staleMs;
    const cacheComplete = cachedFlights.length >= (BANNER_TARGET_COUNT || TARGET);

    /* Cache récent et déjà 9 vols → réponse immédiate (pas de scan lourd). */
    if (cacheComplete && !isStale) {
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(cached),
      };
    }

    let merged = cachedFlights;
    let scanMeta = {};

    try {
      const liveScanDays = Math.min(
        3,
        Math.max(1, parseInt(process.env.TICKER_LIVE_SCAN_DAYS || '2', 10) || 2)
      );
      const payload = await fetchBannerImpactedFlights({ maxDaysThisRun: liveScanDays });
      merged = mergeTickerBannerFlights(cachedFlights, payload.flights);
      scanMeta = {
        viewDate: payload.viewDate || parisDateYmd(),
        daysScanned: payload.daysScanned,
        maxDays: payload.maxDays,
        dataSource: 'aerodatabox-live',
      };
    } catch (e) {
      console.warn('vol-ticker live scan:', e.message);
      if (cachedFlights.length) {
        scanMeta = { dataSource: 'cache-fallback', error: e.message };
      } else {
        return {
          statusCode: 200,
          headers: HEADERS,
          body: JSON.stringify({
            flights: [],
            count: 0,
            updatedAt: new Date().toISOString(),
            error: e.message,
          }),
        };
      }
    }

    const out = buildResponse(
      Object.assign(
        {
          viewDate: parisDateYmd(),
        },
        scanMeta
      ),
      merged
    );

    if (merged.length > 0) await writeBlobCache(event, out);

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify(out),
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

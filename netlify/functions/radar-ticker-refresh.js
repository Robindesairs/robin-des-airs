/**
 * Mise à jour quotidienne du bandeau « 10 derniers vols impactés » Europe ↔ Afrique.
 * Planifié via netlify.toml (cron). Stocke le résultat dans Netlify Blobs.
 */

let netlifyBlobsModule = null;
try {
  netlifyBlobsModule = require('@netlify/blobs');
} catch (e) {}

const STORE_NAME = 'robin-radar-ticker';
const CACHE_KEY = 'banner/latest.json';

const {
  fetchRadarFlightsForDate,
  filterImpactedEuAfricaFlights,
  sortImpactedForTicker,
  flightDedupeKey,
  parisDateYmd,
  parisDateAddDays,
} = require('./radar');

async function loadCached(store) {
  try {
    return await store.get(CACHE_KEY, { type: 'json' });
  } catch {
    return null;
  }
}

async function buildTickerCache() {
  const daysBack = Math.min(
    14,
    Math.max(3, parseInt(process.env.TICKER_HISTORY_DAYS || '7', 10) || 7)
  );
  const byKey = new Map();

  for (let offset = 0; offset < daysBack; offset++) {
    const dateYmd = parisDateAddDays(-offset);
    try {
      const payload = await fetchRadarFlightsForDate(dateYmd);
      const impacted = filterImpactedEuAfricaFlights(payload.flights || []);
      for (const f of impacted) {
        const k = flightDedupeKey(f);
        if (!byKey.has(k)) byKey.set(k, f);
      }
      console.log('radar-ticker-refresh:', dateYmd, impacted.length, 'impactés');
    } catch (e) {
      console.warn('radar-ticker-refresh:', dateYmd, e.message);
    }
  }

  let merged = sortImpactedForTicker(Array.from(byKey.values()));
  const maxStore = Math.min(50, Math.max(10, parseInt(process.env.TICKER_STORE_MAX || '30', 10) || 30));
  merged = merged.slice(0, maxStore);

  const bannerFlights = merged.slice(0, 10);
  const now = new Date();

  return {
    flights: bannerFlights,
    allImpacted: merged,
    viewDate: parisDateYmd(),
    updatedAt: now.toISOString(),
    refreshedAt: now.toISOString(),
    dataSource: 'aerodatabox',
    tickerMode: 'eu-africa-impacted',
    historyDays: daysBack,
    count: bannerFlights.length,
  };
}

exports.handler = async (event) => {
  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ ok: false, error: 'RAPIDAPI_KEY manquant' }),
    };
  }

  try {
    const cache = await buildTickerCache();

    if (netlifyBlobsModule) {
      const blobs = netlifyBlobsModule;
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE_NAME);
      await store.setJSON(CACHE_KEY, cache);
      console.log('radar-ticker-refresh: saved', cache.count, 'vols bandeau');
    } else {
      console.warn('radar-ticker-refresh: @netlify/blobs absent — cache non écrit');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        count: cache.count,
        updatedAt: cache.updatedAt,
        flights: cache.flights.map((f) => ({
          flight: f.flight,
          dep: f.dep,
          arr: f.arr,
          scheduledDate: f.scheduledDate,
          cancelled: f.cancelled,
          delayMinutes: f.delayMinutes,
        })),
      }),
    };
  } catch (e) {
    console.error('radar-ticker-refresh:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};

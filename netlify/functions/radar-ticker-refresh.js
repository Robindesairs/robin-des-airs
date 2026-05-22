/**
 * Mise à jour quotidienne du bandeau — jusqu’à 9 vols EU↔AF impactés (scan multi-jours).
 * Planifié via netlify.toml (cron). Stocke le résultat dans Netlify Blobs.
 */

const { getBlobStore } = require('./lib/netlify-blobs-store');

const STORE_NAME = 'robin-radar-ticker';
const CACHE_KEY = 'banner/latest.json';

const { mergeTickerBannerFlights, parisDateYmd } = require('./radar');

async function loadCached(store) {
  try {
    return await store.get(CACHE_KEY, { type: 'json' });
  } catch {
    return null;
  }
}

async function buildTickerCache(store) {
  const cached = store ? await loadCached(store) : null;
  const maxDays = Math.min(14, Math.max(1, parseInt(process.env.TICKER_HISTORY_DAYS || '7', 10) || 7));
  let offset = cached && typeof cached.scanDayOffset === 'number' ? cached.scanDayOffset : 0;
  if (offset >= maxDays) offset = 0;

  const { fetchBannerDayScan, filterImpactedEuAfricaFlights, parisDateAddDays } = require('./radar');
  const dayYmd = parisDateAddDays(-offset);
  let incoming = [];
  try {
    const dayPayload = await fetchBannerDayScan(dayYmd);
    incoming = filterImpactedEuAfricaFlights(dayPayload.flights || []);
  } catch (e) {
    console.warn('radar-ticker-refresh day', dayYmd, e.message);
  }

  const bannerFlights = mergeTickerBannerFlights(cached && cached.flights, incoming);
  const now = new Date();
  const nextOffset = bannerFlights.length >= 9 ? 0 : offset + 1;

  return {
    flights: bannerFlights,
    viewDate: parisDateYmd(),
    scanDayOffset: nextOffset,
    lastScanDate: dayYmd,
    maxDays,
    targetCount: 9,
    updatedAt: now.toISOString(),
    refreshedAt: now.toISOString(),
    dataSource: 'aerodatabox',
    tickerMode: 'eu-africa-impacted',
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
    const store = getBlobStore(event, STORE_NAME);
    const cache = await buildTickerCache(store);

    let blobSaved = false;
    let blobError = null;
    if (store) {
      try {
        await store.setJSON(CACHE_KEY, cache);
        blobSaved = true;
        console.log('radar-ticker-refresh: saved', cache.count, 'vols bandeau');
      } catch (e) {
        blobError = e.message;
        console.warn('radar-ticker-refresh: blob write', e.message);
      }
    } else {
      blobError = 'Netlify Blobs indisponible';
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        blobSaved,
        blobError,
        count: cache.count,
        daysScanned: cache.daysScanned,
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

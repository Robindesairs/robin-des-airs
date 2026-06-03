/**
 * Bandeau accueil — jusqu’à 9 vols impactés Europe ↔ Afrique (cache Blobs + scan rapide).
 * GET /api/vol-ticker
 */

const { getBlobStore } = require('./lib/netlify-blobs-store');
const { getPinnedFlights } = require('./lib/pinned-flights');

const { publicCorsHeaders } = require('./lib/auth-config');
const { checkRateLimit } = require('./lib/rate-limit');
const { isVolTickerLiveScanEnabled } = require('./lib/radar-api-policy');

const STORE_NAME = 'robin-radar-ticker';
const CACHE_KEY = 'banner/latest.json';
const TARGET = 9;

const HEADERS = publicCorsHeaders({
  'Cache-Control': 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400',
});

const {
  fetchBannerImpactedFlights,
  mergeTickerBannerFlights,
  getTickerAfricaHubs,
  BANNER_TARGET_COUNT,
  parisDateYmd,
} = require('./radar');

/**
 * Les vols live / sélectionnés passent EN PREMIER (jamais écrasés). Les vols
 * "pinned" (RAM suspension) complètent uniquement les slots restants jusqu'à
 * BANNER_TARGET_COUNT, tant que la fenêtre d'activité est ouverte.
 */
function applyPinnedFlights(flights, viewDate) {
  const pinned = getPinnedFlights(viewDate);
  if (!pinned.length) return flights || [];
  const target = BANNER_TARGET_COUNT || TARGET;
  const pinnedKeys = new Set(
    pinned.map((p) => `${p.flight}|${p.dep}|${p.arr}|${p.scheduledDate}`)
  );
  const live = (flights || []).filter(
    (f) => !pinnedKeys.has(`${f.flight}|${f.dep}|${f.arr}|${f.scheduledDate}`)
  );
  // Nouveaux vols (live / sélectionnés) EN PREMIER — ils ne sont plus écrasés par
  // les RAM épinglés. Les pinned complètent uniquement les slots restants.
  return live.concat(pinned).slice(0, target);
}

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

  const rl = await checkRateLimit(event, { key: 'vol-ticker', max: 40, windowSec: 60 });
  if (!rl.ok) return rl.response;

  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({ error: 'RAPIDAPI_KEY manquant', flights: [] }),
    };
  }

  try {
    if (!isVolTickerLiveScanEnabled()) {
      const cachedOnly = await readBlobCache(event);
      const viewDate = (cachedOnly && cachedOnly.viewDate) || parisDateYmd();
      const finalFlights = applyPinnedFlights((cachedOnly && cachedOnly.flights) || [], viewDate);
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(
          buildResponse(
            {
              viewDate,
              dataSource: 'cache-only',
              hint: 'Bandeau sans scan API (RADAR_VOL_TICKER_LIVE non activé).',
            },
            finalFlights
          )
        ),
      };
    }

    const cached = await readBlobCache(event);
    const cachedFlights = (cached && cached.flights) || [];
    const staleHours = parseInt(process.env.TICKER_STALE_HOURS || '30', 10) || 30;
    const staleMs = staleHours * 3600000;
    const updated = cached && cached.updatedAt ? Date.parse(cached.updatedAt) : 0;
    const isStale = !updated || Date.now() - updated > staleMs;
    const cacheComplete = cachedFlights.length >= (BANNER_TARGET_COUNT || TARGET);

    /* Cache récent et déjà 9 vols → réponse immédiate (pas de scan lourd).
     * On réinjecte les pinned au cas où la fenêtre d'activité a changé depuis
     * la dernière écriture du cache. */
    if (cacheComplete && !isStale) {
      const out = Object.assign({}, cached, {
        flights: applyPinnedFlights(cached.flights, cached.viewDate),
      });
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(out),
      };
    }

    let merged = cachedFlights;
    let scanMeta = {};
    let nextHubRun = (cached && typeof cached.hubRunIndex === 'number' ? cached.hubRunIndex : 0);

    try {
      const liveScanDays = Math.min(
        3,
        Math.max(1, parseInt(process.env.TICKER_LIVE_SCAN_DAYS || '2', 10) || 2)
      );
      const hubRunIndex = cached && typeof cached.hubRunIndex === 'number' ? cached.hubRunIndex : 0;
      const perRun = Math.max(8, parseInt(process.env.TICKER_AFRICA_HUBS_PER_RUN || '12', 10) || 12);
      const africaTotal = getTickerAfricaHubs().length;
      const hubRunsNeeded = Math.max(1, Math.ceil(africaTotal / perRun));

      const payload = await fetchBannerImpactedFlights({
        maxDaysThisRun: liveScanDays,
        hubRunIndex,
      });
      merged = mergeTickerBannerFlights(cachedFlights, payload.flights);
      nextHubRun = (hubRunIndex + 1) % hubRunsNeeded;
      scanMeta = {
        viewDate: payload.viewDate || parisDateYmd(),
        daysScanned: payload.daysScanned,
        maxDays: payload.maxDays,
        hubsScanned: payload.hubsScanned,
        dataSource: 'aerodatabox-live',
        hubRunIndex: nextHubRun,
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

    const viewDate = parisDateYmd();
    const finalFlights = applyPinnedFlights(merged, viewDate);

    const out = buildResponse(
      Object.assign(
        {
          viewDate,
        },
        scanMeta
      ),
      finalFlights
    );

    out.hubRunIndex = nextHubRun;
    /* On écrit le cache avec la liste mergée brute (sans pinned) pour pouvoir
     * activer/désactiver dynamiquement les pinned sans avoir à invalider. */
    const cachePayload = Object.assign({}, out, { flights: merged });
    await writeBlobCache(event, cachePayload);

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

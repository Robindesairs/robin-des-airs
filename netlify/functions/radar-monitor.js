/**
 * Monitoring radar par créneaux (Europe/Paris).
 *
 * - 08h : bandeau 10 vols + rapport email
 * - 16h–17h : départs EU → Afrique (anticipation vol retour)
 * - 18h–02h (chaque heure) : départs Afrique / escales → Europe
 *
 * Planifié : netlify.toml → radar-monitor (5 * * * *)
 * Manuel : POST /api/radar-monitor?force=morning|eu|africa
 */

const {
  getParisParts,
  detectSlot,
  slotTimeWindows,
  EU_AFTERNOON_HUBS,
  AFRICA_EVENING_HUBS,
} = require('./lib/radar-monitor-config');

const {
  fetchRadarSlot,
  filterImpactedEuAfricaFlights,
  filterEuAfternoonDepartures,
  filterAfricaEveningDepartures,
  sortImpactedForTicker,
  summarizeFlight,
} = require('./lib/radar-fetch-slot');

const {
  parisDateYmd,
  parisDateAddDays,
  fetchRadarFlightsForDate,
} = require('./radar');

const { saveBanner, appendSlotLog, loadDayLogs } = require('./lib/radar-monitor-store');
const { sendRadarMorningReport } = require('./lib/radar-report-email');

async function buildMorningBanner() {
  const payload = await fetchRadarFlightsForDate(parisDateYmd());
  const impacted = sortImpactedForTicker(filterImpactedEuAfricaFlights(payload.flights || []));
  const bannerFlights = impacted.slice(0, 10);
  return {
    flights: bannerFlights,
    allImpacted: impacted.slice(0, 30),
    viewDate: payload.viewDate || parisDateYmd(),
    updatedAt: new Date().toISOString(),
    dataSource: 'aerodatabox',
    tickerMode: 'eu-africa-impacted',
    count: bannerFlights.length,
  };
}

async function runSlotScan({ slot, hubs, filterFn, parisHour, dateYmd, windows }) {
  let payload = { flights: [], apiRequests: 0 };
  try {
    payload = await fetchRadarSlot({
      dateYmd,
      hubs,
      windows,
      directions: ['Departure'],
    });
  } catch (e) {
    console.warn('runSlotScan fetch:', e.message);
    return {
      slot,
      parisHour,
      dateYmd,
      at: new Date().toISOString(),
      apiRequests: 0,
      impactedCount: 0,
      alerts: [],
      flights: [],
      fetchError: e.message,
    };
  }
  const filtered = filterFn(payload.flights || []);
  const sorted = sortImpactedForTicker(filtered);
  const alerts = sorted.slice(0, 15).map(summarizeFlight);
  return {
    slot,
    parisHour,
    dateYmd,
    at: new Date().toISOString(),
    apiRequests: payload.apiRequests,
    impactedCount: sorted.length,
    alerts,
    flights: sorted.slice(0, 25),
  };
}

async function runMorning(event, parisHour, dateYmd) {
  let cache;
  try {
    cache = await buildMorningBanner();
  } catch (e) {
    console.error('runMorning buildBanner:', e.message);
    cache = {
      flights: [],
      count: 0,
      viewDate: dateYmd,
      updatedAt: new Date().toISOString(),
      dataSource: 'error',
      buildError: e.message,
    };
  }
  const blob = await saveBanner(event, cache);

  const yesterday = parisDateAddDays(-1);
  const dayLog = await loadDayLogs(event, yesterday);
  const todayLog = await loadDayLogs(event, dateYmd);
  const slots = [...(dayLog && dayLog.slots) || [], ...(todayLog && todayLog.slots) || []];
  const slotSummary = slots.slice(-12).map((s) => ({
    slot: s.slot,
    hour: s.hour,
    impacted: s.impacted,
    top: (s.alerts || []).slice(0, 3),
  }));

  const email = await sendRadarMorningReport({
    banner: cache,
    dayLog,
    slotSummary,
    parisDate: dateYmd,
    parisHour,
  });

  await appendSlotLog(event, {
    slot: 'morning',
    parisHour,
    dateYmd,
    at: new Date().toISOString(),
    impactedCount: cache.count,
    alerts: cache.flights.map(summarizeFlight),
  });

  return { cache, blob, email };
}

exports.handler = async (event) => {
  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ ok: false, error: 'RAPIDAPI_KEY manquant' }),
    };
  }

  const force = (event.queryStringParameters?.force || '').trim().toLowerCase();
  const { dateYmd, hour: parisHour } = getParisParts();
  let slot = detectSlot(parisHour);
  if (force === 'morning') slot = 'morning';
  if (force === 'eu' || force === 'eu-afternoon') slot = 'eu-afternoon';
  if (force === 'africa' || force === 'africa-evening') slot = 'africa-evening';

  if (slot === 'idle' && !force) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        skipped: true,
        parisHour,
        message: 'Hors créneau (8h / 16-17h / 18h-2h Paris)',
      }),
    };
  }

  try {
    const windows = slotTimeWindows(parisHour, dateYmd);
    let result = {};

    if (slot === 'morning') {
      result = await runMorning(event, parisHour, dateYmd);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          slot: 'morning',
          parisHour,
          bannerCount: result.cache.count,
          blobSaved: result.blob.ok,
          email: result.email,
          flights: result.cache.flights,
        }),
      };
    }

    if (slot === 'eu-afternoon') {
      const entry = await runSlotScan({
        slot: 'eu-afternoon',
        hubs: EU_AFTERNOON_HUBS,
        filterFn: filterEuAfternoonDepartures,
        parisHour,
        dateYmd,
        windows,
      });
      await appendSlotLog(event, entry);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, ...entry }),
      };
    }

    if (slot === 'africa-evening') {
      const entry = await runSlotScan({
        slot: 'africa-evening',
        hubs: AFRICA_EVENING_HUBS,
        filterFn: filterAfricaEveningDepartures,
        parisHour,
        dateYmd,
        windows,
      });
      await appendSlotLog(event, entry);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, ...entry }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, slot }) };
  } catch (e) {
    console.error('radar-monitor:', e);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: e.message,
        errorType: e.name,
        slot,
        parisHour,
        hint:
          'fetch failed = réseau Netlify→RapidAPI ou clé/abonnement AeroDataBox. Tester scripts/test-rapidapi-key.mjs',
      }),
    };
  }
};

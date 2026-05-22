/**
 * Statistiques radar — Netlify Blobs (robin-radar-ticker).
 * stats/daily/{YYYY-MM-DD}.json + stats/index.json (30 derniers jours).
 */

const { getBlobStore } = require('./netlify-blobs-store');

const STORE_NAME = 'robin-radar-ticker';
const INDEX_KEY = 'stats/index.json';
const MAX_INDEX_DAYS = 30;

function dailyKey(dateYmd) {
  return `stats/daily/${dateYmd}.json`;
}

function emptyDay(dateYmd) {
  return {
    dateYmd,
    updatedAt: new Date().toISOString(),
    banner: { count: 0, flights: [] },
    scans: [],
    totals: {
      scanRuns: 0,
      impactedSeen: 0,
      cancelled: 0,
      delayGte180: 0,
      delayGte60: 0,
      apiRequests: 0,
    },
    routes: {},
  };
}

function bumpRoute(routes, dep, arr) {
  const k = `${dep || '?'}→${arr || '?'}`;
  routes[k] = (routes[k] || 0) + 1;
}

function aggregateFlights(day, flights, slotLabel) {
  const list = flights || [];
  for (const f of list) {
    day.totals.impactedSeen += 1;
    if (f.cancelled) day.totals.cancelled += 1;
    const d = f.delayMinutes;
    if (d != null && d >= 180) day.totals.delayGte180 += 1;
    if (d != null && d >= 60) day.totals.delayGte60 += 1;
    bumpRoute(day.routes, f.dep, f.arr);
  }
  day.scans.push({
    at: new Date().toISOString(),
    slot: slotLabel,
    count: list.length,
    sample: list.slice(0, 5).map((f) => ({
      flight: f.flight,
      dep: f.dep,
      arr: f.arr,
      delayMinutes: f.delayMinutes,
      cancelled: !!f.cancelled,
    })),
  });
  day.totals.scanRuns += 1;
}

async function loadDay(store, dateYmd) {
  try {
    const d = await store.get(dailyKey(dateYmd), { type: 'json' });
    if (d && d.dateYmd) return d;
  } catch (_) {}
  return emptyDay(dateYmd);
}

async function saveDay(store, day) {
  day.updatedAt = new Date().toISOString();
  await store.setJSON(dailyKey(day.dateYmd), day);
}

async function refreshIndex(store, dateYmd) {
  let index = { days: [] };
  try {
    index = (await store.get(INDEX_KEY, { type: 'json' })) || index;
  } catch (_) {}
  if (!Array.isArray(index.days)) index.days = [];

  const day = await loadDay(store, dateYmd);
  const row = {
    dateYmd,
    bannerCount: (day.banner && day.banner.count) || 0,
    scanRuns: day.totals.scanRuns,
    impactedSeen: day.totals.impactedSeen,
    cancelled: day.totals.cancelled,
    delayGte180: day.totals.delayGte180,
    apiRequests: day.totals.apiRequests,
    updatedAt: day.updatedAt,
  };

  index.days = index.days.filter((d) => d.dateYmd !== dateYmd);
  index.days.unshift(row);
  index.days = index.days.slice(0, MAX_INDEX_DAYS);
  index.updatedAt = new Date().toISOString();
  await store.setJSON(INDEX_KEY, index);
  return index;
}

/** Enregistre le bandeau matin (subsaharien ≥ 3 h). */
async function recordMorningBanner(event, { dateYmd, banner }) {
  const store = getBlobStore(event, STORE_NAME);
  if (!store) return { ok: false, error: 'blobs_unavailable' };

  const day = await loadDay(store, dateYmd);
  const flights = (banner && banner.flights) || [];
  day.banner = {
    count: flights.length,
    flights: flights.slice(0, 12).map((f) => ({
      flight: f.flight,
      dep: f.dep,
      arr: f.arr,
      scheduledDate: f.scheduledDate,
      delayMinutes: f.delayMinutes,
      cancelled: !!f.cancelled,
    })),
  };
  day.scans.push({
    at: new Date().toISOString(),
    slot: 'morning-banner',
    count: flights.length,
    sample: day.banner.flights.slice(0, 5),
  });
  for (const f of flights) {
    day.totals.impactedSeen += 1;
    if (f.cancelled) day.totals.cancelled += 1;
    const d = f.delayMinutes;
    if (d != null && d >= 180) day.totals.delayGte180 += 1;
    if (d != null && d >= 60) day.totals.delayGte60 += 1;
    bumpRoute(day.routes, f.dep, f.arr);
  }
  day.totals.scanRuns += 1;
  await saveDay(store, day);
  const index = await refreshIndex(store, dateYmd);
  return { ok: true, index };
}

/** Enregistre un créneau (eu-afternoon, africa-evening, etc.). */
async function recordSlotScan(event, entry) {
  const store = getBlobStore(event, STORE_NAME);
  if (!store) return { ok: false, error: 'blobs_unavailable' };

  const dateYmd = entry.dateYmd;
  const day = await loadDay(store, dateYmd);
  const flights = entry.flights || [];
  aggregateFlights(day, flights, entry.slot || 'scan');
  day.totals.apiRequests += entry.apiRequests || 0;
  await saveDay(store, day);
  const index = await refreshIndex(store, dateYmd);
  return { ok: true, index };
}

/** Charge l’index + N derniers jours pour rapport email. */
async function loadStatsReport(event, daysBack = 7) {
  const store = getBlobStore(event, STORE_NAME);
  if (!store) return { index: { days: [] }, days: [] };

  let index = { days: [] };
  try {
    index = (await store.get(INDEX_KEY, { type: 'json' })) || index;
  } catch (_) {}

  const slice = (index.days || []).slice(0, daysBack);
  const days = [];
  for (const row of slice) {
    days.push(await loadDay(store, row.dateYmd));
  }
  return { index, days };
}

module.exports = {
  recordMorningBanner,
  recordSlotScan,
  loadStatsReport,
  INDEX_KEY,
};

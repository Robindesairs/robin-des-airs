/**
 * Historique créneaux radar (Netlify Blobs).
 */

const { getBlobStore } = require('./netlify-blobs-store');

const STORE_NAME = 'robin-radar-ticker';
const BANNER_KEY = 'banner/latest.json';
const LOG_PREFIX = 'monitor/logs/';

function logKey(dateYmd, hour, slot) {
  return `${LOG_PREFIX}${dateYmd}-${String(hour).padStart(2, '0')}-${slot}.json`;
}

function dayKey(dateYmd) {
  return `monitor/day/${dateYmd}.json`;
}

async function saveBanner(event, cache) {
  const store = getBlobStore(event, STORE_NAME);
  if (!store) return { ok: false, error: 'blobs_unavailable' };
  await store.setJSON(BANNER_KEY, cache);
  return { ok: true };
}

async function loadBanner(event) {
  const store = getBlobStore(event, STORE_NAME);
  if (!store) return null;
  try {
    return await store.get(BANNER_KEY, { type: 'json' });
  } catch {
    return null;
  }
}

async function appendSlotLog(event, entry) {
  const store = getBlobStore(event, STORE_NAME);
  if (!store) return { ok: false };
  const key = logKey(entry.dateYmd, entry.parisHour, entry.slot);
  await store.setJSON(key, entry);
  const dk = dayKey(entry.dateYmd);
  let day = await store.get(dk, { type: 'json' }).catch(() => null);
  if (!day || !Array.isArray(day.slots)) day = { dateYmd: entry.dateYmd, slots: [] };
  day.slots.push({
    slot: entry.slot,
    hour: entry.parisHour,
    at: entry.at,
    impacted: entry.impactedCount,
    alerts: (entry.alerts || []).slice(0, 20),
  });
  day.slots = day.slots.slice(-40);
  await store.setJSON(dk, day);
  return { ok: true };
}

async function loadDayLogs(event, dateYmd) {
  const store = getBlobStore(event, STORE_NAME);
  if (!store) return null;
  try {
    return await store.get(dayKey(dateYmd), { type: 'json' });
  } catch {
    return null;
  }
}

module.exports = {
  saveBanner,
  loadBanner,
  appendSlotLog,
  loadDayLogs,
  BANNER_KEY,
};

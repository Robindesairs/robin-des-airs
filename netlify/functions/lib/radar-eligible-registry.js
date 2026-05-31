/**
 * Registre permanent des vols éligibles CE 261 (mine d'or business).
 * Stockage Netlify Blobs — robin-radar / eligible-registry/v1.json
 */

const { getBlobStore } = require('./netlify-blobs-store');

const STORE_NAME = 'robin-radar';
const REGISTRY_KEY = 'eligible-registry/v1.json';
const MAX_ENTRIES = 10000;

function flightRegistryKey(f) {
  return [
    String(f.flight || f.vol || '').replace(/\s/g, '').toUpperCase(),
    String(f.dep || '').toUpperCase(),
    String(f.arr || '').toUpperCase(),
    String(f.scheduledDate || f.date || '').slice(0, 10),
  ].join('|');
}

function slugId(key) {
  return String(key || '')
    .replace(/\|/g, '_')
    .replace(/[^A-Za-z0-9_\-]/g, '')
    .slice(0, 120) || 'vol_unknown';
}

/** Même règle que le radar UI : éligible CE261 + annulé ou retard arrivée ≥ 3 h. */
function isRegistryEligible(f) {
  if (!f || f.eligible === false) return false;
  if (f.cancelled) return true;
  const dm = f.delayMinutes != null ? Number(f.delayMinutes) : f.retardMin != null ? Number(f.retardMin) : null;
  return dm != null && !Number.isNaN(dm) && dm >= 180;
}

function emptyRegistry() {
  return { updatedAt: new Date().toISOString(), total: 0, entries: {} };
}

async function loadRegistryRaw(event) {
  const store = getBlobStore(event, STORE_NAME);
  if (!store) return { store: null, registry: emptyRegistry() };
  try {
    const data = await store.get(REGISTRY_KEY, { type: 'json' });
    if (data && data.entries && typeof data.entries === 'object') {
      return { store, registry: data };
    }
  } catch (_) {}
  return { store, registry: emptyRegistry() };
}

function apiFlightToEntry(f, meta) {
  const key = flightRegistryKey(f);
  const id = slugId(key);
  const cancelled = !!f.cancelled;
  const dm = f.delayMinutes != null ? Number(f.delayMinutes) : f.retardMin != null ? Number(f.retardMin) : 0;
  const statut = cancelled ? 'ANNULE' : dm >= 15 ? 'RETARD' : 'A_LHEURE';
  const now = new Date().toISOString();
  const date = String(f.scheduledDate || f.date || '').slice(0, 10) || null;

  return {
    id,
    registryKey: key,
    vol: f.flight || f.vol || '—',
    comp: f.airline || f.comp || (f.flight || '').slice(0, 2) || '—',
    airlineIata: String(f.airline || f.airlineIata || '').toUpperCase().slice(0, 3),
    dep: String(f.dep || '').toUpperCase(),
    arr: String(f.arr || '').toUpperCase(),
    dep_ville: f.depNom || f.dep_ville || f.dep || '',
    arr_ville: f.arrNom || f.arr_ville || f.arr || '',
    date,
    dateLabel: f.dateLabel || date || '',
    statut,
    retardMin: cancelled ? 0 : dm,
    elig: 'OUI',
    score: cancelled ? 72 : dm >= 180 ? 78 : 68,
    std: f.scheduledDeparture || f.std || null,
    sta: f.scheduledArrival || f.sta || null,
    eta: f.landedAtZulu || f.estimatedArrival || f.eta || null,
    trackerUrl: f.trackerUrl || '',
    af_pays: f.af_pays || null,
    cancelled,
    delayMinutes: cancelled ? null : dm,
    eligible: f.eligible !== false,
    firstSeenAt: now,
    lastSeenAt: now,
    seenCount: 1,
    sources: meta && meta.source ? [meta.source] : ['radar-scan'],
    lastScanMode: meta && meta.scanMode ? meta.scanMode : null,
    lastScanHubs: meta && meta.hubs ? meta.hubs : null,
  };
}

function mergeEntry(existing, incoming) {
  const out = { ...existing, ...incoming };
  out.firstSeenAt = existing.firstSeenAt || incoming.firstSeenAt;
  out.lastSeenAt = incoming.lastSeenAt || existing.lastSeenAt;
  out.seenCount = (existing.seenCount || 0) + 1;
  const src = new Set([...(existing.sources || []), ...(incoming.sources || [])]);
  out.sources = Array.from(src).slice(-8);
  return out;
}

/**
 * Fusionne des vols API bruts ou entrées UI dans le registre.
 * @returns {{ ok: boolean, added: number, updated: number, total: number, error?: string }}
 */
async function mergeFlightsIntoRegistry(event, flights, meta) {
  const eligible = (flights || []).filter(isRegistryEligible);
  if (!eligible.length) return { ok: true, added: 0, updated: 0, total: 0 };

  const { store, registry } = await loadRegistryRaw(event);
  if (!store) return { ok: false, error: 'blobs_unavailable', added: 0, updated: 0, total: 0 };

  let added = 0;
  let updated = 0;
  const entries = registry.entries || {};

  for (const f of eligible) {
    const incoming = apiFlightToEntry(f, meta);
    const key = incoming.registryKey;
    if (entries[key]) {
      entries[key] = mergeEntry(entries[key], incoming);
      updated += 1;
    } else {
      entries[key] = incoming;
      added += 1;
    }
  }

  const keys = Object.keys(entries);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => String(entries[a].lastSeenAt || '').localeCompare(String(entries[b].lastSeenAt || '')))
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete entries[k]);
  }

  registry.entries = entries;
  registry.total = Object.keys(entries).length;
  registry.updatedAt = new Date().toISOString();
  await store.setJSON(REGISTRY_KEY, registry);

  return { ok: true, added, updated, total: registry.total };
}

/** Liste triée (plus récents d'abord). */
async function listRegistryFlights(event, opts) {
  const limit = Math.min(5000, Math.max(1, parseInt(opts && opts.limit, 10) || 2000));
  const { store, registry } = await loadRegistryRaw(event);
  if (!store) return { ok: false, error: 'blobs_unavailable', flights: [], total: 0 };

  const flights = Object.values(registry.entries || {})
    .sort((a, b) => {
      const da = a.date || a.firstSeenAt || '';
      const db = b.date || b.firstSeenAt || '';
      if (da !== db) return db.localeCompare(da);
      return String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
    })
    .slice(0, limit);

  return {
    ok: true,
    flights,
    total: registry.total || flights.length,
    updatedAt: registry.updatedAt || null,
  };
}

async function removeRegistryEntry(event, id) {
  const { store, registry } = await loadRegistryRaw(event);
  if (!store) return { ok: false, error: 'blobs_unavailable' };
  const entries = registry.entries || {};
  let removed = false;
  for (const key of Object.keys(entries)) {
    if (entries[key].id === id || entries[key].registryKey === id) {
      delete entries[key];
      removed = true;
      break;
    }
  }
  if (!removed) return { ok: false, error: 'not_found' };
  registry.entries = entries;
  registry.total = Object.keys(entries).length;
  registry.updatedAt = new Date().toISOString();
  await store.setJSON(REGISTRY_KEY, registry);
  return { ok: true, total: registry.total };
}

module.exports = {
  flightRegistryKey,
  slugId,
  isRegistryEligible,
  mergeFlightsIntoRegistry,
  listRegistryFlights,
  removeRegistryEntry,
  REGISTRY_KEY,
};

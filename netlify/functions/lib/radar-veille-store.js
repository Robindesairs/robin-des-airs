/**
 * Config veille serveur (Netlify Blobs) — activable/désactivable sans support.
 */

const { getBlobStore } = require('./netlify-blobs-store');
const { isRadarVeilleEnabled } = require('./radar-api-policy');

const STORE = 'robin-radar-veille';
const CONFIG_KEY = 'config.json';
const STATE_KEY = 'state.json';

const DEFAULT_CONFIG = {
  allerEnabled: true,
  returnEnabled: true,
};

function envKillAll() {
  if (!isRadarVeilleEnabled()) return true;
  const v = String(process.env.RADAR_VEILLE_DISABLED || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function envKillAller() {
  if (envKillAll()) return true;
  const v = String(process.env.RADAR_VEILLE_ALLER || '').trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'off';
}

function envKillReturn() {
  if (envKillAll()) return true;
  const v = String(process.env.RADAR_VEILLE_RETOUR || '').trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'off';
}

async function readJson(store, key, fallback) {
  if (!store) return fallback;
  try {
    const raw = await store.get(key, { type: 'text' });
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('radar-veille-store read:', key, e.message);
    return fallback;
  }
}

async function writeJson(store, key, data) {
  if (!store) throw new Error('Blobs indisponibles');
  await store.set(key, JSON.stringify(data));
}

async function loadConfig(event) {
  const store = getBlobStore(event, STORE);
  const blob = await readJson(store, CONFIG_KEY, { ...DEFAULT_CONFIG });
  return {
    allerEnabled: blob.allerEnabled !== false,
    returnEnabled: blob.returnEnabled !== false,
    updatedAt: blob.updatedAt || null,
    updatedBy: blob.updatedBy || null,
  };
}

async function saveConfig(event, patch) {
  const store = getBlobStore(event, STORE);
  const prev = await loadConfig(event);
  const next = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(store, CONFIG_KEY, next);
  return next;
}

async function loadState(event) {
  const store = getBlobStore(event, STORE);
  return readJson(store, STATE_KEY, {
    lastRuns: {},
    scanLockUntil: 0,
    lastScan: null,
  });
}

async function saveState(event, state) {
  const store = getBlobStore(event, STORE);
  await writeJson(store, STATE_KEY, state);
  return state;
}

function effectiveFlags(config) {
  const envAll = envKillAll();
  return {
    allerEnabled: !envAll && !envKillAller() && config.allerEnabled !== false,
    returnEnabled: !envAll && !envKillReturn() && config.returnEnabled !== false,
    envBlocked: {
      all: envAll,
      aller: envKillAller(),
      return: envKillReturn(),
    },
  };
}

async function clearVeilleData(event) {
  const store = getBlobStore(event, STORE);
  if (!store) return { cleared: false };
  await saveState(event, { lastRuns: {}, scanLockUntil: 0, lastScan: null });
  try {
    const list = await store.list({ prefix: 'cache/' });
    for (const item of list.blobs || []) {
      await store.delete(item.key);
    }
  } catch (e) {
    console.warn('radar-veille clear cache:', e.message);
  }
  return { cleared: true };
}

module.exports = {
  loadConfig,
  saveConfig,
  loadState,
  saveState,
  effectiveFlags,
  clearVeilleData,
  DEFAULT_CONFIG,
};

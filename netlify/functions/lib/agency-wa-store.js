/**
 * Sessions robot WhatsApp agence (Netlify Blobs store « robin-wa-agency »).
 */

const STORE_NAME = 'robin-wa-agency';
const LINK_PREFIX = 'link/';
const SESSION_PREFIX = 'session/';
const AGENCY_PREFIX = 'agency/';
const LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let netlifyBlobsModule = null;
try {
  netlifyBlobsModule = require('@netlify/blobs');
} catch (_) {}

const { normalizeWaPhone } = require('./wa-convo-store');

function getStore(event) {
  if (!netlifyBlobsModule) return null;
  const blobs = netlifyBlobsModule;
  if (blobs.connectLambda && event) blobs.connectLambda(event);
  return blobs.getStore(STORE_NAME);
}

async function getJson(store, key) {
  const raw = await store.get(key);
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

async function setJson(store, key, data) {
  await store.set(key, JSON.stringify(data));
}

async function getAgencyLink(event, phone) {
  const p = normalizeWaPhone(phone);
  const store = getStore(event);
  if (!store || !p) return null;
  const link = await getJson(store, LINK_PREFIX + p);
  if (!link || !link.code) return null;
  if (link.expiresAt && Date.parse(link.expiresAt) < Date.now()) return null;
  return link;
}

async function saveAgencyLink(event, phone, agency) {
  const p = normalizeWaPhone(phone);
  const store = getStore(event);
  if (!store || !p || !agency) return false;
  await setJson(store, LINK_PREFIX + p, {
    code: agency.code,
    name: agency.name,
    airtableMatch: agency.airtableMatch,
    linkedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + LINK_TTL_MS).toISOString(),
  });
  return true;
}

async function getAgencySession(event, phone) {
  const p = normalizeWaPhone(phone);
  const store = getStore(event);
  if (!store || !p) return { step: 'MENU', draft: {}, flow: null };
  const s = await getJson(store, SESSION_PREFIX + p);
  return s || { step: 'MENU', draft: {}, flow: null };
}

async function saveAgencySession(event, phone, session) {
  const p = normalizeWaPhone(phone);
  const store = getStore(event);
  if (!store || !p) return false;
  await setJson(store, SESSION_PREFIX + p, session);
  return true;
}

async function clearAgencySession(event, phone) {
  const p = normalizeWaPhone(phone);
  const store = getStore(event);
  if (!store || !p) return;
  await store.delete(SESSION_PREFIX + p);
}

// ─── Comptes agences dynamiques (créés via auto-inscription) ─────────────────

const CITY_CODES = {
  douala: 'DLA', yaounde: 'YDE', yaoundé: 'YDE',
  bafoussam: 'BFM', garoua: 'GRE', bamenda: 'BDA',
  kribi: 'KBI', limbe: 'LMB', ngaoundere: 'NGE', maroua: 'MRU',
};

function cityCode(ville) {
  const n = String(ville || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return CITY_CODES[n] || n.slice(0, 3).toUpperCase() || 'CMR';
}

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function saveNewAgency(event, { name, ville, phone, sourcePhone }) {
  const store = getStore(event);
  if (!store) return null;

  // Compte le nombre d'agences existantes pour générer le code séquentiel
  const existing = await loadDynamicAgencies(event);
  const cc = cityCode(ville);
  const seq = String(existing.length + 1).padStart(3, '0');
  const code = `AGC-${cc}-${seq}`;
  const pass = genPassword();

  const account = {
    code,
    pass,
    name: String(name || '').trim(),
    ville: String(ville || '').trim(),
    phone: String(phone || '').replace(/\D/g, ''),
    sourcePhone: String(sourcePhone || '').replace(/\D/g, ''),
    whatsappPhones: [String(phone || '').replace(/\D/g, '')],
    airtableMatch: code,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  await setJson(store, AGENCY_PREFIX + code, account);
  return account;
}

async function loadDynamicAgencies(event) {
  const store = getStore(event);
  if (!store) return [];
  try {
    const list = await store.list({ prefix: AGENCY_PREFIX });
    const keys = (list.blobs || list.keys || []).map(b => b.key || b);
    const accounts = await Promise.all(keys.map(k => getJson(store, k)));
    return accounts.filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = {
  STORE_NAME,
  getAgencyLink,
  saveAgencyLink,
  getAgencySession,
  saveAgencySession,
  clearAgencySession,
  saveNewAgency,
  loadDynamicAgencies,
  blobsAvailable: () => !!netlifyBlobsModule,
};

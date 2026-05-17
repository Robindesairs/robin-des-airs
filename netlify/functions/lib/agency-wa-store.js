/**
 * Sessions robot WhatsApp agence (Netlify Blobs store « robin-wa-agency »).
 */

const STORE_NAME = 'robin-wa-agency';
const LINK_PREFIX = 'link/';
const SESSION_PREFIX = 'session/';
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

module.exports = {
  STORE_NAME,
  getAgencyLink,
  saveAgencyLink,
  getAgencySession,
  saveAgencySession,
  clearAgencySession,
  blobsAvailable: () => !!netlifyBlobsModule,
};

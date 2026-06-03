/**
 * Historique conversations WhatsApp (Netlify Blobs store « robin-wa »).
 */

const STORE_NAME = 'robin-wa';
const CONVO_PREFIX = 'convo/';
const MAX_MESSAGES = 80;

let netlifyBlobsModule = null;
try {
  netlifyBlobsModule = require('@netlify/blobs');
} catch (_) {}

function normalizeWaPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length >= 11 && !d.startsWith('0')) return d;
  if (d.length === 10 && /^0[6-9]/.test(d)) return '33' + d.slice(1);
  if (d.length === 9 && /^[67]/.test(d)) return '33' + d;
  if (d.startsWith('0')) return d.slice(1);
  return d;
}

function getStore(event) {
  if (!netlifyBlobsModule) return null;
  const blobs = netlifyBlobsModule;
  if (blobs.connectLambda && event) blobs.connectLambda(event);
  return blobs.getStore(STORE_NAME);
}

async function readConvo(store, phone) {
  const key = CONVO_PREFIX + phone;
  const raw = await store.get(key);
  if (!raw) return [];
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * @param {object} event - Lambda event (connectLambda)
 * @param {string} phone - digits e.g. 33612345678
 * @param {{ role: 'user'|'assistant', text: string, source?: string, by?: string }} msg
 */
async function appendWaMessage(event, phone, msg) {
  const normalized = normalizeWaPhone(phone);
  if (!normalized || !msg || !msg.text) return { ok: false, error: 'invalid' };

  const store = getStore(event);
  if (!store) return { ok: false, error: 'blobs_unavailable' };

  const convo = await readConvo(store, normalized);
  convo.push({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    text: String(msg.text).slice(0, 4096),
    timestamp: new Date().toISOString(),
    source: msg.source || null,
    by: msg.by || null,
  });
  await store.set(CONVO_PREFIX + normalized, JSON.stringify(convo.slice(-MAX_MESSAGES)));
  return { ok: true, phone: normalized, count: convo.length };
}

async function listWaMessages(event, phone) {
  const normalized = normalizeWaPhone(phone);
  if (!normalized) {
    return { phone: '', messages: [], error: 'invalid_phone' };
  }

  const store = getStore(event);
  if (!store) {
    return {
      phone: normalized,
      messages: [],
      blobsAvailable: false,
      error: 'Blobs non disponibles — activez Netlify Blobs sur le site',
    };
  }

  const messages = await readConvo(store, normalized);
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUser = userMessages.length ? userMessages[userMessages.length - 1] : null;
  const lastUserTs = lastUser && lastUser.timestamp ? Date.parse(lastUser.timestamp) : 0;
  const within24h = !!(lastUserTs && Date.now() - lastUserTs < 24 * 60 * 60 * 1000);

  const canSendFreeText = within24h || messages.length === 0;

  return {
    phone: normalized,
    messages,
    count: messages.length,
    blobsAvailable: true,
    lastUserAt: lastUser && lastUser.timestamp ? lastUser.timestamp : null,
    within24h,
    canSendFreeText,
    noHistoryYet: messages.length === 0,
  };
}

/**
 * Liste les conversations récentes (dernier message de chaque numéro), triées
 * du plus récent au plus ancien. Utilisé par le tableau de bord interne.
 * @param {object} event
 * @param {number} [limit=10]
 */
async function listRecentConvos(event, limit = 10) {
  const store = getStore(event);
  if (!store) {
    return { blobsAvailable: false, conversations: [], error: 'Blobs non disponibles' };
  }
  let listing;
  try {
    listing = await store.list({ prefix: CONVO_PREFIX });
  } catch (e) {
    return { blobsAvailable: true, conversations: [], error: e.message };
  }
  const keys = (listing && listing.blobs ? listing.blobs : []).map((b) => b.key);
  const convos = [];
  for (const key of keys) {
    const phone = key.slice(CONVO_PREFIX.length);
    let messages = [];
    try { messages = await readConvo(store, phone); } catch { messages = []; }
    if (!messages.length) continue;
    const last = messages[messages.length - 1];
    convos.push({
      phone,
      count: messages.length,
      lastText: String(last.text || '').slice(0, 280),
      lastRole: last.role || 'user',
      lastAt: last.timestamp || null,
      lastSource: last.source || null,
    });
  }
  convos.sort((a, b) => (Date.parse(b.lastAt || 0) || 0) - (Date.parse(a.lastAt || 0) || 0));
  return {
    blobsAvailable: true,
    total: convos.length,
    conversations: convos.slice(0, Math.max(1, Math.min(50, limit))),
  };
}

module.exports = {
  STORE_NAME,
  normalizeWaPhone,
  appendWaMessage,
  listWaMessages,
  listRecentConvos,
  blobsAvailable: () => !!netlifyBlobsModule,
};

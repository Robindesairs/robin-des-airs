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
  if (d.startsWith('0')) return '33' + d.slice(1);
  if (d.length <= 9 && !d.startsWith('33') && !d.startsWith('32')) return '33' + d;
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

module.exports = {
  STORE_NAME,
  normalizeWaPhone,
  appendWaMessage,
  listWaMessages,
  blobsAvailable: () => !!netlifyBlobsModule,
};

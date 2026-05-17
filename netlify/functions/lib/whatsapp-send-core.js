/**
 * Envoi texte WhatsApp — Wati (prioritaire), Meta, ou 360dialog (legacy).
 */

const META_GRAPH_BASE = 'https://graph.facebook.com/v18.0';
const D360_BASE = 'https://waba-v2.360dialog.io';
const { watiCfg, watiSendSessionMessage } = require('./wati-api');

function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return '33' + digits.slice(1);
  if (digits.length <= 9 && !digits.startsWith('33') && !digits.startsWith('32')) return '33' + digits;
  return digits;
}

function getProvider() {
  const forced = (process.env.WHATSAPP_PROVIDER || '').toLowerCase();

  if (forced === 'wati' || (!forced && watiCfg())) {
    const w = watiCfg();
    if (w) return { name: 'wati', ...w };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (forced === 'meta' || (phoneNumberId && accessToken)) {
    return { name: 'meta', phoneNumberId, accessToken };
  }

  const d360Key = (process.env.WHATSAPP_360DIALOG_API_KEY || '').trim();
  if (forced === '360dialog' || d360Key) {
    return { name: '360dialog', apiKey: d360Key };
  }

  return { name: null };
}

function canSendWhatsApp() {
  const p = getProvider();
  if (p.name === 'wati') return true;
  if (p.name === 'meta') return !!(p.phoneNumberId && p.accessToken);
  if (p.name === '360dialog') return !!p.apiKey;
  return false;
}

/**
 * @returns {Promise<{ ok: boolean, messageId?: string, error?: string, details?: unknown, provider?: string }>}
 */
async function sendWhatsAppTextMessage(to, text) {
  const provider = getProvider();
  if (!provider.name) {
    return {
      ok: false,
      error: 'WhatsApp non configuré (WATI_API_BASE + WATI_API_TOKEN, ou Meta, ou 360dialog)',
    };
  }

  if (provider.name === 'wati') {
    const r = await watiSendSessionMessage(to, text);
    return { ...r, provider: 'wati' };
  }

  const toClean = normalizePhone(to);
  const body = String(text || '').trim().slice(0, 4096);
  if (!toClean || toClean.length < 10) {
    return { ok: false, error: 'Numéro invalide' };
  }
  if (!body) {
    return { ok: false, error: 'Message vide' };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toClean.replace(/^\+/, ''),
    type: 'text',
    text: { body },
  };

  try {
    let url;
    let headers;
    if (provider.name === '360dialog') {
      url = `${D360_BASE}/messages`;
      headers = { 'D360-API-KEY': provider.apiKey, 'Content-Type': 'application/json' };
    } else {
      url = `${META_GRAPH_BASE}/${provider.phoneNumberId}/messages`;
      headers = {
        Authorization: `Bearer ${provider.accessToken}`,
        'Content-Type': 'application/json',
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg =
        (data && data.error && data.error.message) ||
        (data && data.errors && data.errors[0] && data.errors[0].title) ||
        `HTTP ${res.status}`;
      return { ok: false, error: errMsg, details: data, provider: provider.name };
    }

    return {
      ok: true,
      messageId: data.messages && data.messages[0] && data.messages[0].id,
      provider: provider.name,
    };
  } catch (e) {
    return { ok: false, error: e.message || 'Erreur envoi', provider: provider.name };
  }
}

module.exports = {
  normalizePhone,
  getProvider,
  canSendWhatsApp,
  sendWhatsAppTextMessage,
};

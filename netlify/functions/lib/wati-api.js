/**
 * API Wati.io — envoi session message + config.
 * Doc : https://docs.wati.io/reference/post_api-v1-sendsessionmessage-whatsappnumber
 *
 * Netlify :
 *   WATI_API_BASE  = https://eu-api.wati.io/VOTRE_ID_COMPTE  (sans slash final)
 *   WATI_API_TOKEN = Bearer token (Connectors → API)
 *   WATI_CHANNEL_PHONE = 33756863630  (numéro Robin, optionnel)
 */

const DEFAULT_ROBIN_WA = '33756863630';

function watiCfg() {
  const token = (process.env.WATI_API_TOKEN || process.env.WATI_BEARER_TOKEN || '').trim();
  const base = (process.env.WATI_API_BASE || process.env.WATI_API_ENDPOINT || '').trim().replace(/\/$/, '');
  if (!token || !base) return null;
  const channel =
    (process.env.WATI_CHANNEL_PHONE || process.env.WHATSAPP_CONTACT_NUMBER || DEFAULT_ROBIN_WA).replace(
      /\D/g,
      ''
    );
  return { token, base, channel };
}

function normalizeWatiPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) return '33' + d.slice(1);
  if (d.length <= 9 && !d.startsWith('33') && !d.startsWith('32')) return '33' + d;
  return d;
}

/**
 * @returns {Promise<{ ok: boolean, messageId?: string, error?: string, details?: unknown }>}
 */
async function watiSendSessionMessage(to, text) {
  const cfg = watiCfg();
  if (!cfg) {
    return { ok: false, error: 'Wati non configuré (WATI_API_BASE + WATI_API_TOKEN)' };
  }

  const wa = normalizeWatiPhone(to);
  const body = String(text || '').trim().slice(0, 4096);
  if (!wa || wa.length < 10) return { ok: false, error: 'Numéro invalide' };
  if (!body) return { ok: false, error: 'Message vide' };

  const params = new URLSearchParams({
    messageText: body,
    channelPhoneNumber: cfg.channel,
  });

  const url = `${cfg.base}/api/v1/sendSessionMessage/${encodeURIComponent(wa)}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      const errMsg =
        (data && data.message) ||
        (data && data.error) ||
        (typeof data === 'string' ? data : null) ||
        `HTTP ${res.status}`;
      return { ok: false, error: String(errMsg).slice(0, 300), details: data };
    }

    const messageId =
      (data.message && data.message.whatsappMessageId) || data.whatsappMessageId || data.id;
    return { ok: true, messageId };
  } catch (e) {
    return { ok: false, error: e.message || 'Erreur Wati' };
  }
}

module.exports = {
  watiCfg,
  normalizeWatiPhone,
  watiSendSessionMessage,
  DEFAULT_ROBIN_WA,
};

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
  // Déjà international (11+ chiffres sans 0 initial)
  if (d.length >= 11 && !d.startsWith('0')) return d;
  // Mobile français : 10 chiffres, 06/07/09
  if (d.length === 10 && /^0[6-9]/.test(d)) return '33' + d.slice(1);
  // Mobile français sans 0 initial : 9 chiffres commençant par 6 ou 7
  if (d.length === 9 && /^[67]/.test(d)) return '33' + d;
  // Autre numéro avec 0 initial (africain local…) → supprimer le 0 seulement
  if (d.startsWith('0')) return d.slice(1);
  return d;
}

/**
 * Envoie l'indicateur "en train d'écrire..." au client.
 * Fire-and-forget — ne bloque pas l'envoi du message.
 */
async function watiSendTyping(to) {
  const cfg = watiCfg();
  if (!cfg) return;
  const wa = normalizeWatiPhone(to);
  if (!wa || wa.length < 10) return;
  const params = new URLSearchParams({ channelPhoneNumber: cfg.channel });
  const url = `${cfg.base}/api/v1/sendTyping/${encodeURIComponent(wa)}?${params.toString()}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    });
  } catch (_) {}
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

/** Config canal Wati *agences* (2ᵉ numéro / 2ᵉ canal). */
function watiAgencyCfg() {
  const token = (
    process.env.WATI_AGENCY_API_TOKEN ||
    process.env.WATI_API_TOKEN ||
    process.env.WATI_BEARER_TOKEN ||
    ''
  ).trim();
  const base = (
    process.env.WATI_AGENCY_API_BASE ||
    process.env.WATI_API_BASE ||
    process.env.WATI_API_ENDPOINT ||
    ''
  )
    .trim()
    .replace(/\/$/, '');
  const channel = (process.env.WATI_AGENCY_CHANNEL_PHONE || '').replace(/\D/g, '');
  if (!token || !base || !channel) return null;
  return { token, base, channel };
}

async function watiAgencySendSessionMessage(to, text) {
  const cfg = watiAgencyCfg();
  if (!cfg) {
    return {
      ok: false,
      error: 'Wati agence non configuré (WATI_AGENCY_CHANNEL_PHONE + token/base)',
    };
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
    return { ok: true, messageId, provider: 'wati-agency' };
  } catch (e) {
    return { ok: false, error: e.message || 'Erreur Wati agence' };
  }
}

/**
 * Envoie un message template WhatsApp (cold outreach — hors fenêtre 24h).
 * Le template doit être approuvé dans Wati avant utilisation.
 *
 * @param {string} to - Numéro destinataire
 * @param {string} templateName - Nom exact du template dans Wati (ex. "outreach_agence_partenaire")
 * @param {Array<{name:string,value:string}>} parameters - Variables du template
 * @param {'agency'|'robin'} [channel] - Canal Wati à utiliser (défaut: agency)
 */
async function watiAgencySendTemplate(to, templateName, parameters = [], channel = 'agency') {
  const cfg = channel === 'agency' ? watiAgencyCfg() : watiCfg();
  if (!cfg) {
    return { ok: false, error: `Wati ${channel} non configuré` };
  }

  const wa = normalizeWatiPhone(to);
  if (!wa || wa.length < 10) return { ok: false, error: 'Numéro invalide' };

  const url = `${cfg.base}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(wa)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_name: templateName,
        broadcast_name: `prospection_${Date.now()}`,
        parameters,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      const errMsg = data?.message || data?.error || `HTTP ${res.status}`;
      return { ok: false, error: String(errMsg).slice(0, 300), details: data };
    }
    return { ok: true, messageId: data?.message?.whatsappMessageId || data?.id };
  } catch (e) {
    return { ok: false, error: e.message || 'Erreur template Wati' };
  }
}

/**
 * Envoie un fichier (PDF, image…) via Wati session.
 * @param {string} to - Numéro destinataire
 * @param {Buffer} fileBuffer - Contenu du fichier
 * @param {string} fileName - Nom du fichier (ex: preuve-AF1234.pdf)
 * @param {string} caption - Légende affichée sous le document
 * @param {string} [mimeType] - défaut: application/pdf
 */
async function watiSendFile(to, fileBuffer, fileName, caption, mimeType = 'application/pdf') {
  const cfg = watiCfg();
  if (!cfg) return { ok: false, error: 'Wati non configuré (WATI_API_BASE + WATI_API_TOKEN)' };

  const wa = normalizeWatiPhone(to);
  if (!wa || wa.length < 10) return { ok: false, error: 'Numéro invalide' };

  const params = new URLSearchParams({ caption: caption || '' });
  const url = `${cfg.base}/api/v1/sendSessionFile/${encodeURIComponent(wa)}?${params}`;

  // FormData natif Node 18+
  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: mimeType }), fileName);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      const errMsg = data?.message || data?.error || `HTTP ${res.status}`;
      return { ok: false, error: String(errMsg).slice(0, 300), details: data };
    }
    const messageId = data?.message?.whatsappMessageId || data?.whatsappMessageId || data?.id;
    return { ok: true, messageId, provider: 'wati' };
  } catch (e) {
    return { ok: false, error: e.message || 'Erreur Wati sendFile' };
  }
}

module.exports = {
  watiCfg,
  watiAgencyCfg,
  normalizeWatiPhone,
  watiSendTyping,
  watiSendSessionMessage,
  watiAgencySendSessionMessage,
  watiAgencySendTemplate,
  watiSendFile,
  DEFAULT_ROBIN_WA,
};

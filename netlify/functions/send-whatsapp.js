/**
 * Envoi WhatsApp — délègue à lib/whatsapp-send-core (Wati → Meta → 360dialog).
 */

const { sendWhatsAppTextMessage, getProvider } = require('./lib/whatsapp-send-core');
const { isProduction, corsHeaders } = require('./lib/auth-config');
const { safeEqualString } = require('./lib/safe-compare');

function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '33' + digits.slice(1);
  if (!digits.startsWith('33') && digits.length <= 9) return '33' + digits;
  return digits;
}

exports.handler = async (event) => {
  const headers = corsHeaders();

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body JSON invalide' }) };
  }

  const webhookSecret = (process.env.WHATSAPP_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    if (isProduction()) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'WHATSAPP_WEBHOOK_SECRET requis en production (Netlify → Environment variables)',
        }),
      };
    }
  } else if (!safeEqualString(String(body.secret || ''), webhookSecret)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Secret invalide' }) };
  }

  const to = normalizePhone(body.to);
  const textBody = typeof body.text === 'string' ? body.text.trim() : '';

  if (!to || to.length < 10) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Numéro invalide (to)' }) };
  }

  if (!textBody) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Indiquez "text" (templates : utiliser Wati/Make)' }),
    };
  }

  const result = await sendWhatsAppTextMessage(to, textBody);
  if (!result.ok) {
    return {
      statusCode: result.error && result.error.includes('non configuré') ? 503 : 502,
      headers,
      body: JSON.stringify({
        error: result.error || 'Erreur WhatsApp',
        provider: getProvider().name,
        details: result.details,
      }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, messageId: result.messageId, provider: result.provider }),
  };
};

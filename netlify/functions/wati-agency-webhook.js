/**
 * Webhook Wati — robot WhatsApp *agences partenaires*
 * URL Wati (canal agence) : https://robindesairs.eu/api/wati-agency-webhook
 *
 * Netlify :
 *   WATI_AGENCY_CHANNEL_PHONE = numéro WhatsApp agences (ex. 33XXXXXXXXX)
 *   WATI_AGENCY_API_BASE / WATI_AGENCY_API_TOKEN (ou réutilise WATI_API_*)
 *   WATI_AGENCY_WEBHOOK_SECRET (optionnel)
 */

const { appendWaMessage, normalizeWaPhone, listWaMessages } = require('./lib/wa-convo-store');
const { normalizeWatiPhone, watiAgencyCfg, watiAgencySendSessionMessage } = require('./lib/wati-api');
const { handleAgencyWhatsAppMessage } = require('./lib/agency-wa-bot');
const { blobsAvailable } = require('./lib/agency-wa-store');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function verifySecret(body, headers) {
  const expected = (process.env.WATI_AGENCY_WEBHOOK_SECRET || process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (!expected) return true;
  const fromBody = body && body.secret;
  const fromHeader = headers['x-wati-secret'] || headers['X-Wati-Secret'];
  return fromBody === expected || fromHeader === expected;
}

function extractInbound(body) {
  const items = [];
  const push = (item) => {
    if (!item || typeof item !== 'object') return;
    if (item.owner === true || item.fromMe === true || item.eventType === 'sentMessage') return;
    const waId = item.waId || item.whatsappNumber || item.from;
    const text =
      item.text ||
      (item.finalText && String(item.finalText)) ||
      (item.type === 'image' ? '[image]' : item.type === 'document' ? '[document]' : '');
    if (!waId || !text || text.startsWith('[')) return;
    items.push({
      phone: normalizeWaPhone(normalizeWatiPhone(waId)),
      text: String(text).trim(),
      channel: String(item.channelPhoneNumber || item.channelNumber || '').replace(/\D/g, ''),
    });
  };

  if (Array.isArray(body)) {
    body.forEach(push);
    return items;
  }
  push(body);
  if (Array.isArray(body.messages)) body.messages.forEach(push);
  if (body.data && typeof body.data === 'object') push(body.data);

  return items;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST uniquement' }) };
  }

  if (!watiAgencyCfg()) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({
        error: 'Wati agence non configuré (WATI_AGENCY_CHANNEL_PHONE + API)',
      }),
    };
  }

  if (!blobsAvailable()) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Netlify Blobs requis pour le robot agence' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  if (!verifySecret(body, event.headers || {})) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Secret invalide' }) };
  }

  const agencyChannel = (process.env.WATI_AGENCY_CHANNEL_PHONE || '').replace(/\D/g, '');
  const inbound = extractInbound(body);
  let replies = 0;

  for (const msg of inbound) {
    if (!msg.phone || !msg.text) continue;
    if (agencyChannel && msg.channel && msg.channel !== agencyChannel) continue;

    try {
      await appendWaMessage(event, msg.phone, {
        role: 'user',
        text: msg.text,
        source: 'wati-agency',
      });
    } catch (e) {
      console.warn('wati-agency-webhook: log in', e.message);
    }

    // Vérifier la fenêtre 24h avant d'appeler le bot
    const convoInfo = await listWaMessages(event, msg.phone).catch(() => ({ canSendFreeText: true }));
    if (!convoInfo.canSendFreeText) {
      console.warn('wati-agency-webhook: fenêtre 24h expirée pour', msg.phone, '— message ignoré, utiliser un template');
      continue;
    }

    const outs = await handleAgencyWhatsAppMessage(event, msg.phone, msg.text);
    for (const outText of outs) {
      const sent = await watiAgencySendSessionMessage(msg.phone, outText);
      if (sent.ok) {
        replies += 1;
        try {
          await appendWaMessage(event, msg.phone, {
            role: 'assistant',
            text: outText,
            source: 'agency-bot',
          });
        } catch (_) {}
      } else {
        console.error('wati-agency-webhook: send failed', sent.error);
      }
    }
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, processed: inbound.length, replies }),
  };
};

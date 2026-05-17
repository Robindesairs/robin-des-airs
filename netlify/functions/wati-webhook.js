/**
 * Webhook Wati → historique CRM (Netlify Blobs).
 * Configurer dans Wati : Connectors → Webhooks → URL :
 *   https://robindesairs.eu/api/wati-webhook
 * Événement : Messages received (+ optionnel messages sent).
 *
 * Optionnel : WATI_WEBHOOK_SECRET dans le body { "secret": "…" } ou header X-Wati-Secret
 */

const { appendWaMessage, normalizeWaPhone } = require('./lib/wa-convo-store');
const { normalizeWatiPhone } = require('./lib/wati-api');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function verifyWatiSecret(body, headers) {
  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (!expected) return true;
  const fromBody = body && body.secret;
  const fromHeader = headers['x-wati-secret'] || headers['X-Wati-Secret'];
  return fromBody === expected || fromHeader === expected;
}

function extractMessages(payload) {
  const list = [];
  if (!payload || typeof payload !== 'object') return list;

  const push = (item) => {
    if (!item || typeof item !== 'object') return;
    const waId = item.waId || item.whatsappNumber || item.from;
    const text =
      item.text ||
      (item.finalText && String(item.finalText)) ||
      (item.type && item.type !== 'text' ? `[${item.type}]` : '');
    if (!waId || !text) return;
    const phone = normalizeWaPhone(normalizeWatiPhone(waId));
    const isOutbound = item.owner === true || item.eventType === 'sentMessage' || item.fromMe === true;
    list.push({
      phone,
      role: isOutbound ? 'assistant' : 'user',
      text: String(text).slice(0, 4096),
      source: isOutbound ? (item.operatorName ? 'wati-agent' : 'wati') : 'wati',
      by: item.operatorName || null,
    });
  };

  if (Array.isArray(payload)) {
    payload.forEach(push);
    return list;
  }

  push(payload);

  if (Array.isArray(payload.messages)) payload.messages.forEach(push);
  if (payload.data && typeof payload.data === 'object') push(payload.data);

  return list;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST uniquement' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  if (!verifyWatiSecret(body, event.headers || {})) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Secret invalide' }) };
  }

  const items = extractMessages(body);
  let stored = 0;

  for (const item of items) {
    if (!item.phone) continue;
    try {
      await appendWaMessage(event, item.phone, {
        role: item.role,
        text: item.text,
        source: item.source,
        by: item.by,
      });
      stored += 1;
    } catch (e) {
      console.error('wati-webhook: store failed', e.message);
    }
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, stored, received: items.length }),
  };
};

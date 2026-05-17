/**
 * wa-messages — Robin des Airs
 * GET /api/wa-messages?phone=33612345678
 * Historique WhatsApp (Netlify Blobs) — auth CRM.
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { listWaMessages, normalizeWaPhone } = require('./lib/wa-convo-store');
const { canSendWhatsApp } = require('./lib/whatsapp-send-core');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-CRM-Code',
  'Access-Control-Allow-Credentials': 'true',
  'Cache-Control': 'no-store',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: auth.error || 'Non autorisé' }) };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'GET uniquement' }) };
  }

  const rawPhone = event.queryStringParameters?.phone || '';
  if (!rawPhone) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Paramètre phone manquant' }) };
  }

  try {
    const info = await listWaMessages(event, rawPhone);
    if (!info.blobsAvailable) {
      return {
        statusCode: 503,
        headers: HEADERS,
        body: JSON.stringify({
          error: info.error,
          phone: normalizeWaPhone(rawPhone),
          messages: [],
          canSend: false,
          whatsappConfigured: canSendWhatsApp(),
        }),
      };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        phone: info.phone,
        count: info.count,
        messages: info.messages.map((m, i) => ({
          index: i,
          role: m.role || 'user',
          text: m.text || '',
          timestamp: m.timestamp || null,
          source: m.source || null,
          by: m.by || null,
        })),
        lastUserAt: info.lastUserAt,
        within24h: info.within24h,
        noHistoryYet: info.noHistoryYet,
        canSend: info.canSendFreeText && canSendWhatsApp(),
        whatsappConfigured: canSendWhatsApp(),
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: e.message, messages: [] }),
    };
  }
};

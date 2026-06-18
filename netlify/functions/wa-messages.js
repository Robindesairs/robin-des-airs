/**
 * wa-messages — Robin des Airs
 * GET /api/wa-messages?phone=33612345678
 * Historique WhatsApp (Netlify Blobs) — auth CRM.
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { appendWaMessage, listWaMessages, normalizeWaPhone } = require('./lib/wa-convo-store');
const { canSendWhatsApp } = require('./lib/whatsapp-send-core');

const { corsHeaders } = require('./lib/auth-config');

const HEADERS = {
  ...corsHeaders(),
  'Cache-Control': 'no-store',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  // POST = append d'un message depuis le bot Railway (secret partagé) — AVANT l'auth CRM
  // (le bot n'a pas de session CRM). Sert à mirrorer le SORTANT du bot dans l'historique.
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) }; }
    const secret = String(body.secret || event.headers['x-bot-secret'] || '').trim();
    const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
    if (!expected || secret !== expected) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'secret invalide' }) };
    }
    if (!body.phone || !body.text) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'phone et text requis' }) };
    }
    const r = await appendWaMessage(event, body.phone, {
      role: body.role === 'user' ? 'user' : 'assistant',
      text: body.text,
      source: body.source || 'bot',
      by: body.by || null,
    });
    return { statusCode: r && r.ok ? 200 : 500, headers: HEADERS, body: JSON.stringify(r || { ok: false }) };
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

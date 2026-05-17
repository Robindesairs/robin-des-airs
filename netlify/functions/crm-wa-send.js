/**
 * Envoi WhatsApp depuis le CRM (agent humain).
 * POST /api/crm-wa-send  { "phone": "336…", "text": "…", "agent": "Marie", "dossierRef": "RDA-…" }
 * Auth : session CRM ou ?code=
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { appendWaMessage, normalizeWaPhone, listWaMessages } = require('./lib/wa-convo-store');
const { sendWhatsAppTextMessage, canSendWhatsApp } = require('./lib/whatsapp-send-core');

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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST uniquement' }) };
  }

  if (!canSendWhatsApp()) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({
        error: 'WhatsApp non configuré sur Netlify (WATI_API_BASE + WATI_API_TOKEN)',
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const phone = normalizeWaPhone(body.phone || body.to || '');
  const text = String(body.text || '').trim();
  const agent = String(body.agent || body.by || 'Agent CRM').trim().slice(0, 80);
  const dossierRef = String(body.dossierRef || body.ref || '').trim();

  if (!phone) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'phone obligatoire' }) };
  }
  if (!text) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'text obligatoire' }) };
  }

  const convoInfo = await listWaMessages(event, phone);
  if (!convoInfo.blobsAvailable) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({ error: convoInfo.error || 'Netlify Blobs indisponible' }),
    };
  }

  if (!convoInfo.canSendFreeText && convoInfo.count > 0) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({
        error:
          'Fenêtre 24 h expirée : le client doit avoir écrit récemment, ou utilisez un modèle WhatsApp approuvé (Wati / Make).',
        within24h: false,
        lastUserAt: convoInfo.lastUserAt,
      }),
    };
  }

  const sent = await sendWhatsAppTextMessage(phone, text);
  if (!sent.ok) {
    return {
      statusCode: 502,
      headers: HEADERS,
      body: JSON.stringify({ error: sent.error || 'Échec envoi', details: sent.details }),
    };
  }

  const prefix = dossierRef ? `[${dossierRef}] ` : '';
  await appendWaMessage(event, phone, {
    role: 'assistant',
    text: prefix + text,
    source: 'crm',
    by: agent,
  });

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      messageId: sent.messageId,
      phone,
      within24h: true,
    }),
  };
};

/**
 * Envoi WhatsApp depuis le CRM (agent humain).
 * POST /api/crm-wa-send  { "phone": "336…", "text": "…", "agent": "Marie", "dossierRef": "RDA-…" }
 * Auth : session CRM ou ?code=
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { appendWaMessage, normalizeWaPhone, listWaMessages } = require('./lib/wa-convo-store');
const { sendWhatsAppTextMessage, canSendWhatsApp } = require('./lib/whatsapp-send-core');

const { corsHeaders } = require('./lib/auth-config');

const HEADERS = {
  ...corsHeaders(),
  'Cache-Control': 'no-store',
};

/**
 * Fenêtre 24 h vue par le bot Railway (source PRIMAIRE, identique à l'affichage
 * de la messagerie). Sans ça, le blocage se base sur les Netlify Blobs qui, en
 * prod, ne reçoivent pas l'entrant (le webhook WhatsApp arrive sur le bot) →
 * l'écran affiche « fenêtre ouverte » mais l'envoi est refusé. On aligne les deux.
 * @returns {Promise<{within24h:boolean, lastUserAt:string|null}|null>}
 */
async function botWindow(phone) {
  const base = (process.env.RAILWAY_BOT_URL || 'https://robin-bot-v8-production.up.railway.app').replace(/\/$/, '');
  const secret = (process.env.WATI_WEBHOOK_SECRET || process.env.MANDAT_SIGNED_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
  if (!secret) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(`${base}/api/conversation?phone=${encodeURIComponent(phone)}`, {
      headers: { 'x-secret': secret, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d || d.ok !== true) return null;
    // within24h fourni par le bot ; sinon on le recalcule depuis le dernier message client.
    let within24h = d.within24h === true;
    let lastUserAt = d.lastUserAt || null;
    if (d.within24h == null && Array.isArray(d.messages)) {
      for (let i = d.messages.length - 1; i >= 0; i--) {
        if (d.messages[i].role === 'user' && d.messages[i].at) {
          const ts = Date.parse(d.messages[i].at);
          if (ts) { within24h = Date.now() - ts < 24 * 60 * 60 * 1000; lastUserAt = d.messages[i].at; }
          break;
        }
      }
    }
    return { within24h, lastUserAt };
  } catch (_) {
    clearTimeout(t);
    return null;
  }
}

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

  // Décision fenêtre 24 h : on aligne le blocage sur la MÊME source que l'affichage.
  // Les Blobs peuvent être « en retard » sur l'entrant (webhook reçu par le bot en prod) ;
  // on interroge donc le bot avant de refuser. On ne bloque que si les DEUX sources sont fermées.
  let canSend = convoInfo.canSendFreeText;
  let lastUserAt = convoInfo.lastUserAt;
  if (!canSend && convoInfo.count > 0) {
    const bot = await botWindow(phone);
    if (bot && bot.within24h) {
      canSend = true;
      lastUserAt = bot.lastUserAt || lastUserAt;
    }
  }

  if (!canSend && convoInfo.count > 0) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({
        error:
          'Fenêtre 24 h expirée : le client doit avoir écrit récemment, ou utilisez un modèle WhatsApp approuvé (Wati / Make).',
        within24h: false,
        lastUserAt,
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

  // Best-effort : enregistre la réponse dans le fil du bot (source primaire de la messagerie interne).
  try {
    const botBase = (process.env.RAILWAY_BOT_URL || 'https://robin-bot-v8-production.up.railway.app').replace(/\/$/, '');
    const botSecret = (process.env.WATI_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
    if (botSecret) {
      await fetch(`${botBase}/api/record-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-secret': botSecret },
        body: JSON.stringify({ phone, text: prefix + text }),
      }).catch(() => {});
    }
  } catch (_) { /* non bloquant */ }

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

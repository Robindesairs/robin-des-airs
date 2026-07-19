'use strict';
const crypto = require('crypto');
// ─────────────────────────────────────────────────────────────────────────────
// Adaptateur Twilio WhatsApp — MÊME interface que la plomberie WATI de server.js.
//
// Activé par la variable d'env WA_PROVIDER=twilio (défaut = wati, prod inchangée).
// Aucune dépendance externe : on utilise fetch natif (Node 18+), comme le reste du bot.
//
// Sandbox (test, sans SASU) :
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM='whatsapp:+14155238886'
// Prod (après immatriculation + vérification Business Meta) :
//   TWILIO_WHATSAPP_FROM='whatsapp:+33756863630', TWILIO_TEMPLATE_MAP={"relance_j1":"HXxx…"}
// ─────────────────────────────────────────────────────────────────────────────

function twilioCfg() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  let from = (process.env.TWILIO_WHATSAPP_FROM || '').trim();
  if (!accountSid || !authToken || !from) return null;
  if (!/^whatsapp:/i.test(from)) from = 'whatsapp:' + from.replace(/^whatsapp:/i, '');
  return { provider: 'twilio', accountSid, authToken, from };
}

function basicAuth(cfg) {
  return 'Basic ' + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64');
}

// Normalise vers l'adresse Twilio WhatsApp « whatsapp:+E164 ».
function toWa(phone) {
  const d = String(phone || '').replace(/^whatsapp:/i, '').replace(/[^\d+]/g, '');
  const e164 = d.startsWith('+') ? d : '+' + d;
  return 'whatsapp:' + e164;
}

const MSG_URL = (sid) => `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

// Envoi texte (équivalent de send()/sendSessionMessage WATI).
async function twilioSendText(phone, text, cfg) {
  if (!cfg) return { ok: false };
  const params = new URLSearchParams({ From: cfg.from, To: toWa(phone), Body: String(text || '').slice(0, 1600) });
  try {
    const res = await fetch(MSG_URL(cfg.accountSid), {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: basicAuth(cfg), 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && !data.error_code && !data.code;
    if (!ok) console.error('twilio send REJETÉ', res.status, JSON.stringify(data).slice(0, 200));
    return { ok, data };
  } catch (e) { console.error('twilioSendText', e.message); return { ok: false }; }
}

// ─── Indicateur « en train d'écrire » (3 points) ───────────────────────────────
// Affiche les 3 points chez le CLIENT pendant que le bot prépare sa réponse, et marque
// au passage son message comme lu (double coche bleue). Utile surtout sur les temps longs :
// OCR d'un e-billet, extraction PDF, appel gpt-4o — le client voit que ça travaille.
//
// L'indicateur s'éteint TOUT SEUL à la livraison de notre réponse, ou après 25 s.
// Il n'y a donc rien à « arrêter » : si le traitement dépasse 25 s, les points disparaissent
// avant la réponse (on ne peut pas les prolonger, l'API ne le permet pas).
//
// ⚠️ API en Public Beta chez Twilio (hors SLA, peut changer). Traitée comme du confort pur :
// jamais attendue, jamais bloquante, toute erreur est avalée. Kill-switch : TWILIO_TYPING=0.
const TYPING_URL = 'https://messaging.twilio.com/v3/Indicators/Typing.json';

async function twilioSendTyping(messageId, cfg) {
  if (!cfg || !messageId) return { ok: false };
  if ((process.env.TWILIO_TYPING || '').trim() === '0') return { ok: false, off: true };
  if (!/^(SM|MM)[0-9a-f]{32}$/i.test(String(messageId))) return { ok: false }; // SID entrant seulement
  try {
    const res = await fetch(TYPING_URL, {
      method: 'POST', signal: AbortSignal.timeout(3000), // court : c'est du confort, pas un envoi
      headers: { Authorization: basicAuth(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'WHATSAPP', messageId: String(messageId) }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.warn('twilio typing', res.status, t.slice(0, 160)); // warn, pas error : non bloquant
      return { ok: false };
    }
    return { ok: true };
  } catch (e) { console.warn('twilioSendTyping', e.message); return { ok: false }; }
}

// ─── Vrais boutons WhatsApp (Content API twilio/quick-reply) ──────────────────
// Utilisables EN SESSION (fenêtre 24h) sans validation Meta : on crée le Content Template
// via un simple POST (jamais soumis à validation), puis on l'envoie par ContentSid.
// Cache en mémoire par (body+libellés) pour ne pas recréer un template identique à chaque envoi
// (beaucoup de prompts — langue, consentement, durée… — sont strictement identiques d'un client à l'autre).
const CONTENT_URL = 'https://content.twilio.com/v1/Content';
const _contentCache = new Map(); // hash(body+boutons) → ContentSid

function _hashPrompt(body, buttons) {
  const raw = JSON.stringify({ body, buttons: buttons.map(b => [b.title, b.id || '']) });
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
}

// Crée (ou réutilise) un Content Template quick-reply et renvoie son ContentSid, ou null si échec
// (l'appelant doit alors se rabattre sur le texte numéroté).
async function getOrCreateQuickReply(body, buttons, cfg) {
  const key = _hashPrompt(body, buttons);
  if (_contentCache.has(key)) return _contentCache.get(key);
  const payload = {
    friendly_name: 'rda_qr_' + key,
    language: 'en',
    variables: {},
    types: {
      'twilio/quick-reply': {
        body: String(body || '👇').slice(0, 1024),
        actions: buttons.slice(0, 3).map((b, i) => ({ title: String(b.title || '').slice(0, 20), id: b.id || ('opt' + i) })),
      },
    },
  };
  try {
    const res = await fetch(CONTENT_URL, {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: basicAuth(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.sid) { console.error('twilio content create REJETÉ', res.status, JSON.stringify(data).slice(0, 200)); return null; }
    _contentCache.set(key, data.sid);
    return data.sid;
  } catch (e) { console.error('getOrCreateQuickReply', e.message); return null; }
}

// Envoie de vrais boutons quick-reply. buttons = [{title, id?}]. Retourne { ok } ; en cas d'échec
// (création ou envoi), l'appelant (sendButtons côté server.js) se rabat sur le texte numéroté.
async function twilioSendQuickReply(phone, body, buttons, cfg) {
  if (!cfg || !buttons || !buttons.length) return { ok: false };
  const contentSid = await getOrCreateQuickReply(body, buttons, cfg);
  if (!contentSid) return { ok: false };
  const params = new URLSearchParams({ From: cfg.from, To: toWa(phone), ContentSid: contentSid, ContentVariables: '{}' });
  try {
    const res = await fetch(MSG_URL(cfg.accountSid), {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: basicAuth(cfg), 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && !data.error_code && !data.code;
    if (!ok) console.error('twilio quick-reply REJETÉ', res.status, JSON.stringify(data).slice(0, 200));
    return { ok, data };
  } catch (e) { console.error('twilioSendQuickReply', e.message); return { ok: false }; }
}

// ─── Vraies listes WhatsApp (Content API twilio/list-picker) ──────────────────
// Même principe que les quick-reply, mais jusqu'à 10 options avec description.
// Comme les quick-reply : utilisable EN SESSION sans validation Meta.
function _hashList(body, buttonLabel, items) {
  const raw = JSON.stringify({ body, buttonLabel, items: items.map(i => [i.title, i.id || '', i.description || '']) });
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
}

async function getOrCreateListPicker(body, buttonLabel, items, cfg) {
  const key = _hashList(body, buttonLabel, items);
  if (_contentCache.has(key)) return _contentCache.get(key);
  const payload = {
    friendly_name: 'rda_lp_' + key,
    language: 'en',
    variables: {},
    types: {
      'twilio/list-picker': {
        body: String(body || '👇').slice(0, 1024),
        button: String(buttonLabel || 'Choisir').slice(0, 20),
        items: items.slice(0, 10).map((it, i) => ({
          item: String(it.title || '').slice(0, 24),
          id: it.id || ('item' + i),
          description: String(it.description || ' ').slice(0, 72), // requis par l'API, jamais vide
        })),
      },
    },
  };
  try {
    const res = await fetch(CONTENT_URL, {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: basicAuth(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.sid) { console.error('twilio list-picker create REJETÉ', res.status, JSON.stringify(data).slice(0, 200)); return null; }
    _contentCache.set(key, data.sid);
    return data.sid;
  } catch (e) { console.error('getOrCreateListPicker', e.message); return null; }
}

// Envoie une vraie liste tactile. items = [{title, id?, description?}] (max 10).
async function twilioSendListPicker(phone, body, buttonLabel, items, cfg) {
  if (!cfg || !items || !items.length) return { ok: false };
  const contentSid = await getOrCreateListPicker(body, buttonLabel, items, cfg);
  if (!contentSid) return { ok: false };
  const params = new URLSearchParams({ From: cfg.from, To: toWa(phone), ContentSid: contentSid, ContentVariables: '{}' });
  try {
    const res = await fetch(MSG_URL(cfg.accountSid), {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: basicAuth(cfg), 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && !data.error_code && !data.code;
    if (!ok) console.error('twilio list-picker send REJETÉ', res.status, JSON.stringify(data).slice(0, 200));
    return { ok, data };
  } catch (e) { console.error('twilioSendListPicker', e.message); return { ok: false }; }
}

// Template hors fenêtre 24 h. En Twilio on envoie un Content Template par ContentSid + variables.
// mapping WATI template_name → Twilio ContentSid via TWILIO_TEMPLATE_MAP (JSON en env).
// parameters WATI [{name:'1',value:'x'}] → Twilio ContentVariables {"1":"x"}.
async function twilioSendTemplate(phone, templateName, parameters, cfg) {
  if (!cfg || !templateName) return { ok: false };
  let map = {}; try { map = JSON.parse(process.env.TWILIO_TEMPLATE_MAP || '{}'); } catch (_) {}
  const contentSid = map[templateName];
  if (!contentSid) { console.error('twilio template non mappé (TWILIO_TEMPLATE_MAP manque', templateName, ')'); return { ok: false, unmapped: true }; }
  const vars = {};
  (parameters || []).forEach(p => { if (p && p.name != null) vars[String(p.name)] = String(p.value == null ? '' : p.value); });
  const params = new URLSearchParams({ From: cfg.from, To: toWa(phone), ContentSid: contentSid, ContentVariables: JSON.stringify(vars) });
  try {
    const res = await fetch(MSG_URL(cfg.accountSid), {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: basicAuth(cfg), 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && !data.error_code && !data.code;
    if (!ok) console.error('twilio template REJETÉ', res.status, JSON.stringify(data).slice(0, 200), '→', templateName);
    return { ok, data };
  } catch (e) { console.error('twilioSendTemplate', e.message); return { ok: false }; }
}

// En-têtes pour télécharger un média ENTRANT Twilio (api.twilio.com/…/Media/…) :
// Basic auth (sid:token). Retourne null pour tout hôte non Twilio (garde anti-SSRF).
function twilioMediaHeaders(rawUrl, cfg) {
  let u; try { u = new URL(String(rawUrl || '')); } catch (_) { return null; }
  if (u.protocol !== 'https:') return null;
  const host = (u.hostname || '').toLowerCase();
  const trusted = host === 'api.twilio.com' || host.endsWith('.twilio.com') || host.endsWith('.twiliocdn.com');
  if (!trusted) return null;
  return { headers: cfg ? { Authorization: basicAuth(cfg) } : {} };
}

// Webhook entrant Twilio (form-encoded) → MÊME forme d'item que extractInbound() de server.js :
// { phone, text, mediaUrl, dedupId, hasId, interactive, replyId, referral }
function parseTwilioInbound(body, normalizeWaPhone) {
  const b = body || {};
  const rawFrom = String(b.From || '').replace(/^whatsapp:/i, '');
  if (!rawFrom) return [];
  const phone = normalizeWaPhone ? normalizeWaPhone(rawFrom) : rawFrom.replace(/[^\d]/g, '');
  const num = parseInt(b.NumMedia || '0', 10) || 0;
  const mediaUrl = num > 0 ? (b.MediaUrl0 || null) : null;
  const mime = String(b.MediaContentType0 || '').toLowerCase();
  // Réponse à un quick-reply : Twilio renvoie ButtonPayload / ButtonText (ou ListId/ListTitle).
  const replyId = b.ButtonPayload || b.ListId || '';
  const replyText = b.ButtonText || b.ListTitle || '';
  let text = replyText || b.Body || '';
  if (!String(text).trim() && mediaUrl) text = /pdf|document|officedocument|msword/.test(mime) ? '[document]' : '[image]';
  if (!String(text || '').trim() && !mediaUrl) return [];
  const realId = b.MessageSid || b.SmsMessageSid || null;
  return [{
    phone,
    text: String(text || '').slice(0, 4096),
    mediaUrl,
    dedupId: realId || `${phone}|${String(text).trim()}`,
    hasId: !!realId,
    messageId: realId, // SID du message entrant : requis pour l'indicateur « en train d'écrire »

    interactive: !!replyId,
    replyId: replyId || '',
    referral: null, // la Sandbox ne transmet pas le referral pub ; en prod on le mappera si présent
  }];
}

// ─── Validation de la signature X-Twilio-Signature (défense en profondeur) ──────
// Algo Twilio (webhook form-encoded) : HMAC-SHA1(authToken) sur  URL_exacte + concat(clé+valeur, clés triées) → base64.
// L'URL doit être EXACTEMENT celle configurée dans la console Twilio, query « ?s=… » comprise.
// Comparaison à temps constant. Renvoie false sur toute anomalie (fail-closed côté appelant).
function validateTwilioSignature(authToken, url, params, signature) {
  try {
    if (!authToken || !signature || !url) return false;
    let data = String(url);
    const keys = Object.keys(params || {}).sort();
    for (const k of keys) data += k + (params[k] == null ? '' : params[k]);
    const digest = crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
    const a = Buffer.from(digest);
    const b = Buffer.from(String(signature));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_) { return false; }
}

module.exports = { twilioCfg, twilioSendText, twilioSendTemplate, twilioSendQuickReply, twilioSendListPicker, twilioSendTyping, twilioMediaHeaders, parseTwilioInbound, toWa, validateTwilioSignature };

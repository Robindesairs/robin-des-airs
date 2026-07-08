'use strict';
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

// Boutons/listes → repli texte numéroté. La Sandbox ne rend PAS les boutons interactifs ;
// server.js route déjà les boutons vers son textFallback() quand provider==='twilio'.
// (En prod, on passera par un Content Template quick-reply via twilioSendTemplate.)

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
    interactive: !!replyId,
    replyId: replyId || '',
    referral: null, // la Sandbox ne transmet pas le referral pub ; en prod on le mappera si présent
  }];
}

module.exports = { twilioCfg, twilioSendText, twilioSendTemplate, twilioMediaHeaders, parseTwilioInbound, toWa };

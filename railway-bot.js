'use strict';
/**
 * Robin des Airs — Bot WhatsApp v8 — Serveur Railway
 * Express persistant : état en RAM (Map), ZÉRO Blobs, ZÉRO race condition.
 * Port du wati-webhook-v8.js Netlify → serveur long-running.
 *
 * Variables d'env : WATI_API_TOKEN, WATI_API_BASE, WATI_CHANNEL_PHONE,
 *                   OPENAI_API_KEY, WATI_WEBHOOK_SECRET, MAKE_WEBHOOK_NEW_DOSSIER,
 *                   PORT (Railway l'injecte automatiquement)
 */

const express = require('express');

// ─── Libs partagées avec la version Netlify ────────────────────────────────────
const { normalizeWaPhone }      = require('./netlify/functions/lib/wa-convo-store');
const { normalizeWatiPhone, watiCfg } = require('./netlify/functions/lib/wati-api');

let notifyOwnerWhatsApp = async () => {};
try { ({ notifyOwnerWhatsApp } = require('./netlify/functions/lib/owner-notify')); } catch (_) {}

// ─── IN-MEMORY STATE — remplace Netlify Blobs ─────────────────────────────────
// Node.js = single-threaded → Map.get/set synchrone = AUCUNE race condition.
// Si Railway redémarre (deploy) → sessions actives repartent de zéro (reset auto).
const STATE = new Map();   // phone_digits → state object
const DEDUP  = new Map();  // dedupKey     → timestamp ms

function cleanPhone(phone) { return String(phone || '').replace(/\D/g, ''); }

function getState(phone) {
  return Promise.resolve(STATE.get(cleanPhone(phone)) || { step: 'accueil' });
}
function setState(phone, s) {
  STATE.set(cleanPhone(phone), { ...s, updatedAt: new Date().toISOString() });
  return Promise.resolve();
}
function clearState(phone) {
  STATE.delete(cleanPhone(phone));
  return Promise.resolve();
}

// Dedup entièrement synchrone en mémoire — zéro latence, zéro race condition
const MEM_SEEN = new Map();
function memSeen(key) {
  const now = Date.now();
  if (MEM_SEEN.has(key) && (now - MEM_SEEN.get(key)) < 60000) return true;
  MEM_SEEN.set(key, now); return false;
}
function isDuplicateMessage(id, hasId, windowMs) {
  if (!id) return Promise.resolve(false);
  const k = String(id).slice(0, 200);
  const now = Date.now();
  const w = windowMs || (hasId ? 600000 : 60000);
  if (DEDUP.has(k) && (now - DEDUP.get(k)) < w) return Promise.resolve(true);
  DEDUP.set(k, now);
  if (DEDUP.size > 50000) { for (const [key, ts] of DEDUP) { if (now - ts > 600000) DEDUP.delete(key); } }
  return Promise.resolve(false);
}

// Debug in-memory (accessible via ?debug=inbound)
const DEBUG_INBOUND = [];
let   DEBUG_INTERACTIVE = null;
function saveInboundDebug(rawBody, items) {
  DEBUG_INBOUND.unshift({ ts: new Date().toISOString(), raw: String(rawBody).slice(0, 1500), extracted: items.map(it => ({ ph: it.phone, txt: it.text, dedupId: it.dedupId })) });
  if (DEBUG_INBOUND.length > 20) DEBUG_INBOUND.length = 20;
  return Promise.resolve();
}
function readInboundDebug()   { return Promise.resolve(DEBUG_INBOUND); }
function saveInteractiveDebug(obj) { DEBUG_INTERACTIVE = { ...obj, ts: new Date().toISOString() }; return Promise.resolve(); }
function readInteractiveDebug()    { return Promise.resolve(DEBUG_INTERACTIVE); }

// ─── Utilitaires identiques à v8 ──────────────────────────────────────────────
function clip(s, n) { s = String(s == null ? '' : s); return s.length <= n ? s : s.slice(0, n); }
function hashStr(s) { let h = 0; for (const c of String(s || 'x')) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
function montantTotal(pax = 1) { return 600 * pax; }
function montantNet(pax = 1)   { return Math.round(600 * pax * 0.75); }
function genRef() { const d = new Date(); return `RDA-${d.toISOString().slice(0,10).replace(/-/g,'')}-${hashStr(String(d.getTime())).toString(36).slice(-4).toUpperCase()}`; }
function normInput(raw, options) { const t = (raw || '').trim().toLowerCase(); if (/^\d+$/.test(t)) return t; const i = options.findIndex(o => t.includes(o.toLowerCase())); return i >= 0 ? String(i + 1) : t; }
function listRowIdx(id) { if (!id) return -1; const m = /^\d+-(\d+)$/.exec(id); return m ? parseInt(m[1]) : -1; }

const STAT_VARIANTS = [
  'Seulement 5% des passagers réclament leur indemnité — soyez dans les 5%.',
  'Les compagnies gardent 95% des indemnités dues... faute de réclamation.',
  "Un vol sur 4 au départ d'Afrique arrive en retard en Europe.",
  'Des familles indemnisées chaque semaine. Votre dossier est le suivant.',
  "600€ par passager. C'est la loi. La compagnie le sait. Vous aussi maintenant.",
  "Chaque année, des millions d'euros d'indemnités ne sont jamais réclamés.",
];
function pickStat(seed) { return STAT_VARIANTS[Math.abs(hashStr(seed)) % STAT_VARIANTS.length]; }

const PROGRESS = {
  accueil: 0, langue: 0, route: 1, incident: 2, duree: 2,
  nb_pax: 3, nb_pax_exact: 3, type_vol: 4, motivation: 4,
  scan: 5, scan_confirm: 5, m_vol: 5, m_date: 5, m_route: 5,
  names: 5, names_confirm: 5, names_fix_which: 5, names_fix_one: 5,
  vd_vol: 6, vd_date: 6, annee: 6, mineurs: 6, mineurs_which: 6,
  correction: 6, fix_vol: 6, fix_date: 6, fix_nom: 6, fix_route: 6,
  recap: 7, documents: 7, doc_pass: 7, doc_pass_confirm: 7, doc_mandant: 7,
  doc_name: 7, doc_dob: 7, doc_boarding: 7, doc_eticket: 7, doc_cert: 7, rgpd: 7, done: 8,
};
function bar(step) { const n = PROGRESS[step] ?? 0; return '🟢'.repeat(n) + '⚪'.repeat(8 - n); }

const LANGS = {
  'français': { code: 'fr', flag: '🇫🇷', label: 'Français', africaine: false },
  'english':  { code: 'en', flag: '🇬🇧', label: 'English',  africaine: false },
  'wolof':    { code: 'wo', flag: '🇸🇳', label: 'Wolof',    africaine: true, natif: 'Dëkk sa Wolof, bëgg na la wax — expert bi dafa xam Wolof, dafa di la woote. 🤝' },
  'mandinka': { code: 'mnk',flag: '🇬🇲', label: 'Mandinka', africaine: true, natif: 'I be Mandinka kan na — expert do bena i ye Mandinka fo. 🤝' },
  'twi':      { code: 'twi', flag: '🇬🇭', label: 'Twi',     africaine: true, natif: 'Yɛka Twi — ɔbenfoɔ bi a ɔka Twi bɛfrɛ wo. 🤝' },
  'yoruba':   { code: 'yo',  flag: '🇳🇬', label: 'Yoruba',  africaine: true, natif: 'A nsọ Yoruba — amoye kan tó ń sọ Yoruba yóò pè ọ. 🤝' },
  'peul':     { code: 'ff',  flag: '🇬🇳', label: 'Peul / Fulfulde', africaine: true, natif: 'Eɗen haala Pulaar — annduɗo haalata Pulaar maa noddu maa. 🤝' },
};
const FLAG_LANG = { '🇫🇷':'fr','🇬🇧':'en','🇸🇳':'wo','🇬🇲':'mnk','🇬🇭':'twi','🇳🇬':'yo','🇬🇳':'ff' };
function matchLang(input) {
  const raw = input || '', t = raw.toLowerCase();
  for (const [flag, code] of Object.entries(FLAG_LANG)) { if (raw.includes(flag)) return Object.values(LANGS).find(v => v.code === code) || null; }
  for (const [k, v] of Object.entries(LANGS)) { if (t.includes(k) || t.includes(v.label.toLowerCase()) || t.includes(v.code)) return v; }
  if (t.includes('anglais')) return LANGS['english'];
  if (/^\d+$/.test(t)) { const arr = Object.values(LANGS); const i = parseInt(t) - 1; if (arr[i]) return arr[i]; }
  return null;
}

const AIRLINES = { AF:'Air France', SN:'Brussels Airlines', TP:'TAP Air Portugal', AT:'Royal Air Maroc', HC:'Air Sénégal', KQ:'Kenya Airways', ET:'Ethiopian Airlines', EK:'Emirates', TK:'Turkish Airlines', KL:'KLM', LH:'Lufthansa', IB:'Iberia', U2:'easyJet', FR:'Ryanair', TO:'Transavia', KP:'ASKY', DN:'Senegal Airlines' };
function deduceAirline(vol) { const m = (vol || '').toUpperCase().match(/^([A-Z]{2,3})\d/); return (m && AIRLINES[m[1]]) || ''; }

const NUMEMO = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
const STOP_FOOTER = "_L'équipe Robin des Airs_";

// ─── WATI send helpers (identiques à v8) ──────────────────────────────────────
async function send(phone, text, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const params = new URLSearchParams({ messageText: text, channelPhoneNumber: cfg.channel });
  try { await fetch(`${cfg.base}/api/v1/sendSessionMessage/${encodeURIComponent(wa)}?${params}`, { method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' } }); }
  catch (e) { console.error('send failed', e.message); }
}
async function sendButtons(phone, config, cfg) {
  if (!cfg) return;
  const isArr = Array.isArray(config);
  const body    = isArr ? '👇' : (config.body || '');
  const footer  = isArr ? undefined : config.footer;
  const buttons = isArr ? config : (config.buttons || []);
  const wa = normalizeWatiPhone(phone);
  const qs = new URLSearchParams({ whatsappNumber: wa, channelPhoneNumber: cfg.channel });
  const fallbackText = (body && body !== '👇' ? body + '\n\n' : '') + buttons.map((b, i) => `${i + 1} — ${b.text}`).join('\n');
  try {
    const res = await fetch(`${cfg.base}/api/v1/sendInteractiveButtonsMessage?${qs}`, { method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ body, footer: footer || 'robindesairs.eu', buttons: buttons.slice(0, 3).map(b => ({ text: clip(b.text, 20) })) }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.result === false || data.error || data.ok === false) await send(phone, fallbackText, cfg);
  } catch (e) { await send(phone, fallbackText, cfg); }
}
async function sendList(phone, { header, body, footer, buttonText, items }, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const rows = items.map((i, idx) => ({ id: i.id || String(idx + 1), title: clip(i.title, 24), description: clip(i.description || '', 72) }));
  let host; try { host = new URL(cfg.base).origin; } catch { host = cfg.base; }
  const textFallback = () => send(phone, (header ? `*${header}*\n\n` : '') + body + '\n\n' + items.map((it, idx) => `${NUMEMO[idx] || (idx + 1 + '.')} ${it.title}`).join('\n') + `\n\n👉 Répondez avec le *numéro*.`, cfg);
  try {
    const res = await fetch(`${host}/api/ext/v3/conversations/messages/interactive`, { method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ target: wa, type: 'list', list_message: { ...(header ? { header: clip(header, 60) } : {}), body, footer: footer || 'robindesairs.eu', button_text: clip(buttonText || 'Choisir', 20), sections: [{ title: clip(header || 'Choix', 24), rows }] } }) });
    const data = await res.json().catch(() => ({}));
    const failed = !res.ok || data.result === false || data.error || data.ok === false || data.success === false;
    await saveInteractiveDebug({ fn: 'sendList-v3', status: res.status, failed, resp: data });
    if (failed) await textFallback();
  } catch (e) { await textFallback(); }
}
async function sendDelayed(phone, text, cfg, ms = 700) { await new Promise(r => setTimeout(r, ms)); await send(phone, text, cfg); }

// ─── buildMandatUrl ────────────────────────────────────────────────────────────
function buildMandatUrl(s, phone) {
  const mandant = (s.passengers && s.passengers[s.mandant_idx != null ? s.mandant_idx : 0]) || {};
  const p = new URLSearchParams({ ref: s.ref || '', phone: phone || '', name: mandant.name || (s.names && s.names[0]) || s.nom || '', vol: s.vol || '', date: s.date || '', pnr: s.pnr || '', route: s.route || '', compagnie: s.compagnie || '', motif: s.incident_libelle || '', indemnite: '600', pax: String(s.pax || 1), lang: s.langue_code || 'fr', source: 'wati-bot-v8', address: mandant.adresse || '' });
  return `https://robindesairs.eu/mandat.html?${p.toString()}`;
}

// ─── OCR Vision (identique à v8) ──────────────────────────────────────────────
async function ocrBoardingPass(mediaUrl, cfg) {
  const key = process.env.OPENAI_API_KEY; if (!key || !mediaUrl) return null;
  try {
    const imgRes = await fetch(mediaUrl, { headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {} });
    if (!imgRes.ok) return null;
    const b64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');
    const prompt = `Tu lis une carte d'embarquement (boarding pass) — physique ou e-ticket. Réponds UNIQUEMENT en JSON :\n{"vol":"","compagnie":"","date":"","pnr":"","depart":"","arrivee":"","nom":""}\nRègles :\n- vol : code IATA complet (ex. AF718, SN305). OBLIGATOIRE.\n- compagnie : nom complet.\n- date : format JJ/MM. Pas d'année inventée — si tu ne vois pas l'année, mets "" pour l'année (garde JJ/MM seulement).\n- pnr : code réservation (5-6 caractères alphanum). Si absent : "".\n- depart / arrivee : codes IATA aéroport (3 lettres).\n- nom : nom de famille EN MAJUSCULES si visible, sinon "".\n- Champ inconnu = "". Ne JAMAIS inventer.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o', max_tokens: 200, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }] }] }) });
    const data = await res.json(); if (!data.choices) return null;
    const p = JSON.parse(data.choices[0].message.content);
    return { vol: (p.vol || '').toUpperCase().trim(), compagnie: p.compagnie || '', date: p.date || '', pnr: (p.pnr || '').toUpperCase().trim(), route: [p.depart, p.arrivee].filter(Boolean).join(' → ').toUpperCase(), nom: (p.nom || '').toUpperCase().trim() };
  } catch (e) { return null; }
}
async function ocrPassport(mediaUrl, cfg) {
  const key = process.env.OPENAI_API_KEY; if (!key || !mediaUrl) return null;
  try {
    const imgRes = await fetch(mediaUrl, { headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {} });
    if (!imgRes.ok) return null;
    const b64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');
    const prompt = `Tu lis une pièce d'identité (PASSEPORT, carte nationale d'identité, titre de séjour, carte de résident…) — utilise aussi la zone MRZ en bas si présente. Réponds UNIQUEMENT en JSON :\n{"nom":"","prenom":"","date_naissance":"","date_expiration":"","adresse":""}\nRègles :\n- nom : nom de famille en MAJUSCULES.\n- prenom : prénom(s).\n- date_naissance : format JJ/MM/AAAA. Convertis depuis la MRZ (AAMMJJ) si besoin, en déduisant le siècle logiquement (une naissance est dans le passé).\n- date_expiration : date de fin de validité, format JJ/MM/AAAA (depuis la MRZ ou le champ imprimé). Si absente, "".\n- adresse : champ "Adresse", "Domicile" ou "Address" visible sur la page (hors MRZ). Recopie tel quel sur une seule ligne. Si absent, "".\n- Champ inconnu = "". Ne JAMAIS inventer.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o', max_tokens: 200, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }] }] }) });
    const data = await res.json(); if (!data.choices) return null;
    const p = JSON.parse(data.choices[0].message.content);
    const name = [p.prenom, p.nom].filter(Boolean).join(' ').toUpperCase().trim();
    const dob    = (p.date_naissance || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ? p.date_naissance : '';
    const expiry = (p.date_expiration || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ? p.date_expiration : '';
    const adresse = (p.adresse || '').trim();
    return { name, dob, expiry, adresse };
  } catch (e) { return null; }
}

// ─── OCR confirm helper ────────────────────────────────────────────────────────
function isExpired(dateStr) { const m = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return false; return new Date(+m[3], +m[2]-1, +m[1]).getTime() < Date.now(); }
function isMinorAt(dob, flightDateStr) {
  const b = (dob || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!b) return false;
  const birth = new Date(+b[3], +b[2]-1, +b[1]);
  const f = (flightDateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const ref = f ? new Date(+f[3], +f[2]-1, +f[1]) : new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  if (ref.getMonth() < birth.getMonth() || (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate())) age--;
  return age < 18;
}
async function askOcrConfirm(phone, s, cfg, mediaUrl) {
  const i = s.doc_idx + 1;
  const pp = await ocrPassport(mediaUrl, cfg);
  if (pp && (pp.name || pp.dob)) {
    const minor = pp.dob ? isMinorAt(pp.dob, s.date) : false;
    const expired = pp.expiry ? isExpired(pp.expiry) : false;
    s.doc_pending = { name: pp.name || '', dob: pp.dob || '', expiry: pp.expiry || '', expired, minor, adresse: pp.adresse || '', viaPhoto: true };
    s.step = 'doc_pass_confirm'; await setState(phone, s);
    const lines = [`📋 *Passager ${i}/${s.pax} — j'ai lu :*`, `👤 ${pp.name || '—'}`, pp.dob ? `🎂 Né(e) le ${pp.dob}` : '', minor ? `👶 *Mineur·e* — signature parentale requise` : '', expired ? `⚠️ Pièce *expirée* (${pp.expiry}). On continue, un conseiller vérifiera.` : '', `\nC'est bien cette personne ?`].filter(Boolean).join('\n');
    await send(phone, lines, cfg);
    return sendButtons(phone, [{ id: 'pass_ok', text: "✅ C'est correct" }, { id: 'pass_fix', text: '✏️ Corriger' }], cfg);
  } else {
    s.step = 'doc_pass'; await setState(phone, s);
    return send(phone, `😕 Je n'arrive pas à lire cette pièce (photo trop sombre ou floue ?). Réessayez avec une meilleure photo, ou tapez *saisir* pour entrer le nom et la date de naissance.`, cfg);
  }
}

// ─── Helpers dates ─────────────────────────────────────────────────────────────
function tooOld(dateStr) { const m = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return false; return (Date.now() - new Date(+m[3], +m[2]-1, +m[1]).getTime()) > 5 * 365.25 * 864e5; }
function needYear(d) { return /^\d{1,2}\/\d{1,2}$/.test((d || '').trim()); }
function inFuture(dateStr) { const m = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return false; return new Date(+m[3], +m[2]-1, +m[1]).getTime() > Date.now() + 864e5; }
function recentYears() { const base = new Date().getFullYear(); return [base, base-1, base-2, base-3, base-4]; }
const FUTURE_JOKE = `😄 Là vous voyagez dans le futur ! Ce vol n'a pas encore eu lieu — on ne peut réclamer que pour un vol *déjà passé*. 🪄\n\nDonnez-moi la *vraie* date du vol (JJ/MM/AAAA) :`;

// ─── Machine à états — importée telle quelle du v8 Netlify ─────────────────────
// (les fonctions getState/setState/clearState appellent maintenant les Maps en RAM)

// eslint-disable-next-line no-unused-vars
async function handleMessage(phone, text, cfg, mediaUrl, replyId, _retried) {
  const input = (text || '').trim();
  const lower = input.toLowerCase();
  const id = replyId || '';
  const redispatch = async (currentStep) => {
    if (_retried) return;
    const fresh = await getState(phone);
    if (fresh && fresh.step !== currentStep) return handleMessage(phone, text, cfg, mediaUrl, replyId, true);
  };

  if (['nouveau', 'new', 'reset', '/reset', 'recommencer'].includes(lower)) { await clearState(phone); return sendAccueil(phone, cfg); }
  if (['menu', 'start', 'reprendre', 'continuer', 'suite', 'bonjour', 'hello', 'hi', 'salut'].includes(lower)) {
    const cur = await getState(phone);
    if (cur && cur.step && cur.step !== 'accueil' && cur.step !== 'done') { await send(phone, `👋 Re-bonjour ! On reprend votre dossier là où vous vous étiez arrêté.`, cfg); return relancerEtape(phone, cur, cfg); }
    await clearState(phone); return sendAccueil(phone, cfg);
  }

  let s = await getState(phone);

  // Fallback IA hors-flux (jamais pour les réponses interactives)
  try {
    const { isClientQuestion, isSensitive, answerClientQuestion } = require('./netlify/functions/lib/robin-ai-responder');
    const FREE = ['m_vol', 'm_date', 'm_route', 'names', 'vd_vol', 'vd_date', 'doc_name', 'doc_dob'];
    const looks = !id && (FREE.includes(s.step) ? input.includes('?') : isClientQuestion(input));
    if (looks) {
      if (isSensitive(input)) { await send(phone, `Je transmets votre demande à un conseiller Robin des Airs. 🙏\nTapez *menu* pour ouvrir/continuer votre dossier.`, cfg); return; }
      const r = await answerClientQuestion(input, process.env.OPENAI_API_KEY);
      await sendButtons(phone, { body: (r || `🤖 Je suis l'assistant IA de Robin des Airs.`) + `\n\nPour ouvrir votre dossier, tapez *menu* 👇`, buttons: [{ text: '📋 Démarrer' }, { text: '📞 Être rappelé' }] }, cfg);
      return;
    }
  } catch (e) {}

  if (s.step === 'accueil' || !s.step) return sendAccueil(phone, cfg);
  if (s.step === 'go_langue') return sendLangue(phone, s, cfg);

  if (s.step === 'langue') {
    const ri = listRowIdx(id);
    const langArr = Object.values(LANGS);
    const L = (ri >= 0 && langArr[ri]) ? langArr[ri] : matchLang(input);
    if (!L) return sendLangue(phone, s, cfg);
    s.langue = `${L.flag} ${L.label}`; s.langue_code = L.code;
    if (L.africaine) { s.escalade = 'langue_africaine'; await send(phone, `${L.natif}\n📱 +33 7 56 86 36 30\n\n🤝 Votre dossier est entre de bonnes mains.\nUn expert parlant votre langue vous contactera. En attendant, je continue en français. 👇`, cfg); }
    s.step = 'route'; await setState(phone, s); return sendRoute(phone, s, cfg);
  }

  if (s.step === 'route') {
    const ri = listRowIdx(id);
    const n = normInput(input, ['afrique', 'europe ↔', 'départ', 'autre']);
    if (ri === 0 || n === '1' || (lower.includes('afrique') && lower.includes('europe'))) { s.route_type = 'af_eu'; }
    else if (ri === 1 || n === '2' || (lower.includes('europe') && !lower.includes('afrique') && !lower.includes('départ') && !lower.includes('arrivée'))) { s.route_type = 'eu_eu'; await send(phone, `🇪🇺 Les vols intra-européens sont couverts par le CE 261 ✅\nNotre spécialité c'est Afrique ↔ Europe, mais on continue.`, cfg); }
    else if (ri === 2 || n === '3' || (lower.includes('départ') && !lower.includes('retard'))) { s.route_type = 'mixte'; await send(phone, `🛫 Un départ ou une arrivée en Europe peut être éligible. Vérifions ensemble. ✅`, cfg); }
    else if (ri === 3 || n === '4' || lower.includes('autre')) { await clearState(phone); return send(phone, `😔 Votre vol ne semble pas couvert par la loi européenne.\n\n❓ Si erreur, tapez *menu* pour choisir une autre route.\n\n${STOP_FOOTER}`, cfg); }
    else return redispatch('route');
    s.step = 'incident'; await setState(phone, s); return sendIncident(phone, s, cfg);
  }

  if (s.step === 'incident') {
    const n = normInput(input, ['retard', 'annulation', 'refus']);
    if (n === '1' || lower.includes('retard')) { s.step = 'duree'; await setState(phone, s); return sendButtons(phone, { body: `⏱️ De combien d'heures était le retard à l'arrivée ?`, buttons: [{ text: '✅ Plus de 3 heures' }, { text: '❌ Moins de 3h' }, { text: '🤔 Je ne sais plus' }] }, cfg); }
    if (n === '2' || lower.includes('annul')) { s.incident = 'annulation'; s.incident_libelle = 'Annulation'; }
    else if (n === '3' || lower.includes('refus') || lower.includes('embarq')) { s.incident = 'refus'; s.incident_libelle = "Refus d'embarquement"; }
    else return redispatch('incident');
    await estimationPuisPax(phone, s, cfg); return;
  }

  if (s.step === 'duree') {
    const n = normInput(input, ['plus de 3', 'moins de 3', 'sais']);
    if (n === '1' || lower.includes('plus de 3')) { s.incident = 'retard'; s.incident_libelle = 'Retard +3h'; s.duree_retard = '+3h'; return estimationPuisPax(phone, s, cfg); }
    if (n === '2' || lower.includes('moins de 3')) { await clearState(phone); return send(phone, `😔 Retard inférieur à 3 heures — pas d'indemnisation possible.\n\n💡 Pas sûr de la durée ? Tapez *menu* et choisissez « Je ne sais plus ».\n\n${STOP_FOOTER}`, cfg); }
    if (n === '3' || lower.includes('sais') || lower.includes('souviens')) { s.incident = 'retard'; s.incident_libelle = 'Retard (à vérifier)'; s.duree_retard = 'inconnue'; s.escalade = s.escalade || 'duree_inconnue'; await send(phone, `🤔 Pas de problème — on vérifie pour vous. Continuons. 👇`, cfg); return estimationPuisPax(phone, s, cfg); }
    return;
  }

  if (s.step === 'nb_pax') {
    const n = parseInt(normInput(input, ['1 passager', '2 passager', '3 passager', '4 passager', '5 passager', '6 ou plus']));
    if (n >= 1 && n <= 5) { s.pax = n; s.names = []; s.step = 'type_vol'; await setState(phone, s); return sendButtons(phone, { body: `${bar('type_vol')}\n✈️ C'était un vol direct ou avec escale(s) ?`, buttons: [{ text: '✈️ Vol direct' }, { text: '🔄 Avec escale' }] }, cfg); }
    if (n >= 6 || lower.includes('6 ou plus') || lower.includes('plus')) { s.step = 'nb_pax_exact'; await setState(phone, s); return send(phone, `${bar('nb_pax')}\n👥 *Combien de passagers en tout ?*\nIndiquez le nombre total (ex. 8).`, cfg); }
    return;
  }
  if (s.step === 'nb_pax_exact') {
    const m = input.match(/\d{1,2}/); const n = m ? parseInt(m[0]) : 0;
    if (n >= 1 && n <= 30) { s.pax = n; s.names = []; s.step = 'type_vol'; await setState(phone, s); return sendButtons(phone, { body: `${bar('type_vol')}\n✅ ${n} passagers — potentiellement *${montantTotal(n)} €*.\n\n✈️ Vol direct ou avec escale(s) ?`, buttons: [{ text: '✈️ Vol direct' }, { text: '🔄 Avec escale' }] }, cfg); }
    return send(phone, `Indiquez le *nombre total* de passagers en chiffres (ex. 8) :`, cfg);
  }

  if (s.step === 'type_vol') {
    const n = normInput(input, ['direct', 'escale']);
    if (n === '1' || lower.includes('direct')) s.type_vol = 'direct';
    else if (n === '2' || lower.includes('escale')) s.type_vol = 'escale';
    else return sendButtons(phone, { body: `${bar('type_vol')}\n✈️ Vol direct ou avec escale(s) ?`, buttons: [{ text: '✈️ Vol direct' }, { text: '🔄 Avec escale' }] }, cfg);
    s.step = 'scan'; await setState(phone, s);
    return send(phone, `${bar('scan')}\n📸 *Votre carte d'embarquement* — envoyez une photo.\n🤖 Le bot lit le n° de vol, la date et le PNR automatiquement.\n✏️ Pas de carte ? Tapez *manuel* pour saisir.`, cfg);
  }

  if (s.step === 'scan') {
    if (lower === 'manuel' || lower === 'saisir' || lower === 'm') { s.step = 'm_vol'; await setState(phone, s); return send(phone, `${bar('scan')}\n✈️ *Numéro de vol ?*\n_(ex : AF718, SN305)_`, cfg); }
    if (mediaUrl) {
      const d = await ocrBoardingPass(mediaUrl, cfg);
      if (d && d.vol) {
        Object.assign(s, { vol: d.vol, compagnie: d.compagnie || deduceAirline(d.vol), date: d.date || '', pnr: d.pnr || '', route: d.route || '', nom: d.nom || '' });
        if (d.nom) { s.names = s.names || []; s.names[0] = d.nom; }
        s.step = 'scan_confirm'; await setState(phone, s);
        return sendButtons(phone, { body: `📋 Vérifiez :\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date || '—'}${needYear(s.date) ? ' _(année à préciser)_' : ''}\n🎫 PNR : ${s.pnr || '—'}\n👤 Passager : ${(s.names && s.names[0]) || '—'}\n🗺️ Trajet : ${s.route || '—'}\n\nC'est correct ?`, buttons: [{ text: '✅ Oui' }, { text: '✏️ Corriger' }] }, cfg);
      } else { return send(phone, `😕 Je n'arrive pas à lire la carte d'embarquement. Réessayez avec une meilleure photo, ou tapez *manuel*.`, cfg); }
    }
    return send(phone, `📸 Envoyez la photo de votre carte d'embarquement, ou tapez *manuel*.`, cfg);
  }

  if (s.step === 'scan_confirm') {
    const n = normInput(input, ['oui', 'corriger']);
    if (n === '1' || lower.includes('oui') || lower.includes('correct') || lower === 'ok') {
      if (needYear(s.date)) { s.step = 'annee'; await setState(phone, s); const yrs = recentYears(); return sendList(phone, { header: "Année du vol", body: `📅 La date *${s.date}* — quelle année ?`, buttonText: 'Choisir', items: yrs.map(y => ({ title: String(y) })) }, cfg); }
      return apresVol(phone, s, cfg);
    }
    if (n === '2' || lower.includes('corrig')) { return goCorrection(phone, s, cfg); }
    return sendButtons(phone, { body: `📋 Vérifiez :\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 ${s.date || '—'}\n🎫 ${s.pnr || '—'}\nC'est correct ?`, buttons: [{ text: '✅ Oui' }, { text: '✏️ Corriger' }] }, cfg);
  }

  if (s.step === 'annee') {
    const ri2 = listRowIdx(id);
    const yrs = recentYears();
    let yr = ri2 >= 0 && yrs[ri2] ? String(yrs[ri2]) : null;
    if (!yr) { const m2 = input.match(/\b(20\d{2})\b/); yr = m2 ? m2[1] : null; }
    if (!yr && /^\d+$/.test(input.trim()) && parseInt(input.trim()) >= 1 && parseInt(input.trim()) <= yrs.length) yr = String(yrs[parseInt(input.trim()) - 1]);
    if (yr) { s.date = s.date.includes('/') ? s.date + '/' + yr : s.date + '/' + yr; if (inFuture(s.date)) return send(phone, FUTURE_JOKE, cfg); if (tooOld(s.date)) { await clearState(phone); return send(phone, `😔 Ce vol date de plus de 5 ans — prescrit.\n\n${STOP_FOOTER}`, cfg); } return apresVol(phone, s, cfg); }
    return send(phone, `Sélectionnez ou tapez l'année (ex. ${yrs[0]}) :`, cfg);
  }

  if (s.step === 'm_vol') {
    const v = input.toUpperCase().replace(/\s/g, '');
    if (/^[A-Z0-9]{3,8}$/.test(v)) { s.vol = v; s.compagnie = deduceAirline(v); s.step = 'm_date'; await setState(phone, s); return send(phone, `📅 *Date du vol ?* _(JJ/MM/AAAA ou JJ/MM)_`, cfg); }
    return send(phone, `✈️ *Numéro de vol ?*\n_(ex : AF718, SN305)_\nCe format ne semble pas correct.`, cfg);
  }
  if (s.step === 'm_date') {
    const m2 = input.match(/(\d{1,2})[\/\-. ](\d{1,2})(?:[\/\-. ](\d{2,4}))?/);
    if (m2) { const yy = m2[3] ? (m2[3].length === 2 ? '20' + m2[3] : m2[3]) : ''; const d2 = `${m2[1].padStart(2,'0')}/${m2[2].padStart(2,'0')}${yy ? '/' + yy : ''}`; if (yy && inFuture(d2)) return send(phone, FUTURE_JOKE, cfg); if (yy && tooOld(d2)) { await clearState(phone); return send(phone, `😔 Ce vol date de plus de 5 ans — prescrit.\n\n${STOP_FOOTER}`, cfg); } s.date = d2; if (!yy) { s.step = 'annee'; await setState(phone, s); const yrs = recentYears(); return sendList(phone, { header: "Année du vol", body: `📅 La date *${d2}* — quelle année ?`, buttonText: 'Choisir', items: yrs.map(y => ({ title: String(y) })) }, cfg); } s.step = 'm_route'; await setState(phone, s); return send(phone, `🗺️ *Trajet ?* _(ex : CDG → DSS ou Paris → Dakar)_`, cfg); }
    return send(phone, `📅 Format JJ/MM/AAAA (ex. 15/03/2024) :`, cfg);
  }
  if (s.step === 'm_route') {
    if (input.length >= 3) { s.route = input; s.step = 'scan_confirm'; await setState(phone, s); return showScanConfirm(phone, s, cfg); }
    return send(phone, `🗺️ *Trajet ?* _(ex : CDG → DSS)_`, cfg);
  }

  if (s.step === 'correction') {
    const n = normInput(input, ['vol', 'date', 'nom', 'trajet']);
    if (id === 'fix_vol' || n === '1' || lower.includes('vol')) { s.step = 'fix_vol'; await setState(phone, s); return send(phone, `✈️ Numéro de vol actuel : *${s.vol || '—'}*\nTapez le *bon numéro* 👇`, cfg); }
    if (id === 'fix_date' || n === '2' || lower.includes('date')) { s.step = 'fix_date'; await setState(phone, s); return send(phone, `📅 Date actuelle : *${s.date || '—'}*\nTapez la *bonne date* (JJ/MM/AAAA) 👇`, cfg); }
    if (id === 'fix_nom' || n === '3' || lower.includes('nom')) { s.step = 'fix_nom'; await setState(phone, s); return send(phone, `👤 Passager : *${(s.names && s.names[0]) || '—'}*\nTapez le *bon nom* 👇`, cfg); }
    if (id === 'fix_route' || n === '4' || lower.includes('trajet') || lower.includes('route')) { s.step = 'fix_route'; await setState(phone, s); return send(phone, `🗺️ Trajet actuel : *${s.route || '—'}*\nTapez le *bon trajet* 👇 _(ex. CDG → DSS)_`, cfg); }
    return goCorrection(phone, s, cfg);
  }
  if (s.step === 'fix_vol') { const v = input.toUpperCase().replace(/\s/g,''); if (/^[A-Z0-9]{3,8}$/.test(v)) { s.vol = v; s.compagnie = deduceAirline(v); } return afterFix(phone, s, cfg); }
  if (s.step === 'fix_date') { const m2 = input.match(/(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{4})/); if (m2) { const d2 = `${m2[1].padStart(2,'0')}/${m2[2].padStart(2,'0')}/${m2[3]}`; if (inFuture(d2)) return send(phone, FUTURE_JOKE, cfg); s.date = d2; } return afterFix(phone, s, cfg); }
  if (s.step === 'fix_nom') { if (input.length >= 2) { s.names = s.names || []; s.names[0] = input.toUpperCase(); } return afterFix(phone, s, cfg); }
  if (s.step === 'fix_route') { if (input.length >= 3) s.route = input; return afterFix(phone, s, cfg); }

  if (s.step === 'recap') {
    const n = normInput(input, ['correct', 'modifier']);
    if (n === '1' || lower.includes('correct') || lower.startsWith('oui')) return startDocuments(phone, s, cfg);
    if (n === '2' || lower.includes('modif') || lower.includes('corriger')) return goCorrection(phone, s, cfg);
    return sendRecap(phone, s, cfg);
  }

  if (s.step === 'doc_pass') {
    s.passengers = s.passengers || [];
    if (mediaUrl) return askOcrConfirm(phone, s, cfg, mediaUrl);
    if (lower === 'passer') { s.passengers[s.doc_idx] = { skipped: true }; s.docs_pending = true; s.doc_idx++; await setState(phone, s); return nextPassport(phone, s, cfg); }
    if (lower.includes('saisir') || lower.includes('manuel')) { s.step = 'doc_name'; await setState(phone, s); return send(phone, `👤 *Passager ${s.doc_idx + 1}* — Nom et prénom ?\n_(ex : Aminata Diallo)_`, cfg); }
    return send(phone, `🛂 Envoyez la *photo de la pièce d'identité*, tapez *saisir* (nom + date de naissance), ou *passer*.`, cfg);
  }

  if (s.step === 'doc_pass_confirm') {
    s.passengers = s.passengers || [];
    if (mediaUrl) { delete s.doc_pending; return askOcrConfirm(phone, s, cfg, mediaUrl); }
    const n = normInput(input, ['correct', 'corriger']);
    const ok = n === '1' || id === 'pass_ok' || lower.includes('correct') || lower.startsWith('oui') || lower === 'ok';
    const fix = n === '2' || id === 'pass_fix' || lower.includes('corrig') || lower.startsWith('non') || lower.includes('erreur');
    if (ok) { s.passengers[s.doc_idx] = s.doc_pending || { viaPhoto: true }; delete s.doc_pending; s.doc_idx++; await setState(phone, s); return nextPassport(phone, s, cfg); }
    if (fix) { delete s.doc_pending; s.step = 'doc_pass'; await setState(phone, s); return sendButtons(phone, [{ id: 'doc_photo', text: '📸 Nouvelle photo' }, { id: 'doc_saisir', text: '✏️ Saisir manuellement' }], cfg); }
    if (id === 'doc_photo' || lower.includes('photo') || lower.includes('renvo')) { s.step = 'doc_pass'; await setState(phone, s); return send(phone, `📸 Envoyez la photo de la pièce d'identité du passager ${s.doc_idx + 1}.`, cfg); }
    if (id === 'doc_saisir' || lower.includes('saisir') || lower.includes('manuel')) { delete s.doc_pending; s.step = 'doc_name'; await setState(phone, s); return send(phone, `👤 *Passager ${s.doc_idx + 1}* — Nom et prénom ?\n_(ex : Aminata Diallo)_`, cfg); }
    return sendButtons(phone, [{ id: 'pass_ok', text: "✅ C'est correct" }, { id: 'pass_fix', text: '✏️ Corriger' }], cfg);
  }

  if (s.step === 'doc_mandant') {
    s.passengers = s.passengers || [];
    let idx = -1;
    if (id && /^mdt_\d+$/.test(id)) idx = parseInt(id.slice(4));
    else if (id && /^\d+$/.test(id)) idx = parseInt(id) - 1;
    else if (/^\d+$/.test(input.trim())) idx = parseInt(input.trim()) - 1;
    else { const lowNames = s.passengers.slice(0, s.pax).map(p => (p.name || '').toLowerCase()); idx = lowNames.findIndex(nm => nm && lower.split(' ').some(w => w.length > 2 && nm.includes(w))); }
    if (idx >= 0 && idx < s.pax) {
      s.mandant_idx = idx; await setState(phone, s);
      const chosen = s.passengers[idx] || {};
      const addrNote = chosen.adresse ? `\n📍 Adresse détectée : *${chosen.adresse}*\n_(pré-remplie sur le mandat — modifiable si besoin)_` : `\n_(Aucune adresse lue sur la pièce — vous la saisirez sur le mandat.)_`;
      await send(phone, `👤 *${chosen.name || `Passager ${idx + 1}`}* signe le mandat.${addrNote}`, cfg);
      return gotoBoarding(phone, s, cfg);
    }
    return askMandant(phone, s, cfg);
  }

  if (s.step === 'doc_name') {
    if (input.length >= 3 && !/^\d+$/.test(input)) { s.passengers = s.passengers || []; s.passengers[s.doc_idx] = { name: input.toUpperCase() }; s.step = 'doc_dob'; await setState(phone, s); return send(phone, `📅 *Date de naissance* de ${input} ? _(JJ/MM/AAAA)_`, cfg); }
    return send(phone, `Nom trop court. Renvoyez nom et prénom :`, cfg);
  }
  if (s.step === 'doc_dob') {
    const m2 = input.match(/(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})/);
    if (m2) { const yy = m2[3].length === 2 ? '19' + m2[3] : m2[3]; const dob = `${m2[1].padStart(2,'0')}/${m2[2].padStart(2,'0')}/${yy}`; const minor = isMinorAt(dob, s.date); const p = s.passengers[s.doc_idx] || {}; p.dob = dob; p.minor = minor; s.passengers[s.doc_idx] = p; await send(phone, `✅ ${p.name || ('Passager ' + (s.doc_idx + 1))} — ${dob}${minor ? ' 👶 _(mineur·e : signature parentale requise)_' : ''}`, cfg); s.doc_idx++; await setState(phone, s); return nextPassport(phone, s, cfg); }
    return send(phone, `Date non reconnue. Format JJ/MM/AAAA (ex. 05/09/2012) :`, cfg);
  }

  if (s.step === 'doc_boarding') {
    if (mediaUrl) { await send(phone, `✅ Carte d'embarquement reçue !`, cfg); return gotoEticket(phone, s, cfg); }
    if (lower === 'passer') { s.docs_pending = true; return gotoEticket(phone, s, cfg); }
    if (lower === 'appel') { await clearState(phone); return send(phone, `📞 Un expert vous rappelle sous 24h.\n\n${STOP_FOOTER}`, cfg); }
    return send(phone, `🎫 Envoyez la carte d'embarquement, ou *passer*, ou *appel* si vous avez tout perdu.`, cfg);
  }
  if (s.step === 'doc_eticket') {
    if (mediaUrl) { await send(phone, `✅ E-billet reçu !`, cfg); return gotoCert(phone, s, cfg); }
    if (lower === 'passer') { s.docs_pending = true; return gotoCert(phone, s, cfg); }
    if (lower === 'appel') { await clearState(phone); return send(phone, `📞 Un expert vous rappelle sous 24h.\n\n${STOP_FOOTER}`, cfg); }
    return send(phone, `📧 Envoyez l'e-billet (pensez aux spams/Booking), ou *passer*, ou *appel*.`, cfg);
  }
  if (s.step === 'doc_cert') {
    if (mediaUrl) { await send(phone, `✅ Certificat reçu — ça accélère votre dossier !`, cfg); return finaliser(phone, s, cfg); }
    if (lower === 'passer' || lower === 'non') return finaliser(phone, s, cfg);
    return send(phone, `📄 Envoyez le certificat de retard (optionnel), ou tapez *passer*.`, cfg);
  }

  if (s.step === 'done') {
    if (!s.ref || !s.mandat_url) { await clearState(phone); return sendAccueil(phone, cfg); }
    return send(phone, `✅ Votre dossier *${s.ref}* est enregistré.\n👉 Signez le mandat : ${s.mandat_url}\n\nPour un nouveau dossier : tapez *menu*.`, cfg);
  }
}

// ─── Fonctions de navigation ───────────────────────────────────────────────────
async function sendAccueil(phone, cfg) {
  await sendButtons(phone, { body: `${bar('accueil')}\n👋 Bienvenue chez *Robin des Airs* 🏹\nSpécialiste des vols africains retardés ou annulés.\n\n"${pickStat(phone)}"\n\n✈️ La loi européenne CE 261/2004 vous donne droit à *600 € par personne* pour les vols :\n• Au départ de l'Europe — toutes compagnies\n• Vers l'Europe — si compagnie européenne\n\n*0€ si on ne gagne pas.* Aucun risque pour vous.`, footer: 'CE 261/2004', buttons: [{ text: '🚀 Mon indemnité' }] }, cfg);
  await setState(phone, { step: 'langue', phone, _sid: Date.now().toString(36) });
}
async function sendLangue(phone, s, cfg) {
  s.step = 'langue'; await setState(phone, s);
  await sendList(phone, { header: '🌍 Votre langue', body: `${bar('langue')}\n🌍 Dans quelle langue souhaitez-vous être accompagné(e) ?\n\nChez Robin des Airs, nous parlons votre langue. 🤝\n\n_In which language would you like to be assisted?_`, buttonText: '🌍 Choisir', items: [
    { title: '🇫🇷 Français', description: 'Européenne' }, { title: '🇬🇧 English', description: 'Européenne' },
    { title: '🇸🇳 Wolof', description: 'Africaine' }, { title: '🇬🇲 Mandinka', description: 'Africaine' },
    { title: '🇬🇭 Twi', description: 'Africaine' }, { title: '🇳🇬 Yoruba', description: 'Africaine' },
    { title: '🇬🇳 Peul / Fulfulde', description: 'Africaine' },
  ] }, cfg);
}
async function sendRoute(phone, s, cfg) {
  s.step = 'route'; await setState(phone, s);
  await sendList(phone, { header: '🗺️ Votre route', body: `${bar('route')}\n🗺️ Votre vol était sur quelle route ?\nCela détermine si le CE 261/2004 s'applique.`, buttonText: 'Choisir ▾', items: [
    { title: '🌍 Afrique ↔ Europe', description: 'Notre spécialité' },
    { title: '🇪🇺 Europe ↔ Europe' },
    { title: '🛫 Départ/arrivée Europe' },
    { title: '🌐 Autre' },
  ] }, cfg);
}
async function sendIncident(phone, s, cfg) {
  s.step = 'incident'; await setState(phone, s);
  await sendButtons(phone, { body: `${bar('incident')}\n✈️ Que s'est-il passé avec votre vol ?`, buttons: [{ text: '⏱️ Retard arrivée' }, { text: '❌ Annulation' }, { text: "🚫 Refus d'embarq." }] }, cfg);
}
async function sendPax(phone, s, cfg) {
  s.step = 'nb_pax'; await setState(phone, s);
  await sendList(phone, { header: '👥 Passagers', body: `${bar('nb_pax')}\n👥 Combien de passagers sont concernés ?`, buttonText: 'Choisir', items: [1,2,3,4,5].map(n => ({ title: `${n} passager${n > 1 ? 's' : ''}`, description: `${montantNet(n)} € nets estimés` })).concat([{ title: '6 ou plus' }]) }, cfg);
}
async function estimationPuisPax(phone, s, cfg) { s.step = 'nb_pax'; await setState(phone, s); await send(phone, `💡 Votre vol avec *${s.incident_libelle}* = potentiellement *600 € par passager*. Continuons !`, cfg); return sendPax(phone, s, cfg); }
async function apresVol(phone, s, cfg) { s.names = s.names || []; return sendRecap(phone, s, cfg); }
async function showScanConfirm(phone, s, cfg) {
  s.step = 'scan_confirm'; await setState(phone, s);
  return sendButtons(phone, { body: `📋 Vérifiez :\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date || '—'}${needYear(s.date) ? ' _(année à préciser)_' : ''}\n🎫 PNR : ${s.pnr || '—'}\n👤 Passager : ${(s.names && s.names[0]) || '—'}\n🗺️ Trajet : ${s.route || '—'}\n\nC'est correct ?`, buttons: [{ text: '✅ Oui' }, { text: '✏️ Corriger' }] }, cfg);
}
async function afterFix(phone, s, cfg) { if (s.fix_return === 'recap') return sendRecap(phone, s, cfg); return showScanConfirm(phone, s, cfg); }
async function sendRecap(phone, s, cfg) {
  s.step = 'recap'; await setState(phone, s);
  await sendButtons(phone, { body: `${bar('recap')}\n📋 *Récapitulatif — confirmez svp*\n\n👥 ${s.pax} passager${s.pax > 1 ? 's' : ''}\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n🎫 PNR : ${s.pnr || '—'}\n🗺️ ${s.route || '—'}\n📅 ${s.date || '—'} — ${s.incident_libelle || '—'}\n🛤️ ${s.type_vol === 'escale' ? 'Avec escale' : 'Direct'}\n💵 Objectif : *${montantNet(s.pax)} € nets* (75%)`, buttons: [{ text: '✅ Tout est correct' }, { text: '✏️ Modifier' }] }, cfg);
}
async function goCorrection(phone, s, cfg) {
  s.step = 'correction'; s.fix_return = s.step === 'recap' ? 'recap' : 'scan_confirm'; await setState(phone, s);
  return sendButtons(phone, { body: `✏️ Que souhaitez-vous corriger ?`, buttons: [{ id: 'fix_vol', text: '✈️ N° de vol' }, { id: 'fix_date', text: '📅 Date' }, { id: 'fix_route', text: '🗺️ Trajet' }] }, cfg);
}
async function startDocuments(phone, s, cfg) {
  s.step = 'doc_pass'; s.doc_idx = 0; await setState(phone, s);
  await send(phone, `${bar('documents')}\n📁 Documents — dernière étape avant que votre dossier soit complet !\nQuelques photos pour constituer le dossier officiel. Tout est conservé en sécurité. 🔒`, cfg);
  return nextPassport(phone, s, cfg);
}
async function nextPassport(phone, s, cfg) {
  if (s.doc_idx >= s.pax) return askMandant(phone, s, cfg);
  s.step = 'doc_pass'; await setState(phone, s);
  return send(phone, `🛂 *Passager ${s.doc_idx + 1} sur ${s.pax}*\n📸 Envoyez la *photo d'une pièce d'identité* (passeport, CNI, titre de séjour…)\n✍️ Pas de pièce ? Tapez *saisir*.\n⏭️ Ou *passer* pour plus tard.`, cfg);
}
async function askMandant(phone, s, cfg) {
  if (s.pax <= 1) { s.mandant_idx = 0; await setState(phone, s); return gotoBoarding(phone, s, cfg); }
  s.step = 'doc_mandant'; await setState(phone, s);
  const names = (s.passengers || []).slice(0, s.pax).map((p, i) => p.name || `Passager ${i + 1}`);
  await send(phone, `✅ Toutes les pièces sont collectées !\n\n*Qui va signer le mandat ?*\n_(Souvent vous — la personne qui ouvre le dossier.)_`, cfg);
  if (names.length <= 3) return sendButtons(phone, names.map((nm, i) => ({ id: `mdt_${i}`, text: clip(nm, 20) })), cfg);
  return sendList(phone, { header: 'Signataire du mandat', body: 'Qui va signer le mandat ?', buttonText: 'Choisir', items: names.map((nm, i) => ({ id: `mdt_${i}`, title: clip(nm, 24), description: `Passager ${i + 1}` })) }, cfg);
}
async function gotoBoarding(phone, s, cfg) { s.step = 'doc_boarding'; await setState(phone, s); return send(phone, `🎫 Carte d'embarquement\nEnvoyez-en une photo pour le vol concerné.\n📧 Pas de carte ? Votre e-billet fonctionne aussi.\n✏️ *passer* · 📞 *appel* si tout perdu.`, cfg); }
async function gotoEticket(phone, s, cfg) { s.step = 'doc_eticket'; await setState(phone, s); return send(phone, `📧 Confirmation de réservation (e-billet)\nEnvoyez une capture (pensez aux spams / appli Booking).\n✏️ *passer* · 📞 *appel*.`, cfg); }
async function gotoCert(phone, s, cfg) { s.step = 'doc_cert'; await setState(phone, s); return send(phone, `📄 Certificat de retard/annulation (optionnel)\nSi la compagnie vous en a remis un, envoyez-le.\n✏️ Tapez *passer* si vous n'en avez pas (cas fréquent).`, cfg); }
async function finaliser(phone, s, cfg) {
  const pax = s.passengers || [];
  const nom = (pax[0] && pax[0].name) || (s.names && s.names[0]) || '—';
  s.minorsCount = pax.filter(p => p && p.minor).length;
  s.ref = genRef(); s.mandat_url = buildMandatUrl(s, phone); s.step = 'done'; await setState(phone, s);
  const minorNote = s.minorsCount ? `\n👶 ${s.minorsCount} mineur·s : signature d'un parent/tuteur requise.` : '';
  await send(phone, `${bar('documents')}\n🔒 Vos documents servent uniquement à réclamer votre indemnité. Jamais vendus ni partagés.\nEn continuant, vous acceptez nos CGV : robindesairs.eu/cgv`, cfg);
  await sendDelayed(phone, `🎉 Dossier enregistré ! Réf. *${s.ref}*\n\n👤 ${nom}${s.pax > 1 ? ` +${s.pax - 1}` : ''}\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n🗺️ ${s.route || '—'}\n📅 ${s.date || '—'} — ${s.incident_libelle || '—'}\n💵 Objectif : *${montantNet(s.pax)} € nets*${minorNote}\n\nDernière étape : signez le mandat en 2 minutes.`, cfg, 700);
  await sendDelayed(phone, `${bar('done')}\n💰 *${s.compagnie || 'La compagnie'} vous doit jusqu'à 600 € — Robin les récupère pour vous.*\n\n✔️ *0 € si on ne récupère rien.* 25 % seulement en cas de succès.\n\n👉 *Signez votre mandat (2 min) :*\n${s.mandat_url}\n\n${STOP_FOOTER} 🏹`, cfg, 700);
  try { const makeUrl = process.env.MAKE_WEBHOOK_NEW_DOSSIER; if (makeUrl) await fetch(makeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s, phone, source: 'railway-bot-v8' }) }); } catch (e) {}
}
async function relancerEtape(phone, s, cfg) {
  switch (s.step) {
    case 'langue': return sendLangue(phone, s, cfg);
    case 'route': return sendRoute(phone, s, cfg);
    case 'incident': return sendIncident(phone, s, cfg);
    case 'nb_pax': return sendPax(phone, s, cfg);
    case 'recap': return sendRecap(phone, s, cfg);
    default: return send(phone, `On reprend 👇 Répondez à la dernière question, ou tapez *nouveau* pour recommencer.`, cfg);
  }
}

// ─── Extraction inbound + secret ──────────────────────────────────────────────
function extractInbound(payload) {
  const list = []; const seen = new Set();
  if (!payload || typeof payload !== 'object') return list;
  const push = (item) => {
    if (!item || typeof item !== 'object') return;
    const waId = item.waId || item.whatsappNumber || item.from;
    if (item.owner === true || item.eventType === 'sentMessage' || item.fromMe === true) return;
    const listReply = item.listReply || item.list_reply || item.interactiveListReply;
    const btnReply  = item.interactiveButtonReply || item.buttonReply || item.button_reply;
    const replyId   = (listReply && listReply.id) || (btnReply && btnReply.id) || null;
    const replyText = (listReply && (listReply.title || listReply.id)) || (btnReply && (btnReply.text || btnReply.title || btnReply.id)) || null;
    if (waId === 'senderPhone' || item.text === 'text') return;
    const isImage = item.type === 'image' || (item.type && /image/i.test(item.type));
    const mediaUrl = isImage ? (item.data || item.mediaUrl || item.media_url || item.url) : null;
    const text = replyText || item.text || (item.finalText && String(item.finalText)) || (isImage ? '[image]' : (item.type && item.type !== 'text' ? `[${item.type}]` : ''));
    if (!waId) return;
    const phone = normalizeWaPhone(normalizeWatiPhone(waId));
    if (!String(text || '').trim() && !mediaUrl) return;
    const realId = item.whatsappMessageId || item.whatsapp_message_id || item.id || item.messageId || null;
    const key = realId || `${phone}|${String(text).trim()}`;
    if (seen.has(key)) return; seen.add(key);
    list.push({ phone, text: String(text || '').slice(0, 4096), mediaUrl, dedupId: key, hasId: !!realId, replyId: replyId || '' });
  };
  if (Array.isArray(payload)) { payload.forEach(push); return list; }
  push(payload);
  if (Array.isArray(payload.messages)) payload.messages.forEach(push);
  if (payload.data && typeof payload.data === 'object') push(payload.data);
  return list;
}
function verifyWatiSecret(body, headers, query) {
  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim(); if (!expected) return true;
  return (body && body.secret) === expected || headers['x-wati-secret'] === expected || headers['X-Wati-Secret'] === expected || (query && query.s) === expected;
}

// ─── EXPRESS SERVER ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const HEADERS_CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

app.options('*', (req, res) => res.status(204).set(HEADERS_CORS).end());

// Debug endpoints
app.get('/api/wati-webhook', async (req, res) => {
  const q = req.query;
  const key = (process.env.WATI_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
  if (!key) return res.status(403).json({ error: 'No secret configured' });
  if (q.debug === 'inbound'      && q.key === key) return res.json(await readInboundDebug() || { none: true });
  if (q.debug === 'interactive'  && q.key === key) return res.json(await readInteractiveDebug() || { none: true });
  if (q.debug === 'state'        && q.key === key) {
    const out = {}; for (const [k, v] of STATE) out[k] = v.step;
    return res.json({ sessions: STATE.size, steps: out });
  }
  if (q.selftest === 'list' && q.key === key && q.to) {
    const cfg = watiCfg();
    await sendList(q.to, { header: 'Test liste', body: '🧪 Test liste cliquable Robin', buttonText: 'Choisir', items: [{ title: 'Option 1', description: 'desc 1' }, { title: 'Option 2', description: 'desc 2' }, { title: 'Option 3' }] }, cfg);
    return res.json({ sent: true, resp: await readInteractiveDebug() });
  }
  res.status(403).json({ error: 'Forbidden' });
});

// Webhook principal
app.post('/api/wati-webhook', async (req, res) => {
  const body = req.body;
  if (!verifyWatiSecret(body, req.headers, req.query)) return res.status(401).json({ error: 'Secret invalide' });
  const cfg   = watiCfg();
  const items = extractInbound(body);
  await saveInboundDebug(JSON.stringify(body), items);
  // Répondre WATI immédiatement (évite retry WATI si traitement > 5s)
  res.json({ ok: true, processed: items.length });
  // Traitement asynchrone après la réponse
  for (const { phone, text, mediaUrl, dedupId, hasId, replyId } of items) {
    if (!phone) continue;
    if (hasId && memSeen(dedupId)) continue;
    if (hasId && await isDuplicateMessage(dedupId, true)) continue;
    const ckKey = `ck|${phone}|${String(text).trim().toLowerCase().slice(0, 200)}`;
    if (!hasId && await isDuplicateMessage(ckKey, false, 5000)) continue;
    notifyOwnerWhatsApp(phone, text).catch(() => {});
    handleMessage(phone, text, cfg, mediaUrl, replyId).catch(e => {
      console.error('bot error', e.message, e.stack);
      if (cfg) send(phone, `Une erreur est survenue. Tapez *menu* pour recommencer.`, cfg).catch(() => {});
    });
  }
});

// Health check Railway
app.get('/health', (req, res) => {
  res.json({ ok: true, sessions: STATE.size, dedup: DEDUP.size, uptime: process.uptime(), ts: new Date().toISOString() });
});

app.get('/', (req, res) => res.send('🏹 Robin des Airs Bot v8 — Railway OK'));

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`🤖 Robin des Airs Bot v8 — Railway — port ${PORT}`);
  console.log(`   Webhook : POST /api/wati-webhook`);
  console.log(`   Health  : GET  /health`);
});

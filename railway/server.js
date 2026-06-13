/**
 * Webhook WATI — Bot Robin des Airs **v8** (réécriture sur docs/guide-messages-whatsapp.md)
 *
 * Fichier PARALLÈLE : on le teste avant de basculer l'URL WATI dessus.
 * URL cible : https://robindesairs.eu/api/wati-webhook-v8?s=<WATI_WEBHOOK_SECRET>
 *
 * Flux v8 (14 messages) : Accueil → Langue(9) → Route(4) → Incident+durée →
 * Passagers(montants) → Type vol → Motivation → Scan/Manuel → Noms → Vol+Date →
 * Mineurs → Récap → Documents → RGPD+Mandat. Barre 8 pastilles. Net = 75 %.
 *
 * Réutilise la plomberie éprouvée : connectLambda(Blobs), dédup whatsappMessageId,
 * secret webhook (?s/header/body), OCR Vision, garde-fou clip(), notif owner, Make.
 */

const express = require('express');
const { pickVariant } = require('./lib/bot-variants');
const { SYSTEM_PROMPT: FAQ_SYSTEM_PROMPT, FAQ_KNOWLEDGE } = require('./lib/faq-hors-tunnel');
const { pickRV, fillTpl } = require('./lib/relance-variants');
const { extractEticketMulti: extractEticketMultiLib } = require('./lib/extract-eticket');
// Prénom du signataire, joliment capitalisé pour l'affichage (les noms sont stockés en MAJUSCULES) :
// « CLIMBIE » → « Climbie », « jean-pierre » → « Jean-Pierre », « n'goran » → « N'Goran ».
function titleCaseName(x) { return String(x || '').toLowerCase().replace(/(^|[\s\-'])([a-zà-ÿ])/g, (m, sep, c) => sep + c.toUpperCase()); }
function firstNameOf(s) { const n = (s.passengers && s.passengers[s.mandant_idx || 0] && s.passengers[s.mandant_idx || 0].name) || (s.names && s.names[0]) || ''; if (/^passager/i.test(n)) return ''; return titleCaseName(n.split(/\s+/)[0] || ''); }

// ─── Fonctions inline (autonome — aucune dépendance au monorepo Netlify) ───────
function normalizeWatiPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length >= 11 && !d.startsWith('0')) return d;
  if (d.length === 10 && /^0[6-9]/.test(d)) return '33' + d.slice(1);
  if (d.length === 9 && /^[67]/.test(d)) return '33' + d;
  if (d.startsWith('0')) return d.slice(1);
  return d;
}
const normalizeWaPhone = normalizeWatiPhone;
function watiCfg() {
  const token = (process.env.WATI_API_TOKEN || process.env.WATI_BEARER_TOKEN || '').trim();
  const base = (process.env.WATI_API_BASE || process.env.WATI_API_ENDPOINT || '').trim().replace(/\/$/, '');
  if (!token || !base) return null;
  const channel = (process.env.WATI_CHANNEL_PHONE || process.env.WHATSAPP_CONTACT_NUMBER || '33756863630').replace(/\D/g, '');
  return { token, base, channel };
}
async function appendWaMessage() {} // no-op (historique géré ailleurs)

// ─── STOCKAGE EN RAM (remplace Netlify Blobs — single-thread = zéro race condition) ──
const STATE = new Map();   // phone digits → state
const DEDUP = new Map();   // key → ts
const DEBUG_INBOUND = [];
let   DEBUG_INTERACTIVE = null;

// ─── Dossiers (pour lien mandat court : mandat.html?r=REF → la page récupère tout) ──
const fs = require('fs');
const crypto = require('crypto');
// ─── Chiffrement AU REPOS (AES-256-GCM) — actif si DATA_ENC_KEY est défini, sinon clair (rétrocompat) ──
const _ENC = (process.env.DATA_ENC_KEY || '').trim();
function _encKey() { return _ENC ? crypto.createHash('sha256').update(_ENC).digest() : null; }
function encWriteFile(file, obj) {
  const data = JSON.stringify(obj); const k = _encKey();
  if (!k) { fs.writeFileSync(file, data); return; }
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const enc = Buffer.concat([c.update(data, 'utf8'), c.final()]); const tag = c.getAuthTag();
  fs.writeFileSync(file, JSON.stringify({ _enc: 1, iv: iv.toString('base64'), tag: tag.toString('base64'), d: enc.toString('base64') }));
}
function encReadFile(file) {
  const raw = fs.readFileSync(file, 'utf8'); let p; try { p = JSON.parse(raw); } catch (_) { return {}; }
  if (p && p._enc) { const k = _encKey(); if (!k) throw new Error('DATA_ENC_KEY manquante pour déchiffrer ' + file); const dc = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(p.iv, 'base64')); dc.setAuthTag(Buffer.from(p.tag, 'base64')); return JSON.parse(Buffer.concat([dc.update(Buffer.from(p.d, 'base64')), dc.final()]).toString('utf8')); }
  return p; // clair (legacy) — re-chiffré au prochain write si la clé est active
}
const DOSSIERS_FILE = process.env.DOSSIERS_FILE || '/tmp/robin-dossiers.json';
const DOSSIERS = new Map();
try { for (const [k, v] of Object.entries(encReadFile(DOSSIERS_FILE))) DOSSIERS.set(k, v); console.log('📂 ' + DOSSIERS.size + ' dossiers chargés'); } catch (_) {}
function persistDossiers() { try { const o = {}; for (const [k, v] of DOSSIERS) o[k] = v; encWriteFile(DOSSIERS_FILE, o); } catch (e) { console.error('persistDossiers', e.message); } }

// ─── Persistance de l'ÉTAT conversationnel (la reprise survit aux redémarrages) ──
const STATE_FILE = process.env.STATE_FILE || '/tmp/robin-state.json';
try { for (const [k, v] of Object.entries(encReadFile(STATE_FILE))) STATE.set(k, v); console.log('💾 ' + STATE.size + ' sessions restaurées'); } catch (_) {}
let _stateTimer = null;
function persistState() { // débounce léger : au plus 1 écriture / 1,5 s
  if (_stateTimer) return;
  _stateTimer = setTimeout(() => { _stateTimer = null; try { const o = {}; for (const [k, v] of STATE) o[k] = v; encWriteFile(STATE_FILE, o); } catch (e) { console.error('persistState', e.message); } }, 1500);
}

// ─── LEADS : dossiers non signés à relancer (nudge 2h / 8h / 22h, fenêtre 24h) ──
const LEADS_FILE = process.env.LEADS_FILE || '/tmp/robin-leads.json';
const LEADS = new Map(); // phone digits → { phone, ref, mandatUrl, mandatSentAt, lastClientAt, pax, signed, completed, nudges:[],
                         //   stage:'engaged'|'completed', engagedAt, vol, route, incident, wantsCall, wantsCallAt }
try { for (const [k, v] of Object.entries(encReadFile(LEADS_FILE))) LEADS.set(k, v); console.log('🔔 ' + LEADS.size + ' leads chargés'); } catch (_) {}
function persistLeads() { try { const o = {}; for (const [k, v] of LEADS) o[k] = v; encWriteFile(LEADS_FILE, o); } catch (e) { console.error('persistLeads', e.message); } }

// ─── Sauvegarde DURABLE (Netlify Blobs) : l'état survit aux redeploys Railway (/tmp éphémère) ──
// Sans ça, chaque deploy effaçait LEADS/STATE/DOSSIERS → relances stoppées, clients en cours perdus.
// Garde-fou _durableSafe : on ne snapshot QUE si l'état RAM est réconcilié avec le durable, sinon
// un redeploy + restauration ratée + 1 nouveau lead écraserait le bon backup avec un état partiel.
let _durableSafe = (LEADS.size > 0 || STATE.size > 0); // /tmp avait des données (redémarrage à chaud)
async function snapshotDurable() {
  try {
    if (!_durableSafe) return;
    const secret = (process.env.WATI_WEBHOOK_SECRET || '').trim(); if (!secret) return;
    const cap = (m) => [...m.entries()].slice(-5000);
    await fetch('https://robindesairs.eu/api/bot-state', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, leads: cap(LEADS), state: cap(STATE), dossiers: cap(DOSSIERS) }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) { console.error('snapshotDurable', e.message); }
}
setInterval(snapshotDurable, 60000); // toutes les 60 s (best-effort)
(async () => { // restauration au boot si /tmp était vide (= redeploy)
  try {
    if (_durableSafe) return; // /tmp avait des données → on garde le frais (pas d'écrasement)
    const secret = (process.env.WATI_WEBHOOK_SECRET || '').trim(); if (!secret) return;
    const r = await fetch('https://robindesairs.eu/api/bot-state', { headers: { 'x-bot-secret': secret }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return; // lecture ratée → _durableSafe reste false → on NE snapshot PAS (backup préservé)
    const d = await r.json().catch(() => ({}));
    for (const [k, v] of (d.leads || [])) if (!LEADS.has(k)) LEADS.set(k, v);
    for (const [k, v] of (d.state || [])) if (!STATE.has(k)) STATE.set(k, v);
    for (const [k, v] of (d.dossiers || [])) if (!DOSSIERS.has(k)) DOSSIERS.set(k, v);
    _durableSafe = true; // lecture réussie (même vide) → l'état RAM reflète le durable → snapshot autorisé
    console.log(`♻️ Restauré depuis Blobs : ${LEADS.size} leads · ${STATE.size} sessions · ${DOSSIERS.size} dossiers`);
  } catch (e) { console.error('restoreDurable', e.message); }
})();

function leadKey(phone) { return String(phone || '').replace(/\D/g, ''); }
function upsertLead(phone, patch) { const k = leadKey(phone); const cur = LEADS.get(k) || { phone: k, signed: false, completed: false, nudges: [] }; LEADS.set(k, { ...cur, ...patch }); persistLeads(); }
function markLeadSigned(phoneOrRef) {
  const k = leadKey(phoneOrRef);
  let found = false;
  if (LEADS.has(k)) { const l = LEADS.get(k); l.signed = true; LEADS.set(k, l); found = true; }
  for (const [kk, l] of LEADS) { if (l.ref && String(l.ref) === String(phoneOrRef)) { l.signed = true; LEADS.set(kk, l); found = true; } }
  if (found) persistLeads();
  return found;
}
function findLead(refOrPhone) {
  const k = leadKey(refOrPhone);
  if (LEADS.has(k)) return LEADS.get(k);
  for (const [, l] of LEADS) { if (l && l.ref && String(l.ref) === String(refOrPhone)) return l; }
  return null;
}
// Frais (reçus post-signature) : le client a répondu (reçu envoyé ou « pas de frais ») → on coupe la relance frais.
function markFraisAnswered(phone) { const k = leadKey(phone); const l = LEADS.get(k); if (l) { l.fraisPending = false; LEADS.set(k, l); persistLeads(); } }
// Lead « partiel » : le client a engagé un dossier (vol connu au récap) mais n'a pas encore tout finalisé.
// On le relance dans la fenêtre 24h WhatsApp (gratuite) ; s'il décroche, il bascule en « à rappeler » (Bureau).
function markEngagedLead(phone, s) {
  const cur = LEADS.get(leadKey(phone));
  if (cur && cur.completed) return; // déjà finalisé → géré par le nudge signature, on ne rétrograde pas
  const patch = {
    stage: 'engaged',
    lastClientAt: Date.now(),
    pax: (s && s.pax) || (cur && cur.pax) || 1,
    name: (s && firstNameOf(s)) || (cur && cur.name) || '',
    vol: (s && s.vol) || (cur && cur.vol) || '',
    route: (s && s.route) || (cur && cur.route) || '',
    incident: (s && s.incident_libelle) || (cur && cur.incident) || '',
  };
  if (!cur || !cur.engagedAt) patch.engagedAt = Date.now(); // ancre la relance sur le 1er engagement
  upsertLead(phone, patch);
}

// ─── Dédup en mémoire (même instance Lambda — première barrière, instantanée) ──
const MEM_SEEN = new Map(); // key → timestamp
function memSeen(key) {
  const now = Date.now();
  // Nettoyage des entrées > 60s
  for (const [k, t] of MEM_SEEN) { if (now - t > 60000) MEM_SEEN.delete(k); }
  if (MEM_SEEN.has(key)) return true;
  MEM_SEEN.set(key, now); return false;
}
function clip(s, n) { s = String(s == null ? '' : s); return s.length <= n ? s : s.slice(0, n); }

let notifyOwnerWhatsApp = async () => {};
try { ({ notifyOwnerWhatsApp } = require('./lib/owner-notify')); } catch (_) {}


// ─── Barre 8 pastilles ───────────────────────────────────────────────────────
const PROGRESS = {
  accueil: 0, langue: 0,
  route: 1, route_zone: 1,
  incident: 2, duree: 2, annul_delai: 2,
  nb_pax: 3, nb_pax_exact: 3,
  type_vol: 4, motivation: 4,
  scan: 5, scan_confirm: 5, m_vol: 5, m_date: 5, m_route: 5, m_route_confirm: 5, m_dep: 5, m_arr: 5, m_stop_arr: 5, m_pnr: 5, names: 5, names_confirm: 5, names_fix_which: 5, names_fix_one: 5,
  esc_dep: 5, esc_via: 5, esc_more: 5, esc_arr: 5, esc_vol: 5,
  annee: 6, mineurs: 6, mineurs_which: 6,
  correction: 6, fix_vol: 6, fix_date: 6, fix_nom: 6, fix_route: 6,
  recap: 7, documents: 7, doc_pass: 7, doc_pass_confirm: 7, doc_mandant: 7, doc_adresse: 7, doc_name: 7, doc_dob: 7, doc_boarding: 7, doc_eticket: 7, doc_cert: 7, rgpd: 7,
  done: 8,
};
function bar(step) { const n = PROGRESS[step] ?? 0; return '🟢'.repeat(n) + '⚪'.repeat(8 - n); }

// ─── Montants (net 75 %) ──────────────────────────────────────────────────────
function montantTotal(pax = 1) { return 600 * pax; }
function montantNet(pax = 1) { return Math.round(600 * pax * 0.75); }
// Montant RÉEL après vérification du vol (s.perPax issu de /api/flight-verdict ; 600 par défaut = accroche subsaharienne).
function perPaxOf(s) { const p = s && Number(s.perPax); return (p && p > 0) ? p : 600; }
function montantReel(s) { return perPaxOf(s) * ((s && s.pax) || 1); }
function montantNetReel(s) { return Math.round(montantReel(s) * 0.75); }
// Ligne montant à afficher (récap/done) selon le verdict vol.
function montantLine(s) {
  const v = s && s.flightVerdict;
  if (v === 'hors_champ' || v === 'sous_seuil') return `💰 Montant à confirmer par un expert _(vérification gratuite)_`;
  const verified = !!(s && s.flightChecked) && v === 'eligible';
  const prefix = verified ? '' : 'Jusqu’à ';
  return `💰 ${prefix}*${montantReel(s)} €* — vous gardez *${montantNetReel(s)} € nets* (75 %)`;
}

// ─── Stats choc (rotation MSG1) ───────────────────────────────────────────────
const STAT_VARIANTS = [
  'Seulement 5% des passagers réclament leur indemnité — soyez dans les 5%.',
  'Les compagnies gardent 95% des indemnités dues... faute de réclamation.',
  "Un vol sur 4 au départ d'Afrique arrive en retard en Europe.",
  'Des familles indemnisées chaque semaine. Votre dossier est le suivant.',
  '600€ par passager. C\'est la loi. La compagnie le sait. Vous aussi maintenant.',
  "Chaque année, des millions d'euros d'indemnités ne sont jamais réclamés.",
];
function pickStat(seed) { return STAT_VARIANTS[Math.abs(hashStr(seed)) % STAT_VARIANTS.length]; }
function hashStr(s) { let h = 0; for (const c of String(s || 'x')) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

// ─── Langues (MSG2) — 9 langues, accueils natifs ──────────────────────────────
const LANGS = {
  'français': { code: 'fr', flag: '🇫🇷', label: 'Français', africaine: false },
  'english':  { code: 'en', flag: '🇬🇧', label: 'English', africaine: false },
  'wolof':    { code: 'wo', flag: '🇸🇳', label: 'Wolof', africaine: true, natif: 'Dëkk sa Wolof, bëgg na la wax — expert bi dafa xam Wolof, dafa di la woote. 🤝' },
  'mandinka': { code: 'mnk', flag: '🇬🇲', label: 'Mandinka', africaine: true, natif: 'I be Mandinka kan na — expert do bena i ye Mandinka fo. 🤝' },
  'twi':      { code: 'twi', flag: '🇬🇭', label: 'Twi', africaine: true, natif: 'Yɛka Twi — ɔbenfoɔ bi a ɔka Twi bɛfrɛ wo. 🤝' },
  'yoruba':   { code: 'yo', flag: '🇳🇬', label: 'Yoruba', africaine: true, natif: 'A nsọ Yoruba — amoye kan tó ń sọ Yoruba yóò pè ọ. 🤝' },
  'peul':     { code: 'ff', flag: '🇬🇳', label: 'Peul / Fulfulde', africaine: true, natif: 'Eɗen haala Pulaar — annduɗo haalata Pulaar maa noddu maa. 🤝' },
};
const FLAG_LANG = { '🇫🇷': 'fr', '🇬🇧': 'en', '🇸🇳': 'wo', '🇬🇲': 'mnk', '🇬🇭': 'twi', '🇳🇬': 'yo', '🇬🇳': 'ff' };
function matchLang(input) {
  const raw = input || '';
  const t = raw.toLowerCase();
  // 1) par drapeau (le titre de liste WATI commence par le drapeau)
  for (const [flag, code] of Object.entries(FLAG_LANG)) {
    if (raw.includes(flag)) return Object.values(LANGS).find(v => v.code === code) || null;
  }
  // 2) par nom / clé / code
  for (const [k, v] of Object.entries(LANGS)) {
    if (t.includes(k) || t.includes(v.label.toLowerCase()) || t.includes(v.code)) return v;
  }
  if (t.includes('anglais')) return LANGS['english'];
  // 3) sélection par numéro de ligne (1..7) si WATI renvoie l'index
  if (/^\d+$/.test(t)) { const arr = Object.values(LANGS); const i = parseInt(t) - 1; if (arr[i]) return arr[i]; }
  return null;
}

// ─── Envoi texte / liste / boutons (plomberie éprouvée + clip + debug) ─────────
async function send(phone, text, cfg) {
  if (!cfg) { console.error('v8 send IGNORÉ — watiCfg null (WATI_API_TOKEN/WATI_API_BASE manquant)'); return; }
  const wa = normalizeWatiPhone(phone);
  const mask = wa.length > 6 ? wa.slice(0, 4) + '***' + wa.slice(-2) : wa;
  const params = new URLSearchParams({ messageText: text, channelPhoneNumber: cfg.channel });
  try {
    const res = await fetch(`${cfg.base}/api/v1/sendSessionMessage/${encodeURIComponent(wa)}?${params}`, {
      method: 'POST', signal: AbortSignal.timeout(12000), headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    });
    // ⚠️ WATI renvoie HTTP 200 MÊME en échec applicatif :
    // {result:false, info:"Invalid Conversation"} = fenêtre 24 h fermée.
    // Sans lire le corps, l'échec d'envoi était totalement invisible (aucun log).
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.result === false || data.ok === false || data.error) {
      console.error('v8 WATI send REJETÉ', res.status, JSON.stringify(data).slice(0, 200), '→', mask);
      // Fenêtre 24h fermée (« Invalid Conversation ») : le client n'est plus joignable gratuitement.
      // → bascule IMMÉDIATE dans la liste « À rappeler » du bureau (avant : invisible jusqu'au calcul 24h).
      if (/invalid conversation/i.test(JSON.stringify(data))) {
        try { const k = leadKey(phone); const l = LEADS.get(k); if (l && !l.signed && !l.windowClosed) { l.windowClosed = true; LEADS.set(k, l); persistLeads(); } } catch (_) {}
      }
    }
  } catch (e) { console.error('v8 send failed', e.message, '→', mask); }
}
async function sendButtons(phone, config, cfg) {
  if (!cfg) return;
  // Accepte : {body, footer, buttons:[]} OU directement un tableau [{id,text}]
  const isArr = Array.isArray(config);
  const body    = isArr ? '👇' : (config.body || '');
  const footer  = isArr ? undefined : config.footer;
  const buttons = isArr ? config : (config.buttons || []);
  const wa = normalizeWatiPhone(phone);
  const qs = new URLSearchParams({ whatsappNumber: wa, channelPhoneNumber: cfg.channel });
  const fallbackText = (body && body !== '👇' ? body + '\n\n' : '') + buttons.map((b, i) => `${i + 1} — ${b.text}`).join('\n');
  try {
    const res = await fetch(`${cfg.base}/api/v1/sendInteractiveButtonsMessage?${qs}`, {
      method: 'POST', signal: AbortSignal.timeout(12000), headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, footer: footer || '🏹 Robin des Airs', buttons: buttons.slice(0, 3).map(b => ({ text: clip(b.text, 20) })) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.result === false || data.error || data.ok === false) {
      await send(phone, fallbackText, cfg);
    }
  } catch (e) { await send(phone, fallbackText, cfg); }
}
async function sendList(phone, { header, body, footer, buttonText, items }, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const rows = items.map((i, idx) => ({ id: i.id || String(idx + 1), title: clip(i.title, 24), description: clip(i.description || '', 72) }));
  // ✅ Vraie liste cliquable = endpoint v3 "active conversation" avec type:"list"
  //    (le /api/v1/sendInteractiveListMessage rend toujours en texte — confirmé support WATI).
  let host; try { host = new URL(cfg.base).origin; } catch { host = cfg.base; }
  const textFallback = () => send(phone, (header ? `*${header}*\n\n` : '') + body + '\n\n' + items.map((it, idx) => `${NUMEMO[idx] || (idx + 1 + '.')} ${it.title}`).join('\n') + `\n\n👉 Répondez avec le *numéro*.`, cfg);
  try {
    const res = await fetch(`${host}/api/ext/v3/conversations/messages/interactive`, {
      method: 'POST', signal: AbortSignal.timeout(12000), headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: wa,
        type: 'list',
        list_message: {
          ...(header ? { header: clip(header, 60) } : {}),
          body: body,
          footer: footer || '🏹 Robin des Airs',
          button_text: clip(buttonText || 'Choisir', 20), // ✅ champ exact confirmé par WATI (snake_case)
          sections: [{ title: clip(header || 'Choix', 24), rows }],
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    const failed = !res.ok || data.result === false || data.error || data.ok === false || data.success === false;
    await saveInteractiveDebug({ fn: 'sendList-v3', status: res.status, failed, resp: data });
    if (failed) await textFallback();
  } catch (e) { await textFallback(); }
}
async function sendDelayed(phone, text, cfg, ms = 700) { await new Promise(r => setTimeout(r, ms)); await send(phone, text, cfg); }
// WATI ne rend pas les listes interactives sur ce compte (elles arrivent en texte).
// → on envoie un choix numéroté clair, et les handlers acceptent le numéro OU le mot-clé.
const NUMEMO = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
async function sendChoices(phone, { body, items, footer }, cfg) {
  const lines = items.map((it, i) => `${NUMEMO[i] || (i + 1 + '.')} ${it.title}${it.description ? ` — _${it.description}_` : ''}`).join('\n');
  await send(phone, `${body}\n\n${lines}\n\n👉 Répondez avec le *numéro* (ex. 1)${footer ? `\n${footer}` : ''}`, cfg);
}

// ─── État ──────────────────────────────────────────────────────────────────────
async function getState(phone) { return STATE.get(phone.replace(/\D/g, '')) || { step: 'accueil' }; }
async function setState(phone, s) { STATE.set(phone.replace(/\D/g, ''), { ...s, updatedAt: new Date().toISOString() }); persistState(); }
// Guard fallback : re-lit l'état avant de re-poser une question.
// Si le step a changé (doublon concurrent traité en premier), on ignore silencieusement.
async function safeFallback(phone, expectedStep, fn) {
  try { const cur = await getState(phone); if (cur && cur.step !== expectedStep) return; } catch {}
  return fn();
}
async function clearState(phone) { STATE.delete(phone.replace(/\D/g, '')); persistState(); }
function saveInboundDebug(rawBody, items) {
  DEBUG_INBOUND.unshift({ ts: new Date().toISOString(), raw: String(rawBody).slice(0, 1500), extracted: items.map(it => ({ ph: it.phone, txt: it.text, dedupId: it.dedupId })) });
  if (DEBUG_INBOUND.length > 20) DEBUG_INBOUND.length = 20;
}
async function readInboundDebug() { return DEBUG_INBOUND; }
function saveInteractiveDebug(obj) { DEBUG_INTERACTIVE = { ...obj, ts: new Date().toISOString() }; }
async function readInteractiveDebug() { return DEBUG_INTERACTIVE; }
async function isDuplicateMessage(id, hasId, windowMs) {
  if (!id) return false;
  const k = String(id).slice(0, 200);
  const now = Date.now(); const w = windowMs || (hasId ? 600000 : 60000);
  if (DEDUP.has(k) && (now - DEDUP.get(k)) < w) return true;
  DEDUP.set(k, now);
  if (DEDUP.size > 50000) { for (const [key, ts] of DEDUP) { if (now - ts > 600000) DEDUP.delete(key); } }
  return false;
}

// ─── Utilitaires ────────────────────────────────────────────────────────────────
// Réf = jeton aléatoire (crypto) non énumérable : agit comme "lien magique" pour /api/dossier (données perso).
function genRef() { const d = new Date(); return `RDA-${d.toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomBytes(9).toString('hex').toUpperCase()}`; }
function normInput(raw, options) { const t = (raw || '').trim().toLowerCase(); if (/^\d+$/.test(t)) return t; const i = options.findIndex(o => t.includes(o.toLowerCase())); return i >= 0 ? String(i + 1) : t; }
const AIRLINES = { AF: 'Air France', SN: 'Brussels Airlines', TP: 'TAP Air Portugal', AT: 'Royal Air Maroc', HC: 'Air Sénégal', KQ: 'Kenya Airways', ET: 'Ethiopian Airlines', EK: 'Emirates', TK: 'Turkish Airlines', KL: 'KLM', LH: 'Lufthansa', IB: 'Iberia', EJU: 'easyJet', U2: 'easyJet', FR: 'Ryanair', TO: 'Transavia', KP: 'ASKY', DN: 'Senegal Airlines' };
function deduceAirline(vol) { const m = (vol || '').toUpperCase().match(/^([A-Z]{2,3})\d/); return (m && AIRLINES[m[1]]) || ''; }
// Trajet compact : départ → destination FINALE, sans les escales (« Dakar → Casa → Paris » → « Dakar → Paris »).
// Gère l'aller-retour (départ = arrivée) en prenant la dernière ville DISTINCTE de l'origine.
function routeShort(route) {
  const parts = String(route || '').split(/\s*(?:→|->|—)\s*/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return '';
  const origin = parts[0];
  let dest = '';
  for (let i = parts.length - 1; i >= 1; i--) { if (parts[i] !== origin) { dest = parts[i]; break; } }
  return dest ? `${origin} → ${dest}` : origin;
}
// Libellé « voyage » pour les relances : compagnie (déduite du n° de vol) + trajet compact (départ → destination finale).
// Ex. « Royal Air Maroc · Dakar → Paris ». Repli : compagnie seule → trajet → n° de vol → « concerné ».
// Plus parlant que « AT718 + AT713 » : le client reconnaît sa compagnie et sa destination.
function tripLabel(lead) {
  const cie = deduceAirline(lead && lead.vol);
  const route = routeShort((lead && lead.route) || '');
  if (cie && route) return `${cie} · ${route}`;
  return cie || route || (lead && lead.vol) || 'concerné';
}
// Verdict CE261 vérifié via /api/flight-verdict (AeroDataBox). Best-effort : ne bloque jamais le tunnel.
async function fetchFlightVerdict(vol, date, typeVol) {
  const v = String(vol || '').split('+')[0].trim().split(/\s+/)[0]; // 1er n° de vol seulement
  if (!v) return null;
  try {
    const u = `https://robindesairs.eu/api/flight-verdict?flight=${encodeURIComponent(v)}&date=${encodeURIComponent(date || '')}&type=${typeVol === 'escale' ? 'escale' : 'direct'}`;
    const opts = (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? { signal: AbortSignal.timeout(6000) } : {};
    const res = await fetch(u, opts);
    if (!res.ok) return null;
    const j = await res.json();
    return (j && j.ok) ? j : null;
  } catch (_) { return null; }
}
// Résout les TRONÇONS du vol via AeroDataBox (flight-info renvoie un tableau de legs). Un vol multi-stop
// sous le même n° (ex. ORY→COO→ABJ) revient en plusieurs lignes → on les CHAÎNE en arrêts ordonnés.
// Évite de faire taper la route au client (pas d'e-billet/carte) ; toujours CONFIRMÉ ensuite (jamais imposé).
// Garde-fou mémoire : la route vient de l'API, jamais d'un LLM. Renvoie { airline, stops:[{code,label}] } ou null.
async function resolveLegs(vol, date) {
  try {
    const v = String(vol || '').split('+')[0].trim().split(/\s+/)[0];
    const ymd = toISODate(date);
    if (!v || !ymd) return null;
    const res = await fetch(`https://robindesairs.eu/api/flight-info?flight=${encodeURIComponent(v)}&date=${encodeURIComponent(ymd)}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!Array.isArray(data) || !data.length) return null;
    const legs = data.map((r) => ({ dep: (r.departure || {}).iataCode || '', arr: (r.arrival || {}).iataCode || '', depCity: (r.departure || {}).city || '', arrCity: (r.arrival || {}).city || '' })).filter((l) => l.dep && l.arr);
    if (!legs.length) return null;
    const airline = (data[0] || {}).airline || '';
    const labelOf = {}; for (const l of legs) { if (!labelOf[l.dep]) labelOf[l.dep] = l.depCity || l.dep; if (!labelOf[l.arr]) labelOf[l.arr] = l.arrCity || l.arr; }
    let codes;
    if (legs.length === 1) codes = [legs[0].dep, legs[0].arr];
    else { const ch = chainLegs(legs); if (!ch) return null; codes = []; ch.forEach((l, i) => { if (i === 0) codes.push(l.dep); codes.push(l.arr); }); } // pas chaînable proprement → ambigu, on n'invente pas
    const uniq = codes.filter((c, i) => i === 0 || c !== codes[i - 1]).slice(0, 9);
    if (uniq.length < 2) return null;
    return { airline, stops: uniq.map((c) => ({ code: c, label: labelOf[c] || c })) };
  } catch (_) { return null; }
}
// Ordonne les segments d'une correspondance par chaînage (arrivée d'un vol = départ du suivant),
// quel que soit l'ordre de saisie. Renvoie null si non chaînable (aéroports manquants/boucle) → on garde l'ordre saisi.
function chainLegs(legs) {
  if (!legs || legs.length < 2) return legs;
  if (legs.some((l) => !l.dep || !l.arr)) return null;
  const norm = (x) => String(x || '').toUpperCase().trim();
  const start = legs.find((l) => !legs.some((o) => o !== l && norm(o.arr) === norm(l.dep)));
  if (!start) return null;
  const chain = [start]; let rem = legs.filter((l) => l !== start);
  while (rem.length) { const last = chain[chain.length - 1]; const next = rem.find((l) => norm(l.dep) === norm(last.arr)); if (!next) return null; chain.push(next); rem = rem.filter((l) => l !== next); }
  return chain;
}
// Extrait l'index de ligne (0-based) depuis un ID WATI de liste format "sectionIdx-rowIdx" : "0-2"→2, "0-0"→0
// NE traite PAS les IDs numériques simples ("1","2") qui sont des IDs de boutons WATI, pas des lignes de liste.
function listRowIdx(id) { if (!id) return -1; const m = /^\d+-(\d+)$/.exec(id); return m ? parseInt(m[1]) : -1; }
// Vol cliqué dans le bandeau « vols éligibles » du site (index.html) — ou client qui décrit son vol
// d'emblée. Le site préremplit un message type : « …j'ai été affecté par le vol AF718 du 08/06/2026,
// qui a été retardé… ». On en extrait vol + date + incident pour court-circuiter le questionnaire
// d'éligibilité (le bandeau ne liste que des vols Europe↔Afrique déjà vérifiés éligibles).
// Renvoie null si ce n'est pas un message « vol + incident » → on retombe sur le flux normal.
function parseTickerFlight(text) {
  const t = String(text || '');
  // n° de vol : priorité à celui qui suit « vol »/« flight » (le gabarit écrit « le vol AF718 »)
  const fm = t.match(/\b(?:vol|flight)\s+([A-Z]{2,3})\s?-?\s?(\d{1,4})\b/i)
          || t.toUpperCase().match(/\b([A-Z]{2,3})\s?(\d{1,4})\b/);
  if (!fm) return null;
  const vol = (fm[1] + fm[2]).toUpperCase();
  if (/^(CE|EU)\d{3}$/.test(vol) || vol.endsWith('2004')) return null; // « CE 261 »/« CE 261/2004 » = le règlement, pas un vol
  const low = t.toLowerCase();
  let incident = null;
  if (/(annul|cancel)/.test(low)) incident = 'annulation';
  else if (/(retard|delay)/.test(low)) incident = 'retard';
  if (!incident) return null; // ni retard ni annulation reconnaissable → ce n'est pas un clic « vol éligible »
  let date = '';
  const dm = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (dm) { const yy = dm[3].length === 2 ? '20' + dm[3] : dm[3]; if (isRealDate(dm[1], dm[2], yy)) date = `${dm[1].padStart(2, '0')}/${dm[2].padStart(2, '0')}/${yy}`; } // date invalide (25/00/2026…) → '' = redemandée dans le flux
  return { vol, incident, date };
}
// JJ/MM/AAAA → AAAA-MM-JJ (pour input[type=date]). Renvoie '' si pas une date complète.
function toISODate(d) { const m = (d || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : ''; }
// "NOM/PRENOM" (carte d'embarquement) → "PRENOM NOM". Sinon renvoie tel quel.
function cleanName(n) { n = (n || '').trim(); if (n.includes('/')) { const [a, b] = n.split('/'); return `${(b||'').trim()} ${(a||'').trim()}`.trim(); } return n; }
// Ville tapée librement (parcours correspondance guidé) : « dakar » → « Dakar », « dss » → « DSS ».
// '' = saisie inutilisable (vide, nombre, trop long) → on repose la question.
function cleanCity(input) {
  const c = String(input || '').replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim();
  if (c.length < 2 || c.length > 40 || /^\d+$/.test(c) || /^\[/.test(c) || !/[a-zà-öø-ÿ]/i.test(c)) return '';
  if (c.length === 3 && /^[a-z]{3}$/i.test(c) && c !== c.toLowerCase()) return c.toUpperCase(); // « DSS », « Cdg » = code aéroport
  return c.charAt(0).toUpperCase() + c.slice(1);
}
// Villes proposées en liste cliquable (max 9 + « Autre » : WhatsApp plafonne à 10 lignes).
// Départ/arrivée = corridor Afrique ↔ Europe (campagnes Dakar/Abidjan, diaspora FR/BE) ; escale = hubs.
const VILLES_COURANTES = [
  { v: 'Dakar', d: 'Sénégal' }, { v: 'Paris', d: 'France' }, { v: 'Abidjan', d: 'Côte d\'Ivoire' },
  { v: 'Bruxelles', d: 'Belgique' }, { v: 'Bamako', d: 'Mali' }, { v: 'Conakry', d: 'Guinée' },
  { v: 'Douala', d: 'Cameroun' }, { v: 'Marseille', d: 'France' }, { v: 'Lyon', d: 'France' },
];
const VILLES_HUBS = [
  { v: 'Casablanca', d: 'Royal Air Maroc' }, { v: 'Istanbul', d: 'Turkish Airlines' }, { v: 'Paris', d: 'Air France' },
  { v: 'Lisbonne', d: 'TAP Air Portugal' }, { v: 'Bruxelles', d: 'Brussels Airlines' }, { v: 'Addis-Abeba', d: 'Ethiopian' },
  { v: 'Alger', d: 'Air Algérie' }, { v: 'Tunis', d: 'Tunisair' }, { v: 'Dubaï', d: 'Emirates' },
];
// Interprète la réponse à une liste de villes : tap (id WATI « 0-N » ou titre), numéro du repli texte,
// « autre » → saisie libre, sinon le texte est traité comme une ville tapée directement.
function cityPick(input, id, cities) {
  if (id === 'ville_autre') return { autre: true };
  const ri = listRowIdx(id);
  if (ri >= 0) return ri < cities.length ? { city: cities[ri].v } : { autre: true };
  const t = String(input || '').trim().toLowerCase();
  if (/^\d{1,2}$/.test(t)) { const i = parseInt(t) - 1; if (i >= 0 && i < cities.length) return { city: cities[i].v }; if (i === cities.length) return { autre: true }; return null; }
  if (/\bautre\b/.test(t)) return { autre: true };
  const c = cleanCity(input);
  return c ? { city: c } : null;
}
async function sendCityList(phone, { header, body }, cities, cfg) {
  return sendList(phone, { header, body, buttonText: 'Ville ▾', items: cities.map((c) => ({ title: c.v, description: c.d })).concat([{ id: 'ville_autre', title: '✏️ Autre ville', description: 'Tapez son nom' }]) }, cfg);
}
// Stockage DURABLE du dossier sur Netlify Blobs (survit aux redémarrages Railway).
// Fire-and-forget : le serveur Railway étant persistant, le POST se termine en arrière-plan.
async function storeDossierDurable(ref, dossier) {
  try {
    await fetch('https://robindesairs.eu/api/dossier-store', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, dossier, secret: (process.env.WATI_WEBHOOK_SECRET || '').trim() }) });
  } catch (e) { console.error('storeDossierDurable', e.message); }
}

// Construit + stocke le dossier, renvoie le lien court mandat.html?r=REF
function buildMandatUrl(s, phone) {
  const idx = s.mandant_idx != null ? s.mandant_idx : 0;
  const mandant = (s.passengers && s.passengers[idx]) || {};
  const _routeParts = (s.route || '').split(/→|->|—|-/).map((x) => x.trim()).filter(Boolean);
  const _incidentCode = { retard: 'delay', annulation: 'cancel', refus: 'denied' }[s.incident] || '';
  const dossier = {
    ref: s.ref || '', phone: phone || '',
    name: cleanName(mandant.name || (s.names && s.names[0]) || s.nom || ''),
    dob: toISODate(mandant.dob || ''),
    address: mandant.adresse || '',
    vol: s.vol || '', date: s.date || '', pnr: s.pnr || '', compagnie: s.compagnie || '',
    route: s.route || '', depAirport: _routeParts[0] || '', arrAirport: _routeParts[_routeParts.length - 1] || '', motif: s.incident_libelle || '', incident: _incidentCode, pax: s.pax || 1, indemnite: perPaxOf(s),
    // Vérification vol (AeroDataBox) — destinée à l'équipe qui rappelle / au calcul de la lettre.
    flightVerdict: s.flightVerdict || '', flightChecked: !!s.flightChecked, flightDelayMin: (s.flightDelayMin != null ? s.flightDelayMin : ''), distanceKm: s.distanceKm || '',
    aVerifierExpert: ['a_verifier', 'hors_champ', 'sous_seuil'].includes(s.flightVerdict) || s.type_vol === 'escale',
    lang: s.langue_code || 'fr',
    passengers: (s.passengers || []).slice(0, s.pax || 1).map(p => ({ name: cleanName((p && p.name) || ''), dob: toISODate((p && p.dob) || '') })),
    cid: phone || '', lsa: new Date().toISOString(), source: 'wati-bot-v8',
  };
  if (s.ref) { DOSSIERS.set(s.ref, dossier); persistDossiers(); storeDossierDurable(s.ref, dossier).catch(() => {}); }
  return `https://robindesairs.eu/mandat.html?r=${encodeURIComponent(s.ref || '')}`;
}

// ─── OCR (Vision) ────────────────────────────────────────────────────────────
async function ocrBoardingPass(mediaUrl, cfg) {
  const key = process.env.OPENAI_API_KEY; if (!key || !mediaUrl) return null;
  try {
    const imgRes = await fetch(mediaUrl, { headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {}, signal: AbortSignal.timeout(20000) });
    if (!imgRes.ok) return null;
    const b64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');
    const prompt = `Tu lis une carte d'embarquement / e-billet d'avion. Réponds UNIQUEMENT en JSON :
{"vol":"","compagnie":"","date":"","pnr":"","depart":"","arrivee":"","nom":""}
Règles STRICTES :
- vol : numéro de vol en MAJUSCULES sans espace (ex. EJU7273, AF718).
- compagnie : nom complet (déduis du code IATA si besoin).
- date : "JJ/MM" si l'année N'EST PAS imprimée sur le document ; "JJ/MM/AAAA" UNIQUEMENT si l'année est réellement écrite. NE JAMAIS deviner ni inventer l'année (les cartes d'embarquement n'ont souvent pas l'année).
- pnr : référence de réservation (libellés possibles : PNR, Booking ref, Réf, Record locator, Confirmation) — 5 à 8 caractères ALPHANUMÉRIQUES, souvent près d'un code-barres. Cherche-la attentivement. Si vraiment absente, "".
- depart / arrivee : codes IATA 3 lettres.
- nom : nom du passager tel qu'imprimé (souvent "NOM/PRENOM" ou "NOM PRENOM", en MAJUSCULES). Si illisible ou absent, "".
- Champ inconnu = "". Ne JAMAIS inventer.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(45000), headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 300, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }] }] }),
    });
    const data = await res.json(); if (!data.choices) return null;
    const p = JSON.parse(data.choices[0].message.content);
    const vol = (p.vol || '').toUpperCase().replace(/\s+/g, '');
    const route = (p.depart && p.arrivee) ? `${p.depart} → ${p.arrivee}` : '';
    const pnr = (p.pnr || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Nom lu sur la carte → pré-remplit le passager 1 (le PASSEPORT reste la pièce qui fait foi, demandé ensuite).
    let nomRaw = (p.nom || '').toUpperCase().trim();
    nomRaw = nomRaw.replace(/\s+(MRS|MR|MS|MME|MLLE|MSTR|CHD|INF)\.?$/, '');          // titre séparé : « DIALLO/AMINATA MRS »
    nomRaw = nomRaw.replace(/^(.+\/.+?)(MRS|MSTR|CHD|INF)$/, '$1');                   // titre GDS collé : « DIALLO/AMINATAMRS » (pas MR/MS : trop de vrais noms finissent ainsi)
    const nom = cleanName(nomRaw);
    return { vol, compagnie: p.compagnie || deduceAirline(vol), date: p.date || '', pnr: /^[A-Z0-9]{5,8}$/.test(pnr) ? pnr : '', route, passengers: (nom && nom.length >= 3) ? [{ name: nom }] : [] };
  } catch (e) { return null; }
}
// ── E-billet / confirmation de réservation : extraction COMPLÈTE (vol+route+date+PNR+NOMS) ──
// PDF → Claude (bloc document) ; image(s) → gpt-4o. Accepte PLUSIEURS pages (e-billet photographié)
// → toutes téléchargées et envoyées en UN appel, le modèle fusionne.
async function extractEticketPages(mediaUrls, cfg) {
  const urls = (Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls]).filter(Boolean);
  if (!urls.length) return null;
  try {
    const parts = [];
    for (const u of urls) {
      const r = await fetch(u, { headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {}, signal: AbortSignal.timeout(20000) });
      if (!r.ok) continue;
      const mime = (r.headers.get('content-type') || '').split(';')[0].trim();
      parts.push({ bytes: Buffer.from(await r.arrayBuffer()), mime });
    }
    if (!parts.length) return null;
    const out = await extractEticketMultiLib(parts);
    if (out && out.vol && !out.compagnie) out.compagnie = deduceAirline(out.vol) || '';
    return out;
  } catch (e) { return null; }
}
// Convenance : une seule page (étape doc_eticket).
async function extractEticket(mediaUrl, cfg) { return extractEticketPages([mediaUrl], cfg); }
// Reporte (SANS écraser une valeur déjà confirmée) les infos d'un e-billet extrait dans l'état `s`.
function applyEticket(s, e) {
  if (!e) return;
  if (e.vol && !s.vol) s.vol = e.vol;
  if (e.compagnie && !s.compagnie) s.compagnie = e.compagnie;
  if (e.date && !s.date) s.date = e.date;
  if (e.pnr && !s.pnr) s.pnr = e.pnr;
  if (e.route && !s.route) s.route = e.route;
  if (e.escale && !s.type_vol) s.type_vol = 'escale';
  if (e.segments && e.segments.length > 1 && !(s.legs && s.legs.length)) s.legs = e.segments.map((x) => ({ vol: x.vol, dep: x.depart, arr: x.arrivee }));
  if (e.passengers && e.passengers.length) {
    s.names = s.names || []; s.passengers = s.passengers || [];
    e.passengers.forEach((p, i) => {
      if (p.name && !s.names[i]) s.names[i] = p.name.toUpperCase();
      const cur = s.passengers[i] || {};
      if (!cur.name && p.name) cur.name = p.name;
      if (!cur.dob && p.dob) cur.dob = p.dob;
      s.passengers[i] = cur;
    });
    if (!s.pax) s.pax = e.passengers.length;
  }
}
// Étape SCAN : on relit TOUTES les pages à chaque nouvelle photo → la lecture est complète, on écrase
// les champs e-billet (les corrections manuelles viennent APRÈS, via le menu de correction).
function setEticketFields(s, e) {
  if (!e) return;
  if (e.vol) s.vol = e.vol;
  if (e.compagnie) s.compagnie = e.compagnie;
  if (e.date) s.date = e.date;
  if (e.pnr) s.pnr = e.pnr;
  if (e.route) s.route = e.route;
  if (e.escale) s.type_vol = s.type_vol || 'escale';
  if (e.segments && e.segments.length > 1) s.legs = e.segments.map((x) => ({ vol: x.vol, dep: x.depart, arr: x.arrivee }));
  if (e.passengers && e.passengers.length) {
    s.names = s.names || []; s.passengers = s.passengers || [];
    e.passengers.forEach((p, i) => {
      s.names[i] = p.name.toUpperCase();
      const cur = s.passengers[i] || {}; cur.name = p.name; if (!cur.dob && p.dob) cur.dob = p.dob; s.passengers[i] = cur;
    });
    // Billet de GROUPE : si le billet liste PLUS de passagers que déclaré, on remonte le compte (jamais en silence → sinon des passagers tombent du mandat).
    if (e.passengers.length > (s.pax || 0)) s.pax = e.passengers.length;
  }
  // Signal qualité pour la carte de confirmation : lecture douteuse ou incomplète → on prévient au lieu de claironner « réussi ».
  s._scanWarn = (e.lisible === false) || (typeof e.confidence === 'number' && e.confidence < 0.5) || !(e.vol && (e.route || e.depart) && (e.date || e.pnr));
}
// Bascule l'état sur un trajet précis (aller OU retour) choisi par le client.
function applyTrajet(s, t) {
  if (!t) return;
  if (t.vol) s.vol = t.vol;
  if (t.date) s.date = t.date;
  if (t.route) s.route = t.route;
  s.type_vol = t.escale ? 'escale' : 'direct';
  if (t.segments && t.segments.length > 1) s.legs = t.segments.map((x) => ({ vol: x.vol, dep: x.depart, arr: x.arrivee }));
  else delete s.legs;
}
// Carte de confirmation du scan (affiche le nb de pages lues + invite à en envoyer d'autres).
async function scanConfirmCard(phone, s, cfg) {
  const pages = (s.scan_pages || []).length;
  const noms = (s.names || []).filter(Boolean);
  const paxLine = !noms.length ? `\n_(votre identité sera lue sur le passeport, plus tard)_`
    : noms.length < (s.pax || 1) ? `\n👤 ${noms.join(', ')} _(les identités des autres passagers viendront de leurs passeports)_`
    : `\n👥 ${noms.length} passager(s) : ${noms.join(', ')}`;
  const pageLine = pages > 1 ? `\n📄 ${pages} pages lues` : '';
  // Lecture douteuse/incomplète → on NE claironne PAS « réussi », on invite à vérifier (un caractère faux = rejet compagnie).
  const header = s._scanWarn
    ? `⚠️ J'ai lu votre billet, mais l'image était *difficile à lire*. Vérifiez bien le *n° de vol* et le *PNR* ci-dessous 👇`
    : pickVariant(phone, 'SCAN_REUSSI');
  return sendButtons(phone, { body: `${header}${pageLine}\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date ? `${s.date}${isValidStoredDate(s.date) ? ` (${dateEnLettres(s.date)})` : ''}` : '—'}\n🎫 PNR : ${s.pnr || '—'}\n🗺️ Trajet : ${s.route || '—'}${paxLine}\n\n_E-billet en plusieurs pages ? Envoyez-les, je complète._\nTout est correct ?`, buttons: [{ text: '✅ Oui' }, { text: '✏️ Corriger' }] }, cfg);
}
// Aller-retour détecté → on demande quel vol a été perturbé (l'e-billet ne dit pas ce qui a foiré).
async function askSens(phone, s, cfg) {
  s.step = 'scan_sens'; await setState(phone, s);
  const t = s.trajets || []; const a = t[0] || {}, r = t[1] || {};
  return sendButtons(phone, { body: `📑 Votre billet contient un *aller* et un *retour*.\nQuel vol a connu le problème (retard / annulation) ?\n\n🛫 *Aller* — ${a.route || '—'}${a.date ? ` · ${a.date}` : ''}\n🛬 *Retour* — ${r.route || '—'}${r.date ? ` · ${r.date}` : ''}`, buttons: [{ id: 'sens_aller', text: '🛫 L\'aller' }, { id: 'sens_retour', text: '🛬 Le retour' }] }, cfg);
}
// OCR passeport / CNI : lit nom + prénom + date de naissance (la magie aussi sur le passeport).
async function ocrPassport(mediaUrl, cfg) {
  const key = process.env.OPENAI_API_KEY; if (!key || !mediaUrl) return null;
  try {
    const imgRes = await fetch(mediaUrl, { headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {}, signal: AbortSignal.timeout(20000) });
    if (!imgRes.ok) return null;
    const b64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');
    const prompt = `Tu lis une pièce d'identité (PASSEPORT, carte nationale d'identité, titre de séjour, carte de résident…) — utilise aussi la zone MRZ en bas si présente. Réponds UNIQUEMENT en JSON :
{"nom":"","prenom":"","date_naissance":"","date_expiration":"","adresse":""}
Règles :
- nom : nom de famille en MAJUSCULES.
- prenom : prénom(s).
- date_naissance : format JJ/MM/AAAA. Convertis depuis la MRZ (AAMMJJ) si besoin, en déduisant le siècle logiquement (une naissance est dans le passé).
- date_expiration : date de fin de validité, format JJ/MM/AAAA (depuis la MRZ ou le champ imprimé). Si absente, "".
- adresse : champ "Adresse", "Domicile" ou "Address" visible sur la page (hors MRZ). Recopie tel quel sur une seule ligne. Si absent, "".
- Champ inconnu = "". Ne JAMAIS inventer.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(45000), headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 200, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }] }] }),
    });
    const data = await res.json(); if (!data.choices) return null;
    const p = JSON.parse(data.choices[0].message.content);
    const name = [p.prenom, p.nom].filter(Boolean).join(' ').toUpperCase().trim();
    const dob = (p.date_naissance || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ? p.date_naissance : '';
    const expiry = (p.date_expiration || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ? p.date_expiration : '';
    const adresse = (p.adresse || '').trim();
    return { name, dob, expiry, adresse };
  } catch (e) { return null; }
}

// ─── Classifieur : une photo envoyée = pièce d'identité, preuve de voyage, ou autre ──
async function classifyDoc(mediaUrl, cfg) {
  const FALLBACK = { kind: 'autre', nom: '', voyageType: '', lisible: true, probleme: '' };
  const key = process.env.OPENAI_API_KEY; if (!key || !mediaUrl) return FALLBACK;
  try {
    const imgRes = await fetch(mediaUrl, { headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {}, signal: AbortSignal.timeout(20000) });
    if (!imgRes.ok) return FALLBACK;
    const b64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');
    const prompt = `Tu classes une photo/capture envoyée par un passager, et tu juges sa QUALITÉ (une pièce illisible peut être refusée par la compagnie). Réponds UNIQUEMENT en JSON :
{"kind":"identite|voyage|autre","nom":"","voyageType":"ebooking|carte|","lisible":true,"probleme":""}
- "identite" : passeport, carte nationale d'identité (CNI), titre de séjour. Mets dans "nom" le NOM et prénom lus (MAJUSCULES).
- "voyage" : preuve de voyage. voyageType="ebooking" si CONFIRMATION DE RÉSERVATION / e-billet / itinéraire (liste souvent PLUSIEURS passagers et/ou PLUSIEURS vols). voyageType="carte" si CARTE D'EMBARQUEMENT (un seul passager / un seul vol).
- "autre" : tout le reste.
- "lisible" : false si la photo est FLOUE, SOMBRE, COUPÉE, avec REFLET, ou si les informations clés (nom, n° de pièce) ne sont pas lisibles avec certitude. Sinon true.
- "probleme" : si lisible=false, un mot : "flou" | "sombre" | "coupé" | "reflet" | "illisible".
Champ inconnu = "". Ne JAMAIS inventer un nom si la photo est illisible.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(45000), headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 140, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }] }] }),
    });
    const data = await res.json(); if (!data.choices) return FALLBACK;
    const p = JSON.parse(data.choices[0].message.content);
    return { kind: ['identite', 'voyage', 'autre'].includes(p.kind) ? p.kind : 'autre', nom: (p.nom || '').toUpperCase().trim(), voyageType: p.voyageType || '', lisible: p.lisible !== false, probleme: p.probleme || '' };
  } catch (e) { return FALLBACK; }
}

// ─── État des pièces (déterministe) : quel passager n'a pas sa pièce ? preuve de voyage ? ──
function paxName(s, i) { const p = (s.passengers || [])[i] || {}; return p.name || (s.names && s.names[i]) || `Passager ${i + 1}`; }
// Enregistre une carte d'embarquement reçue, par NOM (1 carte = 1 passager prouvé). Dédupliqué.
function addCarteName(s, name) {
  const n = String(name || '').trim().toUpperCase();
  if (n.length < 3) return;
  s.carteNames = s.carteNames || [];
  if (!s.carteNames.includes(n)) s.carteNames.push(n);
}
function docsStatus(s) {
  const pax = s.pax || ((s.passengers && s.passengers.length) || 1);
  const missingId = [];
  for (let i = 0; i < pax; i++) {
    const p = (s.passengers || [])[i] || {};
    const provided = !!(p && !p.skipped && p.idReceived); // SEULE une vraie photo de pièce compte — un nom/DDN (e-billet ou saisie) ne remplace PAS la CNI/passeport
    if (!provided) missingId.push(paxName(s, i));
  }
  // Preuve de voyage : un E-BILLET liste TOUS les passagers → couvre tout le groupe (et toutes les escales).
  // Une CARTE D'EMBARQUEMENT ne prouve qu'1 personne → il en faut 1 par passager (suivi par nom).
  const eBillet = (s.travelProof === 'ebooking');
  const carteNames = (s.carteNames || []).map((x) => String(x).toUpperCase());
  const travelProofOk = pax <= 1 ? !!s.travelProof : (eBillet || carteNames.length >= pax);
  // Passagers sans carte (par nom) — sert au message « il manque la preuve de X ».
  const missingTravel = travelProofOk ? [] : (() => {
    const set = new Set(carteNames); const out = [];
    for (let i = 0; i < pax; i++) { const nm = paxName(s, i); if (!set.has(String(nm).toUpperCase())) out.push(nm); }
    return out;
  })();
  return { missingId, travelProofOk, missingTravel, complete: missingId.length === 0 && travelProofOk };
}
// Indices des passagers SANS pièce d'identité
function missingIdIndices(s) {
  const pax = s.pax || ((s.passengers && s.passengers.length) || 1); const out = [];
  for (let i = 0; i < pax; i++) { const p = (s.passengers || [])[i] || {}; if (!(p && !p.skipped && p.idReceived)) out.push(i); }
  return out;
}
// ─── Moteur d'attribution pièce→passager (robuste, SANS jamais demander au client) ──
// Anticipe : nom de jeune fille/épouse, ordre inversé, translittération, particules,
// homonymes/fratrie, GDS collé, prénoms composés. En cas de doute → expert (idx=-1).
const nmMARK = new Set(['nee', 'epouse', 'ep', 'vve', 'veuve', 'dite', 'div', 'divorcee', 'veuf']);
const nmTITLE = new Set(['m', 'mr', 'mme', 'mrs', 'ms', 'mstr', 'chd', 'inf', 'dr', 'mlle', 'sir', 'feu']);
const nmSYN = { mohamed: 'mohammed', mohammed: 'mohammed', muhammad: 'mohammed', cheikh: 'cheikh', cheick: 'cheikh', sheikh: 'cheikh', aissatou: 'aissata', aissata: 'aissata', ousmane: 'ousmane', ousman: 'ousmane', abdoulaye: 'abdoulaye', abdallah: 'abdoulaye', bah: 'ba' };
function nmSyn(t) { return nmSYN[t] || t; }
function nmStrip(x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function nmLev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; const d = [...Array(m + 1)].map((_, i) => [i, ...Array(n).fill(0)]); for (let j = 0; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
function nmTok(a, b) { a = nmSyn(a); b = nmSyn(b); if (a === b) return 1; if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return 0.85; if (a.length >= 4 && b.length >= 4 && nmLev(a, b) <= 2) return 0.6; if ((a.length === 1 && b[0] === a) || (b.length === 1 && a[0] === b)) return 0.4; return 0; }
function nmBest(d, p) { let m = 0; for (const x of d) for (const y of p) { const s = nmTok(x, y); if (s > m) m = s; } return m; }
function nmToks(name) { let t = nmStrip(name).replace(/'/g, '').replace(/[\/\-_.]/g, ' ').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean); const isBoarding = /embarq|boarding|flight/.test(nmStrip(name)); t = t.filter((w) => !nmMARK.has(w) && !nmTITLE.has(w) && w.length >= 2).map(nmSyn); return { t, isBoarding }; }
function nmAttribute(docName, passengers, alreadyDone) {
  const done = new Set((alreadyDone || []).map(Number));
  const P = passengers.map((full, i) => { const a = nmStrip(full).replace(/'/g, '').replace(/[\/\-_.]/g, ' ').split(/\s+/).filter(Boolean).map(nmSyn); return { i, given: a.slice(0, 1), last: a.slice(1).length ? a.slice(1) : a.slice(0, 1), all: a, done: done.has(i) }; });
  const pending = P.filter((p) => !p.done);
  if (!pending.length) return { idx: -1, confident: false, reason: 'AUCUN_PENDING' };
  const { t: dt, isBoarding } = nmToks(docName);
  if (isBoarding) return { idx: -1, confident: false, reason: 'PAS_UNE_PIECE' };
  if (dt.length < 1) return { idx: -1, confident: false, reason: 'ININTELLIGIBLE' };
  if (dt.length === 1 && dt[0].length >= 8) { // GDS collé
    const blob = dt[0].replace(/(mrs|mstr|chd|inf|mr|ms)$/, '');
    const c = pending.filter((p) => p.all.length >= 2 && p.all.every((pt) => blob.includes(pt)));
    if (c.length === 1) return { idx: c[0].i, confident: true, reason: 'GDS_CONCAT' };
    if (c.length >= 2) return { idx: -1, confident: false, reason: 'GDS_AMBIGU' };
  }
  const scored = pending.map((p) => { const lastScore = nmBest(dt, p.last); const firstScore = nmBest(dt, p.given); const matched = p.all.filter((pt) => dt.some((d) => nmTok(d, pt) >= 0.85)).length; const unmatched = dt.filter((d) => p.all.every((pt) => nmTok(d, pt) < 0.85)); return { p, lastScore, firstScore, matched, unmatched, strong: (lastScore >= 0.85 && firstScore >= 0.6) || matched >= 2 }; });
  const sameLast = scored.filter((s) => s.lastScore >= 0.85).length;
  const strongHits = scored.filter((s) => s.strong);
  if (sameLast >= 2) { const ex = scored.filter((s) => s.lastScore >= 0.85 && nmBest(dt, s.p.given) >= 1.0); if (ex.length === 1) return { idx: ex[0].p.i, confident: true, reason: 'FRATRIE_PRENOM_EXACT' }; return { idx: -1, confident: false, reason: 'FRATRIE_AMBIGU' }; }
  if (strongHits.length === 1) return { idx: strongHits[0].p.i, confident: true, reason: 'NOM_PRENOM' };
  if (strongHits.length >= 2) return { idx: -1, confident: false, reason: 'HOMONYMIE' };
  if (pending.length === 1) {
    const o = scored[0];
    if (o.lastScore >= 0.85) { if (o.firstScore >= 0.6) return { idx: o.p.i, confident: true, reason: 'ELIMINATION' }; if (o.unmatched.length === 0) return { idx: o.p.i, confident: false, reason: 'ELIM_NOM_SEUL' }; return { idx: -1, confident: false, reason: 'PRENOM_CONTRADICTOIRE' }; }
    if (o.firstScore >= 0.85 && o.lastScore >= 0.6) return { idx: o.p.i, confident: true, reason: 'ELIM_TRANSLIT' };
    if (o.firstScore >= 0.85) return { idx: -1, confident: false, reason: 'JEUNE_FILLE_NOM_ETRANGER' };
    if (dt.length <= 1 && o.firstScore === 0) return { idx: o.p.i, confident: false, reason: 'ELIM_ILLISIBLE' };
    return { idx: -1, confident: false, reason: 'NOM_ETRANGER' };
  }
  return { idx: -1, confident: false, reason: 'DOUTE' };
}
// Adaptateur : depuis l'état du dossier (done = indices ayant déjà une pièce)
function attributeId(s, nom) {
  const pax = s.pax || ((s.passengers && s.passengers.length) || 1);
  const names = []; for (let i = 0; i < pax; i++) names.push(paxName(s, i));
  const miss = missingIdIndices(s);
  const done = [...Array(pax).keys()].filter((i) => !miss.includes(i));
  return nmAttribute(nom, names, done);
}
// Formate la liste des pièces manquantes (texte WhatsApp)
function missingDocsText(s) {
  const st = docsStatus(s); const miss = [];
  if (st.missingId.length) miss.push(`la *pièce d'identité* de *${st.missingId.join('*, *')}*`);
  if (!st.travelProofOk) {
    if ((s.pax || 1) <= 1) miss.push(`votre *carte d'embarquement* ou *e-billet*`);
    else if (st.missingTravel.length && st.missingTravel.length < s.pax) miss.push(`la *preuve de voyage* de *${st.missingTravel.join('*, *')}* — sa *carte d'embarquement*, ou un *e-billet* qui liste tout le monde`);
    else miss.push(`une *preuve de voyage par passager* : une *carte d'embarquement* pour chacun, ou un seul *e-billet* qui les liste tous`);
  }
  if (miss.length) return `📎 Il manque encore : ${miss.join(' et ')}.`;
  return fillTpl(pickRV(s.ref || '', 'DOC_COMPLET'), { REF: s.ref || '', TOTAL: (600 * (s.pax || 1)) + ' €', NOM: firstNameOf(s) }) || `🎉 Toutes vos pièces sont là, merci ! Notre équipe prend le relais.`;
}

// Pièce expirée (date d'expiration passée) ?
function isExpired(dateStr) { const m = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return false; return new Date(+m[3], +m[2] - 1, +m[1]).getTime() < Date.now(); }

// ─── OCR confirm helper ─────────────────────────────────────────────────────────
// Lit la pièce, affiche le résumé et demande confirmation avant de stocker.
async function askOcrConfirm(phone, s, cfg, mediaUrl) {
  const i = s.doc_idx + 1;
  const pp = await ocrPassport(mediaUrl, cfg);
  if (pp && (pp.name || pp.dob)) {
    const minor = pp.dob ? isMinorAt(pp.dob, s.date) : false;
    const expired = pp.expiry ? isExpired(pp.expiry) : false;
    s.doc_pending = { name: pp.name || '', dob: pp.dob || '', expiry: pp.expiry || '', expired, minor, adresse: pp.adresse || '', viaPhoto: true };
    s.step = 'doc_pass_confirm';
    await setState(phone, s);
    const lines = [
      `📋 *Passager ${i}/${s.pax} — j'ai lu :*`,
      `👤 ${pp.name || '—'}`,
      pp.dob ? `🎂 Né(e) le ${pp.dob}` : '',
      minor ? `👶 *Mineur·e* — signature parentale requise` : '',
      expired ? `⚠️ Pièce *expirée* (${pp.expiry}). On continue, un conseiller vérifiera.` : '',
      `\nC'est bien cette personne ?`,
    ].filter(Boolean).join('\n');
    await send(phone, lines, cfg);
    return sendButtons(phone, [{ id: 'pass_ok', text: '✅ C\'est correct' }, { id: 'pass_fix', text: '✏️ Corriger' }], cfg);
  } else {
    // OCR échoué → pièce illisible
    s.step = 'doc_pass';
    await setState(phone, s);
    return send(phone, `😕 Je n'arrive pas à lire cette pièce (photo un peu sombre ou floue ?). Pas de souci, ça arrive 🙏 Réessayez avec une meilleure photo, ou tapez *saisir* pour entrer le nom et la date de naissance.`, cfg);
  }
}

// ─── Helpers prescription / dates ──────────────────────────────────────────────
// Date calendaire RÉELLE ? JS « corrige » en silence (mois 00 → décembre de l'année
// d'avant), donc 25/00/2026 passait inFuture/tooOld sans broncher. On vérifie ici.
function isRealDate(dd, mm, yyyy) {
  const d = +dd, m = +mm, y = +yyyy;
  if (!(y >= 1900 && y <= 2099) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d; // 30/02 etc. débordent
}
// Saisie libre → 'JJ/MM/AAAA' normalisé si c'est une vraie date, sinon null.
// century : préfixe pour les années à 2 chiffres ('20' vol, '19' naissance).
function parseDateInput(input, century) {
  const m = String(input || '').match(/(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})/);
  if (!m) return null;
  if (m[3].length === 3) return null; // « 15/03/202 » = année tronquée, pas une date
  const yy = m[3].length === 2 ? (century || '20') + m[3] : m[3];
  if (!isRealDate(m[1], m[2], yy)) return null;
  return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${yy}`;
}
// La date du state (OCR ou ancienne saisie) est-elle complète ET réelle ?
function isValidStoredDate(d) { const m = (d || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return !!m && isRealDate(m[1], m[2], m[3]); }
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
// '15/03/2026' → '15 mars 2026' (confirmation lisible, lève les inversions JJ/MM).
function dateEnLettres(d) { const m = (d || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!m) return d || ''; const j = +m[1]; return `${j === 1 ? '1er' : j} ${MOIS_FR[+m[2] - 1]} ${m[3]}`; }
const DATE_INVALIDE = (txt) => `🤔 *${txt}* n'existe pas dans le calendrier (vérifiez le jour et le mois).\nRenvoyez la date au format *JJ/MM/AAAA* _(ex. 15/03/2026 pour le 15 mars 2026)_ :`;
function tooOld(dateStr) { const m = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return false; const d = new Date(+m[3], +m[2] - 1, +m[1]); return (Date.now() - d.getTime()) > 5 * 365.25 * 864e5; }
// Date sans année (ex. "15/07") → il faut demander l'année (ne jamais la deviner).
function needYear(d) { return /^\d{1,2}\/\d{1,2}$/.test((d || '').trim()); }
// Date dans le futur (> demain) → impossible pour un vol déjà perturbé.
function inFuture(dateStr) { const m = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return false; return new Date(+m[3], +m[2] - 1, +m[1]).getTime() > Date.now() + 864e5; }
// Mineur à la date du vol (ou aujourd'hui si date vol inconnue) à partir de la date de naissance.
function isMinorAt(dob, flightDateStr) {
  const b = (dob || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!b) return false;
  const birth = new Date(+b[3], +b[2] - 1, +b[1]);
  const f = (flightDateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const ref = f ? new Date(+f[3], +f[2] - 1, +f[1]) : new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  if (ref.getMonth() < birth.getMonth() || (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate())) age--;
  return age < 18;
}
const FUTURE_JOKE = `😄 Là vous voyagez dans le futur ! Ce vol n'a pas encore eu lieu — on ne peut réclamer que pour un vol *déjà passé*. 🪄\n\nDonnez-moi la *vraie* date du vol (JJ/MM/AAAA) :`;
function recentYears() { const base = new Date().getFullYear(); return [base, base - 1, base - 2, base - 3, base - 4]; }

const STOP_FOOTER = '_L\'équipe Robin des Airs 🏹_';

// ─── Responder IA hors-tunnel (inline) ─────────────────────────────────────────
const AI = (() => {
  const SENSITIVE = /(avocat|tribunal|proc[e\u00e8]s|plainte|litige|rembours|parler\s+[\u00e0a]\s+(quelqu|un humain|une personne|un conseiller|un agent)|un (vrai )?humain|[\u00eae]tre rappel|rappelez)/i;
  const FAQ = /(arnaque|escroc|fiable|s[\u00e9e]rieux|confiance|garantie|combien|c'?est quoi|fonctionne|(\u00e7|c|s)a\s*marche|(\u00e7a|ca)\s*(co\u00fbte|coute)|\bco[u\u00fb]te?\b|cher|\bprix\b|tarif|gratuit|frais|commission|payer|paiement|montant|euros?|\u20ac|orange\s*money|wave|mobile\s*money|virement|d[\u00e9e]lai|temps|long|semaine|mois|attente|quand|rembours|\bdroit\b|\u00e9ligib|document|passeport|carte|donn[\u00e9e]es|rgpd|s[\u00e9e]curis|comment|pourquoi)/i;
  function isClientQuestion(text) { const t = (text || '').trim(); if (!t || /^\d+$/.test(t) || t.length < 5) return false; if (t.includes('?')) return true; return FAQ.test(t); }
  function isSensitive(text) { return SENSITIVE.test(text || ''); }
  async function answerClientQuestion(text, apiKey) {
    if (!apiKey) return null;
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', signal: AbortSignal.timeout(45000), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey }, body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 320, temperature: 0.5, messages: [{ role: 'system', content: FAQ_SYSTEM_PROMPT + '\n\n# BASE FAQ DE R\u00c9F\u00c9RENCE\n' + FAQ_KNOWLEDGE }, { role: 'user', content: String(text || '').slice(0, 2000) }] }) });
      const json = await res.json().catch(() => ({}));
      return json.choices?.[0]?.message?.content?.trim() || null;
    } catch (e) { return null; }
  }
  return { isClientQuestion, isSensitive, answerClientQuestion };
})();

// ═══════════════ MACHINE À ÉTATS v8 ═══════════════
// Archive durable d'une pièce envoyée au bot (passeport/CNI, carte d'embarquement, e-billet,
// certificat, reçu de frais) → Netlify Blobs (store 'pieces', clé wa/<tel>/…). Best-effort :
// télécharge l'image WATI puis la pousse vers /api/piece-store. N'impacte jamais le parcours.
async function archivePiece(phone, kind, mediaUrl, cfg) {
  try {
    if (!phone || !mediaUrl) return;
    const r = await fetch(mediaUrl, { headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {}, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return;
    const mime = (r.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > 8000000) return;
    await fetch('https://robindesairs.eu/api/piece-store', {
      method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, kind: kind || 'piece', mime, dataBase64: buf.toString('base64'), secret: (process.env.WATI_WEBHOOK_SECRET || '').trim() }),
    });
  } catch (e) { console.error('archivePiece', e.message); }
}
async function handleMessage(phone, text, cfg, mediaUrl, replyId, _retried) {
  const input = (text || '').trim();
  const lower = input.toLowerCase();
  const id = replyId || ''; // id du bouton/liste envoyé par WATI (ex: 'pass_ok', 'mdt_0'…)
  // Re-dispatch : si l'état a avancé entre la lecture et le traitement (race Blobs),
  // on re-lit l'état et on relance une fois. Évite le silence quand le bouton incident
  // arrive pendant que l'écriture route→incident est en cours.
  const redispatch = async (currentStep) => {
    if (_retried) return; // une seule tentative
    const fresh = await getState(phone);
    if (fresh && fresh.step !== currentStep) {
      console.log(`[v8 redispatch] ${phone}: ${currentStep}→${fresh.step} pour "${input.slice(0,30)}"`);
      return handleMessage(phone, text, cfg, mediaUrl, replyId, true);
    }
  };

  // T1 — menu / reset
  if (['nouveau', 'new', 'reset', '/reset', 'recommencer'].includes(lower)) { await clearState(phone); return sendAccueil(phone, cfg); }
  if (['go', 'menu', 'start', 'reprendre', 'continuer', 'suite', 'bonjour', 'hello', 'hi', 'salut'].includes(lower) || id === 'menu') {
    const cur = await getState(phone);
    if (cur && cur.step && cur.step !== 'accueil' && cur.step !== 'done') { await send(phone, `👋 Re-bonjour ! On reprend votre dossier là où vous vous étiez arrêté.`, cfg); return relancerEtape(phone, cur, cfg); }
    await clearState(phone); return sendAccueil(phone, cfg);
  }

  let s = await getState(phone);

  // Archive durable de TOUTE pièce envoyée (image/PDF) → Blobs, best-effort, ne bloque pas le flux.
  // Clé par téléphone (la réf n'existe pas encore en collecte) ; la récupération résout réf→tel.
  if (mediaUrl) {
    const KIND = { doc_pass: 'identite', doc_pass_confirm: 'identite', doc_boarding: 'carte-embarquement', doc_eticket: 'ebillet', doc_cert: 'certificat', done: 'justificatif', frais: 'frais' };
    archivePiece(phone, KIND[s.step] || 'document', mediaUrl, cfg).catch(() => {});
  }

  // T1.2 — Demande de rappel humain : à tout moment (hors étapes documents qui ont leur propre "appel"),
  // "appel" flague le dossier pour la liste « À rappeler » du Bureau et rassure le client.
  if (id === 'appel' || ((lower === 'appel' || lower === 'rappel' || lower === 'rappelez-moi' || lower === 'rappeler')
      && !(s && (s.step === 'doc_boarding' || s.step === 'doc_eticket')))) {
    upsertLead(phone, { wantsCall: true, wantsCallAt: Date.now(), lastClientAt: Date.now() });
    return send(phone, `📞 *C'est noté !* Un vrai conseiller Robin des Airs — un humain, pas un robot 🙂 — vous rappelle très vite.\n\n👉 On vous appelle depuis le *+33 7 56 86 36 30* : enregistrez-le tout de suite sous « *Robin des Airs* » pour reconnaître l'appel et *décrocher* (sinon il s'affiche comme un numéro inconnu).\n\n🔒 C'est bien nous, jamais une arnaque : *0 € tant qu'on ne gagne pas*, et on ne vous demandera jamais de payer au téléphone.\n\nPas dispo ? Répondez ici quand vous voulez, ou écrivez *go* pour reprendre. 🙏`, cfg);
  }

  // T1.2b — « J'ai déjà signé » (bouton des relances signature) : FILET DE SÉCURITÉ si le webhook de
  // signature a échoué (le « signé » n'est pas remonté). 1 tap → on stoppe les relances tout de suite,
  // et on alerte l'équipe pour vérifier (au cas où ce ne serait pas réellement signé).
  if (id === 'deja_signe' || lower === 'déjà signé' || lower === 'deja signe' || lower === "j'ai déjà signé" || lower === "j'ai signé" || lower === 'jai signe') {
    const okMark = markLeadSigned(phone);
    const _l = LEADS.get(leadKey(phone)) || {};
    notifyOwnerWhatsApp(phone, `🖊️ « Déjà signé » déclaré par le client (${_l.ref || phone}) → relances STOPPÉES${okMark ? '' : ' (lead introuvable)'}. ⚠️ À VÉRIFIER : si le mandat n'est pas réellement signé (webhook manqué), relancer manuellement.`).catch(() => {});
    return send(phone, `Merci ! ✅ On arrête les rappels. Si jamais votre signature n'était pas encore arrivée chez nous, un conseiller vous le dira — sinon, votre dossier suit son cours. 🙏`, cfg);
  }

  // T1.3 — « Plus tard » : le client veut reprendre plus tard. Son tap a déjà rouvert la fenêtre 24h (gratuit) ;
  // on garde le dossier ouvert SANS le harceler → on ne laisse qu'une relance, près du bord de la fenêtre (~22h).
  if (id === 'snooze' || lower === 'plus tard' || lower === 'demain' || lower === 'tard') {
    const nm = firstNameOf(s);
    const _l = LEADS.get(leadKey(phone)) || {};
    const _patch = { lastClientAt: Date.now() };
    if (!_l.completed) _patch.nudges = ['e3', 'e14']; // engagé : ne garde que la dernière relance « bord de fenêtre »
    upsertLead(phone, _patch);
    return send(phone, `👍 C'est noté${nm ? ' ' + nm : ''} — je garde votre dossier au chaud, on ne le ferme pas. Reprenez quand vous voulez en écrivant *go*. Je vous ferai juste un petit rappel plus tard, sans insister. 🙏`, cfg);
  }

  // T1.5 — Vol cliqué dans le bandeau « vols éligibles » du site (premier contact) ──────────────
  // Le site préremplit « …le vol AF718 du 08/06/2026, qui a été retardé… ». On enregistre le vol
  // directement et on SAUTE le questionnaire d'éligibilité : on demande seulement la correspondance,
  // puis on continue vers passagers → pièces → mandat. Plus de fallback IA générique « tapez menu ».
  // Garde-fou : uniquement tant qu'aucun vol n'est saisi et avant le tunnel détaillé (jamais en plein dossier),
  // et jamais sur un tap bouton/liste (id présent → flux interactif prioritaire).
  {
    const EARLY = ['accueil', 'go_langue', 'langue', 'route', 'route_zone', 'incident', 'duree', 'annul_delai'];
    if (!id && !s.vol && (!s.step || EARLY.includes(s.step))) {
      const tk = parseTickerFlight(input);
      if (tk) {
        const f = { route_type: 'af_eu', fromTicker: true, names: [] };
        if (s.langue) { f.langue = s.langue; f.langue_code = s.langue_code; f.escalade = s.escalade; }
        f.vol = tk.vol; f.compagnie = deduceAirline(tk.vol) || '';
        if (tk.date) f.date = tk.date;
        const dStr = tk.date ? ` du *${tk.date}*` : '';
        // Annulation : on passe par le gate des 14 jours AVANT de continuer (même via lien prérempli).
        if (tk.incident === 'annulation') {
          f.incident = 'annulation'; f.incident_libelle = 'Annulation'; f.step = 'annul_delai';
          await setState(phone, f);
          await send(phone, `✅ C'est noté — votre *vol ${tk.vol}*${dStr} a été *annulé*. 🎯`, cfg);
          return sendAnnulDelai(phone, f, cfg);
        }
        f.step = 'q_corr'; f.incident = 'retard'; f.incident_libelle = 'Retard +3h'; f.duree_retard = '+3h';
        await setState(phone, f);
        return sendButtons(phone, { body: `✅ C'est noté — votre *vol ${tk.vol}*${dStr} a été *retardé*. 🎯\nCe type de vol Europe ↔ Afrique est *souvent éligible* jusqu'à *600 € par passager*. 🎉\n\nPour ne rien oublier : ce vol faisait-il partie d'une *correspondance* (un autre vol juste avant ou juste après) ?`, buttons: [{ id: 'corr_direct', text: '✈️ Non, vol direct' }, { id: 'corr_escale', text: '🔄 Oui, correspondance' }] }, cfg);
      }
    }
  }

  // T2 — fallback IA hors-flux (question libre) → réponse + boutons
  // ⚠️ Jamais intercepté si c'est une réponse interactive (bouton/liste) : replyId présent → flux prioritaire
  try {
    const { isClientQuestion, isSensitive, answerClientQuestion } = AI;
    const FREE = ['m_vol', 'm_date', 'm_route', 'm_dep', 'm_arr', 'm_stop_arr', 'm_pnr', 'leg_count', 'leg_input', 'esc_dep', 'esc_via', 'esc_arr', 'esc_vol', 'names', 'mineurs_which', 'fix_vol', 'fix_date', 'fix_nom', 'fix_route', 'fix_pnr', 'fix_nom_which', 'names_fix_which', 'names_fix_one', 'doc_name', 'doc_dob', 'doc_adresse'];
    const looks = !id && (FREE.includes(s.step) ? input.includes('?') : isClientQuestion(input));
    if (looks) {
      if (isSensitive(input)) { await send(phone, `Je transmets votre demande à un conseiller Robin des Airs. 🙏\nÉcrivez *go* pour continuer votre dossier.`, cfg); return; }
      const r = await answerClientQuestion(input, process.env.OPENAI_API_KEY);
      await sendButtons(phone, { body: (r || `🤖 Je suis l'assistant IA de Robin des Airs.`) + `\n\n👉 *Démarrez* ci-dessous 👇`, buttons: [{ text: '📋 Démarrer' }, { text: '📞 Être rappelé' }] }, cfg);
      return;
    }
  } catch (e) {}

  // ACCUEIL (MSG1)
  if (s.step === 'accueil' || !s.step) return sendAccueil(phone, cfg);

  // Bouton MSG1 « Vérifier mon indemnité » / « Commencer / Démarrer »
  if (s.step === 'go_langue') { return sendLangue(phone, s, cfg); }

  // MSG2 — LANGUE
  if (s.step === 'langue') {
    // Matching par ID WATI liste ("0-N") si disponible, sinon par texte/flag
    const ri = listRowIdx(id);
    const langArr = Object.values(LANGS);
    const L = (ri >= 0 && langArr[ri]) ? langArr[ri] : matchLang(input);
    if (!L) return sendLangue(phone, s, cfg);
    s.langue = `${L.flag} ${L.label}`; s.langue_code = L.code;
    if (L.africaine) { s.escalade = 'langue_africaine'; await send(phone, `${L.natif}\n📱 +33 7 56 86 36 30\n\n🤝 Votre dossier est entre de bonnes mains.\n📞 Un expert parlant votre langue *vous appellera* pour vous accompagner.\nEn attendant, je continue à vous guider en français. 👇`, cfg); }
    await setState(phone, s); return askRouteZone(phone, s, cfg);
  }

  // MSG3 — ROUTE : qualification CE 261 en 1 tap (le voyage touche-t-il l'Europe ?).
  // Le détail ville-par-ville n'est demandé QUE pour une correspondance (steps esc_*).
  if (s.step === 'route_zone') {
    const n = normInput(input, ['commence', 'arrive', 'ni']);
    if (id === 'rz_dep' || n === '1' || lower.includes('commence') || /d[ée]part|d[ée]coll|\bpars?\b/.test(lower)) {
      s.route_type = 'af_eu'; s.europeTouch = 'depart'; s.step = 'incident'; await setState(phone, s);
      await send(phone, `✅ Départ d'Europe — vous êtes protégé(e) par le CE 261/2004. 👍`, cfg);
      return sendIncident(phone, s, cfg);
    }
    if (id === 'rz_arr' || n === '2' || lower.includes('arrive')) {
      s.route_type = 'af_eu'; s.europeTouch = 'arrivee'; s.step = 'incident'; await setState(phone, s);
      await send(phone, `✅ Arrivée en Europe — souvent couvert (un expert confirme selon la compagnie). On continue. 👍`, cfg);
      return sendIncident(phone, s, cfg);
    }
    if (id === 'rz_non' || n === '3' || lower.includes('ni l') || lower === 'ni' || lower.includes('aucun')) {
      await clearState(phone);
      return send(phone, `😔 Si votre vol ne *part pas* d'Europe et n'*arrive pas* en Europe, il n'entre pas dans la loi européenne CE 261/2004.\n\n❓ En cas d'erreur (une escale en Europe compte !), écrivez *go*.\n\n${STOP_FOOTER}`, cfg);
    }
    return askRouteZone(phone, s, cfg);
  }
  // MSG3 — ROUTE (LEGACY : sessions déjà engagées sur l'ancienne question abstraite)
  if (s.step === 'route') {
    // Matching prioritaire : ID WATI de la liste (format "sectionIdx-rowIdx", 0-based)
    const ri = listRowIdx(id); // 0=Afrique↔EU, 1=EU↔EU, 2=Départ/arr EU, 3=Autre
    const n = normInput(input, ['afrique', 'europe ↔', 'départ', 'autre']);
    if (ri === 0 || n === '1' || (lower.includes('afrique') && lower.includes('europe'))) { s.route_type = 'af_eu'; }
    else if (ri === 1 || n === '2' || (lower.includes('europe') && !lower.includes('afrique') && !lower.includes('départ') && !lower.includes('arrivée'))) { s.route_type = 'eu_eu'; await send(phone, `🇪🇺 Les vols intra-européens sont couverts par le CE 261 ✅\nNotre spécialité c'est Afrique ↔ Europe, mais on continue.`, cfg); }
    else if (ri === 2 || n === '3' || (lower.includes('départ') && !lower.includes('retard'))) { s.route_type = 'mixte'; await send(phone, `🛫 Un départ ou une arrivée en Europe peut être éligible. Vérifions ensemble. ✅`, cfg); }
    else if (ri === 3 || n === '4' || lower.includes('autre')) { await clearState(phone); return send(phone, `😔 Votre vol ne semble pas couvert par la loi européenne.\n\nLe CE 261/2004 s'applique aux vols au départ/à l'arrivée d'un aéroport européen, ou opérés par une compagnie européenne.\n\n❓ Si erreur, écrivez *go* pour choisir une autre route.\n\n${STOP_FOOTER}`, cfg); }
    else return redispatch('route'); // si l'état a avancé → re-dispatch, sinon silence
    s.step = 'incident'; await setState(phone, s); return sendIncident(phone, s, cfg);
  }

  // MSG4 — INCIDENT
  if (s.step === 'incident') {
    const n = normInput(input, ['retard', 'annulation', 'refus']);
    if (n === '1' || lower.includes('retard')) { s.step = 'duree'; await setState(phone, s); return sendButtons(phone, { body: pickVariant(phone, 'REACTION_RETARD'), buttons: [{ text: '✅ Plus de 3 heures' }, { text: '❌ Moins de 3h' }, { text: '🤔 Je ne sais plus' }] }, cfg); }
    if (n === '2' || lower.includes('annul')) { s.incident = 'annulation'; s.incident_libelle = 'Annulation'; return sendAnnulDelai(phone, s, cfg); }
    if (n === '3' || lower.includes('refus') || lower.includes('embarq')) { s.incident = 'refus'; s.incident_libelle = "Refus d'embarquement"; await setState(phone, s); await send(phone, pickVariant(phone, 'REACTION_REFUS'), cfg); return estimationPuisPax(phone, s, cfg); }
    return redispatch('incident'); // si état avancé → re-dispatch
  }
  // MSG4b — ANNULATION : règle des 14 jours de préavis (art. 5 CE 261). Pré-filtre AVANT le n° de vol.
  // Le critère légal = écart NOTIFICATION → date du vol, pas « le vol est dans +/- 14 j à partir d'aujourd'hui ».
  if (s.step === 'annul_delai') {
    const n = normInput(input, ['ou moins', 'plus de', 'sais']); // mots-clés NON chevauchants (« 14 jours » est dans les 2 boutons)
    if (n === '2' || lower.includes('plus de 14')) { await clearState(phone); return send(phone, `${pickVariant(phone, 'STOP_ANNUL_14J')}\n\n${STOP_FOOTER}`, cfg); }
    if (n === '3' || lower.includes('sais') || lower.includes('souviens') || lower.includes('aucune idée')) { s.annul_preavis = 'inconnu'; s.escalade = s.escalade || 'preavis_inconnu'; await send(phone, pickVariant(phone, 'ANNUL_PREAVIS_INCONNU'), cfg); return continueAnnul(phone, s, cfg); }
    if (n === '1' || lower.includes('ou moins') || lower.includes('moins de 14') || lower.includes('14')) { s.annul_preavis = '<=14j'; await send(phone, pickVariant(phone, 'REACTION_ANNULATION'), cfg); return continueAnnul(phone, s, cfg); }
    return; // silence : on attend un tap valide
  }
  if (s.step === 'duree') {
    const n = normInput(input, ['plus de 3', 'moins de 3', 'sais']);
    if (n === '1' || lower.includes('plus de 3')) { s.incident = 'retard'; s.incident_libelle = 'Retard +3h'; s.duree_retard = '+3h'; return estimationPuisPax(phone, s, cfg); }
    if (n === '2' || lower.includes('moins de 3')) { await clearState(phone); return send(phone, `${pickVariant(phone, 'STOP_MOINS_3H')}\n\n${STOP_FOOTER}`, cfg); }
    if (n === '3' || lower.includes('sais') || lower.includes('souviens')) { s.incident = 'retard'; s.incident_libelle = 'Retard (à vérifier)'; s.duree_retard = 'inconnue'; s.escalade = s.escalade || 'duree_inconnue'; await send(phone, pickVariant(phone, 'DUREE_INCONNUE'), cfg); return estimationPuisPax(phone, s, cfg); }
    return; // silence
  }

  // MSG5 — PASSAGERS
  if (s.step === 'nb_pax') {
    const n = parseInt(normInput(input, ['1 passager', '2 passager', '3 passager', '4 passager', '5 passager', '6 ou plus']));
    if (n >= 1 && n <= 5) { s.pax = n; s.names = []; if (s.fromTicker) { await setState(phone, s); return afterPaxFromTicker(phone, s, cfg); } s.step = 'type_vol'; await setState(phone, s); return sendButtons(phone, { body: `${bar('type_vol')}\n✈️ C'était un vol direct ou avec escale(s) ?`, buttons: [{ text: '✈️ Vol direct' }, { text: '🔄 Avec escale' }] }, cfg); }
    if (n >= 6 || lower.includes('6 ou plus') || lower.includes('plus')) { s.step = 'nb_pax_exact'; await setState(phone, s); return send(phone, `${bar('nb_pax')}\n👥 *Combien de passagers en tout ?*\nIndiquez le nombre total (ex. 8). On gère votre groupe directement ici. 🤝`, cfg); }
    return; // silence
  }
  if (s.step === 'nb_pax_exact') {
    const m = input.match(/\d{1,2}/); const n = m ? parseInt(m[0]) : 0;
    if (n >= 1 && n <= 30) { s.pax = n; s.names = []; if (s.fromTicker) { await setState(phone, s); return afterPaxFromTicker(phone, s, cfg); } s.step = 'type_vol'; await setState(phone, s); return sendButtons(phone, { body: `${bar('type_vol')}\n✅ ${n} passagers — potentiellement *${montantTotal(n)} €*.\n\n✈️ C'était un vol direct ou avec escale(s) ?`, buttons: [{ text: '✈️ Vol direct' }, { text: '🔄 Avec escale' }] }, cfg); }
    return send(phone, `Indiquez le *nombre total* de passagers en chiffres (ex. 8) :`, cfg);
  }

  // MSG6 — TYPE VOL → MSG7 motivation → scan
  if (s.step === 'type_vol') {
    const n = normInput(input, ['direct', 'escale']);
    if (n === '2' || lower.includes('escale')) {
      // Escale = on POUSSE LA PHOTO d'abord (l'e-billet contient tous les segments → extraction en 1 coup).
      // La saisie manuelle leg par leg ne reste qu'en repli (bouton « Saisir à la main » → leg_count).
      s.type_vol = 'escale'; s.legs = []; s.legIdx = 0; s.step = 'scan'; await setState(phone, s);
      return sendButtons(phone, { body: `${bar('scan')}\n🎉 ${s.pax} passager${s.pax > 1 ? 's' : ''} = jusqu'à *${montantTotal(s.pax)} €* (*${montantNet(s.pax)} € nets*, 75 %). 🤝\n\n🔄 Le plus simple : une *photo* de votre *e-billet* (confirmation de réservation) — il contient *tous vos vols d'un coup*, correspondance incluse. Je lis tout, vous ne tapez rien.\n🎫 Pas d'e-billet ? Vos *cartes d'embarquement* aussi (une par vol).`, buttons: [{ id: 'scan_photo', text: '📸 Envoyer une photo' }, { id: 'scan_manuel', text: '✏️ Saisir à la main' }] }, cfg);
    }
    if (n === '1' || lower.includes('direct')) s.type_vol = 'direct';
    else return sendButtons(phone, { body: `${bar('type_vol')}\n✈️ Vol direct ou avec escale(s) ?`, buttons: [{ text: '✈️ Vol direct' }, { text: '🔄 Avec escale' }] }, cfg);
    s.step = 'scan'; await setState(phone, s);
    // Un seul message (motivation + scan) → réponse immédiate, pas de délai où les taps s'entrecroisent.
    return sendButtons(phone, { body: `${bar('scan')}\n🎉 ${s.pax} passager${s.pax > 1 ? 's' : ''} = jusqu'à *${montantTotal(s.pax)} €* (*${montantNet(s.pax)} € nets*, 75 %). Robin prélève 25 % *uniquement* si vous gagnez. 🤝\n\n⚡ Envoyez une *photo* de votre carte d'embarquement ou e-billet — je lis le vol automatiquement.${s.pax > 1 ? `\n👥 (une carte suffit pour le vol)` : ''}\n📄 _Votre mandat et le dossier pour la compagnie sont prêts plus vite._\n\n📎 *Envoyez la photo*, ou choisissez 👇`, buttons: [{ id: 'scan_photo', text: '📸 Envoyer une photo' }, { id: 'scan_manuel', text: '✏️ Saisir à la main' }] }, cfg);
  }
  // ── Correspondance « rapide » (raccourci bandeau) : vol déjà connu, on demande juste s'il y en avait un autre ──
  if (s.step === 'q_corr') {
    const n = normInput(input, ['direct', 'correspondance']);
    if (id === 'corr_escale' || n === '2' || lower.includes('corresp') || lower.includes('escale') || (lower.includes('oui') && !lower.includes('direct'))) {
      s.type_vol = 'escale'; await setState(phone, s);
      return sendPax(phone, s, cfg); // passagers d'abord, puis collecte des segments (flux escale standard)
    }
    if (id === 'corr_direct' || n === '1' || lower.includes('direct') || lower.includes('non') || lower.includes('seul') || lower.includes('aucun')) {
      s.type_vol = 'direct'; await setState(phone, s);
      return sendPax(phone, s, cfg); // passagers → vérif éligibilité (vol+date déjà connus) → récap
    }
    return sendButtons(phone, { body: `Ce vol faisait-il partie d'une *correspondance* (un autre vol juste avant ou juste après) ?`, buttons: [{ id: 'corr_direct', text: '✈️ Non, vol direct' }, { id: 'corr_escale', text: '🔄 Oui, correspondance' }] }, cfg);
  }
  // ── Correspondance GUIDÉE ville par ville : départ → escale(s) → arrivée finale → n° des vols ──
  // Une photo envoyée en plein milieu = le client tend son e-billet → on bascule sur le scan (il lit tout d'un coup).
  if (/^esc_/.test(s.step) && mediaUrl) { s.step = 'scan'; await setState(phone, s); return handleMessage(phone, text, cfg, mediaUrl, replyId, true); }
  if (s.step === 'esc_dep') {
    const pk = cityPick(input, id, VILLES_COURANTES);
    if (pk && pk.autre) return send(phone, `✏️ Tapez le nom de votre ville de *départ* _(ex : Cotonou)_ :`, cfg);
    if (!pk) return askEscDep(phone, s, cfg);
    s.escCities = [pk.city]; await setState(phone, s);
    await send(phone, `✅ Départ : *${pk.city}*`, cfg);
    return askEscVia(phone, s, cfg);
  }
  if (s.step === 'esc_via') {
    const pk = cityPick(input, id, VILLES_HUBS);
    if (pk && pk.autre) return send(phone, `✏️ Tapez le nom de la ville d'*escale* _(ex : Nairobi)_ :`, cfg);
    if (!pk) return askEscVia(phone, s, cfg, (s.escCities || []).length >= 2);
    s.escCities = s.escCities || []; s.escCities.push(pk.city);
    if (s.escCities.length >= 4) return askEscArr(phone, s, cfg, `✅ Escale : *${pk.city}*`);
    s.step = 'esc_more'; await setState(phone, s);
    return sendButtons(phone, { body: `✅ Escale : *${pk.city}*\n\nY avait-il une *autre escale* ?`, buttons: [{ id: 'esc_oui', text: '🔄 Oui, une autre' }, { id: 'esc_non', text: '➡️ Non' }] }, cfg);
  }
  if (s.step === 'esc_more') {
    if (id === 'esc_non' || /^non/.test(lower)) return askEscArr(phone, s, cfg);
    if (id === 'esc_oui' || /^oui/.test(lower)) return askEscVia(phone, s, cfg, true);
    return sendButtons(phone, { body: `Y avait-il une *autre escale* ?`, buttons: [{ id: 'esc_oui', text: '🔄 Oui, une autre' }, { id: 'esc_non', text: '➡️ Non' }] }, cfg);
  }
  if (s.step === 'esc_arr') {
    const pk = cityPick(input, id, VILLES_COURANTES);
    if (pk && pk.autre) return send(phone, `✏️ Tapez le nom de votre ville d'*arrivée finale* _(ex : Toulouse)_ :`, cfg);
    if (!pk) return askEscArr(phone, s, cfg);
    const city = pk.city;
    // Arrivée = départ → aller-retour confondu : on ne décrit que le voyage qui a eu le problème.
    if (s.escCities && s.escCities[0] && city.toLowerCase() === s.escCities[0].toLowerCase()) {
      return send(phone, `🤔 Votre arrivée (*${city}*) est identique à votre départ — pour un *aller-retour*, ne décrivez que le voyage qui a eu le problème (l'aller OU le retour).\n🛬 Quelle est la ville d'arrivée de *ce* voyage ?`, cfg);
    }
    return buildEscLegs(phone, s, cfg, city);
  }
  if (s.step === 'esc_vol') {
    let vol = '';
    if (!(lower === 'passer' || lower === 'non' || lower === 'skip' || lower.includes('sais pas') || lower.includes('sais plus'))) {
      const vm = input.toUpperCase().match(/[A-Z]{2,3}\s?\d{1,4}[A-Z]?/);
      if (!vm) return send(phone, `Numéro non reconnu _(ex : AT540)_. Renvoyez-le, ou tapez *passer* :`, cfg);
      vol = vm[0].replace(/\s/g, '');
    }
    s.legs = s.legs || []; if (s.legs[s.legIdx]) s.legs[s.legIdx].vol = vol;
    s.legIdx = (s.legIdx || 0) + 1;
    if (s.legIdx < s.legCount) { await setState(phone, s); const l = s.legs[s.legIdx]; return send(phone, `✈️ Et le numéro du vol *${l.dep} → ${l.arr}* ?\n✏️ _Tapez *passer* si vous ne l'avez plus._`, cfg); }
    s.vol = s.legs.map((l) => l.vol).filter(Boolean).join(' + ') || s.vol || '';
    s.compagnie = deduceAirline(s.legs[s.legs.length - 1] && s.legs[s.legs.length - 1].vol) || deduceAirline(s.legs[0] && s.legs[0].vol) || s.compagnie || '';
    s.step = 'm_date'; await setState(phone, s);
    return send(phone, `📅 Date du *premier vol* ? _(ex : 15/03/2026)_`, cfg);
  }

  // ── Correspondance : combien de vols, puis chaque segment, puis ordre automatique ──
  // (ANCIEN flux, conservé pour les conversations déjà engagées dessus — les nouvelles passent par esc_dep)
  if (s.step === 'leg_count') {
    let n2 = 0; const m = (input.match(/\d+/) || [])[0]; if (m) n2 = parseInt(m);
    if (lower.includes('deux')) n2 = 2; if (lower.includes('trois')) n2 = 3;
    if (!(n2 >= 2 && n2 <= 4)) return sendButtons(phone, { body: `🔄 Combien de vols dans votre trajet ?`, buttons: [{ text: '✈️ 2 vols' }, { text: '🔄 3 vols' }] }, cfg);
    s.legCount = n2; s.legs = []; s.legIdx = 0; s.step = 'leg_input'; await setState(phone, s);
    return send(phone, `✈️ *Vol 1 sur ${n2}* — son *code* (ex : AF718), puis *de quelle ville à quelle ville* (ex : Dakar → Casablanca).`, cfg);
  }
  if (s.step === 'leg_input') {
    const volm = input.toUpperCase().match(/[A-Z]{2,3}\s?\d{1,4}[A-Z]?/);
    const vol = volm ? volm[0].replace(/\s/g, '') : '';
    const rest = input.replace(volm ? volm[0] : '', '');
    const parts = rest.replace(/'/g, '').split(/→|->|—|–|,|\bvers\b|\bà\b|\ba\b/i).map((x) => x.trim()).filter((x) => x.length >= 2);
    s.legs = s.legs || []; s.legs.push({ vol, dep: parts[0] || '', arr: parts[1] || '' });
    s.legIdx = (s.legIdx || 0) + 1; await setState(phone, s);
    if (s.legIdx < s.legCount) return send(phone, `✈️ *Vol ${s.legIdx + 1} sur ${s.legCount}* — son *code* (ex : AT540), puis *de quelle ville à quelle ville* (ex : Casablanca → Paris).`, cfg);
    // Tous les segments reçus → on remet dans l'ordre automatiquement (chaînage des aéroports)
    const ordered = chainLegs(s.legs) || s.legs;
    s.legs = ordered;
    const airports = []; ordered.forEach((l, i) => { if (i === 0 && l.dep) airports.push(l.dep); if (l.arr) airports.push(l.arr); });
    s.route = airports.filter(Boolean).join(' → ') || s.route || '';
    s.vol = ordered.map((l) => l.vol).filter(Boolean).join(' + ') || s.vol || '';
    s.compagnie = deduceAirline(ordered[ordered.length - 1] && ordered[ordered.length - 1].vol) || deduceAirline(ordered[0] && ordered[0].vol) || s.compagnie || '';
    s.step = 'm_date'; await setState(phone, s);
    return send(phone, `📅 Date du *premier vol* ? _(ex : 15/03/2026)_`, cfg);
  }

  // MSG8 — SCAN (e-billet / carte — accepte PLUSIEURS pages photographiées)
  if (s.step === 'scan') {
    if (mediaUrl) {
      s.scan_pages = s.scan_pages || []; if (s.scan_pages.length < 8) s.scan_pages.push(mediaUrl);
      let d = await extractEticketPages(s.scan_pages, cfg);              // relit TOUTES les pages d'un coup → fusion
      if (!d || !d.vol) { const bp = await ocrBoardingPass(mediaUrl, cfg); if (bp && bp.vol) { d = bp; d._carte = true; } } // repli carte d'embarquement (image)
      if (d && d.multiPNR) { delete s.scan_pages; await setState(phone, s); return sendButtons(phone, { body: `📑 J'ai vu *plusieurs réservations* (PNR différents) sur cette image. Pour ne pas les mélanger, envoyez-les *une par une* (une photo par réservation), en commençant par le vol qui a eu le problème.`, buttons: [{ id: 'scan_manuel', text: '✏️ Saisir à la main' }] }, cfg); }
      if (d && d.vol) {
        // Carte d'embarquement : 1 nom par carte → on FUSIONNE dans la liste (une 2e carte = le passager
        // suivant, jamais d'écrasement du 1er). L'étape documents demandera son passeport EN PREMIER, par son nom.
        if (d._carte && d.passengers && d.passengers.length) {
          const nm = d.passengers[0].name; const nmU = nm.toUpperCase();
          s.names = s.names || []; s.passengers = s.passengers || [];
          if (!s.names.filter(Boolean).some((x) => String(x).toUpperCase() === nmU)) {
            const idx = s.names.filter(Boolean).length;
            s.names[idx] = nmU;
            const cur = s.passengers[idx] || {}; if (!cur.name) cur.name = nm; s.passengers[idx] = cur;
          }
          addCarteName(s, nm); // carte d'embarquement = preuve de voyage de CE passager (suivi par nom)
          d = { ...d, passengers: [] }; // noms déjà fusionnés → setEticketFields n'y touche plus
        }
        setEticketFields(s, d); s.travelProof = (d.passengers && d.passengers.length) ? 'ebooking' : (s.travelProof || (d._carte ? 'carte' : 'scan'));
        if (d.allerRetour && d.trajets && d.trajets.length > 1) { s.trajets = d.trajets; await setState(phone, s); return askSens(phone, s, cfg); }
        s.step = 'scan_confirm'; await setState(phone, s); return scanConfirmCard(phone, s, cfg);
      }
      delete s.scan_pages; await send(phone, `😕 Je n'ai pas réussi à lire ce document (PDF protégé, image trop sombre ou coupée…). Réessayez avec une *capture d'écran nette*, ou faisons-le à la main — ça prend 2 min. 👇`, cfg);
      if (s.type_vol === 'escale') return askEscDep(phone, s, cfg);
      s.step = 'm_vol'; await setState(phone, s); return send(phone, `📝 Numéro de vol ? _(ex. AF718, AT540)_`, cfg);
    }
    if (id === 'scan_photo' || lower.includes('envoyer une photo') || lower.includes('envoie une photo')) {
      return send(phone, `👍 Parfait ! Appuyez sur 📎 (ou 📷) en bas et envoyez la *photo* de votre *e-billet* (il contient tous vos vols) — ou de votre *carte d'embarquement*. Je lis tout. 🔒`, cfg);
    }
    if (id === 'scan_manuel' || lower.includes('manuel') || lower.includes('manuelle') || lower.includes('saisir')) {
      if (s.type_vol === 'escale') return askEscDep(phone, s, cfg, `🔄 Pas de souci, on le fait ensemble — une question à la fois.`);
      s.step = 'm_vol'; await setState(phone, s); return send(phone, `📝 Numéro de vol ? _(ex. AF718, AT540)_`, cfg);
    }
    return sendButtons(phone, { body: `📎 Envoyez une *photo* (ou le *PDF*) de votre e-billet. _Plusieurs pages ? Envoyez-les une par une, je les assemble._\n\n_🔒 Votre document est lu par un outil de lecture automatique (IA) à seule fin de pré-remplir votre dossier (voir robindesairs.eu/politique-confidentialite). En l'envoyant, vous acceptez cette lecture._`, buttons: [{ id: 'scan_manuel', text: '✏️ Saisir à la main' }] }, cfg);
  }
  if (s.step === 'scan_confirm') {
    if (mediaUrl) {                                                       // page SUPPLÉMENTAIRE d'un e-billet multi-pages
      s.scan_pages = s.scan_pages || []; if (s.scan_pages.length < 8) s.scan_pages.push(mediaUrl);
      const d = await extractEticketPages(s.scan_pages, cfg);
      if (d && d.vol) {
        setEticketFields(s, d);
        if (d.allerRetour && d.trajets && d.trajets.length > 1) { s.trajets = d.trajets; await setState(phone, s); return askSens(phone, s, cfg); }
      }
      await setState(phone, s); return scanConfirmCard(phone, s, cfg);
    }
    const n = normInput(input, ['oui', 'corriger']);
    if (n === '1' || lower.includes('oui')) {
      delete s.scan_pages; delete s._scanWarn;
      if (needYear(s.date)) { s.step = 'annee'; await setState(phone, s); return askYear(phone, s, cfg); }
      if (s.date && !isValidStoredDate(s.date)) { const bad = s.date; s.date = ''; s.step = 'm_date'; await setState(phone, s); return send(phone, DATE_INVALIDE(bad), cfg); }
      if (inFuture(s.date)) { s.date = ''; s.step = 'm_date'; await setState(phone, s); return send(phone, FUTURE_JOKE, cfg); }
      if (tooOld(s.date)) { await clearState(phone); return send(phone, `${pickVariant(phone, 'PRESCRIPTION_5ANS')}\n\n${STOP_FOOTER}`, cfg); }
      return apresVol(phone, s, cfg);
    }
    s.fix_return = 'scan'; await setState(phone, s); return goCorrection(phone, s, cfg);
  }
  // Aller-retour : le client choisit le vol perturbé → on bascule l'état sur ce trajet.
  if (s.step === 'scan_sens') {
    if (mediaUrl) {                                                       // encore une page → relire puis re-décider
      s.scan_pages = s.scan_pages || []; if (s.scan_pages.length < 8) s.scan_pages.push(mediaUrl);
      const d = await extractEticketPages(s.scan_pages, cfg);
      if (d && d.vol) { setEticketFields(s, d); if (d.allerRetour && d.trajets && d.trajets.length > 1) { s.trajets = d.trajets; await setState(phone, s); return askSens(phone, s, cfg); } }
      s.step = 'scan_confirm'; await setState(phone, s); return scanConfirmCard(phone, s, cfg);
    }
    const t = s.trajets || [];
    if (id === 'sens_retour' || lower.includes('retour')) { applyTrajet(s, t[1]); s.step = 'scan_confirm'; await setState(phone, s); return scanConfirmCard(phone, s, cfg); }
    if (id === 'sens_aller' || lower.includes('aller')) { applyTrajet(s, t[0]); s.step = 'scan_confirm'; await setState(phone, s); return scanConfirmCard(phone, s, cfg); }
    return askSens(phone, s, cfg);
  }

  // ── MENU DE CORRECTION (champ par champ) ──────────────────────────────────
  if (s.step === 'correction') {
    const n = normInput(input, ['vol', 'date', 'nom', 'trajet', 'pnr']);
    if (n === '1' || lower.includes('vol')) { s.step = 'fix_vol'; await setState(phone, s); return send(phone, `✈️ Vol actuel : *${s.vol || '—'}*\nTapez simplement le *bon numéro* 👇 _(ex. AF718)_`, cfg); }
    if (n === '2' || lower.includes('date')) { s.step = 'fix_date'; await setState(phone, s); return send(phone, `📅 Date actuelle : *${s.date || '—'}*\nTapez simplement la *bonne date* 👇 _(JJ/MM/AAAA)_`, cfg); }
    if (n === '3' || lower.includes('nom')) {
      if (s.pax > 1) { s.step = 'fix_nom_which'; await setState(phone, s); return send(phone, `✏️ Quel passager corriger ? Indiquez son *numéro* (1 à ${s.pax}).`, cfg); }
      s.step = 'fix_nom'; await setState(phone, s); return send(phone, `👤 Nom actuel : *${(s.names && s.names[0]) || '—'}*\nTapez simplement le *bon nom complet* 👇`, cfg);
    }
    if (n === '4' || lower.includes('trajet') || lower.includes('route')) { s.step = 'fix_route'; await setState(phone, s); return send(phone, `🗺️ Trajet actuel : *${s.route || '—'}*\nTapez simplement le *bon trajet* 👇 _(ex. CDG → DSS)_`, cfg); }
    if (n === '5' || lower.includes('pnr') || lower.includes('réserv') || lower.includes('reserv')) { s.step = 'fix_pnr'; await setState(phone, s); return send(phone, `🎫 PNR actuel : *${s.pnr || '—'}*\nTapez le *bon numéro de réservation* (6 caractères, lettres + chiffres) 👇, ou *passer*.`, cfg); }
    return goCorrection(phone, s, cfg);
  }
  if (s.step === 'fix_nom_which') {
    const i = parseInt((input.match(/\d+/) || [])[0]);
    if (i >= 1 && i <= s.pax) { s.fix_name_idx = i - 1; s.step = 'fix_nom'; await setState(phone, s); return send(phone, `👤 *Passager ${i}* (actuel : ${(s.names && s.names[i - 1]) || '—'})\nTapez le *bon nom complet* 👇`, cfg); }
    return send(phone, `Indiquez un numéro entre 1 et ${s.pax} :`, cfg);
  }
  if (s.step === 'fix_pnr') {
    if (lower === 'passer' || lower === 'non' || lower === 'skip') { s.pnr = ''; await setState(phone, s); return afterFix(phone, s, cfg); }
    const pnr = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^[A-Z0-9]{5,8}$/.test(pnr) && /[A-Z]/.test(pnr)) { s.pnr = pnr; await setState(phone, s); return afterFix(phone, s, cfg); }
    return send(phone, `🎫 Le PNR fait 5 à 8 caractères avec des *lettres* (ex : *TFSCBC*). Réessayez, ou tapez *passer*.`, cfg);
  }
  if (s.step === 'fix_vol') {
    const vol = input.toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z0-9]{3,8}$/.test(vol)) { s.vol = vol; s.compagnie = deduceAirline(vol) || s.compagnie || ''; await setState(phone, s); return afterFix(phone, s, cfg); }
    return send(phone, `Numéro non reconnu (ex. AF718). Renvoyez-le :`, cfg);
  }
  if (s.step === 'fix_date') {
    const d = parseDateInput(input, '20');
    if (d) {
      if (inFuture(d)) return send(phone, FUTURE_JOKE, cfg);
      if (tooOld(d)) { await clearState(phone); return send(phone, `${pickVariant(phone, 'PRESCRIPTION_5ANS')}\n\n${STOP_FOOTER}`, cfg); }
      s.date = d; await setState(phone, s);
      await send(phone, `✅ Date corrigée : *${d}* — le *${dateEnLettres(d)}*.`, cfg);
      return afterFix(phone, s, cfg);
    }
    if (/\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}/.test(input)) return send(phone, DATE_INVALIDE(input.trim()), cfg);
    return send(phone, `Date non reconnue. Format JJ/MM/AAAA :`, cfg);
  }
  if (s.step === 'fix_nom') {
    if (input.length >= 3 && !/^\d+$/.test(input)) { s.names = s.names || []; s.names[s.fix_name_idx || 0] = input.toUpperCase(); s.fix_name_idx = 0; await setState(phone, s); return afterFix(phone, s, cfg); }
    return send(phone, `Nom trop court. Renvoyez le nom complet :`, cfg);
  }
  if (s.step === 'fix_route') {
    if (input.length >= 3) { s.route = input.replace(/->/g, '→').trim(); await setState(phone, s); return afterFix(phone, s, cfg); }
    return send(phone, `Trajet trop court (ex. CDG → DSS) :`, cfg);
  }
  // Année manquante (carte sans année) → on la demande, jamais deviner
  if (s.step === 'annee') {
    const m = input.match(/\b(19\d{2}|20\d{2})\b/);
    const year = m ? m[1] : null;
    if (year) {
      const d = `${s.date.replace(/\/$/, '')}/${year}`;
      if (!isValidStoredDate(d)) { s.date = ''; s.step = 'm_date'; await setState(phone, s); return send(phone, DATE_INVALIDE(d), cfg); }
      if (inFuture(d)) { await send(phone, `😄 ${year} ? Ce vol n'a pas encore eu lieu — on réclame pour un vol *déjà passé* ! Choisissez la bonne année 👇`, cfg); return askYear(phone, s, cfg); }
      s.date = d;
      if (tooOld(s.date)) { await clearState(phone); return send(phone, `${pickVariant(phone, 'PRESCRIPTION_5ANS')}\n\n${STOP_FOOTER}`, cfg); }
      await setState(phone, s);
      await send(phone, `✅ Vol du *${d}* — le *${dateEnLettres(d)}*.`, cfg);
      return apresVol(phone, s, cfg);
    }
    return askYear(phone, s, cfg);
  }

  // Saisie manuelle vol/date (MSG10) — sert scan raté ET correction
  // Une photo en pleine saisie = le client tend son billet → on bascule sur le scan (lecture automatique).
  if (/^m_(vol|date|route|pnr)$/.test(s.step) && mediaUrl) { s.step = 'scan'; await setState(phone, s); return handleMessage(phone, text, cfg, mediaUrl, replyId, true); }
  if (s.step === 'm_vol') {
    const vol = input.toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z0-9]{3,8}$/.test(vol)) { s.vol = vol; s.compagnie = deduceAirline(vol) || s.compagnie || ''; s.step = 'm_date'; await setState(phone, s); return send(phone, `✅ Vol ${vol}${s.compagnie ? ' — ' + s.compagnie : ''}\n\n📅 Date du vol ? _(ex. 15/03/2026)_`, cfg); }
    return send(phone, `Numéro non reconnu (ex. AF718). Renvoyez-le :`, cfg);
  }
  if (s.step === 'm_date') {
    const d = parseDateInput(input, '20');
    if (d) {
      if (inFuture(d)) return send(phone, FUTURE_JOKE, cfg);
      s.date = d;
      if (tooOld(s.date)) { await clearState(phone); return send(phone, `${pickVariant(phone, 'PRESCRIPTION_5ANS')}\n\n${STOP_FOOTER}`, cfg); }
      const ok = `✅ Vol du *${d}* — le *${dateEnLettres(d)}*.`;
      if (s.route) return gotoPnr(phone, s, cfg, ok);
      // Pas de route (ni scan ni saisie) → on tente de la RETROUVER depuis le n° de vol (AeroDataBox).
      await send(phone, ok, cfg);
      const legsInfo = await resolveLegs(s.vol, s.date);
      if (legsInfo && legsInfo.airline && !s.compagnie) s.compagnie = legsInfo.airline;
      const stops = (legsInfo && legsInfo.stops) || [];
      // Vol MULTI-ESCALES (ex. Orly → Cotonou → Abidjan) → on PROPOSE les arrêts (où êtes-vous descendu ?).
      if (stops.length >= 3) { s.routeStops = stops; await setState(phone, s); return askStopArr(phone, s, cfg); }
      // Vol simple A → B retrouvé → confirmation 1 tap.
      if (stops.length === 2) {
        s.route = `${stops[0].label} → ${stops[1].label}`;
        return askRouteConfirm(phone, s, cfg);
      }
      // flight-info muet → on RETENTE flight-verdict (en cache + extraction route plus simple) AVANT de
      // demander la route au client. Évite « il a trouvé le vol mais me redemande la route ». Le verdict
      // est MÉMORISÉ (s._verdict) pour ne pas rappeler l'API à l'étape éligibilité.
      const vFallback = await fetchFlightVerdict(s.vol, s.date, 'direct');
      if (vFallback && vFallback.route && /→/.test(vFallback.route)) {
        s.route = vFallback.route; if (vFallback.airline && !s.compagnie) s.compagnie = vFallback.airline;
        s._verdict = vFallback;
        return askRouteConfirm(phone, s, cfg);
      }
      // Vol vraiment non retrouvé → on demande le trajet en 2 questions imagées (décollage 🛫 / atterrissage 🛬).
      return askDepCity(phone, s, cfg);
    }
    if (/\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}/.test(input)) return send(phone, DATE_INVALIDE(input.trim()), cfg);
    return send(phone, `Date non reconnue. Format JJ/MM/AAAA (ex. 15/03/2026) :`, cfg);
  }
  // Confirmation du trajet retrouvé automatiquement (AeroDataBox) — 1 tap, ou correction manuelle.
  if (s.step === 'm_route_confirm') {
    const n = normInput(input, ['oui', 'corriger']);
    if (id === 'route_ok' || n === '1' || lower.startsWith('oui') || lower.includes('correct') || lower.includes('exact') || lower === 'ok' || lower === 'c\'est ça' || lower === 'cest ca') {
      return gotoPnr(phone, s, cfg);
    }
    if (id === 'route_fix' || n === '2' || lower.includes('corrig') || lower.startsWith('non') || lower.includes('faux')) {
      s.route = ''; await setState(phone, s);
      return askDepCity(phone, s, cfg, `🗺️ Pas de souci, on le fait ensemble.`);
    }
    return sendButtons(phone, { body: `✈️ Votre trajet était *${s.route}* ?`, buttons: [{ id: 'route_ok', text: '✅ Oui' }, { id: 'route_fix', text: '✏️ Corriger' }] }, cfg);
  }
  // Trajet direct en 2 questions claires : d'où l'avion DÉCOLLE 🛫, puis où il ATTERRIT 🛬.
  if (s.step === 'm_dep') {
    const pair = parseRoutePair(input); // tolère un client qui tape « Dakar → Paris » d'un coup
    if (!id && pair) { s.route = `${pair[0]} → ${pair[1]}`; await setState(phone, s); return gotoPnr(phone, s, cfg, `✅ Trajet : *${s.route}*`); }
    const pk = cityPick(input, id, VILLES_COURANTES);
    if (pk && pk.autre) return send(phone, `✏️ Tapez la ville d'où votre avion *décolle* _(ex : Cotonou, ou le code DSS)_ :`, cfg);
    if (!pk) return askDepCity(phone, s, cfg);
    s.depCity = pk.city; await setState(phone, s);
    await send(phone, `✅ Décollage : *${pk.city}* 🛫`, cfg);
    return askArrCity(phone, s, cfg);
  }
  if (s.step === 'm_arr') {
    const pk = cityPick(input, id, VILLES_COURANTES);
    if (pk && pk.autre) return send(phone, `✏️ Tapez la ville où votre avion *atterrit* _(ex : Toulouse, ou le code CDG)_ :`, cfg);
    if (!pk) return askArrCity(phone, s, cfg);
    if (s.depCity && pk.city.toLowerCase() === s.depCity.toLowerCase()) {
      return send(phone, `🤔 L'arrivée (*${pk.city}*) est identique au départ — pour un *aller-retour*, décrivez le vol qui a eu le problème.\n🛬 Dans quelle ville votre avion *atterrit*-il ?`, cfg);
    }
    s.route = `${s.depCity} → ${pk.city}`; await setState(phone, s);
    return gotoPnr(phone, s, cfg, `✅ Trajet : *${s.route}* 🛬`);
  }
  // Vol multi-escales retrouvé (AeroDataBox) : départ = 1er arrêt, on demande OÙ le client est descendu.
  if (s.step === 'm_stop_arr') {
    const stops = s.routeStops || [];
    const downstream = stops.slice(1); // arrivées possibles (le départ = stops[0])
    let chosen = null;
    if (id === 'stop_autre' || /\bautre\b/.test(lower)) { s.route = ''; s.routeStops = null; await setState(phone, s); return askDepCity(phone, s, cfg, `🗺️ Pas de souci, on précise ensemble.`); }
    if (id && /^stop_\d+$/.test(id)) chosen = downstream[parseInt(id.slice(5))];
    else {
      const ri = listRowIdx(id); if (ri >= 0) { if (ri < downstream.length) chosen = downstream[ri]; else { s.route = ''; s.routeStops = null; await setState(phone, s); return askDepCity(phone, s, cfg); } }
      if (!chosen) { const t = nmStrip(input).trim(); if (t) chosen = downstream.find((d) => nmStrip(d.label).includes(t) || d.code.toLowerCase() === lower.trim()); }
      if (!chosen && /^\d+$/.test(lower.trim())) { const i = parseInt(lower) - 1; if (i >= 0 && i < downstream.length) chosen = downstream[i]; else if (i === downstream.length) { s.route = ''; s.routeStops = null; await setState(phone, s); return askDepCity(phone, s, cfg); } }
    }
    if (chosen) { s.route = `${stops[0].label} → ${chosen.label}`; s.routeStops = null; await setState(phone, s); return gotoPnr(phone, s, cfg, `✅ Trajet : *${s.route}* 🛬`); }
    return askStopArr(phone, s, cfg);
  }
  if (s.step === 'm_pnr') {
    if (lower === 'passer' || lower === 'non' || lower === 'skip') { await setState(phone, s); return apresVol(phone, s, cfg); }
    const pnr = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^[A-Z0-9]{5,8}$/.test(pnr)) { s.pnr = pnr; await setState(phone, s); return apresVol(phone, s, cfg); }
    return send(phone, `🎫 Le PNR fait 5 à 8 caractères (lettres/chiffres), ex : *TFSCBC*. Réessayez, ou tapez *passer*.`, cfg);
  }

  // MSG9 — NOMS (un par un)
  if (s.step === 'names') {
    if (input.length >= 3 && !/^\d+$/.test(input)) { s.names[s.name_idx] = input.toUpperCase(); s.name_idx++; await setState(phone, s); }
    return askName(phone, s, cfg);
  }
  // Confirmation de la liste des passagers (+ correction par numéro)
  if (s.step === 'names_confirm') {
    const n = normInput(input, ['confirmer', 'corriger']);
    if (n === '1' || lower.includes('confirm')) { return sendMineurs(phone, s, cfg); }
    if (n === '2' || lower.includes('corrig')) { s.step = 'names_fix_which'; await setState(phone, s); return send(phone, `✏️ Quel passager corriger ? Indiquez son *numéro* (1 à ${s.pax}).`, cfg); }
    return showNamesConfirm(phone, s, cfg);
  }
  if (s.step === 'names_fix_which') {
    const i = parseInt((input.match(/\d+/) || [])[0]);
    if (i >= 1 && i <= s.pax) { s.fix_name_idx = i - 1; s.step = 'names_fix_one'; await setState(phone, s); return send(phone, `👤 *Passager ${i}* (actuel : ${s.names[i - 1] || '—'})\n\nTapez simplement le *bon nom complet* 👇\n_(ex : Aminata Diallo)_`, cfg); }
    return send(phone, `Indiquez un numéro entre 1 et ${s.pax} :`, cfg);
  }
  if (s.step === 'names_fix_one') {
    if (input.length >= 3 && !/^\d+$/.test(input)) { s.names[s.fix_name_idx] = input.toUpperCase(); await setState(phone, s); return showNamesConfirm(phone, s, cfg); }
    return send(phone, `Nom trop court. Renvoyez le nom complet :`, cfg);
  }

  // MSG11 — MINEURS
  if (s.step === 'mineurs') {
    const n = normInput(input, ['majeur', 'mineur', 'tous majeurs', 'des mineurs']);
    if (s.pax === 1) {
      if (n === '1' || lower.includes('majeur')) { s.mineurs = []; await setState(phone, s); return sendRecap(phone, s, cfg); }
      if (n === '2' || lower.includes('mineur')) { s.minorsPresent = true; s.minorSelf = true; await setState(phone, s); await send(phone, `👶 Bien noté. L'indemnité d'un mineur est bien due — le *mandat est signé par son parent ou tuteur légal* (on vous guide à l'étape finale, rien à avancer). On continue 👇`, cfg); return sendRecap(phone, s, cfg); }
      return sendButtons(phone, { body: `${bar('mineurs')}\n👤 Êtes-vous majeur(e) (18+) ?`, buttons: [{ text: '✅ Oui, majeur(e)' }, { text: '👶 Non, mineur(e)' }] }, cfg);
    }
    if (n === '1' || lower.includes('tous majeurs')) { s.minorsPresent = false; await setState(phone, s); return sendRecap(phone, s, cfg); }
    if (n === '2' || lower.includes('mineur')) { s.minorsPresent = true; await setState(phone, s); return send(phone, `👶 Bien noté — il y a des mineurs. La signature d'un parent/tuteur sera requise pour eux (on s'en occupe avec vous via les passeports). On continue 👇`, cfg).then(() => sendRecap(phone, s, cfg)); }
    return sendMineurs(phone, s, cfg);
  }

  // MSG12 — RÉCAP
  if (s.step === 'recap') {
    const n = normInput(input, ['correct', 'modifier']);
    if (n === '1' || lower.includes('correct')) { s.step = 'documents'; s.doc_idx = 0; await setState(phone, s); return startDocuments(phone, s, cfg); }
    if (n === '2' || lower.includes('modifier')) { s.fix_return = 'recap'; await setState(phone, s); return goCorrection(phone, s, cfg); }
    return sendRecap(phone, s, cfg);
  }

  // MSG13 — DOCUMENTS (passeports 1..n → carte → e-billet → certificat)
  if (s.step === 'doc_pass') {
    s.passengers = s.passengers || [];
    if (mediaUrl) { return askOcrConfirm(phone, s, cfg, mediaUrl); }
    if (id === 'doc_photo' || lower.includes('envoyer ma photo') || lower.includes('ma photo')) {
      return send(phone, `👍 Parfait ! Appuyez sur 📎 (ou 📷) en bas et choisissez la *photo* de la pièce — *passeport, CNI ou carte de séjour*. On lit le nom et la date automatiquement. 🔒`, cfg);
    }
    if (id === 'doc_passer' || lower.includes('envoie après') || lower.includes('passer')) {
      const _nm = (s.passengers[s.doc_idx] && s.passengers[s.doc_idx].name) || (s.names && s.names[s.doc_idx]) || '';
      s.passengers[s.doc_idx] = { skipped: true }; s.docs_pending = true; s.doc_idx++; await setState(phone, s);
      await send(phone, `👍 C'est noté${_nm ? `, on garde la place de *${_nm}*` : ''}. ℹ️ Mais sa pièce (passeport, CNI ou carte de séjour) reste *indispensable* pour la réclamation — envoyez-la dès que vous pouvez. 🔒`, cfg);
      return nextPassport(phone, s, cfg);
    }
    if (id === 'doc_saisir' || lower.includes('saisir') || lower.includes('manuel') || lower.includes('tape')) { s.step = 'doc_name'; await setState(phone, s); return send(phone, `👤 *Passager ${s.doc_idx + 1}* — Nom et prénom ?\n_(ex : Aminata Diallo)_\nℹ️ On note le nom, mais la *photo* de sa pièce (passeport, CNI ou carte de séjour) restera nécessaire pour la réclamation. 🔒`, cfg); }
    return sendButtons(phone, { body: `🛂 Envoyez la *photo* de la pièce, ou :`, buttons: [{ id: 'doc_saisir', text: '✍️ Saisir à la main' }, { id: 'doc_passer', text: '⏭️ Je l\'envoie après' }] }, cfg);
  }
  if (s.step === 'doc_pass_confirm') {
    s.passengers = s.passengers || [];
    // Nouvelle photo → re-OCR immédiat
    if (mediaUrl) { delete s.doc_pending; return askOcrConfirm(phone, s, cfg, mediaUrl); }
    const n = normInput(input, ['correct', 'corriger']);
    const ok = n === '1' || id === 'pass_ok' || lower.includes('correct') || lower.startsWith('oui') || lower === 'ok' || lower.includes('parfait') || lower.includes('exact');
    const fix = n === '2' || id === 'pass_fix' || lower.includes('corrig') || lower.startsWith('non') || lower.includes('erreur') || lower.includes('faux');
    if (ok) {
      const e = s.doc_pending || { viaPhoto: true };
      // Rattacher la pièce au BON passager par le NOM lu (pas par l'ordre des photos) → gère l'envoi dans le désordre.
      const a = e.name ? attributeId(s, e.name) : { idx: -1, confident: false };
      const idx = (a.confident && a.idx >= 0) ? a.idx : s.doc_idx;
      const cur = s.passengers[idx] || {};
      s.passengers[idx] = { ...cur, ...e, name: cur.name || e.name, idReceived: true }; // garde le nom de l'e-billet, ajoute DDN/pièce
      delete s.doc_pending; await setState(phone, s);
      return nextPassport(phone, s, cfg); // avance vers le prochain passager sans pièce (garde-fou dans nextPassport)
    }
    if (fix) {
      delete s.doc_pending; s.step = 'doc_pass'; await setState(phone, s);
      return sendButtons(phone, [{ id: 'doc_photo', text: '📸 Nouvelle photo' }, { id: 'doc_saisir', text: '✏️ Saisir manuellement' }], cfg);
    }
    if (id === 'doc_photo' || lower.includes('photo') || lower.includes('renvo') || lower.includes('nouv')) {
      s.step = 'doc_pass'; await setState(phone, s);
      return send(phone, `📸 Envoyez la photo de la pièce d'identité du passager ${s.doc_idx + 1}.`, cfg);
    }
    if (id === 'doc_saisir' || lower.includes('saisir') || lower.includes('manuel')) {
      delete s.doc_pending; s.step = 'doc_name'; await setState(phone, s);
      return send(phone, `👤 *Passager ${s.doc_idx + 1}* — Nom et prénom ?\n_(ex : Aminata Diallo)_`, cfg);
    }
    return sendButtons(phone, [{ id: 'pass_ok', text: '✅ C\'est correct' }, { id: 'pass_fix', text: '✏️ Corriger' }], cfg);
  }
  if (s.step === 'doc_mandant') {
    s.passengers = s.passengers || [];
    // Résoudre l'index du signataire : id bouton/liste 'mdt_N', numéro tapé, ou nom partiel
    let idx = -1;
    if (id && /^mdt_\d+$/.test(id)) idx = parseInt(id.slice(4));           // bouton mdt_N
    else if (id && /^\d+$/.test(id)) idx = parseInt(id) - 1;               // liste → id numérique "1","2"...
    else if (/^\d+$/.test(input.trim())) idx = parseInt(input.trim()) - 1; // saisi à la main
    else {
      const lowNames = (s.passengers).slice(0, s.pax).map(p => (p.name || '').toLowerCase());
      idx = lowNames.findIndex(nm => nm && lower.split(' ').some(w => w.length > 2 && nm.includes(w)));
    }
    if (idx >= 0 && idx < s.pax) {
      s.mandant_idx = idx; await setState(phone, s);
      const chosen = s.passengers[idx] || {};
      await send(phone, `✅ Parfait — c'est *${chosen.name || `Passager ${idx + 1}`}* qui suit le dossier.`, cfg);
      return askAddressOrFinalize(phone, s, cfg);
    }
    return askMandant(phone, s, cfg);
  }
  // Adresse du contact (dernière question) — saisie manuelle si non lue sur le passeport.
  if (s.step === 'doc_adresse') {
    const adr = input.trim();
    if (adr.length >= 8 && /[a-zà-ÿ]/i.test(adr) && !/^\d+$/.test(adr)) {
      s.passengers = s.passengers || []; const i = s.mandant_idx || 0;
      const m = s.passengers[i] || {}; m.adresse = adr; s.passengers[i] = m; await setState(phone, s);
      return finaliser(phone, s, cfg);
    }
    return send(phone, `📍 Indiquez votre *adresse complète* : numéro, rue, code postal, ville, pays _(ex : 12 rue des Lilas, 75011 Paris, France)_ :`, cfg);
  }
  if (s.step === 'doc_name') {
    if (mediaUrl) return askOcrConfirm(phone, s, cfg, mediaUrl); // il envoie finalement la pièce → on la lit
    if (input.length >= 3 && !/^\d+$/.test(input) && !/^\[/.test(input)) { s.passengers = s.passengers || []; s.passengers[s.doc_idx] = { name: input.toUpperCase() }; s.step = 'doc_dob'; await setState(phone, s); return send(phone, `📅 *Date de naissance* de ${input} ? _(JJ/MM/AAAA)_`, cfg); }
    return send(phone, `Nom trop court. Renvoyez nom et prénom :`, cfg);
  }
  if (s.step === 'doc_dob') {
    if (mediaUrl) return askOcrConfirm(phone, s, cfg, mediaUrl); // pareil : la photo de la pièce vaut mieux que la saisie
    const dob = parseDateInput(input, '19');
    if (dob) {
      if (inFuture(dob)) return send(phone, `🤔 Cette date de naissance est dans le futur. Renvoyez-la au format JJ/MM/AAAA _(ex. 05/09/2012)_ :`, cfg);
      const minor = isMinorAt(dob, s.date);
      const p = s.passengers[s.doc_idx] || {}; p.dob = dob; p.minor = minor; p.idDeferred = true; s.passengers[s.doc_idx] = p; // nom+DDN notés, mais la PHOTO de la pièce reste à envoyer
      await send(phone, `✅ ${p.name || ('Passager ' + (s.doc_idx + 1))} — né·e le *${dob}* (${dateEnLettres(dob)})${minor ? ' 👶 _(mineur·e : signature parentale requise)_' : ''}\n📸 _Sa pièce d'identité (passeport/CNI) reste à envoyer — indispensable pour réclamer en son nom._`, cfg);
      s.doc_idx++; await setState(phone, s); return nextPassport(phone, s, cfg);
    }
    if (/\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}/.test(input)) return send(phone, DATE_INVALIDE(input.trim()), cfg);
    return send(phone, `Date non reconnue. Format JJ/MM/AAAA (ex. 05/09/2012) :`, cfg);
  }
  if (s.step === 'doc_boarding') {
    if (mediaUrl) { await send(phone, `✅ Carte d'embarquement reçue !`, cfg); return gotoEticket(phone, s, cfg); }
    if (lower === 'passer') { s.docs_pending = true; return gotoEticket(phone, s, cfg); }
    if (lower === 'appel') { s.escalade = 'document_perdu'; upsertLead(phone, { wantsCall: true, wantsCallAt: Date.now() }); await send(phone, `📞 Pas de panique — un expert vous aide à retrouver vos documents. Laissez la conversation ouverte.\n\n${STOP_FOOTER}`, cfg); return gotoEticket(phone, s, cfg); }
    return send(phone, `🎫 Envoyez la carte d'embarquement, ou *passer*, ou *appel* si vous avez tout perdu.`, cfg);
  }
  if (s.step === 'doc_eticket') {
    if (mediaUrl) {
      const e = await extractEticket(mediaUrl, cfg); if (e) applyEticket(s, e);
      s.travelProof = s.travelProof || 'ebooking'; await setState(phone, s);
      const lu = (e && (e.pnr || (e.passengers && e.passengers.length))) ? ` _(${[e.vol, e.pnr && 'PNR ' + e.pnr, e.passengers && e.passengers.length && `${e.passengers.length} passager(s)`].filter(Boolean).join(' · ')})_` : '';
      await send(phone, e ? `✅ E-billet reçu !${lu}` : `✅ Document bien reçu — notre équipe le vérifiera et l'ajoute à votre dossier. 🙏`, cfg); return gotoCert(phone, s, cfg);
    }
    if (lower === 'passer') { s.docs_pending = true; return gotoCert(phone, s, cfg); }
    if (lower === 'appel') { s.escalade = 'document_perdu'; upsertLead(phone, { wantsCall: true, wantsCallAt: Date.now() }); await send(phone, `📞 Un expert vous aide à récupérer votre e-billet. Laissez la conversation ouverte.\n\n${STOP_FOOTER}`, cfg); return gotoCert(phone, s, cfg); }
    return send(phone, `📧 Envoyez l'e-billet (pensez aux spams/Booking), ou *passer*, ou *appel*.`, cfg);
  }
  if (s.step === 'doc_cert') {
    if (mediaUrl) { await send(phone, `✅ Certificat reçu — ça accélère votre dossier !`, cfg); return finaliser(phone, s, cfg); }
    if (lower === 'passer' || lower === 'non') { return finaliser(phone, s, cfg); }
    return send(phone, `📄 Envoyez le certificat de retard (optionnel), ou tapez *passer*.`, cfg);
  }

  // FRAIS (Art. 8 & 9) — proposé après signature : on collecte les reçus, on en redemande, on clôt proprement.
  if (s.step === 'frais') {
    if (mediaUrl) {
      s.fraisCount = (s.fraisCount || 0) + 1; await setState(phone, s);
      markFraisAnswered(phone); // le client a répondu → plus de relance frais
      notifyOwnerWhatsApp(phone, `🧾 Dossier ${s.ref || '?'} : reçu de frais reçu (#${s.fraisCount}) — à joindre à la réclamation (Art. 8/9).`).catch(() => {});
      return sendButtons(phone, { body: `✅ Bien reçu, ajouté à votre dossier ! 🙏\nD'autres frais (taxi, repas, hôtel…) ? Envoyez la photo. Sinon :`, buttons: [{ id: 'frais_fini', text: '✅ C\'est tout' }] }, cfg);
    }
    if (id === 'frais_non' || lower.includes('pas de frais') || lower.includes('aucun frais') || lower === 'non') {
      markFraisAnswered(phone); s.step = 'done'; await setState(phone, s);
      return send(phone, `Parfait, c'est noté ✅ On part avec votre indemnité. Si un reçu refait surface plus tard, envoyez-le, on l'ajoute. 🤝`, cfg);
    }
    if (id === 'frais_fini' || lower.includes("c'est tout") || lower.includes('cest tout') || lower.includes('termin') || lower.includes('fini')) {
      markFraisAnswered(phone); s.step = 'done'; await setState(phone, s);
      return send(phone, `Parfait ✅ On joint vos reçus à votre réclamation. Merci ! 🤝`, cfg);
    }
    if (id === 'frais_oui' || lower.includes('envoi') || lower.includes('reçu') || lower.includes('recu') || lower.startsWith('oui')) {
      return send(phone, `👍 Envoyez une *photo* de chaque reçu (hôtel, repas, taxi, billet…). Même flou, même plusieurs.`, cfg);
    }
    return sendButtons(phone, { body: `💶 Des frais à cause de ce vol (hôtel, repas, taxi…) ? Envoyez une *photo* du reçu, ou :`, buttons: [{ id: 'frais_non', text: '❌ Pas de frais' }] }, cfg);
  }

  if (s.step === 'done') {
    if (!s.ref || !s.mandat_url) { await clearState(phone); return sendAccueil(phone, cfg); } // état périmé → on repart proprement
    // Le client envoie un justificatif après coup → l'IA le classe, le rattache au passager, et on dit ce qui manque
    if (mediaUrl) {
      s.passengers = s.passengers || [];
      const d = await classifyDoc(mediaUrl, cfg);
      // Contrôle qualité AVANT tout : une pièce illisible peut être refusée par la compagnie → on redemande
      if (d.lisible === false && d.kind !== 'autre') {
        const pb = { flou: 'un peu floue', sombre: 'trop sombre', 'coupé': 'coupée', reflet: 'avec un reflet' }[d.probleme] || 'difficile à lire';
        return send(phone, fillTpl(pickRV(s.ref || '', 'PHOTO_QUALITE'), { NOM: firstNameOf(s), PB: pb, REF: s.ref || '' }) || `😕 La photo est ${pb} et risque d'être refusée par la compagnie. Renvoyez-la à plat, en pleine lumière, les 4 coins visibles. 📸`, cfg);
      }
      let ack;
      if (d.kind === 'identite') {
        const a = attributeId(s, d.nom);
        if (a.idx >= 0) {
          const p = s.passengers[a.idx] || {}; p.idReceived = true; if (!p.name && d.nom) p.name = d.nom; s.passengers[a.idx] = p;
          if (a.confident) { ack = fillTpl(pickRV(s.ref || '', 'DOC_RECU_PIECE'), { NOM: paxName(s, a.idx) }) || `✅ Pièce d'identité de *${paxName(s, a.idx)}* bien reçue. 🙏`; }
          else { // doute → on ne nomme pas le client, et on alerte l'expert pour vérification manuelle
            ack = `✅ Pièce d'identité bien reçue, merci. 🙏`;
            notifyOwnerWhatsApp(phone, `⚠️ Dossier ${s.ref} : pièce d'identité reçue (lue « ${d.nom || '?'} ») à rattacher/vérifier manuellement — ${s.pax} passagers.`).catch(() => {});
          }
        } else { ack = `✅ Pièce d'identité bien reçue. 🙏`; }
      } else if (d.kind === 'voyage') {
        // E-billet → couvre tout le groupe. Carte → preuve d'1 passager (suivi par nom).
        s.travelProof = d.voyageType === 'ebooking' ? 'ebooking' : (s.travelProof === 'ebooking' ? 'ebooking' : (d.voyageType || 'voyage'));
        if (d.voyageType === 'carte') addCarteName(s, d.nom);
        ack = d.voyageType === 'ebooking' ? `✅ Confirmation de réservation reçue — elle couvre *tout le voyage et tous les passagers*. 👍` : `✅ Carte d'embarquement reçue${d.nom ? ` (${titleCaseName(d.nom.split(/\s+/)[0])})` : ''}. 👍`;
      } else { ack = `✅ Document bien reçu, merci. 🙏 Notre équipe l'ajoute à votre dossier.`; }
      await setState(phone, s);
      return send(phone, `${ack}\n\n${missingDocsText(s)}`, cfg);
    }
    const _st = docsStatus(s);
    const _url = `https://robindesairs.eu/depot-en-ligne.html?r=${encodeURIComponent(s.ref)}`;
    // Dossier complet : la para DOC_COMPLET nomme déjà la réf (on ne la répète pas). Sinon, on confirme l'enregistrement.
    const _lead = _st.complete ? '' : `✅ *Dossier ${s.ref} bien enregistré.*\n\n`;
    const _pieces = _st.complete
      ? `📎 *Un justificatif en plus ?* (reçu de frais, hôtel, taxi…)\nEnvoyez-le ici, ou sur votre lien sécurisé 👉\n${_url}`
      : `📎 *Envoyez vos pièces* ici, ou sur votre lien sécurisé 👉\n${_url}`;
    return send(phone,
      `${_lead}${missingDocsText(s)}\n\n` +
      `━━━━━━━━━━\n` +
      `${_pieces}\n\n` +
      `📞 *Un expert vous rappelle* au *+33 7 56 86 36 30*\n_Enregistrez ce numéro sous « Robin des Airs » pour reconnaître l'appel._\n\n` +
      `✍️ Un autre dossier ? Écrivez *nouveau*.`, cfg);
  }

  // Incompris
  return sendButtons(phone, { body: `Je n'ai pas compris 🙂 Reprenez où on s'était arrêté 👇`, buttons: [{ id: 'menu', text: '▶️ Reprendre' }, { id: 'appel', text: '📞 Être rappelé' }] }, cfg);
}

// ─── Émetteurs d'écran ───────────────────────────────────────────────────────
async function sendAccueil(phone, cfg) {
  await sendButtons(phone, { body: `${bar('accueil')}\n👋 Bienvenue chez *Robin des Airs* 🏹\n_Je suis l'assistant Robin des Airs, je vous accompagne pas à pas._\n\n${pickVariant(phone, 'ACCUEIL_EMPATHIE')}\n\nNous, c'est notre métier : on défend les passagers des vols Afrique ↔ Europe.\n\n✈️ La loi CE 261/2004 vous donne droit à une indemnité pouvant aller *jusqu'à 600 € par personne*.\n\n*0 € si on ne gagne pas.* Aucun risque pour vous.\n\nVoyons ensemble si une indemnité vous revient. 👇`, footer: 'CE 261/2004', buttons: [{ text: '🚀 Mon indemnité' }] }, cfg);
  // _sid = session ID unique par parcours (timestamp base36) — isole le dedup step+contenu
  await setState(phone, { step: 'langue', phone, _sid: Date.now().toString(36) });
}
async function sendLangue(phone, s, cfg) {
  s.step = 'langue'; await setState(phone, s);
  await sendList(phone, { header: '🌍 Votre langue', body: `${bar('langue')}\n🌍 Dans quelle langue souhaitez-vous être accompagné(e) ?\n\nChez Robin des Airs, nous parlons votre langue — il est toujours plus facile de s'expliquer dans sa langue maternelle. 🤝\n\n_In which language would you like to be assisted?_\n\n🔜 D'autres langues arrivent bientôt.`, buttonText: '🌍 Choisir', items: [
    { title: '🇫🇷 Français', description: 'Européenne' }, { title: '🇬🇧 English', description: 'Européenne' },
    { title: '🇸🇳 Wolof', description: 'Africaine' }, { title: '🇬🇲 Mandinka', description: 'Africaine' }, { title: '🇬🇭 Twi', description: 'Africaine' },
    { title: '🇳🇬 Yoruba', description: 'Africaine' }, { title: '🇬🇳 Peul / Fulfulde', description: 'Africaine' },
  ] }, cfg);
}
// LEGACY (sessions en cours uniquement) : ancienne question route abstraite — remplacée par askRouteZone (1 tap).
async function sendRoute(phone, s, cfg) {
  s.step = 'route'; await setState(phone, s);
  await sendList(phone, { body: `${bar('route')}\n🗺️ Votre vol était sur quelle route ?\nCela détermine si le CE 261/2004 s'applique.`, buttonText: 'Choisir ▾', items: [
    { title: '🌍 Afrique ↔ Europe', description: 'Notre spécialité' }, { title: '🇪🇺 Europe ↔ Europe' }, { title: '🛫 Départ/arrivée Europe' }, { title: '🌐 Autre' },
  ] }, cfg);
}
// ROUTE — qualification en UN tap par le critère légal CE 261 : le voyage touche-t-il l'Europe ?
// (départ OU arrivée). Plus facile à qualifier qu'une ville à retrouver/taper. La ville exacte du
// trajet est récupérée ensuite (scan e-billet/carte, ou saisie vol) — jamais redemandée pour qualifier.
async function askRouteZone(phone, s, cfg) {
  s.step = 'route_zone'; await setState(phone, s);
  return sendButtons(phone, { body: `${bar('route')}\n🗺️ Pour vérifier vos droits, votre voyage :\n\n🛫 *commence en Europe* (vous décollez d'un aéroport européen)\n🛬 ou *arrive en Europe*\n🌍 ou *ni l'un ni l'autre* (ex. entre deux pays d'Afrique)\n\n_💡 Une escale en Europe compte aussi !_`, buttons: [
    { id: 'rz_dep', text: '🛫 Départ d\'Europe' },
    { id: 'rz_arr', text: '🛬 Arrivée en Europe' },
    { id: 'rz_non', text: '🌍 Aucun des deux' },
  ] }, cfg);
}
async function sendIncident(phone, s, cfg) { s.step = 'incident'; await setState(phone, s); await sendButtons(phone, { body: `${bar('incident')}\n✈️ Racontez-nous ce qui s'est passé avec votre vol. On est là pour vous aider.`, buttons: [{ text: '⏱️ Retard arrivée' }, { text: '❌ Annulation' }, { text: "🚫 Refus d'embarq." }] }, cfg); }

// Gate ANNULATION — la règle des 14 jours de préavis (art. 5 CE 261), posée AVANT le n° de vol.
// Ancré sur « quand on vous a prévenu(e), le vol était dans combien de temps » (notification → vol),
// PAS sur « aujourd'hui → vol » (qui serait juridiquement faux).
async function sendAnnulDelai(phone, s, cfg) {
  s.step = 'annul_delai'; await setState(phone, s);
  return sendButtons(phone, { body: `${bar('incident')}\n📅 Pour une *annulation*, c'est le *moment où on vous a prévenu(e)* qui compte.\n\nQuand la compagnie a annoncé l'annulation, votre vol était dans *plus de 14 jours* ou *14 jours ou moins* ?`, buttons: [{ text: '🟢 14 jours ou moins' }, { text: '🔴 Plus de 14 jours' }, { text: '🤔 Je ne sais plus' }] }, cfg);
}

// Suite après le gate annulation : reprend le flux normal (estimation → passagers),
// ou la branche « ticker » (vol déjà prérempli par un lien du site) → question correspondance.
async function continueAnnul(phone, s, cfg) {
  if (s.fromTicker) { s.step = 'q_corr'; await setState(phone, s); return sendButtons(phone, { body: `Ce vol faisait-il partie d'une *correspondance* (un autre vol juste avant ou juste après) ?`, buttons: [{ id: 'corr_direct', text: '✈️ Non, vol direct' }, { id: 'corr_escale', text: '🔄 Oui, correspondance' }] }, cfg); }
  return estimationPuisPax(phone, s, cfg);
}
async function sendPax(phone, s, cfg) {
  s.step = 'nb_pax'; await setState(phone, s);
  await sendList(phone, { body: `${bar('nb_pax')}\n👥 Combien de passagers réclament sur ce vol ?`, buttonText: 'Nombre ▾', items: [
    { title: '1 passager', description: '600 €' }, { title: '2 passagers', description: '1 200 €' }, { title: '3 passagers', description: '1 800 €' }, { title: '4 passagers', description: '2 400 €' }, { title: '5 passagers', description: '3 000 €' }, { title: '6 ou plus', description: 'On gère votre groupe' },
  ] }, cfg);
}
async function askYear(phone, s, cfg) {
  s.step = 'annee'; await setState(phone, s);
  const ys = recentYears();
  await sendList(phone, { header: 'Année du vol', body: `${bar('annee')}\n📅 Votre billet indique le *${s.date}* mais ne précise pas l'année.\nC'était quelle année ?`, buttonText: 'Année ▾', items: ys.map(y => ({ title: String(y) })).concat([{ title: `Avant ${ys[ys.length - 1]}` }]) }, cfg);
}
async function goCorrection(phone, s, cfg) {
  s.step = 'correction'; await setState(phone, s);
  await sendList(phone, { header: 'Corriger', body: `✏️ Que souhaitez-vous corriger ?`, buttonText: 'Corriger ▾', items: [
    { title: '✈️ Vol', description: s.vol || '—' },
    { title: '📅 Date', description: s.date || '—' },
    { title: '👤 Nom', description: (s.names && s.names[0]) || '—' },
    { title: '🗺️ Trajet', description: s.route || '—' },
    { title: '🎫 PNR', description: s.pnr || '—' },
  ] }, cfg);
}
async function showScanConfirm(phone, s, cfg) {
  s.step = 'scan_confirm'; await setState(phone, s);
  return sendButtons(phone, { body: `📋 Vérifiez :\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date ? `${s.date}${isValidStoredDate(s.date) ? ` (${dateEnLettres(s.date)})` : ''}` : '—'}\n🎫 PNR : ${s.pnr || '—'}\n👤 Passager : ${(s.names && s.names[0]) || '—'}\n🗺️ Trajet : ${s.route || '—'}\n\nC'est correct ?`, buttons: [{ text: '✅ Oui' }, { text: '✏️ Corriger' }] }, cfg);
}
async function afterFix(phone, s, cfg) {
  if (s.fix_return === 'recap') return sendRecap(phone, s, cfg);
  return showScanConfirm(phone, s, cfg);
}
async function estimationPuisPax(phone, s, cfg) { s.step = 'nb_pax'; await setState(phone, s); await send(phone, pickVariant(phone, 'ESTIMATION_QUALIFICATION'), cfg); return sendPax(phone, s, cfg); }
// Confirmation 1 tap du trajet retrouvé automatiquement (flight-info ou flight-verdict).
async function askRouteConfirm(phone, s, cfg) {
  s.step = 'm_route_confirm'; await setState(phone, s);
  return sendButtons(phone, { body: `✈️ J'ai retrouvé votre trajet : *${s.route}*${s.compagnie ? ` (${s.compagnie})` : ''}.\nC'est bien ça ?`, buttons: [{ id: 'route_ok', text: '✅ Oui, c\'est ça' }, { id: 'route_fix', text: '✏️ Corriger' }] }, cfg);
}
// Demande du PNR (factorisé : utilisé après date+route, après confirmation/saisie du trajet).
async function gotoPnr(phone, s, cfg, prefix) {
  s.step = 'm_pnr'; await setState(phone, s);
  return send(phone, `${prefix ? prefix + '\n\n' : ''}🎫 Quel est votre *numéro de réservation* (PNR) ?\nC'est un code de 6 lettres/chiffres, sur votre billet ou votre email de confirmation _(ex : TFSCBC)_.\n✏️ Tapez *passer* si vous ne l'avez pas.`, cfg);
}
// Trajet direct (repli quand AeroDataBox n'a pas trouvé) : 2 questions imagées, listes cliquables + Autre.
async function askDepCity(phone, s, cfg, prefix) {
  s.step = 'm_dep'; await setState(phone, s);
  return sendCityList(phone, { header: 'Ville de départ', body: `${prefix ? prefix + '\n\n' : ''}🛫 De quelle ville votre *avion décolle*-t-il ?` }, VILLES_COURANTES, cfg);
}
async function askArrCity(phone, s, cfg) {
  s.step = 'm_arr'; await setState(phone, s);
  return sendCityList(phone, { header: 'Ville d\'arrivée', body: `🛬 Et dans quelle ville votre *avion atterrit*-il ? _(votre arrivée)_` }, VILLES_COURANTES, cfg);
}
// Vol multi-escales retrouvé : on montre le routing complet et on demande l'arrêt de DESCENTE du client.
async function askStopArr(phone, s, cfg) {
  s.step = 'm_stop_arr'; await setState(phone, s);
  const stops = s.routeStops || [];
  const chain = stops.map((x) => x.label).join(' → ');
  const downstream = stops.slice(1); // le départ = stops[0], les arrivées possibles = la suite
  const body = `✈️ Ce vol dessert *${chain}*.\nOù êtes-vous *descendu(e)* ? _(votre arrivée)_`;
  if (downstream.length <= 2) {
    return sendButtons(phone, { body, buttons: downstream.map((d, i) => ({ id: `stop_${i}`, text: clip(d.label, 20) })).concat([{ id: 'stop_autre', text: '✏️ Autre' }]) }, cfg);
  }
  return sendList(phone, { header: 'Votre arrivée', body, buttonText: 'Arrivée ▾', items: downstream.map((d, i) => ({ id: `stop_${i}`, title: d.label, description: d.code })).concat([{ id: 'stop_autre', title: '✏️ Autre ville' }]) }, cfg);
}
// Tolère un trajet tapé d'un coup (« Dakar → Paris », « Dakar Paris », « DSS-CDG ») → [dep, arr], sinon null.
function parseRoutePair(input) {
  const codePair = String(input || '').trim().match(/^([a-z]{3})\s*[-\/]\s*([a-z]{3})$/i); // « DSS-CDG » sans toucher « Saint-Louis »
  if (codePair) return [codePair[1].toUpperCase(), codePair[2].toUpperCase()];
  let r = String(input || '').trim().replace(/\s*(?:->|→|—|–|,|\s-\s|\bvers\b|\bà\b)\s*/gi, ' → ');
  let parts = r.includes('→') ? r.split('→') : (r.split(/\s+/).length === 2 ? r.split(/\s+/) : []);
  parts = parts.map((x) => cleanCity(x)).filter(Boolean);
  return parts.length === 2 ? parts : null;
}
// Entrée du parcours correspondance GUIDÉ : une question = une info.
// Ville de départ (liste corridor) → escale(s) (liste 9 hubs + Autre) → arrivée finale (code/ville) → n° vols.
async function askEscDep(phone, s, cfg, intro) {
  s.legs = []; s.legIdx = 0; s.escCities = []; s.step = 'esc_dep'; await setState(phone, s);
  return sendCityList(phone, { header: 'Ville de départ', body: `${intro ? intro + '\n\n' : ''}${bar('esc_dep')}\n🛫 Quelle est la ville de *départ* de votre voyage ?` }, VILLES_COURANTES, cfg);
}
async function askEscVia(phone, s, cfg, suivante) {
  s.step = 'esc_via'; await setState(phone, s);
  return sendCityList(phone, { header: suivante ? 'Escale suivante' : 'Ville d\'escale', body: suivante ? `🔄 Dans quelle ville était l'escale *suivante* ?` : `🔄 Dans quelle ville avez-vous fait *escale* ?` }, VILLES_HUBS, cfg);
}
async function askEscArr(phone, s, cfg, prefix) {
  s.step = 'esc_arr'; await setState(phone, s);
  return sendCityList(phone, { header: 'Arrivée finale', body: `${prefix ? prefix + '\n\n' : ''}🛬 Et quelle est votre ville d'*arrivée finale* ?` }, VILLES_COURANTES, cfg);
}
// Toutes les villes sont connues → construit trajet + segments, puis demande les n° de vol un par un.
async function buildEscLegs(phone, s, cfg, arrCity) {
  const c = (s.escCities || []).concat(arrCity);
  s.escCities = c; s.route = c.join(' → ');
  s.legs = c.slice(0, -1).map((dep, i) => ({ vol: '', dep, arr: c[i + 1] }));
  s.legCount = s.legs.length; s.legIdx = 0; s.step = 'esc_vol'; await setState(phone, s);
  return send(phone, `✅ Trajet : *${s.route}*\n\n✈️ Numéro du vol *${s.legs[0].dep} → ${s.legs[0].arr}* ? _(ex : AT540, sur votre billet)_\n✏️ Tapez *passer* si vous ne l'avez plus.`, cfg);
}
// Raccourci bandeau : passagers connus → si direct, vol+date sont déjà là (vérif éligibilité + récap) ;
// si correspondance, on bascule sur le flux escale standard pour collecter les segments.
async function afterPaxFromTicker(phone, s, cfg) {
  if (s.type_vol === 'escale') return askEscDep(phone, s, cfg);
  await setState(phone, s);
  return apresVol(phone, s, cfg); // direct : vol + date connus → vérification puis récapitulatif
}
async function sendMineurs(phone, s, cfg) {
  s.step = 'mineurs'; await setState(phone, s);
  if (s.pax === 1) return sendButtons(phone, { body: `${bar('mineurs')}\n👤 Êtes-vous majeur(e) (18+) ?`, buttons: [{ text: '✅ Oui, majeur(e)' }, { text: '👶 Non, mineur(e)' }] }, cfg);
  return sendButtons(phone, { body: `${bar('mineurs')}\n👶 Parmi les ${s.pax} passagers, y a-t-il des mineurs (–18 ans) ?`, buttons: [{ text: '✅ Tous majeurs' }, { text: '👶 Des mineurs' }] }, cfg);
}
async function sendRecap(phone, s, cfg) {
  s.step = 'recap'; await setState(phone, s);
  try { markEngagedLead(phone, s); } catch (_) {} // dossier relançable dès que le vol est connu (récupère les abandons avant signature)
  await sendButtons(phone, { body: `${bar('recap')}\n📋 *Récapitulatif — confirmez svp*\n\n👥 ${s.pax} passager${s.pax > 1 ? 's' : ''}\n_Identités à l'étape suivante (pièce d'identité ou saisie)_\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n🎫 PNR : ${s.pnr || '—'}\n🗺️ ${s.route || '—'}\n📅 ${s.date ? `${s.date}${isValidStoredDate(s.date) ? ` (${dateEnLettres(s.date)})` : ''}` : '—'} — ${s.incident_libelle || '—'}\n🛤️ ${s.type_vol === 'escale' ? 'Avec escale' : 'Direct'}\n${montantLine(s)}`, buttons: [{ text: '✅ Tout est correct' }, { text: '✏️ Modifier' }] }, cfg);
}

// Vérifie le vol (vols DIRECTS uniquement) et adapte montant + message. Idempotent, best-effort.
async function applyFlightVerdict(phone, s, cfg) {
  if (s.flightChecked) return;
  if (s.type_vol === 'escale') { s.flightVerdict = 'a_verifier'; return; } // correspondance → expert, pas d'appel
  if (!s.vol || !s.date) return; // pas assez d'infos → on garde le déclaratif
  const v = s._verdict || await fetchFlightVerdict(s.vol, s.date, 'direct'); // réutilise le verdict déjà obtenu en m_date (zéro double appel)
  if (s._verdict) delete s._verdict;
  s.flightChecked = true;
  if (!v || v.verdict === 'introuvable') return; // vol non retrouvé → silence, on garde le déclaratif (jamais de "non")
  s.flightVerdict = v.verdict;
  if (Number.isFinite(v.delayMin)) s.flightDelayMin = v.delayMin;
  if (v.distanceKm) s.distanceKm = v.distanceKm;
  if (v.route && (!s.route || s.route === '—')) s.route = v.route;
  if (v.verdict === 'eligible') {
    s.perPax = (v.perPax && v.perPax > 0) ? v.perPax : 600;
    await setState(phone, s);
    return send(phone, `✅ *Bonne nouvelle !* ${v.proofLine || 'Votre vol est éligible.'}\nVous pouvez prétendre à *${montantReel(s)} €*${s.pax > 1 ? ` au total (${s.pax} passagers)` : ''} — soit *${montantNetReel(s)} € nets* pour vous. 🎉`, cfg);
  }
  s.perPax = 0; // sortie douce : pas de montant ferme affiché
  await setState(phone, s);
  if (v.verdict === 'hors_champ') {
    return send(phone, `ℹ️ D'après les données de vol, ce trajet n'entre pas *automatiquement* dans le règlement européen (compagnie hors-UE au départ hors-UE). Pas d'inquiétude : un expert vérifie *gratuitement* s'il existe un autre recours. On garde votre dossier. 🤝`, cfg);
  }
  if (v.verdict === 'sous_seuil') {
    return send(phone, `ℹ️ Selon les données, le retard est *sous le seuil des 3h* pour l'indemnité forfaitaire. Mais vous avez peut-être droit au *remboursement de vos frais* — un expert vérifie. On garde votre dossier. 🤝`, cfg);
  }
  // a_verifier
  return send(phone, `🔎 Un expert confirmera le *montant exact* de votre dossier. On continue. 👍`, cfg);
}

// après vol+date connus → collecte des noms manquants
async function apresVol(phone, s, cfg) {
  // Plus de question mineurs : l'âge vient du passeport / de la date de naissance (étape documents).
  s.names = s.names || [];
  await applyFlightVerdict(phone, s, cfg); // vérifie le vol direct → ajuste montant + message (best-effort)
  return sendRecap(phone, s, cfg);
}
async function askName(phone, s, cfg) {
  const names = s.names || [];
  const doneList = names.slice(0, s.name_idx).filter(Boolean).map((n, i) => `✅ ${i + 1}. ${n}`).join('\n');
  if (s.name_idx >= s.pax) {
    if (s.pax > 1) return showNamesConfirm(phone, s, cfg);
    return sendMineurs(phone, s, cfg);
  }
  s.step = 'names'; await setState(phone, s);
  const prefix = doneList ? `${doneList}\n\n` : '';
  return send(phone, `${bar('names')}\n${prefix}👤 *Passager ${s.name_idx + 1} sur ${s.pax}* — Prénom et nom ?\n_(ex : Aminata Diallo)_`, cfg);
}
async function showNamesConfirm(phone, s, cfg) {
  s.step = 'names_confirm'; await setState(phone, s);
  const list = (s.names || []).slice(0, s.pax).map((n, i) => `✅ ${i + 1}. ${n || '—'}`).join('\n');
  return sendButtons(phone, { body: `${bar('names')}\n👥 *Les ${s.pax} passagers :*\n${list}\n\nTout est correct ?`, buttons: [{ text: '✅ Confirmer' }, { text: '✏️ Corriger nom' }] }, cfg);
}

// Documents
async function startDocuments(phone, s, cfg) {
  s.step = 'doc_pass'; s.doc_idx = 0; s.passengers = s.passengers || []; await setState(phone, s);
  return nextPassport(phone, s, cfg);
}
async function nextPassport(phone, s, cfg) {
  // Sauter les passagers déjà traités (pièce reçue / saisie / passée) — robuste si les photos arrivent dans le désordre.
  while (s.doc_idx < s.pax) { const p = (s.passengers || [])[s.doc_idx] || {}; if (p.skipped || p.idReceived || p.idDeferred) s.doc_idx++; else break; } // un dob (e-billet/saisie) ne saute PLUS la demande de photo
  if (s.doc_idx >= s.pax) { return askMandant(phone, s, cfg); }
  s.step = 'doc_pass'; await setState(phone, s);
  // Intro courte au 1er passager
  const intro = s.doc_idx === 0 ? `📁 *Dernière étape !* Une pièce d'identité par passager. 🔒\n\n` : '';
  // En-tête : passagers déjà traités (✅) ou reportés (⏳) — nom affiché s'il est connu (e-billet / pièce lue)
  let done = '';
  for (let i = 0; i < s.doc_idx; i++) {
    const p = (s.passengers && s.passengers[i]) || {};
    const nm = p.name || (s.names && s.names[i]) || `Passager ${i + 1}`;
    done += p.idReceived ? `✅ ${i + 1}. ${nm}\n` : `⏳ ${i + 1}. ${nm} — _pièce à envoyer_\n`;
  }
  const header = done ? `${done}\n` : '';
  // Nom du passager courant : connu seulement si e-billet scanné (sinon lu sur la pièce). Conditionnel.
  const curName = (s.passengers && s.passengers[s.doc_idx] && s.passengers[s.doc_idx].name) || (s.names && s.names[s.doc_idx]) || '';
  const who = curName ? ` — *${curName}*` : '';
  return sendButtons(phone, { body: `${bar('documents')}\n${intro}${header}🛂 *Passager ${s.doc_idx + 1} sur ${s.pax}*${who}\n📸 *Le plus simple* : une *photo* de sa pièce d'identité — *passeport, CNI ou carte de séjour*. On lit le nom et la date *automatiquement*. ⏱️ *10 secondes et c'est réglé !*\nℹ️ Cette pièce est *indispensable* pour réclamer en son nom — classée *directement dans votre dossier*.\n🔒 Transmission *sécurisée*, uniquement pour votre réclamation — *jamais revendue*.`, buttons: [{ id: 'doc_photo', text: '📸 Envoyer ma photo' }, { id: 'doc_saisir', text: '✍️ Saisir à la main' }, { id: 'doc_passer', text: '⏭️ Je l\'envoie après' }] }, cfg);
}
async function askMandant(phone, s, cfg) {
  // 1 seul passager → c'est forcément lui le contact, pas de question → adresse puis finalisation.
  if (s.pax <= 1) { s.mandant_idx = 0; await setState(phone, s); return askAddressOrFinalize(phone, s, cfg); }
  s.step = 'doc_mandant'; await setState(phone, s);
  const names = (s.passengers || []).slice(0, s.pax).map((p, i) => p.name || `Passager ${i + 1}`);
  // On ne demande PAS « qui signe » (tout le monde signe son mandat) — juste à qui est ce WhatsApp (le contact du dossier).
  await send(phone, `✅ Pièces collectées ! Une dernière chose.\n\n📱 *À qui appartient ce numéro WhatsApp ?*\n_(la personne qui suit le dossier — chaque passager signera son propre mandat, peu importe lequel.)_`, cfg);
  if (names.length <= 3) {
    return sendButtons(phone, names.map((nm, i) => ({ id: `mdt_${i}`, text: clip(nm, 20) })), cfg);
  }
  return sendList(phone, { header: 'Ce numéro WhatsApp', body: 'À qui appartient ce numéro ?', buttonText: 'Choisir', items: names.map((nm, i) => ({ id: `mdt_${i}`, title: clip(nm, 24), description: `Passager ${i + 1}` })) }, cfg);
}
// Adresse du contact : prise du passeport si lue, sinon demandée (DERNIÈRE question), puis finalisation.
async function askAddressOrFinalize(phone, s, cfg) {
  const m = (s.passengers || [])[s.mandant_idx || 0] || {};
  if (m.adresse && m.adresse.trim().length >= 8) {
    await send(phone, `📍 Adresse trouvée sur votre pièce : *${m.adresse}*\n_(utilisée pour le mandat — corrigeable au moment de signer.)_`, cfg);
    return finaliser(phone, s, cfg);
  }
  s.step = 'doc_adresse'; await setState(phone, s);
  return send(phone, `📍 *Dernière question !* Votre *adresse postale complète* ? _(numéro, rue, code postal, ville, pays)_\nC'est l'adresse qui figure sur le mandat, où la compagnie doit vous répondre.`, cfg);
}
async function gotoBoarding(phone, s, cfg) { s.step = 'doc_boarding'; await setState(phone, s); return send(phone, `🎫 Carte d'embarquement\nEnvoyez-en une photo pour le vol concerné.\n📧 Pas de carte ? Un e-billet, une confirmation de réservation ou une étiquette de bagage fonctionnent aussi.\n✏️ *passer* · 📞 *appel* si tout perdu, on trouve une solution.`, cfg); }
async function gotoEticket(phone, s, cfg) { s.step = 'doc_eticket'; await setState(phone, s); return send(phone, `📧 Confirmation de réservation (e-billet)\nEnvoyez une capture (pensez aux spams / appli Booking).\n✏️ *passer* · 📞 *appel*.`, cfg); }
async function gotoCert(phone, s, cfg) { s.step = 'doc_cert'; await setState(phone, s); return send(phone, `📄 Certificat de retard/annulation (optionnel)\nSi la compagnie vous en a remis un, envoyez-le.\n✏️ Tapez *passer* si vous n'en avez pas (cas fréquent).`, cfg); }

// MSG14 — RGPD + mandat + reçu + clôture
async function finaliser(phone, s, cfg) {
  const pax = s.passengers || [];
  const nom = (pax[0] && pax[0].name) || (s.names && s.names[0]) || '—';
  s.minorsCount = pax.filter(p => p && p.minor).length;
  s.ref = genRef(); s.mandat_url = buildMandatUrl(s, phone); s.step = 'done'; await setState(phone, s);
  // Lead à relancer tant que le mandat n'est pas signé (nudge 2h/8h/22h dans la fenêtre 24h)
  upsertLead(phone, { ref: s.ref, mandatUrl: s.mandat_url, mandatSentAt: Date.now(), lastClientAt: Date.now(), pax: s.pax || 1, name: firstNameOf(s), signed: false, completed: true, nudges: [] });
  const minorNote = s.minorsCount ? `\n👶 ${s.minorsCount} mineur·s : signature d'un parent/tuteur requise (un expert vous guide).` : '';
  await send(phone, `${bar('done')}\n🎉 *Dossier complet !* Réf. *${s.ref}*\n\n👤 ${nom}${s.pax > 1 ? ` +${s.pax - 1}` : ''}\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n🗺️ ${s.route || '—'}\n📅 ${s.date || '—'} — ${s.incident_libelle || '—'}\n${montantLine(s)}${minorNote}\n\nDernière étape : *votre signature* (2 min).\n✅ 0 € d'avance — 25 % au succès uniquement · 🔒 aucune info bancaire.\n_Vos données servent uniquement à votre réclamation, jamais revendues. Confidentialité & CGV : robindesairs.eu/cgv_\n\n👉 *Signez ici :*\n${s.mandat_url}\n\nSans votre signature, on ne peut pas agir en votre nom. ${STOP_FOOTER}`, cfg);
  try {
    const makeUrl = process.env.MAKE_WEBHOOK_NEW_DOSSIER;
    if (makeUrl) {
      // Champs « prêts à mapper » dans Airtable pour le filtre bureau « pièce manquante » (pas de logique côté Make).
      const _d = docsStatus(s);
      const _mq = []; if (_d.missingId.length) _mq.push(`pièce d'identité de ${_d.missingId.join(', ')}`); if (!_d.travelProofOk) _mq.push(`preuve de voyage (carte/e-billet)`);
      await fetch(makeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s, phone, source: 'wati-bot-v8', pieces_manquantes: _mq.join(' · '), dossier_complet: _d.complete }) });
    }
  } catch (e) {}
  // Garde-fou anti-zombie : dossier finalisé avec pièce(s) manquante(s) → on alerte l'équipe EXPLICITEMENT.
  // (le client est relancé tant qu'il n'a pas signé ; après signature le lead est purgé du bot → c'est au bureau de chasser.)
  try {
    const _st = docsStatus(s);
    if (_st.missingId.length || !_st.travelProofOk) {
      const _miss = [];
      if (_st.missingId.length) _miss.push(`pièce d'identité de ${_st.missingId.join(', ')}`);
      if (!_st.travelProofOk) _miss.push(`preuve de voyage (carte d'embarquement / e-billet)`);
      notifyOwnerWhatsApp(phone, `⚠️ Dossier ${s.ref} (${nom}) — PIÈCE(S) MANQUANTE(S) : ${_miss.join(' · ')}.\nÀ récupérer (dépôt en ligne / appel expert) AVANT d'envoyer la mise en demeure — sinon réclamation invérifiable.`).catch(() => {});
    }
  } catch (_) {}
}

// ─── FRAIS (Art. 8 & 9 CE261) — APRÈS signature, on propose d'envoyer les reçus (hôtel/taxi/repas/billet…)
//     réclamés EN PLUS de l'indemnité. Urgence VRAIE (joints au 1er envoi), JAMAIS de forclusion. ──
const FRAIS_BTNS = [{ id: 'frais_oui', text: '📷 Envoyer reçus' }, { id: 'frais_non', text: '❌ Pas de frais' }];
async function sendFraisRequest(phone, s, cfg) {
  s.step = 'frais'; s.fraisAsked = true; await setState(phone, s);
  return sendButtons(phone, { body: `💶 *Une dernière chose qui peut vous rapporter plus*\n\nEn plus de votre indemnité, la compagnie doit aussi *rembourser les frais* que ce vol vous a coûtés : hôtel, repas, taxi/transport, billet de remplacement, appels… 📲\n\nOn envoie votre réclamation *sous 24 h* — pour qu'on *joigne vos reçus dès le 1er envoi*, envoyez-les aujourd'hui. Reçu plus tard ? Aucun souci, on les réclame en complément. 🤝\n\n👉 *Une photo de chaque reçu suffit* (frais raisonnables, un justificatif par dépense).`, buttons: FRAIS_BTNS }, cfg);
}
// Déclenché par le webhook de signature — best-effort : n'impacte JAMAIS la réponse webhook.
async function triggerFraisCollection(lead) {
  try {
    if (!lead || !lead.phone || lead.fraisAskedAt) return; // invalide ou déjà demandé (webhook rejoué)
    const cfg = watiCfg(); if (!cfg) return;
    upsertLead(lead.phone, { fraisPending: true, fraisAskedAt: Date.now() }); // garde le lead vivant pour 1 relance frais
    const s = await getState(lead.phone); if (!s.ref && lead.ref) s.ref = lead.ref;
    await sendFraisRequest(lead.phone, s, cfg);
  } catch (e) { console.error('triggerFraisCollection', e.message); }
}

// reprise d'étape (T1) — renvoie l'écran courant
async function relancerEtape(phone, s, cfg) {
  switch (s.step) {
    case 'langue': return sendLangue(phone, s, cfg);
    case 'q_corr': return sendButtons(phone, { body: `Ce vol faisait-il partie d'une *correspondance* (un autre vol juste avant ou juste après) ?`, buttons: [{ id: 'corr_direct', text: '✈️ Non, vol direct' }, { id: 'corr_escale', text: '🔄 Oui, correspondance' }] }, cfg);
    case 'route': return sendRoute(phone, s, cfg);
    case 'route_zone': return askRouteZone(phone, s, cfg);
    case 'incident': return sendIncident(phone, s, cfg);
    case 'annul_delai': return sendAnnulDelai(phone, s, cfg);
    case 'nb_pax': return sendPax(phone, s, cfg);
    case 'esc_dep': return askEscDep(phone, s, cfg);
    case 'esc_via': return askEscVia(phone, s, cfg, (s.escCities || []).length >= 2);
    case 'esc_more': return sendButtons(phone, { body: `Y avait-il une *autre escale* ?`, buttons: [{ id: 'esc_oui', text: '🔄 Oui, une autre' }, { id: 'esc_non', text: '➡️ Non' }] }, cfg);
    case 'esc_arr': return askEscArr(phone, s, cfg);
    case 'esc_vol': { const l = (s.legs || [])[s.legIdx || 0]; if (l) return send(phone, `✈️ Numéro du vol *${l.dep} → ${l.arr}* ? _(ex : AT540)_\n✏️ Tapez *passer* si vous ne l'avez plus.`, cfg); return askEscDep(phone, s, cfg); }
    case 'mineurs': return sendMineurs(phone, s, cfg);
    case 'recap': return sendRecap(phone, s, cfg);
    case 'names': return askName(phone, s, cfg);
    case 'm_route_confirm': return s.route ? sendButtons(phone, { body: `✈️ Votre trajet était *${s.route}* ?`, buttons: [{ id: 'route_ok', text: '✅ Oui' }, { id: 'route_fix', text: '✏️ Corriger' }] }, cfg) : send(phone, `🗺️ Quel était le *trajet* ? _(ex : Dakar → Paris)_`, cfg);
    case 'm_vol': return send(phone, `📝 Numéro de vol ? _(ex. AF718, AT540)_`, cfg);
    case 'm_date': return send(phone, `📅 Date du vol ? _(ex. 15/03/2026)_`, cfg);
    case 'm_route': return send(phone, `🗺️ Quel était le *trajet* ? _(ex : Dakar → Paris, ou DSS → CDG)_`, cfg);
    case 'm_dep': return askDepCity(phone, s, cfg);
    case 'm_arr': return askArrCity(phone, s, cfg);
    case 'm_stop_arr': return (s.routeStops && s.routeStops.length) ? askStopArr(phone, s, cfg) : askDepCity(phone, s, cfg);
    case 'm_pnr': return gotoPnr(phone, s, cfg);
    case 'doc_pass': case 'doc_pass_confirm': case 'doc_dob': case 'doc_name': return nextPassport(phone, s, cfg);
    case 'doc_mandant': return askMandant(phone, s, cfg);
    case 'doc_adresse': return send(phone, `📍 *Dernière question !* Votre *adresse postale complète* ? _(numéro, rue, code postal, ville, pays)_`, cfg);
    case 'doc_boarding': return gotoBoarding(phone, s, cfg);
    case 'doc_eticket': return gotoEticket(phone, s, cfg);
    case 'doc_cert': return gotoCert(phone, s, cfg);
    case 'frais': return sendFraisRequest(phone, s, cfg);
    default: return send(phone, `On reprend 👇 Répondez à la dernière question, ou tapez *nouveau* pour recommencer.`, cfg);
  }
}

// ─── Extraction entrant + handler (identiques à la prod) ──────────────────────
function extractInbound(payload) {
  const list = []; const seen = new Set();
  if (!payload || typeof payload !== 'object') return list;
  const push = (item) => {
    if (!item || typeof item !== 'object') return;
    const waId = item.waId || item.whatsappNumber || item.from;
    if (item.owner === true || item.eventType === 'sentMessage' || item.fromMe === true) return;
    const listReply = item.listReply || item.list_reply || item.interactiveListReply; const btnReply = item.interactiveButtonReply || item.buttonReply || item.button_reply;
    // replyId = l'id sémantique qu'on a mis sur le bouton/la ligne de liste (ex: 'pass_ok', 'mdt_0')
    const replyId = (listReply && listReply.id) || (btnReply && btnReply.id) || null;
    const replyText = (listReply && (listReply.title || listReply.id)) || (btnReply && (btnReply.text || btnReply.title || btnReply.id)) || null;
    if (waId === 'senderPhone' || item.text === 'text') return;
    const typeStr = String(item.type || '').toLowerCase();
    const mimeStr = String(item.mimeType || item.mime_type || item.mime || '').toLowerCase();
    const fnameStr = String(item.fileName || item.filename || item.data || item.url || item.mediaUrl || '').toLowerCase();
    const isImage = typeStr === 'image' || /image/i.test(typeStr) || /^image\//.test(mimeStr);
    const isDoc = typeStr === 'document' || typeStr === 'file' || /pdf|document/i.test(typeStr) || /pdf|officedocument|msword/.test(mimeStr) || /\.pdf(\?|#|$)/.test(fnameStr);
    const mediaUrl = (isImage || isDoc) ? (item.data || item.mediaUrl || item.media_url || item.url || null) : null;
    const text = replyText || item.text || (item.finalText && String(item.finalText)) || (isImage ? '[image]' : isDoc ? '[document]' : (item.type && item.type !== 'text' ? `[${item.type}]` : ''));
    if (!waId) return;
    const phone = normalizeWaPhone(normalizeWatiPhone(waId));
    if (!String(text || '').trim() && !mediaUrl) return;
    const realId = item.whatsappMessageId || item.whatsapp_message_id || item.id || item.messageId || null;
    const key = realId || `${phone}|${String(text).trim()}`;
    if (seen.has(key)) return; seen.add(key);
    list.push({ phone, text: String(text || '').slice(0, 4096), mediaUrl, dedupId: key, hasId: !!realId, interactive: !!(listReply || btnReply), replyId: replyId || '' });
  };
  if (Array.isArray(payload)) { payload.forEach(push); return list; }
  push(payload);
  if (Array.isArray(payload.messages)) payload.messages.forEach(push);
  if (payload.data && typeof payload.data === 'object') push(payload.data);
  return list;
}
// Comparaison de secret à temps constant (timing-safe) — même durcissement que côté Netlify (cafbcca).
function safeEq(a, b) { const A = Buffer.from(String(a || '')), B = Buffer.from(String(b || '')); return A.length === B.length && A.length > 0 && crypto.timingSafeEqual(A, B); }
function verifyWatiSecret(body, headers, query) {
  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim(); if (!expected) return true;
  const h = headers || {}, q = query || {};
  return safeEq(body && body.secret, expected) || safeEq(h['x-wati-secret'], expected) || safeEq(h['X-Wati-Secret'], expected) || safeEq(q.s, expected) || safeEq(q.secret, expected);
}

// ═══════════════ SERVEUR EXPRESS (Railway — persistant, état RAM) ═══════════════
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// CORS restreint au site (avant : « * » global, y compris sur /api/dossier qui sert des données perso).
// Les appels server-to-server (WATI, fonctions Netlify) n'envoient pas d'Origin → non concernés par CORS.
const CORS_ORIGINS = new Set(['https://robindesairs.eu', 'https://www.robindesairs.eu']);
app.use((req, res, next) => {
  const o = req.headers.origin || '';
  res.set('Access-Control-Allow-Origin', CORS_ORIGINS.has(o) ? o : 'https://robindesairs.eu');
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Wati-Secret');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.get('/api/wati-webhook', async (req, res) => {
  const q = req.query;
  const key = (process.env.WATI_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
  if (!key) return res.status(403).json({ error: 'No secret configured' });
  if (q.debug === 'inbound' && safeEq(q.key, key)) return res.json((await readInboundDebug()) || { none: true });
  if (q.debug === 'interactive' && safeEq(q.key, key)) return res.json((await readInteractiveDebug()) || { none: true });
  if (q.debug === 'state' && safeEq(q.key, key)) { const out = {}; for (const [k, v] of STATE) out[k] = v.step; return res.json({ sessions: STATE.size, steps: out }); }
  if (q.selftest === 'list' && safeEq(q.key, key) && q.to) {
    const cfg = watiCfg();
    await sendList(q.to, { header: 'Test liste', body: '\ud83e\uddea Test liste cliquable Robin', buttonText: 'Choisir', items: [{ title: 'Option 1', description: 'desc 1' }, { title: 'Option 2', description: 'desc 2' }, { title: 'Option 3' }] }, cfg);
    return res.json({ sent: true, resp: await readInteractiveDebug() });
  }
  res.status(403).json({ error: 'Forbidden' });
});

// File d'attente PAR NUMÉRO — sérialise le traitement d'un même client.
// Un seul message d'un numéro est traité à la fois → zéro entrelacement, zéro race condition.
const QUEUES = new Map();
function enqueue(phone, task) {
  const prev = QUEUES.get(phone) || Promise.resolve();
  const next = prev.then(task).catch(e => console.error('queue', e && e.message));
  QUEUES.set(phone, next.finally(() => { if (QUEUES.get(phone) === next) QUEUES.delete(phone); }));
  return next;
}

app.post('/api/wati-webhook', async (req, res) => {
  const body = req.body;
  if (!verifyWatiSecret(body, req.headers, req.query)) return res.status(401).json({ error: 'Secret invalide' });
  const cfg = watiCfg(); const items = extractInbound(body);
  saveInboundDebug(JSON.stringify(body), items);
  res.json({ ok: true, processed: items.length }); // répondre WATI tout de suite
  for (const { phone, text, mediaUrl, dedupId, hasId, replyId } of items) {
    if (!phone) continue;
    if (hasId && memSeen(dedupId)) continue;
    if (hasId && await isDuplicateMessage(dedupId, true)) continue;
    const ckKey = `ck|${phone}|${String(text).trim().toLowerCase().slice(0, 200)}`;
    if (!hasId && await isDuplicateMessage(ckKey, false, 5000)) continue;
    notifyOwnerWhatsApp(phone, text).catch(() => {});
    if (LEADS.has(leadKey(phone))) { // message entrant → garde la fenêtre 24h fraîche
      const _l = LEADS.get(leadKey(phone)); const _p = { lastClientAt: Date.now(), windowClosed: false }; // son message rouvre la fenêtre 24h
      // Sa réponse rouvre la fenêtre gratuitement → on réarme un cycle de relances « reprise » (borné à 3 cycles, anti-spam).
      if (_l && !_l.completed && _l.engagedAt && (_l.engagedRounds || 0) < 3 && (_l.nudges || []).some(n => /^e\d/.test(n))) {
        _p.nudges = (_l.nudges || []).filter(n => !/^e\d/.test(n)); _p.engagedRounds = (_l.engagedRounds || 0) + 1;
      }
      upsertLead(phone, _p);
    }
    console.log('📩 inbound', (phone.length > 6 ? phone.slice(0, 4) + '***' + phone.slice(-2) : phone), 'len', String(text || '').length, mediaUrl ? '+media' : '', cfg ? '' : '⚠️cfgNULL');
    // Sérialisé par numéro : les messages d'un même client se traitent dans l'ordre, un par un.
    enqueue(phone, () => handleMessage(phone, text, cfg, mediaUrl, replyId).catch(e => {
      console.error('bot error', e.message, e.stack);
      if (cfg) return send(phone, 'Une erreur est survenue. Écrivez *go* pour continuer votre dossier.', cfg).catch(() => {});
    }));
  }
});

// Récupération dossier pour le lien court mandat.html?r=REF (CORS déjà ouvert plus haut)
app.get('/api/dossier', (req, res) => {
  const ref = (req.query.r || req.query.ref || '').trim();
  if (!ref) return res.status(400).json({ error: 'ref manquante' });
  const d = DOSSIERS.get(ref);
  if (!d) return res.status(404).json({ error: 'dossier introuvable' });
  res.json(d);
});

// ─── Liste « À rappeler » pour le Bureau : dossiers non signés dont la fenêtre WhatsApp 24h s'est
//     fermée (plus joignables gratuitement) OU qui ont explicitement demandé un rappel. Secret partagé. ──
app.get('/api/leads-a-rappeler', (req, res) => {
  const secret = (req.query.s || req.headers['x-secret'] || req.headers['x-wati-secret'] || '').toString().trim();
  const expected = (process.env.WATI_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
  if (expected && !safeEq(secret, expected)) return res.status(401).json({ ok: false, error: 'secret invalide' });
  const now = Date.now();
  const WIN = 24 * 3600000;
  const out = [];
  for (const [, lead] of LEADS) {
    if (!lead || lead.signed) continue;
    const anchor = lead.lastClientAt || lead.mandatSentAt || lead.engagedAt || now;
    const windowClosed = lead.windowClosed === true || now - anchor > WIN; // flag posé dès qu'un envoi est rejeté « Invalid Conversation »
    if (!lead.wantsCall && !windowClosed) continue; // encore relançable gratuitement par le bot → pas (encore) à rappeler
    const since = lead.wantsCall ? (lead.wantsCallAt || anchor) : anchor;
    out.push({
      phone: lead.phone || '', name: lead.name || '', vol: lead.vol || '', route: lead.route || '',
      incident: lead.incident || '', pax: lead.pax || 1, montant: 600 * (lead.pax || 1), ref: lead.ref || '',
      stage: lead.completed ? 'completed' : 'engaged',
      reason: lead.wantsCall ? 'rappel_demande' : (lead.completed ? 'mandat_non_signe' : 'abandon_avant_signature'),
      wantsCall: !!lead.wantsCall, since, ageHours: Math.max(0, Math.round((now - since) / 3600000)),
    });
  }
  out.sort((a, b) => (Number(b.wantsCall) - Number(a.wantsCall)) || (a.since - b.since)); // rappels demandés d'abord, puis les plus anciens
  res.json({ ok: true, updatedAt: new Date().toISOString(), total: out.length, leads: out });
});

app.get('/health', (req, res) => res.json({ ok: true, sessions: STATE.size, dedup: DEDUP.size, dossiers: DOSSIERS.size, leads: LEADS.size, uptime: process.uptime(), ts: new Date().toISOString() }));
// Commit déployé (injecté par Railway) — pour vérifier un déploiement d'un coup d'œil.
// [auto-deploy-test] modif neutre pour vérifier qu'un push GitHub redéploie le bot — à retirer après validation.
app.get('/version', (req, res) => {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || process.env.SOURCE_VERSION || '';
  res.json({
    ok: true,
    service: 'robin-bot-v8',
    commit: sha ? sha.slice(0, 7) : 'unknown',
    commit_full: sha || null,
    branch: process.env.RAILWAY_GIT_BRANCH || null,
    message: process.env.RAILWAY_GIT_COMMIT_MESSAGE || null,
    deploy_id: process.env.RAILWAY_DEPLOYMENT_ID || null,
    uptime_s: Math.round(process.uptime()),
    ts: new Date().toISOString(),
  });
});
app.get('/', (req, res) => res.send('\ud83c\udff9 Robin des Airs Bot v8 — Railway OK'));

// ─── Signature reçue → marque le lead signé (stoppe les relances) ───────────────
app.post('/api/mandat-signed', (req, res) => {
  const b = req.body || {};
  const secret = (b.secret || req.query.s || req.headers['x-secret'] || '').toString().trim();
  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (expected && !safeEq(secret, expected)) return res.status(401).json({ error: 'secret invalide' });
  const lead = findLead(b.ref || '') || findLead(b.phone || b.waId || '');
  const marked = markLeadSigned(b.ref || '') || markLeadSigned(b.phone || b.waId || '');
  console.log('mandat signe ref=' + (b.ref || '?') + ' marked=' + marked);
  if (lead && lead.phone) triggerFraisCollection(lead).catch(() => {}); // propose l'envoi des reçus de frais (Art. 8/9), best-effort
  if (!marked) notifyOwnerWhatsApp(b.phone || b.waId || '', `⚠️ Signature reçue (ref=${b.ref || '?'} · tel=${b.phone || b.waId || '?'}) mais LEAD INTROUVABLE → relances NON stoppées. À vérifier / arrêter manuellement.`).catch(() => {}); // fin de l'échec silencieux
  res.json({ ok: true, marked });
});

// ─── Relances « signature » (2h/8h/22h après envoi du mandat) ET « dossier en cours » (reprise à 3h/14h
//     puis dernière chance à 22h, juste avant la fermeture) — toutes dans la fenêtre WhatsApp 24h gratuite. ──
const RELANCE_THRESHOLDS_H = [2, 8, 22];   // dossier finalisé, mandat envoyé, pas signé
const ENGAGED_THRESHOLDS_H = [3, 14, 22];  // dossier engagé : reprise (3h), rappel (14h), dernière chance avant fermeture (22h)
const _H = 3600000;
function relanceText(n, lead) {
  const url = lead.mandatUrl || ('https://robindesairs.eu/mandat.html?r=' + encodeURIComponent(lead.ref || ''));
  const total = (600 * (lead.pax || 1)) + ' €';
  const key = n === 2 ? 'RELANCE_2H' : n === 8 ? 'RELANCE_8H' : 'RELANCE_22H';
  const txt = fillTpl(pickRV(lead.ref || lead.phone, key), { REF: lead.ref || '', TOTAL: total, URL: url, NOM: lead.name || '' });
  return txt || `Il ne reste qu'une signature pour votre dossier ${lead.ref}. 👉 ${url}\n0 € si on ne gagne pas.`;
}
// Groupe de message selon l'étape où le client a décroché → on adresse la cause probable de l'arrêt.
function engGroup(step) {
  if (step === 'recap') return 'RECAP';                  // a vu le récap, pas validé → hésitation/confiance
  if (step === 'doc_boarding') return 'BOARDING';        // carte d'embarquement → souvent perdue (l'e-billet suffit)
  if (step === 'doc_eticket') return 'ETICKET';          // e-billet → introuvable (spams/Booking/agence)
  if (step === 'doc_cert') return 'CERT';                // certificat → ils croient devoir l'attendre (c'est optionnel)
  if (step && /^doc_/.test(step)) return 'PASS';         // pièce d'identité / saisie (doc_pass, doc_name, doc_dob, doc_mandant…)
  return null;                                           // étape inconnue → message de reprise générique
}
function relanceTextEngaged(n, lead, step) {
  const total = (600 * (lead.pax || 1)) + ' €';
  let key;
  if (n >= 22) { key = 'ENG_EDGE'; }                       // dernière relance avant fermeture de la fenêtre → urgence courte (peu importe l'étape)
  else { const g = engGroup(step); const suffix = n <= 3 ? '_1' : '_2'; key = g ? ('ENG_' + g + suffix) : ('RELANCE_ENGAGED' + suffix); }
  const txt = fillTpl(pickRV(lead.phone, key), { NOM: lead.name || '', VOL: tripLabel(lead), TOTAL: total });
  return txt || `On a commencé votre dossier — appuyez sur *Reprendre* 👇 pour le finaliser (jusqu'à ${total}, 0 € si on ne gagne pas), ou *Rappel* 📞. 🙏`;
}
// Vérif durable « déjà signé ? » via l'endpoint Netlify — SOURCE DE VÉRITÉ indépendante du webhook.
// Best-effort + timeout : toute erreur → false → on relance normalement (jamais de blocage, jamais pire).
async function isAlreadySigned(ref) {
  if (!ref) return false;
  try {
    const r = await fetch('https://robindesairs.eu/api/is-signed?r=' + encodeURIComponent(ref), { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return false;
    const j = await r.json().catch(() => ({}));
    return !!(j && j.signed === true);
  } catch (_) { return false; }
}
async function runRelances() {
  try {
    const cfg = watiCfg(); if (!cfg) return;
    const now = Date.now();
    for (const [k, lead] of LEADS) {
      if (!lead) continue;
      const anchorAge = lead.mandatSentAt || lead.engagedAt || 0;
      // Purge : signé, ou trop vieux (30 j) — qu'il soit finalisé ou seulement engagé.
      if ((lead.signed && !lead.fraisPending) || (anchorAge && now - anchorAge > 30 * 24 * _H)) { LEADS.delete(k); persistLeads(); continue; }
      // Fenêtre WhatsApp 24h (envoi gratuit) fermée → on n'écrit plus ; le dossier reste dans la liste « À rappeler ».
      if (lead.windowClosed || now - (lead.lastClientAt || anchorAge) > 24 * _H) continue;
      const nudges = lead.nudges || [];
      // Relance FRAIS : signé mais reçus pas encore envoyés → 1 SEUL rappel à 3h, dans la fenêtre 24h.
      if (lead.signed && lead.fraisPending) {
        const hF = (now - (lead.fraisAskedAt || now)) / _H;
        if (hF >= 3 && !nudges.includes('frais')) {
          const txt = fillTpl(pickRV(lead.phone, 'RELANCE_FRAIS'), {}) || `💶 Petit rappel : vos reçus (taxi, hôtel, repas…) partent dans notre 1er envoi si on les a aujourd'hui. Une photo suffit 📷 — ou « Pas de frais ». On peut aussi les ajouter plus tard.`;
          try { await sendButtons(lead.phone, { body: txt, buttons: [{ id: 'frais_non', text: '❌ Pas de frais' }] }, cfg); console.log('relance frais -> ' + (lead.ref || lead.phone)); } catch (_) {}
          lead.nudges = nudges.concat('frais'); lead.fraisPending = false; LEADS.set(k, lead); persistLeads();
        }
        continue; // signé → jamais de relance signature
      }
      let due = null, text = null;
      if (lead.completed && lead.mandatSentAt) {
        // Mandat envoyé, pas signé → nudge signature (ancré sur l'envoi ; jetons numériques, rétrocompatible).
        const h = (now - lead.mandatSentAt) / _H;
        const t = RELANCE_THRESHOLDS_H.find((t) => h >= t && !nudges.includes(t));
        if (t != null) {
          // SOURCE DE VÉRITÉ avant de relancer : si déjà signé en base (Netlify Blobs durable),
          // on marque et on n'envoie RIEN — le « signez ! » ne part jamais à quelqu'un qui a signé.
          // Best-effort : si la vérif échoue, isAlreadySigned renvoie false → relance normale (fail-safe).
          if (await isAlreadySigned(lead.ref)) {
            markLeadSigned(lead.phone); lead.signed = true; LEADS.set(k, lead); persistLeads();
            console.log('relance signature ANNULÉE (déjà signé en base) -> ' + (lead.ref || lead.phone));
            continue;
          }
          text = relanceText(t, lead); due = t;
        }
      } else if (lead.engagedAt) {
        // Dossier en cours, pas de lien mandat → relances « reprise » à 3h/14h puis dernière chance à 22h de SILENCE.
        const hSilent = (now - (lead.lastClientAt || lead.engagedAt)) / _H;
        const t = ENGAGED_THRESHOLDS_H.find((t) => hSilent >= t && !nudges.includes('e' + t));
        if (t != null) { text = relanceTextEngaged(t, lead, (STATE.get(k) || {}).step); due = 'e' + t; } // étape réelle d'arrêt → message adapté à la cause

      }
      if (due == null) continue;
      try {
        if (lead.completed) await sendButtons(lead.phone, { body: text, buttons: [{ id: 'deja_signe', text: '✅ J\'ai déjà signé' }, { id: 'appel', text: '📞 Besoin d\'aide' }] }, cfg); // nudge signature (lien dans le body) + filet « déjà signé »
        else await sendButtons(lead.phone, { body: text, buttons: [{ id: 'menu', text: '▶️ Reprendre' }, { id: 'snooze', text: '⏰ Plus tard' }, { id: 'appel', text: '📞 Être rappelé' }] }, cfg); // 1 tap = réponse → rouvre la fenêtre 24h gratis (id 'menu' = même action que le mot tapé)
        console.log('relance ' + due + ' -> ' + (lead.ref || lead.phone));
      } catch (_) {}
      lead.nudges = nudges.concat(due); LEADS.set(k, lead); persistLeads();
    }
  } catch (e) { console.error('runRelances', e.message); }
}
setInterval(runRelances, 15 * 60 * 1000); // toutes les 15 min

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => { console.log('\ud83e\udd16 Robin des Airs Bot v8 — Railway — port ' + PORT); });

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
const { lookupFlightRoutes } = require('./lib/flight-routes');
const { SYSTEM_PROMPT: FAQ_SYSTEM_PROMPT, FAQ_KNOWLEDGE } = require('./lib/faq-hors-tunnel');
const { pickRV, fillTpl } = require('./lib/relance-variants');
const { extractEticketMulti: extractEticketMultiLib, pdfToImages: pdfToImagesLib, normalize: normalizeEticket } = require('./lib/extract-eticket');
// Prénom du signataire, joliment capitalisé pour l'affichage (les noms sont stockés en MAJUSCULES) :
// « CLIMBIE » → « Climbie », « jean-pierre » → « Jean-Pierre », « n'goran » → « N'Goran ».
function titleCaseName(x) { return String(x || '').toLowerCase().replace(/(^|[\s\-'])([a-zà-ÿ])/g, (m, sep, c) => sep + c.toUpperCase()); }
function firstNameOf(s) { const n = (s.passengers && s.passengers[s.mandant_idx || 0] && s.passengers[s.mandant_idx || 0].name) || (s.names && s.names[0]) || ''; if (/^passager/i.test(n)) return ''; return titleCaseName(n.split(/\s+/)[0] || ''); }
// Alerte temps réel DÉDIÉE « un pax veut être rappelé » (Telegram + e-mail), distincte du miroir
// des messages → ne pas la noyer dans le flux. Appelée dès qu'un client demande un humain/rappel.
function notifyCallbackWanted(phone, s, why) {
  try {
    const nm = (s && firstNameOf(s)) || '';
    const ref = (s && s.ref) ? ` · réf ${s.ref}` : '';
    const route = (s && (s.route || s.vol)) ? ` · ${s.route || s.vol}` : '';
    const pax = (s && s.pax > 1) ? ` · ${s.pax} pax` : '';
    if (typeof notifyOwnerWhatsApp === 'function') notifyOwnerWhatsApp(phone, `📞 RAPPEL DEMANDÉ — ${nm || phone} veut être rappelé (${why}).\nTél ${phone}${ref}${route}${pax}. → en tête de la liste « À rappeler » du Bureau.`).catch(() => {});
  } catch (_) {}
}

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
// Mirror le message SORTANT du bot vers le store conversation Netlify (« robin-wa ») que lit le CRM.
// L'ENTRANT est déjà loggé côté Netlify (webhook WATI) → on ne mirror QUE le sortant (anti-doublon).
// Best-effort + fire-and-forget : n'impacte jamais la réponse au client.
async function appendWaMessage(phone, text, source) {
  try {
    const t = String(text || '').trim();
    if (!phone || !t) return;
    const secret = (process.env.WATI_WEBHOOK_SECRET || '').trim();
    await fetch('https://robindesairs.eu/api/wa-messages', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, role: 'assistant', text: t.slice(0, 4096), source: source || 'bot', secret }),
    });
  } catch (_) {}
}

// ─── Historique léger des conversations (panneau « WhatsApp » du Bureau) ──────
// RAM uniquement, capé : assez pour montrer « les dernières conversations » sans
// stockage lourd ni RGPD durable. Lu par /api/recent-conversations (proxy Netlify wa-recent).
const CONVOS = new Map();            // phoneDigits → { phone, msgs:[{role,text,at}], lastAt }
const CONVO_MAX_MSG = 12;            // derniers messages gardés par conversation
const CONVO_MAX_PHONES = 60;        // nombre de conversations gardées (les plus récentes)
function recordConvo(phone, role, text) {
  try {
    const p = String(phone || '').replace(/\D/g, ''); if (!p) return;
    const t = String(text || '').trim(); if (!t) return;
    let c = CONVOS.get(p); if (!c) { c = { phone: p, msgs: [] }; CONVOS.set(p, c); }
    c.msgs.push({ role: role === 'out' ? 'assistant' : 'user', text: t.slice(0, 500), at: Date.now() });
    if (c.msgs.length > CONVO_MAX_MSG) c.msgs = c.msgs.slice(-CONVO_MAX_MSG);
    c.lastAt = Date.now();
    if (CONVOS.size > CONVO_MAX_PHONES) {
      const oldest = [...CONVOS.values()].sort((a, b) => (a.lastAt || 0) - (b.lastAt || 0))[0];
      if (oldest) CONVOS.delete(oldest.phone);
    }
  } catch (_) {}
}

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
    const capDedup = () => { const now = Date.now(); return [...DEDUP.entries()].filter(([, t]) => now - t < 600000).slice(-5000); }; // dédup inbound durable (fenêtre 10 min) → survit aux redeploys
    await fetch('https://robindesairs.eu/api/bot-state', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, leads: cap(LEADS), state: cap(STATE), dossiers: cap(DOSSIERS), dedup: capDedup() }),
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
    { const now = Date.now(); for (const [k, v] of (d.dedup || [])) if (!DEDUP.has(k) && now - v < 600000) DEDUP.set(k, v); } // restaure la dédup inbound → un webhook rejoué après un redeploy n'est pas re-traité (anti-doublon)
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
// Frais annexes (Art 8/9) : normalisation devise saisie par le client + total par devise (multi-monnaie diaspora).
function parseDevise(t) {
  const x = String(t || '').toLowerCase();
  if (/€|eur|euro/.test(x)) return 'EUR';
  if (/fcfa|\bcfa\b|xof|franc/.test(x)) return 'XOF';
  if (/dirham|\bmad\b|\bdh\b/.test(x)) return 'MAD';
  if (/dalasi|\bgmd\b/.test(x)) return 'GMD';
  if (/dollar|\busd\b|\$/.test(x)) return 'USD';
  if (/livre|\bgbp\b|£/.test(x)) return 'GBP';
  // Repli : un code ISO connu écrit en clair (pas n'importe quel mot de 3 lettres → évite « pas » → « PAS »).
  const known = ['eur', 'xof', 'xaf', 'mad', 'gmd', 'usd', 'gbp', 'ngn', 'ghs', 'cdf', 'kes', 'dzd', 'tnd'];
  const f = (x.match(/\b[a-z]{3}\b/g) || []).find((c) => known.includes(c));
  return f ? f.toUpperCase() : '';
}
function fraisTotal(s) {
  const by = {};
  for (const f of (s.fraisList || [])) { if (!f || !f.montant) continue; const d = f.devise || '?'; by[d] = (by[d] || 0) + f.montant; }
  const parts = Object.entries(by).map(([d, v]) => `${Math.round(v * 100) / 100} ${d}`);
  return parts.length ? parts.join(' + ') : '—';
}
// Récap détaillé des frais (Art. 8/9) poste par poste + total par devise.
// La compagnie rembourse sur reçus DÉTAILLÉS (pas un montant global) → cet état chiffré
// se joint à la réclamation. Sert au client (transparence) ET à l'équipe (à recopier dans la mise en demeure).
const FRAIS_LABEL = { hotel: '🏨 Hôtel', repas: '🍽️ Repas', taxi: '🚕 Taxi/VTC', transport: '🚆 Transport', parking: '🅿️ Parking', autre: '🧾 Frais' };
// Récap frais = notification INTERNE à l'équipe (FR) uniquement → reste en français.
function fraisRecap(s) {
  const list = (s.fraisList || []).filter(Boolean);
  if (!list.length) return '';
  const lines = list.map((f, i) => {
    const lab = FRAIS_LABEL[f.categorie] || FRAIS_LABEL.autre;
    const amt = f.montant ? `${Math.round(f.montant * 100) / 100}${f.devise ? ' ' + f.devise : ''}` : 'montant à relire';
    return `${i + 1}. ${lab} — ${amt}`;
  });
  return `${lines.join('\n')}\n— — —\n*Total : ${fraisTotal(s)}*`;
}
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
    perPax: (s && s.perPax != null) ? s.perPax : (cur && cur.perPax), // pour des relances cohérentes avec le montant vu au récap
    flightVerdict: (s && s.flightVerdict) || (cur && cur.flightVerdict) || '',
    langue: (s && s.langue_code) || (cur && cur.langue) || '', // langue choisie → drapeau dans « À rappeler » (l'agent sait quelle langue parler)
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
  accueil: 0, langue: 0, consent_cgu: 0, consent_rgpd: 0,
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
// Passagers indemnisables = total MOINS les bébés EXPLICITEMENT gratuits (art. 3§3 CE261 : voyage gratuit = exclu).
// Par défaut on INCLUT (bébé payant OU tarif inconnu) ; on n'exclut QUE le bébé marqué gratuit. Minimum 1.
function claimablePax(s) {
  const pax = (s && s.pax) || 1;
  const free = (s && Array.isArray(s.passengers) ? s.passengers : []).filter((p) => p && p.gratuit).length;
  return Math.max(1, pax - free);
}
function montantReel(s) { return perPaxOf(s) * claimablePax(s); }
function montantNetReel(s) { return Math.round(montantReel(s) * 0.75); }
// Ligne montant à afficher (récap/done) selon le verdict vol.
function montantLine(s) {
  const v = s && s.flightVerdict;
  if (v === 'hors_champ' || v === 'sous_seuil') return L(s, `💰 Amount to be confirmed by an expert _(free check)_`, `💰 Montant à confirmer par un expert _(vérification gratuite)_`);
  const verified = !!(s && s.flightChecked) && v === 'eligible';
  return L(s, `💰 ${verified ? '' : 'Up to '}*€${montantReel(s)}* — you keep *€${montantNetReel(s)} net* (75%)`, `💰 ${verified ? '' : "Jusqu'à "}*${montantReel(s)} €* — vous gardez *${montantNetReel(s)} € nets* (75 %)`);
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
  'wolof':    { code: 'wo', flag: '🇸🇳', label: 'Wolof', africaine: true, agent: 'Sokhna', natif: 'Dëkk sa Wolof, bëgg na la wax — expert bi dafa xam Wolof, dafa di la woote. 🤝' },
  'mandinka': { code: 'mnk', flag: '🇬🇲', label: 'Mandinka', africaine: true, agent: 'Sarang', natif: 'I be Mandinka kan na — expert do bena i ye Mandinka fo. 🤝' },
  'twi':      { code: 'twi', flag: '🇬🇭', label: 'Twi', africaine: true, agent: 'Abena', natif: 'Yɛka Twi — ɔbenfoɔ bi a ɔka Twi bɛfrɛ wo. 🤝' },
  'yoruba':   { code: 'yo', flag: '🇳🇬', label: 'Yoruba', africaine: true, agent: 'Yetunde', natif: 'A nsọ Yoruba — amoye kan tó ń sọ Yoruba yóò pè ọ. 🤝' },
  'peul':     { code: 'ff', flag: '🇬🇳', label: 'Peul / Fulfulde', africaine: true, agent: 'Djenabou', natif: 'Eɗen haala Pulaar — annduɗo haalata Pulaar maa noddu maa. 🤝' },
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
// ─── i18n bot (MVP happy-path) ─────────────────────────────────────────────────
// L(s, en, fr) : co-localise les deux langues au point d'envoi. Le FR reste la valeur par défaut
// (zéro régression) ; on ne renvoie l'anglais QUE si le client a choisi « English ». Tant qu'un message
// n'est pas traduit, il reste en français — la bascule se fait message par message, sans tout réécrire.
function isEN(s) { return !!(s && s.langue_code === 'en'); }
function L(s, en, fr) { return (s && s.langue_code === 'en') ? en : fr; }
// Filet anti-boucle : si le bot re-pose la même question 3× → proposer aide/rappel au lieu de boucler.
async function stuckHelp(phone, s, cfg) {
  if (s._stuckStep !== s.step) { s._stuckStep = s.step; s._stuck = 0; }
  s._stuck++;
  if (s._stuck >= 3) {
    s._stuck = 0; await setState(phone, s);
    await sendButtons(phone, { body: L(s, `🙂 Looks like you're stuck — no worries, I'm here. 👇`, `🙂 Vous semblez bloqué(e) — pas de souci, je suis là pour vous aider. 👇`), buttons: [{ id: 'menu', text: L(s, '▶️ Resume', '▶️ Reprendre') }, { id: 'recommencer', text: L(s, '🔄 Start over', '🔄 Recommencer') }, { id: 'appel', text: L(s, '📞 Get a callback', '📞 Être rappelé') }] }, cfg);
    return true;
  }
  return false;
}
// Variante LEAD (relances) : le lead porte sa langue (lead.langue / lead.langue_code === 'en').
// Permet des relances bilingues EN DUR — zéro dépendance à la traduction GPT à l'envoi.
function leadEN(lead) { return !!(lead && (lead.langue === 'en' || lead.langue_code === 'en')); }
function LL(lead, en, fr) { return leadEN(lead) ? en : fr; }
// Libellé d'incident localisé pour l'affichage client (récap / confirmation).
// incident_libelle est stocké en FR (pour le CRM) → traduire à l'affichage si la session est EN.
function incidentLabel(s) {
  const fr = (s && s.incident_libelle) || '—';
  if (!(s && s.langue_code === 'en')) return fr;
  const map = { 'Retard +3h': 'Delay +3h', 'Retard (à vérifier)': 'Delay (to verify)', 'Annulation': 'Cancellation', "Refus d'embarquement": 'Denied boarding' };
  return map[fr] || fr;
}
// Détection de langue au 1er contact (haute précision : ne renvoie 'en' QUE sur des mots sans ambiguïté,
// absents du français → un francophone n'est JAMAIS détecté anglophone par erreur). '' = français par défaut.
// Sert quand le client vient du site anglais (message pré-rempli EN) ou écrit en anglais.
function detectLang(text) {
  const t = String(text || '').toLowerCase();
  if (/\b(hello|my flight|delayed|cancell?ed|compensation|boarding|denied|refund|i want to|i had a|claim my|start my claim)\b/.test(t)) return 'en';
  return '';
}
// Variante : choisit une variante de ton FR (pickVariant) en français, mais renvoie un texte EN fixe en anglais.
function LV(s, phone, key, en) { return (s && s.langue_code === 'en' && en) ? en : pickVariant(phone, key); }

// ─── Traduction à l'envoi (EN only) ────────────────────────────────────────────
// Les messages FR encore codés en dur (non passés par L()) sont traduits FR→EN à la volée
// pour le client anglophone. Cache mémoire (sature vite → rapide), repli sur le FR si l'API
// échoue (jamais bloquant). Les francophones ne déclenchent JAMAIS de traduction (zéro latence/coût).
const TR_CACHE = new Map();
function phoneIsEN(phone) { try { const st = STATE.get(String(phone || '').replace(/\D/g, '')); return !!(st && st.langue_code === 'en'); } catch (_) { return false; } }
async function translateEN(text) {
  const t = String(text == null ? '' : text);
  if (!t.trim() || t === '👇') return t;
  if (TR_CACHE.has(t)) return TR_CACHE.get(t);
  const key = process.env.OPENAI_API_KEY;
  if (!key) return t;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(7000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 900, temperature: 0, messages: [
        { role: 'system', content: 'You translate WhatsApp messages from French to English for a flight-compensation assistant (Robin des Airs). If the text is ALREADY English, return it unchanged. Keep EXACTLY: every *asterisk* (WhatsApp bold), every _underscore_ (italics), every emoji, all URLs, phone numbers, reference codes (e.g. RDA-...), flight numbers, amounts and currency symbols (€), and all line breaks. Translate naturally and concisely. Output ONLY the message text — no quotes, no notes.' },
        { role: 'user', content: t },
      ] }),
    });
    const data = await res.json().catch(() => ({}));
    const out = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const en = (out && String(out).trim()) || t;
    TR_CACHE.set(t, en);
    return en;
  } catch (_) { return t; }
}

// ─── Envoi texte / liste / boutons (plomberie éprouvée + clip + debug) ─────────
async function send(phone, text, cfg) {
  // Anglais EN DUR : tout le texte EN vient de L()/LV() (plus de traduction GPT runtime).
  recordConvo(phone, 'out', text); // historique léger pour le Bureau
  appendWaMessage(phone, text, 'bot'); // mirror SORTANT → store conversation CRM (fire-and-forget)
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
  const isArr = Array.isArray(config);
  let body    = isArr ? '👇' : (config.body || '');
  const footer  = isArr ? undefined : config.footer;
  let buttons = isArr ? config : (config.buttons || []);
  // Anglais EN DUR : body + libellés viennent déjà de L() (plus de traduction GPT runtime).
  if (body && body !== '👇') appendWaMessage(phone, body, 'bot');
  const wa = normalizeWatiPhone(phone);
  const textFallback = () => send(phone, (body && body !== '👇' ? body + '\n\n' : '') + buttons.map((b, i) => `${i + 1} — ${b.text}`).join('\n'), cfg);
  // ⚠️ Ce compte WATI ne rend PAS l'interactif v3 (cf. sendList → texte). L'endpoint v1
  // sendInteractiveButtonsMessage, lui, rend de VRAIS boutons cliquables (prod depuis ~2 mois).
  // Ne pas rebasculer vers v3 sans avoir vérifié que les boutons s'affichent vraiment.
  const qs = new URLSearchParams({ whatsappNumber: wa, channelPhoneNumber: cfg.channel });
  try {
    const res = await fetch(`${cfg.base}/api/v1/sendInteractiveButtonsMessage?${qs}`, {
      method: 'POST', signal: AbortSignal.timeout(12000), headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body || '👇', footer: footer || '🏹 Robin des Airs', buttons: buttons.slice(0, 3).map(b => ({ text: clip(b.text, 20) })) }),
    });
    const data = await res.json().catch(() => ({}));
    const failed = !res.ok || data.result === false || data.error || data.ok === false || data.success === false;
    await saveInteractiveDebug({ fn: 'sendButtons-v1', status: res.status, failed, resp: data });
    if (failed) await textFallback();
  } catch (e) { await saveInteractiveDebug({ fn: 'sendButtons-v1', error: e.message }); await textFallback(); }
}
async function sendList(phone, { header, body, footer, buttonText, items, lang }, cfg) {
  if (!cfg) return;
  // Anglais EN DUR : header/body/items viennent déjà de L() (plus de traduction GPT runtime).
  const wa = normalizeWatiPhone(phone);
  const numHint = lang === 'en' ? `\n\n👉 Reply with the *number*.` : `\n\n👉 Répondez avec le *numéro*.`;
  const rows = items.map((i, idx) => ({ id: i.id || String(idx + 1), title: clip(i.title, 24), description: clip(i.description || '', 72) }));
  // ✅ Vraie liste cliquable = endpoint v3 "active conversation" avec type:"list"
  //    (le /api/v1/sendInteractiveListMessage rend toujours en texte — confirmé support WATI).
  let host; try { host = new URL(cfg.base).origin; } catch { host = cfg.base; }
  const textFallback = () => send(phone, (header ? `*${header}*\n\n` : '') + body + '\n\n' + items.map((it, idx) => `${NUMEMO[idx] || (idx + 1 + '.')} ${it.title}`).join('\n') + numHint, cfg);
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
// ─── Envoi d'un TEMPLATE WhatsApp APPROUVÉ (hors fenêtre 24h) ──────────────────
// Le bot n'écrit en texte libre QUE dans la fenêtre 24h ; passé ce délai, seul un
// template Meta approuvé peut re-toucher le client. Le tap sur son bouton « Reprendre »
// rouvre la fenêtre → le handler inbound reprend le flux tout seul (cf. docs/TEMPLATES-WATI.md).
// parameters = [{name:'1', value:'…'}, …] (format WATI sendTemplateMessage).
async function watiSendTemplate(phone, templateName, parameters, cfg) {
  if (!cfg || !templateName) return { ok: false };
  const wa = normalizeWatiPhone(phone);
  if (!wa || wa.length < 10) return { ok: false };
  try {
    const res = await fetch(`${cfg.base}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(wa)}`, {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_name: templateName, broadcast_name: `relance_${templateName}_${Date.now()}`, parameters: parameters || [] }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && data.result !== false && data.ok !== false && !data.error;
    if (!ok) console.error('v8 WATI template REJETÉ', res.status, JSON.stringify(data).slice(0, 200), '→', templateName);
    return { ok, data };
  } catch (e) { console.error('watiSendTemplate', e.message); return { ok: false }; }
}
// WATI ne rend pas les listes interactives sur ce compte (elles arrivent en texte).
// → on envoie un choix numéroté clair, et les handlers acceptent le numéro OU le mot-clé.
const NUMEMO = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
async function sendChoices(phone, { body, items, footer, lang }, cfg) {
  const lines = items.map((it, i) => `${NUMEMO[i] || (i + 1 + '.')} ${it.title}${it.description ? ` — _${it.description}_` : ''}`).join('\n');
  const hint = lang === 'en' ? `\n\n👉 Reply with the *number* (e.g. 1)` : `\n\n👉 Répondez avec le *numéro* (ex. 1)`;
  await send(phone, `${body}\n\n${lines}${hint}${footer ? `\n${footer}` : ''}`, cfg);
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
function genRef() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  // Réf INDEVINABLE : 16 octets de hasard (128 bits) en base36. Le lien mandat.html?r=REF ouvre le
  // dossier (données perso) sans mot de passe → la réf doit être impossible à énumérer ou bruteforcer.
  const rand = BigInt('0x' + crypto.randomBytes(16).toString('hex')).toString(36).toUpperCase();
  return `RDA-${d}-${rand}`;
}
function normInput(raw, options) { const t = (raw || '').trim().toLowerCase(); if (/^\d+$/.test(t)) return t; const i = options.findIndex(o => t.includes(o.toLowerCase())); return i >= 0 ? String(i + 1) : t; }
const AIRLINES = { AF: 'Air France', SN: 'Brussels Airlines', TP: 'TAP Air Portugal', AT: 'Royal Air Maroc', HC: 'Air Sénégal', KQ: 'Kenya Airways', ET: 'Ethiopian Airlines', EK: 'Emirates', TK: 'Turkish Airlines', KL: 'KLM', LH: 'Lufthansa', IB: 'Iberia', EJU: 'easyJet', U2: 'easyJet', FR: 'Ryanair', TO: 'Transavia', KP: 'ASKY', DN: 'Senegal Airlines' };
function deduceAirline(vol) { const m = (vol || '').toUpperCase().match(/^([A-Z]{2,3})\d/); return (m && AIRLINES[m[1]]) || ''; }
// Transporteurs EFFECTIFS européens (UE + EEE/Suisse, couverts par le CE261). Sert UNIQUEMENT au cas
// « vol ENTRANT en Europe » : il n'est couvert que si la compagnie qui OPÈRE réellement le vol est
// européenne (Art. 3 §1 b). Au DÉPART d'Europe, peu importe la compagnie → cette liste ne s'applique pas.
const UE_CARRIERS = new Set(['AF', 'KL', 'SN', 'TP', 'LH', 'IB', 'U2', 'EJU', 'FR', 'TO', 'HV', 'LX', 'OS', 'EW', 'AZ', 'A3', 'SK', 'AY', 'LO', 'VY', 'DY', 'EN', 'WK', 'WF', 'IG']);
function isCarrierUE(code) { return UE_CARRIERS.has(String(code || '').toUpperCase().replace(/\s+/g, '')); }
// Aéroports EUROPÉENS (UE + EEE + Suisse + Royaume-Uni) — sert à dériver le « sens » d'une jambe
// (part d'Europe vs arrive en Europe) sur un ALLER-RETOUR, où chaque trajet touche l'Europe par un bout.
const EU_AIRPORTS = new Set([
  'CDG', 'ORY', 'LYS', 'MRS', 'NCE', 'BOD', 'TLS', 'NTE', 'SXB', 'MLH', 'LIL', 'RNS', 'CLY', 'AJA', 'BIA',
  'BRU', 'CRL', 'AMS', 'EIN', 'LHR', 'LGW', 'STN', 'LTN', 'LCY', 'MAN', 'BHX', 'EDI', 'GLA', 'BRS', 'DUB',
  'FRA', 'MUC', 'BER', 'DUS', 'HAM', 'CGN', 'STR', 'NUE', 'VIE', 'ZRH', 'GVA', 'BSL', 'OSL', 'ARN', 'CPH', 'HEL',
  'LIS', 'OPO', 'MAD', 'BCN', 'VLC', 'FCO', 'MXP', 'VCE', 'NAP', 'ATH', 'WAW', 'PRG', 'BUD', 'SOF', 'OTP']);
function isEUAirport(code) { return EU_AIRPORTS.has(String(code || '').toUpperCase().trim()); }
// Code IATA (préfixe) d'un n° de vol : « AF703 » → « AF », « U24023 » → « U2 », « EJU8704 » → « EJU ».
// Le désignateur IATA fait 2 caractères ; on n'accepte 3 caractères QUE si c'est un code connu (ex. EJU),
// sinon le {2,3} gourmand avalerait un chiffre (« AF703 » → « AF7 »).
function carrierCode(vol) {
  const v = String(vol || '').toUpperCase().replace(/\s+/g, '');
  const m3 = v.match(/^([0-9A-Z]{3})\d/); if (m3 && AIRLINES[m3[1]]) return m3[1];
  const m2 = v.match(/^([0-9A-Z]{2})\d/); return m2 ? m2[1] : '';
}
// Tronçon PERTINENT pour l'éligibilité = celui qui touche l'Europe DANS LE BON SENS (l'entrée pour un vol
// entrant, la sortie pour un vol sortant). On le cherche par AÉROPORT, donc l'ordre des cartes/segments
// n'a aucune importance (cartes d'embarquement envoyées à l'envers → même résultat). Renvoie null sinon.
function relevantLeg(segs, europeTouch) {
  if (!Array.isArray(segs) || !segs.length) return null;
  const dep = (l) => l.depart || l.dep, arr = (l) => l.arrivee || l.arr;
  if (europeTouch === 'arrivee') return segs.find((l) => isEUAirport(arr(l)) && !isEUAirport(dep(l))) || null;
  if (europeTouch === 'depart') return segs.find((l) => isEUAirport(dep(l)) && !isEUAirport(arr(l))) || null;
  return null;
}
// Transporteur EFFECTIF : (1) le tronçon qui touche l'Europe — son « opéré par » code-share, sinon le préfixe
// de SON vol (indépendant de l'ordre) ; (2) à défaut de segments, le « opéré par » global ; (3) sinon le
// préfixe du dernier vol. C'est LUI qui décide de l'éligibilité entrante et du destinataire de la réclamation.
function effectiveCarrier(s, e) {
  const segs = (e && Array.isArray(e.segments) && e.segments.length) ? e.segments
    : (s && Array.isArray(s.legs) && s.legs.length) ? s.legs : null;
  const rl = relevantLeg(segs, s && s.europeTouch);
  if (rl) { const op = (rl.operateur || carrierCode(rl.vol) || '').toUpperCase(); if (op) return op; }
  const op = (e && e.operePar) || (s && s.operePar) || '';
  if (op) return op.toUpperCase();
  const vol = (e && e.vol) || (s && s.vol) || '';
  const last = String(vol).split('+').pop().trim(); // « AF703 + AF704 » → dernier segment
  return carrierCode(last);
}
// Sur un vol ENTRANT en Europe, marque le dossier si le transporteur effectif est HORS-UE (code-share inclus).
// On NE FERME PAS le dossier (un expert vérifie un autre recours) : on pose juste un drapeau + escalade.
function markOperateurEffectif(s, e) {
  const eff = effectiveCarrier(s, e);
  if (eff) s.operateur_code = eff;
  s.operateurNonUe = !!(s.europeTouch === 'arrivee' && eff && !isCarrierUE(eff));
  if (s.operateurNonUe) s.escalade = s.escalade || 'operateur_non_ue';
  // Destinataire de la réclamation = le transporteur EFFECTIF (Art. 2 b : c'est l'opérateur du vol qui
  // est redevable). Sur une correspondance, c'est la compagnie du tronçon qui ramène en Europe.
  s.compagnie_reclamation = (eff && AIRLINES[eff]) || s.compagnie || eff || '';
}
// Décide le transporteur EFFECTIF à partir de TOUTES les sources, par ordre de fiabilité décroissante :
//   1) « opéré par » lu sur l'e-billet (le plus sûr, obligation légale d'affichage) ;
//   2) opérateur renvoyé par AeroDataBox s'il DIFFÈRE du code marketing du n° de vol (= vrai code-share) ;
//   3) codeshareStatus = « IsCodeshared » sans opérateur exploitable → on sait que c'est un code-share
//      mais pas qui opère → drapeau « à vérifier » (l'humain tranche), sans rien affirmer.
// Renvoie { effective, source, codeshareUnknown }. PURE (aucun réseau) → testable hors-ligne.
function decideOperatingCarrier({ vol, ticketOperePar, apiCarrierIata, codeshareStatus }) {
  const marketing = carrierCode(vol);
  const ticket = String(ticketOperePar || '').toUpperCase().replace(/\s+/g, '');
  if (ticket) return { effective: ticket, source: 'eticket', codeshareUnknown: false };
  const api = String(apiCarrierIata || '').toUpperCase().replace(/\s+/g, '');
  if (api && api !== marketing) return { effective: api, source: 'aerodatabox', codeshareUnknown: false };
  if (String(codeshareStatus || '').toLowerCase() === 'iscodeshared') return { effective: marketing, source: 'marketing', codeshareUnknown: true };
  return { effective: marketing || '', source: 'marketing', codeshareUnknown: false };
}
// Enrichit l'état via AeroDataBox UNIQUEMENT quand c'est utile et sûr : vol ENTRANT en Europe + AUCUN
// « opéré par » lu sur le billet. Best-effort (timeout court, n'échoue jamais le tunnel). Met à jour le
// transporteur effectif (verdict exact si l'API donne l'opérateur) ou pose `operateurAVerifier` (code-share
// détecté, opérateur inconnu). Renvoie true si l'état a changé.
async function enrichOperatingFromAero(s) {
  try {
    if (s.europeTouch !== 'arrivee' || s.operePar) return false; // pas entrant, ou déjà tranché par le billet
    const v = String(s.vol || '').split('+').pop().trim(); // jambe qui arrive (dernier segment)
    const ymd = toISODate(s.date);
    if (!carrierCode(v) || !ymd) return false;
    const res = await fetch(`https://robindesairs.eu/api/flight-info?flight=${encodeURIComponent(v)}&date=${encodeURIComponent(ymd)}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return false;
    const d = decideOperatingCarrier({ vol: v, ticketOperePar: '', apiCarrierIata: row.airlineIata, codeshareStatus: row.codeshareStatus });
    s.operateur_code = d.effective || s.operateur_code || '';
    s.compagnie_reclamation = (s.operateur_code && AIRLINES[s.operateur_code]) || s.compagnie || s.operateur_code || '';
    if (d.source === 'aerodatabox' && d.effective && !isCarrierUE(d.effective)) {
      s.operateurNonUe = true; s.operateurAVerifier = false; s.escalade = s.escalade || 'operateur_non_ue';
    } else if (d.codeshareUnknown) {
      s.operateurAVerifier = true; s.escalade = s.escalade || 'codeshare_a_verifier';
    } else return false;
    return true;
  } catch (_) { return false; }
}
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
// Dernier recours quand AeroDataBox n'a pas la route (vol trop ancien = hors fenêtre de données) :
// on demande à OpenAI le trajet HABITUEL du numéro de vol (info publique stable). Garde-fous :
// (1) le modèle ne devine PAS — flag « sur », sinon on renvoie null ; (2) la route est TOUJOURS
// reconfirmée par le client (askRouteConfirm) → c'est une SUGGESTION, jamais un fait imposé ;
// (3) l'appelant pose un verdict « a_verifier » → l'éligibilité reste tranchée par l'expert, pas par l'IA.
// Résout les routes POSSIBLES d'un n° de vol via LLM (GPT-4o).
// Retourne un tableau de 1-3 routes [{dep,arr,airline,route}] ou null.
// Plusieurs routes quand le vol opère un "milk run" (ex. SN277 = BRU→ACC→LFW → 3 options).
async function resolveRouteViaLLM(vol) {
  const key = process.env.OPENAI_API_KEY;
  const v = String(vol || '').toUpperCase().replace(/\s+/g, '');
  if (!key || !/^[A-Z0-9]{3,8}$/.test(v)) return null;
  try {
    const prompt = `Tu identifies les trajets POSSIBLES d'un numéro de vol commercial régulier. Vol : "${v}".
Réponds UNIQUEMENT en JSON : {"routes":[{"dep":"","arr":"","airline":""}],"sur":false}
- routes : tableau de 1 à 3 objets. Chaque objet = un tronçon possible (dep/arr = codes IATA 3 lettres).
  * Si le vol est direct A→B : 1 seul objet.
  * Si le vol fait une ou deux escales (ex. BRU→ACC→LFW) : liste TOUS les tronçons opérés + le trajet complet.
    Exemple BRU→ACC→LFW : [{"dep":"BRU","arr":"ACC"},{"dep":"ACC","arr":"LFW"},{"dep":"BRU","arr":"LFW"}]
  * Toujours renseigner ta meilleure estimation même si tu n'es pas certain.
  * Si le vol n'existe pas ou est totalement inconnu, renvoyer routes:[].
- airline : nom de la compagnie (ex. SN = Brussels Airlines).
- sur : true si certain du routing, false sinon.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 160, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) return null;
    const data = await res.json(); if (!data.choices) return null;
    const p = JSON.parse(data.choices[0].message.content);
    const airline = String(p.airline || '').trim();
    const routes = (Array.isArray(p.routes) ? p.routes : []).map((r) => {
      const dep = String(r.dep || '').toUpperCase().replace(/[^A-Z]/g, '');
      const arr = String(r.arr || '').toUpperCase().replace(/[^A-Z]/g, '');
      if (dep.length !== 3 || arr.length !== 3 || dep === arr) return null;
      return { dep, arr, airline, route: `${iataLabel(dep)} → ${iataLabel(arr)}` };
    }).filter(Boolean).slice(0, 3);
    return routes.length ? routes : null;
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
// Mots courants qui ne sont PAS des villes (évite que « merci » devienne une ville de départ).
const _NON_CITY = new Set(['merci','thanks','thank','super','parfait','cool','ok','oui','non','bonjour','bonsoir','hello','allo','allô','salut','bye','rien','bien','aide','help','stop','suite','go','fin','bravo','voilà','voila','reçu','recu','compris','entendu','exact','tout','rien','stp','svp']);
function cleanCity(input) {
  const c = String(input || '').replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim();
  if (c.length < 2 || c.length > 40 || /^\d+$/.test(c) || /^\[/.test(c) || !/[a-zà-öø-ÿ]/i.test(c)) return '';
  if (_NON_CITY.has(c.toLowerCase())) return '';
  if (c.length === 3 && /^[a-z]{3}$/i.test(c) && c !== c.toLowerCase()) return c.toUpperCase(); // « DSS », « Cdg » = code aéroport
  return c.charAt(0).toUpperCase() + c.slice(1);
}
// Correspondance IATA → nom de ville (pour humaniser les routes du fallback LLM).
// Priorité : corridors Afrique ↔ Europe exploités par les compagnies cibles (AF/SN/KL/AT/HC…).
const IATA_CITY = {
  // France
  CDG:'Paris', ORY:'Paris (Orly)', LYS:'Lyon', MRS:'Marseille', NCE:'Nice', BOD:'Bordeaux',
  TLS:'Toulouse', NTE:'Nantes', SXB:'Strasbourg', MLH:'Bâle-Mulhouse', LIL:'Lille',
  RNS:'Rennes', CLY:'Calvi', AJA:'Ajaccio', BIA:'Bastia',
  // Benelux & Îles Brit.
  BRU:'Bruxelles', CRL:'Bruxelles (Charleroi)', AMS:'Amsterdam', EIN:'Eindhoven',
  LHR:'Londres', LGW:'Londres (Gatwick)', STN:'Londres (Stansted)', LTN:'Londres (Luton)',
  LCY:'Londres (City)', MAN:'Manchester', BHX:'Birmingham', EDI:'Édimbourg', GLA:'Glasgow',
  BRS:'Bristol', DUB:'Dublin',
  // Europe centrale & du Nord
  FRA:'Francfort', MUC:'Munich', BER:'Berlin', DUS:'Düsseldorf', HAM:'Hambourg',
  CGN:'Cologne', STR:'Stuttgart', NUE:'Nuremberg',
  VIE:'Vienne', ZRH:'Zurich', GVA:'Genève', BSL:'Bâle',
  OSL:'Oslo', ARN:'Stockholm', CPH:'Copenhague', HEL:'Helsinki',
  LIS:'Lisbonne', OPO:'Porto', MAD:'Madrid', BCN:'Barcelone', VLC:'Valence',
  FCO:'Rome', MXP:'Milan', VCE:'Venise', NAP:'Naples', ATH:'Athènes',
  WAW:'Varsovie', PRG:'Prague', BUD:'Budapest', SOF:'Sofia', OTP:'Bucarest',
  // Moyen-Orient & Asie (hubs de correspondance diaspora)
  IST:'Istanbul', SAW:'Istanbul (Sabiha)', DXB:'Dubaï', AUH:'Abu Dhabi',
  DOH:'Doha', BAH:'Bahreïn', AMM:'Amman', BEY:'Beyrouth', CAI:'Le Caire',
  // Afrique du Nord (Maghreb)
  CMN:'Casablanca', RAK:'Marrakech', AGA:'Agadir', TNG:'Tanger', FEZ:'Fès',
  TUN:'Tunis', SFA:'Sfax', MIR:'Monastir',
  ALG:'Alger', ORN:'Oran', AAE:'Annaba', TLM:'Tlemcen',
  TIP:'Tripoli', BEN:'Benghazi', SEB:'Sebha',
  // Afrique de l'Ouest
  DSS:'Dakar', DKR:'Dakar (Yoff)', ZIG:'Ziguinchor',
  ABJ:'Abidjan', BYK:'Bouaké',
  ACC:'Accra', KMS:'Kumasi',
  LOS:'Lagos', ABV:'Abuja', KAN:'Kano', PHC:'Port Harcourt', ENU:'Enugu',
  BKO:'Bamako', KYS:'Kayes',
  OUA:'Ouagadougou', BOY:'Bobo-Dioulasso',
  COO:'Cotonou',
  LFW:'Lomé',
  NIM:'Niamey',
  CKY:'Conakry', FIG:'Fria',
  BJL:'Banjul',
  OXB:'Bissau',
  RAI:'Praia', SID:'Sal (Cap-Vert)',
  NKC:'Nouakchott',
  FNA:'Freetown',
  ROB:'Monrovia',
  // Afrique centrale
  DLA:'Douala', NSI:'Yaoundé', GOU:'Garoua', MVR:'Maroua',
  FIH:'Kinshasa', FBM:'Lubumbashi', MNO:'Manono',
  BZV:'Brazzaville', PNR:'Pointe-Noire',
  LBV:'Libreville',
  SSG:'Malabo', BSG:'Bata',
  BGF:'Bangui',
  NDJ:'N\'Djamena',
  TMS:'São Tomé',
  LAD:'Luanda', VHC:'Saurimo', SVP:'Kuito',
  // Afrique de l'Est
  NBO:'Nairobi', MBA:'Mombasa', KIS:'Kisumu',
  EBB:'Entebbe',
  DAR:'Dar es Salaam', ZNZ:'Zanzibar', JRO:'Kilimandjaro',
  ADD:'Addis-Abeba', DIR:'Dire Dawa', GMB:'Gambela',
  BJM:'Bujumbura',
  KGL:'Kigali',
  JIB:'Djibouti',
  ASM:'Asmara',
  HGA:'Hargeisa', MGQ:'Mogadiscio',
  // Afrique Australe
  JNB:'Johannesburg', CPT:'Le Cap', DUR:'Durban', PLZ:'Port Elizabeth',
  HRE:'Harare', BUQ:'Bulawayo',
  LUN:'Lusaka', NLA:'Ndola',
  MPM:'Maputo', BEW:'Beira',
  WDH:'Windhoek',
  GBE:'Gaborone',
  MTS:'Manzini',
  // Océan Indien
  TNR:'Antananarivo', MJN:'Mahajanga', TMM:'Tamatave', DIE:'Diégo-Suarez',
  RUN:'La Réunion', DZA:'Dzaoudzi (Mayotte)',
  MRU:'Maurice',
  HAH:'Moroni', AJN:'Anjouan', NWA:'Mohéli',
  SEZ:'Mahé (Seychelles)', PRI:'Praslin',
};
function iataLabel(code) { return IATA_CITY[String(code || '').toUpperCase()] || code; }
// Remplace les codes IATA 3 lettres d'une route texte par les noms de ville (« DSS → CDG » → « Dakar → Paris »).
function humanizeRoute(r) { return r ? String(r).replace(/\b([A-Z]{3})\b/g, (m) => iataLabel(m)) : r; }

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
  const en = phoneIsEN(phone);
  return sendList(phone, { header, body, buttonText: en ? 'City ▾' : 'Ville ▾', items: cities.map((c) => ({ title: c.v, description: c.d })).concat([{ id: 'ville_autre', title: en ? '✏️ Other city' : '✏️ Autre ville', description: en ? 'Type its name' : 'Tapez son nom' }]) }, cfg);
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
    vol: s.vol || '', date: s.date || '', pnr: s.pnr || '', billet: s.billet || '', compagnie: s.compagnie || '',
    route: s.route || '', depAirport: _routeParts[0] || '', arrAirport: _routeParts[_routeParts.length - 1] || '', motif: s.incident_libelle || '', incident: _incidentCode, pax: s.pax || 1, indemnite: perPaxOf(s),
    // Vol avec correspondance : on transporte les segments structurés pour que la page mandat
    // bascule en mode « correspondance » et pré-remplisse chaque vol (sinon « Vol concerné : — »).
    legs: (s.legs || []).filter((l) => l && (l.vol || l.dep || l.arr)).map((l) => ({ fnum: l.vol || '', dep: l.dep || '', arr: l.arr || '', date: l.date || (s.date || '') })),
    // Vérification vol (AeroDataBox) — destinée à l'équipe qui rappelle / au calcul de la lettre.
    flightVerdict: s.flightVerdict || '', flightChecked: !!s.flightChecked, flightDelayMin: (s.flightDelayMin != null ? s.flightDelayMin : ''), distanceKm: s.distanceKm || '',
    aVerifierExpert: ['a_verifier', 'hors_champ', 'sous_seuil'].includes(s.flightVerdict) || s.type_vol === 'escale' || (s.passengers || []).some((p) => p && p.bebe && !p.gratuit), // bébé inclus sans tarif confirmé → l'expert vérifie l'INF payé (art. 3§3)
    lang: s.langue_code || 'fr',
    passengers: (s.passengers || []).slice(0, s.pax || 1).map(p => ({ name: cleanName((p && p.name) || ''), dob: toISODate((p && p.dob) || ''), adresse: (p && p.adresse) || '' })),
    cid: phone || '', lsa: new Date().toISOString(), source: 'wati-bot-v8',
  };
  if (s.ref) { DOSSIERS.set(s.ref, dossier); persistDossiers(); storeDossierDurable(s.ref, dossier).catch(() => {}); }
  const _page = isEN(s) ? 'mandat-en.html' : 'mandat.html'; // client anglophone → mandat traduit
  return `https://robindesairs.eu/${_page}?r=${encodeURIComponent(s.ref || '')}`;
}

// ─── OCR (Vision) ────────────────────────────────────────────────────────────
// Récupère une pièce et la rend lisible par gpt-4o (Vision). Si c'est un PDF (passeport/carte
// d'embarquement scannés en PDF, fréquent), on rastérise la 1ʳᵉ page via mupdf — gpt-4o ne lit PAS
// un PDF étiqueté image. Renvoie { b64, mime } ou null. Accepte image ET PDF, comme l'e-billet.
// ─── SSRF guard pour les médias ───────────────────────────────────────────────
// Le mediaUrl provient du payload webhook WATI. On (1) BLOQUE les cibles internes
// (métadonnées cloud 169.254.169.254, réseau interne Railway, localhost) pour qu'un
// payload malveillant ne puisse pas pivoter dans l'infra, et (2) n'attache le token
// WATI qu'aux hôtes WATI de confiance → un hôte arbitraire ne peut jamais récupérer
// le Bearer (anti-exfiltration). En dev/test, WATI_API_BASE pointe sur 127.0.0.1 :
// l'hôte de base configuré est alors traité comme de confiance, la simulation marche.
function mediaFetchHeaders(rawUrl, cfg) {
  let u;
  try { u = new URL(String(rawUrl || '')); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = (u.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return null;
  let baseHost = '';
  try { baseHost = cfg && cfg.base ? new URL(cfg.base).hostname.toLowerCase().replace(/^\[|\]$/g, '') : ''; } catch {}
  // Hôtes WATI de confiance → seuls habilités à recevoir le token (eu-api.wati.io, live-mt-server.wati.io…)
  const trusted = host === 'wati.io' || host.endsWith('.wati.io') || (baseHost && host === baseHost);
  if (trusted) return { headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {} };
  // Hôte NON de confiance : on bloque tout ce qui est interne/privé, sinon fetch SANS token.
  const m172 = host.match(/^172\.(\d{1,3})\./);
  const isPrivateV4 = /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || /^0\./.test(host) || (m172 && +m172[1] >= 16 && +m172[1] <= 31);
  const isPrivateV6 = host.includes(':') && (host === '::1' || host === '::' || /^(fe80|fc|fd)/.test(host));
  const isPrivateName = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local');
  const isRawNumeric = /^\d+$/.test(host) || /^0x/i.test(host); // IP encodée (ex. 2130706433 = 127.0.0.1) → on refuse
  if (isPrivateV4 || isPrivateV6 || isPrivateName || isRawNumeric) return null;
  return { headers: {} };
}
async function fetchAsImageB64(mediaUrl, cfg) {
  if (!mediaUrl) return null;
  try {
    const mh = mediaFetchHeaders(mediaUrl, cfg);
    if (!mh) return null; // SSRF : hôte interne/illégal refusé (jamais de fetch+token vers une cible non-WATI)
    const r = await fetch(mediaUrl, { headers: mh.headers, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    const buf = Buffer.from(await r.arrayBuffer());
    const hash = crypto.createHash('sha256').update(buf).digest('hex'); // anti-doublon sur les octets ORIGINAUX
    const isPdf = ct.includes('pdf') || (buf.length > 4 && buf.slice(0, 5).toString('latin1') === '%PDF-');
    if (isPdf) {
      const pages = await pdfToImagesLib(buf, { maxPages: 1 });
      if (pages && pages[0]) return { b64: pages[0].toString('base64'), mime: 'image/png', hash };
      return null; // PDF illisible (mupdf indispo) → l'appelant gère l'échec (photo illisible)
    }
    const m = ct.match(/image\/(jpeg|png|webp|gif)/);
    return { b64: buf.toString('base64'), mime: m ? m[0] : 'image/jpeg', hash };
  } catch (_) { return null; }
}
const _OCR_BOARDING_PROMPT = `Tu lis une CARTE D'EMBARQUEMENT, un E-BILLET ou une ÉTIQUETTE DE BAGAGE d'avion (les trois portent les mêmes infos ; l'étiquette bagage = aussi une PREUVE de voyage). Réponds UNIQUEMENT en JSON :
{"vol":"","compagnie":"","date":"","pnr":"","depart":"","arrivee":"","nom":"","operateur":"","segments":[{"vol":"","depart":"","arrivee":"","date":"","heure":"","operateur":""}]}
Règles STRICTES :
- vol : numéro de vol en MAJUSCULES sans espace (ex. EJU7273, AF718) — celui du 1er tronçon.
- compagnie : nom complet (déduis du code IATA si besoin).
- segments : ⚠️ un MÊME document porte SOUVENT PLUSIEURS tronçons (2 ou 3 : ex. DKR→CMN→CDG, ou une étiquette bagage qui suit tout le trajet). Liste-les TOUS ici, dans l'ordre, chacun avec vol / depart / arrivee (IATA 3 lettres) / date (JJ/MM ou JJ/MM/AAAA) / heure de départ (HH:MM si imprimée, sinon "") / operateur. S'il n'y a qu'un seul vol, mets ce seul tronçon. Ne devine jamais un tronçon absent.
- operateur : par tronçon, UNIQUEMENT si « opéré par / operated by » une compagnie DIFFÉRENTE du numéro de vol (code-share) → CODE IATA 2 lettres de la compagnie qui OPÈRE (ex. « AF703 operated by Kenya Airways » → "KQ"). Sinon "". Ne devine JAMAIS.
- date : "JJ/MM" si l'année N'EST PAS imprimée sur le document ; "JJ/MM/AAAA" UNIQUEMENT si l'année est réellement écrite. NE JAMAIS deviner ni inventer l'année (les cartes d'embarquement n'ont souvent pas l'année).
- pnr : référence de réservation (libellés possibles : PNR, Booking ref, Réf, Record locator, Confirmation) — 5 à 8 caractères ALPHANUMÉRIQUES, souvent près d'un code-barres. Cherche-la attentivement. Si vraiment absente, "".
- depart / arrivee : codes IATA 3 lettres.
- nom : nom du passager tel qu'imprimé (souvent "NOM/PRENOM" ou "NOM PRENOM", en MAJUSCULES). Si illisible ou absent, "".
- Champ inconnu = "". Ne JAMAIS inventer.`;

async function _ocrBoardingClaude(media) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
  try {
    const model = process.env.BOARDING_CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 900, temperature: 0,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: media.mime || 'image/jpeg', data: media.b64 } },
          { type: 'text', text: _OCR_BOARDING_PROMPT },
        ] }] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const m = txt.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch (_) { return null; }
}

async function _ocrBoardingGpt(media) {
  const key = process.env.OPENAI_API_KEY; if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 700, temperature: 0, response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: [
          { type: 'text', text: _OCR_BOARDING_PROMPT },
          { type: 'image_url', image_url: { url: `data:${media.mime};base64,${media.b64}` } },
        ] }] }),
    });
    const data = await res.json(); if (!data.choices) return null;
    return JSON.parse(data.choices[0].message.content);
  } catch (_) { return null; }
}

// OCR carte d'embarquement / e-billet / etiquette bagage : Claude primary + GPT-4o fallback.
async function ocrBoardingPass(mediaUrl, cfg) {
  if (!mediaUrl) return null;
  const media = await fetchAsImageB64(mediaUrl, cfg);
  if (!media) return null;
  let p = await _ocrBoardingClaude(media);
  if (!p || !(p.vol || p.pnr || (p.segments && p.segments.length))) p = await _ocrBoardingGpt(media);
  if (!p) return null;
  try {
    // Nom lu sur la carte → pré-remplit le passager 1 (le PASSEPORT reste la pièce qui fait foi, demandé ensuite).
    let nomRaw = (p.nom || '').toUpperCase().trim();
    nomRaw = nomRaw.replace(/\s+(MRS|MR|MS|MME|MLLE|MSTR|CHD|INF)\.?$/, '');          // titre séparé : « DIALLO/AMINATA MRS »
    nomRaw = nomRaw.replace(/^(.+\/.+?)(MRS|MSTR|CHD|INF)$/, '$1');                   // titre GDS collé : « DIALLO/AMINATAMRS » (pas MR/MS : trop de vrais noms finissent ainsi)
    const nom = cleanName(nomRaw);
    // Un MÊME document (carte/e-billet/étiquette bagage) peut porter 2-3 tronçons → on reconstruit via
    // normalize() (chaînage par aéroport + heure + route + code-share), comme l'e-billet. Repli mono-tronçon.
    let segs = Array.isArray(p.segments) ? p.segments.filter((x) => x && (x.vol || x.depart || x.arrivee)) : [];
    if (!segs.length && (p.vol || p.depart || p.arrivee)) segs = [{ vol: p.vol, depart: p.depart, arrivee: p.arrivee, date: p.date, heure: p.heure, operateur: p.operateur }];
    if (!segs.length) return null;
    const norm = normalizeEticket({ compagnie: p.compagnie || '', pnr: p.pnr || '', segments: segs });
    if (!norm || !norm.vol) return null;
    if (!norm.compagnie) norm.compagnie = deduceAirline(norm.vol) || '';
    norm.passengers = (nom && nom.length >= 3) ? [{ name: nom }] : [];
    return norm;
  } catch (_) { return null; }
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
      const mh = mediaFetchHeaders(u, cfg);
      if (!mh) continue; // SSRF : hôte interne/illégal ignoré
      const r = await fetch(u, { headers: mh.headers, signal: AbortSignal.timeout(20000) });
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
  if (e.operePar && !s.operePar) s.operePar = e.operePar; // transporteur effectif lu sur le billet (code-share)
  if (e.date && !s.date) s.date = e.date;
  if (e.pnr && !s.pnr) s.pnr = e.pnr;
  if (e.route && !s.route) s.route = humanizeRoute(e.route);
  if (e.escale || (e.segments && e.segments.length > 1)) s.type_vol = 'escale'; // OCR fait foi : 2+ vols lus = correspondance → écrase un « vol sec » déclaré par erreur
  if (e.segments && e.segments.length > 1 && !(s.legs && s.legs.length)) s.legs = e.segments.map((x) => ({ vol: x.vol, dep: x.depart, arr: x.arrivee, date: x.date || '', operateur: x.operateur || '' }));
  if (e.passengers && e.passengers.length) {
    s.names = s.names || []; s.passengers = s.passengers || [];
    e.passengers.forEach((p, i) => {
      if (p.name && !s.names[i]) s.names[i] = p.name.toUpperCase();
      const cur = s.passengers[i] || {};
      if (!cur.name && p.name) cur.name = p.name;
      if (!cur.dob && p.dob) cur.dob = p.dob;
      if (p.bebe) cur.bebe = true; if (p.gratuit) cur.gratuit = true; // bébé / gratuité (art. 3§3)
      s.passengers[i] = cur;
    });
    if (!s.pax) s.pax = e.passengers.length;
  }
  deriveEuropeTouch(s,
    (e.segments && e.segments[0] && e.segments[0].depart) || e.depart || '',
    (e.segments && e.segments.length ? e.segments[e.segments.length - 1].arrivee : '') || e.arrivee || '');
  markOperateurEffectif(s, e); // code-share « opéré par » → transporteur effectif + drapeau hors-UE si vol entrant
}
// Étape SCAN : on relit TOUTES les pages à chaque nouvelle photo → la lecture est complète, on écrase
// les champs e-billet (les corrections manuelles viennent APRÈS, via le menu de correction).
function setEticketFields(s, e) {
  if (!e) return;
  if (e.vol) s.vol = e.vol;
  if (e.compagnie) s.compagnie = e.compagnie;
  if (e.operePar) s.operePar = e.operePar; // transporteur effectif lu sur le billet (code-share)
  if (e.date) s.date = e.date;
  if (e.pnr) s.pnr = e.pnr;
  if (e.billet) s.billet = e.billet; // n° billet electronique (13 chiffres, ex. 057-1234567890)
  if (e.route) s.route = humanizeRoute(e.route);
  if (e.escale || (e.segments && e.segments.length > 1)) s.type_vol = 'escale'; // OCR fait foi : 2+ vols lus = correspondance → écrase un « vol sec » déclaré par erreur (l'aller-retour est recadré ensuite par applyTrajet)
  if (e.segments && e.segments.length > 1) s.legs = e.segments.map((x) => ({ vol: x.vol, dep: x.depart, arr: x.arrivee, date: x.date || '', operateur: x.operateur || '' }));
  if (e.passengers && e.passengers.length) {
    s.names = s.names || []; s.passengers = s.passengers || [];
    e.passengers.forEach((p, i) => {
      s.names[i] = p.name.toUpperCase();
      const cur = s.passengers[i] || {}; cur.name = p.name; if (!cur.dob && p.dob) cur.dob = p.dob;
      // Mineur si le billet l'étiquette « Enfant/Bébé » (p.minor, sans DDN) OU si la DDN lue le confirme.
      if (p.minor || (cur.dob && isMinorAt(cur.dob, s.date))) cur.minor = true;
      if (p.bebe) cur.bebe = true; if (p.gratuit) cur.gratuit = true; // bébé / gratuité (art. 3§3)
      s.passengers[i] = cur;
    });
    // Billet de GROUPE : si le billet liste PLUS de passagers que déclaré, on remonte le compte (jamais en silence → sinon des passagers tombent du mandat).
    if (e.passengers.length > (s.pax || 0)) s.pax = e.passengers.length;
  }
  // Signal qualité pour la carte de confirmation : lecture douteuse ou incomplète → on prévient au lieu de claironner « réussi ».
  s._scanWarn = (e.lisible === false) || (typeof e.confidence === 'number' && e.confidence < 0.5) || !(e.vol && (e.route || e.depart) && (e.date || e.pnr));
  // Sens Europe dérivé de la route lue (aller-retour affiné ensuite par applyTrajet).
  deriveEuropeTouch(s,
    (e.segments && e.segments[0] && e.segments[0].depart) || e.depart || '',
    (e.segments && e.segments.length ? e.segments[e.segments.length - 1].arrivee : '') || e.arrivee || '');
  markOperateurEffectif(s, e); // code-share « opéré par » → transporteur effectif + drapeau hors-UE si vol entrant
}
// Dérive le SENS Europe (départ/arrivée) + route_type à partir des aéroports d'un trajet.
// Remplace l'ancienne question route_zone : le sens vient désormais de la VRAIE route lue
// (scan/e-billet), sur tous les chemins — pas seulement l'aller-retour (cf. applyTrajet).
function deriveEuropeTouch(s, dep, arr) {
  dep = String(dep || '').toUpperCase().trim(); arr = String(arr || '').toUpperCase().trim();
  if (!dep && !arr) return;
  if (isEUAirport(arr) && !isEUAirport(dep)) s.europeTouch = 'arrivee';
  else if (isEUAirport(dep) && !isEUAirport(arr)) s.europeTouch = 'depart';
  if (isEUAirport(dep) || isEUAirport(arr)) s.route_type = s.route_type || 'af_eu';
}
// Bascule l'état sur un trajet précis (aller OU retour) choisi par le client.
function applyTrajet(s, t) {
  if (!t) return;
  if (t.vol) s.vol = t.vol;
  if (t.date) s.date = t.date;
  if (t.route) s.route = humanizeRoute(t.route);
  s.type_vol = t.escale ? 'escale' : 'direct';
  if (t.segments && t.segments.length > 1) s.legs = t.segments.map((x) => ({ vol: x.vol, dep: x.depart, arr: x.arrivee, date: x.date || '', operateur: x.operateur || '' }));
  else delete s.legs;
  // Aller-retour : l'éligibilité dépend du SENS de la jambe choisie. On (re)dérive europeTouch de CETTE
  // jambe (l'aller part d'Europe → couvert ; le retour arrive en Europe → dépend du transporteur effectif),
  // on reprend SON « opéré par », puis on recalcule le drapeau hors-UE pour la bonne jambe.
  s.operePar = t.operePar || '';
  const dep = (t.segments && t.segments[0] && t.segments[0].depart) || '';
  const arr = (t.segments && t.segments.length ? t.segments[t.segments.length - 1].arrivee : '') || '';
  if (isEUAirport(arr) && !isEUAirport(dep)) s.europeTouch = 'arrivee';
  else if (isEUAirport(dep) && !isEUAirport(arr)) s.europeTouch = 'depart';
  markOperateurEffectif(s, { vol: s.vol, operePar: s.operePar, segments: t.segments });
}
// Carte de confirmation du scan (affiche le nb de pages lues + invite à en envoyer d'autres).
async function scanConfirmCard(phone, s, cfg) {
  await enrichOperatingFromAero(s); // vol entrant sans « opéré par » sur le billet → on interroge AeroDataBox (best-effort)
  const pages = (s.scan_pages || []).length;
  const noms = (s.names || []).filter(Boolean);
  const paxLine = !noms.length ? L(s, `\n_(your name will be read from your passport, later)_`, `\n_(votre identité sera lue sur le passeport, plus tard)_`)
    : noms.length < (s.pax || 1) ? L(s, `\n👤 ${noms.join(', ')} _(the other passengers' names will come from their passports)_`, `\n👤 ${noms.join(', ')} _(les identités des autres passagers viendront de leurs passeports)_`)
    : L(s, `\n👥 ${noms.length} passenger(s): ${noms.join(', ')}`, `\n👥 ${noms.length} passager(s) : ${noms.join(', ')}`);
  const pageLine = pages > 1 ? L(s, `\n📄 ${pages} pages read`, `\n📄 ${pages} pages lues`) : '';
  // Lecture douteuse/incomplète → on NE claironne PAS « réussi », on invite à vérifier (un caractère faux = rejet compagnie).
  const header = s._scanWarn
    ? L(s, `⚠️ I read your ticket, but the image was *hard to read*. Please double-check the *flight number* and *PNR* below 👇`, `⚠️ J'ai lu votre billet, mais l'image était *difficile à lire*. Vérifiez bien le *n° de vol* et le *PNR* ci-dessous 👇`)
    : LV(s, phone, 'SCAN_REUSSI', `✅ I've read your ticket 👇`);
  // Code-share détecté sur un vol ENTRANT en Europe opéré par une compagnie hors-UE : le CE261 ne s'applique
  // pas automatiquement → on prévient sans fermer le dossier (un expert vérifie un autre recours).
  const opName = (s.operateur_code && AIRLINES[s.operateur_code]) || s.compagnie || L(s, 'a non-EU airline', 'une compagnie hors-UE');
  const opNote = s.operateurNonUe
    ? L(s, `\n\nℹ️ Flight *operated by ${opName}* (non-EU airline) arriving in Europe: EU compensation does not apply *automatically*. An expert checks *free of charge* for another option — *we keep your case either way*. 🤝`, `\n\nℹ️ Vol *opéré par ${opName}* (compagnie hors-UE) à l'arrivée en Europe : l'indemnisation européenne ne s'applique pas *automatiquement*. Un expert vérifie *gratuitement* un autre recours — *on garde votre dossier dans tous les cas*. 🤝`)
    : s.operateurAVerifier
      ? L(s, `\n\nℹ️ This flight arriving in Europe is a *codeshare*. An expert checks *free of charge* which airline actually operates it, to confirm your rights — *we keep your case either way*. 🤝`, `\n\nℹ️ Ce vol à l'arrivée en Europe est un *vol en partage de code* (code-share). Un expert vérifie *gratuitement* quelle compagnie l'opère réellement, pour confirmer vos droits — *on garde votre dossier dans tous les cas*. 🤝`)
      : '';
  // Compagnie débitrice (= transporteur effectif) — affichée quand le dossier est couvert, utile surtout sur
  // une correspondance où ce n'est pas la compagnie du 1er vol. Tue en cas de doute (la note explique alors).
  const claimLine = (!s.operateurNonUe && !s.operateurAVerifier && s.compagnie_reclamation) ? L(s, `\n📮 Claim filed against: *${s.compagnie_reclamation}*`, `\n📮 Réclamation auprès de : *${s.compagnie_reclamation}*`) : '';
  const dateLine = s.date ? `${s.date}${isValidStoredDate(s.date) ? ` (${dateEnLettres(s.date)})` : ''}` : '—';
  return sendButtons(phone, { body: L(s,
    `${header}${pageLine}\n\n✈️ Flight: ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date: ${dateLine}\n🎫 PNR: ${s.pnr || '—'}\n🗺️ Route: ${s.route || '—'}${claimLine}${paxLine}${opNote}\n\n_E-ticket with several pages? Send them, I'll complete it._\nIs everything correct?`,
    `${header}${pageLine}\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${dateLine}\n🎫 PNR : ${s.pnr || '—'}\n🗺️ Trajet : ${s.route || '—'}${claimLine}${paxLine}${opNote}\n\n_E-billet en plusieurs pages ? Envoyez-les, je complète._\nTout est correct ?`), buttons: [{ id: 'scan_ok', text: L(s, '✅ Yes', '✅ Oui') }, { id: 'scan_fix', text: L(s, '✏️ Fix', '✏️ Corriger') }] }, cfg);
}
// Aller-retour détecté → on demande quel vol a été perturbé (l'e-billet ne dit pas ce qui a foiré).
async function askSens(phone, s, cfg) {
  s.step = 'scan_sens'; await setState(phone, s);
  const t = s.trajets || []; const a = t[0] || {}, r = t[1] || {};
  return sendButtons(phone, { body: L(s, `📑 Your ticket has an *outbound* and a *return*.\nWhich flight had the problem (delay / cancellation)?\n\n🛫 *Outbound* — ${humanizeRoute(a.route) || '—'}${a.date ? ` · ${a.date}` : ''}\n🛬 *Return* — ${humanizeRoute(r.route) || '—'}${r.date ? ` · ${r.date}` : ''}`, `📑 Votre billet contient un *aller* et un *retour*.\nQuel vol a connu le problème (retard / annulation) ?\n\n🛫 *Aller* — ${humanizeRoute(a.route) || '—'}${a.date ? ` · ${a.date}` : ''}\n🛬 *Retour* — ${humanizeRoute(r.route) || '—'}${r.date ? ` · ${r.date}` : ''}`), buttons: [{ id: 'sens_aller', text: L(s, '🛫 Outbound', '🛫 L\'aller') }, { id: 'sens_retour', text: L(s, '🛬 Return', '🛬 Le retour') }] }, cfg);
}
// OCR passeport / CNI : lit nom + prénom + date de naissance (la magie aussi sur le passeport).
// Prompt commun aux 2 moteurs (Claude + GPT-4o) : pièce d'identité (passeport/CNI/titre de séjour).
const _OCR_PASSPORT_PROMPT = `Tu lis une pièce d'identité (PASSEPORT, carte nationale d'identité, titre de séjour, carte de résident…) — utilise aussi la zone MRZ en bas si présente. Réponds UNIQUEMENT en JSON :
{"nom":"","prenom":"","date_naissance":"","lieu_naissance":"","date_expiration":"","adresse":"","sexe":"","type_piece":"","face":""}
Règles :
- nom : nom de famille en MAJUSCULES.
- prenom : prénom(s).
- date_naissance : format JJ/MM/AAAA. Convertis depuis la MRZ (AAMMJJ) si besoin, en déduisant le siècle logiquement (une naissance est dans le passé).
- lieu_naissance : UNIQUEMENT le champ explicitement étiqueté "Lieu de naissance" / "Place of birth" / "Né(e) à" (ville, et pays si indiqué). Recopie tel quel. Si aucun champ n'est étiqueté ainsi, mets "" — ne prends JAMAIS une ville de l'adresse ou du domicile.
- date_expiration : date de fin de validité, format JJ/MM/AAAA (depuis la MRZ ou le champ imprimé). Si absente, "".
- adresse : UNIQUEMENT le champ explicitement étiqueté "Adresse", "Domicile" ou "Address" (hors MRZ). Recopie tel quel sur une seule ligne. Si absent, "".
- ATTENTION : lieu_naissance et adresse sont deux champs DIFFÉRENTS — ne mets jamais la même ville dans les deux sauf si les deux champs étiquetés l'indiquent vraiment. Une ville sans étiquette claire = "".
- sexe : "M" ou "F" (champ "Sexe"/"Sex", ou la lettre de la MRZ : M, F ou X). Si X ou inconnu, "".
- type_piece : "passeport", "cni" (carte nationale d'identité), "titre_sejour" ou "" si incertain.
- face : pour une CNI, "recto" (face avec la photo du titulaire), "verso" (face arrière : adresse et/ou MRZ), ou "deux" si les deux faces sont visibles sur l'image. Pour un passeport : "recto".
- Champ inconnu = "". Ne JAMAIS inventer.`;

function _normalizePassportOcr(p) {
  if (!p) return null;
  const name = [p.prenom, p.nom].filter(Boolean).join(' ').toUpperCase().trim();
  const dob = (p.date_naissance || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ? p.date_naissance : '';
  const expiry = (p.date_expiration || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ? p.date_expiration : '';
  const adresse = (p.adresse || '').trim();
  const sx = (p.sexe || '').trim().toUpperCase().charAt(0);
  const sexe = (sx === 'M' || sx === 'F') ? sx : '';
  let lieuNaissance = (p.lieu_naissance || '').trim();
  // Garde-fou anti-confusion : lieu identique à l'adresse complète = très probablement l'adresse recopiée → on vide.
  if (lieuNaissance && adresse && lieuNaissance.toLowerCase() === adresse.toLowerCase()) lieuNaissance = '';
  const docType = ['passeport', 'cni', 'titre_sejour'].includes((p.type_piece || '').trim().toLowerCase()) ? (p.type_piece || '').trim().toLowerCase() : '';
  const face = ['recto', 'verso', 'deux'].includes((p.face || '').trim().toLowerCase()) ? (p.face || '').trim().toLowerCase() : '';
  return { name, dob, expiry, adresse, sexe, lieuNaissance, docType, face };
}

async function _ocrPassportClaude(media) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
  try {
    const model = process.env.PASSPORT_CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: 400, temperature: 0,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: media.mime || 'image/jpeg', data: media.b64 } },
          { type: 'text', text: _OCR_PASSPORT_PROMPT },
        ] }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return _normalizePassportOcr(JSON.parse(m[0]));
  } catch (_) { return null; }
}

async function _ocrPassportGpt(media) {
  const key = process.env.OPENAI_API_KEY; if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 200, temperature: 0, response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: [
          { type: 'text', text: _OCR_PASSPORT_PROMPT },
          { type: 'image_url', image_url: { url: `data:${media.mime};base64,${media.b64}` } },
        ] }],
      }),
    });
    const data = await res.json(); if (!data.choices) return null;
    return _normalizePassportOcr(JSON.parse(data.choices[0].message.content));
  } catch (_) { return null; }
}

// OCR pièce d'identité : Claude Sonnet en primary (meilleur sur MRZ et passeports non-EU),
// GPT-4o en fallback si Claude echoue OU renvoie vide (nom+dob absents).
async function ocrPassport(mediaUrl, cfg) {
  if (!mediaUrl) return null;
  const media = await fetchAsImageB64(mediaUrl, cfg);
  if (!media) return null;
  const claude = await _ocrPassportClaude(media);
  if (claude && (claude.name || claude.dob)) return claude;
  const gpt = await _ocrPassportGpt(media);
  if (gpt && (gpt.name || gpt.dob)) return gpt;
  return claude || gpt || null; // dernier recours : renvoie ce qu'on a (peut-etre partiel)
}

// ─── Classifieur : une photo envoyée = pièce d'identité, preuve de voyage, ou autre ──
let _warnedNoOpenAI = false;
function warnOpenAIClassifyOff() {
  if (_warnedNoOpenAI) return;
  _warnedNoOpenAI = true;
  console.error('🔴 OPENAI_API_KEY absente → lecture/classification automatique des documents DÉSACTIVÉE (pièces acceptées mais non lues).');
  try { if (typeof notifyOwnerWhatsApp === 'function') notifyOwnerWhatsApp('', '🔴 Bot: OPENAI_API_KEY absente → lecture auto des pièces (passeport / e-billet / carte / reçus) DÉSACTIVÉE. Les documents sont reçus mais NON classés/lus. Configure la clé sur Railway.').catch(() => {}); } catch (_) {}
}
const _CLASSIFY_PROMPT = `Tu classes une photo/capture envoyée par un passager, et tu juges sa QUALITÉ (une pièce illisible peut être refusée par la compagnie). Réponds UNIQUEMENT en JSON :
{"kind":"identite|voyage|frais|autre","nom":"","voyageType":"ebooking|carte|","lisible":true,"probleme":"","montant":null,"devise":"","categorie":""}
- "identite" : passeport, carte nationale d'identité (CNI), titre de séjour. Mets dans "nom" le PRÉNOM puis le NOM de famille, dans cet ordre (ex : "AMINATA DIALLO"), en MAJUSCULES.
- "voyage" : preuve de voyage. voyageType="ebooking" si CONFIRMATION DE RÉSERVATION / e-billet / itinéraire (liste souvent PLUSIEURS passagers et/ou PLUSIEURS vols). voyageType="carte" si CARTE D'EMBARQUEMENT (un seul passager / un seul vol).
- "frais" : reçu, facture ou ticket d'une DÉPENSE liée à la perturbation du vol (hôtel, taxi/VTC, repas/restaurant, transport, parking). PAS un billet d'avion ni une réservation de vol. Pour un "frais", lis le MONTANT TOTAL payé → "montant" (nombre seul, ex 84.50 ; sinon null), la DEVISE → "devise" (EUR, XOF/FCFA, MAD, GMD, USD, GBP… si visible, sinon "") et la CATÉGORIE → "categorie" : "hotel" | "repas" | "taxi" | "transport" | "parking" | "autre".
- "autre" : tout le reste.
- "lisible" : false si la photo est FLOUE, SOMBRE, COUPÉE, avec REFLET, ou si les informations clés (nom, n° de pièce) ne sont pas lisibles avec certitude. Sinon true.
- "probleme" : si lisible=false, un mot : "flou" | "sombre" | "coupé" | "reflet" | "illisible".
Champ inconnu = "". Ne JAMAIS inventer un nom si la photo est illisible.`;

async function _classifyDocClaude(media) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
  try {
    const model = process.env.CLASSIFY_CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 300, temperature: 0,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: media.mime || 'image/jpeg', data: media.b64 } },
          { type: 'text', text: _CLASSIFY_PROMPT },
        ] }] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const m = txt.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch (_) { return null; }
}

async function _classifyDocGpt(media) {
  const key = process.env.OPENAI_API_KEY; if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 140, temperature: 0, response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: [
          { type: 'text', text: _CLASSIFY_PROMPT },
          { type: 'image_url', image_url: { url: `data:${media.mime};base64,${media.b64}` } },
        ] }] }),
    });
    const data = await res.json(); if (!data.choices) return null;
    return JSON.parse(data.choices[0].message.content);
  } catch (_) { return null; }
}

// Classifieur type de document (identite / voyage / frais / autre) : Claude primary + GPT-4o fallback.
async function classifyDoc(mediaUrl, cfg) {
  const FALLBACK = { kind: 'autre', nom: '', voyageType: '', lisible: true, probleme: '' };
  if (!mediaUrl) return FALLBACK;
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) return { ...FALLBACK, _unavailable: true, _reason: 'no_key' };
  const media = await fetchAsImageB64(mediaUrl, cfg);
  if (!media) return FALLBACK;
  const hash = media.hash;
  let p = await _classifyDocClaude(media);
  if (!p || !p.kind) p = await _classifyDocGpt(media);
  if (!p) return { ...FALLBACK, _unavailable: true, _reason: 'api_error' };
  const montant = typeof p.montant === 'number' ? p.montant : (parseFloat(String(p.montant == null ? '' : p.montant).replace(',', '.').replace(/[^\d.]/g, '')) || null);
  const devise = String(p.devise || '').toUpperCase().replace(/FCFA|CFA/g, 'XOF').replace(/€|EURO/g, 'EUR').replace(/[^A-Z]/g, '').slice(0, 6);
  const categorie = String(p.categorie || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 12);
  return { kind: ['identite', 'voyage', 'frais', 'autre'].includes(p.kind) ? p.kind : 'autre', nom: (p.nom || '').toUpperCase().trim(), voyageType: p.voyageType || '', lisible: p.lisible !== false, probleme: p.probleme || '', montant, devise, categorie, hash };
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
// Écart RÉEL de nom (billet vs passeport) : ignore accents, casse, ordre des prénoms et 2e prénom en plus.
function _nameToks(x) { return nmStrip(x).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).sort(); }
function nameDiffers(a, b) {
  const ta = _nameToks(a), tb = _nameToks(b);
  if (!ta.length || !tb.length) return false;                 // un des deux manque → pas de comparaison
  if (ta.join(' ') === tb.join(' ')) return false;            // identique (ordre/accents ignorés)
  const sa = new Set(ta), sb = new Set(tb);
  if (ta.every((t) => sb.has(t)) || tb.every((t) => sa.has(t))) return false; // l'un inclus dans l'autre (2e prénom en plus)
  return true;                                                // écart réel → à vérifier
}
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
  const en = !!(s && s.langue_code === 'en');
  const st = docsStatus(s); const miss = [];
  if (st.missingId.length) miss.push(en ? `the *ID* of *${st.missingId.join('*, *')}*` : `la *pièce d'identité* de *${st.missingId.join('*, *')}*`);
  if (!st.travelProofOk) {
    if ((s.pax || 1) <= 1) miss.push(en ? `your *boarding pass* or *e-ticket*` : `votre *carte d'embarquement* ou *e-billet*`);
    else if (st.missingTravel.length && st.missingTravel.length < s.pax) miss.push(en ? `the *proof of travel* of *${st.missingTravel.join('*, *')}* — their *boarding pass*, or an *e-ticket* listing everyone` : `la *preuve de voyage* de *${st.missingTravel.join('*, *')}* — sa *carte d'embarquement*, ou un *e-billet* qui liste tout le monde`);
    else miss.push(en ? `a *proof of travel per passenger*: a *boarding pass* for each, or a single *e-ticket* listing them all` : `une *preuve de voyage par passager* : une *carte d'embarquement* pour chacun, ou un seul *e-billet* qui les liste tous`);
  }
  if (miss.length) return en ? `📎 Still missing: ${miss.join(' and ')}.` : `📎 Il manque encore : ${miss.join(' et ')}.`;
  const v = s.flightVerdict;
  if (v === 'hors_champ' || v === 'sous_seuil') return en ? `✅ All your documents are in, thanks ${firstNameOf(s)}! File ${s.ref || ''} is complete. An expert confirms the *exact amount* (free check) and we file the claim — €0 if we recover nothing.` : `✅ Toutes vos pièces sont là, merci ${firstNameOf(s)} ! Le dossier ${s.ref || ''} est complet. Un expert confirme le *montant exact* (vérification gratuite) et on lance la réclamation — 0 € si vous ne touchez rien.`;
  return en ? `✅ All your documents are in, thanks ${firstNameOf(s)}! Your file *${s.ref || ''}* is complete. 🙏` : `✅ Toutes vos pièces sont là, merci ${firstNameOf(s)} ! Votre dossier *${s.ref || ''}* est au complet. 🙏`;
}

// Pièce expirée (date d'expiration passée) ?
function isExpired(dateStr) { const m = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return false; return new Date(+m[3], +m[2] - 1, +m[1]).getTime() < Date.now(); }

// ─── OCR confirm helper ─────────────────────────────────────────────────────────
// Lit la pièce, affiche le résumé et demande confirmation avant de stocker.
async function askOcrConfirm(phone, s, cfg, mediaUrl) {
  const i = s.doc_idx + 1;
  const pp = await ocrPassport(mediaUrl, cfg);
  // ── Verso de CNI attendu ? On rattache cette photo au passager en attente (le verso d'une
  // vieille CNI n'a souvent ni nom ni photo → l'OCR classique échouerait). MRZ du verso lisible
  // → on complète lieu/adresse au passage.
  if (s.cni_verso_for != null && (!pp || !pp.name || pp.docType === 'cni')) {
    const vi = s.cni_verso_for;
    const vp = (s.passengers || [])[vi];
    if (vp) {
      s.passengers[vi] = { ...vp, cniVerso: true, adresse: (pp && pp.adresse) || vp.adresse || '', lieuNaissance: (pp && pp.lieuNaissance) || vp.lieuNaissance || '' };
      s.cni_verso_for = null;
      await setState(phone, s);
      await send(phone, L(s, `✅ Back of *${vp.name || 'the'}* ID card received — the card is complete. 🙏`, `✅ Verso de la carte de *${vp.name || ''}* reçu — la pièce est complète. 🙏`), cfg);
      return nextPassport(phone, s, cfg);
    }
    s.cni_verso_for = null; await setState(phone, s);
  }
  if (pp && (pp.name || pp.dob)) {
    const minor = pp.dob ? isMinorAt(pp.dob, s.date) : false;
    const expired = pp.expiry ? isExpired(pp.expiry) : false;
    // Rafale multi-passagers (e-billet : noms déjà connus) → on rattache la pièce PAR NOM et on
    // l'enregistre SANS écran de confirmation. Sinon, 4 photos envoyées d'un coup relancent la
    // confirmation du passager 1 à chaque fois (le doc_idx n'avance qu'après un « C'est correct »).
    const _att = pp.name ? attributeId(s, pp.name) : { confident: false, idx: -1 };
    if (s.pax > 1 && _att.confident && _att.idx >= 0) {
      const cur = s.passengers[_att.idx] || {};
      const _billet = cur.name || '';
      const _mismatch = !!(_billet && pp.name && nameDiffers(_billet, pp.name));
      s.passengers[_att.idx] = { ...cur, name: cur.name || pp.name, nameId: pp.name || cur.nameId || '', nameMismatch: _mismatch, dob: pp.dob || cur.dob || '', expiry: pp.expiry || '', expired, minor, adresse: pp.adresse || cur.adresse || '', sexe: pp.sexe || cur.sexe || '', lieuNaissance: pp.lieuNaissance || cur.lieuNaissance || '', docType: pp.docType || cur.docType || '', cniVerso: (pp.docType === 'cni' && (pp.face === 'verso' || pp.face === 'deux')) || cur.cniVerso || false, viaPhoto: true, idReceived: true };
      await setState(phone, s);
      if (_mismatch) { try { notifyOwnerWhatsApp('', `⚠️ Écart de nom${s.ref ? ' [' + s.ref + ']' : ''} : billet « ${_billet} » / passeport « ${pp.name} » — à vérifier (poste pièces).`).catch(() => {}); } catch (_) {} }
      const got = (s.passengers || []).filter((p) => p && p.idReceived).length;
      await send(phone, L(s, `✅ ID of *${cur.name || pp.name}* received (${got}/${s.pax})${minor ? ' · 👶 minor, parental signature' : ''}${expired ? ' · ⚠️ expired, an advisor checks' : ''}.`, `✅ Pièce de *${cur.name || pp.name}* reçue (${got}/${s.pax})${minor ? ' · 👶 mineur·e, signature parentale' : ''}${expired ? ' · ⚠️ expirée, un conseiller vérifie' : ''}.`), cfg);
      if (pp.docType === 'cni' && pp.face === 'recto' && !s.passengers[_att.idx].cniVerso) {
        s.cni_verso_for = _att.idx; await setState(phone, s);
        return send(phone, L(s, `📸 One more thing: it's a *national ID card* — please also send a photo of the *back* (the other side).`, `📸 Petit détail : c'est une *carte d'identité* — envoyez aussi une photo du *verso* (l'autre face), s'il vous plaît.`), cfg);
      }
      return nextPassport(phone, s, cfg);
    }
    // Solo : le nom lu correspond au billet (ou pas de nom au billet) → on enregistre SANS écran de confirmation
    // (le multi-pax confiant le fait déjà — on harmonise pour retirer un tap de friction inutile). Un écart de nom garde la confirmation.
    const _soloBillet = (s.passengers && s.passengers[0] && s.passengers[0].name) || (s.names && s.names[0]) || '';
    if ((s.pax || 1) <= 1 && pp.name && (!_soloBillet || !nameDiffers(_soloBillet, pp.name))) {
      s.passengers = s.passengers || [];
      const cur0 = s.passengers[0] || {};
      s.passengers[0] = { ...cur0, name: cur0.name || pp.name, nameId: pp.name, dob: pp.dob || cur0.dob || '', expiry: pp.expiry || '', expired, minor, adresse: pp.adresse || cur0.adresse || '', sexe: pp.sexe || cur0.sexe || '', lieuNaissance: pp.lieuNaissance || cur0.lieuNaissance || '', docType: pp.docType || cur0.docType || '', cniVerso: (pp.docType === 'cni' && (pp.face === 'verso' || pp.face === 'deux')) || cur0.cniVerso || false, viaPhoto: true, idReceived: true };
      await setState(phone, s);
      await send(phone, L(s, `✅ ID of *${pp.name}* received${minor ? ' · 👶 minor, parental signature' : ''}${expired ? ' · ⚠️ expired, an advisor checks' : ''}.`, `✅ Pièce de *${pp.name}* reçue${minor ? ' · 👶 mineur·e, signature parentale' : ''}${expired ? ' · ⚠️ expirée, un conseiller vérifie' : ''}.`), cfg);
      if (pp.docType === 'cni' && pp.face === 'recto' && !s.passengers[0].cniVerso) {
        s.cni_verso_for = 0; await setState(phone, s);
        return send(phone, L(s, `📸 One more thing: it's a *national ID card* — please also send a photo of the *back* (the other side).`, `📸 Petit détail : c'est une *carte d'identité* — envoyez aussi une photo du *verso* (l'autre face), s'il vous plaît.`), cfg);
      }
      return nextPassport(phone, s, cfg);
    }
    s.doc_pending = { name: pp.name || '', dob: pp.dob || '', expiry: pp.expiry || '', expired, minor, adresse: pp.adresse || '', sexe: pp.sexe || '', lieuNaissance: pp.lieuNaissance || '', docType: pp.docType || '', cniVerso: (pp.docType === 'cni' && (pp.face === 'verso' || pp.face === 'deux')) || false, viaPhoto: true };
    s.step = 'doc_pass_confirm';
    await setState(phone, s);
    const lines = [
      `📋 *Passager ${i}/${s.pax} — j'ai lu :*`,
      `👤 ${pp.name || '—'}`,
      pp.dob ? `🎂 Né(e) le ${pp.dob}${pp.lieuNaissance ? ` à ${pp.lieuNaissance}` : ''}` : (pp.lieuNaissance ? `📍 Né(e) à ${pp.lieuNaissance}` : ''),
      minor ? `👶 *Mineur·e* — signature parentale requise` : '',
      expired ? `⚠️ Pièce *expirée* (${pp.expiry}). On continue, un conseiller vérifiera.` : '',
      `\nC'est bien cette personne ?`,
    ].filter(Boolean).join('\n');
    await send(phone, lines, cfg);
    return sendButtons(phone, [{ id: 'pass_ok', text: L(s, '✅ Correct', '✅ C\'est correct') }, { id: 'pass_fix', text: L(s, '✏️ Edit', '✏️ Corriger') }], cfg);
  } else {
    // OCR échoué → pièce illisible
    s.step = 'doc_pass';
    await setState(phone, s);
    return send(phone, L(s, `😕 I can't read this document (photo a bit dark or blurry?). No worries, it happens 🙏 Try again with a clearer photo, or type *type* to enter the name and date of birth.`, `😕 Je n'arrive pas à lire cette pièce (photo un peu sombre ou floue ?). Pas de souci, ça arrive 🙏 Réessayez avec une meilleure photo, ou tapez *saisir* pour entrer le nom et la date de naissance.`), cfg);
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
  const raw = String(input || '');
  let m = raw.match(/(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})/);
  if (!m) {
    // Sans séparateur : JJMMAAAA (8 chiffres collés) ou JJMMAA (6). Bornes pour ne pas découper un
    // autre nombre (n° de vol, PNR…). On accepte donc « 15032026 » comme « 15/03/2026 ».
    const tok = raw.match(/(?<!\d)(\d{8}|\d{6})(?!\d)/);
    if (tok) { const d = tok[1]; m = [tok[0], d.slice(0, 2), d.slice(2, 4), d.slice(4)]; }
  }
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
const DATE_INVALIDE = (txt, en) => en
  ? `🤔 *${txt}* doesn't exist on the calendar (check the day and month).\nSend the date again as *DD/MM/YYYY* _(e.g. 15/03/2026 for 15 March 2026)_:`
  : `🤔 *${txt}* n'existe pas dans le calendrier (vérifiez le jour et le mois).\nRenvoyez la date au format *JJ/MM/AAAA* _(ex. 15/03/2026 pour le 15 mars 2026)_ :`;
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
const FUTURE_JOKE = (en) => en
  ? `😄 You're traveling in the future! This flight hasn't happened yet — we can only claim for a flight *already in the past*. 🪄\n\nGive me the *real* flight date (DD/MM/YYYY):`
  : `😄 Là vous voyagez dans le futur ! Ce vol n'a pas encore eu lieu — on ne peut réclamer que pour un vol *déjà passé*. 🪄\n\nDonnez-moi la *vraie* date du vol (JJ/MM/AAAA) :`;
function recentYears() { const base = new Date().getFullYear(); return [base, base - 1, base - 2, base - 3, base - 4]; }

const STOP_FOOTER = '_L\'équipe Robin des Airs 🏹_';
// Messages « non éligible » EN DUR (zéro dépendance GPT) — pendants anglais des variantes FR.
const STOP_MOINS_3H_EN = `Three hours — that's the threshold European law set, not us.\n\nYour delay was real and we don't make light of it. But as long as arrival stays under 3 hours, EC 261/2004 provides no compensation. We can't build a case against a rule the law itself doesn't cross.\n\n💡 Not sure of the exact delay on arrival? Tap menu → "Not sure".`;
const STOP_ANNUL_14J_EN = `Thanks for that detail — it's *the key point* for a cancellation. 🙏\n\nEU law (EC 261/2004) only provides compensation *if* the airline told you *less than 14 days* before departure. Beyond that, no fixed compensation is due — that's the rule, not us.\n\n💡 You still keep your right to a ticket *refund* or *re-routing*. And if you were in fact told *less than 14 days* before, type *go* — we'll pick it right back up.`;
const PRESCRIPTION_5ANS_EN = `Five years — that's the time limit the law gives to claim, and this flight is past it. I understand what that means; you may have had good reasons to wait. But beyond that limit our hands are tied. If the date on file is wrong, tap menu — it's worth checking. 🔄`;

// Sortie « propre » quand le vol n'est PAS éligible : on explique le refus (reasonText),
// puis on REBONDIT (réclamation rétroactive 5 ans → « pensez à un autre vol »).
// L'appelant a déjà fait clearState() : pas d'état en cours, les boutons relancent à neuf.
async function finNonEligible(phone, reasonText, cfg) {
  // Session « terminale » au lieu de l'effacer : le bouton « Être rappelé » garde le contexte du
  // dossier (route/réf → liste « À rappeler » du Bureau) ET reste cliquable. 'go' et « Vérifier un
  // autre vol » repartent à neuf (gérés en amont, qui traitent 'non_eligible' comme un redémarrage).
  let _st = {};
  try { _st = (await getState(phone)) || {}; _st.step = 'non_eligible'; _st.nonEligibleAt = Date.now(); await setState(phone, _st); } catch (_) {}
  const footer = L(_st, `_The Robin des Airs team 🏹_`, STOP_FOOTER);
  await send(phone, `${reasonText}\n\n${footer}`, cfg);
  return sendButtons(phone, {
    body: L(_st, `💡 This flight isn't eligible — but it's rarely a family's only trip.\n\nOne flight in ten is delayed or cancelled, and you can claim *up to 5 years back*. Think of your recent trips: a *3h+* delay on arrival, a cancellation, denied boarding = *up to €600 per passenger*. €0 if we recover nothing.\n\n✈️ Shall we check another flight?`, pickVariant(phone, 'RELANCE_AUTRE_VOL')),
    buttons: [{ id: 'autre_vol', text: L(_st, '✈️ Check another flight', '✈️ Vérifier un autre vol') }, { id: 'appel', text: L(_st, '📞 Get a callback', '📞 Être rappelé') }],
  }, cfg);
}

// ─── Responder IA hors-tunnel (inline) ─────────────────────────────────────────
const AI = (() => {
  const SENSITIVE = /(avocat|tribunal|proc[e\u00e8]s|plainte|litige|rembours|parler\s+[\u00e0a]\s+(quelqu|un humain|une personne|un conseiller|un agent)|un (vrai )?humain|[\u00eae]tre rappel|rappelez|rappel|contact|joindre|rejoindre|injoignable)/i;
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
async function archivePiece(phone, kind, mediaUrl, cfg, passenger) {
  try {
    if (!phone || !mediaUrl) return;
    const mh = mediaFetchHeaders(mediaUrl, cfg);
    if (!mh) return; // SSRF : hôte interne/illégal refusé
    const r = await fetch(mediaUrl, { headers: mh.headers, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return;
    const mime = (r.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > 8000000) return;
    await fetch('https://robindesairs.eu/api/piece-store', {
      method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, kind: kind || 'piece', passenger: passenger || '', mime, dataBase64: buf.toString('base64'), secret: (process.env.WATI_WEBHOOK_SECRET || '').trim() }),
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

  // T1 — menu / reset — tolérant aux fautes : accents ignorés, ponctuation retirée,
  // « recommencer » même mal tapé (recommencé / recomence / recommenc…), + mots courts.
  const resetNorm = lower.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s]/g, '').trim();
  // Langue de l'accueil/reset : détectée sur le message, sinon on GARDE la langue courante du client
  // (un « recommencer » ne doit pas refaire retomber un anglophone en français).
  const _curLang = ((STATE.get(phone.replace(/\D/g, '')) || {}).langue_code) || '';
  const _accLang = (lower === 'hello' || lower === 'hi') ? 'en' : (detectLang(input) || _curLang);
  // 'annuler' retiré du reset destructif : collision avec un vol *annulé* (le client parle de son vol, pas d'un reset).
  if (id === 'recommencer' || ['nouveau', 'new', 'reset', 'recommencer', 'stop'].includes(resetNorm) || resetNorm.startsWith('recommenc') || resetNorm.startsWith('start over')) { await clearState(phone); return sendAccueil(phone, cfg, _accLang); }
  // « ✈️ Vérifier un autre vol » (relance après vol non éligible) → on repart à neuf sur le tunnel.
  if (id === 'autre_vol' || lower === 'autre vol' || lower === 'un autre vol' || lower === 'vérifier un autre vol') { await clearState(phone); return sendAccueil(phone, cfg, _accLang); }
  if (['go', 'menu', 'start', 'reprendre', 'continuer', 'suite', 'bonjour', 'hello', 'hi', 'salut'].includes(lower) || id === 'menu') {
    const cur = await getState(phone);
    if (cur && cur.step && cur.step !== 'accueil' && cur.step !== 'done' && cur.step !== 'non_eligible') { await send(phone, L(cur, `👋 Welcome back! Let's pick up your case right where you left off.`, `👋 Re-bonjour ! On reprend votre dossier là où vous vous étiez arrêté.`), cfg); return relancerEtape(phone, cur, cfg); }
    // Dossier FINALISÉ non signé (step 'done', mandat envoyé) → on RENVOIE le lien de signature au lieu de tout effacer.
    const _lDone = LEADS.get(leadKey(phone)) || {};
    if (cur && cur.step === 'done' && _lDone.completed && !_lDone.signed && (cur.mandat_url || _lDone.mandatUrl)) {
      const _u = cur.mandat_url || _lDone.mandatUrl;
      return send(phone, L(cur, `👉 *Sign here* (2 min):\n${_u}\n\nWithout your signature, we can't act on your behalf.`, `👉 *Signez ici* (2 min) :\n${_u}\n\nSans votre signature, on ne peut pas agir en votre nom.`), cfg);
    }
    await clearState(phone); return sendAccueil(phone, cfg, _accLang);
  }
  // Bascule de langue À LA VOLÉE (FR ⇄ EN) — le client tape « français » / « english » / « FR » / « EN »
  // ou une phrase « je veux parler en français » / « I want to speak French » etc.
  // À l'accueil/langue, c'est le menu 🌍 qui gère le choix → on n'intercepte pas.
  const _langSwitch = ['francais', 'french', 'fr'].includes(resetNorm) ? 'fr'
                    : ['anglais', 'english', 'en'].includes(resetNorm) ? 'en'
                    : /\b(parler|parlez|continuer?|repondre?|ecrire?|communiquer)\b.*(francais|français)\b/.test(resetNorm) ? 'fr'
                    : /\b(parler|parlez|continuer?|repondre?|ecrire?|communiquer)\b.*(anglais|english)\b/.test(resetNorm) ? 'en'
                    : /\b(speak|talk|switch|continue)\b.*(french|francais|français)\b/i.test(resetNorm) ? 'fr'
                    : /\b(speak|talk|switch|continue)\b.*(english)\b/i.test(resetNorm) ? 'en'
                    : /\b(en francais|en français)\b/.test(resetNorm) ? 'fr'
                    : /\b(in english)\b/.test(resetNorm) ? 'en'
                    : '';
  if (_langSwitch) {
    const cur = await getState(phone);
    if (cur && cur.step && !['accueil', 'langue', 'go_langue'].includes(cur.step)) {
      if (cur.langue_code !== _langSwitch) {
        cur.langue_code = _langSwitch;
        cur.langue = _langSwitch === 'en' ? '🇬🇧 English' : '🇫🇷 Français';
        await setState(phone, cur);
        await send(phone, _langSwitch === 'en' ? `✅ Done — I'll continue in English. 🇬🇧` : `✅ C'est noté — je continue en français. 🇫🇷`, cfg);
      }
      return relancerEtape(phone, cur, cfg);
    }
  }

  let s = await getState(phone);
  // Anglais COLLANT : tout message clairement anglais bascule (et garde) le client en EN → la couche de
  // traduction prend alors le relais sur tous les messages restés codés en français en dur.
  if (!isEN(s) && detectLang(input) === 'en') { s.langue_code = 'en'; s.langue = '🇬🇧 English'; await setState(phone, s); }

  // Archive durable de TOUTE pièce envoyée (image/PDF) → Blobs, best-effort, ne bloque pas le flux.
  // Clé par téléphone (la réf n'existe pas encore en collecte) ; la récupération résout réf→tel.
  if (mediaUrl) {
    const KIND = { doc_pass: 'identite', doc_pass_confirm: 'identite', doc_boarding: 'carte-embarquement', doc_eticket: 'ebillet', doc_cert: 'certificat', done: 'justificatif', frais: 'frais' };
    const _kind = KIND[s.step] || 'document';
    // Pièce d'identité : on étiquette avec le passager en cours de collecte (le 1ᵉʳ sans pièce)
    // → la pièce apparaît « 🪪 Pièce d'identité — NOM » dans le CRM. Best-effort, jamais bloquant.
    let _pax = '';
    if (_kind === 'identite') { try { const idx = missingIdIndices(s)[0]; _pax = paxName(s, idx == null ? 0 : idx); } catch (_) {} }
    archivePiece(phone, _kind, mediaUrl, cfg, _pax).catch(() => {});
    // La carte/billet DIT TOUJOURS VRAI : une photo envoyée à une étape qui n'attend PAS de document précis
    // (choix direct/escale, route, incident, récap, correction, non-éligible…) est TOUJOURS traitée comme un
    // document de vol → OCR. On exclut les étapes qui consomment déjà une photo : scan*, pièces doc_*,
    // correspondance guidée esc_/m_, reçus de frais, justificatif post-signature (done). s.pax requis = déjà dans le tunnel.
    const MEDIA_OWN_STEP = /^(scan|doc_|esc_|m_)/;
    if (s.pax && s.step && !MEDIA_OWN_STEP.test(s.step) && !['done', 'frais'].includes(s.step)) {
      s.step = 'scan'; await setState(phone, s); return handleMessage(phone, text, cfg, mediaUrl, replyId, true);
    }
    // Photo envoyée AVANT le tunnel (client qui tend son billet dès le début) : on ne l'ignore pas.
    // On la mémorise (état persisté, non réinitialisé sur ces steps) pour la lire dès qu'on atteint le scan, et on accuse réception.
    else if (!s.pax && !s._earlyMedia && s.step && ['langue', 'consent_cgu', 'consent_rgpd', 'route', 'route_zone', 'incident', 'duree', 'annul_delai', 'q_corr'].includes(s.step)) {
      s._earlyMedia = mediaUrl; await setState(phone, s);
      await send(phone, L(s, `📸 Got your document — I'll read it automatically in a moment. First, a couple of quick questions 👇`, `📸 J'ai bien votre document — je le lis automatiquement dans un instant. D'abord, deux questions rapides 👇`), cfg);
      // on continue le flux normal (la photo est gardée pour le scan)
    }
  }

  // T1.2 — Demande de rappel humain : à tout moment (hors étapes documents qui ont leur propre "appel"),
  // "appel" flague le dossier pour la liste « À rappeler » du Bureau et rassure le client.
  // Intention de rappel EXPLICITE seulement (avant : « rappel »/« besoin d » attrapait « je me rappelle plus », « besoin de mon billet »…).
  const _cbIntent = lower === 'appel' || /(rappelez[- ]?moi|me rappeler|[eê]tre rappel[eé]|un rappel|besoin d['e ]?aide)/.test(lower);
  if (id === 'appel' || (_cbIntent
      && !(s && (s.step === 'doc_boarding' || s.step === 'doc_eticket')))) { // WATI renvoie souvent le LIBELLÉ du bouton (« Besoin d'aide » / « Être rappelé »), pas l'id → on matche aussi le texte
    upsertLead(phone, { wantsCall: true, wantsCallAt: Date.now(), lastClientAt: Date.now(), ...(s && s.langue_code ? { langue: s.langue_code } : {}) });
    notifyCallbackWanted(phone, s, 'a demandé à être rappelé');
    return send(phone, L(s, `📞 *Got it!* A real Robin des Airs advisor — a human, not a robot 🙂 — will call you back very soon.\n\n👉 We call from *+33 7 56 86 36 30*: save it now as "*Robin des Airs*" so you recognise the call and *pick up* (otherwise it shows as an unknown number).\n\n🔒 *€0 unless you get paid* — if we obtain your compensation we take a flat 25% fee, all-in (nothing else), the rest (75%) is yours.\n\nNot available? Reply here whenever you like, or type *go* to resume. 🙏`, `📞 *C'est noté !* Un vrai conseiller Robin des Airs — un humain, pas un robot 🙂 — vous rappelle très vite.\n\n👉 On vous appelle depuis le *+33 7 56 86 36 30* : enregistrez-le tout de suite sous « *Robin des Airs* » pour reconnaître l'appel et *décrocher* (sinon il s'affiche comme un numéro inconnu).\n\n🔒 *0 € tant que vous n'avez rien touché* — si on obtient votre indemnité, on prend 25 % fixe, tout compris (rien d'autre), le reste (75 %) est pour vous.\n\nPas dispo ? Répondez ici quand vous voulez, ou écrivez *go* pour reprendre. 🙏`), cfg);
  }

  // T1.1b — Phrases sociales pures (merci, super, 👍…) : accusé poli, jamais parsé comme donnée.
  // Sans ce garde, « merci » passait dans cityPick → cleanCity → accepté comme ville de départ.
  if (!id && !mediaUrl && /^(merci+|thank(s| you)?|super|parfait|cool+|d'?accord|ça marche|ca marche|ok merci|bien merci|bravo|voilà|voila|reçu|recu|compris|entendu|👍+|🙏+)(\s*[!.🙏👍])*$/i.test(lower)) {
    const hasFlow = s && s.step && !['accueil', 'done', 'non_eligible'].includes(s.step);
    return send(phone, L(s, `You're welcome 🙏${hasFlow ? '\n\nType *go* whenever you want to resume.' : ''}`, `De rien 🙏${hasFlow ? '\n\nTapez *go* quand vous voulez reprendre.' : ''}`), cfg);
  }

  // Vol jugé NON éligible (session terminale) : les boutons 'autre_vol' (1113), 'go' (1114) et 'appel'
  // (ci-dessus) sont déjà gérés. Tout AUTRE message → on re-propose proprement plutôt que de tomber
  // dans un fallback hasardeux (évite le « rien ne se passe »).
  if (s && s.step === 'non_eligible') {
    return sendButtons(phone, { body: L(s, `Would you like to *check another flight*? We can claim up to *5 years back*. ✈️`, `Souhaitez-vous *vérifier un autre vol* ? On peut réclamer jusqu'à *5 ans en arrière*. ✈️`), buttons: [{ id: 'autre_vol', text: L(s, '✈️ Check another flight', '✈️ Vérifier un autre vol') }, { id: 'appel', text: L(s, '📞 Get a callback', '📞 Être rappelé') }] }, cfg);
  }

  // T1.2b — « J'ai déjà signé » (bouton des relances signature) : FILET DE SÉCURITÉ si le webhook de
  // signature a échoué (le « signé » n'est pas remonté). 1 tap → on stoppe les relances tout de suite,
  // et on alerte l'équipe pour vérifier (au cas où ce ne serait pas réellement signé).
  if (id === 'deja_signe' || lower === 'déjà signé' || lower === 'deja signe' || lower === "j'ai déjà signé" || lower === "j'ai signé" || lower === 'jai signe') {
    const okMark = markLeadSigned(phone);
    const _l = LEADS.get(leadKey(phone)) || {};
    notifyOwnerWhatsApp(phone, `🖊️ « Déjà signé » déclaré par le client (${_l.ref || phone}) → relances STOPPÉES${okMark ? '' : ' (lead introuvable)'}. ⚠️ À VÉRIFIER : si le mandat n'est pas réellement signé (webhook manqué), relancer manuellement.`).catch(() => {});
    return send(phone, L(s, `Thank you! ✅ We'll stop the reminders. If your signature hadn't reached us yet, an advisor will let you know — otherwise your case moves forward. 🙏`, `Merci ! ✅ On arrête les rappels. Si jamais votre signature n'était pas encore arrivée chez nous, un conseiller vous le dira — sinon, votre dossier suit son cours. 🙏`), cfg);
  }

  // « J'ai déjà tout envoyé » (bouton du rappel pièces post-signature) : on stoppe le rappel, on rassure,
  // et on signale au bureau pour vérification humaine (les dépôts via le lien web ne remontent pas au bot).
  if (id === 'pieces_ok' || lower.includes('tout envoyé') || lower.includes('tout envoye')) {
    const _k = leadKey(phone); const _l = LEADS.get(_k); if (_l) { _l.piecesPending = false; _l.lastClientAt = Date.now(); LEADS.set(_k, _l); persistLeads(); }
    notifyOwnerWhatsApp(phone, `📎 « Déjà tout envoyé » déclaré (${(_l && _l.ref) || phone}) → rappel pièces STOPPÉ. ⚠️ À VÉRIFIER côté bureau : confirmer que CNI + preuve de voyage par passager sont bien là.`).catch(() => {});
    return send(phone, L(s, `Got it, thank you! 🙏 We'll check on our side that everything is complete. If anything is missing, an advisor will tell you — otherwise your case moves forward. ✅`, `C'est noté, merci ! 🙏 On vérifie de notre côté que tout est complet. S'il manquait quoi que ce soit, un conseiller vous le dira — sinon votre dossier suit son cours. ✅`), cfg);
  }

  // « Déposer mes pièces » (bouton du rappel pièces) : on renvoie le lien sécurisé.
  if (id === 'depot' || lower === 'déposer mes pièces' || lower === 'deposer mes pieces') {
    const _l = LEADS.get(leadKey(phone)) || {};
    const _ref = _l.ref || (s && s.ref) || '';
    const _url = 'https://robindesairs.eu/depot-en-ligne.html?r=' + encodeURIComponent(_ref);
    upsertLead(phone, { lastClientAt: Date.now() });
    return send(phone, L(s, `📎 Great. Upload your documents (*ID* + *boarding pass* or *e-ticket*) securely here 👇\n${_url}\n\nYou can also *send me the photos directly here*. 🙏\n\n🔒 Your ID is used *only* to claim your money and pay it to the right name. You can *hide the line of numbers at the bottom* — we only need your name + photo. Deleted 30 days after settlement. GDPR.`, `📎 Très bien. Déposez vos pièces (*pièce d'identité* + *carte d'embarquement* ou *e-billet*) en toute sécurité ici 👇\n${_url}\n\nVous pouvez aussi *m'envoyer les photos directement ici*. 🙏\n\n🔒 La pièce sert *uniquement* à réclamer votre argent et à vous le verser au bon nom. Vous pouvez *cacher la bande de chiffres en bas* — on n'a besoin que du nom + photo. Supprimée 30 j après règlement. RGPD.`), cfg);
  }

  // Préférence de versement (posée à la signature, juste avant les pièces) : 1 tap → on stocke la préférence.
  // Le détail (IBAN / numéro) se prend au versement (rib.html). FR + EN.
  if (id === 'pay_iban' || id === 'pay_waveom' || id === 'pay_mtn') {
    const pref = id === 'pay_iban' ? 'Virement bancaire' : id === 'pay_waveom' ? 'Wave / Orange Money' : 'MTN MoMo';
    if (s) { s.payout_pref = pref; await setState(phone, s); }
    upsertLead(phone, { payoutPref: pref, lastClientAt: Date.now() });
    notifyOwnerWhatsApp(phone, `💸 Préférence de versement : *${pref}* (${(s && s.ref) || phone}).`).catch(() => {});
    const _payDocs = s ? docsStatus(s) : { complete: false }; // ne PAS redemander la pièce si elle est déjà là (collectée avant le mandat)
    const next = _payDocs.complete
      ? L(s, `Your file is complete — we take it from here to recover your money. 🙏`, `Votre dossier est complet — on s'occupe de tout pour récupérer votre argent. 🙏`)
      : L(s, `Next step to start your file: a photo of your *ID* — it's what proves the money comes back to *you*.`, `Prochaine étape pour lancer votre dossier : une photo de votre *pièce d'identité* — c'est elle qui prouve que l'argent revient bien à *vous*.`);
    const ack = id === 'pay_iban'
      ? L(s, `🏦 Noted — *bank transfer*. We'll ask for your IBAN at payout time. 🙏\n${next}`, `🏦 Noté — *virement bancaire*. On vous demandera votre IBAN au moment du versement. 🙏\n${next}`)
      : L(s, `📱 Noted — *${pref}*. We'll ask for your number at payout time. 🙏\n${next}`, `📱 Noté — *${pref}*. On vous demandera votre numéro au moment du versement. 🙏\n${next}`);
    await send(phone, ack, cfg);
    // Préférence enregistrée → MAINTENANT on propose l'envoi des reçus de frais (plus de collision avec les boutons de versement).
    const _leadFrais = LEADS.get(leadKey(phone));
    if (_leadFrais) await triggerFraisCollection(_leadFrais).catch(() => {});
    return;
  }

  // T1.3 — « Plus tard » : le client veut reprendre plus tard. Son tap a déjà rouvert la fenêtre 24h (gratuit) ;
  // on garde le dossier ouvert SANS le harceler → on ne laisse qu'une relance, près du bord de la fenêtre (~22h).
  if (id === 'snooze' || lower === 'plus tard' || lower === 'demain' || lower === 'tard') {
    const nm = firstNameOf(s);
    const _l = LEADS.get(leadKey(phone)) || {};
    const _patch = { lastClientAt: Date.now() };
    if (!_l.completed) _patch.nudges = ['e3', 'e14']; // engagé : ne garde que la dernière relance « bord de fenêtre »
    else _patch.nudges = [2, 8]; // finalisé (mandat envoyé) : « plus tard » → on ne garde que la relance 22h (cohérent avec « sans insister »)
    upsertLead(phone, _patch);
    return send(phone, L(s, `👍 Got it${nm ? ' ' + nm : ''} — I'm keeping your case safe, we won't close it. Resume whenever you like by typing *go*. I'll just send a gentle reminder later, no pressure. 🙏`, `👍 C'est noté${nm ? ' ' + nm : ''} — je garde votre dossier au chaud, on ne le ferme pas. Reprenez quand vous voulez en écrivant *go*. Je vous ferai juste un petit rappel plus tard, sans insister. 🙏`), cfg);
  }

  // T1.5 — Vol cliqué dans le bandeau « vols éligibles » du site (premier contact) ──────────────
  // Le site préremplit « …le vol AF718 du 08/06/2026, qui a été retardé… ». On enregistre le vol
  // directement et on SAUTE le questionnaire d'éligibilité : on demande seulement la correspondance,
  // puis on continue vers passagers → pièces → mandat. Plus de fallback IA générique « tapez menu ».
  // Garde-fou : uniquement tant qu'aucun vol n'est saisi et avant le tunnel détaillé (jamais en plein dossier),
  // et jamais sur un tap bouton/liste (id présent → flux interactif prioritaire).
  {
    // SECU : 'consent_cgu' retiré de EARLY pour empêcher le bypass du gate RGPD via lien ticker (audit Code Reviewer 30/06/2026)
    const EARLY = ['accueil', 'go_langue', 'langue', 'route', 'route_zone', 'incident', 'duree', 'annul_delai'];
    if (!id && !s.vol && (!s.step || EARLY.includes(s.step))) {
      const tk = parseTickerFlight(input);
      if (tk) {
        const f = { route_type: 'af_eu', fromTicker: true, names: [] };
        if (s.langue) { f.langue = s.langue; f.langue_code = s.langue_code; f.escalade = s.escalade; }
        // Preuve de consentement déjà donnée : on la CONSERVE (avant : les timestamps CGU/RGPD étaient perdus en repartant sur un état neuf).
        if (s.cgu_accepted) { f.cgu_accepted = s.cgu_accepted; f.cgu_accepted_at = s.cgu_accepted_at; }
        if (s.rgpd_accepted) { f.rgpd_accepted = s.rgpd_accepted; f.rgpd_accepted_at = s.rgpd_accepted_at; }
        f.vol = tk.vol; f.compagnie = deduceAirline(tk.vol) || '';
        if (tk.date) f.date = tk.date;
        f.incident = tk.incident === 'annulation' ? 'annulation' : 'retard';
        f.incident_libelle = tk.incident === 'annulation' ? 'Annulation' : 'Retard +3h';
        if (f.incident === 'retard') f.duree_retard = '+3h';
        // GATE consentement OBLIGATOIRE avant tout mandat : un lien ticker ne doit JAMAIS le contourner.
        if (!(f.cgu_accepted && f.rgpd_accepted)) {
          f.step = 'consent_cgu'; f.pendingTicker = true; await setState(phone, f);
          return sendConsentCgu(phone, f, cfg);
        }
        return resumeTicker(phone, f, cfg);
      }
    }
  }

  // T2 — fallback IA hors-flux (question libre) → réponse + boutons
  // ⚠️ Jamais intercepté si c'est une réponse interactive (bouton/liste) : replyId présent → flux prioritaire
  try {
    const { isClientQuestion, isSensitive, answerClientQuestion } = AI;
    const FREE = ['m_vol', 'm_date', 'm_route', 'm_route_choice', 'm_dep', 'm_arr', 'm_stop_arr', 'm_pnr', 'leg_count', 'leg_input', 'esc_dep', 'esc_via', 'esc_arr', 'esc_vol', 'names', 'mineurs_which', 'fix_vol', 'fix_date', 'fix_nom', 'fix_route', 'fix_pnr', 'fix_nom_which', 'names_fix_which', 'names_fix_one', 'doc_name', 'doc_dob', 'doc_adresse'];
    // Filet « client paumé » : phrases de blocage/aide qui ne sont JAMAIS une réponse d'étape
    // valide → on ne re-pose pas bêtement l'étape, on propose Reprendre / Recommencer / Humain.
    const stuckNorm = lower.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const looksStuck = !id && /\b(compren|compris|bloqu|perdu|aide|help|au secours|marche pas|fonctionne pas|arrive pas|c.?est quoi|comment (ca|on|je)|refaire|depuis le debut|recommenc)/.test(stuckNorm);
    const enTunnel = s.step && !['accueil', 'langue', 'done', 'non_eligible'].includes(s.step);
    if (looksStuck && !isSensitive(input)) {
      await sendButtons(phone, { body: L(s, `🙂 No worries, I'm here. We can pick up where you left off, start over, or have an advisor call you. 👇`, `🙂 Pas de souci, je suis là. On reprend où vous en étiez, on recommence à zéro, ou un conseiller vous rappelle. 👇`), buttons: enTunnel ? [{ id: 'menu', text: L(s, '▶️ Resume', '▶️ Reprendre') }, { id: 'recommencer', text: L(s, '🔄 Start over', '🔄 Recommencer') }, { id: 'appel', text: L(s, '📞 Get a callback', '📞 Être rappelé') }] : [{ id: 'menu', text: L(s, '📋 Start', '📋 Démarrer') }, { id: 'appel', text: L(s, '📞 Get a callback', '📞 Être rappelé') }] }, cfg);
      return;
    }
    // Une intention claire « parler à un humain / être contacté / rappel » est analysée PARTOUT
    // (même en plein tunnel et sans « ? ») → on ne redemande pas bêtement l'étape en cours.
    // Après signature : le client n'est plus dans un tunnel à compléter → dès qu'il écrit librement,
    // l'IA prend le relais (au lieu de re-poser une étape). On EXCLUT les étapes de SAISIE libre (FREE,
    // ex. saisie manuelle du nom/date) pour ne pas avaler une vraie donnée, et les photos/boutons
    // continuent d'alimenter la collecte des pièces & reçus (mediaUrl/id non touchés).
    // Borné au step 'done' (post-signature idle) : un NOUVEAU dossier (autre_vol → clearState) repart
    // sur un step de tunnel ≠ 'done' → le relais IA ne s'y déclenche pas et le nouveau flux est normal.
    const isSigned = (LEADS.get(leadKey(phone)) || {}).signed === true;
    const signedFreeChat = isSigned && s.step === 'done' && !id && !mediaUrl && !!(input && input.trim());
    const looks = !id && (isSensitive(input) || signedFreeChat || (FREE.includes(s.step) ? input.includes('?') : isClientQuestion(input)));
    if (looks) {
      if (isSensitive(input)) { upsertLead(phone, { wantsCall: true, wantsCallAt: Date.now(), lastClientAt: Date.now() }); notifyCallbackWanted(phone, s, `question sensible : « ${String(input).slice(0, 80)} »`); await send(phone, L(s, `I'm passing your request to a Robin des Airs advisor. 🙏\nType *go* to continue your case.`, `Je transmets votre demande à un conseiller Robin des Airs. 🙏\nÉcrivez *go* pour continuer votre dossier.`), cfg); return; }
      const r = await answerClientQuestion(input, process.env.OPENAI_API_KEY);
      // Client signé : portes de sortie claires → déposer ses pièces, ouvrir un NOUVEAU dossier, ou un humain.
      const footer = isSigned ? L(s, `\n\n👉 Another question? Just write to me. Or choose 👇`, `\n\n👉 Une autre question ? Écrivez-moi. Ou choisissez 👇`) : L(s, `\n\n👉 *Start* below 👇`, `\n\n👉 *Démarrez* ci-dessous 👇`);
      const btns = isSigned ? [{ id: 'depot', text: L(s, '📎 Upload my documents', '📎 Déposer mes pièces') }, { id: 'autre_vol', text: L(s, '✈️ New claim', '✈️ Nouveau dossier') }, { id: 'appel', text: L(s, '📞 Get a callback', '📞 Être rappelé') }] : [{ id: 'menu', text: L(s, '📋 Start', '📋 Démarrer') }, { id: 'appel', text: L(s, '📞 Get a callback', '📞 Être rappelé') }];
      await sendButtons(phone, { body: (r || L(s, `🤖 I'm the Robin des Airs AI assistant.`, `🤖 Je suis l'assistant IA de Robin des Airs.`)) + footer, buttons: btns }, cfg);
      return;
    }
  } catch (e) { console.warn('[v8 T2-fallback] IA error, continuing to step handler:', e.message || e); }

  // ACCUEIL (MSG1)
  if (s.step === 'accueil' || !s.step) return sendAccueil(phone, cfg, _accLang);

  // Bouton MSG1 « Vérifier mon indemnité » / « Commencer / Démarrer »
  if (s.step === 'go_langue') { return sendLangue(phone, s, cfg); }

  // MSG2 — LANGUE
  if (s.step === 'langue') {
    // Anglais DÉJÀ détecté au 1er contact (visiteur du site anglais) ET l'entrée n'est pas une sélection
    // de langue explicite → on SAUTE le menu et on démarre directement en anglais. (Le client peut quand
    // même choisir une autre langue : matchLang/ri attrapent alors la sélection et on passe outre ce saut.)
    if (s.langue_code === 'en' && listRowIdx(id) < 0 && !matchLang(input)) {
      s.langue = '🇬🇧 English'; s.route_type = 'af_eu'; await setState(phone, s);
      await send(phone, `Perfect — I'll assist you in English. 🇬🇧\nLet's check what compensation you may be owed, *up to €600 per passenger*. 👇`, cfg);
      return sendConsentCgu(phone, s, cfg);
    }
    // Matching par ID WATI liste ("0-N") si disponible, sinon par texte/flag
    const ri = listRowIdx(id);
    const langArr = Object.values(LANGS);
    const L = (ri >= 0 && langArr[ri]) ? langArr[ri] : matchLang(input);
    if (!L) return sendLangue(phone, s, cfg);
    s.langue = `${L.flag} ${L.label}`; s.langue_code = L.code;
    if (L.africaine) { s.escalade = 'langue_africaine'; await send(phone, `${L.natif}\n\n💬 *Moi l'assistant, je prépare votre dossier ici en français* (je ne parle pas encore ${L.label} 🙏) — on avance ensemble, étape par étape.\n\n📞 Et *à la fin, ${L.agent} vous rappellera dans votre langue*, au *+33 7 56 86 36 30* (enregistrez-le sous « ${L.agent} – Robin des Airs » pour reconnaître son appel). 👇`, cfg); }
    else if (L.code === 'en') { await send(phone, `Perfect — I'll assist you in English. 🇬🇧\nLet's check together what compensation you may be owed, *up to €600 per passenger*. 👇`, cfg); }
    s.route_type = 'af_eu'; await setState(phone, s); return sendConsentCgu(phone, s, cfg);
  }

  // GATE UNIFIÉ : CGU + Politique de confidentialité en 1 étape (fusion 30/06/2026).
  // Les 2 finalités sont distinctement nommées dans le body → CJUE Planet49 respectée.
  // Sur acceptation on stocke les 2 timestamps simultanément (preuve individuelle
  // en cas de litige) puis on passe directement à l'incident (skip consent_rgpd).
  if (s.step === 'consent_cgu') {
    const t = lower.trim();
    const accept = id === 'cgu_accept' || /\b(j['’ ]?accept|accepte?r?|accept|yes|oui|ok|d['’ ]?accord|agree|continuer|continue)\b/i.test(t);
    const refuse = id === 'cgu_refuse' || /\b(refus(er|e)?|decline|non|no)\b/i.test(t);
    if (accept) {
      const now = Date.now();
      s.cgu_accepted = true;
      s.cgu_accepted_at = now;
      s.rgpd_accepted = true;      // consent unifié : les 2 timestamps sur le même click
      s.rgpd_accepted_at = now;
      await setState(phone, s);
      await send(phone, L(s,
        '✅ Thanks! Your consents are recorded. Let\'s continue with your case. 👇',
        '✅ Merci ! Vos acceptations sont enregistrées. On continue avec votre dossier. 👇'), cfg);
      if (s.pendingTicker) { delete s.pendingTicker; return resumeTicker(phone, s, cfg); } // vol prérempli (ticker) : on reprend APRÈS le consentement
      return sendIncident(phone, s, cfg);
    }
    if (refuse) {
      await clearState(phone);
      return send(phone, L(s,
        '🙏 We understand. Without accepting our Terms and Privacy Policy, we cannot process your case.\n\nIf you change your mind, type *go* to start over.',
        '🙏 On comprend. Sans accepter nos conditions et politique de confidentialité, on ne peut pas traiter votre dossier.\n\nSi vous changez d\'avis, écrivez *go* pour recommencer.'), cfg);
    }
    if (await stuckHelp(phone, s, cfg)) return;
    return sendConsentCgu(phone, s, cfg);
  }

  // GATE 2/2 : RGPD séparé (CJUE Planet49 : consentement spécifique au traitement des données).
  // Regex tolérante : idem CGU pour cohérence UX.
  if (s.step === 'consent_rgpd') {
    const t = lower.trim();
    const accept = id === 'rgpd_accept' || /\b(j['’ ]?accept|accepte?r?|accept|yes|oui|ok|d['’ ]?accord|agree|acc[eè]der|access)\b/i.test(t);
    const refuse = id === 'rgpd_refuse' || /\b(refus(er|e)?|decline|non|no)\b/i.test(t);
    if (accept) {
      s.rgpd_accepted = true;
      s.rgpd_accepted_at = Date.now();
      await setState(phone, s);
      await send(phone, L(s,
        '✅ Thanks! Both consents recorded. Let\'s continue with your case. 👇',
        '✅ Merci ! Vos deux acceptations sont enregistrées. On continue avec votre dossier. 👇'), cfg);
      return sendIncident(phone, s, cfg);
    }
    if (refuse) {
      await clearState(phone);
      return send(phone, L(s,
        '🙏 We understand. Without accepting our Privacy Policy (GDPR), we cannot process your data.\n\nIf you change your mind, type *go* to start over.',
        '🙏 On comprend. Sans accepter la politique de confidentialité (RGPD), on ne peut pas traiter vos données.\n\nSi vous changez d\'avis, écrivez *go* pour recommencer.'), cfg);
    }
    if (await stuckHelp(phone, s, cfg)) return;
    return sendConsentRgpd(phone, s, cfg);
  }

  // MSG3 — ROUTE : qualification CE 261 en 1 tap (le voyage touche-t-il l'Europe ?).
  // Le détail ville-par-ville n'est demandé QUE pour une correspondance (steps esc_*).
  if (s.step === 'route_zone') {
    const n = normInput(input, ['commence', 'arriv', 'ni']); // « arriv » (pas « arrive ») : « arrivée » ne contient PAS « arrive » à cause de l'accent é
    if (id === 'rz_dep' || n === '1' || lower.includes('commence') || /d[ée]part|d[ée]coll|\bpar[st]?\b/.test(lower)) {
      s.route_type = 'af_eu'; s.europeTouch = 'depart'; s.step = 'incident'; await setState(phone, s);
      await send(phone, L(s, `✅ Flight *departing from Europe*: you're covered by EC 261/2004 — *whatever the airline*. 👍`, `✅ Vol au *départ d'Europe* : vous êtes couvert(e) par le CE 261/2004 — *quelle que soit la compagnie*. 👍`), cfg);
      return sendIncident(phone, s, cfg);
    }
    if (id === 'rz_arr' || n === '2' || lower.includes('arriv') || lower.includes('atterr')) {
      s.route_type = 'af_eu'; s.europeTouch = 'arrivee'; s.step = 'incident'; await setState(phone, s);
      await send(phone, L(s, `✅ Flight *arriving in Europe*: covered *if the airline is European* (Air France, Brussels, TAP…). Otherwise an expert checks another option — we keep your case either way. 👍`, `✅ Vol à *l'arrivée en Europe* : couvert *si la compagnie est européenne* (Air France, Brussels, TAP…). Sinon, un expert vérifie un autre recours — on garde votre dossier dans tous les cas. 👍`), cfg);
      return sendIncident(phone, s, cfg);
    }
    if (id === 'rz_non' || n === '3' || lower.includes('ni l') || lower === 'ni' || lower.includes('aucun')) {
      await clearState(phone);
      return finNonEligible(phone, L(s, `😔 If your flight neither *departs from* nor *arrives in* Europe, it doesn't fall under EU law EC 261/2004.\n\n❓ If that's a mistake (a layover in Europe counts!), type *go*.`, `😔 Si votre vol ne *part pas* d'Europe et n'*arrive pas* en Europe, il n'entre pas dans la loi européenne CE 261/2004.\n\n❓ En cas d'erreur (une escale en Europe compte !), écrivez *go*.`), cfg);
    }
    if (await stuckHelp(phone, s, cfg)) return;
    return askRouteZone(phone, s, cfg);
  }
  // MSG3 — ROUTE (LEGACY : sessions déjà engagées sur l'ancienne question abstraite)
  if (s.step === 'route') {
    // Matching prioritaire : ID WATI de la liste (format "sectionIdx-rowIdx", 0-based)
    const ri = listRowIdx(id); // 0=Afrique↔EU, 1=EU↔EU, 2=Départ/arr EU, 3=Autre
    const n = normInput(input, ['afrique', 'europe ↔', 'départ', 'autre']);
    if (ri === 0 || n === '1' || (lower.includes('afrique') && lower.includes('europe'))) { s.route_type = 'af_eu'; }
    else if (ri === 1 || n === '2' || (lower.includes('europe') && !lower.includes('afrique') && !lower.includes('départ') && !lower.includes('arrivée'))) { s.route_type = 'eu_eu'; await send(phone, L(s, `🇪🇺 Intra-European flights are covered by EC 261 ✅\nOur specialty is Africa ↔ Europe, but let's continue.`, `🇪🇺 Les vols intra-européens sont couverts par le CE 261 ✅\nNotre spécialité c'est Afrique ↔ Europe, mais on continue.`), cfg); }
    else if (ri === 2 || n === '3' || (lower.includes('départ') && !lower.includes('retard'))) { s.route_type = 'mixte'; await send(phone, L(s, `🛫 A departure from or arrival in Europe can be eligible. Let's check together. ✅`, `🛫 Un départ ou une arrivée en Europe peut être éligible. Vérifions ensemble. ✅`), cfg); }
    else if (ri === 3 || n === '4' || lower.includes('autre')) { return finNonEligible(phone, L(s, `😔 Your flight doesn't appear to be covered by EU law.\n\nEC 261/2004 applies to flights departing from / arriving at a European airport, or operated by a European airline.\n\n❓ If that's a mistake, type *go* to pick another route.`, `😔 Votre vol ne semble pas couvert par la loi européenne.\n\nLe CE 261/2004 s'applique aux vols au départ/à l'arrivée d'un aéroport européen, ou opérés par une compagnie européenne.\n\n❓ Si erreur, écrivez *go* pour choisir une autre route.`), cfg); }
    else { const rd = await redispatch('route'); if (rd !== undefined) return rd; if (await stuckHelp(phone, s, cfg)) return; await send(phone, L(s, `🙂 I didn't quite get that. Choose from the list below 👇`, `🙂 Je n'ai pas bien compris. Choisissez dans la liste ci-dessous 👇`), cfg); return sendRoute(phone, s, cfg); }
    s.step = 'incident'; await setState(phone, s); return sendIncident(phone, s, cfg);
  }

  // MSG4 — INCIDENT
  if (s.step === 'incident') {
    const n = normInput(input, ['retard', 'annulation', 'refus']);
    if (id === 'inc_retard' || n === '1' || lower.includes('retard') || lower.includes('delay')) { s.step = 'duree'; await setState(phone, s); return sendButtons(phone, { body: L(s, `😟 Sorry about this delay. At your *final destination*, was the delay — or the *announced* delay — *3 hours or more*?\n\n_Flight not landed yet? Tap "Not sure/in flight": we track the actual arrival for you._`, `😟 Désolé pour ce retard. À l'arrivée *à destination finale*, le retard était-il — ou est-il *annoncé* — de *3 heures ou plus* ?\n\n_Vol pas encore arrivé ? Touchez « Pas sûr / en vol » : on suit l'arrivée réelle pour vous._`), buttons: [{ id: 'dur_plus', text: L(s, '✅ 3h or more', '✅ 3 h ou plus') }, { id: 'dur_moins', text: L(s, '❌ Less than 3h', '❌ Moins de 3 h') }, { id: 'dur_inconnu', text: L(s, '⏳ Not sure/in flight', '⏳ Pas sûr / en vol') }] }, cfg); }
    if (id === 'inc_annul' || n === '2' || lower.includes('annul') || lower.includes('cancel')) { s.incident = 'annulation'; s.incident_libelle = 'Annulation'; return sendAnnulDelai(phone, s, cfg); }
    if (id === 'inc_refus' || n === '3' || lower.includes('refus') || lower.includes('embarq') || lower.includes('denied') || lower.includes('boarding')) { s.incident = 'refus'; s.incident_libelle = "Refus d'embarquement"; await setState(phone, s); await send(phone, LV(s, phone, 'REACTION_REFUS', `😟 Denied boarding gives strong rights under EC 261. Let's check what you're owed.`), cfg); return estimationPuisPax(phone, s, cfg); }
    { const rd = await redispatch('incident'); if (rd !== undefined) return rd; if (await stuckHelp(phone, s, cfg)) return; await send(phone, L(s, `🙂 Tap the button that matches your situation 👇`, `🙂 Touchez le bouton qui correspond à votre situation 👇`), cfg); return sendIncident(phone, s, cfg); }
  }
  // MSG4b — ANNULATION : règle des 14 jours de préavis (art. 5 CE 261). Pré-filtre AVANT le n° de vol.
  // Le critère légal = écart NOTIFICATION → date du vol, pas « le vol est dans +/- 14 j à partir d'aujourd'hui ».
  if (s.step === 'annul_delai') {
    const n = normInput(input, ['moins de', 'ou plus', 'sais']); // mots-clés NON chevauchants (« 14 jours » est dans les 2 boutons)
    if (id === 'pre_plus14' || n === '2' || lower.includes('ou plus') || lower.includes('plus de 14') || lower.includes('14 ou plus') || lower.includes('14 days or more') || lower.includes('more than 14')) { return finNonEligible(phone, L(s, STOP_ANNUL_14J_EN, pickVariant(phone, 'STOP_ANNUL_14J')), cfg); }
    if (id === 'pre_inconnu' || n === '3' || lower.includes('sais') || lower.includes('souviens') || lower.includes('aucune idée') || lower.includes('not sure')) { s.annul_preavis = 'inconnu'; s.escalade = s.escalade || 'preavis_inconnu'; await send(phone, LV(s, phone, 'ANNUL_PREAVIS_INCONNU', `👍 No worries — we'll check the airline's notice records for you.`), cfg); return continueAnnul(phone, s, cfg); }
    if (id === 'pre_moins14' || n === '1' || lower.includes('moins de 14') || lower.includes('moins de') || lower.includes('moins') || lower.includes('less than 14')) { s.annul_preavis = '<14j'; await send(phone, LV(s, phone, 'REACTION_ANNULATION', `😟 A late cancellation gives strong rights. Let's check your compensation.`), cfg); return continueAnnul(phone, s, cfg); }
    if (await stuckHelp(phone, s, cfg)) return;
    await send(phone, L(s, `🙂 I didn't quite get that. Tap one of the buttons below 👇`, `🙂 Je n'ai pas bien compris. Touchez un des boutons ci-dessous 👇`), cfg); return sendAnnulDelai(phone, s, cfg);
  }
  if (s.step === 'duree') {
    const n = normInput(input, ['plus de 3', 'moins de 3', 'sais']);
    if (id === 'dur_plus' || n === '1' || lower.includes('plus de 3') || lower.includes('more than 3') || lower.includes('ou plus') || lower.includes('or more')) { s.incident = 'retard'; s.incident_libelle = 'Retard +3h'; s.duree_retard = '+3h'; return estimationPuisPax(phone, s, cfg); }
    if (id === 'dur_moins' || n === '2' || lower.includes('moins de 3') || lower.includes('less than 3')) { return finNonEligible(phone, L(s, STOP_MOINS_3H_EN, pickVariant(phone, 'STOP_MOINS_3H')), cfg); }
    if (id === 'dur_inconnu' || n === '3' || lower.includes('sais') || lower.includes('souviens') || lower.includes('not sure') || lower.includes('en vol') || lower.includes('pas arriv') || lower.includes('in flight') || lower.includes('pas sûr') || lower.includes('pas sur')) { s.incident = 'retard'; s.incident_libelle = 'Retard (à vérifier)'; s.duree_retard = 'inconnue'; s.escalade = s.escalade || 'duree_inconnue'; await send(phone, LV(s, phone, 'DUREE_INCONNUE', `👍 No worries — we'll check the airline's records for you.`), cfg); return estimationPuisPax(phone, s, cfg); }
    if (await stuckHelp(phone, s, cfg)) return;
    return sendButtons(phone, { body: L(s, `🙂 Tap a button: at your final destination, was the delay (or announced delay) 3 hours or more?`, `🙂 Touchez un bouton : à l'arrivée finale, le retard (constaté ou annoncé) était-il de 3 heures ou plus ?`), buttons: [{ id: 'dur_plus', text: L(s, '✅ 3h or more', '✅ 3 h ou plus') }, { id: 'dur_moins', text: L(s, '❌ Less than 3h', '❌ Moins de 3 h') }, { id: 'dur_inconnu', text: L(s, '⏳ Not sure/in flight', '⏳ Pas sûr / en vol') }] }, cfg);
  }

  // MSG5 — PASSAGERS
  if (s.step === 'nb_pax') {
    const n = parseInt(normInput(input, ['1 passager', '2 passager', '3 passager', '4 passager', '5 passager', '6 ou plus']));
    if (n >= 1 && n <= 5) { s.pax = n; s.names = []; if (s.fromTicker) { await setState(phone, s); return afterPaxFromTicker(phone, s, cfg); } s.step = 'type_vol'; await setState(phone, s); return sendButtons(phone, { body: L(s, `${bar('type_vol')}\n✈️ Was it a direct flight or with connection(s)?`, `${bar('type_vol')}\n✈️ C'était un vol direct ou avec escale(s) ?`), buttons: [{ text: L(s, '✈️ Direct flight', '✈️ Vol direct') }, { text: L(s, '🔄 With connection', '🔄 Avec escale') }] }, cfg); }
    if (n >= 6 || lower.includes('6 ou plus') || lower.includes('plus') || lower.includes('more')) { s.step = 'nb_pax_exact'; await setState(phone, s); return send(phone, L(s, `${bar('nb_pax')}\n👥 *How many passengers in total?*\nEnter the total number (e.g. 8). We handle your group right here. 🤝`, `${bar('nb_pax')}\n👥 *Combien de passagers en tout ?*\nIndiquez le nombre total (ex. 8). On gère votre groupe directement ici. 🤝`), cfg); }
    await send(phone, L(s, `🙂 I didn't quite get that. Pick the number of passengers below 👇`, `🙂 Je n'ai pas bien compris. Choisissez le nombre de passagers ci-dessous 👇`), cfg); return sendPax(phone, s, cfg);
  }
  if (s.step === 'nb_pax_exact') {
    const m = input.match(/\d{1,2}/); const n = m ? parseInt(m[0]) : 0;
    if (n >= 1 && n <= 30) { s.pax = n; s.names = []; if (s.fromTicker) { await setState(phone, s); return afterPaxFromTicker(phone, s, cfg); } s.step = 'type_vol'; await setState(phone, s); return sendButtons(phone, { body: L(s, `${bar('type_vol')}\n✅ ${n} passengers — potentially *€${montantTotal(n)}*.\n\n✈️ Was it a direct flight or with layover(s)?`, `${bar('type_vol')}\n✅ ${n} passagers — potentiellement *${montantTotal(n)} €*.\n\n✈️ C'était un vol direct ou avec escale(s) ?`), buttons: [{ id: 'type_direct', text: L(s, '✈️ Direct flight', '✈️ Vol direct') }, { id: 'type_escale', text: L(s, '🔄 With layover', '🔄 Avec escale') }] }, cfg); }
    return send(phone, L(s, `Enter the *total number* of passengers in digits (e.g. 8):`, `Indiquez le *nombre total* de passagers en chiffres (ex. 8) :`), cfg);
  }

  // MSG6 — TYPE VOL → MSG7 motivation → scan
  if (s.step === 'type_vol') {
    const n = normInput(input, ['direct', 'escale']);
    if (id === 'type_escale' || n === '2' || lower.includes('escale') || lower.includes('layover') || lower.includes('connection')) {
      // Escale = on POUSSE LA PHOTO d'abord (l'e-billet contient tous les segments → extraction en 1 coup).
      // La saisie manuelle leg par leg ne reste qu'en repli (bouton « Saisir à la main » → leg_count).
      s.type_vol = 'escale'; s.legs = []; s.legIdx = 0; s.step = 'scan'; await setState(phone, s);
      if (s._earlyMedia) { const m = s._earlyMedia; delete s._earlyMedia; await setState(phone, s); return handleMessage(phone, '', cfg, m, '', true); } // billet déjà envoyé avant le tunnel → on le lit maintenant
      return sendButtons(phone, { body: L(s,
        `${bar('scan')}\n📸 Send a *photo* of your *e-ticket* — it has *all your flights at once*, connections included. I find everything, you type nothing.\n🎫 No e-ticket? Your *boarding passes* work too (one per flight).\n\n💰 Up to *€${montantTotal(s.pax)}* per passenger. *Up to 75% for you*. Nothing upfront.\n\n_ℹ️ Automatic reading by AI._`,
        `${bar('scan')}\n📸 Envoyez une *photo* de votre *e-billet* — il contient *tous vos vols d'un coup*, correspondance incluse. Je retrouve tout, vous ne tapez rien.\n🎫 Pas d'e-billet ? Vos *cartes d'embarquement* aussi (une par vol).\n\n💰 Jusqu'à *${montantTotal(s.pax)} €* par passager. *Jusqu'à 75 % pour vous*. Rien à avancer.\n\n_ℹ️ Lecture automatique par IA._`), buttons: [{ id: 'scan_photo', text: L(s, '📸 Send a photo', '📸 Envoyer une photo') }, { id: 'scan_manuel', text: L(s, '✏️ Type it in', '✏️ Saisir à la main') }] }, cfg);
    }
    if (id === 'type_direct' || n === '1' || lower.includes('direct')) s.type_vol = 'direct';
    else return sendButtons(phone, { body: L(s, `${bar('type_vol')}\n✈️ Direct flight or with layover(s)?`, `${bar('type_vol')}\n✈️ Vol direct ou avec escale(s) ?`), buttons: [{ id: 'type_direct', text: L(s, '✈️ Direct flight', '✈️ Vol direct') }, { id: 'type_escale', text: L(s, '🔄 With layover', '🔄 Avec escale') }] }, cfg);
    s.step = 'scan'; await setState(phone, s);
    if (s._earlyMedia) { const m = s._earlyMedia; delete s._earlyMedia; await setState(phone, s); return handleMessage(phone, '', cfg, m, '', true); } // billet déjà envoyé avant le tunnel → on le lit maintenant
    // Un seul message (motivation + scan) → réponse immédiate, pas de délai où les taps s'entrecroisent.
    return sendButtons(phone, { body: L(s, `${bar('scan')}\n📸 Send a *photo* of your billet — I'll handle everything.\n\n💰 Up to *€${montantTotal(s.pax)}* per passenger. *Up to 75% for you*. Nothing upfront.\n\n_ℹ️ Automatic reading by AI._\n\n📎 Send the photo, or:`, `${bar('scan')}\n📸 Envoyez une *photo* de votre billet — je m'occupe de tout.\n\n💰 Jusqu'à *${montantTotal(s.pax)} €* par passager. *Jusqu'à 75 % pour vous*. Rien à avancer.\n\n_ℹ️ Lecture automatique par IA._\n\n📎 Envoyez la photo, ou :`), buttons: [{ id: 'scan_photo', text: L(s, '📸 Send a photo', '📸 Envoyer une photo') }, { id: 'scan_manuel', text: L(s, '✏️ Type it in', '✏️ Saisir à la main') }] }, cfg);
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
    if (await stuckHelp(phone, s, cfg)) return;
    return sendButtons(phone, { body: L(s, `Was this flight part of a *connection* (another flight just before or just after)?`, `Ce vol faisait-il partie d'une *correspondance* (un autre vol juste avant ou juste après) ?`), buttons: [{ id: 'corr_direct', text: L(s, '✈️ No, direct flight', '✈️ Non, vol direct') }, { id: 'corr_escale', text: L(s, '🔄 Yes, a connection', '🔄 Oui, correspondance') }] }, cfg);
  }
  // ── Correspondance GUIDÉE ville par ville : départ → escale(s) → arrivée finale → n° des vols ──
  // Une photo envoyée en plein milieu = le client tend son e-billet → on bascule sur le scan (il lit tout d'un coup).
  if (/^esc_/.test(s.step) && mediaUrl) { s.step = 'scan'; await setState(phone, s); return handleMessage(phone, text, cfg, mediaUrl, replyId, true); }
  if (s.step === 'esc_dep') {
    const pk = cityPick(input, id, VILLES_COURANTES);
    if (pk && pk.autre) return send(phone, L(s, `✏️ Type the name of your *departure* city _(e.g. Cotonou)_:`, `✏️ Tapez le nom de votre ville de *départ* _(ex : Cotonou)_ :`), cfg);
    if (!pk) { if (await stuckHelp(phone, s, cfg)) return; return askEscDep(phone, s, cfg); }
    s.escCities = [pk.city]; await setState(phone, s);
    await send(phone, L(s, `✅ Departure: *${pk.city}*`, `✅ Départ : *${pk.city}*`), cfg);
    return askEscVia(phone, s, cfg);
  }
  if (s.step === 'esc_via') {
    const pk = cityPick(input, id, VILLES_HUBS);
    if (pk && pk.autre) return send(phone, L(s, `✏️ Type the name of the *layover* city _(e.g. Nairobi)_:`, `✏️ Tapez le nom de la ville d'*escale* _(ex : Nairobi)_ :`), cfg);
    if (!pk) return askEscVia(phone, s, cfg, (s.escCities || []).length >= 2);
    s.escCities = s.escCities || []; s.escCities.push(pk.city);
    if (s.escCities.length >= 4) return askEscArr(phone, s, cfg, L(s, `✅ Stop: *${pk.city}*`, `✅ Escale : *${pk.city}*`));
    s.step = 'esc_more'; await setState(phone, s);
    return sendButtons(phone, { body: L(s, `✅ Stop: *${pk.city}*\n\nWas there *another stop*?`, `✅ Escale : *${pk.city}*\n\nY avait-il une *autre escale* ?`), buttons: [{ id: 'esc_oui', text: L(s, '🔄 Yes, another', '🔄 Oui, une autre') }, { id: 'esc_non', text: L(s, '➡️ No', '➡️ Non') }] }, cfg);
  }
  if (s.step === 'esc_more') {
    if (id === 'esc_non' || /^non/.test(lower)) return askEscArr(phone, s, cfg);
    if (id === 'esc_oui' || /^oui/.test(lower)) return askEscVia(phone, s, cfg, true);
    return sendButtons(phone, { body: L(s, `Was there *another stop*?`, `Y avait-il une *autre escale* ?`), buttons: [{ id: 'esc_oui', text: L(s, '🔄 Yes, another', '🔄 Oui, une autre') }, { id: 'esc_non', text: L(s, '➡️ No', '➡️ Non') }] }, cfg);
  }
  if (s.step === 'esc_arr') {
    const pk = cityPick(input, id, VILLES_COURANTES);
    if (pk && pk.autre) return send(phone, L(s, `✏️ Type the name of your *final arrival* city _(e.g. Toulouse)_:`, `✏️ Tapez le nom de votre ville d'*arrivée finale* _(ex : Toulouse)_ :`), cfg);
    if (!pk) { if (await stuckHelp(phone, s, cfg)) return; return askEscArr(phone, s, cfg); }
    const city = pk.city;
    // Arrivée = départ → aller-retour confondu : on ne décrit que le voyage qui a eu le problème.
    if (s.escCities && s.escCities[0] && city.toLowerCase() === s.escCities[0].toLowerCase()) {
      return send(phone, L(s, `🤔 Your arrival (*${city}*) is the same as your departure — for a *round trip*, describe only the journey that had the problem (outbound OR return).\n🛬 What's the arrival city of *this* journey?`, `🤔 Votre arrivée (*${city}*) est identique à votre départ — pour un *aller-retour*, ne décrivez que le voyage qui a eu le problème (l'aller OU le retour).\n🛬 Quelle est la ville d'arrivée de *ce* voyage ?`), cfg);
    }
    return buildEscLegs(phone, s, cfg, city);
  }
  if (s.step === 'esc_vol') {
    let vol = '';
    if (!(lower === 'passer' || lower === 'non' || lower === 'skip' || lower.includes('sais pas') || lower.includes('sais plus'))) {
      const vm = input.toUpperCase().match(/[A-Z]{2,3}\s?\d{1,4}[A-Z]?/);
      if (!vm) return send(phone, L(s, `Number not recognised _(e.g. AT540)_. Send it again, or type *skip*:`, `Numéro non reconnu _(ex : AT540)_. Renvoyez-le, ou tapez *passer* :`), cfg);
      vol = vm[0].replace(/\s/g, '');
    }
    s.legs = s.legs || []; if (s.legs[s.legIdx]) s.legs[s.legIdx].vol = vol;
    s.legIdx = (s.legIdx || 0) + 1;
    if (s.legIdx < s.legCount) { await setState(phone, s); const l = s.legs[s.legIdx]; return send(phone, L(s, `✈️ And the number of flight *${l.dep} → ${l.arr}*?\n✏️ _Type *skip* if you no longer have it._`, `✈️ Et le numéro du vol *${l.dep} → ${l.arr}* ?\n✏️ _Tapez *passer* si vous ne l'avez plus._`), cfg); }
    s.vol = s.legs.map((l) => l.vol).filter(Boolean).join(' + ') || s.vol || '';
    s.compagnie = deduceAirline(s.legs[s.legs.length - 1] && s.legs[s.legs.length - 1].vol) || deduceAirline(s.legs[0] && s.legs[0].vol) || s.compagnie || '';
    if (isValidStoredDate(s.date)) { await setState(phone, s); return apresVol(phone, s, cfg); } // date déjà connue (ticker/scan) → ne pas la redemander
    s.step = 'm_date'; await setState(phone, s);
    return send(phone, L(s, `📅 Date of the *first flight*? _(e.g. 15/03/2026)_`, `📅 Date du *premier vol* ? _(ex : 15/03/2026)_`), cfg);
  }

  // ── Correspondance : combien de vols, puis chaque segment, puis ordre automatique ──
  // (ANCIEN flux, conservé pour les conversations déjà engagées dessus — les nouvelles passent par esc_dep)
  if (s.step === 'leg_count') {
    let n2 = 0; const m = (input.match(/\d+/) || [])[0]; if (m) n2 = parseInt(m);
    if (lower.includes('deux')) n2 = 2; if (lower.includes('trois')) n2 = 3;
    if (!(n2 >= 2 && n2 <= 4)) return sendButtons(phone, { body: L(s, `🔄 How many flights in your trip?`, `🔄 Combien de vols dans votre trajet ?`), buttons: [{ text: L(s, '✈️ 2 flights', '✈️ 2 vols') }, { text: L(s, '🔄 3 flights', '🔄 3 vols') }] }, cfg);
    s.legCount = n2; s.legs = []; s.legIdx = 0; s.step = 'leg_input'; await setState(phone, s);
    return send(phone, L(s, `✈️ *Flight 1 of ${n2}* — its *code* (e.g. AF718), then *from which city to which city* (e.g. Dakar → Casablanca).`, `✈️ *Vol 1 sur ${n2}* — son *code* (ex : AF718), puis *de quelle ville à quelle ville* (ex : Dakar → Casablanca).`), cfg);
  }
  if (s.step === 'leg_input') {
    const volm = input.toUpperCase().match(/[A-Z]{2,3}\s?\d{1,4}[A-Z]?/);
    const vol = volm ? volm[0].replace(/\s/g, '') : '';
    const rest = input.replace(volm ? volm[0] : '', '');
    const parts = rest.replace(/'/g, '').split(/→|->|—|–|,|\bvers\b|\bà\b|\ba\b/i).map((x) => x.trim()).filter((x) => x.length >= 2);
    s.legs = s.legs || []; s.legs.push({ vol, dep: parts[0] || '', arr: parts[1] || '' });
    s.legIdx = (s.legIdx || 0) + 1; await setState(phone, s);
    if (s.legIdx < s.legCount) return send(phone, L(s, `✈️ *Flight ${s.legIdx + 1} of ${s.legCount}* — its *code* (e.g. AT540), then *from which city to which city* (e.g. Casablanca → Paris).`, `✈️ *Vol ${s.legIdx + 1} sur ${s.legCount}* — son *code* (ex : AT540), puis *de quelle ville à quelle ville* (ex : Casablanca → Paris).`), cfg);
    // Tous les segments reçus → on remet dans l'ordre automatiquement (chaînage des aéroports)
    const ordered = chainLegs(s.legs) || s.legs;
    s.legs = ordered;
    const airports = []; ordered.forEach((l, i) => { if (i === 0 && l.dep) airports.push(l.dep); if (l.arr) airports.push(l.arr); });
    s.route = airports.filter(Boolean).join(' → ') || s.route || '';
    s.vol = ordered.map((l) => l.vol).filter(Boolean).join(' + ') || s.vol || '';
    s.compagnie = deduceAirline(ordered[ordered.length - 1] && ordered[ordered.length - 1].vol) || deduceAirline(ordered[0] && ordered[0].vol) || s.compagnie || '';
    if (isValidStoredDate(s.date)) { await setState(phone, s); return apresVol(phone, s, cfg); } // date déjà connue (ticker/scan) → ne pas la redemander
    s.step = 'm_date'; await setState(phone, s);
    return send(phone, L(s, `📅 Date of the *first flight*? _(e.g. 15/03/2026)_`, `📅 Date du *premier vol* ? _(ex : 15/03/2026)_`), cfg);
  }

  // MSG8 — SCAN (e-billet / carte — accepte PLUSIEURS pages photographiées)
  if (s.step === 'scan') {
    if (mediaUrl) {
      s.scan_pages = s.scan_pages || []; if (s.scan_pages.length < 8) s.scan_pages.push(mediaUrl);
      let d = await extractEticketPages(s.scan_pages, cfg);              // relit TOUTES les pages d'un coup → fusion
      if (!d || !d.vol) { const bp = await ocrBoardingPass(mediaUrl, cfg); if (bp && bp.vol) { d = bp; d._carte = true; } } // repli carte d'embarquement (image)
      if (d && d.multiPNR) { delete s.scan_pages; await setState(phone, s); return sendButtons(phone, { body: L(s, `📑 I saw *several bookings* (different PNRs) on this image. To avoid mixing them up, send them *one by one* (one photo per booking), starting with the flight that had the problem.`, `📑 J'ai vu *plusieurs réservations* (PNR différents) sur cette image. Pour ne pas les mélanger, envoyez-les *une par une* (une photo par réservation), en commençant par le vol qui a eu le problème.`), buttons: [{ id: 'scan_manuel', text: L(s, '✏️ Type it in', '✏️ Saisir à la main') }] }, cfg); }
      // Acceptation permissive : on avance dès qu'on a un signal utile (n° vol OU route lue OU PNR OU billet
      // OU passagers), meme sans le vol. Le client complete/corrige a l'ecran scan_confirm ; c'est bien plus
      // fluide qu'un rejet global "je n'ai pas reussi a lire" quand l'OCR a lu 3/4 des champs sur un doc clair.
      const hasUsefulData = d && (d.vol || d.route || d.pnr || d.billet || (d.passengers && d.passengers.length));
      if (hasUsefulData) {
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
        // Voyage INCOMPLET : le client a indiqué que son trajet touche l'Europe, mais aucun vol lu ne touche
        // un aéroport européen → il manque le tronçon vers/depuis l'Europe (2e carte perdue, e-billet partiel).
        // On ne fige PAS un verdict sur un voyage tronqué (compagnie débitrice = celle du vol d'entrée en UE).
        // PRINCIPE : on ne réclame le tronçon manquant que s'il n'y a qu'UN SEUL vol. Dès qu'un 2e vol est
        // ajouté, on PRÉSUME que le trajet touche l'Europe et on avance (évite un faux blocage quand le vrai
        // aéroport européen n'est pas dans notre liste, ou mal lu par l'OCR).
        const legsNow = (s.legs && s.legs.length) ? s.legs.map((l) => ({ dep: l.dep, arr: l.arr }))
          : (d.depart && d.arrivee) ? [{ dep: d.depart, arr: d.arrivee }] : [];
        const attendEurope = s.route_type === 'af_eu' || s.europeTouch === 'arrivee' || s.europeTouch === 'depart';
        const toucheEurope = legsNow.some((l) => isEUAirport(l.dep) || isEUAirport(l.arr));
        if (attendEurope && legsNow.length === 1 && !toucheEurope) {
          // Le bot trouve TOUJOURS le « point de chute » = l'aéroport où ce vol atterrit (le hub de
          // correspondance, ici CMN/Casablanca). On ancre la question dessus : depuis ce point, quel vol a
          // ramené en Europe. On le mémorise pour pré-remplir le DÉPART du vol suivant (saisie ou scan).
          const chute = (legsNow[legsNow.length - 1] || {}).arr || d.arrivee || '';
          s.point_chute = chute; s.escalade = s.escalade || 'troncon_europe_manquant'; s.step = 'scan'; await setState(phone, s);
          const r = humanizeRoute(d.route) || `${d.depart || '?'} → ${d.arrivee || '?'}`;
          const ville = chute ? `*${iataLabel(chute)}*${IATA_CITY[chute] ? ` (${chute})` : ''}` : L(s, 'your layover', 'votre escale');
          return sendButtons(phone, { body: L(s,
            `⚠️ This flight *${r}* stops in ${ville} — it doesn't reach Europe yet.\n\nYou landed in ${ville}: *which flight then brought you back to Europe?* That's the one that opens your rights and names the airline to claim from.\n\n📎 Send the *2nd boarding pass* (the flight from ${ville}), your *e-ticket* (it has all the flights), or your suitcase's *baggage tag*.\n\n_Lost the pass? Type the flight number from ${ville}, we'll do it by hand._`,
            `⚠️ Ce vol *${r}* s'arrête à ${ville} — il ne touche pas encore l'Europe.\n\nVous avez atterri à ${ville} : *quel vol vous a ensuite ramené(e) en Europe ?* C'est lui qui ouvre vos droits et désigne la compagnie à réclamer.\n\n📎 Envoyez la *2ᵉ carte d'embarquement* (le vol depuis ${ville}), votre *e-billet* (il contient tous les vols), ou l'*étiquette bagage* de votre valise.\n\n_Carte perdue ? Écrivez le n° du vol depuis ${ville}, on le fait à la main._`), buttons: [{ id: 'scan_manuel', text: L(s, `✏️ Type the flight from ${chute || 'the stop'}`, `✏️ Saisir le vol depuis ${chute || 'l\'escale'}`) }] }, cfg);
        }
        if (d.allerRetour && d.trajets && d.trajets.length > 1) { s.trajets = d.trajets; await setState(phone, s); return askSens(phone, s, cfg); }
        s.step = 'scan_confirm'; await setState(phone, s); return scanConfirmCard(phone, s, cfg);
      }
      delete s.scan_pages; await send(phone, L(s, `😕 I couldn't read this document (protected PDF, image too dark or cropped…). Try again with a *clear screenshot*, or let's do it by hand — it takes 2 min. 👇\n\n💡 *Lost your boarding pass?* The *baggage tag* on your suitcase (the checked one) works too: it proves your trip and carries your flight number. 📸 Send it, we'll handle the rest.`, `😕 Je n'ai pas réussi à lire ce document (PDF protégé, image trop sombre ou coupée…). Réessayez avec une *capture d'écran nette*, ou faisons-le à la main — ça prend 2 min. 👇\n\n💡 *Carte d'embarquement perdue ?* L'*étiquette bagage* collée sur votre valise (celle de la soute) fait aussi l'affaire : elle prouve votre voyage et porte votre n° de vol. 📸 Envoyez-la, on s'occupe du reste.`), cfg);
      if (s.type_vol === 'escale') return askEscDep(phone, s, cfg);
      s.step = 'm_vol'; await setState(phone, s); return send(phone, L(s, `📝 Flight number? _(e.g. AF718, AT540)_`, `📝 Numéro de vol ? _(ex. AF718, AT540)_`), cfg);
    }
    if (id === 'scan_photo' || lower.includes('envoyer une photo') || lower.includes('envoie une photo')) {
      return send(phone, L(s, `👍 Got it — tap 📎 (or 📷) below and send a *photo* of your *e-ticket* (it has all your flights), your *boarding pass*, or even the *baggage tag* on your suitcase. I read everything. 🔒`, `👍 C'est noté — appuyez sur 📎 (ou 📷) en bas et envoyez la *photo* de votre *e-billet* (il contient tous vos vols), de votre *carte d'embarquement*, ou même de l'*étiquette bagage* collée sur votre valise. Je lis tout. 🔒`), cfg);
    }
    if (id === 'scan_manuel' || lower.includes('manuel') || lower.includes('manuelle') || lower.includes('saisir')) {
      if (s.type_vol === 'escale') return askEscDep(phone, s, cfg, `🔄 Pas de souci, on le fait ensemble — une question à la fois.`);
      s.step = 'm_vol'; await setState(phone, s); return send(phone, L(s, `📝 Flight number? _(e.g. AF718, AT540)_`, `📝 Numéro de vol ? _(ex. AF718, AT540)_`), cfg);
    }
    // Filet défensif : si l'utilisateur tape un numéro de vol au format standard
    // (2-3 lettres + 2-5 chiffres) alors qu'on est encore au step scan, on l'accepte
    // directement comme s'il avait cliqué "Saisir à la main" puis tapé son numéro.
    // Cas typique : l'utilisateur clique "Saisir à la main" mais tape son n° trop vite
    // avant que le state m_vol soit persisté côté serveur (race Blobs / WATI).
    if (!id && !mediaUrl) {
      const candidate = input.toUpperCase().replace(/\s+/g, '');
      if (/^[A-Z]{2,3}\d{2,5}$/.test(candidate)) {
        s.vol = candidate;
        s.compagnie = deduceAirline(candidate) || s.compagnie || '';
        s.step = 'm_date';
        await setState(phone, s);
        return send(phone, L(s,
          `✅ Flight ${candidate}${s.compagnie ? ' — ' + s.compagnie : ''}\n\n📅 Flight date? _(e.g. 15/03/2026)_`,
          `✅ Vol ${candidate}${s.compagnie ? ' — ' + s.compagnie : ''}\n\n📅 Date du vol ? _(ex. 15/03/2026)_`), cfg);
      }
    }
    if (await stuckHelp(phone, s, cfg)) return;
    return sendButtons(phone, { body: L(s, `📎 Send a *photo* (or the *PDF*) of your e-ticket. _Several pages? Send them one by one, I'll put them together._\n\n_🔒 By sending this document, you agree it will be read by an automated tool (AI) to pre-fill your file — robindesairs.eu/politique-confidentialite._`, `📎 Envoyez une *photo* (ou le *PDF*) de votre e-billet. _Plusieurs pages ? Envoyez-les une par une, je les assemble._\n\n_🔒 En envoyant ce document, vous acceptez qu'il soit lu par un outil automatique (IA) pour pré-remplir votre dossier — robindesairs.eu/politique-confidentialite._`), buttons: [{ id: 'scan_photo', text: L(s, '📸 Send a photo', '📸 Envoyer une photo') }, { id: 'scan_manuel', text: L(s, '✏️ Type it in', '✏️ Saisir à la main') }] }, cfg);
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
    if (id === 'scan_ok' || n === '1' || lower.includes('oui') || lower.includes('yes')) {
      delete s.scan_pages; delete s._scanWarn; s.scanConfirmed = true; // déjà confirmé ici (e-billet) → pas de 2e confirmation au récap
      if (needYear(s.date)) { s.step = 'annee'; await setState(phone, s); return askYear(phone, s, cfg); }
      if (s.date && !isValidStoredDate(s.date)) { const bad = s.date; s.date = ''; s.step = 'm_date'; await setState(phone, s); return send(phone, DATE_INVALIDE(bad), cfg); }
      if (inFuture(s.date)) { s.date = ''; s.step = 'm_date'; await setState(phone, s); return send(phone, FUTURE_JOKE(), cfg); }
      if (tooOld(s.date)) { return finNonEligible(phone, L(s, PRESCRIPTION_5ANS_EN, pickVariant(phone, 'PRESCRIPTION_5ANS')), cfg); }
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
    if (n === '1' || lower.includes('vol') || lower.includes('flight')) { s.step = 'fix_vol'; await setState(phone, s); return send(phone, L(s, `✈️ Current flight: *${s.vol || '—'}*\nJust type the *correct number* 👇 _(e.g. AF718)_`, `✈️ Vol actuel : *${s.vol || '—'}*\nTapez simplement le *bon numéro* 👇 _(ex. AF718)_`), cfg); }
    if (n === '2' || lower.includes('date')) { s.step = 'fix_date'; await setState(phone, s); return send(phone, L(s, `📅 Current date: *${s.date || '—'}*\nJust type the *correct date* 👇 _(DD/MM/YYYY)_`, `📅 Date actuelle : *${s.date || '—'}*\nTapez simplement la *bonne date* 👇 _(JJ/MM/AAAA)_`), cfg); }
    if (n === '3' || lower.includes('nom')) {
      if (s.pax > 1) { s.step = 'fix_nom_which'; await setState(phone, s); return send(phone, L(s, `✏️ Which passenger to fix? Enter their *number* (1 to ${s.pax}).`, `✏️ Quel passager corriger ? Indiquez son *numéro* (1 à ${s.pax}).`), cfg); }
      s.step = 'fix_nom'; await setState(phone, s); return send(phone, L(s, `👤 Current name: *${(s.names && s.names[0]) || '—'}*\nJust type the *correct full name* 👇`, `👤 Nom actuel : *${(s.names && s.names[0]) || '—'}*\nTapez simplement le *bon nom complet* 👇`), cfg);
    }
    if (n === '4' || lower.includes('trajet') || lower.includes('route')) { s.step = 'fix_route'; await setState(phone, s); return send(phone, L(s, `🗺️ Current route: *${s.route || '—'}*\nJust type the *correct route* 👇 _(e.g. Paris - Dakar)_`, `🗺️ Trajet actuel : *${s.route || '—'}*\nTapez simplement le *bon trajet* 👇 _(ex. Paris - Dakar)_`), cfg); }
    if (n === '5' || lower.includes('pnr') || lower.includes('réserv') || lower.includes('reserv') || lower.includes('booking')) { s.step = 'fix_pnr'; await setState(phone, s); return send(phone, L(s, `🎫 Current PNR: *${s.pnr || '—'}*\nType the *correct booking reference* (6 characters, letters + digits) 👇, or *skip*.`, `🎫 PNR actuel : *${s.pnr || '—'}*\nTapez le *bon numéro de réservation* (6 caractères, lettres + chiffres) 👇, ou *passer*.`), cfg); }
    return goCorrection(phone, s, cfg);
  }
  if (s.step === 'fix_nom_which') {
    const i = parseInt((input.match(/\d+/) || [])[0]);
    if (i >= 1 && i <= s.pax) { s.fix_name_idx = i - 1; s.step = 'fix_nom'; await setState(phone, s); return send(phone, L(s, `👤 *Passenger ${i}* (current: ${(s.names && s.names[i - 1]) || '—'})\nType the *correct full name* 👇`, `👤 *Passager ${i}* (actuel : ${(s.names && s.names[i - 1]) || '—'})\nTapez le *bon nom complet* 👇`), cfg); }
    return send(phone, L(s, `Enter a number between 1 and ${s.pax}:`, `Indiquez un numéro entre 1 et ${s.pax} :`), cfg);
  }
  if (s.step === 'fix_pnr') {
    if (lower === 'passer' || lower === 'non' || lower === 'skip') { s.pnr = ''; await setState(phone, s); return afterFix(phone, s, cfg); }
    const pnr = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^[A-Z0-9]{5,8}$/.test(pnr) && /[A-Z]/.test(pnr)) { s.pnr = pnr; await setState(phone, s); return afterFix(phone, s, cfg); }
    return send(phone, L(s, `🎫 The PNR is 5 to 8 characters with *letters* (e.g. *TFSCBC*). Try again, or type *skip*.`, `🎫 Le PNR fait 5 à 8 caractères avec des *lettres* (ex : *TFSCBC*). Réessayez, ou tapez *passer*.`), cfg);
  }
  if (s.step === 'fix_vol') {
    const vol = input.toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z0-9]{3,8}$/.test(vol)) { s.vol = vol; s.compagnie = deduceAirline(vol) || s.compagnie || ''; await setState(phone, s); return afterFix(phone, s, cfg); }
    return send(phone, L(s, `Number not recognised (e.g. AF718). Send it again:`, `Numéro non reconnu (ex. AF718). Renvoyez-le :`), cfg);
  }
  if (s.step === 'fix_date') {
    const d = parseDateInput(input, '20');
    if (d) {
      if (inFuture(d)) return send(phone, FUTURE_JOKE(s.langue_code === 'en'), cfg);
      if (tooOld(d)) { return finNonEligible(phone, L(s, PRESCRIPTION_5ANS_EN, pickVariant(phone, 'PRESCRIPTION_5ANS')), cfg); }
      s.date = d; await setState(phone, s);
      await send(phone, L(s, `✅ Date corrected: *${d}* — *${dateEnLettres(d)}*.`, `✅ Date corrigée : *${d}* — le *${dateEnLettres(d)}*.`), cfg);
      return afterFix(phone, s, cfg);
    }
    if (/\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}/.test(input)) return send(phone, DATE_INVALIDE(input.trim(), s.langue_code === 'en'), cfg);
    return send(phone, L(s, `Date not recognised. Format DD/MM/YYYY:`, `Date non reconnue. Format JJ/MM/AAAA :`), cfg);
  }
  if (s.step === 'fix_nom') {
    if (input.length >= 3 && !/^\d+$/.test(input)) { s.names = s.names || []; s.names[s.fix_name_idx || 0] = input.toUpperCase(); s.fix_name_idx = 0; await setState(phone, s); return afterFix(phone, s, cfg); }
    return send(phone, L(s, `Name too short. Send the full name again:`, `Nom trop court. Renvoyez le nom complet :`), cfg);
  }
  if (s.step === 'fix_route') {
    if (input.length >= 3) { s.route = input.replace(/->/g, '→').trim(); await setState(phone, s); return afterFix(phone, s, cfg); }
    return send(phone, L(s, `Route too short (e.g. Paris - Dakar):`, `Trajet trop court (ex. Paris - Dakar) :`), cfg);
  }
  // Année manquante (carte sans année) → on la demande, jamais deviner
  if (s.step === 'annee') {
    const m = input.match(/\b(19\d{2}|20\d{2})\b/);
    const year = m ? m[1] : null;
    if (year) {
      const d = `${s.date.replace(/\/$/, '')}/${year}`;
      if (!isValidStoredDate(d)) { s.date = ''; s.step = 'm_date'; await setState(phone, s); return send(phone, DATE_INVALIDE(d), cfg); }
      if (inFuture(d)) { await send(phone, L(s, `😄 ${year}? That flight hasn't happened yet — we claim for a flight *already past*! Pick the correct year 👇`, `😄 ${year} ? Ce vol n'a pas encore eu lieu — on réclame pour un vol *déjà passé* ! Choisissez la bonne année 👇`), cfg); return askYear(phone, s, cfg); }
      s.date = d;
      if (tooOld(s.date)) { return finNonEligible(phone, L(s, PRESCRIPTION_5ANS_EN, pickVariant(phone, 'PRESCRIPTION_5ANS')), cfg); }
      await setState(phone, s);
      await send(phone, L(s, `✅ Flight on *${d}* — *${dateEnLettres(d)}*.`, `✅ Vol du *${d}* — le *${dateEnLettres(d)}*.`), cfg);
      return apresVol(phone, s, cfg);
    }
    return askYear(phone, s, cfg);
  }

  // Saisie manuelle vol/date (MSG10) — sert scan raté ET correction
  // Une photo en pleine saisie = le client tend son billet → on bascule sur le scan (lecture automatique).
  if (/^m_(vol|date|route|pnr)$/.test(s.step) && mediaUrl) { s.step = 'scan'; await setState(phone, s); return handleMessage(phone, text, cfg, mediaUrl, replyId, true); }
  if (s.step === 'm_vol') {
    const vol = input.toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z0-9]{3,8}$/.test(vol)) { s.vol = vol; s.compagnie = deduceAirline(vol) || s.compagnie || ''; s.step = 'm_date'; await setState(phone, s); return send(phone, L(s, `✅ Flight ${vol}${s.compagnie ? ' — ' + s.compagnie : ''}\n\n📅 Flight date? _(e.g. 15/03/2026)_`, `✅ Vol ${vol}${s.compagnie ? ' — ' + s.compagnie : ''}\n\n📅 Date du vol ? _(ex. 15/03/2026)_`), cfg); }
    return send(phone, L(s, `Number not recognised (e.g. AF718). Send it again:`, `Numéro non reconnu (ex. AF718). Renvoyez-le :`), cfg);
  }
  if (s.step === 'm_date') {
    const d = parseDateInput(input, '20');
    if (d) {
      if (inFuture(d)) return send(phone, FUTURE_JOKE(s.langue_code === 'en'), cfg);
      s.date = d;
      if (tooOld(s.date)) { return finNonEligible(phone, L(s, PRESCRIPTION_5ANS_EN, pickVariant(phone, 'PRESCRIPTION_5ANS')), cfg); }
      const ok = `✅ Vol du *${d}* — le *${dateEnLettres(d)}*.`;
      if (s.route) return gotoPnr(phone, s, cfg, ok);
      // Pas de route (ni scan ni saisie) → on tente de la RETROUVER depuis le n° de vol.
      await send(phone, ok, cfg);
      // 1. Dict statique (prioritaire — zéro latence, gère les milk-runs)
      const staticRoutes = lookupFlightRoutes(s.vol);
      if (staticRoutes && staticRoutes.length) {
        if (staticRoutes[0].airline && !s.compagnie) s.compagnie = staticRoutes[0].airline;
        s._routeSource = 'static';
        s._verdict = { verdict: 'a_verifier', covered: null, route: staticRoutes[0].route, airline: staticRoutes[0].airline };
        if (staticRoutes.length === 1) { s.route = staticRoutes[0].route; return askRouteConfirm(phone, s, cfg); }
        return askRouteChoice(phone, staticRoutes, s, cfg);
      }
      const legsInfo = await resolveLegs(s.vol, s.date);
      if (legsInfo && legsInfo.airline && !s.compagnie) s.compagnie = legsInfo.airline;
      const stops = (legsInfo && legsInfo.stops) || [];
      // Vol MULTI-ESCALES (ex. BRU→ACC→LFW) → boutons de choix de tronçon (max 3).
      if (stops.length >= 3) {
        const segs = [];
        for (let i = 0; i < stops.length - 1; i++) segs.push({ dep: stops[i].code, arr: stops[i + 1].code, airline: legsInfo.airline || '', route: `${stops[i].label} → ${stops[i + 1].label}` });
        if (stops.length === 3) segs.push({ dep: stops[0].code, arr: stops[2].code, airline: legsInfo.airline || '', route: `${stops[0].label} → ${stops[2].label}` }); // trajet complet
        return askRouteChoice(phone, segs.slice(0, 3), s, cfg);
      }
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
        s.route = vFallback.route.replace(/\b([A-Z]{3})\b/g, (m) => iataLabel(m)); if (vFallback.airline && !s.compagnie) s.compagnie = vFallback.airline;
        s._verdict = vFallback;
        return askRouteConfirm(phone, s, cfg);
      }
      // AeroDataBox muet (vol ancien) → dernier recours : OpenAI propose les tronçons du n° de vol.
      // 1 route → confirmation 1 tap ; 2-3 routes → boutons de choix.
      const llmRoutes = await resolveRouteViaLLM(s.vol);
      if (llmRoutes && llmRoutes.length) {
        if (llmRoutes[0].airline && !s.compagnie) s.compagnie = llmRoutes[0].airline;
        s._routeSource = 'llm';
        if (llmRoutes.length === 1) {
          s.route = llmRoutes[0].route;
          s._verdict = { verdict: 'a_verifier', covered: null, route: llmRoutes[0].route, airline: llmRoutes[0].airline };
          return askRouteConfirm(phone, s, cfg);
        }
        return askRouteChoice(phone, llmRoutes, s, cfg);
      }
      // Vol vraiment non retrouvé → on demande le trajet en 2 questions imagées (décollage 🛫 / atterrissage 🛬).
      return askDepCity(phone, s, cfg);
    }
    if (/\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}/.test(input)) return send(phone, DATE_INVALIDE(input.trim(), s.langue_code === 'en'), cfg);
    return send(phone, L(s, `Date not recognised. Format DD/MM/YYYY (e.g. 15/03/2026):`, `Date non reconnue. Format JJ/MM/AAAA (ex. 15/03/2026) :`), cfg);
  }
  // Choix du tronçon parmi 2-3 options (milk-run ou LLM multi-routes).
  if (s.step === 'm_route_choice') {
    const choices = s.routeChoices || [];
    let picked = null;
    for (let i = 0; i < choices.length; i++) {
      if (id === `rc_${i}` || input.trim() === String(i + 1)) { picked = choices[i]; break; }
    }
    if (!picked) {
      const buttons = choices.map((r, i) => ({ id: `rc_${i}`, text: r.route.slice(0, 20) }));
      return sendButtons(phone, { body: L(s, `✈️ Tap your route for *${s.vol}*:`, `✈️ Touchez votre trajet pour *${s.vol}* :`), buttons }, cfg);
    }
    s.route = picked.route;
    if (picked.airline && !s.compagnie) s.compagnie = picked.airline;
    s._verdict = { verdict: 'a_verifier', covered: null, route: picked.route, airline: picked.airline || '' };
    delete s.routeChoices;
    await setState(phone, s);
    return gotoPnr(phone, s, cfg, `✅ Trajet : *${s.route}*`);
  }
  // Confirmation du trajet retrouvé automatiquement (AeroDataBox) — 1 tap, ou correction manuelle.
  if (s.step === 'm_route_confirm') {
    const n = normInput(input, ['oui', 'corriger']);
    if (id === 'route_ok' || n === '1' || lower.startsWith('oui') || lower.includes('correct') || lower.includes('exact') || lower === 'ok' || lower === 'c\'est ça' || lower === 'cest ca') {
      return gotoPnr(phone, s, cfg);
    }
    if (id === 'route_fix' || n === '2' || lower.includes('corrig') || lower.startsWith('non') || lower.includes('faux')) {
      s.route = ''; await setState(phone, s);
      return askDepCity(phone, s, cfg, L(s, `🗺️ No worries, we'll do it together.`, `🗺️ Pas de souci, on le fait ensemble.`));
    }
    if (await stuckHelp(phone, s, cfg)) return;
    return sendButtons(phone, { body: L(s, `✈️ Was your route *${s.route}*?`, `✈️ Votre trajet était *${s.route}* ?`), buttons: [{ id: 'route_ok', text: L(s, '✅ Yes', '✅ Oui') }, { id: 'route_fix', text: L(s, '✏️ Edit', '✏️ Corriger') }] }, cfg);
  }
  // Step legacy 'm_route' (sessions anciennes / relance) : « Dakar → Paris » d'un coup → route, sinon on guide ville par ville.
  if (s.step === 'm_route') {
    const pair = parseRoutePair(input);
    if (pair) { s.route = `${pair[0]} → ${pair[1]}`; await setState(phone, s); return gotoPnr(phone, s, cfg, L(s, `✅ Route: *${s.route}*`, `✅ Trajet : *${s.route}*`)); }
    if (await stuckHelp(phone, s, cfg)) return;
    return askDepCity(phone, s, cfg, L(s, `🗺️ Let's do it together.`, `🗺️ On le fait ensemble.`));
  }
  // Trajet direct en 2 questions claires : d'où l'avion DÉCOLLE 🛫, puis où il ATTERRIT 🛬.
  if (s.step === 'm_dep') {
    const pair = parseRoutePair(input); // tolère un client qui tape « Dakar → Paris » d'un coup
    if (!id && pair) { s.route = `${pair[0]} → ${pair[1]}`; await setState(phone, s); return gotoPnr(phone, s, cfg, `✅ Trajet : *${s.route}*`); }
    const pk = cityPick(input, id, VILLES_COURANTES);
    if (pk && pk.autre) return send(phone, L(s, `✏️ Type the city your plane *takes off from* _(e.g. Cotonou, or the code DSS)_:`, `✏️ Tapez la ville d'où votre avion *décolle* _(ex : Cotonou, ou le code DSS)_ :`), cfg);
    if (!pk) return askDepCity(phone, s, cfg);
    s.depCity = pk.city; await setState(phone, s);
    await send(phone, L(s, `✅ Takeoff: *${pk.city}* 🛫`, `✅ Décollage : *${pk.city}* 🛫`), cfg);
    return askArrCity(phone, s, cfg);
  }
  if (s.step === 'm_arr') {
    const pk = cityPick(input, id, VILLES_COURANTES);
    if (pk && pk.autre) return send(phone, L(s, `✏️ Type the city your plane *lands in* _(e.g. Toulouse, or the code CDG)_:`, `✏️ Tapez la ville où votre avion *atterrit* _(ex : Toulouse, ou le code CDG)_ :`), cfg);
    if (!pk) return askArrCity(phone, s, cfg);
    if (s.depCity && pk.city.toLowerCase() === s.depCity.toLowerCase()) {
      return send(phone, L(s, `🤔 The arrival (*${pk.city}*) is the same as departure — for a *round trip*, describe the flight that had the problem.\n🛬 In which city does your plane *land*?`, `🤔 L'arrivée (*${pk.city}*) est identique au départ — pour un *aller-retour*, décrivez le vol qui a eu le problème.\n🛬 Dans quelle ville votre avion *atterrit*-il ?`), cfg);
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
    return send(phone, L(s, `🎫 The PNR is 5 to 8 characters (letters/digits), e.g. *TFSCBC*. Try again, or type *skip*.`, `🎫 Le PNR fait 5 à 8 caractères (lettres/chiffres), ex : *TFSCBC*. Réessayez, ou tapez *passer*.`), cfg);
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
    if (n === '2' || lower.includes('corrig')) { s.step = 'names_fix_which'; await setState(phone, s); return send(phone, L(s, `✏️ Which passenger to fix? Enter their *number* (1 to ${s.pax}).`, `✏️ Quel passager corriger ? Indiquez son *numéro* (1 à ${s.pax}).`), cfg); }
    if (await stuckHelp(phone, s, cfg)) return;
    return showNamesConfirm(phone, s, cfg);
  }
  if (s.step === 'names_fix_which') {
    const i = parseInt((input.match(/\d+/) || [])[0]);
    if (i >= 1 && i <= s.pax) { s.fix_name_idx = i - 1; s.step = 'names_fix_one'; await setState(phone, s); return send(phone, L(s, `👤 *Passenger ${i}* (current: ${s.names[i - 1] || '—'})\n\nJust type the *correct full name* 👇\n_(e.g. Aminata Diallo)_`, `👤 *Passager ${i}* (actuel : ${s.names[i - 1] || '—'})\n\nTapez simplement le *bon nom complet* 👇\n_(ex : Aminata Diallo)_`), cfg); }
    return send(phone, L(s, `Enter a number between 1 and ${s.pax}:`, `Indiquez un numéro entre 1 et ${s.pax} :`), cfg);
  }
  if (s.step === 'names_fix_one') {
    if (input.length >= 3 && !/^\d+$/.test(input)) { s.names[s.fix_name_idx] = input.toUpperCase(); await setState(phone, s); return showNamesConfirm(phone, s, cfg); }
    return send(phone, L(s, `Name too short. Send the full name again:`, `Nom trop court. Renvoyez le nom complet :`), cfg);
  }

  // MSG11 — MINEURS
  if (s.step === 'mineurs') {
    const n = normInput(input, ['majeur', 'mineur', 'tous majeurs', 'des mineurs']);
    if (s.pax === 1) {
      if (n === '1' || lower.includes('majeur') || lower.includes('adult')) { s.mineurs = []; await setState(phone, s); return sendRecap(phone, s, cfg); }
      if (n === '2' || lower.includes('mineur') || lower.includes('minor')) { s.minorsPresent = true; s.minorSelf = true; await setState(phone, s); await send(phone, L(s, `👶 Noted. A minor's compensation is still due — the *claim-assignment contract is signed by their parent or legal guardian* (we guide you at the final step, nothing to pay upfront). Let's continue 👇`, `👶 Bien noté. L'indemnité d'un mineur est bien due — le *contrat de cession est signé par son parent ou tuteur légal* (on vous guide à l'étape finale, rien à avancer). On continue 👇`), cfg); return sendRecap(phone, s, cfg); }
      return sendButtons(phone, { body: L(s, `${bar('mineurs')}\n👤 Are you an adult (18+)?`, `${bar('mineurs')}\n👤 Êtes-vous majeur(e) (18+) ?`), buttons: [{ text: L(s, '✅ Yes, adult', '✅ Oui, majeur(e)') }, { text: L(s, '👶 No, a minor', '👶 Non, mineur(e)') }] }, cfg);
    }
    if (n === '1' || lower.includes('tous majeurs') || lower.includes('all adults')) { s.minorsPresent = false; await setState(phone, s); return sendRecap(phone, s, cfg); }
    if (n === '2' || lower.includes('mineur') || lower.includes('minor')) { s.minorsPresent = true; await setState(phone, s); return send(phone, L(s, `👶 Noted — there are minors. A parent/guardian's signature will be required for them (we handle it with you via the passports). Let's continue 👇`, `👶 Bien noté — il y a des mineurs. La signature d'un parent/tuteur sera requise pour eux (on s'en occupe avec vous via les passeports). On continue 👇`), cfg).then(() => sendRecap(phone, s, cfg)); }
    return sendMineurs(phone, s, cfg);
  }

  // MSG12 — RÉCAP
  if (s.step === 'recap') {
    const n = normInput(input, ['correct', 'modifier']);
    if (id === 'recap_ok' || n === '1' || lower.includes('correct')) { s.step = 'documents'; s.doc_idx = 0; await setState(phone, s); return startDocuments(phone, s, cfg); }
    if (id === 'recap_fix' || n === '2' || lower.includes('modifier') || lower.includes('edit')) { s.fix_return = 'recap'; await setState(phone, s); return goCorrection(phone, s, cfg); }
    return sendRecap(phone, s, cfg);
  }

  // MSG13 — DOCUMENTS (passeports 1..n → carte → e-billet → certificat)
  if (s.step === 'doc_pass') {
    s.passengers = s.passengers || [];
    if (mediaUrl) { return askOcrConfirm(phone, s, cfg, mediaUrl); }
    if (id === 'doc_photo' || lower.includes('envoyer ma photo') || lower.includes('ma photo')) {
      return send(phone, L(s, `👍 Got it — tap 📎 (or 📷) below and choose the *photo* of the ID — *passport, national ID or residence permit*. We read the name and date automatically. 🔒`, `👍 C'est noté — appuyez sur 📎 (ou 📷) en bas et choisissez la *photo* de la pièce — *passeport, CNI ou carte de séjour*. On lit le nom et la date automatiquement. 🔒`), cfg);
    }
    if (id === 'doc_passer' || lower.includes('envoie après') || lower.includes('passer')) {
      const _nm = (s.passengers[s.doc_idx] && s.passengers[s.doc_idx].name) || (s.names && s.names[s.doc_idx]) || '';
      s.passengers[s.doc_idx] = { ...(s.passengers[s.doc_idx] || {}), skipped: true }; s.docs_pending = true; s.doc_idx++; await setState(phone, s); // garde nom/DDN/bébé déjà lus (avant : { skipped:true } écrasait tout)
      await send(phone, L(s, `👍 Got it${_nm ? `, we keep *${_nm}*'s spot` : ''}. ℹ️ But their ID (passport, national ID or residence permit) remains *essential* for the claim — send it as soon as you can. 🔒`, `👍 C'est noté${_nm ? `, on garde la place de *${_nm}*` : ''}. ℹ️ Mais sa pièce (passeport, CNI ou carte de séjour) reste *indispensable* pour la réclamation — envoyez-la dès que vous pouvez. 🔒`), cfg);
      return nextPassport(phone, s, cfg);
    }
    if (id === 'doc_saisir' || lower.includes('saisir') || lower.includes('manuel') || lower.includes('tape') || lower.includes('type')) { s.step = 'doc_name'; await setState(phone, s); return send(phone, L(s, `👤 *Passenger ${s.doc_idx + 1}* — First and last name?\n_(e.g. Aminata Diallo)_\nℹ️ We note the name, but a *photo* of their ID (passport, national ID or residence permit) will still be needed for the claim. 🔒`, `👤 *Passager ${s.doc_idx + 1}* — Prénom et nom ?\n_(ex : Aminata Diallo)_\nℹ️ On note le nom, mais la *photo* de sa pièce (passeport, CNI ou carte de séjour) restera nécessaire pour la réclamation. 🔒`), cfg); }
    {
      const nameKnown = !!((s.passengers[s.doc_idx] && s.passengers[s.doc_idx].name) || (s.names && s.names[s.doc_idx]));
      const buttons = [
        ...(nameKnown ? [] : [{ id: 'doc_saisir', text: L(s, '✍️ Type it in', '✍️ Saisir à la main') }]),
        { id: 'doc_passer', text: L(s, '⏭️ I\'ll send it later', '⏭️ Je l\'envoie après') },
      ];
      // Message adapté selon les options : si un seul bouton (nom déjà connu), pas de "ou :" orphelin.
      const body = nameKnown
        ? L(s, `🛂 Send a *photo* of the ID (passport, national ID or residence permit). You can also send it later 👇`,
             `🛂 Envoyez une *photo* de la pièce (passeport, CNI ou carte de séjour). Vous pouvez aussi l'envoyer plus tard 👇`)
        : L(s, `🛂 Send the *photo* of the ID, or:`, `🛂 Envoyez la *photo* de la pièce, ou :`);
      return sendButtons(phone, { body, buttons }, cfg);
    }
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
      const _billet = cur.name || '';
      const _mismatch = !!(_billet && e.name && nameDiffers(_billet, e.name));
      s.passengers[idx] = { ...cur, ...e, name: cur.name || e.name, nameId: e.name || cur.nameId || '', nameMismatch: _mismatch, idReceived: true }; // garde le nom de l'e-billet, ajoute DDN/pièce + nom passeport à part
      if (_mismatch) { try { notifyOwnerWhatsApp(phone, `⚠️ Écart de nom${s.ref ? ' [' + s.ref + ']' : ''} : billet « ${_billet} » / passeport « ${e.name} » — à vérifier (poste pièces).`).catch(() => {}); } catch (_) {} }
      // Attribution incertaine sur un dossier MULTI-passagers → rattachée par défaut au passager courant.
      // On prévient l'owner pour vérification manuelle (cas demandé par Climbie).
      if (s.pax > 1 && !(a.confident && a.idx >= 0)) {
        notifyOwnerWhatsApp(phone, `⚠️ Dossier ${s.ref || phone} : pièce d'identité lue « ${e.name || '?'} » attribuée PAR DÉFAUT au passager ${idx + 1}/${s.pax} (rapprochement par nom non certain). À vérifier/réattribuer à la main.`).catch(() => {});
      }
      delete s.doc_pending; await setState(phone, s);
      if (e.docType === 'cni' && !e.cniVerso) {
        s.cni_verso_for = idx; await setState(phone, s);
        return send(phone, L(s, `📸 One more thing: it's a *national ID card* — please also send a photo of the *back* (the other side).`, `📸 Petit détail : c'est une *carte d'identité* — envoyez aussi une photo du *verso* (l'autre face), s'il vous plaît.`), cfg);
      }
      return nextPassport(phone, s, cfg); // avance vers le prochain passager sans pièce (garde-fou dans nextPassport)
    }
    if (fix) {
      delete s.doc_pending; s.step = 'doc_pass'; await setState(phone, s);
      return sendButtons(phone, [{ id: 'doc_photo', text: L(s, '📸 New photo', '📸 Nouvelle photo') }, { id: 'doc_saisir', text: L(s, '✏️ Type manually', '✏️ Saisir manuellement') }], cfg);
    }
    if (id === 'doc_photo' || lower.includes('photo') || lower.includes('renvo') || lower.includes('nouv')) {
      s.step = 'doc_pass'; await setState(phone, s);
      return send(phone, L(s, `📸 Send the photo of passenger ${s.doc_idx + 1}'s ID.`, `📸 Envoyez la photo de la pièce d'identité du passager ${s.doc_idx + 1}.`), cfg);
    }
    if (id === 'doc_saisir' || lower.includes('saisir') || lower.includes('manuel')) {
      delete s.doc_pending; s.step = 'doc_name'; await setState(phone, s);
      return send(phone, L(s, `👤 *Passenger ${s.doc_idx + 1}* — First and last name?\n_(e.g. Aminata Diallo)_`, `👤 *Passager ${s.doc_idx + 1}* — Prénom et nom ?\n_(ex : Aminata Diallo)_`), cfg);
    }
    return sendButtons(phone, [{ id: 'pass_ok', text: L(s, '✅ Correct', '✅ C\'est correct') }, { id: 'pass_fix', text: L(s, '✏️ Edit', '✏️ Corriger') }], cfg);
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
      await send(phone, L(s, `✅ Got it — *${chosen.name || `Passenger ${idx + 1}`}* is following the case.`, `✅ C'est noté — c'est *${chosen.name || `Passager ${idx + 1}`}* qui suit le dossier.`), cfg);
      return askAddressOrFinalize(phone, s, cfg);
    }
    return askMandant(phone, s, cfg);
  }
  // Adresse du contact (dernière question) — saisie manuelle si non lue sur le passeport.
  if (s.step === 'doc_adresse') {
    const adr = input.trim();
    if (adr.length >= 5 && /[a-zà-ÿ]/i.test(adr) && !/^\d+$/.test(adr)) {
      s.passengers = s.passengers || []; const i = s.mandant_idx || 0;
      const m = s.passengers[i] || {}; m.adresse = adr; s.passengers[i] = m; await setState(phone, s);
      return finaliser(phone, s, cfg);
    }
    return send(phone, L(s, `📍 A bit more, please — at least your *city and country* _(e.g. Médina, Dakar, Senegal)_:`, `📍 Un peu plus, svp — au moins votre *ville et pays* _(ex : Médina, Dakar, Sénégal)_ :`), cfg);
  }
  if (s.step === 'doc_name') {
    if (mediaUrl) return askOcrConfirm(phone, s, cfg, mediaUrl); // il envoie finalement la pièce → on la lit
    if (input.length >= 3 && !/^\d+$/.test(input) && !/^\[/.test(input)) { s.passengers = s.passengers || []; s.passengers[s.doc_idx] = { name: input.toUpperCase() }; s.step = 'doc_dob'; await setState(phone, s); return send(phone, L(s, `📅 *Date of birth* of ${input}? _(DD/MM/YYYY)_`, `📅 *Date de naissance* de ${input} ? _(JJ/MM/AAAA)_`), cfg); }
    return send(phone, L(s, `Name too short. Send first and last name again:`, `Nom trop court. Renvoyez prénom et nom :`), cfg);
  }
  if (s.step === 'doc_dob') {
    if (mediaUrl) return askOcrConfirm(phone, s, cfg, mediaUrl); // pareil : la photo de la pièce vaut mieux que la saisie
    const dob = parseDateInput(input, '19');
    if (dob) {
      if (inFuture(dob)) return send(phone, L(s, `🤔 That date of birth is in the future. Send it again in DD/MM/YYYY format _(e.g. 05/09/2012)_:`, `🤔 Cette date de naissance est dans le futur. Renvoyez-la au format JJ/MM/AAAA _(ex. 05/09/2012)_ :`), cfg);
      const minor = isMinorAt(dob, s.date);
      const p = s.passengers[s.doc_idx] || {}; p.dob = dob; p.minor = minor; p.idDeferred = true; s.passengers[s.doc_idx] = p; // nom+DDN notés, mais la PHOTO de la pièce reste à envoyer
      const _ne = p.sexe === 'F' ? 'née' : p.sexe === 'M' ? 'né' : 'né·e';        // accord si le sexe est connu (lu sur la pièce), sinon inclusif
      const _min = p.sexe === 'F' ? 'mineure' : p.sexe === 'M' ? 'mineur' : 'mineur·e';
      await send(phone, L(s, `✅ ${p.name || ('Passenger ' + (s.doc_idx + 1))} — born *${dob}* (${dateEnLettres(dob)})${minor ? ' 👶 _(minor: parental signature required)_' : ''}\n📸 _Their ID (passport or national ID) is still to be sent — essential to claim from the airline._`, `✅ ${p.name || ('Passager ' + (s.doc_idx + 1))} — ${_ne} le *${dob}* (${dateEnLettres(dob)})${minor ? ` 👶 _(${_min} : signature parentale requise)_` : ''}\n📸 _Sa pièce d'identité (passeport ou carte d'identité) reste à envoyer — indispensable pour réclamer auprès de la compagnie._`), cfg);
      s.doc_idx++; await setState(phone, s); return nextPassport(phone, s, cfg);
    }
    if (/\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}/.test(input)) return send(phone, DATE_INVALIDE(input.trim(), s.langue_code === 'en'), cfg);
    return send(phone, L(s, `Date not recognised. Format DD/MM/YYYY (e.g. 05/09/2012):`, `Date non reconnue. Format JJ/MM/AAAA (ex. 05/09/2012) :`), cfg);
  }
  if (s.step === 'doc_boarding') {
    if (mediaUrl) { await send(phone, L(s, `✅ Boarding pass received!`, `✅ Carte d'embarquement reçue !`), cfg); return gotoEticket(phone, s, cfg); }
    if (lower === 'passer' || lower === 'skip') { s.docs_pending = true; return gotoEticket(phone, s, cfg); }
    if (lower === 'appel' || lower === 'call') { s.escalade = 'document_perdu'; upsertLead(phone, { wantsCall: true, wantsCallAt: Date.now() }); notifyCallbackWanted(phone, s, 'documents perdus (carte d\'embarquement)'); await send(phone, L(s, `📞 Don't worry — an expert helps you find your documents. Keep the conversation open.\n\n${STOP_FOOTER}`, `📞 Pas de panique — un expert vous aide à retrouver vos documents. Laissez la conversation ouverte.\n\n${STOP_FOOTER}`), cfg); return gotoEticket(phone, s, cfg); }
    return send(phone, L(s, `🎫 Send the boarding pass, or *skip*, or *call* if you've lost everything.`, `🎫 Envoyez la carte d'embarquement, ou *passer*, ou *appel* si vous avez tout perdu.`), cfg);
  }
  if (s.step === 'doc_eticket') {
    if (mediaUrl) {
      const e = await extractEticket(mediaUrl, cfg); if (e) applyEticket(s, e);
      s.travelProof = s.travelProof || 'ebooking'; await setState(phone, s);
      const lu = (e && (e.pnr || (e.passengers && e.passengers.length))) ? ` _(${[e.vol, e.pnr && 'PNR ' + e.pnr, e.passengers && e.passengers.length && `${e.passengers.length} passager(s)`].filter(Boolean).join(' · ')})_` : '';
      await send(phone, e ? L(s, `✅ E-ticket received!${lu}`, `✅ E-billet reçu !${lu}`) : L(s, `✅ Document received — our team will check it and add it to your file. 🙏`, `✅ Document bien reçu — notre équipe le vérifiera et l'ajoute à votre dossier. 🙏`), cfg); return gotoCert(phone, s, cfg);
    }
    if (lower === 'passer' || lower === 'skip') { s.docs_pending = true; return gotoCert(phone, s, cfg); }
    if (lower === 'appel' || lower === 'call') { s.escalade = 'document_perdu'; upsertLead(phone, { wantsCall: true, wantsCallAt: Date.now() }); notifyCallbackWanted(phone, s, 'documents perdus (e-billet)'); await send(phone, L(s, `📞 An expert helps you recover your e-ticket. Keep the conversation open.\n\n${STOP_FOOTER}`, `📞 Un expert vous aide à récupérer votre e-billet. Laissez la conversation ouverte.\n\n${STOP_FOOTER}`), cfg); return gotoCert(phone, s, cfg); }
    return send(phone, L(s, `📧 Send the e-ticket (check spam/Booking), or *skip*, or *call*.`, `📧 Envoyez l'e-billet (pensez aux spams/Booking), ou *passer*, ou *appel*.`), cfg);
  }
  if (s.step === 'doc_cert') {
    if (mediaUrl) { await send(phone, L(s, `✅ Certificate received — it speeds up your case!`, `✅ Certificat reçu — ça accélère votre dossier !`), cfg); return finaliser(phone, s, cfg); }
    if (lower === 'passer' || lower === 'non' || lower === 'skip' || lower === 'no') { return finaliser(phone, s, cfg); }
    return send(phone, L(s, `📄 Send the delay certificate (optional), or type *skip*.`, `📄 Envoyez le certificat de retard (optionnel), ou tapez *passer*.`), cfg);
  }

  // FRAIS (Art. 8 & 9) — proposé après signature : on collecte les reçus, on LIT le montant + la devise,
  // on DÉDUPLIQUE (même fichier), on en redemande, on clôt proprement. Le montant est un bonus EN PLUS de l'indemnité.
  if (s.step === 'frais') {
    // Le client précise la monnaie d'un reçu dont le montant a été lu mais la devise pas détectée.
    if (!mediaUrl && s.fraisAwaitDevise != null) {
      const dv = parseDevise(text);
      if (dv) {
        const it = (s.fraisList || [])[s.fraisAwaitDevise]; if (it) it.devise = dv;
        s.fraisAwaitDevise = null; await setState(phone, s);
        notifyOwnerWhatsApp(phone, `🧾 Dossier ${s.ref || '?'} : devise précisée → ${it ? it.montant + ' ' + dv : dv}. Total frais ≈ ${fraisTotal(s)}.`).catch(() => {});
        return sendButtons(phone, { body: L(s, `✅ Noted: *${it ? it.montant : ''} ${dv}* — an amount that comes back to you *on top of* the compensation 🙌\nAnother receipt? Send the photo, otherwise:`, `✅ Noté : *${it ? it.montant : ''} ${dv}* — un montant qui vous revient *en plus* de l'indemnité 🙌\nUn autre reçu ? Envoyez la photo, sinon :`), buttons: [{ id: 'frais_fini', text: L(s, '✅ That\'s all', '✅ C\'est tout') }] }, cfg);
      }
      // monnaie non reconnue → on laisse les boutons/handlers ci-dessous gérer
    }
    if (mediaUrl) {
      const d = await classifyDoc(mediaUrl, cfg);
      // Une PIÈCE D'IDENTITÉ ou une PREUVE DE VOYAGE envoyée pendant l'étape frais n'est PAS un reçu :
      // on la rattache correctement (avant : la CNI était comptée en « frais » et jamais marquée reçue → relance pièces fantôme).
      if (d && (d.kind === 'identite' || d.kind === 'voyage')) {
        s.passengers = s.passengers || [];
        let _ackD;
        if (d.kind === 'identite') {
          const a = attributeId(s, d.nom);
          if (a.idx >= 0) {
            const p = s.passengers[a.idx] || {}; p.idReceived = true; if (!p.name && d.nom) p.name = d.nom; s.passengers[a.idx] = p;
            _ackD = a.confident ? L(s, `✅ ID of *${paxName(s, a.idx)}* received. 🙏`, `✅ Pièce d'identité de *${paxName(s, a.idx)}* bien reçue. 🙏`) : L(s, `✅ ID received, thank you. 🙏`, `✅ Pièce d'identité bien reçue, merci. 🙏`);
            if (!a.confident) notifyOwnerWhatsApp(phone, `⚠️ Dossier ${s.ref || phone} : pièce d'identité (lue « ${d.nom || '?'} ») reçue à l'étape frais — à rattacher/vérifier à la main.`).catch(() => {});
          } else { _ackD = L(s, `✅ ID received. 🙏`, `✅ Pièce d'identité bien reçue. 🙏`); }
        } else {
          s.travelProof = d.voyageType === 'ebooking' ? 'ebooking' : (s.travelProof === 'ebooking' ? 'ebooking' : (d.voyageType || 'voyage'));
          if (d.voyageType === 'carte') addCarteName(s, d.nom);
          _ackD = d.voyageType === 'ebooking' ? L(s, `✅ Booking confirmation received — it covers the whole trip. 👍`, `✅ Confirmation de réservation reçue — elle couvre tout le voyage. 👍`) : L(s, `✅ Boarding pass received. 👍`, `✅ Carte d'embarquement reçue. 👍`);
        }
        await setState(phone, s);
        return sendButtons(phone, { body: `${_ackD}\n\n${L(s, 'An expense receipt (hotel, taxi, meals…)? Send the photo, otherwise:', 'Un reçu de frais (hôtel, taxi, repas…) ? Envoyez la photo, sinon :')}`, buttons: [{ id: 'frais_fini', text: L(s, '✅ That\'s all', '✅ C\'est tout') }] }, cfg);
      }
      s.fraisHashes = s.fraisHashes || [];
      // Anti-doublon : même reçu (fichier identique) déjà reçu → on ne le compte pas 2×.
      if (d && d.hash && s.fraisHashes.includes(d.hash)) {
        await setState(phone, s);
        return sendButtons(phone, { body: L(s, `🔁 This receipt is *already in your file* — no need to resend it. *Another* receipt? Otherwise:`, `🔁 Ce reçu est *déjà dans votre dossier* — pas besoin de le renvoyer. Un *autre* reçu ? Sinon :`), buttons: [{ id: 'frais_fini', text: L(s, '✅ That\'s all', '✅ C\'est tout') }] }, cfg);
      }
      if (d && d.hash) s.fraisHashes.push(d.hash);
      s.fraisCount = (s.fraisCount || 0) + 1;
      markFraisAnswered(phone); // le client a répondu → plus de relance frais
      const montant = d && d.montant ? d.montant : null;
      const devise = d && d.devise ? d.devise : '';
      s.fraisList = s.fraisList || [];
      s.fraisList.push({ montant, devise, categorie: (d && d.categorie) || '', hash: (d && d.hash) || null, at: Date.now() });
      // Montant lu mais devise inconnue → on demande la monnaie (1 fois), sinon on enregistre tel quel.
      if (montant && !devise) {
        s.fraisAwaitDevise = s.fraisList.length - 1; await setState(phone, s);
        notifyOwnerWhatsApp(phone, `🧾 Dossier ${s.ref || '?'} : reçu frais #${s.fraisCount}, montant ${montant} (devise à préciser).`).catch(() => {});
        return send(phone, L(s, `✅ Receipt saved — I read *${montant}*. In which *currency*? (e.g. *€*, *FCFA*, *dirham*, *dalasi*)`, `✅ Reçu enregistré — j'ai lu *${montant}*. Dans quelle *monnaie* ? (ex. *€*, *FCFA*, *dirham*, *dalasi*)`), cfg);
      }
      await setState(phone, s);
      const lu = montant ? ` — *${montant}${devise ? ' ' + devise : ''}*` : '';
      notifyOwnerWhatsApp(phone, `🧾 Dossier ${s.ref || '?'} : reçu frais #${s.fraisCount}${lu}. Total ≈ ${fraisTotal(s)} (Art. 8/9).`).catch(() => {});
      return sendButtons(phone, { body: L(s, `✅ Got it${lu} — added to your file 🙏 It's an amount that *comes back to you on top of* the compensation.\nAnother receipt (taxi, meal, hotel…)? Send the photo, otherwise:`, `✅ Bien reçu${lu} — ajouté à votre dossier 🙏 C'est un montant qui *vous revient en plus* de l'indemnité.\nUn autre reçu (taxi, repas, hôtel…) ? Envoyez la photo, sinon :`), buttons: [{ id: 'frais_fini', text: L(s, '✅ That\'s all', '✅ C\'est tout') }] }, cfg);
    }
    if (id === 'frais_non' || lower.includes('pas de frais') || lower.includes('aucun frais') || lower === 'non') {
      markFraisAnswered(phone); s.step = 'done'; await setState(phone, s);
      return send(phone, L(s, `Got it ✅ We proceed with your compensation. If a receipt turns up later, send it and we'll add it. 🤝`, `C'est noté ✅ On part avec votre indemnité. Si un reçu refait surface plus tard, envoyez-le, on l'ajoute. 🤝`), cfg);
    }
    if (id === 'frais_fini' || lower.includes("c'est tout") || lower.includes('cest tout') || lower.includes('termin') || lower.includes('fini')) {
      markFraisAnswered(phone); s.step = 'done'; await setState(phone, s);
      const tot = fraisTotal(s);
      const recap = fraisRecap(s);
      if (recap) notifyOwnerWhatsApp(phone, `🧾 *Frais à joindre — Dossier ${s.ref || '?'}* (Art. 8/9, à détailler dans la réclamation)\n${recap}`).catch(() => {});
      return send(phone, L(s, `Got it ✅ We attach your receipts to your claim${tot !== '—' ? ` (≈ ${tot} in expenses, on top of the compensation)` : ''}. Thank you! 🤝`, `C'est noté ✅ On joint vos reçus à votre réclamation${tot !== '—' ? ` (≈ ${tot} de frais, en plus de l'indemnité)` : ''}. Merci ! 🤝`), cfg);
    }
    if (id === 'frais_oui' || lower.includes('envoi') || lower.includes('reçu') || lower.includes('recu') || lower.startsWith('oui')) {
      return send(phone, L(s, `👍 Send a *photo* of each receipt (hotel, meals, taxi…). These amounts come back to you *on top of* the compensation. Even blurry, even several — just send what you actually paid.`, `👍 Envoyez une *photo* de chaque reçu (hôtel, repas, taxi…). Ces montants vous reviennent *en plus* de l'indemnité. Même flou, même plusieurs — envoyez juste ce que vous avez vraiment payé.`), cfg);
    }
    return sendButtons(phone, { body: L(s, `💶 Any expenses because of this flight (hotel, meals, taxi…)? They're reimbursed *on top of* the compensation — send a *photo* of the receipt, or:`, `💶 Des frais à cause de ce vol (hôtel, repas, taxi…) ? Ils vous sont remboursés *en plus* de l'indemnité — envoyez une *photo* du reçu, ou :`), buttons: [{ id: 'frais_non', text: L(s, '❌ No expenses', '❌ Pas de frais') }] }, cfg);
  }

  if (s.step === 'done') {
    if (!s.ref || !s.mandat_url) { await clearState(phone); return sendAccueil(phone, cfg); } // état périmé → on repart proprement
    // Le client envoie un justificatif après coup → l'IA le classe, le rattache au passager, et on dit ce qui manque
    if (mediaUrl) {
      s.passengers = s.passengers || [];
      const d = await classifyDoc(mediaUrl, cfg);
      // Auto-lecture indisponible (clé OpenAI absente ou API en panne) → ne PAS faire semblant d'avoir classé/lu.
      // On reste honnête avec le client (vérif manuelle) et on alerte l'équipe (1 fois) si la clé manque.
      if (d._unavailable) {
        if (d._reason === 'no_key') warnOpenAIClassifyOff();
        await setState(phone, s);
        return send(phone, L(s, `✅ Well received, thank you 🙏 — an advisor checks this document and adds it to your file.\n\n${missingDocsText(s)}`, `✅ Bien reçu, merci 🙏 — un conseiller vérifie ce document et l'ajoute à votre dossier.\n\n${missingDocsText(s)}`), cfg);
      }
      // Contrôle qualité AVANT tout : une pièce illisible peut être refusée par la compagnie → on redemande
      if (d.lisible === false && d.kind !== 'autre') {
        const pb = { flou: 'un peu floue', sombre: 'trop sombre', 'coupé': 'coupée', reflet: 'avec un reflet' }[d.probleme] || 'difficile à lire';
        const pbEn = { flou: 'a bit blurry', sombre: 'too dark', 'coupé': 'cropped', reflet: 'has glare' }[d.probleme] || 'hard to read';
        return send(phone, L(s, `😕 The photo is ${pbEn} and the airline may reject it. Please resend it flat, in good light, with all 4 corners visible. 📸`, fillTpl(pickRV(s.ref || '', 'PHOTO_QUALITE'), { NOM: firstNameOf(s), PB: pb, REF: s.ref || '' }) || `😕 La photo est ${pb} et risque d'être refusée par la compagnie. Renvoyez-la à plat, en pleine lumière, les 4 coins visibles. 📸`), cfg);
      }
      let ack;
      if (d.kind === 'identite') {
        const a = attributeId(s, d.nom);
        if (a.idx >= 0) {
          const p = s.passengers[a.idx] || {}; p.idReceived = true; if (!p.name && d.nom) p.name = d.nom; s.passengers[a.idx] = p;
          if (a.confident) { ack = L(s, `✅ ID of *${paxName(s, a.idx)}* received. 🙏`, fillTpl(pickRV(s.ref || '', 'DOC_RECU_PIECE'), { NOM: paxName(s, a.idx) }) || `✅ Pièce d'identité de *${paxName(s, a.idx)}* bien reçue. 🙏`); }
          else { // doute → on ne nomme pas le client, et on alerte l'expert pour vérification manuelle
            ack = L(s, `✅ ID received, thank you. 🙏`, `✅ Pièce d'identité bien reçue, merci. 🙏`);
            notifyOwnerWhatsApp(phone, `⚠️ Dossier ${s.ref} : pièce d'identité reçue (lue « ${d.nom || '?'} ») à rattacher/vérifier manuellement — ${s.pax} passagers.`).catch(() => {});
          }
        } else {
          // Aucun passager rapproché → un conseiller rattache. On NE colle PAS la liste « il manque » (contradictoire avec « bien reçue »).
          notifyOwnerWhatsApp(phone, `⚠️ Dossier ${s.ref || phone} : pièce d'identité (lue « ${d.nom || '?'} ») non rapprochée d'un passager — à rattacher à la main.`).catch(() => {});
          await setState(phone, s);
          return send(phone, L(s, `✅ ID received, thank you 🙏 — an advisor attaches it to the right passenger.`, `✅ Pièce d'identité bien reçue, merci 🙏 — un conseiller la rattache au bon passager.`), cfg);
        }
      } else if (d.kind === 'voyage') {
        // E-billet → couvre tout le groupe. Carte → preuve d'1 passager (suivi par nom).
        s.travelProof = d.voyageType === 'ebooking' ? 'ebooking' : (s.travelProof === 'ebooking' ? 'ebooking' : (d.voyageType || 'voyage'));
        if (d.voyageType === 'carte') addCarteName(s, d.nom);
        ack = d.voyageType === 'ebooking' ? L(s, `✅ Booking confirmation received — it covers *the whole trip and all passengers*. 👍`, `✅ Confirmation de réservation reçue — elle couvre *tout le voyage et tous les passagers*. 👍`) : L(s, `✅ Boarding pass received${d.nom ? ` (${titleCaseName(d.nom.split(/\s+/)[0])})` : ''}. 👍`, `✅ Carte d'embarquement reçue${d.nom ? ` (${titleCaseName(d.nom.split(/\s+/)[0])})` : ''}. 👍`);
      } else if (d.kind === 'frais') {
        // Reçu de dépense (hôtel/taxi/repas…) envoyé hors de l'étape frais → on le CHIFFRE aussi (Art. 8/9 CE261).
        s.fraisHashes = s.fraisHashes || [];
        if (d.hash && s.fraisHashes.includes(d.hash)) {
          ack = L(s, `🔁 This receipt is *already in your file* — no need to resend it. 👍`, `🔁 Ce reçu est *déjà dans votre dossier* — pas besoin de le renvoyer. 👍`);
        } else {
          if (d.hash) s.fraisHashes.push(d.hash);
          s.fraisCount = (s.fraisCount || 0) + 1;
          s.fraisList = s.fraisList || [];
          s.fraisList.push({ montant: d.montant || null, devise: d.devise || '', categorie: d.categorie || '', hash: d.hash || null, at: Date.now() });
          const lu = d.montant ? ` — *${d.montant}${d.devise ? ' ' + d.devise : ''}*` : '';
          ack = L(s, `🧾 Expense receipt received${lu} — we attach it to your claim (hotel, taxi, meals… reimbursable, art. 8 & 9). 👍`, `🧾 Reçu de frais bien reçu${lu} — on le joint à votre réclamation (hôtel, taxi, repas… remboursables, art. 8 & 9). 👍`);
          notifyOwnerWhatsApp(phone, `🧾 Dossier ${s.ref || '?'} : reçu de frais (#${s.fraisCount})${lu}. Total ≈ ${fraisTotal(s)} (Art. 8/9).`).catch(() => {});
        }
      } else { ack = L(s, `✅ Document received, thank you. 🙏 Our team adds it to your file.`, `✅ Document bien reçu, merci. 🙏 Notre équipe l'ajoute à votre dossier.`); }
      await setState(phone, s);
      return send(phone, `${ack}\n\n${missingDocsText(s)}`, cfg);
    }
    const _st = docsStatus(s);
    const _url = `https://robindesairs.eu/depot-en-ligne.html?r=${encodeURIComponent(s.ref)}`;
    // Dossier complet : la para DOC_COMPLET nomme déjà la réf (on ne la répète pas). Sinon, on confirme l'enregistrement.
    const _lead = _st.complete ? '' : L(s, `✅ *File ${s.ref} saved.*\n\n`, `✅ *Dossier ${s.ref} bien enregistré.*\n\n`);
    const _pieces = _st.complete
      ? L(s, `📎 *One more supporting document?* (expense receipt, hotel, taxi…)\nSend it here, or via your secure link 👉\n${_url}`, `📎 *Un justificatif en plus ?* (reçu de frais, hôtel, taxi…)\nEnvoyez-le ici, ou sur votre lien sécurisé 👉\n${_url}`)
      : L(s, `📎 *Send your documents* here, or via your secure link 👉\n${_url}`, `📎 *Envoyez vos pièces* ici, ou sur votre lien sécurisé 👉\n${_url}`);
    return send(phone,
      `${_lead}${missingDocsText(s)}\n\n` +
      `━━━━━━━━━━\n` +
      `${_pieces}\n\n` +
      L(s, `📞 *An expert will call you* at *+33 7 56 86 36 30*\n_Save this number as "Robin des Airs" to recognise the call._\n\n`, `📞 *Un expert vous rappelle* au *+33 7 56 86 36 30*\n_Enregistrez ce numéro sous « Robin des Airs » pour reconnaître l'appel._\n\n`) +
      L(s, `✍️ Another claim? Type *new*.`, `✍️ Un autre dossier ? Écrivez *nouveau*.`), cfg);
  }

  // Incompris — après 3 échecs au même step → proposer aide/rappel
  if (await stuckHelp(phone, s, cfg)) return;
  return sendButtons(phone, { body: L(s, `I didn't quite get that 🙂 Let's pick up where you left off 👇`, `Je n'ai pas compris 🙂 Reprenez où on s'était arrêté 👇`), buttons: [{ id: 'menu', text: L(s, '▶️ Resume', '▶️ Reprendre') }, { id: 'appel', text: L(s, '📞 Get a callback', '📞 Être rappelé') }] }, cfg);
}

// Reprise du flux « ticker » (vol prérempli par un lien du site) APRÈS le gate consentement, ou directement
// si le consentement était déjà donné. Annulation → gate 14 jours ; retard → question correspondance.
async function resumeTicker(phone, s, cfg) {
  const dStr = s.date ? L(s, ` on *${s.date}*`, ` du *${s.date}*`) : '';
  if (s.incident === 'annulation') {
    s.step = 'annul_delai'; s.incident_libelle = 'Annulation'; await setState(phone, s);
    await send(phone, L(s, `✅ Got it — your *flight ${s.vol}*${dStr} was *cancelled*.`, `✅ C'est noté — votre *vol ${s.vol}*${dStr} a été *annulé*.`), cfg);
    return sendAnnulDelai(phone, s, cfg);
  }
  s.step = 'q_corr'; s.incident = 'retard'; s.incident_libelle = 'Retard +3h'; s.duree_retard = '+3h'; await setState(phone, s);
  return sendButtons(phone, { body: L(s, `✅ Got it — your *flight ${s.vol}*${dStr} was *delayed*.\nThis kind of Europe ↔ Africa flight is *often eligible*, up to *€600 per passenger*.\n\nJust to be thorough: was this flight part of a *connection* (another flight just before or just after)?`, `✅ C'est noté — votre *vol ${s.vol}*${dStr} a été *retardé*.\nCe type de vol Europe ↔ Afrique est *souvent éligible* jusqu'à *600 € par passager*.\n\nPour ne rien oublier : ce vol faisait-il partie d'une *correspondance* (un autre vol juste avant ou juste après) ?`), buttons: [{ id: 'corr_direct', text: L(s, '✈️ No, direct flight', '✈️ Non, vol direct') }, { id: 'corr_escale', text: L(s, '🔄 Yes, a connection', '🔄 Oui, correspondance') }] }, cfg);
}

// ─── Émetteurs d'écran ───────────────────────────────────────────────────────
async function sendAccueil(phone, cfg, lang) {
  const en = lang === 'en';
  await sendButtons(phone, { body: en
    ? `${bar('accueil')}\n👋 Welcome to *Robin des Airs* 🏹\n_I'm the Robin des Airs assistant, I'll guide you step by step._\n\nDefending passengers on Africa ↔ Europe flights is what we do.\n\n✈️ EU law EC 261/2004 entitles you to *up to €600 per person* :\n• 🇪🇺 *Departure from Europe* → any airline\n• 🌍 *Arrival in Europe (from outside)* → EU airline only\n\n*€0 if we recover nothing.* No risk for you.\n\nLet's see together what you may be owed. 👇`
    : `${bar('accueil')}\n👋 Bienvenue chez *Robin des Airs* 🏹\n_Je suis l'assistant Robin des Airs, je vous accompagne pas à pas._\n\n${pickVariant(phone, 'ACCUEIL_EMPATHIE')}\n\nNous, c'est notre métier : on défend les passagers des vols Afrique ↔ Europe.\n\n✈️ La loi CE 261/2004 vous donne droit à *jusqu'à 600 € par personne* :\n• 🇪🇺 *Départ d'Europe* → toutes compagnies\n• 🌍 *Arrivée en Europe (départ hors)* → uniquement compagnie européenne\n\n*0 € si vous ne touchez rien.* Aucun risque pour vous.\n\nVoyons ensemble si une indemnité vous revient. 👇`,
    footer: 'CE 261/2004', buttons: [{ text: en ? '🚀 My compensation' : '🚀 Mon indemnité' }] }, cfg);
  // _sid = session ID unique par parcours (timestamp base36) — isole le dedup step+contenu.
  // langue_code mémorisé si détecté (site anglais) → le menu langue sera sauté à l'étape suivante.
  await setState(phone, { step: 'langue', phone, langue_code: en ? 'en' : '', _sid: Date.now().toString(36) });
}
async function sendLangue(phone, s, cfg) {
  s.step = 'langue'; await setState(phone, s);
  await sendList(phone, { header: '🌍 Votre langue', body: `${bar('langue')}\n🌍 Dans quelle langue souhaitez-vous être accompagné(e) ?\n_In which language would you like to be assisted?_`, buttonText: '🌍 Choisir', items: [
    { title: '🇫🇷 Français', description: 'Européenne' }, { title: '🇬🇧 English', description: 'Européenne' },
    { title: '🇸🇳 Wolof', description: 'Africaine' }, { title: '🇬🇲 Mandinka', description: 'Africaine' }, { title: '🇬🇭 Twi', description: 'Africaine' },
    { title: '🇳🇬 Yoruba', description: 'Africaine' }, { title: '🇬🇳 Peul / Fulfulde', description: 'Africaine' },
  ] }, cfg);
}
// CONSENT UNIFIÉ — CGU + Politique de confidentialité en 1 seule étape.
// 30/06/2026 : fusion des 2 gates historiques suite retour terrain (bot bouclait,
// friction inutile). CJUE Planet49 C-673/17 respectée : les 2 finalités sont
// distinctement nommées dans le body, l'action utilisateur reste explicite,
// aucun consentement bundling avec marketing/newsletter. Timestamps distincts
// stockés au moment du click (preuve individuelle en cas de litige).
// Fonction renommée mais gardée sous le nom sendConsentCgu pour compat avec les
// call-sites existants (sessions en cours et dispatchers).
async function sendConsentCgu(phone, s, cfg) {
  s.step = 'consent_cgu'; await setState(phone, s);
  return sendButtons(phone, {
    body: L(s,
      `📋 *Before you start*\n\nTo use Robin des Airs, please accept:\n\n📖 *Our terms of service*\n👉 https://robindesairs.eu/cgv.html\n\n🔒 *Our privacy policy* (your data is used *only* to handle your case, never sold)\n👉 https://robindesairs.eu/politique-confidentialite.html\n\nTap below to accept both and start.`,
      `📋 *Avant de commencer*\n\nPour utiliser Robin des Airs, merci d'accepter :\n\n📖 *Nos conditions générales*\n👉 https://robindesairs.eu/cgv.html\n\n🔒 *Notre politique de confidentialité* (vos données servent *uniquement* à traiter votre dossier, jamais revendues)\n👉 https://robindesairs.eu/politique-confidentialite.html\n\nCliquez ci-dessous pour accepter les deux et démarrer.`),
    buttons: [
      { id: 'cgu_accept', text: L(s, "✅ I accept", "✅ J'accepte") },
      { id: 'cgu_refuse', text: L(s, "❌ Refuse", '❌ Refuser') },
    ],
  }, cfg);
}

// GATE 2/2 — Consentement RGPD distinct (traitement des données personnelles).
// Stocké séparément : s.rgpd_accepted_at pour preuve en cas de litige.
async function sendConsentRgpd(phone, s, cfg) {
  s.step = 'consent_rgpd'; await setState(phone, s);
  return sendButtons(phone, {
    body: L(s,
      `${bar('consent_rgpd')}\n🔒 *Step 2/2 — Privacy Policy*\n\nYour data is used *only* to handle your case, never sold. Please read our *privacy policy* :\n👉 https://robindesairs.eu/politique-confidentialite.html\n\nTap *Access the service* below to accept and start.`,
      `${bar('consent_rgpd')}\n🔒 *Étape 2/2 — Politique de confidentialité*\n\nVos données servent *uniquement* à gérer votre dossier, jamais revendues. Merci de consulter notre *politique de confidentialité* :\n👉 https://robindesairs.eu/politique-confidentialite.html\n\nCliquez sur *Accéder au service* pour accepter et démarrer.`),
    buttons: [
      { id: 'rgpd_accept', text: L(s, "✅ Access the service", "✅ Accéder au service") },
      { id: 'rgpd_refuse', text: L(s, "❌ Refuse", '❌ Refuser') },
    ],
  }, cfg);
}
// LEGACY (sessions en cours uniquement) : ancienne question route abstraite — remplacée par askRouteZone (1 tap).
async function sendRoute(phone, s, cfg) {
  s.step = 'route'; await setState(phone, s);
  await sendList(phone, { body: L(s, `${bar('route')}\n🗺️ Which route was your flight on?\nThis determines whether EC 261/2004 applies.`, `${bar('route')}\n🗺️ Votre vol était sur quelle route ?\nCela détermine si le CE 261/2004 s'applique.`), buttonText: L(s, 'Choose ▾', 'Choisir ▾'), items: [
    { title: L(s, '🌍 Africa ↔ Europe', '🌍 Afrique ↔ Europe'), description: L(s, 'Our specialty', 'Notre spécialité') }, { title: L(s, '🇪🇺 Europe ↔ Europe', '🇪🇺 Europe ↔ Europe') }, { title: L(s, '🛫 Europe departure/arrival', '🛫 Départ/arrivée Europe') }, { title: L(s, '🌐 Other', '🌐 Autre') },
  ] }, cfg);
}
// ROUTE — qualification en UN tap par le critère légal CE 261 : le voyage touche-t-il l'Europe ?
// (départ OU arrivée). Plus facile à qualifier qu'une ville à retrouver/taper. La ville exacte du
// trajet est récupérée ensuite (scan e-billet/carte, ou saisie vol) — jamais redemandée pour qualifier.
async function askRouteZone(phone, s, cfg) {
  s.step = 'route_zone'; await setState(phone, s);
  return sendButtons(phone, { body: L(s,
    `${bar('route')}\n🗺️ Does your trip touch Europe — at departure or arrival?`,
    `${bar('route')}\n🗺️ Votre vol touche-t-il l'Europe, au départ ou à l'arrivée ?`), buttons: [
    { id: 'rz_dep', text: L(s, '🛫 Departs Europe', '🛫 Départ d\'Europe') },
    { id: 'rz_arr', text: L(s, '🛬 Arrives in Europe', '🛬 Arrivée en Europe') },
    { id: 'rz_non', text: L(s, '🌍 Neither', '🌍 Aucun des deux') },
  ] }, cfg);
}
async function sendIncident(phone, s, cfg) { s.step = 'incident'; await setState(phone, s); await sendButtons(phone, { body: L(s, `${bar('incident')}\n✈️ Tell us what happened with your flight.`, `${bar('incident')}\n✈️ Racontez-nous ce qui s'est passé avec votre vol.`), buttons: [{ id: 'inc_retard', text: L(s, '⏱️ Arrival delay', '⏱️ Retard arrivée') }, { id: 'inc_annul', text: L(s, '❌ Cancellation', '❌ Annulation') }, { id: 'inc_refus', text: L(s, '🚫 Denied boarding', "🚫 Refus d'embarq.") }] }, cfg); }

// Gate ANNULATION — la règle des 14 jours de préavis (art. 5 CE 261), posée AVANT le n° de vol.
// Ancré sur « quand on vous a prévenu(e), le vol était dans combien de temps » (notification → vol),
// PAS sur « aujourd'hui → vol » (qui serait juridiquement faux).
async function sendAnnulDelai(phone, s, cfg) {
  s.step = 'annul_delai'; await setState(phone, s);
  return sendButtons(phone, { body: L(s, `${bar('incident')}\n📅 For a *cancellation*, what matters is *when you were told*.\n\nWhen the airline announced the cancellation, was your flight *less than 14 days* away or *14 days or more*?`, `${bar('incident')}\n📅 Pour une *annulation*, c'est le *moment où on vous a prévenu(e)* qui compte.\n\nQuand la compagnie a annoncé l'annulation, votre vol était dans *moins de 14 jours* ou *14 jours ou plus* ?`), buttons: [{ id: 'pre_moins14', text: L(s, '🟢 Less than 14 days', '🟢 Moins de 14 jours') }, { id: 'pre_plus14', text: L(s, '🔴 14 days or more', '🔴 14 jours ou plus') }, { id: 'pre_inconnu', text: L(s, '🤔 Not sure', '🤔 Je ne sais plus') }] }, cfg);
}

// Suite après le gate annulation : reprend le flux normal (estimation → passagers),
// ou la branche « ticker » (vol déjà prérempli par un lien du site) → question correspondance.
async function continueAnnul(phone, s, cfg) {
  if (s.fromTicker) { s.step = 'q_corr'; await setState(phone, s); return sendButtons(phone, { body: L(s, `Was this flight part of a *connection* (another flight just before or just after)?`, `Ce vol faisait-il partie d'une *correspondance* (un autre vol juste avant ou juste après) ?`), buttons: [{ id: 'corr_direct', text: L(s, '✈️ No, direct flight', '✈️ Non, vol direct') }, { id: 'corr_escale', text: L(s, '🔄 Yes, a connection', '🔄 Oui, correspondance') }] }, cfg); }
  return estimationPuisPax(phone, s, cfg);
}
async function sendPax(phone, s, cfg) {
  s.step = 'nb_pax'; await setState(phone, s);
  await sendList(phone, { body: L(s, `${bar('nb_pax')}\n👥 How many passengers are claiming on this flight?`, `${bar('nb_pax')}\n👥 Combien de passagers réclament sur ce vol ?`), buttonText: L(s, 'Number ▾', 'Nombre ▾'), items: [
    { title: L(s, '1 passenger', '1 passager'), description: L(s, 'up to €600', "jusqu'à 600 €") }, { title: L(s, '2 passengers', '2 passagers'), description: L(s, 'up to €1,200', "jusqu'à 1 200 €") }, { title: L(s, '3 passengers', '3 passagers'), description: L(s, 'up to €1,800', "jusqu'à 1 800 €") }, { title: L(s, '4 passengers', '4 passagers'), description: L(s, 'up to €2,400', "jusqu'à 2 400 €") }, { title: L(s, '5 passengers', '5 passagers'), description: L(s, 'up to €3,000', "jusqu'à 3 000 €") }, { title: L(s, '6 or more', '6 ou plus'), description: L(s, 'We handle your group', 'On gère votre groupe') },
  ] }, cfg);
}
async function askYear(phone, s, cfg) {
  s.step = 'annee'; await setState(phone, s);
  const ys = recentYears();
  await sendList(phone, { header: L(s, 'Flight year', 'Année du vol'), body: L(s, `${bar('annee')}\n📅 Your ticket shows *${s.date}* but doesn't specify the year.\nWhich year was it?`, `${bar('annee')}\n📅 Votre billet indique le *${s.date}* mais ne précise pas l'année.\nC'était quelle année ?`), buttonText: L(s, 'Year ▾', 'Année ▾'), items: ys.map(y => ({ title: String(y) })).concat([{ title: L(s, `Before ${ys[ys.length - 1]}`, `Avant ${ys[ys.length - 1]}`) }]) }, cfg);
}
async function goCorrection(phone, s, cfg) {
  s.step = 'correction'; await setState(phone, s);
  await sendList(phone, { header: L(s, 'Fix', 'Corriger'), body: L(s, `✏️ What would you like to fix?`, `✏️ Que souhaitez-vous corriger ?`), buttonText: L(s, 'Fix ▾', 'Corriger ▾'), items: [
    { title: L(s, '✈️ Flight', '✈️ Vol'), description: s.vol || '—' },
    { title: L(s, '📅 Date', '📅 Date'), description: s.date || '—' },
    { title: L(s, '👤 Name', '👤 Nom'), description: (s.names && s.names[0]) || '—' },
    { title: L(s, '🗺️ Route', '🗺️ Trajet'), description: s.route || '—' },
    { title: L(s, '🎫 PNR', '🎫 PNR'), description: s.pnr || '—' },
  ] }, cfg);
}
async function showScanConfirm(phone, s, cfg) {
  s.step = 'scan_confirm'; await setState(phone, s);
  return sendButtons(phone, { body: L(s, `📋 Please check:\n\n✈️ Flight: ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date: ${s.date ? `${s.date}${isValidStoredDate(s.date) ? ` (${dateEnLettres(s.date)})` : ''}` : '—'}\n🎫 PNR: ${s.pnr || '—'}\n👤 Passenger: ${(s.names && s.names[0]) || '—'}\n🗺️ Route: ${s.route || '—'}\n\nIs this correct?`, `📋 Vérifiez :\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date ? `${s.date}${isValidStoredDate(s.date) ? ` (${dateEnLettres(s.date)})` : ''}` : '—'}\n🎫 PNR : ${s.pnr || '—'}\n👤 Passager : ${(s.names && s.names[0]) || '—'}\n🗺️ Trajet : ${s.route || '—'}\n\nC'est correct ?`), buttons: [{ id: 'scan_ok', text: L(s, '✅ Yes', '✅ Oui') }, { id: 'scan_fix', text: L(s, '✏️ Edit', '✏️ Corriger') }] }, cfg);
}
async function afterFix(phone, s, cfg) {
  if (s.fix_return === 'recap') return sendRecap(phone, s, cfg);
  return showScanConfirm(phone, s, cfg);
}
async function estimationPuisPax(phone, s, cfg) { s.step = 'nb_pax'; await setState(phone, s); await send(phone, LV(s, phone, 'ESTIMATION_QUALIFICATION', `👍 Good — this type of flight is often eligible. Let's estimate what you're owed.`), cfg); return sendPax(phone, s, cfg); }
// Confirmation 1 tap du trajet retrouvé automatiquement (flight-info ou flight-verdict).
async function askRouteConfirm(phone, s, cfg) {
  s.step = 'm_route_confirm'; await setState(phone, s);
  return sendButtons(phone, { body: L(s, `✈️ I found your route: *${s.route}*${s.compagnie ? ` (${s.compagnie})` : ''}.\nIs that right?`, `✈️ J'ai retrouvé votre trajet : *${s.route}*${s.compagnie ? ` (${s.compagnie})` : ''}.\nC'est bien ça ?`), buttons: [{ id: 'route_ok', text: L(s, '✅ Yes, that\'s it', '✅ Oui, c\'est ça') }, { id: 'route_fix', text: L(s, '✏️ Edit', '✏️ Corriger') }] }, cfg);
}
// Boutons de choix de tronçon (milk-run ou LLM multi-routes). Max 3 boutons WATI.
async function askRouteChoice(phone, routes, s, cfg) {
  s.step = 'm_route_choice';
  s.routeChoices = routes.slice(0, 3);
  await setState(phone, s);
  const buttons = s.routeChoices.map((r, i) => ({ id: `rc_${i}`, text: r.route.slice(0, 20) }));
  return sendButtons(phone, { body: L(s, `✈️ What was your exact route for *${s.vol}*?`, `✈️ Quel était votre trajet exact pour *${s.vol}* ?`), buttons }, cfg);
}
// Demande du PNR (factorisé : utilisé après date+route, après confirmation/saisie du trajet).
async function gotoPnr(phone, s, cfg, prefix) {
  s.step = 'm_pnr'; await setState(phone, s);
  return send(phone, L(s, `${prefix ? prefix + '\n\n' : ''}🎫 What's your *booking reference* (PNR)?\nIt's a 6-character code (letters/digits), on your ticket or confirmation email _(e.g. TFSCBC)_.\n✏️ Type *skip* if you don't have it.`, `${prefix ? prefix + '\n\n' : ''}🎫 Quel est votre *numéro de réservation* (PNR) ?\nC'est un code de 6 lettres/chiffres, sur votre billet ou votre email de confirmation _(ex : TFSCBC)_.\n✏️ Tapez *passer* si vous ne l'avez pas.`), cfg);
}
// Trajet direct (repli quand AeroDataBox n'a pas trouvé) : 2 questions imagées, listes cliquables + Autre.
async function askDepCity(phone, s, cfg, prefix) {
  s.step = 'm_dep'; await setState(phone, s);
  return sendCityList(phone, { header: L(s, 'Departure city', 'Ville de départ'), body: `${prefix ? prefix + '\n\n' : ''}${L(s, `🛫 Which city does your *plane take off* from?`, `🛫 De quelle ville votre *avion décolle*-t-il ?`)}` }, VILLES_COURANTES, cfg);
}
async function askArrCity(phone, s, cfg) {
  s.step = 'm_arr'; await setState(phone, s);
  return sendCityList(phone, { header: L(s, 'Arrival city', 'Ville d\'arrivée'), body: L(s, `🛬 And in which city does your *plane land*? _(your arrival)_`, `🛬 Et dans quelle ville votre *avion atterrit*-il ? _(votre arrivée)_`) }, VILLES_COURANTES, cfg);
}
// Vol multi-escales retrouvé : on montre le routing complet et on demande l'arrêt de DESCENTE du client.
async function askStopArr(phone, s, cfg) {
  s.step = 'm_stop_arr'; await setState(phone, s);
  const stops = s.routeStops || [];
  const chain = stops.map((x) => x.label).join(' → ');
  const downstream = stops.slice(1); // le départ = stops[0], les arrivées possibles = la suite
  const body = L(s, `✈️ This flight serves *${chain}*.\nWhere did you *get off*? _(your arrival)_`, `✈️ Ce vol dessert *${chain}*.\nOù êtes-vous *descendu(e)* ? _(votre arrivée)_`);
  if (downstream.length <= 2) {
    return sendButtons(phone, { body, buttons: downstream.map((d, i) => ({ id: `stop_${i}`, text: clip(d.label, 20) })).concat([{ id: 'stop_autre', text: L(s, '✏️ Other', '✏️ Autre') }]) }, cfg);
  }
  return sendList(phone, { header: L(s, 'Your arrival', 'Votre arrivée'), body, buttonText: L(s, 'Arrival ▾', 'Arrivée ▾'), items: downstream.map((d, i) => ({ id: `stop_${i}`, title: d.label, description: d.code })).concat([{ id: 'stop_autre', title: L(s, '✏️ Other city', '✏️ Autre ville') }]) }, cfg);
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
  return sendCityList(phone, { header: L(s, 'Departure city', 'Ville de départ'), body: `${intro ? intro + '\n\n' : ''}${bar('esc_dep')}\n${L(s, `🛫 What is the *departure* city of your trip?`, `🛫 Quelle est la ville de *départ* de votre voyage ?`)}` }, VILLES_COURANTES, cfg);
}
async function askEscVia(phone, s, cfg, suivante) {
  s.step = 'esc_via'; await setState(phone, s);
  return sendCityList(phone, { header: suivante ? L(s, 'Next layover', 'Escale suivante') : L(s, 'Layover city', 'Ville d\'escale'), body: suivante ? L(s, `🔄 In which city was the *next* layover?`, `🔄 Dans quelle ville était l'escale *suivante* ?`) : L(s, `🔄 In which city did you have a *layover*?`, `🔄 Dans quelle ville avez-vous fait *escale* ?`) }, VILLES_HUBS, cfg);
}
async function askEscArr(phone, s, cfg, prefix) {
  s.step = 'esc_arr'; await setState(phone, s);
  return sendCityList(phone, { header: L(s, 'Final arrival', 'Arrivée finale'), body: `${prefix ? prefix + '\n\n' : ''}${L(s, `🛬 And what is your *final arrival* city?`, `🛬 Et quelle est votre ville d'*arrivée finale* ?`)}` }, VILLES_COURANTES, cfg);
}
// Toutes les villes sont connues → construit trajet + segments, puis demande les n° de vol un par un.
async function buildEscLegs(phone, s, cfg, arrCity) {
  const c = (s.escCities || []).concat(arrCity);
  s.escCities = c; s.route = c.join(' → ');
  s.legs = c.slice(0, -1).map((dep, i) => ({ vol: '', dep, arr: c[i + 1] }));
  s.legCount = s.legs.length; s.legIdx = 0; s.step = 'esc_vol'; await setState(phone, s);
  return send(phone, L(s, `✅ Route: *${s.route}*\n\n✈️ Number of flight *${s.legs[0].dep} → ${s.legs[0].arr}*? _(e.g. AT540, on your ticket)_\n✏️ Type *skip* if you no longer have it.`, `✅ Trajet : *${s.route}*\n\n✈️ Numéro du vol *${s.legs[0].dep} → ${s.legs[0].arr}* ? _(ex : AT540, sur votre billet)_\n✏️ Tapez *passer* si vous ne l'avez plus.`), cfg);
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
  if (s.pax === 1) return sendButtons(phone, { body: L(s, `${bar('mineurs')}\n👤 Are you an adult (18+)?`, `${bar('mineurs')}\n👤 Êtes-vous majeur(e) (18+) ?`), buttons: [{ text: L(s, '✅ Yes, adult', '✅ Oui, majeur(e)') }, { text: L(s, '👶 No, a minor', '👶 Non, mineur(e)') }] }, cfg);
  return sendButtons(phone, { body: L(s, `${bar('mineurs')}\n👶 Among the ${s.pax} passengers, are there any minors (under 18)?`, `${bar('mineurs')}\n👶 Parmi les ${s.pax} passagers, y a-t-il des mineurs (–18 ans) ?`), buttons: [{ text: L(s, '✅ All adults', '✅ Tous majeurs') }, { text: L(s, '👶 Some minors', '👶 Des mineurs') }] }, cfg);
}
async function sendRecap(phone, s, cfg) {
  s.step = 'recap'; await setState(phone, s);
  try { markEngagedLead(phone, s); } catch (_) {} // dossier relançable dès que le vol est connu (récupère les abandons avant signature)
  const claimLineR = (!s.operateurNonUe && !s.operateurAVerifier && s.compagnie_reclamation) ? L(s, `\n📮 Claim filed against: *${s.compagnie_reclamation}*`, `\n📮 Réclamation auprès de : *${s.compagnie_reclamation}*`) : '';
  const dateLine = s.date ? `${s.date}${isValidStoredDate(s.date) ? ` (${dateEnLettres(s.date)})` : ''}` : '—';
  await sendButtons(phone, { body: L(s,
    `${bar('recap')}\n📋 *Summary — please confirm*\n\n👥 ${s.pax} passenger${s.pax > 1 ? 's' : ''}\n_Names at the next step (ID or typing)_\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}${claimLineR}\n🎫 PNR: ${s.pnr || '—'}\n🗺️ ${s.route || '—'}\n📅 ${dateLine} — ${incidentLabel(s)}\n🛤️ ${s.type_vol === 'escale' ? 'With layover' : 'Direct'}\n${montantLine(s)}`,
    `${bar('recap')}\n📋 *Récapitulatif — confirmez svp*\n\n👥 ${s.pax} passager${s.pax > 1 ? 's' : ''}\n_Identités à l'étape suivante (pièce d'identité ou saisie)_\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}${claimLineR}\n🎫 PNR : ${s.pnr || '—'}\n🗺️ ${s.route || '—'}\n📅 ${dateLine} — ${incidentLabel(s)}\n🛤️ ${s.type_vol === 'escale' ? 'Avec escale' : 'Direct'}\n${montantLine(s)}`), buttons: [{ id: 'recap_ok', text: L(s, '✅ All correct', '✅ Tout est correct') }, { id: 'recap_fix', text: L(s, '✏️ Edit', '✏️ Modifier') }] }, cfg);
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
    return send(phone, L(s,
      `✅ *Good news!* ${isEN(s) ? 'Based on our criteria, your flight looks eligible (our team confirms).' : (v.proofLine || '')}\nYou may claim *€${montantReel(s)}*${claimablePax(s) > 1 ? ` in total (${claimablePax(s)} passengers)` : ''} — that's *€${montantNetReel(s)} net* for you.`,
      `✅ *Bonne nouvelle !* ${v.proofLine || 'Selon nos critères, votre vol est a priori éligible (notre équipe confirme).'}\nVous pouvez prétendre à *${montantReel(s)} €*${claimablePax(s) > 1 ? ` au total (${claimablePax(s)} passagers)` : ''} — soit *${montantNetReel(s)} € nets* pour vous.`), cfg);
  }
  s.perPax = 0; // sortie douce : pas de montant ferme affiché
  await setState(phone, s);
  if (v.verdict === 'hors_champ') {
    return send(phone, L(s, `ℹ️ According to flight data, this trip doesn't *automatically* fall under EU rules (non-EU airline departing outside the EU). No worries: an expert checks *free of charge* whether another option exists. We keep your case. 🤝`, `ℹ️ D'après les données de vol, ce trajet n'entre pas *automatiquement* dans le règlement européen (compagnie hors-UE au départ hors-UE). Pas d'inquiétude : un expert vérifie *gratuitement* s'il existe un autre recours. On garde votre dossier. 🤝`), cfg);
  }
  if (v.verdict === 'sous_seuil') {
    return send(phone, L(s, `ℹ️ According to the data, the delay is *below the 3h threshold* for fixed compensation. But you may be entitled to *reimbursement of your expenses* — an expert checks. We keep your case. 🤝`, `ℹ️ Selon les données, le retard est *sous le seuil des 3h* pour l'indemnité forfaitaire. Mais vous avez peut-être droit au *remboursement de vos frais* — un expert vérifie. On garde votre dossier. 🤝`), cfg);
  }
  // a_verifier
  return send(phone, L(s, `🔎 An expert will confirm the *exact amount* of your case. Let's continue. 👍`, `🔎 Un expert confirmera le *montant exact* de votre dossier. On continue. 👍`), cfg);
}

// après vol+date connus → collecte des noms manquants
async function apresVol(phone, s, cfg) {
  // Plus de question mineurs : l'âge vient du passeport / de la date de naissance (étape documents).
  s.names = s.names || [];
  await applyFlightVerdict(phone, s, cfg); // vérifie le vol direct → ajuste montant + message (best-effort)
  // E-billet déjà confirmé (vol + route + passagers vus à l'écran scan_confirm) → le récap serait un
  // DOUBLON (« pourquoi confirmer 2 fois ? »). On enchaîne direct sur les pièces ; nextPassport rappelle déjà le montant.
  if (s.scanConfirmed) {
    s.scanConfirmed = false;
    return startDocuments(phone, s, cfg);
  }
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
  return send(phone, L(s, `${bar('names')}\n${prefix}👤 *Passenger ${s.name_idx + 1} of ${s.pax}* — First and last name?\n_(e.g. Aminata Diallo)_`, `${bar('names')}\n${prefix}👤 *Passager ${s.name_idx + 1} sur ${s.pax}* — Prénom et nom ?\n_(ex : Aminata Diallo)_`), cfg);
}
async function showNamesConfirm(phone, s, cfg) {
  s.step = 'names_confirm'; await setState(phone, s);
  const list = (s.names || []).slice(0, s.pax).map((n, i) => `✅ ${i + 1}. ${n || '—'}`).join('\n');
  return sendButtons(phone, { body: L(s, `${bar('names')}\n👥 *The ${s.pax} passengers:*\n${list}\n\nIs everything correct?`, `${bar('names')}\n👥 *Les ${s.pax} passagers :*\n${list}\n\nTout est correct ?`), buttons: [{ text: L(s, '✅ Confirm', '✅ Confirmer') }, { text: L(s, '✏️ Fix a name', '✏️ Corriger nom') }] }, cfg);
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
  // Intro au 1er passager : on RAPPELLE d'abord ce que le client touche (le chiffre rassure et justifie
  // l'effort), PUIS on demande la pièce d'identité — qui ne sert qu'à réclamer en son nom auprès de la compagnie.
  const intro = s.doc_idx === 0 ? L(s, `✅ *Almost there* — last step before we file your claim.\n${montantLine(s)}\n\n`, `✅ *On y est presque* — dernière étape avant de lancer votre réclamation.\n${montantLine(s)}\n\n`) : '';
  // En-tête : passagers déjà traités (✅) ou reportés (⏳) — nom affiché s'il est connu (e-billet / pièce lue)
  let done = '';
  for (let i = 0; i < s.doc_idx; i++) {
    const p = (s.passengers && s.passengers[i]) || {};
    const nm = p.name || (s.names && s.names[i]) || L(s, `Passenger ${i + 1}`, `Passager ${i + 1}`);
    done += p.idReceived ? `✅ ${i + 1}. ${nm}\n` : L(s, `⏳ ${i + 1}. ${nm} — _ID to send_\n`, `⏳ ${i + 1}. ${nm} — _pièce à envoyer_\n`);
  }
  const header = done ? `${done}\n` : '';
  // Nom du passager courant : connu seulement si e-billet scanné (sinon lu sur la pièce). Conditionnel.
  const curName = (s.passengers && s.passengers[s.doc_idx] && s.passengers[s.doc_idx].name) || (s.names && s.names[s.doc_idx]) || '';
  const who = curName ? ` — *${curName}*` : '';
  const passLine = s.pax > 1 ? L(s, `🛂 *Passenger ${s.doc_idx + 1} of ${s.pax}*${who}\n`, `🛂 *Passager ${s.doc_idx + 1} sur ${s.pax}*${who}\n`) : L(s, `🛂 *ID document*${who}\n`, `🛂 *Pièce d'identité*${who}\n`);
  return sendButtons(phone, { body: L(s,
    `${bar('documents')}\n${intro}${header}${passLine}📸 To claim in your name, send a *photo* of your ID (*passport, national ID or residence permit*). We only read the *name* and *date of birth*.\n_ℹ️ Read by an AI, kept for your file only — robindesairs.eu/politique-confidentialite_`,
    `${bar('documents')}\n${intro}${header}${passLine}📸 Pour réclamer en votre nom, envoyez une *photo* de votre pièce (*passeport, CNI ou carte de séjour*). On lit juste le *nom* et la *date de naissance*.\n_ℹ️ Lue par une IA, conservée pour votre seul dossier — robindesairs.eu/politique-confidentialite_`), buttons: [{ id: 'doc_photo', text: L(s, '📸 Send my photo', '📸 Envoyer ma photo') }, ...(curName ? [] : [{ id: 'doc_saisir', text: L(s, '✍️ Type it in', '✍️ Saisir à la main') }]), { id: 'doc_passer', text: L(s, '⏭️ I\'ll send it later', '⏭️ Je l\'envoie après') }] }, cfg);
}
async function askMandant(phone, s, cfg) {
  // 1 seul passager → c'est forcément lui le contact, pas de question → adresse puis finalisation.
  if (s.pax <= 1) { s.mandant_idx = 0; await setState(phone, s); return askAddressOrFinalize(phone, s, cfg); }
  s.step = 'doc_mandant'; await setState(phone, s);
  const names = Array.from({ length: s.pax }, (_, i) => paxName(s, i)); // résout passengers[i].name → s.names[i] (e-billet) → « Passager i » : affiche le vrai nom quand on l'a
  // On ne demande PAS « qui signe » (tout le monde signe son mandat) — juste à qui est ce WhatsApp (le contact du dossier).
  await send(phone, L(s, `✅ Documents collected! One last thing.\n\n📱 *Whose WhatsApp number is this?*\n_(the person following the case — each passenger signs their own claim-assignment contract, whichever it is.)_`, `✅ Pièces collectées ! Une dernière chose.\n\n📱 *À qui appartient ce numéro WhatsApp ?*\n_(la personne qui suit le dossier — chaque passager signera son propre contrat de cession, peu importe lequel.)_`), cfg);
  if (names.length <= 3) {
    return sendButtons(phone, names.map((nm, i) => ({ id: `mdt_${i}`, text: clip(nm, 20) })), cfg);
  }
  return sendList(phone, { header: L(s, 'This WhatsApp number', 'Ce numéro WhatsApp'), body: L(s, 'Who does this number belong to?', 'À qui appartient ce numéro ?'), buttonText: L(s, 'Choose', 'Choisir'), items: names.map((nm, i) => ({ id: `mdt_${i}`, title: clip(nm, 24), description: L(s, `Passenger ${i + 1}`, `Passager ${i + 1}`) })) }, cfg);
}
// Adresse JAMAIS gérée dans le bot : ni demandée, ni affichée. Elle est lue en SILENCE sur la pièce
// (OCR) pour pré-remplir le mandat, et reste corrigeable au moment de la signature.
async function askAddressOrFinalize(phone, s, cfg) {
  return finaliser(phone, s, cfg);
}
async function gotoBoarding(phone, s, cfg) { s.step = 'doc_boarding'; await setState(phone, s); return send(phone, L(s, `🎫 Boarding pass\nSend a photo for the affected flight.\n📧 No pass? An e-ticket, a booking confirmation or a baggage tag work too.\n_🔒 Read by an automated tool (AI) to pre-fill your file — see robindesairs.eu/politique-confidentialite._\n✏️ *skip* · 📞 *call* if all lost, we'll find a solution.`, `🎫 Carte d'embarquement\nEnvoyez-en une photo pour le vol concerné.\n📧 Pas de carte ? Un e-billet, une confirmation de réservation ou une étiquette de bagage fonctionnent aussi.\n_🔒 Lu par un outil automatique (IA) pour pré-remplir votre dossier — voir robindesairs.eu/politique-confidentialite._\n✏️ *passer* · 📞 *appel* si tout perdu, on trouve une solution.`), cfg); }
async function gotoEticket(phone, s, cfg) { s.step = 'doc_eticket'; await setState(phone, s); return send(phone, L(s, `📧 Booking confirmation (e-ticket)\nSend a screenshot (check spam / the Booking app).\n✏️ *skip* · 📞 *call*.`, `📧 Confirmation de réservation (e-billet)\nEnvoyez une capture (pensez aux spams / appli Booking).\n✏️ *passer* · 📞 *appel*.`), cfg); }
async function gotoCert(phone, s, cfg) { s.step = 'doc_cert'; await setState(phone, s); return send(phone, L(s, `📄 Delay/cancellation certificate (optional)\nIf the airline gave you one, send it.\n✏️ Type *skip* if you don't have one (common).`, `📄 Certificat de retard/annulation (optionnel)\nSi la compagnie vous en a remis un, envoyez-le.\n✏️ Tapez *passer* si vous n'en avez pas (cas fréquent).`), cfg); }

// MSG14 — RGPD + mandat + reçu + clôture
async function finaliser(phone, s, cfg) {
  const pax = s.passengers || [];
  const nom = (pax[0] && pax[0].name) || (s.names && s.names[0]) || '—';
  s.minorsCount = pax.filter(p => p && p.minor).length;
  s.ref = genRef(); s.mandat_url = buildMandatUrl(s, phone); s.step = 'done'; await setState(phone, s);
  const st = docsStatus(s); // titre HONNÊTE : « Dossier complet » seulement si toutes les pièces sont là (sinon le msg suivant se contredisait)
  const titre = st.complete ? L(s, '✅ *Your file is complete!*', '✅ *Dossier complet !*') : L(s, '✅ *Summary saved*', '✅ *Récapitulatif enregistré*');
  const docsNote = st.complete ? '' : `\n\n${missingDocsText(s)}`;
  // Lead à relancer tant que le mandat n'est pas signé (nudge 2h/8h/22h dans la fenêtre 24h)
  upsertLead(phone, { ref: s.ref, mandatUrl: s.mandat_url, mandatSentAt: Date.now(), lastClientAt: Date.now(), pax: s.pax || 1, name: firstNameOf(s), perPax: s.perPax, flightVerdict: s.flightVerdict || '', langue: s.langue_code || (LEADS.get(leadKey(phone)) || {}).langue || '', signed: false, completed: true, nudges: [] });
  const minorNote = s.minorsCount ? L(s, `\n👶 ${s.minorsCount} minor(s): a parent/guardian's signature is required (an expert guides you).`, `\n👶 ${s.minorsCount} mineur·s : signature d'un parent/tuteur requise (un expert vous guide).`) : '';
  // Message 1 — le récap (sans le lien). Message 2 — le lien SEUL, court, qui ne se replie
  // jamais derrière « Lire la suite » sur mobile et déclenche l'aperçu cliquable WhatsApp.
  await send(phone, L(s,
    `${bar('done')}\n${titre} Ref. *${s.ref}*\n\n👤 ${nom}${s.pax > 1 ? ` +${s.pax - 1}` : ''}\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 ${s.date || '—'} — ${incidentLabel(s)}\n🗺️ ${s.route || '—'}\n${montantLine(s)}${minorNote}${docsNote}\n\nLast step: *your signature* (2 min).\n✅ €0 upfront — 25% on success only · no bank details.\n💸 Paid even without a EU bank account: bank transfer, Wave, Orange Money or MTN MoMo — 75% net, all-inclusive.\n_Your data is used only for your claim, never sold. Privacy & T&Cs: robindesairs.eu/cgv_`,
    `${bar('done')}\n${titre} Réf. *${s.ref}*\n\n👤 ${nom}${s.pax > 1 ? ` +${s.pax - 1}` : ''}\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 ${s.date || '—'} — ${incidentLabel(s)}\n🗺️ ${s.route || '—'}\n${montantLine(s)}${minorNote}${docsNote}\n\nDernière étape : *votre signature* (2 min).\n✅ 0 € d'avance — 25 % fixe, tout compris, au succès uniquement · aucune info bancaire.\n💸 Payé même sans compte bancaire en Europe : virement, Wave, Orange Money ou MTN MoMo — 75 % net, tout compris.\n_Vos données servent uniquement à votre réclamation, jamais revendues. Confidentialité & CGV : robindesairs.eu/cgv_`), cfg);
  await send(phone, L(s, `👉 *Sign here* (2 min):\n${s.mandat_url}\n\nWithout your signature, we can't act on your behalf. ${STOP_FOOTER}`, `👉 *Signez ici* (2 min) :\n${s.mandat_url}\n\nSans votre signature, on ne peut pas agir en votre nom. ${STOP_FOOTER}`), cfg);
  // CRM : la fiche Airtable est désormais créée par la synchro DIRECTE (storeDossierDurable →
  // /api/dossier-store → syncNewDossierToAirtable, statut « Signature en attente »). Le webhook
  // Make ci-dessous n'est plus qu'un hook OPTIONNEL pour d'éventuelles automatisations externes :
  // son absence n'est PAS une erreur (plus d'alerte « à saisir à la main » — le dossier est déjà
  // dans Airtable), et un échec Make est sans impact sur le CRM.
  try {
    const makeUrl = process.env.MAKE_WEBHOOK_NEW_DOSSIER;
    if (makeUrl) {
      const _d = docsStatus(s);
      const _mq = []; if (_d.missingId.length) _mq.push(`pièce d'identité de ${_d.missingId.join(', ')}`); if (!_d.travelProofOk) _mq.push(`preuve de voyage (carte/e-billet)`);
      const r = await fetch(makeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s, phone, source: 'wati-bot-v8', pieces_manquantes: _mq.join(' · '), dossier_complet: _d.complete }), signal: AbortSignal.timeout(8000) });
      if (!r.ok) console.error(`CRM: webhook Make optionnel a répondu HTTP ${r.status} pour dossier ${s.ref} (sans impact : Airtable alimenté par la synchro directe)`);
    }
  } catch (e) {
    console.error(`CRM: webhook Make optionnel en échec pour dossier ${s.ref}: ${e.message} (sans impact : synchro Airtable directe)`);
  }
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
    // Statut MINEUR non vérifiable : si une pièce est envoyée plus tard / saisie sans date de naissance,
    // on ne peut pas savoir si le passager est mineur → la signature du représentant légal pourrait manquer
    // (mandat invalide). On le signale explicitement à l'équipe pour vérification.
    const _dobUnknown = (s.passengers || []).slice(0, s.pax || 1)
      .map((p, i) => ({ label: (p && p.name) ? p.name : `passager ${i + 1}`, p }))
      .filter(({ p }) => !(p && (p.dob || p.minor))) // déjà connu mineur (type billet) → pas « non vérifié »
      .map(({ label }) => label);
    if (_dobUnknown.length) {
      notifyOwnerWhatsApp(phone, `👶 Dossier ${s.ref} (${nom}) — MINORITÉ NON VÉRIFIÉE pour : ${_dobUnknown.join(', ')} (date de naissance inconnue, pièce non lue). Si l'un est MINEUR, exiger la signature du représentant légal — sinon le mandat est invalide pour ce passager.`).catch(() => {});
    }
  } catch (_) {}
}

// ─── FRAIS (Art. 8 & 9 CE261) — APRÈS signature, on propose d'envoyer les reçus (hôtel/taxi/repas/billet…)
//     réclamés EN PLUS de l'indemnité. Urgence VRAIE (joints au 1er envoi), JAMAIS de forclusion. ──
async function sendFraisRequest(phone, s, cfg) {
  s.step = 'frais'; s.fraisAsked = true; await setState(phone, s);
  return sendButtons(phone, { body: L(s, `💶 *One more thing that can earn you more*\n\nOn top of your compensation, the airline must *reimburse the expenses* this flight cost you (hotel, meals, taxi, replacement ticket…).\n\n📸 *One photo per receipt is enough* — we attach them to your claim. Sent today, they go out with the *first submission*; later is fine too.\n_🔒 Read by an automated tool (AI) for your file — robindesairs.eu/politique-confidentialite._`, `💶 *Une dernière chose qui peut vous rapporter plus*\n\nEn plus de votre indemnité, la compagnie doit *rembourser les frais* que ce vol vous a coûtés (hôtel, repas, taxi, billet de remplacement…).\n\n📸 *Une photo par reçu suffit* — on les joint à votre réclamation. Envoyés aujourd'hui, ils partent dès le *1ᵉʳ envoi* ; plus tard aussi, c'est bon.\n_🔒 Lu par un outil automatique (IA) pour votre dossier — robindesairs.eu/politique-confidentialite._`), buttons: [{ id: 'frais_oui', text: L(s, '📷 Send receipts', '📷 Envoyer reçus') }, { id: 'frais_non', text: L(s, '❌ No expenses', '❌ Pas de frais') }] }, cfg);
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

// Arme (sans rien envoyer maintenant) UN rappel « pièces » différé, déclenché par la signature.
// Le message post-signature demande déjà les pièces ; ce flag permet 1 SEULE relance à +5h dans la
// fenêtre 24h si le dossier est encore incomplet côté bot. Source de vérité = docsStatus(état bot).
async function armPiecesReminder(lead) {
  try {
    if (!lead || !lead.phone || lead.piecesAskedAt) return;   // invalide ou déjà armé (webhook rejoué)
    const s = STATE.get(leadKey(lead.phone));
    if (!s) return;                                           // pas d'état dossier → on ne devine pas (le bureau relance)
    if (docsStatus(s).complete) return;                       // déjà complet côté bot → aucun rappel nécessaire
    upsertLead(lead.phone, { piecesPending: true, piecesAskedAt: Date.now() });
  } catch (e) { console.error('armPiecesReminder', e.message); }
}

// Préférence de versement — posée à la signature (réassurance « votre argent », juste avant les pièces).
// On ne capture QUE la préférence (1 tap) ; le détail (IBAN / numéro) se prend au versement (rib.html). FR + EN.
async function sendPayoutPreference(lead) {
  try {
    if (!lead || !lead.phone || lead.payoutAskedAt) return;   // fire-once (webhook rejoué)
    const cfg = watiCfg(); if (!cfg) return;
    upsertLead(lead.phone, { payoutAskedAt: Date.now() });
    const s = await getState(lead.phone); if (!s.ref && lead.ref) s.ref = lead.ref;
    await sendButtons(lead.phone, {
      body: L(s, `🎉 It's signed, thank you for your trust! We handle everything to recover your money — you pay nothing upfront. How would you like to receive it?\n_(just your preference — no bank details needed right now)_`,
                 `🎉 C'est signé, merci de votre confiance ! On s'occupe de tout pour récupérer votre argent — vous n'avancez rien. Comment préférez-vous le recevoir ?\n_(juste votre préférence — pas besoin de vos coordonnées maintenant)_`),
      buttons: [
        { id: 'pay_waveom', text: 'Wave / Orange Money' },
        { id: 'pay_mtn', text: 'MTN MoMo' },
        { id: 'pay_iban', text: L(s, 'Bank transfer', 'Virement bancaire') },
      ],
    }, cfg);
  } catch (e) { console.error('sendPayoutPreference', e.message); }
}

// reprise d'étape (T1) — renvoie l'écran courant
async function relancerEtape(phone, s, cfg) {
  switch (s.step) {
    case 'langue': return sendLangue(phone, s, cfg);
    case 'consent_cgu': return sendConsentCgu(phone, s, cfg);
    case 'consent_rgpd': return sendConsentRgpd(phone, s, cfg);
    case 'q_corr': return sendButtons(phone, { body: L(s, `Was this flight part of a *connection* (another flight just before or just after)?`, `Ce vol faisait-il partie d'une *correspondance* (un autre vol juste avant ou juste après) ?`), buttons: [{ id: 'corr_direct', text: L(s, '✈️ No, direct flight', '✈️ Non, vol direct') }, { id: 'corr_escale', text: L(s, '🔄 Yes, a connection', '🔄 Oui, correspondance') }] }, cfg);
    case 'route': return sendRoute(phone, s, cfg);
    case 'route_zone': return askRouteZone(phone, s, cfg);
    case 'incident': return sendIncident(phone, s, cfg);
    case 'annul_delai': return sendAnnulDelai(phone, s, cfg);
    case 'nb_pax': return sendPax(phone, s, cfg);
    case 'esc_dep': return askEscDep(phone, s, cfg);
    case 'esc_via': return askEscVia(phone, s, cfg, (s.escCities || []).length >= 2);
    case 'esc_more': return sendButtons(phone, { body: L(s, `Was there *another stop*?`, `Y avait-il une *autre escale* ?`), buttons: [{ id: 'esc_oui', text: L(s, '🔄 Yes, another', '🔄 Oui, une autre') }, { id: 'esc_non', text: L(s, '➡️ No', '➡️ Non') }] }, cfg);
    case 'esc_arr': return askEscArr(phone, s, cfg);
    case 'esc_vol': { const l = (s.legs || [])[s.legIdx || 0]; if (l) return send(phone, L(s, `✈️ Number of flight *${l.dep} → ${l.arr}*? _(e.g. AT540)_\n✏️ Type *skip* if you no longer have it.`, `✈️ Numéro du vol *${l.dep} → ${l.arr}* ? _(ex : AT540)_\n✏️ Tapez *passer* si vous ne l'avez plus.`), cfg); return askEscDep(phone, s, cfg); }
    case 'mineurs': return sendMineurs(phone, s, cfg);
    case 'recap': return sendRecap(phone, s, cfg);
    case 'names': return askName(phone, s, cfg);
    case 'm_route_confirm': return s.route ? sendButtons(phone, { body: L(s, `✈️ Was your route *${s.route}*?`, `✈️ Votre trajet était *${s.route}* ?`), buttons: [{ id: 'route_ok', text: L(s, '✅ Yes', '✅ Oui') }, { id: 'route_fix', text: L(s, '✏️ Fix', '✏️ Corriger') }] }, cfg) : send(phone, L(s, `🗺️ What was the *route*? _(e.g. Dakar → Paris)_`, `🗺️ Quel était le *trajet* ? _(ex : Dakar → Paris)_`), cfg);
    case 'm_vol': return send(phone, L(s, `📝 Flight number? _(e.g. AF718, AT540)_`, `📝 Numéro de vol ? _(ex. AF718, AT540)_`), cfg);
    case 'm_date': return send(phone, L(s, `📅 Flight date? _(e.g. 15/03/2026)_`, `📅 Date du vol ? _(ex. 15/03/2026)_`), cfg);
    case 'm_route': return send(phone, L(s, `🗺️ What was the *route*? _(e.g. Dakar - Paris)_`, `🗺️ Quel était le *trajet* ? _(ex : Dakar - Paris)_`), cfg);
    case 'm_dep': return askDepCity(phone, s, cfg);
    case 'm_arr': return askArrCity(phone, s, cfg);
    case 'm_stop_arr': return (s.routeStops && s.routeStops.length) ? askStopArr(phone, s, cfg) : askDepCity(phone, s, cfg);
    case 'm_pnr': return gotoPnr(phone, s, cfg);
    case 'doc_pass': case 'doc_pass_confirm': case 'doc_dob': case 'doc_name': return nextPassport(phone, s, cfg);
    case 'doc_mandant': return askMandant(phone, s, cfg);
    case 'doc_adresse': return send(phone, L(s, `📍 *Last question!* Your *postal address*? District, city and country are enough — no postcode needed. _(e.g. Médina, Dakar, Senegal)_`, `📍 *Dernière question !* Votre *adresse postale* ? Quartier, ville et pays suffisent — pas besoin de code postal. _(ex : Médina, Dakar, Sénégal)_`), cfg);
    case 'doc_boarding': return gotoBoarding(phone, s, cfg);
    case 'doc_eticket': return gotoEticket(phone, s, cfg);
    case 'doc_cert': return gotoCert(phone, s, cfg);
    case 'frais': return sendFraisRequest(phone, s, cfg);
    case 'type_vol': return sendButtons(phone, { body: L(s, `${bar('type_vol')}\n✈️ Direct flight or with layover(s)?`, `${bar('type_vol')}\n✈️ Vol direct ou avec escale(s) ?`), buttons: [{ id: 'type_direct', text: L(s, '✈️ Direct flight', '✈️ Vol direct') }, { id: 'type_escale', text: L(s, '🔄 With layover', '🔄 Avec escale') }] }, cfg);
    case 'nb_pax_exact': return send(phone, L(s, `👥 How many passengers in total? _(e.g. 8)_`, `👥 Combien de passagers en tout ? _(ex. 8)_`), cfg);
    case 'scan': return sendButtons(phone, { body: L(s, `📎 Send a *photo* of your e-ticket or boarding pass, or:`, `📎 Envoyez une *photo* de votre e-billet ou carte d'embarquement, ou :`), buttons: [{ id: 'scan_photo', text: L(s, '📸 Send a photo', '📸 Envoyer une photo') }, { id: 'scan_manuel', text: L(s, '✏️ Type it in', '✏️ Saisir à la main') }] }, cfg);
    case 'scan_confirm': return scanConfirmCard(phone, s, cfg);
    case 'scan_sens': return askSens(phone, s, cfg);
    case 'annee': return askYear(phone, s, cfg);
    case 'correction': return goCorrection(phone, s, cfg);
    case 'fix_vol': return send(phone, L(s, `✈️ Type the *correct flight number* _(e.g. AF718)_`, `✈️ Tapez le *bon numéro de vol* _(ex. AF718)_`), cfg);
    case 'fix_date': return send(phone, L(s, `📅 Type the *correct date* _(DD/MM/YYYY)_`, `📅 Tapez la *bonne date* _(JJ/MM/AAAA)_`), cfg);
    case 'fix_nom': case 'fix_nom_which': return send(phone, L(s, `👤 Type the *correct full name* 👇`, `👤 Tapez le *bon nom complet* 👇`), cfg);
    case 'fix_route': return send(phone, L(s, `🗺️ Type the *correct route* _(e.g. Paris - Dakar)_`, `🗺️ Tapez le *bon trajet* _(ex. Paris - Dakar)_`), cfg);
    case 'fix_pnr': return send(phone, L(s, `🎫 Type the *booking reference* (PNR), or *skip*.`, `🎫 Tapez le *numéro de réservation* (PNR), ou *passer*.`), cfg);
    case 'm_route_choice': return askRouteChoice(phone, s.routeChoices || [], s, cfg);
    case 'names_confirm': case 'names_fix_which': case 'names_fix_one': return showNamesConfirm(phone, s, cfg);
    default: return send(phone, L(s, `Let's resume 👇 Answer the last question, or type *new* to start over.`, `On reprend 👇 Répondez à la dernière question, ou tapez *nouveau* pour recommencer.`), cfg);
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
let _warnedNoWatiSecret = false;
function verifyWatiSecret(body, headers, query) {
  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (!expected) {
    // FAIL-CLOSED : sans secret configuré, on REFUSE (ne jamais accepter de webhook en clair —
    // n'importe qui pourrait injecter de faux messages, créer de faux leads, déclencher des envois WATI).
    // Ce secret commande aussi la persistance durable (Blobs) → son absence est une alerte critique.
    if (!_warnedNoWatiSecret) {
      _warnedNoWatiSecret = true;
      console.error('🔴 SÉCURITÉ: WATI_WEBHOOK_SECRET absent → webhooks REFUSÉS (fail-closed). Configurez la variable d\'env Railway.');
      try { notifyOwnerWhatsApp('', '🔴 Bot: WATI_WEBHOOK_SECRET absent → webhook fermé. Configure la variable d\'env Railway, sinon aucun message client n\'est traité.').catch(() => {}); } catch (_) {}
    }
    return false;
  }
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
    if (!replyId) notifyOwnerWhatsApp(phone, text).catch(() => {}); // ne pas mirrorer les simples taps de boutons (bruit) — texte/média du client seulement (le Bureau garde tout via recordConvo)
    if (LEADS.has(leadKey(phone))) { // message entrant → garde la fenêtre 24h fraîche
      const _l = LEADS.get(leadKey(phone)); const _p = { lastClientAt: Date.now(), windowClosed: false }; // son message rouvre la fenêtre 24h
      // Sa réponse rouvre la fenêtre gratuitement → on réarme un cycle de relances « reprise » (borné à 3 cycles, anti-spam).
      if (_l && !_l.completed && _l.engagedAt && (_l.engagedRounds || 0) < 3 && (_l.nudges || []).some(n => /^e\d/.test(n))) {
        _p.nudges = (_l.nudges || []).filter(n => !/^e\d/.test(n)); _p.engagedRounds = (_l.engagedRounds || 0) + 1;
      }
      upsertLead(phone, _p);
    }
    recordConvo(phone, 'in', mediaUrl && !String(text || '').trim() ? '[pièce jointe]' : text); // historique léger pour le Bureau
    console.log('📩 inbound', (phone.length > 6 ? phone.slice(0, 4) + '***' + phone.slice(-2) : phone), 'len', String(text || '').length, mediaUrl ? '+media' : '', cfg ? '' : '⚠️cfgNULL');
    // Sérialisé par numéro : les messages d'un même client se traitent dans l'ordre, un par un.
    enqueue(phone, () => handleMessage(phone, text, cfg, mediaUrl, replyId).catch(e => {
      console.error('bot error', e.message, e.stack);
      if (cfg) return send(phone, phoneIsEN(phone) ? 'Something went wrong. Type *go* to continue your file.' : 'Une erreur est survenue. Écrivez *go* pour continuer votre dossier.', cfg).catch(() => {});
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
  if (!expected) return res.status(503).json({ ok: false, error: 'service indisponible' }); // fail-closed : jamais d'accès sans secret configuré
  if (!safeEq(secret, expected)) return res.status(401).json({ ok: false, error: 'secret invalide' });
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
      langue: lead.langue || '',
      wantsCall: !!lead.wantsCall, since, ageHours: Math.max(0, Math.round((now - since) / 3600000)), ageMin: Math.max(0, Math.round((now - since) / 60000)),
    });
  }
  out.sort((a, b) => (Number(b.wantsCall) - Number(a.wantsCall)) || (a.since - b.since)); // rappels demandés d'abord, puis les plus anciens
  res.json({ ok: true, updatedAt: new Date().toISOString(), total: out.length, leads: out });
});

// ─── Conversations récentes pour le panneau « WhatsApp » du Bureau (proxy via Netlify wa-recent). ──
app.get('/api/recent-conversations', (req, res) => {
  const secret = (req.query.s || req.headers['x-secret'] || req.headers['x-wati-secret'] || '').toString().trim();
  const expected = (process.env.WATI_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
  if (!expected) return res.status(503).json({ ok: false, error: 'service indisponible' }); // fail-closed : jamais d'accès sans secret configuré
  if (!safeEq(secret, expected)) return res.status(401).json({ ok: false, error: 'secret invalide' });
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 8));
  const conversations = [...CONVOS.values()]
    .filter(c => c.msgs && c.msgs.length)
    .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))
    .slice(0, limit)
    .map(c => { const last = c.msgs[c.msgs.length - 1]; return {
      phone: c.phone, lastText: last.text, lastRole: last.role,
      lastAt: new Date(last.at).toISOString(), count: c.msgs.length,
    }; });
  res.json({ ok: true, updatedAt: new Date().toISOString(), total: conversations.length, conversations });
});

app.get('/health', (req, res) => res.json({ ok: true, sessions: STATE.size, dedup: DEDUP.size, dossiers: DOSSIERS.size, leads: LEADS.size, convos: CONVOS.size, uptime: process.uptime(), ts: new Date().toISOString() }));
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
  if (!expected) return res.status(503).json({ error: 'service indisponible' }); // fail-closed
  if (!safeEq(secret, expected)) return res.status(401).json({ error: 'secret invalide' });
  const lead = findLead(b.ref || '') || findLead(b.phone || b.waId || '');
  const marked = markLeadSigned(b.ref || '') || markLeadSigned(b.phone || b.waId || '');
  console.log('mandat signe ref=' + (b.ref || '?') + ' marked=' + marked);
  if (lead && lead.phone) sendPayoutPreference(lead).catch(() => {}); // préférence de versement (réassurance « votre argent ») — juste avant les pièces
  if (lead && lead.phone) armPiecesReminder(lead).catch(() => {}); // arme 1 rappel pièces différé si le dossier est incomplet (best-effort)
  // La demande de FRAIS n'est plus envoyée ICI (elle chevauchait la préférence de versement = 2 jeux de boutons
  // concurrents). Elle part APRÈS la réponse à la préférence (handler pay_*). Fire-once via fraisAskedAt.
  // « À la fin de la conversation » : le mandat signé = LE moment où l'on prévient qu'un conseiller natif doit
  // rappeler le client dans sa langue africaine (le bot a continué en français). Source = lead.langue (code menu).
  // → fire-once, langues africaines uniquement, + mise en tête de « À rappeler » du Bureau (wantsCall).
  if (lead && lead.phone && lead.langue) {
    try {
      const La = Object.values(LANGS).find((v) => v.africaine && v.code === lead.langue);
      if (La) {
        const nm = lead.name ? String(lead.name).split(/\s+/)[0] : (lead.phone || '');
        upsertLead(lead.phone, { wantsCall: true, wantsCallAt: Date.now(), callLangue: La.label, callAgent: La.agent });
        notifyOwnerWhatsApp(lead.phone, `📞 *RAPPEL LANGUE — ${La.agent} (${La.label})*\n${nm} a *signé* son mandat (${lead.ref || lead.phone}) et avait choisi le *${La.label}*.\n→ *${La.agent}* doit le rappeler *dans sa langue*. Tél ${lead.phone}. (en tête de « À rappeler » du Bureau)`).catch(() => {});
      }
    } catch (_) {}
  }
  if (!marked) notifyOwnerWhatsApp(b.phone || b.waId || '', `⚠️ Signature reçue (ref=${b.ref || '?'} · tel=${b.phone || b.waId || '?'}) mais LEAD INTROUVABLE → relances NON stoppées. À vérifier / arrêter manuellement.`).catch(() => {}); // fin de l'échec silencieux
  res.json({ ok: true, marked });
});

// ─── Relances « signature » (2h/8h/22h après envoi du mandat) ET « dossier en cours » (reprise à 3h/14h
//     puis dernière chance à 22h, juste avant la fermeture) — toutes dans la fenêtre WhatsApp 24h gratuite. ──
const RELANCE_THRESHOLDS_H = [2, 8, 22];   // dossier finalisé, mandat envoyé, pas signé
const ENGAGED_THRESHOLDS_H = [3, 14, 22];  // dossier engagé : reprise (3h), rappel (14h), dernière chance avant fermeture (22h)
const PIECES_REMINDER_H = Number(process.env.PIECES_REMINDER_H) || 5; // signé mais pièces incomplètes → 1 rappel DOUX à +5h (fenêtre 24h ; pilotable en recette)
const _H = 3600000;
// Montant à afficher dans une relance, dérivé du lead (perPax/verdict capturés au récap/finalisation).
// hors_champ/sous_seuil → null = pas de chiffre ferme (cohérent avec « montant à confirmer » vu dans le tunnel).
function leadTotal(lead) {
  if (lead && (lead.flightVerdict === 'hors_champ' || lead.flightVerdict === 'sous_seuil')) return null;
  const per = (lead && Number(lead.perPax) > 0) ? Number(lead.perPax) : 600;
  return (per * ((lead && lead.pax) || 1)) + ' €';
}
function relanceText(n, lead) {
  const url = lead.mandatUrl || ('https://robindesairs.eu/' + (lead.langue === 'en' ? 'mandat-en.html' : 'mandat.html') + '?r=' + encodeURIComponent(lead.ref || ''));
  const total = leadTotal(lead);
  // EN : messages EN DUR par palier (aucune dépendance GPT). FR : variantes habituelles.
  if (leadEN(lead)) {
    const nm = lead.name ? ' ' + String(lead.name).split(/\s+/)[0] : '';
    const amt = total ? ` We claim up to *${total}* for you` : '';
    if (n === 2) return `Just one signature left to start your file *${lead.ref}*${nm}.${amt} — *€0 if we recover nothing*. 👉 *Sign here* (2 min):\n${url}`;
    if (n === 8) return `Your file *${lead.ref}* is ready${nm ? ',' + nm : ''} — only *your signature* is missing (2 min).${amt}, *€0 if we recover nothing*. 👉\n${url}`;
    return `Last step for your file *${lead.ref}*: *your signature*. After that we handle everything.${amt}, *€0 if we recover nothing*. 👉\n${url}`;
  }
  if (!total) return `Il ne reste qu'une signature pour lancer votre dossier ${lead.ref}. Un expert confirme le montant exact (vérification gratuite). 👉 ${url}\n0 € si vous ne touchez rien.`;
  const key = n === 2 ? 'RELANCE_2H' : n === 8 ? 'RELANCE_8H' : 'RELANCE_22H';
  const txt = fillTpl(pickRV(lead.ref || lead.phone, key), { REF: lead.ref || '', TOTAL: total, URL: url, NOM: lead.name || '' });
  return txt || `Il ne reste qu'une signature pour votre dossier ${lead.ref}. 👉 ${url}\n0 € si vous ne touchez rien.`;
}
// Groupe de message selon l'étape où le client a décroché → on adresse la cause probable de l'arrêt.
function engGroup(step) {
  if (step === 'recap') return 'RECAP';                  // a vu le récap, pas validé → hésitation/confiance
  if (step === 'doc_boarding') return 'BOARDING';        // carte d'embarquement → souvent perdue (l'e-billet suffit)
  if (step === 'doc_eticket') return 'ETICKET';          // e-billet → introuvable (spams/Booking/agence)
  if (step === 'doc_cert') return 'CERT';                // certificat → ils croient devoir l'attendre (c'est optionnel)
  if (step === 'doc_mandant' || step === 'doc_adresse') return null; // pièces déjà collectées → reprise générique (PAS « il ne manque qu'une pièce d'identité »)
  if (step && /^doc_/.test(step)) return 'PASS';         // pièce d'identité / saisie (doc_pass, doc_name, doc_dob…)
  return null;                                           // étape inconnue → message de reprise générique
}
function relanceTextEngaged(n, lead, step) {
  const total = leadTotal(lead);
  // EN : messages EN DUR (aucune dépendance GPT). FR : variantes habituelles.
  if (leadEN(lead)) {
    const nm = lead.name ? ' ' + String(lead.name).split(/\s+/)[0] : '';
    const amt = total ? ` (up to *${total}*, *€0 if we recover nothing*)` : ` (an expert confirms the exact amount, *€0 if we recover nothing*)`;
    if (n >= 22) return `Last chance before your file closes${nm ? ',' + nm : ''} — 2 min to finish${amt}. Tap *Resume* 👇, or *Call* 📞.`;
    return `We've started your file${nm ? ',' + nm : ''} — tap *Resume* 👇 to finish it${amt}, or *Call* 📞. 🙏`;
  }
  if (!total) return `On a commencé votre dossier — appuyez sur *Reprendre* 👇 pour le finaliser (un expert confirme le montant exact, 0 € si vous ne touchez rien), ou *Rappel* 📞. 🙏`;
  let key;
  if (n >= 22) { key = 'ENG_EDGE'; }                       // dernière relance avant fermeture de la fenêtre → urgence courte (peu importe l'étape)
  else { const g = engGroup(step); const suffix = n <= 3 ? '_1' : '_2'; key = g ? ('ENG_' + g + suffix) : ('RELANCE_ENGAGED' + suffix); }
  const txt = fillTpl(pickRV(lead.phone, key), { NOM: lead.name || '', VOL: tripLabel(lead), TOTAL: total });
  return txt || `On a commencé votre dossier — appuyez sur *Reprendre* 👇 pour le finaliser (jusqu'à ${total}, 0 € si vous ne touchez rien), ou *Rappel* 📞. 🙏`;
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
// ─── Relances HORS fenêtre 24h (templates approuvés) ───────────────────────────
// Quand la fenêtre est fermée, le bot ne peut plus écrire gratuitement → le lead dort
// dans « À rappeler ». Ces templates le re-touchent (payant) ; son tap rouvre la fenêtre
// et le bot reprend. DÉSACTIVÉ par défaut : ne part QUE si RELANCE_HSM_TEMPLATES=1 ET que
// les templates sont approuvés côté Meta/WATI (cf. docs/TEMPLATES-WATI.md).
const HSM_RELANCE = [
  { name: (process.env.HSM_TPL_RELANCE_1 || 'relance_dossier_a_finaliser').trim() }, // J+1 après fermeture
  { name: (process.env.HSM_TPL_RELANCE_2 || 'relance_preuve_sociale').trim() },        // J+2
  { name: (process.env.HSM_TPL_RELANCE_3 || 'relance_derniere_chance').trim() },       // J+4
];
const HSM_THRESHOLDS_D = [2, 3, 5]; // jours de SILENCE (la fenêtre 24h ferme à J+1) → 3 paliers
async function maybeSendHsmRelance(lead, k, now, cfg) {
  try {
    if (process.env.RELANCE_HSM_TEMPLATES !== '1') return;          // OFF par défaut : rien ne part
    if (!lead || lead.signed || lead.wantsCall) return;             // signé / rappel demandé → on ne pousse pas de template
    if (!(lead.engagedAt || lead.mandatSentAt)) return;             // pas un vrai lead en cours
    const sent = lead.hsmNudges || [];
    const dSilent = (now - (lead.lastClientAt || lead.engagedAt || lead.mandatSentAt || now)) / (24 * _H);
    const idx = HSM_THRESHOLDS_D.findIndex((t, i) => dSilent >= t && !sent.includes('h' + i));
    if (idx < 0) return;
    if (lead.lastHsmAt && now - lead.lastHsmAt < 20 * _H) return;   // ~1 relance HSM / jour max (anti-spam)
    // Source de vérité : ne JAMAIS relancer quelqu'un qui a signé entre-temps.
    if (await isAlreadySigned(lead.ref)) { markLeadSigned(lead.phone); lead.signed = true; LEADS.set(k, lead); persistLeads(); return; }
    const params = [
      { name: '1', value: lead.name || 'à vous' },
      { name: '2', value: tripLabel(lead) || lead.vol || 'votre vol' },
      { name: '3', value: leadTotal(lead) || 'à confirmer' },
    ];
    const r = await watiSendTemplate(lead.phone, HSM_RELANCE[idx].name, params, cfg);
    if (r && r.ok) {
      lead.hsmNudges = sent.concat('h' + idx); lead.lastHsmAt = now; LEADS.set(k, lead); persistLeads();
      console.log(`relance HSM ${HSM_RELANCE[idx].name} (silence ${Math.floor(dSilent)}j) -> ${lead.ref || lead.phone}`);
    }
  } catch (e) { console.error('maybeSendHsmRelance', e.message); }
}
let _relancesRunning = false; // verrou anti-ré-entrance : un run lent (> 15 min) ne doit pas chevaucher le suivant → sinon deux runs lisent le même lead avant marquage et envoient 2× la relance
async function runRelances() {
  if (_relancesRunning) return;
  _relancesRunning = true;
  try {
    const cfg = watiCfg(); if (!cfg) return;
    const now = Date.now();
    for (const [k, lead] of LEADS) {
      if (!lead) continue;
      const anchorAge = lead.mandatSentAt || lead.engagedAt || 0;
      // Purge : signé, ou trop vieux (30 j) — qu'il soit finalisé ou seulement engagé.
      if ((lead.signed && !lead.fraisPending && !lead.piecesPending) || (anchorAge && now - anchorAge > 30 * 24 * _H)) { LEADS.delete(k); persistLeads(); continue; }
      // Fenêtre WhatsApp 24h (envoi gratuit) fermée → on n'écrit plus en texte libre ; le dossier reste
      // dans « À rappeler ». On tente une relance par TEMPLATE approuvé (payant, OFF par défaut) pour
      // le ramener dans la conversation ; son tap rouvre la fenêtre et le flux reprend.
      if (lead.windowClosed || now - (lead.lastClientAt || anchorAge) > 24 * _H) { await maybeSendHsmRelance(lead, k, now, cfg); continue; }
      const nudges = lead.nudges || [];
      // Relance FRAIS : signé mais reçus pas encore envoyés → 1 SEUL rappel à 3h, dans la fenêtre 24h.
      if (lead.signed && lead.fraisPending) {
        const hF = (now - (lead.fraisAskedAt || now)) / _H;
        if (hF >= 3 && !nudges.includes('frais')) {
          const txt = leadEN(lead)
            ? `💶 Quick reminder: your receipts (taxi, hotel, meals…) go out with our first submission if we have them today. One photo is enough 📷 — or tap "No expenses". You can also add them later.`
            : (fillTpl(pickRV(lead.phone, 'RELANCE_FRAIS'), {}) || `💶 Petit rappel : vos reçus (taxi, hôtel, repas…) partent dans notre 1er envoi si on les a aujourd'hui. Une photo suffit 📷 — ou « Pas de frais ». On peut aussi les ajouter plus tard.`);
          try { await sendButtons(lead.phone, { body: txt, buttons: [{ id: 'frais_non', text: LL(lead, '❌ No expenses', '❌ Pas de frais') }] }, cfg); console.log('relance frais -> ' + (lead.ref || lead.phone)); } catch (_) {}
          lead.nudges = nudges.concat('frais'); lead.fraisPending = false; LEADS.set(k, lead); persistLeads();
        }
        continue; // signé → jamais de relance signature
      }
      // Relance PIÈCES : signé mais dossier incomplet → 1 SEUL rappel DOUX à +5h, dans la fenêtre 24h.
      // On pose une QUESTION (« vous nous avez déjà tout envoyé ? ») avec échappatoire, jamais une
      // affirmation « il manque X » : les dépôts via le lien web ne remontent pas à l'état du bot.
      if (lead.signed && lead.piecesPending) {
        const hP = (now - (lead.piecesAskedAt || now)) / _H;
        if (hP >= PIECES_REMINDER_H && !nudges.includes('pieces')) {
          const sp = STATE.get(k);
          if (sp && docsStatus(sp).complete) { lead.piecesPending = false; LEADS.set(k, lead); persistLeads(); continue; } // complété entre-temps (canal bot) → rien
          const url = 'https://robindesairs.eu/depot-en-ligne.html?r=' + encodeURIComponent(lead.ref || '');
          const nm = lead.name ? ' ' + String(lead.name).split(/\s+/)[0] : '';
          const txt = leadEN(lead)
            ? `📎 Quick update on your file ${lead.ref || ''}${nm ? ',' + nm : ''}.\n\nTo start the claim as fast as possible, for *each passenger* we need: a *photo ID* and your *boarding pass* (or *e-ticket*).\n\nHave you *already sent everything*? Great — tell us with one tap, we'll check on our side. Otherwise, upload your documents here 👇\n${url}`
            : `📎 Petit point sur votre dossier ${lead.ref || ''}${nm ? ',' + nm : ''}.\n\nPour qu'on lance la réclamation au plus vite, il nous faut, *pour chaque passager* : une *pièce d'identité* et votre *carte d'embarquement* (ou *e-billet*).\n\nVous nous avez *déjà tout envoyé* ? Très bien — dites-le-nous d'un tap, on vérifie de notre côté. Sinon, déposez vos pièces ici 👇\n${url}`;
          try { await sendButtons(lead.phone, { body: txt, buttons: [{ id: 'pieces_ok', text: LL(lead, '✅ Already sent everything', '✅ J\'ai déjà tout envoyé') }, { id: 'depot', text: LL(lead, '📎 Upload my documents', '📎 Déposer mes pièces') }] }, cfg); console.log('relance pieces -> ' + (lead.ref || lead.phone)); } catch (_) {}
          lead.nudges = nudges.concat('pieces'); lead.piecesPending = false; LEADS.set(k, lead); persistLeads();
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
        if (lead.completed) await sendButtons(lead.phone, { body: text, buttons: [{ id: 'deja_signe', text: LL(lead, '✅ I\'ve already signed', '✅ J\'ai déjà signé') }, { id: 'appel', text: LL(lead, '📞 Need help', '📞 Besoin d\'aide') }] }, cfg); // nudge signature (lien dans le body) + filet « déjà signé »
        else await sendButtons(lead.phone, { body: text, buttons: [{ id: 'menu', text: LL(lead, '▶️ Resume', '▶️ Reprendre') }, { id: 'snooze', text: LL(lead, '⏰ Later', '⏰ Plus tard') }, { id: 'appel', text: LL(lead, '📞 Get a callback', '📞 Être rappelé') }] }, cfg); // 1 tap = réponse → rouvre la fenêtre 24h gratis (id 'menu' = même action que le mot tapé)
        console.log('relance ' + due + ' -> ' + (lead.ref || lead.phone));
      } catch (_) {}
      lead.nudges = nudges.concat(due); LEADS.set(k, lead); persistLeads();
    }
  } catch (e) { console.error('runRelances', e.message); }
  finally { _relancesRunning = false; }
}
setInterval(runRelances, 15 * 60 * 1000); // toutes les 15 min

// Filet anti-crash : une promesse rejetée non capturée tuerait le process (Node ≥18) →
// /tmp perdu, sessions en cours interrompues. On logge + alerte SANS tuer le process,
// pour préserver l'état RAM (le bot reste vivant ; l'erreur devient visible).
process.on('unhandledRejection', (reason) => {
  const msg = (reason && reason.message) || String(reason);
  console.error('🔴 unhandledRejection:', msg, (reason && reason.stack) || '');
  try { notifyOwnerWhatsApp('', '🔴 Bot v8 — unhandledRejection : ' + msg).catch(() => {}); } catch (_) {}
});
process.on('uncaughtException', (err) => {
  console.error('🔴 uncaughtException:', (err && err.message), (err && err.stack) || '');
  try { notifyOwnerWhatsApp('', '🔴 Bot v8 — uncaughtException : ' + (err && err.message)).catch(() => {}); } catch (_) {}
});

// Fonctions PURES exposées pour les tests (logique éligibilité / transporteur effectif / réclamation).
// N'altère pas le runtime : le serveur démarre toujours via app.listen ci-dessous.
module.exports = {
  AIRLINES, UE_CARRIERS, EU_AIRPORTS,
  isCarrierUE, isEUAirport, carrierCode, deduceAirline,
  effectiveCarrier, markOperateurEffectif, decideOperatingCarrier,
  applyTrajet, setEticketFields, applyEticket,
};

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => { console.log('\ud83e\udd16 Robin des Airs Bot v8 — Railway — port ' + PORT); });

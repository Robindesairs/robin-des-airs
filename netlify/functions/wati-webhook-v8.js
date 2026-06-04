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

const { appendWaMessage, normalizeWaPhone } = require('./lib/wa-convo-store');
const { normalizeWatiPhone, watiCfg } = require('./lib/wati-api');
const { getBlobStore } = require('./lib/netlify-blobs-store');

let LAMBDA_EVENT = null;
function botStore() { return getBlobStore(LAMBDA_EVENT, 'robin-bot-v8'); }
function clip(s, n) { s = String(s == null ? '' : s); return s.length <= n ? s : s.slice(0, n); }

let notifyOwnerWhatsApp = async () => {};
try { ({ notifyOwnerWhatsApp } = require('./lib/owner-notify')); } catch (_) {}

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// ─── Barre 8 pastilles ───────────────────────────────────────────────────────
const PROGRESS = {
  accueil: 0, langue: 0,
  route: 1,
  incident: 2, duree: 2,
  nb_pax: 3, nb_pax_exact: 3,
  type_vol: 4, motivation: 4,
  scan: 5, scan_confirm: 5, m_vol: 5, m_date: 5, m_route: 5, names: 5, names_confirm: 5, names_fix_which: 5, names_fix_one: 5,
  vd_vol: 6, vd_date: 6, annee: 6, mineurs: 6, mineurs_which: 6,
  correction: 6, fix_vol: 6, fix_date: 6, fix_nom: 6, fix_route: 6,
  recap: 7, documents: 7, doc_pass: 7, doc_boarding: 7, doc_eticket: 7, doc_cert: 7, rgpd: 7,
  done: 8,
};
function bar(step) { const n = PROGRESS[step] ?? 0; return '🟢'.repeat(n) + '⚪'.repeat(8 - n); }

// ─── Montants (net 75 %) ──────────────────────────────────────────────────────
function montantTotal(pax = 1) { return 600 * pax; }
function montantNet(pax = 1) { return Math.round(600 * pax * 0.75); }

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
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const params = new URLSearchParams({ messageText: text, channelPhoneNumber: cfg.channel });
  try {
    await fetch(`${cfg.base}/api/v1/sendSessionMessage/${encodeURIComponent(wa)}?${params}`, {
      method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    });
  } catch (e) { console.error('v8 send failed', e.message); }
}
async function sendButtons(phone, { body, footer, buttons }, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const qs = new URLSearchParams({ whatsappNumber: wa, channelPhoneNumber: cfg.channel });
  try {
    const res = await fetch(`${cfg.base}/api/v1/sendInteractiveButtonsMessage?${qs}`, {
      method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, footer: footer || 'robindesairs.eu', buttons: buttons.slice(0, 3).map(b => ({ text: clip(b.text, 20) })) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.result === false || data.error || data.ok === false) {
      await send(phone, body + '\n\n' + buttons.map((b, i) => `${i + 1} — ${b.text}`).join('\n'), cfg);
    }
  } catch (e) { await send(phone, body + '\n\n' + buttons.map((b, i) => `${i + 1} — ${b.text}`).join('\n'), cfg); }
}
async function sendList(phone, { header, body, footer, buttonText, items }, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const rows = items.map((i, idx) => ({ id: String(idx + 1), title: clip(i.title, 24), description: clip(i.description || '', 72) }));
  // ✅ Vraie liste cliquable = endpoint v3 "active conversation" avec type:"list"
  //    (le /api/v1/sendInteractiveListMessage rend toujours en texte — confirmé support WATI).
  let host; try { host = new URL(cfg.base).origin; } catch { host = cfg.base; }
  const textFallback = () => send(phone, (header ? `*${header}*\n\n` : '') + body + '\n\n' + items.map((it, idx) => `${NUMEMO[idx] || (idx + 1 + '.')} ${it.title}`).join('\n') + `\n\n👉 Répondez avec le *numéro*.`, cfg);
  try {
    const res = await fetch(`${host}/api/ext/v3/conversations/messages/interactive`, {
      method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: wa,
        type: 'list',
        list_message: {
          ...(header ? { header: clip(header, 60) } : {}),
          body: body,
          footer: footer || 'robindesairs.eu',
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
async function getState(phone) { try { const st = botStore(); if (!st) throw 0; return (await st.get(`state/${phone.replace(/\D/g, '')}`, { type: 'json' })) || { step: 'accueil' }; } catch { return { step: 'accueil' }; } }
async function setState(phone, s) { try { const st = botStore(); if (!st) return; await st.setJSON(`state/${phone.replace(/\D/g, '')}`, { ...s, updatedAt: new Date().toISOString() }); } catch (e) { console.error('v8 setState', e.message); } }
async function clearState(phone) { try { const st = botStore(); if (!st) return; await st.delete(`state/${phone.replace(/\D/g, '')}`); } catch {} }
async function saveInboundDebug(rawBody, items) {
  try { const st = botStore(); if (!st) return;
    const prev = (await st.get('debug/inbound', { type: 'json' })) || [];
    prev.unshift({ ts: new Date().toISOString(), raw: String(rawBody).slice(0, 1500), extracted: items.map(it => ({ ph: it.phone, txt: it.text, dedupId: it.dedupId })) });
    await st.setJSON('debug/inbound', prev.slice(0, 8));
  } catch (e) {}
}
async function readInboundDebug() { try { const st = botStore(); if (!st) return null; return await st.get('debug/inbound', { type: 'json' }); } catch { return null; } }
async function saveInteractiveDebug(obj) { try { const st = botStore(); if (!st) return; await st.setJSON('debug/interactive', { ...obj, ts: new Date().toISOString() }); } catch (e) {} }
async function readInteractiveDebug() { try { const st = botStore(); if (!st) return null; return await st.get('debug/interactive', { type: 'json' }); } catch { return null; } }
async function isDuplicateMessage(id, hasId, windowMs) {
  if (!id) return false;
  try { const st = botStore(); if (!st) return false;
    const k = 'seen/' + String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 200);
    const prev = await st.get(k, { type: 'json' }); const now = Date.now();
    const w = windowMs || (hasId ? 600000 : 60000);
    if (prev && prev.t && (now - prev.t) < w) return true;
    await st.setJSON(k, { t: now }); return false;
  } catch { return false; }
}

// ─── Utilitaires ────────────────────────────────────────────────────────────────
function genRef() { const d = new Date(); return `RDA-${d.toISOString().slice(0,10).replace(/-/g,'')}-${hashStr(String(d.getTime())).toString(36).slice(-4).toUpperCase()}`; }
function normInput(raw, options) { const t = (raw || '').trim().toLowerCase(); if (/^\d+$/.test(t)) return t; const i = options.findIndex(o => t.includes(o.toLowerCase())); return i >= 0 ? String(i + 1) : t; }
const AIRLINES = { AF: 'Air France', SN: 'Brussels Airlines', TP: 'TAP Air Portugal', AT: 'Royal Air Maroc', HC: 'Air Sénégal', KQ: 'Kenya Airways', ET: 'Ethiopian Airlines', EK: 'Emirates', TK: 'Turkish Airlines', KL: 'KLM', LH: 'Lufthansa', IB: 'Iberia', EJU: 'easyJet', U2: 'easyJet', FR: 'Ryanair', TO: 'Transavia', KP: 'ASKY', DN: 'Senegal Airlines' };
function deduceAirline(vol) { const m = (vol || '').toUpperCase().match(/^([A-Z]{2,3})\d/); return (m && AIRLINES[m[1]]) || ''; }
function buildMandatUrl(s, phone) {
  const p = new URLSearchParams({ ref: s.ref || '', phone: phone || '', name: (s.names && s.names[0]) || s.nom || '', vol: s.vol || '', date: s.date || '', pnr: s.pnr || '', route: s.route || '', compagnie: s.compagnie || '', motif: s.incident_libelle || '', indemnite: '600', pax: String(s.pax || 1), lang: s.langue_code || 'fr', source: 'wati-bot-v8' });
  return `https://robindesairs.eu/mandat.html?${p.toString()}`;
}

// ─── OCR (Vision) ────────────────────────────────────────────────────────────
async function ocrBoardingPass(mediaUrl, cfg) {
  const key = process.env.OPENAI_API_KEY; if (!key || !mediaUrl) return null;
  try {
    const imgRes = await fetch(mediaUrl, { headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {} });
    if (!imgRes.ok) return null;
    const b64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');
    const prompt = `Tu lis une carte d'embarquement / e-billet d'avion. Réponds UNIQUEMENT en JSON :
{"vol":"","compagnie":"","date":"","pnr":"","depart":"","arrivee":"","nom":""}
Règles STRICTES :
- vol : numéro de vol en MAJUSCULES sans espace (ex. EJU7273, AF718).
- compagnie : nom complet (déduis du code IATA si besoin).
- date : "JJ/MM" si l'année N'EST PAS imprimée sur le document ; "JJ/MM/AAAA" UNIQUEMENT si l'année est réellement écrite. NE JAMAIS deviner ni inventer l'année (les cartes d'embarquement n'ont souvent pas l'année).
- pnr : référence de réservation (libellés possibles : PNR, Booking ref, Réf, Record locator, Confirmation) — 5 à 8 caractères ALPHANUMÉRIQUES, souvent près du nom ou d'un code-barres. Cherche-la attentivement. Si vraiment absente, "".
- depart / arrivee : codes IATA 3 lettres.
- nom : nom du passager en MAJUSCULES.
- Champ inconnu = "". Ne JAMAIS inventer.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 300, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }] }] }),
    });
    const data = await res.json(); if (!data.choices) return null;
    const p = JSON.parse(data.choices[0].message.content);
    const vol = (p.vol || '').toUpperCase().replace(/\s+/g, '');
    const route = (p.depart && p.arrivee) ? `${p.depart} → ${p.arrivee}` : '';
    const pnr = (p.pnr || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return { vol, compagnie: p.compagnie || deduceAirline(vol), date: p.date || '', pnr: /^[A-Z0-9]{5,8}$/.test(pnr) ? pnr : '', route, nom: (p.nom || '').toUpperCase() };
  } catch (e) { return null; }
}

// ─── Helpers prescription / dates ──────────────────────────────────────────────
function tooOld(dateStr) { const m = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return false; const d = new Date(+m[3], +m[2] - 1, +m[1]); return (Date.now() - d.getTime()) > 5 * 365.25 * 864e5; }
// Date sans année (ex. "15/07") → il faut demander l'année (ne jamais la deviner).
function needYear(d) { return /^\d{1,2}\/\d{1,2}$/.test((d || '').trim()); }
// Date dans le futur (> demain) → impossible pour un vol déjà perturbé.
function inFuture(dateStr) { const m = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return false; return new Date(+m[3], +m[2] - 1, +m[1]).getTime() > Date.now() + 864e5; }
const FUTURE_JOKE = `😄 Là vous voyagez dans le futur ! Ce vol n'a pas encore eu lieu — on ne peut réclamer que pour un vol *déjà passé*. 🪄\n\nDonnez-moi la *vraie* date du vol (JJ/MM/AAAA) :`;
function recentYears() { const base = new Date().getFullYear(); return [base, base - 1, base - 2, base - 3, base - 4]; }

const STOP_FOOTER = '_L\'équipe Robin des Airs_';

// ═══════════════ MACHINE À ÉTATS v8 ═══════════════
async function handleMessage(phone, text, cfg, mediaUrl) {
  const input = (text || '').trim();
  const lower = input.toLowerCase();

  // T1 — menu / reset
  if (['nouveau', 'new', 'reset', '/reset', 'recommencer'].includes(lower)) { await clearState(phone); return sendAccueil(phone, cfg); }
  if (['menu', 'start', 'reprendre', 'continuer', 'suite', 'bonjour', 'hello', 'hi', 'salut'].includes(lower)) {
    const cur = await getState(phone);
    if (cur && cur.step && cur.step !== 'accueil' && cur.step !== 'done') { await send(phone, `👋 Re-bonjour ! On reprend votre dossier là où vous vous étiez arrêté.`, cfg); return relancerEtape(phone, cur, cfg); }
    await clearState(phone); return sendAccueil(phone, cfg);
  }

  let s = await getState(phone);

  // T2 — fallback IA hors-flux (question libre) → réponse + boutons
  try {
    const { isClientQuestion, isSensitive, answerClientQuestion } = require('./lib/robin-ai-responder');
    const FREE = ['m_vol', 'm_date', 'm_route', 'names', 'vd_vol', 'vd_date', 'mineurs_which', 'fix_vol', 'fix_date', 'fix_nom', 'fix_route', 'names_fix_which', 'names_fix_one'];
    const looks = FREE.includes(s.step) ? input.includes('?') : isClientQuestion(input);
    if (looks) {
      if (isSensitive(input)) { await send(phone, `Je transmets votre demande à un conseiller Robin des Airs. 🙏\nTapez *menu* pour ouvrir/continuer votre dossier.`, cfg); return; }
      const r = await answerClientQuestion(input, process.env.OPENAI_API_KEY);
      await sendButtons(phone, { body: (r || `🤖 Je suis l'assistant IA de Robin des Airs.`) + `\n\nPour ouvrir votre dossier, tapez *menu* 👇`, buttons: [{ text: '📋 Démarrer' }, { text: '📞 Être rappelé' }] }, cfg);
      return;
    }
  } catch (e) {}

  // ACCUEIL (MSG1)
  if (s.step === 'accueil' || !s.step) return sendAccueil(phone, cfg);

  // Bouton MSG1 « Vérifier mon indemnité » / « Commencer / Démarrer »
  if (s.step === 'go_langue') { return sendLangue(phone, s, cfg); }

  // MSG2 — LANGUE
  if (s.step === 'langue') {
    const L = matchLang(input);
    if (!L) return sendLangue(phone, s, cfg);
    s.langue = `${L.flag} ${L.label}`; s.langue_code = L.code;
    if (L.africaine) { s.escalade = 'langue_africaine'; await send(phone, `${L.natif}\n📱 +33 7 56 86 36 30\n\n🤝 Votre dossier est entre de bonnes mains.\nUn expert parlant votre langue vous contactera. En attendant, je continue en français. 👇`, cfg); }
    s.step = 'route'; await setState(phone, s); return sendRoute(phone, s, cfg);
  }

  // MSG3 — ROUTE
  if (s.step === 'route') {
    const n = normInput(input, ['afrique', 'europe ↔', 'départ', 'autre']);
    if (n === '1' || lower.includes('afrique ↔') || (lower.includes('afrique') && lower.includes('europe'))) { s.route_type = 'af_eu'; }
    else if (n === '2' || (lower.includes('europe') && !lower.includes('afrique') && !lower.includes('départ'))) { s.route_type = 'eu_eu'; await send(phone, `🇪🇺 Les vols intra-européens sont couverts par le CE 261 ✅\nNotre spécialité c'est Afrique ↔ Europe, mais on continue.`, cfg); }
    else if (n === '3' || lower.includes('départ') || lower.includes('arrivée')) { s.route_type = 'mixte'; await send(phone, `🛫 Un départ ou une arrivée en Europe peut être éligible. Vérifions ensemble. ✅`, cfg); }
    else if (n === '4' || lower.includes('autre')) { await clearState(phone); return send(phone, `😔 Votre vol ne semble pas couvert par la loi européenne.\n\nLe CE 261/2004 s'applique aux vols au départ/à l'arrivée d'un aéroport européen, ou opérés par une compagnie européenne.\n\n❓ Si erreur, tapez *menu* pour choisir une autre route.\n\n${STOP_FOOTER}`, cfg); }
    else return sendRoute(phone, s, cfg);
    s.step = 'incident'; await setState(phone, s); return sendIncident(phone, s, cfg);
  }

  // MSG4 — INCIDENT
  if (s.step === 'incident') {
    const n = normInput(input, ['retard', 'annulation', 'refus']);
    if (n === '1' || lower.includes('retard')) { s.step = 'duree'; await setState(phone, s); return sendButtons(phone, { body: `⏱️ De combien d'heures était le retard à l'arrivée ?`, buttons: [{ text: '✅ Plus de 3 heures' }, { text: '❌ Moins de 3h' }, { text: '🤔 Je ne sais plus' }] }, cfg); }
    if (n === '2' || lower.includes('annul')) { s.incident = 'annulation'; s.incident_libelle = 'Annulation'; }
    else if (n === '3' || lower.includes('refus') || lower.includes('embarq')) { s.incident = 'refus'; s.incident_libelle = "Refus d'embarquement"; }
    else return sendIncident(phone, s, cfg);
    await estimationPuisPax(phone, s, cfg); return;
  }
  if (s.step === 'duree') {
    const n = normInput(input, ['plus de 3', 'moins de 3', 'sais']);
    if (n === '1' || lower.includes('plus de 3')) { s.incident = 'retard'; s.incident_libelle = 'Retard +3h'; s.duree_retard = '+3h'; return estimationPuisPax(phone, s, cfg); }
    if (n === '2' || lower.includes('moins de 3')) { await clearState(phone); return send(phone, `😔 Retard inférieur à 3 heures — pas d'indemnisation possible.\n\nLe CE 261/2004 fixe un seuil de 3h de retard à l'arrivée.\n\n💡 Pas sûr de la durée ? Tapez *menu* et choisissez « Je ne sais plus » — un expert vérifie gratuitement.\n\n${STOP_FOOTER}`, cfg); }
    if (n === '3' || lower.includes('sais') || lower.includes('souviens')) { s.incident = 'retard'; s.incident_libelle = 'Retard (à vérifier)'; s.duree_retard = 'inconnue'; s.escalade = s.escalade || 'duree_inconnue'; await send(phone, `🤔 Pas de problème — on vérifie pour vous.\nLa durée exacte figure dans les bases aériennes ; notre équipe la retrouve via votre n° de vol et date. Continuons. 👇`, cfg); return estimationPuisPax(phone, s, cfg); }
    return sendButtons(phone, { body: `⏱️ Le retard à l'arrivée était de :`, buttons: [{ text: '✅ Plus de 3 heures' }, { text: '❌ Moins de 3h' }, { text: '🤔 Je ne sais plus' }] }, cfg);
  }

  // MSG5 — PASSAGERS
  if (s.step === 'nb_pax') {
    const n = parseInt(normInput(input, ['1 passager', '2 passager', '3 passager', '4 passager', '5 passager', '6 ou plus']));
    if (n >= 1 && n <= 5) { s.pax = n; s.names = []; s.step = 'type_vol'; await setState(phone, s); return sendButtons(phone, { body: `${bar('type_vol')}\n✈️ C'était un vol direct ou avec escale(s) ?`, buttons: [{ text: '✈️ Vol direct' }, { text: '🔄 Avec escale' }] }, cfg); }
    if (n >= 6 || lower.includes('6 ou plus') || lower.includes('plus')) { s.step = 'nb_pax_exact'; await setState(phone, s); return send(phone, `${bar('nb_pax')}\n👥 *Combien de passagers en tout ?*\nIndiquez le nombre total (ex. 8). On gère votre groupe directement ici. 🤝`, cfg); }
    return sendPax(phone, s, cfg);
  }
  if (s.step === 'nb_pax_exact') {
    const m = input.match(/\d{1,2}/); const n = m ? parseInt(m[0]) : 0;
    if (n >= 1 && n <= 30) { s.pax = n; s.names = []; s.step = 'type_vol'; await setState(phone, s); return sendButtons(phone, { body: `${bar('type_vol')}\n✅ ${n} passagers — potentiellement *${montantTotal(n)} €*.\n\n✈️ C'était un vol direct ou avec escale(s) ?`, buttons: [{ text: '✈️ Vol direct' }, { text: '🔄 Avec escale' }] }, cfg); }
    return send(phone, `Indiquez le *nombre total* de passagers en chiffres (ex. 8) :`, cfg);
  }

  // MSG6 — TYPE VOL → MSG7 motivation → scan
  if (s.step === 'type_vol') {
    const n = normInput(input, ['direct', 'escale']);
    if (n === '1' || lower.includes('direct')) s.type_vol = 'direct';
    else if (n === '2' || lower.includes('escale')) s.type_vol = 'escale';
    else return sendButtons(phone, { body: `${bar('type_vol')}\n✈️ Vol direct ou avec escale(s) ?`, buttons: [{ text: '✈️ Vol direct' }, { text: '🔄 Avec escale' }] }, cfg);
    s.step = 'scan'; await setState(phone, s);
    // Un seul message (motivation + scan) → réponse immédiate, pas de délai où les taps s'entrecroisent.
    return send(phone, `${bar('scan')}\n🎉 ${s.pax} passager${s.pax > 1 ? 's' : ''} = jusqu'à *${montantTotal(s.pax)} €* (*${montantNet(s.pax)} € nets*, 75%). Robin prélève 25% *uniquement* si vous gagnez. 🤝\n\n⚡ Pour gagner du temps, envoyez une *photo* de votre carte d'embarquement ou e-billet — je lis tout automatiquement.${s.pax > 1 ? `\n👥 Vous êtes ${s.pax} : on demandera la carte de chacun.` : ''}\n\n📎 Envoyez la photo  ·  ✏️ ou tapez *manuel*`, cfg);
  }

  // MSG8 — SCAN
  if (s.step === 'scan') {
    if (mediaUrl) { const d = await ocrBoardingPass(mediaUrl, cfg);
      if (d && (d.vol || d.nom)) { Object.assign(s, { vol: d.vol || s.vol, compagnie: d.compagnie || s.compagnie, date: d.date || s.date, route: d.route || s.route, pnr: d.pnr || s.pnr }); if (d.nom) s.names[0] = d.nom; s.step = 'scan_confirm'; await setState(phone, s);
        return sendButtons(phone, { body: `✅ Document lu !\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date || '—'}${needYear(s.date) ? ' _(année à préciser)_' : ''}\n🎫 PNR : ${s.pnr || '—'}\n👤 Passager : ${s.names[0] || '—'}\n🗺️ Trajet : ${s.route || '—'}\n\nC'est correct ?`, buttons: [{ text: '✅ Oui' }, { text: '✏️ Corriger' }] }, cfg); }
      await send(phone, `😕 La qualité de l'image n'a pas permis la lecture. On fait à la main, ça prend 2 min. 👇`, cfg); s.step = 'm_vol'; await setState(phone, s); return send(phone, `📝 Numéro de vol ? _(ex. AF718, AT540)_`, cfg);
    }
    if (lower.includes('manuel') || lower.includes('manuelle')) { s.step = 'm_vol'; await setState(phone, s); return send(phone, `📝 Numéro de vol ? _(ex. AF718, AT540)_`, cfg); }
    return send(phone, `📎 Envoyez une *photo* de votre carte/e-billet, ou tapez *manuel*.`, cfg);
  }
  if (s.step === 'scan_confirm') {
    const n = normInput(input, ['oui', 'corriger']);
    if (n === '1' || lower.includes('oui')) {
      if (needYear(s.date)) { s.step = 'annee'; await setState(phone, s); return askYear(phone, s, cfg); }
      if (inFuture(s.date)) { s.date = ''; s.step = 'm_date'; await setState(phone, s); return send(phone, FUTURE_JOKE, cfg); }
      return apresVol(phone, s, cfg);
    }
    s.fix_return = 'scan'; await setState(phone, s); return goCorrection(phone, s, cfg);
  }

  // ── MENU DE CORRECTION (champ par champ) ──────────────────────────────────
  if (s.step === 'correction') {
    const n = normInput(input, ['vol', 'date', 'nom', 'trajet']);
    if (n === '1' || lower.includes('vol')) { s.step = 'fix_vol'; await setState(phone, s); return send(phone, `✈️ Vol actuel : *${s.vol || '—'}*\nTapez simplement le *bon numéro* 👇 _(ex. AF718)_`, cfg); }
    if (n === '2' || lower.includes('date')) { s.step = 'fix_date'; await setState(phone, s); return send(phone, `📅 Date actuelle : *${s.date || '—'}*\nTapez simplement la *bonne date* 👇 _(JJ/MM/AAAA)_`, cfg); }
    if (n === '3' || lower.includes('nom')) { s.step = 'fix_nom'; await setState(phone, s); return send(phone, `👤 Nom actuel : *${(s.names && s.names[0]) || '—'}*\nTapez simplement le *bon nom complet* 👇`, cfg); }
    if (n === '4' || lower.includes('trajet') || lower.includes('route')) { s.step = 'fix_route'; await setState(phone, s); return send(phone, `🗺️ Trajet actuel : *${s.route || '—'}*\nTapez simplement le *bon trajet* 👇 _(ex. CDG → DSS)_`, cfg); }
    return goCorrection(phone, s, cfg);
  }
  if (s.step === 'fix_vol') {
    const vol = input.toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z0-9]{3,8}$/.test(vol)) { s.vol = vol; s.compagnie = deduceAirline(vol) || s.compagnie || ''; await setState(phone, s); return afterFix(phone, s, cfg); }
    return send(phone, `Numéro non reconnu (ex. AF718). Renvoyez-le :`, cfg);
  }
  if (s.step === 'fix_date') {
    const m = input.match(/(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})/);
    if (m) { const yy = m[3].length === 2 ? '20' + m[3] : m[3]; const d = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${yy}`;
      if (inFuture(d)) return send(phone, FUTURE_JOKE, cfg);
      if (tooOld(d)) { await clearState(phone); return send(phone, `😔 Vol trop ancien (prescription 5 ans). Tapez *menu* si la date est incorrecte.\n\n${STOP_FOOTER}`, cfg); }
      s.date = d; await setState(phone, s); return afterFix(phone, s, cfg);
    }
    return send(phone, `Date non reconnue. Format JJ/MM/AAAA :`, cfg);
  }
  if (s.step === 'fix_nom') {
    if (input.length >= 3 && !/^\d+$/.test(input)) { s.names = s.names || []; s.names[0] = input.toUpperCase(); await setState(phone, s); return afterFix(phone, s, cfg); }
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
      if (inFuture(d)) { await send(phone, `😄 ${year} ? Ce vol n'a pas encore eu lieu — on réclame pour un vol *déjà passé* ! Choisissez la bonne année 👇`, cfg); return askYear(phone, s, cfg); }
      s.date = d;
      if (tooOld(s.date)) { await clearState(phone); return send(phone, `😔 Vol trop ancien — délai légal dépassé.\nLa prescription est de 5 ans. Votre vol date du ${s.date}.\n❓ Si la date est incorrecte, tapez *menu*.\n\n${STOP_FOOTER}`, cfg); }
      await setState(phone, s); return apresVol(phone, s, cfg);
    }
    return askYear(phone, s, cfg);
  }

  // Saisie manuelle vol/date (MSG10) — sert scan raté ET correction
  if (s.step === 'm_vol') {
    const vol = input.toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z0-9]{3,8}$/.test(vol)) { s.vol = vol; s.compagnie = deduceAirline(vol) || s.compagnie || ''; s.step = 'm_date'; await setState(phone, s); return send(phone, `✅ Vol ${vol}${s.compagnie ? ' — ' + s.compagnie : ''}\n\n📅 Date du vol ? _(ex. 15/03/2026)_`, cfg); }
    return send(phone, `Numéro non reconnu (ex. AF718). Renvoyez-le :`, cfg);
  }
  if (s.step === 'm_date') {
    const m = input.match(/(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})/);
    if (m) { const yy = m[3].length === 2 ? '20' + m[3] : m[3]; const d = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${yy}`;
      if (inFuture(d)) return send(phone, FUTURE_JOKE, cfg);
      s.date = d;
      if (tooOld(s.date)) { await clearState(phone); return send(phone, `😔 Vol trop ancien — délai légal dépassé.\nLa prescription est de 5 ans. Votre vol date du ${s.date}.\n❓ Si la date est incorrecte, tapez *menu*.\n\n${STOP_FOOTER}`, cfg); }
      await setState(phone, s); return apresVol(phone, s, cfg);
    }
    return send(phone, `Date non reconnue. Format JJ/MM/AAAA (ex. 15/03/2026) :`, cfg);
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
      if (n === '2' || lower.includes('mineur')) { await clearState(phone); return send(phone, `👶 Passager mineur — signature parentale requise.\nLa loi exige qu'un parent/tuteur signe le mandat.\n📱 Un expert vous rappelle sous 24h.\n\n${STOP_FOOTER}`, cfg); }
      return sendButtons(phone, { body: `${bar('mineurs')}\n👤 Êtes-vous majeur(e) (18+) ?`, buttons: [{ text: '✅ Oui, majeur(e)' }, { text: '👶 Non, mineur(e)' }] }, cfg);
    }
    if (n === '1' || lower.includes('tous majeurs') || lower.includes('majeur')) { s.mineurs = []; await setState(phone, s); return sendRecap(phone, s, cfg); }
    if (n === '2' || lower.includes('mineur')) { s.step = 'mineurs_which'; s.mineurs = []; await setState(phone, s); return send(phone, `👶 Quels passagers sont mineurs ? Donnez leurs noms séparés par une virgule.\n_(${s.names.filter(Boolean).join(', ')})_`, cfg); }
    return sendMineurs(phone, s, cfg);
  }
  if (s.step === 'mineurs_which') { s.mineurs = input.split(',').map(x => x.trim().toUpperCase()).filter(Boolean); await setState(phone, s); return sendRecap(phone, s, cfg); }

  // MSG12 — RÉCAP
  if (s.step === 'recap') {
    const n = normInput(input, ['correct', 'modifier']);
    if (n === '1' || lower.includes('correct')) { s.step = 'documents'; s.doc_idx = 0; await setState(phone, s); return startDocuments(phone, s, cfg); }
    if (n === '2' || lower.includes('modifier')) { s.fix_return = 'recap'; await setState(phone, s); return goCorrection(phone, s, cfg); }
    return sendRecap(phone, s, cfg);
  }

  // MSG13 — DOCUMENTS (passeports 1..n → carte → e-billet → certificat)
  if (s.step === 'doc_pass') {
    if (mediaUrl) { await send(phone, `✅ Passeport de ${s.names[s.doc_idx] || ('passager ' + (s.doc_idx + 1))} reçu ! (${s.doc_idx + 1}/${s.pax})`, cfg); s.doc_idx++; await setState(phone, s); return nextPassport(phone, s, cfg); }
    if (lower === 'passer') { s.docs_pending = true; s.doc_idx++; await setState(phone, s); return nextPassport(phone, s, cfg); }
    return send(phone, `🛂 Envoyez la photo du passeport, ou tapez *passer*.`, cfg);
  }
  if (s.step === 'doc_boarding') {
    if (mediaUrl) { await send(phone, `✅ Carte d'embarquement reçue !`, cfg); return gotoEticket(phone, s, cfg); }
    if (lower === 'passer') { s.docs_pending = true; return gotoEticket(phone, s, cfg); }
    if (lower === 'appel') { s.escalade = 'document_perdu'; await send(phone, `📞 Pas de panique — un expert vous aide à retrouver vos documents. Laissez la conversation ouverte.\n\n${STOP_FOOTER}`, cfg); return gotoEticket(phone, s, cfg); }
    return send(phone, `🎫 Envoyez la carte d'embarquement, ou *passer*, ou *appel* si vous avez tout perdu.`, cfg);
  }
  if (s.step === 'doc_eticket') {
    if (mediaUrl) { await send(phone, `✅ E-billet reçu !`, cfg); return gotoCert(phone, s, cfg); }
    if (lower === 'passer') { s.docs_pending = true; return gotoCert(phone, s, cfg); }
    if (lower === 'appel') { s.escalade = 'document_perdu'; await send(phone, `📞 Un expert vous aide à récupérer votre e-billet. Laissez la conversation ouverte.\n\n${STOP_FOOTER}`, cfg); return gotoCert(phone, s, cfg); }
    return send(phone, `📧 Envoyez l'e-billet (pensez aux spams/Booking), ou *passer*, ou *appel*.`, cfg);
  }
  if (s.step === 'doc_cert') {
    if (mediaUrl) { await send(phone, `✅ Certificat reçu — ça accélère votre dossier !`, cfg); return finaliser(phone, s, cfg); }
    if (lower === 'passer' || lower === 'non') { return finaliser(phone, s, cfg); }
    return send(phone, `📄 Envoyez le certificat de retard (optionnel), ou tapez *passer*.`, cfg);
  }

  if (s.step === 'done') {
    if (!s.ref || !s.mandat_url) { await clearState(phone); return sendAccueil(phone, cfg); } // état périmé → on repart proprement
    return send(phone, `✅ Votre dossier *${s.ref}* est enregistré.\n👉 Signez le mandat : ${s.mandat_url}\n\nPour un nouveau dossier : tapez *menu*.`, cfg);
  }

  // Incompris
  return send(phone, `Je n'ai pas compris. Utilisez les boutons, ou tapez *menu* pour reprendre. 👇`, cfg);
}

// ─── Émetteurs d'écran ───────────────────────────────────────────────────────
async function sendAccueil(phone, cfg) {
  await sendButtons(phone, { body: `${bar('accueil')}\n👋 Bienvenue chez *Robin des Airs* 🏹\nSpécialiste des vols africains retardés ou annulés.\n\n"${pickStat(phone)}"\n\n✈️ La loi européenne CE 261/2004 vous donne droit à *600 € par personne* pour les vols :\n• Au départ de l'Europe — toutes compagnies\n• Vers l'Europe — si compagnie européenne\n\n*0€ si on ne gagne pas.* Aucun risque pour vous.`, footer: 'CE 261/2004', buttons: [{ text: '🚀 Mon indemnité' }] }, cfg);
  await setState(phone, { step: 'langue', phone });
}
async function sendLangue(phone, s, cfg) {
  s.step = 'langue'; await setState(phone, s);
  await sendList(phone, { header: '🌍 Votre langue', body: `${bar('langue')}\n🌍 Dans quelle langue souhaitez-vous être accompagné(e) ?\n\nChez Robin des Airs, nous parlons votre langue — il est toujours plus facile de s'expliquer dans sa langue maternelle. 🤝\n\n_In which language would you like to be assisted?_\n\n🔜 D'autres langues arrivent bientôt.`, buttonText: '🌍 Choisir', items: [
    { title: '🇫🇷 Français', description: 'Européenne' }, { title: '🇬🇧 English', description: 'Européenne' },
    { title: '🇸🇳 Wolof', description: 'Africaine' }, { title: '🇬🇲 Mandinka', description: 'Africaine' }, { title: '🇬🇭 Twi', description: 'Africaine' },
    { title: '🇳🇬 Yoruba', description: 'Africaine' }, { title: '🇬🇳 Peul / Fulfulde', description: 'Africaine' },
  ] }, cfg);
}
async function sendRoute(phone, s, cfg) {
  s.step = 'route'; await setState(phone, s);
  await sendList(phone, { body: `${bar('route')}\n🗺️ Votre vol était sur quelle route ?\nCela détermine si le CE 261/2004 s'applique.`, buttonText: 'Choisir ▾', items: [
    { title: '🌍 Afrique ↔ Europe', description: 'Notre spécialité' }, { title: '🇪🇺 Europe ↔ Europe' }, { title: '🛫 Départ/arrivée Europe' }, { title: '🌐 Autre' },
  ] }, cfg);
}
async function sendIncident(phone, s, cfg) { s.step = 'incident'; await setState(phone, s); await sendButtons(phone, { body: `${bar('incident')}\n✈️ Que s'est-il passé avec votre vol ?`, buttons: [{ text: '⏱️ Retard arrivée' }, { text: '❌ Annulation' }, { text: "🚫 Refus d'embarq." }] }, cfg); }
async function sendPax(phone, s, cfg) {
  s.step = 'nb_pax'; await setState(phone, s);
  await sendList(phone, { body: `${bar('nb_pax')}\n👥 Combien de passagers réclament sur ce vol ?`, buttonText: 'Nombre ▾', items: [
    { title: '1 passager', description: '600 €' }, { title: '2 passagers', description: '1 200 €' }, { title: '3 passagers', description: '1 800 €' }, { title: '4 passagers', description: '2 400 €' }, { title: '5 passagers', description: '3 000 €' }, { title: '6 ou plus', description: 'On gère votre groupe' },
  ] }, cfg);
}
async function askYear(phone, s, cfg) {
  s.step = 'annee'; await setState(phone, s);
  const ys = recentYears();
  await sendList(phone, { header: 'Année du vol', body: `${bar('annee')}\n📅 Quelle *année* pour le ${s.date} ?\n_(elle n'est pas imprimée sur la carte — je ne veux pas la deviner)_`, buttonText: 'Année ▾', items: ys.map(y => ({ title: String(y) })).concat([{ title: `Avant ${ys[ys.length - 1]}` }]) }, cfg);
}
async function goCorrection(phone, s, cfg) {
  s.step = 'correction'; await setState(phone, s);
  await sendList(phone, { header: 'Corriger', body: `✏️ Que souhaitez-vous corriger ?`, buttonText: 'Corriger ▾', items: [
    { title: '✈️ Vol', description: s.vol || '—' },
    { title: '📅 Date', description: s.date || '—' },
    { title: '👤 Nom', description: (s.names && s.names[0]) || '—' },
    { title: '🗺️ Trajet', description: s.route || '—' },
  ] }, cfg);
}
async function showScanConfirm(phone, s, cfg) {
  s.step = 'scan_confirm'; await setState(phone, s);
  return sendButtons(phone, { body: `📋 Vérifiez :\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date || '—'}${needYear(s.date) ? ' _(année à préciser)_' : ''}\n🎫 PNR : ${s.pnr || '—'}\n👤 Passager : ${(s.names && s.names[0]) || '—'}\n🗺️ Trajet : ${s.route || '—'}\n\nC'est correct ?`, buttons: [{ text: '✅ Oui' }, { text: '✏️ Corriger' }] }, cfg);
}
async function afterFix(phone, s, cfg) {
  if (s.fix_return === 'recap') return sendRecap(phone, s, cfg);
  return showScanConfirm(phone, s, cfg);
}
async function estimationPuisPax(phone, s, cfg) { s.step = 'nb_pax'; await setState(phone, s); await send(phone, `💡 Votre vol avec *${s.incident_libelle}* = potentiellement *600 € par passager*. Continuons !`, cfg); return sendPax(phone, s, cfg); }
async function sendMineurs(phone, s, cfg) {
  s.step = 'mineurs'; await setState(phone, s);
  if (s.pax === 1) return sendButtons(phone, { body: `${bar('mineurs')}\n👤 Êtes-vous majeur(e) (18+) ?`, buttons: [{ text: '✅ Oui, majeur(e)' }, { text: '👶 Non, mineur(e)' }] }, cfg);
  return sendButtons(phone, { body: `${bar('mineurs')}\n👶 Parmi les ${s.pax} passagers, y a-t-il des mineurs (–18 ans) ?`, buttons: [{ text: '✅ Tous majeurs' }, { text: '👶 Des mineurs' }] }, cfg);
}
async function sendRecap(phone, s, cfg) {
  s.step = 'recap'; await setState(phone, s);
  const noms = (s.names || []).filter(Boolean).join(', ') || '—';
  await sendButtons(phone, { body: `${bar('recap')}\n📋 *Récapitulatif — confirmez svp*\n\n👥 ${s.pax} passager${s.pax > 1 ? 's' : ''} : ${noms}\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n🎫 PNR : ${s.pnr || '—'}\n🗺️ ${s.route || '—'}\n📅 ${s.date || '—'} — ${s.incident_libelle || '—'}\n🛤️ ${s.type_vol === 'escale' ? 'Avec escale' : 'Direct'}\n💵 Objectif : *${montantNet(s.pax)} € nets* (75%)`, buttons: [{ text: '✅ Tout est correct' }, { text: '✏️ Modifier' }] }, cfg);
}

// après vol+date connus → collecte des noms manquants
async function apresVol(phone, s, cfg) {
  s.names = s.names || [];
  s.name_idx = s.names[0] ? 1 : 0;
  s.step = 'names'; await setState(phone, s);
  return askName(phone, s, cfg);
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
  s.step = 'doc_pass'; s.doc_idx = 0; await setState(phone, s);
  await send(phone, `${bar('documents')}\n📁 Documents — dernière étape avant que votre dossier soit complet !\nQuelques photos pour constituer le dossier officiel. Temps estimé : ${s.pax} min. Tout est conservé en sécurité. 🔒`, cfg);
  return nextPassport(phone, s, cfg);
}
async function nextPassport(phone, s, cfg) {
  if (s.doc_idx >= s.pax) { return gotoBoarding(phone, s, cfg); }
  s.step = 'doc_pass'; await setState(phone, s);
  return send(phone, `🛂 Passeport ${s.doc_idx + 1}/${s.pax} — ${s.names[s.doc_idx] || ('passager ' + (s.doc_idx + 1))}\nEnvoyez la photo de la page passeport.\n✏️ Tapez *passer* pour l'envoyer plus tard.`, cfg);
}
async function gotoBoarding(phone, s, cfg) { s.step = 'doc_boarding'; await setState(phone, s); return send(phone, `🎫 Carte d'embarquement\nEnvoyez-en une photo pour le vol concerné.\n📧 Pas de carte ? Votre e-billet fonctionne aussi.\n✏️ *passer* · 📞 *appel* si tout perdu.`, cfg); }
async function gotoEticket(phone, s, cfg) { s.step = 'doc_eticket'; await setState(phone, s); return send(phone, `📧 Confirmation de réservation (e-billet)\nEnvoyez une capture (pensez aux spams / appli Booking).\n✏️ *passer* · 📞 *appel*.`, cfg); }
async function gotoCert(phone, s, cfg) { s.step = 'doc_cert'; await setState(phone, s); return send(phone, `📄 Certificat de retard/annulation (optionnel)\nSi la compagnie vous en a remis un, envoyez-le.\n✏️ Tapez *passer* si vous n'en avez pas (cas fréquent).`, cfg); }

// MSG14 — RGPD + mandat + reçu + clôture
async function finaliser(phone, s, cfg) {
  s.ref = genRef(); s.mandat_url = buildMandatUrl(s, phone); s.step = 'done'; await setState(phone, s);
  const nom = (s.names && s.names[0]) || '—';
  await send(phone, `${bar('documents')}\n🔒 Avant la signature, votre vie privée d'abord.\nVos documents servent uniquement à réclamer votre indemnité. Jamais vendus ni partagés. Suppression possible à tout moment.\nEn continuant, vous acceptez :\n• Confidentialité : robindesairs.eu/politique-confidentialite\n• CGV : robindesairs.eu/cgv`, cfg);
  await sendDelayed(phone, `🎉 Dossier enregistré ! Réf. *${s.ref}*\n\n👤 ${nom}\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n🗺️ ${s.route || '—'}\n📅 ${s.date || '—'} — ${s.incident_libelle || '—'}\n💵 Objectif : *${montantNet(s.pax)} € nets*\n\nDernière étape : signez le mandat en 2 minutes.`, cfg, 700);
  await sendDelayed(phone, `${bar('done')}\n✅ Dossier ${s.ref}\nSignez votre *mandat de représentation* (lisible avant signature). Aucune info bancaire à cette étape.\n\n👉 ${s.mandat_url}\n\nSans signature, nous ne pouvons pas agir en votre nom.\n${STOP_FOOTER} 🏹`, cfg, 700);
  await sendDelayed(phone, `🤝 Chez Robin des Airs, l'accompagnement est humain.\nVotre dossier est entre les mains d'un expert qui suivra chaque étape jusqu'au paiement.\n\n*L'IA ouvre le dossier. L'humain le gagne.* 🏹`, cfg, 700);
  try { const makeUrl = process.env.MAKE_WEBHOOK_NEW_DOSSIER; if (makeUrl) await fetch(makeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s, phone, source: 'wati-bot-v8' }) }); } catch (e) {}
}

// reprise d'étape (T1) — renvoie l'écran courant
async function relancerEtape(phone, s, cfg) {
  switch (s.step) {
    case 'langue': return sendLangue(phone, s, cfg);
    case 'route': return sendRoute(phone, s, cfg);
    case 'incident': return sendIncident(phone, s, cfg);
    case 'nb_pax': return sendPax(phone, s, cfg);
    case 'mineurs': return sendMineurs(phone, s, cfg);
    case 'recap': return sendRecap(phone, s, cfg);
    case 'names': return askName(phone, s, cfg);
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
    list.push({ phone, text: String(text || '').slice(0, 4096), mediaUrl, dedupId: key, hasId: !!realId, interactive: !!(listReply || btnReply) });
  };
  if (Array.isArray(payload)) { payload.forEach(push); return list; }
  push(payload);
  if (Array.isArray(payload.messages)) payload.messages.forEach(push);
  if (payload.data && typeof payload.data === 'object') push(payload.data);
  return list;
}
function verifyWatiSecret(body, headers, query) {
  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim(); if (!expected) return true;
  const h = headers || {}, q = query || {};
  return (body && body.secret) === expected || h['x-wati-secret'] === expected || h['X-Wati-Secret'] === expected || q.s === expected || q.secret === expected;
}

exports.handler = async (event) => {
  LAMBDA_EVENT = event;
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    const key = (process.env.WATI_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
    if (q.debug === 'inbound' && key && q.key === key) return { statusCode: 200, headers: HEADERS, body: JSON.stringify((await readInboundDebug()) || { none: true }) };
    if (q.debug === 'interactive' && key && q.key === key) return { statusCode: 200, headers: HEADERS, body: JSON.stringify((await readInteractiveDebug()) || { none: true }) };
    // Self-test liste cliquable : ?selftest=list&key=SECRET&to=33XXXXXXXXX
    if (q.selftest === 'list' && key && q.key === key && q.to) {
      const cfg = watiCfg();
      await sendList(q.to, { header: 'Test liste', body: '🧪 Test liste cliquable Robin', buttonText: 'Choisir', items: [{ title: 'Option 1', description: 'desc 1' }, { title: 'Option 2', description: 'desc 2' }, { title: 'Option 3' }] }, cfg);
      const dbg = await readInteractiveDebug();
      const type = dbg && dbg.resp && dbg.resp.message && dbg.resp.message.type;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ sent: true, watiMessageType: type, interactif: type && type !== 'text', resp: dbg }) };
    }
    return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Forbidden' }) };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST only' }) };
  let body; try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
  if (!verifyWatiSecret(body, event.headers || {}, event.queryStringParameters || {})) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Secret invalide' }) };
  const cfg = watiCfg(); const items = extractInbound(body);
  try { await saveInboundDebug(event.body || '{}', items); } catch {}
  for (const { phone, text, mediaUrl, dedupId, hasId, interactive } of items) {
    if (!phone) continue;
    if (await isDuplicateMessage(dedupId, hasId)) continue;
    // Absorbe les double-taps du même bouton/liste (id WATI différent mais même contenu) sur ~60 s.
    if (interactive && await isDuplicateMessage(`ck|${phone}|${String(text).trim().toLowerCase()}`, false, 12000)) continue;
    try { await appendWaMessage(event, phone, { role: 'user', text, source: 'wati-v8' }); } catch {}
    notifyOwnerWhatsApp(phone, text).catch(() => {}); // fire-and-forget : ne ralentit plus la réponse au client
    try { await handleMessage(phone, text, cfg, mediaUrl); }
    catch (e) { console.error('v8 handleMessage error', e.message, e.stack); if (cfg) await send(phone, `Une erreur est survenue. Tapez *menu* pour recommencer.`, cfg); }
  }
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, processed: items.length }) };
};

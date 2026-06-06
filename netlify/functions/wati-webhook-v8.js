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
const { pickVariant } = require('./lib/bot-variants');

let LAMBDA_EVENT = null;
function botStore() { return getBlobStore(LAMBDA_EVENT, 'robin-bot-v8'); }

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
  recap: 7, documents: 7, doc_pass: 7, doc_pass_confirm: 7, doc_mandant: 7, doc_name: 7, doc_dob: 7, doc_boarding: 7, doc_eticket: 7, doc_cert: 7, rgpd: 7,
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
      method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, footer: footer || 'robindesairs.eu', buttons: buttons.slice(0, 3).map(b => ({ text: clip(b.text, 20) })) }),
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
// Guard fallback : re-lit l'état avant de re-poser une question.
// Si le step a changé (doublon concurrent traité en premier), on ignore silencieusement.
async function safeFallback(phone, expectedStep, fn) {
  try { const cur = await getState(phone); if (cur && cur.step !== expectedStep) return; } catch {}
  return fn();
}
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
    const now = Date.now(); const w = windowMs || (hasId ? 600000 : 60000);
    const prev = await st.get(k, { type: 'json' });
    if (prev && prev.t && (now - prev.t) < w) return true;
    await st.setJSON(k, { t: now }); return false; // 2 ops max — pas de claim pour éviter timeout
  } catch { return false; }
}

// ─── Utilitaires ────────────────────────────────────────────────────────────────
function genRef() { const d = new Date(); return `RDA-${d.toISOString().slice(0,10).replace(/-/g,'')}-${hashStr(String(d.getTime())).toString(36).slice(-4).toUpperCase()}`; }
function normInput(raw, options) { const t = (raw || '').trim().toLowerCase(); if (/^\d+$/.test(t)) return t; const i = options.findIndex(o => t.includes(o.toLowerCase())); return i >= 0 ? String(i + 1) : t; }
const AIRLINES = { AF: 'Air France', SN: 'Brussels Airlines', TP: 'TAP Air Portugal', AT: 'Royal Air Maroc', HC: 'Air Sénégal', KQ: 'Kenya Airways', ET: 'Ethiopian Airlines', EK: 'Emirates', TK: 'Turkish Airlines', KL: 'KLM', LH: 'Lufthansa', IB: 'Iberia', EJU: 'easyJet', U2: 'easyJet', FR: 'Ryanair', TO: 'Transavia', KP: 'ASKY', DN: 'Senegal Airlines' };
function deduceAirline(vol) { const m = (vol || '').toUpperCase().match(/^([A-Z]{2,3})\d/); return (m && AIRLINES[m[1]]) || ''; }
// Extrait l'index de ligne (0-based) depuis un ID WATI de liste format "sectionIdx-rowIdx" : "0-2"→2, "0-0"→0
// NE traite PAS les IDs numériques simples ("1","2") qui sont des IDs de boutons WATI, pas des lignes de liste.
function listRowIdx(id) { if (!id) return -1; const m = /^\d+-(\d+)$/.exec(id); return m ? parseInt(m[1]) : -1; }
function buildMandatUrl(s, phone) {
  const mandant = (s.passengers && s.passengers[s.mandant_idx != null ? s.mandant_idx : 0]) || {};
  const p = new URLSearchParams({ ref: s.ref || '', phone: phone || '', name: mandant.name || (s.names && s.names[0]) || s.nom || '', vol: s.vol || '', date: s.date || '', pnr: s.pnr || '', route: s.route || '', compagnie: s.compagnie || '', motif: s.incident_libelle || '', indemnite: '600', pax: String(s.pax || 1), lang: s.langue_code || 'fr', source: 'wati-bot-v8', cid: phone || '', lsa: new Date().toISOString(), address: mandant.adresse || '' });
  return `https://robindesairs.eu/mandat.html?${p.toString()}`;
}

// ─── Lien court DURABLE : stocke le dossier (Netlify Blobs) → mandat.html?r=REF ──
function isoDob(d) { const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` : ''; }
function cleanName(n) { n = String(n || '').trim(); if (n.includes('/')) { const a = n.split('/'); return ((a[1] || '').trim() + ' ' + (a[0] || '').trim()).trim(); } return n; }
function buildDossier(s, phone) {
  const idx = s.mandant_idx != null ? s.mandant_idx : 0;
  const mandant = (s.passengers && s.passengers[idx]) || {};
  const name = cleanName(mandant.name || (s.names && s.names[0]) || s.nom || '');
  const passengers = (s.passengers || []).slice(0, s.pax || 1).map(p => ({ name: cleanName(p && p.name || ''), dob: isoDob(p && p.dob) }));
  return { ref: s.ref || '', name, dob: isoDob(mandant.dob), address: mandant.adresse || '', phone: phone || '',
    vol: s.vol || '', compagnie: s.compagnie || '', pnr: s.pnr || '', date: s.date || '', motif: s.incident_libelle || '',
    indemnite: 600, pax: s.pax || 1, lang: s.langue_code || 'fr', passengers, cid: phone || '', lsa: new Date().toISOString() };
}
async function storeDossier(ref, dossier) {
  try {
    const r = await fetch('https://robindesairs.eu/api/dossier-store', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, dossier, secret: (process.env.WATI_WEBHOOK_SECRET || '').trim() }) });
    return r.ok;
  } catch (e) { console.error('storeDossier', e.message); return false; }
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
// OCR passeport / CNI : lit nom + prénom + date de naissance (la magie aussi sur le passeport).
async function ocrPassport(mediaUrl, cfg) {
  const key = process.env.OPENAI_API_KEY; if (!key || !mediaUrl) return null;
  try {
    const imgRes = await fetch(mediaUrl, { headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {} });
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
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
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

// ═══════════════ MACHINE À ÉTATS v8 ═══════════════
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
  if (['menu', 'start', 'reprendre', 'continuer', 'suite', 'bonjour', 'hello', 'hi', 'salut'].includes(lower)) {
    const cur = await getState(phone);
    if (cur && cur.step && cur.step !== 'accueil' && cur.step !== 'done') { await send(phone, `👋 Re-bonjour ! On reprend votre dossier là où vous vous étiez arrêté.`, cfg); return relancerEtape(phone, cur, cfg); }
    await clearState(phone); return sendAccueil(phone, cfg);
  }

  let s = await getState(phone);

  // T2 — fallback IA hors-flux (question libre) → réponse + boutons
  // ⚠️ Jamais intercepté si c'est une réponse interactive (bouton/liste) : replyId présent → flux prioritaire
  try {
    const { isClientQuestion, isSensitive, answerClientQuestion } = require('./lib/robin-ai-responder');
    const FREE = ['m_vol', 'm_date', 'm_route', 'names', 'vd_vol', 'vd_date', 'mineurs_which', 'fix_vol', 'fix_date', 'fix_nom', 'fix_route', 'names_fix_which', 'names_fix_one', 'doc_name', 'doc_dob'];
    const looks = !id && (FREE.includes(s.step) ? input.includes('?') : isClientQuestion(input));
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
    // Matching par ID WATI liste ("0-N") si disponible, sinon par texte/flag
    const ri = listRowIdx(id);
    const langArr = Object.values(LANGS);
    const L = (ri >= 0 && langArr[ri]) ? langArr[ri] : matchLang(input);
    if (!L) return sendLangue(phone, s, cfg);
    s.langue = `${L.flag} ${L.label}`; s.langue_code = L.code;
    if (L.africaine) { s.escalade = 'langue_africaine'; await send(phone, `${L.natif}\n📱 +33 7 56 86 36 30\n\n🤝 Votre dossier est entre de bonnes mains.\n📞 Un expert parlant votre langue *vous appellera* pour vous accompagner.\nEn attendant, je continue à vous guider en français. 👇`, cfg); }
    s.step = 'route'; await setState(phone, s); return sendRoute(phone, s, cfg);
  }

  // MSG3 — ROUTE
  if (s.step === 'route') {
    // Matching prioritaire : ID WATI de la liste (format "sectionIdx-rowIdx", 0-based)
    const ri = listRowIdx(id); // 0=Afrique↔EU, 1=EU↔EU, 2=Départ/arr EU, 3=Autre
    const n = normInput(input, ['afrique', 'europe ↔', 'départ', 'autre']);
    if (ri === 0 || n === '1' || (lower.includes('afrique') && lower.includes('europe'))) { s.route_type = 'af_eu'; }
    else if (ri === 1 || n === '2' || (lower.includes('europe') && !lower.includes('afrique') && !lower.includes('départ') && !lower.includes('arrivée'))) { s.route_type = 'eu_eu'; await send(phone, `🇪🇺 Les vols intra-européens sont couverts par le CE 261 ✅\nNotre spécialité c'est Afrique ↔ Europe, mais on continue.`, cfg); }
    else if (ri === 2 || n === '3' || (lower.includes('départ') && !lower.includes('retard'))) { s.route_type = 'mixte'; await send(phone, `🛫 Un départ ou une arrivée en Europe peut être éligible. Vérifions ensemble. ✅`, cfg); }
    else if (ri === 3 || n === '4' || lower.includes('autre')) { await clearState(phone); return send(phone, `${pickVariant(phone, 'STOP_HORS_EUROPE')}\n\n${STOP_FOOTER}`, cfg); }
    else return redispatch('route'); // si l'état a avancé → re-dispatch, sinon silence
    s.step = 'incident'; await setState(phone, s); return sendIncident(phone, s, cfg);
  }

  // MSG4 — INCIDENT
  if (s.step === 'incident') {
    const n = normInput(input, ['retard', 'annulation', 'refus']);
    if (n === '1' || lower.includes('retard')) { s.step = 'duree'; await setState(phone, s); return sendButtons(phone, { body: pickVariant(phone, 'REACTION_RETARD'), buttons: [{ text: '✅ Plus de 3 heures' }, { text: '❌ Moins de 3h' }, { text: '🤔 Je ne sais plus' }] }, cfg); }
    if (n === '2' || lower.includes('annul')) { s.incident = 'annulation'; s.incident_libelle = 'Annulation'; }
    else if (n === '3' || lower.includes('refus') || lower.includes('embarq')) { s.incident = 'refus'; s.incident_libelle = "Refus d'embarquement"; }
    else return redispatch('incident'); // si état avancé → re-dispatch
    await send(phone, pickVariant(phone, s.incident === 'annulation' ? 'REACTION_ANNULATION' : 'REACTION_REFUS'), cfg);
    await estimationPuisPax(phone, s, cfg); return;
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
    if (n >= 1 && n <= 5) { s.pax = n; s.names = []; s.step = 'type_vol'; await setState(phone, s); return sendButtons(phone, { body: `${bar('type_vol')}\n✈️ C'était un vol direct ou avec escale(s) ?`, buttons: [{ text: '✈️ Vol direct' }, { text: '🔄 Avec escale' }] }, cfg); }
    if (n >= 6 || lower.includes('6 ou plus') || lower.includes('plus')) { s.step = 'nb_pax_exact'; await setState(phone, s); return send(phone, `${bar('nb_pax')}\n👥 *Combien de passagers en tout ?*\nIndiquez le nombre total (ex. 8). On gère votre groupe directement ici. 🤝`, cfg); }
    return; // silence
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
        return sendButtons(phone, { body: `${pickVariant(phone, 'SCAN_REUSSI')}\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date || '—'}\n🎫 PNR : ${s.pnr || '—'}\n👤 Passager : ${s.names[0] || '—'}\n🗺️ Trajet : ${s.route || '—'}\n\nTout est correct ?`, buttons: [{ text: '✅ Oui' }, { text: '✏️ Corriger' }] }, cfg); }
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
      if (tooOld(d)) { await clearState(phone); return send(phone, `${pickVariant(phone, 'PRESCRIPTION_5ANS')}\n\n${STOP_FOOTER}`, cfg); }
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
      if (tooOld(s.date)) { await clearState(phone); return send(phone, `${pickVariant(phone, 'PRESCRIPTION_5ANS')}\n\n${STOP_FOOTER}`, cfg); }
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
      if (tooOld(s.date)) { await clearState(phone); return send(phone, `${pickVariant(phone, 'PRESCRIPTION_5ANS')}\n\n${STOP_FOOTER}`, cfg); }
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
    if (lower === 'passer') { s.passengers[s.doc_idx] = { skipped: true }; s.docs_pending = true; s.doc_idx++; await setState(phone, s); return nextPassport(phone, s, cfg); }
    if (lower.includes('saisir') || lower.includes('manuel') || lower.includes('tape')) { s.step = 'doc_name'; await setState(phone, s); return send(phone, `👤 *Passager ${s.doc_idx + 1}* — Nom et prénom ?\n_(ex : Aminata Diallo)_`, cfg); }
    return send(phone, `🛂 Envoyez la *photo de la pièce d'identité*, tapez *saisir* (nom + date de naissance), ou *passer*.`, cfg);
  }
  if (s.step === 'doc_pass_confirm') {
    s.passengers = s.passengers || [];
    // Nouvelle photo → re-OCR immédiat
    if (mediaUrl) { delete s.doc_pending; return askOcrConfirm(phone, s, cfg, mediaUrl); }
    const n = normInput(input, ['correct', 'corriger']);
    const ok = n === '1' || id === 'pass_ok' || lower.includes('correct') || lower.startsWith('oui') || lower === 'ok' || lower.includes('parfait') || lower.includes('exact');
    const fix = n === '2' || id === 'pass_fix' || lower.includes('corrig') || lower.startsWith('non') || lower.includes('erreur') || lower.includes('faux');
    if (ok) {
      s.passengers[s.doc_idx] = s.doc_pending || { viaPhoto: true };
      delete s.doc_pending; s.doc_idx++; await setState(phone, s);
      return nextPassport(phone, s, cfg);
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
      const addrNote = chosen.adresse
        ? `\n📍 Adresse détectée : *${chosen.adresse}*\n_(pré-remplie sur le mandat — modifiable si besoin)_`
        : `\n_(Aucune adresse lue sur la pièce — vous la saisirez sur le mandat.)_`;
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
    const m = input.match(/(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})/);
    if (m) { const yy = m[3].length === 2 ? '19' + m[3] : m[3]; const dob = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${yy}`;
      const minor = isMinorAt(dob, s.date);
      const p = s.passengers[s.doc_idx] || {}; p.dob = dob; p.minor = minor; s.passengers[s.doc_idx] = p;
      await send(phone, `✅ ${p.name || ('Passager ' + (s.doc_idx + 1))} — ${dob}${minor ? ' 👶 _(mineur·e : signature parentale requise)_' : ''}`, cfg);
      s.doc_idx++; await setState(phone, s); return nextPassport(phone, s, cfg);
    }
    return send(phone, `Date non reconnue. Format JJ/MM/AAAA (ex. 05/09/2012) :`, cfg);
  }
  if (s.step === 'doc_boarding') {
    if (mediaUrl) { await send(phone, `✅ Carte d'embarquement reçue !`, cfg); return gotoEticket(phone, s, cfg); }
    if (lower === 'passer') { s.docs_pending = true; return gotoEticket(phone, s, cfg); }
    if (lower === 'appel') { s.escalade = 'document_perdu'; await send(phone, `📞 Vos documents égarés ? Désolés — c'est bien la dernière chose dont vous aviez besoin. Pas d'inquiétude : on peut souvent reconstituer ce qu'il faut.\n\nUn expert Robin des Airs vous aide directement à retrouver les pièces. Gardez cette conversation ouverte — on vous recontacte très vite. 🤝\n\n${STOP_FOOTER}`, cfg); return gotoEticket(phone, s, cfg); }
    return send(phone, `🎫 Envoyez la carte d'embarquement, ou *passer*, ou *appel* si vous avez tout perdu.`, cfg);
  }
  if (s.step === 'doc_eticket') {
    if (mediaUrl) { await send(phone, `✅ E-billet reçu !`, cfg); return gotoCert(phone, s, cfg); }
    if (lower === 'passer') { s.docs_pending = true; return gotoCert(phone, s, cfg); }
    if (lower === 'appel') { s.escalade = 'document_perdu'; await send(phone, `📞 Pas de souci pour l'e-billet — un expert vous aide à le retrouver. Laissez la conversation ouverte, on revient vers vous très vite. 🤝\n\n${STOP_FOOTER}`, cfg); return gotoCert(phone, s, cfg); }
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
async function sendRoute(phone, s, cfg) {
  s.step = 'route'; await setState(phone, s);
  await sendList(phone, { body: `${bar('route')}\n🗺️ Votre vol était sur quelle route ?\nCela détermine si le CE 261/2004 s'applique.`, buttonText: 'Choisir ▾', items: [
    { title: '🌍 Afrique ↔ Europe', description: 'Notre spécialité' }, { title: '🇪🇺 Europe ↔ Europe' }, { title: '🛫 Départ/arrivée Europe' }, { title: '🌐 Autre' },
  ] }, cfg);
}
async function sendIncident(phone, s, cfg) { s.step = 'incident'; await setState(phone, s); await sendButtons(phone, { body: `${bar('incident')}\n✈️ Racontez-nous ce qui s'est passé avec votre vol. On est là pour vous aider.`, buttons: [{ text: '⏱️ Retard arrivée' }, { text: '❌ Annulation' }, { text: "🚫 Refus d'embarq." }] }, cfg); }
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
  ] }, cfg);
}
async function showScanConfirm(phone, s, cfg) {
  s.step = 'scan_confirm'; await setState(phone, s);
  return sendButtons(phone, { body: `📋 Vérifiez :\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date || '—'}\n🎫 PNR : ${s.pnr || '—'}\n👤 Passager : ${(s.names && s.names[0]) || '—'}\n🗺️ Trajet : ${s.route || '—'}\n\nC'est correct ?`, buttons: [{ text: '✅ Oui' }, { text: '✏️ Corriger' }] }, cfg);
}
async function afterFix(phone, s, cfg) {
  if (s.fix_return === 'recap') return sendRecap(phone, s, cfg);
  return showScanConfirm(phone, s, cfg);
}
async function estimationPuisPax(phone, s, cfg) { s.step = 'nb_pax'; await setState(phone, s); await send(phone, pickVariant(phone, 'ESTIMATION_QUALIFICATION'), cfg); return sendPax(phone, s, cfg); }
async function sendMineurs(phone, s, cfg) {
  s.step = 'mineurs'; await setState(phone, s);
  if (s.pax === 1) return sendButtons(phone, { body: `${bar('mineurs')}\n👤 Êtes-vous majeur(e) (18+) ?`, buttons: [{ text: '✅ Oui, majeur(e)' }, { text: '👶 Non, mineur(e)' }] }, cfg);
  return sendButtons(phone, { body: `${bar('mineurs')}\n👶 Parmi les ${s.pax} passagers, y a-t-il des mineurs (–18 ans) ?`, buttons: [{ text: '✅ Tous majeurs' }, { text: '👶 Des mineurs' }] }, cfg);
}
async function sendRecap(phone, s, cfg) {
  s.step = 'recap'; await setState(phone, s);
  await sendButtons(phone, { body: `${bar('recap')}\n📋 *Récapitulatif — confirmez svp*\n\n👥 ${s.pax} passager${s.pax > 1 ? 's' : ''}\n_Identités à l'étape suivante (pièce d'identité ou saisie)_\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n🎫 PNR : ${s.pnr || '—'}\n🗺️ ${s.route || '—'}\n📅 ${s.date || '—'} — ${s.incident_libelle || '—'}\n🛤️ ${s.type_vol === 'escale' ? 'Avec escale' : 'Direct'}\n💵 Potentiellement *${montantNet(s.pax)} € nets* pour vous (75 %)`, buttons: [{ text: '✅ Tout est correct' }, { text: '✏️ Modifier' }] }, cfg);
}

// après vol+date connus → collecte des noms manquants
async function apresVol(phone, s, cfg) {
  // Plus de question mineurs : l'âge vient du passeport / de la date de naissance (étape documents).
  s.names = s.names || [];
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
  s.step = 'doc_pass'; s.doc_idx = 0; await setState(phone, s);
  await send(phone, `${bar('documents')}\n📁 Dernière ligne droite ! Quelques justificatifs et votre dossier est complet.\nC'est rapide (~${s.pax} min), une simple photo suffit. Tout est conservé en sécurité. 🔒`, cfg);
  return nextPassport(phone, s, cfg);
}
async function nextPassport(phone, s, cfg) {
  if (s.doc_idx >= s.pax) { return askMandant(phone, s, cfg); }
  s.step = 'doc_pass'; await setState(phone, s);
  return send(phone, `🛂 *Passager ${s.doc_idx + 1} sur ${s.pax}*\n📸 Envoyez la *photo d'une pièce d'identité* (passeport, CNI, titre de séjour…) — nom + date de naissance lus automatiquement.\n✍️ Pas de pièce sous la main ? Tapez *saisir* (nom + date de naissance).\n⏭️ Ou *passer* pour plus tard.`, cfg);
}
async function askMandant(phone, s, cfg) {
  // 1 seul passager → signataire évident, pas de question
  if (s.pax <= 1) { s.mandant_idx = 0; await setState(phone, s); return gotoBoarding(phone, s, cfg); }
  s.step = 'doc_mandant'; await setState(phone, s);
  const names = (s.passengers || []).slice(0, s.pax).map((p, i) => p.name || `Passager ${i + 1}`);
  await send(phone, `✅ Toutes les pièces sont collectées !\n\n*Qui va signer le mandat ?*\n_(Souvent vous — la personne qui ouvre le dossier.)_`, cfg);
  if (names.length <= 3) {
    return sendButtons(phone, names.map((nm, i) => ({ id: `mdt_${i}`, text: clip(nm, 20) })), cfg);
  }
  return sendList(phone, { header: 'Signataire du mandat', body: 'Qui va signer le mandat ?', buttonText: 'Choisir', items: names.map((nm, i) => ({ id: `mdt_${i}`, title: clip(nm, 24), description: `Passager ${i + 1}` })) }, cfg);
}
async function gotoBoarding(phone, s, cfg) { s.step = 'doc_boarding'; await setState(phone, s); return send(phone, `🎫 Carte d'embarquement\nEnvoyez-en une photo pour le vol concerné.\n📧 Pas de carte ? Votre e-billet fonctionne aussi.\n✏️ *passer* · 📞 *appel* si tout perdu.`, cfg); }
async function gotoEticket(phone, s, cfg) { s.step = 'doc_eticket'; await setState(phone, s); return send(phone, `📧 Confirmation de réservation (e-billet)\nEnvoyez une capture (pensez aux spams / appli Booking).\n✏️ *passer* · 📞 *appel*.`, cfg); }
async function gotoCert(phone, s, cfg) { s.step = 'doc_cert'; await setState(phone, s); return send(phone, `📄 Certificat de retard/annulation (optionnel)\nSi la compagnie vous en a remis un, envoyez-le.\n✏️ Tapez *passer* si vous n'en avez pas (cas fréquent).`, cfg); }

// MSG14 — RGPD + mandat + reçu + clôture
async function finaliser(phone, s, cfg) {
  const pax = s.passengers || [];
  const nom = (pax[0] && pax[0].name) || (s.names && s.names[0]) || '—';
  s.minorsCount = pax.filter(p => p && p.minor).length;
  s.ref = genRef();
  const stored = await storeDossier(s.ref, buildDossier(s, phone)); // stockage durable Blobs
  s.mandat_url = stored ? `https://robindesairs.eu/mandat.html?r=${s.ref}` : buildMandatUrl(s, phone); // lien court si OK, sinon fallback long
  s.step = 'done'; await setState(phone, s);
  const minorNote = s.minorsCount ? `\n👶 ${s.minorsCount} mineur·s : signature d'un parent/tuteur requise (un expert vous guide).` : '';
  await send(phone, `${bar('documents')}\n🔒 Avant la signature, votre vie privée d'abord.\nVos documents servent uniquement à réclamer votre indemnité. Jamais vendus ni partagés. Suppression possible à tout moment.\nEn continuant, vous acceptez :\n• Confidentialité : robindesairs.eu/politique-confidentialite\n• CGV : robindesairs.eu/cgv`, cfg);
  await sendDelayed(phone, `🎉 C'est fait : votre dossier est complet et enregistré. Réf. *${s.ref}*\n\n👤 ${nom}${s.pax > 1 ? ` +${s.pax - 1}` : ''}\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}\n🗺️ ${s.route || '—'}\n📅 ${s.date || '—'} — ${s.incident_libelle || '—'}\n💵 Potentiellement *${montantNet(s.pax)} € nets* pour vous${minorNote}\n\nÀ partir de maintenant, vous n'êtes plus seul·e face à la compagnie. Dernière étape, très simple : votre signature.`, cfg, 700);
  await sendDelayed(phone, `${bar('done')}\n💰 *${s.compagnie || 'La compagnie'} pourrait vous devoir jusqu'à 600 € par passager — Robin va les récupérer pour vous.*\n\n✔️ *0 € si on ne récupère rien.* 25 % de commission uniquement en cas de succès.\n✔️ Aucune info bancaire ici. ✔️ Vols avec correspondance couverts.\n\n👉 *Signez votre mandat (2 min, lisible avant signature) :*\n${s.mandat_url}\n\nUne question, un doute ? On est là, vraiment. Sans signature, on ne peut pas agir en votre nom.\n\n${STOP_FOOTER}`, cfg, 700);
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
    // replyId = l'id sémantique qu'on a mis sur le bouton/la ligne de liste (ex: 'pass_ok', 'mdt_0')
    const replyId = (listReply && listReply.id) || (btnReply && btnReply.id) || null;
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
    list.push({ phone, text: String(text || '').slice(0, 4096), mediaUrl, dedupId: key, hasId: !!realId, interactive: !!(listReply || btnReply), replyId: replyId || '' });
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
  for (const { phone, text, mediaUrl, dedupId, hasId, interactive, replyId } of items) {
    if (!phone) continue;
    // Dédup allégé — 2 Blobs ops max par message (read + write)
    // Couche 1 : mémoire intra-instance (ID stable uniquement, 0 Blobs)
    if (hasId && memSeen(dedupId)) continue;
    // Couche 2 : Blobs ID stable WATI (cross-instance, 10 min) — 2 Blobs ops
    if (hasId && await isDuplicateMessage(dedupId, true)) continue;
    // Couche 3 : contenu sans ID (fallback), fenêtre 5 s — seulement si pas d'ID stable
    const ckKey = `ck|${phone}|${String(text).trim().toLowerCase().slice(0, 200)}`;
    if (!hasId && await isDuplicateMessage(ckKey, false, 5000)) continue;
    try { await appendWaMessage(event, phone, { role: 'user', text, source: 'wati-v8' }); } catch {}
    notifyOwnerWhatsApp(phone, text).catch(() => {}); // fire-and-forget : ne ralentit plus la réponse au client
    try { await handleMessage(phone, text, cfg, mediaUrl, replyId); }
    catch (e) { console.error('v8 handleMessage error', e.message, e.stack); if (cfg) await send(phone, `Une erreur est survenue. Tapez *menu* pour recommencer.`, cfg); }
  }
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, processed: items.length }) };
};

/**
 * Webhook WATI — Bot Robin des Airs v4.0 · Mix v1 (mai) + v3.2
 *
 * URL WATI : Connectors → Webhooks
 *   https://robindesairs.eu/api/wati-webhook
 *
 * Améliorations v4 :
 *   - Pastille progression dynamique sur CHAQUE message
 *   - Saisie manuelle structurée (1 champ à la fois)
 *   - Nom passager principal + compagnie + route demandés
 *   - Confirmation passagers (étape 6) comme v1
 *   - Récap complet avant FIN A/B/C
 *   - Boutons interactifs partout (sendList / sendButtons)
 *   - Commandes globales : menu / restart
 *   - Webhook Make pour création Airtable
 */

const { appendWaMessage, normalizeWaPhone } = require('./lib/wa-convo-store');
const { normalizeWatiPhone, watiCfg } = require('./lib/wati-api');
const { getBlobStore } = require('./lib/netlify-blobs-store');

// Event Lambda courant (posé en tête de handler) → permet à la lib Blobs éprouvée
// de faire connectLambda(event) ou le repli siteID+token, comme radar-today.
let LAMBDA_EVENT = null;
function botStore() { return getBlobStore(LAMBDA_EVENT, 'robin-bot-state'); }
// Garde-fou WATI : texte bouton ≤ 20, titre de liste ≤ 24 (sinon l'API renvoie une erreur).
function clip(s, n) { s = String(s == null ? '' : s); return s.length <= n ? s : s.slice(0, n); }
const { notifyOwnerWhatsApp, notifyOwner } = require('./lib/owner-notify');
const { sendCallMeBot } = require('./lib/callmebot');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

// ─── Progress bar dynamique ──────────────────────────────────────────────────
// Chaque step a une position sur 7 cases (comme v1 mai)
const PROGRESS = {
  accueil: 0, gate: 1, gate_compagnie: 1,
  nb_pax: 1,
  type_vol: 2,
  lang_pref: 2, // langue précoce supprimée — on garde la slot pour compat
  incident: 3, duree_retard: 3, correspondance: 3, remboursements: 3,
  ocr: 3, manuel_vol: 3, manuel_compagnie: 3, manuel_date: 3, manuel_pnr: 3, manuel_route: 3, manuel_nom: 3,
  confirm_ocr: 4,
  annee: 5,
  confirm_pax: 6,
  mineurs: 6,
  email: 7, adresse: 7, langue: 7, done: 7,
};
function bar(step) {
  const n = PROGRESS[step] ?? 0;
  return '🟢'.repeat(Math.max(0, n)) + '⚪'.repeat(Math.max(0, 7 - n));
}

// ─── Envoi message texte simple ───────────────────────────────────────────────
async function send(phone, text, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const params = new URLSearchParams({ messageText: text, channelPhoneNumber: cfg.channel });
  try {
    await fetch(`${cfg.base}/api/v1/sendSessionMessage/${encodeURIComponent(wa)}?${params}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    });
  } catch (e) { console.error('wati-bot: send failed', e.message); }
}

// ─── Liste interactive (jusqu'à 10 options) ──────────────────────────────────
async function sendList(phone, { header, body, footer, buttonText, items }, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const qs = new URLSearchParams({ whatsappNumber: wa, channelPhoneNumber: cfg.channel });
  try {
    const res = await fetch(
      `${cfg.base}/api/v1/sendInteractiveListMessage?${qs.toString()}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: header || '',
          body,
          footer: footer || 'robindesairs.eu',
          buttonText: buttonText || 'Choisir ▾',
          listItems: items.map(i => ({ title: clip(i.title, 24), description: i.description || '' })),
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    // Succès = HTTP 2xx sans erreur explicite. WATI ne renvoie pas toujours `result`
    // même quand le message interactif part bien → ne pas faire de faux fallback.
    const failed = !res.ok || data.result === false || data.error || data.ok === false;
    await saveInteractiveDebug({ fn: 'sendList', endpoint: `${cfg.base}/api/v1/sendInteractiveListMessage`, status: res.status, failed, resp: data });
    if (failed) {
      console.error('wati-bot: sendList failed', res.status, JSON.stringify(data).slice(0, 400));
      const txt = (header ? `*${header}*\n\n` : '') + body + '\n\n' +
        items.map((it, idx) => `${idx + 1} — ${it.title}`).join('\n');
      await send(phone, txt, cfg);
    }
  } catch (e) {
    const txt = body + '\n\n' + items.map((it, idx) => `${idx + 1} — ${it.title}`).join('\n');
    await send(phone, txt, cfg);
  }
}

// ─── Boutons rapides (max 3) ─────────────────────────────────────────────────
async function sendButtons(phone, { body, footer, buttons }, cfg) {
  if (!cfg) return;
  const wa = normalizeWatiPhone(phone);
  const qs = new URLSearchParams({ whatsappNumber: wa, channelPhoneNumber: cfg.channel });
  try {
    const res = await fetch(
      `${cfg.base}/api/v1/sendInteractiveButtonsMessage?${qs.toString()}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          footer: footer || 'robindesairs.eu',
          buttons: buttons.slice(0, 3).map(b => ({ text: clip(b.text, 20) })),
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    const failed = !res.ok || data.result === false || data.error || data.ok === false;
    await saveInteractiveDebug({ fn: 'sendButtons', endpoint: `${cfg.base}/api/v1/sendInteractiveButtonsMessage`, status: res.status, failed, resp: data });
    if (failed) {
      console.error('wati-bot: sendButtons failed', res.status, JSON.stringify(data).slice(0, 400));
      const txt = body + '\n\n' + buttons.map((b, i) => `${i + 1} — ${b.text}`).join('\n');
      await send(phone, txt, cfg);
    }
  } catch (e) {
    const txt = body + '\n\n' + buttons.map((b, i) => `${i + 1} — ${b.text}`).join('\n');
    await send(phone, txt, cfg);
  }
}

async function sendDelayed(phone, text, cfg, ms = 1000) {
  await new Promise(r => setTimeout(r, ms));
  await send(phone, text, cfg);
}

// ─── OCR carte d'embarquement (OpenAI Vision) ────────────────────────────────
// Télécharge l'image WATI, l'envoie à GPT-4o, renvoie {vol,compagnie,date,pnr,route,nom}
async function ocrBoardingPass(mediaUrl, cfg) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || !mediaUrl) return null;
  try {
    // 1. Télécharger l'image depuis WATI (auth Bearer)
    const imgRes = await fetch(mediaUrl, {
      headers: cfg ? { Authorization: `Bearer ${cfg.token}` } : {},
    });
    if (!imgRes.ok) { console.error('OCR: download failed', imgRes.status); return null; }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const b64 = buf.toString('base64');

    // 2. OpenAI Vision — extraction structurée JSON
    const prompt = `Tu es un OCR spécialisé cartes d'embarquement / e-billets d'avion.
Lis l'image et extrais UNIQUEMENT un JSON valide, sans texte autour :
{"vol":"","compagnie":"","date":"","pnr":"","depart":"","arrivee":"","nom":""}
Règles :
- "vol" : numéro de vol (ex: SN301, AF718) en majuscules sans espace
- "compagnie" : nom complet de la compagnie (déduis depuis le code vol si besoin : SN=Brussels Airlines, AF=Air France, TP=TAP, etc.)
- "date" : format JJ/MM/AAAA. Si l'année manque sur le billet, mets JJ/MM sans année.
- "pnr" : code réservation 5-6 caractères alphanumériques
- "depart" / "arrivee" : codes IATA 3 lettres (ex: BJL, CDG)
- "nom" : nom du passager en MAJUSCULES (avec civilité si présente)
- Champ inconnu = chaîne vide "". Ne JAMAIS inventer.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
          ],
        }],
      }),
    });
    const data = await res.json();
    if (!data.choices) { globalThis.__lastOcrErr = (data.error && data.error.message) || JSON.stringify(data).slice(0, 200); console.error('OCR: openai error', globalThis.__lastOcrErr); return null; }
    const parsed = JSON.parse(data.choices[0].message.content);
    return {
      vol: (parsed.vol || '').toUpperCase().replace(/\s+/g, ''),
      compagnie: parsed.compagnie || '',
      date: parsed.date || '',
      pnr: (parsed.pnr || '').toUpperCase().replace(/\s+/g, ''),
      route: parsed.depart && parsed.arrivee ? `${parsed.depart} → ${parsed.arrivee}`.toUpperCase() : '',
      nom: (parsed.nom || '').toUpperCase(),
    };
  } catch (e) {
    console.error('OCR exception', e.message);
    return null;
  }
}

// ─── État conversation ───────────────────────────────────────────────────────
async function getState(phone) {
  try {
    const store = botStore();
    if (!store) throw new Error('blobs indisponible');
    const raw = await store.get(`state/${phone.replace(/\D/g, '')}`, { type: 'json' });
    return raw || { step: 'accueil' };
  } catch { return { step: 'accueil' }; }
}
async function setState(phone, state) {
  try {
    const store = botStore();
    if (!store) throw new Error('blobs indisponible');
    await store.setJSON(`state/${phone.replace(/\D/g, '')}`, { ...state, updatedAt: new Date().toISOString() });
  } catch (e) { console.error('setState failed', e.message); }
}
// ─── Debug : dernière réponse WATI interactive (lisible via GET ?debug=interactive) ──
async function saveInteractiveDebug(obj) {
  try {
    const store = botStore();
    if (!store) throw new Error('blobs indisponible');
    await store.setJSON('debug/last-interactive', { ...obj, ts: new Date().toISOString() });
  } catch (e) { console.error('saveInteractiveDebug failed', e.message); }
}
async function readInteractiveDebug() {
  try {
    const store = botStore();
    if (!store) throw new Error('blobs indisponible');
    return await store.get('debug/last-interactive', { type: 'json' });
  } catch { return null; }
}
// Debug entrant : garde les 8 derniers payloads bruts WATI (lisible via ?debug=inbound)
async function saveInboundDebug(rawBody, items) {
  try {
    const store = botStore();
    if (!store) return;
    const prev = (await store.get('debug/inbound', { type: 'json' })) || [];
    const keys = (() => { try { return Object.keys(JSON.parse(rawBody) || {}); } catch { return []; } })();
    prev.unshift({ ts: new Date().toISOString(), bodyKeys: keys, raw: String(rawBody).slice(0, 1500), extracted: items.map(it => ({ ph: it.phone, txt: it.text, dedupId: it.dedupId, hasId: it.hasId })) });
    await store.setJSON('debug/inbound', prev.slice(0, 8));
  } catch (e) { console.error('saveInboundDebug failed', e.message); }
}
async function readInboundDebug() {
  try {
    const store = botStore();
    if (!store) throw new Error('blobs indisponible');
    return await store.get('debug/inbound', { type: 'json' });
  } catch { return null; }
}

// Dédup PERSISTANTE entre invocations (retries WATI). Fenêtre courte si pas d'id
// (pour ne pas bloquer un vrai message répété légitime), large si id WATI unique.
async function isDuplicateMessage(id, hasId) {
  if (!id) return false;
  try {
    const store = botStore();
    if (!store) throw new Error('blobs indisponible');
    const k = 'seen/' + String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 200);
    const prev = await store.get(k, { type: 'json' });
    const now = Date.now();
    const windowMs = hasId ? 600000 : 60000; // 10 min si id unique, 60 s sinon
    if (prev && prev.t && (now - prev.t) < windowMs) return true;
    await store.setJSON(k, { t: now });
    return false;
  } catch { return false; } // en cas d'échec Blobs, on ne bloque pas le message
}

async function clearState(phone) {
  try {
    const store = botStore();
    if (!store) throw new Error('blobs indisponible');
    await store.delete(`state/${phone.replace(/\D/g, '')}`);
  } catch {}
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function genRef() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RDA-${ymd}-${rand}`;
}
function montantNet(pax = 1) { return 420 * pax; }

function normalizeInput(raw, options) {
  const t = (raw || '').trim().toLowerCase();
  if (/^\d+$/.test(t)) return t;
  const idx = options.findIndex(o => t.includes(o.toLowerCase()));
  if (idx >= 0) return String(idx + 1);
  return t;
}

function buildMandatUrl(s, phone) {
  const p = new URLSearchParams({
    ref: s.ref || '',
    phone: phone || '',
    name: s.nom || '',
    vol: s.vol || '',
    date: s.date || '',
    pnr: s.pnr || '',
    route: s.route || '',
    compagnie: s.compagnie || '',
    motif: s.incident_libelle || '',
    indemnite: '600',
    lang: s.langue_code || 'fr',
    source: 'wati-bot',
  });
  return `https://robindesairs.eu/mandat.html?${p.toString()}`;
}

const INCIDENT_LABELS = {
  '1': 'Retard +3h', '2': 'Vol annulé', '3': 'Refus d\'embarquement', '4': 'Correspondance manquée',
};
const LANGUE_LABELS = {
  '1': { name: '🇫🇷 Français', code: 'fr' },
  '2': { name: '🇬🇧 English', code: 'en' },
  '3': { name: '🇸🇳 Wolof', code: 'wo' },
  '4': { name: '🇲🇱 Bambara', code: 'bm' },
  '5': { name: '🇨🇮 Dioula', code: 'dyu' },
  '6': { name: '🌐 Autre', code: 'other' },
};

// ─── Handler principal — state machine ───────────────────────────────────────
async function handleMessage(phone, text, cfg, mediaUrl) {
  const input = (text || '').trim();
  const lower = input.toLowerCase();

  // Commandes globales
  if (['menu', 'restart', 'recommencer', 'start', 'bonjour', 'hello', 'hi', 'salut'].includes(lower)) {
    await clearState(phone);
    await sendButtons(phone, {
      body: `${bar('accueil')}\n👋 Bienvenue chez *Robin des Airs* 🏹\n\n*Vol retardé, annulé ou surbooké sur un trajet Europe ↔ Afrique ?*\nLa loi vous donne droit à *jusqu'à 600 €* par passager.\n\n⚖️ *Zéro frais.* On prend 25 % uniquement si vous gagnez.\n\n👥 Déjà +1 200 familles indemnisées.\n⏱️ Moins de 10 min pour ouvrir votre dossier.`,
      footer: 'Vous avez 3 ans pour réclamer',
      buttons: [{ text: '✅ Commencer' }],
    }, cfg);
    await setState(phone, { step: 'gate', phone });
    return;
  }

  let s = await getState(phone);

  // ── Intercept "hors-tunnel" : question libre du client → réponse IA (GPT-4o-mini) ──
  // Ne se déclenche QUE sur une vraie question/phrase, pas sur une sélection.
  // Ne modifie pas l'étape : le client peut continuer son dossier juste après.
  try {
    const { isClientQuestion, isSensitive, answerClientQuestion } = require('./lib/robin-ai-responder');
    // Étapes de saisie libre : une adresse/nom/compagnie ne doit PAS être prise pour une question.
    // Sur ces étapes, on n'intercepte que si le message contient explicitement « ? ».
    const FREE_TEXT_STEPS = ['manuel_vol','manuel_compagnie','manuel_date','manuel_pnr','manuel_route','manuel_nom','email','adresse','ocr_waiting','hotel_ask'];
    const askLooks = FREE_TEXT_STEPS.includes(s.step) ? input.includes('?') : isClientQuestion(input);
    if (askLooks) {
      if (isSensitive(input)) {
        await send(phone, `Je comprends, c'est important. Je transmets votre demande à un conseiller Robin des Airs qui vous répondra personnellement. 🙏\n\nEn attendant, vous pouvez ouvrir/continuer votre dossier en tapant *menu*.`, cfg);
        return;
      }
      const aiReply = await answerClientQuestion(input, process.env.OPENAI_API_KEY);
      if (aiReply) {
        await send(phone, aiReply, cfg);
        return;
      }
      // si l'IA échoue, on laisse la machine à états gérer (repli normal)
    }
  } catch (e) { console.error('ai-responder intercept failed', e.message); }

  // ── ACCUEIL ────────────────────────────────────────────────────────────────
  if (s.step === 'accueil' || !s.step) {
    await sendButtons(phone, {
      body: `${bar('accueil')}\n👋 Bienvenue chez *Robin des Airs* 🏹\n\n*Vol retardé, annulé ou surbooké sur un trajet Europe ↔ Afrique ?*\nLa loi vous donne droit à *jusqu'à 600 €* par passager.\n\n⚖️ *Zéro frais.* On prend 25 % uniquement si vous gagnez.\n\n👥 Déjà +1 200 familles indemnisées.\n⏱️ Moins de 10 min pour ouvrir votre dossier.`,
      footer: 'Vous avez 3 ans pour réclamer',
      buttons: [{ text: '✅ Commencer' }],
    }, cfg);
    await setState(phone, { step: 'gate', phone });
    return;
  }

  // ── GATE EUROPE ────────────────────────────────────────────────────────────
  if (s.step === 'gate') {
    const norm = normalizeInput(input, ['europe', 'afrique', 'commencer']);
    if (norm === '1' || lower.includes('commencer')) {
      // Premier message = soit "Commencer" soit "Europe"
      if (lower.includes('commencer')) {
        // affiche gate
        await sendButtons(phone, {
          body: `${bar('gate')}\n✈️ *D'où partait votre vol ?*\n\nPour vérifier que vous êtes couvert par la loi européenne (CE 261).`,
          buttons: [{ text: 'Départ d\'Europe' }, { text: 'Afrique / ailleurs' }],
        }, cfg);
        return;
      }
      s.geo = 'eu'; s.step = 'nb_pax';
      await setState(phone, s);
      await sendList(phone, {
        header: 'Robin des Airs',
        body: `${bar('nb_pax')}\n👥 *Pour combien de passagers réclamez-vous ?*`,
        buttonText: 'Nombre ▾',
        items: [
          { title: '1 passager' }, { title: '2 passagers' }, { title: '3 passagers' },
          { title: '4 passagers' }, { title: '5 passagers' }, { title: '6 ou plus' },
        ],
      }, cfg);
    } else if (norm === '2') {
      s.step = 'gate_compagnie';
      await setState(phone, s);
      await sendButtons(phone, {
        body: `${bar('gate_compagnie')}\nEt la compagnie qui opérait ce vol ?`,
        buttons: [{ text: 'Cie européenne' }, { text: 'Africaine / autre' }],
      }, cfg);
    } else {
      await sendButtons(phone, {
        body: `${bar('gate')}\n✈️ *D'où partait votre vol ?*\n\nPour vérifier que vous êtes couvert par la loi européenne (CE 261).`,
        buttons: [{ text: 'Départ d\'Europe' }, { text: 'Afrique / ailleurs' }],
      }, cfg);
    }
    return;
  }

  if (s.step === 'gate_compagnie') {
    const norm = normalizeInput(input, ['européenne', 'africaine']);
    if (norm === '1') {
      s.geo = 'eu_carrier'; s.step = 'nb_pax';
      await setState(phone, s);
      await sendList(phone, {
        body: `${bar('nb_pax')}\n👥 *Pour combien de passagers réclamez-vous ?*`,
        buttonText: 'Nombre ▾',
        items: [
          { title: '1 passager' }, { title: '2 passagers' }, { title: '3 passagers' },
          { title: '4 passagers' }, { title: '5 passagers' }, { title: '6 ou plus' },
        ],
      }, cfg);
    } else if (norm === '2') {
      await clearState(phone);
      await send(phone, `Merci pour ces informations.\n\nLa loi européenne CE 261 couvre uniquement les vols qui *partent d'Europe* ou arrivent en Europe avec une *compagnie européenne*.\n\nSi vous avez d'autres vols passés via l'Europe, vous avez *3 ans* pour réclamer — revenez ici.\n\n_L'équipe Robin 🏹_`, cfg);
    } else {
      await sendButtons(phone, {
        body: 'La compagnie qui opérait ce vol ?',
        buttons: [{ text: 'Cie européenne' }, { text: 'Africaine / autre' }],
      }, cfg);
    }
    return;
  }

  // ── NOMBRE PASSAGERS ──────────────────────────────────────────────────────
  if (s.step === 'nb_pax') {
    const norm = normalizeInput(input, ['1 passager', '2 passagers', '3 passagers', '4 passagers', '5 passagers', '6 ou plus']);
    const n = parseInt(norm);
    if (n >= 1 && n <= 6) {
      s.pax = n; s.step = 'type_vol';
      await setState(phone, s);
      await sendList(phone, {
        body: `${bar('type_vol')}\n✅ *${s.pax} passager(s) enregistré(s).*\n\n✈️ Sur ce trajet : quel type de vol ?`,
        buttonText: 'Type de vol ▾',
        items: [
          { title: '✈️ Vol direct', description: 'Sans escale' },
          { title: '🔄 Vol avec escale', description: 'Une ou plusieurs escales' },
          { title: 'Correspondance ratée', description: 'À cause d\'un retard' },
        ],
      }, cfg);
    } else {
      await sendList(phone, {
        body: `${bar('nb_pax')}\n👥 *Pour combien de passagers ?*`,
        buttonText: 'Nombre ▾',
        items: [
          { title: '1 passager' }, { title: '2 passagers' }, { title: '3 passagers' },
          { title: '4 passagers' }, { title: '5 passagers' }, { title: '6 ou plus' },
        ],
      }, cfg);
    }
    return;
  }

  // ── TYPE VOL ──────────────────────────────────────────────────────────────
  if (s.step === 'type_vol') {
    const norm = normalizeInput(input, ['direct', 'escale', 'correspondance']);
    if (['1','2','3'].includes(norm)) {
      s.type_vol = norm === '1' ? 'direct' : norm === '2' ? 'escale' : 'correspondance';
      s.step = 'incident';
      await setState(phone, s);
      await sendList(phone, {
        body: `${bar('incident')}\n✅ *C'est noté* — objectif jusqu'à *${montantNet(s.pax)} € net* pour votre groupe. 🚀\n\n⚖️ *Que s'est-il passé exactement ?*`,
        buttonText: 'Incident ▾',
        items: [
          { title: 'Retard +3h' },
          { title: 'Vol annulé' },
          { title: 'Refus d\'embarquement' },
          { title: 'Correspondance manquée' },
        ],
      }, cfg);
    } else {
      await sendList(phone, {
        body: `${bar('type_vol')}\n✈️ Sur ce trajet : quel type de vol ?`,
        buttonText: 'Type de vol ▾',
        items: [
          { title: '✈️ Vol direct' }, { title: '🔄 Vol avec escale' }, { title: 'Correspondance ratée' },
        ],
      }, cfg);
    }
    return;
  }

  // ── INCIDENT ──────────────────────────────────────────────────────────────
  if (s.step === 'incident') {
    const norm = normalizeInput(input, ['retard', 'annulé', 'refus', 'correspondance']);
    if (['1','2','3','4'].includes(norm)) {
      s.incident = norm;
      s.incident_libelle = INCIDENT_LABELS[norm];
      if (norm === '1') {
        s.step = 'duree_retard';
        await setState(phone, s);
        await sendList(phone, {
          body: `${bar('duree_retard')}\n⏱️ *Environ combien d'heures de retard à l'arrivée ?*`,
          buttonText: 'Durée ▾',
          items: [
            { title: 'Moins de 3 heures' },
            { title: 'Entre 3 et 4 heures' },
            { title: 'Plus de 4 heures' },
            { title: 'Je ne me souviens plus' },
          ],
        }, cfg);
      } else if (norm === '4') {
        s.step = 'correspondance';
        await setState(phone, s);
        await sendList(phone, {
          body: `${bar('correspondance')}\n✈️ *Quel vol pose problème ?*`,
          buttonText: 'Préciser ▾',
          items: [
            { title: 'Vol initial (retard)' },
            { title: 'Vol correspondance raté' },
            { title: 'Les deux' },
            { title: 'Je ne sais plus' },
          ],
        }, cfg);
      } else {
        await showRemboursements(phone, s, cfg);
      }
    } else {
      await sendList(phone, {
        body: `${bar('incident')}\n⚖️ *Que s'est-il passé exactement ?*`,
        buttonText: 'Incident ▾',
        items: [
          { title: 'Retard +3h' }, { title: 'Vol annulé' },
          { title: 'Refus d\'embarquement' }, { title: 'Correspondance manquée' },
        ],
      }, cfg);
    }
    return;
  }

  // ── DURÉE RETARD ──────────────────────────────────────────────────────────
  if (s.step === 'duree_retard') {
    const norm = normalizeInput(input, ['moins de 3', 'entre 3', 'plus de 4', 'souviens']);
    if (norm === '1') {
      await clearState(phone);
      await send(phone, `Merci. Pour un retard *inférieur à 3 heures* à l'arrivée, la loi européenne CE 261 ne prévoit pas d'indemnité forfaitaire.\n\nSi vous pensez que le retard était plus long, ou si vous avez un autre incident, tapez *menu* pour recommencer.\n\n_L'équipe Robin 🏹_`, cfg);
    } else if (['2','3','4'].includes(norm)) {
      s.duree_retard = norm === '2' ? '3-4h' : norm === '3' ? '4h+' : 'inconnue';
      await showRemboursements(phone, s, cfg);
    } else {
      await sendList(phone, {
        body: `${bar('duree_retard')}\n⏱️ *Combien d'heures de retard à l'arrivée ?*`,
        buttonText: 'Durée ▾',
        items: [
          { title: 'Moins de 3 heures' }, { title: 'Entre 3 et 4 heures' },
          { title: 'Plus de 4 heures' }, { title: 'Je ne me souviens plus' },
        ],
      }, cfg);
    }
    return;
  }

  // ── CORRESPONDANCE ────────────────────────────────────────────────────────
  if (s.step === 'correspondance') {
    const norm = normalizeInput(input, ['vol initial', 'correspondance', 'les deux', 'sais']);
    if (['1','2','3','4'].includes(norm)) {
      s.type_correspondance = norm;
      await showRemboursements(phone, s, cfg);
    } else {
      await sendList(phone, {
        body: `${bar('correspondance')}\n✈️ *Quel vol pose problème ?*`,
        buttonText: 'Préciser ▾',
        items: [
          { title: 'Vol initial (retard)' }, { title: 'Vol correspondance raté' },
          { title: 'Les deux' }, { title: 'Je ne sais plus' },
        ],
      }, cfg);
    }
    return;
  }

  // ── REMBOURSEMENTS (info) → HÔTEL (subtil) ────────────────────────────────
  if (s.step === 'remboursements') {
    s.step = 'hotel_ask';
    await setState(phone, s);
    await sendButtons(phone, {
      body: `🏨 *Une dernière chose...*\n\nLa compagnie vous a-t-elle *logé à l'hôtel* à cause de ce vol ?\n\nSi oui, dites-moi *lequel* — ça renforce votre dossier (on récupère ces frais en plus). Sinon, touchez *Non*.`,
      footer: 'Hôtel pris en charge ?',
      buttons: [{ text: 'Non, pas d\'hôtel' }],
    }, cfg);
    return;
  }

  // ── HÔTEL (question subtile) → alerte WhatsApp propriétaire → OCR ──────────
  if (s.step === 'hotel_ask') {
    if (mediaUrl) { s.hotel = ''; s.step = 'ocr'; await setState(phone, s); await processOcr(phone, s, mediaUrl, cfg); return; }
    const t = (input || '').trim();
    const neg = /^(non|nan|pas|aucun|aucune|rien|skip|passer|suivant|0|n)\b/i.test(t);
    if (!neg && t.length >= 2) {
      s.hotel = t.slice(0, 200);
      // Alerte WhatsApp INSTANTANÉE au propriétaire (CallMeBot) + Telegram/email en secours.
      const alerte = `🏨 Hôtel signalé par un client\n\nClient : +${phone}\nVol : ${s.vol || '?'}${s.compagnie ? ' (' + s.compagnie + ')' : ''}${s.date ? ' · ' + s.date : ''}\nHôtel : « ${s.hotel} »\n\n→ La compagnie l'a hébergé : prise en charge Art. 9 — pense à récupérer le justificatif.`;
      try { await sendCallMeBot(alerte); } catch (e) { console.error('hotel callmebot:', e.message); }
      try { await notifyOwner('🏨 Hôtel client +' + phone, alerte); } catch (e) { /* secours */ }
    } else {
      s.hotel = '';
    }
    s.step = 'ocr';
    await setState(phone, s);
    const ack = s.hotel ? `✅ Noté, merci — *${s.hotel}*. Gardez la facture de l'hôtel, on la récupère.\n\n` : '';
    await sendButtons(phone, {
      body: `${ack}${bar('ocr')}\n📋 *Carte d'embarquement ou e-ticket*\n\n👍 *On vous fait gagner du temps* — une photo nette permet de remplir le dossier automatiquement.`,
      footer: 'C\'est le plus rapide',
      buttons: [{ text: '📸 Photo' }, { text: '✍️ Saisir' }],
    }, cfg);
    return;
  }

  // ── OCR / SAISIE MANUELLE ─────────────────────────────────────────────────
  if (s.step === 'ocr') {
    // Photo reçue directement → OCR immédiat
    if (mediaUrl) { await processOcr(phone, s, mediaUrl, cfg); return; }
    const norm = normalizeInput(input, ['photo', 'saisir']);
    if (norm === '1' || input.startsWith('[image]') || input.startsWith('[photo]')) {
      await send(phone, `📸 Parfait — envoyez maintenant la *photo* de votre carte d'embarquement ou e-ticket.\n\n_(Photo nette, bien cadrée, à plat — je lis automatiquement)_\n\n⏳ Pas de carte ? Tapez *saisie* pour entrer à la main.`, cfg);
      s.step = 'ocr_waiting';
      await setState(phone, s);
    } else if (norm === '2' || lower.includes('saisi') || lower.includes('main')) {
      s.step = 'manuel_vol';
      await setState(phone, s);
      await send(phone, `${bar('manuel_vol')}\n✍️ *Saisie manuelle — étape 1/6*\n\n*Numéro de vol*\n_(ex. AF718, SN301, EJU7524)_`, cfg);
    } else {
      await sendButtons(phone, {
        body: `${bar('ocr')}\n📋 *Carte d'embarquement ou e-ticket*\n\nComment souhaitez-vous continuer ?`,
        buttons: [{ text: '📸 Photo' }, { text: '✍️ Saisir' }],
      }, cfg);
    }
    return;
  }

  // ── SAISIE MANUELLE — 1 champ à la fois ──────────────────────────────────
  if (s.step === 'manuel_vol') {
    const vol = input.toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z0-9]{3,8}$/.test(vol)) {
      s.vol = vol; s.step = 'manuel_compagnie';
      await setState(phone, s);
      await send(phone, `${bar('manuel_compagnie')}\n✍️ *Étape 2/6 — Compagnie aérienne*\n\nQuelle compagnie opérait le vol ${vol} ?\n_(ex. Air France, Brussels Airlines, easyJet, ASKY…)_`, cfg);
    } else {
      await send(phone, `Numéro de vol non reconnu. Format attendu : *2-3 lettres + chiffres* (ex. AF718, SN301).\n\nRenvoyez le numéro de vol :`, cfg);
    }
    return;
  }

  if (s.step === 'manuel_compagnie') {
    if (input.length >= 2) {
      s.compagnie = input; s.step = 'manuel_date';
      await setState(phone, s);
      await send(phone, `${bar('manuel_date')}\n✍️ *Étape 3/6 — Date du vol*\n\nFormat : *JJ/MM/AAAA*\n_(ex. 12/05/2024)_`, cfg);
    } else {
      await send(phone, `Nom de compagnie trop court. Renvoyez la compagnie aérienne :`, cfg);
    }
    return;
  }

  if (s.step === 'manuel_date') {
    const m = input.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (m) {
      const yy = m[3].length === 2 ? '20' + m[3] : m[3];
      s.date = `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${yy}`;
      s.step = 'manuel_pnr';
      await setState(phone, s);
      await send(phone, `${bar('manuel_pnr')}\n✍️ *Étape 4/6 — Code PNR (réservation)*\n\n6 caractères au-dessus du nom sur la carte d'embarquement.\n_(ex. K5FW8B)_\n\nVous ne l'avez pas ? Tapez *passer*.`, cfg);
    } else {
      await send(phone, `Date non reconnue. Format : *JJ/MM/AAAA* (ex. 12/05/2024).\n\nRenvoyez la date :`, cfg);
    }
    return;
  }

  if (s.step === 'manuel_pnr') {
    if (lower === 'passer' || lower === 'skip') {
      s.pnr = ''; s.step = 'manuel_route';
    } else {
      const pnr = input.toUpperCase().replace(/\s+/g, '');
      if (/^[A-Z0-9]{5,8}$/.test(pnr)) {
        s.pnr = pnr; s.step = 'manuel_route';
      } else {
        await send(phone, `Code PNR invalide. 6 caractères alphanumériques attendus (ex. K5FW8B). Ou tapez *passer*.`, cfg);
        return;
      }
    }
    await setState(phone, s);
    await send(phone, `${bar('manuel_route')}\n✍️ *Étape 5/6 — Itinéraire*\n\n*Aéroport de départ → aéroport d'arrivée*\nCodes IATA 3 lettres préférés.\n_(ex. CDG → ABJ, BRU → DKR, AMS → NBO)_`, cfg);
    return;
  }

  if (s.step === 'manuel_route') {
    const route = input.replace(/[\s\-]+/g, ' ').replace(/→|->/g, ' → ').trim();
    if (route.length >= 5) {
      s.route = route; s.step = 'manuel_nom';
      await setState(phone, s);
      await send(phone, `${bar('manuel_nom')}\n✍️ *Étape 6/6 — Nom du passager principal*\n\nTel qu'écrit sur la carte d'embarquement.\n_(ex. M. SAMIR DRIDI, Mme FATOU DIOP)_`, cfg);
    } else {
      await send(phone, `Itinéraire trop court. Format : *aéroport départ → aéroport arrivée* (ex. CDG → ABJ).`, cfg);
    }
    return;
  }

  if (s.step === 'manuel_nom') {
    if (input.length >= 3) {
      s.nom = input.toUpperCase();
      s.step = 'confirm_ocr';
      await setState(phone, s);
      await sendButtons(phone, {
        body: `${bar('confirm_ocr')}\n📸 *Récapitulatif du vol — vérifiez :*\n\n✈️ *${s.vol}* — ${s.compagnie}\n🎫 *${s.date}*\n📋 *${s.pnr || '—'}*\n🛤️ *${s.route}*\n👤 *${s.nom}*\n\nℹ️ Une info incorrecte ? Touchez *Corriger*.`,
        buttons: [{ text: '✅ Correct' }, { text: '✏️ Corriger' }],
      }, cfg);
    } else {
      await send(phone, `Nom trop court. Renvoyez le nom complet du passager principal :`, cfg);
    }
    return;
  }

  // ── CONFIRMATION VOL ──────────────────────────────────────────────────────
  if (s.step === 'confirm_ocr') {
    const norm = normalizeInput(input, ['correct', 'corriger']);
    if (norm === '1') {
      // Demander année si manquante
      if (s.date && /^(\d{1,2})\/(\d{1,2})$/.test(s.date)) {
        s.step = 'annee';
        await setState(phone, s);
        const y = new Date().getFullYear();
        await sendList(phone, {
          body: `${bar('annee')}\n🗓️ *Quelle année pour le ${s.date} ?*`,
          buttonText: 'Année ▾',
          items: [
            { title: String(y) }, { title: String(y-1) }, { title: String(y-2) },
            { title: String(y-3) }, { title: String(y-4) + ' ou avant' },
          ],
        }, cfg);
        return;
      }
      s.step = 'confirm_pax';
      await setState(phone, s);
      const noms = s.nom ? `1. *${s.nom}*` : '1. (à confirmer)';
      const note_pax_supplementaires = s.pax > 1 ? `\n\n_Pour les ${s.pax - 1} autres passagers, nous reviendrons vers vous avec un lien sécurisé après ouverture du dossier._` : '';
      await sendButtons(phone, {
        body: `${bar('confirm_pax')}\n👥 *Les ${s.pax} passagers — confirmez*\n\n${noms}${note_pax_supplementaires}`,
        buttons: [{ text: '✅ Confirmer' }, { text: '✏️ Modifier' }],
      }, cfg);
    } else if (norm === '2') {
      s.step = 'manuel_vol';
      await setState(phone, s);
      await send(phone, `${bar('manuel_vol')}\n✍️ *Reprise saisie — Étape 1/6*\n\n*Numéro de vol*`, cfg);
    } else {
      await sendButtons(phone, {
        body: `📸 *Récapitulatif du vol — vérifiez :*\n\n✈️ *${s.vol}* — ${s.compagnie}\n🎫 *${s.date}*\n📋 *${s.pnr || '—'}*\n🛤️ *${s.route}*\n👤 *${s.nom}*`,
        buttons: [{ text: '✅ Correct' }, { text: '✏️ Corriger' }],
      }, cfg);
    }
    return;
  }

  // ── ANNÉE ─────────────────────────────────────────────────────────────────
  if (s.step === 'annee') {
    const y = new Date().getFullYear();
    const yearMap = { '1': y, '2': y-1, '3': y-2, '4': y-3, '5': y-4 };
    const norm = normalizeInput(input, [String(y), String(y-1), String(y-2), String(y-3), String(y-4) + ' ou avant']);
    const annee = yearMap[norm] || (input.match(/\d{4}/) ? input.match(/\d{4}/)[0] : null);
    if (annee) {
      if (s.date && /^\d{1,2}\/\d{1,2}$/.test(s.date)) {
        s.date = `${s.date}/${annee}`;
      } else if (!s.date.includes(String(annee))) {
        s.date = s.date + '/' + annee;
      }
      s.step = 'confirm_pax';
      await setState(phone, s);
      const noms = s.nom ? `1. *${s.nom}*` : '1. (à confirmer)';
      const note_pax_supplementaires = s.pax > 1 ? `\n\n_Pour les ${s.pax - 1} autres passagers, nous reviendrons vers vous avec un lien sécurisé après ouverture du dossier._` : '';
      await sendButtons(phone, {
        body: `${bar('confirm_pax')}\n👥 *Les ${s.pax} passagers — confirmez*\n\n${noms}${note_pax_supplementaires}`,
        buttons: [{ text: '✅ Confirmer' }, { text: '✏️ Modifier' }],
      }, cfg);
    } else {
      await sendList(phone, {
        body: `${bar('annee')}\n🗓️ *Quelle année pour le ${s.date || '?'} ?*`,
        buttonText: 'Année ▾',
        items: [
          { title: String(y) }, { title: String(y-1) }, { title: String(y-2) },
          { title: String(y-3) }, { title: String(y-4) + ' ou avant' },
        ],
      }, cfg);
    }
    return;
  }

  // ── CONFIRMATION PASSAGERS ────────────────────────────────────────────────
  if (s.step === 'confirm_pax') {
    const norm = normalizeInput(input, ['confirmer', 'modifier']);
    if (norm === '1') {
      s.step = 'mineurs';
      await setState(phone, s);
      const noms = s.nom ? `• *${s.nom}*` : '• (passager 1)';
      await sendButtons(phone, {
        body: `${bar('mineurs')}\n👶 *Question juridique importante*\n\nParmi les passagers suivants, y a-t-il des *mineurs* (moins de 18 ans) ?\n\n${noms}\n\n⚖️ Obligation légale pour préparer le bon mandat.`,
        buttons: [{ text: '✅ Tous majeurs' }, { text: '👶 Des mineurs' }],
      }, cfg);
    } else if (norm === '2') {
      s.step = 'manuel_nom';
      await setState(phone, s);
      await send(phone, `${bar('manuel_nom')}\n✍️ Renvoyez le nom du passager principal :`, cfg);
    } else {
      const noms = s.nom ? `1. *${s.nom}*` : '1. (passager 1)';
      await sendButtons(phone, {
        body: `${bar('confirm_pax')}\n👥 *Les ${s.pax} passagers — confirmez*\n\n${noms}`,
        buttons: [{ text: '✅ Confirmer' }, { text: '✏️ Modifier' }],
      }, cfg);
    }
    return;
  }

  // ── MINEURS ───────────────────────────────────────────────────────────────
  if (s.step === 'mineurs') {
    const norm = normalizeInput(input, ['majeurs', 'mineurs']);
    if (norm === '1' || norm === '2') {
      s.mineurs = norm === '2';
      s.step = 'email';
      await setState(phone, s);
      await send(phone, `${bar('email')}\n📧 *Pour vous envoyer le mandat et le suivi du dossier*\n\nQuelle est votre adresse email ?\n_(Ex. : prenom@gmail.com)_`, cfg);
    } else {
      const noms = s.nom ? `• *${s.nom}*` : '• (passager 1)';
      await sendButtons(phone, {
        body: `${bar('mineurs')}\n👶 *Y a-t-il des mineurs parmi les passagers ?*\n\n${noms}`,
        buttons: [{ text: '✅ Tous majeurs' }, { text: '👶 Des mineurs' }],
      }, cfg);
    }
    return;
  }

  // ── EMAIL ─────────────────────────────────────────────────────────────────
  if (s.step === 'email') {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
      s.email = input;
      s.step = 'adresse';
      await setState(phone, s);
      await send(phone, `${bar('adresse')}\n📮 *Adresse postale* (pour le mandat officiel)\n\nRue, ville et pays — ou *ville + pays* si vous préférez.\n_(Ex. : 12 rue Léon Blum, Dakar, Sénégal)_`, cfg);
    } else {
      await send(phone, `Format email invalide. Envoyez votre adresse email (ex. prenom@gmail.com) :`, cfg);
    }
    return;
  }

  // ── ADRESSE ───────────────────────────────────────────────────────────────
  if (s.step === 'adresse') {
    if (input.length >= 5) {
      s.adresse = input;
      s.step = 'langue';
      await setState(phone, s);
      await sendList(phone, {
        header: '🌍 Dernière question !',
        body: `${bar('langue')}\nDans quelle langue nos experts doivent-ils vous contacter *(appels, vocaux WhatsApp, suivi)* ?`,
        buttonText: 'Langue ▾',
        items: [
          { title: '🇫🇷 Français' }, { title: '🇬🇧 English' }, { title: '🇸🇳 Wolof' },
          { title: '🇲🇱 Bambara' }, { title: '🇨🇮 Dioula' }, { title: '🌐 Autre' },
        ],
      }, cfg);
    } else {
      await send(phone, `Adresse trop courte. Renvoyez votre adresse (ville + pays minimum) :`, cfg);
    }
    return;
  }

  // ── LANGUE → FIN A/B/C ────────────────────────────────────────────────────
  if (s.step === 'langue') {
    const norm = normalizeInput(input, ['français', 'english', 'wolof', 'bambara', 'dioula', 'autre']);
    if (['1','2','3','4','5','6'].includes(norm)) {
      const L = LANGUE_LABELS[norm];
      s.langue = L.name;
      s.langue_code = L.code;
      s.ref = genRef();
      s.mandat_url = buildMandatUrl(s, phone);
      s.step = 'done';
      await setState(phone, s);

      // ⚠️ Serverless: PAS de longs setTimeout (Netlify tue la fonction >10-26s).
      // On envoie les 3 messages de fin en séquence rapide (~0.8s entre chaque).
      // FIN A — Récap
      await send(phone, formatFinA(s), cfg);
      // FIN B — Mandat
      await sendDelayed(phone, formatFinB(s), cfg, 800);
      // FIN C — Pièces
      await sendDelayed(phone, formatFinC(s), cfg, 800);

      // Webhook Make → création Airtable (fire, ne pas bloquer si lent)
      try {
        const makeUrl = process.env.MAKE_WEBHOOK_NEW_DOSSIER;
        if (makeUrl) {
          await fetch(makeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...s, phone, source: 'wati-bot-v4' }),
          });
        }
      } catch (e) { console.error('make webhook failed', e.message); }
    } else {
      await sendList(phone, {
        body: `${bar('langue')}\n🌍 Dans quelle langue voulez-vous être contacté ?`,
        buttonText: 'Langue ▾',
        items: [
          { title: '🇫🇷 Français' }, { title: '🇬🇧 English' }, { title: '🇸🇳 Wolof' },
          { title: '🇲🇱 Bambara' }, { title: '🇨🇮 Dioula' }, { title: '🌐 Autre' },
        ],
      }, cfg);
    }
    return;
  }

  // ── DOSSIER TERMINÉ ───────────────────────────────────────────────────────
  if (s.step === 'done') {
    await send(phone, `✅ Votre dossier *${s.ref}* est enregistré.\n\n👉 Signez le mandat : ${s.mandat_url}\n\nPour un nouveau dossier : tapez *menu*.`, cfg);
    return;
  }

  if (s.step === 'ocr_waiting') {
    // Photo reçue → OCR
    if (mediaUrl) { await processOcr(phone, s, mediaUrl, cfg); return; }
    if (input.startsWith('[image]') || input.startsWith('[photo]')) {
      await send(phone, `📸 Photo reçue mais illisible. Renvoyez-la plus nette, ou tapez *saisie* pour entrer à la main.`, cfg);
    } else if (lower.includes('saisi')) {
      s.step = 'manuel_vol';
      await setState(phone, s);
      await send(phone, `${bar('manuel_vol')}\n✍️ *Saisie manuelle — Étape 1/6*\n\n*Numéro de vol*`, cfg);
    } else {
      await send(phone, `J'attends votre carte d'embarquement en photo 📸. Pas de carte ? Tapez *saisie*.`, cfg);
    }
    return;
  }

  // ── INCOMPRIS ─────────────────────────────────────────────────────────────
  await send(phone, `Je n'ai pas compris votre réponse. Tapez le *numéro* ou utilisez le bouton, ou *menu* pour recommencer.`, cfg);
}

// ─── Traitement OCR d'une carte d'embarquement ───────────────────────────────
async function processOcr(phone, s, mediaUrl, cfg) {
  await send(phone, `📸 *Carte reçue — lecture en cours…* ⏳`, cfg);
  const data = await ocrBoardingPass(mediaUrl, cfg);
  if (data && (data.vol || data.pnr || data.nom)) {
    s.vol = data.vol || s.vol || '';
    s.compagnie = data.compagnie || s.compagnie || '';
    s.date = data.date || s.date || '';
    s.pnr = data.pnr || s.pnr || '';
    s.route = data.route || s.route || '';
    s.nom = data.nom || s.nom || '';
    s.step = 'confirm_ocr';
    await setState(phone, s);
    await sendButtons(phone, {
      body: `${bar('confirm_ocr')}\n📸 *Lu ! Vérifiez :*\n\n✈️ *${s.vol || '—'}* — ${s.compagnie || '—'}\n🎫 *${s.date || '—'}*\n📋 *${s.pnr || '—'}*\n🛤️ *${s.route || '—'}*\n👤 *${s.nom || '—'}*\n\nℹ️ Une info incorrecte ? Touchez *Corriger*.`,
      buttons: [{ text: '✅ Correct' }, { text: '✏️ Corriger' }],
    }, cfg);
  } else {
    // OCR échoué → bascule saisie manuelle
    s.step = 'manuel_vol';
    await setState(phone, s);
    await send(phone, `😕 Je n'ai pas réussi à lire la carte (photo floue ou format non reconnu).\n\nOn la fait à la main, c'est rapide :\n\n${bar('manuel_vol')}\n✍️ *Étape 1/6 — Numéro de vol*\n_(ex. AF718, SN301)_`, cfg);
  }
}

// ─── Helpers messages ────────────────────────────────────────────────────────
async function showRemboursements(phone, s, cfg) {
  s.step = 'remboursements';
  await setState(phone, s);
  await sendButtons(phone, {
    body: `💡 *Bonne nouvelle — Robin récupère aussi vos avances !*\n\nSi vous avez payé de votre poche à cause de ce vol *(taxi, hôtel, repas, transfert...)* :\n\n🧾 *Conservez toutes vos factures et reçus.*\n\nRobin des Airs les soumet à la compagnie et récupère ces frais *en plus* de l'indemnité légale. *Zéro effort de votre côté.*`,
    footer: 'On continue avec votre billet ?',
    buttons: [{ text: '✅ Continuer' }],
  }, cfg);
}

function formatFinA(s) {
  return `🎉 *Dossier prêt à être déposé !*

📋 *Récapitulatif*
👥 *Passagers :* ${s.pax}
🪪 *Nom principal :* ${s.nom || '(à compléter)'}
✈️ *Parcours :* ${s.type_vol === 'direct' ? 'direct' : s.type_vol === 'escale' ? 'avec escale' : 'correspondance'}
📞 *Langue suivi :* ${s.langue}
⚖️ *Incident :* ${s.incident_libelle}${s.duree_retard ? ' (' + s.duree_retard + ')' : ''}
🛫 *Compagnie :* ${s.compagnie || '—'}
🔢 *N° de vol :* ${s.vol || '—'}
📅 *Date :* ${s.date || '—'}
🎫 *PNR :* ${s.pnr || '—'}
🌍 *Itinéraire :* ${s.route || '—'}
📧 ${s.email || '—'}

📁 *Réf. dossier :* *${s.ref}*
💵 *Montant net visé (groupe) :* *${montantNet(s.pax)} €*

⬇️ Prochaine étape : *2 minutes* pour signer.`;
}

function formatFinB(s) {
  return `✅ *Dernière étape — votre dossier ${s.ref} est prêt !*

Robin des Airs récupère votre argent auprès de *${s.compagnie || 'la compagnie'}* — *jusqu'à 600 €* + vos frais.

✔️ *0 € si on ne récupère rien.* 25 % seulement en cas de succès.
✔️ Aucune info bancaire à cette étape.
✔️ Vols avec correspondance couverts.

👉 *Signez (2 min) :*
${s.mandat_url}

Sans signature, on ne peut pas agir en votre nom.

_L'équipe Robin 🏹_`;
}

function formatFinC(s) {
  return `📎 *Ensuite — vos justificatifs*

Envoyez ici, en photos :

1. *Passeport ou CNI* (face lisible)
2. *Carte d'embarquement* ou confirmation _(si vous l'avez encore)_
${s.duree_retard || s.type_correspondance ? '3. *Factures taxi / hôtel / repas* (avances payées de votre poche)' : ''}

🔒 Pièces réservées au dossier *${s.ref}* uniquement.
Confidentialité : https://robindesairs.eu/politique-confidentialite`;
}

// ─── Extraction message entrant WATI ─────────────────────────────────────────
function extractInbound(payload) {
  const list = [];
  const seen = new Set(); // dédup : un même message inbound peut apparaître à la racine ET dans data/messages
  if (!payload || typeof payload !== 'object') return list;
  const push = (item) => {
    if (!item || typeof item !== 'object') return;
    const waId = item.waId || item.whatsappNumber || item.from;
    const isOutbound = item.owner === true || item.eventType === 'sentMessage' || item.fromMe === true;
    if (isOutbound) return;

    // ── Réponses interactives WATI (priorité : un tap de bouton/liste = la sélection) ──
    // WATI envoie : listReply {id,title,description} · interactiveButtonReply {id,text} · buttonReply {text}
    const listReply = item.listReply || item.list_reply || item.interactiveListReply;
    const btnReply  = item.interactiveButtonReply || item.buttonReply || item.button_reply;
    const replyText =
      (listReply && (listReply.title || listReply.id)) ||
      (btnReply  && (btnReply.text || btnReply.title || btnReply.id)) ||
      null;

    // Ignorer le payload de test WATI (placeholders littéraux)
    if (waId === 'senderPhone' || item.text === 'text') return;

    // ── Image (carte d'embarquement) : capter l'URL média WATI ──
    const isImage = item.type === 'image' || (item.type && /image/i.test(item.type));
    const mediaUrl = isImage ? (item.data || item.mediaUrl || item.media_url || item.url) : null;

    const text =
      replyText ||
      item.text ||
      (item.finalText && String(item.finalText)) ||
      (isImage ? '[image]' : (item.type && item.type !== 'text' ? `[${item.type}]` : ''));
    if (!waId) return;
    const phone = normalizeWaPhone(normalizeWatiPhone(waId));
    if (!String(text || '').trim()) return;
    // Clé de dédup : whatsappMessageId (ID WhatsApp STABLE) en priorité — WATI peut
    // réémettre le même message avec un nouvel `id` interne mais le même wamid.
    const realId = item.whatsappMessageId || item.whatsapp_message_id || item.id || item.messageId || null;
    const key = realId || `${phone}|${String(text).trim()}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ phone, text: String(text || '').slice(0, 4096), mediaUrl, dedupId: key, hasId: !!realId });
  };
  if (Array.isArray(payload)) { payload.forEach(push); return list; }
  push(payload);
  if (Array.isArray(payload.messages)) payload.messages.forEach(push);
  if (payload.data && typeof payload.data === 'object') push(payload.data);
  return list;
}

function verifyWatiSecret(body, headers, query) {
  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (!expected) return true;
  const h = headers || {};
  const q = query || {};
  return (
    (body && body.secret) === expected ||                       // secret dans le body
    h['x-wati-secret'] === expected || h['X-Wati-Secret'] === expected || // header
    q.s === expected || q.secret === expected                   // ?s=... ou ?secret=... dans l'URL
  );
}

// ─── Handler principal ────────────────────────────────────────────────────────
exports.handler = async (event) => {
  // ⚠️ INDISPENSABLE : on mémorise l'event pour que la lib Blobs éprouvée (getBlobStore)
  // fasse connectLambda(event) — sinon l'état ne se sauvegarde pas (boucle d'accueil) et
  // saveInteractiveDebug plante (boutons en texte). Même mécanisme que radar-today.
  LAMBDA_EVENT = event;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    const key = (process.env.WATI_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
    if (q.debug === 'interactive' && key && q.key === key) {
      const dbg = await readInteractiveDebug();
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(dbg || { none: true }) };
    }
    if (q.debug === 'inbound' && key && q.key === key) {
      const dbg = await readInboundDebug();
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(dbg || { none: true }) };
    }
    // Self-test OCR : ?selftest=ocr&key=<secret> (gated pour éviter l'abus)
    if (q.selftest === 'ocr' && key && q.key === key) {
      const out = { openaiKeyPresent: !!process.env.OPENAI_API_KEY };
      // 1. Valide la clé avec un appel texte minimal
      try {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 5, messages: [{ role: 'user', content: 'say OK' }] }),
        });
        const d = await r.json();
        out.keyValid = !!d.choices;
        if (d.error) out.keyError = d.error.message;
      } catch (e) { out.keyError = e.message; }
      // 2. Test Vision sur l'image fournie (ou image hébergée robindesairs)
      const sample = q.img || 'https://robindesairs.eu/ad_set3_3B_social_proof.png';
      out.ocrResult = await ocrBoardingPass(sample, null);
      if (out.ocrResult === null && globalThis.__lastOcrErr) out.ocrError = globalThis.__lastOcrErr;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(out) };
    }
    return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Forbidden' }) };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST only' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  if (!verifyWatiSecret(body, event.headers || {}, event.queryStringParameters || {})) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Secret invalide' }) };
  }

  const cfg = watiCfg();
  const items = extractInbound(body);
  try { await saveInboundDebug(event.body || '{}', items); } catch {}

  for (const { phone, text, mediaUrl, dedupId, hasId } of items) {
    if (!phone) continue;
    // Dédup persistante : ignore un message déjà traité (retry WATI sur lenteur réseau).
    if (await isDuplicateMessage(dedupId, hasId)) { console.log('wati-bot: doublon ignoré', dedupId); continue; }
    try { await appendWaMessage(event, phone, { role: 'user', text, source: 'wati' }); } catch {}
    // notifie le propriétaire qu'un client écrit (email + Telegram, anti-spam 30 min/numéro)
    try { await notifyOwnerWhatsApp(phone, text); } catch (e) { console.error('owner-notify:', e.message); }
    try { await handleMessage(phone, text, cfg, mediaUrl); }
    catch (e) {
      console.error('wati-bot: handleMessage error', e.message, e.stack);
      if (cfg) await send(phone, `Une erreur est survenue. Tapez *menu* pour recommencer.`, cfg);
    }
  }

  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, processed: items.length }) };
};

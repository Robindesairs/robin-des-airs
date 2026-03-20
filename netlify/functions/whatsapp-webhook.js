/**
 * Webhook WhatsApp (360dialog) — route /api/whatsapp-webhook.
 *
 * Si ROBIN_TUNNEL_ENABLED=true : tunnel conversationnel (carte d'embarquement → OCR Gemini → étapes → verdict).
 * Sinon : mode classique (Bonjour, numéro de vol, éligibilité).
 *
 * Variables : WHATSAPP_API_KEY, WHATSAPP_360DIALOG_API_KEY, ROBIN_LOG_WEBHOOK_URL,
 *   ROBIN_TUNNEL_ENABLED (optionnel), GEMINI_API_KEY (si tunnel).
 * Si ROBIN_GEMINI_DELAY_ENABLED=true : les messages texte sont mis en attente 20s puis Gemini répond (relais).
 * ROBIN_WHATSAPP_INTERACTIVE=false : désactive boutons/listes WhatsApp (fallback texte seul).
 * Envoi : si WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN sont définis → API Meta (réponses via ce numéro), sinon 360dialog.
 * Filtrage : WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_BUSINESS_ACCOUNT_ID pour ne traiter que les messages reçus sur ce numéro/compte.
 */

const D360_BASE = 'https://waba-v2.360dialog.io';
const META_GRAPH_BASE = 'https://graph.facebook.com/v18.0';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const LIEN_DEPOT = 'https://robindesairs.eu/depot-en-ligne.html';
const LIEN_SIGNATURE = 'https://robindesairs.eu/depot-en-ligne.html';
const MENU_BIENVENUE = `👋 *Robin des Airs* — Récupérez jusqu'à 600€ si votre vol a été retardé ou annulé.

• Envoyez-nous votre *numéro de vol* (ex: AF718, BA123) pour vérifier votre éligibilité.
• Ou dites *Bonjour* pour ce menu.
• Déposer un dossier : https://robindesairs.eu/depot-en-ligne.html
• Nous contacter : https://wa.me/15557840392`;

const ROBIN_ACCUEIL = "Bonjour ! Je suis Robin 🏹. Envoyez-moi une photo de votre carte d'embarquement, je m'occupe d'analyser vos droits en 30 secondes.";

// require au top-level : le traceur Netlify (nft) inclut le paquet dans le zip ; require() dans le handler était parfois omis
let netlifyBlobsModule = null;
try {
  netlifyBlobsModule = require('@netlify/blobs');
} catch (_) {
  /* ex. dev local sans Netlify */
}

// Étape 1 (grand 1 — collecte mandat) : démarrage au premier message ou "Bonjour"
const STEP1_STEPS = ['PASSENGER_FIRST', 'PASSENGER_LAST', 'PASSENGER_ANOTHER', 'PASSENGERS_CONFIRM', 'CONFIRM_PHONE', 'ASK_CONTACT_PHONE', 'TRAJET_FLIGHT', 'TRAJET_DATE', 'TRAJET_CONNECTION', 'TRAJET_CONFIRM', 'ASK_PNR', 'CONFIRM_PNR', 'ASK_AIRLINE', 'ASK_ADDRESS', 'STEP1_DONE'];
function isStep1(step) { return STEP1_STEPS.includes(step); }
function isBonjourLike(t) { return /^(bonjour|bonsoir|salut|hello|coucou)\s*[!.]?$/i.test((t || '').trim()); }
function step1Form(session) {
  const fd = session.flightData || {};
  return {
    passengers: fd.passengers || [],
    passengerIndex: fd.passengerIndex ?? 0,
    flights: fd.flights || [],
    segmentIndex: fd.segmentIndex ?? 0,
    contactPhone: fd.contactPhone,
    pnr: fd.pnr,
    airline: fd.airline,
    address: fd.address
  };
}

function parseFlightNumber(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/\s+/g, '').toUpperCase();
  const match = cleaned.match(/\b([A-Z]{2}\d{2,4})\b/);
  return match ? match[1] : null;
}

function isBonjourLike(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim().toLowerCase();
  return /^(bonjour|bonsoir|salut|hello|coucou|yo|bon ?jour)\s*[!.]?$/i.test(t) || t === 'bonjour' || t === 'hello';
}

function distanceKmToAmount(km) {
  if (km == null || isNaN(km)) return null;
  if (km < 1500) return 250;
  if (km <= 3500) return 400;
  return 600;
}

const APPROX_KM = {
  'CDG-DSS': 4200, 'CDG-DKR': 4200, 'ORY-DSS': 4200, 'CDG-ABJ': 4650, 'CDG-BKO': 4100,
  'CDG-CMN': 2300, 'CDG-DLA': 5150, 'CDG-FIH': 6100, 'MRS-DSS': 4000, 'LYS-DSS': 4100,
};
function getApproxKm(dep, arr) {
  const key = [dep, arr].sort().join('-');
  return APPROX_KM[key] ?? null;
}

async function getFlightEligibility(flightNumber, origin) {
  const flightInfoUrl = `${origin}/.netlify/functions/flight-info?flight=${encodeURIComponent(flightNumber)}`;
  try {
    const res = await fetch(flightInfoUrl, { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data) || data.length === 0) return { eligible: false, amount: null };
    const first = data[0];
    const dep = (first.departure?.iataCode || first.departure?.airport?.iataCode || '').toUpperCase();
    const arr = (first.arrival?.iataCode || first.arrival?.airport?.iataCode || '').toUpperCase();
    if (!dep || !arr) return { eligible: false, amount: null, dep, arr };
    const delayMinutes = first.arrival?.delay != null ? Number(first.arrival.delay) : (first.departure?.delay != null ? Number(first.departure.delay) : undefined);
    const km = getApproxKm(dep, arr);
    const amount = km != null ? distanceKmToAmount(km) : (dep && arr ? 4500 : null);
    const amt = amount != null ? amount : 600;
    const eligible = amt >= 600 && delayMinutes != null && !isNaN(delayMinutes) && delayMinutes >= 180;
    return { eligible: !!eligible, amount: amt, dep, arr, delayMinutes };
  } catch (e) {
    console.error('whatsapp-webhook: getFlightEligibility', e);
    return { eligible: false, amount: null };
  }
}

function getSendConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const d360Key = process.env.WHATSAPP_360DIALOG_API_KEY;
  if (phoneNumberId && accessToken) {
    return { provider: 'meta', phoneNumberId, accessToken };
  }
  return { provider: '360dialog', d360Key: d360Key || undefined };
}

/** Envoie un message texte. Utilise WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN (Meta) si définis, sinon 360dialog. */
async function sendWhatsAppText(to, text) {
  const config = getSendConfig();
  const toClean = String(to).replace(/\D/g, '');
  if (!toClean || toClean.length < 8) {
    console.error('whatsapp-webhook: send skipped, to invalid', to);
    return false;
  }
  console.log('whatsapp-webhook: sending reply to', toClean.slice(-4) + '****', 'provider=' + (config.provider || '?'), 'len=' + (text && text.length));
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toClean,
    type: 'text',
    text: { body: (text || '').slice(0, 4096) }
  };

  if (config.provider === 'meta' && config.phoneNumberId && config.accessToken) {
    const url = `${META_GRAPH_BASE}/${config.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('whatsapp-webhook: send error (Meta)', res.status, data);
      return false;
    }
    return true;
  }

  if (config.d360Key) {
    const res = await fetch(`${D360_BASE}/messages`, {
      method: 'POST',
      headers: { 'D360-API-KEY': config.d360Key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('whatsapp-webhook: send error (360dialog)', res.status, data);
      return false;
    }
    return true;
  }

  console.error('whatsapp-webhook: no send config (WHATSAPP_360DIALOG_API_KEY or WHATSAPP_PHONE_NUMBER_ID+WHATSAPP_ACCESS_TOKEN)');
  return false;
}

/** Boutons / listes WhatsApp (Cloud API). Désactiver : ROBIN_WHATSAPP_INTERACTIVE=false */
function interactiveEnabled() {
  return process.env.ROBIN_WHATSAPP_INTERACTIVE !== 'false';
}

async function sendWhatsAppPayload(to, payloadExtra) {
  const config = getSendConfig();
  const toClean = String(to).replace(/\D/g, '');
  if (!toClean || toClean.length < 8) return false;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toClean,
    ...payloadExtra
  };
  if (config.provider === 'meta' && config.phoneNumberId && config.accessToken) {
    const url = `${META_GRAPH_BASE}/${config.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('whatsapp-webhook: send interactive error (Meta)', res.status, data);
      return false;
    }
    return true;
  }
  if (config.d360Key) {
    const res = await fetch(`${D360_BASE}/messages`, {
      method: 'POST',
      headers: { 'D360-API-KEY': config.d360Key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('whatsapp-webhook: send interactive error (360dialog)', res.status, data);
      return false;
    }
    return true;
  }
  return false;
}

/** Max 3 boutons ; titre ≤ 20 car. */
async function sendInteractiveButtons(to, bodyText, buttonDefs) {
  const labels = (buttonDefs || []).slice(0, 3).map((b) => b.title).join(' | ');
  if (!interactiveEnabled() || !buttonDefs || buttonDefs.length === 0) {
    return sendWhatsAppText(to, `${bodyText}${labels ? `\n\n${labels}` : ''}`);
  }
  const buttons = buttonDefs.slice(0, 3).map((b) => ({
    type: 'reply',
    reply: { id: String(b.id).slice(0, 256), title: String(b.title).slice(0, 20) }
  }));
  return sendWhatsAppPayload(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: (bodyText || '').slice(0, 1024) },
      action: { buttons }
    }
  });
}

async function sendInteractiveList(to, bodyText, openButtonLabel, sectionTitle, rows) {
  if (!interactiveEnabled() || !rows || rows.length === 0) {
    const lines = (rows || []).map((r) => `• ${r.title}`).join('\n');
    return sendWhatsAppText(to, `${bodyText}\n\n${lines}\n\nRépondez par le nombre ou le choix indiqué.`);
  }
  const sectionRows = rows.slice(0, 10).map((r) => ({
    id: String(r.id).slice(0, 200),
    title: String(r.title).slice(0, 24),
    ...(r.description ? { description: String(r.description).slice(0, 72) } : {})
  }));
  return sendWhatsAppPayload(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: (bodyText || '').slice(0, 1024) },
      action: {
        button: String(openButtonLabel || 'Voir').slice(0, 20),
        sections: [{ title: String(sectionTitle || 'Choix').slice(0, 24), rows: sectionRows }]
      }
    }
  });
}

async function sendYesNo(to, question) {
  return sendInteractiveButtons(to, question, [
    { id: 'robin_oui', title: '✅ Oui' },
    { id: 'robin_non', title: '❌ Non' }
  ]);
}

async function sendMainMenu(to) {
  const intro = 'Que souhaitez-vous faire ? (réponse en 1 clic)';
  return sendInteractiveButtons(to, intro, [
    { id: 'menu_card', title: '📷 Carte vol' },
    { id: 'menu_vol', title: '✈️ N° de vol' },
    { id: 'menu_full', title: '📋 Parcours' }
  ]);
}

async function sendPassengerCountList(to) {
  const rows = [
    { id: 'robin_pax_1', title: '1 passager' },
    { id: 'robin_pax_2', title: '2 passagers' },
    { id: 'robin_pax_3', title: '3 passagers' },
    { id: 'robin_pax_4', title: '4 passagers' },
    { id: 'robin_pax_5', title: '5 passagers' },
    { id: 'robin_pax_6', title: '6 passagers' },
    { id: 'robin_pax_7p', title: '7 ou plus' }
  ];
  return sendInteractiveList(
    to,
    'Combien de passagers au total ? (chacun peut être éligible jusqu’à 600 €)',
    'Choisir',
    'Passagers',
    rows
  );
}

/** Réponse utilisateur : texte ou clic bouton / liste (IDs robin_*) */
function extractUserText(msg) {
  if (!msg || typeof msg !== 'object') return '';
  if (msg.type === 'text' && msg.text && msg.text.body) return String(msg.text.body).trim();
  if (msg.type === 'interactive' && msg.interactive) {
    const i = msg.interactive;
    if (i.type === 'button_reply' && i.button_reply) {
      const id = (i.button_reply.id || '').trim();
      if (id === 'robin_oui') return 'OUI';
      if (id === 'robin_non') return 'NON';
      if (id === 'date_edit') return 'DATE_EDIT';
      return id;
    }
    if (i.type === 'list_reply' && i.list_reply) {
      const id = (i.list_reply.id || '').trim();
      const m = id.match(/^robin_pax_(\d+)$/);
      if (m) return m[1];
      if (id === 'robin_pax_7p') return '7+';
      return id;
    }
  }
  return '';
}

function normalizeTo(waId) {
  const s = String(waId || '').replace(/\D/g, '');
  if (s.startsWith('0')) return '33' + s.slice(1);
  if (s.length <= 9 && !s.startsWith('33')) return '33' + s;
  return s;
}

const tunnelSessions = new Map();
function getTunnelSession(phone) {
  const s = tunnelSessions.get(phone);
  return s || { step: 'AWAITING_CARD', flightData: null, passengerCount: 0 };
}
function setTunnelSession(phone, data) {
  tunnelSessions.set(phone, { ...getTunnelSession(phone), ...data });
}

async function geminiVisionOcr(imageBase64, mimeType) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { flightNumber: null, date: null, passengerName: null };
  const data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const prompt = 'Extrait UNIQUEMENT un objet JSON avec: "flightNumber" (ex: AF718), "date" (JJ/MM/AAAA), "passengerName" (nom complet du passager). Si un champ est illisible mets null. Réponds uniquement le JSON.';
  const res = await fetch(`${GEMINI_BASE}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data } },
          { text: prompt }
        ]
      }]
    })
  });
  const json = await res.json().catch(() => ({}));
  const text = (json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '').replace(/```json?\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    const o = JSON.parse(text);
    return {
      flightNumber: o.flightNumber || null,
      date: o.date || null,
      passengerName: o.passengerName || null
    };
  } catch {
    const m = text.match(/\b([A-Z]{2}\d{2,4})\b/i);
    return { flightNumber: m ? m[1] : null, date: null, passengerName: null };
  }
}

async function geminiSideAnswer(userMessage, currentStep) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const sys = `Tu es Robin 🏹 (Robin des Airs). Étape: ${currentStep}. Réponds brièvement puis ramène vers l'étape (ex: "Pour continuer, envoyez..."). Tarifs: 25% si succès, 0€ si échec.`;
  const res = await fetch(`${GEMINI_BASE}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userMessage }] }],
      systemInstruction: { parts: [{ text: sys }] }
    })
  });
  const json = await res.json().catch(() => ({}));
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

async function handleTunnel(phone, text, imageBase64, imageMime, origin) {
  const to = normalizeTo(phone);
  let session = getTunnelSession(phone);
  if (imageBase64 && session.step === 'AWAITING_MENU_CHOICE') {
    setTunnelSession(phone, { step: 'AWAITING_CARD' });
    session = getTunnelSession(phone);
  }
  const msg = (text || '').trim();
  const upper = (msg || '').toUpperCase();
  const isOuiNon = /^(OUI|NON)$/i.test(upper);
  const isNum = /^\d+$/.test(msg);
  const isDate = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(msg);

  if (!imageBase64 && session.step === 'AWAITING_MENU_CHOICE') {
    const mid = msg.toLowerCase();
    if (mid === 'menu_card') {
      setTunnelSession(phone, { step: 'AWAITING_CARD', menuVolOnly: false });
      await sendWhatsAppText(to, ROBIN_ACCUEIL);
      return;
    }
    if (mid === 'menu_vol') {
      setTunnelSession(phone, { step: 'AWAITING_CARD', menuVolOnly: true });
      await sendWhatsAppText(to, '✈️ Indiquez votre *numéro de vol* (ex. AF712). Vous pouvez ajouter la date sur la même ligne (JJ/MM/AAAA).');
      return;
    }
    if (mid === 'menu_full') {
      setTunnelSession(phone, {
        step: 'PASSENGER_FIRST',
        flightData: { passengers: [], passengerIndex: 0, flights: [], segmentIndex: 0 },
        menuVolOnly: false
      });
      await sendWhatsAppText(to, 'Prénom du passager 1 ?');
      return;
    }
    await sendMainMenu(to);
    return;
  }

  if (!imageBase64 && session.step === 'AWAITING_CARD' && (!msg || isBonjourLike(msg)) && !session.menuVolOnly) {
    setTunnelSession(phone, { step: 'AWAITING_MENU_CHOICE', menuVolOnly: false });
    await sendMainMenu(to);
    return;
  }

  if (imageBase64) {
    const ocr = await geminiVisionOcr(imageBase64, imageMime);
    if (ocr.flightNumber && session.step === 'TRAJET_FLIGHT') {
      const form = step1Form(session);
      const flights = [...(form.flights || [])];
      const segIdx = form.segmentIndex ?? 0;
      while (flights.length <= segIdx) flights.push({ flightNumber: '', date: '' });
      flights[segIdx] = { flightNumber: ocr.flightNumber, date: ocr.date || '' };
      const nextStep = ocr.date ? 'TRAJET_CONNECTION' : 'TRAJET_DATE';
      setTunnelSession(phone, { step: nextStep, flightData: { ...session.flightData, flights, segmentIndex: segIdx } });
      if (nextStep === 'TRAJET_DATE') {
        await sendWhatsAppText(to, `Je vois le vol *${ocr.flightNumber}*. Quelle est la date du vol ? (JJ/MM/AAAA)`);
      } else {
        await sendYesNo(to, `Je vois le vol *${ocr.flightNumber}*. Une correspondance sur la même réservation ?`);
      }
      return;
    }
    if (ocr.flightNumber) {
      setTunnelSession(phone, { step: 'CONFIRM_FLIGHT', flightData: { flightNumber: ocr.flightNumber, date: ocr.date, passengerName: ocr.passengerName } });
      const reply = `Je vois le vol *${ocr.flightNumber}*, est-ce correct ?${ocr.passengerName ? ` (Passager : ${ocr.passengerName})` : ''}`;
      await sendYesNo(to, reply);
      return;
    }
    await sendWhatsAppText(to, "Je n'ai pas pu lire la carte d'embarquement. Envoyez une photo plus nette.");
    return;
  }

  // Message avec numéro de vol (ex. "Je veux vérifier... Numéro de vol : AF 712 Date : ...") → vérification éligibilité immédiate
  if (msg && session.step === 'AWAITING_CARD') {
    const flightNum = parseFlightNumber(msg);
    if (flightNum) {
      const result = await getFlightEligibility(flightNum, origin);
      if (result.eligible && result.amount >= 600) {
        await sendWhatsAppText(to, `Bonne nouvelle ! Votre vol ${flightNum} est éligible à 600€. Cliquez ici pour signer votre dossier : ${LIEN_DEPOT}`);
      } else {
        const reply = result.dep && result.arr
          ? `Vol ${flightNum} (${result.dep} → ${result.arr}) trouvé. Pour confirmer l'éligibilité (retard ≥3h), déposez votre dossier : ${LIEN_DEPOT}`
          : `Nous n'avons pas pu vérifier le vol ${flightNum}. Déposez votre dossier avec le numéro et la date du vol : ${LIEN_DEPOT}`;
        await sendWhatsAppText(to, reply);
      }
      return;
    }
  }
  if (!msg && isStep1(session.step)) {
    const prompts = { PASSENGER_FIRST: 'Prénom du passager 1 ?', PASSENGER_LAST: 'Nom du passager ?', PASSENGER_ANOTHER: 'Y a-t-il un autre passager ?', PASSENGERS_CONFIRM: 'Confirmer la liste des passagers ?', CONFIRM_PHONE: 'Ce numéro WhatsApp pour vous joindre ?', ASK_CONTACT_PHONE: 'Quel numéro pour ce dossier ?', TRAJET_FLIGHT: "Numéro de vol (ex. AF123) ou photo de la carte d'embarquement.", TRAJET_DATE: 'Date du vol (JJ/MM/AAAA)', TRAJET_CONNECTION: 'Correspondance sur la même réservation ?', TRAJET_CONFIRM: 'Confirmer ce trajet ?', ASK_PNR: 'Code PNR (6 caractères)', CONFIRM_PNR: 'Confirmer ce PNR ?', ASK_AIRLINE: 'Compagnie aérienne ?', ASK_ADDRESS: 'Adresse postale (ville, code postal, pays) ?', STEP1_DONE: 'Prochaine étape : envoi du mandat (Yousign).' };
    const ynStep1 = ['PASSENGER_ANOTHER', 'PASSENGERS_CONFIRM', 'CONFIRM_PHONE', 'TRAJET_CONNECTION', 'TRAJET_CONFIRM', 'CONFIRM_PNR'];
    const p = prompts[session.step] || 'Répondez à la question ci-dessus.';
    if (ynStep1.includes(session.step)) await sendYesNo(to, p);
    else await sendWhatsAppText(to, p);
    return;
  }

  if (msg && !isOuiNon && !isNum && !isDate && msg.length > 2 && !isStep1(session.step)) {
    const side = await geminiSideAnswer(msg, session.step);
    if (side) {
      const stepMsg = session.step === 'AWAITING_CARD' ? ROBIN_ACCUEIL : (session.step === 'CONFIRM_FLIGHT' && session.flightData?.flightNumber) ? `Est-ce bien le vol *${session.flightData.flightNumber}* ? (OUI/NON)` : 'Répondez à la question ci-dessus.';
      await sendWhatsAppText(to, side + '\n\n---\n' + stepMsg);
      return;
    }
  }
  switch (session.step) {
    case 'PASSENGER_FIRST': {
      const form = step1Form(session);
      const idx = form.passengerIndex ?? 0;
      const passengers = [...(form.passengers || [])];
      while (passengers.length <= idx) passengers.push({ firstName: '', lastName: '' });
      passengers[idx] = { ...passengers[idx], firstName: msg };
      setTunnelSession(phone, { step: 'PASSENGER_LAST', flightData: { ...session.flightData, passengers, passengerIndex: idx } });
      await sendWhatsAppText(to, `Nom du passager ${idx + 1} ?`);
      return;
    }
    case 'PASSENGER_LAST': {
      const form = step1Form(session);
      const idx = form.passengerIndex ?? 0;
      const passengers = [...(form.passengers || [])];
      while (passengers.length <= idx) passengers.push({ firstName: '', lastName: '' });
      passengers[idx] = { ...passengers[idx], lastName: msg };
      setTunnelSession(phone, { step: 'PASSENGER_ANOTHER', flightData: { ...session.flightData, passengers, passengerIndex: idx } });
      await sendYesNo(to, 'Y a-t-il un autre passager sur ce dossier ?');
      return;
    }
    case 'PASSENGER_ANOTHER':
      if (isOuiNon && upper === 'OUI') {
        const form = step1Form(session);
        const idx = (form.passengerIndex ?? 0) + 1;
        setTunnelSession(phone, { step: 'PASSENGER_FIRST', flightData: { ...session.flightData, passengerIndex: idx } });
        await sendWhatsAppText(to, `Prénom du passager ${idx + 1} ?`);
      } else if (isOuiNon && upper === 'NON') {
        const form = step1Form(session);
        const list = (form.passengers || []).map(p => `${(p.firstName || '').trim()} ${(p.lastName || '').trim()}`.trim()).filter(Boolean).join(', ') || '—';
        setTunnelSession(phone, { step: 'PASSENGERS_CONFIRM', flightData: session.flightData });
        await sendYesNo(to, `Passagers : ${list}. Confirmer cette liste ?`);
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non.');
      }
      return;
    case 'PASSENGERS_CONFIRM':
      if (isOuiNon && upper === 'OUI') {
        setTunnelSession(phone, { step: 'CONFIRM_PHONE', flightData: session.flightData });
        const displayPhone = to.replace(/^33/, '0');
        await sendYesNo(to, `On vous contacte au *${displayPhone}* pour ce dossier ?`);
      } else if (isOuiNon && upper === 'NON') {
        setTunnelSession(phone, { step: 'PASSENGER_FIRST', flightData: { passengers: [], passengerIndex: 0, flights: [], segmentIndex: 0 } });
        await sendWhatsAppText(to, 'Prénom du passager 1 ?');
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non pour confirmer la liste des passagers.');
      }
      return;
    case 'CONFIRM_PHONE':
      if (isOuiNon && upper === 'OUI') {
        setTunnelSession(phone, { step: 'TRAJET_FLIGHT', flightData: session.flightData });
        await sendWhatsAppText(to, "Quel est le numéro de vol ? (ex. AF123) — ou envoyez une photo de votre carte d'embarquement.");
      } else if (isOuiNon && upper === 'NON') {
        setTunnelSession(phone, { step: 'ASK_CONTACT_PHONE', flightData: session.flightData });
        await sendWhatsAppText(to, "Quel numéro de téléphone souhaitez-vous utiliser pour ce dossier ?");
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non.');
      }
      return;
    case 'ASK_CONTACT_PHONE': {
      const num = (msg || '').replace(/\D/g, '');
      if (num.length >= 8) {
        setTunnelSession(phone, { step: 'TRAJET_FLIGHT', flightData: { ...session.flightData, contactPhone: msg } });
        await sendWhatsAppText(to, "Quel est le numéro de vol ? (ex. AF123) — ou envoyez une photo de votre carte d'embarquement.");
      } else {
        await sendWhatsAppText(to, 'Indiquez un numéro de téléphone valide.');
      }
      return;
    }
    case 'TRAJET_FLIGHT': {
      const flightMatch = msg.match(/\b([A-Z]{2}\s*\d{2,4})\b/i);
      if (flightMatch) {
        const flightNumber = flightMatch[1].replace(/\s/g, '').toUpperCase();
        const form = step1Form(session);
        const flights = [...(form.flights || [])];
        const segIdx = form.segmentIndex ?? 0;
        while (flights.length <= segIdx) flights.push({ flightNumber: '', date: '' });
        flights[segIdx] = { flightNumber, date: '' };
        setTunnelSession(phone, { step: 'TRAJET_DATE', flightData: { ...session.flightData, flights, segmentIndex: segIdx } });
        await sendWhatsAppText(to, 'Quelle est la date du vol ? (format JJ/MM/AAAA)');
      } else {
        await sendWhatsAppText(to, "Indiquez un numéro de vol (ex. AF123) ou envoyez une photo de la carte d'embarquement.");
      }
      return;
    }
    case 'TRAJET_DATE':
      if (isDate) {
        const [, d, m, y] = msg.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        const dateStr = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
        const form = step1Form(session);
        const flights = [...(form.flights || [])];
        const segIdx = form.segmentIndex ?? 0;
        while (flights.length <= segIdx) flights.push({ flightNumber: '', date: '' });
        flights[segIdx] = { ...flights[segIdx], date: dateStr };
        setTunnelSession(phone, { step: 'TRAJET_CONNECTION', flightData: { ...session.flightData, flights } });
        await sendYesNo(to, 'Une correspondance sur la même réservation ?');
      } else {
        await sendWhatsAppText(to, 'Date au format JJ/MM/AAAA.');
      }
      return;
    case 'TRAJET_CONNECTION':
      if (isOuiNon && upper === 'OUI') {
        const form = step1Form(session);
        const flights = [...(form.flights || []), { flightNumber: '', date: '' }];
        setTunnelSession(phone, { step: 'TRAJET_FLIGHT', flightData: { ...session.flightData, flights, segmentIndex: (form.segmentIndex ?? 0) + 1 } });
        await sendWhatsAppText(to, 'Numéro du vol de correspondance ? (ex. AT456)');
      } else if (isOuiNon && upper === 'NON') {
        const form = step1Form(session);
        const summary = (form.flights || []).map((f, i) => `Vol ${i + 1} ${f.flightNumber} (${f.date})`).join(', ');
        setTunnelSession(phone, { step: 'TRAJET_CONFIRM', flightData: session.flightData });
        await sendYesNo(to, `Trajet : ${summary || '—'}. On valide ?`);
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non (correspondance ?).');
      }
      return;
    case 'TRAJET_CONFIRM':
      if (isOuiNon && upper === 'OUI') {
        setTunnelSession(phone, { step: 'ASK_PNR', flightData: session.flightData });
        await sendWhatsAppText(to, 'Quel est votre code PNR (réservation) ? (6 caractères, ex. ABC123)');
      } else if (isOuiNon && upper === 'NON') {
        setTunnelSession(phone, { step: 'TRAJET_FLIGHT', flightData: { ...session.flightData, segmentIndex: 0 } });
        await sendWhatsAppText(to, "Quel est le numéro de vol ? (ex. AF123) — ou envoyez une photo de votre carte d'embarquement.");
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non.');
      }
      return;
    case 'ASK_PNR': {
      const pnr = (msg || '').replace(/\s/g, '').toUpperCase().slice(0, 6);
      if (pnr.length >= 4) {
        setTunnelSession(phone, { step: 'CONFIRM_PNR', flightData: { ...session.flightData, pnr } });
        await sendYesNo(to, `PNR *${pnr}*, c'est bien ça ?`);
      } else {
        await sendWhatsAppText(to, 'Code PNR : 6 caractères (ex. ABC123).');
      }
      return;
    }
    case 'CONFIRM_PNR':
      if (isOuiNon && upper === 'OUI') {
        setTunnelSession(phone, { step: 'ASK_AIRLINE', flightData: session.flightData });
        await sendWhatsAppText(to, "Quelle est la compagnie aérienne du vol principal ?");
      } else if (isOuiNon && upper === 'NON') {
        setTunnelSession(phone, { step: 'ASK_PNR', flightData: { ...session.flightData, pnr: undefined } });
        await sendWhatsAppText(to, 'Quel est votre code PNR (réservation) ? (6 caractères, ex. ABC123)');
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non.');
      }
      return;
    case 'ASK_AIRLINE':
      setTunnelSession(phone, { step: 'ASK_ADDRESS', flightData: { ...session.flightData, airline: msg } });
      await sendWhatsAppText(to, "Quelle est votre adresse postale ? (ville, code postal, pays)");
      return;
    case 'ASK_ADDRESS': {
      const form = step1Form(session);
      const recap = [
        `Passagers : ${(form.passengers || []).map(p => `${p.firstName} ${p.lastName}`).join(', ')}`,
        `Vol(s) : ${(form.flights || []).map(f => `${f.flightNumber} (${f.date})`).join(', ')}`,
        `PNR : ${form.pnr || '—'}`,
        `Compagnie : ${form.airline || '—'}`,
        `Adresse : ${msg}`,
      ].join('\n');
      setTunnelSession(phone, { step: 'STEP1_DONE', flightData: { ...session.flightData, address: msg } });
      await sendWhatsAppText(to, `Nous avons bien enregistré toutes les informations pour votre dossier.\n\n${recap}\n\nProchaine étape : nous vous enverrons le mandat à signer (Yousign).`);
      return;
    }
    case 'STEP1_DONE':
      await sendWhatsAppText(to, "Pour toute question, répondez ici. Pour recommencer un nouveau dossier, tapez NOUVEAU.");
      return;

    case 'AWAITING_CARD':
      await sendWhatsAppText(to, ROBIN_ACCUEIL);
      return;
    case 'CONFIRM_FLIGHT':
      if (isOuiNon && upper === 'OUI') {
        setTunnelSession(phone, { step: 'CHECK_CONNECTION' });
        await sendYesNo(to, 'Y avait-il un autre vol (correspondance) sur cette même réservation ?');
      } else if (isOuiNon && upper === 'NON') {
        setTunnelSession(phone, { step: 'AWAITING_CARD', flightData: null });
        await sendWhatsAppText(to, ROBIN_ACCUEIL);
      } else {
        await sendWhatsAppText(to, 'Répondez OUI ou NON pour confirmer le vol.');
      }
      return;
    case 'CHECK_CONNECTION':
      if (isOuiNon) {
        setTunnelSession(phone, { step: 'ASK_PASSENGERS' });
        await sendPassengerCountList(to);
      } else {
        await sendYesNo(to, 'Y avait-il un autre vol (correspondance) sur la même réservation ?');
      }
      return;
    case 'ASK_PASSENGERS_MANUAL': {
      const n7 = parseInt(msg, 10);
      if (/^\d+$/.test(msg) && n7 >= 7 && n7 <= 20) {
        setTunnelSession(phone, { passengerCount: n7, step: 'CONFIRM_DATE' });
        const date = session.flightData?.date || '—';
        await sendInteractiveButtons(to, `S'agit-il bien du vol du *${date}* ?`, [
          { id: 'robin_oui', title: '✅ Oui' },
          { id: 'date_edit', title: '✏️ Autre date' }
        ]);
      } else {
        await sendWhatsAppText(to, 'Indiquez un nombre entre 7 et 20 (chiffres uniquement).');
      }
      return;
    }
    case 'ASK_PASSENGERS':
      if (msg === '7+') {
        setTunnelSession(phone, { step: 'ASK_PASSENGERS_MANUAL' });
        await sendWhatsAppText(to, 'Indiquez le nombre exact de passagers (7 à 20), en chiffres uniquement.');
        return;
      }
      if (isNum) {
        const n = parseInt(msg, 10);
        if (n >= 1 && n <= 20) {
          setTunnelSession(phone, { passengerCount: n, step: 'CONFIRM_DATE' });
          const date = session.flightData?.date || '—';
          await sendInteractiveButtons(to, `S'agit-il bien du vol du *${date}* ?`, [
            { id: 'robin_oui', title: '✅ Oui' },
            { id: 'date_edit', title: '✏️ Autre date' }
          ]);
        } else {
          await sendWhatsAppText(to, 'Indiquez un nombre de passagers (1 à 20).');
        }
      } else {
        await sendPassengerCountList(to);
      }
      return;
    case 'CONFIRM_DATE': {
      if (msg === 'DATE_EDIT') {
        await sendWhatsAppText(to, 'Indiquez la date du vol au format JJ/MM/AAAA.');
        return;
      }
      if (upper === 'OUI') {
        const fd = session.flightData || {};
        const count = session.passengerCount || 1;
        const flightNum = fd.flightNumber || '';
        const elig = await getFlightEligibility(flightNum, origin);
        const eligible = elig.eligible && (elig.amount || 0) >= 600;
        setTunnelSession(phone, { step: 'VERDICT' });
        const total = count * 600;
        const reply = eligible
          ? `🎯 EXCELLENTE NOUVELLE ! Pour ${count} passager(s), vous pouvez récupérer *${total}€*. Cliquez ici pour signer le mandat : ${LIEN_SIGNATURE}`
          : `Après analyse, ce vol n'est pas éligible (${elig.eligible ? '' : 'retard insuffisant ou conditions non remplies'}). Voulez-vous vérifier un autre vol ? Envoyez une nouvelle photo.`;
        await sendWhatsAppText(to, reply);
        return;
      }
      if (isDate) {
        const [, d, m, y] = msg.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        const dateStr = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
        setTunnelSession(phone, { flightData: { ...session.flightData, date: dateStr } });
        const count = session.passengerCount || 1;
        const elig = await getFlightEligibility(session.flightData?.flightNumber || '', origin);
        const eligible = elig.eligible && (elig.amount || 0) >= 600;
        setTunnelSession(phone, { step: 'VERDICT' });
        const total = count * 600;
        const reply = eligible
          ? `🎯 EXCELLENTE NOUVELLE ! Pour ${count} passager(s), vous pouvez récupérer *${total}€*. Cliquez ici : ${LIEN_SIGNATURE}`
          : `Après analyse, ce vol n'est pas éligible. Voulez-vous vérifier un autre vol ? Envoyez une nouvelle photo.`;
        await sendWhatsAppText(to, reply);
        return;
      }
      await sendWhatsAppText(to, "Répondez OUI ou tapez la date au format JJ/MM/AAAA.");
      return;
    }
    case 'VERDICT':
      setTunnelSession(phone, { step: 'AWAITING_CARD', flightData: null, passengerCount: 0 });
      await sendWhatsAppText(to, ROBIN_ACCUEIL);
      return;
    default:
      await sendWhatsAppText(to, ROBIN_ACCUEIL);
  }
}

async function getImageBase64FromMessage(msg, d360Key) {
  if (msg.type !== 'image' || !msg.image) return null;
  const id = msg.image.id;
  const url = msg.image.url;
  if (url) {
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      return Buffer.from(buf).toString('base64');
    } catch (e) {
      console.error('getImageBase64 fetch url', e.message);
      return null;
    }
  }
  if (id && d360Key) {
    const mediaUrl = `${D360_BASE}/media/${id}`;
    try {
      const res = await fetch(mediaUrl, { headers: { 'D360-API-KEY': d360Key } });
      const json = await res.json().catch(() => ({}));
      const u = json.url || json.link;
      if (u) {
        const r2 = await fetch(u);
        const buf = await r2.arrayBuffer();
        return Buffer.from(buf).toString('base64');
      }
    } catch (e) {
      console.error('getImageBase64 media id', e.message);
    }
  }
  return null;
}

exports.handler = async (event) => {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const logWebhookUrl = process.env.ROBIN_LOG_WEBHOOK_URL;
  const origin = event.headers?.origin || event.headers?.['x-forwarded-host'] ? `https://${event.headers['x-forwarded-host']}` : (process.env.URL || 'https://robindesairs.eu');

  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    const mode = q['hub.mode'] || q.hub_mode;
    const token = q['hub.verify_token'] || q.hub_verify_token;
    const challenge = q['hub.challenge'] || q.hub_challenge;
    // 360dialog n'a pas de champ "verify token" dans son interface — on accepte si challenge présent
    const tokenOk = !apiKey || token === apiKey;
    if (mode === 'subscribe' && tokenOk && challenge) {
      return { statusCode: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: challenge };
    }
    // Mauvais verify_token alors que Meta tente un subscribe : on refuse
    if (mode === 'subscribe' && apiKey && token != null && token !== '' && token !== apiKey) {
      return { statusCode: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'Forbidden' };
    }
    // Visite navigateur / sonde sans paramètres d'abonnement : 200 JSON explicatif (pas une erreur)
    const statusPath = '/api/whatsapp-status';
    const base = (process.env.URL || 'https://robindesairs.eu').replace(/\/$/, '');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        ok: true,
        service: 'Robin des Airs — WhatsApp webhook',
        message:
          "Cette URL reçoit les événements WhatsApp en POST. L'ouvrir dans un navigateur ne fait qu'afficher cette page : le webhook fonctionne.",
        verification:
          "Meta envoie un GET avec hub.mode=subscribe, hub.verify_token (= WHATSAPP_API_KEY sur Netlify) et hub.challenge pour valider l'abonnement.",
        status_url: base + statusPath,
      }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const sendConfig = getSendConfig();
  const canSend = (sendConfig.provider === 'meta' && sendConfig.phoneNumberId && sendConfig.accessToken) || (sendConfig.provider === '360dialog' && sendConfig.d360Key);
  if (!canSend) {
    console.error('whatsapp-webhook: configuration manquante (WHATSAPP_360DIALOG_API_KEY ou WHATSAPP_PHONE_NUMBER_ID+WHATSAPP_ACCESS_TOKEN)');
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Configuration manquante' }) };
  }

  const d360KeyForMedia = process.env.WHATSAPP_360DIALOG_API_KEY;
  // Ne filtrer par numéro/compte que si on envoie via Meta (sinon 360dialog peut avoir un autre format et tout ignorer)
  const useMetaSend = sendConfig.provider === 'meta' && sendConfig.phoneNumberId && sendConfig.accessToken;
  const phoneNumberIdFilter = useMetaSend ? process.env.WHATSAPP_PHONE_NUMBER_ID : null;
  const businessAccountIdFilter = useMetaSend ? process.env.WHATSAPP_BUSINESS_ACCOUNT_ID : null;
  const contactNumber = process.env.WHATSAPP_CONTACT_NUMBER || '';
  const contactLink = contactNumber ? ` https://wa.me/${contactNumber.replace(/\D/g, '')}` : '';

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch (e) {
    console.error('whatsapp-webhook: body parse error', e.message);
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const entries = body.entry || [];
  const msgCount = entries.reduce((acc, e) => acc + ((e.changes || []).filter(c => c.field === 'messages').reduce((a, c) => a + ((c.value && c.value.messages) || []).length, 0)), 0);
  console.log('whatsapp-webhook: POST received', 'entries=' + entries.length, 'messages=' + msgCount);
  if (entries.length === 0) {
    console.log('whatsapp-webhook: no entry in body', JSON.stringify(body).slice(0, 500));
  }

  for (const entry of entries) {
    if (businessAccountIdFilter && entry.id && entry.id !== businessAccountIdFilter) {
      console.log('whatsapp-webhook: skip entry (business_account_id)', entry.id, '!==', businessAccountIdFilter);
      continue;
    }

    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') {
        continue;
      }
      const value = change.value || {};
      if (phoneNumberIdFilter && value.metadata?.phone_number_id && value.metadata.phone_number_id !== phoneNumberIdFilter) {
        console.log('whatsapp-webhook: skip change (phone_number_id)', value.metadata.phone_number_id, '!==', phoneNumberIdFilter);
        continue;
      }

      const messages = value.messages || [];
      const from = value.contacts?.[0]?.wa_id || value.metadata?.phone_number_id;
      const phoneNumberId = value.metadata?.phone_number_id;

      for (const msg of messages) {
        const fromId = msg.from || from;
        const userText = extractUserText(msg);
        const msgId = msg.id;
        const msgType = msg.type || 'text';

        // Déduplication : ne répondre qu'une fois par message_id (évite 5 réponses si le webhook est appelé 5 fois)
        const dedupDisabled = process.env.ROBIN_DEDUP_DISABLED === 'true';
        if (!dedupDisabled && msgId) {
          try {
            if (!netlifyBlobsModule) throw new Error("Cannot find module '@netlify/blobs'");
            const blobs = netlifyBlobsModule;
            if (blobs.connectLambda && event) blobs.connectLambda(event);
            const store = blobs.getStore('robin-wa');
            const raw = await store.get('replied_msg_ids');
            const repliedIds = (typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch (_) { return []; } })() : raw) || [];
            if (Array.isArray(repliedIds) && repliedIds.includes(msgId)) {
              console.log('whatsapp-webhook: skip duplicate message_id', msgId);
              continue;
            }
            const nextIds = [...(repliedIds || []), msgId].slice(-300);
            await store.set('replied_msg_ids', JSON.stringify(nextIds));
          } catch (e) {
            console.log('whatsapp-webhook: dedup check failed', e.message);
          }
        }

        console.log('whatsapp-webhook: will process and reply', 'from=' + (fromId || '').slice(-4) + '****', 'msgId=' + (msgId || 'none'));

        const logPayload = {
          wa_id: fromId,
          from_phone: fromId,
          message_id: msgId,
          message_type: msgType,
          body_text: userText,
          raw_payload: JSON.stringify(msg),
          direction: 'in'
        };
        console.log('whatsapp-webhook: message', JSON.stringify(logPayload));
        if (logWebhookUrl) {
          try {
            await fetch(logWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logPayload) });
          } catch (e) {
            console.error('whatsapp-webhook: log POST failed', e.message);
          }
        }

        const to = normalizeTo(fromId);
        if (!to) {
          console.error('whatsapp-webhook: could not normalize to', fromId);
          continue;
        }

        try {
          const tunnelEnabled = process.env.ROBIN_TUNNEL_ENABLED === 'true' || (process.env.GEMINI_API_KEY && process.env.ROBIN_TUNNEL_ENABLED !== 'false');
          const geminiDelayEnabled = process.env.ROBIN_GEMINI_DELAY_ENABLED === 'true';

          if (tunnelEnabled) {
            let imageBase64 = null;
            let imageMime = 'image/jpeg';
            if (msgType === 'image') {
              imageBase64 = await getImageBase64FromMessage(msg, d360KeyForMedia);
              if (msg.image && msg.image.mime_type) imageMime = msg.image.mime_type;
              if (!imageBase64) {
                console.log('whatsapp-webhook: image not fetched (url/id + d360Key?)', !!msg.image?.url, !!msg.image?.id, !!d360KeyForMedia);
                await sendWhatsAppText(to, "Je n'ai pas pu récupérer votre photo. Réessayez d'envoyer l'image (carte d'embarquement ou confirmation de billet), ou envoyez « Bonjour » pour le menu.");
                continue;
              }
            }

            // Relais Gemini après 20s : message texte → mise en attente + accusé ; les images sont traitées tout de suite
            if (geminiDelayEnabled && msgType !== 'image' && msgType !== 'interactive') {
              let store;
              try {
                if (!netlifyBlobsModule) throw new Error("Cannot find module '@netlify/blobs'");
                const blobs = netlifyBlobsModule;
                if (blobs.connectLambda && event) blobs.connectLambda(event);
                store = blobs.getStore('robin-wa');
              } catch (e) {
                console.log('whatsapp-webhook: blobs not available, no delay', e.message);
              }
              if (store) {
                const phone = normalizeTo(fromId);
                const convoKey = 'convo/' + phone;
                const pendingKey = 'pending/' + phone;
                try {
                  let convo = [];
                  try {
                    const raw = await store.get(convoKey);
                    convo = (typeof raw === 'string' ? JSON.parse(raw) : raw) || [];
                  } catch (_) {}
                  convo.push({ role: 'user', text: userText });
                  await store.set(convoKey, JSON.stringify(convo.slice(-30)));
                  await store.set(pendingKey, JSON.stringify({ at: Date.now(), lastText: userText }));
                  await sendWhatsAppText(to, "Un instant, je vous réponds dans quelques secondes…");
                  continue;
                } catch (blobErr) {
                  console.error('whatsapp-webhook: blob write failed', blobErr.message);
                }
              }
            }

            await handleTunnel(fromId, userText || '', imageBase64, imageMime, origin);
            continue;
          }

          if (msgType === 'image') {
            const imageBase64ForOcr = await getImageBase64FromMessage(msg, d360KeyForMedia);
            if (!imageBase64ForOcr) {
              console.log('whatsapp-webhook: image not fetched for OCR', !!msg.image?.url, !!msg.image?.id, !!d360KeyForMedia);
              await sendWhatsAppText(to, "Je n'ai pas pu récupérer votre photo. Réessayez d'envoyer l'image (carte d'embarquement ou confirmation de billet).");
              continue;
            }
            const ocr = await geminiVisionOcr(imageBase64ForOcr, (msg.image && msg.image.mime_type) ? msg.image.mime_type : 'image/jpeg');
            if (ocr && ocr.flightNumber) {
              const reply = `Je vois le vol *${ocr.flightNumber}*, est-ce correct ?${ocr.passengerName ? ` (Passager : ${ocr.passengerName})` : ''}`;
              await sendYesNo(to, reply);
            } else {
              await sendWhatsAppText(to, "Je n'ai pas pu lire la carte d'embarquement. Envoyez une photo plus nette.");
            }
            continue;
          }

          if (!userText) {
            await sendWhatsAppText(to, MENU_BIENVENUE);
            continue;
          }

          if (isBonjourLike(userText)) {
            await sendWhatsAppText(to, MENU_BIENVENUE);
            continue;
          }

          const flightNum = parseFlightNumber(userText);
          if (flightNum) {
            const result = await getFlightEligibility(flightNum, origin);
            if (result.eligible && result.amount >= 600) {
              const reply = `Bonne nouvelle ! Votre vol ${flightNum} est éligible à 600€. Cliquez ici pour signer votre dossier : ${LIEN_DEPOT}`;
              await sendWhatsAppText(to, reply);
            } else {
              const reply = result.dep && result.arr
                ? `Vol ${flightNum} (${result.dep} → ${result.arr}) trouvé. Pour confirmer l'éligibilité (retard ≥3h), déposez votre dossier : ${LIEN_DEPOT}`
                : `Nous n'avons pas pu vérifier le vol ${flightNum}. Déposez votre dossier avec le numéro et la date du vol : ${LIEN_DEPOT}`;
              await sendWhatsAppText(to, reply);
            }
            continue;
          }

          await sendWhatsAppText(to, `Pour vérifier votre éligibilité, envoyez-nous votre numéro de vol (ex: AF718). Ou déposez directement : ${LIEN_DEPOT}`);
        } catch (err) {
          console.error('whatsapp-webhook: processing error', err.message || err, err.stack);
          try {
            await sendWhatsAppText(to, 'Désolé, un problème technique est survenu. Réessayez dans un instant ou contactez-nous.' + contactLink);
          } catch (sendErr) {
            console.error('whatsapp-webhook: fallback send failed', sendErr.message);
          }
        }
      }
    }
  }

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};

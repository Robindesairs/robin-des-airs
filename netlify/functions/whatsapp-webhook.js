/**
 * Webhook WhatsApp (360dialog) — route /api/whatsapp-webhook.
 *
 * Si ROBIN_TUNNEL_ENABLED=true : tunnel conversationnel (carte d'embarquement → OCR Gemini → étapes → verdict).
 * Sinon : mode classique (Bonjour, numéro de vol, éligibilité).
 *
 * Variables : WHATSAPP_API_KEY, WHATSAPP_360DIALOG_API_KEY, ROBIN_LOG_WEBHOOK_URL,
 *   ROBIN_TUNNEL_ENABLED (optionnel), GEMINI_API_KEY (si tunnel).
 */

const D360_BASE = 'https://waba-v2.360dialog.io';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const LIEN_DEPOT = 'https://robindesairs.eu/depot-en-ligne.html';
const LIEN_SIGNATURE = 'https://robindesairs.eu/depot-en-ligne.html';
const MENU_BIENVENUE = `👋 *Robin des Airs* — Récupérez jusqu'à 600€ si votre vol a été retardé ou annulé.

• Envoyez-nous votre *numéro de vol* (ex: AF718, BA123) pour vérifier votre éligibilité.
• Ou dites *Bonjour* pour ce menu.
• Déposer un dossier : https://robindesairs.eu/depot-en-ligne.html
• Nous contacter : https://wa.me/15557840392`;

const ROBIN_ACCUEIL = "Bonjour ! Je suis Robin 🏹. Envoyez-moi une photo de votre carte d'embarquement, je m'occupe d'analyser vos droits en 30 secondes.";

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

async function sendWhatsAppText(to, text, apiKey) {
  const url = `${D360_BASE}/messages`;
  const toClean = String(to).replace(/\D/g, '');
  if (!toClean || toClean.length < 8) {
    console.error('whatsapp-webhook: send skipped, to invalid', to);
    return false;
  }
  console.log('whatsapp-webhook: sending reply to', toClean.slice(-4) + '****', 'len=' + (text && text.length));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'D360-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toClean,
      type: 'text',
      text: { body: (text || '').slice(0, 4096) }
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('whatsapp-webhook: send error', res.status, data);
    return false;
  }
  return true;
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

async function handleTunnel(phone, text, imageBase64, imageMime, origin, d360Key) {
  const to = normalizeTo(phone);
  const session = getTunnelSession(phone);
  const msg = (text || '').trim();
  const upper = (msg || '').toUpperCase();
  const isOuiNon = /^(OUI|NON)$/i.test(upper);
  const isNum = /^\d+$/.test(msg);
  const isDate = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(msg);

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
      const nextMsg = nextStep === 'TRAJET_DATE' ? "Quelle est la date du vol ? (format JJ/MM/AAAA)" : "Y a-t-il une correspondance (autre vol sur la même réservation) ? (Oui / Non)";
      await sendWhatsAppText(to, `Je vois le vol *${ocr.flightNumber}*. ${nextMsg}`, d360Key);
      return;
    }
    if (ocr.flightNumber) {
      setTunnelSession(phone, { step: 'CONFIRM_FLIGHT', flightData: { flightNumber: ocr.flightNumber, date: ocr.date, passengerName: ocr.passengerName } });
      const reply = `Je vois le vol *${ocr.flightNumber}*, est-ce correct ?${ocr.passengerName ? ` (Passager : ${ocr.passengerName})` : ''} Répondez OUI ou NON.`;
      await sendWhatsAppText(to, reply, d360Key);
      return;
    }
    await sendWhatsAppText(to, "Je n'ai pas pu lire la carte d'embarquement. Envoyez une photo plus nette.", d360Key);
    return;
  }

  // Premier message ou "Bonjour" → démarrer l'Étape 1 (grand 1)
  if (!msg && session.step === 'AWAITING_CARD') {
    setTunnelSession(phone, { step: 'PASSENGER_FIRST', flightData: { passengers: [], passengerIndex: 0, flights: [], segmentIndex: 0 } });
    await sendWhatsAppText(to, 'Prénom du passager 1 ?', d360Key);
    return;
  }
  if (msg && session.step === 'AWAITING_CARD' && isBonjourLike(msg)) {
    setTunnelSession(phone, { step: 'PASSENGER_FIRST', flightData: { passengers: [], passengerIndex: 0, flights: [], segmentIndex: 0 } });
    await sendWhatsAppText(to, 'Prénom du passager 1 ?', d360Key);
    return;
  }
  if (!msg && isStep1(session.step)) {
    const prompts = { PASSENGER_FIRST: 'Prénom du passager 1 ?', PASSENGER_LAST: 'Nom du passager ?', PASSENGER_ANOTHER: 'Y a-t-il un autre passager ? (Oui / Non)', PASSENGERS_CONFIRM: 'Confirmer la liste des passagers ? (Oui / Non)', CONFIRM_PHONE: 'Est-ce bien ce numéro pour vous joindre ? (Oui / Non)', ASK_CONTACT_PHONE: 'Quel numéro pour ce dossier ?', TRAJET_FLIGHT: "Numéro de vol (ex. AF123) ou photo de la carte d'embarquement.", TRAJET_DATE: 'Date du vol (JJ/MM/AAAA)', TRAJET_CONNECTION: 'Correspondance ? (Oui / Non)', TRAJET_CONFIRM: 'Confirmer le trajet ? (Oui / Non)', ASK_PNR: 'Code PNR (6 caractères)', CONFIRM_PNR: 'Confirmer le PNR ? (Oui / Non)', ASK_AIRLINE: 'Compagnie aérienne ?', ASK_ADDRESS: 'Adresse postale (ville, code postal, pays) ?', STEP1_DONE: 'Prochaine étape : envoi du mandat (Yousign).' };
    await sendWhatsAppText(to, prompts[session.step] || 'Répondez à la question ci-dessus.', d360Key);
    return;
  }

  if (msg && !isOuiNon && !isNum && !isDate && msg.length > 2 && !isStep1(session.step)) {
    const side = await geminiSideAnswer(msg, session.step);
    if (side) {
      const stepMsg = session.step === 'AWAITING_CARD' ? ROBIN_ACCUEIL : (session.step === 'CONFIRM_FLIGHT' && session.flightData?.flightNumber) ? `Est-ce bien le vol *${session.flightData.flightNumber}* ? (OUI/NON)` : 'Répondez à la question ci-dessus.';
      await sendWhatsAppText(to, side + '\n\n---\n' + stepMsg, d360Key);
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
      await sendWhatsAppText(to, `Nom du passager ${idx + 1} ?`, d360Key);
      return;
    }
    case 'PASSENGER_LAST': {
      const form = step1Form(session);
      const idx = form.passengerIndex ?? 0;
      const passengers = [...(form.passengers || [])];
      while (passengers.length <= idx) passengers.push({ firstName: '', lastName: '' });
      passengers[idx] = { ...passengers[idx], lastName: msg };
      setTunnelSession(phone, { step: 'PASSENGER_ANOTHER', flightData: { ...session.flightData, passengers, passengerIndex: idx } });
      await sendWhatsAppText(to, "Y a-t-il un autre passager ? (Oui / Non)", d360Key);
      return;
    }
    case 'PASSENGER_ANOTHER':
      if (isOuiNon && upper === 'OUI') {
        const form = step1Form(session);
        const idx = (form.passengerIndex ?? 0) + 1;
        setTunnelSession(phone, { step: 'PASSENGER_FIRST', flightData: { ...session.flightData, passengerIndex: idx } });
        await sendWhatsAppText(to, `Prénom du passager ${idx + 1} ?`, d360Key);
      } else if (isOuiNon && upper === 'NON') {
        const form = step1Form(session);
        const list = (form.passengers || []).map(p => `${(p.firstName || '').trim()} ${(p.lastName || '').trim()}`.trim()).filter(Boolean).join(', ') || '—';
        setTunnelSession(phone, { step: 'PASSENGERS_CONFIRM', flightData: session.flightData });
        await sendWhatsAppText(to, `Passagers : ${list}. Confirmer ? (Oui / Non)`, d360Key);
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non.', d360Key);
      }
      return;
    case 'PASSENGERS_CONFIRM':
      if (isOuiNon && upper === 'OUI') {
        setTunnelSession(phone, { step: 'CONFIRM_PHONE', flightData: session.flightData });
        const displayPhone = to.replace(/^33/, '0');
        await sendWhatsAppText(to, `Est-ce bien le numéro auquel nous pouvons vous joindre pour ce dossier : *${displayPhone}* ? (Oui / Non)`, d360Key);
      } else if (isOuiNon && upper === 'NON') {
        setTunnelSession(phone, { step: 'PASSENGER_FIRST', flightData: { passengers: [], passengerIndex: 0, flights: [], segmentIndex: 0 } });
        await sendWhatsAppText(to, 'Prénom du passager 1 ?', d360Key);
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non pour confirmer la liste des passagers.', d360Key);
      }
      return;
    case 'CONFIRM_PHONE':
      if (isOuiNon && upper === 'OUI') {
        setTunnelSession(phone, { step: 'TRAJET_FLIGHT', flightData: session.flightData });
        await sendWhatsAppText(to, "Quel est le numéro de vol ? (ex. AF123) — ou envoyez une photo de votre carte d'embarquement.", d360Key);
      } else if (isOuiNon && upper === 'NON') {
        setTunnelSession(phone, { step: 'ASK_CONTACT_PHONE', flightData: session.flightData });
        await sendWhatsAppText(to, "Quel numéro de téléphone souhaitez-vous utiliser pour ce dossier ?", d360Key);
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non.', d360Key);
      }
      return;
    case 'ASK_CONTACT_PHONE': {
      const num = (msg || '').replace(/\D/g, '');
      if (num.length >= 8) {
        setTunnelSession(phone, { step: 'TRAJET_FLIGHT', flightData: { ...session.flightData, contactPhone: msg } });
        await sendWhatsAppText(to, "Quel est le numéro de vol ? (ex. AF123) — ou envoyez une photo de votre carte d'embarquement.", d360Key);
      } else {
        await sendWhatsAppText(to, 'Indiquez un numéro de téléphone valide.', d360Key);
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
        await sendWhatsAppText(to, 'Quelle est la date du vol ? (format JJ/MM/AAAA)', d360Key);
      } else {
        await sendWhatsAppText(to, "Indiquez un numéro de vol (ex. AF123) ou envoyez une photo de la carte d'embarquement.", d360Key);
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
        await sendWhatsAppText(to, "Y a-t-il une correspondance (autre vol sur la même réservation) ? (Oui / Non)", d360Key);
      } else {
        await sendWhatsAppText(to, 'Date au format JJ/MM/AAAA.', d360Key);
      }
      return;
    case 'TRAJET_CONNECTION':
      if (isOuiNon && upper === 'OUI') {
        const form = step1Form(session);
        const flights = [...(form.flights || []), { flightNumber: '', date: '' }];
        setTunnelSession(phone, { step: 'TRAJET_FLIGHT', flightData: { ...session.flightData, flights, segmentIndex: (form.segmentIndex ?? 0) + 1 } });
        await sendWhatsAppText(to, 'Numéro du vol de correspondance ? (ex. AT456)', d360Key);
      } else if (isOuiNon && upper === 'NON') {
        const form = step1Form(session);
        const summary = (form.flights || []).map((f, i) => `Vol ${i + 1} ${f.flightNumber} (${f.date})`).join(', ');
        setTunnelSession(phone, { step: 'TRAJET_CONFIRM', flightData: session.flightData });
        await sendWhatsAppText(to, `Trajet : ${summary || '—'}. Confirmer ? (Oui / Non)`, d360Key);
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non (correspondance ?).', d360Key);
      }
      return;
    case 'TRAJET_CONFIRM':
      if (isOuiNon && upper === 'OUI') {
        setTunnelSession(phone, { step: 'ASK_PNR', flightData: session.flightData });
        await sendWhatsAppText(to, 'Quel est votre code PNR (réservation) ? (6 caractères, ex. ABC123)', d360Key);
      } else if (isOuiNon && upper === 'NON') {
        setTunnelSession(phone, { step: 'TRAJET_FLIGHT', flightData: { ...session.flightData, segmentIndex: 0 } });
        await sendWhatsAppText(to, "Quel est le numéro de vol ? (ex. AF123) — ou envoyez une photo de votre carte d'embarquement.", d360Key);
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non.', d360Key);
      }
      return;
    case 'ASK_PNR': {
      const pnr = (msg || '').replace(/\s/g, '').toUpperCase().slice(0, 6);
      if (pnr.length >= 4) {
        setTunnelSession(phone, { step: 'CONFIRM_PNR', flightData: { ...session.flightData, pnr } });
        await sendWhatsAppText(to, `PNR saisi : *${pnr}*. Confirmer ? (Oui / Non)`, d360Key);
      } else {
        await sendWhatsAppText(to, 'Code PNR : 6 caractères (ex. ABC123).', d360Key);
      }
      return;
    }
    case 'CONFIRM_PNR':
      if (isOuiNon && upper === 'OUI') {
        setTunnelSession(phone, { step: 'ASK_AIRLINE', flightData: session.flightData });
        await sendWhatsAppText(to, "Quelle est la compagnie aérienne du vol principal ?", d360Key);
      } else if (isOuiNon && upper === 'NON') {
        setTunnelSession(phone, { step: 'ASK_PNR', flightData: { ...session.flightData, pnr: undefined } });
        await sendWhatsAppText(to, 'Quel est votre code PNR (réservation) ? (6 caractères, ex. ABC123)', d360Key);
      } else {
        await sendWhatsAppText(to, 'Répondez Oui ou Non.', d360Key);
      }
      return;
    case 'ASK_AIRLINE':
      setTunnelSession(phone, { step: 'ASK_ADDRESS', flightData: { ...session.flightData, airline: msg } });
      await sendWhatsAppText(to, "Quelle est votre adresse postale ? (ville, code postal, pays)", d360Key);
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
      await sendWhatsAppText(to, `Nous avons bien enregistré toutes les informations pour votre dossier.\n\n${recap}\n\nProchaine étape : nous vous enverrons le mandat à signer (Yousign).`, d360Key);
      return;
    }
    case 'STEP1_DONE':
      await sendWhatsAppText(to, "Pour toute question, répondez ici. Pour recommencer un nouveau dossier, tapez NOUVEAU.", d360Key);
      return;

    case 'AWAITING_CARD':
      await sendWhatsAppText(to, ROBIN_ACCUEIL, d360Key);
      return;
    case 'CONFIRM_FLIGHT':
      if (isOuiNon && upper === 'OUI') {
        setTunnelSession(phone, { step: 'CHECK_CONNECTION' });
        await sendWhatsAppText(to, "Y avait-il un autre vol (correspondance) sur cette même réservation ? (OUI/NON)", d360Key);
      } else if (isOuiNon && upper === 'NON') {
        setTunnelSession(phone, { step: 'AWAITING_CARD', flightData: null });
        await sendWhatsAppText(to, ROBIN_ACCUEIL, d360Key);
      } else {
        await sendWhatsAppText(to, 'Répondez OUI ou NON pour confirmer le vol.', d360Key);
      }
      return;
    case 'CHECK_CONNECTION':
      if (isOuiNon) {
        setTunnelSession(phone, { step: 'ASK_PASSENGERS' });
        await sendWhatsAppText(to, "Combien de passagers au total voyageaient avec vous ? (Famille, amis... chaque passager peut toucher 600€ !)", d360Key);
      } else {
        await sendWhatsAppText(to, "Répondez OUI ou NON (correspondance sur la même réservation ?).", d360Key);
      }
      return;
    case 'ASK_PASSENGERS':
      if (isNum) {
        const n = parseInt(msg, 10);
        if (n >= 1 && n <= 20) {
          setTunnelSession(phone, { passengerCount: n, step: 'CONFIRM_DATE' });
          const date = session.flightData?.date || '—';
          await sendWhatsAppText(to, `Dernière vérification : s'agit-il bien du vol du *${date}* ? Si c'est faux, tapez la bonne date au format JJ/MM/AAAA.`, d360Key);
        } else {
          await sendWhatsAppText(to, 'Indiquez un nombre de passagers (1 à 20).', d360Key);
        }
      } else {
        await sendWhatsAppText(to, 'Indiquez un nombre de passagers (1 à 20).', d360Key);
      }
      return;
    case 'CONFIRM_DATE': {
      if (upper === 'OUI' || !msg) {
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
        await sendWhatsAppText(to, reply, d360Key);
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
        await sendWhatsAppText(to, reply, d360Key);
        return;
      }
      await sendWhatsAppText(to, "Répondez OUI ou tapez la date au format JJ/MM/AAAA.", d360Key);
      return;
    }
    case 'VERDICT':
      setTunnelSession(phone, { step: 'AWAITING_CARD', flightData: null, passengerCount: 0 });
      await sendWhatsAppText(to, ROBIN_ACCUEIL, d360Key);
      return;
    default:
      await sendWhatsAppText(to, ROBIN_ACCUEIL, d360Key);
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
  if (id) {
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
  const d360Key = process.env.WHATSAPP_360DIALOG_API_KEY;
  const logWebhookUrl = process.env.ROBIN_LOG_WEBHOOK_URL;
  const origin = event.headers?.origin || event.headers?.['x-forwarded-host'] ? `https://${event.headers['x-forwarded-host']}` : (process.env.URL || 'https://robindesairs.eu');

  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    const mode = q['hub.mode'] || q.hub_mode;
    const token = q['hub.verify_token'] || q.hub_verify_token;
    const challenge = q['hub.challenge'] || q.hub_challenge;
    if (mode === 'subscribe' && token === apiKey && challenge) {
      return { statusCode: 200, body: challenge };
    }
    return { statusCode: 403, body: 'Forbidden' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!d360Key) {
    console.error('whatsapp-webhook: WHATSAPP_360DIALOG_API_KEY manquant');
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Configuration manquante' }) };
  }

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
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') {
        continue;
      }
      const value = change.value || {};
      const messages = value.messages || [];
      const from = value.contacts?.[0]?.wa_id || value.metadata?.phone_number_id;
      const phoneNumberId = value.metadata?.phone_number_id;

      for (const msg of messages) {
        const fromId = msg.from || from;
        const text = (msg.text && msg.text.body) ? String(msg.text.body).trim() : '';
        const msgId = msg.id;
        const msgType = msg.type || 'text';

        const logPayload = {
          wa_id: fromId,
          from_phone: fromId,
          message_id: msgId,
          message_type: msgType,
          body_text: text,
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
          if (tunnelEnabled) {
            let imageBase64 = null;
            let imageMime = 'image/jpeg';
          if (msgType === 'image') {
            imageBase64 = await getImageBase64FromMessage(msg, d360Key);
            if (msg.image && msg.image.mime_type) imageMime = msg.image.mime_type;
          }
          await handleTunnel(fromId, text || '', imageBase64, imageMime, origin, d360Key);
          continue;
        }

        if (msgType === 'image') {
          const ocr = await geminiVisionOcr(await getImageBase64FromMessage(msg, d360Key), (msg.image && msg.image.mime_type) ? msg.image.mime_type : 'image/jpeg');
          if (ocr.flightNumber) {
            const reply = `Je vois le vol *${ocr.flightNumber}*, est-ce correct ?${ocr.passengerName ? ` (Passager : ${ocr.passengerName})` : ''} Répondez OUI ou NON.`;
            await sendWhatsAppText(to, reply, d360Key);
          } else {
            await sendWhatsAppText(to, "Je n'ai pas pu lire la carte d'embarquement. Envoyez une photo plus nette.", d360Key);
          }
            continue;
          }

          if (!text) {
            await sendWhatsAppText(to, MENU_BIENVENUE, d360Key);
            continue;
          }

          if (isBonjourLike(text)) {
            await sendWhatsAppText(to, MENU_BIENVENUE, d360Key);
            continue;
          }

          const flightNum = parseFlightNumber(text);
          if (flightNum) {
            const result = await getFlightEligibility(flightNum, origin);
            if (result.eligible && result.amount >= 600) {
              const reply = `Bonne nouvelle ! Votre vol ${flightNum} est éligible à 600€. Cliquez ici pour signer votre dossier : ${LIEN_DEPOT}`;
              await sendWhatsAppText(to, reply, d360Key);
            } else {
              const reply = result.dep && result.arr
                ? `Vol ${flightNum} (${result.dep} → ${result.arr}) trouvé. Pour confirmer l'éligibilité (retard ≥3h), déposez votre dossier : ${LIEN_DEPOT}`
                : `Nous n'avons pas pu vérifier le vol ${flightNum}. Déposez votre dossier avec le numéro et la date du vol : ${LIEN_DEPOT}`;
              await sendWhatsAppText(to, reply, d360Key);
            }
            continue;
          }

          await sendWhatsAppText(to, `Pour vérifier votre éligibilité, envoyez-nous votre numéro de vol (ex: AF718). Ou déposez directement : ${LIEN_DEPOT}`, d360Key);
        } catch (err) {
          console.error('whatsapp-webhook: processing error', err.message || err, err.stack);
          try {
            await sendWhatsAppText(to, 'Désolé, un problème technique est survenu. Réessayez dans un instant ou contactez-nous : https://wa.me/15557840392', d360Key);
          } catch (sendErr) {
            console.error('whatsapp-webhook: fallback send failed', sendErr.message);
          }
        }
      }
    }
  }

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};

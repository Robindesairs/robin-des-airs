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
• Nous contacter : https://wa.me/33756863630`;

const ROBIN_ACCUEIL = "Bonjour ! Je suis Robin 🏹. Envoyez-moi une photo de votre carte d'embarquement, je m'occupe d'analyser vos droits en 30 secondes.";

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
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'D360-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: String(to).replace(/\D/g, ''),
      type: 'text',
      text: { body: text.slice(0, 4096) }
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

async function geminiOcr(imageBase64, mimeType) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { flightNumber: null, date: null };
  const data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const res = await fetch(`${GEMINI_BASE}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data } },
          { text: 'Extrait UNIQUEMENT du JSON: flightNumber (ex: AF718) et date (JJ/MM/AAAA). Réponds uniquement le JSON.' }
        ]
      }]
    })
  });
  const json = await res.json().catch(() => ({}));
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  try {
    const o = JSON.parse(text);
    return { flightNumber: o.flightNumber || null, date: o.date || null };
  } catch {
    const m = text.match(/\b([A-Z]{2}\d{2,4})\b/i);
    return { flightNumber: m ? m[1] : null, date: null };
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
  if (imageBase64) {
    const ocr = await geminiOcr(imageBase64, imageMime);
    if (ocr.flightNumber) {
      setTunnelSession(phone, { step: 'CONFIRM_FLIGHT', flightData: { flightNumber: ocr.flightNumber, date: ocr.date } });
      const reply = `Merci ! Je vois le vol *${ocr.flightNumber}*. Est-ce bien le bon vol ? (Répondez OUI ou NON)`;
      await sendWhatsAppText(to, reply, d360Key);
      return;
    }
    await sendWhatsAppText(to, "Je n'ai pas pu lire le numéro de vol. Envoyez une photo plus nette de la carte d'embarquement.", d360Key);
    return;
  }
  const session = getTunnelSession(phone);
  const msg = (text || '').trim();
  const upper = (msg || '').toUpperCase();
  const isOuiNon = /^(OUI|NON)$/i.test(upper);
  const isNum = /^\d+$/.test(msg);
  const isDate = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(msg);
  if (msg && !isOuiNon && !isNum && !isDate && msg.length > 2) {
    const side = await geminiSideAnswer(msg, session.step);
    if (side) {
      const stepMsg = session.step === 'AWAITING_CARD' ? ROBIN_ACCUEIL : (session.step === 'CONFIRM_FLIGHT' && session.flightData?.flightNumber) ? `Est-ce bien le vol *${session.flightData.flightNumber}* ? (OUI/NON)` : 'Répondez à la question ci-dessus.';
      await sendWhatsAppText(to, side + '\n\n---\n' + stepMsg, d360Key);
      return;
    }
  }
  switch (session.step) {
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
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const entries = body.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      const messages = value.messages || [];
      const from = value.contacts?.[0]?.wa_id || value.metadata?.phone_number_id;
      const phoneNumberId = value.metadata?.phone_number_id;

      for (const msg of messages) {
        const fromId = msg.from || from;
        const text = (msg.text && msg.text.body) ? msg.text.body.trim() : '';
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
        console.log('whatsapp-webhook: message', logPayload);
        if (logWebhookUrl) {
          try {
            await fetch(logWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logPayload) });
          } catch (e) {
            console.error('whatsapp-webhook: log POST failed', e.message);
          }
        }

        const to = normalizeTo(fromId);

        if (process.env.ROBIN_TUNNEL_ENABLED === 'true') {
          let imageBase64 = null;
          let imageMime = 'image/jpeg';
          if (msgType === 'image') {
            imageBase64 = await getImageBase64FromMessage(msg, d360Key);
            if (msg.image && msg.image.mime_type) imageMime = msg.image.mime_type;
          }
          await handleTunnel(fromId, text || '', imageBase64, imageMime, origin, d360Key);
          continue;
        }

        if (!text) continue;

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
      }
    }
  }

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};

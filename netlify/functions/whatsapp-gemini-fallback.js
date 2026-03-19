/**
 * Fonction planifiée : toutes les minutes, envoie les réponses Gemini pour les
 * conversations en attente depuis au moins 20 secondes (relais après délai sans réponse humaine).
 *
 * Nécessite : WHATSAPP_360DIALOG_API_KEY, GEMINI_API_KEY, @netlify/blobs.
 * Variable optionnelle : ROBIN_GEMINI_DELAY_SECONDS (défaut 20).
 *
 * Planification : * * * * * (toutes les minutes) dans netlify.toml.
 */

const D360_BASE = 'https://waba-v2.360dialog.io';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const DEFAULT_DELAY_MS = (parseInt(process.env.ROBIN_GEMINI_DELAY_SECONDS || '20', 10) || 20) * 1000;
const STORE_NAME = 'robin-wa';
const PENDING_PREFIX = 'pending/';
const CONVO_PREFIX = 'convo/';

let netlifyBlobsModule = null;
try {
  netlifyBlobsModule = require('@netlify/blobs');
} catch (_) {}

function normalizeTo(waId) {
  const s = String(waId || '').replace(/\D/g, '');
  if (s.startsWith('0')) return '33' + s.slice(1);
  if (s.length <= 9 && !s.startsWith('33')) return '33' + s;
  return s;
}

async function sendWhatsAppText(to, text, apiKey) {
  if (!apiKey || !text) return false;
  const toClean = String(to).replace(/\D/g, '');
  if (!toClean || toClean.length < 8) return false;
  const res = await fetch(`${D360_BASE}/messages`, {
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
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('whatsapp-gemini-fallback: send error', res.status, data);
    return false;
  }
  return true;
}

async function geminiChat(messages, systemInstruction, apiKey) {
  if (!apiKey) return null;
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: (m.text || '').slice(0, 4096) }]
  }));
  const res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      contents: contents.length ? contents : [{ role: 'user', parts: [{ text: 'Bonjour' }] }],
      generationConfig: { maxOutputTokens: 512 }
    })
  });
  const json = await res.json().catch(() => ({}));
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
}

exports.handler = async (event) => {
  const d360Key = process.env.WHATSAPP_360DIALOG_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!d360Key || !geminiKey) {
    console.log('whatsapp-gemini-fallback: missing API keys, skip');
    return { statusCode: 200, body: JSON.stringify({ ok: true, processed: 0 }) };
  }

  let getStore;
  try {
    if (!netlifyBlobsModule) throw new Error("Cannot find module '@netlify/blobs'");
    const blobs = netlifyBlobsModule;
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    getStore = blobs.getStore;
  } catch (e) {
    console.log('whatsapp-gemini-fallback: @netlify/blobs not available', e.message);
    return { statusCode: 200, body: JSON.stringify({ ok: true, processed: 0 }) };
  }

  const store = getStore(STORE_NAME);
  let list;
  try {
    const out = await store.list({ prefix: PENDING_PREFIX });
    list = out.blobs || [];
  } catch (e) {
    console.error('whatsapp-gemini-fallback: list error', e.message);
    return { statusCode: 200, body: JSON.stringify({ ok: true, processed: 0 }) };
  }

  const now = Date.now();
  let processed = 0;

  for (const { key } of list) {
    const phone = key.slice(PENDING_PREFIX.length);
    if (!phone) continue;

    let data;
    try {
      const raw = await store.get(key);
      data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      await store.delete(key);
      continue;
    }

    const at = data && (data.at || data.scheduledAt);
    if (!at || (now - at) < DEFAULT_DELAY_MS) continue;

    const to = normalizeTo(phone);
    const convoKey = CONVO_PREFIX + phone;
    let convo = [];
    try {
      const rawConvo = await store.get(convoKey);
      convo = (typeof rawConvo === 'string' ? JSON.parse(rawConvo) : rawConvo) || [];
    } catch (_) {}

    const sys = `Tu es Robin 🏹 (Robin des Airs), conseiller en indemnités aériennes (règlement CE 261). Réponds en français, de façon courte et adaptée à WhatsApp. Propose d'envoyer une photo de la carte d'embarquement pour analyser les droits. Tarifs : 25% si succès, 0€ si échec. Lien dépôt : https://robindesairs.eu/depot-en-ligne.html`;
    const chatMessages = convo.slice(-20).map(m => ({ role: m.role, text: m.text }));
    const reply = await geminiChat(chatMessages, sys, geminiKey);

    if (reply) {
      const sent = await sendWhatsAppText(to, reply, d360Key);
      if (sent) {
        convo.push({ role: 'assistant', text: reply });
        const keep = convo.slice(-30);
        await store.set(convoKey, JSON.stringify(keep));
        processed++;
      }
    }

    await store.delete(key);
  }

  console.log('whatsapp-gemini-fallback: processed', processed);
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, processed }) };
};

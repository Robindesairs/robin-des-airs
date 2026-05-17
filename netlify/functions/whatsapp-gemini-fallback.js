/**
 * Cron : réponses Gemini pour conversations en attente (≥ ROBIN_GEMINI_DELAY_SECONDS).
 */

const DEFAULT_DELAY_MS = (parseInt(process.env.ROBIN_GEMINI_DELAY_SECONDS || '20', 10) || 20) * 1000;
const STORE_NAME = 'robin-wa';
const PENDING_PREFIX = 'pending/';
const { appendWaMessage, listWaMessages } = require('./lib/wa-convo-store');
const { sendWhatsAppTextMessage } = require('./lib/whatsapp-send-core');

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

async function geminiChat(messages, systemInstruction, apiKey) {
  if (!apiKey) return null;
  const GEMINI_BASE =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  const contents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: (m.text || '').slice(0, 4096) }],
  }));
  const res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      contents: contents.length ? contents : [{ role: 'user', parts: [{ text: 'Bonjour' }] }],
      generationConfig: { maxOutputTokens: 512 },
    }),
  });
  const json = await res.json().catch(() => ({}));
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

exports.handler = async (event) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.log('whatsapp-gemini-fallback: GEMINI_API_KEY missing, skip');
    return { statusCode: 200, body: JSON.stringify({ ok: true, processed: 0, reason: 'no_gemini' }) };
  }

  let getStore;
  try {
    if (!netlifyBlobsModule) throw new Error("Cannot find module '@netlify/blobs'");
    const blobs = netlifyBlobsModule;
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    getStore = blobs.getStore;
  } catch (e) {
    console.log('whatsapp-gemini-fallback: blobs unavailable', e.message);
    return { statusCode: 200, body: JSON.stringify({ ok: true, processed: 0, reason: 'no_blobs' }) };
  }

  const store = getStore(STORE_NAME);
  let list;
  try {
    const out = await store.list({ prefix: PENDING_PREFIX });
    list = out.blobs || [];
  } catch (e) {
    console.error('whatsapp-gemini-fallback: list error', e.message);
    return { statusCode: 200, body: JSON.stringify({ ok: true, processed: 0, error: e.message }) };
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
    } catch {
      await store.delete(key);
      continue;
    }

    const at = data && (data.at || data.scheduledAt);
    if (!at || now - at < DEFAULT_DELAY_MS) continue;

    const to = normalizeTo(phone);
    const convoData = await listWaMessages(event, phone);
    const convo = convoData.messages || [];

    const sys = `Tu es Robin 🏹 (Robin des Airs), conseiller en indemnités aériennes (règlement CE 261). Réponds en français, de façon courte et adaptée à WhatsApp. Propose d'envoyer une photo de la carte d'embarquement pour analyser les droits. Tarifs : 25% si succès, 0€ si échec. Lien dépôt : https://robindesairs.eu/depot-express.html`;
    const chatMessages = convo.slice(-20).map((m) => ({ role: m.role, text: m.text }));
    const reply = await geminiChat(chatMessages, sys, geminiKey);

    if (reply) {
      const sent = await sendWhatsAppTextMessage(to, reply);
      if (sent.ok) {
        try {
          await appendWaMessage(event, phone, { role: 'assistant', text: reply, source: 'bot-gemini' });
        } catch (logErr) {
          console.log('whatsapp-gemini-fallback: convo log failed', logErr.message);
        }
        processed += 1;
      } else {
        console.error('whatsapp-gemini-fallback: send failed', sent.error);
      }
    }

    await store.delete(key);
  }

  console.log('whatsapp-gemini-fallback: processed', processed);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, processed }),
  };
};

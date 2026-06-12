/**
 * Alerte propriétaire déclenchée par le BOT Railway (ex. « LEAD INTROUVABLE »,
 * « pièce d'identité à vérifier », « reçu de frais »…).
 *   POST { message, context, secret }  → notifyOwner (Telegram + email Resend).
 *
 * Pont : le bot (Railway) n'a pas les canaux d'alerte ; il les réutilise ici via
 * lib/owner-notify (déjà configuré en prod). Secret = WATI_WEBHOOK_SECRET.
 */
const { notifyOwner } = require('./lib/owner-notify');
const { safeEqualString } = require('./lib/safe-compare');

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://robindesairs.eu', 'Access-Control-Allow-Headers': 'Content-Type' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }

  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (expected && !safeEqualString(String(b.secret || '').trim(), expected)) {
    return { statusCode: 401, headers: H, body: JSON.stringify({ error: 'unauthorized' }) };
  }

  const message = String(b.message || '').trim().slice(0, 1500);
  const context = String(b.context || '').trim().slice(0, 60);
  if (!message) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'message requis' }) };

  try {
    await notifyOwner('🤖 Robin — alerte bot', message + (context ? `\n— contexte : ${context}` : ''));
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};

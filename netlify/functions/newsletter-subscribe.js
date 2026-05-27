/**
 * Inscription newsletter — POST /api/newsletter-subscribe
 * Body: { email, consent: true, source?, website? } — website = honeypot
 */

const { getBlobStore } = require('./lib/netlify-blobs-store');
const { publicCorsHeaders } = require('./lib/auth-config');
const { checkRateLimit } = require('./lib/rate-limit');

const STORE = 'robin-newsletter';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status, body) {
  return {
    statusCode: status,
    headers: publicCorsHeaders({ 'Cache-Control': 'no-store' }),
    body: JSON.stringify(body),
  };
}

function normalizeEmail(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase();
}

async function notifyTeam(email, source) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  const from = (process.env.RESEND_FROM || 'Robin des Airs <noreply@robindesairs.eu>').trim();
  const to = (process.env.NEWSLETTER_NOTIFY_EMAIL || 'expert@robindesairs.eu').trim();
  if (!key || !to) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Newsletter — nouvelle inscription',
        text: `Email : ${email}\nSource : ${source || 'footer'}\nDate : ${new Date().toISOString()}`,
      }),
    });
  } catch (e) {
    console.warn('newsletter notify:', e.message);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: publicCorsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'POST only' });
  }

  const rl = await checkRateLimit(event, { key: 'newsletter-subscribe', max: 5, windowSec: 60 });
  if (!rl.ok) return rl.response;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'JSON invalide' });
  }

  if (body.website) {
    return json(200, { ok: true });
  }

  const email = normalizeEmail(body.email);
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { ok: false, error: 'Adresse e-mail invalide' });
  }
  if (body.consent !== true && body.consent !== 'true') {
    return json(400, { ok: false, error: 'Consentement requis' });
  }

  const store = getBlobStore(event, STORE);
  if (!store) {
    return json(503, { ok: false, error: 'Service temporairement indisponible' });
  }

  const key = `subscribers/${email.replace(/[^a-z0-9@._+-]/g, '_')}.json`;
  const existing = await store.get(key, { type: 'json' }).catch(() => null);
  if (existing && existing.email) {
    return json(200, { ok: true, already: true });
  }

  const record = {
    email,
    subscribedAt: new Date().toISOString(),
    source: String(body.source || 'footer').slice(0, 80),
    consent: true,
    ipHash: undefined,
  };

  try {
    const { clientIp } = require('./lib/rate-limit');
    const ip = clientIp(event);
    let h = 0;
    for (let i = 0; i < ip.length; i++) h = (Math.imul(31, h) + ip.charCodeAt(i)) | 0;
    record.ipHash = Math.abs(h).toString(16);
  } catch (_) {}

  await store.setJSON(key, record);
  await notifyTeam(email, record.source);

  return json(201, { ok: true });
};

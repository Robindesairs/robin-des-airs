/**
 * /api/depot-arrival-ping — notifie le fondateur par WhatsApp dès qu'un visiteur arrive sur
 * depot-express.html (avant toute saisie). Best-effort : ne bloque jamais l'affichage de la page.
 *
 * POST { city?, lang? }
 * → 200 { ok:true } (même en cas d'échec d'envoi — un souci de notification ne doit jamais
 *   remonter d'erreur visible au visiteur).
 */
const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://robindesairs.eu',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const NOTIFY_TO = 'whatsapp:+33677470122';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { b = {}; }
  const city = String(b.city || '').trim().slice(0, 60);
  const lang = (b.lang === 'en') ? 'EN' : 'FR';

  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (sid && token && from) {
      const text = city
        ? `👀 Un visiteur vient d'arriver sur depot-express.html (${city}, ${lang}).`
        : `👀 Un visiteur vient d'arriver sur depot-express.html (${lang}).`;
      const params = new URLSearchParams({ To: NOTIFY_TO, From: from, Body: text });
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    }
  } catch (e) {
    console.warn('depot-arrival-ping: envoi notification échoué (non bloquant):', e.message);
  }

  return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
};

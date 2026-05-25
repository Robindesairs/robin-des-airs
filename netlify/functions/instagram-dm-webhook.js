// Webhook Meta — répond automatiquement aux DMs Instagram.
// GET  : vérification du webhook Meta (hub.challenge)
// POST : réception d'un DM → réponse automatique avec lien WhatsApp Robin des Airs
//
// Variables Netlify requises :
//   META_VERIFY_TOKEN       — token libre choisi lors de la config webhook dans Meta Developer
//   META_PAGE_ACCESS_TOKEN  — token de la Page Facebook liée au compte Instagram Business
//   INSTAGRAM_WHATSAPP_LINK — ex. https://wa.me/33756863630

const https = require('https');

const WHATSAPP_LINK = process.env.INSTAGRAM_WHATSAPP_LINK || 'https://wa.me/33756863630';

const AUTO_REPLY = `Bonjour ! 👋

Merci de nous contacter. Pour vérifier si tu es éligible à une indemnisation pour ton vol (jusqu'à 600€), c'est simple et rapide :

✈️ Envoie ta carte d'embarquement directement sur notre WhatsApp :
${WHATSAPP_LINK}

Notre assistant analyse ton vol en quelques secondes et te donne une réponse immédiate.

À tout de suite ! 🏹 — L'équipe Robin des Airs`;

// ─── helpers ─────────────────────────────────────────────────────────────────

function sendReply(recipientId, message, pageAccessToken) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    });
    const options = {
      hostname: 'graph.facebook.com',
      path: '/v21.0/me/messages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── handler ─────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const verifyToken = process.env.META_VERIFY_TOKEN;
  const pageToken = process.env.META_PAGE_ACCESS_TOKEN;

  // ── Vérification webhook Meta (GET) ──────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    if (
      params['hub.mode'] === 'subscribe' &&
      params['hub.verify_token'] === verifyToken
    ) {
      console.log('[instagram-dm] Webhook vérifié par Meta ✅');
      return { statusCode: 200, body: params['hub.challenge'] };
    }
    console.warn('[instagram-dm] Vérification échouée — token incorrect');
    return { statusCode: 403, body: 'Forbidden' };
  }

  // ── Réception événements Meta (POST) ─────────────────────────────────────
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!pageToken) {
    console.error('[instagram-dm] META_PAGE_ACCESS_TOKEN non configuré');
    return { statusCode: 500, body: 'Configuration manquante' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'JSON invalide' };
  }

  // Seuls les événements instagram nous intéressent
  if (body.object !== 'instagram') {
    return { statusCode: 200, body: 'OK' };
  }

  for (const entry of body.entry || []) {
    for (const messaging of entry.messaging || []) {
      const senderId = messaging.sender?.id;
      const pageId = messaging.recipient?.id;

      // Ignorer les messages envoyés par la page elle-même
      if (!senderId || senderId === pageId) continue;

      // Ignorer les livraisons/lectures, ne traiter que les messages entrants
      if (!messaging.message) continue;

      // Ne pas répondre à nos propres réponses automatiques (écho)
      if (messaging.message.is_echo) continue;

      const text = messaging.message.text || '(message non textuel)';
      console.log(`[instagram-dm] Nouveau DM de ${senderId}: "${text.substring(0, 60)}"`);

      try {
        const result = await sendReply(senderId, AUTO_REPLY, pageToken);
        if (result.status === 200) {
          console.log(`[instagram-dm] ✅ Réponse automatique envoyée à ${senderId}`);
        } else {
          console.error(`[instagram-dm] ❌ Erreur Meta API ${result.status}:`, result.body);
        }
      } catch (err) {
        console.error(`[instagram-dm] ❌ Exception sendReply:`, err.message);
      }
    }
  }

  // Meta exige un 200 rapide sinon il retentera le webhook
  return { statusCode: 200, body: 'OK' };
};

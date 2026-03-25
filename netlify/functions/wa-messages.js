/**
 * wa-messages — Robin des Airs
 * GET /api/wa-messages?phone=33612345678
 * Retourne l'historique de conversation WhatsApp stocké dans Netlify Blobs.
 * Protégé par CRM_ACCESS_CODE (même code que le CRM).
 */

let netlifyBlobsModule = null;
try { netlifyBlobsModule = require('@netlify/blobs'); } catch (e) {}

function normalizePhone(phone) {
  if (!phone) return '';
  const d = String(phone).replace(/\D/g, '');
  if (d.startsWith('0')) return '33' + d.slice(1);
  return d;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Vérification du code d'accès CRM
  const crmCode = process.env.CRM_ACCESS_CODE;
  const providedCode = event.queryStringParameters?.code || event.headers?.['x-crm-code'];
  if (crmCode && providedCode !== crmCode) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorisé' }) };
  }

  const rawPhone = event.queryStringParameters?.phone || '';
  if (!rawPhone) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètre phone manquant' }) };
  }

  const phone = normalizePhone(rawPhone);

  if (!netlifyBlobsModule) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Blobs non disponibles', messages: [] }) };
  }

  try {
    const blobs = netlifyBlobsModule;
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    const store = blobs.getStore('robin-wa');
    const convoKey = 'convo/' + phone;
    const raw = await store.get(convoKey);
    const messages = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        phone,
        count: messages.length,
        messages: messages.map((m, i) => ({
          index: i,
          role: m.role || 'user',
          text: m.text || '',
          timestamp: m.timestamp || null,
        })),
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message, messages: [] }),
    };
  }
};

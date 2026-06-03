/**
 * wa-recent — Robin des Airs
 * GET /api/wa-recent?limit=8
 * Liste les conversations WhatsApp récentes (Netlify Blobs) — auth CRM.
 * Aucune donnée inventée : si Blobs indisponible ou vide → liste vide.
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { listRecentConvos } = require('./lib/wa-convo-store');
const { corsHeaders } = require('./lib/auth-config');

const HEADERS = {
  ...corsHeaders(),
  'Cache-Control': 'no-store',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: auth.error || 'Non autorisé' }) };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'GET uniquement' }) };
  }

  const limit = parseInt(event.queryStringParameters?.limit || '8', 10) || 8;

  try {
    const info = await listRecentConvos(event, limit);
    if (!info.blobsAvailable) {
      return {
        statusCode: 503,
        headers: HEADERS,
        body: JSON.stringify({ ok: false, error: info.error || 'Blobs indisponibles', conversations: [] }),
      };
    }
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        updatedAt: new Date().toISOString(),
        total: info.total || 0,
        conversations: info.conversations || [],
      }),
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: e.message, conversations: [] }),
    };
  }
};

/**
 * wa-recent — Robin des Airs
 * GET /api/wa-recent?limit=8
 * Conversations WhatsApp récentes pour le panneau « WhatsApp » du Bureau. Auth CRM.
 *
 * Source PRIMAIRE : le bot Railway (qui reçoit réellement les messages WATI) via
 *   /api/recent-conversations — le secret du bot reste côté serveur, jamais exposé.
 * Repli : le store Netlify Blobs (robin-wa) si le bot est injoignable (anciens webhooks Netlify).
 * Aucune donnée inventée : si rien n'est disponible → liste vide.
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { listRecentConvos } = require('./lib/wa-convo-store');
const { corsHeaders } = require('./lib/auth-config');

const HEADERS = { ...corsHeaders(), 'Cache-Control': 'no-store' };

async function fromRailway(limit) {
  const base = (process.env.RAILWAY_BOT_URL || 'https://robin-bot-v8-production.up.railway.app').replace(/\/$/, '');
  const secret = (process.env.WATI_WEBHOOK_SECRET || process.env.MANDAT_SIGNED_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
  if (!secret) return null;
  const url = `${base}/api/recent-conversations?limit=${encodeURIComponent(limit)}&s=${encodeURIComponent(secret)}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(url, { headers: { 'x-secret': secret, Accept: 'application/json' }, signal: ctrl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    const data = await r.json();
    if (data && data.ok && Array.isArray(data.conversations)) return data;
    return null;
  } catch (_) { clearTimeout(to); return null; }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: auth.error || 'Non autorisé', conversations: [] }) };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'GET uniquement', conversations: [] }) };
  }

  const limit = parseInt(event.queryStringParameters?.limit || '8', 10) || 8;

  // 1) Source primaire : le bot Railway (messages réels).
  const railway = await fromRailway(limit);
  if (railway) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ...railway, source: 'bot' }) };
  }

  // 2) Repli : store Netlify Blobs (anciens webhooks Netlify, si présents).
  try {
    const info = await listRecentConvos(event, limit);
    if (!info.blobsAvailable) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: info.error || 'bot injoignable et Blobs indisponibles', conversations: [] }) };
    }
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: true, source: 'blobs', updatedAt: new Date().toISOString(), total: info.total || 0, conversations: info.conversations || [] }),
    };
  } catch (e) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message, conversations: [] }) };
  }
};

/**
 * wa-thread — Robin des Airs
 * GET /api/wa-thread?phone=336XXXXXXXX
 * Fil complet d'une conversation WhatsApp pour la messagerie interne. Auth CRM.
 *
 * Source PRIMAIRE : le bot Railway (/api/conversation) — messages réels en mémoire.
 * Repli : le store Netlify Blobs (robin-wa) via listWaMessages.
 * Aucune donnée inventée : si rien → messages: [].
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { listWaMessages, normalizeWaPhone } = require('./lib/wa-convo-store');
const { corsHeaders } = require('./lib/auth-config');

const HEADERS = { ...corsHeaders(), 'Cache-Control': 'no-store' };

async function fromRailway(phone) {
  const base = (process.env.RAILWAY_BOT_URL || 'https://robin-bot-v8-production.up.railway.app').replace(/\/$/, '');
  const secret = (process.env.WATI_WEBHOOK_SECRET || process.env.MANDAT_SIGNED_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();
  if (!secret) return null;
  const url = `${base}/api/conversation?phone=${encodeURIComponent(phone)}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(url, { headers: { 'x-secret': secret, Accept: 'application/json' }, signal: ctrl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    const data = await r.json();
    if (data && data.ok && Array.isArray(data.messages)) return data;
    return null;
  } catch (_) { clearTimeout(to); return null; }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: auth.error || 'Non autorisé', messages: [] }) };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'GET uniquement', messages: [] }) };
  }

  const phone = normalizeWaPhone(event.queryStringParameters?.phone || '');
  if (!phone) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'phone requis', messages: [] }) };
  }

  // 1) Source primaire : le bot Railway (messages réels).
  const railway = await fromRailway(phone);
  if (railway) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ...railway, source: 'bot' }) };
  }

  // 2) Repli : Netlify Blobs.
  try {
    const info = await listWaMessages(event, phone);
    const messages = (info.messages || []).map((m) => ({ role: m.role, text: m.text, at: m.timestamp || m.at || null }));
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        source: 'blobs',
        phone,
        messages,
        count: messages.length,
        within24h: !!info.within24h,
        lastUserAt: info.lastUserAt || null,
      }),
    };
  } catch (e) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message, messages: [] }) };
  }
};

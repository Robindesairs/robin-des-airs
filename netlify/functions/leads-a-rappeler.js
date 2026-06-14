/**
 * leads-a-rappeler — Robin des Airs
 * GET /api/leads-a-rappeler
 * Proxy CRM → bot Railway : dossiers « à rappeler » (fenêtre WhatsApp 24h fermée
 * ou rappel demandé par le passager). Auth CRM (cookie rda_crm / header X-CRM-Code).
 * Le secret du bot reste côté serveur — jamais exposé au client.
 * Aucune donnée inventée : si le bot est injoignable → liste vide.
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');

const HEADERS = { ...corsHeaders(), 'Cache-Control': 'no-store' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: auth.error || 'Non autorisé', leads: [] }) };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'GET uniquement', leads: [] }) };
  }

  const base = (process.env.RAILWAY_BOT_URL || 'https://robin-bot-v8-production.up.railway.app').replace(/\/$/, '');
  // Le bot valide /api/leads-a-rappeler contre WATI_WEBHOOK_SECRET (|| CRM_ACCESS_CODE).
  // On envoie donc CE secret-là en priorité ; MANDAT_SIGNED_WEBHOOK_SECRET = repli legacy.
  const secret = (process.env.WATI_WEBHOOK_SECRET || process.env.MANDAT_SIGNED_WEBHOOK_SECRET || process.env.CRM_ACCESS_CODE || '').trim();

  try {
    const url = base + '/api/leads-a-rappeler?s=' + encodeURIComponent(secret);
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(url, { headers: { 'x-secret': secret, Accept: 'application/json' }, signal: ctrl.signal });
    clearTimeout(to);
    if (!r.ok) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'bot ' + r.status, leads: [] }) };
    }
    const data = await r.json();
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message, leads: [] }) };
  }
};

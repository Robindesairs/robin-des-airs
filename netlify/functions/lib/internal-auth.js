/**
 * Auth appels internes : cron Netlify, Make, scripts ops.
 * Secrets acceptés (au moins un sur Netlify) : RADAR_MONITOR_SECRET, AIRTABLE_WEBHOOK_SECRET,
 * CRM_AUTH_SECRET, WHATSAPP_WEBHOOK_SECRET — même valeur dans ?secret= ou body.secret.
 */

const { isProduction, SITE_ORIGIN, corsHeaders } = require('./auth-config');
const { safeEqualString } = require('./safe-compare');

const SECRET_ENV_KEYS = [
  'RADAR_MONITOR_SECRET',
  'AIRTABLE_WEBHOOK_SECRET',
  'CRM_AUTH_SECRET',
  'WHATSAPP_WEBHOOK_SECRET',
];

function isNetlifyScheduled(event) {
  const h = event.headers || {};
  return h['x-netlify-event'] === 'schedule' || h['X-Netlify-Event'] === 'schedule';
}

function configuredInternalSecrets() {
  const out = [];
  for (const k of SECRET_ENV_KEYS) {
    const v = (process.env[k] || '').trim();
    if (v) out.push(v);
  }
  return out;
}

function extractProvidedSecret(event, body) {
  const q = event.queryStringParameters || {};
  const h = event.headers || {};
  return String(
    (body && (body.secret || body.webhookSecret)) ||
      h['x-rda-secret'] ||
      h['X-Rda-Secret'] ||
      h['x-webhook-secret'] ||
      h['X-Webhook-Secret'] ||
      q.secret ||
      ''
  ).trim();
}

/** @returns {{ ok: boolean, error?: string, devBypass?: boolean }} */
function verifyInternalSecret(event, body) {
  const expectedList = configuredInternalSecrets();
  if (!expectedList.length) {
    if (isProduction()) {
      return { ok: false, error: 'Aucun secret interne configuré (voir docs/NETLIFY-PROD.md)' };
    }
    return { ok: true, devBypass: true };
  }
  const provided = extractProvidedSecret(event, body);
  if (!provided) return { ok: false, error: 'Secret manquant (header, query ou body)' };
  for (const exp of expectedList) {
    if (safeEqualString(provided, exp)) return { ok: true };
  }
  return { ok: false, error: 'Secret invalide' };
}

function requireCronOrInternalSecret(event, body) {
  if (isNetlifyScheduled(event)) return { ok: true, source: 'cron' };
  return verifyInternalSecret(event, body);
}

/** Make / send-whatsapp — WHATSAPP_WEBHOOK_SECRET obligatoire en prod. */
function requireWhatsAppWebhookSecret(event, body) {
  const expected = (process.env.WHATSAPP_WEBHOOK_SECRET || '').trim();
  if (!expected) {
    if (isProduction()) {
      return { ok: false, error: 'WHATSAPP_WEBHOOK_SECRET requis en production' };
    }
    return { ok: true };
  }
  const provided = extractProvidedSecret(event, body);
  if (!safeEqualString(provided, expected)) {
    return { ok: false, error: 'Secret invalide' };
  }
  return { ok: true };
}

function publicCorsHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': SITE_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, X-CRM-Code',
    ...extra,
  };
}

function denyResponse(status, error, mode = 'api') {
  const headers =
    mode === 'public' ? publicCorsHeaders({ 'Cache-Control': 'no-store' }) : corsHeaders();
  return {
    statusCode: status,
    headers,
    body: JSON.stringify({ ok: false, error }),
  };
}

module.exports = {
  isNetlifyScheduled,
  verifyInternalSecret,
  requireCronOrInternalSecret,
  requireWhatsAppWebhookSecret,
  publicCorsHeaders,
  denyResponse,
  configuredInternalSecrets,
};

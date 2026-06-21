/**
 * Auth CRM : cookie rda_crm (crm-auth) ou header X-CRM-Code (pas de ?code= en query).
 */

const crypto = require('crypto');
const { getCrmAuthConfig } = require('./auth-config');
const { safeEqualString } = require('./safe-compare');

const COOKIE_NAME = 'rda_crm';

function hmacSecret() {
  const cfg = getCrmAuthConfig();
  return cfg ? cfg.authSecret : '';
}

function signPayload(payloadB64) {
  return crypto.createHmac('sha256', hmacSecret()).update(payloadB64).digest('base64url');
}

function verifyToken(raw) {
  if (!raw || !hmacSecret()) return false;
  const last = raw.lastIndexOf('.');
  if (last <= 0) return false;
  const payloadB64 = raw.slice(0, last);
  const sig = raw.slice(last + 1);
  if (signPayload(payloadB64) !== sig) return false;
  try {
    const data = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookie(header, name) {
  if (!header) return '';
  const re = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`);
  const m = String(header).match(re);
  return m ? decodeURIComponent(m[1].trim()) : '';
}

function verifyCrmSessionCookie(event) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  return verifyToken(token);
}

/** @returns {{ ok: boolean, error?: string, configured?: boolean }} */
function checkCrmAccess(event) {
  const cfg = getCrmAuthConfig();
  if (!cfg) {
    return {
      ok: false,
      error: 'CRM non configuré : définissez CRM_ACCESS_CODE et CRM_AUTH_SECRET sur Netlify',
      configured: false,
    };
  }

  const provided =
    event.headers?.['x-crm-code'] ||
    event.headers?.['X-CRM-Code'];

  if (provided && safeEqualString(provided, cfg.accessCode)) return { ok: true, configured: true };
  if (verifyCrmSessionCookie(event)) return { ok: true, configured: true };

  return { ok: false, error: 'Non autorisé', configured: true };
}

module.exports = {
  checkCrmAccess,
  verifyCrmSessionCookie,
  COOKIE_NAME,
};

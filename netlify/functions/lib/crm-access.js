/**
 * Auth CRM partagée : ?code= / X-CRM-Code ou cookie de session rda_crm (crm-auth).
 */

const crypto = require('crypto');

const COOKIE_NAME = 'rda_crm';
const DEFAULT_CRM_CODE = 'robin-dakar';

function hmacSecret() {
  return (
    process.env.CRM_AUTH_SECRET ||
    process.env.CRM_ACCESS_CODE ||
    DEFAULT_CRM_CODE
  ).trim();
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

/** @returns {{ ok: boolean, error?: string }} */
function checkCrmAccess(event) {
  const crmCode = (process.env.CRM_ACCESS_CODE || '').trim();
  if (!crmCode) return { ok: true };

  const provided =
    event.queryStringParameters?.code ||
    event.headers?.['x-crm-code'] ||
    event.headers?.['X-CRM-Code'];

  if (provided === crmCode) return { ok: true };
  if (verifyCrmSessionCookie(event)) return { ok: true };

  return { ok: false, error: 'Non autorisé' };
}

module.exports = {
  checkCrmAccess,
  verifyCrmSessionCookie,
};

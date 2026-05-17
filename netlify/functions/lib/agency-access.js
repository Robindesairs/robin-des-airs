/**
 * Session cookie agence partenaire (rda_agency).
 */

const crypto = require('crypto');
const { getAgencyByCode } = require('./agency-accounts');
const { getAgencyAuthSecret } = require('./auth-config');

const COOKIE_NAME = 'rda_agency';
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function hmacSecret() {
  return getAgencyAuthSecret();
}

function signPayload(payloadB64) {
  return crypto.createHmac('sha256', hmacSecret()).update(payloadB64).digest('base64url');
}

function makeAgencyToken(agencyCode) {
  const secret = hmacSecret();
  if (!secret) throw new Error('AGENCY_AUTH_SECRET non configuré');
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + MAX_AGE_SEC * 1000,
      agency: String(agencyCode || '').toUpperCase(),
    }),
    'utf8'
  ).toString('base64url');
  return `${payload}.${signPayload(payload)}`;
}

function verifyAgencyToken(raw) {
  if (!raw || !hmacSecret()) return null;
  const last = raw.lastIndexOf('.');
  if (last <= 0) return null;
  const payloadB64 = raw.slice(0, last);
  const sig = raw.slice(last + 1);
  if (signPayload(payloadB64) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (typeof data.exp !== 'number' || data.exp <= Date.now()) return null;
    if (!data.agency) return null;
    return getAgencyByCode(data.agency);
  } catch {
    return null;
  }
}

function parseCookie(header, name) {
  if (!header) return '';
  const re = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`);
  const m = String(header).match(re);
  return m ? decodeURIComponent(m[1].trim()) : '';
}

function getAgencySession(event) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  return verifyAgencyToken(token);
}

function agencyCookieHeader(token, event) {
  const proto = String(event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'] || '')
    .split(',')[0]
    .trim();
  const secure = proto === 'https' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_SEC}${secure}`;
}

module.exports = {
  COOKIE_NAME,
  makeAgencyToken,
  getAgencySession,
  agencyCookieHeader,
};

/**
 * Liens mandat signés (HMAC) — limite la forge d’URL avec données tierces.
 */

const crypto = require('crypto');
const { getMandatLinkSecret } = require('./auth-config');

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function mandatSecret() {
  return getMandatLinkSecret();
}

function canonicalMandatPayload(params, exp) {
  const keys = ['ref', 'phone', 'name', 'email', 'vol', 'pnr', 'route', 'date'];
  const parts = keys.map((k) => `${k}=${String(params.get(k) || '')}`);
  parts.push(`exp=${exp}`);
  return parts.join('|');
}

function signMandatQuery(params, expMs) {
  const secret = mandatSecret();
  if (!secret) return null;
  const exp = String(expMs || Date.now() + DEFAULT_TTL_MS);
  const sig = crypto
    .createHmac('sha256', secret)
    .update(canonicalMandatPayload(params, exp))
    .digest('base64url');
  return { exp, sig };
}

function verifyMandatQuery(searchParams) {
  const secret = mandatSecret();
  if (!secret) return { ok: true, reason: 'unsigned_mode' };
  const sig = (searchParams.get('sig') || '').trim();
  const exp = (searchParams.get('exp') || '').trim();
  if (!sig || !exp) return { ok: true, reason: 'legacy_unsigned' };
  const expMs = parseInt(exp, 10);
  if (!expMs || expMs < Date.now()) return { ok: false, reason: 'expired' };
  const expected = crypto
    .createHmac('sha256', secret)
    .update(canonicalMandatPayload(searchParams, exp))
    .digest('base64url');
  if (sig !== expected) return { ok: false, reason: 'invalid_signature' };
  return { ok: true, reason: 'signed_ok' };
}

module.exports = {
  DEFAULT_TTL_MS,
  signMandatQuery,
  verifyMandatQuery,
};

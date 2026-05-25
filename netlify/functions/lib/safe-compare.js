/**
 * Comparaisons timing-safe pour cookies, secrets et mots de passe en clair (legacy).
 * Empêche les timing attacks sur les égalités === .
 */

const crypto = require('crypto');

function safeEqualString(a, b) {
  const sa = String(a == null ? '' : a);
  const sb = String(b == null ? '' : b);
  const ba = Buffer.from(sa, 'utf8');
  const bb = Buffer.from(sb, 'utf8');
  if (ba.length !== bb.length) {
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

module.exports = { safeEqualString };

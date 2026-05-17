/**
 * Hachage mots de passe agences (scrypt) — compatible pass en clair legacy.
 */

const crypto = require('crypto');

const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(plain), salt, 32, SCRYPT_OPTS);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(plain, stored) {
  const p = String(plain || '');
  const s = String(stored || '');
  if (!p || !s) return false;
  if (!s.startsWith('scrypt:')) return p === s;
  const parts = s.split(':');
  if (parts.length !== 3) return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const actual = crypto.scryptSync(p, salt, 32, SCRYPT_OPTS);
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };

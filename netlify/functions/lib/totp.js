/**
 * TOTP (RFC 6238 / RFC 4226) — sans dépendance externe, via crypto natif.
 * Utilisé pour la 2ᵉ facteur d'accès CRM (bureau.html), en plus du CRM_ACCESS_CODE.
 */

const crypto = require('crypto');

const STEP_SEC = 30;
const DIGITS = 6;

function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function base32Encode(buf) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += alphabet[parseInt(bits.slice(i, i + 5), 2)];
  }
  const rem = bits.length % 5;
  if (rem) out += alphabet[parseInt(bits.slice(bits.length - rem).padEnd(5, '0'), 2)];
  return out;
}

function generateSecret(byteLen = 20) {
  return base32Encode(crypto.randomBytes(byteLen));
}

function hotp(secretB32, counter) {
  const key = base32Decode(secretB32);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

function totpNow(secretB32, atMs = Date.now()) {
  return hotp(secretB32, Math.floor(atMs / 1000 / STEP_SEC));
}

/** Vérifie un code à 6 chiffres avec ±1 pas (30 s) de tolérance (dérive horloge). */
function verifyTotp(secretB32, code, atMs = Date.now()) {
  const clean = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean) || !secretB32) return false;
  const counter = Math.floor(atMs / 1000 / STEP_SEC);
  for (let drift = -1; drift <= 1; drift++) {
    if (hotp(secretB32, counter + drift) === clean) return true;
  }
  return false;
}

function otpauthUri(secretB32, { issuer = 'Robin des Airs', account = 'CRM' } = {}) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretB32,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SEC),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

module.exports = { generateSecret, verifyTotp, totpNow, otpauthUri };

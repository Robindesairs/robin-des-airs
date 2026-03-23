/**
 * Accès CRM — mot de passe par défaut : robin-dakar (surcharge : CRM_ACCESS_CODE sur Netlify).
 * GET  /api/crm-auth  → { ok: true|false } selon cookie valide
 * POST /api/crm-auth  body { "code": "…" } → définit le cookie si correct
 * POST { "logout": true } → supprime le cookie
 */

const crypto = require('crypto');

const COOKIE_NAME = 'rda_crm';
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 jours

/** Si CRM_ACCESS_CODE n’est pas défini, ce code est utilisé (et pour signer les cookies). */
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

function makeToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + MAX_AGE_SEC * 1000 }),
    'utf8'
  ).toString('base64url');
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
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

function secureCookiePart(event) {
  const proto = String(
    event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'] || ''
  )
    .split(',')[0]
    .trim();
  return proto === 'https' ? '; Secure' : '';
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  const method = event.httpMethod || 'GET';
  const accessCode = (
    process.env.CRM_ACCESS_CODE ||
    DEFAULT_CRM_CODE
  ).trim();
  const secure = secureCookiePart(event);

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
  }

  if (method === 'GET') {
    const cookieHeader =
      event.headers.cookie || event.headers.Cookie || '';
    const token = parseCookie(cookieHeader, COOKIE_NAME);
    const ok = verifyToken(token);
    return json(200, { ok, configured: true });
  }

  if (method === 'POST') {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { ok: false, error: 'Corps JSON invalide.' });
    }

    if (body.logout === true) {
      return json(
        200,
        { ok: true },
        {
          'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
        }
      );
    }

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (code === accessCode) {
      const token = makeToken();
      return json(
        200,
        { ok: true },
        {
          'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure}`,
        }
      );
    }

    return json(401, { ok: false, error: 'Code incorrect.' });
  }

  return json(405, { ok: false, error: 'Méthode non autorisée.' });
};

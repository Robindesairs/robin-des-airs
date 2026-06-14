/**
 * Accès CRM
 * GET  /api/crm-auth  → session active ?
 * POST { "code": "…" } | { "logout": true }
 */

const crypto = require('crypto');
const { getCrmAuthConfig, corsHeaders } = require('./lib/auth-config');
const { checkRateLimit } = require('./lib/rate-limit');
const { safeEqualString } = require('./lib/safe-compare');

const COOKIE_NAME = 'rda_crm';
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function hmacSecret() {
  const cfg = getCrmAuthConfig();
  return cfg ? cfg.authSecret : '';
}

function signPayload(payloadB64) {
  return crypto.createHmac('sha256', hmacSecret()).update(payloadB64).digest('base64url');
}

function makeToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + MAX_AGE_SEC * 1000 }),
    'utf8'
  ).toString('base64url');
  return `${payload}.${signPayload(payload)}`;
}

function verifyToken(raw) {
  if (!raw || !hmacSecret()) return false;
  const last = raw.lastIndexOf('.');
  if (last <= 0) return false;
  const payloadB64 = raw.slice(0, last);
  const sig = raw.slice(last + 1);
  if (!safeEqualString(signPayload(payloadB64), sig)) return false;
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
    headers: { ...corsHeaders('crm'), ...extraHeaders },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  const method = event.httpMethod || 'GET';
  const cfg = getCrmAuthConfig();
  const secure = secureCookiePart(event);

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders('crm'), body: '' };
  }

  if (!cfg) {
    return json(503, {
      ok: false,
      configured: false,
      error: 'CRM_ACCESS_CODE et CRM_AUTH_SECRET requis sur Netlify (production)',
    });
  }

  if (method === 'GET') {
    const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
    const token = parseCookie(cookieHeader, COOKIE_NAME);
    // Session valide via cookie rda_crm OU en-tête X-CRM-Code (résilient quand le
    // navigateur bloque les cookies : iframe/preview, Safari ITP, contexte tiers).
    const hdrCode = (event.headers['x-crm-code'] || event.headers['X-CRM-Code'] || '').trim();
    const ok = verifyToken(token) || (!!hdrCode && safeEqualString(hdrCode, cfg.accessCode));
    return json(200, { ok, configured: true, insecure: !!cfg.insecure });
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

    const rl = await checkRateLimit(event, { key: 'crm-auth-login', max: 10, windowSec: 60 });
    if (!rl.ok) return rl.response;

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (safeEqualString(code, cfg.accessCode)) {
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

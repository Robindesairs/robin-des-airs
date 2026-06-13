/**
 * Pièces d'un dossier — accès CÔTÉ CRM (carte d'embarquement, passeport, e-billet…).
 *
 * Problème résolu : /api/pieces exige le secret WATI_WEBHOOK_SECRET en query, qu'on ne
 * veut PAS exposer au navigateur du CRM. Ici l'authentification se fait par l'accès CRM
 * (cookie rda_crm ou header X-CRM-Code), et les fichiers sont servis via des URLs SIGNÉES
 * à durée limitée (HMAC clé CRM) — exploitables dans un <img>/onglet sans header.
 *
 *   Liste   : GET /api/crm-pieces?r=REF            (auth CRM)  → { ref, pieces:[{key,label,source,ts,url}] }
 *   Fichier : GET /api/crm-pieces?k=KEY&t=TOKEN    (token signé) → le fichier (image/PDF, inline)
 *
 * Le token = `exp.sig`, sig = HMAC-SHA256(authSecret, `${key}|${exp}`), TTL CRM_PIECE_TTL_MIN (défaut 30).
 */

const crypto = require('crypto');
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { checkCrmAccess } = require('./lib/crm-access');
const { getCrmAuthConfig, corsHeaders } = require('./lib/auth-config');

const J = (code, obj) => ({
  statusCode: code,
  headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj),
});

function signingSecret() {
  const cfg = getCrmAuthConfig();
  return cfg ? cfg.authSecret : '';
}

function signKey(key, expMs) {
  return crypto.createHmac('sha256', signingSecret()).update(`${key}|${expMs}`).digest('base64url');
}

function makeToken(key) {
  const ttlMin = parseInt(process.env.CRM_PIECE_TTL_MIN || '30', 10) || 30;
  const exp = Date.now() + ttlMin * 60000;
  return `${exp}.${signKey(key, exp)}`;
}

function verifyToken(key, token) {
  const secret = signingSecret();
  if (!secret || !token) return false;
  const dot = String(token).indexOf('.');
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = signKey(key, exp);
  try {
    const a = Buffer.from(sig); const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_) { return false; }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };

  const q = event.queryStringParameters || {};
  const pieces = getBlobStore(event, 'pieces');
  if (!pieces) return J(500, { error: 'store indisponible' });

  try {
    // ── Mode FICHIER : authentifié par le TOKEN signé (pas de header → marche dans <img>) ──
    if (q.k) {
      const key = String(q.k).replace(/[^A-Za-z0-9._/-]/g, '').slice(0, 200);
      if (!verifyToken(key, String(q.t || ''))) return J(401, { error: 'lien expiré ou invalide' });
      const res = await pieces.getWithMetadata(key, { type: 'arrayBuffer' });
      if (!res || !res.data) return J(404, { error: 'pièce introuvable' });
      const mime = (res.metadata && res.metadata.mime) || 'application/octet-stream';
      const name = key.split('/').pop() || 'piece';
      return {
        statusCode: 200,
        headers: {
          'Content-Type': mime,
          'Content-Disposition': `inline; filename="${name}"`,
          'Cache-Control': 'private, no-store',
          ...corsHeaders(),
        },
        body: Buffer.from(res.data).toString('base64'),
        isBase64Encoded: true,
      };
    }

    // ── Mode LISTE : authentifié par l'accès CRM (cookie ou X-CRM-Code) ──
    const auth = checkCrmAccess(event);
    if (!auth.ok) return J(401, { error: auth.error || 'Non autorisé' });

    const ref = String(q.r || q.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    if (!ref) return J(400, { error: 'r (référence) requis' });

    const describe = (key, source) => {
      const name = key.split('/').pop() || key;
      const m = name.match(/^(\d{10,})_(.+?)(?:\.[a-z0-9]+)?$/i);
      return {
        key,
        source,
        label: m ? m[2] : name,
        ts: m ? new Date(Number(m[1])).toISOString() : '',
        url: `/api/crm-pieces?k=${encodeURIComponent(key)}&t=${encodeURIComponent(makeToken(key))}`,
      };
    };

    const items = [];
    const web = await pieces.list({ prefix: 'p/' + ref + '/' });
    for (const it of (web.blobs || [])) items.push(describe(it.key, 'web'));

    let phoneKey = '';
    try {
      const mandats = getBlobStore(event, 'mandats');
      const d = mandats && (await mandats.get('m/' + ref, { type: 'json' }));
      if (d && d.phone) phoneKey = String(d.phone).replace(/\D/g, '');
    } catch (_) {}
    if (phoneKey) {
      const bot = await pieces.list({ prefix: 'wa/' + phoneKey + '/' });
      for (const it of (bot.blobs || [])) items.push(describe(it.key, 'bot'));
    }

    items.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
    return J(200, { ref, count: items.length, pieces: items });
  } catch (e) {
    return J(500, { error: e.message });
  }
};

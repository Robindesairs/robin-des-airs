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
      let mime = (res.metadata && res.metadata.mime) || 'application/octet-stream';
      let buf = Buffer.from(res.data);
      let name = key.split('/').pop() || 'piece';
      const wantDownload = q.dl === '1';
      // Plafond de réponse d'une fonction Netlify ≈ 6 Mo (base64 inclus). Au-delà → réponse tronquée
      // = image cassée. On vise < ~5,2 Mo binaire. Les images sont donc redimensionnées pour l'AFFICHAGE.
      const SAFE_BYTES = 5_200_000;

      // Image : redimensionnée (toujours servable, EXIF redressé, HEIC→JPEG si le binaire sharp le supporte).
      // En téléchargement, on tente l'original s'il tient sous le plafond, sinon on retombe sur la version réduite.
      if (/^image\//.test(mime) && !(wantDownload && buf.length <= SAFE_BYTES)) {
        let sharp = null;
        try { sharp = require('sharp'); } catch (_) { sharp = null; }
        if (sharp) {
          try {
            buf = await sharp(buf, { failOn: 'none' }).rotate()
              .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 78 }).toBuffer();
            mime = 'image/jpeg';
            if (!/\.jpe?g$/i.test(name)) name = name.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
          } catch (_) { /* format non décodable (ex. HEIC sans support) → on garde l'original */ }
        }
      }

      const b64 = buf.toString('base64');
      // Garde-fou final : si ça dépasse encore le plafond (gros PDF, image non redimensionnable), message clair.
      if (b64.length > 5_900_000) {
        return J(413, { error: 'Fichier trop volumineux pour l’aperçu en ligne. Demandez au client de renvoyer une photo (pas un fichier).' });
      }
      return {
        statusCode: 200,
        headers: {
          'Content-Type': mime,
          'Content-Disposition': `${wantDownload ? 'attachment' : 'inline'}; filename="${name}"`,
          'Cache-Control': 'private, no-store',
          ...corsHeaders(),
        },
        body: b64,
        isBase64Encoded: true,
      };
    }

    // ── Mode LISTE : authentifié par l'accès CRM (cookie ou X-CRM-Code) ──
    const auth = checkCrmAccess(event);
    if (!auth.ok) return J(401, { error: auth.error || 'Non autorisé' });

    const ref = String(q.r || q.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    if (!ref) return J(400, { error: 'r (référence) requis' });

    // Dossier : résout le n° de tel (pièces WhatsApp) ET, si un seul passager, fournit son
    // nom pour étiqueter les pièces d'identité d'anciens dépôts (où le nom n'était pas stocké).
    let phoneKey = '', dossier = null;
    try {
      const mandats = getBlobStore(event, 'mandats');
      dossier = mandats && (await mandats.get('m/' + ref, { type: 'json' }));
      if (dossier && dossier.phone) phoneKey = String(dossier.phone).replace(/\D/g, '');
    } catch (_) {}
    const soloName = (() => {
      if (!dossier) return '';
      const nbPax = (dossier.passengers && dossier.passengers.length) || dossier.pax || 0;
      if (nbPax > 1) return ''; // ambigu : on n'invente pas l'attribution
      return (dossier.passengers && dossier.passengers[0] && dossier.passengers[0].name) || dossier.name || '';
    })();

    // Catégorie LISIBLE déduite du « kind » des métadonnées (source de vérité), repli sur le nom de fichier.
    const categoryOf = (kind, filename) => {
      const s = `${kind || ''} ${filename || ''}`.toLowerCase();
      if (/passe?port|cni|identit|ident|sejour|s[ée]jour/.test(s)) return 'IDENTITE';
      if (/embarq|boarding|carte/.test(s)) return 'EMBARQUEMENT';
      if (/billet|ticket|booking|reservation|réservation|voyage|ebillet/.test(s)) return 'EBILLET';
      if (/certif|retard|attest/.test(s)) return 'CERTIFICAT';
      if (/frais|re[çc]u|recu/.test(s)) return 'FRAIS';
      return 'AUTRE';
    };

    // Lit les métadonnées du blob (kind/passenger/filename/ts) — fiable, plutôt que de deviner via le nom de fichier.
    const describe = async (key, source) => {
      const fname = key.split('/').pop() || key;
      const m = fname.match(/^(\d{10,})_(.+?)(?:\.[a-z0-9]+)?$/i);
      let md = {};
      try { const meta = await pieces.getMetadata(key); md = (meta && (meta.metadata || meta)) || {}; } catch (_) {}
      const kind = String(md.kind || '').toLowerCase();
      const filename = md.filename || (m ? m[2] : fname);
      const category = categoryOf(kind, filename);
      let passenger = md.passenger || md.name || '';
      if (!passenger && category === 'IDENTITE') passenger = soloName; // mono-passager : sans ambiguïté
      return {
        key, source, kind, category,
        passenger: passenger || '',
        filename,
        ts: md.ts || (m ? new Date(Number(m[1])).toISOString() : ''),
        url: `/api/crm-pieces?k=${encodeURIComponent(key)}&t=${encodeURIComponent(makeToken(key))}`,
      };
    };

    const items = [];
    const web = await pieces.list({ prefix: 'p/' + ref + '/' });
    for (const it of (web.blobs || [])) items.push(await describe(it.key, 'web'));
    if (phoneKey) {
      const bot = await pieces.list({ prefix: 'wa/' + phoneKey + '/' });
      for (const it of (bot.blobs || [])) items.push(await describe(it.key, 'bot'));
    }

    items.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
    return J(200, { ref, count: items.length, pieces: items });
  } catch (e) {
    return J(500, { error: e.message });
  }
};

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
const { airtableCfg, airtableFindByRef } = require('./lib/airtable-robin');

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
      // Les documents GÉNÉRÉS (mise en demeure / notification de cession) vivent dans le store 'robin-claims'
      // (clé claim/…), pas dans 'pieces'. On route la lecture vers le bon store selon le préfixe de la clé.
      // Route la lecture vers le bon store selon le préfixe : claim/ → robin-claims (docs générés),
      // pdf/ ou signed/ → robin-signatures (contrat de cession signé Yousign), sinon pieces (dépôts client).
      let fileStore = pieces;
      if (key.indexOf('claim/') === 0) fileStore = getBlobStore(event, 'robin-claims') || pieces;
      else if (key.indexOf('pdf/') === 0 || key.indexOf('signed/') === 0) fileStore = getBlobStore(event, 'robin-signatures') || pieces;
      const res = await fileStore.getWithMetadata(key, { type: 'arrayBuffer' });
      if (!res || !res.data) return J(404, { error: 'pièce introuvable' });
      let mime = (res.metadata && (res.metadata.mime || res.metadata.contentType)) || 'application/octet-stream';
      let buf = Buffer.from(res.data);
      let name = key.split('/').pop() || 'piece';
      // Repli mime : si la métadonnée manque, déduire le type des octets magiques
      // (sinon « application/octet-stream » → certains navigateurs affichent les octets en texte).
      if (mime === 'application/octet-stream' && buf.length > 12) {
        if (buf[0] === 0xFF && buf[1] === 0xD8) mime = 'image/jpeg';
        else if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) mime = 'image/png';
        else if (buf.slice(0, 4).toString('latin1') === '%PDF') mime = 'application/pdf';
        else if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') mime = 'image/webp';
      }
      const wantDownload = q.dl === '1';
      // Plafond de réponse d'une fonction Netlify ≈ 6 Mo (base64 inclus). Au-delà → réponse tronquée
      // = image cassée. On vise < ~5,2 Mo binaire. Les images sont donc redimensionnées pour l'AFFICHAGE.
      const SAFE_BYTES = 5_200_000;

      // Image : redimensionnée (toujours servable, EXIF redressé, HEIC→JPEG si le binaire sharp le supporte).
      // En téléchargement, on tente l'original s'il tient sous le plafond, sinon on retombe sur la version réduite.
      if (/^image\//.test(mime) && !(wantDownload && buf.length <= SAFE_BYTES)) {
        let Jimp = null;
        try { Jimp = require('jimp'); } catch (_) { Jimp = null; }
        if (Jimp) {
          try {
            const im = await Jimp.read(buf);
            if (im.bitmap.width > 1600 || im.bitmap.height > 1600) im.scaleToFit(1600, 1600);
            im.quality(78);
            buf = await im.getBufferAsync(Jimp.MIME_JPEG);
            mime = 'image/jpeg';
            if (!/\.jpe?g$/i.test(name)) name = name.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
          } catch (_) { /* format non décodable (ex. HEIC) → on garde l'original */ }
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
          ...corsHeaders(),
          // APRÈS corsHeaders() : sinon son « Content-Type: application/json » écrasait le vrai type
          // du fichier → le navigateur affichait les octets de l'image en texte (bouillie JFIF).
          'Content-Type': mime,
          'Content-Disposition': `${wantDownload ? 'attachment' : 'inline'}; filename="${name}"`,
          'Cache-Control': 'private, no-store',
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

    // ── Mode COMPTE SEUL (pour la liste du CRM) : nb de pièces = dépôt web (p/<ref>/) + WhatsApp
    // (wa/<téléphone>/, téléphone résolu via le dossier). Léger : pas d'appel Airtable (purge). ──
    if (q.countOnly === '1') {
      let phoneKey = '';
      try {
        const mandats = getBlobStore(event, 'mandats');
        const dossier = mandats && (await mandats.get('m/' + ref, { type: 'json' }));
        if (dossier && dossier.phone) phoneKey = String(dossier.phone).replace(/\D/g, '');
      } catch (_) {}
      let count = 0;
      try { const web = await pieces.list({ prefix: 'p/' + ref + '/' }); count += (web.blobs || []).length; } catch (_) {}
      if (phoneKey) { try { const bot = await pieces.list({ prefix: 'wa/' + phoneKey + '/' }); count += (bot.blobs || []).length; } catch (_) {} }
      return J(200, { ref, count });
    }

    // Statuts de qualification (valider/rejeter) — doc unique par dossier (status/<ref>).
    let statusMap = {};
    try { statusMap = (await pieces.get('status/' + ref, { type: 'json' })) || {}; } catch (_) {}

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
        status: (statusMap[key] && statusMap[key].status) || '',
        statusReason: (statusMap[key] && statusMap[key].reason) || '',
      };
    };

    const items = [];
    const web = await pieces.list({ prefix: 'p/' + ref + '/' });
    for (const it of (web.blobs || [])) items.push(await describe(it.key, 'web'));
    if (phoneKey) {
      const bot = await pieces.list({ prefix: 'wa/' + phoneKey + '/' });
      for (const it of (bot.blobs || [])) items.push(await describe(it.key, 'bot'));
    }

    // Document GÉNÉRÉ par Robin des Airs : mise en demeure / notification de cession (store 'robin-claims',
    // clé claim/<ref>/lrar.pdf) → visible dans la liste des documents du dossier, à côté des pièces client.
    try {
      const claims = getBlobStore(event, 'robin-claims');
      if (claims) {
        const claimKey = 'claim/' + ref + '/lrar.pdf';
        const cm = await claims.getMetadata(claimKey);
        if (cm) {
          let genAt = '';
          try { const j = await claims.get('claim/' + ref + '/lrar.json', { type: 'json' }); genAt = (j && j.generatedAt) || ''; } catch (_) {}
          const md = (cm && (cm.metadata || cm)) || {};
          items.push({
            key: claimKey, source: 'genere', kind: 'mise_en_demeure', category: 'MISE_EN_DEMEURE', passenger: '',
            filename: 'Mise en demeure — notification de cession.pdf',
            ts: genAt || md.generatedAt || '',
            url: `/api/crm-pieces?k=${encodeURIComponent(claimKey)}&t=${encodeURIComponent(makeToken(claimKey))}`,
            status: '', statusReason: '',
          });
        }
        // NOTIFICATION DE CESSION (courrier art. 1324) — archivée par /api/notification-creance sous
        // claim/<ref>/notification-cession.pdf. Document DISTINCT de la mise en demeure ci-dessus.
        const notifKey = 'claim/' + ref + '/notification-cession.pdf';
        const nm = await claims.getMetadata(notifKey);
        if (nm) {
          const nmd = (nm && (nm.metadata || nm)) || {};
          items.push({
            key: notifKey, source: 'genere', kind: 'notification_cession', category: 'MISE_EN_DEMEURE', passenger: '',
            filename: 'Notification de cession de créance.pdf',
            ts: nmd.generatedAt || '',
            url: `/api/crm-pieces?k=${encodeURIComponent(notifKey)}&t=${encodeURIComponent(makeToken(notifKey))}`,
            status: '', statusReason: '',
          });
        }
      }
    } catch (_) {}

    // Contrat de cession SIGNÉ (Yousign) — archivé dans 'robin-signatures' clé pdf/<ref> par le webhook
    // (signature terminée). Visible dans la liste des documents du dossier, à côté des pièces client.
    try {
      const sig = getBlobStore(event, 'robin-signatures');
      if (sig) {
        const sigKey = 'pdf/' + ref;
        const sm = await sig.getMetadata(sigKey);
        if (sm) {
          const md = (sm && (sm.metadata || sm)) || {};
          items.push({
            key: sigKey, source: 'signe', kind: 'contrat_cession_signe', category: 'CONTRAT_SIGNE', passenger: '',
            filename: 'Contrat de cession signé.pdf',
            ts: md.signedAt || '',
            url: `/api/crm-pieces?k=${encodeURIComponent(sigKey)}&t=${encodeURIComponent(makeToken(sigKey))}`,
            status: '', statusReason: '',
          });
        }
      }
    } catch (_) {}

    items.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));

    // ── Couche d'ÉDITION : renommage + affectation à UN OU PLUSIEURS passagers ──────────────────
    // Stockée à part dans meta/<ref> (même motif que les statuts status/<ref>), PAS dans les
    // métadonnées du blob : @netlify/blobs v8 n'expose pas setMetadata, il faudrait relire et
    // réécrire tout le fichier (plusieurs Mo) juste pour renommer. Ici : non destructif et instantané.
    try {
      const ovMap = (await pieces.get('meta/' + ref, { type: 'json' })) || {};
      items.forEach((it) => {
        const ov = ovMap[it.key];
        if (ov && ov.label) it.filename = ov.label; // nom donné par l'opérateur
        if (ov && ov.cat) it.category = ov.cat;     // type corrigé par l'opérateur > type deviné
        it.collectif = !!(ov && ov.collectif);      // document couvrant tout le dossier
        const list = it.collectif ? [] : ((ov && Array.isArray(ov.passengers) && ov.passengers.length)
          ? ov.passengers
          : (it.passenger ? [it.passenger] : []));
        it.passengers = list;                 // nouveau modèle : plusieurs passagers par document
        it.passenger = list.join(', ');       // rétro-compat : l'affichage existant lit encore ce champ
      });
    } catch (_) {}

    // Passagers du dossier : le CRM s'en sert pour proposer à qui affecter un document.
    const paxNames = ((dossier && Array.isArray(dossier.passengers)) ? dossier.passengers : [])
      .map((p) => (p && p.name) || '').filter(Boolean);

    // Statut de purge RGPD (visible dans le CRM) — best-effort : si Airtable indispo/quota, pas de badge (ne casse rien).
    let purge = null;
    try {
      const cfg = airtableCfg();
      if (cfg) {
        const recs = await airtableFindByRef(cfg, ref);
        const f = (recs && recs[0] && recs[0].fields) || null;
        if (f) {
          const purged = f['Pièces purgées (RGPD)'];
          const terminal = f[cfg.labels.statutSuivi] === 'Payé client' || f['Éligibilité'] === 'Non';
          if (purged) {
            purge = { state: 'purgé', date: String(purged).slice(0, 10) };
          } else if (terminal) {
            const grace = (parseInt(process.env.RGPD_PURGE_GRACE_DAYS, 10) || 30) * 86400000;
            const lastMod = Date.parse(f['Last Modified Time'] || '') || 0;
            const due = lastMod ? lastMod + grace : 0;
            const daysLeft = due ? Math.ceil((due - Date.now()) / 86400000) : null;
            purge = { state: (daysLeft != null && daysLeft > 0) ? 'programmée' : 'imminente', date: due ? new Date(due).toISOString().slice(0, 10) : '', daysLeft };
          }
        }
      }
    } catch (_) { purge = null; }

    return J(200, { ref, count: items.length, pieces: items, purge, paxNames });
  } catch (e) {
    return J(500, { error: e.message });
  }
};

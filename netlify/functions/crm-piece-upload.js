/**
 * Upload d'une pièce depuis le CRM (bureau.html) — authentifié par l'accès CRM
 * (cookie rda_crm ou header X-CRM-Code), PAS par la réf-jeton. Pour attacher une
 * pièce arrivée HORS bot (email, main propre) au vrai dossier.
 *
 * POST { ref, filename, mime, dataBase64, cat, passenger? }
 *  → stocke dans le store 'pieces' sous p/<ref>/<ts>_<nom>, métadonnée source:'crm'.
 * Même mécanique que depot-upload.js → la pièce devient visible partout (crm-pieces).
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');

const J = (code, obj) => ({
  statusCode: code,
  headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj),
});

function inferKind(explicit, filename) {
  const s = `${explicit || ''} ${filename || ''}`.toLowerCase();
  if (/identite|passeport|cni|passport|sejour|s[ée]jour/.test(s)) return 'identite';
  if (/carte|boarding|embarq/.test(s)) return 'carte-embarquement';
  if (/billet|ticket|booking|reservation|réservation|voyage|ebillet/.test(s)) return 'ebillet';
  if (/certif|retard|attest/.test(s)) return 'certificat';
  if (/frais|re[çc]u|recu/.test(s)) return 'frais';
  return explicit || '';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  if (event.httpMethod !== 'POST') return J(405, { error: 'POST only' });

  const auth = checkCrmAccess(event);
  if (!auth.ok) return J(401, { error: auth.error || 'Non autorisé' });

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return J(400, { error: 'bad json' }); }
  const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  const mime = String(b.mime || '').toLowerCase();
  const data = String(b.dataBase64 || '');
  if (!ref || !data) return J(400, { error: 'ref + fichier requis' });
  if (!/^image\/|^application\/pdf/.test(mime)) return J(415, { error: 'Type non supporté — image ou PDF.' });
  if (data.length > 5_600_000) return J(413, { error: 'Fichier trop volumineux (max ~4 Mo).' });
  let buf; try { buf = Buffer.from(data, 'base64'); } catch { return J(400, { error: 'base64 invalide' }); }

  try {
    const pieces = getBlobStore(event, 'pieces');
    if (!pieces) return J(500, { error: 'store indisponible' });
    const safe = String(b.filename || 'piece').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
    const key = 'p/' + ref + '/' + Date.now() + '_' + safe;
    const kind = inferKind(b.cat || b.kind, b.filename);
    const passenger = String(b.passenger || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    await pieces.set(key, buf, { metadata: { ref, filename: safe, mime, kind, passenger, source: 'crm', ts: new Date().toISOString() } });
    return J(200, { ok: true, key });
  } catch (e) {
    return J(500, { error: e.message });
  }
};

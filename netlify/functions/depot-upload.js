/**
 * Dépôt sécurisé d'une pièce (passeport/CNI, carte d'embarquement, e-billet)
 * depuis le portail web depot-en-ligne.html?r=REF.
 *
 * POST { ref, filename, mime, dataBase64 }
 *  - Sécurité : on n'accepte un upload QUE pour un dossier RÉEL existant (clé m/<ref>
 *    dans le store 'mandats'). La réf-jeton (longue, non énumérable) agit comme bearer.
 *  - Stocke le fichier dans le store 'pieces' sous p/<ref>/<ts>_<nom> (chiffré au repos par Netlify).
 *  - Notifie l'équipe (Make) en best-effort.
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');
let attachPieceToDossier = null;
try { ({ attachPieceToDossier } = require('./lib/airtable-attach')); } catch (e) {}

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

// Type de pièce : « kind » envoyé par la page, sinon déduit du nom de fichier (passeport/carte…).
function inferKind(explicit, filename) {
  const s = `${explicit || ''} ${filename || ''}`.toLowerCase();
  if (/identite|passeport|cni|passport|sejour|s[ée]jour/.test(s)) return 'identite';
  if (/carte|boarding|embarq|ebillet|e-billet|billet|booking|voyage/.test(s)) return 'carte-embarquement';
  return explicit || '';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }
  const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  const mime = String(b.mime || '').toLowerCase();
  const data = String(b.dataBase64 || '');
  if (!ref || !data) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'ref + fichier requis' }) };
  if (!/^image\/|^application\/pdf/.test(mime)) return { statusCode: 415, headers: H, body: JSON.stringify({ error: 'Type non supporté — envoyez une image ou un PDF.' }) };
  if (data.length > 5_600_000) return { statusCode: 413, headers: H, body: JSON.stringify({ error: 'Fichier trop volumineux (max ~4 Mo).' }) };

  let buf; try { buf = Buffer.from(data, 'base64'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'base64 invalide' }) }; }

  try {
    // Sécurité : le dossier doit exister (réf-jeton valide)
    const mandats = getBlobStore(event, 'mandats');
    if (mandats) { const d = await mandats.get('m/' + ref); if (!d) return { statusCode: 404, headers: H, body: JSON.stringify({ error: 'dossier inconnu ou lien expiré' }) }; }

    const pieces = getBlobStore(event, 'pieces');
    if (!pieces) return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'store indisponible' }) };
    const safe = String(b.filename || 'piece').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
    const key = 'p/' + ref + '/' + Date.now() + '_' + safe;
    const kind = inferKind(b.kind, b.filename);
    const passenger = String(b.passenger || b.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    await pieces.set(key, buf, { metadata: { ref, filename: safe, mime, kind, passenger, ts: new Date().toISOString() } });

    // Attache la pièce à la/les fiche·s CRM du dossier dès maintenant (réf connue). Best-effort —
    // si la fiche n'existe pas encore (avant signature), no-op : submit-mandat l'attachera à la signature.
    if (attachPieceToDossier) { try { await attachPieceToDossier({ buf, mime, kind, ref }); } catch (_) {} }

    // Notif équipe (best-effort)
    try { const u = process.env.MAKE_WEBHOOK_NEW_DOSSIER; if (u) await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'piece_deposee', ref, filename: safe, mime, key, source: 'depot-en-ligne' }) }); } catch (_) {}

    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, key }) };
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};

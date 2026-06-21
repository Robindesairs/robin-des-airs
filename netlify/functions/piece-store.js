/**
 * Stockage durable d'une pièce envoyée au BOT WhatsApp (passeport/CNI, carte d'embarquement,
 * e-billet, certificat, reçu de frais).
 *   POST { phone, kind, mime, dataBase64, secret }
 * → store 'pieces', clé wa/<phoneKey>/<ts>_<kind>.<ext> (chiffré au repos par Netlify).
 * Secret = WATI_WEBHOOK_SECRET (le bot le possède). Récupération via /api/pieces?r=REF.
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { safeEqualString } = require('./lib/safe-compare');
let attachPieceToDossier = null;
try { ({ attachPieceToDossier } = require('./lib/airtable-attach')); } catch (e) {}

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://robindesairs.eu', 'Access-Control-Allow-Headers': 'Content-Type' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }

  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (!expected) return { statusCode: 503, headers: H, body: JSON.stringify({ error: 'service indisponible' }) }; // fail-closed
  if (!safeEqualString(String(b.secret || '').trim(), expected)) return { statusCode: 401, headers: H, body: JSON.stringify({ error: 'unauthorized' }) };

  const phoneKey = String(b.phone || '').replace(/\D/g, '').slice(0, 20);
  const mime = String(b.mime || '').toLowerCase();
  const data = String(b.dataBase64 || '');
  const kind = (String(b.kind || 'piece').replace(/[^a-z0-9-]/gi, '') || 'piece').slice(0, 32);
  const passenger = String(b.passenger || b.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!phoneKey || !data) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'phone + fichier requis' }) };
  if (!/^image\/|^application\/pdf/.test(mime)) return { statusCode: 415, headers: H, body: JSON.stringify({ error: 'type non supporté' }) };
  if (data.length > 11000000) return { statusCode: 413, headers: H, body: JSON.stringify({ error: 'trop volumineux' }) };

  let buf; try { buf = Buffer.from(data, 'base64'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'base64 invalide' }) }; }

  try {
    const pieces = getBlobStore(event, 'pieces');
    if (!pieces) return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'store indisponible' }) };
    const ext = mime === 'application/pdf' ? 'pdf' : (mime.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5);
    const key = `wa/${phoneKey}/${Date.now()}_${kind}.${ext}`;
    await pieces.set(key, buf, { metadata: { phone: phoneKey, kind, passenger, mime, ts: new Date().toISOString(), source: 'wati-bot' } });
    // Attache la pièce à la fiche CRM dès maintenant (si le dossier existe déjà = dépôt APRÈS signature).
    // Avant signature : aucune fiche → no-op, submit-mandat l'attachera à la signature. Best-effort.
    if (attachPieceToDossier) { try { await attachPieceToDossier({ buf, mime, kind, phone: phoneKey }); } catch (_) {} }
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, key }) };
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};

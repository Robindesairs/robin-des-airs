/**
 * crm-backfill — Robin des Airs (admin, one-off).
 * Rejoue les dossiers stockés en Blobs (store 'mandats', clés m/<ref>) vers Airtable via
 * syncNewDossierToAirtable — IDEMPOTENT : ne crée que les fiches MANQUANTES, ne touche
 * jamais l'existant. Comble le backlog des dossiers complétés par le bot avant que la
 * synchro directe (dossier-store → Airtable) ne soit en place (« records bot stoppés mi-mai »).
 *
 *   GET /api/crm-backfill?s=<WATI_WEBHOOK_SECRET>          → backfill (tout)
 *   GET /api/crm-backfill?s=...&dry=1                      → compte seulement (n'écrit rien)
 *   GET /api/crm-backfill?s=...&limit=20                   → traite au plus 20 dossiers (batch)
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { safeEqualString } = require('./lib/safe-compare');
const { syncNewDossierToAirtable } = require('./lib/dossier-airtable-sync');

const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

exports.handler = async (event) => {
  const secret = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  const q = (event && event.queryStringParameters) || {};
  const provided = (q.s || (event.headers && (event.headers['x-secret'] || event.headers['X-Secret'])) || '').toString().trim();
  if (!secret || !safeEqualString(provided, secret)) {
    return { statusCode: 401, headers: H, body: JSON.stringify({ ok: false, error: 'unauthorized' }) };
  }

  const dry = q.dry === '1' || q.dry === 'true';
  const limit = Math.max(0, parseInt(q.limit, 10) || 0); // 0 = pas de limite

  const st = getBlobStore(event, 'mandats');
  if (!st) return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: 'store Blobs indisponible' }) };

  let keys = [];
  try {
    const res = await st.list();
    keys = ((res && res.blobs) || []).map((b) => b.key).filter((k) => k && k.startsWith('m/'));
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: 'list: ' + e.message }) };
  }

  // Mode compte : ne lit/écrit rien, renvoie juste combien de dossiers existent en Blobs.
  if (dry) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, dry: true, totalDossiersBlobs: keys.length, echantillon: keys.slice(0, 10) }) };
  }

  let created = 0, exists = 0, errors = 0, processed = 0;
  const createdRefs = [];
  for (const key of keys) {
    if (limit && processed >= limit) break;
    processed++;
    let dossier;
    try { dossier = await st.get(key, { type: 'json' }); } catch (e) { errors++; continue; }
    if (!dossier || typeof dossier !== 'object') { errors++; continue; }
    const ref = String(dossier.ref || key.slice(2) || '').trim();
    if (!ref) { errors++; continue; }
    try {
      const r = await syncNewDossierToAirtable({ ...dossier, ref });
      if (r && r.action === 'created') { created++; if (createdRefs.length < 25) createdRefs.push(ref); }
      else if (r && r.ok) exists++;
      else errors++;
    } catch (e) { errors++; }
    await sleep(160); // throttle Airtable (≤ ~5 req/s)
  }

  return {
    statusCode: 200, headers: H,
    body: JSON.stringify({ ok: true, totalDossiersBlobs: keys.length, processed, created, dejaPresents: exists, errors, createdRefs }),
  };
};

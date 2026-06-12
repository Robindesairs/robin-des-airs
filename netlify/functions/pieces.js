/**
 * Pièces d'un dossier (passeport/CNI, carte d'embarquement, e-billet, certificat, reçus).
 * Réservé à l'ÉQUIPE — secret = WATI_WEBHOOK_SECRET (pièces sensibles : passeports).
 *
 *   Liste   : GET /api/pieces?r=REF&s=SECRET   → { ref, pieces:[{ key, source, label, ts, url }] }
 *   Fichier : GET /api/pieces?k=KEY&s=SECRET   → le fichier (image/PDF)
 *
 * Regroupe les pièces du dépôt web (p/<ref>/…) et du bot WhatsApp (wa/<tel>/…) ;
 * la réf est résolue en téléphone via le dossier (store 'mandats', m/<ref>).
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { safeEqualString } = require('./lib/safe-compare');

const J = (code, obj) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://robindesairs.eu', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': 'https://robindesairs.eu' }, body: '' };

  const q = event.queryStringParameters || {};
  const secret = String(q.s || '').trim();
  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  if (expected && !safeEqualString(secret, expected)) return J(401, { error: 'unauthorized' });

  const pieces = getBlobStore(event, 'pieces');
  if (!pieces) return J(500, { error: 'store indisponible' });

  try {
    // ── Mode FICHIER ──
    if (q.k) {
      const key = String(q.k).replace(/[^A-Za-z0-9._/-]/g, '').slice(0, 200);
      const res = await pieces.getWithMetadata(key, { type: 'arrayBuffer' });
      if (!res || !res.data) return J(404, { error: 'pièce introuvable' });
      const mime = (res.metadata && res.metadata.mime) || 'application/octet-stream';
      const name = key.split('/').pop() || 'piece';
      return {
        statusCode: 200,
        headers: { 'Content-Type': mime, 'Content-Disposition': `inline; filename="${name}"`, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': 'https://robindesairs.eu' },
        body: Buffer.from(res.data).toString('base64'),
        isBase64Encoded: true,
      };
    }

    // ── Mode LISTE ──
    const ref = String(q.r || q.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    if (!ref) return J(400, { error: 'r (référence) ou k (clé) requis' });

    const describe = (key, source) => {
      const name = key.split('/').pop() || key;
      const m = name.match(/^(\d{10,})_(.+?)(?:\.[a-z0-9]+)?$/i);
      return {
        key,
        source,
        label: m ? m[2] : name,
        ts: m ? new Date(Number(m[1])).toISOString() : '',
        url: `/api/pieces?k=${encodeURIComponent(key)}&s=${encodeURIComponent(secret)}`,
      };
    };

    const items = [];
    // Pièces du dépôt web : p/<ref>/…
    const web = await pieces.list({ prefix: 'p/' + ref + '/' });
    for (const it of (web.blobs || [])) items.push(describe(it.key, 'web'));
    // Pièces du bot : wa/<tel>/… — on résout réf → téléphone via le dossier
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

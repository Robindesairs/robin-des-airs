/**
 * Statut de signature d'un mandat (GET public, par RÉF).
 *   GET /api/is-signed?r=REF  →  { signed: true | false }
 *
 * Appelé par le BOT Railway AVANT d'envoyer une relance « signez » : si la réf est
 * déjà signée, le bot n'envoie rien (le mauvais message ne part jamais). C'est la
 * « source de vérité » durable, indépendante du webhook /api/mandat-signed.
 *
 * Source : l'__index du store 'robin-signatures' (écrit par submit-mandat à chaque
 * signature réussie). Une réf n'y figure QUE si elle a réellement été signée → un
 * `signed:true` est fiable. En cas d'erreur/lecture impossible on renvoie signed:null
 * (le bot retombe alors sur le comportement normal = relance).
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  const q = event.queryStringParameters || {};
  const ref = String(q.r || q.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (!ref) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'r requis' }) };

  try {
    const st = getBlobStore(event, 'robin-signatures');
    if (!st) return { statusCode: 200, headers: H, body: JSON.stringify({ signed: null, reason: 'store indisponible' }) };
    let index = [];
    try { index = (await st.get('__index', { type: 'json' })) || []; } catch { index = []; }
    const signed = Array.isArray(index) && index.some((e) => e && e.ref === ref);
    return { statusCode: 200, headers: H, body: JSON.stringify({ signed }) };
  } catch (e) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ signed: null, error: e.message }) };
  }
};

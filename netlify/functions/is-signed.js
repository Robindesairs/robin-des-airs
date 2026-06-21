/**
 * Statut de signature d'un mandat (GET public, par RÉF).
 *   GET /api/is-signed?r=REF  →  { signed: true | false }
 *
 * Appelé par le BOT Railway AVANT d'envoyer une relance « signez » : si la réf est
 * déjà signée, le bot n'envoie rien (le mauvais message ne part jamais). C'est la
 * « source de vérité » durable, indépendante du webhook /api/mandat-signed.
 *
 * Source de vérité par RÉF (atomique) : un mandat signé écrit, dans le store
 * 'robin-signatures', un marqueur `signed/<ref>` ET le PDF `pdf/<ref>`. On les teste
 * en priorité. L'`__index` agrégé (réécrit en read-modify-write à chaque signature,
 * donc susceptible de PERDRE une entrée si deux signatures s'entrecroisent) ne sert
 * que de REPLI. En cas d'erreur/lecture impossible on renvoie signed:null
 * (le bot retombe alors sur le comportement normal = relance).
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://robindesairs.eu', 'Cache-Control': 'no-store' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  const q = event.queryStringParameters || {};
  const ref = String(q.r || q.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (!ref) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'r requis' }) };

  try {
    const st = getBlobStore(event, 'robin-signatures');
    if (!st) return { statusCode: 200, headers: H, body: JSON.stringify({ signed: null, reason: 'store indisponible' }) };
    // 1) Marqueurs par RÉF (atomiques, sans race) : marqueur dédié, puis PDF archivé.
    let signed = false;
    try { if (await st.getMetadata('signed/' + ref)) signed = true; } catch {}
    if (!signed) { try { if (await st.getMetadata('pdf/' + ref)) signed = true; } catch {} }
    // 2) Repli : l'__index agrégé (peut avoir perdu l'entrée en cas de race).
    if (!signed) {
      let index = [];
      try { index = (await st.get('__index', { type: 'json' })) || []; } catch { index = []; }
      signed = Array.isArray(index) && index.some((e) => e && e.ref === ref);
    }
    return { statusCode: 200, headers: H, body: JSON.stringify({ signed }) };
  } catch (e) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ signed: null, error: e.message }) };
  }
};

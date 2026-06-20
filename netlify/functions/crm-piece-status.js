/**
 * Qualifier une pièce (valider / rejeter / en attente) — authentifié par l'accès CRM.
 * Statut stocké dans le store 'pieces' sous status/<ref> = { <pieceKey>: { status, reason, by, ts } }.
 *
 *   POST { ref, key, status:'valide'|'rejete'|'attente', reason? }  → met à jour
 *   GET  ?r=REF                                                     → renvoie la map de statuts
 *
 * Le listing principal (crm-pieces) fusionne déjà ce statut dans chaque pièce.
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');

const J = (code, obj) => ({
  statusCode: code,
  headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj),
});
const VALID = ['valide', 'rejete', 'attente'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };

  const auth = checkCrmAccess(event);
  if (!auth.ok) return J(401, { error: auth.error || 'Non autorisé' });

  const pieces = getBlobStore(event, 'pieces');
  if (!pieces) return J(500, { error: 'store indisponible' });

  try {
    if (event.httpMethod === 'GET') {
      const ref = String((event.queryStringParameters || {}).r || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
      if (!ref) return J(400, { error: 'r (référence) requis' });
      const map = (await pieces.get('status/' + ref, { type: 'json' })) || {};
      return J(200, { ref, status: map });
    }

    if (event.httpMethod !== 'POST') return J(405, { error: 'GET ou POST' });

    let b; try { b = JSON.parse(event.body || '{}'); } catch { return J(400, { error: 'bad json' }); }
    const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    const key = String(b.key || '').replace(/[^A-Za-z0-9._/-]/g, '').slice(0, 200);
    const status = String(b.status || '').toLowerCase();
    if (!ref || !key) return J(400, { error: 'ref + key requis' });
    if (!VALID.includes(status)) return J(400, { error: 'status invalide (valide|rejete|attente)' });
    const reason = String(b.reason || '').slice(0, 300);

    const skey = 'status/' + ref;
    const map = (await pieces.get(skey, { type: 'json' })) || {};
    map[key] = { status, reason, by: (auth.agent || auth.code || 'crm'), ts: new Date().toISOString() };
    await pieces.setJSON(skey, map);
    return J(200, { ok: true, key, status });
  } catch (e) {
    return J(500, { error: e.message });
  }
};

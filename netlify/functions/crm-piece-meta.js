/**
 * Éditer une pièce : la RENOMMER et l'affecter à UN OU PLUSIEURS passagers — accès CRM requis.
 *
 *   POST { ref, key, label?, passengers?: string[], agent }  → enregistre l'override
 *   GET  ?r=REF                                              → renvoie la map d'overrides
 *
 * Stocké dans le store 'pieces' sous meta/<ref> = { <pieceKey>: { label, passengers[], by, ts } }.
 *
 * Pourquoi une map à côté plutôt que les métadonnées du blob : @netlify/blobs v8 n'expose PAS de
 * setMetadata. Modifier les métadonnées obligerait à relire puis réécrire le fichier entier
 * (plusieurs Mo) juste pour changer un nom. Cette couche est non destructive (l'original reste
 * intact), instantanée, et suit le même motif que les statuts (status/<ref>).
 *
 * crm-pieces fusionne déjà cette couche dans le listing (label → filename, passengers → passenger).
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');

const J = (code, obj) => ({
  statusCode: code,
  headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj),
});

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
      const map = (await pieces.get('meta/' + ref, { type: 'json' })) || {};
      return J(200, { ref, meta: map });
    }

    if (event.httpMethod !== 'POST') return J(405, { error: 'GET ou POST' });

    let b; try { b = JSON.parse(event.body || '{}'); } catch { return J(400, { error: 'bad json' }); }
    const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    const key = String(b.key || '').replace(/[^A-Za-z0-9._/-]/g, '').slice(0, 200);
    if (!ref || !key) return J(400, { error: 'ref + key requis' });
    // Nom de l'agent obligatoire : toute modification est traçable (checkCrmAccess ne porte pas d'identité).
    const agent = String(b.agent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!agent) return J(400, { error: 'Votre nom est requis pour modifier une pièce (traçabilité).' });

    const label = String(b.label || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    const passengers = (Array.isArray(b.passengers) ? b.passengers : [])
      .map((p) => String(p || '').replace(/\s+/g, ' ').trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 20);

    const mkey = 'meta/' + ref;
    const map = (await pieces.get(mkey, { type: 'json' })) || {};
    // label/passengers vides = on retire l'override (retour au nom et à l'attribution d'origine).
    if (!label && !passengers.length) delete map[key];
    else map[key] = { label, passengers, by: agent, ts: new Date().toISOString() };
    await pieces.setJSON(mkey, map);

    return J(200, { ok: true, key, label, passengers });
  } catch (e) {
    return J(500, { error: e.message });
  }
};

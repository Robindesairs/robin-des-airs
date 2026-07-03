/**
 * SCAFFOLD — POST /api/aval-relances  { secret, dossiers?[], now? }
 *
 * Étape 3 : calculer les relances dues (J+15 rappel, J+30 ferme) pour une liste de
 * dossiers. DRY-RUN : ne relance PERSONNE, ne stocke rien, ne change aucun statut.
 * Renvoie la file des relances à effectuer (human-in-the-loop décide et envoie).
 *
 * En prod, la liste viendrait d'Airtable ; ici on l'accepte inline pour les tests.
 */

'use strict';

const { normalizeDossier, nextRelance } = require('./lib/aval-pipeline');
const { verifyInternalSecret, publicCorsHeaders, denyResponse } = require('./lib/internal-auth');

const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

/**
 * Calcule la file des relances dues (pur, testable).
 * @param {object[]} dossiers  liste brute ou normalisée
 * @param {Date} now
 * @returns {{ total:number, dues:object[] }}
 */
function computeRelances(dossiers, now = new Date()) {
  const dues = [];
  for (const raw of dossiers || []) {
    const d = normalizeDossier(raw);
    const r = nextRelance(d, now);
    if (r && r.due) {
      dues.push({
        ref: d.ref,
        rang: r.rang,
        canal: r.canal,
        ton: r.ton,
        joursDepuisMed: r.joursDepuisMed,
        // Aucune promesse de délai/résultat dans le libellé de relance.
        libelle: `Relance #${r.rang} (${r.ton}) — dossier ${d.ref}`,
      });
    }
  }
  return { total: dues.length, dues };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'POST uniquement' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'JSON invalide' }) }; }

  const auth = verifyInternalSecret(event, body);
  if (!auth.ok) return denyResponse(401, auth.error, 'public');

  const now = body.now ? new Date(body.now) : new Date();
  const queue = computeRelances(body.dossiers || [], now);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      scaffold: true,
      dryRun: true,
      statutInchange: true,
      generatedAt: now.toISOString(),
      ...queue,
    }),
  };
};

module.exports.computeRelances = computeRelances;

/**
 * SCAFFOLD — POST /api/aval-generate-claim  { ref, secret }
 *
 * Étape 1 du pipeline aval : préparer la réclamation (mise en demeure) d'un dossier.
 * SCAFFOLD dry-run : ne stocke rien en prod, ne génère AUCUN PDF réel, ne change AUCUN
 * statut, n'envoie rien. Renvoie le PLAN de réclamation (déterministe) que la fonction
 * prod `generate-claim.js` produirait — pour tester la mécanique en isolation.
 *
 * La prod reste seule autorité : ce module n'importe ni ne modifie generate-claim.js.
 *
 * Wording : « cession » côté opérateur ; éligibilité au conditionnel ; pas de garantie.
 */

'use strict';

const { normalizeDossier, commission } = require('./lib/aval-pipeline');
const { verifyInternalSecret, publicCorsHeaders, denyResponse } = require('./lib/internal-auth');

const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

/**
 * Construit le plan de réclamation (pur, testable).
 * @param {object} dossier  dossier normalisé
 * @returns {object}
 */
function buildClaimPlan(dossier) {
  const montant = dossier.montant || 0;
  return {
    ref: dossier.ref,
    passager: dossier.name || '—',
    vol: dossier.vol || '',
    compagnie: dossier.compagnie || 'la compagnie aérienne',
    route: dossier.route || '',
    dateVol: dossier.dateVol || '',
    // Éligibilité TOUJOURS au conditionnel (loi 71-1130).
    eligibiliteMention: 'Ce vol peut donner droit à une indemnisation selon éligibilité (CE 261/2004).',
    montantReclame: montant,
    delaiReponseJours: 14,
    // Régime opérateur par défaut = cession.
    regime: 'cession',
    commission: commission('amiable'),
    // Rappel garde-fou : sans pièce d'identité de chaque passager, réclamation contestable.
    prerequis: ['pièce identité de chaque passager', 'preuve de retard/annulation', 'cession signée'],
  };
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

  const ref = String(body.ref || '').trim();
  if (!ref) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'ref requis' }) };

  // SCAFFOLD : le dossier peut être fourni inline (tests) ; en prod ce serait un fetch Airtable.
  const dossier = normalizeDossier(body.dossier || { fields: { 'Référence Dossier': ref } });
  const plan = buildClaimPlan(dossier);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      dryRun: true,
      scaffold: true,
      statutInchange: true,
      plan,
    }),
  };
};

module.exports.buildClaimPlan = buildClaimPlan;

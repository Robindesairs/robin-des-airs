/**
 * SCAFFOLD — POST /api/aval-escalade  { secret, dossiers?[], now? }
 *
 * Étape 4 : repérer les dossiers mûrs pour l'escalade contentieuse (Tribunal de
 * commerce) — MED envoyée, relances épuisées, délai (J+62) dépassé, dossier non
 * terminal. DRY-RUN : ne saisit aucun tribunal, ne change aucun statut, n'envoie rien.
 *
 * La bascule contentieuse fait passer la commission de 25 % à 40 % (client 60 %),
 * frais de procédure avancés par Robin des Airs. Cette fonction ne fait que PROPOSER
 * l'escalade à l'opérateur (human-in-the-loop).
 */

'use strict';

const { normalizeDossier, shouldEscalate } = require('./lib/aval-pipeline');
const { verifyInternalSecret, publicCorsHeaders, denyResponse } = require('./lib/internal-auth');

const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

/**
 * Sélectionne les dossiers à escalader (pur, testable).
 * @param {object[]} dossiers
 * @param {Date} now
 */
function computeEscalade(dossiers, now = new Date()) {
  const aEscalader = [];
  for (const raw of dossiers || []) {
    const d = normalizeDossier(raw);
    const e = shouldEscalate(d, now);
    if (e && e.escalate) {
      aEscalader.push({
        ref: d.ref,
        joursDepuisMed: e.joursDepuisMed,
        juridiction: e.juridiction,
        commission: e.commission,
        note: e.note,
        // Éligibilité rappelée au conditionnel avant toute action contentieuse.
        rappel: 'Vérifier l’éligibilité (peut donner droit à indemnisation) avant saisine.',
      });
    }
  }
  return { total: aEscalader.length, dossiers: aEscalader };
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
  const result = computeEscalade(body.dossiers || [], now);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      scaffold: true,
      dryRun: true,
      statutInchange: true,
      generatedAt: now.toISOString(),
      ...result,
    }),
  };
};

module.exports.computeEscalade = computeEscalade;

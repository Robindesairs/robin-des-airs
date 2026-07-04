/**
 * SCAFFOLD — POST /api/aval-suivi-paiement  { secret, ref, montant, phase?, encaisseLe? }
 *
 * Étape 5 : à l'encaissement d'une indemnité, calculer la répartition et l'échéance de
 * versement au client. DRY-RUN : ne déclenche AUCUN virement, ne change aucun statut,
 * n'écrit rien. Renvoie le plan de répartition (déterministe) pour vérification humaine.
 *
 * Règles (source de vérité) :
 *   - Commission 25 % en phase amiable (client 75 %), 40 % en phase contentieuse (client 60 %).
 *   - Versement AU CLIENT : 5 jours ouvrés après encaissement (jamais 48h).
 *   - Fonds clients sur compte dédié insaisissable (rappel, non calculé ici).
 */

'use strict';

const { repartition } = require('./lib/aval-pipeline');
const { verifyInternalSecret, publicCorsHeaders, denyResponse } = require('./lib/internal-auth');

const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

/** Ajoute N jours ouvrés (lun–ven) à une date ISO. Pur. */
function addBusinessDays(dateStr, n) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return null;
  let added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
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

  const montant = Number(body.montant);
  if (!Number.isFinite(montant) || montant <= 0) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'montant (>0) requis' }) };
  }

  const phase = body.phase === 'contentieux' ? 'contentieux' : 'amiable';
  const plan = repartition(montant, phase);
  const versementClientAuPlusTard = addBusinessDays(body.encaisseLe, 5);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      scaffold: true,
      dryRun: true,
      statutInchange: true,
      ref,
      ...plan,
      encaisseLe: body.encaisseLe || null,
      versementClientAuPlusTard,
      compte: 'compte dédié fonds clients (insaisissable)',
    }),
  };
};

module.exports.addBusinessDays = addBusinessDays;

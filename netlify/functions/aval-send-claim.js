/**
 * SCAFFOLD — POST /api/aval-send-claim  { ref, secret, confirm? }
 *
 * Étape 2 : « envoyer » la réclamation à la compagnie. STUB DRY-RUN STRICT :
 * N'ENVOIE RIEN (aucun email, aucun LRAR, aucun appel réseau sortant). Se contente de
 * décrire l'enveloppe d'envoi qui SERAIT produite, et exige un double garde-fou :
 *   - variable d'env AVAL_SEND_ENABLED=1  ET  body.confirm===true
 * faute de quoi il renvoie { sent:false, wouldSend:true } sans effet de bord.
 *
 * Tant que le canal réel n'est pas branché (human-in-the-loop), ce stub reste inerte.
 */

'use strict';

const { normalizeDossier } = require('./lib/aval-pipeline');
const { verifyInternalSecret, publicCorsHeaders, denyResponse } = require('./lib/internal-auth');

const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

/**
 * Construit l'enveloppe d'envoi (pur). Ne déclenche AUCUN envoi.
 * @param {object} dossier  dossier normalisé
 * @returns {object}
 */
function buildEnvelope(dossier) {
  return {
    ref: dossier.ref,
    destinataire: dossier.compagnie || 'compagnie aérienne',
    canal: 'lrar', // LRAR par défaut (traçabilité) ; email possible selon compagnie
    objet: `Réclamation CE 261/2004 — dossier ${dossier.ref}`,
    piecesJointes: ['mise-en-demeure.pdf', 'cession-signee.pdf'],
    // Aucune garantie de délai d'indemnisation (loi 71-1130).
    mentionDelai: 'Réponse attendue sous 14 jours ; aucun délai d’indemnisation garanti.',
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

  const dossier = normalizeDossier(body.dossier || { fields: { 'Référence Dossier': ref } });
  const envelope = buildEnvelope(dossier);

  // Double garde-fou. Le stock scaffold n'envoie JAMAIS, même si activé : on le signale.
  const enabled = String(process.env.AVAL_SEND_ENABLED || '').trim() === '1';
  const confirmed = body.confirm === true;
  const wouldSend = enabled && confirmed;

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      scaffold: true,
      sent: false, // JAMAIS true dans le scaffold
      wouldSend,
      dryRun: true,
      raison: wouldSend
        ? 'Garde-fous levés, mais le scaffold reste inerte : brancher le canal réel en prod.'
        : 'Envoi désactivé (AVAL_SEND_ENABLED≠1 ou confirm≠true).',
      envelope,
    }),
  };
};

module.exports.buildEnvelope = buildEnvelope;

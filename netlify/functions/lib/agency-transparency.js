/**
 * Transparence décision compagnie — espace agence / partenaire.
 * Justification acceptation ou refus ; montant différent exprimé en % du barème indicatif.
 */

const { agencyPricing } = require('./agency-pricing');

function parseEuroAmount(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).replace(/\s/g, '').replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function airlineDecisionFromStatut(statut) {
  if (statut === 'rejete') return 'refused';
  if (statut === 'gagne' || statut === 'paye') return 'accepted';
  return 'pending';
}

function extractJustification(raison, remarques) {
  const r = String(raison || '').trim();
  if (r) return r;
  const rem = String(remarques || '').trim();
  if (!rem) return '';
  const m = rem.match(/(?:compagnie|airline|transporteur)\s*[:—-]\s*([^|]+)/i);
  if (m) return m[1].trim();
  if (/refus|rejet|denied|refused/i.test(rem)) {
    const parts = rem.split('|').map((x) => x.trim()).filter(Boolean);
    return parts[parts.length - 1] || rem.slice(0, 280);
  }
  return '';
}

/**
 * @param {object} data — champs dossier (indemnite, montantClient, raisonCompagnie, remarques…)
 * @param {string} statut — statut UI agence (nouveau, en-cours, gagne, paye, rejete…)
 * @param {string} [lang] — fr | en
 */
function buildAgencyTransparency(data, statut, lang) {
  const isEn = String(lang || '').toLowerCase().startsWith('en');
  const pricing = agencyPricing();
  const referenceEur =
    parseEuroAmount(data.indemniteReference) ||
    parseEuroAmount(data.indemnite) ||
    pricing.indemnityEur ||
    600;
  const collectedEur =
    parseEuroAmount(data.montantEncaisse) ||
    parseEuroAmount(data.montantClient) ||
    (airlineDecisionFromStatut(statut) === 'accepted' ? parseEuroAmount(data.indemnite) : null);

  const decision = airlineDecisionFromStatut(statut);
  const justification = extractJustification(data.raisonCompagnie, data.remarques);
  let percentOfReference = null;
  if (collectedEur != null && referenceEur > 0) {
    percentOfReference = Math.round((collectedEur / referenceEur) * 100);
  }

  let summary = '';
  if (decision === 'accepted') {
    if (collectedEur != null && percentOfReference != null) {
      summary = isEn
        ? `Airline: payment accepted — ${collectedEur} € collected (${percentOfReference}% of indicative ${referenceEur} € bracket).`
        : `Compagnie : acceptation — ${collectedEur} € encaissés (${percentOfReference} % du barème indicatif ${referenceEur} €).`;
    } else {
      summary = isEn
        ? `Airline: claim accepted. Indicative bracket: ${referenceEur} € (amount to be confirmed on payout).`
        : `Compagnie : acceptation. Barème indicatif : ${referenceEur} € (montant confirmé à l'encaissement).`;
    }
    if (justification) {
      summary += isEn ? ` Justification: ${justification}` : ` Motif communiqué : ${justification}`;
    }
  } else if (decision === 'refused') {
    summary = isEn
      ? 'Airline: claim refused.'
      : 'Compagnie : refus de la réclamation.';
    if (justification) {
      summary += isEn
        ? ` Robin des Airs documents the reason: ${justification}`
        : ` Robin des Airs documente le motif : ${justification}`;
    } else {
      summary += isEn
        ? ' Detailed justification will appear in Remarks as soon as Robin receives the airline response.'
        : ' Le motif détaillé sera ajouté dans les remarques dès réception de la réponse compagnie.';
    }
  } else {
    summary = isEn
      ? 'Airline decision pending. Robin des Airs will publish acceptance or refusal with justification for this file.'
      : 'Décision compagnie en attente. Robin des Airs publiera l\'acceptation ou le refus motivé pour ce dossier.';
  }

  return {
    decision,
    referenceEur,
    collectedEur,
    percentOfReference,
    justification,
    summary,
  };
}

module.exports = {
  buildAgencyTransparency,
  parseEuroAmount,
  airlineDecisionFromStatut,
};

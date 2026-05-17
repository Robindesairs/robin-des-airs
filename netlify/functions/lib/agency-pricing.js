/**
 * Tarification partenaire agence.
 * Référence terrain Gambie : 3 800 GMD / passager gagné (converti en EUR pour Airtable).
 *
 * Netlify :
 *   AGENCY_COMMISSION_GMD = 3800  (commission agence / passager gagné)
 *   AGENCY_GMD_PER_EUR = 84       (taux indicatif dalasi → euro)
 *   AGENCY_COMMISSION_EUR         (optionnel, sinon dérivé de GMD)
 *   AGENCY_CLIENT_NET_EUR = 420
 *   AGENCY_INDEMNITY_REF_EUR = 600
 */

const XOF_PER_EUR = parseFloat(process.env.AGENCY_XOF_PER_EUR || '655.957') || 655.957;
const GMD_PER_EUR = parseFloat(process.env.AGENCY_GMD_PER_EUR || '84') || 84;

function agencyPricing() {
  const commissionGmd = parseFloat(process.env.AGENCY_COMMISSION_GMD || '3800', 10) || 3800;
  const commissionEurFromEnv = process.env.AGENCY_COMMISSION_EUR;
  const commissionEur = commissionEurFromEnv
    ? parseFloat(commissionEurFromEnv, 10) || commissionGmd / GMD_PER_EUR
    : Math.round((commissionGmd / GMD_PER_EUR) * 100) / 100;
  const clientNetEur = parseFloat(process.env.AGENCY_CLIENT_NET_EUR || '420', 10) || 420;
  const indemnityEur = parseFloat(process.env.AGENCY_INDEMNITY_REF_EUR || '600', 10) || 600;
  const robinEur = Math.max(0, Math.round((indemnityEur - clientNetEur - commissionEur) * 100) / 100);
  const commissionFcfa = Math.round(commissionEur * XOF_PER_EUR);

  return {
    commissionGmd,
    commissionEur,
    clientNetEur,
    indemnityEur,
    robinEur,
    commissionFcfa,
    gmdPerEur: GMD_PER_EUR,
    /** @deprecated utilisez commissionEur — conservé pour compat */
    commissionPerPax: commissionFcfa,
    commissionPerPaxEur: commissionEur,
    xofPerEur: XOF_PER_EUR,
  };
}

module.exports = { agencyPricing, XOF_PER_EUR };

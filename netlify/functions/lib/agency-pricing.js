/**
 * Tarification partenaire agence (EUR = référence).
 *
 * Netlify :
 *   AGENCY_COMMISSION_EUR = 45   (commission agence / passager gagné)
 *   AGENCY_CLIENT_NET_EUR = 420  (net passager indicatif long-courrier)
 *   AGENCY_INDEMNITY_REF_EUR = 600 (indemnité CE 261 référence >3500 km)
 */

const XOF_PER_EUR = parseFloat(process.env.AGENCY_XOF_PER_EUR || '655.957') || 655.957;

function agencyPricing() {
  const commissionEur = parseFloat(process.env.AGENCY_COMMISSION_EUR || '45', 10) || 45;
  const clientNetEur = parseFloat(process.env.AGENCY_CLIENT_NET_EUR || '420', 10) || 420;
  const indemnityEur = parseFloat(process.env.AGENCY_INDEMNITY_REF_EUR || '600', 10) || 600;
  const robinEur = Math.max(0, Math.round((indemnityEur - clientNetEur - commissionEur) * 100) / 100);
  const commissionFcfa = Math.round(commissionEur * XOF_PER_EUR);

  return {
    commissionEur,
    clientNetEur,
    indemnityEur,
    robinEur,
    commissionFcfa,
    /** @deprecated utilisez commissionEur — conservé pour compat */
    commissionPerPax: commissionFcfa,
    commissionPerPaxEur: commissionEur,
    xofPerEur: XOF_PER_EUR,
  };
}

module.exports = { agencyPricing, XOF_PER_EUR };

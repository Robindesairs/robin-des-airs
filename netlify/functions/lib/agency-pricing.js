/**
 * Tarification partenaire agence.
 * Commission par palier de date de signature — voir agency-commission-tiers.js
 *
 * Netlify :
 *   AGENCY_TIER1_GMD / AGENCY_TIER1_END (été, défaut 3800 / 2026-08-31)
 *   AGENCY_TIER2_GMD / AGENCY_TIER2_END (fin année, défaut 3400 / 2026-12-31)
 *   AGENCY_TIER3_GMD (2027+, défaut 3000)
 *   AGENCY_GMD_PER_EUR = 84
 *   AGENCY_CLIENT_NET_EUR = 420
 *   AGENCY_INDEMNITY_REF_EUR = 600
 */

const { resolvePartnerCommissionTier, GMD_PER_EUR } = require('./agency-commission-tiers');

const XOF_PER_EUR = parseFloat(process.env.AGENCY_XOF_PER_EUR || '655.957') || 655.957;

/** @param {{ at?: Date|string, lockedCommissionGmd?: number, lang?: string }} [opts] */
function agencyPricing(opts) {
  const locked = opts && opts.lockedCommissionGmd != null ? Number(opts.lockedCommissionGmd) : null;
  const tier = resolvePartnerCommissionTier(opts && opts.at ? opts.at : new Date(), opts && opts.lang);
  const commissionGmd =
    locked != null && Number.isFinite(locked) && locked > 0 ? Math.round(locked) : tier.commissionGmd;
  const commissionEur = Math.round((commissionGmd / GMD_PER_EUR) * 100) / 100;
  const clientNetEur = parseFloat(process.env.AGENCY_CLIENT_NET_EUR || '420', 10) || 420;
  const indemnityEur = parseFloat(process.env.AGENCY_INDEMNITY_REF_EUR || '600', 10) || 600;
  const robinEur = Math.max(0, Math.round((indemnityEur - clientNetEur - commissionEur) * 100) / 100);
  const commissionFcfa = Math.round(commissionEur * XOF_PER_EUR);

  const isLocked = locked != null && Number.isFinite(locked) && locked > 0;

  return {
    commissionGmd,
    commissionEur,
    clientNetEur,
    indemnityEur,
    robinEur,
    commissionFcfa,
    gmdPerEur: GMD_PER_EUR,
    commissionTier: tier.tierId,
    commissionTierLabel: tier.tierLabel,
    commissionTiers: tier.allTiers,
    /** Échéances = nouvelles signatures uniquement ; ignorées si palier déjà acquis */
    tierEndsYmd: isLocked ? null : tier.tierEndsYmd,
    nextTierGmd: isLocked ? null : tier.nextTierGmd,
    commissionLocked: isLocked,
    commissionLifetime: isLocked,
    /** @deprecated utilisez commissionEur — conservé pour compat */
    commissionPerPax: commissionFcfa,
    commissionPerPaxEur: commissionEur,
    xofPerEur: XOF_PER_EUR,
  };
}

module.exports = { agencyPricing, XOF_PER_EUR, resolvePartnerCommissionTier };

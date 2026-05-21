/**
 * Commission agence partenaire — paliers par date de signature du contrat.
 *
 * Offre fondateur (4 000 GMD, 3 premières agences, signature avant 2026-08-31) : manuel dans AGENCY_ACCOUNTS.
 *
 * Palier 1 : été → 3 800 GMD | Palier 2 : fin année → 3 400 | Palier 3 : 2027 → 3 000
 * Acquis à vie à la signature. Les échéances ne concernent que les nouveaux contrats.
 */

const GMD_PER_EUR = parseFloat(process.env.AGENCY_GMD_PER_EUR || '84') || 84;

function loadTierConfig() {
  return [
    {
      id: 'ete',
      order: 1,
      labelFr: "Palier été — signature avant fin d'été",
      labelEn: 'Summer tier — sign before end of summer',
      commissionGmd: parseInt(process.env.AGENCY_TIER1_GMD || '3800', 10) || 3800,
      endInclusive: (process.env.AGENCY_TIER1_END || '2026-08-31').trim(),
    },
    {
      id: 'fin_annee',
      order: 2,
      labelFr: "Palier automne — jusqu'à fin d'année",
      labelEn: 'Autumn tier — through end of year',
      commissionGmd: parseInt(process.env.AGENCY_TIER2_GMD || '3400', 10) || 3400,
      endInclusive: (process.env.AGENCY_TIER2_END || '2026-12-31').trim(),
    },
    {
      id: '2027',
      order: 3,
      labelFr: 'Palier 2027 — à partir du 1er janvier',
      labelEn: '2027 tier — from 1 January',
      commissionGmd: parseInt(process.env.AGENCY_TIER3_GMD || '3000', 10) || 3000,
      endInclusive: null,
    },
  ];
}

function toYmd(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function compareYmd(a, b) {
  if (!a || !b) return 0;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * @param {Date|string} [at]
 * @param {string} [lang] fr | en
 */
function resolvePartnerCommissionTier(at, lang) {
  const ymd = toYmd(at || new Date());
  const tiers = loadTierConfig();
  const isEn = String(lang || '').toLowerCase().startsWith('en');

  let current = tiers[tiers.length - 1];
  for (const t of tiers) {
    if (!t.endInclusive || compareYmd(ymd, t.endInclusive) <= 0) {
      current = t;
      break;
    }
  }

  const idx = tiers.findIndex((t) => t.id === current.id);
  const next = idx >= 0 && idx < tiers.length - 1 ? tiers[idx + 1] : null;

  const commissionGmd = current.commissionGmd;
  const commissionEur = Math.round((commissionGmd / GMD_PER_EUR) * 100) / 100;

  return {
    tierId: current.id,
    tierOrder: current.order,
    tierLabel: isEn ? current.labelEn : current.labelFr,
    commissionGmd,
    commissionEur,
    gmdPerEur: GMD_PER_EUR,
    effectiveYmd: ymd,
    tierEndsYmd: current.endInclusive,
    nextTierId: next ? next.id : null,
    nextTierGmd: next ? next.commissionGmd : null,
    nextTierStartsYmd: next && current.endInclusive ? addDaysYmd(current.endInclusive, 1) : null,
    allTiers: tiers.map((t) => ({
      id: t.id,
      label: isEn ? t.labelEn : t.labelFr,
      commissionGmd: t.commissionGmd,
      endInclusive: t.endInclusive,
    })),
  };
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return toYmd(dt);
}

module.exports = {
  loadTierConfig,
  resolvePartnerCommissionTier,
  toYmd,
  GMD_PER_EUR,
};

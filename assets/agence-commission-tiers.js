/**
 * Palier commission agence (navigateur) — dates + ligne fondateur (affichage statique).
 */
(function (global) {
  const FOUNDING_GMD = 4000;

  const TIERS = [
    {
      id: 'ete',
      labelFr: "Palier été — signature avant fin d'été (31 août)",
      labelEn: 'Summer tier — sign before end of summer (31 Aug)',
      commissionGmd: 3800,
      endInclusive: '2026-08-31',
    },
    {
      id: 'fin_annee',
      labelFr: "Palier automne — jusqu'au 31 décembre",
      labelEn: 'Autumn tier — through 31 December',
      commissionGmd: 3400,
      endInclusive: '2026-12-31',
    },
    {
      id: '2027',
      labelFr: 'Palier 2027 — à partir du 1er janvier',
      labelEn: '2027 tier — from 1 January',
      commissionGmd: 3000,
      endInclusive: null,
    },
  ];

  function toYmd(d) {
    const x = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return x.toISOString().slice(0, 10);
  }

  function cmp(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function addDay(ymd) {
    const t = new Date(ymd + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + 1);
    return toYmd(t);
  }

  /** Palier date en vigueur à la signature (contrat en ligne). */
  function resolve(at, lang) {
    const ymd = toYmd(at || new Date());
    const isEn = String(lang || '').toLowerCase().startsWith('en');
    const gmdPerEur = 84;
    let current = TIERS[TIERS.length - 1];
    for (const t of TIERS) {
      if (!t.endInclusive || cmp(ymd, t.endInclusive) <= 0) {
        current = t;
        break;
      }
    }
    const idx = TIERS.findIndex((t) => t.id === current.id);
    const next = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
    return {
      tierId: current.id,
      tierLabel: isEn ? current.labelEn : current.labelFr,
      commissionGmd: current.commissionGmd,
      commissionEur: Math.round((current.commissionGmd / gmdPerEur) * 100) / 100,
      gmdPerEur,
      tierEndsYmd: current.endInclusive,
      nextTierGmd: next ? next.commissionGmd : null,
      nextTierStartsYmd: next && current.endInclusive ? addDay(current.endInclusive) : null,
    };
  }

  /** Tous les paliers pour tableaux (fondateur + dates). */
  function allTiersForDisplay(lang) {
    const isEn = String(lang || '').toLowerCase().startsWith('en');
    const founding = {
      id: 'founding',
      label: isEn
        ? 'Founding partner — 4,000 GMD per pax, sign before 31 Aug 2026 (first 3, manual)'
        : 'Partenaire fondateur — signature avant le 31 août 2026 (3 premières, manuel)',
      commissionGmd: FOUNDING_GMD,
    };
    const dateTiers = TIERS.map((t) => ({
      id: t.id,
      label: isEn ? t.labelEn : t.labelFr,
      commissionGmd: t.commissionGmd,
    }));
    return [founding].concat(dateTiers);
  }

  global.AgenceCommissionTiers = {
    resolve,
    allTiersForDisplay,
    FOUNDING_GMD,
    TIERS,
  };
})(typeof window !== 'undefined' ? window : global);

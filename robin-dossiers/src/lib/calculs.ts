// lib/calculs.ts — logique financière Robin des Airs (aligné robin-api)

const TAUX_LEGAL = 0.0665; // 6.65%
const COMMISSION_PCT = 0.25;
const FORFAIT_RECOUVREMENT = 40;

export function calcFinancier(
  palier: number,
  nbPassagersIndemnises: number
): {
  brut: number;
  commission: number;
  netClient: number;
  netParPassager: number;
  totalReclame: number;
} {
  const brut = palier * nbPassagersIndemnises;
  const commission = Math.round(brut * COMMISSION_PCT * 100) / 100;
  const netClient = brut - commission;
  const netParPassager =
    nbPassagersIndemnises > 0
      ? Math.round((netClient / nbPassagersIndemnises) * 100) / 100
      : 0;
  const totalReclame = brut + FORFAIT_RECOUVREMENT;
  return { brut, commission, netClient, netParPassager, totalReclame };
}

export function calcMoratoire(lrarReception: string | null): {
  actif: boolean;
  j16: string | null;
  jours: number;
  interets: number;
  total: number;
} {
  if (!lrarReception)
    return { actif: false, j16: null, jours: 0, interets: 0, total: 0 };

  const j16 = new Date(lrarReception);
  j16.setDate(j16.getDate() + 16);
  const j16Str = j16.toISOString().slice(0, 10);
  const now = new Date();

  if (now < j16)
    return {
      actif: false,
      j16: j16Str,
      jours: 0,
      interets: 0,
      total: FORFAIT_RECOUVREMENT,
    };

  const jours = Math.floor(
    (now.getTime() - j16.getTime()) / (1000 * 86400)
  );
  return {
    actif: true,
    j16: j16Str,
    jours,
    interets: 0,
    total: FORFAIT_RECOUVREMENT,
  };
}

export function genererIdDossier(existingCount: number): string {
  const year = new Date().getFullYear();
  const num = String(existingCount + 1).padStart(3, "0");
  return `RDA-${year}-${num}`;
}

export function palierCE261(distanceKm: number): 250 | 400 | 600 {
  if (distanceKm <= 1500) return 250;
  if (distanceKm <= 3500) return 400;
  return 600;
}

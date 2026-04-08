export function getPartnerCommissionRateFromSource(source: string | null | undefined): number {
  const s = String(source ?? "").trim().toLowerCase();
  if (s === "partenariat_agence" || s === "agence" || s === "agence_partner") return 0;
  if (s === "parrainage_particulier" || s === "referral" || s === "parrainage") return 0.25;
  return 0;
}

export function isParrainageSource(source: string | null | undefined): boolean {
  const s = String(source ?? "").trim().toLowerCase();
  return s === "parrainage_particulier" || s === "referral" || s === "parrainage";
}

export function getPartnerCommissionFromSource(
  source: string | null | undefined,
  netRobin: number,
  palier: number | null | undefined
): number {
  const s = String(source ?? "").trim().toLowerCase();
  if (s === "partenariat_agence" || s === "agence" || s === "agence_partner") return 45;
  // Règle métier: pas de parrainage sur indemnités 250€ / 400€.
  if (isParrainageSource(source) && Number(palier ?? 0) < 600) return 0;
  const rate = getPartnerCommissionRateFromSource(source);
  return Math.round((Number(netRobin || 0) * rate) * 100) / 100;
}

export function getAgencyClientAmount(grossAmount: number): number {
  return Math.round((Number(grossAmount || 0) * 0.7) * 100) / 100;
}

export function isAgenceSource(source: string | null | undefined): boolean {
  const s = String(source ?? "").trim().toLowerCase();
  return s === "partenariat_agence" || s === "agence" || s === "agence_partner";
}

export function getPartnerLabelFromSource(source: string | null | undefined): string {
  const s = String(source ?? "").trim().toLowerCase();
  if (s === "partenariat_agence" || s === "agence" || s === "agence_partner") return "Partenariat agence";
  if (s === "parrainage_particulier" || s === "referral" || s === "parrainage") return "Parrainage particulier";
  return "Aucun partenaire";
}

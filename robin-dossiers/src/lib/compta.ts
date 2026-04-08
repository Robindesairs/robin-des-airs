export function getPartnerCommissionFromSource(source: string | null | undefined): number {
  const s = String(source ?? "").trim().toLowerCase();
  if (s === "partenariat_agence" || s === "agence" || s === "agence_partner") return 45;
  if (s === "parrainage_particulier" || s === "referral" || s === "parrainage") return 20;
  return 0;
}

export function getPartnerLabelFromSource(source: string | null | undefined): string {
  const s = String(source ?? "").trim().toLowerCase();
  if (s === "partenariat_agence" || s === "agence" || s === "agence_partner") return "Partenariat agence";
  if (s === "parrainage_particulier" || s === "referral" || s === "parrainage") return "Parrainage particulier";
  return "Aucun partenaire";
}

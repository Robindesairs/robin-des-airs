/**
 * Statuts dossier — alignés sur PLAYBOOK-OPERATIONNEL.md (tableau de suivi).
 * Ordre = parcours type : lead → signature → mise en demeure → relance → médiateur → cession → tribunal → payé.
 */

export const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Nouveau lead",
  ELIGIBLE: "Signature en attente",
  MANDAT_SIGNE: "Mandat signé",
  LRAR_ENVOYEE: "Mise en demeure envoyée",
  RELANCE_1: "Relance envoyée (1)",
  RELANCE_2: "Relance envoyée (2)",
  MEDIATEUR: "Médiateur saisi",
  CESSION_ACTIVEE: "Cession activée (J+60)",
  CONTENTIEUX: "Tribunal saisi",
  PAYE: "Virement effectué",
  NON_ELIGIBLE: "Non éligible",
  REFUSE_DEFINITIF: "Refusé définitif",
  ABANDON: "Abandon",
  LEAD_FROID: "Lead froid",
  LITIGE_CLIENT: "Litige client",
  PRESCRIT: "Prescrit",
};

/** Ordre pour listes déroulantes (parcours playbook puis statuts de clôture). */
export const STATUT_ORDER: string[] = [
  "BROUILLON",
  "ELIGIBLE",
  "MANDAT_SIGNE",
  "LRAR_ENVOYEE",
  "RELANCE_1",
  "RELANCE_2",
  "MEDIATEUR",
  "CESSION_ACTIVEE",
  "CONTENTIEUX",
  "PAYE",
  "NON_ELIGIBLE",
  "REFUSE_DEFINITIF",
  "ABANDON",
  "LEAD_FROID",
  "LITIGE_CLIENT",
  "PRESCRIT",
];

/** Statuts considérés comme "dossier clôturé" (hors en cours). */
export const STATUTS_CLOTURE: string[] = [
  "PAYE",
  "REFUSE_DEFINITIF",
  "ABANDON",
  "PRESCRIT",
  "NON_ELIGIBLE",
  "LEAD_FROID",
  "LITIGE_CLIENT",
];

export function isEnCours(statut: string): boolean {
  return !STATUTS_CLOTURE.includes(statut);
}

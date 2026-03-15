/**
 * Premier message de confirmation — envoyé au client après enregistrement du dossier.
 * Ton chaleureux, récap visuel, montant net estimé pour l’enthousiasme.
 */

export const CONFIRMATION_DOSSIER_SUBJECT = "Votre dossier d'indemnisation est enregistré — Robin des Airs";

export type ConfirmationDossierVars = {
  prenom: string;
  vol: string;       // ex: "AF718 · CDG → DSS"
  date: string;      // ex: "15 mars 2026"
  nbPassagers: number;
  nomsPassagers: string;  // ex: "BAL OKOK" ou "Dupont, Martin"
  pnr: string;
  lienMandat: string;
  montantNetEstime: number;  // ex: 900
};

export function getConfirmationDossierBody(v: ConfirmationDossierVars): string {
  const passagersLabel = v.nbPassagers === 1 ? "1 passager" : `${v.nbPassagers} passagers`;
  return `Bonjour ${v.prenom},

C'est parti ! Votre dossier d'indemnisation est bien enregistré. On s'occupe de tout à partir de maintenant.

Votre vol :
✈️ ${v.vol}
📅 ${v.date}
👥 ${passagersLabel} (${v.nomsPassagers})
🔖 PNR : ${v.pnr}

Ce qui se passe maintenant :
Sous 24h, nous envoyons une mise en demeure officielle à la compagnie. Vous n'avez rien à faire — on gère de A à Z. Vous recevrez une notification à chaque étape.

Votre mandat de représentation :
Consultable et signable ici → ${v.lienMandat}

Rappel — notre engagement :
✅ Commission 25% — c'est tout. Même en cas de procès.
✅ 0€ si on ne gagne pas.
✅ Votre montant net estimé : ${v.montantNetEstime}€

Une question ? Répondez directement à cet email ou écrivez-nous sur WhatsApp — on répond en moins de 2h.

À très vite avec de bonnes nouvelles,

L'équipe Robin des Airs 🏹
66 avenue des Champs-Élysées, 75008 Paris
💬 WhatsApp : +33 7 56 86 36 30`;
}

/** Exemple (Aminata, 2 pax, 900€ net) — référence du premier message */
export const CONFIRMATION_DOSSIER_EXAMPLE: ConfirmationDossierVars = {
  prenom: "Aminata",
  vol: "AF718 · CDG → DSS",
  date: "[date]",
  nbPassagers: 2,
  nomsPassagers: "BAL OKOK",
  pnr: "ADJHG",
  lienMandat: "[lien]",
  montantNetEstime: 900, // 2 × 600€ × 75%
};

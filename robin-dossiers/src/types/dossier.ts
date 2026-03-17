/**
 * Schéma v2.0 — Structure universelle dossier indemnisation Robin des Airs
 */

export type StatutDossier =
  | "BROUILLON"
  | "ELIGIBLE"
  | "NON_ELIGIBLE"
  | "MANDAT_SIGNE"
  | "LRAR_ENVOYEE"
  | "RELANCE_1"
  | "RELANCE_2"
  | "MEDIATEUR"
  | "CESSION_ACTIVEE"
  | "CONTENTIEUX"
  | "PAYE"
  | "REFUSE_DEFINITIF"
  | "ABANDON"
  | "LEAD_FROID"
  | "LITIGE_CLIENT"
  | "PRESCRIT";

export type Priorite = "BASSE" | "STANDARD" | "HAUTE" | "URGENTE";

export type LangueClient = "fr" | "wo" | "bm" | "ln" | "ff" | "snk" | "en";

export type TypePieceIdentite = "PASSEPORT" | "CNI";

export type TypeTrajet = "DIRECT" | "CORRESPONDANCE";

export type TypeIncident =
  | "RETARD"
  | "ANNULATION"
  | "CORRESPONDANCE_MANQUEE"
  | "REFUS_EMBARQUEMENT";

export type RaisonCategorie =
  | "METEO"
  | "PANNE_TECHNIQUE"
  | "GREVE_INTERNE"
  | "GREVE_EXTERNE"
  | "SECURITE"
  | "AUCUNE"
  | "INCONNUE";

export type PalierCE261 = 250 | 400 | 600;

export type TypeEnvoi = "EMAIL" | "LRAR_PAPIER" | "LRE" | "WHATSAPP_FORMEL";

export type TypeReponse =
  | "PAIEMENT"
  | "REFUS_MOTIVE"
  | "REFUS_SANS_MOTIF"
  | "OFFRE_VOUCHER"
  | "SILENCE";

export type StatutResultat =
  | "EN_COURS"
  | "PAYE"
  | "REFUSE"
  | "ABANDONNE"
  | "PRESCRIT";

export interface DocumentsPassager {
  boarding_pass: string | null;
  eticket: string | null;
  piece_identite: string | null;
}

export interface Passager {
  rang: number;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  type_piece_identite: TypePieceIdentite;
  numero_piece_identite: string;
  iban: string;
  mandat_signe: boolean;
  url_mandat_pdf: string | null;
  date_signature_mandat: string | null;
  documents: DocumentsPassager;
}

export interface Troncon {
  ordre: number;
  compagnie_operante: string;
  code_iata_compagnie_operante: string;
  compagnie_emettrice_billet: string | null;
  numero_vol: string;
  date_vol: string;
  heure_depart_prevue: string;
  heure_arrivee_prevue: string;
  heure_arrivee_reelle: string | null;
  aeroport_depart: string;
  aeroport_arrivee: string;
  duree_retard_minutes: number | null;
  troncon_determinant_ce261: boolean;
}

export interface IncidentVol {
  type: TypeIncident;
  raison_officielle_compagnie: string | null;
  raison_categorie: RaisonCategorie;
  circonstance_extraordinaire_invoquee: boolean;
}

export interface PreuvesMeteorologiques {
  metar_depart: string | null;
  taf_depart: string | null;
  metar_arrivee: string | null;
  taf_arrivee: string | null;
  autres_vols_meme_creneau: boolean | null;
}

export interface Vol {
  pnr: string;
  type_trajet: TypeTrajet;
  troncons: Troncon[];
  incident: IncidentVol;
  preuves_meteorologiques: PreuvesMeteorologiques;
}

export interface FraisRecouvrement40e {
  applicable: boolean;
  montant: number;
}

export interface InteretsLegaux {
  taux_annuel: number;
  date_debut_calcul: string;
  jours_ecoules: number;
  montant_cumule: number;
}

export interface CalculsFinanciers {
  distance_km: number;
  palier_ce261: PalierCE261;
  nombre_passagers: number;
  indemnite_brute_totale: number;
  frais_recouvrement_40e: FraisRecouvrement40e;
  interets_legaux: InteretsLegaux;
  total_reclame_compagnie: number;
  commission_robin_pourcentage: number;
  commission_robin_montant: number;
  montant_net_client: number;
  montant_net_client_par_passager: number;
}

export interface Envoi {
  type: TypeEnvoi;
  numero: number;
  date_envoi: string;
  identifiant_suivi: string | null;
  date_reception_confirmee: string | null;
  url_preuve: string | null;
}

export interface Delais {
  date_limite_paiement_15j: string;
  date_debut_interets_j16: string;
  date_prescription: string;
}

export interface ReponseCompagnie {
  recue: boolean;
  date: string | null;
  type_reponse: TypeReponse | null;
  montant_propose: number | null;
  voucher_propose: boolean;
  motif_refus: string | null;
}

export interface Escalade {
  mediateur_saisi: boolean;
  date_saisine_mediateur: string | null;
  contentieux_ouvert: boolean;
  date_ouverture_contentieux: string | null;
  tribunal_competent: string | null;
}

export interface HistoriqueEvenement {
  date: string;
  action: string;
  auteur: string;
  commentaire: string | null;
}

export interface SuiviJuridique {
  envois: Envoi[];
  delais: Delais;
  reponse_compagnie: ReponseCompagnie;
  escalade: Escalade;
  historique_evenements: HistoriqueEvenement[];
}

export interface ResultatFinal {
  statut: StatutResultat | null;
  date_encaissement: string | null;
  montant_encaisse: number | null;
  date_reversement_client: string | null;
  montant_reverse_client: number | null;
  preuve_virement_client: string | null;
  satisfaction_client: number | null;
}

export interface DossierSchema {
  dossier: {
    id_interne: string;
    statut: StatutDossier;
    motif_non_eligibilite: string | null;
    priorite: Priorite;
    date_creation: string;
    date_derniere_action: string;
    source_acquisition: string;
    agent_responsable: string;
    langue_client: LangueClient;
  };
  passagers: Passager[];
  vol: Vol;
  calculs_financiers: CalculsFinanciers;
  suivi_juridique: SuiviJuridique;
  resultat_final: ResultatFinal;
}

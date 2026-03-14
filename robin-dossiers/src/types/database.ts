import type {
  DossierSchema,
  Passager,
  Vol,
  CalculsFinanciers,
  SuiviJuridique,
  ResultatFinal,
} from "./dossier";

export type DossierRow = {
  id: string;
  id_interne: string;
  statut: DossierSchema["dossier"]["statut"];
  motif_non_eligibilite: string | null;
  priorite: DossierSchema["dossier"]["priorite"];
  date_creation: string;
  date_derniere_action: string;
  source_acquisition: string;
  agent_responsable: string;
  langue_client: DossierSchema["dossier"]["langue_client"];
  passagers: Passager[];
  vol: Vol;
  calculs_financiers: CalculsFinanciers;
  suivi_juridique: SuiviJuridique;
  resultat_final: ResultatFinal;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      dossiers: {
        Row: DossierRow;
        Insert: Omit<DossierRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<DossierRow, "id" | "created_at" | "updated_at">
        > & {
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

-- Robin des Airs — Schéma normalisé (dossiers, passagers, vols, evenements, calculs)
-- Aligné sur schema-dossier-indemnisation.json v2.0
-- Compatible avec une base vierge ou après l’ancienne migration (enums dossiers déjà créés).

-- ========== ENUMS (création conditionnelle si déjà présents) ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_dossier') THEN
    CREATE TYPE statut_dossier AS ENUM (
      'BROUILLON', 'ELIGIBLE', 'NON_ELIGIBLE', 'MANDAT_SIGNE',
      'LRAR_ENVOYEE', 'RELANCE_1', 'RELANCE_2', 'MEDIATEUR',
      'CONTENTIEUX', 'PAYE', 'REFUSE_DEFINITIF', 'ABANDON', 'PRESCRIT'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priorite_dossier') THEN
    CREATE TYPE priorite_dossier AS ENUM ('BASSE', 'STANDARD', 'HAUTE', 'URGENTE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'langue_client') THEN
    CREATE TYPE langue_client AS ENUM ('fr', 'wo', 'bm', 'ln', 'ff', 'snk', 'en');
  END IF;
END $$;

CREATE TYPE type_piece_identite AS ENUM ('PASSEPORT', 'CNI');

CREATE TYPE type_trajet AS ENUM ('DIRECT', 'CORRESPONDANCE');

CREATE TYPE type_incident AS ENUM (
  'RETARD', 'ANNULATION', 'CORRESPONDANCE_MANQUEE', 'REFUS_EMBARQUEMENT'
);

CREATE TYPE raison_categorie AS ENUM (
  'METEO', 'PANNE_TECHNIQUE', 'GREVE_INTERNE', 'GREVE_EXTERNE',
  'SECURITE', 'AUCUNE', 'INCONNUE'
);

CREATE TYPE type_envoi AS ENUM ('EMAIL', 'LRAR_PAPIER', 'LRE', 'WHATSAPP_FORMEL');

CREATE TYPE type_reponse AS ENUM (
  'PAIEMENT', 'REFUS_MOTIVE', 'REFUS_SANS_MOTIF', 'OFFRE_VOUCHER', 'SILENCE'
);

CREATE TYPE statut_resultat AS ENUM ('EN_COURS', 'PAYE', 'REFUSE', 'ABANDONNE', 'PRESCRIT');

-- Palier CE261 : 250, 400, 600 (euros)
CREATE TYPE palier_ce261 AS ENUM ('250', '400', '600');

-- ========== TABLE DOSSIERS ==========
CREATE TABLE dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_interne TEXT UNIQUE NOT NULL,
  statut statut_dossier NOT NULL DEFAULT 'BROUILLON',
  motif_non_eligibilite TEXT,
  priorite priorite_dossier NOT NULL DEFAULT 'STANDARD',
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_derniere_action TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_acquisition TEXT NOT NULL DEFAULT 'site_direct',
  agent_responsable TEXT NOT NULL DEFAULT '',
  langue_client langue_client NOT NULL DEFAULT 'fr',
  -- Résultat final (synthèse) : optionnel, peut rester en colonnes
  resultat_statut statut_resultat,
  resultat_date_encaissement TIMESTAMPTZ,
  resultat_montant_encaisse NUMERIC(12, 2),
  resultat_date_reversement_client TIMESTAMPTZ,
  resultat_montant_reverse_client NUMERIC(12, 2),
  resultat_preuve_virement_client TEXT,
  resultat_satisfaction_client SMALLINT CHECK (resultat_satisfaction_client IS NULL OR (resultat_satisfaction_client >= 1 AND resultat_satisfaction_client <= 5)),
  -- Suivi juridique résumé (détails en table dédiée si besoin)
  suivi_envois JSONB NOT NULL DEFAULT '[]'::jsonb,
  suivi_delais JSONB NOT NULL DEFAULT '{}'::jsonb,
  suivi_reponse_compagnie JSONB NOT NULL DEFAULT '{}'::jsonb,
  suivi_escalade JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dossiers IS 'Dossiers indemnisation — entête et suivi/résultat (passagers, vol, calculs en tables liées)';

-- ========== TABLE PASSAGERS ==========
CREATE TABLE passagers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  rang SMALLINT NOT NULL,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  type_piece_identite type_piece_identite NOT NULL,
  numero_piece_identite TEXT NOT NULL,
  iban TEXT,
  mandat_signe BOOLEAN NOT NULL DEFAULT false,
  url_mandat_pdf TEXT,
  date_signature_mandat TIMESTAMPTZ,
  documents JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dossier_id, rang)
);

COMMENT ON TABLE passagers IS 'Passagers par dossier (documents = boarding_pass, eticket, piece_identite)';
COMMENT ON COLUMN passagers.documents IS 'JSON: { boarding_pass?, eticket?, piece_identite? }';

CREATE INDEX idx_passagers_dossier_id ON passagers(dossier_id);

-- ========== TABLE VOLS ==========
CREATE TABLE vols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL UNIQUE REFERENCES dossiers(id) ON DELETE CASCADE,
  pnr TEXT NOT NULL,
  type_trajet type_trajet NOT NULL,
  troncons JSONB NOT NULL DEFAULT '[]'::jsonb,
  incident JSONB NOT NULL DEFAULT '{}'::jsonb,
  preuves_meteorologiques JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE vols IS 'Un vol par dossier (troncons, incident, preuves_meteo en JSONB)';
COMMENT ON COLUMN vols.troncons IS 'Array: ordre, compagnie_operante, code_iata_operante, numero_vol, date_vol, heures, aeroports, duree_retard_minutes, troncon_determinant_ce261';
COMMENT ON COLUMN vols.incident IS 'Object: type, raison_officielle_compagnie, raison_categorie, circonstance_extraordinaire_invoquee';
COMMENT ON COLUMN vols.preuves_meteorologiques IS 'Object: metar_depart, taf_depart, metar_arrivee, taf_arrivee, autres_vols_meme_creneau';

CREATE UNIQUE INDEX idx_vols_dossier_id ON vols(dossier_id);
CREATE INDEX idx_vols_pnr ON vols(pnr);

-- ========== TABLE EVENEMENTS ==========
CREATE TABLE evenements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  date_evenement TIMESTAMPTZ NOT NULL,
  action TEXT NOT NULL,
  auteur TEXT NOT NULL,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE evenements IS 'Historique des événements par dossier (suivi juridique)';

CREATE INDEX idx_evenements_dossier_id ON evenements(dossier_id);
CREATE INDEX idx_evenements_date ON evenements(date_evenement DESC);

-- ========== TABLE CALCULS ==========
CREATE TABLE calculs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL UNIQUE REFERENCES dossiers(id) ON DELETE CASCADE,
  distance_km INTEGER NOT NULL,
  palier_ce261 palier_ce261 NOT NULL,
  nombre_passagers SMALLINT NOT NULL,
  indemnite_brute_totale NUMERIC(12, 2) NOT NULL,
  frais_recouvrement_applicable BOOLEAN NOT NULL DEFAULT true,
  frais_recouvrement_montant NUMERIC(8, 2) NOT NULL DEFAULT 40,
  interets_taux_annuel NUMERIC(6, 4),
  interets_date_debut_calcul TIMESTAMPTZ,
  interets_jours_ecoules INTEGER,
  interets_montant_cumule NUMERIC(12, 2),
  total_reclame_compagnie NUMERIC(12, 2) NOT NULL,
  commission_robin_pourcentage NUMERIC(5, 2) NOT NULL,
  commission_robin_montant NUMERIC(12, 2) NOT NULL,
  montant_net_client NUMERIC(12, 2) NOT NULL,
  montant_net_client_par_passager NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE calculs IS 'Calculs financiers par dossier (1 ligne par dossier)';

CREATE UNIQUE INDEX idx_calculs_dossier_id ON calculs(dossier_id);

-- ========== TRIGGERS updated_at ==========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dossiers_updated_at
  BEFORE UPDATE ON dossiers FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER passagers_updated_at
  BEFORE UPDATE ON passagers FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER vols_updated_at
  BEFORE UPDATE ON vols FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER calculs_updated_at
  BEFORE UPDATE ON calculs FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ========== RLS ==========
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE passagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vols ENABLE ROW LEVEL SECURITY;
ALTER TABLE evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all dossiers" ON dossiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all passagers" ON passagers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all vols" ON vols FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all evenements" ON evenements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all calculs" ON calculs FOR ALL USING (true) WITH CHECK (true);

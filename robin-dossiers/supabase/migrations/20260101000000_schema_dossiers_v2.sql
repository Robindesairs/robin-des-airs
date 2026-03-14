-- Robin des Airs — Schéma dossiers indemnisation v2.0
-- À exécuter dans l’éditeur SQL Supabase (ou via supabase db push)

-- Enum types (PostgreSQL)
CREATE TYPE statut_dossier AS ENUM (
  'BROUILLON', 'ELIGIBLE', 'NON_ELIGIBLE', 'MANDAT_SIGNE',
  'LRAR_ENVOYEE', 'RELANCE_1', 'RELANCE_2', 'MEDIATEUR',
  'CONTENTIEUX', 'PAYE', 'REFUSE_DEFINITIF', 'ABANDON', 'PRESCRIT'
);

CREATE TYPE priorite_dossier AS ENUM ('BASSE', 'STANDARD', 'HAUTE', 'URGENTE');

CREATE TYPE langue_client AS ENUM ('fr', 'wo', 'bm', 'ln', 'ff', 'snk', 'en');

-- Table principale : un dossier = une ligne, sous-objets en JSONB
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
  -- Schéma v2.0 : passagers, vol, calculs, suivi, resultat en JSONB
  passagers JSONB NOT NULL DEFAULT '[]'::jsonb,
  vol JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculs_financiers JSONB NOT NULL DEFAULT '{}'::jsonb,
  suivi_juridique JSONB NOT NULL DEFAULT '{}'::jsonb,
  resultat_final JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherches courantes
CREATE INDEX idx_dossiers_statut ON dossiers(statut);
CREATE INDEX idx_dossiers_id_interne ON dossiers(id_interne);
CREATE INDEX idx_dossiers_date_creation ON dossiers(date_creation DESC);
CREATE INDEX idx_dossiers_vol_pnr ON dossiers USING gin ((vol->'pnr'));

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dossiers_updated_at
  BEFORE UPDATE ON dossiers
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- RLS (Row Level Security) : activer et politique basique
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;

-- Politique : lecture/écriture pour les utilisateurs authentifiés (à adapter selon ton auth)
-- Pour l’instant : tout autoriser pour anon (à restreindre en prod)
CREATE POLICY "Allow all for anon" ON dossiers
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE dossiers IS 'Dossiers indemnisation Robin des Airs — schéma v2.0';

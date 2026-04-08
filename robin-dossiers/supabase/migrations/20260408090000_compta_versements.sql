-- Module comptabilité: ventilation et suivi des versements

CREATE TABLE IF NOT EXISTS compta_versements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  beneficiaire_type TEXT NOT NULL CHECK (beneficiaire_type IN ('client', 'partenaire')),
  beneficiaire_nom TEXT,
  montant NUMERIC NOT NULL DEFAULT 0,
  devise TEXT NOT NULL DEFAULT 'EUR',
  statut TEXT NOT NULL DEFAULT 'A_PAYER' CHECK (statut IN ('A_PAYER', 'PLANIFIE', 'PAYE', 'ANNULE')),
  mode_paiement TEXT,
  reference_paiement TEXT,
  date_prevue DATE,
  date_paiement DATE,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_compta_versements_unique_dossier_beneficiaire
  ON compta_versements(dossier_id, beneficiaire_type);

CREATE INDEX IF NOT EXISTS idx_compta_versements_dossier_id
  ON compta_versements(dossier_id);

CREATE INDEX IF NOT EXISTS idx_compta_versements_statut
  ON compta_versements(statut);

ALTER TABLE compta_versements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all compta_versements"
  ON compta_versements
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_compta_versements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_compta_versements_updated_at ON compta_versements;
CREATE TRIGGER trg_set_compta_versements_updated_at
BEFORE UPDATE ON compta_versements
FOR EACH ROW
EXECUTE FUNCTION set_compta_versements_updated_at();

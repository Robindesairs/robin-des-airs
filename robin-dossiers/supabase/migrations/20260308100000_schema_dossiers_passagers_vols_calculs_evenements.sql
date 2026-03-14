-- Schéma Robin des Airs — dossiers, passagers, vols, calculs, evenements

-- Table principale
CREATE TABLE dossiers (
  id TEXT PRIMARY KEY,
  statut TEXT NOT NULL DEFAULT 'BROUILLON',
  priorite TEXT DEFAULT 'STANDARD',
  date_creation DATE DEFAULT now(),
  date_paiement DATE,
  source TEXT,
  lrar_reception DATE,
  agent TEXT,
  langue TEXT DEFAULT 'fr'
);

-- Passagers (plusieurs par dossier)
CREATE TABLE passagers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id TEXT REFERENCES dossiers(id) ON DELETE CASCADE,
  rang INTEGER DEFAULT 1,
  prenom TEXT,
  nom TEXT,
  email TEXT,
  indicatif TEXT,
  telephone TEXT,
  type_piece TEXT,
  numero_piece TEXT,
  iban TEXT,
  est_bebe BOOLEAN DEFAULT false,
  mandat_signe BOOLEAN DEFAULT false,
  url_mandat TEXT,
  date_signature DATE
);

CREATE INDEX idx_passagers_dossier_id ON passagers(dossier_id);

-- Vols (plusieurs par dossier — correspondances)
CREATE TABLE vols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id TEXT REFERENCES dossiers(id) ON DELETE CASCADE,
  ordre INTEGER DEFAULT 1,
  compagnie TEXT,
  code_iata TEXT,
  numero_vol TEXT,
  date_vol DATE,
  dep TEXT,
  arr TEXT,
  pnr TEXT,
  incident TEXT,
  retard_minutes INTEGER,
  determinant_ce261 BOOLEAN DEFAULT false
);

CREATE INDEX idx_vols_dossier_id ON vols(dossier_id);

-- Calculs financiers
CREATE TABLE calculs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id TEXT REFERENCES dossiers(id) ON DELETE CASCADE,
  palier INTEGER,
  nb_passagers_indemnises INTEGER,
  indemnite_brute NUMERIC,
  commission_robin NUMERIC,
  net_client NUMERIC,
  interets_cumules NUMERIC DEFAULT 0,
  frais_recouvrement NUMERIC DEFAULT 40,
  total_reclame NUMERIC
);

CREATE INDEX idx_calculs_dossier_id ON calculs(dossier_id);

-- Historique événements
CREATE TABLE evenements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id TEXT REFERENCES dossiers(id) ON DELETE CASCADE,
  date TIMESTAMPTZ DEFAULT now(),
  action TEXT,
  auteur TEXT,
  commentaire TEXT
);

CREATE INDEX idx_evenements_dossier_id ON evenements(dossier_id);

-- RLS (optionnel)
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE passagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vols ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evenements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all dossiers" ON dossiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all passagers" ON passagers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all vols" ON vols FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all calculs" ON calculs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all evenements" ON evenements FOR ALL USING (true) WITH CHECK (true);

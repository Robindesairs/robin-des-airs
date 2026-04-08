ALTER TABLE compta_versements
ADD COLUMN IF NOT EXISTS banque_nom TEXT;

ALTER TABLE compta_versements
ADD COLUMN IF NOT EXISTS banque_detectee_auto BOOLEAN DEFAULT false;

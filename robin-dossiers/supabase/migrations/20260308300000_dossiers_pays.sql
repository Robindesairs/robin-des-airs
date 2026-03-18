-- Pays / origine client (diaspora) pour le CRM
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS pays TEXT;
COMMENT ON COLUMN dossiers.pays IS 'Pays d''origine / diaspora (ex. Sénégal, Mali, Côte d''Ivoire)';

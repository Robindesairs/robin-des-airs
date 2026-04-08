-- Seed massif: 50 dossiers fictifs avec ventilation comptable
-- A executer dans Supabase SQL Editor

BEGIN;

WITH seed AS (
  SELECT
    gs AS i,
    ('RDA-2026-' || LPAD((950 + gs)::text, 3, '0'))::text AS dossier_id,
    CASE (gs % 6)
      WHEN 0 THEN 'PAYE'
      WHEN 1 THEN 'ELIGIBLE'
      WHEN 2 THEN 'MANDAT_SIGNE'
      WHEN 3 THEN 'EN_NEGOCIATION'
      WHEN 4 THEN 'MISE_EN_DEMEURE'
      ELSE 'A_RELANCER'
    END::text AS statut,
    CASE WHEN gs % 5 = 0 THEN 'HAUTE' ELSE 'STANDARD' END::text AS priorite,
    CASE (gs % 4)
      WHEN 0 THEN 'partenariat_agence'
      WHEN 1 THEN 'parrainage_particulier'
      WHEN 2 THEN 'whatsapp'
      ELSE 'organic_site'
    END::text AS source,
    CASE WHEN gs % 3 = 0 THEN 600 WHEN gs % 3 = 1 THEN 400 ELSE 250 END::int AS palier,
    CASE WHEN gs % 7 = 0 THEN 2 ELSE 1 END::int AS nb_pax
  FROM generate_series(1, 50) gs
)
INSERT INTO dossiers (id, statut, priorite, date_creation, source, agent, langue, pays)
SELECT
  s.dossier_id,
  s.statut,
  s.priorite,
  (now()::date - (s.i * 2)),
  s.source,
  'agent_seed',
  'fr',
  (ARRAY['Sénégal','Mali','Côte d''Ivoire','Guinée','Cameroun','RDC'])[(s.i % 6) + 1]
FROM seed s
ON CONFLICT (id) DO UPDATE
SET statut = EXCLUDED.statut,
    priorite = EXCLUDED.priorite,
    source = EXCLUDED.source;

WITH seed AS (
  SELECT
    gs AS i,
    ('RDA-2026-' || LPAD((950 + gs)::text, 3, '0'))::text AS dossier_id
  FROM generate_series(1, 50) gs
)
INSERT INTO passagers (dossier_id, rang, prenom, nom, email, indicatif, telephone, est_bebe)
SELECT
  s.dossier_id,
  1,
  'Client' || s.i,
  'Demo' || s.i,
  'client' || s.i || '@example.com',
  '+33',
  '600000' || LPAD(s.i::text, 3, '0'),
  false
FROM seed s
ON CONFLICT DO NOTHING;

WITH seed AS (
  SELECT
    gs AS i,
    ('RDA-2026-' || LPAD((950 + gs)::text, 3, '0'))::text AS dossier_id
  FROM generate_series(1, 50) gs
)
INSERT INTO vols (dossier_id, ordre, compagnie, numero_vol, date_vol, dep, arr, pnr, incident, determinant_ce261)
SELECT
  s.dossier_id,
  1,
  (ARRAY['Air France','Royal Air Maroc','Corsair','Transavia'])[(s.i % 4) + 1],
  (ARRAY['AF','AT','SS','TO'])[(s.i % 4) + 1] || (700 + s.i)::text,
  now()::date - (s.i * 3),
  (ARRAY['CDG','ORY','CMN','ABJ'])[(s.i % 4) + 1],
  (ARRAY['DSS','BKO','DLA','FIH'])[(s.i % 4) + 1],
  'PNR' || LPAD(s.i::text, 3, '0'),
  (ARRAY['RETARD','ANNULATION','CORRESPONDANCE_MANQUEE'])[(s.i % 3) + 1],
  true
FROM seed s
ON CONFLICT DO NOTHING;

WITH seed AS (
  SELECT
    gs AS i,
    ('RDA-2026-' || LPAD((950 + gs)::text, 3, '0'))::text AS dossier_id,
    CASE WHEN gs % 3 = 0 THEN 600 WHEN gs % 3 = 1 THEN 400 ELSE 250 END::int AS palier,
    CASE WHEN gs % 7 = 0 THEN 2 ELSE 1 END::int AS nb_pax
  FROM generate_series(1, 50) gs
)
INSERT INTO calculs (dossier_id, palier, nb_passagers_indemnises, indemnite_brute, commission_robin, net_client, interets_cumules, frais_recouvrement, total_reclame)
SELECT
  s.dossier_id,
  s.palier,
  s.nb_pax,
  s.palier * s.nb_pax,
  ROUND((s.palier * s.nb_pax * 0.25)::numeric, 2),
  ROUND((s.palier * s.nb_pax * 0.75)::numeric, 2),
  0,
  40,
  (s.palier * s.nb_pax) + 40
FROM seed s
ON CONFLICT DO NOTHING;

WITH seed AS (
  SELECT
    gs AS i,
    ('RDA-2026-' || LPAD((950 + gs)::text, 3, '0'))::text AS dossier_id
  FROM generate_series(1, 50) gs
)
INSERT INTO evenements (dossier_id, action, auteur, commentaire)
SELECT
  s.dossier_id,
  'Dossier fictif massif créé',
  'seed_sql_50',
  'Données de démonstration'
FROM seed s
ON CONFLICT DO NOTHING;

WITH seed AS (
  SELECT
    gs AS i,
    ('RDA-2026-' || LPAD((950 + gs)::text, 3, '0'))::text AS dossier_id,
    CASE (gs % 4)
      WHEN 0 THEN 'partenariat_agence'
      WHEN 1 THEN 'parrainage_particulier'
      WHEN 2 THEN 'whatsapp'
      ELSE 'organic_site'
    END::text AS source,
    CASE WHEN gs % 3 = 0 THEN 600 WHEN gs % 3 = 1 THEN 400 ELSE 250 END::int AS palier,
    CASE WHEN gs % 7 = 0 THEN 2 ELSE 1 END::int AS nb_pax,
    CASE (gs % 6)
      WHEN 0 THEN 'PAYE'
      WHEN 1 THEN 'A_PAYER'
      WHEN 2 THEN 'PLANIFIE'
      WHEN 3 THEN 'A_PAYER'
      WHEN 4 THEN 'PLANIFIE'
      ELSE 'A_PAYER'
    END::text AS statut_client
  FROM generate_series(1, 50) gs
),
calc AS (
  SELECT
    s.*,
    ROUND((s.palier * s.nb_pax * 0.75)::numeric, 2) AS net_client,
    CASE
      WHEN s.source = 'partenariat_agence' THEN 45
      WHEN s.source = 'parrainage_particulier' THEN 20
      ELSE 0
    END::numeric AS commission_partenaire
  FROM seed s
)
INSERT INTO compta_versements (dossier_id, beneficiaire_type, beneficiaire_nom, montant, statut, date_prevue, date_paiement, commentaire)
SELECT
  c.dossier_id,
  'client',
  'Client dossier ' || c.i,
  c.net_client,
  c.statut_client,
  now()::date + (c.i % 10),
  CASE WHEN c.statut_client = 'PAYE' THEN now()::date - (c.i % 8) ELSE NULL END,
  'Seed massif client'
FROM calc c
ON CONFLICT (dossier_id, beneficiaire_type) DO UPDATE
SET montant = EXCLUDED.montant,
    statut = EXCLUDED.statut,
    date_prevue = EXCLUDED.date_prevue,
    date_paiement = EXCLUDED.date_paiement,
    commentaire = EXCLUDED.commentaire;

WITH seed AS (
  SELECT
    gs AS i,
    ('RDA-2026-' || LPAD((950 + gs)::text, 3, '0'))::text AS dossier_id,
    CASE (gs % 4)
      WHEN 0 THEN 'partenariat_agence'
      WHEN 1 THEN 'parrainage_particulier'
      WHEN 2 THEN 'whatsapp'
      ELSE 'organic_site'
    END::text AS source
  FROM generate_series(1, 50) gs
)
INSERT INTO compta_versements (dossier_id, beneficiaire_type, beneficiaire_nom, montant, statut, date_prevue, date_paiement, commentaire)
SELECT
  s.dossier_id,
  'partenaire',
  CASE
    WHEN s.source = 'partenariat_agence' THEN 'Partenariat agence'
    WHEN s.source = 'parrainage_particulier' THEN 'Parrainage particulier'
    ELSE 'Aucun partenaire'
  END,
  CASE
    WHEN s.source = 'partenariat_agence' THEN 45
    WHEN s.source = 'parrainage_particulier' THEN 20
    ELSE 0
  END,
  CASE
    WHEN s.source IN ('partenariat_agence', 'parrainage_particulier') THEN 'A_PAYER'
    ELSE 'ANNULE'
  END,
  now()::date + (s.i % 12),
  NULL,
  'Seed massif partenaire'
FROM seed s
ON CONFLICT (dossier_id, beneficiaire_type) DO UPDATE
SET montant = EXCLUDED.montant,
    statut = EXCLUDED.statut,
    date_prevue = EXCLUDED.date_prevue,
    commentaire = EXCLUDED.commentaire;

COMMIT;

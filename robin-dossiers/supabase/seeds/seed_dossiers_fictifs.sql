-- Seed dossiers fictifs (CRM + compta)
-- A executer dans Supabase SQL Editor

BEGIN;

-- 1) RDA-2026-901 : Partenariat agence (45 EUR)
INSERT INTO dossiers (id, statut, priorite, date_creation, source, agent, langue, pays)
VALUES ('RDA-2026-901', 'ELIGIBLE', 'STANDARD', now()::date, 'partenariat_agence', 'agent_demo', 'fr', 'Sénégal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO passagers (dossier_id, rang, prenom, nom, email, indicatif, telephone, est_bebe)
VALUES ('RDA-2026-901', 1, 'Aminata', 'DIALLO', 'aminata.demo@example.com', '+221', '771112233', false)
ON CONFLICT DO NOTHING;

INSERT INTO vols (dossier_id, ordre, compagnie, numero_vol, date_vol, dep, arr, pnr, incident, determinant_ce261)
VALUES ('RDA-2026-901', 1, 'Air France', 'AF718', now()::date - 12, 'CDG', 'DSS', 'AB12CD', 'RETARD', true)
ON CONFLICT DO NOTHING;

INSERT INTO calculs (dossier_id, palier, nb_passagers_indemnises, indemnite_brute, commission_robin, net_client, interets_cumules, frais_recouvrement, total_reclame)
VALUES ('RDA-2026-901', 600, 1, 600, 150, 450, 0, 40, 640)
ON CONFLICT DO NOTHING;

INSERT INTO evenements (dossier_id, action, auteur, commentaire)
VALUES ('RDA-2026-901', 'Dossier fictif créé', 'seed_sql', 'Source: partenariat_agence')
ON CONFLICT DO NOTHING;

-- 2) RDA-2026-902 : Parrainage particulier (20 EUR)
INSERT INTO dossiers (id, statut, priorite, date_creation, source, agent, langue, pays)
VALUES ('RDA-2026-902', 'EN_NEGOCIATION', 'HAUTE', now()::date - 2, 'parrainage_particulier', 'agent_demo', 'fr', 'Mali')
ON CONFLICT (id) DO NOTHING;

INSERT INTO passagers (dossier_id, rang, prenom, nom, email, indicatif, telephone, est_bebe)
VALUES ('RDA-2026-902', 1, 'Moussa', 'TRAORE', 'moussa.demo@example.com', '+223', '70112233', false)
ON CONFLICT DO NOTHING;

INSERT INTO vols (dossier_id, ordre, compagnie, numero_vol, date_vol, dep, arr, pnr, incident, determinant_ce261)
VALUES ('RDA-2026-902', 1, 'Royal Air Maroc', 'AT771', now()::date - 20, 'CMN', 'CDG', 'EF34GH', 'ANNULATION', true)
ON CONFLICT DO NOTHING;

INSERT INTO calculs (dossier_id, palier, nb_passagers_indemnises, indemnite_brute, commission_robin, net_client, interets_cumules, frais_recouvrement, total_reclame)
VALUES ('RDA-2026-902', 400, 1, 400, 100, 300, 0, 40, 440)
ON CONFLICT DO NOTHING;

INSERT INTO evenements (dossier_id, action, auteur, commentaire)
VALUES ('RDA-2026-902', 'Dossier fictif créé', 'seed_sql', 'Source: parrainage_particulier')
ON CONFLICT DO NOTHING;

-- 3) RDA-2026-903 : Sans partenaire
INSERT INTO dossiers (id, statut, priorite, date_creation, source, agent, langue, pays)
VALUES ('RDA-2026-903', 'PAYE', 'STANDARD', now()::date - 30, 'whatsapp', 'agent_demo', 'fr', 'Côte d''Ivoire')
ON CONFLICT (id) DO NOTHING;

INSERT INTO passagers (dossier_id, rang, prenom, nom, email, indicatif, telephone, est_bebe)
VALUES ('RDA-2026-903', 1, 'Kouadio', 'KOFFI', 'kouadio.demo@example.com', '+225', '0700112233', false)
ON CONFLICT DO NOTHING;

INSERT INTO vols (dossier_id, ordre, compagnie, numero_vol, date_vol, dep, arr, pnr, incident, determinant_ce261)
VALUES ('RDA-2026-903', 1, 'Corsair', 'SS987', now()::date - 40, 'ABJ', 'ORY', 'IJ56KL', 'RETARD', true)
ON CONFLICT DO NOTHING;

INSERT INTO calculs (dossier_id, palier, nb_passagers_indemnises, indemnite_brute, commission_robin, net_client, interets_cumules, frais_recouvrement, total_reclame)
VALUES ('RDA-2026-903', 600, 1, 600, 150, 450, 0, 40, 640)
ON CONFLICT DO NOTHING;

INSERT INTO evenements (dossier_id, action, auteur, commentaire)
VALUES ('RDA-2026-903', 'Dossier fictif créé', 'seed_sql', 'Source: whatsapp')
ON CONFLICT DO NOTHING;

-- Versements comptables (si la table compta_versements est disponible)
INSERT INTO compta_versements (dossier_id, beneficiaire_type, beneficiaire_nom, montant, statut, date_prevue, commentaire)
VALUES
  ('RDA-2026-901', 'client', 'Aminata DIALLO', 450, 'A_PAYER', now()::date + 2, 'Seed client'),
  ('RDA-2026-901', 'partenaire', 'Partenariat agence', 45, 'A_PAYER', now()::date + 2, 'Seed partenaire'),
  ('RDA-2026-902', 'client', 'Moussa TRAORE', 300, 'PLANIFIE', now()::date + 5, 'Seed client'),
  ('RDA-2026-902', 'partenaire', 'Parrainage particulier', 20, 'A_PAYER', now()::date + 5, 'Seed partenaire'),
  ('RDA-2026-903', 'client', 'Kouadio KOFFI', 450, 'PAYE', now()::date - 10, 'Seed client'),
  ('RDA-2026-903', 'partenaire', 'Aucun partenaire', 0, 'ANNULE', now()::date - 10, 'Seed partenaire')
ON CONFLICT (dossier_id, beneficiaire_type) DO UPDATE
SET montant = EXCLUDED.montant,
    statut = EXCLUDED.statut,
    date_prevue = EXCLUDED.date_prevue,
    commentaire = EXCLUDED.commentaire;

COMMIT;

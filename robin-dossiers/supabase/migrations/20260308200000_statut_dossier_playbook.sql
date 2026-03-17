-- Ajout des statuts manquants pour alignement avec PLAYBOOK-OPERATIONNEL.md
-- (Nouveau lead → … → Cession activée (J+60) → Tribunal saisi → Virement effectué ; + Lead froid, Litige client)

ALTER TYPE statut_dossier ADD VALUE IF NOT EXISTS 'CESSION_ACTIVEE';
ALTER TYPE statut_dossier ADD VALUE IF NOT EXISTS 'LEAD_FROID';
ALTER TYPE statut_dossier ADD VALUE IF NOT EXISTS 'LITIGE_CLIENT';

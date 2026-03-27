# Pipeline CRM — Robin des Airs

## Objectif

Standardiser les statuts CRM pour piloter conversion, relance et traitement opérationnel.

## Statuts officiels (ordre)

1. `prospect_anonyme`
2. `prospect_wa_identifie`
3. `qualifie`
4. `dossier_en_cours`
5. `mandat_signe`
6. `envoye_compagnie`
7. `en_negociation`
8. `gagne`
9. `perdu`
10. `clos_paye_client`

## Définition par statut + critères d'entrée/sortie

### 1) prospect_anonyme

- Entrée: clic WhatsApp site (`event_type=whatsapp_click`)
- Données minimales: source, page, href, date
- Sortie vers `prospect_wa_identifie`: premier message WhatsApp entrant

### 2) prospect_wa_identifie

- Entrée: premier message WhatsApp (`event_type=whatsapp_message_in`)
- Données minimales: `from_phone` ou `wa_id`
- SLA: réponse humaine/automatique < 15 min
- Sortie vers `qualifie`: vol + date + motif connus

### 3) qualifie

- Entrée: dossier potentiellement éligible (infos minimales collectées)
- Données minimales: prénom, nom, vol, date, motif, canal
- Sortie vers `dossier_en_cours`: lien dépôt envoyé et démarré

### 4) dossier_en_cours

- Entrée: formulaire dépôt commencé
- Données minimales: identité + vol + contact
- Sortie vers `mandat_signe`: mandat signé + pièces reçues

### 5) mandat_signe

- Entrée: signature validée
- Données minimales: preuve signature, date signature
- Sortie vers `envoye_compagnie`: dossier juridiquement prêt et envoyé

### 6) envoye_compagnie

- Entrée: réclamation envoyée transporteur
- Données minimales: date envoi, canal, preuve envoi
- Sortie vers `en_negociation` ou `gagne` ou `perdu`

### 7) en_negociation

- Entrée: réponse compagnie en cours de traitement
- Données minimales: dernier échange, prochaine action, deadline
- Sortie vers `gagne` ou `perdu`

### 8) gagne

- Entrée: compagnie accepte/paye
- Données minimales: montant brut, commission, net client, date réception
- Sortie vers `clos_paye_client`: virement client effectué

### 9) perdu

- Entrée: refus définitif / non-éligible confirmé
- Données minimales: motif de clôture

### 10) clos_paye_client

- Entrée: paiement net client effectué
- Données minimales: preuve virement, date, montant

---

## SLA opérationnels

- 1re réponse WhatsApp: `< 15 min` en heures ouvrées
- Qualification: `< 24 h`
- Vérification dossier: `< 24 h`
- Envoi compagnie après dossier complet: `< 48 h`

## Champs minimums CRM

- `id`
- `statut`
- `lead_stage`
- `source`
- `from_phone`
- `wa_id`
- `prenom`
- `nom`
- `email`
- `vol`
- `date_vol`
- `motif`
- `updated_at`

## KPI pipeline

- Taux `prospect_anonyme` -> `prospect_wa_identifie`
- Taux `prospect_wa_identifie` -> `qualifie`
- Taux `qualifie` -> `dossier_en_cours`
- Taux `dossier_en_cours` -> `mandat_signe`
- Taux `mandat_signe` -> `gagne`
- Délai moyen par étape


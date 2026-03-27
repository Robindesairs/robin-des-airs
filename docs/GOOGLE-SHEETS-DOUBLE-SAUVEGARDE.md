# Double sauvegarde Google Sheets (anti-perte) — Robin des Airs

## But

Avoir une copie exploitable de tous les documents de pilotage dans Google Sheets.

## Fichiers a doubler dans Sheets

1. `docs/PILOTAGE-HEBDO.md`
2. `docs/PIPELINE-CRM.md`
3. `docs/PREVISIONNEL-CRM.md`
4. `docs/TRESORERIE-13-SEMAINES.md`
5. `docs/PnL-MENSUEL.md`
6. `docs/RGPD-REGISTRE-TRAITEMENTS.md`

---

## Classeur recommande

Nom du classeur: `Robin des Airs - Pilotage Master`

Creer les onglets suivants:

- `pilotage_hebdo`
- `pipeline_crm`
- `previsionnel_crm`
- `tresorerie_13_semaines`
- `pnl_mensuel`
- `rgpd_registre`
- `events_log` (si deja utilise pour WhatsApp/CRM)
- `prospects` (vue consolidee CRM)

---

## Colonnes par onglet (copier-coller)

### 1) Onglet `pilotage_hebdo`

`semaine_debut, semaine_fin, clics_whatsapp, prospect_anonyme, prospect_wa_identifie, taux_clic_to_message, dossiers_ouverts, dossiers_complets, dossiers_gagnes, ca_encaisse, commission_robin, reverse_clients, depenses_pub, marge_nette_estimee, first_response_minutes, dossiers_sans_reponse_24h, litiges, top_victoires, top_problemes, priorites_suivantes, created_at, updated_at`

### 2) Onglet `pipeline_crm`

`id, statut, lead_stage, source, from_phone, wa_id, prenom, nom, email, vol, date_vol, motif, owner, prochaine_action, date_prochaine_action, sla_target, updated_at`

### 3) Onglet `previsionnel_crm`

`periode, scenario, clics_whatsapp, taux_a_b, taux_b_c, taux_c_d, taux_d_e, prospect_identifies_prevus, dossiers_en_cours_prevus, mandats_signes_prevus, dossiers_gagnes_prevus, montant_brut_moyen, ca_brut_previsionnel, commission_robin_previsionnelle, net_clients_previsionnel, depenses_fixes, depenses_variables, marge_nette_estimee, updated_at`

### 4) Onglet `tresorerie_13_semaines`

`semaine, solde_debut, entrees_prevues, entrees_reelles, sorties_prevues, sorties_reelles, solde_fin_previsionnel, solde_fin_reel, alerte, commentaire, updated_at`

### 5) Onglet `pnl_mensuel`

`mois, ca_encaisse, remises_avoirs, ca_net, cout_direct_dossiers, depenses_pub, marge_brute, outils_saas, frais_juridiques_admin, prestataires, salaires_remunerations, charges_taxes, frais_bancaires, autres_charges, resultat_exploitation, exceptionnel, resultat_net, updated_at`

### 6) Onglet `rgpd_registre`

`traitement, finalite, base_legale, categories_donnees, source, destinataires, duree_conservation, sous_traitants, transfert_hors_ue, mesures_securite, responsable, date_maj`

---

## Routine anti-perte (obligatoire)

### Quotidien (5 min)

1. Verifier que les onglets `events_log` et `prospects` recoivent bien les nouvelles lignes.
2. Verifier que `updated_at` bouge sur les onglets actifs.

### Hebdomadaire (20 min)

1. Mettre a jour `pilotage_hebdo`.
2. Mettre a jour `previsionnel_crm`.
3. Mettre a jour `tresorerie_13_semaines`.
4. Verifier ecarts prevision vs reel.

### Mensuel (30 min)

1. Cloturer `pnl_mensuel`.
2. Revoir `rgpd_registre` (sous-traitants, retention, process).
3. Exporter tout le classeur en `.xlsx` + sauvegarde Drive dossier archive.

---

## Double sauvegarde technique

1. Activer `Version history` dans Google Sheets.
2. Dupliquer le classeur:
   - `Pilotage Master (prod)`
   - `Pilotage Master (backup)`
3. Programmer un export mensuel:
   - format `.xlsx`
   - stockage Drive + disque local.

---

## Connexion Make (si pas encore fait)

- Webhook principal logs: variable Netlify `ROBIN_LOG_WEBHOOK_URL`
- Ecriture automatique vers:
  - `events_log` pour chaque evenement,
  - `prospects` pour la vue consolidee.

---

## Check-list Go Live

- [ ] Classeur cree avec tous les onglets.
- [ ] Colonnes standard copiees.
- [ ] Make ecrit bien dans `events_log`.
- [ ] Consolidation vers `prospects` active.
- [ ] Routine hebdo assignee a une personne.
- [ ] Backup mensuel active.


# Prompt pour Make.com (scénario Webhook → Google Sheets / Email)

Copie-colle le bloc ci-dessous dans l’assistant IA de Make ou donne-le à la personne qui configure le scénario.

---

## Version courte (à coller dans Make)

```
Contexte : Robin des Airs (indemnisation vols retardés/annulés, Règlement 261/2004). Un formulaire web envoie les dossiers clients en POST vers un webhook Make.

À faire dans Make :
1. Déclencher le scénario avec un module Webhooks "Custom webhook" qui reçoit une requête POST en multipart/form-data.
2. Récupérer tous les champs du body (voir liste ci-dessous). Certains champs sont des fichiers (file_boarding, file_id, mandat_signature, sepa_signature).
3. Ajouter une ligne dans une Google Sheet avec les données du dossier : au minimum prénom, nom, email, whatsapp, nb_passagers, numéros de vol (leg1_vol, leg2_vol...), aéroports (leg1_dep, leg1_arr...), date_vol, motif, pnr, compagnie, ville_depart, ville_arrivee_finale, retard_arrivee, date/heure de réception. Les pièces jointes (fichiers) peuvent être uploadées dans Google Drive et le lien mis dans la Sheet, ou ignorées si tu ne gères que les champs texte.
4. (Optionnel) Envoyer un email de notification à l’équipe avec un résumé du dossier (nom, vol, motif).

Champs reçus par le webhook (form-data) :
- mode, prenom, nom, email, whatsapp, nb_passagers
- pax1_prenom, pax1_nom, pax2_prenom, pax2_nom... (si plusieurs passagers)
- leg1_vol, leg1_dep, leg1_arr, leg2_vol, leg2_dep, leg2_arr... (vols / trajets)
- date_vol, motif, pnr, compagnie, ville_depart, ville_arrivee_finale, retard_arrivee
- boarding_later, id_later, sepa_later (0 ou 1)
- file_boarding, file_id (fichiers)
- mandat_signature (image base64 ou fichier), mandat_signed
- iban_titulaire, iban, bic, banque, sepa_signature, sepa_signed

Crée le scénario en français si possible (noms de modules en français ou anglais). Nomme le scénario "Robin - Dépôt en ligne → Sheet".
```

---

## Version détaillée (si besoin de plus de contexte)

```
Je veux un scénario Make.com pour Robin des Airs.

Déclencheur : Webhooks > "Custom webhook". Méthode POST, body en multipart/form-data (formulaire HTML).

Quand un client soumet le formulaire de dépôt en ligne, le webhook reçoit notamment :
- Identité : prenom, nom, email, whatsapp (numéro normalisé)
- Passagers : nb_passagers, pax1_prenom, pax1_nom, pax2_prenom, pax2_nom...
- Vols : leg1_vol, leg1_dep, leg1_arr, leg2_vol... (numéro vol, aéroport départ, aéroport arrivée par segment)
- Dossier : date_vol, motif (retard/annulation/correspondance), pnr, compagnie, ville_depart, ville_arrivee_finale, retard_arrivee (minutes)
- Options : boarding_later, id_later, sepa_later (0/1)
- Fichiers : file_boarding, file_id (cartes d'embarquement, pièce d'identité), mandat_signature, sepa_signature (images)
- SEPA si fourni : iban_titulaire, iban, bic, banque

Actions demandées :
1. Google Sheets : "Add a row" — une ligne par soumission avec les champs texte (pas besoin de tous les legs dans des colonnes séparées, tu peux mettre leg1_vol, leg2_vol etc. ou un seul champ "trajet" concaténé). Ajouter une colonne "Date réception" (now).
2. Optionnel : Google Drive — upload des fichiers reçus (file_boarding, file_id) dans un dossier dédié, et mettre le lien du fichier dans la Sheet.
3. Optionnel : Gmail ou Email — envoyer un mail à l'équipe avec le résumé (nom, prénom, vol, motif, PNR).

Gérer le cas où certains champs sont vides (formulaire partiel ou "upload plus tard"). Nom du scénario : "Robin - Dépôt en ligne".
```

---

Tu peux utiliser la **version courte** dans l’assistant Make ; si l’IA demande des précisions, ajoute des éléments de la **version détaillée**.

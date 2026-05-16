# Prompt Claude — corriger le scénario Make (module not found)

Copiez **tout le bloc** ci-dessous dans Claude. Adaptez les lignes entre `[crochets]` avec vos infos.

---

## À copier-coller dans Claude

```text
Tu es un expert Make.com (Integromat), Airtable et Wati.io. Tu m’aides à finaliser un scénario déjà commencé pour Robin des Airs (indemnités vol CE 261).

## Mon problème

À l’import du blueprint JSON Make, j’ai l’erreur **« Module not found »** sur le module **Airtable Update record** (ou un module similaire). Je veux soit :
- un JSON blueprint corrigé importable, soit
- un guide **pas à pas dans l’interface Make** (recommandé si l’import reste instable).

## Scénario cible — « Robin des Airs — Envoi lien mandat WhatsApp »

Quand une ligne Airtable passe à **Statut du Dossier Suivi** = **Mandat à envoyer** :
1. Construire l’URL mandat prérempli
2. Envoyer un message WhatsApp via Wati avec ce lien
3. Mettre à jour Airtable : **Statut du Dossier Suivi** → **Signature en attente** (+ note dans Remarques si possible)

Après signature client sur https://robindesairs.eu/mandat.html (pas /sign/ — 404), le site met le statut à **Mandat signé** via Netlify.

## Colonnes Airtable (noms EXACTS — ne pas renommer)

Nom Passager, Prénom Passager, Référence Dossier, Date Dossier, Montant Client, Commission RDA (30%), Commission Agence, Agence Partenaire, Statut Dossier, Remarques, Date de naissance, Statut Mineur, Nom Représentant Légal, Email, Numéro WhatsApp, Compagnie Aérienne, Numéro de vol, Date du vol, Itinéraire, PNR (Référence réservation), Numéro de billet, Type d'incident, Heure d'arrivée réelle, Raison compagnie, Copie Passeport / CI, Carte d'embarquement, Mandat de Représentation signé, Montant de l'indemnité, Statut du Dossier Suivi, IBAN / paiement, Trajet, Adresse domicile, Sexe, Date expiration passeport / CNI.

Champ pivot workflow : **Statut du Dossier Suivi**.

## Formule mandat_url (module Airtable = 1)

https://robindesairs.eu/mandat.html?ref={{encodeURL(1.`Référence Dossier`)}}&phone={{encodeURL(1.`Numéro WhatsApp`)}}&name={{encodeURL(concat(1.`Prénom Passager`; " "; 1.`Nom Passager`))}}&email={{encodeURL(1.Email)}}&address={{encodeURL(1.`Adresse domicile`)}}&vol={{encodeURL(1.`Numéro de vol`)}}&date={{formatDate(1.`Date du vol`; "DD/MM/YYYY")}}&route={{encodeURL(if(1.Itinéraire; 1.Itinéraire; 1.Trajet))}}&pnr={{encodeURL(1.`PNR (Référence réservation)`)}}&compagnie={{encodeURL(1.`Compagnie Aérienne`)}}&motif={{encodeURL(1.`Type d'incident`)}}&indemnite={{1.`Montant de l'indemnité`}}&source=wati

## Wati (HTTP)

- URL type : https://eu-api.wati.io/[MON_ID_COMPTE]/api/v1/sendSessionMessage/{{encodeURL(1.`Numéro WhatsApp`)}}
- Method : POST
- Header : Authorization: Bearer [MON_TOKEN_WATI]
- Body JSON : messageText avec prénom + {{mandat_url}} (variable du module Set variable, ex. module 3)

## Ce que j’ai déjà / à corriger

- Fichier de référence : make-scenario-envoi-mandat-whatsapp.json
- Modules qui ont posé problème à l’import : airtable:actionUpdateRecord → à remplacer par le bon slug Make (ex. airtable:ActionUpdateRecord, mapper **record** + typecast true)
- Déclencheur : airtable:TriggerWatchRecords sur champ Statut du Dossier Suivi

Mes identifiants (je complète) :
- AIRTABLE_BASE_ID : [appXXXXXXXX]
- AIRTABLE_TABLE_ID : [tblXXXXXXXX]
- WATI_API_BASE / ID compte : [ex. eu-api.wati.io/1116453]
- Zone Make : [ex. eu2.make.com]

## Tâches pour toi (réponds en français, structuré)

1. **Guide interface Make** : pour chaque module (1 à 5), nom exact dans le menu Make, champs à remplir, valeurs à mapper (avec numéros de modules {{1.id}}, {{3.mandat_url}}, etc.).
2. **Module Update a record** : Record ID, champs Statut du Dossier Suivi et Remarques, activer Typecast ou Smart links si nécessaire.
3. **Router** : condition exacte « Statut du Dossier Suivi » = « Mandat à envoyer » (texte exact).
4. Si tu proposes un **nouveau JSON blueprint** : noms de modules valides pour Make 2024–2026, structure mapper correcte ; indiquer que l’import peut quand même échouer et que le guide manuel reste le plan B.
5. **Checklist de test** : une ligne Airtable test, vérifier URL dans navigateur, vérifier message Wati, vérifier statut Signature en attente.
6. **Erreurs fréquentes** : module not found, boucle infinie si Watch re-déclenche, numéro WhatsApp sans +33, date vide dans formatDate.

Ne pas utiliser https://robindesairs.eu/sign/...
Pose-moi seulement les questions bloquantes si des champs ci-dessus sont vides.
```

---

## Après la réponse de Claude

1. Suivez le **guide manuel** module par module dans Make (le plus fiable).
2. Si Claude renvoie un JSON, comparez avec `docs/make-scenario-envoi-mandat-whatsapp.json` avant import.
3. Tests : une ligne avec statut **Mandat à envoyer** → lien reçu sur WhatsApp → statut **Signature en attente**.

Voir aussi : `docs/WATI-LIEN-MANDAT.md`, `docs/PROMPT-CLAUDE-CONFIGURER-AIRTABLE-MANDAT.md`, `docs/PROMPT-CLAUDE-CONFIGURER-MAKE-WATI-MANDAT.md`.

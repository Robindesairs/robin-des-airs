# Scénario Make complet — Du webhook à l’AR24

Ce document décrit le scénario Make **du début à la fin** : réception du dossier, vérifications, construction du mandat, confirmations email + SMS, préparation du dossier AR24.

---

## Vue d’ensemble

| # | Module Make | Rôle |
|---|-------------|------|
| 1 | **Webhooks** — Custom webhook | Recevoir le POST du formulaire (données + fichiers) |
| 12 | **Set multiple variables** | Dériver : nom complet, trajet, liste passagers, date FR, motif FR/EN, indemnité, URL de base |
| 3 | **Set variable** | Construire l’URL complète du mandat (avec paramètres encodés) |
| 4 | **Gmail / Email** | Envoyer la confirmation email au client (avec lien mandat) |
| 5 | **Twilio** (ou autre SMS) | Envoyer la confirmation SMS au client |
| 6 | **Google Drive** — Create a folder | Créer le dossier client (ex. `AR24_[PNR]_[NOM]_[VOL]`) |
| 7 | **Google Drive** — Upload | Déposer mise en demeure, mandat (ou lien), cartes d’embarquement, pièces d’identité |
| (optionnel) | **HTTP** + outil PDF | Générer le PDF du mandat à partir de l’URL |

À la fin, le dossier Drive contient tout le nécessaire pour l’envoi AR24 (recommandé). L’envoi AR24 lui‑même (La Poste, etc.) peut être fait manuellement ou via une intégration partenaire si vous en avez une.

---

## Prérequis

- Un scénario Make avec **Webhooks** activé.
- Connexions configurées : **Gmail** (ou SMTP), **Twilio** (ou autre pour SMS), **Google Drive**.
- L’URL du webhook est bien celle renseignée dans **depot-en-ligne.html** (voir **CONFIGURER-WEBHOOK-MAKE.md**).
- Base URL du site (ex. `https://robindesairs.eu`) pour construire le lien du mandat.

---

## Module 1 — Webhooks (Custom webhook)

- **Type :** Webhooks → Custom webhook  
- **Méthode :** POST  
- **Body type :** form-data (multipart/form-data)  
- **Pas de configuration supplémentaire** : Make affiche l’URL à copier dans le site.

Champs reçus (à utiliser dans les modules suivants) :

- `prenom`, `nom`, `email`, `whatsapp`, `adresse`
- `nb_passagers`, `dossier_nom`
- `pax1_prenom`, `pax1_nom`, `pax2_prenom`, `pax2_nom`… (autres passagers)
- `leg1_vol`, `leg1_dep`, `leg1_arr`, `leg2_vol`, `leg2_dep`, `leg2_arr`… (vols)
- `date_vol`, `motif`, `pnr`, `compagnie`
- `ville_depart`, `ville_arrivee_finale`
- `file_boarding`, `file_id` (fichiers — plusieurs si plusieurs passagers, selon votre formulaire)
- `mandat_signature` ou `mandat_signature_file`
- `mandat_signed` (1 si signé)

---

## Module 12 — Set multiple variables

Créer un module **Set variable** (ou **Tools — Set multiple variables**) pour préparer les valeurs dérivées utilisées dans l’URL du mandat et les emails. *Chez vous ce bloc est le **module 12** ; adaptez les numéros dans les formules ci‑dessous si besoin.*

| Variable | Formule / valeur (dans Make, mappez depuis le module 1 = Webhook) |
|----------|-----------------------------------------------------------|
| **name** | `{{1.prenom}} {{1.nom}}` (ou `trim` si disponible) |
| **phone** | Format pour affichage : si `whatsapp` = `33612345678` → `+33 6 12 34 56 78`. Sinon utiliser `{{1.whatsapp}}` tel quel. |
| **vol** | `{{1.leg1_vol}}` (premier vol) |
| **date_fr** | Convertir `{{1.date_vol}}` (YYYY-MM-DD) en JJ/MM/AAAA. Dans Make : utiliser **Parse date** puis **Format date** si disponible, sinon voir ci‑dessous. |
| **route** | 1 vol : `{{1.leg1_dep}} → {{1.leg1_arr}}`. Plusieurs vols : enchaîner `leg1_dep}} → {{leg1_arr}} / {{leg2_dep}} → {{leg2_arr}}` etc. (codes aéroport, ex. CDG, DKR). |
| **motif_fr** | Si `{{1.motif}}` = `retard` → `Retard` ; `annulation` → `Annulation` ; `surbook` → `Surbooking` ; `correspondance` → `Correspondance manquée`. Sinon garder `{{1.motif}}`. |
| **motif_en** | `retard` → `Delay` ; `annulation` → `Cancellation` ; `surbook` → `Denied boarding` ; `correspondance` → `Missed connection`. |
| **paxlist** | Pour chaque passager 2, 3… : `{{1.pax1_prenom}} {{1.pax1_nom}}`, `{{1.pax2_prenom}} {{1.pax2_nom}}`, etc. Concaténer avec `, ` entre chaque. Si un seul passager : chaîne vide. |
| **nbpax** | `{{1.nb_passagers}}` (nombre, ex. 1 ou 2) |
| **indemnite** | Le formulaire dépôt en ligne **n’envoie pas** actuellement `indemnite` au webhook. Utiliser **600** par défaut dans Make. Si vous ajoutez plus tard un champ `indemnite` au formulaire et au `FormData`, vous pourrez mapper `{{1.indemnite}}` ici. |
| **base_url** | `https://robindesairs.eu` (ou votre domaine) |

### Conversion date_vol → date_fr (JJ/MM/AAAA)

- **Option A** : dans Make, module **Parse date** : input `{{1.date_vol}}`, format `YYYY-MM-DD` → puis **Format date** en sortie `DD/MM/YYYY`.
- **Option B** : si vous préférez une seule variable, utilisez un module **Tools — Set variable** avec une expression (si votre plan le permet) ou un **Router** avec des cas selon la date.

Exemple **route** (2 vols) :

```
{{1.leg1_dep}} → {{1.leg1_arr}} / {{1.leg2_dep}} → {{1.leg2_arr}}
```

Exemple **paxlist** (2 passagers supplémentaires) :

```
{{1.pax1_prenom}} {{1.pax1_nom}}, {{1.pax2_prenom}} {{1.pax2_nom}}
```

(Adapter selon le nombre réel de passagers si vous utilisez un Iterator.)

---

## Module 3 — Set variable : URL du mandat

Créer **une variable** `mandat_url` contenant l’URL complète du mandat, avec **tous les paramètres encodés** (espaces en `%20`, `&` en `%26`, etc.). Make propose souvent une fonction **encodeURIComponent** dans les expressions.

Formule type (à adapter à la syntaxe Make). **Toutes les variables name, phone, vol, date_fr, route, motif_fr, motif_en, paxlist, nbpax, indemnite, base_url viennent du module 12** — utilisez `{{12.xxx}}` :

```
{{12.base_url}}/mandat.html?name={{encode(12.name)}}&phone={{encode(12.phone)}}&address={{encode(1.adresse)}}&email={{encode(1.email)}}&vol={{encode(12.vol)}}&date={{encode(12.date_fr)}}&route={{encode(12.route)}}&motif={{encode(12.motif_fr)}}&motif_en={{encode(12.motif_en)}}&pnr={{encode(1.pnr)}}&compagnie={{encode(1.compagnie)}}&paxlist={{encode(12.paxlist)}}&nbpax={{12.nbpax}}&indemnite={{12.indemnite}}
```

- Remplacer `encode(...)` par la fonction Make d’encodage d’URL (souvent **encodeURIComponent** dans une expression).
- **1** = Webhook, **12** = Set multiple variables. Si vos numéros de modules sont différents, remplacez 1 et 12 en conséquence.
- Les champs optionnels (ex. `address`, `paxlist`) peuvent être omis s’ils sont vides pour éviter `&address=` vide.

Paramètres à inclure au minimum : `name`, `phone`, `email`, `vol`, `date`, `route`, `motif`, `pnr`, `compagnie`, `nbpax`, `indemnite`. Optionnels : `address`, `motif_en`, `paxlist`.

### Copier-coller Module 3 (équivalences module 1 = Webhook, module 12 = Set variables)

| Champ Make | Valeur (à coller dans le champ Value) |
|------------|--------------------------------------|
| **Variable name** | `mandat_url` |
| **Value** | Une seule ligne (voir ci‑dessous). |

**Value (sans encodage) — à coller tel quel :**

```
https://robindesairs.eu/mandat.html?name={{12.name}}&phone={{12.phone}}&address={{1.adresse}}&email={{1.email}}&vol={{12.vol}}&date={{12.date_fr}}&route={{12.route}}&motif={{12.motif_fr}}&motif_en={{12.motif_en}}&pnr={{1.pnr}}&compagnie={{1.compagnie}}&paxlist={{12.paxlist}}&nbpax={{12.nbpax}}&indemnite={{12.indemnite}}
```

**Value (avec encodage URL, si Make le propose) :** remplacer chaque `{{12.xxx}}` et `{{1.xxx}}` par `{{encode(12.xxx)}}` / `{{encode(1.xxx)}}` pour les champs texte (name, phone, address, email, vol, date_fr, route, motif_fr, motif_en, pnr, compagnie, paxlist). Laisser `nbpax` et `indemnite` sans encode.

**Équivalences :** `12.name`, `12.phone`, `12.vol`, `12.date_fr`, `12.route`, `12.motif_fr`, `12.motif_en`, `12.paxlist`, `12.nbpax`, `12.indemnite` ← module 12. `1.adresse`, `1.email`, `1.pnr`, `1.compagnie` ← module 1 (Webhook).

---

## Module 4 — Gmail (ou Email) : confirmation client

- **To :** `{{1.email}}`
- **Subject :** `Dossier reçu — Robin des Airs`
- **Content (exemple).** *Date = module 12. Lien mandat = module **15** (`{{15.mandat_url}}`).*

```
Bonjour {{1.prenom}},

Nous avons bien reçu votre dossier d'indemnisation.

Récapitulatif :
- Vol : {{1.leg1_vol}}
- Date : {{12.date_fr}}
- Compagnie : {{1.compagnie}}
- PNR : {{1.pnr}}

Votre mandat de représentation (prérempli avec vos informations) est consultable ici :
{{15.mandat_url}}

Nous traitons votre dossier et vous tiendrons informé(e) par email et SMS.

—
L'équipe Robin des Airs
66 avenue des Champs-Élysées, 75008 Paris
```

→ Dans Make le lien mandat vient du **module 15** : `{{15.mandat_url}}`.

- Si vous générez un PDF du mandat en amont, vous pouvez joindre ce PDF au lieu (ou en plus) du lien.

---

## Module 5 — Twilio (ou SMS) : confirmation client

- **To :** `{{1.whatsapp}}` (format international sans +, ex. `33612345678`). *1 = Webhook.*
- **Message :**

```
Robin des Airs : nous avons bien reçu votre dossier (vol {{1.leg1_vol}}, PNR {{1.pnr}}). Vous recevrez un email de confirmation. Merci.
```

Adapter selon la limite de caractères SMS (160 ou 70 selon encodage).

---

## Module 6 — Google Drive : Create a folder

*(Chez vous ce module est le **module 3**. Dans les Upload, mettre **Folder ID** = `{{3.ID}}`.)*

- **Drive** : choisir le compte et le dossier parent (ex. « Dossiers Robin des Airs »).
- **Folder name :** par exemple  
  `AR24_{{1.pnr}}_{{1.nom}}_{{1.prenom}}_Vol{{1.leg1_vol}}`  
  ou simplement `{{1.dossier_nom}}` si vous préférez garder le même nom que le formulaire. *1 = Webhook.*

Cela donne un dossier unique par client, prêt à recevoir les pièces.

---

## Module 7 — Google Drive : Upload files

Enchaîner plusieurs modules **Upload a file** (ou un seul avec boucle selon votre version Make). **Parent folder / Folder ID :** mapper la sortie du module qui crée le dossier — chez vous c’est le **module 3** : mettre **`{{3.ID}}`** dans le champ Folder ID de chaque Upload.

### Où viennent les fichiers ? (boarding cards, passports)

Tous les fichiers viennent du **Webhook (module 1)** : le formulaire envoie en POST les pièces jointes. Chaque passager peut avoir **une carte d’embarquement** et **une pièce d’identité**, donc vous pouvez recevoir **plusieurs** `file_boarding` et **plusieurs** `file_id` (un par passager).

- **Dans Make :** après une exécution de test, ouvrez la sortie du **module 1 (Webhook)** et regardez la structure :
  - Soit plusieurs champs : `file_boarding`, `file_boarding 2`, `file_boarding 3`… (ou `file_boarding[1]`, `file_boarding[2]`… selon la version).
  - Soit un **tableau** (array) : `file_boarding[]` avec plusieurs éléments.
- **Pour récupérer TOUTES les cartes d’embarquement et TOUS les passeports :**
  - **Option A — Plusieurs modules Upload :** si le webhook expose `file_boarding`, `file_boarding 2`, `file_boarding 3`, etc., ajoutez un module **Upload a file** par fichier et mappez `{{1.file_boarding}}`, `{{1.file_boarding 2}}`, `{{1.file_boarding 3}}`… (idem pour `file_id`, `file_id 2`, …). Nom du fichier : ex. `Carte_embarquement_{{1.pnr}}_passager1.pdf`, `Carte_embarquement_{{1.pnr}}_passager2.pdf`, etc.
  - **Option B — Iterator :** si Make reçoit un **array** de fichiers, ajoutez un module **Iterator** (Tools) sur ce tableau, puis **dans la boucle** un module **Google Drive — Upload a file** qui utilise l’élément courant (ex. `{{item.file_boarding}}` ou `{{item}}`). Même chose pour les pièces d’identité avec un second Iterator sur `file_id` si c’est un array. Nom du fichier : ex. `Carte_embarquement_{{1.pnr}}_{{iterator.index}}.pdf` ou `Piece_identite_{{1.pnr}}_{{iterator.index}}.pdf`.

Faire un **test avec 2 ou 3 passagers** et une exécution Make pour voir exactement les noms des champs (file_boarding, file_boarding 2, ou file_boarding[]) et adapter les modules en conséquence.

| Fichier à déposer | Source (mapping) | Nom du fichier suggéré |
|------------------|------------------|-------------------------|
| **Mise en demeure** | Texte ou document généré (voir ci‑dessous) | `Mise_en_demeure_{{1.pnr}}_{{1.leg1_vol}}.pdf` |
| **Mandat signé** (à récupérer obligatoirement) | `{{1.mandat_signature_file}}` — fichier image de la signature envoyé par le formulaire (webhook module 1) | `Mandat_signe_{{1.pnr}}.png` (ou `.pdf` si vous convertissez) |
| **Mandat** (PDF prérempli, optionnel) | PDF généré depuis `{{15.mandat_url}}` si vous voulez aussi le mandat texte dans le dossier | `Mandat_{{1.pnr}}.pdf` |
| **Toutes les cartes d’embarquement** | `{{1.file_boarding}}`, puis si plusieurs : `{{1.file_boarding 2}}`, `{{1.file_boarding 3}}`… ou Iterator sur l’array | `Carte_embarquement_{{1.pnr}}_1.pdf`, `_2.pdf`, … |
| **Tous les passeports / pièces d’identité** | `{{1.file_id}}`, puis si plusieurs : `{{1.file_id 2}}`, … ou Iterator sur l’array | `Piece_identite_{{1.pnr}}_1.pdf`, `_2.pdf`, … |

- **Mandat signé :** le formulaire envoie la signature du mandat dans `mandat_signature_file` (image PNG). Il faut **obligatoirement** l’uploader dans le dossier Drive (ex. `Mandat_signe_{{1.pnr}}.png`) pour en garder une copie. Optionnellement vous pouvez aussi générer le PDF du mandat depuis `{{15.mandat_url}}` et l’uploader.
- Pour la **mise en demeure** : créer d’abord le contenu (voir modèle ci‑dessous), puis le convertir en PDF, puis l’uploader dans ce dossier.

### Modèle de mise en demeure (texte)

- **Objet (pour l’email / le PDF) :**  
  `MISE EN DEMEURE — Signalement autorités de régulation — {{1.leg1_vol}} — {{1.pnr}}`
- **Convention d’objet (nom du fichier / titre) :**  
  `Indemnisation EU261 — {{1.pnr}} — {{1.nom}} {{1.prenom}} — Vol {{1.leg1_vol}}`

Corps du texte (à personnaliser si besoin) :

```
Madame, Monsieur,

Ceci est une mise en demeure avant poursuites. Votre refus de coopérer est désormais acté.

Sans virement sous 7 jours, nous engageons simultanément :
- Un signalement à la DGAC Direction des enquêtes accidents (non-respect du Règlement CE 261).
- La saisine de l'Autorité de Régulation des Transports (ART).
- La préparation du dossier pour le Médiateur (MTV) dès l'échéance légale des 60 jours.

À l'issue de ces délais, nous saisirons le Tribunal Judiciaire compétent par voie d'assignation.

Cordialement,
L'équipe Robin des Airs
```

Remplacer les variables `{{...}}` par les champs Make (PNR, vol, nom, prénom, etc.) puis générer le PDF et l’uploader dans le dossier Drive.

---

## Optionnel — Générer le PDF du mandat

Pour avoir un **PDF du mandat** prérempli (sans signature client) à mettre dans le dossier AR24 et/ou en pièce jointe à l’email :

1. **HTTP — Make a request** : GET `{{15.mandat_url}}` (module 15) → récupérer le HTML.
2. Puis utiliser un module **Convert HTML to PDF** (ou service externe) avec ce HTML pour obtenir un fichier PDF.
3. Utiliser ce PDF dans le module **Google Drive — Upload** et éventuellement en pièce jointe du **Gmail** (module 4).

Alternative : certains services (ex. PDF shift, DocRaptor) acceptent une URL directement ; dans ce cas, appeler le service avec `mandat_url` et récupérer le PDF.

---

## Ordre des modules (chaîne complète)

```
1. Webhooks (Custom webhook)
   ↓
12. Set multiple variables (name, phone, vol, date_fr, route, motif_fr, motif_en, paxlist, nbpax, indemnite, base_url)
   ↓
15. Set variable (mandat_url)
   ↓
4. Gmail — Send an email (confirmation client)
   ↓
5. Twilio — Send SMS (confirmation client)
   ↓
6. Google Drive — Create a folder
   ↓
7a. [Optionnel] HTTP + Convert HTML to PDF → mandat
7b. Créer le document de mise en demeure (texte + conversion PDF)
7c. Google Drive — Upload a file (mise en demeure)
7d. Google Drive — Upload a file (mandat signé : `{{1.mandat_signature_file}}` — obligatoire)
7e. Google Drive — Upload a file (file_boarding)
7f. Google Drive — Upload a file (file_id)
```

---

## Gestion des erreurs (recommandations)

- **Router** après le webhook : si `mandat_signed` ≠ 1, vous pouvez envoyer un email différent (« Merci, pensez à signer le mandat ») ou ne pas envoyer le lien mandat.
- **Router** après le module 12 (Set variables) : si un champ obligatoire (ex. `email`, `leg1_vol`) est vide, éviter d’envoyer l’email/SMS ou envoyer un message d’erreur à l’équipe interne uniquement.
- En cas d’échec d’upload Drive : configurer un **resume** ou une **alerte** pour ne pas perdre le dossier.

---

## Récapitulatif des champs webhook utilisés

| Champ | Utilisation |
|-------|-------------|
| `prenom`, `nom` | name, email, dossier, mise en demeure |
| `email` | Envoi confirmation email |
| `whatsapp` | Envoi SMS (format international) |
| `adresse` | Paramètre `address` du mandat |
| `leg1_vol`, `leg2_vol`… | vol, route, objet AR24 |
| `leg1_dep`, `leg1_arr`… | route (trajet) |
| `date_vol` | date_fr (mandat, email) |
| `motif` | motif_fr, motif_en |
| `pnr` | mandat, dossier, mise en demeure |
| `compagnie` | mandat, email |
| `nb_passagers`, `pax1_prenom`, `pax1_nom`… | nbpax, paxlist |
| `file_boarding`, `file_id` | Upload dans le dossier AR24 |
| `dossier_nom` | Nom du dossier Drive (optionnel) |

Une fois ce scénario en place, chaque soumission du formulaire déclenche : vérifications dérivées → URL mandat → confirmation email + SMS → création du dossier Drive et dépôt des pièces pour l’AR24.

# Un dossier (dossier) par client — Make.com + Google Drive

Ce guide décrit comment faire pour que **chaque envoi client** crée **un dossier** (dossier) dans Google Drive avec les **fichiers** (carte d’embarquement, pièce d’identité, etc.) et les infos du client.

---

## 1. Où vont les fichiers aujourd’hui ?

Quand un client envoie le formulaire :

| Page | Ce qui est envoyé | Destination |
|------|-------------------|-------------|
| **Dépôt en ligne** (`depot-en-ligne.html`) | Formulaire + **fichiers** (carte d’embarquement, pièce d’identité, signatures mandat/SEPA) en `multipart/form-data` | Webhook Make.com |
| **Dépôt simple** (`depot-simple.html`) | Prénom, WhatsApp, trajet, **1 fichier** (photo vol) | Webhook Make.com |
| **Formulaire dossier** (`dossier.html`) | Données en **JSON uniquement** (pas de fichiers envoyés au webhook) | Webhook Make.com |

Donc **les vrais fichiers** (carte d’embarquement, passeport, etc.) sont envoyés uniquement par **depot-en-ligne** et **depot-simple**. Sans scénario Make.com, ils ne sont **stockés nulle part** : Make reçoit la requête mais il faut ajouter des modules (Google Drive, etc.) pour créer un dossier par client et y mettre les fichiers.

---

## 2. Champs et fichiers envoyés (pour configurer Make)

### Dépôt en ligne (`depot-en-ligne.html`)

**Champs texte (exemples)**  
`mode`, `prenom`, `nom`, `email`, `whatsapp`, `nb_passagers`, `leg1_vol`, `leg1_dep`, `leg1_arr`, `date_vol`, `motif`, `pnr`, `compagnie`, `ville_depart`, `ville_arrivee_finale`, `retard_arrivee`, `iban_titulaire`, `iban`, `bic`, `banque`, etc.

**Fichiers / images**  
- `file_boarding` — carte(s) d’embarquement (plusieurs possibles si plusieurs passagers, même nom de champ)
- `file_id` — pièce(s) d’identité (passeport, etc.)
- `mandat_signature` — image de la signature du mandat (format Data URL PNG)
- `sepa_signature` — image de la signature SEPA (Data URL PNG), si fournie

### Dépôt simple (`depot-simple.html`)

**Champs**  
`mode`, `prenom`, `whatsapp`, `nb_passagers`, `depart`, `arrivee`, `numero_vol` (ou vide).

**Fichier**  
- `file_longest_flight` — photo du vol (carte d’embarquement ou billet)

---

## 3. Scénario Make.com : un dossier Google Drive par client

Idée : à chaque envoi du formulaire, Make.com **crée un dossier** dans Google Drive (nom = identité du client ou numéro de dossier), puis **y enregistre les fichiers** reçus dans le webhook.

### Étape 1 — Webhook

- Module **Webhooks** → **Custom webhook**.
- Créez le webhook, **copiez l’URL**.
- Collez cette URL dans le site : `WEBHOOK_URL` dans **depot-en-ligne.html** et `WEBHOOK` dans **depot-simple.html** (voir `docs/CONFIGURER-WEBHOOK-MAKE.md`).
- **Important** : dans les paramètres du webhook, autorisez la réception de **fichiers** (multipart/form-data). Sur Make.com, le webhook « Custom webhook » reçoit normalement les fichiers ; ils apparaissent dans la sortie du module (souvent en binaire ou « attachment »).

### Étape 2 — Numéro de dossier (optionnel mais utile)

- Ajoutez un module **Set variable** (ou **Tools** → **Set variable**).
- Créez une variable `numero_dossier` au format `RDA-YYMMDD-XXXX` (ex. `RDA-260308-0042`).
  - Année/mois/jour : fonctions date de Make.
  - `XXXX` : nombre aléatoire 1000–9999 (ou compteur si vous en avez un).

Vous utiliserez ce numéro pour le nom du dossier et pour le suivi.

### Étape 3 — Créer un dossier dans Google Drive

- Module **Google Drive** → **Create a folder**.
- Connectez votre compte Google.
- **Nom du dossier** : par exemple  
  `{{numero_dossier}} - {{prenom}} {{nom}}`  
  (ou pour dépôt simple : `{{numero_dossier}} - {{prenom}}`).
- **Dossier parent** : un dossier Google Drive dédié (ex. « Dossiers Robin des Airs »).
- La sortie de ce module donne l’**ID du dossier** créé.

### Étape 4 — Envoyer les fichiers dans ce dossier

Pour **chaque** fichier à sauvegarder :

- Module **Google Drive** → **Upload a file**.
- **Dossier** : l’ID du dossier créé à l’étape 3.
- **Nom du fichier** : par exemple :
  - `carte_embarquement.pdf` (ou `.jpg`) pour `file_boarding`
  - `piece_identite.pdf` (ou `.jpg`) pour `file_id`
  - `vol_longest_flight.jpg` pour `file_longest_flight` (dépôt simple)
- **Contenu du fichier** : mappez le champ reçu du webhook qui contient le fichier (ex. sortie du module Webhook → `file_boarding`, `file_id`, `file_longest_flight`).  
  Si Make propose un type « Binary » ou « File », utilisez-le pour le contenu.

Pour les **signatures** (mandat, SEPA) : ce sont des Data URL (image en base64). Vous pouvez soit :
- les enregistrer telles quelles dans un fichier texte (ex. `mandat_signature.txt`),  
soit  
- ajouter un module pour décoder le base64 et créer une image (si Make le permet), puis l’uploader dans le même dossier.

Répétez le module « Upload a file » pour chaque type de fichier (boarding, id, signature mandat, signature SEPA, etc.) en utilisant le **même** dossier (ID de l’étape 3).

### Étape 5 — Ligne dans un Google Sheet (recommandé)

- Module **Google Sheets** → **Add a row**.
- Feuille : votre tableau de suivi des dossiers.
- Colonnes à remplir (exemples) :  
  `numero_dossier`, `prenom`, `nom`, `email`, `whatsapp`, `date_vol`, `motif`, `ville_depart`, `ville_arrivee_finale`, `lien_dossier_drive` (optionnel : lien vers le dossier créé à l’étape 3).

Comme ça vous avez **une ligne par client** et, dans Drive, **un dossier par client** avec les pièces.

---

## 4. Résumé

| Étape | Action |
|-------|--------|
| 1 | Webhook reçoit formulaire + fichiers (depot-en-ligne ou depot-simple). |
| 2 | (Optionnel) Générer `numero_dossier` (RDA-YYMMDD-XXXX). |
| 3 | Google Drive : **Créer un dossier** (nom = numéro + nom/prénom client). |
| 4 | Google Drive : **Upload a file** pour chaque fichier (carte d’embarquement, pièce d’identité, etc.) dans ce dossier. |
| 5 | Google Sheets : **Add a row** avec les infos client + éventuellement le lien vers le dossier. |

Après configuration, **chaque envoi client** = **un dossier** dans Google Drive avec les pièces, et une ligne dans le Sheet pour le suivi.

---

## 5. Fichiers multiples (plusieurs passagers)

Sur **depot-en-ligne**, le formulaire peut envoyer **plusieurs** `file_boarding` et **plusieurs** `file_id` (un par passager). Selon la version de Make.com, le webhook peut les exposer comme :

- une **liste** (array) de fichiers, ou  
- plusieurs champs (file_boarding_1, file_boarding_2…).

Dans le scénario, faites une **boucle** (Iterator ou répétition) sur ces fichiers et, pour chaque élément, appelez **Google Drive → Upload a file** dans le **même** dossier client. Ainsi, toutes les cartes d’embarquement et pièces d’identité du même dossier client se retrouvent dans le même dossier Drive.

---

## 6. Limitation du formulaire `dossier.html`

Le fichier **dossier.html** envoie aujourd’hui uniquement du **JSON** (pas de `FormData`). Les fichiers (carte d’embarquement, pièce d’identité, RIB) ne sont **pas** envoyés au webhook. Pour que ces fichiers arrivent aussi dans Make.com et dans un dossier par client, il faudrait modifier **dossier.html** pour envoyer en **multipart/form-data** (comme depot-en-ligne) au lieu de JSON. Si vous le souhaitez, on peut détailler cette modification dans un prochain guide.

# Robin des Airs — Make (Integromat) + Google Sheet

Ce guide explique comment faire arriver les dossiers (formulaire en ligne et WhatsApp) dans un **Google Sheet** via **Make.com**, avec un **numéro de dossier RDA** et le **mode** (en ligne / WhatsApp) pour tout retracer et envoyer à la compagnie aérienne.

---

## 1. Numéro de dossier RDA

- **Format** : `RDA-YYMMDD-XXXX`  
  Exemple : `RDA-260226-0042` = dossier du 26 février 2026, numéro du jour 0042.
- **Effet** : donne l’impression d’un volume important de dossiers (séquence 1000–9999 par jour).
- **Formulaire en ligne** : le numéro est généré au moment de la soumission et envoyé dans le webhook + affiché au client sur l’écran de succès.
- **WhatsApp** : Make peut générer un RDA quand un nouveau dossier est créé (voir plus bas).

---

## 2. Structure du Google Sheet

Créez une feuille avec une **première ligne d’en-têtes** (ex. ligne 1) puis les données à partir de la ligne 2.

| Colonne A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V |
|-----------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **numero_dossier** | **mode** | **timestamp** | **pnr** | trajet | vol | vol1 | vol2 | compagnie | destination | dateVol | pax | motif | prenom | nom | email | tel | sepaLater | sepaTitulaire | sepaIban | sepaBic | sepaBanque |

- **pnr** : code PNR (réservation) — 6 caractères alphanumériques, optionnel, fourni par le client.

- **mode** : `en_ligne` (formulaire web) ou `whatsapp` (dossier reçu par WhatsApp).
- Vous pouvez ajouter des colonnes à droite (notes, statut, date envoi compagnie, etc.).

---

## 3. Scénario Make : formulaire en ligne → Google Sheet

1. **Make.com** → Créer un scénario.
2. **Déclencheur** : **Webhooks** → **Custom webhook**.
   - Créez un webhook, notez l’URL (ex. `https://hook.eu1.make.com/xxxxxxxx`).
   - Collez cette URL dans `dossier.html` : `const DOSSIER_WEBHOOK_URL = 'https://hook.eu1.make.com/xxxxxxxx';`
3. **Module suivant** : **Google Sheets** → **Add a row**.
   - Connectez votre compte Google, choisissez le classeur et la feuille.
   - Mappez les champs du **body** du webhook vers les colonnes du Sheet :
     - `numero_dossier` → A, `mode` → B, `timestamp` → C, `pnr` → D  
     - `trajet` → E, `vol` → F, `vol1` → G, `vol2` → H, `compagnie` → I, `destination` → J, `dateVol` → K, `pax` → L, `motif` → M  
     - `prenom` → N, `nom` → O, `email` → P, `tel` → Q  
     - `sepaLater` → R, `sepaTitulaire` → S, `sepaIban` → T, `sepaBic` → U, `sepaBanque` → V  
   - Pour les cases à cocher (ex. `sepaLater`), vous pouvez mapper directement (Make envoie `true`/`false`).
4. **Sauvegardez** et **activez** le scénario.

Dès qu’un client soumet le formulaire en ligne, une ligne est ajoutée dans le Sheet avec **numero_dossier** (RDA-…), **mode** = `en_ligne`, et toutes les données.

---

## 4. WhatsApp : faire arriver les dossiers dans le même Sheet

Si vous utilisez **WhatsApp** (Business API ou connecteur Make type “WhatsApp by Meta” / “Chatlayer”, etc.) :

- **Option A — Make au centre**  
  Quand un nouveau “dossier” est détecté (nouveau contact, message clé, ou formulaire interne WhatsApp), un scénario Make :
  1. Déclencheur : WhatsApp (nouveau message ou nouveau contact).
  2. Filtre (optionnel) : par mot-clé ou par statut “nouveau dossier”.
  3. **Tools** → **Set variable** : générer un numéro du type `RDA-YYMMDD-XXXX` (en utilisant les fonctions date + un nombre aléatoire dans Make).
  4. **Google Sheets** → **Add a row** : même feuille, avec `mode` = `whatsapp`, `numero_dossier` = la variable RDA, et les infos disponibles (téléphone, nom, vol, etc. selon ce que vous récupérez).

- **Option B — RDA envoyé au client**  
  Dès qu’un dossier WhatsApp est créé dans le Sheet, vous pouvez (dans un autre scénario ou le même) envoyer un message au client avec son numéro de dossier (ex. “Votre dossier a bien été enregistré sous le numéro RDA-260226-0042”).

Ainsi, **tous les dossiers** (en ligne et WhatsApp) sont dans **un seul Google Sheet**, avec **numero_dossier** et **mode** pour trier, filtrer et préparer l’envoi à la compagnie aérienne.

---

## 5. Extraire et envoyer à la compagnie aérienne

- **Export** : depuis le Sheet, vous pouvez exporter en CSV/Excel ou utiliser l’API pour ne sortir que les dossiers “prêts à envoyer”.
- **Make** : un scénario peut lire les lignes du Sheet (Google Sheets → “Search rows” ou “Watch rows”), filtrer par statut, puis déclencher un envoi (email, envoi de courrier, ou autre outil) avec le numéro RDA et les données nécessaires pour la compagnie.

---

## 6. Résumé

| Élément | Détail |
|--------|--------|
| **Numéro dossier** | `RDA-YYMMDD-XXXX` (généré côté formulaire ou par Make pour WhatsApp) |
| **Mode** | `en_ligne` ou `whatsapp` |
| **Formulaire web** | Envoi vers webhook Make → une ligne ajoutée dans le Sheet avec ces champs |
| **WhatsApp** | Scénario Make qui crée une ligne avec `mode` = whatsapp et un RDA généré |
| **Un seul Sheet** | Tous les dossiers au même endroit pour extraction et envoi à la compagnie |

Une fois le webhook Make configuré, remplacez dans `dossier.html` la valeur de `DOSSIER_WEBHOOK_URL` par l’URL de votre webhook.

---

## 7. Prompt pour l’IA Make (création de scénario)

Make propose des **AI Agents** et des assistants pour t’aider à créer des scénarios. Tu peux coller le prompt ci‑dessous (dans l’assistant IA Make ou dans la description de ton agent) pour qu’il génère ou complète le scénario Webhook → Google Sheet **en incluant le code PNR** dans le tableau.

---

**Prompt à coller dans Make :**

```
Je veux un scénario Make qui :

1. Déclencheur : Webhooks — Custom webhook (POST, JSON).

2. Données reçues dans le body (exemple) :
   - numero_dossier (texte, ex: RDA-260226-0042)
   - mode (texte : "en_ligne" ou "whatsapp")
   - timestamp (date/heure ISO)
   - pnr (texte, code PNR réservation, optionnel — 6 caractères)
   - trajet, vol, vol1, vol2, compagnie, destination, dateVol, pax, motif
   - prenom, nom, email, tel
   - sepaLater (booléen), sepaTitulaire, sepaIban, sepaBic, sepaBanque

3. Action : Google Sheets — Add a row.
   - Feuille : une feuille de mon choix (je la sélectionnerai).
   - Colonnes à remplir dans l’ordre (ligne 1 = en-têtes, données à partir de la ligne 2) :
     A = numero_dossier
     B = mode
     C = timestamp
     D = pnr
     E = trajet
     F = vol
     G = vol1
     H = vol2
     I = compagnie
     J = destination
     K = dateVol
     L = pax
     M = motif
     N = prenom
     O = nom
     P = email
     Q = tel
     R = sepaLater
     S = sepaTitulaire
     T = sepaIban
     U = sepaBic
     V = sepaBanque

Important : le code PNR doit bien être mappé dans la colonne D du Google Sheet pour pouvoir l’extraire et l’envoyer à la compagnie aérienne avec le dossier.
```

---

Tu peux adapter le nom de la feuille ou du classeur dans le prompt si tu veux que l’IA prenne en compte un fichier précis.

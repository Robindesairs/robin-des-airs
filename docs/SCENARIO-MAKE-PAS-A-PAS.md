# Scénario Make complet — Du webhook à l’AR24

Ce document décrit le scénario Make **du début à la fin** : réception du dossier, vérifications, construction du mandat, confirmations email + SMS, préparation du dossier AR24.

---

## Vue d’ensemble

| # | Module Make | Rôle |
|---|-------------|------|
| 1 | **Webhooks** — Custom webhook | Recevoir le POST du formulaire (données + fichiers) |
| 2 | **Set multiple variables** | Dériver : nom complet, trajet, liste passagers, date FR, motif FR/EN, indemnité, URL de base |
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

## Module 2 — Set multiple variables

Créer un module **Set variable** (ou **Tools — Set multiple variables**) pour préparer les valeurs dérivées utilisées dans l’URL du mandat et les emails.

| Variable | Formule / valeur (dans Make, mappez depuis le module 1) |
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

Formule type (à adapter à la syntaxe Make) :

```
{{base_url}}/mandat.html?name={{encode(name)}}&phone={{encode(phone)}}&address={{encode(1.adresse)}}&email={{encode(1.email)}}&vol={{encode(vol)}}&date={{encode(date_fr)}}&route={{encode(route)}}&motif={{encode(motif_fr)}}&motif_en={{encode(motif_en)}}&pnr={{encode(1.pnr)}}&compagnie={{encode(1.compagnie)}}&paxlist={{encode(paxlist)}}&nbpax={{nbpax}}&indemnite={{indemnite}}
```

- Remplacer `encode(...)` par la fonction Make d’encodage d’URL (souvent **encodeURIComponent** dans une expression).
- Les champs optionnels (ex. `address`, `paxlist`) peuvent être omis s’ils sont vides pour éviter `&address=` vide.

Paramètres à inclure au minimum : `name`, `phone`, `email`, `vol`, `date`, `route`, `motif`, `pnr`, `compagnie`, `nbpax`, `indemnite`. Optionnels : `address`, `motif_en`, `paxlist`.

---

## Module 4 — Gmail (ou Email) : confirmation client

- **To :** `{{1.email}}`
- **Subject :** `Dossier reçu — Robin des Airs`
- **Content (exemple) :**

```
Bonjour {{1.prenom}},

Nous avons bien reçu votre dossier d'indemnisation.

Récapitulatif :
- Vol : {{1.leg1_vol}}
- Date : {{date_fr}}
- Compagnie : {{1.compagnie}}
- PNR : {{1.pnr}}

Votre mandat de représentation (prérempli avec vos informations) est consultable ici :
{{mandat_url}}

Nous traitons votre dossier et vous tiendrons informé(e) par email et SMS.

L'équipe Robin des Airs
```

- Si vous générez un PDF du mandat en amont, vous pouvez joindre ce PDF au lieu (ou en plus) du lien.

---

## Module 5 — Twilio (ou SMS) : confirmation client

- **To :** `{{1.whatsapp}}` (format international sans +, ex. `33612345678`)
- **Message :**

```
Robin des Airs : nous avons bien reçu votre dossier (vol {{1.leg1_vol}}, PNR {{1.pnr}}). Vous recevrez un email de confirmation. Merci.
```

Adapter selon la limite de caractères SMS (160 ou 70 selon encodage).

---

## Module 6 — Google Drive : Create a folder

- **Drive** : choisir le compte et le dossier parent (ex. « Dossiers Robin des Airs »).
- **Folder name :** par exemple  
  `AR24_{{1.pnr}}_{{1.nom}}_{{1.prenom}}_Vol{{1.leg1_vol}}`  
  ou simplement `{{1.dossier_nom}}` si vous préférez garder le même nom que le formulaire.

Cela donne un dossier unique par client, prêt à recevoir les pièces.

---

## Module 7 — Google Drive : Upload files

Enchaîner plusieurs modules **Upload a file** (ou un seul avec boucle selon votre version Make), en ciblant le **dossier créé au module 6** comme parent.

| Fichier à déposer | Source (mapping) | Nom du fichier suggéré |
|------------------|------------------|-------------------------|
| **Mise en demeure** | Texte ou document généré (voir ci‑dessous) | `Mise_en_demeure_{{1.pnr}}_{{1.leg1_vol}}.pdf` |
| **Mandat** | Soit PDF généré depuis `mandat_url` (module HTTP + conversion PDF), soit `mandat_signature_file` reçu du webhook comme preuve de signature | `Mandat_{{1.pnr}}.pdf` ou `Mandat_signature.png` |
| **Carte(s) d’embarquement** | `{{1.file_boarding}}` (ou premier fichier si plusieurs) | `Carte_embarquement_{{1.pnr}}.pdf` (ou conserver le nom d’origine) |
| **Pièce(s) d’identité** | `{{1.file_id}}` | `Piece_identite_{{1.pnr}}.pdf` (ou nom d’origine) |

- Si vous avez **plusieurs** `file_boarding` / `file_id` (un par passager), répéter l’upload pour chaque fichier (Iterator sur les pièces jointes si Make le permet).
- Pour la **mise en demeure** : créer d’abord le contenu (voir modèle ci‑dessous), puis le convertir en PDF (module **Google Docs — Create a document from text** puis **Convert to PDF**, ou outil tiers), puis l’uploader dans ce dossier.

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

1. **HTTP — Make a request** : GET `{{mandat_url}}` → récupérer le HTML.
2. Puis utiliser un module **Convert HTML to PDF** (ou service externe) avec ce HTML pour obtenir un fichier PDF.
3. Utiliser ce PDF dans le module **Google Drive — Upload** et éventuellement en pièce jointe du **Gmail** (module 4).

Alternative : certains services (ex. PDF shift, DocRaptor) acceptent une URL directement ; dans ce cas, appeler le service avec `mandat_url` et récupérer le PDF.

---

## Ordre des modules (chaîne complète)

```
1. Webhooks (Custom webhook)
   ↓
2. Set multiple variables (name, phone, vol, date_fr, route, motif_fr, motif_en, paxlist, nbpax, indemnite, base_url)
   ↓
3. Set variable (mandat_url)
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
7d. Google Drive — Upload a file (mandat PDF ou signature)
7e. Google Drive — Upload a file (file_boarding)
7f. Google Drive — Upload a file (file_id)
```

---

## Gestion des erreurs (recommandations)

- **Router** après le webhook : si `mandat_signed` ≠ 1, vous pouvez envoyer un email différent (« Merci, pensez à signer le mandat ») ou ne pas envoyer le lien mandat.
- **Router** après Set variables : si un champ obligatoire (ex. `email`, `leg1_vol`) est vide, éviter d’envoyer l’email/SMS ou envoyer un message d’erreur à l’équipe interne uniquement.
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

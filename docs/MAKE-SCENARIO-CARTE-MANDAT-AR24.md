# Scénario Make : Carte d'embarquement → Vérifications → Mandat → Confirmations → AR24

Ce document décrit comment faire en sorte que votre **module Make** :

1. **Prenne la carte d'embarquement** et vérifie : numéro de vol, date, nom et prénom des passagers, **compagnie qui effectue le vol**.
2. **Colle ces informations dans le mandat** (construction de l’URL du mandat prérempli).
3. **Une fois le mandat créé** : envoi d’une **confirmation par email** et **confirmation SMS** au client.
4. **Prépare un envoi AR24** (lettre recommandée) avec : mise en demeure, mandat, et justificatifs (carte d’embarquement, pièce d’identité, etc.).

---

## 1. Réception des données (webhook)

Le formulaire **Dépôt en ligne** envoie en POST (multipart/form-data) vers votre webhook Make notamment :

| Champ webhook      | Description |
|--------------------|-------------|
| `prenom`, `nom`    | Passager principal |
| `email`            | Email client |
| `whatsapp` ou `tel`| Téléphone (pour SMS) |
| `adresse`          | Adresse postale |
| `leg1_vol`, `leg2_vol`… | Numéros de vol |
| `date_vol`         | Date du vol (YYYY-MM-DD) |
| `motif`            | retard / annulation / surbook / correspondance |
| `pnr`              | Code réservation (6 caractères) |
| **`compagnie`**    | **Compagnie qui effectue le vol** (ex. Air France, Transavia) |
| `nb_passagers`     | Nombre de passagers |
| `pax1_prenom`, `pax1_nom`, `pax2_prenom`… | Autres passagers |
| `file_boarding`    | Fichier(s) carte d'embarquement |
| `file_id`          | Pièce(s) d'identité |
| `mandat_signature` | Signature du mandat (image) |

Voir aussi **CONFIGURER-WEBHOOK-MAKE.md** et **prompt-make-scenario.md** pour la liste complète.

---

## 2. Vérifications à partir de la carte d’embarquement

Votre scénario Make doit **vérifier** (et éventuellement **corriger / compléter**) les données avec ce qui figure sur la carte d’embarquement :

| Élément à vérifier | Source formulaire | À contrôler sur la carte |
|--------------------|-------------------|---------------------------|
| **Numéro de vol**  | `leg1_vol`, `leg2_vol`… | Numéro du vol (ex. AF 718, VY 1234) |
| **Date du vol**    | `date_vol`        | Date du vol sur la carte |
| **Nom et prénom**  | `prenom`, `nom`, `pax*_prenom`, `pax*_nom` | Noms des passagers sur la carte |
| **Qui effectue le vol** | `compagnie`   | Compagnie opérante (souvent code 2 lettres + nom, ex. AF = Air France) |

- **Sans OCR** : vous utilisez uniquement les champs du formulaire ; le client ayant déjà saisi vol, date, noms et compagnie, Make peut simplement **vérifier la cohérence** (présence des champs obligatoires, format date, etc.).
- **Avec OCR** (Google Document AI, Make module “Parse document”, ou outil tiers) : vous extrayez depuis le fichier `file_boarding` le numéro de vol, la date, les noms et la compagnie, puis vous **comparez** aux champs reçus et vous **préférez ou complétez** avec les données extraites pour construire le mandat et l’AR24.

La donnée **« compagnie qui effectue le vol »** est importante pour la mise en demeure et le mandat : elle est désormais affichée sur le mandat (voir ci‑dessous).

---

## 3. Remplir le mandat (URL préremplie)

Le mandat est une page **statique** préremplie par **paramètres d’URL**. Make n’a pas à “générer” un PDF lui‑même : il construit l’**URL du mandat** avec tous les paramètres, puis cette URL peut être :

- envoyée au client par email (lien “Votre mandat signé”),
- utilisée pour générer un PDF (module “Convert HTML to PDF” en ouvrant cette URL, ou outil externe),
- jointe au dossier AR24 (PDF du mandat).

### Paramètres d’URL du mandat

Base : `https://VOTRE-DOMAINE/mandat.html?...`

| Paramètre   | Exemple       | Description |
|------------|---------------|-------------|
| `name`     | `Jean Dupont` | Nom et prénom du passager référent |
| `phone`    | `+33 6 12 34 56 78` | Téléphone |
| `address`  | `10 rue de la Paix, 75002 Paris` | Adresse |
| `email`    | `jean@example.com` | Email |
| `vol`      | `AF718`       | Numéro de vol (principal) |
| `date`     | `15/03/2025`  | Date du vol (format fr) |
| `route`    | `Paris CDG → Dakar` | Trajet (départ → arrivée) |
| `motif`    | `Retard`      | Motif (Retard, Annulation, Surbooking, Correspondance manquée) |
| `motif_en` | `Delay`       | Optionnel, anglais |
| `pnr`      | `ABC12D`      | Code réservation |
| **`compagnie`** | **`Air France`** | **Compagnie qui effectue le vol** |
| `paxlist`  | `Marie Dupont, Paul Dupont` | Autres passagers (séparés par des virgules) |
| `nbpax`    | `3`           | Nombre total de passagers |
| `indemnite`| `600`         | Montant indemnité par passager : `250`, `400` ou `600` |

Exemple d’URL complète (à encoder en cas de caractères spéciaux) :

```
/mandat.html?name=Jean%20Dupont&phone=%2B33%20612345678&email=jean%40example.com&vol=AF718&date=15%2F03%2F2025&route=Paris%20CDG%20%E2%86%92%20Dakar&motif=Retard&pnr=ABC12D&compagnie=Air%20France&paxlist=Marie%20Dupont&nbpax=2&indemnite=600
```

Dans Make, construisez cette URL avec les champs du webhook (et, si vous faites de l’OCR, avec les valeurs extraites de la carte d’embarquement). La page **mandat.html** affichera notamment la **compagnie qui effectue le vol** dans la section 1 du mandat.

---

## 4. Une fois le mandat créé : confirmation email + SMS

Dès que le dossier est reçu et que le mandat est considéré comme “créé” (par exemple après réception de la signature dans le webhook, ou après génération du PDF mandat) :

1. **Email de confirmation** au client (`email`)  
   - Objet du type : « Dossier reçu — Robin des Airs »  
   - Contenu : rappel du vol, du PNR, de la compagnie, et lien vers le mandat (URL ci‑dessus) ou pièce jointe PDF du mandat si vous l’avez généré.

2. **SMS de confirmation** au client (`whatsapp` / numéro de téléphone)  
   - Court message du type : « Robin des Airs : nous avons bien reçu votre dossier [vol XX XXXX]. Vous recevrez un email de confirmation. »

Make peut enchaîner : Webhook → (Vérifications / OCR) → Construction URL mandat → **Email** (Gmail, SMTP, etc.) → **SMS** (Twilio, etc.).

---

## 5. Préparer l’envoi AR24

Un **AR24** (lettre recommandée électronique avec preuve) doit contenir au minimum :

| Pièce | Contenu |
|-------|--------|
| **Mise en demeure** | Texte type (voir `protocole-siege/partie-1-compagnie/jour-30-mise-en-demeure.md`). Objet conseillé : `Indemnisation EU261 — [PNR] — [NOM] [Prénom] — Vol [N° de Vol]`. |
| **Mandat** | PDF du mandat (généré à partir de l’URL du mandat ci‑dessus, ou fichier signé reçu). |
| **Justificatifs** | Carte(s) d’embarquement (`file_boarding`), pièce(s) d’identité (`file_id`), et tout autre justificatif utile. |

Dans Make, vous pouvez :

- Créer un **dossier** (Google Drive, Dropbox, etc.) par dossier client.
- Y déposer : la mise en demeure (PDF ou document), le mandat (PDF), les fichiers reçus (`file_boarding`, `file_id`).
- Soit déclencher un envoi AR24 via un partenaire (La Poste, etc.) à partir de ce dossier, soit produire un **PDF unique** “pack AR24” à envoyer en recommandé.

Convention d’objet recommandée pour la mise en demeure (cohérente avec le protocole siège) :

`Indemnisation EU261 — [PNR] — [NOM] [Prénom] — Vol [N° de Vol]`

---

## 6. Récapitulatif du flux Make proposé

```
[Webhook] Reçoit formulaire + file_boarding + file_id + mandat_signature
    ↓
[Optionnel] Parser / OCR carte d’embarquement → extraire vol, date, noms, compagnie
    ↓
[Router / Set variable] Vérifier et retenir : numéro de vol, date, noms, compagnie qui effectue le vol
    ↓
[Set variable] Construire l’URL du mandat (tous les paramètres, dont compagnie et indemnite)
    ↓
[HTTP / Convert HTML to PDF] (optionnel) Générer le PDF du mandat à partir de cette URL
    ↓
[Email] Envoyer au client : confirmation + lien mandat ou PDF en pièce jointe
    ↓
[SMS] Envoyer au client : confirmation SMS
    ↓
[Google Drive / Dropbox] Créer dossier client et y déposer : mise en demeure, mandat (PDF), justificatifs (file_boarding, file_id)
    ↓
[AR24 / Partenaire] Préparer ou déclencher l’envoi recommandé avec ce dossier
```

---

## 7. Modifications récentes dans le site

- **Mandat** : le paramètre d’URL **`compagnie`** est pris en charge et affiché dans le mandat comme « Compagnie qui effectue le vol / Operating carrier ».
- **Mandat** : le paramètre **`indemnite`** (250, 400 ou 600) permet d’adapter le tableau de créance au montant par passager.
- Le formulaire **Dépôt en ligne** envoie déjà `compagnie` au webhook et inclut `compagnie` dans le lien du mandat.

Si vous utilisez un autre formulaire ou une entrée manuelle, pensez à toujours passer **`compagnie`** et **`indemnite`** dans l’URL du mandat pour que le document soit complet et cohérent avec la mise en demeure et l’AR24.

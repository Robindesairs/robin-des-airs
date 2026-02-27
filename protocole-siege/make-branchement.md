# Branchement Make.com — Protocole de Siège Robin des Airs

Guide pour connecter le protocole (emails compagnie + stop automatique) dans un scénario Make.

---

## 1. Données nécessaires par dossier

À stocker (Google Sheet ou Data Store Make) pour chaque dossier :

| Champ Make (variable) | Description | Exemple |
|-----------------------|-------------|---------|
| `pnr` | Code réservation 6 caractères | ABC123 |
| `nom` | Nom du passager | DUPONT |
| `prenom` | Prénom | Marie |
| `vol` | Numéro de vol | AF718 |
| `date_vol` | Date du vol | 2025-02-15 |
| `date_ouverture` | Date d’envoi JOUR 0 (pour calcul J+10, J+20…) | 2025-02-26 |
| `type_incident` | Retard ou Annulation | Retard |
| `heures` | Nombre d’heures (retard) | 5 |
| `alias_proxy` | Adresse email dédiée au dossier | dossier-ABC123@… |
| `statut` | `en_cours` ou `accord_recu` | en_cours |
| `jour0_sent` | JOUR 0 envoyé (oui/non) | 1 |
| `jour10_sent` | JOUR 10 envoyé | 0 |
| `jour20_sent` | JOUR 20 envoyé | 0 |
| `jour30_sent` | JOUR 30 envoyé | 0 |
| `jour60_sent` | JOUR 60 envoyé | 0 |

**Objet unique pour tout le fil (à réutiliser partout) :**
```
Indemnisation EU261 — {{pnr}} — {{nom}} {{prenom}} — Vol {{vol}}
```

---

## 2. Vue d’ensemble du scénario

- **Scénario A — Envoi des relances**  
  Déclenché tous les jours (Schedule). Lit les dossiers `statut = en_cours`, calcule le jour courant (J0, J10, J20, J30, J60), envoie l’email correspondant si pas encore envoyé, met à jour le sheet/store.

- **Scénario B — Stop automatique**  
  Déclenché à chaque email reçu sur la boîte (Gmail / IMAP). Si le corps contient "Accord" ou "Indemnité", met à jour le dossier en `statut = accord_recu` (plus de relance).

---

## 3. Scénario A — Envoi des relances

### 3.1 Déclencheur
- **Module :** `Schedule`  
- **Réglage :** Exécuter une fois par jour (ex. 9h00 Europe/Paris).

### 3.2 Récupérer les dossiers à traiter
- **Module :** `Google Sheets` > **Search Rows** (ou **Data Store** > **Search records**).  
- **Condition :**  
  - `statut` = `en_cours`  
  - (optionnel) `date_ouverture` ≤ aujourd’hui.

### 3.3 Boucle sur chaque dossier
- **Module :** `Iterator` (si plusieurs lignes) ou enchaînement direct (si un seul dossier par run).  
- **Entrée :** tableau des lignes renvoyées par la recherche.

### 3.4 Calcul du « jour » et choix de la relance
Pour chaque dossier, calculer le nombre de jours depuis `date_ouverture` :

- **Module :** `Set variable` (ou **Tools** > **Parse date** + **Math**).  
  - Exemple : `jours_ecoules = daysBetween(now, date_ouverture)`.

Ensuite, router selon le jour et les flags déjà envoyés (ex. avec un **Router** ou plusieurs **Router** en chaîne) :

| Si | Et | Alors |
|----|-----|--------|
| `jours_ecoules >= 0` | `jour0_sent = 0` | Envoyer **JOUR 0** (Salve initiale), puis mettre `jour0_sent = 1` |
| `jours_ecoules >= 10` | `jour10_sent = 0` | Envoyer **JOUR 10** (Relance 1), puis `jour10_sent = 1` |
| `jours_ecoules >= 20` | `jour20_sent = 0` | Envoyer **JOUR 20** (Relance 2), puis `jour20_sent = 1` |
| `jours_ecoules >= 30` | `jour30_sent = 0` | Envoyer **JOUR 30** (Mise en demeure), puis `jour30_sent = 1` |
| `jours_ecoules >= 60` | `jour60_sent = 0` | Envoyer **JOUR 60** (Transfert justice), puis `jour60_sent = 1` |

En Make, ça se fait avec un **Router** à plusieurs branches : chaque branche a un filtre (filter) sur `jours_ecoules` et le `jourX_sent` correspondant.

### 3.5 Envoi d’email (chaque branche)

- **Module :** `Gmail` > **Send an Email** (ou **SMTP** / **Email** selon ton compte).  
- **To :** adresse réclamation de la compagnie (à définir par dossier ou par compagnie dans le sheet).  
- **From :** ton adresse d’envoi (ou alias).  
- **Reply-To :** `{{alias_proxy}}` pour garder le fil sur le proxy.  
- **Subject (identique à chaque envoi) :**  
  `Indemnisation EU261 — {{pnr}} — {{nom}} {{prenom}} — Vol {{vol}}`  
- **Body :** copier le corps depuis les fichiers `jour-00-salve-initiale.md`, `jour-10-relance-1.md`, etc., en remplaçant les placeholders par les variables Make (`{{pnr}}`, `{{nom}}`, `{{prenom}}`, `{{vol}}`, `{{date_vol}}`, `{{type_incident}}`, `{{heures}}`, `{{alias_proxy}}`, `{{date_ouverture}}` selon le cas).  
- **Pièces jointes (JOUR 0 uniquement) :** mandat signé + pièce d’identité (URL ou fichier depuis Google Drive / Dropbox selon ton setup).

### 3.6 Mise à jour du dossier après envoi
- **Module :** `Google Sheets` > **Update a Row** (ou **Data Store** > **Update a record**).  
- **Action :** mettre à jour la ligne du dossier avec le champ concerné : `jour0_sent = 1`, ou `jour10_sent = 1`, etc.

---

## 4. Scénario B — Stop automatique (accord / indemnité)

### 4.1 Déclencheur
- **Module :** `Gmail` > **Watch Emails** (ou **Trigger Email** selon connexion).  
- **Mailbox :** la boîte qui reçoit les réponses (alias proxy ou une boîte centrale qui reçoit tout).  
- **Déclenchement :** à chaque nouvel email reçu.

### 4.2 Détection « Accord » / « Indemnité »
- **Module :** `Router`.  
- **Branche 1 — Stop :**  
  - **Filter :**  
    - `Text search` (ou `Contains`) dans le corps du mail (body) : `Accord` **OU** `Indemnité`.  
  - Si oui → aller à l’étape 4.3.  
- **Branche 2 — Pas de stop :**  
  - Aucune action (fin du scénario).

### 4.3 Identifier le dossier (PNR)
- Extraire le PNR depuis l’objet ou le corps du mail (ex. regex sur `Indemnisation EU261 — (XXX...) — …` ou parsing du subject).  
- **Module :** `Set variable` ou **Tools** > **Text parser** / **Regex** pour obtenir `pnr`.

### 4.4 Mettre à jour le statut
- **Module :** `Google Sheets` > **Search Rows** avec `pnr` = PNR extrait.  
- Puis **Update a Row** : mettre `statut` = `accord_recu` (et éventuellement une date `date_accord`).  

Ou en **Data Store** : **Search records** par PNR, puis **Update a record** avec `statut` = `accord_recu`.

Résultat : au prochain run du Scénario A, ce dossier ne sera plus dans `statut = en_cours`, donc plus aucune relance envoyée.

---

## 5. Mapping corps d’email → variables Make

À utiliser dans le corps (Send Email) pour chaque relance :

| Placeholder dans le .md | Variable Make |
|-------------------------|----------------|
| [PNR] | `{{pnr}}` |
| [NOM DU PASSAGER] / [NOM] | `{{nom}}` |
| [Prénom] | `{{prenom}}` |
| [N° de Vol] / [N° de Vol] | `{{vol}}` |
| [Date] / [Date Jour 0] | `{{date_ouverture}}` ou `{{date_vol}}` selon le mail |
| [Retard / Annulation] | `{{type_incident}}` |
| [X] (heures) | `{{heures}}` |
| [TON ALIAS PROXY] | `{{alias_proxy}}` |

---

## 6. Ordre des modules (résumé Scénario A)

```
Schedule (1x/jour)
  → Google Sheets: Search Rows (statut = en_cours)
  → Iterator (pour chaque ligne)
    → Set variable: jours_ecoules = daysBetween(now, date_ouverture)
    → Router
      → [Branche J0]  Filter: jours_ecoules>=0 et jour0_sent=0  → Gmail Send (corps JOUR 0) → Sheets Update jour0_sent=1
      → [Branche J10] Filter: jours_ecoules>=10 et jour10_sent=0 → Gmail Send (corps JOUR 10) → Sheets Update jour10_sent=1
      → [Branche J20] Filter: jours_ecoules>=20 et jour20_sent=0 → Gmail Send (corps JOUR 20) → Sheets Update jour20_sent=1
      → [Branche J30] Filter: jours_ecoules>=30 et jour30_sent=0 → Gmail Send (corps JOUR 30) → Sheets Update jour30_sent=1
      → [Branche J60] Filter: jours_ecoules>=60 et jour60_sent=0 → Gmail Send (corps JOUR 60) → Sheets Update jour60_sent=1
```

---

## 7. Ordre des modules (résumé Scénario B)

```
Gmail: Watch Emails (boîte proxy / centrale)
  → Router
    → Filter: body contains "Accord" OR body contains "Indemnité"
      → Text parser / Regex: extraire PNR du subject
      → Google Sheets: Search Rows (pnr = PNR)
      → Google Sheets: Update Row (statut = accord_recu)
```

---

## 8. Bonnes pratiques

- **Toujours** utiliser le même **Subject** pour tous les mails d’un même dossier (voir section 1).  
- **Reply-To** = `{{alias_proxy}}` pour que les réponses arrivent sur la boîte surveillée par le Scénario B.  
- Tester d’abord avec un seul dossier et des délais courts (ex. 1 min au lieu de 10 jours) pour valider la chaîne.  
- Pièces jointes JOUR 0 : prévoir un stockage (Drive/Dropbox) et lier le fichier dans Make (lien ou ID) par dossier.

Tu peux coller les corps des fichiers `jour-00-…`, `jour-10-…`, etc. dans les modules **Content** des envois Gmail et remplacer les `[…]` par les variables `{{…}}` comme dans le tableau section 5.

---

## 9. Structure Google Sheet « Dossiers »

Créer une feuille avec une ligne d’en-tête et une ligne par dossier, ex. :

| pnr | nom | prenom | vol | date_vol | date_ouverture | type_incident | heures | alias_proxy | email_compagnie | statut | jour0_sent | jour10_sent | jour20_sent | jour30_sent | jour60_sent |
|-----|-----|--------|-----|----------|-----------------|---------------|--------|-------------|-----------------|--------|------------|-------------|-------------|-------------|-------------|
| ABC123 | DUPONT | Marie | AF718 | 2025-02-15 | 2025-02-26 | Retard | 5 | dossier-ABC123@… | reclamation@airfrance.fr | en_cours | 0 | 0 | 0 | 0 | 0 |

- **email_compagnie** : adresse à laquelle envoyer les relances (à remplir par dossier ou par règle selon la compagnie).
- Après envoi JOUR 0, passer `jour0_sent` à 1 ; idem pour les autres.
- Quand le Scénario B détecte un accord, passer `statut` à `accord_recu`.

---

## 10. Objet à mettre dans Make (copier-coller)

Dans **Subject** du module Gmail (tous les envois) :

```
Indemnisation EU261 — {{pnr}} — {{nom}} {{prenom}} — Vol {{vol}}
```

Vérifier que les noms de colonnes du Sheet correspondent aux variables utilisées (`pnr`, `nom`, `prenom`, `vol`, etc.).

# Netlify 404 — À faire pour que le site s’affiche

## 1. Vérifier la structure sur GitHub

Ouvre ton dépôt : **https://github.com/Robindesairs/robin-des-airs**

- **Est-ce que tu vois `index.html` à la racine** (même niveau que les dossiers comme `.git`) ?
  - **OUI** → passe à l’étape 2, section A.
  - **NON** (par ex. tout est dans un dossier `files/` ou `site/`) → passe à l’étape 2, section B.

## 2. Réglages dans Netlify

Va sur **https://app.netlify.com** → ton site → **Site configuration** (ou **Build & deploy**).

### Section A — Si `index.html` est à la racine du dépôt

- **Build & deploy** → **Build settings** → **Edit settings**.
- **Publish directory** : mets **`.`** (un point) ou laisse **vide**.
- **Build command** : laisse **vide**.
- **Save**.

### Section B — Si `index.html` est dans un sous-dossier (ex. `files/`)

- **Build & deploy** → **Build settings** → **Edit settings**.
- **Base directory** : laisse vide (ou mets le dossier parent si ton site est dans un sous-dossier d’un monorepo).
- **Publish directory** : mets le **nom du dossier** qui contient `index.html`, par ex. **`files`**.
- **Build command** : laisse **vide**.
- **Save**.

## 3. Vérifier la branche

- **Build & deploy** → **Continuous deployment** → **Branch to deploy**.
- Ça doit être la branche où tu pushes (souvent **main** ou **master**).

## 4. Redéployer

- Onglet **Deploys**.
- **Trigger deploy** → **Deploy site** (sans "Clear cache" d’abord, réessayer avec "Clear cache and deploy" si ça ne change rien).

## 5. Vérifier le dernier déploiement

- Dans **Deploys**, ouvre le dernier déploiement.
- Regarde les **logs** : est-ce que le build est **Published** ? Y a-t-il des erreurs ?
- Si tu vois une ligne du type "No files to publish" ou "Directory X is empty", le **Publish directory** est mauvais → reviens à l’étape 2.

## 6. Si ça ne marche toujours pas

Envoie-moi (ou note) :

1. L’**URL exacte** du site Netlify (ex. `https://xxx.netlify.app`).
2. Une **capture** ou la **liste** des fichiers à la racine de ton dépôt GitHub (ce que tu vois sur https://github.com/Robindesairs/robin-des-airs).
3. Ce que tu as mis dans **Publish directory** et **Build command** dans Netlify.

Avec ça on pourra cibler le réglage exact.

# Utiliser Cursor (et le projet Robin des Airs) sur un autre ordinateur

Ce guide permet d’avoir le même environnement Cursor et le même projet sur plusieurs ordinateurs.

---

## Partie 1 : Synchroniser Cursor (paramètres, extensions)

À faire **sur chaque ordinateur** où tu utilises Cursor.

### Sur cet ordinateur (le premier)

1. Ouvre **Cursor**.
2. Va dans **Cursor** (menu en haut) → **Settings** → **Settings Sync**  
   ou **File** → **Preferences** → **Turn on Settings Sync**.
3. Connecte-toi avec ton **compte Cursor** (GitHub ou email).
4. Choisis ce que tu veux synchroniser : **Settings**, **Extensions**, **Keybindings** (au minimum Settings + Extensions).
5. La sync est activée : tes réglages et extensions sont envoyés dans le cloud Cursor.

### Sur l’autre ordinateur

1. Télécharge et installe **Cursor** : https://cursor.com
2. Ouvre Cursor et **connecte-toi avec le même compte Cursor** que sur le premier PC.
3. Active **Settings Sync** (même menu que ci-dessus) : tes paramètres et extensions se téléchargent automatiquement.

Tu as ainsi la même interface et les mêmes outils sur les deux machines.

---

## Partie 2 : Récupérer le projet sur l’autre ordinateur

### Première fois sur l’autre PC

1. Ouvre un terminal (Terminal, PowerShell, ou Cursor intégré).
2. Va dans le dossier où tu veux mettre le projet (ex. `Documents` ou `Desktop`) :
   ```bash
   cd ~/Documents
   ```
3. Clone le dépôt :
   ```bash
   git clone https://github.com/Robindesairs/robin-des-airs.git
   cd robin-des-airs
   ```
4. Ouvre ce dossier dans Cursor : **File** → **Open Folder** → sélectionne `robin-des-airs`.

### Fichiers à recréer (secrets non versionnés)

Ils ne sont pas sur GitHub pour la sécurité. Tu dois les recréer à la main (ou les copier depuis ton autre PC de façon sécurisée).

**À la racine du projet** (si tu utilises le radar / Amadeus en local) :

- Copie `.env.example` en `.env` :
  ```bash
  cp .env.example .env
  ```
- Ouvre `.env` et remplis les clés (Amadeus, etc.) que tu utilises.

**Dans le dossier CRM** (robin-dossiers) :

- Copie `.env.local.example` en `.env.local` :
  ```bash
  cd robin-dossiers
  cp .env.local.example .env.local
  ```
- Ouvre `.env.local` et mets :
  - `NEXT_PUBLIC_SUPABASE_URL` (déjà dans l’example)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (clé anon Supabase)
  - `DATABASE_URL` avec le mot de passe Supabase (Dashboard → Project Settings → Database)

Les variables utilisées par **Netlify** (WhatsApp, Gemini, etc.) sont dans l’interface Netlify → Environment variables, pas dans un fichier local : rien à faire de plus pour le déploiement.

---

## Partie 3 : Routine entre les deux ordinateurs

### Quand tu quittes un ordinateur (après avoir travaillé)

Dans le terminal, à la racine du projet :

```bash
cd /chemin/vers/robin-des-airs   # ou simplement cd robin-des-airs si tu es déjà dedans
git add -A
git status                        # vérifier les fichiers ajoutés
git commit -m "Description courte de ce que tu as fait"
git push origin main
```

Ton travail est alors sur GitHub et disponible sur l’autre PC.

### Quand tu arrives sur l’autre ordinateur (avant de travailler)

Dans le terminal, à la racine du projet :

```bash
cd robin-des-airs
git pull origin main
```

Puis ouvre le dossier **robin-des-airs** dans Cursor si ce n’est pas déjà fait.

---

## En résumé

| Où | Action |
|----|--------|
| **Cursor (les 2 PC)** | Même compte Cursor + Settings Sync activée |
| **Autre PC (1re fois)** | `git clone https://github.com/Robindesairs/robin-des-airs.git` puis ouvrir le dossier dans Cursor |
| **Autre PC (1re fois)** | Créer `.env` et `robin-dossiers/.env.local` à partir des `.example` |
| **En quittant un PC** | `git add -A` → `git commit -m "..."` → `git push` |
| **En arrivant sur l’autre** | `git pull origin main` |

Une fois cette routine en place, tu peux utiliser Cursor et le projet Robin des Airs indifféremment sur l’un ou l’autre ordinateur.

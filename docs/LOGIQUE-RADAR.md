# Radar Robin des Airs — Surveillance des vols Afrique ↔ Europe

Ce document définit le périmètre et les règles d’affichage du radar (tableau des vols en retard).

---

## 1. Périmètre

**Objet :** surveillance des vols entre **toute l’Afrique** et **toute l’Europe**.

- **Afrique** : tout le continent africain (tous les pays et territoires).
- **Europe** : tout le continent européen (tous les pays et territoires).

Les vols concernés sont ceux qui relient un aéroport en Afrique à un aéroport en Europe, ou l’inverse.

---

## 2. Priorité dans le tableau (du haut vers le bas)

L’élément le plus important est de voir **quels vols vont être en retard**. Le tableau affiche en priorité :

| Ordre | Couleur | Retard              | Signification        |
|-------|---------|---------------------|----------------------|
| **1** | **ROUGE**   | ≥ 2h30 (150 min)    | Plus de 2h30 de retard |
| **2** | **ORANGE**  | 1h à 2h30 (60–149 min) | Entre 1h et 2h30      |
| **3** | **JAUNE**   | ~1h / à surveiller (30–59 min) | Un peu plus d’une heure |
| 4     | Vert    | &lt; 30 min         | RAS                  |
| 5     | Gris    | —                   | Hors périmètre (non éligible) |

Les vols **rouges** sont donc tout en haut, puis les **orange**, puis les **jaunes**.

---

## 3. Où est le fichier du radar et comment l’ouvrir

### Fichier à ouvrir : la **page du tableau** (le radar)

- **Nom du fichier :** `radar.html`
- **Emplacement dans ton projet :** à la **racine** du dossier du site (au même niveau que `index.html`).

**Chemin complet sur ton Mac :**
```
/Users/climbie/Downloads/files/radar.html
```

### Comment l’ouvrir

**Option A — Dans le navigateur (une fois le site déployé sur Netlify)**  
1. Déploie ton site sur Netlify (git push).  
2. Ouvre ton navigateur (Chrome, Safari, etc.).  
3. Dans la barre d’adresse, tape l’URL de ton site puis `/radar.html`.  
   - Exemple : `https://robindesairs.netlify.app/radar.html`  
   (remplace par ton vrai nom de site si différent).  
4. Tu vois le tableau des vols avec les couleurs ROUGE, ORANGE, JAUNE en tête.

**Option B — Depuis ton ordinateur (sans déployer)**  
1. Ouvre le **Finder**.  
2. Va dans : **Téléchargements** → dossier **files**.  
3. Tu dois voir le fichier **radar.html**.  
4. **Double-clique** sur `radar.html` : il s’ouvre dans ton navigateur par défaut.  
   - Si ça ouvre un éditeur de texte à la place : clic droit sur `radar.html` → **Ouvrir avec** → **Chrome** (ou Safari, Firefox).

**Option C — Depuis Cursor (ton éditeur)**  
1. Dans Cursor, **Cmd + P** (Mac) ou **Ctrl + P** (Windows).  
2. Tape **radar**.  
3. Ouvre **radar.html** pour modifier le code.  
4. Pour **voir** le tableau dans un navigateur : dans l’explorateur de fichiers à gauche, clic droit sur **radar.html** → **Reveal in Finder** (ou **Open in File Manager**), puis double-clique sur le fichier pour l’ouvrir dans le navigateur.

En résumé : le fichier du tableau est **radar.html**, il est dans **Downloads/files/**. Tu peux l’ouvrir en double-cliquant dessus dans le Finder, ou en allant sur **ton-site.netlify.app/radar.html** après déploiement.

---

*Dernière mise à jour : février 2026.*

# Déploiement Robin des Airs — Passerelles Cursor → Site en ligne

## Pourquoi les modifs dans Cursor n’apparaissent pas sur le site ?

Le site en ligne est servi par **Netlify**, qui déploie **uniquement le contenu du dépôt GitHub**.  
Tant que tes changements ne sont pas **committés et poussés** sur GitHub, Netlify ne les voit pas.

## Chaîne complète (à faire après chaque série de modifs)

| Étape | Où | Action |
|--------|-----|--------|
| 1 | **Cursor** | Sauvegarder les fichiers (Cmd+S) |
| 2 | **Terminal / Cursor** | `git add .` (ou ajouter les fichiers modifiés) |
| 3 | **Terminal / Cursor** | `git commit -m "Description des changements"` |
| 4 | **Terminal / Cursor** | `git push origin main` |
| 5 | **Netlify** | Déploiement automatique (1–2 min après le push) |

## Vérifications utiles

- **Voir ce qui n’est pas encore poussé :**  
  `git status`
- **Voir le dernier commit sur GitHub :**  
  https://github.com/Robindesairs/robin-des-airs/commits/main
- **Voir les déploiements Netlify :**  
  Netlify → ton site → Deploys

## Résumé

- **Cursor** = éditeur local (tes fichiers sur ta machine).
- **Git** = enregistre les versions (commit) et envoie sur GitHub (push).
- **GitHub** = dépôt distant que Netlify surveille.
- **Netlify** = héberge le site à partir du contenu du dépôt.

Sans **commit + push**, le site en ligne ne change pas.

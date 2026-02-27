# Vérification Netlify ↔ GitHub — Robin des Airs

## Ce que le dépôt attend

- **Dépôt GitHub :** `https://github.com/Robindesairs/robin-des-airs`
- **Branche à déployer :** `main`
- **Répertoire à publier :** `.` (racine du dépôt) — défini dans `netlify.toml`

---

## Checklist dans Netlify (à faire par toi)

1. **Ouvre Netlify**  
   → [app.netlify.com](https://app.netlify.com) et connecte-toi.

2. **Ouvre le site Robin des Airs**  
   → Clique sur le nom du site dans la liste.

3. **Vérifier la connexion au dépôt**  
   - Menu **Site configuration** (ou **Site settings**).  
   - Section **Build & deploy** → **Continuous deployment**.  
   - Tu dois voir :
     - **Repository :** `Robindesairs/robin-des-airs` (ou `Robindesairs/robin-des-airs.git`).
     - **Branch :** `main`.  
   - Si ce n’est pas le cas : **Link repository** / **Link to Git provider** et choisis ce dépôt + branche `main`.

4. **Vérifier le répertoire de publication**  
   - Dans **Build & deploy** → **Build settings** (ou **Build**).  
   - **Base directory** : laisser vide (ou `""`).  
   - **Publish directory** : doit être **`.`** (point).  
   - Netlify peut prendre la valeur depuis `netlify.toml` ; si tu as mis `publish = "."` dans le fichier, c’est bon.

5. **Vérifier les déploiements**  
   - Onglet **Deploys**.  
   - Après un `git push origin main`, un nouveau déploiement doit apparaître (souvent en 1–2 min).  
   - Statut **Published** = le site en ligne est à jour.

6. **Déclencher un déploiement manuel (optionnel)**  
   - **Deploys** → **Trigger deploy** → **Deploy site**.  
   - Utile pour forcer un déploiement sans nouveau push.

---

## Résumé

| À vérifier | Valeur attendue |
|------------|------------------|
| Repo connecté | `Robindesairs/robin-des-airs` |
| Branche | `main` |
| Publish directory | `.` |
| Dernier deploy | Déclenché après ton dernier `git push` |

Si tout est correct, les prochains `git push origin main` mettront le site à jour automatiquement.

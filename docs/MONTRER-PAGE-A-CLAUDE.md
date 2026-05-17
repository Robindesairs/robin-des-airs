# Montrer l’espace agence à Claude

## Méthode 1 — Un seul fichier (la plus simple)

1. Dans le repo : **`espace-agence-maquette.html`** (~20 Ko, tout-en-un, pas d’API).
2. Sur [claude.ai](https://claude.ai) → nouvelle conversation ou **Projet**.
3. Cliquer sur **📎 Joindre** et glisser `espace-agence-maquette.html`.
4. Écrire :

   > Voici la maquette UI cible. Reproduis cette structure dans `espace-agence.html` et `assets/agence-portal.js`. Voir aussi `docs/PROMPT-ESPACE-AGENCE.md` si je l’ajoute.

5. Ouvrir le fichier **en local** pour toi : double-clic ou  
   `python3 -m http.server 8765` → http://127.0.0.1:8765/espace-agence-maquette.html  
   (boutons en haut : Connexion / Tableau de bord / Nouveau dossier).

---

## Méthode 2 — URL publique (Claude peut « voir » le rendu)

Après `git push` sur `main`, la page est en ligne si Netlify déploie le repo :

**https://robindesairs.eu/espace-agence-maquette.html**

Dans Claude (avec recherche web activée) :

> Ouvre et décris la maquette : https://robindesairs.eu/espace-agence-maquette.html  
> Puis implémente le même UI dans le repo robin-des-airs.

**Avant le push** — URL temporaire en 30 secondes :

```bash
cd /chemin/vers/robin-des-airs
npx --yes surge . espace-agence-maquette.surge.sh
# Puis ouvrir : https://espace-agence-maquette.surge.sh/espace-agence-maquette.html
```

---

## Méthode 3 — Pack zip (maquette + code + prompt)

```bash
./scripts/claude-bundle.sh
```

Fichier créé : **`dist/pour-claude-espace-agence.zip`**

À joindre dans Claude Projet (tout le zip) ou dézipper et joindre les fichiers listés dans le README du zip.

---

## Méthode 4 — Projet Claude (recommandé pour gros chantier)

Créer un **Projet** « Robin espace agence » et y mettre en permanence :

| Fichier | Pourquoi |
|---------|----------|
| `espace-agence-maquette.html` | Référence visuelle |
| `docs/PROMPT-ESPACE-AGENCE.md` | Spec technique |
| `espace-agence.html` | Code actuel |
| `assets/agence-portal.js` | Logique formulaire / API |
| `netlify/functions/agency-dossiers.js` | API POST |

Instructions du projet :

> Tu modifies uniquement l’espace agence. La maquette HTML fait foi pour l’UI. Pas de script démo inline. Email client généré serveur (ref@robindesairs.eu).

---

## Ce que Claude ne peut pas faire seul

- Voir ton `localhost` sans tunnel (utiliser surge ou push Netlify).
- Se connecter à ton Netlify / Airtable (donner les specs API dans le prompt, pas les secrets).

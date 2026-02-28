# API Amadeus — Recherche aéroports et villes

Les champs **Départ** et **Arrivée** (diagnostic et dépôt en ligne) utilisent l’API **Amadeus Airport & City Search**. Dès que l’utilisateur tape **3 caractères**, une requête est envoyée pour suggérer villes et aéroports mondiaux. L’affichage est au format : **Nom de la ville (Code IATA) – Nom de l’aéroport**.

## Sécuriser la clé API (obligatoire)

La clé API ne doit **jamais** apparaître dans le code frontend (HTML/JS). Elle est utilisée uniquement côté **serveur**, dans une fonction Netlify qui fait office de proxy.

1. **Créer un compte** sur [Amadeus for Developers](https://developers.amadeus.com/) et récupérer une **API Key** + **API Secret** (environnement Test ou Production).
2. **Configurer les variables d’environnement sur Netlify** :
   - Netlify → ton site → **Site configuration** → **Environment variables**
   - Ajouter :
     - `AMADEUS_CLIENT_ID` = ta clé API (API Key)
     - `AMADEUS_CLIENT_SECRET` = ton secret (API Secret)
   - Optionnel : `AMADEUS_HOST` = `test.api.amadeus.com` (test) ou `api.amadeus.com` (prod). Par défaut le proxy utilise l’environnement de test.
3. **Redéployer** le site après avoir ajouté les variables (ou déclencher un nouveau déploiement).

Le frontend appelle uniquement l’URL du proxy : `/.netlify/functions/airport-search?keyword=xxx`. C’est la fonction Netlify qui possède les identifiants et appelle Amadeus ; le navigateur ne voit jamais la clé.

## Comportement

- **Sans variables d’environnement** : la fonction renverra une erreur ; le site utilisera en secours la liste statique d’aéroports (`data/airports.js`) pour la recherche locale.
- **Avec variables configurées** : les suggestions viennent d’Amadeus (villes et aéroports du monde).

## LocalStorage (liaison WhatsApp / étape suivante)

Dès qu’une ville est **choisie** (sélection dans la liste), elle est enregistrée dans le **LocalStorage** du navigateur, pour pouvoir être réutilisée à l’étape suivante (par exemple après que l’utilisateur ait donné son numéro WhatsApp ou soit passé à l’écran suivant). Clés utilisées notamment :

- `robin_ville_depart` / `robin_ville_arrivee` (diagnostic vol direct)
- `robin_eb_ville_depart_1`, `robin_eb_ville_arrivee_1`, etc. (diagnostic avec escale)
- `robin_leg1_dep`, `robin_leg1_arr`, etc. (dépôt en ligne, legs)

Les libellés affichés sont aussi stockés dans `robin_*_text` pour réaffichage si besoin.

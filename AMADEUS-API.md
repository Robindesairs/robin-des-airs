# API recherche aéroports et villes (Aviation Edge / Amadeus)

Les champs **Départ** et **Arrivée** (diagnostic et dépôt en ligne) appellent le proxy `/.netlify/functions/airport-search`. Dès que l’utilisateur tape **3 caractères**, une requête est envoyée pour suggérer villes et aéroports. L’affichage est au format : **Nom de la ville (Code IATA) – Nom de l’aéroport**.

Le proxy utilise **Aviation Edge** en priorité ; si la réponse est vide ou en erreur, **Amadeus** est appelé en secours. Les clés ne sont **jamais** exposées côté frontend.

---

**Brancher Amadeus** : compte sur [developers.amadeus.com](https://developers.amadeus.com/) → récupérer API Key + API Secret → sur Netlify ajouter `AMADEUS_CLIENT_ID` et `AMADEUS_CLIENT_SECRET` → redéployer. Détail ci‑dessous.

## Option 1 : Aviation Edge (recommandé — une seule clé)

1. **Obtenir une clé** sur [Aviation Edge](https://aviation-edge.com/airport-autocomplete/) (autocomplete cities & airports).
2. **Sur Netlify** : **Site configuration** → **Environment variables**  
   - `AVIATION_EDGE_KEY` = ta clé API (clé secrète, jamais exposée au client)
3. Redéployer. Aucune autre variable nécessaire.

## Option 2 : Amadeus (brancher en secours ou en priorité)

1. **Créer un compte** sur [Amadeus for Developers](https://developers.amadeus.com/).
2. Dans le dashboard : **My Self-Service APIs** → créer ou ouvrir une app → récupérer **API Key** (Client ID) et **API Secret**.
3. **Sur Netlify** : **Site configuration** → **Environment variables** → **Add a variable** / **Add multiple** :
   - `AMADEUS_CLIENT_ID` = ta **API Key** (Client ID)
   - `AMADEUS_CLIENT_SECRET` = ton **API Secret**
   - (Optionnel) `AMADEUS_HOST` = `test.api.amadeus.com` pour le sandbox, ou `api.amadeus.com` pour la prod.
4. **Redéployer** le site (Deploys → Trigger deploy).

Une fois branché, le proxy `airport-search` utilise **Aviation Edge en premier** ; si la réponse est vide ou en erreur, il appelle **Amadeus** automatiquement.

Le frontend appelle uniquement `/.netlify/functions/airport-search?keyword=xxx`. C’est la fonction Netlify qui possède les identifiants et appelle Aviation Edge ou Amadeus ; le navigateur ne voit jamais les clés.

## Comportement

- **Sans aucune clé** (ni Aviation Edge ni Amadeus) : le proxy renvoie une liste vide ; le site utilise en secours la liste statique (`data/airports.js`) pour la recherche locale.
- **Avec `AVIATION_EDGE_KEY`** : les suggestions viennent d’Aviation Edge (villes et aéroports du monde).
- **Avec uniquement Amadeus** (sans Aviation Edge) : les suggestions viennent d’Amadeus.

## LocalStorage (liaison WhatsApp / étape suivante)

Dès qu’une ville est **choisie** (sélection dans la liste), elle est enregistrée dans le **LocalStorage** du navigateur, pour pouvoir être réutilisée à l’étape suivante (par exemple après que l’utilisateur ait donné son numéro WhatsApp ou soit passé à l’écran suivant). Clés utilisées notamment :

- `robin_ville_depart` / `robin_ville_arrivee` (diagnostic vol direct)
- `robin_eb_ville_depart_1`, `robin_eb_ville_arrivee_1`, etc. (diagnostic avec escale)
- `robin_leg1_dep`, `robin_leg1_arr`, etc. (dépôt en ligne, legs)

Les libellés affichés sont aussi stockés dans `robin_*_text` pour réaffichage si besoin.

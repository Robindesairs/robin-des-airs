# Bandeau « Vols éligibles » — données radar

## Comportement

1. **Au chargement** : le bandeau affiche d’abord la liste **statique** (`data/vol-ticker.js`) pour ne pas laisser la zone vide.
2. **Ensuite** : `index.html` appelle d’abord **`GET /.netlify/functions/radar?mode=ticker-history`**. Le radar utilise **uniquement AeroDataBox (RapidAPI)** : **même jour** (Europe/Paris) que l’appel « live » — il n’y a plus d’historique 14 j. via Aviation Edge.
3. **Si** cette réponse ne contient **aucun** vol utile (erreur API, filtre bandeau vide, etc.) → **repli** sur **`GET /.netlify/functions/radar`** (même source, données du jour).
4. **Filtre bandeau** (côté page) : **éligible** + (**annulé** ou **retard ≥ 3 h**). Jusqu’à **9** pastilles tirées au sort (graine journalière).

### Accès API

- **RapidAPI / AeroDataBox** : variable `RAPIDAPI_KEY` sur Netlify. Coût = crédits selon ton plan RapidAPI (plusieurs requêtes aéroport par chargement du radar).

## Cache

- **sessionStorage** ~ **8 minutes** (`robin_radar_ticker`) pour limiter les appels (l’historique est plus lourd que le seul timetable).

## Fallback

- Pas de clé API, erreur réseau, ou aucun vol ne correspond au filtre → le bandeau reste sur les **exemples** de `vol-ticker.js`.

## Périmètre des « vrais » vols

- Mêmes **hubs** que le radar (France métropole + La Réunion : CDG, ORY, MRS, LYS, NCE, BOD, TLS, NTE, LIL, SXB, RUN) — départs **et** arrivées.
- **Modes `ticker-history` et live** : données **du jour** (Paris) via AeroDataBox sur les mêmes hubs.
- Ce ne sont **pas** tous les retards mondiaux ; uniquement ce qui traverse ce périmètre et le filtre éligibilité Robin.

## Légal / produit

- Le **disclaimer** pied de page (exemples informatifs, CE 261) reste pertinent : les pastilles radar sont des **indicateurs temps réel sous réserve** de fiabilité fournisseur, **sans** garantie d’indemnisation.

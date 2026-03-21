# Bandeau « Vols éligibles » — données radar

## Comportement

1. **Au chargement** : le bandeau affiche d’abord la liste **statique** (`data/vol-ticker.js`) pour ne pas laisser la zone vide.
2. **Ensuite** : `index.html` appelle d’abord **`GET /.netlify/functions/radar?mode=ticker-history`** : fenêtre **14 jours** via l’endpoint Aviation Edge **`flightsHistory`** (départs + arrivées sur les mêmes hubs que le radar, vols **déjà filtrés** côté serveur sur les trajets éligibles Robin pour limiter le volume).
3. **Si** cette réponse ne contient **aucun** vol utile (clé sans accès historique, erreur API, etc.) → **repli** sur **`GET /.netlify/functions/radar`** (timetable **jour courant**).
4. **Filtre bandeau** (côté page) : **éligible** + (**annulé** ou **retard ≥ 3 h**). Jusqu’à **9** pastilles tirées au sort (graine journalière).

### Accès API historique

- L’historique est documenté par Aviation Edge comme une offre **Premium** ; sans droit `flightsHistory`, les tableaux reçus ne sont pas des `array` → le mode historique renvoie peu ou pas de lignes → **repli automatique** sur le timetable.

## Cache

- **sessionStorage** ~ **8 minutes** (`robin_radar_ticker`) pour limiter les appels (l’historique est plus lourd que le seul timetable).

## Fallback

- Pas de clé API, erreur réseau, ou aucun vol ne correspond au filtre → le bandeau reste sur les **exemples** de `vol-ticker.js`.

## Périmètre des « vrais » vols

- Mêmes **hubs** que le radar (France métropole + La Réunion : CDG, ORY, MRS, LYS, NCE, BOD, TLS, NTE, LIL, SXB, RUN) — départs **et** arrivées.
- **Mode historique** : plage **glissante 14 jours** (UTC) sur ces aéroports via `flightsHistory`.
- **Mode live** (repli) : **timetable** du jour courant.
- Ce ne sont **pas** tous les retards mondiaux ; uniquement ce qui traverse ce périmètre et le filtre éligibilité Robin.

## Légal / produit

- Le **disclaimer** pied de page (exemples informatifs, CE 261) reste pertinent : les pastilles radar sont des **indicateurs temps réel sous réserve** de fiabilité fournisseur, **sans** garantie d’indemnisation.

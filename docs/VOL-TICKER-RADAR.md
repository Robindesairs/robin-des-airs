# Bandeau « Vols éligibles » — données radar

## Comportement

1. **Au chargement** : message « Mise à jour… », puis appel `GET /api/vol-ticker`.
2. **Serveur** : remonte les **derniers jours** (défaut **7**, variable `TICKER_HISTORY_DAYS`) jusqu’à **9** vols EU↔Afrique impactés (annulé ou retard arrivée ≥ 3 h).
3. **Cache Blobs** : fusion avec l’historique — les **vols les plus récents** remplacent les plus anciens (max 9).
4. **Si 0 vol** après scan : message *« Aucun vol EU–Afrique ≥ 3 h détecté aujourd’hui »* (plus d’exemples fictifs).

## Timeout Netlify

Fonctions radar / bandeau : **60 s** max (`netlify.toml`). Au-delà, le scan est découpé (cron 1 jour + cache Blobs) pour ne pas bloquer le visiteur.

## Variables Netlify (optionnel)

| Variable | Défaut | Rôle |
|----------|--------|------|
| `TICKER_HISTORY_DAYS` | `7` | Jours max à parcourir (cron / refresh complet) |
| `TICKER_LIVE_SCAN_DAYS` | `4` | Jours max par appel live `vol-ticker` (timeout) |
| `TICKER_BANNER_COUNT` | `9` | Nombre de pastilles |
| `RAPIDAPI_KEY` | — | AeroDataBox |

## Accès API

- **RapidAPI / AeroDataBox** : `RAPIDAPI_KEY` obligatoire. Host : `aerodatabox.p.rapidapi.com`.

## Cache navigateur

- **sessionStorage** ~ **60 minutes** (`robin_vol_ticker`).

## Périmètre

- Hubs bandeau : CDG, ORY, RUN, DSS, DKR, ABJ, ACC, LOS, CMN, BJL.
- Filtre : trajet **Europe ↔ Afrique** + éligibilité CE 261 + impact (≥ 3 h ou annulé).

## Légal

- Indicateurs temps réel sous réserve du fournisseur — **sans** garantie d’indemnisation (disclaimer pied de page).

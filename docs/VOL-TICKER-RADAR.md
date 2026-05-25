# Bandeau « Vols éligibles » — données radar

## Comportement

1. **Au chargement** : message « Mise à jour… », puis appel `GET /api/vol-ticker`.
2. **Serveur** : remonte les **derniers jours** (défaut **7**, variable `TICKER_HISTORY_DAYS`) jusqu’à **9** vols EU↔Afrique impactés (annulé ou retard arrivée ≥ 3 h).
3. **Cache Blobs** : fusion avec l’historique — les **vols les plus récents** remplacent les plus anciens (max 9).
4. **Si 0 vol** après scan : message *« Aucun vol EU–Afrique ≥ 3 h détecté aujourd’hui »* (plus d’exemples fictifs).

## Timeout Netlify

Fonctions radar / bandeau : **26 s** max Netlify (`netlify.toml` ; 60 s uniquement sur offre Pro). Le scan est découpé (cron 1 jour + cache Blobs) pour ne pas dépasser le timeout.

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

- **Europe** (toujours) : CDG, ORY, RUN.
- **Afrique subsaharienne** : ~46 hubs (capitales + diaspora) — **hors Maghreb** (pas CMN, ALG, TUN, CAI…).
- Chaque exécution scanne EU + **12 hubs Afrique** en rotation (~4 runs pour tout couvrir).
- Filtre : trajet **Europe ↔ Afrique subsaharienne** + CE 261 + retard ≥ 3 h ou annulé.
- Variable optionnelle : `TICKER_EXTRA_AFRICA_HUBS=XXX,YYY` pour ajouter des IATA.

## Légal

- Indicateurs temps réel sous réserve du fournisseur — **sans** garantie d’indemnisation (disclaimer pied de page).

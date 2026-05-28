# Radar — quota AeroDataBox (plan Ultra)

## Forfait Ultra ($32/mois)

| Limite | Valeur |
|--------|--------|
| Unités API / mois | **60 000** |
| Requêtes / mois | **240 000** |
| Débit | ~2 req/s |

Les scans **retour/allers** du radar V2 utilisent des endpoints **Tier 1** (`/flights/airports/icao/...`) → **1 unité par requête HTTP** en règle générale.

### Estimation usage « radar manuel seul »

| Action | Unités approx. |
|--------|----------------|
| 1 scan retour (1 hub, 2 créneaux) | 2–4 |
| 1 scan aller (1 groupe France) | 4–8 |
| 20 scans manuels / jour × 30 j | ~2 400–4 800 / mois |

**Conclusion : Ultra largement suffisant** si vous gardez uniquement le scan manuel (`/.netlify/functions/radar`) et **pas** les crons / bandeau live / veille auto.

## Ce qui est désactivé par défaut (repo)

| Composant | Cron / appel | Variable pour réactiver |
|-----------|----------------|-------------------------|
| `radar-veille-cron` | */5 min | `RADAR_VEILLE_ENABLED=1` + cron dans `netlify.toml` |
| `radar-monitor` | */10 min | `RADAR_BACKGROUND_API=1` + cron |
| `daily-radar-snapshot-background` | 6h UTC | idem |
| `/api/vol-ticker` scan live | chaque visite accueil (si cache stale) | `RADAR_VOL_TICKER_LIVE=1` |

## Netlify — variables recommandées

```bash
# Ne pas définir (ou laisser absent) = fond désactivé
# RADAR_BACKGROUND_API=1
# RADAR_VEILLE_ENABLED=1
# RADAR_VOL_TICKER_LIVE=1
```

Seul **`RAPIDAPI_KEY`** (clé du plan Ultra) est requis pour le radar V2 en **Scan live**.

## Route active

```http
GET https://robindesairs.eu/.netlify/functions/radar?scanMode=return&hub=FCO&group=11&returnSlot=1
```

(auth CRM / cookie)

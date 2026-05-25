# Rapport email & statistiques radar

## Déjà en place sur Netlify

| Élément | Détail |
|---------|--------|
| **Email matin (~8h Paris)** | `radar-monitor` → Resend → `RADAR_REPORT_EMAIL` |
| **Stockage** | Netlify Blobs, store `robin-radar-ticker` |
| **Logs créneaux** | `monitor/day/{date}.json` |
| **Stats agrégées** | `stats/daily/{date}.json` + `stats/index.json` (30 j) |

## Variables obligatoires pour l’email

```env
RAPIDAPI_KEY=...
RESEND_API_KEY=...
RADAR_REPORT_EMAIL=expert@robindesairs.eu
```

Optionnel : `RADAR_STATS_DAYS=14` (jours dans le rapport).

## Déclencher à la main

```bash
# Matin : bandeau + stats + email
curl -X POST "https://robindesairs.eu/api/daily-radar-snapshot"

# Lire les stats (JSON)
curl -s "https://robindesairs.eu/api/radar-stats?days=14"
```

## Contenu du rapport email

- Vols du **bandeau** (jusqu’à 9, EU ↔ Afrique subsaharienne)
- **Tableau 14 jours** : bandeau, scans, annulations, retards ≥ 3 h, requêtes API
- **Trajets les plus touchés** (jour courant)
- Résumé des **créneaux** 16h–17h et 18h–02h

## Planification automatique

Cron `radar-monitor` : `5 * * * *` (vérifie l’heure Paris).

- **8h** — bandeau + email + stats
- **16h–17h** — contrôle EU → Afrique
- **18h–02h** — contrôle Afrique → Europe

Chaque créneau alimente les statistiques du jour.

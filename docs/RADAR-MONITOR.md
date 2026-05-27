# Radar monitor — créneaux Europe/Paris

## Créneaux automatiques

| Heure Paris | Rôle | Hubs |
|-------------|------|------|
| **08h** | Bandeau site (10 vols) + **rapport email** | CDG, ORY, RUN, DSS, DKR, ABJ, ACC, LOS, CMN, BJL |
| **16h–17h** | Départs **Europe → Afrique** (retard ≥ 1 h ou annulé) — anticiper le retour | CDG, ORY, MRS, LYS, NCE, RUN, BRU, LIS, MAD |
| **18h–02h** (chaque heure) | Départs **Afrique / escales → Europe** | DSS, DKR, ABJ, ACC, LOS, CMN, BKO, BJL, ADD, NBO, CKY, FIH, LFW, COO, OUA, NDJ, ALG, TUN |

Planification Netlify : `radar-monitor` — cron `5 * * * *` (vérifie l’heure Paris à chaque passage).

## Variables Netlify

| Variable | Défaut | Rôle |
|----------|--------|------|
| `RAPIDAPI_KEY` | — | Obligatoire (AeroDataBox) |
| `RADAR_REPORT_EMAIL` | `expert@robindesairs.eu` | Destinataire rapport 8h |
| `RESEND_API_KEY` | — | Envoi email |
| `MANDAT_NOTIFY_FROM` | Robin contact | Expéditeur |
| `RADAR_MORNING_HOUR` | `8` | Heure Paris du job matin |
| `RADAR_EU_HOURS` | `16,17` | Heures contrôle EU |
| `RADAR_API_DELAY_MS` | `1100` | Pause entre appels (1 req/s) |
| `TICKER_HISTORY_DAYS` | `1` | Jours pour le bandeau matin |

## Appels manuels

```bash
# Matin (bandeau + email)
curl -X POST "https://robindesairs.eu/api/daily-radar-snapshot"
curl -X POST "https://robindesairs.eu/api/radar-monitor?force=morning&secret=VOTRE_SECRET_NETLIFY"

# Contrôle EU après-midi
curl -X POST "https://robindesairs.eu/api/radar-monitor?force=eu"

# Contrôle Afrique soir (fenêtre heure courante)
curl -X POST "https://robindesairs.eu/api/radar-monitor?force=africa"
```

## Consommation API (ordre de grandeur / jour)

| Créneau | Requêtes | Unités (~2/u) |
|---------|----------|----------------|
| Matin 8h | ~16–32 | ~32–64 |
| EU 16h + 17h | ~18 | ~36 |
| Afrique 18h–02h (9 h) | ~162 | ~324 |
| **Total** | **~200–220** | **~400–450** |

Tenir dans **RapidAPI Pro** (6 000 unités/mois) si le matin reste sur **1 jour** d’historique bandeau.

## Bandeau site

`GET /api/vol-ticker` lit le cache Blobs écrit à 8h.

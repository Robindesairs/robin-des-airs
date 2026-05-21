# Capture de preuves (radar + météo)

Deux modes : **automatique en production** (Netlify, sans navigateur) et **captures locales** (Playwright).

## Automatique (Netlify → Airtable)

À chaque **création de dossier agence** (`POST /api/agency-dossiers` ou bot WhatsApp partenaire) :

1. **METAR + TAF** — `aviationweather.gov` (départ / arrivée IATA)
2. **Vol structuré** — AeroDataBox si `RAPIDAPI_KEY` est configuré
3. **Stockage** — Netlify Blobs `robin-proofs/dossier/{ref}/report.json` + `report.html`
4. **Airtable** — ajout dans **Remarques** + colonnes optionnelles (voir ci-dessous)
5. **Webhook optionnel** — `PROOFS_PLAYWRIGHT_WEBHOOK_URL` (Make) pour lancer `npm run proofs:capture` en local

Rapport public signé : `GET /api/proof-report?ref=RDA-…&t=…` (token HMAC, secret `PROOFS_REPORT_SECRET` ou `AIRTABLE_WEBHOOK_SECRET`).

Relance manuelle :

```http
POST https://robindesairs.eu/api/collect-proofs
Content-Type: application/json
X-Proofs-Secret: VOTRE_SECRET

{
  "ref": "RDA-260519-AB12",
  "recordId": "recXXXXXXXX",
  "vol": "AF718",
  "date": "2026-05-20",
  "depart": "BJL",
  "arrivee": "CDG"
}
```

### Variables Netlify

| Variable | Rôle |
|----------|------|
| `RAPIDAPI_KEY` | AeroDataBox (vol + retard) |
| `AIRTABLE_*` | Déjà requis pour les dossiers |
| `PROOFS_COLLECT_SECRET` | Secret relance API (sinon = `AIRTABLE_WEBHOOK_SECRET`) |
| `PROOFS_REPORT_SECRET` | Token URL rapport (sinon = secret ci-dessus) |
| `PROOFS_COLLECT_WAIT_MS` | Attente max après création dossier (défaut `6000`) |
| `PROOFS_PLAYWRIGHT_WEBHOOK_URL` | Webhook Make / script local pour PNG |
| `AIRTABLE_COL_PREUVES_METAR` | Colonne texte METAR brut (optionnel) |
| `AIRTABLE_COL_LIEN_PREUVES` | Colonne URL rapport (optionnel) |
| `AIRTABLE_COL_PREUVES_VOL` | Colonne résumé vol API (optionnel) |

---

## Local (Playwright — PNG)

```bash
cd robin-des-airs
npm install
npx playwright install chromium
npm run proofs:capture -- AF718 BJL
```

### Fichiers produits

Dans `proofs/` (non versionnés) :

| Fichier | Source |
|---------|--------|
| `*-radar.png` | FlightRadar24 |
| `*-meteo-flightstats.png` | FlightStats |
| `*-meteo-aviationweather-metar.png` | METAR brut |
| `*-manifest.json` | Métadonnées |

Joindre les PNG au dossier Airtable / Drive avec la référence `RDA-…` et le PNR.

### Limites

- **FlightRadar24** peut bloquer le headless → privilégier l’API vol + METAR auto.
- Les captures web sont du **contexte** ; les **METAR/TAF officiels** restent la référence « météo extraordinaire ».

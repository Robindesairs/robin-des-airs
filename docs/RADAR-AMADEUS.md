# Radar Amadeus — Vérification haute précision

Deuxième source de validation : **Amadeus** est appelé uniquement pour les vols « suspects » (retard ≥ 180 min ou annulés) afin de respecter les quotas. Si Amadeus confirme, le vol est marqué `is_certified_amadeus = 1` en base.

## 1. Installation & variables d’environnement

```bash
npm install
```

Créer un fichier **`.env`** à la racine (ne pas le commiter) :

```env
AMADEUS_API_KEY=ta_cle_api
AMADEUS_API_SECRET=ton_secret
RADAR_URL=https://robin-des-airs.netlify.app/.netlify/functions/radar
```

Les noms `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` sont aussi supportés (SDK Amadeus).

## 2. Fichiers créés

| Fichier | Rôle |
|--------|------|
| `src/services/amadeusService.ts` | Client Amadeus, `checkFlightVerification(flightNumber, date)` → retardé / annulé / vol de remplacement |
| `src/services/monitoringService.ts` | Récupère les vols du radar (Aviation Edge), pour chaque suspect appelle Amadeus, met à jour `robin.db` |
| `src/db/robinDb.ts` | SQLite `data/robin.db`, table `radar_flights` avec `is_certified_amadeus` |
| `src/runCertification.ts` | Job à lancer en cron ou à la main |
| `src/server.ts` | API GET `/api/certifications?keys=...` pour que le radar Netlify fusionne les certifications |
| `src/views/dashboard.html` | Dashboard avec badge **VÉRIFIÉ AMADEUS ✅** sur les lignes certifiées |

## 3. Lancer le job de certification

```bash
npm run certify
```

À mettre en cron (ex. toutes les 5–10 min) pour alimenter `robin.db`.

## 4. Exposer les certifications au radar Netlify

Lancer le serveur d’API (en local ou sur un hébergeur) :

```bash
npm run certify:server
```

Puis sur **Netlify** : **Environment variables** → `CERTIFICATION_API_URL` = l’URL de ce serveur (ex. `https://ton-backend.example.com`).  
Le radar `netlify/functions/radar.js` appellera alors `GET /api/certifications?keys=...` et ajoutera `is_certified_amadeus` à chaque vol. En cas d’échec de l’API, le radar continue sans certification (Aviation Edge ne s’arrête jamais).

## 5. Dashboard

Ouvrir **`src/views/dashboard.html`** (ou le servir via le même serveur / un hébergeur statique). Les vols avec certification Amadeus affichent le badge bleu **VÉRIFIÉ AMADEUS ✅** pour rassurer sur l’éligibilité aux 600€.

## 6. Sécurité

- Le radar Aviation Edge reste la source principale ; Amadeus est uniquement un croisement pour les vols suspects.
- Si Amadeus ou l’API certifications échoue, aucune erreur n’est remontée au radar (gestion d’erreur robuste).
- Les clés Amadeus ne sont jamais exposées côté frontend (uniquement dans `.env` côté backend).

---

## 7. Référence Aéroports et Horaires officiels

- **Aéroports** : API Amadeus *Airport & City Search* pour coordonnées et timezone des **44 hubs africains** (ABJ, DSS, DLA, etc.). Stockage en table **`airports`** de `robin.db`.
  - `fetchAirportByIata(iata)` → infos aéroport (lat, lon, timezone).
  - `fetchAndStoreAfricanHubs()` → remplit la table. Lancer : `npm run seed:hubs`.
- **Vols (référence)** : API Amadeus *Flight Schedules* → horaires théoriques.
  - `verifyOfficialTime(flightNumber, date)` → `{ scheduledDeparture, scheduledArrival, depIata, arrIata }` = **Vérité de Référence**.
- **Logique** : Amadeus = Vérité de Référence ; Aviation Edge = Vérité de Terrain. **Retard = Vérité de Terrain − Vérité de Référence.**

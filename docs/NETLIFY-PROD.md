# Configuration production Netlify — Robin des Airs

Checklist après déploiement sur **robindesairs.eu**.

## 1. Auth CRM (obligatoire en prod)

| Variable | Description |
|----------|-------------|
| `CRM_ACCESS_CODE` | Mot de passe équipe (ex. code interne fort) |
| `CRM_AUTH_SECRET` | Secret HMAC long (32+ caractères aléatoires) — **différent** du code d’accès |
| `CRM_SUPPRESSION_CODE` | Code direction pour supprimer un dossier dans le CRM |

Sans `CRM_ACCESS_CODE` + `CRM_AUTH_SECRET`, le CRM renvoie **503** en production.

Dev local : `ALLOW_INSECURE_AUTH=true` autorise les fallbacks de dev.

## 2. Agences partenaires

| Variable | Description |
|----------|-------------|
| `AGENCY_AUTH_SECRET` | Secret HMAC sessions agence |
| `AGENCY_ACCOUNTS` | JSON tableau de comptes |
| `AGENCY_COMMISSION_GMD` | Commission agence / passager gagné en dalasis (défaut `3800`) |
| `AGENCY_GMD_PER_EUR` | Taux indicatif GMD→EUR pour conversion interne (défaut `84`) |
| `AGENCY_COMMISSION_EUR` | Optionnel — sinon dérivé de `COMMISSION_GMD / GMD_PER_EUR` (≈ `45.24`) |
| `AGENCY_CLIENT_NET_EUR` | Net passager indicatif (défaut `420`) |
| `AGENCY_INDEMNITY_REF_EUR` | Indemnité CE 261 réf. long-courrier (défaut `600`) |
| `AGENCY_XOF_PER_EUR` | Taux FCFA / euro (défaut `655.957`) |

Exemple `AGENCY_ACCOUNTS` :

```json
[
  {
    "code": "GSA-DKR-001",
    "passHash": "scrypt:…",
    "name": "GSA Dakar",
    "airtableMatch": "GSA-DKR-001"
  },
  {
    "code": "GSA-KMS-001",
    "passHash": "scrypt:…",
    "name": "Kombo Travel Services",
    "airtableMatch": "GSA-KMS-001"
  }
]
```

Générer `passHash` :

```bash
node -e "const {hashPassword}=require('./netlify/functions/lib/password-hash'); console.log(hashPassword('VotreMotDePasseFort'));"
```

Recommandé dans Airtable : colonne **`Agence Partenaire Code`** (texte) + variable `AIRTABLE_COL_AGENCE_CODE=Agence Partenaire Code`.

Option incident : dans le single-select **Type d'incident**, ajouter  
`En attente d'incident (billet vendu)`  
(ou `AIRTABLE_INCIDENT_ATTENTE`).

## 3. WhatsApp (Wati)

| Variable | Valeur |
|----------|--------|
| `WHATSAPP_PROVIDER` | `wati` |
| `WATI_API_BASE` | URL API Wati |
| `WATI_API_TOKEN` | Token |
| `WATI_CHANNEL_PHONE` | `33756863630` (clients / passagers) |

**Robot agences** (2ᵉ numéro) — voir [`docs/WATI-ROBOT-AGENCE.md`](WATI-ROBOT-AGENCE.md) :

| Variable | Valeur |
|----------|--------|
| `WATI_AGENCY_CHANNEL_PHONE` | Numéro WhatsApp partenaires |
| `WATI_AGENCY_API_BASE` / `WATI_AGENCY_API_TOKEN` | API (ou mêmes que ci-dessus) |

Activer **Netlify Blobs** (Storage) pour l’historique CRM WhatsApp **et** le robot agence.

## 4. Mandats signés

| Variable | Description |
|----------|-------------|
| `MANDAT_LINK_SECRET` | Secret HMAC liens mandat (ou réutiliser `CRM_AUTH_SECRET`) |

Les liens générés par Airtable / CRM incluent `exp` + `sig`. Les anciens liens sans signature restent acceptés (mode legacy).

## 5. Notifications Telegram

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot |
| `TELEGRAM_CHAT_ID` | Chat équipe Robin |

Alertes automatiques :

- Nouveau dossier agence (POST `/api/agency-dossiers`)
- Billet « attente incident » → incident confirmé (webhook Airtable `action: incident_confirmed`)

## 6. Airtable

| Variable | Description |
|----------|-------------|
| `AIRTABLE_API_KEY` | Token personnel |
| `AIRTABLE_BASE_ID` | Base |
| `AIRTABLE_TABLE_ID` | Table dossiers |
| `AIRTABLE_WEBHOOK_SECRET` | Secret automations Make/Airtable |

Santé : `GET /api/airtable-health` (auth CRM) — colonnes manquantes.

## 7. Vérifications rapides

```bash
curl -s https://robindesairs.eu/api/whatsapp-status | jq .
curl -s -H "X-CRM-Code: VOTRE_CODE" https://robindesairs.eu/api/airtable-health | jq .
```

CRM : `https://robindesairs.eu/crm/` — connexion par cookie (plus de `?code=` dans l’URL).

Agence : `https://robindesairs.eu/espace-agence/`

Démo CRM : `https://robindesairs.eu/crm/?demo=1`

# Robot WhatsApp agences — Robin des Airs

Canal **séparé** du robot passager. Les agences déposent des dossiers → **Airtable** (même logique que [espace-agence](https://robindesairs.eu/espace-agence/)).

## Architecture

```
WhatsApp agence (2ᵉ numéro Wati)
        ↓
/api/wati-agency-webhook
        ↓
Robot agence (menu 1–4)
        ↓
Airtable (+ alerte Telegram optionnelle)
```

## Configuration Wati

1. Créer un **2ᵉ canal / numéro** WhatsApp dans Wati (ex. « Robin Partenaires »).
2. Webhook entrant :  
   `https://robindesairs.eu/api/wati-agency-webhook`  
   Événement : messages reçus.
3. **Ne pas** brancher ce webhook sur `/api/wati-webhook` (réservé au CRM / log client).

## Variables Netlify

| Variable | Exemple |
|----------|---------|
| `WATI_AGENCY_CHANNEL_PHONE` | `33XXXXXXXXX` (numéro agences, chiffres seuls) |
| `WATI_AGENCY_API_BASE` | Même base que clients si un seul compte Wati |
| `WATI_AGENCY_API_TOKEN` | Token API Wati |
| `WATI_AGENCY_WEBHOOK_SECRET` | Secret webhook (optionnel) |
| `AGENCY_ACCOUNTS` | JSON comptes (voir ci-dessous) |
| `AIRTABLE_*` | Déjà configuré |
| `TELEGRAM_*` | Alertes nouveaux dossiers |

Si `WATI_AGENCY_API_*` est vide, le robot réutilise `WATI_API_BASE` + `WATI_API_TOKEN`.

## Comptes agence (`AGENCY_ACCOUNTS`)

```json
[
  {
    "code": "GSA-DKR-001",
    "passHash": "scrypt:…",
    "name": "GSA Dakar",
    "airtableMatch": "GSA-DKR-001",
    "whatsappPhones": ["221771234567", "33612345678"]
  }
]
```

| Champ | Rôle |
|-------|------|
| `code` / `passHash` | Connexion chat : code + mot de passe (1ʳᵉ fois / 30 j) |
| `whatsappPhones` | Numéros autorisés **sans** mot de passe (recommandé pour le référent agence) |

Format numéro : international sans `+` (ex. `221…`, `336…`).

## Parcours agence sur WhatsApp

1. **Identification** : numéro whitelisté → menu direct ; sinon code agence + mot de passe.
2. **Menu** :
   - `1` — Réclamation (retard, annulation…)
   - `2` — Billet en attente d'incident
   - `3` — 5 derniers dossiers Airtable
   - `4` — Aide
3. **Création** : PNR → nom passager → vol → (problème si 1) → confirmation `oui`.
4. Dossier créé avec `Agence Partenaire Code` si colonne configurée.

Commandes : `menu`, `annuler`.

## Vérification

```bash
curl -s https://robindesairs.eu/api/whatsapp-status | jq '.agency'
```

Après config, envoyer *Bonjour* sur le numéro agence depuis un téléphone whitelisté.

## Portail web

Le site [espace-agence](https://robindesairs.eu/espace-agence/) reste disponible (même Airtable). WhatsApp = dépôt rapide ; web = vue liste / formulaire complet.

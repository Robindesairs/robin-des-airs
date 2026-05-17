# Espace agence partenaire — guide

URL : https://robindesairs.eu/espace-agence/

## Pour Robin (admin)

1. Configurer Netlify : voir [`NETLIFY-PROD.md`](NETLIFY-PROD.md) (`AGENCY_ACCOUNTS`, `AGENCY_AUTH_SECRET`, Airtable).
2. Créer une agence dans `AGENCY_ACCOUNTS` avec `code`, `passHash`, `name`, `airtableMatch`.
3. Dans Airtable : colonne **Agence Partenaire Code** (recommandé) + option incident *En attente d'incident (billet vendu)*.
4. Communiquer à l'agence : **code** + **mot de passe** (pas par WhatsApp public).

### Compte démo Gambie — Kombo Travel Services

| Champ | Valeur |
|-------|--------|
| Nom | Kombo Travel Services |
| Code connexion | `GSA-KMS-001` |
| Colonne Airtable | `GSA-KMS-001` (champ Agence Partenaire Code) |

Mot de passe démo pour le responsable : `KomboPilot2026`

En local (`ALLOW_INSECURE_AUTH=true`) : code `GSA-KMS-001` / mot de passe `kombo2026`.

En production Netlify, ajouter dans `AGENCY_ACCOUNTS` :

```json
{
  "code": "GSA-KMS-001",
  "passHash": "scrypt:8fed53e586ec2751042ed14908f605bb:bf539736ffff2e74b27834ca5c77ab59750ac8ca30fba4b83842e026b5fdf1d7",
  "name": "Kombo Travel Services",
  "airtableMatch": "GSA-KMS-001"
}
```

## Pour l'agence

- **Connexion** : code (ex. `GSA-DKR-001`) + mot de passe.
- **Nouveau dossier** : formulaire → enregistrement immédiat dans Airtable.
- **En attente d'incident** : billet vendu sans retard/annulation encore constaté.
- **Mes dossiers** : liste filtrée depuis Airtable ; bouton **Actualiser** pour les statuts à jour.
- **Commissions** : **45 € / passager gagné** (≈ 29 500 FCFA) — voir répartition ci-dessous.
- **Langue** : barre fixe FR / EN.
- **Devise** : EUR, USD, GBP, FCFA, dalasi (GMD) + équivalents.

### Tarif partenaire (long-courrier >3 500 km, indemnité CE 261 = 600 €)

| Part | Montant |
|------|---------|
| Net passager (client de l'agence) | 420 € |
| Commission agence | **45 €** |
| Honoraires Robin des Airs | 135 € |

Les **45 €** remplacent l'ancien affichage « 30 000 FCFA » : au taux 1 € = 655,957 FCFA, 45 € ≈ **29 518 FCFA** (et non 30 000).

Variables Netlify : `AGENCY_COMMISSION_EUR`, `AGENCY_CLIENT_NET_EUR`, `AGENCY_INDEMNITY_REF_EUR`, `AGENCY_XOF_PER_EUR`.

## Technique

- Frontend : `espace-agence.html` + `assets/agence-i18n.js` + `assets/agence-currency.js` + `assets/agence-portal.js`
- API : `/api/agency-auth`, `/api/agency-dossiers`
- Données : Airtable (pas le CRM navigateur)

Le robot WhatsApp agence est documenté séparément ([`WATI-ROBOT-AGENCE.md`](WATI-ROBOT-AGENCE.md)) — optionnel, même Airtable.

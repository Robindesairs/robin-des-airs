# Espace agence partenaire — guide

URL : https://robindesairs.eu/espace-agence/

## Pour Robin (admin)

1. Configurer Netlify : voir [`NETLIFY-PROD.md`](NETLIFY-PROD.md) (`AGENCY_ACCOUNTS`, `AGENCY_AUTH_SECRET`, Airtable).
2. Créer une agence dans `AGENCY_ACCOUNTS` avec `code`, `passHash`, `name`, `airtableMatch`.
3. Dans Airtable : colonne **Agence Partenaire Code** (recommandé) + option incident *En attente d'incident (billet vendu)*.
4. Communiquer à l'agence : **code** + **mot de passe** (pas par WhatsApp public).

## Pour l'agence

- **Connexion** : code (ex. `GSA-DKR-001`) + mot de passe.
- **Nouveau dossier** : formulaire → enregistrement immédiat dans Airtable.
- **En attente d'incident** : billet vendu sans retard/annulation encore constaté.
- **Mes dossiers** : liste filtrée depuis Airtable ; bouton **Actualiser** pour les statuts à jour.
- **Commissions** : 30 000 FCFA / passager gagné (configurable `AGENCY_COMMISSION_FCFA`).

## Technique

- Frontend : `espace-agence.html` + `assets/agence-portal.js`
- API : `/api/agency-auth`, `/api/agency-dossiers`
- Données : Airtable (pas le CRM navigateur)

Le robot WhatsApp agence est documenté séparément ([`WATI-ROBOT-AGENCE.md`](WATI-ROBOT-AGENCE.md)) — optionnel, même Airtable.

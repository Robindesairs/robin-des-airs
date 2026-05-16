# Emails après signature du mandat

Quand un client **signe** sur `mandat.html`, la fonction **`submit-mandat`** peut envoyer :

1. **À vous** (`expert@robindesairs.eu`) — récap complet + **signature en PJ**
2. **Au client** — si le champ **Email** du mandat est renseigné : email de **confirmation** (référence, vol, prochaines étapes, lien suivi, rétractation)

## Option A — Automatique sur Netlify (recommandé)

### 1. Compte Resend

1. Créez un compte sur [resend.com](https://resend.com).
2. Ajoutez et vérifiez le domaine **`robindesairs.eu`** (DNS : SPF / DKIM indiqués par Resend).
3. Créez une **API key**.

### 2. Variables Netlify

**Site configuration → Environment variables** :

| Variable | Exemple | Rôle |
|----------|---------|------|
| `RESEND_API_KEY` | `re_…` | Clé API Resend |
| `MANDAT_NOTIFY_EMAIL` | `expert@robindesairs.eu` | Destinataire(s) — plusieurs adresses séparées par `,` |
| `MANDAT_EMAIL_FROM` | `Robin des Airs <notifications@robindesairs.eu>` | Expéditeur (doit être autorisé sur Resend) |
| `MANDAT_EMAIL_REPLY_TO` | `expert@robindesairs.eu` | (Optionnel) Adresse « Répondre à » pour l’email client |

Redéployez le site après ajout des variables.

### 3. Contenu des emails

**Équipe**

- **Objet** : `Mandat signé — [référence] — [nom passager]`
- **Corps** : récap technique (certificat, WhatsApp, vol, PNR, incident…)
- **Pièce jointe** : `signature-[ref].png`

**Client** (uniquement si email valide sur le mandat)

- **Objet** : `Confirmation — mandat signé — [référence]`
- **Corps** : accusé de réception, référence, vol, prochaines étapes, lien suivi, rétractation 14 jours
- Pas de pièce jointe signature côté client (la vôtre garde la PJ)

Si `RESEND_API_KEY` n’est pas définie, les emails sont **ignorés** (signature + Airtable + webhook continuent).

---

## Option B — Via Make (si vous n’utilisez pas Resend)

1. Dans Netlify, configurez déjà **`MANDAT_SIGNED_WEBHOOK_URL`** vers un webhook Make.
2. Le corps JSON inclut désormais : `ref`, `phone`, `firstName`, `lastName`, `email`, `flightNum`, `pnr`, `airline`, `signed_at`, `has_signature_attachment`, etc.
3. Dans Make, après le webhook :
   - **Gmail → Send an email**
   - **To** : `expert@robindesairs.eu`
   - **Subject** : `Mandat signé — {{ref}}`
   - **Body** : mapper les champs du webhook.

Pour joindre l’image de signature dans Make, il faudrait soit récupérer le mandat depuis Airtable/Drive, soit activer l’**option A (Resend)** sur Netlify.

---

## Test

1. Ouvrez un lien mandat de test (avec `ref` et `phone` valides).
2. Signez et validez.
3. Vérifiez la boîte `MANDAT_NOTIFY_EMAIL` et les logs Netlify (**Functions → submit-mandat**) en cas d’échec Resend.

# Messages WhatsApp automatisés — Robin des Airs

Ce document explique comment envoyer des messages WhatsApp automatiques via la fonction Netlify `send-whatsapp`. **Deux fournisseurs sont supportés** : **360dialog** (https://waba-v2.360dialog.io) et **Meta Cloud API**.

---

## 1. Variables d’environnement Netlify

À configurer dans **Netlify** → **Site** → **Configuration** → **Variables d’environnement**.

### Option A — 360dialog (recommandé si vous utilisez déjà 360dialog)

| Variable | Obligatoire | Description |
|----------|--------------|-------------|
| `WHATSAPP_PROVIDER` | Recommandé | Mettre `360dialog` pour forcer l’usage de 360dialog. |
| `WHATSAPP_360DIALOG_API_KEY` | Oui | Clé API 360dialog (dashboard 360dialog → API Keys). **Ne jamais** la committer dans le code. |
| `WHATSAPP_WEBHOOK_SECRET` | Recommandé | Chaîne secrète dans le body (`"secret": "votre_secret"`) pour restreindre les appels (Make.com, back-office). |

Aucun Phone Number ID à configurer : 360dialog gère le numéro associé à votre clé.

### Option B — Meta Cloud API (Graph API)

| Variable | Obligatoire | Description |
|----------|--------------|-------------|
| `WHATSAPP_ACCESS_TOKEN` | Oui | Token d’accès permanent Meta. [Meta for Developers](https://developers.facebook.com/) → votre app → WhatsApp → API Setup. |
| `WHATSAPP_PHONE_NUMBER_ID` | Oui | ID du numéro WhatsApp Business (voir ci‑dessous). |
| `WHATSAPP_WEBHOOK_SECRET` | Recommandé | Idem que pour 360dialog. |

### Où trouver le Phone Number ID (Meta uniquement)

1. [developers.facebook.com](https://developers.facebook.com/) → votre application.
2. **WhatsApp** → **API Setup**.
3. Sous « From », le **Phone number ID** est affiché (nombre long, ex. `123456789012345`).

---

## 2. Créer un template de message

Les premiers messages envoyés **doivent** utiliser un **template approuvé** (Meta / 360dialog).

- **360dialog** : vous pouvez vérifier vos templates via `GET https://waba-v2.360dialog.io/v1/configs/templates` (header `D360-API-KEY`). Les templates sont créés et approuvés via Meta Business Manager (voir ci‑dessous).
- **Meta** : [business.facebook.com](https://business.facebook.com/) → **Paramètres de la messagerie** (ou **WhatsApp Manager**) → **Modèles de message**.

Création d’un modèle (ex. accusé de réception) :

1. **Créer un modèle**.
2. Exemple :
   - **Nom** : `dossier_reçu` (sans espace ni accent pour l’API).
   - **Catégorie** : Utilitaire.
   - **Langue** : Français.
   - **Corps** :  
     `Bonjour {{1}}, votre dossier {{2}} a bien été enregistré. Nous vous recontacterons très rapidement. L’équipe Robin des Airs.`
3. Soumettre et attendre l’approbation (souvent 24–48 h).

Une fois le statut **Approuvé**, utilisez ce nom (ex. `dossier_reçu`) dans l’appel à la fonction.

---

## 3. Appeler la fonction

**URL** : `https://VOTRE-DOMAINE.netlify.app/.netlify/functions/send-whatsapp`  
(remplacer par votre domaine, ex. `https://robindesairs.eu/.netlify/functions/send-whatsapp`)

**Méthode** : `POST`  
**Content-Type** : `application/json`

**Body JSON** :

```json
{
  "to": "33612345678",
  "template": "dossier_reçu",
  "templateParams": ["Marie", "RDA-260308-1234"],
  "language": "fr"
}
```

Si vous avez défini `WHATSAPP_WEBHOOK_SECRET` :

```json
{
  "secret": "votre_secret_identique_à_la_variable",
  "to": "33612345678",
  "template": "dossier_reçu",
  "templateParams": ["Marie", "RDA-260308-1234"]
}
```

- **to** : numéro du destinataire, format international **sans** le `+` (ex. `33612345678`). La fonction accepte aussi `06...` ou `+33...` et normalise.
- **template** : nom exact du template tel qu’enregistré dans Meta (ex. `dossier_reçu`).
- **templateParams** : tableau de chaînes pour les variables `{{1}}`, `{{2}}`, etc. dans l’ordre.
- **language** : optionnel, défaut `fr`.
- **secret** : requis si `WHATSAPP_WEBHOOK_SECRET` est défini.

---

## 4. Depuis Make.com (scénario après webhook dossier)

1. **Déclencher** : Webhooks → Custom webhook (comme aujourd’hui pour le formulaire).
2. **Module suivant** : **HTTP** → **Make a request**.
   - **URL** : `https://robindesairs.eu/.netlify/functions/send-whatsapp` (ou votre domaine Netlify).
   - **Méthode** : POST.
   - **Body type** : Raw / JSON.
   - **Request content** :
     - `secret` : votre `WHATSAPP_WEBHOOK_SECRET` (si utilisé).
     - `to` : numéro du client (champ du webhook, ex. `{{1.tel}}` normalisé en 33…).
     - `template` : `dossier_reçu`.
     - `templateParams` : `["{{1.prenom}}", "{{1.numero_dossier}}"]` (adapter aux noms de champs envoyés par votre formulaire).
3. Enchaîner avec Google Sheets (Add a row, etc.) comme aujourd’hui.

Ainsi, à chaque soumission de formulaire, le client reçoit un WhatsApp automatique du type :  
*« Bonjour Marie, votre dossier RDA-260308-1234 a bien été enregistré… »*.

---

## 5. Sécurité

- **Révoquez** toute clé API ou token exposée par erreur (chat, commit, etc.) et régénérez-en une nouvelle (Meta ou 360dialog).
- Ne committez **jamais** les clés/tokens (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_360DIALOG_API_KEY`, `WHATSAPP_WEBHOOK_SECRET`) dans le dépôt.
- Utilisez `WHATSAPP_WEBHOOK_SECRET` pour que seuls Make.com ou votre back-office puissent appeler la fonction.

---

*Robin des Airs — Messages automatisés WhatsApp*

# Notifications Telegram — Vols critiques

Quand un vol passe en **critique** (annulé ou retard ≥ 2h30), le radar envoie un message sur ton **Telegram** avec le détail du vol.

## Configuration

### 1. Créer un bot Telegram

1. Ouvre Telegram et cherche **@BotFather**.
2. Envoie `/newbot`, donne un nom (ex. « Robin des Airs Alertes ») et un username (ex. `robin_des_airs_bot`).
3. BotFather te donne un **token** du type `123456789:ABCdefGHI...`. Garde-le.

### 2. Récupérer ton Chat ID

- **Option A** : Envoie `/start` à **@userinfobot** sur Telegram ; il te renvoie ton ID (ex. `6894457026`). Pour une conversation privée avec ton bot, ce nombre est ton **Chat ID**.
- **Option B** : Envoie un message à ton nouveau bot, puis ouvre :
  ```
  https://api.telegram.org/botTON_TOKEN/getUpdates
  ```
  Dans la réponse JSON, cherche `"chat":{"id": 123456789}`. Ce nombre est ton **Chat ID**.

### 3. Variables Netlify

Dans **Netlify** → ton site → **Site configuration** → **Environment variables** :

| Nom | Valeur | Sensible |
|-----|--------|----------|
| `TELEGRAM_BOT_TOKEN` | Le token donné par BotFather | Oui |
| `TELEGRAM_CHAT_ID` | Ton Chat ID (ex. `6894457026`) | Non |

Tu peux aussi envoyer `chat_id` dans le body du POST (ex. `{ "flights": [...], "chat_id": "6894457026" }`) : il remplace la variable pour cet envoi.

Redéploie le site (ou déclenche un déploiement) pour que les variables soient prises en compte.

## Comportement

- À **chaque scan** où il y a au moins un vol critique (annulé ou retard ≥ 180 min), le radar envoie **un message Telegram** qui **liste tous les vols critiques** du moment (détails complets pour chaque vol).
- Le message contient pour chaque vol : numéro, compagnie, trajet, retard (ou annulation), heures prévues, statut.

## WhatsApp

Les notifications **WhatsApp** nécessitent l’API WhatsApp Business (ou un service payant type Twilio). Pour l’instant seules les **notifications Telegram** sont prévues ; tu peux recevoir les alertes sur ton téléphone en utilisant l’app Telegram.

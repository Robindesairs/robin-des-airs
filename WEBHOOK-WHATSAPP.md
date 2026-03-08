# Webhook WhatsApp (360dialog) — Configuration

## Route

- **URL** : `https://VOTRE-DOMAINE.netlify.app/api/whatsapp-webhook`
- **GET** : vérification (360dialog / Meta envoie `hub.mode`, `hub.verify_token`, `hub.challenge`).
- **POST** : réception des messages entrants.

## Variables Netlify (.env / Dashboard)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `WHATSAPP_API_KEY` | Oui | Clé que vous définissez : elle doit être **identique** au « Verify token » saisi dans le dashboard 360dialog pour la validation GET du webhook. |
| `WHATSAPP_360DIALOG_API_KEY` | Oui | Clé API 360dialog (D360-API-KEY) pour envoyer les réponses. |
| `ROBIN_LOG_WEBHOOK_URL` | Non | URL à laquelle le webhook envoie en POST chaque message entrant (JSON). Votre backend peut écrire dans `robin.db` (table `whatsapp_messages`) pour le Dashboard. |

## Configuration côté 360dialog

1. Dans le **Partner Hub** ou la config du canal WhatsApp, définir l’URL du webhook :  
   `https://robindesairs.eu/api/whatsapp-webhook` (ou votre domaine Netlify).
2. Définir le **Verify token** : choisir une valeur secrète et la mettre dans Netlify comme `WHATSAPP_API_KEY` (et la même valeur dans le champ « Verify token » 360dialog).
3. Enregistrer ; 360dialog enverra un GET pour vérifier l’URL (réponse 200 + `hub.challenge`).

## Comportement

- **Message « Bonjour »** (ou bonsoir, salut, hello, etc.) → réponse avec le menu Robin des Airs (lien dépôt, contact).
- **Message contenant un numéro de vol** (ex. AF718, BA123) :
  - Appel à `flight-info` pour vérifier le vol.
  - Si vol éligible (retard ≥ 3h et palier 600€) → « Bonne nouvelle ! Votre vol … est éligible à 600€. Cliquez ici pour signer votre dossier : [LIEN] ».
  - Sinon → message invitant à déposer le dossier avec le numéro et la date du vol.
- **Autre message** → invitation à envoyer le numéro de vol ou à déposer un dossier.

## Logs et Dashboard

- Chaque message entrant est **logué dans la console** Netlify.
- Si `ROBIN_LOG_WEBHOOK_URL` est défini, le webhook envoie un **POST** avec le payload (wa_id, from_phone, message_id, body_text, etc.). Vous pouvez créer un petit backend qui reçoit ce POST et appelle `insertWhatsAppMessage` (voir `src/db/robinDb.ts`) pour remplir la table `whatsapp_messages` de `robin.db`, visible depuis votre Dashboard.

## Sécurité

- Ne committez **jamais** `WHATSAPP_API_KEY` ni `WHATSAPP_360DIALOG_API_KEY` dans le dépôt.
- Le **Verify token** (GET) prouve que l’appel de vérification vient bien de votre configuration 360dialog.
- Les POST de messages sont envoyés par 360dialog sans clé additionnelle ; la confidentialité repose sur l’URL du webhook (non publique si vous ne la diffusez pas).

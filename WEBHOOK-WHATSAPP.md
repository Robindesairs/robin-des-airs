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

## Tunnel Robin (outil carte d'embarquement)

Pour que Robin propose le **tunnel** (« Envoyez une photo de votre carte d'embarquement ») au lieu du simple menu :

- **Option 1** : Définir **`ROBIN_TUNNEL_ENABLED=true`** dans les variables Netlify.
- **Option 2** : Définir **`GEMINI_API_KEY`** (clé API Gemini). Si cette variable est présente, le tunnel est activé automatiquement (sauf si `ROBIN_TUNNEL_ENABLED=false`).

Variables nécessaires pour le tunnel : **`GEMINI_API_KEY`** (obligatoire pour l’OCR des photos).

## Comportement (mode classique, sans tunnel)

- **Message « Bonjour »** (ou bonsoir, salut, hello, etc.) → réponse avec le menu Robin des Airs (lien dépôt, contact).
- **Message contenant un numéro de vol** (ex. AF718, BA123) :
  - Appel à `flight-info` pour vérifier le vol.
  - Si vol éligible (retard ≥ 3h et palier 600€) → « Bonne nouvelle ! Votre vol … est éligible à 600€. Cliquez ici pour signer votre dossier : [LIEN] ».
  - Sinon → message invitant à déposer le dossier avec le numéro et la date du vol.
- **Autre message** → invitation à envoyer le numéro de vol ou à déposer un dossier.

## Vérifier que WhatsApp est connecté

1. **Appel du statut**  
   Ouvrez dans un navigateur (ou avec `curl`) :  
   **`https://robindesairs.eu/api/whatsapp-status`** (ou votre domaine Netlify).

2. **Réponse attendue si tout est OK**  
   ```json
   {
     "whatsapp": "ok",
     "message": "WhatsApp est connecté (webhook + envoi configurés).",
     "webhook_verify_configured": true,
     "can_send_replies": true,
     "tunnel_available": true,
     "tunnel_enabled": true
   }
   ```
   - `webhook_verify_configured: true` → `WHATSAPP_API_KEY` est définie (vérification GET 360dialog OK).
   - `can_send_replies: true` → `WHATSAPP_360DIALOG_API_KEY` est définie (le bot peut répondre).
   - `tunnel_available` / `tunnel_enabled` → optionnel (OCR / Étape 1 si `GEMINI_API_KEY` est définie).

3. **Si `whatsapp` vaut `config_missing`**  
   Vérifiez dans Netlify → Site → Environment variables que **`WHATSAPP_API_KEY`** et **`WHATSAPP_360DIALOG_API_KEY`** sont bien définies, puis redéployez si besoin.

4. **Pour confirmer que les messages arrivent**  
   Envoyez un message au numéro WhatsApp Business. Puis Netlify → Functions → `whatsapp-webhook` → **Logs** : vous devez voir une ligne du type `whatsapp-webhook: message`. Si rien n’apparaît, l’URL du webhook dans 360dialog ou le Verify token est incorrect.

## Logs et Dashboard

- Chaque message entrant est **logué dans la console** Netlify.
- Si `ROBIN_LOG_WEBHOOK_URL` est défini, le webhook envoie un **POST** avec le payload (wa_id, from_phone, message_id, body_text, etc.). Vous pouvez créer un petit backend qui reçoit ce POST et appelle `insertWhatsAppMessage` (voir `src/db/robinDb.ts`) pour remplir la table `whatsapp_messages` de `robin.db`, visible depuis votre Dashboard.

## WhatsApp ne répond pas

1. **Vérifier que le webhook est appelé**  
   Netlify → Site → Functions → ouvrir la fonction `whatsapp-webhook` → onglet **Logs**. Envoyez un message sur WhatsApp puis regardez si une ligne apparaît (ex. `whatsapp-webhook: message`).  
   - Si rien n’apparaît : l’URL du webhook dans 360dialog est peut‑être incorrecte ou le verify token ne correspond pas (vérifier GET avec le même token).

2. **Variables Netlify**  
   Vérifier que **`WHATSAPP_360DIALOG_API_KEY`** est bien définie (clé 360dialog pour envoyer des messages). Sans elle, le webhook ne peut pas répondre.

3. **Réponse systématique**  
   Le webhook a été modifié pour :  
   - répondre même quand le message est vide (menu d’accueil) ;  
   - en cas d’erreur, envoyer un message de secours (« Désolé, un problème technique… »).  
   Consulter les **logs** Netlify en cas d’erreur (ligne `whatsapp-webhook: processing error` ou `send failed`).

4. **URL du webhook**  
   Doit être exactement : `https://votre-domaine.netlify.app/api/whatsapp-webhook` (avec votre domaine Netlify ou robindesairs.eu si c’est celui utilisé).

---

## Sécurité

- Ne committez **jamais** `WHATSAPP_API_KEY` ni `WHATSAPP_360DIALOG_API_KEY` dans le dépôt.
- Le **Verify token** (GET) prouve que l’appel de vérification vient bien de votre configuration 360dialog.
- Les POST de messages sont envoyés par 360dialog sans clé additionnelle ; la confidentialité repose sur l’URL du webhook (non publique si vous ne la diffusez pas).

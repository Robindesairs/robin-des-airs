# Webhook WhatsApp (360dialog) — Configuration

## Vérification rapide (Robin répond-il ?)

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Ouvrir **https://robindesairs.eu/api/whatsapp-status** | JSON avec `"can_send_replies": true` (ou `whatsapp: "ok"`). Si `config_missing` → ajouter les variables Netlify et redéployer. |
| 2 | Dans **360dialog** : Webhook URL = `https://robindesairs.eu/api/whatsapp-webhook`, Verify token = même valeur que `WHATSAPP_API_KEY` | Enregistrement accepté (GET de vérification renvoie 200). |
| 3 | Envoyer **Bonjour** au numéro WhatsApp Business | Robin répond avec le menu ou « Envoyez une photo de votre carte d'embarquement ». |
| 4 | Netlify → **Functions** → **whatsapp-webhook** → **Logs** | Après envoi d’un message, une ligne du type `whatsapp-webhook: message` apparaît. Si rien → l’URL webhook ou le token 360dialog est incorrect. |

**Variables Netlify obligatoires :** `WHATSAPP_API_KEY`, `WHATSAPP_360DIALOG_API_KEY`. Pour le tunnel (photo + OCR) : `GEMINI_API_KEY`.

---

## Où mettre les clés (360dialog vs Netlify)

| Où ? | Quoi ? | Détail |
|------|--------|--------|
| **Dans 360dialog** (config webhook) | **URL du webhook** | `https://robindesairs.eu/api/whatsapp-webhook` |
| **Dans 360dialog** (config webhook) | **Verify token** | Une phrase secrète de votre choix (ex. `robin-secret-2024`). À recopier **à l’identique** dans Netlify (voir ci‑dessous). |
| **Dans Netlify** (variables d’environnement) | **WHATSAPP_API_KEY** | La **même** valeur que le Verify token saisi dans 360dialog. |
| **Dans Netlify** (variables d’environnement) | **WHATSAPP_360DIALOG_API_KEY** | La clé API 360dialog (D360-API-KEY) que vous **récupérez** dans le compte 360dialog (API Keys / Credentials). On ne met **pas** cette clé dans l’app 360dialog, seulement dans Netlify. |

En résumé : dans 360dialog vous ne saisissez que l’**URL du webhook** et le **Verify token**. La clé API 360dialog, vous la prenez dans 360dialog et vous la mettez **uniquement** dans Netlify.

---

## Route

- **URL** : `https://VOTRE-DOMAINE.netlify.app/api/whatsapp-webhook`
- **GET** : vérification (360dialog / Meta envoie `hub.mode`, `hub.verify_token`, `hub.challenge`).
- **POST** : réception des messages entrants.

## Variables Netlify (.env / Dashboard)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `WHATSAPP_API_KEY` | Oui | Clé que vous définissez : elle doit être **identique** au « Verify token » saisi dans le dashboard 360dialog pour la validation GET du webhook. |
| `WHATSAPP_360DIALOG_API_KEY` | Oui* | Clé API 360dialog (D360-API-KEY) pour envoyer les réponses. *Ou voir ci‑dessous (Meta). |
| `WHATSAPP_PHONE_NUMBER_ID` | Non | ID du numéro WhatsApp Business. Si défini avec `WHATSAPP_ACCESS_TOKEN`, les réponses partent via l’API Meta (ce numéro). Permet aussi de filtrer les messages entrants (ne traiter que ceux reçus sur ce numéro). |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Non | ID du compte WhatsApp Business. Si défini, seules les entrées webhook dont `entry.id` correspond sont traitées. |
| `WHATSAPP_ACCESS_TOKEN` | Non | Token d’accès Meta. Si défini avec `WHATSAPP_PHONE_NUMBER_ID`, l’envoi des réponses se fait via l’API Graph Meta (réponses bien envoyées depuis ce Phone Number ID). |
| `WHATSAPP_CONTACT_NUMBER` | Non | Numéro de contact pour le lien wa.me dans le message d’erreur (ex. `15557840392`). Si non défini, le message d’erreur ne contient pas de lien. |
| `ROBIN_LOG_WEBHOOK_URL` | Non | URL à laquelle le webhook envoie en POST chaque message entrant (JSON). Votre backend peut écrire dans `robin.db` (table `whatsapp_messages`) pour le Dashboard. |

## Configuration côté 360dialog

**À ne pas confondre :** L’API 360dialog (`https://waba-v2.360dialog.io`) est déjà utilisée dans le code pour envoyer les réponses. L’URL du webhook à configurer ci-dessous est *votre* site (pas waba-v2.360dialog.io), pour que 360dialog envoie les messages entrants vers Robin. Si votre numéro n’est pas encore enregistré sur Meta Business, vous pouvez utiliser un autre numéro en attendant (même clé et même URL de webhook).

**Utiliser un numéro précis (ex. +1 555-784-0392 — Robindesairs) :** Dans 360dialog, associez ce numéro au canal WhatsApp qui pointe vers votre webhook. Toutes les conversations auront lieu sur ce téléphone ; aucun changement de code n’est nécessaire.

1. Dans le **Partner Hub** ou la config du canal WhatsApp, définir l’URL du webhook :  
   `https://robindesairs.eu/api/whatsapp-webhook` (ou votre domaine Netlify).
2. Définir le **Verify token** : choisir une valeur secrète et la mettre dans Netlify comme `WHATSAPP_API_KEY` (et la même valeur dans le champ « Verify token » 360dialog).
3. Enregistrer ; 360dialog enverra un GET pour vérifier l’URL (réponse 200 + `hub.challenge`).

## Tunnel Robin (outil carte d'embarquement)

Pour que Robin propose le **tunnel** (« Envoyez une photo de votre carte d'embarquement ») au lieu du simple menu :

- **Option 1** : Définir **`ROBIN_TUNNEL_ENABLED=true`** dans les variables Netlify.
- **Option 2** : Définir **`GEMINI_API_KEY`** (clé API Gemini). Si cette variable est présente, le tunnel est activé automatiquement (sauf si `ROBIN_TUNNEL_ENABLED=false`).

Variables nécessaires pour le tunnel : **`GEMINI_API_KEY`** (obligatoire pour l’OCR des photos).

### Relais Gemini après 20 secondes (optionnel)

Si vous voulez qu’un **humain** puisse répondre en premier et que **Gemini prenne le relais** environ 20 secondes plus tard s’il n’y a pas de réponse :

- Définir **`ROBIN_GEMINI_DELAY_ENABLED=true`** dans les variables Netlify.
- Le site doit avoir la dépendance **`@netlify/blobs`** (stockage des conversations en attente).
- **Comportement** : à chaque message **texte** du client, le webhook envoie immédiatement « Un instant, je vous réponds dans quelques secondes… », enregistre la conversation en attente. Une **fonction planifiée** (`whatsapp-gemini-fallback`) s’exécute **toutes les minutes** ; pour toute conversation en attente depuis au moins 20 secondes, Gemini génère une réponse et l’envoie sur WhatsApp. Les **photos** sont toujours traitées tout de suite (OCR, tunnel).
- Variable optionnelle : **`ROBIN_GEMINI_DELAY_SECONDS`** (défaut 20) — délai minimal en secondes avant que Gemini réponde.
- La fonction `whatsapp-gemini-fallback` doit être planifiée dans `netlify.toml` avec `schedule = "* * * * *"` (toutes les minutes). Le délai réel peut donc être entre 20 secondes et environ 1 minute 20 selon l’heure d’envoi du message.

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

## WhatsApp ne répond pas (toujours pas de réponse)

**Diagnostic rapide** — Après avoir envoyé un message au numéro WhatsApp :
1. Ouvrir **https://robindesairs.eu/api/whatsapp-status** : `can_send_replies: true` confirme que l’envoi est configuré (360dialog ou Meta).
2. Dans Netlify → **Functions** → **whatsapp-webhook** → **Logs**, chercher :
   - `whatsapp-webhook: POST received` = le webhook est bien appelé.
   - `whatsapp-webhook: message` = un message a été reçu et traité.
   - `whatsapp-webhook: sending reply to` = une réponse a été envoyée.
   - `whatsapp-webhook: send error` = l’envoi a échoué (vérifier **WHATSAPP_360DIALOG_API_KEY** ou **WHATSAPP_ACCESS_TOKEN**).
   - `whatsapp-webhook: skip entry` / `skip change` = en mode Meta, le message a été ignoré car reçu sur un autre numéro/compte (filtres WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_BUSINESS_ACCOUNT_ID).
   - `whatsapp-webhook: will process and reply` = le message n’a pas été ignoré (dédup), on va traiter et envoyer une réponse.
   - `whatsapp-webhook: skip duplicate message_id` = ce message a déjà été traité (réponse envoyée une fois) ; pour tester sans dédup, définir **`ROBIN_DEDUP_DISABLED=true`** dans Netlify (attention : risque de réponses en double si 360dialog renvoie le même événement).
3. **Si vous utilisez uniquement 360dialog** : les filtres par Phone Number ID / Business Account ID ne s’appliquent pas ; tous les messages reçus sont traités. Ils ne s’activent que si **WHATSAPP_PHONE_NUMBER_ID** et **WHATSAPP_ACCESS_TOKEN** sont tous deux définis (envoi via Meta).
4. **Si aucun log n’apparaît** : 360dialog n’appelle pas l’URL pour **ce numéro**. Dans 360dialog, vérifier que le **numéro qui reçoit les messages** (celui que vous contactez sur WhatsApp) est bien celui pour lequel l’URL du webhook est configurée : `https://robindesairs.eu/api/whatsapp-webhook`, Verify token = **exactement** la valeur de **WHATSAPP_API_KEY** dans Netlify. Vérifier aussi que le domaine robindesairs.eu pointe vers **Netlify** (pas un autre hébergeur).

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

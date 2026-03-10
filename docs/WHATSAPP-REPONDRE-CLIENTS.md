# Comment faire pour que WhatsApp réponde à tes clients

Robin répond aux clients via le **webhook** Netlify. Pour que ça marche, il faut que **360dialog** envoie les messages à ton site, et que ton site ait la **clé pour renvoyer** les réponses.

---

## 1. Vérifier que Robin peut envoyer des réponses

Ouvre dans le navigateur :

**https://robindesairs.eu/api/whatsapp-status**

Tu dois voir quelque chose comme :
```json
{
  "whatsapp": "ok",
  "can_send_replies": true,
  "tunnel_enabled": true
}
```

- Si **`can_send_replies: false`** ou **`config_missing`** → il manque la clé pour envoyer. Passe à l’étape 2.
- Si **`can_send_replies: true`** → le code peut envoyer. Si les clients ne reçoivent rien, le blocage est côté 360dialog (étape 3).

---

## 2. Clé 360dialog dans Netlify (obligatoire pour répondre)

Sans cette clé, le webhook reçoit les messages mais **ne peut pas envoyer** de réponse.

1. Va sur **360dialog** → ton compte → **API Keys** / **Credentials**.
2. Copie la **D360-API-KEY** (clé API 360dialog).
3. Dans **Netlify** : ton site → **Site configuration** → **Environment variables**.
4. Ajoute (ou modifie) :
   - **Key** : `WHATSAPP_360DIALOG_API_KEY`
   - **Value** : la clé D360 que tu viens de copier.
5. **Redéploie** le site (Deploys → Trigger deploy → Deploy site) pour que la variable soit prise en compte.

Après redéploiement, revérifie **/api/whatsapp-status** : `can_send_replies` doit être `true`.

---

## 3. Configurer le webhook 360dialog pour ton numéro

Si 360dialog n’appelle pas ton URL, Robin ne reçoit jamais les messages → aucune réponse possible.

1. Dans **360dialog**, ouvre la config du **canal WhatsApp** lié au **numéro qui reçoit les messages** (celui que tes clients contactent).
2. Section **Webhook** : mets uniquement l'**URL** : `https://robindesairs.eu/api/whatsapp-webhook`
   - 360dialog n'a pas de champ « Verify token » — tu n'as pas besoin de `WHATSAPP_API_KEY`.
3. Enregistre.

Le webhook doit être configuré **pour le bon numéro**. Si tu as plusieurs numéros, c'est celui que tes clients contactent qui doit avoir cette URL.

---

## 4. Vérifier que les messages arrivent bien au webhook

1. Envoie un message (ex. « Bonjour ») au numéro WhatsApp Robin depuis ton téléphone.
2. Dans **Netlify** → **Functions** → **whatsapp-webhook** → **Logs**.
3. Regarde si des lignes apparaissent juste après ton message :
   - `whatsapp-webhook: POST received` → le webhook est bien appelé.
   - `whatsapp-webhook: will process and reply` → Robin traite et va répondre.
   - `whatsapp-webhook: sending reply to ... provider=360dialog` → une réponse est partie vers WhatsApp.

**Si aucun log** après avoir envoyé un message :
- 360dialog n’envoie pas les événements à ton URL. Vérifie l’URL du webhook pour **ce numéro** (étape 3).
- Vérifie que le numéro utilisé pour envoyer le message est bien celui qui est configuré avec ce webhook.

**Si tu vois « sending reply to » mais le client ne reçoit rien** :
- Problème possible côté 360dialog / Meta (compte, numéro, template, etc.). Vérifier dans 360dialog que le numéro est actif et autorisé à envoyer des messages.

---

## 5. Résumé : checklist

| Étape | Où | Quoi |
|-------|----|------|
| 1 | Netlify | `WHATSAPP_360DIALOG_API_KEY` = clé API 360dialog (D360-API-KEY) |
| 2 | 360dialog | Webhook URL = `https://robindesairs.eu/api/whatsapp-webhook` (pas de verify token) |
| 3 | 360dialog | Cette config webhook est bien sur le **numéro** que tes clients contactent |
| 4 | Netlify | Redéploiement après toute modification de variables |

Une fois tout ça en place, quand un client envoie « Bonjour » ou une photo de carte d’embarquement, le webhook reçoit le message, le code répond (menu ou tunnel), et la réponse part via 360dialog vers le client.

Pour plus de détails (tunnel, Gemini, relais 20 s, etc.) : **WEBHOOK-WHATSAPP.md**.

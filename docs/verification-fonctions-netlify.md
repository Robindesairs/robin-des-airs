# Vérification des fonctions Netlify — Robin des Airs

Comment tester chaque fonction après déploiement. Base URL : `https://robindesairs.eu` (ou ton domaine Netlify).

---

## 1. whatsapp-status (GET) — testable en direct

**URL :** `https://robindesairs.eu/api/whatsapp-status`

**Test :** Ouvre l’URL dans le navigateur.

**Réponse attendue :** JSON avec `"whatsapp": "ok"`, `"can_send_replies": true`, `"tunnel_available": true` si tout est configuré.

**Variables utilisées :** WHATSAPP_API_KEY, WHATSAPP_360DIALOG_API_KEY, GEMINI_API_KEY (optionnel).

---

## 2. whatsapp-webhook (GET + POST)

**URL :** `https://robindesairs.eu/api/whatsapp-webhook`

- **GET** : utilisé par 360dialog/Meta pour vérifier le webhook (paramètres `hub.mode`, `hub.verify_token`, `hub.challenge`). Sans les bons paramètres → 403. Pas testable manuellement sans le token.
- **POST** : reçoit les messages entrants. Testé en envoyant un vrai message sur WhatsApp au numéro connecté.

**Variables :** WHATSAPP_API_KEY, WHATSAPP_360DIALOG_API_KEY (ou WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN), GEMINI_API_KEY (optionnel).

---

## 3. whatsapp-gemini-fallback (planifiée)

**Déclenchement :** Automatique toutes les minutes (cron `* * * * *`). Pas d’URL publique.

**Rôle :** Envoie les réponses Gemini pour les conversations en attente depuis ≥ 20 s (si ROBIN_GEMINI_DELAY_ENABLED=true).

**Vérification :** Netlify → Functions → whatsapp-gemini-fallback → onglet Logs ou “Run now”.

**Variables :** WHATSAPP_360DIALOG_API_KEY, GEMINI_API_KEY, @netlify/blobs.

---

## 4. flight-info (GET)

**URL :** `https://robindesairs.eu/.netlify/functions/flight-info?flight=AF718`

**Test :** Ouvre l’URL (remplace AF718 par un numéro de vol réel si tu veux).

**Réponse attendue :** 200 + JSON (tableau de vols ou erreur). 400 si `flight` manquant.

**Variables :** AVIATION_EDGE_KEY.

---

## 5. airport-search (GET)

**URL :** `https://robindesairs.eu/.netlify/functions/airport-search?query=paris`

**Test :** Ouvre l’URL (remplace `paris` par un mot-clé).

**Réponse attendue :** 200 + JSON (tableau d’aéroports/villes). 400 si `query` manquant ou &lt; 2 caractères.

**Variables :** AVIATION_EDGE_KEY (prioritaire), ou AMADEUS (client_id, client_secret pour repli).

---

## 6. radar (GET)

**URL :** `https://robindesairs.eu/.netlify/functions/radar`

**Test :** Ouvre l’URL ou utilise la page `test-radar.html` si elle existe.

**Réponse attendue :** 200 + JSON (liste de vols). 500 si AVIATION_EDGE_KEY manquant.

**Variables :** AVIATION_EDGE_KEY.

---

## 7. send-whatsapp (POST)

**URL :** `https://robindesairs.eu/.netlify/functions/send-whatsapp`

**Test :** POST avec body JSON, ex. `{ "to": "33612345678", "text": "Test" }`. Nécessite un numéro de test et que le destinataire ait envoyé un message dans les 24 h (pour envoi texte hors template).

**Variables :** WHATSAPP_360DIALOG_API_KEY ou (WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID).

---

## 8. telegram-notify (POST)

**URL :** `https://robindesairs.eu/.netlify/functions/telegram-notify`

**Test :** POST avec body JSON, ex. `{ "flights": [{ "flight": "AF718", "dep": "CDG", "arr": "DKR", "delayMinutes": 180 }] }`.

**Variables :** TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.

---

## Résumé rapide (tests sans outil)

| Fonction            | Méthode | URL de test |
|---------------------|--------|-------------|
| whatsapp-status     | GET    | `/api/whatsapp-status` |
| flight-info         | GET    | `/.netlify/functions/flight-info?flight=AF718` |
| airport-search      | GET    | `/.netlify/functions/airport-search?query=paris` |
| radar               | GET    | `/.netlify/functions/radar` |

Les autres (webhook POST, send-whatsapp, telegram-notify, gemini-fallback) se testent soit par un vrai message WhatsApp / un appel POST, soit via les logs Netlify.

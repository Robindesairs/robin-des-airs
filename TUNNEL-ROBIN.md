# Tunnel conversationnel Robin (WhatsApp)

Tunnel guidé : carte d'embarquement → confirmation vol → correspondance → passagers → date → verdict (éligible ou non).

---

## 1. Table `whatsapp_sessions` (robin.db)

Utilisée quand le backend tourne avec accès à `robin.db` (serveur Node, script).

| Colonne           | Type    | Description |
|-------------------|---------|-------------|
| phone_number      | TEXT PK | Numéro normalisé (33…) |
| current_step      | TEXT    | AWAITING_CARD \| CONFIRM_FLIGHT \| CHECK_CONNECTION \| ASK_PASSENGERS \| CONFIRM_DATE \| VERDICT |
| flight_data       | TEXT    | JSON : { flightNumber?, date?, hasConnection? } |
| passenger_count   | INTEGER | Nombre de passagers |
| is_completed      | INTEGER | 0/1 |
| verdict_eligible  | INTEGER | 0/1 (après verdict) |
| verdict_reason    | TEXT    | Raison si non éligible |
| updated_at        | TEXT    | datetime |

---

## 2. Étapes et scripts (sessionManager.ts)

- **AWAITING_CARD** : « Envoyez-moi une photo de votre carte d'embarquement… »
- **CONFIRM_FLIGHT** : « Je vois le vol [FlightNumber]. Est-ce bien le bon vol ? (OUI/NON) »
- **CHECK_CONNECTION** : « Y avait-il un autre vol (correspondance) ? (OUI/NON) »
- **ASK_PASSENGERS** : « Combien de passagers au total ? (1–20) »
- **CONFIRM_DATE** : « S'agit-il bien du vol du [Date] ? OUI ou date JJ/MM/AAAA »
- **VERDICT** : Éligible → montant + lien signature ; Non éligible → raison + proposer un autre vol

---

## 3. Intégration Gemini 1.5 Flash

- **Variable** : `GEMINI_API_KEY` (Google AI Studio ou API Key).
- **OCR** : extraction du numéro de vol et de la date depuis la photo de carte d’embarquement.
- **Réponses naturelles** : pour les questions hors OUI/NON/chiffre/date, Gemini répond (tarifs, délais, etc.) puis ramène vers l’étape en cours (prompt système dans `geminiService.ts`).

---

## 4. Webhook Netlify (mode tunnel)

- **Activation** : `ROBIN_TUNNEL_ENABLED=true` dans les variables Netlify.
- **Comportement** :
  - **Image** : appel Gemini OCR → étape CONFIRM_FLIGHT avec le vol extrait.
  - **Texte** : mise à jour de la session (en mémoire), réponses selon l’étape ; si question ouverte → `geminiSideAnswer` puis rappel de l’étape.
- **Sessions** : en mémoire dans la fonction (perdues au cold start). Pour une persistance avec `robin.db`, utiliser un backend qui appelle `handleTunnelMessage` de `src/webhook/whatsapp-webhook.ts`.

---

## 5. Fichiers

| Fichier | Rôle |
|---------|------|
| `src/db/robinDb.ts` | Table `whatsapp_sessions`, getSession, upsertSession, updateSessionStep |
| `src/services/sessionManager.ts` | Étapes, scripts, processUserReply, processVerdict |
| `src/services/geminiService.ts` | extractBoardingPass (OCR), answerInTunnel (réponses naturelles) |
| `src/webhook/whatsapp-webhook.ts` | handleTunnelMessage (pour backend avec robin.db) |
| `netlify/functions/whatsapp-webhook.js` | GET/POST webhook ; si ROBIN_TUNNEL_ENABLED → tunnel (sessions en mémoire + Gemini) |

---

## 6. Utilisation du handler TS (backend avec robin.db)

```ts
import { handleTunnelMessage } from './webhook/whatsapp-webhook';

const result = await handleTunnelMessage({
  phoneNumber: '33612345678',
  messageText: 'OUI',
  imageBase64: null,
});
console.log(result.reply);
```

---

*Robin des Airs — Tunnel conversationnel*

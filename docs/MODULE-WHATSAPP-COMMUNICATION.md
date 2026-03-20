# Module de communication WhatsApp — Robin des Airs

Objectif : **réduire la friction** (clics, boutons, listes) tout en gardant la **logique métier** dans le webhook Netlify (`whatsapp-webhook.js`). Pas de dépendance obligatoire à Make pour le dialogue en temps réel.

## 1. Ce qui est en place (code)

| Fonction | Description |
|----------|-------------|
| **Menu d’accueil** (tunnel activé) | 3 boutons : **Carte vol** · **N° de vol** · **Parcours** (formulaire mandat étape par étape). |
| **Oui / Non** | Boutons ✅ Oui / ❌ Non (IDs `robin_oui` / `robin_non`) aux étapes clés (passagers, correspondance, PNR, téléphone, etc.). |
| **Nombre de passagers** | Liste interactive : 1 à 6 + **7 ou plus** → saisie manuelle 7–20. |
| **Date du vol** | Après choix du nombre de passagers : boutons **Oui** / **Autre date** (`date_edit`). |
| **Carte d’embarquement** | Toujours possible en **photo** ; OCR Gemini (inchangé). |

### Variable Netlify

| Variable | Défaut | Effet |
|----------|--------|--------|
| `ROBIN_WHATSAPP_INTERACTIVE` | *(activé)* | Mettre **`false`** pour forcer uniquement des messages **texte** (pas de boutons/listes). Utile en debug si l’API renvoie une erreur sur `interactive`. |

Les clics bouton/liste arrivent comme `type: interactive` ; le webhook les convertit en texte canonique (`OUI`, `NON`, `1`… `7+`, `DATE_EDIT`, `menu_card`…) pour la suite du tunnel et pour les logs.

---

## 2. Make.com — pas de module 360dialog

**Normal** : il n’y a souvent **pas** d’app Make native « 360dialog ». Deux patterns recommandés :

### A) Orchestration **sans** latence conversationnelle

1. **Webhook Make** (trigger) : URL fournie par Make.  
2. Netlify : variable **`ROBIN_LOG_WEBHOOK_URL`** = cette URL.  
3. Chaque message entrant (texte ou clic) est **POSTé en JSON** (voir `WEBHOOK-WHATSAPP.md`) : `body_text` contient déjà la valeur **normalisée** (`OUI`, numéro de passagers, etc.).

Make sert alors à : CRM, Sheet, notifications, tâches humaines — **pas** à remplacer le bot en direct.

### B) Appels sortants depuis Make vers WhatsApp

- Module **HTTP** Make → `POST` vers l’API **360dialog** (`https://waba-v2.360dialog.io/messages`) ou **Graph Meta**, avec le même JSON que dans `send-whatsapp.js` / la doc officielle.  
- Header **`D360-API-KEY`** (360dialog) ou **`Authorization: Bearer …`** (Meta).

⚠️ Les messages **interactifs** (boutons/listes) doivent respecter les **limites Meta** (ex. titre bouton ≤ 20 caractères, max 3 boutons « reply »).

---

## 3. Vérification d’identité / « Verify » (carte d’identité)

- **Lecture carte d’embarquement** : déjà gérée par **Gemini (vision)** dans le webhook (pas un produit « Verify » externe obligatoire).  
- **Vérification d’identité réglementée** (KYC type Veriff / Onfido / autre) :

  1. Le webhook ou Make crée une **session** chez le fournisseur (API).  
  2. Robin envoie sur WhatsApp un **lien** unique vers le parcours Verify.  
  3. Le fournisseur appelle un **callback** (URL Netlify dédiée ou webhook Make) avec le résultat ; vous mettez à jour le dossier (Sheet, base, etc.).

👉 Implémentation **spécifique au prestataire** choisi : à ajouter comme nouvelle fonction Netlify ou scénario Make + secret partagé (`VERIFY_WEBHOOK_SECRET`, etc.). Non inclus dans le dépôt tant qu’un fournisseur n’est pas figé.

---

## 4. Parcours « vite » — bonnes pratiques

1. **Tunnel + Gemini** activés pour proposer photo **ou** menu.  
2. Garder **`ROBIN_GEMINI_DELAY_ENABLED=false`** si vous voulez des réponses **instantanées** sur chaque message (sinon délai ~20 s + cron).  
3. **Ne pas** doubler Make sur le chemin critique du premier message (risque de latence).  
4. Tester sur un **vrai téléphone** : les listes s’ouvrent via le bouton **« Choisir »** sous le message.

---

## 5. Fichiers utiles

- `netlify/functions/whatsapp-webhook.js` — logique menu, boutons, listes, tunnel.  
- `WEBHOOK-WHATSAPP.md` — variables, URL webhook, migration 360dialog.  
- `netlify/functions/send-whatsapp.js` — envoi programmatique (Make / interne).

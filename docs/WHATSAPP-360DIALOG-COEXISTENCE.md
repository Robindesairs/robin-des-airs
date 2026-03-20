# WhatsApp Coexistence — 360dialog + WhatsApp Business App

**Coexistence** = utiliser **le même numéro** à la fois sur l’**application WhatsApp Business** (mobile) et sur la **WhatsApp Business Platform** (API Cloud / 360dialog). Vous pouvez ainsi garder l’app pour répondre manuellement tout en recevant les webhooks et en envoyant via l’API (ex. Netlify `whatsapp-webhook`).

> Source : procédure 360dialog « Embedded Signup » (onboarding Coexistence). Adapter selon l’évolution de leur Hub.

---

## Prérequis

1. **Dernière version** de l’app **WhatsApp Business** sur un smartphone **avec caméra** (scan QR pendant l’inscription).
2. Le numéro ne doit pas être dans une **région restreinte** (voir politique Meta / 360dialog).
3. **Meta Business Portfolio** : vous pouvez en créer une nouvelle ou connecter une existante pendant l’**Embedded Signup**.
   - **Important** : le **portfolio ne peut pas être changé** après enregistrement du numéro. Choisissez-le avec soin.
   - **Obligatoire** : le portfolio doit appartenir à **l’entreprise qui envoie les messages**. Ajouter des utilisateurs extérieurs à l’entreprise peut entraîner un **blocage** du portfolio.
4. Renseigner les **Business Info** du portfolio (paramètres) : **raison sociale**, **adresse**, **site web**, **numéro** utilisé pour la messagerie.

---

## Compte 360dialog : Direct-Paid vs Partner-Paid

- Le bouton **Add number** peut être **désactivé** sur les comptes **Partner-Paid**. Dans ce cas, suivre la doc du **partenaire** ou le contacter.
- Ce guide **Coexistence** cible surtout les comptes **Direct-Paid** (bouton actif).

---

## Procédure pas à pas (Hub 360dialog)

### 1. Démarrer l’Embedded Signup

- Sans compte Hub : lien fourni par le **partenaire d’intégration** ou [page d’inscription 360dialog](https://www.360dialog.com/).
- Avec compte : se connecter au **360dialog Hub**.

### 2. Ajouter le numéro

- Cliquer sur **Add number** (ou menu en haut à droite → **Add number** si un numéro existe déjà).
- Dans le formulaire :
  - **Non**, ce numéro n’est **pas** connecté à l’API WhatsApp Business.
  - **Oui**, ce numéro est connecté à l’**application WhatsApp Business**.
- Confirmer avec **Confirm the number details**.

### 3. Connecter l’app WhatsApp Business

- Choisir l’option **Connect a WhatsApp Business App**.
- Saisir à nouveau le numéro et **vérifier** (OTP, etc.).
- Sur le téléphone : ouvrir l’**app WhatsApp Business** et suivre les instructions.
- Un message WhatsApp invite à **scanner un QR code** : ouvrir le message, scanner le QR affiché à l’écran (navigateur / Hub).

### 4. Migration et synchronisation de l’historique

En appuyant sur le bouton du message :

- Meta / le flux informe que l’**historique de chat** peut être migré vers 360dialog.
- **Synchronisation** historique + contacts (souvent **optionnelle**).

En choisissant **Scan QR code** :

- Partage de l’historique avec 360dialog.
- **Connexion** au WhatsApp Business Platform.

### 5. Finaliser l’Embedded Signup

- Confirmer ou modifier les informations du **WhatsApp Business Account**.
- À la fin :
  - 360dialog **crée l’intégration**.
  - Le numéro est **prêt pour l’API**.
  - Sync contacts / historique démarre si vous l’avez acceptée.
  - Les **webhooks** sont journalisés et consultables.

---

## Sans app WhatsApp Business sur ce numéro ?

Si le numéro **n’est pas** (encore) sur l’app Business, suivre plutôt le parcours **sans Coexistence** : ajouter le numéro **uniquement** à la plateforme (lien « add your phone number to WhatsApp Business Platform **without** using Coexistence » dans la doc 360dialog).

---

## Côté Robin des Airs (rappel technique)

- **Webhooks** entrants : Netlify → `/.netlify/functions/whatsapp-webhook` (redirection `/api/whatsapp-webhook`).
- Variables d’environnement typiques : clés **360dialog** / **Meta** selon le fournisseur d’envoi, `WHATSAPP_API_KEY` pour la vérif GET du webhook, etc. Voir `docs/MODULE-WHATSAPP-COMMUNICATION.md`.

---

## Points d’attention juridique / opérationnels

- Le **portfolio Meta** et le **nom légal** affichés doivent correspondre à l’**entité responsable** des messages (conformité Meta, risque de suspension).
- Après Coexistence, **tester** réception webhook + envoi API pour le même numéro que celui utilisé dans l’app.

*Document interne — à mettre à jour si 360dialog modifie l’Embedded Signup.*

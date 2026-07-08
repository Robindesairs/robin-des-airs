# Migration WhatsApp : WATI vers Twilio (et Meta Cloud API direct)

Objectif : sortir de l'abonnement WATI (92 EUR/mois fixes) vers un fournisseur au message, avec bascule par une seule variable d'environnement. Le code est prêt et testable dès maintenant en Sandbox, sans immatriculation et sans toucher le numéro de production.

## Principe

Tout l'accès WhatsApp de `server.js` est isolé derrière un adaptateur. Le sélecteur `WA_PROVIDER` choisit la plomberie :

- `WA_PROVIDER` absent ou `wati` (defaut) : comportement WATI actuel, strictement inchange.
- `WA_PROVIDER=twilio` : tous les envois, relances et médias passent par `lib/wa-twilio.js`, et l'inbound arrive sur `/api/twilio-webhook`.

Fichiers concernés :

- `lib/wa-twilio.js` : l'adaptateur Twilio (envoi texte, template, médias, parsing de l'inbound). Nouveau fichier, aucun risque pour la prod.
- `server.js` : dispatch conditionnel (`cfg.provider === 'twilio'`) dans `send`, `sendButtons`, `sendList`, `watiSendTemplate`, `mediaFetchHeaders` ; helper `waCfg()` ; boucle d'inbound extraite en `processInboundItems()` ; route `/api/twilio-webhook`.

## Variables d'environnement

| Variable | Sandbox (test) | Production |
|---|---|---|
| `WA_PROVIDER` | `twilio` | `twilio` |
| `TWILIO_ACCOUNT_SID` | votre SID (console Twilio) | idem |
| `TWILIO_AUTH_TOKEN` | votre token (console Twilio) | idem |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` (numero Sandbox) | `whatsapp:+33756863630` (votre numero) |
| `TWILIO_TEMPLATE_MAP` | non requis en test | `{"relance_dossier_a_finaliser":"HXxxx","relance_preuve_sociale":"HXyyy","relance_derniere_chance":"HXzzz"}` |
| `WATI_WEBHOOK_SECRET` | inchange (protege aussi la route Twilio) | inchange |

La voie WATI garde ses variables (`WATI_API_TOKEN`, `WATI_API_BASE`, etc.). Pour revenir à WATI : retirer `WA_PROVIDER` (ou le mettre à `wati`). Bascule et retour arriere instantanes.

## Tester en Sandbox (cette semaine, sans SASU)

1. Créer un compte Twilio, aller dans Messaging puis Try it out puis WhatsApp Sandbox.
2. Depuis votre téléphone, envoyer le code d'activation (ex. `join xxxx-yyyy`) au numéro Sandbox `+1 415 523 8886`.
3. Dans la config Sandbox, mettre le webhook entrant sur :
   `https://<votre-railway>/api/twilio-webhook?s=<WATI_WEBHOOK_SECRET>` (methode POST).
4. Sur Railway (ou en local), définir `WA_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`.
5. Écrire « Bonjour » au numéro Sandbox : le bot doit répondre, dérouler le tunnel (langue, numéro de vol, éligibilité), lire une photo de billet, et proposer le lien de signature.

En Sandbox, les boutons s'affichent en repli numéroté (« 1 - ... », « 2 - ... ») : c'est normal, les handlers acceptent déjà le numéro. Les vrais boutons cliquables se règlent en production via des Content Templates.

## Templates à recréer côté Twilio (Content Template Builder)

Trois templates de relance (catégorie utilitaire) sont utilisés hors fenêtre 24 h. À recréer dans Twilio, faire approuver par Meta, puis reporter les ContentSid dans `TWILIO_TEMPLATE_MAP` :

| Nom interne (clé) | Palier | Contenu |
|---|---|---|
| `relance_dossier_a_finaliser` | J+1 | rappel de finaliser le dossier |
| `relance_preuve_sociale` | J+2 | relance avec preuve sociale |
| `relance_derniere_chance` | J+4 | dernière relance |

Tant que `TWILIO_TEMPLATE_MAP` n'est pas rempli, `twilioSendTemplate` renvoie `unmapped` et ne casse rien (les relances hors fenêtre ne partent simplement pas). Le tunnel dans la fenêtre 24 h, lui, fonctionne sans template.

## Passage en production (après immatriculation SASU + SIREN)

L'exigence vient de Meta, pas de Twilio, et vaut aussi pour le Meta Cloud API direct :

1. SASU immatriculée (SIREN).
2. Meta Business Manager + vérification Business (plusieurs semaines, documents de l'entreprise).
3. Migration du numero `+33 7 56 86 36 30` hors de la WABA WATI vers la WABA Twilio (désactiver la 2FA côté WATI, code de migration, revérification). Bref temps d'indisponibilité : à faire à un moment calme.
4. Faire approuver les 3 templates, remplir `TWILIO_TEMPLATE_MAP`.
5. Basculer le webhook Meta/Twilio, mettre `WA_PROVIDER=twilio`, tester, puis fermer le compte WATI.
6. Durcissement : ajouter la validation `X-Twilio-Signature` sur `/api/twilio-webhook` (aujourd'hui protégé par le secret partagé, suffisant en Sandbox).

## Alternative Meta Cloud API direct

Même architecture. Il suffira d'ajouter un `lib/wa-meta.js` sur le même patron que `lib/wa-twilio.js` et un cas `WA_PROVIDER=meta` dans `waCfg()`. Avantage : stockage EU/Allemagne configurable, pas de marge intermédiaire. Inconvénient : plus d'exploitation à gérer soi-même. Le choix final Twilio contre Meta direct peut se faire tard, le code d'appel est quasi identique.

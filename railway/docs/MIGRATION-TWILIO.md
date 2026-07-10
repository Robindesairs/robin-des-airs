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

## Passage en production

Correction importante : la prod NON-VÉRIFIÉE fonctionne SANS immatriculation. Un numéro enregistré comme sender Twilio est actif immédiatement au palier **250 conversations initiées / 24 h** (réponses dans la fenêtre 24 h illimitées). L'immatriculation SASU + la vérification Business Meta ne servent QU'À lever ce plafond (250 → 1 000 → plus). Le verrou vient de Meta, pas de Twilio, et vaut aussi pour le Meta Cloud API direct.

Étapes pour ouvrir aux vrais clients (dès maintenant, sans SASU) :

1. Enregistrer le numéro comme WhatsApp sender (console Twilio → Messaging → Senders → WhatsApp senders) via le parcours Meta embedded signup : Meta Business Manager (créable par un particulier) + validation OTP. Palier non-vérifié 250/24 h.
2. Configurer le webhook entrant du sender sur `https://<railway>/api/twilio-webhook?s=<WATI_WEBHOOK_SECRET>` (POST).
3. Sur Railway : `WA_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM=whatsapp:+33756863630`.
4. Tester le tunnel bout-en-bout (message réel au numéro), puis fermer WATI.

À faire plus tard, seulement pour dépasser 250/24 h : SASU immatriculée (SIREN) + vérification Business Meta (documents de l'entreprise).

Note migration de numéro : un numéro n'existe que sur une seule WABA. Activer `+33 7 56 86 36 30` sur Twilio le retire donc de WATI (désactiver la 2FA côté WATI si demandé, code de migration). Sans client actif, aucune coupure sensible ; le numéro n'a de valeur que d'être publié (bio, `wa.me`), à repointer si on prend un numéro neuf.

Templates hors-fenêtre 24 h : faire approuver les 3 relances par Meta, remplir `TWILIO_TEMPLATE_MAP`.

Durcissement signature (FAIT) : `/api/twilio-webhook` valide désormais `X-Twilio-Signature` (`lib/wa-twilio.js` → `validateTwilioSignature`, HMAC-SHA1). Déploiement sûr : par défaut en OBSERVATION (log « signature NON valide » sans bloquer). Une fois vérifié dans les logs que la signature matche, poser `TWILIO_VALIDATE_SIGNATURE=1` pour ENFORCER (rejet 403). `TWILIO_PUBLIC_URL` force la base d'URL exacte si le proxy Railway ne la reconstitue pas.

## Alternative Meta Cloud API direct

Même architecture. Il suffira d'ajouter un `lib/wa-meta.js` sur le même patron que `lib/wa-twilio.js` et un cas `WA_PROVIDER=meta` dans `waCfg()`. Avantage : stockage EU/Allemagne configurable, pas de marge intermédiaire. Inconvénient : plus d'exploitation à gérer soi-même. Le choix final Twilio contre Meta direct peut se faire tard, le code d'appel est quasi identique.

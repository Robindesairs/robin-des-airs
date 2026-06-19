# Templates WhatsApp (WATI / Meta) — Robin des Airs

> Modèles **approuvables Meta** prêts à copier-coller dans **WATI → Broadcast → Template Messages**.
> Ils servent à joindre un client **quand la fenêtre 24 h est fermée** — le seul cas où le bot
> (`railway/server.js`) ne peut plus écrire gratuitement.

---

## 0. Quand a-t-on besoin d'un template ? (lire avant tout)

WhatsApp impose une **fenêtre de service de 24 h** : on ne peut envoyer du **texte libre**
(les relances de `railway/lib/relance-variants.js`) **que** si le client nous a écrit dans les
dernières 24 h. Cette fenêtre n'est rouverte **que par un message ENTRANT du client** — nos
relances ne la rouvrent pas.

| Situation | Fenêtre 24 h | Quoi envoyer |
|---|---|---|
| Le client vient d'écrire / a tapé un bouton | **ouverte** | Texte libre du bot (gratuit) — déjà géré par `relance-variants.js` |
| Le client est silencieux depuis > 24 h (`Invalid Conversation` côté WATI, bascule « À rappeler ») | **fermée** | **Template approuvé** (ce document) — payant, mais seul moyen de le re-toucher |

**Architecture à retenir (pas de duplication)** : une relance hors-fenêtre n'a *pas* besoin d'être
déclinée par étape (récap / passeport / carte / e-billet / certificat). On envoie **un seul template
de ré-engagement** avec un bouton **« Reprendre mon dossier »**. Le tap = message entrant → **rouvre
la fenêtre 24 h** → le bot reprend ensuite tout seul, à l'étape exacte d'arrêt, avec les messages
déjà existants. Le template ne fait que **ramener le client dans la conversation**.

```
Fenêtre fermée → [Template MARKETING A1] → client tape « Reprendre »
   → fenêtre 24 h rouverte → bot RELANCE_ENGAGED/ENG_* (gratuit, adapté à l'étape)
```

---

## 1. Conventions Meta (à respecter sous peine de refus)

- **Nom** : minuscules, chiffres, `_` uniquement. **Pas d'accent, pas d'espace, pas de majuscule.**
  (⚠️ l'ancien `dossier_reçu` de `WHATSAPP-AUTO.md` est invalide → utiliser `dossier_recu`.)
- **Variables** : numérotées `{{1}}`, `{{2}}`… dans l'ordre. Le corps **ne peut pas commencer
  ni finir par une variable**, et **deux variables ne peuvent pas se toucher**.
- **Corps** ≤ 1024 caractères · **Header texte** ≤ 60 · **Footer** ≤ 60.
- **Boutons** : on **ne mélange pas** Quick Reply et CTA (URL/Appel) dans le même template.
  Quick Reply : viser ≤ 3. Le **payload** du bouton doit mapper un handler du bot.
- **Catégorie** :
  - **UTILITY** = mise à jour d'un dossier/transaction existant (statut, pièce). Approbation facile, **moins cher**.
  - **MARKETING** = ré-engagement / incitation / parrainage. Le client peut se désabonner.
  - Mettre la **bonne** catégorie : un MARKETING déguisé en UTILITY se fait recatégoriser (ou refuser).
- **Échantillons** : WATI exige une valeur d'exemple par variable à la soumission (colonnes ci-dessous).

### Variables standard (mapping vers les données dossier)

| Placeholder | Donnée | Source code | Exemple |
|---|---|---|---|
| `{{prenom}}` | prénom client | `STATE.prenom` / lead | `Awa` |
| `{{ref}}` | référence dossier RDA | `REF` | `RDA-260614-1234` |
| `{{vol}}` | n° de vol | `VOL` | `AF718` |
| `{{total}}` | montant visé (brut) | `TOTAL` (400 € Maroc, 600 € sinon) | `600 €` |
| `{{net}}` | part nette client | net (≈ −25 %) | `450 €` |

> En `templateParams` (appel `send-whatsapp`), c'est **positionnel** : `["Awa","AF718","600 €"]`
> pour `{{1}} {{2}} {{3}}`. Les noms ci-dessus sont juste une aide de lecture.

### Footer signature (réutilisable partout, 45 car. — OK)

```
On prend aux compagnies, on rend aux familles
```

---

## A. RÉ-ENGAGEMENT — relance hors fenêtre 24 h · catégorie **MARKETING**

> Bouton **Quick Reply** obligatoire : c'est le tap qui rouvre la fenêtre et redonne la main au bot.
> Mapper le payload : `Reprendre`→ reprise flux · `Rappel`→ liste « À rappeler » bureau · `Plus tard`→ T1.3.

### A1 — `relance_dossier_a_finaliser` (relance principale, ton humoristique — version live 19/06/2026)
- **Catégorie** : MARKETING · **Langue** : fr
- **Header** (texte) : `Petit oubli, gros chèque`
- **Corps** :
  ```
  Bonjour {{1}} 👋 votre vol {{2}} est loin... mais votre dossier, lui, fait la sieste depuis hier 😴

  2 minutes de votre temps contre jusqu'à {{3}} qui vous reviennent : avouez que le taux horaire est joli. Et c'est nous qui faisons tout le reste.

  La seule contente que vous laissiez tomber, c'est la compagnie. On ne va pas lui faire ce plaisir, si ? 0 € si on ne gagne pas.

  On reprend où vous vous étiez arrêté(e) ?
  ```
- **Footer** : `On prend aux compagnies, on rend aux familles`
- **Boutons** (Quick Reply) : `Reprendre mon dossier` · `Être rappelé(e)`
- **Échantillons** : `{{1}}=Awa` · `{{2}}=AF718` · `{{3}}=600 €`
> Angle = effort/récompense (« 2 min vs 600 € »), généré par concile copywriting (4 sous-agents). Footer + boutons SANS emoji (refus Meta) ; emojis OK dans le corps.

### A2 — `relance_preuve_sociale` (2ᵉ relance, angle « autres passagers »)
- **Catégorie** : MARKETING · fr
- **Corps** :
  ```
  Bonjour {{1}}, on revient vers vous 🙂

  Plusieurs passagers de votre vol {{2}} ont déjà lancé leur réclamation avec nous. Plus on est nombreux, plus le dossier est solide.

  Votre place est gardée — il suffit de reprendre pour viser jusqu'à {{3}} (0 € si on ne gagne pas).
  ```
- **Footer** : `On prend aux compagnies, on rend aux familles`
- **Boutons** : `Reprendre mon dossier` · `Être rappelé(e)`
- **Échantillons** : `Awa` · `AF718` · `600 €`

### A3 — `relance_derniere_chance` (dernière relance, urgence douce)
- **Catégorie** : MARKETING · fr
- **Corps** :
  ```
  Bonjour {{1}}, dernier petit rappel pour votre dossier (vol {{2}}) 🙏

  Votre indemnisation (jusqu'à {{3}}) peut encore être réclamée — autant qu'elle vous revienne plutôt qu'elle reste à la compagnie.

  Une minute suffit pour reprendre, on fait le reste.
  ```
- **Footer** : `On prend aux compagnies, on rend aux familles`
- **Boutons** : `Reprendre mon dossier` · `Plus tard`
- **Échantillons** : `Awa` · `AF718` · `600 €`

> ⚠️ Les **3 relances A partagent le même ordre de variables** (`{{1}}` prénom · `{{2}}` vol/voyage · `{{3}}` montant) — c'est ce que le bot envoie automatiquement (cf. § 4). Ne changez pas cet ordre sans adapter `HSM_RELANCE` dans `railway/server.js`.

---

## B. SUIVI DE DOSSIER — milestones · catégorie **UTILITY**

> Mises à jour d'un dossier existant → faciles à approuver, moins chères, joignent même hors-fenêtre.
> Elles **entretiennent la confiance** et **gardent le client engagé** sans effort commercial.

### B1 — `dossier_recu` (accusé de réception)
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Bonjour {{1}}, votre dossier {{2}} a bien été enregistré ✅

  Nous prenons le relais et réclamons jusqu'à {{3}} en votre nom auprès de la compagnie. On vous tient informé(e) à chaque étape — vous n'avez rien à avancer.
  ```
- **Footer** : `On prend aux compagnies, on rend aux familles`
- **Échantillons** : `Awa` · `RDA-260614-1234` · `600 €`

### B2 — `mandat_signe` (confirmation signature mandat)
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Merci {{1}} 🙏 Votre mandat pour le dossier {{2}} est bien signé.

  Votre réclamation est désormais entre nos mains : on engage la démarche auprès de la compagnie pour récupérer jusqu'à {{3}}. Rappel : 0 € à payer, on se rémunère uniquement en cas de succès (commission 25 %).
  ```
- **Footer** : `On prend aux compagnies, on rend aux familles`
- **Échantillons** : `Awa` · `RDA-260614-1234` · `600 €`

### B3 — `reclamation_envoyee` (réclamation partie à la compagnie)
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Bonne nouvelle {{1}} ✈️ Votre réclamation pour le vol {{2}} vient d'être envoyée à la compagnie.

  La loi leur laisse un délai pour répondre. On suit ça de près et on revient vers vous dès qu'il y a du nouveau.
  ```
- **Échantillons** : `Awa` · `AF718`

### B4 — `relance_compagnie` (mise en demeure / relance formelle)
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Point sur votre dossier {{1}}, {{2}} : la compagnie n'a pas encore répondu dans les délais, alors on vient de lui envoyer une relance formelle (mise en demeure).

  C'est une étape normale de la procédure. On continue de défendre votre indemnisation.
  ```
- **Échantillons** : `{{1}}=RDA-260614-1234` · `{{2}}=Awa`

### B5 — `reponse_compagnie_accord` (la compagnie accepte)
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Très bonne nouvelle {{1}} 🎉 La compagnie a accepté d'indemniser votre dossier {{2}}.

  Un conseiller revient vers vous très vite pour la suite et le versement de votre indemnité.
  ```
- **Boutons** (Quick Reply) : `Être rappelé(e)`
- **Échantillons** : `Awa` · `RDA-260614-1234`

### B6 — `escalade_procedure` (médiateur / contentieux)
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Point sur votre dossier {{1}}, {{2}} : faute de réponse satisfaisante de la compagnie, on passe à l'étape supérieure (saisine du médiateur, puis procédure si nécessaire).

  Vous n'avez rien à faire ni à avancer — on porte votre dossier jusqu'au bout.
  ```
- **Échantillons** : `RDA-260614-1234` · `Awa`

### B7 — `paiement_en_cours` (indemnité obtenue → versement)
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Excellente nouvelle {{1}} 💸 L'indemnité de votre dossier {{2}} a été obtenue.

  Votre part, soit {{3}}, part vers vous. Merci de votre confiance — c'est exactement pour ça qu'on existe.
  ```
- **Footer** : `On prend aux compagnies, on rend aux familles`
- **Échantillons** : `Awa` · `RDA-260614-1234` · `net=450 €`

---

## C. PIÈCES MANQUANTES · catégorie **UTILITY**

### C1 — `piece_manquante` (relance document, générique)
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Bonjour {{1}}, votre dossier {{2}} avance bien 🙂 Il nous manque encore une pièce pour le finaliser : {{3}}.

  Une simple photo suffit, directement ici dans la conversation. Vos données ne servent qu'à votre réclamation et ne sont jamais revendues 🔒.
  ```
- **Boutons** (Quick Reply) : `Envoyer maintenant` · `Être rappelé(e)`
- **Échantillons** : `Awa` · `RDA-260614-1234` · `{{3}}=une pièce d'identité (passeport, CNI ou titre de séjour)`
- *Valeurs `{{3}}` types* : `une pièce d'identité…` · `votre carte d'embarquement (ou e-billet / confirmation de réservation)` · `votre confirmation de réservation`

### C2 — `photo_a_reprendre` (qualité photo insuffisante)
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Merci {{1}} 🙏 Petit souci sur le document reçu pour le dossier {{2}} : il est {{3}} et risque d'être refusé par la compagnie.

  Pouvez-vous le reprendre à plat, en pleine lumière, les 4 coins bien visibles ? Ça sécurise votre demande.
  ```
- **Boutons** (Quick Reply) : `Renvoyer la photo`
- **Échantillons** : `Awa` · `RDA-260614-1234` · `{{3}}=un peu flou`

### C3 — `dossier_lien_depot` (lien de dépôt personnalisé) · **UTILITY**
> Envoyé par un **opérateur depuis le CRM** (bouton « Demander les pièces au client ») pour
> qu'un client dépose lui-même sa **carte d'embarquement + passeport(s)** — fonctionne **hors
> fenêtre 24h**. Le lien `{{3}}` pointe vers `depot-en-ligne.html?r=<jeton>` (jeton opaque,
> non devinable, généré par `/api/crm-depot-link`).
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Bonjour {{1}} 👋

  Pour préparer votre dossier {{2}}, déposez ici en quelques secondes votre carte d'embarquement et votre pièce d'identité (passeport ou CNI) :

  {{3}}

  Vos documents sont chiffrés et ne servent qu'à votre réclamation 🔒.
  ```
- **Échantillons** : `Awa` · `RDA-260614-1234` · `{{3}}=https://robindesairs.eu/depot-en-ligne.html?r=RDA-260614-ABC123`
- **Note** : si Meta préfère un **bouton URL dynamique** à l'approbation, basculer sur `URLBTN` + étendre `crm-template-send` pour passer le suffixe du bouton (petit complément).

---

## D. RAPPEL TÉLÉPHONIQUE & PARRAINAGE

### D1 — `rappel_programme` (confirmation de rappel) · **UTILITY**
> Sert aussi pour les clients wolof/bambara : le **conseiller** rappelle dans la langue ;
> ne **jamais** écrire que WhatsApp répond dans la langue du client (faux + non conforme).
- **Catégorie** : UTILITY · fr
- **Corps** :
  ```
  Bonjour {{1}}, c'est noté 📞 Un conseiller Robin des Airs vous rappelle {{2}} au sujet de votre dossier {{3}}.

  Vous pouvez aussi nous écrire ici à tout moment, on vous répond.
  ```
- **Échantillons** : `Awa` · `{{2}}=aujourd'hui avant 18h` · `{{3}}=RDA-260614-1234`

### D2 — `parrainage` (après paiement) · **MARKETING**
- **Catégorie** : MARKETING · fr
- **Corps** :
  ```
  Bonjour {{1}} 🙌 Content(e) d'avoir récupéré votre indemnité avec vous !

  Un proche a vécu un vol retardé (3 h ou plus), annulé ou un refus d'embarquement — même jusqu'à 5 ans en arrière ? Transmettez-lui notre contact : même accompagnement, 0 € à avancer.
  ```
- **Footer** : `On prend aux compagnies, on rend aux familles`
- **Boutons** (CTA URL) : `Partager Robin des Airs` → `https://robindesairs.eu`
- **Échantillons** : `Awa`

---

## E. FRAIS / DÉPENSES — relance post-signature · catégorie **UTILITY**

> Relance hors-fenêtre pour les clients SIGNÉS, afin de récupérer leurs reçus de dépenses
> (repas/hôtel/taxi, art. 9 CE261), remboursables EN PLUS de l'indemnité. Le tap d'un bouton
> rouvre la fenêtre 24 h → le bot collecte les reçus. ⚠️ NON encore câblé dans `runRelances`
> (à brancher après approbation Meta : timing « J+1 lendemain matin » + routage des boutons).
> Voir mémoire `frais-art9-seuils-recap`.

### E1 — `relance_frais_j1_fr` · UTILITY · fr
- **Corps** (une seule variable `{{1}}` = prénom) :
  ```
  Bonjour {{1}}

  Votre dossier est bien en cours chez Robin des Airs.

  Une question pour compléter votre réclamation : avez-vous payé un repas, un taxi ou une nuit d'hôtel à cause de ce vol ? Ces dépenses peuvent vous revenir en plus de votre indemnité.

  Si oui, gardez vos tickets — répondez ici et on vous dit comment les envoyer.
  ```
- **Boutons** (Quick Reply, sans emoji) : `J'ai des tickets` · `Pas de dépenses`
- **Footer** : `On prend aux compagnies, on rend aux familles`
- **Échantillon** : `{{1}}=Awa`

### E2 — `relance_frais_j1_en` · UTILITY · en
- **Corps** :
  ```
  Hello {{1}}

  Your compensation claim is being handled by Robin des Airs.

  One quick question to complete your file: did you pay for a meal, a taxi or a hotel night because of this flight? These costs can be refunded on top of your compensation.

  If so, keep your receipts — reply here and we'll tell you how to send them.
  ```
- **Boutons** (Quick Reply) : `I have receipts` · `No expenses`
- **Footer** : `On prend aux compagnies, on rend aux familles`
- **Échantillon** : `{{1}}=Awa`

---

## 2. Comment les envoyer

### Option 1 — WATI (interface, recommandé pour démarrer)
1. WATI → **Broadcast** → **Template Messages** → **Add Template** → copier nom/catégorie/corps/boutons ci-dessus.
2. Attendre l'approbation Meta (souvent 24–48 h ; UTILITY plus rapide).
3. Lancer un **Broadcast** ciblé (ex. leads « À rappeler ») ou déclencher via une **automation** WATI.

### Option 2 — par code (`send-whatsapp`, déjà branché Meta/360dialog)
```json
POST https://robindesairs.eu/.netlify/functions/send-whatsapp
{
  "secret": "<WHATSAPP_WEBHOOK_SECRET>",
  "to": "33612345678",
  "template": "relance_dossier_a_finaliser",
  "templateParams": ["Awa", "AF718", "600 €"],
  "language": "fr"
}
```
> `templateParams` = valeurs de `{{1}} {{2}} {{3}}` **dans l'ordre**. Voir `WHATSAPP-AUTO.md`.

### Option 3 — ENVOI AUTOMATIQUE (câblé ✅, désactivé par défaut)

Deux automates existent déjà dans le code. **Rien ne part tant que tu n'as pas (1) fait approuver les
templates côté Meta/WATI et (2) activé le flag.** Tant que le flag est OFF, les automates tournent à vide
(et amorcent leur état) → activer plus tard ne déclenche **aucun** envoi en masse sur le backlog.

**A. Relances hors-fenêtre** — `railway/server.js`, dans `runRelances()` (balayage /15 min).
Quand un lead non signé passe `windowClosed`, le bot envoie **A1 → A2 → A3** aux paliers de **silence
J+2 / J+3 / J+5** (la fenêtre ferme à J+1), max **1 template/jour**. Le tap « Reprendre » rouvre la
fenêtre → le bot reprend avec les messages adaptés à l'étape (`RELANCE_ENGAGED_*` / `ENG_*`).
- **Activer** : variable Railway `RELANCE_HSM_TEMPLATES=1`
- **Noms surchargeables** : `HSM_TPL_RELANCE_1` / `_2` / `_3` (défaut = `relance_dossier_a_finaliser`, `relance_preuve_sociale`, `relance_derniere_chance`)
- Garde-fous : jamais si `signed`, si rappel demandé (`wantsCall`), ou si signé entre-temps (`is-signed`).

**B. Notifs de statut** — fonction Netlify `crm-status-notify` (`/api/crm-status-notify`, cron 2×/j).
Balaie Airtable, détecte un **changement** de « Statut du Dossier Suivi » et envoie le template UTILITY :

| Statut Airtable | Template |
|---|---|
| `Mandat signé` | `mandat_signe` |
| `LRAR envoyée` | `reclamation_envoyee` |
| `Relance 1` / `Relance 2` | `relance_compagnie` |
| `Médiation` / `Contentieux` | `escalade_procedure` |
| `Payé client` / `Payé` / `Indemnisé` | `paiement_en_cours` |

- **Activer** : `CRM_STATUS_TEMPLATES=1` (Netlify) **+** décommenter `[functions."crm-status-notify"]` dans `netlify.toml`
- **Idempotent** : n'envoie que sur une vraie transition ; le 1er passage amorce l'état (Blobs `crm-status-notify`) sans rien envoyer.
- **Test manuel** : `GET /api/crm-status-notify?secret=<WATI_WEBHOOK_SECRET>` → renvoie `{scanned, transitions, sent, dryRun}`.

---

### Intégration CRM / création (câblé ✅)

- **Création en masse** : `node scripts/meta-create-templates.js --submit` soumet les 14 templates à Meta d'un coup (dry-run sans `--submit`). Requiert `WHATSAPP_WABA_ID` + `WHATSAPP_ACCESS_TOKEN` (scope `whatsapp_business_management`). Les templates vivent sur le WABA → WATI les voit.
- **Bouton « Relancer » dans le bureau** : chaque dossier « À rappeler » (`bureau.html`) a un bouton qui envoie `relance_dossier_a_finaliser` via `POST /api/crm-template-send` (`crm-template-send.js`, CRM-gated, allowlist des 14 templates, dry-run possible).
- **Panneau « Relances & notifs WhatsApp »** : aperçu lecture seule (statut auto ON/OFF + notifs en attente) via `GET /api/crm-status-notify?preview=1` (session CRM, aucun envoi).

## 3. Récap des templates

| Nom (Meta) | Catégorie | Déclencheur | Boutons |
|---|---|---|---|
| `relance_dossier_a_finaliser` | MARKETING | lead silencieux > 24 h, J+1 | Reprendre · Rappel |
| `relance_preuve_sociale` | MARKETING | relance J+2 | Reprendre · Rappel |
| `relance_derniere_chance` | MARKETING | relance J+4 | Reprendre · Plus tard |
| `dossier_recu` | UTILITY | dossier enregistré | — |
| `mandat_signe` | UTILITY | mandat signé | — |
| `reclamation_envoyee` | UTILITY | réclamation envoyée compagnie | — |
| `relance_compagnie` | UTILITY | mise en demeure envoyée | — |
| `reponse_compagnie_accord` | UTILITY | compagnie accepte | Rappel |
| `escalade_procedure` | UTILITY | médiateur / contentieux | — |
| `paiement_en_cours` | UTILITY | indemnité obtenue | — |
| `piece_manquante` | UTILITY | pièce/carte/e-billet manquant | Envoyer · Rappel |
| `photo_a_reprendre` | UTILITY | photo illisible | Renvoyer |
| `dossier_lien_depot` | UTILITY | lien de dépôt carte+passeport (CRM) | — |
| `rappel_programme` | UTILITY | rappel tél planifié | — |
| `parrainage` | MARKETING | après paiement | Partager (URL) |

---

## B. PROSPECTION AGENCES — Sofia · catégorie **MARKETING**

> Premier contact hors-fenêtre avec une agence de voyage partenaire potentielle.
> Bouton Quick Reply = tap entrant → ouvre la fenêtre 24 h → Sofia (bureau) ou humain reprend.
> Kill-switch : `SOFIA_OUTREACH=1` sur Netlify (laisser à 0 tant que templates non approuvés).
> Code : `netlify/functions/sofia-prospect.js` → `sendOutreach()` · tracking Blobs `sofia/outreach/<phone>`.
> Commission d'apport à mentionner dans le contrat agence (après immatriculation SASU + SIREN).

### B1 — `sofia_agence_partenariat_fr` (version française — SN/CI/ML/CM/CG/CD/MQ/GP)
- **Catégorie** : MARKETING · **Langue** : fr
- **Header** (texte) : `Partenariat Robin des Airs ✈️`
- **Corps** :
  ```
  Bonjour {{1}} 👋

Je suis Sofia de *Robin des Airs*.

Vous aidez vos clients à voyager — nous, on récupère leur argent quand le vol les laisse tomber : jusqu'à *600 €* par passager (CE 261/2004), *sans frais si on ne gagne pas*.

On propose un partenariat avec *commission d'apport* : vous recommandez, on gère tout.

Intéressé(e) ? Tapez *OUI* 👇
  ```
- **Footer** : `On prend aux compagnies, on rend aux familles`
- **Bouton** : Quick Reply · label `Intéressé(e) !` · payload `SOFIA_PARTNER_OUI`
- **Variable `{{1}}`** : nom de l'agence · exemple `Agence Diallo Voyages`

### B2 — `sofia_agence_partenariat_en` (version anglaise — GM/KE/ZA)
- **Catégorie** : MARKETING · **Langue** : en
- **Header** (texte) : `Partnership — Robin des Airs ✈️`
- **Corps** :
  ```
  Hi {{1}} 👋

I'm Sofia from *Robin des Airs*.

You help clients travel — we recover their money when flights fail them: up to *€600* per passenger (EU Regulation 261/2004), *no win, no fee*.

We offer a referral partnership with commission: you recommend, we handle everything.

Interested? Reply *YES* 👇
  ```
- **Footer** : `Robin des Airs — fight for your rights`
- **Bouton** : Quick Reply · label `Interested!` · payload `SOFIA_PARTNER_YES`
- **Variable `{{1}}`** : agency name · exemple `Banjul Travel Agency`

---

## Tableau récapitulatif (mise à jour)

| Nom template | Catégorie | Usage | Boutons |
|---|---|---|---|
| `relance_dossier_a_finaliser` | MARKETING | relance principale J+1/J+2 | Reprendre · Rappel · Plus tard |
| `relance_derniere_chance` | MARKETING | relance J+4 | Reprendre · Plus tard |
| `sofia_agence_partenariat_fr` | MARKETING | prospection agence (FR) | Intéressé(e) ! |
| `sofia_agence_partenariat_en` | MARKETING | prospection agence (EN) | Interested! |
| `dossier_recu` | UTILITY | dossier enregistré | — |
| `mandat_signe` | UTILITY | mandat signé | — |
| `reclamation_envoyee` | UTILITY | réclamation envoyée compagnie | — |
| `relance_compagnie` | UTILITY | mise en demeure envoyée | — |
| `reponse_compagnie_accord` | UTILITY | compagnie accepte | Rappel |
| `escalade_procedure` | UTILITY | médiateur / contentieux | — |
| `paiement_en_cours` | UTILITY | indemnité obtenue | — |
| `piece_manquante` | UTILITY | pièce/carte/e-billet manquant | Envoyer · Rappel |
| `photo_a_reprendre` | UTILITY | photo illisible | Renvoyer |
| `dossier_lien_depot` | UTILITY | lien de dépôt carte+passeport (CRM) | — |
| `rappel_programme` | UTILITY | rappel tél planifié | — |
| `parrainage` | MARKETING | après paiement | Partager (URL) |

*Robin des Airs — templates WhatsApp WATI/Meta · voir aussi `WHATSAPP-AUTO.md`, `railway/lib/relance-variants.js`.*

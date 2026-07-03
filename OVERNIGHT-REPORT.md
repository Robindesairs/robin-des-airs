# Rapport de nuit — Robin des Airs

**Date :** 2026-07-04
**Branche principale :** `overnight/full-pass-2026-07-04` (HEAD `587a833`)
**Règle d'or respectée :** RIEN n'a été poussé ni déployé. Tous les commits sont **locaux**. Railway (bot) et Netlify (site) restent à redéployer **après** votre validation.

> Lecture recommandée : commencez par la section **4 (CE QUI RESTE / arbitrages)** — c'est là que se trouvent les décisions qui vous appartiennent. Le reste est de l'exécution déjà faite, à relire.

---

## 1) Corrigé / appliqué (cohérence, régénération)

Passe de cohérence + régénération complète sur `overnight/full-pass-2026-07-04` (**commit local uniquement**).

**Re-synchronisation `autorisation.html`**
- Régénérée depuis `mandat.html` via `scripts/sync-autorisation.py`. Seule différence légitime réécrite : `og:url` → `https://robindesairs.eu/autorisation.html` (ligne 14 vérifiée). Les deux pages sont identiques (« Mandat de Représentation »).

**Tous les générateurs relancés** (node_modules déjà présent, aucun `npm install`, aucun générateur en échec) :
- `node scripts/build-mandat-articles.js` → `netlify/functions/lib/mandat-articles-fr.json` (25 % et 40 % présents 3× chacun).
- `python3 scripts/build-mandat-en.py` → `mandat-en.html`.
- `node scripts/build-en-home.js` → `index-en.html` (47 `data-i18n-html` appliqués).
- `python3 scripts/generate-mandat-pdf-fpdf.py` → `documents/mandat-fr.html`.
- `npm run build:blog` → tous les `blog/*.html` régénérés depuis `src/content/blog`.

**Propagation des correctifs source.** `mandat.html` et `index.html` avaient déjà été corrigés (paiement client « 48 h » → « 5 jours ouvrés ») par un agent concurrent. La régénération a propagé ces corrections dans tous les artefacts générés. `autorisation.html` porte désormais « 5 jours ouvrés » (6×).

**Scan des chaînes interdites** sur tous les fichiers générés (`autorisation.html`, `mandat-en.html`, `index-en.html`, `documents/mandat-fr.html`, `mandat-articles-fr.json`, `blog/*.html`) :
- AUCUN « 45 %/55 % » de commission, AUCUN paiement client « 48 h », AUCUN « SAS » (non-SASU).
- Le « 48 h » résiduel dans `mandat.html` ligne 894 est un **faux positif** : il désigne la mise en demeure / le courrier envoyé sous 48 h (démarrage immédiat), pas le versement client. Correctement conservé.

**Hygiène git.** Un `.DS_Store` committé par accident a été retiré du suivi et ajouté à `.gitignore` (commit amendé). Fichiers protégés NON touchés : matrice des taux de recouvrement de `transparence.html`, montants de commission agence (45 € / 30 000 FCFA), CSS/gradients, stats sourcées.

---

## 2) Contenu SEO créé (18 articles)

- 18 nouveaux articles créés + sitemaps mis à jour, réunis dans le **commit local `587a833`**.
- **À faire après validation :**
  - Pousser `587a833` vers `origin/main`.
  - Déployer sur Netlify pour publier les 18 articles + sitemaps mis à jour. ⚠️ Rappel mémoire : le quota Netlify a été signalé comme dépassé (à surveiller, reset au 1er ou upgrade Pro).
  - Optionnel : `npm run notify:indexnow:all` après déploiement pour pinger les moteurs.

> Réserve : 4 de ces articles concernent le Maroc / RAM et posent un problème de périmètre (Maroc exclu). Voir section 4, arbitrage n° 3 — à trancher **avant** publication.

---

## 3) Builds isolés (branches worktree) — état + fichiers + à valider

Trois chantiers menés en worktree isolé, chacun sur sa propre branche, **commits locaux uniquement, rien de poussé**.

### 3.1 — Feature « Pièces » (back-office `bureau.html`)
- **Branche :** `worktree-wf_5413d4fc-c15-44` — commit `ba20b76`
- **Fichier :** `/Users/climbie/Downloads/files/.claude/worktrees/wf_5413d4fc-c15-44/bureau.html`
- **Fait :**
  1. **Contrat de cession en tête du panneau Pièces** : `cessionHeader(ref)` injecte, avant les pièces, une entrée ⚖️ ouvrant `/api/mandat-pdf?r=REF` + bouton « ⬇ Télécharger ».
  2. **Enregistrement enrichi** : menu TYPE réordonné/renommé (Pièce d'identité / Carte d'embarquement / E-billet / Reçu-ticket / Autre — valeurs internes inchangées) ; nouveau menu PASSAGER (`#piecePax`) rempli via `/api/dossier-get?r=REF` + option « Général » ; `uploadPiece()` envoie `passenger` au POST `/api/crm-piece-upload` ; chaque pièce s'affiche « TYPE · Passager ».
  3. **Libellés visibles « mandat » → « cession »** (« CESSION SIGNÉE », « Cession FR », « Cession non signée », bannière RGPD). Endpoints/URLs et clés de données inchangés.
- **Vérifié :** les 3 blocs `<script>` parsent sans erreur ; `esc()` échappe aussi les guillemets.
- **À valider / limites :**
  - Le lien « Contrat de cession signé » s'affiche dès qu'une réf est chargée ; si le PDF n'est pas encore archivé, `/api/mandat-pdf` renvoie un 404 JSON. Optionnel : sonder la présence du PDF (HEAD/GET) pour masquer le lien tant que non signé.
  - `dossier-get` lit le store `mandats` (m/<ref>) qui ne porte pas de flag de signature ; la vraie preuve est dans `robin-signatures` (signed/<ref>). Exposer ce flag si on veut n'afficher la cession que pour les dossiers réellement signés.

### 3.2 — Re-traduction `mandat-en.html`
- **Branche :** `worktree-wf_5413d4fc-c15-45` — commit `61f66a2`
- **Cause racine :** `scripts/build-mandat-en.py` visait un ancien modèle FR (« cession à titre de recouvrement / opposabilité différée / médiation préalable ») ; ses paires de remplacement ne matchaient plus le `mandat.html` courant (« cession de créance PURE ET SIMPLE / notification immédiate / tribunal de commerce / pas de médiation MTV »), laissant de larges pans en français.
- **Fait :** réécriture de `NEW_PAIRS3/4/5` dans le générateur + régénération. Tous les 18 articles, hero, parties, formulaire, déclaration, signature, barre de confiance, écran de succès et chaînes JS visibles (relais multi-signataires, WhatsApp co-passagers, sélecteur parent/tuteur, badge mineur, libellés passagers) sont en anglais.
- **Valeurs source appliquées :** cession pure et simple ; amiable 75 % client / 25 % marge ; contentieux 60 % client / 40 % marge (exemple 360 €/240 €, lignes 137,50/220/330) ; paiement client « within 5 business days » (jamais 48 h — le seul « 48 h » restant = timing mise en demeure, légitime) ; SASU « currently being registered » ; pas de SIREN inventé ; éligibilité conditionnelle ; pas de nom d'avocat.
- **Robustesse générateur :** `NEW_PAIRS3/4/5` s'exécutent AVANT les paires courtes ; libellés party-box scopés à `data-label="..."` ; espaces insécables (U+00A0/U+202F) alignés sur les octets source.
- **Vérifié :** texte rendu + littéraux DOM JS scannent PROPRE de français ; équilibre des balises OK ; 18 spans `cnum` en FR et EN ; `lang="en"` ; endpoints inchangés ; sortie déterministe.
- **⚠️ À valider (important) — voir section 4 :** la SOURCE `mandat.html` (FR) est elle-même incohérente : hero/langage clair disent 60 % tribunal mais plusieurs passages du corps juridique + le bloc coordonnées bancaires/versement disent encore « 55 %/45 % » et « sous 48 h » pour le versement CLIENT (lignes ~375, 566-580, 606-609, 658, 705, 868, 896). L'EN a été rendu CORRECT (60/40, 5 jours ouvrés) ; **le FR reste à réconcilier**.

### 3.3 — Scaffold pipeline aval (post-signature → paiement)
- **Branche :** `worktree-wf_5413d4fc-c15-46` — commit `d2e55e4`
- **État :** entièrement INERTE (dry-run, aucun envoi, aucun changement de statut, aucune écriture Airtable/Blobs, aucune fonction prod modifiée). 5 fonctions Netlify + 1 lib pure partagée + 20 tests vitest (suite complète 41/41 verte) + README.
- **Architecture :** `lib/aval-pipeline.js` = logique pure/déterministe (normalisation dossier, commission 25 % amiable / 40 % contentieux, répartition d'encaissement, cadence relances J+15/J+30, seuil escalade J+62), réutilise les helpers purs de `lib/legal-pipeline.js` sans le modifier. Cinq handlers préfixés `aval-` (`aval-generate-claim`, `aval-send-claim`, `aval-relances`, `aval-escalade`, `aval-suivi-paiement`) — pas de collision avec `generate-claim.js` / `legal-daily.js`. Tous exigent le secret interne, acceptent des dossiers inline pour les tests.
- **Règles respectées :** 25/75 amiable et 40/60 contentieux (jamais 25 % fixe) ; versement client 5 jours ouvrés ; terminologie « cession » ; éligibilité conditionnelle ; aucun nom d'avocat ; aucune garantie de résultat. `aval-send-claim` est un STUB strict qui n'envoie JAMAIS rien (`sent:false` en dur) même avec les deux garde-fous levés.
- **À valider / suites :**
  - Brancher la source Airtable réelle sur `aval-relances` et `aval-escalade` (actuellement inline seulement).
  - Décider fusion vs doublon avec `lib/legal-pipeline.js` (le prod couvre déjà une partie via `legal-daily.js`) **avant toute mise en prod**.
  - Implémenter le canal d'envoi réel (LRAR/email) dans une fonction prod dédiée.
  - Ajouter la prescription par juridiction (BE = 1 an) comme garde-fou dur avant l'escalade contentieuse.
  - Persister les relances (idempotence) via Blobs, modèle `robin-legal`.

---

## 4) CE QUI RESTE / arbitrages (vérification read-only)

Re-scan read-only de `overnight/full-pass-2026-07-04`. **Bonne nouvelle : la surface contractuelle client est propre et cohérente.** `mandat.html`, `mandat-en.html`, `autorisation.html`, `mandat-exemple-famille.html`, `cgv.html`, `transparence.html`, `delais-dates-ce261-fr.html` et le FAQ JSON-LD de `index.html`/`index-en.html` affichent tous correctement **25 % amiable / 40 % contentieux**, split **75/60**, versement client « 5 jours ouvrés », « SASU en cours d'immatriculation au RCS de Paris », et le SIREN est un placeholder « à renseigner au lancement » (comportement correct, pas de numéro inventé). Le `areaServed` JSON-LD exclut le Maroc. Les 48h/45€/30 000 FCFA agence sont l'exception autorisée. Tous les hits grep « 45 %/55 % » sont des **faux positifs** (gradients CSS, stats sourcées, cibles CTR, montants FCFA agence, texte jurisprudence).

### INCOHÉRENCES RESTANTES (à trancher / corriger)

**Arbitrage 1 — Versement client « 48 h » au lieu de « 5 jours ouvrés » (violation de règle) 🔴**
La réponse FAQ `faq_6_a` promet encore au CLIENT sa part « sous 48 h » / « within 48 h » :
- `i18n.js:440` (FR : « on vous vire votre part sous 48 h »)
- `i18n.js:857` (EN : « transfer your share within 48 h »)
- `index-en.html:915` (rendu EN : « transfer your share within 48 h »)
Contredit les pages mandat (5 jours ouvrés) ET le FAQ JSON-LD FR de `index.html` (déjà « 5 jours ouvrés »). Deux réponses contradictoires cohabitent sur la même page.
→ **Action :** remplacer « sous 48 h » / « within 48 h » par « sous 5 jours ouvrés » / « within 5 business days » dans `i18n.js:440` et `857`, puis régénérer `index-en.html` via `build-en-home.js` (commit local). Vérifier ensuite que FR i18n et FR JSON-LD ne divergent plus.

**Arbitrage 2 — « 25 % même au tribunal / commission fixe » (wording interdit) 🟠**
- `PLAYBOOK-OPERATIONNEL.md:115` (« Robin prend 25 % — c'est tout. Même en cas de procès. »)
- `PLAYBOOK-OPERATIONNEL.md:185` (« 25 % de commission, jamais plus, même si ça va au tribunal »)
- `docs/PUBS-CREATIFS-ROBIN-SPECS.md:178` (« 25 % de commission fixe »)
→ **Action :** retirer « 25 % fixe / même au tribunal / jamais plus » et poser 25 % amiable / 40 % contentieux, 75/60.

**Arbitrage 3 — Maroc / RAM promu comme offre de Robin (Maroc EXCLU) 🔴 décision fondateur**
4 articles blog marketent activement RAM/Casablanca, dont un « Robin des Airs traite-t-il les dossiers Casa-… Oui » + « Commission de 25 % … après encaissement » :
- `blog/royal-air-maroc-vol-retarde-indemnite.html`
- `blog/vol-retarde-casablanca-paris-indemnite.html`
- `blog/ram-vols-annules-afrique-centrale-via-casa-indemnite.html`
- `blog/vol-ramadan-aid-tabaski-retard-droits.html` (angle Tabaski/RAM)
Ce sont des pages SEO ; certaines concernent RAM-via-Casa vers l'Afrique centrale (cas Wegener / codeshare discutable), mais elles positionnent Maroc/RAM comme route activement traitée, ce qui contredit « Maroc exclu de l'offre ».
→ **Décision à prendre :** dé-publier / rediriger, requalifier au conditionnel (info seulement), OU confirmer qu'elles relèvent d'un cas Wegener hors Maroc. **À trancher avant de publier le lot SEO** (section 2).

**Arbitrage 4 — « SAS » (au lieu de SASU) + gabarit interne 🟡 basse priorité**
- `PLAYBOOK-OPERATIONNEL.md:283,453,456,462` (« Robin des Airs — SAS », « SAS Robin des Airs (SIREN [SIREN]) »)
Gabarit ops/notification interne avec un token placeholder `[SIREN]` (pas de numéro fabriqué), mais « SAS » au lieu de « SASU ». Doc interne, pas client.
→ **Action :** aligner sur « SASU » (lignes 283/453/456/462) et confirmer que `[SIREN]` reste un placeholder, jamais un numéro inventé.

> **Aucune correction appliquée sur ces 4 arbitrages** — hors périmètre (rapport uniquement, aucun commit/déploiement).

---

## 5) Rappels

- **Rien n'a été déployé ni poussé.** Tous les commits sont **locaux**.
- **Branches à relire** avant merge/push :
  - `overnight/full-pass-2026-07-04` (`587a833`) — passe cohérence + régénération + 18 articles SEO. Relire notamment `documents/mandat-fr.html` (gros delta) et `mandat-en.html`.
  - `worktree-wf_5413d4fc-c15-44` (`ba20b76`) — feature Pièces `bureau.html`.
  - `worktree-wf_5413d4fc-c15-45` (`61f66a2`) — re-traduction `mandat-en.html`.
  - `worktree-wf_5413d4fc-c15-46` (`d2e55e4`) — scaffold aval (inerte).
- **Après validation :** redéployer **Railway (bot)** + **Netlify (site)**. Attention au quota Netlify signalé en mémoire.
- **Priorité n° 1 avant tout déploiement :** corriger `faq_6_a` (arbitrage 1) et réconcilier la source FR `mandat.html` (55 %/45 % et 48 h résiduels) pour que FR et EN concordent enfin.

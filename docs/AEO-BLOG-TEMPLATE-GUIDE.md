# Guide AEO pour les articles de blog Robin des Airs

Méthode complète d'optimisation des articles de blog pour les moteurs de réponse (Answer Engine Optimization) — ChatGPT, Perplexity, Claude, Gemini, Google AI Overviews, Bing Copilot.

Version : 1.0 — Validée sur le pilote (air-cote-divoire, arret-sturgeon, que-faire-aeroport).

---

## TL;DR — Checklist rapide à appliquer sur chaque nouvel article

Quand tu crées (ou refactores) un article de blog, vérifie que chaque case ci-dessous est cochée. Un article qui ne respecte pas ces 16 points n'est pas AEO-ready.

### Métadonnées
- [ ] **Title HTML** sans balise `<a>` ni HTML imbriqué (juste du texte plat)
- [ ] **Meta description** entre 140 et 160 caractères, qui répond à la question principale
- [ ] **Canonical URL** correcte et unique (vérifier qu'aucun doublon n'existe)
- [ ] **Date publication** + **date modification** distinctes et plausibles

### Schemas JSON-LD (4 obligatoires)
- [ ] `BlogPosting` avec author, publisher, datePublished, dateModified
- [ ] `BreadcrumbList` complet (Accueil → Blog → Article)
- [ ] `FAQPage` avec **minimum 6 questions/réponses**, alignées avec la FAQ visible
- [ ] `HowTo` avec **minimum 5 étapes** + `tool` + `totalTime` + `estimatedCost`

### Structure visible
- [ ] **H1** déclaratif chargé en entités (pas en question — le H1 garde sa fonction SEO classique)
- [ ] **Byline avec mention d'autorité** visible juste sous le H1
- [ ] **Quick-answer** : 1 phrase ultra-courte + liste de 3 conditions/points + paragraphe de synthèse
- [ ] **Bloc Test rapide** Oui/Non avec 3 questions + verdict + CTA WhatsApp profond
- [ ] **H2 en format conversationnel "mon/je"** (sauf étapes numérotées d'un HowTo, voulu)
- [ ] **Première phrase sous chaque H2 = réponse directe extractible** (auto-portante hors contexte)
- [ ] **Section "En résumé"** en fin d'article avec 3 à 4 points clés
- [ ] **FAQ visible** alignée avec le Schema FAQPage
- [ ] **CTA en question** dans le bloc final
- [ ] **PAS de duplication "En bref" ↔ FAQ** (supprimer le bloc "En bref" s'il duplique la FAQ du bas)

### Conversion WhatsApp prérempli (OBLIGATOIRE, x2 minimum)
- [ ] **Preset WhatsApp dans le verdict du test rapide** (point d'engagement le plus chaud)
- [ ] **Preset WhatsApp dans le CTA box final** (bouton "WhatsApp direct")
- [ ] **Texte prérempli unique et spécifique** à l'article (permet le tracking par phrase d'entrée)
- [ ] **URL correctement encodée** (espace = %20, é = %C3%A9, ' = %27, etc.)
- [ ] **Numéro de référence cohérent** : `33756863630` (sans +, sans espaces)

### Précision juridique
- [ ] **Pas de formulations absolues** : nuancer ("ne l'est pas avec X, mais l'est avec Y")
- [ ] **Sourcing des affirmations juridiques** : article + texte + jurisprudence + lien Eur-Lex/Legifrance/Curia
- [ ] **Formulations conditionnelles "Si... alors..."** dans les sections juridiques
- [ ] **Affirmations techniques non-juridiques** présentées comme hypothèses, pas faits établis

### Prudence juridique anti-promesse (OBLIGATOIRE)
- [ ] **H1 et titre** : "jusqu'à X€" jamais "X€ d'indemnité automatique" — toujours conditionnel
- [ ] **Quick-answer** : précise les conditions cumulatives (jamais une promesse sèche)
- [ ] **Verdict du test rapide** : "votre dossier **peut être** éligible" jamais "vous êtes éligible"
- [ ] **Tableau des montants** : note explicative sous le tableau ("plafond théorique sous conditions cumulatives")
- [ ] **Section circonstances extraordinaires** : se termine par "la qualification finale appartient au juge"
- [ ] **Encart "Méthodologie & sources"** présent en haut de page (entre byline et bloc actu/quick-answer)
- [ ] **Disclaimer juridique** en bas + rappel "information générale" répété dans la méthodologie

---

## Les 5 principes AEO fondamentaux

### 1. Le test du copier-coller hors contexte

Une réponse AEO doit pouvoir être **copiée-collée hors de l'article et rester vraie et complète**. C'est le test ultime. Si un LLM cite la phrase isolément, elle doit conserver toute son information.

**Mauvais** : "Le retard se calcule à l'arrivée, pas au décollage."  
**Bon** : "Le retard se calcule à l'ouverture des portes de l'avion à destination finale, comparée à l'heure d'arrivée prévue au billet (jurisprudence Sturgeon, CJUE 2009)."

### 2. La pondération début / fin par les LLM

Les LLM scannent prioritairement :
- Les 50 premiers mots de l'article (quick-answer)
- Les 50 derniers mots significatifs (section "En résumé")

Investir dans ces deux zones = ROI AEO maximum.

### 3. La spécificité des entités

Les LLM matchent sur des graphes d'entités, pas seulement sur des mots-clés. Pour chaque article, identifier 5 à 10 entités-clés et les répéter naturellement :
- Nom de compagnie (Air Côte d'Ivoire, Air France...)
- Codes IATA (HF, AF, SN...)
- Aéroports (CDG, ABJ, LFW...)
- Textes juridiques (CE 261/2004, art. L110-4 Code de commerce...)
- Jurisprudences (Sturgeon, Wallentin-Hermann, Nelson c. Lufthansa...)
- Organismes (DGAC, MTV, CJUE, Eur-Lex...)

### 4. Le risque de duplication interne

Un bloc "En bref" qui répète mot pour mot les questions de la FAQ en bas → signal négatif pour les LLM (dilution sémantique). Toujours vérifier qu'il n'y a pas de redite.

### 5. La crédibilité juridique > l'extractibilité brute

Une formulation absolue est plus extractible mais juridiquement fragile. Pour un site qui veut être cité comme **source autoritaire** sur le droit aérien, la précision juridique passe avant la concision pure. Toujours sourcer.

---

## Architecture cible d'un article AEO

```
<head>
  ├── title (texte plat, max 60 caractères)
  ├── meta description (140-160 caractères, répond à LA question)
  ├── canonical + hreflang
  ├── Schema BlogPosting
  ├── Schema BreadcrumbList
  ├── Schema HowTo (procédure)
  └── Schema FAQPage (6+ Q/R)

<body>
  ├── nav
  ├── H1 déclaratif chargé en entités
  ├── Byline + mention autorité (basé sur X texte + Y jurisprudence)
  │
  ├── [BLOC] Quick-answer
  │   ├── Phrase courte affirmative
  │   ├── Liste 3 conditions / 3 points / 3 actions
  │   └── Paragraphe synthèse (cas particuliers, sourcing)
  │
  ├── [BLOC] Test rapide Oui/Non
  │   ├── 3 conditions Oui/Non
  │   └── Verdict + CTA WhatsApp profond
  │
  ├── Intro courte
  │
  ├── H2 #1 — "Quand le X s'applique-t-il à mon vol ?"
  │   └── Réponse directe + Si/Alors + détails
  │
  ├── H2 #2 — "Quel montant pour mon vol X retardé ?"
  │   └── Réponse directe + tableau + détails
  │
  ├── H2 #3 — "Pourquoi mon vol X est-il en retard ?"
  ├── H2 #4 — "Comment X est-il calculé avec [cas spécial] ?"
  ├── H2 #5 — Cas concrets : tableau chiffré (4 scénarios)
  ├── H2 #6 — "Combien de temps pour réclamer X ?"
  ├── H2 #7 — "Comment Robin des Airs gère mon dossier X ?"
  │
  ├── H2 "En résumé : que retenir sur X ?"
  │   └── 3-4 bullets de synthèse
  │
  ├── FAQ visible (alignée avec Schema FAQPage)
  │
  ├── CTA box en question
  │   "Mon vol X est-il éligible ?"
  │   Vérifier · WhatsApp direct
  │
  ├── Articles liés (3-5 liens internes)
  ├── Signature équipe + disambiguation
  └── Disclaimer juridique
```

---

## Wording prudence anti-promesse (règle d'or)

Sur un sujet juridique sensible (indemnisation, droit aérien, recours), une **formulation absolue** peut exposer Robin des Airs à un risque de contestation (publicité mensongère, promesse non tenue, conseil juridique non autorisé). Les LLM extraient ce qu'on écrit — donc une mauvaise formulation est extraite et propagée à grande échelle.

**Règle universelle** : toujours préférer "peut être éligible" / "jusqu'à... sous conditions" / "selon les conditions du règlement" à toute formulation affirmative directe.

### Table de conversion à appliquer systématiquement

| ❌ À BANNIR (promesse) | ✅ À PRÉFÉRER (prudence) |
|---|---|
| "Vous êtes éligible à 600€" | "Votre dossier peut être éligible à une indemnité **allant jusqu'à** 600€" |
| "Vous obtiendrez 600€ d'indemnité" | "Vous pouvez prétendre à une indemnité **jusqu'à** 600€ selon les conditions du CE 261" |
| "Indemnité automatique de 600€" | "Indemnité forfaitaire de 600€ **sous réserve d'éligibilité**" |
| "Votre vol est probablement éligible" | "Votre dossier **peut être** éligible — vérification définitive après examen du PNR" |
| "Le retard donne droit à 600€" | "Un retard de 3h+ ouvre droit à **jusqu'à** 600€, sous conditions cumulatives" |
| "Vous avez forcément droit à…" | "Vous **pouvez** avoir droit à…" |
| "RAM doit vous indemniser" | "RAM **est en principe tenue** d'indemniser, sous réserve de circonstances extraordinaires" |
| "Non éligible" (catégorique) | "Non couvert au titre du CE 261 — d'autres recours peuvent exister (Convention de Montréal, droit local)" |

### Phrases-types à insérer

- **Verdict test rapide** : « → Si vous avez répondu 3 fois Oui, votre dossier **peut être** éligible à une indemnité **allant jusqu'à** X€. **Vérification définitive après examen du PNR.** »

- **Sous le tableau des montants** : « *À noter : ces montants correspondent au plafond théorique du règlement CE 261. L'éligibilité réelle dépend du PNR, de la date de notification et de l'absence de circonstances extraordinaires opposables — à apprécier au cas par cas.* »

- **Section circonstances extraordinaires** : « La qualification finale appartient toutefois au juge saisi du dossier, qui apprécie souverainement les faits et la jurisprudence applicable. »

- **Disclaimer méthodologie** : « Information générale, ne constitue pas un avis juridique personnalisé. L'éligibilité de chaque dossier dépend du PNR, de la date de notification et des circonstances exactes — appréciation au cas par cas. »

---

## Stratégie WhatsApp prérempli (conversion + tracking)

Chaque article DOIT contenir au minimum **deux liens WhatsApp préremplis avec un texte spécifique à l'article**. C'est à la fois un levier de conversion ET un levier de tracking : chaque message WhatsApp commençant par cette phrase précise est attribuable à l'article — sans cookie, sans analytics, sans tag complexe.

### Format de l'URL WhatsApp

```
https://wa.me/33756863630?text=[TEXTE_PREREMPLI_URL_ENCODE]
```

- **Numéro** : `33756863630` (sans `+`, sans espaces — format wa.me)
- **Paramètre** : `?text=` suivi du message **URL-encodé**

### Tableau d'encodage rapide

| Caractère | Encodage URL |
|---|---|
| espace | `%20` |
| `,` | `%2C` |
| `'` | `%27` |
| `é` | `%C3%A9` |
| `è` | `%C3%A8` |
| `à` | `%C3%A0` |
| `ô` | `%C3%B4` |
| `ç` | `%C3%A7` |
| `?` | `%3F` |
| `&` | `%26` |

### Modèle universel du texte prérempli

```
Bonjour Robin, [contexte spécifique à l'article], j'aimerais vérifier mon indemnité.
```

Le `[contexte spécifique]` doit être **distinctif** (pas générique) pour permettre le tracking. Exemples :

| Article | Contexte spécifique | Phrase complète |
|---|---|---|
| RAM annulations Casa-Afrique centrale | « mon vol RAM via Casablanca a été annulé » | Bonjour Robin, mon vol RAM via Casablanca a été annulé, j'aimerais vérifier mon indemnité. |
| Air Côte d'Ivoire vol retardé | « j'ai eu un retard sur un vol Air Côte d'Ivoire » | Bonjour Robin, j'ai eu un retard sur un vol Air Côte d'Ivoire, j'aimerais vérifier mon indemnité. |
| Arrêt Sturgeon 3h retard | « mon vol a eu 3 heures de retard à l'arrivée » | Bonjour Robin, mon vol a eu 3 heures de retard à l'arrivée, j'aimerais vérifier mon indemnité. |
| Que faire à l'aéroport | « je suis bloqué à l'aéroport avec un vol retardé » | Bonjour Robin, je suis bloqué à l'aéroport avec un vol retardé, j'aimerais vérifier mes droits. |

### Emplacements obligatoires (× 2 minimum)

1. **Dans le verdict du test rapide** (lien texte « Vérifier en 2 minutes sur WhatsApp ») — c'est le point d'engagement le plus chaud, juste après que le visiteur ait répondu Oui à 3 questions
2. **Dans le CTA box final** (bouton « WhatsApp direct ») — c'est le filet de sécurité pour les visiteurs qui n'ont pas répondu au test

### Emplacements optionnels (boost conversion)

3. **Dans le bloc Méthodologie & sources** sous la ligne « Analyse » — pour les sujets juridiquement sensibles, où le visiteur cherche une expertise immédiate
4. **Dans le H2 « Comment Robin des Airs prend-il en charge mon dossier ? »** — un lien WhatsApp en fin de section

### Comment générer rapidement un preset WhatsApp

**En ligne** : https://wa.link/preset/ ou https://api.whatsapp.com/send?phone=33756863630&text=Votre%20texte

**En console** (à exécuter dans le navigateur ou Node.js) :

```javascript
const phone = '33756863630';
const text = "Bonjour Robin, mon vol RAM via Casablanca a été annulé, j'aimerais vérifier mon indemnité.";
const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
console.log(url);
```

`encodeURIComponent()` gère tous les caractères spéciaux (accents, apostrophes, espaces) en une ligne.

### Pourquoi cette stratégie est puissante

1. **Tracking 100% fiable sans cookies** : chaque message WhatsApp commençant par la phrase spécifique est attribuable à l'article. Pas besoin d'UTM, pas de cookies, pas de RGPD.

2. **Friction réduite à 1 clic** : le visiteur n'a pas à taper son contexte, c'est déjà rédigé. Le taux de complétion est × 3-5 vs un formulaire.

3. **Qualifie le contact en amont** : la phrase prérenseignée filtre les visiteurs sérieux des curieux, et te donne immédiatement le contexte du dossier sans avoir à poser la question.

4. **Brand signal pour les LLM** : si beaucoup de gens cherchent « Robin des Airs WhatsApp », c'est un signal de **branded query** que les LLM utilisent pour évaluer ton autorité dans le domaine.

5. **Mesure du ROI par article** : tu peux dire **exactement** combien de dossiers chaque article génère, ce qui te permet de prioriser tes prochains contenus.

---

## Bloc "Méthodologie & sources" (OBLIGATOIRE sur les articles d'actualité / sujet sensible)

Sur tout article d'actualité (suspension de lignes, événement aérien, jurisprudence récente, sinistre, grève) ou sujet juridiquement sensible (refus d'embarquement, surbooking, calcul de retard contesté), insérer un encart **Méthodologie & sources** entre la byline et le bloc actu / quick-answer. Cet encart sépare visuellement et sémantiquement les 4 niveaux d'information — ce que les LLM utilisent pour évaluer la crédibilité E-E-A-T.

### Structure HTML du bloc

```html
<aside class="method-box" role="complementary" aria-label="Méthodologie et sources">
  <span class="mb-label">Méthodologie &amp; sources</span>
  <dl>
    <dt>Faits</dt><dd>[Ce que la compagnie/autorité a officiellement annoncé, avec date].</dd>
    <dt>Sources presse</dt><dd>[Liens vers les médias qui rapportent les faits, idéalement 3+ sources indépendantes].</dd>
    <dt>Cadre juridique</dt><dd>[Textes applicables : règlement, articles, jurisprudence, avec liens Eur-Lex/Legifrance/Curia].</dd>
    <dt>Analyse</dt><dd>Interprétation Robin des Airs à la date de publication. <strong>Information générale, ne constitue pas un avis juridique personnalisé.</strong> L'éligibilité de chaque dossier dépend du [variable-clé du sujet] — appréciation au cas par cas.</dd>
  </dl>
</aside>
```

### CSS associé (à inclure dans le `<style>`)

```css
.method-box{margin:0 0 1.25rem;padding:.85rem 1.05rem;border-radius:.5rem;background:#F0F7FC;border-left:3px solid #0B6BA3;font-size:.8125rem;line-height:1.55;color:#1f2937}
.method-box .mb-label{display:inline-block;color:#0B6BA3;font-size:.6875rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem}
.method-box dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:.3rem .65rem}
.method-box dt{font-weight:700;color:#0B1F3A;white-space:nowrap}
.method-box dd{margin:0;color:#374151}
.method-box dd a{color:#0B6BA3;font-weight:600}
.method-box dd a:hover{color:#F59E0B;text-decoration:underline}
```

### Pourquoi cet encart est critique

1. **E-E-A-T (Google)** : Google a renforcé en 2024-2025 ses signaux d'évaluation de la crédibilité. Séparer faits / sources / cadre juridique / analyse est exactement ce que Google attend des sites "Your Money Your Life" (et le droit aérien en fait partie).

2. **Citations LLM** : ChatGPT, Perplexity et Claude citent prioritairement les sources qui distinguent clairement ce qui est rapporté de ce qui est analysé. Un article qui mélange fait et opinion sans le baliser est moins cité.

3. **Protection juridique** : en cas de contestation (par une compagnie aérienne, un concurrent, l'ARPP), la séparation explicite "analyse à la date de publication, appréciation au cas par cas" protège contre les accusations de publicité trompeuse ou de conseil juridique non autorisé.

4. **Position zéro** : Google extrait souvent ce bloc comme "carte d'identité" de l'article dans les résultats de recherche.

---

## Modèles de wording à réutiliser

### Quick-answer (modèle universel)

```
<aside class="quick-answer" role="complementary" aria-label="Réponse rapide">
  <span class="qa-label">Réponse rapide</span>
  <p><strong>[Affirmation factuelle directe en 1 phrase].</strong></p>
  <p style="margin-top:.55rem;margin-bottom:.4rem">Trois [conditions/principes/réflexes/...] :</p>
  <ul style="margin:0 0 .6rem;padding-left:1.15rem;font-size:.9rem;line-height:1.5">
    <li><strong>[Condition 1]</strong> [détail]</li>
    <li><strong>[Condition 2]</strong> [détail]</li>
    <li><strong>[Condition 3]</strong> [détail]</li>
  </ul>
  <p style="margin:0;font-size:.875rem">[Cas particuliers, nuance juridique, sourcing].</p>
</aside>
```

### Test rapide Oui/Non (modèle universel)

```
<aside class="quick-check" role="complementary" aria-label="Test rapide d'éligibilité">
  <h2>Test rapide : [question d'éligibilité spécifique] ?</h2>
  <ul>
    <li><strong>[Critère 1]</strong> ? <span class="check-yn">Oui / Non</span></li>
    <li><strong>[Critère 2]</strong> ? <span class="check-yn">Oui / Non</span></li>
    <li><strong>[Critère 3]</strong> ? <span class="check-yn">Oui / Non</span></li>
  </ul>
  <p class="check-verdict">→ Si vous avez répondu <strong>3 fois Oui</strong>, [conclusion + indemnité estimée]. <a href="https://wa.me/33756863630?text=[message_prerempli_urlencode]">Vérifier en 2 minutes sur WhatsApp</a>.</p>
</aside>
```

### Byline avec autorité (modèle universel)

```
<p class="byline">Par <strong>l'équipe Robin des Airs</strong> · Publié le [DATE_PUB] · Mis à jour le [DATE_MAJ] · <span style="color:#0B6BA3">Basé sur [TEXTE_LEGAL] et [JURISPRUDENCE_OU_SOURCE]</span></p>
```

Exemples concrets :
- "Basé sur le règlement CE 261/2004 et la jurisprudence de la CJUE"
- "Basé sur les arrêts CJUE C-402/07 et C-432/07 du 19 novembre 2009"
- "Basé sur les articles 6, 7 et 9 du règlement CE 261/2004"

### CTA en question (modèle universel)

```
<div class="cta-box">
  <p><strong>[Question conversationnelle du visiteur sur sa situation] ?</strong></p>
  <p style="font-size:.9rem;color:rgba(255,255,255,.85)">Vérifiez en 2 minutes — sans avance de frais.</p>
  <p>
    <a href="https://robindesairs.eu/#funnel-box">Vérifier mon indemnité</a>
    <span class="sep">·</span>
    <a href="https://wa.me/33756863630">WhatsApp direct</a>
  </p>
</div>
```

### Section "En résumé" (modèle universel)

```
<h2>En résumé : que retenir sur [sujet] ?</h2>
<p>[Trois/Quatre] points clés à retenir sur [sujet] :</p>
<ul>
  <li><strong>[Point 1 ultra-court]</strong> [détail].</li>
  <li><strong>[Point 2 ultra-court]</strong> [détail].</li>
  <li><strong>[Point 3 ultra-court]</strong> [détail].</li>
</ul>
```

---

## Wording par cas particuliers

### Délai de prescription en France

**À ne PAS dire** : "Le délai de prescription est de 5 ans en France."  
**À dire** : "Le règlement CE 261 ne fixe pas de délai uniforme. En France, le délai applicable aux actions contre les compagnies aériennes est de 5 ans à compter de la date du vol, en application de [l'article L110-4 du Code de commerce](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019017115/), confirmé par la Cour de cassation pour les indemnités CE 261 (Cass. 1ère civ., 17 mai 2017, n° 16-12.475)."

### Vol non couvert (formulation conditionnelle)

**À ne PAS dire** : "Abidjan → Paris n'est pas éligible."  
**À dire** : "Abidjan → Paris avec [compagnie non-UE] n'est pas couvert (compagnie non-européenne + décollage hors UE), mais le même trajet avec une compagnie de l'UE (Air France, Brussels Airlines) l'est."

### Application du règlement (Si/Alors)

```
Le règlement CE 261/2004 (article 3) s'applique dans deux cas :
- Si le vol décolle d'un aéroport de l'UE → alors il est couvert, quelle que soit la compagnie.
- Si le vol arrive dans l'UE et est opéré par une compagnie de l'UE → alors il est aussi couvert.
- Dans tous les autres cas → non couvert.
```

### Affirmations techniques opérationnelles

**À ne PAS dire** : "Les retards d'Air X s'expliquent par sa flotte limitée."  
**À dire** : "Les retards observés sur les lignes Air X peuvent s'expliquer par plusieurs facteurs opérationnels typiques des compagnies régionales. Sans valeur de fait établi, les hypothèses suivantes reviennent fréquemment : [liste]."

---

## Schemas JSON-LD prêts à copier

Voir `_templates/blog-aeo-template.html` pour les structures complètes commentées des 4 schemas obligatoires (BlogPosting, BreadcrumbList, FAQPage, HowTo).

---

## Erreurs à NE PAS faire

### 1. Keyword stuffing dans le corps

Ne pas insérer mécaniquement des variations comme "vol Air X retardé que faire", "indemnité retard Air X", "Air X remboursement". Google Helpful Content System pénalise. Les LLM matchent sur la sémantique, pas l'exact-match.

### 2. Tout transformer en questions

Un guide HowTo ne doit PAS avoir ses étapes transformées en questions. "1. Gardez votre carte d'embarquement" reste meilleur que "Comment dois-je conserver ma carte d'embarquement ?". Le format Q/R est pour les sections explicatives, pas les listes d'actions.

### 3. Réponses rapides trop denses

Plus de 80 mots dans la quick-answer = perte d'extractibilité par les featured snippets. Si la précision juridique exige plus, structurer en : phrase courte + puces + paragraphe.

### 4. Duplication "En bref" ↔ FAQ

Si un bloc "En bref" en haut répète les mêmes questions que la FAQ en bas → supprimer "En bref". Le test rapide Oui/Non remplace utilement l'ancien "En bref".

### 5. Affirmations juridiques absolues non sourcées

Pour un site qui veut être cité comme source autoritaire : tout chiffre, tout délai, toute condition doit être sourcé (texte légal + arrêt + lien officiel).

### 6. Oublier la section "En résumé"

Les LLM pondèrent la fin de l'article autant que le début. Sans cette section, on perd 50% du potentiel de citation.

---

## Outils de validation

Après création/modification d'un article, valider sur :

1. **Google Rich Results Test** — https://search.google.com/test/rich-results  
   Tester l'URL prod, vérifier que les 4 schemas sont détectés sans erreur.

2. **Schema.org Validator** — https://validator.schema.org/  
   Validation officielle Schema.org.

3. **Test manuel sur ChatGPT / Perplexity / Claude / Gemini**  
   2-3 semaines après mise en prod (temps de recrawl), poser 3-5 requêtes test type "ai-je droit à une indemnité pour X" et vérifier si Robin des Airs apparaît dans les sources citées.

---

## Workflow de création d'un nouvel article

1. Identifier l'**intention de recherche** principale (Q principale + 5-8 Q secondaires).
2. **Lister les entités clés** à intégrer (compagnies, aéroports, textes, jurisprudence).
3. **Copier le template** : `cp docs/_templates/blog-aeo-template.html blog/nouveau-slug.html`.
4. **Remplir les placeholders `{{...}}`** un par un en suivant le guide.
5. **Vérifier la checklist** ci-dessus (TL;DR) avant de committer.
6. **Tester en local** : `npm run preview` puis ouvrir `http://127.0.0.1:8787/blog/nouveau-slug.html`.
7. **Commit + push** : Netlify déploie automatiquement.
8. **Soumettre à indexation** : Google Search Console + Bing Webmaster + IndexNow ping.
9. **Mesurer** : après 2-3 semaines, tester citations LLM sur 5 requêtes type.

---

## Versions

- **v1.0** (2026-05-26) : Méthode initiale validée sur 3 articles pilotes (air-cote-divoire, arret-sturgeon, que-faire-aeroport).
- **v1.1** (2026-05-26) : Ajout des garde-fous juridiques anti-promesse + bloc "Méthodologie & sources" + table de conversion de wording. Validé sur le 4ᵉ pilote (ram-vols-annules-afrique-centrale-via-casa).
- **v1.2** (2026-05-26) : Stratégie WhatsApp prérempli formalisée (× 2 emplacements minimum, texte spécifique par article pour tracking 100% fiable sans cookies, tableau d'encodage URL, modèle universel + exemples). Permet la mesure du ROI par article et la qualification automatique des contacts.

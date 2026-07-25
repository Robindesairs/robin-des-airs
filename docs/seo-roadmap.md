# Roadmap SEO — Robin des Airs

Backlog vivant, façon agence. Mis à jour le 25/07/2026.
Principe : le site est jeune (autorité faible, ~1 backlink), beaucoup d'impressions peu de clics.
On NE crée pas de nouvelles pages (corpus saturé). L'effort va au **maillage + hubs + titres cliquables + backlinks**.

---

## A. Technique (état des lieux 25/07 : globalement SAIN)

Bonne nouvelle : canonicals + sitemap + 2 548 liens internes sont cohérents sur la forme `.html`. Pas de bug systémique. Points sains : robots.txt, hreflang FR/EN, noindex. Reste quelques correctifs mineurs.

| Prio | Problème | Pages | Correctif | Statut |
|---|---|---|---|---|
| Moyenne | `parrainage.html` : canonical en forme clean ≠ sitemap `.html` | 1 | remettre le canonical en `.html` | à faire [je peux] |
| Moyenne | 25 pages `vol-retarde-*` vivantes mais absentes du sitemap | 25 | corriger le glob de `build:sitemap` | à faire [je peux] |
| Basse | `sitemap.xml` == `sitemap-fr.xml` (doublon dans l'index) | 254 | retirer le doublon de l'index | à faire [je peux] |
| Basse | `/index.html` répond 200 sans 301 vers `/` | 1 | 301 dans `_redirects` | à faire [je peux] |
| À faire | Core Web Vitals non mesurés (clé PageSpeed = placeholder) | — | mettre une vraie clé API puis mesurer | [décision/toi] |
| Basse | Doublon `/x` + `/x.html` (200/200) mitigé par canonical | ~300 | ne rien faire (canonical suffit) | classé |

Systématisé : tâche planifiée **audit-technique-seo** (les 1 et 15 du mois, 09h15) → mail auto.

---

## B. Contenu / clusters (hub-and-spoke)

6 clusters. Règle de maillage partout :
1. Réciprocité : chaque satellite lie son hub (intro + conclusion), chaque hub liste ses satellites.
2. Lien transversal : compagnie ↔ sa route-phare ↔ l'arrêt CJUE qui fonde le droit.
3. Convergence conversion : toute page en position 6-11 et tout le cluster « recours » pointent vers `/mandat`.

### Cluster 1 — Compagnies africaines 🥇 (à attaquer en 1er)
Là où les impressions arrivent déjà (air-senegal, air-cote-ivoire, ethiopian, air-mauritius, RAM… en striking distance pos 6-11).
- Hub : renforcer `comparatif-10-hubs-afrique-ce261-fiabilite-retards` / `guide-ce261-droits-passagers-afrique` comme pilier « indemnisation par compagnie ».
- ~25 satellites présents. Manque : tableau « quelle compagnie indemnise le mieux / délais ».
- Maillage : chaque page compagnie lie le hub + 2-3 compagnies sœurs + sa route-phare.

### Cluster 2 — Recours & preuve du retard (bas de funnel, fort ROI)
- Hub à CRÉER : « Se faire indemniser quand la compagnie refuse : preuves, médiateur, mise en demeure, petite créance ».
- Satellites : saisir-mediateur-mtv (42 impr), justificatif-retard (29), preuves-retard (18), mise-en-demeure, petite-creance, mediation-2026…
- Maillage : toutes pointent vers `/mandat` (conversion directe).

### Cluster 3 — Par route Europe↔Afrique
- Hubs : `aller-a-dakar-depuis-europe-compagnies-ce261`, `guide-ce261-droits-passagers-afrique`.
- ~100 satellites `vol-retarde-{route}`. Maillage seulement, PAS de nouvelles routes.

### Cluster 4 — Jurisprudence CE 261 (socle E-E-A-T transversal)
- Hub : `jurisprudence-ce261-arrets-cjue`. ~20 arrêts.
- Maillage : chaque arrêt → hub + la page situation qu'il fonde. Corriger le typo d'URL `arret-airhelp-sas-greve`.

### Cluster 5 — Outre-mer / DOM
- Hub : `vols-dom-outre-mer-indemnite-400-euros-guide`. Satellites : Réunion, Antilles, Guyane. Manque : Mayotte. Ne pas mélanger avec l'Afrique (400 € ≠ 600 €).

### Cluster 6 — Situations & profils / éligibilité
- Hubs : `vol-afrique-europe-7-situations-indemnite-600`, `reglement-ce261-decrypte`. Satellites : retard/annulation/surbooking/downgrade + profils (bébé, famille, PMR, nationalité) + occasions diaspora (mariage, tabaski, omra, funérailles) → lier le hub Afrique.

Ordre : Cluster 1 (compagnies) → Cluster 2 (recours) → 4 en support → 3/5/6 en maillage.

---

## C. Off-page / autorité (le vrai verrou)

- Presse : 9 tribunes envoyées, 5 confirmations (Le Temps, Addis Standard, Le Lynx, Gabonreview, DataCameroon) → relancer pour verrouiller les parutions.
- Médias diaspora : ivorian.net contacté (relance 03/08). Chercher les équivalents par pays (rankent déjà sur « indemnisation vol [pays] »).
- Assos diaspora : vague 1 (15) envoyée ; vague 2 = collecter les 69 emails restants.
- Objectif : 15-20 domaines référents à 6 mois.

---

## E. Objectifs chiffrés (KPI targets) — mesurés dans le bilan mensuel

Point de départ (24/07/2026) : ~4 clics/semaine, position domaine ~9, ~1 backlink, 0 dossier payé, 574 citations IA/sem (Bing).

| Horizon | Objectif | Cible |
|---|---|---|
| Fin août 2026 | Clics organiques | ~15 / semaine (via titres + passage page 1) |
| Fin août 2026 | Domaines référents | 5 (presse + assos qui confirment) |
| Fin août 2026 | Position domaine | < 8 |
| Fin août 2026 | 🎯 Le vrai | 1re famille payée de bout en bout |
| 6 mois (fin 2026) | Domaines référents | 15-20 |
| 6 mois | Position domaine | < 7 |
| 6 mois | Dossiers payants | flux régulier (bouche-à-oreille amorcé) |
| **1 an (juil. 2027)** | Domaines référents | **25-30** |
| **1 an** | Position domaine | **< 5** ; clics organiques ~50-100/sem |
| **1 an** | 🎯 **Le vrai** | **flux régulier de dossiers payés** (ex. 10-20/mois) et **business qui se paie** (couvre le prêt Adie + dégage un revenu) |

Le bilan mensuel compare la réalité à ces cibles (monte-t-on assez vite ?).

---

## D. Cadence (façon agence)

- Quotidien 08h30 : rapport SEO (KPIs Google + Bing, tendance, pages à améliorer, tâches).
- Lundi 08h45 : point hebdo (+ angle concurrents + opportunités backlink + 3 priorités).
- 1 & 15 à 09h15 : audit technique auto.
- Le 1er 09h00 : bilan mensuel + point sur les 3 verrous.

---

## Rappel stratégique (panel du 24/07)

Le SEO est un jeu de 6-12 mois à ce niveau d'autorité. Le vrai levier de survie n'est pas plus de contenu, c'est : (1) des backlinks, (2) **la première famille payée de bout en bout**, (3) le cadre juridique/paiement. La roadmap SEO sert ces objectifs, elle ne les remplace pas.

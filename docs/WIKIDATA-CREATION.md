# Création de l'entrée Wikidata — Robin des Airs

> Objectif : faire valider Robin des Airs comme **entité reconnue** par les LLMs (ChatGPT, Claude, Perplexity, Gemini) qui utilisent Wikidata comme source de vérité pour identifier les entreprises.
>
> Impact AEO estimé : **+1,0 à +1,5 point** (les LLMs citent en priorité les entités Wikidata-validées).

---

## ⏱ Temps total : 15 minutes

## Pré-requis (rassembler avant de commencer)

À récupérer une seule fois :

- [ ] **Numéro SIREN** (9 chiffres) — sur tes statuts ou https://annuaire-entreprises.data.gouv.fr/
- [ ] **Numéro SIRET du siège** (14 chiffres) — idem
- [ ] **Date d'immatriculation** (jour mois année — visible sur les statuts ou Infogreffe)
- [ ] **Code NAF / APE** (ex : 7022Z, 6920Z, 7311Z)
- [ ] **Capital social** (en €)
- [ ] **Lien Linkedin entreprise** (si existe)
- [ ] **Lien page Facebook officielle** (si existe)
- [ ] **Lien Instagram officiel** (si existe)
- [ ] **Lien Twitter/X officiel** (si existe)

Concurrents pour référence (entrées Wikidata existantes) :
- **AirHelp** → [Q17108237](https://www.wikidata.org/wiki/Q17108237)
- **Flightright** → [Q19354471](https://www.wikidata.org/wiki/Q19354471)

---

## Étape 1 — Créer un compte Wikidata (3 min)

1. Va sur https://www.wikidata.org
2. Clique en haut à droite sur **"Create account"** (ou "Créer un compte")
3. Choisis un nom d'utilisateur **lié à la marque** (ex : `RobinDesAirsRDA`, `RDA-Editor`)
4. Confirme par e-mail
5. Connecte-toi

> ⚠️ **Important** : ne pas créer un compte au nom d'une personne. Wikidata accepte qu'une entreprise gère son propre item *à condition* d'être transparent sur son rôle (à mentionner sur la page utilisateur).

---

## Étape 2 — Créer l'item Wikidata (5 min)

1. Va sur https://www.wikidata.org/wiki/Special:NewItem
2. Remplis exactement comme ci-dessous :

### Libellés et descriptions multilingues

| Langue | Label | Description |
|---|---|---|
| **fr** | `Robin des Airs` | `Service français de récupération d'indemnités aériennes selon le règlement européen CE 261/2004` |
| **en** | `Robin des Airs` | `French service for airline passenger compensation claims (EU Regulation 261/2004)` |
| **de** | `Robin des Airs` | `Französischer Dienst zur Geltendmachung von Fluggast-Entschädigungsansprüchen (EG-Verordnung 261/2004)` |
| **es** | `Robin des Airs` | `Servicio francés de reclamación de indemnizaciones aéreas según el reglamento europeo CE 261/2004` |

### Alias (autres noms — onglet "Aliases / Also known as")

| Langue | Aliases (un par ligne) |
|---|---|
| fr | `Robin des Airs SAS`, `RDA`, `Robin des Airs Compensation` |
| en | `Robin des Airs SAS`, `RDA Compensation` |

3. Clique **"Create"** — tu obtiens un identifiant **Qxxxxxxx** (ex : Q123456789). **Note-le immédiatement.**

---

## Étape 3 — Ajouter les statements (5 min)

Sur la page de l'item nouvellement créé, ajoute les statements suivants en cliquant **"+ Add statement"** :

| Propriété | Valeur | Source à indiquer |
|---|---|---|
| **P31** (instance of) | `Société par actions simplifiée (Q610456)` | https://annuaire-entreprises.data.gouv.fr/etablissement/[SIRET] |
| **P17** (country) | `France (Q142)` | — |
| **P159** (headquarters location) | `Paris (Q90)` | — |
| **P856** (official website) | `https://robindesairs.eu` | — |
| **P1448** (official name) | `Robin des Airs SAS` (langue : fr) | — |
| **P452** (industry) | `legal services (Q7565830)` | — |
| **P1056** (product or material produced) | `airline passenger compensation (Q108568146)` | — |
| **P407** (language of work or name) | `French (Q150)`, `English (Q1860)`, `German (Q188)`, `Spanish (Q1321)` | — |
| **P571** (inception) | `[DATE D'IMMATRICULATION]` | Statuts ou Infogreffe |
| **P2429** (expected completeness) | `complete data set (Q53000465)` | — |
| **P1454** (legal form) | `Société par actions simplifiée (Q610456)` | — |
| **P3220** (KvK — utilisé aussi pour SIREN si manquant) | `[SIREN]` | https://annuaire-entreprises.data.gouv.fr |
| **P1581** (official blog URL) | `https://robindesairs.eu/blog/` | — |
| **P281** (postal code) | `75008` | — |
| **P669** (located on street) | `avenue des Champs-Élysées` | — |
| **P670** (street number) | `66` | — |
| **P6375** (street address) | `66 avenue des Champs-Élysées, 75008 Paris` (langue : fr) | — |

### Si tu as des comptes réseaux sociaux (à ajouter si applicable)
| Propriété | Valeur |
|---|---|
| **P2002** (Twitter username) | `[handle_sans_@]` |
| **P2003** (Instagram username) | `[handle_sans_@]` |
| **P2013** (Facebook ID) | `[id_page]` |
| **P4264** (LinkedIn company) | `[slug_linkedin]` |

---

## Étape 4 — Méthode rapide alternative : Quickstatements (5 min total au lieu de 15)

Si tu préfères tout faire d'un coup au lieu de cliquer 20 fois :

1. Crée d'abord l'item vide via https://www.wikidata.org/wiki/Special:NewItem (label + description seulement)
2. Note ton Q-ID (ex : Q123456789)
3. Va sur https://quickstatements.toolforge.org/
4. Connecte-toi via OAuth
5. Clique **"New batch"** → **"Standard format (V1)"**
6. **Remplace `Q_ID_ICI` par ton vrai Q-ID** dans le payload ci-dessous, et colle :

```tsv
Q_ID_ICI	Lfr	"Robin des Airs"
Q_ID_ICI	Len	"Robin des Airs"
Q_ID_ICI	Lde	"Robin des Airs"
Q_ID_ICI	Les	"Robin des Airs"
Q_ID_ICI	Dfr	"Service français de récupération d'indemnités aériennes selon le règlement européen CE 261/2004"
Q_ID_ICI	Den	"French service for airline passenger compensation claims (EU Regulation 261/2004)"
Q_ID_ICI	Dde	"Französischer Dienst zur Geltendmachung von Fluggast-Entschädigungsansprüchen (EG-Verordnung 261/2004)"
Q_ID_ICI	Des	"Servicio francés de reclamación de indemnizaciones aéreas según el reglamento europeo CE 261/2004"
Q_ID_ICI	Afr	"Robin des Airs SAS"
Q_ID_ICI	Afr	"RDA"
Q_ID_ICI	Aen	"Robin des Airs SAS"
Q_ID_ICI	P31	Q610456	S854	"https://robindesairs.eu/mentions-legales.html"
Q_ID_ICI	P17	Q142
Q_ID_ICI	P159	Q90
Q_ID_ICI	P856	"https://robindesairs.eu"	S854	"https://robindesairs.eu"
Q_ID_ICI	P1448	fr:"Robin des Airs SAS"
Q_ID_ICI	P452	Q7565830
Q_ID_ICI	P407	Q150
Q_ID_ICI	P407	Q1860
Q_ID_ICI	P407	Q188
Q_ID_ICI	P407	Q1321
Q_ID_ICI	P1454	Q610456
Q_ID_ICI	P281	"75008"
Q_ID_ICI	P6375	fr:"66 avenue des Champs-Élysées, 75008 Paris"
Q_ID_ICI	P1581	"https://robindesairs.eu/blog/"
```

À compléter quand tu as les infos (à coller dans une 2e batch) :
```tsv
Q_ID_ICI	P571	+AAAA-MM-JJT00:00:00Z/11	S854	"https://annuaire-entreprises.data.gouv.fr/entreprise/SIREN"
Q_ID_ICI	P3220	"SIREN_ICI"	S854	"https://annuaire-entreprises.data.gouv.fr/entreprise/SIREN"
```

7. Clique **"Import V1 commands"**, vérifie l'aperçu, puis **"Run"**

---

## Étape 5 — Mettre à jour `sameAs` dans le site (1 min)

Une fois ton Q-ID obtenu (ex : Q123456789), il faut **lier le site à Wikidata** dans la home.

Le `sameAs` de ton schema `LegalService` est déjà préparé pour recevoir l'URL. Cherche ce bloc dans `index.html` :

```json
"sameAs":["https://wa.me/33756863630"]
```

Et remplace-le par :

```json
"sameAs":["https://wa.me/33756863630","https://www.wikidata.org/wiki/Q_ID_ICI"]
```

**Commande prête à coller** (remplace `Qxxxxxxx` par ton vrai Q-ID Wikidata) :

```bash
cd ~/Documents/GitHub/robin-des-airs
WIKIDATA_QID="Qxxxxxxx"   # ← REMPLACE par ton Q-ID réel
sed -i.bak "s|\"sameAs\":\[\"https://wa.me/33756863630\"\]|\"sameAs\":[\"https://wa.me/33756863630\",\"https://www.wikidata.org/wiki/${WIKIDATA_QID}\"]|" index.html
rm index.html.bak
git add index.html && git commit -m "feat(seo): link homepage to Wikidata entity ${WIKIDATA_QID}" && git push
```

Tu peux faire la même chose dans `politique-confidentialite.html`, `mandat.html`, `mentions-legales.html` si tu veux maximiser le signal d'identité (script identique en bouclant sur les fichiers).

---

## Étape 6 — Bonus : créer une fiche Wikipédia (optionnel, +6 mois)

Wikipedia exige des **sources secondaires indépendantes** (articles de presse). Avant de tenter Wikipedia :

1. Obtenir 3+ articles de presse mentionnant Robin des Airs (Le Figaro, Le Monde, Capital, France Info, etc.)
2. Attendre 6 mois après la création Wikidata
3. Créer un brouillon sur https://fr.wikipedia.org/wiki/Aide:Brouillon
4. Soumettre via WP:DRAFTSUBMIT

C'est le seul **signal d'autorité externe** qui passe AirHelp en termes de citations LLM.

---

## Vérification 24h après création

Tester sur :

- https://www.wikidata.org/wiki/Q_TON_ID — la page existe
- Recherche Google : `"robin des airs" site:wikidata.org` — l'item apparaît
- 1-2 semaines après : `site:wikipedia.org "robin des airs"` (si les wikipédiens ajoutent un lien interlangues)
- 4-6 semaines : interroger ChatGPT / Perplexity → ton entreprise commence à être identifiée comme entité

---

## Pourquoi c'est critique pour l'AEO

**Les LLMs valident les entités via Wikidata.** Sans entrée Wikidata, le modèle ne sait pas si "Robin des Airs" est une vraie entreprise ou une expression hasardeuse. Avec une entrée Wikidata :

- ChatGPT / Claude / Perplexity / Gemini connaissent ton existence
- Ton nom devient une **named entity** détectée dans leurs pipelines de NER
- Les citations te désignent par nom (et non plus par URL hasardeuse)
- Google Knowledge Graph commence à indexer ta marque (Knowledge Panel possible sous 3-6 mois)

C'est l'investissement à **plus haut ROI** que tu peux faire pour ton AEO.

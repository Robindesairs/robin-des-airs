# GUIDE PAS-À-PAS — Configurer la campagne dans Meta Ads Manager

**Temps estimé :** 90 minutes (1h30) pour tout setup
**Prérequis :** Pixel Meta déployé sur robindesairs.eu (cf. fin du document)

---

## 🚀 ÉTAPE 1 — Déployer le pixel Meta sur PROD

Le pixel `1563661872042064` est déjà injecté dans les pages locales (`index.html`, `mandat.html`, etc.) mais **PAS encore déployé** sur robindesairs.eu.

### Commandes à lancer dans le terminal

```bash
cd /Users/climbie/Downloads/files

# 1. Vérifier le DRY-RUN (déjà fait)
node scripts/inject-meta-pixel.mjs

# 2. Lancer l'injection RÉELLE (écrit dans les fichiers)
node scripts/inject-meta-pixel.mjs --commit

# 3. Vérifier que c'est bien dans toutes les pages publiques importantes
grep -l "1563661872042064" index.html mandat.html depot-en-ligne.html autorisation.html cgv.html

# 4. Déployer sur Netlify (si pas en CI auto)
# Voir mémoire netlify-pas-auto-deploy.md
git archive --format=tar HEAD | tar -xC /tmp/robin-prod-build
netlify deploy --prod --dir=/tmp/robin-prod-build
```

### Vérifier que le pixel fonctionne

1. Va sur https://robindesairs.eu/ dans Chrome
2. Installe l'extension **Meta Pixel Helper** (chrome web store)
3. Ouvre l'extension → tu dois voir :
   - ✅ Pixel ID 1563661872042064 détecté
   - ✅ PageView event fired
4. Clique sur un lien WhatsApp → vérifier event **Lead** déclenché

→ **Sans cette vérification, NE LANCE PAS la campagne** : tu perdrais ton budget à l'aveugle.

---

## 🚀 ÉTAPE 2 — Setup Business Manager (15 min)

### Accéder à Business Manager
```
https://business.facebook.com/settings
```

### Vérifier les éléments suivants

```
☐ Compte Ads : 1124140858032089 → status ACTIF
☐ Page Facebook Robin des Airs → existe et accessible
☐ Compte Instagram @robin.des.airs (17841439260378062) → lié à la Page FB
☐ Domaine robindesairs.eu → vérifié (DNS TXT record)
☐ Pixel Meta 1563661872042064 → installé et reçoit des events
☐ Mode de paiement → CB ou virement configuré
☐ Limite de dépenses quotidienne → définie (sécurité)
```

### Si quelque chose manque

- **Domaine non vérifié** : Business Manager → Brand Safety → Vérification de domaine → ajouter robindesairs.eu → suivre instructions DNS TXT
- **IG pas lié à Page** : Page FB Robin → Paramètres → Comptes Instagram → Connecter
- **Pixel sans events** : retour étape 1, vérifier déploiement

---

## 🚀 ÉTAPE 3 — Créer les Custom Audiences (20 min)

### Custom Audience 1 — "Visiteurs site 30j"

```
Ads Manager → Audiences → Créer audience → Audience personnalisée
Source : Site web
Pixel : 1563661872042064
Événement : Toutes les personnes (All website visitors)
Période : 30 derniers jours
Nom : "Visiteurs robindesairs.eu 30j"
```

### Custom Audience 2 — "Visiteurs site 90j"

Identique mais période **90 jours**.
Nom : "Visiteurs robindesairs.eu 90j"

### Custom Audience 3 — "Engagement IG 90j"

```
Source : Profil Instagram
Compte : @robin.des.airs (17841439260378062)
Événement : Engagement (interactions, story tap, etc.)
Période : 90 derniers jours
Nom : "Engagement IG @robin.des.airs 90j"
```

### Custom Audience 4 — "Clients existants" (à uploader)

Si tu as déjà signé des mandats :

```bash
# Exporter CSV depuis Airtable
# Format attendu par Meta :
# email,phone,first_name,last_name,country
# john@example.com,+33612345678,John,Doe,FR
```

→ Dans Ads Manager : Créer audience → Liste de clients → Upload CSV → Match >40% nécessaire.

### Custom Audience 5 — "Vues vidéo Reels 75%" (après lancement Reels)

```
Source : Vidéo
Engagement : A regardé au moins 75% d'une vidéo
Vidéos : Sélectionner Reels Robin
Période : 90 derniers jours
Nom : "Vues Reels 75% 90j"
```

---

## 🚀 ÉTAPE 4 — Créer la campagne (30 min)

### Étape 4.1 — Nouvelle campagne

```
Ads Manager → Créer
Objectif : Conversions (PAS Traffic, PAS Engagement)
Bouton : Continuer
```

### Étape 4.2 — Configuration campagne

```
Nom : "Robin Airs IG Diaspora Q3-2026"
Objectif : Conversions
Catégorie de pub : ❌ AUCUNE (pas crédit/emploi/logement)
Budget : Budget de campagne CBO
  → Budget quotidien : 30€
  → Type d'enchère : Le coût le plus bas
A/B Test : ❌ Désactivé (on teste via variantes créa)
```

→ **Suivant**

---

## 🚀 ÉTAPE 5 — Créer Ad Set 1 (Cœur diaspora FR-BE)

### Configuration Ad Set 1

```
Nom Ad Set : "1. Diaspora FR-BE - 30j"
Page : Robin des Airs (FB)
Compte Instagram : @robin.des.airs

ÉVÉNEMENT DE CONVERSION
- Pixel : 1563661872042064
- Événement : Lead (WhatsApp click)
- Si Lead pas dispo → temporairement "ViewContent"

BUDGET
- Budget quotidien : 10€

AUDIENCE
- Audiences personnalisées à EXCLURE :
  ✓ Clients existants (Custom Audience 4)
  
- Lieux : 
  ✓ France (toutes régions)
  ✓ Belgique
  ✓ Type : "Personnes vivant à cet endroit"
  
- Âge : 25 - 55
- Genre : Tous
- Langues : Français (France, Canada)

CIBLAGE DÉTAILLÉ - Cliquer "Ajouter des centres d'intérêt"
Comportements > Expatriés :
  ✓ A vécu au Sénégal
  ✓ A vécu en Côte d'Ivoire  
  ✓ A vécu au Cameroun

Intérêts > Pays d'origine :
  ✓ Sénégal
  ✓ Mali
  ✓ Guinée
  ✓ Bénin
  ✓ Togo
  ✓ Burkina Faso
  ✓ Niger
  ✓ Gabon
  ✓ Mauritanie
  ✓ République du Congo
  ✓ République démocratique du Congo
  ✓ Madagascar
  ✓ Maurice

Intérêts > Voyage / Transfert :
  ✓ Western Union
  ✓ MoneyGram
  ✓ WorldRemit
  ✓ Sendwave
  ✓ Voyageurs internationaux fréquents

PLACEMENTS — IMPORTANT
❌ DÉCOCHER "Placements Advantage+"
✅ Choisir "Placements manuels"
✅ Cocher UNIQUEMENT :
   ☑ Instagram Feed
   ☑ Instagram Reels
   ☑ Instagram Stories
   ☑ Instagram Explore
❌ Décocher tout le reste (Facebook, Messenger, Audience Network)

OPTIMISATION
- Optimisation pour : Conversions
- Événement à optimiser : Lead
- Fenêtre d'attribution : 7 jours après clic, 1 jour après vue (par défaut)
```

→ **Suivant**

---

## 🚀 ÉTAPE 6 — Créer les pubs (variantes A/B/C)

Pour Ad Set 1, créer **3 pubs** :

### Pub 1A — "Aminata 600€"

```
Format : Image unique
Image : ig-ready-creas/ad_set1_1C_la_famille_1080x1350.png
Texte principal : (copier depuis ig-copies-pub-finales.md, variante A)
Titre : Jusqu'à 600€ par passager — Vol retardé vers l'Afrique
Description : Robin des airs — 0€ d'avance, paiement Wave/Orange Money en 48h
Site web : https://robindesairs.eu/
CTA : Envoyer un message → WhatsApp
Lien WhatsApp : https://wa.me/33756863630?text=Bonjour%20Robin%20des%20Airs...
```

### Pub 1B — "3 ans rétroactif"

Variante B (copier du fichier copies)

### Pub 1C — "Ce que la compagnie cache"

Variante C (copier du fichier copies)

→ **Publier**

---

## 🚀 ÉTAPE 7 — Dupliquer pour Ad Set 2 et 3

### Ad Set 2 — Aéroports

```
Dupliquer Ad Set 1 → renommer "2. Aéroports + Voyageurs"
Modifier audience :
  - Lieux : Remplacer France entière par les 8 aéroports avec rayon 25 km
    * CDG, ORY, BVA, MRS, LYS, BOD, BRU, CRL
  - Centres d'intérêt : ajouter compagnies cibles (Air Sénégal, RAM, Air Algérie, etc.)
Pubs : 2A (voyageur fréquent), 2B (annulation non-UE)
```

### Ad Set 3 — Retargeting

```
Dupliquer Ad Set 1 → renommer "3. Retargeting IG"
Modifier audience :
  - Lieux : France + Belgique
  - Audiences personnalisées INCLURE :
    ✓ Visiteurs robindesairs.eu 30j
    ✓ Engagement IG @robin.des.airs 90j
    ✓ Vues Reels 75% 90j
  - Audiences à EXCLURE :
    ✓ Clients existants
  - PAS de centres d'intérêt (le retargeting est plus puissant que les intérêts)
Pubs : 3A (rappel), 3B (témoignage)
```

---

## 🚀 ÉTAPE 8 — Pré-lancement vérification

### Checklist avant de cliquer "Publier"

```
☐ Pixel Meta confirmé via Meta Pixel Helper
☐ Domaine vérifié dans Business Manager
☐ Compte IG @robin.des.airs lié à la Page FB
☐ Limite de dépenses quotidienne définie (sécurité)
☐ Mode de paiement vérifié (CB valide)
☐ 3 Ad Sets créés (Diaspora / Aéroports / Retargeting)
☐ Chaque Ad Set a 2-3 pubs A/B/C
☐ Placements MANUELS (PAS Advantage+)
☐ Événement de conversion = Lead (pas Traffic/ViewContent)
☐ Budget total : 30€/jour
☐ Liens WhatsApp testés (cliquables, message pré-rempli OK)
☐ Mentions légales accessibles (page footer)
☐ Politique de confidentialité accessible (page footer)
☐ Image profil IG et Page FB à jour (logo Robin des airs)
```

---

## 🚀 ÉTAPE 9 — Publication + Review Meta

```
1. Bouton "Publier" → toutes les pubs partent en review
2. Délai Review : 2-24h (parfois 48h)
3. Status :
   - "En examen" → attendre
   - "Active" → diffusion commencée
   - "Rejetée" → corriger selon raison (souvent texte trompeur)
4. Si rejetée : appeler Meta support (chat Business Manager)
```

### Raisons fréquentes de rejet (à éviter)

| Raison | Correctif |
|---|---|
| "Promesse de résultat exagérée" | Remplacer "600€ garantis" par "jusqu'à 600€" |
| "Discrimination ethnique" | Diversifier les visages dans les images |
| "Tromperie sur le service" | Ajouter "selon éligibilité du vol" |
| "Catégorie pub spéciale" | Décocher Crédit/Emploi/Logement |

---

## 🚀 ÉTAPE 10 — Monitoring J+1, J+3, J+7

### À J+1 (24h après publication)

```
✓ Toutes les pubs sont "Active" (sinon → debug)
✓ Au moins 1000 impressions sur chaque ad set (sinon → audience trop étroite)
✓ Aucun CPL >20€ (sinon → couper la pub la moins perfo)
```

### À J+3

```
✓ CPL moyen <12€ → continuer
✓ CPL >15€ → ajuster créa ou audience
✓ CTR <0,8% → changer le visuel
```

### À J+7

```
✓ Identifier la VARIANTE GAGNANTE par ad set (CTR + CPL meilleurs)
✓ Pauser les 1-2 variantes les moins perfo
✓ Décliner la gagnante en 2-3 nouvelles variantes
```

### À J+14

```
✓ Si >50 leads collectés → créer Lookalike 1% à partir d'eux
✓ Lancer Ad Set 4 "Lookalike 1% France-BE" en parallèle
✓ Budget total : 40€/jour (10€ × 4 ad sets)
```

---

## 📊 KPIs à atteindre par phase

### Phase test (J+1 à J+7)

```
Total budget dépensé : ~210€
Leads cible : 20-30
CPL cible : <10€
CTR cible : >1,5%
Conversion lead → mandat signé cible : 25%
```

### Phase scale (J+30)

```
Budget mensuel : 600€ (20€/jour × 30j)
Leads/mois : 60-80
Mandats signés/mois : 15-20
CA/mois : 2 700€ (15 × 150€ commission)
Marge nette : 1 800€ (CA - pub - autres frais variables)
```

---

## 🔧 Outils complémentaires

### Meta Pixel Helper (Chrome extension)
- Vérifier le tracking en temps réel
- https://chrome.google.com/webstore/detail/meta-pixel-helper/

### Meta Events Manager
- https://business.facebook.com/events_manager2
- Voir les events Lead enregistrés
- Tester manuellement avec "Test Events"

### Ads Library
- https://www.facebook.com/ads/library/
- Voir les pubs des concurrents
- Espionner Indemniflight, Refundmyticket, AirHelp, etc.

---

## 🚨 Actions de sécurité

### Définir une limite de dépenses

```
Business Manager → Paramètres → Limite de dépenses
→ Fixer à 1000€/mois (sécurité contre runaway)
```

### Activer les alertes

```
Ads Manager → Notifications
→ Activer "CPL >20€" pour être alerté immédiatement
```

### Sauvegarder régulièrement

```
Chaque dimanche soir :
- Exporter les stats de la semaine en CSV
- Backup dans Airtable / Google Drive
- Mesurer le ROI (revenus encaissés / pub dépensée)
```

---

## ⚡ La règle d'or finale

**Ne touche RIEN pendant 7 jours après lancement.**

Les algorithmes Meta ont besoin de **48-72h de phase d'apprentissage**. Si tu modifies budget/audience/créa avant J+7, tu remets à zéro l'apprentissage et tu brûles ton budget.

**Patience = rentabilité.**

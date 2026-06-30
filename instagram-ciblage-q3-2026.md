# INSTAGRAM TARGETING — Robin des Airs Q3 2026

**Date :** 2026-06-29
**Compte Ads :** 1124140858032089
**Compte IG :** @robin.des.airs (17841439260378062)
**Source de référence :** [[audience-meta-facebook.md]] (audiences Meta déjà créées)

---

## 🎯 Structure Campagne

```
CAMPAGNE : Robin Airs IG Diaspora — Q3 2026
Objectif : Conversions (Lead WhatsApp)
Budget total : 30€/jour (10€ × 3 ad sets)
Durée test : 14 jours minimum
```

```
├── Ad Set 1 : Cœur diaspora FR-BE → 10€/jour
├── Ad Set 2 : Aéroports + voyageurs → 10€/jour
└── Ad Set 3 : Retargeting IG → 10€/jour
```

---

## 🎯 AD SET 1 — Cœur diaspora FR-BE

### Placements (CRITIQUE)

```
❌ Advantage+ Placements : DÉSACTIVÉ
✅ Manuels :
   - Instagram Feed
   - Instagram Reels
   - Instagram Stories
   - Instagram Explore
❌ Facebook (autre campagne dédiée)
❌ Messenger
❌ Audience Network
```

### Géographie

```
Lieux : France + Belgique
Type : Personnes vivant à cet endroit
```

### Démographie

```
Âge : 25 - 55
Genre : Tous
Langue : Français (France, Canada)
```

### Centres d'intérêt (copier-coller exact dans Ads Manager)

**Diaspora — Comportements "A vécu en..." :**
- A vécu au Sénégal (anciennement Expats - Sénégal)
- A vécu en Côte d'Ivoire (anciennement Expats - Côte d'Ivoire)
- A vécu au Cameroun (anciennement Expats - Cameroun)

**Pays d'origine (Centres d'intérêt) :**
- Sénégal
- Mali
- Guinée
- Bénin
- Togo
- Burkina Faso
- Niger
- Gabon
- Mauritanie
- République du Congo
- République démocratique du Congo
- Madagascar
- Maurice

**Voyage + transfert :**
- Western Union
- MoneyGram
- WorldRemit
- Sendwave
- Voyageurs internationaux fréquents

### Exclusions

```
- Custom Audience : Clients Robin des Airs (signataires mandat)
- Custom Audience : Leads en cours
- Maroc (si proposé en sous-zone)
- Algérie (Phase 1)
- Tunisie (Phase 1)
```

### Taille audience estimée

**2,6 - 3,1 M personnes**

---

## 🎯 AD SET 2 — Aéroports + voyageurs

### Géographie (rayon 25 km)

```
✈️ Paris Charles de Gaulle (CDG) - 25 km
✈️ Paris Orly (ORY) - 25 km
✈️ Paris Beauvais (BVA) - 25 km
✈️ Marseille Provence (MRS) - 25 km
✈️ Lyon Saint-Exupéry (LYS) - 25 km
✈️ Bordeaux Mérignac (BOD) - 25 km
✈️ Bruxelles Zaventem (BRU) - 25 km
✈️ Charleroi (CRL) - 25 km
```

### Démographie

```
Âge : 25 - 55
Genre : Tous
Langue : Français
```

### Centres d'intérêt

**Compagnies cibles :**
- Air Sénégal
- Air Côte d'Ivoire
- ASKY Airlines
- Camair-Co
- Brussels Airlines
- Air France

**Comportements :**
- Voyageurs internationaux fréquents
- Voyageurs internationaux récents

**Signal mobile money diaspora :**
- Western Union
- MoneyGram
- Wave (si trouvé)
- Orange Money (si trouvé)

### Placements

```
✅ Instagram Reels (priorité)
✅ Instagram Stories
✅ Instagram Feed
✅ Instagram Explore
```

### Taille estimée

**800K - 1,2M personnes**

---

## 🎯 AD SET 3 — Retargeting Instagram

### Audiences à inclure (OU logique)

- Visiteurs robindesairs.eu → 30 derniers jours (via pixel)
- A interagi avec @robin.des.airs (IG) → 90 jours
- A vu ≥ 50% d'une vidéo Reel Robin → 90 jours
- A enregistré une publication → 90 jours
- A envoyé un message via DM → 30 jours

### Exclusions

- Custom Audience : Clients Robin des Airs (mandat signé)
- Custom Audience : Leads en cours

### Placements

```
✅ Instagram Stories (priorité — engagement le plus haut)
✅ Instagram Reels
✅ Instagram Feed
```

### Taille (selon trafic actuel)

**1K - 15K personnes** → CPL très bas (~3-5€)

---

## 📐 Formats créatifs par placement

| Placement | Ratio | Durée | Type créa |
|---|---|---|---|
| **IG Stories** | 9:16 (1080×1920) | 15s vidéo / image | Famille + 600€ géant + swipe up |
| **IG Reels** | 9:16 (1080×1920) | 15-30s | Hook 2s + témoignage + CTA |
| **IG Feed** | 4:5 (1080×1350) | image / carrousel 6-10 | Carrousel "Comment récupérer 600€" |
| **IG Explore** | 4:5 ou 1:1 | image | Visuel choc 600€ + famille |

---

## 🎨 Créas existantes (déjà dans le dossier)

- `ad_ig_A.png` — Story 9:16
- `ad_ig_B.png` — Story 9:16 variante
- `ad_story_A.png`, `ad_story_B.png`
- `ad_fb_A.png`, `ad_fb_B.png` — à adapter en 4:5 pour IG Feed
- `ad_cc1.png`, `ad_cc2.png`, `ad_cc3.png` — Carrousel 3 cartes

**À tourner ce week-end :** 3 Reels 15s verticaux (cf. `scripts-reels-15s.md`)

---

## 💰 Budget recommandé phase 1

```
Total : 30€/jour × 7 jours = 210€/semaine
Objectif : 20-30 leads/semaine
CPL cible : 7-10€

Si CPL >12€ après 5 jours → couper ad set
Si CPL <7€ → augmenter budget +50%
```

---

## 📋 Checklist setup avant lancement

```
☐ Pixel Meta installé sur robindesairs.eu (toutes pages)
☐ Événement personnalisé "Lead" configuré
☐ Catalogue Custom Audiences uploadées (clients + leads CRM Airtable)
☐ Domaine vérifié dans Business Manager
☐ Compte IG @robin.des.airs lié à Business Manager
☐ Page Facebook Robin des Airs créée
☐ Compte Ads vérifié (mode de paiement OK)
☐ Politique de confidentialité accessible (RGPD)
☐ Conditions générales en ligne
```

---

## 🚀 Ordre de lancement

### Jour 1
- Lancer **Ad Set 1 (Diaspora FR-BE)** → 10€/jour
- Observer 48h sans toucher

### Jour 3
- Si CPL <10€ → lancer **Ad Set 2 (Aéroports)**
- Si CPL >12€ → ajuster créa ou audience

### Jour 7
- Activer **Ad Set 3 (Retargeting)** dès 1000+ visiteurs site cumulés

### Jour 14
- Si 50+ leads accumulés → créer **Lookalike 1%** depuis Custom Audience leads
- Activer Ad Set 4 (Lookalike) en plus

---

## ⚠️ Les 5 erreurs à éviter

| Erreur | Conséquence |
|---|---|
| Activer Advantage+ Placements | Créa verticale diffusée sur FB horizontal → -40% CTR |
| Mixer FR + EN dans la même campagne | Algo se perd → CPL +30% |
| Cibler le Maroc | Hors CE261 → leads non éligibles, perte d'argent |
| 1 ad set avec 50 intérêts | Trop large → algo dilué → CPL +50% |
| Changer créa avant 7 jours | Pas assez de data → tu coupes une potentiellement gagnante |

---

## 🎯 KPIs à surveiller

| Métrique | Cible bonne | Alerte |
|---|---|---|
| CPL (coût par lead) | <10€ | >15€ → couper |
| CTR (Click Through Rate) | >1,5% | <0,8% → changer créa |
| CPM (coût par 1000 vues) | 8-15€ | >25€ → audience trop chaude |
| Qualification lead → mandat | >25% | <15% → revoir ciblage |
| Cost per signed mandate | <40€ | >60€ → revoir entonnoir |

---

## 📱 Étapes setup dans Ads Manager

1. Meta Ads Manager → Nouvelle campagne
2. Objectif "Conversions" → événement "Lead"
3. Renomme : "Robin Airs IG Diaspora Q3-2026"
4. Budget CBO 30€/jour (ou par ad set)
5. **Ad Set 1** :
   - Audience → "Créer nouvelle audience" → colle config ci-dessus
   - Placements → "Manuelle" → coche IG uniquement
   - Optimisation → "Conversions" → événement "Lead"
6. Duplique pour Ad Set 2 et 3 (modifie audience + placement)
7. Ajoute créas (`ad_ig_A.png`, `ad_ig_B.png`, etc.)
8. Publie → attend approbation Meta (~2-24h)

---

## 📊 Bonus — Lookalike Phase 2 (à activer à 100+ mandats signés)

```
Source : Custom Audience "Clients Robin des Airs" (CSV CRM Airtable upload)
Type : Lookalike
Géographie : France + Belgique
Tailles à tester : 1%, 2%, 5% (3 ad sets séparés)
Placements : Instagram uniquement (Reels + Stories prioritaire)
Budget : 5-10€/jour par ad set
```

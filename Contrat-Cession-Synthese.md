# Contrat de Cession de Créance — Synthèse Juridique

**Source officielle :** [`mandat.html`](mandat.html) (production)
**Modèle juridique :** Cession à titre de recouvrement avec opposabilité différée
**Date :** 2026-06-29

---

## Architecture juridique en 3 niveaux

```
NIVEAU 1 — Effet entre les parties (dès la signature)
└── Cession de créance à titre de recouvrement (art. 1321 C. civ.)
    └── Robin des airs devient titulaire de la créance

NIVEAU 2 — Phase amiable + médiation MTV (cession NON notifiée)
└── Robin des airs agit "pour le compte du cédant"
    └── Le passager conserve sa qualité de consommateur
        └── Accès à la médiation préservé (décret 2025-772)

NIVEAU 3 — Phase contentieuse (cession notifiée — art. 1324 C. civ.)
└── Robin des airs agit en son nom propre comme cessionnaire
    └── Seul le paiement à Robin des airs est libératoire
        └── Représentation OBLIGATOIRE par avocat inscrit au barreau
```

---

## Pourquoi ce modèle est supérieur à la cession pure

| Risque sur cession pure | Solution dans le modèle actuel |
|---|---|
| Requalification judiciaire en mandat (cas Weclaim) | **Clause de continuité Art. 5 bis** : si cession tombe → mandat subsidiaire |
| Coût de signification huissier en amiable | **Opposabilité différée** : pas de signification jusqu'au contentieux |
| Perte du statut consommateur du passager | **Maintien explicite** jusqu'à la notification → accès médiation conservé |
| Clauses d'incessibilité (Air France CGT 12.3/12.5) | **Art. 5 ter** : CJUE C-11/23 Eventmedia c/ Air Europa = inopposables |
| Paiement direct au passager (anti-contournement) | **Art. 6** : non libératoire après notification |

---

## Pourquoi ce modèle est supérieur au mandat pur

| Limite du mandat pur | Avantage de la cession différée |
|---|---|
| Compagnie peut payer directement au passager | Après notification, paiement direct **non libératoire** |
| Mandat révocable unilatéralement | Cession **irrévocable** entre parties dès signature |
| Pas de titularité du créancier | Titularité claire au stade contentieux pour agir |
| Article 700 difficile à toucher | Frais alloués art. 700 → restent acquis à Robin des airs (Art. 4.1) |

---

## Réponse à la question "je suis propriétaire ET je représente le passager — c'est cohérent ?"

**Oui, parce que ce n'est pas un cumul cession+mandat, c'est une cession à 2 temps :**

1. **T0 — Signature** : Cession effective entre les parties (Robin des airs propriétaire de la créance face au passager)
2. **T1 — Phase amiable** : Robin des airs n'a PAS encore notifié la cession à la compagnie → vis-à-vis de la compagnie, on agit "pour le compte du cédant" (Art. 5 quater)
3. **T2 — Échec médiation** : Notification de la cession (art. 1324) → Robin des airs agit en son nom propre

**Tu n'es PAS dans deux statuts en même temps. Tu es :**
- Cessionnaire face au passager (toujours)
- "Représentant pour le compte" face à la compagnie (phase 1-2)
- Cessionnaire notifié face à la compagnie (phase 3)

C'est juridiquement propre, ça suit la lettre du Code civil, et c'est ce qui est dans ton `mandat.html` actuel.

---

## Articles clés du contrat (référence rapide)

| Article | Objet |
|---|---|
| **Art. 1** | Objet : cession à titre de recouvrement (art. 1321) |
| **Art. 1 bis** | Phases du recouvrement et notification différée |
| **Art. 2** | Durée 24 mois, résiliation possible si amiable échoue |
| **Art. 3** | Exclusivité & anti-contournement |
| **Art. 4** | Honoraires 25% TTC — No Win No Fee |
| **Art. 4.1** | Frais judiciaires 100% Robin des airs, art. 700 acquis à RDA |
| **Art. 5** | Paiement sur compte dédié Robin des airs, reversement 75% sous 48h |
| **Art. 5.1** | Cédant injoignable → consignation Caisse des Dépôts (art. 1345-1) |
| **Art. 5 bis** | Modalités cession + clause de continuité (mandat subsidiaire) |
| **Art. 5 ter** | Inopposabilité clauses incessibilité (CJUE C-11/23) |
| **Art. 5 quater** | Réclamation pour compte du cédant, position sur CGT |
| **Art. 6** | Non libératoire pour compagnie après notification |

---

## Décisions stratégiques tranchées

- ❌ **Cession pure abandonnée** — trop risquée (Weclaim, opposabilité, hors-UE)
- ❌ **Mandat pur abandonné** — moins solide contre les compagnies récalcitrantes
- ✅ **Cession à opposabilité différée + mandat subsidiaire** — modèle retenu
- ✅ **Modèle A : Robin des airs avance 100% des frais judiciaires** (aligné AirHelp/Air Indemnité)
- ✅ **Article 700 CPC → Robin des airs** (couvre l'avance d'huissier)
- ✅ **Avocat OBLIGATOIRE en contentieux** — Robin des airs ne plaide jamais

---

## Reste à valider

- 🔴 **Gate avocat** : faire valider la rédaction complète par un avocat partenaire avant le premier contentieux
- 🟡 Tester la cession sur 5-10 dossiers Air France pour confirmer la traction CJUE C-11/23
- 🟡 Préparer le template de notification de cession (acte d'huissier + lettre)

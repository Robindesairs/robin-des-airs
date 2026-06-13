# CRM « Dossiers Passagers » — Guide opérateur & refonte

> Base Airtable `appv72lKbQtjt7EIP` · table **Dossiers Passagers** `tblfg688AGxaywi7O`
> Objectif : un outil de travail **clair et efficace** pour les opérateurs. 1 ligne = 1 passager (une famille = plusieurs lignes, même **Référence Dossier**).
> Mis à jour le 13/06/2026.

---

## ✅ DÉJÀ FAIT automatiquement (par l'API)

### 7 nouveaux champs créés
| Champ | Type | À quoi ça sert |
|---|---|---|
| **Drapeau urgence** | formule 🔴/🟠/🟢 | **Le tri de la journée.** 🔴 prescription proche/dépassée · 🟠 relance due · 🟢 sous contrôle · ⚪ clos · ⚫ date de vol manquante |
| **Jours avant prescription** | formule (nombre) | Jours d'ici la prescription (négatif = déjà prescrit). Trier croissant = plus urgent en haut |
| **Échéance prescription** | formule (date) | Date limite d'action = **5 ans après le vol** (auto) |
| **Action conseillée** | formule (texte) | Prochaine étape suggérée d'après le statut (auto, zéro saisie) |
| **Date de relance** | date (manuel) | Prochaine date où agir. Convention : LRAR → +8 sem. ; Relance 1 → +3 sem. |
| **Opérateur assigné** | collaborateur | Qui traite le dossier (vue « Mes dossiers ») |
| **Test / Démo** | case à cocher | Cochée = ligne de test, **exclue de toutes les vues opérateur** |

### Données de test marquées (44 lignes sur 54)
Cochées **Test / Démo** : le lot `DSR2024…` (Dupont Marie, Zhang Wei, Smith John…), toutes les lignes KODJO / climbie / SAINTYVES, les placeholders (USER Test, « Fg OUT », « Pout juge », Passager 1/2, lignes vides), **et le jeu de démo dupliqué** DIALLO / ASANTE / CAMARA / KOUASSI / BATUMELO / SY (chacun présent 2× sous `RDA-2026-00X` **et** `RDA-2YYMMDD-100X` = données de démonstration, pas de vrais dossiers).

### Code corrigé (commit local, non déployé)
Le bot écrivait le code brut « delay » dans **Type d'incident**. Corrigé → écrit « Retard +3h » / « Annulation » / « Surbooking ».

---

## ⚠️ 10 lignes laissées VISIBLES — à vérifier par toi
Je ne les ai **pas** marquées test (au cas où ce seraient de vrais leads). Vérifie et coche **Test / Démo** si ce sont des essais :
- **Marion CAMBESSÉDÈS** — `RDA-20260514-FD79`
- **M. SAMIR DRIDI** (×3) + **Aminata TRAORÉ** (×2) — refs `…-41F9`, `…-E448`, `…-6FEE` (ressemblent à des extractions OCR de cartes d'embarquement de test)
- **M. LIVIA HEJOAKA** — `RDA-20260513-B1EE`
- **3 lignes SANS nom** — `RDA-20260610-0979…` (MRS→CDG), `RDA-20260613-051862…` (easyJet SXB→BCN), `RDA-20260610-AAB…` (DSS→CDG, Air France — celle-ci ressemble à un **vrai** dossier diaspora récent)

---

## 🎨 À FAIRE À LA MAIN — recolorer les statuts (≈ 3 min, l'API ne le permet pas)

Sans couleurs, le champ **Statut du Dossier Suivi** ne donne aucun signal à l'œil (tout est bleu). Le **Drapeau urgence** compense déjà, mais pour un confort maximal :

**Table → flèche sur l'en-tête « Statut du Dossier Suivi » → Edit field → recolorer chaque choix :**

| Choix | Couleur | Bande |
|---|---|---|
| Nouveau | bleu clair | actif |
| Documents en cours | cyan | actif |
| Signature en attente | cyan clair | actif |
| Mandat signé | bleu vif | actif |
| LRAR envoyée | turquoise (teal) | attente légale |
| Relance 1 | jaune | **action requise** |
| Relance 2 | jaune foncé | **action requise** |
| Médiation | orange | **action requise** |
| Contentieux | orange foncé | **action requise** |
| Payé client | **vert vif** | gagné |
| Refus définitif | **rouge vif** | mort |
| Prescrit | rouge foncé | mort |
| Abandon | gris | mort |
| ~~Gagné · Perdu · Envoyé à la compagnie · En négociation~~ | **gris** | *obsolètes — ne plus utiliser* |

**Ajouter les 5 choix manquants** (le code les écrit, autant les créer proprement) : `Relance 1`, `Relance 2`, `Refus définitif`, `Prescrit`, `Abandon`.

**Champ « Type d'incident »** : recolorer `Retard +3h` (jaune), `Annulation` (orange), `Surbooking` (rouge), `Retard +3h à l'arrivée` (jaune foncé) ; griser `delay` (obsolète — ne plus utiliser).

> ⚠️ **Ne JAMAIS renommer un choix existant** (le code écrit le nom exact → un renommage casse silencieusement les écritures). Recolorer / ajouter / réordonner = sans danger.

---

## 📊 VUES GRILLE à créer (dans la table)

Pour chaque vue : *Create → Grid → renommer → poser filtre / tri / regroupement / couleur*. **Filtre commun partout : `Test / Démo` n'est pas coché.**

| Vue | Filtre | Tri | Regroupement | Champs masqués |
|---|---|---|---|---|
| **🟢 Opérationnel** *(défaut)* | Test/Démo décoché | Drapeau urgence ↓ puis Date de relance ↑ | par Statut du Dossier Suivi | Statut Dossier (ancien), IBAN, commissions, Sexe, Date naissance |
| **📋 À traiter aujourd'hui** | Test/Démo décoché ET (Date de relance ≤ aujourd'hui OU Statut = Nouveau OU Drapeau = 🔴) | Drapeau urgence ↓ puis Date de relance ↑ | par Statut | idem |
| **⏰ Prescription proche** | Test/Démo décoché ET Jours avant prescription < 90 ET Statut ∉ {Payé client + branches mortes} | Jours avant prescription **↑** | — (couleur ligne rouge si < 30 j) | idem |
| **✅ Payés** | Test/Démo décoché ET Statut = Payé client | Last Modified Time ↓ | par mois | pièces |
| **🧪 Test & démo** | Test/Démo **coché** | Référence Dossier | — | — (bac à sable) |
| **👤 Mes dossiers** | Test/Démo décoché ET Opérateur assigné = utilisateur courant | Drapeau urgence ↓ | par Statut | comme Opérationnel |

---

## 🖥️ INTERFACE « Espace opérateur » (onglet Interfaces)

Créer une interface avec 4 pages. **Filtre commun à chaque page : Test/Démo décoché.**

### Page 1 — « Ma journée » *(Dashboard)*
4 grands chiffres : **À traiter** (Statut ∈ Nouveau/Documents/Signature) · **Relances dues** (Date de relance ≤ aujourd'hui) · **Prescription < 90 j** (rouge) · **Payé ce mois** (vert).
Dessous, liste « À faire maintenant » : filtre `Date de relance ≤ aujourd'hui OU Drapeau = 🔴 OU Statut = Nouveau` ; colonnes : Drapeau urgence · Nom · Référence · Compagnie · Statut · Action conseillée · Date de relance · Jours avant prescription.

### Page 2 — « À traiter » *(Kanban par Statut du Dossier Suivi)*
Exclure les statuts clos. Carte = Drapeau urgence + Nom + Compagnie + Action conseillée + Jours avant prescription. Couleur des cartes **par Drapeau urgence**.

### Page 3 — « Urgences prescription » *(Liste)*
Jours avant prescription < 90, trié croissant, ligne rouge si < 30 j.

### Page 4 — « Détail dossier » *(Record review)* — 6 sections
1. **Passager** : Nom · Prénom · WhatsApp · Email · Statut Mineur · Représentant légal · Référence *(rappel : une famille = plusieurs lignes, même Référence)*
2. **Vol & incident** : Compagnie · N° vol · Date du vol · Itinéraire · Type d'incident · Heure d'arrivée réelle · Raison compagnie · PNR · N° billet
3. **Éligibilité & montant** : Montant de l'indemnité · Remarques
4. **Pièces** : Passeport/CNI/Titre de séjour · Carte d'embarquement · Mandat signé · **Pièce manquante** (en rouge si rempli)
5. **Suivi & échéances** : Statut · Action conseillée · Date de relance · Drapeau urgence · Échéance prescription · Jours avant prescription · Opérateur assigné · Last Modified
6. **Paiement** : IBAN · Montant Client · Commissions (lecture seule)

Boutons en haut : **WhatsApp** (`https://wa.me/` + numéro) · **Email** (`mailto:`).

---

## 📋 RUNBOOK — que faire à chaque étape

| Statut | À faire | Passe à l'étape suivante quand… | Délai |
|---|---|---|---|
| **Nouveau** | Vérifier éligibilité (retard > 3 h, distance, compagnie) **et l'échéance de prescription**. Réclamer les pièces. | Pièces de base reçues | 48 h |
| **Documents en cours** | Relancer pour passeport/CNI + carte d'embarquement. Remplir « Pièce manquante ». | Toutes pièces là | 2–5 j |
| **Signature en attente** | Envoyer le lien de mandat, relancer si pas signé. | Mandat signé reçu | 1–3 j |
| **Mandat signé** | Préparer + envoyer la mise en demeure (LRAR) à la compagnie. | LRAR partie | 72 h |
| **LRAR envoyée** | Poser **Date de relance à +8 semaines**. Attendre. | 8 sem. sans paiement | ~8 sem. |
| **Relance 1** | 2ᵉ courrier ferme. Reprogrammer +3 sem. | Sans réponse | +3 sem. |
| **Relance 2** | Dernier rappel, annoncer médiation/contentieux. | Sans réponse | +3 sem. |
| **Médiation** | Saisir le médiateur (MTV) / autorité nationale. | Décision/refus | 4–10 sem. |
| **Contentieux** | Monter le dossier judiciaire (**vérifier la prescription !**). | Jugement/accord | variable |
| **Payé client** | Vérifier IBAN, payer le client, enregistrer commissions, clôturer. | — | — |

### Règles d'or
1. **Toujours exclure Test/Démo** — travailler dans les vues 🟢 / 📋 / ⏰, jamais dans la grille brute.
2. **Vérifier l'échéance de prescription D'ABORD**. Un 🔴 passe avant tout.
3. **Une famille = plusieurs lignes, même Référence** — traiter ensemble (LRAR groupée, même date de relance).
4. **Un seul statut fait foi : « Statut du Dossier Suivi »**. Ignorer l'ancien « Statut Dossier ».
5. **Mettre à jour « Date de relance » à chaque contact** — c'est ce qui alimente « Ma journée ».

### Que faire si…
- **Pièce manque** → Statut « Documents en cours », détailler dans « Pièce manquante », relancer, Date de relance +2 j.
- **Client injoignable** → 3 tentatives sur 5 j → « Lead froid », Date de relance +30 j. Ne jamais supprimer.
- **Compagnie muette après 8 sem.** → « Relance 1 » → 2ᵉ courrier → +3 sem. → « Relance 2 » → « Médiation ».
- **Prescription < 90 j (🔴)** → priorité absolue. Si LRAR pas envoyée, l'envoyer **maintenant** ; sinon accélérer vers médiation/contentieux pour **interrompre la prescription avant l'échéance**.

---

## 🔧 RECOMMANDÉ (nécessite ton feu vert — touche données/code)

1. **Supprimer les champs redondants** : `Trajet` (doublon d'`Itinéraire`, écrit seulement par l'intake agence), `Statut Dossier` (ancien champ commercial). → migrer d'abord les valeurs vers les champs canoniques, **puis** supprimer.
2. **Faire écrire l'intake agence sur le bon statut** : aujourd'hui il écrit dans l'ancien `Statut Dossier` ; le rebrancher sur `Statut du Dossier Suivi`.
3. **Table parent « Dossiers »** (clé = Référence Dossier) reliée aux passagers → un seul drapeau urgence par famille, somme des indemnités, échéance la plus proche du groupe. Bonne cible si l'aval s'industrialise.
4. **Confirmer le délai de prescription** (5 ans supposé en France) avec le juriste avant de figer.

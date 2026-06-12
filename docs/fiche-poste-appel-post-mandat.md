# Fiche de poste — Conseiller·ère « Appel de confirmation » (post-signature mandat)

**Mission en une phrase :** rappeler chaque client juste après la signature de son mandat, dans sa langue, pour **sécuriser la confiance**, **vérifier les informations que le bot ne peut pas trancher seul**, et **compléter le dossier** — afin qu'il soit propre, complet et gagnable.

> Numéro à utiliser : **+33 7 56 86 36 30** — demander au client de l'enregistrer sous « **Robin des Airs** ».
> Modèle : 0 € d'avance, **25 % de commission au succès uniquement** (30 % si dossier monté en agence physique).

---

## 1. Quand appeler
- **Idéalement dans les 2 h** suivant la signature du mandat (à chaud = meilleure confiance).
- Au plus tard **sous 24 h**.
- Priorité absolue aux dossiers marqués **`aVerifierExpert = true`** (voir §4) et aux **gros montants / groupes**.

## 2. Avant de décrocher — préparer l'appel (2 min)
Ouvrir le dossier (réf. `RDA-…`) et repérer :
- Nom du mandant + nombre de passagers, montant estimé.
- **Vol, date, route, compagnie**.
- Le **verdict automatique** du bot : `flightVerdict` = `eligible` / `sous_seuil` / `hors_champ` / `a_verifier`.
- Le flag **`aVerifierExpert`** (correspondance, hors champ, sous seuil, ou vol non vérifié).
- Pièces déjà reçues / manquantes.
- Langue du client (`lang`).

## 3. Structure de l'appel (≈ 3–5 min)

**a) Ouverture — prouver que c'est réel et humain**
> « Bonjour [Prénom], c'est [Nom] de Robin des Airs, je vous appelle suite à votre mandat signé ce [matin] pour votre vol [n° / route]. »
- Se présenter, parler **dans sa langue**, ton chaleureux. → C'est déjà 50 % de l'anti-arnaque.

**b) Vérifications (cœur du poste — voir §4).**

**c) Réassurance + complétion** : lever les doutes, récupérer les pièces manquantes, confirmer le moyen de paiement.

**d) Clôture** : récapituler les prochaines étapes, rappeler « 0 € si on ne gagne pas », « gardez mon numéro ». Noter dans le CRM.

---

## 4. ✅ Les vérifications à faire (checklist)

> Objectif : rattraper tout ce que le bot **ne peut pas** confirmer seul.

### 4.1 Identité du vol — LE point critique
- [ ] **Confirmer le n° de vol et la date.**
- [ ] **Direct ou correspondance ?** ⚠️ Le client a souvent cliqué « direct » alors qu'il y avait un 2ᵉ vol (ex. Dakar → Paris **puis Paris → Strasbourg**). Demander explicitement : *« Votre billet allait-il jusqu'où exactement ? Y a-t-il eu un autre avion après ? »*
  - Si correspondance → noter **tous les segments dans l'ordre** + préciser **billet unique (1 réservation/PNR) ou billets séparés** (ça change le calcul).
- [ ] **Sens du vol** (départ Europe ou départ Afrique) — décisif pour la couverture (voir §4.5).

### 4.2 Cohérence du dossier
- [ ] Nom sur le mandat = **nom exact du passeport/CNI** (attention noms de jeune fille, ordre prénom/nom).
- [ ] Route et nombre de passagers cohérents.
- [ ] Date du vol plausible (ni futur, ni prescrit > 5 ans).

### 4.3 Nature de l'incident
- [ ] **Retard** : confirmer **retard à l'arrivée ≥ 3 h** (c'est l'arrivée qui compte, pas le départ).
- [ ] **Annulation** : ⚠️ **le bot ne le demande pas** → demander **quand la compagnie a prévenu** :
  - **moins de 14 jours avant / jamais prévenu** → éligible ;
  - **plus de 14 jours avant** → pas d'indemnité forfaitaire automatique, mais **remboursement/réacheminement** possible → garder le dossier, expert tranche.
- [ ] **Refus d'embarquement** : involontaire (surbooking) ? noté.

### 4.4 Pièces du dossier
- [ ] **Une pièce d'identité par passager** (passeport / CNI / titre de séjour).
- [ ] **Carte d'embarquement OU e-billet** (l'e-billet couvre tous les passagers de la réservation).
- [ ] Certificat de retard/annulation si la compagnie en a remis un (bonus).
- [ ] Photos **lisibles** (sinon redemander un cadrage net, à plat, avec lumière).

### 4.5 Si le dossier est marqué `aVerifierExpert` — recalcul obligatoire
- **`a_verifier`** (correspondance / retard non confirmé) → recalculer sur l'arrivée finale.
- **`hors_champ`** → compagnie **non-UE au départ d'Afrique** (ex. Royal Air Maroc Casa→Paris) : **pas couvert** par le règlement EU. → expliquer calmement, vérifier s'il existe un **autre recours**, garder le contact.
- **`sous_seuil`** → retard réel < 3 h : pas d'indemnité forfaitaire, mais **remboursement de frais** possible.
- Rappel barème : ≤ 1 500 km = 250 € · Maghreb ≈ 400 € · subsaharien > 3 500 km = 600 €.

### 4.6 Paiement
- [ ] Confirmer le **moyen de réception** : Wave / Orange Money / MTN MoMo / Moov / virement, selon le pays.
- [ ] Annoncer clairement le **net après 25 %**.

---

## 5. 🎯 Les angles à avoir (posture)

1. **Légitimité / anti-arnaque** — le frein n°1 du marché.
   - Parler **dans sa langue**, donner son nom, rappeler que c'est cadré par une **loi européenne (CE 261/2004)**, **0 € d'avance**.

2. **Protecteur face à la compagnie** — inverser la méfiance.
   - *« Si la compagnie vous propose un bon d'achat ou un formulaire à signer en vitesse, **ne signez rien**, prévenez-nous : c'est souvent un piège qui annule vos 600 € en cash. »*

3. **Détecteur de dossiers cachés** — augmenter la valeur.
   - **Voyage en famille/groupe ?** Chaque passager a droit à son indemnité (× le nombre) → récupérer les cartes des autres.
   - **Correspondance ratée à cause du 1ᵉʳ retard ?** Le 2ᵉ segment peut compter.

4. **Honnêteté** — ne jamais sur-promettre.
   - Un dossier `hors_champ` ou `sous_seuil` : le dire franchement, proposer la vérification gratuite, **ne pas annoncer un montant ferme**.

5. **Transparence du suivi** — antidote au silence.
   - Annoncer les étapes : *« on envoie la mise en demeure, la compagnie a ~2 mois pour répondre, on vous tient au courant, vous n'avez rien à faire. »*

6. **Option agence physique** — pour les clients méfiants ou peu à l'aise.
   - *« Si vous préférez être accompagné en personne, on a une agence partenaire près de chez vous ; la commission y est de 30 % au lieu de 25 %. »*

---

## 6. ❌ À NE PAS faire / dire
- Ne **jamais** dire un « non » sec : un dossier non couvert → « un expert vérifie les autres recours ».
- Ne **jamais** garantir un montant ou un succès (obligation de moyens, pas de résultat).
- Ne **jamais** conseiller d'accepter un bon d'achat / avoir de la compagnie.
- Ne pas demander d'informations bancaires sensibles inutiles (juste le moyen de réception).
- Ne pas presser ; rassurer.

## 7. Traçabilité (CRM) — à remplir après chaque appel
- [ ] Dossier **« vérifié humain »** + date.
- [ ] Corrections apportées (ex. *« finalement correspondance → recalcul »*, *« annulation prévenue 20 j avant »*).
- [ ] Pièces encore manquantes + relance prévue.
- [ ] Moyen de paiement confirmé.
- [ ] Niveau de confiance / remarques (client hésitant, à rappeler, bascule agence…).

---

### Rappel du partage des rôles
**Le bot** fait le volume vite (qualification, scan, mandat, montant pour les vols directs vérifiés).
**Vous (l'humain)** rattrapez ce que le bot ne peut pas trancher (correspondances, langue locale, doutes) et **scellez la confiance**. C'est vous qui faites la différence sur ce marché.

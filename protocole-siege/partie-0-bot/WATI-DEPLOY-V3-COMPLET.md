# WATI — Flow complet v3.1 · Copier-coller prêt au déploiement
**Version :** 3.1 · 2 juin 2026  
**Changements v3.1 :** langue en dernier (7d) · correspondance ajoutée · blocage post-langue résolu · message remboursements taxi/hôtel/repas ajouté (STEP 3b-info)

---

## ORDRE DES STEPS DANS WATI

```
STEP 1      Accueil
STEP 1bis   Gate Europe
STEP 1b     Nombre de passagers
STEP 2      Direct / Escale / Correspondance
STEP 3      Type d'incident
STEP 3a     Durée retard (branche Retard uniquement)
STEP 3corr  Correspondance — vol initial ou vol de remplacement ? (branche Correspondance)
STEP 3info  💡 Remboursements taxi/hôtel/repas  ← NOUVEAU
STEP 3trust Confiance avant OCR
STEP 3b     Photo ou saisie manuelle
STEP 4      Vérification OCR
STEP 5      Année du vol
STEP 6      Confirmation passagers
STEP 7      Mineurs
STEP 7b     Email
STEP 7c     Adresse
STEP 7d     Langue  ← EN DERNIER
FIN A       Récap
FIN B       Mandat (+3 à 5 s)
FIN C       Pièces (+30 s)
```

---

## MESSAGES — COPIER VERBATIM DANS WATI

---

### STEP 1 — Accueil

```
🟢⚪⚪⚪⚪⚪⚪
👋 Bienvenue chez *Robin des Airs* 🏹

*Vol retardé, annulé ou surbooké sur un trajet Europe ↔ Afrique ?*
La loi vous donne droit à *jusqu'à 600 €* par passager.
Vous avez *3 ans* pour réclamer — pas de frais si on ne gagne pas.

⚖️ *Zéro frais.* On prend 25 % uniquement si vous gagnez.

⏱️ *Moins de 10 minutes* pour ouvrir votre dossier.
```

*(Pas de boutons — message informatif, enchaîner automatiquement sur STEP 1bis)*

---

### STEP 1bis — Gate Europe

```
Pour vérifier que vous êtes couvert par la loi européenne (CE 261) :

✈️ *D'où partait votre vol ?*

👆 Ouvrez *Choisir*
```

**Boutons liste :**
- `geo_eu` → D'un aéroport en Europe (France, Belgique, Royaume-Uni, etc.)
- `geo_afrique` → D'un aéroport en Afrique ou ailleurs

**Si `geo_eu` → STEP 1b directement**

**Si `geo_afrique` → sous-question :**

```
Et la compagnie qui opérait ce vol ?

👆 Ouvrez *Choisir*
```

- `carrier_eu` → Compagnie européenne (Air France, Brussels Airlines, TUI, etc.)
- `carrier_other` → Compagnie africaine ou autre
- `carrier_unknown` → Je ne sais plus

**Si `carrier_eu` → STEP 1b**
**Si `carrier_other` ou `carrier_unknown` → message rejet :**

```
Merci pour ces informations.

Le règlement européen CE 261 couvre uniquement les vols qui
*partent d'Europe*, ou qui arrivent en Europe avec une *compagnie européenne*.

Votre situation n'entre malheureusement pas dans ce cadre —
ce n'est pas personnel, c'est la limite du texte de loi.

Si vous avez d'autres vols passés via l'Europe,
revenez ici — vous avez *3 ans* pour agir.

_L'équipe Robin 🏹_
```

→ FIN du flow pour ce contact.

---

### STEP 1b — Nombre de passagers

```
🟢⚪⚪⚪⚪⚪⚪
👥 *Pour combien réclamez-vous ?*

👆 Ouvrez *Choisir* puis touchez une ligne
— ou tapez un chiffre *1* à *6*.
```

**Boutons liste :** 1 · 2 · 3 · 4 · 5 · 6 ou plus

→ STEP 2

---

### STEP 2 — Type de trajet

```
✅ *{{pax}} passager(s) enregistré(s).*

✈️ Sur ce trajet : quel type de vol ?
🟢🟢⚪⚪⚪⚪⚪

👆 Ouvrez *Choisir*
```

**Boutons liste :**
- `vol_direct` → Vol direct (sans escale)
- `vol_escale` → Vol avec escale
- `vol_correspondance` → Correspondance ratée

→ Tous les 3 cas → STEP 3

---

### STEP 3 — Type d'incident

```
✅ *C'est noté* — nous visons jusqu'à *{{montant_net}} € net* pour votre groupe. 🚀

⚖️ *Que s'est-il passé exactement ?*
🟢🟢🟢⚪⚪⚪⚪

👆 Ouvrez *Choisir*
```

**Boutons liste :**
- `incident_retard` → Retard à l'arrivée (+3h)
- `incident_annulation` → Vol annulé
- `incident_surbook` → Refus d'embarquement / surbooking
- `incident_correspondance` → Correspondance manquée à cause d'un retard
- `incident_autre` → Autre situation

**Si `incident_retard` → STEP 3a**
**Si `incident_correspondance` → STEP 3corr**
**Si `incident_annulation` ou `incident_surbook` → STEP 3trust directement**
**Si `incident_autre` → message :**

```
Merci. Pour analyser votre situation,
pouvez-vous décrire en quelques mots ce qui s'est passé ?
```
*(→ escalade humain)*

---

### STEP 3a — Durée du retard *(branche Retard uniquement)*

```
⏱️ *Environ combien d'heures de retard à l'arrivée ?*

👆 Ouvrez *Choisir*
```

**Boutons liste :**
- `delay_lt3` → Moins de 3 heures
- `delay_3_4` → Entre 3 et 4 heures
- `delay_4plus` → Plus de 4 heures
- `delay_unknown` → Je ne me souviens plus

**Si `delay_lt3` → rejet bienveillant :**

```
Merci. Pour un retard *inférieur à 3 heures* à l'arrivée,
la loi européenne CE 261 ne prévoit pas d'indemnité forfaitaire.

Si vous pensez que le retard était plus long,
ou si vous avez un autre incident (annulation, correspondance ratée),
tapez *menu* pour recommencer.

_L'équipe Robin 🏹_
```

**Si `delay_3_4`, `delay_4plus`, `delay_unknown` → STEP 3trust**
*(Flag `duree_a_confirmer=true` si `delay_unknown`)*

---

### STEP 3corr — Correspondance manquée *(branche Correspondance)*

```
✈️ *Votre correspondance a été manquée — précisons le vol concerné.*

C'est lequel qui pose problème ?

👆 Ouvrez *Choisir*
```

**Boutons liste :**
- `corr_initial` → Le vol initial qui était en retard
- `corr_suivant` → Le vol de correspondance que j'ai raté
- `corr_both` → Les deux
- `corr_unknown` → Je ne sais plus

→ Tous les cas → STEP 3trust
*(Flag `type_correspondance` en Airtable)*

---

### STEP 3info — Remboursements taxi / hôtel / repas ⭐ NOUVEAU

> *(Envoyé après STEP 3a ou 3corr — avant l'OCR. Message informatif, pas de bouton, enchaîne automatiquement sur STEP 3trust.)*

```
💡 *Bonne nouvelle — Robin récupère aussi vos avances !*

Si vous avez payé de votre poche à cause de ce vol
*(taxi, hôtel, repas, transfert...)* :

🧾 *Conservez toutes vos factures et reçus.*

Robin des Airs les soumet à la compagnie
et récupère ces frais *en plus* de l'indemnité légale.
*Zéro effort de votre côté.*
```

*(Message informatif — pas de bouton — enchaîner automatiquement vers STEP 3trust)*

---

### STEP 3trust — Avant OCR

```
🔒 *Avant la photo de votre billet*

Robin des Airs est un service enregistré qui récupère
des indemnités uniquement sur vols couverts par la loi européenne.

Nous avons besoin de votre *carte d'embarquement*
pour lire automatiquement : numéro de vol, date, PNR et itinéraire.
*Rien d'autre à ce stade.*

📱 Vos données restent *strictement confidentielles* pour ce dossier.
```

*(Message informatif — enchaîner automatiquement sur STEP 3b)*

---

### STEP 3b — Photo ou saisie manuelle

```
📋 *Carte d'embarquement ou e-ticket*

Une photo suffit — le bot lit le numéro de vol,
la date et votre nom *automatiquement*.

📱 *Photo nette, bien cadrée, à plat* — c'est tout.

🟢🟢🟢⚪⚪⚪⚪

👆 Ouvrez *Choisir*
```

**Boutons liste :**
- `ocr_photo` → 📸 Envoyer une photo
- `ocr_manuel` → ✍️ Saisir les informations

**Branche `ocr_manuel` :**

```
✍️ *Saisie manuelle* — 4 infos :

1️⃣ Numéro de vol (ex. AF718)
2️⃣ Date du vol (JJ/MM/AAAA)
3️⃣ Code PNR (6 caractères)
4️⃣ Itinéraire (ex. CDG → ABJ)

Vous pouvez tout envoyer en *un seul message*,
une info par ligne.
```

→ Les deux branches → STEP 4

---

### STEP 4 — Vérification OCR

```
📸 *Carte / billet lu !*

*{{nom_passager}}* — vérifiez le reste :

✈️ *{{vol}}* — {{compagnie}}
🎫 *{{date_jour_mois}}*
📋 *{{pnr}}*
🛤️ *{{route}}*

ℹ️ _Information incorrecte ? Touchez *Corriger*._

*Tout est correct ?*
🟢🟢🟢🟢🟢⚪⚪
```

**Boutons :** Tout est correct · Corriger

→ STEP 5

---

### STEP 5 — Année du vol

```
🗓️ *Quelle année pour le {{date_jour_mois}} ?*

1️⃣  {{annee_1}}
2️⃣  {{annee_2}}
3️⃣  {{annee_3}}
4️⃣  {{annee_4}}
5️⃣  {{annee_5}} ou avant

_(Date antérieure ? Tapez la date complète : ex. 15/03/2019)_
🟢🟢🟢🟢🟢🟢🟢
```

→ STEP 6

---

### STEP 6 — Confirmation passagers

```
👥 *Les {{nb}} passagers — confirmez*

{{liste_passagers}}

🟢🟢🟢🟢🟢🟢🟢
```

**Boutons :** Confirmer · Modifier

→ STEP 7

---

### STEP 7 — Mineurs

```
👶 *Question juridique importante*

Parmi les passagers suivants, y a-t-il des *mineurs* (moins de 18 ans) ?

{{liste_bullets}}

⚖️ Obligation légale pour préparer le bon mandat de signature.
🟢🟢🟢🟢🟢🟢🟢
```

**Boutons :** Non, tous majeurs · Oui, il y a des mineurs

→ STEP 7b

---

### STEP 7b — Email

```
📧 *Pour vous envoyer le mandat et le suivi du dossier*

Quelle est votre adresse email ?
_(Ex. : prenom@gmail.com)_
```

*(Réponse libre — valider format email)*

→ STEP 7c

---

### STEP 7c — Adresse

```
📮 *Adresse postale* (pour le mandat officiel)

Rue, ville et pays —
ou *ville + pays* si vous préférez.

_(Ex. : 12 rue Léon Blum, Dakar, Sénégal)_
```

*(Réponse libre)*

→ STEP 7d

---

### STEP 7d — Langue vocaux ⚠️ EN DERNIER

```
🌍 *Dernière question !*

Dans quelle langue nos experts doivent-ils vous contacter
*(appels, vocaux WhatsApp, suivi)* ?
🟢🟢🟢🟢🟢🟢🟢

👆 Ouvrez *Choisir*
```

**Boutons liste :**
- `lang_fr` → 🇫🇷 Français
- `lang_en` → 🇬🇧 English
- `lang_wo` → 🇸🇳 Wolof
- `lang_bm` → 🇲🇱 Bambara
- `lang_di` → 🇨🇮 Dioula
- `lang_other` → Autre

**→ Enchaîner DIRECTEMENT sur FIN A. Pas de message de confirmation.**

---

### FIN A — Récap *(immédiat après langue)*

```
🎉 *Dossier enregistré !*
Réf. *{{ref_dossier}}*

Voici ce que nous allons défendre pour vous :

👤 {{nom_principal}}
✈️ {{vol}} — {{compagnie}} — {{route}}
📅 {{date_vol}} · {{incident_libelle}}
💵 *Objectif : {{montant_net}} € net*

Notre équipe a votre dossier.
Prochaine étape : *2 minutes* pour l'activer. ⬇️
```

→ FIN B (délai +3 à 5 secondes)

---

### FIN B — Lien mandat *(+3 à 5 secondes)*

```
✅ *Dossier {{ref_dossier}} enregistré.*

Pour que Robin des Airs représente *{{nom_principal}}*
auprès de *{{compagnie}}*, signez votre *mandat de représentation*.

📋 Lisible avant signature — *aucune info bancaire à cette étape.*

👉 Signez ici (2 min) :
{{mandat_url}}

Sans signature, nous ne pouvons pas agir en votre nom.

_L'équipe Robin 🏹_
```

**`{{mandat_url}}`** = Make → `https://robindesairs.eu/mandat.html?ref=...&phone=...&name=...&vol=...&date=...&pnr=...&route=...&compagnie=...&motif=...&indemnite=600&source=wati`

→ FIN C (délai +30 secondes)

---

### FIN C — Pièces justificatives *(+30 secondes)*

```
📎 *Ensuite — vos justificatifs*

Envoyez ici, en photos :

1. *Passeport ou CNI* (face lisible)
2. *Carte d'embarquement* ou confirmation *(si vous l'avez encore)*

🔒 Pièces réservées au dossier *{{ref_dossier}}* uniquement.
Confidentialité : https://robindesairs.eu/politique-confidentialite
```

---

### Message pied de fil *(après ouverture dossier)*

```
✅ Dossier bien reçu.
Posez votre question ici ou tapez *menu* pour un nouveau dossier.

👉 robindesairs.eu
📋 Suivi : https://robindesairs.eu/suivi-dossier
```

---

## TEMPLATES RÉENGAGEMENT (Meta · fenêtre 24h)

### R1 — Abandon étapes 1–2 (>2h)

```
Bonjour — votre dossier Robin des Airs
est ouvert mais pas encore finalisé.

Vos droits expirent *3 ans* après la date du vol.
Il en reste encore — ne les perdez pas.

*Une seule réponse* pour reprendre :
```
*(Bouton : Continuer mon dossier)*

### R2 — Abandon avant OCR (>4h)

```
On s'est arrêtés juste avant la photo de votre billet.

Pas de carte sous la main ?
Vous pouvez saisir le numéro de vol manuellement — 2 minutes.

Votre dossier vous attend :
```
*(Bouton : Reprendre la saisie)*

### R3 — Mandat non signé (>24h)

```
Votre dossier *{{ref_dossier}}* est prêt.
Il attend votre signature.

Nos experts ne peuvent pas agir
tant que le mandat n'est pas signé.

Lien officiel Robin des Airs (2 min) :
{{mandat_url}}

_L'équipe Robin_
```

---

## CHAMPS AIRTABLE À REMPLIR (Make)

| Champ | Collecté |
|-------|----------|
| Référence dossier | Auto `RDA-AAAAMMJJ-XXXX` |
| Numéro WhatsApp | Meta |
| Prénom / Nom | OCR + STEP 6 |
| Email | STEP 7b |
| Adresse | STEP 7c |
| Langue de contact | STEP 7d |
| Numéro de vol, Date, PNR, Itinéraire, Compagnie | OCR / saisie |
| Type de vol | STEP 2 |
| Type d'incident | STEP 3 |
| Durée retard | STEP 3a |
| Type correspondance | STEP 3corr |
| Montant indemnité indicatif | Calcul Make |
| Mineurs | STEP 7 |

---

*v3 · 2 juin 2026 · langue en dernier · correspondance ajoutée*

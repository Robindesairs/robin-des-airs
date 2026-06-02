# WATI — Guide configuration flow v3.1
## Zéro bug · Chaque bouton fonctionne

---

## RÈGLES IMPORTANTES AVANT DE COMMENCER

> ⚠️ **Règle 1 — Chaque bouton DOIT avoir un "Next Step" défini.**  
> Si un bouton n'a pas de step suivant → le bot se bloque. C'est la cause du bug actuel.

> ⚠️ **Règle 2 — Les messages "informatifs" (sans bouton) doivent avoir "Auto Next" activé.**  
> Sinon le bot attend une réponse qui ne viendra jamais.

> ⚠️ **Règle 3 — Ne jamais laisser un step orphelin** (step créé mais non relié).

---

## ÉTAPE 1 — SUPPRIMER L'ANCIEN STEP LANGUE (2b)

1. Dans WATI → Automation → Chatbot
2. Trouver le step **"Langue vocaux"** ou **"Dans quelle langue..."** (actuellement en position 2b)
3. **Supprimer** ce step
4. Relier le step **"Direct ou escale"** (STEP 2) directement vers le step **"Type d'incident"** (STEP 3)

---

## ÉTAPE 2 — CRÉER TOUS LES STEPS DANS L'ORDRE

### ✅ STEP 1 — Accueil
- **Type :** Message texte (pas de bouton)
- **Auto Next :** ✅ OUI → vers STEP 1bis
- **Texte :**
```
🟢⚪⚪⚪⚪⚪⚪
👋 Bienvenue chez *Robin des Airs* 🏹

*Vol retardé, annulé ou surbooké sur un trajet Europe ↔ Afrique ?*
La loi vous donne droit à *jusqu'à 600 €* par passager.
Vous avez *3 ans* pour réclamer — pas de frais si on ne gagne pas.

⚖️ *Zéro frais.* On prend 25 % uniquement si vous gagnez.

⏱️ *Moins de 10 minutes* pour ouvrir votre dossier.
```

---

### ✅ STEP 1bis — Gate Europe
- **Type :** Boutons liste
- **Texte :**
```
Pour vérifier que vous êtes couvert par la loi européenne (CE 261) :

✈️ *D'où partait votre vol ?*

👆 Ouvrez *Choisir*
```
- **Bouton 1 :** `D'un aéroport en Europe` → **Next : STEP 1b**
- **Bouton 2 :** `D'un aéroport en Afrique ou ailleurs` → **Next : STEP 1bis-B** (sous-question compagnie)

**STEP 1bis-B** (sous-question compagnie) :
- **Type :** Boutons liste
- **Texte :**
```
Et la compagnie qui opérait ce vol ?

👆 Ouvrez *Choisir*
```
- **Bouton 1 :** `Compagnie européenne (Air France, Brussels, TUI…)` → **Next : STEP 1b**
- **Bouton 2 :** `Compagnie africaine ou autre` → **Next : STEP-REJET-HORS-ZONE**
- **Bouton 3 :** `Je ne sais plus` → **Next : STEP-REJET-HORS-ZONE**

**STEP-REJET-HORS-ZONE** :
- **Type :** Message texte (pas de bouton)
- **Auto Next :** ❌ NON — fin du flow
- **Texte :**
```
Merci pour ces informations.

Le règlement européen CE 261 couvre uniquement les vols qui
*partent d'Europe*, ou qui arrivent en Europe avec une *compagnie européenne*.

Votre situation n'entre malheureusement pas dans ce cadre.

Si vous avez d'autres vols passés via l'Europe,
revenez ici — vous avez *3 ans* pour agir.

_L'équipe Robin 🏹_
```

---

### ✅ STEP 1b — Nombre de passagers
- **Type :** Boutons liste
- **Texte :**
```
🟢⚪⚪⚪⚪⚪⚪
👥 *Pour combien réclamez-vous ?*

👆 Ouvrez *Choisir* puis touchez une ligne
— ou tapez un chiffre *1* à *6*.
```
- **Bouton 1 :** `1 passager` → **Next : STEP 2**
- **Bouton 2 :** `2 passagers` → **Next : STEP 2**
- **Bouton 3 :** `3 passagers` → **Next : STEP 2**
- **Bouton 4 :** `4 passagers` → **Next : STEP 2**
- **Bouton 5 :** `5 passagers` → **Next : STEP 2**
- **Bouton 6 :** `6 ou plus` → **Next : STEP 2**

---

### ✅ STEP 2 — Type de trajet
- **Type :** Boutons liste
- **Texte :**
```
✅ *{{pax}} passager(s) enregistré(s).*

✈️ Sur ce trajet : quel type de vol ?
🟢🟢⚪⚪⚪⚪⚪

👆 Ouvrez *Choisir*
```
- **Bouton 1 :** `Vol direct (sans escale)` → **Next : STEP 3**
- **Bouton 2 :** `Vol avec escale` → **Next : STEP 3**
- **Bouton 3 :** `Correspondance ratée` → **Next : STEP 3**

---

### ✅ STEP 3 — Type d'incident
- **Type :** Boutons liste
- **Texte :**
```
✅ *C'est noté* — nous visons jusqu'à *{{montant_net}} € net* pour votre groupe. 🚀

⚖️ *Que s'est-il passé exactement ?*
🟢🟢🟢⚪⚪⚪⚪

👆 Ouvrez *Choisir*
```
- **Bouton 1 :** `Retard à l'arrivée (+3h)` → **Next : STEP 3a**
- **Bouton 2 :** `Vol annulé` → **Next : STEP 3info**
- **Bouton 3 :** `Refus d'embarquement / surbooking` → **Next : STEP 3info**
- **Bouton 4 :** `Correspondance manquée` → **Next : STEP 3corr**

---

### ✅ STEP 3a — Durée du retard
- **Type :** Boutons liste
- **Texte :**
```
⏱️ *Environ combien d'heures de retard à l'arrivée ?*

👆 Ouvrez *Choisir*
```
- **Bouton 1 :** `Moins de 3 heures` → **Next : STEP-REJET-RETARD-COURT**
- **Bouton 2 :** `Entre 3 et 4 heures` → **Next : STEP 3info**
- **Bouton 3 :** `Plus de 4 heures` → **Next : STEP 3info**
- **Bouton 4 :** `Je ne me souviens plus` → **Next : STEP 3info**

**STEP-REJET-RETARD-COURT :**
- **Type :** Message texte (pas de bouton)
- **Auto Next :** ❌ NON — fin du flow
- **Texte :**
```
Merci. Pour un retard *inférieur à 3 heures* à l'arrivée,
la loi européenne CE 261 ne prévoit pas d'indemnité forfaitaire.

Si vous pensez que le retard était plus long,
ou si vous avez un autre incident (annulation, correspondance ratée),
tapez *menu* pour recommencer.

_L'équipe Robin 🏹_
```

---

### ✅ STEP 3corr — Correspondance manquée
- **Type :** Boutons liste
- **Texte :**
```
✈️ *Votre correspondance a été manquée — précisons le vol concerné.*

C'est lequel qui pose problème ?

👆 Ouvrez *Choisir*
```
- **Bouton 1 :** `Le vol initial qui était en retard` → **Next : STEP 3info**
- **Bouton 2 :** `Le vol de correspondance que j'ai raté` → **Next : STEP 3info**
- **Bouton 3 :** `Les deux` → **Next : STEP 3info**
- **Bouton 4 :** `Je ne sais plus` → **Next : STEP 3info**

---

### ✅ STEP 3info — Remboursements avances ⭐ NOUVEAU
- **Type :** Message texte (pas de bouton)
- **Auto Next :** ✅ OUI → vers STEP 3trust
- **Texte :**
```
💡 *Bonne nouvelle — Robin récupère aussi vos avances !*

Si vous avez payé de votre poche à cause de ce vol
*(taxi, hôtel, repas, transfert...)* :

🧾 *Conservez toutes vos factures et reçus.*

Robin des Airs les soumet à la compagnie
et récupère ces frais *en plus* de l'indemnité légale.
*Zéro effort de votre côté.*
```

---

### ✅ STEP 3trust — Avant OCR
- **Type :** Message texte (pas de bouton)
- **Auto Next :** ✅ OUI → vers STEP 3b
- **Texte :**
```
🔒 *Avant la photo de votre billet*

Robin des Airs est un service enregistré qui récupère
des indemnités uniquement sur vols couverts par la loi européenne.

Nous avons besoin de votre *carte d'embarquement*
pour lire automatiquement : numéro de vol, date, PNR et itinéraire.
*Rien d'autre à ce stade.*

📱 Vos données restent *strictement confidentielles* pour ce dossier.
```

---

### ✅ STEP 3b — Photo ou saisie manuelle
- **Type :** Boutons liste
- **Texte :**
```
📋 *Carte d'embarquement ou e-ticket*

Une photo suffit — le bot lit le numéro de vol,
la date et votre nom *automatiquement*.

📱 *Photo nette, bien cadrée, à plat* — c'est tout.

🟢🟢🟢⚪⚪⚪⚪

👆 Ouvrez *Choisir*
```
- **Bouton 1 :** `📸 Envoyer une photo` → **Next : STEP 4** (déclenche OCR)
- **Bouton 2 :** `✍️ Saisir les informations` → **Next : STEP 3b-manuel**

**STEP 3b-manuel :**
- **Type :** Message texte (pas de bouton)
- **Auto Next :** ✅ OUI → vers STEP 4
- **Texte :**
```
✍️ *Saisie manuelle* — 4 infos en un seul message :

1️⃣ Numéro de vol (ex. AF718)
2️⃣ Date du vol (JJ/MM/AAAA)
3️⃣ Code PNR (6 caractères)
4️⃣ Itinéraire (ex. CDG → ABJ)

Envoyez tout sur ce fil, une info par ligne.
```

---

### ✅ STEP 4 — Vérification OCR
- **Type :** Boutons liste
- **Texte :**
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
- **Bouton 1 :** `Tout est correct ✅` → **Next : STEP 5**
- **Bouton 2 :** `Corriger` → **Next : STEP 3b-manuel** (recommencer saisie)

---

### ✅ STEP 5 — Année du vol
- **Type :** Boutons liste
- **Texte :**
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
- **Bouton 1 :** `{{annee_1}}` → **Next : STEP 6**
- **Bouton 2 :** `{{annee_2}}` → **Next : STEP 6**
- **Bouton 3 :** `{{annee_3}}` → **Next : STEP 6**
- **Bouton 4 :** `{{annee_4}}` → **Next : STEP 6**
- **Bouton 5 :** `{{annee_5}} ou avant` → **Next : STEP 6**

---

### ✅ STEP 6 — Confirmation passagers
- **Type :** Boutons liste
- **Texte :**
```
👥 *Les {{nb}} passagers — confirmez*

{{liste_passagers}}

🟢🟢🟢🟢🟢🟢🟢
```
- **Bouton 1 :** `Confirmer ✅` → **Next : STEP 7**
- **Bouton 2 :** `Modifier` → **Next : STEP 3b-manuel**

---

### ✅ STEP 7 — Mineurs
- **Type :** Boutons liste
- **Texte :**
```
👶 *Question juridique importante*

Parmi les passagers suivants, y a-t-il des *mineurs* (moins de 18 ans) ?

{{liste_bullets}}

⚖️ Obligation légale pour préparer le bon mandat.
🟢🟢🟢🟢🟢🟢🟢
```
- **Bouton 1 :** `Non, tous majeurs` → **Next : STEP 7b**
- **Bouton 2 :** `Oui, il y a des mineurs` → **Next : STEP 7b**

---

### ✅ STEP 7b — Email
- **Type :** Réponse libre (texte)
- **Texte :**
```
📧 *Pour vous envoyer le mandat et le suivi du dossier*

Quelle est votre adresse email ?
_(Ex. : prenom@gmail.com)_
```
- **Next (après réponse) :** STEP 7c

---

### ✅ STEP 7c — Adresse
- **Type :** Réponse libre (texte)
- **Texte :**
```
📮 *Adresse postale* (pour le mandat officiel)

Rue, ville et pays —
ou *ville + pays* si vous préférez.
```
- **Next (après réponse) :** STEP 7d

---

### ✅ STEP 7d — Langue ← EN DERNIER ⚠️
- **Type :** Boutons liste
- **Texte :**
```
🌍 *Dernière question !*

Dans quelle langue nos experts doivent-ils vous contacter
*(appels, vocaux WhatsApp, suivi)* ?
🟢🟢🟢🟢🟢🟢🟢

👆 Ouvrez *Choisir*
```
- **Bouton 1 :** `🇫🇷 Français` → **Next : FIN A**
- **Bouton 2 :** `🇬🇧 English` → **Next : FIN A**
- **Bouton 3 :** `🇸🇳 Wolof` → **Next : FIN A**
- **Bouton 4 :** `🇲🇱 Bambara` → **Next : FIN A**
- **Bouton 5 :** `🇨🇮 Dioula` → **Next : FIN A**
- **Bouton 6 :** `Autre` → **Next : FIN A**

> ⚠️ **CRITIQUE : chacun des 6 boutons doit pointer vers FIN A. Aucun bouton sans next step.**

---

### ✅ FIN A — Récap
- **Type :** Message texte (pas de bouton)
- **Auto Next :** ✅ OUI → vers FIN B (délai 3 secondes)
- **Texte :**
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

---

### ✅ FIN B — Lien mandat (+3 à 5 secondes)
- **Type :** Message texte (pas de bouton)
- **Délai :** 3 secondes
- **Auto Next :** ✅ OUI → vers FIN C (délai 30 secondes)
- **Texte :**
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

---

### ✅ FIN C — Pièces justificatives (+30 secondes)
- **Type :** Message texte (pas de bouton)
- **Délai :** 30 secondes
- **Auto Next :** ❌ NON — fin du flow
- **Texte :**
```
📎 *Ensuite — vos justificatifs*

Envoyez ici, en photos :

1. *Passeport ou CNI* (face lisible)
2. *Carte d'embarquement* ou confirmation *(si vous l'avez encore)*

🔒 Pièces réservées au dossier *{{ref_dossier}}* uniquement.
Confidentialité : https://robindesairs.eu/politique-confidentialite
```

---

## ✅ CHECKLIST FINALE AVANT ACTIVATION

- [ ] Chaque bouton de liste a un "Next Step" défini
- [ ] STEP 3info a "Auto Next" activé → STEP 3trust
- [ ] STEP 3trust a "Auto Next" activé → STEP 3b
- [ ] FIN A a "Auto Next" activé → FIN B (3s)
- [ ] FIN B a "Auto Next" activé → FIN C (30s)
- [ ] STEP 7d — les 6 boutons langue pointent tous vers FIN A
- [ ] L'ancien step langue (2b) est supprimé
- [ ] Tester avec un vrai numéro WhatsApp de bout en bout

---

*v3.1 · 2 juin 2026*

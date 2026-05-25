# Bot WhatsApp Phase 0 — Version 2 (à déployer dans WATI / 360dialog)

**Statut :** v2 appliquée dans ce dépôt le 19/05/2026  
**Remplace :** messages verbatim de `FLOW-BOT-INTAKE.md` (capture 23/05/2026)  
**Audits sources :** `BOT-AUDIT-UX.md`, `BOT-AUDIT-QUALIFICATION.md`, `BOT-OPTIMISATION-COMPORTEMENTALE.md`  
**Lien mandat :** `docs/WATI-LIEN-MANDAT.md` — **jamais** `https://robindesairs.eu/sign/...` (404)

---

## Checklist déploiement (ordre)

| # | Action | Priorité |
|---|--------|----------|
| 1 | Remplacer l’URL finale par `{{mandat_url}}` (Make → `mandat.html?ref=...`) | P0 |
| 2 | Supprimer l’étape « On continue ? » (fusion 2c → 3) | P0 |
| 3 | Découper le message final en **3 messages** (A récap → B mandat → C pièces, +30 s) | P0 |
| 4 | Ajouter question **durée retard** si incident = Retard | P1 |
| 5 | Ajouter **gate Europe** après accueil (1bis) | P1 |
| 6 | Message **confiance** avant OCR (étape 3b) | P1 |
| 7 | Collecter **email** + **adresse** après mineurs (7b–7c) | P1 |
| 8 | Branche **saisie manuelle** ou retirer le bouton | P1 |
| 9 | Activer templates réengagement R1–R3 | P2 |
| 10 | Accueil v2 (Europe ↔ Afrique, 10 min, preuve sociale) | P2 |

**Variable Make `mandat_url` :** voir formule dans `docs/WATI-LIEN-MANDAT.md` (section Base Robin des Airs).

**Redirect site (filet de sécurité) :** `/sign/*` → `/mandat.html` (302) dans `netlify.toml` — ne restaure pas les params ; le bot doit envoyer la bonne URL.

---

## Vue du flow v2

```
🟢⚪⚪⚪⚪⚪⚪  1 — Accueil v2
🟢⚪⚪⚪⚪⚪⚪  1bis — Gate Europe (nouveau)
🟢⚪⚪⚪⚪⚪⚪  1b — Nombre de passagers
🟢🟢⚪⚪⚪⚪⚪  2 — Direct ou escale
🟢🟢⚪⚪⚪⚪⚪  2b — Langue vocaux
🟢🟢🟢⚪⚪⚪⚪  3 — Type d'incident
🟢🟢🟢⚪⚪⚪⚪  3a — Durée retard (si Retard) — NOUVEAU
🟢🟢🟢⚪⚪⚪⚪  3trust — Confiance avant OCR — NOUVEAU
🟢🟢🟢⚪⚪⚪⚪  3b — Photo OCR ou saisie manuelle
🟢🟢🟢🟢🟢⚪⚪  4 — Vérification OCR
🟢🟢🟢🟢🟢🟢🟢  5 — Année du vol
🟢🟢🟢🟢🟢🟢🟢  6 — Confirmation passagers
🟢🟢🟢🟢🟢🟢🟢  7 — Mineurs
🟢🟢🟢🟢🟢🟢🟢  7b — Email — NOUVEAU
🟢🟢🟢🟢🟢🟢🟢  7c — Adresse — NOUVEAU
🟢🟢🟢🟢🟢🟢🟢  Fin A → Fin B (+3–5 s) → Fin C (+30 s)
```

**Supprimé :** étape 2c « On continue ? »

---

## Messages — copier dans WATI

### [ÉTAPE 1 — Accueil v2]

```
🟢⚪⚪⚪⚪⚪⚪
👋 Bienvenue chez *Robin des Airs* 🏹

*Vol retardé ou annulé sur un trajet Europe ↔ Afrique ?*
La loi vous donne droit à *jusqu'à 600 €* — vous avez *3 ans* pour réclamer.

⚖️ *Zéro frais.* On prend 25 % uniquement si vous gagnez.
👥 Déjà *+1 200 familles* indemnisées depuis l'Afrique.

⏱️ *Moins de 10 minutes* pour ouvrir votre dossier — quelques questions ci-dessous.
```

*(Adapter +1 200 / 94 % avec vos chiffres réels.)*

---

### [ÉTAPE 1bis — Gate Europe] — NOUVEAU

```
Pour vérifier que vous êtes couvert par la loi européenne (CE 261), une question rapide :

✈️ *D'où partait votre vol ?*

👆 Ouvrez *Choisir*
```

**Boutons liste :**
- `geo_eu` — D'un aéroport en Europe (France, Belgique, Suisse, etc.)
- `geo_other` — D'un aéroport en Afrique ou ailleurs

**Si `geo_other` → sous-question :**

```
Et la compagnie qui opérait ce vol ?

👆 Ouvrez *Choisir*
```

- `geo_eu_carrier` — Compagnie européenne (Air France, Brussels Airlines, etc.)
- `geo_non_eu` — Compagnie africaine ou autre
- `geo_unknown` — Je ne sais plus

**Si hors champ CE 261** (`geo_non_eu` sans départ UE) → message rejet bienveillant :

```
Merci pour ces informations.

Le règlement européen CE 261 ne couvre que les vols qui *partent d'Europe*
ou qui arrivent en Europe avec une *compagnie européenne*.
Votre situation n'entre malheureusement pas dans ce cadre —
ce n'est pas une question personnelle, mais une limite du texte de loi.

Nous ne prenons pas de dossiers sur lesquels nous ne pouvons pas agir.

Si vous avez d'autres vols passés qui passaient par l'Europe,
revenez ici — la loi vous donne *3 ans*.

_L'équipe Robin 🏹_
```

---

### [ÉTAPE 1b — Nombre de passagers]

```
👥 *Pour combien réclamez-vous ?*
🟢⚪⚪⚪⚪⚪⚪
👆 Ouvrez *Choisir* puis touchez une ligne — ou tapez un chiffre *1* à *6*.
```

*(Boutons : 1 … 6+)*

---

### [ÉTAPE 2 — Type de vol]

```
✅ *{{pax}} passager(s) enregistré(s).*

✈️ Sur ce trajet : vol *direct* ou *avec escale* ?
🟢🟢⚪⚪⚪⚪⚪
```

*(Boutons : Direct / Avec escale)*

---

### [ÉTAPE 2b — Langue vocaux]

```
✅ *C'est noté* — nous visons jusqu'à *{{montant_net}} € net* pour votre groupe. 🚀

Dans quelle langue nos experts doivent-ils vous contacter *(vocal, suivi)* ?
🟢🟢⚪⚪⚪⚪⚪
```

*(Boutons langue selon pays / IATA)*

**→ Plus d'étape « On continue ? ».** Enchaîner directement après choix langue :

---

### [ÉTAPE 3 — Type d'incident] (fusion confirmation langue)

```
✅ Parfait — vocaux en *{{langue}}*.

⚖️ *Que s'est-il passé sur ce vol ?*
🟢🟢🟢⚪⚪⚪⚪
```

*(Boutons : Retard / Annulation / Surbooking / Correspondance ratée)*

---

### [ÉTAPE 3a — Durée retard] — NOUVEAU (si Retard)

```
⏱️ *Environ combien d'heures de retard à l'arrivée ?*

👆 Ouvrez *Choisir*
```

- `delay_lt3` — Moins de 3 heures
- `delay_3plus` — Plus de 3 heures
- `delay_unknown` — Je ne me souviens plus

**Si `delay_lt3` → rejet bienveillant :**

```
Merci. Pour un retard *inférieur à 3 heures* à l'arrivée,
la loi européenne ne prévoit pas d'indemnité forfaitaire.

Si vous pensez que le retard était plus long,
ou si vous avez un autre vol (annulation, correspondance ratée),
vous pouvez *recommencer* ici : tapez *menu*.

_L'équipe Robin 🏹_
```

**Si `delay_3plus` ou `delay_unknown` :** continuer vers 3trust (flag dossier `duree_a_confirmer` si unknown).

---

### [ÉTAPE 3trust — Avant OCR] — NOUVEAU

```
🔒 *Avant la photo de votre billet*

Robin des Airs est un service enregistré qui récupère des indemnités
*uniquement* sur vols couverts par la loi européenne (CE 261/2004).

Nous avons besoin de votre *carte d'embarquement* pour lire automatiquement :
numéro de vol, date, PNR et itinéraire — *rien d'autre à ce stade*.

📱 Vos données restent *strictement confidentielles* pour ce dossier.
```

*(Envoyer ce message, puis immédiatement l'étape 3b.)*

---

### [ÉTAPE 3b — OCR]

```
📋 *Carte d'embarquement ou e-ticket*

Une photo suffit — le bot lit le numéro de vol,
la date et votre nom *automatiquement*.

📱 *Photo nette, bien cadrée, à plat* → c'est tout.

*Comment souhaitez-vous continuer ?*
🟢🟢🟢⚪⚪⚪⚪
```

*(Boutons : Envoyer une photo / Saisir les informations)*

#### Branche saisie manuelle (si bouton 2)

```
✍️ *Saisie manuelle* — 4 infos :

1️⃣ Numéro de vol (ex. AF718)
2️⃣ Date du vol (JJ/MM/AAAA)
3️⃣ Code PNR (6 caractères)
4️⃣ Itinéraire (ex. CDG → ABJ)

Vous pouvez tout envoyer en *un seul message*, une ligne par info.
```

*(Parser ou escalade humain si échec — ne pas laisser le bouton sans suite.)*

---

### [ÉTAPE 4 — Vérification OCR]

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

---

### [ÉTAPE 5 — Année]

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

---

### [ÉTAPE 6 — Passagers]

```
👥 *Les {{nb}} passagers — confirmez*

{{liste_passagers}}

🟢🟢🟢🟢🟢🟢🟢
```

---

### [ÉTAPE 7 — Mineurs]

```
👶 *Question juridique importante*

Parmi les passagers suivants, y a-t-il des mineurs (moins de 18 ans) ?

{{liste_bullets}}

⚖️ Obligation légale pour préparer le bon mandat de signature.
🟢🟢🟢🟢🟢🟢🟢
```

---

### [ÉTAPE 7b — Email] — NOUVEAU

```
📧 *Pour vous envoyer le mandat et le suivi du dossier*

Quelle est votre adresse email ?
(Ex. : prenom@gmail.com)
```

---

### [ÉTAPE 7c — Adresse] — NOUVEAU

```
📮 *Adresse postale* (pour le mandat officiel)

Rue, ville et pays — ou *ville + pays* si vous préférez.
```

---

### [FIN A — Récap célébration] — immédiat

```
🎉 *Dossier enregistré !*
Réf. *{{ref_dossier}}*

Voici ce que nous allons défendre pour vous :

👤 {{nom_principal}}
✈️ {{vol}} — {{compagnie}} — {{route}}
📅 {{date_vol}} — {{incident_libelle}}
💵 *Objectif : {{montant_net}} € net*

Notre équipe a votre dossier.
Prochaine étape : *2 minutes* pour l'activer.
```

*(Bouton optionnel : Oui, c'est correct / Corriger)*

---

### [FIN B — Mandat seul] — +3 à 5 secondes

```
✅ *Dossier {{ref_dossier}} enregistré.*

Pour que Robin des Airs représente *{{nom_principal}}* auprès de *{{compagnie}}*,
signez votre *mandat de représentation* (lisible avant signature).

*Aucune information bancaire n'est demandée à cette étape.*

👉 Signez sur *robindesairs.eu* (2 min) :
{{mandat_url}}

Sans signature, nous ne pouvons pas agir en votre nom.

_L'équipe Robin 🏹_
```

**`{{mandat_url}}`** = sortie Make (voir `WATI-LIEN-MANDAT.md`). Exemple :

`https://robindesairs.eu/mandat.html?ref=RDA-20260515-E448&phone=%2B33...&name=...&vol=EJU7524&date=06/08/2025&pnr=K5FW8BX&route=BSL-FAO&compagnie=easyJet&motif=retard&indemnite=600&source=wati`

---

### [FIN C — Pièces] — +30 secondes après B

```
📎 *Ensuite — vos justificatifs*

Envoyez ici, en photos :

1. *Passeport ou CNI* (face lisible)
2. *Carte d'embarquement* ou confirmation *(si vous l'avez encore)*

🔒 Pièces réservées au dossier *{{ref_dossier}}* uniquement.
Confidentialité : https://robindesairs.eu/politique-confidentialite
```

---

### [Pied de fil — après ouverture dossier]

```
✅ Dossier bien reçu — posez votre question ici (court de préférence).
🔄 Nouveau dossier : *menu* ou *recommencer*.

👉 *Notre site :* https://robindesairs.eu
*Suivi dossier :* https://robindesairs.eu/suivi-dossier
```

---

## Templates réengagement (Meta / fenêtre 24 h)

### R1 — Abandon étapes 1–2 (>2 h)

```
Bonjour — votre dossier Robin des Airs
est ouvert mais pas encore finalisé.

Vos droits sur ce vol *expirent dans 3 ans*
à partir de la date du retard.
Il en reste encore — ne les perdez pas.

*Une seule réponse* pour reprendre où vous en étiez :
```

*(Bouton : Continuer mon dossier)*

### R2 — Abandon avant OCR (>4 h)

```
On s'est arrêtés juste avant la photo de votre carte d'embarquement.

Pas de carte sous la main ?
*Pas de problème* — vous pouvez saisir
le numéro de vol manuellement.
C'est 2 minutes.

Votre dossier vous attend :
```

*(Bouton : Reprendre la saisie)*

### R3 — Mandat non signé (>24 h)

```
Votre dossier *{{ref_dossier}}* est prêt.
Il attend votre signature.

Nos experts ne peuvent pas agir
tant que le mandat n'est pas signé —
*c'est la seule chose qui manque.*

Lien officiel Robin des Airs (2 min) :
{{mandat_url}}

_L'équipe Robin_
```

---

## Champs Airtable à remplir avant `mandat_url`

| Champ | Collecté par bot v2 |
|-------|---------------------|
| Référence Dossier | Auto `RDA-...` |
| Numéro WhatsApp | Meta |
| Prénom / Nom | OCR + étape 6 |
| Email | Étape 7b |
| Adresse domicile | Étape 7c |
| Numéro de vol, Date, PNR, Itinéraire, Compagnie | OCR |
| Type d'incident | Étape 3 (+ durée si retard) |
| Montant indemnité | Calcul Make |

---

## Messages post-bot (humain)

Les rewrites Phase 2 restent dans :

- `protocole-siege/partie-2-client/message-0-REWRITE.md` (0a / 0b)
- `protocole-siege/partie-2-client/message-1-2-REWRITE.md`
- `protocole-siege/partie-2-client/message-3-4-REWRITE.md`

---

*Dernière mise à jour : 19/05/2026 — v2 audits appliqués*

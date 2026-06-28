# Guide des messages WhatsApp — Robin des Airs 🏹 (v10)

> Spécialiste indemnisation des vols retardés/annulés Afrique ↔ Europe.
> Cadre juridique : **Règlement (CE) 261/2004** — jusqu'à **600 € / passager**.
> Modèle : **0 € si on ne gagne pas, 25 % de commission en cas de succès uniquement.**
>
> Ce guide reflète le **flux v8** réellement implémenté dans `scripts/whatsapp_bot.py`,
> augmenté de la **couche d'encouragement v10** (voir section dédiée) : la conversion v10 ne se
> gagne plus en ajoutant des questions, mais en transformant le tunnel en **conversation accompagnée**.
>
> **Ce qui change en v10 :** chaque message ne se contente plus de poser une question — il *réagit*
> à ce que le client vient de faire, *situe* sa progression et *reprojette* le gain. Zéro écran
> ajouté sur le chemin critique (réseau africain instable) ; l'encouragement s'intègre **dans** les
> messages existants, sauf à 3 jointures de friction maximale (après scan, avant documents, après
> récap) où une micro-célébration dédiée relance le momentum.

---

## Le cadre légal exact (à ne jamais déformer)

Le règlement CE 261/2004 s'applique :

- **Au départ d'un aéroport européen** → *toutes compagnies confondues* (y compris Air Sénégal, Royal Air Maroc, ASKY, etc.).
- **Vers l'Europe** (arrivée UE) → *uniquement si la compagnie est européenne*.

Conditions cumulatives pour l'indemnité forfaitaire de 600 € :
- Retard **≥ 3 h à l'arrivée** finale (pas au départ), **ou** annulation, **ou** refus d'embarquement (surbooking).
- Vol **datant de moins de 5 ans** (prescription — varie selon la juridiction, France = 5 ans).

Cette formulation exacte est reprise telle quelle dans le MSG 1 et dans les stops d'inéligibilité. Ne jamais promettre « 600 € garantis », toujours « vous donne droit à » / « potentiellement ».

---

## La barre de progression (8 pastilles)

Le bot affiche une barre de **8 pastilles** en tête de la plupart des messages, qui se remplit au fil des 8 étapes validées :

```
🟢🟢⚪⚪⚪⚪⚪⚪
```

Correspondance étape → pastilles remplies :

| Pastilles | Étapes du flux |
|-----------|----------------|
| 0 | Accueil, langue |
| 1 | Route qualifiée |
| 2 | Incident + durée retard |
| 3 | Nombre de passagers |
| 4 | Type de vol (direct/escale) |
| 5 | Scan document(s) + collecte vol |
| 6 | Vol, date, mineurs |
| 7 | Récap, documents justificatifs, RGPD, contrat de cession |
| 8 | Dossier complet |

C'est une **promesse** (effet Zeigarnik façon Duolingo) : le cerveau déteste abandonner une tâche commencée. Chaque message « rapide » sert à faire avancer cette barre.

---

## La couche d'encouragement (v10) — le « fil rouge » conversationnel

> **Le diagnostic v8 → v10 :** le flux v8 enchaînait les questions correctement, mais *froidement* —
> question, réponse, question suivante. Le client avait l'impression de remplir un formulaire, pas
> d'être accompagné. Or sur un sujet anxiogène (« est-ce que je vais vraiment toucher quelque chose ? »,
> « c'est pas une arnaque ? »), c'est l'**accompagnement** qui fait franchir chaque micro-friction.
> La v10 ajoute un **fil rouge d'encouragement** qui transforme le tunnel en conversation.

### Le principe directeur : zéro écran ajouté

Sur réseau africain instable, **chaque message supplémentaire est un point de rupture potentiel**
(message non délivré, session coupée, lassitude). Donc la règle d'or v10 :

> **L'encouragement s'intègre DANS les messages existants** (en ligne d'ouverture ou de clôture),
> il ne crée pas d'écran en plus — **sauf aux 3 jointures de friction maximale** où une
> micro-célébration dédiée est rentable (voir « Transitions dédiées » plus bas).

### La formule en 3 temps : Réagir → Situer → Reprojeter

Chaque transition entre deux étapes applique (tout ou partie de) ces 3 temps :

1. **Réagir** — accuser réception de l'effort que le client vient de faire. *« Parfait ✅ »*, *« C'est noté 👍 »*, *« Excellent, scan réussi ! »*. Le cerveau a besoin d'un feedback à chaque action (boucle de récompense type Duolingo).
2. **Situer** — rappeler où on en est dans la barre de progression, en insistant sur ce qui **reste** (court) plutôt que sur ce qui est fait. *« Plus que 2 étapes »*, *« On arrive au bout »*, *« Dernière ligne droite »*.
3. **Reprojeter** — re-ancrer le **bénéfice** (le montant, le prénom, la route) pour que l'effort suivant ait un sens. *« vos 1 200 € se rapprochent »*, *« on construit VOTRE dossier, Aminata »*.

Exemple condensé (les 3 temps en une ligne) :
> *« Parfait ✅ Plus que 2 étapes et vos 1 200 € sont entre de bonnes mains. »*

### Bibliothèque de micro-encouragements (réutilisables)

À piocher selon le moment. Garder **1 ligne**, **1 emoji fonctionnel**, ton chaleureux-pro, vouvoiement.

| Moment | FR | EN |
|--------|----|----|
| Après un tap rapide | « Parfait 👍 » / « C'est noté ✅ » | « Perfect 👍 » / « Got it ✅ » |
| Après une qualification réussie | « Bonne nouvelle : votre vol coche les cases ✅ » | « Good news — your flight qualifies ✅ » |
| Après le scan réussi | « 🎉 Scan réussi ! Vous venez de gagner 5 minutes de saisie. » | « 🎉 Scanned! You just saved 5 minutes of typing. » |
| Après un nom confirmé | « Merci 🙏 c'est enregistré au nom exact. » | « Thanks 🙏 saved with the exact name. » |
| Mi-parcours (relancer) | « Vous êtes à mi-chemin — le plus dur est derrière vous 💪 » | « You're halfway — the hard part is behind you 💪 » |
| Avant une étape lourde | « Dernière ligne droite, on y est presque ! » | « Final stretch — almost there! » |
| Personnalisation prénom | « On y est presque, [Prénom] 🤝 » | « Almost there, [First name] 🤝 » |
| Reprojection du gain | « Vos [montant] € se rapprochent. » | « Your €[amount] is getting closer. » |
| Réassurance anti-défiance | « 0 € si on ne gagne pas — vous ne risquez rien. » | « €0 if we don't win — zero risk for you. » |
| Après le récap validé | « Tout est carré ✅ Il ne reste que la signature. » | « All set ✅ Just the signature left. » |

### Les 3 transitions dédiées (les seuls écrans ajoutés autorisés)

Aux 3 points où le client doit fournir le **plus d'effort** ou prendre le **plus de risque perçu**,
une micro-célébration dédiée (1 message court) est rentable car elle relance avant l'effort :

1. **Après le scan réussi → avant la collecte/les noms** (l'étape scan est le plus gros point de fuite historique) :
```
💪 Le plus dur est fait !

Vos infos de vol sont enregistrées. Il ne reste que quelques détails et votre dossier est complet.
```

2. **Après le récap validé → avant les documents (MSG 12 → 13)** (passage à l'étape engageante) :
```
🎯 Votre dossier prend forme, [Prénom] !

Encore quelques pièces et on lance la réclamation contre la compagnie. On y est presque.
```

3. **Avant le contrat de cession (dans MSG 14)** (la conversion finale) — intégrée au récap de clôture :
```
🙌 Bravo, vous avez tout fait !

Il ne reste qu'une signature de 2 minutes pour nous autoriser à récupérer votre argent.
```

> Ces 3 messages sont **les seuls écrans d'encouragement ajoutés**. Partout ailleurs, l'encouragement
> est une ligne intégrée au message qui posait déjà la question.

### ⚠️ À éviter (l'encouragement qui dessert)

- **Flatterie vide** sans action derrière (« Vous êtes formidable ! ») : ça sonne faux et ça rallonge.
- **Multiplier les écrans** « bravo ! » entre chaque question : effet spam, l'inverse du but.
- **Encourager après un stop** (non-éligible) : déplacé. Un stop se gère avec empathie, pas avec des confettis.
- **Promesse implicite** (« vous allez toucher vos 600 € ! ») : rester sur « potentiellement » / « se rapprochent ».
- **Sur-personnaliser** le prénom à chaque ligne : 1 à 2 fois dans le flux suffit, sinon ça devient mécanique.

### 📊 Comment mesurer que la v10 marche

L'encouragement est un **investissement en messages** : il doit se payer en conversion.

- **KPI roi inchangé** : taux MSG 1 → contrat de cession signé (cible > 12-15 %). La v10 doit le faire **monter**, sinon retirer les transitions dédiées.
- **Drop-off par étape** : comparer v8 vs v10 sur les 3 jointures (scan, docs, contrat de cession) — c'est là que les transitions dédiées doivent réduire l'abandon.
- **Garde-fou** : si l'ajout des 3 transitions dédiées **augmente** l'abandon (lassitude > motivation), les repasser en ligne intégrée. Tester A/B avant de généraliser.

---

## L'ordre exact du flux (14 messages)

1. **MSG 1** — Accroche commerciale + stat choc (6 variantes) + bouton « Vérifier mon indemnité »
2. **MSG 2** — Langue (9 options en 2 sections : européennes / africaines, avec drapeaux)
3. **MSG 3** — Route (4 boutons : Afrique↔Europe / Europe↔Europe / Départ ou arrivée Europe / Autre)
4. **MSG 4** — Incident + durée retard
5. **MSG 5** — Nombre de passagers (**avant** le scan)
6. **MSG 6** — Type de vol direct/escale (**avant** le scan)
7. **MSG 7** — Motivation avec montant exact calculé
8. **MSG 8** — Scan document(s) — on sait combien de cartes scanner
9. **MSG 9** — Noms passagers (si non lus par scan)
10. **MSG 10** — Vol & date (si non lus par scan)
11. **MSG 11** — Mineurs (sélection par nom)
12. **MSG 12** — Récap modifiable (7 champs)
13. **MSG 13** — Documents justificatifs (passeport, carte, e-billet, certificat)
14. **MSG 14** — RGPD + contrat de cession + dossier reçu + clôture humaine

**Convention de ton :** vouvoiement, chaleureux mais pro, 1 à 3 emojis fonctionnels par message, phrases courtes, montants en gras, une décision par écran (boutons, pas « tapez 1/2/3 »). On parle d'argent **dû au client**, jamais de « frais ».

**Convention v10 (fil rouge) :** chaque message qui suit une action du client ouvre ou ferme sur la formule **Réagir → Situer → Reprojeter** (voir « La couche d'encouragement »). Le but n'est jamais d'ajouter un écran, mais de faire sentir au client qu'**on l'accompagne** plutôt qu'on l'interroge.

---

## MSG 1 — Accroche commerciale

**1. Message exact**

```
🟢🟢⚪⚪⚪⚪⚪⚪

👋 Bienvenue chez Robin des Airs 🏹
Spécialiste des vols africains retardés ou annulés.

"Les compagnies gardent 95% des indemnités dues... faute de réclamation."

✈️ La loi européenne CE 261/2004 vous donne droit à 600 € par personne pour les vols :
• Au départ de l'Europe — toutes compagnies confondues
• Vers l'Europe — si la compagnie est européenne

0€ si on ne gagne pas. Aucun risque pour vous.

[bouton 🚀 Vérifier mon indemnité]
```

**Rotation des 6 variantes de stat choc (ligne 3, tirées au sort à l'ouverture) :**

| # | Stat |
|---|------|
| 1 | « Seulement 5% des passagers réclament leur indemnité — soyez dans les 5%. » |
| 2 | « Les compagnies gardent 95% des indemnités dues... faute de réclamation. » |
| 3 | « Un vol sur 4 au départ d'Afrique arrive en retard en Europe. » |
| 4 | « Des centaines de dossiers gagnés. Des familles indemnisées. Votre dossier est le suivant. » |
| 5 | « 600€ par passager. C'est la loi. La compagnie le sait. Vous aussi maintenant. » |
| 6 | « Chaque année, des millions d'euros d'indemnités ne sont jamais réclamés faute de démarche. » |

Une version EN équivalente existe (`STAT_VARIANTS_EN`).

**2. 🎯 Objectif :** déclencher le tap sur le bouton. Rien d'autre. Ce message ne vend pas le service, il vend le **clic suivant**.

**3. 🧠 Pourquoi ce ton :**
- La stat en guillemets crée une **rupture de pattern** dès la ligne 3.
- La précision des 2 cas (départ Europe = toutes compagnies / arrivée Europe = cie européenne) est juridiquement exacte et lève l'objection fréquente Air Sénégal/RAM/ASKY.
- « 0 € si on ne gagne pas » juste avant le bouton lève le frein financier au moment de la décision.
- Un seul bouton = un seul choix = CTR maximal. La rotation des 6 stats évite la lassitude au retargeting.

**4. ⚠️ À éviter :**
- Deux boutons : dilue le clic.
- Donner les conditions d'éligibilité ici (distance, 3h) : on qualifie après, pas avant le clic.
- « 600 € garantis » : faux et illégal.
- Mur de texte : garder l'aération.

**5. 📊 Indicateur de succès :** **CTR sur le bouton > 55 %**. A/B tester les 6 variantes par CTR. Alerte : CTR < 35 %.

---

## MSG 2 — Choix de la langue

**1. Message exact**

```
⚪⚪⚪⚪⚪⚪⚪⚪

🌍 Dans quelle langue souhaitez-vous être accompagné(e) ?

Chez Robin des Airs, nous parlons votre langue — il est toujours plus facile de s'expliquer dans sa langue maternelle. 🤝

In which language would you like to be assisted?

[bouton liste 🌍 Choisir]
```

La liste WhatsApp est organisée en **2 sections avec drapeaux** :

```
🌍 Langues européennes
  🇫🇷 Français
  🇬🇧 English

🌍 Langues africaines
  🇸🇳 Wolof
  🇬🇲 Mandinka
  🇬🇭 Twi
  🇳🇬 Yoruba
  🇨🇩 Lingala
  🇰🇪 Swahili
  🇬🇳 Peul / Fulfulde
```

**Branche FR / EN :** le flux continue directement dans cette langue → MSG 3 (route).

**Branche langue africaine (ex. Wolof) :** message natif d'accueil, puis bascule FR + annonce d'un expert qui parlera la langue. Statut : `escalade_expert` / `langue_africaine`.

```
🇸🇳 Dëkk sa Wolof, bëgg na la wax — expert bi dafa di xam Wolof, dafa di waxleen ci kanam. 🤝
📱 +33 7 56 86 36 30

🤝 Votre dossier est entre de bonnes mains.

Un expert parlant votre langue vous contactera en cours de dossier.

En attendant, je continue à vous guider en français. 👇
```
*(chaque langue africaine a son propre message natif court : Mandinka, Twi, Yoruba, Lingala, Swahili, Peul.)*

**2. 🎯 Objectif :** confiance linguistique sans s'engager à gérer tout le flux dans 9 langues. Les langues africaines déclenchent un accueil natif (respect culturel) puis canalisent vers FR + escalade humaine.

**3. 🧠 Pourquoi ce ton :**
- La **première phrase dans la langue maternelle** crée un effet « ils sont des nôtres », levier de confiance le plus puissant du marché africain.
- On est honnête : le flux complet n'existe pas en wolof/lingala. Plutôt qu'une mauvaise traduction auto, on assume « on continue en français » + rappel humain dans la langue.

**4. ⚠️ À éviter :**
- Afficher 9 langues puis répondre dans une seule sans la micro-phrase native : trahison de promesse.
- Traduire automatiquement tout le flux (contrat de cession, indemnité mal traduits) → aberrations juridiques.

**5. 📊 Indicateur de succès :** **< 8 % d'abandon** sur cet écran. Pour les langues africaines, suivre le **taux d'aboutissement après bascule FR** (sinon la charge humaine explose). Suivre la répartition réelle des langues.

---

## MSG 3 — Route du vol

**1. Message exact** (4 choix → rendus en liste car WhatsApp limite à 3 boutons)

```
🟢⚪⚪⚪⚪⚪⚪⚪

🗺️ Votre vol était sur quelle route ?

Cela détermine si le règlement européen CE 261/2004 s'applique.

[🌍 Afrique ↔ Europe — notre spécialité]
[🇪🇺 Europe ↔ Europe]
[🛫 Départ ou arrivée en Europe]
[🌐 Autre]
```

**Branche « Afrique ↔ Europe » :** → MSG 4 directement.

**Branche « Europe ↔ Europe » :**
```
🇪🇺 Les vols intra-européens sont couverts par le CE 261 ✅
Notre spécialité c'est les routes Afrique ↔ Europe, mais on continue.
```
→ MSG 4.

**Branche « Départ ou arrivée en Europe » :**
```
🛫 Un départ ou une arrivée en Europe peut être éligible — surtout avec une compagnie ou un aéroport européen. Vérifions ensemble. ✅
```
→ MSG 4.

**Branche « Autre » (stop, statut `non_eligible` / `route_hors_europe`) :**
```
😔 Votre vol ne semble pas couvert par la loi européenne.

Le règlement CE 261/2004 s'applique uniquement aux vols :
• Au départ ou à l'arrivée d'un aéroport européen, ou
• Opérés par une compagnie européenne.

D'après ce que vous avez indiqué, votre vol ne remplit aucune de ces conditions.

❓ Si vous pensez qu'il y a une erreur, tapez menu pour recommencer et choisir une autre route — cela ne prend que quelques secondes.

_L'équipe Robin des Airs_
```

**2. 🎯 Objectif :** qualifier la juridiction et ancrer « Afrique ↔ Europe » comme choix par défaut (« notre spécialité »). Écarter proprement les non-éligibles.

**3. 🧠 Pourquoi ce ton :**
- Le tag « — notre spécialité » sur le 1er bouton oriente sans forcer (ancrage + réassurance).
- Le stop « Autre » remercie au lieu de rejeter et laisse une porte (« si erreur, tapez menu ») : un « non » bien géré protège la marque.

**4. ⚠️ À éviter :**
- Jargon (« vols intracommunautaires ») : géographie simple.
- Stop sec : toujours offrir une porte de sortie.

**5. 📊 Indicateur de succès :** part « Afrique ↔ Europe » conforme au mix marketing. Surveiller l'abandon post-stop « Autre ».

---

## MSG 4 — Type d'incident + durée

**1. Message exact**

```
🟢🟢⚪⚪⚪⚪⚪⚪

✈️ Que s'est-il passé avec votre vol ?

[⏱️ Retard à l'arrivée]
[❌ Annulation]
[🚫 Refus d'embarquement]
```

**Si « Retard » → sous-question durée :**
```
⏱️ De combien d'heures était le retard à l'arrivée ?

[✅ Plus de 3 heures]
[❌ Moins de 3 heures]
[🤔 Je ne sais plus]
```

**Annulation / Refus d'embarquement :** pas de sous-question, on enchaîne directement sur l'estimation puis MSG 5.

**Branche « Plus de 3 heures » :** estimation puis MSG 5.

**Branche « Moins de 3 heures » (stop, `non_eligible` / `retard_trop_court`) :**
```
😔 Retard inférieur à 3 heures — pas d'indemnisation possible.

La loi européenne CE 261/2004 fixe un seuil minimum de 3 heures de retard à l'arrivée pour ouvrir droit à une indemnité forfaitaire.

En dessous de ce seuil, aucune compensation n'est prévue par la loi, quelles que soient les circonstances.

💡 Vous n'êtes pas sûr de la durée exacte ? Tapez menu et choisissez 'Je ne sais plus' — un expert vérifie pour vous gratuitement.

_L'équipe Robin des Airs_
```

**Branche « Je ne sais plus » (rassurer + CONTINUER, pas stop ; `escalade_expert` / `duree_inconnue`) :**
```
🤔 Pas de problème — on vérifie pour vous.

La durée exacte du retard figure dans les bases de données aériennes. Notre équipe peut la retrouver à partir de votre numéro de vol et de votre date.

Continuons à remplir votre dossier. Si le retard s'avère inférieur à 3h, nous vous en informerons sans frais.

📱 Un expert vous contactera pour confirmer la durée avant d'engager la procédure.
```
→ estimation puis MSG 5. **Le flux ne s'arrête PAS** : on garde le client et un expert tranche plus tard.

**Estimation (avant MSG 5) :**
```
💡 Bonne nouvelle : votre vol coche les cases ✅
Avec [retard +3h / annulation / refus d'embarquement], vous avez potentiellement droit à 600€ par passager. Continuons — on y est presque !
```

**v10 — fil rouge :** *Réagir + Reprojeter.* On célèbre la qualification réussie (« coche les cases ✅ ») avant de relancer. C'est le 1er moment où le dossier devient « réel » pour le client — il faut le marquer.

**2. 🎯 Objectif :** qualifier le fait générateur sans perdre les utilisateurs qui ignorent la durée exacte.

**3. 🧠 Pourquoi ce ton :**
- « retard à l'arrivée » évite l'erreur n°1 (donner le retard au décollage), juridiquement décisif.
- « Je ne sais plus » est un chemin valorisé qui **continue** le flux, pas une impasse — la majorité ne connaît pas l'heure d'atterrissage.

**4. ⚠️ À éviter :**
- Demander une durée chiffrée au clavier.
- Faire de « Je ne sais plus » un stop : abandon massif.

**5. 📊 Indicateur de succès :** **progression vers MSG 5 > 80 %**. Suivre la part « Je ne sais plus » (peut être > 30 %, normal) et vérifier qu'elle convertit aussi bien.

---

## MSG 5 — Nombre de passagers (avant le scan)

**1. Message exact** (liste avec montants sur chaque ligne)

```
🟢🟢🟢⚪⚪⚪⚪⚪

👥 Combien de passagers réclament sur ce vol ?

1 passager   → 600 €
2 passagers  → 1 200 €
3 passagers  → 1 800 €
4 passagers  → 2 400 €
5 passagers  → 3 000 €
6 ou plus    → Dossier prioritaire
```

**Branche « 6 ou plus » (dépôt express, `escalade_expert` / `groupe_6plus`) :**
```
👥 Groupe de 6+ passagers — dossier prioritaire !

Potentiellement plus de 3 600€.

Pour les groupes nous traitons les dossiers manuellement.

👉 robindesairs.eu/depot-express

L'équipe Robin des Airs
```
→ le flux conversationnel s'arrête ici, le client est dirigé vers le **dépôt express**.

**Branches 1 à 5 :** → MSG 6 (type de vol).

**2. 🎯 Objectif :** chiffrer le montant en jeu en temps réel sur chaque ligne, transformer un choix administratif en projection de gain. Détecter les dossiers groupés.

**3. 🧠 Pourquoi ce ton :**
- Afficher « 2 → 1 200 € » fait faire le calcul de désir à la place de l'utilisateur.
- Pour 6+, « dossier prioritaire » (valorisant) + redirection directe vers le dépôt express, sans introduire d'attente qui refroidit l'élan.

**4. ⚠️ À éviter :**
- Champ texte libre pour le nombre.
- Promesse de délai (« rappel sous 24h ») sur le chemin 6+ : casse le momentum.
- Sur-promettre le total : c'est un **potentiel**.

**5. 📊 Indicateur de succès :** **complétion > 88 %**. KPI business : valeur moyenne du dossier (nb passagers moyen). Suivre la part 6+.

---

## MSG 6 — Type de vol (direct / escale, avant le scan)

**1. Message exact**

```
🟢🟢🟢🟢⚪⚪⚪⚪

✈️ C'était un vol direct ou avec escale(s) ?

[✈️ Vol direct]
[🔄 Avec escale]
```

→ MSG 7 (motivation) puis MSG 8 (scan). Le type de vol pilote la logique de scan : un vol **avec escale** ouvre la possibilité de scanner **plusieurs cartes** (segments / passagers).

**2. 🎯 Objectif :** capter une info utile au calcul de distance/éligibilité et offrir un tap ultra-rapide qui fait avancer la barre avant les étapes lourdes (scan, noms).

**3. 🧠 Pourquoi ce ton :**
- Question binaire = effort minimal, micro-engagement « pied dans la porte » avant les étapes exigeantes.

**4. ⚠️ À éviter :**
- Expliquer pourquoi l'escale compte : on collecte, on n'enseigne pas.
- Demander le détail des villes maintenant : déduit du billet/scan.

**5. 📊 Indicateur de succès :** **tap > 92 %**. Si l'abandon monte ici, la cause est en amont (fatigue d'écrans).

---

## MSG 7 — Motivation (montant exact + alignement d'intérêt)

**1. Message exact** (exemple : 2 passagers)

```
🟢🟢🟢🟢⚪⚪⚪⚪

🎉 2 passager(s) = jusqu'à 1 200 € d'indemnité !

💶 Vous percevez 900 € nets (75%).
Robin des Airs prélève 25% de frais de succès — uniquement si nous obtenons le paiement.
Si vous ne touchez rien → nous ne touchons rien.

Notre intérêt est donc le vôtre. 🤝
```

Le montant et le net sont **calculés** : `total = 600 × nb_pax`, `net = 75 % du total`.

**2. 🎯 Objectif :** réengagement émotionnel avant la partie administrative (scan, documents). Reconfirme le gain chiffré, neutralise « combien ça va me coûter ? ».

**3. 🧠 Pourquoi ce ton :**
- Montant **personnalisé** (« vos 2 passagers → 1 200 € ») bien plus puissant qu'un générique.
- Structure « net d'abord, 25 % ensuite, rien si on perd » : on désamorce la commission.
- « Notre intérêt est le vôtre » = argument anti-arnaque ultime.

**4. ⚠️ À éviter :**
- Annoncer « 25 % » avant le net : déclenche le réflexe « commission ».
- Présenter les 25 % comme un « frais » : c'est une **commission au succès**.
- Cacher la commission : la transparence ici fait signer le contrat de cession plus tard.

**5. 📊 Indicateur de succès :** **passage vers le scan (MSG 8) > 75 %**. Comparer le drop-off selon le montant (les petits montants décrochent-ils plus ?).

---

## MSG 8 — Scan du document

**1. Message exact** (intro ; mention multi-passagers si pax > 1)

```
🟢🟢🟢🟢🟢⚪⚪⚪

⚡ On va vous faire gagner du temps !

Envoyez une photo de votre carte d'embarquement ou de votre confirmation de réservation (e-billet) — notre système lit les informations automatiquement pour vous éviter de tout retaper.

👥 Vous êtes 3 passagers — on vous demandera la carte de chacun, un par un.

📎 Envoyez votre document
✏️ Ou tapez manuel pour saisir les infos vous-même
```

Le scan (OCR via GPT-4o) extrait : **n° de vol, date, heure de départ, nom passager, compagnie, origine/destination (codes IATA), vol retour éventuel.**

**Multi-cartes (vol avec escale OU plusieurs passagers) :**
```
✅ Carte 1/3 scannée !

📸 Envoyez la carte suivante (passager 2).
✏️ Ou tapez fini si vous avez tout envoyé.
```

**Vol avec escale, 1 passager (2 segments) :**
```
✅ Segment 1 scanné !

📸 Avez-vous une deuxième carte (vol de correspondance) ?
✏️ Tapez fini si c'est votre seule carte.
```

**Tri chronologique + route multi-segments :** les cartes scannées sont triées par **heure de départ extraite** (ordre chronologique vol 1 → vol 2). La route est reconstruite en multi-segments, ex. `CDG → CMN → DSS`.

**Mot-clé « fini » / « done » (ou « passer ») → récap des cartes scannées :**
```
📋 Cartes scannées :
✅ AF718 — DIALLO Aminata (14/03/2026)
✅ AT540 — DIALLO Aminata (14/03/2026)

🗺️ Trajet : CDG → CMN → DSS
```

**Confirmation (scan réussi, 1 carte) :**
```
🎉 Scan réussi ! Vous venez de gagner 5 minutes de saisie.

✈️ Vol : AT540 — Royal Air Maroc
📅 Date : 14/03/2026
👤 Passager : DIALLO Aminata
🗺️ Trajet : CMN → ORY

C'est correct ?
[✅ Oui]   [✏️ Corriger]
```

**v10 — transition dédiée n°1 (après « Oui » → avant collecte/noms) :** l'étape scan est le plus gros point de fuite historique ; on célèbre franchement le passage avant les étapes restantes :
```
💪 Le plus dur est fait !

Vos infos de vol sont enregistrées. Il ne reste que quelques détails et votre dossier est complet.
```
*(en mono-passager dont le nom a été lu au scan, on enchaîne directement sur la suite après cette transition.)*

**Aller-retour détecté (vol retour dans le scan) :**
```
🔄 Votre réservation contient 2 trajets :

1️⃣ CMN → ORY (14/03/2026) — AT540
2️⃣ ORY → CMN (21/03/2026)

Pour quel trajet réclamez-vous ?
[1️⃣ CMN → ORY]  [2️⃣ ORY → CMN]  [🔄 Les deux trajets]
```

**Scan raté (message d'excuse + CONTINUE en manuel) :**
```
😕 Désolé, la qualité de l'image n'a pas permis une lecture automatique.
Essayez avec plus de lumière, ou répondez aux questions ci-dessous — ça prend 2 minutes. 👇
```
→ le bot enchaîne sur la collecte manuelle des noms/vol/date manquants. **Jamais de cul-de-sac.**

**Option « manuel » :** tapez *manuel* dès l'intro pour saisir sans photo.

**2. 🎯 Objectif :** capturer les données par OCR pour **éliminer la saisie manuelle** (plus gros point d'abandon mobile).

**3. 🧠 Pourquoi ce ton :**
- « On va vous faire gagner du temps » + lecture auto = effet « waouh ».
- L'échec OCR est formulé sans blâmer (« la qualité de l'image », pas « vous »).
- La confirmation récapitule les données : validation d'un tap, sentiment de contrôle.
- L'aller-retour est présenté comme une **bonne nouvelle** (potentiellement 2 indemnités).
- Le tri chronologique reconstruit proprement la route à escales.

**4. ⚠️ À éviter :**
- Blâmer l'utilisateur en cas d'échec OCR.
- Ne pas offrir d'alternative (manuel) après échec : escalade obligatoire.
- Demander toutes les cartes d'un coup : gérer **séquentiellement** avec compteur (« 1/3 ») + « passer ».
- Confirmer des données fausses sans bouton « Corriger » (noms africains, accents).

**5. 📊 Indicateur de succès :** **OCR réussi (≤ 3 essais) > 90 %**. KPI critique : **abandon sur l'étape scan** (historiquement le plus gros point de fuite). Suivre le recours à « manuel » et à l'aide experte.

---

## MSG 9 — Noms des passagers (si non lus par l'OCR)

**1. Message exact** (un par un)

```
🟢🟢🟢🟢🟢⚪⚪⚪

👤 Passager 2 sur 3 — Prénom et nom ?
_(ex : Jean Dupont)_
```

**Confirmation :**
```
✅ Passager 2 sur 3 : Aminata Diallo — merci 🙏
C'est correct ?
[✅ Oui, correct]   [✏️ Corriger]
```

Déclenché **uniquement** pour les passagers dont le nom n'a pas été lu au scan.

**v10 — fil rouge :** *Réagir + Situer.* C'est l'étape la plus répétitive (un nom après l'autre) — donc la plus à risque d'effet « formulaire froid ». Le « merci 🙏 » + le compteur « 2 sur 3 » à chaque confirmation maintiennent la sensation d'avancer plutôt que de subir. Sur le **dernier** passager, basculer le compteur en encouragement : *« ✅ Dernier passager enregistré — c'était la partie la plus longue, bravo ! »*.

**2. 🎯 Objectif :** récupérer les noms manquants, un par un, avec validation — le nom exact (tel que passeport) est juridiquement essentiel au contrat de cession.

**3. 🧠 Pourquoi ce ton :**
- Un passager à la fois minimise l'effort perçu.
- Confirmation systématique car les noms (translittérations, accents, particules) sont la 1re source d'erreur.

**4. ⚠️ À éviter :**
- Demander tous les noms en un message : réponses impossibles à parser. **Un par un.**
- Réclamer des noms déjà lus au scan.

**5. 📊 Indicateur de succès :** **saisie sans abandon > 90 %**. Taux de correction post-confirmation = proxy qualité OCR des noms.

---

## MSG 10 — Numéro de vol & date (si non lus)

**1. Message exact (vol)**

```
🟢🟢🟢🟢🟢🟢⚪⚪

📝 Quel est le numéro de vol tel qu'il apparaît sur votre billet ?

_(ex : AF718, KL563, SN271)_

ℹ️ C'est le numéro commercial — utilisez-le même en cas de code share.

📸 Vous pouvez aussi envoyer une photo de votre carte d'embarquement.
```

**Confirmation vol + compagnie déduite** (du préfixe IATA) :
```
✅ Vol AT540 — Royal Air Maroc
C'est correct ?
[✅ Oui]   [✏️ Corriger]
```

**Date :**
```
📅 Quelle était la date du vol ?

_(ex : 15/03/2023 ou 15 mars 2023)_
```

**Confirmation date :**
```
✅ Date : 14/03/2026
C'est correct ?
[✅ Oui]   [✏️ Corriger]
```

**Check prescription 5 ans** (à la confirmation de date ; `non_eligible` / `vol_trop_ancien`) :
```
😔 Vol trop ancien — délai légal dépassé.

La loi prévoit une prescription de 5 ans à compter de la date du vol.
Au-delà, aucune action en justice ou réclamation n'est possible, même si le retard était réel.

📅 Votre vol date de 12/01/2019, soit plus de 5 ans. Nous ne pouvons pas traiter ce dossier.

❓ Si la date est incorrecte, tapez menu pour corriger.

_L'équipe Robin des Airs_
```
La date est normalisée en **DD/MM/YYYY** ; une saisie floue (« mars 2026 ») est rattrapée par extraction d'année.

**2. 🎯 Objectif :** obtenir l'identifiant du vol (déduction compagnie + croisement bases de retard) et la date, avec contrôle de prescription.

**3. 🧠 Pourquoi ce ton :**
- Déduire « AT540 → Royal Air Maroc » et le renvoyer prouve la compétence du système.
- Le check 5 ans protège l'entreprise tout en laissant la porte « tapez menu pour corriger » (la prescription varie selon le pays).

**4. ⚠️ À éviter :**
- Demander la compagnie séparément : déduite du n° de vol.
- Refuser sèchement un vol > 5 ans sans porte de sortie.
- Format de date ambigu : imposer/illustrer DD/MM/YYYY.

**5. 📊 Indicateur de succès :** **déduction compagnie > 95 %**, **complétion date > 85 %**. Suivre les vols écartés pour prescription.

---

## MSG 11 — Mineurs (sélection par nom)

**1. Message exact (mono-passager)**

```
🟢🟢🟢🟢🟢🟢⚪⚪

👤 Êtes-vous majeur(e) (18+ ans) ?

[✅ Oui, majeur(e)]
[👶 Non, je suis mineur(e)]
```

**Multi-passagers (sélection par nom) :**
```
👶 Parmi les 3 passagers, y a-t-il des mineurs (moins de 18 ans) ?
[✅ Tous majeurs]   [👶 Oui, des mineurs]
```
Si « Oui » → liste de sélection par nom :
```
👶 Lesquels des passagers sont mineurs (moins de 18 ans) ?
Sélectionnez-les un par un et tapez ok quand c'est fini.

[DIALLO Aminata]   [DIALLO Moussa]   [DIALLO Fatou]
```
Chaque sélection : `✅ DIALLO Moussa marqué comme mineur. Sélectionnez un autre ou tapez ok.`

**Branche « mineur seul » (mono-passager mineur, ou tous les passagers mineurs ; `escalade_expert` / `mineur_seul`) :**
```
👶 Passager mineur voyageant seul — signature parentale requise.

La loi exige qu'un parent ou tuteur légal signe le contrat de cession de créance pour un mineur.

Nous allons traiter ce dossier avec vous directement.

📱 Un expert Robin des Airs vous rappelle dans les 24h pour accompagner la procédure.

_L'équipe Robin des Airs_
```

**2. 🎯 Objectif :** identifier les mineurs — le contrat de cession doit alors être signé par le représentant légal.

**3. 🧠 Pourquoi ce ton :**
- La sélection **par nom** rattache chaque mineur à son contrat de cession (pas de réconciliation manuelle).
- Micro-justification (« la loi exige ») rend la question non intrusive.

**4. ⚠️ À éviter :**
- Demander la date de naissance complète : trop intrusif, binaire mineur/majeur suffit.
- Oublier ce point : un contrat de cession de mineur signé par le mineur est nul.

**5. 📊 Indicateur de succès :** **réponse > 95 %**. KPI aval : contrats de cession de mineurs signés par le représentant légal (pas de rejet pour vice de signature).

---

## MSG 12 — Récapitulatif modifiable (7 champs)

**1. Message exact**

```
🟢🟢🟢🟢🟢🟢🟢⚪

📋 Récapitulatif — confirmez svp

👥 2 passager(s) : DIALLO Aminata, DIALLO Moussa
✈️ AT540 — Royal Air Maroc
🗺️ CMN → ORY
📅 14/03/2026 — Retard +3h
🛤️ Direct
💵 Objectif : 900 € nets (75%)

[✅ Tout est correct]   [✏️ Modifier]
```

**Menu de modification (7 champs adressables) :**
```
✏️ Que souhaitez-vous modifier ?
👤 Noms passagers
✈️ Numéro de vol
📅 Date du vol
⚡ Type d'incident
🗺️ Trajet
```
*(les 7 champs du récap = passagers/noms, vol, route, date, incident, type de vol, montant — montant et type recalculés/édités via les autres champs ; le menu expose les 5 entrées éditables directement.)*

**2. 🎯 Objectif :** donner le **contrôle final** avant l'étape engageante (documents + contrat de cession) et garantir l'exactitude juridique.

**3. 🧠 Pourquoi ce ton :**
- Le récap rend l'utilisateur **co-auteur** (effet IKEA) : il valide, il s'engage.
- Modification ciblée sans tout recommencer.
- Rappeler le montant juste avant les documents relance la motivation.

**4. ⚠️ À éviter :**
- Récap non modifiable.
- Noyer la liste dans du texte.
- Oublier d'y refléter les corrections amont.

**5. 📊 Indicateur de succès :** **« Tout est correct » > 80 %** sans modification. **Passage à MSG 13 > 85 %**. Suivre les champs les plus corrigés (faiblesses OCR).

---

## MSG 13 — Documents justificatifs

**v10 — transition dédiée n°2 (après récap validé, MSG 12 → 13) :** juste avant l'étape engageante (documents), on célèbre que le dossier prend forme et on personnalise avec le prénom :
```
🎯 Votre dossier prend forme, [Prénom] !

Encore quelques pièces et on lance la réclamation contre la compagnie. On y est presque.
```

**1. Intro avec temps estimé** (calculé selon nb passagers / carte déjà confirmée)

```
🟢🟢🟢🟢🟢🟢🟢⚪

📁 Documents — dernière ligne droite avant que votre dossier soit complet ! 💪

Nous avons besoin de quelques photos pour constituer votre dossier officiel.
Temps estimé : 2 minute(s) — promis, c'est rapide.

Tout est conservé en sécurité. 🔒
```

La séquence est **ordonnée** : passeports (un par un) → carte d'embarquement → e-billet → certificat (optionnel).

**Passeports un par un :**
```
🛂 Passeport 1/2 — DIALLO Aminata

Envoyez une photo de la page photo du passeport de DIALLO Aminata.

✏️ Tapez passer pour l'envoyer plus tard par email.
```
Réception : `✅ Passeport de DIALLO Aminata reçu ! (1/2)`

**Carte d'embarquement** (sautée si déjà confirmée au scan) — alternative e-billet + mot-clé « appel » :
```
🎫 Carte d'embarquement — justificatif de voyage

Envoyez une photo de votre carte d'embarquement pour le vol retardé/annulé.

📧 Pas de carte ? Votre email de confirmation de réservation fonctionne aussi.
✏️ Tapez passer pour l'envoyer plus tard par email.
📞 Tapez appel si vous avez tout perdu — un expert vous aide.
```

**E-billet** — suggestion spams/Booking + mot-clé « appel » :
```
📧 Confirmation de réservation (e-billet) — justificatif de voyage

Envoyez une capture d'écran de votre email de confirmation de réservation.
(Vérifiez votre boîte mail, spams, ou votre appli voyage Booking/Expedia)

✏️ Tapez passer pour l'envoyer plus tard.
📞 Tapez appel si vous ne trouvez pas — un expert vous aide à le récupérer.
```

**Certificat de retard (optionnel) :**
```
📄 Certificat de retard/annulation (optionnel)

Si la compagnie vous a remis un certificat, envoyez-le — il accélère votre dossier.

✏️ Tapez passer si vous n'en avez pas (cas le plus fréquent).
```

**Mot-clé « appel » (carte ou e-billet ; `escalade_expert` / `document_perdu`) :**
```
📞 Pas de panique — notre expert peut vous aider à retrouver vos documents.

Laissez cette conversation ouverte. Un expert vous contacte directement pour vous aider.

_L'équipe Robin des Airs_
```

**2. 🎯 Objectif :** collecter les pièces qui solidifient le dossier, en minimisant l'effort perçu et en rendant le certificat clairement **optionnel**.

**3. 🧠 Pourquoi ce ton :**
- « Temps estimé : 2 min » fixe une attente courte (sans estimation, on imagine le pire).
- Accusé de réception de chaque pièce (feedback de progression).
- L'alternative e-billet sur la même question carte divise l'abandon ; mentionner spams/Booking résout ~40 % des « je ne trouve pas ».
- Le mot-clé *appel* = porte de sortie humaine qui évite l'abandon silencieux.
- Le certificat répété « optionnel » : document que les gens n'ont presque jamais, jamais un mur.

**4. ⚠️ À éviter :**
- Rendre le certificat obligatoire.
- Ne pas accuser réception de chaque pièce.
- Sous-estimer le temps puis en demander plus.

**5. 📊 Indicateur de succès :** **dossiers avec pièces minimales > 70 %**. Vérifier que l'absence de certificat ne corrèle PAS avec l'abandon. Si un passeport est « passer » ou la carte manquante → statut `docs_en_attente`.

---

## MSG 14 — RGPD + Contrat de cession + clôture humaine

**1. RGPD (juste avant le lien)**

```
🟢🟢🟢🟢🟢🟢🟢⚪

🔒 Avant la signature, votre vie privée d'abord.

Vos documents servent uniquement à réclamer votre indemnité auprès de la compagnie. Ils ne sont jamais vendus ni partagés à des tiers commerciaux. Vous pouvez demander leur suppression à tout moment.

En continuant, vous acceptez notre :
• Politique de confidentialité : robindesairs.eu/politique-confidentialite.html
• Conditions Générales de Vente : robindesairs.eu/cgv.html
```

**Récap + annonce contrat de cession (v10 — transition dédiée n°3, intégrée) :**
```
🟢🟢🟢🟢🟢🟢🟢⚪

🙌 Bravo, vous avez tout fait ! Dossier enregistré — Réf. RDA-20260530-XXXX

👤 Aminata DIALLO
✈️ AT540 — Royal Air Maroc
🗺️ CMN → ORY
📅 14/03/2026 — Retard +3h
💵 Objectif : 900 € nets

Il ne reste qu'une signature de 2 minutes pour nous autoriser à récupérer votre argent. 🤝
```

**v10 — fil rouge :** *Réagir + Situer.* « Bravo, vous avez tout fait ! » récompense l'effort accompli juste avant l'unique action qui compte (la signature). On présente le contrat de cession non comme une corvée de plus mais comme la **dernière** action — et la seule qui débloque l'argent.

**Lien contrat de cession pré-rempli (URL générée avec ref, nom, vol, date, compagnie, motif, nb pax, paxlist) :**
```
🟢🟢🟢🟢🟢🟢🟢🟢

✅ Dossier RDA-20260530-XXXX

Signez votre contrat de cession de créance (lisible avant signature).
Aucune information bancaire demandée à cette étape.

👉 https://robindesairs.eu/mandat.html?ref=...&name=...&vol=...

Sans signature nous ne pouvons pas agir en votre nom.

_L'équipe Robin des Airs_ 🏹
```
Statut : `mandat_envoye`.

**Dossier reçu :**
```
🎉 Dossier RDA-20260530-XXXX — bien reçu !

Nous avons tout ce qu'il nous faut. Notre équipe prend en charge votre réclamation contre la compagnie aérienne.

⏱️ Vous recevrez une mise à jour sous 48h ouvrées.

Merci de votre confiance. L'équipe Robin des Airs 🏹
```

**Clôture humaine :**
```
🤝 Chez Robin des Airs, l'accompagnement est humain.

Votre dossier est maintenant entre les mains d'un expert. Il vous contactera pour suivre chaque étape jusqu'au paiement.

L'IA ouvre le dossier. L'humain le gagne. 🏹
```
Statut final : `complet` (ou `docs_en_attente` si passeport sauté / carte manquante).

**2. 🎯 Objectif :** consentement RGPD/CGV + **signature du contrat de cession de créance** (la conversion finale, à valeur juridique et économique), puis rassurer par le passage à un humain.

**3. 🧠 Pourquoi ce ton :**
- RGPD placé **juste avant le lien**, formulé en bénéfice (« votre vie privée d'abord »), pas en jargon.
- Contrat de cession **pré-rempli, 2 min, aucune info bancaire** : abaisse la barrière.
- « L'IA ouvre, l'humain gagne » = renversement de promesse qui distingue d'un « bot d'arnaque ».

**4. ⚠️ À éviter :**
- Noyer le consentement dans un pavé juridique.
- Demander de re-saisir les infos dans le contrat de cession (il DOIT être pré-rempli).
- Laisser le silence après signature.
- Cacher les 25 % : transparence jusqu'au bout.

**5. 📊 Indicateur de succès :** **LE KPI roi — taux de signature du contrat de cession** parmi ceux qui atteignent MSG 14 (> 75 %). Mesurer le délai envoi → signature et le taux de rétractation (proche de 0).

---

# Messages transversaux

## T1 — Menu / reprise

Mots-clés : `menu`, `restart`, `start`, `reprendre`, `continuer`, `suite`.

- Si une étape est en cours → message de reprise + relance de l'étape exacte (persistance d'état) :
```
👋 Re-bonjour ! On reprend votre dossier là où vous vous étiez arrêté.
```
- Si aucune étape / dossier complété → relance le MSG 1 (accroche).

Mots-clés de reset complet : `nouveau`, `new`, `reset`, `/reset`, `recommencer` → repart à zéro avec le MSG 1.

**🎯 Objectif :** issue de secours universelle, sans perdre la progression.
**🧠 Pourquoi :** sur réseau africain instable, les sessions se coupent. Ne PAS faire recommencer est décisif.
**⚠️ À éviter :** repartir de zéro après « menu » ; un menu à 8 options.
**📊 Succès :** **reprise réussie > 50 %** des sessions interrompues.

---

## T2 — Fallback IA hors flux

Quand le client écrit hors scénario, l'IA répond (GPT-4o-mini, **2-3 phrases max**, ton friendly, 2-3 emojis) et **redirige toujours vers le menu**. Le bot propose en plus deux boutons :

**1. Message exact (boutons)**

```
🤖 Je suis l'assistant IA de Robin des Airs.

Je peux répondre à vos questions sur vos droits ✈️

Pour ouvrir votre dossier, tapez menu 👇
Ou préférez-vous qu'un expert vous rappelle ?

[📋 Démarrer mon dossier]   [📞 Être rappelé]
```

Règles système de l'IA : réponses courtes (2-3 phrases), jamais de listes longues, toujours finir par « Tapez *menu* pour démarrer/reprendre 👇 », et sur question juridique complexe : « Je laisse ça à notre expert 🙏 Tapez *menu* ». Infos clés autorisées : 600 €/passager, 25 % au succès, 5 ans de rétroactivité, retard min 3h à l'arrivée.

Bouton « Être rappelé » → `escalade_expert` / `demande_rappel` :
```
📱 Un expert Robin des Airs vous contacte.
Laissez cette conversation ouverte — il vous écrit directement ici.
_L'équipe Robin des Airs_
```

**🎯 Objectif :** rattraper un message hors scénario sans « je n'ai pas compris ». Re-cadrer vers une action.
**🧠 Pourquoi :** l'IA se présente, valide l'utilisateur, et redirige toujours vers menu/expert. Friendly + court = pas de mur.
**⚠️ À éviter :** « Je n'ai pas compris » ; halluciner du juridique ; boucler sans porte de sortie humaine.
**📊 Succès :** **récupération > 60 %** (re-clic d'une action proposée).

---

## T3 — Relances (2h / 8h / 22h, fenêtre WhatsApp 24h)

> La fenêtre de service WhatsApp gratuite est de **24h** après le dernier message client. Les 3 relances (`RELANCE_THRESHOLDS_HOURS = [2, 8, 22]`) tombent toutes dans cette fenêtre. Au-delà, il faudrait un template payant. Endpoint cron : `/check_abandoned?send=1`. Ne relance jamais un dossier `completed`.

**Relance 1 — +2h (urgence douce, montant personnalisé) :**
```
✈️ Votre dossier vous attend !

Vous étiez à 2 minutes de réclamer 1 200€.

Tapez menu pour reprendre là où vous vous êtes arrêté 👇
```

**Relance 2 — +8h (preuve sociale) :**
```
💬 Des passagers comme vous ont déjà récupéré leur argent.

Cette semaine, un voyageur Paris-Dakar a reçu 1 350€ grâce à Robin des Airs.

Votre dossier (réf. RDA-...) est toujours ouvert. Tapez menu 👇
```

**Relance 3 — +22h (dernière chance avant fermeture fenêtre) :**
```
⏳ Dernière chance aujourd'hui.

Nous ne pouvons garder cette conversation ouverte que peu de temps encore. Ne laissez pas la compagnie garder votre argent.

Tapez menu maintenant 👇

_L'équipe Robin des Airs_
```

**🎯 Objectif :** récupérer les abandons tant que c'est gratuit (< 24h), intensité croissante.
**🧠 Pourquoi :** espacement croissant (2h → 8h → 22h) = accompagnement, pas spam. Escalade d'angle : urgence douce → preuve sociale → dernière chance. Montant personnalisé à chaque relance.
**⚠️ À éviter :** relancer après 24h sans template (risque de ban) ; 3 fois le même texte ; ton agressif ; relancer un dossier signé.
**📊 Succès :** **réactivation cumulée > 25 %**. Surveiller le taux de blocage/opt-out.

---

## Tableau de bord — KPIs prioritaires

| Étape | KPI principal | Cible |
|-------|---------------|-------|
| MSG 1 | CTR accroche | > 55 % |
| MSG 2 | Abandon écran langue | < 8 % |
| MSG 3-4 | Qualification → MSG 5 | > 80 % |
| MSG 7 | Motivation → scan | > 75 % |
| MSG 8 | Succès OCR (≤ 3 essais) | > 90 % |
| MSG 13 | Pièces minimales complètes | > 70 % |
| **MSG 14** | **Signature du contrat de cession** | **> 75 %** |
| T3 | Réactivation relances | > 25 % |
| Global | **Conversion bout-en-bout** (MSG 1 → contrat de cession signé) | > 12-15 % |

**Le seul chiffre qui compte vraiment :** le taux MSG 1 → contrat de cession signé. Tout le reste sert à diagnostiquer où ce chiffre fuit.

---

## Statuts de dossier (suivi back-office)

`dossier_status` évolue tout au long du flux : `en_cours` → `non_eligible` (route hors Europe / retard < 3h / vol > 5 ans) · `escalade_expert` (langue africaine / durée inconnue / groupe 6+ / mineur seul / document perdu / demande de rappel) · `docs_en_attente` (passeport ou carte manquant) · `mandat_envoye` → `complet`.

---

## Recommandations finales

1. **Persistance d'état absolue.** Sur réseau africain instable, ne JAMAIS faire recommencer — levier n°1 de complétion.
2. **L'OCR est votre moat.** Plus le scan lit de champs, moins il y a de saisie, plus vous convertissez.
3. **Le « 0 € si on perd » est répété** (MSG 1, 7, 14). Argument anti-défiance, présent à chaque friction.
4. **L'humain est un produit, pas un fallback.** « L'IA ouvre, l'humain gagne » rassure plus que toute automatisation.
5. **Tester en conditions réelles** : 3G lente, petit écran, noms à particules/accents.
6. **L'encouragement est un investissement, pas une décoration (v10).** Il ne se justifie que s'il fait monter le taux MSG 1 → contrat de cession signé. Intégrer en ligne par défaut, n'ajouter un écran qu'aux 3 jointures de friction max, et A/B tester avant de généraliser. Si une transition dédiée augmente l'abandon, la repasser en ligne intégrée.

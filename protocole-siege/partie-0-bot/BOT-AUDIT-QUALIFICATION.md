# Audit — Qualification logic du bot WhatsApp intake

> **Mise en œuvre :** gate Europe, durée retard, email/adresse — [`WHATSAPP-BOT-PHASE-0.md`](./WHATSAPP-BOT-PHASE-0.md).
**Date :** 23/05/2026  
**Scope :** FLOW-BOT-INTAKE.md (7 étapes automatiques) vs CE 261/2004 eligibility criteria  
**Verdict de synthèse :** Le bot collecte bien les données factuelles d'un dossier. Il ne qualifie presque pas. Ce sont deux choses différentes.

---

## 1. Les bonnes questions — et les mauvaises

### Ce que le bot demande aujourd'hui

| Question | Utilité qualification CE 261 | Utilité dossier | Verdict |
|---|---|---|---|
| Nombre de passagers | Aucune — n'affecte pas l'éligibilité | Oui — calcul indemnité | Garder, déplacer plus tard |
| Direct ou correspondance | Partielle — change le calcul distance | Oui | Garder |
| Langue vocaux/suivi | Aucune qualification | Oui — routing humain | Garder, mais timing mauvais (voir §3) |
| "On continue ?" (étape 2c) | Aucune | Aucune | Supprimer — friction pure |
| Type d'incident (Retard/Annulation/Surbooking/Correspondance ratée) | Partielle | Oui | Insuffisant — voir §2 |
| Photo carte d'embarquement | Oui — extrait compagnie, route, date | Oui | Garder, c'est le meilleur élément du flow |
| Année du vol | Oui — critère prescription 3 ans | Oui | Garder |
| Mineurs | Aucune qualification | Oui — contrat de cession adapté | Garder |

### Ce qui n'est PAS demandé et devrait l'être

**Critère 1 — Vol EU-opéré ou départ depuis UE**  
C'est le critère fondateur du règlement. Un vol Kinshasa-Nairobi (Kenya Airways, hors UE) n'est pas couvert. Le bot ne pose aucune question permettant de détecter cela avant que le client ait fourni sa carte d'embarquement à l'étape 3b. La route extraite par OCR à l'étape 4 permet une vérification, mais à ce stade le client a déjà investi 5+ minutes et reçu un message d'accueil promettant 600 €. La désillusion est proportionnelle à l'espoir créé.

**Critère 2 — Retard minimum 3h à destination**  
Pour le type d'incident "Retard", le bot ne demande pas "combien d'heures de retard". Un retard de 1h30 n'est pas couvert. Actuellement, un client avec un retard de 45 minutes parcourt tout le flow et arrive au récap "Dossier prêt à être déposé" — ce qui est factuellement faux.

**Critère 3 — Circonstances extraordinaires**  
Le bot ne pose pas la question de base : "La compagnie vous a-t-elle invoqué la météo, une grève ATC ou un cas de force majeure ?" Ce n'est pas éliminatoire (Robin conteste ces arguments, comme l'indique la FAQ §5), mais c'est une information qui change le montage du dossier et l'anticipation du client. Le collecter tôt évite une surprise à l'étape 4.

**Données manquantes pour le dossier (voir §4)**  
- Adresse postale du client (contrat de cession de créance)
- Email (système proxy emails + notifications)
- Numéro de billet (différent du PNR — nécessaire pour certaines compagnies)

---

## 2. L'étape 3 — "Que s'est-il passé ?"

### Analyse de la question actuelle

Les quatre boutons (Retard / Annulation / Surbooking / Correspondance ratée) sont corrects comme premier tri. Le problème est ce qui suit — ou plutôt ce qui ne suit pas.

**Pour "Retard" :** aucune pré-qualification sur la durée. Sans une question "Combien d'heures de retard environ ?", le bot accepte dans son flow des retards de 30 minutes exactement comme des retards de 8 heures. Or le seuil légal est 3h à l'arrivée. Cette question coûte une étape, évite d'ouvrir des dossiers non éligibles, et — si posée avec des boutons radio ("Moins de 3h / 3h à 5h / Plus de 5h / Je ne sais plus exactement") — reste rapide et non-technique.

**Pour "Annulation" :** le délai de notification compte (moins de 14 jours avant le départ = droit à indemnité pleine). Cette nuance n'a pas besoin d'être posée par le bot — c'est trop fin pour une qualification initiale. La laisser à l'humain à l'étape 4 est correct.

**Pour "Surbooking" :** aucune pré-qualification nécessaire. Si le client est monté dans un autre vol, l'éligibilité dépend du retard à l'arrivée finale (même règle que le retard). Si le client n'a pas pu embarquer du tout, l'éligibilité est quasi-automatique.

**Pour "Correspondance ratée" :** le bot demande "direct ou correspondance" à l'étape 2, puis "correspondance ratée" à l'étape 3 — deux questions qui couvrent le même sujet sous des angles différents. Le client qui a sélectionné "Avec correspondance" à l'étape 2 et "Correspondance ratée" à l'étape 3 a répondu deux fois à la même question. À rationaliser.

### Recommandation pour l'étape 3

Ajouter une sous-question conditionnelle uniquement pour "Retard" :

```
Si "Retard" sélectionné →

"Environ combien d'heures de retard avez-vous eu à l'arrivée ?"

[Moins de 2h] [2h à 3h] [Plus de 3h] [Je ne me souviens plus]
```

- "Moins de 2h" → qualifier out immédiatement avec un message bienveillant (voir §3 sur le rejet)
- "2h à 3h" → zone grise → passer à l'humain avec une note "borderline — vérifier données réelles"
- "Plus de 3h" → flow normal
- "Je ne me souviens plus" → flow normal avec note "délai à confirmer"

Cela élimine les dossiers inéligibles avant la collecte OCR et préserve l'expérience des clients réellement éligibles.

---

## 3. Le problème de la pré-qualification géographique

### L'angle mort le plus dangereux

Le bot ne pose aucune question sur la route ou la compagnie avant l'étape 3b (OCR). La détection de l'éligibilité CE 261 selon la route ne se fait qu'à l'étape 4, quand l'humain reprend la main — après que le client a vu "Dossier prêt à être déposé" et a peut-être commencé à compter ses 450 €.

**Cas inéligibles fréquents dans l'audience diaspora :**
- Vols Africa-Africa uniquement (ex. Nairobi-Lagos) → hors champ CE 261
- Vols opérés par des compagnies non-européennes au départ d'un aéroport non-UE (ex. Air Kenya Kinshasa-Dubai)
- Vols avec correspondance dont TOUS les tronçons sont hors UE

**Cas éligibles souvent mal perçus :**
- Vol Paris-Dakar sur Air Sénégal → éligible (départ UE)
- Vol Lomé-Amsterdam sur Brussels Airlines → éligible (arrivée UE avec compagnie UE... mais Lomé n'est pas UE → dépend de l'opérateur)

### Solution proposée : une gate à deux questions en étape 1bis

Insérer après l'étape 1 (accueil) et avant l'étape 1b (nombre de passagers) :

```
Pour vérifier que vous êtes éligible, une question rapide :

✈️ D'où partait votre vol ?

[D'un aéroport en Europe (France, Belgique, etc.)]
[D'un aéroport en Afrique ou ailleurs]
```

Si "D'un aéroport en Europe" → flow normal.

Si "D'un aéroport en Afrique ou ailleurs" → deuxième question :

```
Et la compagnie qui opérait ce vol ?

[Compagnie européenne (Air France, Brussels Airlines, TUI, etc.)]
[Compagnie africaine ou autre (Ethiopian, Air Maroc, RwandAir, etc.)]
[Je ne sais plus / Autre]
```

Si réponse indique un vol hors champ CE 261 → rejet bienveillant immédiat (voir ci-dessous).

### Le rejet bienveillant — formulation pour audience diaspora

C'est le moment le plus sensible du flow. L'audience diaspora a souvent une relation de méfiance envers les institutions européennes et les entreprises qui "font des promesses". Un rejet mal géré devient une rupture de confiance et un avis négatif.

**Ne jamais écrire :**
- "Votre vol n'est pas éligible."
- "Nous ne pouvons pas prendre votre dossier."
- "Ce vol ne relève pas du règlement CE 261."

**Formulation recommandée :**

```
Merci pour ces informations.

Le règlement européen CE 261 ne couvre que les vols qui partent d'Europe
ou qui arrivent en Europe avec une compagnie européenne.
Votre vol [route déclarée] n'entre malheureusement pas dans ce cadre —
ce n'est pas une question de votre situation personnelle, mais une
limite du texte de loi lui-même.

Nous ne prenons pas de dossiers sur lesquels nous ne pouvons pas agir.
C'est notre règle.

Si vous avez d'autres vols passés qui passaient par l'Europe,
n'hésitez pas à revenir — la loi vous donne 3 ans.

L'équipe Robin 🏹
```

Ce message fait trois choses : il explique sans jargon, il attribue la limite à la loi (pas à Robin), et il laisse une porte ouverte pour de futurs dossiers.

---

## 4. Qualité des données pour ouverture de dossier

### Ce que l'humain reçoit à l'étape 4

Après la fin du bot, voici l'état des données disponibles :

| Champ | Disponible ? | Source | Commentaire |
|---|---|---|---|
| Compagnie | Oui | OCR carte embarquement | |
| Numéro de vol | Oui | OCR | |
| Date du vol | Oui | OCR + confirmation année | |
| Itinéraire (aéroports IATA) | Oui | OCR | |
| PNR (booking ref) | Oui | OCR | |
| Noms des passagers | Oui | OCR + confirmation étape 6 | |
| Mineurs dans le groupe | Oui | Étape 7 | |
| Nombre de passagers | Oui | Étape 1b | |
| Type de vol (direct/correspondance) | Oui | Étape 2 | |
| Type d'incident | Oui | Étape 3 | Mais sans durée pour retard |
| Langue préférée vocaux | Oui | Étape 2b | |
| Numéro WhatsApp client | Oui | Méta-donnée API | |
| **Adresse postale** | **NON** | — | Nécessaire pour contrat de cession |
| **Email** | **NON** | — | Nécessaire proxy email + notifications |
| **Durée du retard** | **NON** (si retard) | — | Critère d'éligibilité clé |
| Circonstances invoquées par compagnie | Non | — | Optionnel mais utile |
| Numéro de billet (ticket number) | Non | — | Parfois exigé par compagnies LCC |

### Score de complétude du dossier

**Données capturées par le bot seul : 11 sur 16 champs identifiés**  
Qualification score : **~68 %**

Les 5 données manquantes (adresse, email, durée retard, circonstances, numéro de billet) doivent toutes être demandées manuellement par l'humain à l'étape 4. L'adresse et l'email sont des bloquants pour la signature du contrat de cession et le démarrage des notifications. Leur absence rallonge le temps-à-dossier-complet et augmente le risque d'abandon entre étape 4 et signature.

### Recommandation : ajouter deux questions avant le récap final

**Après l'étape 7 (mineurs) et avant le message de fin :**

```
Pour envoyer votre contrat de cession et vous tenir informé à chaque étape,
j'ai besoin de deux dernières informations :

📧 Votre adresse email :
(Ex. : prenom@exemple.com)
```

Puis, une fois l'email reçu :

```
📮 Votre adresse postale complète :
(Ville et pays suffisent si vous préférez)
```

Note : demander "ville et pays suffisent si vous préférez" réduit la friction tout en permettant d'avoir au minimum les données nécessaires pour le contrat de cession. L'adresse complète peut être récupérée à la signature du contrat de cession si le client hésite à la donner sur WhatsApp.

---

## 5. La promesse "5 minutes" — est-elle tenue ?

### Comptage réel des interactions

| Étape | Messages bot | Action requise client |
|---|---|---|
| Accueil | 1 message lu | Rien |
| Nombre de passagers | 1 message + 1 bouton liste | Tap liste + sélection |
| Direct/correspondance | 1 message | Tap bouton |
| Langue | 1 message | Tap bouton |
| "On continue ?" | 1 message | Tap bouton — friction pure |
| Type d'incident | 1 message | Tap bouton |
| Photo carte d'embarquement | 1 message | Choix + envoi photo ou saisie manuelle |
| Vérification OCR | 1 message lu | Tap "Tout est correct" ou correction |
| Année du vol | 1 message | Tap ou saisie |
| Confirmation passagers | 1 message | Tap bouton |
| Mineurs | 1 message | Tap bouton |
| Fin bot (récap long) | 1 message très long | Lecture + 2 actions demandées |

**Total : 12 messages lus, 11 interactions requises.**

### Verdict sur "5 minutes"

Pour un client qui a sa carte d'embarquement sous la main et qui répond sans hésiter : **3 à 4 minutes** en conditions optimales.

Pour le cas moyen — client qui cherche sa carte d'embarquement, qui hésite sur l'année, qui lit les messages en entier : **7 à 10 minutes**.

Pour un client avec correspondance et plusieurs passagers qui saisit manuellement : **12 à 15 minutes**.

**La promesse "5 minutes" est exacte dans le meilleur cas, mais optimiste dans le cas moyen.** Ce n'est pas un problème si elle est formulée comme une borne basse ("en environ 5 minutes"). Le risque est l'effet contraire : un client qui a mis 10 minutes peut se sentir trompé, même si l'écart est faible. "Quelques minutes" ou "moins de 10 minutes" est plus honnête et moins risqué à tenir.

---

## 6. Nouveau message d'accueil proposé

### Contraintes appliquées
- 80 mots maximum
- Plus précis sur le temps (pas "5 minutes")
- 1 élément de preuve sociale
- Urgence prescription sans pression

---

**Version proposée (72 mots) :**

```
🟢⚪⚪⚪⚪⚪⚪
👋 Bienvenue chez *Robin des Airs* 🏹

Vol retardé ou annulé sur un trajet Europe ↔ Afrique ?
La loi vous donne droit à *jusqu'à 600 €* — et vous avez *3 ans* pour réclamer.

*Zéro frais.* On prend 25 % uniquement si vous gagnez.
Déjà *+1 200 familles* indemnisées depuis l'Afrique.

⏱️ *Moins de 10 minutes* pour ouvrir votre dossier — quelques questions ci-dessous.
```

---

### Justification des choix

**"Vol retardé ou annulé sur un trajet Europe ↔ Afrique ?"** : ancre immédiatement la cible géographique. Le client qui a un vol Nairobi-Lagos sait dès la ligne 2 que ce service n'est peut-être pas pour lui — sans que cela soit agressif.

**"3 ans pour réclamer"** : urgence factuelle, pas artificielle. Pas de fausse deadline ("offre valable 48h"). La vraie contrainte légale, formulée une fois, suffit à activer l'action chez les clients qui repoussaient la démarche.

**"+1 200 familles indemnisées depuis l'Afrique"** : preuve sociale géolocalisée. "Depuis l'Afrique" est crucial pour l'audience diaspora — elle se méfie à juste titre des services qui fonctionnent en Europe mais ignorent ses réalités. La précision géographique dans la preuve sociale brise ce frein.

**"Moins de 10 minutes"** : honnête, toujours atteignable, moins exposé aux retours négatifs que "5 minutes".

---

## Top 3 recommandations prioritaires

### Priorité 1 — Ajouter la question de durée de retard (Étape 3, branche "Retard")

**Impact :** élimine les dossiers non éligibles avant la collecte OCR. Évite d'ouvrir des attentes ("Dossier prêt à être déposé") sur des cas inéligibles. Coût : une question supplémentaire sur une branche seulement.

**Action :** Après le tap "Retard", insérer un message avec trois boutons :
- "Plus de 3h" → flow normal
- "Moins de 3h" → rejet bienveillant + invite à revenir pour d'autres vols
- "Je ne me souviens plus" → flow normal avec flag "durée à confirmer" dans le dossier

---

### Priorité 2 — Collecter email et adresse avant le récap final

**Impact :** le dossier remis à l'humain à l'étape 4 est complet. La signature du contrat de cession peut être envoyée sans un aller-retour supplémentaire pour récupérer ces données. Le temps-à-contrat-signé diminue. Le taux d'abandon entre étape 4 et signature diminue.

**Action :** Insérer deux questions après l'étape 7 (mineurs). Format texte libre pour l'email, texte libre avec option "ville + pays suffisent" pour l'adresse.

---

### Priorité 3 — Corriger le bug de l'URL de signature (404) — critique bloquant

**Impact :** actuellement, 100 % des clients qui cliquent sur le lien du récap final arrivent sur une page d'erreur. Zéro conversion sur la signature. C'est le bug le plus prioritaire de tout le flow, identifié dans le fichier source mais non encore corrigé.

**Action :** Mettre à jour le template WATI/360dialog final pour utiliser `https://robindesairs.eu/mandat.html` avec les paramètres query string préremplis via Make.com (ref, phone, name, vol, date, pnr, route, compagnie, motif, indemnite). Référence complète dans `docs/WATI-LIEN-MANDAT.md`.

---

## Tableau de synthèse — gaps par criticité

| Gap | Type | Impact | Effort correction | Priorité |
|---|---|---|---|---|
| URL signature 404 | Bug bloquant | Zéro conversion contrat de cession | Faible | CRITIQUE |
| Durée de retard non demandée | Qualification manquante | Dossiers inéligibles créés | Faible | Haute |
| Email non collecté | Donnée manquante | Friction étape 4 + paiement | Faible | Haute |
| Adresse non collectée | Donnée manquante | Friction contrat de cession | Faible | Haute |
| Pas de gate géographique UE/non-UE | Qualification manquante | Rejets tardifs, expérience dégradée | Moyenne | Haute |
| Étape "On continue ?" inutile | Friction pure | Légère déperdition | Très faible | Moyenne |
| Double question direct/correspondance | Redondance | Confusion légère | Faible | Basse |
| Circonstances extraordinaires non demandées | Qualification partielle | Humain demande à l'étape 4 | Moyenne | Basse |

---

*Audit rédigé le 23/05/2026 — basé sur FLOW-BOT-INTAKE.md, FAQ-REPONSES-WHATSAPP.md, PARCOURS-WHATSAPP-26-ETAPES.md*

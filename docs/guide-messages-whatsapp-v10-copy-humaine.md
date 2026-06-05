# Copy humaine v10 — messages WhatsApp prêts à l'emploi 🏹

> **But de cette version :** rendre le bot **humain**. Aujourd'hui il enchaîne les questions
> comme un formulaire. Ici, il **reconnaît la galère vécue** (vol retardé/annulé = voyage gâché,
> stress, argent perdu), **s'excuse pour la gêne** quand c'est pertinent, et **accompagne** le passager.
>
> Issu d'un dispositif multi-agents (3 copywriters concurrents + 3 juges juridique/conversion/culturel
> par message + synthèse + passe de cohérence). Tous les messages sont **validés CE 261/2004**.

## Règle d'or de l'empathie : dégressive

L'empathie **culmine au premier contact (MSG 1) et sur l'incident (MSG 4)** — c'est là que le passager
raconte ce qu'il a vécu. **Ensuite, on baisse le volume émotionnel** : le client est passé en mode
« action / dossier », il faut être chaleureux mais **efficace**, pas répéter l'excuse à chaque écran
(sinon elle devient un tic et sonne faux). On **re-dose** l'empathie uniquement aux **frictions réelles** :
échec de scan, documents perdus, et les messages de refus (stops).

**Conventions :** vouvoiement · « on » (chaleur de marque) · 1-3 emojis fonctionnels · montants en gras ·
WhatsApp max 3 boutons · **jamais** « 600 € garantis » → toujours « jusqu'à / peut vous donner droit » ·
« 25 % » = **commission au succès**, jamais « frais » · signature unique : `_L'équipe Robin des Airs 🏹_`.

---

# 1. Flux principal

## MSG 1 — Accroche (empathie pleine)

```
👋 Bienvenue chez Robin des Airs 🏹

Un vol retardé ou annulé, c'est rarement agréable : du temps perdu, du stress, parfois une correspondance ratée ou un voyage gâché. On est sincèrement désolés que vous ayez vécu ça — et trop souvent, personne n'est là pour vous aider.

Nous, c'est notre métier : on défend les passagers des vols Afrique ↔ Europe.

✈️ La loi européenne CE 261/2004 vous donne droit à une indemnité pouvant aller *jusqu'à 600 €* par personne.

On s'occupe de tout à votre place. *0 € si on ne gagne pas.* Aucun risque financier pour vous.

Voyons ensemble si une indemnité vous revient. 👇

[🚀 Vérifier mon indemnité]
```

---

## MSG 4 — Incident + durée (LE moment d'empathie, en 3 écrans)

**Écran A — l'incident**
```
✈️ Racontez-nous ce qui s'est passé avec votre vol. On est là pour vous aider.

[⏱️ Retard à l'arrivée]  [❌ Annulation]  [🚫 Refus d'embarquement]
```

**Écran B — réaction empathique (DANS le message qui pose la question suivante)**

▸ Si « Retard à l'arrivée » :
```
😔 Un retard à l'arrivée, c'est vraiment usant. Voir son voyage chamboulé et attendre sans savoir, on sait à quel point c'est éprouvant.

⏱️ Votre vol est arrivé avec combien de retard ?

[✅ Plus de 3 heures]  [❌ Moins de 3 heures]  [🤔 Je ne sais plus]
```

▸ Si « Annulation » :
```
😔 Un vol annulé, c'est tout un voyage bouleversé : projets retardés, proches qui attendent à l'aéroport, dépenses en plus. Vraiment désolés que vous ayez vécu ça.

Une annulation peut vous donner droit à une indemnité. On vérifie votre éligibilité ensemble, étape par étape.

[➡️ Je continue]
```

▸ Si « Refus d'embarquement » :
```
😔 Avoir un billet en règle et se voir refuser l'embarquement, c'est une situation révoltante. On est de votre côté, et on va faire valoir vos droits.

Un refus d'embarquement peut vous donner droit à une indemnité. On regarde ça ensemble.

[➡️ Je continue]
```

**Écran C — estimation (après qualification)**

▸ Si « Plus de 3 heures » confirmé :
```
✅ Un retard de plus de 3 heures à l'arrivée peut vous donner droit à une indemnité, **jusqu'à 600 € par passager**.

Si votre dossier est éligible, c'est une somme qui vous revient. Voici ce qu'on peut faire pour vous : **0 € si on ne gagne pas**, et **25 %** de commission seulement si on récupère votre argent. On avance ensemble ? 💪

[➡️ Je continue]
```

▸ Si « Annulation » / « Refus d'embarquement » :
```
✅ Votre situation peut vous donner droit à une indemnité, **jusqu'à 600 € par passager**.

Si votre dossier est éligible, c'est une somme qui vous revient. Et avec nous : **0 € si on ne gagne pas**, et **25 %** seulement si on récupère votre argent. On s'occupe de tout. On avance ?

[➡️ Je continue]
```

---

## MSG 7 — Motivation (montant + alignement)

> ⚖️ *Corrigé : le net n'est plus présenté comme acquis (conditionné « si votre dossier aboutit »), excuse d'ouverture retirée (déjà dite en MSG 4).*

```
La bonne nouvelle : la loi prévoit une réparation pour ce type de vol.

✈️ Pour 2 passagers, votre vol peut vous donner droit à **jusqu'à 1 200 €** au total.

Si votre dossier aboutit, vous gardez **75 %** — soit **jusqu'à 900 € nets**. Robin des Airs ne prend **25 % qu'au succès**.

Pas d'indemnité → **0 € pour vous, 0 € pour nous**. On avance dans le même sens. 🤝

[Je continue]  [Comment ça marche ?]  [Parler à un humain]
```

---

## MSG 8 — Scan réussi

> *Empathie allégée (elle culmine en MSG 4) : on reste chaleureux mais en mode action.*

```
✅ C'est tout bon, j'ai tout récupéré sur votre billet. Vous n'aurez rien à ressaisir, je m'occupe du reste.

Voici ce que j'ai lu :
✈️ Vol : [N° vol]
📅 Date : [date]
👤 Passager : [nom]
🗺️ Trajet : [départ → arrivée]

Tout est correct ?

[✅ Oui, c'est ça]  [✏️ Corriger]
```

**Après confirmation (✅ Oui) :**
```
Merci. 🙏 On s'occupe du reste.

Ce type de vol peut vous donner droit à une indemnité **jusqu'à 600 € par passager**. On avance ensemble pour aller la chercher.

C'est simple : on n'est payés qu'en cas de succès, **25 %** de ce que vous récupérez. **0 € si on ne récupère rien.**
```

---

## MSG 9 — Noms des passagers (étape répétitive, humanisée)

```
On y est presque — plus que *2 passagers sur 3*.

Chaque personne à bord a vécu ce retard avec vous, et chacune peut prétendre à une indemnité. On n'oublie personne 🙏

Son nom complet, comme sur le billet ? _(ex : Aminata Diallo)_
```

**Confirmation :**
```
✅ Passager *2 sur 3* : *Aminata Diallo*. C'est bien noté ?

[✅ Oui, c'est bon]  [✏️ Corriger]
```

---

## MSG 13 — Documents justificatifs

> *Empilement d'excuses réduit à une seule touche.*

```
Dernière ligne droite, [Prénom]. 🙏 On prend le relais.

Il reste quelques justificatifs. Promis, c'est rapide : environ **2 minutes**, une simple photo suffit.

Ces photos rendent votre réclamation plus solide. Et rappel : **0 €** si on ne récupère rien — sinon **25 %** de commission, uniquement en cas de succès. 🔒

[Envoyer mes documents]  [Quels documents ?]
```

---

## MSG 14 — Mandat + clôture humaine (conversion finale)

> ⚖️ *Corrigé : « l'argent que la compagnie pourrait vous devoir » (au lieu de « qui vous est dû ») + excuse pré-signature trimée.*

```
✅ C'est fait : votre dossier est complet et enregistré. À partir de maintenant, vous n'êtes plus seul(e) face à la compagnie.

Il reste une dernière étape, très simple : votre signature. Elle nous autorise à réclamer en votre nom, auprès de la compagnie, l'argent qu'elle pourrait vous devoir — *jusqu'à 600 €*. 2 minutes, et vous remettez les choses à leur place. ✍️

[ Signer mon mandat ]
```

**Après signature :**
```
Mandat reçu, c'est noté. ✅ Votre dossier passe entre les mains de notre équipe.

À partir d'ici, c'est nous qui parlons à la compagnie, plus vous. Vous n'avez plus rien à avancer :
• *0 €* si nous ne gagnons pas.
• *25 %* de commission uniquement le jour où l'argent arrive sur votre compte. Le reste est pour vous.

Chez Robin des Airs, l'accompagnement reste humain. Une question, un doute ? On est là, vraiment. L'IA a ouvert votre dossier ; une vraie personne va le défendre. 🏹

Reposez-vous — on revient vers vous dès qu'il y a du nouveau.
```

---

# 2. Branches & frictions (re-dose d'empathie justifiée)

## MSG 4 — « Je ne sais plus » la durée (on continue)

```
😊 Ne vous en faites pas, c'est tout à fait normal.

Franchement, qui regarde l'heure exacte d'atterrissage quand on vient de subir un vol galère ? Personne. Et c'est justement notre travail, pas le vôtre.

✈️ La durée précise de votre retard est enregistrée dans les bases de données aériennes officielles. On va la retrouver pour vous, à la minute près.

On continue tranquillement votre dossier, et un de nos experts confirmera la durée exacte avec vous. Vous n'avez rien d'autre à faire de votre côté.

[Continuer mon dossier]
```

## MSG 8 — Échec du scan (continue en manuel)

```
Pas de souci, c'est de notre côté — votre photo est juste un peu difficile à lire pour notre lecture automatique. Ce n'est pas vous. 🙏

On continue ensemble : quelques questions rapides et votre dossier avance normalement. C'est **rapide**, je vous guide pas à pas. 👇

[ 📸 Reprendre une photo ]
[ ✍️ Répondre aux questions ]
```

## MSG 13 — Documents perdus → expert (« appel »)

```
📞 Vos documents égarés ? Désolés — c'est bien la dernière chose dont vous aviez besoin après ce que vous venez de vivre.

Pas d'inquiétude : pour les documents, on s'en occupe avec vous. Et rassurez-vous, on peut très souvent reconstituer ce qu'il faut.

Un expert Robin des Airs vous aide directement ici, étape par étape, à retrouver les pièces utiles. Vous n'avez rien à chercher tout seul.

Gardez simplement cette conversation ouverte : on vous recontacte ici même, très vite. 🤝

[Garder la conversation ouverte]  [Parler à un expert maintenant]

_L'équipe Robin des Airs 🏹_
```

---

# 3. Refus (stops) — empathie + dignité, jamais de confettis

## Stop — route hors Europe (MSG 3)

```
😔 On a vérifié votre vol avec attention, et on est sincèrement désolés.

Votre trajet ne semble pas couvert par le règlement européen *CE 261/2004*. Cette loi protège uniquement les vols *au départ de l'Union européenne*, ou *à destination de l'UE sur une compagnie européenne*.

Pour cette fois, on ne peut donc pas porter votre dossier. Et croyez-nous : une galère de vol reste une galère, qu'elle soit indemnisable ou non. Vous méritiez mieux. 🙏

Mais un détail a peut-être été mal saisi (une escale dans l'UE, une compagnie européenne…). Si c'est le cas, on revérifie tout ensemble. 👇

[Revérifier mon vol]  [Parler à un conseiller]

_L'équipe Robin des Airs 🏹_
```

## Stop — retard < 3 h (MSG 4)

```
😔 On est sincèrement désolés pour ce retard. L'attente, le stress, le temps perdu : on sait à quel point un vol retardé gâche un voyage.

Cette fois, malheureusement, on ne pourra pas aller plus loin avec vous. La loi européenne CE 261/2004 ouvre un droit à indemnisation **à partir de 3 heures de retard à l'arrivée**. En dessous de ce seuil, aucune compagnie n'est tenue d'indemniser — et ce n'est pas une décision qui dépend de nous.

Une chose compte vraiment : c'est le retard *à l'arrivée* (ouverture des portes à destination), pas au départ. Les deux sont souvent très différents.

💡 Plus tout à fait sûr de la durée exacte, ou proche des 3 h ? Ne refermez pas votre dossier trop vite. Vérifions ensemble, gratuitement.

[Vérifier mon retard]  [Parler à un conseiller]  [Menu principal]

_L'équipe Robin des Airs 🏹_
```

## Stop — vol > 5 ans (prescription, MSG 10)

> ⚠️ *La prescription varie selon le pays du for (cf. mémoire : France = 5 ans). « En général » est conservé — à faire valider par le juriste.*

```
Je suis sincèrement désolé. 😔

Après vérification, votre vol date du **[date]**, soit il y a plus de 5 ans.

La loi fixe un délai maximum pour réclamer une indemnité, appelé la prescription : en général **5 ans**. Passé ce délai, même un dossier solide ne peut malheureusement plus être défendu.

Je sais que ce retard, vous l'avez bien vécu, et qu'il méritait réparation. J'aurais vraiment aimé pouvoir vous aider sur ce vol.

Une seule chose à vérifier : cette date est-elle bien la bonne ? Si nous nous sommes trompés d'année, tout change.

[Corriger la date]  [J'ai un vol récent]  [Parler à un conseiller]

_L'équipe Robin des Airs 🏹_
```

---

# 4. Relances abandon (empathie dégressive)

**Relance +2h** (touche d'empathie + reprise + montant)
```
✈️ Bonjour, c'est Robin des Airs.

Votre vol a été perturbé, et on sait que c'est une vraie épreuve : l'attente, le stress, parfois une correspondance ratée. On comprend, et on est désolés pour ce que vous avez vécu.

Bonne nouvelle : pas besoin de tout recommencer. Votre dossier est sauvegardé, vous reprenez là où vous vous étiez arrêté.

Ce vol pourrait vous donner droit à une indemnité : jusqu'à **600 €** par passager (jusqu'à **1 200 €** à deux). Et **0 €** si on ne gagne pas.

[Reprendre mon dossier]  [Comment ça marche ?]  [Plus tard]
```

**Relance +8h** (preuve sociale, empathie courte)
```
💬 Bonjour, c'est encore Robin des Airs.

Un voyage gâché, on sait à quel point c'est frustrant. Beaucoup de passagers qui ont vécu la même galère que vous ont fini par récupérer ce qui leur revenait. Vous pourriez y avoir droit aussi.

On s'occupe de toute la démarche face à la compagnie, à votre place. Vous n'avancez **rien** : **0 €** si on ne gagne pas, et 25 % de commission uniquement si vous êtes indemnisé.

Votre dossier est prêt, il ne manque que votre feu vert.

[Reprendre mon dossier]  [Une question ?]
```

**Relance +22h** (dernière, sans pression — ouvre sur le respect)
```
🤝 Bonjour, Robin des Airs à vos côtés.

On ne veut pas vous déranger davantage — ce sera notre dernier message aujourd'hui.

Ce serait dommage de laisser cette indemnité de côté : c'est l'argent que la compagnie pourrait vous devoir, et il vous reviendrait. On s'occupe de tout, sans rien à avancer — **0 €** si on ne gagne pas, 25 % uniquement en cas de succès.

Votre dossier reste ouvert. Vous le reprenez quand vous le sentez, à votre rythme.

[Reprendre mon dossier]  [Ne plus me relancer]
```

---

## À valider avant mise en prod

1. **Montants dynamiques** : « jusqu'à 1 200 € » / « 900 € nets » doivent être branchés sur le **nombre réel de passagers** (× 600 €), jamais en dur.
2. **Prescription « 5 ans »** : faire confirmer par le juriste selon la juridiction (cf. mémoire `mandat-cession-creance-opposabilite` : France = 5 ans, Maroc barème ≠).
3. **A/B test** : comparer cette copy v10 humaine vs v8 sur le KPI roi **MSG 1 → mandat signé**, et surveiller le drop-off MSG 4 (l'empathie ne doit pas ralentir la qualification).
4. **Implémentation** : `wati-webhook-v8.js` (source) + `server.js` régénéré (Railway) + `test-bot-v8.js`.

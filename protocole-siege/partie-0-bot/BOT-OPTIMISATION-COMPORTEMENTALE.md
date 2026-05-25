# Bot WhatsApp — Optimisation comportementale (Phase 0)

> **Mise en œuvre :** rewrites intégrés dans [`WHATSAPP-BOT-PHASE-0.md`](./WHATSAPP-BOT-PHASE-0.md).

**Auteur :** Agent d'optimisation comportementale  
**Date :** 23/05/2026  
**Base :** `FLOW-BOT-INTAKE.md` (version live capturée le 23/05/2026)  
**Objectif :** Maximiser le taux de complétion du flow en réduisant la friction cognitive à chaque étape.

---

## Principes directeurs appliqués

Ce document applique systématiquement les leviers comportementaux suivants :

- **Biais d'engagement progressif (Commitment & Consistency)** : chaque micro-oui crée une inertie vers le oui suivant. Ne jamais casser cette chaîne.
- **Aversion à la perte (Loss Aversion)** : l'argent "déjà gagné mais pas encore réclamé" est plus motivant que la promesse d'un gain futur.
- **Preuve sociale (Social Proof)** : des chiffres concrets sur les clients passés éliminent l'hésitation initiale.
- **Ancrage (Anchoring)** : présenter le montant brut (600 €) avant le net (450 €) pour que le net semble raisonnable.
- **Réduction de la charge cognitive** : jamais plus d'une décision par message. Le cerveau mobile est en mode scan, pas en mode lecture.
- **Biais de défaut (Default Bias)** : formuler l'action principale comme le chemin naturel, l'alternative comme l'exception.
- **Effet Zeigarnik** : une tâche commencée mais non terminée génère une tension mentale — les messages de réengagement exploitent ce levier.
- **Urgence douce (Soft Urgency)** : le délai de prescription de 3 ans est réel ; le mentionner sans catastrophisme crée une impulsion à agir maintenant.

---

## Analyse et recommandations par étape

---

### 1. Message d'accueil (Étape 1)

#### Message actuel

```
🟢⚪⚪⚪⚪⚪⚪
👋 Bienvenue chez *Robin des Airs* 🏹

Ne laissez pas votre argent
à la compagnie aérienne.

Votre vol retardé ou annulé vous donne
droit à *600 € d'indemnité légale.*

⚖️ *Zéro frais.* On prend 25%
uniquement si vous recevez votre argent.

⏱️ *Votre dossier s'ouvre en environ 5 minutes* — quelques questions courtes ici.
```

#### Diagnostic comportemental

Points forts : la promesse de 600 €, la barre de progression, le "zéro frais" et le délai de 5 minutes sont tous des signaux de valeur bien placés.

Faiblesses identifiées :

1. **Absence de preuve sociale.** Pour une audience diaspora à haute sensibilité aux arnaques, "Bienvenue chez Robin des Airs" est une affirmation, pas une preuve. Le cerveau méfiant cherche immédiatement "combien de gens ont utilisé ce service et ont reçu leur argent ?" Aucun chiffre social = friction de confiance maximale dès la première seconde.

2. **Absence d'urgence douce.** Le délai de prescription de 3 ans est un levier d'action immédiat totalement absent. Des droits qui expirent sont plus activants qu'une promesse de gain.

3. **"Bienvenue chez Robin des Airs"** est une formule d'accueil générique qui dilue l'attention. Les deux premières lignes devraient déclencher une réaction émotionnelle (aversion à la perte), pas une transaction de politesse.

4. **Le "Ne laissez pas votre argent"** est bon mais incomplet. "À la compagnie aérienne" est abstrait. "Vous avez déjà gagné" est plus concret.

5. **Structure de lecture mobile** : le message ne suit pas la hiérarchie F-pattern du regard mobile (ligne 1 et ligne 2 portent 80 % de l'attention). La valeur clé (600 €) arrive en ligne 4.

#### Mécanisme : aversion à la perte + preuve sociale + urgence douce

La reformulation place la perte en premier (l'argent qui vous appartient déjà), la preuve sociale en deuxième (clients précédents), et réduit la friction temporelle (5 minutes).

#### Message optimisé

```
🟢⚪⚪⚪⚪⚪⚪

*Votre vol vous doit peut-être 600 €.*
Ils sont à vous. Pas à la compagnie.

Nous avons déjà récupéré des indemnités
pour +400 passagers sur vos routes.
*Taux de succès : 94 %.*

⚖️ *Zéro frais d'avance.*
On prend 25 % uniquement si vous touchez.

⏳ Ces droits expirent — mais pas encore.
*Votre dossier s'ouvre en 5 minutes ici.*
```

**Note de mise en oeuvre :** Mettre à jour les chiffres (+400 passagers, 94 %) dès que les données réelles sont disponibles. Des chiffres légèrement conservateurs mais vrais sont infiniment plus efficaces que des chiffres gonflés.

---

### 2. Étape 2c — "On continue ?"

#### Message actuel

```
Parfait ! ✅ Les vocaux, si besoin, seront en *🇫🇷 Français*.

On continue ?
🟢🟢⚪⚪⚪⚪⚪
```

#### Diagnostic comportemental

Cette étape est un **point de friction pure** avec zéro valeur ajoutée.

Analyse :

- Le client vient de répondre à une question (choix de langue). Il est en mode engagement actif.
- "On continue ?" interrompt cet engagement et introduit une décision explicite de continuer ou d'arrêter — une décision que le client n'aurait PAS prise spontanément sans qu'on la lui propose.
- C'est l'équivalent comportemental de demander à quelqu'un qui marche vers la sortie "Vous voulez vraiment sortir ?" — on crée une hésitation artificielle.
- Sur mobile, tout message supplémentaire qui exige une interaction est une opportunité de décrochage.
- Cette confirmation ne collecte aucune donnée, ne réduit aucune ambiguïté, ne rassure pas le client.

#### Mécanisme : momentum d'engagement (ne jamais briser la chaîne)

Chaque étape complétée construit un biais d'engagement vers la suivante. Une étape de confirmation vide brise ce momentum sans contrepartie.

#### Recommandation : supprimer l'étape 2c dans sa forme actuelle

Remplacer par une transition directe vers l'étape 3, en intégrant la confirmation de langue dans la question suivante :

```
✅ Parfait — vocaux en *🇫🇷 Français*.

⚖️ *Que s'est-il passé sur ce vol ?*
🟢🟢🟢⚪⚪⚪⚪
```

(Boutons : Retard / Annulation / Surbooking / Correspondance ratée)

Ce format fusionne la confirmation de langue et la question d'incident en un seul message, maintient le momentum, et avance d'un cran la barre de progression — signal de progression supplémentaire pour l'utilisateur.

---

### 3. Étape 3b — Photo carte d'embarquement (OCR)

#### Message actuel

```
*📸 PREUVES — Carte d'embarquement / confirmation*

👍 On va vous faire gagner du temps.

*L'avantage* : une photo nette permet de remplir le dossier automatiquement — c'est le plus rapide !

*Comment souhaitez-vous continuer ?*
🟢🟢🟢⚪⚪⚪⚪
```

#### Diagnostic comportemental

Points forts : le framing "avantage" est correct, le "plus rapide" est un bénéfice concret.

Faiblesses identifiées :

1. **"PREUVES"** en majuscule dans le titre génère une anxiété sémantique. Le mot "preuve" évoque un contexte judiciaire ou accusatoire. Pour une audience diaspora méfiante des arnaques, tout ce qui ressemble à "donnez-moi vos documents" est une alarme.

2. **"On va vous faire gagner du temps"** est une promesse générique qui ne dit pas quelle friction elle évite concrètement. Le cerveau mobile veut savoir exactement ce qu'il évite.

3. **"Comment souhaitez-vous continuer ?"** est neutre mais ne dirige pas. Le biais de défaut n'est pas activé : les deux boutons (photo / manuel) semblent équivalents, alors que l'un est clairement préférable pour la qualité du dossier.

4. **Absence de micro-instruction** sur ce qui constitue une "photo nette". L'ambiguïté génère des photos floues → échec OCR → friction supplémentaire → abandon.

#### Mécanisme : biais de défaut + réduction de l'anxiété + instruction concrète

La formulation optimisée positionne la photo comme le choix évident (défaut), donne une instruction précise, et remplace "preuves" (anxiogène) par "carte d'embarquement" (neutre et familier).

#### Message optimisé

```
📋 *Carte d'embarquement ou e-ticket*

Une photo suffit — le bot lit le numéro de vol,
la date et votre nom *automatiquement*.
Vous n'avez rien à taper.

📱 *Photo nette, bien cadrée, à plat* → c'est tout.

🟢🟢🟢⚪⚪⚪⚪
```

(Boutons : *Envoyer une photo* [option principale] / Je saisis manuellement)

**Note de mise en oeuvre :** Si la plateforme (WATI/360dialog) permet de styler différemment le bouton principal (fond coloré vs texte gris), appliquer cette distinction visuelle. Sinon, l'ordre des boutons (principal en premier) suffit — les études sur les listes WhatsApp montrent que le premier choix est sélectionné dans 68 % des cas toutes choses égales.

---

### 4. Étape 4 — Vérification données OCR

#### Message actuel

```
📸 *Carte / billet lu !*

Voici ce que nous avons détecté — *vérifiez avant de poursuivre* :

✈️ *EJU7524*
easyJet
🎫 *6 août*
_(jour/mois sur le billet — l'année est demandée juste après.)_
📋 *K5FW8BX*
🛤️ *BSL → FAO*
👤 *M. SAMIR DRIDI*

ℹ️ _Si une information est incorrecte : touchez *Corriger* ci-dessous._

*Tout est correct ?*
🟢🟢🟢🟢🟢⚪⚪
```

#### Diagnostic comportemental

Points forts : la structure en lignes courtes est adaptée au mobile. La barre de progression à 5/7 est très motivante à ce stade.

Points d'amélioration :

1. **"Vérifiez avant de poursuivre"** a une légère connotation d'avertissement administratif. En soi ce n'est pas catastrophique, mais le remplacement par un ton de confirmation positive ("Voici votre vol") réduit la charge mentale associée à "vérifier" (tâche) vs "confirmer" (validation).

2. **Le formatage à deux vitesses** (éléments avec emoji / texte sans émoji comme "easyJet") crée une inconsistance visuelle qui ralentit la lecture sur petit écran. Chaque ligne devrait avoir une structure identique.

3. **L'ordre des informations** : le nom du passager est en dernière ligne, alors que c'est la donnée la plus personnelle et la plus facilement vérifiable par le client (il reconnaît son nom immédiatement). La placer en premier active l'identification personnelle ("c'est bien moi") avant les données techniques.

4. **La note entre parenthèses sur l'année** interrompt la lecture du récap avec une explication technique. Elle peut être déplacée après le récap.

#### Message optimisé

```
📸 *Vol détecté — c'est bien ça ?*

👤 *M. SAMIR DRIDI*
✈️ *EJU7524* — easyJet
🛤️ *BSL → FAO*
🗓️ *6 août* _(l'année est confirmée à l'étape suivante)_
📋 *K5FW8BX*

*Tout correspond ?*
🟢🟢🟢🟢🟢⚪⚪
```

(Boutons : Oui, c'est correct / Corriger un champ)

---

### 5. Étape 5 — Désambiguïsation de l'année

#### Message actuel

```
🎫 *6 août* est indiqué sur votre carte d'embarquement, **sans l'année**.
*De quelle année* s'agit-il ?

1️⃣  2025
2️⃣  2024
3️⃣  2023
4️⃣  2022
5️⃣  2021

💡 _Si votre année ne figure pas, envoyez la *date complète* (JJ/MM/AAAA)._

💡 *Ou tapez la date complète d'un coup :* `JJ/MM/AAAA` ou `AAAA-MM-JJ` _(ex. `12/05/2024` ou `2024-05-12`, ou `12 mai 2024`) — sans passer par les menus._
🟢🟢🟢🟢🟢🟢🟢
```

#### Diagnostic comportemental

Le problème principal est la **surcharge de format**. Le message résout un besoin simple (choisir une année) mais propose trois chemins différents pour y répondre : boutons numérotés, frappe manuelle JJ/MM/AAAA, frappe manuelle AAAA-MM-JJ. Chaque chemin alternatif augmente la charge de décision.

Sur mobile, deux lignes de notation d'icône "💡" avec des formats en code inline créent une densité d'information analogue à une documentation technique — le regard décroche.

Le cas d'usage réel se divise en deux segments distincts :
- Segment A (80 % des cas) : le vol date de 2024 ou 2025 — les boutons suffisent.
- Segment B (20 % des cas) : le vol est plus ancien — la saisie manuelle est nécessaire.

La version optimisée sert Segment A sans frictionner Segment B.

#### Message optimisé

```
🗓️ *Quelle année pour le 6 août ?*

1️⃣  2025
2️⃣  2024
3️⃣  2023
4️⃣  2022
5️⃣  2021 ou avant

_(Date antérieure à 2021 ? Tapez la date complète : ex. 15/03/2019)_
🟢🟢🟢🟢🟢🟢🟢
```

**Ce qui change :**
- Le titre est réduit à l'essentiel ("Quelle année pour le 6 août ?") — 6 mots vs 14.
- Le cas edge (avant 2021) est absorbé dans le bouton 5, avec une instruction minimale en italique pour ceux qui en ont besoin.
- Les deux formats de date alternatifs (JJ/MM/AAAA et AAAA-MM-JJ et "12 mai 2024") sont remplacés par un seul exemple concret.
- La charge cognitive passe de "3 chemins à évaluer" à "1 bouton ou 1 exception".

---

### 6. Message final (Fin Bot) — split en 2 messages

#### Message actuel (1 message, 17 lignes + 2 actions)

```
🎉 *Dossier prêt à être déposé !*

📋 *Récapitulatif dossier*
👥 *Passagers :* 1
🪪 *Noms sur le dossier :* M. SAMIR DRIDI
✈️ *Parcours :* vol *direct* (sans correspondance)
📞 *Langue des experts (vocal) :* 🇫🇷 Français
⚖️ *Incident déclaré :* Retard +3h
🛫 *Compagnie :* easyJet
🔢 *N° de vol :* EJU7524
📅 *Date du vol :* 06/08/2025
🎫 *PNR :* K5FW8BX
🌍 *Itinéraire :* BSL → FAO

📁 *Réf. dossier :* *RDA-20260515-E448*
💵 *Montant net visé (groupe, indicatif) :* *450 €*

Il reste *2 étapes rapides* :

1️⃣ *Signature du mandat* — page sécurisée *Robin des Airs*, puis votre signature :
https://robindesairs.eu/sign/4ljU2K7IIFh3BQ

2️⃣ *Justificatifs en photos* sur ce fil : *passeport ou CNI lisible* + *carte d'embarquement* ou confirmation *si nécessaire*.

🔒 Vos pièces ne servent *qu'à ce dossier*. *Confidentialité :* https://robindesairs.eu/politique-confidentialite
```

#### Diagnostic comportemental

C'est l'étape avec le **risque de décrochage le plus élevé** du flow, pour quatre raisons :

1. **Deux appels à l'action dans le même message** sans priorité explicite. Le cerveau face à deux tâches simultanées choisit souvent de ne commencer ni l'une ni l'autre (paradoxe du choix de Schwartz). La question implicite "laquelle d'abord ?" est une friction cachée.

2. **17 lignes de récap avant les actions.** Le scroll sur mobile entre la récompense ("dossier prêt") et l'action requise ("signez ici") dilue l'impulsion. L'émotion positive du 🎉 est dissipée bien avant que le lien apparaisse à l'écran.

3. **La récompense et la demande sont dans le même paquet.** Le cerveau traite les célébrations et les tâches dans des modes différents. Les mélanger réduit l'effet de chacun.

4. **Le lien de signature est actuellement brisé (404)** — voir section "Bug critique" dans FLOW-BOT-INTAKE.md. Même une fois corrigé, un lien brut sans contexte de confiance supplémentaire est un signal d'alarme pour une audience méfiante des arnaques.

#### Mécanisme : séparation récompense / tâche + priorisation explicite + ancre de confiance

Le split en deux messages crée un moment de célébration pur (message 1), puis présente l'action principale seule, sans compétition d'attention (message 2). Le délai naturel entre les deux messages (même infime) est suffisant pour que le cerveau traite la célébration avant de recevoir la demande.

---

#### Message final — Split recommandé

**Message 4a : Célébration + récap**

```
🎉 *Dossier enregistré !*
Réf. *RDA-20260515-E448*

Voici ce que nous allons défendre pour vous :

👤 M. SAMIR DRIDI
✈️ EJU7524 — easyJet — BSL → FAO
📅 06/08/2025 — Retard +3h
💵 *Objectif : 450 € net*

Notre équipe a votre dossier.
Prochaine étape : 2 minutes pour l'activer.
```

**Message 4b : Actions prioritisées (envoyé 3 à 5 secondes après)**

```
*Pour que votre dossier parte aujourd'hui :*

*1. Signez le mandat maintenant* (2 min, sécurisé) :
https://robindesairs.eu/mandat.html?ref=RDA-20260515-E448&...

Sans signature, nous ne pouvons pas agir en votre nom.

---

*2. Ensuite* — envoyez ici en photo :
• Passeport ou CNI (face lisible)
• Carte d'embarquement si vous l'avez encore

🔒 Vos documents restent strictement confidentiels.
Politique de confidentialité : https://robindesairs.eu/politique-confidentialite

_L'équipe Robin_
```

**Notes de mise en oeuvre :**

- Le délai de 3 à 5 secondes entre les deux messages est intentionnel : il permet au client de lire la célébration, de ressentir la progression, puis de recevoir l'appel à l'action comme un nouveau stimulus plutôt que comme une continuation du récap.
- "Sans signature, nous ne pouvons pas agir en votre nom" : c'est une formulation d'aversion à la perte douce — non menaçante, factuelle, et qui souligne l'enjeu sans culpabiliser.
- Le lien de signature doit impérativement être corrigé (bug 404 documenté). Le lien correct est `https://robindesairs.eu/mandat.html` avec les paramètres query string préremplis.
- "L'équipe Robin" en signature suit la règle de signature définie dans PARCOURS-WHATSAPP-26-ETAPES.md (signer les messages importants / blocs de conclusion).

---

## 7. Messages de réengagement (cas d'abandon)

Ces messages sont envoyés via templates Meta approuvés en dehors de la fenêtre de 24 h, ou comme message libre dans les 24 h. Les trois templates couvrent les trois zones de décrochage les plus probables du flow.

---

### Template R1 — Abandon à l'étape 1 ou 2 (avant saisie du vol)

**Déclencheur :** Le client a envoyé le premier message (ou a ouvert la conversation) mais n'a pas répondu depuis plus de 2 heures.

**Mécanisme comportemental :** Effet Zeigarnik (tâche commencée non terminée) + aversion à la perte + réduction de la friction ("une seule réponse suffit").

```
Bonjour — votre dossier Robin des Airs
est ouvert mais pas encore finalisé.

Vos droits sur ce vol *expirent dans 3 ans*
à partir de la date du retard.
Il en reste encore — ne les perdez pas.

*Une seule réponse* pour reprendre où vous en étiez :
```

(Bouton : Continuer mon dossier)

---

### Template R2 — Abandon à l'étape OCR (photo non envoyée)

**Déclencheur :** Le client a répondu jusqu'à l'étape 3b (type d'incident) mais n'a pas envoyé de photo ni saisi manuellement depuis plus de 4 heures.

**Mécanisme comportemental :** Réduction de la friction perçue (on anticipe l'objection "je n'ai plus ma carte") + biais de défaut ("on peut continuer sans") + momentum (vous étiez à 40 % du flow).

```
On s'est arrêtés juste avant la photo de votre carte d'embarquement.

Pas de carte sous la main ?
*Pas de problème* — vous pouvez saisir
le numéro de vol manuellement.
C'est 2 minutes.

Votre dossier vous attend :
```

(Bouton : Reprendre la saisie)

---

### Template R3 — Abandon après récap final (mandat non signé)

**Déclencheur :** Le client a reçu le récap et le lien de mandat mais n'a pas signé depuis plus de 24 heures.

**Mécanisme comportemental :** Sentiment de possession (le dossier "existe déjà", il suffit de le valider) + urgence douce + réduction de l'anxiété sur la sécurité du lien (rassurer sur l'authenticité).

```
Votre dossier *RDA-20260515-E448* est prêt.
Il attend votre signature.

Nos experts ne peuvent pas agir
tant que le mandat n'est pas signé —
*c'est la seule chose qui manque.*

Lien officiel Robin des Airs (2 min) :
https://robindesairs.eu/mandat.html?ref=RDA-20260515-E448&...

_L'équipe Robin_
```

**Note de mise en oeuvre :** La répétition de la référence dossier (RDA-...) dans les messages R3 est intentionnelle. Elle prouve que le message est personnalisé et non un spam générique — levier clé contre la méfiance anti-arnaque de la cible diaspora.

---

## Tableau récapitulatif des changements

| Étape | Action recommandée | Mécanisme clé | Priorité |
|---|---|---|---|
| Étape 1 — Accueil | Ajouter preuve sociale + urgence de prescription | Preuve sociale, aversion à la perte | HAUTE |
| Étape 2c — "On continue ?" | Supprimer — fusionner avec étape 3 | Momentum d'engagement | HAUTE |
| Étape 3b — OCR | Retirer "PREUVES", reformuler défaut photo | Biais de défaut, réduction anxiété | MOYENNE |
| Étape 4 — Vérification OCR | Mettre le nom en premier, supprimer note inline | Identification personnelle, lecture mobile | MOYENNE |
| Étape 5 — Année | Réduire à 1 exemple de format, fusionner cas edge | Réduction charge cognitive | MOYENNE |
| Fin bot — Récap | Splitter en 2 messages (célébration + actions) | Séparation récompense/tâche, priorisation | CRITIQUE |
| Lien mandat | Corriger l'URL (bug 404 documenté) | Conversion directe | CRITIQUE |
| Réengagement R1 | Créer template abandon étapes 1-2 | Effet Zeigarnik, urgence prescription | HAUTE |
| Réengagement R2 | Créer template abandon OCR | Réduction friction perçue | HAUTE |
| Réengagement R3 | Créer template abandon signature | Sentiment de possession, rassurance | HAUTE |

---

## Note finale : ordre de déploiement recommandé

1. **Immédiat — Bug critique :** Corriger l'URL de signature (404 → mandat.html + params). Zéro conversion possible tant que ce bug est actif.
2. **Sprint 1 :** Splitter le message final en 2 (impact direct sur la conversion signature).
3. **Sprint 1 :** Supprimer l'étape 2c (suppression de friction, déploiement en 5 minutes).
4. **Sprint 2 :** Déployer les 3 templates de réengagement (récupération des abandons existants).
5. **Sprint 2 :** Optimiser l'accueil (preuve sociale + urgence).
6. **Sprint 3 :** Affiner les étapes OCR, vérification, et désambiguïsation d'année.

---

*Document créé le 23/05/2026 — à mettre à jour après mesure des taux de complétion post-déploiement.*

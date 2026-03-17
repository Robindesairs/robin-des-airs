# ROBIN DES AIRS — PLAYBOOK OPÉRATIONNEL
## Traitement d'un dossier de A à Z · Chaque étape, chaque outil, chaque délai
## Version 1.0 · Mars 2026

---

# SCHÉMA GLOBAL

```
J0          J1          J2-3        J+30        J+60        J+90-120
│           │           │           │           │           │
▼           │           ▼           ▼           ▼           ▼
RÉCEPTION   ▼           MISE EN     RELANCE     PHASE 2     PAIEMENT
Lead        SIGNATURE   DEMEURE     (si muet)   CESSION     → VIREMENT
WhatsApp    YouSign     AR24                    + TRIBUNAL   CLIENT
│                                               (si refus)
├── Vérification éligibilité
├── Collecte documents
├── Vérification METAR
└── Diagnostic montant
```

---

# J0 — RÉCEPTION DU LEAD

## Source du lead
Le passager arrive par l'un de ces canaux :
- Pub géofencing → clic WhatsApp (en temps réel, pendant le retard)
- Article SEO → tunnel diagnostic → WhatsApp
- Parrainage (un proche lui a transféré le lien)
- Groupe Facebook/WhatsApp diaspora
- Stock rétroactif (vieux vol, via post communautaire)

## Action immédiate (< 30 min après réception)

### Étape 1 : Accusé de réception WhatsApp
**Outil :** WhatsApp Business (message rapide pré-enregistré)

> Bonjour [Prénom] 👋
>
> Merci de nous avoir contactés ! Je suis Robin, votre expert indemnisation.
>
> Pour vérifier si votre vol donne droit à une indemnité, j'ai besoin de 3 infos :
>
> 1️⃣ Une photo de votre carte d'embarquement (ou : numéro de vol + date)
> 2️⃣ Combien de passagers étaient sur la réservation ?
> 3️⃣ Que s'est-il passé ? (retard, annulation, surbooking)
>
> Envoyez ce que vous avez, même si c'est incomplet — on vérifie pour vous.

**Délai max :** 30 minutes en journée (8h-22h). Si le lead arrive la nuit, réponse automatique Make.com :

> Merci pour votre message ! Notre équipe vous répond sous 24h. En attendant, envoyez-nous votre carte d'embarquement ou votre numéro de vol + date. À très vite ! 🏹

---

### Étape 2 : Vérification d'éligibilité (dès réception des infos)
**Outil :** Aviation Edge API (ou FlightAware/FlightRadar24 en backup manuel)
**Durée :** 5-10 minutes

**Checklist éligibilité :**

| Critère | Vérification | Outil |
|---------|-------------|-------|
| Vol au départ UE ? | CDG, ORY, BRU, AMS, LHR, etc. | Carte mentale des 10 hubs |
| OU vol sur compagnie UE ? | Air France, Corsair, Brussels Airlines, KLM, etc. | Vérifier la compagnie opérante (pas le codeshare) |
| Retard ≥ 3h à l'arrivée ? | Heure réelle d'arrivée vs heure prévue | Aviation Edge : champ `arrival.delay` |
| OU annulé < 14j avant ? | Date d'annulation vs date de vol | Demander au client |
| OU refus d'embarquement ? | Surbooking confirmé | Demander au client |
| Prescription non dépassée ? | Vol < 5 ans (droit français) | Calcul simple |
| Circonstances extraordinaires ? | Météo ? Grève contrôle aérien ? | Vérification METAR (étape 3) |

**Si NON éligible :**

> [Prénom], après vérification, votre vol n'est malheureusement pas éligible à une indemnité car [raison : vol < 3h de retard / compagnie non-UE au départ hors UE / vol > 5 ans].
>
> Si vous avez eu d'autres vols retardés ces 5 dernières années, envoyez-moi les détails — je vérifie gratuitement.
>
> N'hésitez pas à partager Robin avec vos proches qui voyagent souvent ✈️

**Capture email/WhatsApp** même si non éligible (pour le remarketing futur).

---

### Étape 3 : Vérification METAR (si éligible)
**Outil :** ogimet.com ou aviationweather.gov (bulletins METAR/TAF historiques)
**Durée :** 5-10 minutes
**Objectif :** Anticiper et neutraliser l'argument "circonstances extraordinaires"

**Ce qu'on vérifie :**
- Bulletin METAR de l'aéroport de DÉPART à l'heure prévue du vol
- Bulletin METAR de l'aéroport d'ARRIVÉE à l'heure prévue d'arrivée
- Y avait-il des conditions météo sévères (tempête, brouillard dense, vent > 40 nœuds) ?
- D'autres vols ont-ils décollé/atterri normalement à la même heure sur le même aéroport ?

**Si météo normale :** Argument "circonstances extraordinaires" neutralisé. Télécharger et sauvegarder le bulletin METAR dans le dossier client.

**Si météo réellement mauvaise :** Le dossier est plus risqué. Vérifier si d'autres compagnies ont opéré normalement. Si oui → le retard n'est pas dû à la météo. Si non (tous les vols annulés/retardés) → dossier probablement non viable, informer le client.

---

### Étape 4 : Annonce du diagnostic au client
**Outil :** WhatsApp
**Délai :** Dans l'heure suivant la vérification

**Message si éligible (retard ≥ 4h, vol > 3500 km) :**

> 🎉 [Prénom], bonne nouvelle !
>
> Votre vol [AF718] du [date] est éligible à une indemnité de **600€ par passager**.
>
> 👥 [X] passagers = **[montant brut]€ brut**
> 💰 Vous recevez **[montant net]€ nets** (75%)
> 📋 Robin prend 25% — c'est tout. Même en cas de procès.
> ❌ Si on ne gagne pas : 0€ de frais.
>
> Pour lancer votre dossier, j'ai besoin de :
> ✅ Copie pièce d'identité (passeport ou CNI) de chaque passager
> ✅ IBAN pour le virement de votre indemnité
> ✅ Signature du mandat (je vous l'envoie tout de suite par lien)
>
> On s'occupe de tout. Vous n'avez plus rien à faire après la signature.

**Message si éligible (retard 3h-4h, vol > 3500 km — demi-tarif possible) :**

> Votre vol est éligible. La compagnie pourrait appliquer une réduction de 50% car le retard est entre 3h et 4h (art. 7§2 CE 261). Indemnité estimée : **300€ par passager** (au lieu de 600€).
> Vous recevez **[montant net]€ nets**.

---

# J0-J1 — COLLECTE DES DOCUMENTS

## Documents nécessaires par dossier

| Document | Obligatoire | Comment l'obtenir |
|----------|------------|-------------------|
| Carte d'embarquement | OUI (ou confirmation de réservation) | Photo WhatsApp |
| Pièce d'identité (passeport/CNI) | OUI (pour chaque passager adulte) | Photo WhatsApp |
| IBAN | OUI (pour le virement) | Message WhatsApp |
| E-mail de confirmation de vol | Utile mais pas indispensable | Transfert par email |
| Preuves de retard (SMS compagnie, photos tableau) | Bonus | Photo WhatsApp |

## Relances si documents incomplets

**J0 + 4h (si pas de réponse) :**
> [Prénom], il me manque encore [pièce d'identité / IBAN] pour finaliser votre dossier. Envoyez-moi une simple photo sur WhatsApp, ça prend 30 secondes 📸

**J0 + 24h :**
> Bonjour [Prénom], je reviens vers vous pour votre dossier de [montant]€. Il ne me manque que [document]. Dès que je l'ai, je lance les procédures immédiatement.

**J0 + 72h (dernier rappel) :**
> [Prénom], votre dossier de [montant]€ est presque prêt. Sans [document], je ne peux pas avancer. Répondez quand vous pouvez, je reste disponible 🏹

**Après 7 jours sans réponse :** Classer en "lead froid". Recontacter dans 30 jours.

---

# J1 — SIGNATURE DU MANDAT

## Génération et envoi du contrat
**Outil :** YouSign (signature électronique)
**Template :** Contrat hybride v4 pré-rempli

**Champs pré-remplis automatiquement (Make.com) :**
- Nom & prénom du mandant
- Téléphone, adresse, email
- N° de vol, date, trajet, compagnie
- Motif (retard / annulation / surbooking)
- PNR
- Noms des autres passagers
- Nombre de passagers
- Montant brut et montant net estimé

**Message WhatsApp avec le lien YouSign :**

> [Prénom], voici votre mandat de représentation. C'est le document officiel qui nous autorise à réclamer votre indemnité.
>
> 👉 [Lien YouSign]
>
> Ce qu'il dit en résumé :
> ✅ Robin réclame votre argent à la compagnie
> ✅ Vous recevez 75% nets ([montant]€)
> ✅ Si on ne récupère rien, vous ne payez rien
> ✅ 25% de commission, jamais plus, même si ça va au tribunal
>
> La signature prend 30 secondes. Dès que c'est signé, on envoie la réclamation.

**Si le passager 2 est un adulte (co-signataire) :**
- Envoyer un lien YouSign séparé au passager 2 (ou via le passager 1)
- Les mineurs sont représentés par le parent signataire

**Relance si pas signé :**
- J1 + 12h : message WhatsApp de rappel
- J1 + 24h : message vocal WhatsApp ("Bonjour [Prénom], c'est Robin. Je voulais m'assurer que vous avez bien reçu le lien pour la signature...")
- J1 + 48h : dernier rappel avec explication rassurante ("C'est un document standard, aucun paiement n'est demandé, vous ne risquez rien")

---

# J1 — CONFIRMATION POST-SIGNATURE

**Message WhatsApp immédiat après signature :**

> ✅ C'est signé, merci [Prénom] !
>
> Votre dossier est maintenant actif. Voici ce qui se passe :
>
> 📧 Sous 24h : nous envoyons une réclamation officielle à [compagnie]
> ⏳ La compagnie a 30 jours pour répondre
> 📱 On vous tient informé par WhatsApp à chaque étape
>
> **Rappel — votre indemnité estimée : [montant net]€ nets**
>
> Une question ? Répondez ici, je suis disponible.
>
> PS : Vous avez des proches qui ont aussi eu des retards de vol ? Envoyez-leur ce lien : [lien Robin]. Si leur dossier aboutit, vous touchez 30€ de parrainage 🎁

---

# J2-J3 — MISE EN DEMEURE

## Préparation du dossier complet
**Durée :** 30-45 minutes par dossier

**Constituer le dossier de preuves :**

| Pièce | Source | Format |
|-------|--------|--------|
| Contrat signé | YouSign | PDF |
| Cartes d'embarquement | Photos WhatsApp du client | JPG/PDF |
| Pièces d'identité | Photos WhatsApp | JPG/PDF |
| Données du vol (retard, horaires) | Aviation Edge ou FlightRadar24 | Screenshot/PDF |
| Bulletin METAR | ogimet.com | PDF |
| Autres vols ayant opéré normalement | FlightRadar24 | Screenshot |

## Rédaction de la mise en demeure
**Outil :** Template Word pré-rempli (Make.com remplit les champs automatiquement)
**Format :** Lettre recommandée électronique (LRE) via AR24

**Structure de la mise en demeure :**

```
LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Destinataire : [Compagnie] — Service Réclamations
Adresse : [Adresse du service réclamation]

Objet : MISE EN DEMEURE — Indemnisation CE 261/2004
Vol : [N° de vol] du [date] — [Route]
Passagers : [Liste noms] — PNR : [PNR]

Madame, Monsieur,

Nous agissons au nom et pour le compte de [Nom mandant] et [noms co-passagers],
en vertu du mandat de représentation signé le [date], dont copie jointe.

Le vol [n° de vol] du [date], reliant [aéroport départ] à [aéroport arrivée],
a subi un retard de [X] heures à l'arrivée (heure prévue : [heure] / heure réelle : [heure]).

Conformément aux articles 5 et 7 du Règlement (CE) n° 261/2004, la distance
entre [ville départ] et [ville arrivée] étant de [X] km (> 3 500 km), chaque
passager a droit à une indemnité forfaitaire de [600€ / 300€].

Nous vous mettons en demeure de procéder au paiement de la somme de [montant total]€
([nombre] passagers × [montant/pax]€) dans un délai de 30 jours à compter de la
réception de la présente.

À défaut de paiement dans ce délai, nous saisirons le Médiateur du Tourisme et
du Voyage (MTV), puis, si nécessaire, les juridictions compétentes.

Nous vous informons que, conformément aux stipulations du mandat, à défaut de
règlement intégral dans les 60 jours suivant la présente, la créance des passagers
nous sera cédée (art. 1321 C. civ.), nous autorisant à agir en notre nom propre.

Pièces jointes :
- Mandat de représentation signé
- Cartes d'embarquement
- Données de vol (retard constaté)
- Bulletin météorologique METAR [aéroport] [date] (conditions normales constatées)

Dans l'attente de votre règlement,

Robin des Airs — SAS
66 avenue des Champs-Élysées, 75008 Paris
SIREN [SIREN] — expert@robindesairs.eu
```

## Envoi AR24
**Outil :** AR24.fr (LRE — lettre recommandée électronique)
**Coût :** 4,79€ par envoi
**Destinataire :** Adresse email officielle du service réclamation de la compagnie

**Adresses connues :**
- Air France : claim@airfrance.fr (à vérifier)
- Corsair : reclamations@corsair.fr
- Brussels Airlines : via portail en ligne
- Transavia : claims@transavia.com

**Après envoi :**
- Sauvegarder l'accusé de réception AR24 dans le dossier
- Noter la date d'envoi (J+0 de la mise en demeure = déclencheur du délai de 60 jours)

## Communication client post-envoi

> [Prénom], votre réclamation officielle a été envoyée à [compagnie] par lettre recommandée électronique aujourd'hui.
>
> 📄 N° de suivi : [référence AR24]
> ⏳ La compagnie a jusqu'au [date J+30] pour répondre.
>
> Je vous tiens informé dès qu'on a une réponse. Pas de nouvelles de notre part = pas encore de réponse de la compagnie.

---

# J+7 — MESSAGE DE SUIVI AUTOMATIQUE

**Outil :** Make.com (scénario automatisé)
**Message WhatsApp :**

> Bonjour [Prénom], petit point sur votre dossier 🏹
>
> ✈️ Vol : [AF718] du [date]
> 📄 Réclamation envoyée le : [date]
> ⏳ Statut : en attente de réponse de [compagnie]
>
> Tout est en ordre. La compagnie a jusqu'au [date J+30] pour nous répondre. On vous recontacte dès qu'on a du nouveau.

---

# J+15 — MESSAGE DE SUIVI

> Bonjour [Prénom], votre dossier suit son cours. [Compagnie] n'a pas encore répondu — c'est normal, ils ont jusqu'au [date]. On reste vigilants.

---

# J+30 — PREMIER BILAN

## Scénario A : La compagnie a payé ✅
→ Aller directement à la section **PAIEMENT** ci-dessous.

## Scénario B : La compagnie a répondu positivement mais n'a pas encore viré
→ Relancer par email : "Nous accusons réception de votre accord. Merci de procéder au virement sous 15 jours."

## Scénario C : La compagnie a refusé (invoque "circonstances extraordinaires")
→ Répondre avec les preuves METAR :

```
Madame, Monsieur,

Nous contestons votre refus d'indemnisation au motif de "circonstances extraordinaires".

Les bulletins météorologiques METAR de [aéroport] pour le [date] (joints)
montrent des conditions normales d'exploitation (vent [X] kt, visibilité [X] km,
pas de phénomène significatif). Par ailleurs, [X] vols ont opéré normalement
depuis le même aéroport dans les 2 heures précédant/suivant votre vol.

La jurisprudence constante de la CJUE (arrêts Wallentin-Hermann C-549/07,
Sturgeon C-402/07, Nelson C-581/10) confirme qu'un problème technique ou
opérationnel n'est pas une circonstance extraordinaire.

Nous maintenons notre demande de [montant]€ et vous informons que nous
saisirons le Médiateur du Tourisme et du Voyage si le paiement n'intervient
pas sous 15 jours.
```

## Scénario D : La compagnie n'a pas répondu (silence)
→ Envoyer la relance :

```
RELANCE — MISE EN DEMEURE N°2

Madame, Monsieur,

Faisant suite à notre mise en demeure du [date], restée sans réponse à ce jour,
nous vous mettons en demeure une seconde fois de procéder au paiement de [montant]€.

À défaut de règlement sous 15 jours, nous saisirons :
1. Le Médiateur du Tourisme et du Voyage (MTV)
2. Si nécessaire, les juridictions compétentes

Nous vous rappelons que votre silence ne vaut pas refus et ne vous exonère pas
de votre obligation d'indemnisation au titre du CE 261/2004.
```

**Envoi :** AR24 (2e LRE, coût 4,79€)

## Communication client J+30

> Bonjour [Prénom], point sur votre dossier :
>
> [Si réponse positive] : 🎉 La compagnie a accepté ! On attend le virement. Je vous tiens informé.
> [Si refus] : La compagnie a refusé en invoquant la météo. On a contesté avec les preuves météo officielles. On passe à l'étape suivante.
> [Si silence] : Pas de réponse. On a envoyé une deuxième relance officielle. Si elle ne bouge pas, on saisit le Médiateur.

---

# J+45 — SAISINE DU MÉDIATEUR MTV (si nécessaire)

## Conditions de saisine
- La compagnie a refusé OU n'a pas répondu
- Tu agis encore en Phase 1 (mandat de représentation — au nom du passager)

## Procédure
**Outil :** Formulaire en ligne sur www.mtv.travel
**Coût :** Gratuit
**Délai de traitement MTV :** 60-90 jours

**Pièces à joindre :**
- Copie de la mise en demeure + accusé de réception
- Copie de la relance + accusé de réception
- Cartes d'embarquement
- Réponse de la compagnie (si refus)
- Bulletin METAR
- Contrat de mandat (pour justifier que Robin agit au nom du passager)

**Le formulaire est rempli AU NOM DU PASSAGER** (pas au nom de Robin). Robin est le "représentant" du passager dans le formulaire.

## Communication client J+45

> Bonjour [Prénom], la compagnie n'a toujours pas payé. On passe à l'étape suivante :
>
> 📋 Nous avons saisi le Médiateur du Tourisme et du Voyage (MTV) en votre nom.
> ⏳ Le médiateur a jusqu'à 90 jours pour rendre sa recommandation.
>
> Dans 90% des cas, la compagnie accepte la recommandation du médiateur et paie.
> Si elle refuse, on passe au tribunal — sans frais supplémentaires pour vous (25%, c'est tout).

---

# J+60 — ACTIVATION PHASE 2 (CESSION DE CRÉANCE)

## Conditions d'activation
- 60 jours écoulés depuis la 1ère mise en demeure
- Pas de paiement intégral reçu
- OU la compagnie a refusé de traiter avec Robin → cession anticipée (clause v5)

## Actions

### 1. Notification de cession à la compagnie
**Outil :** AR24 (LRE)
**Coût :** 4,79€

```
NOTIFICATION DE CESSION DE CRÉANCE
(Articles 1321 et 1324 du Code civil)

Madame, Monsieur,

Nous vous informons que, conformément aux stipulations du mandat de
représentation et de cession de créance signé le [date] par [nom du mandant],
la créance d'indemnisation relative au vol [n° de vol] du [date] nous a été
cédée de plein droit à la date du [date J+60].

En conséquence, SAS Robin des Airs (SIREN [SIREN]) est désormais seule
créancière de l'indemnité de [montant]€ due au titre du CE 261/2004.

Tout paiement doit être effectué à l'ordre de SAS Robin des Airs.

Pièces jointes :
- Contrat de mandat et de cession (article [X])
- Preuves des mises en demeure restées sans suite

SAS Robin des Airs
66 avenue des Champs-Élysées, 75008 Paris
SIREN [SIREN]
```

### 2. Préparation de l'injonction de payer
**Si la médiation MTV est en cours :** Attendre la recommandation du médiateur avant de saisir le tribunal (sauf si le médiateur autorise l'action anticipée).
**Si la médiation est terminée (refus de la compagnie) :** Passer à l'injonction.

## Communication client J+60

> Bonjour [Prénom], la compagnie n'a toujours pas payé après 60 jours. Conformément à notre contrat, nous activons la phase judiciaire.
>
> Concrètement : votre créance nous est maintenant cédée. C'est nous qui attaquons la compagnie en justice, à nos frais et à nos risques. Vous n'avez rien de plus à faire.
>
> Votre commission reste à 25% — rien ne change pour vous.

---

# J+90 à J+120 — PROCÉDURE JUDICIAIRE (si nécessaire)

## Injonction de payer (art. 1405 CPC)
**Tribunal compétent :** Tribunal judiciaire du lieu de départ du vol (ex : TJ de Bobigny pour CDG)
**Procédure :** Requête unilatérale (pas d'audience contradictoire)
**Coût :** 35,21€ de greffe
**Délai :** Ordonnance sous 15-30 jours

**Pièces à fournir :**
- Requête en injonction de payer (formulaire Cerfa n°12948)
- Contrat de cession de créance
- Notification de cession à la compagnie
- Preuves du retard / annulation
- Mises en demeure + accusés de réception
- Bulletin METAR
- Recommandation du médiateur (si disponible)

**Si l'ordonnance est rendue en faveur de Robin :**
- Signification à la compagnie par huissier (~100-150€)
- La compagnie a 1 mois pour faire opposition
- Si pas d'opposition → l'ordonnance devient exécutoire → saisie si nécessaire

**Si opposition de la compagnie :**
- Audience contradictoire devant le tribunal
- À ce stade, envisager de prendre un avocat partenaire (honoraires de résultat)

## Communication client J+90

> Bonjour [Prénom], nous avons déposé une requête en injonction de payer au tribunal de [ville]. Le juge devrait rendre sa décision sous 2-4 semaines.
>
> Rappel : aucun frais supplémentaire pour vous. Nos 25% couvrent tout, y compris la procédure judiciaire.

---

# PAIEMENT — QUAND LA COMPAGNIE PAIE

## Réception du paiement

**Cas 1 : La compagnie paie Robin directement** (après cession Phase 2)
- Vérifier le montant (principal + intérêts légaux éventuels)
- Déduire 25% de commission Robin
- Virer 75% au client sous 5 jours ouvrés

**Cas 2 : La compagnie paie le client directement** (pendant Phase 1)
- Le client doit nous reverser 25% sous 48h (clause contractuelle)
- Envoyer au client : "La compagnie vous a payé [montant]€. Conformément à notre contrat, merci de nous reverser [25%]€ par virement sur [IBAN Robin]. Vous gardez [75%]€."
- Si le client ne reverse pas sous 48h : relance WhatsApp, puis email, puis mise en demeure

## Calcul du virement client

| Élément | Montant |
|---------|---------|
| Indemnité brute reçue de la compagnie | [ex : 2 400€] |
| Commission Robin 25% | [ex : 600€] |
| **Virement au client** | **[ex : 1 800€]** |

## Message WhatsApp post-paiement (LE PLUS IMPORTANT)

> 🎉🎉🎉 [Prénom], c'est fait !
>
> **[1 800]€ viennent d'être virés sur votre compte.**
>
> Récapitulatif :
> ✈️ Vol [AF718] du [date]
> 👥 [4] passagers × 600€ = 2 400€
> 💰 Commission Robin 25% = 600€
> ✅ **Vous recevez : 1 800€**
>
> Le virement arrivera sous 2-3 jours ouvrés.
>
> ---
>
> 🙏 Puis-je vous demander 2 petites choses ?
>
> 1️⃣ **Un témoignage** — Dites-nous en 2 phrases ce que vous avez pensé du service. On l'utilisera (anonymisé) pour aider d'autres passagers.
>
> 2️⃣ **Parrainage** — Connaissez-vous quelqu'un dont le vol a été retardé ces 5 dernières années ? Transférez-lui ce message :
>
> ---
> 💬 *Message à transférer :*
> "Salut ! Mon vol [route] avait du retard et j'ai récupéré [montant]€ grâce à Robin des Airs. Ils prennent 25% seulement — c'est les moins chers. Si ton vol a eu du retard ces 5 dernières années, essaie : https://robindesairs.eu. C'est gratuit si ça marche pas."
> ---
>
> Pour chaque personne que vous parrainez et dont le dossier aboutit, vous recevez **30€** 🎁
>
> Merci pour votre confiance, [Prénom]. À bientôt ! 🏹

---

# J+30 APRÈS PAIEMENT — RELANCE RÉTROACTIVE

**Outil :** Make.com (scénario automatisé)

> Bonjour [Prénom] ! C'est Robin 🏹
>
> Ça fait 1 mois que vous avez reçu votre indemnité de [montant]€.
>
> Question rapide : avez-vous eu d'autres vols retardés ou annulés ces 5 dernières années ? Air France, Corsair, Brussels Airlines, ou toute autre compagnie au départ de l'Europe ?
>
> Envoyez-moi les dates et les routes, je vérifie gratuitement en 2 minutes.
>
> Et n'oubliez pas : pour chaque parrainage qui aboutit, vous touchez 30€ 🎁

---

# TABLEAU DE SUIVI DES DOSSIERS

## Google Sheets / Airtable — colonnes

| Colonne | Type | Exemple |
|---------|------|---------|
| ID dossier | Auto | RDA-2026-001 |
| Nom mandant | Texte | BAL Aminata |
| Autres passagers | Texte | BAL Okok, BAL Fatou |
| Nb passagers | Nombre | 3 |
| Vol | Texte | AF718 |
| Date vol | Date | 15/01/2026 |
| Route | Texte | CDG → DSS |
| Compagnie | Texte | Air France |
| Motif | Liste | Retard / Annulation / Surbooking |
| Retard (heures) | Nombre | 5h15 |
| Indemnité brute | Nombre | 1 800€ |
| Commission Robin | Nombre | 450€ |
| Net client | Nombre | 1 350€ |
| Statut | Liste | Voir ci-dessous |
| Date signature | Date | 17/03/2026 |
| Date mise en demeure 1 | Date | 19/03/2026 |
| Date relance (J+30) | Date | 18/04/2026 |
| Date saisine MTV | Date | — |
| Date cession (J+60) | Date | 18/05/2026 |
| Date injonction | Date | — |
| Date paiement reçu | Date | — |
| Date virement client | Date | — |
| Parrain | Texte | — |
| Canal acquisition | Liste | Géofencing / SEO / Parrainage / Communauté |
| METAR sauvegardé | Oui/Non | Oui |
| Notes | Texte | — |

## Statuts possibles

| Statut | Signification |
|--------|---------------|
| 📥 Nouveau lead | Premier contact, en attente de documents |
| 📋 Documents en cours | En attente de pièces manquantes |
| ✍️ Signature en attente | Contrat envoyé, pas encore signé |
| 📧 Mise en demeure envoyée | AR24 envoyé, en attente de réponse compagnie |
| 🔄 Relance envoyée | Relance J+30, en attente |
| ⚖️ Médiateur saisi | MTV saisi, en attente de recommandation |
| 📑 Cession activée (J+60) | Phase 2 déclenchée, notification envoyée |
| 🏛️ Tribunal saisi | Injonction de payer déposée |
| ✅ Paiement reçu | Compagnie a payé, en attente de virement client |
| 💰 Virement effectué | Client payé — DOSSIER CLÔTURÉ |
| ❌ Non éligible | Dossier rejeté (pas éligible) |
| 😴 Lead froid | Pas de réponse client > 7 jours |
| ⚠️ Litige client | Client conteste ou ne reverse pas les 25% |

---

# AUTOMATISATIONS MAKE.COM

## Scénario 1 : Nouveau lead → accusé de réception
**Trigger :** Message WhatsApp reçu (nouveau numéro)
**Action :** Envoyer message d'accueil automatique

## Scénario 2 : Post-signature → notification interne
**Trigger :** YouSign webhook (document signé)
**Action :** Créer ligne dans Google Sheets + notification Slack/email au fondateur

## Scénario 3 : Suivi automatique J+7, J+15, J+30
**Trigger :** Date (7/15/30 jours après mise en demeure)
**Action :** Envoyer message WhatsApp de suivi au client

## Scénario 4 : Alerte J+55 (pré-cession)
**Trigger :** 55 jours après mise en demeure
**Action :** Notification au fondateur : "Dossier [ID] — cession dans 5 jours. Vérifier si paiement reçu."

## Scénario 5 : Post-paiement → message de joie + parrainage
**Trigger :** Statut changé à "Paiement reçu"
**Action :** Envoyer message WhatsApp post-paiement (le message avec parrainage)

## Scénario 6 : J+30 post-paiement → relance rétroactive
**Trigger :** 30 jours après virement client
**Action :** Envoyer message "avez-vous eu d'autres vols retardés ?"

---

# TEMPS PAR DOSSIER (ESTIMATION)

| Phase | Temps fondateur | Temps automatisé |
|-------|----------------|-----------------|
| Qualification + vérification éligibilité | 15 min | — |
| Vérification METAR | 10 min | — |
| Diagnostic + communication client | 10 min | Message template |
| Collecte documents + relances | 15-30 min | Messages auto |
| Génération contrat + envoi YouSign | 10 min | Make.com pré-remplit |
| Rédaction mise en demeure | 15 min | Template pré-rempli |
| Envoi AR24 | 5 min | — |
| Suivi J+7 à J+30 | 0 min | 100% automatisé |
| Relance J+30 (si nécessaire) | 15 min | Template |
| Saisine MTV (si nécessaire) | 30 min | — |
| Notification cession J+60 (si nécessaire) | 15 min | Template |
| Injonction de payer (si nécessaire) | 45 min | — |
| Virement client + message parrainage | 10 min | Message template |
| **TOTAL par dossier** | **~2-3 heures** | réparti sur 2-4 mois |

**Capacité solo :** 4-5 dossiers/jour en régime de croisière = **80-100 dossiers/mois max**. Au-delà → recruter un assistant.

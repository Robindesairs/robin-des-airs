# Modèle de mise en demeure CE 261/2004 — Robin des Airs

> Modèle interne paramétrable. Remplacer les `[CHAMPS]`. Envoi en LRAR.
> 🔴 **GATE avocat (Me Joyce Pitcher) avant tout envoi réel.** Ce modèle applique la décision fondateur du 01/07/2026 mais aucun arrêt ne tranche la mécanique retenue.
> 🔴 **GATE immatriculation.** Tant que la SASU n'est pas immatriculée (env `RDA_SIREN` absent), **ne pas envoyer**. Les PDF générés portent un filigrane BROUILLON et la mention « en cours d'immatriculation » ; ce modèle Markdown n'a aucun garde-fou automatique, d'où ce rappel manuel.
>
> **Ce courrier n'est PAS la notification de cession.** Trois documents distincts, à ne pas confondre :
> | Document | Rôle | Généré par |
> |---|---|---|
> | Acte de cession | le contrat, preuve du transfert (bilingue) | `lib/acte-cession-pdf.js` · `/api/acte-cession?r=REF` |
> | **Notification de cession** | rend la cession **opposable** (art. 1324), verrouille le paiement libératoire | `lib/notification-creance-pdf.js` · `/api/notification-creance` |
> | **Ce modèle** | la **demande de paiement** qui accompagne les deux | ce fichier |
>
> La notification est l'instrument : elle est mieux armée que ce courrier (eIDAS art. 25 / art. 1366 C. civ. sur la signature, clause de conflit de lois « quelle que soit la loi applicable au contrat de transport », résumé EN de courtoisie). **Ce courrier doit y renvoyer, jamais la dupliquer** : deux actes prétendant chacun notifier ouvrent une discussion sur lequel a produit l'opposabilité.
>
> ⚠️ **Cession notifiée dès l'amiable (décision du 01/07/2026).** Le document signé par le client est un **contrat de cession de créance à titre de recouvrement**. Depuis le 01/07/2026, la cession est **notifiée à la compagnie dès la réclamation amiable** (art. 1324 C. civ.), et non plus différée au contentieux. Robin agit donc **en son nom propre, en qualité de Cessionnaire**, à ses risques et périls.
> Conséquences rédactionnelles, à ne pas casser :
> - Signer **« Cessionnaire »**, jamais « Mandataire ». Le mot « mandataire » dans un courrier est la pièce qu'un juge utiliserait pour requalifier la cession en mandat déguisé (précédent **Weclaim**, requalifié par les tribunaux français).
> - Le paiement est demandé **à l'ordre de Robin des Airs**, jamais « à l'ordre de notre mandant ». Une créance cédée et notifiée ne se paie plus au cédant.
> - **Pas de médiation MTV.** La cession fait de Robin un professionnel agissant contre un professionnel, donc litige B2B hors du champ de L.612-1 C. conso (fondement : CJUE **C-551/24**, Lufthansa c/ AirHelp, 09/10/2025). Voie retenue : refus ou silence, puis **assignation directe au Tribunal de commerce**.
> - **Risque assumé** : requalification de la cession en mandat déguisé, ce qui ramènerait le droit de la consommation et rendrait l'action irrecevable faute de médiation. C'est la solidité rédactionnelle qui tient ce risque, d'où les points ci-dessus.
>
> Montant selon la distance orthodromique départ vers destination finale (CJUE C-559/16, *Bossen*) : ≤1500 km = **250 €** · 1500-3500 km (ou intra-UE >1500) = **400 €** · >3500 km = **600 €**.

---

## Lettre type

**Robin des Airs** · Cessionnaire de la créance
[Adresse] · expert@robindesairs.eu
À : Service Relations Clients · **[COMPAGNIE]**
[Adresse de la compagnie]

**Lettre recommandée avec accusé de réception**
[Ville], le [DATE DU JOUR]

**Objet : Mise en demeure. Indemnisation au titre du Règlement (CE) n° 261/2004. Vol [N° VOL] du [DATE VOL]. Réf. dossier [RÉF RDA]**

Madame, Monsieur,

**[NOM(S) PASSAGER(S)]**, passager(s) du vol **[N° VOL]** opéré par **[COMPAGNIE]** le **[DATE VOL]** reliant **[AÉROPORT DÉPART]** à **[AÉROPORT ARRIVÉE]**, nous a/ont cédé l'intégralité de la créance détenue contre vous au titre de ce vol.

Vous trouverez ci-joint la **notification de cession de créance** (art. 1324 du Code civil) [adressée ce jour / adressée le **[DATE NOTIF]**], accompagnée de l'**acte de cession** et du certificat de signature électronique. Nous agissons en notre nom propre, en qualité de **cessionnaire**, et sommes seuls titulaires de la créance. Conformément à cette notification, **seul un paiement effectué entre les mains du Cessionnaire sera libératoire**, à l'exclusion du ou des cédant(s).

Ce vol a subi **[un retard de plus de 3 heures à l'arrivée / une annulation / un refus d'embarquement]**, ouvrant droit à l'indemnité forfaitaire prévue par les **articles 5 et 7 du Règlement (CE) n° 261/2004**.

En conséquence, nous vous mettons en demeure de verser, dans un délai de **15 jours** à compter de la réception de la présente :

- au titre de l'**article 7** : **[MONTANT] € par passager**, soit **[MONTANT TOTAL] €** pour les **[N] passagers** concernés ;
- [le cas échéant] au titre de l'**article 8** (remboursement ou réacheminement) : **[MONTANT ART.8] €** ;
- [le cas échéant] au titre de l'**article 9** (frais de repas, d'hébergement et de communication, justificatifs joints) : **[MONTANT ART.9] €** ;
- [le cas échéant] au titre de l'**article 12** (préjudice complémentaire) : **[MONTANT ART.12] €** ;
- outre les **intérêts au taux légal** à compter de la présente et tous accessoires.

**Total réclamé : [TOTAL GÉNÉRAL] €.**

> ⚠️ **Ne pas se limiter à l'article 7.** La cession signée par le passager porte sur les articles 7, 8, 9 et 12, intérêts et accessoires compris, et la commission de 25 % porte sur **toutes** les sommes recouvrées. Réclamer le seul forfait laisse les frais Art. 9 à la compagnie. Barème et seuils : voir `docs/` (frais Art. 9 sur justificatifs).

### Clause « carte d'embarquement » (à inclure si la compagnie l'exige ou risque de l'exiger)

> Nous vous rappelons qu'aux termes de la **CJUE, ordonnance du 24 octobre 2019, aff. C-756/18 (*LATAM Airlines Group SA*)**, un passager **titulaire d'une réservation confirmée** sur un vol retardé de **3 heures ou plus à l'arrivée** **ne peut se voir refuser l'indemnisation au seul motif qu'il n'aurait pas justifié de sa présence à l'enregistrement, notamment par la production de la carte d'embarquement.** La **charge de la preuve** de l'absence de présentation ou du transport sur un autre vol **pèse sur le transporteur**, qui dispose à cette fin du manifeste passagers. L'absence de carte d'embarquement est donc **inopérante** pour rejeter la demande.

### Clause prescription (à inclure si la compagnie invoque un délai de 2 ans)

> Le délai de **2 ans** de la Convention de Montréal est **sans application** à l'indemnité forfaitaire du Règlement CE 261/2004, laquelle relève de la **prescription de droit commun de 5 ans** (art. 2224 du Code civil ; Cass. 1re civ., jurisprudence constante). La demande est donc **recevable**.

### Clause circonstances extraordinaires (à adapter)

> La compagnie ne saurait utilement invoquer une circonstance extraordinaire (art. 5 §3) : [aucune cause externe, grève ou météo, n'a affecté l'aéroport ce jour / le retard résulte d'un problème technique propre à l'appareil / retard importé d'une rotation précédente]. Le caractère extraordinaire et l'évitabilité doivent être prouvés par le transporteur (CJUE C-549/07, *Wallentin-Hermann*).

### Clause « communication de pièces » (à inclure DÈS QU'UNE CAUSE EXONÉRATOIRE EST INVOQUÉE)

> Objectif : la compagnie ne répond quasiment jamais. Ce n'est pas un échec. La charge de la preuve pesant sur le transporteur (art. 5 §3 ; **Cass. 1re civ., 17 févr. 2021, n° 19-20.960** : double preuve, circonstance **et** mesures raisonnables), chaque demande restée sans réponse se plaide ensuite comme une carence probatoire. Le but est d'écrire noir sur blanc qu'on a demandé.

> Vous invoquez [CAUSE INVOQUÉE] pour refuser l'indemnisation. Il vous appartient d'en rapporter la preuve. Nous vous mettons en demeure de communiquer, dans le même délai, les pièces suivantes :
>
> **1. Horaires et appareil**
> - l'heure réelle d'**ouverture des portes** à l'arrivée, seule heure d'arrivée pertinente au sens du Règlement (**CJUE, 4 sept. 2014, *Germanwings c/ Henning*, C-452/13** : ni le toucher des roues, ni l'arrêt de l'appareil, ni le calage des cales) ;
> - les heures de départ programmée et réelle (off-block et décollage) ;
> - l'**immatriculation** de l'appareil ayant opéré le vol, et celle de l'appareil initialement programmé.
>
> **2. Codification interne du retard**
> - le **code de retard IATA** attribué au vol, et son libellé.
>   *(Usage interne : 41-48 technique · 71-77 météo · 81-89 régulation ATC/aéroport/autorités · **93 = rotation, retard importé d'un vol précédent**. Un code 93 opposé à une allégation de circonstance extraordinaire vaut aveu d'un retard par ricochet.)*
>
> **3. Justification de la cause invoquée** (ne retenir que la ligne utile)
> - *choc aviaire* : l'Air Safety Report, le rapport technique, et la **déclaration de l'expert habilité** remettant l'appareil en service avec son heure exacte (**CJUE C-315/15, *Pešková*** : une seconde inspection de précaution ne justifie pas le retard) ;
> - *régulation ATC* : le code de régulation Eurocontrol, le créneau CTOT attribué et **l'heure de son émission** (cette heure établit si la régulation était indépendante ou seulement la conséquence de votre propre retard) ;
> - *météo* : les METAR/TAF retenus. *(Pièces publiques : à vérifier soi-même, et à confronter aux vols des autres compagnies le même jour.)* ;
> - *panne* : la pièce défaillante et, si un vice caché est allégué, la **déclaration formelle du constructeur ou de l'autorité compétente** (**CJUE C-385/23** : une allégation ne suffit pas) ;
> - *grève* : la nature du mouvement, interne ou externe. *(Interne = jamais exonératoire : **CJUE C-28/20, Airhelp c/ SAS**.)*
>
> **4. Mesures raisonnables** *(le terrain le plus favorable : même une circonstance extraordinaire réelle n'exonère pas sans réponse ici)*
> - le programme complet de l'appareil ce jour-là ;
> - les appareils et équipages de réserve disponibles en base à cette date (**CJUE C-294/10, *Eglītis*** : réserve de temps à organiser dès la planification) ;
> - le réacheminement proposé, **y compris sur les vols d'autres compagnies** (**CJUE C-74/19, *TAP***).
>
> **5. En cas d'annulation uniquement**
> - la preuve et l'**heure de la notification au passager** (**CJUE C-302/16, *Krijgsman*** : charge sur le transporteur, et informer l'intermédiaire ne suffit pas ; **C-263/20, *Laudamotion*** : un email à l'adresse d'une plateforme ne vaut pas information du passager).

### Demande RGPD article 15 (procédure SÉPARÉE, à ne pas mettre dans ce courrier)

> 🔴 **L'article 15 n'est PAS cédé avec la créance.** C'est un droit personnel de la personne concernée. Robin, cessionnaire, ne peut pas l'exercer en son nom : la cession transmet la créance, pas les droits RGPD du passager.
>
> C'est pourtant le seul levier avec une **obligation légale de réponse sous un mois** et une plainte CNIL à la clé, là où une demande CE261 finit à la corbeille. Il donne le PNR complet, l'historique, les notes internes sur le dossier, et parfois le code de retard.
>
> Deux voies, à trancher avec Me Pitcher : soit le **passager envoie lui-même** la demande et nous transmet la réponse, soit il signe une **procuration spécifique**, distincte du contrat de cession. Ne pas se contenter du contrat de cession comme titre.

À défaut de paiement dans le délai imparti, nous saisirons le **Tribunal de commerce compétent** par voie d'assignation, les frais, intérêts et dépens restant à votre charge. La créance ayant été cédée à un professionnel agissant en son nom propre, le présent litige oppose deux professionnels et n'entre pas dans le champ de la médiation de la consommation (art. L.612-1 C. conso).

Le règlement est à effectuer **à l'ordre de Robin des Airs**, sur le compte dont les coordonnées figurent en annexe.

Dans cette attente, nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

*Pour Robin des Airs, cessionnaire*
[Nom / signature]

---

## Notes d'usage par compagnie
- **Air France (AF)** : **pas de médiation MTV** (cf. gate en tête). Seule étape préalable : purger le délai **CGT 12.3/12.5** (28 jours après réclamation du passager). Ce n'est pas une médiation, c'est une purge de recevabilité contractuelle, et la clause elle-même est tenue pour inopposable. Oppose systématiquement les **5 ans** s'ils invoquent 2 ans. Couvre l'axe Afrique vers Europe (départ UE toutes cies, arrivée UE si cie UE).
- **Brussels Airlines (SN)** : compagnie UE, donc CE 261 direct (BRU vers Afrique inclus). Minimum recevable : confirmation de réservation + preuve du retard. ⚠️ Prescription **1 an** en Belgique, ne pas laisser dormir.
- **easyJet Switzerland (EZS)** : compagnie suisse, mais un départ de **Bâle-Mulhouse (BSL)** se fait depuis le **territoire français** (Saint-Louis, Haut-Rhin), donc art. 3 §1 a) s'applique de plein droit. L'argument « nous sommes suisses » est inopérant. Compétence : lieu de départ (**CJUE C-204/08, *Rehder***), soit le Tribunal de commerce de Mulhouse, la Suisse étant partie à la Convention de Lugano.

## Rappels de cohérence
- Ne jamais écrire « mandat », « mandant » ni « mandataire » dans un courrier sortant. Glossaire : Mandant → **Cédant**, Mandataire → **Cessionnaire**.
- Pas de tiret long (« — ») dans les documents produits. `grep` avant envoi.

_Réf. : voir `docs/pieces-requises-ce261-af-sn.md`. Mise à jour 2026-07-17 (cession notifiée dès l'amiable, MTV retirée, section communication de pièces)._

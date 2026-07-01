/* Robin des Airs — Variantes de messages bot WhatsApp (v10, ton humanisé)
 * Généré + validé juridiquement + humanisé via workflow multi-agents.
 * 12 catégories × 10 variantes. pickVariant(phone, KEY) = choix déterministe par utilisateur.
 */
// ─── Variantes de messages Robin des Airs ────────────────────────────────────
// Utilisation : pickVariant(userId, 'ACCUEIL_EMPATHIE')
// Le choix est déterministe par seed → même utilisateur reçoit toujours la même variante

const VARIANTS = {

  // Message d'accueil empathique affiché dès l'entrée dans le bot
  ACCUEIL_EMPATHIE: [
    `Un vol en retard ou annulé, c'est une vraie galère. Bonne nouvelle : la loi européenne est de votre côté, et c'est là qu'on intervient. 🏹`,
    `Y'a des vols qui se passent sans problème. Et puis y'a les autres — ceux qu'on n'oublie pas pour de mauvaises raisons. Si vous êtes là, c'est probablement que le vôtre fait partie de la deuxième catégorie.`,
    `Attendre sans info, regarder les heures défiler, sentir qu'on ne maîtrise rien… un vol qui foire, c'est aussi ça : une vraie impuissance. On ne minimise pas ce que vous avez traversé.`,
    `Un retard, une annulation : du stress que vous n'avez pas choisi, et une compagnie qui fait souvent comme si de rien n'était. C'est précisément là qu'on entre en jeu. 🤝`,
    `Vous étiez peut-être pressé de rentrer, ou attendu à l'arrivée — et un retard a tout décalé. Voyons ensemble ce que la loi vous permet de récupérer. ✈️`,
    `Rater une correspondance, poireauter des heures en salle d'attente, apprendre à la dernière minute que votre vol n'existe plus… ça épuise, honnêtement. On est là parce que le silence des compagnies, c'est pas une réponse suffisante.`,
    `Un vol en retard ou annulé, ça chamboule tout. Les plans, l'énergie, parfois des heures sans explication. Vous n'aviez pas à vivre ça — et on le sait.`,
    `Quand un vol tombe à l'eau, c'est rarement juste un petit contretemps. Parfois c'est une réunion ratée, un retour chez des proches repoussé, des heures de stress que personne ne reconnaît vraiment. On comprend.`,
    `Vous avez peut-être perdu des heures, manqué quelque chose d'important, ou juste encaissé sans rien dire. Quelle que soit la situation — elle n'était probablement pas normale. Peut-être qu'il est temps d'y regarder de plus près. ✈️`,
    `Attendre dans un aéroport sans savoir pourquoi, sans que quelqu'un vous parle vraiment — c'est épuisant d'une façon que peu de gens saisissent s'ils ne l'ont pas vécu. Vous n'étiez pas seul à traverser ça.`,
  ],

  // Réaction après que l'utilisateur déclare un retard
  REACTION_RETARD: [
    `✊ Un retard peut tout faire basculer — les plans, les gens qui vous attendent, l'énergie que ça demande. C'est loin d'être anodin, et on le prend vraiment au sérieux. Pour qu'on puisse voir ce à quoi vous avez droit, vous arrivez avec combien d'heures de retard ?`,
    `Attendre à l'aéroport sans savoir quand ça va bouger, c'est éprouvant — et la compagnie vous en doit peut-être réparation. ✈️ Ce retard, il était de combien d'heures à l'arrivée ?`,
    `Le pire avec les retards, c'est souvent le silence. La compagnie qui ne dit rien, et vous qui attendez dans le vide. Ça, c'est inacceptable. 😔 Pour qu'on voit ce que vous pouvez récupérer, vous étiez en retard de combien d'heures ?`,
    `😔 Des heures à patienter, des plans qui s'effondrent — un retard c'est épuisant, physiquement et mentalement. On comprend vraiment. Et à l'arrivée, c'était combien d'heures de retard exactement ?`,
    `Rater une correspondance, voir sa famille attendre, manquer un rendez-vous qui ne se rattrape pas… c'est bien plus qu'un simple contretemps. On mesure ce que ça représente. Vous étiez en retard de combien d'heures à l'arrivée ?`,
    `🕐 Ces heures perdues dans un aéroport, debout ou calé sur une chaise inconfortable à rafraîchir les écrans — ça use vraiment. Pour voir ce à quoi vous avez droit, c'était combien d'heures de retard ?`,
    `Un retard à l'arrivée, surtout quand quelqu'un vous attendait de l'autre côté, ça ne s'oublie pas. La loi prévoit peut-être une compensation. Vous étiez décalé de combien d'heures ?`,
    `Ces heures perdues sur place ont un coût bien réel — une journée de travail, une réunion, un rendez-vous qui ne revient pas. On ne minimise pas ça. Pour qu'on puisse vous dire ce que ça peut vous rapporter, c'était combien d'heures de retard ?`,
    `😓 Annoncer à ses proches qu'on est encore bloqué, regarder les minutes défiler sans explication… c'est décourageant. Vous n'auriez pas dû subir ça. Ce retard à l'arrivée, il était de combien d'heures ?`,
    `Voyager sans savoir à quelle heure vous allez vraiment arriver, c'est une épreuve. Voyons ce que la loi vous permet de récupérer. À l'arrivée, vous aviez combien d'heures de retard ?`,
  ],

  // Réaction après que l'utilisateur déclare une annulation
  REACTION_ANNULATION: [
    `😤 Une annulation sans explication ni solution, ce n'est pas acceptable — et c'est souvent indemnisable. Donnez-nous les détails de votre vol, on se bat pour vous. 0 € si on ne gagne pas.`,
    `🤝 Se retrouver seul face à une compagnie aérienne après une annulation, c'est épuisant. On est là exactement pour ça — pour que vous n'ayez pas à gérer ça tout seul. Sans risque de votre côté : 0€ si on ne gagne pas. Alors autant essayer ensemble, non ?`,
    `😞 Arriver à l'aéroport et apprendre que votre vol est annulé... le stress, les appels, tout ce qui s'effondre d'un coup. Personne ne devrait vivre ça. Mais la compagnie a peut-être des comptes à rendre — on regarde votre dossier ensemble ?`,
    `La compagnie, elle, est passée à autre chose. Vous, vous portez encore les conséquences. C'est pas juste — et la loi est peut-être de votre côté. On vérifie votre éligibilité maintenant, ça prend deux minutes.`,
    `Des retrouvailles attendues depuis des mois, un voyage annulé en quelques mots sur un écran. Franchement, c'est cruel. On ne peut pas effacer ce moment. Mais on peut regarder si vous avez droit à quelque chose. On commence ?`,
    `Le mariage, le baptême, l'événement pour lequel vous aviez tout organisé des semaines à l'avance — et un vol annulé qui fait tout s'effondrer. On imagine vraiment. La réglementation européenne protège peut-être vos droits dans ce cas. On vérifie ensemble ?`,
    `😔 Le taxi déjà réservé, l'hôtel payé, les proches qui attendent — et une annulation qui fait tout tomber à l'eau. C'est une vraie gifle, sincèrement. Dites-nous ce qui s'est passé, on regarde si une compensation est possible.`,
    `Les vacances planifiées depuis des mois, les enfants qui attendaient, la famille qu'on allait retrouver... Et en quelques secondes, tout s'annule. Partagez votre situation avec nous — sans engagement, on analyse votre dossier et on vous dit ce à quoi vous pourriez avoir droit.`,
    `Un voyage d'affaires annulé, ça ne se rattrape pas. La réunion loupée, le client, le billet parti pour rien. Vous ne devriez pas en rester là. Dites-nous ce qui s'est passé — on regarde ça ensemble.`,
    `✈️ Une annulation, c'est rarement un simple contretemps — c'est des heures perdues, de l'argent, et souvent beaucoup de stress. Vous avez bien fait de nous contacter. On regarde ensemble ce que la loi prévoit pour vous.`,
  ],

  // Réaction après que l'utilisateur déclare un refus d'embarquement
  REACTION_REFUS: [
    `Vous n'avez rien fait de mal. Vous aviez votre billet, vous étiez là à l'heure — et ils vous ont quand même refusé l'accès. C'est leur erreur, pas la vôtre. Et ça peut vous donner droit jusqu'à 600€.`,
    `Billet valide, présent à l'heure, et on vous a fermé la porte au nez. C'est du surbooking — c'est illégal. On s'en occupe. ✊`,
    `Votre place était réservée. Votre billet était là. Et pourtant ils vous ont laissé sur le carreau. Ce qu'on vous a fait subir a un nom et un prix légal. Et on est de votre côté — 0€ si on ne gagne pas.`,
    `Sur le moment, un refus d'embarquement c'est surtout ce sentiment d'impuissance — de pas pouvoir faire grand chose. Mais après, la loi protège. Dites-nous ce qui s'est passé, on regarde ce à quoi vous avez droit.`,
    `Franchement, c'est une humiliation. Et elle n'aurait jamais dû arriver — votre billet était en règle, vous aviez fait ce qu'il fallait. La compagnie a peut-être une dette envers vous. On va la faire valoir.`,
    `Ils ont choisi votre siège pour combler leur propre erreur de gestion. Vous n'êtes pas une variable d'ajustement. Vous avez des droits, et on est là pour les faire valoir. ✊`,
    `Des heures de préparation, un billet payé — et on vous laisse au sol. Ce temps gâché, ça mérite réparation. On prend votre dossier en main maintenant. 🛫`,
    `Ils ont survendu des sièges et c'est vous qui trinquez. Ça, c'est vraiment pas normal. Mais la loi est de votre côté — et on est là pour que ça ne reste pas sans suite.`,
    `Les compagnies comptent souvent sur votre silence après un refus. Billet en main, porte fermée — c'est exactement pour ça que le règlement CE 261 existe. On avance ensemble, et c'est 0€ si on ne gagne rien. 🤝`,
    `Ils vous ont laissé sur le tarmac. Et maintenant leur réflexe, c'est d'attendre que vous lâchiez l'affaire. Le nôtre, c'est de faire valoir ce à quoi vous pourriez avoir droit. Commission au succès uniquement.`,
  ],

  // Message d'arrêt quand le retard déclaré est inférieur à 3h (seuil CE 261)
  STOP_MOINS_3H: [
    `Trois heures. C'est le seuil que le législateur européen a fixé — pas nous.\n\nVotre retard était réel, et on ne minimise pas ça. Mais tant que l'arrivée est sous 3h, CE 261/2004 ne reconnaît aucune indemnisation. On ne peut rien monter contre une règle que la loi elle-même ne dépasse pas.\n\n💡 Vous n'êtes plus sûr de la durée exacte à l'arrivée ? Tapez menu → « Je ne sais plus ».`,
    `Ce n'est pas parce qu'un retard ne donne pas droit à grand-chose qu'il n'a pas compté. Il a compté — et on l'entend.\n\nMais CE 261/2004 fixe la barre à 3h de retard à l'arrivée. C'est la loi, et on ne peut pas la contourner, même avec la meilleure volonté.\n\n💡 Un doute sur la durée réelle ? Tapez menu → « Je ne sais plus ».`,
    `Voyager c'est déjà un effort. Rajouter un retard par-dessus, même court, c'est une épreuve de plus. On le sait.\n\nMais CE 261/2004 pose un seuil clair : 3h de retard à l'arrivée minimum pour ouvrir un droit. En dessous, même la meilleure volonté ne suffit pas — la loi ne nous laisse pas de marge.\n\n😔 Pas sûr de la durée exacte ? Tapez menu → « Je ne sais plus ».`,
    `Honnêtement ? Même 2h de retard, c'est trop. Mais la loi, elle, ne voit pas les choses comme ça 😔\n\nCE 261/2004 exige au moins 3h de retard à l'arrivée pour qu'une indemnité soit possible. En dessous de ce seuil, aucun recours légal n'existe — et on ne peut pas inventer ce que la loi ne prévoit pas.\n\nSi vous n'êtes pas sûr du retard exact, tapez menu → « Je ne sais plus ».`,
    `La loi est parfois frustrante, on ne va pas se le cacher. Votre retard était bien réel — mais CE 261/2004 ne protège que les retards de 3h ou plus, mesurés à l'arrivée.\n\nOn ne peut pas monter ce dossier, et on le regrette sincèrement.\n\n💡 Vous hésitez sur la durée ? Tapez menu → « Je ne sais plus ».`,
    `😔 On aurait vraiment aimé pouvoir faire quelque chose.\n\nMais voilà : CE 261/2004 ne s'applique pas en dessous de 3h de retard à l'arrivée. Votre vol est sous ce seuil — on ne peut pas ouvrir un dossier sur cette base.\n\nSi vous avez un doute sur la durée exacte, tapez menu → « Je ne sais plus ».`,
    `Même 2h dans un aéroport, c'est long. On ne va pas prétendre le contraire.\n\nLe problème, c'est que CE 261 ne s'active qu'à partir de 3h de retard constaté à l'arrivée — pas au départ. Avant ce seuil, nos mains sont liées, littéralement.\n\n🙏 Pas sûr du retard à l'arrivée ? Tapez menu → « Je ne sais plus ».`,
    `Un retard même court, c'est du stress, parfois une correspondance ratée, de la fatigue. Rien d'anodin là-dedans.\n\nPourtant CE 261/2004 est clair : l'indemnisation s'applique à partir de 3h de retard à l'arrivée. C'est le seuil légal — on ne peut pas y déroger.\n\n💡 Vous doutez de la durée réelle ? Tapez menu → « Je ne sais plus ».`,
    `Ce retard a dû être éprouvant — l'incertitude, les minutes qui s'étirent, les plans qui partent en fumée. On compatit vraiment.\n\nMais CE 261/2004 fixe un seuil précis : 3h de retard à l'arrivée minimum. En dessous, aucune compagnie n'est légalement tenue de payer quoi que ce soit.\n\n💡 Pas certain de la durée exacte ? Tapez menu → « Je ne sais plus ».`,
    `On préfère être francs plutôt que de vous faire perdre du temps 🙏\n\nAttendre dans un aéroport, même 90 minutes, ça use — on ne dit pas le contraire. Mais CE 261 n'intervient qu'au-delà de 3h de retard à l'arrivée. Sans ce seuil, aucune indemnisation n'est possible.\n\nPas certain du retard à l'arrivée ? Tapez menu → « Je ne sais plus ».`,
  ],

  // Réponse quand l'utilisateur ne connaît pas la durée exacte du retard
  DUREE_INCONNUE: [
    `Vraiment, ne vous en voulez pas. Ce jour-là vous aviez la tête ailleurs — les bagages, prévenir la famille, trouver un hôtel. ✈️ La durée, on la retrouve nous-mêmes via les données officielles. C'est notre boulot, pas le vôtre.`,
    `C'est normal, hein — personne ne chronomètre son retard en temps réel, surtout quand on est à bout. 😌 Le numéro de vol suffit, les bases aériennes gardent tout ça. On s'en occupe. C'était quelle destination ?`,
    `Ce genre de détail, les gens ne le retiennent pas — et franchement c'est pas grave. Ce qui compte, c'est que votre vol soit dans les registres officiels. Et pour les vols commerciaux, il y est. ✈️ On retrouve la durée, vous n'avez rien à faire. On continue ?`,
    `Sérieusement, qui pense à noter l'heure d'atterrissage quand son vol est en retard ? Personne. 😊 On a accès aux bases officielles — tout est là, à la minute près. On avance.`,
    `Pas de pression du tout. Ces données existent dans les archives aériennes, nos experts y ont accès. 😌 Votre mémoire n'a rien à voir là-dedans. Donnez-nous juste la date et le numéro de vol, on s'occupe du reste.`,
    `Aucun souci, vous n'avez pas à retenir ces choses-là. 🙂 Ce qui compte c'est ce que vous avez vécu — pas l'heure sur un tableau. La durée exacte, on la retrouve avec le numéro de vol dans les registres officiels. On continue ensemble ?`,
    `Vous n'êtes pas censé retenir ça — les données officielles ont justement une valeur légale parce qu'elles ne dépendent pas de votre mémoire. 👌 On retrouve la durée via ces registres, c'est tout ce qu'il faut pour votre dossier. On continue ?`,
    `La durée exacte, c'est notre rayon — pas le vôtre. 👌 Avec le numéro de vol et la date, on la retrouve dans les archives en quelques secondes. Vous avez la date du vol sous la main ?`,
    `Ce poids-là, vous pouvez le lâcher maintenant. Pendant le retard vous aviez bien d'autres choses à gérer que surveiller les horaires. ✈️ On récupère la durée via les registres officiels — c'est tout ce qu'il nous faut. On continue ?`,
    `Ce détail-là, on le récupère nous-mêmes. Rien à mémoriser, rien à chercher. Chaque vol commercial est déclaré aux autorités — l'heure réelle d'arrivée est enregistrée. On la trouve avec votre numéro de vol. 🙂`,
  ],

  // Message d'arrêt : annulation notifiée ≥ 14 jours avant le vol (art. 5 CE 261 → pas d'indemnité forfaitaire)
  STOP_ANNUL_14J: [
    `Merci pour cette précision — c'est *l'info clé* pour une annulation. 🙏\n\nLa loi européenne (CE 261/2004) prévoit une indemnité *uniquement si* la compagnie vous a prévenu(e) *moins de 14 jours* avant le départ. Au-delà, elle vous a laissé le temps de vous réorganiser : aucune indemnité forfaitaire n'est due. Ce n'est pas nous, c'est la règle — on ne peut pas monter un dossier dessus.\n\n💡 Vous gardez quand même droit au *remboursement* du billet ou à un *réacheminement*. Et si en réalité on vous a prévenu(e) *moins de 14 jours* avant, écrivez *go* — on reprend tout de suite.`,
    `On préfère être francs plutôt que de vous lancer dans un dossier qui n'aboutira pas. 🙏\n\nQuand une compagnie annule en prévenant *au moins 14 jours à l'avance*, le règlement CE 261/2004 ne prévoit *aucune indemnité forfaitaire*. Le seuil est strict, et on ne peut pas le contourner.\n\n💡 Il vous reste le droit au *remboursement intégral* ou à un autre vol. Un doute sur la date exacte où on vous a prévenu(e) ? Écrivez *go*, on repart.`,
    `Merci, c'est ça qui fait toute la différence pour une annulation.\n\nLe seuil, c'est *14 jours* : prévenu(e) *14 jours ou plus* avant le vol, la compagnie est dans son droit et CE 261/2004 ne prévoit pas d'indemnité. On ne peut pas aller contre la loi, même avec la meilleure volonté. 😔\n\n💡 Le *remboursement* ou un *réacheminement* vous restent acquis auprès de la compagnie. Si vous pensez avoir été prévenu(e) *moins de 14 jours* avant, écrivez *go*.`,
  ],

  // Réponse quand l'utilisateur ne sait plus de combien de jours il a été prévenu avant le vol (annulation)
  ANNUL_PREAVIS_INCONNU: [
    `Pas de souci, c'est un détail qu'on ne retient pas forcément. 🙂 On confirmera la date exacte avec votre *e-mail ou SMS d'annulation* — c'est lui qui fait foi, gardez-le précieusement. On continue votre dossier.`,
    `Aucun problème — ne vous en faites pas pour la date au jour près. 👌 La preuve, c'est le *message d'annulation* de la compagnie (e-mail ou SMS) : on s'appuiera dessus le moment venu. On avance.`,
    `C'est normal de ne plus savoir exactement. 🙂 Ce qui tranchera, c'est l'*avis d'annulation* que la compagnie vous a envoyé — on le récupérera avec vos pièces. On poursuit pour l'instant.`,
  ],

  // Message affiché quand le vol semble éligible et qu'on présente l'estimation.
  // Une seule variante : formulation courte + directe (décision fondateur 01/07/2026).
  ESTIMATION_QUALIFICATION: [
    `Jusqu'à 600 € par passager — c'est ce que vous pouvez récupérer. On s'occupe de tout, sans avance. 0 € si on ne gagne pas.`,
  ],

  // Confirmation après scan réussi du billet
  SCAN_REUSSI: [
    `Voilà, j'ai tout ce qu'il me faut. On gagne du temps — et franchement, vous en avez déjà perdu assez. 🙏`,
    `Votre billet est entre de bonnes mains. J'ai tout, on démarre. 📋`,
    `Bonne nouvelle : tout est là. J'ai lu votre billet directement — zéro dictée, zéro ressaisie. 👌`,
    `Un scan et c'est bon. Vous n'avez rien à me dicter — je pars avec ce que j'ai. ✅`,
    `Votre document a tout dit pour vous. J'ai récupéré ce qu'il me faut, on continue.`,
    `Rien à retaper de votre côté — j'ai tout lu directement. On passe à la suite. ✅`,
    `Billet lu d'un coup d'œil. Rien à taper, on peut y aller. ✅`,
    `Nickel. Tout est extrait — vous n'aurez rien à réécrire.`,
    `Votre billet a bien parlé ! Tout est capturé, vous n'avez rien à retranscrire. 👍`,
    `Les infos sont déjà là, je démarre. Vous n'avez rien à ressaisir.`,
  ],

  // Message de repli quand le scan du billet a échoué
  SCAN_RATE: [
    `Notre lecteur automatique n'a pas accroché cette fois — c'est lui, pas vous. Pas de souci : quelques réponses courtes et on prend la suite en charge. 👇`,
    `😕 C'est notre lecteur qui a coincé, pas votre document. Vous pouvez retenter avec une photo plus lumineuse, ou on continue directement à la main — à vous de voir. 👇`,
    `Notre scanner n'a pas réussi à lire votre billet. Ça arrive. Si vous voulez retenter : photo bien éclairée, fond sombre, billet bien à plat. Sinon, quelques questions et c'est reparti pareil. 👇`,
    `Notre lecture auto a calé — mais votre dossier, lui, il avance. Quelques questions simples et on continue sans la photo. On lâche rien. ✊`,
    `La photo n'est pas passée côté lecture automatique. Deux options devant vous : une nouvelle tentative dans un coin bien éclairé, ou on répond à quelques questions à la place. Vous choisissez, on s'adapte. ✊`,
    `Notre système n'a pas réussi à lire votre document — l'éclairage ou le format peuvent bloquer la lecture, c'est connu. La saisie manuelle est exactement là pour ça. Simple, rapide, et votre dossier repart. 🙏`,
    `Ça arrive — notre système a raté la lecture cette fois, et c'est entièrement de notre côté. Tapez vos infos à la main, c'est rapide, et votre demande continue normalement. 🙏`,
    `😕 Notre outil de lecture automatique a ses limites, et là il les a atteintes. Qu'importe : quelques questions à la place et votre dossier avance exactement comme si la photo avait fonctionné.`,
    `Notre scanner n'a pas réussi à attraper votre billet — ça nous arrive, c'est notre affaire pas la vôtre. 😕 Une nouvelle photo ou les questions manuelles : les deux marchent, votre dossier ne s'arrête pas là.`,
    `Notre scan a buté sur votre document, on s'en excuse. Dites-nous vos infos à la main — quelques questions courtes et c'est reparti. 🙏`,
  ],

  // Message d'arrêt quand le vol ne relève pas du périmètre géographique CE 261
  STOP_HORS_EUROPE: [
    `😔 On a regardé votre vol de près — et franchement, cette nouvelle est difficile à annoncer.\n\nCE 261/2004 ne couvre que les vols au départ de l'Europe, ou vers l'Europe sur une compagnie européenne. Votre trajet n'entre pas là-dedans.\n\nVotre galère était réelle. On le sait. 🙏\n\n❓ Une erreur de saisie ? Tapez menu pour revérifier.`,
    `On aurait voulu pouvoir vous aider. Vraiment.\n\nMais CE 261/2004 a des frontières strictes : vols depuis l'UE, ou vers l'UE avec une compagnie européenne. Votre route se situe en dehors de ça.\n\nC'est pas juste. Et vous ne méritez pas ça. 🙏\n\n❓ Un détail à corriger ? Tapez menu.`,
    `🔍 Vérification faite — et le résultat n'est pas celui qu'on espérait pour vous.\n\nLe règlement européen ne joue que sur les vols qui partent d'Europe, ou qui arrivent en Europe sur une compagnie du continent. Le vôtre échappe à ce périmètre.\n\nOn est sincèrement désolés de ne pas pouvoir aller plus loin.\n\n❓ Quelque chose à rectifier ? Tapez menu.`,
    `La loi européenne a des angles morts — et c'est là que se situe votre vol.\n\nCE 261/2004 ne s'applique qu'aux routes qui touchent l'Europe : au départ, ou avec une compagnie européenne. Le vôtre n'y répond pas.\n\nCette réponse n'efface pas ce que vous avez vécu. On est désolés. 🙏\n\n❓ Un détail à vérifier ? Tapez menu.`,
    `😔 Mauvaise nouvelle — et on ne va pas l'habiller autrement.\n\nCE 261/2004, le règlement qui ouvre droit à ce qu'on peut récupérer pour vous, ne couvre pas ce trajet. Il faut soit partir d'Europe, soit y arriver avec une compagnie européenne.\n\nVotre situation méritait mieux qu'un refus. On le reconnaît.\n\n❓ Vol mal saisi ? Tapez menu pour recommencer.`,
    `Votre vol a traversé des milliers de kilomètres. L'attente, la fatigue, le stress — tout ça était bien réel.\n\nMais CE 261/2004 ne suit pas jusqu'ici. Il s'arrête aux routes qui touchent l'Europe, soit au départ, soit sur une compagnie européenne.\n\nOn regrette de ne pas pouvoir faire plus. 🙏\n\n❓ Un doute sur la saisie ? Tapez menu.`,
    `🙏 On aurait voulu vous annoncer autre chose.\n\nLe droit européen — CE 261/2004 — ne s'applique qu'aux vols qui partent d'un pays de l'UE, ou qui y arrivent avec une compagnie basée en Europe. Votre trajet ne coche aucune de ces cases.\n\nVotre attente, votre stress, votre temps perdu : c'était vrai. Le refus ne change pas ça.\n\n❓ Un vol mal renseigné ? Tapez menu.`,
    `Certains vols vivent une vraie galère sans avoir accès à aucun recours européen. C'est injuste — et votre cas en fait partie.\n\nCE 261/2004 ne s'étend pas à ce trajet : ni le départ, ni la compagnie ne relèvent de l'Europe.\n\nOn ne peut pas changer la loi. Mais on peut au moins reconnaître ce que vous avez traversé. 😔\n\n❓ Quelque chose à corriger ? Tapez menu.`,
    `😔 On a analysé votre vol — et on doit être honnêtes avec vous.\n\nCE 261/2004 fixe un cadre strict : vols au départ de l'Union européenne, ou vers l'UE sur une compagnie européenne. En dehors de ça, le règlement ne peut pas s'appliquer. Votre dossier tombe hors de ce cadre.\n\nC'est pas ce qu'on vous souhaitait.\n\n❓ Un vol mal saisi ? Tapez menu — on revérifie ensemble.`,
    `Réponse difficile à écrire, parce que vous méritez mieux.\n\nVotre vol ne relève pas de CE 261/2004 — ce règlement ne s'applique qu'aux routes avec un pied en Europe, au départ ou avec une compagnie européenne. Ce trajet-là reste hors champ.\n\n🙏 On aurait sincèrement voulu pouvoir faire plus.\n\n❓ Un détail inexact ? Tapez menu pour revérifier.`,
  ],

  // Message d'arrêt quand le vol dépasse le délai de prescription légal (5 ans)
  PRESCRIPTION_5ANS: [
    `Cinq ans. C'est le délai que la loi accorde pour réclamer, et votre vol le dépasse. Je mesure ce que ça représente — vous aviez peut-être de bonnes raisons d'attendre. Mais passé ce seuil, nos mains sont liées. Si la date renseignée est fausse, tapez menu : ça mérite d'être vérifié. 🔄`,
    `La loi est parfois cruelle dans sa précision : au-delà de 5 ans, le droit de réclamer s'éteint — même quand la compagnie avait clairement tort. Votre galère méritait une suite. Je suis désolé que le temps ne nous ait pas laissé cette chance. Date incorrecte ? Tapez menu, on reprend depuis le début. 😔`,
    `Votre cas m'importe, alors je préfère être honnête avec vous : le délai légal pour réclamer est en général de 5 ans, et votre vol le dépasse. Pas parce que votre dossier est faible — mais parce que la loi ferme cette fenêtre, sans exception. ✏️ Si la date est incorrecte, tapez menu. Ça vaut la peine de vérifier.`,
    `😔 Mauvaise nouvelle, et je préfère vous la dire franchement : votre vol date de plus de 5 ans. La prescription, c'est comme une horloge que la loi impose — une fois qu'elle sonne, même le meilleur dossier ne peut plus avancer. Si vous pensez à une erreur de date, tapez menu. On vérifie.`,
    `😞 Je suis désolé. Votre vol dépasse le délai légal — en général 5 ans selon les pays. Ce n'est pas une question de mérite : ce que vous avez subi méritait d'être examiné. C'est simplement la loi qui ferme cette voie. Si la date est fausse, tapez menu, on corrige ensemble.`,
    `Ce que vous avez vécu méritait vraiment qu'on s'en occupe. Mais votre vol remonte à plus de 5 ans, et ce délai — fixé par la loi — est une frontière qu'on ne peut pas franchir. Je suis sincèrement navré de ne pas pouvoir faire plus. Date erronée ? Tapez menu pour corriger.`,
    `La date de votre vol nous pose un problème : elle dépasse les 5 ans, et au-delà la loi ne nous laisse plus agir. C'est une vraie déception, je ne vais pas vous le cacher. Vous aviez peut-être droit à quelque chose — le temps a simplement joué contre vous. Date incorrecte ? Tapez menu pour la rectifier. ✏️`,
    `Votre vol remonte à plus de 5 ans. C'est dur à entendre — vous aviez peut-être attendu le bon moment pour agir, et je comprends ça. Malheureusement la prescription légale ferme cette porte, quelle que soit la solidité du dossier. Si une erreur de date s'est glissée, tapez menu pour vérifier.`,
    `😔 Cette nouvelle est difficile à annoncer. Votre vol date de plus de 5 ans, et la loi fixe ce cap comme limite pour réclamer — passé là, même un dossier béton ne peut plus avancer. Vous méritiez qu'on se batte pour vous. Je le regrette sincèrement. Si la date saisie est incorrecte, tapez menu pour la corriger.`,
    `C'est un peu comme un billet expiré sans qu'on le sache : passé 5 ans, la loi ne permet plus d'ouvrir un dossier — même si la compagnie était clairement en tort. Je suis désolé de vous l'apprendre à ce stade. Date mal saisie ? Tapez menu, une vérification rapide ne coûte rien. 😞`,
  ],

  // Sortie « propre » quand le vol N'EST PAS éligible : on rebondit sur un AUTRE vol
  // (réclamation rétroactive 5 ans → « pensez à une réservation plus ancienne »).
  RELANCE_AUTRE_VOL: [
    `💡 Ce vol-ci n'ouvre pas de droit — mais c'est peut-être pas le seul que vous ayez pris.\n\nUn vol sur dix subit un retard ou une annulation, et on peut réclamer *jusqu'à 5 ans en arrière*. Sur autant d'années de voyages, vous (ou un proche) avez sûrement eu un vol *retardé de 3 h ou plus*, annulé ou refusé à l'embarquement — souvent sans savoir qu'il valait *jusqu'à 600 € par passager*.\n\n✈️ Pensez à une réservation plus ancienne : un retour de vacances, un mariage, une rentrée…`,
    `💡 Pas de droit sur ce vol précis — mais ne refermez pas si vite.\n\nLes retards de 3 h et plus, les annulations et les surbookings touchent énormément de voyageurs, et la loi permet de remonter *jusqu'à 5 ans*. Un autre de vos vols (ou de votre famille) est peut-être concerné sans que vous le sachiez : *jusqu'à 600 € par passager*, et *0 € à avancer*.\n\n✈️ Un autre voyage vous revient en tête ?`,
    `💡 Ce vol n'est pas éligible — mais c'est rarement le seul voyage d'une famille.\n\nUn vol sur dix est retardé ou annulé, et la réclamation est rétroactive *5 ans*. Repensez à vos derniers voyages : un retard de *3 h+* à l'arrivée, une annulation, un embarquement refusé = *jusqu'à 600 € par passager*. 0 € si on ne gagne pas.\n\n✈️ On vérifie un autre vol ?`,
  ],

  // Message de clôture envoyé après signature du mandat
  CLOTURE_POST_SIGNATURE: [
    `Contrat de cession reçu. Et on mesure ce que vous venez de faire — vous nous confiez quelque chose qui vous appartient, et ça, on ne l'oublie pas.\n\nPromesse concrète : on vous tient au courant, on ne lâche pas, et si ça n'aboutit pas, vous ne nous devez rien. Si la compagnie paie, vous gardez 75 %. Notre part, on la mérite seulement si on a gagné. 💪`,
    `C'est parti. Le bot a fait ce qu'il pouvait — maintenant c'est à des vraies personnes de prendre le relais.\n\nChaque dossier chez nous, c'est quelqu'un qui le tient. Pas un algorithme. Quelqu'un qui connaît le CE 261 et qui sait ne pas se laisser balader par une compagnie.\n\n0 € si on ne gagne pas. 25 % si on gagne. C'est tout. ✅`,
    `Signature reçue. ✍️ Ce que vous avez vécu peut maintenant déboucher sur quelque chose de concret.\n\nNotre équipe prend le dossier et interpelle la compagnie à votre place. Fini les relances dans le vide, fini de vous battre seul(e).\n\nOn avance ensemble — 0 € si ça ne passe pas, 25 % le jour où ça passe.`,
    `Le plus dur, il est derrière vous. Vous avez subi le vol, vous avez réuni les documents. Maintenant c'est notre tour.\n\nL'équipe reprend le dossier, fait face à la compagnie et vous tient au courant au fur et à mesure.\n\n0 € si on ne gagne pas. 25 % le jour où une indemnisation est obtenue pour vous. On se bat pour vous. 🤝`,
    `C'est fait. Contrat de cession signé, dossier ouvert.\n\nÀ partir de là, c'est Robin des Airs qui affronte la compagnie — plus vous. Vous avez déjà vécu la galère du vol, laissez-nous gérer la suite.\n\n0 € si on perd. 25 % si on gagne. Rien d'autre. Une équipe humaine s'en charge dès aujourd'hui. 🏹`,
    `Dossier transmis à l'équipe. La machine s'arrête là, les humains prennent la main.\n\nL'attente peut être longue — les compagnies ne se pressent pas, c'est connu. Mais on ne lâche pas : relances, escalades, tout ça c'est pour nous, pas pour vous.\n\n25 % si on obtient quelque chose. Pas un euro si on échoue. 💪`,
    `Votre confiance est reçue — et on la prend vraiment au sérieux.\n\nUn membre de l'équipe reprend là où le bot s'arrête. C'est lui qui négocie, qui relance, qui ne lâche pas le dossier.\n\nVous n'avancez pas un centime. Si la compagnie paie, vous gardez 75 %. Sinon : 0 €, aucun risque de votre côté. ✅`,
    `Votre dossier est entre de bonnes mains. C'était le plus important à vous dire.\n\nL'équipe va éplucher chaque détail, rédiger la réclamation et tenir tête à la compagnie si elle résiste — et elles résistent souvent.\n\nVous n'avancez rien. Si on obtient quelque chose pour vous, on prend 25 %. Sinon, c'est 0 €, sans discussion. 🏹`,
    `Contrat de cession reçu. ✅ Votre dossier n'est plus entre vos mains — il est entre les nôtres.\n\nOn prend le relais face à la compagnie. Pas d'avance à faire, pas de démarche à gérer de votre côté.\n\nUne vraie personne de l'équipe porte votre dossier. 0 € si on ne gagne pas, 25 % seulement si vous encaissez. On ne vous laisse pas seul(e). 🤝`,
    `Merci pour votre confiance. Sincèrement.\n\nLe dossier quitte le bot et arrive dans les mains de l'équipe. À partir de là, c'est la compagnie qui a affaire à nous — plus à vous.\n\n0 € de risque, 25 % en cas de succès. Et quelqu'un de réel pour vous accompagner jusqu'au bout. ✅`,
  ],

};

// ─── Utilitaire de hachage (identique à pickStat) ────────────────────────────

/**
 * Hash déterministe d'une chaîne → entier 32 bits signé.
 * @param {string|number} s
 * @returns {number}
 */
function hashStr(s) {
  let h = 0;
  for (const c of String(s || 'x')) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

/**
 * Choisit de façon déterministe une variante dans VARIANTS[key].
 * Le même seed produit toujours le même message pour une clé donnée,
 * mais des clés différentes peuvent donner des variantes différentes
 * (le nom de la clé est intégré au seed).
 *
 * @param {string|number} seed  - identifiant stable de l'utilisateur (ex : waId, userId)
 * @param {string}        key   - clé dans VARIANTS (ex : 'ACCUEIL_EMPATHIE')
 * @returns {string}            - texte de la variante sélectionnée
 *
 * @example
 * const msg = pickVariant('221771234567', 'REACTION_RETARD');
 */
function pickVariant(seed, key) {
  const pool = VARIANTS[key];
  if (!pool || pool.length === 0) return '';
  const combined = String(seed || 'x') + ':' + key;
  return pool[Math.abs(hashStr(combined)) % pool.length];
}

module.exports = { VARIANTS, pickVariant, hashStr };

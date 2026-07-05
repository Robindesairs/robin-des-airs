
## 1 · Variantes de ton (lib/bot-variants.js)
_Choix déterministe par utilisateur via pickVariant(phone, KEY). Anglais = souvent texte fixe séparé._


### `ACCUEIL_EMPATHIE` — 1 variante

**1.** 
> Un vol en retard ou annulé, c'est une vraie galère. Bonne nouvelle : la loi européenne est de votre côté, et c'est là qu'on intervient. 🏹

### `REACTION_RETARD` — 10 variantes

**1.** 
> ✊ Un retard peut tout faire basculer — les plans, les gens qui vous attendent, l'énergie que ça demande. C'est loin d'être anodin, et on le prend vraiment au sérieux. Pour qu'on puisse voir ce à quoi vous avez droit, vous arrivez avec combien d'heures de retard ?

**2.** 
> Attendre à l'aéroport sans savoir quand ça va bouger, c'est éprouvant — et la compagnie vous en doit peut-être réparation. ✈️ Ce retard, il était de combien d'heures à l'arrivée ?

**3.** 
> Le pire avec les retards, c'est souvent le silence. La compagnie qui ne dit rien, et vous qui attendez dans le vide. Ça, c'est inacceptable. 😔 Pour qu'on voit ce que vous pouvez récupérer, vous étiez en retard de combien d'heures ?

**4.** 
> 😔 Des heures à patienter, des plans qui s'effondrent — un retard c'est épuisant, physiquement et mentalement. On comprend vraiment. Et à l'arrivée, c'était combien d'heures de retard exactement ?

**5.** 
> Rater une correspondance, voir sa famille attendre, manquer un rendez-vous qui ne se rattrape pas… c'est bien plus qu'un simple contretemps. On mesure ce que ça représente. Vous étiez en retard de combien d'heures à l'arrivée ?

**6.** 
> 🕐 Ces heures perdues dans un aéroport, debout ou calé sur une chaise inconfortable à rafraîchir les écrans — ça use vraiment. Pour voir ce à quoi vous avez droit, c'était combien d'heures de retard ?

**7.** 
> Un retard à l'arrivée, surtout quand quelqu'un vous attendait de l'autre côté, ça ne s'oublie pas. La loi prévoit peut-être une compensation. Vous étiez décalé de combien d'heures ?

**8.** 
> Ces heures perdues sur place ont un coût bien réel — une journée de travail, une réunion, un rendez-vous qui ne revient pas. On ne minimise pas ça. Pour qu'on puisse vous dire ce que ça peut vous rapporter, c'était combien d'heures de retard ?

**9.** 
> 😓 Annoncer à ses proches qu'on est encore bloqué, regarder les minutes défiler sans explication… c'est décourageant. Vous n'auriez pas dû subir ça. Ce retard à l'arrivée, il était de combien d'heures ?

**10.** 
> Voyager sans savoir à quelle heure vous allez vraiment arriver, c'est une épreuve. Voyons ce que la loi vous permet de récupérer. À l'arrivée, vous aviez combien d'heures de retard ?

### `REACTION_ANNULATION` — 10 variantes

**1.** 
> 😤 Une annulation sans explication ni solution, ce n'est pas acceptable — et c'est souvent indemnisable. Donnez-nous les détails de votre vol, on se bat pour vous. 0 € si on ne gagne pas.

**2.** 
> 🤝 Se retrouver seul face à une compagnie aérienne après une annulation, c'est épuisant. On est là exactement pour ça — pour que vous n'ayez pas à gérer ça tout seul. Sans risque de votre côté : 0€ si on ne gagne pas. Alors autant essayer ensemble, non ?

**3.** 
> 😞 Arriver à l'aéroport et apprendre que votre vol est annulé... le stress, les appels, tout ce qui s'effondre d'un coup. Personne ne devrait vivre ça. Mais la compagnie a peut-être des comptes à rendre — on regarde votre dossier ensemble ?

**4.** 
> La compagnie, elle, est passée à autre chose. Vous, vous portez encore les conséquences. C'est pas juste — et la loi est peut-être de votre côté. On vérifie votre éligibilité maintenant, ça prend deux minutes.

**5.** 
> Des retrouvailles attendues depuis des mois, un voyage annulé en quelques mots sur un écran. Franchement, c'est cruel. On ne peut pas effacer ce moment. Mais on peut regarder si vous avez droit à quelque chose. On commence ?

**6.** 
> Le mariage, le baptême, l'événement pour lequel vous aviez tout organisé des semaines à l'avance — et un vol annulé qui fait tout s'effondrer. On imagine vraiment. La réglementation européenne protège peut-être vos droits dans ce cas. On vérifie ensemble ?

**7.** 
> 😔 Le taxi déjà réservé, l'hôtel payé, les proches qui attendent — et une annulation qui fait tout tomber à l'eau. C'est une vraie gifle, sincèrement. Dites-nous ce qui s'est passé, on regarde si une compensation est possible.

**8.** 
> Les vacances planifiées depuis des mois, les enfants qui attendaient, la famille qu'on allait retrouver... Et en quelques secondes, tout s'annule. Partagez votre situation avec nous — sans engagement, on analyse votre dossier et on vous dit ce à quoi vous pourriez avoir droit.

**9.** 
> Un voyage d'affaires annulé, ça ne se rattrape pas. La réunion loupée, le client, le billet parti pour rien. Vous ne devriez pas en rester là. Dites-nous ce qui s'est passé — on regarde ça ensemble.

**10.** 
> ✈️ Une annulation, c'est rarement un simple contretemps — c'est des heures perdues, de l'argent, et souvent beaucoup de stress. Vous avez bien fait de nous contacter. On regarde ensemble ce que la loi prévoit pour vous.

### `REACTION_REFUS` — 10 variantes

**1.** 
> Vous n'avez rien fait de mal. Vous aviez votre billet, vous étiez là à l'heure — et ils vous ont quand même refusé l'accès. C'est leur erreur, pas la vôtre. Et ça peut vous donner droit jusqu'à 600€.

**2.** 
> Billet valide, présent à l'heure, et on vous a fermé la porte au nez. C'est du surbooking — c'est illégal. On s'en occupe. ✊

**3.** 
> Votre place était réservée. Votre billet était là. Et pourtant ils vous ont laissé sur le carreau. Ce qu'on vous a fait subir a un nom et un prix légal. Et on est de votre côté — 0€ si on ne gagne pas.

**4.** 
> Sur le moment, un refus d'embarquement c'est surtout ce sentiment d'impuissance — de pas pouvoir faire grand chose. Mais après, la loi protège. Dites-nous ce qui s'est passé, on regarde ce à quoi vous avez droit.

**5.** 
> Franchement, c'est une humiliation. Et elle n'aurait jamais dû arriver — votre billet était en règle, vous aviez fait ce qu'il fallait. La compagnie a peut-être une dette envers vous. On va la faire valoir.

**6.** 
> Ils ont choisi votre siège pour combler leur propre erreur de gestion. Vous n'êtes pas une variable d'ajustement. Vous avez des droits, et on est là pour les faire valoir. ✊

**7.** 
> Des heures de préparation, un billet payé — et on vous laisse au sol. Ce temps gâché, ça mérite réparation. On prend votre dossier en main maintenant. 🛫

**8.** 
> Ils ont survendu des sièges et c'est vous qui trinquez. Ça, c'est vraiment pas normal. Mais la loi est de votre côté — et on est là pour que ça ne reste pas sans suite.

**9.** 
> Les compagnies comptent souvent sur votre silence après un refus. Billet en main, porte fermée — c'est exactement pour ça que le règlement CE 261 existe. On avance ensemble, et c'est 0€ si on ne gagne rien. 🤝

**10.** 
> Ils vous ont laissé sur le tarmac. Et maintenant leur réflexe, c'est d'attendre que vous lâchiez l'affaire. Le nôtre, c'est de faire valoir ce à quoi vous pourriez avoir droit. Commission au succès uniquement.

### `STOP_MOINS_3H` — 10 variantes

**1.** 
> Trois heures. C'est le seuil que le législateur européen a fixé — pas nous.
> 
> Votre retard était réel, et on ne minimise pas ça. Mais tant que l'arrivée est sous 3h, CE 261/2004 ne reconnaît aucune indemnisation. On ne peut rien monter contre une règle que la loi elle-même ne dépasse pas.
> 
> 💡 Vous n'êtes plus sûr de la durée exacte à l'arrivée ? Tapez menu → « Je ne sais plus ».

**2.** 
> Ce n'est pas parce qu'un retard ne donne pas droit à grand-chose qu'il n'a pas compté. Il a compté — et on l'entend.
> 
> Mais CE 261/2004 fixe la barre à 3h de retard à l'arrivée. C'est la loi, et on ne peut pas la contourner, même avec la meilleure volonté.
> 
> 💡 Un doute sur la durée réelle ? Tapez menu → « Je ne sais plus ».

**3.** 
> Voyager c'est déjà un effort. Rajouter un retard par-dessus, même court, c'est une épreuve de plus. On le sait.
> 
> Mais CE 261/2004 pose un seuil clair : 3h de retard à l'arrivée minimum pour ouvrir un droit. En dessous, même la meilleure volonté ne suffit pas — la loi ne nous laisse pas de marge.
> 
> 😔 Pas sûr de la durée exacte ? Tapez menu → « Je ne sais plus ».

**4.** 
> Honnêtement ? Même 2h de retard, c'est trop. Mais la loi, elle, ne voit pas les choses comme ça 😔
> 
> CE 261/2004 exige au moins 3h de retard à l'arrivée pour qu'une indemnité soit possible. En dessous de ce seuil, aucun recours légal n'existe — et on ne peut pas inventer ce que la loi ne prévoit pas.
> 
> Si vous n'êtes pas sûr du retard exact, tapez menu → « Je ne sais plus ».

**5.** 
> La loi est parfois frustrante, on ne va pas se le cacher. Votre retard était bien réel — mais CE 261/2004 ne protège que les retards de 3h ou plus, mesurés à l'arrivée.
> 
> On ne peut pas monter ce dossier, et on le regrette sincèrement.
> 
> 💡 Vous hésitez sur la durée ? Tapez menu → « Je ne sais plus ».

**6.** 
> 😔 On aurait vraiment aimé pouvoir faire quelque chose.
> 
> Mais voilà : CE 261/2004 ne s'applique pas en dessous de 3h de retard à l'arrivée. Votre vol est sous ce seuil — on ne peut pas ouvrir un dossier sur cette base.
> 
> Si vous avez un doute sur la durée exacte, tapez menu → « Je ne sais plus ».

**7.** 
> Même 2h dans un aéroport, c'est long. On ne va pas prétendre le contraire.
> 
> Le problème, c'est que CE 261 ne s'active qu'à partir de 3h de retard constaté à l'arrivée — pas au départ. Avant ce seuil, nos mains sont liées, littéralement.
> 
> 🙏 Pas sûr du retard à l'arrivée ? Tapez menu → « Je ne sais plus ».

**8.** 
> Un retard même court, c'est du stress, parfois une correspondance ratée, de la fatigue. Rien d'anodin là-dedans.
> 
> Pourtant CE 261/2004 est clair : l'indemnisation s'applique à partir de 3h de retard à l'arrivée. C'est le seuil légal — on ne peut pas y déroger.
> 
> 💡 Vous doutez de la durée réelle ? Tapez menu → « Je ne sais plus ».

**9.** 
> Ce retard a dû être éprouvant — l'incertitude, les minutes qui s'étirent, les plans qui partent en fumée. On compatit vraiment.
> 
> Mais CE 261/2004 fixe un seuil précis : 3h de retard à l'arrivée minimum. En dessous, aucune compagnie n'est légalement tenue de payer quoi que ce soit.
> 
> 💡 Pas certain de la durée exacte ? Tapez menu → « Je ne sais plus ».

**10.** 
> On préfère être francs plutôt que de vous faire perdre du temps 🙏
> 
> Attendre dans un aéroport, même 90 minutes, ça use — on ne dit pas le contraire. Mais CE 261 n'intervient qu'au-delà de 3h de retard à l'arrivée. Sans ce seuil, aucune indemnisation n'est possible.
> 
> Pas certain du retard à l'arrivée ? Tapez menu → « Je ne sais plus ».

### `DUREE_INCONNUE` — 10 variantes

**1.** 
> Vraiment, ne vous en voulez pas. Ce jour-là vous aviez la tête ailleurs — les bagages, prévenir la famille, trouver un hôtel. ✈️ La durée, on la retrouve nous-mêmes via les données officielles. C'est notre boulot, pas le vôtre.

**2.** 
> C'est normal, hein — personne ne chronomètre son retard en temps réel, surtout quand on est à bout. 😌 Le numéro de vol suffit, les bases aériennes gardent tout ça. On s'en occupe. C'était quelle destination ?

**3.** 
> Ce genre de détail, les gens ne le retiennent pas — et franchement c'est pas grave. Ce qui compte, c'est que votre vol soit dans les registres officiels. Et pour les vols commerciaux, il y est. ✈️ On retrouve la durée, vous n'avez rien à faire. On continue ?

**4.** 
> Sérieusement, qui pense à noter l'heure d'atterrissage quand son vol est en retard ? Personne. 😊 On a accès aux bases officielles — tout est là, à la minute près. On avance.

**5.** 
> Pas de pression du tout. Ces données existent dans les archives aériennes, nos experts y ont accès. 😌 Votre mémoire n'a rien à voir là-dedans. Donnez-nous juste la date et le numéro de vol, on s'occupe du reste.

**6.** 
> Aucun souci, vous n'avez pas à retenir ces choses-là. 🙂 Ce qui compte c'est ce que vous avez vécu — pas l'heure sur un tableau. La durée exacte, on la retrouve avec le numéro de vol dans les registres officiels. On continue ensemble ?

**7.** 
> Vous n'êtes pas censé retenir ça — les données officielles ont justement une valeur légale parce qu'elles ne dépendent pas de votre mémoire. 👌 On retrouve la durée via ces registres, c'est tout ce qu'il faut pour votre dossier. On continue ?

**8.** 
> La durée exacte, c'est notre rayon — pas le vôtre. 👌 Avec le numéro de vol et la date, on la retrouve dans les archives en quelques secondes. Vous avez la date du vol sous la main ?

**9.** 
> Ce poids-là, vous pouvez le lâcher maintenant. Pendant le retard vous aviez bien d'autres choses à gérer que surveiller les horaires. ✈️ On récupère la durée via les registres officiels — c'est tout ce qu'il nous faut. On continue ?

**10.** 
> Ce détail-là, on le récupère nous-mêmes. Rien à mémoriser, rien à chercher. Chaque vol commercial est déclaré aux autorités — l'heure réelle d'arrivée est enregistrée. On la trouve avec votre numéro de vol. 🙂

### `STOP_ANNUL_14J` — 3 variantes

**1.** 
> Merci pour cette précision — c'est *l'info clé* pour une annulation. 🙏
> 
> La loi européenne (CE 261/2004) prévoit une indemnité *uniquement si* la compagnie vous a prévenu(e) *moins de 14 jours* avant le départ. Au-delà, elle vous a laissé le temps de vous réorganiser : aucune indemnité forfaitaire n'est due. Ce n'est pas nous, c'est la règle — on ne peut pas monter un dossier dessus.
> 
> 💡 Vous gardez quand même droit au *remboursement* du billet ou à un *réacheminement*. Et si en réalité on vous a prévenu(e) *moins de 14 jours* avant, écrivez *go* — on reprend tout de suite.

**2.** 
> On préfère être francs plutôt que de vous lancer dans un dossier qui n'aboutira pas. 🙏
> 
> Quand une compagnie annule en prévenant *au moins 14 jours à l'avance*, le règlement CE 261/2004 ne prévoit *aucune indemnité forfaitaire*. Le seuil est strict, et on ne peut pas le contourner.
> 
> 💡 Il vous reste le droit au *remboursement intégral* ou à un autre vol. Un doute sur la date exacte où on vous a prévenu(e) ? Écrivez *go*, on repart.

**3.** 
> Merci, c'est ça qui fait toute la différence pour une annulation.
> 
> Le seuil, c'est *14 jours* : prévenu(e) *14 jours ou plus* avant le vol, la compagnie est dans son droit et CE 261/2004 ne prévoit pas d'indemnité. On ne peut pas aller contre la loi, même avec la meilleure volonté. 😔
> 
> 💡 Le *remboursement* ou un *réacheminement* vous restent acquis auprès de la compagnie. Si vous pensez avoir été prévenu(e) *moins de 14 jours* avant, écrivez *go*.

### `ANNUL_PREAVIS_INCONNU` — 3 variantes

**1.** 
> Pas de souci, c'est un détail qu'on ne retient pas forcément. 🙂 On confirmera la date exacte avec votre *e-mail ou SMS d'annulation* — c'est lui qui fait foi, gardez-le précieusement. On continue votre dossier.

**2.** 
> Aucun problème — ne vous en faites pas pour la date au jour près. 👌 La preuve, c'est le *message d'annulation* de la compagnie (e-mail ou SMS) : on s'appuiera dessus le moment venu. On avance.

**3.** 
> C'est normal de ne plus savoir exactement. 🙂 Ce qui tranchera, c'est l'*avis d'annulation* que la compagnie vous a envoyé — on le récupérera avec vos pièces. On poursuit pour l'instant.

### `ESTIMATION_QUALIFICATION` — 1 variante

**1.** 
> Jusqu'à 600 € par passager, c'est ce que vous pouvez récupérer. On s'occupe de tout, sans avance. 0 € si on ne gagne pas.

### `SCAN_REUSSI` — 10 variantes

**1.** 
> Voilà, j'ai tout ce qu'il me faut. On gagne du temps — et franchement, vous en avez déjà perdu assez. 🙏

**2.** 
> Votre billet est entre de bonnes mains. J'ai tout, on démarre. 📋

**3.** 
> Bonne nouvelle : tout est là. J'ai lu votre billet directement — zéro dictée, zéro ressaisie. 👌

**4.** 
> Un scan et c'est bon. Vous n'avez rien à me dicter — je pars avec ce que j'ai. ✅

**5.** 
> Votre document a tout dit pour vous. J'ai récupéré ce qu'il me faut, on continue.

**6.** 
> Rien à retaper de votre côté — j'ai tout lu directement. On passe à la suite. ✅

**7.** 
> Billet lu d'un coup d'œil. Rien à taper, on peut y aller. ✅

**8.** 
> Nickel. Tout est extrait — vous n'aurez rien à réécrire.

**9.** 
> Votre billet a bien parlé ! Tout est capturé, vous n'avez rien à retranscrire. 👍

**10.** 
> Les infos sont déjà là, je démarre. Vous n'avez rien à ressaisir.

### `SCAN_RATE` — 10 variantes

**1.** 
> Notre lecteur automatique n'a pas accroché cette fois — c'est lui, pas vous. Pas de souci : quelques réponses courtes et on prend la suite en charge. 👇

**2.** 
> 😕 C'est notre lecteur qui a coincé, pas votre document. Vous pouvez retenter avec une photo plus lumineuse, ou on continue directement à la main — à vous de voir. 👇

**3.** 
> Notre scanner n'a pas réussi à lire votre billet. Ça arrive. Si vous voulez retenter : photo bien éclairée, fond sombre, billet bien à plat. Sinon, quelques questions et c'est reparti pareil. 👇

**4.** 
> Notre lecture auto a calé — mais votre dossier, lui, il avance. Quelques questions simples et on continue sans la photo. On lâche rien. ✊

**5.** 
> La photo n'est pas passée côté lecture automatique. Deux options devant vous : une nouvelle tentative dans un coin bien éclairé, ou on répond à quelques questions à la place. Vous choisissez, on s'adapte. ✊

**6.** 
> Notre système n'a pas réussi à lire votre document — l'éclairage ou le format peuvent bloquer la lecture, c'est connu. La saisie manuelle est exactement là pour ça. Simple, rapide, et votre dossier repart. 🙏

**7.** 
> Ça arrive — notre système a raté la lecture cette fois, et c'est entièrement de notre côté. Tapez vos infos à la main, c'est rapide, et votre demande continue normalement. 🙏

**8.** 
> 😕 Notre outil de lecture automatique a ses limites, et là il les a atteintes. Qu'importe : quelques questions à la place et votre dossier avance exactement comme si la photo avait fonctionné.

**9.** 
> Notre scanner n'a pas réussi à attraper votre billet — ça nous arrive, c'est notre affaire pas la vôtre. 😕 Une nouvelle photo ou les questions manuelles : les deux marchent, votre dossier ne s'arrête pas là.

**10.** 
> Notre scan a buté sur votre document, on s'en excuse. Dites-nous vos infos à la main — quelques questions courtes et c'est reparti. 🙏

### `STOP_HORS_EUROPE` — 10 variantes

**1.** 
> 😔 On a regardé votre vol de près — et franchement, cette nouvelle est difficile à annoncer.
> 
> CE 261/2004 ne couvre que les vols au départ de l'Europe, ou vers l'Europe sur une compagnie européenne. Votre trajet n'entre pas là-dedans.
> 
> Votre galère était réelle. On le sait. 🙏
> 
> ❓ Une erreur de saisie ? Tapez menu pour revérifier.

**2.** 
> On aurait voulu pouvoir vous aider. Vraiment.
> 
> Mais CE 261/2004 a des frontières strictes : vols depuis l'UE, ou vers l'UE avec une compagnie européenne. Votre route se situe en dehors de ça.
> 
> C'est pas juste. Et vous ne méritez pas ça. 🙏
> 
> ❓ Un détail à corriger ? Tapez menu.

**3.** 
> 🔍 Vérification faite — et le résultat n'est pas celui qu'on espérait pour vous.
> 
> Le règlement européen ne joue que sur les vols qui partent d'Europe, ou qui arrivent en Europe sur une compagnie du continent. Le vôtre échappe à ce périmètre.
> 
> On est sincèrement désolés de ne pas pouvoir aller plus loin.
> 
> ❓ Quelque chose à rectifier ? Tapez menu.

**4.** 
> La loi européenne a des angles morts — et c'est là que se situe votre vol.
> 
> CE 261/2004 ne s'applique qu'aux routes qui touchent l'Europe : au départ, ou avec une compagnie européenne. Le vôtre n'y répond pas.
> 
> Cette réponse n'efface pas ce que vous avez vécu. On est désolés. 🙏
> 
> ❓ Un détail à vérifier ? Tapez menu.

**5.** 
> 😔 Mauvaise nouvelle — et on ne va pas l'habiller autrement.
> 
> CE 261/2004, le règlement qui ouvre droit à ce qu'on peut récupérer pour vous, ne couvre pas ce trajet. Il faut soit partir d'Europe, soit y arriver avec une compagnie européenne.
> 
> Votre situation méritait mieux qu'un refus. On le reconnaît.
> 
> ❓ Vol mal saisi ? Tapez menu pour recommencer.

**6.** 
> Votre vol a traversé des milliers de kilomètres. L'attente, la fatigue, le stress — tout ça était bien réel.
> 
> Mais CE 261/2004 ne suit pas jusqu'ici. Il s'arrête aux routes qui touchent l'Europe, soit au départ, soit sur une compagnie européenne.
> 
> On regrette de ne pas pouvoir faire plus. 🙏
> 
> ❓ Un doute sur la saisie ? Tapez menu.

**7.** 
> 🙏 On aurait voulu vous annoncer autre chose.
> 
> Le droit européen — CE 261/2004 — ne s'applique qu'aux vols qui partent d'un pays de l'UE, ou qui y arrivent avec une compagnie basée en Europe. Votre trajet ne coche aucune de ces cases.
> 
> Votre attente, votre stress, votre temps perdu : c'était vrai. Le refus ne change pas ça.
> 
> ❓ Un vol mal renseigné ? Tapez menu.

**8.** 
> Certains vols vivent une vraie galère sans avoir accès à aucun recours européen. C'est injuste — et votre cas en fait partie.
> 
> CE 261/2004 ne s'étend pas à ce trajet : ni le départ, ni la compagnie ne relèvent de l'Europe.
> 
> On ne peut pas changer la loi. Mais on peut au moins reconnaître ce que vous avez traversé. 😔
> 
> ❓ Quelque chose à corriger ? Tapez menu.

**9.** 
> 😔 On a analysé votre vol — et on doit être honnêtes avec vous.
> 
> CE 261/2004 fixe un cadre strict : vols au départ de l'Union européenne, ou vers l'UE sur une compagnie européenne. En dehors de ça, le règlement ne peut pas s'appliquer. Votre dossier tombe hors de ce cadre.
> 
> C'est pas ce qu'on vous souhaitait.
> 
> ❓ Un vol mal saisi ? Tapez menu — on revérifie ensemble.

**10.** 
> Réponse difficile à écrire, parce que vous méritez mieux.
> 
> Votre vol ne relève pas de CE 261/2004 — ce règlement ne s'applique qu'aux routes avec un pied en Europe, au départ ou avec une compagnie européenne. Ce trajet-là reste hors champ.
> 
> 🙏 On aurait sincèrement voulu pouvoir faire plus.
> 
> ❓ Un détail inexact ? Tapez menu pour revérifier.

### `PRESCRIPTION_5ANS` — 10 variantes

**1.** 
> Cinq ans. C'est le délai que la loi accorde pour réclamer, et votre vol le dépasse. Je mesure ce que ça représente — vous aviez peut-être de bonnes raisons d'attendre. Mais passé ce seuil, nos mains sont liées. Si la date renseignée est fausse, tapez menu : ça mérite d'être vérifié. 🔄

**2.** 
> La loi est parfois cruelle dans sa précision : au-delà de 5 ans, le droit de réclamer s'éteint — même quand la compagnie avait clairement tort. Votre galère méritait une suite. Je suis désolé que le temps ne nous ait pas laissé cette chance. Date incorrecte ? Tapez menu, on reprend depuis le début. 😔

**3.** 
> Votre cas m'importe, alors je préfère être honnête avec vous : le délai légal pour réclamer est en général de 5 ans, et votre vol le dépasse. Pas parce que votre dossier est faible — mais parce que la loi ferme cette fenêtre, sans exception. ✏️ Si la date est incorrecte, tapez menu. Ça vaut la peine de vérifier.

**4.** 
> 😔 Mauvaise nouvelle, et je préfère vous la dire franchement : votre vol date de plus de 5 ans. La prescription, c'est comme une horloge que la loi impose — une fois qu'elle sonne, même le meilleur dossier ne peut plus avancer. Si vous pensez à une erreur de date, tapez menu. On vérifie.

**5.** 
> 😞 Je suis désolé. Votre vol dépasse le délai légal — en général 5 ans selon les pays. Ce n'est pas une question de mérite : ce que vous avez subi méritait d'être examiné. C'est simplement la loi qui ferme cette voie. Si la date est fausse, tapez menu, on corrige ensemble.

**6.** 
> Ce que vous avez vécu méritait vraiment qu'on s'en occupe. Mais votre vol remonte à plus de 5 ans, et ce délai — fixé par la loi — est une frontière qu'on ne peut pas franchir. Je suis sincèrement navré de ne pas pouvoir faire plus. Date erronée ? Tapez menu pour corriger.

**7.** 
> La date de votre vol nous pose un problème : elle dépasse les 5 ans, et au-delà la loi ne nous laisse plus agir. C'est une vraie déception, je ne vais pas vous le cacher. Vous aviez peut-être droit à quelque chose — le temps a simplement joué contre vous. Date incorrecte ? Tapez menu pour la rectifier. ✏️

**8.** 
> Votre vol remonte à plus de 5 ans. C'est dur à entendre — vous aviez peut-être attendu le bon moment pour agir, et je comprends ça. Malheureusement la prescription légale ferme cette porte, quelle que soit la solidité du dossier. Si une erreur de date s'est glissée, tapez menu pour vérifier.

**9.** 
> 😔 Cette nouvelle est difficile à annoncer. Votre vol date de plus de 5 ans, et la loi fixe ce cap comme limite pour réclamer — passé là, même un dossier béton ne peut plus avancer. Vous méritiez qu'on se batte pour vous. Je le regrette sincèrement. Si la date saisie est incorrecte, tapez menu pour la corriger.

**10.** 
> C'est un peu comme un billet expiré sans qu'on le sache : passé 5 ans, la loi ne permet plus d'ouvrir un dossier — même si la compagnie était clairement en tort. Je suis désolé de vous l'apprendre à ce stade. Date mal saisie ? Tapez menu, une vérification rapide ne coûte rien. 😞

### `RELANCE_AUTRE_VOL` — 3 variantes

**1.** 
> 💡 Ce vol n'ouvre pas de droit, mais c'est peut-être pas le seul.
> 
> On peut réclamer *jusqu'à 5 ans en arrière*. Un vol *retardé de 3 h ou plus*, annulé ou refusé à l'embarquement (le vôtre ou celui d'un proche) est peut-être concerné.
> 
> ✈️ Un retour de vacances, un mariage, une rentrée… un voyage vous revient en tête ?

**2.** 
> 💡 Pas de droit sur ce vol précis, mais ne refermez pas si vite.
> 
> Les retards de 3 h et plus, les annulations et les surbookings sont fréquents, et la loi permet de remonter *jusqu'à 5 ans*. Un autre de vos vols (ou de votre famille) est peut-être concerné.
> 
> ✈️ Un autre voyage vous revient en tête ?

**3.** 
> 💡 Ce vol n'est pas éligible, mais c'est rarement le seul voyage d'une famille.
> 
> Un vol sur dix est retardé ou annulé, et la réclamation remonte *jusqu'à 5 ans*. Repensez à vos derniers voyages : un retard de *3 h+* à l'arrivée, une annulation, un embarquement refusé peut ouvrir un droit.
> 
> ✈️ On vérifie un autre vol ?

### `CLOTURE_POST_SIGNATURE` — 10 variantes

**1.** 
> Contrat de cession reçu. Et on mesure ce que vous venez de faire — vous nous confiez quelque chose qui vous appartient, et ça, on ne l'oublie pas.
> 
> Promesse concrète : on vous tient au courant, on ne lâche pas, et si ça n'aboutit pas, vous ne nous devez rien. Si la compagnie paie, vous gardez 75 %. Notre part, on la mérite seulement si on a gagné. 💪

**2.** 
> C'est parti. Le bot a fait ce qu'il pouvait — maintenant c'est à des vraies personnes de prendre le relais.
> 
> Chaque dossier chez nous, c'est quelqu'un qui le tient. Pas un algorithme. Quelqu'un qui connaît le CE 261 et qui sait ne pas se laisser balader par une compagnie.
> 
> 0 € si on ne gagne pas. 25 % si on gagne. C'est tout. ✅

**3.** 
> Signature reçue. ✍️ Ce que vous avez vécu peut maintenant déboucher sur quelque chose de concret.
> 
> Notre équipe prend le dossier et interpelle la compagnie à votre place. Fini les relances dans le vide, fini de vous battre seul(e).
> 
> On avance ensemble — 0 € si ça ne passe pas, 25 % le jour où ça passe.

**4.** 
> Le plus dur, il est derrière vous. Vous avez subi le vol, vous avez réuni les documents. Maintenant c'est notre tour.
> 
> L'équipe reprend le dossier, fait face à la compagnie et vous tient au courant au fur et à mesure.
> 
> 0 € si on ne gagne pas. 25 % le jour où une indemnisation est obtenue pour vous. On se bat pour vous. 🤝

**5.** 
> C'est fait. Contrat de cession signé, dossier ouvert.
> 
> À partir de là, c'est Robin des Airs qui affronte la compagnie — plus vous. Vous avez déjà vécu la galère du vol, laissez-nous gérer la suite.
> 
> 0 € si on perd. 25 % si on gagne. Rien d'autre. Une équipe humaine s'en charge dès aujourd'hui. 🏹

**6.** 
> Dossier transmis à l'équipe. La machine s'arrête là, les humains prennent la main.
> 
> L'attente peut être longue — les compagnies ne se pressent pas, c'est connu. Mais on ne lâche pas : relances, escalades, tout ça c'est pour nous, pas pour vous.
> 
> 25 % si on obtient quelque chose. Pas un euro si on échoue. 💪

**7.** 
> Votre confiance est reçue — et on la prend vraiment au sérieux.
> 
> Un membre de l'équipe reprend là où le bot s'arrête. C'est lui qui négocie, qui relance, qui ne lâche pas le dossier.
> 
> Vous n'avancez pas un centime. Si la compagnie paie, vous gardez 75 %. Sinon : 0 €, aucun risque de votre côté. ✅

**8.** 
> Votre dossier est entre de bonnes mains. C'était le plus important à vous dire.
> 
> L'équipe va éplucher chaque détail, rédiger la réclamation et tenir tête à la compagnie si elle résiste — et elles résistent souvent.
> 
> Vous n'avancez rien. Si on obtient quelque chose pour vous, on prend 25 %. Sinon, c'est 0 €, sans discussion. 🏹

**9.** 
> Contrat de cession reçu. ✅ Votre dossier n'est plus entre vos mains — il est entre les nôtres.
> 
> On prend le relais face à la compagnie. Pas d'avance à faire, pas de démarche à gérer de votre côté.
> 
> Une vraie personne de l'équipe porte votre dossier. 0 € si on ne gagne pas, 25 % seulement si vous encaissez. On ne vous laisse pas seul(e). 🤝

**10.** 
> Merci pour votre confiance. Sincèrement.
> 
> Le dossier quitte le bot et arrive dans les mains de l'équipe. À partir de là, c'est la compagnie qui a affaire à nous — plus à vous.
> 
> 0 € de risque, 25 % en cas de succès. Et quelqu'un de réel pour vous accompagner jusqu'au bout. ✅

## 2 · Relances & messages documents (lib/relance-variants.js)
_Placeholders : {REF} {TOTAL} {URL} {NOMS} {NOM} {PB} {VOL}._


### `RELANCE_2H` — 10 variantes

**1.** 
> Bonjour, il vous reste juste une étape sur votre dossier ({VOL}) : votre signature, ça prend 2 min. Vous pourriez toucher jusqu'à {TOTAL}, et si vous ne touchez rien, vous ne payez rien 👉 {URL}

**2.** 
> Petit rappel : votre contrat de cession pour le vol {VOL} est prêt, il manque juste votre signature. À la clé, jusqu'à {TOTAL} — et zéro frais si vous ne touchez rien 👉 {URL}

**3.** 
> Vous y êtes presque. Il ne reste qu'à signer pour qu'on lance votre réclamation ({VOL}). 2 minutes suffisent, jusqu'à {TOTAL} possibles, et rien à payer si ça n'aboutit pas 👉 {URL}

**4.** 
> Ce serait dommage de passer à côté de votre indemnisation. Un seul geste : signer le contrat de cession pour le vol {VOL} pour viser jusqu'à {TOTAL}. C'est l'affaire de 2 minutes 👉 {URL}

**5.** 
> Vous êtes toujours là ? Votre dossier ({VOL}) est complet, il ne manque que votre signature. Aucun risque de votre côté : rien à payer si vous ne touchez rien, et jusqu'à {TOTAL} en jeu 👉 {URL}

**6.** 
> Juste un petit rappel : votre signature suffit à débloquer la réclamation pour le vol {VOL}. 2 min, et vous pourriez récupérer jusqu'à {TOTAL}. Si vous ne touchez rien, c'est gratuit 👉 {URL}

**7.** 
> Votre indemnisation ({VOL}) est à un clic. Vous signez le contrat de cession, on s'occupe de tout le reste. Jusqu'à {TOTAL} possibles, et zéro frais si ça n'aboutit pas 👉 {URL}

**8.** 
> De notre côté, tout est prêt pour le vol {VOL}. Il ne manque plus que votre signature pour viser jusqu'à {TOTAL}. 2 min, et rien à payer si vous ne touchez rien 👉 {URL}

**9.** 
> Ne laissez pas votre dossier ({VOL}) dormir. Une signature suffit à l'activer et à viser jusqu'à {TOTAL}. Et rassurez-vous : si vous ne touchez rien, vous ne payez rien 👉 {URL}

**10.** 
> Plus qu'un petit pas pour votre vol {VOL}. Votre signature lance toute la procédure. 2 minutes pour viser jusqu'à {TOTAL}, et zéro frais si vous ne touchez rien 👉 {URL}

### `RELANCE_FRAIS` — 2 variantes

**1.** 
> 💶 Petit rappel : vos reçus (taxi, hôtel, repas, billet…) partent dans notre 1er envoi si on les a aujourd'hui. Une photo suffit 📷 — ou appuyez sur « Pas de frais ». (Aucun souci si c'est pour plus tard : on peut aussi les ajouter ensuite.)

**2.** 
> 🧾 On envoie bientôt votre réclamation. Si ce vol vous a coûté hôtel, taxi ou repas, envoyez une photo des reçus pour qu'on les joigne — sinon « Pas de frais ». On peut toujours les ajouter plus tard. 🤝

### `RELANCE_8H` — 10 variantes

**1.** 
> Bonjour {NOM}, je reviens vers vous : pas mal de passagers de votre vol ont déjà signé et lancé leur dossier. Ça vaut le coup de ne pas rester de côté, voici votre lien 👉 {URL}

**2.** 
> {NOM}, juste un mot rapide. D'autres voyageurs dans votre cas ont lancé leur demande d'indemnité simplement en signant le contrat de cession. Le vôtre est prêt ici : {URL}

**3.** 
> Petit rappel {NOM} : plusieurs passagers du même vol nous ont déjà rejoints. Plus on est nombreux, plus le dossier tient la route. Vous pouvez signer ici : {URL}

**4.** 
> On reste à vos côtés, {NOM}. Beaucoup de passagers nous ont fait confiance, et l'indemnité peut grimper jusqu'à plusieurs centaines d'euros. Pour démarrer le vôtre : {URL}

**5.** 
> Pas d'inquiétude {NOM}, c'est simple et sans risque : 0€ si vous ne touchez rien. Comme les autres passagers qu'on accompagne, vous pouvez signer votre contrat de cession ici 👉 {URL}

**6.** 
> {NOM}, votre dossier est prêt, exactement comme pour les autres voyageurs avant vous. Une signature et c'est lancé 👉 {URL}

**7.** 
> Beaucoup hésitent au début, puis finissent par signer et lancer leur demande. {NOM}, à vous de jouer, votre contrat de cession vous attend : {URL}

**8.** 
> {NOM}, vous n'êtes pas seul là-dedans : d'autres passagers de votre vol avancent déjà avec nous. Vous pouvez les rejoindre en signant ici 👉 {URL}

**9.** 
> Petit rappel amical, {NOM} : des passagers comme vous ont été indemnisés sans avancer un centime. C'est votre tour, signez votre contrat de cession 👉 {URL}

**10.** 
> {NOM}, votre place dans le dossier est réservée, comme pour les autres passagers qu'on accompagne. Il ne manque plus que votre signature : {URL}

### `RELANCE_22H` — 10 variantes

**1.** 
> Juste un petit mot avant ce soir : passé minuit, on ne pourra plus vous écrire ici (fenêtre WhatsApp de 24 h). Votre lien reste valable, vous n'avez qu'à signer : {URL}
> 0€ si vous ne touchez rien.

**2.** 
> Cette indemnisation, autant qu'elle vous revienne plutôt qu'elle reste à la compagnie. Votre dossier pour le vol {VOL} peut vous rapporter jusqu'à {TOTAL}. La signature prend une minute : {URL}
> 0€ si vous ne touchez rien.

**3.** 
> Dernier message de notre part aujourd'hui pour votre dossier ({VOL}) — après ce soir, on ne pourra plus vous relancer ici, mais votre lien reste valable. Vous validez en un clic : {URL}
> Rien à avancer : on se rémunère seulement quand vous touchez votre argent (25 % en amiable).

**4.** 
> On y est presque. Il ne manque que votre signature pour faire avancer votre dossier ({VOL}), qui peut vous rapporter jusqu'à {TOTAL}. Le lien reste actif : {URL}

**5.** 
> Avant la fin de la journée, je tenais à vous faire un dernier rappel pour votre dossier ({VOL}). Signez ici, et on se charge du reste : {URL}
> 0€ si vous ne touchez rien.

**6.** 
> Cet argent peut vous revenir, pas rester chez la compagnie. Vous pouvez récupérer jusqu'à {TOTAL} avec le dossier du vol {VOL}. Le meilleur moment pour signer, c'est maintenant : {URL}
> 0€ si vous ne touchez rien.

**7.** 
> La journée touche à sa fin et votre dossier ({VOL}) attend toujours votre feu vert. Un clic, et on lance la démarche : {URL}
> 25 % en amiable, prélevés seulement quand vous touchez votre argent.

**8.** 
> Je n'aimerais pas que vous passiez à côté d'une indemnisation qui peut aller jusqu'à {TOTAL}. C'est notre dernier message ici pour le dossier du vol {VOL} (fenêtre WhatsApp) — votre lien, lui, reste actif. Tout se règle en une minute : {URL}

**9.** 
> Un dernier petit rappel pour ce soir. Votre dossier ({VOL}) est prêt, il n'attend plus que votre signature : {URL}
> Si vous ne touchez rien, vous ne payez rien.

**10.** 
> Ce qui peut vous revenir ne devrait pas rester chez la compagnie. Signez votre dossier ({VOL}) quand vous voulez, le lien reste valable : {URL}
> 0€ si vous ne touchez rien.

### `RELANCE_ENGAGED_1` — 6 variantes

**1.** 
> Bonjour {NOM}, on a bien commencé votre dossier pour le vol {VOL}, il ne reste qu'une étape pour viser jusqu'à {TOTAL}. On reprend là où vous vous étiez arrêté ? 👇 Appuyez sur *Reprendre* — et si vous ne touchez rien, vous ne payez rien. Une question ? *Rappel* 📞 et on vous appelle.

**2.** 
> {NOM}, votre dossier {VOL} est presque prêt. Quelques minutes suffisent pour le finaliser et viser jusqu'à {TOTAL} (0 € si vous ne touchez rien). Appuyez sur *Reprendre* 👇, ou *Rappel* 📞 si vous préférez qu'on vous explique de vive voix.

**3.** 
> On ne vous oublie pas {NOM}. Il manque juste la fin de votre dossier (vol {VOL}) pour lancer la réclamation — jusqu'à {TOTAL} possibles. Reprenez quand vous voulez 👇. Besoin d'aide ? Demandez un *Rappel* 📞.

**4.** 
> {NOM}, on était en train d'ouvrir votre dossier pour le vol {VOL}. On le termine ensemble ? Appuyez sur *Reprendre* 👇 pour repartir où on s'est arrêté. Jusqu'à {TOTAL}, et rien à avancer. Vous préférez en parler ? *Rappel* 📞.

**5.** 
> Petit coup de pouce {NOM}. Votre dossier {VOL} est commencé mais pas encore finalisé. Encore 2 min et on peut réclamer jusqu'à {TOTAL} pour vous (0 € si vous ne touchez rien). 👇 *Reprendre*, ou *Rappel* 📞 pour être appelé.

**6.** 
> On y était presque {NOM} ! Pour le vol {VOL}, il ne reste qu'à terminer votre dossier — jusqu'à {TOTAL} en jeu. Appuyez sur *Reprendre* 👇. Une question avant de continuer ? *Rappel* 📞, un conseiller vous appelle.

### `RELANCE_ENGAGED_2` — 6 variantes

**1.** 
> {NOM}, votre dossier {VOL} est encore ouvert chez nous, mais on va bientôt devoir le mettre en pause. Quelques minutes suffisent pour le finaliser (jusqu'à {TOTAL}, 0 € si vous ne touchez rien). Appuyez sur *Reprendre* 👇, ou *Rappel* 📞 pour qu'on vous appelle.

**2.** 
> Dernier petit rappel pour aujourd'hui {NOM}. Votre dossier {VOL} n'attend que vous pour viser jusqu'à {TOTAL}. Reprenez juste en dessous 👇. Vous préférez par téléphone ? *Rappel* 📞.

**3.** 
> {NOM}, on n'aimerait pas que vous passiez à côté de votre indemnisation (jusqu'à {TOTAL}) pour le vol {VOL}. Il reste juste à finaliser votre dossier : appuyez sur *Reprendre* 👇. Ou *Rappel* 📞 et un conseiller vous appelle, sans engagement.

**4.** 
> Votre dossier {VOL} est presque bouclé {NOM}. Encore un petit effort pour réclamer jusqu'à {TOTAL} (et 0 € si vous ne touchez rien). *Reprendre* 👇, ou *Rappel* 📞 pour être appelé aujourd'hui.

**5.** 
> {NOM}, on garde votre dossier {VOL} au chaud, mais il faut le finaliser pour avancer. Jusqu'à {TOTAL} possibles, rien à avancer. Appuyez sur *Reprendre* 👇, ou *Rappel* 📞 si c'est plus simple d'en parler.

**6.** 
> On reste à vos côtés {NOM}. Votre dossier {VOL} peut vous rapporter jusqu'à {TOTAL}. Il ne manque que la fin : *Reprendre* 👇 pour repartir où on s'est arrêté, ou *Rappel* 📞.

### `ENG_RECAP_1` — 3 variantes

**1.** 
> Bonjour {NOM}, votre récapitulatif pour le vol {VOL} est prêt — il n'attend qu'une validation pour qu'on lance la réclamation (jusqu'à {TOTAL}, et 0 € si vous ne touchez rien). Un doute ? C'est sans engagement, on vous explique tout : *Rappel* 📞. Sinon, appuyez sur *Reprendre* 👇.

**2.** 
> {NOM}, on a gardé votre dossier {VOL} de côté. Vous étiez à la dernière vérification — il suffit de confirmer le récap pour avancer (jusqu'à {TOTAL}). Une question avant de valider ? *Rappel* 📞, un conseiller vous appelle. Pour reprendre, appuyez sur *Reprendre* 👇.

**3.** 
> On y est presque {NOM} ! Votre récap pour le vol {VOL} ne demande qu'à être validé pour démarrer (jusqu'à {TOTAL}, rien à avancer). Si quelque chose vous retient, dites-le-nous : *Rappel* 📞. Sinon, appuyez sur *Reprendre* 👇.

### `ENG_RECAP_2` — 3 variantes

**1.** 
> {NOM}, votre dossier {VOL} est toujours là, prêt à partir. Une validation et on s'occupe de tout (jusqu'à {TOTAL}). Appuyez sur *Reprendre* 👇, ou *Rappel* 📞 si vous préférez qu'on en parle.

**2.** 
> Dernier petit rappel {NOM}. Il ne manque que votre validation du récap pour lancer la réclamation vol {VOL} (jusqu'à {TOTAL}, 0 € si vous ne touchez rien). *Reprendre* 👇, ou *Rappel* 📞 pour être appelé.

**3.** 
> On ne voudrait pas que vous laissiez filer votre indemnisation {NOM}. Votre récap {VOL} (jusqu'à {TOTAL}) attend juste votre feu vert. Appuyez sur *Reprendre* 👇, ou *Rappel* 📞 pour la moindre question.

### `ENG_PASS_1` — 3 variantes

**1.** 
> Bonjour {NOM}, il ne manque qu'une *pièce d'identité* pour lancer votre dossier {VOL} (jusqu'à {TOTAL}). C'est obligatoire pour réclamer votre indemnité — et vos données ne servent qu'à ça, jamais revendues. Une simple photo (passeport, CNI ou titre de séjour) suffit. Vous ne l'avez pas sous la main ? *Rappel* 📞, on s'arrange. Sinon, appuyez sur *Reprendre* 👇.

**2.** 
> {NOM}, votre dossier {VOL} attend juste votre *pièce d'identité*. Une photo nette suffit, et c'est protégé — uniquement pour votre réclamation (jusqu'à {TOTAL}, 0 € si vous ne touchez rien). Un souci pour l'envoyer ou la retrouver ? *Rappel* 📞 et on vous guide. Pour reprendre, appuyez sur *Reprendre* 👇.

**3.** 
> On est à deux doigts de lancer votre dossier {VOL}, {NOM} ! Il nous faut juste une *pièce d'identité* (obligatoire pour réclamer votre indemnité auprès de la compagnie). C'est sécurisé et confidentiel. Appuyez sur *Reprendre* 👇 pour envoyer la photo, ou *Rappel* 📞 si vous préférez qu'on vous aide. Jusqu'à {TOTAL} à la clé.

### `ENG_PASS_2` — 3 variantes

**1.** 
> {NOM}, il ne reste qu'une *photo de pièce d'identité* pour boucler votre dossier {VOL}. Passeport, CNI ou titre de séjour — au choix. Appuyez sur *Reprendre* 👇 pour l'envoyer (jusqu'à {TOTAL}, 0 € si vous ne touchez rien), ou *Rappel* 📞 si besoin d'un coup de main.

**2.** 
> Votre dossier {VOL} est presque prêt {NOM} — il n'attend que votre pièce d'identité. Une photo et on prend le relais (jusqu'à {TOTAL}). Appuyez sur *Reprendre* 👇, ou *Rappel* 📞 si vous ne savez pas comment l'envoyer.

**3.** 
> On garde votre place {NOM}. Pour faire avancer votre dossier {VOL}, on a juste besoin d'une pièce d'identité (jamais revendue, uniquement pour la réclamation). Appuyez sur *Reprendre* 👇 pour l'envoyer, ou *Rappel* 📞 et on s'en occupe ensemble.

### `ENG_BOARDING_1` — 3 variantes

**1.** 
> Bonjour {NOM}, carte d'embarquement perdue pour le vol {VOL} ? Aucun souci, c'est fréquent — d'autres preuves font l'affaire : votre *e-billet*, une *confirmation de réservation*, ou même une *étiquette de bagage*. On peut lancer votre dossier (jusqu'à {TOTAL}, 0 € si vous ne touchez rien). Appuyez sur *Reprendre* 👇, ou *Rappel* 📞 et on trouve une solution ensemble.

**2.** 
> {NOM}, ne bloquez pas sur la carte d'embarquement. Pour le vol {VOL}, un *e-billet*, une *confirmation de réservation* ou une *étiquette de bagage* font tout aussi bien l'affaire. Appuyez sur *Reprendre* 👇 pour l'envoyer (jusqu'à {TOTAL}), ou *Rappel* 📞 et on cherche la meilleure preuve ensemble.

**3.** 
> On ne lâche rien pour votre dossier {VOL}, {NOM} ! Carte égarée ? C'est fréquent — un e-billet, une confirmation de réservation ou une étiquette de bagage suffit. Appuyez sur *Reprendre* 👇, ou *Rappel* 📞 si vous ne retrouvez rien : on trouve une solution avec vous. Jusqu'à {TOTAL} en jeu.

### `ENG_BOARDING_2` — 3 variantes

**1.** 
> {NOM}, il ne manque qu'une preuve du vol {VOL}. Carte d'embarquement, e-billet, confirmation de réservation OU étiquette de bagage — n'importe laquelle suffit. Appuyez sur *Reprendre* 👇 pour l'envoyer (jusqu'à {TOTAL}, 0 € si vous ne touchez rien), ou *Rappel* 📞 et on cherche ensemble.

**2.** 
> Votre dossier {VOL} avance bien {NOM} — il reste juste une preuve du voyage. Pas de carte ? Un e-billet, une réservation ou une étiquette de bagage conviennent. Appuyez sur *Reprendre* 👇, ou *Rappel* 📞 et on trouve une solution.

**3.** 
> On y est presque {NOM} ! Pour le vol {VOL}, appuyez sur *Reprendre* 👇 et envoyez n'importe quelle preuve du voyage (carte, e-billet, réservation, étiquette de bagage) — on lance tout (jusqu'à {TOTAL}). Vous ne retrouvez rien ? *Rappel* 📞, on s'en occupe avec vous.

### `ENG_ETICKET_1` — 3 variantes

**1.** 
> Bonjour {NOM}, pour finaliser votre dossier {VOL} (jusqu'à {TOTAL}), il nous faut votre *confirmation de réservation*. Vous ne la retrouvez pas ? Pensez à vos *spams*, à l'*appli de la compagnie*, ou à l'*agence de voyage* qui a réservé pour vous. Bloqué ? *Rappel* 📞, on vous aide à la récupérer. Sinon, appuyez sur *Reprendre* 👇.

**2.** 
> {NOM}, votre dossier {VOL} est presque complet — il ne manque que votre *e-billet* (souvent dans les spams, ou récupérable auprès de l'agence / la compagnie qui a réservé). Appuyez sur *Reprendre* 👇 pour l'envoyer (0 € si vous ne touchez rien), ou *Rappel* 📞 et un conseiller le retrouve avec vous.

**3.** 
> On veut aller au bout de votre dossier {VOL}, {NOM} ! Si l'e-billet vous échappe : vérifiez vos courriers indésirables, ou demandez-le à l'agence / la compagnie qui a réservé. Toujours rien ? *Rappel* 📞, on s'en occupe. Sinon, appuyez sur *Reprendre* 👇. Jusqu'à {TOTAL} à récupérer.

### `ENG_ETICKET_2` — 3 variantes

**1.** 
> {NOM}, il ne reste que votre *confirmation de réservation* pour boucler le dossier {VOL}. Jetez un œil aux spams, ou demandez-la à l'agence / la compagnie qui a réservé. Appuyez sur *Reprendre* 👇 pour l'envoyer (jusqu'à {TOTAL}, 0 € si vous ne touchez rien), ou *Rappel* 📞 si vous voulez qu'on vous aide à la retrouver.

**2.** 
> Votre dossier {VOL} est à un cheveu d'être complet {NOM} — manque juste l'e-billet. Appuyez sur *Reprendre* 👇 pour l'envoyer, ou *Rappel* 📞 et on le récupère ensemble. On ne lâche pas.

**3.** 
> On garde votre dossier {VOL} au chaud {NOM}. Dès qu'on a votre confirmation de réservation (regardez les spams, ou côté agence / compagnie !), on lance la réclamation (jusqu'à {TOTAL}). Appuyez sur *Reprendre* 👇, ou *Rappel* 📞 pour de l'aide.

### `ENG_CERT_1` — 3 variantes

**1.** 
> Bonjour {NOM}, bonne nouvelle : le certificat de retard est *optionnel* — vous n'en avez pas besoin pour qu'on lance votre dossier {VOL} (jusqu'à {TOTAL}) ! Appuyez sur *Reprendre* 👇 (vous pourrez le *passer*) et c'est finalisé. Une question ? *Rappel* 📞.

**2.** 
> {NOM}, ne bloquez pas sur le certificat de retard : il est *facultatif*. Votre dossier {VOL} peut partir sans (jusqu'à {TOTAL}, 0 € si vous ne touchez rien). Appuyez sur *Reprendre* 👇 puis *passer* pour terminer, ou *Rappel* 📞 si vous hésitez.

**3.** 
> Vous y êtes presque {NOM} ! Pas de certificat de retard ? Aucun problème, ce n'est pas obligatoire. Appuyez sur *Reprendre* 👇 puis *passer* et on boucle votre dossier {VOL} (jusqu'à {TOTAL}). Besoin d'un coup de main ? *Rappel* 📞.

### `ENG_CERT_2` — 3 variantes

**1.** 
> {NOM}, votre dossier {VOL} est à deux doigts d'être bouclé — et le certificat n'est même pas nécessaire (c'est optionnel). Appuyez sur *Reprendre* 👇 puis *passer* pour terminer (jusqu'à {TOTAL}, 0 € si vous ne touchez rien), ou *Rappel* 📞 si besoin.

**2.** 
> Dernier pas {NOM}. Inutile d'attendre un certificat de retard pour le vol {VOL}, il est facultatif. Appuyez sur *Reprendre* 👇 puis *passer* et on s'occupe du reste (jusqu'à {TOTAL}). Une question ? *Rappel* 📞.

**3.** 
> On finalise votre dossier {VOL}, {NOM} ? Le certificat est optionnel, pas besoin de l'attendre. Appuyez sur *Reprendre* 👇 puis *passer* (jusqu'à {TOTAL}, 0 € si vous ne touchez rien), ou *Rappel* 📞 pour qu'on vous guide.

### `ENG_EDGE` — 3 variantes

**1.** 
> {NOM}, après ce soir on ne pourra plus vous écrire ici (fenêtre WhatsApp de 24 h) — seulement vous rappeler par téléphone. Encore quelques minutes pour finaliser votre dossier {VOL} et viser jusqu'à {TOTAL} (0 € si vous ne touchez rien). 👇 Reprenez ou demandez un rappel ci-dessous.

**2.** 
> Dernier message d'aujourd'hui pour votre dossier {VOL} {NOM} — passé ce soir, on ne pourra plus vous relancer ici. Votre dossier reste ouvert : un seul geste suffit pour viser jusqu'à {TOTAL}. 👇

**3.** 
> {NOM}, on ne voudrait pas perdre le fil de votre dossier {VOL} : après ce soir, on ne pourra plus vous écrire sur WhatsApp (il faudra nous recontacter). Finalisez-le en quelques minutes (jusqu'à {TOTAL}, rien à avancer). Répondez-nous juste en dessous 👇

### `DOC_MANQUANT` — 10 variantes

**1.** 
> Il nous manque encore deux choses pour avancer : une pièce d'identité de {NOMS} et votre carte d'embarquement (ou le e-billet). Dès qu'on a ça, on lance le dossier {REF}.

**2.** 
> On y est presque ! Il ne reste plus que la pièce d'identité de {NOMS} et votre carte d'embarquement (ou e-billet) à nous envoyer, et on peut traiter le dossier {REF}.

**3.** 
> Pour finaliser votre dossier {REF}, il nous faut encore la pièce d'identité de {NOMS} et votre carte d'embarquement (ou le e-billet). Vous pouvez nous les envoyer directement ici, c'est le plus simple.

**4.** 
> Petit rappel : il nous manque encore la pièce d'identité de {NOMS} et votre carte d'embarquement (ou e-billet). Ce sont les dernières pièces avant qu'on s'occupe du dossier {REF}.

**5.** 
> On avance bien. Pour aller jusqu'au bout du dossier {REF}, envoyez-nous la pièce d'identité de {NOMS} et votre carte d'embarquement (ou e-billet). Et rappelez-vous : rien à avancer, c'est 0€ si vous ne touchez rien.

**6.** 
> Il reste deux documents pour compléter le dossier {REF} : la pièce d'identité de {NOMS} et votre carte d'embarquement (ou e-billet). Merci d'avance !

**7.** 
> Encore un petit effort et c'est bon : il nous manque la pièce d'identité de {NOMS} et votre carte d'embarquement (ou e-billet). Après ça, on s'occupe de tout pour le dossier {REF}.

**8.** 
> Votre demande avance. Pour ne pas bloquer le dossier {REF}, on a besoin de la pièce d'identité de {NOMS} et de votre carte d'embarquement (ou e-billet). Vous pouvez tout nous envoyer ici.

**9.** 
> Plus que deux pièces et on est bons pour le dossier {REF} : la pièce d'identité de {NOMS} et votre carte d'embarquement (ou e-billet). On reste à vos côtés jusqu'au bout.

**10.** 
> Pour faire avancer au mieux votre dossier {REF}, transmettez-nous la pièce d'identité de {NOMS} et votre carte d'embarquement (ou e-billet). Aucun frais d'avance, on n'est payés qu'en cas de succès.

### `DOC_COMPLET` — 10 variantes

**1.** 
> Merci {NOM}, c'est bon : votre dossier {REF} est complet. On prend le relais à partir de maintenant. On va réclamer jusqu'à {TOTAL} pour vous, et s'il n'y a rien à la fin, vous ne payez rien. On s'occupe de tout.

**2.** 
> C'est noté {NOM}. On a bien reçu toutes vos pièces pour le dossier {REF}. On lance la démarche auprès de la compagnie, pour un montant qui peut aller jusqu'à {TOTAL}. Je vous tiens au courant à chaque étape.

**3.** 
> Votre dossier {REF} est complet, {NOM}. Vous pouvez souffler, le plus pénible est derrière vous. On s'occupe de réclamer jusqu'à {TOTAL} pour vous. Et pour rappel : si vous ne touchez rien, vous ne payez rien.

**4.** 
> Bien reçu {NOM}, on a tout ce qu'il faut. Votre dossier {REF} passe maintenant entre nos mains. On part réclamer jusqu'à {TOTAL}. Dès qu'on a du nouveau, je reviens vers vous.

**5.** 
> Merci de votre confiance, {NOM}. Le dossier {REF} est complet, on prend la suite. Vous pourriez toucher jusqu'à {TOTAL}, et vous n'avez aucune avance à faire : si vous ne touchez rien, c'est 0€.

**6.** 
> Tout est en ordre {NOM}. Vos documents pour le dossier {REF} sont validés. On lance la réclamation pour un montant qui peut atteindre {TOTAL}. À partir de là, on fait valoir vos droits auprès de la compagnie.

**7.** 
> C'est confirmé {NOM}, on a tout reçu. Le dossier {REF} est entre nos mains. On lance la réclamation auprès de la compagnie, pour un montant qui peut aller jusqu'à {TOTAL}. Je vous préviens à chaque avancée.

**8.** 
> C'est bon {NOM}, votre dossier {REF} est complet. À nous de jouer maintenant : on réclame jusqu'à {TOTAL}, et si vous ne touchez rien, vous ne payez rien.

**9.** 
> Bien reçu et validé, merci {NOM}. Votre dossier {REF} démarre officiellement. On prend tout en charge face à la compagnie, pour un montant qui peut aller jusqu'à {TOTAL}. Je vous tiens au courant.

**10.** 
> On a toutes les pièces, {NOM}. Le dossier {REF} est lancé. On va se battre pour récupérer jusqu'à {TOTAL} pour vous. Et rassurez-vous : si vous ne touchez rien, c'est 0€ pour vous.

### `DOC_RECU_PIECE` — 9 variantes

**1.** 
> C'est bon, j'ai bien reçu la pièce d'identité de {NOM} 🙏 Je continue et je reviens vers vous très vite.

**2.** 
> Super, la pièce d'identité de {NOM} est bien arrivée 👍 Merci d'avoir fait vite !

**3.** 
> C'est noté ✅ J'ai bien enregistré le document d'identité de {NOM} dans votre dossier.

**4.** 
> Bien reçu pour {NOM} 🙏 Sa pièce d'identité est validée, on avance.

**5.** 
> J'ai reçu et vérifié la pièce d'identité de {NOM} ✅ Tout est bon de ce côté-là.

**6.** 
> Parfait, merci ! 🙏 La pièce de {NOM} est bien rattachée à votre dossier.

**7.** 
> C'est reçu ✅ Le justificatif d'identité de {NOM} est enregistré, rien d'autre à faire pour lui.

**8.** 
> Merci, c'est enregistré 👍 La pièce d'identité de {NOM} est validée chez nous.

**9.** 
> ✅ J'ai bien reçu le document d'identité de {NOM}. Je m'occupe de la suite et je vous tiens au courant 🙏

### `PHOTO_QUALITE` — 10 variantes

**1.** 
> Merci {NOM} ! 🙏 Juste un petit hic : la photo est un peu {PB}, et la compagnie risque de la refuser. Vous pourriez la reprendre bien nette ? À plat, en pleine lumière, les 4 coins visibles. C'est pour blinder votre dossier {REF}.

**2.** 
> Bonne nouvelle, on avance sur {REF} ! Reste juste un détail : la photo est {PB}. Pour qu'on évite un refus de la compagnie, vous pourriez me la renvoyer à plat, bien éclairée, avec les 4 coins visibles ? Merci à vous 🙏

**3.** 
> On veut mettre toutes les chances de votre côté. La photo qu'on a reçue est {PB}, et la compagnie pourrait la rejeter. Un nouveau cliché bien net (pleine lumière, document à plat, les 4 coins dans le cadre) et on repart sur {REF} sans souci.

**4.** 
> Je vous donne un petit coup de main pour protéger votre demande {REF}. La photo est {PB}, et un document peu lisible, ça peut ralentir ou bloquer le dossier. Vous pourriez la reprendre nette, à plat, en pleine lumière ? Merci beaucoup 🙏

**5.** 
> Aucun souci {NOM}, ça arrive tout le temps ! La photo est juste {PB}. Pour que la compagnie l'accepte sans discuter, reprenez-la à plat, bien éclairée, avec les 4 coins visibles. Le reste, on s'en occupe.

**6.** 
> Pour que votre dossier {REF} passe sans accroc, il me faut une photo bien nette 📸 Celle-là est {PB} et risque d'être refusée. À plat, en pleine lumière, les 4 coins visibles, et c'est parfait. Merci 🙏

**7.** 
> J'aimerais vous éviter que la compagnie vous renvoie le document. La photo est {PB}, du coup elle est dure à valider. Vous pourriez m'en renvoyer une plus nette ? À plat, en pleine lumière, les 4 coins visibles. Ça sécurise {REF}.

**8.** 
> On y est presque sur {REF} ! Le seul hic, c'est que la photo est {PB} et qu'elle pourrait être rejetée. Un dernier petit effort : reprenez-la à plat, bien éclairée, les 4 coins dans le cadre. Merci pour votre patience 🙏

**9.** 
> La photo est {PB}, et la compagnie est exigeante sur la lisibilité. Pourriez-vous me la renvoyer nette ? Document à plat, en pleine lumière, les 4 coins visibles — comme ça plus rien ne bloque {REF}.

**10.** 
> Pas d'inquiétude {NOM}, on règle ça vite ! La photo est {PB} : pour qu'elle passe du premier coup, posez le document à plat, en pleine lumière, et vérifiez qu'on voit bien les 4 coins. Merci, ça protège {REF} 🙏

## 3 · Messages inline du flux (server.js)
_Extraits des appels `L(s,en,fr)`, `send()`, `body:`. FR d'abord, 🇬🇧 EN si présent._


**L346** `L`
> 💰 Montant à confirmer par un expert _(vérification gratuite)_
>
> 🇬🇧 💰 Amount to be confirmed by an expert _(free check)_

**L348** `L`
> 💰 ${verified ? '' : "Jusqu'à "}*${montantReel(s)} €* — vous gardez *${montantNetReel(s)} € nets* (75 %)
>
> 🇬🇧 💰 ${verified ? '' : 'Up to '}*€${montantReel(s)}* — you keep *€${montantNetReel(s)} net* (75%)

**L402** `L`
> 🙂 Vous semblez bloqué(e) — pas de souci, je suis là pour vous aider. 👇
>
> 🇬🇧 🙂 Looks like you're stuck — no worries, I'm here. 👇

**L570** `send`
> ${body}\n\n${lines}${hint}${footer ? `\n${footer}` : ''}

**L1264** `L`
> \n_(votre identité sera lue sur le passeport, plus tard)_
>
> 🇬🇧 \n_(your name will be read from your passport, later)_

**L1265** `L`
> \n👤 ${noms.join(', ')} _(les identités des autres passagers viendront de leurs passeports)_
>
> 🇬🇧 \n👤 ${noms.join(', ')} _(the other passengers' names will come from their passports)_

**L1266** `L`
> \n👥 ${noms.length} passager(s) : ${noms.join(', ')}
>
> 🇬🇧 \n👥 ${noms.length} passenger(s): ${noms.join(', ')}

**L1267** `L`
> \n📄 ${pages} pages lues
>
> 🇬🇧 \n📄 ${pages} pages read

**L1270** `L`
> ⚠️ J'ai lu votre billet, mais l'image était *difficile à lire*. Vérifiez bien le *n° de vol* et le *PNR* ci-dessous 👇
>
> 🇬🇧 ⚠️ I read your ticket, but the image was *hard to read*. Please double-check the *flight number* and *PNR* below 👇

**L1276** `L`
> \n\nℹ️ Vol *opéré par ${opName}* (compagnie hors-UE) à l'arrivée en Europe : l'indemnisation européenne ne s'applique pas *automatiquement*. Un expert vérifie *gratuitement* un autre recours — *on garde votre dossier dans tous les cas*. 🤝
>
> 🇬🇧 \n\nℹ️ Flight *operated by ${opName}* (non-EU airline) arriving in Europe: EU compensation does not apply *automatically*. An expert checks *free of charge* for another option — *we keep your case either way*. 🤝

**L1278** `L`
> \n\nℹ️ Ce vol à l'arrivée en Europe est un *vol en partage de code* (code-share). Un expert vérifie *gratuitement* quelle compagnie l'opère réellement, pour confirmer vos droits — *on garde votre dossier dans tous les cas*. 🤝
>
> 🇬🇧 \n\nℹ️ This flight arriving in Europe is a *codeshare*. An expert checks *free of charge* which airline actually operates it, to confirm your rights — *we keep your case either way*. 🤝

**L1282** `L`
> \n📮 Réclamation auprès de : *${s.compagnie_reclamation}*
>
> 🇬🇧 \n📮 Claim filed against: *${s.compagnie_reclamation}*

**L1284** `L`
> ${header}${pageLine}\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${dateLine}\n🎫 PNR : ${s.pnr || '—'}\n🗺️ Trajet : ${s.route || '—'}${claimLine}${paxLine}${opNote}\n\n_E-billet en plusieurs pages ? Envoyez-les, je complète._\nTout est correct ?
>
> 🇬🇧 ${header}${pageLine}\n\n✈️ Flight: ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date: ${dateLine}\n🎫 PNR: ${s.pnr || '—'}\n🗺️ Route: ${s.route || '—'}${claimLine}${paxLine}${opNote}\n\n_E-ticket with several pages? Send them, I'll complete it._\nIs everything correct?

**L1292** `L`
> 📑 Votre billet contient un *aller* et un *retour*.\nQuel vol a connu le problème (retard / annulation) ?\n\n🛫 *Aller* — ${humanizeRoute(a.route) || '—'}${a.date ? ` · ${a.date}` : ''}\n🛬 *Retour* — ${humanizeRoute(r.route) || '—'}${r.date ? ` · ${r.date}` : ''}
>
> 🇬🇧 📑 Your ticket has an *outbound* and a *return*.\nWhich flight had the problem (delay / cancellation)?\n\n🛫 *Outbound* — ${humanizeRoute(a.route) || '—'}${a.date ? ` · ${a.date}` : ''}\n🛬 *Return* — ${humanizeRoute(r.route) || '—'}${r.date ? ` · ${r.date}` : ''}

**L1644** `L`
> ✅ Verso de la carte de *${vp.name || ''}* reçu — la pièce est complète. 🙏
>
> 🇬🇧 ✅ Back of *${vp.name || 'the'}* ID card received — the card is complete. 🙏

**L1664** `L`
> ✅ Pièce de *${cur.name || pp.name}* reçue (${got}/${idExpectedCount(s)})${minor ? ' · 👶 mineur·e, signature parentale' : ''}${expired ? ' · ⚠️ expirée, un conseiller vérifie' : ''}.
>
> 🇬🇧 ✅ ID of *${cur.name || pp.name}* received (${got}/${idExpectedCount(s)})${minor ? ' · 👶 minor, parental signature' : ''}${expired ? ' · ⚠️ expired, an advisor checks' : ''}.

**L1667** `L`
> 📸 Petit détail : c'est une *carte d'identité* — envoyez aussi une photo du *verso* (l'autre face), s'il vous plaît.
>
> 🇬🇧 📸 One more thing: it's a *national ID card* — please also send a photo of the *back* (the other side).

**L1691** `L`
> 😕 Je n'arrive pas à lire cette pièce (photo un peu sombre ou floue ?). Pas de souci, ça arrive 🙏 Réessayez avec une meilleure photo, ou tapez *saisir* pour entrer le nom et la date de naissance.
>
> 🇬🇧 😕 I can't read this document (photo a bit dark or blurry?). No worries, it happens 🙏 Try again with a clearer photo, or type *type* to enter the name and date of birth.

**L1765** `send`
> ${reasonText}\n\n${footer}

**L1839** `L`
> 👋 Re-bonjour ! On reprend votre dossier là où vous vous étiez arrêté.
>
> 🇬🇧 👋 Welcome back! Let's pick up your case right where you left off.

**L1844** `L`
> ✅ *Votre contrat est prêt* — on l'a pré-rempli avec vos infos. Prenez le temps de le relire, puis signez :\n${_u}\n\nSans votre signature, on ne peut pas réclamer votre indemnité.
>
> 🇬🇧 ✅ *Your contract is ready* — we pre-filled it with your details. Take your time to read it, then sign:\n${_u}\n\nWithout your signature, we can't claim your compensation.

**L1900** `L`
> 📸 J'ai bien votre document — je le lis automatiquement dans un instant. D'abord, deux questions rapides 👇
>
> 🇬🇧 📸 Got your document — I'll read it automatically in a moment. First, a couple of quick questions 👇

**L1913** `L`
> 📞 *C'est noté !* Un vrai conseiller Robin des Airs — un humain, pas un robot 🙂 — vous rappelle très vite.\n\n👉 On vous appelle depuis le *+33 7 56 86 36 30* : enregistrez-le tout de suite sous « *Robin des Airs* » pour reconnaître l'appel et *décrocher* (sinon il s'affiche comme un numéro inconnu).\n\n🔒 *0 € tant que vous n'avez rien touché* — si on règle à l'amiable, on prend 25 % (40 % si procédure judiciaire, frais d'avocat inclus), le reste est pour vous.\n\nPas dispo ? Répondez ici quand vous voulez, ou écrivez *go* pour reprendre. 🙏
>
> 🇬🇧 📞 *Got it!* A real Robin des Airs advisor — a human, not a robot 🙂 — will call you back very soon.\n\n👉 We call from *+33 7 56 86 36 30*: save it now as "*Robin des Airs*" so you recognise the call and *pick up* (otherwise it shows as an unknown number).\n\n🔒 *€0 unless you get paid* — if we settle amicably we keep 25% (40% if court action is needed, legal fees included), the rest is yours.\n\nNot available? Reply here whenever you like, or type *go* to resume. 🙏

**L1920** `L`
> De rien 🙏${hasFlow ? '\n\nTapez *go* quand vous voulez reprendre.' : ''}
>
> 🇬🇧 You're welcome 🙏${hasFlow ? '\n\nType *go* whenever you want to resume.' : ''}

**L1927** `L`
> Souhaitez-vous *vérifier un autre vol* ? On peut réclamer jusqu'à *5 ans en arrière*. ✈️
>
> 🇬🇧 Would you like to *check another flight*? We can claim up to *5 years back*. ✈️

**L1937** `L`
> Merci ! ✅ On arrête les rappels. Si jamais votre signature n'était pas encore arrivée chez nous, un conseiller vous le dira — sinon, votre dossier suit son cours. 🙏
>
> 🇬🇧 Thank you! ✅ We'll stop the reminders. If your signature hadn't reached us yet, an advisor will let you know — otherwise your case moves forward. 🙏

**L1945** `L`
> C'est noté, merci ! 🙏 On vérifie de notre côté que tout est complet. S'il manquait quoi que ce soit, un conseiller vous le dira — sinon votre dossier suit son cours. ✅
>
> 🇬🇧 Got it, thank you! 🙏 We'll check on our side that everything is complete. If anything is missing, an advisor will tell you — otherwise your case moves forward. ✅

**L1954** `L`
> 📎 Très bien. Déposez vos pièces (*pièce d'identité* + *carte d'embarquement* ou *e-billet*) en toute sécurité ici 👇\n${_url}\n\nVous pouvez aussi *m'envoyer les photos directement ici*. 🙏\n\n🔒 La pièce sert *uniquement* à réclamer votre argent et à vous le verser au bon nom. Vous pouvez *cacher la bande de chiffres en bas* — on n'a besoin que du nom + photo. Supprimée 30 j après règlement. RGPD.
>
> 🇬🇧 📎 Great. Upload your documents (*ID* + *boarding pass* or *e-ticket*) securely here 👇\n${_url}\n\nYou can also *send me the photos directly here*. 🙏\n\n🔒 Your ID is used *only* to claim your money and pay it to the right name. You can *hide the line of numbers at the bottom* — we only need your name + photo. Deleted 30 days after settlement. GDPR.

**L1966** `L`
> Votre dossier est complet — on s'occupe de tout pour récupérer votre argent. 🙏
>
> 🇬🇧 Your file is complete — we take it from here to recover your money. 🙏

**L1967** `L`
> Prochaine étape pour lancer votre dossier : une photo de votre *pièce d'identité* — c'est elle qui prouve que l'argent revient bien à *vous*.
>
> 🇬🇧 Next step to start your file: a photo of your *ID* — it's what proves the money comes back to *you*.

**L1969** `L`
> 🏦 Noté — *virement bancaire*. On vous demandera votre IBAN au moment du versement. 🙏\n${next}
>
> 🇬🇧 🏦 Noted — *bank transfer*. We'll ask for your IBAN at payout time. 🙏\n${next}

**L1970** `L`
> 📱 Noté — *${pref}*. On vous demandera votre numéro au moment du versement. 🙏\n${next}
>
> 🇬🇧 📱 Noted — *${pref}*. We'll ask for your number at payout time. 🙏\n${next}

**L1987** `L`
> 👍 C'est noté${nm ? ' ' + nm : ''} — je garde votre dossier au chaud, on ne le ferme pas. Reprenez quand vous voulez en écrivant *go*. Je vous ferai juste un petit rappel plus tard, sans insister. 🙏
>
> 🇬🇧 👍 Got it${nm ? ' ' + nm : ''} — I'm keeping your case safe, we won't close it. Resume whenever you like by typing *go*. I'll just send a gentle reminder later, no pressure. 🙏

**L2033** `L`
> 🙂 Pas de souci, je suis là. On reprend où vous en étiez, on recommence à zéro, ou un conseiller vous rappelle. 👇
>
> 🇬🇧 🙂 No worries, I'm here. We can pick up where you left off, start over, or have an advisor call you. 👇

**L2054** `L`
> Je transmets votre demande à un conseiller Robin des Airs. 🙏\nÉcrivez *go* pour continuer votre dossier.
>
> 🇬🇧 I'm passing your request to a Robin des Airs advisor. 🙏\nType *go* to continue your case.

**L2057** `L`
> \n\n👉 Une autre question ? Écrivez-moi. Ou choisissez 👇
>
> 🇬🇧 \n\n👉 Another question? Just write to me. Or choose 👇

**L2057** `L`
> \n\n👉 *Démarrez* ci-dessous 👇
>
> 🇬🇧 \n\n👉 *Start* below 👇

**L2059** `L`
> 🤖 Je suis l'assistant IA de Robin des Airs.
>
> 🇬🇧 🤖 I'm the Robin des Airs AI assistant.

**L2079** `send`
> ${explicit.natif}\n\n💬 *Moi l'assistant, je prépare votre dossier ici en français* (je ne parle pas encore ${explicit.label} 🙏) — on avance ensemble, étape par étape.\n\n📞 Et *à la fin, ${explicit.agent} vous rappellera dans votre langue*, au *+33 7 56 86 36 30* (enregistrez-le sous « ${explicit.agent} – Robin des Airs » pour reconnaître son appel). 👇

**L2080** `send`
> Perfect — from now on we'll talk in English. 🇬🇧\nWe'll check together what you may be owed.\n\n💬 _At any time, just type *go* to start or resume your case._ 👇

**L2081** `send`
> Parfait — on continue en français. 🇫🇷\nOn regarde ensemble ce qui peut vous revenir.\n\n💬 _À tout moment, tapez *go* pour démarrer ou reprendre votre dossier._ 👇

**L2120** `L`
> 👆 Pour continuer, cliquez simplement sur *J'accepte* ci-dessous — c'est à faire une seule fois. 🙏
>
> 🇬🇧 👆 To continue, just tap *I accept* below — it's a one-time step. 🙏

**L2155** `L`
> ✅ Vol au *départ d'Europe* : vous êtes couvert(e) par le CE 261/2004 — *quelle que soit la compagnie*. 👍
>
> 🇬🇧 ✅ Flight *departing from Europe*: you're covered by EC 261/2004 — *whatever the airline*. 👍

**L2160** `L`
> ✅ Vol à *l'arrivée en Europe* : couvert *si la compagnie est européenne* (Air France, Brussels, TAP…). Sinon, un expert vérifie un autre recours — on garde votre dossier dans tous les cas. 👍
>
> 🇬🇧 ✅ Flight *arriving in Europe*: covered *if the airline is European* (Air France, Brussels, TAP…). Otherwise an expert checks another option — we keep your case either way. 👍

**L2165** `L`
> 😔 Si votre vol ne *part pas* d'Europe et n'*arrive pas* en Europe, il n'entre pas dans la loi européenne CE 261/2004.\n\n❓ En cas d'erreur (une escale en Europe compte !), écrivez *go*.
>
> 🇬🇧 😔 If your flight neither *departs from* nor *arrives in* Europe, it doesn't fall under EU law EC 261/2004.\n\n❓ If that's a mistake (a layover in Europe counts!), type *go*.

**L2176** `L`
> 🇪🇺 Les vols intra-européens sont couverts par le CE 261 ✅\nNotre spécialité c'est Afrique ↔ Europe, mais on continue.
>
> 🇬🇧 🇪🇺 Intra-European flights are covered by EC 261 ✅\nOur specialty is Africa ↔ Europe, but let's continue.

**L2177** `L`
> 🛫 Un départ ou une arrivée en Europe peut être éligible. Vérifions ensemble. ✅
>
> 🇬🇧 🛫 A departure from or arrival in Europe can be eligible. Let's check together. ✅

**L2178** `L`
> 😔 Votre vol ne semble pas couvert par la loi européenne.\n\nLe CE 261/2004 s'applique aux vols au départ/à l'arrivée d'un aéroport européen, ou opérés par une compagnie européenne.\n\n❓ Si erreur, écrivez *go* pour choisir une autre route.
>
> 🇬🇧 😔 Your flight doesn't appear to be covered by EU law.\n\nEC 261/2004 applies to flights departing from / arriving at a European airport, or operated by a European airline.\n\n❓ If that's a mistake, type *go* to pick another route.

**L2179** `L`
> 🙂 Je n'ai pas bien compris. Choisissez dans la liste ci-dessous 👇
>
> 🇬🇧 🙂 I didn't quite get that. Choose from the list below 👇

**L2192** `L`
> 🙏 Merci de nous l'avoir dit. Si votre vol est déjà géré ailleurs, on ne peut en général *pas le prendre en cession*. Un conseiller va vérifier votre dossier et vous rappellera au *+33 7 56 86 36 30*. On peut quand même continuer pour l'instant, sans engagement. 👇
>
> 🇬🇧 🙏 Thanks for telling us. If your flight is already handled elsewhere, we usually *cannot take it as an assignment*. A colleague will check your case and call you back at *+33 7 56 86 36 30*. We can still continue for now, with no commitment. 👇

**L2206** `L`
> 😟 Désolé pour ce retard. Votre vol a-t-il eu *3 heures ou plus* de retard ?
>
> 🇬🇧 😟 Sorry about this delay. Did your flight have a delay of *3 hours or more*?

**L2209** `L`
> 🙂 Touchez le bouton qui correspond à votre situation 👇
>
> 🇬🇧 🙂 Tap the button that matches your situation 👇

**L2219** `L`
> 🙂 Je n'ai pas bien compris. Touchez un des boutons ci-dessous 👇
>
> 🇬🇧 🙂 I didn't quite get that. Tap one of the buttons below 👇

**L2227** `L`
> 🙂 Touchez un bouton : votre vol a-t-il eu 3 heures ou plus de retard ?
>
> 🇬🇧 🙂 Tap a button: did your flight have a delay of 3 hours or more?

**L2233** `L`
> ${bar('type_vol')}\n✈️ C'était un vol direct ou avec escale(s) ?
>
> 🇬🇧 ${bar('type_vol')}\n✈️ Was it a direct flight or with connection(s)?

**L2234** `L`
> ${bar('nb_pax')}\n👥 *Combien de passagers en tout ?*\nIndiquez le nombre total (ex. 8). On gère votre groupe directement ici. 🤝
>
> 🇬🇧 ${bar('nb_pax')}\n👥 *How many passengers in total?*\nEnter the total number (e.g. 8). We handle your group right here. 🤝

**L2235** `L`
> 🙂 Je n'ai pas bien compris. Choisissez le nombre de passagers ci-dessous 👇
>
> 🇬🇧 🙂 I didn't quite get that. Pick the number of passengers below 👇

**L2239** `L`
> ${bar('type_vol')}\n✅ ${n} passagers — potentiellement *${montantTotal(n)} €*.\n\n✈️ C'était un vol direct ou avec escale(s) ?
>
> 🇬🇧 ${bar('type_vol')}\n✅ ${n} passengers — potentially *€${montantTotal(n)}*.\n\n✈️ Was it a direct flight or with layover(s)?

**L2240** `L`
> Indiquez le *nombre total* de passagers en chiffres (ex. 8) :
>
> 🇬🇧 Enter the *total number* of passengers in digits (e.g. 8):

**L2251** `L`
> ${bar('scan')}\n📸 Envoyez une *photo* de votre *e-billet* — il contient *tous vos vols d'un coup*, correspondance incluse. Je retrouve tout, vous ne tapez rien.\n🎫 Pas d'e-billet ? Vos *cartes d'embarquement* aussi (une par vol).\n\n💰 Jusqu'à *${montantTotal(s.pax)} €* par passager. *Jusqu'à 75 % pour vous*. Rien à avancer.\n\n_ℹ️ Lecture automatique par IA._
>
> 🇬🇧 ${bar('scan')}\n📸 Send a *photo* of your *e-ticket* — it has *all your flights at once*, connections included. I find everything, you type nothing.\n🎫 No e-ticket? Your *boarding passes* work too (one per flight).\n\n💰 Up to *€${montantTotal(s.pax)}* per passenger. *Up to 75% for you*. Nothing upfront.\n\n_ℹ️ Automatic reading by AI._

**L2256** `L`
> ${bar('type_vol')}\n✈️ Vol direct ou avec escale(s) ?
>
> 🇬🇧 ${bar('type_vol')}\n✈️ Direct flight or with layover(s)?

**L2260** `L`
> ${bar('scan')}\n📸 Envoyez une *photo* de votre billet — je m'occupe de tout.\n\n💰 Jusqu'à *${montantTotal(s.pax)} €* par passager. *Jusqu'à 75 % pour vous*. Rien à avancer.\n\n_ℹ️ Lecture automatique par IA._\n\n📎 Envoyez la photo, ou :
>
> 🇬🇧 ${bar('scan')}\n📸 Send a *photo* of your billet — I'll handle everything.\n\n💰 Up to *€${montantTotal(s.pax)}* per passenger. *Up to 75% for you*. Nothing upfront.\n\n_ℹ️ Automatic reading by AI._\n\n📎 Send the photo, or:

**L2274** `L`
> Ce vol faisait-il partie d'une *correspondance* (un autre vol juste avant ou juste après) ?
>
> 🇬🇧 Was this flight part of a *connection* (another flight just before or just after)?

**L2281** `L`
> ✏️ Tapez le nom de votre ville de *départ* _(ex : Cotonou)_ :
>
> 🇬🇧 ✏️ Type the name of your *departure* city _(e.g. Cotonou)_:

**L2284** `L`
> ✅ Départ : *${pk.city}*
>
> 🇬🇧 ✅ Departure: *${pk.city}*

**L2289** `L`
> ✏️ Tapez le nom de la ville d'*escale* _(ex : Nairobi)_ :
>
> 🇬🇧 ✏️ Type the name of the *layover* city _(e.g. Nairobi)_:

**L2292** `L`
> ✅ Escale : *${pk.city}*
>
> 🇬🇧 ✅ Stop: *${pk.city}*

**L2294** `L`
> ✅ Escale : *${pk.city}*\n\nY avait-il une *autre escale* ?
>
> 🇬🇧 ✅ Stop: *${pk.city}*\n\nWas there *another stop*?

**L2299** `L`
> Y avait-il une *autre escale* ?
>
> 🇬🇧 Was there *another stop*?

**L2303** `L`
> ✏️ Tapez le nom de votre ville d'*arrivée finale* _(ex : Toulouse)_ :
>
> 🇬🇧 ✏️ Type the name of your *final arrival* city _(e.g. Toulouse)_:

**L2308** `L`
> 🤔 Votre arrivée (*${city}*) est identique à votre départ — pour un *aller-retour*, ne décrivez que le voyage qui a eu le problème (l'aller OU le retour).\n🛬 Quelle est la ville d'arrivée de *ce* voyage ?
>
> 🇬🇧 🤔 Your arrival (*${city}*) is the same as your departure — for a *round trip*, describe only the journey that had the problem (outbound OR return).\n🛬 What's the arrival city of *this* journey?

**L2316** `L`
> Numéro non reconnu _(ex : AT540)_. Renvoyez-le, ou tapez *passer* :
>
> 🇬🇧 Number not recognised _(e.g. AT540)_. Send it again, or type *skip*:

**L2321** `L`
> ✈️ Et le numéro du vol *${l.dep} → ${l.arr}* ?\n✏️ _Tapez *passer* si vous ne l'avez plus._
>
> 🇬🇧 ✈️ And the number of flight *${l.dep} → ${l.arr}*?\n✏️ _Type *skip* if you no longer have it._

**L2326** `L`
> 📅 Date du *premier vol* ? _(ex : 15/03/2026)_
>
> 🇬🇧 📅 Date of the *first flight*? _(e.g. 15/03/2026)_

**L2334** `L`
> 🔄 Combien de vols dans votre trajet ?
>
> 🇬🇧 🔄 How many flights in your trip?

**L2336** `L`
> ✈️ *Vol 1 sur ${n2}* — son *code* (ex : AF718), puis *de quelle ville à quelle ville* (ex : Dakar → Casablanca).
>
> 🇬🇧 ✈️ *Flight 1 of ${n2}* — its *code* (e.g. AF718), then *from which city to which city* (e.g. Dakar → Casablanca).

**L2345** `L`
> ✈️ *Vol ${s.legIdx + 1} sur ${s.legCount}* — son *code* (ex : AT540), puis *de quelle ville à quelle ville* (ex : Casablanca → Paris).
>
> 🇬🇧 ✈️ *Flight ${s.legIdx + 1} of ${s.legCount}* — its *code* (e.g. AT540), then *from which city to which city* (e.g. Casablanca → Paris).

**L2364** `L`
> 📑 J'ai vu *plusieurs réservations* (PNR différents) sur cette image. Pour ne pas les mélanger, envoyez-les *une par une* (une photo par réservation), en commençant par le vol qui a eu le problème.
>
> 🇬🇧 📑 I saw *several bookings* (different PNRs) on this image. To avoid mixing them up, send them *one by one* (one photo per booking), starting with the flight that had the problem.

**L2402** `L`
> ⚠️ Ce vol *${r}* s'arrête à ${ville} — il ne touche pas encore l'Europe.\n\nVous avez atterri à ${ville} : *quel vol vous a ensuite ramené(e) en Europe ?* C'est lui qui ouvre vos droits et désigne la compagnie à réclamer.\n\n📎 Envoyez la *2ᵉ carte d'embarquement* (le vol depuis ${ville}), votre *e-billet* (il contient tous les vols), ou l'*étiquette bagage* de votre valise.\n\n_Carte perdue ? Écrivez le n° du vol depuis ${ville}, on le fait à la main._
>
> 🇬🇧 ⚠️ This flight *${r}* stops in ${ville} — it doesn't reach Europe yet.\n\nYou landed in ${ville}: *which flight then brought you back to Europe?* That's the one that opens your rights and names the airline to claim from.\n\n📎 Send the *2nd boarding pass* (the flight from ${ville}), your *e-ticket* (it has all the flights), or your suitcase's *baggage tag*.\n\n_Lost the pass? Type the flight number from ${ville}, we'll do it by hand._

**L2404** `L`
> ✏️ Saisir le vol depuis ${chute || 'l\'escale'}
>
> 🇬🇧 ✏️ Type the flight from ${chute || 'the stop'}

**L2409** `L`
> 😕 Je n'ai pas réussi à lire ce document (PDF protégé, image trop sombre ou coupée…). Réessayez avec une *capture d'écran nette*, ou faisons-le à la main — ça prend 2 min. 👇\n\n💡 *Carte d'embarquement perdue ?* L'*étiquette bagage* collée sur votre valise (celle de la soute) fait aussi l'affaire : elle prouve votre voyage et porte votre n° de vol. 📸 Envoyez-la, on s'occupe du reste.
>
> 🇬🇧 😕 I couldn't read this document (protected PDF, image too dark or cropped…). Try again with a *clear screenshot*, or let's do it by hand — it takes 2 min. 👇\n\n💡 *Lost your boarding pass?* The *baggage tag* on your suitcase (the checked one) works too: it proves your trip and carries your flight number. 📸 Send it, we'll handle the rest.

**L2411** `L`
> 📝 Numéro de vol ? _(ex. AF718, AT540)_
>
> 🇬🇧 📝 Flight number? _(e.g. AF718, AT540)_

**L2414** `L`
> 👍 C'est noté — appuyez sur *📎/+* (ou *📷*) en bas et envoyez la *photo* de votre *e-billet* (il contient tous vos vols), de votre *carte d'embarquement*, ou même de l'*étiquette bagage* collée sur votre valise. Je lis tout. 🔒
>
> 🇬🇧 👍 Got it — tap *📎/+* (or *📷*) below and send a *photo* of your *e-ticket* (it has all your flights), your *boarding pass*, or even the *baggage tag* on your suitcase. I read everything. 🔒

**L2432** `L`
> ✅ Vol ${candidate}${s.compagnie ? ' — ' + s.compagnie : ''}\n\n📅 Date du vol ? _(ex. 15/03/2026)_
>
> 🇬🇧 ✅ Flight ${candidate}${s.compagnie ? ' — ' + s.compagnie : ''}\n\n📅 Flight date? _(e.g. 15/03/2026)_

**L2438** `L`
> 📎 Envoyez une *photo* (ou le *PDF*) de votre e-billet. _Plusieurs pages ? Envoyez-les une par une, je les assemble._\n\n_🔒 En envoyant ce document, vous acceptez qu'il soit lu par un outil automatique (IA) pour pré-remplir votre dossier — robindesairs.eu/politique-confidentialite._
>
> 🇬🇧 📎 Send a *photo* (or the *PDF*) of your e-ticket. _Several pages? Send them one by one, I'll put them together._\n\n_🔒 By sending this document, you agree it will be read by an automated tool (AI) to pre-fill your file — robindesairs.eu/politique-confidentialite._

**L2478** `L`
> ✈️ Vol actuel : *${s.vol || '—'}*\nTapez simplement le *bon numéro* 👇 _(ex. AF718)_
>
> 🇬🇧 ✈️ Current flight: *${s.vol || '—'}*\nJust type the *correct number* 👇 _(e.g. AF718)_

**L2479** `L`
> 📅 Date actuelle : *${s.date || '—'}*\nTapez simplement la *bonne date* 👇 _(JJ/MM/AAAA)_
>
> 🇬🇧 📅 Current date: *${s.date || '—'}*\nJust type the *correct date* 👇 _(DD/MM/YYYY)_

**L2481** `L`
> ✏️ Quel passager corriger ? Indiquez son *numéro* (1 à ${s.pax}).
>
> 🇬🇧 ✏️ Which passenger to fix? Enter their *number* (1 to ${s.pax}).

**L2482** `L`
> 👤 Nom actuel : *${(s.names && s.names[0]) || '—'}*\nTapez simplement le *bon nom complet* 👇
>
> 🇬🇧 👤 Current name: *${(s.names && s.names[0]) || '—'}*\nJust type the *correct full name* 👇

**L2484** `L`
> 🗺️ Trajet actuel : *${s.route || '—'}*\nTapez simplement le *bon trajet* 👇 _(ex. Paris - Dakar)_
>
> 🇬🇧 🗺️ Current route: *${s.route || '—'}*\nJust type the *correct route* 👇 _(e.g. Paris - Dakar)_

**L2485** `L`
> 🎫 PNR actuel : *${s.pnr || '—'}*\nTapez le *bon numéro de réservation* (6 caractères, lettres + chiffres) 👇, ou *passer*.
>
> 🇬🇧 🎫 Current PNR: *${s.pnr || '—'}*\nType the *correct booking reference* (6 characters, letters + digits) 👇, or *skip*.

**L2490** `L`
> 👤 *Passager ${i}* (actuel : ${(s.names && s.names[i - 1]) || '—'})\nTapez le *bon nom complet* 👇
>
> 🇬🇧 👤 *Passenger ${i}* (current: ${(s.names && s.names[i - 1]) || '—'})\nType the *correct full name* 👇

**L2491** `L`
> Indiquez un numéro entre 1 et ${s.pax} :
>
> 🇬🇧 Enter a number between 1 and ${s.pax}:

**L2497** `L`
> 🎫 Le PNR fait 5 à 8 caractères avec des *lettres* (ex : *TFSCBC*). Réessayez, ou tapez *passer*.
>
> 🇬🇧 🎫 The PNR is 5 to 8 characters with *letters* (e.g. *TFSCBC*). Try again, or type *skip*.

**L2502** `L`
> Numéro non reconnu (ex. AF718). Renvoyez-le :
>
> 🇬🇧 Number not recognised (e.g. AF718). Send it again:

**L2510** `L`
> ✅ Date corrigée : *${d}* — le *${dateEnLettres(d)}*.
>
> 🇬🇧 ✅ Date corrected: *${d}* — *${dateEnLettres(d)}*.

**L2514** `L`
> Date non reconnue. Format JJ/MM/AAAA :
>
> 🇬🇧 Date not recognised. Format DD/MM/YYYY:

**L2518** `L`
> Nom trop court. Renvoyez le nom complet :
>
> 🇬🇧 Name too short. Send the full name again:

**L2522** `L`
> Trajet trop court (ex. Paris - Dakar) :
>
> 🇬🇧 Route too short (e.g. Paris - Dakar):

**L2531** `L`
> 😄 ${year} ? Ce vol n'a pas encore eu lieu — on réclame pour un vol *déjà passé* ! Choisissez la bonne année 👇
>
> 🇬🇧 😄 ${year}? That flight hasn't happened yet — we claim for a flight *already past*! Pick the correct year 👇

**L2535** `L`
> ✅ Vol du *${d}* — le *${dateEnLettres(d)}*.
>
> 🇬🇧 ✅ Flight on *${d}* — *${dateEnLettres(d)}*.

**L2546** `L`
> ✅ Vol ${vol}${s.compagnie ? ' — ' + s.compagnie : ''}\n\n📅 Date du vol ? _(ex. 15/03/2026)_
>
> 🇬🇧 ✅ Flight ${vol}${s.compagnie ? ' — ' + s.compagnie : ''}\n\n📅 Flight date? _(e.g. 15/03/2026)_

**L2609** `L`
> Date non reconnue. Format JJ/MM/AAAA (ex. 15/03/2026) :
>
> 🇬🇧 Date not recognised. Format DD/MM/YYYY (e.g. 15/03/2026):

**L2620** `L`
> ✈️ Touchez votre trajet pour *${s.vol}* :
>
> 🇬🇧 ✈️ Tap your route for *${s.vol}*:

**L2637** `L`
> 🗺️ Pas de souci, on le fait ensemble.
>
> 🇬🇧 🗺️ No worries, we'll do it together.

**L2640** `L`
> ✈️ Votre trajet était *${s.route}* ?
>
> 🇬🇧 ✈️ Was your route *${s.route}*?

**L2645** `L`
> ✅ Trajet : *${s.route}*
>
> 🇬🇧 ✅ Route: *${s.route}*

**L2647** `L`
> 🗺️ On le fait ensemble.
>
> 🇬🇧 🗺️ Let's do it together.

**L2654** `L`
> ✏️ Tapez la ville d'où votre avion *décolle* _(ex : Cotonou, ou le code DSS)_ :
>
> 🇬🇧 ✏️ Type the city your plane *takes off from* _(e.g. Cotonou, or the code DSS)_:

**L2657** `L`
> ✅ Décollage : *${pk.city}* 🛫
>
> 🇬🇧 ✅ Takeoff: *${pk.city}* 🛫

**L2662** `L`
> ✏️ Tapez la ville où votre avion *atterrit* _(ex : Toulouse, ou le code CDG)_ :
>
> 🇬🇧 ✏️ Type the city your plane *lands in* _(e.g. Toulouse, or the code CDG)_:

**L2665** `L`
> 🤔 L'arrivée (*${pk.city}*) est identique au départ — pour un *aller-retour*, décrivez le vol qui a eu le problème.\n🛬 Dans quelle ville votre avion *atterrit*-il ?
>
> 🇬🇧 🤔 The arrival (*${pk.city}*) is the same as departure — for a *round trip*, describe the flight that had the problem.\n🛬 In which city does your plane *land*?

**L2689** `L`
> 🎫 Le PNR fait 5 à 8 caractères (lettres/chiffres), ex : *TFSCBC*. Réessayez, ou tapez *passer*.
>
> 🇬🇧 🎫 The PNR is 5 to 8 characters (letters/digits), e.g. *TFSCBC*. Try again, or type *skip*.

**L2707** `L`
> 👤 *Passager ${i}* (actuel : ${s.names[i - 1] || '—'})\n\nTapez simplement le *bon nom complet* 👇\n_(ex : Aminata Diallo)_
>
> 🇬🇧 👤 *Passenger ${i}* (current: ${s.names[i - 1] || '—'})\n\nJust type the *correct full name* 👇\n_(e.g. Aminata Diallo)_

**L2720** `L`
> 👶 Bien noté. L'indemnité d'un mineur est bien due — le *contrat de cession est signé par son parent ou tuteur légal* (on vous guide à l'étape finale, rien à avancer). On continue 👇
>
> 🇬🇧 👶 Noted. A minor's compensation is still due — the *claim-assignment contract is signed by their parent or legal guardian* (we guide you at the final step, nothing to pay upfront). Let's continue 👇

**L2721** `L`
> ${bar('mineurs')}\n👤 Êtes-vous majeur(e) (18+) ?
>
> 🇬🇧 ${bar('mineurs')}\n👤 Are you an adult (18+)?

**L2724** `L`
> 👶 Bien noté — il y a des mineurs. La signature d'un parent/tuteur sera requise pour eux (on s'en occupe avec vous via les passeports). On continue 👇
>
> 🇬🇧 👶 Noted — there are minors. A parent/guardian's signature will be required for them (we handle it with you via the passports). Let's continue 👇

**L2741** `L`
> 👍 *C'est parti !* Appuyez sur *📷* pour photographier votre pièce, ou sur *📎/+* pour l'envoyer depuis votre galerie. 🔒
>
> 🇬🇧 👍 *Let's go!* Tap *📷* to snap your ID, or *📎/+* to send one from your gallery. 🔒

**L2746** `L`
> 👍 C'est noté${_nm ? `, on garde la place de *${_nm}*` : ''}. ℹ️ Mais sa pièce (passeport, CNI ou carte de séjour) reste *indispensable* pour la réclamation — envoyez-la dès que vous pouvez. 🔒
>
> 🇬🇧 👍 Got it${_nm ? `, we keep *${_nm}*'s spot` : ''}. ℹ️ But their ID (passport, national ID or residence permit) remains *essential* for the claim — send it as soon as you can. 🔒

**L2749** `L`
> 👤 *Passager ${s.doc_idx + 1}* — Prénom et nom ?\n_(ex : Aminata Diallo)_\nℹ️ On note le nom, mais la *photo* de sa pièce (passeport, CNI ou carte de séjour) restera nécessaire pour la réclamation. 🔒
>
> 🇬🇧 👤 *Passenger ${s.doc_idx + 1}* — First and last name?\n_(e.g. Aminata Diallo)_\nℹ️ We note the name, but a *photo* of their ID (passport, national ID or residence permit) will still be needed for the claim. 🔒

**L2758** `L`
> 🛂 Envoyez une *photo* de la pièce (passeport, CNI ou carte de séjour). Vous pouvez aussi l'envoyer plus tard 👇
>
> 🇬🇧 🛂 Send a *photo* of the ID (passport, national ID or residence permit). You can also send it later 👇

**L2760** `L`
> 🛂 Envoyez la *photo* de la pièce, ou :
>
> 🇬🇧 🛂 Send the *photo* of the ID, or:

**L2795** `L`
> 📍 Dernier détail pour *${_recPax.name || 'ce passager'}* — son *lieu de naissance* ? _(ville + pays, ex : Dakar, Sénégal — pour vous identifier comme cédant)_
>
> 🇬🇧 📍 Last detail for *${_recPax.name || 'this passenger'}* — *place of birth*? _(city + country, e.g. Dakar, Senegal — to identify you as assignor)_

**L2805** `L`
> 📸 Envoyez la photo de la pièce d'identité du passager ${s.doc_idx + 1}.
>
> 🇬🇧 📸 Send the photo of passenger ${s.doc_idx + 1}'s ID.

**L2809** `L`
> 👤 *Passager ${s.doc_idx + 1}* — Prénom et nom ?\n_(ex : Aminata Diallo)_
>
> 🇬🇧 👤 *Passenger ${s.doc_idx + 1}* — First and last name?\n_(e.g. Aminata Diallo)_

**L2827** `L`
> ✅ C'est noté — c'est *${chosen.name || `Passager ${idx + 1}`}* qui suit le dossier.
>
> 🇬🇧 ✅ Got it — *${chosen.name || `Passenger ${idx + 1}`}* is following the case.

**L2841** `L`
> 📍 Un peu plus — la *ville et le pays de naissance* _(ex : Dakar, Sénégal)_ :
>
> 🇬🇧 📍 A bit more — your *city and country of birth* _(e.g. Dakar, Senegal)_:

**L2850** `L`
> 📍 Un peu plus, svp — au moins votre *ville et pays* _(ex : Médina, Dakar, Sénégal)_ :
>
> 🇬🇧 📍 A bit more, please — at least your *city and country* _(e.g. Médina, Dakar, Senegal)_:

**L2862** `L`
> 📅 *Date de naissance* de ${input} ? _(JJ/MM/AAAA)_
>
> 🇬🇧 📅 *Date of birth* of ${input}? _(DD/MM/YYYY)_

**L2863** `L`
> Nom trop court. Renvoyez prénom et nom :
>
> 🇬🇧 Name too short. Send first and last name again:

**L2869** `L`
> 🤔 Cette date de naissance est dans le futur. Renvoyez-la au format JJ/MM/AAAA _(ex. 05/09/2012)_ :
>
> 🇬🇧 🤔 That date of birth is in the future. Send it again in DD/MM/YYYY format _(e.g. 05/09/2012)_:

**L2874** `L`
> ✅ ${p.name || ('Passager ' + (s.doc_idx + 1))} — ${_ne} le *${dob}* (${dateEnLettres(dob)})${minor ? ` 👶 _(${_min} : signature parentale requise)_` : ''}\n📸 _Sa pièce d'identité (passeport ou carte d'identité) reste à envoyer — indispensable pour réclamer auprès de la compagnie._
>
> 🇬🇧 ✅ ${p.name || ('Passenger ' + (s.doc_idx + 1))} — born *${dob}* (${dateEnLettres(dob)})${minor ? ' 👶 _(minor: parental signature required)_' : ''}\n📸 _Their ID (passport or national ID) is still to be sent — essential to claim from the airline._

**L2878** `L`
> Date non reconnue. Format JJ/MM/AAAA (ex. 05/09/2012) :
>
> 🇬🇧 Date not recognised. Format DD/MM/YYYY (e.g. 05/09/2012):

**L2881** `L`
> ✅ Carte d'embarquement reçue !
>
> 🇬🇧 ✅ Boarding pass received!

**L2883** `L`
> 📞 Pas de panique — un expert vous aide à retrouver vos documents. Laissez la conversation ouverte.\n\n${STOP_FOOTER}
>
> 🇬🇧 📞 Don't worry — an expert helps you find your documents. Keep the conversation open.\n\n${STOP_FOOTER}

**L2884** `L`
> 🎫 Envoyez la carte d'embarquement, ou *passer*, ou *appel* si vous avez tout perdu.
>
> 🇬🇧 🎫 Send the boarding pass, or *skip*, or *call* if you've lost everything.

**L2891** `L`
> ✅ E-billet reçu !${lu}
>
> 🇬🇧 ✅ E-ticket received!${lu}

**L2891** `L`
> ✅ Document bien reçu — notre équipe le vérifiera et l'ajoute à votre dossier. 🙏
>
> 🇬🇧 ✅ Document received — our team will check it and add it to your file. 🙏

**L2894** `L`
> 📞 Un expert vous aide à récupérer votre e-billet. Laissez la conversation ouverte.\n\n${STOP_FOOTER}
>
> 🇬🇧 📞 An expert helps you recover your e-ticket. Keep the conversation open.\n\n${STOP_FOOTER}

**L2895** `L`
> 📧 Envoyez l'e-billet (pensez aux spams/Booking), ou *passer*, ou *appel*.
>
> 🇬🇧 📧 Send the e-ticket (check spam/Booking), or *skip*, or *call*.

**L2898** `L`
> ✅ Certificat reçu — ça accélère votre dossier !
>
> 🇬🇧 ✅ Certificate received — it speeds up your case!

**L2900** `L`
> 📄 Envoyez le certificat de retard (optionnel), ou tapez *passer*.
>
> 🇬🇧 📄 Send the delay certificate (optional), or type *skip*.

**L2913** `L`
> ✅ Noté : *${it ? it.montant : ''} ${dv}* — un montant qui vous revient *en plus* de l'indemnité 🙌\nUn autre reçu ? Envoyez la photo, sinon :
>
> 🇬🇧 ✅ Noted: *${it ? it.montant : ''} ${dv}* — an amount that comes back to you *on top of* the compensation 🙌\nAnother receipt? Send the photo, otherwise:

**L2929** `L`
> ✅ Corrigé : *${val}${it.devise ? ' ' + it.devise : ''}*. Un autre reçu ? Sinon :
>
> 🇬🇧 ✅ Corrected: *${val}${it.devise ? ' ' + it.devise : ''}*. Another receipt? Otherwise:

**L2944** `L`
> ✅ Pièce d'identité de *${paxName(s, a.idx)}* bien reçue. 🙏
>
> 🇬🇧 ✅ ID of *${paxName(s, a.idx)}* received. 🙏

**L2944** `L`
> ✅ Pièce d'identité bien reçue, merci. 🙏
>
> 🇬🇧 ✅ ID received, thank you. 🙏

**L2946** `L`
> ✅ Pièce d'identité bien reçue. 🙏
>
> 🇬🇧 ✅ ID received. 🙏

**L2950** `L`
> ✅ Confirmation de réservation reçue — elle couvre tout le voyage. 👍
>
> 🇬🇧 ✅ Booking confirmation received — it covers the whole trip. 👍

**L2950** `L`
> ✅ Carte d'embarquement reçue. 👍
>
> 🇬🇧 ✅ Boarding pass received. 👍

**L2953** `body`
> ${_ackD}\n\n${L(s, 'An expense receipt (hotel, taxi, meals…)? Send the photo, otherwise:', 'Un reçu de frais (hôtel, taxi, repas…) ? Envoyez la photo, sinon :')}

**L2962** `L`
> 🔁 Ce reçu est *déjà dans votre dossier* — pas besoin de le renvoyer. Un *autre* reçu ? Sinon :
>
> 🇬🇧 🔁 This receipt is *already in your file* — no need to resend it. *Another* receipt? Otherwise:

**L2976** `L`
> ✅ Reçu enregistré — j'ai lu *${montant}*. Dans quelle *monnaie* ? (ex. *€*, *FCFA*, *dirham*, *dalasi*)
>
> 🇬🇧 ✅ Receipt saved — I read *${montant}*. In which *currency*? (e.g. *€*, *FCFA*, *dirham*, *dalasi*)

**L2981** `L`
> \n_Si le montant est faux, réécrivez-le._
>
> 🇬🇧 \n_If the amount is wrong, just retype it._

**L2983** `L`
> ✅ Bien reçu${lu}${dt} — ajouté à votre dossier 🙏 C'est un montant qui *vous revient en plus* de l'indemnité.${fix}\nUn autre reçu (taxi, repas, hôtel…) ? Envoyez la photo, sinon :
>
> 🇬🇧 ✅ Got it${lu}${dt} — added to your file 🙏 It's an amount that *comes back to you on top of* the compensation.${fix}\nAnother receipt (taxi, meal, hotel…)? Send the photo, otherwise:

**L2987** `L`
> C'est noté ✅ On part avec votre indemnité. Si un reçu refait surface plus tard, envoyez-le, on l'ajoute. 🤝
>
> 🇬🇧 Got it ✅ We proceed with your compensation. If a receipt turns up later, send it and we'll add it. 🤝

**L2995** `L`
> C'est noté ✅ On joint vos reçus à votre réclamation${tot !== '—' ? ` (≈ ${tot} de frais, en plus de l'indemnité)` : ''}. Merci ! 🤝
>
> 🇬🇧 Got it ✅ We attach your receipts to your claim${tot !== '—' ? ` (≈ ${tot} in expenses, on top of the compensation)` : ''}. Thank you! 🤝

**L2998** `L`
> 👍 Envoyez une *photo* de chaque reçu (hôtel, repas, taxi…). Ces montants vous reviennent *en plus* de l'indemnité. Même flou, même plusieurs — envoyez juste ce que vous avez vraiment payé.
>
> 🇬🇧 👍 Send a *photo* of each receipt (hotel, meals, taxi…). These amounts come back to you *on top of* the compensation. Even blurry, even several — just send what you actually paid.

**L3000** `L`
> 💶 Des frais à cause de ce vol (hôtel, repas, taxi…) ? Ils vous sont remboursés *en plus* de l'indemnité — envoyez une *photo* du reçu, ou :
>
> 🇬🇧 💶 Any expenses because of this flight (hotel, meals, taxi…)? They're reimbursed *on top of* the compensation — send a *photo* of the receipt, or:

**L3014** `L`
> ✅ Bien reçu, merci 🙏 — un conseiller vérifie ce document et l'ajoute à votre dossier.\n\n${missingDocsText(s)}
>
> 🇬🇧 ✅ Well received, thank you 🙏 — an advisor checks this document and adds it to your file.\n\n${missingDocsText(s)}

**L3036** `L`
> ✅ Pièce d'identité bien reçue, merci 🙏 — un conseiller la rattache au bon passager.
>
> 🇬🇧 ✅ ID received, thank you 🙏 — an advisor attaches it to the right passenger.

**L3042** `L`
> ✅ Confirmation de réservation reçue — elle couvre *tout le voyage et tous les passagers*. 👍
>
> 🇬🇧 ✅ Booking confirmation received — it covers *the whole trip and all passengers*. 👍

**L3042** `L`
> ✅ Carte d'embarquement reçue${d.nom ? ` (${titleCaseName(d.nom.split(/\s+/)[0])})` : ''}. 👍
>
> 🇬🇧 ✅ Boarding pass received${d.nom ? ` (${titleCaseName(d.nom.split(/\s+/)[0])})` : ''}. 👍

**L3047** `L`
> 🔁 Ce reçu est *déjà dans votre dossier* — pas besoin de le renvoyer. 👍
>
> 🇬🇧 🔁 This receipt is *already in your file* — no need to resend it. 👍

**L3054** `L`
> 🧾 Reçu de frais bien reçu${lu} — on le joint à votre réclamation (hôtel, taxi, repas… remboursables, art. 8 & 9). 👍
>
> 🇬🇧 🧾 Expense receipt received${lu} — we attach it to your claim (hotel, taxi, meals… reimbursable, art. 8 & 9). 👍

**L3057** `L`
> ✅ Document bien reçu, merci. 🙏 Notre équipe l'ajoute à votre dossier.
>
> 🇬🇧 ✅ Document received, thank you. 🙏 Our team adds it to your file.

**L3059** `send`
> ${ack}\n\n${missingDocsText(s)}

**L3064** `L`
> ✅ *Dossier ${shortRef(s.ref)} bien enregistré.*\n\n
>
> 🇬🇧 ✅ *File ${shortRef(s.ref)} saved.*\n\n

**L3066** `L`
> 📎 *Un justificatif en plus ?* (reçu de frais, hôtel, taxi…)\nEnvoyez-le ici, ou sur votre lien sécurisé 👉\n${_url}
>
> 🇬🇧 📎 *One more supporting document?* (expense receipt, hotel, taxi…)\nSend it here, or via your secure link 👉\n${_url}

**L3067** `L`
> 📎 *Envoyez vos pièces* ici, ou sur votre lien sécurisé 👉\n${_url}
>
> 🇬🇧 📎 *Send your documents* here, or via your secure link 👉\n${_url}

**L3068** `send`
> ${_lead}${missingDocsText(s)}\n\n

**L3072** `L`
> 📞 *Un expert vous rappelle* au *+33 7 56 86 36 30*\n_Enregistrez ce numéro sous « Robin des Airs » pour reconnaître l'appel._\n\n
>
> 🇬🇧 📞 *An expert will call you* at *+33 7 56 86 36 30*\n_Save this number as "Robin des Airs" to recognise the call._\n\n

**L3073** `L`
> ✍️ Un autre dossier ? Écrivez *nouveau*.
>
> 🇬🇧 ✍️ Another claim? Type *new*.

**L3078** `L`
> Je n'ai pas compris 🙂 Reprenez où on s'était arrêté 👇
>
> 🇬🇧 I didn't quite get that 🙂 Let's pick up where you left off 👇

**L3087** `L`
> du *${s.date}*
>
> 🇬🇧 on *${s.date}*

**L3090** `L`
> ✅ C'est noté — votre *vol ${s.vol}*${dStr} a été *annulé*.
>
> 🇬🇧 ✅ Got it — your *flight ${s.vol}*${dStr} was *cancelled*.

**L3094** `L`
> ✅ C'est noté — votre *vol ${s.vol}*${dStr} a été *retardé*.\nCe type de vol Europe ↔ Afrique est *souvent éligible*.\n\nPour ne rien oublier : ce vol faisait-il partie d'une *correspondance* (un autre vol juste avant ou juste après) ?
>
> 🇬🇧 ✅ Got it — your *flight ${s.vol}*${dStr} was *delayed*.\nThis kind of Europe ↔ Africa flight is *often eligible*.\n\nJust to be thorough: was this flight part of a *connection* (another flight just before or just after)?

**L3118** `body`
> ${bar('langue')}\n🌍 Dans quelle langue souhaitez-vous être accompagné(e) ?\n_In which language would you like to be assisted?_

**L3135** `L`
> 📋 *Avant de commencer*\n\nPour utiliser Robin des Airs, merci d'accepter :\n\n📖 *Nos conditions générales*\n👉 https://robindesairs.eu/cgv.html\n\n🔒 *Notre politique de confidentialité* (vos données servent *uniquement* à traiter votre dossier, jamais revendues)\n👉 https://robindesairs.eu/politique-confidentialite.html\n\nCliquez ci-dessous pour accepter les deux et démarrer.
>
> 🇬🇧 📋 *Before you start*\n\nTo use Robin des Airs, please accept:\n\n📖 *Our terms of service*\n👉 https://robindesairs.eu/cgv.html\n\n🔒 *Our privacy policy* (your data is used *only* to handle your case, never sold)\n👉 https://robindesairs.eu/politique-confidentialite.html\n\nTap below to accept both and start.

**L3150** `L`
> ${bar('consent_rgpd')}\n🔒 *Étape 2/2 — Politique de confidentialité*\n\nVos données servent *uniquement* à gérer votre dossier, jamais revendues. Merci de consulter notre *politique de confidentialité* :\n👉 https://robindesairs.eu/politique-confidentialite.html\n\nCliquez sur *Accéder au service* pour accepter et démarrer.
>
> 🇬🇧 ${bar('consent_rgpd')}\n🔒 *Step 2/2 — Privacy Policy*\n\nYour data is used *only* to handle your case, never sold. Please read our *privacy policy* :\n👉 https://robindesairs.eu/politique-confidentialite.html\n\nTap *Access the service* below to accept and start.

**L3162** `L`
> ${bar('route')}\n🗺️ Votre vol était sur quelle route ?\nCela détermine si le CE 261/2004 s'applique.
>
> 🇬🇧 ${bar('route')}\n🗺️ Which route was your flight on?\nThis determines whether EC 261/2004 applies.

**L3171** `L`
> ${bar('route')}\n🗺️ Votre vol touche-t-il l'Europe, au départ ou à l'arrivée ?
>
> 🇬🇧 ${bar('route')}\n🗺️ Does your trip touch Europe — at departure or arrival?

**L3184** `L`
> ⚖️ Une vérification rapide avant de commencer.\n\nPour *ce vol*, votre dossier est-il déjà géré par *quelqu'un d'autre* (une autre société, un avocat, ou une procédure au tribunal) ?
>
> 🇬🇧 ⚖️ One quick check before we start.\n\nFor *this flight*, is your claim already handled by *someone else* (another company, a lawyer, or a court case)?

**L3189** `L`
> ${bar('incident')}\n✈️ Racontez-nous ce qui s'est passé avec votre vol.
>
> 🇬🇧 ${bar('incident')}\n✈️ Tell us what happened with your flight.

**L3196** `L`
> ${bar('incident')}\n📅 Pour une *annulation*, c'est le *moment où on vous a prévenu(e)* qui compte.\n\nQuand la compagnie a annoncé l'annulation, votre vol était dans *moins de 14 jours* ou *14 jours ou plus* ?
>
> 🇬🇧 ${bar('incident')}\n📅 For a *cancellation*, what matters is *when you were told*.\n\nWhen the airline announced the cancellation, was your flight *less than 14 days* away or *14 days or more*?

**L3207** `L`
> ${bar('nb_pax')}\n👥 Combien de passagers réclament sur ce vol ?
>
> 🇬🇧 ${bar('nb_pax')}\n👥 How many passengers are claiming on this flight?

**L3214** `L`
> ${bar('annee')}\n📅 Votre billet indique le *${s.date}* mais ne précise pas l'année.\nC'était quelle année ?
>
> 🇬🇧 ${bar('annee')}\n📅 Your ticket shows *${s.date}* but doesn't specify the year.\nWhich year was it?

**L3214** `L`
> Avant ${ys[ys.length - 1]}
>
> 🇬🇧 Before ${ys[ys.length - 1]}

**L3218** `L`
> ✏️ Que souhaitez-vous corriger ?
>
> 🇬🇧 ✏️ What would you like to fix?

**L3228** `L`
> 📋 Vérifiez :\n\n✈️ Vol : ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date : ${s.date ? `${s.date}${isValidStoredDate(s.date) ? ` (${dateEnLettres(s.date)})` : ''}` : '—'}\n🎫 PNR : ${s.pnr || '—'}\n👤 Passager : ${(s.names && s.names[0]) || '—'}\n🗺️ Trajet : ${s.route || '—'}\n\nC'est correct ?
>
> 🇬🇧 📋 Please check:\n\n✈️ Flight: ${s.vol || '—'} — ${s.compagnie || '—'}\n📅 Date: ${s.date ? `${s.date}${isValidStoredDate(s.date) ? ` (${dateEnLettres(s.date)})` : ''}` : '—'}\n🎫 PNR: ${s.pnr || '—'}\n👤 Passenger: ${(s.names && s.names[0]) || '—'}\n🗺️ Route: ${s.route || '—'}\n\nIs this correct?

**L3238** `L`
> ✈️ J'ai retrouvé votre trajet : *${s.route}*${s.compagnie ? ` (${s.compagnie})` : ''}.\nC'est bien ça ?
>
> 🇬🇧 ✈️ I found your route: *${s.route}*${s.compagnie ? ` (${s.compagnie})` : ''}.\nIs that right?

**L3246** `L`
> ✈️ Quel était votre trajet exact pour *${s.vol}* ?
>
> 🇬🇧 ✈️ What was your exact route for *${s.vol}*?

**L3251** `L`
> ${prefix ? prefix + '\n\n' : ''}🎫 Quel est votre *numéro de réservation* (PNR) ?\nC'est un code de 6 lettres/chiffres, sur votre billet ou votre email de confirmation _(ex : TFSCBC)_.\n✏️ Tapez *passer* si vous ne l'avez pas.
>
> 🇬🇧 ${prefix ? prefix + '\n\n' : ''}🎫 What's your *booking reference* (PNR)?\nIt's a 6-character code (letters/digits), on your ticket or confirmation email _(e.g. TFSCBC)_.\n✏️ Type *skip* if you don't have it.

**L3256** `body`
> ${prefix ? prefix + '\n\n' : ''}${L(s, `🛫 Which city does your *plane take off* from?`, `🛫 De quelle ville votre *avion décolle*-t-il ?`)}

**L3256** `L`
> 🛫 De quelle ville votre *avion décolle*-t-il ?
>
> 🇬🇧 🛫 Which city does your *plane take off* from?

**L3260** `L`
> 🛬 Et dans quelle ville votre *avion atterrit*-il ? _(votre arrivée)_
>
> 🇬🇧 🛬 And in which city does your *plane land*? _(your arrival)_

**L3268** `L`
> ✈️ Ce vol dessert *${chain}*.\nOù êtes-vous *descendu(e)* ? _(votre arrivée)_
>
> 🇬🇧 ✈️ This flight serves *${chain}*.\nWhere did you *get off*? _(your arrival)_

**L3287** `body`
> ${intro ? intro + '\n\n' : ''}${bar('esc_dep')}\n${L(s, `🛫 What is the *departure* city of your trip?`, `🛫 Quelle est la ville de *départ* de votre voyage ?`)}

**L3287** `L`
> 🛫 Quelle est la ville de *départ* de votre voyage ?
>
> 🇬🇧 🛫 What is the *departure* city of your trip?

**L3291** `L`
> 🔄 Dans quelle ville était l'escale *suivante* ?
>
> 🇬🇧 🔄 In which city was the *next* layover?

**L3291** `L`
> 🔄 Dans quelle ville avez-vous fait *escale* ?
>
> 🇬🇧 🔄 In which city did you have a *layover*?

**L3295** `body`
> ${prefix ? prefix + '\n\n' : ''}${L(s, `🛬 And what is your *final arrival* city?`, `🛬 Et quelle est votre ville d'*arrivée finale* ?`)}

**L3295** `L`
> 🛬 Et quelle est votre ville d'*arrivée finale* ?
>
> 🇬🇧 🛬 And what is your *final arrival* city?

**L3303** `L`
> ✅ Trajet : *${s.route}*\n\n✈️ Numéro du vol *${s.legs[0].dep} → ${s.legs[0].arr}* ? _(ex : AT540, sur votre billet)_\n✏️ Tapez *passer* si vous ne l'avez plus.
>
> 🇬🇧 ✅ Route: *${s.route}*\n\n✈️ Number of flight *${s.legs[0].dep} → ${s.legs[0].arr}*? _(e.g. AT540, on your ticket)_\n✏️ Type *skip* if you no longer have it.

**L3315** `L`
> ${bar('mineurs')}\n👶 Parmi les ${s.pax} passagers, y a-t-il des mineurs (–18 ans) ?
>
> 🇬🇧 ${bar('mineurs')}\n👶 Among the ${s.pax} passengers, are there any minors (under 18)?

**L3322** `L`
> ${bar('recap')}\n📋 *Récapitulatif — confirmez svp*\n\n👥 ${s.pax} passager${s.pax > 1 ? 's' : ''}\n_Identités à l'étape suivante (pièce d'identité ou saisie)_\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}${claimLineR}\n🎫 PNR : ${s.pnr || '—'}\n🗺️ ${s.route || '—'}\n📅 ${dateLine} — ${incidentLabel(s)}\n🛤️ ${s.type_vol === 'escale' ? 'Avec escale' : 'Direct'}\n${montantLine(s)}
>
> 🇬🇧 ${bar('recap')}\n📋 *Summary — please confirm*\n\n👥 ${s.pax} passenger${s.pax > 1 ? 's' : ''}\n_Names at the next step (ID or typing)_\n✈️ ${s.vol || '—'} — ${s.compagnie || '—'}${claimLineR}\n🎫 PNR: ${s.pnr || '—'}\n🗺️ ${s.route || '—'}\n📅 ${dateLine} — ${incidentLabel(s)}\n🛤️ ${s.type_vol === 'escale' ? 'With layover' : 'Direct'}\n${montantLine(s)}

**L3343** `L`
> ✅ *Bonne nouvelle !* ${v.proofLine || 'Selon nos critères, votre vol est a priori éligible (notre équipe confirme).'}\nVous pouvez prétendre à *${montantReel(s)} €*${claimablePax(s) > 1 ? ` au total (${claimablePax(s)} passagers)` : ''} — soit *${montantNetReel(s)} € nets* pour vous.
>
> 🇬🇧 ✅ *Good news!* ${isEN(s) ? 'Based on our criteria, your flight looks eligible (our team confirms).' : (v.proofLine || '')}\nYou may claim *€${montantReel(s)}*${claimablePax(s) > 1 ? ` in total (${claimablePax(s)} passengers)` : ''} — that's *€${montantNetReel(s)} net* for you.

**L3350** `L`
> ℹ️ D'après les données de vol, ce trajet n'entre pas *automatiquement* dans le règlement européen (compagnie hors-UE au départ hors-UE). Pas d'inquiétude : un expert vérifie *gratuitement* s'il existe un autre recours. On garde votre dossier. 🤝
>
> 🇬🇧 ℹ️ According to flight data, this trip doesn't *automatically* fall under EU rules (non-EU airline departing outside the EU). No worries: an expert checks *free of charge* whether another option exists. We keep your case. 🤝

**L3353** `L`
> ℹ️ Selon les données, le retard est *sous le seuil des 3h* pour l'indemnité forfaitaire. Mais vous avez peut-être droit au *remboursement de vos frais* — un expert vérifie. On garde votre dossier. 🤝
>
> 🇬🇧 ℹ️ According to the data, the delay is *below the 3h threshold* for fixed compensation. But you may be entitled to *reimbursement of your expenses* — an expert checks. We keep your case. 🤝

**L3356** `L`
> 🔎 Un expert confirmera le *montant exact* de votre dossier. On continue. 👍
>
> 🇬🇧 🔎 An expert will confirm the *exact amount* of your case. Let's continue. 👍

**L3381** `L`
> ${bar('names')}\n${prefix}👤 *Passager ${s.name_idx + 1} sur ${s.pax}* — Prénom et nom ?\n_(ex : Aminata Diallo)_
>
> 🇬🇧 ${bar('names')}\n${prefix}👤 *Passenger ${s.name_idx + 1} of ${s.pax}* — First and last name?\n_(e.g. Aminata Diallo)_

**L3386** `L`
> ${bar('names')}\n👥 *Les ${s.pax} passagers :*\n${list}\n\nTout est correct ?
>
> 🇬🇧 ${bar('names')}\n👥 *The ${s.pax} passengers:*\n${list}\n\nIs everything correct?

**L3402** `L`
> ✅ *Presque fini${_fn ? ', ' + _fn : ''} !* Il ne manque qu'une chose pour lancer votre réclamation.\n\n
>
> 🇬🇧 ✅ *Almost done${_fn ? ', ' + _fn : ''}!* Just one thing left to file your claim.\n\n

**L3407** `L`
> Passager ${i + 1}
>
> 🇬🇧 Passenger ${i + 1}

**L3408** `L`
> 👶 ${i + 1}. ${nm} — _mineur, pièce non requise_\n
>
> 🇬🇧 👶 ${i + 1}. ${nm} — _minor, no ID needed_\n

**L3409** `L`
> ⏳ ${i + 1}. ${nm} — _pièce à envoyer_\n
>
> 🇬🇧 ⏳ ${i + 1}. ${nm} — _ID to send_\n

**L3415** `L`
> 🛂 *Passager ${s.doc_idx + 1} sur ${s.pax}*${who}\n
>
> 🇬🇧 🛂 *Passenger ${s.doc_idx + 1} of ${s.pax}*${who}\n

**L3415** `L`
> 🛂 *Votre pièce d'identité*${who}\n
>
> 🇬🇧 🛂 *Your ID document*${who}\n

**L3416** `L`
> ${bar('documents')}\n${intro}${header}${passLine}📸 *Une seule photo suffit* (passeport, CNI ou carte de séjour). On lit tout pour vous — rien à remplir.\n_🔒 Conservée pour votre seul dossier — robindesairs.eu/politique-confidentialite_
>
> 🇬🇧 ${bar('documents')}\n${intro}${header}${passLine}📸 *Just one photo* (passport, national ID or residence permit). We read it all for you — nothing to fill in.\n_🔒 Kept for your file only — robindesairs.eu/politique-confidentialite_

**L3426** `L`
> ✅ Pièces collectées ! Une dernière chose.\n\n📱 *À qui appartient ce numéro WhatsApp ?*\n_(la personne qui suit le dossier — chaque passager signera son propre contrat de cession, peu importe lequel.)_
>
> 🇬🇧 ✅ Documents collected! One last thing.\n\n📱 *Whose WhatsApp number is this?*\n_(the person following the case — each passenger signs their own claim-assignment contract, whichever it is.)_

**L3442** `L`
> 📍 *Votre adresse postale ?* Quartier, ville et pays suffisent — pas besoin de code postal. _(ex : Médina, Dakar, Sénégal)_
>
> 🇬🇧 📍 *Your postal address?* District, city and country are enough — no postcode needed. _(e.g. Médina, Dakar, Senegal)_

**L3452** `L`
> 📧 *Dernière question — votre email ?* On vous y enverra votre contrat signé.\n✏️ Écrivez-le — ou, *si vous n'avez pas d'email*, tapez *passer*.
>
> 🇬🇧 📧 *Last question — your email?* We'll send your signed contract there.\n✏️ Type it — or, *if you don't have an email*, type *skip*.

**L3456** `L`
> 🎫 Carte d'embarquement\nEnvoyez-en une photo pour le vol concerné.\n📧 Pas de carte ? Un e-billet, une confirmation de réservation ou une étiquette de bagage fonctionnent aussi.\n_🔒 Lu par un outil automatique (IA) pour pré-remplir votre dossier — voir robindesairs.eu/politique-confidentialite._\n✏️ *passer* · 📞 *appel* si tout perdu, on trouve une solution.
>
> 🇬🇧 🎫 Boarding pass\nSend a photo for the affected flight.\n📧 No pass? An e-ticket, a booking confirmation or a baggage tag work too.\n_🔒 Read by an automated tool (AI) to pre-fill your file — see robindesairs.eu/politique-confidentialite._\n✏️ *skip* · 📞 *call* if all lost, we'll find a solution.

**L3457** `L`
> 📧 Confirmation de réservation (e-billet)\nEnvoyez une capture (pensez aux spams / appli Booking).\n✏️ *passer* · 📞 *appel*.
>
> 🇬🇧 📧 Booking confirmation (e-ticket)\nSend a screenshot (check spam / the Booking app).\n✏️ *skip* · 📞 *call*.

**L3458** `L`
> 📄 Certificat de retard/annulation (optionnel)\nSi la compagnie vous en a remis un, envoyez-le.\n✏️ Tapez *passer* si vous n'en avez pas (cas fréquent).
>
> 🇬🇧 📄 Delay/cancellation certificate (optional)\nIf the airline gave you one, send it.\n✏️ Type *skip* if you don't have one (common).

**L3472** `L`
> \n👶 ${s.minorsCount} mineur·s : signature d'un parent/tuteur requise (un expert vous guide).
>
> 🇬🇧 \n👶 ${s.minorsCount} minor(s): a parent/guardian's signature is required (an expert guides you).

**L3478** `L`
> ${bar('done')}\n✅ *C'est prêt${_fnf ? ', ' + _fnf : ''} !* Votre dossier — vol ${s.vol || '—'} (${s.compagnie || '—'}). On récupère jusqu'à *${perPaxOf(s)} € par personne*.\n\n👉 *Relisez votre contrat et signez* (2 min) :\n${s.mandat_url}\n\n✅ 0 € d'avance · jusqu'à *75 % dans votre poche* · aucune info bancaire.\n💸 Payé même sans compte en Europe : virement, Wave, Orange Money, MoMo.${minorNote}${docsNote}\n${STOP_FOOTER}
>
> 🇬🇧 ${bar('done')}\n✅ *All set${_fnf ? ', ' + _fnf : ''}!* Your file — flight ${s.vol || '—'} (${s.compagnie || '—'}). We recover up to *€${perPaxOf(s)} per passenger*.\n\n👉 *Read your contract and sign* (2 min):\n${s.mandat_url}\n\n✅ €0 upfront · up to *75% in your pocket* · no bank details.\n💸 Paid even without a EU bank account: bank transfer, Wave, Orange Money, MoMo.${minorNote}${docsNote}\n${STOP_FOOTER}

**L3524** `L`
> 💶 *Une dernière chose qui peut vous rapporter plus*\n\nEn plus de votre indemnité, la compagnie doit *rembourser les frais* que ce vol vous a coûtés (hôtel, repas, taxi, billet de remplacement…).\n\n📸 *Une photo par reçu suffit* — on les joint à votre réclamation. Envoyés aujourd'hui, ils partent dès le *1ᵉʳ envoi* ; plus tard aussi, c'est bon.\n_🔒 Lu par un outil automatique (IA) pour votre dossier — robindesairs.eu/politique-confidentialite._
>
> 🇬🇧 💶 *One more thing that can earn you more*\n\nOn top of your compensation, the airline must *reimburse the expenses* this flight cost you (hotel, meals, taxi, replacement ticket…).\n\n📸 *One photo per receipt is enough* — we attach them to your claim. Sent today, they go out with the *first submission*; later is fine too.\n_🔒 Read by an automated tool (AI) for your file — robindesairs.eu/politique-confidentialite._

**L3559** `L`
> 🎉 C'est signé, merci de votre confiance ! On s'occupe de tout pour récupérer votre argent — vous n'avancez rien. Comment préférez-vous le recevoir ?\n_(juste votre préférence — pas besoin de vos coordonnées maintenant)_
>
> 🇬🇧 🎉 It's signed, thank you for your trust! We handle everything to recover your money — you pay nothing upfront. How would you like to receive it?\n_(just your preference — no bank details needed right now)_

**L3586** `L`
> ✈️ Numéro du vol *${l.dep} → ${l.arr}* ? _(ex : AT540)_\n✏️ Tapez *passer* si vous ne l'avez plus.
>
> 🇬🇧 ✈️ Number of flight *${l.dep} → ${l.arr}*? _(e.g. AT540)_\n✏️ Type *skip* if you no longer have it.

**L3590** `L`
> 🗺️ Quel était le *trajet* ? _(ex : Dakar → Paris)_
>
> 🇬🇧 🗺️ What was the *route*? _(e.g. Dakar → Paris)_

**L3592** `L`
> 📅 Date du vol ? _(ex. 15/03/2026)_
>
> 🇬🇧 📅 Flight date? _(e.g. 15/03/2026)_

**L3593** `L`
> 🗺️ Quel était le *trajet* ? _(ex : Dakar - Paris)_
>
> 🇬🇧 🗺️ What was the *route*? _(e.g. Dakar - Paris)_

**L3606** `L`
> 👥 Combien de passagers en tout ? _(ex. 8)_
>
> 🇬🇧 👥 How many passengers in total? _(e.g. 8)_

**L3607** `L`
> 📎 Envoyez une *photo* de votre e-billet ou carte d'embarquement, ou :
>
> 🇬🇧 📎 Send a *photo* of your e-ticket or boarding pass, or:

**L3612** `L`
> ✈️ Tapez le *bon numéro de vol* _(ex. AF718)_
>
> 🇬🇧 ✈️ Type the *correct flight number* _(e.g. AF718)_

**L3613** `L`
> 📅 Tapez la *bonne date* _(JJ/MM/AAAA)_
>
> 🇬🇧 📅 Type the *correct date* _(DD/MM/YYYY)_

**L3614** `L`
> 👤 Tapez le *bon nom complet* 👇
>
> 🇬🇧 👤 Type the *correct full name* 👇

**L3615** `L`
> 🗺️ Tapez le *bon trajet* _(ex. Paris - Dakar)_
>
> 🇬🇧 🗺️ Type the *correct route* _(e.g. Paris - Dakar)_

**L3616** `L`
> 🎫 Tapez le *numéro de réservation* (PNR), ou *passer*.
>
> 🇬🇧 🎫 Type the *booking reference* (PNR), or *skip*.

**L3619** `L`
> On reprend 👇 Répondez à la dernière question, ou tapez *nouveau* pour recommencer.
>
> 🇬🇧 Let's resume 👇 Answer the last question, or type *new* to start over.


_Total inline unique : 240_
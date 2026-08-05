# Relances vague 2, du 5 août 2026 (16 médias)

## Pourquoi cette vague existe

La vague prévue dans `relances-03-08.md` portait sur **31 médias**. Vérification faite
dans les Envoyés le 05/08 : seuls **14 francophones sont réellement partis, le samedi
1er août à 17h41**. Les 17 autres n'ont jamais été relancés. Ce fichier ne concerne
QUE ces 17.

🔴 **NE PAS relancer les 14 déjà partis le 01/08.** Une deuxième relance à quatre jours
d'intervalle grille la crédibilité, et la règle du projet est d'une seule relance par
média. Ils sont marqués `relance_1_statut: envoyee` dans `presse-medias.json`.

## Ce qui change par rapport au texte du 01/08

Ajouts décidés le 05/08 :
1. Dire explicitement qu'on écrit **en français ET en anglais**, ce qui n'était pas dit.
2. **Addis Standard** reste cité, c'est la meilleure preuve pour un titre anglophone.
3. **Pour les francophones seulement : le lien vers la salle de presse publique.**

🔴 **Le lien à donner est `robindesairs.eu/espace-presse.html`** (vérifié HTTP 200 le 05/08).
**JAMAIS `robindesairs.eu/presse.html`** : cette page est le tableau de bord INTERNE, en
noindex, intitulé « Suivi presse & associations / À relancer aujourd'hui ». L'envoyer à un
journaliste exposerait toute la liste de prospection et l'état des relances.

Pas de page presse en anglais à ce jour, donc **le lien ne figure que dans le texte
francophone**. Les anglophones s'appuient sur Addis Standard.

## Règles d'envoi

- Expéditeur `expert@robindesairs.eu`.
- Répondre dans le fil existant : objet = `Re: ` + objet exact du premier envoi (colonnes
  de `relances-03-08.md`).
- Une seule relance par média, pas de relance de la relance, pas de pièce jointe.
- URL en texte brut, jamais en `<a href>`, sinon Gmail la réécrit en redirection.
- Pas de tirets longs.
- Vérifier une dernière fois qu'aucune réponse n'est arrivée entre-temps.

## Texte francophone (6 médias)

> Bonjour,
>
> Je reviens vers vous au sujet de la tribune que je vous ai proposée le DATE.
>
> Depuis, plusieurs rédactions ont publié nos textes, en français comme en anglais :
> DataCameroon au Cameroun, Congo Indépendant, Ivorian.net en Côte d'Ivoire, Le Lynx en
> Guinée, Mizane.info en France, et Addis Standard en Éthiopie pour la version anglophone.
> À chaque fois avec un angle écrit pour leur lectorat, jamais un texte recyclé d'un
> confrère.
>
> Vous pouvez les retrouver ici : robindesairs.eu/espace-presse.html
>
> Le texte que je vous avais adressé reste disponible. Je peux aussi en écrire un autre si
> un angle plus proche de votre audience vous parle davantage, ou raccourcir celui-ci à
> votre format.
>
> Si le sujet ne correspond pas à votre ligne, dites-le moi simplement, je n'insisterai pas.
>
> Bien à vous,
>
> Saint-Yves Kodjo
> Fondateur, Robin des Airs
> robindesairs.eu

## Texte anglophone (11 médias)

> Hello,
>
> I am following up on the opinion piece I sent you on DATE, about the flight compensation
> that Europe-Africa passengers almost never claim.
>
> Since then, several newsrooms have published our work, in English and in French. Addis
> Standard in Ethiopia ran a piece on how codeshare loopholes leave Ethiopian travellers
> without compensation. DataCameroon in Cameroon, Congo Indépendant, Ivorian.net and Le Lynx
> in Guinea published the French-language pieces. Each one is written for that specific
> readership, never a text recycled from another outlet.
>
> The piece I sent you is still available. I can shorten it, adapt it to your format, or
> write a different angle if one suits your audience better.
>
> If the subject does not fit your line, just tell me and I will not follow up again.
>
> Best regards,
>
> Saint-Yves Kodjo
> Founder, Robin des Airs
> robindesairs.eu

## Les 17 destinataires

### Francophones (5), avec le lien salle de presse

Objets et dates **relevés dans les Envoyés le 05/08**, pas recopiés du fichier précédent
qui contenait plusieurs approximations. Reprendre l'objet AU MOT PRÈS.

| id | Média | Email | DATE à écrire | Objet exact du fil |
|---|---|---|---|---|
| m054 | Afrique XXI | afriquexxi@afriquexxi.info | 20 juillet | Proposition de texte : deux passagers, un même avion, deux droits |
| m097 | AfricaPresse.Paris | contact@africapresse.paris | 24 juillet | Proposition de tribune : le billet que les familles de la diaspora paient deux fois |
| m034 | Le Mauricien | lemauricien.redaction@gmail.com | 24 juillet | Proposition de tribune : droits des passagers aériens sur l'axe océan Indien-Europe |
| m088 | NewsAero | redaction@newsaero.info | 24 juillet | Proposition de tribune : ces 600 € de vol que les passagers d'Afrique centrale ne réclament pas |
| m022 | Zoom Eco | courriel@zoom-eco.net | 24 juillet | Tribune : l'argent des familles qui reste chez les compagnies aériennes |

❌ **m110 Agence Ecofin : RETIRÉE de la vague le 05/08/2026, décision du fondateur.**
Motif : média payant déguisé (page `/publier-vos-communiques`, media kit tarifé en PDF,
page « Paid services » sur `ecofinagency.com`). Une tribune y serait un achat d'espace.
Marquée `EXCLU` dans `presse-medias.json`, à ne plus inclure dans aucune vague.

### Anglophones (11), sans lien, ancrés sur Addis Standard

| id | Média | Email | DATE à écrire | Objet exact du fil |
|---|---|---|---|---|
| m036 | The Cable | opinion@thecable.ng | 24 July | Op-ed submission: the two rules Europe-Africa air passengers never hear |
| m037 | B&FT Online | editor@thebftonline.com | 24 July | Op-ed: the flight-delay compensation Ghanaian travellers leave unclaimed |
| m039 | The Voice | newsdesk@thevoicemediagroup.co.uk | 23 July | Op-Ed submission: two passengers, one delay, different rights |
| m058 | News Diggers | editor@diggers.news | 23 July | Op-Ed submission: two passengers, one delay, different rights |
| m059 | NewsDay | feedback@newsday.co.zw | 23 July | Op-Ed submission: two passengers, one delay, different rights |
| m064 | Times of Eswatini | news@times.co.sz | 23 July | Op-Ed submission: two passengers, one delay, different rights |
| m081 | Daily Graphic | webcontact@graphic.com.gh | 23 July | Op-Ed submission: two passengers, one delay, different rights |
| m084 | Capital FM | capital@capitalfm.co.ke | 23 July | Op-Ed submission: two passengers, one delay, different rights |
| m086 | The Citizen | letters@citizen.co.za | 23 July | Op-Ed submission: two passengers, one delay, different rights |

### Deux cas à traiter à part, découverts le 05/08

🔴 **m057 Daily Monitor (Ouganda) : ADRESSE MORTE, ne rien renvoyer.**
`editorial@ug.nationmedia.com` a généré deux avis de retard les 24 et 25/07 puis un
**échec définitif de distribution le 26/07**. Le premier message n'est jamais arrivé.
Relancer sur cette adresse ne sert à rien. Soit on trouve une autre adresse de rédaction
chez Nation Media Group, soit on sort le titre de la liste.

⚠️ **m035 Premium Times : DÉJÀ CONTACTÉ DEUX FOIS.**
Un premier envoi le **20 juillet** (objet « Opinion submission: Two passengers, one delay,
different rights »), puis un second le **23 juillet** (objet « Op-Ed submission: two
passengers, one delay, different rights »), qui était en réalité un doublon non repéré.
Une relance serait le troisième message en deux semaines sur le même sujet. Si on relance
quand même, répondre dans le fil du **23 juillet** et ne jamais mentionner les deux envois.

## Vérifications faites le 05/08

- `robindesairs.eu/espace-presse.html` : **HTTP 200**, en ligne, indexable.
- Liens sortants de la salle de presse : DataCameroon **200**, Congo Indépendant **200**,
  Mizane.info **200**.
- ⚠️ Addis Standard répond **403** à une requête automatisée. C'est très probablement une
  protection anti-robot et non un lien mort, mais **à ouvrir dans un vrai navigateur avant
  d'envoyer**, puisque le texte anglophone s'appuie dessus. Si la page est réellement
  tombée, retirer la phrase Addis Standard des deux textes.

## Deux dossiers plus urgents que cette vague

1. 🔴 **Afrik.com attend une photo depuis le 04/08 à 23h01.** Antoine Ganne a transformé la
   tribune en interview, les réponses sont parties le 03/08, il ne manque qu'un portrait
   format rectangle. Fichier validé : `~/Downloads/saint-yves-kodjo-portrait.jpg` (1200x1600).
   Jamais une photo en uniforme ou en cabine.
2. **Le Quotidien du Tourisme a refusé** le 03/08 (« nous ne sommes pas intéressés par vos
   tribunes »). Dossier clos, à retirer de toute liste future.

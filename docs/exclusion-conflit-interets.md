# Règle d'exclusion pour conflit d'intérêts

**Adoptée le 6 août 2026. Applicable immédiatement et sans dérogation.**

## La règle

Robin des Airs **n'accepte, n'instruit et ne poursuit aucun dossier dirigé contre la
compagnie aérienne qui emploie son fondateur**, ni contre les sociétés du même groupe.

Cette exclusion est **absolue**. Elle ne dépend pas :

- du trajet, du sens du vol ou de l'aéroport de départ ;
- du montant en jeu (250, 400 ou 600 euros) ;
- du fondement invoqué (règlement CE 261/2004, Convention de Montréal, ou tout autre) ;
- du nombre de passagers concernés ;
- de l'ancienneté du vol ;
- du fait que le dossier soit rentable, simple ou déjà avancé.

Aucune exception n'est prévue. Un dossier qui relève de cette exclusion est refusé, même
s'il est manifestement fondé et même si le passager insiste.

## Traitement d'un dossier concerné

1. Le dossier est **refusé** dès identification du transporteur effectif.
2. Le passager est informé sans délai, sans avoir à connaître le motif exact.
3. Il est **réorienté** vers les voies ouvertes à tout passager : réclamation directe
   auprès de la compagnie, saisine de l'autorité nationale compétente, ou toute autre
   structure de recouvrement. Le refus ne doit jamais laisser un passager sans solution.
4. Aucune pièce du dossier n'est conservée au-delà de ce qui est nécessaire au refus.

## Ce que la règle interdit également

Au-delà des dossiers eux-mêmes, sont proscrits sur l'ensemble des supports de Robin des
Airs, y compris le site, le blog, les documents internes, les modèles de courrier, les
tribunes de presse et les publications sur les réseaux sociaux :

- toute mention de la compagnie concernée comme transporteur contre lequel un passager
  pourrait réclamer ;
- toute note d'usage, tout argumentaire procédural et toute analyse de sa défense
  juridique ou de la juridiction compétente pour l'assigner ;
- toute donnée, procédure ou pratique interne dont le fondateur aurait eu connaissance
  dans le cadre de son emploi.

## Mesures prises le 6 août 2026

Un contrôle du dépôt a été mené le 6 août 2026. Deux éléments contraires à la présente
règle ont été identifiés et supprimés le jour même :

1. **`docs/modele-mise-en-demeure-ce261.md`** contenait une note d'usage dédiée à la
   compagnie concernée, décrivant comment écarter son moyen de défense et devant quelle
   juridiction l'assigner. **Paragraphe supprimé.**
2. **`blog/vol-retarde-bissau-praia-cap-vert-europe-indemnite.html`** et sa source
   Markdown la désignaient, dans un tableau et dans une réponse de FAQ, comme compagnie
   ouvrant droit à 400 euros par passager sur deux liaisons. **Mentions retirées**, page
   régénérée.

Vérification après correction : **aucune occurrence** de la compagnie dans l'ensemble du
dépôt, hors historique Git.

## Contrôle périodique

Ce contrôle doit être relancé avant chaque déploiement significatif et lors de toute
extension du périmètre géographique ou tarifaire :

```bash
grep -ril "<nom de la compagnie>" --include="*.html" --include="*.md" \
  --include="*.json" --include="*.js" --include="*.ts" . \
  | grep -v node_modules | grep -v "^\./\.git/"
```

Toute occurrence est traitée comme un incident et corrigée avant mise en ligne.

## Limite de portée

Le présent document est une **règle interne d'organisation**. Il n'a pas été rédigé par un
avocat et ne constitue pas une analyse juridique de la situation du fondateur au regard de
son contrat de travail, de son obligation de loyauté ou d'une éventuelle clause
d'exclusivité. Il établit seulement que le conflit d'intérêts a été identifié, que sa
portée a été délimitée et que des mesures concrètes ont été prises, à une date certaine.

L'examen de la situation contractuelle relève d'un conseil en droit du travail et reste à
mener.

---

*Document créé le 6 août 2026. Toute modification doit être datée et motivée à la suite.*

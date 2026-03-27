# Previsionnel CRM — Robin des Airs

## Objectif

Avoir une prevision claire des volumes, du chiffre d'affaires et de la tresorerie a partir des statuts CRM.

## 1) Entrees de base (hebdo)

Remplir chaque lundi:

- Clics WhatsApp (`prospect_anonyme`): `_____`
- Messages WhatsApp (`prospect_wa_identifie`): `_____`
- Taux `prospect_anonyme` -> `prospect_wa_identifie`: `_____ %`
- Taux `prospect_wa_identifie` -> `dossier_en_cours`: `_____ %`
- Taux `dossier_en_cours` -> `mandat_signe`: `_____ %`
- Taux `mandat_signe` -> `gagne`: `_____ %`
- Montant brut moyen par dossier gagne: `_____ EUR`
- Commission Robin: `25 %`

## 2) Prevision funnel (semaine)

Formules:

- Prospects identifies prevus = `prospect_anonyme x taux A->B`
- Dossiers en cours prevus = `prospects identifies x taux B->C`
- Mandats signes prevus = `dossiers en cours x taux C->D`
- Dossiers gagnes prevus = `mandats signes x taux D->E`

## 3) Prevision CA / marge

Formules:

- CA brut previsionnel = `dossiers gagnes prevus x montant brut moyen`
- Commission Robin previsionnelle = `CA brut x 25%`
- Net clients previsionnel = `CA brut x 75%`
- Marge nette estimee = `commission Robin - depenses variables - depenses fixes`

## 4) Scenarios (obligatoire)

Remplir 3 scenarios:

### Bas

- Hypothese conversion: `_____`
- Dossiers gagnes: `_____`
- Commission previsionnelle: `_____ EUR`

### Realiste

- Hypothese conversion: `_____`
- Dossiers gagnes: `_____`
- Commission previsionnelle: `_____ EUR`

### Ambitieux

- Hypothese conversion: `_____`
- Dossiers gagnes: `_____`
- Commission previsionnelle: `_____ EUR`

## 5) Prevision encaissement (cash timing)

Important: un dossier gagne n'est pas toujours encaisse la meme semaine.

Suivre 3 buckets:

- Encaissement a 30 jours: `_____ %`
- Encaissement a 60 jours: `_____ %`
- Encaissement a 90+ jours: `_____ %`

Prevision cash hebdo:

| Semaine | Encaissement previsionnel | Encaissement reel | Ecart |
|--------|----------------------------:|------------------:|------:|
| S1 |  |  |  |
| S2 |  |  |  |
| S3 |  |  |  |
| S4 |  |  |  |

## 6) Actions de pilotage

Si scenario reel < scenario bas:

1. augmenter relances WhatsApp sur `prospect_anonyme` > 6h;
2. prioriser dossiers proches de `mandat_signe`;
3. couper pub a faible conversion.

Si scenario reel > scenario realiste:

1. augmenter budget pub rentable;
2. renforcer traitement dossier pour eviter goulot;
3. securiser qualite de suivi client.

## 7) Rituel hebdo (30 min)

Chaque semaine:

1. extraire KPI CRM;
2. mettre a jour ce previsionnel;
3. comparer prevision vs reel;
4. fixer 3 actions concretes pour la semaine.


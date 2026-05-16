# Prompt Claude — configurer Airtable (mandat + Make + Wati)

Copiez le bloc ci-dessous dans **Claude** (ou ChatGPT) pour structurer votre base Airtable Robin des Airs.

---

## À copier-coller dans Claude

```text
Tu es un expert Airtable (bases, champs, vues, automatisations Airtable) pour une activité de réclamation d’indemnités aériennes CE 261/2004 — Robin des Airs.

## Contexte

- Site mandat : https://robindesairs.eu/mandat.html (prérempli par URL, signature en ligne).
- Après signature, Netlify (`submit-mandat`) met à jour Airtable et peut passer le statut suivi à « Mandat signé ».
- Make.com surveille Airtable : quand le statut passe à « Mandat à envoyer », Make envoie le lien mandat par WhatsApp (Wati).
- Ne pas utiliser d’URL /sign/ sur robindesairs.eu (n’existe pas).

## Table existante — colonnes déjà en place (ne pas renommer sans me prévenir)

Nom Passager, Prénom Passager, Référence Dossier, Date Dossier, Montant Client, Commission RDA (30%), Commission Agence, Agence Partenaire, Statut Dossier, Remarques, Date de naissance, Statut Mineur, Nom Représentant Légal, Email, Numéro WhatsApp, Compagnie Aérienne, Numéro de vol, Date du vol, Itinéraire, PNR (Référence réservation), Numéro de billet, Type d'incident, Heure d'arrivée réelle, Raison compagnie, Copie Passeport / CI, Carte d'embarquement, Mandat de Représentation signé, Montant de l'indemnité, Statut du Dossier Suivi, IBAN / paiement, Trajet, Adresse domicile, Sexe, Date expiration passeport / CNI.

## Champ pivot pour le workflow mandat

Utiliser en priorité le champ **« Statut du Dossier Suivi »** (Single select) pour piloter envoi mandat / signature / suite du dossier.
Le champ **« Statut Dossier »** peut rester pour une vue plus globale (commercial / agence) si besoin, mais Make et le site ciblent **Statut du Dossier Suivi**.

## Valeurs exactes à configurer dans « Statut du Dossier Suivi »

Créer ou conserver ces options (libellés EXACTS, respecter majuscules et accents) :

1. **Nouveau lead** — premier contact, infos incomplètes
2. **Documents en cours** — collecte pièces / infos vol
3. **Mandat à envoyer** — déclencheur Make : envoyer le lien mandat WhatsApp (toutes infos obligatoires présentes)
4. **Signature en attente** — lien mandat envoyé, en attente signature client
5. **Mandat signé** — mandat signé sur mandat.html (peut aussi être mis à jour automatiquement par le site)
6. **Mise en demeure envoyée**
7. **Relance envoyée**
8. **Médiateur saisi**
9. **Paiement reçu**
10. **Virement effectué**
11. **Non éligible**
12. **Lead froid**
13. **Litige client**

Couleurs suggérées (optionnel) : Mandat à envoyer = orange ; Signature en attente = jaune ; Mandat signé = vert.

## Règles métier du statut

| Action | Statut à mettre |
|--------|------------------|
| Dossier prêt, on veut envoyer le lien | **Mandat à envoyer** |
| Make a envoyé le message Wati avec le lien | **Signature en attente** (Make met à jour après envoi) |
| Client a signé sur le site | **Mandat signé** (automatique côté Netlify si configuré) |

Ne PAS déclencher l’envoi du lien sur : Mandat signé, Signature en attente (sauf renvoi manuel), Nouveau lead seul.

## Champs obligatoires avant de passer à « Mandat à envoyer »

Vérifier que la ligne contient au minimum :
- Référence Dossier (unique, non vide)
- Prénom Passager, Nom Passager
- Numéro WhatsApp (format international +33… recommandé)
- Numéro de vol, Date du vol
- Compagnie Aérienne
- Type d'incident (ou motif équivalent)
- Montant de l'indemnité (250, 400 ou 600 selon CE 261)

Recommandés : Email, Adresse domicile, PNR (Référence réservation), Itinéraire ou Trajet.

## Référence Dossier

- Type : Single line text (ou formula auto si vous en avez une).
- Doit être **unique** par ligne (ex. RDA-20260516-XXXX).
- C’est la valeur envoyée dans l’URL mandat : paramètre `ref=`.
- Netlify retrouve la ligne Airtable avec ce champ (variable `AIRTABLE_F_REF_DOSSIER`).

## Lien avec Make (pour ta doc utilisateur)

Quand **Statut du Dossier Suivi** = **Mandat à envoyer** :
- Make construit : https://robindesairs.eu/mandat.html?ref=…&phone=…&name=… etc.
- Make envoie WhatsApp via Wati.
- Make met la ligne à **Signature en attente**.

Formule Make (module Airtable = N) — rappel :
ref = Référence Dossier, phone = Numéro WhatsApp, name = concat(Prénom Passager; " "; Nom Passager), vol = Numéro de vol, date = Date du vol (JJ/MM/AAAA), etc. Voir docs/WATI-LIEN-MANDAT.md.

## Automatisations Airtable (optionnelles, à proposer)

Propose-moi si utile :
1. Quand **Statut du Dossier Suivi** passe à **Mandat signé** → cocher / remplir date dans Remarques ou champ dédié « Date signature mandat » si on le crée.
2. Vue Kanban groupée par **Statut du Dossier Suivi**.
3. Vue filtrée « À envoyer » : Statut = Mandat à envoyer.
4. Vue filtrée « En attente signature » : Statut = Signature en attente.
5. Alerte si **Signature en attente** depuis plus de 48 h sans passage à Mandat signé.

## Différence Statut Dossier vs Statut du Dossier Suivi

Propose une convention claire :
- **Statut Dossier** : vue business (agence, commission, partenaire).
- **Statut du Dossier Suivi** : pipeline opérationnel Robin (mandat → compagnie → paiement).

Évite les doublons contradictoires ; si un seul statut suffit, dis-le-moi.

## Tâches pour toi (Claude)

1. Me donner la liste finale des options **Statut du Dossier Suivi** à créer dans Airtable (copier-coller).
2. Me dire quels champs manquent ou devraient changer de type (Email, Phone, Date, Attachment pour pièces).
3. Proposer 3 vues nommées + filtres + tris.
4. Rédiger une mini procédure opérateur (5 lignes) : quand passer un dossier à « Mandat à envoyer ».
5. Indiquer comment tester une ligne fictive de bout en bout avec Make.

Ne modifie pas les noms de colonnes listés sans me demander. Réponds en français, structuré, prêt à appliquer dans Airtable.
```

---

## Récap rapide (sans Claude)

| Statut exact | Rôle |
|--------------|------|
| **Mandat à envoyer** | Make envoie le lien Wati |
| **Signature en attente** | Lien envoyé, client n’a pas encore signé |
| **Mandat signé** | Signature reçue (site ou manuel) |

**Champ Make / site :** `Statut du Dossier Suivi`  
**Référence unique :** `Référence Dossier`

Voir aussi : `docs/WATI-LIEN-MANDAT.md`, `docs/PROMPT-CLAUDE-CONFIGURER-MAKE-WATI-MANDAT.md`, `docs/NOTIFICATIONS-MANDAT-EMAIL.md`.

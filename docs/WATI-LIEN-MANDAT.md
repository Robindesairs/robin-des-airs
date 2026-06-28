# Lien Wati / Make → contrat de cession prérempli

Le contrat de cession de créance à faire signer est **toujours** la page :

**`https://robindesairs.eu/mandat.html`**

Ajoutez des **paramètres de requête** (query string). Dans **Make**, encodez chaque valeur texte avec **`encodeURL(...)`** ; en JavaScript ce serait `encodeURIComponent`.

## Paramètres utiles

| Paramètre | Rôle |
|-----------|------|
| **`ref`** | **Référence dossier identique** au champ Airtable utilisé par `submit-mandat` (ex. `RDA-20260515-1234-ABC12D`). Sans elle, la mise à jour Airtable peut s’appuyer sur le **numéro WhatsApp** si une seule ligne correspond. |
| **`phone`** ou **`whatsapp`** ou **`wa`** | Préremplit le champ WhatsApp (indicatif inclus, ex. `+33612345678`). |
| **`name`** | Nom complet ; la page sépare prénom / nom. |
| **`email`** | Adresse **technique du dossier** : en pratique `référence_en_minuscules@robindesairs.eu` (colonne Airtable **Email**, créée par `clientEmailForRef`). Le contrat de cession l’affiche et l’explique ; le client n’a pas à la saisir. |
| **`address`** | Adresse postale. |
| **`vol`** | Numéro de vol (ex. `AF718`). |
| **`date`** | Date au format **`JJ/MM/AAAA`**. |
| **`compagnie`** | Compagnie. |
| **`pnr`** | Code PNR. |
| **`route`** | Ex. `CDG → ABJ` (séparateur `→`). Sinon **`dep`** et **`arr`** (codes IATA). |
| **`motif`** ou **`motif_fr`** | Texte ou mots-clés : retard / annulation / surbooking → type d’incident. |
| **`nbpax`** ou **`pax`** | Nombre de passagers. |
| **`paxlist`** | Autres passagers, **virgule** entre les noms (co-passagers ; le principal peut être dans `name`). |
| **`indemnite`** | Montant brut par passager affiché (ex. `600`). |
| **`source`** | Traçabilité (ex. `wati`, `make`) — transmis à la signature. |

## Base Robin des Airs — formule Make (vos colonnes)

Hypothèse : le module **Airtable** est le n°**`2`** (changez `2` partout si ce n’est pas le cas).

**Variable `mandat_url`** (une seule expression, à coller dans *Tools → Set variable*) :

```text
https://robindesairs.eu/mandat.html?ref={{encodeURL(2.`Référence Dossier`)}}&phone={{encodeURL(2.`Numéro WhatsApp`)}}&name={{encodeURL(concat(2.`Prénom Passager`; " "; 2.`Nom Passager`))}}&email={{encodeURL(2.Email)}}&address={{encodeURL(2.`Adresse domicile`)}}&vol={{encodeURL(2.`Numéro de vol`)}}&date={{formatDate(2.`Date du vol`; "DD/MM/YYYY")}}&route={{encodeURL(2.`Itinéraire`)}}&pnr={{encodeURL(2.`PNR (Référence réservation)`)}}&compagnie={{encodeURL(2.`Compagnie Aérienne`)}}&motif={{encodeURL(2.`Type d'incident`)}}&indemnite={{2.`Montant de l'indemnité`}}&source=wati
```

| Colonne Airtable | Paramètre URL | Note |
|------------------|---------------|------|
| **Référence Dossier** | `ref` | Doit correspondre au champ utilisé par `submit-mandat` pour retrouver la ligne. |
| **Numéro WhatsApp** | `phone` | Indicatif international recommandé (`+33…`). |
| **Prénom Passager** + **Nom Passager** | `name` | Concaténés avec `concat(...; " "; ...)` pour que le contrat de cession remplisse prénom / nom. |
| **Email** | `email` | |
| **Adresse domicile** | `address` | |
| **Numéro de vol** | `vol` | |
| **Date du vol** | `date` | `formatDate(...; "DD/MM/YYYY")` → **JJ/MM/AAAA** attendu par `mandat.html`. Si votre champ est déjà du texte `JJ/MM/AAAA`, remplacez ce bloc par `{{encodeURL(2.`Date du vol`)}}` (sans `formatDate`). |
| **Itinéraire** | `route` | Idéalement avec un `→` entre départ et arrivée pour le préremplissage des aéroports. Si **Itinéraire** est souvent vide, remplacez `2.Itinéraire` par **`2.Trajet`**. |
| **PNR (Référence réservation)** | `pnr` | |
| **Compagnie Aérienne** | `compagnie` | |
| **Type d'incident** | `motif` | Texte ou mots-clés (retard / annulation / surbooking) pour le type d’incident. |
| **Montant de l'indemnité** | `indemnite` | Souvent `250`, `400` ou `600` (brut CE 261 affiché sur le contrat de cession). Si vous stockez plutôt le net client dans **Montant Client**, adaptez le champ dans la formule. |

**Colonnes utiles ailleurs mais pas dans ce lien** (pas de paramètre mandat dédié) : *Date Dossier*, *Montant Client*, *Commission RDA (30%)*, *Commission Agence*, *Agence Partenaire*, *Statut Dossier*, *Remarques*, *Date de naissance*, *Statut Mineur*, *Nom Représentant Légal*, *Numéro de billet*, *Heure d'arrivée réelle*, *Raison compagnie*, pièces jointes (*Copie Passeport / CI*, *Carte d'embarquement*, *Mandat de Représentation signé*), *Statut du Dossier Suivi*, *IBAN / paiement*, *Sexe*, *Date expiration passeport / CNI*. Elles restent dans Airtable ; la signature met à jour d’autres champs via `submit-mandat` + webhook.

**Co-passagers** : vous n’avez qu’un couple Prénom/Nom passager ; pour plusieurs passagers sur le même PNR, ajoutez plus tard `&nbpax=…` et `&paxlist=…` (noms séparés par des virgules) si vous ajoutez des colonnes ou une logique Make.

---

## Pas à pas (Airtable → Make → Wati)

### 1) Airtable

Une ligne = un dossier ; **Référence Dossier** et **Numéro WhatsApp** doivent être cohérents avec ce que Netlify utilise pour `AIRTABLE_F_REF_DOSSIER` et `AIRTABLE_F_WHATSAPP`.

### 2) Make — module Airtable

Notez le numéro du module (ex. `2`).

### 3) Make — *Set variable* `mandat_url`

Collez la formule de la section **Base Robin des Airs** ci-dessus.

### 4) Wati

Message du type : `Signez votre contrat de cession de créance (2 min) : {{3.mandat_url}}` en adaptant le numéro du module *Set variable*.

### 5) Après signature

`submit-mandat` cherche par **`ref`**, sinon par **WhatsApp**. Les variables Netlify doivent pointer vers les champs **Référence Dossier** et **Numéro WhatsApp** (ou équivalent) de votre base.

**Emails** (vous + client si email renseigné sur le contrat de cession) : **`docs/NOTIFICATIONS-MANDAT-EMAIL.md`** (`RESEND_API_KEY` + `MANDAT_NOTIFY_EMAIL`).

## Déjà branché côté site

- **Conversation Robin (webhook Netlify)** : après collecte adresse, le bot envoie une URL générée par `buildMandatUrlFromSession` (`source=whatsapp`, champs session).
- **`POST /api/analyze-flight`** : le body peut inclure **`ref`**, **`reference`** ou **`reference_dossier`** ; ils sont ajoutés à `mandat_url` si l’analyse conclut à l’éligibilité.

Pour **configurer tout le scénario Make + Wati avec Claude**, voir **`docs/PROMPT-CLAUDE-CONFIGURER-MAKE-WATI-MANDAT.md`** (prompt prêt à copier-coller).

## À ne pas utiliser

- **`https://robindesairs.eu/sign/...`** — ce chemin **n’existe pas** sur le site (404). Remplacer par **`mandat.html`** + paramètres ci-dessus.

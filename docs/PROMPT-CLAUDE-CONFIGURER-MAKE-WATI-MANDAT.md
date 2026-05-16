# Prompt Claude — configurer Make + Wati + mandat Robin des Airs

**Je ne peux pas créer le scénario dans ton compte Make** (accès externe). Ce fichier sert à **copier-coller dans Claude** (ou à suivre toi-même) pour tout monter dans Make et brancher Wati.

**Blueprint JSON Make (import / référence)** : `docs/make-scenario-envoi-mandat-whatsapp.json` — à compléter : `VOTRE_BASE_ID`, `VOTRE_TABLE_ID`, `VOTRE_TOKEN_WATI`, ID compte Wati dans l’URL API.

**Prompt dédié erreur « Module not found »** : copier `docs/PROMPT-CLAUDE-CORRIGER-MAKE-MODULE-INTRouvable.md` dans Claude.

### Erreur « Module not found » (Airtable Update record)

L’import JSON échoue souvent si le **nom interne** du module ne correspond pas à votre zone Make. Dans le fichier corrigé :

- Déclencheur : `airtable:TriggerWatchRecords` (pas `watchRecords`)
- Mise à jour : `airtable:ActionUpdateRecord` (pas `actionUpdateRecord`)
- Mapper : objet **`record`** (pas `fields`), avec `typecast: true`

**Si l’import affiche encore « module not found »** : créez le scénario à la main (plus fiable) :

1. **Airtable → Watch records** (champ `Statut du Dossier Suivi`)
2. **Router** — filtre `Statut du Dossier Suivi` = `Mandat à envoyer`
3. **Tools → Set variable** — `mandat_url` (formule dans `docs/WATI-LIEN-MANDAT.md`)
4. **HTTP → Make a request** — Wati
5. **Airtable → Update a record** — Record ID = `{{1.id}}`, statut → `Signature en attente`

---

## À copier-coller dans Claude (prompt court)

```text
Tu es un expert Make.com (Integromat) + Wati.io + Airtable.

Objectif : un scénario Make qui, quand une ligne Airtable « dossier » est prête (ou quand un webhook est reçu), construit l’URL du mandat de représentation Robin des Airs et envoie au client un message WhatsApp via Wati contenant UNIQUEMENT cette URL (lien cliquable), sans utiliser de faux chemin /sign/ sur robindesairs.eu.

Contraintes techniques :
- Le mandat est toujours : https://robindesairs.eu/mandat.html avec des query params.
- Les noms de colonnes Airtable EXACTS sont : Nom Passager, Prénom Passager, Référence Dossier, Date Dossier, Montant Client, Commission RDA (30%), Commission Agence, Agence Partenaire, Statut Dossier, Remarques, Date de naissance, Statut Mineur, Nom Représentant Légal, Email, Numéro WhatsApp, Compagnie Aérienne, Numéro de vol, Date du vol, Itinéraire, PNR (Référence réservation), Numéro de billet, Type d'incident, Heure d'arrivée réelle, Raison compagnie, Copie Passeport / CI, Carte d'embarquement, Mandat de Représentation signé, Montant de l'indemnité, Statut du Dossier Suivi, IBAN / paiement, Trajet, Adresse domicile, Sexe, Date expiration passeport / CNI.
- Dans Make, encoder les parties variables de l’URL avec encodeURL(), pas encodeURIComponent. Concaténer prénom + nom pour le paramètre name avec concat(Prénom; " "; Nom).
- La formule cible pour une variable mandat_url (module Airtable = numéro N à remplacer) est :

https://robindesairs.eu/mandat.html?ref={{encodeURL(N.`Référence Dossier`)}}&phone={{encodeURL(N.`Numéro WhatsApp`)}}&name={{encodeURL(concat(N.`Prénom Passager`; " "; N.`Nom Passager`))}}&email={{encodeURL(N.Email)}}&address={{encodeURL(N.`Adresse domicile`)}}&vol={{encodeURL(N.`Numéro de vol`)}}&date={{formatDate(N.`Date du vol`; "DD/MM/YYYY")}}&route={{encodeURL(N.`Itinéraire`)}}&pnr={{encodeURL(N.`PNR (Référence réservation)`)}}&compagnie={{encodeURL(N.`Compagnie Aérienne`)}}&motif={{encodeURL(N.`Type d'incident`)}}&indemnite={{N.`Montant de l'indemnité`}}&source=wati

Si Itinéraire est souvent vide, remplacer N.`Itinéraire` par N.Trajet dans route=.
Si Date du vol est déjà du texte JJ/MM/AAAA, remplacer le formatDate par encodeURL(N.`Date du vol`).

Tâches pour toi :
1) Proposer l’enchaînement exact des modules Make (déclencheur Airtable vs Webhook), numérotation, et où placer « Set variable » mandat_url.
2) Expliquer comment envoyer le message via Wati : soit module HTTP « Make a request » vers l’API Wati (Bearer token, URL de base fournie par le client dans le dashboard Wati), soit app Wati si disponible dans Make — donner les champs JSON typiques pour un message texte au numéro du champ Numéro WhatsApp.
3) Rappeler les tests : ouvrir l’URL générée dans un navigateur, vérifier préremplissage, puis envoi Wati en sandbox si possible.
4) Ne pas inventer d’URL https://robindesairs.eu/sign/... (404 sur ce site).

Déclencheur Airtable : champ **Statut du Dossier Suivi** = exactement **Mandat à envoyer**. Après envoi Wati, passer à **Signature en attente**. Voir aussi **docs/PROMPT-CLAUDE-CONFIGURER-AIRTABLE-MANDAT.md**.

Demande-moi uniquement les infos que tu ne peux pas deviner : URL de base API Wati du compte, token Bearer.
```

*(Tu peux ajouter à la fin : « Le détail est aussi dans le fichier docs/WATI-LIEN-MANDAT.md du repo Robin des Airs. »)*

---

## Spécification scénario (pour Claude ou pour toi)

### Déclencheur (choisir un)

| Option | Module Make | Quand l’utiliser |
|--------|-------------|------------------|
| A | **Airtable — Watch records** | Dès qu’une ligne est créée ou qu’un champ change (ex. passage à un statut « mandat à envoyer »). Filtrer dans un **Router** si besoin. |
| B | **Webhooks — Custom webhook** | Un autre outil pousse déjà les données en JSON ; mapper les champs vers la même logique `mandat_url`. |

### Chaîne minimale recommandée

1. **Déclencheur** (Airtable ou Webhook).
2. **Tools — Set variable** (ou *Set multiple variables*) :  
   - Nom : `mandat_url`  
   - Valeur : la formule longue ci-dessus, avec **`N` = numéro réel** du module Airtable (ex. `2`).
3. **Wati** : soit app native **Wati** dans Make si listée, soit **HTTP — Make a request** :
   - Méthode : `POST`
   - URL : celle du **dashboard Wati → API** (souvent une base du type `https://…wati.io/…` + chemin *send message* / *conversation* selon la doc Wati du moment).
   - Headers : `Authorization: Bearer <TOKEN_WATI>`, `Content-Type: application/json`
   - Body : selon la doc Wati pour **message texte** à un numéro ; inclure le texte du message, par ex.  
     `Signez votre mandat Robin des Airs (2 min) : ` + valeur de `mandat_url` (sans casser le JSON — utiliser le mapper Make pour injecter la variable).
4. (Optionnel) **Airtable — Update a record** : marquer « lien mandat envoyé » / date d’envoi pour éviter les doublons.

### Règles importantes

- **Ne pas** utiliser `https://robindesairs.eu/sign/...` : **non implémenté** (404).
- **Référence Dossier** dans `ref=` doit être la **même valeur** que celle retrouvée côté Netlify par `submit-mandat` (champ Airtable mappé à `AIRTABLE_F_REF_DOSSIER`).
- **Numéro WhatsApp** : format international avec `+` pour cohérence avec le fallback Airtable au moment de la signature.

### Après signature (hors Make, à valider une fois)

Sur Netlify : `MANDAT_SIGNED_WEBHOOK_URL` (Make webhook) pour enchaîner « mandat signé » → Wati / Slack / autre. Voir `netlify/functions/submit-mandat.js`.

### Doc déjà dans le repo

- **URL & colonnes** : `docs/WATI-LIEN-MANDAT.md`

---

## Si Claude ou Make renvoie une erreur sur `formatDate` / `concat`

- Vérifier la **syntaxe des arguments** (point-virgule `;` selon la locale du compte Make).
- Tester la formule **variable par variable** dans un module *Set variable* intermédiaire pour isoler le champ fautif (souvent une date vide ou un nom avec guillemets).

# Airtable ↔ Netlify — liaison bidirectionnelle

## Schéma

```
Airtable (automation)  ──POST──►  /api/airtable-webhook  ──►  mandat_url, WhatsApp, MAJ statut
                                        ▲
Site / mandat signé    ──POST──►  /api/submit-mandat     ──►  MAJ Airtable « Mandat signé »
CRM (navigateur)       ──POST──►  /api/crm-airtable-sync ──►  upsert toutes les lignes (auth code CRM)
Bot WhatsApp           ──POST──►  (Flask at_save)        ──►  création progressive des lignes
Scripts externes       ──POST──►  /api/airtable-sync    ──►  créer / mettre à jour (secret)
                         ◄──GET──  /api/airtable-sync?ref=…  ◄──  lire une ligne
```

---

## 1. Variables Netlify (obligatoires)

| Variable | Rôle |
|----------|------|
| `AIRTABLE_API_KEY` | Token personnel Airtable (avec accès à la base) |
| `AIRTABLE_BASE_ID` | ID base (`app…`) |
| `AIRTABLE_TABLE_ID` | ID table (`tbl…`) |
| `AIRTABLE_WEBHOOK_SECRET` | Secret partagé (mot de passe long, aléatoire) |

Optionnel : `AIRTABLE_SYNC_SECRET` (si différent du webhook).

Pour l’envoi WhatsApp auto depuis le webhook : `WHATSAPP_360DIALOG_API_KEY` ou Meta (`WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`).

Redéployer le site après toute modification.

---

## 2. CRM → Airtable (`/crm/`)

Le CRM web appelle **`POST /api/crm-airtable-sync`** avec le même **code d’accès** que les sauvegardes cloud (`CRM_ACCESS_CODE`). La clé `AIRTABLE_API_KEY` reste **uniquement sur Netlify** (jamais dans le navigateur).

1. Ouvrir **`https://robindesairs.eu/crm/`** (ou `/crm.html` → redirection).
2. Après chaque modification, cliquer **« Sync cloud + Airtable »** (ou attendre la sync auto si en ligne).
3. Chaque dossier est créé ou mis à jour dans Airtable par **Référence Dossier** (`RDA-YYMMDD-XXXX`).

**Import depuis Airtable** (console ou script) :

```http
GET https://robindesairs.eu/api/crm-airtable-sync?ref=RDA-260517-1234&code=VOTRE_CODE_CRM
```

Mapping statuts CRM → colonne **Statut du Dossier Suivi** : voir `netlify/functions/lib/crm-airtable-map.js`.

---

## 3. Netlify → Airtable (contrat de cession, scripts)

### Signature mandat (`submit-mandat`)

Quand le client signe sur `mandat.html` → mise à jour Airtable (statut **Mandat signé**, remarques, vol, PNR…).

### Créer / mettre à jour un dossier (`airtable-sync`)

```http
POST https://robindesairs.eu/api/airtable-sync
Content-Type: application/json
X-Airtable-Secret: VOTRE_SECRET

{
  "dossier": {
    "ref": "RDA-20260517-TEST",
    "prenom": "Aminata",
    "nom": "Diallo",
    "whatsapp": "+33612345678",
    "email": "test@example.com",
    "vol": "AF718",
    "dateVol": "2026-05-20",
    "compagnie": "Air France",
    "pnr": "ABC12D",
    "statutSuivi": "Documents en cours"
  }
}
```

### Lire un dossier

```http
GET https://robindesairs.eu/api/airtable-sync?ref=RDA-20260517-TEST&secret=VOTRE_SECRET
```

Réponse : champs Airtable + `mandat_url` prérempli.

---

## 4. Airtable → Netlify (automation)

### Dans Airtable

1. **Automatisations** → **Créer une automation**
2. Déclencheur : **Quand un enregistrement correspond à des conditions**
   - Champ **Statut du Dossier Suivi** = **Mandat à envoyer**
3. Action : **Envoyer une requête Webhook**
   - **URL** : `https://robindesairs.eu/api/airtable-webhook`
   - **Méthode** : POST
   - **Corps** (JSON) :

```json
{
  "secret": "VOTRE_SECRET_IDENTIQUE_A_NETLIFY",
  "recordId": "{{Record ID}}",
  "action": "mandat_a_envoyer",
  "sendWhatsApp": true
}
```

`{{Record ID}}` = variable Airtable (ID enregistrement).

### Effet côté Netlify

1. Lit la ligne Airtable
2. Construit `mandat_url`
3. Envoie le message WhatsApp (si WhatsApp configuré sur Netlify)
4. Passe le statut à **Signature en attente** + note dans **Remarques**

Réponse JSON (exemple) : `{ "ok": true, "mandat_url": "https://robindesairs.eu/mandat.html?...", "statut_apres": "Signature en attente" }`

---

## 5. Colonnes Airtable (noms par défaut)

Le code utilise les **noms de colonnes** de votre base :

Référence Dossier, Prénom Passager, Nom Passager, Email, Numéro WhatsApp, Adresse domicile, Numéro de vol, Date du vol, Compagnie Aérienne, PNR (Référence réservation), Type d'incident, Montant de l'indemnité, Itinéraire, Trajet, Statut du Dossier Suivi, Remarques.

Si vos noms diffèrent, définir `AIRTABLE_COL_REF`, `AIRTABLE_COL_PRENOM`, etc. (voir `netlify/functions/lib/airtable-robin.js`).

---

## 6. Preuves automatiques (dossiers agence)

À la création d’un dossier via **espace agence** ou **bot WhatsApp partenaire**, Netlify collecte METAR/TAF + données vol (API) et met à jour Airtable (**Remarques** + lien rapport HTML).

Voir `docs/PREUVES-CAPTURE.md` et `POST /api/collect-proofs` pour relancer.

---

## 7. Make.com

Vous pouvez **soit** utiliser l’automation Airtable native (ci-dessus), **soit** garder Make (Watch records) — évitez les **deux** sur le même statut pour ne pas envoyer le lien en double.

---

## 8. Test rapide

```bash
curl -X POST "https://robindesairs.eu/api/airtable-webhook" \
  -H "Content-Type: application/json" \
  -d '{"secret":"VOTRE_SECRET","recordId":"recXXXXXXXX","action":"mandat_a_envoyer"}'
```

Remplacer `recXXXXXXXX` par un vrai ID de ligne en statut **Mandat à envoyer**.

# Prompt mode code — Espace agence Robin des Airs

Copier-coller ce bloc dans un agent Cursor (mode Agent) pour aligner le code sur la maquette.

---

## Contexte

Projet : **robin-des-airs** (Netlify + Airtable).  
Page : `espace-agence.html` + `assets/agence-i18n.js`, `assets/agence-currency.js`, `assets/agence-portal.js`.  
API existante : `POST/GET /api/agency-auth`, `GET/POST /api/agency-dossiers` (cookie session `rda_agency`).

**Maquette visuelle** (3 écrans, boutons en haut) : ouvrir `espace-agence-maquette.html` dans le navigateur.

---

## Objectif

Portail agence **professionnel, rapide, mobile-friendly** pour agences type Gambie (Kombo `GSA-KMS-001`).  
Pas de script démo inline (`AGENCIES`, `loadDemoData`) — uniquement les 3 JS assets + API.

---

## À implémenter / vérifier

### 1. Barre fixe langue + devise (toujours visible)

- Header `#localeToolbar` : titre « Portail agence », pills **Français | English**, `<select id="currencySelect">` (EUR, USD, GBP, XOF, XAF, GMD), checkbox « Équivalents ».
- Même choix sur **carte login** (`#currencySelectLogin` + pills `.lang-pills--login`) — synchroniser avec la barre via `agence-portal.js`.
- Sidebar : hint `data-i18n="toolbar.hint"` (« Langue & devise : barre en haut ↑ »).
- i18n : clés dans `agence-i18n.js` (`bindLangPills`, pas `langSelect` si supprimé).

### 2. Formulaire « Nouveau dossier » (sans email)

**3 étapes** dans `.form-card--fast` :

| Étape | Champs |
|-------|--------|
| 1 — Passager | `f-nom`, `f-prenom`, `f-tel` + hint : pas d'email, Robin crée `ref@robindesairs.eu` |
| 2 — Vol | `f-pnr` (6), `f-vol`, `f-compagnie`, `f-date`, chips routes (CDG/BRU/IST/DSS → Banjul), `f-depart`, `f-arrivee` |
| 3 — Situation | chips `#issue-chips` → `#f-probleme` (hidden), panel `#panel-escale` si correspondance, `f-retard`, `f-nb-passagers`, `f-notes` |

- Chips situation : `__ATTENTE__`, Retard +3h, Vol annulé, Surbooking, Correspondance manquée.
- `initAgencyFormUX()` : clic chips, routes 1-clic, `onAgencyProblemeChange()` pour escale + retard optionnel si attente.
- **Ne pas** envoyer `email` au POST ; backend : `clientEmailForRef(ref)` dans `agency-airtable.js`.
- **Retirer** `email` de `required` dans `agency-dossiers.js`.

### 3. Tarifs affichés

- Bloc pricing : net client **420 €**, commission agence **45 €** (`#pricing-client`, `#pricing-agency`) via `AgenceCurrency` + `updatePricingDisplay()`.
- KPI / commissions : plus « 30 000 FCFA » seul — **45 €** avec équivalent FCFA.

### 4. API (déjà là — aligner)

```
POST /api/agency-auth     { "code", "pass" }  → Set-Cookie
GET  /api/agency-auth     → { ok, agency }
POST /api/agency-auth     { "logout": true }

GET  /api/agency-dossiers → { dossiers, pricing, count }
POST /api/agency-dossiers → { nom, prenom, tel, pnr, vol, compagnie, date, depart, arrivee, probleme, retard?, nbPassagers?, notes?, attenteIncident? }
```

### 5. Interdits

- Pas de mots de passe en clair dans le HTML/JS.
- Pas de `?code=` dans l’URL.
- Pas de second `<script>` inline avec fausses agences.

---

## Fichiers à toucher

| Fichier | Action |
|---------|--------|
| `espace-agence.html` | Structure UI = maquette ; scripts fin de body |
| `assets/agence-portal.js` | Form UX, submit sans email, locale pills |
| `assets/agence-i18n.js` | Clés FR/EN manquantes |
| `assets/agence-currency.js` | Inchangé si OK |
| `netlify/functions/agency-dossiers.js` | `required` sans `email` |
| `netlify/functions/lib/agency-airtable.js` | `fields[L.email] = clientEmailForRef(ref)` |

---

## Critères d’acceptation

1. Connexion `GSA-KMS-001` → liste dossiers Airtable.
2. Création dossier **sans champ email** → Airtable reçoit `xxxx@robindesairs.eu`.
3. Chip « Correspondance » → panier escale visible.
4. FR/EN + FCFA/EUR visibles **avant** et **après** login.
5. `espace-agence-maquette.html` et prod ont la même structure formulaire.

---

## Commande test local

```bash
# Depuis la racine du repo
python3 -m http.server 8765
# Ouvrir http://127.0.0.1:8765/espace-agence-maquette.html  (maquette)
# Ouvrir http://127.0.0.1:8765/espace-agence.html  (prod, avec netlify dev pour API)
```

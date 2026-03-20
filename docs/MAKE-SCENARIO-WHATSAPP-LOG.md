# Scénario Make — log des messages WhatsApp (Robin)

Robin envoie déjà une **copie JSON** de chaque message entrant vers l’URL définie dans Netlify : **`ROBIN_LOG_WEBHOOK_URL`**. Ce document décrit le scénario Make le plus **logique** pour enregistrer et exploiter ces données.

---

## Airtable ou pas ?

| Critère | **Google Sheets** | **Airtable** |
|--------|-------------------|--------------|
| Simplicité / coût | Très simple, souvent gratuit | Gratuit limité ; payant si gros volume |
| Déjà dans vos guides | Oui (`GUIDE-MAKE-GOOGLE-SHEET`, formulaires) | À configurer de zéro |
| Une ligne = un message | Idéal | Idéal |
| Liens **conversation → dossier → messages** | Possible mais manuel | **Plus naturel** (tables liées, vues) |
| Équipe non technique | Tableur familier | Base + vues (Kanban, filtres) |

**Recommandation**

- **Par défaut** : **Google Sheets** — le plus rapide à brancher, cohérent avec le reste du projet.
- **Utilisez Airtable** si vous voulez : plusieurs tables liées (ex. *Contacts WhatsApp* ↔ *Messages* ↔ *Dossiers*), vues par statut, ou si toute l’équipe travaille déjà dans Airtable.

Les deux scénarios ci-dessous ont la **même entrée** (webhook) ; seul le module de stockage change.

---

## Architecture logique du scénario

```
[Custom Webhook]  →  [Option: Set variable / Parse JSON]  →  [Router optionnel]  →  [Sheets OU Airtable]  →  [Option: Filtre → Email / Slack]
```

1. **Webhook** : reçoit le POST de Netlify (un objet JSON par message).
2. **(Optionnel)** **Tools → Set variable** si Make n’affiche pas bien les champs imbriqués : mapper `body_text`, `wa_id`, etc.
3. **(Optionnel)** **Router** : branche différente selon `message_type` (`text` / `interactive` / `image`) ou selon `body_text` (ex. alerte si mot-clé).
4. **Stockage** : une **nouvelle ligne** par exécution = un message WhatsApp.
5. **(Optionnel)** Notification interne seulement pour certains cas.

**Important** : ne pas faire passer la **réponse** du bot par Make en temps réel pour le dialogue courant — le client parle avec **Netlify** ; Make sert au **suivi / CRM / alerting**.

---

## Partie commune — 1. Webhook Make

1. Make → **Créer un scénario**.
2. Module **Webhooks** → **Custom webhook**.
3. Créer le webhook, **copier l’URL**.
4. Dans **Netlify** → `ROBIN_LOG_WEBHOOK_URL` = cette URL → redéployer.
5. **Activer** le scénario, envoyer un message WhatsApp à Robin.
6. Dans Make, ouvrir l’exécution : vérifier les champs.  
   Champs utiles (selon version du webhook) :  
   `wa_id`, `from_phone`, `message_id`, `message_type`, **`body_text`**, `raw_payload`, `direction`.

Si le body arrive **en une seule string** (peu fréquent), ajoutez **JSON** → **Parse JSON** sur le corps.

---

## Variante A — **Google Sheets** (recommandée pour démarrer)

| Étape | Module | Réglages |
|-------|--------|----------|
| 1 | Webhooks → Custom webhook | (déjà créé) |
| 2 | Google Sheets → **Add a row** | Choisir le spreadsheet + feuille **WhatsApp_Log** (à créer) |
| 3 | Mapper les colonnes | Voir tableau des colonnes ci-dessous |

### Colonnes suggérées (feuille `WhatsApp_Log`)

| Colonne | Source Make (exemple) |
|---------|------------------------|
| `date_heure` | `{{now}}` (fonction Make) ou date de l’exécution |
| `wa_id` | champ webhook `wa_id` ou `from_phone` |
| `message_id` | `message_id` |
| `type` | `message_type` |
| `texte` | **`body_text`** (déjà normalisé : OUI, 1, menu_card…) |
| `brut` | `raw_payload` (optionnel, pour debug) |

Ensuite vous pouvez ajouter un **pivot** ou un second scénario pour agréger par numéro — pas obligatoire au début.

---

## Variante B — **Airtable**

| Étape | Module | Réglages |
|-------|--------|----------|
| 1 | Webhooks → Custom webhook | Identique |
| 2 | Airtable → **Create a record** | Base + table **Messages WhatsApp** |
| 3 | Mapper les champs | Même logique que le tableau Sheets |

### Champs suggérés (table Airtable)

- **Téléphone** (Single line text) : `wa_id`  
- **Message ID** (Single line text)  
- **Type** (Single select) : text / interactive / image  
- **Texte normalisé** (Long text) : `body_text`  
- **Payload brut** (Long text, optionnel) : `raw_payload`  
- **Reçu le** (Date) : maintenant  

**Table liée (optionnel, “pro” Airtable)** : table **Contacts** avec le numéro en clé ; lier chaque message au contact. Utile si vous avez beaucoup de retours clients.

---

## Router optionnel (exemples)

- **Branche 1** : `message_type` = `image` → ligne Sheet + notification « Photo reçue » (Slack).  
- **Branche 2** : `body_text` contient `menu_full` → tag « Parcours mandat » (colonne dédiée ou champ Airtable).

---

## Check-list rapide

- [ ] Scénario Make **activé**  
- [ ] `ROBIN_LOG_WEBHOOK_URL` = URL du webhook  
- [ ] Test : 1 message WhatsApp → 1 ligne Sheet ou 1 record Airtable  
- [ ] Pas besoin de module **360dialog** dans Make pour **recevoir** les logs

---

## Fichiers liés

- `docs/MODULE-WHATSAPP-COMMUNICATION.md` — rôle du log webhook vs bot  
- `WEBHOOK-WHATSAPP.md` — variable `ROBIN_LOG_WEBHOOK_URL`  
- `docs/CONFIGURER-WEBHOOK-MAKE.md` — création d’un webhook Make (formulaires ; même principe)

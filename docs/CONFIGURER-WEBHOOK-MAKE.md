# Configurer le webhook Make.com (pour recevoir les dossiers)

Si vous n’avez **rien qui arrive sur le webhook** Make.com, c’est en général que l’URL dans le site pointe encore vers un **exemple**. Il faut créer votre propre webhook et mettre **votre** URL dans le code.

---

## 1. Créer le webhook dans Make.com

1. Allez sur [Make.com](https://www.make.com) et connectez-vous.
2. **Créer un scénario** (nouveau scénario).
3. **Déclencheur** : ajoutez le module **Webhooks** → **Custom webhook**.
4. Créez le webhook (bouton « Add » / « Créer »).
5. **Copiez l’URL** affichée (elle ressemble à `https://hook.eu1.make.com/xxxxxxxxxxxxxxxx`).
6. **Sauvegardez** le scénario (même sans autre module pour l’instant).
7. **Activez** le scénario (interrupteur « On »).

Dès que le scénario est actif, chaque envoi du formulaire vers cette URL apparaîtra dans Make.com (onglet « Executions » / « Exécutions »).

---

## 2. Mettre votre URL dans le site

Remplacez l’URL **dans ces 3 fichiers** par **votre** URL Make.com.

| Fichier | Variable / constante | Ligne (approx.) |
|--------|----------------------|------------------|
| **depot-en-ligne.html** | `WEBHOOK_URL` | ~567 |
| **depot-simple.html** | `WEBHOOK` | ~509 |
| **dossier.html** | `DOSSIER_WEBHOOK_URL` | ~1348 |

- **Même URL pour tout** : si vous voulez que formulaire en ligne, dépôt simple et formulaire « dossier » arrivent au même endroit, mettez **la même URL** dans les 3 fichiers.
- **Deux webhooks** : vous pouvez utiliser une URL pour « dépôt en ligne + dépôt simple » et une autre pour « dossier complet » (comme dans le code actuel avec 2 URLs différentes).

Exemple pour **depot-en-ligne.html** :

```javascript
// Remplacez par VOTRE URL Make.com
const WEBHOOK_URL = "https://hook.eu1.make.com/VOTRE_ID_ICI";
```

Faites pareil pour `WEBHOOK` dans **depot-simple.html** et `DOSSIER_WEBHOOK_URL` dans **dossier.html** si vous utilisez ce formulaire.

---

## 3. Vérifier que ça arrive

1. Scénario Make **activé** (interrupteur vert).
2. Ouvrez sur votre site :  
   - [Votre site]/depot-en-ligne.html ou  
   - [Votre site]/depot-simple.html  
3. Remplissez le formulaire au minimum et soumettez.
4. Dans Make.com : **Scénario** → onglet **Executions** (ou **Historique**). Vous devez voir une exécution avec les données reçues.

Si rien n’apparaît : vérifiez que l’URL collée dans le fichier est **exactement** celle du webhook (sans espace, même région `eu1` si vous avez créé le webhook en EU).

---

## 4. Ensuite : Google Sheet, email, etc.

Une fois que les données arrivent bien sur le webhook, vous pouvez ajouter dans le même scénario Make :

- **Google Sheets** → Add a row (pour enregistrer chaque dossier dans un tableau).
- **Email** → Send an email (notification à vous ou au client).
- **Slack** / **Telegram** (notification interne).

Voir **GUIDE-MAKE-GOOGLE-SHEET.md** pour la structure Google Sheet et le mapping des champs.

---

## 5. Créer un dossier par client (Google Drive)

Pour que chaque envoi crée **un dossier** dans Google Drive avec les pièces du client (carte d’embarquement, pièce d’identité), suivez le guide **MAKE-DOSSIER-PAR-CLIENT.md** dans ce dossier.

---

## 6. Récapitulatif : ce que votre URL Make reçoit

| Source | Reçu par l’URL Make ? | Fichiers (carte d’embarquement, passeport) ? |
|--------|------------------------|---------------------------------------------|
| **Dépôt en ligne** (formulaire 7 étapes) | ✅ Oui | ✅ Oui (file_boarding, file_id, signatures) |
| **Dépôt simple** (3 clics) | ✅ Oui | ✅ Oui (file_longest_flight) |
| **Formulaire dossier** (dossier.html) | ✅ Oui | ❌ Non (données JSON uniquement) |
| **WhatsApp** (messages / photos des clients) | ❌ Non par défaut | — |

Les messages et photos **WhatsApp** arrivent d’abord au **webhook Netlify** (`/api/whatsapp-webhook`), pas à Make. Pour envoyer aussi une **copie** de chaque message WhatsApp à Make (texte, numéro, type de message), définissez dans **Netlify** la variable d’environnement **`ROBIN_LOG_WEBHOOK_URL`** avec votre URL Make. Make recevra alors un JSON par message (pas le fichier image lui-même ; pour récupérer les pièces WhatsApp, il faudrait une intégration Make ↔ WhatsApp ou un scénario supplémentaire).

---

## 7. Webhook « Envoi mise en demeure compagnie »

Un **second scénario** Make peut être utilisé pour l’envoi de la mise en demeure à la compagnie aérienne (AR24, envoi courrier, etc.). L’URL de ce webhook est à utiliser lorsque vous déclenchez l’envoi de la mise en demeure vers la compagnie (depuis Make ou un autre outil).

**URL webhook — Envoi mise en demeure compagnie :**

```
https://hook.eu1.make.com/boq1nyapajc6g94dwpdro4ttf8ueteit
```

À configurer dans le scénario Make qui envoie la mise en demeure à la compagnie (ou à appeler en POST depuis l’outil qui gère l’AR24 / le courrier).

# Checklist : avoir des dossiers dans Google Drive

Si vous avez créé le **webhook** Make.com mais qu’**aucun dossier** n’apparaît dans Google Drive, c’est en général que le scénario s’arrête au webhook. Il faut **ajouter les modules Google Drive** et **faire un envoi de test**.

---

## Étape 1 — Vérifier que les données arrivent au webhook

1. Dans Make.com, ouvrez votre scénario (celui avec votre webhook).
2. **Activez-le** (interrupteur **On** en haut à droite) si ce n’est pas déjà fait.
3. Sur votre site : allez sur **Dépôt express** (plus rapide pour tester) :  
   `https://robindesairs.eu/depot-express.html`
4. Remplissez au minimum : **prénom**, **numéro WhatsApp**, **départ** (ex. Paris), **arrivée** (ex. Dakar), et envoyez (avec ou sans photo).
5. Dans Make.com : onglet **Executions** (ou **Historique**). Vous devez voir **une nouvelle exécution** (il y a quelques secondes ou minutes).

- **Si vous ne voyez aucune exécution** : le formulaire n’envoie pas vers la bonne URL, ou le scénario est inactif. Vérifiez que l’URL dans `depot-express.html` / `depot-en-ligne.html` est bien la vôtre et que le scénario est **On**.
- **Si vous voyez des exécutions** : les données arrivent. Passez à l’étape 2.

---

## Étape 2 — Ajouter « Créer un dossier » dans Google Drive

Le webhook **reçoit** les données mais ne crée rien dans Drive tant que vous n’ajoutez pas les modules.

1. Dans le scénario Make.com, **ajoutez un module** après le webhook (cliquez sur le **+** après le module Webhook).
2. Cherchez **Google Drive**.
3. Choisissez **Create a folder** (Créer un dossier).
4. **Connectez votre compte Google** si demandé (autorisez l’accès à Google Drive).
5. Dans le module **Create a folder** :
   - **Drive** : votre compte (ou le Drive partagé si vous en utilisez un).
   - **Folder name** (Nom du dossier) : cliquez dans le champ puis, dans le mappage, sélectionnez des champs venant du **premier module** (Webhook). Par exemple :
     - `{{1.prenom}} {{1.nom}}` (dépôt en ligne)
     - ou `{{1.prenom}} - {{1.depart}} {{1.arrivee}}` (dépôt simple)  
     (Le chiffre « 1 » est souvent le numéro du module Webhook ; si vos champs ont un autre chemin, utilisez ce que Make vous propose.)
   - **Parent folder** (Dossier parent) : laissez « My drive » ou choisissez un dossier existant (ex. créez d’abord un dossier « Dossiers Robin » dans Drive et sélectionnez-le ici).
6. **Sauvegardez** le module (OK / Save).

---

## Étape 3 — (Optionnel) Envoyer les fichiers dans ce dossier

Pour que les **pièces** (carte d’embarquement, pièce d’identité) soient dans le dossier :

1. Ajoutez un nouveau module après **Create a folder** : **Google Drive** → **Upload a file**.
2. **Folder** : sélectionnez l’**ID** du dossier créé à l’étape 2 (sortie du module « Create a folder » — souvent `2.id` ou similaire).
3. **File name** : par ex. `carte_embarquement` (ou mappez depuis le webhook si le nom du fichier est fourni).
4. **File content** : mappez le champ **fichier** du webhook. Dans la sortie du module 1 (Webhook), cherchez le champ qui contient le fichier (ex. `file_boarding`, `file_id`, ou `file_longest_flight` pour le dépôt simple). Make peut l’afficher comme « Binary » ou « File ».
5. Sauvegardez.

Si vous avez plusieurs fichiers (carte + pièce d’identité), ajoutez **plusieurs** modules **Upload a file** (un par type de fichier), tous pointant vers le **même** dossier (ID de l’étape 2).

---

## Dossier qui s’appelle « New folder » ou vide

**Problème 1 — Le dossier s’appelle toujours « New folder » ou le webhook ne donne pas le nom**  
Le site envoie maintenant un **champ unique** pour le nom du dossier : **`dossier_nom`**. Vous n’avez plus à le construire dans Make.

1. **Redéployez le site** (ou attendez que la mise à jour soit en ligne) pour que le champ `dossier_nom` soit bien envoyé.
2. Dans Make.com, ouvrez le module **Google Drive → Create a folder**.
3. Dans **Folder name**, supprimez « New folder » et mappez **un seul champ** :
   - Cliquez dans le champ **Folder name**.
   - Dans le panneau de mappage à droite, sélectionnez le **module Webhook** (souvent module 1).
   - Choisissez le champ **`dossier_nom`** (ou `1.dossier_nom` selon l’affichage).
   - Vous devez obtenir : `{{1.dossier_nom}}` (ou le chemin équivalent proposé par Make).
4. **Sauvegardez** le module et le scénario.
5. Refaites un envoi de test : le dossier dans Drive doit s’appeler par ex. « Marie - Paris Dakar - 202603081430 » (dépôt simple) ou « Marie Dupont - 2026-02-15 » (dépôt en ligne).

**Problème 2 — Le dossier est vide (aucun fichier importé)**  
Le webhook reçoit les fichiers ; il faut **ajouter un module « Upload a file »** et mapper le **bon champ** sortant du webhook.

1. Après le module **Create a folder**, ajoutez **Google Drive** → **Upload a file**.
2. **Folder** : mappez l’**ID** du dossier créé (sortie du module Create a folder, ex. `2.id`).
3. **File name** : ex. `carte_embarquement.jpg` (dépôt simple : photo du vol) ou `piece_vol.jpg`.
4. **File content** (Contenu du fichier) :
   - Ouvrez une **exécution réussie** (verte) dans Make, cliquez sur le **module Webhook** (le premier).
   - Dans la **sortie** (Output), cherchez le champ qui contient le fichier. Selon la version de Make, il peut s’appeler :
     - **`file_longest_flight`** (dépôt simple) — type **Binary** ou **File**
     - **`file_boarding`** ou **`file_id`** (dépôt en ligne)
   - Dans le module **Upload a file**, pour **File content**, mappez **ce champ** (ex. `1.file_longest_flight`). Si Make propose plusieurs sous-champs (data, filename, etc.), essayez celui de type **Binary** ou **File**.
5. Si le fichier n’apparaît pas dans la sortie du webhook : vérifiez que vous avez bien **joint un fichier** lors du test (dépôt simple : ajoutez une photo ; dépôt en ligne : carte d’embarquement ou pièce d’identité). Sans fichier envoyé, le champ peut être vide.
6. **Dépôt en ligne** : vous pouvez ajouter **deux** modules **Upload a file** (un pour `file_boarding`, un pour `file_id`), tous deux avec **Folder** = ID du dossier créé.
7. **Sauvegardez** et refaites un test **avec un fichier joint** : le dossier doit contenir le fichier.

---

## Étape 4 — Sauvegarder et activer

1. **Save** le scénario (icône disquette ou Ctrl+S).
2. Vérifiez que l’interrupteur est **On** (scénario actif).
3. Refaites un **test** : soumettez à nouveau un formulaire (dépôt simple ou dépôt en ligne).
4. Attendez quelques secondes, puis regardez :
   - **Make.com** → Executions : l’exécution doit être **verte** (succès).
   - **Google Drive** : un nouveau dossier doit apparaître dans le dossier parent que vous avez choisi.

---

## En résumé

| Problème | À faire |
|----------|--------|
| Aucun dossier dans Drive | Ajouter le module **Google Drive → Create a folder** après le webhook, remplir le nom (ex. prenom + nom) et le dossier parent, sauvegarder, activer le scénario. |
| Aucune exécution dans Make | Vérifier que l’URL du site pointe vers votre webhook et que le scénario est **On** ; refaire un envoi de test. |
| Exécution en erreur (rouge) | Cliquer sur l’exécution pour voir le message d’erreur (connexion Google, champ manquant, etc.) et corriger le mappage ou la connexion. |

Une fois **Create a folder** ajouté et le scénario actif, chaque envoi de formulaire doit créer **un dossier** dans le Drive que vous avez choisi.

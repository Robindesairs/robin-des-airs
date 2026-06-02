# Click-to-WhatsApp Ads — WATI × Robin des Airs

## ✅ RÉPONSE WATI REÇUE — 3 actions à faire (manuel, dans Meta)

WATI a confirmé : **c'est supporté**, les conversations issues des pubs reviennent dans WATI/le bot,
à condition que le numéro et la Page soient sous le **même Business Manager** (`1998071927793153`).

**① Ajouter WATI comme partenaire sur ton WABA**
- business.facebook.com/settings → **Comptes → Comptes WhatsApp** → *(ton WABA)*
- onglet **Partenaires** → **Attribuer un partenaire**
- entrer l'**ID Business de WATI : `272761826427695`**
- accorder **Contrôle total (Full control)** → Attribuer

**② Lier le numéro à ta Page Facebook**
- **Page → Paramètres → Comptes liés → WhatsApp → Afficher (View)**
- entrer **+33 7 56 86 36 30** → **Envoyer le code**
- (ou simplement **Actualiser** si le numéro est déjà sous le même Business Manager)

**③ Tester dans le Gestionnaire de pubs**
- Créer une campagne **Interactions (Engagement)** → **Applications de messagerie → WhatsApp**
- sélectionner ta **Page** + le **numéro** dans le menu déroulant
- ✅ Si **+33 7 56 86 36 30 apparaît** → c'est branché → ta fonction `ad-launch.js` (déjà en Click-to-WhatsApp) tournera.

> ⚠️ Pense aussi à générer un **token System User permanent** (avec le scope
> `whatsapp_business_management`) — le token actuel expire et fait tomber `meta-stats` + les pubs.

---

## (Archive) Message initial envoyé au support WATI

> **But** : faire en sorte que notre numéro WhatsApp hébergé chez WATI (+33 7 56 86 36 30)
> puisse être la destination de publicités **Click-to-WhatsApp** lancées depuis NOTRE
> compte publicitaire et NOTRE Page Facebook. Pour ça, le WABA doit être partagé/connecté
> à notre portefeuille Meta Business Manager, puis relié à la Page et au compte pub.

---

## ✉️ Version à envoyer (anglais — support@wati.io / chat WATI)

**Subject: Enable Click-to-WhatsApp Ads — connect our WABA to our Meta Business Manager**

Hello WATI team,

We run our WhatsApp Business number **+33 7 56 86 36 30** through WATI (it's live and our
bot replies correctly). We now want to run **Click-to-WhatsApp ads** from **our own
Facebook Page and ad account**, with this number as the destination, so that ad clicks open
a WhatsApp chat that flows back into WATI/our bot.

Could you please help us with the following:

1. **Share / connect our WhatsApp Business Account (WABA)** for +33 7 56 86 36 30 to **our
   Meta Business Manager** (Business portfolio ID: `1998071927793153`).
2. Confirm we can **connect this WABA to our Facebook Page** (Page ID: `982598154943898`) and our
   **Ad Account** (`act_983003804718563`) so they're all in the same Business portfolio.
3. Confirm that **Click-to-WhatsApp ads are supported** for our number and that **incoming
   conversations from ads will still be delivered to WATI** (and our webhook/bot).
4. If WATI hosts the WABA on its own Business Manager, please grant us **partner/asset
   access** so the number appears as a destination when we create a "WhatsApp" ad in Meta
   Ads Manager.

Our goal: when we create an ad with objective **Engagement → WhatsApp**, the number
**+33 7 56 86 36 30** must show up as a selectable destination in Meta Ads Manager.

Thank you!

---

## 🇫🇷 Traduction (pour toi)

Bonjour,

Nous utilisons notre numéro WhatsApp Business **+33 7 56 86 36 30** via WATI (en service, le
bot répond bien). Nous voulons maintenant lancer des **publicités Click-to-WhatsApp** depuis
**notre propre Page Facebook et notre compte publicitaire**, avec ce numéro comme
destination, pour que les clics ouvrent une conversation WhatsApp qui revient dans WATI/le bot.

Pourriez-vous nous aider à :
1. **Partager / connecter notre WABA** (+33 7 56 86 36 30) à **notre Business Manager Meta**
   (ID du portefeuille Business : `1998071927793153`).
2. Confirmer qu'on peut **relier ce WABA à notre Page Facebook** (ID Page : `982598154943898`) et
   à notre **compte publicitaire** (`act_983003804718563`), tous dans le même portefeuille Business.
3. Confirmer que les **pubs Click-to-WhatsApp sont supportées** et que les **conversations
   issues des pubs arriveront toujours dans WATI** (et notre webhook/bot).
4. Si le WABA est hébergé sur le Business Manager de WATI, nous donner un **accès
   partenaire** pour que le numéro apparaisse comme destination dans le Gestionnaire de pubs.

Objectif : en créant une pub **Interactions → WhatsApp**, le numéro **+33 7 56 86 36 30**
doit apparaître comme destination sélectionnable.

Merci !

---

## 🔢 IDs

| ID | Valeur | Statut |
|---|---|---|
| **Page ID** | `982598154943898` | ✅ pré-rempli (depuis Netlify `META_AD_PAGE_ID`) |
| **Ad Account ID** | `act_983003804718563` | ✅ pré-rempli (depuis Netlify `META_AD_ACCOUNT_ID`) |
| **Business portfolio ID** | `1998071927793153` (robin.des.airs) | ✅ récupéré via API Meta |

✅ **Les 3 IDs sont remplis — le message est prêt à envoyer tel quel.**

---

## ✅ Comment savoir que c'est bon

Quand WATI a terminé : va dans **Gestionnaire de publicités → Créer → Objectif Interactions
→ Destination WhatsApp**. Si **+33 7 56 86 36 30 apparaît dans la liste**, c'est branché, et
la fonction automatique `ad-launch.js` (déjà corrigée en Click-to-WhatsApp) fonctionnera.

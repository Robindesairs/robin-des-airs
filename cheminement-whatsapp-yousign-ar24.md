# Cheminement complet : WhatsApp → Yousign → AR24

**Document de référence :** `mandat-robin-v9.docx` (signature Yousign)

---

## ⚠️ RAPPEL OBLIGATOIRE : IMMATRICULATION

**À ajouter dans le mandat (mandat-robin-v9.docx) avant mise en production Yousign :**

- **Immatriculation** de Robin des Airs (numéro d’immatriculation / identification légale de la structure : RCS, SIRET, ou tout identifiant requis pour le mandat de représentation).

Vérifier que le document final envoyé en signature contient bien ce champ, conforme aux exigences légales et à Yousign.

---

## Parcours client (vue d’ensemble)

```
WhatsApp (robot)
    → Collecte des infos (vol, date, PNR, passagers, adresse, téléphone)  [sans pièce d’identité]
    → Génération du document mandat (pré-rempli)
    → Envoi du lien Yousign au client
    → Client signe sur Yousign
    → Document signé
    → Récupération du passeport / pièce d’identité (demandé au client après la signature)
    → Envoi en AR (AR24) à la compagnie aérienne (mandat + pièce si nécessaire)
```

---

## Étape 1 — Conversation WhatsApp (robot)

Le client initie ou répond sur WhatsApp. Le robot enchaîne les questions dans l’ordre ci‑dessous.

### 1.1 Identification du ou des passagers

- **Pour chaque passager :**
  - Prénom
  - Nom
- Le robot demande s’il y a d’autres passagers ; si oui, répéter prénom / nom pour chacun.
- **À la fin :** confirmer la liste (ex. « Passagers : Jean Dupont, Marie Martin »).

### 1.2 Numéro de téléphone (contact)

- Le robot **récupère automatiquement** le numéro WhatsApp de l’expéditeur.
- **Message du robot :** « Est-ce bien le numéro auquel nous pouvons vous joindre pour ce dossier : [numéro] ? Oui / Non »
- Si **Non** : demander le numéro de contact à utiliser pour le dossier.

### 1.3 Trajet / vols

- **Un vol direct :**
  - Numéro(s) de vol (ex. AF123, TO456).
  - Date du vol.
- **Correspondance (plusieurs segments) :**
  - Pour **chaque** segment :
    - Numéro de vol
    - Date du segment
  - Ex. : Vol 1 AF123 Paris–Casablanca, Vol 2 AT456 Casablanca–Dakar.
- Le robot reformule le trajet complet et demande confirmation.

### 1.4 PNR (Booking reference)

- Demander le **code PNR** (6 caractères, ex. ABC123).
- Confirmer en affichant le PNR saisi.

### 1.5 Compagnie aérienne

- Compagnie du vol principal (ou liste si plusieurs compagnies), pour le document et l’envoi AR.

### 1.6 Adresse postale

- Adresse postale du client (pour courrier éventuel et pour le document si besoin).
- Ville, code postal, pays.

**À ne pas demander à cette étape :** la pièce d’identité (passeport / CNI) est demandée **uniquement après** la signature du mandat (voir étape 4).

---

## Étape 2 — Génération du document et envoi Yousign

- Le robot (ou le back-office relié au bot) :
  - Remplit le **modèle de mandat** (mandat-robin-v9.docx) avec :
    - Prénom, nom de chaque passager
    - Numéro(s) de vol, date(s)
    - PNR
    - Compagnie
    - Trajet (départ → arrivée, et segments en cas de correspondance)
    - Adresse postale
    - Numéro de téléphone de contact
    - **Immatriculation** (si elle est sur le document)
  - Crée une **signature Yousign** (document + signataire = le client).
  - Envoie au client le **lien de signature Yousign** par WhatsApp (et/ou par email si collecté).

---

## Étape 3 — Signature client (Yousign)

- Le client ouvre le lien, lit le mandat, signe sur Yousign.
- Yousign enregistre la signature et renvoie le **document signé** (PDF) au back-office (webhook / API).

---

## Étape 4 — Récupération du passeport / pièce d’identité (après signature)

- **Important :** La pièce d’identité (passeport ou carte d’identité) est demandée **après** la signature du mandat, pas avant.
- Dès que le mandat est signé, le robot (ou l’équipe) envoie au client sur WhatsApp un message du type :  
  *« Merci pour votre signature. Pour finaliser le dossier et constituer le courrier à la compagnie, pouvez-vous nous envoyer une photo claire de votre pièce d’identité (passeport ou carte d’identité) ? »*
- Le client envoie la photo du passeport ou de la CNI (pour chaque passager si plusieurs).
- Les pièces sont stockées avec le dossier (Drive, back-office) et jointes au courrier AR si la compagnie l’exige.

---

## Étape 5 — Envoi en AR à la compagnie (AR24)

- Une fois le **mandat signé** et les **pièces d’identité reçues** (ou selon votre process : envoi du mandat d’abord, pièces en complément si demandé) :
  - Le système envoie le document (mandat signé + pièce(s) si besoin) à la **compagnie aérienne** en **lettre recommandée avec accusé de réception**, via **AR24**.
- Adresse d’envoi : siège / service réclamations de la compagnie (base de données d’adresses AR à maintenir).

---

## Récapitulatif des données à capturer (robot WhatsApp)

| Donnée | Quand | Détail |
|--------|--------|--------|
| **Passagers** | Avant mandat | Prénom + nom pour chaque passager |
| **Téléphone** | Avant mandat | Numéro WhatsApp (auto) + confirmation « numéro de contact » |
| **Vol(s)** | Avant mandat | Numéro(s) de vol, date(s) ; en cas de correspondance : chaque segment |
| **Trajet** | Avant mandat | Départ → arrivée ; si correspondance : A → B, B → C, etc. |
| **PNR** | Avant mandat | Code réservation 6 caractères |
| **Compagnie** | Avant mandat | Nom / code compagnie |
| **Adresse postale** | Avant mandat | Complète (pour document + courrier) |
| **Signature mandat** | Yousign | PDF reçu après signature → déclenche étape suivante |
| **Passeport / pièce d’identité** | **Après signature du mandat** | Photo demandée au client par WhatsApp une fois le mandat signé ; pour chaque passager si plusieurs |
| **Envoi AR24** | Après réception pièce(s) | Mandat signé (+ pièce(s)) envoyé en AR à la compagnie |

---

## Rappel document

- **mandat-robin-v9.docx** = document final à signer sur Yousign.
- **À ne pas oublier dans ce document :** champ **immatriculation** (Robin des Airs) avant mise en production.

---

*Document de référence — Robin des Airs — Février 2026*

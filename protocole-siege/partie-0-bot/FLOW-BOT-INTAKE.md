# Bot WhatsApp — Flow d'intake automatique (Phase 0)

> **⚠️ Archive — capture live du 23/05/2026**  
> **Version à déployer dans WATI :** [`WHATSAPP-BOT-PHASE-0.md`](./WHATSAPP-BOT-PHASE-0.md) (v2 — audits appliqués le 19/05/2026)  
> Checklist P0/P1, messages réécrits, split final A/B/C, gate Europe, durée retard, email/adresse, templates R1–R3.

**Rôle :** Collecte automatisée des informations client avant prise en main humaine.  
**Plateforme :** WhatsApp Business API (WATI ou 360dialog)  
**Étapes couvertes :** 1 à 3 (7 auto) du parcours 26 étapes  
**Accès humain :** À partir de l'étape 4 (vérification vol + noms)

---

## Vue d'ensemble du flow (7 étapes / indicateur 🟢)

```
🟢⚪⚪⚪⚪⚪⚪  Étape 1 — Accueil + pitch
🟢⚪⚪⚪⚪⚪⚪  Étape 1 — Nombre de passagers
🟢🟢⚪⚪⚪⚪⚪  Étape 2 — Direct ou correspondance
🟢🟢⚪⚪⚪⚪⚪  Étape 2 — Langue vocaux/suivi
🟢🟢⚪⚪⚪⚪⚪  Étape 2 → Étape 3
🟢🟢🟢⚪⚪⚪⚪  Étape 3 — Type d'incident
🟢🟢🟢⚪⚪⚪⚪  Étape 3 — Photo carte d'embarquement (OCR)
🟢🟢🟢🟢🟢⚪⚪  Étape 4 — Vérification données OCR
🟢🟢🟢🟢🟢🟢🟢  Étape 5 — Année du vol
🟢🟢🟢🟢🟢🟢🟢  Étape 6 — Confirmation passagers
🟢🟢🟢🟢🟢🟢🟢  Étape 7 — Mineurs ?
🟢🟢🟢🟢🟢🟢🟢  Fin bot — Récap + lien mandat + demande pièces
```

---

## Messages complets du bot (verbatim, enregistrés le 23/05/2026)

### [ÉTAPE 1 — Accueil]

```
🟢⚪⚪⚪⚪⚪⚪
👋 Bienvenue chez *Robin des Airs* 🏹

Ne laissez pas votre argent
à la compagnie aérienne.

Votre vol retardé ou annulé vous donne
droit à *600 € d'indemnité légale.*

⚖️ *Zéro frais.* On prend 25%
uniquement si vous recevez votre argent.

⏱️ *Votre dossier s'ouvre en environ 5 minutes* — quelques questions courtes ici.
```

### [ÉTAPE 1b — Nombre de passagers]

```
👥 *Pour combien réclamez-vous ?*
🟢⚪⚪⚪⚪⚪⚪
👆 Ouvrez *Choisir* puis touchez une ligne — ou tapez un chiffre *1* à *6*.
```

*(Boutons liste : 1, 2, 3, 4, 5, 6+)*

### [ÉTAPE 2 — Confirmation passager + type de vol]

```
✅ *1 passager enregistré.*

✈️ Sur ce trajet : vol *direct* ou *avec correspondance* ?
🟢🟢⚪⚪⚪⚪⚪
```

*(Boutons : Direct / Avec correspondance)*

### [ÉTAPE 2b — Langue vocaux]

```
✅ *C'est noté* — nous visons jusqu'à *450 € net* pour votre groupe. 🚀

Dans quelle langue nos experts doivent-ils vous contacter *(vocal, suivi)* ?
🟢🟢⚪⚪⚪⚪⚪
```

*(Boutons langue selon pays détecté — FR/EN + langues locales)*

### [ÉTAPE 2c — Confirmation langue]

```
Parfait ! ✅ Les vocaux, si besoin, seront en *🇫🇷 Français*.

On continue ?
🟢🟢⚪⚪⚪⚪⚪
```

### [ÉTAPE 3 — Type d'incident]

```
⚖️ *Que s'est-il passé sur ce vol ?*
🟢🟢🟢⚪⚪⚪⚪
```

*(Boutons : Retard / Annulation / Surbooking / Correspondance ratée)*

### [ÉTAPE 3b — Photo carte d'embarquement (OCR)]

```
*📸 PREUVES — Carte d'embarquement / confirmation*

👍 On va vous faire gagner du temps.

*L'avantage* : une photo nette permet de remplir le dossier automatiquement — c'est le plus rapide !

*Comment souhaitez-vous continuer ?*
🟢🟢🟢⚪⚪⚪⚪
```

*(Boutons : Envoyer une photo / Saisir manuellement)*

### [ÉTAPE 4 — Lecture OCR + vérification]

```
📸 *Carte / billet lu !*

Voici ce que nous avons détecté — *vérifiez avant de poursuivre* :

✈️ *EJU7524*
easyJet
🎫 *6 août*
_(jour/mois sur le billet — l'année est demandée juste après.)_
📋 *K5FW8BX*
🛤️ *BSL → FAO*
👤 *M. SAMIR DRIDI*

ℹ️ _Si une information est incorrecte : touchez *Corriger* ci-dessous._

*Tout est correct ?*
🟢🟢🟢🟢🟢⚪⚪
```

*(Boutons : Tout est correct / Corriger)*

### [ÉTAPE 5 — Année du vol]

```
🎫 *6 août* est indiqué sur votre carte d'embarquement, **sans l'année**.
*De quelle année* s'agit-il ?

1️⃣  2025
2️⃣  2024
3️⃣  2023
4️⃣  2022
5️⃣  2021

💡 _Si votre année ne figure pas, envoyez la *date complète* (JJ/MM/AAAA)._

💡 *Ou tapez la date complète d'un coup :* `JJ/MM/AAAA` ou `AAAA-MM-JJ` _(ex. `12/05/2024` ou `2024-05-12`, ou `12 mai 2024`) — sans passer par les menus._
🟢🟢🟢🟢🟢🟢🟢
```

### [ÉTAPE 6 — Confirmation passagers]

```
👥 *Les 1 passagers — confirmez*

  1. *M. SAMIR DRIDI*
🟢🟢🟢🟢🟢🟢🟢
```

*(Boutons : Confirmer / Modifier)*

### [ÉTAPE 7 — Mineurs]

```
👶 *Question juridique importante*

Parmi les passagers suivants, y a-t-il des mineurs (moins de 18 ans) ?

• *M. SAMIR DRIDI*

⚖️ Obligation légale pour préparer le bon mandat de signature.
🟢🟢🟢🟢🟢🟢🟢
```

*(Boutons : Non, tous majeurs / Oui, il y a des mineurs)*

### [FIN BOT — Récap + mandat + pièces]

```
🎉 *Dossier prêt à être déposé !*

📋 *Récapitulatif dossier*
👥 *Passagers :* 1
🪪 *Noms sur le dossier :* M. SAMIR DRIDI
✈️ *Parcours :* vol *direct* (sans correspondance)
📞 *Langue des experts (vocal) :* 🇫🇷 Français
⚖️ *Incident déclaré :* Retard +3h
🛫 *Compagnie :* easyJet
🔢 *N° de vol :* EJU7524
📅 *Date du vol :* 06/08/2025
🎫 *PNR :* K5FW8BX
🌍 *Itinéraire :* BSL → FAO

📁 *Réf. dossier :* *RDA-20260515-E448*
💵 *Montant net visé (groupe, indicatif) :* *450 €*

Il reste *2 étapes rapides* :

1️⃣ *Signature du mandat* — page sécurisée *Robin des Airs*, puis votre signature :
https://robindesairs.eu/sign/4ljU2K7IIFh3BQ

2️⃣ *Justificatifs en photos* sur ce fil : *passeport ou CNI lisible* + *carte d'embarquement* ou confirmation *si nécessaire*.

🔒 Vos pièces ne servent *qu'à ce dossier*. *Confidentialité :* https://robindesairs.eu/politique-confidentialite
```

---

## ⚠️ BUGS IDENTIFIÉS (capture v1 — corrigés dans v2)

### 🔴 BUG CRITIQUE — URL de signature (404)

**Message v1 (obsolète) :** `https://robindesairs.eu/sign/4ljU2K7IIFh3BQ`  
**Correction v2 :** `{{mandat_url}}` → `mandat.html?ref=...` — voir [`WHATSAPP-BOT-PHASE-0.md`](./WHATSAPP-BOT-PHASE-0.md) et `docs/WATI-LIEN-MANDAT.md`  
**Filet site :** redirect `/sign/*` → `/mandat.html` dans `netlify.toml`

---

## Points forts du flow

- ✅ Progress bar 🟢⚪ claire et motivante
- ✅ OCR carte d'embarquement réduit la saisie manuelle (meilleur UX)
- ✅ Vérification données OCR avant de continuer (évite erreurs)
- ✅ Résolution de l'année ambiguë (carte d'embarquement sans année)
- ✅ Question langue après vol confirmé (conforme protocole)
- ✅ Question mineurs pour mandat légal adapté
- ✅ Référence dossier auto-générée (RDA-AAAAMMJJ-XXXX)

---

## Points d'amélioration identifiés (à analyser par agents)

- ⚠️ Message final très long (17 lignes récap) → surcharge cognitive sur mobile
- ⚠️ Les 2 actions (signer + envoyer pièces) sont dans le même message final → laquelle d'abord ?
- ⚠️ Aucun message de réengagement si le client abandonne en cours de flow
- ⚠️ "On continue ?" (étape 2c) = friction inutile — une étape à supprimer ?
- ⚠️ Pas de CTA d'urgence dans le message d'accueil (délai de prescription 3 ans)
- ⚠️ Pas de preuve sociale dans l'accueil (nb de clients, taux de succès)
- ⚠️ Le récap final ne dit pas "la prochaine étape la plus importante est…" — deux tâches sans priorité

---

*Fichier créé le 23/05/2026 — source : conversation bot live capturée par le client*

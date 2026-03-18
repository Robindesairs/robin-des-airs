# Parcours WhatsApp Robin des Airs — 26 étapes

Référence : version finale du parcours (accusé réception → type de problème → infos → humain à l’étape 4 → signature → pièces → suivi → paiement → témoignage → parrainage → relance rétroactive).

---

## Premier message que le client envoie (pré-rempli au clic sur le bouton)

C’est le **premier message** que le client t’envoie. Quand il clique sur le bouton WhatsApp du site, la zone de saisie s’ouvre avec ce texte — il n’a qu’à compléter et envoyer :

> Bonjour Robin ! 🏹  
> 📎 Je joins ma/mes carte(s) d'embarquement  
> Ou si je ne les ai plus :  
> Numéro(s) de vol :  
> Date :

- **Calendrier (date)** : possible sur le site (champ `type="date"`) puis pré-remplir la ligne « Date du vol » dans l’URL WhatsApp. À faire si tu veux un vrai calendrier avant l’envoi.
- **Nombre de passagers (boutons)** : possible sur le site (boutons 1, 2, 3, 4+) puis inclure la valeur dans le message ; ou en **étape 1 / 3** côté WhatsApp avec des boutons rapides (réponses pré-définies).

---

## Site — langues parlées

Le site reste comme à l’origine sur les langues : tableau concurrents, mentions « Service disponible en français, wolof… », etc. Rien à changer. La question de langue pour **appel / vocaux** ne se pose **que** dans la conversation WhatsApp.

---

## Dans la conversation WhatsApp — question langue (uniquement une fois le vol confirmé)

**Règle pour toutes les langues et tous les pays :** on pose la question de langue (appel / messages vocaux) **uniquement une fois le vol confirmé** — pas au tout début, pas dès qu’il dit « retard ». C’est **après** qu’on a vérifié le vol (étape 4, numéro de vol + route connus) qu’on demande quelle langue il préfère pour les appels et les vocaux.

- **Exemple Congo :** on a récupéré un vol Kinshasa → à ce moment-là on lui pose la question (Lingala, français, anglais). Éventuellement un petit mot en lingala, puis « Quelle langue souhaitez-vous utiliser pour les appels et messages vocaux ? » en bulles.
- **Exemple Sénégal / Dakar :** une fois le vol Dakar confirmé → à ce moment-là on pose la question (Wolof, Pulaar, français, anglais) en bulles.
- **Même logique partout :** vol confirmé (route connue) → **puis** question langue, avec les langues du pays + français + anglais.

**Ce qu’on dit au client (après confirmation du vol) :**
- Ici sur le **chat** on reste en **français ou en anglais** pour tout ce qui est écrit.
- **Quelle langue vous préférez si on doit vous appeler ou vous laisser des messages vocaux ?** → pour le rediriger vers la bonne personne et le rassurer (on parle sa langue).

### Texte type (après étape 4, vol confirmé — à adapter selon le pays)

> [Si pertinent : un petit mot dans la langue du pays, ex. en lingala pour Congo, en wolof pour Sénégal.]
>
> Ici sur le chat on reste en français ou en anglais pour l’écrit. Dernière chose : **quelle langue vous préférez pour les appels et les messages vocaux ?** (comme ça on vous met avec quelqu’un qui parle votre langue.)

Puis **bulles selon le pays du vol confirmé** (ex. Kinshasa : [Lingala] [Français] [English] — Dakar : [Wolof] [Pulaar] [Français] [English], etc.).

### Langues par pays (référence)

| Pays / escale | Langues à proposer (appel / vocaux) — pays + FR + EN |
|---------------|------------------------------------------------------|
| **Sénégal** (Dakar) | Français, English, Wolof, Pulaar, Soninké |
| **Côte d’Ivoire** (Abidjan) | Français, English, Dioula, autres langues ivoiriennes |
| **Mali** (Bamako) | Français, English, Bambara, Soninké |
| **Guinée** (Conakry) | Français, English, Pulaar |
| **RD Congo / Congo** (Kinshasa, Brazzaville) | Français, English, Lingala |
| **Cameroun** (Douala, Yaoundé) | Français, English (langues locales selon dispo) |
| **Antilles** | Français, English |
| **Autres** | Français, English |

---

## Signature des messages — « L’équipe Robin » ou pas ?

**Règle simple :** des fois oui, des fois non.

- **Signer (L’équipe Robin / Robin)** sur les messages **importants** : récap du dossier, envoi du lien de signature, bonne nouvelle (indemnité acceptée, virement envoyé), relance après silence. Ça ancre la marque et rassure.
- **Ne pas signer** sur les **échanges courts** (réponses rapides, « OK », « J’ai reçu », une question précise). Évite de surcharger.

En pratique : fin de message « bloc » (paragraphe qui conclut une étape) → signer. Réponse en une ligne → pas besoin.

---

## Message vocal et fenêtre 24 h

**Oui : le message vocal compte comme le dernier message du client.**

- La règle WhatsApp : tu as **24 h à partir du dernier message reçu du client** pour envoyer des messages « hors template » (messages libres).
- Si le client envoie un **message vocal**, ce vocal = dernier message → les 24 h repartent à zéro à partir de ce vocal.
- Donc : **message vocal = même règle que le texte**, 24 h à partir de ce message.

En dehors des 24 h, seuls les **templates** approuvés par Meta peuvent être envoyés (ex. suivi J+7, J+15, relance signature, etc.).

---

## WhatsApp peut-il faire tout ce parcours ?

**Oui**, avec **WhatsApp Business API** (Meta) + un outil d’automatisation (Make.com, Twilio, 360dialog, etc.) :

| Élément | Possible ? | Comment |
|--------|------------|--------|
| Message pré-rempli depuis le site | Oui | Lien `wa.me/numero?text=...` (déjà en place). |
| Réponse automatique immédiate (étape 1) | Oui | Webhook → envoi d’un message template ou libre dans la fenêtre 24 h. |
| Boutons (étapes 2–3, 6) | Oui | **Reply buttons** (Retard / Annulation / Surbooking / Correspondance) et **List** ou boutons (Direct / Correspondance, 2026/2025/2024/Avant 2024, Majeur/Mineur). |
| Prise en charge par un humain (étape 4+) | Oui | Un agent répond dans la même conversation ; l’API permet de basculer automatique ↔ humain. |
| Envoi de templates hors 24 h (J+7, J+15, etc.) | Oui | Avec des **templates** pré-approuvés par Meta (ex. « Bonjour {1}, point sur votre dossier : {2} »). |
| Pièces / RIB via lien sécurisé | Oui | Envoi d’un message avec lien (formulaire sécurisé) ; pas d’envoi de fichiers sensibles par WhatsApp. |

En résumé : les étapes 1–3 en automatique avec boutons, l’humain à l’étape 4, puis mix templates (suivis) + réponses manuelles (mandat, RIB, résultat), c’est supporté par l’API WhatsApp.

---

## Tableau récap (qui fait quoi)

| # | Étape | Qui | Auto ? |
|---|-------|-----|--------|
| 1 | Accusé réception | Template | Oui |
| 2 | Type de problème (boutons) | Template | Oui |
| 3 | Direct/correspondance + année (boutons) | Template | Oui |
| **4** | **Vérification vol + demande noms** | **Humain** | Non |
| 5–26 | … | Mix humain / Make.com | Selon étape |

7 étapes automatiques, 19 humaines. Fenêtre 24 h : repart du dernier message client (texte **ou** vocal).

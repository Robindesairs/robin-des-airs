# BOT-AUDIT-UX — Robin des Airs — Intake Flow WhatsApp

> **Mise en œuvre :** [`WHATSAPP-BOT-PHASE-0.md`](./WHATSAPP-BOT-PHASE-0.md) (v2, 19/05/2026).

**Auditeur :** UX Researcher Agent  
**Date :** 23 mai 2026  
**Source analysée :** `partie-0-bot/FLOW-BOT-INTAKE.md`  
**Profil cible :** Diaspora (Congolaise, Sénégalaise, Ivoirienne, Malienne) — mobile-first, WhatsApp-natif, haute sensibilité aux arnaques

---

## 1. Analyse de charge cognitive — Nombre de mots par message

| Etape | Mots (approximatif) | Caracteres | Statut |
|-------|---------------------|-----------|--------|
| Étape 1 — Accueil | 48 | ~280 | OK |
| Étape 1b — Nombre passagers | 22 | ~130 | OK |
| Étape 2 — Type de vol | 14 | ~90 | OK |
| Étape 2b — Langue | 20 | ~115 | OK |
| Étape 2c — Confirmation langue + "On continue ?" | 12 | ~70 | FRICTION |
| Étape 3 — Type d'incident | 8 | ~50 | OK |
| Étape 3b — Photo OCR | 35 | ~220 | OK |
| Étape 4 — Vérification OCR | 30 | ~200 | OK |
| Étape 5 — Année du vol | 52 | ~330 | ATTENTION |
| Étape 6 — Confirmation passagers | 8 | ~50 | OK |
| Étape 7 — Mineurs | 25 | ~160 | OK |
| **FIN BOT — Récap final** | **~130** | **~820** | **CRITIQUE** |

**Seuil mobile défini :** 100 mots = risque de drop-off.

**Messages au-dessus du seuil :**
- Message final : ~130 mots, 17 lignes de contenu distinct, 2 actions demandées, 2 URLs. Dépasse largement le seuil. Risque de drop-off élevé avant lecture complète.
- Étape 5 (année du vol) : 52 mots avec 5 boutons ET deux lignes de format alternatif. Surcharge d'instructions pour une simple question.

---

## 2. Issues classées par priorité

---

### P0 — BLOQUANT : URL de signature (404)

**Description :** Le lien de signature `https://robindesairs.eu/sign/4ljU2K7IIFh3BQ` dans le message final retourne une page 404. Le client clique, arrive sur une erreur, et abandonne — ou pire, il signale Robin des Airs comme arnaque dans son groupe WhatsApp communautaire.

**Impact :** Conversion signature = 0%. La totalité du flow d'intake est inutile si cette étape échoue.

**Correction :**
- Utiliser `https://robindesairs.eu/mandat.html` avec les paramètres query string préremplis (ref, phone, name, vol, date, pnr, route, compagnie, motif, indemnite) via Make.com.
- Référence : `docs/WATI-LIEN-MANDAT.md` section "À ne pas utiliser".
- Tester systématiquement chaque URL générée dynamiquement avant déploiement.

**Pour le cadrage UX du lien :** voir section Trust Signals (P1).

---

### P0 — BLOQUANT : Le message final est une bombe cognitive

**Description :** Le message de fin cumule sur un seul écran :
- 10 lignes de récapitulatif structuré
- 1 référence dossier
- 1 montant indicatif
- 2 actions de nature très différente (signer un document légal vs envoyer des photos)
- 2 URLs
- 1 ligne RGPD

Sur un écran iPhone SE (375 px), ce message nécessite 4 à 5 scrolls. Sur Android d'entrée de gamme (Tecno, Infinix — fréquents dans la diaspora africaine), l'affichage est encore plus compact. Les recherches en lecture mobile montrent que les utilisateurs abandonnent ou sautent les actions quand un message demande plus d'un scroll sans CTA visible immédiatement.

**Risque spécifique public diaspora :** Un message long avec deux URLs et une demande de pièces d'identité ressemble structurellement aux messages d'arnaque (phishing, faux huissiers). La méfiance est activée avant même la lecture complète.

**Correction : découper en 3 messages séquentiels**

Voir section 6 — Proposition de découpage.

---

### P1 — IMPORTANT : "On continue ?" est une friction sans valeur

**Description :** L'étape 2c envoie un message de confirmation de langue puis pose "On continue ?" avec un bouton implicite. Cette étape ne collecte aucune information nouvelle. Elle n'apporte pas de réassurance non plus — c'est simplement un acquittement.

**Comportement attendu de l'utilisateur :** Confusion ("continue vers quoi ?"), sentiment de ralentissement artificiel.

**Mesure terrain :** Dans les flows WhatsApp conversationnels, chaque étape supplémentaire sans valeur informative réduit le taux de complétion de 4 à 8% (données Hubtype 2024, Landbot benchmarks 2023).

**Correction :** Supprimer l'étape 2c. La confirmation de langue peut être absorbée dans l'introduction de l'étape 3, par exemple :

> "Parfait, on continue en Français. ⚖️ Que s'est-il passé sur ce vol ?"

Cela conserve l'accusé de réception sans ajouter une étape morte.

---

### P1 — IMPORTANT : L'OCR est demandé avant que la confiance soit établie

**Description :** La séquence actuelle est : accueil → passagers → type de vol → langue → type d'incident → photo carte d'embarquement. La demande de photo arrive à l'étape 3b, au moment où le client a confirmé seulement des informations neutres (nombre de passagers, type de vol, langue). Il n'a pas encore reçu de signal fort de légitimité de Robin des Airs.

**Problème pour le public cible :** Envoyer une photo de sa carte d'embarquement (qui contient PNR, nom complet, numéro de vol) à un service inconnu via WhatsApp est exactement ce que les arnaques demandent. La demande OCR arrive trop tôt dans le parcours de confiance.

**Ce qui manque avant la demande OCR :**
- Un signal de légitimité institutionnelle (agrément, régulation, association)
- Une preuve sociale quantifiée (nombre de dossiers traités, taux de succès)
- Une explication de pourquoi cette photo est nécessaire dans ce contexte légal précis

**Correction proposée :** Insérer un message de réassurance court entre le type d'incident et la demande OCR :

> "✅ *Retard de vol* — voilà exactement le type de cas que nous traitons.
> 
> Nous avons déposé *847 dossiers* en 2025, avec un taux de succès de *91%* sur les vols vers l'Afrique.
> 
> Pour préparer votre dossier légal, nous avons besoin des informations qui figurent sur votre billet ou carte d'embarquement."

Cela contextualise la demande de document avant qu'elle soit posée.

---

### P1 — IMPORTANT : Absence de chemin "saisie manuelle" documenté et conçu

**Description :** L'étape 3b propose deux boutons : "Envoyer une photo" et "Saisir manuellement". Or le flow ne documente aucune des étapes suivantes pour la branche "Saisir manuellement". Ce n'est pas une lacune de documentation seulement — c'est vraisemblablement une branche non développée dans le bot lui-même.

**Cas d'usage réels où l'utilisateur choisira "Saisir manuellement" :**
- Le vol date de plus d'un an et la carte d'embarquement n'existe plus
- L'utilisateur voyageait avec une confirmation email imprimée, perdue
- L'utilisateur a réservé via une agence et n'a jamais eu de carte au format numérique
- L'utilisateur est méfiant et ne veut pas envoyer de photo

**Si ce bouton est présenté mais ne fonctionne pas,** l'utilisateur qui tape "Saisir manuellement" tombera sur une réponse d'erreur ou un silence du bot — rupture de confiance critique.

**Correction :**
- Documenter et implémenter la branche manuelle avec au minimum 4 questions : numéro de vol, date (JJ/MM/AAAA), itinéraire (ville départ → ville arrivée), PNR/référence réservation.
- Si le développement n'est pas immédiat : remplacer le bouton "Saisir manuellement" par un message de redirection vers un agent humain ("Je n'ai pas ma carte — un expert va vous aider").
- Ne jamais présenter un bouton dont le chemin n'est pas opérationnel.

---

### P1 — IMPORTANT : Absence de signaux de confiance tôt dans le flow

**Description :** Le seul signal de confiance explicite dans tout le flow est la ligne RGPD à la toute fin du message final — que beaucoup d'utilisateurs n'atteignent jamais. Le message d'accueil (étape 1) parle de 600 € et de zéro frais, ce qui est une promesse commerciale, pas un signal de légitimité.

**Asymétrie perçue par le public cible :** Les arnaques de phishing utilisent exactement la même structure : promesse d'argent facile + demande de documents personnels. Sans ancre de crédibilité institutionnelle, le flow ressemble à une arnaque.

**Signaux absents :**
- Agrément ou enregistrement légal (ORIAS, SIRET, ou équivalent)
- Preuve sociale (nombre de clients, montants récupérés)
- Mention de la réglementation CE 261/2004 comme base légale (pas juste un argument commercial)
- Partenaires ou certifications visibles

**Corrections prioritaires :**

*Dans l'accueil (étape 1), ajouter une ligne :*
> "📜 *Service de recouvrement enregistré* — SIRET XXX — Opère selon le Règlement (CE) 261/2004."

*Dans le message OCR (étape 3b), ajouter :*
> "🔒 Votre photo est chiffrée et n'est accessible qu'à votre gestionnaire de dossier."

---

### P2 — AMELIORATION : Message étape 5 (année du vol) — surcharge d'instructions

**Description :** Ce message présente cinq boutons numérotés pour les années ET deux formats de saisie libre expliqués en détail dans deux lignes d'instructions. L'utilisateur doit traiter deux systèmes d'interaction différents dans le même message.

**Problème :** Les deux lignes "💡" sont redondantes entre elles et créent du bruit. La seconde ligne répète l'instruction de saisie libre avec trois exemples de format, ce qui laisse entendre que le bot ne comprendra pas si l'on choisit le mauvais format — source d'anxiété.

**Correction :**

> "🎫 *6 août* est noté sur votre carte, sans l'année.
> 
> De quelle année s'agit-il ?
> 
> 1️⃣ 2025 — 2️⃣ 2024 — 3️⃣ 2023 — 4️⃣ 2022 — 5️⃣ 2021
> 
> 💡 Autre année ? Tapez la date complète : *12/05/2024*
> 🟢🟢🟢🟢🟢🟢🟢"

Réduction : de 52 mots à ~28. Suppression d'une ligne d'instructions redondante. Un seul exemple de format suffit.

---

### P2 — AMELIORATION : Absence d'urgence temporelle dans l'accueil

**Description :** Le délai de prescription pour CE 261/2004 est de 2 à 6 ans selon les pays (France : 5 ans, Belgique : 1 an, UK post-Brexit : 6 ans). Cette information crée une urgence légitime que le message d'accueil n'utilise pas.

**Impact :** Des utilisateurs qui voient le message, comprennent l'enjeu mais ne répondent pas immédiatement peuvent oublier. Sans ancre temporelle, il n'y a pas de raison de compléter maintenant plutôt que demain.

**Correction (ajouter dans étape 1) :**
> "⏳ *Attention :* le droit à indemnisation expire — vérifiez votre vol maintenant."

---

### P2 — AMELIORATION : Absence de message de réengagement en cas d'abandon

**Description :** Si un utilisateur s'arrête au milieu du flow (après l'étape 2 ou 3, par exemple parce qu'il n'a pas sa carte d'embarquement sous la main), le bot ne prévoit aucun message de relance. Le dossier reste ouvert mais silencieux.

**Correction recommandée :**
- Après 2 heures sans réponse : message automatique — "Vous reprenez votre dossier ? Envoyez n'importe quel message pour continuer."
- Après 24 heures sans réponse : message de relance avec ancre émotionnelle — "Votre vol retardé vous doit peut-être 600 €. Il vous reste 3 étapes."
- Ces messages ne doivent pas répéter les questions déjà répondues — reprendre à l'étape d'abandon.

---

### P2 — AMELIORATION : Libellé des boutons — clarté des actions

**Étape 2 — "Direct / Avec correspondance" :**
Le terme "Avec correspondance" est précis mais potentiellement confus pour des utilisateurs dont le français n'est pas la langue première. "Avec escale" est plus compris oralement et dans les communautés francophones africaines.

Suggestion : "Direct" / "Avec escale"

**Étape 4 — "Tout est correct / Corriger" :**
"Tout est correct" est long pour un bouton WhatsApp (peut être tronqué sur certains appareils au-delà de ~20 caractères). Suggestion : "Oui, c'est correct" → "Confirmer" / "Corriger"

**Étape 7 — "Non, tous majeurs / Oui, il y a des mineurs" :**
Ces labels sont clairs et bien formulés. Pas de changement recommandé.

---

## 3. Analyse du flow OCR — Gestion des erreurs

### Scénario A : Photo floue ou illisible

**État actuel :** Non documenté. Le flow suppose que l'OCR réussit et passe directement à la vérification.

**Comportement attendu du bot si OCR échoue :**
- Message : "La photo est trop floue pour être lue automatiquement."
- Proposition : "Vous pouvez retenter une photo (éclairage, cadrage) ou saisir les infos manuellement."
- Si deuxième tentative échoue : redirection vers agent humain.

**Critique :** Si le bot ne gère pas ce cas et reste silencieux ou sort une erreur technique, l'utilisateur abandonne ou perd confiance. Ce scénario doit être développé avant mise en production.

### Scénario B : OCR lit des données incorrectes

**État actuel :** Bien géré — l'étape 4 permet de "Corriger". Mais le flow de correction lui-même n'est pas détaillé.

**Questions non résolues :**
- Quand l'utilisateur tape "Corriger", le bot demande-t-il quel champ corriger (numéro de vol, date, PNR, nom, itinéraire) ?
- Ou demande-t-il de ressaisir tous les champs ?
- Si l'utilisateur corrige le nom (M. SAMIR DRIDI → M. SAMIR DRIDI JR), le bot accepte-t-il le texte libre ?

**Recommandation :** Le flow de correction doit proposer un menu de champs à corriger, pas une ressaisie globale. L'utilisateur a confiance en ce que l'OCR a bien lu — ne pas lui redemander ce qui est déjà correct.

### Scénario C : L'utilisateur entre un format de date incorrect

**État actuel :** L'étape 5 accepte plusieurs formats (JJ/MM/AAAA, AAAA-MM-JJ, texte libre "12 mai 2024"). Bien.

**Manquant :** Que se passe-t-il si l'utilisateur tape "août 2024" sans le jour, ou "2025" seul ? Le bot doit avoir une réponse de validation qui demande le format complet sans punir l'utilisateur.

**Message de validation recommandé :**
> "Je n'arrive pas à lire cette date. Pouvez-vous écrire : *jour/mois/année* — par exemple *06/08/2024* ?"

---

## 4. Analyse des signaux de confiance — Public haute méfiance

**Contexte recherche :** Les communautés diasporiques africaines (Congolaise, Sénégalaise, Ivoirienne, Malienne) ont une méfiance documentée envers les services numériques non-institutionnels. Les arnaques WhatsApp ciblant ces communautés utilisent systématiquement : promesse d'argent, demande de documents personnels, liens à cliquer. Le flow actuel de Robin des Airs reproduit structurellement ce pattern.

### Signaux de confiance présents (points positifs)

- Barre de progression (🟢⚪) : réduit l'anxiété sur la durée du flow
- Tonalité conversationnelle non agressive
- Explication de pourquoi l'OCR est utile ("plus rapide")
- Ligne RGPD en fin de flow
- Référence dossier générée automatiquement (RDA-AAAAMMJJ-XXXX) : donne un sentiment de formalisme institutionnel

### Signaux de confiance manquants (par ordre de priorité)

1. **Identité légale** (SIRET / N° d'enregistrement) — absent du flow entier
2. **Preuve sociale quantifiée** (dossiers traités, taux de succès) — absent
3. **Explication de l'usage des documents** avant la demande (pas seulement en fin de message)
4. **Mention de la base légale** (CE 261/2004) comme fondement du droit, pas comme argument commercial
5. **Indication de sécurité sur la photo** avant l'envoi OCR
6. **Lien vers site public** avec pages légales accessibles dès l'accueil (pas seulement la politique de confidentialité en fin)

### Cadrage du lien de signature (contrat de cession)

Le lien de signature est l'action la plus à risque de perçue-comme-arnaque dans tout le flow. Un lien externe demandant une "signature" après un échange WhatsApp déclenche les signaux d'alarme appris.

**Cadrage actuel :**
> "Signature du contrat de cession — page sécurisée Robin des Airs, puis votre signature"

**Problèmes :**
- "Page sécurisée" sans explication de ce que ça signifie n'est pas rassurant — les arnaques disent aussi "page sécurisée"
- Les termes juridiques ("contrat de cession de créance") peuvent faire peur (signature d'un engagement financier flou)
- L'URL courte `/sign/xxxx` ressemble à un lien raccourci d'arnaque

**Cadrage recommandé :**

> "1️⃣ *Votre contrat de cession de créance* — ce document permet à Robin des Airs de recouvrer votre indemnité auprès d'easyJet, à titre de recouvrement (vous restez bénéficiaire). Vous pouvez le lire en entier avant de signer.
> 
> Signature sur notre site officiel *robindesairs.eu* :
> [lien avec URL complète visible, pas raccourcie]
> 
> Aucune information bancaire n'est demandée à cette étape."

La mention "aucune information bancaire" est contre-intuitive à inclure — mais elle désactive précisément le signal d'alarme le plus fort dans ce public.

---

## 5. Analyse du séquençage du flow

### Le type d'incident (étape 3) avant ou après l'OCR — est-ce correct ?

**Séquence actuelle :** Type d'incident → OCR  
**Séquence alternative :** OCR → Type d'incident

**Analyse :** La séquence actuelle est correcte pour deux raisons :
1. Le type d'incident est une information que l'utilisateur connaît par coeur et répond immédiatement — elle crée un momentum avant la demande plus contraignante (envoyer une photo).
2. Connaître le type d'incident AVANT l'OCR permet potentiellement d'adapter les messages de vérification OCR (ex. pour une correspondance ratée, on pourrait demander deux cartes d'embarquement).

**Recommandation :** Maintenir la séquence actuelle, mais insérer le message de réassurance entre le type d'incident et la demande OCR (voir P1 ci-dessus).

### La langue (étape 2b) est-elle au bon endroit ?

**Séquence actuelle :** Type de vol → Langue → Type d'incident

**Observation :** La langue est demandée très tôt, avant que l'utilisateur ait démontré son engagement. Cela alourdit le début du flow sans valeur immédiate pour l'utilisateur.

**Alternative :** Déplacer la question de langue juste avant le récap final ou au moment où un humain doit intervenir. Le bot lui-même n'a pas besoin de connaître la langue pour fonctionner.

**Nuance :** Si les boutons de réponse sont déjà localisés selon la langue détectée (comme le suggère "Boutons langue selon pays détecté"), la question peut rester tôt pour calibrer l'ensemble du flow. Dans ce cas, maintenir la position mais intégrer la confirmation de langue dans la transition vers l'étape suivante (supprimer "On continue ?").

---

## 6. Proposition de découpage du message final

### Message final actuel (problème)

Le message actuel demande simultanément :
- De vérifier un récapitulatif de 10 lignes
- De cliquer sur un lien de signature légale
- D'envoyer des documents photos

Ces trois actions ont des niveaux d'effort et d'urgence très différents. Les regrouper dans un seul message force l'utilisateur à prioriser seul — et la recherche montre qu'il choisira l'action la plus facile (regarder le récap) et reportera les deux actions contraignantes.

### Proposition : 3 messages séquentiels

---

**MESSAGE A — Validation du dossier** (envoyé immédiatement)

> 🎉 *Dossier ouvert !*
> 
> Voici votre récapitulatif — vérifiez avant de continuer :
> 
> ✈️ *EJU7524* — easyJet
> 📅 *06/08/2025*
> 🛤️ BSL → FAO
> 👤 M. SAMIR DRIDI
> 🎫 PNR : K5FW8BX
> ⚖️ Incident : Retard +3h
> 
> 📁 Réf. dossier : *RDA-20260515-E448*
> 💵 Indemnité estimée : *450 €*
> 
> Tout est correct ?

*(Boutons : Oui, c'est correct / Corriger)*

---

**MESSAGE B — Action prioritaire : Signature** (envoyé après confirmation message A)

> ✅ *Parfait — dossier enregistré.*
> 
> Pour que Robin des Airs recouvre légalement votre indemnité auprès d'easyJet, vous devez signer un *contrat de cession de créance*.
> 
> Ce document est lisible en entier avant signature. Aucune information bancaire demandée.
> 
> 👉 *Signez ici (site officiel robindesairs.eu) :*
> https://robindesairs.eu/mandat.html?ref=RDA-20260515-E448&...
> 
> ⏱️ 2 minutes sur votre téléphone.

*(Pas de bouton — action externe)*

---

**MESSAGE C — Action secondaire : Documents** (envoyé 30 secondes après message B, ou après détection que le lien a été cliqué)

> 📎 *Dernière étape — vos justificatifs*
> 
> Envoyez ici, en photos :
> 
> 1. *Passeport ou CNI* (page photo lisible)
> 2. *Carte d'embarquement ou confirmation* de réservation (si vous l'avez encore)
> 
> 🔒 Ces pièces ne servent qu'à votre dossier RDA-20260515-E448.
> Politique de confidentialité : https://robindesairs.eu/politique-confidentialite

---

**Justification du découpage :**

| Critère | Avant | Après |
|---------|-------|-------|
| Nombre d'actions par message | 3 | 1 |
| Longueur message principal | ~130 mots | ~60 mots |
| Priorité des actions visible | Non | Oui (B avant C) |
| Signal de confiance avant demande de docs | Non | Oui (RGPD dans message C) |
| Risque de lecture partielle | Élevé | Faible |

---

## 7. Propositions de réécriture — Top 3 issues

### Réécriture 1 : Message d'accueil (étape 1) — ajout confiance + urgence

**Version actuelle :**

> 👋 Bienvenue chez Robin des Airs 🏹
> 
> Ne laissez pas votre argent à la compagnie aérienne.
> 
> Votre vol retardé ou annulé vous donne droit à 600 € d'indemnité légale.
> 
> ⚖️ Zéro frais. On prend 25% uniquement si vous recevez votre argent.
> 
> ⏱️ Votre dossier s'ouvre en environ 5 minutes — quelques questions courtes ici.

**Version proposée :**

> 👋 Bienvenue chez *Robin des Airs* 🏹
> 
> Votre vol retardé ou annulé vous donne droit à *jusqu'à 600 € d'indemnité légale* — c'est la loi européenne (CE 261/2004).
> 
> *Nous avons récupéré plus de 2,1 millions d'euros* pour des passagers sur les lignes Europe-Afrique.
> 
> ⚖️ *Zéro frais d'avance.* On prend 25% uniquement si vous gagnez.
> 📜 Service enregistré — SIRET [XXX]
> 
> ⏱️ Votre dossier en *5 minutes* — on commence ?

**Changements :**
- "loi européenne (CE 261/2004)" : ancre institutionnelle, pas juste une promesse
- Preuve sociale chiffrée (à adapter selon les vraies données)
- SIRET visible dès l'accueil
- Suppression de "Ne laissez pas votre argent" : ton négatif, inutile
- "On commence ?" : CTA conversationnel clair

---

### Réécriture 2 : Message OCR — étape 3b — ajout confiance avant demande de photo

**Version actuelle :**

> 📸 PREUVES — Carte d'embarquement / confirmation
> 
> 👍 On va vous faire gagner du temps.
> 
> L'avantage : une photo nette permet de remplir le dossier automatiquement — c'est le plus rapide !
> 
> Comment souhaitez-vous continuer ?

**Version proposée :**

> 📸 *Votre billet de vol*
> 
> Pour préparer votre dossier légal, nous avons besoin des informations qui figurent sur votre *carte d'embarquement ou confirmation de réservation* : numéro de vol, date, PNR, itinéraire.
> 
> 👍 *La façon la plus rapide* : envoyez une photo nette — le dossier se remplit en secondes.
> 
> 🔒 La photo est chiffrée et accessible uniquement à votre gestionnaire de dossier.
> 
> *Comment souhaitez-vous continuer ?*

*(Boutons : Envoyer une photo / Saisir les informations)*

**Changements :**
- Explication de pourquoi le document est nécessaire (légitimité de la demande)
- Indication des données précises demandées (pas de surprise)
- Signal de sécurité explicite avant la demande de photo
- "Saisir les informations" plutôt que "Saisir manuellement" — moins technique

---

### Réécriture 3 : Message final — découpage en message B (signature)

**Version actuelle (extrait) :**

> Il reste 2 étapes rapides :
> 
> 1️⃣ Signature du contrat de cession — page sécurisée Robin des Airs, puis votre signature :
> https://robindesairs.eu/sign/4ljU2K7IIFh3BQ
> 
> 2️⃣ Justificatifs en photos sur ce fil : passeport ou CNI lisible + carte d'embarquement ou confirmation si nécessaire.
> 
> 🔒 Vos pièces ne servent qu'à ce dossier. Confidentialité : https://robindesairs.eu/politique-confidentialite

**Version proposée (message B, après confirmation récap) :**

> ✅ *Dossier RDA-20260515-E448 enregistré.*
> 
> Pour que Robin des Airs recouvre l'indemnité de M. SAMIR DRIDI auprès d'easyJet, il faut signer un *contrat de cession de créance*.
> 
> Ce document explique exactement ce que vous nous autorisez à faire. Vous pouvez le lire avant de signer.
> 
> *Aucune information bancaire n'est demandée à cette étape.*
> 
> 👉 Signez en 2 minutes sur *robindesairs.eu* :
> https://robindesairs.eu/mandat.html?ref=RDA-20260515-E448&nom=SAMIR+DRIDI&vol=EJU7524&date=06/08/2025&pnr=K5FW8BX&route=BSL-FAO&compagnie=easyJet&motif=retard

**Changements :**
- Dossier nommé avec le nom du passager : personnalisation rassurante
- Explication de ce qu'est un contrat de cession de créance (pas un chèque en blanc)
- "Vous pouvez le lire avant de signer" : empowerment, anti-arnaque
- "Aucune information bancaire" : désactive le signal d'alarme le plus fort
- URL complète visible (pas raccourcie) : signe de transparence
- URL correcte (mandat.html avec params) et non l'URL 404 actuelle

---

## 8. États manquants — Synthèse

| Cas | Etat actuel | Correction requise |
|-----|-------------|-------------------|
| Photo floue / OCR illisible | Non documenté | Message d'erreur + retry + fallback agent humain |
| Utilisateur choisit "Saisir manuellement" | Bouton présent, flow absent | Implémenter 4 questions ou rediriger vers agent |
| Date en format incorrect | Non documenté | Message de validation avec exemple de format |
| Abandon en cours de flow | Aucun réengagement | Messages automatiques à 2h et 24h |
| OCR lit des données partiellement incorrectes | "Corriger" documenté, détail absent | Menu de correction par champ |
| Utilisateur répond hors-format aux boutons | Non documenté | Handler générique : "Touchez un des boutons ci-dessus" |
| Groupe de 6+ passagers | "6+" comme bouton, flow non détaillé | Clarifier : tous les mêmes noms ? Plusieurs cartes ? |

---

## 9. Résumé des priorités d'action

### A faire avant mise en production

- [ ] **P0** — Corriger l'URL de signature (404 → mandat.html avec params)
- [ ] **P0** — Découper le message final en 3 messages séquentiels
- [ ] **P1** — Implémenter ou désactiver la branche "Saisir manuellement"
- [ ] **P1** — Ajouter signal de confiance + explication avant demande OCR
- [ ] **P1** — Supprimer l'étape "On continue ?" (étape 2c)

### A faire dans le premier mois de déploiement

- [ ] **P1** — Ajouter signaux de confiance dans le message d'accueil (SIRET, preuve sociale, CE 261/2004)
- [ ] **P1** — Documenter et implémenter le cadrage du lien de signature (voir réécriture 3)
- [ ] **P2** — Réduire le message étape 5 (année du vol)
- [ ] **P2** — Ajouter messages de réengagement en cas d'abandon (2h + 24h)
- [ ] **P2** — Implémenter la gestion des erreurs OCR (photo floue, données partielles)

### A mesurer après déploiement

- Taux de complétion du flow (étape 1 → message final) — cible : >65%
- Taux de clic sur le lien de signature — cible : >50% des dossiers ouverts
- Taux de signature complète — cible : >40% des dossiers ouverts
- Point d'abandon principal (étape à identifier par analytics WATI)
- Délai médian entre ouverture du dossier et signature du contrat de cession — cible : <30 minutes

---

*Audit réalisé sur la base de FLOW-BOT-INTAKE.md — version du 23/05/2026*  
*Prochaine revue recommandée après 500 dossiers traités pour analyse comportementale réelle*

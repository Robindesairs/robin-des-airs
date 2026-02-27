# Protocole de Siège — Robin des Airs

Modèles d’emails (compagnie) et de messages (client) pour le suivi des dossiers d’indemnisation Règlement (CE) 261/2004.

---

## Convention d’objet / classement (Make & boîtes mail)

**À utiliser pour chaque mail envoyé à la compagnie et pour classer les dossiers :**

```
Indemnisation EU261 — [PNR] — [NOM] [Prénom] — Vol [N° de Vol]
```

- **[PNR]** : code réservation (6 caractères)
- **[NOM] [Prénom]** : nom et prénom du passager
- **[N° de Vol]** : numéro de vol (ex. AF718)

Cela permet de garder le même sujet sur toute la chaîne de relances et de retrouver tous les échanges par dossier.

---

## Arborescence

| Dossier / Fichier | Usage |
|-------------------|--------|
| **partie-1-compagnie/** | Emails envoyés à la compagnie aérienne |
| → jour-00-salve-initiale.md | JOUR 0 — Ouverture du dossier |
| → jour-10-relance-1.md | JOUR 10 — Rappel pro |
| → jour-20-relance-2.md | JOUR 20 — Pression économique (MTV) |
| → jour-30-mise-en-demeure.md | JOUR 30 — Mise en demeure (DGAC, ART, MTV) |
| → jour-60-transfert-justice.md | JOUR 60 — Transfert contentieux / assignation |
| **partie-2-client/** | Messages passager (WhatsApp / Mail) |
| → message-1-envoi-mandat.md | Envoi du mandat (lien Yousign) |
| → message-2-confirmation-signature-proxy.md | Confirmation signature + proxy email |
| → message-3-victoire-virement.md | Victoire + demande RIB pour virement |
| **ghost-ceo-avis.md** | Règles Make : sujet identique, stop si "Accord" / "Indemnité" |

---

## Jours de relance (compagnie)

| Jour | Fichier | Objet type |
|------|---------|------------|
| 0 | jour-00-salve-initiale.md | Demande d’indemnisation — Règlement (CE) 261/2004 — Vol… |
| 10 | jour-10-relance-1.md | RAPPEL : Indemnisation — Vol… |
| 20 | jour-20-relance-2.md | DEUXIÈME RELANCE : Risque de contentieux aggravé… |
| 30 | jour-30-mise-en-demeure.md | MISE EN DEMEURE — Signalement autorités… |
| 60 | jour-60-transfert-justice.md | NOTIFICATION : Transfert contentieux… |

Voir **ghost-ceo-avis.md** pour la convention de sujet unique et le stop automatique en cas d’accord.

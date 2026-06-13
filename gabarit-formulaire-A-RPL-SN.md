# Formulaire A — Procédure européenne de règlement des petits litiges (Règl. CE 861/2007)
## Gabarit pré-rempli — dossier-type Brussels Airlines (SN)

> Formulaire officiel à remplir en ligne : **portail e-Justice européen → Petits litiges → Formulaire A**
> https://e-justice.europa.eu/content_small_claims-354-fr.do
> Langue de dépôt : **français** (juridiction de Bruxelles, rôle francophone).
> Champs entre `{{ }}` = à personnaliser par dossier.

---

### Section 1 — Juridiction saisie
- **Juridiction compétente** : Justice de paix / Tribunal de l'entreprise francophone de **Bruxelles**
  *(fondement : lieu d'arrivée du vol = Bruxelles — CJUE Rehder C-204/08 + art. 7 §1 b) Règl. Bruxelles I bis 1215/2012).*
- **Caractère transfrontalier** : ✅ demandeur domicilié en France, défendeur en Belgique.

### Section 2 — Demandeur (vous)
| Champ | Valeur |
|---|---|
| Nom / dénomination | **Robin des Airs** (SASU en cours d'immatriculation au RCS de Paris) |
| Qualité | **Cessionnaire des créances** des passagers (cession de créance, art. 1321 C. civ.) |
| Adresse | 66 avenue des Champs-Élysées, 75008 Paris, France |
| Courriel / téléphone | expert@robindesairs.eu / `{{TEL}}` |
| Représentant | `{{SIGNATAIRE}}`, agissant pour le compte de la SASU en formation |

### Section 3 — Défendeur
| Champ | Valeur |
|---|---|
| Dénomination | **Brussels Airlines SA/NV** |
| Adresse | Airport Building 26, Brussels Airport, 1930 Zaventem, Belgique |
| Numéro d'entreprise (BCE) | `{{N_BCE_SN}}` *(à vérifier sur le registre belge KBO/BCE)* |

### Section 4 — Compétence : pourquoi cette juridiction
> Cocher « lieu d'exécution de l'obligation » et préciser :
« Le vol `{{VOL}}` avait pour aéroport d'arrivée Bruxelles (BRU). Conformément à la jurisprudence Rehder (CJUE, C-204/08), la juridiction du lieu d'arrivée est compétente pour connaître de la demande d'indemnisation fondée sur le Règlement (CE) n° 261/2004. »

### Section 5 — Caractère transfrontalier
> « Le demandeur est domicilié en France ; la juridiction saisie est belge (art. 3 du Règl. 861/2007). »

### Section 6 — Coordonnées bancaires (paiement de la condamnation)
- IBAN : `{{IBAN}}` — Bénéficiaire : Robin des Airs — Réf. : `{{REF}}`

### Section 7 — La demande (le cœur)
**Montant principal réclamé : `{{MONTANT_TOTAL}}` €** (hors intérêts et frais)

| Passager | Montant |
|---|---|
| `{{PAX1}}` | 600 € |
| `{{PAX2}}` | 600 € |
| `{{PAX3}}` | 600 € |
| **Total** | **`{{MONTANT_TOTAL}}` €** |

- **Intérêts** : intérêts moratoires à compter de la mise en demeure du `{{DATE_MED}}` (art. 1344-1 C. civ.).
- **Frais** : remboursement des frais de greffe.

### Section 8 — Exposé des faits et fondement
> Texte à coller (champ « description de la demande ») :

« Les passagers `{{PAX1}}`, `{{PAX2}}` et `{{PAX3}}` ont voyagé sur le vol **`{{VOL}}`** de Brussels Airlines, Dakar (DSS) → Bruxelles (BRU), le **`{{DATE_VOL}}`** (réservation `{{PNR}}`). Le vol est arrivé à destination avec un retard de **`{{RETARD}}`** par rapport à l'horaire prévu.

La distance entre les deux aéroports étant supérieure à 3 500 km, et le retard à l'arrivée supérieur à trois heures, chaque passager a droit à une indemnisation de **600 €** au titre des articles 5, 6 et 7 du Règlement (CE) n° 261/2004 (interprétation : CJUE *Sturgeon* C-402/07 ; *Nelson* C-581/10).

Robin des Airs vient aux droits des passagers en qualité de cessionnaire (cession de créance notifiée au transporteur le `{{DATE_MED}}`, art. 1324 C. civ.). Le transporteur, mis en demeure le `{{DATE_MED}}`, n'a pas réglé la somme due dans le délai imparti. »

### Section 9 — Pièces justificatives (à téléverser)
1. **Acte(s) de cession de créance** signé(s) par chaque passager (+ certificat eIDAS / piste de preuve).
2. **Confirmation de réservation / e-billets** (les 3 passagers).
3. **Preuve du retard** : capture de suivi de vol / attestation / communication de la compagnie.
4. **Pièces d'identité** des passagers.
5. **Copie de la mise en demeure** + preuve d'envoi (AR / accusé courriel).

### Section 10 — Audience
> Cocher : **« Je ne demande pas d'audience »** → procédure 100 % écrite (plus rapide).

---

## Données du dossier-type (exemple factice fourni)
```
REF           = RBN-SN-0001
VOL           = SN 204
DATE_VOL      = 15/03/2024
PNR           = RBN3PX
RETARD        = 4 h 10
H_PREVUE      = 19 h 35   |  H_REELLE = 23 h 45
PAX1          = Aminata Diallo
PAX2          = Ousmane Diallo
PAX3          = Fatou Diallo (enfant — signature parentale)
MONTANT_TOTAL = 1 800
DATE_MED      = (date d'envoi de la mise en demeure)
```

## ⚠️ À vérifier avant tout dépôt réel
- [ ] **Immatriculation SASU finalisée** (ou mention « en formation » + reprise des actes) — sinon qualité à agir contestable.
- [ ] **Numéro BCE de Brussels Airlines** (registre belge KBO).
- [ ] **Frais de greffe** du tribunal de Bruxelles (montant + mode de paiement depuis la France).
- [ ] **Preuve du retard** solide (≥ 3 h) — c'est le point le plus souvent contesté.
- [ ] Regrouper **tous les passagers d'un même vol dans UNE seule demande** (rentabilité).

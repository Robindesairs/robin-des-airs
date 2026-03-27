# RGPD — Registre des traitements (opérationnel)

> Document de pilotage interne. A compléter avec votre conseil juridique/DPO si nécessaire.

## Responsable du traitement

- Entité: `Robin des Airs`
- Contact: `________________`
- Email RGPD: `________________`

## Traitement 1 — Prospection WhatsApp / CRM

- Finalité: qualification et suivi des prospects.
- Base légale: intérêt légitime (prospection B2C) / consentement selon canal.
- Catégories de données: téléphone, wa_id, source, événements clic/message.
- Source: site web + webhook WhatsApp.
- Destinataires: équipe interne, outils CRM, Make.
- Durée conservation: `_____` (ex: 24 mois après dernier contact).
- Mesures sécurité: accès restreint, HTTPS, journalisation, sauvegardes.

## Traitement 2 — Gestion dossiers clients CE 261

- Finalité: traitement réclamation, représentation et suivi.
- Base légale: exécution contractuelle (mandat + CGV).
- Données: identité, contact, vol, justificatifs, mandat signé.
- Destinataires: équipe interne, compagnies aériennes, sous-traitants autorisés.
- Durée conservation: `_____` (ex: durée contractuelle + obligations légales).
- Mesures sécurité: accès limité, stockage sécurisé, contrôle exports.

## Traitement 3 — Facturation / comptabilité

- Finalité: obligations comptables et fiscales.
- Base légale: obligation légale.
- Données: identité client, montants, virements, justificatifs.
- Durée conservation: `_____` (ex: 10 ans selon pièces comptables).

## Transferts hors UE

- Oui/Non: `_____`
- Si oui: sous-traitants concernés + garanties (SCC, etc.): `_____`

## Droits des personnes

- Droit d'accès, rectification, effacement, opposition, limitation, portabilité.
- Process interne de réponse:
  - Canal de réception: `_____`
  - Délai cible: `< 30 jours`
  - Responsable: `_____`

## Registre des sous-traitants

| Sous-traitant | Rôle | Données traitées | Localisation | DPA en place |
|--------------|------|------------------|--------------|--------------|
| Netlify | Hébergement/fonctions | logs, métadonnées |  |  |
| Make | Automatisation | événements CRM |  |  |
| WhatsApp/Meta/360dialog | messagerie | téléphone, messages |  |  |
| Autres |  |  |  |  |

## Politique de conservation (résumé)

- Prospects inactifs: `_____`
- Dossiers clos: `_____`
- Logs techniques: `_____`

## Procédure incident / violation de données

1. Identifier et contenir l'incident.
2. Évaluer impact (données concernées, volume, risque).
3. Notifier en interne immédiatement.
4. Si nécessaire, notification CNIL sous 72h.
5. Informer les personnes concernées si risque élevé.
6. Documenter et corriger (post-mortem).

## Check-list trimestrielle

- [ ] Registre à jour.
- [ ] Sous-traitants et DPA revus.
- [ ] Durées de conservation appliquées.
- [ ] Contrôles d'accès vérifiés.
- [ ] Tests sauvegarde/restauration effectués.


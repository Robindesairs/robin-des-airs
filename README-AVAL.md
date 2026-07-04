# Pipeline aval — SCAFFOLD (code + tests, non déployé)

Squelette du **pipeline aval** (post-signature → paiement) de Robin des Airs.
Objectif : disposer d'une mécanique isolée, déterministe et **inerte** pour préparer
réclamation → envoi → relances → escalade → suivi de paiement, **sans toucher la prod**.

> ⚠️ SCAFFOLD. Aucune de ces fonctions n'est branchée sur la prod ni déployée.
> Rien n'est envoyé, aucun statut n'est changé, aucun PDF réel n'est produit,
> aucune écriture Airtable/Blobs. Les fonctions prod existantes
> (`generate-claim.js`, `legal-daily.js`, `lib/legal-pipeline.js`) ne sont **pas modifiées**.

## Fichiers

| Fichier | Rôle | Effet de bord |
|---|---|---|
| `netlify/functions/lib/aval-pipeline.js` | Logique pure (normalisation, commission, répartition, cadence relances, escalade). Réutilise les helpers purs de `legal-pipeline` avec repli local. | Aucun |
| `netlify/functions/aval-generate-claim.js` | Étape 1 — construit le **plan** de réclamation (MED). | Aucun (dry-run) |
| `netlify/functions/aval-send-claim.js` | Étape 2 — **stub** d'envoi. N'ENVOIE RIEN. Double garde-fou `AVAL_SEND_ENABLED=1` + `confirm:true`, et reste inerte même levé. | Aucun |
| `netlify/functions/aval-relances.js` | Étape 3 — file des relances dues (J+15 rappel, J+30 ferme). | Aucun (dry-run) |
| `netlify/functions/aval-escalade.js` | Étape 4 — dossiers mûrs pour le **Tribunal de commerce** (J+62). | Aucun (dry-run) |
| `netlify/functions/aval-suivi-paiement.js` | Étape 5 — répartition d'un encaissement + échéance de versement client. | Aucun (dry-run) |
| `tests/aval-pipeline.test.js` | Tests unitaires (vitest). | — |

## Règles métier encodées (source de vérité)

- **Commission** : 25 % en phase **amiable** (client garde 75 %), 40 % en phase
  **contentieuse**/tribunal (client garde 60 %). Frais de procédure avancés par Robin.
  La bascule contentieuse (escalade) fait passer 25 % → 40 %.
- **Versement au client** : **5 jours ouvrés** après encaissement (jamais 48h),
  sur **compte dédié fonds clients** (insaisissable).
- **Cadence relances** : J+15 (rappel) puis J+30 (ferme), alignée sur
  `legal-pipeline` / `dossier-state`. Escalade au-delà de J+62.
- **Terminologie** : « cession » côté opérateur (les URLs techniques restent `/mandat`,
  hors périmètre de ce scaffold).
- **Wording légal (loi 71-1130)** : éligibilité **au conditionnel** (« peut donner
  droit… selon éligibilité »), **aucun nom d'avocat**, **aucune garantie** de résultat
  ni de délai d'indemnisation.

## Flux

```
signature (cession)
  → aval-generate-claim   (plan MED)
  → aval-send-claim        (STUB — n'envoie rien)
  → aval-relances          (J+15, J+30)
  → aval-escalade          (Tribunal de commerce, J+62, 40%)
  → aval-suivi-paiement    (répartition + versement client J+5 ouvrés)
```

Chaque étape est **human-in-the-loop** : le scaffold calcule et propose ; un humain valide.

## Auth

Toutes les fonctions exigent un secret interne (`verifyInternalSecret` — mêmes secrets
que le reste des fonctions internes). En dev sans secret configuré, bypass local.

## Entrées de test (inline)

Pour tester en isolation sans Airtable, les fonctions acceptent les dossiers **inline**
dans le body (`dossier` pour generate/send ; `dossiers[]` pour relances/escalade).
En prod, cette liste viendrait d'Airtable — non branché ici.

Exemple (dry-run local, aucun effet) :

```bash
curl -X POST /.netlify/functions/aval-suivi-paiement \
  -H 'content-type: application/json' \
  -d '{"secret":"…","ref":"RDA1234","montant":600,"phase":"amiable","encaisseLe":"2026-07-02"}'
# → partClient 450, partRobin 150, versementClientAuPlusTard 2026-07-09
```

## Variables d'env (toutes optionnelles, défauts sûrs)

| Var | Défaut | Effet |
|---|---|---|
| `AVAL_RELANCE1_DAYS` | 15 | jour de la 1re relance après MED |
| `AVAL_RELANCE2_DAYS` | 30 | jour de la relance ferme |
| `AVAL_ESCALADE_DAYS` | 62 | seuil d'escalade contentieuse |
| `AVAL_SEND_ENABLED` | (absent) | garde-fou d'envoi — sans effet réel dans le scaffold |

## Tests

```bash
npx vitest run tests/aval-pipeline.test.js
```

## Reste à faire (hors scaffold, pour la prod)

- Brancher la source Airtable réelle (fetch dossiers engagés) sur relances/escalade.
- Implémenter le canal d'envoi réel (LRAR/email) dans une fonction prod dédiée.
- Persistance des relances effectuées (idempotence) via Blobs, comme `robin-legal`.
- Réconcilier avec `lib/legal-pipeline.js` (fusion éventuelle) plutôt que doublon.
- Prescription par juridiction (BE = 1 an) avant toute escalade.

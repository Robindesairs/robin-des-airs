# Bot — résolution auto de la route depuis le n° de vol (AeroDataBox)

**But :** supprimer la saisie manuelle du trajet. Le client tape son **n° de vol** → le bot propose la **route** → le client **confirme d'un tap**. Moins de friction, moins de fautes de frappe.

**Périmètre :** `railway/server.js` — étape `m_vol` + remplace l'étape « Indiquez le trajet : départ → arrivée » (≈ `server.js:743`). Canal : bot WhatsApp.

## Pièces déjà présentes (rien à installer)
- **OpenAI** : `OPENAI_API_KEY` (gpt-4o vision pour les photos, gpt-4o-mini FAQ).
- **AeroDataBox** : `RAPIDAPI_KEY` / `AERODATABOX_RAPIDAPI_HOST` (cf. `scripts/test-rapidapi-*.mjs`).
- **Cache** : Netlify Blobs (déjà utilisé pour le radar).

## Flux
1. **`m_vol`** : le client envoie le n° de vol (ex. `AF718`).
   - Si texte brouillon (« le vol Air France de mardi »), gpt-4o-mini en **parse-only** → extraire le code vol. Sinon simple regex.
2. **`resolveRoute(vol[, date])`** :
   1. **Cache Blobs** (clé `vol` (+`date`)) → hit = réponse immédiate, gratuite.
   2. **AeroDataBox** (flight endpoint) → `{ compagnie, dep(IATA/ville), arr(IATA/ville), escale? }`.
   3. Écrire le résultat au cache (construit une base propriétaire au fil du temps).
3. **Affichage (boutons WhatsApp, 3 max) :**
   - **Route directe** → `[✅ Dakar → Paris] [✏️ Corriger]`
   - **Escale / ambigu** (≤ 2 vols, donc boutons OK) → `[Dakar → Paris (direct)] [Dakar → Abidjan → Paris] [✏️ Autre]`
4. **Tap** → remplit `s.route` (+ segments pour le calcul distance/éligibilité), puis enchaîne le flux existant (pax, etc.). Réutiliser le bloc de confirmation déjà présent (`server.js` ~660 / ~962).

## Fallback
AeroDataBox vide/erreur (vol obscur, vol trop ancien hors fenêtre historique) → **saisie manuelle actuelle** (comportement `server.js:743` conservé).

## Garde-fous (importants)
- **LLM = parsing du message uniquement.** JAMAIS les faits (route / horaires / retard) — risque d'hallucination → éligibilité fausse → risque juridique. Les **faits** viennent de AeroDataBox / cache.
- **Route stable** → la **date n'est pas requise pour la route** (un AF718 fait toujours le même trajet). La date n'est nécessaire que pour le **retard** (hors périmètre ici).
- **Profondeur historique** AeroDataBox selon l'abonnement (à vérifier) : sans impact sur la route (stable), impacterait seulement le retard.

## Hors périmètre (bonus futur, non demandé)
- Calcul auto du **retard** + annonce d'éligibilité (« arrivé +4h12 → éligible »). Possible plus tard via AeroDataBox, avec le même garde-fou (faits ≠ LLM).

## Implémentation
- Nouveau helper `resolveRoute(vol)` (cache → AeroDataBox → null).
- Modifier l'étape `m_vol` : après réception du vol, appeler `resolveRoute`, afficher boutons route, brancher sur la confirmation existante.
- Supprimer/contourner la question trajet manuelle (`server.js:743`) → devient le fallback.

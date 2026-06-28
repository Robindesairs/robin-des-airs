# Google Ads — Demand Gen « rayon-aéroport » (diaspora Afrique↔Europe)

> Package d'activation. Test sur **5 aéroports** d'abord, pas les 27. Prérequis : funnel WhatsApp OK (vérifié 26/06) + conversions posées (voir §6).

## 0. Rappel des deux garde-fous (sinon on rebrûle du budget)
1. **Éligibilité CE261** : au rayon d'un aéroport africain, sont indemnisables → **Europe→Afrique (toute compagnie)** + **Afrique→Europe sur compagnie UE (Air France, Brussels)**. ❌ PAS Air Sénégal / Asky / Ethiopian / Kenya Airways. → la créa doit faire s'auto-sélectionner (citer Air France/Brussels).
2. **Demand Gen = haut de funnel** (YouTube/Discover/Gmail). Notoriété, pas intention directe. On mesure une conversion **soft** (clic WhatsApp) pour optimiser ; le vrai ROI = mandats signés, sous-attribués (parcours via WhatsApp hors-site).

## 1. Aéroports de test (5) — géociblage présence stricte
Réutilisés du référentiel Meta. **Option de localisation = « Présence : personnes se trouvant régulièrement dans la zone »** (PAS « présence ou intérêt »).

| Ville | Lat | Lng | Rayon |
|---|---|---|---|
| Dakar (DSS) | 14.67 | -17.0731 | 3 km |
| Abidjan (ABJ) | 5.2614 | -3.9263 | 2 km |
| Bamako (BKO) | 12.5335 | -7.9499 | 3 km |
| Douala (DLA) | 4.0058 | 9.7194 | 2 km |
| Cotonou (COO) | 6.3572 | 2.3843 | 2 km |

(Tous desservis par Air France et/ou Brussels → trafic indemnisable réel.)

## 2. Structure
- **1 campagne** Demand Gen, les 5 proximités ci-dessus (rayons mixtes OK dans une même campagne).
- **Groupes d'annonces** par bloc, pas par aéroport (géo = niveau campagne) :
  - GA-Ouest-FR (Dakar, Abidjan, Bamako, Cotonou)
  - GA-Centre-FR (Douala)
- Langue : Français (+ Anglais en option pour zones anglophones plus tard).

## 3. Audiences (signaux)
- **Segment personnalisé** : a cherché « indemnité vol », « vol retardé », « Air France remboursement », noms de compagnies UE.
- **In-market** : « Voyages en avion ».
- **Liste 1ère partie** : import des leads WhatsApp (si exportable) → audience similaire.
- ⚠️ Combiné au rayon serré, Google peut afficher « audience limitée » → si sous-diffusion, élargir le rayon ou viser la ville.

## 4. Créa — RÈGLE NICHE NON NÉGOCIABLE
**Familles africaines noires réelles** (générique / avion / famille blanche = hors-niche, déjà reproché). Formats Demand Gen :
- Images : **1.91:1** (1200×628), **1:1** (1200×1200), **4:5** (960×1200).
- **1 vidéo verticale** 9:16 (Shorts), 10–20 s.
- Logo carré + logo paysage.

### Titres (≤ 40 car., en fournir 5)
- Vol Afrique–Europe retardé ?
- Jusqu'à 600 € d'indemnité
- Air France en retard ? Vos droits
- 0 € d'avance, payé si on gagne
- On récupère votre indemnité

### Descriptions (≤ 90 car., en fournir 5)
- Vol retardé/annulé entre l'Afrique et l'Europe ? Jusqu'à 600 €. Robin s'occupe de tout.
- Payé seulement si vous êtes indemnisé. Sans avance, sans paperasse.
- Air France, Brussels… récupérez ce qu'on vous doit, en 2 minutes sur WhatsApp.
- Retard, annulation, surbooking : vous avez peut-être droit à une indemnité.
- Diaspora : faites valoir vos droits sur vos vols vers/depuis l'Europe.

- **Nom de l'entreprise** : Robin des Airs
- **CTA** : « En savoir plus » / « Obtenir mon estimation »
- **URL finale** : page d'atterrissage qui pousse vers WhatsApp (PAS wa.me direct comme final URL — on veut la page pour poser la conversion + le gclid).

## 5. Enchères & budget
- **Budget test** : 10–15 €/jour (~150–300 €/mois) pour sortir de l'apprentissage. En-dessous, Demand Gen ne diffuse quasi pas.
- **Enchères** : démarrer **« Maximiser les clics » plafonné** (CPC max ~0,15–0,30 €) pour amorcer, puis **« Maximiser les conversions »** dès ~15–30 conv./mois.
- **Durée test** : 3–4 semaines mini avant de juger.

## 6. Conversions (à poser AVANT de lancer)
- ✅ **« Mandat signé »** : déjà en place (tag `AW-18269983535`, label `…/jWR7CKuQjsUcEK-m54dE`, déclenché sur l'écran de succès de mandat.html). Restaurée le 26/06.
- ⏳ **« Clic WhatsApp »** (à créer) : conversion *soft* pour qu'on ait du signal côté Google.
  - Dans Google Ads → Objectifs → Conversions → **+ Action de conversion** → « Site web » (ou manuelle/import) → catégorie « Contact » → récupérer le **libellé** `AW-18269983535/XXXX`.
  - Ensuite je câble dans le code le `gtag('event','conversion', {send_to:'AW-18269983535/XXXX'})` au clic sur les boutons WhatsApp (je l'ai déjà prêt, il ne manque que le libellé).

## 7. Qui fait quoi
- **Toi (UI Google Ads)** : créer la campagne (ou me laisser la piloter au navigateur), créer la conversion « clic WhatsApp », fournir les **visuels famille africaine** + la **vidéo 9:16**.
- **Moi (code)** : câbler la conversion « clic WhatsApp » une fois le libellé fourni ; raccourcir le message pré-rempli ; nettoyer le lien de partage radar.
- **Décision budget** : commence à 10 €/j sur les 5 aéroports, on lit le coût/mandat à 3 semaines, puis on étend (ou pas) vers les 27.

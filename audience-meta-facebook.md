# Audiences Meta Ads — Robin des Airs (diaspora Afrique↔Europe, Maroc exclu)

> ✅ **AUDIENCE 1 CRÉÉE + ÉLARGIE le 29/06/2026** dans le compte `1124140858032089` :
> nom **« Diaspora FR-BE — Expats Afrique »**, taille estimée **2,6–3,1 M**.
> - Lieu : Belgique + France · Âge : 25-65+ · Langue : Français (France/Canada) · Advantage+ : désactivé
> - Centres d'intérêt (12) : Sénégal, Mali, Guinée, Bénin, Togo, Madagascar, Maurice,
>   Burkina Faso, Niger, Tchad, Gabon, Mauritanie
> - Comportements « A vécu en… » (ex-Expats) : Côte d'Ivoire, Cameroun
>
> ⚠️ **Réalité taxonomie Meta 2026** (constatée en la créant) :
> - Le comportement « Expatriés » a été **renommé « A vécu en [pays] (anciennement Expats - X) »**.
> - Il n'existe QUE pour les grosses diasporas : **Côte d'Ivoire, Cameroun** l'ont ; tous les autres
>   pays → repli sur l'intérêt-pays.
> - **Pays SANS aucun ciblage Meta** (ni intérêt ni comportement) : Comores, Djibouti,
>   Congo-Brazzaville, RD Congo, République centrafricaine → impossibles à viser (gap assumé).
> - Les intérêts services diaspora (Orange Money, Wave) **n'existent pas** comme ciblage.
> - Maghreb (Algérie, Tunisie) **volontairement exclu** (hors niche sub-saharienne) ; Maroc exclu.


> Config prête à coller dans Meta Ads Manager. Logique : le client le plus **sûrement éligible CE261**
> = la diaspora qui vit **en Europe** et prend l'avion vers l'Afrique (départ UE = couvert).
> On mène donc avec l'Europe ; l'Afrique = audience secondaire à tester.

---

## ⚙️ Prérequis (à faire 1 fois avant)

1. **Pixel Meta** installé sur `robindesairs.eu` (toutes pages) + événement personnalisé
   `Lead` au déclenchement WhatsApp / signature mandat. Sans pixel : pas de retargeting,
   pas de Lookalike, pas d'Advantage+ optimisé.
2. **Audience cliente (Custom Audience)** : export CRM Airtable (téléphone + email des
   signataires) → upload « Liste de clients ». Sert de base au Lookalike + à l'exclusion.
3. Page FB + compte IG `robin.des.airs` (17841439260378062) reliés au Business Manager.

---

## 🎯 AUDIENCE 1 — « Diaspora FR/BE » (cœur de cible, à lancer en premier)

**Lieux**
- France (tout le pays)
- Belgique (tout le pays)
- *(option d'extension après 1ère validation : Suisse romande, Italie, Allemagne)*
- Type de lieu : **Personnes vivant à cet endroit**

**Âge** : 27 – 60
**Genre** : Tous
**Langue** : Français

**Ciblage détaillé — Comportements > Expatriés** *(le meilleur signal diaspora)*
Inclure (élargir « Expatriés ») :
- A vécu au Sénégal (Expats – Sénégal)
- A vécu en Côte d'Ivoire
- A vécu au Mali
- A vécu au Cameroun
- A vécu en Guinée
- A vécu en RD Congo / Congo
- A vécu au Bénin
- A vécu au Togo
*(➡️ NE PAS inclure « A vécu au Maroc » — niche exclut le Maroc)*

**+ Réduire l'audience (ET logique) avec au moins un signal voyage/diaspora :**
- Centres d'intérêt : Air Sénégal, Air Côte d'Ivoire, ASKY Airlines, Camair-Co,
  Brussels Airlines, Air France
- Services de transfert d'argent : **Wave, Orange Money, WorldRemit, Sendwave,
  Taptap Send, Western Union, MoneyGram** (signal diaspora très fort)
- Comportements voyage : Voyageurs internationaux fréquents

**Exclusions**
- A vécu au Maroc / Royal Air Maroc
- Custom Audience « Clients Robin des Airs » (ne pas payer pour les déjà-signés)

**Placement** : Advantage+ Placements (automatique) — laisse Meta optimiser Feed/Reels/Stories.
**Budget conseillé test** : 10–15 €/jour, 1 audience = 1 ad set, 5–7 jours avant de juger.

---

## 🎯 AUDIENCE 2 — « Lookalike convertisseurs » (à activer dès ~50 leads)

- Source : Custom Audience « Leads » (pixel) ou « Clients » (liste CRM)
- **Lookalike 1 %** — Lieux : France + Belgique
- Puis tester **Lookalike 1–3 %** en ad set séparé
- Mêmes exclusions (clients existants)
- ⚠️ Nécessite ≥ 100 personnes dans la source pour une bonne qualité.

---

## 🎯 AUDIENCE 3 — « Retargeting » (rattrapage, le moins cher au lead)

Inclure (OU logique) :
- Visiteurs `robindesairs.eu` — 30 derniers jours (pixel)
- A interagi avec la Page Facebook — 90 j
- A interagi avec le compte Instagram — 90 j
- A vu ≥ 50 % d'une vidéo (pubs) — 90 j

**Exclure** : Custom Audience « Clients/Leads signés »
**Message** : créa « relance » → « Vous avez vérifié votre vol ? Jusqu'à 600 €, 0 € d'avance. »

---

## 🧪 AUDIENCE 4 — « Aéroports Afrique » (SECONDAIRE, expérimental)

> ⚠️ Attention : départ hors-UE sur transporteur non-UE = souvent **hors CE261**.
> À réserver aux vols vers l'Europe / sur compagnie UE. Tester petit (5 €/j), surveiller le coût/lead.

**Lieux — rayon ~30 km autour de :**
Dakar (DSS), Abidjan (ABJ), Bamako (BKO), Douala (DLA), Yaoundé (NSI),
Conakry (CKY), Cotonou (COO), Lomé (LFW), Libreville (LBV),
Brazzaville (BZV), Kinshasa (FIH)
*(liste complète des 27 aéroports : cf. note ciblage Meta aéroports)*

**Type de lieu** : Personnes vivant à cet endroit + récemment sur place
**Langue** : Français
**Âge** : 25 – 60

---

## 📌 Règles d'arbitrage

- **1 audience = 1 ad set.** Ne mélange jamais Diaspora / Lookalike / Retargeting dans le même ad set.
- **Créa** = standard niche : visage famille africaine + « jusqu'à 600 € » + « 0 € d'avance » + CTA WhatsApp.
- **Conditionnel** pour compagnies non-UE (« si votre vol est éligible »), jamais de promesse ferme.
- Coupe une audience si CPL > ~25 € sur 7 j ; double celle qui tient sous 15 €.

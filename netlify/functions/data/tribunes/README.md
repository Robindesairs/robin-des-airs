# Textes de tribunes presse

Treize textes, **aucune phrase de corps en commun** entre eux (revérifié le 18/07/2026,
script de contrôle en bas de page). Chaque zone a son texte : ne JAMAIS envoyer le
même à deux médias voisins.

| Fichier | Zone | Médias couverts |
|---|---|---|
| `tribune-sahel-fcfa.md` | Sahel + Afrique de l'Ouest, FCFA | ~24 |
| `tribune-afrique-centrale.md` | Cameroun, Gabon, Congo, RDC, XAF | ~6 |
| `tribune-EN-two-regimes.md` | Anglophone (UK261 + CE 261) | ~28 |
| `tribune-ocean-indien.md` | Madagascar, Mayotte, Maurice | 3 |
| `tribune-presse-voyage-b2b.md` | Presse pro voyage et aérien FR | 5 |
| `tribune-diaspora-france-belgique.md` | Diaspora en France et Belgique | 6 |
| `tribune-suisse.md` | Suisse romande | 3 |
| `tribune-lusophone-pt.md` | Cap-Vert, Mozambique, Angola (en PT) | 5 |
| `tribune-afrique-xxi-long.md` | Afrique XXI, format long 9 400 signes | 1 |
| `tribune-connectionivoirienne.md` | Côte d'Ivoire | ENVOYÉ 18/07 15:20 |
| `tribune-gabonreview.md` | Gabon, angle SOS Conso | ENVOYÉ 18/07 15:26 |
| `tribune-seneweb.md` | Sénégal | ENVOYÉ 18/07 15:29 |
| `tribune-financial-afrik.md` | Panafricain économique | brouillon HTML prêt |

Les 87 médias du catalogue ont désormais tous un texte adapté. Plus rien ne
limite la cadence de la routine hebdomadaire `presse-vague-hebdo`.

## Pièges propres à certaines zones

- 🔴 **Lusophone** : Praia et Sal vers Lisbonne font ~2 800 km, donc tranche
  1 500-3 500 km = **400 €**, pas 600 €. Le Mozambique et l'Angola dépassent
  3 500 km = 600 €. Le texte gère les deux, ne pas le simplifier.
- **Océan Indien** : Mayotte et La Réunion sont territoire français, donc le
  CE 261 s'applique de plein droit au départ. C'est l'angle du texte.
- **Suisse** : le CE 261 s'applique par l'accord bilatéral sur le transport
  aérien, pas parce que la Suisse serait dans l'Union. Formulation à respecter.
- **Presse voyage B2B** : registre professionnel. Ne pas expliquer le CE 261,
  ces lecteurs le connaissent. L'apport est l'angle distribution.
- **Afrique XXI** : décrire un effet de système, jamais une intention. Aucune
  accusation de stratégie délibérée contre une compagnie nommée.

## Règles de mise en forme (validées le 18/07)

- HTML léger : titre en gras, intertitres en gras, chapô en italique avec filet
  vert, bio encadrée. PAS de logo, PAS de bandeau, PAS de bouton, PAS d'image.
- 🔴 L'URL s'écrit en TEXTE BRUT, jamais en `<a href>` : sinon Gmail la réécrit
  en redirection `google.com/url?q=` et le lien perd tout intérêt.
- Signature 3 lignes : nom, fonction, puis `robindesairs.eu · +33 7 56 86 36 30`.
- 🔴 NE JAMAIS mentionner le parcours navigant du fondateur (chef de cabine,
  steward, « X ans en vol / dans le transport aérien »), ni aucune tournure
  d'initié qui le laisse deviner. Bio neutre uniquement : « fondateur de Robin
  des Airs, service spécialisé dans le recouvrement d'indemnités pour passagers
  aériens sur l'axe Europe-Afrique ». Un article publié reste en ligne.
- Expéditeur : `expert@robindesairs.eu`. Signature : Saint-Yves Kodjo.
- Ne JAMAIS se présenter comme juriste (loi 71-1130).

## Contrôle anti doublons

Avant d'ajouter un texte, vérifier qu'il ne partage aucune phrase de corps avec
les autres. Google déclasse le contenu dupliqué, et une rédaction qui repère le
même paragraphe chez un confrère ne republie pas.

```bash
cd netlify/functions/data/tribunes && python3 - <<'PY'
import re,glob,collections
BIO=("Saint-Yves Kodjo est fondateur","Spécialiste du secteur aérien","Il connaît de l'intérieur","robindesairs.eu")
def sents(p):
    t=open(p,encoding='utf-8').read().split('---',2)[-1]
    out=[]
    for line in t.split('\n'):
        line=line.strip()
        if not line or line.startswith(('#','*','**','|')) or any(b in line for b in BIO): continue
        for s in re.split(r'(?<=[.!?])\s+',line):
            s=re.sub(r'[*_`]','',s).strip()
            if len(s)>45: out.append(s)
    return out
d=collections.defaultdict(list)
for f in sorted(glob.glob('tribune-*.md')):
    for s in sents(f): d[s].append(f)
for s,v in d.items():
    if len(set(v))>1: print(f"[{', '.join(sorted(set(v)))}]\n  {s[:150]}\n")
PY
```

Les correspondances tolérées sont uniquement celles des blocs
`EMAIL D'ACCOMPAGNEMENT` et des bios. Toute correspondance dans un corps de
tribune doit être réécrite.

# Visibilité Google — Robin des Airs

## État actuel (site public débloqué)

- **`index.html`** : `meta robots` = `index, follow`
- **`robots.txt`** : `Allow: /` + **Sitemap** actif
- **`sitemap.xml`** : généré au build (`npm run build:sitemap`)

Les pages **marketing** (accueil, blog, dépôts, destinations, mandats, etc.) peuvent être indexées.

## Toujours bloquées (volontairement)

| Zone | Pourquoi |
|------|----------|
| `/radar`, `/radar-vols-v2` | Tour de contrôle interne (+ auth CRM) |
| `/crm` | Dossiers équipe |
| `/navigation-interne`, `/interne` | Hub liens internes |
| `/generateur-pub` | Outil pub équipe |
| `merci-dossier`, `merci-partenaire` | Pages de confirmation (pas utiles en SEO) |

## Après deploy — Google Search Console

1. [Google Search Console](https://search.google.com/search-console) → propriété `robindesairs.eu`
2. **Sitemaps** → ajouter `https://robindesairs.eu/sitemap.xml`
3. **Inspection d’URL** → `https://robindesairs.eu/` → **Demander une indexation**
4. Si le site avait été **désindexé** manuellement dans GSC : **Suppressions** → lever la demande si encore active

Délai habituel : quelques jours à 2 semaines pour réapparaître sur des requêtes ciblées.

## Re-bloquer temporairement (pré-lancement)

1. `index.html` : `<meta name="robots" content="noindex, nofollow">`
2. `robots.txt` : `Disallow: /` (et retirer la ligne Sitemap)

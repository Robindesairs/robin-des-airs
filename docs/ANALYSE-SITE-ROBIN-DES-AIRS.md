# Analyse du site Robin des Airs (robindesairs.eu)

**Date** : Mars 2026  
**Stack** : HTML/CSS/JS statique, Netlify, fonctions serverless (Node), blog généré (Markdown → HTML).

---

## 1. Structure et contenu

### Pages principales
| Page | Rôle |
|------|------|
| **index.html** | Accueil, hero, calculateur (funnel), loi CE 261, témoignages, FAQ, CTA WhatsApp |
| **depot-en-ligne.html** | Formulaire dépôt dossier (multi-étapes, pièces jointes) |
| **depot-simple.html** | Dépôt simplifié |
| **dossier.html** | Suivi / formulaire dossier |
| **suivi-dossier.html** | Où en est mon dossier |
| **guide-whatsapp.html** | Guide envoi par WhatsApp |
| **choix-reclamation.html** | Choix type réclamation |
| **mandat-representation.html** | Explication mandat |
| **politique-confidentialite.html** | RGPD, responsable, adresse (66 av. Champs-Élysées) |
| **droit-retractation.html** | Droit de rétractation 14 jours |
| **cgv.html** | Conditions générales |
| **404.html** | Page introuvable + redirection 3s vers accueil |

### Blog
- **Source** : `src/content/blog/*.md` (frontmatter + Markdown).
- **Build** : `npm run build:blog` → génère `blog/*.html` (25 articles).
- **Index** : `blog/index.html` (liste des articles).
- **Pack SEO** : 20 articles (Air France, Dakar, Abidjan, bon d’achat, famille, etc.) avec meta title, meta description, CTA WhatsApp, styles (barre verte H1, bordures H2, tableaux).

### Destinations
- Pages dédiées : `destinations/dakar.html`, `abidjan.html`, `bamako.html`, `kinshasa.html`.
- Liens depuis l’accueil (section « Top destinations 600€ »).

### Autres
- **radar.html** / **radar-direct.html** : suivi vols (radar).
- **verification-fonctions.html** : test des APIs (whatsapp-status, flight-info, airport-search, radar).
- **meteo-dossier-indemnite.html**, **pourquoi-si-peu-reclament.html**.

---

## 2. Technique

### Hébergement et déploiement
- **Netlify** : publish = `.` (racine), pas de commande de build (les HTML sont déjà générés).
- **Fonctions** : `netlify/functions/` (whatsapp-webhook, whatsapp-status, whatsapp-gemini-fallback, flight-info, airport-search, radar, etc.).
- **Redirects** : netlify.toml définit les routes sans `.html` (ex. `/dossier` → `/dossier.html`) et `/api/whatsapp-webhook`, `/api/whatsapp-status`.

### Front
- **CSS** : `/assets/main.css`, polices (Syne, Montserrat, Bebas Neue, Archivo Black) via jsDelivr, Flatpickr, Tom Select.
- **i18n** : `i18n.js` — FR, EN, ES, NL, PT, DE (hero, nav, funnel, FAQ, footer).
- **Données** : `data/airlines.js`, `data/airports.js`, `data/flights-db.js` (routes, montants).
- **Calculateur** : logique dans index.html (motif → raison → trajet → résultat éligibilité, montant, CTA).

### SEO et métadonnées (accueil)
- **Title** : « Robin des Airs — Indemnités aériennes jusqu'à 600€ | Premium ».
- **Meta description** : vol retardé/annulé, 600€, 25%, zéro frais si on ne gagne pas.
- **Canonical** : https://robindesairs.eu.
- **OG** : type website, url, title, description (pas d’og:image sur l’accueil).
- **Schema.org** : Organization (adresse, contact, WhatsApp), FAQPage (5 questions/réponses).
- **Skip link** : « Aller au contenu principal » (accessibilité).

### WhatsApp
- **Numéro** : 15557840392 (wa.me/15557840392) — cohérent sur le site, blog, webhook.
- **Webhook** : `/api/whatsapp-webhook` → `netlify/functions/whatsapp-webhook.js` (360dialog, tunnel carte d’embarquement, option relais Gemini 20 s).
- **Statut** : `/api/whatsapp-status` pour vérifier `can_send_replies`.
- **Doc** : `docs/WHATSAPP-REPONDRE-CLIENTS.md`, `WEBHOOK-WHATSAPP.md` — pas de verify token requis côté 360dialog.

---

## 3. Points forts

1. **Message clair** : 600€, 25%, 0€ si on perd, diaspora, langues (FR + langues africaines).
2. **Funnel intégré** : calculateur sur l’accueil (motif → raison → trajet → verdict) avec CTA WhatsApp.
3. **Blog SEO** : 20+ articles avec bons titres/meta, maillage interne possible, CTAs.
4. **Multilingue** : 6 langues (FR, EN, ES, NL, PT, DE) + mention Wolof, Bambara, etc.
5. **Légal** : CGV, confidentialité, mandat, rétractation, adresse siège.
6. **APIs** : Amadeus (flight-info, airport-search), radar, WhatsApp, Gemini (OCR).
7. **Accessibilité** : skip link, structure sémantique, contraste (navy + vert).

---

## 4. Pistes d’amélioration

### SEO
- **Sitemap** : le `sitemap.xml` à la racine ne contient que 5 articles blog. Le script `build:sitemap` génère `public/sitemap.xml` avec tous les slugs blog — vérifier que Netlify sert bien le sitemap le plus complet (ou fusionner / générer un seul sitemap à la racine avec toutes les URLs : accueil, dépôt, blog, destinations).
- **og:image** : ajouter une `og:image` sur l’accueil (et éventuellement sur les pages clés) pour un meilleur partage social.
- **Blog** : ajouter des liens internes entre articles (comme prévu dans le récap pack SEO) pour renforcer le maillage.

### Performance
- **Fonts** : plusieurs preloads (Syne, Montserrat, Bebas, Archivo) — envisager de réduire ou de charger en lazy pour le below-the-fold.
- **JS** : plusieurs scripts (Flatpickr, Tom Select, flights-db, i18n) — possible de différer une partie après le premier rendu.

### UX
- **Redirection 404** : la meta refresh 3 s est correcte ; garder le lien « Retour à l’accueil » bien visible.
- **Redirects** : ajouter des redirects sans `.html` pour les pages les plus utilisées si besoin (ex. `/depot-en-ligne`, `/blog` déjà couvert par `/blog/index.html`).

### Technique
- **Build** : pour déploiement Netlify, exécuter `npm run build:blog` (et éventuellement `npm run build:sitemap`) en commande de build pour que le dépôt poussé contienne toujours blog et sitemap à jour.
- **WhatsApp** : s’assurer que la config 360dialog (URL webhook pour le bon numéro) et `WHATSAPP_360DIALOG_API_KEY` sont en place pour que les réponses partent bien.

---

## 5. Résumé

Le site est cohérent, orienté conversion (calculateur + WhatsApp), bien documenté (légal, webhook, aide clients). Les prochaines étapes les plus utiles : sitemap complet, og:image, maillage interne blog, et build automatisé (blog + sitemap) si ce n’est pas déjà fait en CI.

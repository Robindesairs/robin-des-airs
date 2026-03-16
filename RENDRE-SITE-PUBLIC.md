# Rendre le site visible (grand public)

Quand tu voudras que le site soit de nouveau indexable par Google et visible du grand public :

1. **`index.html`** — Dans le `<head>`, **supprimer** la ligne :
   ```html
   <meta name="robots" content="noindex, nofollow">
   ```

2. **`robots.txt`** — Remplacer le contenu par :
   ```
   # Robin des Airs — indemnités aériennes CE 261/2004
   User-agent: *
   Allow: /

   Sitemap: https://robindesairs.eu/sitemap.xml
   ```

3. (Optionnel) Vérifier dans Google Search Console que la demande de réindexation est bien prise en compte après la mise en ligne.

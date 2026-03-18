# Checklist avant lancement

À faire **avant la mise en ligne** pour éviter incohérences et numéros de test.

---

## 1. Numéro WhatsApp (CRITIQUE)

Le site utilise actuellement le numéro **+1 555 784 0392** (numéro fictif US) partout. **Remplacer par le vrai numéro français** avant le lancement.

### Où remplacer

- **index.html** : constante `WHATSAPP_NUMBER = '15557840392'` (ligne ~1172), tous les `wa.me/15557840392`, et le texte affiché "Réponse directe : WhatsApp +1 555 784 0392" (hero).
- **JSON-LD** (index.html) : `telephone` et `sameAs` dans le bloc Organization.
- **Footer** : lien WhatsApp.
- **Pages** : choix-reclamation.html, guide-whatsapp.html, depot-en-ligne.html, dossier.html, suivi-dossier.html, droit-retractation.html, politique-confidentialite.html, meteo-dossier-indemnite.html, 404.html, depot-simple.html.
- **Blog** : tous les articles (fichiers dans `blog/*.html` et `src/content/blog/*.md`). Recherche globale : `15557840392` et `wa.me/15557840392`.
- **Netlify** : variables d’environnement des fonctions (whatsapp-webhook.js, etc.) si le numéro y est codé en dur.
- **Docs** : PUBS-CREATIFS-ROBIN-SPECS.md, WEBHOOK-WHATSAPP.md, ANALYSE-SITE-ROBIN-DES-AIRS.md.

Conseil : une fois le numéro FR connu, faire une recherche projet sur `15557840392` et `555 784 0392` et remplacer partout.

---

## 2. CGV — SIREN

Dans **cgv.html**, Article 1 : remplacer « SIREN à renseigner au lancement » par le **SIREN réel** de la SASU Robin des Airs.

---

## 3. Ligne crise (footer)

Le footer affiche une « Ligne crise » : **01 89 62 89 69**. Vérifier que ce numéro est actif et redirigé. Sinon, supprimer la ligne dans index.html (élément avec classe `footer-crisis`).

---

## 4. Déjà corrigé dans le cadre de l’audit

- Témoignage Jean-Baptiste : 25% (300€ nets sur 400€).
- Témoignage David T. : 461€ → 450€.
- Témoignage Oumar A. : 181€ → 225€.
- Blog bon d’achat : 461€ → 450€.
- Slogan hero : « 25% — quoi qu'il arrive. Même au tribunal. »
- Tableau comparatif : fourchettes « Variable · 300€ à 450€ selon offre et procès » pour les concurrents.
- CGV : mention Phase 2 / cession de créance à J+60 ; Article 1 avec placeholder SIREN.
- Footer : © 2026 Robin des Airs (sans SASU jusqu’à immatriculation définitive).
- FAQ : doublons déjà fusionnés (12 questions).

---

*Dernière mise à jour : mars 2026.*

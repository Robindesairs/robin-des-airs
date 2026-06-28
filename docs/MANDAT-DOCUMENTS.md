# Contrat de cession de créance passager — documents sur le site

> Vocabulaire affiché au client : « contrat de cession de créance ». Les **noms de fichiers et de routes** ci-dessous (`mandat.html`, `documents/mandat-fr.html`, `mandat-fr.pdf`, `npm run mandat:pdf`) restent **inchangés** (techniques, ne pas renommer).

## URLs (production)

| Usage | URL |
|--------|-----|
| **Signature en ligne** | https://robindesairs.eu/mandat.html |
| **Version imprimable / PDF** | https://robindesairs.eu/documents/mandat-fr.html |
| **Ouvre directement l’impression** | https://robindesairs.eu/documents/mandat-fr.html?print=1 |
| **Raccourci** | https://robindesairs.eu/mandat-fr.pdf → redirige vers `?print=1` |

## Fichiers dans le repo

- `mandat.html` — formulaire de signature (FR)
- `documents/mandat-fr.html` — version imprimable (champs vides, articles complets)
- `documents/mandat-fr.pdf` — *(optionnel)* binaire à générer avant déploiement si vous voulez un vrai téléchargement PDF

## Générer un vrai fichier PDF (optionnel)

Sur une machine avec Chrome fonctionnel :

```bash
npm run mandat:pdf
```

Produit `documents/mandat-fr.pdf`. Ensuite, remplacer les redirections `302` dans `_redirects` par des chemins `200` vers le fichier PDF.

## Liens ajoutés

- Barre du contrat de cession en ligne (`mandat.html`)
- Espace agence → Aide / documents
- `delais-dates-ce261-fr.html`
- Pied de page `index.html`

# PRODUCT.md — Robin des Airs

## Register
**Product** (design sert la tâche), mais sur des surfaces **client-facing à forte charge de confiance**. Les pages concernées sont des formulaires du parcours post-signature : dépôt de pièces (passeport, carte d'embarquement, reçus) et collecte du RIB (IBAN). Elles doivent fonctionner sans friction ET inspirer le sérieux d'un acteur qui manipule documents d'identité + coordonnées bancaires.

## Users & Purpose
- **Qui** : diaspora africaine en Europe (corridors Afrique↔Europe), majoritairement **sur mobile**, souvent après un vol galère. Niveau de confiance numérique variable ; certains méfiants (peur de l'arnaque, des données revendues).
- **Job** : déposer leurs pièces / communiquer leur IBAN en 30 secondes, **sans douter** que c'est sûr et légitime.
- **Émotions visées** : confiance, soulagement, sentiment d'être bien pris en charge (« je ne suis plus seul face à la compagnie »). Chaleur, pas froideur corporate.

## Brand & Personality
Trois mots : **chaleureux, premium, rassurant**. Direction « **Wave premium** » (réf. l'app Wave en Afrique de l'Ouest : vert vif, moderne, populaire, digne de confiance) — PAS Apple froid/minimaliste-clinique. Signature : « On prend aux compagnies, on rend aux familles ».

### Tokens marque (existants, à réutiliser — `assets/main.css`)
- `--navy #0B1F3A` (fond sombre, texte fort) · `--navy2 #0d2445`
- `--neon #00C87A` (vert Wave vif = CTA) · `--neon-b #00E5A0` (survol) · `--neon-dark #009960`
- `--neon-ink #047857` (vert **accessible ≥4.5:1** pour TEXTE vert sur fond clair)
- Gradient premium signature : `linear-gradient(135deg,#00E5A0,#00C87A)` (surfaces/accents, jamais sur du texte)

## Anti-references (à NE PAS faire)
- ❌ Apple/SaaS froid, gris clinique, vide stérile.
- ❌ Texte en dégradé (`background-clip:text`), shimmer, halos lumineux, glassmorphism décoratif — explicitement retirés du site (refonte « calm premium »).
- ❌ Bordures latérales colorées (side-stripe), eyebrows trackés majuscules au-dessus de chaque section, numéros 01/02/03 décoratifs.
- ❌ Tout ce qui « fait gadget » au point d'éroder la confiance sur une page qui manipule passeport/IBAN.

## Accessibility
- Contraste **AA** obligatoire (texte ≥4.5:1). Vert sur fond clair = `--neon-ink`, jamais `--neon`.
- Mobile-first (cibles tactiles ≥44px, champs ≥16px pour éviter le zoom iOS).
- `prefers-reduced-motion` respecté.

## Strategic design principles
1. **La confiance avant le style** : chaque effet premium doit *renforcer* le sentiment de sécurité, jamais le contredire.
2. **Mobile d'abord, pouce d'abord** : une seule colonne, gros boutons, zéro scroll inutile.
3. **Chaleur Wave** : vert vif + navy profond + une pointe de personnalité (🏹), pas de blanc-gris stérile.
4. **Preuve de sérieux** : marqueurs de sécurité (chiffré, RGPD, usage unique) visibles mais élégants, pas anxiogènes.

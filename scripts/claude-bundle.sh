#!/usr/bin/env bash
# Crée dist/pour-claude-espace-agence.zip pour joindre à Claude
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist"
ZIP="$OUT/pour-claude-espace-agence.zip"
TMP="$OUT/claude-bundle-tmp"

rm -rf "$TMP"
mkdir -p "$TMP" "$OUT"

cp "$ROOT/espace-agence-maquette.html" "$TMP/"
cp "$ROOT/docs/PROMPT-ESPACE-AGENCE.md" "$TMP/"
cp "$ROOT/docs/MONTRER-PAGE-A-CLAUDE.md" "$TMP/"
cp "$ROOT/espace-agence.html" "$TMP/" 2>/dev/null || true
cp "$ROOT/assets/agence-portal.js" "$TMP/" 2>/dev/null || true
cp "$ROOT/assets/agence-i18n.js" "$TMP/" 2>/dev/null || true
cp "$ROOT/netlify/functions/agency-dossiers.js" "$TMP/" 2>/dev/null || true

cat > "$TMP/LISEZMOI.txt" <<'EOF'
Pack pour Claude — Espace agence Robin des Airs
================================================

1. Ouvrir espace-agence-maquette.html dans Chrome (double-clic).
   Utiliser les 3 boutons en haut pour voir Connexion / Dashboard / Nouveau dossier.

2. Lire PROMPT-ESPACE-AGENCE.md pour la spec d'implémentation.

3. Comparer avec espace-agence.html et agence-portal.js (code actuel).

Message suggéré pour Claude :
"Implémente l'UI de espace-agence-maquette.html dans le vrai projet.
Pas d'email au formulaire. API POST sans champ email requis.
Voir PROMPT-ESPACE-AGENCE.md."
EOF

rm -f "$ZIP"
(cd "$TMP" && zip -r "$ZIP" .)
rm -rf "$TMP"

echo "OK → $ZIP"
ls -lh "$ZIP"

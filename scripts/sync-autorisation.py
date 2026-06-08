#!/usr/bin/env python3
"""Régénère autorisation.html (page LIVE, URL SEO) depuis mandat.html (la SOURCE).

mandat.html est la source de vérité du mandat. autorisation.html est une copie
servie sur l'URL SEO /autorisation.html. Les deux pages sont désormais brandées
« Mandat de Représentation » à l'identique ; ce script copie mandat.html dans
autorisation.html en ajustant uniquement l'URL canonique (og:url) propre à
autorisation.html.

À lancer après chaque modification de mandat.html :
    python3 scripts/sync-autorisation.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = (ROOT / "mandat.html").read_text(encoding="utf-8")

# Seule différence légitime entre les deux pages : l'URL canonique og:url.
REPLACEMENTS = [
    ('<meta property="og:url" content="https://robindesairs.eu/mandat.html">',
     '<meta property="og:url" content="https://robindesairs.eu/autorisation.html">'),
]

out = src
missing = []
for a, b in REPLACEMENTS:
    if a not in out:
        missing.append(a[:70])
    out = out.replace(a, b)

(ROOT / "autorisation.html").write_text(out, encoding="utf-8")
print("OK — autorisation.html régénéré depuis mandat.html.")
if missing:
    print("ATTENTION — chaînes SEO introuvables dans mandat.html (à vérifier) :")
    for m in missing:
        print("   -", m)

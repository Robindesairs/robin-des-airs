#!/usr/bin/env python3
"""Régénère autorisation.html (page LIVE, URL SEO) depuis mandat.html (la SOURCE).

mandat.html est la source de vérité du mandat. autorisation.html est la page
réellement servie en prod (/mandat.html y redirige). Ce script copie le contenu
de mandat.html dans autorisation.html en restaurant le branding SEO « Mandat de
Représentation » propre à autorisation.html.

À lancer après chaque modification de mandat.html :
    python3 scripts/sync-autorisation.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = (ROOT / "mandat.html").read_text(encoding="utf-8")

# Balises SEO propres à autorisation.html (sinon on hériterait du branding « Autorisation » de mandat.html)
REPLACEMENTS = [
    ('<meta name="description" content="Signez votre autorisation de représentation Robin des Airs — CE 261/2004. No Win No Fee.">',
     '<meta name="description" content="Signez votre mandat de représentation Robin des Airs — CE 261/2004. No Win No Fee.">'),
    ('<title>Autorisation de Représentation — Robin des Airs</title>',
     '<title>Mandat de Représentation — Robin des Airs</title>'),
    ('<meta property="og:url" content="https://robindesairs.eu/mandat.html">',
     '<meta property="og:url" content="https://robindesairs.eu/autorisation.html">'),
    ('<meta property="og:title" content="Autorisation de représentation — Robin des Airs">',
     '<meta property="og:title" content="Mandat de représentation — Robin des Airs">'),
    ('<meta property="og:description" content="Signez votre autorisation CE 261 en 2 minutes — sécurisée, honoraires uniquement après succès.">',
     '<meta property="og:description" content="Signez votre mandat CE 261 en 2 minutes — sécurisé, honoraires uniquement après succès.">'),
    ('<meta name="twitter:title" content="Autorisation de représentation — Robin des Airs">',
     '<meta name="twitter:title" content="Mandat de représentation — Robin des Airs">'),
    ('<meta name="twitter:description" content="Signez votre autorisation CE 261 en 2 minutes — sécurisée.">',
     '<meta name="twitter:description" content="Signez votre mandat CE 261 en 2 minutes — sécurisé.">'),
    ('<div class="doc-title">Autorisation de Représentation</div>',
     '<div class="doc-title">Mandat de Représentation</div>'),
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

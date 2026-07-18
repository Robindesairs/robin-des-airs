#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Porte dans la SOURCE les 6 arrêts + les correctifs « Tribunal UE » appliqués au HTML.

jurisprudence-ce261.html est GÉNÉRÉ (cf. son pied de page) :
    src/data/ce261-jurisprudence.json  ->  src/scripts/build-jurisprudence.mjs
Éditer le HTML seul, c'est perdre le travail au prochain build. Ce script écrit
dans la source, puis le build régénère le HTML à l'identique.

Trois correctifs de générateur, tous dus à la même hypothèse « UE == CJUE » :
  1. nFR = cases.length - nCJUE      -> comptait le Tribunal comme juridiction française
  2. isFR = juridiction !== 'CJUE'   -> rangeait le Tribunal sous le filtre « France »
  3. badge codé en dur « CJUE »      -> affichait « CJUE » sur un arrêt du Tribunal

Idempotent. Usage : python3 scripts/port-codex-to-source.py [--dry-run]
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_SRC = ROOT / "src/data/ce261-jurisprudence.json"
GEN = ROOT / "src/scripts/build-jurisprudence.mjs"
HTML = ROOT / "jurisprudence-ce261.html"

NEW_IDS = [
    "air-baltic-employeur-c429-14",
    "nw-ys-qatar-airways-c516-23",
    "kralova-primera-air-c215-18",
    "vki-klm-commission-intermediaire-c45-24",
    "ni-hz-european-air-charter-t656-24",
    "atm-rotation-vol-precedent-t134-25",
]

PATCHES = [
    (
        "const nFR = cases.length - nCJUE;",
        "const nTribUE = cases.filter((c) => c.juridiction === 'Tribunal UE').length;\n"
        "// Depuis le règl. (UE, Euratom) 2024/2019, les renvois préjudiciels en droits des\n"
        "// passagers sont jugés par le TRIBUNAL de l'UE (affaires en T-), pas par la Cour.\n"
        "// Sans cette ligne, ces arrêts étaient comptés comme jurisprudence FRANÇAISE.\n"
        "const nFR = cases.length - nCJUE - nTribUE;",
        "compteur nFR",
    ),
    (
        "const isFR = (c) => c.juridiction !== 'CJUE';",
        "const EU_JUR = ['CJUE', 'Tribunal UE'];\n"
        "const isFR = (c) => !EU_JUR.includes(c.juridiction);",
        "prédicat isFR",
    ),
    (
        "    : '<span class=\"b jur-cjue\">CJUE</span>';",
        "    : '<span class=\"b jur-cjue\">'+esc(c.juridiction)+'</span>';",
        "badge juridiction",
    ),
]


def main():
    dry = "--dry-run" in sys.argv

    # --- 1. les fiches, reprises telles quelles du HTML déjà validé ---
    html = HTML.read_text(encoding="utf-8")
    from_html = json.loads(re.search(r"const CASES = (\[.*?\]);", html, re.S).group(1))
    by_id = {c["id"]: c for c in from_html}

    cases = json.loads(JSON_SRC.read_text(encoding="utf-8"))
    have = {c["id"] for c in cases}
    add = [by_id[i] for i in NEW_IDS if i not in have]

    if add:
        cases.extend(add)
        cases.sort(key=lambda c: c["date"])
        for i, c in enumerate(cases, 1):
            c["n"] = i
        if not dry:
            JSON_SRC.write_text(
                json.dumps(cases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        print(f"  {'[dry] ' if dry else ''}source JSON : +{len(add)} fiche(s), total {len(cases)}")
    else:
        print(f"  source JSON déjà à jour ({len(cases)} fiches)")

    # --- 2. les correctifs du générateur ---
    gen = GEN.read_text(encoding="utf-8")
    for old, new, label in PATCHES:
        if new.split("\n")[0] in gen and old not in gen:
            print(f"  générateur : {label} déjà corrigé")
            continue
        if old not in gen:
            print(f"  ⚠️  générateur : motif introuvable pour {label}, à corriger à la main")
            continue
        gen = gen.replace(old, new, 1)
        print(f"  {'[dry] ' if dry else ''}générateur : {label} corrigé")
    if not dry:
        GEN.write_text(gen, encoding="utf-8")

    print("\nEnsuite : node src/scripts/build-jurisprudence.mjs")


if __name__ == "__main__":
    main()

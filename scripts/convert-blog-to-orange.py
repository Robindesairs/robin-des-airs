#!/usr/bin/env python3
"""Convertit les articles blog du thème vert au thème orange.

Usage:
    python3 scripts/convert-blog-to-orange.py [--dry-run] [--only FILE] [blog_dir]

- Skip les fichiers déjà en orange (présence de #F59E0B dans le style).
- Crée un backup .green.bak (une seule fois) pour chaque fichier modifié.
- Convertit aussi le markdown ** restant dans le HTML visible (pas dans <script>).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Tuple

GREEN_TO_ORANGE = {
    "#00C87A": "#F59E0B",
    "#00c87a": "#F59E0B",
    "#00E5A0": "#F59E0B",
    "#00e5a0": "#F59E0B",
    "#009960": "#0B6BA3",
    "#EFF9F4": "#FFF9E6",
    "#eff9f4": "#FFF9E6",
    "#F0F9FF": "#FFF7ED",
    "#f0f9ff": "#FFF7ED",
    "rgba(0,229,160,": "rgba(245,158,11,",
    "rgba(0, 229, 160,": "rgba(245, 158, 11,",
    "rgba(0,200,122,": "rgba(245,158,11,",
    "rgba(0, 200, 122,": "rgba(245, 158, 11,",
}

SCRIPT_BLOCK_RE = re.compile(r"<script\b[^>]*>.*?</script>", re.DOTALL | re.IGNORECASE)
MD_BOLD_RE = re.compile(r"\*\*([^*\n]{1,200}?)\*\*")


def replace_colors(html: str) -> Tuple[str, int]:
    count = 0
    for src, dst in GREEN_TO_ORANGE.items():
        if src in html:
            count += html.count(src)
            html = html.replace(src, dst)
    return html, count


def fix_markdown_bold_outside_scripts(html: str) -> Tuple[str, int]:
    """Convertit **text** en <strong>text</strong> en dehors des <script>."""
    parts = []
    last = 0
    converted = 0

    def convert(segment: str) -> Tuple[str, int]:
        nonlocal converted
        c = 0
        def _sub(m: re.Match) -> str:
            nonlocal c
            c += 1
            return f"<strong>{m.group(1)}</strong>"
        out = MD_BOLD_RE.sub(_sub, segment)
        return out, c

    for m in SCRIPT_BLOCK_RE.finditer(html):
        before = html[last:m.start()]
        converted_segment, n = convert(before)
        converted += n
        parts.append(converted_segment)
        parts.append(m.group(0))
        last = m.end()
    tail = html[last:]
    converted_tail, n = convert(tail)
    converted += n
    parts.append(converted_tail)

    return "".join(parts), converted


def is_green_theme(html: str) -> bool:
    return ("#00C87A" in html) or ("#00c87a" in html)


def process(path: Path, dry_run: bool = False) -> dict:
    original = path.read_text(encoding="utf-8")
    if not is_green_theme(original):
        return {"path": path.name, "skipped": True, "reason": "not_green"}

    html = original
    html, color_count = replace_colors(html)
    html, md_fixed = fix_markdown_bold_outside_scripts(html)

    changed = html != original
    result = {
        "path": path.name,
        "skipped": False,
        "color_replacements": color_count,
        "md_bold_fixed": md_fixed,
        "changed": changed,
    }

    if changed and not dry_run:
        backup = path.with_suffix(path.suffix + ".green.bak")
        if not backup.exists():
            backup.write_text(original, encoding="utf-8")
        path.write_text(html, encoding="utf-8")
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("blog_dir", nargs="?", default="blog")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", help="seul ce fichier (relatif à blog_dir)")
    args = parser.parse_args()

    blog_dir = Path(args.blog_dir)
    if not blog_dir.is_dir():
        print(f"erreur: {blog_dir} introuvable", file=sys.stderr)
        return 1

    files = [blog_dir / args.only] if args.only else sorted(blog_dir.glob("*.html"))
    results = [process(f, dry_run=args.dry_run) for f in files]

    converted = [r for r in results if not r["skipped"] and r["changed"]]
    skipped = [r for r in results if r["skipped"]]

    print(f"Fichiers traités       : {len(results)}")
    print(f"  Sautés (déjà orange) : {len(skipped)}")
    print(f"  Convertis            : {len(converted)}")
    if converted:
        print(f"  ↳ couleurs changées  : {sum(r['color_replacements'] for r in converted)}")
        print(f"  ↳ markdown corrigés  : {sum(r['md_bold_fixed'] for r in converted)}")
    if args.dry_run:
        print("\n(dry-run, aucun fichier écrit)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

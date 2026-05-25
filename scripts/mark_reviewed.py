#!/usr/bin/env python3
"""
Marque un article comme revu aujourd'hui.

Usage:
    python3 scripts/mark_reviewed.py blog/foo.html [blog/bar.html ...]
    python3 scripts/mark_reviewed.py --bump-modified blog/foo.html
    python3 scripts/mark_reviewed.py --date 2026-05-25 blog/foo.html

Effet :
- Ajoute (ou met à jour) une balise `<meta name="article:reviewed" content="YYYY-MM-DD">`
  juste après `<meta name="description">`.
- Optionnellement (--bump-modified), met à jour `dateModified` dans le JSON-LD
  BlogPosting. À utiliser SEULEMENT quand le contenu a vraiment changé (sinon
  on pollue le signal SEO).

À la fin, recalcule `data/freshness.json` et `docs/freshness-report.md` via
`audit_freshness.py --json-only` + rebuild markdown.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

META_RE = re.compile(
    r'<meta\s+name=["\']article:reviewed["\']\s+content=["\'](\d{4}-\d{2}-\d{2})["\']\s*/?>',
    re.IGNORECASE,
)
DESC_RE = re.compile(
    r'(<meta\s+name=["\']description["\'][^>]*>)',
    re.IGNORECASE,
)
DATE_MOD_RE = re.compile(r'("dateModified"\s*:\s*")(\d{4}-\d{2}-\d{2})(")')


def update_one(path: Path, today: str, bump_modified: bool) -> tuple[bool, list[str]]:
    text = path.read_text(encoding="utf-8")
    changes: list[str] = []
    new_text = text

    new_tag = f'<meta name="article:reviewed" content="{today}">'

    if META_RE.search(new_text):
        new_text, n = META_RE.subn(new_tag, new_text, count=1)
        if n:
            changes.append("updated article:reviewed")
    else:
        m = DESC_RE.search(new_text)
        if m:
            insertion = m.group(1) + "\n  " + new_tag
            new_text = new_text[: m.start()] + insertion + new_text[m.end():]
            changes.append("inserted article:reviewed (after description)")
        else:
            # fallback: insert just before </head>
            new_text = re.sub(
                r"</head>",
                f"  {new_tag}\n</head>",
                new_text,
                count=1,
                flags=re.IGNORECASE,
            )
            changes.append("inserted article:reviewed (before </head>)")

    if bump_modified:
        new_text, n = DATE_MOD_RE.subn(r"\g<1>" + today + r"\g<3>", new_text)
        if n:
            changes.append(f"bumped dateModified ({n}x)")

    if new_text == text:
        return False, ["no-op"]
    path.write_text(new_text, encoding="utf-8")
    return True, changes


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="+", help="chemins relatifs ou absolus vers articles HTML")
    parser.add_argument("--date", default=date.today().isoformat(),
                        help="date à inscrire (YYYY-MM-DD), défaut = aujourd'hui")
    parser.add_argument("--bump-modified", action="store_true",
                        help="met aussi à jour dateModified du JSON-LD (déconseillé sauf vraie modif)")
    parser.add_argument("--no-rebuild", action="store_true",
                        help="ne pas relancer audit_freshness.py")
    args = parser.parse_args()

    try:
        date.fromisoformat(args.date)
    except ValueError:
        print(f"date invalide : {args.date}", file=sys.stderr)
        return 1

    updated = 0
    for raw in args.files:
        p = Path(raw)
        if not p.is_absolute():
            p = ROOT / raw
        if not p.is_file():
            print(f"  introuvable : {raw}", file=sys.stderr)
            continue
        changed, why = update_one(p, args.date, args.bump_modified)
        mark = "✓" if changed else "·"
        print(f"  {mark} {p.relative_to(ROOT)} — {', '.join(why)}")
        if changed:
            updated += 1

    print(f"\n{updated} fichier(s) modifié(s).")

    if updated and not args.no_rebuild:
        print("Rebuild audit de fraîcheur…")
        subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "audit_freshness.py")],
            check=False,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

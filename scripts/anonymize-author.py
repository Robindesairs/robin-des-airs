#!/usr/bin/env python3
"""Remplace 'Climbié Poiten' par 'l'équipe Robin des Airs' dans le blog.

- Byline visible <strong>Climbié Poiten</strong> -> <strong>l'équipe Robin des Airs</strong>
- Schema JSON-LD: author Person -> author Organization (Robin des Airs)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

AUTHOR_PERSON_RE = re.compile(
    r'"author":\s*\{\s*"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*"Climbi[ée] Poiten"\s*,\s*"url"\s*:\s*"https://robindesairs\.eu/?"\s*\}'
)
AUTHOR_ORG_REPLACEMENT = (
    '"author":{"@type":"Organization","@id":"https://robindesairs.eu/#organization",'
    '"name":"Robin des Airs","url":"https://robindesairs.eu/"}'
)

BYLINE_RE = re.compile(r"<strong>\s*Climbi[ée] Poiten\s*</strong>")
BYLINE_REPLACEMENT = "<strong>l'équipe Robin des Airs</strong>"

PLAIN_NAME_RE = re.compile(r"Climbi[ée] Poiten")
PLAIN_NAME_REPLACEMENT = "l'équipe Robin des Airs"


def process(path: Path, dry_run: bool = False) -> dict:
    original = path.read_text(encoding="utf-8")
    if "Climbié Poiten" not in original and "Climbie Poiten" not in original:
        return {"path": path.name, "skipped": True}

    html = original

    html, n_author = AUTHOR_PERSON_RE.subn(AUTHOR_ORG_REPLACEMENT, html)
    html, n_byline = BYLINE_RE.subn(BYLINE_REPLACEMENT, html)
    html, n_plain = PLAIN_NAME_RE.subn(PLAIN_NAME_REPLACEMENT, html)

    changed = html != original
    if changed and not dry_run:
        path.write_text(html, encoding="utf-8")

    return {
        "path": path.name,
        "skipped": False,
        "changed": changed,
        "author_schema_fixed": n_author,
        "byline_fixed": n_byline,
        "plain_fallback": n_plain,
    }


def main() -> int:
    blog_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "blog")
    dry_run = "--dry-run" in sys.argv

    results = [process(f, dry_run=dry_run) for f in sorted(blog_dir.glob("*.html"))]
    changed = [r for r in results if not r["skipped"] and r["changed"]]
    skipped = [r for r in results if r["skipped"]]

    print(f"Total fichiers       : {len(results)}")
    print(f"  Sans 'Climbié'     : {len(skipped)}")
    print(f"  Modifiés           : {len(changed)}")
    if changed:
        print(f"  ↳ schema author    : {sum(r['author_schema_fixed'] for r in changed)}")
        print(f"  ↳ byline visible   : {sum(r['byline_fixed'] for r in changed)}")
        print(f"  ↳ texte brut       : {sum(r['plain_fallback'] for r in changed)}")
    if dry_run:
        print("\n(dry-run, aucun fichier écrit)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

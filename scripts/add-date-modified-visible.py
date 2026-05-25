#!/usr/bin/env python3
"""Ajoute la dateModified visible (ISO 8601) sous la byline de chaque article.

Lit la datePublished et dateModified du JSON-LD BlogPosting et :
- Si la byline existe déjà mais ne mentionne pas "Mis à jour", complète.
- Si pas de mention de date publiée, ajoute la ligne "Publié le X · Mis à jour le Y"
  dans un <p class="meta-date"> juste après le <h1>.

Ne touche pas aux articles dont la byline contient déjà "Mis à jour".
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

MONTHS_FR = {
    1: "janvier", 2: "février", 3: "mars", 4: "avril", 5: "mai", 6: "juin",
    7: "juillet", 8: "août", 9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre",
}


def format_fr(iso_date: str) -> str:
    try:
        d = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
    except ValueError:
        return iso_date
    return f"{d.day} {MONTHS_FR[d.month]} {d.year}"


BLOGPOSTING_RE = re.compile(
    r'<script\b[^>]*type="application/ld\+json"[^>]*>\s*(\{[^<]*?"@type"\s*:\s*"BlogPosting".*?\})\s*</script>',
    re.DOTALL,
)


def extract_dates(html: str) -> tuple[str | None, str | None]:
    m = BLOGPOSTING_RE.search(html)
    if not m:
        return None, None
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return None, None
    return data.get("datePublished"), data.get("dateModified")


def already_has_date_modified(html: str) -> bool:
    return "Mis à jour" in html


def already_has_byline(html: str) -> bool:
    return ('class="byline"' in html) or ('Publié le' in html) or ('Par <strong>' in html)


BYLINE_RE = re.compile(
    r'(<p[^>]*class="[^"]*\bbyline\b[^"]*"[^>]*>)(.*?)(</p>)',
    re.DOTALL,
)


PUBLIE_LINE_RE = re.compile(
    r'(<p[^>]*>Par <strong>[^<]+</strong>\s*[·\-]\s*Publi[ée] le[^<]*</p>)',
    re.DOTALL,
)


H1_RE = re.compile(r'(<h1[^>]*>.*?</h1>)', re.DOTALL)


def inject_in_byline(html: str, modified_fr: str, modified_iso: str) -> tuple[str, bool]:
    """Ajoute · Mis à jour le X dans une <p class='byline'>."""
    m = BYLINE_RE.search(html)
    if not m:
        return html, False
    inner = m.group(2)
    if "Mis à jour" in inner:
        return html, False
    addition = f' · Mis à jour le <time datetime="{modified_iso}">{modified_fr}</time>'
    new_inner = inner.rstrip() + addition
    new_html = html[: m.start()] + m.group(1) + new_inner + m.group(3) + html[m.end():]
    return new_html, True


def inject_in_publie_line(html: str, modified_fr: str, modified_iso: str) -> tuple[str, bool]:
    """Ajoute Mis à jour le X dans une ligne "Par X · Publié le Y"."""
    m = PUBLIE_LINE_RE.search(html)
    if not m:
        return html, False
    line = m.group(1)
    if "Mis à jour" in line:
        return html, False
    new_line = line.replace(
        "</p>",
        f' · Mis à jour le <time datetime="{modified_iso}">{modified_fr}</time></p>',
    )
    new_html = html[: m.start()] + new_line + html[m.end():]
    return new_html, True


def add_after_h1(html: str, published_fr: str, modified_fr: str, modified_iso: str) -> tuple[str, bool]:
    """Ajoute une <p> avec les dates juste après le <h1>."""
    m = H1_RE.search(html)
    if not m:
        return html, False
    extra = (
        f'\n    <p class="meta-date" style="font-size:.8125rem;color:#6B7280;margin:.25rem 0 1.25rem;font-weight:600">'
        f'Publié le {published_fr} · Mis à jour le <time datetime="{modified_iso}">{modified_fr}</time>'
        f'</p>'
    )
    new_html = html[: m.end()] + extra + html[m.end():]
    return new_html, True


def process(path: Path, dry_run: bool = False) -> dict:
    original = path.read_text(encoding="utf-8")

    if already_has_date_modified(original):
        return {"path": path.name, "skipped": True, "reason": "deja_mis_a_jour"}

    published, modified = extract_dates(original)
    if not modified:
        return {"path": path.name, "skipped": True, "reason": "pas_de_dateModified"}

    modified_fr = format_fr(modified)
    published_fr = format_fr(published) if published else modified_fr

    new_html, ok = inject_in_byline(original, modified_fr, modified)
    method = "byline"
    if not ok:
        new_html, ok = inject_in_publie_line(original, modified_fr, modified)
        method = "publie_line"
    if not ok:
        new_html, ok = add_after_h1(original, published_fr, modified_fr, modified)
        method = "after_h1"

    if not ok:
        return {"path": path.name, "skipped": True, "reason": "pas_de_point_insertion"}

    changed = new_html != original
    if changed and not dry_run:
        path.write_text(new_html, encoding="utf-8")

    return {
        "path": path.name,
        "skipped": False,
        "method": method,
        "modified_fr": modified_fr,
        "changed": changed,
    }


def main() -> int:
    blog_dir = Path(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "blog")
    dry_run = "--dry-run" in sys.argv

    results = [process(f, dry_run=dry_run) for f in sorted(blog_dir.glob("*.html"))]
    changed = [r for r in results if not r["skipped"] and r["changed"]]
    skipped: dict[str, int] = {}
    for r in results:
        if r["skipped"]:
            skipped[r["reason"]] = skipped.get(r["reason"], 0) + 1

    print(f"Total fichiers : {len(results)}")
    print(f"  Date ajoutée : {len(changed)}")
    for reason, n in sorted(skipped.items(), key=lambda x: -x[1]):
        print(f"  Skippé [{reason}] : {n}")
    if changed:
        from collections import Counter
        by_method = Counter(r["method"] for r in changed)
        print("  Méthode d'insertion :")
        for m, n in sorted(by_method.items()):
            print(f"    {m:15s} : {n}")
    if dry_run:
        print("\n(dry-run, aucun fichier écrit)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

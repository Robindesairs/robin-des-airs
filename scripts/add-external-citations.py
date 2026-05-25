#!/usr/bin/env python3
"""Ajoute des liens externes vers EUR-Lex et Curia (CJUE) pour les arrêts cités.

- Détecte les mentions d'arrêts CJUE (Sturgeon, Wallentin-Hermann, Nelson, etc.)
- Wrap la 1re occurrence dans un <a href="https://curia.europa.eu/..."> en gardant
  les occurrences suivantes intactes.
- Détecte "règlement CE 261/2004" / "CE 261/2004" → lien vers EUR-Lex (1re occurrence).
- Ignore les mentions déjà à l'intérieur d'un <a>, d'un <script>, d'un <style>
  ou d'un attribut HTML.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Mapping nom court d'arrêt -> URL Curia officielle (numéro d'affaire)
ARRET_LINKS: dict[str, str] = {
    "Sturgeon": "https://curia.europa.eu/juris/liste.jsf?num=C-402/07",
    "Wallentin-Hermann": "https://curia.europa.eu/juris/liste.jsf?num=C-549/07",
    "Wallentin": "https://curia.europa.eu/juris/liste.jsf?num=C-549/07",
    "Nelson": "https://curia.europa.eu/juris/liste.jsf?num=C-581/10",
    "Krüsemann": "https://curia.europa.eu/juris/liste.jsf?num=C-195/17",
    "Krusemann": "https://curia.europa.eu/juris/liste.jsf?num=C-195/17",
    "TUIfly": "https://curia.europa.eu/juris/liste.jsf?num=C-195/17",
    "Folkerts": "https://curia.europa.eu/juris/liste.jsf?num=C-11/11",
    "Krijgsman": "https://curia.europa.eu/juris/liste.jsf?num=C-302/16",
    "McDonagh": "https://curia.europa.eu/juris/liste.jsf?num=C-12/11",
    "Wegener": "https://curia.europa.eu/juris/liste.jsf?num=C-537/17",
    "Peskova": "https://curia.europa.eu/juris/liste.jsf?num=C-315/15",
    "Van der Lans": "https://curia.europa.eu/juris/liste.jsf?num=C-257/14",
    "Eglītis": "https://curia.europa.eu/juris/liste.jsf?num=C-294/10",
    "Eglititis": "https://curia.europa.eu/juris/liste.jsf?num=C-294/10",
    "IATA": "https://curia.europa.eu/juris/liste.jsf?num=C-344/04",
    "Airhelp": "https://curia.europa.eu/juris/liste.jsf?num=C-28/20",
    "AirHelp": "https://curia.europa.eu/juris/liste.jsf?num=C-28/20",
    "Cuadrench Moré": "https://curia.europa.eu/juris/liste.jsf?num=C-139/11",
    "Cuadrench More": "https://curia.europa.eu/juris/liste.jsf?num=C-139/11",
}

CE261_URL = (
    "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32004R0261"
)

MONTREAL_URL = (
    "https://www.icao.int/secretariat/legal/list%20of%20parties/mtl99_fr.pdf"
)

# Plages à ignorer (script, style, balises, attributs)
SKIP_BLOCK_RE = re.compile(
    r"<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>|<a\b[^>]*>.*?</a>",
    re.DOTALL | re.IGNORECASE,
)


def split_protected(html: str) -> list[tuple[str, bool]]:
    """Sépare le HTML en (texte, protected?) pour traiter uniquement le contenu libre."""
    parts: list[tuple[str, bool]] = []
    last = 0
    for m in SKIP_BLOCK_RE.finditer(html):
        if m.start() > last:
            parts.append((html[last : m.start()], False))
        parts.append((m.group(0), True))
        last = m.end()
    if last < len(html):
        parts.append((html[last:], False))
    return parts


def wrap_first(segment: str, term: str, href: str, label: str | None = None) -> tuple[str, int]:
    """Wrap la 1re occurrence de 'term' dans un <a href> avec rel/target externes.

    Le matching évite les attributs HTML en s'appuyant sur des frontières simples.
    """
    pattern = re.compile(
        r"(?<![A-Za-z0-9_\-/])(" + re.escape(term) + r")(?![A-Za-z0-9_\-])",
    )
    replaced = {"count": 0}
    show = label or "\\1"

    def _sub(m: re.Match) -> str:
        if replaced["count"]:
            return m.group(0)
        replaced["count"] += 1
        text = label or m.group(1)
        return f'<a href="{href}" target="_blank" rel="noopener external">{text}</a>'

    new_segment = pattern.sub(_sub, segment, count=1)
    return new_segment, replaced["count"]


def process(path: Path, dry_run: bool = False) -> dict:
    original = path.read_text(encoding="utf-8")
    parts = split_protected(original)
    total: dict[str, int] = {}

    for i, (segment, protected) in enumerate(parts):
        if protected:
            continue
        # CE 261 + variations
        if "EUR-Lex" not in segment and "eur-lex" not in segment:
            for term in [
                "règlement CE 261/2004",
                "règlement (CE) n° 261/2004",
                "règlement (CE) nº 261/2004",
                "règlement (CE) n°261/2004",
                "Règlement CE 261/2004",
                "règlement CE 261",
                "CE 261/2004",
            ]:
                segment, n = wrap_first(segment, term, CE261_URL)
                if n:
                    total["CE 261"] = total.get("CE 261", 0) + n
                    break

        # Arrêts CJUE
        for term, url in ARRET_LINKS.items():
            if term in segment:
                segment, n = wrap_first(segment, term, url)
                if n:
                    total[term] = total.get(term, 0) + n

        # Convention de Montréal
        if "Convention de Montréal" in segment and "icao.int" not in segment:
            segment, n = wrap_first(segment, "Convention de Montréal", MONTREAL_URL)
            if n:
                total["Convention de Montréal"] = total.get("Convention de Montréal", 0) + n

        parts[i] = (segment, protected)

    new_html = "".join(s for s, _ in parts)
    changed = new_html != original

    if changed and not dry_run:
        path.write_text(new_html, encoding="utf-8")

    return {
        "path": path.name,
        "changed": changed,
        "links_added": sum(total.values()),
        "by_term": total,
    }


def main() -> int:
    blog_dir = Path(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "blog")
    dry_run = "--dry-run" in sys.argv

    results = [process(f, dry_run=dry_run) for f in sorted(blog_dir.glob("*.html"))]
    changed = [r for r in results if r["changed"]]

    print(f"Total fichiers : {len(results)}")
    print(f"  Modifiés     : {len(changed)}")
    if changed:
        total_links = sum(r["links_added"] for r in changed)
        print(f"  Liens ajoutés : {total_links}")
        agg: dict[str, int] = {}
        for r in changed:
            for k, v in r["by_term"].items():
                agg[k] = agg.get(k, 0) + v
        print("  Par terme :")
        for k, v in sorted(agg.items(), key=lambda x: -x[1]):
            print(f"    {k:30s} : {v}")
    if dry_run:
        print("\n(dry-run, aucun fichier écrit)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

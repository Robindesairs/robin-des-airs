#!/usr/bin/env python3
"""Ajoute un bloc "Réponse rapide" (2 phrases) en tête de chaque article.

Stratégie : reprend les 1-2 premières phrases significatives du <div id="blog-body">
en filtrant les phrases trop courtes ou décoratives. Le bloc est ajouté JUSTE AVANT
l'aside.tldr (ou à défaut, juste après le h1/meta).

L'idée n'est pas de "résumer" (impossible sans LLM) mais d'extraire un answer-first
visible que Google AI Overviews et Perplexity peuvent grab directement.

Ne touche pas aux articles qui ont déjà un bloc .quick-answer.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

QUICK_ANSWER_CSS = """
.quick-answer{margin:0 0 1.25rem;padding:1.1rem 1.25rem;border-radius:.625rem;background:linear-gradient(135deg,#FEF3C7 0%,#FED7AA 100%);border:1px solid #F59E0B;box-shadow:0 1px 3px rgba(245,158,11,.12)}
.quick-answer .qa-label{display:inline-block;background:#F59E0B;color:#0B1F3A;font-size:.6875rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;padding:.15rem .55rem;border-radius:.25rem;margin-bottom:.55rem}
.quick-answer p{margin:0;font-size:.9375rem;line-height:1.55;color:#0B1F3A;font-weight:500}
.quick-answer p strong{color:#92400E;font-weight:700}
"""

BLOG_BODY_RE = re.compile(
    r'<div\s+id="blog-body"[^>]*>(.*?)</div>',
    re.DOTALL,
)

# Pour split en paragraphes : prend les <p>...</p> qui ne sont pas dans
# une .ok-box/.warn-box/.info-box/.step-box et qui ont du contenu.
P_TAG_RE = re.compile(r"<p>(.*?)</p>", re.DOTALL)


def strip_html_inline(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s).strip()


def is_too_short(text: str) -> bool:
    return len(text) < 60


def is_decorative(text: str) -> bool:
    low = text.lower().strip()
    return (
        low.startswith("→")
        or low.startswith("voir :")
        or low.startswith("voir:")
        or low.startswith("voir ")
        or low.startswith("source :")
        or low.startswith("source:")
        or low == ""
    )


def extract_first_two_sentences(html: str) -> str | None:
    """Retourne les 1-2 premières phrases du body de l'article, gardant le HTML inline."""
    m = BLOG_BODY_RE.search(html)
    if not m:
        return None
    body = m.group(1)

    # Récupère les <p> dans l'ordre. On garde le contenu HTML pour conserver les liens
    # et le <strong>, mais on filtre les paragraphes courts/décoratifs.
    for p_match in P_TAG_RE.finditer(body):
        content = p_match.group(1).strip()
        text = strip_html_inline(content)
        if is_too_short(text) or is_decorative(text):
            continue
        # Coupe au max sur 2 phrases ou ~280 caractères.
        sentences = re.split(r"(?<=[.!?])\s+(?=[A-ZÀ-Ÿ])", content)
        chosen = sentences[0]
        if len(strip_html_inline(chosen)) < 100 and len(sentences) > 1:
            chosen = sentences[0] + " " + sentences[1]
        # Plafond de longueur visuelle.
        if len(chosen) > 380:
            # On coupe sur le dernier point dans la limite.
            cut = chosen.rfind(". ", 0, 380)
            if cut > 200:
                chosen = chosen[: cut + 1]
        return chosen.strip()
    return None


def already_has_quick_answer(html: str) -> bool:
    return 'class="quick-answer"' in html


def inject_css(html: str) -> tuple[str, bool]:
    if ".quick-answer" in html:
        return html, False
    style_end = html.find("</style>")
    if style_end == -1:
        return html, False
    return html[:style_end] + QUICK_ANSWER_CSS + html[style_end:], True


def build_block(snippet: str) -> str:
    return (
        '    <aside class="quick-answer" role="complementary" aria-label="Réponse rapide">\n'
        '      <span class="qa-label">Réponse rapide</span>\n'
        f"      <p>{snippet}</p>\n"
        "    </aside>\n"
    )


def insert_block(html: str, block: str) -> tuple[str, str | None]:
    """Insère le bloc juste avant <aside class="tldr"> si présent, sinon avant <div id="blog-body">."""
    if '<aside class="tldr"' in html:
        new = html.replace('<aside class="tldr"', block + '    <aside class="tldr"', 1)
        return new, "before_tldr"
    if '<div id="blog-body"' in html:
        new = html.replace('<div id="blog-body"', block + '    <div id="blog-body"', 1)
        return new, "before_body"
    return html, None


def process(path: Path, dry_run: bool = False) -> dict:
    original = path.read_text(encoding="utf-8")
    if already_has_quick_answer(original):
        return {"path": path.name, "skipped": True, "reason": "deja_quick_answer"}

    snippet = extract_first_two_sentences(original)
    if not snippet:
        return {"path": path.name, "skipped": True, "reason": "pas_de_paragraphe_extrait"}

    new_html, css_added = inject_css(original)
    new_html, method = insert_block(new_html, build_block(snippet))
    if not method:
        return {"path": path.name, "skipped": True, "reason": "pas_de_point_insertion"}

    changed = new_html != original
    if changed and not dry_run:
        path.write_text(new_html, encoding="utf-8")

    return {
        "path": path.name,
        "skipped": False,
        "method": method,
        "snippet_length": len(strip_html_inline(snippet)),
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
    print(f"  Quick-answer ajouté : {len(changed)}")
    for reason, n in sorted(skipped.items(), key=lambda x: -x[1]):
        print(f"  Skippé [{reason}] : {n}")
    if changed:
        from collections import Counter
        by_method = Counter(r["method"] for r in changed)
        print("  Méthode d'insertion :")
        for m, n in sorted(by_method.items()):
            print(f"    {m:15s} : {n}")
        avg_len = sum(r["snippet_length"] for r in changed) / len(changed)
        print(f"  Longueur moyenne : {avg_len:.0f} caractères")
    if dry_run:
        print("\n(dry-run, aucun fichier écrit)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

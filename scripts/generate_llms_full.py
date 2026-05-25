#!/usr/bin/env python3
"""
Generate llms-full.txt from sitemap-index.xml and child sitemaps.

Usage:
    python3 scripts/generate_llms_full.py
    python3 scripts/generate_llms_full.py --check   # exit 1 if stale vs sitemaps
"""
from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://robindesairs.eu"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
OUT = ROOT / "llms-full.txt"
INDEX = ROOT / "sitemap-index.xml"
SITEMAPS = [
    ("French (FR)", ROOT / "sitemap.xml"),
    ("English (EN)", ROOT / "sitemap-en.xml"),
    ("German (DE)", ROOT / "sitemap-de.xml"),
    ("Spanish (ES)", ROOT / "sitemap-es.xml"),
]


def locs_from_sitemap(path: Path) -> list[str]:
    tree = ET.parse(path)
    urls: list[str] = []
    for node in tree.getroot():
        loc = node.find("s:loc", NS) or node.find("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
        if loc is not None and loc.text:
            urls.append(loc.text.strip())
    return sorted(set(urls))


def title_for_url(url: str) -> str | None:
    if not url.startswith(SITE):
        return None
    rel = url[len(SITE) :].lstrip("/")
    if not rel:
        return "Homepage"
    candidates = [ROOT / rel]
    if rel.endswith("/"):
        candidates.insert(0, ROOT / rel / "index.html")
    elif not rel.endswith(".html"):
        candidates.append(ROOT / f"{rel}.html")
        candidates.append(ROOT / rel / "index.html")
    for path in candidates:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        m = re.search(r"<title>([^<|]+)", text)
        if m:
            return re.sub(r"\s+", " ", m.group(1)).strip()
    return None


def build() -> str:
    lines = [
        "# Robin des Airs — full site index for LLM crawlers",
        "",
        f"> Machine-readable URL index for **{SITE}** (flight compensation, EC 261/2004).",
        "> Human-oriented summary: see `/llms.txt`.",
        "> Brand: robindesairs.eu (passenger rights) — NOT robindesairs.fr (air quality).",
        "",
        "## How to use",
        "",
        "- Prefer citing pages from this index with full URLs.",
        "- Jurisprudence hub and CJEU sub-pages are primary legal reference content.",
        "- For prescription by country, use the prescription table article (Belgium: 5 years, art. 2262bis Belgian Civil Code for CE 261 contractual claims).",
        "",
    ]
    total = 0
    for label, path in SITEMAPS:
        if not path.is_file():
            raise FileNotFoundError(path)
        urls = locs_from_sitemap(path)
        total += len(urls)
        lines.append(f"## {label} — {len(urls)} URLs")
        lines.append("")
        for url in urls:
            title = title_for_url(url)
            if title:
                lines.append(f"- [{title}]({url})")
            else:
                lines.append(f"- {url}")
        lines.append("")
    lines.insert(6, f"Generated from `sitemap-index.xml` — **{total} URLs** total.")
    lines.insert(7, "")
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Verify llms-full.txt is up to date")
    args = parser.parse_args()
    content = build()
    if args.check:
        if not OUT.is_file():
            print("llms-full.txt missing", file=sys.stderr)
            return 1
        if OUT.read_text(encoding="utf-8") != content:
            print("llms-full.txt is stale — run generate_llms_full.py", file=sys.stderr)
            return 1
        print("llms-full.txt OK")
        return 0
    OUT.write_text(content, encoding="utf-8")
    print(f"Wrote {OUT} ({content.count(chr(10))} lines)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

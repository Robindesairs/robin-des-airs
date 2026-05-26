"""
Inject contextual cross-links into existing blog articles, pointing to the
new LOT 1 (GOTCHA AEO), LOT 2 (companies) and LOT 3 (hub guides) articles.

Idempotent: each article gets a single <aside> block with marker
<!-- RDA-RELATED-V1 -->. Re-running the script will skip already-injected files.
"""

from pathlib import Path

MARKER = "<!-- RDA-RELATED-V1 -->"

# {target_article_filename: [(slug, label), ...]}
# Targets are existing articles, slugs are the new articles to link to.
LINKS = {
    # === Compagnies non-EU → meta GOTCHA + hub ===
    "ethiopian-airlines-vol-retarde-indemnite.html": [
        ("ce261-compagnies-non-eu-emirates-turkish-qatar", "CE 261 et compagnies non-UE : règle complète"),
        ("guide-correspondance-add-vers-afrique-ce261", "Guide correspondance Addis-Abeba ADD"),
        ("comparatif-10-hubs-afrique-ce261-fiabilite-retards", "Comparatif des 10 hubs vers l'Afrique"),
    ],
    "turkish-airlines-vol-retarde-indemnite.html": [
        ("ce261-compagnies-non-eu-emirates-turkish-qatar", "CE 261 et compagnies non-UE : règle complète"),
        ("guide-correspondance-ist-vers-afrique-ce261", "Guide correspondance Istanbul IST"),
        ("comparatif-10-hubs-afrique-ce261-fiabilite-retards", "Comparatif des 10 hubs vers l'Afrique"),
    ],
    "royal-air-maroc-vol-retarde-indemnite.html": [
        ("guide-correspondance-cas-vers-afrique-ce261", "Guide correspondance Casablanca CAS"),
        ("comparatif-10-hubs-afrique-ce261-fiabilite-retards", "Comparatif des 10 hubs vers l'Afrique"),
        ("ce261-compagnies-non-eu-emirates-turkish-qatar", "CE 261 et compagnies non-UE"),
    ],
    "tap-air-portugal-vol-retarde-indemnite.html": [
        ("guide-correspondance-lis-vers-afrique-ce261", "Guide correspondance Lisbonne LIS"),
        ("comparatif-10-hubs-afrique-ce261-fiabilite-retards", "Comparatif des 10 hubs vers l'Afrique"),
    ],
    "vol-air-france-retarde-indemnite.html": [
        ("guide-correspondance-cdg-vers-afrique-ce261", "Guide correspondance Paris CDG vers l'Afrique"),
    ],
    "brussels-airlines-vol-retarde-indemnite.html": [
        ("guide-correspondance-bru-vers-afrique-ce261", "Guide correspondance Bruxelles BRU"),
    ],

    # === Compagnies africaines existantes → comparatif + meta ===
    "air-senegal-vol-retarde-indemnite.html": [
        ("comparatif-10-hubs-afrique-ce261-fiabilite-retards", "Comparatif des 10 hubs vers l'Afrique"),
        ("ce261-compagnies-non-eu-emirates-turkish-qatar", "CE 261 et compagnies non-UE"),
    ],
    "asky-airlines-vol-retarde-indemnite.html": [
        ("comparatif-10-hubs-afrique-ce261-fiabilite-retards", "Comparatif des 10 hubs vers l'Afrique"),
        ("guide-correspondance-add-vers-afrique-ce261", "Hub Addis-Abeba (partenaire ASKY)"),
    ],
    "south-african-airways-vol-retarde-indemnite.html": [
        ("comparatif-10-hubs-afrique-ce261-fiabilite-retards", "Comparatif des 10 hubs vers l'Afrique"),
        ("ce261-compagnies-non-eu-emirates-turkish-qatar", "CE 261 et compagnies non-UE"),
    ],
    "air-cote-divoire-vol-retarde-indemnite.html": [
        ("comparatif-10-hubs-afrique-ce261-fiabilite-retards", "Comparatif des 10 hubs vers l'Afrique"),
        ("guide-correspondance-cdg-vers-afrique-ce261", "Guide correspondance CDG vers l'Afrique"),
    ],
    "air-peace-nigeria-vol-retarde-indemnite.html": [
        ("comparatif-10-hubs-afrique-ce261-fiabilite-retards", "Comparatif des 10 hubs vers l'Afrique"),
        ("ce261-compagnies-non-eu-emirates-turkish-qatar", "CE 261 et compagnies non-UE"),
    ],

    # === Articles "vol retardé destination Afrique" → guide CDG + billet unique ===
    "vol-retarde-dakar-paris-indemnite.html": [
        ("guide-correspondance-cdg-vers-afrique-ce261", "Guide correspondance Paris CDG"),
        ("billet-unique-vs-billets-separes-ce261-correspondance", "Billet unique vs billets séparés"),
    ],
    "vol-retarde-abidjan-paris-indemnite.html": [
        ("guide-correspondance-cdg-vers-afrique-ce261", "Guide correspondance Paris CDG"),
        ("billet-unique-vs-billets-separes-ce261-correspondance", "Billet unique vs billets séparés"),
    ],
    "vol-retarde-bamako-paris-indemnite.html": [
        ("guide-correspondance-cdg-vers-afrique-ce261", "Guide correspondance Paris CDG"),
        ("billet-unique-vs-billets-separes-ce261-correspondance", "Billet unique vs billets séparés"),
    ],
    "vol-retarde-douala-paris-indemnite.html": [
        ("guide-correspondance-cdg-vers-afrique-ce261", "Guide correspondance Paris CDG"),
        ("billet-unique-vs-billets-separes-ce261-correspondance", "Billet unique vs billets séparés"),
    ],
    "vol-retarde-yaounde-paris-indemnite.html": [
        ("guide-correspondance-cdg-vers-afrique-ce261", "Guide correspondance Paris CDG"),
        ("billet-unique-vs-billets-separes-ce261-correspondance", "Billet unique vs billets séparés"),
    ],
    "vol-retarde-ouagadougou-paris-indemnite.html": [
        ("guide-correspondance-cdg-vers-afrique-ce261", "Guide correspondance Paris CDG"),
        ("billet-unique-vs-billets-separes-ce261-correspondance", "Billet unique vs billets séparés"),
    ],
    "vol-retarde-tunis-paris-indemnite.html": [
        ("guide-correspondance-cdg-vers-afrique-ce261", "Guide correspondance Paris CDG"),
        ("tunisair-vol-retarde-indemnite", "Tunisair : vos droits"),
    ],

    # === Articles "correspondance/escale" existants → meta GOTCHA ===
    "correspondance-manquee-indemnite-vol.html": [
        ("correspondance-ratee-a-qui-reclamer-ce261-folkerts", "Correspondance ratée : à qui réclamer ? (arrêt Folkerts)"),
        ("billet-unique-vs-billets-separes-ce261-correspondance", "Billet unique vs billets séparés"),
        ("comparatif-10-hubs-afrique-ce261-fiabilite-retards", "Comparatif des 10 hubs vers l'Afrique"),
    ],
    "arret-folkerts-correspondance-cjue.html": [
        ("correspondance-ratee-a-qui-reclamer-ce261-folkerts", "Application pratique de l'arrêt Folkerts : à qui réclamer"),
        ("billet-unique-vs-billets-separes-ce261-correspondance", "Billet unique vs billets séparés"),
    ],
    "arret-sturgeon-3h-retard-jurisprudence.html": [
        ("correspondance-ratee-a-qui-reclamer-ce261-folkerts", "Arrêt Folkerts : la correspondance ratée"),
    ],
    "code-share-air-france-klm-quelle-compagnie-recours.html": [
        ("correspondance-ratee-a-qui-reclamer-ce261-folkerts", "Correspondance ratée : à qui réclamer ?"),
        ("billet-unique-vs-billets-separes-ce261-correspondance", "Billet unique vs billets séparés"),
    ],
}


def build_block(links):
    items = "\n      ".join(
        f'<li><a href="/blog/{slug}.html" style="color:#0B1F3A;text-decoration:underline">{label}</a></li>'
        for slug, label in links
    )
    return f"""{MARKER}
    <aside aria-label="Articles complementaires" style="margin:2.5rem auto;padding:1.5rem 1.75rem;background:#FFF7ED;border-left:4px solid #F97316;border-radius:8px;max-width:780px;font-family:'Montserrat',sans-serif">
      <h2 style="margin:0 0 .75rem;font-size:1.1rem;color:#9A3412;font-weight:700">Pour aller plus loin</h2>
      <ul style="margin:0;padding-left:1.25rem;line-height:1.8;font-size:.98rem">
      {items}
      </ul>
    </aside>
"""


def inject(path: Path, links):
    html = path.read_text(encoding="utf-8")
    if MARKER in html:
        return "SKIP_ALREADY_INJECTED"

    block = build_block(links)

    if "</main>" in html:
        new_html = html.replace("</main>", block + "  </main>", 1)
    elif "</body>" in html:
        new_html = html.replace("</body>", block + "</body>", 1)
    else:
        return "NO_INSERT_POINT"

    path.write_text(new_html, encoding="utf-8")
    return "OK"


def main():
    root = Path("blog")
    if not root.is_dir():
        raise SystemExit("blog/ directory not found (run from repo root)")

    stats = {"OK": 0, "SKIP_ALREADY_INJECTED": 0, "NO_INSERT_POINT": 0, "MISSING": 0}
    for target, links in LINKS.items():
        p = root / target
        if not p.exists():
            print(f"  [MISSING] {target}")
            stats["MISSING"] += 1
            continue
        result = inject(p, links)
        print(f"  [{result}] {target} ({len(links)} links)")
        stats[result] += 1

    print()
    print(f"Resultats : {stats}")


if __name__ == "__main__":
    main()

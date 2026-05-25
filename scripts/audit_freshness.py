#!/usr/bin/env python3
"""
Audit de fraîcheur du contenu — vérifie tous les 2/4/6 mois selon la criticité.

Lit chaque article et détermine :
- la date de dernière revue (meta `article:reviewed` si présent, sinon `dateModified`
  du JSON-LD BlogPosting, sinon `datePublished`)
- son tier de revue selon le thème :
    Tier 1 (60 jours) : essentiel + recours + jurisprudence
    Tier 2 (120 jours) : annule, retard, surbooking, bagage, circonstances,
                         frais, passagers, routes, compagnies
    Tier 3 (180 jours) : conseils
- son statut : ok / due-soon (≤ 7 jours) / overdue

Sorties :
- data/freshness.json (cache structuré)
- docs/freshness-report.md (rapport markdown lisible)
- console summary

Options :
    --check     exit 1 si au moins 1 article est overdue (utile pour cron)
    --whatsapp  envoie un récap au numéro WHATSAPP_AUDIT_PHONE via WATI
    --json-only ne génère que data/freshness.json (pas de markdown)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://robindesairs.eu"
DATA_DIR = ROOT / "data"
DOCS_DIR = ROOT / "docs"
JSON_OUT = DATA_DIR / "freshness.json"
MD_OUT = DOCS_DIR / "freshness-report.md"

TIER_DAYS = {1: 60, 2: 120, 3: 180}
TIER_LABEL = {1: "Critique (60 j)", 2: "Standard (120 j)", 3: "Conseils (180 j)"}

# Mapping thème -> tier (réutilise la catégorisation de build_blog_index.py)
THEME_TIER = {
    "essentiel": 1,
    "recours": 1,
    "jurisprudence": 1,
    "annule": 2,
    "retard": 2,
    "surbooking": 2,
    "bagage": 2,
    "extraordinaires": 2,
    "frais": 2,
    "passagers": 2,
    "routes_afrique": 2,
    "routes_int": 2,
    "compagnies": 2,
    "conseils": 3,
}

ESSENTIEL_SET = {
    "reglementation-ce261-resume", "indemnite-vol-montants-250-400-600",
    "guide-ce261-droits-passagers-afrique", "ce261-vs-convention-montreal",
    "compagnies-eu-non-eu-ce261-tableau", "ce261-nationalite-residence-qui-peut-reclamer",
    "operating-vs-marketing-carrier-ce261", "uk261-vs-ce261-guide-brexit",
    "classe-business-economique-indemnite-ce261", "vol-direct-vs-correspondance-droits-ce261",
    "correspondance-manquee-indemnite-vol", "mediation-aerienne-obligatoire-2026",
    "code-share-air-france-klm-quelle-compagnie-recours",
}
CONSEILS_SET = {
    "bagage-cabine-ryanair-payant-2026", "carte-embarquement-perdue-recuperer-indemnite",
    "dossiers-types-robin-cas-reels-anonymises",
    "pourquoi-choisir-robin-des-airs-difference",
    "robin-des-airs-vs-airhelp-comparatif", "robin-des-airs-vs-flightright-comparatif",
    "robin-des-airs-vs-skycop-comparatif", "surclassement-gratuit-avion-7-facteurs",
}
RECOURS_SET = {
    "assurance-voyage-vs-indemnite-ce261-difference",
    "protection-juridique-habitation-vol-retarde-ce261",
}


def categorize_fr(slug: str) -> str:
    s = slug
    if s in ESSENTIEL_SET: return "essentiel"
    if s in RECOURS_SET: return "recours"
    if s in CONSEILS_SET: return "conseils"
    if s.startswith("arret-") or s == "jurisprudence-ce261-arrets-cjue": return "jurisprudence"
    if any(s.startswith(p) for p in [
        "compagnie-refuse", "mediation-", "lettre-mise-en-demeure", "mise-en-demeure",
        "formulaire-petite-creance", "saisir-mediateur", "prescription-",
        "combien-temps-reclamer", "reclamer-seul",
    ]): return "recours"
    if "vol-annule" in s or s.startswith("remboursement-billet") or s.startswith("refuser-avoir"):
        return "annule"
    if "surbooking" in s or "refus-embarquement" in s: return "surbooking"
    if "bagage" in s or s == "securiser-bagage-aeroport-conseils-voyageur": return "bagage"
    if (s.startswith("greve-") or "circonstances-extraordinaires" in s
            or "vol-annule-meteo" in s or "vol-deroutement" in s
            or s == "harmattan-vol-afrique-retard-saison"):
        return "extraordinaires"
    if any(s.startswith(p) for p in [
        "ce261-bebe", "enfant-non-accompagne", "indemnite-vol-famille",
        "indemnite-vol-retarde-famille", "pmr-", "business-class-premium",
        "rentree-universitaire", "vol-pelerinage", "vol-ramadan",
        "vol-mariage-traditionnel", "vol-deces", "voyage-organise-package",
        "vol-charter",
    ]): return "passagers"
    if any(s.startswith(p) for p in [
        "remboursement-frais", "frais-caches", "downgrade-",
        "indemnite-billet-miles", "bon-achat",
    ]): return "frais"
    routes_hors_afrique = ["montreal", "new-york", "cayenne", "antilles", "reunion",
                           "ile-maurice", "lyon-marseille-nice"]
    if any(f"vol-retarde-{r}" in s for r in routes_hors_afrique) or "vol-depart-usa" in s:
        return "routes_int"
    if any(s.startswith(p) for p in [
        "vol-retarde-nuit", "preuves-retard", "preuve-retard",
        "justificatif-retard", "que-faire-aeroport", "retards-vol-noel",
        "chiffres-choc", "delai-paiement",
    ]): return "retard"
    compagnies_kw = ["air-france", "klm", "lufthansa", "ryanair", "turkish", "ethiopian",
                     "royal-air-maroc", "brussels-airlines", "corsair", "asky", "air-peace",
                     "air-senegal", "air-cote-divoire", "tap-air-portugal", "south-african",
                     "rwandair", "uganda-airlines", "transavia", "taag-angola", "kenya-airways"]
    if any(k in s for k in compagnies_kw) or s in (
            "vol-air-france-retarde-indemnite", "vol-retarde-ryanair-indemnite"):
        return "compagnies"
    if (s.startswith("vol-retarde-") and s.endswith("-indemnite")) or s == "vol-retarde-abidjan-dakar-comparatif":
        return "routes_afrique"
    return "conseils"


def categorize_translated(slug: str) -> str:
    """Heuristique de catégorisation pour EN/DE/ES (slugs différents)."""
    s = slug.lower()
    if "jurisprudence" in s or "ruling" in s or "case-law" in s or "rechtsprechung" in s or "sturgeon" in s:
        return "jurisprudence"
    if any(k in s for k in [
        "regulation-summary", "regulation-resumen", "verordnung-zusammen", "ec-261-rights",
        "passenger-rights", "ec-261-summary", "ec-261-guide",
    ]):
        return "essentiel"
    if any(k in s for k in ["claim", "prescription", "limitation", "complaint", "mediation"]):
        return "recours"
    if any(k in s for k in ["airline", "fluggesellschaft", "aerolinea", "compagnia"]):
        return "compagnies"
    return "annule"  # tier 2 par défaut


def tier_for(slug: str, lang: str) -> tuple[int, str]:
    if lang == "fr":
        theme = categorize_fr(slug)
    else:
        theme = categorize_translated(slug)
    return THEME_TIER.get(theme, 2), theme


META_REVIEWED_RE = re.compile(
    r'<meta\s+name=["\']article:reviewed["\']\s+content=["\'](\d{4}-\d{2}-\d{2})["\']',
    re.IGNORECASE,
)
DATE_MODIFIED_RE = re.compile(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"')
DATE_PUBLISHED_RE = re.compile(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"')
TITLE_RE = re.compile(r"<title>([^<|]+)", re.IGNORECASE)


def find_articles() -> list[tuple[Path, str]]:
    """Retourne [(path, lang), ...] pour tous les articles éligibles."""
    results: list[tuple[Path, str]] = []
    for lang, sub in (("fr", "blog"), ("en", "en/blog"), ("de", "de/blog"), ("es", "es/blog")):
        d = ROOT / sub
        if not d.is_dir():
            continue
        for p in sorted(d.glob("*.html")):
            if p.name == "index.html":
                continue
            results.append((p, lang))
    return results


@dataclass
class ArticleStatus:
    lang: str
    slug: str
    url: str
    title: str
    theme: str
    tier: int
    last_review: str          # YYYY-MM-DD
    source: str               # "reviewed" | "modified" | "published"
    age_days: int
    threshold_days: int
    overdue_days: int         # >0 si en retard
    status: str               # ok | due-soon | overdue


def extract_status(path: Path, lang: str, today: date) -> ArticleStatus:
    text = path.read_text(encoding="utf-8", errors="ignore")
    slug = path.stem
    rel = str(path.relative_to(ROOT))
    url = f"{SITE}/{rel}"

    m_title = TITLE_RE.search(text)
    title = re.sub(r"\s+", " ", m_title.group(1)).strip() if m_title else slug

    reviewed = META_REVIEWED_RE.search(text)
    modified = DATE_MODIFIED_RE.search(text)
    published = DATE_PUBLISHED_RE.search(text)
    if reviewed:
        last_str, source = reviewed.group(1), "reviewed"
    elif modified:
        last_str, source = modified.group(1), "modified"
    elif published:
        last_str, source = published.group(1), "published"
    else:
        last_str, source = today.isoformat(), "fallback-today"

    try:
        last_dt = datetime.strptime(last_str, "%Y-%m-%d").date()
    except ValueError:
        last_dt = today
        source = "fallback-today"

    tier, theme = tier_for(slug, lang)
    threshold = TIER_DAYS[tier]
    age = (today - last_dt).days
    overdue = max(0, age - threshold)
    if overdue > 0:
        status = "overdue"
    elif (threshold - age) <= 7:
        status = "due-soon"
    else:
        status = "ok"

    return ArticleStatus(
        lang=lang, slug=slug, url=url, title=title,
        theme=theme, tier=tier,
        last_review=last_dt.isoformat(), source=source,
        age_days=age, threshold_days=threshold,
        overdue_days=overdue, status=status,
    )


def render_markdown(items: list[ArticleStatus], today: date) -> str:
    by_status = {"overdue": [], "due-soon": [], "ok": []}
    for it in items:
        by_status[it.status].append(it)
    by_status["overdue"].sort(key=lambda x: (x.tier, -x.overdue_days, x.lang))
    by_status["due-soon"].sort(key=lambda x: (x.tier, x.threshold_days - x.age_days, x.lang))

    def group_by_tier(arr):
        groups: dict[int, list[ArticleStatus]] = {1: [], 2: [], 3: []}
        for x in arr:
            groups[x.tier].append(x)
        return groups

    lines: list[str] = []
    lines.append(f"# Audit de fraîcheur — {today.isoformat()}")
    lines.append("")
    lines.append(
        f"**{len(items)} articles** scannés "
        f"· **{len(by_status['overdue'])} en retard** "
        f"· **{len(by_status['due-soon'])} dus dans 7 jours** "
        f"· **{len(by_status['ok'])} à jour**"
    )
    lines.append("")
    lines.append(
        "_Tiers : T1 = 60 j (essentiel, recours, jurisprudence)_  ·  "
        "_T2 = 120 j (routes, compagnies, cas particuliers, etc.)_  ·  "
        "_T3 = 180 j (conseils)_"
    )
    lines.append("")
    lines.append(
        "_Pour marquer un article comme revu :_ `python3 scripts/mark_reviewed.py blog/<slug>.html`"
    )
    lines.append("")

    if by_status["overdue"]:
        lines.append("## En retard — à revoir en priorité")
        lines.append("")
        for tier, arr in group_by_tier(by_status["overdue"]).items():
            if not arr:
                continue
            lines.append(f"### Tier {tier} — {TIER_LABEL[tier]} ({len(arr)})")
            lines.append("")
            for it in arr:
                flag = f" :flag-{it.lang}:" if it.lang != "fr" else ""
                lines.append(
                    f"- **+{it.overdue_days} j** · [{it.title}]({it.url}){flag} "
                    f"— {it.theme}, dernière revue : {it.last_review} ({it.source})"
                )
            lines.append("")

    if by_status["due-soon"]:
        lines.append("## Dus dans 7 jours")
        lines.append("")
        for it in by_status["due-soon"]:
            remaining = it.threshold_days - it.age_days
            flag = f" :flag-{it.lang}:" if it.lang != "fr" else ""
            lines.append(
                f"- *J-{remaining}* · [{it.title}]({it.url}){flag} "
                f"— {it.theme}, T{it.tier}"
            )
        lines.append("")

    lines.append(f"## À jour — {len(by_status['ok'])} articles")
    lines.append("")
    lines.append(
        "_Masqués pour rester lisible. Tout le détail est dans `data/freshness.json`._"
    )
    lines.append("")
    return "\n".join(lines)


def render_whatsapp(items: list[ArticleStatus], today: date) -> str:
    overdue = [x for x in items if x.status == "overdue"]
    soon = [x for x in items if x.status == "due-soon"]
    overdue.sort(key=lambda x: (x.tier, -x.overdue_days))
    msg = []
    msg.append(f"📋 Robin des Airs — Audit fraîcheur {today.isoformat()}")
    msg.append("")
    msg.append(
        f"📊 {len(items)} articles · ⚠️ {len(overdue)} en retard · "
        f"⏳ {len(soon)} dus ≤7j"
    )
    if overdue:
        msg.append("")
        msg.append("🔴 TOP critiques :")
        for it in overdue[:5]:
            tag = "FR" if it.lang == "fr" else it.lang.upper()
            slug = it.slug[:48]
            msg.append(f"• T{it.tier} [{tag}] {slug} (+{it.overdue_days}j)")
        if len(overdue) > 5:
            msg.append(f"… et {len(overdue) - 5} autres")
    msg.append("")
    msg.append("📄 Détail : docs/freshness-report.md")
    return "\n".join(msg)


def send_whatsapp(message: str, phone: str) -> int:
    token = os.environ.get("WATI_API_TOKEN", "")
    base = os.environ.get("WATI_BASE_URL", "")
    if not token or not base:
        print("WATI_API_TOKEN ou WATI_BASE_URL manquant — pas d'envoi", file=sys.stderr)
        return 1
    try:
        import requests
    except ImportError:
        print("module `requests` requis pour --whatsapp (pip install requests)", file=sys.stderr)
        return 1
    url = f"{base.rstrip('/')}/api/v1/sendSessionMessage/{phone}"
    headers = {"Authorization": f"Bearer {token}", "accept": "*/*"}
    r = requests.post(url, headers=headers, params={"messageText": message}, timeout=30)
    print(f"WATI status: {r.status_code}")
    return 0 if r.status_code == 200 else 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="exit 1 si au moins 1 article est overdue")
    parser.add_argument("--whatsapp", action="store_true",
                        help="envoie un récap WhatsApp via WATI")
    parser.add_argument("--phone", default=os.environ.get("WHATSAPP_AUDIT_PHONE", "33756863630"),
                        help="numéro WhatsApp destinataire (défaut: 33756863630)")
    parser.add_argument("--json-only", action="store_true",
                        help="ne génère que data/freshness.json")
    parser.add_argument("--today", help="date forcée (YYYY-MM-DD) pour tests")
    args = parser.parse_args()

    today = datetime.strptime(args.today, "%Y-%m-%d").date() if args.today else date.today()
    items = [extract_status(p, lang, today) for p, lang in find_articles()]

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "generated_at": today.isoformat(),
        "tier_days": TIER_DAYS,
        "summary": {
            "total": len(items),
            "overdue": sum(1 for x in items if x.status == "overdue"),
            "due_soon": sum(1 for x in items if x.status == "due-soon"),
            "ok": sum(1 for x in items if x.status == "ok"),
        },
        "articles": [asdict(x) for x in items],
    }
    JSON_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")

    if not args.json_only:
        MD_OUT.write_text(render_markdown(items, today), encoding="utf-8")

    s = payload["summary"]
    print(
        f"[freshness] {s['total']} articles · "
        f"overdue={s['overdue']} · due_soon={s['due_soon']} · ok={s['ok']}"
    )

    if args.whatsapp:
        msg = render_whatsapp(items, today)
        send_whatsapp(msg, args.phone)

    if args.check and s["overdue"] > 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

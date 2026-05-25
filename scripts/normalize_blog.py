#!/usr/bin/env python3
"""
normalize_blog.py — Normalise les articles HTML du blog Robin des Airs vers
le template "récent / propre" (sans Tailwind résiduel) :

- CSS unifié (.wrap, .cta-box, .related, #blog-body, .faq, .byline)
- JSON-LD : author = Organization "Robin des Airs"
- Byline visible "Par l'équipe Robin des Airs · {date FR}"
- CTA principal -> https://robindesairs.eu/#funnel-box (+ WhatsApp)
- Section FAQ rendue visible si présente dans le JSON-LD FAQPage
- info-box / warn-box transformés en <blockquote>
- datePublished / dateModified étalés sur les 5 derniers mois (hash du slug)

Usage :
    python3 scripts/normalize_blog.py --dry-run blog/air-cote-divoire-vol-retarde-indemnite.html
    python3 scripts/normalize_blog.py --apply blog/*.html

En mode --dry-run : écrit le résultat dans <fichier>.preview.html à côté.
En mode --apply  : écrase chaque fichier en place (un backup .bak est créé si --backup).
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import sys
from datetime import date, timedelta

TODAY = date(2026, 5, 25)
SPREAD_DAYS = 152  # ~5 mois pour les articles

SITE_URL = "https://robindesairs.eu"

# ----------------------------- i18n config ------------------------------------

LANG_CONFIG: dict[str, dict] = {
    "fr": {
        "html_lang": "fr",
        "blog_dir": "blog",
        "url_blog_prefix": f"{SITE_URL}/blog",
        "nav_back": "← Retour",
        "byline_prefix": "Par",
        "byline_team": "l'équipe Robin des Airs",
        "byline_published": "Publié le",
        "byline_updated": "Mis à jour le",
        "cta_lead": "Prêt à récupérer votre indemnité ?",
        "cta_check": "Vérifier mon indemnité",
        "cta_check_url": f"{SITE_URL}/#funnel-box",
        "cta_whatsapp": "WhatsApp direct",
        "related_title": "Articles liés",
        "faq_title": "Questions fréquentes",
        "signature": (
            "Article rédigé et vérifié par <strong>l'équipe Robin des Airs</strong> "
            "(robindesairs.eu) — spécialistes des indemnités aériennes CE 261 sur l'axe Europe-Afrique. "
            "<span class=\"disambig\">À ne pas confondre avec d'autres entités utilisant un nom similaire "
            "dans le secteur environnemental.</span>"
        ),
        "disclaimer": (
            "<strong>Information générale.</strong> "
            "Cet article présente une synthèse pédagogique de la réglementation en vigueur (règlement CE 261/2004, "
            "Convention de Montréal, jurisprudence CJUE) à la date de publication. Il ne constitue pas un conseil "
            "juridique personnalisé ni une consultation d'avocat. Pour l'évaluation de votre situation individuelle, "
            "contactez Robin des Airs (mandat de représentation) ou un avocat spécialisé en droit aérien. "
            "Les montants, délais et exemples cités sont indicatifs et peuvent évoluer selon les décisions "
            "de justice et l'actualité réglementaire."
        ),
        "language_switcher_label": "EN",
        "language_switcher_alt": "Read this article in English",
        "default_related": [
            ("/blog/reglementation-ce261-resume.html", "Résumé du règlement CE 261/2004"),
            ("/blog/indemnite-vol-montants-250-400-600.html", "Montants 250 €, 400 €, 600 €"),
            ("/blog/reclamer-seul-ou-passer-par-un-service-indemnite-vol.html", "Réclamer seul ou se faire accompagner"),
        ],
        "breadcrumb_root": ("Robin des Airs", f"{SITE_URL}/"),
        "breadcrumb_blog": ("Blog", f"{SITE_URL}/blog/"),
        "mois_fr": [
            "janvier", "février", "mars", "avril", "mai", "juin",
            "juillet", "août", "septembre", "octobre", "novembre", "décembre",
        ],
    },
    "en": {
        "html_lang": "en",
        "blog_dir": "en/blog",
        "url_blog_prefix": f"{SITE_URL}/en/blog",
        "nav_back": "← Back",
        "byline_prefix": "By",
        "byline_team": "the Robin des Airs team",
        "byline_published": "Published on",
        "byline_updated": "Updated on",
        "cta_lead": "Ready to claim your compensation?",
        "cta_check": "Check my compensation",
        "cta_check_url": f"{SITE_URL}/#funnel-box",
        "cta_whatsapp": "WhatsApp direct",
        "related_title": "Related articles",
        "faq_title": "Frequently Asked Questions",
        "signature": (
            "Article written and verified by <strong>the Robin des Airs team</strong> "
            "(robindesairs.eu) — specialists in EC 261 flight compensation on the Europe-Africa axis. "
            "<span class=\"disambig\">Not to be confused with other entities using a similar name "
            "in the environmental sector.</span>"
        ),
        "disclaimer": (
            "<strong>General information.</strong> "
            "This article provides an educational summary of the regulations in force (Regulation (EC) No 261/2004, "
            "Montreal Convention, CJEU case law) at the date of publication. It does not constitute personalized "
            "legal advice or an attorney consultation. To assess your individual situation, contact Robin des Airs "
            "(representation mandate) or a lawyer specialized in aviation law. The amounts, deadlines and examples "
            "mentioned are indicative and may evolve according to court decisions and regulatory updates."
        ),
        "language_switcher_label": "FR",
        "language_switcher_alt": "Lire cet article en français",
        "default_related": [
            ("/en/blog/ec-261-regulation-summary.html", "EC 261/2004 regulation summary"),
            ("/en/blog/flight-compensation-amounts-250-400-600-eur.html", "Compensation amounts: €250, €400, €600"),
            ("/en/blog/airline-refuses-compensation-next-steps.html", "Airline refuses your claim: next steps"),
        ],
        "breadcrumb_root": ("Robin des Airs", f"{SITE_URL}/"),
        "breadcrumb_blog": ("Blog", f"{SITE_URL}/en/blog/"),
        "mois_fr": [  # mois EN
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ],
    },
    "de": {
        "html_lang": "de",
        "blog_dir": "de/blog",
        "url_blog_prefix": f"{SITE_URL}/de/blog",
        "nav_back": "← Zurück",
        "byline_prefix": "Von",
        "byline_team": "dem Team Robin des Airs",
        "byline_published": "Veröffentlicht am",
        "byline_updated": "Aktualisiert am",
        "cta_lead": "Bereit, Ihre Entschädigung einzufordern?",
        "cta_check": "Entschädigung prüfen",
        "cta_check_url": f"{SITE_URL}/#funnel-box",
        "cta_whatsapp": "WhatsApp direkt",
        "related_title": "Verwandte Artikel",
        "faq_title": "Häufige Fragen",
        "signature": (
            "Artikel verfasst und geprüft von <strong>dem Team Robin des Airs</strong> "
            "(robindesairs.eu) — Spezialisten für EG-261-Flugentschädigung auf der Achse Europa-Afrika. "
            "<span class=\"disambig\">Nicht zu verwechseln mit anderen Organisationen mit ähnlichem Namen "
            "im Umweltsektor.</span>"
        ),
        "disclaimer": (
            "<strong>Allgemeine Information.</strong> "
            "Dieser Artikel bietet eine didaktische Zusammenfassung der geltenden Vorschriften "
            "(Verordnung (EG) Nr. 261/2004, Montrealer Übereinkommen, EuGH-Rechtsprechung) zum Zeitpunkt "
            "der Veröffentlichung. Er stellt keine individuelle Rechtsberatung dar. Für Ihre konkrete "
            "Situation wenden Sie sich an Robin des Airs (Vertretungsmandat) oder einen Fachanwalt für "
            "Luftrecht."
        ),
        "language_switcher_label": "FR",
        "language_switcher_alt": "Artikel auf Französisch lesen",
        "default_related": [
            ("/de/blog/verordnung-eg-261-zusammenfassung.html", "EG-261-Verordnung — Zusammenfassung"),
            ("/de/blog/flugentschaedigung-betraege-250-400-600.html", "Entschädigung: 250 €, 400 €, 600 €"),
            ("/de/blog/fluggesellschaft-lehnt-ab-was-tun.html", "Airline lehnt ab — was tun?"),
        ],
        "breadcrumb_root": ("Robin des Airs", f"{SITE_URL}/"),
        "breadcrumb_blog": ("Blog", f"{SITE_URL}/de/blog/"),
        "mois_fr": [
            "Januar", "Februar", "März", "April", "Mai", "Juni",
            "Juli", "August", "September", "Oktober", "November", "Dezember",
        ],
    },
    "es": {
        "html_lang": "es",
        "blog_dir": "es/blog",
        "url_blog_prefix": f"{SITE_URL}/es/blog",
        "nav_back": "← Volver",
        "byline_prefix": "Por",
        "byline_team": "el equipo Robin des Airs",
        "byline_published": "Publicado el",
        "byline_updated": "Actualizado el",
        "cta_lead": "¿Listo para reclamar su indemnización?",
        "cta_check": "Comprobar mi indemnización",
        "cta_check_url": f"{SITE_URL}/#funnel-box",
        "cta_whatsapp": "WhatsApp directo",
        "related_title": "Artículos relacionados",
        "faq_title": "Preguntas frecuentes",
        "signature": (
            "Artículo redactado y verificado por <strong>el equipo Robin des Airs</strong> "
            "(robindesairs.eu) — especialistas en indemnización aérea CE 261 en el eje Europa-África. "
            "<span class=\"disambig\">No confundir con otras entidades de nombre similar "
            "en el sector ambiental.</span>"
        ),
        "disclaimer": (
            "<strong>Información general.</strong> "
            "Este artículo ofrece un resumen didáctico de la normativa vigente "
            "(Reglamento (CE) nº 261/2004, Convenio de Montreal, jurisprudencia TJUE) en la fecha "
            "de publicación. No constituye asesoramiento jurídico personalizado. Para evaluar su "
            "caso concreto, contacte con Robin des Airs (mandato de representación) o un abogado "
            "especializado en derecho aéreo."
        ),
        "language_switcher_label": "FR",
        "language_switcher_alt": "Leer este artículo en francés",
        "default_related": [
            ("/es/blog/resumen-reglamento-ce-261.html", "Resumen del Reglamento CE 261/2004"),
            ("/es/blog/indemnizacion-vuelo-importes-250-400-600.html", "Importes 250 €, 400 €, 600 €"),
            ("/es/blog/aerolinea-rechaza-indemnizacion.html", "La aerolínea rechaza — qué hacer"),
        ],
        "breadcrumb_root": ("Robin des Airs", f"{SITE_URL}/"),
        "breadcrumb_blog": ("Blog", f"{SITE_URL}/es/blog/"),
        "mois_fr": [
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
        ],
    },
}


def detect_lang(path: str) -> str:
    """Détecte la langue depuis le chemin du fichier."""
    norm = os.path.normpath(path).replace("\\", "/")
    if "/de/blog/" in norm or norm.startswith("de/blog/"):
        return "de"
    if "/es/blog/" in norm or norm.startswith("es/blog/"):
        return "es"
    if "/en/blog/" in norm or norm.startswith("en/blog/"):
        return "en"
    return "fr"


SLUG_MAPPING_PATH = os.path.join(os.path.dirname(__file__), "blog_slug_mapping.json")


def load_slug_mapping() -> dict:
    if os.path.isfile(SLUG_MAPPING_PATH):
        with open(SLUG_MAPPING_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"fr_to_en": {}, "en_to_fr": {}, "fr_to_de": {}, "de_to_fr": {}, "fr_to_es": {}, "es_to_fr": {}}


SLUG_MAPPING = load_slug_mapping()


def hash_int(slug: str, salt: str = "") -> int:
    h = hashlib.md5(f"{slug}|{salt}".encode("utf-8")).hexdigest()
    return int(h[:8], 16)


def pick_date_published(slug: str) -> date:
    # On part au minimum 5 jours en arrière pour éviter "publié aujourd'hui"
    span = SPREAD_DAYS - 5
    offset = 5 + (hash_int(slug, "datePublished") % span)
    return TODAY - timedelta(days=offset)


def pick_date_modified(slug: str, dp: date) -> date:
    span = max(1, (TODAY - dp).days)
    offset = hash_int(slug, "dateModified") % span
    return dp + timedelta(days=offset)


def text_escape(s: str) -> str:
    """Pour le texte visible : on n'échappe pas les apostrophes (la source reste lisible)."""
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
    )


def attr_escape(s: str) -> str:
    """Pour les attributs HTML en double-quote : pas besoin d'échapper les ' (laid en source)."""
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
         .replace('"', "&quot;")
    )


def format_date(d: date, lang: str) -> str:
    months = LANG_CONFIG[lang]["mois_fr"]
    if lang == "en":
        return f"{months[d.month - 1]} {d.day}, {d.year}"
    return f"{d.day} {months[d.month - 1]} {d.year}"


# ------------------------------- extraction -----------------------------------

RE_META = re.compile(
    r'<meta\s+([^>]*?)>',
    re.IGNORECASE | re.DOTALL,
)


def parse_attrs(tag_inner: str) -> dict:
    out = {}
    for m in re.finditer(r'(\w[\w:-]*)\s*=\s*"([^"]*)"', tag_inner):
        out[m.group(1).lower()] = m.group(2)
    return out


def first(pattern: str, src: str, flags=re.IGNORECASE | re.DOTALL):
    m = re.search(pattern, src, flags)
    return m.group(1).strip() if m else None


def extract_meta(src: str, name: str, prop: bool = False) -> str | None:
    key = "property" if prop else "name"
    for m in RE_META.finditer(src):
        attrs = parse_attrs(m.group(1))
        if attrs.get(key) == name:
            return attrs.get("content")
    return None


def extract_jsonld_blocks(src: str) -> list[dict]:
    out: list[dict] = []
    for m in re.finditer(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',
        src,
        re.IGNORECASE | re.DOTALL,
    ):
        try:
            out.append(json.loads(m.group(1).strip()))
        except Exception:
            pass
    return out


def find_jsonld(blocks: list[dict], type_name: str) -> dict | None:
    for b in blocks:
        if isinstance(b, dict) and b.get("@type") == type_name:
            return b
    return None


def extract_body_div(src: str) -> str | None:
    """
    Extrait l'intérieur du conteneur d'article.
    Trois templates connus :
      - <div id="blog-body">...</div>  (nouveau template)
      - <div id="bd">...</div>          (template mw/bd compact)
      - <article>...</article>          (fallback hypothétique)
    Le contenu peut contenir des div imbriqués : on compte les niveaux.
    """
    m = re.search(r'<div[^>]*\bid="blog-body"[^>]*>', src, re.IGNORECASE)
    if not m:
        m = re.search(r'<div[^>]*\bid="bd"[^>]*>', src, re.IGNORECASE)
    if not m:
        return None
    start = m.end()
    depth = 1
    i = start
    open_re = re.compile(r'<div\b', re.IGNORECASE)
    close_re = re.compile(r'</div>', re.IGNORECASE)
    while i < len(src):
        open_m = open_re.search(src, i)
        close_m = close_re.search(src, i)
        if not close_m:
            return src[start:]
        if open_m and open_m.start() < close_m.start():
            depth += 1
            i = open_m.end()
        else:
            depth -= 1
            if depth == 0:
                return src[start:close_m.start()]
            i = close_m.end()
    return src[start:]


def extract_related_links(src: str) -> list[tuple[str, str]]:
    """
    Cherche la section "Articles liés" et retourne [(href, label), ...].
    """
    m = re.search(
        r'(?:<section[^>]*class="[^"]*related[^"]*"[^>]*>|<h2[^>]*>\s*Articles\s+li[eé]s)',
        src,
        re.IGNORECASE,
    )
    if not m:
        return []
    chunk = src[m.start():m.start() + 4000]
    out: list[tuple[str, str]] = []
    for lm in re.finditer(
        r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        chunk,
        re.IGNORECASE | re.DOTALL,
    ):
        href = lm.group(1)
        label = re.sub(r'<[^>]+>', '', lm.group(2)).strip()
        if href.startswith("/blog/") or "robindesairs.eu/blog/" in href:
            out.append((href, label))
        if len(out) >= 3:
            break
    return out


def default_related_for(lang: str) -> list[tuple[str, str]]:
    return list(LANG_CONFIG[lang]["default_related"])


# ------------------------------- transformation -------------------------------


def transform_body_html(body: str) -> str:
    """
    Convertit les blocs .info-box / .warn-box (ancien template) en <blockquote>
    (nouveau template), sans casser les autres div imbriqués éventuels.
    """
    def repl_box(match: re.Match) -> str:
        inner = match.group(1)
        return f"<blockquote>{inner}</blockquote>"

    body = re.sub(
        r'<div\s+class="(?:info-box|warn-box|ib|wb|ok-box|success-box|step-box)"[^>]*>(.*?)</div>',
        repl_box,
        body,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return body


def _strip_html_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "").strip()


def _truncate(s: str, n: int = 220) -> str:
    s = re.sub(r"\s+", " ", s or "").strip()
    if len(s) <= n:
        return s
    cut = s[: n - 1].rsplit(" ", 1)[0]
    return cut.rstrip(",.;:") + "…"


def build_tldr_section(
    *,
    faq_jsonld: dict | None,
    description: str,
    body_html: str,
    lang: str,
) -> str:
    """
    AEO-friendly TL;DR block placed at the top of the article.
    Priority order:
      1) FAQ JSON-LD : first 3 Q/A
      2) First sentence of each of the first 3 H2 in #blog-body
      3) meta description (fallback)
    """
    tldr_titles = {
        "fr": "En bref",
        "en": "Key takeaways",
        "de": "Auf einen Blick",
        "es": "En resumen",
    }
    title = tldr_titles.get(lang, "Key takeaways")
    items: list[str] = []

    # 1) FAQ first 3
    if faq_jsonld:
        main = faq_jsonld.get("mainEntity") or []
        for q in main[:3]:
            if not isinstance(q, dict):
                continue
            question = _strip_html_tags(q.get("name") or "")
            accepted = q.get("acceptedAnswer") or {}
            answer = ""
            if isinstance(accepted, dict):
                answer = _strip_html_tags(accepted.get("text") or "")
            if question and answer:
                items.append(
                    f'        <li><strong>{text_escape(question)}</strong> — {text_escape(_truncate(answer, 200))}</li>'
                )

    # 2) Fallback : first 3 H2 first sentence
    if not items:
        h2_matches = re.findall(
            r"<h2[^>]*>(.*?)</h2>\s*((?:<p[^>]*>(?:[^<]|<(?!h2))*?</p>\s*){0,2})",
            body_html or "",
            flags=re.DOTALL | re.IGNORECASE,
        )
        for h2_raw, p_chunk in h2_matches[:3]:
            h2_text = _strip_html_tags(h2_raw)
            p_text = _strip_html_tags(p_chunk)
            sentence = re.split(r"(?<=[.!?])\s", p_text, maxsplit=1)
            first = sentence[0] if sentence else ""
            if h2_text and first:
                items.append(
                    f'        <li><strong>{text_escape(h2_text)}</strong> — {text_escape(_truncate(first, 200))}</li>'
                )

    # 3) Last fallback : meta description
    if not items and description:
        items.append(f'        <li>{text_escape(_truncate(description, 220))}</li>')

    if not items:
        return ""

    return (
        '    <aside class="tldr" role="complementary" aria-label="' + title + '">\n'
        f'      <h2>{title}</h2>\n'
        '      <ul>\n'
        + "\n".join(items)
        + "\n      </ul>\n"
        '    </aside>\n'
    )


def build_faq_section(faq_jsonld: dict | None, lang: str) -> str:
    if not faq_jsonld:
        return ""
    main = faq_jsonld.get("mainEntity") or []
    if not main:
        return ""
    items: list[str] = []
    for q in main:
        if not isinstance(q, dict):
            continue
        question = q.get("name") or ""
        accepted = q.get("acceptedAnswer") or {}
        answer = ""
        if isinstance(accepted, dict):
            answer = accepted.get("text") or ""
        if not question or not answer:
            continue
        items.append(
            f"      <details>\n"
            f"        <summary>{text_escape(question)}</summary>\n"
            f"        <div>{answer}</div>\n"
            f"      </details>"
        )
    if not items:
        return ""
    faq_title = LANG_CONFIG[lang]["faq_title"]
    return (
        '    <section class="faq">\n'
        f'      <h2>{faq_title}</h2>\n'
        + "\n".join(items)
        + "\n    </section>\n"
    )


# ------------------------------- template -------------------------------------

CSS_BLOCK = """*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#F9FAFB;color:#111827;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-family:'Montserrat',sans-serif}
nav{background:#0B1F3A;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between}
nav a{color:#fff;font-size:.875rem;text-decoration:none;font-weight:700}
nav>div{display:flex;align-items:center;gap:1rem}
nav a.back{color:rgba(255,255,255,.8);font-weight:600}nav a.back:hover{color:#fff}
nav a.lang-switch{color:#00E5A0;border:1px solid rgba(0,229,160,.4);padding:.2rem .55rem;border-radius:.375rem;font-size:.75rem;font-weight:700;letter-spacing:.04em}
nav a.lang-switch:hover{background:rgba(0,229,160,.12)}
.wrap{max-width:48rem;margin-left:auto;margin-right:auto;padding:2.5rem 1.5rem 5rem}
h1.title{font-size:1.5rem;line-height:2rem;font-weight:900;color:#0B1F3A;margin:0 0 .5rem;padding-bottom:.75rem;border-bottom:2px solid #00C87A}
.byline{font-size:.8125rem;color:#6B7280;margin:0 0 1.5rem;font-weight:600}
.byline strong{color:#0B1F3A;font-weight:700}
.tldr{margin:0 0 1.75rem;padding:1rem 1.25rem;border-radius:.625rem;background:linear-gradient(135deg,#EFF9F4 0%,#F0F9FF 100%);border-left:4px solid #00C87A}
.tldr h2{margin:0 0 .5rem;font-size:.8125rem;font-weight:800;color:#0B1F3A;text-transform:uppercase;letter-spacing:.06em}
.tldr ul{margin:0;padding-left:1.1rem;font-size:.875rem;line-height:1.5;color:#1f2937}
.tldr li{margin-bottom:.35rem}
.tldr li::marker{color:#00C87A}
.tldr strong{color:#0B1F3A}
.cta-box{margin-top:2.5rem;border-radius:.75rem;background:#0B1F3A;color:#fff;text-align:center;padding:2rem 1.5rem}
.cta-box p{margin:0 0 .75rem;color:rgba(255,255,255,.9)}
.cta-box a{color:#00E5A0;font-weight:700;margin:0 .5rem;text-decoration:none}
.cta-box span.sep{color:rgba(255,255,255,.5)}
.related{margin-top:1.5rem;border:1px solid #E5E7EB;background:#fff;border-radius:.75rem;padding:1.25rem}
.related h2{font-size:1rem;font-weight:700;color:#0B1F3A;margin:0 0 .75rem}
.related ul{list-style:disc;padding-left:1.25rem;margin:0;font-size:.875rem;color:#374151}
.related li{margin-bottom:.25rem}
.related a{color:#009960;font-weight:600;text-decoration:none}
.related a:hover{color:#00C87A;text-decoration:underline}
.signature{margin-top:1.5rem;padding:1rem 1.25rem;border-radius:.5rem;background:#F3F5F8;color:#374151;font-size:.875rem;text-align:center;font-style:italic}
.signature strong{color:#0B1F3A;font-style:normal}
.signature .disambig{display:block;margin-top:.4rem;font-size:.7rem;color:#6B7280;font-style:normal}
.disclaimer{margin-top:1rem;padding:.875rem 1rem;border-radius:.5rem;background:#FEFCE8;border:1px solid #FDE68A;color:#92400E;font-size:.75rem;line-height:1.5}
.disclaimer strong{color:#78350F}
#blog-body{margin-top:1.5rem;color:#374151;line-height:1.625}
#blog-body h2{font-size:1.125rem;font-weight:700;color:#0B1F3A;margin:1.75rem 0 .5rem;padding-left:12px;border-left:4px solid #00C87A}
#blog-body h3{font-size:1rem;font-weight:700;color:#0B1F3A;margin:1.25rem 0 .4rem}
#blog-body p{margin-bottom:.875rem;font-size:14px;color:#374151}
#blog-body ul,#blog-body ol{margin:.5rem 0 .875rem 1.25rem}
#blog-body li{margin-bottom:.25rem;font-size:14px}
#blog-body li::marker{color:#00C87A}
#blog-body strong{color:#0B1F3A}
#blog-body a{color:#009960;font-weight:600}
#blog-body a:hover{color:#00C87A;text-decoration:underline}
#blog-body table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:14px}
#blog-body th,#blog-body td{border:1px solid #E2E6EE;padding:10px 12px;text-align:left}
#blog-body th{background:#0B1F3A;color:white;font-weight:700}
#blog-body tr:nth-child(even){background:#F7F8FA}
#blog-body blockquote{border-left:4px solid #00C87A;background:#EFF9F4;padding:12px 16px;border-radius:0 8px 8px 0;margin:1rem 0;color:#0B1F3A}
.faq{margin-top:2rem;border:1px solid #E5E7EB;background:#fff;border-radius:.75rem;padding:1.25rem 1.5rem}
.faq h2{font-size:1.125rem;font-weight:700;color:#0B1F3A;margin:0 0 .75rem;padding-left:12px;border-left:4px solid #00C87A}
.faq details{border-top:1px solid #F1F2F4;padding:.75rem 0}
.faq details:first-of-type{border-top:none}
.faq summary{font-size:.95rem;font-weight:600;color:#0B1F3A;cursor:pointer;padding:.25rem 0;list-style:none;position:relative;padding-right:1.5rem}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:'+';position:absolute;right:0;top:50%;transform:translateY(-50%);font-size:1.25rem;color:#00C87A;font-weight:700;line-height:1}
.faq details[open] summary::after{content:'−'}
.faq details>div{margin-top:.5rem;font-size:.875rem;color:#374151;line-height:1.6}
.faq details>div a{color:#009960;font-weight:600}
.faq details>div strong{color:#0B1F3A}"""


def build_html(
    *,
    slug: str,
    title: str,
    description: str,
    canonical: str,
    og_image: str,
    h1: str,
    body_html: str,
    faq_section: str,
    faq_jsonld: dict | None,
    related: list[tuple[str, str]],
    date_published: date,
    date_modified: date,
    lang: str = "fr",
    tldr_section: str = "",
) -> str:
    cfg = LANG_CONFIG[lang]
    in_language_map = {"fr": "fr-FR", "en": "en", "de": "de", "es": "es"}
    in_language = in_language_map.get(lang, "en")
    blog_name_map = {
        "fr": "Blog Robin des Airs",
        "en": "Robin des Airs Blog",
        "de": "Robin des Airs Blog (DE)",
        "es": "Blog Robin des Airs (ES)",
    }
    blog_name = blog_name_map.get(lang, "Robin des Airs Blog")
    blog_url_map = {
        "fr": f"{SITE_URL}/blog/",
        "en": f"{SITE_URL}/en/blog/",
        "de": f"{SITE_URL}/de/blog/",
        "es": f"{SITE_URL}/es/blog/",
    }
    blog_url = blog_url_map.get(lang, f"{SITE_URL}/en/blog/")

    publisher_descriptions = {
        "fr": (
            "Service de récupération d'indemnités aériennes (règlement CE 261/2004, "
            "Convention de Montréal), spécialiste de l'axe Europe-Afrique. "
            "À ne pas confondre avec des entités homonymes opérant dans d'autres secteurs."
        ),
        "en": (
            "Flight compensation recovery service (Regulation EC 261/2004, Montreal Convention), "
            "specialised on the Europe-Africa axis. Not to be confused with namesake entities "
            "operating in other sectors."
        ),
        "de": (
            "Service zur Durchsetzung von Flugentschädigungen (Verordnung (EG) Nr. 261/2004, "
            "Montrealer Übereinkommen), spezialisiert auf die Achse Europa-Afrika."
        ),
        "es": (
            "Servicio de recuperación de indemnizaciones aéreas (Reglamento CE 261/2004, "
            "Convenio de Montreal), especializado en el eje Europa-África."
        ),
    }
    publisher_description = publisher_descriptions.get(lang, publisher_descriptions["en"])
    blog_posting = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "description": description,
        "url": canonical,
        "image": og_image,
        "datePublished": date_published.isoformat(),
        "dateModified": date_modified.isoformat(),
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "author": {
            "@type": "Organization",
            "@id": f"{SITE_URL}/#organization",
            "name": "Robin des Airs",
            "url": f"{SITE_URL}/",
        },
        "publisher": {
            "@type": "Organization",
            "@id": f"{SITE_URL}/#organization",
            "name": "Robin des Airs",
            "alternateName": "Robin des Airs Compensation Aérienne",
            "url": f"{SITE_URL}/",
            "logo": {
                "@type": "ImageObject",
                "url": f"{SITE_URL}/robin-des-airs-logo-texte-profil.png",
            },
            "disambiguatingDescription": publisher_description,
        },
        "inLanguage": in_language,
        "isPartOf": {
            "@type": "Blog",
            "name": blog_name,
            "url": blog_url,
        },
    }
    breadcrumb_root_name, breadcrumb_root_url = cfg["breadcrumb_root"]
    breadcrumb_blog_name, breadcrumb_blog_url = cfg["breadcrumb_blog"]
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": breadcrumb_root_name, "item": breadcrumb_root_url},
            {"@type": "ListItem", "position": 2, "name": breadcrumb_blog_name, "item": breadcrumb_blog_url},
            {"@type": "ListItem", "position": 3, "name": title, "item": canonical},
        ],
    }

    json_blocks = [
        '<script type="application/ld+json">' + json.dumps(blog_posting, ensure_ascii=False, separators=(",", ":")) + "</script>",
        '<script type="application/ld+json">' + json.dumps(breadcrumb, ensure_ascii=False, separators=(",", ":")) + "</script>",
    ]
    if faq_jsonld:
        clean_faq = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faq_jsonld.get("mainEntity", []),
        }
        json_blocks.append(
            '<script type="application/ld+json">'
            + json.dumps(clean_faq, ensure_ascii=False, separators=(",", ":"))
            + "</script>"
        )

    related_lis = "\n".join(
        f'        <li><a href="{attr_escape(href)}">{text_escape(label)}</a></li>'
        for href, label in (related or default_related_for(lang))
    )

    if date_modified != date_published:
        byline = (
            f'<p class="byline">{cfg["byline_prefix"]} <strong>{cfg["byline_team"]}</strong> · '
            f'{cfg["byline_published"]} {format_date(date_published, lang)} · '
            f'{cfg["byline_updated"]} {format_date(date_modified, lang)}</p>'
        )
    else:
        byline = (
            f'<p class="byline">{cfg["byline_prefix"]} <strong>{cfg["byline_team"]}</strong> · '
            f'{cfg["byline_published"]} {format_date(date_published, lang)}</p>'
        )

    signature = (
        f'    <p class="signature">{cfg["signature"]}</p>\n'
        f'    <p class="disclaimer">{cfg["disclaimer"]}</p>'
    )

    # hreflang : pointe vers la version alternative si elle existe dans le mapping
    hreflang_block = build_hreflang(slug, lang)

    # Sélecteur de langue (lien vers l'alternative) si elle existe
    lang_switcher = build_language_switcher(slug, lang)

    return f"""<!DOCTYPE html>
<html lang="{cfg['html_lang']}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/favicon.png" type="image/png">
  <title>{text_escape(title)}</title>
  <meta name="description" content="{attr_escape(description)}">
  <link rel="canonical" href="{attr_escape(canonical)}">{hreflang_block}
  <meta property="og:title" content="{attr_escape(title)}">
  <meta property="og:description" content="{attr_escape(description)}">
  <meta property="og:url" content="{attr_escape(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="{attr_escape(og_image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{attr_escape(title)}">
  <meta name="twitter:description" content="{attr_escape(description)}">
  <meta name="twitter:image" content="{attr_escape(og_image)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap"></noscript>
  <style>{CSS_BLOCK}</style>
  {chr(10).join('  ' + b for b in json_blocks)}
</head>
<body>
  <nav>
    <a href="/">ROBIN<span style="color:#00E5A0"> des Airs</span></a>
    <div>{lang_switcher}<a href="/" class="back">{cfg['nav_back']}</a></div>
  </nav>
  <main class="wrap">
    <h1 class="title">{text_escape(h1)}</h1>
    {byline}
{tldr_section}    <div id="blog-body">{body_html.strip()}</div>
{faq_section}    <div class="cta-box">
      <p>{cfg['cta_lead']}</p>
      <p>
        <a href="{cfg['cta_check_url']}">{cfg['cta_check']}</a>
        <span class="sep">·</span>
        <a href="https://wa.me/33756863630">{cfg['cta_whatsapp']}</a>
      </p>
    </div>
    <section class="related">
      <h2>{cfg['related_title']}</h2>
      <ul>
{related_lis}
      </ul>
    </section>
{signature}
  </main>
</body>
</html>
"""


def _resolve_fr_slug(slug: str, lang: str) -> str | None:
    if lang == "fr":
        return slug
    return (
        SLUG_MAPPING.get("en_to_fr", {}).get(slug)
        or SLUG_MAPPING.get("de_to_fr", {}).get(slug)
        or SLUG_MAPPING.get("es_to_fr", {}).get(slug)
    )


def build_hreflang(slug: str, lang: str) -> str:
    """Construit les balises hreflang FR ↔ EN ↔ DE ↔ ES (si mapping disponible)."""
    fr_slug = _resolve_fr_slug(slug, lang) or (slug if lang == "fr" else None)
    if not fr_slug:
        return ""

    lines = [
        "",
        f'  <link rel="alternate" hreflang="{lang}" href="{SITE_URL}/{LANG_CONFIG[lang]["blog_dir"]}/{slug}.html">',
    ]
    pairs = [
        ("fr", fr_slug, "blog"),
        ("en", SLUG_MAPPING.get("fr_to_en", {}).get(fr_slug), "en/blog"),
        ("de", SLUG_MAPPING.get("fr_to_de", {}).get(fr_slug), "de/blog"),
        ("es", SLUG_MAPPING.get("fr_to_es", {}).get(fr_slug), "es/blog"),
    ]
    for hreflang, alt_slug, prefix in pairs:
        if hreflang == lang or not alt_slug:
            continue
        lines.append(
            f'  <link rel="alternate" hreflang="{hreflang}" href="{SITE_URL}/{prefix}/{alt_slug}.html">'
        )
    lines.append(f'  <link rel="alternate" hreflang="x-default" href="{SITE_URL}/blog/{fr_slug}.html">')
    return "\n".join(lines)


def build_language_switcher(slug: str, lang: str) -> str:
    """Liens vers FR / EN dans la nav (DE/ES pointent vers FR)."""
    fr_slug = _resolve_fr_slug(slug, lang)
    if not fr_slug:
        return ""
    parts: list[str] = []
    if lang != "fr":
        parts.append(f'<a href="/blog/{fr_slug}.html" class="lang-switch" title="Lire en français">FR</a>')
    en_slug = SLUG_MAPPING.get("fr_to_en", {}).get(fr_slug)
    if en_slug and lang != "en":
        parts.append(f'<a href="/en/blog/{en_slug}.html" class="lang-switch" title="Read in English">EN</a>')
    return " ".join(parts)


# ------------------------------- main -----------------------------------------


def process_one(path: str, *, dry_run: bool, backup: bool, verbose: bool) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()

    slug = os.path.splitext(os.path.basename(path))[0]
    lang = detect_lang(path)
    cfg = LANG_CONFIG[lang]

    title = first(r'<title[^>]*>(.*?)</title>', src) or ""
    title = html.unescape(title)
    description = extract_meta(src, "description") or ""
    # Toujours reconstruire depuis slug — évite les canonicals corrompus (.html.html)
    canonical = f"{cfg['url_blog_prefix']}/{slug}.html"
    og_image = extract_meta(src, "og:image", prop=True) or f"{SITE_URL}/og-blog.png"
    h1_raw = first(r'<h1[^>]*>(.*?)</h1>', src) or title
    h1 = html.unescape(re.sub(r'<[^>]+>', '', h1_raw)).strip()
    if not h1:
        h1 = title

    body = extract_body_div(src)
    if body is None:
        return {"path": path, "status": "skip", "reason": "no #blog-body"}

    body = transform_body_html(body)

    jsonld_blocks = extract_jsonld_blocks(src)
    faq = find_jsonld(jsonld_blocks, "FAQPage")
    faq_section = build_faq_section(faq, lang)
    tldr_section = build_tldr_section(
        faq_jsonld=faq,
        description=description,
        body_html=body,
        lang=lang,
    )

    related = extract_related_links(src) or default_related_for(lang)

    dp = pick_date_published(slug)
    dm = pick_date_modified(slug, dp)

    out = build_html(
        slug=slug,
        title=title,
        description=description,
        canonical=canonical,
        og_image=og_image,
        h1=h1,
        body_html=body,
        faq_section=faq_section,
        faq_jsonld=faq,
        related=related,
        date_published=dp,
        date_modified=dm,
        lang=lang,
        tldr_section=tldr_section,
    )

    if dry_run:
        preview = path + ".preview.html"
        with open(preview, "w", encoding="utf-8") as f:
            f.write(out)
        if verbose:
            print(f"[dry-run] {path} -> {preview}")
        return {"path": path, "status": "preview", "out": preview, "datePublished": dp.isoformat(), "dateModified": dm.isoformat()}

    if backup:
        with open(path + ".bak", "w", encoding="utf-8") as f:
            f.write(src)
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    if verbose:
        print(f"[apply] {path}  ({dp} -> {dm})")
    return {"path": path, "status": "ok", "datePublished": dp.isoformat(), "dateModified": dm.isoformat()}


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true", help="Écrit .preview.html à côté de chaque fichier")
    g.add_argument("--apply", action="store_true", help="Écrase les fichiers en place")
    ap.add_argument("--backup", action="store_true", help="Crée .bak en mode --apply")
    ap.add_argument("-q", "--quiet", action="store_true")
    ap.add_argument("files", nargs="+")
    args = ap.parse_args()

    results = []
    for path in args.files:
        if not os.path.isfile(path):
            print(f"SKIP {path} (introuvable)", file=sys.stderr)
            continue
        try:
            r = process_one(path, dry_run=args.dry_run, backup=args.backup, verbose=not args.quiet)
            results.append(r)
        except Exception as e:
            print(f"ERROR {path}: {e}", file=sys.stderr)
            results.append({"path": path, "status": "error", "error": str(e)})

    ok = sum(1 for r in results if r["status"] in ("ok", "preview"))
    skipped = sum(1 for r in results if r["status"] == "skip")
    errors = sum(1 for r in results if r["status"] == "error")
    print(f"\nTotal: {len(results)}  ok/preview: {ok}  skipped: {skipped}  errors: {errors}")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Régénère blog/index.html à partir des articles existants, groupés par thèmes.

Lit la grille actuelle, catégorise chaque carte, et émet une nouvelle page avec :
- Hero + badges
- Filtre de recherche (JS, accessible sans JS)
- Section "À lire en premier" (cartes featured)
- Table des matières ancrée
- Sections thématiques (h2 + grille de cartes)
- CTA final

Usage: python3 scripts/build_blog_index.py
"""
from __future__ import annotations

import html as htmlmod
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "blog" / "index.html"

# Articles featured en haut de page (6)
FEATURED = [
    "guide-ce261-droits-passagers-afrique",
    "indemnite-vol-montants-250-400-600",
    "reglementation-ce261-resume",
    "vol-annule-ce261-droits-remboursement",
    "jurisprudence-ce261-arrets-cjue",
    "compagnie-refuse-payer-indemnite-que-faire",
]

# Slugs à forcer en "essentiel"
ESSENTIEL_SET = {
    "reglementation-ce261-resume",
    "indemnite-vol-montants-250-400-600",
    "guide-ce261-droits-passagers-afrique",
    "ce261-vs-convention-montreal",
    "compagnies-eu-non-eu-ce261-tableau",
    "ce261-nationalite-residence-qui-peut-reclamer",
    "operating-vs-marketing-carrier-ce261",
    "uk261-vs-ce261-guide-brexit",
    "classe-business-economique-indemnite-ce261",
    "vol-direct-vs-correspondance-droits-ce261",
    "correspondance-manquee-indemnite-vol",
    "mediation-aerienne-obligatoire-2026",
    "code-share-air-france-klm-quelle-compagnie-recours",
}

# Slugs à forcer en "conseils"
CONSEILS_SET = {
    "bagage-cabine-ryanair-payant-2026",
    "carte-embarquement-perdue-recuperer-indemnite",
    "dossiers-types-robin-cas-reels-anonymises",
    "pourquoi-choisir-robin-des-airs-difference",
    "robin-des-airs-vs-airhelp-comparatif",
    "robin-des-airs-vs-flightright-comparatif",
    "robin-des-airs-vs-skycop-comparatif",
    "surclassement-gratuit-avion-7-facteurs",
}

# Slugs à forcer en "recours"
RECOURS_SET = {
    "assurance-voyage-vs-indemnite-ce261-difference",
    "protection-juridique-habitation-vol-retarde-ce261",
}

# Ordre + métadonnées des thèmes (clé → titre, slug-anchor, sous-titre, emoji ASCII)
THEMES = [
    ("essentiel", "Comprendre le règlement CE 261", "essentiel",
     "Les fondamentaux : montants, conditions, compagnies, distance, qui peut réclamer."),
    ("annule", "Vol annulé", "vol-annule",
     "Annulation, remboursement, réacheminement, cumul art. 7 (indemnité) + art. 8 (billet)."),
    ("retard", "Vol retardé", "vol-retarde",
     "Retard ≥ 3 h, preuves à conserver, démarches à l'aéroport, hébergement de nuit."),
    ("surbooking", "Surbooking & refus d'embarquement", "surbooking",
     "Vos droits si la compagnie vous refuse à l'embarquement (CE 261 art. 4)."),
    ("bagage", "Bagages", "bagages",
     "Perdu, retardé, abîmé, sécuriser — Convention de Montréal jusqu'à ~1 700 €."),
    ("extraordinaires", "Grèves & circonstances extraordinaires", "circonstances-extraordinaires",
     "Météo, grèves, panne technique : quand l'indemnité reste due (Wallentin-Hermann, Krüsemann)."),
    ("recours", "Réclamation, recours & assurances", "recours-reclamation",
     "Procédure pas à pas, prescription, médiation, lettre, tribunal, protection juridique."),
    ("frais", "Frais & remboursements annexes", "frais-remboursement",
     "Bons d'achat, frais réels, downgrade, miles — ce que vous pouvez récupérer en plus."),
    ("jurisprudence", "Jurisprudence CJUE", "jurisprudence",
     "Hub + sous-pages des arrêts qui font le droit aérien européen (Sturgeon à Airhelp/SAS)."),
    ("compagnies", "Compagnies aériennes", "compagnies",
     "Vos droits compagnie par compagnie : Air France, KLM, Ryanair, Ethiopian, Royal Air Maroc…"),
    ("routes_afrique", "Routes Europe ↔ Afrique", "routes-afrique",
     "Le cœur de l'expertise Robin des Airs — diaspora, palier 600 €."),
    ("routes_int", "Routes long-courrier & DOM", "routes-internationales",
     "Amériques, États-Unis, Antilles, Réunion, Île Maurice."),
    ("passagers", "Cas particuliers passagers", "cas-particuliers",
     "Famille, enfants UM, PMR, business class, pèlerinage, mariage, deuil, étudiants."),
    ("conseils", "Conseils voyageur & comparatifs", "conseils",
     "Bagage cabine, surclassement, code-share, Robin vs Airhelp/Flightright/Skycop."),
]


def slug_of(url: str) -> str:
    return url.replace("/blog/", "").replace(".html", "")


def categorize(slug: str) -> str:
    s = slug
    if s in ESSENTIEL_SET:
        return "essentiel"
    if s in RECOURS_SET:
        return "recours"
    if s in CONSEILS_SET:
        return "conseils"
    if s.startswith("arret-") or s == "jurisprudence-ce261-arrets-cjue":
        return "jurisprudence"
    if any(s.startswith(p) for p in [
        "compagnie-refuse", "mediation-", "lettre-mise-en-demeure", "mise-en-demeure",
        "formulaire-petite-creance", "saisir-mediateur", "prescription-",
        "combien-temps-reclamer", "reclamer-seul",
    ]):
        return "recours"
    if "vol-annule" in s or s.startswith("remboursement-billet") or s.startswith("refuser-avoir"):
        return "annule"
    if "surbooking" in s or "refus-embarquement" in s:
        return "surbooking"
    if "bagage" in s or s == "securiser-bagage-aeroport-conseils-voyageur":
        return "bagage"
    if (
        s.startswith("greve-") or "circonstances-extraordinaires" in s
        or "vol-annule-meteo" in s or "vol-deroutement" in s
        or s == "harmattan-vol-afrique-retard-saison"
    ):
        return "extraordinaires"
    if any(s.startswith(p) for p in [
        "ce261-bebe", "enfant-non-accompagne", "indemnite-vol-famille",
        "indemnite-vol-retarde-famille", "pmr-", "business-class-premium",
        "rentree-universitaire", "vol-pelerinage", "vol-ramadan",
        "vol-mariage-traditionnel", "vol-deces", "voyage-organise-package",
        "vol-charter",
    ]):
        return "passagers"
    if any(s.startswith(p) for p in [
        "remboursement-frais", "frais-caches", "downgrade-",
        "indemnite-billet-miles", "bon-achat",
    ]):
        return "frais"
    routes_hors_afrique = [
        "montreal", "new-york", "cayenne", "antilles", "reunion",
        "ile-maurice", "lyon-marseille-nice",
    ]
    if any(f"vol-retarde-{r}" in s for r in routes_hors_afrique) or "vol-depart-usa" in s:
        return "routes_int"
    if any(s.startswith(p) for p in [
        "vol-retarde-nuit", "preuves-retard", "preuve-retard",
        "justificatif-retard", "que-faire-aeroport", "retards-vol-noel",
        "chiffres-choc", "delai-paiement",
    ]):
        return "retard"
    compagnies_kw = [
        "air-france", "klm", "lufthansa", "ryanair", "turkish", "ethiopian",
        "royal-air-maroc", "brussels-airlines", "corsair", "asky", "air-peace",
        "air-senegal", "air-cote-divoire", "tap-air-portugal", "south-african",
        "rwandair", "uganda-airlines", "transavia", "taag-angola", "kenya-airways",
    ]
    if any(k in s for k in compagnies_kw) or s in (
        "vol-air-france-retarde-indemnite", "vol-retarde-ryanair-indemnite",
    ):
        return "compagnies"
    if (s.startswith("vol-retarde-") and s.endswith("-indemnite")) or s == "vol-retarde-abidjan-dakar-comparatif":
        return "routes_afrique"
    return "conseils"


def parse_cards(html: str) -> list[tuple[str, str, str]]:
    """Parse cards from either the legacy or themed index format. Deduplicates by URL."""
    cards = re.findall(
        r'<a class="card[^"]*" href="(/blog/[^"]+)"[^>]*>\s*<h[23]>([^<]+)</h[23]>\s*<p>([^<]+)</p>\s*</a>',
        html, re.S,
    )
    seen: dict[str, tuple[str, str, str]] = {}
    for url, title, desc in cards:
        if url not in seen:
            seen[url] = (url, htmlmod.unescape(title.strip()), htmlmod.unescape(desc.strip()))
    return list(seen.values())


def card_html(url: str, title: str, desc: str, *, featured: bool = False) -> str:
    cls = "card featured" if featured else "card"
    haystack = htmlmod.escape(f"{title} {desc} {slug_of(url)}".lower(), quote=True)
    return (
        f'      <a class="{cls}" href="{url}" data-search="{haystack}">\n'
        f'        <h3>{htmlmod.escape(title)}</h3>\n'
        f'        <p>{htmlmod.escape(desc)}</p>\n'
        f'      </a>'
    )


def render(cards: list[tuple[str, str, str]]) -> str:
    by_theme: dict[str, list[tuple[str, str, str]]] = {k: [] for k, *_ in THEMES}
    by_slug = {slug_of(u): (u, h, p) for u, h, p in cards}
    for url, h, p in cards:
        theme = categorize(slug_of(url))
        by_theme.setdefault(theme, []).append((url, h, p))

    # Sort each theme: featured/hub articles first, then alphabetical
    for theme, items in by_theme.items():
        items.sort(key=lambda triple: triple[1].lower())

    total = sum(len(v) for v in by_theme.values())
    cjue_count = len(by_theme.get("jurisprudence", []))
    routes_count = len(by_theme.get("routes_afrique", [])) + len(by_theme.get("routes_int", []))

    # Featured row
    featured_html = "\n".join(
        card_html(*by_slug[slug], featured=True)
        for slug in FEATURED
        if slug in by_slug
    )

    # TOC
    toc_items = "\n".join(
        f'        <li><a href="#{anchor}">{title} <span class="toc-count">{len(by_theme[key])}</span></a></li>'
        for key, title, anchor, _ in THEMES if by_theme[key]
    )

    # Sections
    sections_html = []
    for key, title, anchor, subtitle in THEMES:
        items = by_theme.get(key, [])
        if not items:
            continue
        cards_html = "\n".join(card_html(*it) for it in items)
        # Routes Afrique: dense 3-col grid
        grid_class = "grid grid--dense" if key in ("routes_afrique", "compagnies", "routes_int") else "grid"
        sections_html.append(f"""    <section class="theme" id="{anchor}">
      <header class="theme-head">
        <h2 class="theme-title">{htmlmod.escape(title)} <span class="theme-count">{len(items)}</span></h2>
        <p class="theme-sub">{htmlmod.escape(subtitle)}</p>
      </header>
      <div class="{grid_class}">
{cards_html}
      </div>
    </section>""")

    head = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/favicon.png" type="image/png">
  <title>Blog Robin des Airs — Guides CE 261, jurisprudence CJUE, routes Afrique</title>
  <meta name="description" content="162 guides sur vos droits CE 261 : vol retardé, annulé, surbooking. Jurisprudence CJUE, 43 routes Europe-Afrique, compagnies, procédure et recours. Jusqu'à 600 € par passager.">
  <link rel="canonical" href="https://robindesairs.eu/blog/">
  <link rel="alternate" hreflang="fr" href="https://robindesairs.eu/blog/">
  <link rel="alternate" hreflang="en" href="https://robindesairs.eu/en/blog/">
  <link rel="alternate" hreflang="x-default" href="https://robindesairs.eu/blog/">
  <meta property="og:title" content="Blog Robin des Airs — 162 guides CE 261">
  <meta property="og:description" content="Vol retardé, annulé, surbooking, bagage, jurisprudence CJUE. 162 articles classés par thème — diaspora Europe ↔ Afrique.">
  <meta property="og:url" content="https://robindesairs.eu/blog/">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://robindesairs.eu/robin-des-airs-logo-texte-profil.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Blog Robin des Airs — CE 261">
  <meta name="twitter:description" content="162 guides CE 261, jurisprudence CJUE, 43 routes Europe-Afrique. Indemnité jusqu'à 600 € par passager.">
  <meta name="twitter:image" content="https://robindesairs.eu/robin-des-airs-logo-texte-profil.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap"></noscript>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Blog","@id":"https://robindesairs.eu/blog/#blog","name":"Blog Robin des Airs","description":"Guides CE 261/2004, jurisprudence CJUE, routes Europe-Afrique, procédure et recours.","url":"https://robindesairs.eu/blog/","inLanguage":"fr-FR","publisher":{"@type":"Organization","@id":"https://robindesairs.eu/#organization","name":"Robin des Airs","url":"https://robindesairs.eu/","logo":{"@type":"ImageObject","url":"https://robindesairs.eu/robin-des-airs-logo-texte-profil.png"}}}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Robin des Airs","item":"https://robindesairs.eu/"},{"@type":"ListItem","position":2,"name":"Blog","item":"https://robindesairs.eu/blog/"}]}</script>
  <style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#F9FAFB;color:#111827;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-family:'Montserrat',sans-serif}
nav.topbar{background:#0B1F3A;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between}
nav.topbar a{color:#fff;font-size:.875rem;text-decoration:none;font-weight:700}
nav.topbar a.back{color:rgba(255,255,255,.8);font-weight:600}
nav.topbar a.back:hover{color:#fff}
.wrap{max-width:72rem;margin:0 auto;padding:2.5rem 1.5rem 5rem}
.hero{background:linear-gradient(135deg,#0B1F3A 0%,#1E3A5F 100%);color:#fff;border-radius:1rem;padding:2.5rem 1.75rem;margin-bottom:2rem;text-align:center}
.hero h1{margin:0 0 .5rem;font-size:1.75rem;font-weight:900;letter-spacing:-.01em}
.hero p.lead{margin:0 0 1.5rem;color:rgba(255,255,255,.8);font-size:.95rem;max-width:36rem;margin-left:auto;margin-right:auto}
.hero-badges{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-top:1rem}
.hero-badges span{background:rgba(0,229,160,.12);color:#00E5A0;border:1px solid rgba(0,229,160,.3);border-radius:999px;padding:.35rem .85rem;font-size:.75rem;font-weight:700;letter-spacing:.02em}
.search-bar{margin:1.5rem auto 0;max-width:32rem;position:relative}
.search-bar input{width:100%;padding:.75rem 1rem .75rem 2.5rem;border-radius:.625rem;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:.95rem;font-family:inherit;outline:none;transition:border-color .15s}
.search-bar input::placeholder{color:rgba(255,255,255,.5)}
.search-bar input:focus{border-color:#00E5A0;background:rgba(255,255,255,.12)}
.search-bar svg{position:absolute;left:.85rem;top:50%;transform:translateY(-50%);width:18px;height:18px;color:rgba(255,255,255,.5);pointer-events:none}
.toc{background:#fff;border:1px solid #E5E7EB;border-radius:.875rem;padding:1.25rem 1.5rem;margin-bottom:2.5rem}
.toc h2{margin:0 0 .75rem;font-size:.8125rem;font-weight:800;color:#0B1F3A;text-transform:uppercase;letter-spacing:.06em}
.toc ul{list-style:none;padding:0;margin:0;display:grid;gap:.4rem;grid-template-columns:1fr}
@media(min-width:640px){.toc ul{grid-template-columns:1fr 1fr}}
@media(min-width:960px){.toc ul{grid-template-columns:1fr 1fr 1fr}}
.toc a{color:#0B1F3A;font-size:.875rem;font-weight:600;text-decoration:none;display:flex;align-items:center;justify-content:space-between;padding:.35rem .55rem;border-radius:.5rem;border:1px solid transparent;transition:all .12s}
.toc a:hover{border-color:#00C87A;background:#EFF9F4}
.toc-count{background:#0B1F3A;color:#fff;font-size:.65rem;font-weight:700;padding:.1rem .5rem;border-radius:999px;margin-left:.5rem;letter-spacing:.04em}
.toc a:hover .toc-count{background:#00C87A}
.featured-section{margin-bottom:3rem}
.featured-section h2{margin:0 0 .25rem;font-size:1.125rem;font-weight:800;color:#0B1F3A;padding-left:12px;border-left:4px solid #F59E0B}
.featured-section p.sub{margin:0 0 1.25rem;color:#6B7280;font-size:.875rem;padding-left:1rem}
.theme{margin-bottom:2.75rem;scroll-margin-top:1rem}
.theme-head{margin-bottom:1.25rem}
.theme-title{margin:0;font-size:1.125rem;font-weight:800;color:#0B1F3A;padding-left:12px;border-left:4px solid #00C87A;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
.theme-count{background:#EFF9F4;color:#009960;font-size:.7rem;font-weight:700;padding:.15rem .55rem;border-radius:999px}
.theme-sub{margin:.4rem 0 0;color:#6B7280;font-size:.875rem;padding-left:1rem}
.grid{display:grid;gap:.875rem;grid-template-columns:1fr}
@media(min-width:640px){.grid{grid-template-columns:1fr 1fr}}
@media(min-width:960px){.grid{grid-template-columns:1fr 1fr 1fr}}
.grid--dense{gap:.625rem}
@media(min-width:960px){.grid--dense{grid-template-columns:1fr 1fr 1fr}}
.card{display:block;padding:1rem 1.1rem;border-radius:.75rem;border:1px solid #E5E7EB;background:#fff;text-decoration:none;transition:all .15s ease}
.card:hover{border-color:#00C87A;box-shadow:0 4px 12px -2px rgba(11,31,58,.08);transform:translateY(-1px)}
.card h3{font-size:.9375rem;font-weight:700;color:#0B1F3A;margin:0;line-height:1.35}
.card p{font-size:.8125rem;color:#6B7280;margin:.35rem 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.45}
.card.featured{border:1px solid rgba(245,158,11,.3);background:linear-gradient(135deg,#fff 0%,#FFFBEB 100%);padding:1.25rem 1.35rem;position:relative}
.card.featured::before{content:'★';position:absolute;top:.7rem;right:.85rem;color:#F59E0B;font-size:.875rem}
.card.featured h3{font-size:1rem;padding-right:1.2rem}
.card.featured p{font-size:.8125rem;-webkit-line-clamp:3}
.card.featured:hover{border-color:#F59E0B}
.no-results{display:none;text-align:center;padding:2rem;color:#6B7280;font-size:.875rem}
.no-results.visible{display:block}
.cta-final{margin-top:3rem;border-radius:1rem;background:#0B1F3A;color:#fff;text-align:center;padding:2.5rem 1.75rem}
.cta-final h2{margin:0 0 .5rem;font-size:1.25rem;font-weight:800}
.cta-final p{margin:0 0 1.25rem;color:rgba(255,255,255,.8);font-size:.9rem}
.cta-final .actions{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
.cta-final a{display:inline-block;font-weight:700;text-decoration:none;padding:.7rem 1.4rem;border-radius:.625rem;font-size:.9rem;transition:opacity .15s}
.cta-final a.primary{background:#F59E0B;color:#0B1F3A}
.cta-final a.secondary{background:rgba(255,255,255,.1);color:#00E5A0;border:1px solid rgba(0,229,160,.3)}
.cta-final a:hover{opacity:.92}
@media(max-width:639px){
  .hero{padding:2rem 1.25rem}
  .hero h1{font-size:1.4rem}
}
  </style>
</head>
<body>
  <nav class="topbar">
    <a href="/">ROBIN<span style="color:#00E5A0"> des Airs</span></a>
    <a href="/" class="back">← Retour à l'accueil</a>
  </nav>
  <main class="wrap">"""

    hero = f"""    <section class="hero">
      <h1>Guides Robin des Airs</h1>
      <p class="lead">Tout ce qu'il faut savoir sur le règlement CE 261/2004 — vol retardé, annulé, surbooké, bagage. Synthèse pédagogique mise à jour, jurisprudence CJUE incluse.</p>
      <div class="hero-badges">
        <span>{total} guides FR</span>
        <span>{cjue_count} arrêts CJUE</span>
        <span>{routes_count} routes long-courrier</span>
        <span>4 langues</span>
      </div>
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="search" id="blog-search" placeholder="Rechercher un article (vol retardé, Dakar, prescription…)" aria-label="Rechercher un article">
      </div>
    </section>

    <nav class="toc" aria-label="Sommaire du blog">
      <h2>Sommaire</h2>
      <ul>
{toc_items}
      </ul>
    </nav>

    <section class="featured-section" id="a-lire-en-premier">
      <h2>À lire en premier</h2>
      <p class="sub">Les 6 guides à consulter pour comprendre vos droits avant toute démarche.</p>
      <div class="grid">
{featured_html}
      </div>
    </section>

    <p class="no-results" id="no-results">Aucun article ne correspond à votre recherche.</p>"""

    sections_str = "\n\n".join(sections_html)

    cta = """    <section class="cta-final">
      <h2>Prêt à récupérer votre indemnité ?</h2>
      <p>Diagnostic gratuit en 2 minutes — sans avance de frais, 25 % uniquement si on récupère.</p>
      <div class="actions">
        <a class="primary" href="https://robindesairs.eu/#funnel-box">Diagnostic gratuit</a>
        <a class="secondary" href="https://wa.me/33756863630">WhatsApp direct</a>
      </div>
    </section>
  </main>
  <script>
    (function(){
      var input = document.getElementById('blog-search');
      var noResults = document.getElementById('no-results');
      if (!input) return;
      var cards = Array.prototype.slice.call(document.querySelectorAll('.card[data-search]'));
      var sections = Array.prototype.slice.call(document.querySelectorAll('.theme, .featured-section'));
      function normalize(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');}
      function apply(){
        var q = normalize(input.value.trim());
        if (!q) {
          cards.forEach(function(c){ c.style.display=''; });
          sections.forEach(function(s){ s.style.display=''; });
          noResults.classList.remove('visible');
          return;
        }
        var any = false;
        cards.forEach(function(c){
          var hay = normalize(c.dataset.search);
          var show = hay.indexOf(q) !== -1;
          c.style.display = show ? '' : 'none';
          if (show) any = true;
        });
        sections.forEach(function(s){
          var visible = s.querySelectorAll('.card:not([style*="display: none"])').length;
          s.style.display = visible ? '' : 'none';
        });
        noResults.classList.toggle('visible', !any);
      }
      input.addEventListener('input', apply);
      input.addEventListener('search', apply);
    })();
  </script>
</body>
</html>
"""

    return head + "\n" + hero + "\n\n" + sections_str + "\n\n" + cta


def main() -> int:
    html = INDEX.read_text(encoding="utf-8")
    cards = parse_cards(html)
    if len(cards) < 100:
        sys.exit(f"only {len(cards)} cards parsed — aborting")
    new_html = render(cards)
    INDEX.write_text(new_html, encoding="utf-8")
    print(f"Rebuilt blog/index.html with {len(cards)} cards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

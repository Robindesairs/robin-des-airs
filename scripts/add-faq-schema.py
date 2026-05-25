#!/usr/bin/env python3
"""Ajoute une section FAQ (HTML visible + JSON-LD FAQPage) aux articles qui n'en ont pas.

Catégorise par filename, applique un template par catégorie avec
substitution de variables (route, compagnie, sujet) extraites du titre.

Ne touche pas aux articles ayant déjà un FAQPage schema OU une section faq visible.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Callable

# ----------------------------------------------------------------------
# Catégorisation
# ----------------------------------------------------------------------

CATEGORIES = {
    "route": [
        "vol-retarde-abidjan-paris",
        "vol-retarde-antilles-guadeloupe-martinique",
        "vol-retarde-bamako-paris",
        "vol-retarde-conakry-paris",
        "vol-retarde-dakar-paris",
        "vol-retarde-douala-paris",
        "vol-retarde-kinshasa-bruxelles",
        "vol-retarde-lyon-marseille-nice",
    ],
    "compagnie": [
        "corsair-vol-retarde",
        "royal-air-maroc-vol-retarde",
        "transavia-vol-retarde",
        "vol-air-france-retarde",
        "vol-retarde-ryanair",
    ],
    "procedure": [
        "bon-achat-compagnie-aerienne-piege",
        "combien-temps-reclamer-indemnite-vol",
        "correspondance-manquee-indemnite-vol",
        "mediation-aerienne-obligatoire-2026",
        "que-faire-aeroport-vol-retarde",
        "reclamer-seul-ou-passer-par-un-service",
        "reglementation-ce261-resume",
        "remboursement-billet-vs-indemnite-ce261",
        "surbooking-refus-embarquement-indemnite",
        "vol-annule-indemnite-600-euros",
        "vol-charter-tour-operateur-retard-droits",
        "vol-deroutement-aeroport-secondaire-droits",
    ],
    "saisonnier": [
        "greve-air-france-indemnite",
        "greve-controleurs-aeriens-ete-2026",
        "harmattan-vol-afrique-retard-saison",
        "rentree-universitaire-etudiants",
        "retards-vol-noel-decembre",
        "vol-pelerinage-omra-hadj",
        "vol-ramadan-aid-tabaski",
        "vol-deces-famille-retard-funerailles",
    ],
    "pratique": [
        "chiffres-choc-indemnisation",
        "dossiers-types-robin-cas-reels",
        "guide-ce261-droits-passagers-afrique",
        "indemnite-vol-montants-250-400-600",
        "robin-des-airs-vs-airhelp",
        "robin-des-airs-vs-flightright",
        "robin-des-airs-vs-skycop",
    ],
    "special": [
        "business-class-premium-vol-retarde",
        "indemnite-vol-retarde-famille-enfants",
        "voyage-organise-package-vol-retarde",
    ],
    "jurisprudence": [
        "arret-wallentin-hermann-panne-technique",
    ],
}


def categorize(filename: str) -> str | None:
    stem = filename.replace(".html", "")
    for cat, prefixes in CATEGORIES.items():
        for p in prefixes:
            if stem.startswith(p):
                return cat
    return None


# ----------------------------------------------------------------------
# Templates de FAQ par catégorie
# Chaque entrée est une liste de (question, réponse).
# Les réponses utilisent {var} pour substitutions.
# ----------------------------------------------------------------------

FAQ_TEMPLATES: dict[str, list[tuple[str, str]]] = {
    "route": [
        (
            "Quel montant d'indemnité puis-je toucher sur la liaison {route} ?",
            "Selon le règlement CE 261/2004, l'indemnité dépend de la distance : "
            "250 € (≤ 1 500 km), 400 € (1 500–3 500 km) ou 600 € (> 3 500 km). "
            "La majorité des vols entre Paris et l'Afrique de l'Ouest/Centrale dépassent "
            "3 500 km, donnant droit à 600 € par passager en cas de retard ≥ 3h à l'arrivée.",
        ),
        (
            "Combien de temps ai-je pour réclamer mon indemnité ?",
            "En France, vous disposez de <strong>5 ans</strong> à compter de la date du "
            "vol (art. 2224 du Code civil). Vous pouvez donc encore réclamer pour des vols "
            "{route} retardés ou annulés survenus depuis 2021.",
        ),
        (
            "La compagnie peut-elle refuser de payer en invoquant la météo ou une panne ?",
            "Non, sauf preuve réelle de circonstances extraordinaires. Une panne technique "
            "n'en est <strong>pas</strong> une (jurisprudence Wallentin-Hermann, CJUE 2008). "
            "La météo n'est invocable que si elle est exceptionnelle ET si aucun autre vol "
            "n'a pu décoller. Robin des Airs fournit les bulletins METAR/TAF pour contester.",
        ),
    ],
    "compagnie": [
        (
            "{compagnie} doit-elle me verser une indemnité en cas de retard ?",
            "Oui, si le vol part d'un aéroport de l'UE OU si {compagnie} est une compagnie "
            "européenne (peu importe le point de départ). Indemnité de 250 €, 400 € ou 600 € "
            "selon la distance, dès 3h de retard à l'arrivée (jurisprudence Sturgeon, CJUE 2009).",
        ),
        (
            "Que faire si {compagnie} me propose un bon d'achat à la place du cash ?",
            "Refusez par écrit. Le règlement CE 261 prévoit une indemnité <strong>en espèces</strong> "
            "(virement, chèque ou CB). Accepter un avoir vous fait souvent perdre votre droit à "
            "l'indemnité réelle, qui vaut presque toujours plus que le bon proposé.",
        ),
        (
            "Combien de temps {compagnie} a-t-elle pour me payer ?",
            "Le CE 261 ne fixe pas de délai légal pour l'indemnité forfaitaire. En pratique, "
            "comptez 2 à 4 semaines pour les grandes compagnies européennes après acceptation, "
            "et jusqu'à 8 semaines pour certaines compagnies non-européennes. "
            "Sans réponse à 4 semaines, envoyez une lettre recommandée.",
        ),
    ],
    "procedure": [
        (
            "Quelle est la première étape pour récupérer mon indemnité ?",
            "Envoyez une réclamation écrite au service client de la compagnie (e-mail ou "
            "formulaire en ligne) en précisant numéro de vol, date, retard constaté et "
            "montant réclamé. Conservez l'accusé d'envoi : il sert de point de départ "
            "à la procédure si la compagnie refuse ou tarde.",
        ),
        (
            "Que faire si la compagnie refuse ou ne répond pas ?",
            "Si pas de réponse sous 2 mois ou refus injustifié : envoyez une lettre recommandée "
            "avec accusé de réception fixant un délai de 15 jours, puis saisissez le "
            "<strong>Médiateur Tourisme et Voyage (MTV)</strong> en ligne — saisine gratuite, "
            "délai de traitement 90 jours. Étape obligatoire avant tribunal depuis le 7 février 2026.",
        ),
        (
            "Vaut-il mieux passer par un service ou réclamer seul ?",
            "Réclamer seul est gratuit mais demande du temps et une bonne connaissance du "
            "règlement. Un service comme Robin des Airs prend une commission (25 %) uniquement "
            "en cas de succès, gère toute la procédure et applique la jurisprudence CJUE. "
            "Le choix dépend de votre disponibilité et confort avec les démarches.",
        ),
    ],
    "saisonnier": [
        (
            "Ce type d'événement constitue-t-il une circonstance extraordinaire ?",
            "Tout dépend. Une grève <strong>interne</strong> du personnel de la compagnie "
            "ou un problème technique n'en sont <strong>pas</strong> (arrêts Krüsemann CJUE 2018 "
            "et Wallentin-Hermann CJUE 2008). Une grève des contrôleurs aériens externes ou "
            "une météo exceptionnelle peuvent l'être — mais la compagnie doit en apporter la preuve.",
        ),
        (
            "Mon vol est retardé pendant une période de forte affluence : ai-je droit à l'indemnité ?",
            "Oui, exactement comme à n'importe quelle autre période. Le règlement CE 261/2004 "
            "ne fait pas de distinction selon la saison. Une compagnie ne peut pas invoquer "
            "la forte affluence comme circonstance extraordinaire — c'est une situation "
            "prévisible qu'elle doit anticiper.",
        ),
        (
            "Que faire concrètement à l'aéroport pendant l'attente ?",
            "Notez l'heure exacte des annonces, gardez votre carte d'embarquement et tous "
            "justificatifs de dépenses (repas, transport, hôtel). Au-delà de 2/3/4h de retard "
            "selon la distance, la compagnie doit vous fournir repas et rafraîchissements. "
            "Si elle ne le fait pas, conservez vos factures : remboursement possible.",
        ),
    ],
    "pratique": [
        (
            "Quels sont les montants exacts prévus par le règlement CE 261 ?",
            "<strong>250 €</strong> pour les vols ≤ 1 500 km, <strong>400 €</strong> pour les "
            "vols entre 1 500 et 3 500 km (et tout intra-UE > 1 500 km), <strong>600 €</strong> "
            "pour les vols extra-UE > 3 500 km. Ces montants sont par passager, indépendants "
            "du prix du billet, et payables en espèces.",
        ),
        (
            "Combien Robin des Airs coûte-t-il vraiment ?",
            "Commission de <strong>25 %</strong> du montant récupéré, uniquement en cas de succès. "
            "Aucun frais à avancer, aucun risque. Sur une indemnité de 600 €, vous touchez "
            "450 € net. Pour une famille de 4 sur un vol long-courrier retardé, "
            "cela représente 1 800 € net (600 € × 4 − 25 % de commission).",
        ),
        (
            "Pourquoi choisir Robin des Airs plutôt qu'un concurrent ?",
            "Robin des Airs est spécialisé sur l'<strong>axe Europe ↔ Afrique</strong>, là où la "
            "majorité des concurrents généralistes ont des taux de succès médiocres. Connaissance "
            "fine des compagnies africaines, des routes diaspora et de la jurisprudence applicable. "
            "Contact WhatsApp direct, paiement en cash, transparence totale.",
        ),
    ],
    "special": [
        (
            "Tous les passagers (y compris enfants/bébés) ont-ils droit à l'indemnité ?",
            "Oui — <strong>chaque passager ayant un billet</strong> a droit à sa propre indemnité, "
            "y compris les enfants et les bébés s'ils ont payé des taxes aéroportuaires. "
            "Le CE 261/2004 ne fait aucune distinction d'âge. Pour une famille de 4 sur un "
            "long-courrier retardé, c'est 4 × 600 € = 2 400 € brut.",
        ),
        (
            "Ma classe de voyage (économique, business, premium) change-t-elle le montant ?",
            "Non. L'indemnité forfaitaire CE 261 dépend uniquement de la <strong>distance du "
            "vol</strong>, pas du prix payé ni de la classe. Un passager économique et un "
            "passager business touchent exactement la même somme (250 / 400 / 600 €) "
            "pour le même vol retardé.",
        ),
        (
            "Un voyage organisé (package vol + hôtel) est-il aussi couvert ?",
            "Oui, le CE 261 s'applique à tous les vols éligibles, qu'ils soient achetés "
            "séparément ou inclus dans un package. Vous pouvez en plus invoquer le "
            "<strong>Code du tourisme</strong> contre le tour-opérateur si le retard a impacté "
            "le reste du séjour. Les deux recours peuvent se cumuler.",
        ),
    ],
    "jurisprudence": [
        (
            "Quelle est la portée de cet arrêt aujourd'hui ?",
            "Cet arrêt de la <strong>Cour de Justice de l'Union Européenne (CJUE)</strong> "
            "fait jurisprudence dans tous les États membres. Il s'applique directement aux "
            "litiges entre passagers et compagnies devant les tribunaux nationaux. Une compagnie "
            "qui l'ignore peut être condamnée aux dépens en plus de l'indemnité.",
        ),
        (
            "La compagnie peut-elle contourner cette jurisprudence ?",
            "Non. Les arrêts de la CJUE s'imposent à toutes les juridictions nationales "
            "(principe de primauté du droit de l'Union). Certaines compagnies tentent de "
            "le contester dans leurs réponses initiales, mais leur position ne tient pas "
            "devant le médiateur ou le tribunal.",
        ),
        (
            "Comment invoquer cette jurisprudence dans ma réclamation ?",
            "Citez nommément l'arrêt (nom + année + numéro d'affaire) dans votre lettre "
            "recommandée à la compagnie. Exemple : <em>« Conformément à l'arrêt CJUE "
            "[Nom-affaire], [année], affaire C-XXX/YY, je vous demande… »</em>. "
            "Cela renforce considérablement votre dossier.",
        ),
    ],
}


# ----------------------------------------------------------------------
# Extraction de variables (route, compagnie)
# ----------------------------------------------------------------------

ROUTE_MAP = {
    "vol-retarde-abidjan-paris": "Abidjan-Paris",
    "vol-retarde-antilles-guadeloupe-martinique": "Antilles (Guadeloupe / Martinique)",
    "vol-retarde-bamako-paris": "Bamako-Paris",
    "vol-retarde-conakry-paris": "Conakry-Paris",
    "vol-retarde-dakar-paris": "Dakar-Paris",
    "vol-retarde-douala-paris": "Douala-Paris",
    "vol-retarde-kinshasa-bruxelles": "Kinshasa-Bruxelles",
    "vol-retarde-lyon-marseille-nice": "Lyon / Marseille / Nice",
}

COMPAGNIE_MAP = {
    "corsair-vol-retarde": "Corsair",
    "royal-air-maroc-vol-retarde": "Royal Air Maroc",
    "transavia-vol-retarde": "Transavia",
    "vol-air-france-retarde": "Air France",
    "vol-retarde-ryanair": "Ryanair",
}


def get_variables(filename: str, category: str) -> dict:
    stem = filename.replace(".html", "")
    if category == "route":
        for k, v in ROUTE_MAP.items():
            if stem.startswith(k):
                return {"route": v}
    if category == "compagnie":
        for k, v in COMPAGNIE_MAP.items():
            if stem.startswith(k):
                return {"compagnie": v}
    return {}


# ----------------------------------------------------------------------
# Génération des blocs HTML + JSON-LD
# ----------------------------------------------------------------------

FAQ_HTML_TEMPLATE = """    <section class="faq">
      <h2>Questions fréquentes</h2>
{details}
    </section>
"""

DETAIL_TEMPLATE = """      <details>
        <summary>{q}</summary>
        <div>{a}</div>
      </details>"""

FAQ_SCHEMA_TEMPLATE = '  <script type="application/ld+json">{json}</script>'


def strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s)


def build_faq_blocks(qa_pairs: list[tuple[str, str]]) -> tuple[str, str]:
    details = "\n".join(DETAIL_TEMPLATE.format(q=q, a=a) for q, a in qa_pairs)
    html = FAQ_HTML_TEMPLATE.format(details=details)
    schema_obj = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": strip_html(a)},
            }
            for q, a in qa_pairs
        ],
    }
    schema = FAQ_SCHEMA_TEMPLATE.format(
        json=json.dumps(schema_obj, ensure_ascii=False, separators=(",", ":"))
    )
    return html, schema


# ----------------------------------------------------------------------
# Insertion dans le HTML
# ----------------------------------------------------------------------

def has_faq(html: str) -> bool:
    return ('"@type":"FAQPage"' in html) or ('<section class="faq"' in html)


def insert_faq(html: str, faq_html: str, faq_schema: str) -> str:
    # Insère le JSON-LD juste avant </head>
    html = html.replace("</head>", faq_schema + "\n</head>", 1)

    # Insère la section HTML juste avant la cta-box, sinon avant <section class="related">,
    # sinon avant </main>.
    if '<div class="cta-box">' in html:
        html = html.replace('<div class="cta-box">', faq_html + '    <div class="cta-box">', 1)
    elif '<section class="related">' in html:
        html = html.replace('<section class="related">', faq_html + '    <section class="related">', 1)
    elif '</main>' in html:
        html = html.replace('</main>', faq_html + '  </main>', 1)
    return html


def process(path: Path, dry_run: bool = False) -> dict:
    original = path.read_text(encoding="utf-8")
    if has_faq(original):
        return {"path": path.name, "skipped": True, "reason": "deja_faq"}
    category = categorize(path.name)
    if category is None:
        return {"path": path.name, "skipped": True, "reason": "non_categorise"}

    template = FAQ_TEMPLATES.get(category, [])
    if not template:
        return {"path": path.name, "skipped": True, "reason": f"pas_de_template_{category}"}

    variables = get_variables(path.name, category)
    qa_pairs = []
    for q, a in template:
        try:
            qa_pairs.append((q.format(**variables), a.format(**variables)))
        except KeyError as e:
            return {"path": path.name, "skipped": True, "reason": f"variable_manquante_{e}"}

    faq_html, faq_schema = build_faq_blocks(qa_pairs)
    new_html = insert_faq(original, faq_html, faq_schema)

    changed = new_html != original
    if changed and not dry_run:
        path.write_text(new_html, encoding="utf-8")

    return {
        "path": path.name,
        "skipped": False,
        "category": category,
        "questions_added": len(qa_pairs),
        "changed": changed,
    }


# ----------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------

def main() -> int:
    blog_dir = Path(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "blog")
    dry_run = "--dry-run" in sys.argv

    results = [process(f, dry_run=dry_run) for f in sorted(blog_dir.glob("*.html"))]
    changed = [r for r in results if not r["skipped"] and r["changed"]]
    skipped_by_reason: dict[str, int] = {}
    for r in results:
        if r["skipped"]:
            skipped_by_reason[r["reason"]] = skipped_by_reason.get(r["reason"], 0) + 1

    print(f"Total fichiers : {len(results)}")
    print(f"  FAQ ajoutée  : {len(changed)}")
    for reason, n in sorted(skipped_by_reason.items(), key=lambda x: -x[1]):
        print(f"  Skippé [{reason}] : {n}")
    if changed:
        from collections import Counter
        by_cat = Counter(r["category"] for r in changed)
        print("  Répartition par catégorie :")
        for cat, n in sorted(by_cat.items()):
            print(f"    {cat:14s} : {n}")
    if dry_run:
        print("\n(dry-run, aucun fichier écrit)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

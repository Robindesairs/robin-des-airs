#!/usr/bin/env python3
"""Injecte une Q&A 'cash' dans les articles dont c'est le sujet central.

Cible : 9 articles. Chaque insertion ajoute en mode synchrone :
- Une question <details><summary>...</summary><div>...</div></details>
  dans la <section class="faq"> existante.
- L'entrée correspondante dans le JSON-LD FAQPage existant.

Si l'article a déjà une question contenant "bon d'achat" ou "cash" ou
"espèces" dans son schema, le script saute.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Mapping article -> (question, réponse HTML pour visible, texte plain pour schema)
TARGETS: dict[str, tuple[str, str, str]] = {
    "compagnie-refuse-payer-indemnite-que-faire.html": (
        "Si la compagnie refuse de payer, puis-je quand même exiger le cash et pas un bon ?",
        "Oui, et c'est même fortement recommandé. Le règlement CE 261/2004 prévoit "
        "explicitement une indemnité <strong>en espèces, virement ou chèque</strong> "
        "— jamais en avoir ou bon d'achat sans votre accord écrit. Si la compagnie insiste "
        "sur un bon, refusez par lettre recommandée en rappelant l'article 7§3 du règlement.",
        "Oui, et c'est même fortement recommandé. Le règlement CE 261/2004 prévoit explicitement "
        "une indemnité en espèces, virement ou chèque — jamais en avoir ou bon d'achat sans votre "
        "accord écrit. Si la compagnie insiste sur un bon, refusez par lettre recommandée en "
        "rappelant l'article 7§3 du règlement.",
    ),
    "mediation-compagnie-aerienne-refus-indemnite.html": (
        "Le médiateur peut-il imposer un paiement en cash plutôt qu'un bon d'achat ?",
        "Oui. Le Médiateur Tourisme et Voyage (MTV) applique le règlement CE 261/2004 "
        "à la lettre : l'indemnité est <strong>due en argent</strong> (virement, chèque ou cash). "
        "Si la compagnie propose un avoir pendant la médiation et que vous le refusez, "
        "le médiateur retient le paiement en numéraire dans ses recommandations.",
        "Oui. Le Médiateur Tourisme et Voyage (MTV) applique le règlement CE 261/2004 à la lettre : "
        "l'indemnité est due en argent (virement, chèque ou cash). Si la compagnie propose un avoir "
        "pendant la médiation et que vous le refusez, le médiateur retient le paiement en numéraire "
        "dans ses recommandations.",
    ),
    "mise-en-demeure-compagnie-aerienne-ce261.html": (
        "Faut-il préciser dans la mise en demeure que je veux le paiement en cash ?",
        "Oui, c'est essentiel. Mentionnez explicitement : <em>« Je vous mets en demeure de "
        "me verser la somme de X € en espèces, par virement ou par chèque, à l'exclusion "
        "de tout avoir ou bon d'achat »</em>. Cette formulation empêche la compagnie de "
        "vous proposer un avoir comme contournement et vous donne un appui solide en cas "
        "de procédure judiciaire.",
        "Oui, c'est essentiel. Mentionnez explicitement : « Je vous mets en demeure de me verser "
        "la somme de X € en espèces, par virement ou par chèque, à l'exclusion de tout avoir ou "
        "bon d'achat ». Cette formulation empêche la compagnie de vous proposer un avoir comme "
        "contournement et vous donne un appui solide en cas de procédure judiciaire.",
    ),
    "lettre-mise-en-demeure-compagnie-aerienne-modele.html": (
        "Comment formuler la demande de paiement en cash dans ma lettre ?",
        "Insérez cette formule type : <em>« En application de l'article 7 du règlement CE 261/2004, "
        "je vous demande le versement de [montant] € par virement bancaire à l'exclusion "
        "de tout avoir, bon d'achat ou crédit voyage. À défaut de paiement sous 15 jours, "
        "je saisirai le Médiateur Tourisme et Voyage puis le tribunal compétent. »</em> "
        "Cette mention écrite est votre meilleure protection contre toute tentative "
        "de paiement en bon.",
        "Insérez cette formule type : « En application de l'article 7 du règlement CE 261/2004, "
        "je vous demande le versement de [montant] € par virement bancaire à l'exclusion de tout "
        "avoir, bon d'achat ou crédit voyage. À défaut de paiement sous 15 jours, je saisirai le "
        "Médiateur Tourisme et Voyage puis le tribunal compétent. » Cette mention écrite est votre "
        "meilleure protection contre toute tentative de paiement en bon.",
    ),
    "mediation-aerienne-obligatoire-2026.html": (
        "La nouvelle médiation obligatoire change-t-elle mon droit au paiement en cash ?",
        "Non, votre droit au paiement en espèces reste inchangé. La médiation obligatoire "
        "depuis le 7 février 2026 ne fait qu'<strong>ajouter une étape</strong> avant la "
        "saisine du tribunal — elle ne modifie pas le règlement CE 261/2004 ni l'obligation "
        "de paiement en cash de l'indemnité. Précisez votre demande de paiement en numéraire "
        "dès la saisine du médiateur.",
        "Non, votre droit au paiement en espèces reste inchangé. La médiation obligatoire depuis "
        "le 7 février 2026 ne fait qu'ajouter une étape avant la saisine du tribunal — elle ne "
        "modifie pas le règlement CE 261/2004 ni l'obligation de paiement en cash de l'indemnité. "
        "Précisez votre demande de paiement en numéraire dès la saisine du médiateur.",
    ),
    "remboursement-billet-vs-indemnite-ce261.html": (
        "Le remboursement du billet ET l'indemnité doivent-ils être versés en cash ?",
        "Oui pour les deux. L'article 8 (remboursement du billet annulé) impose le "
        "<strong>même moyen de paiement que l'achat</strong> sous 7 jours. L'article 7 "
        "(indemnité forfaitaire de 250/400/600 €) impose un paiement en <strong>espèces, "
        "virement ou chèque</strong>. Dans les deux cas, vous pouvez refuser un avoir et "
        "exiger le cash.",
        "Oui pour les deux. L'article 8 (remboursement du billet annulé) impose le même moyen de "
        "paiement que l'achat sous 7 jours. L'article 7 (indemnité forfaitaire de 250/400/600 €) "
        "impose un paiement en espèces, virement ou chèque. Dans les deux cas, vous pouvez "
        "refuser un avoir et exiger le cash.",
    ),
    "vol-annule-ce261-droits-remboursement.html": (
        "Si mon vol est annulé, puis-je exiger le remboursement en cash plutôt qu'un avoir ?",
        "Oui, c'est même votre droit le plus important. Le règlement CE 261/2004 (article 8) "
        "impose le remboursement du billet <strong>par le même moyen de paiement que l'achat</strong> "
        "(virement, CB, chèque) dans un délai strict de <strong>7 jours</strong>. La compagnie "
        "ne peut pas vous imposer un avoir — vous devez l'accepter explicitement. Si elle "
        "refuse le cash, c'est une infraction signalable à la DGAC.",
        "Oui, c'est même votre droit le plus important. Le règlement CE 261/2004 (article 8) "
        "impose le remboursement du billet par le même moyen de paiement que l'achat (virement, "
        "CB, chèque) dans un délai strict de 7 jours. La compagnie ne peut pas vous imposer un "
        "avoir — vous devez l'accepter explicitement. Si elle refuse le cash, c'est une infraction "
        "signalable à la DGAC.",
    ),
}


CASH_KEYWORDS_IN_SCHEMA = ("bon d'achat", "espèces", "en cash", "avoir", "virement")


def already_covers_cash(html: str) -> bool:
    """Check if the article's FAQPage schema already has a Q about cash/avoir/etc."""
    m = re.search(
        r'<script\b[^>]*type="application/ld\+json"[^>]*>\s*(\{[^<]*?"@type"\s*:\s*"FAQPage".*?\})\s*</script>',
        html,
        re.DOTALL,
    )
    if not m:
        return False
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return False
    for q in data.get("mainEntity", []):
        name = q.get("name", "").lower()
        if any(kw in name for kw in CASH_KEYWORDS_IN_SCHEMA):
            return True
    return False


def add_q_to_visible_faq(html: str, question: str, answer_html: str) -> tuple[str, bool]:
    """Insère un <details> à la fin de <section class="faq">."""
    detail = (
        "      <details>\n"
        f"        <summary>{question}</summary>\n"
        f"        <div>{answer_html}</div>\n"
        "      </details>\n"
    )

    pattern = re.compile(
        r'(<section class="faq">.*?)(</section>)',
        re.DOTALL,
    )
    m = pattern.search(html)
    if not m:
        return html, False

    section_body = m.group(1)
    closing = m.group(2)
    new_section = section_body.rstrip() + "\n" + detail + "    " + closing
    return html[: m.start()] + new_section + html[m.end():], True


def add_q_to_schema(html: str, question: str, answer_text: str) -> tuple[str, bool]:
    """Ajoute une Question dans le JSON-LD FAQPage existant."""
    pattern = re.compile(
        r'(<script\b[^>]*type="application/ld\+json"[^>]*>\s*)(\{[^<]*?"@type"\s*:\s*"FAQPage".*?\})(\s*</script>)',
        re.DOTALL,
    )
    m = pattern.search(html)
    if not m:
        return html, False
    open_tag = m.group(1)
    raw_json = m.group(2)
    close_tag = m.group(3)

    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError:
        return html, False

    new_question = {
        "@type": "Question",
        "name": question,
        "acceptedAnswer": {"@type": "Answer", "text": answer_text},
    }
    data.setdefault("mainEntity", []).append(new_question)
    new_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    new_block = open_tag + new_json + close_tag
    return html[: m.start()] + new_block + html[m.end():], True


def process(path: Path, dry_run: bool = False) -> dict:
    if path.name not in TARGETS:
        return {"path": path.name, "skipped": True, "reason": "non_cible"}

    original = path.read_text(encoding="utf-8")
    if already_covers_cash(original):
        return {"path": path.name, "skipped": True, "reason": "deja_couvert"}

    question, answer_html, answer_text = TARGETS[path.name]

    html = original
    html, ok_html = add_q_to_visible_faq(html, question, answer_html)
    html, ok_schema = add_q_to_schema(html, question, answer_text)

    if not (ok_html and ok_schema):
        return {
            "path": path.name,
            "skipped": True,
            "reason": f"insertion_partielle html={ok_html} schema={ok_schema}",
        }

    changed = html != original
    if changed and not dry_run:
        path.write_text(html, encoding="utf-8")

    return {"path": path.name, "skipped": False, "changed": changed}


def main() -> int:
    blog_dir = Path(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "blog")
    dry_run = "--dry-run" in sys.argv

    results = [process(blog_dir / name, dry_run=dry_run) for name in TARGETS]

    changed = [r for r in results if not r["skipped"] and r["changed"]]
    skipped = [r for r in results if r["skipped"]]

    print(f"Total cibles  : {len(TARGETS)}")
    print(f"  Q&A ajoutée : {len(changed)}")
    print(f"  Skippé      : {len(skipped)}")
    for r in skipped:
        print(f"    - {r['path']} : {r['reason']}")
    if dry_run:
        print("\n(dry-run, aucun fichier écrit)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

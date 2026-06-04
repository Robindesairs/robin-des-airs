#!/usr/bin/env python3
"""Ajoute un résumé « En clair » (langage simple, grand public) après chaque
article du mandat, SANS toucher au texte juridique contraignant.

Idempotent : ne réinsère pas si « class="plain" » est déjà présent.
À lancer après ajout/modif d'articles dans mandat.html.

    python3 scripts/add-plain-language.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [ROOT / "mandat.html", ROOT / "documents" / "mandat-fr.html"]

CSS = (
    ".clause .plain{margin-top:10px;padding:9px 13px;background:#EFF9F4;"
    "border-left:3px solid #00C87A;border-radius:0 6px 6px 0;font-size:12.5px;"
    "color:#1a2436;line-height:1.65;font-style:normal}\n"
    ".clause .plain strong{color:#009960}\n"
)

# (préfixe unique du titre d'article, résumé en clair)
ARTICLES = [
    ("Article 1 — Objet", "Vous chargez Robin des Airs de récupérer l'argent que la compagnie vous doit. On agit d'abord en votre nom — ça garde l'accès à la médiation."),
    ("Article 1 bis — Option", "Tant qu'on règle à l'amiable, vous restez propriétaire de votre dossier. Si on doit aller au tribunal, on bascule pour agir plus efficacement."),
    ("Article 2 — Durée", "Le mandat dure 24 mois. Il peut être arrêté de part et d'autre en cas de problème grave (préavis 15 jours)."),
    ("Article 3 — Exclusivité", "Pendant ce temps, ne confiez pas le même dossier à quelqu'un d'autre et ne négociez pas seul avec la compagnie sans nous prévenir."),
    ("Article 4 — Honoraires", "On prend 25 % seulement si on récupère de l'argent. Si on ne gagne rien, vous ne payez rien."),
    ("Article 4.1 — Frais", "Les frais d'avocat et de justice sont pour nous. Vous n'avancez jamais d'argent."),
    ("Article 5 — Paiement", "La compagnie paie sur NOTRE compte, jamais le vôtre. On vous reverse vos 75 % sous 48 h une fois l'argent vraiment encaissé."),
    ("Article 5 bis — Cession", "Pour sécuriser le recouvrement, vous nous cédez votre créance le temps de la récupérer. Si ça échoue, elle vous revient."),
    ("Article 5 ter — Inopposabilité", "Si la compagnie prétend que vous n'aviez pas le droit de nous céder le dossier, c'est faux : la justice européenne l'a tranché."),
    ("Article 6 — Clause Non Libératoire", "Si la compagnie vous paie directement pour nous contourner, elle nous doit quand même le paiement."),
    ("Article 7 — Obligations de Robin", "On traite votre dossier avec sérieux, on vous tient informé, on vous paie vite et on protège vos données."),
    ("Article 8 — Obligations du Mandant", "Donnez-nous des infos exactes, prévenez-nous si la compagnie vous contacte, et n'encaissez rien sans nous le dire."),
    ("Article 9 — Droit de rétractation", "Vous pouvez changer d'avis sous 14 jours, sans frais ni justification."),
    ("Article 9 bis — Passagers mineurs", "Pour un enfant mineur, c'est le parent ou le tuteur qui signe à sa place."),
    ("Article 10 — Confidentialité", "Vos données servent uniquement à votre dossier. Jamais revendues."),
    ("Article 11 — Loi applicable", "Droit français. En cas de litige, on cherche d'abord une solution à l'amiable."),
]


def process(path: Path) -> None:
    if not path.exists():
        print("introuvable:", path)
        return
    html = path.read_text(encoding="utf-8")

    if ".clause .plain" not in html:
        html = html.replace("</style>", CSS + "</style>", 1)

    if 'class="plain"' in html:
        print("déjà fait (résumés présents):", path.name)
        path.write_text(html, encoding="utf-8")
        return

    added = 0
    for prefix, plain in ARTICLES:
        pattern = r'(<span class="cnum"[^>]*>' + re.escape(prefix) + r'[^<]*</span>)'
        box = '\\1\n    <div class="plain">\U0001F4A1 <strong>En clair&nbsp;:</strong> ' + plain + '</div>'
        html, n = re.subn(pattern, box, html, count=1)
        added += n
        if n == 0:
            print("  ! non trouvé:", prefix)
    path.write_text(html, encoding="utf-8")
    print(f"OK {path.name} — {added}/{len(ARTICLES)} résumés ajoutés")


if __name__ == "__main__":
    targets = [Path(p) for p in sys.argv[1:]] or FILES
    for t in targets:
        process(t)

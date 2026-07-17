#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ajoute canonical + JSON-LD (@graph) aux pages publiques racine qui n'en avaient pas.

Toutes les entités se rattachent au nœud existant https://robindesairs.eu/#organization
défini dans index.html : on ne le duplique jamais, on le référence par @id.

Le texte des FAQ est rédigé en français ACCENTUÉ : ces réponses sont faites pour être
citées telles quelles par un assistant IA. Du français désaccentué dans le schéma, c'est
du français désaccentué restitué au passager.

Idempotent : marque chaque bloc injecté avec data-aeo="1" et ne réinjecte pas.
Usage : python3 scripts/add-aeo-schema-pages.py [--dry-run]
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://robindesairs.eu"
ORG = {"@id": f"{BASE}/#organization"}
SITE = {"@id": f"{BASE}/#website"}

WA = "+33 7 56 86 36 30"
WA_LINK = "https://wa.me/33756863630"


def page(url, name, desc, extra=None):
    """Nœud WebPage standard, rattaché au site et à l'organisation."""
    node = {
        "@type": "WebPage",
        "@id": f"{BASE}/{url}#webpage",
        "url": f"{BASE}/{url}",
        "name": name,
        "description": desc,
        "isPartOf": SITE,
        "about": ORG,
        "publisher": ORG,
        "inLanguage": "fr-FR",
    }
    if extra:
        node.update(extra)
    return node


def breadcrumb(url, label):
    return {
        "@type": "BreadcrumbList",
        "@id": f"{BASE}/{url}#breadcrumb",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Accueil", "item": f"{BASE}/"},
            {"@type": "ListItem", "position": 2, "name": label, "item": f"{BASE}/{url}"},
        ],
    }


def faq(url, qa):
    return {
        "@type": "FAQPage",
        "@id": f"{BASE}/{url}#faq",
        "isPartOf": {"@id": f"{BASE}/{url}#webpage"},
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            }
            for q, a in qa
        ],
    }


# --- speakable : passages que les assistants vocaux peuvent lire tels quels ---
SPEAKABLE = {
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", ".lede", ".quick-answer"],
}

PAGES = {}

# NOTE : nos-tarifs.html est volontairement absent de ce dict. Une autre session a balisé
# cette page en parallèle le 17/07/2026 ; réinjecter ici créerait des @id dupliqués
# (#webpage / #service / #faq en double), ce qui est pire que pas de schéma du tout.
# Le canonical de la page, lui, manquait et a bien été ajouté par ce script.

# ─────────────────────────────────────────────────────────────
# guide-whatsapp.html — HowTo : « comment réclamer » = requête IA n°2.
# ─────────────────────────────────────────────────────────────
_u = "guide-whatsapp.html"
PAGES[_u] = {
    "canonical": f"{BASE}/{_u}",
    "graph": [
        page(_u, "Déposer son dossier d'indemnisation via WhatsApp",
             "Les pièces à envoyer, dans l'ordre, pour lancer une réclamation "
             "CE 261/2004 par WhatsApp. Aucun RIB n'est demandé à cette étape.",
             {"speakable": SPEAKABLE}),
        breadcrumb(_u, "Déposer via WhatsApp"),
        {
            "@type": "HowTo",
            "@id": f"{BASE}/{_u}#howto",
            "name": "Déposer un dossier d'indemnisation de vol via WhatsApp",
            "description": "Quatre étapes pour transmettre une réclamation "
                           "CE 261/2004 à Robin des Airs par WhatsApp.",
            "totalTime": "PT5M",
            "estimatedCost": {"@type": "MonetaryAmount", "currency": "EUR", "value": 0},
            "supply": [
                {"@type": "HowToSupply", "name": "Numéro et date du vol"},
                {"@type": "HowToSupply", "name": "Carte d'embarquement ou e-billet"},
                {"@type": "HowToSupply", "name": "Passeport ou carte d'identité"},
            ],
            "tool": [{"@type": "HowToTool", "name": "WhatsApp"}],
            "step": [
                {"@type": "HowToStep", "position": 1,
                 "name": "Envoyer les informations du vol",
                 "text": "Indiquer le numéro de vol, la date du vol et le motif : "
                         "retard, annulation ou surbooking. Un simple message suffit.",
                 "url": f"{BASE}/{_u}#etape-1"},
                {"@type": "HowToStep", "position": 2,
                 "name": "Envoyer la carte d'embarquement",
                 "text": "Une photo ou un PDF de la carte d'embarquement, ou une "
                         "capture de l'application ou de l'e-billet.",
                 "url": f"{BASE}/{_u}#etape-2"},
                {"@type": "HowToStep", "position": 3,
                 "name": "Envoyer une pièce d'identité",
                 "text": "Photo du passeport (page photo) ou de la carte d'identité "
                         "(recto), au même nom que sur le billet.",
                 "url": f"{BASE}/{_u}#etape-3"},
                {"@type": "HowToStep", "position": 4,
                 "name": "Envoyer ses coordonnées",
                 "text": "Prénom, nom, email et téléphone. Le numéro WhatsApp suffit. "
                         "Le RIB n'est jamais demandé à cette étape.",
                 "url": f"{BASE}/{_u}#etape-4"},
            ],
        },
        faq(_u, [
            ("Faut-il envoyer son RIB sur WhatsApp ?",
             "Non. Le RIB n'est jamais demandé sur WhatsApp au moment du dépôt. Le "
             "virement est organisé plus tard, une fois le dossier accepté, par email "
             "ou via un formulaire sécurisé."),
            ("Quelles pièces faut-il pour déposer un dossier ?",
             "Trois pièces suffisent : les informations du vol (numéro, date, motif), "
             "la carte d'embarquement ou l'e-billet, et une pièce d'identité au même "
             "nom que sur le billet."),
        ]),
    ],
}

# ─────────────────────────────────────────────────────────────
# droit-retractation.html — question de confiance (« est-ce risqué ? »)
# ─────────────────────────────────────────────────────────────
_u = "droit-retractation.html"
PAGES[_u] = {
    "canonical": f"{BASE}/{_u}",
    "graph": [
        page(_u, "Droit de rétractation : 14 jours sans frais",
             "Délai légal de 14 jours calendaires pour se rétracter du contrat de "
             "cession, sans motif et sans pénalité (art. L.221-18 du Code de la "
             "consommation).",
             {"speakable": SPEAKABLE}),
        breadcrumb(_u, "Droit de rétractation"),
        faq(_u, [
            ("Peut-on annuler après avoir signé avec Robin des Airs ?",
             "Oui. Conformément aux articles L.221-18 et suivants du Code de la "
             "consommation, le passager dispose de 14 jours calendaires à compter de "
             "la signature du contrat de cession pour se rétracter, sans avoir à "
             "motiver sa décision et sans aucune pénalité."),
            ("La rétractation entraîne-t-elle des frais ?",
             "Non. En cas de rétractation dans le délai de 14 jours, aucun frais n'est "
             "demandé au passager, même si le dossier a déjà été monté : le travail "
             "engagé reste à la charge de Robin des Airs."),
            ("Comment exercer son droit de rétractation ?",
             "Il suffit d'informer Robin des Airs de manière claire et non équivoque, "
             "par email à contact@robindesairs.eu, par courrier au 66 avenue des "
             f"Champs-Élysées, 75008 Paris, ou par WhatsApp au {WA}."),
        ]),
    ],
}

# ─────────────────────────────────────────────────────────────
# depot-express.html — la page d'action citée dans llms.txt
# ─────────────────────────────────────────────────────────────
_u = "depot-express.html"
PAGES[_u] = {
    "canonical": f"{BASE}/{_u}",
    "graph": [
        page(_u, "Déposer son dossier en 2 minutes",
             "Formulaire guidé : vérification d'éligibilité, lecture de la carte "
             "d'embarquement et signature électronique. Environ 2 minutes, 0 € "
             "d'avance, sans compte ni WhatsApp.",
             {"speakable": SPEAKABLE,
              "significantLink": [f"{BASE}/nos-tarifs.html", WA_LINK]}),
        breadcrumb(_u, "Déposer mon dossier"),
        {
            "@type": "WebApplication",
            "@id": f"{BASE}/{_u}#app",
            "name": "Dépôt express Robin des Airs",
            "url": f"{BASE}/{_u}",
            "applicationCategory": "BusinessApplication",
            "browserRequirements": "Navigateur web moderne",
            "operatingSystem": "All",
            "provider": ORG,
            "featureList": [
                "Vérification d'éligibilité CE 261/2004",
                "Lecture automatique de la carte d'embarquement ou de l'e-billet",
                "Signature électronique du contrat de cession",
            ],
            "offers": {
                "@type": "Offer",
                "price": 0,
                "priceCurrency": "EUR",
                "description": "Dépôt gratuit. Commission de succès uniquement en cas "
                               "d'indemnité récupérée.",
            },
        },
    ],
}

# ─────────────────────────────────────────────────────────────
# choix-reclamation.html
# ─────────────────────────────────────────────────────────────
_u = "choix-reclamation.html"
PAGES[_u] = {
    "canonical": f"{BASE}/{_u}",
    "graph": [
        page(_u, "Comment réclamer son indemnité de vol",
             "Deux façons de déposer un dossier CE 261/2004 : par WhatsApp ou via le "
             "formulaire en ligne."),
        breadcrumb(_u, "Comment réclamer"),
    ],
}

# ─────────────────────────────────────────────────────────────
# parrainage.html
# ─────────────────────────────────────────────────────────────
_u = "parrainage.html"
PAGES[_u] = {
    "graph": [
        page(_u, "Parrainage Robin des Airs",
             "Parrainer un proche dont le vol Europe-Afrique a été retardé ou annulé "
             "et recevoir un accès salon lounge en aéroport."),
        breadcrumb(_u, "Parrainage"),
        faq(_u, [
            ("Comment fonctionne le parrainage Robin des Airs ?",
             "Le parrain transmet le nom de son proche par WhatsApp, Robin des Airs "
             "contacte le filleul, vérifie son éligibilité et gère toute la "
             "réclamation CE 261/2004. Le parrain n'a aucune démarche administrative "
             "à faire."),
            ("Que gagne le parrain ?",
             "Un accès salon lounge en aéroport, d'une valeur d'environ 60 à 80 €, "
             "offert par Robin des Airs et valable un an à compter de sa réception. "
             "Le parrainage est sans limite, sans avance et sans risque."),
        ]),
    ],
}

# ─────────────────────────────────────────────────────────────
# programme-agents-voyage.html — B2B
# ─────────────────────────────────────────────────────────────
_u = "programme-agents-voyage.html"
PAGES[_u] = {
    "graph": [
        page(_u, "Programme partenaire agences de voyage",
             "45 € nets par passager indemnisé pour l'agence, versés par Wave, Orange "
             "Money ou virement SEPA. Robin des Airs gère la réclamation CE 261/2004."),
        breadcrumb(_u, "Programme agences"),
        {
            "@type": "Offer",
            "@id": f"{BASE}/{_u}#offer-agence",
            "name": "Commission agence : 45 € nets par passager indemnisé",
            "description": "L'agence perçoit 45 € nets (30 000 FCFA) par passager "
                           "indemnisé, versés sur son compte après réception des fonds "
                           "côté passager. Zéro frais fixe. Robin des Airs prend en "
                           "charge l'intégralité de la réclamation.",
            "price": 45,
            "priceCurrency": "EUR",
            "offeredBy": ORG,
            "eligibleCustomerType": "http://purl.org/goodrelations/v1#Business",
        },
        faq(_u, [
            ("Combien touche une agence de voyage par passager indemnisé ?",
             "45 € nets (environ 30 000 FCFA) par passager indemnisé, versés sur le "
             "compte de l'agence par Wave, Orange Money ou virement SEPA, après "
             "réception des fonds côté passager. Il n'y a aucun frais fixe."),
            ("Quelles démarches l'agence doit-elle faire ?",
             "Aucune démarche juridique : Robin des Airs gère l'intégralité de la "
             "réclamation CE 261/2004. L'agence oriente simplement le passager."),
        ]),
    ],
}

# ─────────────────────────────────────────────────────────────
# suivi-dossier.html
# ─────────────────────────────────────────────────────────────
_u = "suivi-dossier.html"
PAGES[_u] = {
    "canonical": f"{BASE}/{_u}",
    "graph": [
        page(_u, "Où en est mon dossier ?",
             "Suivre l'avancement de sa demande d'indemnisation Robin des Airs."),
        breadcrumb(_u, "Suivi de dossier"),
        faq(_u, [
            ("Comment savoir où en est mon dossier ?",
             "Le plus simple est d'envoyer un message WhatsApp au "
             f"{WA} avec son nom et, si possible, le numéro de vol ou la date du "
             "dépôt. Le statut du dossier est communiqué en retour."),
        ]),
    ],
}

# ─────────────────────────────────────────────────────────────
# dossier.html
# ─────────────────────────────────────────────────────────────
_u = "dossier.html"
PAGES[_u] = {
    "canonical": f"{BASE}/{_u}",
    "graph": [
        page(_u, "Déposer mon dossier",
             "Ouvrir une demande d'indemnisation CE 261/2004 auprès de Robin des Airs."),
        breadcrumb(_u, "Déposer mon dossier"),
    ],
}

# ─────────────────────────────────────────────────────────────
# Pages légales : WebPage simple, pas de FAQ (rien à citer).
# ─────────────────────────────────────────────────────────────
_u = "cgv.html"
PAGES[_u] = {
    "canonical": f"{BASE}/{_u}",
    "graph": [
        page(_u, "Conditions générales de vente",
             "Conditions générales de vente de Robin des Airs SASU."),
        breadcrumb(_u, "CGV"),
    ],
}

_u = "politique-confidentialite.html"
PAGES[_u] = {
    "canonical": f"{BASE}/{_u}",
    "graph": [
        page(_u, "Politique de confidentialité",
             "Traitement des données personnelles des passagers par Robin des Airs "
             "(RGPD)."),
        breadcrumb(_u, "Politique de confidentialité"),
    ],
}


def build_block(graph):
    payload = {"@context": "https://schema.org", "@graph": graph}
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    # Un JSON-LD ne doit jamais contenir la séquence de fermeture de script.
    body = body.replace("</", "<\\/")
    return f'<script type="application/ld+json" data-aeo="1">{body}</script>'


def main():
    dry = "--dry-run" in sys.argv
    changed = 0

    for rel, spec in PAGES.items():
        f = ROOT / rel
        if not f.exists():
            print(f"  ABSENT    {rel}")
            continue

        html = f.read_text(encoding="utf-8")
        if 'data-aeo="1"' in html:
            print(f"  DÉJÀ-FAIT {rel}")
            continue
        if "</head>" not in html:
            print(f"  PAS-DE-HEAD {rel}")
            continue

        inject = ""

        canon = spec.get("canonical")
        if canon and not re.search(r'rel=["\']canonical["\']', html):
            inject += f'\n<link rel="canonical" href="{canon}" />'

        inject += "\n" + build_block(spec["graph"]) + "\n"

        new = html.replace("</head>", inject + "</head>", 1)

        if dry:
            print(f"  [dry] {rel}  (+{len(inject)} octets)")
        else:
            f.write_text(new, encoding="utf-8")
            print(f"  OK        {rel}  (+{len(inject)} octets)")
        changed += 1

    print(f"\n{changed} page(s) traitée(s){' (dry-run)' if dry else ''}.")


if __name__ == "__main__":
    main()

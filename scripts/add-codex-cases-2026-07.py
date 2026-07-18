#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ajoute 6 arrêts au codex jurisprudence-ce261.html + corrige le filtre juridiction.

Les 6 fiches ont toutes été vérifiées sur EUR-Lex (source primaire) le 18/07/2026 :
  C-429/14  Air Baltic          responsabilité du transporteur ENVERS L'EMPLOYEUR (Montréal)
  C-516/23  Qatar Airways       art. 3 §3, taxes seules + tarif promo catégoriel
  C-215/18  Králová             action contre le transporteur effectif sans contrat
  C-45/24   VKI c/ KLM          le remboursement art. 8 inclut la commission d'agence
  T-656/24  European Air Charter la décision d'attendre rompt le lien de causalité
  T-134/25  D S.A. c/ P S.A.    décision ATM sur un vol antérieur de la rotation

CORRECTIF FILTRE : `isFR = (c) => c.juridiction !== 'CJUE'` classait comme
jurisprudence FRANÇAISE tout ce qui n'était pas exactement « CJUE ». Depuis le
règlement (UE, Euratom) 2024/2019, les renvois préjudiciels en droits des passagers
sont jugés par le TRIBUNAL de l'UE (affaires en T-). Sans ce correctif, les arrêts
du Tribunal apparaîtraient sous le filtre « France », ce qui est faux.

Idempotent. Usage : python3 scripts/add-codex-cases-2026-07.py [--dry-run]
"""

import json
import re
import sys
from pathlib import Path

F = Path(__file__).resolve().parent.parent / "jurisprudence-ce261.html"

# Thèmes imposés : THEMES est une liste EN DUR dans la page et le rendu fait
# THEMES.filter(t => byTheme[t]). Un thème inédit ferait disparaître la fiche.
NEW = [
    {
        "id": "air-baltic-employeur-c429-14",
        "nom": "Air Baltic Corporation AS c/ Lietuvos Respublikos specialiųjų tyrimų tarnyba",
        "ref": "CJUE (3e ch.), 17 févr. 2016, C-429/14",
        "date": "2016-02-17",
        "juridiction": "CJUE",
        "theme": "Droit à indemnisation",
        "tags": ["convention-montréal", "employeur", "salarié", "voyage-d-affaires",
                 "article-19", "tiers-payeur", "plafond"],
        "question": "La Convention de Montréal permet-elle à l'employeur des passagers, "
                    "qui a conclu le contrat de transport, d'obtenir réparation du "
                    "préjudice que lui cause le retard de ses salariés ?",
        "decision": "Oui. Les articles 19, 22 et 29 de la Convention de Montréal doivent "
                    "être interprétés en ce sens que le transporteur qui a conclu un "
                    "contrat de transport international avec l'employeur de personnes "
                    "transportées en qualité de passagers est responsable ENVERS CET "
                    "EMPLOYEUR du dommage résultant du retard des vols. La réparation est "
                    "toutefois plafonnée : le montant total ne peut excéder la limite de "
                    "l'article 22 §1 multipliée par le nombre de passagers transportés.",
        "portee": "L'employeur qui a payé le transport dispose d'une action PROPRE, fondée "
                  "sur la Convention de Montréal, distincte de l'indemnité forfaitaire "
                  "CE261 qui reste, elle, celle du passager.",
        "robin": "LIGNE DE PARTAGE des dossiers entreprise. Le forfait art. 7 "
                 "(250/400/600 €) appartient au SALARIÉ : c'est lui, et lui seul, qui "
                 "signe la cession. L'entreprise a une action séparée, sur la Convention "
                 "de Montréal, pour SON préjudice (frais de mission, per diem, salaires "
                 "versés en pure perte), sur justificatifs et plafonnée. NE JAMAIS faire "
                 "signer la cession par le DRH ou le dirigeant : l'entreprise ne peut "
                 "céder une créance qu'elle ne détient pas, l'acte serait nul et le "
                 "dossier perdu. Sur un déplacement groupé, viser N cessions "
                 "individuelles = N × 600 €.",
        "source": "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:62014CJ0429",
        "confiance": "vérifié",
    },
    {
        "id": "nw-ys-qatar-airways-c516-23",
        "nom": "NW et YS c/ Qatar Airways",
        "ref": "CJUE (8e ch.), 16 janv. 2025, C-516/23",
        "date": "2025-01-16",
        "juridiction": "CJUE",
        "theme": "Éligibilité",
        "tags": ["article-3-3", "tarif-réduit", "gratuité", "taxes-et-redevances",
                 "campagne-promotionnelle", "billet-entreprise"],
        "question": "Un passager est-il exclu par l'article 3 §3 lorsqu'il n'a acquitté que "
                    "les taxes et redevances aériennes, dans le cadre d'une campagne "
                    "promotionnelle réservée à une catégorie professionnelle ?",
        "decision": "Non, sur les deux branches. D'une part, le passager qui s'acquitte "
                    "exclusivement des taxes et redevances aériennes ne voyage PAS "
                    "gratuitement : ces taxes font partie intégrante du prix du billet. "
                    "D'autre part, un tarif consenti dans une campagne promotionnelle "
                    "limitée dans le temps et en nombre de billets, s'adressant à une "
                    "catégorie professionnelle déterminée, n'est pas un tarif « non "
                    "accessible au public » : une catégorie professionnelle indéterminée "
                    "constitue un public au sens du règlement.",
        "portee": "L'exclusion de l'article 3 §3 est d'interprétation STRICTE. Le critère "
                  "est le caractère OUVERT de la catégorie de bénéficiaires, et non le "
                  "caractère restreint ou négocié de l'offre.",
        "robin": "L'arrêt qui sécurise les DOSSIERS ENTREPRISE et les tarifs négociés. Si "
                 "une compagnie oppose l'article 3 §3 à un salarié voyageant sur billet "
                 "corporate : le siège a bien été payé (donc pas de gratuité au sens de "
                 "Cass. 6 janv. 2021), et un tarif corporate s'adresse à une catégorie "
                 "indéterminée d'entreprises, donc au public. Sert aussi les billets à "
                 "taxes seules et les offres promo diaspora. ATTENTION : les orientations "
                 "interprétatives 2024 de la Commission rangent les billets de PERSONNEL "
                 "de compagnie dans l'exemption. Ne pas prendre un dossier « billet "
                 "staff » sans arbitrage.",
        "source": "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62023CJ0516",
        "confiance": "vérifié",
    },
    {
        "id": "kralova-primera-air-c215-18",
        "nom": "Libuše Králová c/ Primera Air Scandinavia A/S",
        "ref": "CJUE (1re ch.), 26 mars 2020, C-215/18",
        "date": "2020-03-26",
        "juridiction": "CJUE",
        "theme": "Champ d'application & transporteur effectif",
        "tags": ["voyage-à-forfait", "agence-de-voyages", "absence-de-contrat",
                 "transporteur-effectif", "tiers-payeur"],
        "question": "Un passager ayant contracté avec une agence de voyages, et non avec le "
                    "transporteur, peut-il agir en indemnisation contre le transporteur "
                    "aérien effectif ?",
        "decision": "Oui. Un passager dont le vol est retardé de trois heures ou plus peut "
                    "introduire un recours en indemnisation au titre des articles 6 et 7 "
                    "contre le transporteur aérien effectif, MÊME SI ce passager et ce "
                    "transporteur n'ont conclu aucun contrat entre eux. Le transporteur "
                    "qui exécute le vol pour le compte du tiers cocontractant du passager "
                    "est bien le transporteur effectif au sens de l'article 2 b).",
        "portee": "Le droit à indemnisation naît de la qualité de PASSAGER TRANSPORTÉ, et "
                  "non de la qualité de cocontractant ou de payeur du billet.",
        "robin": "Le meilleur appui pour la règle « le droit suit le passager, pas le "
                 "payeur ». Si l'absence TOTALE de contrat n'empêche pas le passager "
                 "d'agir, alors le fait qu'un employeur, un proche ou une agence ait payé "
                 "le billet ne transfère a fortiori aucun droit au payeur. Sert aussi les "
                 "dossiers diaspora « billet payé par un proche resté au pays » et les "
                 "dossiers voyage à forfait.",
        "source": "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62018CJ0215",
        "confiance": "vérifié",
    },
    {
        "id": "vki-klm-commission-intermediaire-c45-24",
        "nom": "Verein für Konsumenteninformation c/ Koninklijke Luchtvaart Maatschappij (KLM)",
        "ref": "CJUE (4e ch.), 15 janv. 2026, C-45/24",
        "date": "2026-01-15",
        "juridiction": "CJUE",
        "theme": "Obligation de prise en charge",
        "tags": ["article-8", "remboursement", "prix-du-billet", "agence-en-ligne",
                 "commission", "intermédiaire"],
        "question": "Le « prix du billet » à rembourser en cas d'annulation inclut-il la "
                    "commission prélevée par un intermédiaire (agence en ligne), alors que "
                    "le transporteur n'en connaît pas le montant exact ?",
        "decision": "Oui. Le prix du billet à prendre en compte au titre de l'article 8 §1 "
                    "a) inclut la différence entre ce que le passager a payé et ce que le "
                    "transporteur a perçu, c'est-à-dire la commission de l'intermédiaire, "
                    "sans qu'il soit nécessaire que le transporteur connaisse le montant "
                    "exact de cette commission. Le transporteur qui autorise un "
                    "intermédiaire à émettre des billets en son nom accepte implicitement "
                    "la pratique de commissionnement.",
        "portee": "Le remboursement porte sur ce que le passager a réellement DÉBOURSÉ, "
                  "et non sur ce que la compagnie a encaissé.",
        "robin": "À dégainer dès qu'un dossier vient d'une agence en ligne (Opodo, "
                 "eDreams, Gotogate, très présentes sur les routes diaspora) et que la "
                 "compagnie ne rembourse que le tarif net. Réclamer le prix payé par le "
                 "client, commission d'agence comprise. Réflexe d'ouverture de dossier : "
                 "demander la facture de l'agence, pas seulement le billet.",
        "source": "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:62024CJ0045",
        "confiance": "vérifié",
    },
    {
        "id": "ni-hz-european-air-charter-t656-24",
        "nom": "NI et HZ c/ European Air Charter AG",
        "ref": "Trib. UE (ch. renvois préjudiciels), 4 mars 2026, T-656/24",
        "date": "2026-03-04",
        "juridiction": "Tribunal UE",
        "theme": "Circonstances extraordinaires",
        "tags": ["rotation", "lien-de-causalité", "décision-du-transporteur",
                 "contrôles-de-sûreté", "vol-précédent"],
        "question": "Un retard d'au moins trois heures résulte-t-il directement d'une "
                    "circonstance extraordinaire lorsque le transporteur a décidé "
                    "d'ATTENDRE des passagers bloqués aux contrôles de sûreté du vol "
                    "précédent ?",
        "decision": "La décision AUTONOME du transporteur d'attendre ces passagers peut "
                    "ROMPRE le lien de causalité direct entre la circonstance "
                    "extraordinaire (défaillance des contrôles de sûreté) et le retard de "
                    "trois heures du vol suivant opéré par le même appareil, lorsque cette "
                    "décision constitue la cause déterminante du retard. Le Tribunal "
                    "ajoute que l'objectif d'éviter un vol à vide ne constitue pas une "
                    "cause d'exonération au titre de l'article 5 §3.",
        "portee": "Une décision commerciale du transporteur intercalée entre l'événement "
                  "extérieur et le retard casse la chaîne causale et fait tomber "
                  "l'exonération.",
        "robin": "Arme offensive récente contre la défense « effet rotation ». Quand une "
                 "compagnie explique le retard par un incident sur un vol antérieur, "
                 "chercher SYSTÉMATIQUEMENT s'il y a eu une DÉCISION du transporteur "
                 "(attendre des passagers, attendre une correspondance, réaffecter "
                 "l'appareil) : si oui, c'est elle la cause déterminante, pas la "
                 "circonstance extraordinaire. Demander le détail horaire de la journée de "
                 "l'appareil et l'heure réelle de la décision.",
        "source": "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:62024TJ0656",
        "confiance": "vérifié",
    },
    {
        "id": "atm-rotation-vol-precedent-t134-25",
        "nom": "D S.A. c/ P S.A. (décision de gestion du trafic aérien)",
        "ref": "Trib. UE (5e ch. élargie), 21 janv. 2026, T-134/25",
        "date": "2026-01-21",
        "juridiction": "Tribunal UE",
        "theme": "Circonstances extraordinaires",
        "tags": ["gestion-du-trafic-aérien", "ATM", "rotation", "vol-précédent",
                 "lien-de-causalité", "maîtrise-effective", "défense-compagnie"],
        "question": "Toute décision de gestion du trafic aérien (ATM) constitue-t-elle une "
                    "circonstance extraordinaire, et peut-elle être invoquée lorsqu'elle a "
                    "frappé un vol antérieur opéré par le même appareil ?",
        "decision": "Une décision de gestion du trafic aérien peut constituer une "
                    "circonstance extraordinaire dès lors qu'il est établi qu'elle "
                    "échappait à la maîtrise effective du transporteur et que celui-ci n'y "
                    "a pas contribué, indépendamment de la durée du retard. Le "
                    "transporteur peut l'invoquer même lorsqu'elle a affecté un vol "
                    "précédent opéré par le même appareil, à condition qu'existe un LIEN "
                    "DE CAUSALITÉ DIRECT avec le retard ou l'annulation du vol litigieux.",
        "portee": "Arrêt FAVORABLE AUX COMPAGNIES : il valide l'invocation d'un incident "
                  "ATM survenu en amont de la rotation, sous la seule réserve du lien "
                  "causal direct.",
        "robin": "À connaître pour ANTICIPER LA DÉFENSE, pas pour plaider. Quand la "
                 "compagnie invoque un créneau ATM sur un vol antérieur, deux angles "
                 "d'attaque subsistent : (1) exiger la preuve que la décision échappait à "
                 "sa maîtrise effective ET qu'elle n'y a pas contribué, (2) attaquer le "
                 "LIEN DE CAUSALITÉ DIRECT, en s'appuyant sur T-656/24 si une décision "
                 "commerciale du transporteur s'est intercalée. Ne pas ouvrir un "
                 "contentieux « rotation + ATM » sans le détail horaire complet de la "
                 "journée de l'appareil.",
        "source": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62025TJ0134",
        "confiance": "vérifié",
    },
]


def main():
    dry = "--dry-run" in sys.argv
    html = F.read_text(encoding="utf-8")

    m = re.search(r"(const CASES = )(\[.*?\])(;)", html, re.S)
    cases = json.loads(m.group(2))
    existing = {c["id"] for c in cases}

    to_add = [c for c in NEW if c["id"] not in existing]
    if not to_add:
        print("Toutes les fiches sont déjà présentes, rien à faire.")
        return

    THEMES = json.loads(re.search(r"const THEMES = (\[.*?\]);", html, re.S).group(1))
    for c in to_add:
        if c["theme"] not in THEMES:
            print(f"  ABANDON : thème inconnu « {c['theme']} » ({c['id']}).")
            return

    cases.extend(to_add)
    cases.sort(key=lambda c: c["date"])
    for i, c in enumerate(cases, 1):
        c["n"] = i

    body = json.dumps(cases, ensure_ascii=False, separators=(",", ":"))
    html = html[: m.start()] + m.group(1) + body + m.group(3) + html[m.end():]

    # --- correctif filtre : le Tribunal de l'UE n'est pas une juridiction française ---
    old_isfr = "const isFR = (c) => c.juridiction !== 'CJUE';"
    new_isfr = ("const EU_JUR = ['CJUE', 'Tribunal UE'];\n"
                "// Depuis le règl. (UE, Euratom) 2024/2019, les renvois préjudiciels en droits\n"
                "// des passagers sont jugés par le TRIBUNAL de l'UE (affaires en T-). Tester\n"
                "// `!== 'CJUE'` classait ces arrêts comme jurisprudence française.\n"
                "const isFR = (c) => !EU_JUR.includes(c.juridiction);")
    if old_isfr in html:
        html = html.replace(old_isfr, new_isfr, 1)
        print("  filtre juridiction corrigé (Tribunal UE ≠ France)")

    old_badge = "    : '<span class=\"b jur-cjue\">CJUE</span>';"
    new_badge = "    : '<span class=\"b jur-cjue\">'+esc(c.juridiction)+'</span>';"
    if old_badge in html:
        html = html.replace(old_badge, new_badge, 1)
        print("  badge juridiction : affiche la vraie juridiction (CJUE ou Tribunal UE)")

    # --- compteurs du header (codés en dur) ---
    total = len(cases)
    fr = sum(1 for c in cases if c["juridiction"] not in ("CJUE", "Tribunal UE"))
    eu = total - fr
    years = f"{min(c['date'][:4] for c in cases)}-{max(c['date'][:4] for c in cases)}"

    html = html.replace("<b>64</b> arrêts", f"<b>{total}</b> arrêts", 1)
    html = html.replace("<b>54</b> CJUE", f"<b>{eu}</b> CJUE", 1)
    html = html.replace("<b>10</b> France", f"<b>{fr}</b> France", 1)
    html = html.replace("<span class=\"stat\">2006-2025</span>",
                        f"<span class=\"stat\">{years}</span>", 1)
    html = html.replace("64 décisions", f"{total} décisions")
    html = html.replace("64 arrêts", f"{total} arrêts")

    if dry:
        print(f"\n[dry-run] {len(to_add)} fiche(s) à ajouter, total {total} "
              f"({eu} UE / {fr} France), {years}.")
        return

    F.write_text(html, encoding="utf-8")
    for c in to_add:
        print(f"  + {c['ref']}")
    print(f"\n{len(to_add)} fiche(s) ajoutée(s). Total {total} ({eu} UE / {fr} France), {years}.")


if __name__ == "__main__":
    main()

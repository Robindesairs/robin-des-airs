#!/usr/bin/env python3
"""Nettoyage conformité : retire la mention « 9/10 gagnés » / « 9 dossiers sur 10 »
(taux de réussite non prouvé = risque de publicité trompeuse) hors mandat et hors
bureau.html (qui affiche une stat CRM réelle interne, conservée).

Remplace par des messages factuels (No Win No Fee / sélection des dossiers).
Idempotent : ne touche pas ce qui n'est pas trouvé.

    python3 scripts/cleanup-9sur10.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FR_HERO = "On n'accepte que les dossiers solides — zéro frais si on ne récupère rien."
EN_HERO = "We only take strong cases — zero fees if we recover nothing."

REPLACEMENTS = {
    "i18n.js": [
        ('hero_stat_note: "9 dossiers sur 10 gagnés — sur les dossiers que nous acceptons.",',
         f'hero_stat_note: "{FR_HERO}",'),
        ('hero_stat_note: "9 out of 10 cases won — on cases we accept.",',
         f'hero_stat_note: "{EN_HERO}",'),
        ('sp_9sur10: "<strong>9 dossiers sur 10</strong> remportés",',
         'sp_9sur10: "<strong>0 €</strong> si on ne récupère rien",'),
        ('sp_9sur10: "<strong>9 out of 10</strong> cases won",',
         'sp_9sur10: "<strong>€0</strong> if we recover nothing",'),
        ("C'est pour ça que notre taux de réussite est de 9 dossiers sur 10 : on ne s'engage que quand on est confiants de gagner.",
         "On ne s'engage que quand on est confiants de gagner."),
        ("That's why our success rate is 9 out of 10: we only take on cases we're confident we can win.",
         "We only take on cases we're confident we can win."),
        ("20 années dans le secteur · 9/10 dossiers remportés · Sinon vous ne payez rien",
         "20 années dans le secteur · Dossiers sélectionnés avec soin · Sinon vous ne payez rien"),
        ("20 years in the sector · 9/10 cases won · Otherwise you pay nothing",
         "20 years in the sector · Carefully selected cases · Otherwise you pay nothing"),
    ],
    "index.html": [
        ("Analyse gratuite avant acceptation. Taux de réussite 9/10. Si on ne prend pas",
         "Analyse gratuite avant acceptation. Si on ne prend pas"),
        ('data-i18n="hero_stat_note">9 dossiers sur 10 gagnés — sur les dossiers que nous acceptons.</p>',
         f'data-i18n="hero_stat_note">{FR_HERO}</p>'),
    ],
    "meteo-dossier-indemnite.html": [
        ("voici comment on démonte l'excuse dans 9 dossiers sur 10.",
         "voici comment on démonte l'excuse météo, preuves officielles à l'appui."),
        ("Voici comment on fait, et pourquoi ça marche dans 9 dossiers sur 10.",
         "Voici comment on fait, preuves officielles à l'appui."),
        ("C'est une des raisons pour lesquelles notre taux de réussite est de 9 dossiers sur 10 : on ne prend que les dossiers sur lesquels on est confiants.",
         "C'est une des raisons pour lesquelles on ne prend que les dossiers sur lesquels on est confiants."),
    ],
    "pourquoi-si-peu-reclament.html": [
        ("et comment Robin obtient 9 dossiers sur 10.",
         "et comment Robin agit pour les passagers."),
        ('<div class="big">9 dossiers sur 10</div>',
         '<div class="big">0 € d\'avance</div>'),
        ("gagnés lorsque nous menons la réclamation — cohérent avec tout le site Robin des Airs",
         "à avancer — et zéro frais si on ne récupère rien"),
        ('D’où un taux affiché <strong>prudent et mémorisable</strong> : neuf sur dix — pas un chiffre « marketing » incompatible avec le reste de nos pages.',
         'On ne prend que les dossiers sur lesquels on est confiants, et on va au bout.'),
    ],
    "apercu-insta.html": [
        ("Aminata, comme 9 dossiers sur 10, a été remboursée.",
         "Aminata a été remboursée."),
    ],
    "pubs-aissa/stories.html": [
        ("9/10 gagnés  ·  Zéro frais si on perd  ·  Paris", "Zéro frais si on perd  ·  Paris"),
        ("9/10 won  ·  No win no fee  ·  Paris", "No win no fee  ·  Paris"),
    ],
    "pubs-aissa/posts.html": [
        ("9/10 gagnés  ·  Zéro frais si on perd  ·  Paris", "Zéro frais si on perd  ·  Paris"),
        ("9/10 won  ·  No win no fee  ·  Paris", "No win no fee  ·  Paris"),
        ("9/10 gagnés · zéro frais si on perd", "Zéro frais si on perd"),
    ],
    "pubs-aissa/retard-dakar.html": [
        ("★</span> 9/10 gagnés</div>", "★</span> Zéro frais si on perd</div>"),
    ],
}

total = 0
for rel, pairs in REPLACEMENTS.items():
    path = ROOT / rel
    if not path.exists():
        print("  introuvable:", rel)
        continue
    txt = path.read_text(encoding="utf-8")
    n = 0
    for old, new in pairs:
        if old in txt:
            txt = txt.replace(old, new)
            n += 1
        else:
            print(f"  ! NON TROUVÉ dans {rel}: {old[:55]}…")
    path.write_text(txt, encoding="utf-8")
    total += n
    print(f"OK {rel} — {n}/{len(pairs)} remplacés")

print(f"\nTotal: {total} remplacements")

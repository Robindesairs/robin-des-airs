#!/usr/bin/env python3
"""Génère l'article blog : billet acheté en agence → information sur l'indemnité CE 261.
Utilise le gabarit partagé _gen_template.render() et écrit dans le bon dossier blog/ local
(la constante BLOG de _gen_template pointe vers un autre chemin → on écrit nous-mêmes).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _gen_template import render  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SLUG = "billet-achete-en-agence-indemnisation-vol-ce261"
DATE = "2026-06-08"
DATE_FR = "8 juin 2026"

BODY = """
<p>Quand un vol Europe ⇄ Afrique est retardé de plus de 3 heures, annulé ou surbooké, le passager peut avoir droit à une indemnité forfaitaire <strong>allant jusqu’à 600 € par passager</strong> au titre du <a href="/blog/guide-ce261-droits-passagers-afrique.html">règlement (CE) n° 261/2004</a>. Encore faut-il le savoir. Et le canal d’achat de votre billet change beaucoup de choses.</p>

<h2>Acheté en agence : où part vraiment l’information ?</h2>
<p>Quand vous réservez <strong>directement</strong> sur le site de la compagnie, ce sont votre email et votre téléphone qui sont enregistrés dans le dossier. Quand vous passez par une <strong>agence de voyage</strong> — en boutique ou en ligne (Opodo, eDreams, Expedia…) — c’est souvent le <strong>contact de l’agence</strong> qui figure dans la réservation.</p>
<p>Résultat : les notifications de la compagnie — annulation, changement d’horaire, réacheminement, et parfois le lien de réclamation — partent vers <strong>l’intermédiaire, pas vers vous</strong>. Beaucoup de voyageurs de la diaspora, qui réservent leur Dakar–Paris ou Abidjan–Bruxelles en agence de quartier ou via un proche, ne reçoivent <strong>jamais</strong> le message. Et ne savent donc jamais qu’une indemnité s’est ouverte.</p>

<h2>Ce que dit la loi (article 14 du CE 261)</h2>
<p>La règle est claire : l’obligation d’informer le passager pèse sur le <strong>transporteur aérien effectif</strong> — la compagnie qui opère le vol — et <strong>non sur l’agence</strong>. Concrètement :</p>
<ul>
<li><strong>Article 14.1</strong> — au comptoir d’enregistrement, un avis visible doit inviter le passager à demander le texte de ses droits en cas de refus d’embarquement, d’annulation ou de retard.</li>
<li><strong>Article 14.2</strong> — en cas d’annulation ou de refus d’embarquement, la compagnie doit remettre à <strong>chaque passager</strong> une notice écrite des règles d’indemnisation et d’assistance.</li>
</ul>
<p>Cette obligation existe <strong>quel que soit le canal d’achat</strong> — mais elle se déclenche surtout <em>à l’aéroport</em>. Les notifications envoyées <em>à l’avance</em> (email, SMS), elles, suivent le contact de la réservation. Et l’agence, de son côté, <strong>n’a aucune obligation légale</strong> de vous expliquer l’indemnité forfaitaire de 250/400/600 € : ce n’est pas son rôle au titre du CE 261.</p>

<h2>L’arrêt qui protège le passager : Krijgsman (CJUE, C-302/16)</h2>
<p>La Cour de justice de l’Union européenne a tranché un point décisif : <strong>c’est à la compagnie de prouver que le passager a bien été informé</strong> de l’annulation, et dans les délais. Si l’information a transité par une agence ou un intermédiaire et que la compagnie <strong>ne peut pas démontrer que vous, personnellement, avez été prévenu</strong> au moins 14 jours avant le départ, l’indemnité reste <strong>due</strong>.</p>
<blockquote>« La compagnie a prévenu l’agence » n’est pas une preuve qu’<strong>elle vous a prévenu, vous</strong>. <a href="/blog/arret-krijgsman-information-annulation-cjue.html">Voir l’analyse de l’arrêt Krijgsman →</a></blockquote>

<h2>Agence, site, famille : qui reçoit quoi ?</h2>
<table>
<thead><tr><th>Vous avez acheté…</th><th>Qui reçoit les notifications du vol</th><th>Qui vous informe des 600 €</th></tr></thead>
<tbody>
<tr><td>Directement sur le site de la compagnie</td><td>Vous (email / SMS)</td><td>La compagnie — mais il faut quand même réclamer</td></tr>
<tr><td>En agence de voyage (boutique)</td><td>L’agence</td><td>Personne, en général</td></tr>
<tr><td>Sur un site de réservation (Opodo, eDreams…)</td><td>Le site</td><td>Personne, en général</td></tr>
<tr><td>Via un proche / la famille</td><td>La personne qui a réservé</td><td>Personne, en général</td></tr>
</tbody>
</table>
<p>Dans les trois derniers cas, vous pouvez parfaitement avoir un droit ouvert <strong>sans le savoir</strong> — l’information est partie ailleurs.</p>

<h2>Bonne nouvelle : le droit ne s’éteint pas tout de suite</h2>
<p>Ne pas avoir été prévenu ne vous fait <strong>pas</strong> perdre votre droit. En France, le délai pour réclamer une indemnité CE 261 est généralement de <strong>5 ans</strong>. Vous pouvez donc agir <strong>des mois, voire des années</strong> après un vol Dakar–Paris, Abidjan–Bruxelles ou Bamako–Paris retardé ou annulé — même si vous venez tout juste de l’apprendre.</p>

<h2>Vous avez acheté en agence ? Voici quoi faire</h2>
<ul>
<li><strong>Retrouvez votre référence de réservation</strong> et, si possible, votre <strong>carte d’embarquement</strong> (une photo suffit).</li>
<li><strong>Ne comptez pas sur l’agence</strong> pour réclamer l’indemnité à votre place : ce n’est pas son métier.</li>
<li><strong>Vérifiez votre éligibilité</strong> — c’est gratuit et ça prend deux minutes.</li>
<li><strong>Ne signez aucun bon d’achat</strong> en « règlement définitif » : il vaut presque toujours moins que les 600 € en espèces. <a href="/blog/bon-achat-compagnie-aerienne-piege.html">Pourquoi le bon d’achat est un piège →</a></li>
<li><strong>Confiez le dossier</strong> : Robin des Airs monte la réclamation, négocie et, si besoin, va au médiateur puis au tribunal. <a href="/blog/comment-reclamer-indemnite-ce261-5-etapes.html">Les 5 étapes d’une réclamation →</a></li>
</ul>
<p>Que le billet ait été payé par vous ou par un proche, c’est le <strong>passager nommé sur le billet</strong> qui détient le droit à l’indemnité. <a href="/blog/ce261-nationalite-residence-qui-peut-reclamer.html">Qui peut réclamer, exactement ?</a></p>
"""

QA = ("La compagnie doit informer le passager de ses droits (art. 14 du CE 261) — mais ses notifications "
      "(annulation, changement d’horaire) partent au <strong>contact de la réservation</strong>. Si vous avez "
      "acheté en agence ou sur un site, l’email part souvent <strong>chez l’intermédiaire, pas chez vous</strong>. "
      "Beaucoup de passagers ignorent ainsi qu’ils ont droit à <strong>jusqu’à 600 €</strong>. Le droit, lui, reste "
      "entier — et l’arrêt Krijgsman impose à la compagnie de <strong>prouver</strong> qu’elle vous a prévenu.")

FAQ = [
    {"q": "J’ai acheté mon billet en agence : qui doit m’informer de mon indemnité ?",
     "a": "Le <strong>transporteur aérien effectif</strong> (la compagnie qui opère le vol), au titre de l’article 14 du règlement CE 261 — pas l’agence. L’agence n’a aucune obligation légale de vous expliquer l’indemnité forfaitaire de 250/400/600 €. En pratique, les notifications de la compagnie partent vers le contact de la réservation (souvent l’agence), si bien que le passager n’est pas toujours informé directement."},
    {"q": "La compagnie a prévenu mon agence, pas moi. Ai-je quand même droit à l’indemnité ?",
     "a": "Oui, très probablement. Selon l’<a href=\"/blog/arret-krijgsman-information-annulation-cjue.html\">arrêt Krijgsman (CJUE, C-302/16)</a>, c’est à la compagnie de <strong>prouver</strong> que vous avez personnellement été informé de l’annulation au moins 14 jours avant le départ. Si elle ne le peut pas — parce que l’information est passée par un intermédiaire — l’indemnité reste due."},
    {"q": "Je viens seulement d’apprendre que j’avais droit à une indemnité. Est-ce trop tard ?",
     "a": "Non. En France, le délai pour réclamer une indemnité CE 261 est généralement de <strong>5 ans</strong>. Vous pouvez donc agir longtemps après le vol, même si vous n’avez jamais reçu de notification."},
    {"q": "J’ai réservé sur un site comme Opodo ou eDreams. Est-ce différent ?",
     "a": "Le principe est le même : c’est la <strong>compagnie qui opère le vol</strong> qui doit l’indemnité, pas le site. Mais les notifications et les remboursements transitent souvent par le site, qui ne vous informe généralement pas de l’indemnité forfaitaire. Le plus simple est de réclamer directement auprès de la compagnie — ou de confier le dossier à Robin des Airs."},
    {"q": "Le billet a été payé par un proche. Puis-je réclamer ?",
     "a": "Oui. C’est le <strong>passager nommé sur le billet</strong> qui détient le droit à l’indemnité, quelle que soit la personne qui a payé. Il suffit de retrouver la référence de réservation et, idéalement, la carte d’embarquement."},
]

RELATED = [
    {"href": "/blog/arret-krijgsman-information-annulation-cjue.html", "label": "Arrêt Krijgsman : la preuve de l’information"},
    {"href": "/blog/bon-achat-compagnie-aerienne-piege.html", "label": "Bon d’achat : le piège à éviter"},
    {"href": "/blog/comment-reclamer-indemnite-ce261-5-etapes.html", "label": "Réclamer son indemnité en 5 étapes"},
    {"href": "/blog/compagnie-refuse-payer-indemnite-que-faire.html", "label": "La compagnie refuse de payer : que faire ?"},
    {"href": "/blog/ce261-nationalite-residence-qui-peut-reclamer.html", "label": "Qui peut réclamer (nationalité, résidence) ?"},
]

art = {
    "slug": SLUG,
    "title": "Billet acheté en agence : qui vous prévient pour votre indemnité (CE 261) ?",
    "h1": "Billet acheté en agence : qui vous prévient pour votre indemnité ?",
    "description": ("Vol Europe–Afrique retardé ou annulé acheté via une agence ou un site ? La compagnie "
                    "informe le canal de réservation — pas toujours vous. Pourquoi vous ignorez vos 600 € et comment réclamer."),
    "datePublished": DATE,
    "dateModified": DATE,
    "quick_answer": QA,
    "body_html": BODY,
    "faq": FAQ,
    "related": RELATED,
}

html = render(art)
# Le gabarit fige la date visible au "26 mai 2026" → on remet la date réelle (les attributs datetime sont déjà corrects).
html = html.replace(">26 mai 2026<", f">{DATE_FR}<")
out = ROOT / "blog" / f"{SLUG}.html"
out.write_text(html, encoding="utf-8")
print(f"✓ écrit : {out.relative_to(ROOT)}  ({len(html):,} octets)")

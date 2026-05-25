#!/usr/bin/env python3
"""Generate 14 raw DE/ES blog HTML files for normalize_blog.py."""
from __future__ import annotations

import json
import os

ROOT = os.path.join(os.path.dirname(__file__), "..")
SITE = "https://robindesairs.eu"
OG = f"{SITE}/og-blog.png"
SIM = f"{SITE}/#funnel-box"
WA = "https://wa.me/33756863630"
EUR = "https://eur-lex.europa.eu/legal-content"


def faq_json(questions: list[tuple[str, str]]) -> str:
    entities = [
        {
            "@type": "Question",
            "name": q,
            "acceptedAnswer": {"@type": "Answer", "text": a},
        }
        for q, a in questions
    ]
    return json.dumps(
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": entities},
        ensure_ascii=False,
    )


CTA = {
    "de": f'      <p>Prüfen Sie Ihren Anspruch kostenlos mit unserem <a href="{SIM}">Simulator auf robindesairs.eu</a> oder kontaktieren Sie uns per <a href="{WA}">WhatsApp</a>.</p>',
    "es": f'      <p>Compruebe gratuitamente su derecho con nuestro <a href="{SIM}">simulador en robindesairs.eu</a> o contáctenos por <a href="{WA}">WhatsApp</a>.</p>',
}


def render(
    *,
    lang: str,
    slug: str,
    title: str,
    description: str,
    h1: str,
    body: str,
    faq: list[tuple[str, str]],
    related_title: str,
    related: list[tuple[str, str]],
) -> str:
    url = f"{SITE}/{lang}/blog/{slug}"
    og_title = title.replace('"', "&quot;")
    related_html = "\n".join(
        f'        <li><a href="{href}">{label}</a></li>' for href, label in related
    )
    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="{url}">
  <meta property="og:title" content="{og_title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{url}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="{OG}">
  <script type="application/ld+json">{faq_json(faq)}</script>
</head>
<body>
  <main>
    <h1>{h1}</h1>
    <div id="blog-body">
{body}
{CTA[lang]}
      <h2>{related_title}</h2>
      <ul>
{related_html}
      </ul>
    </div>
  </main>
</body>
</html>
"""


ARTICLES: list[tuple[str, str, str]] = []  # filled below

DE_FILES = [
    {
        "slug": "verordnung-eg-261-zusammenfassung.html",
        "title": "Verordnung (EG) Nr. 261/2004 erklärt: Leitfaden zu EU-Fluggastrechten",
        "description": "EG 261/2004 verständlich: Anwendungsbereich, Entschädigung (250–600 €), Annullierung, Verspätung, Nichtbeförderung, Betreuung, Ausnahmen. Pädagogische Zusammenfassung nach EUR-Lex.",
        "h1": "Verordnung (EG) 261/2004: vollständiger Leitfaden zu EU-Fluggastrechten",
        "faq": [
            (
                "Was regelt die Verordnung (EG) Nr. 261/2004?",
                "Sie legt gemeinsame Regeln für Entschädigung und Betreuung bei Nichtbeförderung, Annullierung oder langer Verspätung fest. Rechtsgrundlage: Verordnung (EG) Nr. 261/2004 vom 11. Februar 2004 (EUR-Lex 32004R0261).",
            ),
            (
                "Wer ist von EG 261 geschützt?",
                "Passagiere mit Abflug von einem EU/EWR/Schweizer Flughafen (jede Airline) sowie Passagiere mit Ankunft in der EU auf einer EU-lizenzierten Fluggesellschaft.",
            ),
            (
                "Welche Entschädigungsbeträge gelten?",
                "Artikel 7: 250 € bis 1.500 km, 400 € zwischen 1.500 und 3.500 km (oder jede EU-interne Strecke über 1.500 km), 600 € über 3.500 km außerhalb der EU — pro Passagier.",
            ),
        ],
        "related": [
            ("/de/blog/flugentschaedigung-betraege-250-400-600.html", "Entschädigungsbeträge 250 €, 400 €, 600 €"),
            ("/de/blog/eg-261-rechtsprechung-ghurteile.html", "EG-261-Rechtsprechung des EuGH"),
            ("/de/blog/fluggesellschaft-lehnt-ab-was-tun.html", "Airline lehnt ab — was tun?"),
        ],
        "body": f"""      <p>Die <strong>Verordnung (EG) Nr. 261/2004</strong> vom 11. Februar 2004 (abrufbar auf <a href="{EUR}/DE/TXT/?uri=CELEX:32004R0261" target="_blank" rel="noopener">EUR-Lex</a>) ist das zentrale Instrument des europäischen Fluggastschutzes. In 19 Artikeln regelt sie pauschale Entschädigung, Rückerstattung, Umbuchung und Betreuung bei Störungen. Dieser Leitfaden fasst den Text und die wichtigste Rechtsprechung des Europäischen Gerichtshofs (EuGH) didaktisch zusammen — ohne individuelle Rechtsberatung.</p>

      <h2>1. Anwendungsbereich (Artikel 3)</h2>
      <p>EG 261 gilt, wenn Sie</p>
      <ul>
        <li><strong>von einem EU-, EWR- oder Schweizer Flughafen abfliegen</strong> — unabhängig von der Airline (z. B. Royal Air Maroc Paris–Casablanca), oder</li>
        <li><strong>in der EU ankommen</strong> auf einer EU-lizenzierten Fluggesellschaft (z. B. Lufthansa New York–Frankfurt).</li>
      </ul>
      <p>EU-Lizenzen haben u. a. Lufthansa, Air France, KLM, Iberia, Ryanair, Vueling, SWISS (Vertrag mit der EU), Austrian, Brussels Airlines.</p>

      <h2>2. Drei Auslöser für Entschädigung</h2>
      <h3>Annullierung (Artikel 5)</h3>
      <p>Entschädigung, wenn die Airline weniger als 14 Tage vor Abflug informiert — es sei denn, sie beweist außergewöhnliche Umstände.</p>
      <h3>Nichtbeförderung (Artikel 4)</h3>
      <p>Bei bestätigter Buchung und rechtzeitigem Check-in, aber Verweigerung der Beförderung (häufig Überbuchung). EuGH Rodríguez Cachafeiro (C-321/11).</p>
      <h3>Lange Verspätung (Artikel 6 + EuGH Sturgeon)</h3>
      <p>Der EuGH (Sturgeon, 19.11.2009, C-402/07) stellte klar: <strong>Verspätung von 3 Stunden oder mehr am Endziel</strong> löst dieselbe Entschädigung wie eine Annullierung aus (bestätigt durch Nelson v Lufthansa, 2012).</p>

      <h2>3. Entschädigungsbeträge (Artikel 7)</h2>
      <table>
        <tr><th>Strecke</th><th>Betrag pro Passagier</th></tr>
        <tr><td>bis 1.500 km</td><td>250 €</td></tr>
        <tr><td>1.500–3.500 km oder EU-intern &gt; 1.500 km</td><td>400 €</td></tr>
        <tr><td>&gt; 3.500 km außerhalb EU</td><td>600 €</td></tr>
      </table>
      <p>Pro Passagier, nicht pro Buchung. Kinder mit eigenem Sitzplatz eingeschlossen. Auszahlung in Geld (Artikel 7 Abs. 3), Gutscheine nur mit ausdrücklicher Zustimmung.</p>

      <h2>4. Betreuung (Artikel 9)</h2>
      <p>Unabhängig von außergewöhnlichen Umständen: Verpflegung, Hotel bei Übernachtung, Transfer, Kommunikation. EuGH McDonagh (C-12/11): keine zeitliche Obergrenze.</p>

      <h2>5. Rückerstattung oder Umbuchung (Artikel 8)</h2>
      <p>Bei Annullierung oder Nichtbeförderung wählen Sie: volle Rückerstattung innerhalb von 7 Tagen, frühestmögliche Umbuchung oder Umbuchung zu einem späteren Termin. Entschädigung und Rückerstattung sind kumulativ.</p>

      <h2>6. Außergewöhnliche Umstände (Artikel 5 Abs. 3)</h2>
      <p>Keine Entschädigung, wenn die Airline beweist, dass die Störung auf außergewöhnliche Umstände zurückzuführen ist, die trotz aller zumutbaren Maßnahmen nicht vermieden werden konnten. Der EuGH hat die Ausnahme eng ausgelegt: technische Defekte (Wallentin-Hermann, C-549/07), interne Streiks (Krüsemann, C-195/17) sind in der Regel <strong>keine</strong> außergewöhnlichen Umstände.</p>

      <h2>7. Verjährung</h2>
      <p>EG 261 setzt keine Frist. Cuadrench Moré (C-487/12): nationales Recht gilt. In Deutschland: <strong>3 Jahre</strong> (Jahresende), in Frankreich 5 Jahre, in Spanien oft 2 Jahre (allgemeine zivilrechtliche Regeln können länger sein).</p>

      <h2>8. Vorgehen bei der Geltendmachung</h2>
      <ol>
        <li>Belege sichern (Bordkarte, Buchung, Ankunftszeit).</li>
        <li>Schriftliche Forderung an die durchführende Airline mit Verweis auf Artikel 7 und relevante EuGH-Urteile.</li>
        <li>Bei Ablehnung: Beschwerde beim Luftfahrt-Bundesamt (Deutschland) oder Klage / Spezialdienst.</li>
      </ol>
      <p>Merksätze: Schwellenwert 3 h am <strong>Endziel</strong>; Beweislast bei der Airline; technische Störung ist selten ein wirksamer Einwand.</p>""",
    },
    {
        "slug": "flugentschaedigung-betraege-250-400-600.html",
        "title": "Flugentschädigung: 250 €, 400 € oder 600 € erklärt (EG 261)",
        "description": "Entschädigungsbeträge nach Artikel 7 EG 261/2004: Entfernungsstufen, 50-%-Minderung, Beispiele, Folkerts-Regel bei Anschlussflügen. Pädagogische Zusammenfassung.",
        "h1": "Flugentschädigung: die Beträge 250 €, 400 € und 600 €",
        "faq": [
            (
                "Wie hoch ist die Entschädigung nach EG 261?",
                "250 € bis 1.500 km, 400 € für 1.500–3.500 km oder EU-intern über 1.500 km, 600 € über 3.500 km außerhalb der EU — jeweils pro Passagier in Geld.",
            ),
            (
                "Kann die Airline 50 % abziehen?",
                "Nur bei Annullierung mit Umbuchung, wenn die Ersatzankunft innerhalb von 2–4 Stunden (je nach Strecke) erfolgt (Artikel 7 Abs. 2). Nicht bei Sturgeon-Verspätungen.",
            ),
            (
                "Wie wird die Entfernung berechnet?",
                "Großkreisdistanz vom ursprünglichen Abflugort zum Endziel; bei Einzelbuchung mit Anschluss end-to-end (EuGH Folkerts, C-11/11).",
            ),
        ],
        "related": [
            ("/de/blog/verordnung-eg-261-zusammenfassung.html", "EG-261-Verordnung — Zusammenfassung"),
            ("/de/blog/flug-annulliert-entschaedigung-600.html", "Annullierter Flug — bis 600 €"),
            ("/de/blog/aussergewoehnliche-umstaende-eg-261.html", "Außergewöhnliche Umstände"),
        ],
        "body": """      <p>Artikel 7 der Verordnung (EG) Nr. 261/2004 sieht drei Entschädigungsstufen vor. Die Beträge sind seit 2004 unverändert und gelten bei Verspätung ab 3 Stunden (Sturgeon), Annullierung und Nichtbeförderung gleichermaßen.</p>

      <h2>Die drei Stufen</h2>
      <table>
        <tr><th>Entfernung</th><th>Entschädigung</th><th>Beispiele</th></tr>
        <tr><td>bis 1.500 km</td><td>250 €</td><td>Frankfurt–Madrid, Berlin–Rom, München–Marrakesch</td></tr>
        <tr><td>1.500–3.500 km oder EU-intern &gt; 1.500 km</td><td>400 €</td><td>Frankfurt–Athen, Madrid–Helsinki, Paris–Casablanca</td></tr>
        <tr><td>&gt; 3.500 km außerhalb EU</td><td>600 €</td><td>Frankfurt–Lagos, München–Johannesburg, Brüssel–Nairobi</td></tr>
      </table>

      <h2>Entfernungsberechnung</h2>
      <p>Maßgeblich ist die <strong>Großkreisdistanz</strong> (kürzeste Entfernung auf der Erdkugel), nicht die tatsächlich geflogene Route. Bei Anschlussflügen auf <strong>einer Buchung</strong> zählt die Strecke vom Erstabflugort zum Endziel (Folkerts, C-11/11): Bremen–Paris–São Paulo = Entfernung Bremen–São Paulo → 600 €.</p>
      <p>Besonderheit: Jede EU-interne Strecke über 1.500 km führt pauschal zu 400 € — auch wenn die reale Distanz 3.500 km beträgt (Lissabon–Helsinki).</p>

      <h2>Rechenbeispiele</h2>
      <ul>
        <li>Lufthansa Frankfurt–Madrid, 4 h Verspätung: <strong>2 × 250 €</strong> für ein Paar.</li>
        <li>Brussels Airlines Brüssel–Lagos, Annullierung: <strong>600 €</strong> pro Passagier.</li>
        <li>Familie (4 Personen mit Sitzplatz), Frankfurt–Nairobi, 5 h Verspätung: <strong>4 × 600 € = 2.400 €</strong>.</li>
      </ul>
      <p>Säuglinge ohne eigenen Sitzplatz sind ausgeschlossen.</p>

      <h2>50-%-Minderung (nur Annullierung + Umbuchung)</h2>
      <p>Artikel 7 Abs. 2 erlaubt Halbierung, wenn die Umbuchung innerhalb von 2 h (≤1.500 km), 3 h (1.500–3.500 km) oder 4 h (&gt;3.500 km) am Ziel ankommt. <strong>Nicht</strong> bei Verspätungsentschädigung nach Sturgeon.</p>

      <h2>Auszahlung in Geld</h2>
      <p>Artikel 7 Abs. 3: Barzahlung, Überweisung oder Scheck. Gutscheine nur mit schriftlicher Zustimmung. Entschädigung steht <strong>zusätzlich</strong> zur Rückerstattung nach Artikel 8.</p>

      <h2>Typische Airline-Taktiken</h2>
      <table>
        <tr><th>Taktik</th><th>Gegenargument</th></tr>
        <tr><td>Gutschein statt 600 €</td><td>Artikel 7 Abs. 3 — Geld verlangen</td></tr>
        <tr><td>50 % bei Verspätung</td><td>Artikel 7 Abs. 2 gilt nur bei Annullierung</td></tr>
        <tr><td>Strecke nur pro Teilstrecke</td><td>Folkerts: End-zu-End</td></tr>
        <tr><td>„Technisches Problem“</td><td>Wallentin-Hermann (C-549/07)</td></tr>
      </table>""",
    },
    {
        "slug": "flug-annulliert-entschaedigung-600.html",
        "title": "Flug annulliert: Entschädigung bis 600 € nach EG 261",
        "description": "Annullierter Flug und EG 261: Voraussetzungen, 14-Tage-Frist, 600 € Langstrecke, außergewöhnliche Umstände, Rückerstattung plus Entschädigung.",
        "h1": "Flug annulliert: bis zu 600 € Entschädigung pro Passagier",
        "faq": [
            (
                "Wann steht bei Annullierung Entschädigung zu?",
                "Wenn die Airline weniger als 14 Tage vor Abflug informiert, keine außergewöhnlichen Umstände nachweist und keine zufriedenstellende Umbuchung anbietet.",
            ),
            (
                "Wie viel bei Langstrecke?",
                "600 € pro Passagier für Strecken über 3.500 km außerhalb der EU (Artikel 7).",
            ),
            (
                "Rückerstattung und Entschädigung zusammen?",
                "Ja — Artikel 8 (Rückerstattung/Umbuchung) und Artikel 7 (Entschädigung) sind getrennte Rechte.",
            ),
        ],
        "related": [
            ("/de/blog/flugentschaedigung-betraege-250-400-600.html", "Entschädigungsbeträge 250–600 €"),
            ("/de/blog/aussergewoehnliche-umstaende-eg-261.html", "Außergewöhnliche Umstände"),
            ("/de/blog/fluggesellschaft-lehnt-ab-was-tun.html", "Airline lehnt ab — was tun?"),
        ],
        "body": """      <p>Eine Flugannullierung ist belastend — die Verordnung (EG) Nr. 261/2004 sichert Ihnen jedoch finanzielle Entschädigung <strong>zusätzlich</strong> zur Rückerstattung oder Umbuchung.</p>

      <h2>Wer ist geschützt?</h2>
      <ul>
        <li>Abflug von einem <strong>EU-Flughafen</strong> (jede Airline), oder</li>
        <li>Ankunft in der EU auf einer <strong>EU-Airline</strong>.</li>
      </ul>
      <p>Gilt für alle Passagiere und Buchungsklassen, auch Charter.</p>

      <h2>Drei Voraussetzungen</h2>
      <ol>
        <li>Information <strong>weniger als 14 Tage</strong> vor Abflug (Beweislast: Airline — Krijgsman, C-302/16).</li>
        <li>Keine bewiesenen <strong>außergewöhnlichen Umstände</strong>.</li>
        <li>Keine zufriedenstellende Alternative (Ankunft nicht deutlich früher als geplant).</li>
      </ol>

      <h2>Beträge</h2>
      <table>
        <tr><th>Entfernung</th><th>Entschädigung</th></tr>
        <tr><td>≤ 1.500 km</td><td>250 €</td></tr>
        <tr><td>1.500–3.500 km</td><td>400 €</td></tr>
        <tr><td>&gt; 3.500 km außerhalb EU</td><td><strong>600 €</strong></td></tr>
      </table>
      <p>Frankfurt–Lagos annulliert, Familie zu viert: <strong>2.400 €</strong> Entschädigung — unabhängig vom Ticketpreis.</p>

      <h2>Was ist keine außergewöhnliche Umstände?</h2>
      <ul>
        <li>Technische Defekte (Wallentin-Hermann, C-549/07)</li>
        <li>Interne Streiks (Krüsemann, C-195/17)</li>
        <li>Überbuchung, Crew-Mangel, Rotationsverspätung</li>
      </ul>

      <h2>Umbuchung am nächsten Tag</h2>
      <p>Abends annulliert, morgens Ersatzflug — Ankunft 12 h später als geplant → bei Langstrecke oft <strong>600 €</strong>, wenn keine außergewöhnlichen Umstände vorliegen.</p>
      <blockquote><strong>Wichtig:</strong> Rückerstattung und Entschädigung sind getrennt. Ein Gutschein „statt Entschädigung“ ist unzulässig, wenn Sie Geld verlangen.</blockquote>

      <h2>Fünf Schritte</h2>
      <ol>
        <li>Belege: Buchung, Annullierungsmail, Ankunftszeit.</li>
        <li>Entfernung berechnen (Großkreis).</li>
        <li>Schriftliche Forderung mit IBAN und Verweis auf EG 261.</li>
        <li>Bei Ablehnung: Luftfahrt-Bundesamt oder Klage.</li>
        <li>Frist beachten: in Deutschland 3 Jahre ab Jahresende.</li>
      </ol>""",
    },
    {
        "slug": "aussergewoehnliche-umstaende-eg-261.html",
        "title": "Außergewöhnliche Umstände nach EG 261: wann die Airline zahlen muss",
        "description": "Artikel 5 Abs. 3 EG 261 und EuGH-Rechtsprechung: technische Defekte, Wetter, Streiks. 80 % der Einwände sind anfechtbar. Pädagogischer Leitfaden.",
        "h1": "Außergewöhnliche Umstände nach EG 261: der häufigste Ablehnungsgrund",
        "faq": [
            (
                "Ist ein technisches Problem außergewöhnlich?",
                "In der Regel nein. EuGH Wallentin-Hermann (C-549/07): Defekte aus normaler oder außergewöhnlicher Wartung sind betriebsüblich.",
            ),
            (
                "Ist Wetter immer außergewöhnlich?",
                "Nur wenn unvorhersehbar. Winterwetter oder Harmattan sind oft vorhersehbar — die Airline muss planen.",
            ),
            (
                "Pilotenstreik der Airline?",
                "Nein — EuGH Krüsemann (C-195/17): interner Streik ist kein außergewöhnlicher Umstand.",
            ),
        ],
        "related": [
            ("/de/blog/verordnung-eg-261-zusammenfassung.html", "EG-261-Zusammenfassung"),
            ("/de/blog/eg-261-rechtsprechung-ghurteile.html", "EuGH-Urteile zu EG 261"),
            ("/de/blog/fluggesellschaft-lehnt-ab-was-tun.html", "Airline lehnt ab — was tun?"),
        ],
        "body": f"""      <p>„Außergewöhnliche Umstände“ ist der häufigste Ablehnungsgrund — doch <strong>rund 80 %</strong> dieser Einwände lassen sich mit EuGH-Rechtsprechung widerlegen. Artikel 5 Abs. 3 der Verordnung (EG) Nr. 261/2004 (EUR-Lex 32004R0261) verlangt zwei kumulative Voraussetzungen: <strong>Externalität</strong> (Ereignis außerhalb der Kontrolle) und <strong>Unvermeidbarkeit</strong> trotz aller zumutbaren Maßnahmen.</p>

      <h2>Übersicht: ja oder nein?</h2>
      <table>
        <tr><th>Situation</th><th>Außergewöhnlich?</th></tr>
        <tr><td>Plötzliches Unwetter (unvorhersehbar)</td><td>Oft ja</td></tr>
        <tr><td>Planbarer Winter in Frankfurt</td><td>Nein — vorhersehbar</td></tr>
        <tr><td>Flugsicherungsstreik</td><td>Ja (extern)</td></tr>
        <tr><td>Streik der eigenen Piloten</td><td>Nein (Krüsemann)</td></tr>
        <tr><td>Technischer Defekt</td><td>Nein (Wallentin-Hermann)</td></tr>
        <tr><td>Vogelschlag</td><td>Ja, aber Mitigationspflicht (Pešková, C-315/15)</td></tr>
        <tr><td>Rotationsverspätung</td><td>Nein — betriebsintern</td></tr>
        <tr><td>Vulkanasche, politische Schließung Luftraums</td><td>Ja (McDonagh, C-12/11)</td></tr>
      </table>

      <h2>Technische Defekte — der Klassiker</h2>
      <p>„Technisches Problem“ allein genügt nicht. Der EuGH stellte klar, dass Wartung und Betrieb zur Verantwortung der Airline gehören. Ausnahme: sehr seltene, am selben Tag gemeldete versteckte Herstellungsfehler (van der Lans, C-257/14) — mit Nachweispflicht.</p>

      <h2>Wetter: Vorhersehbarkeit entscheidet</h2>
      <p>Plötzliche tropische Stürme können außergewöhnlich sein. Saisonale Phänomene (Harmattan, Eis auf der Startbahn im November) sind es oft nicht, wenn keine Vorsorge getroffen wurde.</p>

      <h2>Streiks unterscheiden</h2>
      <ul>
        <li>Flugsicherung / externe Dienstleister → oft außergewöhnlich</li>
        <li>Eigene Crew, Mechaniker, Piloten → <strong>nicht</strong> außergewöhnlich (Krüsemann, Airhelp/TAP C-28/20)</li>
      </ul>

      <h2>Beweislast und Vorgehen</h2>
      <p>Die Airline muss Art und Nachweis liefern (Technikbericht, NOTAM, ATC-Bescheid) und zeigen, dass Ersatzmaßnahmen (Ersatzflugzeug, Umbuchung) gescheitert sind. Fordern Sie diese Unterlagen <strong>schriftlich</strong>. Ohne Belege entscheiden Gerichte meist zugunsten der Passagiere.</p>
      <p>Weiterlesen: <a href="/de/blog/fluggesellschaft-lehnt-ab-was-tun.html">Airline lehnt ab — was tun?</a></p>""",
    },
    {
        "slug": "lufthansa-verspaeteter-flug-entschaedigung.html",
        "title": "Lufthansa Verspätung: Entschädigung nach EG 261",
        "description": "Verspäteter Lufthansa-Flug: 250–600 € nach EG 261, Lufthansa Group, Streiks, Verjährung 3 Jahre in Deutschland, Beschwerdeweg.",
        "h1": "Lufthansa verspäteter Flug: Ihre Entschädigung nach EG 261",
        "faq": [
            (
                "Gilt EG 261 für Lufthansa?",
                "Ja — deutsche EU-Airline, gilt bei Abflug aus der EU und bei Ankunft in der EU auf Lufthansa.",
            ),
            (
                "Lufthansa-Streik — Entschädigung?",
                "Ja, interne Streiks sind keine außergewöhnlichen Umstände (Krüsemann, C-195/17).",
            ),
            (
                "Verjährung in Deutschland?",
                "3 Jahre ab Jahresende des Flugjahres (z. B. Flug März 2023 → Frist 31.12.2026).",
            ),
        ],
        "related": [
            ("/de/blog/flugentschaedigung-betraege-250-400-600.html", "Entschädigungsbeträge"),
            ("/de/blog/aussergewoehnliche-umstaende-eg-261.html", "Außergewöhnliche Umstände"),
            ("/de/blog/fluggesellschaft-lehnt-ab-was-tun.html", "Airline lehnt ab"),
        ],
        "body": """      <p>Lufthansa ist Deutschlands Flagcarrier und Kern der Lufthansa Group (SWISS, Austrian, Brussels Airlines, Eurowings). Als <strong>EU-lizenzierte</strong> Fluggesellschaft unterliegt sie vollständig der Verordnung (EG) Nr. 261/2004.</p>

      <h2>Wer ist verantwortlich?</h2>
      <p>Entschädigung schuldet die <strong>durchführende</strong> Fluggesellschaft — prüfen Sie die Bordkarte:</p>
      <ul>
        <li>LH — Lufthansa (Frankfurt, München)</li>
        <li>LX — SWISS (Schweiz, EG-261-Äquivalent)</li>
        <li>OS — Austrian (Wien)</li>
        <li>SN — Brussels Airlines (Afrika-Netz)</li>
        <li>EW — Eurowings</li>
      </ul>

      <h2>Entschädigungsbeträge</h2>
      <table>
        <tr><th>Route</th><th>Entschädigung</th></tr>
        <tr><td>Frankfurt–Paris/Madrid</td><td>250 €</td></tr>
        <tr><td>Frankfurt–Athen/Kairo</td><td>400 €</td></tr>
        <tr><td>Frankfurt–Lagos/Johannesburg/Nairobi</td><td>600 €</td></tr>
      </table>
      <p>Voraussetzung: Verspätung ≥ 3 h am Endziel (Sturgeon) oder Annullierung/Nichtbeförderung ohne außergewöhnliche Umstände.</p>

      <h2>Typische Lufthansa-Einwände</h2>
      <ul>
        <li><strong>Technisches Problem</strong> — Wallentin-Hermann: meist kein Erfolg für die Airline</li>
        <li><strong>Slot / ATC</strong> — nur bei echtem Streik oder Schließung, nicht bei Stau</li>
        <li><strong>Vorheriger Flug verspätet</strong> — internes Planungsrisiko</li>
      </ul>

      <h2>Brussels Airlines (Afrika)</h2>
      <p>Brüssel–Dakar, Kinshasa, Lagos u. a. über 3.500 km → <strong>600 €</strong> pro Passagier bei qualifizierender Störung.</p>

      <h2>Anspruch geltend machen</h2>
      <ol>
        <li>Online-Formular lufthansa.com oder schriftlich</li>
        <li>PNR, Bordkarte, IBAN beifügen</li>
        <li>30 Tage warten — Teilangebote ablehnen, wenn voller Betrag fällig ist</li>
        <li>Bei Ablehnung: Luftfahrt-Bundesamt (BAF) oder Spezialdienst</li>
      </ol>

      <h2>Verjährung</h2>
      <p>In Deutschland endet die Frist am <strong>31. Dezember</strong> des dritten Jahres nach dem Flugjahr. Nicht verpassen — danach ist der Anspruch verjährt.</p>""",
    },
    {
        "slug": "eg-261-rechtsprechung-ghurteile.html",
        "title": "EG 261 Rechtsprechung: EuGH-Urteile im Überblick",
        "description": "Sturgeon, Wallentin-Hermann, Krüsemann, Folkerts, Nelson — pädagogische Übersicht der wichtigsten EuGH-Urteile zur Verordnung (EG) 261/2004 mit EUR-Lex-Links.",
        "h1": "EG 261 und EuGH-Rechtsprechung: die wichtigsten Urteile",
        "faq": [
            (
                "Was besagt das Sturgeon-Urteil?",
                "Verspätung von 3 Stunden oder mehr am Endziel löst dieselbe Entschädigung aus wie eine Annullierung (EuGH, 19.11.2009, C-402/07).",
            ),
            (
                "Sind technische Defekte außergewöhnlich?",
                "Nein — Wallentin-Hermann (C-549/07): betriebsübliche Risiken.",
            ),
            (
                "Anschlussflug — wo wird die 3-Stunden-Frist gemessen?",
                "Am Endziel der Einzelbuchung (Folkerts, C-11/11).",
            ),
        ],
        "related": [
            ("/de/blog/verordnung-eg-261-zusammenfassung.html", "EG-261-Zusammenfassung"),
            ("/de/blog/aussergewoehnliche-umstaende-eg-261.html", "Außergewöhnliche Umstände"),
            ("/en/blog/ec-261-case-law-cjeu-rulings.html", "Full CJEU case law (English)"),
        ],
        "body": f"""      <p>Die Verordnung (EG) Nr. 261/2004 ist kurz — ihre Auslegung prägt der <strong>Europäische Gerichtshof (EuGH)</strong>. Diese Seite bietet eine didaktische Übersicht zentraler Urteile mit Verweis auf EUR-Lex. Ausführliche Analysen finden Sie auch auf unserer <a href="/en/blog/ec-261-case-law-cjeu-rulings.html">englischen Fallrecht-Hub-Seite</a> und der <a href="/blog/jurisprudence-ce261-arrets-cjue.html">französischen Jurisprudenz-Übersicht</a>.</p>

      <h2>Gültigkeit und Anwendungsbereich</h2>
      <p><strong>IATA/ELFAA (C-344/04, 2006):</strong> EG 261 ist mit der Montreal-Konvention vereinbar. Text: <a href="{EUR}/DE/TXT/?uri=CELEX:62004CJ0344" target="_blank" rel="noopener">EUR-Lex</a>.</p>
      <p><strong>Wegener (C-537/17, 2018):</strong> Einzelbuchung mit EU-Abflug und Anschluss außerhalb der EU bleibt unter EG 261 — wichtig für Paris–Casablanca–Lagos-Routen.</p>

      <h2>Verspätung und Entschädigung</h2>
      <p><strong>Sturgeon (C-402/07, 2009):</strong> 3-Stunden-Schwelle am Endziel → Entschädigung nach Artikel 7. <a href="{EUR}/DE/TXT/?uri=CELEX:62007CJ0402" target="_blank" rel="noopener">EUR-Lex</a></p>
      <p><strong>Nelson v Lufthansa (C-581/10, 2012):</strong> Bestätigung von Sturgeon; pauschale Entschädigung kumulierbar mit Montreal-Schäden.</p>
      <p><strong>Folkerts (C-11/11, 2013):</strong> Bei Anschlussflügen zählt die Verspätung am <strong>Endziel</strong>, Entfernung von Start bis Ziel.</p>

      <h2>Annullierung</h2>
      <p><strong>Krijgsman (C-302/16, 2017):</strong> 14-Tage-Information muss die Airline nachweisen — nicht das Reisebüro allein.</p>

      <h2>Außergewöhnliche Umstände</h2>
      <p><strong>Wallentin-Hermann (C-549/07, 2008):</strong> Technische Defekte in der Regel nicht außergewöhnlich.</p>
      <p><strong>Krüsemann (C-195/17, 2018):</strong> Interner Streik nicht außergewöhnlich.</p>
      <p><strong>Pešková (C-315/15, 2017):</strong> Vogelschlag kann außergewöhnlich sein — Airline muss Ersatzmaßnahmen beweisen.</p>
      <p><strong>McDonagh (C-12/11, 2013):</strong> Vulkanasche — außergewöhnlich; Betreuungspflichten ohne zeitliche Grenze.</p>

      <h2>Nichtbeförderung</h2>
      <p><strong>Rodríguez Cachafeiro (C-321/11, 2012):</strong> Überbuchung und operative Gründe lösen Entschädigung aus.</p>

      <h2>Praktische Nutzung</h2>
      <p>Zitieren Sie in Ihrer Forderung das passende Urteil (Aktenzeichen + Datum). Gerichte und Schlichtungsstellen erwarten präzise Rechtsgrundlagen. Für vertiefte Einzelanalysen: <a href="/en/blog/ec-261-case-law-cjeu-rulings.html">English hub</a> · <a href="/blog/jurisprudence-ce261-arrets-cjue.html">Hub français</a>.</p>""",
    },
    {
        "slug": "fluggesellschaft-lehnt-ab-was-tun.html",
        "title": "Fluggesellschaft lehnt Entschädigung ab: 7 Schritte nach EG 261",
        "description": "Airline lehnt EG-261-Anspruch ab? Formelle Mahnung, BAF, ODR, Europäisches Mahnverfahren, Klage — didaktischer Leitfaden mit EuGH-Argumenten.",
        "h1": "Fluggesellschaft lehnt ab: was Sie jetzt tun können",
        "faq": [
            (
                "Was tun bei Ablehnung wegen technischem Problem?",
                "Wallentin-Hermann (C-549/07) zitieren und schriftliche Forderung mit 30-Tage-Frist senden.",
            ),
            (
                "Welche Behörde in Deutschland?",
                "Luftfahrt-Bundesamt (BAF) als nationale Durchsetzungsbehörde.",
            ),
            (
                "Lohnt sich Klage?",
                "Bei klaren EG-261-Fällen oft hohe Erfolgsquote im Mahn- oder Klageverfahren.",
            ),
        ],
        "related": [
            ("/de/blog/aussergewoehnliche-umstaende-eg-261.html", "Außergewöhnliche Umstände"),
            ("/de/blog/eg-261-rechtsprechung-ghurteile.html", "EuGH-Rechtsprechung"),
            ("/de/blog/verordnung-eg-261-zusammenfassung.html", "EG-261-Zusammenfassung"),
        ],
        "body": """      <p>Sie haben einen begründeten Anspruch nach der Verordnung (EG) Nr. 261/2004 geltend gemacht — und die Airline lehnt ab, bietet einen Gutschein oder schweigt. Das ist häufig. Etwa <strong>80 %</strong> dieser Ablehnungen sind mit EuGH-Argumenten anfechtbar.</p>

      <h2>Schritt 1 — Ablehnung entschlüsseln</h2>
      <table>
        <tr><th>Einwand</th><th>Gegenargument</th><th>Urteil</th></tr>
        <tr><td>Technisches Problem</td><td>Betriebsrisiko</td><td>Wallentin-Hermann C-549/07</td></tr>
        <tr><td>Streik der Crew</td><td>Intern</td><td>Krüsemann C-195/17</td></tr>
        <tr><td>Operative Gründe</td><td>Zu unbestimmt</td><td>Art. 5 Abs. 3</td></tr>
        <tr><td>Verspätung nur in der Mitte</td><td>Endziel zählt</td><td>Folkerts C-11/11</td></tr>
      </table>

      <h2>Schritt 2 — Formelle Mahnung</h2>
      <p>Einschreiben oder E-Mail mit Lesebestätigung: Flugdaten, Betrag, EuGH-Verweis, Frist 30 Tage, Androhung Behörde/Gericht.</p>

      <h2>Schritt 3 — Nationale Behörde</h2>
      <p>In Deutschland: <strong>Luftfahrt-Bundesamt (BAF)</strong>. Die Behörde kann sanktionieren, ordnet aber keine Zahlung an Sie an — Druckmittel vor Gericht.</p>

      <h2>Schritt 4 — ODR-Plattform</h2>
      <p>Für Online-Buchungen: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a> — wenn die Airline ADR akzeptiert.</p>

      <h2>Schritt 5 — Europäisches Mahnverfahren</h2>
      <p>Für Forderungen unter 5.000 €: standardisiertes Verfahren, geringe Gebühren.</p>

      <h2>Schritt 6 — Spezialdienst</h2>
      <p>Robin des Airs prüft kostenlos, mahnt an und geht bei Bedarf gerichtlich vor — Erfolgshonorar (25 % bei Zahlung).</p>

      <h2>Schritt 7 — Klage</h2>
      <p>Zuständig: Gericht am Abflug-, Ankunfts- oder Sitz der Airline (flightright/Air Nostrum, C-274/16). In Deutschland Verjährung 3 Jahre beachten.</p>

      <h2>Was Sie vermeiden sollten</h2>
      <ul>
        <li>Teilangebot unterschreiben ohne Prüfung</li>
        <li>Nur telefonisch diskutieren — schriftlich dokumentieren</li>
        <li>Jahrelang warten — Fristen laufen</li>
      </ul>""",
    },
]

ES_FILES = [
    {
        "slug": "resumen-reglamento-ce-261.html",
        "title": "Reglamento (CE) 261/2004 explicado: guía de derechos del pasajero aéreo",
        "description": "Resumen didáctico del CE 261: ámbito, indemnización 250–600 €, cancelación, retraso, denegación de embarque, asistencia y excepciones. Fuente EUR-Lex.",
        "h1": "Reglamento (CE) 261/2004: guía completa de derechos en la UE",
        "faq": [
            (
                "¿Qué es el Reglamento (CE) 261/2004?",
                "Establece normas comunes sobre indemnización y asistencia en caso de denegación de embarque, cancelación o largo retraso. Base legal en EUR-Lex 32004R0261.",
            ),
            (
                "¿Quién está protegido?",
                "Salida desde aeropuerto UE/EEE/Suiza (cualquier aerolínea) o llegada a la UE en aerolínea con licencia europea.",
            ),
            (
                "¿Cuánto indemniza?",
                "250 € hasta 1.500 km, 400 € entre 1.500 y 3.500 km (o intra-UE >1.500 km), 600 € por encima de 3.500 km fuera de la UE — por pasajero.",
            ),
        ],
        "related": [
            ("/es/blog/indemnizacion-vuelo-importes-250-400-600.html", "Importes 250 €, 400 €, 600 €"),
            ("/es/blog/jurisprudencia-tjue-ce-261.html", "Jurisprudencia del TJUE"),
            ("/es/blog/aerolinea-rechaza-indemnizacion.html", "La aerolínea rechaza — qué hacer"),
        ],
        "body": f"""      <p>El <strong>Reglamento (CE) n.º 261/2004</strong> de 11 de febrero de 2004 (<a href="{EUR}/ES/TXT/?uri=CELEX:32004R0261" target="_blank" rel="noopener">EUR-Lex</a>) es la piedra angular de la protección del pasajero aéreo en Europa. Este artículo resume de forma pedagógica su contenido y la jurisprudencia del Tribunal de Justicia de la UE (TJUE) — no constituye asesoramiento jurídico personalizado.</p>

      <h2>1. Ámbito de aplicación (artículo 3)</h2>
      <ul>
        <li><strong>Salida desde un aeropuerto de la UE, EEE o Suiza</strong> — cualquier aerolínea (p. ej. Madrid–Casablanca con Royal Air Maroc).</li>
        <li><strong>Llegada a la UE</strong> en aerolínea europea (p. ej. Iberia Nueva York–Madrid).</li>
      </ul>
      <p>Incluye Iberia, Vueling, Air Europa, Ryanair, Lufthansa, Air France, TAP, easyJet, etc.</p>

      <h2>2. Tres supuestos de indemnización</h2>
      <h3>Cancelación (artículo 5)</h3>
      <p>Si se informa con menos de 14 días, salvo circunstancias extraordinarias probadas.</p>
      <h3>Denegación de embarque (artículo 4)</h3>
      <p>Reserva confirmada y presentación puntual — TJUE Rodríguez Cachafeiro (C-321/11).</p>
      <h3>Retraso largo (Sturgeon)</h3>
      <p><strong>3 horas o más en el destino final</strong> — misma indemnización que cancelación (TJUE, 19.11.2009, C-402/07; confirmado por Nelson, 2012).</p>

      <h2>3. Importes (artículo 7)</h2>
      <table>
        <tr><th>Distancia</th><th>Indemnización</th></tr>
        <tr><td>≤ 1.500 km</td><td>250 €</td></tr>
        <tr><td>1.500–3.500 km o intra-UE &gt; 1.500 km</td><td>400 €</td></tr>
        <tr><td>&gt; 3.500 km fuera UE</td><td>600 €</td></tr>
      </table>

      <h2>4. Asistencia (artículo 9)</h2>
      <p>Comidas, hotel, transporte y comunicaciones — incluso en circunstancias extraordinarias (McDonagh, C-12/11).</p>

      <h2>5. Reembolso o reubicación (artículo 8)</h2>
      <p>Usted elige: reembolso íntegro en 7 días, vuelo alternativo lo antes posible o en fecha posterior. La indemnización es independiente.</p>

      <h2>6. Circunstancias extraordinarias (artículo 5.3)</h2>
      <p>La aerolínea debe probar el evento externo e inevitable. Fallos técnicos (Wallentin-Hermann) y huelgas internas (Krüsemann) normalmente <strong>no</strong> califican.</p>

      <h2>7. Plazos de reclamación</h2>
      <p>El CE 261 no fija plazo — rige el derecho nacional. En España suele aplicarse <strong>2 años</strong> (normas generales pueden ampliar). En Francia 5 años, Alemania 3 años.</p>

      <h2>8. Cómo reclamar</h2>
      <ol>
        <li>Conservar tarjeta de embarque y prueba de hora de llegada.</li>
        <li>Reclamación escrita a la aerolínea operadora citando artículo 7 y TJUE.</li>
        <li>Escalar a AESA (España) o vía judicial / servicio especializado.</li>
      </ol>""",
    },
    {
        "slug": "indemnizacion-vuelo-importes-250-400-600.html",
        "title": "Indemnización por vuelo: 250 €, 400 € o 600 € (CE 261)",
        "description": "Importes del artículo 7 CE 261/2004: tramos de distancia, reducción del 50 %, ejemplos y regla Folkerts en vuelos con escala.",
        "h1": "Indemnización por vuelo: importes 250 €, 400 € y 600 €",
        "faq": [
            (
                "¿Cuánto indemniza el CE 261?",
                "250 €, 400 € o 600 € según distancia — por pasajero, en efectivo o transferencia.",
            ),
            (
                "¿Puede reducirse un 50 %?",
                "Solo en cancelación con reubicación que llegue dentro de 2–4 h según tramo (art. 7.2). No en retrasos Sturgeon.",
            ),
            (
                "¿Cómo se calcula la distancia?",
                "Distancia ortodrómica del origen al destino final; billete único con escala = fin a fin (Folkerts, C-11/11).",
            ),
        ],
        "related": [
            ("/es/blog/resumen-reglamento-ce-261.html", "Resumen del Reglamento CE 261"),
            ("/es/blog/vuelo-cancelado-indemnizacion-600.html", "Vuelo cancelado — hasta 600 €"),
            ("/es/blog/circunstancias-extraordinarias-ce-261.html", "Circunstancias extraordinarias"),
        ],
        "body": """      <p>El artículo 7 del Reglamento (CE) 261/2004 fija tres niveles de indemnización según la distancia. Los importes no se han indexado desde 2004 y aplican a retrasos ≥3 h (Sturgeon), cancelaciones y denegación de embarque.</p>

      <h2>Los tres tramos</h2>
      <table>
        <tr><th>Distancia</th><th>Indemnización</th><th>Ejemplos</th></tr>
        <tr><td>≤ 1.500 km</td><td>250 €</td><td>Barcelona–París, Madrid–Lisboa, Valencia–Roma</td></tr>
        <tr><td>1.500–3.500 km o intra-UE &gt; 1.500 km</td><td>400 €</td><td>Madrid–Atenas, Barcelona–Casablanca</td></tr>
        <tr><td>&gt; 3.500 km fuera UE</td><td>600 €</td><td>Madrid–Dakar, Barcelona–Buenos Aires vía escala UE</td></tr>
      </table>

      <h2>Cálculo de distancia</h2>
      <p>Se usa la <strong>distancia de círculo máximo</strong>. En billete único Madrid–París–Lagos cuenta Madrid–Lagos, no tramo a tramo (Folkerts).</p>
      <p>Curiosidad: vuelo intra-UE &gt;1.500 km = siempre 400 € (p. ej. Madrid–Helsinki).</p>

      <h2>Ejemplos</h2>
      <ul>
        <li>Vueling Barcelona–Roma, 4 h retraso: <strong>250 €</strong> por pasajero.</li>
        <li>Iberia Madrid–Lagos cancelado: <strong>600 €</strong> por pasajero.</li>
        <li>Familia de 4 con asiento, Madrid–Nairobi, 5 h: <strong>2.400 €</strong>.</li>
      </ul>

      <h2>Reducción del 50 %</h2>
      <p>Solo cancelación + reubicación puntual (art. 7.2). No aplica a retrasos.</p>

      <h2>Pago en dinero</h2>
      <p>Art. 7.3: efectivo o transferencia. Bonos solo con consentimiento expreso. Indemnización <strong>además</strong> del reembolso (art. 8).</p>

      <h2>Tácticas habituales de las aerolíneas</h2>
      <table>
        <tr><th>Táctica</th><th>Respuesta</th></tr>
        <tr><td>Bono en lugar de 600 €</td><td>Exigir transferencia</td></tr>
        <tr><td>50 % en retraso</td><td>Art. 7.2 no aplica</td></tr>
        <tr><td>Distancia por tramo</td><td>Folkerts — destino final</td></tr>
      </table>""",
    },
    {
        "slug": "vuelo-cancelado-indemnizacion-600.html",
        "title": "Vuelo cancelado: indemnización hasta 600 € según CE 261",
        "description": "Cancelación de vuelo y CE 261: requisitos, aviso 14 días, 600 € en largo radio, circunstancias extraordinarias, reembolso más indemnización.",
        "h1": "Vuelo cancelado: hasta 600 € de indemnización por pasajero",
        "faq": [
            (
                "¿Cuándo hay derecho a indemnización?",
                "Aviso con menos de 14 días, sin circunstancias extraordinarias probadas y sin alternativa satisfactoria.",
            ),
            (
                "¿Cuánto en largo radio?",
                "600 € por pasajero si la distancia supera 3.500 km fuera de la UE.",
            ),
            (
                "¿Reembolso e indemnización a la vez?",
                "Sí — artículos 7 y 8 son derechos distintos.",
            ),
        ],
        "related": [
            ("/es/blog/indemnizacion-vuelo-importes-250-400-600.html", "Importes 250–600 €"),
            ("/es/blog/circunstancias-extraordinarias-ce-261.html", "Circunstancias extraordinarias"),
            ("/es/blog/aerolinea-rechaza-indemnizacion.html", "La aerolínea rechaza"),
        ],
        "body": """      <p>Una cancelación genera estrés, pero el Reglamento (CE) 261/2004 le garantiza una indemnización fija <strong>además</strong> del reembolso o vuelo alternativo.</p>

      <h2>¿Quién está cubierto?</h2>
      <ul>
        <li>Salida desde aeropuerto <strong>de la UE</strong> (cualquier aerolínea), o</li>
        <li>Llegada a la UE en aerolínea <strong>europea</strong>.</li>
      </ul>

      <h2>Tres condiciones</h2>
      <ol>
        <li>Aviso <strong>menos de 14 días</strong> antes (carga de la prueba: aerolínea — Krijgsman, C-302/16).</li>
        <li>Sin <strong>circunstancias extraordinarias</strong> demostradas.</li>
        <li>Sin alternativa que llegue a tiempo similar.</li>
      </ol>

      <h2>Importes</h2>
      <table>
        <tr><th>Distancia</th><th>Indemnización</th></tr>
        <tr><td>≤ 1.500 km</td><td>250 €</td></tr>
        <tr><td>1.500–3.500 km</td><td>400 €</td></tr>
        <tr><td>&gt; 3.500 km fuera UE</td><td><strong>600 €</strong></td></tr>
      </table>

      <h2>No son circunstancias extraordinarias</h2>
      <ul>
        <li>Problemas técnicos (Wallentin-Hermann)</li>
        <li>Huelgas del personal de la aerolínea (Krüsemann)</li>
        <li>Overbooking, falta de tripulación</li>
      </ul>

      <h2>Reubicación al día siguiente</h2>
      <p>Cancelación nocturna y vuelo a la mañana siguiente con 12 h de retraso en destino → a menudo <strong>600 €</strong> en largo radio.</p>
      <blockquote><strong>Recuerde:</strong> reembolso e indemnización son independientes. No renuncie a la indemnización a cambio de un bono.</blockquote>

      <h2>Cinco pasos para reclamar</h2>
      <ol>
        <li>Pruebas: reserva, email de cancelación, hora real de llegada.</li>
        <li>Calcular distancia ortodrómica.</li>
        <li>Carta a la aerolínea con IBAN y referencia CE 261.</li>
        <li>Si rechazan: AESA o vía judicial.</li>
        <li>Plazo en España: reclamar pronto (prescripción habitual 2 años).</li>
      </ol>""",
    },
    {
        "slug": "circunstancias-extraordinarias-ce-261.html",
        "title": "Circunstancias extraordinarias CE 261: cuándo la aerolínea debe pagar",
        "description": "Artículo 5.3 CE 261 y jurisprudencia TJUE: fallos técnicos, meteorología, huelgas. Guía pedagógica para impugnar rechazos.",
        "h1": "Circunstancias extraordinarias: el argumento n.º 1 de las aerolíneas",
        "faq": [
            (
                "¿Un problema técnico es extraordinario?",
                "Por regla general no — TJUE Wallentin-Hermann (C-549/07).",
            ),
            (
                "¿El mal tiempo siempre excusa?",
                "Solo si era imprevisible; nieve habitual o calima estacional suelen ser previsibles.",
            ),
            (
                "¿Huelga de pilotos de la aerolínea?",
                "No — Krüsemann (C-195/17): riesgo empresarial interno.",
            ),
        ],
        "related": [
            ("/es/blog/resumen-reglamento-ce-261.html", "Resumen CE 261"),
            ("/es/blog/jurisprudencia-tjue-ce-261.html", "Jurisprudencia TJUE"),
            ("/es/blog/aerolinea-rechaza-indemnizacion.html", "La aerolínea rechaza"),
        ],
        "body": f"""      <p>Las «circunstancias extraordinarias» son el motivo de rechazo más citado — pero <strong>alrededor del 80 %</strong> pueden impugnarse. El artículo 5.3 del Reglamento (CE) 261/2004 (<a href="{EUR}/ES/TXT/?uri=CELEX:32004R0261" target="_blank" rel="noopener">EUR-Lex</a>) exige externalidad e inevitabilidad pese a medidas razonables.</p>

      <h2>Tabla orientativa</h2>
      <table>
        <tr><th>Situación</th><th>¿Extraordinaria?</th></tr>
        <tr><td>Tormenta súbita imprevisible</td><td>A menudo sí</td></tr>
        <tr><td>Nieve habitual en invierno</td><td>No — previsible</td></tr>
        <tr><td>Huelga de control aéreo</td><td>Sí (externa)</td></tr>
        <tr><td>Huelga interna de la aerolínea</td><td>No (Krüsemann)</td></tr>
        <tr><td>Avería técnica</td><td>No (Wallentin-Hermann)</td></tr>
        <tr><td>Impacto de aves</td><td>Sí, con deber de mitigar (Pešková)</td></tr>
        <tr><td>Retraso en rotación</td><td>No — gestión interna</td></tr>
      </table>

      <h2>Fallo técnico</h2>
      <p>Escribir «problema técnico» no basta. El TJUE considera el mantenimiento responsabilidad de la aerolínea. Excepción muy rara: defecto oculto notificado el mismo día por el fabricante.</p>

      <h2>Meteorología</h2>
      <p>Distinga fenómenos imprevisibles de fenómenos estacionales (harmattan, niebla invernal en Barajas) donde la aerolínea debe planificar.</p>

      <h2>Huelgas</h2>
      <ul>
        <li>Controladores / servicios externos → pueden ser extraordinarias</li>
        <li>Tripulación propia → <strong>no</strong> (Krüsemann, Airhelp/TAP C-28/20)</li>
      </ul>

      <h2>Carga de la prueba</h2>
      <p>La aerolínea debe aportar informe técnico, NOTAM o resolución ATC y demostrar medidas sustitutorias fallidas. Pídalas por escrito. Sin prueba, los tribunales suelen favorecer al pasajero.</p>""",
    },
    {
        "slug": "vueling-vuelo-retrasado-indemnizacion.html",
        "title": "Vueling vuelo retrasado: indemnización CE 261 en España",
        "description": "Retraso Vueling: 250–600 € según CE 261, rutas España–Europa y largo radio, huelgas, AESA, plazos en España. Guía pedagógica.",
        "h1": "Vueling: vuelo retrasado e indemnización según CE 261",
        "faq": [
            (
                "¿Vueling está sujeta al CE 261?",
                "Sí — aerolínea española (IAG). Aplica en salidas UE y llegadas UE en Vueling.",
            ),
            (
                "¿Retraso de cuántas horas?",
                "3 horas o más en el destino final (Sturgeon) para indemnización fija.",
            ),
            (
                "¿Plazo para reclamar en España?",
                "Reclame pronto; prescripción habitual de 2 años (pueden aplicarse plazos civiles más largos).",
            ),
        ],
        "related": [
            ("/es/blog/indemnizacion-vuelo-importes-250-400-600.html", "Importes 250–600 €"),
            ("/es/blog/circunstancias-extraordinarias-ce-261.html", "Circunstancias extraordinarias"),
            ("/es/blog/aerolinea-rechaza-indemnizacion.html", "La aerolínea rechaza"),
        ],
        "body": """      <p><strong>Vueling</strong> es una de las principales aerolíneas de bajo coste en España (grupo IAG, junto a Iberia). Al ser <strong>operador con licencia europea</strong>, queda plenamente sujeta al Reglamento (CE) 261/2004 — igual que Iberia, Air Europa o Ryanair en rutas comparables.</p>

      <h2>Rutas típicas e importes</h2>
      <table>
        <tr><th>Ruta</th><th>Indemnización (retraso ≥3 h)</th></tr>
        <tr><td>Barcelona–Palma, Madrid–Sevilla (≤1.500 km)</td><td>250 €</td></tr>
        <tr><td>Barcelona–Atenas, Madrid–Moscú vía UE (&gt;1.500 km intra-UE)</td><td>400 €</td></tr>
        <tr><td>Barcelona–Dakar, Madrid–Buenos Aires (con destino &gt;3.500 km)</td><td>600 €</td></tr>
      </table>
      <p>En billete único con escala, la distancia es origen–destino final (Folkerts, C-11/11).</p>

      <h2>Retrasos frecuentes en Vueling</h2>
      <p>Operación en bases congestionadas (Barcelona El Prat, Palma), rotaciones ajustadas y cambios de avión generan retrasos. La mayoría <strong>no</strong> son circunstancias extraordinarias: rotación, fallo técnico o falta de tripulación obligan a indemnizar si se superan 3 h en destino.</p>

      <h2>Huelgas</h2>
      <p>Huelga del personal de Vueling o Iberia → <strong>no</strong> extraordinaria (Krüsemann, C-195/17). Huelga de controladores → puede serlo, pero la aerolínea debe probarlo.</p>

      <h2>Asistencia durante la espera</h2>
      <p>Artículo 9: comidas, hotel si pernocta, transporte — independiente de la indemnización. Exíjalo en mostrador aunque Vueling cite «circunstancias extraordinarias».</p>

      <h2>Cómo reclamar a Vueling</h2>
      <ol>
        <li>Formulario en vueling.com o email a atención al cliente</li>
        <li>Localizador, tarjetas de embarque, hora real de llegada</li>
        <li>Citar CE 261 art. 7 y Sturgeon si hubo retraso ≥3 h</li>
        <li>30–60 días de plazo razonable de respuesta</li>
        <li>Rechazo: AESA (Agencia Estatal de Seguridad Aérea) o servicio especializado</li>
      </ol>

      <h2>Mercado español</h2>
      <p>Miles de pasajeros anuales en rutas domésticas e internacionales desde Barcelona y Madrid tienen derechos automáticos. No acepte bonos sin comparar con el importe legal en efectivo.</p>""",
    },
    {
        "slug": "jurisprudencia-tjue-ce-261.html",
        "title": "Jurisprudencia TJUE sobre CE 261: sentencias clave",
        "description": "Sturgeon, Wallentin-Hermann, Krüsemann, Folkerts, Nelson — resumen pedagógico con enlaces EUR-Lex y hubs EN/FR.",
        "h1": "CE 261 y jurisprudencia del TJUE: sentencias esenciales",
        "faq": [
            (
                "¿Qué establece Sturgeon?",
                "Retraso ≥3 h en destino final = misma indemnización que cancelación (TJUE, C-402/07, 2009).",
            ),
            (
                "¿Fallo técnico extraordinario?",
                "No — Wallentin-Hermann (C-549/07).",
            ),
            (
                "¿Escala — dónde se miden las 3 horas?",
                "En el destino final del billete único (Folkerts, C-11/11).",
            ),
        ],
        "related": [
            ("/es/blog/resumen-reglamento-ce-261.html", "Resumen CE 261"),
            ("/es/blog/circunstancias-extraordinarias-ce-261.html", "Circunstancias extraordinarias"),
            ("/en/blog/ec-261-case-law-cjeu-rulings.html", "Full case law hub (English)"),
        ],
        "body": f"""      <p>El Reglamento (CE) 261/2004 es breve; el <strong>Tribunal de Justicia de la Unión Europea (TJUE)</strong> ha ido precisando su sentido. Resumen pedagógico con enlaces a <a href="{EUR}/ES/TXT/?uri=CELEX:32004R0261" target="_blank" rel="noopener">EUR-Lex</a>. Análisis ampliados: <a href="/en/blog/ec-261-case-law-cjeu-rulings.html">hub en inglés</a> y <a href="/blog/jurisprudence-ce261-arrets-cjue.html">hub en francés</a>.</p>

      <h2>Validez y ámbito</h2>
      <p><strong>IATA/ELFAA (C-344/04, 2006):</strong> compatible con la Convención de Montreal.</p>
      <p><strong>Wegener (C-537/17, 2018):</strong> billete único con salida UE y escala fuera de UE — sigue aplicando CE 261.</p>

      <h2>Retraso e indemnización</h2>
      <p><strong>Sturgeon (C-402/07):</strong> umbral de 3 horas. <a href="{EUR}/ES/TXT/?uri=CELEX:62007CJ0402" target="_blank" rel="noopener">EUR-Lex</a></p>
      <p><strong>Nelson (C-581/10, 2012):</strong> confirma Sturgeon; indemnización fija acumulable con daños Montreal.</p>
      <p><strong>Folkerts (C-11/11, 2013):</strong> retraso y distancia medidos hasta destino final.</p>

      <h2>Cancelación</h2>
      <p><strong>Krijgsman (C-302/16, 2017):</strong> la aerolínea debe probar aviso 14 días antes.</p>

      <h2>Circunstancias extraordinarias</h2>
      <p><strong>Wallentin-Hermann (C-549/07):</strong> averías técnicas habituales no excusan.</p>
      <p><strong>Krüsemann (C-195/17):</strong> huelga interna no excusa.</p>
      <p><strong>Pešková (C-315/15):</strong> impacto de aves — posible excusa con deber de mitigar.</p>
      <p><strong>McDonagh (C-12/11):</strong> ceniza volcánica — excusa; asistencia sin límite temporal.</p>

      <h2>Denegación de embarque</h2>
      <p><strong>Rodríguez Cachafeiro (C-321/11):</strong> overbooking indemnizable.</p>

      <h2>Uso práctico</h2>
      <p>Cite el número de asunto TJUE en su reclamación escrita. Para el catálogo completo de sentencias comentadas, consulte nuestros hubs multilingües enlazados arriba.</p>""",
    },
    {
        "slug": "aerolinea-rechaza-indemnizacion.html",
        "title": "La aerolínea rechaza la indemnización CE 261: 7 pasos",
        "description": "Rechazo de indemnización por vuelo: carta formal, AESA, ODR, procedimiento europeo, vía judicial. Guía pedagógica con jurisprudencia TJUE.",
        "h1": "La aerolínea rechaza su indemnización: qué hacer ahora",
        "faq": [
            (
                "¿Qué hacer si invocan problema técnico?",
                "Citar Wallentin-Hermann (C-549/07) y enviar requerimiento formal con plazo de 30 días.",
            ),
            (
                "¿Autoridad en España?",
                "AESA — Agencia Estatal de Seguridad Aérea.",
            ),
            (
                "¿Merece la pena ir a tribunales?",
                "En casos claros de CE 261, alta tasa de éxito en monitorio o juicio verbal.",
            ),
        ],
        "related": [
            ("/es/blog/circunstancias-extraordinarias-ce-261.html", "Circunstancias extraordinarias"),
            ("/es/blog/jurisprudencia-tjue-ce-261.html", "Jurisprudencia TJUE"),
            ("/es/blog/resumen-reglamento-ce-261.html", "Resumen CE 261"),
        ],
        "body": """      <p>Presentó una reclamación clara bajo el Reglamento (CE) 261/2004 y la aerolínea rechazó, ofreció un bono o no respondió. Es habitual — y <strong>la mayoría de rechazos son impugnables</strong> con la jurisprudencia del TJUE.</p>

      <h2>Paso 1 — Analizar el motivo</h2>
      <table>
        <tr><th>Motivo</th><th>Contraargumento</th><th>Sentencia</th></tr>
        <tr><td>Problema técnico</td><td>Riesgo operativo</td><td>Wallentin-Hermann C-549/07</td></tr>
        <tr><td>Huelga de tripulación</td><td>Interna</td><td>Krüsemann C-195/17</td></tr>
        <tr><td>Motivos operativos</td><td>Indeterminado</td><td>Art. 5.3</td></tr>
        <tr><td>Retraso solo en escala</td><td>Cuenta destino final</td><td>Folkerts C-11/11</td></tr>
      </table>

      <h2>Paso 2 — Requerimiento formal</h2>
      <p>Carta certificada o email con acuse: datos del vuelo, importe, sentencia TJUE, plazo 30 días, advertencia de escalada.</p>

      <h2>Paso 3 — Autoridad nacional</h2>
      <p>En España: <strong>AESA</strong>. Refuerza la presión pero no ordena pago directo al pasajero.</p>

      <h2>Paso 4 — Plataforma ODR</h2>
      <p><a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">Resolución de litigios en línea</a> si la aerolínea acepta ADR.</p>

      <h2>Paso 5 — Procedimiento europeo de escasa cuantía</h2>
      <p>Para cantidades inferiores a 5.000 € — formulario uniforme, coste moderado.</p>

      <h2>Paso 6 — Servicio especializado</h2>
      <p>Robin des Airs analiza gratis, reclama y litiga si hace falta — comisión 25 % solo si hay cobro.</p>

      <h2>Paso 7 — Vía judicial</h2>
      <p>Tribunal del aeropuerto de salida, llegada o domicilio de la aerolínea (flightright, C-274/16). En España, plazo de prescripción: reclamar sin demora.</p>

      <h2>Evite</h2>
      <ul>
        <li>Firmar acuerdos parciales sin asesoramiento</li>
        <li>Negociar solo por teléfono</li>
        <li>Esperar años — prescriben derechos</li>
      </ul>""",
    },
]


def write_de(article: dict) -> None:
    path = os.path.join(ROOT, "de", "blog", article["slug"])
    html = render(
        lang="de",
        slug=article["slug"],
        title=article["title"],
        description=article["description"],
        h1=article["h1"],
        body=article["body"],
        faq=article["faq"],
        related_title="Verwandte Artikel",
        related=article["related"],
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", path)


def write_es(article: dict) -> None:
    path = os.path.join(ROOT, "es", "blog", article["slug"])
    html = render(
        lang="es",
        slug=article["slug"],
        title=article["title"],
        description=article["description"],
        h1=article["h1"],
        body=article["body"],
        faq=article["faq"],
        related_title="Artículos relacionados",
        related=article["related"],
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", path)


def main() -> None:
    for a in DE_FILES:
        write_de(a)
    for a in ES_FILES:
        write_es(a)


if __name__ == "__main__":
    main()

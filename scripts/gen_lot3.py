"""LOT 3 — 6 guides hub méta (CDG, BRU, IST, CAS, LIS, DXB/DOH vers Afrique)."""
from _gen_template import write_all


def body_hub(h):
    """Génère le body HTML d'un guide hub méta."""
    compagnies_html = "\n".join(
        f"  <tr><td><strong>{c['nom']}</strong></td><td>{c['code']}</td><td>{c['destinations']}</td><td>{c['ce261']}</td></tr>"
        for c in h["compagnies"]
    )
    destinations_lines = []
    for cat, dests in h["destinations_par_categorie"].items():
        destinations_lines.append(f"<h3>{cat}</h3><p>{dests}</p>")
    destinations_html = "\n".join(destinations_lines)

    conseils_html = "\n".join(f"  <li>{c}</li>" for c in h["conseils"])

    return f"""<p>{h["intro"]}</p>

<h2>Le hub {h["nom"]} en chiffres</h2>
<ul>
  <li><strong>Code IATA :</strong> {h["code"]}</li>
  <li><strong>Pays :</strong> {h["pays"]} {("(UE)" if h["dans_ue"] else "(hors UE)")}</li>
  <li><strong>Compagnie principale :</strong> {h["compagnie_principale"]}</li>
  <li><strong>Destinations Afrique :</strong> {h["nb_destinations"]}</li>
  <li><strong>Temps de correspondance minimum (MCT) international :</strong> {h["mct"]}</li>
  <li><strong>Ponctualité globale :</strong> {h["ponctualite"]}</li>
</ul>

<h2>Compagnies opérant depuis {h["nom"]} vers l'Afrique</h2>
<table>
  <tr><th>Compagnie</th><th>Code</th><th>Destinations Afrique principales</th><th>CE 261 retour</th></tr>
{compagnies_html}
</table>

<h2>Destinations africaines accessibles depuis {h["nom"]}</h2>
{destinations_html}

<h2>Que se passe-t-il si vous ratez votre correspondance à {h["nom"]} ?</h2>
<p>{h["correspondance_ratee"]}</p>

<blockquote><strong>Règle d'or à {h["nom"]} :</strong> en cas de correspondance ratée sur billet unique, ne quittez pas la zone de transit avant d'avoir parlé au comptoir de la compagnie qui opérait votre premier vol. C'est cette compagnie qui doit organiser votre réacheminement, votre repas et éventuellement votre hôtel. Conservez tous les reçus.</blockquote>

<h2>Conseils pratiques spécifiques à {h["nom"]}</h2>
<ul>
{conseils_html}
</ul>

<h2>Et la protection juridique CE 261 ?</h2>
<p>{h["ce261_summary"]}</p>

<h2>Si votre vol depuis ou via {h["nom"]} est retardé ou annulé</h2>
<ol>
  <li>Constituez votre dossier (carte d'embarquement, e-mail PNR, preuves de retard, reçus repas/hôtel).</li>
  <li>Identifiez la <strong>compagnie responsable</strong> (transporteur effectif du segment qui a causé l'incident).</li>
  <li>Envoyez une <a href="/blog/lettre-mise-en-demeure-compagnie-aerienne-modele.html">mise en demeure formelle</a> sous 30 jours.</li>
  <li>En cas de refus, saisissez la <a href="https://www.ecologie.gouv.fr/direction-generale-laviation-civile-dgac" target="_blank" rel="noopener external">DGAC</a>, le Médiateur compétent, ou Robin des Airs : <a href="/depot-en-ligne.html">dépôt en ligne</a> en 2 minutes.</li>
</ol>
"""


HUBS = [
# 1. CDG — Paris Charles de Gaulle
{
    "slug": "guide-correspondance-cdg-vers-afrique-ce261",
    "nom": "Paris-Charles de Gaulle",
    "code": "CDG",
    "pays": "France",
    "dans_ue": True,
    "compagnie_principale": "Air France (hub majeur)",
    "nb_destinations": "~40 destinations africaines directes ou avec correspondance facilitée",
    "mct": "1h00 (Schengen-Schengen), 1h30 (Schengen-international), 2h00 (terminal 2E ↔ 2F)",
    "ponctualite": "~74% (impacté par grèves ATC françaises récurrentes)",
    "title": "Correspondances Paris CDG vers l'Afrique : guide complet CE 261",
    "description": "Vols Afrique via Paris CDG : Air France hub, compagnies, terminaux, MCT, droits CE 261. Le guide complet pour passagers en correspondance.",
    "h1": "Guide complet des correspondances Paris CDG vers l'Afrique (CE 261)",
    "quick_answer": "<strong>Paris-Charles de Gaulle (CDG) est le hub n°1 en Europe pour les vols vers l'Afrique</strong> (~40 destinations directes via Air France + nombreuses correspondances via compagnies non-EU). En tant qu'aéroport situé dans l'UE, <strong>tous les vols au départ de CDG sont couverts par le règlement CE 261</strong>, quelle que soit la compagnie. Pour le retour vers CDG depuis l'Afrique, la protection CE 261 dépend de la nationalité de la compagnie : <strong>Air France oui, compagnies non-EU non</strong>.",
    "intro": "Paris-Charles de Gaulle (CDG) est l'aéroport européen qui offre le plus grand nombre de vols directs vers l'Afrique. Hub historique d'Air France, il dessert quasiment toutes les capitales africaines francophones et la plupart des grandes villes d'Afrique de l'Ouest, centrale, australe et de l'océan Indien. Voici tout ce qu'il faut savoir pour optimiser vos correspondances et faire valoir vos droits CE 261 en cas de retard ou d'annulation.",
    "compagnies": [
        {"nom": "Air France", "code": "AF", "destinations": "~30 destinations directes WAF/CAF/EAF/SAF/Maghreb/océan Indien", "ce261": "✔ Oui (compagnie EU)"},
        {"nom": "Royal Air Maroc", "code": "AT", "destinations": "Casablanca + correspondances WAF", "ce261": "✘ Non (non-EU)"},
        {"nom": "Turkish Airlines", "code": "TK", "destinations": "Istanbul + 60 correspondances Afrique", "ce261": "✘ Non (non-EU)"},
        {"nom": "Emirates", "code": "EK", "destinations": "Dubaï + 25 correspondances Afrique", "ce261": "✘ Non (non-EU)"},
        {"nom": "Qatar Airways", "code": "QR", "destinations": "Doha + 28 correspondances Afrique", "ce261": "✘ Non (non-EU)"},
        {"nom": "Ethiopian Airlines", "code": "ET", "destinations": "Addis-Abeba + 60 correspondances Afrique", "ce261": "✘ Non (non-EU)"},
        {"nom": "Kenya Airways", "code": "KQ", "destinations": "Nairobi + correspondances EAF", "ce261": "✘ Non (non-EU, mais codeshare AF/KLM)"},
        {"nom": "Tunisair, Air Algérie, EgyptAir", "code": "TU/AH/MS", "destinations": "Maghreb + correspondances", "ce261": "✘ Non (toutes non-EU)"},
    ],
    "destinations_par_categorie": {
        "Afrique de l'Ouest (vols directs Air France)": "Dakar (DKR), Abidjan (ABJ), Bamako (BKO), Ouagadougou (OUA), Niamey (NIM), Cotonou (COO), Lomé (LFW), Conakry (CKY), Freetown (FNA), Accra (ACC), Lagos (LOS), Nouakchott (NKC), Banjul (BJL)",
        "Afrique centrale (vols directs Air France)": "Douala (DLA), Yaoundé (NSI), Libreville (LBV), Brazzaville (BZV), Kinshasa (FIH), Bangui (BGF), N'Djamena (NDJ), Pointe-Noire (PNR)",
        "Afrique de l'Est (vols directs Air France et codeshare Kenya Airways)": "Nairobi (NBO), Addis-Abeba (ADD), Dar es Salaam (DAR via NBO), Kigali (KGL), Kampala (EBB via NBO), Khartoum (KRT)",
        "Afrique australe (Air France)": "Johannesburg (JNB), Antananarivo (TNR), Maputo (MPM via JNB)",
        "Maghreb (Air France, RAM, Air Algérie, Tunisair, Transavia, easyJet)": "Casablanca (CMN), Rabat (RBA), Marrakech (RAK), Agadir (AGA), Tanger (TNG), Tunis (TUN), Djerba (DJE), Alger (ALG), Oran (ORN), Constantine (CZL), Tripoli (TIP)",
        "Océan Indien (Air France, Corsair)": "La Réunion (RUN), Mayotte (DZA), Île Maurice (MRU)",
    },
    "correspondance_ratee": "Si vous ratez votre correspondance à CDG en raison du retard d'un vol antérieur, et que vous avez un <strong>billet unique</strong>, la compagnie responsable doit vous réacheminer dès que possible vers votre destination finale, sans frais. Elle doit également prendre en charge vos repas et un hôtel si une nuit est nécessaire. Si votre billet est <strong>séparé</strong> (deux PNR distincts), vous êtes livré à vous-même : la deuxième compagnie n'a aucune obligation. Voir notre article <a href=\"/blog/billet-unique-vs-billets-separes-ce261-correspondance.html\">billet unique vs séparé</a>.",
    "conseils": [
        "<strong>Terminal 2E (M, K, L)</strong> : la plupart des vols Air France vers l'Afrique partent du terminal 2E. Vols low-cost et Royal Air Maroc → terminal 1 ou 2D selon la compagnie.",
        "<strong>Correspondance terminal 2E ↔ 2F</strong> : navette CDGVAL ou TGV nécessaire, comptez 30-45 min. MCT officiel 2h mais souvent insuffisant en heures de pointe.",
        "<strong>Contrôle frontières</strong> : long pour les passeports non-Schengen (parfois 45 min) — comptez large.",
        "<strong>Grèves contrôleurs aériens français</strong> : récurrentes. Vérifiez avant de partir (site DGAC ou Eurocontrol).",
        "<strong>Espace équipage Air France</strong> : si votre vol est très retardé, demandez au comptoir d'accès au salon (rarement accordé en éco mais possible avec une carte Flying Blue Gold/Platinum ou statut SkyTeam Elite Plus).",
        "<strong>Bagages enregistrés jusqu'à destination finale</strong> : sur billet unique uniquement. Vérifiez sur votre étiquette bagages.",
    ],
    "ce261_summary": "Tous les vols au départ de CDG sont protégés par le CE 261 (cas A : départ aéroport UE). Pour le retour, seuls les vols opérés par Air France, KLM, Brussels Airlines, Lufthansa, TAP, Iberia, et autres compagnies EU sont protégés. Les vols retour avec Royal Air Maroc, Turkish, Emirates, Qatar, Ethiopian, Kenya Airways, EgyptAir, Tunisair, Air Algérie, etc. ne sont <strong>pas</strong> couverts par le CE 261. Pour une protection totale aller-retour, choisissez systématiquement Air France ou code-share Air France/KLM/Kenya Airways pour le retour.",
    "faq": [
        {"q": "Vol direct CDG-Dakar avec Air France retardé : combien d'indemnité ?", "a": "Distance CDG-Dakar = 4 208 km (long-courrier). Retard à l'arrivée à Dakar > 4h = 600 € pleins. Retard 3-4h = 300 € (réduction 50% si réacheminement). Air France est compagnie EU, donc le retour Dakar-CDG est aussi protégé."},
        {"q": "Quelle est la meilleure heure pour avoir une correspondance fiable à CDG ?", "a": "Évitez les pointes 7h-9h et 18h-21h (pic ATC France). Préférez les vols matinaux 10h-12h ou nocturnes 22h-1h pour les départs longue durée. Pour les correspondances depuis Air France matin sur les vols Afrique du soir, prévoyez 3h+ de connexion."},
        {"q": "Si mon vol Paris-Douala est annulé, Air France doit-elle me reloger ?", "a": "Oui, sauf si vous avez été prévenu plus de 14 jours à l'avance. Air France doit vous proposer un réacheminement vers Douala (autre vol direct ou via correspondance) ET un hôtel + repas si une nuit est nécessaire. En plus, indemnité forfaitaire CE 261 art. 7 (600 € pour le long-courrier) sauf circonstances extraordinaires."},
        {"q": "Air France a refusé l'indemnité en invoquant une grève. Valable ?", "a": "Cela dépend. Grève des contrôleurs aériens externes (DGAC, contrôle aérien français) = circonstance extraordinaire potentielle. Grève interne Air France (pilotes, hôtesses, personnel sol) = <strong>non</strong> circonstance extraordinaire selon plusieurs arrêts CJUE récents (notamment <a href=\"https://curia.europa.eu/juris/document/document.jsf?docid=204426&doclang=FR\" target=\"_blank\" rel=\"noopener external\">CJUE C-195/17 Krüsemann</a>). Demandez la preuve du type de grève."},
        {"q": "Vol Paris-Marrakech avec Royal Air Maroc retardé : qui paye ?", "a": "Royal Air Maroc paye (compagnie non-UE mais vol au départ d'un aéroport UE = CE 261 art. 3.1.a). Distance CDG-Marrakech = 2 130 km → 400 € par passager si retard > 3h à Marrakech."},
    ],
    "related": [
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/guide-correspondance-bru-vers-afrique-ce261.html", "label": "Guide Bruxelles BRU vers l'Afrique"},
        {"href": "/blog/guide-correspondance-cas-vers-afrique-ce261.html", "label": "Guide Casablanca CMN vers l'Afrique"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : à qui réclamer ?"},
        {"href": "/blog/billet-unique-vs-billets-separes-ce261-correspondance.html", "label": "Billet unique vs séparé"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
    ],
},

# 2. BRU — Bruxelles
{
    "slug": "guide-correspondance-bru-vers-afrique-ce261",
    "nom": "Bruxelles-Zaventem",
    "code": "BRU",
    "pays": "Belgique",
    "dans_ue": True,
    "compagnie_principale": "Brussels Airlines (hub historique Afrique centrale)",
    "nb_destinations": "~18 destinations africaines directes via Brussels Airlines + correspondances",
    "mct": "0h45 (Schengen), 1h00 (Schengen-international), 1h30 (international-international)",
    "ponctualite": "~75% (impacté par météo hivernale Bruxelles)",
    "title": "Correspondances Bruxelles BRU vers l'Afrique : guide complet CE 261",
    "description": "Bruxelles BRU est le hub Afrique de Brussels Airlines (ex-Sabena Congo). Compagnies, destinations, MCT, droits CE 261 expliqués pour passagers diaspora.",
    "h1": "Guide complet des correspondances Bruxelles BRU vers l'Afrique (CE 261)",
    "quick_answer": "<strong>Bruxelles-Zaventem (BRU) est le hub n°2 en Europe pour les vols vers l'Afrique centrale</strong> grâce à Brussels Airlines (héritière du réseau Sabena vers le Congo, le Rwanda, le Burundi). Aéroport situé dans l'UE → <strong>tous les vols au départ de BRU sont protégés par le CE 261</strong>. Brussels Airlines étant compagnie EU, le retour vers BRU est aussi protégé.",
    "intro": "Bruxelles-Zaventem (BRU) est l'aéroport européen avec la couverture historique la plus dense vers l'Afrique centrale (RDC, Rwanda, Burundi). Brussels Airlines a hérité du réseau Sabena vers ces destinations et reste la seule compagnie européenne à opérer des vols directs Bruxelles-Kinshasa, Bruxelles-Bujumbura, et Bruxelles-Kigali. Pour la diaspora ouest-africaine et centrale, BRU est une alternative très intéressante à Paris CDG.",
    "compagnies": [
        {"nom": "Brussels Airlines", "code": "SN", "destinations": "~18 destinations WAF/CAF directes (Star Alliance, groupe Lufthansa)", "ce261": "✔ Oui (compagnie EU)"},
        {"nom": "TUI fly Belgium", "code": "TB", "destinations": "Maroc, Tunisie, Sénégal, Cap-Vert (charter et low-cost)", "ce261": "✔ Oui (compagnie EU)"},
        {"nom": "Air France via Paris CDG", "code": "AF", "destinations": "Correspondances vers toute l'Afrique francophone", "ce261": "✔ Oui (compagnie EU)"},
        {"nom": "Royal Air Maroc", "code": "AT", "destinations": "Casablanca + correspondances WAF", "ce261": "✘ Non (non-EU)"},
        {"nom": "Turkish Airlines", "code": "TK", "destinations": "Istanbul + 60 correspondances Afrique", "ce261": "✘ Non (non-EU)"},
        {"nom": "Emirates", "code": "EK", "destinations": "Dubaï + 25 correspondances Afrique", "ce261": "✘ Non (non-EU)"},
        {"nom": "Qatar Airways", "code": "QR", "destinations": "Doha + 28 correspondances Afrique", "ce261": "✘ Non (non-EU)"},
        {"nom": "Ethiopian + ASKY", "code": "ET/KP", "destinations": "Addis-Abeba/Lomé + correspondances WAF", "ce261": "✘ Non (non-EU)"},
    ],
    "destinations_par_categorie": {
        "Afrique de l'Ouest (vols directs Brussels Airlines)": "Dakar (DKR), Abidjan (ABJ), Lomé (LFW codeshare ASKY), Cotonou (COO), Banjul (BJL), Freetown (FNA), Monrovia (ROB), Accra (ACC), Conakry (CKY)",
        "Afrique centrale (spécialité historique Brussels Airlines)": "Kinshasa (FIH), Bujumbura (BJM), Kigali (KGL), Yaoundé (NSI), Douala (DLA), Luanda (LAD)",
        "Afrique de l'Est (codeshare Ethiopian)": "Addis-Abeba (ADD), Nairobi (NBO via ADD)",
        "Afrique australe (codeshare)": "Johannesburg (JNB via FRA Lufthansa)",
        "Maghreb (TUI fly + correspondances)": "Casablanca (CMN), Marrakech (RAK), Agadir (AGA), Tunis (TUN), Djerba (DJE)",
        "Cap-Vert (TUI fly)": "Sal (SID), Boa Vista (BVC)",
    },
    "correspondance_ratee": "Brussels Airlines fait partie du groupe Lufthansa (Star Alliance), ce qui facilite les réacheminements en cas de correspondance ratée à BRU : transfert possible sur Lufthansa, Brussels, Austrian, Swiss, ou Eurowings. Sur billet unique, vous bénéficiez de la prise en charge complète : réacheminement gratuit, repas, hôtel. Le terminal correspondance à BRU est compact, facilitant les transits courts.",
    "conseils": [
        "<strong>Terminal A (vols hors Schengen)</strong> : la plupart des vols Brussels Airlines vers l'Afrique partent du terminal A. Terminal B pour les vols Schengen et certains vols européens.",
        "<strong>Transit court</strong> : MCT 1h00 est faisable à BRU grâce à la compacité de l'aéroport. Préférez 1h30 si possible.",
        "<strong>Brussels Airlines Pier A</strong> : nouvelle zone d'embarquement rénovée 2022, bons services correspondance.",
        "<strong>Bagages</strong> : Brussels Airlines a une franchise généreuse sur les routes Afrique (jusqu'à 2×23 kg en éco sur les longs-courriers).",
        "<strong>Lounges Star Alliance</strong> : accès via statut Miles & More Senator/HON ou cartes Star Gold.",
        "<strong>Eurostar/Thalys</strong> : si vous êtes à Paris, vous pouvez rejoindre Bruxelles en 1h20 et embarquer sur Brussels Airlines (option intéressante pour Kinshasa, Bujumbura, Kigali où Air France n'opère pas).",
    ],
    "ce261_summary": "Tous les vols au départ de BRU sont protégés par CE 261. Brussels Airlines étant compagnie EU, le retour vers Bruxelles est protégé partout. TUI fly Belgium étant aussi EU, idem. Pour les vols opérés par Royal Air Maroc, Turkish, Emirates, Qatar (au retour vers BRU), pas de protection CE 261. Privilégiez Brussels Airlines pour la diaspora Afrique centrale.",
    "faq": [
        {"q": "Brussels Airlines va-t-elle vraiment continuer à voler vers Kinshasa et Bujumbura ?", "a": "Oui, ces routes font partie de l'héritage historique Sabena que Brussels Airlines a maintenu et défendu. Kinshasa : 5-6 vols hebdo. Bujumbura : 3-4 vols hebdo (souvent en triangulation avec Kigali). Ces routes sont stratégiques pour le groupe Lufthansa qui les considère comme une 'specialité' européenne unique."},
        {"q": "Brussels Airlines va-t-elle vraiment être absorbée par Lufthansa ?", "a": "Le rapprochement opérationnel est déjà très avancé depuis 2017-2018. La fusion juridique complète est planifiée mais reste politiquement sensible en Belgique. Quoi qu'il arrive, le réseau Afrique sera maintenu (priorité stratégique du groupe Lufthansa)."},
        {"q": "Avantage Bruxelles vs Paris pour aller à Kinshasa ?", "a": "Bruxelles a un vol direct SN357 (6 fois/semaine) vs Paris qui passe par escale. Bruxelles est aussi historiquement plus à l'écoute de la communauté congolaise (équipages familiers, services à bord adaptés). Tarifs comparables. Connection facile depuis Paris via Thalys/Eurostar."},
        {"q": "Le retour Kinshasa-Bruxelles avec Brussels Airlines est-il protégé par CE 261 ?", "a": "Oui ! Brussels Airlines est compagnie EU (belge). Le règlement protège le vol même au départ d'un aéroport hors UE car la compagnie est EU. Sur un Kinshasa-Bruxelles retardé de 4h, vous avez droit à 600 € par passager."},
        {"q": "TUI fly et Brussels Airlines : deux compagnies belges, lesquelles choisir pour le Maroc ?", "a": "TUI fly est spécialisée charter/low-cost : tarifs souvent inférieurs, mais service à bord limité. Brussels Airlines plus complète (parfois Business Class disponible). Les deux protègent au titre du CE 261 (compagnies EU). Pour la diaspora marocaine occasionnelle, TUI fly est souvent plus avantageux."},
    ],
    "related": [
        {"href": "/blog/brussels-airlines-vol-retarde-indemnite.html", "label": "Brussels Airlines : vos droits complets"},
        {"href": "/blog/tui-fly-vol-retarde-indemnite.html", "label": "TUI fly Belgium : alternative low-cost"},
        {"href": "/blog/guide-correspondance-cdg-vers-afrique-ce261.html", "label": "Guide Paris CDG vers l'Afrique"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/asky-airlines-vol-retarde-indemnite.html", "label": "ASKY Airlines : codeshare BRU-Lomé"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : Folkerts"},
    ],
},

# 3. IST — Istanbul
{
    "slug": "guide-correspondance-ist-vers-afrique-ce261",
    "nom": "Istanbul",
    "code": "IST",
    "pays": "Turquie",
    "dans_ue": False,
    "compagnie_principale": "Turkish Airlines (plus grand réseau panafricain au monde)",
    "nb_destinations": "60+ destinations africaines via Turkish Airlines — le plus dense au monde",
    "mct": "1h00 (international-international) — souvent insuffisant",
    "ponctualite": "~76% (variable selon saisons)",
    "title": "Correspondances Istanbul IST vers l'Afrique : guide complet CE 261",
    "description": "Istanbul IST = hub Turkish Airlines, 60 destinations Afrique. CE 261 ne protège que l'aller depuis l'UE. Tout savoir avant de prendre Turkish vers l'Afrique.",
    "h1": "Guide complet des correspondances Istanbul IST vers l'Afrique (CE 261)",
    "quick_answer": "<strong>Istanbul (IST) est le hub avec le plus dense réseau Afrique au monde</strong> — Turkish Airlines dessert plus de 60 destinations africaines depuis Istanbul. <strong>Mais IST est hors UE et Turkish est non-européenne</strong>. Le CE 261 ne protège que les vols <strong>au départ d'un aéroport européen</strong> vers Istanbul (Paris → IST = couvert) ou <strong>l'ensemble du voyage en billet unique depuis l'UE</strong> (Paris → IST → Lagos = couvert sur toute la chaîne). Le retour Istanbul → UE n'est <strong>pas</strong> couvert.",
    "intro": "Istanbul est devenu en 10 ans le hub aérien le plus stratégique pour aller en Afrique. Turkish Airlines y dessert plus de 60 villes africaines — plus que toute autre compagnie au monde. Mais cette densité réseau s'accompagne d'une réalité juridique : Turkish étant turque (non-UE) et IST hors UE, la protection CE 261 obéit à des règles précises qu'il faut connaître pour éviter les déconvenues.",
    "compagnies": [
        {"nom": "Turkish Airlines", "code": "TK", "destinations": "60+ destinations Afrique — Lagos, Dakar, Abidjan, Nairobi, Le Caire, Casablanca, Le Cap, Johannesburg, etc.", "ce261": "✘ Non (non-EU)"},
        {"nom": "Pegasus Airlines", "code": "PC", "destinations": "Quelques destinations Afrique du Nord depuis Istanbul-Sabiha Gökçen (SAW)", "ce261": "✘ Non (non-EU)"},
    ],
    "destinations_par_categorie": {
        "Afrique de l'Ouest (Turkish Airlines depuis IST)": "Dakar (DKR), Abidjan (ABJ), Bamako (BKO), Ouagadougou (OUA), Niamey (NIM), Cotonou (COO), Lomé (LFW), Conakry (CKY), Accra (ACC), Lagos (LOS), Banjul (BJL), Praia (RAI)",
        "Afrique centrale": "Douala (DLA), Yaoundé (NSI), Libreville (LBV), Kinshasa (FIH), Pointe-Noire (PNR), Brazzaville (BZV), N'Djamena (NDJ), Bangui (BGF)",
        "Afrique de l'Est": "Nairobi (NBO), Addis-Abeba (ADD), Dar es Salaam (DAR), Kilimanjaro (JRO), Entebbe (EBB), Khartoum (KRT), Mogadiscio (MGQ), Djibouti (JIB), Hargeisa (HGA)",
        "Afrique australe": "Johannesburg (JNB), Le Cap (CPT), Maputo (MPM), Antananarivo (TNR), Maurice (MRU), Windhoek (WDH), Luanda (LAD), Lusaka (LUN), Harare (HRE)",
        "Maghreb et Afrique du Nord": "Casablanca (CMN), Marrakech (RAK), Tunis (TUN), Tripoli (TIP), Alger (ALG), Tanger (TNG), Le Caire (CAI), Alexandrie (HBE)",
    },
    "correspondance_ratee": "Le nouvel aéroport d'Istanbul (IST, ouvert 2018) est immense — comptez 30 à 45 minutes pour traverser entre certaines portes. Le MCT officiel de 1h00 est souvent insuffisant en pratique. Turkish Airlines est bien équipée pour gérer les correspondances ratées : prise en charge complète sur billet unique (réacheminement, repas, hôtel à l'hôtel de transit Tav Airport Hotel). Compagnie réactive aux dossiers CE 261 quand le vol part de l'UE.",
    "conseils": [
        "<strong>MCT recommandé : 2h00 minimum</strong> à IST (le 1h00 officiel est risqué). Préférez 3h pour les vols longs-courriers vers l'Afrique australe.",
        "<strong>Aéroport IST gigantesque</strong> : un des plus grands au monde. Marche fréquente entre portes (jusqu'à 1 km).",
        "<strong>Hôtel de transit gratuit Turkish</strong> : pour les correspondances >10h, Turkish Airlines offre un hôtel gratuit (TourIstanbul service).",
        "<strong>Visa transit gratuit</strong> pour la plupart des nationalités (UE, US, etc.) — vous pouvez sortir visiter Istanbul si correspondance longue.",
        "<strong>Bagages</strong> : franchise 1×30 kg en éco sur les vols Afrique (généreuse).",
        "<strong>Ne pas confondre IST (nouvel aéroport principal) et SAW (Sabiha Gökçen)</strong> : ce sont deux aéroports différents, à 60 km l'un de l'autre. Pegasus opère depuis SAW principalement.",
    ],
    "ce261_summary": "Sur un billet unique depuis l'UE (Paris→IST→Dakar par exemple), le CE 261 s'applique sur l'ensemble du voyage car le départ a lieu de l'UE. Turkish est responsable de l'indemnisation pour les vols partant de l'UE. <strong>Le retour Dakar→IST→Paris n'est pas couvert par le CE 261</strong> (départ hors UE + compagnie non-UE). Pour la protection au retour, choisir Air France direct ou alliance via une compagnie EU.",
    "faq": [
        {"q": "Pourquoi Turkish Airlines est-elle si dominante en Afrique ?", "a": "Stratégie offensive depuis 2010 du gouvernement turc et de Turkish Airlines pour devenir le 'pont aérien' Europe-Afrique. Tarifs très agressifs, marketing fort dans la diaspora, vols longs-courriers en triangulation (CDG-IST-LOS-ABJ-IST par exemple) qui optimisent les rotations. Aujourd'hui plus de 60 destinations Afrique, contre 35 pour Air France."},
        {"q": "Si je prends Turkish Paris-IST-Lagos en billet unique et que mon vol Paris-IST est retardé, à qui je réclame ?", "a": "À Turkish Airlines. Vol part de l'UE → CE 261 s'applique sur l'ensemble. Distance Paris-Lagos (orthodromique) = 4 869 km → palier 600 €. Si retard à l'arrivée à Lagos > 3h : 600 € par passager dus par Turkish."},
        {"q": "Le retour Lagos-Istanbul-Paris avec Turkish est-il protégé ?", "a": "Non. Vol part hors UE (Lagos) + compagnie non-UE (Turkish). Aucune des deux conditions du CE 261 n'est remplie. Pour le retour protégé : Air France direct, ou code-share Lufthansa/Brussels via leurs hubs européens."},
        {"q": "Turkish a une réputation de retards. Vrai ou faux ?", "a": "Ponctualité moyenne ~76% (correct mais pas excellent). Les retards sont plus fréquents sur les vols Afrique en raison des aléas (météo locale, gestion des aéroports africains, congestion IST). Toujours prévoir une marge confortable de correspondance."},
        {"q": "Turkish me propose un avoir. Suis-je obligé ?", "a": "Non. CE 261 art. 7.3 : indemnité en cash (virement, chèque) par défaut. L'avoir nécessite votre accord écrit. Si vous préférez le cash, refusez fermement et exigez le virement bancaire."},
    ],
    "related": [
        {"href": "/blog/turkish-airlines-vol-retarde-indemnite.html", "label": "Turkish Airlines : vos droits détaillés"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/guide-correspondance-dxb-doh-vers-afrique-ce261.html", "label": "Guide Dubaï/Doha : alternatives Golfe"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
        {"href": "/blog/billet-unique-vs-billets-separes-ce261-correspondance.html", "label": "Billet unique vs séparé"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : Folkerts"},
    ],
},

# 4. CAS — Casablanca
{
    "slug": "guide-correspondance-cas-vers-afrique-ce261",
    "nom": "Casablanca-Mohammed V",
    "code": "CMN",
    "pays": "Maroc",
    "dans_ue": False,
    "compagnie_principale": "Royal Air Maroc (Oneworld)",
    "nb_destinations": "~30 destinations africaines via Royal Air Maroc",
    "mct": "1h30 (international-international)",
    "ponctualite": "~70%",
    "title": "Correspondances Casablanca CMN vers l'Afrique : guide complet CE 261",
    "description": "Casablanca CMN est le hub Royal Air Maroc vers WAF et CAF. CE 261 protège l'aller depuis l'UE. Réseau, MCT, droits expliqués pour la diaspora.",
    "h1": "Guide complet des correspondances Casablanca CMN vers l'Afrique (CE 261)",
    "quick_answer": "<strong>Casablanca-Mohammed V (CMN) est le hub principal de Royal Air Maroc vers l'Afrique de l'Ouest et centrale</strong>. Membre Oneworld, RAM offre ~30 destinations africaines depuis CMN. <strong>CMN est hors UE et RAM est non-EU</strong> : CE 261 protège seulement les vols au départ d'un aéroport européen vers CMN, ou l'ensemble du voyage en billet unique depuis l'UE. Le retour vers l'UE n'est pas couvert.",
    "intro": "Casablanca est le hub historique de Royal Air Maroc et la principale plateforme aérienne du Maghreb pour aller en Afrique de l'Ouest et centrale. Souvent moins cher qu'Air France pour la diaspora WAF, RAM est aussi appréciée pour sa franchise bagages généreuse. Mais sa nationalité non-UE limite la protection CE 261 sur le retour vers l'Europe.",
    "compagnies": [
        {"nom": "Royal Air Maroc", "code": "AT", "destinations": "~30 destinations Afrique (Sénégal, Côte d'Ivoire, Mali, Guinée, Burkina, Niger, Bénin, Togo, Ghana, Nigeria, Cameroun, Gabon, RDC, Tchad, Mauritanie, etc.)", "ce261": "✘ Non (non-EU)"},
        {"nom": "Air Arabia Maroc", "code": "3O", "destinations": "Vols low-cost régionaux Maghreb + quelques routes WAF", "ce261": "✘ Non (non-EU)"},
    ],
    "destinations_par_categorie": {
        "Afrique de l'Ouest (Royal Air Maroc — réseau dense)": "Dakar (DKR), Abidjan (ABJ), Bamako (BKO), Ouagadougou (OUA), Niamey (NIM), Cotonou (COO), Lomé (LFW), Accra (ACC), Conakry (CKY), Freetown (FNA), Monrovia (ROB), Nouakchott (NKC), Banjul (BJL), Lagos (LOS), Abuja (ABV), Praia (RAI), Sao Tomé (TMS)",
        "Afrique centrale (Royal Air Maroc)": "Douala (DLA), Yaoundé (NSI), Libreville (LBV), Brazzaville (BZV), Kinshasa (FIH), Pointe-Noire (PNR), Bangui (BGF), N'Djamena (NDJ), Malabo (SSG)",
        "Afrique de l'Est (RAM, expansion récente)": "Nairobi (NBO), Addis-Abeba (ADD), Dar es Salaam (DAR via NBO), Le Caire (CAI)",
        "Afrique australe (RAM, vols saisonniers)": "Johannesburg (JNB), Le Cap (CPT en saison)",
        "Maghreb (vols intérieurs et régionaux)": "Tunis (TUN), Alger (ALG), Tripoli (TIP), Marrakech (RAK), Tanger (TNG), Agadir (AGA), Fès (FEZ), Oujda (OUD), Nador (NDR)",
    },
    "correspondance_ratee": "Le terminal 1 international à CMN a été modernisé (2019). En cas de correspondance ratée sur billet unique RAM, vous avez droit à la prise en charge complète (réacheminement, repas, hôtel). Service client RAM moins réactif que les compagnies européennes — privilégier les démarches écrites tracées. Si votre vol part de l'UE (Paris-Casablanca par exemple) et que vous ratez la correspondance vers WAF, la responsabilité reste sur RAM au titre du CE 261.",
    "conseils": [
        "<strong>MCT 1h30 à CMN</strong> est faisable mais serré. Préférez 2h-2h30 pour confort.",
        "<strong>Visa transit non requis</strong> pour la plupart des nationalités UE/Schengen en transit aérien à CMN.",
        "<strong>Salon RAM</strong> accessible avec carte Oneworld Sapphire/Emerald, ou statut RAM Cristal/Gold/Platinum.",
        "<strong>Hôtel de transit (Atlas Sky Hotel)</strong> à CMN pour les correspondances longues.",
        "<strong>Bagages très généreux</strong> : 2×23 kg en éco sur vols intercontinentaux (avantage notable pour la diaspora).",
        "<strong>Code-share Oneworld</strong> avec British Airways, Iberia, Qatar Airways — vos miles peuvent fonctionner chez ces compagnies.",
        "<strong>Évitez les vols nocturnes Casablanca-WAF</strong> en saison des pluies (juin-octobre) : retards fréquents à cause des conditions météo en Afrique de l'Ouest.",
    ],
    "ce261_summary": "Sur un billet unique Paris-Casablanca-Dakar avec RAM, le CE 261 s'applique sur l'ensemble : départ depuis l'UE. Indemnité = 600 € par passager si retard >3h à Dakar. <strong>Retour Dakar-Casablanca-Paris avec RAM = non protégé</strong> (vol part hors UE, compagnie non-UE). Pour le retour protégé, alternatives : Air France direct (Dakar-Paris ou Abidjan-Paris), Brussels Airlines, Iberia, TAP, ou code-share AF/KLM.",
    "faq": [
        {"q": "Pourquoi tant de passagers diaspora WAF choisissent RAM ?", "a": "Trois raisons : (1) tarifs souvent inférieurs de 20-30% par rapport à Air France direct sur Paris-Dakar, Paris-Abidjan, Paris-Bamako, (2) franchise bagages généreuse (2×23 kg en éco — Air France n'en autorise qu'un seul), (3) réseau régional WAF très dense depuis CMN."},
        {"q": "Le retour Casablanca-Paris avec RAM est-il vraiment non protégé ?", "a": "Oui. CMN est hors UE et RAM est non-UE. Aucune des deux conditions du CE 261 n'est remplie. Pour Casablanca-Paris protégé : Air France (vol direct), Transavia, ou Iberia (via Madrid)."},
        {"q": "RAM est membre Oneworld — quel intérêt ?", "a": "Cumul de miles British Airways Avios, Iberia Plus, Qatar Privilege Club, etc. Salons Oneworld accessibles avec statut. Mais l'alliance ne change rien à la protection CE 261, qui dépend de la nationalité de la compagnie (non-EU)."},
        {"q": "Vol RAM Paris-Casablanca retardé : RAM doit-elle payer ?", "a": "Oui. Vol au départ d'un aéroport UE (CDG) → CE 261 s'applique (art. 3.1.a). Distance CDG-CMN = 1 869 km → palier 400 €. Si retard >3h à CMN : 400 € par passager."},
        {"q": "Mon vol Paris-Casablanca-Bamako a été annulé, RAM me propose un vol le surlendemain. Mes droits ?", "a": "RAM doit (1) vous loger et nourrir gratuitement pendant l'attente, (2) vous proposer un réacheminement aussi rapide que possible (y compris sur une autre compagnie si elle n'a pas de disponibilité rapide), (3) vous verser une indemnité forfaitaire CE 261 art. 7. Distance Paris-Bamako = 4 480 km > 3 500 km → 600 € par passager (sauf si vol initialement annulé > 14 jours avant départ avec notification)."},
    ],
    "related": [
        {"href": "/blog/royal-air-maroc-vol-retarde-indemnite.html", "label": "Royal Air Maroc : vos droits détaillés"},
        {"href": "/blog/vol-retarde-casablanca-paris-indemnite.html", "label": "Vol Casablanca-Paris retardé"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/guide-correspondance-cdg-vers-afrique-ce261.html", "label": "Guide Paris CDG vers l'Afrique"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
        {"href": "/blog/billet-unique-vs-billets-separes-ce261-correspondance.html", "label": "Billet unique vs séparé"},
    ],
},

# 5. LIS — Lisbonne
{
    "slug": "guide-correspondance-lis-vers-afrique-ce261",
    "nom": "Lisbonne-Humberto Delgado",
    "code": "LIS",
    "pays": "Portugal",
    "dans_ue": True,
    "compagnie_principale": "TAP Air Portugal (Star Alliance)",
    "nb_destinations": "~15 destinations africaines via TAP, spécialiste lusophone",
    "mct": "0h45 (Schengen), 1h00 (international)",
    "ponctualite": "~68% (problèmes opérationnels récurrents 2022-2024)",
    "title": "Correspondances Lisbonne LIS vers l'Afrique : guide complet CE 261",
    "description": "TAP Air Portugal depuis Lisbonne dessert l'Afrique lusophone (Cabo Verde, Angola, Mozambique, Guinée-Bissau) + WAF. CE 261 protège aller + retour. Guide complet.",
    "h1": "Guide complet des correspondances Lisbonne LIS vers l'Afrique (CE 261)",
    "quick_answer": "<strong>Lisbonne (LIS) est le hub historique de l'Afrique lusophone</strong> (Cabo Verde, Angola, Mozambique, Guinée-Bissau, São Tomé) grâce à TAP Air Portugal. <strong>TAP étant compagnie EU et LIS étant en UE, le CE 261 protège TOTALEMENT aller et retour</strong>. Inconvénient : la ponctualité de TAP est faible (~68%), conséquence de difficultés opérationnelles récurrentes depuis 2022.",
    "intro": "Lisbonne est l'aéroport européen avec la connectivité unique vers l'Afrique lusophone (Portugal historique). TAP Air Portugal y est l'opérateur quasi-monopole sur les routes vers Cabo Verde, Angola, Mozambique, Guinée-Bissau et São Tomé. C'est aussi un hub secondaire pour le Sénégal, le Maroc, et le Brésil. La protection CE 261 totale (compagnie EU) est un avantage majeur, à peser contre la ponctualité plus faible de TAP comparée à Air France ou Lufthansa.",
    "compagnies": [
        {"nom": "TAP Air Portugal", "code": "TP", "destinations": "Quasi-monopole sur Afrique lusophone + 5 destinations WAF", "ce261": "✔ Oui (compagnie EU)"},
        {"nom": "Royal Air Maroc", "code": "AT", "destinations": "Casablanca + correspondances WAF", "ce261": "✘ Non (non-EU)"},
        {"nom": "Cabo Verde Airlines", "code": "VR", "destinations": "Sal, Praia (en cours de restructuration)", "ce261": "✘ Non (non-EU)"},
        {"nom": "Eurowings", "code": "EW", "destinations": "Vols intra-UE + quelques correspondances limitées", "ce261": "✔ Oui (compagnie EU)"},
    ],
    "destinations_par_categorie": {
        "Afrique lusophone (TAP — spécialité historique)": "Cabo Verde (Praia RAI, Sal SID, Boa Vista BVC, São Vicente VXE), Angola (Luanda LAD), Mozambique (Maputo MPM), Guinée-Bissau (Bissau OXB), São Tomé (TMS)",
        "Afrique de l'Ouest (TAP)": "Dakar (DKR), Accra (ACC), Lagos (LOS), Abidjan (ABJ), Banjul (BJL)",
        "Afrique du Nord (TAP)": "Casablanca (CMN), Marrakech (RAK), Tunis (TUN)",
        "Afrique de l'Est (codeshare TAP via partenaires)": "Limited (pas de vol direct depuis LIS, correspondances via FRA, AMS ou ADD)",
        "Brésil (connexion stratégique pour Africains lusophones)": "São Paulo (GRU), Rio de Janeiro (GIG), Recife (REC), Salvador (SSA), Fortaleza (FOR) — utile pour la diaspora Afrique-Brésil",
    },
    "correspondance_ratee": "TAP a un service correspondance correct à LIS mais les retards fréquents (~32% de vols retardés) entraînent beaucoup de correspondances ratées. En cas d'incident, TAP doit (sur billet unique) : réacheminer gratuitement, fournir repas et hôtel si nécessaire, verser l'indemnité CE 261. TAP est connue pour contester souvent les demandes CE 261 — préparer un dossier solide.",
    "conseils": [
        "<strong>MCT 1h00 à LIS</strong> est très serré en pratique — préférez 2h.",
        "<strong>Aéroport LIS petit et compact</strong> : facile à naviguer, mais saturation fréquente en haute saison.",
        "<strong>Évitez les vols TAP en heure de pointe (matin et fin d'après-midi)</strong> : retards plus fréquents.",
        "<strong>Hôtels de transit à LIS</strong> : peu d'options sur place, prévoyez si vous ratez la correspondance et que TAP doit vous loger en ville.",
        "<strong>Star Alliance</strong> : codeshare Lufthansa, Brussels Airlines, Swiss, Air China, Singapore. Vos miles Miles & More fonctionnent.",
        "<strong>Bagages</strong> : franchise correcte (1×23 kg en éco), mais TAP applique strictement les limites de taille — soyez précis.",
    ],
    "ce261_summary": "TAP étant compagnie EU et LIS étant dans l'UE, <strong>la protection CE 261 est totale</strong> aller et retour, partout où TAP vole. C'est l'avantage majeur de Lisbonne pour la diaspora lusophone. Inconvénient : TAP a un taux de litiges CE 261 élevé en raison de ses problèmes opérationnels. Bien documenter, persévérer, et utiliser les recours médiation (Provedor do Cliente TAP) et tribunal de proximité.",
    "faq": [
        {"q": "TAP Air Portugal protège-t-elle vraiment le retour depuis Luanda ou Maputo ?", "a": "Oui, totalement. TAP est compagnie EU portugaise, donc CE 261 art. 3.1.b s'applique : compagnie EU à l'arrivée dans l'UE. Sur un Luanda-Lisbonne retardé de 4h, vous avez droit à 600 €. C'est un avantage majeur de TAP pour la diaspora lusophone."},
        {"q": "Pourquoi TAP est-elle si peu ponctuelle ?", "a": "Conjonction de plusieurs facteurs : crise post-COVID, restructuration financière difficile (compagnie partiellement renationalisée), flotte vieillissante, conflits sociaux récurrents avec les pilotes et personnels. Le gouvernement portugais cherche à privatiser TAP en 2025-2026 — peut améliorer la situation."},
        {"q": "TAP est-elle l'unique option pour aller à Cabo Verde, Bissau ou São Tomé depuis l'Europe ?", "a": "Pour le Cabo Verde : Cabo Verde Airlines (en restructuration, peu fiable), TUI fly Belgium (vols charter saisonniers vers Sal et Boa Vista depuis Bruxelles et Paris), Royal Air Maroc (via Casablanca). Pour Bissau et São Tomé : TAP est quasi monopole, l'alternative est passer par Casablanca avec RAM."},
        {"q": "TAP refuse l'indemnité en disant que la cause est 'technique mais sans danger'. Valable ?", "a": "Non. Selon l'arrêt <a href=\"https://curia.europa.eu/juris/document/document.jsf?docid=70689&doclang=FR\" target=\"_blank\" rel=\"noopener external\">CJUE Wallentin-Hermann C-549/07</a>, une panne technique standard (même mineure ou réparée rapidement) <strong>n'est pas</strong> une circonstance extraordinaire. Seule une panne due à une cause externe (collision oiseau, vice de fabrication caché) peut être considérée comme extraordinaire."},
        {"q": "Comment réclamer à TAP ?", "a": "Formulaire en ligne sur flytap.com (rubrique 'Customer Care → Compensation EU 261'). Délai de traitement long (90-180 jours). En cas de refus, deux recours efficaces : Provedor do Cliente TAP (médiateur interne, semi-indépendant), et tribunal de proximité (compétence territoriale aéroport départ ou domicile)."},
    ],
    "related": [
        {"href": "/blog/tap-air-portugal-vol-retarde-indemnite.html", "label": "TAP Air Portugal : vos droits détaillés"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/guide-correspondance-cdg-vers-afrique-ce261.html", "label": "Guide Paris CDG vers l'Afrique"},
        {"href": "/blog/guide-correspondance-cas-vers-afrique-ce261.html", "label": "Guide Casablanca CMN : alternative WAF"},
        {"href": "/blog/circonstances-extraordinaires-ce261.html", "label": "Circonstances extraordinaires"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : Folkerts"},
    ],
},

# 6. DXB/DOH — Dubaï et Doha
{
    "slug": "guide-correspondance-dxb-doh-vers-afrique-ce261",
    "nom": "Dubaï (DXB) et Doha (DOH)",
    "code": "DXB / DOH",
    "pays": "Émirats arabes unis / Qatar",
    "dans_ue": False,
    "compagnie_principale": "Emirates (DXB) et Qatar Airways (DOH)",
    "nb_destinations": "~25 destinations Afrique via DXB (Emirates) + ~28 via DOH (Qatar)",
    "mct": "1h00 à DXB, 0h45 à DOH (Hamad International)",
    "ponctualite": "DXB ~80%, DOH ~85% (Qatar parmi les plus ponctuels au monde)",
    "title": "Correspondances Dubaï DXB et Doha DOH vers l'Afrique : guide CE 261",
    "description": "Hubs du Golfe (DXB Emirates, DOH Qatar) vers l'Afrique : ponctualité excellente, mais retour non protégé par CE 261. Comparatif et conseils complets.",
    "h1": "Guide complet des correspondances Dubaï DXB et Doha DOH vers l'Afrique (CE 261)",
    "quick_answer": "<strong>Dubaï (DXB, hub Emirates) et Doha (DOH, hub Qatar Airways)</strong> sont les deux hubs du Golfe les plus utilisés pour aller en Afrique. Ponctualité excellente (80-85%), aéroports modernes, tarifs souvent compétitifs. <strong>Mais ces deux hubs sont hors UE et leurs compagnies sont non-européennes</strong> : le CE 261 protège seulement les vols au départ d'un aéroport européen vers DXB/DOH, ou l'ensemble du voyage sur billet unique depuis l'UE. Le retour vers l'UE n'est pas couvert.",
    "intro": "Dubaï et Doha sont devenus en 15 ans les principaux hubs aériens du monde grâce à Emirates et Qatar Airways. Pour aller en Afrique de l'Est, australe ou centrale depuis l'Europe, ces deux options offrent souvent les meilleurs tarifs, la meilleure ponctualité et la meilleure qualité de service. Mais le revers de la médaille est juridique : nationalité non-UE des compagnies = pas de protection CE 261 au retour vers l'Europe.",
    "compagnies": [
        {"nom": "Emirates", "code": "EK", "destinations": "~25 destinations Afrique depuis DXB", "ce261": "✘ Non (non-EU)"},
        {"nom": "Qatar Airways", "code": "QR", "destinations": "~28 destinations Afrique depuis DOH (Oneworld)", "ce261": "✘ Non (non-EU)"},
        {"nom": "FlyDubai", "code": "FZ", "destinations": "Vols low-cost EAF depuis DXB (filiale Emirates)", "ce261": "✘ Non (non-EU)"},
        {"nom": "Etihad Airways", "code": "EY", "destinations": "Concurrent voisin (hub Abu Dhabi AUH, ~10 destinations Afrique)", "ce261": "✘ Non (non-EU)"},
    ],
    "destinations_par_categorie": {
        "Depuis DXB (Emirates)": "Nairobi (NBO), Addis-Abeba (ADD), Lagos (LOS), Le Caire (CAI), Johannesburg (JNB), Le Cap (CPT), Durban (DUR), Lusaka (LUN), Harare (HRE), Dar es Salaam (DAR), Entebbe (EBB), Accra (ACC), Abidjan (ABJ), Conakry (CKY), Casablanca (CMN), Tunis (TUN), Alger (ALG), Khartoum (KRT), Maputo (MPM), Luanda (LAD), Maurice (MRU), Seychelles (SEZ)",
        "Depuis DOH (Qatar Airways)": "Johannesburg (JNB), Le Cap (CPT), Durban (DUR), Nairobi (NBO), Addis-Abeba (ADD), Dar es Salaam (DAR), Entebbe (EBB), Lagos (LOS), Abuja (ABV), Accra (ACC), Abidjan (ABJ), Le Caire (CAI), Tunis (TUN), Casablanca (CMN), Lusaka (LUN), Harare (HRE), Maputo (MPM), Kigali (KGL), Mombasa (MBA), Antananarivo (TNR), Khartoum (KRT), Djibouti (JIB), Dakar (DKR), Windhoek (WDH), Luanda (LAD), Zanzibar (ZNZ)",
        "Avantage spécifique DXB": "Plus de fréquences quotidiennes vers JNB, NBO, ADD. Hub mature, taille immense.",
        "Avantage spécifique DOH": "Meilleure ponctualité (85% vs 80%). Vols souvent un peu moins chers en éco. Hamad International (DOH) régulièrement classé meilleur aéroport mondial.",
    },
    "correspondance_ratee": "Les deux hubs sont parmi les meilleurs au monde pour gérer les correspondances ratées. Emirates dispose d'hôtels de transit gratuits pour les passagers Connect, Qatar Airways offre 'Stopover Programme' avec hôtel + repas gratuits si correspondance > 12h. Sur billet unique au départ de l'UE, la compagnie reste responsable au titre du CE 261. Les services réclamations sont réactifs et bien organisés, mais la barre de preuve est élevée (Qatar conteste souvent les cas borderline).",
    "conseils": [
        "<strong>MCT recommandé : 2h à DXB</strong> (aéroport très grand), <strong>1h30 à DOH</strong> (plus compact).",
        "<strong>DOH Hamad International</strong> : régulièrement classé meilleur aéroport mondial — services premium, salons généreux.",
        "<strong>Hôtels de transit</strong> : Dubai Airport Hotel (DXB), Oryx Airport Hotel (DOH) — option chambre jour disponible si longue correspondance.",
        "<strong>Bagages</strong> : Emirates 30 kg en éco, Qatar 30 kg en éco — généreux pour la diaspora.",
        "<strong>Visa transit gratuit</strong> pour la plupart des nationalités UE en transit aérien à DXB et DOH.",
        "<strong>Membre Oneworld pour Qatar</strong> : cumul de miles avec British Airways, Iberia, RAM, etc. Emirates n'est dans aucune alliance majeure (mais partenariats Qantas, JetBlue).",
        "<strong>Évitez les départs UE en hiver à DXB</strong> : risque de retard à cause du brouillard saisonnier (novembre-février).",
    ],
    "ce261_summary": "Pour un billet unique Paris-Dubaï-Nairobi (Emirates) ou Paris-Doha-Johannesburg (Qatar), le CE 261 s'applique sur l'ensemble du voyage car le départ a lieu de l'UE. Indemnité due par la compagnie selon distance totale (orthodromique). <strong>Au retour, vol partant hors UE avec compagnie non-UE = pas de protection CE 261</strong>. Pour la diaspora qui voyage fréquemment Europe-Afrique, c'est un arbitrage à faire entre tarif (souvent meilleur via le Golfe) et protection juridique (meilleure avec Air France, KLM, Brussels Airlines).",
    "faq": [
        {"q": "Emirates ou Qatar : lequel choisir pour aller à Nairobi ?", "a": "Emirates a plus de fréquences (3 vols/jour DXB-NBO) et un hub DXB plus mature. Qatar a une meilleure ponctualité (85% vs 80%), un aéroport DOH régulièrement classé meilleur mondial, et est membre Oneworld (cumul miles British Airways/Iberia). Niveau juridique : équivalent (les deux non-UE)."},
        {"q": "Le retour Le Cap-Doha-Paris avec Qatar Airways est-il protégé ?", "a": "Non. Vol part hors UE (Le Cap) avec compagnie non-UE (Qatar). Aucune des deux conditions du CE 261 n'est remplie. Pour le retour Le Cap protégé : Air France direct (vol AF995), KLM via Amsterdam, Lufthansa via Francfort."},
        {"q": "Quelle est l'alternative aux hubs du Golfe pour la diaspora EAF/SAF ?", "a": "Pour la protection juridique : Air France (CDG-Johannesburg/Nairobi), KLM (AMS-Nairobi/Dar es Salaam), Lufthansa (FRA-JNB/CPT). Ces options sont parfois 100-300 € plus chères que Qatar/Emirates, mais protègent aller-retour. Pour les voyageurs fréquents, le surcoût se rentabilise à la première indemnisation CE 261 perçue au retour."},
        {"q": "Emirates et Qatar Airways sont-elles vraiment plus fiables que les compagnies européennes ?", "a": "Statistiquement oui. Qatar Airways est régulièrement n°1 mondial en ponctualité (~85% on-time, source OAG). Emirates est ~80%. Air France ~74%, Lufthansa ~78%, KLM ~82%. Mais la fiabilité peut varier selon les saisons et la flotte utilisée. Vérifiez l'historique de votre vol précis sur FlightRadar24 ou FlightAware."},
        {"q": "Pourquoi Etihad (Abu Dhabi AUH) est moins utilisée qu'Emirates et Qatar pour l'Afrique ?", "a": "Etihad a connu une crise stratégique 2018-2020 (échec investissement Alitalia, Airberlin). Son réseau Afrique est plus limité (~10 destinations) face à Emirates (25) et Qatar (28). Pour la diaspora, c'est rarement le meilleur choix sauf tarifs ponctuels exceptionnels."},
    ],
    "related": [
        {"href": "/blog/emirates-vol-retarde-indemnite.html", "label": "Emirates : vos droits détaillés"},
        {"href": "/blog/qatar-airways-vol-retarde-indemnite.html", "label": "Qatar Airways : vos droits détaillés"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/guide-correspondance-ist-vers-afrique-ce261.html", "label": "Guide Istanbul IST : alternative non-UE"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : Folkerts"},
    ],
},
]

# 7. ADD — Addis-Abeba
HUBS.append({
    "slug": "guide-correspondance-add-vers-afrique-ce261",
    "nom": "Addis-Abeba-Bole",
    "code": "ADD",
    "pays": "Éthiopie",
    "dans_ue": False,
    "compagnie_principale": "Ethiopian Airlines (Star Alliance — plus grand réseau intra-africain au monde)",
    "nb_destinations": "60+ destinations africaines via Ethiopian Airlines — le plus dense au monde sur le continent",
    "mct": "1h00 (international-international) — souvent juste, prévoir 1h30",
    "ponctualite": "~78% (correct pour un hub africain)",
    "title": "Correspondances Addis-Abeba ADD vers l'Afrique : guide complet CE 261",
    "description": "Addis-Abeba ADD = hub Ethiopian Airlines, plus grand réseau intra-africain au monde (60+ destinations). CE 261 protège l'aller depuis l'UE. Guide complet.",
    "h1": "Guide complet des correspondances Addis-Abeba ADD vers l'Afrique (CE 261)",
    "quick_answer": "<strong>Addis-Abeba (ADD) est le hub d'Ethiopian Airlines, qui dispose du plus grand réseau intra-africain au monde</strong> (60+ destinations sur le continent, plus que n'importe quelle autre compagnie). <strong>Mais ADD est hors UE et Ethiopian Airlines est non-européenne</strong>. Le CE 261 ne protège que les vols au départ d'un aéroport européen vers ADD, ou l'ensemble du voyage sur billet unique depuis l'UE. Le retour Addis-Abeba → UE n'est pas couvert. Ethiopian est membre Star Alliance.",
    "intro": "Addis-Abeba est devenue en 20 ans le hub aérien le plus stratégique pour aller à l'intérieur de l'Afrique. Ethiopian Airlines (ET, code IATA, Star Alliance) y dessert plus de 60 destinations africaines — bien davantage que ses concurrents Emirates, Qatar ou Turkish. Pour aller dans des destinations africaines secondaires (Asmara, Hargeisa, Juba, Kigali, Goma, Antsiranana, etc.), Addis-Abeba est souvent l'unique hub viable. Mais sa nationalité non-UE limite la protection CE 261 au retour.",
    "compagnies": [
        {"nom": "Ethiopian Airlines", "code": "ET", "destinations": "60+ destinations Afrique (le plus dense réseau panafricain au monde)", "ce261": "✘ Non (non-EU)"},
        {"nom": "ASKY Airlines", "code": "KP", "destinations": "Partenaire Ethiopian — code-share intense vers WAF/CAF via Lomé", "ce261": "✘ Non (non-EU)"},
        {"nom": "Brussels Airlines (codeshare ET)", "code": "SN", "destinations": "Code-share Bruxelles-Addis + correspondances Ethiopian", "ce261": "✔ Oui (Brussels Airlines = EU, sur segment SN opéré)"},
        {"nom": "Lufthansa (codeshare ET)", "code": "LH", "destinations": "Code-share Francfort-Addis + correspondances", "ce261": "✔ Oui (Lufthansa = EU, sur segment LH opéré)"},
    ],
    "destinations_par_categorie": {
        "Afrique de l'Est (cœur du réseau Ethiopian)": "Nairobi (NBO), Dar es Salaam (DAR), Kilimanjaro (JRO), Mombasa (MBA), Entebbe (EBB), Kigali (KGL), Bujumbura (BJM), Khartoum (KRT), Juba (JUB), Asmara (ASM), Hargeisa (HGA), Mogadiscio (MGQ), Djibouti (JIB), Zanzibar (ZNZ), Comores (HAH), Antsiranana (DIE), Antananarivo (TNR), Madagascar (TNR/NOS)",
        "Afrique de l'Ouest (Ethiopian + ASKY codeshare)": "Lagos (LOS), Accra (ACC), Abidjan (ABJ), Bamako (BKO), Ouagadougou (OUA), Niamey (NIM), Cotonou (COO), Lomé (LFW via ASKY), Conakry (CKY), Dakar (DKR), Banjul (BJL), Praia (RAI), Monrovia (ROB)",
        "Afrique centrale": "Douala (DLA), Yaoundé (NSI), Libreville (LBV), Brazzaville (BZV), Kinshasa (FIH), Pointe-Noire (PNR), Bangui (BGF), N'Djamena (NDJ), Malabo (SSG)",
        "Afrique australe": "Johannesburg (JNB), Le Cap (CPT), Maputo (MPM), Lusaka (LUN), Harare (HRE), Windhoek (WDH), Luanda (LAD), Maurice (MRU), Victoria Falls (VFA)",
        "Maghreb et Afrique du Nord (Ethiopian)": "Le Caire (CAI), Khartoum (KRT), Tripoli (TIP)",
    },
    "correspondance_ratee": "L'aéroport de Bole (ADD) a été modernisé en 2019 (nouveau terminal 2 capable de gérer 22M passagers/an). Le hub Ethiopian est bien organisé pour les correspondances, avec un système 'StarBucks' (Star Alliance Customer Service) pour les passagers en transit. En cas de correspondance ratée sur billet unique, Ethiopian doit organiser le réacheminement, les repas et l'hôtel si nécessaire. La compagnie est connue pour gérer assez bien les imprévus opérationnels (héritage culturel d'une compagnie africaine ayant grandi avec un secteur difficile).",
    "conseils": [
        "<strong>MCT recommandé : 1h30 à ADD</strong> (le 1h00 officiel est trop court).",
        "<strong>Terminal 2 (T2)</strong> : nouveau terminal international ouvert 2019, bien équipé.",
        "<strong>Visa transit gratuit</strong> pour la plupart des nationalités UE en transit aérien à Addis-Abeba (vérifier avant départ).",
        "<strong>Hôtel de transit Sheraton Addis ou Skylight Hotel</strong> à 10 min de l'aéroport pour les correspondances longues.",
        "<strong>Star Alliance</strong> : code-share Lufthansa, Brussels Airlines, Swiss, Austrian, Singapore Airlines, etc. Vos miles Miles & More, Singapore KrisFlyer fonctionnent.",
        "<strong>Bagages</strong> : franchise 2×23 kg en éco sur les vols intercontinentaux (généreuse, comme RAM).",
        "<strong>Évitez les vols Addis-WAF en saison des pluies</strong> (juin-octobre) : retards fréquents.",
        "<strong>Service à bord</strong> : repas correct, vins éthiopiens à goûter, équipage souvent multilingue (français/anglais/arabe).",
    ],
    "ce261_summary": "Sur un billet unique Paris-Addis-Nairobi avec Ethiopian (ou code-share Brussels Airlines/Lufthansa pour le segment UE), le CE 261 s'applique car le départ a lieu de l'UE. La responsabilité repose sur le transporteur opérant du segment retardé. <strong>Le retour Nairobi-Addis-Paris avec Ethiopian = non protégé</strong> (vol part hors UE, compagnie non-UE). Pour la protection au retour, alternatives : Air France direct depuis JNB/NBO, KLM via AMS, Lufthansa via FRA. Si vous voyagez vers une destination secondaire (Asmara, Hargeisa, Juba, Antananarivo, etc.) où il n'existe pas d'alternative européenne directe, Ethiopian reste souvent le seul choix.",
    "faq": [
        {"q": "Pourquoi Ethiopian Airlines est si dominante en Afrique ?", "a": "Trois raisons : (1) Plus ancienne compagnie aérienne d'Afrique (1945), réseau historique dense, (2) Stratégie offensive 2010-2020 sous le PDG Tewolde GebreMariam (vision 2025 : devenir le hub n°1 d'Afrique), (3) Aéroport de Bole modernisé et bien situé géographiquement entre l'Europe et l'Afrique australe. Aujourd'hui, Ethiopian dessert plus de villes en Afrique que toutes les autres compagnies réunies."},
        {"q": "Mon billet Paris-Addis-Nairobi est opéré par Lufthansa pour Paris-Addis et Ethiopian pour Addis-Nairobi. Si le vol Lufthansa est retardé, à qui je réclame ?", "a": "À Lufthansa, transporteur opérant du segment retardé. Sur billet unique en code-share Star Alliance, l'indemnité se calcule sur la distance totale Paris-Nairobi = 6 484 km → 600 € par passager. Lufthansa étant compagnie EU, votre dossier sera traité dans les standards européens (plus rapide que via Ethiopian)."},
        {"q": "Le retour Addis-Paris avec Ethiopian est-il protégé par CE 261 ?", "a": "Non. Ethiopian est non-européenne et le vol part hors UE. Pour le retour protégé : Lufthansa direct FRA-ADD-FRA, Air France via une combinaison plus complexe, ou Brussels Airlines direct BRU-ADD. Vérifiez bien que le segment Addis-UE est opéré par la compagnie EU et non par Ethiopian en code-share."},
        {"q": "Ethiopian Airlines a connu un crash en 2019 (vol ET302 Addis-Nairobi sur Boeing 737 MAX). Quelle politique sécurité aujourd'hui ?", "a": "Le 737 MAX a été immobilisé mondialement après cet accident et un autre (Lion Air 2018). Boeing a corrigé le système MCAS responsable. Le MAX a été remis en service en 2020-2021 partout, y compris chez Ethiopian. La compagnie a maintenu de bons standards de sécurité (rating EASA, FAA). Néanmoins, certains passagers préfèrent les vols opérés sur Boeing 787 ou Airbus A350 Ethiopian — vérifiez le type d'appareil à la réservation si c'est un critère pour vous."},
        {"q": "Vol Ethiopian Addis-Lagos (sans segment européen) annulé. Recours ?", "a": "Pas de CE 261 (vol totalement hors UE). Recours : Ethiopian Civil Aviation Authority (ECAA), Convention de Montréal pour les dommages prouvés, ou recours commercial direct auprès d'Ethiopian. Pour la diaspora installée en Europe, ces recours sont moins efficaces que pour les vols partant ou arrivant dans l'UE."},
    ],
    "related": [
        {"href": "/blog/ethiopian-airlines-vol-retarde-indemnite.html", "label": "Ethiopian Airlines : vos droits détaillés"},
        {"href": "/blog/asky-airlines-vol-retarde-indemnite.html", "label": "ASKY Airlines : partenaire d'Ethiopian"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/guide-correspondance-dxb-doh-vers-afrique-ce261.html", "label": "Guide Dubaï/Doha : alternatives Golfe"},
        {"href": "/blog/brussels-airlines-vol-retarde-indemnite.html", "label": "Brussels Airlines : codeshare Ethiopian"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
    ],
})

# Construire la liste finale
LOT3 = []
for h in HUBS:
    art = {
        "slug": h["slug"],
        "title": h["title"],
        "description": h["description"],
        "h1": h.get("h1", h["title"]),
        "quick_answer": h["quick_answer"],
        "body_html": body_hub(h),
        "faq": h["faq"],
        "related": h["related"],
    }
    LOT3.append(art)

if __name__ == "__main__":
    write_all(LOT3, "LOT 3")

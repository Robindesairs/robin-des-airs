"""LOT 2 — 9 articles compagnies hub absentes (Emirates, Qatar, Air Senegal, etc.)."""
from _gen_template import write_all


def body_compagnie(c):
    """Génère le body HTML d'un article compagnie standardisé."""
    routes_html = "\n".join(
        f"  <tr><td>{r['route']}</td><td>{r['dist']} km</td><td><strong>{r['indem']} €</strong></td></tr>"
        for r in c["routes"]
    )
    couverture_aller = "✔ <strong>Oui</strong>" if c["eu_compagnie"] or True else "✘ Non"
    couverture_retour = "✔ <strong>Oui</strong> (compagnie UE)" if c["eu_compagnie"] else "✘ <strong>Non</strong> (compagnie non-UE)"

    return f"""<p>{c["intro"]}</p>

<h2>{c["nom"]} et le règlement CE 261/2004</h2>
<p>{c["nom"]} est une compagnie <strong>{c["nationalite"]}</strong>, {"membre de l'Union européenne" if c["eu_compagnie"] else "non membre de l'Union européenne"}. Concrètement, voici ce que cela implique pour vos droits :</p>
<ul>
  <li>Vol au départ d'un aéroport de l'UE (Paris, Bruxelles, Amsterdam, Lisbonne, etc.) avec {c["nom"]} : {couverture_aller}, le <a href="https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32004R0261" target="_blank" rel="noopener external">CE 261</a> s'applique.</li>
  <li>Vol au départ de {c["hub"]} ({c["hub_code"]}) vers l'UE avec {c["nom"]} : {couverture_retour}.</li>
  <li>Vol intérieur africain ou hors-UE : non couvert par le CE 261, seulement par la <a href="https://www.icao.int/secretariat/legal/list%20of%20parties/mtl99_fr.pdf" target="_blank" rel="noopener external">Convention de Montréal</a> pour les bagages et incidents corporels.</li>
</ul>

<h2>Réseau {c["nom"]} vers l'Afrique</h2>
<p>{c["reseau"]}</p>

<h2>Distances et indemnités sur les routes principales (billet unique depuis Paris)</h2>
<table>
  <tr><th>Itinéraire</th><th>Distance totale (orthodromique)</th><th>Indemnité CE 261</th></tr>
{routes_html}
</table>
<p>Toutes ces routes dépassent 3 500 km à vol d'oiseau → palier maximum de 600 € par passager en cas de retard supérieur à 3h à l'arrivée finale.</p>

<h2>Scénario type — retard avec {c["nom"]}</h2>
<p>{c["scenario"]}</p>

<h2>Démarche pour réclamer auprès de {c["nom"]}</h2>
<ol>
  <li>Conservez votre carte d'embarquement, l'e-mail de confirmation du PNR, et toute preuve du retard (photos écrans aéroport, reçus repas, heure tampon d'arrivée à destination).</li>
  <li>{c["reclamation"]}</li>
  <li>Envoyez une <a href="/blog/lettre-mise-en-demeure-compagnie-aerienne-modele.html">mise en demeure formelle</a> par email tracké ou LRAR sous 30 jours.</li>
  <li>En cas de refus ou de silence au-delà de 60 jours, saisissez la <a href="https://www.ecologie.gouv.fr/direction-generale-laviation-civile-dgac" target="_blank" rel="noopener external">DGAC</a> {"ou le " + c.get("mediateur", "Médiateur du Tourisme et du Voyage (MTV)") if c.get("mediateur") else ""}, ou Robin des Airs prend le dossier pour vous : <a href="/depot-en-ligne.html">dépôt en ligne</a> en 2 minutes.</li>
</ol>

<h2>Particularités à connaître sur {c["nom"]}</h2>
{c["particularites"]}
"""


COMPAGNIES = [
# 1. Emirates
{
    "slug": "emirates-vol-retarde-indemnite",
    "nom": "Emirates",
    "hub": "Dubaï",
    "hub_code": "DXB",
    "nationalite": "émiratie",
    "eu_compagnie": False,
    "title": "Emirates vol retardé : indemnité CE 261 via Dubaï vers l'Afrique",
    "description": "Vol Emirates Paris-Dubaï-Nairobi retardé ? Vos droits CE 261 sont protégés à l'aller depuis l'UE. Distance totale = 600€ sur billet unique. Retour non couvert.",
    "quick_answer": "<strong>Emirates est une compagnie émiratie (non-UE)</strong> mais le CE 261 s'applique sur les vols au départ d'un aéroport européen (Paris, Bruxelles, Amsterdam, Milan, Madrid...). Sur un billet unique Paris-Dubaï-Nairobi, l'indemnité se calcule sur la distance totale Paris-Nairobi = 600 €. <strong>Le retour Dubaï-Paris n'est pas couvert par le CE 261</strong> car Emirates est non-EU et le vol part hors UE.",
    "intro": "Emirates est la plus grande compagnie du Moyen-Orient, basée à Dubaï (DXB), et dessert environ 25 destinations africaines (Nairobi, Addis-Abeba, Lagos, Le Caire, Johannesburg, Le Cap, Lusaka, Harare, Dar es Salaam, Entebbe, Khartoum, Accra, Abidjan, Casablanca, etc.). C'est une option fréquemment choisie par la diaspora pour son rapport prix/confort, mais ses obligations CE 261 dépendent strictement du sens du vol.",
    "reseau": "Emirates dessert plus de 25 destinations en Afrique depuis son hub de Dubaï : Nairobi (NBO), Addis-Abeba (ADD), Lagos (LOS), Le Caire (CAI), Johannesburg (JNB), Le Cap (CPT), Durban (DUR), Lusaka (LUN), Harare (HRE), Dar es Salaam (DAR), Entebbe (EBB), Accra (ACC), Abidjan (ABJ), Conakry (CKY), Casablanca (CMN), Tunis (TUN), Alger (ALG), Khartoum (KRT), Maputo (MPM) et plusieurs autres villes en saison.",
    "routes": [
        {"route": "CDG → DXB → NBO (Nairobi)", "dist": "6 484", "indem": "600"},
        {"route": "CDG → DXB → JNB (Johannesburg)", "dist": "8 762", "indem": "600"},
        {"route": "CDG → DXB → LOS (Lagos)", "dist": "4 869", "indem": "600"},
        {"route": "CDG → DXB → ACC (Accra)", "dist": "4 999", "indem": "600"},
        {"route": "CDG → DXB → ADD (Addis-Abeba)", "dist": "5 712", "indem": "600"},
        {"route": "CDG → DXB → CMN (Casablanca)", "dist": "1 869", "indem": "400"},
        {"route": "BRU → DXB → NBO", "dist": "6 442", "indem": "600"},
        {"route": "AMS → DXB → JNB", "dist": "8 776", "indem": "600"},
    ],
    "scenario": "Vous partez de Paris CDG le matin avec EK74 vers Dubaï, votre vol part avec 2h de retard pour 'maintenance technique', vous ratez votre correspondance EK721 vers Nairobi. Emirates vous réachemine sur le vol du soir, vous arrivez à Nairobi avec 9h de retard. Sur billet unique : 600 € par passager dus par Emirates (CE 261 art. 7.1.c, palier > 3 500 km). Emirates ne peut invoquer 'circonstances extraordinaires' que pour des cas très précis (météo aéroport, contrôle aérien, sécurité). Une maintenance technique standard ne suffit pas.",
    "reclamation": "Emirates dispose d'un formulaire en ligne dédié CE 261 (rubrique 'Help → Compensation Claims' sur emirates.com). Le délai annoncé est de 14 jours pour accuser réception et jusqu'à 6 semaines pour décision. En pratique, comptez 60 à 90 jours.",
    "mediateur": "Médiateur du Tourisme et du Voyage (MTV) si Emirates y adhère pour vos litiges en France",
    "particularites": """<ul>
  <li><strong>Maintenance technique récurrente</strong> : flotte Emirates très utilisée, rotations courtes, incidents techniques relativement fréquents. Documentez bien la cause invoquée.</li>
  <li><strong>Hôtel de transit Dubaï</strong> : Emirates dispose d'hôtels de transit à DXB pour les correspondances ratées (+ visa transit gratuit pour la plupart des nationalités).</li>
  <li><strong>Bagages</strong> : franchise généreuse en Economy Saver (1×30 kg) et Economy Flex (1×35 kg), avantage notable pour la diaspora.</li>
  <li><strong>Code-share avec Qantas, JetBlue, FlyDubai</strong> : la responsabilité reste sur Emirates pour ses propres vols opérés.</li>
  <li><strong>Pas membre d'alliance majeure</strong> : pas de code-share automatique avec Air France/KLM/Lufthansa pour les correspondances européennes.</li>
</ul>""",
    "faq": [
        {"q": "Mon vol Emirates Paris-Dubaï a 4h de retard mais je n'ai pas de correspondance. Ai-je droit à une indemnité ?", "a": "Oui. Vol au départ de l'UE (CDG) → CE 261 s'applique. Distance CDG-DXB = 5 246 km → palier long-courrier 600 €. Retard supérieur à 4h à l'arrivée à Dubaï = indemnité pleine. Si retard entre 3h et 4h sur long-courrier, indemnité réduite à 300 €."},
        {"q": "Emirates m'a proposé un avoir au lieu de l'indemnité cash. Suis-je obligé d'accepter ?", "a": "Non. L'article 7.3 du CE 261 prévoit que l'indemnité est versée en cash (virement ou chèque). Emirates ne peut substituer un avoir <strong>qu'avec votre accord écrit explicite</strong>. Refusez si vous préférez le cash, c'est votre droit."},
        {"q": "Le retour Nairobi-Dubaï-Paris avec Emirates est-il couvert par le CE 261 ?", "a": "Non. Le vol part de Nairobi (hors UE) et Emirates est non-européenne. Aucune des deux conditions du CE 261 n'est remplie. Seule une assurance voyage peut compenser. Pour être couvert sur le retour, choisissez Air France, KLM, Brussels Airlines ou autre compagnie EU."},
        {"q": "Emirates refuse en invoquant une 'circonstance extraordinaire'. Comment vérifier ?", "a": "Demandez par écrit la nature exacte (météo, ATC, sécurité, grève). Une 'panne technique' n'est généralement <strong>pas</strong> une circonstance extraordinaire (jurisprudence <a href=\"https://curia.europa.eu/juris/document/document.jsf?docid=70689&doclang=FR\" target=\"_blank\" rel=\"noopener external\">CJUE Wallentin-Hermann C-549/07</a>). Si Emirates invoque la météo, vérifiez les rapports METAR du jour pour Dubaï et l'aéroport concerné."},
        {"q": "Emirates m'a réacheminé sur Qatar Airways après l'annulation. À qui je réclame ?", "a": "À Emirates, le transporteur d'origine qui a annulé le vol. Le réacheminement (même sur une autre compagnie) ne décharge pas Emirates de son obligation d'indemnisation au titre du CE 261."},
    ],
    "related": [
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE : la règle complète"},
        {"href": "/blog/qatar-airways-vol-retarde-indemnite.html", "label": "Qatar Airways : vos droits via Doha"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/turkish-airlines-vol-retarde-indemnite.html", "label": "Turkish Airlines via Istanbul"},
        {"href": "/blog/circonstances-extraordinaires-ce261.html", "label": "Circonstances extraordinaires : ce qui n'en est pas"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : à qui réclamer ?"},
    ],
},

# 2. Qatar Airways
{
    "slug": "qatar-airways-vol-retarde-indemnite",
    "nom": "Qatar Airways",
    "hub": "Doha",
    "hub_code": "DOH",
    "nationalite": "qatarie",
    "eu_compagnie": False,
    "title": "Qatar Airways vol retardé : indemnité CE 261 via Doha vers l'Afrique",
    "description": "Qatar Airways Paris-Doha-Johannesburg retardé ? CE 261 protège l'aller depuis l'UE = 600€. Retour Doha-Paris non couvert. Toutes les routes Afrique détaillées.",
    "quick_answer": "<strong>Qatar Airways est qatarie (non-UE)</strong> mais le CE 261 protège les vols au départ d'aéroports européens. Sur un billet unique Paris-Doha-Johannesburg, l'indemnité se calcule sur la distance totale = 600 €. Qatar est l'une des compagnies les plus ponctuelles au monde (~85%), mais ses obligations CE 261 ne s'appliquent qu'aux trajets au départ de l'UE.",
    "intro": "Qatar Airways est la compagnie nationale du Qatar, basée à Doha (DOH), reconnue pour sa ponctualité (~85% on-time, parmi les meilleures au monde) et la qualité de sa Business Class. Elle dessert environ 28 destinations africaines et constitue souvent une alternative tarifaire intéressante à Air France ou Emirates pour la diaspora Afrique de l'Est et du Sud. Membre de l'alliance Oneworld.",
    "reseau": "Qatar Airways dessert plus de 28 destinations africaines depuis Doha : Johannesburg (JNB), Le Cap (CPT), Durban (DUR), Nairobi (NBO), Addis-Abeba (ADD), Dar es Salaam (DAR), Entebbe (EBB), Lagos (LOS), Abuja (ABV), Accra (ACC), Abidjan (ABJ), Le Caire (CAI), Alexandrie (HBE), Tunis (TUN), Casablanca (CMN), Lusaka (LUN), Harare (HRE), Maputo (MPM), Kigali (KGL), Mombasa (MBA), Antananarivo (TNR), Khartoum (KRT), Djibouti (JIB), Dakar (DKR), Windhoek (WDH), Luanda (LAD), entre autres.",
    "routes": [
        {"route": "CDG → DOH → JNB", "dist": "8 762", "indem": "600"},
        {"route": "CDG → DOH → NBO", "dist": "6 484", "indem": "600"},
        {"route": "CDG → DOH → LOS", "dist": "4 869", "indem": "600"},
        {"route": "CDG → DOH → ADD", "dist": "5 712", "indem": "600"},
        {"route": "CDG → DOH → CPT", "dist": "9 663", "indem": "600"},
        {"route": "CDG → DOH → DAR", "dist": "7 222", "indem": "600"},
        {"route": "CDG → DOH → KGL", "dist": "6 392", "indem": "600"},
        {"route": "BRU → DOH → MPM", "dist": "8 880", "indem": "600"},
    ],
    "scenario": "Vol QR40 Paris-Doha retardé de 3h pour cause de météo défavorable annoncée. Vous ratez la correspondance vers Johannesburg, réacheminement sur le vol suivant, arrivée avec 11h de retard. La compagnie invoque les conditions météo comme circonstance extraordinaire. Vérifiez les rapports METAR du jour pour CDG et DOH : si d'autres vols ont décollé/atterri normalement, l'argument tombe. Indemnité due = 600 € par passager sur billet unique.",
    "reclamation": "Qatar Airways dispose d'un formulaire dédié en ligne (qatarairways.com → 'Contact' → 'Compensation EU 261/2004'). Les délais varient entre 30 et 90 jours. Qatar a une bonne réputation de paiement des cas légitimes, mais conteste fortement les cas borderline.",
    "mediateur": None,
    "particularites": """<ul>
  <li><strong>Ponctualité exceptionnelle</strong> : Qatar est souvent en tête des classements (~85% on-time). Mais cela rend les retards encore plus impactants quand ils surviennent.</li>
  <li><strong>Hub de Doha (Hamad International)</strong> : un des meilleurs au monde pour les correspondances, dispose de chambres jour gratuites pour les transits >8h.</li>
  <li><strong>Membre Oneworld</strong> : code-share avec British Airways, Iberia, Royal Jordanian. Vos miles peuvent s'accumuler chez ces compagnies.</li>
  <li><strong>Politique bagages</strong> : 30 kg en Economy Classic et Comfort sur les vols Afrique, généreuse pour la diaspora.</li>
  <li><strong>Pas de vols intra-Afrique</strong> : tous les vols passent par Doha, ce qui peut allonger les trajets vers WAF (Lagos, Abidjan) où Air France ou RAM sont plus directs.</li>
</ul>""",
    "faq": [
        {"q": "Qatar Airways refuse en invoquant les conditions météorologiques. C'est valable ?", "a": "Cela dépend. La météo n'est une circonstance extraordinaire que si elle empêche réellement le vol (orage, tempête, brouillard intense). Si d'autres vols ont décollé/atterri normalement, ce n'est pas valable. Demandez les rapports METAR de l'aéroport pour le jour et l'heure précise du retard. Vous pouvez les consulter gratuitement sur des sites comme ogimet.com ou aviationweather.gov."},
        {"q": "Qatar a transféré mon vol annulé vers Emirates. À qui je réclame ?", "a": "À Qatar Airways. C'est Qatar qui a annulé votre vol initial et qui reste responsable de l'indemnisation CE 261. Le réacheminement (chez Qatar, Emirates, ou toute autre compagnie) ne décharge pas Qatar de son obligation d'indemnisation forfaitaire."},
        {"q": "Le vol retour Johannesburg-Doha-Paris avec Qatar est-il protégé ?", "a": "Non. Vol au départ hors UE (JNB) avec compagnie non-UE (Qatar). Aucune condition du CE 261 n'est remplie. Pour le retour, préférez Air France direct ou un code-share KLM/Kenya Airways via Amsterdam pour bénéficier de la protection EU."},
        {"q": "Qatar Airways est-elle adhérente du Médiateur Tourisme Voyage français ?", "a": "Non, Qatar Airways n'est pas adhérente du MTV (au moment de la rédaction de cet article). En cas de refus, les recours sont la DGAC, le tribunal de proximité, ou Robin des Airs (mandat de représentation)."},
        {"q": "Quel est l'avantage de Qatar sur Air France pour aller à Nairobi ?", "a": "Tarifs souvent inférieurs (-20 à -40%), service Business Class régulièrement primé, ponctualité supérieure. Inconvénient : pas de protection CE 261 au retour, escale longue à Doha possible (parfois 10-12h sur les billets les moins chers), pas de vols directs depuis les villes secondaires françaises (Marseille, Lyon, Nice — ces villes nécessitent une correspondance préalable à Paris ou Genève)."},
    ],
    "related": [
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
        {"href": "/blog/emirates-vol-retarde-indemnite.html", "label": "Emirates : vos droits via Dubaï"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/guide-correspondance-dxb-doh-vers-afrique-ce261.html", "label": "Guide Dubaï/Doha vers l'Afrique"},
        {"href": "/blog/circonstances-extraordinaires-ce261.html", "label": "Circonstances extraordinaires : critères"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : Folkerts"},
    ],
},

# 3. Air Sénégal
{
    "slug": "air-senegal-vol-retarde-indemnite",
    "nom": "Air Sénégal",
    "hub": "Dakar",
    "hub_code": "DSS",
    "nationalite": "sénégalaise",
    "eu_compagnie": False,
    "title": "Air Sénégal vol retardé : indemnité CE 261 sur les routes Europe-Afrique",
    "description": "Air Sénégal Paris-Dakar retardé ? CE 261 vous protège à l'aller. Routes intra-africaines régionales non couvertes. Démarches et droits expliqués.",
    "quick_answer": "<strong>Air Sénégal est sénégalaise (non-UE)</strong>. Le CE 261 s'applique sur ses vols au départ d'un aéroport de l'UE (Paris CDG, Marseille, Barcelone, Madrid, Milan, Lyon). Sur un Paris-Dakar direct retardé de plus de 3h à l'arrivée : 600 € par passager. Les vols régionaux intra-africains opérés depuis Dakar (Dakar-Abidjan, Dakar-Bamako, Dakar-Nouakchott...) ne sont pas couverts par le CE 261.",
    "intro": "Air Sénégal (HC) est la compagnie nationale du Sénégal, basée à l'aéroport international Blaise Diagne (DSS) au sud de Dakar. Compagnie en forte croissance depuis 2018, elle dessert directement Paris (CDG), Marseille, Barcelone, Lyon et Madrid en Europe, et constitue un hub régional en Afrique de l'Ouest. Pour les voyageurs de la diaspora ouest-africaine, c'est une alternative directe à Air France et à Royal Air Maroc.",
    "reseau": "Air Sénégal opère sur deux axes : <strong>vols long-courriers Europe-Dakar</strong> (Paris CDG, Marseille MRS, Barcelone BCN, Lyon LYS, Madrid MAD) et <strong>réseau régional Afrique de l'Ouest depuis Dakar</strong> (Abidjan ABJ, Bamako BKO, Conakry CKY, Nouakchott NKC, Banjul BJL, Praia RAI, Cotonou COO, Libreville LBV, Douala DLA, et nouvelles ouvertures vers Brazzaville et Kinshasa). Flotte récente d'Airbus A330neo et A319/A320.",
    "routes": [
        {"route": "CDG → DSS (Paris-Dakar direct)", "dist": "4 208", "indem": "600"},
        {"route": "MRS → DSS (Marseille-Dakar direct)", "dist": "3 720", "indem": "600"},
        {"route": "LYS → DSS (Lyon-Dakar direct)", "dist": "3 945", "indem": "600"},
        {"route": "BCN → DSS (Barcelone-Dakar direct)", "dist": "3 290", "indem": "400"},
        {"route": "MAD → DSS (Madrid-Dakar direct)", "dist": "3 122", "indem": "400"},
        {"route": "CDG → DSS → ABJ (avec correspondance Dakar, billet unique)", "dist": "4 710", "indem": "600"},
        {"route": "CDG → DSS → BKO (avec correspondance Dakar, billet unique)", "dist": "4 480", "indem": "600"},
        {"route": "CDG → DSS → DLA (avec correspondance Dakar, billet unique)", "dist": "4 925", "indem": "600"},
    ],
    "scenario": "Vol HC401 Paris-Dakar retardé de 4h30 pour 'incident technique' sur l'A330. Vous arrivez à Dakar avec 4h30 de retard, et si vous aviez une correspondance avec Air Sénégal vers Bamako, vous la ratez. Sur billet unique, Air Sénégal doit : (1) vous réacheminer sur le vol Bamako suivant, (2) vous loger pendant l'attente si nuit, (3) vous nourrir, et (4) vous verser 600 € d'indemnité forfaitaire CE 261 (distance Paris-Bamako > 3 500 km).",
    "reclamation": "Air Sénégal accepte les réclamations par e-mail à customercare@airsenegal.com ou via leur site (rubrique 'Contactez-nous'). Délais réels : 60 à 120 jours, avec relances nécessaires. La compagnie est jeune et en montée en puissance opérationnelle ; les réclamations CE 261 sont parfois traitées avec retard.",
    "mediateur": "Médiateur du Tourisme et du Voyage (MTV) — vérifiez l'adhésion à jour",
    "particularites": """<ul>
  <li><strong>Compagnie jeune (relance 2018)</strong> : croissance rapide, mais retards opérationnels plus fréquents que les majors. Documentez tout.</li>
  <li><strong>Flotte Airbus récente</strong> : A330neo pour le long-courrier (livrés 2019-2021), A319/A320 pour le régional. Pannes techniques relativement fréquentes au début.</li>
  <li><strong>Hub Diass (DSS)</strong> : aéroport moderne ouvert en 2017 à 50 km de Dakar. Bons services correspondance.</li>
  <li><strong>Codeshare TAP Air Portugal</strong> sur certaines routes — peut bénéficier de la protection EU si vol opéré par TAP.</li>
  <li><strong>Pas membre d'alliance majeure</strong> à ce jour. Cumul de miles limité.</li>
</ul>""",
    "faq": [
        {"q": "Le vol Dakar-Paris au retour avec Air Sénégal est-il protégé par le CE 261 ?", "a": "Non. Air Sénégal est non-européenne et le vol part de Dakar (hors UE). Aucune des deux conditions n'est remplie. Pour un retour protégé, choisissez Air France ou Brussels Airlines (compagnies EU)."},
        {"q": "Mon vol régional Dakar-Abidjan opéré par Air Sénégal a été annulé. CE 261 s'applique-t-il ?", "a": "Non. Vol totalement hors UE (départ Dakar, arrivée Abidjan), compagnie non-UE. Seule la <a href=\"https://www.icao.int/secretariat/legal/list%20of%20parties/mtl99_fr.pdf\" target=\"_blank\" rel=\"noopener external\">Convention de Montréal</a> s'applique (bagages, dommages prouvés). Les recours sont l'<a href=\"https://www.aacs.sn/\" target=\"_blank\" rel=\"noopener external\">ANAC Sénégal</a> et l'<a href=\"https://www.eltrava.com/\" target=\"_blank\" rel=\"noopener external\">association sénégalaise de défense des consommateurs</a>."},
        {"q": "Air Sénégal m'a réacheminé sur Royal Air Maroc. À qui je réclame ?", "a": "À Air Sénégal, transporteur d'origine qui a annulé/retardé votre vol. Le réacheminement ne dégage pas la compagnie initiale de ses obligations CE 261."},
        {"q": "Quelles sont les routes Air Sénégal les plus fiables ?", "a": "Les routes long-courriers Paris-Dakar, Marseille-Dakar et Madrid-Dakar sont les mieux opérées (flotte A330neo dédiée). Les routes régionales (Bamako, Conakry, Cotonou) ont des taux de retard plus élevés en raison de problèmes opérationnels locaux et de la maintenance des A319/A320."},
        {"q": "Combien de temps avant le vol dois-je arriver à l'aéroport pour un vol Air Sénégal vers l'Afrique ?", "a": "3h minimum pour un vol long-courrier au départ de CDG, 4h en haute saison (juillet-août, décembre). Air Sénégal applique des règles strictes sur les bagages (taille, poids) et les contrôles peuvent être longs. À Dakar (DSS), comptez 2h30 avant un vol Europe."},
    ],
    "related": [
        {"href": "/blog/vol-retarde-dakar-paris-indemnite.html", "label": "Vol Dakar-Paris retardé : vos droits"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
        {"href": "/blog/royal-air-maroc-vol-retarde-indemnite.html", "label": "Royal Air Maroc : alternative régionale"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/air-cote-d-ivoire-vol-retarde-indemnite.html", "label": "Air Côte d'Ivoire : compagnie sœur régionale"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : à qui réclamer ?"},
    ],
},

# 4. Air Côte d'Ivoire
{
    "slug": "air-cote-d-ivoire-vol-retarde-indemnite",
    "nom": "Air Côte d'Ivoire",
    "hub": "Abidjan",
    "hub_code": "ABJ",
    "nationalite": "ivoirienne",
    "eu_compagnie": False,
    "title": "Air Côte d'Ivoire vol retardé : indemnité CE 261 sur les routes Europe-Abidjan",
    "description": "Air Côte d'Ivoire Paris-Abidjan retardé ? CE 261 protège l'aller depuis l'UE = 600€. Routes régionales WAF non couvertes. Démarches expliquées.",
    "quick_answer": "<strong>Air Côte d'Ivoire est ivoirienne (non-UE)</strong>. Sur ses vols au départ d'un aéroport européen (Paris CDG depuis 2023, Marseille), le CE 261 s'applique. Un Paris-Abidjan direct retardé de plus de 3h à l'arrivée = <strong>600 €</strong> par passager. Les vols régionaux depuis Abidjan vers Dakar, Lagos, Cotonou, Lomé, Douala, etc. ne sont pas couverts par le CE 261.",
    "intro": "Air Côte d'Ivoire (HF) est la compagnie nationale de la Côte d'Ivoire, basée à l'aéroport Félix Houphouët-Boigny d'Abidjan (ABJ). Elle s'est imposée comme un hub régional majeur en Afrique de l'Ouest depuis 2012. Elle opère désormais des vols directs Paris-Abidjan (depuis 2023, en concurrence directe avec Air France et Brussels Airlines) et un dense réseau régional WAF.",
    "reseau": "Air Côte d'Ivoire opère sur deux segments : <strong>long-courrier Paris-Abidjan</strong> (CDG, lancé en juillet 2023 avec A330) et <strong>réseau régional Afrique de l'Ouest</strong> depuis Abidjan : Dakar (DKR/DSS), Bamako (BKO), Ouagadougou (OUA), Lomé (LFW), Cotonou (COO), Lagos (LOS), Accra (ACC), Conakry (CKY), Freetown (FNA), Monrovia (ROB), Douala (DLA), Yaoundé (NSI), Libreville (LBV), Brazzaville (BZV), Pointe-Noire (PNR), Kinshasa (FIH), Niamey (NIM).",
    "routes": [
        {"route": "CDG → ABJ (Paris-Abidjan direct)", "dist": "4 710", "indem": "600"},
        {"route": "CDG → ABJ → DKR (Paris-Abidjan-Dakar billet unique)", "dist": "4 850", "indem": "600"},
        {"route": "CDG → ABJ → BKO (Paris-Abidjan-Bamako)", "dist": "5 050", "indem": "600"},
        {"route": "CDG → ABJ → OUA (Paris-Abidjan-Ouagadougou)", "dist": "4 920", "indem": "600"},
        {"route": "CDG → ABJ → COO (Paris-Abidjan-Cotonou)", "dist": "4 980", "indem": "600"},
        {"route": "CDG → ABJ → DLA (Paris-Abidjan-Douala)", "dist": "5 180", "indem": "600"},
        {"route": "CDG → ABJ → LOS (Paris-Abidjan-Lagos)", "dist": "4 990", "indem": "600"},
        {"route": "CDG → ABJ → LFW (Paris-Abidjan-Lomé)", "dist": "4 870", "indem": "600"},
    ],
    "scenario": "Vol HF901 Paris-Abidjan retardé de 5h pour 'problème opérationnel' (chargement de fret, équipage manquant). Vous arrivez à Abidjan avec 5h de retard. Sur le seul segment CDG-ABJ (4 710 km), l'indemnité due est de 600 € par passager. Si vous aviez une correspondance Air Côte d'Ivoire vers Bamako sur billet unique : indemnité calculée sur Paris-Bamako = 600 €, et obligation pour Air Côte d'Ivoire de vous réacheminer.",
    "reclamation": "Air Côte d'Ivoire accepte les réclamations par e-mail à reclamation@aircotedivoire.com ou via le formulaire en ligne. Compagnie en croissance, les délais de traitement varient (60 à 150 jours selon notre expérience). Soyez persévérant avec des relances tous les 30 jours.",
    "mediateur": None,
    "particularites": """<ul>
  <li><strong>Compagnie en pleine croissance</strong> : ouverture Paris en juillet 2023, A330neo. Quelques retards opérationnels lors du lancement.</li>
  <li><strong>Hub Abidjan (ABJ)</strong> : aéroport entièrement modernisé en 2017, bonne organisation correspondance régionale.</li>
  <li><strong>Tarifs souvent compétitifs vs Air France</strong> sur Paris-Abidjan : différence de 100-300 € en éco.</li>
  <li><strong>Bagages</strong> : franchise standard 23 kg en Economy, 32 kg en Premium Economy.</li>
  <li><strong>Coopération étroite avec Air France</strong> sur les correspondances depuis CDG vers les villes secondaires (Lyon, Marseille, etc.).</li>
</ul>""",
    "faq": [
        {"q": "Vol Air Côte d'Ivoire Abidjan-Paris au retour : protégé ?", "a": "Non. Air Côte d'Ivoire est non-européenne et le vol part hors UE. Pour un retour protégé, préférez Air France (vol direct quotidien) ou Brussels Airlines (via Bruxelles)."},
        {"q": "Vol Air Côte d'Ivoire Abidjan-Bamako annulé : recours ?", "a": "Pas de CE 261 (vol totalement hors UE). Recours : Autorité Nationale de l'Aviation Civile de Côte d'Ivoire (ANAC-CI), ou la Convention de Montréal pour les dommages prouvés (bagages, frais d'hôtel justifiés). Pour la diaspora basée en Europe, l'efficacité des recours est limitée."},
        {"q": "Air Côte d'Ivoire est-elle membre d'une alliance (Star, SkyTeam, Oneworld) ?", "a": "Non, pas à ce jour. La compagnie a des partenariats commerciaux ponctuels (notamment avec Air France-KLM sur les correspondances), mais pas d'alliance formelle. Les miles ne se cumulent pas avec Flying Blue ou autre."},
        {"q": "Quelle différence entre Air Côte d'Ivoire et Air France sur Paris-Abidjan ?", "a": "Air France opère Paris-Abidjan depuis des décennies (vol AF702/703 quotidien), avec flotte A350. Air Côte d'Ivoire est plus récente (depuis 2023) avec A330neo, tarifs souvent inférieurs, mais ponctualité moindre en phase de lancement. Au niveau juridique : Air France protège aller + retour (compagnie EU), Air Côte d'Ivoire ne protège que l'aller."},
        {"q": "Comment savoir si mon billet Paris-Abidjan-Bamako est un billet unique ?", "a": "Vérifiez : (1) un seul numéro de réservation PNR sur l'e-mail de confirmation, (2) bagages enregistrés directement jusqu'à Bamako (pas de récupération à Abidjan), (3) cartes d'embarquement émises pour les deux segments à CDG. Si oui, billet unique : protection CE 261 sur l'ensemble du voyage."},
    ],
    "related": [
        {"href": "/blog/vol-retarde-abidjan-paris-indemnite.html", "label": "Vol Abidjan-Paris retardé : vos droits"},
        {"href": "/blog/air-senegal-vol-retarde-indemnite.html", "label": "Air Sénégal : compagnie régionale concurrente"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
        {"href": "/blog/billet-unique-vs-billets-separes-ce261-correspondance.html", "label": "Billet unique vs séparé"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : à qui réclamer ?"},
    ],
},

# 5. ASKY Airlines
{
    "slug": "asky-airlines-vol-retarde-indemnite",
    "nom": "ASKY Airlines",
    "hub": "Lomé",
    "hub_code": "LFW",
    "nationalite": "togolaise",
    "eu_compagnie": False,
    "title": "ASKY Airlines vol retardé : indemnité CE 261 depuis l'Europe via Lomé",
    "description": "ASKY Airlines hub Lomé, partenaire Ethiopian. CE 261 ne s'applique pas directement (pas de vol depuis l'UE). Code-share Ethiopian = protection partielle expliquée.",
    "quick_answer": "<strong>ASKY Airlines (KP) est togolaise, basée à Lomé (LFW), partenaire d'Ethiopian Airlines.</strong> Elle n'opère pas de vol direct depuis l'Europe. Le CE 261 ne s'applique <strong>pas directement</strong> à ASKY. Mais si vous avez un billet unique avec Ethiopian ou Brussels Airlines depuis l'UE incluant un segment ASKY (Lomé-Cotonou par exemple), la protection CE 261 court sur l'ensemble du voyage si l'incident provient du segment européen.",
    "intro": "ASKY Airlines (code IATA : KP) est une compagnie régionale ouest-africaine basée à Lomé, Togo. Créée en 2010 avec un soutien actionnarial d'Ethiopian Airlines, elle s'est imposée comme le hub régional 'low-cost' de l'Afrique de l'Ouest et centrale, avec une trentaine de destinations. Elle ne vole pas directement vers l'Europe, mais opère beaucoup de codeshares avec Ethiopian (ET) et Brussels Airlines (SN) pour les correspondances Europe-Lomé-destination régionale.",
    "reseau": "ASKY opère exclusivement en Afrique : ~25 destinations principalement WAF et CAF. Réseau actuel : Abidjan (ABJ), Accra (ACC), Bamako (BKO), Banjul (BJL), Bissau (OXB), Brazzaville (BZV), Conakry (CKY), Cotonou (COO), Dakar (DKR), Douala (DLA), Freetown (FNA), Libreville (LBV), Lagos (LOS), Lomé hub (LFW), Luanda (LAD), Malabo (SSG), Monrovia (ROB), N'Djamena (NDJ), Niamey (NIM), Ouagadougou (OUA), Pointe-Noire (PNR), Yaoundé (NSI), Kinshasa (FIH).",
    "routes": [
        {"route": "BRU → LFW → COO (codeshare Brussels Airlines + ASKY)", "dist": "5 010", "indem": "600"},
        {"route": "BRU → LFW → DLA", "dist": "5 270", "indem": "600"},
        {"route": "BRU → LFW → ABJ (avec correspondance Lomé)", "dist": "5 250", "indem": "600"},
        {"route": "CDG → ADD → LFW (codeshare Ethiopian + ASKY)", "dist": "8 100", "indem": "600"},
        {"route": "FCO → ADD → LFW", "dist": "7 500", "indem": "600"},
    ],
    "scenario": "Vous achetez un billet unique Bruxelles-Cotonou via Lomé : segment 1 Brussels Airlines BRU-LFW (Boeing 737 SN), segment 2 ASKY LFW-COO. Vol SN BRU-LFW retardé de 6h. Vous ratez la correspondance ASKY, arrivée à Cotonou avec 11h de retard. Sur billet unique, Brussels Airlines (transporteur émetteur EU) est responsable de l'ensemble. Indemnité due = 600 € par passager (distance Bruxelles-Cotonou = 5 010 km > 3 500 km). Réclamez auprès de Brussels Airlines, pas auprès d'ASKY.",
    "reclamation": "ASKY n'a pas de service réclamations CE 261 dédié (la compagnie n'y est pas soumise directement). Si votre billet unique avec ASKY a été émis par Brussels Airlines, Ethiopian, ou toute autre compagnie EU/non-EU avec laquelle ASKY est en code-share, c'est cette compagnie émettrice qui traite la réclamation. Vérifiez votre e-ticket : le 'ticket number' commence par le code IATA de la compagnie émettrice (074 = KLM, 057 = Air France, 082 = Brussels Airlines, 071 = Ethiopian).",
    "mediateur": None,
    "particularites": """<ul>
  <li><strong>Pas de vol direct vers l'Europe</strong> : ASKY est purement régionale, donc le CE 261 ne s'applique jamais directement à elle. Il s'applique seulement aux compagnies EU/non-EU qui vendent un billet unique incluant un segment ASKY.</li>
  <li><strong>Hub Lomé (LFW)</strong> : opéré par ASKY avec un terminal correspondance bien organisé.</li>
  <li><strong>Code-share Ethiopian (Star Alliance)</strong> : la majorité des correspondances Europe-Lomé passent par Addis-Abeba avec ET.</li>
  <li><strong>Code-share Brussels Airlines</strong> : option directe BRU-LFW depuis Bruxelles (4-6 fois/semaine).</li>
  <li><strong>Flotte Boeing 737</strong> et Dash 8 — pannes opérationnelles relativement fréquentes en raison du contexte régional.</li>
</ul>""",
    "faq": [
        {"q": "Mon vol ASKY Lomé-Cotonou a été annulé. CE 261 s'applique-t-il ?", "a": "Non si vous avez un billet ASKY seul (pas de jambe européenne sur ce billet). C'est un vol totalement hors UE avec compagnie non-UE. Recours : autorité aérienne locale (ANAC Togo ou Bénin), ou Convention de Montréal pour dommages prouvés. Si vous aviez un billet unique avec un segment européen, voir question suivante."},
        {"q": "J'ai un billet Brussels Airlines + ASKY (Bruxelles-Lomé-Douala). Mon vol ASKY Lomé-Douala est annulé après l'arrivée normale à Lomé. À qui je réclame ?", "a": "À Brussels Airlines (compagnie EU émettrice du billet unique). C'est la jurisprudence <a href=\"https://curia.europa.eu/juris/document/document.jsf?docid=134201&doclang=FR\" target=\"_blank\" rel=\"noopener external\">CJUE C-11/11 Folkerts</a> : c'est l'heure d'arrivée à la destination finale (Douala) qui compte, et le transporteur émetteur (Brussels Airlines, EU) est responsable. Indemnité due = 600 € par passager si retard > 3h à Douala."},
        {"q": "Pourquoi ASKY existe-t-elle si Ethiopian opère déjà des vols vers l'Afrique de l'Ouest ?", "a": "ASKY est un hub régional secondaire (Lomé) qui complète le hub Ethiopian principal (Addis). Pour beaucoup de destinations WAF, faire un Addis-WAF est trop long ; un transit par Lomé est plus efficient. ASKY agit comme 'sous-traitant' régional d'Ethiopian. Cela permet aussi à Ethiopian d'éviter des slots saturés."},
        {"q": "Comment savoir si mon billet est un billet unique avec ASKY ?", "a": "Vérifiez : un seul PNR sur l'e-mail de confirmation, et un seul ticket number commençant par 071 (Ethiopian), 082 (Brussels Airlines) ou autre compagnie partenaire. ASKY a son propre code IATA 124 mais elle émet rarement le billet en propre — c'est presque toujours un partenaire qui le fait."},
        {"q": "Y a-t-il une alternative à ASKY pour aller à Cotonou, Lomé, ou Niamey depuis l'Europe ?", "a": "Oui : Air France (CDG-Cotonou direct, CDG-Lomé direct, CDG-Niamey direct), Brussels Airlines (BRU-Lomé direct), Royal Air Maroc (via Casablanca). Pour la protection juridique maximale au retour, préférer Air France ou Brussels Airlines (compagnies EU)."},
    ],
    "related": [
        {"href": "/blog/ethiopian-airlines-vol-retarde-indemnite.html", "label": "Ethiopian Airlines : partenaire d'ASKY"},
        {"href": "/blog/brussels-airlines-vol-retarde-indemnite.html", "label": "Brussels Airlines : code-share principal"},
        {"href": "/blog/billet-unique-vs-billets-separes-ce261-correspondance.html", "label": "Billet unique vs séparé"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : Folkerts"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
    ],
},

# 6. EgyptAir
{
    "slug": "egyptair-vol-retarde-indemnite",
    "nom": "EgyptAir",
    "hub": "Le Caire",
    "hub_code": "CAI",
    "nationalite": "égyptienne",
    "eu_compagnie": False,
    "title": "EgyptAir vol retardé : indemnité CE 261 via Le Caire vers l'Afrique",
    "description": "EgyptAir Paris-Le Caire-Nairobi retardé ? CE 261 protège l'aller depuis l'UE = 600€. Routes Afrique de l'Est et Maghreb. Retour Le Caire-Paris non couvert.",
    "quick_answer": "<strong>EgyptAir (MS) est égyptienne (non-UE), membre Star Alliance.</strong> Le CE 261 s'applique sur ses vols au départ d'un aéroport européen (Paris CDG, Marseille, Genève...). Sur un Paris-Le Caire-Dar es Salaam en billet unique retardé de plus de 3h à l'arrivée : 600 €. Le retour Le Caire-Paris n'est pas couvert par le CE 261.",
    "intro": "EgyptAir (MS) est la compagnie nationale d'Égypte, basée au Caire (CAI), membre de Star Alliance depuis 2008. Elle dessert environ 20 destinations en Afrique (principalement EAF et Maghreb) et constitue une option pour aller en Afrique de l'Est et en Afrique du Nord via Le Caire, particulièrement compétitive pour les vols vers la Tanzanie, le Kenya, le Soudan et l'Éthiopie depuis l'Europe.",
    "reseau": "EgyptAir dessert ~20 destinations en Afrique depuis Le Caire : Khartoum (KRT), Addis-Abeba (ADD), Nairobi (NBO), Dar es Salaam (DAR), Entebbe (EBB), Djibouti (JIB), Asmara (ASM), Juba (JUB), Lagos (LOS), Accra (ACC), Abidjan (ABJ), Kinshasa (FIH), Yaoundé (NSI), Tripoli (TIP), Tunis (TUN), Alger (ALG), Casablanca (CMN), Marrakech (RAK), Khartoum (KRT).",
    "routes": [
        {"route": "CDG → CAI → NBO", "dist": "5 891", "indem": "600"},
        {"route": "CDG → CAI → ADD", "dist": "5 600", "indem": "600"},
        {"route": "CDG → CAI → DAR", "dist": "6 920", "indem": "600"},
        {"route": "CDG → CAI → EBB", "dist": "6 070", "indem": "600"},
        {"route": "CDG → CAI → KRT", "dist": "5 100", "indem": "600"},
        {"route": "CDG → CAI → JIB", "dist": "5 945", "indem": "600"},
        {"route": "CDG → CAI → LOS", "dist": "4 870", "indem": "600"},
        {"route": "CDG → CAI (Paris-Le Caire direct)", "dist": "3 215", "indem": "400"},
    ],
    "scenario": "Vol MS800 Paris-Le Caire retardé de 4h pour 'attente d'équipage'. Vous ratez la correspondance MS842 vers Nairobi. EgyptAir vous réachemine sur le vol du lendemain, vous arrivez à Nairobi avec 18h de retard. Sur billet unique : 600 € par passager (distance Paris-Nairobi = 5 891 km > 3 500 km), + obligation d'hébergement, repas, transferts. Réclamation auprès d'EgyptAir.",
    "reclamation": "EgyptAir accepte les réclamations CE 261 via le formulaire en ligne sur egyptair.com (rubrique 'Contact us → Compensation'). Les délais sont variables (60 à 180 jours). La compagnie traite mieux les dossiers transmis via le service européen (basé à Francfort) que via le service central du Caire.",
    "mediateur": None,
    "particularites": """<ul>
  <li><strong>Membre Star Alliance</strong> : code-share avec Lufthansa, Brussels Airlines, Ethiopian, Turkish, Singapore, etc. Vos miles Miles & More fonctionnent.</li>
  <li><strong>Hub Le Caire (CAI)</strong> : terminal 3 modernisé, correspondances efficaces vers EAF et Maghreb.</li>
  <li><strong>Tarifs très compétitifs</strong> sur les routes vers EAF (parfois -30 à -40% vs Air France direct).</li>
  <li><strong>Service client souvent en arabe + anglais</strong> : prévoir l'anglais pour vos communications.</li>
  <li><strong>Pannes opérationnelles fréquentes</strong> sur la flotte Boeing 737/787 et Airbus A330 — bien documenter.</li>
</ul>""",
    "faq": [
        {"q": "EgyptAir est membre de Star Alliance — cela améliore-t-il ma protection ?", "a": "Pas directement pour le CE 261, qui dépend de la nationalité de la compagnie et du lieu de départ. Mais en pratique, votre dossier sera mieux suivi car les standards Star Alliance imposent une certaine qualité de service client. Vos miles Lufthansa Miles & More, United MileagePlus, etc. fonctionnent."},
        {"q": "Vol EgyptAir Le Caire-Nairobi (sans segment européen) annulé. Recours ?", "a": "Pas de CE 261 (vol totalement hors UE). Recours : Egyptian Civil Aviation Authority (ECAA) pour la procédure égyptienne. Convention de Montréal pour les bagages et dommages prouvés. Pour la diaspora installée en Europe, ces recours sont peu efficaces."},
        {"q": "EgyptAir m'a refusé en invoquant la 'sécurité aéroportuaire' au Caire. Valable ?", "a": "Cela peut être une circonstance extraordinaire si elle est extérieure à la compagnie (alerte sécurité aéroport ordonnée par l'autorité égyptienne). Demandez la preuve écrite : avis officiel, NOTAM (Notice to Airmen), ou décision de l'autorité. Sans preuve documentée, refusez l'argument."},
        {"q": "Le retour Nairobi-Le Caire-Paris avec EgyptAir est-il protégé par CE 261 ?", "a": "Non. Vol au départ d'un aéroport hors UE (Nairobi) avec compagnie non-UE (EgyptAir). Pour le retour, préférez Lufthansa (via FRA), KLM (via AMS) ou autre compagnie EU."},
        {"q": "Quelle différence entre EgyptAir et Turkish Airlines pour Nairobi ?", "a": "Tarifs similaires, mais Turkish a un réseau plus dense (3 vols/jour Paris-Istanbul, 1-2 vols/jour Istanbul-Nairobi) et une meilleure ponctualité globale. EgyptAir a l'avantage de l'horaire (vol du soir Paris-Caire arrivant tôt matin pour correspondance Nairobi midi). Niveau juridique : ni l'un ni l'autre ne protègent le retour."},
    ],
    "related": [
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
        {"href": "/blog/turkish-airlines-vol-retarde-indemnite.html", "label": "Turkish Airlines : alternative via Istanbul"},
        {"href": "/blog/ethiopian-airlines-vol-retarde-indemnite.html", "label": "Ethiopian Airlines : alternative via Addis"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/circonstances-extraordinaires-ce261.html", "label": "Circonstances extraordinaires"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : Folkerts"},
    ],
},

# 7. South African Airways
{
    "slug": "south-african-airways-vol-retarde-indemnite",
    "nom": "South African Airways",
    "hub": "Johannesburg",
    "hub_code": "JNB",
    "nationalite": "sud-africaine",
    "eu_compagnie": False,
    "title": "South African Airways vol retardé : indemnité CE 261 vers l'Afrique australe",
    "description": "South African Airways Francfort-Johannesburg retardé ? CE 261 protège l'aller depuis l'UE = 600€. Réseau Afrique australe et hub Johannesburg expliqués.",
    "quick_answer": "<strong>South African Airways (SA) est sud-africaine (non-UE), membre Star Alliance.</strong> Le CE 261 protège ses vols au départ d'aéroports européens (Francfort, Munich, Londres). Sur un Francfort-Johannesburg direct retardé de plus de 3h : 600 €. Le retour Johannesburg-Francfort n'est pas couvert. SA est en redressement opérationnel depuis 2021 — fiabilité variable.",
    "intro": "South African Airways (SAA, code IATA SA) est la compagnie nationale d'Afrique du Sud, basée à Johannesburg (JNB). Après un grave épisode de redressement (2019-2021), elle a relancé progressivement ses opérations long-courriers en 2022-2023. Elle dessert principalement le hub JNB depuis Francfort, et offre un réseau régional dense en Afrique australe (SADC) depuis Johannesburg.",
    "reseau": "SAA dessert principalement Francfort (FRA) comme route directe vers l'Europe (à la date de rédaction, le réseau européen est limité après le redressement). Réseau régional intense depuis Johannesburg : Le Cap (CPT), Durban (DUR), Port Elizabeth (PLZ), Lusaka (LUN), Harare (HRE), Maputo (MPM), Windhoek (WDH), Gaborone (GBE), Mauritius (MRU), Antananarivo (TNR), Lagos (LOS), Accra (ACC), Kinshasa (FIH), Nairobi (NBO), Entebbe (EBB), Dar es Salaam (DAR), Luanda (LAD), Sao Paulo (GRU), Perth (PER).",
    "routes": [
        {"route": "FRA → JNB (Francfort-Johannesburg direct)", "dist": "8 670", "indem": "600"},
        {"route": "FRA → JNB → CPT (avec correspondance)", "dist": "9 880", "indem": "600"},
        {"route": "FRA → JNB → MRU (Maurice)", "dist": "10 540", "indem": "600"},
        {"route": "FRA → JNB → WDH (Windhoek)", "dist": "9 750", "indem": "600"},
        {"route": "FRA → JNB → LUN (Lusaka)", "dist": "9 800", "indem": "600"},
        {"route": "FRA → JNB → TNR (Antananarivo)", "dist": "10 250", "indem": "600"},
        {"route": "FRA → JNB → HRE (Harare)", "dist": "9 540", "indem": "600"},
        {"route": "FRA → JNB → MPM (Maputo)", "dist": "9 110", "indem": "600"},
    ],
    "scenario": "Vol SA265 Francfort-Johannesburg retardé de 6h pour 'incident technique'. Vous arrivez à Johannesburg avec 6h de retard, manquez votre correspondance SAA vers Le Cap, réacheminement sur le vol suivant. Sur billet unique : 600 € par passager dus par SAA (distance > 3 500 km, retard > 3h à destination finale). SAA a une politique de remboursement CE 261 réactive depuis sa relance 2022, mais les délais peuvent être longs (90-150 jours).",
    "reclamation": "SAA dispose d'un service réclamations européen (basé à Francfort) accessible via le formulaire en ligne sur flysaa.com. Les réclamations CE 261 sont mieux traitées via ce service européen que via le service Afrique du Sud. Délais : 90 à 180 jours selon notre expérience.",
    "mediateur": None,
    "particularites": """<ul>
  <li><strong>En sortie de redressement</strong> : SAA opère un réseau réduit depuis 2022. Vérifier l'opérationnalité de votre route avant achat.</li>
  <li><strong>Membre Star Alliance</strong> : code-share avec Lufthansa (Star), Air China, Singapore Airlines, etc.</li>
  <li><strong>Hub Johannesburg (OR Tambo, JNB)</strong> : très bien équipé pour les correspondances, terminal international moderne.</li>
  <li><strong>Bagages</strong> : franchise généreuse 30 kg sur les vols long-courriers en éco.</li>
  <li><strong>Politique post-redressement</strong> : règlement des dossiers anciens (2019-2020) toujours en cours, vérifier auprès du curateur si litige ancien.</li>
</ul>""",
    "faq": [
        {"q": "South African Airways a-t-elle vraiment redémarré ses opérations long-courriers ?", "a": "Oui, mais à un rythme réduit. Depuis 2022, SAA a relancé Francfort-Johannesburg, et progressivement Perth (Australie) et Sao Paulo (Brésil). Le réseau européen est limité (pas de vol direct depuis Paris, Bruxelles, Amsterdam à ce jour). Pour aller en Afrique australe depuis Paris, comptez plutôt sur Air France (CDG-JNB), Lufthansa (FRA-JNB ou FRA-CPT), KLM (AMS-CPT)."},
        {"q": "Le retour Johannesburg-Francfort avec SAA est-il protégé ?", "a": "Non. SAA est non-européenne et le vol part hors UE. Pour le retour Johannesburg-Europe avec protection CE 261, préférez Lufthansa (vol FRA-JNB direct opéré par LH) ou KLM via Amsterdam."},
        {"q": "SAA est-elle membre d'une alliance ?", "a": "Oui, Star Alliance. Vos miles Lufthansa Miles & More, United MileagePlus, Singapore KrisFlyer fonctionnent. Code-share régulier avec Lufthansa sur Francfort-JNB."},
        {"q": "Quelle est l'alternative pour aller en Afrique du Sud depuis Paris ?", "a": "Air France (vol direct CDG-JNB quotidien) = meilleure protection juridique. Lufthansa via FRA. KLM via AMS. Turkish via IST (tarifs compétitifs, retour non protégé). Qatar via DOH (tarifs compétitifs, retour non protégé)."},
        {"q": "Si mon vol SAA est annulé, puis-je être réacheminé sur Lufthansa gratuitement ?", "a": "Sur billet unique avec SAA, oui : SAA doit vous réacheminer 'dans des conditions de transport comparables' selon CE 261 art. 8. Comme SAA et Lufthansa sont toutes deux Star Alliance, un transfert vers LH est facilité. Vous pouvez exiger un réacheminement plus tôt sur une autre compagnie même non-Star (Air France, Emirates) si SAA n'a pas d'option rapide."},
    ],
    "related": [
        {"href": "/blog/vol-retarde-johannesburg-paris-indemnite.html", "label": "Vol Johannesburg-Paris retardé : vos droits"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/qatar-airways-vol-retarde-indemnite.html", "label": "Qatar Airways : alternative via Doha"},
        {"href": "/blog/emirates-vol-retarde-indemnite.html", "label": "Emirates : alternative via Dubaï"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : Folkerts"},
    ],
},

# 8. TUI fly
{
    "slug": "tui-fly-vol-retarde-indemnite",
    "nom": "TUI fly",
    "hub": "Bruxelles + Paris-Orly",
    "hub_code": "BRU/ORY",
    "nationalite": "belge/française (groupe TUI Allemagne)",
    "eu_compagnie": True,
    "title": "TUI fly vol retardé : indemnité CE 261 sur les routes Europe-Maghreb/Sahel",
    "description": "TUI fly Bruxelles-Marrakech ou Paris-Dakar retardé ? Compagnie EU : CE 261 vous protège aller ET retour. Routes Maghreb, Sahel, Antilles détaillées.",
    "quick_answer": "<strong>TUI fly est une compagnie européenne</strong> (TUI fly Belgium et TUI Airlines basées en UE). Le CE 261 protège ses vols <strong>aller ET retour</strong>, partout où elle opère. Bruxelles-Marrakech retardé de 4h = <strong>400 €</strong> par passager. Paris-Dakar retardé de 4h = <strong>600 €</strong>. TUI fly est très utilisée pour les vols charters et low-cost vers le Maghreb et le Sahel.",
    "intro": "TUI fly est une famille de compagnies européennes appartenant au groupe TUI (Allemagne) : TUI fly Belgium (basée à Bruxelles BRU + Paris-Orly ORY), TUI Airlines Nederland (AMS), TUI fly Deutschland (HAJ/FRA/DUS), TUI Airways UK. Pour les vols Europe-Afrique, TUI fly Belgium est la plus active depuis BRU et ORY, desservant le Maghreb, le Sénégal et plusieurs destinations charters saisonnières.",
    "reseau": "TUI fly Belgium dessert : Maroc (Casablanca CMN, Marrakech RAK, Tanger TNG, Agadir AGA, Oujda OUD, Nador NDR), Tunisie (Tunis TUN, Djerba DJE), Algérie (Alger ALG saisonnier), Sénégal (Dakar DSS), Cap-Vert (Sal SID, Boa Vista BVC), Égypte (Hurghada HRG, Sharm el-Sheikh SSH), et destinations charters. TUI Airways UK dessert également Banjul (BJL) en Gambie.",
    "routes": [
        {"route": "BRU → CMN (Casablanca)", "dist": "1 950", "indem": "400"},
        {"route": "BRU → RAK (Marrakech)", "dist": "2 130", "indem": "400"},
        {"route": "BRU → AGA (Agadir)", "dist": "2 390", "indem": "400"},
        {"route": "ORY → CMN (Paris Orly-Casablanca)", "dist": "1 880", "indem": "400"},
        {"route": "ORY → DSS (Paris Orly-Dakar)", "dist": "4 200", "indem": "600"},
        {"route": "BRU → DSS (Bruxelles-Dakar)", "dist": "4 270", "indem": "600"},
        {"route": "BRU → TUN (Tunis)", "dist": "1 480", "indem": "250"},
        {"route": "BRU → SID (Sal, Cap-Vert)", "dist": "3 680", "indem": "600"},
    ],
    "scenario": "Vol TB121 Bruxelles-Marrakech retardé de 4h30 pour 'attente d'équipage'. Vous arrivez à Marrakech avec 4h30 de retard. TUI fly Belgium étant une compagnie EU (Belgique), le CE 261 s'applique pleinement : 400 € par passager (distance 1 500-3 500 km, retard > 4h = indemnité pleine). Si retard 3-4h sur cette distance, indemnité quand même 400 € pleine (la réduction de 50% ne s'applique qu'au long-courrier > 3 500 km).",
    "reclamation": "TUI fly Belgium dispose d'un formulaire en ligne dédié CE 261 sur tuifly.be/fr (rubrique 'Service client → Plainte vol'). Délais : 30 à 60 jours, généralement respectés. La compagnie est adhérente du Médiateur belge des consommateurs et accessible aux médiations européennes.",
    "mediateur": "Service de Médiation Belge pour les Consommateurs (consumerombudsman.be) ou Médiateur du Tourisme et du Voyage (MTV) pour les clients français",
    "particularites": """<ul>
  <li><strong>Compagnie européenne</strong> : protection CE 261 totale aller + retour, point clé pour la diaspora maghrébine.</li>
  <li><strong>Forte présence charter</strong> : sur les vols charter (forfaits TUI), les obligations CE 261 s'appliquent aussi (ne pas se laisser dire le contraire).</li>
  <li><strong>Flotte Boeing 737-800 et 737 MAX</strong> : rotations intenses, retards opérationnels notables en été.</li>
  <li><strong>Pas de service à bord inclus</strong> en classe éco standard : pas pris en compte dans le CE 261, mais bon à savoir.</li>
  <li><strong>Code-share limité</strong> : peu d'alliances, achetez en direct sur tuifly.be ou tuifly.fr.</li>
</ul>""",
    "faq": [
        {"q": "TUI fly est-elle vraiment une compagnie européenne ?", "a": "Oui. TUI fly Belgium est une compagnie belge titulaire d'une licence d'exploitation belge (EU). TUI Airlines Nederland est néerlandaise. TUI fly Deutschland est allemande. Toutes sont des compagnies EU au sens du règlement CE 261. La maison-mère est en Allemagne (TUI AG)."},
        {"q": "Vol charter TUI annulé moins de 14 jours avant : indemnité ?", "a": "Oui, 400 € (moyen-courrier) ou 600 € (long-courrier) selon la distance. Le CE 261 art. 5 s'applique aux vols charters comme aux vols réguliers, à condition qu'il s'agisse d'une compagnie aérienne identifiable (TUI fly Belgium par ex.) opérant le vol. Le fait que le vol fasse partie d'un forfait touristique TUI ne change rien."},
        {"q": "Le retour Dakar-Bruxelles avec TUI fly est-il protégé ?", "a": "<strong>Oui</strong>. TUI fly Belgium étant une compagnie EU, le CE 261 protège le vol même au départ hors UE. C'est l'avantage majeur de choisir une compagnie EU pour les destinations africaines : protection totale aller-retour."},
        {"q": "TUI a perdu mes bagages au retour de Marrakech. Indemnité ?", "a": "Pour les bagages, c'est la Convention de Montréal qui s'applique (et non le CE 261 qui couvre les retards/annulations de vol). Indemnité maximum : 1 519 DTS (~1 850 €) sur dommages prouvés (factures, achats de remplacement). Réclamation à faire sous 7 jours pour les dégâts, 21 jours pour la perte définitive."},
        {"q": "TUI fly est-elle plus chère ou moins chère qu'Air France pour Casablanca ?", "a": "TUI fly est généralement <strong>moins chère</strong> sur les routes Maroc (Casablanca, Marrakech, Agadir) — souvent 30-50% moins cher en haute saison. Air France offre plus de service à bord et plus de fréquences. Pour la protection juridique, les deux sont équivalentes (compagnies EU)."},
    ],
    "related": [
        {"href": "/blog/vol-retarde-casablanca-paris-indemnite.html", "label": "Vol Casablanca-Paris retardé : vos droits"},
        {"href": "/blog/royal-air-maroc-vol-retarde-indemnite.html", "label": "Royal Air Maroc : alternative non-EU"},
        {"href": "/blog/brussels-airlines-vol-retarde-indemnite.html", "label": "Brussels Airlines : autre compagnie belge"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/circonstances-extraordinaires-ce261.html", "label": "Circonstances extraordinaires"},
        {"href": "/blog/billet-unique-vs-billets-separes-ce261-correspondance.html", "label": "Billet unique vs séparé"},
    ],
},

# 9. Tunisair
{
    "slug": "tunisair-vol-retarde-indemnite",
    "nom": "Tunisair",
    "hub": "Tunis",
    "hub_code": "TUN",
    "nationalite": "tunisienne",
    "eu_compagnie": False,
    "title": "Tunisair vol retardé : indemnité CE 261 sur les routes Europe-Tunisie",
    "description": "Tunisair Paris-Tunis ou Bruxelles-Djerba retardé ? CE 261 protège l'aller depuis l'UE. Retour Tunis-Paris non couvert. Routes, droits et démarches.",
    "quick_answer": "<strong>Tunisair (TU) est tunisienne (non-UE)</strong>. Le CE 261 s'applique sur ses vols au départ d'aéroports européens (Paris CDG/ORY, Marseille, Lyon, Bruxelles, etc.). Paris-Tunis retardé de plus de 3h à l'arrivée : <strong>250 €</strong> par passager (vol < 1 500 km). Le retour Tunis-Paris n'est <strong>pas couvert</strong> par le CE 261. Pour le retour avec protection : préférez Air France, Transavia, ou Vueling.",
    "intro": "Tunisair (TU) est la compagnie nationale de la Tunisie, basée à l'aéroport Tunis-Carthage (TUN). Elle opère depuis des décennies les liaisons Europe-Tunisie pour la diaspora tunisienne et les touristes. Tunisair traverse depuis 2015-2020 des difficultés financières et opérationnelles : la ponctualité moyenne est faible (~65%) et les retards récurrents sont fréquents, ce qui rend les dossiers CE 261 nombreux.",
    "reseau": "Tunisair dessert depuis Tunis (TUN) : Paris (CDG + ORY), Marseille (MRS), Lyon (LYS), Nice (NCE), Toulouse (TLS), Strasbourg (SXB), Bordeaux (BOD), Bruxelles (BRU), Genève (GVA), Zurich (ZRH), Francfort (FRA), Milan (MXP), Rome (FCO), Madrid (MAD), Barcelone (BCN), Londres (LHR), Istanbul (IST), Le Caire (CAI), Dakar (DKR), Casablanca (CMN), Tripoli (TIP), Alger (ALG). Vols intérieurs : Djerba (DJE), Tozeur (TOE), Sfax (SFA), Gabès (GAE).",
    "routes": [
        {"route": "CDG → TUN", "dist": "1 480", "indem": "250"},
        {"route": "ORY → TUN", "dist": "1 470", "indem": "250"},
        {"route": "MRS → TUN", "dist": "1 050", "indem": "250"},
        {"route": "LYS → TUN", "dist": "1 290", "indem": "250"},
        {"route": "BRU → TUN", "dist": "1 690", "indem": "400"},
        {"route": "ORY → DJE (Djerba)", "dist": "1 900", "indem": "400"},
        {"route": "BRU → DJE", "dist": "2 130", "indem": "400"},
        {"route": "MRS → DJE", "dist": "1 580", "indem": "400"},
    ],
    "scenario": "Vol TU713 Paris-Tunis retardé de 5h pour 'maintenance imprévue'. Vous arrivez à Tunis avec 5h de retard. Vol < 1 500 km : indemnité 250 € par passager (CE 261 art. 7.1.a). Tunisair a tendance à invoquer des 'circonstances extraordinaires' ou à proposer un avoir / bon de transport, mais le passager peut exiger le cash. Délais de traitement long (souvent > 6 mois) — penser à la procédure DGAC ou tribunal de proximité en cas de blocage.",
    "reclamation": "Tunisair accepte les réclamations via un formulaire sur tunisair.com (rubrique 'Réclamation') ou par e-mail à reclamation@tunisair.com.tn. Les délais sont très longs (souvent 6 à 12 mois). Adhérente du Médiateur du Tourisme et du Voyage (MTV) en France.",
    "mediateur": "Médiateur du Tourisme et du Voyage (MTV)",
    "particularites": """<ul>
  <li><strong>Compagnie en difficulté</strong> : restructuration en cours, retards et annulations fréquents, flotte vieillissante.</li>
  <li><strong>Tarifs souvent compétitifs</strong> mais ponctualité faible — toujours prévoir une marge.</li>
  <li><strong>Pas membre d'alliance majeure</strong>.</li>
  <li><strong>Service client souvent saturé</strong> — privilégier les démarches écrites tracées.</li>
  <li><strong>Recours efficace via MTV</strong> en cas de blocage en France.</li>
</ul>""",
    "faq": [
        {"q": "Tunisair refuse en disant que le retard est dû à la 'situation du Magreb'. C'est valable ?", "a": "Non, sauf preuve d'un événement spécifique (grève contrôleurs aériens tunisiens, fermeture aéroport, attentat). Une simple 'situation' n'est pas une circonstance extraordinaire. Demandez par écrit la cause précise et documentée. Si Tunisair invoque une grève, vérifiez auprès des syndicats tunisiens ou via la presse spécialisée."},
        {"q": "Tunisair m'a proposé un bon d'achat à la place de l'indemnité cash. Valable ?", "a": "Non, sauf accord écrit explicite de votre part. Article 7.3 du CE 261 : indemnité versée en cash (virement ou chèque) par défaut. Refusez tout bon d'achat si vous préférez le numéraire. Un bon Tunisair vaut souvent moins que le cash car l'utilisation est contrainte."},
        {"q": "Combien de temps Tunisair met-elle pour traiter une réclamation CE 261 ?", "a": "Très long : 6 à 12 mois en pratique. Si vous n'avez pas de réponse au-delà de 60 jours, saisissez le <a href=\"https://www.mtv.travel/\" target=\"_blank\" rel=\"noopener external\">Médiateur du Tourisme et du Voyage (MTV)</a> auquel Tunisair est adhérente. Le MTV peut significativement accélérer le dossier."},
        {"q": "Le retour Tunis-Paris avec Tunisair est-il protégé par le CE 261 ?", "a": "Non. Tunisair est non-européenne et le vol part hors UE. Pour un retour Tunis-Paris protégé, choisissez Air France (vol direct), Transavia (low-cost EU), ou Nouvelair (compagnie tunisienne mais avec service correct)."},
        {"q": "Tunisair est-elle moins fiable que Royal Air Maroc ?", "a": "Statistiquement, oui (ponctualité ~65% vs ~70-75% pour RAM en 2024). Tunisair traverse une période de restructuration depuis plusieurs années. Pour les voyageurs réguliers Maghreb, vérifier l'opérationnalité de la route choisie avant achat (sites comme FlightAware donnent les historiques de ponctualité par numéro de vol)."},
    ],
    "related": [
        {"href": "/blog/vol-retarde-tunis-paris-indemnite.html", "label": "Vol Tunis-Paris retardé : vos droits"},
        {"href": "/blog/royal-air-maroc-vol-retarde-indemnite.html", "label": "Royal Air Maroc : compagnie maghrebine concurrente"},
        {"href": "/blog/tui-fly-vol-retarde-indemnite.html", "label": "TUI fly : alternative EU pour le Maghreb"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
        {"href": "/blog/circonstances-extraordinaires-ce261.html", "label": "Circonstances extraordinaires"},
    ],
},
]

# Construire la liste finale avec body_html générique
LOT2 = []
for c in COMPAGNIES:
    art = {
        "slug": c["slug"],
        "title": c["title"],
        "description": c["description"],
        "h1": c.get("h1", c["title"]),
        "quick_answer": c["quick_answer"],
        "body_html": body_compagnie(c),
        "faq": c["faq"],
        "related": c["related"],
    }
    LOT2.append(art)

if __name__ == "__main__":
    write_all(LOT2, "LOT 2")

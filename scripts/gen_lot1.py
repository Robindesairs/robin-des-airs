"""LOT 1 — 4 articles GOTCHA AEO sur les correspondances Afrique."""
from _gen_template import write_all

LOT1 = [
# ============================================================================
# Article 1.1 — Compagnies non-EU
# ============================================================================
{
    "slug": "ce261-compagnies-non-eu-emirates-turkish-qatar",
    "title": "CE 261 et compagnies non-UE : Emirates, Turkish, Qatar, RAM — êtes-vous protégé ?",
    "description": "Votre vol Emirates, Turkish Airlines, Qatar Airways ou Royal Air Maroc vers l'Afrique est-il couvert par le CE 261 ? Règle complète selon direction + compagnie + hub.",
    "h1": "CE 261 et compagnies non-UE : Emirates, Turkish, Qatar, RAM — êtes-vous vraiment protégé ?",
    "quick_answer": "Le CE 261/2004 s'applique <strong>au départ d'un aéroport de l'UE quelle que soit la compagnie</strong> (vol Paris→Dubaï avec Emirates = couvert) <strong>OU à l'arrivée dans l'UE seulement si la compagnie est européenne</strong> (Dubaï→Paris avec Emirates = non couvert ; Dubaï→Paris avec Air France = couvert). Cette règle est mal comprise et fait perdre des milliers d'euros aux passagers de la diaspora.",
    "body_html": """<p>C'est <strong>le piège n°1</strong> des vols vers l'Afrique en correspondance : croire qu'on est protégé par le règlement européen <a href="https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32004R0261" target="_blank" rel="noopener external">CE 261/2004</a> parce qu'on a réservé via un site français ou parce que le vol part de Paris. La réalité est plus subtile, et beaucoup de passagers — surtout sur les axes Europe ↔ Afrique en transit par Dubaï, Istanbul, Doha ou Casablanca — ratent des indemnités auxquelles ils auraient eu droit, OU réclament alors qu'ils n'y ont pas droit.</p>

<h2>La règle légale en 2 lignes</h2>
<p>Le <strong>règlement CE 261/2004</strong> s'applique dans <strong>deux cas seulement</strong> (article 3) :</p>
<ul>
  <li><strong>Cas A — Vol au départ d'un aéroport de l'UE</strong> : couvert <strong>quelle que soit la compagnie</strong> (européenne ou non).</li>
  <li><strong>Cas B — Vol à l'arrivée dans un aéroport de l'UE</strong> : couvert <strong>uniquement si la compagnie est européenne</strong> (titulaire d'une licence d'exploitation délivrée par un État membre).</li>
</ul>
<blockquote><strong>Conséquence directe :</strong> les compagnies non-UE (Emirates, Turkish, Qatar, Etihad, RAM, Ethiopian, Kenya Airways, EgyptAir, etc.) ne sont JAMAIS responsables au titre du CE 261 sur leurs vols au départ de leur hub. Seul le trajet UE → leur hub est protégé.</blockquote>

<h2>Les 9 compagnies non-UE les plus utilisées vers l'Afrique</h2>
<table>
  <tr><th>Compagnie</th><th>Hub principal</th><th>Vol au départ UE</th><th>Vol au retour vers UE</th></tr>
  <tr><td>Emirates</td><td>Dubaï (DXB)</td><td>✔ Couvert</td><td>✘ Non couvert</td></tr>
  <tr><td>Qatar Airways</td><td>Doha (DOH)</td><td>✔ Couvert</td><td>✘ Non couvert</td></tr>
  <tr><td>Etihad Airways</td><td>Abu Dhabi (AUH)</td><td>✔ Couvert</td><td>✘ Non couvert</td></tr>
  <tr><td>Turkish Airlines</td><td>Istanbul (IST)</td><td>✔ Couvert</td><td>✘ Non couvert</td></tr>
  <tr><td>Royal Air Maroc</td><td>Casablanca (CMN)</td><td>✔ Couvert</td><td>✘ Non couvert</td></tr>
  <tr><td>Ethiopian Airlines</td><td>Addis-Abeba (ADD)</td><td>✔ Couvert</td><td>✘ Non couvert</td></tr>
  <tr><td>Kenya Airways</td><td>Nairobi (NBO)</td><td>✔ Couvert</td><td>✘ Non couvert</td></tr>
  <tr><td>EgyptAir</td><td>Le Caire (CAI)</td><td>✔ Couvert</td><td>✘ Non couvert</td></tr>
  <tr><td>South African Airways</td><td>Johannesburg (JNB)</td><td>✔ Couvert</td><td>✘ Non couvert</td></tr>
</table>

<h2>Cas concret 1 — Paris → Dubaï → Nairobi avec Emirates (billet unique)</h2>
<p>Vous partez de CDG avec Emirates, escale à DXB, arrivée à Nairobi. Vol retardé de 5h à NBO. Que se passe-t-il ?</p>
<ul>
  <li>Vol part de l'UE (CDG) → CE 261 s'applique sur l'ensemble du voyage (jurisprudence <a href="https://curia.europa.eu/juris/document/document.jsf?docid=134201&doclang=FR" target="_blank" rel="noopener external">CJUE Folkerts C-11/11</a>).</li>
  <li>Distance Paris → Nairobi = 6 484 km → palier long-courrier.</li>
  <li><strong>Indemnité : 600 € par passager</strong>, due par Emirates.</li>
</ul>

<h2>Cas concret 2 — Nairobi → Dubaï → Paris avec Emirates (retour)</h2>
<p>Même itinéraire en sens inverse. Vol retardé de 6h à CDG. Que se passe-t-il ?</p>
<ul>
  <li>Vol part hors UE (NBO), compagnie non-UE (Emirates) → CE 261 ne s'applique <strong>pas</strong>.</li>
  <li>Vous n'avez droit qu'à la <a href="https://www.icao.int/secretariat/legal/list%20of%20parties/mtl99_fr.pdf" target="_blank" rel="noopener external">Convention de Montréal</a> (dommages prouvés uniquement, pas d'indemnité forfaitaire).</li>
  <li><strong>Indemnité CE 261 : 0 €.</strong> Seule l'assurance voyage peut couvrir.</li>
</ul>

<h2>Cas concret 3 — Le piège du billet retour</h2>
<p>Vous achetez un aller-retour Paris ↔ Abidjan avec Royal Air Maroc (escale à Casablanca). À l'aller, vol retardé de 4h à l'arrivée : couvert (départ CDG). Au retour, vol retardé de 4h à CDG : <strong>pas couvert</strong> (départ ABJ + compagnie non-UE).</p>
<blockquote><strong>Conséquence :</strong> sur un même billet aller-retour, vous pouvez avoir droit à 600 € à l'aller et 0 € au retour, pour exactement le même type d'incident. La règle dépend du <strong>sens du vol</strong> et de la <strong>nationalité de la compagnie</strong>.</blockquote>

<h2>Comment retourner la règle à votre avantage</h2>
<p>3 leviers existent pour maximiser votre protection :</p>
<ol>
  <li><strong>Privilégier les compagnies européennes au retour</strong> : Air France, KLM, Brussels Airlines, Lufthansa, TAP, Iberia, ITA. Si vous prenez Air France au retour DXB → CDG, c'est couvert.</li>
  <li><strong>Acheter un billet unique avec une compagnie EU</strong> qui sous-traite la jambe vers l'Afrique en code-share : Air France et KLM ont des partenariats avec Kenya Airways, RAM, etc.</li>
  <li><strong>Conserver une assurance voyage</strong> qui prend le relais pour les segments non couverts par CE 261.</li>
</ol>

<h2>Que faire si vous êtes dans un cas couvert ?</h2>
<p>Si votre vol est éligible (cas A ou cas B applicable), suivez ces étapes :</p>
<ol>
  <li>Conservez tout : carte d'embarquement, e-mails de la compagnie, photos des écrans d'affichage à l'aéroport, reçus repas/hôtel.</li>
  <li>Envoyez une <a href="/blog/lettre-mise-en-demeure-compagnie-aerienne-modele.html">mise en demeure formelle</a> à la compagnie sous 30 jours.</li>
  <li>En cas de refus, saisissez la <a href="https://www.ecologie.gouv.fr/direction-generale-laviation-civile-dgac" target="_blank" rel="noopener external">DGAC</a> ou le tribunal de proximité.</li>
  <li>Ou confiez votre dossier à Robin des Airs : <a href="/depot-en-ligne.html">dépôt en ligne</a>, 0 € si pas de récupération.</li>
</ol>""",
    "faq": [
        {"q": "Emirates est-elle couverte par le CE 261 ?", "a": "Oui sur les vols au départ d'un aéroport de l'UE (Paris, Bruxelles, Amsterdam, Lisbonne, etc.). Non sur les vols au départ de Dubaï ou de toute destination hors UE. Pour un Paris-Dubaï-Nairobi en billet unique, l'ensemble du voyage est couvert (jurisprudence Folkerts), avec Emirates comme transporteur responsable."},
        {"q": "Si je prends Turkish Airlines pour aller à Dakar via Istanbul, suis-je couvert pour toute la durée ?", "a": "Oui si vous avez un <strong>billet unique</strong> CDG → IST → DKR. Le CE 261 couvre l'ensemble du voyage car le départ a lieu de l'UE (CDG). L'indemnité se calcule sur la distance totale Paris-Dakar (4 208 km) = 600 € si l'arrivée finale dépasse 3h de retard. Si vous avez deux billets séparés (CDG→IST puis IST→DKR), seul le premier segment est protégé."},
        {"q": "Royal Air Maroc protège-t-elle au retour Casablanca-Paris ?", "a": "Non. RAM est marocaine, donc non-européenne. Sur un vol Casablanca-Paris opéré par RAM, le CE 261 ne s'applique pas (départ hors UE + compagnie non-UE). Seule une compagnie EU (Air France, Transavia, Iberia) protègerait ce trajet. À l'aller (Paris-Casablanca avec RAM), oui couvert."},
        {"q": "Pour être sûr d'être protégé au retour vers l'Europe, quelle compagnie choisir ?", "a": "Choisissez une compagnie de l'UE (titulaire d'une licence européenne) : Air France, KLM, Brussels Airlines, Lufthansa, TAP Air Portugal, Iberia, ITA Airways, LOT, etc. Sur un vol Nairobi-Paris avec Air France, vous êtes couvert même si le vol part hors UE — car la compagnie est européenne. C'est le seul cas où la nationalité de la compagnie compte."},
        {"q": "Le CE 261 s'applique-t-il sur un vol intérieur africain opéré par une compagnie européenne ?", "a": "Non. Un vol Abidjan-Dakar opéré par Air France (cas théorique) ou par Brussels Airlines ne serait pas couvert : ni le départ ni l'arrivée ne sont dans l'UE. Le critère est géographique (UE) ET juridictionnel (compagnie EU pour le cas B). Pour un vol totalement hors UE, seules les conventions internationales (Montréal pour les bagages, Varsovie résiduellement) s'appliquent."},
    ],
    "related": [
        {"href": "/blog/billet-unique-vs-billets-separes-ce261-correspondance.html", "label": "Billet unique vs billets séparés : le piège des correspondances"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : à qui réclamer l'indemnité ? (Folkerts)"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique : protection CE 261"},
        {"href": "/blog/emirates-vol-retarde-indemnite.html", "label": "Emirates : vos droits CE 261 sur les vols Afrique"},
        {"href": "/blog/royal-air-maroc-vol-retarde-indemnite.html", "label": "Royal Air Maroc : retard et indemnité depuis l'UE"},
        {"href": "/blog/turkish-airlines-vol-retarde-indemnite.html", "label": "Turkish Airlines via Istanbul : vos droits"},
    ],
},

# ============================================================================
# Article 1.2 — Billet unique vs billets séparés
# ============================================================================
{
    "slug": "billet-unique-vs-billets-separes-ce261-correspondance",
    "title": "Billet unique vs billets séparés : le piège qui annule votre CE 261",
    "description": "Sur une correspondance vers l'Afrique, un billet unique vous protège, deux billets séparés vous laissent seul. Comment vérifier + comment éviter le piège.",
    "h1": "Billet unique vs billets séparés : le piège qui annule votre CE 261",
    "quick_answer": "Sur une correspondance, le règlement <strong>CE 261/2004 ne s'applique à l'ensemble du voyage que si vous avez un <em>billet unique</em></strong> (un seul numéro de réservation, PNR). Avec deux billets séparés, chaque segment est juridiquement indépendant : un retard sur le premier ne donne aucun droit sur la correspondance ratée du second. Cette nuance fait perdre des centaines d'euros sans que les passagers le sachent.",
    "body_html": """<p>Vous achetez un Paris-Dakar via Casablanca. Le premier vol arrive en retard, vous ratez la correspondance. La compagnie du deuxième vol refuse de vous indemniser ou de vous réacheminer gratuitement. Légalement, elle a probablement raison — et la raison s'appelle <strong>billet séparé</strong>.</p>

<h2>La différence fondamentale</h2>
<p>Il existe deux types de réservations sur une correspondance :</p>

<h3>1. Billet unique (one ticket / through ticket)</h3>
<ul>
  <li>Un seul numéro de réservation (PNR : Passenger Name Record).</li>
  <li>Tous les segments figurent sur une même carte d'embarquement ou un même e-ticket.</li>
  <li>La compagnie qui vend le billet est responsable de l'ensemble du voyage jusqu'à la destination finale.</li>
  <li>Application complète du CE 261 (arrêt <a href="https://curia.europa.eu/juris/document/document.jsf?docid=134201&doclang=FR" target="_blank" rel="noopener external">CJUE C-11/11 Folkerts</a>) : c'est l'heure d'arrivée à la destination finale qui compte.</li>
</ul>

<h3>2. Billets séparés (self-connect)</h3>
<ul>
  <li>Deux (ou plus) réservations indépendantes avec deux numéros différents.</li>
  <li>Souvent achetés sur deux sites distincts, ou via des comparateurs low-cost (Skyscanner self-connect, Kiwi.com).</li>
  <li>Chaque compagnie est responsable <strong>uniquement de son segment</strong>.</li>
  <li>Si vous ratez la correspondance à cause du retard du premier vol, la deuxième compagnie n'a aucune obligation envers vous (ni réacheminement, ni hébergement, ni remboursement). Vous êtes considéré comme <strong>no-show</strong>.</li>
</ul>

<blockquote><strong>Exemple chiffré :</strong> Paris-Bamako via Casablanca, retard de 4h sur le segment Paris-Casablanca, correspondance manquée. Avec billet unique : 600 € d'indemnité + réacheminement gratuit. Avec billets séparés : 0 € + obligation de racheter un billet Casablanca-Bamako au tarif du jour (souvent 400-700 €).</blockquote>

<h2>Comment vérifier que vous avez un billet unique</h2>
<p>Trois indices fiables :</p>
<ol>
  <li><strong>Un seul numéro de réservation (PNR)</strong> sur tout votre voyage. C'est le critère principal. Vérifiez votre e-mail de confirmation : si vous voyez un seul code (ex. ABC123 ou XYZW789), c'est un billet unique. Si vous en voyez deux ou plus, c'est séparé.</li>
  <li><strong>Un seul e-ticket</strong> énumérant tous les segments. Un billet unique liste vol 1 + vol 2 sur le même document, avec le même "ticket number" (commence souvent par le code IATA de la compagnie : 057 pour Air France, 074 pour KLM, etc.).</li>
  <li><strong>Bagages enregistrés jusqu'à la destination finale</strong> : si vos bagages sont "checked through" à la destination (vous n'avez pas à les récupérer à l'escale), c'est un billet unique. Sinon, billets séparés.</li>
</ol>

<h2>Pourquoi tant de passagers se font piéger</h2>
<p>Les comparateurs et plateformes low-cost (Kiwi, GoToGate, certains affichages Skyscanner) proposent souvent des "auto-connect" — c'est-à-dire qu'ils combinent deux billets séparés en les présentant comme un seul voyage. C'est juridiquement <strong>deux PNR distincts</strong>, même si l'interface affiche un seul prix.</p>

<h3>Signes d'alerte (vous êtes probablement sur billet séparé) :</h3>
<ul>
  <li>Mention "self-transfer" ou "transferts auto" sur l'écran de réservation.</li>
  <li>Le temps de correspondance proposé est inférieur au MCT officiel de l'aéroport (1h à CDG, 1h30 à BRU, 2h à CMN, etc.).</li>
  <li>Deux compagnies différentes ne faisant pas partie d'une alliance commune (ex. Easyjet + Royal Air Maroc).</li>
  <li>La plateforme propose une "assurance correspondance" (= aveu qu'il n'y a pas de protection légale).</li>
</ul>

<h2>Solution 1 — Acheter un billet unique vrai</h2>
<p>Sur les vols Europe-Afrique, les billets uniques les plus sûrs viennent :</p>
<ul>
  <li>Des sites officiels des compagnies (airfrance.fr, brusselsairlines.com, royalairmaroc.com, turkishairlines.com, etc.).</li>
  <li>Des agences IATA agréées qui émettent un seul ticket number.</li>
  <li>Des plateformes de réservation classiques (Expedia, Opodo, Lastminute) <strong>quand</strong> elles affichent un seul PNR (vérifier avant validation).</li>
</ul>

<h2>Solution 2 — Si vous avez déjà des billets séparés</h2>
<p>Vous pouvez réduire le risque :</p>
<ul>
  <li><strong>Marge confortable</strong> entre les deux vols : 3 à 4h minimum (pas le MCT légal qui est trop court).</li>
  <li><strong>Assurance correspondance manquée</strong> (souvent vendue à 10-30 € par les comparateurs ou par les assurances voyage premium).</li>
  <li><strong>Bagage cabine uniquement</strong> : vous ne perdez pas de temps au tapis bagages à l'escale.</li>
</ul>

<h2>Cas particulier : code-share et alliances</h2>
<p>Si les deux vols sont en code-share (vendus par une compagnie mais opérés par une autre, ex. Air France/KLM/Kenya Airways), ils sont en principe émis sur <strong>un seul ticket number</strong> et donc considérés comme billet unique. Vérifiez toujours le numéro de billet sur votre e-ticket, pas le numéro de vol.</p>

<p>Les alliances majeures (Star Alliance, SkyTeam, Oneworld) garantissent généralement la continuité de billet entre membres : Lufthansa + Ethiopian (Star), Air France + Kenya Airways (SkyTeam), British Airways + Royal Jordanian (Oneworld), etc.</p>""",
    "faq": [
        {"q": "Comment savoir si j'ai un billet unique ou deux billets séparés ?", "a": "Vérifiez votre e-mail de confirmation : si vous avez <strong>un seul numéro de réservation (PNR)</strong> et <strong>un seul ticket number</strong>, c'est un billet unique. Si vous voyez deux codes différents, ce sont deux billets séparés. Autre indice fiable : si vos bagages sont enregistrés jusqu'à la destination finale (sans récupération à l'escale), c'est un billet unique."},
        {"q": "Que se passe-t-il si je rate ma correspondance avec deux billets séparés ?", "a": "La deuxième compagnie vous considère comme <strong>no-show</strong>. Elle n'a aucune obligation : ni réacheminement, ni remboursement, ni hébergement. Vous devez racheter un billet plein tarif. Aucun recours possible auprès du transporteur du premier vol non plus, car son obligation se limite à son propre segment."},
        {"q": "Skyscanner et Kiwi vendent-ils des billets uniques ?", "a": "Pas systématiquement. Kiwi.com vend principalement des combinaisons en \"self-transfer\" (= billets séparés avec garantie commerciale Kiwi en cas de retard). Skyscanner est un comparateur : selon le revendeur affiché, vous obtiendrez un billet unique ou non. Vérifiez toujours le nombre de PNR sur la page de confirmation avant validation."},
        {"q": "Le code-share garantit-il un billet unique ?", "a": "Oui dans la quasi-totalité des cas. Si Air France vend un vol Paris-Nairobi opéré en code-share avec Kenya Airways (vol AF7878 = KQ565), le billet est unique : un seul PNR, un seul ticket number. La responsabilité repose sur le transporteur émetteur (Air France). Le code-share est même la meilleure protection pour les liaisons Europe-Afrique."},
        {"q": "Que dit exactement la jurisprudence européenne sur les correspondances ?", "a": "L'arrêt <a href=\"https://curia.europa.eu/juris/document/document.jsf?docid=134201&doclang=FR\" target=\"_blank\" rel=\"noopener external\">CJUE Folkerts (C-11/11, 2013)</a> est la référence : sur un billet unique avec correspondance, c'est <strong>l'heure d'arrivée à la destination finale</strong> qui détermine le droit à indemnité, pas l'heure d'arrivée à l'escale. Si vous arrivez à Bamako avec 4h de retard à cause d'un retard initial à Paris, vous avez droit à l'indemnité sur la distance totale. Cette jurisprudence ne s'applique qu'aux billets uniques."},
    ],
    "related": [
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE : qui est protégé ?"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : à qui réclamer ?"},
        {"href": "/blog/arret-folkerts-correspondance-cjue.html", "label": "L'arrêt Folkerts en détail (CJUE C-11/11)"},
        {"href": "/blog/correspondance-manquee-indemnite-vol.html", "label": "Correspondance manquée : vos droits complets"},
        {"href": "/blog/vol-direct-vs-correspondance-droits-ce261.html", "label": "Vol direct vs correspondance : différences"},
        {"href": "/blog/comparatif-10-hubs-afrique-ce261-fiabilite-retards.html", "label": "Comparatif des 10 hubs vers l'Afrique"},
    ],
},

# ============================================================================
# Article 1.3 — Correspondance ratée à qui réclamer (Folkerts appliqué)
# ============================================================================
{
    "slug": "correspondance-ratee-a-qui-reclamer-ce261-folkerts",
    "title": "Correspondance ratée à cause d'un retard : à qui réclamer l'indemnité CE 261 ?",
    "description": "Vol Paris-Dakar via Casablanca, retard au premier segment, correspondance ratée. À qui réclamer ? Le transporteur émetteur ou opérant ? Réponse claire avec Folkerts.",
    "h1": "Correspondance ratée à cause d'un retard : à qui réclamer votre indemnité CE 261 ?",
    "quick_answer": "Sur un <strong>billet unique</strong> avec correspondance, la réclamation se fait auprès de <strong>la compagnie qui a opéré le segment ayant causé le retard initial</strong> (transporteur effectif). C'est ce que confirme l'<a href=\"https://curia.europa.eu/juris/document/document.jsf?docid=134201&doclang=FR\" target=\"_blank\" rel=\"noopener external\">arrêt CJUE Folkerts C-11/11</a>. L'indemnité se calcule sur la distance totale jusqu'à la destination finale, pas sur le segment retardé.",
    "body_html": """<p>Le scénario est classique pour la diaspora ouest-africaine : Paris-Dakar via Casablanca avec Royal Air Maroc, vol Paris-Casablanca retardé de 2h30, correspondance ratée à CMN, arrivée à Dakar avec 8h de retard. Qui paie ? Combien ? Comment réclamer ? Voici la marche à suivre exacte, fondée sur la jurisprudence européenne.</p>

<h2>La règle de base : l'heure d'arrivée à la destination FINALE</h2>
<p>L'arrêt de référence est <strong><a href="https://curia.europa.eu/juris/document/document.jsf?docid=134201&doclang=FR" target="_blank" rel="noopener external">CJUE Folkerts C-11/11</a></strong> rendu le 26 février 2013. La Cour de justice de l'Union européenne a tranché de façon définitive :</p>
<blockquote>« <strong>Le passager qui, après avoir manqué une correspondance, arrive à sa destination finale avec un retard égal ou supérieur à trois heures par rapport à l'heure d'arrivée initialement prévue, a droit à une indemnisation</strong> au titre du règlement n° 261/2004. »</blockquote>
<p>Cela signifie deux choses fondamentales :</p>
<ul>
  <li>Ce n'est PAS le retard au moment de l'escale qui compte, mais le retard à la <strong>destination finale</strong>.</li>
  <li>L'indemnité se calcule sur la <strong>distance totale</strong> du voyage (calcul orthodromique entre aéroport de départ et destination finale), pas sur la distance du segment retardé.</li>
</ul>

<h2>Qui est responsable ?</h2>
<p>L'article 2(b) du règlement définit le <strong>« transporteur aérien effectif »</strong> comme « un transporteur aérien qui réalise ou a l'intention de réaliser un vol dans le cadre d'un contrat avec un passager ou au nom d'une autre personne ». Concrètement :</p>

<h3>Cas 1 — Même compagnie pour tous les segments</h3>
<p>Exemple : Paris-Casablanca-Dakar entièrement opéré par Royal Air Maroc. La réclamation va à RAM. Simple.</p>

<h3>Cas 2 — Deux compagnies différentes (billet unique en code-share)</h3>
<p>Exemple : Paris-Amsterdam avec Air France (AF1240), Amsterdam-Nairobi avec KLM (KL565), billet unique vendu par Air France. Si le retard vient du premier segment Air France :</p>
<ul>
  <li>La <strong>compagnie responsable est Air France</strong> (transporteur effectif du segment retardé).</li>
  <li>Mais vous pouvez aussi déposer la réclamation auprès de KLM (transporteur du segment où vous arrivez à destination), qui transmettra à Air France.</li>
</ul>
<blockquote>La jurisprudence accepte les deux saisines. En pratique, réclamer auprès de la compagnie qui a vendu le billet (transporteur contractuel) est souvent le plus efficace, car elle gère le dossier sur l'ensemble du voyage.</blockquote>

<h3>Cas 3 — Vol affrété ou opéré par un sous-traitant (wet lease)</h3>
<p>Exemple : vol AF affiché Paris-Tunis mais opéré par une compagnie sous-traitante (Eurowings, Air Algérie, etc.). La réclamation va au transporteur qui apparaît comme <strong>opérateur effectif</strong> sur la carte d'embarquement, pas au vendeur du billet.</p>

<h2>Combien réclamer ?</h2>
<p>L'indemnité dépend de la <strong>distance totale</strong> entre l'aéroport de départ et la destination finale :</p>
<table>
  <tr><th>Distance totale (orthodromique)</th><th>Indemnité CE 261</th></tr>
  <tr><td>Jusqu'à 1 500 km</td><td>250 €</td></tr>
  <tr><td>1 500 à 3 500 km (et tous les vols intra-UE > 1 500 km)</td><td>400 €</td></tr>
  <tr><td>Plus de 3 500 km (vols extra-UE)</td><td>600 €</td></tr>
</table>
<p>Pour une correspondance, la distance se mesure entre l'aéroport de départ initial et la destination finale, <strong>en ligne droite</strong>, peu importe le détour de l'escale. Paris-Casablanca = 1 869 km. Casablanca-Dakar = 2 074 km. Mais Paris-Dakar en ligne droite = 4 208 km → palier 600 €.</p>

<h2>Réduction de 50% : quand ?</h2>
<p>Si la compagnie vous réacheminée et que votre retard à destination finale est <strong>compris entre 3h et 4h pour un long-courrier</strong> (> 3 500 km), l'indemnité est réduite de moitié : 300 € au lieu de 600 €. Au-delà de 4h, indemnité pleine.</p>
<p>Pour les vols moyen-courriers (1 500 à 3 500 km), pas de réduction : 400 € pleins dès 3h de retard.</p>

<h2>Démarche concrète pour réclamer</h2>
<ol>
  <li><strong>Constituez votre dossier</strong> : carte(s) d'embarquement, e-ticket avec tous les segments, e-mail de confirmation du PNR unique, photos des écrans d'affichage retard à l'escale, justificatif d'arrivée à destination (tampon passeport ou photo du tapis bagages avec horodatage).</li>
  <li><strong>Calculez la distance totale</strong> avec un calculateur orthodromique (ex. <em>gcmap.com</em> ou outil DGAC). Vérifiez le palier d'indemnité correspondant.</li>
  <li><strong>Identifiez le transporteur opérant</strong> du segment qui a causé le retard initial (vérifiez le numéro de vol sur la carte d'embarquement).</li>
  <li><strong>Envoyez une <a href="/blog/lettre-mise-en-demeure-compagnie-aerienne-modele.html">mise en demeure formelle</a></strong> sous 30 jours, en LRAR ou e-mail tracké, à cette compagnie.</li>
  <li>En cas de refus ou silence après 60 jours, saisissez :
    <ul>
      <li>Le <a href="https://www.mtv.travel/" target="_blank" rel="noopener external">Médiateur du Tourisme et du Voyage (MTV)</a> si la compagnie est adhérente.</li>
      <li>La <a href="https://www.ecologie.gouv.fr/direction-generale-laviation-civile-dgac" target="_blank" rel="noopener external">DGAC</a> ou le tribunal de proximité (compétence territoriale : aéroport de départ ou domicile).</li>
    </ul>
  </li>
</ol>

<h2>Ce que la compagnie peut tenter pour refuser</h2>
<ul>
  <li>« Circonstances extraordinaires » (météo, grève, problème ATC) : rarement valable si le retard est en réalité technique. Demandez le détail. Voir <a href="/blog/circonstances-extraordinaires-ce261.html">notre article complet</a>.</li>
  <li>« Vous êtes arrivé moins de 3h en retard à l'escale » : invalide depuis Folkerts. Réagissez en citant l'arrêt C-11/11.</li>
  <li>« Le second transporteur est responsable » : invalide si c'est le premier vol qui a causé le retard. La responsabilité suit le segment initial.</li>
  <li>« Pas de billet unique » : valide uniquement si vraiment deux PNR distincts (cf. notre article <a href="/blog/billet-unique-vs-billets-separes-ce261-correspondance.html">billet unique vs séparé</a>).</li>
</ul>""",
    "faq": [
        {"q": "Mon vol Paris-Casablanca était à l'heure mais Casablanca-Dakar a été retardé. À qui réclamer ?", "a": "Au transporteur du segment retardé : Royal Air Maroc dans ce cas (segment CMN-DKR). L'indemnité se calcule sur la distance totale Paris-Dakar (4 208 km) = 600 €, même si seul le second segment a posé problème. Le retard à l'arrivée à Dakar doit dépasser 3h pour ouvrir le droit."},
        {"q": "Quelle distance compte pour le calcul : Paris-Casablanca + Casablanca-Dakar, ou Paris-Dakar en ligne droite ?", "a": "<strong>Paris-Dakar en ligne droite</strong> (calcul orthodromique). C'est la jurisprudence constante. Peu importe que vous fassiez un détour par Casablanca, Istanbul ou Dubaï : seule la distance directe entre l'aéroport de départ initial et la destination finale est prise en compte pour déterminer le palier d'indemnité (250 / 400 / 600 €)."},
        {"q": "Le règlement CE 261 s'applique-t-il si je rate ma correspondance à un aéroport hors UE (Casablanca, Istanbul) ?", "a": "Oui, à condition que votre voyage parte de l'UE (départ initial à Paris, Bruxelles, Amsterdam, etc.) et que vous ayez un billet unique. La nationalité de l'aéroport d'escale n'a aucune importance — seul le départ et la destination finale comptent (jurisprudence Folkerts)."},
        {"q": "Combien de temps ai-je pour réclamer après le vol retardé ?", "a": "En France, la prescription est de <strong>5 ans</strong> (article 2224 du Code civil pour les actions personnelles). En pratique, les compagnies considèrent souvent les réclamations au-delà de 2 ans comme tardives, mais c'est une posture commerciale, pas une règle légale. Conservez vos preuves et n'hésitez pas à réclamer même 3 ou 4 ans plus tard."},
        {"q": "La compagnie m'a proposé un avoir au lieu de l'indemnité cash. Suis-je obligé d'accepter ?", "a": "Non. L'article 7.3 du CE 261 prévoit que l'indemnité est versée en numéraire (virement ou chèque) par défaut. La compagnie ne peut substituer un avoir / bon d'achat <strong>qu'avec votre accord écrit explicite</strong>. Refusez tant que vous n'avez pas vérifié la valeur réelle (un avoir de 600 € souvent valable 1 an = moins intéressant qu'un virement)."},
    ],
    "related": [
        {"href": "/blog/arret-folkerts-correspondance-cjue.html", "label": "L'arrêt Folkerts en détail (CJUE C-11/11)"},
        {"href": "/blog/billet-unique-vs-billets-separes-ce261-correspondance.html", "label": "Billet unique vs billets séparés"},
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE"},
        {"href": "/blog/correspondance-manquee-indemnite-vol.html", "label": "Correspondance manquée : vos droits"},
        {"href": "/blog/lettre-mise-en-demeure-compagnie-aerienne-modele.html", "label": "Modèle de mise en demeure"},
        {"href": "/blog/circonstances-extraordinaires-ce261.html", "label": "Circonstances extraordinaires : critères"},
    ],
},

# ============================================================================
# Article 1.4 — Comparatif 10 hubs Afrique
# ============================================================================
{
    "slug": "comparatif-10-hubs-afrique-ce261-fiabilite-retards",
    "title": "Comparatif des 10 hubs vers l'Afrique : CE 261, retards, fiabilité",
    "description": "CDG, BRU, AMS, LIS, FRA, MAD, IST, CMN, DXB, DOH : tableau comparatif des 10 hubs vers l'Afrique. Protection CE 261, retards moyens, conseil par profil.",
    "h1": "Comparatif des 10 hubs vers l'Afrique : protection CE 261, retards, fiabilité",
    "quick_answer": "Pour un vol Europe-Afrique avec correspondance, <strong>les hubs européens (CDG, BRU, AMS, LIS, FRA, MAD) offrent la meilleure protection CE 261</strong> (couverture aller + retour). Les hubs non-UE (IST, CMN, DXB, DOH) ne protègent que l'aller depuis l'UE. Pour un voyageur diaspora qui voyage régulièrement, Paris CDG et Bruxelles BRU offrent le meilleur compromis ponctualité / protection juridique / fréquence des vols vers l'Afrique de l'Ouest et centrale.",
    "body_html": """<p>Aller en Afrique depuis l'Europe en correspondance offre une dizaine de hubs majeurs. Tous ne se valent pas, ni en termes de fiabilité opérationnelle ni en termes de protection légale en cas de retard ou d'annulation. Voici le comparatif complet, conçu pour un voyageur informé.</p>

<h2>Tableau comparatif des 10 hubs</h2>
<table>
  <tr><th>Hub</th><th>Compagnie principale</th><th>Destinations Afrique</th><th>CE 261 aller depuis UE</th><th>CE 261 retour vers UE</th></tr>
  <tr><td><strong>CDG (Paris)</strong></td><td>Air France</td><td>~40 destinations (WAF, CAF, EAF, SAF, Maghreb, océan Indien)</td><td>✔ Oui</td><td>✔ Oui (Air France = EU)</td></tr>
  <tr><td><strong>BRU (Bruxelles)</strong></td><td>Brussels Airlines</td><td>~18 destinations (WAF, CAF dont RDC, Burundi, Rwanda)</td><td>✔ Oui</td><td>✔ Oui (Brussels = EU)</td></tr>
  <tr><td><strong>AMS (Amsterdam)</strong></td><td>KLM</td><td>~20 destinations (WAF, EAF, SAF)</td><td>✔ Oui</td><td>✔ Oui (KLM = EU)</td></tr>
  <tr><td><strong>LIS (Lisbonne)</strong></td><td>TAP Air Portugal</td><td>~15 destinations (lusophone : Cabo Verde, Angola, Mozambique, S. Tomé, Guinée-Bissau + WAF)</td><td>✔ Oui</td><td>✔ Oui (TAP = EU)</td></tr>
  <tr><td><strong>FRA (Francfort)</strong></td><td>Lufthansa</td><td>~12 destinations (WAF, EAF, SAF)</td><td>✔ Oui</td><td>✔ Oui (Lufthansa = EU)</td></tr>
  <tr><td><strong>MAD (Madrid)</strong></td><td>Iberia, Air Europa</td><td>~8 destinations (Maroc, Guinée Équatoriale, Nigeria, Sénégal)</td><td>✔ Oui</td><td>✔ Oui (Iberia = EU)</td></tr>
  <tr><td><strong>IST (Istanbul)</strong></td><td>Turkish Airlines</td><td>~60 destinations Afrique — plus grand réseau panafricain au monde</td><td>✔ Oui (vol depuis UE vers IST)</td><td>✘ Non (Turkish = non-EU)</td></tr>
  <tr><td><strong>CMN (Casablanca)</strong></td><td>Royal Air Maroc</td><td>~30 destinations Afrique (WAF, CAF spécialisation)</td><td>✔ Oui (vol depuis UE vers CMN)</td><td>✘ Non (RAM = non-EU)</td></tr>
  <tr><td><strong>DXB (Dubaï)</strong></td><td>Emirates</td><td>~25 destinations Afrique (EAF, SAF, NAF)</td><td>✔ Oui (vol depuis UE vers DXB)</td><td>✘ Non (Emirates = non-EU)</td></tr>
  <tr><td><strong>DOH (Doha)</strong></td><td>Qatar Airways</td><td>~28 destinations Afrique</td><td>✔ Oui (vol depuis UE vers DOH)</td><td>✘ Non (Qatar = non-EU)</td></tr>
</table>

<h2>Ponctualité opérationnelle (moyennes constatées 2024-2025)</h2>
<p>Source : OAG, Anna.aero et rapports Eurocontrol consolidés. Indicatif, varie selon saisons.</p>
<table>
  <tr><th>Hub</th><th>Taux ponctualité moyen</th><th>Note fiabilité</th></tr>
  <tr><td>AMS (KLM)</td><td>~82%</td><td>★★★★☆ très fiable</td></tr>
  <tr><td>FRA (Lufthansa)</td><td>~78%</td><td>★★★★☆ fiable</td></tr>
  <tr><td>DOH (Qatar)</td><td>~85%</td><td>★★★★★ excellent</td></tr>
  <tr><td>DXB (Emirates)</td><td>~80%</td><td>★★★★☆ très fiable</td></tr>
  <tr><td>IST (Turkish)</td><td>~76%</td><td>★★★☆☆ correct</td></tr>
  <tr><td>CDG (Air France)</td><td>~74%</td><td>★★★☆☆ correct (impacté par grèves)</td></tr>
  <tr><td>BRU (Brussels)</td><td>~75%</td><td>★★★☆☆ correct</td></tr>
  <tr><td>LIS (TAP)</td><td>~68%</td><td>★★☆☆☆ moyen (problèmes opérationnels récurrents 2022-2024)</td></tr>
  <tr><td>CMN (RAM)</td><td>~70%</td><td>★★★☆☆ correct (variable selon saisons)</td></tr>
  <tr><td>MAD (Iberia)</td><td>~73%</td><td>★★★☆☆ correct</td></tr>
</table>

<h2>Verdict par profil de voyageur</h2>

<h3>Diaspora Afrique de l'Ouest (Dakar, Abidjan, Bamako, Conakry, Cotonou, Lomé, Ouagadougou, Niamey)</h3>
<p><strong>Meilleur choix global : CDG (Air France) ou BRU (Brussels Airlines).</strong></p>
<ul>
  <li>Couverture CE 261 complète aller + retour</li>
  <li>Fréquences élevées</li>
  <li>Air France = quasi-monopole sur certaines routes (Bamako, Niamey, Ouagadougou)</li>
  <li>Brussels Airlines = excellent réseau Afrique centrale + Ouest</li>
</ul>
<p><strong>Alternative économique : LIS (TAP)</strong> souvent moins cher mais ponctualité plus faible.</p>
<p><strong>Alternative volume bagages : CMN (RAM)</strong> franchise généreuse mais retour non protégé.</p>

<h3>Diaspora Afrique centrale (Douala, Yaoundé, Kinshasa, Brazzaville, Libreville, N'Djamena)</h3>
<p><strong>Meilleur choix : BRU (Brussels Airlines).</strong> Brussels Airlines a hérité du réseau Sabena vers le Congo : excellente couverture Kinshasa, Bujumbura, Kigali. Couverture CE 261 totale.</p>
<p><strong>Alternatives : CDG (Air France)</strong> pour Douala, Yaoundé, Libreville, ou <strong>FRA (Lufthansa)</strong>.</p>

<h3>Diaspora Afrique de l'Est (Nairobi, Addis-Abeba, Dar es Salaam, Kampala, Kigali, Khartoum)</h3>
<p><strong>Meilleur choix tarif/fiabilité : DOH (Qatar Airways) ou DXB (Emirates).</strong> Plus rapides, plus fiables, mais retour non protégé par CE 261. Privilégier une assurance voyage.</p>
<p><strong>Choix protégé : AMS (KLM)</strong> vers Nairobi (codeshare Kenya Airways), Dar es Salaam, Entebbe.</p>

<h3>Diaspora Afrique australe (Johannesburg, Le Cap, Maputo, Lusaka, Harare, Antananarivo)</h3>
<p><strong>Meilleur choix : FRA (Lufthansa) ou AMS (KLM).</strong></p>
<p><strong>Alternative : DOH (Qatar)</strong> souvent moins cher, retour non protégé.</p>

<h3>Diaspora Maghreb (Alger, Tunis, Casablanca, Marrakech, Tripoli)</h3>
<p>Vols directs disponibles partout. Préférer compagnies EU au retour (Air France, Transavia, Iberia, Vueling) plutôt que Air Algérie, Tunisair, RAM.</p>

<h3>Diaspora lusophone (Cabo Verde, Angola, Mozambique, Guinée-Bissau, S. Tomé)</h3>
<p><strong>Meilleur choix : LIS (TAP).</strong> Couverture quasi exclusive, malgré la ponctualité moyenne.</p>

<h2>Conseils pratiques pour optimiser votre voyage</h2>
<ol>
  <li><strong>Pour le maximum de protection CE 261 :</strong> achetez un billet unique entièrement sur compagnie EU (Air France, KLM, Brussels, Lufthansa, TAP, Iberia).</li>
  <li><strong>Pour le meilleur prix + protection aller :</strong> billet unique compagnie non-EU avec correspondance hub Golfe (DXB, DOH), souscrivez assurance voyage pour le retour.</li>
  <li><strong>Pour la ponctualité maximale :</strong> Qatar Airways (DOH) ou KLM (AMS). Évitez TAP (LIS) en haute saison.</li>
  <li><strong>Pour le volume bagages (déménagement, retour pays) :</strong> Royal Air Maroc (souvent 2 × 23 kg en éco), Ethiopian (excellent vers EAF).</li>
  <li><strong>Évitez les billets séparés</strong> achetés sur Kiwi.com, GoToGate, et autres plateformes self-connect : pas de protection légale en cas de correspondance ratée. Voir notre article <a href="/blog/billet-unique-vs-billets-separes-ce261-correspondance.html">billet unique vs séparé</a>.</li>
</ol>

<h2>Cas particuliers à connaître</h2>
<ul>
  <li><strong>Code-share Air France + Kenya Airways</strong> : protection EU même sur des vols opérés par KQ.</li>
  <li><strong>Air France + Royal Air Maroc</strong> : pas d'alliance formelle, donc pas de billet unique automatique. À acheter séparément ou via agence.</li>
  <li><strong>Brussels Airlines + Lufthansa Group</strong> : alliance Star, billets uniques systématiques.</li>
  <li><strong>Turkish Airlines + ASKY</strong> : code-share fort vers l'Afrique de l'Ouest (Lomé hub ASKY), mais pas de protection CE 261 sur ASKY au retour vers Lomé.</li>
</ul>""",
    "faq": [
        {"q": "Quel est le meilleur hub pour aller à Dakar depuis Paris ?", "a": "Pour la <strong>protection légale maximale</strong> : vol direct Paris-Dakar avec Air France (CE 261 total). Pour le <strong>prix</strong> : correspondance par Lisbonne (TAP) ou Casablanca (RAM), avec moins de protection au retour. Pour le <strong>volume bagages</strong> : Royal Air Maroc via Casablanca."},
        {"q": "Pourquoi Turkish Airlines est-elle si présente en Afrique mais moins recommandée que les hubs européens ?", "a": "Turkish Airlines dessert le plus grand réseau africain au monde (~60 destinations depuis Istanbul) avec d'excellents tarifs. Mais elle est non-européenne : le retour Istanbul → Paris n'est pas couvert par CE 261. Pour un voyageur diaspora qui vole 6-12 fois par an, choisir une compagnie EU vous protège statistiquement mieux sur la durée."},
        {"q": "Quelle est la différence entre Brussels Airlines et Air France pour aller à Kinshasa ?", "a": "Brussels Airlines a un héritage historique très fort sur l'Afrique centrale (ex-Sabena), avec 6 fréquences hebdo Bruxelles-Kinshasa, équipages familiers de la route et tarifs souvent compétitifs. Air France propose moins de fréquences mais reste compétitif. Les deux sont compagnies EU : protection CE 261 totale. Préférez celle qui correspond à votre aéroport de départ."},
        {"q": "Si je passe par Dubaï avec Emirates pour aller à Nairobi, suis-je protégé pour tout le voyage ?", "a": "<strong>À l'aller</strong> (Paris-Dubaï-Nairobi en billet unique) : oui, CE 261 s'applique sur l'ensemble. Vous arrivez à Nairobi avec 4h de retard : 600 € due par Emirates. <strong>Au retour</strong> (Nairobi-Dubaï-Paris) : non, CE 261 ne s'applique pas car le vol part hors UE avec une compagnie non-UE. Pour le retour, une assurance voyage est indispensable."},
        {"q": "Quel hub a les meilleurs services en cas de retard prolongé ?", "a": "Difficile question. <strong>Schiphol (AMS)</strong> est réputé pour sa gestion fluide des correspondances ratées (hôtels rapidement attribués, réacheminement efficace via KLM/Air France/Delta). <strong>Doha (DOH)</strong> et <strong>Dubaï (DXB)</strong> ont des hôtels de transit et des bons repas généreux. <strong>Casablanca (CMN)</strong> et <strong>Istanbul (IST)</strong> sont moins bien organisés en cas de gros incident."},
    ],
    "related": [
        {"href": "/blog/ce261-compagnies-non-eu-emirates-turkish-qatar.html", "label": "CE 261 et compagnies non-UE : Emirates, Turkish, Qatar, RAM"},
        {"href": "/blog/billet-unique-vs-billets-separes-ce261-correspondance.html", "label": "Billet unique vs séparé : le piège"},
        {"href": "/blog/correspondance-ratee-a-qui-reclamer-ce261-folkerts.html", "label": "Correspondance ratée : à qui réclamer ?"},
        {"href": "/blog/guide-correspondance-cdg-vers-afrique-ce261.html", "label": "Guide Paris CDG vers l'Afrique"},
        {"href": "/blog/guide-correspondance-bru-vers-afrique-ce261.html", "label": "Guide Bruxelles BRU vers l'Afrique"},
        {"href": "/blog/guide-correspondance-ist-vers-afrique-ce261.html", "label": "Guide Istanbul IST vers l'Afrique"},
        {"href": "/blog/guide-correspondance-cas-vers-afrique-ce261.html", "label": "Guide Casablanca CMN vers l'Afrique"},
        {"href": "/blog/guide-correspondance-lis-vers-afrique-ce261.html", "label": "Guide Lisbonne LIS vers l'Afrique"},
        {"href": "/blog/guide-correspondance-dxb-doh-vers-afrique-ce261.html", "label": "Guide Dubaï DXB / Doha DOH vers l'Afrique"},
    ],
},
]

if __name__ == "__main__":
    write_all(LOT1, "LOT 1")

#!/usr/bin/env python3
"""Build travel-agents-programme-gambia-en.html from programme-agents-voyage.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "programme-agents-voyage.html"
DST = ROOT / "travel-agents-programme-gambia-en.html"

text = SRC.read_text(encoding="utf-8")

# Head
text = text.replace('<html lang="fr">', '<html lang="en">', 1)
text = text.replace(
    "<title>Commission agences voyage Sénégal 45€/passager | Robin des Airs</title>",
    "<title>Travel agency programme — The Gambia · 3,800 GMD/passenger | Robin des Airs</title>",
)
text = text.replace(
    '<meta name="description" content="45€ nets par passager indemnisé (30 000 FCFA) versés sur le compte de votre agence — Wave, Orange Money ou SEPA. Partenariat Robin des Airs." />',
    '<meta name="description" content="3,800 GMD net per compensated passenger paid to your agency — Wave, Afrimoney, QMoney or bank transfer. EC 261 partner programme for Gambian travel agencies." />',
)
text = text.replace(
    '<link rel="canonical" href="https://robindesairs.eu/programme-agents-voyage.html" />',
    '<link rel="canonical" href="https://robindesairs.eu/travel-agents-programme-gambia-en.html" />\n'
    '  <link rel="alternate" hreflang="fr" href="https://robindesairs.eu/programme-agents-voyage.html" />\n'
    '  <link rel="alternate" hreflang="en" href="https://robindesairs.eu/travel-agents-programme-gambia-en.html" />',
)

# Comment block
text = text.replace(
    "https://robindesairs.eu/programme-agents-voyage.html",
    "https://robindesairs.eu/travel-agents-programme-gambia-en.html",
)

# Ordered replacements (longer first where needed)
REPL = [
    # Hero & stripe
    ("✦ Programme Agence · Version standard", "✦ Partner programme · The Gambia"),
    (
        "Commission agences voyage Sénégal <span class=\"accent\">45€/passager</span>",
        "Gambian travel agencies: <span class=\"accent\">3,800 GMD/passenger</span>",
    ),
    (
        "🚀 45€ nets par passager indemnisé — <strong>versés sur le compte de votre agence</strong> (Wave, Orange Money ou SEPA).",
        "🚀 <strong>3,800 GMD</strong> net per compensated passenger — <strong>paid to your agency account</strong> (Wave, Afrimoney, QMoney or bank transfer).",
    ),
    (
        "Robin des Airs gère la réclamation <strong>EU261/2004</strong>. Ce n’est pas un « bonus virtuel » : c’est de l’<strong>argent qui entre dans votre caisse</strong>, en plus de votre billetterie habituelle.",
        "Robin des Airs handles the <strong>EC 261/2004</strong> claim. This is not a virtual bonus: <strong>real money in your agency account</strong>, on top of your usual ticketing revenue.",
    ),
    ("Démarrez : 45€ par passager", "Get started: 3,800 GMD per passenger"),
    (
        "<strong>Vous encaissez</strong> via <strong>Wave</strong>, <strong>Orange Money</strong> ou virement SEPA — après réception des fonds côté passager, le montant agence est le vôtre.",
        "<strong>You receive payouts</strong> via <strong>Wave</strong>, <strong>Afrimoney</strong>, <strong>QMoney</strong> or bank transfer — after the passenger is paid by the airline, the agency commission is yours.",
    ),
    (
        "45€ (30 000 FCFA) <strong>nets pour votre agence</strong> par passager indemnisé &nbsp;·&nbsp; Versement sur <strong>votre compte</strong> &nbsp;·&nbsp; Zéro frais fixe &nbsp;·&nbsp; Robin gère le dossier",
        "<strong>3,800 GMD net for your agency</strong> per compensated passenger &nbsp;·&nbsp; Paid to <strong>your account</strong> &nbsp;·&nbsp; No fixed fees &nbsp;·&nbsp; Robin handles the claim",
    ),
    # AIDA
    (
        "Un incident vol peut devenir de l’argent net dans la poche de votre agence.",
        "A flight disruption can become net income for your agency.",
    ),
    (
        "Vous nous transmettez le client ou la réservation. Nous traitons le dossier ; <strong>la commission vous est versée sur votre compte</strong> — vous la voyez arriver comme un encaissement classique.",
        "You refer the client or booking. We handle the file; <strong>commission is paid to your account</strong> — like any other agency receipt.",
    ),
    ("Sans Robin des Airs", "Without Robin des Airs"),
    ("Client frustré, litige non traité.", "Frustrated client, claim never handled."),
    ("Temps SAV non facturé pour votre équipe.", "Unpaid support time for your team."),
    ("0 FCFA de revenu additionnel.", "0 GMD in additional revenue."),
    ("Avec Robin des Airs", "With Robin des Airs"),
    ("Client remboursé et mieux accompagné.", "Client compensated and well supported."),
    ("Image agence plus professionnelle.", "Stronger professional image for your agency."),
    (
        "30 000 FCFA par passager indemnisé, <strong>c’est pour vous</strong> (compte agence), pas une ristourne passager.",
        "<strong>3,800 GMD per compensated passenger is yours</strong> (agency account), not a passenger discount.",
    ),
    (
        'href="https://api.whatsapp.com/send?phone=33677470122&amp;text=Bonjour%20Robin%20des%20Airs%2C%20je%20veux%20devenir%20partenaire%20agence%20en%201%20minute."',
        'href="https://api.whatsapp.com/send?phone=33677470122&amp;text=Hello%20Robin%20des%20Airs%2C%20I%20want%20to%20join%20the%20Gambia%20travel%20agency%20partner%20programme."',
    ),
    ("💬 Devenir partenaire en 1 minute", "💬 Become a partner in 1 minute"),
    ("<strong>Cadre légal :</strong> Règlement européen <strong>EU261/2004</strong>.", "<strong>Legal basis:</strong> EU Regulation <strong>EC 261/2004</strong>."),
    ("Nom de l'agence", "Agency name"),
    ("Ville", "City"),
    ("Envoyer", "Send"),
    (
        "Formulaire express : nom de l'agence, ville, WhatsApp. On vous rappelle ensuite pour le reste.",
        "Express form: agency name, city, WhatsApp. We call you back to complete onboarding.",
    ),
    # Sections
    ("Notre positionnement", "Our positioning"),
    ("Pourquoi ce créneau ?", "Why this niche?"),
    (
        "Sur le corridor Afrique-Europe, beaucoup de passagers n'activent pas leurs droits après un incident de vol. Les agences absorbent le SAV, sans revenu lié.",
        "On Africa–Europe routes, many passengers never claim after a flight incident. Agencies absorb support work with no linked revenue.",
    ),
    (
        "Robin des Airs transforme ces situations en process clair : gestion EU261, suivi opérationnel et rémunération agence.",
        "Robin des Airs turns these cases into a clear process: EC 261 handling, operational follow-up and agency commission.",
    ),
    ("Fonctionnement", "How it works"),
    ("Simple, rapide, sans friction", "Simple, fast, no friction"),
    (
        "Votre rôle s'arrête au référencement. Robin des Airs gère l'intégralité du dossier juridique.",
        "Your role stops at referral. Robin des Airs handles the full legal claim.",
    ),
    ("Votre client est perturbé", "Your client is disrupted"),
    (
        "Retard important à l’arrivée, annulation, surbooking ou correspondance manquée liée à la perturbation, sur un vol Afrique sub-saharienne ↔ Europe relevant du règlement EU261.",
        "Significant arrival delay, cancellation, denied boarding or missed connection linked to the disruption on sub-Saharan Africa ↔ Europe flights covered by EC 261.",
    ),
    ("Nous vous informons en amont", "We alert you early"),
    (
        "Les dossiers liés à votre agence font l'objet d'une veille : dès qu'un client a réservé et vous partage le vol, nous le mettons sous surveillance. Vous êtes notifié dès qu'une situation peut ouvrir droit à indemnisation. Vous n'avez pas à signaler chaque incident à la main, nous portons le suivi opérationnel, vous restez concentré sur <strong>votre commission</strong> et sur votre client.",
        "Files linked to your agency are monitored: once a client has booked and you share the flight, we track it. You are notified when a situation may qualify for compensation. No need to report every delay manually — we run operations; you focus on <strong>your commission</strong> and your client.",
    ),
    ("Robin gère tout", "Robin handles everything"),
    (
        "Analyse EU261, mise en demeure, médiation, suivi complet. Votre client est accompagné de A à Z.",
        "EC 261 analysis, formal notice, mediation, full follow-up. Your client is supported end to end.",
    ),
    ("Vous êtes rémunéré", "You get paid"),
    (
        "Dès indemnisation du passager, le versement agence est déclenché sous 48h, par virement ou Mobile Money.",
        "Once the passenger is compensated, agency payout is triggered within 48 business hours via transfer or mobile money.",
    ),
    ('<div class="stat-num">600€ <span class="money-sub">(395 000 FCFA)</span></div>', '<div class="stat-num">€600 <span class="money-sub">(≈ 50,400 GMD)</span></div>'),
    (
        '<div class="stat-label">Indemnité maximale indicative<br/>par passager (barème EU261)</div>',
        '<div class="stat-label">Indicative maximum compensation<br/>per passenger (EC 261 scale)</div>',
    ),
    ('<div class="stat-num">45€ <span class="money-sub">(30 000 FCFA)</span></div>', '<div class="stat-num">3,800 GMD <span class="money-sub">(≈ €45)</span></div>'),
    (
        '<div class="stat-label">nets, <strong>crédités sur votre compte</strong><br/>par passager indemnisé</div>',
        '<div class="stat-label">net, <strong>credited to your account</strong><br/>per compensated passenger</div>',
    ),
    ('<div class="stat-label">Délai de versement<br/>après indemnisation</div>', '<div class="stat-label">Typical payout<br/>after passenger payment</div>'),
    ('<div class="stat-num">0€ <span class="money-sub">(0 FCFA)</span></div>', '<div class="stat-num">0 GMD</div>'),
    (
        '<div class="stat-label">Aucun frais pour votre<br/>agence, aucun risque</div>',
        '<div class="stat-label">No fee for your<br/>agency, no risk</div>',
    ),
    ("Transparence", "Transparency"),
    ("Ce que votre agence voit, noir sur blanc", "What your agency sees, in black and white"),
    ("Les mêmes règles pour tout le monde : pas de surprise au moment du versement.", "Same rules for everyone: no surprises at payout."),
    (
        "<li><strong>Rémunération agence :</strong> 45€ (30.000 FCFA) par passager indemnisé, <strong>versés sur le compte que vous indiquez</strong> (Wave, Orange Money, SEPA…). Délai typique : sous 48h après réception des fonds côté passager — c’est un <strong>encaissement agence</strong>, pas un avoir interne.</li>",
        "<li><strong>Agency commission:</strong> <strong>3,800 GMD</strong> per compensated passenger (tier locked at signing — see <a href=\"/paliers-commission-agence-en.html\">commission tiers</a>), <strong>paid to the account you choose</strong> (Wave, Afrimoney, QMoney, bank…). Typical timing: within 48 business hours after the passenger receives airline funds — <strong>agency revenue</strong>, not an internal credit.</li>",
    ),
    (
        "<li><strong>Frais de succès passager :</strong> 25 % sur l'indemnité seulement si l'argent est récupéré ; sinon le passager ne paie rien à Robin des Airs, cohérent avec votre discours « zéro risque ».</li>",
        "<li><strong>Passenger success fee:</strong> 25% of compensation only if money is recovered; otherwise the passenger pays Robin des Airs nothing — consistent with your “zero risk” message.</li>",
    ),
    (
        "<li><strong>Aucun frais côté agence.</strong> Pas d'abonnement, pas de frais d'entrée, pas de minimum de dossiers.</li>",
        "<li><strong>No agency fees.</strong> No subscription, no joining fee, no minimum number of claims.</li>",
    ),
    (
        "<li><strong>Suivi :</strong> vous pouvez demander où en est un dossier référé ; vous restez le point de contact relationnel de votre client.</li>",
        "<li><strong>Tracking:</strong> you can ask for status on a referred file; you remain your client’s relationship contact.</li>",
    ),
    (
        "<li><strong>Cadre légal :</strong> mandat, CGV et politique de confidentialité accessibles avant signature, avec droit de rétractation pour le passager comme prévu par la loi.</li>",
        "<li><strong>Legal framework:</strong> mandate, terms and privacy policy available before signing, with passenger withdrawal rights as required by law.</li>",
    ),
    ("Pourquoi nous rejoindre", "Why join us"),
    ("Tout bénéfice, aucun risque", "All upside, no risk"),
    (
        "Conçu pour s'intégrer dans votre activité tout en préservant la confiance de vos voyageurs : revenu additionnel pour vous, indemnité et sérénité pour eux.",
        "Designed to fit your business while keeping traveller trust: extra revenue for you, compensation and peace of mind for them.",
    ),
    ("Revenu passif immédiat", "Immediate passive revenue"),
    (
        "Montant fixe par passager indemnisé : l’argent <strong>atterrit sur votre compte pro ou mobile money</strong>. Aucun plafond — chaque passager indemnisé, c’est une ligne de plus dans <strong>votre caisse</strong>.",
        "Fixed amount per compensated passenger: money <strong>lands on your business or mobile money account</strong>. No cap — every compensated passenger adds to <strong>your cash flow</strong>.",
    ),
    ("Satisfaction &amp; image client", "Client satisfaction &amp; brand"),
    (
        "Vos voyageurs sont pris en charge de A à Z sur leur dossier EU261 : moins de frustration, plus de reconnaissance envers <strong>votre agence</strong> qui leur a ouvert ce service.",
        "Travellers are supported A to Z on their EC 261 claim: less frustration, more gratitude to <strong>your agency</strong> for offering this service.",
    ),
    ("Zéro risque financier", "Zero financial risk"),
    (
        "Votre agence ne paie rien. Aucun frais d'adhésion. Si le dossier n'aboutit pas, vous ne perdez rien.",
        "Your agency pays nothing. No joining fee. If the claim fails, you lose nothing.",
    ),
    ("Fidélisez vos clients", "Retain your clients"),
    (
        "Leur proposer une vraie suite en cas de retard ou d'annulation, c'est renforcer la confiance et les inciter à repasser par vous pour leurs prochains voyages.",
        "Offering real follow-up after delay or cancellation builds trust and brings them back for future trips.",
    ),
    ("Aucune charge opérationnelle", "No operational burden"),
    (
        "Ni dossier à monter, ni compagnie à relancer, ni procédure à suivre. Robin des Airs s'en charge.",
        "No files to build, no airline chasing, no procedure to run. Robin des Airs does it.",
    ),
    ("Communication flexible", "Flexible communication"),
    (
        "WhatsApp, e-mail ou formulaire pour l'onboarding et vos questions. Le suivi des dossiers et les alertes utiles pour <strong>votre revenu agence</strong> vous parviennent en amont, sans charge quotidienne.",
        "WhatsApp, email or this form for onboarding and questions. File tracking and alerts for <strong>your agency revenue</strong> reach you early, without daily overhead.",
    ),
    ("Données protégées", "Data protected"),
    (
        "Données hébergées en Europe, traitement conforme au RGPD. La confidentialité de vos clients est garantie.",
        "Data hosted in Europe, GDPR-compliant processing. Your clients’ privacy is protected.",
    ),
    ("Simulateur de revenus", "Revenue simulator"),
    ("Combien pouvez-vous gagner ?", "How much can you earn?"),
    (
        "Ajustez le curseur selon votre volume mensuel de voyageurs Afrique ↔ Europe. Le simulateur utilise environ <strong>8&nbsp;%</strong> de vos voyageurs comme base : il s’agit d’estimer la part de personnes qui pourraient être <strong>concernées par un incident potentiellement ouvrant droit</strong> à une réclamation EU261 — retards importants à l’arrivée, annulations, surbooking (refus d’embarquement), correspondances manquées lorsque l’itinéraire reste couvert et la perturbation imputable au transporteur.",
        "Adjust the slider to your monthly Africa ↔ Europe travellers. The simulator uses about <strong>8%</strong> as eligible incidents — significant arrival delays, cancellations, denied boarding, missed connections when EC 261 still applies.",
    ),
    ("Vos voyageurs par mois", "Your travellers per month"),
    ("voyageurs/mois", "travellers/month"),
    ("Revenu mensuel estimé", "Estimated monthly revenue"),
    ("par mois · <strong>versé sur votre compte</strong> agence (délai type 48h)", "per month · <strong>paid to your agency account</strong> (typ. 48h)"),
    ("Sur 12 mois :", "Over 12 months:"),
    ("Cas concret", "Real example"),
    (
        "Famille de 4 personnes · Vol Air France Paris → Abidjan",
        "Family of 4 · Brussels Airlines Banjul → Brussels",
    ),
    (
        "Retard de <strong>4 h 05</strong> à l'arrivée. Distance &gt; 3.500 km : votre commission agence est calculée à <strong>45€ (30 000 FCFA) par passager indemnisé</strong>.",
        "Arrival delay <strong>over 4 hours</strong>. Long-haul segment: agency commission <strong>3,800 GMD per compensated passenger</strong>.",
    ),
    ("Indemnité totale famille", "Total family compensation"),
    ("Environ 1,58&nbsp;million FCFA", "≈ 201,600 GMD"),
    ("4 passagers · ordre de grandeur indicatif", "4 passengers · indicative order of magnitude"),
    ("Votre commission", "Your commission"),
    ("180€ (120 000 FCFA)", "15,200 GMD"),
    (
        "4 × 45€ (30 000 FCFA) · <strong>encaissé par votre agence</strong> (délai type 48h)",
        "4 × 3,800 GMD · <strong>paid to your agency</strong> (typ. 48h)",
    ),
    ("De votre côté", "On your side"),
    ("Vous orientez le client", "You refer the client"),
    (
        "Robin des Airs monte et suit tout le dossier auprès de la compagnie. Vous n'avez pas à remplir des formulaires à chaque retard ni à gérer les relances juridiques.",
        "Robin des Airs builds and follows the airline claim. No forms on every delay, no legal chasing for your team.",
    ),
    (
        "Un seul dossier famille = <strong>plus d’argent net dans votre caisse</strong> qu’une semaine de billetterie classique.",
        "One family file = <strong>more net cash</strong> than a quiet week of ticketing.",
    ),
    ("Lancer mon inscription maintenant →", "Start my registration now →"),
    ("⚠ Ce que vous perdez chaque mois", "⚠ What you lose every month"),
    (
        "Vos clients voyageurs subissent déjà des retards. Sans partenaire, ils renoncent.",
        "Your travellers already face delays. Without a partner, they give up.",
    ),
    (
        "Selon l'EU, moins de 5 % des passagers éligibles réclament réellement leur indemnité. Chaque mois, vos clients laissent sur la table des sommes importantes en euros (et en FCFA) qui leur reviennent de droit, et vous une commission que vous pourriez toucher.",
        "Fewer than 5% of eligible passengers actually claim. Every month your clients leave significant EC 261 amounts on the table — and you leave agency commission unclaimed.",
    ),
    ("des passagers éligibles abandonnent", "of eligible passengers never claim"),
    (
        "<strong>600€</strong><span>(395 000 FCFA) non réclamés au maximum par passager concerné</span>",
        "<strong>€600</strong><span>(≈ 50,400 GMD max per affected passenger)</span>",
    ),
    ("<strong>0€</strong><span>(0 FCFA) pour votre agence</span>", "<strong>0 GMD</strong><span> for your agency</span>"),
    ("✦ Arrêter de perdre, rejoindre en 90 secondes", "✦ Stop losing out — join in 90 seconds"),
    ("Votre commission", "Your commission"),
    ("Deux conventions au choix", "Commission at signing (locked for life)"),
    (
        "Euro en priorité pour la lecture des performances ; FCFA en équivalent opérationnel. Vous sélectionnez l'option dans le formulaire d'inscription.",
        "Tiers are set on the day you sign the <a href=\"/partner-agreement-en.html\">partner agreement</a> — up to <strong>4,000 GMD/pax</strong> for founding partners (3 slots). Indicative rate: <strong>84 GMD = €1</strong>.",
    ),
    ("Priorité affichage", "Current tier (Summer)"),
    ("Commission agence", "Agency commission"),
    (
        '<div class="comm-amount">45€ <span style="font-size:0.52em;font-weight:700;">(30 000 FCFA)</span></div>',
        '<div class="comm-amount">3,800 GMD <span style="font-size:0.52em;font-weight:700;">(≈ €45)</span></div>',
    ),
    (
        "net par passager indemnisé — <strong>reste chez l’agence</strong>",
        "net per compensated passenger — <strong>stays with the agency</strong>",
    ),
    ("✅ Wise € compte pro", "✅ Wave (Gambia)"),
    ("✅ Orange Money CFA instant", "✅ Afrimoney"),
    ("✅ Wave Sénégal 48h", "✅ QMoney"),
    ("Communication double devise € / FCFA", "Bank transfer · GBP/EUR accounts OK"),
    ("Repère rapide", "Quick reference"),
    ("Exemples rapides", "Quick examples"),
    (
        '<div class="comm-amount" style="color:#fff">180€ <span style="font-size:0.52em;font-weight:700;">(120 000 FCFA)</span></div>',
        '<div class="comm-amount" style="color:#fff">15,200 GMD</div>',
    ),
    ("famille de 4 passagers", "family of 4 passengers"),
    ("10 dossiers/mois : <strong>450€ (300 000 FCFA)</strong>", "10 claims/month: <strong>38,000 GMD</strong>"),
    ("15 dossiers/mois : 675€ (450 000 FCFA)", "15 claims/month: 57,000 GMD"),
    ("30 dossiers/mois : 1 350€ (900 000 FCFA)", "30 claims/month: 114,000 GMD"),
    ("Montants <strong>encaissables par vous</strong> (compte agence)", "Amounts <strong>paid to you</strong> (agency account)"),
    ("Quels vols sont concernés ?", "Which flights qualify?"),
    (
        "Spécialiste des routes Afrique sub-saharienne ↔ Europe, les plus impactées par les perturbations.",
        "Specialist on sub-Saharan Africa ↔ Europe routes — including <strong>Banjul (BJL)</strong> to Brussels, Madrid, Istanbul and beyond.",
    ),
    ("Aéroports africains couverts", "African airports covered"),
    ('<div class="airport-tag"><code>DSS</code> Dakar</div>', '<div class="airport-tag" style="background:var(--savanna-soft);border-color:rgba(45,107,78,0.4);color:var(--savanna);font-weight:700"><code>BJL</code> Banjul ★</div>\n        <div class="airport-tag"><code>DSS</code> Dakar</div>'),
    ("+ autres destinations", "+ other destinations"),
    ("Ils nous ont rejoints", "They joined us"),
    ("La parole à nos agences partenaires", "Partner agencies speak"),
    (
        "Nos clients viennent nous voir pour leurs vols Dakar-Paris. Quand un vol est concerné, Robin nous prévient en amont sur les dossiers éligibles, on touche <strong>notre commission</strong> sans monter les démarches nous-mêmes. En 4 mois, on a ajouté 180.000 FCFA de revenu sur des clients qu'on avait déjà.",
        "Our clients book Banjul–Europe trips with us. When a flight qualifies, Robin alerts us early — we earn <strong>our commission</strong> without building claims ourselves. In four months we added <strong>45,600 GMD</strong> on clients we already had.",
    ),
    ("Agence partenaire", "Partner agency"),
    ("Dakar · Sénégal", "Banjul · The Gambia"),
    ("Rejoindre ces agences →", "Join these agencies →"),
    ("Questions fréquentes", "FAQ"),
    ("Tout ce qu'il faut savoir", "Everything you need to know"),
    (
        "Les réponses aux questions que posent les agences avant de nous rejoindre.",
        "Answers agencies ask before joining.",
    ),
    (
        "Mon agence paie-t-elle quelque chose pour rejoindre le programme ?",
        "Does my agency pay anything to join?",
    ),
    (
        "Non. Les 45€ (30.000 FCFA) sont versés par Robin des Airs à l'agence sur les dossiers indemnisés. Votre agence ne paie rien. Aucun risque financier si le dossier n'aboutit pas.",
        "No. <strong>3,800 GMD</strong> (tier at signing) is paid by Robin des Airs to your agency on successful claims. Your agency pays nothing. No financial risk if a claim fails.",
    ),
    ("Quand suis-je payé ?", "When do I get paid?"),
    (
        "Dès que le passager a effectivement reçu l'indemnité du transporteur, Robin des Airs déclenche votre commission : en général sous 48h, sur le moyen convenu (virement bancaire, Mobile Money, etc.).",
        "Once the passenger has actually received airline compensation, Robin des Airs triggers your commission — typically within 48 business hours via agreed payout (bank, Wave, etc.).",
    ),
    (
        "Mes clients peuvent-ils toucher jusqu'à 600€ ?",
        "Can my clients receive up to €600?",
    ),
    (
        "Le règlement CE 261/2004 (EU261) fixe des indemnités selon la distance du vol et le type d'incident. Le plafond indicatif pour les segments les plus longs est <strong>600€</strong> (environ <strong>395.000 FCFA</strong>) par passager. Le montant effectivement versé à votre client dépend de la compagnie et des modalités du dossier.",
        "EC 261/2004 sets compensation by distance and incident type. The indicative cap on the longest segments is <strong>€600</strong> (about <strong>50,400 GMD</strong> at 84 GMD/€) per passenger. The amount your client receives depends on the airline and case.",
    ),
    (
        "Puis-je choisir la commission en euros ou en FCFA ?",
        "How is commission calculated in The Gambia?",
    ),
    (
        "Oui. Au moment de l'inscription, vous sélectionnez <strong>EUR (45 €)</strong> ou <strong>FCFA (30.000 FCFA)</strong> par passager indemnisé. La convention est ajustée en conséquence (versement SEPA en euros vs Mobile Money / virement local).",
        "Commission is in <strong>Gambian dalasi (GMD)</strong> per compensated passenger, tier locked at signing. See <a href=\"/paliers-commission-agence-en.html\">commission tiers</a> and sign the <a href=\"/partner-agreement-en.html\">partner agreement</a>. Founding partners (3 slots before 31 Aug 2026): <strong>4,000 GMD/pax</strong>.",
    ),
    ("Comment envoyer un dossier ?", "How do I send a case?"),
    (
        "Une fois partenaire, la <strong>veille</strong> est assurée par Robin des Airs : les situations pertinentes vous sont <strong>notifiées en amont</strong>, vous n'avez pas à signaler chaque retard à la main. Dès qu'un client a réservé et que vous nous donnez le vol, nous lançons la surveillance. Pour l'intégration ou un cas particulier, vous pouvez aussi écrire à <strong>expert@robindesairs.eu</strong>, utiliser le formulaire ci-dessous, ou WhatsApp au <strong>+33 6 77 47 01 22</strong>.",
        "Once partnered, Robin des Airs <strong>monitors</strong> relevant situations and <strong>notifies you early</strong> — no manual report for every delay. Share the flight when the client books. For onboarding or edge cases: <strong>partners@robindesairs.eu</strong>, the form below, or WhatsApp <strong>+33 6 77 47 01 22</strong>.",
    ),
    (
        "Les données de mes voyageurs sont-elles protégées ?",
        "Are my travellers’ data protected?",
    ),
    (
        "Oui. Les données sont hébergées en Europe et le traitement est conforme au RGPD. La confidentialité de vos clients est une priorité absolue pour Robin des Airs.",
        "Yes. Data is hosted in Europe with GDPR-compliant processing. Client confidentiality is a priority.",
    ),
    ("Quels vols sont éligibles ?", "Which flights are eligible?"),
    (
        "Les vols relevant du cadre EU261/2004 : retard à l'arrivée significatif, annulation, surbooking ou conséquences sur une correspondance lorsque l’itinéraire reste couvert par le règlement, sur des routes Afrique sub-saharienne ↔ Europe opérées par une compagnie européenne ou au départ d'un aéroport européen.",
        "Flights under EC 261/2004: significant arrival delay, cancellation, denied boarding or connection impact when the itinerary remains covered — sub-Saharan Africa ↔ Europe on EU carriers or departing from a European airport.",
    ),
    (
        "Puis-je être contacté directement sur WhatsApp ?",
        "Can I contact you on WhatsApp?",
    ),
    (
        "Oui. Écrivez-nous au <strong>+33 6 77 47 01 22</strong> (composez l'indicatif de votre pays d'abord). Idéal pour un premier échange, une question ou un complément d'information ; le fil principal reste la <strong>notification en amont</strong> sur les dossiers suivis.",
        "Yes. Message <strong>+33 6 77 47 01 22</strong> (include your country code). Great for a first chat; day-to-day, <strong>early alerts</strong> on monitored files are the main channel.",
    ),
    ("Inscription ouverte — Plan de développement 2026", "Open registration — 2026 partner plan"),
    (
        "Plus vous attendez,<br/><span class=\"highlight\">plus vos clients perdent</span>",
        "The longer you wait,<br/><span class=\"highlight\">the more your clients lose</span>",
    ),
    (
        "Chaque mois d'attente, ce sont des dossiers non traités, des clients déçus, et un revenu agence que vous ne toucherez jamais. L'inscription prend 90 secondes. La convention est signée sous 24h. Le premier dossier peut partir aujourd'hui.",
        "Every month of delay means unhandled claims, disappointed clients and commission you never receive. Registration takes 90 seconds. Agreement signed within 24h. First case can start today.",
    ),
    ("✦ Démarrer mon partenariat maintenant", "✦ Start my partnership now"),
    ("Aucun frais", "No fees"),
    ("Aucun engagement", "No commitment"),
    ("Arrêt possible à tout moment", "Leave anytime"),
    ("Inscription", "Registration"),
    ("Rejoindre le programme partenaire", "Join the partner programme"),
    ("Inscription gratuite, convention signée en 24h", "Free registration · agreement within 24h"),
    ("Vos informations", "Your details"),
    (
        "Remplissez le formulaire, nous vous recontactons sous 24h pour finaliser votre convention.",
        "Complete the form — we contact you within 24h to finalise your <a href=\"/partner-agreement-en.html\">partner agreement</a>.",
    ),
    ("Votre nom &amp; prénom *", "Your full name *"),
    ("Nom complet", "Full name"),
    ("WhatsApp / Téléphone *", "WhatsApp / Phone *"),
    ('value="+221"', 'value="+220"'),
    ('placeholder="+221"', 'placeholder="+220"'),
    ('title="Indicatif international avec + (ex. +221, +33, +1)"', 'title="International dialling code with + (e.g. +220, +33)"'),
    ("Numéro sans indicatif", "Number without country code"),
    (
        "Tout indicatif pays est possible (saisie libre). Le drapeau s'ajuste selon l'indicatif reconnu ; la liste propose des raccourcis courants.",
        "Any country code works. Flag updates when recognised; list suggests common codes.",
    ),
    ("Convention préférée *", "Payout currency *"),
    ('<input type="radio" id="cv-eur" name="convention" value="EUR 45 EUR" checked />', '<input type="radio" id="cv-gmd" name="convention" value="GMD 3800 GMD" checked />'),
    ('<label for="cv-eur" class="conv-label">', '<label for="cv-gmd" class="conv-label">'),
    ('<div class="conv-amount">45€</div>', '<div class="conv-amount">3,800</div>'),
    ('<div class="conv-ccy">EUR / passager</div>', '<div class="conv-ccy">GMD / passenger</div>'),
    ('<div class="conv-badge">Priorité</div>', '<div class="conv-badge">Gambia</div>'),
    ('<input type="radio" id="cv-fcfa" name="convention" value="FCFA 30.000 FCFA" />', '<input type="radio" id="cv-eur" name="convention" value="EUR 45 EUR equivalent" />'),
    ('<label for="cv-fcfa" class="conv-label">', '<label for="cv-eur" class="conv-label">'),
    ('<div class="conv-amount">30.000</div>', '<div class="conv-amount">€45</div>'),
    ('<div class="conv-ccy">FCFA / passager</div>', '<div class="conv-ccy">equivalent / pax</div>'),
    ('<div class="conv-badge">Équivalent local</div>', '<div class="conv-badge">Reference</div>'),
    ("Volume de voyageurs par mois (estimation)", "Monthly travellers (estimate)"),
    ("— Optionnel —", "— Optional —"),
    ("Moins de 50 voyageurs", "Under 50 travellers"),
    ("50 – 200 voyageurs", "50 – 200 travellers"),
    ("200 – 500 voyageurs", "200 – 500 travellers"),
    ("Plus de 500 voyageurs", "Over 500 travellers"),
    ("Message ou questions (facultatif)", "Message or questions (optional)"),
    ("Routes principales, questions sur la convention…", "Main routes, questions about tiers…"),
    ("✦ Envoyer ma demande de partenariat", "✦ Send partnership request"),
    ("💬 Ouvrir WhatsApp avec ce message", "💬 Open WhatsApp with this message"),
    (
        "Renseignez les champs obligatoires (agence, nom, indicatif, numéro, e-mail) pour générer le message prérempli vers Robin des Airs.",
        "Fill required fields (agency, name, country code, number, email) to generate the WhatsApp message.",
    ),
    ("🔒 Données protégées · Réponse sous 24h · Aucun engagement", "🔒 Data protected · Reply within 24h · No commitment"),
    ("Une question ? Contactez-nous directement", "Questions? Contact us directly"),
    ("✦ Rejoindre en 90 secondes", "✦ Join in 90 seconds"),
    ("Mentions légales", "Legal notice"),
    ("Tous droits réservés.", "All rights reserved."),
    ('placeholder="Ex. : Agence Voyages Dakar"', 'placeholder="e.g. Kombo Travel Services"'),
    ('<span class="indicatif-flag" id="indicatif-flag" title="Indicatif pays" role="img" aria-label="Drapeau indicatif">🇸🇳</span>', '<span class="indicatif-flag" id="indicatif-flag" title="Country code" role="img" aria-label="Country flag">🇬🇲</span>'),
]

for old, new in REPL:
    if old not in text:
        print("WARN missing:", old[:60])
    text = text.replace(old, new)

# Simulator script — GMD
OLD_SIM = """      const m = eligibles * 30000;
      const y = m * 12;
      const eurM = eligibles * 45;
      const eurY = eurM * 12;
      clients.textContent = fmt(v);
      rate.textContent = '≈ ' + eligibles + ' dossier' + (eligibles>1?'s':'') + ' éligible' + (eligibles>1?'s':'') + '/mois';
      monthly.textContent = fmt(eurM) + '€ (' + fmt(m) + ' FCFA)';
      yearly.textContent = fmt(eurY) + '€ (' + fmt(y) + ' FCFA)';"""

NEW_SIM = """      const gmdM = eligibles * 3800;
      const gmdY = gmdM * 12;
      const eurM = Math.round(eligibles * 45);
      const eurY = eurM * 12;
      clients.textContent = fmt(v);
      rate.textContent = '≈ ' + eligibles + ' eligible claim' + (eligibles>1?'s':'') + '/month';
      monthly.textContent = fmt(gmdM) + ' GMD (≈ €' + fmt(eurM) + ')';
      yearly.textContent = fmt(gmdY) + ' GMD (≈ €' + fmt(eurY) + ') over 12 months';"""

if OLD_SIM in text:
    text = text.replace(OLD_SIM, NEW_SIM)
else:
    print("WARN: simulator block not found")

# WhatsApp buildMessage — English + GMD
OLD_WA = """    var convRadio = form.querySelector('input[name="convention"]:checked');
    var isEur = convRadio && convRadio.value.indexOf('EUR') !== -1;
    var conventionText = isEur
      ? '45 € nets par passager indemnisé — commission agence versée sur le compte pro (SEPA), typiquement sous 48h après encaissement côté passager.'
      : '30 000 FCFA nets par passager indemnisé (équivalent 45€) — versés sur le compte agence (Orange Money / Wave), typiquement sous 48h après encaissement côté passager.';"""

NEW_WA = """    var convRadio = form.querySelector('input[name="convention"]:checked');
    var isGmd = convRadio && convRadio.value.indexOf('GMD') !== -1;
    var conventionText = isGmd
      ? '3,800 GMD net per compensated passenger — paid to agency account (Wave / Afrimoney / QMoney), typically within 48 business hours after passenger payment.'
      : '€45 equivalent per compensated passenger — GMD tier applies at signing (see partner agreement).';"""

if OLD_WA in text:
    text = text.replace(OLD_WA, NEW_WA)

OLD_MSG = """    return [
      'Bonjour Robin, agence ' +
        agName +
        ' intéressée par le programme partenaire. Merci de nous rappeler sur WhatsApp pour finaliser. 🙏',
      '',
      'Nouvelle demande de partenariat agence',
      '',
      'Voici nos infos.',
      '— Nom : ' + agName,
      '— Contact : ' + nom.value.trim(),
      phoneLine,
      emailLine,
      '',
      'Convention choisie',
      conventionText,
      '',
      'Volume estimé',
      volumeText,
      '',
      'Message libre',
      messageText
    ].join('\\n');"""

NEW_MSG = """    return [
      'Hello Robin — ' + agName + ' is interested in the Gambia travel agency partner programme. Please call us on WhatsApp to finalise. 🙏',
      '',
      'New agency partnership request (Gambia EN page)',
      '',
      'Details:',
      '— Agency: ' + agName,
      '— Contact: ' + nom.value.trim(),
      phoneLine.replace('— Téléphone / WhatsApp :', '— WhatsApp / Phone:'),
      emailLine.replace('— E-mail :', '— Email:'),
      '',
      'Payout preference',
      conventionText,
      '',
      'Estimated volume',
      volumeText,
      '',
      'Message',
      messageText
    ].join('\\n');"""

if OLD_MSG in text:
    text = text.replace(OLD_MSG, NEW_MSG)

# Hero WA links
text = text.replace(
    "Bonjour%20Robin%20des%20Airs%2C%0A%0AJe%20viens%20de%20la%20page%20Programme%20agents%20voyage.%20Je%20repr%C3%A9sente%20une%20agence%20de%20voyages%20et%20souhaite%20des%20informations%20sur%20le%20partenariat%20(45%E2%82%AC%20%2F%2030%20000%20FCFA%20par%20passager).%0A%0AMerci%20%21",
    "Hello%20Robin%20des%20Airs%2C%0A%0AI%20am%20on%20the%20Gambia%20travel%20agency%20programme%20page.%20I%20represent%20a%20travel%20agency%20and%20would%20like%20information%20on%20the%20partnership%20(3%2C800%20GMD%20per%20passenger).%0A%0AThank%20you%21",
)
text = text.replace(
    "Bonjour%20Robin%20des%20Airs%2C%0A%0AJe%20viens%20de%20la%20page%20Programme%20agents%20voyage.%20Je%20repr%C3%A9sente%20une%20agence%20de%20voyages%20et%20souhaite%20des%20informations%20sur%20le%20partenariat%20(convention%2C%20commission%2030%20000%20FCFA).%0A%0AMerci%20%21",
    "Hello%20Robin%20des%20Airs%2C%0A%0AGambia%20agency%20programme%20page%20%E2%80%94%20partnership%20info%20(3%2C800%20GMD%20per%20passenger).%0A%0AThank%20you%21",
)

# Hidden form market tag
text = text.replace(
    '<input type="hidden" name="form-name" value="partenaire" />',
    '<input type="hidden" name="form-name" value="partenaire" />\n          <input type="hidden" name="market" value="gambia-en" />',
    1,
)

# Header nav links
header_nav = """  <div class="logo">
    <div class="logo-mark">✈</div>
    Robin<span>&nbsp;des Airs</span>
  </div>
</header>"""

header_nav_en = """  <div class="logo">
    <div class="logo-mark">✈</div>
    Robin<span>&nbsp;des Airs</span>
  </div>
  <nav style="display:flex;gap:14px;align-items:center;font-size:0.85rem">
    <a href="/paliers-commission-agence-en.html" style="color:rgba(255,255,255,0.75)">Tiers</a>
    <a href="/partner-agreement-en.html" style="color:rgba(255,255,255,0.75)">Agreement</a>
    <a href="/programme-agents-voyage.html" style="color:rgba(255,255,255,0.55)">FR</a>
  </nav>
</header>"""

text = text.replace(header_nav, header_nav_en, 1)

DST.write_text(text, encoding="utf-8")
print("Wrote", DST, "chars", len(text))

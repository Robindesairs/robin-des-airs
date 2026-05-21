#!/usr/bin/env python3
"""Build mandat-en.html from mandat.html — phrase replacements only."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = (ROOT / "mandat.html").read_text(encoding="utf-8")

PAIRS = [
    ('lang="fr"', 'lang="en"'),
    ('Signez votre mandat de représentation Robin des Airs — CE 261/2004. No Win No Fee.',
     'Sign your Robin des Airs representation mandate — EU 261/2004. No win, no fee.'),
    ('Mandat de Représentation — Robin des Airs', 'Representation Mandate — Robin des Airs'),
    ('Signez votre mandat CE 261 en 2 minutes — sécurisé, honoraires uniquement après succès.',
     'Sign your EU 261 mandate in 2 minutes — secure, fees only on success.'),
    ('Mandat de représentation — Robin des Airs', 'Representation mandate — Robin des Airs'),
    ('https://robindesairs.eu/mandat.html', 'https://robindesairs.eu/mandat-en.html'),
    ('Signez votre mandat CE 261 en 2 minutes — sécurisé.', 'Sign your EU 261 mandate in 2 minutes — secure.'),
    ('Mandat de représentation · CE 261/2004', 'Representation mandate · EU 261/2004'),
    ('Service de réclamation · Vols Europe–Afrique · No Win No Fee',
     'Claims service · Europe–Africa flights · No win no fee'),
    ('Réf. :', 'Ref.:'),
    ('Mandat de Représentation', 'Representation Mandate'),
    ("Convention exclusive de gestion et recouvrement d'indemnité aérienne",
     'Exclusive mandate for EU 261 compensation recovery'),
    ('Indemnité légale brute', 'Statutory compensation (gross)'),
    ('Règlement CE 261/2004', 'Regulation (EC) No 261/2004'),
    ('✅ Net dans votre poche', '✅ Net to you'),
    ('Après commission RDA (25% si succès)', 'After RDA fee (25% on success only)'),
    ('👥 Les parties', '👥 The parties'),
    ('Le Mandant (vous)', 'Client (you)'),
    ('Passager(s) lésé(s)', 'Affected passenger(s)'),
    ('Vol concerné :', 'Flight:'),
    ('Le Mandataire', 'Representative'),
    ('Service juridique CE 261/2004', 'EU 261/2004 claims service'),
    ('✍️ Vos coordonnées', '✍️ Your details'),
    ('Prénom', 'First name'),
    ('Champ obligatoire', 'Required'),
    ('Adresse postale complète', 'Full postal address'),
    ('Adresse requise pour le mandat', 'Address required for the mandate'),
    ('✈️ Informations du vol', '✈️ Flight details'),
    ('Compagnie aérienne', 'Airline'),
    ('Numéro de vol', 'Flight number'),
    ('Date du vol', 'Flight date'),
    ('Code réservation (PNR)', 'Booking reference (PNR)'),
    ("Type d'incident", 'Incident type'),
    ('— Sélectionner —', '— Select —'),
    ('Retard &gt; 3 heures', 'Delay &gt; 3 hours'),
    ('Annulation', 'Cancellation'),
    ("Refus d'embarquement (surbooking)", 'Denied boarding (overbooking)'),
    ('Aéroport de départ', 'Departure airport'),
    ("Aéroport d'arrivée", 'Arrival airport'),
    ('➕ Ajouter un passager', '➕ Add a passenger'),
    ('Chaque passager du même vol peut être ajouté. Le montant net est recalculé automatiquement.',
     'Each passenger on the same flight can be added. Net amount is recalculated automatically.'),
    ('⚖️ Conditions du mandat', '⚖️ Mandate terms'),
    ('Article 1 — Objet du mandat et adresse email du dossier', 'Article 1 — Purpose and case email address'),
    ('Article 2 — Durée', 'Article 2 — Term'),
    ('Article 3 — Exclusivité & Anti-contournement', 'Article 3 — Exclusivity & anti-circumvention'),
    ('Article 4 — Honoraires · No Win, No Fee', 'Article 4 — Fees · No win, no fee'),
    ('Article 4.1 — Frais Judiciaires', 'Article 4.1 — Legal costs'),
    ('<tr><th>Distance du vol</th><th>Indemnité légale / pax</th><th>Commission RDA (25%)</th><th>Net client</th></tr>',
     '<tr><th>Flight distance</th><th>Statutory amount / pax</th><th>RDA fee (25%)</th><th>Client net</th></tr>'),
    ('Article 5 — Paiement & Protection du Mandant', 'Article 5 — Payment & client protection'),
    ('Article 6 — Clause Non Libératoire pour la Compagnie Aérienne',
     'Article 6 — Non-release clause (airline)'),
    ('Article 7 — Obligations de Robin des Airs', 'Article 7 — Robin des Airs obligations'),
    ('Article 8 — Obligations du Mandant', 'Article 8 — Client obligations'),
    ('Article 9 — Droit de rétractation (14 jours) & Démarrage immédiat',
     'Article 9 — 14-day withdrawal & immediate start'),
    ('Article 10 — Confidentialité & RGPD', 'Article 10 — Confidentiality & GDPR'),
    ('Article 11 — Loi applicable & Règlement des litiges', 'Article 11 — Governing law & disputes'),
    ('✅ Déclaration & Consentement', '✅ Declaration & consent'),
    ('Je soussigné(e)', 'I, the undersigned'),
    ('Veuillez cocher cette case pour valider le mandat.', 'Please tick this box to sign the mandate.'),
    ('🖊️ Signature électronique', '🖊️ Electronic signature'),
    ('Fait à (ville)', 'Signed at (city)'),
    ('Signez ci-dessous avec votre doigt ou votre souris :', 'Sign below with finger or mouse:'),
    ('✍️ Appuyez ici pour signer', '✍️ Tap here to sign'),
    ('✕ Effacer', '✕ Clear'),
    ('Signature obligatoire', 'Signature required'),
    ('✍️ Signer mon mandat', '✍️ Sign my mandate'),
    ('🔒 Sécurisé', '🔒 Secure'),
    ('⚖️ CE 261/2004', '⚖️ EU 261/2004'),
    ('💶 No Win No Fee', '💶 No win no fee'),
    ('✈ Europe-Afrique', '✈ Europe–Africa'),
    ('Mandat signé !', 'Mandate signed!'),
    ('Votre dossier est enregistré. Robin des Airs traite votre réclamation.',
     'Your case is registered. Robin des Airs is handling your claim.'),
    ('Référence dossier :', 'Case reference:'),
    ('Adresse email du dossier :', 'Case email address:'),
    ('Envoi en cours...', 'Sending…'),
    ("toLocaleDateString('fr-FR'", "toLocaleDateString('en-GB'"),
    ('Adresse de référence du dossier :', 'Case reference email:'),
    ('Retour à robindesairs.eu →', 'Back to robindesairs.eu →'),
    ('Chaque passager majeur doit confirmer son accord. Cochez la case correspondant à chaque co-passager adulte.',
     'Each adult passenger must confirm. Tick the box for each adult co-passenger.'),
    (' — Signataire principal', ' — Main signatory'),
    ('Passager mineur', 'Minor passenger'),
    (' (moins de 18 ans) — un représentant légal devra co-signer',
     ' (under 18) — a legal guardian must co-sign'),
    (' confirme mandater Robin des Airs', ' confirms appointing Robin des Airs'),
    ('⚠️ Date de naissance obligatoire pour les mineurs', '⚠️ Date of birth required for minors'),
    ('Je mandate <strong>Robin des Airs</strong> pour récupérer mon indemnité aérienne.',
     'I appoint <strong>Robin des Airs</strong> to recover my flight compensation.'),
    ('<strong>Aucun frais si le dossier échoue.</strong> Commission de 25% uniquement en cas de succès.',
     '<strong>No fee if the case fails.</strong> 25% commission on success only.'),
    ('Mandat exclusif 24 mois · Rétractation possible sous 14 jours par email · RGPD',
     'Exclusive 24-month mandate · 14-day withdrawal by email · GDPR'),
    ('<strong>Je demande le démarrage immédiat de mon dossier</strong>, sans attendre l\'expiration du délai de rétractation de 14 jours.',
     '<strong>I request immediate processing</strong> without waiting for the 14-day withdrawal period.'),
]

LONG = [
    ("Le Mandant confie à Robin des Airs une mission <strong>exclusive</strong> d'agir en son nom et pour son compte afin d'obtenir l'indemnisation due au titre du <strong>Règlement (CE) n° 261/2004</strong>, par toute voie amiable, administrative, judiciaire ou arbitrale.",
     "The Client grants Robin des Airs an <strong>exclusive</strong> mandate to obtain compensation under <strong>Regulation (EC) No 261/2004</strong>, by amicable, administrative, judicial or arbitral means."),
    ("Pour les besoins du traitement du dossier, Robin des Airs crée une <strong>adresse email technique</strong> unique, composée de la référence du mandat en minuscules suivie de «&nbsp;@robindesairs.eu&nbsp;»",
     "Robin des Airs creates a unique <strong>technical email address</strong>: lowercase mandate reference + <strong>@robindesairs.eu</strong>"),
    ("Cette adresse constitue l'<strong>adresse de référence du dossier</strong> pour l'ensemble des échanges avec la compagnie aérienne, ses représentants, ses conseils, ses intermédiaires et, plus généralement, tout tiers intervenant dans le cadre du recouvrement.",
     "This is the <strong>reference address for the file</strong> for exchanges with the airline and any third party involved in recovery."),
    ("<strong>Robin des Airs en assure seul l'administration et la gestion exclusive.</strong>",
     "<strong>Robin des Airs alone administers and manages it.</strong>"),
    ("Le Mandant <strong>autorise expressément</strong> Robin des Airs à créer et exploiter, pour la durée du mandat, cette adresse et à l'utiliser pour toute correspondance utile au traitement du dossier, y compris les mises en demeure et actes de procédure.",
     "The Client <strong>expressly authorises</strong> Robin des Airs to create and use this address for the mandate term, including formal notices and procedural steps."),
    ("Robin des Airs <strong>conserve les accès, copies et pièces</strong> issus de ces échanges afin d'assurer la traçabilité du dossier.",
     "Robin des Airs <strong>keeps access, copies and documents</strong> for file traceability."),
    ("Le Mandant reconnaît que Robin des Airs pourra également utiliser, <strong>si la procédure l'exige</strong>, l'adresse email personnelle du Mandant communiquée dans le présent mandat ou ultérieurement.",
     "The Client acknowledges Robin des Airs may use the Client's <strong>personal email if required</strong>, as stated in this mandate or later."),
    ("Le <strong>suivi opérationnel avec le Mandant</strong> peut notamment être assuré via <strong>WhatsApp</strong> ou tout autre canal de communication convenu entre les parties,",
     "Operational <strong>updates to the Client</strong> may use <strong>WhatsApp</strong> or any other agreed channel,"),
    ("<strong>sans caractère exclusif</strong> de ces canaux pour la notification d'informations importantes.",
     "<strong>without these channels being exclusive</strong> for important notices."),
    ("Le mandat est consenti pour <strong>24 mois</strong> à compter de la signature. Cette durée est nécessaire pour traiter les dossiers complexes incluant relances, médiation et procédure judiciaire si nécessaire. Il peut être résilié par email à tout moment en cas de <strong>faute grave, fraude avérée ou non-coopération persistante</strong> de l'une des parties, avec un préavis de 15 jours.",
     "The mandate runs <strong>24 months</strong> from signature. It may be terminated by email for <strong>serious breach, fraud or persistent non-cooperation</strong>, with 15 days' notice."),
    ("Le présent mandat est <strong>exclusif</strong>. Pendant sa durée, le Mandant s'engage à ne pas confier le même dossier à un tiers ni à négocier directement avec la compagnie pour le même incident <strong>sans en informer préalablement Robin des Airs</strong>. Tout accord conclu en violation de cette clause engage la responsabilité du Mandant, qui restera redevable de la commission convenue.",
     "This mandate is <strong>exclusive</strong>. The Client shall not assign the same case elsewhere nor negotiate with the airline for the same incident <strong>without prior notice to Robin des Airs</strong>."),
    ("Robin des Airs perçoit une commission de <strong>25% TTC du montant effectivement encaissé</strong>, <strong>uniquement en cas de succès</strong>. En cas d'échec ou de non-recouvrement, <strong>aucun frais n'est dû</strong>. Aucune avance n'est exigée à aucun stade.",
     "Robin des Airs charges <strong>25% incl. VAT of amounts collected</strong>, <strong>success fee only</strong>. If the case fails, <strong>no fee is due</strong>. No upfront payment."),
    ("Robin des Airs prend en charge <strong>100% des frais d'avocat, de greffe, d'huissier et de procédure judiciaire TTC</strong> liés au traitement du dossier. Le Mandant n'avance aucune somme à quelque stade que ce soit. Robin des Airs se réserve le droit de <strong>sélectionner librement les dossiers</strong> qu'elle estime viables avant d'engager une procédure judiciaire.",
     "Robin des Airs covers <strong>100% of legal and court costs</strong>. The Client pays nothing upfront. Robin des Airs may <strong>select viable cases</strong> before court action."),
    ("Le Mandant donne instruction expresse à la compagnie aérienne de verser toute indemnité au <strong>compte désigné par Robin des Airs</strong>. Dès encaissement, Robin des Airs reverse au Mandant sa part nette (75%) sur l'IBAN communiqué dans ce mandat, dans un délai de <strong>48 heures ouvrées</strong>. Si la compagnie verse directement au Mandant, celui-ci s'engage à reverser sans délai la commission de 25% à Robin des Airs.",
     "The Client instructs the airline to pay to the <strong>account designated by Robin des Airs</strong>. Within <strong>48 business hours</strong>, Robin pays the Client's net share (75%). Direct payment to the Client requires immediate remittance of the 25% fee."),
    ("<strong>Tout paiement effectué directement par la compagnie aérienne au Mandant ne libère pas la compagnie de ses obligations</strong> envers Robin des Airs, mandataire exclusif désigné par acte signé.",
     "<strong>Payment by the airline directly to the Client does not release the airline</strong> towards Robin des Airs as exclusive representative."),
    ("En conséquence : (i) tout règlement opéré directement au Mandant en violation de cette instruction sera réputé <strong>non libératoire à l'égard de Robin des Airs</strong> ; (ii) la compagnie demeurera redevable du paiement auprès du mandataire ; (iii) Robin des Airs se réserve le droit d'engager toute action en recouvrement, y compris judiciaire, à l'encontre de la compagnie aérienne. Cette stipulation constitue une <strong>instruction de paiement irrévocable</strong> au sens des articles 1984 et suivants du Code civil, opposable à tout tiers dûment notifié.",
     "Accordingly: (i) direct payment to the Client in breach of this instruction is <strong>not release towards Robin des Airs</strong>; (ii) the airline remains liable to the representative; (iii) Robin des Airs may pursue recovery including court action."),
    ("Robin des Airs s'engage à : (i) instruire le dossier avec diligence ; (ii) informer le Mandant à chaque étape clé ; (iii) reverser les sommes dans les 48h ouvrées après encaissement ; (iv) notifier expressément la compagnie aérienne de l'existence du présent mandat et de l'instruction de paiement exclusif ; (v) protéger les données personnelles conformément au RGPD.",
     "Robin des Airs shall: (i) process diligently; (ii) inform at key stages; (iii) pay within 48 business hours after collection; (iv) notify the airline of this mandate; (v) protect data under GDPR."),
    ("Le Mandant s'engage à : (i) fournir des informations exactes et complètes ; (ii) transmettre tout document utile dans les meilleurs délais ; (iii) informer Robin des Airs de <strong>tout contact ou offre de la compagnie aérienne dans les 24h</strong> ; (iv) ne pas accepter ni encaisser aucun paiement de la compagnie sans en aviser Robin des Airs ; (v) ne pas agir en parallèle sur le même dossier sans accord préalable écrit.",
     "The Client shall: (i) provide accurate information; (ii) send documents promptly; (iii) notify Robin des Airs within <strong>24h of airline contact</strong>; (iv) not accept airline payment without notice; (v) not act in parallel without written consent."),
    ("Conformément aux articles L. 221-18 et suivants du Code de la consommation, le Mandant dispose d'un <strong>délai de rétractation de 14 jours calendaires</strong> à compter de la signature, sans pénalité. Il suffit d'envoyer un email à <strong>contact@robindesairs.eu</strong> avec la mention « Je me rétracte — Réf. [numéro de dossier] ».",
     "Under French consumer law, the Client has <strong>14 calendar days to withdraw</strong> by email to <strong>contact@robindesairs.eu</strong> with « I withdraw — Ref. [case number] »."),
    ("Conformément à l'article L. 221-25 du Code de la consommation, si le Mandant demande expressément l'<strong>exécution immédiate du mandat avant l'expiration du délai de 14 jours</strong> (case cochée ci-dessous), Robin des Airs est autorisée à débuter les démarches sans attendre. En cas de rétractation ultérieure dans ce délai, le Mandant reconnaît que les prestations déjà accomplies seront dues au prorata — étant précisé qu'aucune somme ne sera exigible avant encaissement effectif de l'indemnité (principe No Win No Fee).",
     "If the Client requests <strong>immediate performance before 14 days end</strong> (box below), Robin des Airs may start without waiting. Withdrawal within that period may make completed services due pro rata — no amount before compensation is collected."),
    ("Les données personnelles collectées sont utilisées exclusivement pour la gestion du dossier. Elles ne sont pas revendues. Conformément au RGPD, le Mandant dispose d'un droit d'accès, de rectification et de suppression en contactant contact@robindesairs.eu.",
     "Personal data is used only for case management, not sold. GDPR rights: contact@robindesairs.eu."),
    ("Le présent mandat est soumis au <strong>droit français</strong>. En cas de litige, les parties privilégient une résolution amiable dans les 30 jours. À défaut d'accord, le différend est soumis aux juridictions compétentes.",
     "This mandate is governed by <strong>French law</strong>. Disputes shall be resolved amicably within 30 days; failing agreement, competent courts apply."),
    ("déclare sur l'honneur avoir bien été passager(e) sur le vol indiqué à la date mentionnée, et avoir subi le préjudice déclaré (retard, annulation ou refus d'embarquement).",
     "declare that I was a passenger on the stated flight and suffered the declared harm (delay, cancellation or denied boarding)."),
    ('Création et gestion exclusive par Robin des Airs — cadre juridique : <strong>Article 1</strong>.',
     'Created and managed by Robin des Airs — see <strong>Article 1</strong>.'),
]

out = src
for a, b in PAIRS + LONG:
    out = out.replace(a, b)


import re

if ".lang-pill-top" not in out:
    out = out.replace(
        "</style>",
        ".lang-pill-top{font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,.7);"
        "text-decoration:none;border:1px solid rgba(201,169,110,.4);padding:4px 10px;margin-right:6px}\n</style>",
        1,
    )

topbar = (
    '<motion.div class="topbar">\n'
    '  <a href="/" style="text-decoration:none;color:inherit"><div class="brand">Robin <em>des</em> Airs</div></a>\n'
    '  <div style="display:flex;align-items:center;gap:8px">\n'
    '    <a href="/mandat.html" class="lang-pill-top">FR</a>\n'
    '    <a href="/documents-3-tiers.html" class="lang-pill-top">3 tiers</a>\n'
    '    <div class="doc-badge">Representation mandate · EU 261/2004</div>\n'
    '  </div>\n'
    '</div>'
).replace("<motion.div", "<div")

out = re.sub(
    r'<div class="topbar">.*?</div>\s*<div class="progress-wrap">',
    topbar + "\n<div class=\"progress-wrap\">",
    out,
    count=1,
    flags=re.DOTALL,
)

(ROOT / "mandat-en.html").write_text(out, encoding="utf-8")
print("written", len(out))

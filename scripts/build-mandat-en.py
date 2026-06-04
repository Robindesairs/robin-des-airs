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
    ("Le Mandant confie à Robin des Airs une mission <strong>exclusive</strong> d'agir en son nom et pour son compte afin d'obtenir, au titre du <strong>Règlement (CE) n° 261/2004</strong>, l'<strong>indemnisation forfaitaire</strong> (art. 7) ainsi que <strong>le remboursement des frais engagés, la prise en charge due (art. 8 et 9) et, le cas échéant, la réparation du préjudice complémentaire (art. 12)</strong> liés au retard, à l'annulation ou au refus d'embarquement, par toute voie amiable, administrative, judiciaire ou arbitrale.",
     "The Client grants Robin des Airs an <strong>exclusive</strong> mandate to act in its name and obtain, under <strong>Regulation (EC) No 261/2004</strong>, the <strong>fixed compensation</strong> (art. 7) as well as <strong>reimbursement of expenses incurred, the care due (arts. 8 and 9) and, where applicable, compensation for further damage (art. 12)</strong> linked to the delay, cancellation or denied boarding, by amicable, administrative, judicial or arbitral means."),
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
    ("Robin des Airs perçoit une commission de <strong>25% TTC du montant effectivement encaissé</strong>, <strong>uniquement en cas de succès</strong>. Cette commission s'applique à <strong>l'ensemble des sommes recouvrées au titre du dossier</strong> — indemnité forfaitaire, remboursements, frais et préjudices liés à l'incident. En cas d'échec ou de non-recouvrement, <strong>aucun frais n'est dû</strong>. Aucune avance n'est exigée à aucun stade.",
     "Robin des Airs charges <strong>25% incl. VAT of amounts collected</strong>, <strong>success fee only</strong>. This fee applies to <strong>all sums recovered for the case</strong> — fixed compensation, reimbursements, expenses and damages linked to the incident. If the case fails, <strong>no fee is due</strong>. No upfront payment."),
    ("Robin des Airs prend en charge <strong>100% des frais d'avocat, de greffe, d'huissier et de procédure judiciaire TTC</strong> liés au traitement du dossier. Le Mandant n'avance aucune somme à quelque stade que ce soit. Robin des Airs se réserve le droit de <strong>sélectionner librement les dossiers</strong> qu'elle estime viables avant d'engager une procédure judiciaire.",
     "Robin des Airs covers <strong>100% of legal and court costs</strong>. The Client pays nothing upfront. Robin des Airs may <strong>select viable cases</strong> before court action."),
    ("Le Mandant donne instruction expresse à la compagnie aérienne de verser toute indemnité au <strong>compte désigné par Robin des Airs</strong>. Dès encaissement, Robin des Airs reverse au Mandant sa part nette (75%) sur l'IBAN communiqué dans ce mandat, dans un délai de <strong>48 heures ouvrées</strong>. Si la compagnie verse directement au Mandant, celui-ci s'engage à reverser sans délai la commission de 25% à Robin des Airs.",
     "The Client instructs the airline to pay to the <strong>account designated by Robin des Airs</strong>. Within <strong>48 business hours</strong>, Robin pays the Client's net share (75%). Direct payment to the Client requires immediate remittance of the 25% fee."),
    ("<strong>Tout paiement effectué directement par la compagnie aérienne au Mandant ne libère pas la compagnie de ses obligations</strong> envers Robin des Airs, mandataire exclusif désigné par acte signé.",
     "<strong>Payment by the airline directly to the Client does not release the airline</strong> towards Robin des Airs as exclusive representative."),
    ("En conséquence : (i) tout règlement opéré directement au Mandant en violation de cette instruction sera réputé <strong>non libératoire à l'égard de Robin des Airs</strong> ; (ii) la compagnie demeurera redevable du paiement auprès du mandataire ; (iii) Robin des Airs se réserve le droit d'engager toute action en recouvrement, y compris judiciaire, à l'encontre de la compagnie aérienne. Cette stipulation constitue une <strong>instruction de paiement irrévocable</strong> au sens des articles 1984 et suivants du Code civil et s'appuie sur la <strong>cession de créance de l'Article 5 bis</strong> (articles 1321 à 1324 du Code civil)&nbsp;; elle est opposable à la compagnie aérienne et à tout tiers <strong>à compter de la notification</strong> qui leur en est faite.",
     "Accordingly: (i) any payment made directly to the Client in breach of this instruction is deemed <strong>not discharging towards Robin des Airs</strong>; (ii) the airline remains liable to the representative; (iii) Robin des Airs reserves the right to pursue recovery, including in court, against the airline. This stipulation is an <strong>irrevocable payment instruction</strong> under Articles 1984 et seq. of the French Civil Code and relies on the <strong>assignment of claim in Article 5 bis</strong> (Articles 1321 to 1324 of the French Civil Code)&nbsp;; it is enforceable against the airline and any third party <strong>from the notification</strong> given to them."),
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

NEW_PAIRS = [
    ("Mandat exclusif (art. 1984 C. civ.) & cession de créance née ou à naître aux fins de recouvrement (art. 1321 C. civ.) · CE 261/2004",
     "Exclusive mandate (art. 1984 French Civil Code) & assignment of a born or future claim for recovery purposes (art. 1321 French Civil Code) · EU 261/2004"),
    ("Afin de sécuriser l'encaissement, le présent mandat est <strong>complété par une cession de créance née ou à naître</strong> consentie à l'<strong>Article 5 bis</strong>, opposable à la compagnie aérienne dans les conditions des <strong>articles 1321 à 1324 du Code civil</strong>.",
     "To secure collection, this mandate is <strong>supplemented by an assignment of a born or future claim</strong> granted under <strong>Article 5 bis</strong>, enforceable against the airline pursuant to <strong>Articles 1321 to 1324 of the French Civil Code</strong>."),
    ("Article 5 bis — Cession de créance aux fins de recouvrement (créance née ou à naître)",
     "Article 5 bis — Assignment of claim for recovery purposes (born or future claim)"),
    ("Afin de sécuriser le recouvrement, le Mandant <strong>cède et transporte</strong> à Robin des Airs, qui l'accepte, la <strong>créance d'indemnisation née ou à naître</strong> qu'il détient à l'encontre de la compagnie aérienne au titre du <strong>Règlement (CE) n° 261/2004</strong> pour le vol identifié au présent acte (l'«&nbsp;Incident&nbsp;»), en ce compris l'<strong>indemnité forfaitaire</strong> (art. 7), les <strong>remboursements et frais</strong> (art. 8 et 9), le <strong>préjudice complémentaire</strong> (art. 12), intérêts, pénalités et accessoires.",
     "To secure recovery, the Client <strong>assigns and transfers</strong> to Robin des Airs, which accepts, the <strong>born or future compensation claim</strong> held against the airline under <strong>Regulation (EC) No 261/2004</strong> for the flight identified herein (the «&nbsp;Incident&nbsp;»), including the <strong>fixed compensation</strong> (art. 7), <strong>reimbursements and expenses</strong> (arts. 8 and 9), <strong>further damage</strong> (art. 12), interest, penalties and ancillary amounts."),
    ("Cette cession est consentie <strong>à titre de recouvrement</strong>&nbsp;: Robin des Airs en assure l'encaissement <strong>en qualité de cessionnaire</strong> et <strong>reverse au Mandant sa part nette (75&nbsp;%)</strong> dans les conditions de l'Article 5, déduction faite de la seule commission de l'Article 4. Elle ne modifie ni le caractère <strong>«&nbsp;No Win No Fee&nbsp;»</strong>, ni le droit de rétractation de l'Article 9.",
     "This assignment is granted <strong>for recovery purposes</strong>&nbsp;: Robin des Airs collects <strong>as assignee</strong> and <strong>pays the Client the net share (75&nbsp;%)</strong> under Article 5, less only the Article 4 fee. It changes neither the <strong>«&nbsp;No Win No Fee&nbsp;»</strong> nature nor the Article 9 withdrawal right."),
    ("Conformément aux <strong>articles 1321 à 1326 du Code civil</strong>, la cession prend effet <strong>entre les parties dès la signature</strong> et porte sur une créance <strong>déterminable</strong> (parties, vol, date, fondement CE&nbsp;261/2004). Elle est <strong>opposable à la compagnie aérienne (débiteur cédé) à compter de sa notification</strong> au sens de l'<strong>article 1324 du Code civil</strong>&nbsp;; la mise en demeure adressée par Robin des Airs <strong>vaut notification de la cession</strong>.",
     "Under <strong>Articles 1321 to 1326 of the French Civil Code</strong>, the assignment takes effect <strong>between the parties upon signature</strong> and covers a <strong>determinable claim</strong> (parties, flight, date, EU&nbsp;261/2004 basis). It is <strong>enforceable against the airline (assigned debtor) from notification</strong> under <strong>Article 1324 of the French Civil Code</strong>&nbsp;; the formal notice sent by Robin des Airs <strong>constitutes notification of the assignment</strong>."),
    ("En conséquence, <strong>à compter de cette notification, seul le paiement effectué entre les mains de Robin des Airs est libératoire</strong>&nbsp;; Robin des Airs est habilité à <strong>agir en recouvrement en son nom propre</strong>, par toute voie amiable, administrative, judiciaire ou arbitrale. Le Mandant <strong>garantit l'existence</strong> de la créance et déclare qu'elle n'a fait l'objet d'aucune cession, transaction ni paiement antérieur. À l'extinction du mandat sans recouvrement, ou en cas de rétractation dans le délai de l'Article 9, la créance est <strong>rétrocédée de plein droit</strong> au Mandant.",
     "Accordingly, <strong>from that notification, only payment into Robin des Airs' hands is discharging</strong>&nbsp;; Robin des Airs may <strong>pursue recovery in its own name</strong>, by amicable, administrative, judicial or arbitral means. The Client <strong>warrants the existence</strong> of the claim and declares it has not been previously assigned, settled or paid. If the mandate ends without recovery, or upon withdrawal within the Article 9 period, the claim is <strong>automatically re-assigned</strong> to the Client."),
    ("J'autorise <strong>Robin des Airs</strong> à récupérer mon indemnité aérienne en mon nom et je lui <strong>cède ma créance aux fins de recouvrement</strong> (Article 5 bis).",
     "I authorise <strong>Robin des Airs</strong> to recover my flight compensation on my behalf and I <strong>assign my claim to it for recovery purposes</strong> (Article 5 bis)."),
    ("Acceptation du Mandataire — Robin des Airs", "Acceptance by the Representative — Robin des Airs"),
    ("Robin des Airs <strong>accepte le présent mandat et la cession de créance</strong> (Article 5 bis) et en confirme la prise en charge dès l'ouverture du dossier — l'acceptation du mandataire est ainsi <strong>concomitante</strong> à la signature du Mandant.",
     "Robin des Airs <strong>accepts this mandate and the assignment of claim</strong> (Article 5 bis) and confirms handling from the opening of the file — the representative's acceptance is thus <strong>concurrent</strong> with the Client's signature."),
    ("Représentant habilité&nbsp;: <strong>Robin des Airs — Service juridique CE 261/2004</strong> · Réf. dossier&nbsp;: <strong id=\"sigRdaRef\">—</strong> · Acceptation le&nbsp;: <strong id=\"sigRdaDate\">—</strong>",
     "Authorised representative&nbsp;: <strong>Robin des Airs — EU 261/2004 claims service</strong> · Case ref.&nbsp;: <strong id=\"sigRdaRef\">—</strong> · Accepted on&nbsp;: <strong id=\"sigRdaDate\">—</strong>"),
    ("👥 Signature des co-passagers", "👥 Co-passenger signatures"),
    ("Pour que le mandat et la cession de créance soient <strong>opposables pour chaque passager</strong>, chaque co-passager majeur <strong>signe individuellement</strong> ci-dessous. Pour un passager mineur, son <strong>représentant légal</strong> indique son nom et signe en son nom.",
     "So that the mandate and the assignment of claim are <strong>enforceable for each passenger</strong>, every adult co-passenger <strong>signs individually</strong> below. For a minor passenger, their <strong>legal representative</strong> states their name and signs on their behalf."),
    ("Chaque co-passager doit signer (et le représentant légal pour un mineur).",
     "Each co-passenger must sign (and the legal representative for a minor)."),
    (" : son <strong>représentant légal</strong> signe en son nom et accepte le mandat et la cession de créance (Article 5 bis), aux mêmes conditions.",
     ": their <strong>legal representative</strong> signs on their behalf and accepts the mandate and the assignment of claim (Article 5 bis), on the same terms."),
    ("Je confirme mandater <strong>Robin des Airs</strong> et lui céder ma créance aux fins de recouvrement (Article 5 bis), aux mêmes conditions (No Win No Fee · commission 25% · rétractation 14 jours).",
     "I confirm appointing <strong>Robin des Airs</strong> and assigning my claim to it for recovery purposes (Article 5 bis), on the same terms (No Win No Fee · 25% commission · 14-day withdrawal)."),
    ("Nom du représentant légal <span", "Name of legal representative <span"),
    ("Prénom NOM du parent / tuteur", "First name SURNAME of parent / guardian"),
    ("✕ Recommencer", "✕ Start over"),
    ("Signature requise pour ce passager.", "Signature required for this passenger."),
    (" (mineur)", " (minor)"),
    ("Tracez votre signature ci-dessous (doigt ou souris) :", "Draw your signature below (finger or mouse):"),
    ("<strong>Clause de continuité.</strong> Si la cession est prohibée, refusée ou déclarée inopposable — notamment par les <strong>conditions générales de transport</strong> du transporteur — le <strong>mandat de représentation subsiste de plein droit</strong> et Robin des Airs agit alors <strong>au nom et pour le compte du Mandant</strong> sur le fondement des <strong>articles 1984 et suivants du Code civil</strong>, le Mandant demeurant titulaire de la créance. L'instruction de paiement de l'Article 5 reste applicable.",
     "<strong>Continuity clause.</strong> If the assignment is prohibited, refused or held unenforceable — in particular by the carrier's <strong>general conditions of carriage</strong> — the <strong>representation mandate subsists in full</strong> and Robin des Airs then acts <strong>in the name and on behalf of the Client</strong> on the basis of <strong>Articles 1984 et seq. of the French Civil Code</strong>, the Client remaining the creditor. The payment instruction in Article 5 continues to apply."),
    ("⚖️ Frais de justice pris en charge", "⚖️ Legal costs covered"),
    ("1 500 – 3 500 km (Maghreb — ex. Maroc)", "1,500 – 3,500 km (Maghreb — e.g. Morocco)"),
    ("&gt; 3 500 km (Afrique subsaharienne)", "&gt; 3,500 km (Sub-Saharan Africa)"),
    ("&gt; 3 500 km (Europe-Afrique)", "&gt; 3,500 km (Sub-Saharan Africa)"),
]

# Residual French added to mandat.html since the last EN generation.
NEW_PAIRS2 = [
    # --- "En clair" prefix (applies to all 17 boxes) ---
    ("💡 <strong>En clair&nbsp;:</strong>", "💡 <strong>In plain terms:</strong>"),

    # --- 17 "En clair" plain-language boxes ---
    ("Vous chargez Robin des Airs de récupérer l'argent que la compagnie vous doit. On agit d'abord en votre nom — ça garde l'accès à la médiation. Vol avec correspondance ? C'est l'arrivée finale qui compte — c'est couvert.",
     "You instruct Robin des Airs to recover the money the airline owes you. We act first in your name — this keeps access to mediation. Connecting flight? It is the final arrival that counts — it is covered."),
    ("Tant qu'on règle à l'amiable, vous restez propriétaire de votre dossier. Si on doit aller au tribunal, on bascule pour agir plus efficacement.",
     "As long as we settle amicably, you remain the owner of your case. If we have to go to court, we switch over to act more effectively."),
    ("Le mandat dure 24 mois. Il peut être arrêté de part et d'autre en cas de problème grave (préavis 15 jours).",
     "The mandate lasts 24 months. It can be ended by either side in the event of a serious problem (15 days' notice)."),
    ("Pendant ce temps, ne confiez pas le même dossier à quelqu'un d'autre et ne négociez pas seul avec la compagnie sans nous prévenir.",
     "In the meantime, do not entrust the same case to anyone else and do not negotiate alone with the airline without telling us."),
    ("On prend 25 % seulement si on récupère de l'argent. Si on ne gagne rien, vous ne payez rien.",
     "We take 25% only if we recover money. If we win nothing, you pay nothing."),
    ("Les frais d'avocat et de justice sont pour nous. Vous n'avancez jamais d'argent.",
     "Lawyer and court costs are on us. You never pay anything upfront."),
    ("La compagnie paie sur NOTRE compte, jamais le vôtre. On vous reverse vos 75 % sous 48 h une fois l'argent vraiment encaissé.",
     "The airline pays into OUR account, never yours. We pay you your 75% within 48 hours once the money is actually collected."),
    ("Pour sécuriser le recouvrement, vous nous cédez votre créance le temps de la récupérer. Si ça échoue, elle vous revient.",
     "To secure recovery, you assign us your claim for the time it takes to recover it. If it fails, it reverts to you."),
    ("Si la compagnie prétend que vous n'aviez pas le droit de nous céder le dossier, c'est faux : la justice européenne l'a tranché.",
     "If the airline claims you were not allowed to assign the case to us, that is false: the European courts have settled it."),
    ("Si la compagnie vous paie directement pour nous contourner, elle nous doit quand même le paiement.",
     "If the airline pays you directly to bypass us, it still owes us the payment."),
    ("On traite votre dossier avec sérieux, on vous tient informé, on vous paie vite et on protège vos données.",
     "We handle your case seriously, keep you informed, pay you quickly and protect your data."),
    ("On s'engage à tout faire pour gagner, mais aucun service ne peut garantir le résultat. Si on commet une erreur, notre responsabilité est plafonnée.",
     "We commit to doing everything to win, but no service can guarantee the outcome. If we make a mistake, our liability is capped."),
    ("Donnez-nous des infos exactes, prévenez-nous si la compagnie vous contacte, et n'encaissez rien sans nous le dire.",
     "Give us accurate information, let us know if the airline contacts you, and do not cash anything without telling us."),
    ("Vous pouvez changer d'avis sous 14 jours, sans frais ni justification.",
     "You can change your mind within 14 days, with no fee and no reason required."),
    ("Pour un enfant mineur, c'est le parent ou le tuteur qui signe à sa place.",
     "For a minor child, it is the parent or guardian who signs on their behalf."),
    ("Vos données servent uniquement à votre dossier. Jamais revendues.",
     "Your data is used only for your case. Never resold."),
    ("Droit français. En cas de litige, on cherche d'abord une solution à l'amiable.",
     "French law. In the event of a dispute, we first seek an amicable solution."),

    # --- "Ce que vous signez — l'essentiel" summary box ---
    ("📝 Ce que vous signez — l'essentiel", "📝 What you are signing — the essentials"),
    ("Vous chargez <strong>Robin des Airs</strong> de récupérer votre indemnité (jusqu'à 600 €) <strong>et</strong> vos frais.",
     "You instruct <strong>Robin des Airs</strong> to recover your compensation (up to €600) <strong>and</strong> your expenses."),
    ("<strong>25 % seulement si on récupère. Sinon 0 €</strong> — aucune avance, même au tribunal.",
     "<strong>25% only if we recover. Otherwise €0</strong> — nothing upfront, even in court."),
    ("Vous touchez <strong>75 % nets</strong>, versés sous 48 h après encaissement.",
     "You receive <strong>75% net</strong>, paid within 48 hours after collection."),
    ("La compagnie paie <strong>sur le compte de Robin des Airs</strong> (jamais le vôtre).",
     "The airline pays <strong>into the Robin des Airs account</strong> (never yours)."),
    ("Exclusif 24 mois · <strong>rétractation 14 jours</strong> sans frais · correspondances couvertes.",
     "Exclusive 24 months · <strong>14-day withdrawal</strong> free of charge · connections covered."),
    ("Le mandat complet, en langage clair, est juste en dessous — rien à payer pour le lire 🙂",
     "The full mandate, in plain language, is right below — nothing to pay to read it 🙂"),

    # --- Collapsible "read full mandate" ---
    ("📄 Lire le mandat complet (toutes les conditions)",
     "📄 Read the full mandate (all the terms)"),

    # --- Consent box ---
    ("J'ai lu et j'accepte le <strong>mandat de représentation</strong> (résumé ci-dessus, détail complet ci-dessus). ",
     "I have read and accept the <strong>representation mandate</strong> (summary above, full details above). "),

    # --- Article 1 title + double-régime paragraphs ---
    ("Article 1 — Objet, double régime et adresse email du dossier",
     "Article 1 — Purpose, dual regime and case email address"),
    ("Le Mandant confie à Robin des Airs une mission <strong>exclusive</strong> de recouvrement, au titre du <strong>Règlement (CE) n° 261/2004</strong>, de l'<strong>indemnisation forfaitaire</strong> (art. 7) ainsi que <strong>du remboursement des frais engagés, de la prise en charge due (art. 8 et 9) et, le cas échéant, du préjudice complémentaire (art. 12)</strong> liés au retard, à l'annulation ou au refus d'embarquement, par toute voie amiable, administrative, judiciaire ou arbitrale.",
     "The Client grants Robin des Airs an <strong>exclusive</strong> recovery mandate, under <strong>Regulation (EC) No 261/2004</strong>, for the <strong>fixed compensation</strong> (art. 7) as well as <strong>reimbursement of expenses incurred, the care due (arts. 8 and 9) and, where applicable, further damage (art. 12)</strong> linked to the delay, cancellation or denied boarding, by amicable, administrative, judicial or arbitral means."),
    ("<strong>Vols avec correspondance.</strong> Lorsque le voyage comporte une ou plusieurs correspondances sous une <strong>même réservation</strong>, le mandat couvre <strong>l'ensemble du voyage</strong>&nbsp;: l'indemnisation est déterminée par la <strong>destination finale</strong> et la <strong>distance totale</strong>, le retard étant apprécié à l'<strong>arrivée à la destination finale</strong> (CJUE, 26 février 2013, <em>Folkerts</em>, C-11/11).",
     "<strong>Connecting flights.</strong> Where the journey includes one or more connections under a <strong>single booking</strong>, the mandate covers <strong>the entire journey</strong>&nbsp;: compensation is determined by the <strong>final destination</strong> and the <strong>total distance</strong>, the delay being assessed at <strong>arrival at the final destination</strong> (CJEU, 26 February 2013, <em>Folkerts</em>, C-11/11)."),
    ("Cette mission s'exerce selon un <strong>double régime</strong>&nbsp;: (1) un <strong>mandat de représentation (art. 1984 C. civ.)</strong> qui s'applique <strong>par défaut</strong> dès la signature — Robin des Airs agissant au nom du Mandant, qui <strong>conserve la qualité de créancier</strong>, ce régime préservant notamment l'accès du Mandant, en sa qualité de consommateur, à la <strong>médiation</strong>&nbsp;; et (2) une <strong>option de cession de créance à titre de recouvrement</strong> que Robin des Airs peut lever dans les conditions de l'<strong>Article 1 bis</strong> (modalités&nbsp;: Article 5 bis).",
     "This mandate operates under a <strong>dual regime</strong>&nbsp;: (1) a <strong>representation mandate (art. 1984 French Civil Code)</strong> which applies <strong>by default</strong> from signature — Robin des Airs acting in the name of the Client, who <strong>remains the creditor</strong>, this regime notably preserving the Client's access, as a consumer, to <strong>mediation</strong>&nbsp;; and (2) an <strong>option to assign the claim for recovery purposes</strong> which Robin des Airs may exercise under the terms of <strong>Article 1 bis</strong> (procedure: Article 5 bis)."),

    # --- Article 1 bis (title + 4 paragraphs) ---
    ("Article 1 bis — Option d'exercice : mandat ou cession",
     "Article 1 bis — Exercise option: mandate or assignment"),
    ("Le présent acte emporte, dès la signature, <strong>mandat de représentation</strong> (Article 1, régime par défaut) et <strong>promesse de cession</strong> de la créance née ou à naître (Article 5 bis). <strong>Tant que Robin des Airs n'a pas levé l'option de cession, le Mandant demeure seul titulaire de la créance</strong> et Robin des Airs agit en qualité de <strong>mandataire</strong>.",
     "This instrument entails, from signature, a <strong>representation mandate</strong> (Article 1, default regime) and a <strong>promise to assign</strong> the born or future claim (Article 5 bis). <strong>As long as Robin des Airs has not exercised the assignment option, the Client remains the sole holder of the claim</strong> and Robin des Airs acts as <strong>representative</strong>."),
    ("Robin des Airs peut <strong>lever l'option de cession à tout moment, dans l'intérêt du recouvrement</strong>, notamment pour engager une <strong>procédure judiciaire</strong>, une <strong>mesure d'exécution</strong> ou former <strong>opposition à un paiement</strong>. À la levée de l'option, la cession prend effet entre les parties (art. 1321 C. civ.) et devient <strong>opposable à la compagnie aérienne à compter de sa notification</strong> (art. 1324 C. civ.)&nbsp;; Robin des Airs agit alors <strong>en son nom propre, en qualité de cessionnaire</strong>.",
     "Robin des Airs may <strong>exercise the assignment option at any time, in the interest of recovery</strong>, in particular to bring <strong>court proceedings</strong>, an <strong>enforcement measure</strong> or to file an <strong>objection to a payment</strong>. Upon exercise of the option, the assignment takes effect between the parties (art. 1321 French Civil Code) and becomes <strong>enforceable against the airline from its notification</strong> (art. 1324 French Civil Code)&nbsp;; Robin des Airs then acts <strong>in its own name, as assignee</strong>."),
    ("<strong>Discipline procédurale.</strong> Le régime applicable est <strong>arrêté avant l'acte de procédure concerné</strong> et notifié à la compagnie&nbsp;; Robin des Airs n'invoque <strong>qu'un seul régime par instance</strong> afin de préserver sa qualité à agir. En pratique&nbsp;: <strong>mandat</strong> pour la phase amiable et la médiation, <strong>cession</strong> (option levée) pour la phase contentieuse.",
     "<strong>Procedural discipline.</strong> The applicable regime is <strong>fixed before the relevant procedural step</strong> and notified to the airline&nbsp;; Robin des Airs invokes <strong>only one regime per instance</strong> in order to preserve its standing to act. In practice&nbsp;: <strong>mandate</strong> for the amicable phase and mediation, <strong>assignment</strong> (option exercised) for the litigation phase."),
    ("Cette faculté est stipulée <strong>dans l'intérêt du Mandant</strong>&nbsp;: elle préserve son accès à la médiation tout en permettant à Robin des Airs d'agir efficacement en justice. Elle ne modifie ni la commission (Article 4), ni le droit de rétractation (Article 9), ni l'obligation de reverser au Mandant sa part nette (75&nbsp;%).",
     "This option is stipulated <strong>in the interest of the Client</strong>&nbsp;: it preserves the Client's access to mediation while allowing Robin des Airs to act effectively in court. It changes neither the fee (Article 4), nor the withdrawal right (Article 9), nor the obligation to pay the Client the net share (75&nbsp;%)."),

    # --- Article 4 (appended sentence on compensation in kind; head already
    #     translated by an earlier pair, so only the French tail remains) ---
    (" La commission s'applique également à <strong>toute compensation en nature</strong> (bon d'achat, avoir, miles…) acceptée au titre du dossier, calculée sur sa valeur&nbsp;; le Mandant s'engage à ne pas accepter une telle compensation sans l'accord de Robin des Airs.",
     " The fee also applies to <strong>any compensation in kind</strong> (voucher, credit note, miles…) accepted for the case, calculated on its value&nbsp;; the Client undertakes not to accept such compensation without the agreement of Robin des Airs."),

    # --- Article 4.1 (appended sentence on Article 700 / dépens; tail only) ---
    (" Les sommes éventuellement allouées au titre des <strong>frais de procédure (article 700 du Code de procédure civile, dépens)</strong> restent acquises à Robin des Airs, qui en a fait l'avance&nbsp;; les <strong>intérêts</strong> suivent le sort de la créance (Article 5 bis).",
     " Any sums awarded as <strong>legal costs (Article 700 of the French Code of Civil Procedure) and court costs</strong> remain acquired by Robin des Airs, which advanced them&nbsp;; <strong>interest</strong> follows the fate of the claim (Article 5 bis)."),

    # --- Fee table row labels ---
    ("<tr><th>Distance du vol</th><th>Indemnité légale / pax</th><th>Commission RDA (25%)</th><th>Net client</th></tr>",
     "<tr><th>Flight distance</th><th>Statutory amount / pax</th><th>RDA fee (25%)</th><th>Client net</th></tr>"),

    # --- Article 5 (express & irrevocable instruction) ---
    ("Le Mandant donne instruction <strong>expresse et irrévocable</strong> à la compagnie aérienne de verser toute indemnité, tout remboursement et toute somme due <strong>exclusivement sur le compte bancaire désigné par Robin des Airs</strong>, à l'exclusion de tout autre compte, y compris celui du Mandant. Robin des Airs reverse au Mandant sa part nette (75%) sur l'IBAN communiqué dans ce mandat dans un délai de <strong>48 heures ouvrées à compter de l'encaissement effectif et irrévocable</strong> des fonds (virement SEPA crédité, sans réserve ni rétrofacturation). Si la compagnie verse directement au Mandant, celui-ci s'engage à reverser sans délai la commission de 25% à Robin des Airs.",
     "The Client gives the airline an <strong>express and irrevocable</strong> instruction to pay any compensation, reimbursement and sum due <strong>exclusively into the bank account designated by Robin des Airs</strong>, to the exclusion of any other account, including the Client's. Robin des Airs pays the Client its net share (75%) to the IBAN provided in this mandate within <strong>48 business hours from the effective and irrevocable collection</strong> of the funds (SEPA transfer credited, without reservation or chargeback). If the airline pays the Client directly, the Client undertakes to remit the 25% fee to Robin des Airs without delay."),

    # --- Article 5 bis paragraph 1 (operating carrier / codeshare) ---
    ("En exécution de l'<strong>option de l'Article 1 bis</strong>, le Mandant <strong>consent à céder</strong> à Robin des Airs, à titre de recouvrement, la <strong>créance d'indemnisation née ou à naître</strong> qu'il détient à l'encontre de la compagnie aérienne — <strong>le transporteur aérien effectif</strong> ayant réellement réalisé le vol (art. 2 b) du Règlement), quel que soit le numéro de vol commercial ou la compagnie de commercialisation (vols en <strong>partage de code / codeshare</strong>) — au titre du <strong>Règlement (CE) n° 261/2004</strong> pour le vol identifié au présent acte (l'«&nbsp;Incident&nbsp;»), en ce compris l'<strong>indemnité forfaitaire</strong> (art. 7), les <strong>remboursements et frais</strong> (art. 8 et 9), le <strong>préjudice complémentaire</strong> (art. 12), intérêts, pénalités et accessoires.",
     "In performance of the <strong>option in Article 1 bis</strong>, the Client <strong>agrees to assign</strong> to Robin des Airs, for recovery purposes, the <strong>born or future compensation claim</strong> it holds against the airline — <strong>the operating carrier</strong> that actually performed the flight (art. 2(b) of the Regulation), regardless of the commercial flight number or marketing carrier (<strong>codeshare</strong> flights) — under <strong>Regulation (EC) No 261/2004</strong> for the flight identified herein (the «&nbsp;Incident&nbsp;»), including the <strong>fixed compensation</strong> (art. 7), <strong>reimbursements and expenses</strong> (arts. 8 and 9), <strong>further damage</strong> (art. 12), interest, penalties and ancillary amounts."),

    # --- Article 5 bis paragraph 3 (effect "à la levée de l'option") ---
    ("Conformément aux <strong>articles 1321 à 1326 du Code civil</strong>, la cession prend effet <strong>entre les parties à la levée de l'option (Article 1 bis)</strong> et porte sur une créance <strong>déterminable</strong> (parties, vol, date, fondement CE&nbsp;261/2004). Elle est <strong>opposable à la compagnie aérienne (débiteur cédé) à compter de sa notification</strong> au sens de l'<strong>article 1324 du Code civil</strong>&nbsp;; la mise en demeure adressée par Robin des Airs <strong>vaut notification de la cession</strong>.",
     "Under <strong>Articles 1321 to 1326 of the French Civil Code</strong>, the assignment takes effect <strong>between the parties upon exercise of the option (Article 1 bis)</strong> and covers a <strong>determinable claim</strong> (parties, flight, date, EU&nbsp;261/2004 basis). It is <strong>enforceable against the airline (assigned debtor) from its notification</strong> within the meaning of <strong>Article 1324 of the French Civil Code</strong>&nbsp;; the formal notice sent by Robin des Airs <strong>constitutes notification of the assignment</strong>."),

    # --- Article 5 ter (title + body) ---
    ("Article 5 ter — Inopposabilité des clauses d'incessibilité",
     "Article 5 ter — Unenforceability of non-assignment clauses"),
    ("Le Mandant déclare avoir connaissance des conditions générales de transport de la compagnie. <strong>Toute clause des conditions générales de transport interdisant ou limitant la cession de la créance d'indemnisation due au titre du Règlement (CE) n° 261/2004 est inopposable</strong>&nbsp;: la Cour de justice de l'Union européenne a jugé qu'une telle clause est <strong>contraire à l'article 15 du Règlement</strong> (CJUE, 3<sup>e</sup> ch., <strong>29 février 2024, Eventmedia c/ Air Europa, C-11/23</strong>). En conséquence, la compagnie aérienne ne saurait opposer une telle clause à la cession consentie à Robin des Airs (Article 5 bis).",
     "The Client declares awareness of the airline's general conditions of carriage. <strong>Any clause of the general conditions of carriage prohibiting or restricting the assignment of the compensation claim due under Regulation (EC) No 261/2004 is unenforceable</strong>&nbsp;: the Court of Justice of the European Union has held that such a clause is <strong>contrary to Article 15 of the Regulation</strong> (CJEU, 3rd Chamber, <strong>29 February 2024, Eventmedia v Air Europa, C-11/23</strong>). Accordingly, the airline may not rely on such a clause against the assignment granted to Robin des Airs (Article 5 bis)."),

    # --- Article 6 (appended second sentence; head already translated, tail only) ---
    (" Robin des Airs notifie expressément la compagnie, dès la mise en demeure, que le <strong>seul paiement libératoire valable</strong> est celui effectué sur le compte bancaire de Robin des Airs.",
     " Robin des Airs expressly notifies the airline, from the formal notice, that the <strong>only valid discharging payment</strong> is the one made into the Robin des Airs bank account."),

    # --- Article 7 (encaissement effectif et irrévocable) ---
    ("Robin des Airs s'engage à : (i) instruire le dossier avec diligence ; (ii) informer le Mandant à chaque étape clé ; (iii) reverser les sommes dans les 48h ouvrées après encaissement effectif et irrévocable ; (iv) notifier expressément la compagnie aérienne de l'existence du présent mandat et de l'instruction de paiement exclusif ; (v) protéger les données personnelles conformément au RGPD.",
     "Robin des Airs undertakes to: (i) handle the case diligently; (ii) inform the Client at each key stage; (iii) pay the sums within 48 business hours after effective and irrevocable collection; (iv) expressly notify the airline of the existence of this mandate and of the exclusive payment instruction; (v) protect personal data in accordance with the GDPR."),

    # --- Article 7 bis (title + body) ---
    ("Article 7 bis — Responsabilité & obligation de moyens",
     "Article 7 bis — Liability & best-efforts obligation"),
    ("Robin des Airs est tenue d'une <strong>obligation de moyens</strong> et ne garantit pas l'obtention de l'indemnisation. Sauf faute lourde ou dol, sa responsabilité est limitée aux <strong>dommages directs</strong> et <strong>plafonnée au montant de la commission</strong> effectivement perçue sur le dossier. Robin des Airs n'est pas responsable des retards, refus ou décisions de la compagnie aérienne, des juridictions ou des médiateurs.",
     "Robin des Airs is bound by a <strong>best-efforts (obligation de moyens) obligation</strong> and does not guarantee that compensation will be obtained. Except in the event of gross negligence or wilful misconduct, its liability is limited to <strong>direct damages</strong> and <strong>capped at the amount of the fee</strong> actually received on the case. Robin des Airs is not liable for the delays, refusals or decisions of the airline, the courts or the mediators."),

    # --- Article 8 (appended warranty sentence; head already translated, tail only) ---
    (" Le Mandant <strong>garantit l'exactitude et la sincérité</strong> des informations et documents fournis et <strong>répond du préjudice</strong> causé à Robin des Airs par des informations sciemment ou grossièrement inexactes ou incomplètes&nbsp;; il rembourse, le cas échéant, les frais engagés à tort de ce fait.",
     " The Client <strong>warrants the accuracy and truthfulness</strong> of the information and documents provided and <strong>is liable for the harm</strong> caused to Robin des Airs by knowingly or grossly inaccurate or incomplete information&nbsp;; it reimburses, where applicable, the costs wrongly incurred as a result."),

    # --- Article 9 bis (title + body) ---
    ("Article 9 bis — Passagers mineurs",
     "Article 9 bis — Minor passengers"),
    ("Pour tout passager mineur, <strong>le représentant légal signe seul</strong>, en son nom et au nom du mineur&nbsp;; le mineur ne signe pas. Le représentant légal déclare exercer l'<strong>autorité parentale</strong> (ou la qualité de tuteur) sur le mineur et <strong>s'engage personnellement</strong> aux termes du présent mandat, y compris quant à la cession de créance (Article 5 bis).",
     "For any minor passenger, <strong>the legal representative signs alone</strong>, in their own name and on behalf of the minor&nbsp;; the minor does not sign. The legal representative declares that they hold <strong>parental authority</strong> (or the status of guardian) over the minor and <strong>undertakes personally</strong> under the terms of this mandate, including as to the assignment of claim (Article 5 bis)."),

    # --- Article 11 (title; body head already translated, severability tail only) ---
    ("Article 11 — Loi applicable, divisibilité & litiges",
     "Article 11 — Governing law, severability & disputes"),
    (" <strong>Divisibilité&nbsp;:</strong> si une stipulation du présent mandat est jugée nulle ou inopposable, les autres <strong>conservent leur plein effet</strong>, la stipulation concernée étant réputée non écrite ou réduite dans la mesure permise par la loi.",
     " <strong>Severability:</strong> if any provision of this mandate is held void or unenforceable, the others <strong>retain their full effect</strong>, the provision concerned being deemed unwritten or reduced to the extent permitted by law."),

    # --- Consent box: declaration + checkbox helper + immediate start ---
    ("déclare sur l'honneur avoir bien été passager(e) sur le vol indiqué à la date mentionnée, et avoir subi le préjudice déclaré (retard, annulation ou refus d'embarquement).",
     "declare on my honour that I was indeed a passenger on the stated flight on the date mentioned, and suffered the declared harm (delay, cancellation or denied boarding)."),
    ("Veuillez cocher cette case pour valider l'autorisation.",
     "Please tick this box to validate the authorisation."),
    ("Recommandé — Robin des Airs peut agir dès maintenant en mon nom. (Art. L.221-25 Code conso.)",
     "Recommended — Robin des Airs can act in my name right away. (Art. L.221-25 French Consumer Code.)"),

    # --- Co-passenger section helper texts ---
    ("Pour que le mandat et la cession de créance soient <strong>opposables pour chaque passager</strong>, chaque co-passager majeur <strong>signe individuellement</strong> ci-dessous. Pour un passager mineur, son <strong>représentant légal</strong> indique son nom et signe en son nom.",
     "So that the mandate and the assignment of claim are <strong>enforceable for each passenger</strong>, every adult co-passenger <strong>signs individually</strong> below. For a minor passenger, their <strong>legal representative</strong> states their name and signs on their behalf."),
    ("Chaque co-passager doit signer (et le représentant légal pour un mineur).",
     "Each co-passenger must sign (and the legal representative for a minor)."),

    # --- Signature area helper text + clear button ---
    ("Tracez votre signature ci-dessous (doigt ou souris) :",
     "Draw your signature below (finger or mouse):"),
    ("Votre signature est requise pour valider l'autorisation",
     "Your signature is required to validate the authorisation"),

    # --- Flight form labels + notes ---
    ("<label>Compagnie (sur le billet) <span class=\"req\">*</span></label>",
     "<label>Airline (on the ticket) <span class=\"req\">*</span></label>"),
    ("<label>Départ initial</label>",
     "<label>Initial departure</label>"),
    ("<label>Destination finale</label>",
     "<label>Final destination</label>"),
    ("<label>Correspondance(s) <span style=\"text-transform:none;letter-spacing:0;color:var(--muted)\">— escale(s) et n° de vol(s), si votre voyage en comportait</span></label>",
     "<label>Connection(s) <span style=\"text-transform:none;letter-spacing:0;color:var(--muted)\">— stopover(s) and flight number(s), if your journey had any</span></label>"),
    ("Ex. : escale Bruxelles — vols SN271 puis SN204",
     "E.g.: Brussels stopover — flights SN271 then SN204"),
    ("💡 Pour un voyage sous une même réservation, l'indemnité se calcule sur la <strong>destination finale</strong> et la <strong>distance totale</strong> — la correspondance est couverte.",
     "💡 For a journey under a single booking, compensation is calculated on the <strong>final destination</strong> and the <strong>total distance</strong> — the connection is covered."),
    ("<label>Vol opéré par <span style=\"text-transform:none;letter-spacing:0;color:var(--muted)\">— transporteur réel, si différent du billet (partage de code / codeshare)</span></label>",
     "<label>Flight operated by <span style=\"text-transform:none;letter-spacing:0;color:var(--muted)\">— actual carrier, if different from the ticket (codeshare)</span></label>"),
    ("Ex. : vol AF545 réellement opéré par KLM",
     "E.g.: flight AF545 actually operated by KLM"),
    ("💡 L'indemnité est due par la compagnie qui a <strong>réellement opéré</strong> le vol, pas celle inscrite sur le billet.",
     "💡 Compensation is owed by the airline that <strong>actually operated</strong> the flight, not the one printed on the ticket."),
    ("⏱️ Retard de +3h à l'arrivée", "⏱️ Delay of +3h on arrival"),
    ("❌ Vol annulé", "❌ Flight cancelled"),
    ("🚫 Refus d'embarquement", "🚫 Denied boarding"),
    ("— Sélectionnez —", "— Select —"),

    # --- Document renamed FR-side from « Mandat » to « Autorisation » ---
    # Head/meta tags (the old PAIRS targeted « Mandat … » and no longer match).
    ('Signez votre autorisation de représentation Robin des Airs — CE 261/2004. No Win No Fee.',
     'Sign your Robin des Airs representation mandate — EU 261/2004. No win, no fee.'),
    ('Autorisation de Représentation — Robin des Airs', 'Representation Mandate — Robin des Airs'),
    ('Autorisation de représentation — Robin des Airs', 'Representation mandate — Robin des Airs'),
    ('Signez votre autorisation CE 261 en 2 minutes — sécurisée, honoraires uniquement après succès.',
     'Sign your EU 261 mandate in 2 minutes — secure, fees only on success.'),
    ('Signez votre autorisation CE 261 en 2 minutes — sécurisée.',
     'Sign your EU 261 mandate in 2 minutes — secure.'),
    # Visible document title.
    ('<div class="doc-title">Autorisation de Représentation</div>',
     '<div class="doc-title">Representation Mandate</div>'),

    # --- Personal-details block ---
    ("Adresse requise pour l'autorisation", "Address required for the mandate"),
    ("💶 Vos coordonnées bancaires seront collectées ultérieurement pour le versement de votre net (75%) sous 48h ouvrées après encaissement.",
     "💶 Your bank details will be collected later for payment of your net share (75%) within 48 business hours after collection."),
    ("<label>PNR / Réservation</label>", "<label>PNR / Booking</label>"),

    # --- Validation error messages ---
    ('id="fnErr">Champ obligatoire', 'id="fnErr">Required field'),
    ('id="lnErr">Champ obligatoire', 'id="lnErr">Required field'),
    ('id="waErr">Numéro requis', 'id="waErr">Number required'),
    ('id="fdErr">Date requise', 'id="fdErr">Date required'),
    ('id="incErr">Sélection requise', 'id="incErr">Selection required'),
    ("Veuillez cocher cette case pour valider l'autorisation.",
     "Please tick this box to validate the mandate."),
    ('id="sigCityErr">Ville requise', 'id="sigCityErr">City required'),
    ("Votre signature est requise pour valider l'autorisation",
     "Your signature is required to validate the mandate"),

    # --- Representative acceptance block ---
    ("Acceptation du Mandataire — Robin des Airs", "Acceptance by the Representative — Robin des Airs"),
    ("Robin des Airs <strong>accepte le présent mandat et la cession de créance</strong> (Article 5 bis) et en confirme la prise en charge dès l'ouverture du dossier — l'acceptation du mandataire est ainsi <strong>concomitante</strong> à la signature du Mandant.",
     "Robin des Airs <strong>accepts this mandate and the assignment of claim</strong> (Article 5 bis) and confirms handling from the opening of the file — the representative's acceptance is thus <strong>concurrent</strong> with the Client's signature."),
    ("Représentant habilité&nbsp;: <strong>Robin des Airs — Service juridique CE 261/2004</strong> · Réf. dossier&nbsp;: <strong id=\"sigRdaRef\">—</strong> · Acceptation le&nbsp;: <strong id=\"sigRdaDate\">—</strong>",
     "Authorised representative&nbsp;: <strong>Robin des Airs — EU 261/2004 claims service</strong> · Case ref.&nbsp;: <strong id=\"sigRdaRef\">—</strong> · Accepted on&nbsp;: <strong id=\"sigRdaDate\">—</strong>"),

    # --- Submit button + trust bar ---
    ("Valider et signer mon autorisation →", "Confirm and sign my mandate →"),
    ("🔒 SSL sécurisé", "🔒 SSL secure"),
    ("💶 Versement 48h", "💶 48h payment"),

    # --- Success screen ---
    ("Autorisation signée !", "Mandate signed!"),
    ("Votre dossier est officiellement ouvert. Robin des Airs prend le relais immédiatement.",
     "Your case is officially open. Robin des Airs takes over immediately."),
    ("Référence : <strong id=\"sRef\">—</strong>", "Reference: <strong id=\"sRef\">—</strong>"),
    ("Email dossier : <strong id=\"sEmail\">—</strong>", "Case email: <strong id=\"sEmail\">—</strong>"),
    ("<strong>Confirmation WhatsApp sous 24h</strong><br>Récapitulatif complet + numéro de suivi.",
     "<strong>WhatsApp confirmation within 24h</strong><br>Full summary + tracking number."),
    ("<strong>Mise en demeure sous 48h</strong><br>Courrier officiel envoyé à la compagnie aérienne.",
     "<strong>Formal notice within 48h</strong><br>Official letter sent to the airline."),
    ("<strong>Suivi en temps réel</strong><br>Consultez l'avancement : robindesairs.eu/suivi",
     "<strong>Real-time tracking</strong><br>Follow progress: robindesairs.eu/suivi"),
    ("<strong>Versement sur votre IBAN sous 48h</strong><br>Dès encaissement, votre net (75%) vous est versé.",
     "<strong>Payment to your IBAN within 48h</strong><br>As soon as funds are collected, your net share (75%) is paid to you."),

    # --- Document subtitle helper (sub-line under consent box) ---
    ("Exclusivité 24 mois · Rétractation possible sous 14 jours par email · RGPD",
     "Exclusive 24 months · Withdrawal possible within 14 days by email · GDPR"),

    # --- Case email note (appended WhatsApp sentence) ---
    ("Suivi avec vous : <strong>WhatsApp</strong> ou autre canal convenu (complémentaire).",
     "Updates to you: <strong>WhatsApp</strong> or another agreed channel (additional)."),

    # --- Co-passenger minor field hint ---
    (">Obligatoire si mineur</div>", ">Required if minor</div>"),

    # --- Success screen debug line (Airtable email) ---
    ("Email Airtable enregistré : ", "Airtable email saved: "),

    # --- JS error string (invalid link). NB: lives inside single quotes in JS,
    #     so the EN translation must not contain an apostrophe. ---
    ("Lien de mandat invalide ou modifié. Contactez Robin des Airs pour un lien sécurisé.",
     "Invalid or altered mandate link. Please contact Robin des Airs for a secure link."),

    # --- CSS comment (not user-facing, translated for consistency) ---
    ("/* TABLEAU HONORAIRES */", "/* FEE TABLE */"),

    # --- Representative acceptance line: the « Service juridique CE 261/2004 »
    #     head is translated by an earlier global pair, which kills the full-line
    #     pair above. Translate the remaining French fragments individually. ---
    ("Représentant habilité&nbsp;:", "Authorised representative&nbsp;:"),
    ("· Réf. dossier&nbsp;:", "· Case ref.&nbsp;:"),
    ("· Acceptation le&nbsp;:", "· Accepted on&nbsp;:"),

    # --- Minor co-passenger placeholder: « Prénom » head replaced by an earlier
    #     global pair, so translate the remaining French tail. ---
    ("NOM du parent / tuteur", "SURNAME of parent / guardian"),
]

out = src
for a, b in PAIRS + LONG + NEW_PAIRS + NEW_PAIRS2:
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

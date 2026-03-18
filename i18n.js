/* Robin des Airs — Traductions FR et EN uniquement */
window.I18N = (function() {
  var stored = (localStorage.getItem('robin_lang') || 'fr').toLowerCase();
  var currentLang = (stored === 'en' ? 'en' : 'fr');
  var T = {
    fr: {
      skip_link: "Aller au contenu principal",
      hero_title: "Robin prend\naux compagnies,\n",
      hero_title_neon: "rend à nos familles.",
      hero_diaspora_why: "On connaît vos lignes, on parle votre langue — on récupère les 600€ pour nos communautés et nos familles.",
      hero_desc: "Vol retardé de +3h, annulé ou surbooké ? La loi européenne vous doit <strong>jusqu'à 600€</strong>. Nous récupérons votre argent — <strong>zéro CB, zéro frais si on ne gagne pas.</strong>",
      hero_btn_calc: "Ou vérifier mon éligibilité (2 questions)",
      hero_btn_wa: "📱 Envoyer ma carte d'embarquement sur WhatsApp",
      hero_moins_cher: "Les moins chers du marché — inutile de regarder ailleurs.",
      hero_lang_line: "Service disponible en : Français, Wolof, Bambara, Soninké, Pulaar, Lingala.",
      hero_stat_max: "Indemnité max",
      hero_stat_won: "Dossiers gagnés",
      hero_stat_lost: "Si on perd",
      hero_stat_24h: "Réponse garantie",
      nav_cta: "Combien je touche ? →",
      nav_drawer_calc: "🧮 Calculateur",
      nav_drawer_loi: "📋 La loi CE 261",
      nav_drawer_how: "⚙️ Comment ça marche",
      nav_drawer_tarifs: "💰 Nos tarifs",
      nav_drawer_testi: "⭐ Témoignages",
      nav_drawer_faq: "❓ FAQ",
      nav_drawer_dest: "✈️ Top destinations 600€",
      nav_drawer_blog: "📝 Blog",
      nav_drawer_depot: "📤 Déposer mon dossier",
      calc_tag: "Diagnostic de vol",
      calc_title: "Quelle est votre\nsituation ?",
      calc_title_1: "Quelle est votre",
      funnel_subtitle: "situation ?",
      step1_eyebrow: "Étape 1 sur 5 — Ce qui s'est passé",
      step1_retard: "Vol retardé",
      step1_retard_sub: "Arrivée avec +3h de retard",
      step1_annulation: "Vol annulé",
      step1_annulation_sub: "Annulation par la compagnie",
      step1_surbook: "Surbooking / Refus d'embarquement",
      step1_surbook_sub: "La compagnie vous a refusé l'accès à bord",
      step1_correspondance: "Correspondance manquée",
      step1_correspondance_sub: "J'ai raté ma correspondance à cause d'un retard",
      step1_correspondance_note: "Le retard de votre 1er vol vous a empêché de prendre la suite — vous êtes éligible.",
      step1c_eyebrow: "Étape 1c — Raison invoquée",
      step1c_q: "La compagnie vous a expliqué pourquoi ?",
      raison_meteo: "🌩️ Météo / Conditions climatiques",
      raison_technique: "🔧 Problème technique / Panne",
      raison_greve: "✊ Grève",
      raison_securite: "🛡️ Raison de sécurité",
      raison_sans: "🤷 Aucune explication donnée",
      raison_nesaispas: "💭 Je ne sais pas / Je ne m'en souviens plus",
      section_loi_tag: "Ce que vous ne savez peut-être pas",
      section_loi_title: "D'où vient<br><span class=\"neon\">cet argent ?</span>",
      section_how_tag: "La méthode Robin",
      section_how_title: "4 flèches.\nUn seul objectif.",
      section_faq_tag: "Questions fréquentes",
      section_faq_title: "Tout ce que vous\nvoulez savoir.",
      cta_final_tag: "Passez à l'action maintenant",
      cta_final_title: "Votre argent\nvous attend.",
      cta_btn_calc: "Mon argent m'attend →",
      cta_wa: "WhatsApp direct",
      cta_recall: "Jusqu'à 600€ · 25% · Zéro frais si on perd",
      footer_tagline: "Réclamation aérienne · Spécialiste Diaspora · Prix fixe · No win no fee",
      footer_nav: "Navigation",
      footer_legal: "Légal",
      footer_contact: "Contact",
      footer_loi: "La loi CE 261/2004",
      footer_how: "Comment ça marche",
      footer_tarifs: "Nos tarifs",
      footer_histoire: "Notre histoire",
      ready_claim: "Prêt à réclamer ?",
      obt_indemnite: "Mon argent m'attend →",
      section_comp_tag: "Transparence totale",
      section_comp_title: "Robin vs les autres.",
      section_comp_desc: "Vous savez exactement ce que vous allez toucher avant de vous engager. Pas de mauvaise surprise.",
      section_testi_tag: "Ils ont récupéré leur argent",
      section_testi_title: "Vrais passagers.\nVrai argent récupéré.",
      section_founder_tag: "LE FONDATEUR",
      section_founder_title: "20 ans dans les coulisses.<br><span style=\"color:var(--neon-b);\">J'ai vu ce qu'ils cachent.</span>",
      cta_final_note: "Chaque mois sans réclamer, c'est de l'argent que vous laissez sur la table. Le délai de prescription est de 5 ans — mais ça ne dure pas.",
      funnel_step_label: "Étape 1 sur 5",
      funnel_wa_shortcut_text: "En 1 message : envoyez-nous votre vol sur WhatsApp, on vous dit en 2 min si vous êtes éligible.",
      funnel_wa_shortcut_btn: "💬 Vérifier mon éligibilité par WhatsApp",
      funnel_detail_link: "Ou calculez le montant exact → diagnostic détaillé (5 étapes)",
      short_q_vol: "Quel est votre vol ?",
      short_hint_vol: "Numéro de vol + date, ou ex. « Paris-Dakar du 15/01, retardé »",
      short_placeholder_vol: "Ex: AF718 du 15/01, retardé",
      short_q_phone: "Votre numéro WhatsApp",
      short_hint_phone: "Pour qu'on vous recontacte et vous dise si vous êtes éligible.",
      short_placeholder_phone: "Ex: +33 6 12 34 56 78",
      short_done_title: "Merci !",
      short_done_hint: "Pour finaliser, envoyez votre carte d'embarquement sur WhatsApp. On vérifie et on vous répond sous 24h.",
      short_done_wa_btn: "📱 Envoyer ma carte d'embarquement sur WhatsApp",
      btn_suivant: "Suivant →",
      btn_envoyer: "Envoyer →",
      btn_retour: "← Retour",
      faq_1_q: "💰 Combien je touche exactement sur mon compte ?",
      faq_1_a: "<p style=\"margin-bottom:14px;\"><strong>Robin prend 25% uniquement si on gagne.</strong> Vous recevez 75% nets.</p><ul style=\"margin-bottom:14px;padding-left:18px;font-size:13px;color:var(--gray);line-height:1.8;\"><li>Vol court (&lt; 1 500 km) → indemnité 250€ → vous touchez <strong>188€</strong></li><li>Vol moyen (1 500–3 500 km) → indemnité 400€ → vous touchez <strong>300€</strong></li><li>Vol long (&gt; 3 500 km) → indemnité 600€ → vous touchez <strong>450€</strong></li></ul><p style=\"margin-bottom:10px;font-size:13px;\">Famille de 4 sur un Paris-Dakar ? 4 × 600€ = 2 400€ brut → <strong>1 800€ nets</strong> pour vous.</p><p style=\"font-size:12px;color:var(--gray);\">🏹 Zéro frais si on ne gagne pas. Commission identique même en cas de procédure judiciaire.</p>",
      faq_2_q: "Je voyage seul, est-ce que vous pouvez m'aider ?",
      faq_2_a: "Absolument ! Notre mission est d'aider toutes nos communautés, que vous voyagiez seul, en couple ou en famille. Le règlement européen s'applique à chaque passager individuellement. Si votre vol a eu du retard, vous avez droit à 600€, quel que soit votre nombre de voyageurs.",
      faq_3_q: "⚠️ La compagnie m'a proposé un bon d'achat — je l'accepte ?",
      faq_3_a: "<strong>C'est un piège.</strong> Le bon d'achat retourne dans la poche de la compagnie si vous ne l'utilisez pas — et souvent il a une date limite. Sa valeur est presque toujours inférieure aux 600€ en cash auxquels vous avez droit légalement. <strong>Ne l'acceptez pas avant de nous contacter.</strong> L'argent cash n'a pas de date d'expiration.",
      faq_4_q: "La compagnie invoque la météo ou une \"circonstance extraordinaire\"...",
      faq_4_a: "C'est leur excuse préférée. Notre dossier intègre les <strong>bulletins météo aéronautiques officiels (METAR, TAF)</strong> de l'aéroport de départ et d'arrivée. On compare avec tous les vols qui ont décollé dans la même fenêtre horaire. Si d'autres avions ont pu voler ce jour-là — et souvent ils l'ont fait — on a les preuves. La météo s'analyse aussi via les prévisions TAF et les cartes en route : pas d'orage, pas de vent violent, la \"météo\" ne tient plus. <a href=\"/meteo-dossier-indemnite.html\">En savoir plus : Météo et dossier (TAF, METAR…)</a>",
      faq_5_q: "💸 Pourquoi vous êtes moins chers que vos concurrents ?",
      faq_5_a: "Nos concurrents facturent entre 30% et 50% de l'indemnité. Sur 600€, ça fait jusqu'à 300€ prélevés. Nous prenons 25% — no win no fee — parce que notre modèle n'est pas basé sur le volume maximum. Nous aimons un tarif clair, un client heureux, et une recommandation plutôt qu'une grosse commission. Vous savez ce que vous touchez avant de signer.",
      faq_6_q: "Comment suivre mon dossier ?",
      faq_6_a: "Notifications automatiques par <strong>WhatsApp ET email</strong> à chaque étape : Dossier envoyé, Réponse reçue de la compagnie, Paiement validé, Virement en cours. Vous gardez l'esprit libre — pas besoin d'appeler. Les appels téléphoniques sont réservés aux nouvelles souscriptions.",
      faq_7_q: "J'ai réclamé seul et la compagnie a refusé. Vous pouvez intervenir ?",
      faq_7_a: "Oui. Un refus initial n'est jamais définitif. <strong>C'est souvent le début de la négociation.</strong> 80% des passagers éligibles abandonnent après ce premier refus — c'est ce que la compagnie espère (<a href=\"/pourquoi-si-peu-reclament.html\">pourquoi si peu récupèrent leur indemnité</a>). Nous reprenons le dossier, on l'enrichit avec les preuves METAR, et on relance avec un dossier argumenté (météo, autres vols au même moment). Si elle persiste, on peut lancer une procédure. Les frais sont déjà dans notre commission : vous ne payez rien de plus. Et si on perd au final : <strong>0 €</strong> facturé.",
      faq_8_q: "Comment je suis payé ?",
      faq_8_a: "<strong>C'est nous qui vous payons.</strong> Une fois les fonds reçus de la compagnie, nous vous demandons votre RIB et nous vous virons votre indemnité. Nous ne vous demandons de l'argent que pour vous en rendre. Jamais avant.",
      faq_9_q: "Est-ce que je peux me rétracter si je change d'avis ?",
      faq_9_a: "Oui. Vous disposez d'un <strong>droit de rétractation de 14 jours</strong> à compter de la signature du mandat. Vous pouvez annuler votre dossier en intégralité — sans frais, sans justification. Nous avons monté le dossier ? C'est notre investissement, pas le vôtre.",
      faq_10_q: "Combien de temps pour être remboursé ?",
      faq_10_a: "Votre dossier est envoyé à la compagnie sous <strong>24 heures</strong>. En moyenne, les compagnies règlent sous <strong>4 à 12 semaines</strong>. On ne les lâche pas — relances, argumentation, escalade légale si nécessaire. Le tout sans que vous ayez à faire quoi que ce soit.",
      faq_11_q: "Mon vol avait une correspondance — je peux quand même réclamer ?",
      faq_11_a: "Oui. C'est le <strong>dernier vol (tronçon final)</strong> qui détermine le montant : distance de ce vol et durée du retard à l'arrivée. Si vous avez raté une correspondance à cause d'un retard du premier vol, vous êtes aussi éligible. Indiquez « Avec correspondance » dans le diagnostic ou le formulaire — on s'occupe du reste.",
      faq_12_q: "Que faire si la compagnie refuse ?",
      faq_12_a: "Nous relançons avec un dossier argumenté (preuves METAR, autres vols au même moment). Si la compagnie persiste, nous engageons une <strong>procédure contentieuse</strong> — les frais sont inclus dans notre commission. En cas d'échec final : <strong>0 €</strong> facturé.",
      faq_13_q: "Vous prenez tous les dossiers ?",
      faq_13_a: "Non — et c'est ce qui fait notre force. On analyse chaque dossier gratuitement avant de l'accepter. Si vos chances sont faibles, on vous le dit honnêtement plutôt que de vous faire perdre du temps. C'est pour ça que notre taux de réussite est de 9 dossiers sur 10 : on ne s'engage que quand on est confiants de gagner. Et si on ne prend pas votre dossier, on vous explique pourquoi et on vous conseille sur les alternatives.",
      faq_14_q: "Combien de temps faut-il pour recevoir mon indemnité ?",
      faq_14_a: "<p>Ça dépend de la réactivité de la compagnie. Voici les trois scénarios possibles :</p><p><strong>La compagnie coopère (60% des cas)</strong> — après réception de notre dossier technique (preuves du retard, bulletins météo officiels, analyse de la jurisprudence), la compagnie reconnaît votre droit et paie. Délai : 4 à 12 semaines. C'est le cas le plus fréquent — les compagnies savent que nos dossiers sont solides et préfèrent payer plutôt que d'aller plus loin.</p><p><strong>La compagnie résiste (30% des cas)</strong> — elle invoque des \"circonstances extraordinaires\" pour refuser. On contre ses arguments avec nos preuves météo et les données de trafic aérien du jour (si d'autres avions ont décollé normalement, l'excuse ne tient pas). On saisit le Médiateur du Tourisme et du Voyage en votre nom. Le médiateur rend sa recommandation sous 90 jours. Dans la grande majorité des cas, la compagnie suit et paie. Délai total : 3 à 5 mois.</p><p><strong>La compagnie persiste (moins de 10% des cas)</strong> — même après le médiateur, elle refuse. On saisit le tribunal à nos frais et à nos risques. Délai total : 5 à 8 mois.</p><p>Dans tous les cas, notre commission reste 25% — elle ne change jamais, même si votre dossier va au tribunal. Et si on ne récupère rien, vous ne payez rien. On vous tient informé à chaque étape par WhatsApp.</p>",
      founder_quote: "\"Ils vous facturent le kilo en trop. Ils vous facturent le deuxième bagage. Mais quand c'est leur tour de payer — retard, annulation, surbooking — il n'y a plus personne au bout du fil.\"",
      founder_p1: "Vingt ans dans le secteur aérien. <strong style=\"color:white;\">J'ai vu fonctionner la machine de l'intérieur.</strong> Les scripts téléphoniques conçus pour décourager. Les formulaires pensés pour que vous abandonniez. Le mot \"circonstances extraordinaires\" sorti comme un joker dès qu'il faut ouvrir le portefeuille.",
      founder_p2: "J'ai vu des familles entières se faire taxer à l'embarquement pour un kilo de trop — puis repartir sans rien quand leur avion avait <strong style=\"color:white;\">5 heures de retard</strong>. J'ai vu trop de voyageurs baisser les bras face au jargon juridique et aux réponses automatiques.",
      founder_p3: "Nos communautés font des voyages plus longs, en famille, souvent pour des moments qui comptent — un baptême, des funérailles, des retrouvailles. Il y a moins l'habitude de réclamer. Moins de temps à perdre avec des formulaires en anglais. <strong style=\"color:white;\">Et c'est exactement là-dessus que les compagnies comptent.</strong>",
      founder_p4: "Robin des Airs, c'est l'inverse. On gère votre dossier en français, en wolof, en bambara, en lingala — <strong style=\"color:white;\">parce qu'on se comprend mieux quand on parle la même langue.</strong> On monte un dossier technique que la compagnie ne peut pas ignorer. Et on prend 25%, pas un euro de plus, même si ça va au tribunal. Pas de volume maximum. Pas de frais cachés. Une famille contente et une recommandation à ses proches — c'est ça notre modèle.",
      founder_years: "Années dans le secteur",
      founder_won: "Dossiers remportés",
      founder_lost: "Si on perd",
      founder_stats_line: "20 années dans le secteur · 9/10 dossiers remportés · 0€ si on perd",
      founder_conviction: "Robin des Airs est né d'une conviction simple : <strong style=\"color:var(--neon-b);\">si une compagnie perçoit chaque euro avec une précision redoutable, nos familles méritent exactement le même traitement.</strong>",
      founder_signature: "— Le fondateur · 20 ans dans le secteur aérien · Spécialiste CE 261/2004",
      founder_cta: "CONFIER MON DOSSIER À ROBIN",
      founder_note: "Zéro frais si on perd · Réponse en moins de 2h · Droit de rétractation 14 jours",
      wa_float_text: "Envoyez votre carte ici",
      wa_float_aria: "Envoyer ma carte d'embarquement sur WhatsApp"
    },
    en: {
      skip_link: "Skip to main content",
      hero_title: "Robin takes from\nairlines,\n",
      hero_title_neon: "gives back to our families.",
      hero_diaspora_why: "We know your routes, we speak your language — we recover the €600 for our communities and our families.",
      hero_desc: "Flight delayed +3h, cancelled or overbooked? EU law entitles you to up to <strong>€600</strong>. We get your money back — <strong>no card, no fee if we don't win.</strong>",
      hero_btn_calc: "Or check my eligibility (2 questions)",
      hero_btn_wa: "📱 Send my boarding pass on WhatsApp",
      hero_moins_cher: "The cheapest on the market — no need to look elsewhere.",
      hero_lang_line: "Service available in: French, English, Wolof, Bambara, Soninké, Pulaar, Lingala.",
      hero_stat_max: "Max compensation",
      hero_stat_won: "Cases won",
      hero_stat_lost: "If we lose",
      hero_stat_24h: "Reply within 24h",
      nav_cta: "Get my compensation →",
      nav_drawer_calc: "🧮 Calculator",
      nav_drawer_loi: "📋 EU Regulation 261",
      nav_drawer_how: "⚙️ How it works",
      nav_drawer_tarifs: "💰 Our rates",
      nav_drawer_testi: "⭐ Testimonials",
      nav_drawer_faq: "❓ FAQ",
      nav_drawer_dest: "✈️ Top destinations €600",
      nav_drawer_blog: "📝 Blog",
      nav_drawer_depot: "📤 Submit my case",
      calc_tag: "Flight checker",
      calc_title: "What's your\nsituation?",
      calc_title_1: "What's your",
      funnel_subtitle: "situation?",
      step1_eyebrow: "Step 1 of 5 — What happened",
      step1_retard: "Delayed flight",
      step1_retard_sub: "Arrival +3h late",
      step1_annulation: "Cancelled flight",
      step1_annulation_sub: "Cancelled by the airline",
      step1_surbook: "Overbooking / Denied boarding",
      step1_surbook_sub: "Airline denied you boarding",
      step1_wa: "Talk directly to Robin",
      step1_wa_sub: "Complex case or question → WhatsApp",
      step1c_eyebrow: "Step 1c — Reason given",
      step1c_q: "Did the airline explain why?",
      raison_meteo: "🌩️ Weather / Climate",
      raison_technique: "🔧 Technical issue / Breakdown",
      raison_greve: "✊ Strike",
      raison_securite: "🛡️ Safety reason",
      raison_sans: "🤷 No explanation given",
      raison_nesaispas: "💭 I don't know / I don't remember",
      section_loi_tag: "What you might not know",
      section_loi_title: "Where does<br><span class=\"neon\">this money come from?</span>",
      section_how_tag: "The Robin method",
      section_how_title: "4 steps.\nOne goal.",
      section_faq_tag: "Frequently asked questions",
      section_faq_title: "Everything you\nwant to know.",
      cta_final_tag: "Take action now",
      cta_final_title: "Your money\nis waiting.",
      cta_btn_calc: "Calculate my compensation →",
      cta_wa: "WhatsApp",
      cta_recall: "Up to €600 · 25% · No fee if we lose",
      footer_tagline: "Air claim · Diaspora specialist · Fixed price · No win no fee",
      footer_nav: "Navigation",
      footer_legal: "Legal",
      footer_contact: "Contact",
      footer_loi: "EU Regulation 261/2004",
      footer_how: "How it works",
      footer_tarifs: "Our rates",
      footer_histoire: "Our story",
      ready_claim: "Ready to claim?",
      obt_indemnite: "Get my compensation →",
      section_comp_tag: "Full transparency",
      section_comp_title: "Robin vs the others.",
      section_comp_desc: "You know exactly what you will get before you commit. No bad surprises.",
      section_testi_tag: "They got their money back",
      section_testi_title: "Real passengers.\nReal money recovered.",
      section_founder_tag: "The founder",
      section_founder_title: "20 years behind the scenes.<br><span style=\"color:var(--neon-b);\">I've seen what they hide.</span>",
      cta_final_note: "Every month without claiming is money left on the table. The limitation period is 5 years — but it doesn't last forever.",
      funnel_step_label: "Step 1 of 5",
      funnel_wa_shortcut_text: "In one message: send us your flight on WhatsApp, we'll tell you in 2 min if you're eligible.",
      funnel_wa_shortcut_btn: "💬 Check my eligibility via WhatsApp",
      funnel_detail_link: "Or calculate the exact amount → detailed check (5 steps)",
      short_q_vol: "What is your flight?",
      short_hint_vol: "Flight number + date, e.g. \"Paris-Dakar 15/01, delayed\"",
      short_placeholder_vol: "E.g: AF718 15/01, delayed",
      short_q_phone: "Your WhatsApp number",
      short_hint_phone: "So we can get back to you and tell you if you're eligible.",
      short_placeholder_phone: "E.g: +33 6 12 34 56 78",
      short_done_title: "Thank you!",
      short_done_hint: "To finish, send your boarding pass on WhatsApp. We check and reply within 24h.",
      short_done_wa_btn: "📱 Send my boarding pass on WhatsApp",
      btn_suivant: "Next →",
      btn_envoyer: "Send →",
      btn_retour: "← Back",
      faq_1_q: "💰 How much do I get in my account?",
      faq_1_a: "<p style=\"margin-bottom:14px;\"><strong>Robin takes 25% only when we win.</strong> You receive 75% net.</p><ul style=\"margin-bottom:14px;padding-left:18px;font-size:13px;color:var(--gray);line-height:1.8;\"><li>Short haul (&lt; 1,500 km) → €250 compensation → you get <strong>€188</strong></li><li>Medium (1,500–3,500 km) → €400 → you get <strong>€300</strong></li><li>Long haul (&gt; 3,500 km) → €600 → you get <strong>€450</strong></li></ul><p style=\"margin-bottom:10px;font-size:13px;\">Family of 4 on Paris–Dakar? 4 × €600 = €2,400 gross → <strong>€1,800 net</strong> for you.</p><p style=\"font-size:12px;color:var(--gray);\">🏹 No fee if we don't win. Same commission even in court.</p>",
      faq_2_q: "I travel alone — can you still help me?",
      faq_2_a: "Absolutely! Our mission is to help all our communities, whether you travel alone, as a couple or with family. EU regulation applies to each passenger individually. If your flight was delayed, you're entitled to €600, regardless of how many travellers.",
      faq_3_q: "⚠️ The airline offered me a voucher — do I accept?",
      faq_3_a: "<strong>It's a trap.</strong> The voucher goes back to the airline if you don't use it — and it often has an expiry date. Its value is almost always less than the €600 cash you're legally entitled to. <strong>Don't accept before contacting us.</strong> Cash doesn't expire.",
      faq_4_q: "The airline says weather or \"extraordinary circumstances\"...",
      faq_4_a: "That's their favourite excuse. Our case file includes <strong>official aviation weather reports (METAR, TAF)</strong> for departure and arrival airports. We compare with all flights that took off in the same time window. If other planes could fly that day — and they often did — we have the proof. Weather is also analysed via TAF forecasts and en-route charts: no storm, no severe wind, the \"weather\" excuse doesn't hold. <a href=\"/meteo-dossier-indemnite.html\">Learn more: Weather and claims (TAF, METAR…)</a>",
      faq_5_q: "💸 Why are you cheaper than competitors?",
      faq_5_a: "Competitors charge 30% to 50% of the compensation. On €600, that's up to €300 taken. We take 25% — no win no fee — because our model isn't about maximum volume. We prefer a clear rate, a happy client, and word of mouth over a big commission. You know what you get before you sign.",
      faq_6_q: "How do I track my case?",
      faq_6_a: "Automatic notifications by <strong>WhatsApp AND email</strong> at each stage: Case sent, Airline response received, Payment confirmed, Transfer in progress. You can relax — no need to call. Phone calls are for new sign-ups.",
      faq_7_q: "I claimed myself and the airline refused. Can you step in?",
      faq_7_a: "Yes. An initial refusal is never final. <strong>It's often the start of negotiation.</strong> 80% of eligible passengers give up after that first refusal — which is what the airline hopes (<a href=\"/pourquoi-si-peu-reclament.html\">why so few get their compensation</a>). We take over the case, add METAR evidence, and resubmit with a solid file (weather, other flights at the same time). If they persist, we can start proceedings. Fees are already in our commission: you pay nothing extra. And if we lose in the end: <strong>€0</strong> charged.",
      faq_8_q: "How do I get paid?",
      faq_8_a: "<strong>We pay you.</strong> Once we receive the funds from the airline, we ask for your bank details and transfer your compensation. We only ask for money to give it back to you. Never before.",
      faq_9_q: "Can I change my mind and withdraw?",
      faq_9_a: "Yes. You have a <strong>14-day right of withdrawal</strong> from signing the mandate. You can cancel your case entirely — no fee, no reason required. We built the case? That's our investment, not yours.",
      faq_10_q: "How long until I'm refunded?",
      faq_10_a: "Your case is sent to the airline within <strong>24 hours</strong>. On average airlines pay within <strong>4 to 12 weeks</strong>. We don't let go — reminders, arguments, legal escalation if needed. All without you having to do a thing.",
      faq_11_q: "My flight had a connection — can I still claim?",
      faq_11_a: "Yes. It's the <strong>last flight (final leg)</strong> that sets the amount: that flight's distance and delay on arrival. If you missed a connection because of a delay on your first flight, you're also eligible. Select \"With connection\" in the checker or form — we handle the rest.",
      faq_12_q: "What if the airline refuses?",
      faq_12_a: "We resubmit with a solid case (METAR evidence, other flights at the same time). If the airline persists, we start <strong>legal proceedings</strong> — fees are included in our commission. If we ultimately lose: <strong>€0</strong> charged.",
      faq_13_q: "Do you take every case?",
      faq_13_a: "No — and that's our strength. We review every case for free before accepting it. If your chances are low, we tell you honestly rather than waste your time. That's why our success rate is 9 out of 10: we only take on cases we're confident we can win. If we don't take your case, we explain why and advise you on alternatives.",
      faq_14_q: "How long until I receive my compensation?",
      faq_14_a: "<p>It depends on how responsive the airline is. Here are the three possible scenarios:</p><p><strong>The airline cooperates (60% of cases)</strong> — after receiving our technical file (proof of delay, official weather reports, legal analysis), the airline recognises your right and pays. Timeline: 4 to 12 weeks. This is the most common outcome — airlines know our cases are solid and prefer to pay rather than escalate.</p><p><strong>The airline resists (30% of cases)</strong> — it invokes \"extraordinary circumstances\" to refuse. We counter with our weather evidence and air traffic data for that day (if other planes took off normally, the excuse doesn't hold). We refer your case to the Tourism and Travel Ombudsman. The ombudsman issues a recommendation within 90 days. In most cases, the airline follows it and pays. Total timeline: 3 to 5 months.</p><p><strong>The airline persists (under 10% of cases)</strong> — even after the ombudsman, it still refuses. We take the case to court at our expense and risk. Total timeline: 5 to 8 months.</p><p>In all cases, our commission stays 25% — it never changes, even if your case goes to court. And if we recover nothing, you pay nothing. We keep you updated at every step via WhatsApp.</p>",
      founder_quote: "\"They charge you for the extra kilo. They charge you for the second bag. But when it's their turn to pay — delay, cancellation, overbooking — there's nobody on the line.\"",
      founder_p1: "Twenty years in the aviation sector. <strong style=\"color:white;\">I've seen how the machine works from the inside.</strong> Phone scripts designed to put you off. Forms designed to make you give up. The words \"extraordinary circumstances\" pulled out like a joker whenever the wallet has to open.",
      founder_p2: "I've seen whole families charged at boarding for one extra kilo — then leave with nothing when their plane was <strong style=\"color:white;\">5 hours late</strong>. I've seen too many travellers give up in the face of legal jargon and automated replies.",
      founder_p3: "Our communities travel further, as families, often for moments that matter — a baptism, a funeral, a reunion. There's less habit of claiming. Less time to waste on forms in English. <strong style=\"color:white;\">And that's exactly what the airlines count on.</strong>",
      founder_p4: "Robin des Airs is the opposite. We handle your case in French, Wolof, Bambara, Lingala — <strong style=\"color:white;\">because we understand each other better when we speak the same language.</strong> We build a technical case the airline can't ignore. We take 25%, not a euro more, even if it goes to court. No maximum volume. No hidden fees. A happy family and a recommendation to their loved ones — that's our model.",
      founder_years: "Years in the sector",
      founder_won: "Cases won",
      founder_lost: "If we lose",
      founder_stats_line: "20 years in the sector · 9/10 cases won · €0 if we lose",
      founder_conviction: "Robin des Airs was born from one simple belief: <strong style=\"color:var(--neon-b);\">if an airline collects every euro with ruthless precision, our families deserve exactly the same treatment.</strong>",
      founder_signature: "— The founder · 20 years in aviation · EU Regulation 261/2004 specialist",
      founder_cta: "TRUST ROBIN WITH MY CASE",
      founder_note: "No fee if we lose · Reply within 2h · 14-day right of withdrawal",
      wa_float_text: "Send your boarding pass here",
      wa_float_aria: "Send my boarding pass on WhatsApp"
    }
  };

  function get(key) {
    var lang = (currentLang === 'en' ? 'en' : 'fr');
    return (T[lang] && T[lang][key]) || T.fr[key] || key;
  }

  function apply() {
    document.documentElement.lang = currentLang === 'en' ? 'en' : 'fr';
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var val = get(key);
      if (val && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') el.textContent = val.replace(/\\n/g, '\n');
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-html');
      var val = get(key);
      if (val) el.innerHTML = val.replace(/\n/g, '<br>');
    });
    var funnelSub = document.getElementById('funnel-subtitle');
    if (funnelSub) funnelSub.textContent = get('funnel_subtitle');
    var step1 = document.getElementById('step-1');
    if (step1) {
      var eb = step1.querySelector('.fstep-eyebrow');
      if (eb) eb.textContent = get('step1_eyebrow');
      var cbs = step1.querySelectorAll('.cb');
      if (cbs.length >= 4) {
        cbs[0].querySelector('.cb-main').textContent = get('step1_retard');
        cbs[0].querySelector('.cb-sub').textContent = get('step1_retard_sub');
        cbs[1].querySelector('.cb-main').textContent = get('step1_annulation');
        cbs[1].querySelector('.cb-sub').textContent = get('step1_annulation_sub');
        cbs[2].querySelector('.cb-main').textContent = get('step1_surbook');
        cbs[2].querySelector('.cb-sub').textContent = get('step1_surbook_sub');
        cbs[3].querySelector('.cb-main').textContent = get('step1_correspondance');
        cbs[3].querySelector('.cb-sub').textContent = get('step1_correspondance_sub');
        var noteEl = cbs[3].querySelector('.cb-note');
        if (noteEl) noteEl.textContent = get('step1_correspondance_note');
      }
    }
    var step1c = document.getElementById('step-1c');
    if (step1c) {
      var eb1c = step1c.querySelector('.fstep-eyebrow');
      if (eb1c) eb1c.textContent = get('step1c_eyebrow');
      var q1c = step1c.querySelector('.fstep-q');
      if (q1c) q1c.textContent = get('step1c_q');
      var reasonBtns = step1c.querySelectorAll('.reason-btn');
      if (reasonBtns.length >= 6) {
        reasonBtns[0].innerHTML = get('raison_meteo');
        reasonBtns[1].innerHTML = get('raison_technique');
        reasonBtns[2].innerHTML = get('raison_greve');
        reasonBtns[3].innerHTML = get('raison_securite');
        reasonBtns[4].innerHTML = get('raison_sans');
        reasonBtns[5].innerHTML = get('raison_nesaispas');
      }
    }
    var labelEl = document.getElementById('funnel-step-label');
    if (labelEl) labelEl.textContent = get('funnel_step_label');
    var waShortcut = document.querySelector('.funnel-wa-shortcut');
    if (waShortcut) {
      var t = waShortcut.querySelector('.funnel-wa-shortcut-text');
      if (t) t.textContent = get('funnel_wa_shortcut_text');
      var b = waShortcut.querySelector('.funnel-wa-shortcut-btn');
      if (b) b.textContent = get('funnel_wa_shortcut_btn');
    }
    var detailLink = document.getElementById('link-diagnostic-detail');
    if (detailLink) detailLink.textContent = get('funnel_detail_link');
    var waFloat = document.getElementById('wa-float');
    if (waFloat) waFloat.setAttribute('aria-label', get('wa_float_aria'));
    var short1 = document.getElementById('step-short-1');
    if (short1) {
      var q1 = short1.querySelector('.fstep-q');
      if (q1) q1.textContent = get('short_q_vol');
      var h1 = short1.querySelector('.funnel-hint');
      if (h1) h1.textContent = get('short_hint_vol');
      var inp1 = document.getElementById('short-vol');
      if (inp1) inp1.placeholder = get('short_placeholder_vol');
      var btn1 = short1.querySelector('.btn-calc');
      if (btn1) btn1.textContent = get('btn_suivant');
    }
    var short2 = document.getElementById('step-short-2');
    if (short2) {
      var q2 = short2.querySelector('.fstep-q');
      if (q2) q2.textContent = get('short_q_phone');
      var h2 = short2.querySelector('.funnel-hint');
      if (h2) h2.textContent = get('short_hint_phone');
      var inp2 = document.getElementById('short-phone');
      if (inp2) inp2.placeholder = get('short_placeholder_phone');
      var btnSend = short2.querySelector('.btn-calc');
      if (btnSend) btnSend.textContent = get('btn_envoyer');
      var btnBack = short2.querySelector('.back-btn');
      if (btnBack) btnBack.textContent = get('btn_retour');
    }
    var shortDone = document.getElementById('step-short-done');
    if (shortDone) {
      var qd = shortDone.querySelector('.fstep-q');
      if (qd) qd.textContent = get('short_done_title');
      var hd = shortDone.querySelector('.funnel-hint');
      if (hd) hd.textContent = get('short_done_hint');
      var waDone = document.getElementById('short-done-wa-btn');
      if (waDone) waDone.textContent = get('short_done_wa_btn');
    }
    document.querySelectorAll('.faq-list .faq-item').forEach(function(item, i) {
      var idx = i + 1;
      var qEl = item.querySelector('.faq-question [data-i18n]');
      if (qEl) qEl.textContent = get('faq_' + idx + '_q');
      var aEl = item.querySelector('.faq-answer-inner');
      if (aEl) aEl.innerHTML = get('faq_' + idx + '_a');
    });
  }

  function setLang(code) {
    var c = (code || 'fr').toLowerCase();
    if (c === 'en') { currentLang = 'en'; } else { currentLang = 'fr'; }
    try { localStorage.setItem('robin_lang', currentLang); } catch (e) {}
    apply();
    var flag = currentLang === 'en' ? '🇬🇧' : '🇫🇷';
    var flagEl = document.getElementById('current-flag');
    if (flagEl) flagEl.textContent = flag;
    document.querySelectorAll('.lang-option').forEach(function(o) {
      o.classList.toggle('active', o.getAttribute('data-lang') === currentLang);
    });
  }

  return {
    get: get,
    apply: apply,
    setLang: setLang,
    getLang: function() { return currentLang; }
  };
})();

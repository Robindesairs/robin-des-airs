/* Robin des Airs — Traductions FR et EN uniquement */
window.I18N = (function() {
  var stored = (localStorage.getItem('robin_lang') || 'fr').toLowerCase();
  var currentLang = (stored === 'en' ? 'en' : 'fr');
  var T = {
    fr: {
      page_title: "Robin des Airs — Indemnités aériennes jusqu'à 600€ | Premium",
      meta_description: "Vol retardé ou annulé ? Jusqu'à 600€ par passager (CE 261). On ne prend notre part (25%) qu'une fois votre argent récupéré — sinon vous ne payez rien. Réponse sous 24h.",
      skip_link: "Aller au contenu principal",
      diaspora_bar_pays: "SÉNÉGAL · MALI · CÔTE D'IVOIRE · GUINÉE · CAMEROUN · RDC · BÉNIN · TOGO · GHANA · NIGERIA",
      diaspora_bar_text: "Vol retardé ? Jusqu'à 600€ si le CE 261 s'applique à votre vol — toute nationalité.",
      diaspora_bar_text_mobile: "Retard ? Jusqu'à 600€ (CE 261).",
      wa_eligibility_prefill: "Bonjour Robin ! Je veux vérifier si mon vol est éligible.\nNuméro de vol :\nDate :",
      hero_wa_note: "Répondez en français, wolof ou anglais — comme vous préférez.",
      hero_title: "Robin prend\naux compagnies,\n",
      hero_title_neon: "rend à nos familles.",
      hero_diaspora_why: "On connaît vos lignes, on parle votre langue — on récupère les 600€ pour nos communautés et nos familles.",
      hero_desc: "Vol retardé de +3h, annulé ou surbooké ?\nLa loi oblige la compagnie à vous verser <strong>jusqu'à 600€ par passager</strong>.\nOn ne prend notre part (25%) qu'une fois votre argent récupéré.\n<strong>Si on ne gagne pas, vous ne payez rien.</strong>",
      hero_btn_calc: "Ou calculez le montant exact (2 min) →",
      hero_btn_wa: "📱 Vérifier mon éligibilité sur WhatsApp",
      wa_qr_hint: "Pas WhatsApp sur cet appareil ? Scanner le QR →",
      wa_qr_title: "Continuer sur WhatsApp",
      wa_qr_desc: "Scannez ce QR code avec votre téléphone pour ouvrir WhatsApp.",
      wa_qr_open: "Ouvrir WhatsApp →",
      wa_qr_note: "Si rien ne s’ouvre sur votre ordinateur, c’est normal : scannez le QR et continuez sur mobile.",
      hero_moins_cher: "Notre part (25%) une fois l'argent récupéré · Si on ne gagne pas, vous ne payez rien · Réponse sous 24h",
      hero_lang_line: "Service disponible en : Français, Wolof, Bambara, Soninké, Peul (Pulaar), Dioula, Swahili, Lingala, Twi, Yoruba.",
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
      nav_drawer_dest: "✈️ Guides & destinations (blog)",
      nav_drawer_blog: "📝 Blog",
      nav_drawer_depot: "📤 Déposer mon dossier",
      calc_tag: "Combien vous touchez ? · Robin des Airs",
      calc_title: "Vérifiez en 2 min\nsi vous êtes éligible",
      calc_title_1: "Vérifiez en 2 min",
      funnel_subtitle: "si vous êtes éligible",
      funnel_step_short: "2 questions",
      calc_disclaimer: "Notre part (25%) une fois l'argent récupéré · Si on ne gagne pas, vous ne payez rien · Réponse sous 24h",
      step1_eyebrow: "Ce qui s'est passé",
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
      section_loi_prescription: "Votre vol date d'il y a 1 an, 2 ans, même 4 ans ? En droit français, vous avez 5 ans pour réclamer. Ce vol de 2021 qui avait 5 heures de retard ? L'argent est toujours là.",
      section_how_tag: "La méthode Robin",
      section_how_title: "4 flèches.\nUn seul objectif.",
      section_faq_tag: "Questions fréquentes",
      section_faq_title: "Tout ce que vous\nvoulez savoir.",
      cta_final_tag: "Passez à l'action maintenant",
      cta_final_title: "Votre argent\nvous attend.",
      cta_btn_calc: "Mon argent m'attend →",
      cta_wa: "WhatsApp direct",
      cta_depot: "Déposer mon dossier →",
      cta_or: "Ou ",
      link_depot_online: "formulaire en ligne",
      cta_recall: "Jusqu'à 600€ · Notre part (25%) après récupération · Sinon vous ne payez rien",
      loi_intro: "Le <strong style=\"color:var(--navy);\">Règlement (CE) n° 261/2004</strong> protège les passagers sur les trajets entre l’Europe et l’Afrique. Selon le sens du vol — <strong style=\"color:var(--navy);\">Europe → Afrique</strong> ou <strong style=\"color:var(--navy);\">Afrique → Europe</strong> — les règles ne sont pas les mêmes :",
      loi_you_depart_eu_title: "🛫 EUROPE → AFRIQUE",
      loi_you_depart_eu_p: "Votre avion décolle d’<strong>Europe</strong> (Union européenne) vers l’<strong>Afrique</strong> ou ailleurs. En cas d’annulation ou de surbooking, le CE 261 prévoit également une indemnité forfaitaire selon les conditions. Peu importe votre nationalité — toute compagnie, européenne ou non, doit payer si le vol part de l’UE.",
      loi_delay_arrival_note: "En cas de <strong>retard</strong>, lorsque le CE 261 s’applique à votre trajet : c’est un retard d’au moins <strong>3 heures à l’arrivée à destination</strong>, et non le retard au décollage seul, qui ouvre droit à indemnité.",
      loi_you_depart_africa_title: "🛬 AFRIQUE → EUROPE",
      loi_you_depart_africa_p1: "Votre avion décolle d’<strong>Afrique</strong> à destination de l’<strong>Europe</strong> / de l’UE : la règle change — seules les compagnies européennes sont tenues de payer.",
      loi_you_depart_africa_p2: "→ Air France, Corsair, Brussels Airlines, KLM, Transavia, Lufthansa, Iberia, TAP, ITA Airways et autres compagnies européennes : <strong style=\"color:var(--navy);\">oui</strong>, elles sont européennes.<br>→ Royal Air Maroc, Air Sénégal, Ethiopian Airlines : <strong style=\"color:var(--navy);\">non</strong> sur ces vols-là — elles ne sont pas européennes.",
      loi_contact_wa: "Pas sûr de votre cas ? <a href=\"https://wa.me/15557840392\" target=\"_blank\" style=\"color:var(--neon-dark);text-decoration:underline;font-weight:800;\">Envoyez-nous votre vol sur WhatsApp</a>, on vérifie gratuitement dans la journée.",
      loi_80percent: "<strong style=\"color:var(--navy);\">80% des passagers éligibles ne réclament jamais.</strong> Pas parce qu'ils n'y ont pas droit — parce que les compagnies comptent sur leur abandon. Et vous avez <strong style=\"color:var(--navy);\">5 ans</strong> pour réclamer : votre vol de 2021 qui avait du retard ? L'argent est toujours là.",
      loi_closing: "Pas sûr de votre cas ? <a href=\"https://wa.me/15557840392\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--neon-dark);text-decoration:underline;font-weight:800;\">Envoyez-nous votre vol sur WhatsApp</a> — vérification gratuite dans la journée. <strong style=\"color:var(--navy);\">80 % des passagers éligibles ne réclament jamais</strong> : les compagnies comptent sur l'abandon. Vous avez <strong style=\"color:var(--navy);\">5 ans</strong> pour réclamer — un vol de 2021 en retard ? L'argent peut encore être dû.",
      loi_card_long: "Nos communautés · Nos familles",
      loi_per_pax: "par passager",
      loi_distance_long: "Plus de 3 500 km — notre cœur de métier · indemnités par passager",
      loi_net_450: "→ 450€ nets par passager (sur 600€)",
      loi_tiers_note: "La loi prévoit aussi 250€ ou 400€ pour les distances plus courtes — après analyse de votre vol, on vous dit exactement le montant qui s’applique.",
      cta_recover: "Je récupère mon argent →",
      dest_tag: "Lignes Europe ↔ Afrique",
      dest_title: "Top destinations · <span class=\"neon\">Indemnité 600€</span>",
      dest_desc: "Vol retardé ou annulé sur une ligne Europe → Afrique ou Afrique → Europe vers l’une de ces villes ? Vous êtes éligible au palier maximum (600€) lorsque la distance et les conditions le permettent.",
      dest_card_line: "Ligne surveillée par Robin",
      dest_card_amount: "Indemnité standard : 600€",
      sp_9sur10: "<strong>9 dossiers sur 10</strong> remportés",
      sp_24h: "Réponse sous <strong>24h</strong>",
      sp_families: "Nos familles nous font confiance — des centaines de dossiers réglés",
      sp_cta: "C'est mon tour →",
      how_step1_title: "Vous vérifiez",
      how_step1_desc: "Entrez votre vol dans le diagnostic. En 60 secondes, vous savez si vous êtes éligible et combien vous touchez net.",
      how_step2_title: "Vous signez",
      how_step2_desc: "3 minutes sur WhatsApp ou en ligne. Vous signez le mandat électronique. C'est tout — on prend la main.",
      how_step3_title: "On monte le dossier",
      how_step3_desc: "Sous 24h, dossier technique : METAR/TAF, comparaison avec les autres vols au même moment — si d'autres avions ont décollé, on le documente.",
      how_step4_title: "Vous encaissez",
      how_step4_desc: "Robin négocie jusqu'au bout : en général la compagnie paie sous 4 à 12 semaines ; sinon médiateur puis tribunal à nos frais. Dès réception des fonds, virement de votre part — le détail des pourcentages est fixé avant signature (voir FAQ).",
      how_step1_time: "⏱ 60 secondes",
      how_step2_time: "⏱ 3 minutes",
      how_step3_time: "⏱ 24 heures",
      cta_3min: "3 minutes et c'est réglé →",
      how_further: "Pour aller plus loin : <a href=\"/meteo-dossier-indemnite.html\" style=\"color:var(--neon-dark);font-weight:600;\">Météo et dossier (TAF, METAR…)</a> · <a href=\"/pourquoi-si-peu-reclament.html\" style=\"color:var(--neon-dark);font-weight:600;\">Pourquoi si peu récupèrent leur indemnité ?</a>",
      testi_aria_prev: "Précédent",
      testi_aria_next: "Suivant",
      footer_tagline: "Réclamation aérienne · Spécialiste Diaspora · Prix fixe · No win no fee",
      footer_nav: "Navigation",
      footer_legal: "Légal",
      footer_contact: "Contact",
      footer_depot_online: "Dépôt en ligne",
      footer_loi: "La loi CE 261/2004",
      footer_how: "Comment ça marche",
      footer_tarifs: "Nos tarifs",
      footer_histoire: "Notre histoire",
      ready_claim: "Prêt à réclamer ?",
      obt_indemnite: "Mon argent m'attend →",
      section_comp_tag: "Transparence totale",
      section_comp_title: "Robin vs les autres.",
      section_comp_desc: "Vous savez exactement ce que vous allez toucher avant de vous engager. Pas de mauvaise surprise.",
      section_comp_fineprint: "La différence clé : même commission si la compagnie résiste ou si le dossier va au tribunal — détail dans la FAQ.",
      comp_r_method_l: "Méthode",
      comp_r_method_robin: "WhatsApp, suivi direct",
      comp_r_eu_af_l: "Europe ↔ Afrique",
      comp_r_eu_af_others: "Souvent axé vols intra-UE",
      comp_r_af_eu_l: "Afrique → Europe",
      comp_r_af_eu_robin: "CE 261 si compagnie européenne",
      comp_r_af_eu_others: "Peu clair selon les sites",
      comp_r_lang_l: "Langues parlées",
      comp_r_lang_robin: "Français, anglais, wolof, bambara, lingala, soninké, peul/pulaar, dioula, swahili, twi, yoruba…",
      comp_r_lang_others: "Souvent limité à l'anglais",
      section_comp_sources: "Données basées sur les grilles tarifaires publiques des principaux services d'indemnisation européens, mars 2026.",
      comp_h_crit: "Critère",
      comp_h_robin: "✈ Robin des Airs",
      comp_h_others: "Les autres",
      comp_r1_l: "Commission de base",
      comp_r2_l: "Commission si procès",
      comp_r2_robin: "25% (inchangée)",
      comp_r3_l: "Sur <strong>600€</strong> d'indemnité — vous recevez (nets)",
      comp_r4_l: "Sur <strong>600€</strong> — vous recevez (si procès)",
      comp_r5_l: "Sur <strong>2 400€</strong> famille (si procès)",
      comp_r6_l: "Spécialiste vols diaspora Afrique",
      comp_r7_l: "Français, anglais, wolof, bambara, lingala, soninké, peul/pulaar, dioula, swahili, twi, yoruba…",
      comp_r8_l: "Suivi WhatsApp en temps réel",
      comp_r9_l: "Si on ne gagne pas",
      comp_yes_core: "Notre cœur de métier",
      comp_others_wa: "Email ou chatbot",
      section_testi_tag: "Ils ont récupéré leur argent",
      section_testi_title: "Vrais passagers.\nVrai argent récupéré.",
      testi_quote_1: "Six mois que je me battais avec Air France, j'y croyais plus. On était trois sur le billet. Réglé en cinq semaines, sans nouvelle galère. Franchement je les recommande à toute la famille 👏",
      testi_quote_2: "Notre Bruxelles–Abidjan annulé, on ne savait plus où donner de la tête. Robin nous a sortis de là, et on n'a payé qu'une fois l'argent arrivé. Ailleurs à 35\u00A0% on aurait gardé moins, c'est sûr.",
      testi_quote_3: "4h de retard sur Corsair Pointe-à-Pitre. En 2 min le dossier était déposé. Le whatsapp c'est pratique on sait toujours ou on en est",
      testi_quote_4: "Air France me proposait un bon d'achat à 300€. Robin m'a dit de ne pas signer. J'ai attendu : le virement a été bien au-delà de leur offre. Bonne pioche 💶",
      testi_quote_5: "Vol Tunis Paris retardé de 5h pour soi-disant la meteo. Robin a prouvé que d'autres avions avaient atterri le meme jour. Ils ont pas pu refuser",
      testi_quote_6: "Surbooking à Douala, la porte qui se referme sous notre nez. Vraiment violent ce jour-là. Robin a remis les choses d'aplomb pour mon fils et moi, on a enfin pu tourner la page. Merci !",
      testi_quote_7: "J'avais déjà réclamer tout seul et ils avaient refusé. Je pensais que c'était fini. Robin a repris le dossier et gagné. Respect 🙌",
      testi_quote_8: "Bruxelles–Kinshasa à quatre, vol annulé, la compagnie nous baladait depuis des semaines. Robin a tout géré de A à Z pour la famille, sans prise de tête. On respire.",
      testi_quote_9: "Honnêtement j'avais des doutes au début sur le prix fixe. Finalement c'est la meilleure option. Transparent de A à Z et suivi régulier sur WhatsApp",
      testi_info_1: "CDG → DKR · Famille (3) · Retard 6h",
      testi_info_2: "BRU → ABJ · Couple · Annulation",
      testi_info_3: "ORY → PTP · DS891 · Retard 4h",
      testi_info_4: "CDG → BKO · Solo · Annulation",
      testi_info_5: "TUN → ORY · TU700 · Retard 5h",
      testi_info_6: "CDG → DLA · Mère + enfant · Surbooking",
      testi_info_7: "ACC → CDG · AF · Retard 4h30",
      testi_info_8: "BRU → FIH · Famille (4) · Annulation",
      testi_info_9: "DKR → CDG · SS892 · Retard 3h30",
      testi_translated_from: "",
      trust_tag: "Pourquoi nous faire confiance",
      trust_title: "Des preuves.<br><span class=\"neon\">Pas des promesses.</span>",
      trust_1_t: "20 ans d’aviation",
      trust_1_d: "Un fondateur qui connaît les coulisses, les excuses, et la procédure.",
      trust_2_t: "25% quoi qu’il arrive",
      trust_2_d: "Même si ça va au médiateur ou au tribunal : pas de surprise, pas de hausse.",
      trust_3_t: "Zéro frais si on perd",
      trust_3_d: "On prend le risque. Si on ne récupère rien, vous ne payez rien.",
      trust_4_t: "Suivi WhatsApp + email",
      trust_4_d: "Vous êtes informé à chaque étape. Pas besoin d’appeler.",
      blog_feat_tag: "Ressources",
      blog_feat_title: "3 articles pour<br><span class=\"neon\">comprendre</span> en 5 minutes",
      blog_feat_1_t: "Vol retardé Paris–Dakar : comment récupérer 600€",
      blog_feat_1_d: "Exemples concrets, familles, et ce que la compagnie essaie de faire croire.",
      blog_feat_2_t: "Bon d’achat : pourquoi c’est souvent un piège",
      blog_feat_2_d: "Quand refuser, quoi répondre, et comment sécuriser une indemnité cash.",
      blog_feat_3_t: "Prescription : vous avez 5 ans pour réclamer",
      blog_feat_3_d: "Votre vol de 2021/2022 ? Vous pouvez encore récupérer votre indemnité.",
      blog_feat_read: "Lire →",
      blog_feat_more_prefix: "Plus de guides & destinations :",
      blog_feat_more_link: "voir ici",
      section_founder_tag: "LE FONDATEUR",
      section_founder_title: "20 ans dans les coulisses.<br><span style=\"color:var(--neon-b);\">J'ai vu ce qu'ils cachent.</span>",
      cta_final_note: "Chaque mois sans réclamer, c'est de l'argent que vous laissez sur la table. Le délai de prescription est de 5 ans — mais ça ne dure pas.",
      funnel_step_label: "Étape 1 sur 5",
      funnel_wa_shortcut_text: "Sur WhatsApp : numéro de vol + date — on vérifie votre éligibilité (réponse sous 24h).",
      funnel_wa_shortcut_btn: "💬 Vérifier mon éligibilité par WhatsApp",
      funnel_detail_link: "Ou calculez le montant exact (2 min) → diagnostic détaillé",
      short_q_vol: "Quel est votre vol ?",
      short_hint_vol: "Numéro de vol + date, ou ex. « Paris-Dakar du 15/01, retardé »",
      short_placeholder_vol: "Ex: AF718 du 15/01, retardé",
      short_q_phone: "Votre numéro WhatsApp",
      short_hint_phone: "Pour qu'on vous recontacte et vous dise si vous êtes éligible.",
      short_placeholder_phone: "Ex: +33 6 12 34 56 78",
      short_done_title: "Merci !",
      short_done_hint: "Ouvrez WhatsApp : on reprend votre vol et votre numéro — complétez la date si besoin. Réponse sous 24h.",
      short_done_wa_btn: "📱 Vérifier mon éligibilité sur WhatsApp",
      btn_suivant: "Suivant →",
      btn_envoyer: "Envoyer →",
      btn_retour: "← Retour",
      faq_1_q: "💰 Combien je touche exactement sur mon compte ?",
      faq_1_a: "<p style=\"margin-bottom:14px;\"><strong>Commission de succès : 25%</strong>, due uniquement si nous récupérons une indemnité pour vous — sinon vous ne payez rien. Vous recevez <strong>75% nets</strong> sur le montant encaissé.</p><p style=\"margin-bottom:14px;font-size:13px;color:var(--gray);line-height:1.8;\"><strong>Notre spécialité : les vols long-courrier (&gt; 3 500 km).</strong> Indemnité 600€ → vous touchez <strong>450€</strong> nets.</p><p style=\"margin-bottom:10px;font-size:13px;\">Famille de 4 sur un Paris-Dakar ? 4 × 600€ = 2 400€ brut → <strong>1 800€ nets</strong> pour vous. Cette commission ne change jamais, même si votre dossier va au tribunal.</p><p style=\"margin-bottom:0;font-size:12px;color:var(--gray);line-height:1.7;\">À noter : vol court (&lt; 1 500 km) → 250€ → <strong>188€</strong> nets. Vol moyen (1 500–3 500 km) → 400€ → <strong>300€</strong> nets.</p>",
      faq_2_q: "⏱️ Combien de temps faut-il pour recevoir mon indemnité ?",
      faq_2_a: "<p>Ça dépend de la réactivité de la compagnie. Voici les trois scénarios possibles :</p><p><strong>La compagnie coopère (60% des cas)</strong> — après réception de notre dossier technique (preuves du retard, bulletins météo officiels, analyse de la jurisprudence), la compagnie reconnaît votre droit et paie. Délai : 4 à 12 semaines. C'est le cas le plus fréquent — les compagnies savent que nos dossiers sont solides et préfèrent payer plutôt que d'aller plus loin.</p><p><strong>La compagnie résiste (30% des cas)</strong> — elle invoque des \"circonstances extraordinaires\" pour refuser. On contre ses arguments avec nos preuves météo et les données de trafic aérien du jour. On saisit le Médiateur du Tourisme et du Voyage en votre nom. Le médiateur rend sa recommandation sous 90 jours. Dans la grande majorité des cas, la compagnie suit et paie. Délai total : 3 à 5 mois.</p><p><strong>La compagnie persiste (moins de 10% des cas)</strong> — même après le médiateur, elle refuse. On saisit le tribunal à nos frais et à nos risques. Délai total : 5 à 8 mois.</p><p>Dans tous les cas, notre commission reste 25% — elle ne change jamais. Et si on ne récupère rien, vous ne payez rien. On vous tient informé à chaque étape par WhatsApp.</p>",
      faq_3_q: "⚠️ La compagnie m'a proposé un bon d'achat — je l'accepte ?",
      faq_3_a: "Non. Le bon d'achat retourne dans la poche de la compagnie si vous ne l'utilisez pas — et il a souvent une date limite. Sa valeur est presque toujours inférieure aux 600€ en cash auxquels vous avez droit. Ne signez rien et contactez-nous d'abord. L'argent cash n'a pas de date d'expiration.",
      faq_4_q: "🌩️ La compagnie invoque la météo ou une \"circonstance extraordinaire\"...",
      faq_4_a: "C'est leur excuse préférée. Notre dossier intègre les bulletins météo aéronautiques officiels (METAR, TAF) de l'aéroport de départ et d'arrivée. On compare avec tous les vols qui ont décollé dans la même fenêtre horaire. Si d'autres avions ont pu voler ce jour-là — et souvent ils l'ont fait — on a les preuves. <a href=\"/meteo-dossier-indemnite.html\">En savoir plus : Météo et dossier (TAF, METAR…)</a>",
      faq_5_q: "❌ J'ai réclamé seul et la compagnie a refusé. Vous pouvez intervenir ?",
      faq_5_a: "Oui. Un refus initial n'est jamais définitif — c'est souvent le début de la négociation. 80% des passagers éligibles abandonnent après ce premier refus, et c'est exactement ce que la compagnie espère. On reprend le dossier, on l'enrichit avec nos preuves techniques, et on relance avec un argumentaire que la compagnie ne peut pas ignorer. Si elle persiste, on passe au médiateur puis au tribunal. Les frais sont inclus dans notre commission : vous ne payez rien de plus.",
      faq_6_q: "💳 Comment je suis payé ?",
      faq_6_a: "C'est nous qui vous payons. On ne vous demandera jamais votre RIB sur WhatsApp. Une fois votre dossier accepté, puis quand les fonds sont reçus de la compagnie, on vous demande votre RIB via email ou formulaire sécurisé et on vous vire votre part sous 5 jours ouvrés. On ne vous demande jamais d'argent — ni carte bancaire, ni avance.",
      faq_7_q: "🔄 Mon vol avait une correspondance — je peux réclamer ?",
      faq_7_a: "Oui. C'est le dernier vol (tronçon final) qui détermine le montant : distance totale et retard à l'arrivée finale. Si vous avez raté une correspondance à cause d'un retard du premier vol, vous êtes éligible. Indiquez \"avec correspondance\" dans le diagnostic — on s'occupe du reste.",
      faq_8_q: "✅ Vous prenez tous les dossiers ?",
      faq_8_a: "Non — et c'est ce qui fait notre force. On analyse chaque dossier gratuitement avant de l'accepter. Si vos chances sont faibles, on vous le dit honnêtement plutôt que de vous faire perdre du temps. C'est pour ça que notre taux de réussite est de 9 dossiers sur 10 : on ne s'engage que quand on est confiants de gagner. Et si on ne prend pas votre dossier, on vous explique pourquoi et on vous conseille sur les alternatives.",
      faq_9_q: "↩️ Est-ce que je peux me rétracter ?",
      faq_9_a: "Oui. Vous disposez d'un droit de rétractation de 14 jours à compter de la signature du mandat — sans justification et sans frais. Concrètement : nous commençons à travailler sur votre dossier dès la signature, avec votre accord, pour ne pas perdre de temps. Si vous vous rétractez pendant les 14 jours, vous ne payez rien — le travail déjà effectué est à notre charge. Si votre dossier aboutit avant la fin des 14 jours (c'est rare mais possible), et que vous n'avez pas exercé votre rétractation, la commission s'applique normalement. C'est un droit légal (art. L221-18 du Code de la consommation). Un simple message WhatsApp ou email à expert@robindesairs.eu suffit.",
      founder_story_short: "Vingt ans dans le secteur aérien. J'ai vu les mêmes excuses revenir à chaque vol retardé : \"météo imprévisible\", \"circonstances extraordinaires\". J'ai vu des familles entières repartir sans rien après 6 heures d'attente — pour un baptême, des funérailles, des retrouvailles.<br><br>Robin des Airs, c'est l'inverse. Un dossier technique que la compagnie ne peut pas ignorer. Un suivi en français, en wolof, en bambara. On ne prend notre part (25%) qu'une fois votre argent récupéré — vous le savez avant même de signer.",
      founder_quote: "\"Ils vous facturent le kilo en trop. Le deuxième bagage. Le siège côté hublot. Mais quand c'est leur tour de payer — retard, annulation, surbooking — il n'y a plus personne au bout du fil.\"",
      founder_p1: "Vingt ans dans le secteur aérien. <strong style=\"color:white;\">J'ai vu fonctionner la machine de l'intérieur.</strong> Les scripts téléphoniques conçus pour décourager. Les formulaires pensés pour que vous abandonniez. Le mot \"circonstances extraordinaires\" sorti comme un joker dès qu'il faut ouvrir le portefeuille.",
      founder_p2: "J'ai vu des familles entières se faire taxer à l'embarquement pour un kilo de trop — puis repartir sans rien quand leur avion avait <strong style=\"color:white;\">5 heures de retard</strong>. J'ai vu trop de voyageurs baisser les bras face au jargon juridique et aux réponses automatiques.",
      founder_p3: "Nos communautés font des voyages plus longs, en famille, souvent pour des moments qui comptent — un baptême, des funérailles, des retrouvailles. Il y a moins l'habitude de réclamer. Moins de temps à perdre avec des formulaires en anglais. <strong style=\"color:white;\">Et c'est exactement là-dessus que les compagnies comptent.</strong>",
      founder_p4: "Robin des Airs, c'est l'inverse. On gère votre dossier en français, wolof, bambara, lingala, twi, yoruba et autres langues — <strong style=\"color:white;\">parce qu'on se comprend mieux quand on parle la même langue.</strong> On monte un dossier technique que la compagnie ne peut pas ignorer. Et on prend 25%, pas un euro de plus, même si ça va au tribunal. Pas de volume maximum. Pas de frais cachés. Une famille contente et une recommandation à ses proches — c'est ça notre modèle.",
      founder_years: "Années dans le secteur",
      founder_won: "Dossiers remportés",
      founder_lost: "Si on perd",
      founder_stats_line: "20 années dans le secteur · 9/10 dossiers remportés · Sinon vous ne payez rien",
      founder_conviction: "Robin des Airs est né d'une conviction simple : <strong style=\"color:var(--neon-b);\">si une compagnie perçoit chaque euro avec une précision redoutable, nos familles méritent exactement le même traitement.</strong>",
      founder_signature: "— Le fondateur · 20 ans dans le secteur aérien · Spécialiste CE 261/2004",
      founder_cta: "CONFIER MON DOSSIER À ROBIN",
      founder_note: "Notre part (25%) une fois l'argent récupéré · Si on ne gagne pas, vous ne payez rien · Réponse en moins de 2h · Droit de rétractation 14 jours",
      wa_float_text: "WhatsApp Robin",
      wa_float_aria: "Vérifier mon éligibilité sur WhatsApp — Robin des Airs"
    },
    en: {
      page_title: "Robin des Airs — Flight compensation up to €600 | Premium",
      meta_description: "Delayed or cancelled flight? Up to €600 per passenger (EU 261). We only take our share (25%) once your money is recovered — otherwise you pay nothing. Reply within 24h.",
      skip_link: "Skip to main content",
      diaspora_bar_pays: "SENEGAL · MALI · IVORY COAST · GUINEA · CAMEROON · DRC · BENIN · TOGO · GHANA · NIGERIA",
      diaspora_bar_text: "Delayed flight? Up to €600 if EU Regulation 261 applies to your flight — any nationality.",
      diaspora_bar_text_mobile: "Delayed? Up to €600 (EU 261).",
      wa_eligibility_prefill: "Hi Robin! I want to check if my flight is eligible.\nFlight number:\nDate:",
      hero_wa_note: "Reply in French, Wolof or English — whatever you prefer.",
      hero_title: "Robin takes from\nairlines,\n",
      hero_title_neon: "gives back to our families.",
      hero_diaspora_why: "We know your routes, we speak your language — we recover the €600 for our communities and our families.",
      hero_desc: "Flight delayed +3h, cancelled or overbooked?\nThe law requires the airline to pay you up to <strong>€600 per passenger</strong>.\nWe only take our share (25%) once your money has been recovered.\n<strong>If we don't win, you pay nothing.</strong>",
      hero_btn_calc: "Or calculate the exact amount (2 min) →",
      hero_btn_wa: "📱 Check my eligibility on WhatsApp",
      wa_qr_hint: "No WhatsApp on this device? Scan the QR →",
      wa_qr_title: "Continue on WhatsApp",
      wa_qr_desc: "Scan this QR code with your phone to open WhatsApp.",
      wa_qr_open: "Open WhatsApp →",
      wa_qr_note: "If nothing opens on your computer, it’s normal: scan the QR and continue on mobile.",
      hero_moins_cher: "Our share (25%) once money is recovered · If we don't win, you pay nothing · Reply within 24h",
      hero_lang_line: "Service available in: French, English, Wolof, Bambara, Soninké, Peul (Pulaar), Dioula, Swahili, Lingala, Twi, Yoruba.",
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
      nav_drawer_dest: "✈️ Guides & destinations (blog)",
      nav_drawer_blog: "📝 Blog",
      nav_drawer_depot: "📤 Submit my case",
      calc_tag: "How much can you get? · Robin des Airs",
      calc_title: "Check in 2 min\nif you're eligible",
      calc_title_1: "Check in 2 min",
      funnel_subtitle: "if you're eligible",
      funnel_step_short: "2 questions",
      calc_disclaimer: "Our share (25%) once money is recovered · If we don't win, you pay nothing · Reply within 24h",
      step1_eyebrow: "What happened",
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
      section_loi_prescription: "Was your flight 1 year ago, 2 years ago, even 4 years ago? Under French law, you have 5 years to claim. That 2021 flight that was 5 hours late? The money is still there.",
      section_how_tag: "The Robin method",
      section_how_title: "4 steps.\nOne goal.",
      section_faq_tag: "Frequently asked questions",
      section_faq_title: "Everything you\nwant to know.",
      cta_final_tag: "Take action now",
      cta_final_title: "Your money\nis waiting.",
      cta_btn_calc: "Calculate my compensation →",
      cta_wa: "WhatsApp",
      cta_depot: "Submit my case →",
      cta_or: "Or ",
      link_depot_online: "online form",
      cta_recall: "Up to €600 · Our share (25%) after recovery · Otherwise you pay nothing",
      loi_intro: "EU <strong style=\"color:var(--navy);\">Regulation (EC) No 261/2004</strong> protects passengers on journeys between Europe and Africa. Depending on direction — <strong style=\"color:var(--navy);\">Europe → Africa</strong> or <strong style=\"color:var(--navy);\">Africa → Europe</strong> — the rules differ:",
      loi_you_depart_eu_title: "🛫 EUROPE → AFRICA",
      loi_you_depart_eu_p: "Your flight departs from <strong>Europe</strong> (European Union) to <strong>Africa</strong> or elsewhere. For cancellation or denied boarding, CE 261 also provides for fixed compensation when the conditions are met. Regardless of your nationality — any carrier, European or not, must pay if the flight leaves from the EU.",
      loi_delay_arrival_note: "For <strong>delays</strong>, when CE 261 applies to your journey: you need at least <strong>3 hours late at arrival at final destination</strong>, not delay at departure alone, to qualify for compensation.",
      loi_you_depart_africa_title: "🛬 AFRICA → EUROPE",
      loi_you_depart_africa_p1: "Your flight departs from <strong>Africa</strong> to <strong>Europe</strong> / the EU: the rule changes — only European airlines are required to pay.",
      loi_you_depart_africa_p2: "→ Air France, Corsair, Brussels Airlines, KLM, Transavia, Lufthansa, Iberia, TAP, ITA Airways and other European carriers: <strong style=\"color:var(--navy);\">yes</strong>, they are European.<br>→ Royal Air Maroc, Air Sénégal, Ethiopian Airlines: <strong style=\"color:var(--navy);\">no</strong> on those flights — they are not European.",
      loi_contact_wa: "Not sure about your case? <a href=\"https://wa.me/15557840392\" target=\"_blank\" style=\"color:var(--neon-dark);text-decoration:underline;font-weight:800;\">Send us your flight on WhatsApp</a>, we'll check for free within the day.",
      loi_80percent: "<strong style=\"color:var(--navy);\">80% of eligible passengers never claim.</strong> Not because they're not entitled — because airlines count on them giving up. And you have <strong style=\"color:var(--navy);\">5 years</strong> to claim: that 2021 flight that was delayed? The money is still there.",
      loi_closing: "Not sure? <a href=\"https://wa.me/15557840392\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--neon-dark);text-decoration:underline;font-weight:800;\">Send us your flight on WhatsApp</a> — free check within the day. <strong style=\"color:var(--navy);\">80% of eligible passengers never claim</strong> — airlines count on people giving up. You have <strong style=\"color:var(--navy);\">5 years</strong> to claim — that delayed flight in 2021? The money may still be owed.",
      loi_card_long: "Our communities · Our families",
      loi_per_pax: "per passenger",
      loi_distance_long: "Over 3,500 km — our core focus · compensation per passenger",
      loi_net_450: "→ €450 net per passenger (on €600)",
      loi_tiers_note: "EU law also provides €250 or €400 for shorter distances — after we review your flight, we’ll tell you exactly which amount applies.",
      cta_recover: "Get my money back →",
      dest_tag: "Europe ↔ Africa routes",
      dest_title: "Top destinations · <span class=\"neon\">€600 compensation</span>",
      dest_desc: "Delayed or cancelled flight on a Europe → Africa or Africa → Europe route to one of these cities? You may be eligible for the maximum tier (€600) when distance and conditions qualify.",
      dest_card_line: "Route monitored by Robin",
      dest_card_amount: "Standard compensation: €600",
      sp_9sur10: "<strong>9 out of 10</strong> cases won",
      sp_24h: "Reply within <strong>24h</strong>",
      sp_families: "Our families trust us — hundreds of cases settled",
      sp_cta: "My turn →",
      how_step1_title: "You check",
      how_step1_desc: "Enter your flight in the checker. In 60 seconds you know if you're eligible and how much you get net.",
      how_step2_title: "You sign",
      how_step2_desc: "3 minutes on WhatsApp or online. You sign the electronic mandate. That's it — we take over.",
      how_step3_title: "We build your case",
      how_step3_desc: "Within 24h we build a technical file: METAR/TAF and comparison with other flights at the same time — if other aircraft took off, we document it.",
      how_step4_title: "You get paid",
      how_step4_desc: "Robin negotiates to the end: usually the airline pays within 4–12 weeks; otherwise ombudsman then court at our expense. Once funds arrive, we transfer your share — percentages are fixed before you sign (see FAQ).",
      how_step1_time: "⏱ 60 seconds",
      how_step2_time: "⏱ 3 minutes",
      how_step3_time: "⏱ 24 hours",
      cta_3min: "3 minutes and it's done →",
      how_further: "Find out more: <a href=\"/meteo-dossier-indemnite.html\" style=\"color:var(--neon-dark);font-weight:600;\">Weather and claims (TAF, METAR…)</a> · <a href=\"/pourquoi-si-peu-reclament.html\" style=\"color:var(--neon-dark);font-weight:600;\">Why do so few get their compensation?</a>",
      testi_aria_prev: "Previous",
      testi_aria_next: "Next",
      footer_tagline: "Air claim · Diaspora specialist · Fixed price · No win no fee",
      footer_nav: "Navigation",
      footer_legal: "Legal",
      footer_contact: "Contact",
      footer_depot_online: "Online form",
      footer_loi: "EU Regulation 261/2004",
      footer_how: "How it works",
      footer_tarifs: "Our rates",
      footer_histoire: "Our story",
      ready_claim: "Ready to claim?",
      obt_indemnite: "Get my compensation →",
      section_comp_tag: "Full transparency",
      section_comp_title: "Robin vs the others.",
      section_comp_desc: "You know exactly what you will get before you commit. No bad surprises.",
      section_comp_fineprint: "Key point: same fee whether the airline resists or the case goes to court — details in the FAQ.",
      comp_r_method_l: "Method",
      comp_r_method_robin: "WhatsApp, direct updates",
      comp_r_eu_af_l: "Europe ↔ Africa",
      comp_r_eu_af_others: "Often focused on intra-EU flights",
      comp_r_af_eu_l: "Africa → Europe",
      comp_r_af_eu_robin: "EU 261 when the airline is European",
      comp_r_af_eu_others: "Often unclear on claim sites",
      comp_r_lang_l: "Languages spoken",
      comp_r_lang_robin: "French, English, Wolof, Bambara, Lingala, Soninké, Peul/Pulaar, Dioula, Swahili, Twi, Yoruba…",
      comp_r_lang_others: "Often English only",
      section_comp_sources: "Based on publicly available pricing grids from major European flight-claim services, March 2026.",
      comp_h_crit: "Criteria",
      comp_h_robin: "✈ Robin des Airs",
      comp_h_others: "Others",
      comp_r1_l: "Base fee",
      comp_r2_l: "Fee if it goes to court",
      comp_r2_robin: "25% (unchanged)",
      comp_r3_l: "On <strong>€600</strong> compensation — you receive (net)",
      comp_r4_l: "On <strong>€600</strong> — you receive (if court)",
      comp_r5_l: "On <strong>€2,400</strong> family (if court)",
      comp_r6_l: "Diaspora Africa long-haul specialist",
      comp_r7_l: "French, English, Wolof, Bambara, Lingala, Soninké, Peul/Pulaar, Dioula, Swahili, Twi, Yoruba…",
      comp_r8_l: "Real-time WhatsApp tracking",
      comp_r9_l: "If we don’t win",
      comp_yes_core: "Our core business",
      comp_others_wa: "Email or chatbot",
      section_testi_tag: "They got their money back",
      section_testi_title: "Real passengers.\nReal money recovered.",
      testi_quote_1: "Six months going round in circles with Air France. I'd lost hope. Three of us on the booking. Sorted in five weeks, no more hassle. Honestly I'd recommend them to anyone 👏",
      testi_quote_2: "Our Brussels–Abidjan flight got cancelled. We were all over the place. Robin got us out of it, and we only paid once the money was there. At 35% elsewhere we'd have kept less, no question.",
      testi_quote_3: "4h delay on Corsair to Pointe-à-Pitre. In 2 minutes the case was submitted. WhatsApp is so handy, you always know where you stand",
      testi_quote_4: "Air France kept pushing a €300 voucher. Robin said don't sign. I waited. The payout was way better than their offer. Best call I made 💶",
      testi_quote_5: "Tunis–Paris flight delayed 5h, they said weather. Robin proved other planes had landed the same day. They couldn't refuse",
      testi_quote_6: "Overbooking in Douala, the gate shut in our faces. Brutal day. Robin straightened it out for my son and me, we could finally move on. Thank you!",
      testi_quote_7: "I had already claimed myself and they refused. I thought it was over. Robin took over the case and won. Respect 🙌",
      testi_quote_8: "Four of us, Brussels–Kinshasa, flight cancelled. The airline had us on hold for weeks. Robin handled everything for the family, no drama. Huge relief.",
      testi_quote_9: "Honestly I had doubts at first about the fixed fee. In the end it's the best option. Transparent from A to Z and regular updates on WhatsApp",
      testi_info_1: "CDG → DKR · Family (3) · 6h delay",
      testi_info_2: "BRU → ABJ · Couple · Cancellation",
      testi_info_3: "ORY → PTP · DS891 · 4h delay",
      testi_info_4: "CDG → BKO · Solo · Cancellation",
      testi_info_5: "TUN → ORY · TU700 · 5h delay",
      testi_info_6: "CDG → DLA · Mother + child · Overbooking",
      testi_info_7: "ACC → CDG · AF · 4h30 delay",
      testi_info_8: "BRU → FIH · Family (4) · Cancellation",
      testi_info_9: "DKR → CDG · SS892 · 3h30 delay",
      testi_translated_from: "Translated from French to English",
      trust_tag: "Why trust us",
      trust_title: "Proof.<br><span class=\"neon\">Not promises.</span>",
      trust_1_t: "20 years in aviation",
      trust_1_d: "A founder who knows the scripts, the excuses, and the process.",
      trust_2_t: "25% no matter what",
      trust_2_d: "Even if it goes to the ombudsman or court: no surprises, no increase.",
      trust_3_t: "No fee if we lose",
      trust_3_d: "We take the risk. If we recover nothing, you pay nothing.",
      trust_4_t: "WhatsApp + email updates",
      trust_4_d: "You’re informed at every step. No need to call.",
      blog_feat_tag: "Resources",
      blog_feat_title: "3 articles to<br><span class=\"neon\">understand</span> in 5 minutes",
      blog_feat_1_t: "Delayed Paris–Dakar flight: how to recover €600",
      blog_feat_1_d: "Concrete examples, families, and what airlines try to make you believe.",
      blog_feat_2_t: "Vouchers: why it’s often a trap",
      blog_feat_2_d: "When to refuse, what to reply, and how to secure a cash payout.",
      blog_feat_3_t: "Time limit: you have 5 years to claim (France)",
      blog_feat_3_d: "A 2021/2022 flight? You can still recover your compensation.",
      blog_feat_read: "Read →",
      blog_feat_more_prefix: "More guides & destinations:",
      blog_feat_more_link: "see here",
      section_founder_tag: "The founder",
      section_founder_title: "20 years behind the scenes.<br><span style=\"color:var(--neon-b);\">I've seen what they hide.</span>",
      cta_final_note: "Every month without claiming is money left on the table. The limitation period is 5 years — but it doesn't last forever.",
      funnel_step_label: "Step 1 of 5",
      funnel_wa_shortcut_text: "On WhatsApp: flight number + date — we check your eligibility (reply within 24h).",
      funnel_wa_shortcut_btn: "💬 Check my eligibility via WhatsApp",
      funnel_detail_link: "Or calculate the exact amount (2 min) → detailed check",
      short_q_vol: "What is your flight?",
      short_hint_vol: "Flight number + date, e.g. \"Paris-Dakar 15/01, delayed\"",
      short_placeholder_vol: "E.g: AF718 15/01, delayed",
      short_q_phone: "Your WhatsApp number",
      short_hint_phone: "So we can get back to you and tell you if you're eligible.",
      short_placeholder_phone: "E.g: +33 6 12 34 56 78",
      short_done_title: "Thank you!",
      short_done_hint: "Open WhatsApp: we include your flight and number — add the date if needed. Reply within 24h.",
      short_done_wa_btn: "📱 Check my eligibility on WhatsApp",
      btn_suivant: "Next →",
      btn_envoyer: "Send →",
      btn_retour: "← Back",
      faq_1_q: "💰 How much do I get in my account?",
      faq_1_a: "<p style=\"margin-bottom:14px;\"><strong>Success fee: 25% commission</strong>, payable only if we recover compensation for you — otherwise you pay nothing. You receive <strong>75% net</strong> of the amount collected.</p><p style=\"margin-bottom:14px;font-size:13px;color:var(--gray);line-height:1.8;\"><strong>Our priority: long-haul flights (&gt; 3,500 km).</strong> €600 compensation → you get <strong>€450</strong> net.</p><p style=\"margin-bottom:10px;font-size:13px;\">Family of 4 on Paris–Dakar? 4 × €600 = €2,400 gross → <strong>€1,800 net</strong> for you. This commission never changes, even if your case goes to court.</p><p style=\"margin-bottom:0;font-size:12px;color:var(--gray);line-height:1.7;\">Note: short haul (&lt; 1,500 km) → €250 → <strong>€188</strong> net. Medium (1,500–3,500 km) → €400 → <strong>€300</strong> net.</p>",
      faq_2_q: "⏱️ How long until I receive my compensation?",
      faq_2_a: "<p>It depends on how responsive the airline is. Three possible scenarios:</p><p><strong>The airline cooperates (60% of cases)</strong> — after receiving our technical file (proof of delay, official weather reports, legal analysis), the airline recognises your right and pays. Timeline: 4 to 12 weeks. This is the most common outcome.</p><p><strong>The airline resists (30% of cases)</strong> — it invokes \"extraordinary circumstances\". We counter with our weather evidence and air traffic data. We refer your case to the Tourism and Travel Ombudsman. Recommendation within 90 days. In most cases the airline follows and pays. Total: 3 to 5 months.</p><p><strong>The airline persists (under 10%)</strong> — we take the case to court at our expense and risk. Total: 5 to 8 months.</p><p>In all cases our commission stays 25%. If we recover nothing, you pay nothing. We keep you updated via WhatsApp.</p>",
      faq_3_q: "⚠️ The airline offered me a voucher — do I accept?",
      faq_3_a: "No. The voucher goes back to the airline if you don't use it — and it often has an expiry date. Its value is almost always less than the €600 cash you're entitled to. Don't sign anything and contact us first. Cash doesn't expire.",
      faq_4_q: "🌩️ The airline says weather or \"extraordinary circumstances\"...",
      faq_4_a: "That's their favourite excuse. Our file includes official aviation weather reports (METAR, TAF) for departure and arrival airports. We compare with all flights that took off in the same time window. If other planes could fly that day — and they often did — we have the proof. <a href=\"/meteo-dossier-indemnite.html\">Learn more: Weather and claims (TAF, METAR…)</a>",
      faq_5_q: "❌ I claimed myself and the airline refused. Can you step in?",
      faq_5_a: "Yes. An initial refusal is never final — it's often the start of negotiation. 80% of eligible passengers give up after that first refusal, and that's exactly what the airline hopes. We take over the case, add our technical evidence, and resubmit with an argument the airline can't ignore. If they persist, we go to the ombudsman then to court. Fees are included in our commission: you pay nothing extra.",
      faq_6_q: "💳 How do I get paid?",
      faq_6_a: "We pay you. We will never ask for your bank details on WhatsApp. Once your case is accepted, and when funds are received from the airline, we request your bank details via email or a secure form and transfer your share within 5 working days. We never ask you for money — no card, no advance.",
      faq_7_q: "🔄 My flight had a connection — can I still claim?",
      faq_7_a: "Yes. It's the last flight (final leg) that sets the amount: total distance and delay at final arrival. If you missed a connection because of a delay on your first flight, you're eligible. Select \"with connection\" in the checker — we handle the rest.",
      faq_8_q: "✅ Do you take every case?",
      faq_8_a: "No — and that's our strength. We review every case for free before accepting it. If your chances are low, we tell you honestly rather than waste your time. That's why our success rate is 9 out of 10: we only take on cases we're confident we can win. If we don't take your case, we explain why and advise you on alternatives.",
      faq_9_q: "↩️ Can I withdraw?",
      faq_9_a: "Yes. You have a 14-day right of withdrawal from signing the mandate — no reason and no fee. In practice, we start working on your case right after signature (with your agreement) so we don’t lose time. If you withdraw within 14 days, you pay nothing — any work already done is on us. If your case succeeds before the 14 days end (rare but possible) and you haven’t withdrawn, the commission applies normally. This is a legal right (French Consumer Code, art. L221-18). A simple WhatsApp message or an email to expert@robindesairs.eu is enough.",
      founder_story_short: "Twenty years in aviation. I've heard the same excuses on every delayed flight: \"unpredictable weather\", \"extraordinary circumstances\". I've seen whole families leave with nothing after six hours of waiting — for a baptism, a funeral, a reunion.<br><br>Robin des Airs is the opposite. A technical file the airline can't ignore. Support in French, Wolof, Bambara. We only take our share (25%) once your money has been recovered — you know that before you sign.",
      founder_quote: "\"They charge you for the extra kilo. The second bag. The window seat. But when it's their turn to pay — delay, cancellation, overbooking — there's nobody on the line.\"",
      founder_p1: "Twenty years in the aviation sector. <strong style=\"color:white;\">I've seen how the machine works from the inside.</strong> Phone scripts designed to put you off. Forms designed to make you give up. The words \"extraordinary circumstances\" pulled out like a joker whenever the wallet has to open.",
      founder_p2: "I've seen whole families charged at boarding for one extra kilo — then leave with nothing when their plane was <strong style=\"color:white;\">5 hours late</strong>. I've seen too many travellers give up in the face of legal jargon and automated replies.",
      founder_p3: "Our communities travel further, as families, often for moments that matter — a baptism, a funeral, a reunion. There's less habit of claiming. Less time to waste on forms in English. <strong style=\"color:white;\">And that's exactly what the airlines count on.</strong>",
      founder_p4: "Robin des Airs is the opposite. We handle your case in French, Wolof, Bambara, Lingala, Twi, Yoruba and other languages — <strong style=\"color:white;\">because we understand each other better when we speak the same language.</strong> We build a technical case the airline can't ignore. We take 25%, not a euro more, even if it goes to court. No maximum volume. No hidden fees. A happy family and a recommendation to their loved ones — that's our model.",
      founder_years: "Years in the sector",
      founder_won: "Cases won",
      founder_lost: "If we lose",
      founder_stats_line: "20 years in the sector · 9/10 cases won · Otherwise you pay nothing",
      founder_conviction: "Robin des Airs was born from one simple belief: <strong style=\"color:var(--neon-b);\">if an airline collects every euro with ruthless precision, our families deserve exactly the same treatment.</strong>",
      founder_signature: "— The founder · 20 years in aviation · EU Regulation 261/2004 specialist",
      founder_cta: "TRUST ROBIN WITH MY CASE",
      founder_note: "Our share (25%) once money is recovered · If we don't win, you pay nothing · Reply within 2h · 14-day right of withdrawal",
      wa_float_text: "WhatsApp Robin",
      wa_float_aria: "Check my eligibility on WhatsApp — Robin des Airs"
    }
  };

  function get(key) {
    var lang = (currentLang === 'en' ? 'en' : 'fr');
    return (T[lang] && T[lang][key]) || T.fr[key] || key;
  }

  function apply() {
    document.documentElement.lang = currentLang === 'en' ? 'en' : 'fr';
    var title = get('page_title');
    if (title) document.title = title;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && get('meta_description')) metaDesc.setAttribute('content', get('meta_description'));
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
    var waNum = '15557840392';
    if (typeof window !== 'undefined' && window.WHATSAPP_NUMBER) {
      waNum = String(window.WHATSAPP_NUMBER).replace(/\D/g, '') || waNum;
    }
    var waEligUrl = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(get('wa_eligibility_prefill'));
    var heroWa = document.getElementById('hero-wa-link');
    if (heroWa) heroWa.href = waEligUrl;
    if (waFloat) {
      waFloat.setAttribute('aria-label', get('wa_float_aria'));
      waFloat.href = waEligUrl;
    }
    var funnelWaEl = document.getElementById('funnel-wa-eligibility-link');
    if (funnelWaEl) funnelWaEl.href = waEligUrl;
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
    var topDestEl = document.getElementById('top-destinations');
    if (topDestEl) {
      topDestEl.querySelectorAll('.dest-card').forEach(function(card) {
        var line = card.querySelector('.dest-card-line');
        var amount = card.querySelector('.dest-card-amount');
        if (line) line.textContent = get('dest_card_line');
        if (amount) amount.textContent = get('dest_card_amount');
      });
    }
    var howTitles = document.querySelectorAll('#comment-ca-marche .step-title');
    var howDescs = document.querySelectorAll('#comment-ca-marche .step-desc');
    var howTimes = document.querySelectorAll('#comment-ca-marche .step-time');
    if (howTitles.length >= 4) { howTitles[0].textContent = get('how_step1_title'); howTitles[1].textContent = get('how_step2_title'); howTitles[2].textContent = get('how_step3_title'); howTitles[3].textContent = get('how_step4_title'); }
    if (howDescs.length >= 4) { howDescs[0].textContent = get('how_step1_desc'); howDescs[1].textContent = get('how_step2_desc'); howDescs[2].textContent = get('how_step3_desc'); howDescs[3].innerHTML = get('how_step4_desc'); }
    if (howTimes.length >= 3) { howTimes[0].textContent = get('how_step1_time'); howTimes[1].textContent = get('how_step2_time'); howTimes[2].textContent = get('how_step3_time'); }
    var testiArrows = document.querySelectorAll('.testi-arrow');
    if (testiArrows.length >= 2) { testiArrows[0].setAttribute('aria-label', get('testi_aria_prev')); testiArrows[1].setAttribute('aria-label', get('testi_aria_next')); }
    var testiTranslatedNote = document.getElementById('testi-translated-note');
    if (testiTranslatedNote) testiTranslatedNote.style.display = (currentLang === 'en' && get('testi_translated_from')) ? 'block' : 'none';
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

/**
 * CRM UI strings FR/EN — vacataires / équipe anglophone.
 * Clé localStorage : rda_crm_ui_lang = 'fr' | 'en'
 */
(function () {
  'use strict';

  window.CRM_UI_LANG_KEY = 'rda_crm_ui_lang';

  var SL_FR = {
    BROUILLON: 'Brouillon',
    ELIGIBLE: 'Éligible',
    MANDAT_SIGNE: 'Mandat signé',
    LRAR_ENVOYEE: 'LRAR envoyée',
    RELANCE_1: 'Relance 1',
    RELANCE_2: 'Relance 2',
    MEDIATION: 'Médiation',
    CONTENTIEUX: 'Contentieux',
    PAYE: 'Payé',
    REFUSE_DEFINITIF: 'Refusé définitif',
    ABANDON: 'Abandonné',
    PRESCRIT: 'Prescrit'
  };
  var SL_EN = {
    BROUILLON: 'Draft',
    ELIGIBLE: 'Eligible',
    MANDAT_SIGNE: 'Mandate signed',
    LRAR_ENVOYEE: 'LRAR sent',
    RELANCE_1: '1st reminder',
    RELANCE_2: '2nd reminder',
    MEDIATION: 'Mediation',
    CONTENTIEUX: 'Litigation',
    PAYE: 'Paid',
    REFUSE_DEFINITIF: 'Finally refused',
    ABANDON: 'Abandoned',
    PRESCRIT: 'Time-barred'
  };

  var PC_FR = {
    EMBARQUEMENT: 'Carte embarquement / billet',
    IDENTITE: 'CNI / passeport',
    MANDAT: 'Mandat signé',
    RIB: 'RIB',
    LRAR_PREUVE: 'Preuve envoi LRAR / AR',
    ECHANGE_COMPAGNIE: 'Échanges compagnie',
    AUTRE: 'Autre'
  };
  var PC_EN = {
    EMBARQUEMENT: 'Boarding pass / ticket',
    IDENTITE: 'ID / passport',
    MANDAT: 'Signed mandate',
    RIB: 'Bank details (IBAN)',
    LRAR_PREUVE: 'LRAR proof / AR',
    ECHANGE_COMPAGNIE: 'Airline correspondence',
    AUTRE: 'Other'
  };

  var SRC_FR = {
    autre: 'Autre',
    tiktok_ad: 'TikTok Ads',
    fb_reels: 'Facebook / Reels',
    instagram: 'Instagram',
    youtube: 'YouTube',
    whatsapp: 'WhatsApp direct',
    referral: 'Parrainage',
    organic_site: 'Site organique',
    blog: 'Blog Robin des Airs'
  };
  var SRC_EN = {
    autre: 'Other',
    tiktok_ad: 'TikTok Ads',
    fb_reels: 'Facebook / Reels',
    instagram: 'Instagram',
    youtube: 'YouTube',
    whatsapp: 'Direct WhatsApp',
    referral: 'Referral',
    organic_site: 'Organic website',
    blog: 'Robin des Airs blog'
  };

  function joinLines(arr) {
    return arr.filter(Boolean).join('\n');
  }

  function waFr(c) {
    var p = c.prenom;
    var vol = c.vol;
    var d = c.d;
    var fmt = c.fmt;
    var rel1 = c.rel1;
    var rel2 = c.rel2;
    var med = c.med;
    return {
      BROUILLON: joinLines([
        'Bonjour' + (p ? ' ' + p : '') + ',',
        'Votre dossier ' + d.id + ' (' + vol + ') est en préparation côté Robin des Airs.',
        'Nous revenons vers vous pour finaliser les prochaines étapes.'
      ]),
      ELIGIBLE: joinLines([
        'Bonjour ' + p + ',',
        'Bonne nouvelle : votre situation sur ' + vol + ' entre dans le cadre d’une réclamation CE 261.',
        'Prochaine étape : vous recevrez le mandat à signer (YouSign).',
        'Des questions ? Répondez à ce message.'
      ]),
      MANDAT_SIGNE: joinLines([
        'Bonjour ' + p + ',',
        'Merci, votre mandat est bien signé.',
        'Nous préparons la mise en demeure (LRAR) adressée à la compagnie.',
        'Nous vous tiendrons informé(e) dès l’envoi.'
      ]),
      LRAR_ENVOYEE: joinLines([
        'Bonjour ' + p + ',',
        'La mise en demeure (LRAR) pour ' + vol + ' a été envoyée à la compagnie.',
        '',
        'Délais indicatifs (depuis réception de la LRAR par la compagnie' +
          (d.lrar ? ', réf. accusé ' + d.lrar : '') +
          ') :',
        '• 1re relance : J+15 → ' + fmt(rel1),
        '• 2e relance : J+30 → ' + fmt(rel2),
        '• Saisine médiateur : J+62 → ' + fmt(med),
        '',
        'En cas de silence d’environ un mois sans réponse exploitable, nous enchaînons selon ce calendrier.',
        'Robin des Airs'
      ]),
      RELANCE_1: joinLines([
        'Bonjour ' + p + ',',
        'Nous avons effectué la 1re relance auprès de la compagnie concernant ' +
          vol +
          ' (après la mise en demeure).',
        '',
        'Prochaine étape si silence : 2e relance à J+30 après réception LRAR → ' + fmt(rel2) + '.',
        'Puis, si nécessaire : médiation (saisine vers J+62) → ' + fmt(med) + '.',
        '',
        'Nous restons sur le dossier et vous tenons informé(e).',
        'Robin des Airs'
      ]),
      RELANCE_2: joinLines([
        'Bonjour ' + p + ',',
        'La 2e relance vient d’être envoyée pour ' +
          vol +
          '. Dernière relance amiable avant les étapes formalisées.',
        '',
        'Si la compagnie ne réagit toujours pas, nous préparerons la saisine du médiateur de la consommation vers J+62 après la LRAR → ' +
          fmt(med) +
          ' (date indicative).',
        '',
        'Merci pour votre confiance.',
        'Robin des Airs'
      ]),
      MEDIATION: joinLines([
        'Bonjour ' + p + ',',
        'Votre dossier ' +
          vol +
          ' est porté devant le médiateur de la consommation (saisine visée à J+62 après mise en demeure / LRAR ; date indicative : ' +
          fmt(med) +
          ').',
        '',
        'Nous vous informerons de chaque retour (proposition, accord, ou suite éventuelle vers le contentieux).',
        '',
        'Robin des Airs'
      ]),
      CONTENTIEUX: joinLines([
        'Bonjour ' + p + ',',
        'Sans solution amiable ou après la médiation, nous engageons la phase contentieuse pour ' + vol + '.',
        '',
        'Nous vous expliquons la suite (instance, délais, pièces). Dites-nous si vous préférez un appel ou des messages ici.',
        'Robin des Airs'
      ]),
      PAYE: joinLines([
        'Bonjour ' + p + ',',
        'Bonne nouvelle : les fonds ont été reçus pour votre dossier ' + vol + '.',
        'Nous procédons au virement de votre part nette (délai habituel ~5 jours ouvrés après RIB si nécessaire).',
        'Merci pour votre confiance !',
        'Robin des Airs'
      ]),
      REFUSE_DEFINITIF: joinLines([
        'Bonjour ' + p + ',',
        'Nous faisons le point sur ' +
          vol +
          ' : au stade actuel, la compagnie maintient un refus que nous ne pouvons pas dépasser dans ce dossier (ou le cadre légal ne permet pas d’aller plus loin).',
        '',
        'Nous restons disponibles pour toute question.',
        'Robin des Airs'
      ]),
      ABANDON: joinLines([
        'Bonjour ' + p + ',',
        'Comme convenu / faute de suite de votre part, nous clôturons le dossier ' + vol + ' côté Robin des Airs.',
        'Pour une nouvelle démarche, vous pouvez nous réécrire.',
        'Robin des Airs'
      ]),
      PRESCRIT: joinLines([
        'Bonjour ' + p + ',',
        'Concernant ' + vol + ', le dossier est clos pour prescription ou délai légal dépassé.',
        'Nous pouvons détailler par message si besoin.',
        'Robin des Airs'
      ]),
      DEFAULT: joinLines([
        'Bonjour ' + p + ',',
        'Mise à jour dossier ' + d.id + ' (' + vol + ').',
        'Robin des Airs'
      ])
    };
  }

  function waEn(c) {
    var p = c.prenom;
    var vol = c.vol;
    var d = c.d;
    var fmt = c.fmt;
    var rel1 = c.rel1;
    var rel2 = c.rel2;
    var med = c.med;
    return {
      BROUILLON: joinLines([
        'Hello' + (p ? ' ' + p : '') + ',',
        'Your file ' + d.id + ' (' + vol + ') is being prepared by Robin des Airs.',
        'We’ll get back to you shortly for the next steps.'
      ]),
      ELIGIBLE: joinLines([
        'Hello ' + p + ',',
        'Good news: your situation on ' + vol + ' falls under EU261 compensation.',
        'Next step: you’ll receive the mandate to sign (YouSign).',
        'Any questions? Reply to this message.'
      ]),
      MANDAT_SIGNE: joinLines([
        'Hello ' + p + ',',
        'Thank you — your mandate is signed.',
        'We’re preparing the formal notice (LRAR) to the airline.',
        'We’ll keep you posted as soon as it’s sent.'
      ]),
      LRAR_ENVOYEE: joinLines([
        'Hello ' + p + ',',
        'The formal notice (LRAR) for ' + vol + ' has been sent to the airline.',
        '',
        'Indicative timeline (from when the airline receives the LRAR' +
          (d.lrar ? ', ref. receipt ' + d.lrar : '') +
          '):',
        '• 1st reminder: D+15 → ' + fmt(rel1),
        '• 2nd reminder: D+30 → ' + fmt(rel2),
        '• Mediation filing: D+62 → ' + fmt(med),
        '',
        'If there’s no usable response for about a month, we follow this schedule.',
        'Robin des Airs'
      ]),
      RELANCE_1: joinLines([
        'Hello ' + p + ',',
        'We’ve sent the 1st reminder to the airline regarding ' + vol + ' (after the formal notice).',
        '',
        'If still no reply: 2nd reminder at D+30 after LRAR receipt → ' + fmt(rel2) + '.',
        'Then if needed: mediation (filing around D+62) → ' + fmt(med) + '.',
        '',
        'We’re on it and will keep you updated.',
        'Robin des Airs'
      ]),
      RELANCE_2: joinLines([
        'Hello ' + p + ',',
        'The 2nd reminder has just been sent for ' +
          vol +
          '. Last amicable step before formal proceedings.',
        '',
        'If the airline still doesn’t respond, we’ll prepare consumer mediation filing around D+62 after the LRAR → ' +
          fmt(med) +
          ' (indicative).',
        '',
        'Thank you for your trust.',
        'Robin des Airs'
      ]),
      MEDIATION: joinLines([
        'Hello ' + p + ',',
        'Your file ' +
          vol +
          ' is with the consumer mediator (filing targeted at D+62 after formal notice / LRAR; indicative date: ' +
          fmt(med) +
          ').',
        '',
        'We’ll update you on each reply (offer, settlement, or possible litigation).',
        '',
        'Robin des Airs'
      ]),
      CONTENTIEUX: joinLines([
        'Hello ' + p + ',',
        'With no amicable solution or after mediation, we’re moving to litigation for ' + vol + '.',
        '',
        'We’ll explain the next steps (court, timelines, documents). Tell us if you prefer a call or messages here.',
        'Robin des Airs'
      ]),
      PAYE: joinLines([
        'Hello ' + p + ',',
        'Good news: funds have been received for your file ' + vol + '.',
        'We’re processing the transfer of your net share (usually ~5 business days after bank details if needed).',
        'Thank you for your trust!',
        'Robin des Airs'
      ]),
      REFUSE_DEFINITIF: joinLines([
        'Hello ' + p + ',',
        'Update on ' +
          vol +
          ': at this stage the airline’s refusal is final for this file (or the legal framework doesn’t allow us to go further).',
        '',
        'We remain available for any questions.',
        'Robin des Airs'
      ]),
      ABANDON: joinLines([
        'Hello ' + p + ',',
        'As agreed / due to lack of follow-up on your side, we’re closing file ' + vol + ' on our side.',
        'For a new claim, you can write to us again.',
        'Robin des Airs'
      ]),
      PRESCRIT: joinLines([
        'Hello ' + p + ',',
        'Regarding ' + vol + ', the file is closed due to limitation or elapsed legal deadline.',
        'We can explain in more detail by message if needed.',
        'Robin des Airs'
      ]),
      DEFAULT: joinLines([
        'Hello ' + p + ',',
        'Update on file ' + d.id + ' (' + vol + ').',
        'Robin des Airs'
      ])
    };
  }

  function pickWa(lang, statut, ctx) {
    var pack = lang === 'en' ? waEn(ctx) : waFr(ctx);
    return pack[statut] || pack.DEFAULT;
  }

  window.crmPickWaMessage = pickWa;

  var STR_FR = {
    doc_title: 'Robin des Airs — CRM',
    html_lang: 'fr',
    gate_title: 'Accès CRM',
    gate_lead:
      'Espace réservé à l’équipe Robin des Airs. Saisissez le code d’accès. Ensuite, indiquez <strong>votre nom</strong> en haut de page : chaque modification sera tracée (agent + date/heure).',
    gate_code_ph: 'Code d’accès',
    gate_code_lbl: 'Code d’accès',
    gate_submit: 'Entrer',
    gate_wrong_code: 'Code incorrect.',
    toast_file_local:
      'Fichier local : pas de code d’accès (l’API Netlify n’existe pas en file://).',
    toast_local_no_api: 'Local : API CRM indisponible — accès sans code.',
    err_netlify_var: 'Variable CRM_ACCESS_CODE non définie sur Netlify.',
    toast_local_netlify: 'Serveur local sans Netlify : CRM ouvert sans code. Pour l’auth, utilisez « netlify dev ».',
    toast_no_api_response: 'Pas de réponse de l’API — CRM ouvert en local sans code.',
    err_connection: 'Connexion impossible. Ouvrez cette page sur le site en ligne (Netlify) ou via « netlify dev ».',
    brand_sub: "Gestion des dossiers d'indemnisation",
    agent_lbl: 'Votre nom (traçabilité)',
    agent_ph: 'Ex. Marie D. — obligatoire pour modifier',
    btn_export: 'Export CSV',
    btn_export_title: 'Télécharger la liste des dossiers',
    btn_reset: 'Réinit. démo',
    btn_reset_title: 'Effacer la sauvegarde locale et recharger les exemples',
    btn_logout: 'Déconnexion',
    btn_new: '+ Nouveau dossier',
    toolbar_html:
      'Les dossiers sont <strong>sauvegardés dans ce navigateur</strong> (localStorage). Référence au format <strong>RDA-année-XXX-XXX</strong> (2 blocs de 3 caractères, plus facile à lire et à dicter). Recherche : tapez une partie du n° ou du nom. Pas de suite 001, 002… Le <strong>total</strong> n’est pas affiché. Export CSV pour archiver.',
    jalons_aria: 'Prochains jalons',
    search_ph: '🔍  N°, nom, adresse, vol, PNR…',
    fil_all_status: 'Tous les statuts',
    fil_all_tier: 'Tous les paliers',
    th_dossier: 'Dossier',
    th_pax: 'Passager(s)',
    th_vol: 'Vol',
    th_tier: 'Palier',
    th_netcli: 'Net client',
    th_netrobin: 'Net Robin',
    th_mora: 'Indemnité moratoire',
    th_statut: 'Statut',
    th_prio: 'Priorité',
    th_pieces: 'Pièces',
    empty_list: 'Aucun dossier trouvé',
    mora_j16: 'J+16 le {{date}}',
    mora_pill: '{{days}}j · {{total}} €',
    statut_since: 'Statut : {{date}}',
    pay_since: 'Paiement : {{date}}',
    pax_mult: '×{{n}}{{bb}}',
    bb_suffix: ' ({{n}}bb)',
    vols_badge: '×{{n}} vols',
    doc_count_title: 'Pièces jointes',
    per_person: '{{amt}} €/pers',
    metric_open: 'En cours',
    metric_paid: 'Payés',
    metric_rev_cli: 'Reversé clients',
    metric_ca_robin: 'CA Robin des Airs',
    jalon_title_empty: 'Prochains jalons (LRAR)',
    jalon_empty: 'Aucun dossier avec LRAR et statut relances / médiation.',
    jalon_title_list: 'Prochains jalons (à partir de la date LRAR)',
    jalon_rel1: 'Relance 1 (J+15)',
    jalon_rel2: 'Relance 2 (J+30)',
    jalon_med: 'Médiation / saisine (J+62)',
    jalon_med_fu: 'Suivi médiation (réf. J+62)',
    jalon_lrar_meta: '{{id}} — {{name}} · LRAR {{lrar}}',
    jalon_overdue: 'En retard',
    modal_dossier_default: 'Dossier',
    btn_wa_client: 'WhatsApp client',
    btn_pieces_dossier: 'Pièces du dossier',
    btn_modify: 'Modifier',
    btn_close: '✕ Fermer',
    del_modal_title: 'Suppression définitive du dossier',
    del_p1:
      '<strong>Règle sécurité :</strong> un agent ne peut pas supprimer un dossier sans le <strong>code d’autorisation</strong> connu de la direction uniquement.',
    del_p2:
      'Saisissez le code, puis une dernière fenêtre de confirmation s’affichera. Action irréversible, tracée avec votre nom d’agent.',
    del_code_lbl: 'Code d’autorisation',
    del_code_ph: 'Code à 4 chiffres',
    del_validate: 'Valider le code',
    del_cancel: 'Annuler',
    new_title: 'Nouveau dossier',
    sec_passenger: 'Passager principal',
    lbl_firstname: 'Prénom',
    lbl_lastname: 'Nom',
    ph_firstname: 'Aminata',
    ph_lastname: 'DIALLO',
    lbl_phone: 'Téléphone',
    dial_ph_new: '+41, suisse, sénégal…',
    dial_hint_new:
      'Au focus : raccourcis. Dès <strong>2 caractères</strong> : tapez chiffres (+41, 221…) ou le pays — choisissez dans la liste.',
    national_ph: '6 12 34 56 78',
    aria_national: 'Numéro national',
    lbl_email: 'E-mail',
    ph_email: 'email@…',
    lbl_address: 'Adresse postale complète',
    ph_address: 'N°, rue, code postal, ville, pays',
    co_pax_section: 'Autres passagers indemnisés (CE 261)',
    co_pax_hint:
      'Obligatoire dès qu’il y a plusieurs adultes indemnisés : chaque nom doit figurer (mandats, LRAR, contentieux).',
    co_pax_n: 'Passager adulte n°{{n}}',
    co_pax_missing_detail: 'Non renseigné — à compléter (mandat / LRAR).',
    address_missing_detail: 'Adresse manquante — obligatoire pour courrier / LRAR.',
    alert_address_required:
      'L’adresse postale complète est obligatoire (courrier recommandé, LRAR, dossier).',
    alert_co_pax_incomplete:
      'Renseignez le prénom et le nom de chaque autre passager indemnisé (autant que d’adultes − 1).',
    lbl_adults: 'Adultes (indemnisés CE 261)',
    lbl_babies: 'Bébés < 2 ans (non indemnisés)',
    lbl_source: 'Source acquisition',
    sec_flights: 'Vols',
    flights_hint_new:
      'Pour le trajet : indiquez plutôt le <strong>nom de la ville</strong> (Paris, Bruxelles, Abidjan…) si vous ne connaissez pas le code IATA (CDG, BRU…). Les deux sont acceptés.',
    btn_add_vol: '+ Ajouter un vol (correspondance)',
    sec_comp: 'Indemnité',
    lbl_tier: 'Palier CE 261',
    lbl_priority: 'Priorité',
    tier_600: '600 € — vol > 3 500 km',
    tier_400: '400 € — 1 500 à 3 500 km',
    tier_250: '250 € — ≤ 1 500 km',
    prio_STANDARD: 'Standard',
    prio_HAUTE: 'Haute',
    prio_BASSE: 'Basse',
    prio_URGENTE: 'Urgente',
    btn_cancel: 'Annuler',
    btn_create: 'Créer le dossier →',
    vol_main: 'Vol principal',
    vol_conn: 'Vol {{n}} — Correspondance',
    lbl_comp: 'Compagnie',
    ph_comp: 'Air France',
    lbl_flight_no: 'N° vol',
    ph_flight_no: 'AF 719',
    lbl_date: 'Date',
    lbl_dep: 'Départ (ville ou code aéroport)',
    lbl_arr: 'Arrivée (ville ou code aéroport)',
    ph_dep: 'ex. Paris ou CDG',
    ph_arr: 'ex. Dakar ou DSS',
    lbl_pnr: 'PNR',
    ph_pnr: 'AB4XYZ',
    lbl_incident: 'Incident',
    inc_RETARD: 'Retard ≥ 3h',
    inc_ANNULATION: 'Annulation',
    inc_CORR: 'Correspondance manquée',
    inc_REFUS: 'Refus embarquement',
    new_calc_tier: 'Palier CE 261 × {{n}} adulte(s)',
    new_calc_babies: 'Bébés (exclus CE 261)',
    new_calc_comm: 'Commission Robin des Airs (25%)',
    new_calc_net_robin: 'Net Robin des Airs',
    new_calc_net_cli: 'Net client total',
    new_calc_note:
      'Soit {{par}} €/personne · + 40 € frais de recouvrement réclamés à la compagnie',
    confirm_reset:
      'Rétablir les dossiers de démonstration ? Toutes les modifications et la sauvegarde locale seront effacées.',
    toast_export: 'Export CSV téléchargé',
    toast_save_fail: 'Sauvegarde impossible (stockage plein ?)',
    wa_copy_ok: 'Message copié — collez-le dans WhatsApp',
    require_agent: 'Renseignez votre nom dans « Votre nom (traçabilité) » en haut',
    dial_ph_edit: '+41, pays, 221…',
    cc_hint_edit:
      'Indicatif : raccourcis au focus, ou tapez au moins 2 caractères (+32, belgique…).',
    doc_empty_long:
      'Aucune pièce. Ajoutez des fichiers ci-dessous — ils restent dans <strong>ce navigateur</strong> uniquement (pas de serveur). Pour un classeur partagé, branchez un drive ou une base.',
    btn_open: 'Ouvrir',
    doc_ref_only: 'Réf. seule<br>(pas de fichier)',
    btn_remove: 'Retirer',
    size_kb: 'Ko',
    confirm_remove_piece:
      'Retirer du dossier le fichier suivant ?\n\n« {{name}} »\n\nCette action sera enregistrée dans l’historique (traçabilité).',
    toast_piece_removed: 'Pièce retirée',
    alert_pick_file: 'Choisissez un fichier.',
    alert_file_too_big: 'Fichier trop volumineux (max 4 Mo dans ce CRM navigateur).',
    alert_read_fail: 'Lecture du fichier impossible.',
    toast_piece_saved: 'Pièce enregistrée (mémoire navigateur)',
    alert_name_required: 'Prénom et nom obligatoires.',
    alert_name_required_new: 'Prénom et nom obligatoires',
    toast_saved: 'Modifications enregistrées',
    del_code_wrong: 'Code incorrect. Sans le code direction, la suppression est impossible.',
    confirm_delete_final:
      'DERNIÈRE CONFIRMATION\n\nSupprimer définitivement le dossier {{id}} ({{name}}) ?\n\nIrréversible. Traçabilité : {{agent}}.',
    toast_deleted: 'Dossier supprimé (code + double confirmation) — {{id}}',
    toast_status_saved: 'Statut enregistré — copiez le message WhatsApp pour le client',
    gen_letter_alert:
      'Mise en demeure pour {{prenom}} {{nom}}\nAdresse : {{adresse}}\nPassagers indemnisés : {{pax_list}}\nVol {{vol}} — {{dep}}→{{arr}}\n{{adultes}} passager(s) × {{palier}}€ = {{brut}}€ brut\nNet client : {{net}}€ — Net Robin : {{comm}}€\n\n→ Copier dans la mise en demeure Word.',
    evt_dossier_cree: 'Dossier créé — Éligible',
    evt_meta_creation: 'Création dans le CRM',
    agent_unknown: 'Agent non renseigné',
    hist_note: 'Note / événement manuel',
    hist_trace_by: 'Modifié par',
    hist_trace_on: 'Le',
    hist_no_trace: '— (historique non tracé)',
    tab_dossier: 'Dossier',
    tab_calc: 'Calculs',
    tab_hist: 'Historique',
    tab_pieces: 'Pièces',
    tab_edit: 'Modifier',
    tab_upd: 'Mettre à jour',
    sec_main_pax: 'Passager principal',
    lbl_fullname: 'Nom complet',
    lbl_whatsapp: 'WhatsApp',
    wa_contact_client: 'Contacter le client',
    wa_fill_phone: 'Renseigner indicatif + téléphone',
    lbl_adults_detail: 'Adultes (indemnisés)',
    lbl_babies_detail: 'Bébés < 2 ans (non indemnisés)',
    sec_vols: 'Vols ({{n}})',
    vol_block: 'VOL {{i}}{{suffix}}',
    vol_det261: ' — déterminant CE 261',
    lbl_flight: 'Vol',
    lbl_route: 'Trajet (ville ou code)',
    lbl_source_acq: 'Source acquisition',
    lbl_status: 'Statut',
    since_date: 'depuis le {{date}}',
    pay_dot: '· paiement {{date}}',
    sec_attach: 'Pièces jointes ({{n}})',
    attach_hint:
      'Vue synthèse — détail et ajout dans l’onglet <strong>Pièces</strong> ou bouton <strong>Pièces du dossier</strong> en haut.',
    no_pieces_list: 'Aucune pièce répertoriée.',
    calc_tier_row: 'Palier CE 261',
    per_pax_suffix: ' € / passager',
    calc_adults: 'Adultes indemnisés',
    calc_babies_excl: 'Bébés (exclus CE 261)',
    calc_gross: 'Indemnité brute totale',
    calc_comm: 'Commission Robin des Airs (25%)',
    calc_net_robin_b: 'Net Robin des Airs',
    calc_net_client: 'Net client total',
    calc_per_adult: 'Soit {{amt}} € par passager adulte',
    mora_title: 'Indemnité moratoire de retard',
    mora_no_lrar:
      'LRAR non encore envoyée — renseigner la date de réception pour démarrer le compteur.',
    mora_lrar_wait:
      'LRAR reçue le <b>{{lrar}}</b>. Intérêts légaux démarrent le <b>{{j16}}</b> (J+16).',
    mora_fees: 'Frais forfaitaires art. L.441-10 : <b>40 €</b> dus dès maintenant.',
    mora_days: 'Jours depuis J+16 ({{j16}})',
    mora_days_val: '{{n}} jours',
    mora_interest: 'Intérêts légaux (6.65%/an)',
    mora_interest_live: 'calculés en temps réel',
    mora_flat: 'Forfait art. L.441-10',
    mora_total_lbl: 'Total moratoire exigible',
    ev_placeholder: 'Ajouter un événement…',
    btn_add: 'Ajouter',
    pieces_intro:
      '<strong>{{n}}</strong> pièce(s) sur ce dossier. Les fichiers ajoutés ici sont stockés dans la mémoire du navigateur (rechargement = perte si pas d’export futur).',
    piece_add_title: 'Ajouter une pièce',
    piece_doc_type: 'Type de document',
    piece_file_lbl: 'Fichier (PDF, image… max 4 Mo)',
    btn_save_piece: 'Enregistrer la pièce',
    sec_id_contact: 'Identité & contact',
    flights_hint_edit:
      'Pas besoin de maîtriser les codes IATA : saisissez le <strong>nom de la ville</strong> (Paris, Douala…) ou le code aéroport si vous l’avez.',
    vol_edit_suffix: ' — déterminant',
    btn_save_edit: 'Enregistrer les modifications',
    lbl_status_upd: 'Statut',
    lbl_pay_date: 'Date de paiement',
    lbl_status_date:
      'Date du statut actuel (comme la date de paiement pour « Payé »)',
    lbl_lrar_date:
      'Date réception LRAR (mise en demeure — compteur moratoire + jalons J+15 / J+30 / J+62)',
    lbl_priority_upd: 'Priorité',
    wa_box_title: 'Message WhatsApp — modèle pour l’étape sélectionnée',
    wa_textarea_aria: 'Modèle message WhatsApp',
    btn_copy_msg: 'Copier le message',
    btn_refresh: 'Rafraîchir',
    wa_footer_hint:
      'À personnaliser avant envoi. Après « Enregistrer », copiez le message adapté au nouveau statut pour tenir le client informé.',
    btn_save: 'Enregistrer',
    btn_gen_letter: 'Générer mise en demeure ↗',
    danger_zone_title: 'Zone sécurisée — suppression du dossier',
    danger_zone_p:
      '<strong>Un agent ne peut pas supprimer un dossier</strong> sans le code d’autorisation détenu par la direction. Il n’existe aucun bouton « supprimer en un clic » : le code <strong>{{n}} chiffres</strong> est obligatoire, puis une confirmation finale.',
    btn_req_delete: 'Demander la suppression définitive de ce dossier…',
    wa_delay_ok:
      '<strong>Depuis LRAR (accusé) {{lrar}}</strong> — 1re relance J+15 : {{j15}} — 2e relance J+30 : {{j30}} — saisine médiateur J+62 : {{j62}}. Indicatif : ~1 mois sans réponse exploitable de la compagnie → enchaînement des relances puis médiation.',
    wa_delay_missing:
      'Renseignez la <strong>date réception LRAR</strong> pour calculer automatiquement J+15, J+30 et J+62 dans les messages.',
    wa_opening: "Bonjour {{prenom}}, c'est Robin des Airs concernant le dossier {{id}}. ",
    audit_upd_follow: 'Modification suivi dossier (statut / LRAR / priorité)',
    audit_meta_stat: 'Statut : {{a}} → {{b}}',
    audit_meta_prio: 'Priorité : {{a}} → {{b}}',
    audit_meta_lrar: 'Date LRAR : {{a}} → {{b}}',
    audit_meta_dst: 'Date statut : {{a}} → {{b}}',
    audit_meta_pay: 'Date paiement : {{a}} → {{b}}',
    audit_wa_hint: 'Penser à envoyer le message WhatsApp type si besoin',
    audit_no_change: 'Enregistrement (aucun changement détecté sur les champs suivis)',
    audit_piece_add: 'Pièce ajoutée : {{name}}',
    audit_piece_rm: 'Pièce retirée du dossier',
    audit_piece_rm_meta: 'ID pièce : {{id}}',
    audit_edit: 'Fiche client modifiée',
    audit_edit_meta: 'Identité, contact, palier, source ou vol(s) mis à jour',
    placeholder_city_dep: 'Ville ou CDG',
    placeholder_city_arr: 'Ville ou DSS'
  };

  var STR_EN = {};
  Object.keys(STR_FR).forEach(function (k) {
    STR_EN[k] = STR_FR[k];
  });

  Object.assign(STR_EN, {
    doc_title: 'Robin des Airs — CRM',
    html_lang: 'en',
    gate_title: 'CRM access',
    gate_lead:
      'Robin des Airs team only. Enter the access code. Then enter <strong>your name</strong> at the top: every change is logged (agent + date/time).',
    gate_code_ph: 'Access code',
    gate_code_lbl: 'Access code',
    gate_submit: 'Enter',
    gate_wrong_code: 'Incorrect code.',
    toast_file_local: 'Local file: no access code (Netlify API not available on file://).',
    toast_local_no_api: 'Local: CRM API unavailable — opening without code.',
    err_netlify_var: 'CRM_ACCESS_CODE not set on Netlify.',
    toast_local_netlify:
      'Local server without Netlify: CRM open without code. For auth, use « netlify dev ».',
    toast_no_api_response: 'No API response — CRM open locally without code.',
    err_connection: 'Cannot connect. Open this page on the live site (Netlify) or via « netlify dev ».',
    brand_sub: 'Compensation case management',
    agent_lbl: 'Your name (audit trail)',
    agent_ph: 'e.g. John D. — required to make changes',
    btn_export: 'Export CSV',
    btn_export_title: 'Download case list',
    btn_reset: 'Reset demo',
    btn_reset_title: 'Clear local save and reload sample data',
    btn_logout: 'Log out',
    btn_new: '+ New case',
    toolbar_html:
      'Cases are <strong>saved in this browser</strong> (localStorage). Reference format <strong>RDA-YEAR-XXX-XXX</strong> (two blocks of 3 characters, easier to read and dictate). Search: type part of the ref or name. No sequential 001, 002… <strong>Total</strong> count is not shown. Export CSV to archive.',
    jalons_aria: 'Upcoming milestones',
    search_ph: '🔍  Ref., name, address, flight, PNR…',
    fil_all_status: 'All statuses',
    fil_all_tier: 'All tiers',
    th_dossier: 'Case',
    th_pax: 'Passenger(s)',
    th_vol: 'Flight',
    th_tier: 'Tier',
    th_netcli: 'Net client',
    th_netrobin: 'Net Robin',
    th_mora: 'Late-payment indemnity',
    th_statut: 'Status',
    th_prio: 'Priority',
    th_pieces: 'Documents',
    empty_list: 'No cases found',
    mora_j16: 'D+16 on {{date}}',
    mora_pill: '{{days}}d · {{total}} €',
    statut_since: 'Status: {{date}}',
    pay_since: 'Payment: {{date}}',
    metric_open: 'Open',
    metric_paid: 'Paid',
    metric_rev_cli: 'Paid to clients',
    metric_ca_robin: 'Robin des Airs revenue',
    jalon_title_empty: 'Next milestones (LRAR)',
    jalon_empty: 'No case with LRAR and reminder/mediation status.',
    jalon_title_list: 'Next milestones (from LRAR date)',
    jalon_rel1: '1st reminder (D+15)',
    jalon_rel2: '2nd reminder (D+30)',
    jalon_med: 'Mediation / filing (D+62)',
    jalon_med_fu: 'Mediation follow-up (ref. D+62)',
    jalon_lrar_meta: '{{id}} — {{name}} · LRAR {{lrar}}',
    jalon_overdue: 'Overdue',
    modal_dossier_default: 'Case',
    btn_wa_client: 'WhatsApp client',
    btn_pieces_dossier: 'Case documents',
    btn_modify: 'Edit',
    btn_close: '✕ Close',
    del_modal_title: 'Permanently delete case',
    del_p1:
      '<strong>Security rule:</strong> an agent cannot delete a case without the <strong>authorisation code</strong> known to management only.',
    del_p2:
      'Enter the code, then a final confirmation will appear. This cannot be undone and is logged with your agent name.',
    del_code_lbl: 'Authorisation code',
    del_code_ph: '4-digit code',
    del_validate: 'Submit code',
    del_cancel: 'Cancel',
    new_title: 'New case',
    sec_passenger: 'Main passenger',
    lbl_firstname: 'First name',
    lbl_lastname: 'Last name',
    lbl_phone: 'Phone',
    dial_ph_new: '+41, Switzerland, Senegal…',
    dial_hint_new:
      'On focus: shortcuts. From <strong>2 characters</strong>: type digits (+41, 221…) or country — pick from the list.',
    national_ph: '6 12 34 56 78',
    lbl_email: 'E-mail',
    lbl_address: 'Full postal address',
    ph_address: 'Final address (from search above or free text, e.g. abroad)',
    addr_autocomplete_ph: 'Type street, postcode or city — French address suggestions (national BAN)',
    addr_search_hint:
      'Blue field: French national address search. Pick a line to fill the box below; you can still edit (floor, country, etc.).',
    co_pax_section: 'Other compensated passengers (EU261)',
    co_pax_hint:
      'Required when several adults are compensated: every passenger must be named (mandates, formal notices, litigation).',
    co_pax_n: 'Adult passenger no. {{n}}',
    co_pax_missing_detail: 'Not filled in — complete for mandate / formal notice.',
    address_missing_detail: 'Address missing — required for mail / formal notice.',
    alert_address_required: 'Full postal address is required (registered mail, formal notice, file).',
    alert_co_pax_incomplete:
      'Enter first and last name for each other compensated adult (as many as adults minus one).',
    lbl_adults: 'Adults (compensated under EU261)',
    lbl_babies: 'Babies under 2 (not compensated)',
    lbl_source: 'Acquisition source',
    sec_flights: 'Flights',
    flights_hint_new:
      'For the route: prefer the <strong>city name</strong> (Paris, Brussels, Abidjan…) if you don’t know the IATA code (CDG, BRU…). Both are accepted.',
    btn_add_vol: '+ Add flight (connection)',
    sec_comp: 'Compensation',
    lbl_tier: 'EU261 tier',
    lbl_priority: 'Priority',
    tier_600: '600 € — flight > 3,500 km',
    tier_400: '400 € — 1,500 to 3,500 km',
    tier_250: '250 € — ≤ 1,500 km',
    prio_HAUTE: 'High',
    prio_BASSE: 'Low',
    prio_URGENTE: 'Urgent',
    btn_cancel: 'Cancel',
    btn_create: 'Create case →',
    vol_main: 'Main flight',
    vol_conn: 'Flight {{n}} — Connection',
    lbl_comp: 'Airline',
    lbl_flight_no: 'Flight no.',
    lbl_dep: 'Departure (city or airport code)',
    lbl_arr: 'Arrival (city or airport code)',
    ph_dep: 'e.g. Paris or CDG',
    ph_arr: 'e.g. Dakar or DSS',
    lbl_incident: 'Incident',
    inc_RETARD: 'Delay ≥ 3h',
    inc_ANNULATION: 'Cancellation',
    inc_CORR: 'Missed connection',
    inc_REFUS: 'Denied boarding',
    new_calc_tier: 'EU261 tier × {{n}} adult(s)',
    new_calc_babies: 'Babies (excluded EU261)',
    new_calc_comm: 'Robin des Airs fee (25%)',
    new_calc_net_robin: 'Net Robin des Airs',
    new_calc_net_cli: 'Total net to client',
    new_calc_note:
      'i.e. {{par}} €/person · + €40 recovery costs claimed from the airline',
    confirm_reset:
      'Restore demo cases? All local changes and saved data will be cleared.',
    toast_export: 'CSV export downloaded',
    toast_save_fail: 'Could not save (storage full?)',
    wa_copy_ok: 'Message copied — paste in WhatsApp',
    require_agent: 'Enter your name under « Your name (audit trail) » at the top',
    dial_ph_edit: '+41, country, 221…',
    cc_hint_edit: 'Dial code: shortcuts on focus, or type at least 2 characters (+32, Belgium…).',
    doc_empty_long:
      'No documents yet. Add files below — they stay in <strong>this browser</strong> only (no server). For a shared folder, connect drive or database.',
    btn_open: 'Open',
    doc_ref_only: 'Ref. only<br>(no file)',
    btn_remove: 'Remove',
    size_kb: 'KB',
    confirm_remove_piece:
      'Remove this file from the case?\n\n« {{name}} »\n\nThis will be logged in the history.',
    toast_piece_removed: 'Document removed',
    alert_pick_file: 'Choose a file.',
    alert_file_too_big: 'File too large (max 4 MB in this browser CRM).',
    alert_read_fail: 'Could not read the file.',
    toast_piece_saved: 'Document saved (browser memory)',
    alert_name_required: 'First and last name required.',
    alert_name_required_new: 'First and last name required',
    toast_saved: 'Changes saved',
    del_code_wrong: 'Incorrect code. Without the management code, deletion is not possible.',
    confirm_delete_final:
      'FINAL CONFIRMATION\n\nPermanently delete case {{id}} ({{name}})?\n\nCannot be undone. Audit: {{agent}}.',
    toast_deleted: 'Case deleted (code + double confirmation) — {{id}}',
    toast_status_saved: 'Status saved — copy the WhatsApp message for the client',
    gen_letter_alert:
      'Formal notice for {{prenom}} {{nom}}\nAddress: {{adresse}}\nCompensated passengers: {{pax_list}}\nFlight {{vol}} — {{dep}}→{{arr}}\n{{adultes}} passenger(s) × {{palier}}€ = {{brut}}€ gross\nNet client: {{net}}€ — Net Robin: {{comm}}€\n\n→ Copy into the Word formal notice.',
    evt_dossier_cree: 'Case created — Eligible',
    evt_meta_creation: 'Created in CRM',
    agent_unknown: 'Agent not set',
    hist_note: 'Note / manual event',
    hist_trace_by: 'Modified by',
    hist_trace_on: 'On',
    hist_no_trace: '— (history not tracked)',
    tab_dossier: 'Case',
    tab_calc: 'Calculations',
    tab_hist: 'History',
    tab_pieces: 'Documents',
    tab_edit: 'Edit',
    tab_upd: 'Update',
    sec_main_pax: 'Main passenger',
    lbl_fullname: 'Full name',
    lbl_whatsapp: 'WhatsApp',
    wa_contact_client: 'Contact client',
    wa_fill_phone: 'Enter dial code + phone',
    lbl_adults_detail: 'Adults (compensated)',
    lbl_babies_detail: 'Babies under 2 (not compensated)',
    sec_vols: 'Flights ({{n}})',
    vol_block: 'FLIGHT {{i}}{{suffix}}',
    vol_det261: ' — determining EU261',
    lbl_flight: 'Flight',
    lbl_route: 'Route (city or code)',
    lbl_source_acq: 'Acquisition source',
    lbl_status: 'Status',
    since_date: 'since {{date}}',
    pay_dot: '· payment {{date}}',
    sec_attach: 'Attachments ({{n}})',
    attach_hint:
      'Summary view — details and upload in the <strong>Documents</strong> tab or <strong>Case documents</strong> button above.',
    no_pieces_list: 'No documents listed.',
    calc_tier_row: 'EU261 tier',
    per_pax_suffix: ' € / passenger',
    calc_adults: 'Compensated adults',
    calc_babies_excl: 'Babies (excluded EU261)',
    calc_gross: 'Total gross compensation',
    calc_comm: 'Robin des Airs commission (25%)',
    calc_net_robin_b: 'Net Robin des Airs',
    calc_net_client: 'Total net to client',
    calc_per_adult: 'i.e. {{amt}} € per adult passenger',
    mora_title: 'Late-payment indemnity (delay)',
    mora_no_lrar:
      'LRAR not sent yet — enter receipt date to start the countdown.',
    mora_lrar_wait:
      'LRAR received on <b>{{lrar}}</b>. Statutory interest starts on <b>{{j16}}</b> (D+16).',
    mora_fees: 'Flat fee art. L.441-10: <b>€40</b> due now.',
    mora_days: 'Days since D+16 ({{j16}})',
    mora_days_val: '{{n}} days',
    mora_interest: 'Statutory interest (6.65%/yr)',
    mora_interest_live: 'calculated live',
    mora_flat: 'Flat fee L.441-10',
    mora_total_lbl: 'Total late-payment amount due',
    ev_placeholder: 'Add an event…',
    btn_add: 'Add',
    pieces_intro:
      '<strong>{{n}}</strong> document(s) on this case. Files are stored in the browser (reload may lose data if not exported).',
    piece_add_title: 'Add a document',
    piece_doc_type: 'Document type',
    piece_file_lbl: 'File (PDF, image… max 4 MB)',
    btn_save_piece: 'Save document',
    sec_id_contact: 'Identity & contact',
    flights_hint_edit:
      'No need for IATA codes: enter the <strong>city name</strong> (Paris, Douala…) or airport code if you have it.',
    vol_edit_suffix: ' — determining',
    btn_save_edit: 'Save changes',
    lbl_status_upd: 'Status',
    lbl_pay_date: 'Payment date',
    lbl_status_date: 'Current status date (same as payment date when « Paid »)',
    lbl_lrar_date:
      'LRAR receipt date (formal notice — late-payment counter + D+15 / D+30 / D+62 milestones)',
    lbl_priority_upd: 'Priority',
    wa_box_title: 'WhatsApp message — template for selected step',
    btn_copy_msg: 'Copy message',
    btn_refresh: 'Refresh',
    wa_footer_hint:
      'Customise before sending. After « Save », copy the message for the new status to keep the client informed.',
    btn_save: 'Save',
    btn_gen_letter: 'Generate formal notice ↗',
    danger_zone_title: 'Secure zone — case deletion',
    danger_zone_p:
      '<strong>An agent cannot delete a case</strong> without the authorisation code held by management. There is no one-click delete: the <strong>{{n}}-digit</strong> code is required, then final confirmation.',
    btn_req_delete: 'Request permanent deletion of this case…',
    wa_delay_ok:
      '<strong>Since LRAR (ack.) {{lrar}}</strong> — 1st reminder D+15: {{j15}} — 2nd reminder D+30: {{j30}} — mediation filing D+62: {{j62}}. Indicative: ~1 month without a usable airline response → reminders then mediation.',
    wa_delay_missing:
      'Enter the <strong>LRAR receipt date</strong> to auto-calculate D+15, D+30 and D+62 in messages.',
    wa_opening: 'Hello {{prenom}}, Robin des Airs regarding case {{id}}. ',
    audit_upd_follow: 'Case tracking updated (status / LRAR / priority)',
    audit_meta_stat: 'Status: {{a}} → {{b}}',
    audit_meta_prio: 'Priority: {{a}} → {{b}}',
    audit_meta_lrar: 'LRAR date: {{a}} → {{b}}',
    audit_meta_dst: 'Status date: {{a}} → {{b}}',
    audit_meta_pay: 'Payment date: {{a}} → {{b}}',
    audit_wa_hint: 'Remember to send the WhatsApp template if needed',
    audit_no_change: 'Saved (no change on tracked fields)',
    audit_piece_add: 'Document added: {{name}}',
    audit_piece_rm: 'Document removed from case',
    audit_piece_rm_meta: 'Document ID: {{id}}',
    audit_edit: 'Client record updated',
    audit_edit_meta: 'Identity, contact, tier, source or flight(s) updated',
    placeholder_city_dep: 'City or CDG',
    placeholder_city_arr: 'City or DSS'
  });

  window.CRM_UI_BUNDLE = {
    fr: { statutLabels: SL_FR, piecesCat: PC_FR, sourceLabels: SRC_FR, str: STR_FR },
    en: { statutLabels: SL_EN, piecesCat: PC_EN, sourceLabels: SRC_EN, str: STR_EN }
  };
})();

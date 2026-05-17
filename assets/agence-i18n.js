/**
 * FR / EN — espace agence Robin des Airs
 */
(function (global) {
  const LS_LANG = 'rda_agence_lang';

  const STR = {
    fr: {
      'toolbar.portal': 'Portail agence',
      'toolbar.lang': 'Langue',
      'toolbar.currency': 'Devise',
      'toolbar.equiv': 'Voir équivalents',
      'sidebar.portal': 'Espace agence',
      'guide.title': 'Que faire ici ?',
      'guide.desc':
        '3 actions : déposer un dossier, suivre vos réclamations, voir vos commissions (45 € par passager gagné).',
      'guide.btn.new': '✈️ Nouveau dossier',
      'guide.btn.files': '📁 Mes dossiers',
      'guide.btn.comm': '💰 Mes commissions',
      'login.title': 'Espace Partenaire',
      'login.sub': 'Dossiers synchronisés avec Airtable — Robin des Airs traite vos réclamations.',
      'login.code': 'Code agence (ex: GSA-KMS-001)',
      'login.pass': 'Mot de passe',
      'login.btn': 'Se connecter',
      'login.err': 'Code agence ou mot de passe incorrect',
      'nav.dashboard': 'Tableau de bord',
      'nav.new': 'Nouveau dossier',
      'nav.files': 'Mes dossiers',
      'nav.commissions': 'Commissions',
      'nav.help': 'Aide',
      'nav.logout': 'Déconnexion',
      'btn.refresh': '↻ Actualiser',
      'dash.title': 'Tableau de bord',
      'dash.sub': "Vue d'ensemble de vos dossiers et commissions (source Airtable)",
      'dash.sync': 'Dernière synchro :',
      'dash.sync.never': 'jamais',
      'kpi.submitted': 'Dossiers soumis',
      'kpi.submitted.sub': 'Depuis votre inscription',
      'kpi.active': 'En cours',
      'kpi.active.sub': 'Actifs + attente incident',
      'kpi.won': 'Gagnés',
      'kpi.won.sub': 'Indemnisations obtenues',
      'kpi.incident': 'En attente incident',
      'kpi.incident.sub': 'Billet vendu, vol à venir',
      'kpi.comm': 'Commissions gagnées',
      'kpi.comm.sub': 'par passager gagné',
      'table.last': 'Derniers dossiers',
      'col.ref': 'Référence',
      'col.passenger': 'Passager',
      'col.flight': 'Vol',
      'col.date': 'Date vol',
      'col.status': 'Statut',
      'col.commission': 'Commission',
      'new.title': 'Nouveau dossier',
      'new.sub':
        'Déposez un dossier en 1 minute — Robin attribue l\'email client automatiquement (ref@robindesairs.eu).',
      'form.step1': '1 — Passager',
      'form.step2': '2 — Vol',
      'form.step3': '3 — Situation',
      'form.email_auto': 'Pas d\'email à saisir : Robin crée l\'adresse dossier automatiquement.',
      'form.route_quick': 'Trajet fréquent (1 clic) :',
      'form.issue_hint': 'Choisissez la situation la plus proche.',
      'form.escale_hint': 'Précisez l\'escale ou la correspondance manquée :',
      'form.escale_via': 'Ville d\'escale / correspondance',
      'form.escale_vol2': '2ᵉ vol (optionnel)',
      'form.notes_ph': 'Détail utile pour Robin…',
      'toolbar.hint': 'Langue & devise : barre verte en haut ↑',
      'form.passenger': 'Informations du passager',
      'form.lastname': 'Nom',
      'form.firstname': 'Prénom',
      'form.email': 'Email',
      'form.phone': 'Téléphone (WhatsApp)',
      'form.flight': 'Informations du vol',
      'form.pnr': 'Code PNR (6 caractères)',
      'form.flightno': 'Numéro de vol',
      'form.airline': 'Compagnie aérienne',
      'form.select': 'Sélectionner...',
      'form.fdate': 'Date du vol',
      'form.from': 'Départ',
      'form.to': 'Arrivée',
      'form.issue': 'Type de problème',
      'form.delay': 'Retard estimé (heures)',
      'form.pax': 'Nombre de passagers sur le même PNR',
      'form.notes': 'Notes / détails supplémentaires',
      'form.submit': 'Soumettre le dossier',
      'form.clear': 'Effacer',
      'issue.delay': "Retard +3h à l'arrivée",
      'issue.cancel': 'Vol annulé',
      'issue.denied': "Surbooking / Refus d'embarquement",
      'issue.missed': 'Correspondance manquée',
      'issue.wait': '⏳ Billet vendu — en attente d\'incident',
      'pricing.title': 'Tarif partenaire (long-courrier >3 500 km)',
      'pricing.indemnity': 'Indemnité compagnie (CE 261)',
      'pricing.client': 'Net passager (votre client)',
      'pricing.agency': 'Votre commission / passager gagné',
      'pricing.robin': 'Honoraires Robin des Airs',
      'pricing.note':
        'Les 45 € agence correspondent à environ 29 500 FCFA (taux indicatif 1 € = 656 FCFA). Paiement sous 48h (Wave, Orange Money).',
      'files.title': 'Mes dossiers',
      'files.sub': 'Suivi de toutes vos réclamations',
      'files.all': 'Tous les dossiers',
      'filter.all': 'Tous les statuts',
      'filter.search': 'Rechercher...',
      'col.route': 'Route',
      'col.issue': 'Problème',
      'col.pax': 'Passagers',
      'comm.title': 'Commissions',
      'comm.sub': '45 € par passager gagné — paiement Wave / Orange Money sous 48 h',
      'comm.total': 'Total gagné',
      'comm.pending': 'En attente de paiement',
      'comm.paid': 'Déjà versé',
      'comm.method': 'Mode de paiement',
      'comm.history': 'Historique des paiements',
      'col.paydate': 'Date',
      'col.payref': 'Référence dossier',
      'col.amount': 'Montant',
      'col.mode': 'Mode',
      'help.title': 'Aide — Espace agence',
      'help.sub': 'Réclamations CE 261, commissions et bonnes pratiques',
      'status.nouveau': 'Nouveau',
      'status.attente': "En attente d'incident",
      'status.encours': 'En cours',
      'status.gagne': 'Gagné',
      'status.paye': 'Payé',
      'status.rejete': 'Rejeté',
      'toast.login': 'Connexion réussie',
      'toast.logout': 'Déconnexion',
      'toast.saved': 'Dossier soumis — Robin des Airs le traite',
      'toast.refreshed': 'Liste mise à jour',
      'toast.err': 'Erreur',
    },
    en: {
      'toolbar.portal': 'Agency portal',
      'toolbar.lang': 'Language',
      'toolbar.currency': 'Currency',
      'toolbar.equiv': 'Show equivalents',
      'sidebar.portal': 'Partner space',
      'guide.title': 'What to do here?',
      'guide.desc':
        '3 actions: submit a case, track claims, view commissions (€45 per winning passenger).',
      'guide.btn.new': '✈️ New case',
      'guide.btn.files': '📁 My cases',
      'guide.btn.comm': '💰 My commissions',
      'login.title': 'Partner portal',
      'login.sub': 'Cases synced with Airtable — Robin des Airs handles your claims.',
      'login.code': 'Agency code (e.g. GSA-KMS-001)',
      'login.pass': 'Password',
      'login.btn': 'Sign in',
      'login.err': 'Invalid agency code or password',
      'nav.dashboard': 'Dashboard',
      'nav.new': 'New case',
      'nav.files': 'My cases',
      'nav.commissions': 'Commissions',
      'nav.help': 'Help',
      'nav.logout': 'Log out',
      'btn.refresh': '↻ Refresh',
      'dash.title': 'Dashboard',
      'dash.sub': 'Overview of your cases and commissions (Airtable)',
      'dash.sync': 'Last sync:',
      'dash.sync.never': 'never',
      'kpi.submitted': 'Cases submitted',
      'kpi.submitted.sub': 'Since registration',
      'kpi.active': 'In progress',
      'kpi.active.sub': 'Active + awaiting incident',
      'kpi.won': 'Won',
      'kpi.won.sub': 'Compensation obtained',
      'kpi.incident': 'Awaiting incident',
      'kpi.incident.sub': 'Ticket sold, flight upcoming',
      'kpi.comm': 'Commissions earned',
      'kpi.comm.sub': 'per winning passenger',
      'table.last': 'Recent cases',
      'col.ref': 'Reference',
      'col.passenger': 'Passenger',
      'col.flight': 'Flight',
      'col.date': 'Flight date',
      'col.status': 'Status',
      'col.commission': 'Commission',
      'new.title': 'New case',
      'new.sub':
        'Submit a case in 1 minute — Robin assigns the client email automatically (ref@robindesairs.eu).',
      'form.step1': '1 — Passenger',
      'form.step2': '2 — Flight',
      'form.step3': '3 — Situation',
      'form.email_auto': 'No email needed — Robin creates the case address automatically.',
      'form.route_quick': 'Frequent route (one click):',
      'form.issue_hint': 'Pick the closest situation.',
      'form.escale_hint': 'Specify the layover or missed connection:',
      'form.escale_via': 'Layover / connection city',
      'form.escale_vol2': '2nd flight (optional)',
      'form.notes_ph': 'Useful detail for Robin…',
      'toolbar.hint': 'Language & currency: green bar at top ↑',
      'form.passenger': 'Passenger details',
      'form.lastname': 'Last name',
      'form.firstname': 'First name',
      'form.email': 'Email',
      'form.phone': 'Phone (WhatsApp)',
      'form.flight': 'Flight details',
      'form.pnr': 'PNR code (6 characters)',
      'form.flightno': 'Flight number',
      'form.airline': 'Airline',
      'form.select': 'Select...',
      'form.fdate': 'Flight date',
      'form.from': 'Departure',
      'form.to': 'Arrival',
      'form.issue': 'Issue type',
      'form.delay': 'Estimated delay (hours)',
      'form.pax': 'Passengers on same PNR',
      'form.notes': 'Notes / extra details',
      'form.submit': 'Submit case',
      'form.clear': 'Clear',
      'issue.delay': 'Arrival delay +3h',
      'issue.cancel': 'Flight cancelled',
      'issue.denied': 'Denied boarding / overbooking',
      'issue.missed': 'Missed connection',
      'issue.wait': '⏳ Ticket sold — awaiting incident',
      'pricing.title': 'Partner pricing (long-haul >3,500 km)',
      'pricing.indemnity': 'Airline compensation (EU 261)',
      'pricing.client': 'Passenger net (your client)',
      'pricing.agency': 'Your commission / winning passenger',
      'pricing.robin': 'Robin des Airs fee',
      'pricing.note':
        'Agency €45 is about 29,500 FCFA (indicative rate 1 € = 656 FCFA). Paid within 48h (Wave, Orange Money).',
      'files.title': 'My cases',
      'files.sub': 'Track all your claims',
      'files.all': 'All cases',
      'filter.all': 'All statuses',
      'filter.search': 'Search...',
      'col.route': 'Route',
      'col.issue': 'Issue',
      'col.pax': 'Passengers',
      'comm.title': 'Commissions',
      'comm.sub': '€45 per winning passenger — Wave / Orange Money within 48h',
      'comm.total': 'Total earned',
      'comm.pending': 'Pending payment',
      'comm.paid': 'Already paid',
      'comm.method': 'Payment method',
      'comm.history': 'Payment history',
      'col.paydate': 'Date',
      'col.payref': 'Case ref',
      'col.amount': 'Amount',
      'col.mode': 'Method',
      'help.title': 'Help — Agency portal',
      'help.sub': 'EU 261 claims, commissions and best practices',
      'status.nouveau': 'New',
      'status.attente': 'Awaiting incident',
      'status.encours': 'In progress',
      'status.gagne': 'Won',
      'status.paye': 'Paid',
      'status.rejete': 'Rejected',
      'toast.login': 'Signed in',
      'toast.logout': 'Logged out',
      'toast.saved': 'Case submitted — Robin des Airs is on it',
      'toast.refreshed': 'List updated',
      'toast.err': 'Error',
    },
  };

  function getLang() {
    const l = (localStorage.getItem(LS_LANG) || 'fr').toLowerCase();
    return STR[l] ? l : 'fr';
  }

  function setLang(lang) {
    if (STR[lang]) localStorage.setItem(LS_LANG, lang);
  }

  function t(key) {
    const lang = getLang();
    return (STR[lang] && STR[lang][key]) || STR.fr[key] || key;
  }

  function apply(root) {
    const el = root || document;
    el.querySelectorAll('[data-i18n]').forEach(function (node) {
      const key = node.getAttribute('data-i18n');
      const val = t(key);
      if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
        if (node.hasAttribute('data-i18n-placeholder')) node.placeholder = val;
      } else if (node.tagName === 'OPTION') {
        node.textContent = val;
      } else {
        node.textContent = val;
      }
    });
    el.querySelectorAll('[data-i18n-placeholder]').forEach(function (node) {
      node.placeholder = t(node.getAttribute('data-i18n-placeholder'));
    });
    document.documentElement.lang = getLang();
  }

  function bindLangSelect(selectEl, onChange) {
    if (!selectEl) return;
    selectEl.value = getLang();
    selectEl.addEventListener('change', function () {
      setLang(selectEl.value);
      apply();
      if (onChange) onChange();
    });
  }

  function syncLangPills(root) {
    const lang = getLang();
    (root || document).querySelectorAll('.lang-pill[data-lang]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
  }

  function bindLangPills(root, onChange) {
    const el = root || document;
    syncLangPills(el);
    el.querySelectorAll('.lang-pill[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLang(btn.getAttribute('data-lang'));
        syncLangPills(document);
        apply();
        if (onChange) onChange();
      });
    });
  }

  global.AgenceI18n = { getLang, setLang, t, apply, bindLangSelect, bindLangPills, syncLangPills, STR };
})(typeof window !== 'undefined' ? window : global);

/**
 * Robot WhatsApp partenaires — création dossiers → Airtable (même logique que espace-agence).
 */

const { airtableCfg, clientEmailForRef } = require('./airtable-robin');
const {
  findAgencyAccount,
  findAgencyByWhatsAppPhone,
  getAgencyByCode,
} = require('./agency-accounts');
const {
  createAgencyDossier,
  listAgencyDossiers,
  isAttenteIncidentInput,
  generateAgencyRef,
} = require('./agency-airtable');
const { notifyAgencyDossierCreated } = require('./robin-notify');
const { scheduleProofsAfterDossier } = require('./proofs-collect');
const {
  getAgencyLink,
  saveAgencyLink,
  getAgencySession,
  saveAgencySession,
  clearAgencySession,
  saveNewAgency,
  loadDynamicAgencies,
} = require('./agency-wa-store');
const { normalizeWaPhone } = require('./wa-convo-store');

const MENU_TEXT = `🏹 *Robin des Airs — Espace agence*

Répondez avec un chiffre :
*1* — Nouvelle réclamation (retard, annulation…)
*2* — Billet vendu, en attente d'incident
*3* — Mes 5 derniers dossiers
*4* — Aide

Tapez *menu* à tout moment. *annuler* pour abandonner un formulaire.`;

const PROBLEMS = [
  "Retard +3h à l'arrivée",
  'Vol annulé',
  "Surbooking / Refus d'embarquement",
  'Correspondance manquée',
];

function normText(t) {
  return String(t || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isMenuCmd(t) {
  const n = normText(t);
  return n === 'menu' || n === 'aide' || n === 'help' || n === '0';
}

function isCancelCmd(t) {
  return normText(t) === 'annuler' || normText(t) === 'cancel';
}

function parseNameLine(text) {
  const parts = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const nom = parts.pop().toUpperCase();
  const prenom = parts.join(' ');
  return { prenom, nom };
}

function airlineFromVol(vol) {
  const v = String(vol || '').replace(/\s/g, '').toUpperCase();
  const m = v.match(/^([A-Z]{2})/);
  if (!m) return '—';
  const map = {
    AF: 'Air France',
    TO: 'Transavia',
    SN: 'Brussels Airlines',
    AT: 'Royal Air Maroc',
    HC: 'Air Senegal',
    SS: 'Corsair',
    TU: 'Tunisair',
  };
  return map[m[1]] || m[1];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatWaPhoneDisplay(phone) {
  const p = normalizeWaPhone(phone);
  if (p.startsWith('33') && p.length === 11) {
    return `+33 ${p.slice(2, 3)} ${p.slice(3, 5)} ${p.slice(5, 7)} ${p.slice(7, 9)} ${p.slice(9)}`;
  }
  return `+${p}`;
}

const SIGNUP_INTEREST = /oui|yes|interess|partenaire|rejoindre|adherer|adhérer|je veux|ok|go|partner/i;

async function handleSignupFlow(event, phone, inbound, session) {
  // Étape 1 — premier contact : proposer le partenariat
  if (!session.flow || session.flow !== 'signup') {
    if (!SIGNUP_INTEREST.test(inbound) && session.step !== 'SIGNUP_NAME') {
      const newSession = { step: 'SIGNUP_INTEREST', flow: 'signup', draft: {} };
      await saveAgencySession(event, phone, newSession);
      return [
        '👋 Bienvenue sur le canal *agences partenaires* Robin des Airs 🏹\n\n' +
        'Nous indemnisons les passagers de vols retardés, annulés ou surbookés (jusqu\'à 600€/passager).\n\n' +
        '🤝 En tant qu\'agence partenaire, vous gagnez une *commission sur chaque dossier* que vous nous soumettez.\n\n' +
        'Vos clients voyagent ? Leurs billets nous intéressent.\n\n' +
        'Tapez *oui* pour rejoindre le programme gratuitement, ou *non* pour arrêter.',
      ];
    }
    if (/non|nope|no\b|pas interesse|pas intéressé/i.test(inbound)) {
      await clearAgencySession(event, phone);
      return ['Pas de problème, bonne continuation ! Si vous changez d\'avis, revenez nous voir.'];
    }
  }

  if (session.step === 'SIGNUP_INTEREST' || (SIGNUP_INTEREST.test(inbound) && !session.step?.startsWith('SIGNUP_'))) {
    const newSession = { step: 'SIGNUP_NAME', flow: 'signup', draft: {} };
    await saveAgencySession(event, phone, newSession);
    return ['Super ! 🎉\n\nQuel est le *nom de votre agence* ?'];
  }

  if (session.step === 'SIGNUP_NAME') {
    if (inbound.length < 2) return ['Merci d\'entrer un nom valide pour votre agence.'];
    session.draft.name = inbound.trim();
    session.step = 'SIGNUP_CITY';
    await saveAgencySession(event, phone, session);
    return ['Dans quelle *ville* êtes-vous basé(e) ? (ex. Douala, Yaoundé, Bafoussam…)'];
  }

  if (session.step === 'SIGNUP_CITY') {
    session.draft.ville = inbound.trim();
    session.step = 'SIGNUP_CONFIRM';
    await saveAgencySession(event, phone, session);
    return [
      `📋 *Récapitulatif*\n\n` +
      `Agence : *${session.draft.name}*\nVille : *${session.draft.ville}*\n\n` +
      'Tapez *oui* pour confirmer et recevoir vos accès partenaire.',
    ];
  }

  if (session.step === 'SIGNUP_CONFIRM') {
    if (!/^oui|ok|yes|confirmer$/i.test(normText(inbound))) {
      return ['Tapez *oui* pour confirmer, ou *annuler* pour recommencer.'];
    }
    const account = await saveNewAgency(event, {
      name: session.draft.name,
      ville: session.draft.ville,
      phone,
      sourcePhone: phone,
    });
    if (!account) {
      return ['❌ Erreur technique. Contactez Robin des Airs directement pour activer votre compte.'];
    }
    await saveAgencyLink(event, phone, account);
    await clearAgencySession(event, phone);
    return [
      `✅ *Bienvenue, ${account.name} !*\n\n` +
      `Vos accès partenaire :\n` +
      `• Code agence : *${account.code}*\n` +
      `• Mot de passe : *${account.pass}*\n\n` +
      `📱 Portail web : https://robindesairs.eu/espace-agence/\n\n` +
      `Conservez bien ces informations. Tapez *menu* pour soumettre votre premier dossier.`,
      MENU_TEXT,
    ];
  }

  // Fallback
  await clearAgencySession(event, phone);
  return [
    '👋 Bienvenue ! Tapez *oui* pour rejoindre le programme partenaires Robin des Airs, ou contactez-nous si vous avez déjà un code agence.',
  ];
}

async function resolveAgency(event, phone) {
  const linked = await getAgencyLink(event, phone);
  if (linked && linked.code) {
    return getAgencyByCode(linked.code);
  }
  return findAgencyByWhatsAppPhone(phone);
}

/**
 * @returns {Promise<string[]>} messages to send (1+)
 */
async function handleAgencyWhatsAppMessage(event, phone, text) {
  const inbound = String(text || '').trim();
  if (!inbound) return [];

  const cfg = airtableCfg();
  if (!cfg) {
    return ['⚠️ Airtable non configuré côté Robin. Réessayez plus tard ou utilisez le portail web.'];
  }

  let session = await getAgencySession(event, phone);
  let agency = await resolveAgency(event, phone);

  if (isCancelCmd(inbound)) {
    await clearAgencySession(event, phone);
    return ['Formulaire annulé.', MENU_TEXT];
  }

  if (session.step === 'AUTH_CODE') {
    const code = inbound.toUpperCase().replace(/\s/g, '');
    const acc = getAgencyByCode(code);
    if (!acc) {
      return ['Code agence inconnu. Vérifiez (ex. GSA-DKR-001) ou contactez Robin des Airs.'];
    }
    session = { step: 'AUTH_PASS', draft: { pendingCode: code }, flow: null };
    await saveAgencySession(event, phone, session);
    return [`Agence *${acc.name}*. Entrez votre mot de passe partenaire :`];
  }

  if (session.step === 'AUTH_PASS') {
    const code = session.draft && session.draft.pendingCode;
    const acc = findAgencyAccount(code, inbound);
    if (!acc) {
      return ['Mot de passe incorrect. Réessayez ou tapez *annuler*.'];
    }
    await saveAgencyLink(event, phone, acc);
    await clearAgencySession(event, phone);
    agency = acc;
    return [
      `✅ Connecté — *${acc.name}* (${acc.code}).\n\nCe numéro WhatsApp est enregistré pour votre agence.`,
      MENU_TEXT,
    ];
  }

  if (!agency) {
    const pre = findAgencyByWhatsAppPhone(phone);
    if (pre) {
      await saveAgencyLink(event, phone, pre);
      agency = pre;
    } else {
      // Vérifier dans les comptes dynamiques (Blobs)
      const dynamic = await loadDynamicAgencies(event);
      const dynMatch = dynamic.find(a => (a.whatsappPhones || []).includes(phone));
      if (dynMatch) {
        await saveAgencyLink(event, phone, dynMatch);
        agency = dynMatch;
      } else {
        // Flow auto-inscription
        return handleSignupFlow(event, phone, inbound, session);
      }
    }
  }

  if (isMenuCmd(inbound)) {
    await clearAgencySession(event, phone);
    return [MENU_TEXT];
  }

  const choice = inbound.replace(/\D/g, '') || inbound;
  const formSteps = ['ASK_PNR', 'ASK_NAME', 'ASK_VOL', 'ASK_PROBLEM', 'CONFIRM'];
  const inForm = formSteps.includes(session.step);

  if (!inForm && (session.step === 'MENU' || !session.step || session.step === 'PICK')) {
    if (/^(bonjour|salut|hello|coucou|bonsoir)/.test(normText(inbound))) {
      return [`Bonjour *${agency.name}* 👋\n\n${MENU_TEXT}`];
    }
    if (choice === '1' || normText(inbound).includes('reclamation')) {
      session = { step: 'ASK_PNR', flow: 'claim', draft: {} };
      await saveAgencySession(event, phone, session);
      return ['📋 *Nouvelle réclamation*\n\nEnvoyez le *PNR* (6 caractères, ex. ABC123) :'];
    }
    if (choice === '2' || normText(inbound).includes('attente')) {
      session = { step: 'ASK_PNR', flow: 'attente', draft: { attenteIncident: true } };
      await saveAgencySession(event, phone, session);
      return [
        "⏳ *Billet en attente d'incident*\n\nEnvoyez le *PNR* (6 caractères) du billet vendu :",
      ];
    }
    if (choice === '3' || normText(inbound).includes('dossier')) {
      try {
        const list = await listAgencyDossiers(cfg, agency);
        const top = list.slice(0, 5);
        if (!top.length) {
          return ['Aucun dossier trouvé pour votre agence dans Airtable.', MENU_TEXT];
        }
        const lines = top.map((d, i) => {
          const st =
            d.statut === 'attente-incident'
              ? "attente d'incident"
              : d.statutLabel || d.statut;
          return `${i + 1}. *${d.ref}* — ${d.prenom} ${d.nom} · ${d.vol || '—'} · ${st}`;
        });
        return [`📂 *Vos derniers dossiers*\n\n${lines.join('\n')}\n\n${MENU_TEXT}`];
      } catch (e) {
        return [`Erreur lecture Airtable : ${e.message}`, MENU_TEXT];
      }
    }
    if (choice === '4') {
      return [
        'ℹ️ *Aide agence*\n\n• Chaque dossier est enregistré dans Airtable (visible par Robin).\n• Option 2 = billet vendu sans incident encore.\n• Portail web : https://robindesairs.eu/espace-agence/\n\n' +
          MENU_TEXT,
      ];
    }
    return ['Choix non reconnu. Tapez *1*, *2*, *3* ou *4*, ou *menu*.', MENU_TEXT];
  }

  if (session.step === 'ASK_PNR') {
    const pnr = inbound.replace(/\s/g, '').toUpperCase();
    if (pnr.length !== 6) {
      return ['PNR invalide : il faut *6 caractères* (ex. ABC123).'];
    }
    session.draft.pnr = pnr;
    session.step = 'ASK_NAME';
    await saveAgencySession(event, phone, session);
    return ['Nom du passager : *prénom puis NOM* (ex. Aminata DIALLO)'];
  }

  if (session.step === 'ASK_NAME') {
    const name = parseNameLine(inbound);
    if (!name) {
      return ['Format attendu : *Prénom NOM* (au moins 2 mots).'];
    }
    session.draft.prenom = name.prenom;
    session.draft.nom = name.nom;
    session.step = 'ASK_VOL';
    await saveAgencySession(event, phone, session);
    return ['Numéro de vol (ex. *AF718*, *TO9612*) :'];
  }

  if (session.step === 'ASK_VOL') {
    session.draft.vol = inbound.replace(/\s/g, '').toUpperCase();
    session.draft.compagnie = airlineFromVol(session.draft.vol);
    if (session.flow === 'attente') {
      session.step = 'CONFIRM';
      await saveAgencySession(event, phone, session);
      return [buildConfirmMessage(session) + '\n\nRépondez *oui* pour enregistrer ou *annuler*.'];
    }
    session.step = 'ASK_PROBLEM';
    await saveAgencySession(event, phone, session);
    return [
      'Type de problème — répondez 1 à 4 :\n\n1 — Retard +3h à l\'arrivée\n2 — Vol annulé\n3 — Surbooking / refus\n4 — Correspondance manquée',
    ];
  }

  if (session.step === 'ASK_PROBLEM') {
    const n = parseInt(inbound.replace(/\D/g, ''), 10);
    if (n < 1 || n > 4) {
      return ['Répondez *1*, *2*, *3* ou *4*.'];
    }
    session.draft.probleme = PROBLEMS[n - 1];
    session.step = 'CONFIRM';
    await saveAgencySession(event, phone, session);
    return [buildConfirmMessage(session) + '\n\nRépondez *oui* pour enregistrer ou *annuler*.'];
  }

  if (session.step === 'CONFIRM') {
    if (!/^oui|ok|yes|valider$/i.test(normText(inbound))) {
      return ['Répondez *oui* pour confirmer ou *annuler*.'];
    }
    try {
      const body = buildAirtableBody(session, phone, agency);
      const created = await createAgencyDossier(cfg, agency, body);
      const attente = isAttenteIncidentInput(body);
      notifyAgencyDossierCreated(agency, created.dossier, { attenteIncident: attente }).catch(
        () => {}
      );
      scheduleProofsAfterDossier(event, cfg, created, body);
      await clearAgencySession(event, phone);
      const msg = attente
        ? `✅ Billet enregistré — *${created.ref}*\nStatut : en attente d'incident.\nRobin sera notifié.`
        : `✅ Dossier créé — *${created.ref}*\nEnregistré dans Airtable.`;
      return [msg, MENU_TEXT];
    } catch (e) {
      console.error('agency-wa-bot: create', e.message);
      return [`❌ Erreur Airtable : ${e.message}\n\nTapez *menu* pour recommencer.`];
    }
  }

  return [MENU_TEXT];
}

function buildConfirmMessage(session) {
  const d = session.draft || {};
  const lines = [
    '📄 *Récapitulatif*',
    `PNR : ${d.pnr}`,
    `Passager : ${d.prenom} ${d.nom}`,
    `Vol : ${d.vol} (${d.compagnie || '—'})`,
  ];
  if (session.flow === 'attente') {
    lines.push("Type : billet en attente d'incident");
  } else {
    lines.push(`Problème : ${d.probleme || '—'}`);
  }
  return lines.join('\n');
}

function buildAirtableBody(session, phone, agency) {
  const d = session.draft || {};
  const ref = generateAgencyRef();
  const body = {
    ref,
    nom: d.nom,
    prenom: d.prenom,
    email: clientEmailForRef(ref),
    tel: formatWaPhoneDisplay(phone),
    pnr: d.pnr,
    vol: d.vol,
    compagnie: d.compagnie || airlineFromVol(d.vol),
    date: todayIso(),
    depart: '—',
    arrivee: '—',
    probleme: d.probleme || (session.flow === 'attente' ? "En attente d'incident (billet vendu)" : ''),
    attenteIncident: session.flow === 'attente' || !!d.attenteIncident,
    notes: `Soumis via WhatsApp agence ${agency.code}`,
    nbPassagers: 1,
  };
  return body;
}

module.exports = {
  handleAgencyWhatsAppMessage,
  MENU_TEXT,
};

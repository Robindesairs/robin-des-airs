/**
 * Référentiel « réclamation CE 261 » par compagnie — route les envois du pipeline aval.
 * Données vérifiées en navigateur réel (juin 2026) ; champs « à confirmer » signalés.
 * NE PAS confondre avec data/airlines.js (simple liste déroulante du formulaire).
 *
 * entryMode :
 *   'form_no_login' — formulaire web, dépôt SANS compte (PNR/nom)  → préremplissage + clic humain
 *   'form_login'    — formulaire web exigeant un compte            → humain (jamais le compte du client)
 *   'email'         — adresse e-mail de réclamation exploitable    → envoi automatisable
 * Le canal robuste pour la MISE EN DEMEURE reste l'email/AR24 (recommandé électronique),
 * pas le scraping des formulaires (Akamai/CAPTCHA).
 *
 * conversion : propension de la compagnie à PAYER une fois la réclamation valide
 *   'haute'    — bon payeur (source : analyse conversion Compensair, juin 2026)
 *   'moyenne'  — transporteur UE solvable, non signalé « bon payeur » par Compensair
 *   'inconnue' — pas de donnée fiable (typiquement transporteurs africains non-UE)
 *   ⚠️ ORTHOGONAL à l'éligibilité : un non-UE « haute » (TK, QR…) ne score QU'AU
 *   DÉPART d'un aéroport UE. La conversion pondère le pipeline aval, pas l'ouverture du dossier.
 */

// Organismes nationaux de contrôle (NEB) — escalade en cas de refus.
const NEB = {
  FR: { nom: 'DGAC (France)', url: 'https://www.ecologie.gouv.fr/politiques-publiques/droits-passagers-aeriens' },
  DE: { nom: 'Luftfahrt-Bundesamt (LBA, Allemagne)', url: 'https://www.lba.de/EN/AirPassengersRights/Complaint_Procedure/Complaint-_Procedure_node.html' },
  BE: { nom: 'SPF Mobilité et Transports (Belgique)', url: 'https://mobilit.belgium.be/fr/aviation/passagers/droits_des_passagers' },
  NL: { nom: 'ILT — Inspectie Leefomgeving en Transport (Pays-Bas)', url: 'https://www.ilent.nl/onderwerpen/passagiersrechten-luchtvaart' },
  PT: { nom: 'ANAC (Portugal)', url: 'https://www.anac.pt/' },
  ES: { nom: 'AESA (Espagne)', url: 'https://www.seguridadaerea.gob.es/' },
  EU_LIST: { nom: 'Liste officielle des NEB (Commission européenne)', url: 'https://transport.ec.europa.eu/transport-themes/passenger-rights/national-enforcement-bodies-neb_en' },
};

// Pour une compagnie NON-UE, le CE 261 ne s'applique qu'aux vols AU DÉPART de l'UE :
// l'organisme compétent est celui du PAYS UE DE DÉPART (à déterminer au dossier).
const NEB_PAYS_DEPART = { nom: 'NEB du pays UE de départ (CE 261 = vols au départ de l’UE)', url: NEB.EU_LIST.url };

const AIRLINES = {
  // ── Transporteurs UE (redevables dans les deux sens) ──
  AF: {
    nom: 'Air France', pays: 'FR', ue: true,
    formUrl: 'https://wwws.airfrance.fr/information/legal/reclamation',
    entryMode: 'form_no_login',
    depotNote: 'Voie « Rechercher une réservation » : PNR (référence de réservation) ou Prénom + Nom. Sans connexion.',
    emailReclamations: null, // non affiché sur le formulaire — à confirmer page contact
    adresseAR: null,         // à confirmer (mentions légales / service clientèle)
    exigerCash: false,
    conversion: 'moyenne', // non signalée « bon payeur » par Compensair ; transporteur UE majeur
    neb: NEB.FR,
    prescription: '5 ans (Cass. 1re civ. 17/05/2017, n° 16-13.352)',
    notes: 'Gatekeeping : la compagnie veut une réclamation préalable du passager. La voie ci-dessus, AU NOM du passager (mandat), satisfait cette exigence sans déclencher le délai « tiers ».',
  },
  KL: {
    nom: 'KLM', pays: 'NL', ue: true,
    formUrl: 'https://www.klm.com/information/refund-compensation/compensation',
    entryMode: 'form_no_login',
    depotNote: '« Request compensation » ; suivi par nom + code de réservation (sans compte).',
    emailReclamations: null, adresseAR: null,
    exigerCash: true,
    conversion: 'moyenne', // non signalée par Compensair ; verse en bons → exiger cash
    neb: NEB.NL,
    prescription: 'selon le for retenu',
    notes: 'KLM verse un BON (voucher EMD) par défaut ; l’option cash est à valeur moindre (250/400/600 € cash vs 350/500/800 € bon) → EXIGER LE CASH dans la mise en demeure.',
  },
  SN: {
    nom: 'Brussels Airlines', pays: 'BE', ue: true,
    formUrl: 'https://www.brusselsairlines.com/fr/en/contact/feedback/general/delays-and-cancellation',
    entryMode: 'form_no_login',
    depotNote: 'Formulaire avec voie « Representative information » explicite + bloc « Bank details » (virement). Sans connexion.',
    emailReclamations: null, adresseAR: null,
    exigerCash: false,
    conversion: 'haute', // groupe Lufthansa (même politique de paiement que LH, « haute » Compensair)
    neb: NEB.BE,
    prescription: 'Belgique 10 ans (art. 2262bis C. civ. belge) ; for FR par défaut 5 ans',
    notes: 'Filiale du groupe Lufthansa. Idéal mandataire : la voie « Representative » + RIB est native.',
  },
  LH: {
    nom: 'Lufthansa', pays: 'DE', ue: true,
    formUrl: 'https://www.lufthansa.com/fr/en/fast-compensation',
    entryMode: 'form_no_login',
    depotNote: '« fast-compensation » : saisie des détails de réservation (PNR), sans connexion.',
    emailReclamations: null, adresseAR: null,
    exigerCash: false,
    conversion: 'haute', // « bon payeur » Compensair (juin 2026)
    neb: NEB.DE,
    prescription: 'Allemagne 3 ans (§195 BGB) ; CJUE C-551/24 : la cession ne déplace pas le for → tribunal du lieu de départ/arrivée valable.',
    notes: 'CGT en droit allemand. Garder l’option cession pour le contentieux + invoquer C-551/24 contre tout renvoi en Allemagne.',
  },
  TP: {
    nom: 'TAP Air Portugal', pays: 'PT', ue: true,
    formUrl: 'https://www.flytap.com/en-pt/help/delays-cancellations',
    entryMode: 'form',
    depotNote: 'Plateforme « Manage your Booking » + Contact Center.',
    emailReclamations: null, adresseAR: null,
    exigerCash: true,
    conversion: 'haute', // « bon payeur » Compensair (juin 2026) ; verse en bons → exiger cash
    neb: NEB.PT,
    prescription: 'selon le for retenu',
    notes: 'Demander une « declaration of irregularity » = certificat de retard (preuve). Bons proposés → exiger le cash.',
  },
  IB: {
    nom: 'Iberia', pays: 'ES', ue: true,
    formUrl: 'https://www.iberia.com/gb/claims-receipts/',
    entryMode: 'form',
    depotNote: 'Formulaire « Claims and receipts » ; réclamation pour un tiers admise (mandat joint).',
    emailReclamations: null, adresseAR: null,
    exigerCash: false,
    conversion: 'haute', // « bon payeur » Compensair (juin 2026)
    neb: NEB.ES,
    prescription: 'délai interne Iberia ~1 an (à confirmer) ; for FR 5 ans',
    notes: 'FAQ confirme « Can I file a claim on behalf of someone else? ».',
  },

  // ── Transporteurs NON-UE (redevables pour les vols AU DÉPART de l’UE) ──
  AT: {
    nom: 'Royal Air Maroc', pays: 'MA', ue: false,
    formUrl: 'https://www.royalairmaroc.com/us-en/information/service-claims',
    entryMode: 'form_login',
    depotNote: 'Formulaire « Réclamation et assistance » + « Demande de remboursement » — connexion à un compte requise.',
    emailReclamations: 'callcenter@royalairmaroc.com', // issu de recherche — à confirmer
    adresseAR: 'Royal Air Maroc, Bd Moulay Abdellah Cherif, Aéroport Casa-Anfa, Casablanca 20200, Maroc', // à confirmer
    exigerCash: false,
    conversion: 'inconnue', // non-UE, pas de donnée Compensair
    neb: NEB_PAYS_DEPART,
    prescription: 'selon le for UE (départ UE requis)',
    notes: 'CE 261 uniquement si départ d’un aéroport UE. Email/adresse issus de recherche — à confirmer.',
  },
  TK: {
    nom: 'Turkish Airlines', pays: 'TR', ue: false,
    formUrl: 'https://www.turkishairlines.com/en-int/any-questions/compensation-and-refund/',
    entryMode: 'form_no_login',
    depotNote: 'Voie « Compensation and refund » / feedback : n° de billet (013…) ou PNR + nom, sans compte. Form protégé Akamai → préremplissage + clic humain.',
    emailReclamations: null, // non publié — passer par le formulaire ; AR24 sur adresse siège à confirmer
    adresseAR: null,         // à confirmer (siège Istanbul Airport, Yeşilköy)
    exigerCash: true,
    conversion: 'haute',     // « bon payeur » Compensair (juin 2026)
    neb: NEB_PAYS_DEPART,
    prescription: 'selon le for UE (départ UE requis)',
    notes: 'NON-UE : éligible UNIQUEMENT au départ d’un aéroport UE (ex. retour Paris→… ; PAS un Dakar→IST→Paris). Verse parfois des miles/bons → exiger le cash.',
  },
  HC: {
    nom: 'Air Sénégal', pays: 'SN', ue: false,
    formUrl: 'https://flyairsenegal.com/contact-4/',
    entryMode: 'form',
    depotNote: 'Pas de formulaire « réclamation » dédié : voie « Envoyez-nous un message » de la page contact. Tél. SN +221 33 923 15 15 / FR +33 1 89 61 11 11 (07h–21h).',
    emailReclamations: null, // non publié sur le site — à confirmer
    adresseAR: null,         // siège Dakar — à confirmer pour AR24
    exigerCash: false,
    conversion: 'inconnue',  // non-UE, pas de donnée Compensair
    neb: NEB_PAYS_DEPART,
    prescription: 'selon le for UE (départ UE requis)',
    notes: 'NON-UE : CE 261 uniquement au DÉPART d’un aéroport UE (ex. Paris/Marseille→Dakar). Un Dakar→Paris direct n’ouvre PAS le droit (départ non-UE, transporteur non-UE). Pas d’email réclamation public → escalade NEB du pays de départ.',
  },
  HF: {
    nom: 'Air Côte d’Ivoire', pays: 'CI', ue: false,
    formUrl: 'https://www.aircotedivoire.com/en/claim/',
    entryMode: 'form_no_login',
    depotNote: 'Formulaire « Claim » SANS compte : Nom/Prénom, email, tél., motif (« Delayed flight » / « Cancelled flight »), date, route, n° de billet, pièces jointes.',
    emailReclamations: null, // non publié — formulaire ; page contact /en/contact-us/
    adresseAR: null,         // siège Abidjan — à confirmer pour AR24
    exigerCash: false,
    conversion: 'inconnue',  // non-UE, pas de donnée Compensair
    neb: NEB_PAYS_DEPART,
    prescription: 'selon le for UE (départ UE requis)',
    notes: 'NON-UE : CE 261 uniquement au DÉPART d’un aéroport UE (ex. Paris→Abidjan). Formulaire « Claim » exploitable (préremplissage + clic humain).',
  },
};

// Quelques non-UE fréquents sur l’axe Afrique — points d’entrée à compléter (mode email/form à confirmer).
// (TK, HC, HF sont désormais des entrées complètes ci-dessus.)
['ET', 'KQ', 'TU', 'AH', 'KP', 'MS', 'WB'].forEach((code) => {
  if (!AIRLINES[code]) {
    AIRLINES[code] = {
      nom: code, pays: null, ue: false, formUrl: null, entryMode: 'form',
      depotNote: 'Point d’entrée à confirmer (page « réclamation / contact » de la compagnie).',
      emailReclamations: null, adresseAR: null, exigerCash: false,
      conversion: 'inconnue',
      neb: NEB_PAYS_DEPART, prescription: 'selon le for UE',
      notes: 'CE 261 uniquement si départ d’un aéroport UE → escalade vers le NEB du pays de départ.',
    };
  }
});

/** Code IATA compagnie (2 car.) depuis un n° de vol (AF718 → AF, U24321 → U2). */
function airlineIataFromFlight(flight) {
  const s = String(flight || '').toUpperCase().replace(/\s/g, '');
  const m = s.match(/^([A-Z0-9]{2})\d/);
  return m ? m[1] : s.slice(0, 2);
}

/** Référentiel claims pour une compagnie (par IATA) ou un n° de vol. */
function getAirlineClaim(iataOrFlight) {
  const raw = String(iataOrFlight || '').toUpperCase().replace(/\s/g, '');
  const iata = /^[A-Z0-9]{2}$/.test(raw) ? raw : airlineIataFromFlight(raw);
  return AIRLINES[iata] || null;
}

module.exports = { AIRLINES, NEB, getAirlineClaim, airlineIataFromFlight };

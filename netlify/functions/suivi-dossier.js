/**
 * suivi-dossier — ESPACE CLIENT : statut d'avancement d'un dossier, en libre-service.
 * GET /api/suivi-dossier?r=<ref>
 *
 * Le <ref> est le MÊME jeton opaque que le lien de dépôt (crm-depot-link.js) : il est
 * non devinable et stocké dans Netlify Blobs (store 'mandats', clé m/<ref>). C'est la
 * capacité d'accès — exactement le modèle de dossier-get.js / depot-upload.js.
 *   m/<ref>.crmId = la « Référence Dossier » Airtable (statut vivant, tenu par l'équipe).
 *
 * On renvoie une projection CLIENT-SAFE : prénom, vol, montant net, statut → étape.
 * JAMAIS de données internes (remarques, raison compagnie, téléphone, nom complet d'autrui).
 */

'use strict';

const { getBlobStore } = require('./lib/netlify-blobs-store');
const { airtableCfg, airtableFindByRef, recordFromAirtableFields } = require('./lib/airtable-robin');
const { airtableStatutToCrm } = require('./lib/crm-airtable-map');

const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://robindesairs.eu',
  'Cache-Control': 'no-store',
};

// Jalons visibles côté client (chemin « heureux »). L'escalade (4) ne s'affiche que si atteinte.
const TIMELINE = ['Dossier reçu', 'Mandat signé', 'Réclamation envoyée', 'Relances en cours', 'Médiation / justice', 'Indemnité versée'];

// Statut interne (code CRM) → présentation client : étape sur la timeline + libellé + phrase rassurante.
// terminal: 'refus' | 'abandon' | 'prescrit' sort du chemin heureux (carte dédiée côté front).
const CLIENT_STATUS = {
  BROUILLON:        { etape: 0, terminal: null,       label: 'Dossier reçu',                desc: 'Nous avons bien reçu votre dossier. Prochaine étape : la signature de votre mandat.' },
  ELIGIBLE:         { etape: 0, terminal: null,       label: 'Dossier en préparation',      desc: 'Votre dossier est éligible. Nous réunissons les pièces avant d’écrire à la compagnie.' },
  SIGNATURE_ATTENTE:{ etape: 0, terminal: null,       label: 'En attente de signature',     desc: 'Il ne manque que votre signature pour lancer la réclamation.' },
  MANDAT_SIGNE:     { etape: 1, terminal: null,       label: 'Mandat signé',                desc: 'Votre mandat est signé. Nous préparons la réclamation officielle à la compagnie.' },
  LRAR_ENVOYEE:     { etape: 2, terminal: null,       label: 'Réclamation envoyée',         desc: 'Votre réclamation a été envoyée à la compagnie. Le délai légal de réponse court.' },
  RELANCE_1:        { etape: 3, terminal: null,       label: 'Relance envoyée',             desc: 'Sans réponse de la compagnie, nous l’avons relancée.' },
  RELANCE_2:        { etape: 3, terminal: null,       label: 'Relance ferme envoyée',       desc: 'Nous avons envoyé une relance ferme à la compagnie.' },
  MEDIATION:        { etape: 4, terminal: null,       label: 'Escalade : médiation',        desc: 'La compagnie tarde : nous portons le dossier devant l’instance compétente.' },
  CONTENTIEUX:      { etape: 4, terminal: null,       label: 'Procédure engagée',           desc: 'Nous engageons la procédure pour faire valoir vos droits.' },
  PAYE:             { etape: 5, terminal: null,       label: 'Indemnité versée',            desc: 'Bonne nouvelle : votre indemnité a été versée. Merci de votre confiance !' },
  REFUSE_DEFINITIF: { etape: -1, terminal: 'refus',   label: 'Réponse de la compagnie',     desc: 'La compagnie a opposé un refus. Écrivez-nous : on vous explique les recours possibles.' },
  ABANDON:          { etape: -1, terminal: 'abandon', label: 'Dossier en pause',            desc: 'Votre dossier est en pause. Écrivez-nous pour le relancer.' },
  PRESCRIT:         { etape: -1, terminal: 'prescrit',label: 'Délai dépassé',               desc: 'Le délai légal de 5 ans est dépassé pour ce vol.' },
};

function cleanRef(r) {
  return String(r || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

function toInt(v) {
  const n = parseInt(String(v == null ? '' : v).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  const q = event.queryStringParameters || {};
  const ref = cleanRef(q.r || q.ref);
  if (!ref) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'r requis' }) };

  try {
    // 1) Le jeton DOIT exister en Blobs (capacité d'accès non devinable).
    const st = getBlobStore(event, 'mandats');
    if (!st) return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'store indisponible' }) };
    const blob = await st.get('m/' + ref, { type: 'json' }).catch(() => null);
    if (!blob) return { statusCode: 404, headers: H, body: JSON.stringify({ error: 'dossier introuvable' }) };

    // 2) Statut vivant depuis Airtable (réf canonique = crmId du blob).
    const dossierRef = String(blob.crmId || ref).trim();
    let rec = null;
    const cfg = airtableCfg();
    if (cfg) {
      const recs = await airtableFindByRef(cfg, dossierRef).catch(() => []);
      if (recs && recs[0]) rec = recordFromAirtableFields(cfg, recs[0].fields);
    }

    // 3) Statut → présentation client (fallback prudent si Airtable muet).
    const statutCrm = rec ? airtableStatutToCrm(rec.statutSuivi) : 'ELIGIBLE';
    const view = CLIENT_STATUS[statutCrm] || CLIENT_STATUS.ELIGIBLE;

    // 4) Montant NET (ce que le client reçoit). « Montant Client » si renseigné,
    //    sinon 75 % du brut « Montant de l'indemnité », sinon masqué.
    const brut = rec ? toInt(rec.indemnite) : toInt(blob.indemnite);
    const netClient = rec ? toInt(rec.montantClient) : 0;
    const net = netClient > 0 ? netClient : (brut > 0 ? Math.round(brut * 0.75) : 0);

    // 5) Données de vol : Airtable d'abord, repli sur le blob figé.
    const vol = (rec && rec.vol) || blob.vol || '';
    const dateVol = (rec && rec.date) || blob.date || '';
    const route = (rec && rec.route) || '';
    const compagnie = (rec && rec.compagnie) || blob.compagnie || '';
    const prenom = firstName((rec && rec.prenom) || (rec && rec.name) || blob.name);
    const pax = toInt(blob.pax) || (Array.isArray(blob.passengers) ? blob.passengers.length : 0) || 1;

    const payload = {
      ok: true,
      ref,
      prenom,
      statut: statutCrm,
      etape: view.etape,
      terminal: view.terminal,
      statutLabel: view.label,
      statutDesc: view.desc,
      timeline: TIMELINE,
      vol,
      date: dateVol,
      route,
      compagnie,
      pax,
      montantNet: net || null,
      montantBrut: brut || null,
      depotLink: `/depot-en-ligne.html?r=${encodeURIComponent(ref)}`,
    };

    return { statusCode: 200, headers: H, body: JSON.stringify(payload) };
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};

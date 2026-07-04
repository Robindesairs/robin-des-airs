/**
 * lib/aval-pipeline.js — SCAFFOLD pipeline aval (post-signature → paiement).
 *
 * Logique PURE et DÉTERMINISTE (aucune I/O, aucune IA, aucun envoi). Sert de socle
 * commun aux fonctions aval-* (generate / send / relances / escalade / suivi-paiement).
 *
 * ⚠️ SCAFFOLD : ne remplace PAS le pipeline prod (lib/legal-pipeline.js, generate-claim.js,
 * legal-daily.js). Rien ici n'est branché sur la prod ni déployé. On réutilise, quand elles
 * existent, les primitives pures de legal-pipeline (parseDate, lastMedDate) pour rester
 * aligné sur la source de vérité, avec un repli local si le module est absent.
 *
 * Terminologie visible = « cession » (pas « mandat »). Wording légal loi 71-1130 :
 * éligibilité au conditionnel, aucun nom d'avocat, aucune garantie de résultat/délai.
 */

'use strict';

// Réutilise les helpers purs de la prod SANS la modifier ; repli local si indispo.
let legal = {};
try { legal = require('./legal-pipeline'); } catch (_) { legal = {}; }

const DAY_MS = 24 * 3600 * 1000;

/** 'JJ/MM/AAAA' | 'AAAA-MM-JJ…' → Date (minuit UTC) | null. */
function parseDate(s) {
  if (typeof legal.parseDate === 'function') return legal.parseDate(s);
  const str = String(s || '').trim();
  if (!str) return null;
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return null;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

function ymd(d) {
  return d ? d.toISOString().slice(0, 10) : '';
}

/** Dernière date « MED (générée|envoyée) AAAA-MM-JJ » dans les remarques. */
function lastMedDate(remarques) {
  if (typeof legal.lastMedDate === 'function') return legal.lastMedDate(remarques);
  const matches = String(remarques || '').match(/MED\s+(?:g[eé]n[eé]r[eé]e|envoy[eé]e)\s+(\d{4}-\d{2}-\d{2})/gi);
  if (!matches || !matches.length) return null;
  const last = matches[matches.length - 1].match(/(\d{4}-\d{2}-\d{2})/);
  return last ? parseDate(last[1]) : null;
}

function intEnv(name, def) {
  const v = parseInt(String(process.env[name] || '').trim(), 10);
  return Number.isFinite(v) ? v : def;
}

/**
 * Cadence des relances (alignée sur legal-pipeline / dossier-state : J+15 / J+30 / J+62).
 * Surchargeable par variables d'env (mêmes noms que la prod).
 */
function relanceSchedule() {
  return [
    { rang: 1, jours: intEnv('AVAL_RELANCE1_DAYS', 15), ton: 'rappel', canal: 'email' },
    { rang: 2, jours: intEnv('AVAL_RELANCE2_DAYS', 30), ton: 'ferme', canal: 'lrar' },
  ];
}

/** Seuil d'escalade contentieuse (tribunal de commerce) après la MED, en jours. */
function escaladeThresholdDays() {
  return intEnv('AVAL_ESCALADE_DAYS', 62);
}

/**
 * Normalise un dossier Airtable brut en objet aval.
 * @param {object} rec  { fields } OU objet déjà normalisé
 * @returns {object}
 */
function normalizeDossier(rec) {
  const f = (rec && rec.fields) ? rec.fields : (rec || {});
  const pick = (...keys) => {
    for (const k of keys) {
      if (f[k] != null && String(f[k]).trim() !== '') return f[k];
    }
    return '';
  };
  const prenom = pick('Prénom Passager', 'prenom');
  const nom = pick('Nom Passager', 'nom');
  const name = pick('name') || `${prenom} ${nom}`.trim();
  const montantRaw = pick("Montant de l'indemnité", 'indemnite', 'montant');
  const montant = parseInt(String(montantRaw).replace(/[^\d]/g, ''), 10) || 0;
  return {
    id: (rec && rec.id) || '',
    ref: pick('Référence Dossier', 'ref'),
    prenom, nom, name,
    vol: pick('Numéro de vol', 'vol'),
    compagnie: pick('Compagnie Aérienne', 'compagnie'),
    route: pick('Itinéraire', 'Trajet', 'route'),
    dateVol: pick('Date du vol', 'dateVol', 'date'),
    dateDossier: pick('Date Dossier', 'dateDossier'),
    statut: pick('Statut du Dossier Suivi', 'statut'),
    montant,
    remarques: pick('Remarques', 'remarques'),
  };
}

/**
 * PHASE de commission selon le stade du dossier.
 * Amiable (avant contentieux) = 25 % (client garde 75 %).
 * Contentieux (tribunal)       = 40 % (client garde 60 %).
 * @param {'amiable'|'contentieux'} phase
 */
function commission(phase) {
  return phase === 'contentieux'
    ? { phase, commissionPct: 40, clientPct: 60, label: 'phase contentieuse (tribunal)' }
    : { phase: 'amiable', commissionPct: 25, clientPct: 75, label: 'phase amiable' };
}

/**
 * Répartition d'un encaissement selon la phase (déterministe, arrondi au centime).
 * @param {number} montant  montant encaissé (€)
 * @param {'amiable'|'contentieux'} phase
 */
function repartition(montant, phase) {
  const c = commission(phase);
  const total = Math.max(0, Math.round(Number(montant) * 100) / 100);
  const partClient = Math.round(total * c.clientPct) / 100;
  const partRobin = Math.round((total - partClient) * 100) / 100;
  return {
    total,
    phase: c.phase,
    commissionPct: c.commissionPct,
    clientPct: c.clientPct,
    partClient,
    partRobin,
    // Délai de versement AU CLIENT : 5 jours ouvrés après encaissement (jamais 48h).
    versementClientDelai: '5 jours ouvrés après encaissement',
  };
}

/**
 * Prochaine relance due pour un dossier, à partir de la date de MED.
 * @param {object} d  dossier normalisé
 * @param {Date} now
 * @returns {{ due:boolean, rang?:number, canal?:string, ton?:string, joursDepuisMed?:number, prochaine?:object }|null}
 */
function nextRelance(d, now = new Date()) {
  const med = lastMedDate(d.remarques);
  if (!med) return { due: false, raison: 'MED non générée' };
  const jours = daysBetween(med, now);
  const schedule = relanceSchedule();
  // On repère la dernière relance déjà consignée dans les remarques (idempotence).
  const dejaEnvoyees = (String(d.remarques || '').match(/relance\s*#?(\d)/gi) || [])
    .map((s) => parseInt(s.replace(/\D/g, ''), 10));
  const dernierRang = dejaEnvoyees.length ? Math.max(...dejaEnvoyees) : 0;
  for (const step of schedule) {
    if (step.rang <= dernierRang) continue;
    if (jours >= step.jours) {
      return { due: true, rang: step.rang, canal: step.canal, ton: step.ton, joursDepuisMed: jours };
    }
    return { due: false, joursDepuisMed: jours, prochaine: step };
  }
  return { due: false, joursDepuisMed: jours, raison: 'relances épuisées → escalade' };
}

/**
 * Le dossier est-il mûr pour l'escalade au tribunal de commerce ?
 * (MED + relances épuisées + délai dépassé, dossier non terminal.)
 */
function shouldEscalate(d, now = new Date()) {
  const TERMINAL = legal.TERMINAL || new Set();
  if (TERMINAL.has(String(d.statut || '').trim())) return { escalate: false, raison: 'dossier terminal' };
  const med = lastMedDate(d.remarques);
  if (!med) return { escalate: false, raison: 'MED non générée' };
  const jours = daysBetween(med, now);
  const seuil = escaladeThresholdDays();
  if (jours < seuil) return { escalate: false, joursDepuisMed: jours, seuil };
  return {
    escalate: true,
    joursDepuisMed: jours,
    seuil,
    juridiction: 'Tribunal de commerce',
    // La bascule contentieuse fait passer la commission de 25 % à 40 %.
    commission: commission('contentieux'),
    note: 'Escalade contentieuse — frais de procédure avancés par Robin des Airs.',
  };
}

module.exports = {
  DAY_MS,
  parseDate,
  daysBetween,
  ymd,
  lastMedDate,
  relanceSchedule,
  escaladeThresholdDays,
  normalizeDossier,
  commission,
  repartition,
  nextRelance,
  shouldEscalate,
};

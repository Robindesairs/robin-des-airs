/**
 * lib/dossier-state.js — Machine à états AVAL des dossiers (P0-3).
 *
 * Source de vérité UNIQUE et DÉTERMINISTE du cycle de vie post-mandat
 * (cadence amiable-first, décidée 19/06/2026) :
 *   MANDAT_SIGNE → (réclamation amiable) → RECLAMATION_ENVOYEE →
 *   RELANCE_1 (J+30) → (mise en demeure AR24) LRAR_ENVOYEE (J+45) →
 *   MEDIATION (J+15 après LRAR ≈ J+60) → CONTENTIEUX (J+90) … PAYE
 *
 * Lib PURE : aucun I/O, aucun effet de bord. Réutilisable par :
 *   - le futur cron de relances (file « actions dues »),
 *   - generate-claim.js (statut attendu),
 *   - le CRM (mêmes jalons que renderJalons côté client).
 *
 * Ancrage des offsets : 'reclam' (date réclamation) pour relance/mise en demeure,
 * 'lrar' (date mise en demeure) pour la médiation.
 * ⚠️ À RÉALIGNER quand l'aval sera branché : crm/index.html (jalons J+15/J+30/J+62
 * hérités de l'ancienne cadence) + crm-airtable-map.js (ajouter RECLAMATION_ENVOYEE).
 */

'use strict';

// Statuts (mêmes clés que CRM_STATUT_TO_AT)
const STATUTS = {
  BROUILLON: 'BROUILLON',
  ELIGIBLE: 'ELIGIBLE',
  SIGNATURE_ATTENTE: 'SIGNATURE_ATTENTE', // amont : aucune action AVAL (pas dans SCHEDULE)
  MANDAT_SIGNE: 'MANDAT_SIGNE',
  RECLAMATION_ENVOYEE: 'RECLAMATION_ENVOYEE', // réclamation amiable (gratuite) envoyée à la compagnie
  LRAR_ENVOYEE: 'LRAR_ENVOYEE',               // = mise en demeure (AR24) envoyée
  RELANCE_1: 'RELANCE_1',                      // relance gratuite après la réclamation
  RELANCE_2: 'RELANCE_2',                      // conservé (compat) — plus utilisé dans la nouvelle cadence
  MEDIATION: 'MEDIATION',
  CONTENTIEUX: 'CONTENTIEUX',
  PAYE: 'PAYE',
  REFUSE_DEFINITIF: 'REFUSE_DEFINITIF',
  ABANDON: 'ABANDON',
  PRESCRIT: 'PRESCRIT',
};

// Statuts terminaux (aucune action automatique)
const TERMINAL = new Set([
  STATUTS.PAYE,
  STATUTS.REFUSE_DEFINITIF,
  STATUTS.ABANDON,
  STATUTS.PRESCRIT,
  STATUTS.CONTENTIEUX, // piloté à la main (avocat) — pas d'automate
]);

/**
 * Plan des transitions automatiques (cadence amiable-first, décidée 19/06/2026).
 *   MANDAT_SIGNE →(immédiat) réclamation amiable→ RECLAMATION_ENVOYEE
 *   →(J+30 réclam) relance gratuite→ RELANCE_1
 *   →(J+45 réclam) MISE EN DEMEURE (AR24)→ LRAR_ENVOYEE
 *   →(J+15 LRAR ≈ J+60) médiation / NEB→ MEDIATION →(manuel) CONTENTIEUX
 * - anchor : 'reclam' (date réclamation) ou 'lrar' (date mise en demeure) ; absent = immédiat.
 * - offset : jours après la date d'ancrage où l'action est due.
 * - next : statut cible une fois l'action effectuée. - kind : type d'action (route automate/UI).
 * Pourquoi amiable d'abord : moins cher (le recommandé payant ne part que sur les dossiers qui
 * résistent), non agressif, et les médiateurs/NEB EXIGENT une tentative amiable préalable.
 * Prescription 5 ans → le délai n'est pas un risque.
 */
const SCHEDULE = {
  [STATUTS.MANDAT_SIGNE]: {
    kind: 'send_reclamation',
    label: 'Envoyer la réclamation amiable à la compagnie',
    next: STATUTS.RECLAMATION_ENVOYEE,
    immediate: true,             // dès le mandat signé
  },
  [STATUTS.RECLAMATION_ENVOYEE]: {
    kind: 'relance_compagnie',
    label: 'Relance gratuite (J+30)',
    next: STATUTS.RELANCE_1,
    anchor: 'reclam', offset: 30,
  },
  [STATUTS.RELANCE_1]: {
    kind: 'send_med',
    label: 'Mise en demeure — AR24 (J+45)',
    next: STATUTS.LRAR_ENVOYEE,
    anchor: 'reclam', offset: 45,
  },
  [STATUTS.LRAR_ENVOYEE]: {
    kind: 'mediation',
    label: 'Médiation / saisine NEB (J+15 après la mise en demeure)',
    next: STATUTS.MEDIATION,
    anchor: 'lrar', offset: 15,
  },
  [STATUTS.MEDIATION]: {
    kind: 'mediation_followup',
    label: 'Suivi médiation — décision go/no-go contentieux',
    next: STATUTS.CONTENTIEUX,
    anchor: 'lrar', offset: 15,  // référence ; pas d'auto-avancement (humain décide)
    manual: true,
  },
};

// ───────────────────────── helpers dates (purs, sans dépendance) ─────────────

function parseYmd(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

function toYmd(dt) {
  return dt && !isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : null;
}

function addDays(iso, n) {
  const dt = parseYmd(iso);
  if (!dt) return null;
  dt.setUTCDate(dt.getUTCDate() + n);
  return toYmd(dt);
}

/** Différence en jours entiers (b - a), null si l'une des dates est invalide. */
function diffDays(aIso, bIso) {
  const a = parseYmd(aIso), b = parseYmd(bIso);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function nowYmd(nowIso) {
  if (nowIso) {
    const p = parseYmd(nowIso);
    if (p) return toYmd(p);
  }
  return new Date().toISOString().slice(0, 10);
}

// ───────────────────────────────── API ──────────────────────────────────────

/** Jalons J+15 / J+30 / J+62 à partir de la date LRAR (ou nulls si pas de date). */
function computeJalons(lrarIso) {
  return {
    j15: addDays(lrarIso, 15),
    j30: addDays(lrarIso, 30),
    j62: addDays(lrarIso, 62),
  };
}

/** Statut suivant dans le cycle automatique, ou null si terminal/inconnu. */
function nextStatut(statut) {
  const s = SCHEDULE[statut];
  return s ? s.next : null;
}

/** True si le statut est terminal (aucune action automatique). */
function isTerminal(statut) {
  return TERMINAL.has(statut);
}

/**
 * Prochaine action due pour un dossier.
 * @param {{statut:string, lrar?:string|null, date_statut?:string|null}} dossier
 * @param {string} [nowIso] date de référence (défaut = aujourd'hui)
 * @returns {{
 *   statut:string, kind:string, label:string, nextStatut:string|null,
 *   dueDate:string|null, overdue:boolean, daysUntilDue:number|null,
 *   needsLrarDate:boolean, manual:boolean, actionable:boolean
 * }}
 */
function nextAction(dossier, nowIso) {
  const statut = (dossier && dossier.statut) || '';
  const lrar = (dossier && dossier.lrar) || null;
  const reclam = (dossier && dossier.reclam) || null;
  const now = nowYmd(nowIso);

  const base = {
    statut,
    kind: 'none',
    label: '',
    nextStatut: null,
    dueDate: null,
    overdue: false,
    daysUntilDue: null,
    needsLrarDate: false,
    manual: false,
    actionable: false,
  };

  const plan = SCHEDULE[statut];
  if (!plan || isTerminal(statut)) {
    base.kind = isTerminal(statut) ? 'terminal' : 'none';
    return base;
  }

  base.kind = plan.kind;
  base.label = plan.label;
  base.nextStatut = plan.next;
  base.manual = !!plan.manual;

  // Action due immédiatement (ex. envoyer la réclamation dès mandat signé)
  if (plan.immediate || plan.offset == null) {
    base.dueDate = null;
    base.overdue = true;       // à traiter sans attendre
    base.daysUntilDue = 0;
    base.actionable = !plan.manual;
    return base;
  }

  // Actions planifiées : ancrées sur la date de réclamation OU de mise en demeure (LRAR)
  const anchorDate = plan.anchor === 'lrar' ? lrar : reclam;
  if (!anchorDate) {
    base.needsLrarDate = true;   // nom conservé (compat) = « date d'ancrage manquante »
    base.actionable = false;     // impossible de planifier sans date d'ancrage
    return base;
  }

  base.dueDate = addDays(anchorDate, plan.offset);
  base.daysUntilDue = diffDays(now, base.dueDate); // négatif = en retard
  base.overdue = base.daysUntilDue != null && base.daysUntilDue <= 0;
  base.actionable = !plan.manual && base.overdue;
  return base;
}

/**
 * Liste des dossiers dont une action est DUE à `nowIso`, triée par échéance.
 * Pour le futur cron de relances et la « file d'actions dues » du CRM.
 * Ignore les dossiers manuels (médiation/contentieux) et ceux sans date LRAR.
 */
function dueActions(dossiers, nowIso) {
  const now = nowYmd(nowIso);
  const out = [];
  for (const d of Array.isArray(dossiers) ? dossiers : []) {
    const a = nextAction(d, now);
    if (a.actionable) out.push({ ref: d.id || d.ref || null, ...a });
  }
  // immédiats (dueDate null) d'abord, puis par date croissante
  out.sort((x, y) => {
    if (x.dueDate === y.dueDate) return 0;
    if (!x.dueDate) return -1;
    if (!y.dueDate) return 1;
    return x.dueDate < y.dueDate ? -1 : 1;
  });
  return out;
}

/**
 * Applique l'avancement d'un dossier (PUR : renvoie un patch, n'écrit rien).
 * @returns {{statut:string, date_statut:string, lrar?:string}|null}
 *   patch à appliquer, ou null si pas d'avancement possible.
 */
function advance(dossier, nowIso) {
  const now = nowYmd(nowIso);
  const a = nextAction(dossier, now);
  if (!a.nextStatut || a.manual) return null;
  const patch = { statut: a.nextStatut, date_statut: now };
  // Au passage à RECLAMATION_ENVOYEE → date réclamation ; à LRAR_ENVOYEE → date mise en demeure.
  if (a.nextStatut === STATUTS.RECLAMATION_ENVOYEE && !(dossier && dossier.reclam)) patch.reclam = now;
  if (a.nextStatut === STATUTS.LRAR_ENVOYEE && !(dossier && dossier.lrar)) patch.lrar = now;
  return patch;
}

module.exports = {
  STATUTS,
  TERMINAL,
  SCHEDULE,
  computeJalons,
  nextStatut,
  isTerminal,
  nextAction,
  dueActions,
  advance,
  // helpers dates exposés (tests / réutilisation)
  addDays,
  diffDays,
};

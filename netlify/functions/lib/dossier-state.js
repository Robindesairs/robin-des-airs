/**
 * lib/dossier-state.js — Machine à états AVAL des dossiers (P0-3).
 *
 * Source de vérité UNIQUE et DÉTERMINISTE du cycle de vie post-mandat :
 *   MANDAT_SIGNE → (mise en demeure) → LRAR_ENVOYEE → RELANCE_1 (J+15) →
 *   RELANCE_2 (J+30) → MEDIATION (J+62) → CONTENTIEUX … PAYE
 *
 * Lib PURE : aucun I/O, aucun effet de bord. Réutilisable par :
 *   - le futur cron de relances (file « actions dues »),
 *   - generate-claim.js (statut attendu),
 *   - le CRM (mêmes jalons que renderJalons côté client).
 *
 * Les offsets relances sont comptés en jours À PARTIR DE LA DATE LRAR (envoi de
 * la mise en demeure), alignés sur crm/index.html (J+15 / J+30 / J+62) et sur
 * l'enum crm-airtable-map.js.
 */

'use strict';

// Statuts (mêmes clés que CRM_STATUT_TO_AT)
const STATUTS = {
  BROUILLON: 'BROUILLON',
  ELIGIBLE: 'ELIGIBLE',
  MANDAT_SIGNE: 'MANDAT_SIGNE',
  LRAR_ENVOYEE: 'LRAR_ENVOYEE',
  RELANCE_1: 'RELANCE_1',
  RELANCE_2: 'RELANCE_2',
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
 * Plan des transitions automatiques.
 * - offsetFromLrar : jours après la date LRAR où l'action est due (null = due immédiatement).
 * - next : statut cible une fois l'action effectuée.
 * - kind : type d'action (pour router l'automate / l'UI).
 */
const SCHEDULE = {
  [STATUTS.MANDAT_SIGNE]: {
    kind: 'send_med',
    label: 'Générer et envoyer la mise en demeure',
    next: STATUTS.LRAR_ENVOYEE,
    offsetFromLrar: null,        // due dès le mandat signé (pas de date LRAR encore)
    immediate: true,
  },
  [STATUTS.LRAR_ENVOYEE]: {
    kind: 'relance_1',
    label: 'Relance 1 (J+15)',
    next: STATUTS.RELANCE_1,
    offsetFromLrar: 15,
  },
  [STATUTS.RELANCE_1]: {
    kind: 'relance_2',
    label: 'Relance 2 (J+30)',
    next: STATUTS.RELANCE_2,
    offsetFromLrar: 30,
  },
  [STATUTS.RELANCE_2]: {
    kind: 'mediation',
    label: 'Médiation / saisine NEB (J+62)',
    next: STATUTS.MEDIATION,
    offsetFromLrar: 62,
  },
  [STATUTS.MEDIATION]: {
    kind: 'mediation_followup',
    label: 'Suivi médiation — décision go/no-go contentieux',
    next: STATUTS.CONTENTIEUX,
    offsetFromLrar: 62,          // référence ; pas d'auto-avancement (humain décide)
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

  // Action due immédiatement (ex. envoyer la mise en demeure dès mandat signé)
  if (plan.immediate || plan.offsetFromLrar == null) {
    base.dueDate = null;
    base.overdue = true;       // à traiter sans attendre
    base.daysUntilDue = 0;
    base.actionable = !plan.manual;
    return base;
  }

  // Actions relances : nécessitent la date LRAR
  if (!lrar) {
    base.needsLrarDate = true;
    base.actionable = false;   // impossible de planifier sans date d'envoi
    return base;
  }

  base.dueDate = addDays(lrar, plan.offsetFromLrar);
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
  // Au passage à LRAR_ENVOYEE, fixer la date LRAR si absente (= date d'envoi)
  if (a.nextStatut === STATUTS.LRAR_ENVOYEE && !(dossier && dossier.lrar)) {
    patch.lrar = now;
  }
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

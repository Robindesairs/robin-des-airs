/**
 * Bureau Robin — routines quotidiennes des postes qui n'ont pas encore d'automate dédié.
 *
 * Logique PURE (sans I/O, sans IA). Calcule, à partir des vraies données (dossiers
 * Airtable + agences + agrégats + file juridique), la « tâche du jour » de chaque poste :
 *   0 Aïcha   (DG)            → roll-up cross-desk : ce qui doit avancer aujourd'hui
 *   4 Sofia   (Partenaires)   → agences à contacter / réactiver
 *   5 Karim   (Trésorerie)    → indemnités encaissées à reverser au client (< 48 h)
 *   6 Léa     (Suivi client)  → dossiers à relancer (pièces) + satisfaction à confirmer
 *   8 Nadia   (Rentabilité)   → dossiers gagnés ce mois vs seuil de rentabilité
 *
 * Les postes 1 (Malik/radar), 2 (Robin/bot), 3 (Me Lefèvre/legal-daily),
 * 7 (Yanis/ad-watch), 9 (Aïssa/instagram-publisher) ont DÉJÀ leur propre routine
 * 24/24 — on ne fabrique rien pour eux ici (cf. [[no invented activity]]).
 *
 * AUCUN envoi, aucun changement de statut : ces routines PRÉPARENT la liste de travail.
 */

'use strict';

// Statuts (libellés « Statut du Dossier Suivi », cf. bureau-stats).
const COMPAGNIE_PAYE = new Set(['Payé', 'Indemnisé', 'Indemnité reçue']); // compagnie a payé → reversement client dû
const CLIENT_PAYE = new Set(['Payé client', 'Clôturé payé']); // déjà reversé → clos
const WON = new Set([...COMPAGNIE_PAYE, ...CLIENT_PAYE]);
const ENGAGED = new Set(['Mandat signé', 'LRAR envoyée', 'Documents en cours', 'Médiation', 'Contentieux']);

function intEnv(name, def) {
  const v = parseInt(String(process.env[name] || '').trim(), 10);
  return Number.isFinite(v) ? v : def;
}
function num(v) {
  const n = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function isTest(d) {
  return /\b(test|d[ée]mo|demo|rda-test|exemple|sample)\b/i.test(`${d.ref || ''} ${d.name || ''}`);
}
/** Mois courant 'AAAA-MM' en heure Paris pour une Date. */
function parisMonth(now) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(now);
}
function ymOf(dateStr) {
  const m = String(dateStr || '').match(/^(\d{4})-(\d{2})/) || String(dateStr || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return '';
  return m.length === 4 ? `${m[3]}-${m[2]}` : `${m[1]}-${m[2]}`;
}

const ICON = { rouge: '🔴', orange: '🟠', vert: '🟢', info: '⚪' };
const RANK = { rouge: 3, orange: 2, vert: 1, info: 0 };
function maxUrg(list) {
  return list.reduce((a, u) => (RANK[u] > RANK[a] ? u : a), 'vert');
}

/**
 * @param {object} input {
 *   now:Date,
 *   dossiers:[{ref,name,statut,indemnite,montantClient,dateDossier}],
 *   agences:{ actives:number, prospects:number, total:number },
 *   legal:{ total, counts:{rouge,orange,...} }|null,
 *   seuilMensuel:number
 * }
 * @returns {object} briefs indexés par n° de poste { [i]: { name, titre, actions, kpi, kpiLabel, urgence, top } }
 */
function computeDeskBriefs(input) {
  const now = input.now || new Date();
  const dossiers = (input.dossiers || []).filter((d) => !isTest(d));
  const ag = input.agences || { actives: 0, prospects: 0, total: 0 };
  const legal = input.legal || null;
  const seuil = input.seuilMensuel != null ? input.seuilMensuel : intEnv('BUREAU_SEUIL_MENSUEL', 4);
  const mois = parisMonth(now);

  // ── Trésorerie (Karim) ──
  const aReverser = dossiers.filter((d) => COMPAGNIE_PAYE.has(d.statut) && !CLIENT_PAYE.has(d.statut));
  const montantAReverser = aReverser.reduce((s, d) => s + (num(d.montantClient) || 0), 0);
  const eurPipeline = dossiers
    .filter((d) => ENGAGED.has(d.statut) || WON.has(d.statut))
    .reduce((s, d) => s + (num(d.indemnite) || num(d.montantClient) || 0), 0);

  // ── Suivi client (Léa) ──
  const docsEnCours = dossiers.filter((d) => d.statut === 'Documents en cours');
  const gagnesMois = dossiers.filter((d) => WON.has(d.statut) && ymOf(d.dateDossier) === mois);
  const suivis = dossiers.filter((d) => ENGAGED.has(d.statut) || WON.has(d.statut)).length;

  // ── Rentabilité (Nadia) ──
  const gagnesMoisN = gagnesMois.length;
  const ecartSeuil = Math.max(seuil - gagnesMoisN, 0);

  const briefs = {};

  // 4 — Sofia (Partenaires)
  {
    const actions = [];
    if (ag.prospects > 0) actions.push({ txt: `${ag.prospects} agence(s) « à contacter » à relancer`, urgence: 'orange' });
    actions.push({ txt: `${ag.actives} agence(s) active(s) à animer (objectif 55)`, urgence: 'vert' });
    briefs[4] = pack('Sofia Mendy', 'Recrutement & animation du réseau', actions, ag.actives, 'agences actives');
  }

  // 5 — Karim (Trésorerie)
  {
    const actions = [];
    if (aReverser.length > 0) {
      actions.push({ txt: `${aReverser.length} indemnité(s) encaissée(s) à REVERSER au client (< 48 h) — ${Math.round(montantAReverser)} €`, urgence: 'rouge' });
    } else {
      actions.push({ txt: 'Aucun reversement en attente — trésorerie à jour', urgence: 'vert' });
    }
    actions.push({ txt: `${Math.round(eurPipeline)} € en cours de récupération (pipeline)`, urgence: 'vert' });
    briefs[5] = pack('Karim Benali', 'Encaissements & reversements clients', actions, Math.round(eurPipeline), '€ en récupération');
  }

  // 6 — Léa (Suivi client)
  {
    const actions = [];
    if (docsEnCours.length > 0) actions.push({ txt: `${docsEnCours.length} dossier(s) « documents en cours » — relancer le client (pièces)`, urgence: 'orange' });
    if (gagnesMois.length > 0) actions.push({ txt: `${gagnesMois.length} dossier(s) gagné(s) ce mois — confirmer la satisfaction`, urgence: 'vert' });
    if (!actions.length) actions.push({ txt: 'Aucun dossier en attente de relance client', urgence: 'vert' });
    briefs[6] = pack('Léa Fontaine', 'Suivi dossiers & satisfaction', actions, suivis, 'dossiers suivis');
  }

  // 8 — Nadia (Rentabilité)
  {
    const actions = [];
    if (ecartSeuil > 0) {
      actions.push({ txt: `${gagnesMoisN}/${seuil} dossier(s) gagné(s) ce mois — ${ecartSeuil} de plus pour atteindre le seuil`, urgence: 'orange' });
    } else {
      actions.push({ txt: `Seuil atteint : ${gagnesMoisN}/${seuil} dossier(s) gagné(s) ce mois ✅`, urgence: 'vert' });
    }
    briefs[8] = pack('Nadia Chérif', 'Contrôle de gestion & rentabilité', actions, seuil, 'seuil / mois');
  }

  // 0 — Aïcha (DG) : roll-up des urgences des autres postes + juridique + radar
  {
    const actions = [];
    const legalRouge = legal && legal.counts ? legal.counts.rouge || 0 : 0;
    const legalAct = legal && legal.counts ? (legal.counts.rouge || 0) + (legal.counts.orange || 0) : 0;
    if (legalAct > 0) actions.push({ txt: `${legalAct} action(s) juridique(s) à traiter (Me Lefèvre)${legalRouge ? ` dont ${legalRouge} urgente(s)` : ''}`, urgence: legalRouge ? 'rouge' : 'orange' });
    if (aReverser.length > 0) actions.push({ txt: `${aReverser.length} reversement(s) client à exécuter (Karim)`, urgence: 'rouge' });
    if (ag.prospects > 0) actions.push({ txt: `${ag.prospects} agence(s) à contacter (Sofia)`, urgence: 'orange' });
    if (docsEnCours.length > 0) actions.push({ txt: `${docsEnCours.length} dossier(s) en attente de pièces (Léa)`, urgence: 'orange' });
    if (ecartSeuil > 0) actions.push({ txt: `Rentabilité : ${gagnesMoisN}/${seuil} dossiers gagnés ce mois (Nadia)`, urgence: 'orange' });
    if (!actions.length) actions.push({ txt: 'Tout est à jour — aucune action critique aujourd’hui', urgence: 'vert' });
    briefs[0] = pack('Aïcha Diallo', 'Pilotage — point du jour', actions, Math.round(eurPipeline), '€ en récupération');
  }

  return briefs;
}

function pack(name, titre, actions, kpi, kpiLabel) {
  const urgence = maxUrg(actions.map((a) => a.urgence));
  const top = actions[0] ? actions[0].txt : '';
  return { name, titre, actions, kpi, kpiLabel, urgence, top };
}

/** Brief WhatsApp consolidé pour le propriétaire (CallMeBot). */
function summarizeBureauForOwner(briefs, dateLabel) {
  const order = [0, 5, 6, 4, 8]; // DG d'abord, puis trésorerie, suivi, partenaires, rentabilité
  const lines = ['🏢 Bureau Robin — actions du jour'];
  if (dateLabel) lines.push(`📅 ${dateLabel}`);
  lines.push('');
  let any = false;
  for (const i of order) {
    const b = briefs[i];
    if (!b) continue;
    if (b.urgence === 'vert') continue; // ne lister que ce qui demande une action
    any = true;
    lines.push(`${ICON[b.urgence]} ${b.name} — ${b.titre}`);
    lines.push(`   ${b.top}`);
  }
  if (!any) {
    lines.push('✅ Tous les postes sont à jour aujourd’hui.');
  }
  lines.push('');
  lines.push('🔗 robindesairs.eu/bureau');
  return lines.join('\n');
}

/** Y a-t-il au moins une action (orange/rouge) à pousser au propriétaire ? */
function hasActionables(briefs) {
  return Object.values(briefs).some((b) => b.urgence === 'orange' || b.urgence === 'rouge');
}

module.exports = {
  computeDeskBriefs,
  summarizeBureauForOwner,
  hasActionables,
  ICON,
  COMPAGNIE_PAYE,
  CLIENT_PAYE,
  WON,
  ENGAGED,
};

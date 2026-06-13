/**
 * Cabinet Me Lefèvre — logique « pipeline aval » pure (sans I/O).
 *
 * À partir des dossiers Airtable engagés, calcule pour CHAQUE dossier la prochaine
 * action juridique (mise en demeure, relance, escalade NEB, contentieux) et son
 * urgence, en croisant statut + dates + référentiel compagnie (NEB, prescription,
 * payeur, éligibilité non-UE). 100 % déterministe — aucune IA, aucun envoi.
 *
 * Cycle de vie (statuts « Statut du Dossier Suivi », cf. bureau-stats / morning-report) :
 *   Signature en attente / Mandat à envoyer  → AMONT (Robin/Léa) — pas encore Me Lefèvre
 *   Mandat signé                             → MISE EN DEMEURE à préparer (SLA < 5 j)
 *   Documents en cours                       → pièces manquantes (relancer le client)
 *   LRAR envoyée                             → relance compagnie → escalade NEB → contentieux
 *   Médiation / Contentieux                  → suivi de procédure
 *   Refus (non définitif)                    → escalade NEB
 *   Payé* / Refus définitif / Abandon / Prescrit → TERMINAL (sorti du pipeline)
 *
 * La PRESCRIPTION (date du vol + N ans) est vérifiée pour tout dossier non terminal :
 * c'est le délai dur. Une échéance proche prime sur toute autre urgence.
 */

'use strict';

const DAY_MS = 24 * 3600 * 1000;

// Statuts hors-pipeline (dossier clos, dans un sens ou l'autre).
const TERMINAL = new Set([
  'Payé', 'Payé client', 'Indemnisé', 'Indemnité reçue', 'Clôturé payé',
  'Refus définitif', 'Abandon', 'Prescrit', 'Clôturé',
]);

// Statuts encore « en amont » (du ressort de Robin/Léa, pas du juriste).
const AMONT = new Set(['Signature en attente', 'Mandat à envoyer', 'Nouveau', '']);

function intEnv(name, def) {
  const v = parseInt(String(process.env[name] || '').trim(), 10);
  return Number.isFinite(v) ? v : def;
}

/** Seuils (jours / années) — surchargeables par variables d'env. */
function defaultThresholds() {
  return {
    medSlaDays: intEnv('LEGAL_MED_SLA_DAYS', 5), // mandat signé → MED envoyée
    relanceDays: intEnv('LEGAL_RELANCE_DAYS', 14), // MED → relance (= délai donné à la cie)
    escaladeDays: intEnv('LEGAL_ESCALADE_DAYS', 30), // MED → escalade NEB
    contentieuxDays: intEnv('LEGAL_CONTENTIEUX_DAYS', 45), // MED → contentieux
    prescriptionYears: intEnv('LEGAL_PRESCRIPTION_YEARS', 5), // for FR par défaut
    prescriptionAlertDays: intEnv('LEGAL_PRESCRIPTION_ALERT_DAYS', 90), // alerte prescription
  };
}

/** 'JJ/MM/AAAA' ou 'AAAA-MM-JJ...' → Date (minuit UTC) ou null. */
function parseDate(s) {
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

/** Dernière date « MED générée AAAA-MM-JJ » trouvée dans les remarques. */
function lastMedDate(remarques) {
  const matches = String(remarques || '').match(/MED\s+(?:générée|envoyée|envoyee)\s+(\d{4}-\d{2}-\d{2})/gi);
  if (!matches || !matches.length) return null;
  const last = matches[matches.length - 1].match(/(\d{4}-\d{2}-\d{2})/);
  return last ? parseDate(last[1]) : null;
}

/** Niveau d'urgence → score numérique (tri décroissant). */
const URGENCE_SCORE = { rouge: 300, orange: 150, vert: 50, info: 10 };

/**
 * Calcule l'action juridique d'un dossier.
 * @param {object} d  dossier normalisé { ref,name,statut,vol,compagnie,route,dateVol,dateDossier,montant,remarques }
 * @param {object} ctx { now:Date, thresholds, getAirline:(volOuCie)=>airline|null, africanDeparture?:(route)=>{city,iata}|null }
 * @returns {object|null} item de file ou null si terminal / amont
 */
function evaluateDossier(d, ctx) {
  const statut = String(d.statut || '').trim();
  if (TERMINAL.has(statut)) return null;
  if (AMONT.has(statut)) return null;

  const now = ctx.now;
  const T = ctx.thresholds;
  const airline = ctx.getAirline ? ctx.getAirline(d.vol || d.compagnie) : null;

  const dateVol = parseDate(d.dateVol);
  const dateDossier = parseDate(d.dateDossier);
  const medDate = lastMedDate(d.remarques);

  // ── Prescription (délai dur, tous statuts) ──
  let prescription = null;
  if (dateVol) {
    const limite = new Date(dateVol.getTime());
    limite.setUTCFullYear(limite.getUTCFullYear() + T.prescriptionYears);
    const joursRestants = daysBetween(now, limite);
    const ruleTxt = (airline && airline.prescription) || `${T.prescriptionYears} ans (for FR par défaut)`;
    prescription = { limite: ymd(limite), joursRestants, regle: ruleTxt };
  }

  // ── Éligibilité (garde-fou non-UE au départ d'Afrique, cf. generate-claim) ──
  let alerte = null;
  if (airline && airline.ue === false) {
    const dep = ctx.africanDeparture ? ctx.africanDeparture(d.route) : null;
    alerte = dep
      ? { niveau: 'bloquant', code: 'NON_UE_DEPART_AFRIQUE',
          message: `${airline.nom} (non-UE) au départ de ${dep.city} (${dep.iata}) — hors CE 261 (art. 3§1). Vérifier le sens du vol AVANT toute action.` }
      : { niveau: 'avertissement', code: 'NON_UE_VERIFIER_DEPART',
          message: `${airline.nom} (non-UE) — CE 261 applicable seulement AU DÉPART de l'UE. Vérifier le départ.` };
  }

  // ── Action selon le statut ──
  let action = '', detail = '', urgence = 'vert', joursDepuis = null, dueLabel = '';

  if (statut === 'Mandat signé') {
    joursDepuis = daysBetween(dateDossier, now);
    const ageOk = joursDepuis != null;
    const medFaite = !!medDate;
    if (medFaite) {
      action = 'Envoyer la mise en demeure (déjà générée)';
      detail = `MED prête depuis le ${ymd(medDate)} — à valider et expédier (LRAR/AR24).`;
      urgence = 'orange';
    } else {
      action = 'Préparer la mise en demeure CE 261';
      detail = ageOk
        ? `Mandat signé depuis ${joursDepuis} j — SLA ${T.medSlaDays} j.`
        : `Mandat signé — générer la MED (SLA ${T.medSlaDays} j).`;
      urgence = ageOk && joursDepuis > T.medSlaDays ? 'rouge' : ageOk && joursDepuis >= T.medSlaDays - 1 ? 'orange' : 'vert';
    }
    dueLabel = ageOk ? `J+${joursDepuis} / SLA ${T.medSlaDays} j` : `SLA ${T.medSlaDays} j`;
  } else if (statut === 'Documents en cours') {
    action = 'Relancer le client — pièces manquantes';
    detail = 'Pièce d’identité / e-billet requis avant envoi à la compagnie (réclamation invérifiable sinon).';
    urgence = 'orange';
  } else if (statut === 'LRAR envoyée') {
    const ref = medDate || dateDossier;
    joursDepuis = daysBetween(ref, now);
    if (joursDepuis == null) {
      action = 'Suivre la réponse de la compagnie';
      urgence = 'vert';
    } else if (joursDepuis >= T.contentieuxDays) {
      action = 'Engager le contentieux';
      detail = `${joursDepuis} j sans paiement (≥ ${T.contentieuxDays} j). Saisine juridiction de proximité / injonction de payer.`;
      urgence = 'rouge';
    } else if (joursDepuis >= T.escaladeDays) {
      action = `Escalade NEB${airline && airline.neb ? ` — ${airline.neb.nom}` : ''}`;
      detail = `${joursDepuis} j sans réponse (≥ ${T.escaladeDays} j). Saisir l'organisme national de contrôle.`;
      urgence = 'rouge';
    } else if (joursDepuis >= T.relanceDays) {
      action = 'Relancer la compagnie (mise en demeure ferme)';
      detail = `${joursDepuis} j écoulés (délai donné : ${T.relanceDays} j). Relance + préavis d'escalade.`;
      urgence = 'orange';
    } else {
      action = 'Suivre la réponse de la compagnie';
      detail = `${joursDepuis} j / ${T.relanceDays} j de délai accordé.`;
      urgence = 'vert';
    }
    dueLabel = joursDepuis != null ? `J+${joursDepuis} depuis MED` : '';
  } else if (statut === 'Médiation') {
    action = 'Suivre la médiation';
    detail = 'Relancer le médiateur si pas de retour sous 30 j.';
    urgence = 'vert';
  } else if (statut === 'Contentieux') {
    action = 'Suivre la procédure contentieuse';
    detail = 'Vérifier les délais de procédure et les pièces du dossier.';
    urgence = 'orange';
  } else if (/refus/i.test(statut)) {
    action = `Escalade NEB${airline && airline.neb ? ` — ${airline.neb.nom}` : ''}`;
    detail = `Refus de la compagnie (${statut}). Contester via l'organisme national de contrôle.`;
    urgence = 'rouge';
  } else {
    action = 'Vérifier le statut du dossier';
    detail = `Statut « ${statut} » non routé — à classer.`;
    urgence = 'info';
  }

  // La prescription imminente prime sur tout.
  if (prescription && prescription.joursRestants != null) {
    if (prescription.joursRestants <= 0) {
      urgence = 'rouge';
      action = 'PRESCRIT — vérifier d’urgence';
      detail = `Délai de prescription dépassé (${prescription.limite}). ${detail}`;
    } else if (prescription.joursRestants <= T.prescriptionAlertDays) {
      urgence = 'rouge';
      detail = `⏳ Prescription dans ${prescription.joursRestants} j (${prescription.limite}). ${detail}`;
    }
  }
  // Le garde-fou éligibilité bloquant abaisse l'urgence d'action (ne pas s'acharner).
  if (alerte && alerte.niveau === 'bloquant' && urgence === 'rouge' && !(prescription && prescription.joursRestants <= 0)) {
    urgence = 'orange';
  }

  return {
    ref: d.ref || '',
    name: d.name || '',
    vol: d.vol || '',
    compagnie: (airline && airline.nom) || d.compagnie || '',
    airlineCode: airline ? airline.iata || '' : '',
    statut,
    action,
    detail,
    urgence,
    score: URGENCE_SCORE[urgence] + (prescription && prescription.joursRestants != null && prescription.joursRestants <= T.prescriptionAlertDays ? Math.max(0, 100 - prescription.joursRestants) : 0) + (joursDepuis || 0),
    joursDepuis,
    dueLabel,
    montant: d.montant || null,
    payeur: airline ? airline.conversion || 'inconnue' : 'inconnue',
    neb: airline && airline.neb ? airline.neb.nom : '',
    prescription,
    alerte,
  };
}

/** Exclut le bruit de test/démo (la base contient des dossiers de test). */
function isTestDossier(d) {
  const hay = `${d.ref || ''} ${d.name || ''}`.toLowerCase();
  return /\b(test|d[ée]mo|demo|rda-test|exemple|sample)\b/.test(hay);
}

/**
 * Construit la file de travail du jour de Me Lefèvre.
 * @param {Array} records  dossiers normalisés
 * @param {object} opts    { now, thresholds, getAirline, africanDeparture, includeTest }
 */
function buildLegalQueue(records, opts = {}) {
  const now = opts.now || new Date();
  const thresholds = opts.thresholds || defaultThresholds();
  const ctx = { now, thresholds, getAirline: opts.getAirline, africanDeparture: opts.africanDeparture };

  const items = [];
  for (const d of records || []) {
    if (!opts.includeTest && isTestDossier(d)) continue;
    const it = evaluateDossier(d, ctx);
    if (it) items.push(it);
  }
  items.sort((a, b) => b.score - a.score);

  const counts = { total: items.length, rouge: 0, orange: 0, vert: 0, info: 0, prescriptionProche: 0, eligibiliteDouteuse: 0 };
  for (const it of items) {
    counts[it.urgence] = (counts[it.urgence] || 0) + 1;
    if (it.prescription && it.prescription.joursRestants != null && it.prescription.joursRestants <= thresholds.prescriptionAlertDays) counts.prescriptionProche++;
    if (it.alerte) counts.eligibiliteDouteuse++;
  }

  return { generatedAt: now.toISOString(), thresholds, total: items.length, counts, items };
}

const URGENCE_ICON = { rouge: '🔴', orange: '🟠', vert: '🟢', info: '⚪' };

/** Construit le brief WhatsApp (CallMeBot, ~1500 chars). */
function summarizeForOwner(queue, dateLabel, maxItems = 8) {
  const c = queue.counts;
  const lines = [];
  lines.push('⚖️ Cabinet Me Lefèvre');
  if (dateLabel) lines.push(`📅 ${dateLabel}`);
  lines.push('');
  lines.push(`📂 ${c.total} dossier(s) au pipeline`);
  lines.push(`🔴 ${c.rouge || 0} urgent · 🟠 ${c.orange || 0} à faire · 🟢 ${c.vert || 0} en suivi`);
  if (c.prescriptionProche) lines.push(`⏳ ${c.prescriptionProche} prescription(s) < ${queue.thresholds.prescriptionAlertDays} j`);
  if (c.eligibiliteDouteuse) lines.push(`⚠️ ${c.eligibiliteDouteuse} éligibilité(s) à vérifier (non-UE)`);
  lines.push('');

  const urgents = queue.items.filter((i) => i.urgence === 'rouge' || i.urgence === 'orange').slice(0, maxItems);
  if (!urgents.length) {
    lines.push('✅ Aucune action urgente aujourd’hui.');
  } else {
    lines.push('À TRAITER :');
    for (const it of urgents) {
      const who = it.name ? ` ${it.name}` : '';
      const cie = it.compagnie ? ` · ${it.compagnie}` : '';
      lines.push(`${URGENCE_ICON[it.urgence]} ${it.ref}${who}${cie}`);
      lines.push(`   ${it.action}${it.dueLabel ? ` (${it.dueLabel})` : ''}`);
    }
    if (queue.items.filter((i) => i.urgence === 'rouge' || i.urgence === 'orange').length > maxItems) {
      lines.push(`   … +${queue.items.filter((i) => i.urgence === 'rouge' || i.urgence === 'orange').length - maxItems} autre(s)`);
    }
  }
  lines.push('');
  lines.push('🔗 robindesairs.eu/bureau (poste Me Lefèvre)');
  return lines.join('\n');
}

module.exports = {
  buildLegalQueue,
  evaluateDossier,
  summarizeForOwner,
  defaultThresholds,
  parseDate,
  lastMedDate,
  TERMINAL,
  AMONT,
  URGENCE_ICON,
};

/**
 * Espace agence partenaire — API Airtable (Robin des Airs)
 */
const AGENCY_AUTH_URL = '/api/agency-auth';
const AGENCY_DOSSIERS_URL = '/api/agency-dossiers';

let currentAgency = null;
let agencyTrialClientOnly = false;
let dossiers = [];
let pricing = {
  commissionGmd: 3800,
  commissionEur: 45.24,
  clientNetEur: 420,
  indemnityEur: 600,
  robinEur: 135,
  commissionFcfa: 29675,
};
let _agencyLoading = false;

function t(key) {
  return typeof AgenceI18n !== 'undefined' ? AgenceI18n.t(key) : key;
}

function agencyFetch(url, options) {
  options = options || {};
  options.credentials = 'same-origin';
  return fetch(url, options);
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoneyHtml(amountEur) {
  if (typeof AgenceCurrency !== 'undefined') {
    return AgenceCurrency.formatMoneyHtml(amountEur);
  }
  return escHtml(String(Math.round(amountEur))) + ' €';
}

function setMoneyEl(id, amountEur) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = formatMoneyHtml(amountEur);
}

function commissionEurTotal(d) {
  return (d.nbPassagers || 1) * pricing.commissionEur;
}

function commissionGmdTotal(d) {
  const per = pricing.commissionGmd || Math.round(pricing.commissionEur * 84);
  return (d.nbPassagers || 1) * per;
}

/** Montant commission pour affichage (GMD prioritaire si devise GMD). */
function formatCommissionHtml(d) {
  if (typeof AgenceCurrency !== 'undefined' && AgenceCurrency.getCurrency() === 'GMD' && pricing.commissionGmd) {
    const n = commissionGmdTotal(d);
    return (
      '<span class="money-main">' +
      escHtml(n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })) +
      ' GMD</span>'
    );
  }
  return formatMoneyHtml(commissionEurTotal(d));
}

function formatAirlineTransparency(d) {
  if (!d) return '';
  const dec = d.airlineDecision;
  const ref = d.indemniteReferenceEur;
  const col = d.indemniteCollectedEur;
  const pct = d.airlinePercent;
  const just = (d.airlineJustification || '').trim();
  const en = typeof AgenceI18n !== 'undefined' && AgenceI18n.getLang && AgenceI18n.getLang() === 'en';
  // Compute weeks-since-submission if date present
  let weeks = null;
  if (d.date) {
    const sub = new Date(d.date);
    if (!isNaN(sub.getTime())) {
      weeks = Math.max(0, Math.floor((Date.now() - sub.getTime()) / (7 * 24 * 3600 * 1000)));
    }
  }
  const wkLabel = weeks != null ? (en ? weeks + ' week' + (weeks !== 1 ? 's' : '') + ' since submission' : weeks + ' semaine' + (weeks > 1 ? 's' : '') + ' depuis dépôt') : '';

  if (dec === 'accepted') {
    if (col != null && pct != null && ref) {
      return en
        ? 'Airline accepted — ' + col + ' € collected (' + pct + '% of indicative ' + ref + ' € bracket).' + (wkLabel ? ' · Resolved in ' + wkLabel.replace(' since submission', '') + '.' : '')
        : 'Compagnie : acceptation — ' + col + ' € encaissés (' + pct + ' % du barème ' + ref + ' €).' + (wkLabel ? ' · Résolu en ' + wkLabel.replace(' depuis dépôt', '') + '.' : '');
    }
    return en ? 'Acceptance recorded. Indicative bracket: ' + (ref || '—') + ' €.' : 'Acceptation enregistrée. Barème : ' + (ref || '—') + ' €.';
  }
  if (dec === 'refused') {
    let s = en ? 'Refused — ' : 'Refus — ';
    s += just || (en ? 'reason documented in file notes.' : 'motif documenté en notes.');
    return s;
  }
  if (d.airlineTransparency) return d.airlineTransparency;

  // ─── Status-aware pending messages with realistic timing ──────────────────
  const st = (d.statut || '').toLowerCase();
  if (st === 'nouveau' || st === 'new') {
    return en
      ? 'New case — claim sent to airline. Most airlines reply within 4 to 12 weeks.'
      : 'Nouveau dossier — réclamation envoyée. La plupart des compagnies répondent sous 4 à 12 semaines.';
  }
  if (st === 'attente-incident' || st === 'awaiting-incident') {
    return en
      ? 'Ticket logged — flight monitored. Claim will open if disruption ≥3h is recorded.'
      : 'Billet enregistré — vol surveillé. Réclamation ouverte si perturbation ≥3h.';
  }
  if (st === 'tribunal' || st === 'escalation' || st === 'escalade') {
    return en
      ? 'Escalated — airline did not pay within 12 weeks. Formal recourse procedure underway.'
      : 'Escalade — pas de paiement sous 12 semaines. Procédure de recours formel engagée.';
  }
  if (st === 'mediateur' || st === 'mediation') {
    return en
      ? 'Final mediation phase — airline refused, dossier transferred for final review.'
      : 'Phase de médiation finale — refus compagnie, dossier en révision finale.';
  }
  // Generic 'en-cours'
  if (weeks != null) {
    if (weeks < 4) return en
      ? 'Awaiting airline reply — typical response in 4 to 12 weeks. Currently at ' + wkLabel + '.'
      : 'Attente compagnie — réponse typique sous 4 à 12 semaines. Actuellement ' + wkLabel + '.';
    if (weeks < 8) return en
      ? 'In active negotiation — Robin des Airs has issued formal claim. ' + wkLabel + '.'
      : 'Négociation active — réclamation formelle envoyée. ' + wkLabel + '.';
    if (weeks < 12) return en
      ? 'Approaching 12-week threshold — final reminder sent before escalation. ' + wkLabel + '.'
      : 'Approche du seuil 12 semaines — relance finale avant escalade. ' + wkLabel + '.';
    return en
      ? 'Beyond 12 weeks — escalation triggered, formal recourse in preparation. ' + wkLabel + '.'
      : 'Au-delà de 12 semaines — escalade déclenchée, recours en préparation. ' + wkLabel + '.';
  }
  return en
    ? 'Case in progress — most cases resolve in 4 to 12 weeks.'
    : 'Dossier en cours — la plupart résolus en 4 à 12 semaines.';
}

function transparencyDetailRow(d, colspan) {
  const text = formatAirlineTransparency(d);
  if (!text) return '';
  return (
    '<tr class="dossier-transparency-row"><td colspan="' +
    colspan +
    '"><div class="transparency-box" title="' +
    escHtml(text) +
    '"><span class="transparency-label">' +
    escHtml(t('transparency.label')) +
    '</span> ' +
    escHtml(text) +
    '</div></td></tr>'
  );
}

function formatCommissionPerPaxHtml() {
  if (typeof AgenceCurrency !== 'undefined' && AgenceCurrency.getCurrency() === 'GMD' && pricing.commissionGmd) {
    return (
      '<span class="money-main">' +
      escHtml(pricing.commissionGmd.toLocaleString('fr-FR', { maximumFractionDigits: 0 })) +
      ' GMD</span>'
    );
  }
  return formatMoneyHtml(pricing.commissionEur);
}

function commissionPerPaxGmd() {
  return pricing.commissionGmd || Math.round(pricing.commissionEur * 84);
}

/** Ligne sous le passager (dossiers soumis) : pax · GMD/pax · total estimé. */
function formatPaxCommissionSubline(d) {
  const n = d.nbPassagers || 1;
  const per = commissionPerPaxGmd();
  const total = n * per;
  const lang =
    typeof AgenceI18n !== 'undefined' && AgenceI18n.getLang && AgenceI18n.getLang() === 'en' ? 'en' : 'fr-FR';
  return (
    escHtml(String(n)) +
    ' ' +
    escHtml(t('col.pax_short')) +
    ' · ' +
    escHtml(per.toLocaleString(lang, { maximumFractionDigits: 0 })) +
    ' ' +
    escHtml(t('col.comm_per_pax')) +
    ' · ' +
    escHtml(total.toLocaleString(lang, { maximumFractionDigits: 0 })) +
    ' GMD'
  );
}

function setRefreshButtonsDisabled(disabled) {
  document.querySelectorAll('.btn-refresh').forEach(function (btn) {
    btn.disabled = !!disabled;
  });
}

function emptyTableRow(cols, msg) {
  return '<tr class="empty-row"><td colspan="' + cols + '">' + escHtml(msg) + '</td></tr>';
}

function setAgencySyncStatus(msg, isErr) {
  const el = document.getElementById('agency-sync-status');
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = isErr ? 'var(--red)' : 'var(--white-40)';
}

function getLoginEl() {
  return document.getElementById('loginOverlay') || document.getElementById('loginScreen');
}

function getAppEl() {
  return document.getElementById('agencyApp') || document.getElementById('app');
}

function getLoginCodeEl() {
  return document.getElementById('loginCode') || document.getElementById('agencyCode');
}

function getFormTel() {
  const ind = document.getElementById('phoneIndicator');
  const num = document.getElementById('phoneNumber');
  if (ind && num) return (ind.value || '') + String(num.value || '').replace(/\s/g, '');
  const tel = document.getElementById('f-tel');
  return tel ? tel.value.trim() : '';
}

function getDossiersFilterStatut() {
  const sel = document.getElementById('filter-statut');
  if (sel) return sel.value;
  const active = document.querySelector('.filter-btn.active');
  return active ? active.getAttribute('data-value') || '' : '';
}

function updateDossiersCount() {
  const c = document.getElementById('dossiers-count');
  if (c) c.textContent = String(dossiers.length);
}

const AGENT_COACH_KEY = 'rda_agence_coach_dismissed';

function markFieldInvalid(id, invalid) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('field-invalid', !!invalid);
  if (el.style && !el.classList.contains('field-invalid')) {
    el.style.borderColor = '';
  }
}

function clearFormInvalidState() {
  document.querySelectorAll('.field-invalid').forEach(function (el) {
    el.classList.remove('field-invalid');
  });
  const grid = document.querySelector('.incident-grid');
  if (grid) grid.classList.remove('field-invalid');
}

function updateFormCommissionPreview() {
  const side = document.getElementById('commission-sidebar-amount');
  if (side) side.innerHTML = formatCommissionPerPaxHtml();
}

const AGENCY_LAST_REF_KEY = 'agency_last_ref';

function clientEmailForRef(ref) {
  if (!ref) return '';
  return String(ref).trim().toLowerCase() + '@robindesairs.eu';
}

/** URL mandat passager préremplie depuis le formulaire agence (aperçu). */
function buildMandatPreviewUrl(opts) {
  const prenom = (document.getElementById('f-prenom')?.value || '').trim();
  const nom = (document.getElementById('f-nom')?.value || '').trim();
  const phone = getFormTel();
  const ref =
    (opts && opts.ref) ||
    sessionStorage.getItem(AGENCY_LAST_REF_KEY) ||
    'RDA-PREVIEW-' + new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const pnr = (document.getElementById('f-pnr')?.value || '').trim().toUpperCase();
  const vol = (document.getElementById('f-vol')?.value || '').trim().toUpperCase();
  const dep = (document.getElementById('f-depart')?.value || '').trim().toUpperCase();
  const arr = (document.getElementById('f-arrivee')?.value || '').trim().toUpperCase();
  const comp = (
    (document.getElementById('f-compagnie')?.value || '').trim() ||
    (document.getElementById('airlineInput')?.value || '').trim()
  );
  const dateRaw = (document.getElementById('f-date')?.value || '').trim();
  let date = '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateRaw)) {
    const parts = dateRaw.slice(0, 10).split('-');
    date = parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  const motif = (document.getElementById('f-probleme')?.value || '').trim();
  const route = dep && arr ? dep + ' \u2192 ' + arr : '';
  const p = new URLSearchParams();
  p.set('ref', ref);
  if (phone) p.set('phone', phone);
  if (prenom || nom) p.set('name', [prenom, nom].filter(Boolean).join(' '));
  const email = clientEmailForRef(ref);
  if (email) p.set('email', email);
  if (vol) p.set('vol', vol);
  if (date) p.set('date', date);
  if (comp) p.set('compagnie', comp);
  if (pnr) p.set('pnr', pnr);
  if (route) p.set('route', route);
  if (motif) p.set('motif', motif);
  p.set('indemnite', String(pricing.indemnityEur || 600));
  p.set('source', 'agency-preview');
  return '/mandat.html?' + p.toString();
}

function updateMandatPreviewLinks() {
  const href = buildMandatPreviewUrl();
  document.querySelectorAll('.mandat-preview-link').forEach(function (a) {
    a.href = href;
  });
}

function updateFormProgress() {
  const root = document.getElementById('form-progress');
  if (!root) return;
  const nom = (document.getElementById('f-nom')?.value || '').trim();
  const prenom = (document.getElementById('f-prenom')?.value || '').trim();
  const tel = getFormTel();
  const step1 = nom && prenom && tel.length >= 8;
  const pnr = (document.getElementById('f-pnr')?.value || '').trim();
  const vol = (document.getElementById('f-vol')?.value || '').trim();
  const dep = (document.getElementById('f-depart')?.value || '').trim();
  const arr = (document.getElementById('f-arrivee')?.value || '').trim();
  const date = (document.getElementById('f-date')?.value || '').trim();
  const comp =
    (document.getElementById('f-compagnie')?.value || '').trim() ||
    (document.getElementById('airlineInput')?.value || '').trim();
  const step2 = pnr.length >= 5 && pnr.length <= 6 && vol && dep.length === 3 && arr.length === 3 && date && comp;
  const prob = (document.getElementById('f-probleme')?.value || '').trim();
  const step3 = !!prob;
  const steps = [
    { done: step1, current: !step1 },
    { done: step2, current: step1 && !step2 },
    { done: step3, current: step1 && step2 && !step3 },
  ];
  root.querySelectorAll('.form-progress-step').forEach(function (node, i) {
    const s = steps[i] || { done: false, current: false };
    node.classList.toggle('done', s.done);
    node.classList.toggle('current', s.current);
  });
}

function showAgentCoach() {
  if (localStorage.getItem(AGENT_COACH_KEY)) return;
  const coach = document.getElementById('agent-coach');
  if (coach) coach.hidden = false;
}

function dismissAgentCoach() {
  localStorage.setItem(AGENT_COACH_KEY, '1');
  const coach = document.getElementById('agent-coach');
  if (coach) coach.hidden = true;
}

function initAgentUX() {
  const search = document.getElementById('filter-search');
  if (search) {
    if (typeof AgenceI18n !== 'undefined') {
      search.placeholder = t('filter.search');
    }
    let timer;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(renderDossiers, 200);
    });
  }

  ['f-nb-passagers', 'f-nom', 'f-prenom', 'phoneNumber', 'f-pnr', 'f-vol', 'f-depart', 'f-arrivee', 'f-date', 'airlineInput'].forEach(
    function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        updateFormProgress();
        updateMandatPreviewLinks();
        if (id === 'f-nb-passagers') updateFormCommissionPreview();
        if (id === 'f-pnr' || id === 'f-depart' || id === 'f-arrivee' || id === 'f-vol') {
          el.value = el.value.toUpperCase();
        }
        markFieldInvalid(id, false);
      });
    }
  );

  const phoneInd = document.getElementById('phoneIndicator');
  if (phoneInd) {
    phoneInd.addEventListener('change', function () {
      updateFormProgress();
      updateMandatPreviewLinks();
    });
  }

  document.querySelectorAll('.incident-option[data-value]').forEach(function (opt) {
    opt.addEventListener('click', function () {
      setTimeout(function () {
        updateFormProgress();
        updateMandatPreviewLinks();
      }, 0);
    });
  });

  document.querySelectorAll('.mandat-preview-link').forEach(function (a) {
    a.addEventListener('click', function () {
      updateMandatPreviewLinks();
    });
  });

  updateFormCommissionPreview();
  updateFormProgress();
  updateMandatPreviewLinks();
}

window.dismissAgentCoach = dismissAgentCoach;

function setCommissionTotalEl(id, nbPax) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = formatCommissionHtml({ nbPassagers: nbPax || 1 });
}

function updateCommissionTierBanner() {
  const el = document.getElementById('commission-tier-banner');
  if (!el) return;
  const lang = typeof AgenceI18n !== 'undefined' && AgenceI18n.getLang ? AgenceI18n.getLang() : 'fr';
  if (pricing.commissionLocked || pricing.commissionLifetime) {
    const founding =
      pricing.commissionTier === 'founding'
        ? lang === 'en'
          ? ' ★ Founding partner'
          : ' ★ Fondateur'
        : '';
    el.textContent =
      t('tier.locked') +
      ' ' +
      (pricing.commissionGmd || 0).toLocaleString(lang === 'en' ? 'en' : 'fr-FR') +
      ' GMD' +
      founding;
    return;
  }
  const fmt = function (ymd) {
    if (!ymd) return '';
    return new Date(ymd + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  const ends = pricing.tierEndsYmd;
  const next = pricing.nextTierGmd;
  const tier =
    typeof AgenceCommissionTiers !== 'undefined'
      ? AgenceCommissionTiers.resolve(new Date(), lang)
      : null;
  const endYmd = ends || (tier && tier.tierEndsYmd);
  const nextGmd = next || (tier && tier.nextTierGmd);
  if (endYmd && nextGmd) {
    el.textContent =
      t('tier.until') +
      ' ' +
      fmt(endYmd) +
      ' ' +
      t('tier.then') +
      ' ' +
      nextGmd.toLocaleString(lang === 'en' ? 'en' : 'fr-FR') +
      ' GMD. ' +
      t('tier.prospect');
    return;
  }
  el.textContent = t('tier.prospect');
}

function updatePricingDisplay() {
  setMoneyEl('pricing-indemnity', pricing.indemnityEur);
  setMoneyEl('pricing-client', pricing.clientNetEur);
  setMoneyEl('pricing-agency', pricing.commissionEur);
  setMoneyEl('pricing-robin', pricing.robinEur);
  const side = document.getElementById('commission-sidebar-amount');
  if (side) side.innerHTML = formatCommissionPerPaxHtml();
  const sub = document.getElementById('kpi-comm-sub');
  if (sub) {
    sub.textContent = t('kpi.comm.sub');
  }
  const commSub = document.getElementById('commission-sidebar-sub');
  if (commSub) commSub.textContent = t('pricing.per_pax');
  updateCommissionTierBanner();
}

function translateFilterOptions() {
  const sel = document.getElementById('filter-statut');
  if (!sel || typeof AgenceI18n === 'undefined') return;
  const map = {
    '': 'filter.all',
    nouveau: 'status.nouveau',
    'attente-incident': 'status.attente',
    'en-cours': 'status.encours',
    gagne: 'status.gagne',
    paye: 'status.paye',
    rejete: 'status.rejete',
  };
  Array.from(sel.options).forEach(function (opt) {
    const key = map[opt.value];
    if (key) opt.textContent = t(key);
  });
}

function translateProblemeOptions() {
  const sel = document.getElementById('f-probleme');
  if (!sel || sel.tagName !== 'SELECT' || typeof AgenceI18n === 'undefined') return;
  const opts = sel.options;
  if (opts && opts.length >= 6) {
    opts[0].textContent = t('form.select');
    opts[1].textContent = t('issue.wait');
    opts[2].textContent = t('issue.delay');
    opts[3].textContent = t('issue.cancel');
    opts[4].textContent = t('issue.denied');
    opts[5].textContent = t('issue.missed');
  }
}

function applyLocaleRefresh() {
  if (typeof AgenceI18n !== 'undefined') AgenceI18n.apply();
  translateFilterOptions();
  translateProblemeOptions();
  if (typeof AgenceCommissionTiers !== 'undefined' && !pricing.commissionGmd) {
    const tier = AgenceCommissionTiers.resolve(new Date(), AgenceI18n ? AgenceI18n.getLang() : 'fr');
    pricing.commissionGmd = tier.commissionGmd;
    pricing.commissionEur = tier.commissionEur;
  }
  updatePricingDisplay();
  if (currentAgency) {
    updateDashboard();
    renderDossiers();
    renderCommissions();
  }
  onAgencyProblemeChange();
}

function initLocaleControls() {
  if (typeof AgenceI18n !== 'undefined') {
    AgenceI18n.bindLangPills(document, applyLocaleRefresh);
    AgenceI18n.apply();
  }
  if (typeof AgenceCurrency !== 'undefined') {
    const currencySelects = [
      document.getElementById('currencySelect'),
      document.getElementById('currencySelectLogin'),
    ].filter(Boolean);
    currencySelects.forEach(function (sel) {
      AgenceCurrency.fillCurrencySelect(sel);
      sel.value = AgenceCurrency.getCurrency();
      sel.addEventListener('change', function () {
        AgenceCurrency.setCurrency(sel.value);
        currencySelects.forEach(function (s) {
          s.value = sel.value;
        });
        applyLocaleRefresh();
      });
    });
    const equiv = document.getElementById('equivCheck');
    if (equiv) {
      equiv.checked = AgenceCurrency.getShowEquiv();
      equiv.addEventListener('change', function () {
        AgenceCurrency.setShowEquiv(equiv.checked);
        applyLocaleRefresh();
      });
    }
  }
  updatePricingDisplay();
}

const AIRLINES = [
  { name: 'Air Sénégal', code: 'HC', region: 'Africa' },
  { name: 'Transair Sénégal', code: '8T', region: 'Africa' },
  { name: 'Air Gambia', code: 'GX', region: 'Africa' },
  { name: 'Royal Air Maroc', code: 'AT', region: 'Africa' },
  { name: 'Ethiopian Airlines', code: 'ET', region: 'Africa' },
  { name: 'Air France', code: 'AF', region: 'Europe' },
  { name: 'Brussels Airlines', code: 'SN', region: 'Europe' },
  { name: 'Turkish Airlines', code: 'TK', region: 'Europe' },
  { name: 'TAP Air Portugal', code: 'TP', region: 'Europe' },
  { name: 'British Airways', code: 'BA', region: 'Europe' },
  { name: 'KLM', code: 'KL', region: 'Europe' },
  { name: 'Lufthansa', code: 'LH', region: 'Europe' },
  { name: 'Emirates', code: 'EK', region: 'Middle East' },
  { name: 'Qatar Airways', code: 'QR', region: 'Middle East' },
];

let selectedAirline = null;

function initAirlineAutocomplete() {
  const inp = document.getElementById('airlineInput');
  const dd = document.getElementById('airlineDropdown');
  const hidden = document.getElementById('f-compagnie');
  if (!inp || !dd) return;

  function renderDropdown(query) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) {
      dd.classList.remove('open');
      return;
    }
    const results = AIRLINES.filter(function (a) {
      return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
    }).slice(0, 8);
    if (!results.length) {
      dd.innerHTML =
        '<div class="airline-option" style="color:var(--white-40);cursor:default;pointer-events:none">—</div>';
    } else {
      dd.innerHTML = results
        .map(function (a) {
          return (
            '<div class="airline-option" data-name="' +
            escHtml(a.name) +
            '" data-code="' +
            escHtml(a.code) +
            '"><span>' +
            escHtml(a.name) +
            '</span><span class="airline-code">' +
            escHtml(a.code) +
            '</span><span class="airline-region">' +
            escHtml(a.region) +
            '</span></div>'
          );
        })
        .join('');
      dd.querySelectorAll('.airline-option[data-code]').forEach(function (el) {
        el.addEventListener('mousedown', function (e) {
          e.preventDefault();
          pickAirline(el.dataset.name, el.dataset.code);
        });
      });
    }
    dd.classList.add('open');
  }

  function pickAirline(name, code) {
    selectedAirline = { name: name, code: code };
    if (hidden) hidden.value = name;
    inp.style.display = 'none';
    dd.classList.remove('open');
    const sel = document.getElementById('airlineSelected');
    const txt = document.getElementById('airlineSelectedText');
    if (txt) txt.textContent = name + '  ' + code;
    if (sel) sel.classList.add('show');
    const fn = document.getElementById('f-vol');
    if (fn && !fn.value) fn.placeholder = code + ' 000';
  }

  window.clearAirline = function () {
    selectedAirline = null;
    if (hidden) hidden.value = '';
    const sel = document.getElementById('airlineSelected');
    if (sel) sel.classList.remove('show');
    inp.style.display = '';
    inp.value = '';
    inp.focus();
  };

  inp.addEventListener('input', function () {
    renderDropdown(inp.value);
  });
  inp.addEventListener('blur', function () {
    setTimeout(function () {
      dd.classList.remove('open');
    }, 200);
  });
}

function initAgencyFormUX() {
  const issueRoot = document.getElementById('issue-chips');
  const hiddenProb = document.getElementById('f-probleme');
  if (issueRoot && hiddenProb) {
    issueRoot.addEventListener('click', function (e) {
      const chip = e.target.closest('.issue-chip');
      if (!chip) return;
      issueRoot.querySelectorAll('.issue-chip').forEach(function (c) {
        c.classList.remove('active');
      });
      chip.classList.add('active');
      hiddenProb.value = chip.getAttribute('data-value') || '';
      onAgencyProblemeChange();
    });
  }
  document.querySelectorAll('.incident-option[data-value]').forEach(function (opt) {
    opt.addEventListener('click', function () {
      document.querySelectorAll('.incident-option').forEach(function (o) {
        o.classList.remove('selected');
      });
      opt.classList.add('selected');
      if (hiddenProb) hiddenProb.value = opt.getAttribute('data-value') || '';
      onAgencyProblemeChange();
    });
  });
  initAirlineAutocomplete();
  document.querySelectorAll('.btn-refresh').forEach(function (btn) {
    btn.addEventListener('click', function () {
      refreshFromAirtable();
    });
  });
  initAgentUX();
}

window.setAgencyFilter = function (status, btn) {
  document.querySelectorAll('.filter-btn').forEach(function (b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  const sel = document.getElementById('filter-statut');
  if (sel) sel.value = status;
  renderDossiers();
};

window.switchTab = function (name, btn) {
  switchPage(name);
  if (btn) {
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
  }
};

async function refreshFromAirtable() {
  if (!currentAgency || _agencyLoading) return;
  if (agencyTrialClientOnly) {
    setAgencySyncStatus(t('trial.sync_demo'), false);
    updateDashboard();
    renderDossiers();
    renderCommissions();
    return;
  }
  _agencyLoading = true;
  setRefreshButtonsDisabled(true);
  setAgencySyncStatus(t('dash.sync') + ' …');
  try {
    const r = await agencyFetch(AGENCY_DOSSIERS_URL);
    const data = await r.json().catch(function () {
      return {};
    });
    if (!r.ok) throw new Error(data.error || 'HTTP ' + r.status);
    dossiers = data.dossiers || [];
    if (data.pricing) {
      pricing = Object.assign(pricing, data.pricing);
    } else if (data.commissionPerPaxEur || data.commissionPerPaxGmd) {
      if (data.commissionPerPaxGmd) pricing.commissionGmd = data.commissionPerPaxGmd;
      if (data.commissionPerPaxEur) pricing.commissionEur = data.commissionPerPaxEur;
      pricing.commissionFcfa = data.commissionPerPax || Math.round(pricing.commissionEur * 655.957);
      pricing.robinEur = Math.max(
        0,
        pricing.indemnityEur - pricing.clientNetEur - pricing.commissionEur
      );
    }
    setAgencySyncStatus(
      dossiers.length +
        ' — ' +
        t('dash.sync') +
        ' ' +
        new Date().toLocaleTimeString(AgenceI18n ? AgenceI18n.getLang() : 'fr')
    );
    updatePricingDisplay();
    updateDashboard();
    renderDossiers();
    renderCommissions();
    updateDossiersCount();
  } catch (e) {
    setAgencySyncStatus(t('toast.err') + ' : ' + (e.message || ''), true);
    showToast(t('toast.err') + ' : ' + e.message, true);
  } finally {
    _agencyLoading = false;
    setRefreshButtonsDisabled(false);
  }
}

function showAgencyApp(agency) {
  currentAgency = agency;
  const badge = document.getElementById('agencyBadge');
  const nameEl = document.getElementById('agencyName');
  const codeEl = document.getElementById('agencyCode');
  if (badge) badge.textContent = agency.name + ' · ' + agency.code;
  if (nameEl) nameEl.textContent = agency.name;
  if (codeEl) codeEl.textContent = agency.code;
  const login = getLoginEl();
  if (login) login.style.display = 'none';
  const app = getAppEl();
  if (app) {
    app.hidden = false;
    app.classList.add('active');
  }
  refreshFromAirtable();
  showAgentCoach();
  if (typeof AgenceI18n !== 'undefined') AgenceI18n.apply();
}

function isAgencyCodeOnlyMode() {
  return (
    new URLSearchParams(location.search).has('sans-mdp') ||
    new URLSearchParams(location.search).has('demo')
  );
}

function isTrialMode() {
  const p = new URLSearchParams(location.search);
  if (p.has('trial')) return true;
  try {
    return localStorage.getItem('rda_agency_trial') === '1';
  } catch (_) {
    return false;
  }
}

function showTrialBanner() {
  // Bannière trial supprimée — la page doit paraître réelle pour les démos partenaires.
  // Les dossiers de démo (15) sont chargés via enterTrialModeClientOnly().
  const el = document.getElementById('agencyTrialBanner');
  if (el) { el.hidden = true; el.remove(); }
}

// Compute dynamic dates relative to "now" so weeks-since make sense
function _wkAgo(weeks) {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  return d.toISOString().slice(0, 10);
}
const DEMO_DOSSIERS = [
  // ── PAID — resolved in 4 to 8 weeks (typical fast payouts) ──────────────
  { ref:'RDA-2026-001', prenom:'Fatou',    nom:'DIALLO',   vol:'SN301', compagnie:'Brussels Airlines', statut:'paye',     nbPassagers:1, date:_wkAgo(20), montantGmd:51000,  pnr:'K5FW8B', notes:'BJL → BRU delayed 5h. Compensation paid out in 6 weeks.' },
  { ref:'RDA-2026-002', prenom:'Amadou',   nom:'JALLOW',   vol:'SN302', compagnie:'Brussels Airlines', statut:'paye',     nbPassagers:4, date:_wkAgo(24), montantGmd:204000, pnr:'PNR42X', notes:'Family of 4. Christmas flight cancelled. Paid in 8 weeks.' },
  { ref:'RDA-2026-014', prenom:'Ebrima',   nom:'SAIDY',    vol:'SN302', compagnie:'Brussels Airlines', statut:'paye',     nbPassagers:2, date:_wkAgo(48), montantGmd:102000, pnr:'AB3CD',  notes:'File closed. Wire transfer completed. Commission paid to Seyman Travel.' },

  // ── WON — accepted, payout in progress ──────────────────────────────────
  { ref:'RDA-2026-003', prenom:'Mariama',  nom:'CEESAY',   vol:'BY2635',compagnie:'TUI Airways',       statut:'gagne',    nbPassagers:2, date:_wkAgo(10), montantGmd:102000, pnr:'TUI901',  notes:'Delay 6h LGW. Airline accepted. Wire transfer scheduled within 5 working days.' },

  // ── IN PROGRESS — within normal 4-12 week window ────────────────────────
  { ref:'RDA-2026-004', prenom:'Ousman',   nom:'SANNEH',   vol:'SN301', compagnie:'Brussels Airlines', statut:'en-cours', nbPassagers:1, date:_wkAgo(3),  montantGmd:51000,  pnr:'XZ4P9',  notes:'Claim sent to Brussels Airlines. Awaiting initial response (week 3 of typical 4-12).' },
  { ref:'RDA-2026-005', prenom:'Binta',    nom:'CAMARA',   vol:'TP1481',compagnie:'TAP Air Portugal',  statut:'en-cours', nbPassagers:3, date:_wkAgo(5),  montantGmd:153000, pnr:'TP55Q',  notes:'BJL → LIS delayed 4h. Active negotiation with TAP claims department.' },
  { ref:'RDA-2026-015', prenom:'Ndey',     nom:'JOBE',     vol:'BY2636',compagnie:'TUI Airways',       statut:'en-cours', nbPassagers:6, date:_wkAgo(7),  montantGmd:306000, pnr:'TUI612', notes:'Family of 6. 7h delay at LGW. Priority case in active negotiation.' },
  { ref:'RDA-2026-016', prenom:'Modou',    nom:'NDONG',    vol:'AF731', compagnie:'Air France',        statut:'en-cours', nbPassagers:2, date:_wkAgo(9),  montantGmd:102000, pnr:'AF99K',  notes:'Approaching 12-week threshold. Final reminder sent before escalation.' },

  // ── ESCALATION — past 12 weeks, formal recourse ─────────────────────────
  { ref:'RDA-2026-006', prenom:'Lamin',    nom:'TOURAY',   vol:'BY2636',compagnie:'TUI Airways',       statut:'tribunal', nbPassagers:2, date:_wkAgo(14), montantGmd:102000, pnr:'TUI707', notes:'TUI refused initial claim. Formal recourse procedure engaged after 12 weeks of silence.' },
  { ref:'RDA-2026-013', prenom:'Fatoumata',nom:'NJIE',     vol:'SN301', compagnie:'Brussels Airlines', statut:'tribunal', nbPassagers:3, date:_wkAgo(18), montantGmd:153000, pnr:'BX2L7',  notes:'Second refusal Brussels Airlines. Formal recourse activated, awaiting written reply.' },

  // ── FINAL MEDIATION — extreme cases ─────────────────────────────────────
  { ref:'RDA-2026-008', prenom:'Yankuba',  nom:'DRAMMEH',  vol:'SN301', compagnie:'Brussels Airlines', statut:'mediateur',nbPassagers:5, date:_wkAgo(22), montantGmd:255000, pnr:'SN4P2',  notes:'Initial refusal. Case transferred to final mediation review after escalation.' },

  // ── REFUSED — extraordinary circumstances (weather/strike/etc) ──────────
  { ref:'RDA-2026-007', prenom:'Isatou',   nom:'JOBARTEH', vol:'SN302', compagnie:'Brussels Airlines', statut:'refuse',   nbPassagers:1, date:_wkAgo(9),  montantGmd:51000,  pnr:'JZ8H4',  notes:'Brussels Airlines invoked "extraordinary circumstances" (storm). Counter-evidence (METAR data) being prepared.', airlineDecision:'refused', airlineJustification:'Extraordinary circumstances claimed — adverse weather (storm). Robin des Airs disputes with METAR evidence.' },
  { ref:'RDA-2026-012', prenom:'Sering',   nom:'BOJANG',   vol:'BY2635',compagnie:'TUI Airways',       statut:'refuse',   nbPassagers:1, date:_wkAgo(11), montantGmd:51000,  pnr:'TUI88',  notes:'TUI invokes weather. METAR data contradictory. Counter-claim being prepared.', airlineDecision:'refused', airlineJustification:'Weather-related extraordinary circumstances claimed. Independent meteorological evidence (METAR) shows conditions were within operational limits.' },
  { ref:'RDA-2026-017', prenom:'Alieu',    nom:'CONTEH',   vol:'AT591', compagnie:'Royal Air Maroc',   statut:'refuse',   nbPassagers:2, date:_wkAgo(7),  montantGmd:102000, pnr:'RAM77',  notes:'Airline cites ATC strike (extraordinary). Independent verification ongoing.', airlineDecision:'refused', airlineJustification:'Air traffic control strike invoked as extraordinary circumstance. Verification of strike scope and dates underway.' },

  // ── NEW — just submitted ────────────────────────────────────────────────
  { ref:'RDA-2026-009', prenom:'Adama',    nom:'BARRY',    vol:'BY2635',compagnie:'TUI Airways',       statut:'nouveau',  nbPassagers:1, date:_wkAgo(1),  montantGmd:51000,  pnr:'NEW01', notes:'Case received. Eligibility analysis in progress.' },
  { ref:'RDA-2026-010', prenom:'Sainey',   nom:'COLLEY',   vol:'TP1482',compagnie:'TAP Air Portugal',  statut:'nouveau',  nbPassagers:2, date:_wkAgo(0),  montantGmd:102000, pnr:'NEW02', notes:'Documents received. Awaiting validation.' },

  // ── AWAITING INCIDENT — future flight monitored ─────────────────────────
  { ref:'RDA-2026-011', prenom:'Haddijatou',nom:'BALDEH',  vol:'SN302', compagnie:'Brussels Airlines', statut:'attente-incident', nbPassagers:4, date:_wkAgo(0), montantGmd:0, pnr:'WATCH', notes:'Tickets sold. Flight scheduled 15/07. Active surveillance enabled.' },
];

function enterTrialModeClientOnly() {
  agencyTrialClientOnly = true;
  showAgencyApp({
    code: 'TRIAL',
    name: 'Seyman Travel (Demo)',
  });
  dossiers = DEMO_DOSSIERS;
  setAgencySyncStatus(t('trial.sync_demo'), false);
  showTrialBanner();
  updateDashboard();
  renderDossiers();
  renderCommissions();
}

async function tryTrialAutoLogin() {
  if (!isTrialMode()) return false;
  try {
    const r = await agencyFetch(AGENCY_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trialAccess: true }),
    });
    const data = await r.json().catch(function () {
      return {};
    });
    if (r.ok && data.ok && data.agency) {
      agencyTrialClientOnly = false;
      showAgencyApp(data.agency);
      showTrialBanner();
      return true;
    }
  } catch (_) {}
  enterTrialModeClientOnly();
  return true;
}

function applyAgencyLoginMode() {
  const codeOnly = isAgencyCodeOnlyMode() || (function () {
    const p = document.getElementById('loginPass');
    return p && (p.hidden || p.style.display === 'none');
  })();
  const passEl = document.getElementById('loginPass');
  const row = document.getElementById('login-pass-row');
  const banner = document.getElementById('login-demo-banner');
  if (passEl && codeOnly) {
    passEl.hidden = true;
    passEl.value = '';
  }
  if (row) row.hidden = codeOnly;
  if (banner) banner.hidden = !codeOnly;
}

async function doLogin() {
  const codeEl = getLoginCodeEl();
  const code = codeEl ? codeEl.value.trim().toUpperCase() : '';
  const passEl = document.getElementById('loginPass') || document.getElementById('agencyPwd');
  const pass = passEl && !passEl.hidden && passEl.style.display !== 'none' ? passEl.value : '';
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.style.display = 'none';
  try {
    const r = await agencyFetch(AGENCY_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, pass: pass }),
    });
    const data = await r.json().catch(function () {
      return {};
    });
    if (!r.ok || !data.ok) {
      if (errEl) errEl.style.display = 'block';
      if (passEl) passEl.value = '';
      return;
    }
    showToast(t('toast.login'));
    showAgencyApp(data.agency);
  } catch (e) {
    showToast(t('toast.err') + ' : ' + e.message, true);
  }
}

async function doLogout() {
  try {
    await agencyFetch(AGENCY_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logout: true }),
    });
  } catch (_) {}
  currentAgency = null;
  dossiers = [];
  const app = getAppEl();
  if (app) {
    app.classList.remove('active');
    app.hidden = true;
  }
  const login = getLoginEl();
  if (login) login.style.display = 'flex';
  const codeEl = getLoginCodeEl();
  if (codeEl) codeEl.value = '';
  const passEl = document.getElementById('loginPass') || document.getElementById('agencyPwd');
  if (passEl) passEl.value = '';
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.style.display = 'none';
  showToast(t('toast.logout'));
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !currentAgency) doLogin();
});

function switchPage(page) {
  const tab = page === 'dashboard' ? 'nouveau' : page;
  document.querySelectorAll('.tab-panel').forEach(function (p) {
    p.classList.toggle('active', p.id === 'tab-' + tab);
  });
  document.querySelectorAll('.tab-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.page === tab);
  });
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.toggle('active', p.id === 'page-' + page);
  });
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  document.querySelectorAll('.sidebar nav a').forEach(function (a) {
    a.classList.toggle('active', a.dataset.page === page);
  });
  if (page === 'dossiers') renderDossiers();
  if (page === 'commissions') renderCommissions();
  if (page === 'dashboard' || page === 'nouveau') updateDashboard();
}

function updateDashboard() {
  const total = dossiers.length;
  const encours = dossiers.filter(function (d) {
    return d.statut === 'en-cours' || d.statut === 'nouveau' || d.statut === 'attente-incident';
  }).length;
  const attente = dossiers.filter(function (d) {
    return d.statut === 'attente-incident';
  }).length;
  const gagnes = dossiers.filter(function (d) {
    return d.statut === 'gagne' || d.statut === 'paye';
  }).length;
  const paxGagnes = dossiers
    .filter(function (d) {
      return d.statut === 'gagne' || d.statut === 'paye';
    })
    .reduce(function (s, d) {
      return s + (d.nbPassagers || 1);
    }, 0);

  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-encours').textContent = encours;
  var elAtt = document.getElementById('kpi-attente');
  if (elAtt) elAtt.textContent = attente;
  document.getElementById('kpi-gagnes').textContent = gagnes;
  setCommissionTotalEl('kpi-commissions', paxGagnes);

  const tbody = document.getElementById('dashboard-table');
  if (!tbody) return;
  tbody.innerHTML = dossiers.length
    ? dossiers
        .slice(0, 5)
        .map(function (d) {
          const comm =
            d.statut === 'gagne' || d.statut === 'paye'
              ? formatCommissionHtml(d)
              : '—';
          return (
            '<tr><td><strong>' +
            escHtml(d.ref) +
            '</strong></td><td>' +
            escHtml(d.prenom) +
            ' ' +
            escHtml(d.nom) +
            '</td><td>' +
            escHtml(d.vol) +
            '</td><td>' +
            formatDate(d.date) +
            '</td><td>' +
            badgeHTML(d.statut) +
            '</td><td class="money-cell">' +
            comm +
              '</td></tr>' +
            transparencyDetailRow(d, 6)
          );
        })
        .join('')
    : emptyTableRow(6, '—');
}

function renderDossiers() {
  const statutFilter = getDossiersFilterStatut();
  const searchEl = document.getElementById('filter-search');
  const search = searchEl ? (searchEl.value || '').toLowerCase() : '';

  let filtered = dossiers.slice();
  if (statutFilter)
    filtered = filtered.filter(function (d) {
      return d.statut === statutFilter;
    });
  if (search) {
    filtered = filtered.filter(function (d) {
      return (
        (d.nom || '').toLowerCase().includes(search) ||
        (d.prenom || '').toLowerCase().includes(search) ||
        (d.vol || '').toLowerCase().includes(search) ||
        (d.pnr || '').toLowerCase().includes(search) ||
        (d.ref || '').toLowerCase().includes(search)
      );
    });
  }

  const tbody = document.getElementById('dossiers-table');
  if (!tbody) return;
  const partnerFmt = tbody.getAttribute('data-format') === 'partner';
  const cols = partnerFmt ? 8 : 10;

  tbody.innerHTML = filtered.length
    ? filtered
        .map(function (d) {
          var route =
            d.depart && d.arrivee
              ? escHtml(d.depart) + ' → ' + escHtml(d.arrivee)
              : '—';
          const comm =
            d.statut === 'gagne' || d.statut === 'paye'
              ? formatCommissionHtml(d)
              : '<span class="commission-cell pending">—</span>';
          if (partnerFmt) {
            return (
              '<tr data-status="' +
              escHtml(d.statut) +
              '"><td><span class="ref">' +
              escHtml(d.ref) +
              '</span></td><td><span class="passager-name">' +
              escHtml(d.nom) +
              ', ' +
              escHtml(d.prenom) +
              '</span><span class="passager-sub">' +
              formatPaxCommissionSubline(d) +
              '</span></td><td>' +
              escHtml(d.vol) +
              '</td><td>' +
              route +
              '</td><td>' +
              formatDate(d.date) +
              '</td><td>' +
              escHtml(d.probleme || '—') +
              '</td><td>' +
              badgeHTML(d.statut) +
              '</td><td class="commission-cell">' +
              (d.statut === 'gagne' || d.statut === 'paye'
                ? formatCommissionHtml(d)
                : '<span class="pending">—</span>') +
              '</td></tr>' +
              transparencyDetailRow(d, 8)
            );
          }
          return (
            '<tr><td><strong>' +
            escHtml(d.ref) +
            '</strong></td><td>' +
            escHtml(d.prenom) +
            ' ' +
            escHtml(d.nom) +
            '</td><td>' +
            escHtml(d.vol) +
            '</td><td>' +
            escHtml(d.compagnie) +
            '</td><td>' +
            route +
            '</td><td>' +
            formatDate(d.date) +
            '</td><td style="font-size:12px">' +
            escHtml(d.probleme) +
            '</td><td style="text-align:center;font-size:0.8rem;line-height:1.45">' +
            formatPaxCommissionSubline(d) +
            '</td><td>' +
            badgeHTML(d.statut) +
            '</td><td class="money-cell">' +
            comm +
            '</td></tr>' +
            transparencyDetailRow(d, cols)
          );
        })
        .join('')
    : emptyTableRow(cols, t('table.empty'));
}

function renderCommissions() {
  const won = dossiers.filter(function (d) {
    return d.statut === 'gagne' || d.statut === 'paye';
  });
  const totalPax = won.reduce(function (s, d) {
    return s + (d.nbPassagers || 1);
  }, 0);
  const paidPax = dossiers
    .filter(function (d) {
      return d.statut === 'paye';
    })
    .reduce(function (s, d) {
      return s + (d.nbPassagers || 1);
    }, 0);
  const pendingPax = dossiers
    .filter(function (d) {
      return d.statut === 'gagne';
    })
    .reduce(function (s, d) {
      return s + (d.nbPassagers || 1);
    }, 0);

  setCommissionTotalEl('comm-total', totalPax);
  setCommissionTotalEl('comm-paid', paidPax);
  setCommissionTotalEl('comm-pending', pendingPax);

  const tbody = document.getElementById('commissions-table');
  tbody.innerHTML = won.length
    ? won
        .map(function (d) {
          return (
            '<tr><td>' +
            formatDate(d.dateCreation || d.date) +
            '</td><td><strong>' +
            escHtml(d.ref) +
            '</strong></td><td>' +
            escHtml(d.prenom) +
            ' ' +
            escHtml(d.nom) +
            '</td><td style="text-align:center">' +
            (d.nbPassagers || 1) +
            '</td><td class="money-cell"><strong>' +
            formatCommissionHtml(d) +
            '</strong></td><td>' +
            (d.statut === 'paye' ? 'Wave' : '—') +
            '</td><td>' +
            (d.statut === 'paye'
              ? '<span class="badge paye">' + t('status.paye') + '</span>'
              : '<span class="badge nouveau">' + t('status.encours') + '</span>') +
            '</td></tr>'
          );
        })
        .join('')
    : emptyTableRow(7, '—');
}

function isAttenteIncidentForm() {
  const sel = document.getElementById('f-probleme');
  return sel && sel.value === '__ATTENTE__';
}

function onAgencyProblemeChange() {
  const probEl = document.getElementById('f-probleme');
  const val = probEl ? probEl.value : '';
  const attente = val === '__ATTENTE__';
  const escale = /correspondance/i.test(val);
  const panel = document.getElementById('panel-escale');
  if (panel) panel.hidden = !escale;
  const hint = document.getElementById('f-probleme-hint');
  if (hint) {
    hint.textContent = attente ? t('agent.ticket_sold_hint') : t('form.issue_hint');
  }
  updateFormProgress();
}

async function submitDossier() {
  const btnSubmit = document.getElementById('btn-submit-dossier');
  clearFormInvalidState();
  const fields = ['nom', 'prenom', 'tel', 'pnr', 'vol', 'compagnie', 'date', 'depart', 'arrivee', 'probleme'];
  const vals = {};
  let missing = false;
  const attente = isAttenteIncidentForm();

  const compHidden = document.getElementById('f-compagnie');
  const airlineInp = document.getElementById('airlineInput');
  if (compHidden && airlineInp && !compHidden.value.trim() && airlineInp.value.trim()) {
    compHidden.value = airlineInp.value.trim();
  }

  fields.forEach(function (f) {
    const el = document.getElementById('f-' + f);
    if (!el) return;
    vals[f] = f === 'tel' ? getFormTel() : el.value.trim();
    if (f === 'probleme' && vals[f] === '__ATTENTE__') {
      vals[f] = "En attente d'incident (billet vendu)";
    }
    if (!vals[f]) {
      markFieldInvalid('f-' + f, true);
      if (f === 'tel') markFieldInvalid('phoneNumber', true);
      missing = true;
    }
  });

  const issueRoot = document.getElementById('issue-chips');
  const incidentRoot = document.querySelector('.incident-grid');
  if (!vals.probleme) {
    if (issueRoot) issueRoot.style.outline = '2px solid var(--red)';
    if (incidentRoot) incidentRoot.classList.add('field-invalid');
    missing = true;
  } else {
    if (issueRoot) issueRoot.style.outline = '';
    if (incidentRoot) incidentRoot.classList.remove('field-invalid');
  }

  if (missing) {
    showToast(t('toast.form_incomplete'), true);
    updateFormProgress();
    const firstBad = document.querySelector('.field-invalid');
    if (firstBad && firstBad.scrollIntoView) {
      firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const pnr = vals.pnr.toUpperCase();
  if (pnr.length < 5 || pnr.length > 6 || !/^[A-Z0-9]{5,6}$/.test(pnr)) {
    markFieldInvalid('f-pnr', true);
    showToast(t('toast.pnr_invalid'), true);
    return;
  }

  if (vals.depart.length !== 3 || vals.arrivee.length !== 3) {
    if (vals.depart.length !== 3) markFieldInvalid('f-depart', true);
    if (vals.arrivee.length !== 3) markFieldInvalid('f-arrivee', true);
    showToast(t('toast.airport_invalid'), true);
    return;
  }

  vals.retard = 0;
  vals.attenteIncident = attente;
  vals.nbPassagers = parseInt(document.getElementById('f-nb-passagers').value, 10) || 1;
  const notesParts = [];
  const escaleVille = document.getElementById('f-escale-ville');
  const vol2 = document.getElementById('f-vol2');
  if (escaleVille && escaleVille.value.trim()) {
    notesParts.push('Escale/correspondance: ' + escaleVille.value.trim());
  }
  if (vol2 && vol2.value.trim()) {
    notesParts.push('Vol 2: ' + vol2.value.trim().toUpperCase());
  }
  const baseNotes = document.getElementById('f-notes').value.trim();
  if (baseNotes) notesParts.push(baseNotes);
  vals.notes = notesParts.join(' | ');

  if (btnSubmit) btnSubmit.disabled = true;
  if (agencyTrialClientOnly) {
    const ref = 'DEMO-' + new Date().getFullYear() + '-' + String(dossiers.length + 1).padStart(3,'0');
    const newDossier = {
      ref,
      prenom: vals.prenom || 'Passager',
      nom: (vals.nom || 'DEMO').toUpperCase(),
      vol: vals.vol || '—',
      compagnie: vals.compagnie || '—',
      statut: vals.probleme && vals.probleme.includes('attente') ? 'attente-incident' : 'nouveau',
      nbPassagers: parseInt(document.getElementById('f-nb_passagers')?.value || '1', 10) || 1,
      date: vals.date || new Date().toISOString().slice(0,10),
      notes: 'Demo — ' + (vals.probleme || 'Dossier test'),
      montantGmd: 0,
    };
    dossiers.unshift(newDossier);
    updateDashboard();
    renderDossiers();
    showToast('✅ Dossier ' + ref + ' ajouté — demo');
    resetForm();
    switchPage('dossiers');
    if (btnSubmit) btnSubmit.disabled = false;
    return;
  }
  try {
    const r = await agencyFetch(AGENCY_DOSSIERS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vals),
    });
    const data = await r.json().catch(function () {
      return {};
    });
    if (!r.ok) throw new Error(data.error || 'HTTP ' + r.status);
    const ref = data.ref || (data.dossier && data.dossier.ref);
    if (ref) {
      try {
        sessionStorage.setItem(AGENCY_LAST_REF_KEY, ref);
      } catch (_) {}
      updateMandatPreviewLinks();
    }
    showToast(ref ? t('toast.saved_ref') + ' ' + ref : t('toast.saved'));
    resetForm();
    await refreshFromAirtable();
    switchPage('dossiers');
  } catch (e) {
    showToast(t('toast.err') + ' : ' + (e.message || ''), true);
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
  }
}

function resetForm() {
  ['nom', 'prenom', 'tel', 'pnr', 'vol', 'date', 'depart', 'arrivee', 'notes', 'escale-ville', 'vol2'].forEach(
    function (f) {
      const el = document.getElementById('f-' + f);
      if (!el) return;
      el.value = '';
      if (el.style) el.style.borderColor = 'var(--gray-200)';
    }
  );
  const comp = document.getElementById('f-compagnie');
  const prob = document.getElementById('f-probleme');
  if (comp) {
    if (comp.tagName === 'SELECT') comp.selectedIndex = 0;
    else comp.value = '';
  }
  if (prob) prob.value = '';
  if (typeof clearAirline === 'function') clearAirline();
  document.querySelectorAll('.issue-chip').forEach(function (c) {
    c.classList.remove('active');
  });
  document.querySelectorAll('.incident-option').forEach(function (c) {
    c.classList.remove('selected');
  });
  const issueRoot = document.getElementById('issue-chips');
  if (issueRoot) issueRoot.style.outline = '';
  document.getElementById('f-nb-passagers').value = '1';
  onAgencyProblemeChange();
  clearFormInvalidState();
  updateFormCommissionPreview();
  updateFormProgress();
}

function formatDate(d) {
  if (!d) return '—';
  if (d.indexOf('/') >= 0) return d;
  const parts = d.split('-');
  if (parts.length >= 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return d;
}

function badgeHTML(statut) {
  const isEn = typeof AgenceI18n !== 'undefined' && AgenceI18n.getLang && AgenceI18n.getLang() === 'en';
  const keys = {
    nouveau: 'status.nouveau',
    'attente-incident': 'status.attente',
    'en-cours': 'status.encours',
    gagne: 'status.gagne',
    paye: 'status.paye',
    rejete: 'status.rejete',
    refuse: isEn ? 'Refused' : 'Refusé',
    tribunal: isEn ? 'Escalation ⚖️' : 'Escalade ⚖️',
    mediateur: isEn ? 'Final review 🔄' : 'Révision finale 🔄',
  };
  const pills = {
    nouveau: 'status-new',
    'attente-incident': 'status-pending',
    'en-cours': 'status-ongoing',
    gagne: 'status-won',
    paye: 'status-won',
    rejete: 'status-pending',
    refuse: 'status-pending',
    tribunal: 'status-tribunal',
    mediateur: 'status-ongoing',
  };
  const label = keys[statut] ? t(keys[statut]) : statut;
  const pill = pills[statut];
  if (pill) return '<span class="status-pill ' + pill + '">' + escHtml(label) + '</span>';
  return '<span class="badge ' + statut + '">' + escHtml(label) + '</span>';
}

function showToast(msg, isError) {
  const toast = document.getElementById('toast');
  toast.innerHTML =
    '<span class="toast-icon">' + (isError ? '⚠️' : '✅') + '</span> ' + escHtml(msg);
  toast.style.background = isError ? 'var(--red)' : 'var(--sky-card, var(--navy))';
  toast.classList.add('show');
  setTimeout(function () {
    toast.classList.remove('show');
  }, 3500);
}

initLocaleControls();
initAgencyFormUX();
applyAgencyLoginMode();

(function applyPreviewMode() {
  const params = new URLSearchParams(location.search);
  const preview = params.get('preview');
  if (!preview) return;
  const login = getLoginEl();
  const app = getAppEl();
  if (login) login.style.display = 'none';
  if (app) {
    app.hidden = false;
    app.classList.add('active');
  }
  switchPage(preview === '1' ? 'nouveau' : preview);
})();

window.doLogin = doLogin;
window.doLogout = doLogout;
window.submitDossier = submitDossier;

(async function initAgencyPortal() {
  if (isTrialMode()) {
    const ok = await tryTrialAutoLogin();
    if (ok) return;
  }
  try {
    const r = await agencyFetch(AGENCY_AUTH_URL);
    const data = await r.json().catch(function () {
      return {};
    });
    if (data.ok && data.agency) showAgencyApp(data.agency);
  } catch (_) {}
})();

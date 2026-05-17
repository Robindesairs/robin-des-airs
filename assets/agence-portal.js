/**
 * Espace agence partenaire — API Airtable (Robin des Airs)
 */
const AGENCY_AUTH_URL = '/api/agency-auth';
const AGENCY_DOSSIERS_URL = '/api/agency-dossiers';

let currentAgency = null;
let dossiers = [];
let pricing = {
  commissionEur: 45,
  clientNetEur: 420,
  indemnityEur: 600,
  robinEur: 135,
  commissionFcfa: 29518,
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
  el.style.color = isErr ? 'var(--red)' : 'var(--gray-400)';
}

function updatePricingDisplay() {
  setMoneyEl('pricing-indemnity', pricing.indemnityEur);
  setMoneyEl('pricing-client', pricing.clientNetEur);
  setMoneyEl('pricing-agency', pricing.commissionEur);
  setMoneyEl('pricing-robin', pricing.robinEur);
  const sub = document.getElementById('kpi-comm-sub');
  if (sub) {
    const per = formatMoneyHtml(pricing.commissionEur);
    sub.innerHTML = t('kpi.comm.sub') + ' — ' + per;
  }
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
  const routeRoot = document.getElementById('route-chips');
  if (routeRoot) {
    routeRoot.addEventListener('click', function (e) {
      const chip = e.target.closest('.route-chip');
      if (!chip) return;
      const dep = document.getElementById('f-depart');
      const arr = document.getElementById('f-arrivee');
      if (dep) dep.value = chip.getAttribute('data-depart') || '';
      if (arr) arr.value = chip.getAttribute('data-arrivee') || '';
      routeRoot.querySelectorAll('.route-chip').forEach(function (c) {
        c.classList.remove('active');
      });
      chip.classList.add('active');
    });
  }
}

async function refreshFromAirtable() {
  if (!currentAgency || _agencyLoading) return;
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
    } else if (data.commissionPerPaxEur) {
      pricing.commissionEur = data.commissionPerPaxEur;
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
  document.getElementById('agencyName').textContent = agency.name;
  document.getElementById('agencyCode').textContent = agency.code;
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').classList.add('active');
  refreshFromAirtable();
}

function isAgencyCodeOnlyMode() {
  return (
    new URLSearchParams(location.search).has('sans-mdp') ||
    new URLSearchParams(location.search).has('demo')
  );
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
  const code = document.getElementById('loginCode').value.trim().toUpperCase();
  const passEl = document.getElementById('loginPass');
  const pass = passEl && !passEl.hidden && passEl.style.display !== 'none' ? passEl.value : '';
  document.getElementById('loginError').style.display = 'none';
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
      document.getElementById('loginError').style.display = 'block';
      document.getElementById('loginPass').value = '';
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
  document.getElementById('app').classList.remove('active');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginCode').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').style.display = 'none';
  showToast(t('toast.logout'));
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !currentAgency) doLogin();
});

function switchPage(page) {
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
  });
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.sidebar nav a').forEach(function (a) {
    a.classList.toggle('active', a.dataset.page === page);
  });
  if (page === 'dossiers') renderDossiers();
  if (page === 'commissions') renderCommissions();
  if (page === 'dashboard') updateDashboard();
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
  setMoneyEl('kpi-commissions', paxGagnes * pricing.commissionEur);

  const tbody = document.getElementById('dashboard-table');
  tbody.innerHTML = dossiers.length
    ? dossiers
        .slice(0, 5)
        .map(function (d) {
          const comm =
            d.statut === 'gagne' || d.statut === 'paye'
              ? formatMoneyHtml(commissionEurTotal(d))
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
            '</td></tr>'
          );
        })
        .join('')
    : emptyTableRow(6, '—');
}

function renderDossiers() {
  const statutFilter = document.getElementById('filter-statut').value;
  const search = (document.getElementById('filter-search').value || '').toLowerCase();

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
  tbody.innerHTML = filtered.length
    ? filtered
        .map(function (d) {
          var route =
            d.depart && d.arrivee
              ? escHtml(d.depart) + ' → ' + escHtml(d.arrivee)
              : '—';
          const comm =
            d.statut === 'gagne' || d.statut === 'paye'
              ? formatMoneyHtml(commissionEurTotal(d))
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
            escHtml(d.compagnie) +
            '</td><td>' +
            route +
            '</td><td>' +
            formatDate(d.date) +
            '</td><td style="font-size:12px">' +
            escHtml(d.probleme) +
            '</td><td style="text-align:center">' +
            (d.nbPassagers || 1) +
            '</td><td>' +
            badgeHTML(d.statut) +
            '</td><td class="money-cell">' +
            comm +
            '</td></tr>'
          );
        })
        .join('')
    : emptyTableRow(10, '—');
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

  setMoneyEl('comm-total', totalPax * pricing.commissionEur);
  setMoneyEl('comm-paid', paidPax * pricing.commissionEur);
  setMoneyEl('comm-pending', pendingPax * pricing.commissionEur);

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
            formatMoneyHtml(commissionEurTotal(d)) +
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
  const retardEl = document.getElementById('f-retard');
  const retardLbl = document.getElementById('f-retard-label');
  const hint = document.getElementById('f-probleme-hint');
  if (retardEl) {
    retardEl.disabled = attente;
    if (attente) retardEl.value = '';
  }
  if (retardLbl) {
    retardLbl.textContent = attente ? t('form.delay') + ' (opt.)' : t('form.delay');
  }
  if (hint) {
    hint.textContent = attente
      ? "Dossier pré-enregistré : signalez le retard ou l'annulation dans les notes quand vous l'avez."
      : t('form.issue_hint');
  }
}

async function submitDossier() {
  const btnSubmit = document.getElementById('btn-submit-dossier');
  const fields = ['nom', 'prenom', 'tel', 'pnr', 'vol', 'compagnie', 'date', 'depart', 'arrivee', 'probleme'];
  const vals = {};
  let missing = false;
  const attente = isAttenteIncidentForm();

  fields.forEach(function (f) {
    const el = document.getElementById('f-' + f);
    if (!el) return;
    vals[f] = el.value.trim();
    if (f === 'probleme' && vals[f] === '__ATTENTE__') {
      vals[f] = "En attente d'incident (billet vendu)";
    }
    if (!vals[f]) {
      if (el.style) el.style.borderColor = 'var(--red)';
      missing = true;
    } else if (el.style) {
      el.style.borderColor = 'var(--gray-200)';
    }
  });

  const issueRoot = document.getElementById('issue-chips');
  if (!vals.probleme) {
    if (issueRoot) issueRoot.style.outline = '2px solid var(--red)';
    missing = true;
  } else if (issueRoot) {
    issueRoot.style.outline = '';
  }

  if (missing) {
    showToast(t('toast.err'), true);
    return;
  }

  const pnr = vals.pnr.toUpperCase();
  if (pnr.length !== 6) {
    showToast('PNR 6', true);
    return;
  }

  vals.retard = attente ? 0 : parseFloat(document.getElementById('f-retard').value) || 0;
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
    showToast(t('toast.saved'));
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
  ['nom', 'prenom', 'tel', 'pnr', 'vol', 'date', 'depart', 'arrivee', 'retard', 'notes', 'escale-ville', 'vol2'].forEach(
    function (f) {
      const el = document.getElementById('f-' + f);
      if (!el) return;
      el.value = '';
      if (el.style) el.style.borderColor = 'var(--gray-200)';
    }
  );
  const comp = document.getElementById('f-compagnie');
  const prob = document.getElementById('f-probleme');
  if (comp) comp.selectedIndex = 0;
  if (prob) prob.value = '';
  document.querySelectorAll('.issue-chip, .route-chip').forEach(function (c) {
    c.classList.remove('active');
  });
  const issueRoot = document.getElementById('issue-chips');
  if (issueRoot) issueRoot.style.outline = '';
  document.getElementById('f-nb-passagers').value = '1';
  onAgencyProblemeChange();
}

function formatDate(d) {
  if (!d) return '—';
  if (d.indexOf('/') >= 0) return d;
  const parts = d.split('-');
  if (parts.length >= 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return d;
}

function badgeHTML(statut) {
  const keys = {
    nouveau: 'status.nouveau',
    'attente-incident': 'status.attente',
    'en-cours': 'status.encours',
    gagne: 'status.gagne',
    paye: 'status.paye',
    rejete: 'status.rejete',
  };
  const label = keys[statut] ? t(keys[statut]) : statut;
  return '<span class="badge ' + statut + '">' + escHtml(label) + '</span>';
}

function showToast(msg, isError) {
  const toast = document.getElementById('toast');
  toast.innerHTML =
    '<span class="toast-icon">' + (isError ? '⚠️' : '✅') + '</span> ' + escHtml(msg);
  toast.style.background = isError ? 'var(--red)' : 'var(--navy)';
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
  const login = document.getElementById('loginScreen');
  const app = document.getElementById('app');
  if (login) login.style.display = 'none';
  if (app) app.classList.add('active');
  switchPage(preview === '1' ? 'nouveau' : preview);
})();

(async function initAgencyPortal() {
  try {
    const r = await agencyFetch(AGENCY_AUTH_URL);
    const data = await r.json().catch(function () {
      return {};
    });
    if (data.ok && data.agency) showAgencyApp(data.agency);
  } catch (_) {}
})();

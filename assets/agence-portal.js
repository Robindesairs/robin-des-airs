/**
 * Espace agence partenaire — API Airtable (Robin des Airs)
 */
const AGENCY_AUTH_URL = '/api/agency-auth';
const AGENCY_DOSSIERS_URL = '/api/agency-dossiers';

let currentAgency = null;
let dossiers = [];
let commissionPerPax = 30000;
let _agencyLoading = false;

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

function setRefreshButtonsDisabled(disabled) {
  document.querySelectorAll('.btn-refresh').forEach(function (btn) {
    btn.disabled = !!disabled;
  });
}

function commissionAmount(d) {
  return (d.nbPassagers || 1) * commissionPerPax;
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

async function refreshFromAirtable() {
  if (!currentAgency || _agencyLoading) return;
  _agencyLoading = true;
  setRefreshButtonsDisabled(true);
  setAgencySyncStatus('Synchronisation Airtable…');
  try {
    const r = await agencyFetch(AGENCY_DOSSIERS_URL);
    const data = await r.json().catch(function () {
      return {};
    });
    if (!r.ok) throw new Error(data.error || 'HTTP ' + r.status);
    dossiers = data.dossiers || [];
    if (data.commissionPerPax) commissionPerPax = data.commissionPerPax;
    setAgencySyncStatus(
      dossiers.length + ' dossier(s) — MAJ ' + new Date().toLocaleTimeString('fr-FR')
    );
    updateDashboard();
    renderDossiers();
    renderCommissions();
  } catch (e) {
    setAgencySyncStatus('Erreur sync : ' + (e.message || 'échec'), true);
    showToast('Impossible de charger les dossiers : ' + e.message, true);
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

async function doLogin() {
  const code = document.getElementById('loginCode').value.trim().toUpperCase();
  const pass = document.getElementById('loginPass').value;
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
    showAgencyApp(data.agency);
  } catch (e) {
    showToast('Connexion impossible : ' + e.message, true);
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
  document.getElementById('kpi-commissions').textContent = formatFCFA(paxGagnes * commissionPerPax);
  var elSub = document.getElementById('kpi-comm-sub');
  if (elSub) elSub.textContent = commissionPerPax.toLocaleString('fr-FR') + ' FCFA / passager';

  const tbody = document.getElementById('dashboard-table');
  tbody.innerHTML = dossiers.length
    ? dossiers
        .slice(0, 5)
        .map(function (d) {
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
            '</td><td>' +
            (d.statut === 'gagne' || d.statut === 'paye' ? formatFCFA(commissionAmount(d)) : '—') +
            '</td></tr>'
          );
        })
        .join('')
    : emptyTableRow(6, 'Aucun dossier — créez-en un ou actualisez depuis Airtable.');
}

function renderDossiers() {
  const statutFilter = document.getElementById('filter-statut').value;
  const search = (document.getElementById('filter-search').value || '').toLowerCase();

  let filtered = dossiers.slice();
  if (statutFilter) filtered = filtered.filter(function (d) {
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
            '</td><td>' +
            (d.statut === 'gagne' || d.statut === 'paye' ? formatFCFA(commissionAmount(d)) : '—') +
            '</td></tr>'
          );
        })
        .join('')
    : emptyTableRow(10, 'Aucun dossier pour ce filtre.');
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

  document.getElementById('comm-total').textContent = formatFCFA(totalPax * commissionPerPax);
  document.getElementById('comm-paid').textContent = formatFCFA(paidPax * commissionPerPax);
  document.getElementById('comm-pending').textContent = formatFCFA(pendingPax * commissionPerPax);

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
            '</td><td><strong>' +
            formatFCFA(commissionAmount(d)) +
            '</strong></td><td>' +
            (d.statut === 'paye' ? 'Wave' : '—') +
            '</td><td>' +
            (d.statut === 'paye'
              ? '<span class="badge paye">Versé</span>'
              : '<span class="badge nouveau">En attente</span>') +
            '</td></tr>'
          );
        })
        .join('')
    : emptyTableRow(7, 'Aucune commission pour le moment.');
}

function isAttenteIncidentForm() {
  const sel = document.getElementById('f-probleme');
  return sel && sel.value === '__ATTENTE__';
}

function onAgencyProblemeChange() {
  const attente = isAttenteIncidentForm();
  const retardEl = document.getElementById('f-retard');
  const retardLbl = document.getElementById('f-retard-label');
  const hint = document.getElementById('f-probleme-hint');
  if (retardEl) {
    retardEl.disabled = attente;
    if (attente) retardEl.value = '';
  }
  if (retardLbl) {
    retardLbl.textContent = attente
      ? 'Retard (optionnel — après incident)'
      : 'Retard estimé (heures)';
  }
  if (hint) {
    hint.textContent = attente
      ? "Dossier pré-enregistré : signalez le retard ou l'annulation dans les notes quand vous l'avez."
      : "Si le vol n'a pas encore eu de retard ou d'annulation, choisissez « en attente d'incident ».";
  }
}

async function submitDossier() {
  const btnSubmit = document.getElementById('btn-submit-dossier');
  const fields = ['nom', 'prenom', 'email', 'tel', 'pnr', 'vol', 'compagnie', 'date', 'depart', 'arrivee', 'probleme'];
  const vals = {};
  let missing = false;
  const attente = isAttenteIncidentForm();

  fields.forEach(function (f) {
    const el = document.getElementById('f-' + f);
    vals[f] = el.value.trim();
    if (f === 'probleme' && vals[f] === '__ATTENTE__') {
      vals[f] = "En attente d'incident (billet vendu)";
    }
    if (!vals[f]) {
      el.style.borderColor = 'var(--red)';
      missing = true;
    } else {
      el.style.borderColor = 'var(--gray-200)';
    }
  });

  if (missing) {
    showToast('Veuillez remplir tous les champs obligatoires', true);
    return;
  }

  const pnr = vals.pnr.toUpperCase();
  if (pnr.length !== 6) {
    showToast('Le code PNR doit faire 6 caractères', true);
    return;
  }

  vals.retard = attente ? 0 : parseFloat(document.getElementById('f-retard').value) || 0;
  vals.attenteIncident = attente;
  vals.nbPassagers = parseInt(document.getElementById('f-nb-passagers').value, 10) || 1;
  vals.notes = document.getElementById('f-notes').value;

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
    showToast(
      attente
        ? 'Billet ' + data.ref + " enregistré — en attente d'incident"
        : 'Dossier ' + data.ref + ' enregistré dans Airtable'
    );
    resetForm();
    await refreshFromAirtable();
    switchPage('dossiers');
  } catch (e) {
    showToast('Erreur : ' + (e.message || 'échec'), true);
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
  }
}

function resetForm() {
  ['nom', 'prenom', 'email', 'tel', 'pnr', 'vol', 'date', 'depart', 'arrivee', 'retard', 'notes'].forEach(
    function (f) {
      const el = document.getElementById('f-' + f);
      if (!el) return;
      el.value = '';
      el.style.borderColor = 'var(--gray-200)';
    }
  );
  const comp = document.getElementById('f-compagnie');
  const prob = document.getElementById('f-probleme');
  if (comp) comp.selectedIndex = 0;
  if (prob) prob.selectedIndex = 0;
  document.getElementById('f-nb-passagers').value = '1';
  onAgencyProblemeChange();
}

function formatFCFA(n) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

function formatDate(d) {
  if (!d) return '—';
  if (d.indexOf('/') >= 0) return d;
  const parts = d.split('-');
  if (parts.length >= 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return d;
}

function badgeHTML(statut) {
  const labels = {
    nouveau: 'Nouveau',
    'attente-incident': "En attente d'incident",
    'en-cours': 'En cours',
    gagne: 'Gagné',
    paye: 'Payé',
    rejete: 'Rejeté',
  };
  return '<span class="badge ' + statut + '">' + (labels[statut] || statut) + '</span>';
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

(async function initAgencyPortal() {
  try {
    const r = await agencyFetch(AGENCY_AUTH_URL);
    const data = await r.json().catch(function () {
      return {};
    });
    if (data.ok && data.agency) showAgencyApp(data.agency);
  } catch (_) {}
})();

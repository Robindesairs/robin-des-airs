/**
 * Veille serveur Netlify — interrupteurs aller/retour (sans contacter le support).
 */
(function () {
  'use strict';

  var API = (window.location.origin || 'https://robindesairs.eu') + '/api/radar-veille-config';

  function apiOrigin() {
    var o = window.location.origin || '';
    if (!o || o === 'file://' || o === 'null' || /^https?:\/\/localhost(:\d+)?$/i.test(o)) {
      return 'https://robindesairs.eu';
    }
    return o;
  }

  API = apiOrigin() + '/api/radar-veille-config';

  function setStatus(msg, err) {
    var el = document.getElementById('veille-server-status');
    if (!el) return;
    el.textContent = msg || '';
    el.style.color = err ? 'var(--red)' : 'var(--text2)';
  }

  function applyToggles(data) {
    var eff = (data && data.effective) || {};
    var cfg = (data && data.config) || {};
    var cbA = document.getElementById('veille-server-aller');
    var cbR = document.getElementById('veille-server-return');
    if (cbA) {
      cbA.checked = eff.allerEnabled !== false;
      cbA.disabled = !!(eff.envBlocked && (eff.envBlocked.all || eff.envBlocked.aller));
    }
    if (cbR) {
      cbR.checked = eff.returnEnabled !== false;
      cbR.disabled = !!(eff.envBlocked && (eff.envBlocked.all || eff.envBlocked.return));
    }
    var hint = document.getElementById('veille-server-env-hint');
    if (hint) {
      var blocked = eff.envBlocked || {};
      if (blocked.all) {
        hint.textContent = 'Coupe d’urgence Netlify (RADAR_VEILLE_DISABLED) — modifiez la variable d’environnement pour réactiver.';
        hint.style.display = 'block';
      } else if (blocked.aller || blocked.return) {
        hint.textContent =
          'Une variable Netlify bloque ' +
          (blocked.aller && blocked.return ? 'aller et retour' : blocked.aller ? 'aller' : 'retour') +
          ' (RADAR_VEILLE_ALLER / RADAR_VEILLE_RETOUR).';
        hint.style.display = 'block';
      } else {
        hint.style.display = 'none';
      }
    }
    if (data && data.lastScan && data.lastScan.label) {
      setStatus(
        'Dernier scan serveur : ' +
          data.lastScan.kind +
          ' · ' +
          data.lastScan.label +
          ' · ' +
          (data.lastScan.flightCount || 0) +
          ' vol(s) · ' +
          (data.lastScan.at || '').slice(11, 16) +
          ' UTC'
      );
    }
    if (cfg.updatedAt && window.__radarSyncServerScanBadges && data.lastRuns) {
      window.__radarSyncServerScanBadges(data.lastRuns);
    }
  }

  function load() {
    return fetch(API, { credentials: 'include' })
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, data: d };
        });
      })
      .then(function (res) {
        if (!res.ok) {
          setStatus((res.data && res.data.error) || 'Impossible de charger la config serveur', true);
          return;
        }
        applyToggles(res.data);
      })
      .catch(function () {
        setStatus('Config serveur indisponible', true);
      });
  }

  function save() {
    var cbA = document.getElementById('veille-server-aller');
    var cbR = document.getElementById('veille-server-return');
    var btn = document.getElementById('btn-veille-server-save');
    if (btn) btn.disabled = true;
    setStatus('Enregistrement…');
    return fetch(API, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allerEnabled: !!(cbA && cbA.checked),
        returnEnabled: !!(cbR && cbR.checked),
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, data: d };
        });
      })
      .then(function (res) {
        if (!res.ok) {
          setStatus((res.data && res.data.error) || 'Erreur', true);
          return;
        }
        applyToggles(res.data);
        setStatus('Veille serveur enregistrée.');
      })
      .catch(function () {
        setStatus('Erreur réseau', true);
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  function clearHistory() {
    if (!window.confirm('Effacer l’historique des scans serveur (badges et cache) ?')) return;
    setStatus('Effacement…');
    return fetch(API, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearHistory: true }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d.ok) {
          applyToggles(d);
          setStatus('Historique serveur effacé.');
        }
      })
      .catch(function () {
        setStatus('Erreur', true);
      });
  }

  function bind() {
    var saveBtn = document.getElementById('btn-veille-server-save');
    var clearBtn = document.getElementById('btn-veille-server-clear');
    if (saveBtn) saveBtn.addEventListener('click', save);
    if (clearBtn) clearBtn.addEventListener('click', clearHistory);
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  window.addEventListener('radar-gate-unlocked', load);
})();

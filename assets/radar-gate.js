/**
 * Accès interne — tour de contrôle radar (même session que le CRM).
 * GET /api/crm-auth · POST { code } → cookie rda_crm
 */
(function () {
  'use strict';

  var AUTH_URL = '/api/crm-auth';
  var gateEl = null;

  function lockPage() {
    document.documentElement.classList.add('radar-locked');
  }

  function loadRadarLive() {
    if (document.getElementById('radar-live-script')) return;
    var s = document.createElement('script');
    s.id = 'radar-live-script';
    s.src = '/assets/radar-live.js';
    s.defer = true;
    document.body.appendChild(s);
  }

  function unlockPage() {
    document.documentElement.classList.remove('radar-locked');
    if (gateEl && gateEl.parentNode) gateEl.parentNode.removeChild(gateEl);
    gateEl = null;
    loadRadarLive();
  }

  function injectStyles() {
    if (document.getElementById('radar-gate-styles')) return;
    var s = document.createElement('style');
    s.id = 'radar-gate-styles';
    s.textContent =
      'html.radar-locked body > *:not(#radar-internal-gate){visibility:hidden!important;height:0!important;overflow:hidden!important}' +
      '#radar-internal-gate{position:fixed;inset:0;z-index:99999;background:#0B1F3A;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '#radar-internal-gate .rg-card{max-width:400px;width:100%;background:#fff;border-radius:12px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
      '#radar-internal-gate h1{font-size:18px;color:#0B1F3A;margin:0 0 6px}' +
      '#radar-internal-gate p{font-size:13px;color:#6B7280;line-height:1.5;margin:0 0 18px}' +
      '#radar-internal-gate label{display:block;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}' +
      '#radar-internal-gate input{width:100%;padding:11px 12px;border:1px solid #E2E4E8;border-radius:8px;font-size:15px;margin-bottom:12px}' +
      '#radar-internal-gate button{width:100%;padding:12px;border:0;border-radius:8px;background:#007A4C;color:#fff;font-size:14px;font-weight:700;cursor:pointer}' +
      '#radar-internal-gate button:disabled{opacity:.6;cursor:not-allowed}' +
      '#radar-internal-gate .rg-err{color:#C0392B;font-size:12px;margin-top:10px;display:none}' +
      '#radar-internal-gate .rg-err.visible{display:block}';
    document.head.appendChild(s);
  }

  function showGate(message) {
    injectStyles();
    lockPage();
    if (gateEl) return;
    gateEl = document.createElement('div');
    gateEl.id = 'radar-internal-gate';
    gateEl.setAttribute('role', 'dialog');
    gateEl.setAttribute('aria-labelledby', 'radar-gate-title');
    gateEl.innerHTML =
      '<div class="rg-card">' +
      '<h1 id="radar-gate-title">Accès équipe Robin</h1>' +
      '<p>Tour de contrôle vols — usage interne uniquement. Les clients n’ont pas accès à cette page.</p>' +
      '<form id="radar-gate-form">' +
      '<label for="radar-gate-code">Code d’accès</label>' +
      '<input id="radar-gate-code" name="code" type="password" autocomplete="current-password" required placeholder="Code équipe">' +
      '<button type="submit" id="radar-gate-submit">Entrer</button>' +
      '<p class="rg-err" id="radar-gate-err" role="alert"></p>' +
      '</form>' +
      '<p style="font-size:11px;color:#9CA3AF;margin-top:16px;margin-bottom:0">Même code que le CRM dossiers. <a href="/" style="color:#007A4C">Retour accueil</a></p>' +
      '</div>';
    document.body.appendChild(gateEl);

    var form = document.getElementById('radar-gate-form');
    var err = document.getElementById('radar-gate-err');
    var btn = document.getElementById('radar-gate-submit');
    if (message && err) {
      err.textContent = message;
      err.classList.add('visible');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var code = (document.getElementById('radar-gate-code').value || '').trim();
      if (!code) return;
      btn.disabled = true;
      err.classList.remove('visible');
      fetch(AUTH_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
      })
        .then(function (r) {
          return r.json().then(function (d) {
            return { ok: r.ok, data: d };
          });
        })
        .then(function (res) {
          if (res.ok && res.data && res.data.ok) {
            unlockPage();
            window.dispatchEvent(new CustomEvent('radar-gate-unlocked'));
            return;
          }
          err.textContent =
            (res.data && res.data.error) || 'Code incorrect ou accès non configuré sur Netlify.';
          err.classList.add('visible');
          btn.disabled = false;
        })
        .catch(function () {
          err.textContent = 'Connexion impossible. Réessayez.';
          err.classList.add('visible');
          btn.disabled = false;
        });
    });
  }

  function checkSession() {
    return fetch(AUTH_URL, { method: 'GET', credentials: 'include' })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        return d && d.ok === true;
      })
      .catch(function () {
        return false;
      });
  }

  checkSession().then(function (ok) {
    if (ok) {
      unlockPage();
      return;
    }
    showGate();
  });
})();

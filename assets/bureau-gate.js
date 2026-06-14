/**
 * Accès interne — Le Bureau (même session que le CRM).
 * GET /api/crm-auth (vérif session) · POST { code } → cookie rda_crm.
 * Gate léger : ne charge AUCUN script radar (contrairement à radar-gate.js).
 * À l'ouverture de session, émet l'évènement « bureau-crm-unlocked »
 * pour que le tableau de bord recharge les endpoints protégés.
 */
(function () {
  'use strict';

  function authOrigin() {
    var o = window.location.origin || '';
    if (!o || o === 'file://' || o === 'null' ||
        /^https?:\/\/localhost(:\d+)?$/i.test(o) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(o)) {
      return 'https://robindesairs.eu';
    }
    return o;
  }

  var AUTH_URL = authOrigin() + '/api/crm-auth';
  var gateEl = null;

  function lockPage() {
    document.documentElement.classList.add('bureau-locked');
  }

  function unlockPage() {
    document.documentElement.classList.remove('bureau-locked');
    if (gateEl && gateEl.parentNode) gateEl.parentNode.removeChild(gateEl);
    gateEl = null;
    window.dispatchEvent(new CustomEvent('bureau-crm-unlocked'));
  }

  function injectStyles() {
    if (document.getElementById('bureau-gate-styles')) return;
    var s = document.createElement('style');
    s.id = 'bureau-gate-styles';
    s.textContent =
      'html.bureau-locked body > *:not(#bureau-internal-gate){visibility:hidden!important;height:0!important;overflow:hidden!important}' +
      '#bureau-internal-gate{position:fixed;inset:0;z-index:99999;background:#0B1F3A;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '#bureau-internal-gate .rg-card{max-width:400px;width:100%;background:#fff;border-radius:12px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
      '#bureau-internal-gate h1{font-size:18px;color:#0B1F3A;margin:0 0 6px}' +
      '#bureau-internal-gate p{font-size:13px;color:#6B7280;line-height:1.5;margin:0 0 18px}' +
      '#bureau-internal-gate label{display:block;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}' +
      '#bureau-internal-gate input{width:100%;padding:11px 12px;border:1px solid #E2E4E8;border-radius:8px;font-size:15px;margin-bottom:12px}' +
      '#bureau-internal-gate button{width:100%;padding:12px;border:0;border-radius:8px;background:#007A4C;color:#fff;font-size:14px;font-weight:700;cursor:pointer}' +
      '#bureau-internal-gate button:disabled{opacity:.6;cursor:not-allowed}' +
      '#bureau-internal-gate .rg-err{color:#C0392B;font-size:12px;margin-top:10px;display:none}' +
      '#bureau-internal-gate .rg-err.visible{display:block}';
    document.head.appendChild(s);
  }

  function showGate(message) {
    injectStyles();
    lockPage();
    if (gateEl) return;
    gateEl = document.createElement('div');
    gateEl.id = 'bureau-internal-gate';
    gateEl.setAttribute('role', 'dialog');
    gateEl.setAttribute('aria-labelledby', 'bureau-gate-title');
    gateEl.innerHTML =
      '<div class="rg-card">' +
      '<h1 id="bureau-gate-title">Le Bureau — accès interne</h1>' +
      '<p>Espace réservé à l’équipe. Saisissez votre code d’accès pour afficher les données réelles.</p>' +
      '<form id="bureau-gate-form">' +
      '<label for="bureau-gate-code">Code d’accès</label>' +
      '<input id="bureau-gate-code" name="code" type="password" autocomplete="current-password" required placeholder="Code équipe">' +
      '<button type="submit" id="bureau-gate-submit">Entrer</button>' +
      '<p class="rg-err" id="bureau-gate-err" role="alert"></p>' +
      '</form>' +
      '<p style="font-size:11px;color:#9CA3AF;margin-top:16px;margin-bottom:0"><a href="/" style="color:#007A4C">Retour accueil</a></p>' +
      '</div>';
    document.body.appendChild(gateEl);

    var form = document.getElementById('bureau-gate-form');
    var err = document.getElementById('bureau-gate-err');
    var btn = document.getElementById('bureau-gate-submit');
    if (message && err) {
      err.textContent = message;
      err.classList.add('visible');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var code = (document.getElementById('bureau-gate-code').value || '').trim();
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
          return r.json().then(function (d) { return { ok: r.ok, data: d }; });
        })
        .then(function (res) {
          if (res.ok && res.data && res.data.ok) {
            // Mémorise le code pour l'auth par en-tête (résiste au blocage des cookies).
            try { sessionStorage.setItem('rda_crm_code', code); } catch (e) {}
            unlockPage();
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
    var h = {};
    try { var c = sessionStorage.getItem('rda_crm_code'); if (c) h['X-CRM-Code'] = c; } catch (e) {}
    return fetch(AUTH_URL, { method: 'GET', credentials: 'include', headers: h })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d && d.ok === true; })
      .catch(function () { return false; });
  }

  // Dev/local : on n'expose aucun secret et /api est absent → on laisse la démo visible.
  var isLocal =
    /^https?:\/\/localhost(:\d+)?$/i.test(window.location.origin || '') ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(window.location.origin || '');
  if (isLocal) {
    return; // pas de lock en local
  }

  checkSession().then(function (ok) {
    if (ok) {
      unlockPage(); // session déjà valide → émet l'évènement de rechargement
      return;
    }
    showGate();
  });
})();

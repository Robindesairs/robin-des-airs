/*!
 * pre-launch.js — Robin des Airs
 * Bandeau "pré-lancement" + interception des soumissions de mandat tant que la SAS
 * n'est pas immatriculée.
 *
 * Pour DÉSACTIVER après lancement officiel : suffit de supprimer ce fichier ou de
 * vider son contenu. Les <script src="/assets/pre-launch.js"></script> dans les
 * pages resteront sans effet (404 silencieux).
 */
(function () {
  'use strict';

  // ============ CONFIG ============
  var BANNER_HEIGHT = 44;
  var STORAGE_KEY = 'rda_prelaunch_dismissed_v1';
  var BANNER_TEXT = '🚀 Robin des Airs ouvre bientôt — service en pré-lancement, finalisation administrative en cours.';
  var MODAL_TITLE = 'Service en pré-lancement';
  var MODAL_BODY =
    "Robin des Airs n'a pas encore terminé son immatriculation officielle. " +
    "Pour ta sécurité juridique, aucun mandat ne peut être enregistré pour le moment. " +
    "Laisse ton e-mail pour être prévenu·e dès l'ouverture (sous 1-2 semaines).";

  // ============ STYLES (auto-injectés) ============
  var css =
    '#rda-prelaunch-banner{position:fixed;top:0;left:0;right:0;height:' + BANNER_HEIGHT + 'px;' +
    'background:linear-gradient(90deg,#F59E0B 0%,#F97316 100%);color:#0B1F3A;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Montserrat",sans-serif;font-size:.875rem;' +
    'font-weight:600;display:flex;align-items:center;justify-content:center;gap:12px;' +
    'padding:0 16px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.12);text-align:center;' +
    'line-height:1.3}' +
    '#rda-prelaunch-banner span{flex:1 1 auto;max-width:880px;overflow:hidden;text-overflow:ellipsis}' +
    '#rda-prelaunch-banner button{background:rgba(11,31,58,.12);border:1px solid rgba(11,31,58,.2);' +
    'color:#0B1F3A;font-weight:700;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:.75rem;' +
    'white-space:nowrap;font-family:inherit}' +
    '#rda-prelaunch-banner button:hover{background:rgba(11,31,58,.2)}' +
    'body.rda-prelaunch-pad{padding-top:' + BANNER_HEIGHT + 'px}' +
    '@media(max-width:600px){#rda-prelaunch-banner{font-size:.75rem;height:auto;min-height:' + BANNER_HEIGHT + 'px;padding:8px 12px}body.rda-prelaunch-pad{padding-top:60px}}' +
    /* MODAL */
    '#rda-prelaunch-overlay{position:fixed;inset:0;background:rgba(11,31,58,.6);' +
    'z-index:10000;display:none;align-items:center;justify-content:center;padding:20px;' +
    'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
    '#rda-prelaunch-overlay.show{display:flex}' +
    '#rda-prelaunch-modal{background:#fff;border-radius:14px;max-width:480px;width:100%;' +
    'padding:28px 24px;box-shadow:0 24px 60px rgba(0,0,0,.3);position:relative;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Montserrat",sans-serif}' +
    '#rda-prelaunch-modal h3{margin:0 0 12px;color:#0B1F3A;font-size:1.25rem;font-weight:900}' +
    '#rda-prelaunch-modal p{margin:0 0 18px;color:#374151;font-size:.9375rem;line-height:1.5}' +
    '#rda-prelaunch-modal .rda-form{display:flex;gap:8px;flex-wrap:wrap}' +
    '#rda-prelaunch-modal input[type=email]{flex:1 1 200px;padding:11px 14px;border:1px solid #D1D5DB;' +
    'border-radius:8px;font-size:.9375rem;font-family:inherit;outline:none;min-width:0}' +
    '#rda-prelaunch-modal input[type=email]:focus{border-color:#F59E0B;box-shadow:0 0 0 3px rgba(245,158,11,.2)}' +
    '#rda-prelaunch-modal .rda-btn{background:#F59E0B;color:#0B1F3A;border:none;padding:11px 18px;' +
    'border-radius:8px;font-weight:800;font-size:.875rem;cursor:pointer;font-family:inherit;' +
    'white-space:nowrap;text-transform:uppercase;letter-spacing:.04em}' +
    '#rda-prelaunch-modal .rda-btn:hover{background:#D97706}' +
    '#rda-prelaunch-modal .rda-btn:disabled{background:#9CA3AF;cursor:not-allowed}' +
    '#rda-prelaunch-modal .rda-close{position:absolute;top:10px;right:14px;background:none;border:none;' +
    'font-size:1.6rem;color:#9CA3AF;cursor:pointer;line-height:1;font-family:inherit}' +
    '#rda-prelaunch-modal .rda-close:hover{color:#0B1F3A}' +
    '#rda-prelaunch-modal .rda-ok{color:#16A34A;font-weight:700;margin-top:14px;display:none}' +
    '#rda-prelaunch-modal.success .rda-ok{display:block}' +
    '#rda-prelaunch-modal.success .rda-form{display:none}';

  function injectCSS() {
    var style = document.createElement('style');
    style.id = 'rda-prelaunch-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ============ BANDEAU ============
  function buildBanner() {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') {
      // L'utilisateur a fermé le bandeau pour la session — on garde quand même l'interception
      return;
    }
    var banner = document.createElement('div');
    banner.id = 'rda-prelaunch-banner';
    banner.setAttribute('role', 'banner');
    banner.innerHTML =
      '<span>' + BANNER_TEXT + '</span>' +
      '<button type="button" aria-label="Fermer">×</button>';
    document.body.insertBefore(banner, document.body.firstChild);
    document.body.classList.add('rda-prelaunch-pad');
    banner.querySelector('button').addEventListener('click', function () {
      banner.remove();
      document.body.classList.remove('rda-prelaunch-pad');
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
    });
  }

  // ============ MODALE ============
  var modalEl = null;
  function buildModal() {
    if (modalEl) return modalEl;
    var overlay = document.createElement('div');
    overlay.id = 'rda-prelaunch-overlay';
    overlay.innerHTML =
      '<div id="rda-prelaunch-modal" role="dialog" aria-modal="true" aria-labelledby="rda-pl-t">' +
      '  <button class="rda-close" aria-label="Fermer">×</button>' +
      '  <h3 id="rda-pl-t">' + MODAL_TITLE + '</h3>' +
      '  <p>' + MODAL_BODY + '</p>' +
      '  <form class="rda-form" novalidate>' +
      '    <input type="email" required placeholder="ton-email@exemple.fr" autocomplete="email">' +
      '    <button type="submit" class="rda-btn">Me prévenir</button>' +
      '  </form>' +
      '  <p class="rda-ok">✓ Merci ! Tu seras prévenu·e dès l\'ouverture officielle.</p>' +
      '</div>';
    document.body.appendChild(overlay);
    modalEl = overlay;

    overlay.querySelector('.rda-close').addEventListener('click', hideModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) hideModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('show')) hideModal();
    });

    overlay.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = overlay.querySelector('input[type=email]');
      var btn = overlay.querySelector('button[type=submit]');
      if (!input.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        input.focus(); return;
      }
      btn.disabled = true; btn.textContent = '...';
      // Stockage local (l'API rdv-launch n'existe pas encore, donc on stocke côté navigateur)
      try {
        var subs = JSON.parse(localStorage.getItem('rda_prelaunch_subs') || '[]');
        subs.push({ email: input.value, ts: new Date().toISOString(), page: location.pathname });
        localStorage.setItem('rda_prelaunch_subs', JSON.stringify(subs));
      } catch (_) {}
      // Tentative best-effort vers une fonction Netlify si dispo
      try {
        fetch('/api/wa-click-prospect', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'pre-launch-modal', email: input.value, page: location.pathname })
        }).catch(function () {});
      } catch (_) {}
      overlay.querySelector('#rda-prelaunch-modal').classList.add('success');
      setTimeout(hideModal, 2500);
    });

    return overlay;
  }

  function showModal() {
    var m = buildModal();
    m.classList.add('show');
    setTimeout(function () { m.querySelector('input[type=email]').focus(); }, 50);
  }
  function hideModal() {
    if (modalEl) modalEl.classList.remove('show');
  }

  // ============ INTERCEPTION DES SOUMISSIONS ============
  function interceptForms() {
    // Boutons "Submit" / "Signer" connus dans le site
    var selectors = [
      '#btnSub',                          // mandat.html
      'button[onclick*="submitMandat"]',  // tous les onclick submitMandat()
      'button[onclick*="submitDossier"]', // si présent
      'form[action*="submit-mandat"] button[type=submit]',
      'form[action*="sign-mandate"] button[type=submit]',
      'form[action*="yousign-init"] button[type=submit]',
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (el.dataset.rdaPlIntercepted) return;
        el.dataset.rdaPlIntercepted = '1';
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          showModal();
        }, true); // capture phase
      });
    });

    // Au cas où submitMandat est appelée directement, on remplace la fonction globale
    if (typeof window.submitMandat === 'function' && !window._rdaOrigSubmit) {
      window._rdaOrigSubmit = window.submitMandat;
      window.submitMandat = function () { showModal(); };
    }
  }

  // ============ INIT ============
  function init() {
    if (document.getElementById('rda-prelaunch-css')) return; // déjà initialisé
    injectCSS();
    buildBanner();
    interceptForms();
    // Re-scanner après éventuelle hydratation (single-page-app, lazy load)
    setTimeout(interceptForms, 1000);
    setTimeout(interceptForms, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

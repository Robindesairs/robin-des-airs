// ── Signature Yousign EMBARQUÉE (invisible) — helper partagé ─────────────────
// Ouvre la signature dans un cadre plein écran SUR le site (le client ne part pas).
// Repli AUTOMATIQUE sur la redirection classique si : SDK injoignable, domaine non
// whitelisté côté Yousign (iFraming), erreur, ou aucun signe de vie sous 8 s.
// 🔴 Ne s'affiche vraiment qu'APRÈS whitelisting « robindesairs.eu » dans Yousign → Paramètres → iFraming.
// CSP requise (déjà dans _headers) : script-src cdn.yousign.tech ; frame-src *.yousign.app.
(function () {
  'use strict';
  if (window.embedYousign) return; // déjà défini (copie inline de mandat.html) → ne pas écraser
  var YOUSIGN_SDK_URL = 'https://cdn.yousign.tech/iframe-sdk-1.6.0.min.js';
  if (typeof window.YOUSIGN_EMBED === 'undefined') window.YOUSIGN_EMBED = true;

  // Charge le SDK une seule fois. Résout quand window.Yousign est prêt, rejette au timeout.
  function loadYousignSdk() {
    return new Promise(function (resolve, reject) {
      if (window.Yousign) return resolve();
      var s = document.createElement('script');
      s.src = YOUSIGN_SDK_URL; s.async = true;
      s.onload = function () { window.Yousign ? resolve() : reject(new Error('SDK sans Yousign')); };
      s.onerror = function () { reject(new Error('SDK Yousign injoignable')); };
      document.head.appendChild(s);
      setTimeout(function () { window.Yousign ? resolve() : reject(new Error('SDK Yousign timeout')); }, 6000);
    });
  }
  window.loadYousignSdk = loadYousignSdk;

  // opts : { onSuccess(fn), onDeclined(fn), successUrl }
  //  - onSuccess fourni  → appelé à la signature réussie (le tunnel gère la suite : signataire suivant / écran final).
  //  - sinon successUrl  → redirection classique post-signature.
  window.embedYousign = function (signatureLink, opts) {
    opts = opts || {};
    var done = false;
    function fallbackRedirect() { if (done) return; done = true; window.location.href = signatureLink; }
    loadYousignSdk().then(function () {
      var overlay = document.createElement('div');
      overlay.id = 'ys-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b1220;display:flex;flex-direction:column';
      var bar = document.createElement('div');
      bar.style.cssText = 'flex:0 0 auto;padding:10px 16px;color:#fff;font:600 13px system-ui,sans-serif;display:flex;align-items:center;justify-content:space-between;gap:12px';
      // Lien de secours TOUJOURS visible : si l'iframe ne s'affiche pas, plein écran.
      bar.innerHTML = '<span><span style="color:#00C87A">🔒</span> Signature électronique sécurisée</span>' +
        '<a href="' + String(signatureLink).replace(/"/g, '%22') + '" style="color:#9fb3c8;font-weight:600;font-size:12px;text-decoration:underline;white-space:nowrap">Un souci ? Ouvrir en plein écran →</a>';
      var container = document.createElement('div');
      container.id = 'ys-iframe-container';
      container.style.cssText = 'flex:1 1 auto;min-height:0';
      overlay.appendChild(bar); overlay.appendChild(container);
      document.body.appendChild(overlay);
      function close() { try { document.body.removeChild(overlay); } catch (_) {} }
      // Chien de garde : aucun started/ping sous 8 s → blocage probable → repli redirection. Zéro client bloqué.
      var alive = false;
      var watchdog = setTimeout(function () { if (!alive && !done) { close(); fallbackRedirect(); } }, 8000);
      try {
        var ys = new window.Yousign({
          signatureLink: signatureLink,
          iframeContainerId: 'ys-iframe-container',
          isSandbox: /sandbox/i.test(signatureLink),
        });
        if (ys.onStarted) ys.onStarted(function () { alive = true; clearTimeout(watchdog); });
        if (ys.onPing) ys.onPing(function () { alive = true; });
        ys.onSuccess(function () {
          done = true; clearTimeout(watchdog); close();
          if (typeof opts.onSuccess === 'function') { opts.onSuccess(); return; }
          if (opts.successUrl) window.location.href = opts.successUrl;
        });
        ys.onError(function () { clearTimeout(watchdog); close(); fallbackRedirect(); });
        if (ys.onDeclined) ys.onDeclined(function () { done = true; clearTimeout(watchdog); close(); if (typeof opts.onDeclined === 'function') opts.onDeclined(); });
      } catch (e) { clearTimeout(watchdog); close(); fallbackRedirect(); }
    }).catch(function () { fallbackRedirect(); });
  };
})();

/**
 * Barre Langue (FR/EN) + Devise (EUR / FCFA / USD) pour les pages sans bandeau i18n complet.
 * S’appuie sur /i18n.js (localStorage robin_lang, robin_currency).
 */
(function () {
  var CSS =
    '#robin-locale-toolbar{position:fixed;bottom:max(10px,env(safe-area-inset-bottom));left:max(10px,env(safe-area-inset-left));z-index:9997;display:flex;flex-wrap:wrap;align-items:center;gap:8px;background:rgba(255,255,255,.98);border:1px solid rgba(11,31,58,.12);border-radius:10px;padding:8px 10px;box-shadow:0 4px 24px rgba(11,31,58,.12);font-family:Montserrat,system-ui,sans-serif;font-size:12px;max-width:calc(100vw - 20px)}' +
    '#robin-locale-toolbar .rlt-group{display:flex;align-items:center;gap:6px}' +
    '#robin-locale-toolbar label{margin:0;color:#5c6b7f;font-weight:700;font-size:10px;letter-spacing:.06em;text-transform:uppercase}' +
    '#robin-locale-toolbar select{border:1px solid #e2e6ee;border-radius:6px;padding:5px 8px;font:inherit;background:#fff;color:#122032;min-width:0}';

  function injectStyle() {
    if (document.getElementById('robin-locale-toolbar-styles')) return;
    var s = document.createElement('style');
    s.id = 'robin-locale-toolbar-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function syncToolbarFromI18n() {
    if (!window.I18N) return;
    var lang = document.getElementById('robin-toolbar-lang');
    var cur = document.getElementById('robin-toolbar-currency');
    if (lang && I18N.getLang) lang.value = I18N.getLang() === 'en' ? 'en' : 'fr';
    if (cur && I18N.getCurrency) {
      var c = I18N.getCurrency();
      cur.value = c === 'fcfa' || c === 'usd' ? c : 'eur';
    }
  }

  function mount() {
    if (document.getElementById('robin-locale-toolbar')) return;
    injectStyle();
    var bar = document.createElement('div');
    bar.id = 'robin-locale-toolbar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Langue et devise d’affichage');
    bar.innerHTML =
      '<div class="rlt-group">' +
      '<label for="robin-toolbar-lang">Langue</label>' +
      '<select id="robin-toolbar-lang" autocomplete="off">' +
      '<option value="fr">Français</option>' +
      '<option value="en">English</option>' +
      '</select></div>' +
      '<div class="rlt-group">' +
      '<label for="robin-toolbar-currency">Devise</label>' +
      '<select id="robin-toolbar-currency" autocomplete="off">' +
      '<option value="eur">EUR (€)</option>' +
      '<option value="fcfa">FCFA</option>' +
      '<option value="usd">USD ($)</option>' +
      '</select></div>';
    document.body.appendChild(bar);

    var lang = document.getElementById('robin-toolbar-lang');
    var cur = document.getElementById('robin-toolbar-currency');
    lang.addEventListener('change', function () {
      if (window.I18N) I18N.setLang(lang.value === 'en' ? 'en' : 'fr');
    });
    cur.addEventListener('change', function () {
      if (window.I18N) I18N.setCurrency(cur.value);
    });
    document.addEventListener('robin-locale-change', syncToolbarFromI18n);
  }

  function boot() {
    if (!window.I18N) return;
    mount();
    I18N.apply();
    syncToolbarFromI18n();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

(function () {
  if (!/[?&]palette=robin/.test(location.search)) return;

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/assets/palette-robin.css';
  document.head.appendChild(link);

  document.documentElement.classList.add('palette-robin-preview');
  if (document.body) document.body.classList.add('palette-robin-preview');

  function wrapRobinInHero() {
    var span = document.querySelector('.hero-title span[data-i18n-html]');
    if (!span || span.querySelector('.brand-sapin')) return;
    var html = span.innerHTML;
    if (!/Robin/i.test(html)) return;
    span.innerHTML = html.replace(/\bRobin\b/i, '<span class="brand-sapin">Robin</span>');
  }

  function banner() {
    if (document.getElementById('palette-robin-banner')) return;
    var b = document.createElement('div');
    b.id = 'palette-robin-banner';
    b.innerHTML =
      '<strong>Aperçu v2 minimaliste</strong>' +
      '<span>Navy inchangé · sapin = ROBIN · or = chiffres clés</span>' +
      '<span class="swatch"><span class="dot" style="background:#0a3d2e"></span> Sapin</span>' +
      '<span class="swatch"><span class="dot" style="background:#c9a96e"></span> Or</span>' +
      '<a href="/index.html">Version actuelle →</a>';
    document.body.appendChild(b);
    document.body.style.paddingBottom = '56px';
  }

  function init() {
    wrapRobinInHero();
    banner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('robin-locale-change', function () {
    setTimeout(wrapRobinInHero, 50);
  });
})();

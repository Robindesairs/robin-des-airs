/**
 * Affichage multi-devises — espace agence (EUR = référence interne).
 */
(function (global) {
  const LS_CURRENCY = 'rda_agence_currency';
  const LS_EQUIV = 'rda_agence_show_equiv';

  /** Gambie : dalasi par défaut, euro en équivalent (pas USD / FCFA). */
  const CURRENCIES = {
    GMD: { label: 'Dalasi (GMD)', symbol: 'GMD', rate: 84, position: 'after', decimals: 0, space: true },
    EUR: { label: 'Euro (€)', symbol: '€', rate: 1, position: 'after', decimals: 0 },
  };

  const EQUIV_ORDER = ['GMD', 'EUR'];

  function getCurrency() {
    const c = (localStorage.getItem(LS_CURRENCY) || 'GMD').toUpperCase();
    if (!CURRENCIES[c]) {
      setCurrency('GMD');
      return 'GMD';
    }
    return c;
  }

  function setCurrency(code) {
    if (CURRENCIES[code]) localStorage.setItem(LS_CURRENCY, code);
  }

  function getShowEquiv() {
    return localStorage.getItem(LS_EQUIV) !== '0';
  }

  function setShowEquiv(on) {
    localStorage.setItem(LS_EQUIV, on ? '1' : '0');
  }

  function fromEur(amountEur, code) {
    const c = CURRENCIES[code];
    if (!c) return amountEur;
    return amountEur * c.rate;
  }

  function formatNumber(n, decimals) {
    return Math.round(n).toLocaleString(
      typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'fr-FR',
      { maximumFractionDigits: decimals, minimumFractionDigits: decimals }
    );
  }

  function formatInCurrency(amountEur, code) {
    const c = CURRENCIES[code] || CURRENCIES.EUR;
    const v = fromEur(amountEur, code);
    const n = formatNumber(v, c.decimals);
    if (c.position === 'before') return c.symbol + n;
    return c.space ? n + ' ' + c.symbol : n + c.symbol;
  }

  /** Montant principal + ligne d'équivalents optionnelle */
  function formatMoney(amountEur, opts) {
    const code = (opts && opts.currency) || getCurrency();
    const main = formatInCurrency(amountEur, code);
    if (opts && opts.mainOnly) return main;
    if (opts && opts.equiv === false) return main;
    if (!getShowEquiv() && !(opts && opts.equiv)) return main;
    const parts = EQUIV_ORDER.filter((k) => k !== code).map((k) => '≈ ' + formatInCurrency(amountEur, k));
    return { main, equiv: parts.join(' · ') };
  }

  function formatMoneyHtml(amountEur) {
    const f = formatMoney(amountEur);
    if (typeof f === 'string') return f;
    return (
      '<span class="money-main">' +
      f.main +
      '</span><span class="money-equiv">' +
      f.equiv +
      '</span>'
    );
  }

  function fillCurrencySelect(selectEl) {
    if (!selectEl) return;
    const cur = getCurrency();
    selectEl.innerHTML = Object.entries(CURRENCIES)
      .map(([k, v]) => '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + v.label + '</option>')
      .join('');
  }

  function bindControls(currencySelect, equivCheckbox, onChange) {
    fillCurrencySelect(currencySelect);
    if (currencySelect) {
      currencySelect.value = getCurrency();
      currencySelect.addEventListener('change', function () {
        setCurrency(currencySelect.value);
        if (onChange) onChange();
      });
    }
    if (equivCheckbox) {
      equivCheckbox.checked = getShowEquiv();
      equivCheckbox.addEventListener('change', function () {
        setShowEquiv(equivCheckbox.checked);
        if (onChange) onChange();
      });
    }
  }

  global.AgenceCurrency = {
    CURRENCIES,
    getCurrency,
    setCurrency,
    getShowEquiv,
    setShowEquiv,
    formatInCurrency,
    formatMoney,
    formatMoneyHtml,
    fillCurrencySelect,
    bindControls,
    fromEur,
  };
})(typeof window !== 'undefined' ? window : global);

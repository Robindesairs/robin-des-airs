/**
 * Formulaire newsletter pied de page — POST /api/newsletter-subscribe
 */
(function () {
  'use strict';

  function t(key, fallback) {
    if (window.I18N && typeof window.I18N.t === 'function') {
      var v = window.I18N.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  function init() {
    var form = document.getElementById('newsletter-form');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    var msg = document.getElementById('newsletter-msg');
    var btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!msg) return;

      var emailEl = form.querySelector('#newsletter-email');
      var consentEl = form.querySelector('#newsletter-consent');
      var email = (emailEl && emailEl.value || '').trim();
      var consent = consentEl && consentEl.checked;

      msg.hidden = false;
      msg.className = 'footer-newsletter-msg';

      if (!email) {
        msg.textContent = t('footer_newsletter_err_email', 'Indiquez votre adresse e-mail.');
        msg.classList.add('footer-newsletter-msg--err');
        return;
      }
      if (!consent) {
        msg.textContent = t(
          'footer_newsletter_err_consent',
          'Cochez la case pour recevoir la newsletter.'
        );
        msg.classList.add('footer-newsletter-msg--err');
        return;
      }

      if (btn) btn.disabled = true;
      msg.textContent = t('footer_newsletter_sending', 'Inscription en cours…');
      msg.classList.remove('footer-newsletter-msg--err', 'footer-newsletter-msg--ok');

      fetch('/api/newsletter-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          consent: true,
          source: 'footer',
          website: (form.querySelector('[name="website"]') || {}).value || '',
        }),
      })
        .then(function (r) {
          return r.json().then(function (d) {
            return { ok: r.ok, data: d };
          });
        })
        .then(function (res) {
          if (res.ok && res.data && res.data.ok) {
            msg.textContent =
              res.data.already === true
                ? t('footer_newsletter_already', 'Vous êtes déjà inscrit(e). Merci !')
                : t('footer_newsletter_ok', 'Merci ! Vous recevrez nos prochains conseils par e-mail.');
            msg.classList.add('footer-newsletter-msg--ok');
            form.reset();
            return;
          }
          throw new Error((res.data && res.data.error) || 'Erreur');
        })
        .catch(function (err) {
          msg.textContent =
            err.message ||
            t('footer_newsletter_err', 'Inscription impossible. Réessayez ou écrivez-nous.');
          msg.classList.add('footer-newsletter-msg--err');
        })
        .finally(function () {
          if (btn) btn.disabled = false;
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

#!/usr/bin/env python3
"""Upgrade espace-agence: remove demo script, fast form, visible locale."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / "espace-agence.html"
html = p.read_text(encoding="utf-8")
if "<script>\n// ========== DATA STORE" in html:
    html = html.split("<script>\n// ========== DATA STORE")[0].rstrip()
    if not html.endswith("</motion>"):
        pass

FOOTER = """
<!-- Toast -->
<div class="toast" id="toast"></div>

<script src="/assets/agence-i18n.js"></script>
<script src="/assets/agence-currency.js"></script>
<script src="/assets/agence-portal.js"></script>

</body>
</html>
""".replace("</motion>", "</div>")

if "agence-portal.js" not in html:
    html = html.rstrip() + "\n\n" + FOOTER

NEW_FORM = r'''    <!-- ===== NOUVEAU DOSSIER ===== -->
    <div class="page" id="page-nouveau">
      <motion class="page-header">
        <h1 data-i18n="new.title">Nouveau dossier</h1>
        <p data-i18n="new.sub">Déposez un dossier en 1 minute — Robin attribue l'email client automatiquement.</p>
      </motion>

      <motion class="form-card form-card--fast">
        <motion class="form-step">
          <motion class="form-step-label" data-i18n="form.step1">1 — Passager</motion>
          <div class="form-row">
            <div class="form-group">
              <label data-i18n="form.lastname">Nom</label>
              <input type="text" id="f-nom" data-i18n-placeholder="form.lastname" placeholder="KODJO" autocomplete="family-name">
            </motion>
            <div class="form-group">
              <label data-i18n="form.firstname">Prénom</label>
              <input type="text" id="f-prenom" data-i18n-placeholder="form.firstname" placeholder="Amadou" autocomplete="given-name">
            </motion>
          </motion>
          <div class="form-row">
            <div class="form-group form-group--wide">
              <label data-i18n="form.phone">Téléphone (WhatsApp)</label>
              <input type="tel" id="f-tel" placeholder="+220 700 00 00" autocomplete="tel">
              <p class="form-hint" data-i18n="form.email_auto">Pas d'email à saisir : Robin crée l'adresse dossier (ref@robindesairs.eu).</p>
            </motion>
          </motion>
        </motion>

        <motion class="form-step">
          <motion class="form-step-label" data-i18n="form.step2">2 — Vol</motion>
          <div class="form-row">
            <div class="form-group">
              <label data-i18n="form.pnr">Code PNR (6 caractères)</label>
              <input type="text" id="f-pnr" placeholder="AB1C2D" maxlength="6" class="input-pnr" autocomplete="off">
            </motion>
            <div class="form-group">
              <label data-i18n="form.flightno">Numéro de vol</label>
              <input type="text" id="f-vol" placeholder="AF718" style="text-transform:uppercase">
            </motion>
          </motion>
          <div class="form-row">
            <div class="form-group">
              <label data-i18n="form.airline">Compagnie</label>
              <select id="f-compagnie">
                <option value="" data-i18n="form.select">Sélectionner...</option>
                <option>Air France</option>
                <option>Brussels Airlines</option>
                <option>Turkish Airlines</option>
                <option>Royal Air Maroc</option>
                <option>Transavia</option>
                <option>Vueling</option>
                <option>Iberia</option>
                <option>Autre</option>
              </select>
            </motion>
            <div class="form-group">
              <label data-i18n="form.fdate">Date du vol</label>
              <input type="date" id="f-date">
            </motion>
          </motion>
          <p class="form-hint" data-i18n="form.route_quick">Trajet fréquent (1 clic) :</p>
          <div class="route-chips" id="route-chips">
            <button type="button" class="route-chip" data-depart="Paris CDG" data-arrivee="Banjul BJL">CDG → Banjul</button>
            <button type="button" class="route-chip" data-depart="Bruxelles BRU" data-arrivee="Banjul BJL">BRU → Banjul</button>
            <button type="button" class="route-chip" data-depart="Istanbul IST" data-arrivee="Banjul BJL">IST → Banjul</button>
            <button type="button" class="route-chip" data-depart="Dakar DSS" data-arrivee="Banjul BJL">DSS → Banjul</button>
          </motion>
          <div class="form-row">
            <div class="form-group">
              <label data-i18n="form.from">Départ</label>
              <input type="text" id="f-depart" placeholder="Paris CDG">
            </motion>
            <div class="form-group">
              <label data-i18n="form.to">Arrivée</label>
              <input type="text" id="f-arrivee" placeholder="Banjul BJL">
            </motion>
          </motion>
        </motion>

        <motion class="form-step">
          <motion class="form-step-label" data-i18n="form.step3">3 — Situation</motion>
          <div class="issue-chips" id="issue-chips" role="group">
            <button type="button" class="issue-chip" data-value="__ATTENTE__" data-i18n="issue.wait">⏳ Billet vendu</button>
            <button type="button" class="issue-chip" data-value="Retard +3h à l'arrivée" data-i18n="issue.delay">Retard +3h</button>
            <button type="button" class="issue-chip" data-value="Vol annulé" data-i18n="issue.cancel">Vol annulé</button>
            <button type="button" class="issue-chip" data-value="Surbooking / Refus d'embarquement" data-i18n="issue.denied">Refus embarquement</button>
            <button type="button" class="issue-chip" data-value="Correspondance manquée" data-i18n="issue.missed">Correspondance / escale</button>
          </motion>
          <input type="hidden" id="f-probleme" value="">
          <p class="form-hint" id="f-probleme-hint" data-i18n="form.issue_hint">Choisissez la situation la plus proche.</p>

          <div id="panel-escale" class="panel-escale" hidden>
            <p class="form-hint" data-i18n="form.escale_hint">Précisez l'escale ou la correspondance manquée :</p>
            <div class="form-row">
              <div class="form-group">
                <label data-i18n="form.escale_via">Ville d'escale / correspondance</label>
                <input type="text" id="f-escale-ville" placeholder="ex. Paris CDG, Bruxelles">
              </motion>
              <div class="form-group">
                <label data-i18n="form.escale_vol2">2ᵉ vol (optionnel)</label>
                <input type="text" id="f-vol2" placeholder="SN203" style="text-transform:uppercase">
              </motion>
            </motion>
          </motion>

          <div class="form-row" id="row-retard">
            <div class="form-group">
              <label id="f-retard-label" data-i18n="form.delay">Retard à l'arrivée (heures)</label>
              <input type="number" id="f-retard" placeholder="4" min="0" step="0.5">
            </motion>
            <div class="form-group">
              <label data-i18n="form.pax">Passagers (même PNR)</label>
              <input type="number" id="f-nb-passagers" value="1" min="1" max="9">
            </motion>
          </motion>
        </motion>

        <div class="form-row full">
          <div class="form-group">
            <label data-i18n="form.notes">Notes (optionnel)</label>
            <textarea id="f-notes" rows="2" data-i18n-placeholder="form.notes_ph" placeholder="Détail utile pour Robin…"></textarea>
          </motion>
        </motion>

        <div class="form-submit">
          <button type="button" class="btn-primary btn-primary--lg" id="btn-submit-dossier" onclick="submitDossier()" data-i18n="form.submit">Envoyer le dossier →</button>
          <button type="button" class="btn-secondary" onclick="resetForm()" data-i18n="form.clear">Effacer</button>
        </motion>

        <div class="pricing-box" style="margin-top:20px;padding:16px;background:var(--green-glow);border-radius:var(--radius-sm);font-size:13px;color:var(--navy);">
          <strong data-i18n="pricing.title">Tarif partenaire (long-courrier)</strong>
          <div class="pricing-grid">
            <div class="pg-item"><span class="pg-label" data-i18n="pricing.client">Net client</span><strong id="pricing-client">420 €</strong></motion>
            <div class="pg-item agency"><span class="pg-label" data-i18n="pricing.agency">Votre commission</span><strong id="pricing-agency">45 €</strong></motion>
          </motion>
        </motion>
      </motion>
    </motion>'''

NEW_FORM = NEW_FORM.replace("<motion ", "<div ").replace("</motion>", "</div>")

import re
html = re.sub(
    r"    <!-- ===== NOUVEAU DOSSIER ===== -->.*?    <!-- ===== DOSSIERS ===== -->",
    NEW_FORM + "\n\n    <!-- ===== DOSSIERS ===== -->",
    html,
    count=1,
    flags=re.DOTALL,
)

TOOLBAR = '''<header class="locale-toolbar" id="localeToolbar" aria-label="Langue et devise">
  <div class="locale-toolbar-inner">
    <span class="locale-toolbar-title" data-i18n="toolbar.portal">Portail agence</span>
    <motion class="locale-group">
      <span class="locale-group-label" data-i18n="toolbar.lang">Langue</span>
      <div class="lang-pills" role="group" aria-label="Langue">
        <button type="button" class="lang-pill active" data-lang="fr">Français</button>
        <button type="button" class="lang-pill" data-lang="en">English</button>
      </motion>
    </motion>
    <div class="locale-group">
      <span class="locale-group-label" data-i18n="toolbar.currency">Devise</span>
      <select id="currencySelect" class="locale-currency-select" aria-label="Devise"></select>
    </motion>
    <label class="equiv-toggle">
      <input type="checkbox" id="equivCheck" checked>
      <span data-i18n="toolbar.equiv">Équivalents</span>
    </label>
  </motion>
</header>'''.replace("<motion ", "<motion ").replace("<motion ", "<motion ")
TOOLBAR = TOOLBAR.replace("<motion ", "<div ").replace("</motion>", "</motion>").replace("</motion>", "</div>")

html = re.sub(r"<header class=\"locale-toolbar\".*?</header>", TOOLBAR, html, count=1, flags=re.DOTALL)

CSS_EXTRA = """
.locale-toolbar { padding:0; min-height:56px; }
.locale-toolbar-inner { justify-content:space-between; max-width:none; padding:12px 20px 12px 260px; }
.locale-toolbar-title { font-size:14px; flex:1; min-width:120px; }
.locale-group { display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.06); padding:6px 12px; border-radius:10px; }
.locale-group-label { color:var(--green); font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
.lang-pills { display:flex; gap:4px; }
.lang-pill { border:none; padding:8px 14px; border-radius:8px; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer; background:transparent; color:rgba(255,255,255,.7); }
.lang-pill.active { background:var(--green); color:var(--navy); }
.lang-pill:hover:not(.active) { background:rgba(255,255,255,.1); color:#fff; }
.locale-currency-select { min-width:140px; padding:8px 12px; font-weight:600; }
body { padding-top:56px; }
.sidebar-locale-hint { padding:12px 16px; margin:0 12px 8px; background:rgba(61,223,168,.12); border-radius:8px; font-size:11px; color:var(--green); line-height:1.4; }
.form-card--fast { max-width:800px; }
.form-step { margin-bottom:28px; padding-bottom:24px; border-bottom:1px solid var(--gray-200); }
.form-step:last-of-type { border-bottom:none; }
.form-step-label { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--green-dark); margin-bottom:14px; }
.form-group--wide { grid-column:1 / -1; }
.input-pnr { text-transform:uppercase; letter-spacing:4px; font-weight:700; font-size:16px; }
.issue-chips, .route-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
.issue-chip, .route-chip { border:2px solid var(--gray-200); background:var(--white); padding:10px 14px; border-radius:10px; font-family:inherit; font-size:12px; font-weight:600; color:var(--navy); cursor:pointer; transition:all .15s; }
.issue-chip:hover, .route-chip:hover { border-color:var(--green); }
.issue-chip.active, .route-chip.active { border-color:var(--green); background:var(--green-glow); color:var(--navy); box-shadow:0 0 0 1px var(--green); }
.panel-escale { margin-top:12px; padding:14px; background:var(--gray-100); border-radius:var(--radius-sm); border-left:3px solid var(--green); }
.btn-primary--lg { padding:16px 28px; font-size:16px; width:100%; max-width:320px; }
@media (max-width:900px) {
  .locale-toolbar-inner { padding:12px 16px; flex-wrap:wrap; }
  .main { padding-top:8px; }
}
"""

if ".lang-pill" not in html:
    html = html.replace("/* Responsive */", CSS_EXTRA + "\n/* Responsive */", 1)

# sidebar hint
if "sidebar-locale-hint" not in html:
    html = html.replace(
        '<nav>',
        '<p class="sidebar-locale-hint" data-i18n="toolbar.hint">Langue &amp; devise : barre verte en haut ↑</p>\n    <nav>',
        1,
    )

p.write_text(html, encoding="utf-8")
assert "AGENCIES" not in html
assert "agence-portal.js" in html
assert "issue-chips" in html
print("OK", len(html.splitlines()), "lines")

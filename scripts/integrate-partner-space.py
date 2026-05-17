#!/usr/bin/env python3
"""Build espace-agence.html from partner mockup + API hooks."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "espace-agence.html"

EXTRA_CSS = """
body { padding-top: 52px; }
.locale-toolbar { position: fixed; top: 0; left: 0; right: 0; z-index: 250; background: rgba(10,22,40,0.96); border-bottom: 1px solid var(--sky-border); backdrop-filter: blur(10px); }
.locale-toolbar-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px 16px; padding: 8px 20px; max-width: 1100px; margin: 0 auto; }
.locale-toolbar-title { font-size: 11px; font-weight: 600; color: var(--gold); letter-spacing: 0.06em; text-transform: uppercase; margin-right: auto; }
.locale-group { display: flex; align-items: center; gap: 8px; }
.locale-group-label { font-size: 10px; color: var(--white-40); text-transform: uppercase; letter-spacing: 0.08em; }
.lang-pills { display: flex; gap: 4px; }
.lang-pill { border: 1px solid var(--sky-border); background: transparent; color: var(--white-70); padding: 5px 12px; border-radius: 6px; font-family: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
.lang-pill.active { background: var(--gold-pale); border-color: rgba(200,168,90,0.4); color: var(--gold); }
.locale-currency-select { background: rgba(255,255,255,0.05); border: 1px solid var(--sky-border); color: var(--white); padding: 5px 10px; border-radius: 6px; font-family: inherit; font-size: 12px; }
.equiv-toggle { font-size: 11px; color: var(--white-40); display: flex; align-items: center; gap: 6px; cursor: pointer; }
.equiv-toggle input { accent-color: var(--gold); }
#agencyApp[hidden] { display: none !important; }
.agent-quickbar { max-width: 1100px; margin: 0 auto 1.5rem; padding: 0 2.5rem; display: flex; flex-wrap: wrap; gap: 8px; }
.agent-quickbar button, .agent-quickbar a { border: 1px solid var(--sky-border); background: var(--sky-card); color: var(--white-70); font-family: inherit; font-size: 0.78rem; font-weight: 500; padding: 8px 14px; border-radius: 8px; cursor: pointer; text-decoration: none; }
.agent-quickbar .qa-primary { background: var(--gold-pale); border-color: rgba(200,168,90,0.35); color: var(--gold); }
.agent-coach { max-width: 1100px; margin: 0 auto 1.5rem; padding: 0 2.5rem; }
.agent-coach-inner { background: linear-gradient(90deg, rgba(200,168,90,0.12), transparent); border: 1px solid rgba(200,168,90,0.25); border-radius: 12px; padding: 14px 16px; display: flex; gap: 12px; }
.agent-coach ul { list-style: none; font-size: 0.8rem; color: var(--white-70); line-height: 1.6; flex: 1; }
.agent-coach li::before { content: '→ '; color: var(--gold); }
.agent-coach-close { background: none; border: none; color: var(--white-40); cursor: pointer; }
.form-progress { display: flex; gap: 6px; margin-bottom: 1.25rem; }
.form-progress-step { flex: 1; text-align: center; font-size: 0.65rem; color: var(--white-40); padding: 8px 4px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid var(--sky-border); }
.form-progress-step.done { border-color: rgba(34,200,132,0.35); color: var(--green); background: var(--green-pale); }
.form-progress-step.current { border-color: rgba(200,168,90,0.5); color: var(--gold); }
.commission-preview { background: var(--gold-pale); border: 1px solid rgba(200,168,90,0.3); border-radius: 10px; padding: 12px 14px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.commission-preview strong { color: var(--gold); font-family: 'DM Serif Display', serif; font-size: 1.15rem; }
.search-dossiers { width: 100%; max-width: 360px; background: rgba(255,255,255,0.05); border: 1px solid var(--sky-border); border-radius: 8px; color: var(--white); padding: 9px 14px; font-family: inherit; font-size: 0.85rem; margin-bottom: 1rem; }
.form-group input.field-invalid, .form-group textarea.field-invalid, .incident-grid.field-invalid { border-color: var(--red) !important; }
.panel-escale { margin-top: 12px; padding: 14px; background: rgba(255,255,255,0.03); border-radius: 10px; border-left: 3px solid var(--gold); }
.panel-escale[hidden] { display: none; }
.login-error { display: none; background: rgba(232,68,90,0.12); border: 1px solid rgba(232,68,90,0.3); color: var(--red); padding: 10px 14px; border-radius: 8px; font-size: 0.8rem; margin-bottom: 1rem; }
.sync-status { font-size: 0.72rem; color: var(--white-40); margin-top: 8px; }
#toast { position: fixed; bottom: 24px; right: 24px; z-index: 400; padding: 14px 20px; border-radius: 10px; color: #fff; font-size: 0.88rem; opacity: 0; transform: translateY(8px); transition: all 0.25s; pointer-events: none; max-width: 360px; }
#toast.show { opacity: 1; transform: translateY(0); }
.btn-submit:disabled { opacity: 0.7; cursor: wait; }
.submit-sticky { display: none; }
nav { top: 52px; }
@media(max-width:900px){
  .incident-grid { grid-template-columns: 1fr; }
  .agent-quickbar, .agent-coach, .tabs-nav, .hero, .main-layout, .dossiers-section, .payout-banner { padding-inline: 1.25rem; }
  .submit-sticky { display: flex; position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; background: rgba(10,22,40,0.96); border-top: 1px solid var(--sky-border); z-index: 90; }
  .tab-panel#tab-nouveau .card-body { padding-bottom: 5rem; }
  .search-dossiers { max-width: 100%; }
}
"""

FOOTER = """
<div id="toast"></motion>
<div class="submit-sticky" id="submit-sticky">
  <button type="button" class="btn-submit" onclick="submitDossier()" data-i18n="form.submit">Soumettre le dossier →</button>
</div>
</motion><!-- #agencyApp -->

<script src="/assets/agence-i18n.js"></script>
<script src="/assets/agence-currency.js"></script>
<script src="/assets/agence-portal.js"></script>
<script>
(function uploadUI(){
  var zone=document.getElementById('uploadZone'), fi=document.getElementById('fileInput'), uf=document.getElementById('uploadedFile');
  if(!fi||!zone)return;
  function show(f){ if(!f)return; zone.style.display='none'; document.getElementById('fileName').textContent=f.name; document.getElementById('fileSize').textContent=(f.size/1024).toFixed(0)+' KB'; uf.classList.add('show'); }
  fi.onchange=function(){ show(fi.files[0]); };
  window.removeFile=function(){ uf.classList.remove('show'); zone.style.display=''; fi.value=''; };
})();
</script>
</body>
</html>
""".replace("</motion>", "</motion>").replace("<motion", "<div").replace("</motion>", "</motion>")

# fix footer typos
FOOTER = FOOTER.replace("<motion", "<div").replace("</motion>", "</div>")

# Read base from existing file's style block if partner-base missing
BASE = ROOT / "espace-agence-maquette.html"
if not (ROOT / "templates" / "partner-space-base.html").exists():
    # use maquette or build minimal - read current espace-agence for styles
    cur = (ROOT / "espace-agence.html").read_text(encoding="utf-8")
    if ".commission-card::before" in cur:
        style_start = cur.index("<style>")
        style_end = cur.index("</style>") + len("</style>")
        styles = cur[style_start:style_end]
    else:
        styles = "<style>body{background:#0A1628;color:#fff}</style>"
else:
    styles = (ROOT / "templates" / "partner-space-base.html").read_text(encoding="utf-8")

print("Run with full template - writing integrated file directly")

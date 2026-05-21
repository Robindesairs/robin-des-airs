#!/usr/bin/env python3
"""Regénère documents/mandat-fr.html depuis mandat.html (version imprimable)."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "mandat.html"
OUT = ROOT / "documents" / "mandat-fr.html"


def main() -> None:
    src = SRC.read_text(encoding="utf-8")
    style = re.search(r"<style>(.*?)</style>", src, re.S)
    style_text = style.group(1) if style else ""
    extra = """
@media print { .topbar-nav, .no-print { display: none !important; } }
.print-banner { background: var(--gold-pale); border: 1px solid rgba(138,109,59,.35); padding: 12px 16px; margin-bottom: 1rem; font-size: 13px; line-height: 1.6; }
.field-blank { display: inline-block; min-width: 120px; border-bottom: 1px solid #888; min-height: 1.1em; vertical-align: bottom; }
"""
    m = re.search(r'<div id="mandatForm">(.*)</div><!-- fin mandatForm -->', src, re.S)
    body = m.group(1) if m else ""
    for pat, repl in [
        (r"<button[^>]*>.*?</button>", ""),
        (r"<input[^>]*>", '<span class="field-blank"></span>'),
        (r"<textarea[^>]*>.*?</textarea>", '<span class="field-blank" style="min-width:90%;display:block;min-height:2.5em"></span>'),
        (r"<select[^>]*>.*?</select>", '<span class="field-blank"></span>'),
        (r"<canvas[^>]*>.*?</canvas>", '<div style="border:1px dashed #888;height:80px;margin:12px 0"></div>'),
        (r'onclick="[^"]*"', ""),
        (r'<div class="ferr"[^>]*>.*?</div>', ""),
        (r'<div class="sig-ph"[^>]*>.*?</div>', ""),
        (r'<div class="sig-clear"[^>]*>.*?</div>', ""),
    ]:
        body = re.sub(pat, repl, body, flags=re.S)
    out = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Mandat de représentation (FR) — Robin des Airs</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
<style>{style_text}{extra}</style>
</head>
<body>
<div class="topbar">
  <a href="/" style="text-decoration:none;color:inherit"><div class="brand">Robin <em>des</em> Airs</div></a>
  <div class="topbar-nav" style="display:flex;gap:8px;align-items:center">
    <a href="/mandat.html" style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,.85);text-decoration:none;border:1px solid rgba(201,169,110,.4);padding:4px 10px">Signer en ligne →</a>
    <a href="/documents/mandat-fr.html?print=1" style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,.85);text-decoration:none;border:1px solid rgba(201,169,110,.4);padding:4px 10px">Imprimer / PDF</a>
  </div>
</div>
<div class="page">
<div class="print-banner no-print">
  <strong>Version imprimable / PDF.</strong> Signature électronique : <a href="/mandat.html">mandat en ligne</a>.
  Enregistrer en PDF : Fichier → Imprimer → Enregistrer en PDF.
</div>
<div id="mandatForm">{body}</div>
</div>
<script>
(function () {{
  if (/[?&]print=1/.test(location.search)) {{
    window.addEventListener('load', function () {{
      setTimeout(function () {{ window.print(); }}, 400);
    }});
  }}
}})();
</script>
</body>
</html>"""
    from datetime import datetime

    today = datetime.now().strftime("%d/%m/%Y")
    out = out.replace('id="dRef">—', 'id="dRef">RDA-PRINT')
    out = out.replace('id="dDate">—', f'id="dDate">{today}')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(out, encoding="utf-8")
    print("OK", OUT)


if __name__ == "__main__":
    main()

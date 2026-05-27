"""
Inject a floating WhatsApp CTA button on all blog articles.

The button is fixed bottom-right, visible during the entire scroll, with the
official WhatsApp green color (#25D366), the WhatsApp logo SVG, the text
"WhatsApp", and a hover effect. On mobile (< 640px) only the icon shows.

Idempotent: marker <!-- RDA-WA-FLOAT-V1 --> prevents double-injection.
"""

from pathlib import Path

MARKER = "<!-- RDA-WA-FLOAT-V1 -->"

WA_NUMBER = "33756863630"
WA_MESSAGE = "Bonjour%20Robin%2C%20je%20viens%20de%20lire%20un%20article%20sur%20robindesairs.eu%20et%20j%27ai%20une%20question%20concernant%20mon%20vol."

BLOCK = f"""{MARKER}
<style id="rda-wa-float-style">
.rda-wa-float{{position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:inline-flex;align-items:center;gap:.55rem;padding:.85rem 1.15rem;background:#25D366;color:#fff;border-radius:9999px;text-decoration:none;font-family:'Montserrat','Segoe UI',sans-serif;font-weight:700;font-size:.95rem;line-height:1;box-shadow:0 6px 22px rgba(37,211,102,.45),0 2px 6px rgba(0,0,0,.18);transition:transform .15s ease,box-shadow .15s ease,background .15s ease;cursor:pointer}}
.rda-wa-float:hover,.rda-wa-float:focus{{background:#1EBE5B;transform:translateY(-2px) scale(1.03);box-shadow:0 10px 28px rgba(37,211,102,.55),0 4px 10px rgba(0,0,0,.22);color:#fff;text-decoration:none;outline:none}}
.rda-wa-float svg{{flex:0 0 auto;width:22px;height:22px;fill:#fff;display:block}}
.rda-wa-float .rda-wa-pulse{{position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:50%;background:#22C55E;border:2px solid #fff;animation:rda-wa-pulse 1.8s ease-out infinite}}
@keyframes rda-wa-pulse{{0%{{box-shadow:0 0 0 0 rgba(34,197,94,.7)}}70%{{box-shadow:0 0 0 12px rgba(34,197,94,0)}}100%{{box-shadow:0 0 0 0 rgba(34,197,94,0)}}}}
@media (max-width:640px){{.rda-wa-float{{padding:.85rem;font-size:0;gap:0;bottom:1rem;right:1rem}}.rda-wa-float svg{{width:26px;height:26px}}}}
@media print{{.rda-wa-float{{display:none}}}}
</style>
<a class="rda-wa-float" href="https://wa.me/{WA_NUMBER}?text={WA_MESSAGE}" target="_blank" rel="noopener" aria-label="Discuter avec Robin des Airs sur WhatsApp">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/></svg>
  <span>WhatsApp</span>
  <span class="rda-wa-pulse" aria-hidden="true"></span>
</a>
"""


def inject(path: Path):
    html = path.read_text(encoding="utf-8")
    if MARKER in html:
        return "SKIP"
    if "</body>" not in html:
        return "NO_BODY"
    new_html = html.replace("</body>", BLOCK + "</body>", 1)
    path.write_text(new_html, encoding="utf-8")
    return "OK"


def main():
    root = Path("blog")
    if not root.is_dir():
        raise SystemExit("Run from repo root (blog/ not found)")

    stats = {"OK": 0, "SKIP": 0, "NO_BODY": 0}
    for p in sorted(root.glob("*.html")):
        if p.name.endswith(".bak"):
            continue
        result = inject(p)
        stats[result] += 1
        if result != "OK":
            print(f"  [{result}] {p.name}")

    print()
    print(f"Resultats : {stats}")


if __name__ == "__main__":
    main()

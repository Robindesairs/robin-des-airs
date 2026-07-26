#!/usr/bin/env python3
"""Croise le sitemap avec les impressions GSC (28 j) → pages « invisibles »
(0 impression = en attente d'indexation/visibilité). Réutilise ~/.config/claude-seo.
"""
import json, os, re, ssl, urllib.request, urllib.parse
try:
    import certifi; _SSL = ssl.create_default_context(cafile=certifi.where())
except Exception:
    _SSL = ssl.create_default_context()
CFG = os.path.expanduser("~/.config/claude-seo")
PROP = json.load(open(os.path.join(CFG, "google-api.json"))).get("default_property", "sc-domain:robindesairs.eu")

def at():
    tok = json.load(open(os.path.join(CFG, "oauth-token.json")))
    sec = json.load(open(os.path.join(CFG, "client_secret.json"))); sec = sec.get("installed", sec.get("web", sec))
    d = urllib.parse.urlencode({"client_id": tok.get("client_id") or sec["client_id"], "client_secret": sec["client_secret"],
        "refresh_token": tok["refresh_token"], "grant_type": "refresh_token"}).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=d), context=_SSL))["access_token"]

def norm(u):  # clé de comparaison : chemin sans domaine ni .html final
    u = u.replace("https://robindesairs.eu", "").rstrip("/")
    return u[:-5] if u.endswith(".html") else u

token = at()
import datetime as dt
end = dt.date.today() - dt.timedelta(days=3); start = end - dt.timedelta(days=28)
body = {"startDate": start.isoformat(), "endDate": end.isoformat(), "dimensions": ["page"], "rowLimit": 1000, "type": "web", "dataState": "final"}
url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(PROP, safe='')}/searchAnalytics/query"
res = json.load(urllib.request.urlopen(urllib.request.Request(url, data=json.dumps(body).encode(),
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}), context=_SSL))
visible = {norm(r["keys"][0]) for r in res.get("rows", [])}

sm = []
for f in ["sitemap-fr.xml"]:
    if os.path.exists(f): sm += re.findall(r"<loc>\s*([^<]+?)\s*</loc>", open(f, encoding="utf-8").read())
sm = [u.strip() for u in sm if u.endswith(".html")]
invisible = sorted(set(u for u in sm if norm(u) not in visible))

print(f"Sitemap FR (.html): {len(sm)}  |  visibles (≥1 impression 28j): {len(visible)}  |  INVISIBLES: {len(invisible)}\n")
def score(u):
    s = u.lower()
    if re.search(r"(vol-retarde|vol-annule).*(indemnite)", s): return (0, s)   # routes/compagnies = coeur diaspora
    if "arret-" in s or "cjue" in s or "jurisprudence" in s: return (2, s)     # jurisprudence
    return (1, s)
for u in sorted(invisible, key=score):
    print(" ", u.replace("https://robindesairs.eu", ""))

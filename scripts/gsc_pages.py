#!/usr/bin/env python3
"""Requête GSC Search Analytics via le jeton OAuth de ~/.config/claude-seo.
Liste les pages par impressions (28 j par défaut) + repère les pages striking-distance.
Usage: python3 scripts/gsc_pages.py [--days 28] [--dim page|query] [--limit 40]
"""
import json, os, sys, argparse, datetime as dt, urllib.request, urllib.parse, ssl
try:
    import certifi
    _SSL = ssl.create_default_context(cafile=certifi.where())
except Exception:
    _SSL = ssl.create_default_context()

_orig_urlopen = urllib.request.urlopen
def urlopen(req):
    return _orig_urlopen(req, context=_SSL)
urllib.request.urlopen = urlopen

CFG = os.path.expanduser("~/.config/claude-seo")
TOKEN = os.path.join(CFG, "oauth-token.json")
SECRET = os.path.join(CFG, "client_secret.json")

def load_conf():
    d = json.load(open(os.path.join(CFG, "google-api.json")))
    return d.get("default_property", "sc-domain:robindesairs.eu")

def access_token():
    tok = json.load(open(TOKEN))
    sec = json.load(open(SECRET))
    sec = sec.get("installed", sec.get("web", sec))
    data = urllib.parse.urlencode({
        "client_id": tok.get("client_id") or sec["client_id"],
        "client_secret": sec["client_secret"],
        "refresh_token": tok["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
    r = json.load(urllib.request.urlopen(req))
    # persiste le nouvel access_token (refresh_token conservé)
    tok["access_token"] = r["access_token"]
    json.dump(tok, open(TOKEN, "w"), indent=1)
    return r["access_token"]

def query(prop, at, days, dim, limit):
    end = dt.date.today() - dt.timedelta(days=3)      # lag GSC 2-3 j
    start = end - dt.timedelta(days=days)
    body = {"startDate": start.isoformat(), "endDate": end.isoformat(),
            "dimensions": [dim], "rowLimit": limit, "type": "web",
            "dataState": "final"}
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(prop, safe='')}/searchAnalytics/query"
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {at}", "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req)), start, end

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=28)
    ap.add_argument("--dim", default="page")
    ap.add_argument("--limit", type=int, default=40)
    a = ap.parse_args()
    prop = load_conf()
    at = access_token()
    res, start, end = query(prop, at, a.days, a.dim, a.limit)
    rows = res.get("rows", [])
    rows.sort(key=lambda r: r["impressions"], reverse=True)
    print(f"# GSC {prop} — {a.dim} — {start} au {end} ({a.days} j)  |  {len(rows)} lignes\n")
    print(f"{'impr':>7} {'clics':>6} {'CTR':>6} {'pos':>5}  {a.dim}")
    for r in rows:
        k = r["keys"][0].replace("https://robindesairs.eu", "")
        print(f"{int(r['impressions']):>7} {int(r['clicks']):>6} {r['ctr']*100:>5.1f}% {r['position']:>5.1f}  {k}")
    # striking distance : bcp d'impressions, position 5-20, peu de clics
    print("\n## 🎯 Striking distance (impressions >= 20, position 5-20) — à améliorer en priorité")
    sd = [r for r in rows if r["impressions"] >= 20 and 5 <= r["position"] <= 20]
    sd.sort(key=lambda r: r["impressions"], reverse=True)
    for r in sd:
        k = r["keys"][0].replace("https://robindesairs.eu", "")
        print(f"{int(r['impressions']):>7} impr · pos {r['position']:.1f} · CTR {r['ctr']*100:.1f}% · {int(r['clicks'])} clics  {k}")
    if not sd:
        print("  (aucune sur ce seuil)")

if __name__ == "__main__":
    main()

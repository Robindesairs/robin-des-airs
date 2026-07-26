#!/usr/bin/env python3
"""Évolution GSC site global : semaines glissantes + comparaison période/période.
Réutilise l'OAuth de ~/.config/claude-seo (comme gsc_pages.py).
Usage: python3 scripts/gsc_trend.py [--weeks 12]
"""
import json, os, argparse, datetime as dt, urllib.request, urllib.parse, ssl
try:
    import certifi
    _SSL = ssl.create_default_context(cafile=certifi.where())
except Exception:
    _SSL = ssl.create_default_context()
_orig = urllib.request.urlopen
urllib.request.urlopen = lambda req: _orig(req, context=_SSL)

CFG = os.path.expanduser("~/.config/claude-seo")

def access_token():
    tok = json.load(open(os.path.join(CFG, "oauth-token.json")))
    sec = json.load(open(os.path.join(CFG, "client_secret.json")))
    sec = sec.get("installed", sec.get("web", sec))
    data = urllib.parse.urlencode({
        "client_id": tok.get("client_id") or sec["client_id"],
        "client_secret": sec["client_secret"],
        "refresh_token": tok["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
    return json.load(urllib.request.urlopen(req))["access_token"]

def prop():
    return json.load(open(os.path.join(CFG, "google-api.json"))).get("default_property", "sc-domain:robindesairs.eu")

def q(p, at, start, end, dims=None):
    body = {"startDate": start.isoformat(), "endDate": end.isoformat(),
            "type": "web", "dataState": "final", "rowLimit": 25000}
    if dims: body["dimensions"] = dims
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(p, safe='')}/searchAnalytics/query"
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {at}", "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req)).get("rows", [])

def totals(rows):
    c = sum(r["clicks"] for r in rows); i = sum(r["impressions"] for r in rows)
    # position pondérée par impressions
    pos = sum(r["position"] * r["impressions"] for r in rows) / i if i else 0
    ctr = (c / i * 100) if i else 0
    return c, i, ctr, pos

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--weeks", type=int, default=12); a = ap.parse_args()
    p = prop(); at = access_token()
    end = dt.date.today() - dt.timedelta(days=3)  # lag GSC
    print(f"Propriété : {p}   (données jusqu'au {end})\n")

    # --- Tendance hebdomadaire ---
    print("SEMAINE (7j)        clics  impr    CTR    pos.moy")
    print("-" * 52)
    prev_c = None
    for w in range(a.weeks - 1, -1, -1):
        e = end - dt.timedelta(days=7 * w)
        s = e - dt.timedelta(days=6)
        c, i, ctr, pos = totals(q(p, at, s, e))
        arrow = "" if prev_c is None else (" ▲" if c > prev_c else (" ▼" if c < prev_c else " ="))
        print(f"{s} → {e}  {c:5d}  {i:6d}  {ctr:4.1f}%   {pos:4.1f}{arrow}")
        prev_c = c

    # --- Comparaison 28j vs 28j précédents ---
    print("\nPÉRIODE 28 JOURS")
    print("-" * 52)
    e2 = end; s2 = end - dt.timedelta(days=27)
    e1 = s2 - dt.timedelta(days=1); s1 = e1 - dt.timedelta(days=27)
    c2, i2, ctr2, pos2 = totals(q(p, at, s2, e2))
    c1, i1, ctr1, pos1 = totals(q(p, at, s1, e1))
    def d(a, b): return f"{(b-a):+.0f}" if abs(b) >= 10 else f"{(b-a):+.1f}"
    print(f"Précédents 28j ({s1}→{e1}) : {c1:4d} clics  {i1:6d} impr  {ctr1:.1f}%  pos {pos1:.1f}")
    print(f"Derniers   28j ({s2}→{e2}) : {c2:4d} clics  {i2:6d} impr  {ctr2:.1f}%  pos {pos2:.1f}")
    gc = (c2-c1)/c1*100 if c1 else 0
    gi = (i2-i1)/i1*100 if i1 else 0
    print(f"Évolution : clics {gc:+.0f}%   impressions {gi:+.0f}%   position {pos2-pos1:+.1f}")

if __name__ == "__main__":
    main()

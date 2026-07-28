#!/usr/bin/env python3
"""Répartition des impressions par palier de position + indicateur « part en position 1-3 ».

Pourquoi cet indicateur plutôt que le CTR nu : le CTR est une CONSÉQUENCE de la
position, pas un levier. Mesuré le 28/07/2026 sur 90 j, le site convertit à 21,5 %
en position 1-3 et à 1,3 % en position 5-8. Les titres sont donc bons ; ce qui
manque, c'est la part du volume qui atteint le haut de page 1. Suivre ce ratio
dit si on progresse vraiment, là où un CTR global mélange tout.

Usage: python3 scripts/gsc_position_mix.py [--days 28] [--cible 25]
"""
import json, os, argparse, datetime as dt, urllib.request, urllib.parse, ssl

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

PALIERS = [("1 - 3", 1, 3), ("3 - 5", 3, 5), ("5 - 8", 5, 8),
           ("8 - 10", 8, 10), ("10 - 20", 10, 20), ("20 +", 20, 1e9)]


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
    r = json.load(urlopen(urllib.request.Request(
        "https://oauth2.googleapis.com/token", data=data)))
    tok["access_token"] = r["access_token"]
    json.dump(tok, open(TOKEN, "w"), indent=1)
    return r["access_token"]


def pages(prop, at, start, end):
    body = {"startDate": start.isoformat(), "endDate": end.isoformat(),
            "dimensions": ["page"], "rowLimit": 1000, "type": "web",
            "dataState": "final"}
    url = (f"https://searchconsole.googleapis.com/webmasters/v3/sites/"
           f"{urllib.parse.quote(prop, safe='')}/searchAnalytics/query")
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {at}",
                                          "Content-Type": "application/json"})
    return json.load(urlopen(req)).get("rows", [])


def part_top3(rows):
    """Part des impressions situées en position 1-3, en pourcentage."""
    tot = sum(r["impressions"] for r in rows)
    if not tot:
        return 0.0, 0, 0
    top = sum(r["impressions"] for r in rows if r["position"] < 3)
    return 100 * top / tot, top, tot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=28)
    ap.add_argument("--cible", type=float, default=25.0,
                    help="part visée d'impressions en position 1-3 (%%)")
    a = ap.parse_args()

    prop, at = load_conf(), access_token()
    end = dt.date.today() - dt.timedelta(days=3)          # lag GSC 2-3 j
    start = end - dt.timedelta(days=a.days)
    prev_end, prev_start = start, start - dt.timedelta(days=a.days)

    cur = pages(prop, at, start, end)
    prev = pages(prop, at, prev_start, prev_end)

    print(f"Propriété : {prop}   ({start} → {end}, {a.days} j)")
    print()
    print(f"  {'Position':<10}{'pages':>7}{'impr':>8}{'clics':>7}{'CTR':>8}")
    print("  " + "-" * 40)
    ti = tc = 0
    for lab, lo, hi in PALIERS:
        sel = [r for r in cur if lo <= r["position"] < hi]
        i = sum(r["impressions"] for r in sel)
        c = sum(r["clicks"] for r in sel)
        ti += i; tc += c
        if i:
            print(f"  {lab:<10}{len(sel):>7}{i:>8.0f}{c:>7.0f}{100*c/i:>7.1f}%")
    print("  " + "-" * 40)
    if ti:
        print(f"  {'TOTAL':<10}{len(cur):>7}{ti:>8.0f}{tc:>7.0f}{100*tc/ti:>7.1f}%")

    pc, top, tot = part_top3(cur)
    pp, _, _ = part_top3(prev)
    fleche = "▲" if pc > pp + 0.5 else ("▼" if pc < pp - 0.5 else "=")

    print()
    print("  INDICATEUR SUIVI : part des impressions en position 1-3")
    print(f"    période        : {pc:.1f} %  ({top:.0f} / {tot:.0f} impressions)")
    print(f"    période -1     : {pp:.1f} %   {fleche}")
    print(f"    cible          : {a.cible:.0f} %")

    # Projection à volume d'impressions constant, aux CTR observés par palier.
    sel13 = [r for r in cur if r["position"] < 3]
    reste = [r for r in cur if r["position"] >= 3]
    i13 = sum(r["impressions"] for r in sel13)
    c13 = sum(r["clicks"] for r in sel13)
    ir = sum(r["impressions"] for r in reste)
    cr = sum(r["clicks"] for r in reste)
    if i13 and ir and ti:
        ctr13, ctrr = c13 / i13, cr / ir
        vise = ti * a.cible / 100
        proj = vise * ctr13 + (ti - vise) * ctrr
        print(f"    → à {a.cible:.0f} %, et à volume d'impressions inchangé : "
              f"{proj:.0f} clics au lieu de {tc:.0f}")
        print(f"      (CTR observés : {100*ctr13:.1f} % en 1-3, "
              f"{100*ctrr:.1f} % au-delà)")
    print()
    print("  Rappel : le CTR se pilote par la POSITION, pas par la rédaction des")
    print("  titres. Si cet indicateur stagne, le levier est l'autorité du domaine.")


if __name__ == "__main__":
    main()

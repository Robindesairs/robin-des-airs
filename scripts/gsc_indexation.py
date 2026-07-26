#!/usr/bin/env python3
"""Diagnostic d'indexation GSC : état de couverture par URL (URL Inspection API)
+ statut des sitemaps. Réutilise le jeton OAuth de ~/.config/claude-seo.
Usage: python3 scripts/gsc_indexation.py [--limit N] [--submit]
"""
import json, os, sys, argparse, time, ssl, urllib.request, urllib.parse, urllib.error, re, glob
try:
    import certifi; _SSL = ssl.create_default_context(cafile=certifi.where())
except Exception:
    _SSL = ssl.create_default_context()

CFG = os.path.expanduser("~/.config/claude-seo")
TOKEN = os.path.join(CFG, "oauth-token.json")
SECRET = os.path.join(CFG, "client_secret.json")
PROP = json.load(open(os.path.join(CFG, "google-api.json"))).get("default_property", "sc-domain:robindesairs.eu")

def access_token():
    tok = json.load(open(TOKEN)); sec = json.load(open(SECRET))
    sec = sec.get("installed", sec.get("web", sec))
    data = urllib.parse.urlencode({
        "client_id": tok.get("client_id") or sec["client_id"],
        "client_secret": sec["client_secret"],
        "refresh_token": tok["refresh_token"], "grant_type": "refresh_token",
    }).encode()
    r = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=data), context=_SSL))
    tok["access_token"] = r["access_token"]; json.dump(tok, open(TOKEN, "w"), indent=1)
    return r["access_token"]

def api(url, at, body=None, method=None):
    hdr = {"Authorization": f"Bearer {at}", "Content-Type": "application/json"}
    req = urllib.request.Request(url, data=(json.dumps(body).encode() if body is not None else None), headers=hdr, method=method)
    try:
        return json.load(urllib.request.urlopen(req, context=_SSL)), None
    except urllib.error.HTTPError as e:
        return None, f"{e.code} {e.read().decode()[:200]}"

def sitemap_urls():
    urls = set()
    for f in ["sitemap-fr.xml", "sitemap-en.xml", "sitemap.xml"]:
        if os.path.exists(f):
            for m in re.findall(r"<loc>\s*([^<]+?)\s*</loc>", open(f, encoding="utf-8").read()):
                if m.endswith(".xml"): continue
                urls.add(m.strip())
    return sorted(urls)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--submit", action="store_true")
    a = ap.parse_args()
    at = access_token()

    # --- Sitemaps déjà soumis ---
    print("=== SITEMAPS soumis dans GSC ===")
    res, err = api(f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(PROP, safe='')}/sitemaps", at)
    if err: print("  (lecture impossible:", err, ")")
    else:
        for s in res.get("sitemap", []):
            print(f"  {s.get('path')}  | dernier: {s.get('lastSubmitted','?')[:10]}  | pending: {s.get('isPending')}  | erreurs: {s.get('errors',0)}  | warn: {s.get('warnings',0)}")
        if not res.get("sitemap"): print("  (aucun sitemap soumis)")

    if a.submit:
        sm = "https://robindesairs.eu/sitemap-index.xml"
        _, err = api(f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(PROP, safe='')}/sitemaps/{urllib.parse.quote(sm, safe='')}", at, body={}, method="PUT")
        print(f"\n>>> Soumission {sm} : {'OK' if not err else 'ECHEC '+err}")

    # --- Inspection par URL ---
    urls = sitemap_urls()
    if a.limit: urls = urls[:a.limit]
    print(f"\n=== URL INSPECTION ({len(urls)} URLs du sitemap) ===")
    buckets = {}
    not_indexed = []
    for i, u in enumerate(urls, 1):
        res, err = api("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", at,
                       body={"inspectionUrl": u, "siteUrl": PROP})
        if err:
            if "429" in err: time.sleep(2);
            buckets.setdefault("ERREUR", 0); buckets["ERREUR"] += 1
            continue
        r = (res or {}).get("inspectionResult", {}).get("indexStatusResult", {})
        cov = r.get("coverageState", "?")
        verdict = r.get("verdict", "?")
        buckets[cov] = buckets.get(cov, 0) + 1
        if verdict != "PASS" or "not indexed" in cov.lower() or "duplicate" in cov.lower() or "Discovered" in cov or "Crawled" in cov:
            not_indexed.append((cov, u.replace("https://robindesairs.eu", "")))
        if i % 40 == 0: print(f"  … {i}/{len(urls)}", file=sys.stderr)
        time.sleep(0.15)

    print("\n--- Répartition par état de couverture ---")
    for k, v in sorted(buckets.items(), key=lambda x: -x[1]):
        print(f"  {v:>4}  {k}")
    print(f"\n--- Pages NON indexées / à problème ({len(not_indexed)}) ---")
    for cov, u in sorted(not_indexed):
        print(f"  [{cov}]  {u}")

if __name__ == "__main__":
    main()

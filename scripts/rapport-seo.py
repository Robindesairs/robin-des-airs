#!/usr/bin/env python3
"""Rapport SEO premium (GSC) pour Robin des Airs.
Vue domaine (clics, impressions, CTR moyen, position moyenne) + tendance vs 7j
précédents, top pages avec position et tendance, pages striking-distance, pistes.
Usage: python3 scripts/rapport-seo.py [--days 7]  -> texte formaté sur stdout.
"""
import json, os, ssl, sys, argparse, datetime as dt, urllib.request, urllib.parse
try:
    import certifi; _CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:
    _CTX = ssl.create_default_context()

CFG = os.path.expanduser("~/.config/claude-seo")

def token():
    tok = json.load(open(f"{CFG}/oauth-token.json"))
    sec = json.load(open(f"{CFG}/client_secret.json")); sec = sec.get("installed", sec.get("web", sec))
    d = urllib.parse.urlencode({"client_id": tok.get("client_id") or sec["client_id"],
        "client_secret": sec["client_secret"], "refresh_token": tok["refresh_token"],
        "grant_type": "refresh_token"}).encode()
    r = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=d), context=_CTX))
    return r["access_token"]

def q(at, prop, start, end, dims):
    body = {"startDate": start, "endDate": end, "dimensions": dims, "rowLimit": 200, "type": "web", "dataState": "final"}
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(prop, safe='')}/searchAnalytics/query"
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {at}", "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, context=_CTX)).get("rows", [])

def totals(rows):
    c = sum(r["clicks"] for r in rows); i = sum(r["impressions"] for r in rows)
    ctr = (c / i * 100) if i else 0
    pos = (sum(r["position"] * r["impressions"] for r in rows) / i) if i else 0
    return c, i, ctr, pos

def arrow(cur, prev, higher_better=True):
    if prev is None: return "  "
    if abs(cur - prev) < 1e-9: return "→ stable"
    up = cur > prev
    good = up if higher_better else (not up)
    return ("▲ monte" if (up and higher_better) else "▲ mieux") if good else ("▼ descend" if higher_better else "▼ recule")

def short(u):
    return u.replace("https://robindesairs.eu", "").replace("/blog/", "").replace(".html", "") or "/ (accueil)"

def bing_links():
    """Autorité : nb de pages/domaines référents vus par Bing. None si indispo."""
    try:
        cfg = json.load(open(f"{CFG}/backlinks-api.json"))
        key = cfg["bing_api_key"]; site = (cfg.get("bing_verified_sites") or ["https://robindesairs.eu/"])[0]
        u = f"https://ssl.bing.com/webmaster/api.svc/json/GetLinkCounts?apikey={key}&siteUrl={urllib.parse.quote(site, safe='')}"
        d = json.load(urllib.request.urlopen(u, context=_CTX, timeout=20)).get("d", {}) or {}
        links = d.get("Links", []) if isinstance(d, dict) else []
        return len(links), int(d.get("TotalPages", 0) or 0)
    except Exception:
        return None

def bing_stats(days=7):
    """Clics/impressions Bing (Webmaster Tools) sur les N derniers jours. None si indispo."""
    import re
    try:
        cfg = json.load(open(f"{CFG}/backlinks-api.json"))
        key = cfg["bing_api_key"]; site = (cfg.get("bing_verified_sites") or ["https://robindesairs.eu/"])[0]
        u = f"https://ssl.bing.com/webmaster/api.svc/json/GetRankAndTrafficStats?apikey={key}&siteUrl={urllib.parse.quote(site, safe='')}"
        rows = json.load(urllib.request.urlopen(u, context=_CTX, timeout=20)).get("d", []) or []
        def ms(x):
            m = re.search(r"(\d{10,})", x.get("Date", "")); return int(m.group(1)) if m else 0
        rows.sort(key=ms, reverse=True); last = rows[:days]
        return sum(r.get("Clicks", 0) for r in last), sum(r.get("Impressions", 0) for r in last), len(last)
    except Exception:
        return None

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--days", type=int, default=7); a = ap.parse_args()
    at = token(); prop = json.load(open(f"{CFG}/google-api.json"))["default_property"]
    end = dt.date.today() - dt.timedelta(days=3)
    start = end - dt.timedelta(days=a.days - 1)
    pend = start - dt.timedelta(days=1); pstart = pend - dt.timedelta(days=a.days - 1)

    # domaine : période courante vs précédente (agrégat = sans dimension -> 1 ligne)
    cur = q(at, prop, start.isoformat(), end.isoformat(), [])
    prev = q(at, prop, pstart.isoformat(), pend.isoformat(), [])
    c, i, ctr, pos = totals(cur); pc, pi, pctr, ppos = totals(prev)
    # pages
    pages = q(at, prop, start.isoformat(), end.isoformat(), ["page"])
    pages.sort(key=lambda r: r["impressions"], reverse=True)
    prev_pages = {r["keys"][0]: r for r in q(at, prop, pstart.isoformat(), pend.isoformat(), ["page"])}

    W = 46
    L = []
    L.append("=" * W)
    L.append("  RAPPORT SEO - ROBIN DES AIRS")
    L.append(f"  {dt.date.today().strftime('%d/%m/%Y')}  (Google Search Console)")
    L.append("=" * W)

    verdict_pos = arrow(pos, ppos, higher_better=False)
    verdict_clic = arrow(c, pc, higher_better=True)
    L.append("\nEN BREF")
    L.append(f"  Position domaine : {ppos:.1f} -> {pos:.1f}  {verdict_pos}")
    L.append(f"  Clics            : {int(pc)} -> {int(c)}  {verdict_clic}")

    L.append(f"\n-- VUE DOMAINE (7j vs 7j precedents) --")
    L.append(f"  Clics ........... {int(pc):>4} -> {int(c):<4}  {arrow(c, pc)}")
    L.append(f"  Impressions ..... {int(pi):>4} -> {int(i):<4}  {arrow(i, pi)}")
    L.append(f"  CTR moyen ....... {pctr:>4.1f}% -> {ctr:<4.1f}% {arrow(ctr, pctr)}")
    L.append(f"  Position moyenne  {ppos:>4.1f} -> {pos:<4.1f}  {arrow(pos, ppos, higher_better=False)}")

    b = bing_stats(a.days)
    if b:
        L.append(f"\n-- VUE BING / COPILOT ({b[2]} j) --")
        L.append(f"  Clics ........... {int(b[0]):>4}  |  Impressions {int(b[1])}")
        L.append(f"  Bing alimente les citations IA de Copilot. Detail : Bing Webmaster > AI Performance.")

    L.append(f"\n-- TOP 6 PAGES GOOGLE (impressions, position & tendance) --")
    for r in pages[:6]:
        u = r["keys"][0]; p = prev_pages.get(u)
        ptxt = f"{p['position']:.1f}->{r['position']:.1f} {arrow(r['position'], p['position'], higher_better=False)}" if p else f"pos {r['position']:.1f}"
        L.append(f"  {int(r['impressions']):>3} impr | {ptxt} | {int(r['clicks'])} clic | {short(u)[:34]}")

    sd = [r for r in pages if r["impressions"] >= 15 and 5 <= r["position"] <= 20]
    L.append(f"\n-- PAGES A AMELIORER (striking distance) --")
    if sd:
        for r in sd:
            L.append(f"  {int(r['impressions']):>3} impr | pos {r['position']:.1f} | CTR {r['ctr']*100:.1f}% | {short(r['keys'][0])[:34]}")
    else:
        L.append("  aucune sur le seuil aujourd'hui.")

    # top requêtes Google (proxy mots-clés : ce que les gens tapent vraiment)
    try:
        qrows = q(at, prop, start.isoformat(), end.isoformat(), ["query"])
        qrows.sort(key=lambda r: r["impressions"], reverse=True)
        if qrows:
            L.append(f"\n-- TOP REQUETES GOOGLE ({a.days} j) --")
            for r in qrows[:6]:
                L.append(f"  {int(r['impressions']):>3} impr | pos {r['position']:.1f} | {int(r['clicks'])} clic | {r['keys'][0][:38]}")
    except Exception:
        pass

    # autorité / backlinks (Bing)
    bl = bing_links()
    if bl is not None:
        L.append(f"\n-- AUTORITE / BACKLINKS (Bing) --")
        L.append(f"  Pages référentes vues par Bing : {bl[0]}  (le nerf de la guerre : objectif 15-20 domaines a 6 mois)")

    # pistes heuristiques
    L.append("\n-- PISTES D'AMELIORATION --")
    pistes = []
    for r in sd[:3]:
        nm = short(r["keys"][0])
        if r["clicks"] == 0 and r["position"] <= 10:
            pistes.append(f"  . {nm} : pos {r['position']:.1f} mais 0 clic -> titre/meta a rendre plus incitatif (CTR).")
        elif r["position"] > 10:
            pistes.append(f"  . {nm} : pos {r['position']:.1f} (bas de page 1/2) -> pousser via liens internes + contenu.")
    if ctr < pctr:
        pistes.append("  . CTR domaine en baisse -> revoir les titres des pages a fortes impressions.")
    if not pistes:
        pistes.append("  . RAS cote data : continuer a produire du contenu citable + suivre les nouveaux titres.")
    L += pistes

    # taches du jour (heuristiques, taggees)
    L.append("\n-- TACHES DU JOUR --")
    taches = []
    for r in sd[:3]:
        nm = short(r["keys"][0])
        if r["clicks"] == 0 and r["position"] <= 10:
            taches.append(f"  [je peux] Reecrire titre/meta de {nm} (pos {r['position']:.1f}, 0 clic).")
        elif r["position"] > 10:
            taches.append(f"  [je peux] Renforcer les liens internes vers {nm} (pos {r['position']:.1f}).")
    taches.append("  [toi] Verifier : un des clics recents a-t-il donne un dossier / message WhatsApp ?")
    taches.append("  [decision] Avancer un canal d'acquisition : agences de voyage Afrique (dossiers).")
    L += taches[:6]
    L.append("  (angle concurrents / pages a doubler : point approfondi chaque lundi.)")

    L.append("\n-- RAPPEL --")
    L.append("  Donnees GSC = 2-3j de retard (periode consolidee, pas la veille).")
    L.append("  Trafic hors-Google (WhatsApp, presse, direct) + referrers : Umami")
    L.append("  https://cloud.umami.is/websites/2309ca47-51e3-4bfd-8192-5b2343213e4b")
    L.append("=" * W)
    sys.stdout.write("\n".join(L) + "\n")

if __name__ == "__main__":
    main()

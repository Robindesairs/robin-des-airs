#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║          SNIPER v2.0 — Surveillance EU 261/2004             ║
║     Vols Afrique-Europe | Source : AeroDataBox (RapidAPI)   ║
╚══════════════════════════════════════════════════════════════╝

Usage :
    export RAPIDAPI_KEY="votre_clé_rapidapi"
    python scripts/sniper_flight_monitor.py                    → rapport d'hier
    python scripts/sniper_flight_monitor.py --date 2026-03-27  → date précise
    python scripts/sniper_flight_monitor.py --test             → test CDG uniquement

Dépendances :
    pip install requests
"""

import requests
import json
import math
import datetime
import argparse
import os
import sys

# ─────────────────────────────────────────────────────────────
# CONFIGURATION API (jamais de clé en dur — même valeur que Netlify)
# ─────────────────────────────────────────────────────────────
RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY") or os.environ.get("AERODATABOX_RAPIDAPI_KEY")
RAPIDAPI_HOST = os.environ.get("AERODATABOX_RAPIDAPI_HOST", "aerodatabox.p.rapidapi.com")
BASE_URL = f"https://{RAPIDAPI_HOST}"


def _headers():
    if not RAPIDAPI_KEY:
        print(
            "Erreur : définissez RAPIDAPI_KEY ou AERODATABOX_RAPIDAPI_KEY dans l'environnement.",
            file=sys.stderr,
        )
        sys.exit(1)
    return {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
    }


HEADERS = None  # rempli au démarrage

# ─────────────────────────────────────────────────────────────
# FILTRES MÉTIER
# ─────────────────────────────────────────────────────────────
DELAY_THRESHOLD_MIN = 180  # 3 heures minimum
DISTANCE_THRESHOLD_KM = 3500  # Pour indemnité maximale 600€/pax

# ─────────────────────────────────────────────────────────────
# COMPAGNIES AÉRIENNES UE (code IATA)
# ─────────────────────────────────────────────────────────────
EU_CARRIERS = {
    "AF",
    "KL",
    "LH",
    "BA",
    "IB",
    "AZ",
    "SK",
    "AY",
    "OS",
    "LX",
    "VY",
    "FR",
    "U2",
    "W6",
    "TP",
    "SN",
    "EI",
    "LO",
    "OK",
    "RO",
    "A3",
    "BT",
    "DY",
    "EW",
    "HV",
    "TO",
    "V7",
    "EN",
    "X3",
    "TB",
    "VU",
}

# ─────────────────────────────────────────────────────────────
# PAYS UE + EEE + UK
# ─────────────────────────────────────────────────────────────
EU_COUNTRIES = {
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
    "IS",
    "LI",
    "NO",
    "GB",
}

# ─────────────────────────────────────────────────────────────
# AÉROPORTS AFRICAINS (ICAO → metadata)
# ─────────────────────────────────────────────────────────────
AFRICAN_AIRPORTS = {
    "GOBD": {"iata": "DSS", "city": "Dakar", "lat": 14.67, "lon": -17.07},
    "GOOY": {"iata": "DKR", "city": "Dakar", "lat": 14.74, "lon": -17.49},
    "DIAP": {"iata": "ABJ", "city": "Abidjan", "lat": 5.26, "lon": -3.93},
    "DGAA": {"iata": "ACC", "city": "Accra", "lat": 5.60, "lon": -0.17},
    "DNMM": {"iata": "LOS", "city": "Lagos", "lat": 6.58, "lon": 3.32},
    "HKJK": {"iata": "NBO", "city": "Nairobi", "lat": -1.32, "lon": 36.93},
    "HAAB": {"iata": "ADD", "city": "Addis-Abeba", "lat": 8.98, "lon": 38.80},
    "GMMN": {"iata": "CMN", "city": "Casablanca", "lat": 33.37, "lon": -7.58},
    "HECA": {"iata": "CAI", "city": "Le Caire", "lat": 30.11, "lon": 31.41},
    "FAOR": {"iata": "JNB", "city": "Johannesburg", "lat": -26.13, "lon": 28.24},
    "FACT": {"iata": "CPT", "city": "Cape Town", "lat": -33.96, "lon": 18.60},
    "FMMI": {"iata": "TNR", "city": "Antananarivo", "lat": -18.80, "lon": 47.48},
    "DTTJ": {"iata": "DJE", "city": "Djerba", "lat": 33.87, "lon": 10.78},
    "DTTA": {"iata": "TUN", "city": "Tunis", "lat": 36.85, "lon": 10.23},
    "DAAG": {"iata": "ALG", "city": "Alger", "lat": 36.69, "lon": 3.22},
    "DFFD": {"iata": "OUA", "city": "Ouagadougou", "lat": 12.35, "lon": -1.51},
    "DBBB": {"iata": "COO", "city": "Cotonou", "lat": 6.36, "lon": 2.38},
    "GABS": {"iata": "BKO", "city": "Bamako", "lat": 12.53, "lon": -7.95},
    "GUCY": {"iata": "CKY", "city": "Conakry", "lat": 9.58, "lon": -13.61},
    "HTDA": {"iata": "DAR", "city": "Dar es Salaam", "lat": -6.87, "lon": 39.20},
    "FIMP": {"iata": "MRU", "city": "Maurice", "lat": -20.43, "lon": 57.68},
    "HRYR": {"iata": "KGL", "city": "Kigali", "lat": -1.97, "lon": 30.14},
}

# ─────────────────────────────────────────────────────────────
# AÉROPORTS EUROPÉENS (ICAO → metadata)
# ─────────────────────────────────────────────────────────────
EUROPEAN_AIRPORTS = {
    "LFPG": {"iata": "CDG", "city": "Paris", "country": "FR", "lat": 49.01, "lon": 2.55},
    "LFPO": {"iata": "ORY", "city": "Paris", "country": "FR", "lat": 48.72, "lon": 2.38},
    "EGLL": {"iata": "LHR", "city": "Londres", "country": "GB", "lat": 51.48, "lon": -0.46},
    "EHAM": {"iata": "AMS", "city": "Amsterdam", "country": "NL", "lat": 52.31, "lon": 4.77},
    "EDDF": {"iata": "FRA", "city": "Francfort", "country": "DE", "lat": 50.03, "lon": 8.57},
    "LEMD": {"iata": "MAD", "city": "Madrid", "country": "ES", "lat": 40.49, "lon": -3.57},
    "LIRF": {"iata": "FCO", "city": "Rome", "country": "IT", "lat": 41.80, "lon": 12.24},
    "EBBR": {"iata": "BRU", "city": "Bruxelles", "country": "BE", "lat": 50.90, "lon": 4.48},
    "LPPT": {"iata": "LIS", "city": "Lisbonne", "country": "PT", "lat": 38.77, "lon": -9.13},
    "LSZH": {"iata": "ZRH", "city": "Zurich", "country": "CH", "lat": 47.46, "lon": 8.55},
    "EKCH": {"iata": "CPH", "city": "Copenhague", "country": "DK", "lat": 55.62, "lon": 12.66},
    "LFML": {"iata": "MRS", "city": "Marseille", "country": "FR", "lat": 43.44, "lon": 5.21},
    "LFMN": {"iata": "NCE", "city": "Nice", "country": "FR", "lat": 43.66, "lon": 7.22},
    "LFLL": {"iata": "LYS", "city": "Lyon", "country": "FR", "lat": 45.73, "lon": 5.08},
    "LIMC": {"iata": "MXP", "city": "Milan", "country": "IT", "lat": 45.63, "lon": 8.73},
    "LOWW": {"iata": "VIE", "city": "Vienne", "country": "AT", "lat": 48.11, "lon": 16.57},
}

# Index IATA → ICAO
_IATA_TO_ICAO = {v["iata"]: k for k, v in {**AFRICAN_AIRPORTS, **EUROPEAN_AIRPORTS}.items()}


# ─────────────────────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def compute_distance(icao1: str, icao2: str):
    all_ap = {**AFRICAN_AIRPORTS, **EUROPEAN_AIRPORTS}
    d1 = all_ap.get(icao1)
    d2 = all_ap.get(icao2)
    if d1 and d2:
        return haversine(d1["lat"], d1["lon"], d2["lat"], d2["lon"])
    return None


def parse_datetime_str(s: str):
    """Parse une chaîne ISO datetime, tolérante aux formats AeroDataBox."""
    if not s:
        return None
    try:
        clean = s[:16].replace("T", " ").replace("Z", "")
        return datetime.datetime.strptime(clean, "%Y-%m-%d %H:%M")
    except Exception:
        return None


def extract_delay_minutes(flight: dict):
    """
    Extrait le retard en minutes depuis un objet vol AeroDataBox.
    Priorité : arrival → departure → champ delay direct.
    """
    for section_key in ["arrival", "departure"]:
        section = flight.get(section_key) or {}
        sched = section.get("scheduledTimeLocal") or section.get(
            "scheduledTimeUtc"
        ) or (section.get("scheduledTime") or {}).get("local") or (section.get("scheduledTime") or {}).get("utc")
        actual = (
            section.get("actualTimeLocal")
            or section.get("actualTimeUtc")
            or section.get("revisedTimeLocal")
            or section.get("revisedTimeUtc")
            or (section.get("actualTime") or {}).get("local")
            or (section.get("actualTime") or {}).get("utc")
            or (section.get("estimatedTime") or {}).get("utc")
        )

        if sched and actual:
            t_sched = parse_datetime_str(str(sched))
            t_actual = parse_datetime_str(str(actual))
            if t_sched and t_actual:
                delta = (t_actual - t_sched).total_seconds() / 60
                if delta > 0:
                    return int(delta)

    for path in ["delay", "arrival.delay", "departure.delay"]:
        parts = path.split(".")
        val = flight
        for p in parts:
            val = (val or {}).get(p)
        if val is not None:
            try:
                return int(val)
            except Exception:
                pass

    return None


# ─────────────────────────────────────────────────────────────
# RÈGLES EU 261/2004
# ─────────────────────────────────────────────────────────────
def check_eu261(origin_icao: str, dest_icao: str, carrier: str, delay_min: int, distance_km) -> dict:
    """
    Évalue l'éligibilité EU 261/2004 d'un vol.
    Retourne : eligible (bool), raison (str), indemnite (int €)
    """
    result = {"eligible": False, "raison": "", "indemnite": 0}

    if delay_min < DELAY_THRESHOLD_MIN:
        result["raison"] = f"Retard {delay_min}min < 180min"
        return result

    origin_country = EUROPEAN_AIRPORTS.get(origin_icao, {}).get("country")
    dest_country = EUROPEAN_AIRPORTS.get(dest_icao, {}).get("country")

    origin_is_eu = origin_country in EU_COUNTRIES if origin_country else False
    dest_is_eu = dest_country in EU_COUNTRIES if dest_country else False
    carrier_is_eu = carrier.upper() in EU_CARRIERS if carrier else False

    if origin_is_eu:
        result["eligible"] = True
        result["raison"] = f"Départ UE ({origin_icao}/{origin_country}) — toutes compagnies"
    elif dest_is_eu and carrier_is_eu:
        result["eligible"] = True
        result["raison"] = f"Arrivée UE ({dest_icao}/{dest_country}) + compagnie UE ({carrier})"
    elif dest_is_eu and not carrier_is_eu:
        result["raison"] = f"Compagnie {carrier} non-UE — arrivée UE ne suffit pas"
        return result
    else:
        result["raison"] = "Hors champ EU 261 (ni départ ni arrivée UE)"
        return result

    if result["eligible"] and distance_km:
        if distance_km <= 1500:
            result["indemnite"] = 250
        elif distance_km <= 3500:
            result["indemnite"] = 400
        else:
            result["indemnite"] = 600

    return result


# ─────────────────────────────────────────────────────────────
# COLLECTE AÉRODATABOX
# ─────────────────────────────────────────────────────────────
def fetch_airport_window(icao: str, start: str, end: str, direction: str) -> list:
    """Requête AeroDataBox pour une fenêtre de 12h max."""
    url = f"{BASE_URL}/flights/airports/icao/{icao}/{start}/{end}"
    params = {
        "withLeg": "true",
        "direction": direction,
        "withCancelled": "false",
        "withCodeshared": "false",
        "withCargo": "false",
        "withPrivate": "false",
        "withLocation": "false",
    }
    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=25)
        if resp.status_code == 200:
            key = "arrivals" if direction == "Arrival" else "departures"
            return resp.json().get(key, [])
        elif resp.status_code == 429:
            import time

            time.sleep(6)
        else:
            print(f"      HTTP {resp.status_code} — {icao} {start}")
    except requests.exceptions.RequestException as e:
        print(f"      Erreur réseau — {e}")
    return []


def fetch_airport_day(icao: str, date: datetime.date, direction: str) -> list:
    """Récupère une journée complète (2 fenêtres de 12h)."""
    d = str(date)
    flights = []
    flights += fetch_airport_window(icao, f"{d}T00:00", f"{d}T11:59", direction)
    flights += fetch_airport_window(icao, f"{d}T12:00", f"{d}T23:59", direction)
    return flights


def parse_flight(raw: dict, origin_icao: str, dest_icao: str) -> dict:
    """Normalise un objet vol brut AeroDataBox."""
    airline = raw.get("airline") or {}
    carrier = (airline.get("iata") or (airline.get("icao") or "??")[:2] or "??").upper()
    fn = (raw.get("number") or raw.get("callSign") or "???").strip()

    orig_info = AFRICAN_AIRPORTS.get(origin_icao, {}) or EUROPEAN_AIRPORTS.get(origin_icao, {}) or {}
    dest_info = EUROPEAN_AIRPORTS.get(dest_icao, {}) or AFRICAN_AIRPORTS.get(dest_icao, {}) or {}

    dep_ap = (raw.get("departure") or {}).get("airport") or {}
    arr_ap = (raw.get("arrival") or {}).get("airport") or {}
    origin_city = dep_ap.get("municipalityName") or orig_info.get("city", "?")
    dest_city = arr_ap.get("municipalityName") or dest_info.get("city", "?")

    return {
        "flight_number": fn,
        "origin_icao": origin_icao,
        "origin_iata": dep_ap.get("iata") or orig_info.get("iata", "???"),
        "origin_city": origin_city,
        "dest_icao": dest_icao,
        "dest_iata": arr_ap.get("iata") or dest_info.get("iata", "???"),
        "dest_city": dest_city,
        "carrier": carrier,
        "delay_minutes": extract_delay_minutes(raw),
        "distance_km": compute_distance(origin_icao, dest_icao),
        "raw_status": raw.get("status", ""),
        "source": "AeroDataBox",
    }


def fetch_all(date: datetime.date) -> list:
    all_flights = []
    seen = set()

    print(f"\n  [1/2] Arrivées dans les hubs EU ({len(EUROPEAN_AIRPORTS)} aéroports)...")
    for icao_eu, eu_meta in EUROPEAN_AIRPORTS.items():
        raw_list = fetch_airport_day(icao_eu, date, "Arrival")
        count = 0
        for raw in raw_list:
            dep_ap = (raw.get("departure") or {}).get("airport") or {}
            orig_icao = dep_ap.get("icaoV2") or dep_ap.get("icao", "")
            orig_iata = dep_ap.get("iata", "")
            if not orig_icao and orig_iata:
                orig_icao = _IATA_TO_ICAO.get(orig_iata, "")
            if orig_icao not in AFRICAN_AIRPORTS:
                continue
            key = f"{raw.get('number', '?')}_{date}"
            if key in seen:
                continue
            seen.add(key)
            all_flights.append(parse_flight(raw, orig_icao, icao_eu))
            count += 1
        print(f"      {eu_meta['iata']} ({icao_eu}) → {count} vols africains")

    priority_af = ["GOBD", "GOOY", "DIAP", "DGAA", "DNMM", "GMMN", "DAAG", "DTTA", "HAAB", "HKJK"]
    print(f"\n  [2/2] Départs depuis aéroports africains ({len(priority_af)} prioritaires)...")
    for icao_af in priority_af:
        af_meta = AFRICAN_AIRPORTS[icao_af]
        raw_list = fetch_airport_day(icao_af, date, "Departure")
        count = 0
        for raw in raw_list:
            arr_ap = (raw.get("arrival") or {}).get("airport") or {}
            dest_icao = arr_ap.get("icaoV2") or arr_ap.get("icao", "")
            dest_iata = arr_ap.get("iata", "")
            if not dest_icao and dest_iata:
                dest_icao = _IATA_TO_ICAO.get(dest_iata, "")
            if dest_icao not in EUROPEAN_AIRPORTS:
                continue
            key = f"{raw.get('number', '?')}_{date}"
            if key in seen:
                continue
            seen.add(key)
            all_flights.append(parse_flight(raw, icao_af, dest_icao))
            count += 1
        print(f"      {af_meta['iata']} ({icao_af}) → {count} vols EU")

    return all_flights


# ─────────────────────────────────────────────────────────────
# RAPPORT
# ─────────────────────────────────────────────────────────────
def generate_report(flights: list, report_date: datetime.date) -> str:
    SEP = "═" * 68
    SEP2 = "─" * 68
    lines = []

    lines += [
        SEP,
        "  ✈  SNIPER v2.0 — RAPPORT EU 261/2004",
        f"     Vols Afrique ↔ Europe  │  {report_date.strftime('%A %d %B %Y')}",
        f"     Généré le {datetime.datetime.utcnow().strftime('%d/%m/%Y à %H:%M')} UTC",
        SEP,
        "",
    ]

    eligible, non_eligible, below_threshold, no_delay = [], [], [], []

    for f in flights:
        dm = f.get("delay_minutes")
        dist = f.get("distance_km")
        if dm is None:
            no_delay.append(f)
            continue
        if dist and dist < DISTANCE_THRESHOLD_KM:
            below_threshold.append({**f, "reason": f"Distance {dist}km < {DISTANCE_THRESHOLD_KM}km"})
            continue
        if dm < DELAY_THRESHOLD_MIN:
            below_threshold.append({**f, "reason": f"Retard {dm}min < 180min"})
            continue
        eu = check_eu261(f["origin_icao"], f["dest_icao"], f["carrier"], dm, dist)
        entry = {**f, **eu}
        (eligible if eu["eligible"] else non_eligible).append(entry)

    lines += [f"  ✅  ÉLIGIBLES EU 261/2004 — {len(eligible)} vol(s)", SEP2]
    if eligible:
        for f in sorted(eligible, key=lambda x: x["delay_minutes"], reverse=True):
            dh, dm_ = divmod(f["delay_minutes"], 60)
            dist = f"{f['distance_km']} km" if f.get("distance_km") else "N/D"
            lines += [
                f"  {f['flight_number']:>9}  │  {f['origin_iata']} ({f['origin_city']}) → "
                f"{f['dest_iata']} ({f['dest_city']})",
                f"  {'':>9}  │  +{dh}h{dm_:02d}  │  {dist}  │  💰 {f['indemnite']}€/pax",
                f"  {'':>9}  │  {f['raison']}",
                "",
            ]
    else:
        lines += ["  Aucun vol éligible pour cette journée.", ""]

    if non_eligible:
        lines += [f"  ❌  RETARDÉS ≥3h / NON ÉLIGIBLES — {len(non_eligible)} vol(s)", SEP2]
        for f in sorted(non_eligible, key=lambda x: x["delay_minutes"], reverse=True):
            dh, dm_ = divmod(f["delay_minutes"], 60)
            dist = f"{f['distance_km']} km" if f.get("distance_km") else "N/D"
            lines += [
                f"  {f['flight_number']:>9}  │  {f['origin_iata']} → {f['dest_iata']}"
                f"  │  +{dh}h{dm_:02d}  │  {dist}",
                f"  {'':>9}  │  {f['raison']}",
                "",
            ]

    if below_threshold:
        lines += [f"  ℹ️   EN DESSOUS DES SEUILS — {len(below_threshold)} vol(s)", SEP2]
        for f in below_threshold[:15]:
            lines.append(
                f"  {f.get('flight_number', '???'):>9}  │  "
                f"{f.get('origin_iata', '?')} → {f.get('dest_iata', '?')}  │  {f.get('reason', '')}"
            )
        lines.append("")

    if no_delay:
        lines += [f"  ⏳  SANS INFO RETARD — {len(no_delay)} vol(s)", SEP2]
        for f in no_delay[:10]:
            dist = f"{f['distance_km']} km" if f.get("distance_km") else "N/D"
            lines.append(
                f"  {f.get('flight_number', '???'):>9}  │  "
                f"{f.get('origin_iata', '?')} → {f.get('dest_iata', '?')}  │  "
                f"{dist}  │  {f.get('raw_status', '')}"
            )
        lines.append("")

    total_indem = sum(f["indemnite"] for f in eligible)
    lines += [
        SEP,
        "  RÉSUMÉ",
        SEP2,
        f"  Vols collectés          : {len(flights)}",
        f"  Avec info retard        : {len(flights) - len(no_delay)}",
        f"  ✅ Éligibles EU 261     : {len(eligible)}",
        f"  💰 Indemnité totale     : {total_indem}€ (× nb passagers affectés)",
        "",
        "  RÈGLE EU 261/2004 :",
        "  • Départ UE → toute compagnie → éligible",
        "  • Arrivée UE + compagnie UE seulement → éligible",
        "  • ≤1500km: 250€  |  1500-3500km: 400€  |  >3500km: 600€",
        SEP,
    ]
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
def main():
    global HEADERS
    HEADERS = _headers()

    parser = argparse.ArgumentParser(description="SNIPER v2 — EU 261/2004 Afrique-Europe")
    parser.add_argument("--date", help="Date YYYY-MM-DD (défaut: hier)")
    parser.add_argument("--test", action="store_true", help="Test API sur CDG uniquement")
    parser.add_argument("--out", default=".", help="Dossier de sortie")
    args = parser.parse_args()

    report_date = (
        datetime.date.fromisoformat(args.date)
        if args.date
        else datetime.date.today() - datetime.timedelta(days=1)
    )

    print(f"\n{'═'*60}")
    print("  ✈  SNIPER v2.0 — Surveillance EU 261/2004")
    print(f"     Analyse : {report_date.strftime('%d/%m/%Y')}")
    print(f"{'═'*60}")

    if args.test:
        print("\n  [MODE TEST] CDG uniquement...\n")
        d = str(report_date)
        raw = fetch_airport_window("LFPG", f"{d}T06:00", f"{d}T18:00", "Arrival")
        flights = [
            parse_flight(
                r,
                (r.get("departure") or {}).get("airport", {}).get("icaoV2")
                or (r.get("departure") or {}).get("airport", {}).get("icao", "????"),
                "LFPG",
            )
            for r in raw[:30]
        ]
        print(f"\n  {len(flights)} vols chargés (CDG, toutes origines, extrait)")
        for f in flights[:8]:
            print(
                f"    {f['flight_number']:>9} | {f['origin_iata']} → CDG"
                f" | retard={f['delay_minutes']}min | dist={f['distance_km']}km"
                f" | {f['carrier']}"
            )
    else:
        flights = fetch_all(report_date)

    print(f"\n  {len(flights)} vol(s) Afrique-EU collectés. Génération rapport...")
    report = generate_report(flights, report_date)
    print("\n" + report)

    date_str = report_date.strftime("%Y-%m-%d")
    txt_path = os.path.join(args.out, f"SNIPER_EU261_{date_str}.txt")
    json_path = os.path.join(args.out, f"SNIPER_raw_{date_str}.json")

    with open(txt_path, "w", encoding="utf-8") as fh:
        fh.write(report)
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(flights, fh, ensure_ascii=False, indent=2, default=str)

    print(f"\n  💾 Rapport  → {txt_path}")
    print(f"  💾 Données  → {json_path}")


if __name__ == "__main__":
    main()

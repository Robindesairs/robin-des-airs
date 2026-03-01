#!/bin/bash
# Récupère TOUS les vols Europe–Afrique : plusieurs aéroports (départs + arrivées)
# Écrit docs/vols-radar.txt — Ouvre ce fichier dans Cursor pour voir la liste.
# Usage : bash scripts/fetch-vols-radar.sh

SITE_URL="${SITE_URL:-https://robindesairs.eu}"
OUT="docs/vols-radar.txt"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Aéroports Europe–Afrique (Dakar, Paris, Marseille, Lyon, Bruxelles, Casablanca, Abidjan, Bamako…)
AIRPORTS="DSS CDG ORY MRS LYS BRU CMN ABJ BKO"

cd "$DIR" || exit 1

print_flights() {
  echo "$1" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    flights = d.get('flights', [])
    if not flights:
        print('  Aucun vol.')
        return
    print('  Vol     | Compagnie | Départ | Arrivée | Retard   | Éligible | Signal')
    print('  --------|-----------|--------|---------|----------|----------|--------')
    for f in flights:
        vol = f.get('flight', '—')
        air = f.get('airline', '—')
        dep = f.get('dep', '—')
        arr = f.get('arr', '—')
        if f.get('cancelled'):
            retard, sig = '—', 'ANNULÉ'
        else:
            dm = f.get('delayMinutes')
            retard = f'{dm} min' if dm is not None else '—'
            sig = f.get('color', 'GREY')
        elig = 'Oui' if f.get('eligible') else 'Non'
        print(f'  {vol:<7} | {air:<9} | {dep:<6} | {arr:<7} | {retard:<8} | {elig:<8} | {sig}')
    print('')
    print(f'  Total : {len(flights)} vols')
except Exception as e:
    print('  Erreur:', e)
"
}

{
  echo "RADAR ROBIN DES AIRS — TOUS LES VOLS EUROPE–AFRIQUE"
  echo "Plusieurs aéroports (départs + arrivées) — Mis à jour : $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "Pour actualiser : bash scripts/fetch-vols-radar.sh"
  echo ""

  for AIRPORT in $AIRPORTS; do
    echo "=============================================="
    echo "  DÉPARTS $AIRPORT"
    echo "=============================================="
    echo ""
    JSON_DEP=$(curl -s "${SITE_URL}/.netlify/functions/radar?airport=${AIRPORT}&type=departure")
    if echo "$JSON_DEP" | grep -q '"flights"'; then
      print_flights "$JSON_DEP"
    else
      echo "  Pas de données."
      echo ""
    fi

    echo "=============================================="
    echo "  ARRIVÉES $AIRPORT"
    echo "=============================================="
    echo ""
    JSON_ARR=$(curl -s "${SITE_URL}/.netlify/functions/radar?airport=${AIRPORT}&type=arrival")
    if echo "$JSON_ARR" | grep -q '"flights"'; then
      print_flights "$JSON_ARR"
    else
      echo "  Pas de données."
      echo ""
    fi
  done

} > "$OUT"

echo "Écrit : $DIR/$OUT"
echo ""
echo "→ Ouvre docs/vols-radar.txt dans Cursor pour voir TOUS les vols Europe–Afrique."

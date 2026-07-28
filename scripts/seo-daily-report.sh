#!/bin/bash
# Rapport SEO quotidien Robin des Airs : récupère les données Google Search Console
# et les envoie par mail depuis expert@robindesairs.eu (jamais la boîte perso/easyJet).
# Programmé chaque matin. Dépend de l'OAuth GSC dans ~/.config/claude-seo.
set -u
cd /Users/climbie/Downloads/files || exit 1

BODY="$(mktemp -t seo-report)"
{
  echo "Rapport SEO — Robin des Airs"
  echo "$(date '+%A %d %B %Y')"
  echo "Source : Google Search Console (délai d'environ 3 jours ; le dernier jour affiché n'est pas aujourd'hui)."
  echo
  echo "=========================================="
  echo "TENDANCE (semaines glissantes + comparaison)"
  echo "=========================================="
  python3 scripts/gsc_trend.py --weeks 4 2>&1
  echo
  echo "=========================================="
  echo "MIX DE POSITIONS — indicateur principal (28 jours)"
  echo "=========================================="
  python3 scripts/gsc_position_mix.py --days 28 --cible 25 2>&1
  echo
  echo "=========================================="
  echo "TOP PAGES (28 jours)"
  echo "=========================================="
  python3 scripts/gsc_pages.py --days 28 --limit 20 2>&1
  echo
  echo "=========================================="
  echo "TOP REQUÊTES (7 jours)"
  echo "=========================================="
  python3 scripts/gsc_pages.py --dim query --days 7 --limit 15 2>&1
  echo
  echo "--"
  echo "Rapport automatique pour Saint-Yves Kodjo — Robin des Airs"
} > "$BODY" 2>&1

# Envoi via l'app Mail, compte Google = expert@robindesairs.eu (lecture du fichier HORS bloc tell Mail).
/usr/bin/osascript <<OSA
set bodyText to (read POSIX file "$BODY" as «class utf8»)
tell application "Mail"
	set m to make new outgoing message with properties {subject:"Rapport SEO Robin des Airs — " & (do shell script "date '+%d/%m/%Y'"), content:bodyText, visible:false}
	tell m
		set sender to "expert@robindesairs.eu"
		make new to recipient at end of to recipients with properties {address:"expert@robindesairs.eu"}
	end tell
	send m
end tell
OSA

rm -f "$BODY"

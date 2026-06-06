#!/usr/bin/env bash
# Installe le poller iMessage du radar comme LaunchAgent (tourne toutes les 15 min
# tant que ta session Mac est ouverte). À lancer UNE fois :
#   bash scripts/install-imessage-radar.sh
#
# Désinstaller :  bash scripts/install-imessage-radar.sh --uninstall
set -euo pipefail

LABEL="com.robindesairs.imessage-radar"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLLER="$SCRIPT_DIR/imessage-radar-poller.js"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/.robin-radar"
INTERVAL="${ROBIN_INTERVAL_SEC:-900}"   # 15 min par défaut

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "✅ Désinstallé ($LABEL). L'historique $LOG_DIR est conservé."
  exit 0
fi

# 1) Node
NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "❌ node introuvable dans le PATH. Installe Node 18+ puis relance." >&2
  exit 1
fi

# 2) Config présente ?
if [[ -z "${ROBIN_IMESSAGE_TO:-}" && ! -f "$SCRIPT_DIR/.imessage-radar.env" ]]; then
  echo "❌ Aucun destinataire configuré." >&2
  echo "   → cp $SCRIPT_DIR/.imessage-radar.env.example $SCRIPT_DIR/.imessage-radar.env" >&2
  echo "   puis mets ton numéro dans ROBIN_IMESSAGE_TO." >&2
  exit 1
fi

mkdir -p "$LOG_DIR" "$HOME/Library/LaunchAgents"

# 3) Amorçage (marque les vols actuels comme vus, n'envoie rien) + test si possible
echo "→ Amorçage du poller (aucun iMessage envoyé sur les vols déjà présents)…"
"$NODE_BIN" "$POLLER" || true

# 4) plist
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$POLLER</string>
  </array>
  <key>WorkingDirectory</key><string>$SCRIPT_DIR</string>
  <key>StartInterval</key><integer>$INTERVAL</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG_DIR/imessage-radar.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/imessage-radar.log</string>
</dict>
</plist>
PLIST

# 5) (re)charger
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "✅ Installé. Le poller tourne toutes les $((INTERVAL/60)) min (RunAtLoad immédiat)."
echo "   Log : $LOG_DIR/imessage-radar.log"
echo "   Test d'envoi : $NODE_BIN $POLLER --test \"Test radar OK\""
echo "   Désinstaller : bash $SCRIPT_DIR/install-imessage-radar.sh --uninstall"
echo
echo "⚠️  Au 1ᵉʳ envoi, macOS demandera d'autoriser « osascript » à contrôler Messages."
echo "    Accepte (Réglages › Confidentialité › Automatisation)."

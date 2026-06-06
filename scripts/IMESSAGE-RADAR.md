# Alertes radar par iMessage (sur ton Mac)

WhatsApp (CallMeBot), Telegram et email partent **déjà du serveur 24/7**.
L'**iMessage ne peut pas partir du serveur** Netlify : il faut macOS + Messages.app.
Ce poller tourne donc **sur ton Mac** et t'envoie un iMessage pour chaque vol frais :
**annulé** (avec le report au lendemain) ou **retard ≥ 3 h**.

> Limite assumée : l'iMessage n'arrive que **quand ta session Mac est ouverte**.
> La nuit / Mac éteint → c'est WhatsApp/Telegram (serveur) qui prennent le relais.

## Activation (une fois)

```bash
cd ~/Downloads/files
cp scripts/.imessage-radar.env.example scripts/.imessage-radar.env
# édite scripts/.imessage-radar.env → mets ton numéro dans ROBIN_IMESSAGE_TO (+33…)
bash scripts/install-imessage-radar.sh
```

L'installation :
1. amorce le poller (marque les vols déjà présents comme « vus », **n'envoie rien**) ;
2. installe un LaunchAgent qui le relance **toutes les 15 min** tant que ta session est ouverte ;
3. au **1ᵉʳ vrai envoi**, macOS demande d'autoriser « osascript » à contrôler Messages → **Accepter**
   (sinon : Réglages › Confidentialité et sécurité › Automatisation).

## Tester / piloter

```bash
node scripts/imessage-radar-poller.js --test "Test radar OK"   # envoie un iMessage de test
node scripts/imessage-radar-poller.js --dry-run                # affiche sans envoyer
tail -f ~/.robin-radar/imessage-radar.log                      # voir l'activité
bash scripts/install-imessage-radar.sh --uninstall             # tout retirer
```

## Réglages (`scripts/.imessage-radar.env`)

| Variable            | Défaut                                   | Rôle |
|---------------------|------------------------------------------|------|
| `ROBIN_IMESSAGE_TO` | —  (**requis**)                          | Ton numéro (+33…) ou Apple ID e-mail |
| `ROBIN_RADAR_URL`   | `https://robindesairs.eu/api/radar-today`| Source des vols détectés |
| `ROBIN_MIN_DELAY`   | `180`                                    | Retard mini en minutes (3 h) |
| `ROBIN_TODAY_ONLY`  | `1`                                      | `1` = ignorer les vols de la veille |

Intervalle : `ROBIN_INTERVAL_SEC=600 bash scripts/install-imessage-radar.sh` (10 min).

## Ce que contient l'alerte

```
🚫 🌍 AF718 DSS→CDG ANNULÉ
🔄 Reporté : demain 14h35 (DSS→CDG)
🆕 Détecté 18:12 UTC
600 € · CE261 · lancer la pub
https://www.flightradar24.com/af718
```

- 🌍 = **départ d'Afrique** (meilleure cible diaspora), trié en premier.
- 🔄 **Reporté** = prochain vol planifié sur le même numéro (ta cible pub). Si la
  compagnie n'a pas encore reprogrammé : « prochain vol non trouvé ».
- 🆕 **Détecté** = heure où le radar a vu l'annulation (proxy de fraîcheur).

> Dédup : un vol n'est envoyé qu'une fois (clé vol+route+date+palier). Un retard qui
> s'aggrave d'une heure ou qui passe en annulation redéclenche une alerte.

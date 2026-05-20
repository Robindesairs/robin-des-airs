"""
Relances mandat (WhatsApp / Wati) — plusieurs échéances si le client n'a pas signé.

Usage dans ton app Flask :
    from relances_mandat import RelancesMandat, register_mandat_routes, configure_flask_app

    app = Flask(__name__)
    configure_flask_app(app)
    mandat_relances = RelancesMandat()
    register_mandat_routes(app, send, mandat_relances, os.environ.get("CRON_SECRET", ""))

Après show_summary (récap + lien court) :
    mandat_relances.enregistrer_apres_recap(phone, ref, lang, short_link)

Quand tu redémarres un nouveau flux pour un numéro (nouveau dossier) :
    mandat_relances.annuler_pour_telephone(phone)

Quand le mandat est signé (depuis ton formulaire / n8n / autre) :
    POST /webhook/mandat-signed  {"phone":"33...", "ref":"RDA-..."}
"""

from __future__ import annotations

import os
import threading
from datetime import datetime, timedelta
from typing import Any, Callable, List, Optional, Tuple


SendFn = Callable[[str, str], None]


def configure_flask_app(app: Any) -> None:
    """À appeler juste après Flask(__name__)."""
    app.config["JSON_SORT_KEYS"] = False
    app.secret_key = os.environ.get(
        "FLASK_SECRET_KEY",
        os.environ.get("SECRET_KEY", "change-me-in-production"),
    )


class RelancesMandat:
    """
    Plusieurs relances douces (J+1, J+3, J+7 par défaut) tant que le mandat
    n'est pas marqué signé. Thread-safe, état en mémoire (redémarrage = perte
    des relances en cours — utiliser CRON + persistance Airtable si besoin).
    """

    # Heures après l'envoi du récap WhatsApp (1ère, 2e, 3e relance)
    DELAIS_HEURES = (
        int(os.environ.get("MANDAT_RELANCE_H1", "24")),
        int(os.environ.get("MANDAT_RELANCE_H2", "72")),
        int(os.environ.get("MANDAT_RELANCE_H3", "168")),
    )

    def __init__(self) -> None:
        self._lock = threading.Lock()
        # phone (str) -> état
        self._pending: dict[str, dict[str, Any]] = {}

    def enregistrer_apres_recap(
        self, phone: str, ref: str, lang: str, short_link: str
    ) -> None:
        """Appeler une fois le message récap + lien mandat envoyé."""
        key = str(phone)
        with self._lock:
            self._pending[key] = {
                "ref": ref,
                "lang": (lang or "fr")[:5],
                "short_link": short_link or "",
                "summary_at": datetime.now(),
                "n_relances": 0,
                "signe": False,
            }

    def marquer_signe(self, phone: Optional[str] = None, ref: Optional[str] = None) -> bool:
        """Marque signé par numéro et/ou par référence dossier."""
        with self._lock:
            if phone and str(phone) in self._pending:
                st = self._pending[str(phone)]
                if not ref or st.get("ref") == ref:
                    st["signe"] = True
                    return True
            if ref:
                for _ph, st in self._pending.items():
                    if st.get("ref") == ref and not st.get("signe"):
                        st["signe"] = True
                        return True
        return False

    def annuler_pour_telephone(self, phone: str) -> None:
        with self._lock:
            self._pending.pop(str(phone), None)

    def _message(self, lang: str, index_relance: int, ref: str, link: str) -> str:
        # index_relance : 0 = 1ère relance, 1 = 2e, 2 = 3e
        if lang == "en":
            soft = [
                (
                    f"👋 *Small reminder* — file *{ref}* is waiting for your signature.\n\n"
                    f"2 minutes on the link below unlocks your claim:\n👉 {link}\n\n"
                    "_No signature = we can't contact the airline for you._ ✈️"
                ),
                (
                    f"✨ *Still there?*\n\n"
                    f"We kept your file *{ref}* open. The airline won't pay until we have your mandate.\n\n"
                    f"👉 {link}\n\n"
                    "_Reply STOP if you prefer to drop the file — no charge._"
                ),
                (
                    f"🕊️ *Last gentle nudge* for *{ref}*.\n\n"
                    f"If you'd like Robin des Airs to act for you, the mandate is here:\n👉 {link}\n\n"
                    f"📱 Or write to us on WhatsApp — we're here to help."
                ),
            ]
        else:
            soft = [
                (
                    f"👋 *Petit rappel bienveillant* — le dossier *{ref}* attend votre signature.\n\n"
                    f"2 minutes sur le lien ci-dessous et on peut lancer la procédure :\n👉 {link}\n\n"
                    "_Sans mandat, nous ne pouvons pas intervenir auprès de la compagnie._ ✈️"
                ),
                (
                    f"✨ *Toujours partant(e) ?*\n\n"
                    f"Nous gardons votre dossier *{ref}* ouvert. La compagnie ne verse rien tant que le mandat n'est pas signé.\n\n"
                    f"👉 {link}\n\n"
                    "_Répondez STOP si vous souhaitez abandonner le dossier — sans frais._"
                ),
                (
                    f"🕊️ *Dernier petit coup de pouce* pour le dossier *{ref}*.\n\n"
                    f"Si vous souhaitez que Robin des Airs agisse pour vous, le mandat est ici :\n👉 {link}\n\n"
                    f"📱 Vous pouvez aussi nous écrire sur WhatsApp, on vous aide avec plaisir."
                ),
            ]
        i = min(max(index_relance, 0), len(soft) - 1)
        return soft[i]

    def traiter_echeances(self, send_fn: SendFn) -> int:
        """
        Envoie les relances dues. À brancher sur un CRON (ex. toutes les 6 h)
        via GET/POST /cron/mandat-reminders?secret=...
        """
        now = datetime.now()
        sent = 0
        with self._lock:
            todo: List[Tuple[str, str]] = []
            for phone, st in list(self._pending.items()):
                if st.get("signe"):
                    continue
                k = int(st.get("n_relances", 0))
                if k >= len(self.DELAIS_HEURES):
                    continue
                deadline = st["summary_at"] + timedelta(hours=self.DELAIS_HEURES[k])
                if now >= deadline:
                    lang = st.get("lang", "fr")
                    msg = self._message(lang, k, st.get("ref", ""), st.get("short_link", ""))
                    st["n_relances"] = k + 1
                    todo.append((phone, msg))
        for phone, msg in todo:
            send_fn(phone, msg)
            sent += 1
        return sent


def register_mandat_routes(
    app: Any,
    send_fn: SendFn,
    relances: RelancesMandat,
    cron_secret: str,
) -> None:
    """Enregistre les routes CRON + webhook mandat signé."""
    from flask import jsonify, request

    @app.route("/cron/mandat-reminders", methods=["GET", "POST"])
    def cron_mandat_reminders():
        if cron_secret and request.args.get("secret") != cron_secret:
            return jsonify({"error": "forbidden"}), 403
        n = relances.traiter_echeances(send_fn)
        return jsonify({"status": "ok", "reminders_sent": n}), 200

    @app.route("/webhook/mandat-signed", methods=["POST"])
    def webhook_mandat_signed():
        """
        Appelé par ton site / n8n après signature mandat.
        JSON : {"phone":"33756...","ref":"RDA-20260512-AB12"} (phone = waId Wati)
        """
        data = request.get_json(silent=True) or {}
        phone = data.get("phone") or data.get("waId") or data.get("whatsapp")
        ref = data.get("ref")
        ok = relances.marquer_signe(phone=str(phone) if phone else None, ref=ref)
        return jsonify({"status": "ok" if ok else "not_found", "signed": ok}), 200

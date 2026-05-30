from flask import Flask, request, jsonify
import requests
import os
import json
import base64
import re
import hashlib
import time
from datetime import datetime, timedelta
from urllib.parse import urlencode

app = Flask(__name__)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
WATI_API_TOKEN = os.environ.get("WATI_API_TOKEN", "")
WATI_BASE_URL  = os.environ.get("WATI_BASE_URL", "")
RDA_SITE       = os.environ.get("RDA_SITE", "https://robindesairs.eu")
MANDAT_BASE_URL = os.environ.get("MANDAT_BASE_URL", f"{RDA_SITE}/mandat.html")

# ===== MEMOIRE =====
conversations         = {}
recent_event_ids      = {}
recent_payload_keys   = {}
recent_outbound_sends = {}
MEMORY_HOURS              = 24
DEDUP_WINDOW_SECONDS      = 25
EVENT_ID_TTL_SECONDS      = 900
OUTBOUND_DEDUP_SECONDS    = int(os.environ.get("OUTBOUND_DEDUP_SECONDS", "45"))
OUTBOUND_CACHE_TTL_SECONDS = int(os.environ.get("OUTBOUND_CACHE_TTL_SECONDS", "900"))

# ===== ETAPES DU FLUX =====
# 1. route_qualify      → Afrique↔Europe / Europe / Autre
# 2. incident_type      → Retard / Annulation / Surbooking
# 3. delay_duration     → +3h / <3h / Je sais pas  (si retard)
# 4. rgpd               → Consentement CGV
# 5. passengers         → Nb passagers
# 6. motivation         → Montant + 25% info (auto, pas de saisie)
# 7. document           → Photo carte/booking ou "manuel"
# 8. passenger_collect  → Noms un par un
# 9. flight_number      → Numéro de vol (+ déduction compagnie)
# 10. flight_date       → Date du vol
# 11. flight_type       → Direct / Escale
# 12. recap             → Récap complet modifiable
# 13. summary           → Mandat

# ===== COMPAGNIES PAR PRÉFIXE IATA =====
AIRLINE_PREFIXES = {
    "AF": "Air France", "KL": "KLM", "SN": "Brussels Airlines",
    "LH": "Lufthansa", "TP": "TAP Portugal", "IB": "Iberia",
    "BA": "British Airways", "AZ": "ITA Airways", "FR": "Ryanair",
    "U2": "EasyJet", "VY": "Vueling", "W6": "Wizz Air",
    "TO": "Transavia", "BJ": "Corsair", "SS": "Corsair",
    "HC": "Air Sénégal", "SC": "Air Sénégal",
    "AT": "Royal Air Maroc", "TU": "Tunisair",
    "ET": "Ethiopian Airlines", "KQ": "Kenya Airways",
    "WB": "RwandAir", "QR": "Qatar Airways",
    "EK": "Emirates", "MS": "EgyptAir",
    "CM": "COPA Airlines", "DL": "Delta", "AA": "American Airlines",
}

def guess_airline(flight_number):
    """Devine la compagnie à partir du préfixe IATA du numéro de vol."""
    fn = (flight_number or "").strip().upper()
    for prefix, name in AIRLINE_PREFIXES.items():
        if fn.startswith(prefix):
            return name
    return None


# ============================================
# HELPERS CONVERSATION
# ============================================

def get_or_create_conversation(phone):
    if phone not in conversations:
        conversations[phone] = {
            "messages":     [],
            "current_step": None,
            "data": {
                "route_zone":        None,  # "africa_europe" / "europe" / "other"
                "incident_type":     None,  # "delay" / "cancel" / "denied"
                "delay_ok":          None,  # True / False
                "passengers":        None,
                "passenger_names":   [],
                "current_pax_index": 0,     # index passager en cours de collecte
                "flight_number":     None,
                "airline":           None,
                "flight_date":       None,
                "flight_type":       None,  # "direct" / "connection"
                "route":             None,
                "has_minors":        None,
                "minors_count":      0,
                "boarding_pass_confirmed": False,
                "language":          "fr",
                "temp_year":         None,
                "temp_month":        None,
            },
            "created": datetime.now()
        }
    if (datetime.now() - conversations[phone]["created"]) > timedelta(hours=MEMORY_HOURS):
        del conversations[phone]
        return get_or_create_conversation(phone)
    return conversations[phone]


def generate_ref_dossier(phone):
    today  = datetime.now().strftime("%Y%m%d")
    suffix = hashlib.md5(f"{phone}{today}".encode()).hexdigest()[:4].upper()
    return f"RDA-{today}-{suffix}"


def _mandat_wa_display(phone):
    p = str(phone or "").strip().replace(" ", "")
    if not p: return ""
    if p.startswith("+"): return p
    if p.startswith("00"): return "+" + p[2:]
    if p.isdigit(): return "+" + p
    return p


def _mandat_fn_ln_from_names(names):
    if not names: return "", ""
    first = (names[0] or "").strip()
    parts = first.split()
    if len(parts) >= 2:
        return parts[0], " ".join(parts[1:]).upper()
    return "", ""


def detect_language(text):
    tl = text.lower()
    en = sum(1 for w in ["hello","hi","the","my","flight","delay","delayed","cancel","yes","no","thanks"] if w in tl.split())
    fr = sum(1 for w in ["bonjour","salut","le","mon","vol","retard","annul","oui","non","merci"] if w in tl.split())
    return "en" if en > fr else "fr"


# ============================================
# DEDUPLICATION
# ============================================

def _cleanup_dedup_caches(now):
    for cache in [recent_event_ids, recent_payload_keys]:
        to_del = [k for k, ts in cache.items() if (now - ts).total_seconds() > EVENT_ID_TTL_SECONDS]
        for k in to_del: cache.pop(k, None)

def _extract_event_id(data):
    if not isinstance(data, dict): return ""
    candidates = [data.get("messageId"), data.get("id"), data.get("whatsappMessageId")]
    for c in candidates:
        if c: return str(c).strip()
    return ""

def is_duplicate_event(phone, data, payload_signature):
    now = datetime.now()
    _cleanup_dedup_caches(now)
    event_id = _extract_event_id(data)
    if event_id:
        if event_id in recent_event_ids: return True
        recent_event_ids[event_id] = now
    sig = (payload_signature or "").strip()
    if sig:
        key = hashlib.sha256(f"{phone}|{sig.lower()}".encode()).hexdigest()
        if key in recent_payload_keys:
            if (now - recent_payload_keys[key]).total_seconds() < DEDUP_WINDOW_SECONDS: return True
        recent_payload_keys[key] = now
    return False

def _conversation_step_for_phone(phone):
    conv = conversations.get(phone)
    return str(conv.get("current_step") or "none") if conv else "none"

def _cleanup_outbound_cache(now):
    to_del = [k for k, ts in recent_outbound_sends.items() if (now - ts).total_seconds() > OUTBOUND_CACHE_TTL_SECONDS]
    for k in to_del: recent_outbound_sends.pop(k, None)

def _outbound_should_block(phone, step, kind, fp):
    now = datetime.now()
    _cleanup_outbound_cache(now)
    key = hashlib.sha256(f"{phone}|{step}|{kind}|{fp}".encode()).hexdigest()
    if key in recent_outbound_sends:
        if (now - recent_outbound_sends[key]).total_seconds() < OUTBOUND_DEDUP_SECONDS:
            print(f"[OUTBOUND_SKIP] {phone} {step} {kind}")
            return True
    return False

def _register_outbound_success(phone, step, kind, fp):
    now = datetime.now()
    _cleanup_outbound_cache(now)
    key = hashlib.sha256(f"{phone}|{step}|{kind}|{fp}".encode()).hexdigest()
    recent_outbound_sends[key] = now

def _fp_text(msg): return hashlib.sha256(msg.strip().encode()).hexdigest()
def _fp_buttons(body, buttons, hdr, ftr):
    return hashlib.sha256(json.dumps({"body":body,"btns":[b.get("title","") for b in (buttons or [])]}, sort_keys=True).encode()).hexdigest()
def _fp_list(body, label, sections, hdr, ftr):
    return hashlib.sha256(json.dumps({"body":body,"label":label,"s":str(sections)}, sort_keys=True).encode()).hexdigest()


# ============================================
# WATI — ENVOI
# ============================================

def send_whatsapp_text(phone, message, *, skip_outbound_dedup=False):
    message = message.strip()
    if not message: return 0
    step = _conversation_step_for_phone(phone)
    fp   = _fp_text(message)
    if not skip_outbound_dedup and _outbound_should_block(phone, step, "text", fp): return 429
    url  = f"{WATI_BASE_URL}/api/v1/sendSessionMessage/{phone}"
    hdrs = {"Authorization": f"Bearer {WATI_API_TOKEN}", "accept": "*/*"}
    r = requests.post(url, headers=hdrs, params={"messageText": message}, timeout=30)
    print(f"Wati TEXT: {r.status_code}")
    if r.status_code == 200 and not skip_outbound_dedup:
        _register_outbound_success(phone, step, "text", fp)
    return r.status_code


def send_whatsapp_buttons(phone, body_text, buttons, header_text=None, footer_text=None):
    url  = f"{WATI_BASE_URL}/api/v1/sendInteractiveButtonsMessage"
    hdrs = {"Authorization": f"Bearer {WATI_API_TOKEN}", "Content-Type": "application/json", "accept": "*/*"}
    payload = {"body": body_text, "buttons": [{"text": b["title"]} for b in buttons[:3]]}
    if header_text: payload["header"] = header_text
    if footer_text: payload["footer"] = footer_text
    step = _conversation_step_for_phone(phone)
    fp   = _fp_buttons(body_text, buttons, header_text, footer_text)
    if _outbound_should_block(phone, step, "buttons", fp): return 429
    r = requests.post(url, headers=hdrs, params={"whatsappNumber": phone}, json=payload, timeout=30)
    print(f"Wati BUTTONS: {r.status_code} - {r.text[:150]}")
    if r.status_code != 200:
        fallback = body_text + "\n\n" + "\n".join(f"{i+1}. {b['title']}" for i, b in enumerate(buttons))
        fallback += "\n\nRépondez avec le numéro de votre choix."
        send_whatsapp_text(phone, fallback, skip_outbound_dedup=True)
    else:
        _register_outbound_success(phone, step, "buttons", fp)
    return r.status_code


def send_whatsapp_list(phone, body_text, button_label, sections, header_text=None, footer_text=None):
    url  = f"{WATI_BASE_URL}/api/v1/sendInteractiveListMessage"
    hdrs = {"Authorization": f"Bearer {WATI_API_TOKEN}", "Content-Type": "application/json", "accept": "*/*"}
    normalized = []
    for sec in sections:
        rows = []
        for row in sec.get("rows", []):
            rid = row.get("id") or row.get("rowId") or ""
            rows.append({"id": rid, "rowId": rid, "title": row.get("title",""), "description": row.get("description","")})
        normalized.append({"title": sec.get("title",""), "rows": rows})
    payload = {"body": body_text, "buttonText": button_label, "sections": normalized}
    if header_text: payload["header"] = header_text
    if footer_text: payload["footer"] = footer_text
    step = _conversation_step_for_phone(phone)
    fp   = _fp_list(body_text, button_label, sections, header_text, footer_text)
    if _outbound_should_block(phone, step, "list", fp): return 429
    r = requests.post(url, headers=hdrs, params={"whatsappNumber": phone}, json=payload, timeout=30)
    print(f"Wati LIST: {r.status_code} - {r.text[:150]}")
    if r.status_code != 200:
        fallback = body_text + "\n\n"
        idx = 1
        for sec in sections:
            for row in sec["rows"]:
                fallback += f"{idx}. {row['title']}\n"
                idx += 1
        fallback += "\nRépondez avec le numéro de votre choix."
        send_whatsapp_text(phone, fallback, skip_outbound_dedup=True)
    else:
        _register_outbound_success(phone, step, "list", fp)
    return r.status_code


# ============================================
# OPENAI
# ============================================

def call_openai(phone, user_message, image_data=None):
    try:
        conv = get_or_create_conversation(phone)
        if image_data:
            user_content = [
                {"type": "text", "text": user_message or "Voici mon document de voyage"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
            ]
            conv["messages"].append({"role": "user", "content": user_content})
        else:
            conv["messages"].append({"role": "user", "content": user_message})
        if len(conv["messages"]) > 20:
            conv["messages"] = conv["messages"][-20:]
        system = (
            "Tu es l'agent IA de ROBIN DES AIRS. Tu réponds dans la langue du client (FR/EN).\n"
            "Format : 3+ emojis, max 6 lignes, toujours finir par un lien d'action.\n"
            "Infos clés : 600€/passager, 25% commission si succès seulement, 5 ans rétroactivité.\n"
            "Pour les cas complexes ou 6+ passagers : escalade expert +33 7 56 86 36 30"
        )
        messages = [{"role": "system", "content": system}] + conv["messages"]
        model = "gpt-4o" if image_data else "gpt-4o-mini"
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "max_tokens": 400, "temperature": 0.7},
            timeout=45
        )
        data = response.json()
        if "choices" in data:
            text = data["choices"][0]["message"]["content"].strip()
            conv["messages"].append({"role": "assistant", "content": text})
            return text
        return None
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None


# ============================================
# FLUX — FONCTIONS D'ENVOI
# ============================================

def ask_route_qualify(phone, lang="fr"):
    """ÉTAPE 1 — Qualification route"""
    if lang == "en":
        body = "🗺️ Where was your flight?\n\nThis determines if EU regulation CE 261/2004 applies."
        buttons = [
            {"id": "zone_africa_europe", "title": "🌍 Africa ↔ Europe"},
            {"id": "zone_europe",        "title": "🇪🇺 Within Europe"},
            {"id": "zone_other",         "title": "🌐 Other route"},
        ]
    else:
        body = "🗺️ Votre vol était sur quelle route ?\n\nCela détermine si le règlement européen CE 261/2004 s'applique."
        buttons = [
            {"id": "zone_africa_europe", "title": "🌍 Afrique ↔ Europe"},
            {"id": "zone_europe",        "title": "🇪🇺 Dans l'Europe"},
            {"id": "zone_other",         "title": "🌐 Autre route"},
        ]
    send_whatsapp_buttons(phone, body, buttons)


def ask_incident_type(phone, lang="fr"):
    """ÉTAPE 2 — Type d'incident"""
    if lang == "en":
        body = "✈️ What happened with your flight?"
        buttons = [
            {"id": "inc_delay",  "title": "⏱️ Delay at arrival"},
            {"id": "inc_cancel", "title": "❌ Cancellation"},
            {"id": "inc_denied", "title": "🚫 Denied boarding"},
        ]
    else:
        body = "✈️ Que s'est-il passé avec votre vol ?"
        buttons = [
            {"id": "inc_delay",  "title": "⏱️ Retard à l'arrivée"},
            {"id": "inc_cancel", "title": "❌ Annulation"},
            {"id": "inc_denied", "title": "🚫 Refus d'embarquement"},
        ]
    send_whatsapp_buttons(phone, body, buttons)


def ask_delay_duration(phone, lang="fr"):
    """ÉTAPE 3 — Durée retard (uniquement si retard)"""
    if lang == "en":
        body = "⏱️ How many hours late were you at *arrival* ?"
        buttons = [
            {"id": "delay_3plus",   "title": "✅ More than 3 hours"},
            {"id": "delay_lt3",     "title": "❌ Less than 3 hours"},
            {"id": "delay_unknown", "title": "🤔 I'm not sure"},
        ]
    else:
        body = "⏱️ De combien d'heures était le retard à l'*arrivée* ?"
        buttons = [
            {"id": "delay_3plus",   "title": "✅ Plus de 3 heures"},
            {"id": "delay_lt3",     "title": "❌ Moins de 3 heures"},
            {"id": "delay_unknown", "title": "🤔 Je ne sais plus"},
        ]
    send_whatsapp_buttons(phone, body, buttons)


def send_rgpd_and_ask_language(phone, lang="fr"):
    """ÉTAPE 4 — RGPD puis choix de langue"""
    if lang == "en":
        rgpd = (
            "🔒 *Data & consent*\n\n"
            "Robin des Airs collects your information *solely* to build your compensation file against the airline. "
            "Your data is never sold or shared.\n\n"
            "By continuing you accept our *Terms & Conditions* :\n"
            "👉 robindesairs.eu/cgv.html"
        )
    else:
        rgpd = (
            "🔒 *Données & consentement*\n\n"
            "Robin des Airs collecte vos informations *uniquement* pour constituer votre dossier d'indemnisation contre la compagnie aérienne. "
            "Vos données ne sont jamais revendues ni partagées.\n\n"
            "En continuant vous acceptez nos *Conditions Générales de Vente* :\n"
            "👉 robindesairs.eu/cgv.html"
        )
    send_whatsapp_text(phone, rgpd)
    time.sleep(1)
    ask_language(phone)


def ask_language(phone):
    """ÉTAPE 4bis — Choix de la langue"""
    body = (
        "🌍 *Dans quelle langue souhaitez-vous être accompagné(e) ?*\n\n"
        "Chez Robin des Airs, nous parlons votre langue — car il est toujours plus facile de s'expliquer dans sa langue maternelle. 🤝\n\n"
        "*In which language would you like to be assisted?*"
    )
    sections = [{"title": "Choisir votre langue", "rows": [
        {"id": "lang_fr",      "title": "🇫🇷 Français"},
        {"id": "lang_en",      "title": "🇬🇧 English"},
        {"id": "lang_wo",      "title": "🌍 Wolof"},
        {"id": "lang_mandinka","title": "🌍 Mandinka"},
        {"id": "lang_twi",     "title": "🌍 Twi"},
        {"id": "lang_yoruba",  "title": "🌍 Yoruba"},
        {"id": "lang_lingala", "title": "🌍 Lingala"},
        {"id": "lang_swahili", "title": "🌍 Swahili"},
        {"id": "lang_peul",    "title": "🌍 Peul / Fulfulde"},
    ]}]
    send_whatsapp_list(phone, body, "Choisir 🌍", sections)


# Langues africaines — messages clés
LANG_LABELS = {
    "fr":       "fr",
    "en":       "en",
    "wo":       "wo",
    "mandinka": "mandinka",
    "twi":      "twi",
    "yoruba":   "yoruba",
    "lingala":  "lingala",
    "swahili":  "swahili",
    "peul":     "peul",
}

# Messages de passage à un expert pour les langues africaines
EXPERT_MSG = {
    "wo":       "Un expert Wolof vous rappelle directement 🤝\n📱 +33 7 56 86 36 30",
    "mandinka": "Un expert Mandinka vous rappelle directement 🤝\n📱 +33 7 56 86 36 30",
    "twi":      "An expert will call you in Twi 🤝\n📱 +33 7 56 86 36 30",
    "yoruba":   "Àkọ̀wé wa yóò pe yín ní Yorùbá 🤝\n📱 +33 7 56 86 36 30",
    "lingala":  "Moyangeli na biso akobeta yo telefone na Lingala 🤝\n📱 +33 7 56 86 36 30",
    "swahili":  "Mtaalamu wetu atakupigia simu kwa Kiswahili 🤝\n📱 +33 7 56 86 36 30",
    "peul":     "Ko jom biyam am ɓurti wuuri yimɓe heɓata maa 🤝\n📱 +33 7 56 86 36 30",
}


def send_rgpd_and_ask_passengers(phone, lang="fr"):
    """Alias maintenu pour compatibilité — redirige vers le nouveau flux avec langue"""
    send_rgpd_and_ask_language(phone, lang)


def ask_passengers(phone, lang="fr"):
    """ÉTAPE 5 — Nombre de passagers"""
    if lang == "en":
        body  = "👥 How many passengers are claiming on this flight?"
        label = "Select 👥"
    else:
        body  = "👥 Combien de passagers réclament sur ce vol ?"
        label = "Choisir 👥"
    sections = [{"title": "Passagers", "rows": [
        {"id": "pax_1", "title": "1 passager" if lang=="fr" else "1 passenger", "description": "= 600 €"},
        {"id": "pax_2", "title": "2 passagers" if lang=="fr" else "2 passengers","description": "= 1 200 €"},
        {"id": "pax_3", "title": "3 passagers" if lang=="fr" else "3 passengers","description": "= 1 800 €"},
        {"id": "pax_4", "title": "4 passagers" if lang=="fr" else "4 passengers","description": "= 2 400 €"},
        {"id": "pax_5", "title": "5 passagers" if lang=="fr" else "5 passengers","description": "= 3 000 €"},
        {"id": "pax_more","title":"6 ou plus" if lang=="fr" else "6 or more",   "description": "Expert vous rappelle"},
    ]}]
    send_whatsapp_list(phone, body, label, sections)


def send_motivation(phone, conv):
    """ÉTAPE 6 — Motivation + 25% info (auto après passagers)"""
    lang  = conv["data"]["language"]
    pax   = conv["data"]["passengers"]
    total = 600 * pax
    net   = int(total * 0.75)
    if lang == "en":
        msg = (
            f"🎉 *{pax} passenger(s) = up to {total} € in compensation!*\n\n"
            f"💶 You receive *{net} € net* (75%).\n"
            f"Robin des Airs takes *25% success fee — only if we win.*\n"
            f"If you receive nothing → we charge nothing.\n\n"
            f"*Our interest is yours.* 🤝"
        )
    else:
        msg = (
            f"🎉 *{pax} passager(s) = jusqu'à {total} € d'indemnité !*\n\n"
            f"💶 Vous percevez *{net} € nets* (75%).\n"
            f"Robin des Airs prélève *25% de frais de succès — uniquement si nous obtenons le paiement.*\n"
            f"Si vous ne touchez rien → nous ne touchons rien.\n\n"
            f"*Notre intérêt est donc le vôtre.* 🤝"
        )
    send_whatsapp_text(phone, msg)
    time.sleep(1)


def ask_document(phone, lang="fr"):
    """ÉTAPE 7 — Demande document (carte embarquement ou e-booking)"""
    if lang == "en":
        msg = (
            "⚡ *Let's save you time!*\n\n"
            "Send a photo of your *boarding pass* or your *booking confirmation (e-ticket)* "
            "— our system reads the information automatically so you don't have to type everything.\n\n"
            "📎 Send your document\n"
            "✏️ Or type *manual* to enter the info yourself"
        )
    else:
        msg = (
            "⚡ *On va vous faire gagner du temps !*\n\n"
            "Envoyez une photo de votre *carte d'embarquement* ou de votre *confirmation de réservation (e-billet)* "
            "— notre système lit les informations automatiquement pour vous éviter de tout retaper.\n\n"
            "📎 Envoyez votre document\n"
            "✏️ Ou tapez *manuel* pour saisir les infos vous-même"
        )
    send_whatsapp_text(phone, msg)


def ask_next_passenger(phone, conv):
    """ÉTAPE 8 — Collecte passagers un par un"""
    lang  = conv["data"]["language"]
    pax   = conv["data"]["passengers"]
    idx   = conv["data"].get("current_pax_index", 0)
    names = conv["data"].get("passenger_names", [])

    if idx >= pax:
        # Tous collectés → aller au numéro de vol
        conv["current_step"] = "flight_number"
        ask_flight_number(phone, conv)
        return

    num = idx + 1
    if lang == "en":
        msg = f"👤 *Passenger {num} of {pax}* — First name and last name?\n_(eg: John Doe)_"
    else:
        msg = f"👤 *Passager {num} sur {pax}* — Prénom et nom ?\n_(ex : Jean Dupont)_"
    send_whatsapp_text(phone, msg)


def confirm_passenger(phone, conv, name):
    """Confirme le nom saisi pour un passager"""
    lang = conv["data"]["language"]
    idx  = conv["data"].get("current_pax_index", 0)
    num  = idx + 1
    if lang == "en":
        body = f"✅ Passenger {num}: *{name}*\nIs this correct?"
        buttons = [
            {"id": "pax_confirm_yes", "title": "✅ Yes, correct"},
            {"id": "pax_confirm_no",  "title": "✏️ Correct it"},
        ]
    else:
        body = f"✅ Passager {num} : *{name}*\nC'est correct ?"
        buttons = [
            {"id": "pax_confirm_yes", "title": "✅ Oui, correct"},
            {"id": "pax_confirm_no",  "title": "✏️ Corriger"},
        ]
    send_whatsapp_buttons(phone, body, buttons)


def ask_flight_number(phone, conv):
    """ÉTAPE 9 — Numéro de vol"""
    lang = conv["data"]["language"]
    if lang == "en":
        msg = (
            "📝 What is your *flight number* as shown on your ticket?\n\n"
            "_(eg: AF718, KL563, SN271)_\n\n"
            "ℹ️ This is the commercial number — use it even for codeshare flights.\n\n"
            "📸 You can also send a photo of your boarding pass."
        )
    else:
        msg = (
            "📝 Quel est le *numéro de vol* tel qu'il apparaît sur votre billet ?\n\n"
            "_(ex : AF718, KL563, SN271)_\n\n"
            "ℹ️ C'est le numéro commercial — utilisez-le même en cas de code share.\n\n"
            "📸 Vous pouvez aussi envoyer une photo de votre carte d'embarquement."
        )
    send_whatsapp_text(phone, msg)


def confirm_flight_number(phone, conv, flight_number, airline):
    """Confirme le numéro de vol et la compagnie déduite"""
    lang = conv["data"]["language"]
    if airline:
        if lang == "en":
            body = f"✅ Flight *{flight_number}* — *{airline}*\nIs this correct?"
        else:
            body = f"✅ Vol *{flight_number}* — *{airline}*\nC'est correct ?"
    else:
        if lang == "en":
            body = f"✅ Flight *{flight_number}*\nIs this correct?"
        else:
            body = f"✅ Vol *{flight_number}*\nC'est correct ?"
    buttons = [
        {"id": "fn_confirm_yes", "title": "✅ Oui" if lang=="fr" else "✅ Yes"},
        {"id": "fn_confirm_no",  "title": "✏️ Corriger" if lang=="fr" else "✏️ Correct it"},
    ]
    send_whatsapp_buttons(phone, body, buttons)


def ask_flight_date(phone, conv):
    """ÉTAPE 10 — Date du vol (saisie libre)"""
    lang = conv["data"]["language"]
    if lang == "en":
        msg = "📅 What was the *date of the flight*?\n\n_(eg: 15/03/2023 or March 15 2023)_"
    else:
        msg = "📅 Quelle était la *date du vol* ?\n\n_(ex : 15/03/2023 ou 15 mars 2023)_"
    send_whatsapp_text(phone, msg)


def confirm_flight_date(phone, conv, date_str):
    """Confirme la date saisie"""
    lang = conv["data"]["language"]
    if lang == "en":
        body = f"✅ Date: *{date_str}*\nIs this correct?"
    else:
        body = f"✅ Date : *{date_str}*\nC'est correct ?"
    buttons = [
        {"id": "date_confirm_yes", "title": "✅ Oui" if lang=="fr" else "✅ Yes"},
        {"id": "date_confirm_no",  "title": "✏️ Corriger" if lang=="fr" else "✏️ Correct it"},
    ]
    send_whatsapp_buttons(phone, body, buttons)


def ask_flight_type(phone, conv):
    """ÉTAPE 11 — Direct ou escale"""
    lang = conv["data"]["language"]
    if lang == "en":
        body    = "✈️ Was it a direct flight or with connection(s)?"
        buttons = [
            {"id": "type_direct",     "title": "✈️ Direct flight"},
            {"id": "type_connection", "title": "🔄 With connection"},
        ]
    else:
        body    = "✈️ C'était un vol direct ou avec escale(s) ?"
        buttons = [
            {"id": "type_direct",     "title": "✈️ Vol direct"},
            {"id": "type_connection", "title": "🔄 Avec escale"},
        ]
    send_whatsapp_buttons(phone, body, buttons)


def ask_minors(phone, conv):
    """ÉTAPE 12 — Mineurs"""
    lang = conv["data"]["language"]
    pax  = conv["data"]["passengers"]
    if pax == 1:
        if lang == "en":
            body    = "👤 Are you over 18 years old?"
            buttons = [
                {"id": "minor_no",   "title": "✅ Yes, adult"},
                {"id": "minor_self", "title": "👶 No, I'm a minor"},
            ]
        else:
            body    = "👤 Êtes-vous majeur(e) (18+ ans) ?"
            buttons = [
                {"id": "minor_no",   "title": "✅ Oui, majeur(e)"},
                {"id": "minor_self", "title": "👶 Non, je suis mineur(e)"},
            ]
    else:
        if lang == "en":
            body    = f"👶 Among the {pax} passengers, are there any minors (under 18)?"
            buttons = [
                {"id": "minor_no",  "title": "✅ All adults"},
                {"id": "minor_yes", "title": "👶 Yes, some minors"},
            ]
        else:
            body    = f"👶 Parmi les {pax} passagers, y a-t-il des mineurs (moins de 18 ans) ?"
            buttons = [
                {"id": "minor_no",  "title": "✅ Tous majeurs"},
                {"id": "minor_yes", "title": "👶 Oui, des mineurs"},
            ]
    send_whatsapp_buttons(phone, body, buttons)


def show_recap(phone, conv):
    """ÉTAPE 12 — Récapitulatif complet modifiable"""
    lang = conv["data"]["language"]
    d    = conv["data"]
    pax  = d["passengers"]
    net  = int(600 * pax * 0.75)

    incident_labels = {
        "delay":  "Retard +3h"          if lang=="fr" else "Delay +3h",
        "cancel": "Annulation"           if lang=="fr" else "Cancellation",
        "denied": "Refus d'embarquement" if lang=="fr" else "Denied boarding",
    }
    incident = incident_labels.get(d.get("incident_type",""), d.get("incident_type","?"))
    names_str = ", ".join(d.get("passenger_names") or ["—"])
    route_str = f"\n🗺️ {d.get('route')}" if d.get("route") else ""
    ft_str    = ("Direct" if d.get("flight_type")=="direct" else "Avec escale") if lang=="fr" else ("Direct" if d.get("flight_type")=="direct" else "With connection")

    if lang == "en":
        recap = (
            f"📋 *Summary — please confirm*\n\n"
            f"👥 {pax} passenger(s): {names_str}\n"
            f"✈️ {d.get('flight_number','?')} — {d.get('airline','?')}{route_str}\n"
            f"📅 {d.get('flight_date','?')} — {incident}\n"
            f"🛤️ {ft_str}\n"
            f"💵 *Target: {net} € net (75%)*"
        )
        buttons = [
            {"id": "recap_ok",     "title": "✅ All correct"},
            {"id": "recap_modify", "title": "✏️ Modify"},
        ]
    else:
        recap = (
            f"📋 *Récapitulatif — confirmez svp*\n\n"
            f"👥 {pax} passager(s) : {names_str}\n"
            f"✈️ {d.get('flight_number','?')} — {d.get('airline','?')}{route_str}\n"
            f"📅 {d.get('flight_date','?')} — {incident}\n"
            f"🛤️ {ft_str}\n"
            f"💵 *Objectif : {net} € nets (75%)*"
        )
        buttons = [
            {"id": "recap_ok",     "title": "✅ Tout est correct"},
            {"id": "recap_modify", "title": "✏️ Modifier"},
        ]
    send_whatsapp_buttons(phone, recap, buttons)


def ask_what_to_modify(phone, lang="fr"):
    """Menu de modification"""
    if lang == "en":
        body  = "✏️ What would you like to modify?"
        label = "Choose"
    else:
        body  = "✏️ Que souhaitez-vous modifier ?"
        label = "Choisir"
    sections = [{"title": "Modifier", "rows": [
        {"id": "mod_names",    "title": "👤 Noms passagers"   if lang=="fr" else "👤 Passenger names"},
        {"id": "mod_flight",   "title": "✈️ Numéro de vol"    if lang=="fr" else "✈️ Flight number"},
        {"id": "mod_date",     "title": "📅 Date du vol"      if lang=="fr" else "📅 Flight date"},
        {"id": "mod_incident", "title": "⚡ Type d'incident"  if lang=="fr" else "⚡ Incident type"},
        {"id": "mod_route",    "title": "🗺️ Trajet"           if lang=="fr" else "🗺️ Route"},
    ]}]
    send_whatsapp_list(phone, body, label, sections)


def show_summary_and_mandat(phone, conv):
    """ÉTAPE FINALE — Mandat pré-rempli"""
    lang = conv["data"]["language"]
    d    = conv["data"]
    pax  = d["passengers"]
    net  = int(600 * pax * 0.75)

    ref  = conv.get("ref_dossier") or generate_ref_dossier(phone)
    conv["ref_dossier"] = ref

    fn0, ln0   = _mandat_fn_ln_from_names(d.get("passenger_names") or [])
    name       = f"{fn0} {ln0}".strip() or (d.get("passenger_names") or ["—"])[0]
    wa_disp    = _mandat_wa_display(phone)
    names_joined = ",".join(d.get("passenger_names") or [])
    motif_map  = {"delay": "Retard de vol", "cancel": "Annulation de vol", "denied": "Refus d'embarquement"}

    params = {
        "ref":       ref,
        "phone":     wa_disp,
        "name":      name,
        "vol":       (d.get("flight_number") or "").strip(),
        "date":      (d.get("flight_date")   or "").strip(),
        "compagnie": (d.get("airline")        or "").strip(),
        "motif":     motif_map.get(d.get("incident_type",""), "Retard de vol"),
        "nbpax":     str(pax),
        "source":    "whatsapp",
    }
    if names_joined and pax > 1:
        params["paxlist"] = names_joined
    mandat_url = f"{MANDAT_BASE_URL.split('?')[0]}?{urlencode({k:v for k,v in params.items() if v})}"

    incident_labels = {
        "delay":  "Retard +3h"          if lang=="fr" else "Delay +3h",
        "cancel": "Annulation"           if lang=="fr" else "Cancellation",
        "denied": "Refus d'embarquement" if lang=="fr" else "Denied boarding",
    }
    incident  = incident_labels.get(d.get("incident_type",""), "?")
    route_str = f"\n🗺️ {d.get('route')}" if d.get("route") else ""

    if lang == "en":
        msg_a = (
            f"🎉 *File registered!* Ref. *{ref}*\n\n"
            f"👤 {name}\n"
            f"✈️ {d.get('flight_number','?')} — {d.get('airline','?')}{route_str}\n"
            f"📅 {d.get('flight_date','?')} — {incident}\n"
            f"💵 *Target: {net} € net*\n\n"
            f"Last step: sign your mandate in *2 minutes*."
        )
        msg_b = (
            f"✅ *File {ref}*\n\n"
            f"Sign your *representation mandate* (readable before signing).\n"
            f"*No bank details* asked at this step.\n\n"
            f"👉 {mandat_url}\n\n"
            f"Without signature we cannot act on your behalf.\n\n"
            f"_Robin des Airs team_ 🏹"
        )
    else:
        msg_a = (
            f"🎉 *Dossier enregistré !* Réf. *{ref}*\n\n"
            f"👤 {name}\n"
            f"✈️ {d.get('flight_number','?')} — {d.get('airline','?')}{route_str}\n"
            f"📅 {d.get('flight_date','?')} — {incident}\n"
            f"💵 *Objectif : {net} € nets*\n\n"
            f"Dernière étape : signez le mandat en *2 minutes*."
        )
        msg_b = (
            f"✅ *Dossier {ref}*\n\n"
            f"Signez votre *mandat de représentation* (lisible avant signature).\n"
            f"*Aucune information bancaire* demandée à cette étape.\n\n"
            f"👉 {mandat_url}\n\n"
            f"Sans signature nous ne pouvons pas agir en votre nom.\n\n"
            f"_L'équipe Robin des Airs_ 🏹"
        )

    send_whatsapp_text(phone, msg_a)
    time.sleep(3)
    send_whatsapp_text(phone, msg_b)
    conv["current_step"] = "completed"


# ============================================
# TRAITEMENT BOUTONS / LISTES
# ============================================

def process_button_reply(phone, button_id, button_title, conv):
    print(f"[BTN] {button_id} = {button_title}")
    button_id    = (button_id    or "").strip()
    button_title = (button_title or "").strip().lower()
    lang = conv["data"].get("language", "fr")

    # ── LANGUE ──────────────────────────────────────────────────
    if button_id.startswith("lang_"):
        chosen = button_id.replace("lang_", "")
        conv["data"]["preferred_language"] = chosen
        if chosen in ("fr", "en"):
            conv["data"]["language"] = chosen
            conv["current_step"]     = "passengers"
            ask_passengers(phone, chosen)
        else:
            # Langue africaine → expert rappelle + continue en FR par défaut
            expert_msg = EXPERT_MSG.get(chosen, "Un expert vous rappelle directement 🤝\n📱 +33 7 56 86 36 30")
            send_whatsapp_text(phone, expert_msg)
            time.sleep(1)
            # Continuer le flux en français
            conv["current_step"] = "passengers"
            ask_passengers(phone, "fr")
        return

    # ── ZONE (qualification route) ──────────────────────────────
    if button_id == "zone_africa_europe":
        conv["data"]["route_zone"]  = "africa_europe"
        conv["current_step"]        = "incident_type"
        ask_incident_type(phone, lang)
        return

    if button_id == "zone_europe":
        conv["data"]["route_zone"]  = "europe"
        conv["current_step"]        = "incident_type"
        if lang == "en":
            send_whatsapp_text(phone, "🇪🇺 Intra-European flights are covered by CE 261 ✅\nOur speciality is Africa ↔ Europe routes, but let's continue.")
        else:
            send_whatsapp_text(phone, "🇪🇺 Les vols intra-européens sont couverts par le CE 261 ✅\nNotre spécialité c'est les routes Afrique ↔ Europe, mais on continue.")
        time.sleep(1)
        ask_incident_type(phone, lang)
        return

    if button_id == "zone_other":
        if lang == "en":
            send_whatsapp_text(phone, "😔 Unfortunately EU regulation CE 261/2004 does not apply to flights entirely outside Europe.\n\nWe cannot help with this file. Sorry!\n\n_Robin des Airs team_")
        else:
            send_whatsapp_text(phone, "😔 Malheureusement le règlement européen CE 261/2004 ne s'applique pas aux vols entièrement hors Europe.\n\nNous ne pouvons pas traiter ce dossier. Désolé !\n\n_L'équipe Robin des Airs_")
        conv["current_step"] = None
        return

    # ── INCIDENT ────────────────────────────────────────────────
    if button_id in ("inc_delay", "inc_cancel", "inc_denied"):
        mapping = {"inc_delay": "delay", "inc_cancel": "cancel", "inc_denied": "denied"}
        conv["data"]["incident_type"] = mapping[button_id]
        if button_id == "inc_delay":
            conv["current_step"] = "delay_duration"
            ask_delay_duration(phone, lang)
        else:
            conv["data"]["delay_ok"] = True
            conv["current_step"]     = "rgpd"
            send_rgpd_and_ask_passengers(phone, lang)
        return

    # ── DURÉE RETARD ────────────────────────────────────────────
    if button_id == "delay_lt3":
        if lang == "en":
            send_whatsapp_text(phone, "😔 For a delay *under 3 hours* at arrival, EU law CE 261 unfortunately does not provide compensation.\n\nIf you think it was actually longer, type *menu* to restart.\n\n_Robin des Airs team_")
        else:
            send_whatsapp_text(phone, "😔 Pour un retard *inférieur à 3 heures* à l'arrivée, la loi européenne CE 261 ne prévoit malheureusement pas d'indemnisation.\n\nSi vous pensez que le retard était plus long, tapez *menu* pour recommencer.\n\n_L'équipe Robin des Airs_")
        conv["current_step"] = None
        return

    if button_id in ("delay_3plus", "delay_unknown"):
        conv["data"]["delay_ok"] = True
        conv["current_step"]     = "rgpd"
        send_rgpd_and_ask_passengers(phone, lang)
        return

    # ── PASSAGERS ───────────────────────────────────────────────
    if button_id.startswith("pax_"):
        if button_id == "pax_more":
            if lang == "en":
                send_whatsapp_text(phone, "🙏 For groups of 6+, an expert will call you directly.\n\n📱 +33 7 56 86 36 30\n\nOr fill in: 👉 robindesairs.eu/depot-express")
            else:
                send_whatsapp_text(phone, "🙏 Pour les groupes de 6+, un expert vous rappelle directement.\n\n📱 +33 7 56 86 36 30\n\nOu remplissez : 👉 robindesairs.eu/depot-express")
            conv["current_step"] = None
            return
        conv["data"]["passengers"]        = int(button_id.split("_")[1])
        conv["data"]["current_pax_index"] = 0
        conv["data"]["passenger_names"]   = []
        # Envoyer motivation puis demander document
        send_motivation(phone, conv)
        conv["current_step"] = "document"
        ask_document(phone, lang)
        return

    # ── CONFIRMATION PASSAGER ────────────────────────────────────
    if button_id == "pax_confirm_yes":
        idx = conv["data"].get("current_pax_index", 0)
        idx += 1
        conv["data"]["current_pax_index"] = idx
        conv["current_step"] = "passenger_collect"
        ask_next_passenger(phone, conv)
        return

    if button_id == "pax_confirm_no":
        # Redemander le même passager
        conv["current_step"] = "passenger_collect"
        lang = conv["data"]["language"]
        idx  = conv["data"].get("current_pax_index", 0)
        num  = idx + 1
        if lang == "en":
            send_whatsapp_text(phone, f"✍️ Passenger {num} — Please type the correct first name and last name:")
        else:
            send_whatsapp_text(phone, f"✍️ Passager {num} — Tapez le prénom et nom corrects :")
        return

    # ── CONFIRMATION NUMÉRO DE VOL ───────────────────────────────
    if button_id == "fn_confirm_yes":
        conv["current_step"] = "flight_date"
        ask_flight_date(phone, conv)
        return

    if button_id == "fn_confirm_no":
        conv["current_step"] = "flight_number"
        if lang == "en":
            send_whatsapp_text(phone, "✍️ Please type the correct flight number:")
        else:
            send_whatsapp_text(phone, "✍️ Tapez le numéro de vol correct :")
        return

    # ── CONFIRMATION DATE ────────────────────────────────────────
    if button_id == "date_confirm_yes":
        # Vérifier si vol trop ancien (> 5 ans)
        date_str = conv["data"].get("flight_date", "")
        year_match = re.search(r'\b(20\d{2})\b', date_str)
        if year_match:
            year = int(year_match.group(1))
            if datetime.now().year - year > 5:
                if lang == "en":
                    send_whatsapp_text(phone, "😔 Sorry, EU law allows claims up to *5 years* back. Your flight is unfortunately too old.\n\n_Robin des Airs team_")
                else:
                    send_whatsapp_text(phone, "😔 Désolé, la rétroactivité est limitée à *5 ans*. Votre vol est malheureusement trop ancien.\n\n_L'équipe Robin des Airs_")
                conv["current_step"] = None
                return
        conv["current_step"] = "flight_type"
        ask_flight_type(phone, conv)
        return

    if button_id == "date_confirm_no":
        conv["current_step"] = "flight_date"
        if lang == "en":
            send_whatsapp_text(phone, "✍️ Please type the correct date (eg: 15/03/2023):")
        else:
            send_whatsapp_text(phone, "✍️ Tapez la date correcte (ex : 15/03/2023) :")
        return

    # ── TYPE VOL ─────────────────────────────────────────────────
    if button_id in ("type_direct", "type_connection"):
        conv["data"]["flight_type"] = "direct" if button_id == "type_direct" else "connection"
        conv["current_step"]        = "minor_check"
        ask_minors(phone, conv)
        return

    # ── MINEURS ──────────────────────────────────────────────────
    if button_id == "minor_no":
        conv["data"]["has_minors"]   = False
        conv["data"]["minors_count"] = 0
        conv["current_step"]         = "recap"
        show_recap(phone, conv)
        return

    if button_id == "minor_self":
        if lang == "en":
            send_whatsapp_text(phone, "👶 For a minor travelling alone, a parent must sign the mandate.\n\n📱 An expert will call you: +33 7 56 86 36 30")
        else:
            send_whatsapp_text(phone, "👶 Pour un mineur seul, un parent doit signer le mandat.\n\n📱 Un expert vous rappelle : +33 7 56 86 36 30")
        return

    if button_id == "minor_yes":
        conv["data"]["has_minors"] = True
        conv["current_step"]       = "recap"
        show_recap(phone, conv)
        return

    # ── RÉCAP ────────────────────────────────────────────────────
    if button_id == "recap_ok":
        conv["current_step"] = "summary"
        show_summary_and_mandat(phone, conv)
        return

    if button_id == "recap_modify":
        conv["current_step"] = "recap_modify"
        ask_what_to_modify(phone, lang)
        return

    # ── MENU MODIFICATION ────────────────────────────────────────
    if button_id == "mod_names":
        conv["data"]["passenger_names"]   = []
        conv["data"]["current_pax_index"] = 0
        conv["current_step"]              = "passenger_collect"
        ask_next_passenger(phone, conv)
        return

    if button_id == "mod_flight":
        conv["current_step"] = "flight_number"
        ask_flight_number(phone, conv)
        return

    if button_id == "mod_date":
        conv["current_step"] = "flight_date"
        ask_flight_date(phone, conv)
        return

    if button_id == "mod_incident":
        conv["current_step"] = "incident_type"
        ask_incident_type(phone, lang)
        return

    if button_id == "mod_route":
        conv["current_step"] = "route_input"
        if lang == "en":
            send_whatsapp_text(phone, "🗺️ Type your route:\n_(eg: Paris CDG → Dakar DSS)_")
        else:
            send_whatsapp_text(phone, "🗺️ Tapez votre trajet :\n_(ex : Paris CDG → Dakar DSS)_")
        return


# ============================================
# WEBHOOK PRINCIPAL
# ============================================

@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        data = request.json
        if not data:
            return jsonify({"status": "no data"}), 200

        # Debug minimal
        try:
            print("[WEBHOOK] IN POST preview=", json.dumps(data, ensure_ascii=False)[:300])
        except Exception:
            pass

        phone = data.get("waId") or data.get("from") or data.get("phone")
        if not phone:
            return jsonify({"status": "no phone"}), 200
        if data.get("owner") is True:
            return jsonify({"status": "ignored own"}), 200

        conv = get_or_create_conversation(phone)
        lang = conv["data"].get("language", "fr")

        # ── BOUTONS / LISTES ────────────────────────────────────
        button_reply = (
            data.get("buttonReply")
            or data.get("interactiveButtonReply")
            or (data.get("interactive") or {}).get("button_reply")
            or data.get("button_reply")
        )
        list_reply = (
            data.get("listReply")
            or data.get("interactiveListReply")
            or (data.get("interactive") or {}).get("list_reply")
            or data.get("list_reply")
        )

        if button_reply:
            btn_id    = button_reply.get("id") or button_reply.get("buttonId") or button_reply.get("payload") or ""
            btn_title = button_reply.get("title") or button_reply.get("text") or ""
            if is_duplicate_event(phone, data, f"button|{btn_id}|{btn_title}"):
                return jsonify({"status": "duplicate"}), 200
            process_button_reply(phone, btn_id, btn_title, conv)
            return jsonify({"status": "ok"}), 200

        if list_reply:
            row_id    = list_reply.get("id") or list_reply.get("rowId") or list_reply.get("payload") or ""
            row_title = list_reply.get("title") or list_reply.get("text") or ""
            if is_duplicate_event(phone, data, f"list|{row_id}|{row_title}"):
                return jsonify({"status": "duplicate"}), 200
            process_button_reply(phone, row_id, row_title, conv)
            return jsonify({"status": "ok"}), 200

        # ── MESSAGE TEXTE OU IMAGE ───────────────────────────────
        message_type = data.get("type", "text")
        image_data   = None
        message_text = ""

        if message_type == "image" or "image" in data:
            print(f"[IMAGE] reçue de {phone}")
            media_url = data.get("data") or data.get("mediaUrl")
            if media_url:
                try:
                    r = requests.get(media_url, headers={"Authorization": f"Bearer {WATI_API_TOKEN}"}, timeout=30)
                    if r.status_code == 200:
                        image_data = base64.b64encode(r.content).decode("utf-8")
                except Exception as e:
                    print(f"[IMAGE] erreur download: {e}")
            message_text = data.get("caption", "") or ""
        else:
            if "text" in data:
                message_text = data["text"].get("body","") if isinstance(data["text"], dict) else str(data["text"])
            elif "body" in data:
                message_text = str(data["body"])

        if not message_text and not image_data:
            return jsonify({"status": "ignored empty"}), 200

        payload_sig = f"text|{message_text.strip().lower()}|img:{bool(image_data)}"
        if is_duplicate_event(phone, data, payload_sig):
            return jsonify({"status": "duplicate"}), 200

        print(f"[MSG] from={phone} step={conv.get('current_step')} text={message_text[:50]!r} img={bool(image_data)}")

        # Détecter langue au 1er message
        if message_text:
            conv["data"]["language"] = detect_language(message_text)
            lang = conv["data"]["language"]

        current_step = conv.get("current_step")
        txt_lower    = message_text.strip().lower()

        # ── RESET / MENU ─────────────────────────────────────────
        if txt_lower in ("menu", "restart", "recommencer", "reset", "/reset", "start"):
            if phone in conversations:
                del conversations[phone]
            conv = get_or_create_conversation(phone)
            conv["data"]["language"] = lang
            conv["ref_dossier"]      = generate_ref_dossier(phone)
            conv["current_step"]     = "route_qualify"
            _send_welcome_and_qualify(phone, lang)
            return jsonify({"status": "restarted"}), 200

        # ── SCAN DOCUMENT (image envoyée) ────────────────────────
        if image_data and current_step in (None, "document", "flight_number"):
            print(f"[SCAN] document pour {phone}")
            extracted_json = call_openai(
                phone,
                'Extract from this travel document and reply ONLY with valid JSON: '
                '{"flight_number":"...","date":"DD/MM/YYYY","passenger_name":"...","airline":"...","origin":"...","destination":"..."}',
                image_data
            )
            if extracted_json:
                try:
                    match = re.search(r'\{[^{}]+\}', extracted_json, re.DOTALL)
                    if match:
                        info = json.loads(match.group())
                        fn   = info.get("flight_number","").strip().upper()
                        if fn:
                            conv["data"]["flight_number"] = fn
                            guessed = guess_airline(fn)
                            if guessed: conv["data"]["airline"] = guessed
                        if info.get("date"):       conv["data"]["flight_date"]    = info["date"]
                        if info.get("airline"):    conv["data"]["airline"]         = info["airline"]
                        if info.get("origin") and info.get("destination"):
                            conv["data"]["route"] = f"{info['origin']} → {info['destination']}"
                        if info.get("passenger_name"):
                            conv["data"]["passenger_names"] = [info["passenger_name"]]

                        # Aller-retour ? (2 trajets détectés)
                        if info.get("return_flight_number") or info.get("return_date"):
                            conv["data"]["boarding_pass_confirmed"] = True
                            if lang == "en":
                                body = (
                                    f"🔄 Your booking has *2 trips*:\n\n"
                                    f"1️⃣ *{info.get('origin','?')} → {info.get('destination','?')}* "
                                    f"({info.get('date','?')}) — {fn}\n"
                                    f"2️⃣ *{info.get('destination','?')} → {info.get('origin','?')}* "
                                    f"({info.get('return_date','?')})\n\n"
                                    f"Which trip are you claiming for?"
                                )
                                buttons = [
                                    {"id": "trip_outbound", "title": f"1️⃣ {info.get('origin','?')} → {info.get('destination','?')}"},
                                    {"id": "trip_return",   "title": f"2️⃣ {info.get('destination','?')} → {info.get('origin','?')}"},
                                    {"id": "trip_both",     "title": "🔄 Both trips"},
                                ]
                            else:
                                body = (
                                    f"🔄 Votre réservation contient *2 trajets* :\n\n"
                                    f"1️⃣ *{info.get('origin','?')} → {info.get('destination','?')}* "
                                    f"({info.get('date','?')}) — {fn}\n"
                                    f"2️⃣ *{info.get('destination','?')} → {info.get('origin','?')}* "
                                    f"({info.get('return_date','?')})\n\n"
                                    f"Pour quel trajet réclamez-vous ?"
                                )
                                buttons = [
                                    {"id": "trip_outbound", "title": f"1️⃣ {info.get('origin','?')} → {info.get('destination','?')}"},
                                    {"id": "trip_return",   "title": f"2️⃣ {info.get('destination','?')} → {info.get('origin','?')}"},
                                    {"id": "trip_both",     "title": "🔄 Les deux trajets"},
                                ]
                            send_whatsapp_buttons(phone, body, buttons)
                            conv["current_step"] = "trip_select"
                            return jsonify({"status": "ok"}), 200

                        # Confirmer les infos lues
                        airline_display = conv["data"].get("airline","?")
                        route_display   = conv["data"].get("route","")
                        if lang == "en":
                            confirm = (
                                f"✅ *Document read!*\n\n"
                                f"✈️ Flight: *{fn or '?'}* — {airline_display}\n"
                                f"📅 Date: *{conv['data'].get('flight_date','?')}*\n"
                                f"👤 Passenger: *{info.get('passenger_name','?')}*\n"
                                + (f"🗺️ Route: *{route_display}*\n" if route_display else "") +
                                f"\nIs this correct?"
                            )
                        else:
                            confirm = (
                                f"✅ *Document lu !*\n\n"
                                f"✈️ Vol : *{fn or '?'}* — {airline_display}\n"
                                f"📅 Date : *{conv['data'].get('flight_date','?')}*\n"
                                f"👤 Passager : *{info.get('passenger_name','?')}*\n"
                                + (f"🗺️ Trajet : *{route_display}*\n" if route_display else "") +
                                f"\nC'est correct ?"
                            )
                        buttons = [
                            {"id": "doc_confirm_yes", "title": "✅ Oui" if lang=="fr" else "✅ Yes"},
                            {"id": "doc_confirm_no",  "title": "✏️ Corriger" if lang=="fr" else "✏️ Correct it"},
                        ]
                        send_whatsapp_buttons(phone, confirm, buttons)
                        conv["current_step"] = "doc_confirm"
                        return jsonify({"status": "ok"}), 200
                except Exception as e:
                    print(f"[SCAN] erreur parsing: {e}")

            # Scan échoué
            if lang == "en":
                send_whatsapp_text(phone, "📸 I couldn't read the document clearly.\n\nLet's continue with questions 👇")
            else:
                send_whatsapp_text(phone, "📸 Je n'ai pas pu lire le document clairement.\n\nOn continue avec les questions 👇")
            conv["current_step"] = "passenger_collect"
            conv["data"]["current_pax_index"] = 0
            ask_next_passenger(phone, conv)
            return jsonify({"status": "ok"}), 200

        # ── CONFIRMATION DOCUMENT ────────────────────────────────
        if current_step == "doc_confirm":
            if txt_lower in ("oui","yes","ok","correct","c'est bon","👍","yep"):
                conv["data"]["boarding_pass_confirmed"] = True
                # Noms déjà récupérés → aller aux passagers restants ou flight_type
                if conv["data"].get("passenger_names"):
                    # Vérifier si on a besoin de plus de noms (pax > 1)
                    pax = conv["data"].get("passengers", 1)
                    if len(conv["data"]["passenger_names"]) < pax:
                        conv["data"]["current_pax_index"] = len(conv["data"]["passenger_names"])
                        conv["current_step"] = "passenger_collect"
                        ask_next_passenger(phone, conv)
                    else:
                        conv["current_step"] = "flight_type"
                        ask_flight_type(phone, conv)
                else:
                    conv["data"]["current_pax_index"] = 0
                    conv["current_step"] = "passenger_collect"
                    ask_next_passenger(phone, conv)
            else:
                if lang == "en":
                    send_whatsapp_text(phone, "✍️ What would you like to correct?\nType the correct info and I'll update it.")
                else:
                    send_whatsapp_text(phone, "✍️ Qu'est-ce que vous voulez corriger ?\nTapez l'info correcte et je la mets à jour.")
                conv["current_step"] = "doc_correction"
            return jsonify({"status": "ok"}), 200

        # ── CORRECTION DOCUMENT ──────────────────────────────────
        if current_step == "doc_correction":
            # Tenter de détecter ce qui est corrigé
            fn_match = re.search(r'\b([A-Z]{2}\d{2,4})\b', message_text.upper())
            if fn_match:
                fn = fn_match.group(1)
                conv["data"]["flight_number"] = fn
                guessed = guess_airline(fn)
                if guessed: conv["data"]["airline"] = guessed
            # Détecter date
            date_match = re.search(r'\b(\d{1,2})[/\-\. ](\d{1,2})[/\-\. ](\d{4})\b', message_text)
            if date_match:
                conv["data"]["flight_date"] = f"{date_match.group(1)}/{date_match.group(2)}/{date_match.group(3)}"
            if lang == "en":
                send_whatsapp_text(phone, "✅ Updated! Let's continue.")
            else:
                send_whatsapp_text(phone, "✅ Mis à jour ! On continue.")
            conv["data"]["boarding_pass_confirmed"] = True
            conv["data"]["current_pax_index"]       = len(conv["data"].get("passenger_names") or [])
            conv["current_step"] = "passenger_collect"
            ask_next_passenger(phone, conv)
            return jsonify({"status": "ok"}), 200

        # ── SÉLECTION TRAJET (aller-retour) ──────────────────────
        if current_step == "trip_select" or button_id in ("trip_outbound","trip_return","trip_both"):
            if button_id == "trip_return":
                # Inverser origine/destination
                rt = conv["data"].get("route","")
                if "→" in rt:
                    parts = rt.split("→")
                    conv["data"]["route"] = f"{parts[1].strip()} → {parts[0].strip()}"
            # trip_both ou trip_outbound → garder tel quel
            conv["data"]["boarding_pass_confirmed"] = True
            conv["data"]["current_pax_index"]       = len(conv["data"].get("passenger_names") or [])
            conv["current_step"] = "passenger_collect"
            ask_next_passenger(phone, conv)
            return jsonify({"status": "ok"}), 200

        # ── COLLECTE PASSAGER UN PAR UN ──────────────────────────
        if current_step == "passenger_collect":
            name = message_text.strip()
            if len(name) >= 2:
                conv["data"]["_temp_pax_name"] = name
                conv["current_step"]           = "passenger_confirm"
                confirm_passenger(phone, conv, name)
            else:
                if lang == "en":
                    send_whatsapp_text(phone, "✍️ Please type the first name and last name (eg: Jean Dupont):")
                else:
                    send_whatsapp_text(phone, "✍️ Tapez le prénom et le nom (ex : Jean Dupont) :")
            return jsonify({"status": "ok"}), 200

        if current_step == "passenger_confirm":
            if txt_lower in ("oui","yes","ok","correct","c'est bon","👍"):
                name = conv["data"].pop("_temp_pax_name", "")
                conv["data"]["passenger_names"].append(name)
                idx = conv["data"].get("current_pax_index", 0) + 1
                conv["data"]["current_pax_index"] = idx
                pax = conv["data"].get("passengers", 1)
                if idx >= pax:
                    # Tous collectés
                    if conv["data"].get("boarding_pass_confirmed") and conv["data"].get("flight_number"):
                        conv["current_step"] = "flight_type"
                        ask_flight_type(phone, conv)
                    else:
                        conv["current_step"] = "flight_number"
                        ask_flight_number(phone, conv)
                else:
                    conv["current_step"] = "passenger_collect"
                    ask_next_passenger(phone, conv)
            else:
                conv["current_step"] = "passenger_collect"
                idx = conv["data"].get("current_pax_index", 0)
                num = idx + 1
                if lang == "en":
                    send_whatsapp_text(phone, f"✍️ Passenger {num} — Type the correct first name and last name:")
                else:
                    send_whatsapp_text(phone, f"✍️ Passager {num} — Tapez le prénom et nom corrects :")
            return jsonify({"status": "ok"}), 200

        # ── SAISIE NUMÉRO DE VOL ─────────────────────────────────
        if current_step == "flight_number":
            fn_match = re.search(r'\b([A-Z]{2,3}\d{1,4})\b', message_text.upper())
            fn = fn_match.group(1) if fn_match else message_text.strip().upper()
            conv["data"]["flight_number"] = fn
            guessed = guess_airline(fn)
            if guessed and not conv["data"].get("airline"):
                conv["data"]["airline"] = guessed
            conv["current_step"] = "flight_number_confirm"
            confirm_flight_number(phone, conv, fn, conv["data"].get("airline"))
            return jsonify({"status": "ok"}), 200

        # ── SAISIE DATE ──────────────────────────────────────────
        if current_step == "flight_date":
            # Accepter formats variés : 15/03/2023 ou 15 mars 2023 ou 2023-03-15
            date_match = (
                re.search(r'\b(\d{1,2})[/\-\. ](\d{1,2})[/\-\. ](\d{4})\b', message_text) or
                re.search(r'\b(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})\b', message_text)
            )
            if date_match:
                grps = date_match.groups()
                if len(grps[0]) == 4:  # YYYY-MM-DD
                    date_str = f"{grps[2]}/{grps[1]}/{grps[0]}"
                else:
                    date_str = f"{grps[0]}/{grps[1]}/{grps[2]}"
            else:
                date_str = message_text.strip()
            conv["data"]["flight_date"] = date_str
            conv["current_step"]        = "flight_date_confirm"
            confirm_flight_date(phone, conv, date_str)
            return jsonify({"status": "ok"}), 200

        # ── SAISIE ROUTE (modification) ──────────────────────────
        if current_step == "route_input":
            conv["data"]["route"]    = message_text.strip()
            conv["current_step"]     = "recap"
            show_recap(phone, conv)
            return jsonify({"status": "ok"}), 200

        # ── MANUEL (option sans photo) ───────────────────────────
        if current_step == "document" and txt_lower in ("manuel","manual","manuellement","manually","✏️"):
            conv["data"]["current_pax_index"] = 0
            conv["current_step"]              = "passenger_collect"
            ask_next_passenger(phone, conv)
            return jsonify({"status": "ok"}), 200

        # ── DÉMARRAGE FLUX ───────────────────────────────────────
        if conv.get("current_step") is None or current_step == "completed":
            conv["ref_dossier"]  = generate_ref_dossier(phone)
            conv["current_step"] = "route_qualify"
            _send_welcome_and_qualify(phone, lang)
            return jsonify({"status": "flow started"}), 200

        # ── RÉPONSE LIBRE GPT ────────────────────────────────────
        response = call_openai(phone, message_text, image_data)
        if not response:
            if lang == "en":
                response = "Hello! 😊 Type *menu* to check your eligibility for flight compensation 👇\n\n👉 robindesairs.eu"
            else:
                response = "Bonjour ! 😊 Tapez *menu* pour vérifier votre éligibilité à une indemnisation ✈️\n\n👉 robindesairs.eu"
        send_whatsapp_text(phone, response)
        return jsonify({"status": "ok"}), 200

    except Exception as e:
        print(f"Erreur webhook: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error"}), 500


def _send_welcome_and_qualify(phone, lang="fr"):
    """Bienvenue + première question de qualification"""
    if lang == "en":
        welcome = (
            "👋 Welcome to *Robin des Airs* 🏹\n\n"
            "✈️ Was your flight delayed or cancelled?\n"
            "You may be entitled to *€600 per person* under EU law CE 261/2004.\n\n"
            "Let's check your eligibility in *2 minutes*. 👇"
        )
    else:
        welcome = (
            "👋 Bienvenue chez *Robin des Airs* 🏹\n\n"
            "✈️ Votre vol a été retardé ou annulé ?\n"
            "Vous avez peut-être droit à *600 € par personne* grâce au règlement européen CE 261/2004.\n\n"
            "Vérifions votre éligibilité en *2 minutes*. 👇"
        )
    send_whatsapp_text(phone, welcome)
    time.sleep(1)
    ask_route_qualify(phone, lang)


# ============================================
# ENDPOINTS UTILITAIRES
# ============================================

@app.route("/test_flow/<phone>", methods=["GET"])
def test_flow(phone):
    conv = get_or_create_conversation(phone)
    conv["ref_dossier"]      = generate_ref_dossier(phone)
    conv["data"]["language"] = "fr"
    conv["current_step"]     = "route_qualify"
    _send_welcome_and_qualify(phone, "fr")
    return jsonify({"status": "started", "phone": phone}), 200

@app.route("/conversations", methods=["GET"])
def list_conversations():
    result = {}
    for phone, conv in conversations.items():
        result[phone] = {"step": conv.get("current_step"), "data": conv["data"], "messages": len(conv["messages"]), "created": conv["created"].isoformat()}
    return jsonify(result), 200

@app.route("/reset/<phone>", methods=["GET"])
def reset(phone):
    conversations.pop(phone, None)
    return jsonify({"status": "reset", "phone": phone}), 200

@app.route("/test", methods=["GET"])
def test():
    return jsonify({"status": "running", "version": "v6 - flux qualifié de A à Z", "active_conversations": len(conversations)}), 200

@app.route("/", methods=["GET"])
def home():
    return "Robin des Airs Bot v6 - Running!", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

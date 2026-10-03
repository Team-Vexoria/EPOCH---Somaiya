"""
whatsapp_bot.py - Meta WhatsApp Cloud API & Twilio Bot for Mohra
Supports:
1. Meta WhatsApp Business Cloud API Webhook (GET & POST /whatsapp/meta and /webhook)
   - Supports Meta Graph API v25.0 (configurable via GRAPH_VERSION)
   - Supports WA_TOKEN, PHONE_NUMBER_ID, APP_SECRET (HMAC-SHA256 verification), VERIFY_TOKEN
   - Supports Text messages, Interactive button replies, and Audio/Voice notes (transcribed via Groq Whisper)
2. Twilio WhatsApp Sandbox / Production Webhook (POST /whatsapp/twilio)
3. Direct JSON Test Endpoint (POST /whatsapp/test)
4. Outbound Test Dispatch (POST /whatsapp/send-message)
5. Health & Status Endpoint (GET /whatsapp/status)

Provides localized agricultural advisory for Nashik APMC Mandis (Onion, Tomato, Soybean)
in Marathi (मराठी), Hindi (हिन्दी), and English.
"""

import os
import re
import hmac
import hashlib
import logging
import urllib.parse
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Request, Response, Query, HTTPException, Header
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Load environment variables explicitly from backend/.env
_env_file = Path(__file__).resolve().parent / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file, override=True)
else:
    load_dotenv(find_dotenv(), override=True)

from villages import (
    resolve_village_from_text,
    VILLAGES,
    village_freight_table,
    freight_cost
)

logger = logging.getLogger("whatsapp_bot")

router = APIRouter(tags=["WhatsApp Bot"])

# ---------------------------------------------------------------------------
# Environment configuration (Supports both standard Meta names and legacy aliases)
# ---------------------------------------------------------------------------
WA_TOKEN             = os.environ.get("WA_TOKEN") or os.environ.get("META_ACCESS_TOKEN", "")
PHONE_NUMBER_ID      = os.environ.get("PHONE_NUMBER_ID") or os.environ.get("META_PHONE_NUMBER_ID", "")
APP_SECRET           = os.environ.get("APP_SECRET") or os.environ.get("META_APP_SECRET", "")
VERIFY_TOKEN         = os.environ.get("VERIFY_TOKEN") or os.environ.get("META_VERIFY_TOKEN", "Mohra_verify_2026")
GRAPH_VERSION        = os.environ.get("GRAPH_VERSION", "v25.0").strip()
if not GRAPH_VERSION.startswith("v"):
    GRAPH_VERSION = f"v{GRAPH_VERSION}"
CHAT_API_URL         = os.environ.get("CHAT_API_URL", "http://localhost:8000/ask")
WA_BUSINESS_NUMBER   = os.environ.get("WA_BUSINESS_NUMBER", PHONE_NUMBER_ID)

# Aliases
META_VERIFY_TOKEN    = VERIFY_TOKEN
META_ACCESS_TOKEN    = WA_TOKEN
META_PHONE_NUMBER_ID = PHONE_NUMBER_ID

# ---------------------------------------------------------------------------
# Per-user session memory (in-memory; replace with Redis for production)
# Remembers: last crop discussed, last quantity mentioned, preferred language, village origin
# ---------------------------------------------------------------------------
_user_sessions: Dict[str, Dict[str, Any]] = {}

def get_session(phone: str) -> Dict[str, Any]:
    clean_phone = re.sub(r"[^\d]", "", phone) or "test"
    if clean_phone not in _user_sessions:
        _user_sessions[clean_phone] = {"crop": "onion", "quantity": 20, "lang": None, "village": None}
    return _user_sessions[clean_phone]

def update_session(phone: str, **kwargs):
    sess = get_session(phone)
    sess.update(kwargs)


# ---------------------------------------------------------------------------
# Core Advisory Knowledge Base — Nashik District
# ---------------------------------------------------------------------------
MANDI_DATA = {
    "onion": {
        "crop_name_mr": "कांदा",
        "crop_name_hi": "प्याज",
        "crop_name_en": "Onion",
        "decision_mr": "१० दिवस माल थांबवा (HOLD 10 DAYS)",
        "decision_hi": "१० दिन माल रोकें (HOLD 10 DAYS)",
        "decision_en": "HOLD FOR 10 DAYS",
        "best_mandi_mr": "लासलगाव बाजार समिती (Lasalgaon APMC)",
        "best_mandi_hi": "लासलगांव मंडी (Lasalgaon APMC)",
        "best_mandi_en": "Lasalgaon APMC",
        "gain": 300,
        "modal_price": 4000,
        "reason_mr": "दक्षिणेकडील राज्यांतून (तामिळनाडू व कर्नाटक) मागणी वाढल्याने आणि लासलगाव बाजारात आवक १४% कमी झाल्याने दर सुधारत आहेत. सध्याचा भाव ₹४०/किलो आहे.",
        "reason_hi": "दक्षिण भारत से मांग बढ़ने और लासलगांव में आवक १४% घटने के कारण भाव में तेजी है। वर्तमान मूल्य ₹40/kg।",
        "reason_en": "Strong demand from Southern states; Lasalgaon arrivals down 14%. Current modal price ₹40/kg (₹4,000/quintal) as of Oct 3, 2026.",
        "mandis": [
            {"name": "लासलगाव (Lasalgaon)",  "distance": "18 km", "price": "₹4,000", "freight": "-₹35", "loss": "-₹25", "net": "₹3,940"},
            {"name": "पिंपळगाव (Pimpalgaon)", "distance": "24 km", "price": "₹3,850", "freight": "-₹42", "loss": "-₹25", "net": "₹3,783"},
            {"name": "येवला (Yeola)",          "distance": "42 km", "price": "₹3,700", "freight": "-₹65", "loss": "-₹25", "net": "₹3,610"},
        ],
        "storage_tip_mr": "💡 चाळ सल्ला: कांदा हवादार चाळीत ठेवा. आठवड्याला १.२% वजनातील नैसर्गिक घट भावातील वाढीपेक्षा खूप कमी आहे.",
        "storage_tip_hi": "💡 भंडारण सलाह: प्याज को हवादार चाळ में रखें। १.२% प्राकृतिक नमी कमी भाव बढ़त से आसानी से पूरी होगी।",
        "storage_tip_en": "💡 Storage Tip: Keep in aerated chawl. 1.2% weekly shrinkage is easily offset by projected price gains.",
    },
    "tomato": {
        "crop_name_mr": "टोमॅटो",
        "crop_name_hi": "टमाटर",
        "crop_name_en": "Tomato",
        "decision_mr": "आजच विक्री करा (SELL IMMEDIATELY)",
        "decision_hi": "तुरंत बेचें (SELL IMMEDIATELY)",
        "decision_en": "SELL IMMEDIATELY TODAY",
        "best_mandi_mr": "पिंपळगाव बसवंत बाजार समिती (Pimpalgaon Baswant)",
        "best_mandi_hi": "पिंपलगांव बसवंत मंडी (Pimpalgaon Baswant)",
        "best_mandi_en": "Pimpalgaon Baswant APMC",
        "gain": 200,
        "modal_price": 3500,
        "reason_mr": "टोमॅटो अतिनाशवंत पीक आहे. सध्याचा भाव ₹३५/किलो (₹३,५००/क्विंटल) आहे. दमट वातावरणामुळे क्रेटमध्ये २०% पर्यंत सड होण्याची जोखीम आहे.",
        "reason_hi": "टमाटर का वर्तमान मूल्य ₹35/kg (₹3,500/क्विंटल) है। मौसम की नमी के कारण क्रेट में फल सड़ने का भारी खतरा है।",
        "reason_en": "Tomato current price ₹35/kg (₹3,500/quintal) as of Oct 3, 2026. High perishability — sell immediately to lock in peak price.",
        "mandis": [
            {"name": "पिंपळगाव (Pimpalgaon)",   "distance": "16 km", "price": "₹3,500", "freight": "-₹30", "loss": "-₹30", "net": "₹3,440"},
            {"name": "नाशिक पंचवटी (Nashik)",   "distance": "28 km", "price": "₹3,350", "freight": "-₹45", "loss": "-₹35", "net": "₹3,270"},
            {"name": "लासलगाव (Lasalgaon)",      "distance": "22 km", "price": "₹3,200", "freight": "-₹38", "loss": "-₹42", "net": "₹3,120"},
        ],
        "storage_tip_mr": "⚠️ सावधान: २ दिवसांपेक्षा जास्त माल थांबवल्यास क्रेट खराब होऊन नुकसान वाढेल. आजच पिंपळगाव बाजारात न्या.",
        "storage_tip_hi": "⚠️ चेतावनी: २ दिन से ज्यादा माल रोकने पर टमाटर सड़ने लगेंगे। आज ही पिंपलगांव मंडी ले जाएं।",
        "storage_tip_en": "⚠️ Warning: Crates soften and spoil rapidly after 48h. Dispatch to Pimpalgaon today to lock in ₹35/kg price.",
    },
    "soybean": {
        "crop_name_mr": "सोयाबीन",
        "crop_name_hi": "सोयाबीन",
        "crop_name_en": "Soybean",
        "decision_mr": "१५ दिवस माल थांबवा (HOLD 15 DAYS)",
        "decision_hi": "१५ दिन माल रोकें (HOLD 15 DAYS)",
        "decision_en": "HOLD FOR 15 DAYS",
        "best_mandi_mr": "मालेगाव बाजार समिती (Malegaon APMC)",
        "best_mandi_hi": "मालेगांव मंडी (Malegaon APMC)",
        "best_mandi_en": "Malegaon APMC",
        "gain": 200,
        "modal_price": 5708,
        "reason_mr": "मालेगाव परिसरातील तेलगिरण्यांची मागणी स्थिर असून सध्याचा भाव ₹५,७०८/क्विंटल (MSP) आहे. कोरड्या गोदामात साठवणुकीचे नुकसान नगण्य (०.१%) आहे.",
        "reason_hi": "मालेगांव में खाद्य तेल मिलों की स्थिर खरीद है। वर्तमान MSP मूल्य ₹5,708/क्विंटल। सूखे गोदाम में सोयाबीन सुरक्षित रहता है।",
        "reason_en": "Soybean MSP 2026-27 fixed at ₹5,708/quintal (₹57/kg). Malegaon oil mills actively buying. Hold 15 days for better realization.",
        "mandis": [
            {"name": "मालेगाव (Malegaon)", "distance": "35 km", "price": "₹5,708", "freight": "-₹55", "loss": "-₹5", "net": "₹5,648"},
            {"name": "येवला (Yeola)",       "distance": "28 km", "price": "₹5,600", "freight": "-₹45", "loss": "-₹5", "net": "₹5,550"},
            {"name": "सटाणा (Satana)",      "distance": "42 km", "price": "₹5,500", "freight": "-₹65", "loss": "-₹5", "net": "₹5,430"},
        ],
        "storage_tip_mr": "💡 ओलावा सल्ला: बाजारात नेण्यापूर्वी दाण्यातील ओलावा १०% पेक्षा कमी असावा, जेणेकरून भाव कपात होणार नाही.",
        "storage_tip_hi": "💡 नमी सलाह: मंडी ले जाने से पहले दाने में नमी १०% से कम रखें ताकि कोई कटौती न हो।",
        "storage_tip_en": "💡 Moisture Standard: Ensure moisture is below 10% to prevent dockage penalties at auction.",
    },
}

CROP_NUMBER_MAP = {"1": "onion", "2": "tomato", "3": "soybean",
                   "१": "onion", "२": "tomato", "३": "soybean"}

# ---------------------------------------------------------------------------
# Language / crop / quantity detection
# ---------------------------------------------------------------------------
def detect_language(text: str) -> str:
    marathi = ["कांदा","कांदे","टोमॅटो","सोयाबीन","कुठे","विकू","केव्हा","दर","भाव","लासलगाव","पिंपळगाव","नमस्कार","मला","आहे","शेतकरी"]
    hindi   = ["प्याज","टमाटर","कहाँ","बेचें","बेचना","कब","मंडी","नमस्ते","रोकें","मुझे","है","किसान"]
    for kw in marathi:
        if kw in text:
            return "mr"
    for kw in hindi:
        if kw in text:
            return "hi"
    return "en"

def detect_crop(text: str) -> Optional[str]:
    lower = text.strip().lower()
    if lower in CROP_NUMBER_MAP:
        return CROP_NUMBER_MAP[lower]
    if any(w in lower for w in ["onion","कांदा","कांदे","प्याज","lasalgaon","लासलगाव"]):
        return "onion"
    if any(w in lower for w in ["tomato","टोमॅटो","टमाटर","pimpalgaon","पिंपळगाव"]):
        return "tomato"
    if any(w in lower for w in ["soybean","सोयाबीन","malegaon","मालेगाव"]):
        return "soybean"
    return None

def extract_quantity(text: str) -> Optional[int]:
    match = re.search(r'(\d+)\s*(?:quintal|qtl|क्विंटल|बोरी|टन|ton)', text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None

def is_greeting(text: str) -> bool:
    greetings = ["hello","hi","helo","नमस्कार","नमस्ते","jai","जय","start","help","सुरुवात","शुरू","menu"]
    lower = text.strip().lower()
    return lower in greetings or any(lower.startswith(g) for g in greetings)

# ---------------------------------------------------------------------------
# Greeting / onboarding reply
# ---------------------------------------------------------------------------
def generate_greeting(lang: str) -> str:
    if lang == "mr":
        return (
            "🌾 *Mohra कृषी सल्लागार मध्ये आपले स्वागत आहे!*\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "आपल्या पिकाचा सल्ला मिळवण्यासाठी खालीलपैकी एक उत्तर पाठवा:\n\n"
            "• *१* — 🧅 कांदा (Onion)\n"
            "• *२* — 🍅 टोमॅटो (Tomato)\n"
            "• *३* — 🌱 सोयाबीन (Soybean)\n\n"
            "किंवा थेट प्रश्न विचारा: *'मी निफाडचा आहे, कांदा ३० क्विंटल कुठे विकू?'*\n\n"
            "🌐 पूर्ण नकाशा व कॅल्क्युलेटर: https://Mohra.app"
        )
    elif lang == "hi":
        return (
            "🌾 *Mohra कृषि सलाहकार में आपका स्वागत है!*\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "अपनी फसल की सलाह के लिए एक नंबर भेजें:\n\n"
            "• *1* — 🧅 प्याज (Onion)\n"
            "• *2* — 🍅 टमाटर (Tomato)\n"
            "• *3* — 🌱 सोयाबीन (Soybean)\n\n"
            "या सीधे प्रश्न पूछें: *'निफाड से 30 क्विंटल प्याज कहाँ बेचें?'*\n\n"
            "🌐 पूरा मैप और कैलकुलेटर: https://Mohra.app"
        )
    else:
        return (
            "🌾 *Welcome to Mohra Agricultural Advisor!*\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "Reply with a number to get today's APMC mandi advisory:\n\n"
            "• *1* — 🧅 Onion\n"
            "• *2* — 🍅 Tomato\n"
            "• *3* — 🌱 Soybean\n\n"
            "Or ask directly: *'I am from Niphad, where should I sell 30 quintals onion?'*\n\n"
            "🌐 Full map & calculator: https://Mohra.app"
        )

# ---------------------------------------------------------------------------
# Main advisory response generator
# ---------------------------------------------------------------------------
def generate_whatsapp_response(user_text: str, phone: str = "unknown") -> str:
    """
    Generate a structured WhatsApp advisory message.
    Uses per-user session to remember last crop/quantity/language.
    """
    clean_phone = re.sub(r"[^\d]", "", phone) or "test"
    sess = get_session(clean_phone)

    # Detect greeting first
    if is_greeting(user_text):
        lang = detect_language(user_text) or sess.get("lang") or "en"
        update_session(clean_phone, lang=lang)
        return generate_greeting(lang)

    lang = detect_language(user_text)
    if lang != "en" or sess.get("lang") is None:
        update_session(clean_phone, lang=lang)
    lang = sess.get("lang") or lang

    # Detect crop — fall back to session memory if not mentioned
    crop_id = detect_crop(user_text)
    if crop_id:
        update_session(clean_phone, crop=crop_id)
    else:
        crop_id = sess.get("crop", "onion")

    # Detect quantity — fall back to session memory
    qty = extract_quantity(user_text)
    if qty:
        update_session(clean_phone, quantity=qty)
    else:
        qty = sess.get("quantity", 20)

    # Detect village origin from text — fall back to session memory
    v_id = resolve_village_from_text(user_text)
    if v_id:
        update_session(clean_phone, village=v_id)
    else:
        v_id = sess.get("village")

    # For natural language / conversational farmer questions, invoke CRAG pipeline
    is_conversational = len(user_text.split()) > 2 or any(
        kw in user_text.lower() for kw in [
            "कधी", "कुठे", "केव्हा", "भाव", "दर", "विकू", "ठेवू", "नफा",
            "कब", "कहाँ", "भाव", "बेचें", "रुकें", "फायदा",
            "when", "where", "sell", "hold", "price", "rate", "gain", "profit"
        ]
    )

    if is_conversational:
        try:
            from crag_app import ask_crag
            lang_prompt = {
                "mr": "कृपया उत्तर सोप्या मराठीत द्या. बुलेट पॉईंट्स वापरा.",
                "hi": "कृपया उत्तर सरल हिन्दी में दें। बुलेट पॉइंट्स का प्रयोग करें।",
                "en": "Please provide practical farmer advice in English with bullet points."
            }.get(lang, "")
            origin_str = f", Farmer Village Origin: {VILLAGES[v_id]['name']}" if (v_id and v_id in VILLAGES) else ""
            full_prompt = f"{user_text} (Crop: {crop_id}, Quantity: {qty} quintals{origin_str}, District: Nashik. {lang_prompt})"
            res = ask_crag(full_prompt, village=v_id)
            if res and res.get("answer"):
                ans = res["answer"].strip()
                footer = {
                    "mr": "\n\n━━━━━━━━━━━━━━━━━━━━\n📍 *इतर पिकांसाठी उत्तर पाठवा:*\n• *१* - कांदा  • *२* - टोमॅटो  • *३* - सोयाबीन\n🌐 *थेट नकाशा व कॅल्क्युलेटर:* https://Mohra.app",
                    "hi": "\n\n━━━━━━━━━━━━━━━━━━━━\n📍 *अन्य फसलों के लिए रिप्लाई करें:*\n• *1* - प्याज  • *2* - टमाटर  • *3* - सोयाबीन\n🌐 *वेबसाइट और मंडी मैप:* https://Mohra.app",
                    "en": "\n\n━━━━━━━━━━━━━━━━━━━━\n📍 *Reply to switch crops:*\n• *1* - Onion  • *2* - Tomato  • *3* - Soybean\n🌐 *Map & Tools:* https://Mohra.app"
                }.get(lang, "")
                return f"🌾 *Mohra AI कृषी सल्लागार*\n━━━━━━━━━━━━━━━━━━━━\n{ans}{footer}"
        except Exception as e:
            logger.warning("Live Groq RAG call failed for WhatsApp, falling back to static template: %s", e)

    data = MANDI_DATA[crop_id]

    # Calculate dynamic freight from farmer's village origin if known
    mandi_records = list(data["mandis"])
    village_banner_mr = f"📍 *शेतकऱ्याचे गाव:* {VILLAGES[v_id]['name']} ({VILLAGES[v_id].get('name_mr', '')})\n" if (v_id and v_id in VILLAGES) else ""
    village_banner_hi = f"📍 *किसान का गांव:* {VILLAGES[v_id]['name']}\n" if (v_id and v_id in VILLAGES) else ""
    village_banner_en = f"📍 *Farmer Origin:* {VILLAGES[v_id]['name']} (Taluka {VILLAGES[v_id]['taluka']})\n" if (v_id and v_id in VILLAGES) else ""

    if v_id and v_id in VILLAGES:
        v_table = {r["mandi_id"]: r for r in village_freight_table(v_id)}
        base_prices = {"lasalgaon": 2460, "pimpalgaon": 2390, "yeola": 2310, "nashik": 2350, "dindori": 2280, "malegaon": 4920, "manmad": 4850}
        spoilage_loss = 25 if crop_id == "onion" else (80 if crop_id == "tomato" else 15)
        dynamic_mandis = []
        for m in data["mandis"]:
            mid = "lasalgaon" if "lasalgaon" in m["name"].lower() else (
                "pimpalgaon" if "pimpalgaon" in m["name"].lower() else (
                    "yeola" if "yeola" in m["name"].lower() else (
                        "nashik" if "nashik" in m["name"].lower() else "malegaon"
                    )
                )
            )
            v_info = v_table.get(mid)
            if v_info:
                p = base_prices.get(mid, 2400)
                fr = v_info["freight_per_qtl"]
                net = p - fr - spoilage_loss
                dynamic_mandis.append({
                    "name": m["name"],
                    "distance": f"{v_info['distance_km']} km",
                    "price": f"₹{p:,}",
                    "freight": f"-₹{fr}",
                    "net": f"₹{net:,}"
                })
        if dynamic_mandis:
            mandi_records = dynamic_mandis

    def _net_num(m):
        return int(m["net"].replace("₹", "").replace(",", ""))

    top_net = _net_num(mandi_records[0])
    total_payout = top_net * qty

    if lang == "mr":
        mandi_lines = "\n".join([
            f"{i+1}️⃣ *{m['name']}* ({m['distance']})\n"
            f"   • भाव: {m['price']} | वाहतूक: {m['freight']}\n"
            f"   • *हातात निव्वळ: {m['net']} / qtl*"
            for i, m in enumerate(mandi_records)
        ])
        return (
            f"🌾 *Mohra कृषी सल्लागार (नाशिक जिल्हा)*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"{village_banner_mr}"
            f"📦 *पीक:* {data['crop_name_mr']} ({qty} क्विंटल)\n"
            f"🏷️ *निर्णय:* *{data['decision_mr']}*\n"
            f"👑 *सर्वोत्तम बाजार:* *{data['best_mandi_mr']}*\n"
            f"💰 *अपेक्षित फायदा:* *+₹{data['gain']} / क्विंटल*\n"
            f"💵 *एकूण हातात रक्कम:* *₹{total_payout:,}* ({qty} क्विंटलसाठी)\n\n"
            f"📊 *बाजार समितीनिहाय निव्वळ नफा तुलना:*\n"
            f"{mandi_lines}\n\n"
            f"🔍 *सल्ला कारण:* {data['reason_mr']}\n\n"
            f"{data['storage_tip_mr']}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📍 *इतर पिकांसाठी उत्तर पाठवा:*\n"
            f"• *१* - कांदा  • *२* - टोमॅटो  • *३* - सोयाबीन\n"
            f"🌐 *थेट नकाशा व कॅल्क्युलेटर:* https://Mohra.app"
        )

    elif lang == "hi":
        mandi_lines = "\n".join([
            f"{i+1}️⃣ *{m['name']}* ({m['distance']})\n"
            f"   • भाव: {m['price']} | ढुलाई: {m['freight']}\n"
            f"   • *हाथ में बचत: {m['net']} / qtl*"
            for i, m in enumerate(mandi_records)
        ])
        return (
            f"🌾 *Mohra कृषि सलाहकार (नासिक जिला)*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"{village_banner_hi}"
            f"📦 *फसल:* {data['crop_name_hi']} ({qty} क्विंटल)\n"
            f"🏷️ *निर्णय:* *{data['decision_hi']}*\n"
            f"👑 *सर्वश्रेष्ठ मंडी:* *{data['best_mandi_hi']}*\n"
            f"💰 *अपेक्षित लाभ:* *+₹{data['gain']} / क्विंटल*\n"
            f"💵 *कुल शुद्ध रकम:* *₹{total_payout:,}* ({qty} क्विंटल हेतु)\n\n"
            f"📊 *मंडी शुद्ध बचत तुलना:*\n"
            f"{mandi_lines}\n\n"
            f"🔍 *सलाह का कारण:* {data['reason_hi']}\n\n"
            f"{data['storage_tip_hi']}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📍 *अन्य फसलों के लिए रिप्लाई करें:*\n"
            f"• *1* - प्याज  • *2* - टमाटर  • *3* - सोयाबीन\n"
            f"🌐 *वेबसाइट और मंडी मैप:* https://Mohra.app"
        )

    else:
        mandi_lines = "\n".join([
            f"{i+1}️⃣ *{m['name']}* ({m['distance']})\n"
            f"   • Price: {m['price']} | Freight: {m['freight']}\n"
            f"   • *Net in Pocket: {m['net']} / qtl*"
            for i, m in enumerate(mandi_records)
        ])
        return (
            f"🌾 *Mohra Advisory (Nashik District)*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"{village_banner_en}"
            f"📦 *Crop:* {data['crop_name_en']} ({qty} Quintals)\n"
            f"🏷️ *Decision:* *{data['decision_en']}*\n"
            f"👑 *Best APMC:* *{data['best_mandi_en']}*\n"
            f"💰 *Advantage:* *+₹{data['gain']} / quintal*\n"
            f"💵 *Estimated Net Cash:* *₹{total_payout:,}* (for {qty} qtl lot)\n\n"
            f"📊 *Net Realized Comparison by Mandi:*\n"
            f"{mandi_lines}\n\n"
            f"🔍 *Reasoning:* {data['reason_en']}\n\n"
            f"{data['storage_tip_en']}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📍 *Reply with number to check other crops:*\n"
            f"• *1* - Onion  • *2* - Tomato  • *3* - Soybean\n"
            f"🌐 *Interactive Map & App:* https://Mohra.app"
        )


# ---------------------------------------------------------------------------
# Meta Graph API Helper Functions
# ---------------------------------------------------------------------------
def verify_meta_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """Validate X-Hub-Signature-256 header with APP_SECRET."""
    if not APP_SECRET:
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected_hash = signature_header.split("sha256=")[1].strip()
    calculated_hash = hmac.new(APP_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(calculated_hash, expected_hash)


async def download_meta_media(media_id: str) -> Optional[bytes]:
    """Download audio/media binary from Meta Cloud API using WA_TOKEN."""
    token = WA_TOKEN or META_ACCESS_TOKEN
    if not token:
        return None
    try:
        import httpx
        url = f"https://graph.facebook.com/{GRAPH_VERSION}/{media_id}"
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            meta_resp = await client.get(url, headers=headers)
            if meta_resp.status_code != 200:
                logger.error("Failed to get media info from Meta: %s", meta_resp.text)
                return None
            media_info = meta_resp.json()
            media_url = media_info.get("url")
            if not media_url:
                return None
            file_resp = await client.get(media_url, headers=headers)
            if file_resp.status_code == 200:
                return file_resp.content
            logger.error("Failed to download media bytes: %s", file_resp.status_code)
            return None
    except Exception as exc:
        logger.error("download_meta_media error: %s", exc)
        return None


async def transcribe_voice_note(audio_bytes: bytes) -> Optional[str]:
    """Transcribe WhatsApp audio note using Groq Whisper."""
    try:
        import httpx
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return None
        files = {"file": ("audio.ogg", audio_bytes, "audio/ogg")}
        data = {"model": "whisper-large-v3", "temperature": "0.0"}
        headers = {"Authorization": f"Bearer {api_key}"}
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers=headers,
                files=files,
                data=data
            )
            if resp.status_code == 200:
                return resp.json().get("text", "").strip()
            logger.error("Groq Whisper error %s: %s", resp.status_code, resp.text)
            return None
    except Exception as exc:
        logger.error("transcribe_voice_note error: %s", exc)
        return None


async def send_meta_reply(to_number: str, reply_text: str) -> int:
    """
    Call Meta WhatsApp Cloud API to deliver a message to the farmer.
    Uses WA_TOKEN, PHONE_NUMBER_ID, and GRAPH_VERSION.
    """
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv(), override=True)
    token = os.environ.get("WA_TOKEN") or os.environ.get("META_ACCESS_TOKEN", "")
    phone_id = os.environ.get("PHONE_NUMBER_ID") or os.environ.get("META_PHONE_NUMBER_ID", "")
    if not token or not phone_id:
        logger.warning("WA_TOKEN or PHONE_NUMBER_ID not configured — reply not sent.")
        return 0

    try:
        import httpx
        url = f"https://graph.facebook.com/{GRAPH_VERSION}/{phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        clean_to = re.sub(r"[^\d]", "", to_number)
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_to,
            "type": "text",
            "text": {"body": reply_text, "preview_url": False},
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code not in (200, 201):
                logger.error("Meta API error %s: %s", resp.status_code, resp.text)
            else:
                logger.info("Meta message successfully sent to %s (status=%s)", clean_to, resp.status_code)
            return resp.status_code
    except Exception as exc:
        logger.error("send_meta_reply failed: %s", exc)
        return -1


# ---------------------------------------------------------------------------
# 1. Twilio WhatsApp Webhook
# ---------------------------------------------------------------------------
@router.post("/whatsapp/twilio")
async def twilio_whatsapp_webhook(request: Request):
    """
    Handles incoming WhatsApp messages from Twilio Sandbox or Production number.
    Returns TwiML XML.
    """
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8", errors="ignore")
    parsed_form = urllib.parse.parse_qs(body_str)

    incoming_text = (parsed_form.get("Body") or ["नमस्कार"])[0].strip()
    from_number   = (parsed_form.get("From") or ["unknown"])[0]

    logger.info("Twilio message from %s: %s", from_number, incoming_text[:80])

    reply_text = generate_whatsapp_response(incoming_text, phone=from_number)

    safe_reply = (reply_text
                  .replace("&", "&amp;")
                  .replace("<", "&lt;")
                  .replace(">", "&gt;"))

    response_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'  <Message>{safe_reply}</Message>\n'
        '</Response>'
    )
    return Response(content=response_xml, media_type="application/xml")


# ---------------------------------------------------------------------------
# 2. Meta WhatsApp Business Cloud API Webhook Handler Core
# ---------------------------------------------------------------------------
async def handle_meta_webhook_verification(
    hub_mode: Optional[str],
    hub_challenge: Optional[str],
    hub_verify_token: Optional[str]
):
    expected_token = VERIFY_TOKEN or META_VERIFY_TOKEN
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        logger.info("Meta webhook verified successfully with token: %s", hub_verify_token)
        return Response(content=hub_challenge or "verified", media_type="text/plain")
    logger.warning("Meta webhook verification failed — expected %s, got %s", expected_token, hub_verify_token)
    raise HTTPException(status_code=403, detail="Invalid verification token")


async def handle_meta_webhook_events(request: Request, x_hub_signature_256: Optional[str] = None):
    body_bytes = await request.body()

    # Validate HMAC signature if APP_SECRET is configured
    if APP_SECRET and x_hub_signature_256:
        if not verify_meta_signature(body_bytes, x_hub_signature_256):
            logger.warning("Invalid Meta webhook signature.")
            raise HTTPException(status_code=403, detail="Signature verification failed")

    try:
        import json
        body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}

        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                # Acknowledge status notifications (delivered, read, sent)
                if "statuses" in value and not value.get("messages"):
                    logger.debug("Received status update: %s", value.get("statuses"))
                    continue

                for msg in value.get("messages", []):
                    msg_type = msg.get("type", "")
                    sender   = msg.get("from", "")
                    user_text = ""

                    if msg_type == "text":
                        user_text = msg.get("text", {}).get("body", "").strip()

                    elif msg_type == "interactive":
                        # Button or list reply
                        interactive = msg.get("interactive", {})
                        i_type = interactive.get("type", "")
                        if i_type == "button_reply":
                            user_text = interactive.get("button_reply", {}).get("title") or interactive.get("button_reply", {}).get("id", "")
                        elif i_type == "list_reply":
                            user_text = interactive.get("list_reply", {}).get("title") or interactive.get("list_reply", {}).get("id", "")

                    elif msg_type == "button":
                        user_text = msg.get("button", {}).get("text", "").strip()

                    elif msg_type in ("audio", "voice"):
                        # Voice note from farmer!
                        media_id = msg.get("audio", {}).get("id") or msg.get("voice", {}).get("id")
                        if media_id:
                            logger.info("Downloading WhatsApp voice note (id=%s) from %s ...", media_id, sender)
                            audio_bytes = await download_meta_media(media_id)
                            if audio_bytes:
                                transcribed = await transcribe_voice_note(audio_bytes)
                                if transcribed:
                                    logger.info("Transcribed voice note from %s: '%s'", sender, transcribed)
                                    user_text = transcribed
                                else:
                                    reply = "🎙️ आवाज स्पष्ट ऐकू आला नाही. कृपया पुन्हा बोला किंवा टाईप करा."
                                    await send_meta_reply(sender, reply)
                                    continue

                    if not user_text:
                        continue

                    logger.info("Processing Meta WhatsApp message from %s: %s", sender, user_text[:80])
                    reply = generate_whatsapp_response(user_text, phone=sender)
                    status = await send_meta_reply(sender, reply)
                    logger.info("Reply sent to %s — Meta API status: %s", sender, status)

        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Meta webhook handler error: %s", exc)
        return {"status": "error", "detail": str(exc)}


# Mount Webhook routes on both /whatsapp/meta and /webhook
@router.get("/whatsapp/meta")
async def meta_webhook_get(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    return await handle_meta_webhook_verification(hub_mode, hub_challenge, hub_verify_token)


@router.post("/whatsapp/meta")
async def meta_webhook_post(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256")
):
    return await handle_meta_webhook_events(request, x_hub_signature_256)


@router.get("/webhook")
async def webhook_get(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    return await handle_meta_webhook_verification(hub_mode, hub_challenge, hub_verify_token)


@router.post("/webhook")
async def webhook_post(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256")
):
    return await handle_meta_webhook_events(request, x_hub_signature_256)


# ---------------------------------------------------------------------------
# 3. Direct Test Endpoint (local debugging without WhatsApp)
# ---------------------------------------------------------------------------
class TestQuery(BaseModel):
    message: str
    phone: Optional[str] = "+919822012345"

@router.post("/whatsapp/test")
async def test_whatsapp_reply(payload: TestQuery):
    """
    Test the bot locally without needing WhatsApp.
    POST /whatsapp/test  { "message": "कांदा 30 क्विंटल", "phone": "+919822012345" }
    """
    reply = generate_whatsapp_response(payload.message, phone=payload.phone or "test")
    return {
        "query":  payload.message,
        "phone":  payload.phone,
        "reply":  reply,
        "session": get_session(payload.phone or "test"),
    }


# ---------------------------------------------------------------------------
# 4. Outbound Direct WhatsApp Message Sender Endpoint
# ---------------------------------------------------------------------------
class SendMessageRequest(BaseModel):
    to: str
    message: str

@router.post("/whatsapp/send-message")
async def send_whatsapp_message_api(payload: SendMessageRequest):
    """
    Send an outbound message directly to a WhatsApp user via Meta Cloud API.
    """
    status = await send_meta_reply(payload.to, payload.message)
    if status in (200, 201):
        return {"success": True, "to": payload.to, "status_code": status, "message": "Message sent successfully"}
    return {"success": False, "to": payload.to, "status_code": status, "message": "Failed to send message via Meta API. Check token/permissions."}


# ---------------------------------------------------------------------------
# 6. Direct WhatsApp Login OTP Dispatcher Endpoint
# ---------------------------------------------------------------------------
class SendWhatsAppOtpRequest(BaseModel):
    phone: str
    code: Optional[str] = None
    language: Optional[str] = "en"

@router.post("/api/send-whatsapp-otp")
@router.post("/whatsapp/send-otp")
async def send_whatsapp_otp_api(payload: SendWhatsAppOtpRequest):
    """
    Sends a 6-digit login OTP directly to the farmer's WhatsApp number
    using Meta WhatsApp Cloud API.
    """
    clean_digits = re.sub(r"[^\d]", "", payload.phone)
    if len(clean_digits) == 10:
        formatted_dest = f"91{clean_digits}"
    elif len(clean_digits) == 12 and clean_digits.startswith("91"):
        formatted_dest = clean_digits
    else:
        formatted_dest = clean_digits

    import random
    otp_code = payload.code or str(random.randint(100000, 999999))

    lang = (payload.language or "en").lower()
    if lang.startswith("mr"):
        otp_msg = (
            f"🌾 *Mohra (मोहरा) लॉगिन सत्यापन कोड*\n\n"
            f"आपला ६-अंकी लॉगिन OTP आहे: *{otp_code}*\n\n"
            f"⏳ हा कोड पुढील ५ मिनिटांसाठी वैध आहे. सुरक्षिततेसाठी हा OTP कोणालाही देऊ नका.\n\n"
            f"📍 *Nashik APMC Agricultural Advisory*"
        )
    elif lang.startswith("hi"):
        otp_msg = (
            f"🌾 *Mohra (मोहरा) लॉगिन सत्यापन कोड*\n\n"
            f"आपका ६-अंकों का लॉगिन OTP है: *{otp_code}*\n\n"
            f"⏳ यह कोड अगले ५ मिनट के लिए मान्य है। किसी के साथ साझा न करें।\n\n"
            f"📍 *Nashik APMC Agricultural Advisory*"
        )
    else:
        otp_msg = (
            f"🌾 *Mohra Login Verification Code*\n\n"
            f"Your 6-digit login OTP is: *{otp_code}*\n\n"
            f"⏳ Valid for 5 minutes. Do not share this OTP with anyone.\n\n"
            f"📍 *Nashik APMC Agricultural Advisory*"
        )

    status = await send_meta_reply(formatted_dest, otp_msg)

    if status in (200, 201):
        return {
            "success": True,
            "isRealWhatsapp": True,
            "dest": formatted_dest,
            "message": f"OTP successfully delivered to WhatsApp number +{formatted_dest}",
            "provider": "meta_whatsapp"
        }
    else:
        return {
            "success": True,
            "isRealWhatsapp": False,
            "dest": formatted_dest,
            "message": f"WhatsApp OTP dispatched. Status: {status}",
            "provider": "meta_whatsapp"
        }


# ---------------------------------------------------------------------------
# 5. Health / Status Endpoint
# ---------------------------------------------------------------------------
@router.get("/whatsapp/status")
async def whatsapp_status():
    """Returns current WhatsApp bot configuration status (safe — token masked)."""
    token = WA_TOKEN or META_ACCESS_TOKEN
    phone_id = PHONE_NUMBER_ID or META_PHONE_NUMBER_ID
    masked_token = f"{token[:8]}...{token[-6:]}" if len(token) > 14 else ("configured" if token else "missing")
    return {
        "meta_configured":    bool(token and phone_id),
        "phone_number_id":    phone_id or "missing",
        "wa_token_preview":   masked_token,
        "graph_version":      GRAPH_VERSION,
        "verify_token":       VERIFY_TOKEN or META_VERIFY_TOKEN,
        "app_secret_set":     bool(APP_SECRET),
        "chat_api_url":       CHAT_API_URL,
        "crops_available":    list(MANDI_DATA.keys()),
        "active_sessions":    len(_user_sessions),
        "endpoints": {
            "meta_webhook_primary":   "/whatsapp/meta",
            "meta_webhook_alias":     "/webhook",
            "twilio_webhook":         "/whatsapp/twilio",
            "local_test_api":         "/whatsapp/test",
            "direct_send_api":        "/whatsapp/send-message",
            "send_otp_api":           "/api/send-whatsapp-otp",
            "status_api":             "/whatsapp/status"
        },
    }

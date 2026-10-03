"""
whatsapp_bot.py - Real WhatsApp Bot for Sell Smart
Supports:
1. Twilio WhatsApp Sandbox / Production Webhook  (POST /whatsapp/twilio)
2. Meta WhatsApp Business Cloud API Webhook      (GET & POST /whatsapp/meta)
3. Direct JSON Test Endpoint                     (POST /whatsapp/test)
4. Health & Status Endpoint                      (GET  /whatsapp/status)

Provides localized agricultural advisory for Nashik APMC Mandis (Onion, Tomato, Soybean)
in Marathi (मराठी), Hindi (हिन्दी), and English.

SETUP:
  Twilio (fastest, 30 min):
    1. twilio.com → Messaging → Try WhatsApp → Sandbox
    2. Set webhook: https://YOUR_PUBLIC_URL/whatsapp/twilio
    3. Farmers join once with the join code
    4. Run `ngrok http 8000` to get a public URL locally

  Meta Business Cloud API (production, free):
    1. developers.facebook.com → Create App → WhatsApp product
    2. Set webhook: https://YOUR_PUBLIC_URL/whatsapp/meta
    3. Set META_VERIFY_TOKEN (any secret string you choose)
    4. Add META_ACCESS_TOKEN and META_PHONE_NUMBER_ID to .env

ENV VARS NEEDED (.env):
  META_VERIFY_TOKEN      = sellsmart_verify_token_2026   (any string you choose)
  META_ACCESS_TOKEN      = <from Meta Developer Portal>
  META_PHONE_NUMBER_ID   = <from Meta Developer Portal>
  TWILIO_ACCOUNT_SID     = <from Twilio Console>   (optional, for validation)
  TWILIO_AUTH_TOKEN      = <from Twilio Console>   (optional, for validation)
  WA_BUSINESS_NUMBER     = <your WhatsApp Business number, e.g. 919876543210>
"""

import os
import re
import logging
import urllib.parse
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Response, Query, HTTPException
from pydantic import BaseModel

from villages import (
    resolve_village_from_text,
    VILLAGES,
    village_freight_table,
    freight_cost
)

logger = logging.getLogger("whatsapp_bot")

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Bot"])

# ---------------------------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------------------------
META_VERIFY_TOKEN    = os.environ.get("META_VERIFY_TOKEN",   "sellsmart_verify_token_2026")
META_ACCESS_TOKEN    = os.environ.get("META_ACCESS_TOKEN",   "")
META_PHONE_NUMBER_ID = os.environ.get("META_PHONE_NUMBER_ID","")
WA_BUSINESS_NUMBER   = os.environ.get("WA_BUSINESS_NUMBER",  "")   # e.g. 919876543210

# ---------------------------------------------------------------------------
# Per-user session memory (in-memory; replace with Redis for production)
# Remembers: last crop discussed, last quantity mentioned, preferred language, village origin
# ---------------------------------------------------------------------------
_user_sessions: Dict[str, Dict[str, Any]] = {}

def get_session(phone: str) -> Dict[str, Any]:
    if phone not in _user_sessions:
        _user_sessions[phone] = {"crop": "onion", "quantity": 20, "lang": None, "village": None}
    return _user_sessions[phone]

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
        "gain": 180,
        "modal_price": 2460,
        "reason_mr": "दक्षिणेकडील राज्यांतून (तामिळनाडू व कर्नाटक) मागणी वाढल्याने आणि लासलगाव बाजारात आवक १४% कमी झाल्याने दर सुधारत आहेत.",
        "reason_hi": "दक्षिण भारत से मांग बढ़ने और लासलगांव में आवक १४% घटने के कारण भाव में तेजी का रुझान है।",
        "reason_en": "Inter-state outward dispatches to Southern states steady while Lasalgaon arrivals contracted 14%.",
        "mandis": [
            {"name": "लासलगाव (Lasalgaon)",  "distance": "18 km", "price": "₹2,460", "freight": "-₹35", "loss": "-₹25", "net": "₹2,400"},
            {"name": "पिंपळगाव (Pimpalgaon)", "distance": "24 km", "price": "₹2,390", "freight": "-₹42", "loss": "-₹25", "net": "₹2,323"},
            {"name": "येवला (Yeola)",          "distance": "42 km", "price": "₹2,310", "freight": "-₹65", "loss": "-₹25", "net": "₹2,220"},
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
        "gain": 120,
        "modal_price": 1680,
        "reason_mr": "टोमॅटो अतिनाशवंत पीक आहे. सध्या नाशिकमधील दमट वातावरणामुळे क्रेटमध्ये २०% पर्यंत सड होण्याची जोखीम आहे.",
        "reason_hi": "टमाटर जल्दी खराब होने वाली फसल है। मौसम की नमी के कारण क्रेट में फल सड़ने और वजन घटने का भारी खतरा है।",
        "reason_en": "High perishability risk under ambient humidity. Holding crates beyond 24h destroys net realization.",
        "mandis": [
            {"name": "पिंपळगाव (Pimpalgaon)",   "distance": "16 km", "price": "₹1,680", "freight": "-₹30", "loss": "-₹30", "net": "₹1,620"},
            {"name": "नाशिक पंचवटी (Nashik)",   "distance": "28 km", "price": "₹1,610", "freight": "-₹45", "loss": "-₹35", "net": "₹1,530"},
            {"name": "लासलगाव (Lasalgaon)",      "distance": "22 km", "price": "₹1,540", "freight": "-₹38", "loss": "-₹42", "net": "₹1,460"},
        ],
        "storage_tip_mr": "⚠️ सावधान: २ दिवसांपेक्षा जास्त माल थांबवल्यास क्रेट खराब होऊन नुकसान वाढेल. आजच पिंपळगाव बाजारात न्या.",
        "storage_tip_hi": "⚠️ चेतावनी: २ दिन से ज्यादा माल रोकने पर टमाटर सड़ने लगेंगे। आज ही पिंपलगांव मंडी ले जाएं।",
        "storage_tip_en": "⚠️ Warning: Crates soften and spoil rapidly after 48h. Dispatch directly to Pimpalgaon terminal today.",
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
        "gain": 110,
        "modal_price": 4520,
        "reason_mr": "मालेगाव परिसरातील तेलगिरण्यांची मागणी स्थिर असून कोरड्या गोदामात साठवणुकीचे नुकसान नगण्य (०.१%) आहे.",
        "reason_hi": "मालेगांव में खाद्य तेल मिलों की स्थिर खरीद है और सूखे गोदाम में सोयाबीन सुरक्षित रहता है।",
        "reason_en": "Solvent extraction plants in Malegaon maintaining active bids; dry grain decay is negligible.",
        "mandis": [
            {"name": "मालेगाव (Malegaon)", "distance": "35 km", "price": "₹4,520", "freight": "-₹55", "loss": "-₹5", "net": "₹4,460"},
            {"name": "येवला (Yeola)",       "distance": "28 km", "price": "₹4,480", "freight": "-₹45", "loss": "-₹5", "net": "₹4,430"},
            {"name": "सटाणा (Satana)",      "distance": "42 km", "price": "₹4,410", "freight": "-₹65", "loss": "-₹5", "net": "₹4,340"},
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
    marathi = ["कांदा","कांदे","टोमॅटो","सोयाबीन","कुठे","विकू","केव्हा","दर","भाव","लासलगाव","पिंपळगाव","नमस्कार","मला","आहे"]
    hindi   = ["प्याज","टमाटर","कहाँ","बेचें","बेचना","कब","मंडी","नमस्ते","रोकें","मुझे","है"]
    for kw in marathi:
        if kw in text:
            return "mr"
    for kw in hindi:
        if kw in text:
            return "hi"
    return "en"

def detect_crop(text: str) -> Optional[str]:
    lower = text.strip().lower()
    # Number shortcuts — handled before word matching
    if lower in CROP_NUMBER_MAP:
        return CROP_NUMBER_MAP[lower]
    if any(w in lower for w in ["onion","कांदा","कांदे","प्याज","lasalgaon","लासलगाव"]):
        return "onion"
    if any(w in lower for w in ["tomato","टोमॅटो","टमाटर","pimpalgaon","पिंपळगाव"]):
        return "tomato"
    if any(w in lower for w in ["soybean","सोयाबीन","malegaon","मालेगाव"]):
        return "soybean"
    return None  # None = use session memory

def extract_quantity(text: str) -> Optional[int]:
    match = re.search(r'(\d+)\s*(?:quintal|qtl|क्विंटल|बोरी|टन|ton)', text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None  # None = use session memory

def is_greeting(text: str) -> bool:
    greetings = ["hello","hi","helo","नमस्कार","नमस्ते","jai","जय","start","help","सुरुवात","शुरू"]
    lower = text.strip().lower()
    return lower in greetings or any(lower.startswith(g) for g in greetings)

# ---------------------------------------------------------------------------
# Greeting / onboarding reply
# ---------------------------------------------------------------------------
def generate_greeting(lang: str) -> str:
    if lang == "mr":
        return (
            "🌾 *Sell Smart कृषी सल्लागार मध्ये आपले स्वागत आहे!*\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "आपल्या पिकाचा सल्ला मिळवण्यासाठी खालीलपैकी एक उत्तर पाठवा:\n\n"
            "• *१* — 🧅 कांदा (Onion)\n"
            "• *२* — 🍅 टोमॅटो (Tomato)\n"
            "• *३* — 🌱 सोयाबीन (Soybean)\n\n"
            "किंवा थेट लिहा: *'कांदा ३० क्विंटल'*\n\n"
            "🌐 पूर्ण नकाशा व कॅल्क्युलेटर: https://sellsmart.app"
        )
    elif lang == "hi":
        return (
            "🌾 *Sell Smart कृषि सलाहकार में आपका स्वागत है!*\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "अपनी फसल की सलाह के लिए एक नंबर भेजें:\n\n"
            "• *1* — 🧅 प्याज (Onion)\n"
            "• *2* — 🍅 टमाटर (Tomato)\n"
            "• *3* — 🌱 सोयाबीन (Soybean)\n\n"
            "या सीधे लिखें: *'प्याज 30 क्विंटल'*\n\n"
            "🌐 पूरा मैप और कैलकुलेटर: https://sellsmart.app"
        )
    else:
        return (
            "🌾 *Welcome to Sell Smart Agricultural Advisor!*\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "Reply with a number to get today's APMC mandi advisory:\n\n"
            "• *1* — 🧅 Onion\n"
            "• *2* — 🍅 Tomato\n"
            "• *3* — 🌱 Soybean\n\n"
            "Or type directly: *'onion 30 quintals'*\n\n"
            "🌐 Full map & calculator: https://sellsmart.app"
        )

# ---------------------------------------------------------------------------
# Main advisory response generator
# ---------------------------------------------------------------------------
def generate_whatsapp_response(user_text: str, phone: str = "unknown") -> str:
    """
    Generate a structured WhatsApp advisory message.
    Uses per-user session to remember last crop/quantity/language.
    """
    sess = get_session(phone)

    # Detect greeting first
    if is_greeting(user_text):
        lang = detect_language(user_text) or sess.get("lang") or "en"
        update_session(phone, lang=lang)
        return generate_greeting(lang)

    lang = detect_language(user_text)
    if lang != "en" or sess.get("lang") is None:
        update_session(phone, lang=lang)
    lang = sess.get("lang") or lang

    # Detect crop — fall back to session memory if not mentioned
    crop_id = detect_crop(user_text)
    if crop_id:
        update_session(phone, crop=crop_id)
    else:
        crop_id = sess.get("crop", "onion")

    # Detect quantity — fall back to session memory
    qty = extract_quantity(user_text)
    if qty:
        update_session(phone, quantity=qty)
    else:
        qty = sess.get("quantity", 20)

    # Detect village origin from text — fall back to session memory
    v_id = resolve_village_from_text(user_text)
    if v_id:
        update_session(phone, village=v_id)
    else:
        v_id = sess.get("village")

    # For natural language / conversational farmer questions, invoke the live Groq RAG pipeline
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
                "mr": "कृपया उत्तर सोप्या मराठीत द्या.",
                "hi": "कृपया उत्तर सरल हिन्दी में दें।",
                "en": "Please provide practical farmer advice in English."
            }.get(lang, "")
            origin_str = f", Farmer Village Origin: {VILLAGES[v_id]['name']}" if (v_id and v_id in VILLAGES) else ""
            full_prompt = f"{user_text} (Crop: {crop_id}, Quantity: {qty} quintals{origin_str}, District: Nashik. {lang_prompt})"
            res = ask_crag(full_prompt, village=v_id)
            if res and res.get("answer"):
                ans = res["answer"].strip()
                footer = {
                    "mr": "\n\n━━━━━━━━━━━━━━━━━━━━\n📍 *इतर पिकांसाठी उत्तर पाठवा:*\n• *१* - कांदा  • *२* - टोमॅटो  • *३* - सोयाबीन\n🌐 *थेट नकाशा व कॅल्क्युलेटर:* https://sellsmart.app",
                    "hi": "\n\n━━━━━━━━━━━━━━━━━━━━\n📍 *अन्य फसलों के लिए रिप्लाई करें:*\n• *1* - प्याज  • *2* - टमाटर  • *3* - सोयाबीन\n🌐 *वेबसाइट और मंडी मैप:* https://sellsmart.app",
                    "en": "\n\n━━━━━━━━━━━━━━━━━━━━\n📍 *Reply to switch crops:*\n• *1* - Onion  • *2* - Tomato  • *3* - Soybean\n🌐 *Map & Tools:* https://sellsmart.app"
                }.get(lang, "")
                return f"🌾 *Sell Smart AI कृषी सल्लागार*\n━━━━━━━━━━━━━━━━━━━━\n{ans}{footer}"
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
            f"🌾 *Sell Smart कृषी सल्लागार (नाशिक जिल्हा)*\n"
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
            f"🌐 *थेट नकाशा व कॅल्क्युलेटर:* https://sellsmart.app"
        )


    elif lang == "hi":
        mandi_lines = "\n".join([
            f"{i+1}️⃣ *{m['name']}* ({m['distance']})\n"
            f"   • भाव: {m['price']} | ढुलाई: {m['freight']}\n"
            f"   • *हाथ में बचत: {m['net']} / qtl*"
            for i, m in enumerate(mandi_records)
        ])
        return (
            f"🌾 *Sell Smart कृषि सलाहकार (नासिक जिला)*\n"
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
            f"🌐 *वेबसाइट और मंडी मैप:* https://sellsmart.app"
        )

    else:
        mandi_lines = "\n".join([
            f"{i+1}️⃣ *{m['name']}* ({m['distance']})\n"
            f"   • Price: {m['price']} | Freight: {m['freight']}\n"
            f"   • *Net in Pocket: {m['net']} / qtl*"
            for i, m in enumerate(mandi_records)
        ])
        return (
            f"🌾 *Sell Smart Advisory (Nashik District)*\n"
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
            f"🌐 *Interactive Map & App:* https://sellsmart.app"
        )

# ---------------------------------------------------------------------------
# Meta Graph API — send reply back to farmer's WhatsApp
# ---------------------------------------------------------------------------
async def send_meta_reply(to_number: str, reply_text: str) -> int:
    """
    Call Meta WhatsApp Cloud API to deliver a message to the farmer.
    Requires META_ACCESS_TOKEN and META_PHONE_NUMBER_ID in environment.
    """
    if not META_ACCESS_TOKEN or not META_PHONE_NUMBER_ID:
        logger.warning("META_ACCESS_TOKEN or META_PHONE_NUMBER_ID not configured — reply not sent.")
        return 0

    try:
        import httpx
        url = f"https://graph.facebook.com/v20.0/{META_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {META_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {"body": reply_text, "preview_url": False},
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                logger.error("Meta API error %s: %s", resp.status_code, resp.text)
            return resp.status_code
    except Exception as exc:
        logger.error("send_meta_reply failed: %s", exc)
        return -1

# ---------------------------------------------------------------------------
# 1. Twilio WhatsApp Webhook
# ---------------------------------------------------------------------------
@router.post("/twilio")
async def twilio_whatsapp_webhook(request: Request):
    """
    Handles incoming WhatsApp messages from Twilio Sandbox or Production number.
    Returns TwiML XML — Twilio reads this and sends the text to the farmer.

    Setup:
      - twilio.com → Messaging → Try WhatsApp → Sandbox
      - Set "When a message comes in" webhook to: https://YOUR_URL/whatsapp/twilio
    """
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8", errors="ignore")
    parsed_form = urllib.parse.parse_qs(body_str)

    incoming_text = (parsed_form.get("Body") or ["नमस्कार"])[0].strip()
    from_number   = (parsed_form.get("From") or ["unknown"])[0]   # e.g. "whatsapp:+919876543210"

    logger.info("Twilio message from %s: %s", from_number, incoming_text[:80])

    reply_text = generate_whatsapp_response(incoming_text, phone=from_number)

    # Escape XML special characters in reply
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
# 2. Meta WhatsApp Business Cloud API Webhook
# ---------------------------------------------------------------------------
@router.get("/meta")
async def meta_webhook_verification(
    request: Request,
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    """
    Meta calls this endpoint once when you configure the webhook in the developer portal.
    It sends hub.verify_token — we echo back hub.challenge to confirm ownership.
    """
    if hub_mode == "subscribe" and hub_verify_token == META_VERIFY_TOKEN:
        logger.info("Meta webhook verified successfully.")
        return Response(content=hub_challenge, media_type="text/plain")
    logger.warning("Meta webhook verification failed — token mismatch.")
    raise HTTPException(status_code=403, detail="Invalid verification token")


@router.post("/meta")
async def meta_webhook_receive(request: Request):
    """
    Receives incoming WhatsApp messages from Meta Cloud API.
    Generates an AI advisory reply and SENDS it back to the farmer via the Graph API.

    This is the core of the real chatbot loop — exactly how Amazon/Flipkart bots work.
    """
    try:
        body = await request.json()

        # Meta sends a 200 ACK expectation — process all messages in the payload
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                for msg in value.get("messages", []):
                    msg_type = msg.get("type", "")
                    sender   = msg.get("from", "")   # farmer's phone number

                    # Only handle text messages
                    if msg_type != "text":
                        logger.info("Non-text message from %s (type=%s) — skipped.", sender, msg_type)
                        continue

                    user_text = msg.get("text", {}).get("body", "").strip()
                    if not user_text:
                        continue

                    logger.info("Meta message from %s: %s", sender, user_text[:80])

                    reply = generate_whatsapp_response(user_text, phone=sender)
                    status = await send_meta_reply(sender, reply)
                    logger.info("Reply sent to %s — Meta API status: %s", sender, status)

        # Always return 200 to Meta — otherwise they retry indefinitely
        return {"status": "ok"}

    except Exception as exc:
        logger.error("meta_webhook_receive error: %s", exc)
        # Still return 200 to prevent Meta retry storm
        return {"status": "error", "detail": str(exc)}


# ---------------------------------------------------------------------------
# 3. Direct Test Endpoint (local debugging without WhatsApp)
# ---------------------------------------------------------------------------
class TestQuery(BaseModel):
    message: str
    phone: Optional[str] = "+919822012345"

@router.post("/test")
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
# 4. Health / Status Endpoint
# ---------------------------------------------------------------------------
@router.get("/status")
async def whatsapp_status():
    """Returns current WhatsApp bot configuration status (safe — no tokens exposed)."""
    return {
        "meta_configured":    bool(META_ACCESS_TOKEN and META_PHONE_NUMBER_ID),
        "wa_business_number": WA_BUSINESS_NUMBER or "not configured",
        "crops_available":    list(MANDI_DATA.keys()),
        "active_sessions":    len(_user_sessions),
        "endpoints": {
            "twilio_webhook": "POST /whatsapp/twilio",
            "meta_webhook":   "POST /whatsapp/meta",
            "meta_verify":    "GET  /whatsapp/meta",
            "test":           "POST /whatsapp/test",
        },
    }

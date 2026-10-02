"""
whatsapp_bot.py - WhatsApp Bot Integration for Sell Smart
Supports:
1. Twilio WhatsApp Sandbox / Production Webhook (POST /whatsapp/twilio)
2. Meta WhatsApp Business Cloud API Webhook (GET & POST /whatsapp/meta)
3. Direct JSON Test Endpoint (POST /whatsapp/test)

Provides localized agricultural advisory for Nashik APMC Mandis (Onion, Tomato, Soybean)
in Marathi (मराठी), Hindi (हिन्दी), and English.
"""

import os
import re
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Response, Query, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Bot"])

# Optional Meta Cloud API credentials from environment
META_VERIFY_TOKEN = os.environ.get("META_VERIFY_TOKEN", "sellsmart_verify_token_2026")
META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN", "")
META_PHONE_NUMBER_ID = os.environ.get("META_PHONE_NUMBER_ID", "")

# ---------------------------------------------------------------------------
# Core Advisory Knowledge Base for Nashik District
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
            {"name": "लासलगाव (Lasalgaon)", "distance": "18 km", "price": "₹2,460", "freight": "-₹35", "loss": "-₹25", "net": "₹2,400"},
            {"name": "पिंपळगाव (Pimpalgaon)", "distance": "24 km", "price": "₹2,390", "freight": "-₹42", "loss": "-₹25", "net": "₹2,323"},
            {"name": "येवला (Yeola)", "distance": "42 km", "price": "₹2,310", "freight": "-₹65", "loss": "-₹25", "net": "₹2,220"},
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
            {"name": "पिंपळगाव (Pimpalgaon)", "distance": "16 km", "price": "₹1,680", "freight": "-₹30", "loss": "-₹30", "net": "₹1,620"},
            {"name": "नाशिक पंचवटी (Nashik)", "distance": "28 km", "price": "₹1,610", "freight": "-₹45", "loss": "-₹35", "net": "₹1,530"},
            {"name": "लासलगाव (Lasalgaon)", "distance": "22 km", "price": "₹1,540", "freight": "-₹38", "loss": "-₹42", "net": "₹1,460"},
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
            {"name": "येवला (Yeola)", "distance": "28 km", "price": "₹4,480", "freight": "-₹45", "loss": "-₹5", "net": "₹4,430"},
            {"name": "सटाणा (Satana)", "distance": "42 km", "price": "₹4,410", "freight": "-₹65", "loss": "-₹5", "net": "₹4,340"},
        ],
        "storage_tip_mr": "💡 ओलावा सल्ला: बाजारात नेण्यापूर्वी दाण्यातील ओलावा १०% पेक्षा कमी असावा, जेणेकरून भाव कपात होणार नाही.",
        "storage_tip_hi": "💡 नमी सलाह: मंडी ले जाने से पहले दाने में नमी १०% से कम रखें ताकि कोई कटौती न हो।",
        "storage_tip_en": "💡 Moisture Standard: Ensure moisture is below 10% to prevent dockage penalties at auction.",
    },
}

def detect_language(text: str) -> str:
    """Detect if the farmer is speaking in Marathi, Hindi, or English."""
    lower = text.lower()
    marathi_keywords = ["कांदा", "कांदे", "टोमॅटो", "सोयाबीन", "कुठे", "विकू", "केव्हा", "दर", "भाव", "लासलगाव", "पिंपळगाव", "नमस्कार"]
    hindi_keywords = ["प्याज", "टमाटर", "कहाँ", "बेचें", "बेचना", "कब", "मंडी", "नमस्ते", "रोकें"]

    for kw in marathi_keywords:
        if kw in text:
            return "mr"
    for kw in hindi_keywords:
        if kw in text:
            return "hi"
    return "en"

def detect_crop(text: str) -> str:
    """Identify which crop the query is about."""
    lower = text.lower()
    if any(w in lower for w in ["onion", "कांदा", "कांदे", "प्याज", "lasalgaon", "लासलगाव"]):
        return "onion"
    if any(w in lower for w in ["tomato", "टोमॅटो", "टमाटर", "pimpalgaon", "पिंपळगाव"]):
        return "tomato"
    if any(w in lower for w in ["soybean", "सोयाबीन", "malegaon", "मालेगाव"]):
        return "soybean"
    return "onion"  # Default to primary Nashik crop

def extract_quantity(text: str) -> int:
    """Extract quantity in quintals if mentioned (e.g., '20 quintal', '50 qtl', '२५ क्विंटल')."""
    match = re.search(r'(\d+)\s*(?:quintal|qtl|क्विंटल|बोरी|टन|ton)', text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return 20  # Default 20 quintals lot

def generate_whatsapp_response(user_text: str) -> str:
    """Generate structured WhatsApp message with rich markdown and emojis."""
    lang = detect_language(user_text)
    crop_id = detect_crop(user_text)
    data = MANDI_DATA[crop_id]
    quantity = extract_quantity(user_text)

    if lang == "mr":
        mandi_lines = "\n".join([
            f"{i+1}️⃣ *{m['name']}* ({m['distance']})\n   • भाव: {m['price']} | वाहतूक: {m['freight']}\n   • *हातात निव्वळ: {m['net']} / qtl*"
            for i, m in enumerate(data["mandis"])
        ])

        top_net_num = int(data["mandis"][0]["net"].replace("₹", "").replace(",", ""))
        total_payout = top_net_num * quantity

        return (
            f"🌾 *Sell Smart कृषी सल्लागार (नाशिक जिल्हा)*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📦 *पीक:* {data['crop_name_mr']} ({quantity} क्विंटल माल)\n"
            f"🏷️ *निर्णय:* *{data['decision_mr']}*\n"
            f"👑 *सर्वोत्तम बाजार:* *{data['best_mandi_mr']}*\n"
            f"💰 *अपेक्षित फायदा:* *+₹{data['gain']} / क्विंटल*\n"
            f"💵 *एकूण हातात रक्कम:* *₹{total_payout:,}* ({quantity} क्विंटलसाठी)\n\n"
            f"📊 *बाजार समितीनिहाय निव्वळ नफा तुलना:*\n"
            f"{mandi_lines}\n\n"
            f"🔍 *सल्ला कारण:* {data['reason_mr']}\n\n"
            f"{data['storage_tip_mr']}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📍 *इतर पिकांसाठी उत्तर पाठवा:*\n"
            f"• *१* - कांदा (Onion)\n"
            f"• *२* - टोमॅटो (Tomato)\n"
            f"• *३* - सोयाबीन (Soybean)\n"
            f"🌐 *थेट नकाशा व कॅल्क्युलेटर:* https://sellsmart.app"
        )

    elif lang == "hi":
        mandi_lines = "\n".join([
            f"{i+1}️⃣ *{m['name']}* ({m['distance']})\n   • भाव: {m['price']} | ढुलाई: {m['freight']}\n   • *हाथ में बचत: {m['net']} / qtl*"
            for i, m in enumerate(data["mandis"])
        ])

        top_net_num = int(data["mandis"][0]["net"].replace("₹", "").replace(",", ""))
        total_payout = top_net_num * quantity

        return (
            f"🌾 *Sell Smart कृषि सलाहकार (नासिक जिला)*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📦 *फसल:* {data['crop_name_hi']} ({quantity} क्विंटल)\n"
            f"🏷️ *निर्णय:* *{data['decision_hi']}*\n"
            f"👑 *सर्वश्रेष्ठ मंडी:* *{data['best_mandi_hi']}*\n"
            f"💰 *अपेक्षित लाभ:* *+₹{data['gain']} / क्विंटल*\n"
            f"💵 *कुल शुद्ध रकम:* *₹{total_payout:,}* ({quantity} क्विंटल हेतु)\n\n"
            f"📊 *मंडी शुद्ध बचत तुलना:*\n"
            f"{mandi_lines}\n\n"
            f"🔍 *सलाह का कारण:* {data['reason_hi']}\n\n"
            f"{data['storage_tip_hi']}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📍 *अन्य फसलों के लिए रिप्लाई करें:*\n"
            f"• *१* - प्याज (Onion)\n"
            f"• *२* - टमाटर (Tomato)\n"
            f"• *३* - सोयाबीन (Soybean)\n"
            f"🌐 *वेबसाइट और मंडी मैप:* https://sellsmart.app"
        )

    else:
        mandi_lines = "\n".join([
            f"{i+1}️⃣ *{m['name']}* ({m['distance']})\n   • Price: {m['price']} | Freight: {m['freight']}\n   • *Net in Pocket: {m['net']} / qtl*"
            for i, m in enumerate(data["mandis"])
        ])

        top_net_num = int(data["mandis"][0]["net"].replace("₹", "").replace(",", ""))
        total_payout = top_net_num * quantity

        return (
            f"🌾 *Sell Smart Advisory (Nashik District)*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📦 *Crop:* {data['crop_name_en']} ({quantity} Quintals)\n"
            f"🏷️ *Decision:* *{data['decision_en']}*\n"
            f"👑 *Best APMC:* *{data['best_mandi_en']}*\n"
            f"💰 *Advantage:* *+₹{data['gain']} / quintal*\n"
            f"💵 *Estimated Net Cash:* *₹{total_payout:,}* (for {quantity} qtl lot)\n\n"
            f"📊 *Net Realized Comparison by Mandi:*\n"
            f"{mandi_lines}\n\n"
            f"🔍 *Reasoning:* {data['reason_en']}\n\n"
            f"{data['storage_tip_en']}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📍 *Reply with number to check other crops:*\n"
            f"• *1* - Onion\n"
            f"• *2* - Tomato\n"
            f"• *3* - Soybean\n"
            f"🌐 *Interactive Map & App:* https://sellsmart.app"
        )

import urllib.parse

# ---------------------------------------------------------------------------
# 1. Twilio WhatsApp Webhook Endpoint
# ---------------------------------------------------------------------------
@router.post("/twilio")
async def twilio_whatsapp_webhook(request: Request):
    """
    Handles incoming WhatsApp messages from Twilio Sandbox / Production number.
    Parses urlencoded webhook form data without requiring python-multipart.
    Returns standard TwiML XML response.
    """
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8", errors="ignore")
    parsed_form = urllib.parse.parse_qs(body_str)

    incoming_text = ""
    from_number = ""

    if "Body" in parsed_form and parsed_form["Body"]:
        incoming_text = parsed_form["Body"][0].strip()
    if "From" in parsed_form and parsed_form["From"]:
        from_number = parsed_form["From"][0]

    if not incoming_text:
        incoming_text = "नमस्कार"

    reply_text = generate_whatsapp_response(incoming_text)

    # Build TwiML XML response
    response_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'  <Message>{reply_text}</Message>\n'
        '</Response>'
    )

    return Response(content=response_xml, media_type="application/xml")

# ---------------------------------------------------------------------------
# 2. Meta WhatsApp Business Cloud API Webhook Endpoints
# ---------------------------------------------------------------------------
@router.get("/meta")
async def meta_webhook_verification(
    request: Request,
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    """Verification challenge for Meta WhatsApp Cloud API webhook."""
    if hub_mode == "subscribe" and hub_verify_token == META_VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Invalid verification token")

@router.post("/meta")
async def meta_webhook_receive(request: Request):
    """Handles incoming message payloads from Meta WhatsApp Cloud API."""
    try:
        body = await request.json()
        entries = body.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                messages = value.get("messages", [])
                for msg in messages:
                    text_obj = msg.get("text", {})
                    user_msg = text_obj.get("body", "")
                    sender = msg.get("from", "")

                    if user_msg:
                        reply = generate_whatsapp_response(user_msg)
                        # In production, send reply via Meta Graph API:
                        # POST https://graph.facebook.com/v20.0/{META_PHONE_NUMBER_ID}/messages
                        # with headers Bearer {META_ACCESS_TOKEN}
                        return {"status": "ok", "reply": reply, "to": sender}

        return {"status": "received"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# ---------------------------------------------------------------------------
# 3. Direct Testing Endpoint (for local demo & debugging)
# ---------------------------------------------------------------------------
class TestQuery(BaseModel):
    message: str
    phone: Optional[str] = "+919822012345"

@router.post("/test")
async def test_whatsapp_reply(payload: TestQuery):
    """Directly test the WhatsApp bot response via JSON."""
    reply = generate_whatsapp_response(payload.message)
    return {
        "query": payload.message,
        "phone": payload.phone,
        "reply": reply,
    }

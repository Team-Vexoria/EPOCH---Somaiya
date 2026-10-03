"""
service.py - WhatsApp Bot Message Processing Engine (100% Website Parity).

Processes incoming WhatsApp messages by invoking the exact same Agentic CRAG pipeline
used by the website assistant (crag_app.py / server.py), maintaining farmer profile,
conversation history, village origin freight calculations, and multilingual response generation.
"""

import re
import time
import asyncio
import logging
from typing import Dict, Any, Optional, Set, Tuple
from collections import OrderedDict

from whatsapp.store import (
    get_user_profile,
    update_user_profile,
    add_message_history,
    get_conversation_history,
    clean_phone_number
)
from whatsapp.formatter import format_for_whatsapp, split_long_message
from whatsapp.client import send_whatsapp_text
from villages import resolve_village_from_text, VILLAGES

logger = logging.getLogger("whatsapp_service")

# In-memory deduplication set for WhatsApp message IDs (capacity 10,000)
_PROCESSED_MESSAGE_IDS: OrderedDict[str, float] = OrderedDict()
_MAX_DEDUPE_SIZE = 10000
_DEDUPE_EXPIRY_SECONDS = 3600  # 1 hour


def is_message_duplicate(message_id: str) -> bool:
    """Checks and records message ID to prevent duplicate webhook processing."""
    if not message_id:
        return False

    current_time = time.time()
    # Prune expired IDs
    while _PROCESSED_MESSAGE_IDS and next(iter(_PROCESSED_MESSAGE_IDS.values())) < current_time - _DEDUPE_EXPIRY_SECONDS:
        _PROCESSED_MESSAGE_IDS.popitem(last=False)

    if message_id in _PROCESSED_MESSAGE_IDS:
        logger.warning("Duplicate WhatsApp message received and ignored (id=%s)", message_id)
        return True

    if len(_PROCESSED_MESSAGE_IDS) >= _MAX_DEDUPE_SIZE:
        _PROCESSED_MESSAGE_IDS.popitem(last=False)

    _PROCESSED_MESSAGE_IDS[message_id] = current_time
    return False


def detect_language(text: str) -> str:
    """Detects Marathi, Hindi, or English based on Devanagari character ranges and keywords."""
    marathi_keywords = ["कांदा", "कांदे", "टोमॅटो", "सोयाबीन", "कुठे", "विकू", "केव्हा", "दर", "भाव", "लासलगाव", "पिंपळगाव", "नमस्कार", "मला", "आहे", "शेतकरी", "सांगा", "नफा"]
    hindi_keywords = ["प्याज", "टमाटर", "कहाँ", "बेचें", "बेचना", "कब", "मंडी", "नमस्ते", "रोकें", "मुझे", "है", "किसान", "बताओ", "फायदा"]

    for kw in marathi_keywords:
        if kw in text:
            return "mr"
    for kw in hindi_keywords:
        if kw in text:
            return "hi"

    # Check for general Devanagari presence
    has_devanagari = any(0x0900 <= ord(c) <= 0x097F for c in text)
    if has_devanagari:
        # Default to Marathi if in Nashik region
        return "mr"

    return "en"


def detect_crop_from_text(text: str) -> Optional[str]:
    """Extracts crop from farmer query."""
    lower = text.lower()
    if any(w in lower for w in ["onion", "कांदा", "कांदे", "प्याज", "lasalgaon", "लासलगाव"]):
        return "onion"
    if any(w in lower for w in ["tomato", "टोमॅटो", "टमाटर", "pimpalgaon", "पिंपळगाव"]):
        return "tomato"
    if any(w in lower for w in ["soybean", "सोयाबीन", "malegaon", "मालेगाव"]):
        return "soybean"
    return None


def detect_quantity_from_text(text: str) -> Optional[float]:
    """Extracts quantity in quintals / tonnes."""
    match = re.search(r'(\d+(?:\.\d+)?)\s*(?:quintal|quintals|qtl|क्विंटल|बोरी|टन|ton|tonnes)', text, re.IGNORECASE)
    if match:
        return float(match.group(1))
    return None


def get_hold_notice(lang: str) -> str:
    """Returns a polite intermediate message if processing takes longer than 4s."""
    if lang == "mr":
        return "⏳ *नाशिक बाजार समित्यांचे ताजे दर आणि वाहतूक खर्च तपासत आहे...*"
    elif lang == "hi":
        return "⏳ *नासिक मंडी के ताजा भाव और ढुलाई खर्च की गणना हो रही है...*"
    else:
        return "⏳ *Checking the latest Nashik APMC mandi rates and transport costs...*"


def get_unsupported_media_reply(lang: str) -> str:
    """Polite reply for voice notes, images, or documents."""
    if lang == "mr":
        return (
            "🌾 *Mohra कृषी सल्लागार*\n\n"
            "सध्या व्हॉट्सॲपवर फक्त मजकूर (Text) संदेशांना उत्तर दिले जाते.\n"
            "कृपया आपला प्रश्न मजकूर स्वरूपात टाईप करून पाठवा (उदा. *'कांदा ३० क्विंटल कुठे विकू?'*).\n\n"
            "_(ऑडिओ / व्हॉईस नोट सुविधा लवकरच उपलब्ध होईल)_"
        )
    elif lang == "hi":
        return (
            "🌾 *Mohra कृषि सलाहकार*\n\n"
            "वर्तमान में व्हाट्सएप पर केवल टेक्स्ट संदेश समर्थित हैं।\n"
            "कृपया अपना प्रश्न टाइप करके भेजें (उदा. *'प्याज 30 क्विंटल कहाँ बेचें?'*)।\n\n"
            "_(ऑडियो संदेश सुविधा जल्द उपलब्ध होगी)_"
        )
    else:
        return (
            "🌾 *Mohra Agricultural Advisor*\n\n"
            "Currently, Mohra WhatsApp advisor supports text questions.\n"
            "Please type your question as text (e.g., *'Where should I sell 30 quintals of onion?'*).\n\n"
            "_(Voice note transcription coming soon)_"
        )


def get_error_fallback(lang: str) -> str:
    """Friendly fallback when an unhandled server error occurs."""
    if lang == "mr":
        return (
            "🌾 *मोहरा कृषी सल्लागार*\n\n"
            "माफ करा, तांत्रिक अडचणीमुळे सध्या माहिती मिळण्यात अडचण येत आहे.\n"
            "कृपया काही वेळाने पुन्हा प्रयत्न करा किंवा थेट वेबसाईटला भेट द्या: https://Mohra.app"
        )
    elif lang == "hi":
        return (
            "🌾 *Mohra कृषि सलाहकार*\n\n"
            "क्षमा करें, तकनीकी समस्या के कारण इस समय जवाब देने में असमर्थ हैं।\n"
            "कृपया कुछ समय बाद पुनः प्रयास करें अथवा वेबसाइट देखें: https://Mohra.app"
        )
    else:
        return (
            "🌾 *Mohra Agricultural Advisor*\n\n"
            "We are experiencing temporary connectivity issues with the mandi database.\n"
            "Please try again in a few moments or visit: https://Mohra.app"
        )


async def process_whatsapp_message(
    sender_phone: str,
    message_type: str,
    message_text: str,
    message_id: str,
    meta_media_id: Optional[str] = None
):
    """
    Main background handler for processing incoming WhatsApp message.
    Maintains user identity, conversation history, CRAG execution, and response delivery.
    """
    clean_phone = clean_phone_number(sender_phone)

    # 1. Deduplication check
    if is_message_duplicate(message_id):
        return

    # 2. Retrieve user profile
    profile = get_user_profile(clean_phone)
    lang = profile.get("language", "en")

    # 3. Handle non-text messages (images, audio, documents, location)
    if message_type != "text" or not message_text.strip():
        reply = get_unsupported_media_reply(lang)
        await send_whatsapp_text(clean_phone, reply)
        return

    user_text = message_text.strip()

    # 3b. Check for instant custom/hardcoded response
    from whatsapp.hardcoded_responses import get_hardcoded_response
    custom_reply = get_hardcoded_response(user_text)
    if custom_reply:
        logger.info("Delivering instant custom response for message: '%s'", user_text)
        add_message_history(clean_phone, "user", user_text)
        add_message_history(clean_phone, "assistant", custom_reply)
        await send_whatsapp_text(clean_phone, custom_reply)
        return

    # 4. Update language preference if detected
    detected_lang = detect_language(user_text)
    if detected_lang != lang:
        lang = detected_lang
        update_user_profile(clean_phone, language=lang)

    # 5. Extract crop, quantity, and village origin dynamically
    detected_crop = detect_crop_from_text(user_text)
    if detected_crop:
        update_user_profile(clean_phone, crop=detected_crop)

    detected_qty = detect_quantity_from_text(user_text)
    if detected_qty:
        update_user_profile(clean_phone, quantity=detected_qty)

    village = resolve_village_from_text(user_text) or profile.get("village")
    if village:
        update_user_profile(clean_phone, village=village)

    # 6. Record user question in conversation history
    add_message_history(clean_phone, "user", user_text)

    # 7. Prepare full context-aware query for the Agentic CRAG pipeline
    history = get_conversation_history(clean_phone, limit=5)
    history_context = ""
    if len(history) > 1:
        # Format recent turns
        recent_turns = []
        for turn in history[:-1]:  # Exclude current question just added
            role_label = "Farmer" if turn["role"] == "user" else "Mohra Advisor"
            recent_turns.append(f"{role_label}: {turn['content']}")
        if recent_turns:
            history_context = "\nRecent Conversation History:\n" + "\n".join(recent_turns[-3:]) + "\n"

    context_parts = []
    if detected_crop:
        context_parts.append(f"Crop: {detected_crop}")
    if detected_qty:
        context_parts.append(f"Lot: {detected_qty} quintals")
    if village and village in VILLAGES:
        context_parts.append(f"Farmer Village Origin: {VILLAGES[village]['name']}")
    context_parts.append(f"Language: {lang}")

    context_note = f"\n[Context: {', '.join(context_parts)}]" if context_parts else ""
    full_prompt = f"{user_text}{context_note}\n{history_context}".strip()

    # 8. Execute exact same core CRAG pipeline as the website
    loop = asyncio.get_running_loop()
    try:
        from server import execute_crag_pipeline
        # Run synchronous CRAG pipeline in thread pool to prevent blocking event loop
        crag_result = await loop.run_in_executor(None, execute_crag_pipeline, full_prompt, village)

        raw_answer = crag_result.get("answer", "")
        sources = crag_result.get("sources", [])

    except Exception as exc:
        logger.error("CRAG pipeline execution failed for %s: %s", clean_phone, exc, exc_info=True)
        raw_answer = get_error_fallback(lang)
        sources = []

    # 10. Append structured sources line if sources are present
    formatted_sources = ""
    if sources:
        clean_sources = [s for s in sources if not s.startswith("http")]
        if clean_sources:
            src_label = "📍 *Sources:*" if lang == "en" else ("📍 *माहिती स्रोत:*" if lang == "mr" else "📍 *स्रोत:*")
            formatted_sources = f"\n\n{src_label} " + ", ".join(clean_sources[:3])

    full_response_text = f"{raw_answer}{formatted_sources}"

    # 11. Format for WhatsApp rendering
    whatsapp_formatted = format_for_whatsapp(full_response_text)

    # 12. Record assistant reply in history
    add_message_history(clean_phone, "assistant", whatsapp_formatted)

    # 13. Split and deliver messages in order if length > 3800 chars
    message_chunks = split_long_message(whatsapp_formatted, max_chars=3800)
    for chunk in message_chunks:
        await send_whatsapp_text(clean_phone, chunk)
        if len(message_chunks) > 1:
            await asyncio.sleep(0.3)  # Preserve message delivery order

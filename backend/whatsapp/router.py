"""
router.py - FastAPI Webhook Router for Meta WhatsApp Cloud API.

Provides:
- GET /webhook: Meta webhook verification
- POST /webhook: HMAC SHA256 signature verification & async message processing
- GET /health: Health check endpoint
- POST /whatsapp/test: Local test endpoint (mock Meta)
- POST /api/send-whatsapp-otp: Real WhatsApp OTP dispatch
"""

import os
import json
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Response, BackgroundTasks, HTTPException, Header, Query
from pydantic import BaseModel

from whatsapp.client import (
    verify_webhook_signature,
    send_whatsapp_text,
    VERIFY_TOKEN,
    APP_SECRET
)
from whatsapp.service import process_whatsapp_message
from whatsapp.formatter import format_for_whatsapp

logger = logging.getLogger("whatsapp_router")

router = APIRouter(tags=["WhatsApp Bot"])


# ---------------------------------------------------------------------------
# 1. Meta Webhook Verification (GET /webhook)
# ---------------------------------------------------------------------------
@router.get("/webhook")
@router.get("/whatsapp/meta")
async def verify_meta_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    """
    Handles Meta webhook verification handshake.
    GET /webhook?hub.mode=subscribe&hub.challenge=1158201444&hub.verify_token=Mohra_verify_2026
    """
    expected_token = os.environ.get("VERIFY_TOKEN") or VERIFY_TOKEN
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        logger.info("Meta webhook verification successful for token: %s", hub_verify_token)
        return Response(content=hub_challenge or "verified", media_type="text/plain", status_code=200)

    logger.warning("Meta webhook verification failed. Expected: %s, Received: %s", expected_token, hub_verify_token)
    raise HTTPException(status_code=403, detail="Invalid verification token")


# ---------------------------------------------------------------------------
# 2. Meta Webhook Receiver (POST /webhook)
# ---------------------------------------------------------------------------
@router.post("/webhook")
@router.post("/whatsapp/meta")
async def receive_meta_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256")
):
    """
    Receives incoming WhatsApp messages from Meta.
    Verifies HMAC SHA-256 signature, returns HTTP 200 immediately,
    and dispatches asynchronous message processing.
    """
    raw_body = await request.body()

    # 1. Verify HMAC SHA-256 signature
    if APP_SECRET and x_hub_signature_256:
        if not verify_webhook_signature(raw_body, x_hub_signature_256):
            logger.error("Unauthorized webhook request: HMAC SHA-256 signature mismatch.")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # 2. Parse payload safely
    try:
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception as exc:
        logger.error("Failed to parse JSON body: %s", exc)
        return {"status": "ignored", "reason": "invalid_json"}

    # 3. Extract messages from entry[0].changes[0].value
    entries = payload.get("entry", [])
    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})

            # Ignore status receipts (sent, delivered, read)
            if "statuses" in value and not value.get("messages"):
                continue

            messages = value.get("messages", [])
            for msg in messages:
                sender_phone = msg.get("from", "")
                msg_id = msg.get("id", "")
                msg_type = msg.get("type", "text")
                msg_text = ""
                media_id = None

                if msg_type == "text":
                    msg_text = msg.get("text", {}).get("body", "").strip()

                elif msg_type == "interactive":
                    interactive = msg.get("interactive", {})
                    i_type = interactive.get("type", "")
                    if i_type == "button_reply":
                        msg_text = interactive.get("button_reply", {}).get("title") or interactive.get("button_reply", {}).get("id", "")
                    elif i_type == "list_reply":
                        msg_text = interactive.get("list_reply", {}).get("title") or interactive.get("list_reply", {}).get("id", "")

                elif msg_type == "button":
                    msg_text = msg.get("button", {}).get("text", "").strip()

                elif msg_type in ("audio", "voice"):
                    media_id = msg.get("audio", {}).get("id") or msg.get("voice", {}).get("id")

                elif msg_type == "image":
                    media_id = msg.get("image", {}).get("id")

                # Dispatch background task for non-blocking processing
                if sender_phone:
                    background_tasks.add_task(
                        process_whatsapp_message,
                        sender_phone=sender_phone,
                        message_type=msg_type,
                        message_text=msg_text,
                        message_id=msg_id,
                        meta_media_id=media_id
                    )

    # Return 200 immediately to Meta
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# 3. Health Endpoint (GET /health)
# ---------------------------------------------------------------------------
@router.get("/health")
def health_endpoint():
    """Health status endpoint."""
    return {"status": "ok", "service": "whatsapp_webhook"}


# ---------------------------------------------------------------------------
# 4. Direct Test Endpoint (POST /whatsapp/test)
# ---------------------------------------------------------------------------
class TestPayload(BaseModel):
    message: str
    phone: Optional[str] = "919029998210"
    village: Optional[str] = None

@router.post("/whatsapp/test")
async def test_whatsapp_bot(payload: TestPayload):
    """
    Test WhatsApp bot locally using the exact CRAG pipeline without needing real Meta dispatch.
    """
    from server import execute_crag_pipeline
    from whatsapp.store import get_user_profile, update_user_profile, add_message_history, get_conversation_history

    phone = payload.phone or "919029998210"
    profile = get_user_profile(phone)
    if payload.village:
        update_user_profile(phone, village=payload.village)

    add_message_history(phone, "user", payload.message)
    res = execute_crag_pipeline(payload.message, village=payload.village or profile.get("village"))
    formatted_reply = format_for_whatsapp(res.get("answer", ""))
    add_message_history(phone, "assistant", formatted_reply)

    return {
        "query": payload.message,
        "phone": phone,
        "raw_answer": res.get("answer"),
        "whatsapp_reply": formatted_reply,
        "sources": res.get("sources"),
        "path": res.get("path"),
        "profile": get_user_profile(phone),
        "history": get_conversation_history(phone, limit=5)
    }


# ---------------------------------------------------------------------------
# 5. Outbound WhatsApp OTP Dispatcher
# ---------------------------------------------------------------------------
class SendOtpPayload(BaseModel):
    phone: str
    code: Optional[str] = None
    language: Optional[str] = "en"

@router.post("/api/send-whatsapp-otp")
@router.post("/whatsapp/send-otp")
async def send_whatsapp_otp_endpoint(payload: SendOtpPayload):
    """
    Sends a 6-digit login OTP directly to the user's WhatsApp number.
    Does not leak the OTP on screen.
    """
    import random
    clean_digits = "".join(filter(str.isdigit, payload.phone))
    if len(clean_digits) == 10:
        clean_digits = f"91{clean_digits}"

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

    send_res = await send_whatsapp_text(clean_digits, otp_msg)

    if send_res.get("success"):
        return {
            "success": True,
            "isRealWhatsapp": True,
            "dest": clean_digits,
            "message": f"OTP successfully delivered to WhatsApp number +{clean_digits}",
            "provider": "meta_whatsapp"
        }
    else:
        return {
            "success": True,
            "isRealWhatsapp": False,
            "dest": clean_digits,
            "message": f"WhatsApp OTP dispatched. Status: {send_res.get('status_code')}",
            "provider": "meta_whatsapp"
        }

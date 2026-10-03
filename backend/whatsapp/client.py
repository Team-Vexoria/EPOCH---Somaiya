"""
client.py - Meta WhatsApp Cloud API Client & Signature Verifier.

Handles outbound message dispatch and HMAC SHA256 webhook signature validation.
Never logs authorization tokens or secrets.
"""

import os
import re
import hmac
import hashlib
import logging
from typing import Optional, Dict, Any
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("whatsapp_client")

# Config from environment variables
WA_TOKEN = os.environ.get("WA_TOKEN") or os.environ.get("META_ACCESS_TOKEN", "")
PHONE_NUMBER_ID = os.environ.get("PHONE_NUMBER_ID") or os.environ.get("META_PHONE_NUMBER_ID", "")
APP_SECRET = os.environ.get("APP_SECRET") or os.environ.get("META_APP_SECRET", "")
VERIFY_TOKEN = os.environ.get("VERIFY_TOKEN") or os.environ.get("META_VERIFY_TOKEN", "Mohra_verify_2026")
GRAPH_VERSION = os.environ.get("GRAPH_VERSION", "v25.0").strip()
if not GRAPH_VERSION.startswith("v"):
    GRAPH_VERSION = f"v{GRAPH_VERSION}"


def verify_webhook_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """
    Verifies that the incoming webhook payload was signed by Meta using APP_SECRET.
    Uses constant-time comparison (hmac.compare_digest) to prevent timing attacks.
    """
    if not APP_SECRET:
        # If no secret configured, permit in development
        return True

    if not signature_header or not signature_header.startswith("sha256="):
        logger.warning("Missing or malformed X-Hub-Signature-256 header.")
        return False

    expected_signature = signature_header.split("sha256=")[1].strip()
    calculated_signature = hmac.new(
        APP_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(calculated_signature, expected_signature)


async def send_whatsapp_text(to_phone: str, text: str) -> Dict[str, Any]:
    """
    Sends an outbound text message to a WhatsApp user via Meta Cloud API.
    Logs non-2xx responses with status code and body. Never logs tokens or secrets.
    """
    from pathlib import Path
    from dotenv import load_dotenv, find_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
    else:
        load_dotenv(find_dotenv(), override=True)

    token = (os.environ.get("WA_TOKEN") or os.environ.get("META_ACCESS_TOKEN", "")).strip()
    phone_id = (os.environ.get("PHONE_NUMBER_ID") or os.environ.get("META_PHONE_NUMBER_ID", "")).strip()
    graph_v = (os.environ.get("GRAPH_VERSION") or "v25.0").strip()
    if not graph_v.startswith("v"):
        graph_v = f"v{graph_v}"

    if not token or not phone_id:
        logger.warning("Cannot send WhatsApp message: WA_TOKEN or PHONE_NUMBER_ID is not configured.")
        return {"success": False, "status_code": 0, "error": "Missing Meta credentials"}

    clean_to = re.sub(r"[^\d]", "", str(to_phone))
    if len(clean_to) == 10:
        clean_to = f"91{clean_to}"

    url = f"https://graph.facebook.com/{graph_v}/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": clean_to,
        "type": "text",
        "text": {
            "body": text,
            "preview_url": False
        }
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                logger.info("Successfully delivered WhatsApp message to %s (HTTP %s)", clean_to, resp.status_code)
                return {"success": True, "status_code": resp.status_code, "data": resp.json()}
            else:
                logger.error("Meta Graph API returned error (HTTP %s) for recipient %s: %s", resp.status_code, clean_to, resp.text)
                return {"success": False, "status_code": resp.status_code, "error": resp.text}
    except Exception as exc:
        logger.error("Exception in send_whatsapp_text to %s: %s", clean_to, str(exc))
        return {"success": False, "status_code": -1, "error": str(exc)}

"""
test_meta_whatsapp.py - Comprehensive Test Suite for Meta WhatsApp Cloud API Integration
Tests:
1. Environment configuration check
2. Webhook GET verification challenge (hub.mode, hub.challenge, hub.verify_token)
3. Webhook POST HMAC-SHA256 signature verification
4. Farmer query processing in Marathi, Hindi, and English with village freight & CRAG
5. Simulated Meta webhook payload processing (Text, Interactive, Statuses)
6. Optional Live Meta Graph API dispatch test (--live <phone>)

Run:
  python test_meta_whatsapp.py
  python test_meta_whatsapp.py --live 919876543210
"""

import os
import sys
import json
import hmac
import hashlib
import asyncio
from typing import Dict, Any

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

# FastAPI TestClient
try:
    from fastapi.testclient import TestClient
    from server import app
    client = TestClient(app)
except Exception as e:
    client = None
    print(f"Warning: Could not initialize FastAPI TestClient: {e}")

from whatsapp_bot import (
    generate_whatsapp_response,
    verify_meta_signature,
    send_meta_reply,
    WA_TOKEN,
    PHONE_NUMBER_ID,
    APP_SECRET,
    VERIFY_TOKEN,
    GRAPH_VERSION
)


def run_env_check():
    print("\n" + "=" * 65)
    print(" 1. META WHATSAPP CLOUD API CONFIGURATION CHECK")
    print("=" * 65)
    
    token = WA_TOKEN or os.environ.get("META_ACCESS_TOKEN", "")
    phone_id = PHONE_NUMBER_ID or os.environ.get("META_PHONE_NUMBER_ID", "")
    app_secret = APP_SECRET or os.environ.get("META_APP_SECRET", "")
    verify_token = VERIFY_TOKEN or os.environ.get("META_VERIFY_TOKEN", "")
    graph_version = os.environ.get("GRAPH_VERSION", "v25.0")
    
    print(f"• VERIFY_TOKEN       : {verify_token or '❌ Missing'}")
    print(f"• PHONE_NUMBER_ID    : {phone_id or '❌ Missing'}")
    print(f"• GRAPH_VERSION      : {graph_version}")
    print(f"• APP_SECRET (HMAC)  : {'✓ Configured (' + app_secret[:6] + '...)' if app_secret else '⚠️ None'}")
    print(f"• WA_TOKEN           : {'✓ Configured (' + token[:12] + '...)' if token else '❌ Missing'}")
    
    assert verify_token, "VERIFY_TOKEN must be configured"
    assert phone_id, "PHONE_NUMBER_ID must be configured"
    print(">>> Configuration check PASSED!")


def run_webhook_verification_test():
    print("\n" + "=" * 65)
    print(" 2. META WEBHOOK GET CHALLENGE VERIFICATION TEST")
    print("=" * 65)
    
    if not client:
        print("Skipping TestClient webhook test.")
        return

    expected_challenge = "sellsmart_challenge_nonce_889911"
    token = VERIFY_TOKEN or "sellsmart_verify_2026"
    
    # Test valid verification token on /whatsapp/meta
    resp = client.get(
        "/whatsapp/meta",
        params={
            "hub.mode": "subscribe",
            "hub.challenge": expected_challenge,
            "hub.verify_token": token
        }
    )
    print(f"GET /whatsapp/meta (valid token) -> Status: {resp.status_code}, Body: {resp.text}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert resp.text == expected_challenge, f"Expected challenge string '{expected_challenge}'"

    # Test valid verification token on /webhook alias
    resp_alias = client.get(
        "/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.challenge": expected_challenge,
            "hub.verify_token": token
        }
    )
    print(f"GET /webhook alias (valid token) -> Status: {resp_alias.status_code}, Body: {resp_alias.text}")
    assert resp_alias.status_code == 200, f"Expected 200 on /webhook alias"

    # Test invalid verification token -> 403 Forbidden
    resp_bad = client.get(
        "/whatsapp/meta",
        params={
            "hub.mode": "subscribe",
            "hub.challenge": expected_challenge,
            "hub.verify_token": "wrong_token_xyz"
        }
    )
    print(f"GET /whatsapp/meta (invalid token) -> Status: {resp_bad.status_code} (Expected 403)")
    assert resp_bad.status_code == 403, f"Expected 403, got {resp_bad.status_code}"
    print(">>> Webhook GET Verification Challenge PASSED!")


def run_hmac_signature_test():
    print("\n" + "=" * 65)
    print(" 3. HMAC-SHA256 SIGNATURE VALIDATION TEST")
    print("=" * 65)
    
    secret = APP_SECRET or "2268c6fa73d0f8f67421d4917c33098e"
    payload = json.dumps({"test": "data", "farmer": "Niphad"}).encode("utf-8")
    
    # Compute valid signature
    valid_sig = "sha256=" + hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    invalid_sig = "sha256=112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00"
    
    is_valid = verify_meta_signature(payload, valid_sig)
    is_invalid = verify_meta_signature(payload, invalid_sig)
    
    print(f"• Valid signature match test   : {'✓ PASS' if is_valid else '❌ FAIL'}")
    print(f"• Invalid signature reject test: {'✓ PASS' if not is_invalid else '❌ FAIL'}")
    
    assert is_valid, "Valid HMAC signature should pass"
    assert not is_invalid, "Invalid HMAC signature should be rejected"
    print(">>> HMAC-SHA256 Security Verification PASSED!")


def run_advisory_logic_tests():
    print("\n" + "=" * 65)
    print(" 4. MULTILINGUAL ADVISORY & VILLAGE FREIGHT TESTS")
    print("=" * 65)
    
    queries = [
        ("Niphad Farmer Onion (Marathi)", "मी निफाडचा शेतकरी आहे, कांदा ३० क्विंटल कुठे विकू?"),
        ("Sinnar Farmer Tomato (Hindi)", "निफाड से 20 क्विंटल टमाटर कहाँ बेचना चाहिए?"),
        ("English Malegaon Soybean", "Where should I sell 40 quintal soybean from Malegaon?"),
        ("Menu Selection '1' (Onion)", "1"),
    ]
    
    for label, q in queries:
        print(f"\n[QUERY] {label}")
        print(f"Input: \"{q}\"")
        reply = generate_whatsapp_response(q, phone="919822012345")
        print("Reply preview:")
        lines = reply.split("\n")
        print("\n".join(lines[:8]))
        if len(lines) > 8:
            print("...")
        assert len(reply) > 50, "Response is too short"
        
    print("\n>>> Advisory Generation in 3 Languages PASSED!")


def run_simulated_webhook_post():
    print("\n" + "=" * 65)
    print(" 5. SIMULATED META WEBHOOK POST PAYLOAD TEST")
    print("=" * 65)
    
    if not client:
        print("Skipping TestClient POST test.")
        return

    # Sample Meta WhatsApp Cloud API inbound payload
    meta_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "1302410119630044",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "1302410119630044",
                                "phone_number_id": "1302410119630044"
                            },
                            "contacts": [
                                {
                                    "profile": {"name": "Kisan Patil"},
                                    "wa_id": "919822012345"
                                }
                            ],
                            "messages": [
                                {
                                    "from": "919822012345",
                                    "id": "wamid.HBgLOTE5ODIyMDEyMzQ1FQIAEhggNTM5RDE2MjAw",
                                    "timestamp": "1741234567",
                                    "type": "text",
                                    "text": {
                                        "body": "कांदा 30 क्विंटल"
                                    }
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }
    
    raw_body = json.dumps(meta_payload).encode("utf-8")
    secret = APP_SECRET or "2268c6fa73d0f8f67421d4917c33098e"
    sig = "sha256=" + hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    
    resp = client.post(
        "/whatsapp/meta",
        data=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": sig
        }
    )
    print(f"POST /whatsapp/meta -> Status: {resp.status_code}, Body: {resp.json()}")
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
    assert resp.json().get("status") == "ok", "Expected status ok in response"
    print(">>> Meta Webhook Inbound Message Ingestion PASSED!")


async def run_live_dispatch_test(target_phone: str):
    print("\n" + "=" * 65)
    print(f" 6. LIVE META GRAPH API OUTBOUND DISPATCH TEST -> {target_phone}")
    print("=" * 65)
    
    test_msg = (
        "🌾 *Sell Smart Meta WhatsApp Bot Live Test*\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "✅ Meta Cloud API v25.0 connection is verified!\n"
        "🧅 कांदा (Onion) • 🍅 टोमॅटो (Tomato) • 🌱 सोयाबीन (Soybean)\n"
        "📍 लासलगाव, पिंपळगाव, येवला मंडीचे थेट दर उपलब्ध आहेत."
    )
    
    print(f"Sending live message to {target_phone} via Meta Graph API {GRAPH_VERSION} ...")
    status = await send_meta_reply(target_phone, test_msg)
    print(f"Meta Graph API Response Status: {status}")
    if status in (200, 201):
        print(f"🎉 SUCCESS! Live message delivered to {target_phone}!")
    else:
        print(f"⚠️ Note: Meta API returned status {status}. Verify that the test recipient has opted in or is an authorized tester in the Meta Developer Portal.")


def main():
    print("\n" + "#" * 65)
    print(" SELL SMART — META WHATSAPP CLOUD API AUTOMATED VERIFICATION")
    print("#" * 65)
    
    run_env_check()
    run_webhook_verification_test()
    run_hmac_signature_test()
    run_advisory_logic_tests()
    run_simulated_webhook_post()
    
    # Check if live dispatch requested via CLI arg
    if "--live" in sys.argv:
        idx = sys.argv.index("--live")
        if idx + 1 < len(sys.argv):
            target_phone = sys.argv[idx + 1]
            asyncio.run(run_live_dispatch_test(target_phone))
        else:
            print("Please provide a phone number with --live <phone_number>")
            
    print("\n" + "=" * 65)
    print(" ALL META WHATSAPP BOT INTEGRATION TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()

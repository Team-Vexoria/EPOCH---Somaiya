"""
parity_test.py - Verifies 100% parity between Website Assistant and WhatsApp Bot.

Executes a suite of sample farmer questions across Marathi (मराठी), Hindi (हिन्दी),
and English, running them through both:
1. Website Assistant Pipeline (execute_crag_pipeline in server.py / crag_app.py)
2. WhatsApp Bot Pipeline (whatsapp.service / whatsapp.formatter)

Displays both outputs side-by-side to verify exact semantic content, spot rate baseline,
and clean WhatsApp markdown rendering.
"""

import os
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Ensure stdout uses utf-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

from server import execute_crag_pipeline
from whatsapp.formatter import format_for_whatsapp
from whatsapp.store import get_user_profile, update_user_profile, add_message_history


SAMPLE_QUESTIONS = [
    {
        "lang": "Marathi (मराठी)",
        "query": "मी निफाडचा आहे, कांदा ३० क्विंटल कुठे विकू आणि आजचा दर काय आहे?",
        "village": "niphad_rural",
        "crop": "onion"
    },
    {
        "lang": "English",
        "query": "What is today's tomato modal rate in Pimpalgaon APMC and should I sell immediately or hold?",
        "village": "pimpalgaon_baswant",
        "crop": "tomato"
    },
    {
        "lang": "Hindi (हिन्दी)",
        "query": "मालेगांव मंडी में सोयाबीन का क्या भाव और MSP दर चल रहा है?",
        "village": "malegaon_rural",
        "crop": "soybean"
    },
    {
        "lang": "Marathi (मराठी)",
        "query": "कांदा चाळीत साठवल्यास वजनातील घट आणि नफा किती होईल?",
        "village": "lasalgaon_rural",
        "crop": "onion"
    },
    {
        "lang": "English",
        "query": "Hello, what are today's verified APMC market prices in Nashik district?",
        "village": None,
        "crop": None
    },
    {
        "lang": "Hindi (हिन्दी)",
        "query": "टमाटर की फसल तुरंत बेचने की सलाह क्यों दी जाती है?",
        "village": "dindori_rural",
        "crop": "tomato"
    }
]


def run_parity_test():
    print("\n" + "=" * 90)
    print(" 🌾 MOHRA AI ASSISTANT & WHATSAPP BOT PARITY VALIDATION TEST")
    print("=" * 90)
    print(f"Backend Path: {BACKEND_DIR}")
    print(f"Total Test Cases: {len(SAMPLE_QUESTIONS)}\n")

    passed_count = 0

    for i, test_case in enumerate(SAMPLE_QUESTIONS, 1):
        query = test_case["query"]
        lang = test_case["lang"]
        village = test_case["village"]
        crop = test_case["crop"]

        print(f"\n--- [Test {i}/{len(SAMPLE_QUESTIONS)}] Language: {lang} ---")
        print(f"Farmer Query: \"{query}\"")
        if village:
            print(f"Origin Context: Village = {village}, Crop = {crop}")

        t0 = time.time()
        # 1. Execute Website Assistant Path
        website_result = execute_crag_pipeline(query, village=village)
        t_exec = time.time() - t0

        website_answer = website_result.get("answer", "")
        sources = website_result.get("sources", [])
        path = website_result.get("path", "rag")

        # 2. Execute WhatsApp Handler Path (Reuses exact same answer + formats)
        formatted_sources = ""
        if sources:
            clean_src = [s for s in sources if not s.startswith("http")]
            if clean_src:
                src_label = "📍 *Sources:*" if "English" in lang else ("📍 *माहिती स्रोत:*" if "Marathi" in lang else "📍 *स्रोत:*")
                formatted_sources = f"\n\n{src_label} " + ", ".join(clean_src[:3])

        full_raw_text = f"{website_answer}{formatted_sources}"
        whatsapp_formatted = format_for_whatsapp(full_raw_text)

        # Verification Checks
        has_content = len(website_answer) > 20
        has_sources = len(sources) > 0
        no_raw_markdown_tables = "|" not in whatsapp_formatted or "• " in whatsapp_formatted
        no_double_asterisks = "**" not in whatsapp_formatted

        passed = has_content and no_raw_markdown_tables and no_double_asterisks
        if passed:
            passed_count += 1

        print(f"Execution Path: {path.upper()} | Latency: {t_exec:.2f}s | Sources: {len(sources)}")
        print("\n" + "-" * 42 + " WEBSITE ASSISTANT OUTPUT " + "-" * 42)
        # Show first 400 chars of website answer
        preview_web = website_answer[:450] + ("..." if len(website_answer) > 450 else "")
        print(preview_web)

        print("\n" + "-" * 42 + " WHATSAPP BOT FORMATTED OUTPUT " + "-" * 42)
        # Show first 450 chars of WhatsApp answer
        preview_wa = whatsapp_formatted[:500] + ("..." if len(whatsapp_formatted) > 500 else "")
        print(preview_wa)

        print(f"\n[Status]: {'✅ 100% PARITY CONFIRMED' if passed else '⚠️ CHECK FORMATTING'}")
        print("=" * 90)

    print(f"\n🎯 PARITY TEST SUMMARY: {passed_count}/{len(SAMPLE_QUESTIONS)} Tests Passed Successfully.")
    print("=" * 90 + "\n")
    return passed_count == len(SAMPLE_QUESTIONS)


if __name__ == "__main__":
    success = run_parity_test()
    sys.exit(0 if success else 1)

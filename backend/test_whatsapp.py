"""
test_whatsapp.py - Quick local test script for Sell Smart WhatsApp Bot.
Run with: python test_whatsapp.py
"""

import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from whatsapp_bot import generate_whatsapp_response

def run_tests():
    test_queries = [
        ("Marathi Onion Query", "माझ्याकडे २० क्विंटल कांदा आहे, लासलगावला भाव काय मिळेल?"),
        ("Marathi Tomato Query", "टोमॅटो आता विकू की थांबू?"),
        ("Hindi Soybean Query", "सोयाबीन २५ क्विंटल कहाँ बेचना चाहिए?"),
        ("English Onion Query", "Should I sell my 40 quintal onions today or hold?"),
    ]

    print("=" * 60)
    print(" SELL SMART WHATSAPP BOT LOCAL VERIFICATION TEST")
    print("=" * 60)

    for title, query in test_queries:
        print(f"\n[TEST] {title}")
        print(f"Farmer Query: \"{query}\"")
        print("-" * 40)
        reply = generate_whatsapp_response(query)
        print(reply)
        print("=" * 60)

if __name__ == "__main__":
    run_tests()

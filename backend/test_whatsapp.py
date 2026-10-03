"""
test_whatsapp.py - Quick local test script for Mohra WhatsApp Bot.
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
        ("Niphad Farmer Onion Query (Dynamic Village Origin)", "मी निफाडचा शेतकरी आहे, २० क्विंटल कांदा कुठे विकू?"),
        ("Sinnar Farmer Tomato Query (Dynamic Village Origin)", "I am a farmer in Sinnar with 30 quintals tomato, where should I sell?"),
        ("Marathi Tomato Query", "टोमॅटो आता विकू की थांबू?"),
        ("Hindi Soybean Query", "सोयाबीन २५ क्विंटल कहाँ बेचना चाहिए?"),
        ("English Onion Query", "Should I sell my 40 quintal onions today or hold?"),
    ]

    print("=" * 60)
    print(" Mohra WHATSAPP BOT LOCAL VERIFICATION TEST")
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

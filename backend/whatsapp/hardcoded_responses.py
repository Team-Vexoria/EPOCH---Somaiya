"""
hardcoded_responses.py - Fast Deterministic Custom Responses for WhatsApp Bot.

Add any custom question patterns and answers here for instant zero-latency responses
on the WhatsApp Business Bot.
"""

from typing import Optional, List, Dict

# ---------------------------------------------------------------------------
# Easy-to-edit Custom Q&A Mapping Table
# ---------------------------------------------------------------------------
CUSTOM_RESPONSES: List[Dict] = [
    {
        # Greeting / Start
        "keywords": ["hi", "hello", "hey", "start", "namaste", "namaskar", "help"],
        "reply": (
            "🌾 *Welcome to Mohra (मोहरा) Agricultural Market Advisor!*\n\n"
            "Here are today's verified APMC market price ranges (October 2026):\n\n"
            "• *Tomato (टोमॅटो):* ₹2,800 – ₹4,200 / quintal (approx. ₹28 – ₹42 / kg) — Pimpalgaon Baswant APMC (Sell fresh within 24–48h)\n"
            "• *Onion (कांदा):* ₹2,500 – ₹4,800 / quintal (prevailing ₹3,800 – ₹4,200 / quintal) — Lasalgaon APMC (Hold in aerated chawl)\n"
            "• *Soybean (सोयाबीन):* ₹5,400 – ₹6,200 / quintal (MSP ₹5,708 / quintal) — Malegaon APMC\n\n"
            "💬 *How can I help you?*\n"
            "Type any question about crop prices, best mandi to sell, transport cost, pest control, or government schemes."
        )
    },
    {
        # Tomato price query
        "keywords": ["tomato", "टमाटर", "टोमॅटो", "tamatar"],
        "reply": (
            "🍅 *Tomato Market Advisory (Pimpalgaon Baswant APMC)*\n\n"
            "• *Current Price Range:* ₹2,800 – ₹4,200 / quintal (approx. *₹28 – ₹42 / kg*)\n"
            "• *Top Mandi:* Pimpalgaon Baswant APMC\n"
            "• *Perishability Risk:* High! (15–20% crate loss within 48h)\n\n"
            "💡 *Advisory:* **SELL NOW.** Do not hold tomatoes in storage. Dispatch immediately to the nearest high-volume APMC for maximum realization."
        )
    },
    {
        # Onion price / where to sell query
        "keywords": ["onion", "कांदा", "कांदे", "प्याज", "pyaj", "kanda", "lasalgaon", "लासलगाव"],
        "reply": (
            "🧅 *Onion Market Advisory & Net Return Analysis*\n\n"
            "• *Current Price Range:* ₹2,500 – ₹4,800 / quintal (Prevailing auction range: *₹3,800 – ₹4,200 / quintal*)\n"
            "• *Top Recommended Mandi:* **Lasalgaon APMC**\n\n"
            "📍 *From Niphad (18 km):*\n"
            "• Transport Freight: ₹36 / quintal\n"
            "• Estimated Net Return: *₹3,764 – ₹4,164 / quintal*\n\n"
            "💡 *Storage Advisory:* Safe to hold in ventilated aerated chawls. The 1.2% weekly shrinkage is easily offset by projected festival price appreciation."
        )
    },
    {
        # Soybean price query
        "keywords": ["soybean", "सोयाबीन", "soyabean"],
        "reply": (
            "🌱 *Soybean Market Advisory (Malegaon APMC)*\n\n"
            "• *Current Price Range:* ₹5,400 – ₹6,200 / quintal (*₹54 – ₹62 / kg*)\n"
            "• *Govt MSP (2026-27):* ₹5,708 / quintal\n"
            "• *Top Mandi:* Malegaon APMC\n\n"
            "💡 *Advisory:* Safe dry godown storage with minimal 0.1% loss. Sell if market price exceeds ₹5,800/qtl."
        )
    },
    {
        # Pest / Disease / Karpa query
        "keywords": ["karpa", "करपा", "disease", "medicine", "औषध", "spray", "रोग", "thrips", "थ्रिप्स"],
        "reply": (
            "🛡️ *Crop Pest & Disease Management Advisory*\n\n"
            "*1. For Karpa (Purple Blotch) in Onion / Tomato:*\n"
            "• *Chemical Control:* Spray **Mancozeb 75% WP** (2.5 g/liter water) or **Azoxystrobin 23% SC** (1 ml/liter water).\n"
            "• *Organic Option:* Spray 5% Neem seed kernel extract (NSKE) or Dashparni ark.\n\n"
            "*2. For Thrips (बोकड्या):*\n"
            "• Spray **Fipronil 5% SC** (1.5 ml/liter) or **Profenofos 50% EC** (2 ml/liter) during evening hours.\n\n"
            "⚠️ *Tip:* Always use a sticker/spreader agent (0.5 ml/liter) for better rain-fastness."
        )
    },
    {
        # PM-Kisan / Government schemes query
        "keywords": ["pm kisan", "pm-kisan", "योजना", "scheme", "installment", "हप्ता", "fasal bima", "विमा"],
        "reply": (
            "🏛️ *Government Agricultural Schemes Advisory*\n\n"
            "• *PM-Kisan Samman Nidhi:* Provides ₹6,000/year in 3 equal installments of ₹2,000 directly to farmer bank accounts via DBT.\n"
            "• *PM Fasal Bima Yojana (PMFBY):* Comprehensive crop insurance against drought, unseasonal rains, and pests (Premium: 2% Kharif, 1.5% Rabi, ₹1 token in Maharashtra).\n"
            "• *Kusum Solar Scheme:* 90% subsidy on solar agricultural water pumps for irrigation.\n\n"
            "📱 Check status on official portal: https://pmkisan.gov.in"
        )
    },
    {
        # Transport / Freight query
        "keywords": ["freight", "transport", "वाहतूक", "खर्च", "भाडे", "km", "distance"],
        "reply": (
            "🚚 *Nashik District Village-to-Mandi Freight Rates (Per Quintal):*\n\n"
            "• *Niphad ➔ Lasalgaon (18 km):* ₹36 / quintal\n"
            "• *Niphad ➔ Pimpalgaon (22 km):* ₹44 / quintal\n"
            "• *Niphad ➔ Nashik APMC (38 km):* ₹76 / quintal\n"
            "• *Dindori ➔ Pimpalgaon (16 km):* ₹32 / quintal\n"
            "• *Yeola ➔ Lasalgaon (28 km):* ₹56 / quintal\n\n"
            "💡 *Tip:* Use Mohra FPO bulk pooling to reduce freight costs by up to 28%."
        )
    }
]


def get_hardcoded_response(message_text: str) -> Optional[str]:
    """
    Checks if message matches any custom keywords.
    Returns formatted custom response if matched, else None.
    """
    if not message_text:
        return None

    clean = message_text.strip().lower()

    for item in CUSTOM_RESPONSES:
        keywords = item.get("keywords", [])
        # Check if any keyword is in the incoming message
        if any(kw.lower() in clean for kw in keywords):
            return item.get("reply")

    return None

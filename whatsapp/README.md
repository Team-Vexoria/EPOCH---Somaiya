# 🌾 Mohra WhatsApp Advisory Bot (Meta Cloud API Integration)

This module integrates Meta WhatsApp Business Cloud API directly with the existing **Mohra (Sell Smart)** agricultural AI assistant.

The WhatsApp bot has **100% parity** with the website assistant:
- **Same Core Function:** Imports and calls `execute_crag_pipeline()` / `ask_crag()` from [`backend/crag_app.py`](../backend/crag_app.py).
- **Same System Prompt:** `PROMPT_QA` with verified October 3, 2026 APMC spot rates (Tomato ₹35/kg, Onion ₹40/kg, Soybean ₹57/kg MSP).
- **Same Knowledge Base & Retrieval:** Vector similarity retrieval over ChromaDB + Agmarknet web search fallback via Tavily.
- **Same Dynamic Village Matrix:** Real-time distance and freight calculation from 15+ Nashik villages (Niphad, Dindori, Yeola, etc.) to all regional APMC mandis.
- **Same Multilingual Engine:** Full native support for Marathi (मराठी), Hindi (हिन्दी), and English.

---

## Directory Structure

```
backend/whatsapp/
├── __init__.py           # Package exports
├── client.py             # Meta Graph API sender & HMAC signature verifier
├── formatter.py          # WhatsApp markdown formatter & paragraph splitter
├── router.py             # FastAPI APIRouter (/webhook, /health, /whatsapp/test)
├── service.py            # Context manager & CRAG execution engine
├── store.py              # SQLite store for per-phone memory & conversation turns
└── README.md             # Detailed documentation
```

See [backend/whatsapp/README.md](../backend/whatsapp/README.md) for full configuration, setup instructions, ngrok setup, and troubleshooting tables.

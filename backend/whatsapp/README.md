# 🌾 Mohra WhatsApp Advisory Bot (Meta Cloud API Integration)

This module integrates Meta WhatsApp Business Cloud API directly with the existing **Mohra (Sell Smart)** agricultural AI assistant.

The WhatsApp bot has **100% parity** with the website assistant:
- **Same Core Function:** Imports and calls `execute_crag_pipeline()` / `ask_crag()` from [`backend/crag_app.py`](../crag_app.py).
- **Same System Prompt:** `PROMPT_QA` with verified October 3, 2026 APMC spot rates (Tomato ₹35/kg, Onion ₹40/kg, Soybean ₹57/kg MSP).
- **Same Knowledge Base & Retrieval:** Vector similarity retrieval over ChromaDB + Agmarknet web search fallback via Tavily.
- **Same Dynamic Village Matrix:** Real-time distance and freight calculation from 15+ Nashik villages (Niphad, Dindori, Yeola, etc.) to all regional APMC mandis.
- **Same Multilingual Engine:** Full native support for Marathi (मराठी), Hindi (हिन्दी), and English.

---

## Architecture & Code Reuse

```
[ WhatsApp User ] 
       │ (Sends message via WhatsApp)
       ▼
[ Meta Cloud API ] ──(POST /webhook)──▶ [ FastAPI Server: server.py ]
                                                │
                                                ▼
                                    [ whatsapp/router.py ]
                                    (HMAC SHA-256 Validation)
                                                │
                                                ▼
                                    [ whatsapp/service.py ]
                                    (Profile & Context Manager)
                                                │
                                                ▼
                                    [ backend/crag_app.py ]
                                    (Core execute_crag_pipeline)
                                                │
                                                ▼
                                    [ whatsapp/formatter.py ]
                                    (Clean WhatsApp Markdown)
                                                │
                                                ▼
[ WhatsApp User ] ◀──(POST Graph API)─── [ whatsapp/client.py ]
```

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
└── README.md             # This documentation
```

---

## Environment Configuration (.env)

Add the following variables to your `backend/.env` file:

```env
# Meta WhatsApp Cloud API Credentials
WA_TOKEN=EAA...Your_Meta_Access_Token_Here...
PHONE_NUMBER_ID=1302410119630044
APP_SECRET=2268c6fa73d0f8f67421d4917c33098e
VERIFY_TOKEN=sellsmart_verify_2026
GRAPH_VERSION=v25.0

# LLM & Search Engine (Shared with Website)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_FAST_MODEL=llama-3.1-8b-instant
TAVILY_API_KEY=tvly-dev-...
```

---

## Running Locally

### 1. Start the FastAPI Backend Server
```bash
cd backend
.\venv\Scripts\activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Expose Local Server to the Internet via Ngrok
```bash
ngrok http 8000
```
Note down your HTTPS forwarding URL, for example: `https://abcd-12-34-56-78.ngrok-free.app`.

---

## Registering the Webhook in Meta Developers Console

1. Navigate to the **[Meta for Developers Console](https://developers.facebook.com/apps/)** and select your WhatsApp App.
2. Under **WhatsApp** > **Configuration**, find the **Webhook** section and click **Edit**.
3. Fill in the fields:
   - **Callback URL:** `https://<your-ngrok-domain>/webhook` (e.g. `https://abcd-12-34-56-78.ngrok-free.app/webhook`)
   - **Verify Token:** `sellsmart_verify_2026` (must match `VERIFY_TOKEN` in `.env`)
4. Click **Verify and Save**. Meta will send a `GET /webhook` challenge request; the server will respond with HTTP 200.
5. In the **Webhook fields** table, click **Manage** and subscribe to:
   - `messages` (Mandatory: triggers on incoming user text, voice, and media)

---

## Testing & Parity Verification

### 1. Automated Webhook Security & Verification Test
```bash
python scripts/webhook_test.py
```
Validates:
- `GET /health` returns HTTP 200.
- `GET /webhook` challenge handshake with valid & invalid tokens.
- `POST /webhook` HMAC-SHA256 signature verification.
- In-memory message deduplication.

### 2. Assistant Parity Test (Website vs WhatsApp)
```bash
python scripts/parity_test.py
```
Runs 6 sample farmer questions in Marathi, Hindi, and English through both the Website assistant pipeline and WhatsApp handler, displaying side-by-side results.

### 3. Unit Tests for Formatter
```bash
python -m unittest tests/test_formatter.py
```

---

## Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Verification fails (`The URL couldn't be validated`)** | Wrong `VERIFY_TOKEN` or server not publicly accessible. | Ensure ngrok is running on port 8000 and `VERIFY_TOKEN` in Meta matches `backend/.env`. |
| **No messages arrive after sending to WhatsApp** | Webhook not subscribed to `messages` field in Meta. | Go to Meta App Dashboard -> WhatsApp -> Configuration -> Webhook fields -> Subscribe to `messages`. |
| **Replies not showing in WhatsApp** | `WA_TOKEN` expired or invalid `PHONE_NUMBER_ID`. | Meta temporary tokens expire after 24h. Generate a new System User Token from Meta Developers Console and update `WA_TOKEN`. |
| **Meta returns 401 Unauthorized** | Expired OAuth token (`Error 190`). | Refresh `WA_TOKEN` in `backend/.env` and restart the backend server. |
| **Duplicate replies sent to user** | Meta retrying unacknowledged webhook deliveries. | The server returns HTTP 200 immediately before asynchronous processing and deduplicates via `msg.id` in `store.py`. |
| **Marathi/Hindi text rendering corrupted** | Windows console encoding mismatch. | All handlers use UTF-8 and store text as Unicode. Ensure stdout reconfigures to UTF-8 on Windows. |

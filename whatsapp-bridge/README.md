# Sell Smart — Meta WhatsApp Business Cloud API Bridge

This standalone bridge service connects the Meta WhatsApp Business Cloud API (Graph API `v25.0`) with the **Sell Smart AI Advisory Engine** to provide real-time APMC Mandi advice to farmers directly via WhatsApp.

---

## 🚀 Quick Setup & Run

### 1. Install Dependencies
```bash
cd whatsapp-bridge
npm install
```

### 2. Configure `.env`
Environment variables are pre-configured in `.env`:
```env
WA_TOKEN=EAAfoXHOdn9oBSlETyZChVBIF6wMYQ3ZBZBVoSuDP1nHT9DzkhI0EZCgzRpJIaGdXSO5gIOEdiHU40HKBhsBmUGuYLUspZAPNGeatOZC2muuXB6f5u1DMBdPh2gGFsnQHIlS0ZCsD9EYysmJZCpamYiKiZA1isQ1ZCUA9DZAwUu8GbrBfDJAnBkb27Ua1R7FbLWXhamx8knKZBZBwWyg6ZARycPPlwnSoM1nZAexnEPzjubFLQrwzv6bLsZCilx3hPZBd65cXeaxj6LDO3SuOyAZBS8RIVCoS95U6ZC6OwZDZD
PHONE_NUMBER_ID=1302410119630044
APP_SECRET=2268c6fa73d0f8f67421d4917c33098e
VERIFY_TOKEN=sellsmart_verify_2026
GRAPH_VERSION=v25.0
CHAT_API_URL=http://localhost:8000/ask
PORT=3000
```

### 3. Start the Bridge Server
```bash
npm start
```
The server will start on `http://localhost:3000`.

### 4. Run Automated Webhook Tests
In another terminal:
```bash
npm test
```

---

## 🌐 Meta Developer Portal Webhook Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App → WhatsApp → Configuration.
2. Expose your port with ngrok or Cloudflare tunnel:
   ```bash
   ngrok http 3000
   ```
3. Set **Callback URL**: `https://<YOUR_NGROK_SUBDOMAIN>.ngrok-free.app/webhook`
4. Set **Verify Token**: `sellsmart_verify_2026`
5. Click **Verify and Save**.
6. Under Webhook Fields, subscribe to **`messages`**.

---

## 🐍 Alternative: Direct Python FastAPI Server
You can also run the WhatsApp bot directly inside the FastAPI backend (port 8000):
```bash
cd backend
python test_meta_whatsapp.py
```
Webhook URL: `https://<YOUR_NGROK_SUBDOMAIN>.ngrok-free.app/whatsapp/meta`
Verify Token: `sellsmart_verify_2026`

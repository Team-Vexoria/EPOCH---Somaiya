/**
 * index.js - Meta WhatsApp Business Cloud API v25.0 Bridge Server
 * Listens on PORT (default 3000) for Meta WhatsApp Webhooks.
 * Forwards farmer queries to CHAT_API_URL (FastAPI CRAG) and dispatches replies via Meta Graph API.
 */

import express from "express";
import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const WA_TOKEN = process.env.WA_TOKEN || process.env.META_ACCESS_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || "";
const APP_SECRET = process.env.APP_SECRET || process.env.META_APP_SECRET || "";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || "sellsmart_verify_2026";
const GRAPH_VERSION = (process.env.GRAPH_VERSION || "v25.0").replace(/^([^v])/, "v$1");
const CHAT_API_URL = process.env.CHAT_API_URL || "http://localhost:8000/ask";

// Store raw body for HMAC SHA256 signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

/**
 * HMAC-SHA256 signature validation
 */
function verifySignature(req) {
  if (!APP_SECRET) return true;
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const [method, sigHash] = signature.split("=");
  if (method !== "sha256" || !sigHash) return false;

  const expectedHash = crypto
    .createHmac("sha256", APP_SECRET)
    .update(req.rawBody || "")
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(sigHash), Buffer.from(expectedHash));
}

/**
 * Send WhatsApp reply via Meta Graph API v25.0
 */
async function sendWhatsAppMessage(recipientPhone, messageText) {
  if (!WA_TOKEN || !PHONE_NUMBER_ID) {
    console.warn("⚠️ WA_TOKEN or PHONE_NUMBER_ID not configured — cannot send WhatsApp reply.");
    return false;
  }

  const cleanPhone = recipientPhone.replace(/\D/g, "");
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "text",
    text: { body: messageText, preview_url: false },
  };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
    console.log(`✅ WhatsApp reply sent to ${cleanPhone} — status ${res.status}`);
    return true;
  } catch (err) {
    const errData = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error(`❌ Meta Graph API Send Error: ${errData}`);
    return false;
  }
}

/**
 * Query Sell Smart CRAG AI Backend for Farmer Advisory
 */
async function queryAdvisoryBackend(userText, senderPhone) {
  try {
    const res = await axios.post(
      CHAT_API_URL,
      {
        question: userText,
      },
      { timeout: 15000 }
    );
    if (res.data && res.data.answer) {
      return (
        `🌾 *Sell Smart AI कृषी सल्लागार*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `${res.data.answer.trim()}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📍 *इतर पिकांसाठी उत्तर पाठवा:*\n` +
        `• *१* - कांदा (Onion)  • *२* - टोमॅटो (Tomato)  • *३* - सोयाबीन (Soybean)\n` +
        `🌐 *थेट नकाशा व कॅल्क्युलेटर:* https://sellsmart.app`
      );
    }
  } catch (err) {
    console.warn(`CRAG Backend unavailable (${err.message}) — using built-in template fallback.`);
  }

  // Built-in fallback template if FastAPI backend is not running
  const lower = userText.toLowerCase();
  if (lower.includes("tomato") || lower.includes("टोमॅटो") || lower.includes("टमाटर") || userText === "2") {
    return (
      `🌾 *Sell Smart कृषी सल्लागार (नाशिक जिल्हा)*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *पीक:* टोमॅटो (Tomato)\n` +
      `🏷️ *निर्णय:* *आजच विक्री करा (SELL IMMEDIATELY)*\n` +
      `👑 *सर्वोत्तम बाजार:* *पिंपळगाव बसवंत बाजार समिती (Pimpalgaon Baswant)*\n` +
      `💰 *अपेक्षित फायदा:* *+₹120 / क्विंटल*\n` +
      `💵 *एकूण हातात रक्कम:* *₹32,400* (20 क्विंटलसाठी)\n\n` +
      `📊 *बाजार समितीनिहाय निव्वळ नफा तुलना:*\n` +
      `1️⃣ *पिंपळगाव (Pimpalgaon)* (16 km)\n` +
      `   • भाव: ₹1,680 | वाहतूक: -₹30\n` +
      `   • *हातात निव्वळ: ₹1,620 / qtl*\n` +
      `2️⃣ *नाशिक पंचवटी (Nashik)* (28 km)\n` +
      `   • भाव: ₹1,610 | वाहतूक: -₹45\n` +
      `   • *हातात निव्वळ: ₹1,530 / qtl*\n\n` +
      `⚠️ *सावधान:* टोमॅटो अतिनाशवंत पीक आहे. सध्या दमट वातावरणामुळे क्रेटमध्ये २०% पर्यंत सड होण्याची जोखीम आहे. आजच विक्री करा.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 *इतर पिकांसाठी उत्तर पाठवा:*\n` +
      `• *१* - कांदा  • *२* - टोमॅटो  • *३* - सोयाबीन\n` +
      `🌐 *थेट नकाशा:* https://sellsmart.app`
    );
  }

  if (lower.includes("soybean") || lower.includes("सोयाबीन") || userText === "3") {
    return (
      `🌾 *Sell Smart कृषी सल्लागार (नाशिक जिल्हा)*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *पीक:* सोयाबीन (Soybean)\n` +
      `🏷️ *निर्णय:* *१५ दिवस माल थांबवा (HOLD 15 DAYS)*\n` +
      `👑 *सर्वोत्तम बाजार:* *मालेगाव बाजार समिती (Malegaon APMC)*\n` +
      `💰 *अपेक्षित फायदा:* *+₹110 / क्विंटल*\n` +
      `💵 *एकूण हातात रक्कम:* *₹89,200* (20 क्विंटलसाठी)\n\n` +
      `📊 *बाजार समितीनिहाय निव्वळ नफा तुलना:*\n` +
      `1️⃣ *मालेगाव (Malegaon)* (35 km)\n` +
      `   • भाव: ₹4,520 | वाहतूक: -₹55\n` +
      `   • *हातात निव्वळ: ₹4,460 / qtl*\n\n` +
      `💡 *ओलावा सल्ला:* बाजारात नेण्यापूर्वी दाण्यातील ओलावा १०% पेक्षा कमी असावा.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 *इतर पिकांसाठी उत्तर पाठवा:*\n` +
      `• *१* - कांदा  • *२* - टोमॅटो  • *३* - सोयाबीन\n` +
      `🌐 *थेट नकाशा:* https://sellsmart.app`
    );
  }

  // Default: Onion
  return (
    `🌾 *Sell Smart कृषी सल्लागार (नाशिक जिल्हा)*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 *पीक:* कांदा (Onion)\n` +
    `🏷️ *निर्णय:* *१० दिवस माल थांबवा (HOLD 10 DAYS)*\n` +
    `👑 *सर्वोत्तम बाजार:* *लासलगाव बाजार समिती (Lasalgaon APMC)*\n` +
    `💰 *अपेक्षित फायदा:* *+₹180 / क्विंटल*\n` +
    `💵 *एकूण हातात रक्कम:* *₹48,000* (20 क्विंटलसाठी)\n\n` +
    `📊 *बाजार समितीनिहाय निव्वळ नफा तुलना:*\n` +
    `1️⃣ *लासलगाव (Lasalgaon)* (18 km)\n` +
    `   • भाव: ₹2,460 | वाहतूक: -₹35\n` +
    `   • *हातात निव्वळ: ₹2,400 / qtl*\n` +
    `2️⃣ *पिंपळगाव (Pimpalgaon)* (24 km)\n` +
    `   • भाव: ₹2,390 | वाहतूक: -₹42\n` +
    `   • *हातात निव्वळ: ₹2,323 / qtl*\n\n` +
    `🔍 *सल्ला कारण:* दक्षिणेकडील राज्यांतून मागणी वाढल्याने आणि लासलगाव बाजारात आवक १४% कमी झाल्याने दर सुधारत आहेत.\n` +
    `💡 *चाळ सल्ला:* कांदा हवादार चाळीत ठेवा. आठवड्याला १.२% वजनातील घट भावातील वाढीपेक्षा खूप कमी आहे.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 *इतर पिकांसाठी उत्तर पाठवा:*\n` +
    `• *१* - कांदा  • *२* - टोमॅटो  • *३* - सोयाबीन\n` +
    `🌐 *थेट नकाशा व कॅल्क्युलेटर:* https://sellsmart.app`
  );
}

// ---------------------------------------------------------------------------
// Health and Status Endpoints
// ---------------------------------------------------------------------------
app.get("/", (_req, res) => {
  res.json({
    service: "Sell Smart Meta WhatsApp Bridge",
    status: "running",
    graph_version: GRAPH_VERSION,
    port: PORT,
    phone_number_id: PHONE_NUMBER_ID || "missing",
    chat_backend: CHAT_API_URL,
    verify_token_set: Boolean(VERIFY_TOKEN),
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Meta Webhook Verification (GET /webhook and GET /whatsapp/meta)
// ---------------------------------------------------------------------------
const handleVerification = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log(`✅ Meta Webhook verification succeeded with token: ${token}`);
    return res.status(200).send(challenge);
  }
  console.warn(`❌ Meta Webhook verification failed. Received token: ${token}, Expected: ${VERIFY_TOKEN}`);
  return res.sendStatus(403);
};

app.get("/webhook", handleVerification);
app.get("/whatsapp/meta", handleVerification);

// ---------------------------------------------------------------------------
// Meta Webhook Event Ingestion (POST /webhook and POST /whatsapp/meta)
// ---------------------------------------------------------------------------
const handleWebhookEvent = async (req, res) => {
  if (APP_SECRET && !verifySignature(req)) {
    console.warn("❌ Webhook HMAC signature verification failed.");
    return res.sendStatus(403);
  }

  // Always return 200 OK immediately to Meta to prevent retry storms
  res.status(200).send("EVENT_RECEIVED");

  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};

        // Ignore status updates (sent, delivered, read)
        if (value.statuses && !value.messages) {
          continue;
        }

        for (const message of value.messages || []) {
          const sender = message.from;
          let userText = "";

          if (message.type === "text") {
            userText = (message.text && message.text.body) || "";
          } else if (message.type === "interactive") {
            const inter = message.interactive;
            userText =
              (inter.button_reply && (inter.button_reply.title || inter.button_reply.id)) ||
              (inter.list_reply && (inter.list_reply.title || inter.list_reply.id)) ||
              "";
          } else if (message.type === "button") {
            userText = message.button && message.button.text;
          }

          if (!userText || !userText.trim()) continue;

          console.log(`📩 Incoming message from ${sender}: "${userText.trim()}"`);

          const replyText = await queryAdvisoryBackend(userText.trim(), sender);
          await sendWhatsAppMessage(sender, replyText);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error processing webhook payload:", err);
  }
};

app.post("/webhook", handleWebhookEvent);
app.post("/whatsapp/meta", handleWebhookEvent);

// ---------------------------------------------------------------------------
// Direct Outbound Message Test API
// ---------------------------------------------------------------------------
app.post("/api/send", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: "'to' and 'message' fields are required." });
  }

  const success = await sendWhatsAppMessage(to, message);
  if (success) {
    return res.json({ success: true, to, message: "Message dispatched via Meta Graph API." });
  }
  return res.status(500).json({ success: false, error: "Failed to dispatch message via Meta Graph API." });
});

// Start listening
app.listen(PORT, () => {
  console.log(`\n========================================================`);
  console.log(`🚀 Sell Smart WhatsApp Meta Bridge Server Started`);
  console.log(`========================================================`);
  console.log(`• Listening on Port : http://localhost:${PORT}`);
  console.log(`• Webhook Endpoint  : http://localhost:${PORT}/webhook`);
  console.log(`• Meta Graph Version: ${GRAPH_VERSION}`);
  console.log(`• Phone Number ID   : ${PHONE_NUMBER_ID}`);
  console.log(`• Verify Token      : ${VERIFY_TOKEN}`);
  console.log(`• Advisory Backend  : ${CHAT_API_URL}`);
  console.log(`========================================================\n`);
});

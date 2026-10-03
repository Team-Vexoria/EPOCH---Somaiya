/**
 * test_webhook.js - Local automated tester for WhatsApp Bridge server
 */

import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "Mohra_verify_2026";
const APP_SECRET = process.env.APP_SECRET || "";

async function runBridgeTests() {
  console.log("\n=======================================================");
  console.log(" 🧪 TESTING Mohra WHATSAPP NODE.JS BRIDGE SERVER");
  console.log("=======================================================");

  // 1. Health check
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log("1. Health Check -> Status:", health.status, health.data);
  } catch (err) {
    console.error("❌ Bridge server is not running at", BASE_URL);
    console.error("Please start it first with: npm start in whatsapp-bridge directory.");
    return;
  }

  // 2. Webhook GET Challenge verification
  try {
    const challenge = "Mohra_challenge_node_12345";
    const resp = await axios.get(`${BASE_URL}/webhook`, {
      params: {
        "hub.mode": "subscribe",
        "hub.verify_token": VERIFY_TOKEN,
        "hub.challenge": challenge,
      },
    });
    console.log("2. Webhook GET Verification -> Status:", resp.status, "Challenge Echo:", resp.data);
    if (resp.data == challenge) {
      console.log("   ✓ GET Verification PASSED!");
    }
  } catch (err) {
    console.error("❌ GET Verification failed:", err.message);
  }

  // 3. Webhook POST Simulated Farmer Message
  try {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "1302410119630044",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "1302410119630044",
                  phone_number_id: "1302410119630044",
                },
                messages: [
                  {
                    from: "919822012345",
                    id: "wamid.test001",
                    timestamp: "1741234567",
                    type: "text",
                    text: { body: "कांदा 30 क्विंटल" },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ];

      const rawJson = JSON.stringify(payload);
      const headers = { "Content-Type": "application/json" };

      if (APP_SECRET) {
        const sig = crypto.createHmac("sha256", APP_SECRET).update(rawJson).digest("hex");
        headers["X-Hub-Signature-256"] = `sha256=${sig}`;
      }

      const postResp = await axios.post(`${BASE_URL}/webhook`, rawJson, { headers });
      console.log("3. Webhook POST Simulated Message -> Status:", postResp.status, postResp.data);
      console.log("   ✓ POST Inbound Event PASSED!");
  } catch (err) {
    console.error("❌ POST Message simulation failed:", err.message);
  }

  console.log("\n=======================================================");
  console.log(" ✅ ALL NODE.JS BRIDGE TESTS COMPLETED!");
  console.log("=======================================================\n");
}

runBridgeTests();

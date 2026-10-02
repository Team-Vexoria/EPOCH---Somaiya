# KJSIT Oct 2026 Hackathon Problem Statements

## PS 1: Sell Smart: "Where and When to Sell" Advisory for Farmers and FPOs
**Domain:** Agriculture

---

### Background
Most small farmers sell their produce at the nearest mandi right after harvest, when heavy arrivals push prices down. A mandi 40 km away may be paying far more, and prices may rise in two weeks, but farmers have no easy way to know this or to judge whether waiting is worth the risk. Existing tools mostly show today's prices or give a single price forecast. They don't answer the real decision a farmer faces: *should I sell now or hold, and which mandi gives me the most money in hand?*

---

### Problem
Farmers and Farmer Producer Organisations (FPOs) lack a decision tool that combines future prices, transport costs, and crop spoilage into one clear recommendation. As a result, they make distress sales, lose income to intermediaries, and either wait too long and suffer spoilage or sell too early and miss better prices.

---

### Proposed Solution
Build an advisory system that tells farmers where and when to sell for the best net return.

* **Net price comparison across mandis:** Forecast prices at 10–15 nearby mandis for the next 1–3 weeks and subtract estimated transport cost from the farmer's village, so the recommendation reflects actual money in hand, not just the highest mandi price.
* **Sell now or hold advice:** Weigh expected price gain against spoilage and storage loss for each crop. For example, onions can be held for weeks, while tomatoes must be sold within days. The output is a clear recommendation such as:
  > *"Hold 10 days, sell at Lasalgaon, expected gain ₹180/quintal."*
* **Honest uncertainty:** Show a likely price range with a confidence level such as high, medium, or low instead of a single number, so farmers understand the risk of waiting.
* **WhatsApp and voice interface:** Farmers send their crop, quantity, and village by WhatsApp text or voice note in Marathi or Hindi, and receive a short reply in their language, with no app download needed.
* **Proven rupee impact:** Backtest the advisory on past seasons to show how much more a farmer would have earned by following it compared with selling at the nearest mandi on harvest day.
* **FPO bulk mode:** A simple dashboard for FPOs to plan where to send bulk produce across mandis.

---

### Scope for the Prototype
* **Region / State:** One state (for example, Maharashtra)
* **Target Crops:** Three crops with different shelf lives (e.g., onion, tomato, soybean)
* **Market Coverage:** 10–15 major mandis

---

*(Note: Problem Statement 2 listed on page: "PS 2: AI-Powered YouTube Thumbnail Attention Heatmap | Domain: AI & Machine Learning")*

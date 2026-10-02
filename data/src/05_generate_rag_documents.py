import json
import re
import sys
from pathlib import Path
import pandas as pd

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parents[1]

HISTORY_FILE = (
    ROOT / "processed" / "nashik_200km_monthly_prices.csv"
    if (ROOT / "processed" / "nashik_200km_monthly_prices.csv").exists()
    else ROOT / "data" / "processed" / "nashik_200km_monthly_prices.csv"
)
FORECAST_FILE = (
    ROOT / "outputs" / "baseline_forecasts.csv"
    if (ROOT / "outputs" / "baseline_forecasts.csv").exists()
    else ROOT / "data" / "outputs" / "baseline_forecasts.csv"
)
BACKTEST_FILE = (
    ROOT / "outputs" / "baseline_backtest.csv"
    if (ROOT / "outputs" / "baseline_backtest.csv").exists()
    else ROOT / "data" / "outputs" / "baseline_backtest.csv"
)

RAG_DIR = ROOT / "rag" if (ROOT / "processed").exists() else ROOT / "data" / "rag"
RAG_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = RAG_DIR / "mandi_documents.jsonl"

history = pd.read_csv(HISTORY_FILE)
forecasts = pd.read_csv(FORECAST_FILE)
backtest = pd.read_csv(BACKTEST_FILE)

history["date"] = pd.to_datetime(history["date"])

# Keep only the best model chosen from your backtest
forecasts = forecasts[forecasts["model"] == "moving_average_3m"].copy()
backtest = backtest[backtest["model"] == "moving_average_3m"].copy()

# Latest actual historical price for every crop and mandi
latest_actual = (
    history.sort_values("date")
    .groupby(["crop", "mandi"])
    .tail(1)[["crop", "mandi", "date", "modal_price_rs_per_quintal"]]
    .rename(
        columns={
            "date": "latest_actual_month",
            "modal_price_rs_per_quintal": "latest_actual_price",
        }
    )
)

# Join forecast with latest actual historical value
rag_data = forecasts.merge(latest_actual, on=["crop", "mandi"], how="left")

# Join model error for each crop
rag_data = rag_data.merge(
    backtest[["crop", "mean_absolute_error_rs_per_quintal"]],
    on="crop",
    how="left",
)


def confidence_from_mae(mae):
    if mae < 350:
        return "High"
    elif mae <= 600:
        return "Medium"
    return "Low"


def clean_id(value):
    return re.sub(r"[^a-z0-9]+", "_", str(value).lower()).strip("_")


# Domain intelligence for shelf-life, hold durations, and multilingual terms
CROP_INTELLIGENCE = {
    "onion": {
        "name_mr": "कांदा",
        "name_hi": "प्याज",
        "shelf_life": "Semi-perishable (3–8 weeks in ventilated chawl)",
        "recommended_hold_days": "10 to 21 days",
        "hold_days_min": 10,
        "hold_days_max": 21,
        "action": "HOLD 10 to 21 days in ventilated storage (Chawl) if nearby price is low; monitor arrival gluts.",
        "action_mr": "१० ते २१ दिवस चाळीत साठवून ठेवा आणि भाववाढीवर विक्री करा.",
        "action_hi": "10 से 21 दिन हवादार भंडार (चाळ) में रखें और सही भाव मिलने पर बेचें।",
        "storage_spoilage_loss": "Storage loss is approx 0.5% weight loss per week in traditional chawl.",
    },
    "tomato": {
        "name_mr": "टोमॅटो",
        "name_hi": "टमाटर",
        "shelf_life": "Highly perishable (2–4 days without cold chain)",
        "recommended_hold_days": "0 to 2 days (Sell Now)",
        "hold_days_min": 0,
        "hold_days_max": 2,
        "action": "SELL NOW within 24–48 hours. Perishable crop; immediate spatial arbitrage across mandis recommended.",
        "action_mr": "त्वरित विक्री करा (नाशवंत पीक - २४ ते ४८ तासांत जवळच्या फायदेशीर बाजारात विका).",
        "action_hi": "तुरंत बेचें (नाशवान फसल - 24 से 48 घंटे में सबसे अच्छे नजदीकी मंडी में बेचें)।",
        "storage_spoilage_loss": "High risk of 4-5% decay per day without refrigerated cold storage.",
    },
    "soyabean": {
        "name_mr": "सोयाबीन",
        "name_hi": "सोयाबीन",
        "shelf_life": "Non-perishable dry grain (6–12 months)",
        "recommended_hold_days": "30 to 60 days",
        "hold_days_min": 30,
        "hold_days_max": 60,
        "action": "HOLD 30 to 60 days in dry moisture-proof warehouse if prices are currently depressed.",
        "action_mr": "३० ते ६० दिवस कोरड्या गोदामात साठवून ठेवा; भाव वाढल्यावर विक्री करा.",
        "action_hi": "30 से 60 दिन सुरक्षित सूखे गोदाम में रखें और तेजी आने पर बेचें।",
        "storage_spoilage_loss": "Negligible decay (<0.1% per month) if moisture content is below 10%.",
    },
}

documents = []

for row in rag_data.itertuples():
    crop_lower = str(row.crop).lower().strip()
    intel = CROP_INTELLIGENCE.get(crop_lower, CROP_INTELLIGENCE["onion"])

    mae = float(row.mean_absolute_error_rs_per_quintal)
    confidence = confidence_from_mae(mae)
    forecast_price = float(row.predicted_modal_price_rs_per_quintal)

    # Compute realistic lower and upper price bounds (Honest Uncertainty)
    price_low = max(0, round(forecast_price - mae, 2))
    price_high = round(forecast_price + mae, 2)

    document_id = f"{clean_id(row.crop)}_{clean_id(row.mandi)}"

    text = f"""
Crop: {row.crop.title()} ({intel['name_mr']} / {intel['name_hi']})
Mandi: {row.mandi}
Region: Nashik-centred Maharashtra agricultural cluster.

Current Status:
- Latest historical month: {pd.to_datetime(row.latest_actual_month).strftime("%B %Y")}
- Latest historical modal price: ₹{row.latest_actual_price:.0f} per quintal

Forecast & Honest Uncertainty:
- Forecast month: {pd.to_datetime(row.forecast_month).strftime("%B %Y")}
- Predicted modal price: ₹{forecast_price:.0f} per quintal
- Expected price range: ₹{price_low:.0f} to ₹{price_high:.0f} per quintal (±₹{mae:.0f} MAE)
- Model confidence: {confidence}

Shelf-Life & Hold Advisory:
- Crop shelf-life: {intel['shelf_life']}
- Recommended timing: {intel['recommended_hold_days']}
- Action: {intel['action']}
- मराठी सल्ला: {intel['action_mr']}
- हिंदी सलाह: {intel['action_hi']}

Storage & Spoilage Guidance:
- {intel['storage_spoilage_loss']}

Disclaimer: Historical advisory prototype based on APMC monthly records. Check live local AGMARKNET rates before final sale.
""".strip()

    documents.append({
        "id": document_id,
        "text": text,
        "metadata": {
            "crop": row.crop,
            "crop_mr": intel["name_mr"],
            "crop_hi": intel["name_hi"],
            "mandi": row.mandi,
            "forecast_month": row.forecast_month,
            "forecast_price_rs_per_quintal": round(forecast_price, 2),
            "price_range_low": price_low,
            "price_range_high": price_high,
            "confidence": confidence,
            "mae_rs_per_quintal": round(mae, 2),
            "recommended_hold_days": intel["recommended_hold_days"],
            "hold_days_min": intel["hold_days_min"],
            "hold_days_max": intel["hold_days_max"],
            "model": "moving_average_3m",
        },
    })

with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
    for document in documents:
        file.write(json.dumps(document, ensure_ascii=False) + "\n")

print(f"Created {len(documents)} enhanced RAG documents with price ranges & hold timing.")
print(f"Saved: {OUTPUT_FILE}")

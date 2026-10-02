import sys
from pathlib import Path
import chromadb
import pandas as pd

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parents[1]

DB_FOLDER = (
    ROOT / "chroma_db"
    if (ROOT / "chroma_db").exists()
    else ROOT / "data" / "chroma_db"
)
HISTORY_FILE = (
    ROOT / "processed" / "nashik_200km_monthly_prices.csv"
    if (ROOT / "processed" / "nashik_200km_monthly_prices.csv").exists()
    else ROOT / "data" / "processed" / "nashik_200km_monthly_prices.csv"
)
OUTPUT_DIR = (
    ROOT / "outputs"
    if (ROOT / "processed").exists()
    else ROOT / "data" / "outputs"
)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Approximate Nashik-to-mandi distances for the prototype.
# Edit these later if you obtain actual road-route distances.
DISTANCE_FROM_NASHIK_KM = {
    "nashik": 0,
    "pimpalgaon baswant": 35,
    "niphad": 37,
    "lasalgaon": 50,
    "vinchur": 53,
    "lasalgaon(vinchur)": 53,
    "sinnar": 31,
    "yeola": 74,
    "manmad": 78,
    "malegaon": 104,
    "nandgaon": 103,
    "chandwad": 63,
    "deola": 57,
    "satana": 78,
    "sangamner": 66,
    "rahata": 77,
    "kopargaon": 74,
    "shrirampur": 112,
    "rahuri": 111,
    "ahmednagar": 146,
    "vashi": 132,
}

# Clearly labelled prototype assumptions, in ₹ per quintal per month.
STORAGE_COST = {
    "onion": 25,
    "tomato": 250,
    "soyabean": 10,
}

TRANSPORT_COST_PER_KM_PER_QUINTAL = 2.5

# Flexible input handling (supports CLI args, stdin, or interactive prompts)
if len(sys.argv) >= 3:
    crop = sys.argv[1].strip().lower()
    quantity = float(sys.argv[2].strip())
elif len(sys.argv) == 2:
    crop = sys.argv[1].strip().lower()
    quantity = 50.0
else:
    try:
        crop = input("Crop (onion / tomato / soyabean): ").strip().lower()
        if not crop:
            crop = "onion"
        raw_qty = input("Quantity in quintals: ").strip()
        quantity = float(raw_qty) if raw_qty else 50.0
    except EOFError:
        crop = "onion"
        quantity = 50.0

if crop not in STORAGE_COST:
    raise ValueError("Use onion, tomato, or soyabean.")

# Retrieve every indexed document for the farmer's crop.
client = chromadb.PersistentClient(path=str(DB_FOLDER))
collection = client.get_collection("nashik_mandi_advisory")

retrieved = collection.get(
    where={"crop": crop},
    include=["documents", "metadatas"]
)

if not retrieved["metadatas"]:
    raise ValueError(f"No indexed mandi documents found for {crop}.")

# Rank expected return using the RAG-retrieved forecast metadata.
rankings = []

for metadata in retrieved["metadatas"]:
    mandi = metadata["mandi"]
    distance = DISTANCE_FROM_NASHIK_KM.get(mandi.lower())

    # Do not recommend a market when its transport distance is unknown.
    if distance is None:
        continue

    forecast_price = float(metadata["forecast_price_rs_per_quintal"])
    transport_cost = distance * TRANSPORT_COST_PER_KM_PER_QUINTAL
    storage_cost = STORAGE_COST[crop]

    net_price = forecast_price - transport_cost - storage_cost

    rankings.append({
        "crop": crop,
        "mandi": mandi,
        "distance_from_nashik_km": distance,
        "forecast_price_rs_per_quintal": round(forecast_price, 2),
        "transport_cost_rs_per_quintal": round(transport_cost, 2),
        "storage_cost_rs_per_quintal": storage_cost,
        "expected_net_price_rs_per_quintal": round(net_price, 2),
        "expected_net_return_rs": round(net_price * quantity, 2),
        "confidence": metadata["confidence"],
    })

if not rankings:
    raise ValueError("No retrievable mandis have a configured distance.")

ranking_df = pd.DataFrame(rankings).sort_values(
    "expected_net_price_rs_per_quintal",
    ascending=False
)

ranking_df.to_csv(
    OUTPUT_DIR / "rag_mandi_rankings.csv",
    index=False
)

best = ranking_df.iloc[0]

# Get the latest historical Nashik price for a simple sell-now comparison.
history = pd.read_csv(HISTORY_FILE)
history["date"] = pd.to_datetime(history["date"])

nashik_now = history[
    (history["crop"].str.lower() == crop)
    & (history["mandi"].str.lower() == "nashik")
].sort_values("date")

if len(nashik_now) > 0:
    sell_now_price = float(
        nashik_now.iloc[-1]["modal_price_rs_per_quintal"]
    )

    if best["expected_net_price_rs_per_quintal"] > sell_now_price:
        advice = (
            f"HOLD for the prototype forecast period and sell at "
            f"{best['mandi']}."
        )
    else:
        advice = "SELL NOW at Nashik mandi."
else:
    sell_now_price = None
    advice = f"Sell at {best['mandi']} based on expected net return."

print("\n--- Nashik Mandi Advisory Prototype ---")
print(f"Crop: {crop.title()}")
print(f"Quantity: {quantity:.2f} quintals")
print(f"Recommended mandi: {best['mandi']}")
print(f"Expected net price: ₹{best['expected_net_price_rs_per_quintal']:.2f}/quintal")
print(f"Expected total return: ₹{best['expected_net_return_rs']:.2f}")
print(f"Confidence: {best['confidence']}")
print(f"Advice: {advice}")

if sell_now_price is not None:
    print(f"Latest historical Nashik price: ₹{sell_now_price:.2f}/quintal")

print("\nTop 5 ranked mandis:")
print(
    ranking_df[
        [
            "mandi",
            "forecast_price_rs_per_quintal",
            "transport_cost_rs_per_quintal",
            "expected_net_price_rs_per_quintal",
            "confidence",
        ]
    ]
    .head(5)
    .to_string(index=False)
)

print("\nSaved full ranking: data/outputs/rag_mandi_rankings.csv")
print("Note: This is a historical monthly-data prototype, not a live price advisory.")
import pandas as pd
from pathlib import Path
import re

# Robust path detection: works whether run from root or data/ directory
SCRIPT_DIR = Path(__file__).resolve().parent
CANDIDATE_ROOTS = [
    SCRIPT_DIR.parent,         # e.g., .../data
    SCRIPT_DIR.parent.parent,  # e.g., .../EPOCH---Somaiya
    Path.cwd(),
]

DATA_DIR = None
for r in CANDIDATE_ROOTS:
    if (r / "raw" / "Monthly_data_cmo.csv").exists():
        DATA_DIR = r
        break
    if (r / "data" / "raw" / "Monthly_data_cmo.csv").exists():
        DATA_DIR = r / "data"
        break

if DATA_DIR is None:
    DATA_DIR = SCRIPT_DIR.parent

INPUT_FILE = DATA_DIR / "raw" / "Monthly_data_cmo.csv"
OUTPUT_DIR = DATA_DIR / "processed"
REPORT_DIR = DATA_DIR / "outputs"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def normalise(value):
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def find_column(columns, possible_names):
    cleaned = {normalise(col): col for col in columns}

    for name in possible_names:
        if normalise(name) in cleaned:
            return cleaned[normalise(name)]

    raise ValueError(
        f"Could not find any of {possible_names}. "
        f"Available columns are: {list(columns)}"
    )


# Markets in the Nashik-centred 200 km prototype region
target_markets = {
    "nashik",
    "pimpalgaonbaswant",
    "niphad",
    "lasalgaon",
    "lasalgaonvinchur",
    "sinnar",
    "yeola",
    "manmad",
    "malegaon",
    "nandgaon",
    "chandwad",
    "deola",
    "satana",
    "sangamner",
    "rahata",
    "kopargaon",
    "shrirampur",
    "rahuri",
    "ahmednagar",
    "vashi",
}

df = pd.read_csv(INPUT_FILE)

state_col = find_column(df.columns, ["State", "State Name"])
district_col = find_column(df.columns, ["District", "District Name"])
market_col = find_column(df.columns, ["APMC", "Market", "Market Name"])
crop_col = find_column(df.columns, ["Commodity", "Crop"])
year_col = find_column(df.columns, ["Year"])
month_col = find_column(df.columns, ["Month"])
modal_col = find_column(df.columns, ["Modal Price", "Modal_Price", "modal_price"])
min_col = find_column(df.columns, ["Min Price", "Min_Price", "min_price"])
max_col = find_column(df.columns, ["Max Price", "Max_Price", "max_price"])
arrival_col = find_column(df.columns, ["Arrivals", "Arrival", "arrivals_in_qtl"])

df["market_clean"] = df[market_col].apply(normalise)
df["crop_clean"] = df[crop_col].apply(normalise)
df["state_clean"] = df[state_col].apply(normalise)

crop_map = {
    "onion": "onion",
    "tomato": "tomato",
    "soyabean": "soyabean",
    "soybean": "soyabean",
}

filtered = df[
    (df["state_clean"] == "maharashtra")
    & (df["market_clean"].isin(target_markets))
    & (df["crop_clean"].isin(crop_map.keys()))
].copy()

filtered["crop"] = filtered["crop_clean"].map(crop_map)
filtered["modal_price_rs_per_quintal"] = pd.to_numeric(filtered[modal_col], errors="coerce")
filtered["min_price_rs_per_quintal"] = pd.to_numeric(filtered[min_col], errors="coerce")
filtered["max_price_rs_per_quintal"] = pd.to_numeric(filtered[max_col], errors="coerce")
filtered["arrivals"] = pd.to_numeric(filtered[arrival_col], errors="coerce")

filtered["date"] = pd.to_datetime(
    filtered[year_col].astype(str) + "-" + filtered[month_col].astype(str) + "-01",
    errors="coerce"
)

final = filtered[
    [
        "date",
        state_col,
        district_col,
        market_col,
        "crop",
        "arrivals",
        "min_price_rs_per_quintal",
        "max_price_rs_per_quintal",
        "modal_price_rs_per_quintal",
    ]
].rename(
    columns={
        state_col: "state",
        district_col: "district",
        market_col: "mandi",
    }
)

final = final.dropna(subset=["date", "modal_price_rs_per_quintal"])
final = final.sort_values(["crop", "mandi", "date"])

final.to_csv(
    OUTPUT_DIR / "nashik_200km_monthly_prices.csv",
    index=False
)

coverage = (
    final.groupby(["mandi", "crop"])
    .agg(
        monthly_records=("date", "count"),
        first_month=("date", "min"),
        last_month=("date", "max"),
    )
    .reset_index()
    .sort_values(["crop", "monthly_records"], ascending=[True, False])
)

coverage.to_csv(
    REPORT_DIR / "market_crop_coverage.csv",
    index=False
)

print("Done.")
print(f"Filtered rows: {len(final)}")
print("Created: data/processed/nashik_200km_monthly_prices.csv")
print("Created: data/outputs/market_crop_coverage.csv")
print("\nCrop coverage:")
print(coverage.to_string(index=False))

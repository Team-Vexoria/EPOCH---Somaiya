import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

INPUT_FILE = (
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

TRANSPORT_COST_PER_KM_PER_QUINTAL = 2.5

STORAGE_COST = {
    "onion": 25,
    "soyabean": 10,
    "tomato": 0,
}

df = pd.read_csv(INPUT_FILE)

df["date"] = pd.to_datetime(df["date"])
df["modal_price_rs_per_quintal"] = pd.to_numeric(
    df["modal_price_rs_per_quintal"],
    errors="coerce"
)

df = df.dropna(subset=["date", "modal_price_rs_per_quintal"])
df["crop"] = df["crop"].str.lower().str.strip()
df["mandi_key"] = df["mandi"].str.lower().str.strip()

df = df[df["mandi_key"].isin(DISTANCE_FROM_NASHIK_KM)].copy()

# One monthly price per crop–mandi pair.
df = (
    df.groupby(["crop", "mandi_key", "mandi", "date"], as_index=False)
    ["modal_price_rs_per_quintal"]
    .mean()
)

price_lookup = df.set_index(
    ["crop", "mandi_key", "date"]
)["modal_price_rs_per_quintal"]

results = []

for crop in ["onion", "soyabean", "tomato"]:

    crop_df = df[df["crop"] == crop].copy()
    decision_months = sorted(crop_df["date"].unique())

    for decision_date in decision_months:

        # Markets reporting this crop in this month.
        current_markets = crop_df[crop_df["date"] == decision_date].copy()

        if current_markets.empty:
            continue

        current_markets["distance_km"] = current_markets[
            "mandi_key"
        ].map(DISTANCE_FROM_NASHIK_KM)

        current_markets["sell_now_net"] = (
            current_markets["modal_price_rs_per_quintal"]
            - current_markets["distance_km"]
            * TRANSPORT_COST_PER_KM_PER_QUINTAL
        )

        # Baseline = nearest active mandi for this crop this month.
        nearest = current_markets.sort_values(
            ["distance_km", "sell_now_net"],
            ascending=[True, False]
        ).iloc[0]

        nearest_net = nearest["sell_now_net"]

        # Tomato: sell immediately; compare current net returns across mandis.
        if crop == "tomato":
            best = current_markets.sort_values(
                "sell_now_net",
                ascending=False
            ).iloc[0]

            results.append({
                "decision_month": decision_date.strftime("%Y-%m-%d"),
                "crop": crop,
                "action": "SELL_NOW",
                "nearest_mandi": nearest["mandi"],
                "recommended_mandi": best["mandi"],
                "nearest_mandi_net_rs_per_quintal": round(nearest_net, 2),
                "forecasted_net_rs_per_quintal": round(
                    best["sell_now_net"], 2
                ),
                "actual_advisory_net_rs_per_quintal": round(
                    best["sell_now_net"], 2
                ),
                "gain_vs_nearest_rs_per_quintal": round(
                    best["sell_now_net"] - nearest_net, 2
                ),
            })

            continue

        # Onion and soybean: forecast the next month using prior 3 months.
        next_month = decision_date + pd.DateOffset(months=1)
        holding_options = []

        for row in current_markets.itertuples():
            mandi_key = row.mandi_key

            price_now = price_lookup.get(
                (crop, mandi_key, decision_date)
            )
            price_1_month_ago = price_lookup.get(
                (crop, mandi_key, decision_date - pd.DateOffset(months=1))
            )
            price_2_months_ago = price_lookup.get(
                (crop, mandi_key, decision_date - pd.DateOffset(months=2))
            )
            actual_next_price = price_lookup.get(
                (crop, mandi_key, next_month)
            )

            if any(
                pd.isna(value)
                for value in [
                    price_now,
                    price_1_month_ago,
                    price_2_months_ago,
                    actual_next_price,
                ]
            ):
                continue

            forecast_price = (
                price_now
                + price_1_month_ago
                + price_2_months_ago
            ) / 3

            transport_cost = (
                row.distance_km * TRANSPORT_COST_PER_KM_PER_QUINTAL
            )

            forecast_net = (
                forecast_price
                - transport_cost
                - STORAGE_COST[crop]
            )

            actual_net = (
                actual_next_price
                - transport_cost
                - STORAGE_COST[crop]
            )

            holding_options.append({
                "mandi": row.mandi,
                "forecast_net": forecast_net,
                "actual_net": actual_net,
            })

        # No valid forecast for this month: do not make a holding claim.
        if not holding_options:
            continue

        best_hold = pd.DataFrame(holding_options).sort_values(
            "forecast_net",
            ascending=False
        ).iloc[0]

        # Critical rule: hold only when it is predicted to beat selling now.
        if best_hold["forecast_net"] > nearest_net:
            action = "HOLD_ONE_MONTH"
            recommended_mandi = best_hold["mandi"]
            forecasted_net = best_hold["forecast_net"]
            actual_advisory_net = best_hold["actual_net"]
        else:
            action = "SELL_NOW"
            recommended_mandi = nearest["mandi"]
            forecasted_net = nearest_net
            actual_advisory_net = nearest_net

        results.append({
            "decision_month": decision_date.strftime("%Y-%m-%d"),
            "crop": crop,
            "action": action,
            "nearest_mandi": nearest["mandi"],
            "recommended_mandi": recommended_mandi,
            "nearest_mandi_net_rs_per_quintal": round(nearest_net, 2),
            "forecasted_net_rs_per_quintal": round(forecasted_net, 2),
            "actual_advisory_net_rs_per_quintal": round(
                actual_advisory_net, 2
            ),
            "gain_vs_nearest_rs_per_quintal": round(
                actual_advisory_net - nearest_net, 2
            ),
        })

backtest_cases = pd.DataFrame(results)

if backtest_cases.empty:
    raise ValueError("No valid backtest cases were created.")

backtest_cases["advisory_won"] = (
    backtest_cases["gain_vs_nearest_rs_per_quintal"] > 0
)

backtest_cases.to_csv(
    OUTPUT_DIR / "advisory_backtest_cases.csv",
    index=False
)

summary = (
    backtest_cases.groupby("crop")
    .agg(
        decisions_tested=("decision_month", "count"),
        hold_recommendations=(
            "action",
            lambda actions: (actions == "HOLD_ONE_MONTH").sum()
        ),
        sell_now_recommendations=(
            "action",
            lambda actions: (actions == "SELL_NOW").sum()
        ),
        average_gain_rs_per_quintal=(
            "gain_vs_nearest_rs_per_quintal",
            "mean"
        ),
        median_gain_rs_per_quintal=(
            "gain_vs_nearest_rs_per_quintal",
            "median"
        ),
        advisory_win_rate=("advisory_won", "mean"),
    )
    .reset_index()
)

summary["advisory_win_rate"] = (
    summary["advisory_win_rate"] * 100
).round(1)

summary = summary.round(2)

summary.to_csv(
    OUTPUT_DIR / "advisory_backtest_summary.csv",
    index=False
)

print("Done.")
print("Created: data/outputs/advisory_backtest_cases.csv")
print("Created: data/outputs/advisory_backtest_summary.csv")
print("\nCorrected advisory backtest summary:")
print(summary.to_string(index=False))
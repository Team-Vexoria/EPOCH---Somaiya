import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

INPUT_FILE = ROOT / "processed" / "nashik_200km_monthly_prices.csv"
OUTPUT_DIR = ROOT / "outputs"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(INPUT_FILE)

df["date"] = pd.to_datetime(df["date"])
df["modal_price_rs_per_quintal"] = pd.to_numeric(
    df["modal_price_rs_per_quintal"],
    errors="coerce"
)

df = df.dropna(subset=["date", "modal_price_rs_per_quintal"])
df = df.sort_values(["crop", "mandi", "date"]).reset_index(drop=True)

price_column = "modal_price_rs_per_quintal"

# Forecast 1: average of the previous three months
df["moving_average_3m"] = (
    df.groupby(["crop", "mandi"])[price_column]
    .transform(lambda values: values.shift(1).rolling(3).mean())
)

# Forecast 2: price in the same month last year
price_lookup = df.set_index(["crop", "mandi", "date"])[price_column]

df["seasonal_naive"] = [
    price_lookup.get(
        (row.crop, row.mandi, row.date - pd.DateOffset(years=1)),
        pd.NA
    )
    for row in df.itertuples()
]

# Save historical predictions for checking model accuracy
df.to_csv(
    OUTPUT_DIR / "baseline_history_with_predictions.csv",
    index=False
)

# Backtest: compare prediction with actual price
results = []

for model in ["moving_average_3m", "seasonal_naive"]:
    test_rows = df.dropna(subset=[model]).copy()

    test_rows["absolute_error"] = (
        test_rows[price_column] - test_rows[model]
    ).abs()

    summary = (
        test_rows.groupby("crop")
        .agg(
            tested_months=("date", "count"),
            mean_absolute_error_rs_per_quintal=("absolute_error", "mean")
        )
        .reset_index()
    )

    summary["model"] = model
    results.append(summary)

backtest = pd.concat(results, ignore_index=True)

backtest.to_csv(
    OUTPUT_DIR / "baseline_backtest.csv",
    index=False
)

# Forecast the next month for every crop and mandi
forecasts = []

for (crop, mandi), group in df.groupby(["crop", "mandi"]):
    group = group.sort_values("date")

    next_month = group["date"].max() + pd.DateOffset(months=1)

    moving_average_forecast = group[price_column].tail(3).mean()

    last_year_price = price_lookup.get(
        (crop, mandi, next_month - pd.DateOffset(years=1)),
        pd.NA
    )

    forecasts.append({
        "forecast_month": next_month.strftime("%Y-%m-%d"),
        "crop": crop,
        "mandi": mandi,
        "model": "moving_average_3m",
        "predicted_modal_price_rs_per_quintal": round(moving_average_forecast, 2)
    })

    if pd.notna(last_year_price):
        forecasts.append({
            "forecast_month": next_month.strftime("%Y-%m-%d"),
            "crop": crop,
            "mandi": mandi,
            "model": "seasonal_naive",
            "predicted_modal_price_rs_per_quintal": round(last_year_price, 2)
        })

forecast_df = pd.DataFrame(forecasts)

forecast_df.to_csv(
    OUTPUT_DIR / "baseline_forecasts.csv",
    index=False
)

print("Done.")
print("Created: data/outputs/baseline_history_with_predictions.csv")
print("Created: data/outputs/baseline_backtest.csv")
print("Created: data/outputs/baseline_forecasts.csv")
print()
print(backtest.to_string(index=False))
# Data Directory — Agri-Advisory ("Sell Smart")

This directory contains datasets, cleaning pipelines, and reference tables for the **Sell Smart: "Where and When to Sell"** advisory engine (Maharashtra focus).

---

## Directory Structure

```
data/
├── README.md                   <- This documentation
├── mandis_metadata.json        <- Master list of 12+ Maharashtra mandis with district & logistics constants
├── raw/                        <- Raw CSV / JSON dumps from Agmarknet / data.gov.in / Kaggle
│   └── .gitkeep
└── processed/                  <- Cleaned, standardized time-series and precomputed advisory JSONs
    ├── .gitkeep
    └── mock_advisory.json      <- Data contract shared with Backend & Frontend teams
```

---

## Target Crops & Shelf-Life Characteristics

| Crop | Shelf-Life Type | Storage Loss / Spoilage Decay | Primary Maharashtra Hub Mandis |
| :--- | :--- | :--- | :--- |
| **Onion** | Semi-Perishable (3–8 weeks) | ~0.5% weight loss / week in ventilated chawl | Lasalgaon, Pimpalgaon, Yeola, Solapur |
| **Tomato** | Highly Perishable (3–5 days) | ~3–5% quality loss / day without cold chain | Pimpalgaon, Nashik APMC, Pune, Sangli |
| **Soybean** | Non-Perishable (6–12 months) | Negligible (~0.05% / month in dry storage) | Latur, Solapur, Ahmednagar, Nagpur |

---

## Standard Clean Schema (`processed/mandi_prices_clean.csv`)

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `date` | `YYYY-MM-DD` | Daily market trading date |
| `state` | `str` | Always `Maharashtra` |
| `district` | `str` | District (e.g. `Nashik`, `Pune`, `Latur`) |
| `market` | `str` | APMC market name (e.g. `Lasalgaon`, `Pimpalgaon`) |
| `commodity` | `str` | Standardized crop: `onion`, `tomato`, `soybean` |
| `variety` | `str` | Variety (e.g. `Red`, `Hybrid`, `Yellow`) |
| `arrivals_tonnes` | `float` | Daily physical market arrival volume |
| `min_price` | `float` | Minimum traded price (₹/quintal) |
| `max_price` | `float` | Maximum traded price (₹/quintal) |
| `modal_price` | `float` | **Target Variable**: Most common traded price (₹/quintal) |

# Raw data intake

Put untouched source files here. Do not rename or edit their columns before running the filter.

## Required historical price files

Download these annual CSV files from the Kaggle dataset **Daily Market Prices of Commodity India (2001-2026)** and place them in this folder:

- `2021.csv`
- `2022.csv`
- `2023.csv`
- `2024.csv`
- `2025.csv`

Dataset page: https://www.kaggle.com/code/khandelwalmanas/daily-prices-of-commodity-india-starter-notebook/input

If you can obtain 2026 records, add `2026.csv` too. Use the original annual CSV files, not screenshots or an Excel export.

## Official validation/current-data source

The Government of India dataset is the source of truth for the current day and for checking field meanings:

- https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi
- https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity

The key fields are `State`, `District`, `Market`, `Commodity`, `Variety`, `Arrival_Date`, `Min_Price`, `Max_Price`, and `Modal_Price`. Prices are rupees per quintal.

## Important limitation

The public government feed is refreshed daily and is not a reliable bulk historical archive. For this prototype, use the historical Kaggle annual extracts for model training, then compare a small sample with the official feed for sanity checking.

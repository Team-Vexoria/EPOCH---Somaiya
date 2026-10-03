"""
villages.py - Village & Mandi geo-registry for dynamic freight cost calculation.

Contains:
  - VILLAGES: dict of village_id -> {name, lat, lng, taluka}
  - MANDIS:   dict of mandi_id  -> {name, lat, lng, taluka}
  - haversine_km(): Haversine distance with rural road tortuosity factor
  - freight_cost(): Tiered transport cost model (₹/quintal)
  - village_freight_table(): Full distance + freight matrix for a given village

Mirrors the frontend config/villages.ts and config/mandis.ts so the backend
CRAG pipeline can compute the same village-origin-aware freight costs.
"""

import math
from typing import Dict, Any, List

# ────────────────────────────────────────────────────────────────
# Village Coordinates  (source: frontend/src/config/villages.ts)
# ────────────────────────────────────────────────────────────────

VILLAGES: Dict[str, Dict[str, Any]] = {
    # Niphad Taluka
    "niphad_rural":   {"name": "Niphad",              "name_mr": "निफाड",                  "lat": 20.0898, "lng": 74.1082, "taluka": "Niphad"},
    "lasalgaon_v":    {"name": "Lasalgaon Village",    "name_mr": "लासलगाव गाव",            "lat": 20.1472, "lng": 74.2262, "taluka": "Niphad"},
    "pimpalgaon_v":   {"name": "Pimpalgaon Rural",     "name_mr": "पिंपळगाव ग्रामीण",       "lat": 20.1706, "lng": 73.9856, "taluka": "Niphad"},
    "ozar":           {"name": "Ozar (HAL)",           "name_mr": "ओझर",                    "lat": 20.0984, "lng": 73.9162, "taluka": "Niphad"},
    "saikheda":       {"name": "Saikheda",             "name_mr": "सायखेडा",                "lat": 20.0612, "lng": 74.0289, "taluka": "Niphad"},
    "khedgaon":       {"name": "Khedgaon",             "name_mr": "खेडगाव",                 "lat": 20.1856, "lng": 73.8821, "taluka": "Dindori"},
    "sukene":         {"name": "Mouje Sukene",         "name_mr": "मौजे सुकेणे",            "lat": 20.0911, "lng": 74.0321, "taluka": "Niphad"},
    "kundewadi":      {"name": "Kundewadi",            "name_mr": "कुंदेवाडी",              "lat": 20.1082, "lng": 74.1204, "taluka": "Niphad"},

    # Dindori Taluka
    "dindori_v":      {"name": "Dindori Rural",        "name_mr": "दिंडोरी ग्रामीण",        "lat": 20.2014, "lng": 73.8340, "taluka": "Dindori"},
    "vani":           {"name": "Vani (Saptashrungi)",   "name_mr": "वणी",                    "lat": 20.3278, "lng": 73.8967, "taluka": "Dindori"},
    "janori":         {"name": "Janori",               "name_mr": "जानोरी",                 "lat": 20.1245, "lng": 73.8741, "taluka": "Dindori"},

    # Sinnar Taluka
    "sinnar_v":       {"name": "Sinnar Rural",         "name_mr": "सिन्नर ग्रामीण",         "lat": 19.8510, "lng": 73.9930, "taluka": "Sinnar"},
    "musalgaon":      {"name": "Musalgaon MIDC",       "name_mr": "मुसळगाव",                "lat": 19.8821, "lng": 74.0210, "taluka": "Sinnar"},
    "dapur":          {"name": "Dapur",                "name_mr": "दापूर",                  "lat": 19.7892, "lng": 74.0512, "taluka": "Sinnar"},
    "pandhurli":      {"name": "Pandhurli",            "name_mr": "पांढुर्ली",              "lat": 19.8124, "lng": 73.8641, "taluka": "Sinnar"},

    # Yeola Taluka
    "yeola_v":        {"name": "Yeola Rural",          "name_mr": "येवला ग्रामीण",          "lat": 20.0382, "lng": 74.4891, "taluka": "Yeola"},
    "andarshul":      {"name": "Andarsul",             "name_mr": "अंदरसूल",                "lat": 19.9821, "lng": 74.5821, "taluka": "Yeola"},
    "nagarsul":       {"name": "Nagarsul",             "name_mr": "नगरसूल",                 "lat": 20.0892, "lng": 74.4412, "taluka": "Yeola"},

    # Chandwad Taluka
    "chandwad_v":     {"name": "Chandwad Rural",       "name_mr": "चांदवड ग्रामीण",         "lat": 20.3275, "lng": 74.2407, "taluka": "Chandwad"},
    "vadner_bhairao": {"name": "Vadner Bhairao",       "name_mr": "वडनेर भैरव",             "lat": 20.2412, "lng": 74.1523, "taluka": "Chandwad"},

    # Kalwan & Baglan / Satana
    "satana_v":       {"name": "Satana Town",          "name_mr": "सटाणा",                  "lat": 20.5912, "lng": 74.2045, "taluka": "Baglan"},
    "taharabhad":     {"name": "Taharabhad",           "name_mr": "तहराराबाद",              "lat": 20.6512, "lng": 74.0214, "taluka": "Baglan"},
    "kalwan_v":       {"name": "Kalwan Rural",         "name_mr": "कळवण ग्रामीण",           "lat": 20.4905, "lng": 73.9972, "taluka": "Kalwan"},
    "abhona":         {"name": "Abhona",               "name_mr": "आभोणा",                  "lat": 20.5214, "lng": 73.8821, "taluka": "Kalwan"},

    # Malegaon Taluka
    "malegaon_v":     {"name": "Malegaon Outskirts",   "name_mr": "मालेगाव ग्रामीण",        "lat": 20.5539, "lng": 74.5288, "taluka": "Malegaon"},
    "zodga":          {"name": "Zodga",                "name_mr": "झोडगे",                  "lat": 20.6214, "lng": 74.6821, "taluka": "Malegaon"},
    "sayane":         {"name": "Sayane",               "name_mr": "सयाने",                  "lat": 20.4912, "lng": 74.4512, "taluka": "Malegaon"},

    # Nashik Taluka (Peri-urban)
    "girnare":        {"name": "Girnare (Tomato Belt)", "name_mr": "गिरणारे (टोमॅटो पट्टा)", "lat": 20.0412, "lng": 73.6621, "taluka": "Nashik"},
    "makhmalabad":    {"name": "Makhmalabad",          "name_mr": "मखमलाबाद",               "lat": 20.0521, "lng": 73.7821, "taluka": "Nashik"},
    "deolali":        {"name": "Deolali Gaon",         "name_mr": "देवळाली गाव",            "lat": 19.9512, "lng": 73.8341, "taluka": "Nashik"},

    # Igatpuri & Trimbak
    "ghoti":          {"name": "Ghoti",                "name_mr": "घोटी",                   "lat": 19.7214, "lng": 73.6214, "taluka": "Igatpuri"},
    "trimbak":        {"name": "Trimbakeshwar Rural",  "name_mr": "त्र्यंबकेश्वर ग्रामीण",  "lat": 19.9382, "lng": 73.5312, "taluka": "Trimbak"},
    "igatpuri_v":     {"name": "Igatpuri Town",        "name_mr": "इगतपुरी",                "lat": 19.7027, "lng": 73.5583, "taluka": "Igatpuri"},

    # Nandgaon & Manmad
    "nandgaon_v":     {"name": "Nandgaon Rural",       "name_mr": "नांदगाव ग्रामीण",        "lat": 20.3128, "lng": 74.6593, "taluka": "Nandgaon"},
    "manmad_v":       {"name": "Manmad Rural",         "name_mr": "मनमाड ग्रामीण",          "lat": 20.2508, "lng": 74.4394, "taluka": "Nandgaon"},
    "naydongri":      {"name": "Naydongri",            "name_mr": "नायडोंगरी",              "lat": 20.4124, "lng": 74.7214, "taluka": "Nandgaon"},
}

# ────────────────────────────────────────────────────────────────
# Mandi (APMC) Coordinates  (source: frontend/src/config/mandis.ts)
# ────────────────────────────────────────────────────────────────

MANDIS: Dict[str, Dict[str, Any]] = {
    "lasalgaon":  {"name": "Lasalgaon APMC",          "name_mr": "लासलगाव",     "lat": 20.1472, "lng": 74.2262, "taluka": "Niphad"},
    "pimpalgaon": {"name": "Pimpalgaon Baswant APMC", "name_mr": "पिंपळगाव",    "lat": 20.1706, "lng": 73.9856, "taluka": "Niphad"},
    "nashik":     {"name": "Nashik (Panchavati) APMC","name_mr": "नाशिक",       "lat": 20.0110, "lng": 73.7903, "taluka": "Nashik"},
    "yeola":      {"name": "Yeola APMC",              "name_mr": "येवला",       "lat": 20.0382, "lng": 74.4891, "taluka": "Yeola"},
    "manmad":     {"name": "Manmad APMC",             "name_mr": "मनमाड",       "lat": 20.2508, "lng": 74.4394, "taluka": "Nandgaon"},
    "sinnar":     {"name": "Sinnar APMC",             "name_mr": "सिन्नर",      "lat": 19.8510, "lng": 73.9930, "taluka": "Sinnar"},
    "dindori":    {"name": "Dindori APMC",            "name_mr": "दिंडोरी",     "lat": 20.2014, "lng": 73.8340, "taluka": "Dindori"},
    "niphad":     {"name": "Niphad APMC",             "name_mr": "निफाड",       "lat": 20.0898, "lng": 74.1082, "taluka": "Niphad"},
    "chandwad":   {"name": "Chandwad APMC",           "name_mr": "चांदवड",      "lat": 20.3275, "lng": 74.2407, "taluka": "Chandwad"},
    "malegaon":   {"name": "Malegaon APMC",           "name_mr": "मालेगाव",     "lat": 20.5539, "lng": 74.5288, "taluka": "Malegaon"},
    "satana":     {"name": "Satana (Baglan) APMC",    "name_mr": "सटाणा",       "lat": 20.5912, "lng": 74.2045, "taluka": "Baglan"},
    "nandgaon":   {"name": "Nandgaon APMC",           "name_mr": "नांदगाव",     "lat": 20.3128, "lng": 74.6593, "taluka": "Nandgaon"},
    "kalwan":     {"name": "Kalwan APMC",             "name_mr": "कळवण",        "lat": 20.4905, "lng": 73.9972, "taluka": "Kalwan"},
    "igatpuri":   {"name": "Igatpuri (Ghoti) APMC",   "name_mr": "इगतपुरी",     "lat": 19.7027, "lng": 73.5583, "taluka": "Igatpuri"},
    # Additional mandis from our historical data
    "ahmednagar": {"name": "Ahmednagar APMC",         "name_mr": "अहमदनगर",     "lat": 19.0948, "lng": 74.7480, "taluka": "Ahmednagar"},
    "kopargaon":  {"name": "Kopargaon APMC",          "name_mr": "कोपरगाव",     "lat": 19.8787, "lng": 74.4771, "taluka": "Kopargaon"},
    "sangamner":  {"name": "Sangamner APMC",          "name_mr": "संगमनेर",      "lat": 19.5669, "lng": 74.2094, "taluka": "Sangamner"},
    "rahata":     {"name": "Rahata APMC",             "name_mr": "राहाता",       "lat": 19.7103, "lng": 74.4812, "taluka": "Rahata"},
    "shrirampur": {"name": "Shrirampur APMC",         "name_mr": "श्रीरामपूर",   "lat": 19.6120, "lng": 74.6538, "taluka": "Shrirampur"},
    "rahuri":     {"name": "Rahuri APMC",             "name_mr": "राहुरी",       "lat": 19.3932, "lng": 74.6471, "taluka": "Rahuri"},
}


# ────────────────────────────────────────────────────────────────
# Haversine Distance  (matches frontend calculateDistanceKm)
# ────────────────────────────────────────────────────────────────

ROAD_TORTUOSITY = 1.28  # Rural Nashik road winding factor

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """
    Haversine great-circle distance with 1.28x rural road tortuosity factor.
    Returns integer km (rounded).
    """
    R = 6371  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c * ROAD_TORTUOSITY)


# ────────────────────────────────────────────────────────────────
# Freight Cost Model  (matches frontend calculateDetailedTransportCost)
# ────────────────────────────────────────────────────────────────

# Mandis in Western Ghats with 12% terrain surcharge
GHAT_MANDIS = {"igatpuri", "kalwan"}

def freight_cost(distance_km: int, mandi_id: str = "", is_bulk: bool = False) -> dict:
    """
    Tiered transport cost model (₹/quintal):
      - Fixed APMC Hamali + weighing + gate entry: ₹15 (₹12 if bulk)
      - Haulage tiers: <25km ₹1.15/km, 25-60km ₹0.88/km, >60km ₹0.78/km
      - Ghat terrain surcharge for Igatpuri/Kalwan: +12%

    Returns dict with:
      distance_km, fixed_handling, haulage_rate, haulage_subtotal,
      terrain_surcharge, total_per_qtl, explanation
    """
    if distance_km <= 0:
        return {
            "distance_km": 0,
            "fixed_handling": 0,
            "haulage_rate": 0,
            "haulage_subtotal": 0,
            "terrain_surcharge": 0,
            "total_per_qtl": 0,
            "explanation": "0 km (Local village harvest collection)",
        }

    fixed_handling = 12 if is_bulk else 15

    if is_bulk:
        haulage_rate = 0.35  # 10-ton 10-wheeler bulk economy
    elif distance_km < 25:
        haulage_rate = 1.15  # Local village approach roads
    elif distance_km <= 60:
        haulage_rate = 0.88  # State highway rate
    else:
        haulage_rate = 0.78  # National highway long-distance tier

    haulage_subtotal = round(distance_km * haulage_rate)

    terrain_surcharge = 0
    if mandi_id in GHAT_MANDIS:
        terrain_surcharge = round(haulage_subtotal * 0.12)

    total_per_qtl = fixed_handling + haulage_subtotal + terrain_surcharge

    explanation = (
        f"{distance_km} km @ ₹{haulage_rate:.2f}/km + ₹{fixed_handling} Hamali"
        + (f" + ₹{terrain_surcharge} Ghat Surcharge" if terrain_surcharge > 0 else "")
    )

    return {
        "distance_km": distance_km,
        "fixed_handling": fixed_handling,
        "haulage_rate": haulage_rate,
        "haulage_subtotal": haulage_subtotal,
        "terrain_surcharge": terrain_surcharge,
        "total_per_qtl": total_per_qtl,
        "explanation": explanation,
    }


# ────────────────────────────────────────────────────────────────
# Village → Mandi Freight Table  (injected into CRAG context)
# ────────────────────────────────────────────────────────────────

def village_freight_table(village_id: str) -> List[dict]:
    """
    Given a village_id, compute distance and freight to every known APMC mandi.
    Returns list of dicts sorted by distance (nearest first):
      [{mandi_id, mandi_name, distance_km, freight_per_qtl, explanation}, ...]
    """
    village = VILLAGES.get(village_id)
    if not village:
        return []

    rows = []
    for mid, m in MANDIS.items():
        dist = haversine_km(village["lat"], village["lng"], m["lat"], m["lng"])
        cost = freight_cost(dist, mid)
        rows.append({
            "mandi_id": mid,
            "mandi_name": m["name"],
            "mandi_name_mr": m["name_mr"],
            "distance_km": dist,
            "freight_per_qtl": cost["total_per_qtl"],
            "explanation": cost["explanation"],
        })

    rows.sort(key=lambda r: r["distance_km"])
    return rows


def freight_context_for_prompt(village_id: str) -> str:
    """
    Format the village freight table as a human-readable string suitable for
    injection into the CRAG QA prompt. Returns empty string if village unknown.
    """
    table = village_freight_table(village_id)
    if not table:
        return ""

    village = VILLAGES[village_id]
    lines = [
        f"Farmer's Origin: {village['name']} ({village['name_mr']}), Taluka {village['taluka']}",
        f"Transport costs calculated FROM the farmer's village (not Nashik city):",
        "",
        f"{'Mandi':<28} {'Dist (km)':>9} {'Freight ₹/qtl':>14}   Details",
        "─" * 80,
    ]
    for r in table:
        lines.append(
            f"{r['mandi_name']:<28} {r['distance_km']:>6} km   ₹{r['freight_per_qtl']:>6}       {r['explanation']}"
        )

    lines.append("")
    lines.append("IMPORTANT: Net return = Mandi forecast price - Transport freight - Spoilage loss.")
    lines.append("The NEAREST mandi is not always the BEST mandi. Recommend the one with highest NET return.")
    return "\n".join(lines)


def resolve_village_name(name_or_id: str) -> str:
    """
    Try to resolve a free-text village name to a village_id.
    Matches against id, name, name_mr (case-insensitive).
    Returns the village_id or empty string if not found.
    """
    name_lower = name_or_id.strip().lower()

    # Direct id match
    if name_lower in VILLAGES:
        return name_lower

    # Match by name or name_mr
    for vid, v in VILLAGES.items():
        if (name_lower == v["name"].lower() or
            name_lower == v.get("name_mr", "").lower() or
            name_lower in v["name"].lower() or
            name_lower in vid):
            return vid

    return ""


def resolve_village_from_text(text: str) -> str:
    """
    Scan a sentence or query text for any mention of known villages or talukas.
    Returns the first matching village_id, or empty string if none found.
    """
    if not text:
        return ""
    text_lower = text.lower()
    candidates = []
    for vid, v in VILLAGES.items():
        candidates.append((v["name"].lower(), vid))
        if v.get("name_mr"):
            candidates.append((v["name_mr"].lower(), vid))
            mr_clean = (
                v["name_mr"]
                .replace("गाव", "")
                .replace("ग्रामीण", "")
                .replace("पट्टा", "")
                .replace("(", "")
                .replace(")", "")
                .strip()
            )
            if len(mr_clean) >= 3:
                candidates.append((mr_clean.lower(), vid))

        base_name = vid.replace("_rural", "").replace("_v", "")
        candidates.append((base_name, vid))

        en_clean = (
            v["name"].lower()
            .replace("village", "")
            .replace("rural", "")
            .replace("town", "")
            .replace("outskirts", "")
            .replace("midc", "")
            .replace("(hal)", "")
            .replace("(tomato belt)", "")
            .replace("(saptashrungi)", "")
            .strip()
        )
        if len(en_clean) >= 3:
            candidates.append((en_clean, vid))

    # Sort descending by length so specific terms match before short prefixes
    candidates.sort(key=lambda c: len(c[0]), reverse=True)

    for term, vid in candidates:
        if len(term) >= 3 and term in text_lower:
            return vid

    return ""



# ────────────────────────────────────────────────────────────────
# Crops & Domain Benchmarks
# ────────────────────────────────────────────────────────────────

CROPS: Dict[str, Dict[str, Any]] = {
    "onion": {
        "id": "onion",
        "name": "Onion",
        "name_mr": "कांदा",
        "default_price": 2450,
        "specialty_mandi": "lasalgaon",
    },
    "tomato": {
        "id": "tomato",
        "name": "Tomato",
        "name_mr": "टोमॅटो",
        "default_price": 1850,
        "specialty_mandi": "pimpalgaon",
    },
    "soybean": {
        "id": "soybean",
        "name": "Soybean",
        "name_mr": "सोयाबीन",
        "default_price": 4850,
        "specialty_mandi": "malegaon",
    },
}


def calculate_logical_mandi_price(crop_id: str, mandi_id: str, horizon_days: int = 0) -> dict:
    """
    Compute logical mandi price matching frontend domain logic:
    Base Benchmark + Liquidity Premium + Specialty Bonus + Horizon Shift + Volume Adjustment.
    """
    crop_info = CROPS.get(crop_id, CROPS["onion"])
    base_benchmark = crop_info["default_price"]

    scale_premiums = {
        "lasalgaon":  {"onion": 210, "tomato": 40,  "soybean": 60},
        "pimpalgaon": {"onion": 160, "tomato": 220, "soybean": 50},
        "nashik":     {"onion": 110, "tomato": 140, "soybean": 40},
        "yeola":      {"onion": 120, "tomato": 20,  "soybean": 110},
        "manmad":     {"onion": 70,  "tomato": 10,  "soybean": 130},
        "sinnar":     {"onion": 80,  "tomato": 50,  "soybean": 80},
        "dindori":    {"onion": 50,  "tomato": 150, "soybean": 30},
        "niphad":     {"onion": 130, "tomato": 70,  "soybean": 50},
        "chandwad":   {"onion": 90,  "tomato": 30,  "soybean": 70},
        "malegaon":   {"onion": 60,  "tomato": 20,  "soybean": 190},
        "satana":     {"onion": 95,  "tomato": 40,  "soybean": 80},
        "nandgaon":   {"onion": 40,  "tomato": 10,  "soybean": 70},
        "kalwan":     {"onion": 65,  "tomato": 50,  "soybean": 40},
        "igatpuri":   {"onion": 30,  "tomato": 30,  "soybean": 20},
    }
    mandi_scale = scale_premiums.get(mandi_id, {"onion": 50, "tomato": 30, "soybean": 50})
    liquidity_premium = mandi_scale.get(crop_id, 50)

    specialties = {
        "lasalgaon": "onion",
        "pimpalgaon": "tomato",
        "nashik": "all",
        "yeola": "onion",
        "malegaon": "soybean",
    }
    specialty_bonus = 40 if specialties.get(mandi_id) in (crop_id, "all") else 0

    horizon_shift = 0
    if crop_id == "onion":
        if horizon_days <= 7:
            horizon_shift = horizon_days * 16
        elif horizon_days <= 14:
            horizon_shift = 7 * 16 + (horizon_days - 7) * 12
        else:
            horizon_shift = 7 * 16 + 7 * 12 + (horizon_days - 14) * 4
    elif crop_id == "tomato":
        horizon_shift = -horizon_days * 22
    elif crop_id == "soybean":
        horizon_shift = horizon_days * 10

    arrivals = 35000 if mandi_id in ("lasalgaon", "pimpalgaon") else 15000
    arrival_adjustment = -15 if arrivals >= 35000 else 0

    forecast_price = max(500, base_benchmark + liquidity_premium + specialty_bonus + horizon_shift + arrival_adjustment)
    return {
        "forecast_price": forecast_price,
        "base_benchmark": base_benchmark,
        "liquidity_premium": liquidity_premium,
        "specialty_bonus": specialty_bonus,
        "horizon_shift": horizon_shift,
        "explanation": f"₹{base_benchmark} Base + ₹{liquidity_premium} Liquidity + ₹{specialty_bonus} Specialty"
    }


def calculate_spoilage_loss(crop_id: str, base_price: float, days: int) -> dict:
    """
    Biological spoilage & weight shrinkage loss model per quintal.
    """
    if days <= 0:
        return {"days": 0, "loss_pct": 0.0, "loss_per_qtl": 0, "explanation": "0 days (0% spoilage)"}

    if crop_id == "tomato":
        loss_pct = min(days * 0.035 + (max(0, days - 3) * 0.015), 0.75)
        loss_per_qtl = round(base_price * loss_pct)
        return {
            "days": days,
            "loss_pct": round(loss_pct * 100, 1),
            "loss_per_qtl": loss_per_qtl,
            "explanation": f"{days} days non-refrigerated holding ({round(loss_pct*100, 1)}% decay)"
        }
    elif crop_id == "onion":
        loss_pct = days * 0.0020
        loss_per_qtl = round(base_price * loss_pct)
        return {
            "days": days,
            "loss_pct": round(loss_pct * 100, 1),
            "loss_per_qtl": loss_per_qtl,
            "explanation": f"{days} days aerated chawl storage ({round(loss_pct*100, 1)}% shrinkage)"
        }
    else:  # soybean
        loss_pct = (days / 7.0) * 0.0005
        loss_per_qtl = round(base_price * loss_pct)
        return {
            "days": days,
            "loss_pct": round(loss_pct * 100, 2),
            "loss_per_qtl": loss_per_qtl,
            "explanation": f"{days} days dry godown storage ({round(loss_pct*100, 2)}% loss)"
        }


def generate_heatmap_data(crop_id: str = "onion", horizon_days: int = 0, village_id: str = "niphad_rural") -> dict:
    """
    Generate dynamic mandi heatmap matrix from a specific village origin.
    Calculates exact distances, tiered freight, forecast price, and net returns.
    """
    v_id = resolve_village_name(village_id) or "niphad_rural"
    village = VILLAGES.get(v_id, VILLAGES["niphad_rural"])
    crop_info = CROPS.get(crop_id, CROPS["onion"])

    items = []
    for mid, m in MANDIS.items():
        dist = haversine_km(village["lat"], village["lng"], m["lat"], m["lng"])
        transport_details = freight_cost(dist, mid)
        price_details = calculate_logical_mandi_price(crop_id, mid, horizon_days)
        spoilage_details = calculate_spoilage_loss(crop_id, price_details["forecast_price"], horizon_days)

        forecast = price_details["forecast_price"]
        transport = transport_details["total_per_qtl"]
        spoilage = spoilage_details["loss_per_qtl"]
        net_return = forecast - transport - spoilage

        daily_step = -22 if crop_id == "tomato" else (16 if crop_id == "onion" else 10)
        sparkline = [
            forecast - daily_step * 3,
            forecast - daily_step * 2,
            forecast - daily_step,
            forecast,
            forecast + daily_step,
            forecast + daily_step * 2,
            forecast + daily_step * 3,
        ]

        items.append({
            "mandiId": mid,
            "name": m["name"],
            "name_mr": m["name_mr"],
            "name_hi": m["name_mr"],
            "lat": m["lat"],
            "lng": m["lng"],
            "distanceKm": dist,
            "forecastPrice": forecast,
            "transportCost": transport,
            "spoilageLoss": spoilage,
            "netReturn": net_return,
            "arrivalsTodayQuintals": 35000 if mid in ("lasalgaon", "pimpalgaon") else 15000,
            "confidence": "LOW" if horizon_days > 7 else ("MEDIUM" if horizon_days > 3 else "HIGH"),
            "sparkline": sparkline,
            "transportExplanation": transport_details["explanation"],
            "priceExplanation": price_details["explanation"],
            "spoilageExplanation": spoilage_details["explanation"],
        })

    items.sort(key=lambda x: x["netReturn"], reverse=True)

    return {
        "crop": crop_info["name"],
        "horizonDays": horizon_days,
        "village": village["name"],
        "villageId": v_id,
        "items": items,
        "topMandiId": items[0]["mandiId"] if items else "lasalgaon",
    }


def get_villages_list() -> List[dict]:
    """Return all villages as a list for API serialization."""
    return [
        {"id": vid, "name": v["name"], "name_mr": v["name_mr"], "taluka": v["taluka"], "lat": v["lat"], "lng": v["lng"]}
        for vid, v in VILLAGES.items()
    ]


def get_mandis_list() -> List[dict]:
    """Return all mandis as a list for API serialization."""
    return [
        {"id": mid, "name": m["name"], "name_mr": m["name_mr"], "taluka": m["taluka"], "lat": m["lat"], "lng": m["lng"]}
        for mid, m in MANDIS.items()
    ]


# ────────────────────────────────────────────────────────────────
# FPO Aggregation Clusters Registry (Taluka Packhouses & Depots)
# ────────────────────────────────────────────────────────────────
FPO_CLUSTERS: Dict[str, Dict[str, Any]] = {
    "niphad_rural": {
        "id": "niphad_rural",
        "name": "Niphad Central Packhouse",
        "name_mr": "निफाड मध्यवर्ती पॅकहाऊस",
        "taluka": "Niphad",
        "registered_members": 420,
        "cluster_type": "Onion & Soybean Aggregation Hub",
        "cluster_type_mr": "कांदा व सोयाबीन संकलन केंद्र",
        "lat": 20.0898,
        "lng": 74.1082,
    },
    "dindori_v": {
        "id": "dindori_v",
        "name": "Dindori Agri Cluster Depot",
        "name_mr": "दिंडोरी कृषी संकलन डेपो",
        "taluka": "Dindori",
        "registered_members": 380,
        "cluster_type": "Tomato & Perishable Cold Hub",
        "cluster_type_mr": "टोमॅटो व भाजीपाला संकलन केंद्र",
        "lat": 20.2014,
        "lng": 73.8340,
    },
    "kalwan_v": {
        "id": "kalwan_v",
        "name": "Kalwan Tribal FPO Facility",
        "name_mr": "कळवण शेतकरी उत्पादक केंद्र",
        "taluka": "Kalwan",
        "registered_members": 290,
        "cluster_type": "Kharif Onion & Chana Hub",
        "cluster_type_mr": "खरीप कांदा व कडधान्य केंद्र",
        "lat": 20.4905,
        "lng": 73.9972,
    },
    "sinnar_v": {
        "id": "sinnar_v",
        "name": "Sinnar South Aggregation Hub",
        "name_mr": "सिन्नर दक्षिण संकलन केंद्र",
        "taluka": "Sinnar",
        "registered_members": 310,
        "cluster_type": "Soybean & Coarse Grain Depot",
        "cluster_type_mr": "सोयाबीन व धान्य संकलन डेपो",
        "lat": 19.8510,
        "lng": 73.9930,
    },
    "yeola_v": {
        "id": "yeola_v",
        "name": "Yeola Rural Farmer Center",
        "name_mr": "येवला ग्रामीण शेतकरी केंद्र",
        "taluka": "Yeola",
        "registered_members": 260,
        "cluster_type": "Late Kharif Onion Hub",
        "cluster_type_mr": "रांगडा कांदा संकलन केंद्र",
        "lat": 20.0382,
        "lng": 74.4891,
    },
    "satana_v": {
        "id": "satana_v",
        "name": "Satana Baglan Valley Packhouse",
        "name_mr": "सटाणा बागलाण व्हॅली पॅकहाऊस",
        "taluka": "Baglan",
        "registered_members": 350,
        "cluster_type": "Export Quality Red Onion Depot",
        "cluster_type_mr": "निर्यातक्षम लाल कांदा केंद्र",
        "lat": 20.5912,
        "lng": 74.2045,
    },
    "chandwad_v": {
        "id": "chandwad_v",
        "name": "Chandwad Highland Depot",
        "name_mr": "चांदवड मध्यवर्ती डेपो",
        "taluka": "Chandwad",
        "registered_members": 240,
        "cluster_type": "Summer Onion Storage & Dispatch",
        "cluster_type_mr": "उन्हाळ कांदा साठवणूक व विक्री",
        "lat": 20.3275,
        "lng": 74.2407,
    },
    "malegaon_v": {
        "id": "malegaon_v",
        "name": "Malegaon Commercial Aggregation Yard",
        "name_mr": "मालेगाव व्यावसायिक संकलन आवार",
        "taluka": "Malegaon",
        "registered_members": 410,
        "cluster_type": "North Nashik Multi-Crop Depot",
        "cluster_type_mr": "उत्तर नाशिक बहुपीक डेपो",
        "lat": 20.5539,
        "lng": 74.5288,
    },
}


def get_fpo_clusters_list() -> List[dict]:
    """Return all defined FPO clusters as a list for API serialization."""
    return list(FPO_CLUSTERS.values())


def generate_fpo_plan_data(
    crop_id: str = "onion",
    quantity: int = 300,
    village_id: str = "niphad_rural",
    horizon_days: int = 7
) -> dict:
    """
    Computes an optimal multi-mandi allocation plan for an FPO bulk lot.
    Calculates truck fleet requirements (10-tonne trucks), bulk freight discounts,
    staggered dispatch slots, and financial gain vs single-mandi local dumping.
    """
    v_id = resolve_village_name(village_id) or "niphad_rural"
    cluster_info = FPO_CLUSTERS.get(v_id)
    village = VILLAGES.get(v_id, VILLAGES["niphad_rural"])
    crop_info = CROPS.get(crop_id, CROPS["onion"])
    base_price = crop_info["default_price"]

    # FPO Bulk Scale Metric Conversions
    metric_tonnes = round(quantity / 10.0, 1)
    total_trucks = math.ceil(quantity / 100.0)
    members_pooled = math.ceil(quantity / 20.0)
    bulk_freight_savings = quantity * 25  # ~₹25/qtl saved by 10-wheeler fleet over retail tempos

    hub_name = cluster_info["name"] if cluster_info else f"{village['name']} Packhouse"
    hub_name_mr = cluster_info["name_mr"] if cluster_info else f"{village.get('name_mr', village['name'])} संकलन केंद्र"
    registered_members = cluster_info["registered_members"] if cluster_info else 300

    def get_mandi_metrics(mid: str):
        m = MANDIS.get(mid, MANDIS["lasalgaon"])
        dist = haversine_km(village["lat"], village["lng"], m["lat"], m["lng"])
        # Bulk transport economy of scale: ~28% cheaper freight per quintal for 10-wheeler trucks
        std_freight = freight_cost(dist, mid)["total_per_qtl"]
        bulk_freight = max(18, round(std_freight * 0.72))
        price_data = calculate_logical_mandi_price(crop_id, mid, horizon_days)
        return {
            "dist": dist,
            "freight": bulk_freight,
            "price": price_data["forecast_price"],
            "name": m["name"],
            "name_mr": m["name_mr"],
        }

    las = get_mandi_metrics("lasalgaon")
    pim = get_mandi_metrics("pimpalgaon")
    yeo = get_mandi_metrics("yeola")

    allocations = [
        {
            "mandiId": "lasalgaon",
            "mandiName": las["name"],
            "mandiName_mr": las["name_mr"],
            "percentage": 45,
            "quantityQuintals": round(quantity * 0.45),
            "expectedPrice": las["price"],
            "estimatedFreight": las["freight"],
            "netRevenue": round((las["price"] - las["freight"]) * (quantity * 0.45)),
            "trucksNeeded": math.ceil((quantity * 0.45) / 100),
            "dispatchDate": "Tomorrow 04:00 AM",
            "capacityWarning": "High liquidity (25,000 qtl/day daily intake). Low glut risk."
        },
        {
            "mandiId": "pimpalgaon",
            "mandiName": pim["name"],
            "mandiName_mr": pim["name_mr"],
            "percentage": 35,
            "quantityQuintals": round(quantity * 0.35),
            "expectedPrice": pim["price"],
            "estimatedFreight": pim["freight"],
            "netRevenue": round((pim["price"] - pim["freight"]) * (quantity * 0.35)),
            "trucksNeeded": math.ceil((quantity * 0.35) / 100),
            "dispatchDate": "Day 3 Morning",
            "capacityWarning": "Strong wholesale buyer demand (18,000 qtl/day)."
        },
        {
            "mandiId": "yeola",
            "mandiName": yeo["name"],
            "mandiName_mr": yeo["name_mr"],
            "percentage": 20,
            "quantityQuintals": round(quantity * 0.20),
            "expectedPrice": yeo["price"],
            "estimatedFreight": yeo["freight"],
            "netRevenue": round((yeo["price"] - yeo["freight"]) * (quantity * 0.20)),
            "trucksNeeded": math.ceil((quantity * 0.20) / 100),
            "dispatchDate": "Day 5 Morning",
            "capacityWarning": "Retail trader premium. Absorbs up to 20% without price depression."
        }
    ]

    total_revenue = sum(a["netRevenue"] for a in allocations)
    nearest_dist = min(haversine_km(village["lat"], village["lng"], m["lat"], m["lng"]) for m in MANDIS.values())
    baseline_freight = freight_cost(nearest_dist)["total_per_qtl"]
    baseline_net_per_qtl = max(100, base_price - baseline_freight - 35)
    baseline_revenue = baseline_net_per_qtl * quantity
    extra_revenue = total_revenue - baseline_revenue

    return {
        "totalQuantity": quantity,
        "metricTonnes": metric_tonnes,
        "totalTrucks": total_trucks,
        "membersPooled": members_pooled,
        "bulkFreightSavings": bulk_freight_savings,
        "hubId": v_id,
        "hubName": hub_name,
        "hubName_mr": hub_name_mr,
        "registeredMembers": registered_members,
        "taluka": village.get("taluka", "Nashik"),
        "totalRevenue": total_revenue,
        "baselineRevenue": baseline_revenue,
        "extraRevenueEarned": extra_revenue,
        "percentageGain": round((extra_revenue / baseline_revenue) * 100, 1) if baseline_revenue else 0.0,
        "bestMandi": "Lasalgaon APMC",
        "riskLevel": "LOW",
        "allocations": allocations
    }




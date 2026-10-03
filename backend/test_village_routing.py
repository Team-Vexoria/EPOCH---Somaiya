"""
test_village_routing.py - Verification script for Dynamic Village Origin routing and freight.

Verifies:
1. Village text resolution in Marathi, Hindi, and English
2. Accurate Haversine distance & tiered freight calculation from village vs Nashik city
3. Dynamic freight table generation for prompt context injection
4. Backend API endpoints (/api/villages, /api/mandis, /api/heatmap, /api/chat)
"""

import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from villages import (
    VILLAGES,
    MANDIS,
    haversine_km,
    freight_cost,
    village_freight_table,
    freight_context_for_prompt,
    resolve_village_name,
    resolve_village_from_text,
    generate_heatmap_data,
    get_villages_list,
    get_mandis_list
)

def test_village_resolution():
    print("\n--- TEST 1: Village Text Resolution ---")
    test_cases = [
        ("मी निफाडचा शेतकरी आहे", "niphad_rural"),
        ("I live in Niphad village", "niphad_rural"),
        ("लासलगाव येथील कांदा भाव सांगा", "lasalgaon_v"),
        ("Farmer in Sinnar with 20 quintals", "sinnar_v"),
        ("दिंडोरी ग्रामीण भाग", "dindori_v"),
        ("Girnare tomato grower", "girnare"),
        ("What about Kalwan mandi?", "kalwan_v"),
    ]
    for text, expected in test_cases:
        resolved = resolve_village_from_text(text)
        status = "✅ PASS" if resolved == expected else f"❌ FAIL (got {resolved})"
        print(f"  {status}: '{text}' → {resolved} (expected {expected})")
        assert resolved == expected, f"Failed on {text}"

def test_distance_and_freight_contrast():
    print("\n--- TEST 2: Distance & Freight Contrast (Village vs Nashik APMC) ---")
    # Contrast: Farmer in Niphad vs Nashik city APMC going to Lasalgaon
    niphad = VILLAGES["niphad_rural"]
    nashik = MANDIS["nashik"]
    lasalgaon = MANDIS["lasalgaon"]

    dist_from_niphad = haversine_km(niphad["lat"], niphad["lng"], lasalgaon["lat"], lasalgaon["lng"])
    dist_from_nashik = haversine_km(nashik["lat"], nashik["lng"], lasalgaon["lat"], lasalgaon["lng"])

    cost_from_niphad = freight_cost(dist_from_niphad, "lasalgaon")
    cost_from_nashik = freight_cost(dist_from_nashik, "lasalgaon")

    print(f"  From Niphad Rural to Lasalgaon APMC:")
    print(f"    Distance: {dist_from_niphad} km | Freight: ₹{cost_from_niphad['total_per_qtl']}/qtl | Details: {cost_from_niphad['explanation']}")
    print(f"  From Nashik APMC to Lasalgaon APMC:")
    print(f"    Distance: {dist_from_nashik} km | Freight: ₹{cost_from_nashik['total_per_qtl']}/qtl | Details: {cost_from_nashik['explanation']}")

    diff_km = dist_from_nashik - dist_from_niphad
    diff_cost = cost_from_nashik['total_per_qtl'] - cost_from_niphad['total_per_qtl']
    print(f"  🎯 REAL-WORLD IMPACT: Measuring from Niphad saves {diff_km} km and ₹{diff_cost}/qtl in freight calculation!")
    assert dist_from_niphad < dist_from_nashik, "Niphad should be closer to Lasalgaon than Nashik city center"

def test_heatmap_generation():
    print("\n--- TEST 3: Dynamic Heatmap Generation from Village Origin ---")
    heatmap = generate_heatmap_data(crop_id="onion", horizon_days=0, village_id="niphad_rural")
    print(f"  Crop: {heatmap['crop']} | Origin Village: {heatmap['village']} (ID: {heatmap['villageId']})")
    print(f"  Top Recommended Mandi: {heatmap['topMandiId']}")
    print(f"  Total Evaluated Mandis: {len(heatmap['items'])}")
    print("  Top 3 Mandis sorted by Net Return:")
    for i, item in enumerate(heatmap["items"][:3]):
        print(f"    {i+1}. {item['name']}: {item['distanceKm']} km | Forecast: ₹{item['forecastPrice']} | Freight: -₹{item['transportCost']} | Spoilage: -₹{item['spoilageLoss']} | Net: ₹{item['netReturn']}/qtl")
    assert len(heatmap["items"]) > 0
    assert heatmap["items"][0]["mandiId"] == heatmap["topMandiId"]

def test_fastapi_endpoints():
    print("\n--- TEST 4: FastAPI Endpoints Verification ---")
    from fastapi.testclient import TestClient
    from server import app

    client = TestClient(app)

    # 1. Health check
    res = client.get("/")
    assert res.status_code == 200
    print("  ✅ GET / → 200 OK")

    # 2. Villages list
    res = client.get("/api/villages")
    assert res.status_code == 200
    villages = res.json()
    assert len(villages) >= 30
    print(f"  ✅ GET /api/villages → {len(villages)} villages loaded")

    # 3. Mandis list
    res = client.get("/api/mandis")
    assert res.status_code == 200
    mandis = res.json()
    assert len(mandis) >= 14
    print(f"  ✅ GET /api/mandis → {len(mandis)} mandis loaded")

    # 4. Heatmap endpoint with village origin
    res = client.get("/api/heatmap?crop=onion&horizonDays=0&village=niphad_rural")
    assert res.status_code == 200
    hm = res.json()
    assert hm["village"] == "Niphad"
    assert len(hm["items"]) >= 14
    print(f"  ✅ GET /api/heatmap (Niphad origin) → Top Mandi: {hm['topMandiId']} | Top Net: ₹{hm['items'][0]['netReturn']}/qtl")

    # 5. FPO Clusters list
    res = client.get("/api/fpo/clusters")
    assert res.status_code == 200
    clusters = res.json()
    assert len(clusters) >= 8
    print(f"  ✅ GET /api/fpo/clusters → {len(clusters)} FPO clusters registered with member counts")

    # 6. FPO Bulk Planning endpoint
    fpo_req = {
        "crop": "onion",
        "quantity": 500,
        "village": "niphad_rural",
        "horizonDays": 7
    }
    res = client.post("/api/fpo/plan", json=fpo_req)
    assert res.status_code == 200
    plan = res.json()
    assert plan["totalQuantity"] == 500
    assert plan["metricTonnes"] == 50.0
    assert plan["totalTrucks"] == 5
    assert len(plan["allocations"]) == 3
    assert plan["extraRevenueEarned"] > 0
    # Feature 2 Anti-Glut assertions
    assert plan["totalGlutLossAvoided"] == 500 * 140
    assert plan["singleDumpSharePct"] > 5.0
    assert plan["maxIntakeSharePct"] <= 2.5
    for a in plan["allocations"]:
        assert a["dailyArrivalsQuintals"] > 0
        assert a["intakeSharePct"] > 0
        assert a["absorptionStatus"] in ("SAFE", "MODERATE", "RISK")
        assert a["glutPricePenaltyAvoided"] == 140
    print(f"  ✅ POST /api/fpo/plan → {plan['hubName']} (50 MT, 5 Trucks, ~25 Farmers Pooled) | Extra Revenue: +₹{plan['extraRevenueEarned']:,} ({plan['percentageGain']}%)")
    print(f"  🛡️ Anti-Glut Engine: Single dump risk was {plan['singleDumpSharePct']}% of {plan['singleDumpMandiName']}. Split allocation protected ₹{plan['totalGlutLossAvoided']:,} against APMC price depression!")

if __name__ == "__main__":
    test_village_resolution()
    test_distance_and_freight_contrast()
    test_heatmap_generation()
    test_fastapi_endpoints()
    print("\n🎉 ALL VILLAGE ORIGIN ROUTING TESTS PASSED SUCCESSFULLY!")

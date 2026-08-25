"""
Pulls NHB RESIDEX carpet-area price data for every city NHB tracks,
by discovering state IDs, then city IDs per state, then price trend
per city -- using the hidden JSON endpoints found via DevTools.

Output: residex_prices.csv with columns:
  city_id, city_name, quarter, quarter_label, price_composite,
  price_lt60sqm, price_60to110sqm, price_gt110sqm

Usage:
    python fetch_residex.py

Note: run this from your own machine (not this sandbox), since the
NHB RESIDEX domain isn't reachable from here. This script is provided
ready to run as-is.
"""

import json
import time
import csv
import requests

BASE = "https://residex.nhbonline.org.in"
GET_CITY_URL = f"{BASE}/ApplicationUtilities/GetCity"
PRICE_TREND_URL = f"{BASE}/DashboardBY2024/Get_NHBResiCersai_PriceTrend"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; BankBidIndiaResearch/1.0)",
    "Accept": "application/json, text/plain, */*",
}

# State IDs are small integers; NHB currently covers ~20 states/UTs.
# We don't have a clean "list all states" endpoint, so we sweep a safe
# range and keep whatever returns cities. Adjust MAX_STATE_ID upward
# if you suspect coverage is being missed (check the printed summary
# at the end -- state IDs found vs India's ~36 states/UTs).
MAX_STATE_ID = 40

REQUEST_DELAY_SECONDS = 0.5  # be polite to NHB's servers


def get_cities_for_state(state_id, session):
    resp = session.get(GET_CITY_URL, params={"State": state_id}, headers=HEADERS, timeout=15)
    if resp.status_code != 200:
        return []
    try:
        cities = resp.json()
    except ValueError:
        return []
    if not isinstance(cities, list):
        return []
    return cities  # list of {"value": "<city_id>", "text": "<city_name>"}


def get_price_trend(city_id, session):
    payload = {
        "reporttype": "CITY",
        "lookup": "HFC",
        "cityid": city_id,
        "pincode": 0,
        "wardid": 0,
        "pricemtdid": 1,
        "locid": 0,
    }
    resp = session.post(PRICE_TREND_URL, data=payload, headers=HEADERS, timeout=15)
    if resp.status_code != 200:
        return None

    outer = resp.json()
    if outer.get("status") != "Success":
        return None

    # "data" is itself a JSON string that needs a second parse
    inner = outer.get("data")
    if not inner:
        return None
    try:
        rows = json.loads(inner)
    except ValueError:
        return None
    return rows


def main():
    session = requests.Session()

    # Step 1: discover all cities across all states
    all_cities = {}  # city_id -> city_name
    states_with_cities = 0

    for state_id in range(1, MAX_STATE_ID + 1):
        cities = get_cities_for_state(state_id, session)
        if cities:
            states_with_cities += 1
            for c in cities:
                all_cities[c["value"]] = c["text"]
        time.sleep(REQUEST_DELAY_SECONDS)

    print(f"Found {len(all_cities)} cities across {states_with_cities} states.")

    # Step 2: pull price trend for every discovered city
    rows_out = []
    for city_id, city_name in all_cities.items():
        trend_rows = get_price_trend(city_id, session)
        if not trend_rows:
            print(f"  [skip] {city_name} (id={city_id}) -- no data")
            time.sleep(REQUEST_DELAY_SECONDS)
            continue

        for r in trend_rows:
            rows_out.append({
                "city_id": r.get("CITY_ID"),
                "city_name": r.get("CITY_NAME"),
                "quarter": r.get("QTR"),
                "quarter_label": r.get("QTR_YEAR"),
                "price_composite": r.get("WTAVG_COMPOSITE"),
                "price_lt60sqm": r.get("WTAVG_LESSTHAN60"),
                "price_60to110sqm": r.get("WTAVG_60TO110"),
                "price_gt110sqm": r.get("WTAVG_GREATER110"),
            })
        print(f"  [ok] {city_name} (id={city_id}) -- {len(trend_rows)} quarters")
        time.sleep(REQUEST_DELAY_SECONDS)

    # Step 3: write CSV
    out_path = "residex_prices.csv"
    fieldnames = [
        "city_id", "city_name", "quarter", "quarter_label",
        "price_composite", "price_lt60sqm", "price_60to110sqm", "price_gt110sqm",
    ]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows_out)

    print(f"\nWrote {len(rows_out)} rows to {out_path}")


if __name__ == "__main__":
    main()

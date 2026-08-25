"""
NHB RESIDEX lookup helper.

Loads residex_prices (all cities, all quarters) from Supabase once,
caches in memory for CACHE_TTL_SECONDS (RESIDEX only updates quarterly,
so an in-process cache is more than safe), and exposes a single
comparison function used by the /listings route.
"""

import os
import time
import requests

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://kjltjkpkfaawmtmmwmph.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

CACHE_TTL_SECONDS = 60 * 60  # 1 hour -- data itself only changes quarterly

# Listing city names won't always match RESIDEX's exact naming.
# Map common variants -> the exact city_name used in residex_prices.
# Extend this as you notice more mismatches in real listing data.
CITY_ALIASES = {
    "bangalore": "Bengaluru",
    "bombay": "Mumbai",
    "calcutta": "Kolkata",
    "gurgaon": "Gurugram",
    "cochin": "Kochi",
    "trivandrum": "Thiruvananthapuram",
    "visakhapatnam": "Vizag",
    "new delhi": "Delhi",
    "greater mumbai": "Mumbai",
}

_cache = {
    "loaded_at": 0,
    "by_city": {},        # normalized_city_key -> {price_composite, quarter, quarter_label}
    "latest_quarter": None,
}


def _normalize(name: str) -> str:
    """Lowercase, strip punctuation/whitespace for loose matching."""
    if not name:
        return ""
    return "".join(ch for ch in name.lower().strip() if ch.isalnum() or ch == " ").strip()


def _load_residex_data():
    """Fetch all residex_prices rows, keep only the latest quarter per city."""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/residex_prices",
        headers=HEADERS,
        params={"select": "city_name,quarter,quarter_label,price_composite"},
    )
    if response.status_code != 200:
        return {}

    rows = response.json()
    if not rows:
        return {}

    # rows are quarter,city pairs -- keep the lexicographically latest
    # "quarter" per city (e.g. "25-26 Q4" > "25-26 Q1" sorts correctly
    # as plain strings given the fixed format NHB uses)
    latest_by_city = {}
    for row in rows:
        key = _normalize(row["city_name"])
        existing = latest_by_city.get(key)
        if existing is None or row["quarter"] > existing["quarter"]:
            latest_by_city[key] = row

    return latest_by_city


def _get_cache():
    now = time.time()
    if now - _cache["loaded_at"] > CACHE_TTL_SECONDS or not _cache["by_city"]:
        _cache["by_city"] = _load_residex_data()
        _cache["loaded_at"] = now
    return _cache["by_city"]


def get_market_comparison(city: str, reserve_price: float, area_sqft_estimated: float):
    """
    Returns a dict describing how a listing's implied price/sqft compares
    to NHB RESIDEX's latest composite price/sqft for that city, or None
    if the city isn't RESIDEX-covered, area/price data is missing, or the
    deviation from market is too extreme to be a meaningful comparison.

    {
        "city_matched": "Mumbai",
        "quarter_label": "Mar 2026",
        "market_price_per_sqft": 18420.0,
        "listing_price_per_sqft": 15200.0,
        "pct_vs_market": -17.5,   # negative = below market
    }
    """
    if not city or not reserve_price or not area_sqft_estimated:
        return None
    if area_sqft_estimated <= 0 or reserve_price <= 0:
        return None

    lookup_key = _normalize(city)
    aliased = CITY_ALIASES.get(lookup_key)
    if aliased:
        lookup_key = _normalize(aliased)

    cache = _get_cache()
    match = cache.get(lookup_key)
    if not match or not match.get("price_composite"):
        return None

    market_price = float(match["price_composite"])
    listing_price_per_sqft = reserve_price / area_sqft_estimated
    pct_vs_market = ((listing_price_per_sqft - market_price) / market_price) * 100

    # RESIDEX's price_composite is a single city-wide blended average --
    # it has no notion of premium micro-markets (e.g. South Mumbai) vs.
    # modest suburbs within the same city. Beyond a certain deviation,
    # the comparison stops being informative and starts being misleading
    # (a "318% above market" badge reads as broken, not honest), so we
    # suppress it rather than show a number that technically computes
    # but doesn't mean what it appears to mean.
    if abs(pct_vs_market) > 100:
        return None

    return {
        "city_matched": match["city_name"],
        "quarter_label": match["quarter_label"],
        "market_price_per_sqft": round(market_price, 2),
        "listing_price_per_sqft": round(listing_price_per_sqft, 2),
        "pct_vs_market": round(pct_vs_market, 1),
    }
"""
NHB RESIDEX lookup helper.

Loads residex_prices (all cities, all quarters) from Supabase once,
caches in memory for CACHE_TTL_SECONDS (RESIDEX only updates quarterly,
so an in-process cache is more than safe), and exposes comparison
functions used by the /listings route.
"""

import os
import time
import requests
from dotenv import load_dotenv          

load_dotenv()                            

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://kjltjkpkfaawmtmmwmph.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

CACHE_TTL_SECONDS = 60 * 60  # 1 hour -- data itself only changes quarterly

ASSUMED_GROSS_YIELD = 0.03         # 3% -- typical Indian residential gross rental yield, used as a proxy since no rental dataset exists
YIELD_COMPARISON_TOLERANCE = 0.15  # percentage points of wiggle room before calling it "above"/"below" vs "at" typical

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


def _lookup_city(city: str):
    """Shared city-alias + cache lookup used by both comparison functions."""
    if not city:
        return None
    lookup_key = _normalize(city)
    aliased = CITY_ALIASES.get(lookup_key)
    if aliased:
        lookup_key = _normalize(aliased)
    cache = _get_cache()
    return cache.get(lookup_key)


def get_covered_city_names() -> list[str]:
    """
    Returns every city_name RESIDEX has data for (the exact strings
    stored in residex_prices, e.g. "Mumbai", "Bengaluru"). Used by
    query_listings() to build the has_rental_yield filter -- a listing
    can only get a roi_estimate if its city matches one of these.
    Cached the same way as everything else in this module.
    """
    cache = _get_cache()
    return sorted({row["city_name"] for row in cache.values() if row.get("city_name")})


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

    match = _lookup_city(city)
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


def get_roi_estimate(city: str, reserve_price: float, area_sqft_estimated: float):
    """
    Estimates gross rental yield for a listing.

    There's no rental dataset, so this uses NHB RESIDEX's composite
    price/sqft as a market-value proxy and applies ASSUMED_GROSS_YIELD
    (3%, a standard Indian residential benchmark) to back into an
    estimated market rent. That same estimated rent is then compared
    against the auction's *reserve* price -- not the RESIDEX market
    price -- to surface the effective yield a buyer would actually get
    if they win at reserve.

    This is the point of the feature: a listing priced well under
    RESIDEX market value will show an effective yield above 3%, which
    is a much more useful "good deal" signal than the price-cut badge
    alone, since it's expressed as an ongoing return rather than a
    one-time discount.

    Returns None under the same missing-data/city-not-covered
    conditions as get_market_comparison. Unlike that function, this one
    does NOT suppress on extreme deviation -- an inflated yield on a
    steeply discounted distressed listing is exactly the useful signal,
    not noise to hide.

    {
        "city_matched": "Mumbai",
        "quarter_label": "Mar 2026",
        "estimated_annual_rent": 552000.0,
        "effective_yield_pct": 4.2,
        "assumed_yield_pct": 3.0,
        "comparison": "above",   # "above" | "below" | "at"
    }
    """
    if not city or not reserve_price or not area_sqft_estimated:
        return None
    if area_sqft_estimated <= 0 or reserve_price <= 0:
        return None

    match = _lookup_city(city)
    if not match or not match.get("price_composite"):
        return None

    market_price_per_sqft = float(match["price_composite"])
    estimated_annual_rent = market_price_per_sqft * area_sqft_estimated * ASSUMED_GROSS_YIELD
    effective_yield_pct = (estimated_annual_rent / reserve_price) * 100

    assumed_pct = ASSUMED_GROSS_YIELD * 100
    diff = effective_yield_pct - assumed_pct
    if abs(diff) <= YIELD_COMPARISON_TOLERANCE:
        comparison = "at"
    elif diff > 0:
        comparison = "above"
    else:
        comparison = "below"

    return {
        "city_matched": match["city_name"],
        "quarter_label": match["quarter_label"],
        "estimated_annual_rent": round(estimated_annual_rent, 2),
        "effective_yield_pct": round(effective_yield_pct, 2),
        "assumed_yield_pct": round(assumed_pct, 2),
        "comparison": comparison,
    }
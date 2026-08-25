import time
import datetime
from collections import Counter

from fastapi import APIRouter, HTTPException, Query
from app.supabase_client import query_listings
from app.residex import get_market_comparison
import requests
import os

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://kjltjkpkfaawmtmmwmph.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

BANK_COUNT_TOP_N = 12       # show top N banks individually, roll the rest into "Others"
BANK_STATS_CACHE_TTL = 900  # 15 min -- bank distribution doesn't shift meaningfully minute to minute

_bank_stats_cache = {
    "computed_at": 0,
    "data": [],
}


def _attach_residex_comparison(listing: dict) -> dict:
    """
    Adds a `residex_comparison` field to a listing dict, or None if the
    listing's city isn't RESIDEX-covered or it lacks the area/price data
    needed to compute a per-sqft comparison.
    """
    city = listing.get("city") or listing.get("location") or listing.get("district")
    listing["residex_comparison"] = get_market_comparison(
        city=city,
        reserve_price=listing.get("reserve_price"),
        area_sqft_estimated=listing.get("area_sqft_estimated"),
    )
    return listing


def _fetch_all_bank_names() -> list[str]:
    """
    Paginates through the listings table pulling only bank_name, since
    Supabase caps any single response at 1000 rows regardless of `limit`.
    Mirrors the pagination pattern already used in get_all_source_ids().
    """
    all_names: list[str] = []
    page_size = 1000
    offset = 0

    while True:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/listings",
            headers=HEADERS,
            params={
                "select": "bank_name",
                "limit": str(page_size),
                "offset": str(offset),
            },
        )
        if response.status_code not in (200, 206):
            break

        rows = response.json()
        if not rows:
            break

        all_names.extend(r["bank_name"] for r in rows if r.get("bank_name"))

        if len(rows) < page_size:
            break
        offset += page_size

    return all_names
    return all_names


def _compute_bank_wise_counts() -> list[dict]:
    """
    Returns [{"bank": "Bank Of India", "count": 4213}, ...] sorted
    descending, top BANK_COUNT_TOP_N individually + an "Others" bucket
    for the long tail (auctiontiger/bankauctions bank_name is free-text
    and includes many low-frequency ARC/lender names).
    """
    raw_names = _fetch_all_bank_names()

    # normalize casing so "Bank Of India" / "BANK OF INDIA" don't split
    normalized = Counter(name.strip().upper() for name in raw_names)

    ranked = normalized.most_common()
    top = ranked[:BANK_COUNT_TOP_N]
    rest_total = sum(count for _, count in ranked[BANK_COUNT_TOP_N:])

    result = [{"bank": name.title(), "count": count} for name, count in top]
    if rest_total:
        result.append({"bank": "Others", "count": rest_total})

    return result


def _bank_wise_counts() -> list[dict]:
    """Cached wrapper -- recomputes only when the TTL has expired."""
    now = time.time()
    if now - _bank_stats_cache["computed_at"] > BANK_STATS_CACHE_TTL or not _bank_stats_cache["data"]:
        _bank_stats_cache["data"] = _compute_bank_wise_counts()
        _bank_stats_cache["computed_at"] = now
    return _bank_stats_cache["data"]


@router.get("/listings")
def get_listings(
    city: str | None = Query(default=None),
    state: str | None = Query(default=None),
    property_type: str | None = Query(default=None),
    bank_name: str | None = Query(default=None),
    source: str | None = Query(default=None, description="ibapi | bankauctions | auctiontiger"),
    min_price: float | None = Query(default=None),
    max_price: float | None = Query(default=None),
    price_availability: str | None = Query(default=None),
    sort: str | None = Query(default=None),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0),
):
    """
    Returns filtered listings from Supabase.
    All filters are optional — returns all listings if no filters provided.
    Each listing includes a `residex_comparison` field (null if the
    listing's city isn't covered by NHB RESIDEX or lacks the area
    estimate needed to compute price/sqft).
    """
    results, total = query_listings(
        city=city,
        state=state,
        property_type=property_type,
        bank_name=bank_name,
        source=source,
        min_price=min_price,
        max_price=max_price,
        price_availability=price_availability,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    results = [_attach_residex_comparison(r) for r in results]
    return {"count": total, "listings": results}


@router.get("/listings/{listing_id}")
def get_listing_by_id(listing_id: str):
    """Returns a single listing by its Supabase row ID."""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/listings",
        headers=HEADERS,
        params={"id": f"eq.{listing_id}", "select": "*"}
    )
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Listing not found")
    listing = response.json()[0]
    return _attach_residex_comparison(listing)


@router.get("/listings/stats/summary")
def get_summary_stats():
    """
    Returns high-level counts by source and by bank.
    Bank-wise counts are cached for BANK_STATS_CACHE_TTL seconds.
    Useful for the frontend dashboard panel.
    """
    source_results = []
    for source in ["ibapi", "bankauctions", "auctiontiger"]:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/listings",
            headers={**HEADERS, "Prefer": "count=exact"},
            params={"source": f"eq.{source}", "select": "id", "limit": "1"}
        )
        count = int(response.headers.get("content-range", "0/0").split("/")[-1])
        source_results.append({"source": source, "count": count})

    # Total count (all listings)
    resp_total = requests.get(
        f"{SUPABASE_URL}/rest/v1/listings",
        headers={**HEADERS, "Prefer": "count=exact"},
        params={"select": "id", "limit": "1"},
    )
    total = int(resp_total.headers.get("content-range", "0/0").split("/")[-1])

    # Active listings: auction_date in the future OR auction_date is null
    today = datetime.date.today().isoformat()
    resp_active = requests.get(
        f"{SUPABASE_URL}/rest/v1/listings",
        headers={**HEADERS, "Prefer": "count=exact"},
        params={"select": "id", "limit": "1", "or": f"(auction_date.is.null,auction_date.gte.{today})"},
    )
    active_count = int(resp_active.headers.get("content-range", "0/0").split("/")[-1])

    # Passed listings: auction_date is before today
    resp_passed = requests.get(
        f"{SUPABASE_URL}/rest/v1/listings",
        headers={**HEADERS, "Prefer": "count=exact"},
        params={"select": "id", "limit": "1", "auction_date": f"lt.{today}"},
    )
    passed_count = int(resp_passed.headers.get("content-range", "0/0").split("/")[-1])

    # Price-on-request: reserve_price is null or zero
    resp_por = requests.get(
        f"{SUPABASE_URL}/rest/v1/listings",
        headers={**HEADERS, "Prefer": "count=exact"},
        params={"select": "id", "limit": "1", "or": "(reserve_price.is.null,reserve_price.eq.0)"},
    )
    por_count = int(resp_por.headers.get("content-range", "0/0").split("/")[-1])

    # Priced listings: reserve_price > 0
    resp_priced = requests.get(
        f"{SUPABASE_URL}/rest/v1/listings",
        headers={**HEADERS, "Prefer": "count=exact"},
        params={"select": "id", "limit": "1", "reserve_price": "gt.0"},
    )
    priced_count = int(resp_priced.headers.get("content-range", "0/0").split("/")[-1])

    return {
        "sources": source_results,
        "banks": _bank_wise_counts(),
        "totals": {
            "total": total,
            "active": active_count,
            "passed": passed_count,
            "priced": priced_count,
            "price_on_request": por_count,
        },
    }
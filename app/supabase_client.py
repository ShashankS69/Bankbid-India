import requests
import json
import os
import datetime
from dotenv import load_dotenv

from app.residex import get_covered_city_names

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_KEY must be set (in a .env file locally, "
        "or as Render env vars in production)."
    )

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal"
}

BATCH_SIZE = 500


def upsert_listings(records: list[dict]) -> dict:
    total_pushed = 0
    errors = []

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]

        seen = set()
        deduped = []
        skipped_no_id = 0
        for r in batch:
            sid = r.get("source_id")
            if not sid:
                deduped.append(r)
                skipped_no_id += 1
                continue
            key = (r.get("source"), sid)
            if key not in seen:
                seen.add(key)
                deduped.append(r)
        batch = deduped

        payload = json.dumps(batch, default=str)
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/listings?on_conflict=source,source_id",
            headers=HEADERS,
            data=payload
        )
        if response.status_code in (200, 201):
            total_pushed += len(batch)
        else:
            errors.append({
                "batch": i // BATCH_SIZE + 1,
                "status": response.status_code,
                "detail": response.text
            })

    return {"pushed": total_pushed, "errors": errors}


def get_all_source_ids(source: str) -> set[str]:
    """
    Fetch every source_id already in Supabase for a given source, paginated.
    """
    PAGE = 1000
    offset = 0
    ids: set[str] = set()

    while True:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/listings",
            headers=HEADERS,
            params={
                "select": "source_id",
                "source": f"eq.{source}",
                "limit": PAGE,
                "offset": offset,
            },
        )
        if response.status_code not in (200, 206):
            break
        rows = response.json()
        if not rows:
            break
        ids.update(r["source_id"] for r in rows if r.get("source_id"))
        if len(rows) < PAGE:
            break
        offset += PAGE

    return ids


def query_listings(
    city: str | None = None,
    state: str | None = None,
    property_type: str | None = None,
    bank_name: str | None = None,
    source: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    max_emd: float | None = None,
    price_availability: str | None = None,
    has_rental_yield: str | None = None,   # "true" | "false" | None
    closing_within: int | None = None,     # 3 | 7 | 14 | None -- Feature #6
    locations: str | None = None,          # pipe-separated exact location values (map filter)
    auction_date: str | None = None,       # YYYY-MM-DD (calendar filter)
    sort: str | None = None,
    since: str | None = None,   # ISO timestamp — only listings with fetched_at >= this
    limit: int = 50,
    offset: int = 0
) -> tuple[list[dict], int]:
    params = [
        ("select", "*"),
        ("limit", limit),
        ("offset", offset),
    ]

    if city:
        params.append(("location", f"ilike.*{city}*"))
    if state:
        params.append(("state", f"ilike.*{state}*"))
    if property_type:
        params.append(("property_type", f"ilike.*{property_type}*"))
    if bank_name:
        params.append(("bank_name", f"ilike.{bank_name}"))   # exact match, not substring
    if source:
        params.append(("source", f"eq.{source}"))
    if min_price is not None:
        params.append(("reserve_price", f"gte.{min_price}"))
    if max_price is not None:
        params.append(("reserve_price", f"lte.{max_price}"))
    if max_emd is not None:
        params.append(("emd", f"lte.{max_emd}"))
    if since:
        params.append(("fetched_at", f"gte.{since}"))

    if price_availability == "priced":
        params.append(("reserve_price", "gt.0"))
    elif price_availability == "on_request":
        params.append(("or", "(reserve_price.is.null,reserve_price.eq.0)"))

    # has_rental_yield filters for listings that would (or wouldn't) get a
    # non-null roi_estimate from get_roi_estimate() -- i.e. those needing
    # both an area estimate AND a RESIDEX-covered city. There's no stored
    # column for this, so it's expressed as a location match against every
    # covered city name.
    if has_rental_yield in ("true", "false"):
        covered_cities = get_covered_city_names()

        if has_rental_yield == "true":
            # Needs BOTH: an area estimate present, AND the location
            # matching at least one covered city (OR across cities).
            params.append(("area_sqft_estimated", "not.is.null"))
            if covered_cities:
                city_or = ",".join(f"location.ilike.*{c}*" for c in covered_cities)
                params.append(("or", f"({city_or})"))
            else:
                # RESIDEX cache is empty -- nothing can qualify.
                params.append(("id", "eq.-1"))
        else:
            # "false" = would get a null roi_estimate: area missing, OR
            # location doesn't match ANY covered city. The second half is
            # an AND of not.ilike across every city, nested inside the OR
            # via PostgREST's and()/or() grouping syntax.
            if covered_cities:
                not_any_city = ",".join(f"location.not.ilike.*{c}*" for c in covered_cities)
                params.append(("or", f"(area_sqft_estimated.is.null,and({not_any_city}))"))
            # If RESIDEX cache is empty, every listing already qualifies
            # as "without" -- no filter needed.

    # Feature #6 -- closing-soon is its own independent filter (NOT tied
    # to sort). Restricts to auctions between today and N days from now,
    # on auction_date_parsed (a clean ISO date column) rather than the raw
    # auction_date free-text field (e.g. "10 September 2026"), which varies
    # in format across sources and isn't safe to range-compare directly in
    # PostgREST. Independent of whatever `sort` the user has chosen.
    if closing_within in (3, 7, 14):
        today = datetime.date.today()
        horizon = today + datetime.timedelta(days=closing_within)
        params.append(("auction_date_parsed", f"gte.{today.isoformat()}"))
        params.append(("auction_date_parsed", f"lte.{horizon.isoformat()}"))

    # Map filter: exact match on any of the provided location strings
    # (from clustering logic in MapViewInner.jsx)
    if locations:
        values = [v for v in locations.split("|") if v]
        if values:
            or_clause = ",".join(f"location.eq.{v}" for v in values)
            params.append(("or", f"({or_clause})"))

    # Calendar filter: match exact auction_date_parsed to the given day
    # auction_date_parsed is a clean ISO date column (YYYY-MM-DD)
    if auction_date:
        params.append(("auction_date_parsed", f"eq.{auction_date}"))

    sort_map = {
        # auction_date is free text (e.g. "10 September 2026") and varies
        # by source -- sorting it alphabetically is NOT chronological.
        # auction_date_parsed is the clean ISO date column, safe to sort.
        "auction_soonest": "auction_date_parsed.asc.nullslast",
        "auction_latest": "auction_date_parsed.desc.nullslast",
        "latest": "fetched_at.desc",
        "oldest": "fetched_at.asc",
        "price_low": "reserve_price.asc.nullslast",
        "price_high": "reserve_price.desc.nullslast",
    }
    params.append(("order", sort_map.get(sort, "fetched_at.desc")))

    headers = {**HEADERS, "Prefer": "count=exact"}
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/listings",
        headers=headers,
        params=params
    )

    if response.status_code not in (200, 206):
        return [], 0

    rows = response.json()
    content_range = response.headers.get("content-range", "")
    total = int(content_range.split("/")[-1]) if "/" in content_range else len(rows)

    return rows, total
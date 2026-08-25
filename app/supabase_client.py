import requests
import json
import os
from dotenv import load_dotenv

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
    price_availability: str | None = None,
    sort: str | None = None,
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

    if price_availability == "priced":
        params.append(("reserve_price", "gt.0"))
    elif price_availability == "on_request":
        params.append(("or", "(reserve_price.is.null,reserve_price.eq.0)"))

    sort_map = {
        "auction_soonest": "auction_date.asc.nullslast",
        "auction_latest": "auction_date.desc.nullslast",
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
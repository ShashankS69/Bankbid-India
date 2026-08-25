from fastapi import APIRouter, HTTPException, Query
from app.scrapers.ibapi import fetch_ibapi
from app.scrapers.bankauctions import fetch_bankauctions
from app.scrapers.auctiontiger import fetch_auctiontiger
from app.normalise import normalise_ibapi, normalise_bankauctions, normalise_auctiontiger
from app.supabase_client import upsert_listings, query_listings, get_all_source_ids

router = APIRouter()


# ── IBAPI ─────────────────────────────────────────────────────────────────────

@router.post("/fetch-ibapi")
def fetch_and_upsert_ibapi():
    """Fetch all live listings from IBAPI and upsert into Supabase."""
    try:
        raw = fetch_ibapi()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"IBAPI fetch failed: {e}")

    records = [normalise_ibapi(r) for r in raw]
    result = upsert_listings(records)

    return {
        "source": "ibapi",
        "fetched": len(raw),
        "pushed": result["pushed"],
        "errors": result["errors"],
    }


# ── bankauctions.in ───────────────────────────────────────────────────────────

@router.post("/fetch-bankauctions")
def fetch_and_upsert_bankauctions():
    """Fetch all listings from bankauctions.in and upsert into Supabase."""
    try:
        raw = fetch_bankauctions()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"bankauctions.in fetch failed: {e}")

    records = [normalise_bankauctions(r) for r in raw]
    result = upsert_listings(records)

    return {
        "source": "bankauctions",
        "fetched": len(raw),
        "pushed": result["pushed"],
        "errors": result["errors"],
    }


# ── auctiontiger.in ───────────────────────────────────────────────────────────

@router.post("/fetch-auctiontiger")
def fetch_and_upsert_auctiontiger(
    full_fetch: bool = Query(
        default=False,
        description="Set true for first-time full fetch (~338K records). "
                    "Default is incremental — walks all pages, filters out known records."
    )
):
    """
    Fetch listings from auctiontiger.in and upsert into Supabase.
    Use ?full_fetch=true on first deploy. Incremental by default after that.
    """
    known_ids = None

    if not full_fetch:
        # Pull ALL existing auctiontiger source_ids from Supabase so the
        # incremental filter is accurate (paginated — table has 300K+ rows)
        try:
            known_ids = get_all_source_ids("auctiontiger")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to load known IDs: {e}")

    try:
        raw = fetch_auctiontiger(known_ids=known_ids, full_fetch=full_fetch)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"auctiontiger.in fetch failed: {e}")

    records = [normalise_auctiontiger(r) for r in raw]
    result = upsert_listings(records)

    return {
        "source": "auctiontiger",
        "mode": "full" if full_fetch else "incremental",
        "fetched": len(raw),
        "pushed": result["pushed"],
        "errors": result["errors"],
    }


# ── Fetch All (single button trigger) ────────────────────────────────────────

@router.post("/fetch-all")
def fetch_all_sources():
    """
    Triggers incremental fetch from all 3 sources in sequence.
    This is what the frontend 'Fetch Latest' button calls.
    Returns per-source counts + grand total.
    """
    results = {}
    total_pushed = 0

    # IBAPI
    try:
        raw = fetch_ibapi()
        records = [normalise_ibapi(r) for r in raw]
        r = upsert_listings(records)
        results["ibapi"] = {"fetched": len(raw), "pushed": r["pushed"], "errors": r["errors"]}
        total_pushed += r["pushed"]
    except Exception as e:
        results["ibapi"] = {"error": str(e)}

    # bankauctions.in
    try:
        raw = fetch_bankauctions()
        records = [normalise_bankauctions(r) for r in raw]
        r = upsert_listings(records)
        results["bankauctions"] = {"fetched": len(raw), "pushed": r["pushed"], "errors": r["errors"]}
        total_pushed += r["pushed"]
    except Exception as e:
        results["bankauctions"] = {"error": str(e)}

    # auctiontiger.in — incremental only for the Fetch Latest button
    try:
        known_ids = get_all_source_ids("auctiontiger")
        raw = fetch_auctiontiger(known_ids=known_ids, full_fetch=False)
        records = [normalise_auctiontiger(r) for r in raw]
        r = upsert_listings(records)
        results["auctiontiger"] = {"fetched": len(raw), "pushed": r["pushed"], "errors": r["errors"]}
        total_pushed += r["pushed"]
    except Exception as e:
        results["auctiontiger"] = {"error": str(e)}

    return {
        "total_new_listings": total_pushed,
        "sources": results,
    }
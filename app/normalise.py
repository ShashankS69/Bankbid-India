from datetime import datetime
from app.utils.extract_area import extract_area_sqft


def clean_str(val) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def clean_numeric(val) -> float | None:
    if val is None:
        return None
    try:
        return float(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


# ── IBAPI ────────────────────────────────────────────────────────────────────

def normalise_ibapi(row: dict) -> dict:
    """
    Maps fetch_ibapi.py output fields → unified listings schema.

    Source fields:
        property_id, bank_name, branch, property_type, reserve_price,
        emd, state, district, city, auction_start, auction_end,
        emd_last_date, rowid, fetched_at
    """
    return {
        "property_id":   clean_str(row.get("property_id")),
        "bank_name":     clean_str(row.get("bank_name")),
        "branch":        clean_str(row.get("branch")),
        "property_type": clean_str(row.get("property_type")),
        "location":      clean_str(row.get("city")),
        "state":         clean_str(row.get("state")),
        "district":      clean_str(row.get("district")),
        "reserve_price": clean_numeric(row.get("reserve_price")),
        "emd":           clean_numeric(row.get("emd")),
        "auction_date":  clean_str(row.get("auction_start")),
        "status":        "active",
        "source":        "ibapi",
        "source_id":     clean_str(row.get("rowid")),
        "fetched_at":    datetime.now().isoformat(),
    }


# ── bankauctions.in ───────────────────────────────────────────────────────────

def _guess_property_type(property_details: str | None) -> str | None:
    """
    bankauctions.in has no clean property-type field — property_details is
    free text like 'Building: PEB Factory Shed: 1839.48 Sq.m'. Take the
    first ':'-delimited token as a best-effort type label.
    """
    if not property_details:
        return None
    return property_details.split(":")[0].strip() or None


def normalise_bankauctions(row: dict) -> dict:
    """
    Maps bankauctions.in API response fields → unified listings schema.

    Confirmed source fields (bankbid_recon.py, July 21):
        listing_id, institution, property_details, city, reserve_price,
        date_and_time_of_auction, last_date, url

    NOTE: bankauctions.in has no 'state' field (only city) — state will be
    NULL for every row from this source. property_type is a best-effort
    guess parsed from the free-text property_details field, not a clean
    categorical value like the other two sources. area_sqft_estimated is
    also a best-effort regex extraction from the same free-text field and
    will be NULL for most rows, since only a minority mention area.
    """
    return {
        "property_id":   None,                                          # no stable ID — dedup via composite key
        "bank_name":     clean_str(row.get("institution")),
        "branch":        None,
        "property_type": _guess_property_type(row.get("property_details")),
        "area_sqft_estimated": extract_area_sqft(row.get("property_details")),
        "location":      clean_str(row.get("city")),
        "state":         None,                                          # not available from this source
        "district":      None,
        "reserve_price": clean_numeric(row.get("reserve_price")),
        "emd":           None,                                          # not available from this source
        "auction_date":  clean_str(row.get("date_and_time_of_auction")),
        "status":        "active",
        "source":        "bankauctions",
        "source_id":     clean_str(row.get("listing_id")),
        "fetched_at":    datetime.now().isoformat(),
    }


# ── auctiontiger.in ───────────────────────────────────────────────────────────

def normalise_auctiontiger(row: dict) -> dict:
    """
    Maps auctiontiger.in DataTables API fields → unified listings schema.

    Confirmed source fields (from bankbid_recon.py):
        id, encrypted_id, bank, asset, city, state,
        price (float), price_display, date (or date_formatted)

    area_sqft_estimated is a best-effort regex extraction from the 'asset'
    free-text field and will be NULL for most rows (many 'asset' values
    are bulk multi-property listings or MR-number lists with no area
    mentioned at all).
    """
    return {
        "property_id":   None,
        "bank_name":     clean_str(row.get("bank")),
        "branch":        None,
        "property_type": clean_str(row.get("asset")),
        "area_sqft_estimated": extract_area_sqft(row.get("asset")),
        "location":      clean_str(row.get("city")),
        "state":         clean_str(row.get("state")),
        "district":      None,
        "reserve_price": clean_numeric(row.get("price")),
        "emd":           None,                                          # not in auctiontiger API
        "auction_date":  clean_str(row.get("date") or row.get("date_formatted")),
        "status":        "active",
        "source":        "auctiontiger",
        "source_id":     clean_str(row.get("encrypted_id")),           # used as incremental dedup key
        "fetched_at":    datetime.now().isoformat(),
    }
def build_source_url(source: str, record: dict) -> str | None:
    if source == "bankauctions":
        return record.get("url")
    elif source == "ibapi":
        return "https://ibapi.in/sale_info_home.aspx"
    elif source == "auctiontiger":
        listing_id = record.get("id")
        if listing_id is not None:
            return f"https://www.auctiontiger.in/details-page/{listing_id}/"
        return "https://www.auctiontiger.in/"
    return None
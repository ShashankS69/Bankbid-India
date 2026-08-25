import requests
import json
import re
from datetime import datetime


IBAPI_URL = "https://ibapi.in/Sale_Info_Home.aspx/Button_search_Click"
IBAPI_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Referer": "https://ibapi.in/sale_info_home.aspx",
}


def clean_property_id(html_str: str) -> str:
    match = re.search(r'>([^<]+)</a>', html_str)
    return match.group(1) if match else html_str


def fetch_ibapi() -> list[dict]:
    """
    Fetches all live listings from IBAPI.
    Returns list of raw dicts (pre-normalisation).
    """
    payload = {"key_val": [["Bank", ""]]}
    response = requests.post(IBAPI_URL, json=payload, headers=IBAPI_HEADERS, timeout=30)
    response.raise_for_status()

    raw = json.loads(response.json()["d"])

    listings = []
    for row in raw:
        listings.append({
            "property_id":  clean_property_id(row["Property ID"]),
            "bank_name":    row["Bank Name"],
            "branch":       row["Branch"],
            "property_type": row["Property"],
            "reserve_price": row["Reserve Price (Rs)"],
            "emd":          row["EMD (Rs)"],
            "state":        row["State"],
            "district":     row["District"],
            "city":         row["City"],
            "auction_start": row["Auction Start Date & Time"],
            "auction_end":  row["Auction End Date & Time"],
            "emd_last_date": row["EMD Last Date & Time"],
            "rowid":        row["ROWID"],
            "fetched_at":   datetime.now().isoformat(),
        })

    return listings

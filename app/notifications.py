import os
import requests
from datetime import datetime, timezone
from app.supabase_client import query_listings, HEADERS, SUPABASE_URL

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM = os.getenv("RESEND_FROM", "BankBid India <onboarding@resend.dev>")


def get_active_saved_searches() -> list[dict]:
    """Fetch all active saved searches from Supabase."""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/saved_searches",
        headers=HEADERS,
        params={"select": "*", "is_active": "eq.true"},
    )
    if response.status_code not in (200, 206):
        return []
    return response.json()


def update_last_notified(search_id: str, when: str) -> None:
    """Stamp last_notified_at after a successful alert send."""
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/saved_searches",
        headers=HEADERS,
        params={"id": f"eq.{search_id}"},
        json={"last_notified_at": when},
    )


def _format_match_row(m: dict) -> str:
    """Build one <li> row for a matched listing, avoiding nested f-string issues."""
    bank = m.get("bank_name") or "Bank N/A"
    ptype = m.get("property_type") or "Property"
    location = m.get("location") or "Undisclosed"
    price = m.get("reserve_price") or "On Request"
    source_url = m.get("source_url")

    link_part = f" (via {source_url})" if source_url else ""
    return f"<li><b>{bank}</b> — {ptype} in {location} — Reserve: ₹{price}{link_part}</li>"


def send_alert_email(to_email: str, matches: list[dict]) -> bool:
    """Send a simple email listing new matches via Resend."""
    if not RESEND_API_KEY:
        print("RESEND_API_KEY not set — skipping email send")
        return False

    rows_html = "".join(_format_match_row(m) for m in matches)

    payload = {
        "from": RESEND_FROM,
        "to": [to_email],
        "subject": f"BankBid India: {len(matches)} new listing(s) match your saved search",
        "html": f"<p>New listings matching your saved search:</p><ul>{rows_html}</ul>",
    }

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
    )
    return response.status_code in (200, 201, 202)


def run_saved_search_alerts() -> dict:
    """
    Called after fetch-all finishes upserting.
    For each active saved search, find listings newly fetched since
    last_notified_at (or created_at if never notified) and email if any.
    """
    searches = get_active_saved_searches()
    now = datetime.now(timezone.utc).isoformat()
    results = {"checked": len(searches), "notified": 0, "errors": []}

    for search in searches:
        since = search.get("last_notified_at") or search.get("created_at")

        matches, _total = query_listings(
            city=search.get("city"),
            state=search.get("state"),
            property_type=search.get("property_type"),
            bank_name=search.get("bank_name"),
            source=search.get("source"),
            min_price=search.get("min_price"),
            max_price=search.get("max_price"),
            max_emd=search.get("max_emd"),
            price_availability=search.get("price_availability"),
            since=since,
            limit=50,
        )

        if not matches:
            continue

        sent = send_alert_email(search["email"], matches)
        if sent:
            update_last_notified(search["id"], now)
            results["notified"] += 1
        else:
            results["errors"].append({"search_id": search["id"], "email": search["email"]})

    return results
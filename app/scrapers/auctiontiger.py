import requests
import time


AT_URL = "https://www.auctiontiger.in/get-auction-data/"
AT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    "Referer": "https://www.auctiontiger.in/",
    "X-Requested-With": "XMLHttpRequest",
}

PAGE_SIZE = 500


def _build_params(start: int, draw: int) -> dict:
    """Builds the full DataTables query params for a given page."""
    return {
        "draw": str(draw),
        "start": str(start),
        "length": str(PAGE_SIZE),
        "search[value]": "",
        "search[regex]": "false",
        "global_search": "",
        "columns[0][data]": "id",
        "columns[0][searchable]": "true",
        "columns[0][orderable]": "true",
        "columns[0][search][value]": "",
        "columns[0][search][regex]": "false",
        "columns[1][data]": "bank",
        "columns[1][searchable]": "true",
        "columns[1][orderable]": "true",
        "columns[1][search][value]": "",
        "columns[1][search][regex]": "false",
        "columns[2][data]": "asset",
        "columns[2][searchable]": "true",
        "columns[2][orderable]": "false",
        "columns[2][search][value]": "",
        "columns[2][search][regex]": "false",
        "columns[3][data]": "city",
        "columns[3][searchable]": "true",
        "columns[3][orderable]": "true",
        "columns[3][search][value]": "",
        "columns[3][search][regex]": "false",
        "columns[4][data]": "state",
        "columns[4][searchable]": "true",
        "columns[4][orderable]": "true",
        "columns[4][search][value]": "",
        "columns[4][search][regex]": "false",
        "columns[5][data]": "price_display",
        "columns[5][searchable]": "true",
        "columns[5][orderable]": "true",
        "columns[5][search][value]": "",
        "columns[5][search][regex]": "false",
        "columns[6][data]": "date_formatted",
        "columns[6][searchable]": "true",
        "columns[6][orderable]": "true",
        "columns[6][search][value]": "",
        "columns[6][search][regex]": "false",
        "columns[7][data]": "action",
        "columns[7][searchable]": "true",
        "columns[7][orderable]": "false",
        "columns[7][search][value]": "",
        "columns[7][search][regex]": "false",
        "order[0][column]": "5",
        "order[0][dir]": "desc",
        "order[1][column]": "6",
        "order[1][dir]": "desc",
        "_": str(int(time.time() * 1000)),
    }


def fetch_auctiontiger(known_ids: set[str] | None = None, full_fetch: bool = False) -> list[dict]:
    """
    Fetches listings from auctiontiger.in.

    IMPORTANT: results are sorted by price desc, then date desc — NOT
    chronologically or by ID. New listings can appear anywhere in the sort
    order, not just at the front. So both modes below walk every page; the
    only difference is whether already-known records get filtered out of
    the returned list.

    Args:
        known_ids:   Set of encrypted_ids already in Supabase. If provided,
                     already-known records are excluded from the result
                     (but every page is still fetched).
        full_fetch:  If True, ignores known_ids entirely and returns everything,
                     including records already in Supabase (Supabase upsert
                     will just no-op on those).

    Returns list of raw dicts (pre-normalisation) — only new records unless
    full_fetch=True.
    """
    all_records = []
    start = 0
    draw = 1
    known_ids = known_ids or set()

    while True:
        params = _build_params(start, draw)
        response = requests.get(AT_URL, params=params, headers=AT_HEADERS, timeout=30)
        response.raise_for_status()

        data = response.json()
        page_records = data.get("data", [])

        # --- DEBUG: remove once the pagination gap is diagnosed ---
        print(
            f"[draw={draw}] start={start} got={len(page_records)} "
            f"recordsTotal={data.get('recordsTotal')} "
            f"recordsFiltered={data.get('recordsFiltered')}"
        )
        # ------------------------------------------------------------

        if not page_records:
            print(f"[draw={draw}] EMPTY PAGE — stopping here")
            break  # no more data

        if full_fetch:
            all_records.extend(page_records)
        else:
            all_records.extend(
                r for r in page_records if r.get("encrypted_id") not in known_ids
            )

        # Check if we've fetched everything
        total = data.get("recordsFiltered", data.get("recordsTotal", 0))
        start += PAGE_SIZE
        draw += 1

        if start >= total:
            print(f"[draw={draw}] start={start} >= total={total} — stopping here")
            break

        # Polite delay — don't hammer the server
        time.sleep(0.2)

    print(f"TOTAL RECORDS COLLECTED: {len(all_records)}")
    return all_records
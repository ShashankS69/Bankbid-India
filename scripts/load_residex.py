"""
One-time (well, once-a-quarter) loader: pushes residex_prices.csv into
a `residex_prices` table in Supabase.

Talks to Supabase directly via the `supabase` package and environment
variables, rather than importing your app's internal client, so it
has no dependency on your app package's internal structure.

Needs SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY,
whichever your other scripts like push_to_supabase.py already use) set
as environment variables -- check push_to_supabase.py for the exact
names it reads if you're not sure.

Run from anywhere, project root or scripts/ folder:
    python3 scripts/load_residex.py scripts/residex_prices.csv

--- One-time setup: create the table in Supabase SQL editor first ---

create table if not exists residex_prices (
    id bigint generated always as identity primary key,
    city_id integer not null,
    city_name text not null,
    quarter text not null,          -- e.g. "25-26 Q4"
    quarter_label text not null,    -- e.g. "Mar 2026"
    price_composite numeric,        -- Rs/sqft, all unit sizes blended
    price_lt60sqm numeric,          -- Rs/sqft, <=60 sqm units
    price_60to110sqm numeric,       -- Rs/sqft, 60-110 sqm units
    price_gt110sqm numeric,         -- Rs/sqft, >110 sqm units
    fetched_at timestamptz default now(),
    unique (city_id, quarter)
);

create index if not exists idx_residex_city_name on residex_prices (lower(city_name));
"""

import csv
import os
import sys

from supabase import create_client

try:
    from dotenv import load_dotenv
    # look for .env in the project root (one level up from scripts/),
    # falling back to the current directory if not found there
    _here = os.path.dirname(os.path.abspath(__file__))
    _root_env = os.path.join(_here, "..", ".env")
    if os.path.exists(_root_env):
        load_dotenv(_root_env)
    else:
        load_dotenv()  # falls back to searching cwd upward
except ImportError:
    pass  # if python-dotenv isn't installed, env vars must already be exported


def get_client():
    url = os.environ.get("SUPABASE_URL")
    key = (
        os.environ.get("SUPABASE_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
    )
    if not url or not key:
        raise RuntimeError(
            "Missing SUPABASE_URL / SUPABASE_KEY env vars. "
            "Check your .env file's exact variable names (open it and "
            "compare against what push_to_supabase.py reads) -- if the "
            "names differ from SUPABASE_URL/SUPABASE_KEY/"
            "SUPABASE_SERVICE_ROLE_KEY, edit get_client() above to match."
        )
    return create_client(url, key)


def load_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    records = []
    for r in rows:
        records.append({
            "city_id": int(float(r["city_id"])),
            "city_name": r["city_name"],
            "quarter": r["quarter"],
            "quarter_label": r["quarter_label"],
            "price_composite": float(r["price_composite"]) if r["price_composite"] else None,
            "price_lt60sqm": float(r["price_lt60sqm"]) if r["price_lt60sqm"] else None,
            "price_60to110sqm": float(r["price_60to110sqm"]) if r["price_60to110sqm"] else None,
            "price_gt110sqm": float(r["price_gt110sqm"]) if r["price_gt110sqm"] else None,
        })
    return records


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 load_residex.py <path-to-residex_prices.csv>")
        sys.exit(1)

    path = sys.argv[1]
    records = load_csv(path)
    print(f"Loaded {len(records)} rows from {path}")

    client = get_client()
    result = (
        client.table("residex_prices")
        .upsert(records, on_conflict="city_id,quarter")
        .execute()
    )
    print(f"Upserted {len(result.data)} rows into residex_prices")


if __name__ == "__main__":
    main()

import pandas as pd
import requests
import json
import os
from datetime import date
from dotenv import load_dotenv

load_dotenv()

# Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def clean_numeric(val):
    if pd.isna(val):
        return None
    return float(str(val).replace(",", "").strip())

def clean_str(val):
    if pd.isna(val):
        return None
    return str(val).strip()

# Load CSV
df = pd.read_csv("ibapi_listings_20260625.csv")
print(f"Loaded {len(df)} rows")
print(df.columns.tolist())

# Map CSV columns → table schema
records = []
for _, row in df.iterrows():
    records.append({
        "property_id":   clean_str(row["property_id"]),
        "bank_name":     clean_str(row["bank_name"]),
        "branch":        clean_str(row["branch"]),
        "property_type": clean_str(row["property_type"]),
        "location":      clean_str(row["city"]),
        "state":         clean_str(row["state"]),
        "district":      clean_str(row["district"]),
        "reserve_price": clean_numeric(row["reserve_price"]),
        "emd":           clean_numeric(row["emd"]),
        "auction_date":  clean_str(row["auction_start"]),
        "status":        "active",
        "fetched_at":    str(date.today())
    })

# Push in batches of 500
BATCH = 500
total_pushed = 0
for i in range(0, len(records), BATCH):
    batch = records[i:i+BATCH]
    # Use default=str to handle any remaining non-serializable values
    payload = json.dumps(batch, default=str)
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/listings",
        headers=HEADERS,
        data=payload
    )
    if response.status_code in (200, 201):
        total_pushed += len(batch)
        print(f"✅ Pushed rows {i+1}–{i+len(batch)}")
    else:
        print(f"❌ Error on batch {i//BATCH + 1}: {response.status_code} — {response.text}")

print(f"\n✅ Done — {total_pushed} rows pushed to Supabase")
import pandas as pd
import requests
import time

# Load existing IBAPI data
df_ibapi = pd.read_csv('/Users/shashankshekhar/Desktop/bankbid-india/ibapi_listings_20260629.csv')
print("=== Columns ===")
print(df_ibapi.columns.tolist())

print("\n=== Sample Row ===")
print(df_ibapi.head(3).to_string())

print("\n=== Shape ===")
print(df_ibapi.shape)

# Check auction date coverage
print("\n=== Auction Date Coverage ===")
print(df_ibapi[['auction_start', 'auction_end', 'emd_last_date']].notna().sum())

# Check reserve_price nulls and type
print("\n=== Reserve Price Issues ===")
print(f"Null reserve_price: {df_ibapi['reserve_price'].isna().sum()}")
print(f"Dtype: {df_ibapi['reserve_price'].dtype}")

# Bank coverage
print("\n=== Banks in IBAPI data ===")
print(df_ibapi['bank_name'].value_counts())

# State distribution
print("\n=== State distribution ===")
print(df_ibapi['state'].value_counts().head(10))

# =============================================
# AGGREGATOR SITE RECON — June 29, 2026
# =============================================

# bankauctions.in — CONFIRMED ✅
# Endpoint: POST https://bankauctions.in/wp-json/eauc-table/v1/home_page
# Auth: No nonce needed — Origin + Referer + XHR headers sufficient
# Total listings: 1,151
# Auction dates: populated (date_and_time_of_auction + last_date)
# Reserve price: clean integer string, 0% null
# Institution type: private banks, HFCs, NBFCs — zero overlap with IBAPI
# Pagination: client-side only — full dataset returned in single POST call

url = "https://bankauctions.in/wp-json/eauc-table/v1/home_page"

headers = {
    "Origin": "https://bankauctions.in",
    "Referer": "https://bankauctions.in/",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
}

response = requests.post(url, headers=headers)
print(f"\n=== bankauctions.in API Test ===")
print(f"Status: {response.status_code}")

data = response.json()
print(f"Total listings: {len(data['data'])}")
print(f"Sample: {data['data'][0]}")

# =============================================
# auctiontiger.in API Test
# auctiontiger.in — CONFIRMED ✅ 🔥
# Endpoint: GET https://www.auctiontiger.in/get-auction-data/
# Type: DataTables server-side pagination API
# Total records: 338,592
# Pagination: start + length params (set length=500, paginate start by 500)
# Fields: id, encrypted_id, bank, asset, city, state, price (float), price_display, date
# Date populated: YES on all sample records
# Price format: clean float
# Notes: Largest source by far — 30x IBAPI. Covers all major PSU + private banks.
# =============================================

at_url = "https://www.auctiontiger.in/get-auction-data/"

at_params = {
    "draw": "1",
    "start": "0",
    "length": "10",
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
    "_": str(int(time.time() * 1000))
}

at_headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    "Referer": "https://www.auctiontiger.in/",
    "X-Requested-With": "XMLHttpRequest"
}

at_response = requests.get(at_url, params=at_params, headers=at_headers)
print(f"\n=== auctiontiger.in API Test ===")
print(f"Status: {at_response.status_code}")

at_data = at_response.json()
print(f"Total records: {at_data['recordsTotal']}")
print(f"Records filtered: {at_data['recordsFiltered']}")
print(f"Sample record: {at_data['data'][0]}")
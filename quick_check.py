# quick_check.py — run once, don't commit
from app.scrapers.auctiontiger import fetch_auctiontiger
from app.scrapers.bankauctions import fetch_bankauctions
import json

at = fetch_auctiontiger(full_fetch=True)
print("=== AUCTIONTIGER sample keys ===")
print(json.dumps(at[0], indent=2, default=str))

ba = fetch_bankauctions()
print("\n=== BANKAUCTIONS sample keys ===")
print(json.dumps(ba[0], indent=2, default=str))
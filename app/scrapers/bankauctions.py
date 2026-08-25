import requests


BA_URL = "https://bankauctions.in/wp-json/eauc-table/v1/home_page"
BA_HEADERS = {
    "Origin": "https://bankauctions.in",
    "Referer": "https://bankauctions.in/",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
}


def fetch_bankauctions() -> list[dict]:
    """
    Fetches all listings from bankauctions.in.
    Single POST call — full dataset returned (no pagination).
    Returns list of raw dicts (pre-normalisation).
    """
    response = requests.post(BA_URL, headers=BA_HEADERS, timeout=30)
    response.raise_for_status()

    data = response.json()
    return data["data"]

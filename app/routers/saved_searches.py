from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import requests

from app.supabase_client import HEADERS, SUPABASE_URL

router = APIRouter()


class SavedSearchIn(BaseModel):
    email: EmailStr
    phone: str | None = None
    city: str | None = None
    state: str | None = None
    property_type: str | None = None
    bank_name: str | None = None
    source: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    max_emd: float | None = None
    price_availability: str | None = None


@router.post("/saved-searches")
def create_saved_search(payload: SavedSearchIn):
    """
    Inserts a new saved search using the service-role Supabase client
    (same HEADERS/SUPABASE_URL notifications.py already uses), since
    RLS is enabled on saved_searches and there's no end-user auth
    session on this route.
    """
    body = payload.model_dump(exclude_none=True)

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/saved_searches",
        headers={**HEADERS, "Prefer": "return=representation"},
        json=body,
    )

    if response.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail="Could not save search")

    return response.json()[0]
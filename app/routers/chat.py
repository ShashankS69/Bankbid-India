"""
Feature #8 — AI chatbot + recommendation feature. (Gemini version)

Drop this in as app/routers/chat.py. Uses Google's Gemini API instead of
Anthropic's — genuine ongoing free tier, no billing required to start.
Endpoint shape, request/response models, and filter param names are
unchanged from the Claude version, so ChatBot.jsx / ChatWidget.jsx / your
lib/api.js sendChatMessage() need zero changes.

Param names below are confirmed against lib/api.js's fetchListings(), which
documents GET /api/listings exactly: city, state, property_type, bank_name,
source, min_price, max_price, max_emd, price_availability, has_rental_yield,
closing_within, sort, limit, offset.

Fully wired to your real query_listings + ROI/RESIDEX attachment functions —
no remaining TODOs. If price_availability's accepted values in listings.py
differ from a free string, tighten SearchIntent.price_availability below.

CHANGES IN THIS VERSION:
  - Fixed an id type mismatch: SearchIntent/Recommendation type listing ids
    as `str` (so Gemini's structured output returns them as strings), but
    Supabase's `id` column is bigserial -> Python int. `by_id` is now keyed
    on `str(c["id"])` so the ranked_ids/top_pick_id lookups actually match,
    instead of silently returning an empty `listings` list.
  - Added `thinking_config=ThinkingConfig(thinking_level="low")` to both
    Gemini calls. Gemini 3.x models default to thinking_level="high" unless
    told otherwise, which adds real reasoning-token latency that isn't
    needed for either a structured extraction step or a short, tightly
    scoped recommendation write-up. This is the main lever for the
    slow-response complaint. If the recommendation quality feels thin at
    "low", try "medium" on the Step 3 call only.
  - Added stage timing (prints to stdout, visible in Render's logs) around
    each step: intent-extraction call, the DB query, the RESIDEX/ROI attach
    loop, and the recommendation call. If every message is slow (not just
    the first after idle), the next step is reading these numbers off a
    real request to see which stage actually dominates — no more guessing
    blind. Two likely candidates if the two Gemini calls aren't the whole
    story: (a) `_attach_residex_comparison`/`_attach_roi_estimate` doing a
    network or DB call per candidate rather than working off already-loaded
    data (up to 20 sequential lookups per message), or (b) `query_listings`
    itself being slow on filters like city/state if those columns aren't
    indexed. The timing breakdown will show which.

SETUP:
  pip install google-genai --break-system-packages
  Get a free key at https://aistudio.google.com/apikey (no card needed
  for the Flash models). Set it as GEMINI_API_KEY in your backend .env —
  the SDK reads that env var automatically, no explicit api_key= needed.
"""

import json
import time
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel

from app.supabase_client import query_listings
from app.routers.listings import _attach_roi_estimate, _attach_residex_comparison

router = APIRouter()

# Reads GEMINI_API_KEY from the environment automatically.
client = genai.Client()
MODEL = "gemini-3.6-flash"

# Low thinking level: fast, sufficient for a scoped extraction/summarization
# task. Bump to "medium" on the Step 3 call if recommendation quality needs
# more headroom.
LOW_THINKING = types.ThinkingConfig(thinking_level="low")


# --- Structured output schemas (Gemini accepts pydantic models directly as response_schema) ---


class SearchIntent(BaseModel):
    city: Optional[str] = None
    state: Optional[str] = None
    property_type: Optional[str] = None  # residential | commercial | industrial | land
    bank_name: Optional[str] = None
    source: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    max_emd: Optional[float] = None
    # TODO(wire): confirm price_availability's actual accepted values in listings.py
    price_availability: Optional[str] = None
    closing_within: Optional[int] = None  # 3 | 7 | 14
    has_rental_yield: Optional[bool] = None
    # A specific lot/property number the user referenced directly (e.g.
    # "describe lot 2379846", "tell me about property 2379846", "what's the
    # deal with lot no. 2379846"). Matches PropertyCard.jsx's `property_id`
    # field, shown on every card as "Lot {property_id}". When this is set,
    # Step 2 looks the lot up directly instead of running a filtered search.
    property_id: Optional[str] = None
    intent: str  # investment | own_use | office_relocation | unclear | lookup
    priority: Optional[str] = None  # short phrase: what the user cares about most
    needs_clarification: bool
    clarifying_question: Optional[str] = None


class Recommendation(BaseModel):
    reply: str
    top_pick_id: Optional[str] = None
    top_pick_reasoning: Optional[str] = None
    ranked_ids: list[str]


INTENT_SYSTEM_PROMPT = """You extract structured property-search filters and the
user's underlying intent from a natural-language query about bank-auction
properties in India. Use the conversation history to fill in details the user
gave earlier and hasn't repeated.

If the user references a specific lot or property number directly (e.g.
"describe lot 2379846", "tell me more about property 2379846", "what about
lot no. 2379846"), extract the digits into property_id exactly as given, and
set intent to "lookup". A property_id on its own is a complete, valid
request — do NOT set needs_clarification to true just because no city/type/
budget was also given alongside it.

Otherwise, set needs_clarification to true ONLY if the query is too vague to
search at all (e.g. just "find me a property" with no city/type/budget
signal and no lot number) — in that case also fill clarifying_question with
one short question to ask."""

RECOMMEND_SYSTEM_PROMPT = """You are a property-recommendation assistant for a
bank-auction listing site in India. Given the user's message and a JSON array
of candidate listings, write a 1-3 sentence conversational reply (plain
language, no markdown) that summarizes what you found — e.g. how many
properties matched, and what they broadly have in common (location, type,
price range). Then pick the single best-fit listing as top_pick_id with 1-2
sentences of reasoning that cites concrete numbers from the data (reserve
price, EMD, rental yield from roi_estimate if present, whether residex_comparison
shows it's priced below market, or a price drop via previous_price vs
reserve_price). Return ranked_ids as every candidate ordered best-to-worst
fit, with top_pick_id first. If no candidate id is a clear standout, leave
top_pick_id empty but still return ranked_ids and still describe what was
found in the reply.

If there is exactly one candidate (e.g. the user asked about a specific lot
number), skip the "found N properties" framing — just describe that one
listing directly, citing its concrete numbers, and set top_pick_id to its id."""


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []



class ChatResponse(BaseModel):
    reply: str
    top_pick_id: str | None
    top_pick_reasoning: str | None
    listings: list[dict[str, Any]]  # full listing objects, ranked, ready for PropertyCard


def _history_to_contents(history: list[ChatMessage]) -> list[types.Content]:
    # Gemini uses "model" where Anthropic/OpenAI use "assistant".
    return [
        types.Content(role="model" if m.role == "assistant" else "user", parts=[types.Part(text=m.content)])
        for m in history
    ]


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    contents = _history_to_contents(req.history) + [
        types.Content(role="user", parts=[types.Part(text=req.message)])
    ]

    # --- Step 1: extract structured intent ---
    _t0 = time.monotonic()
    intent_response = client.models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=INTENT_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=SearchIntent,
            thinking_config=LOW_THINKING,
        ),
    )
    _t1 = time.monotonic()
    print(f"[chat] step1 intent extraction: {_t1 - _t0:.2f}s")
    try:
        intent = SearchIntent.model_validate_json(intent_response.text)
    except Exception:
        raise HTTPException(status_code=502, detail="Model returned malformed intent JSON")

    if intent.needs_clarification:
        return ChatResponse(
            reply=intent.clarifying_question
            or "Could you tell me a bit more — city, budget, or what you're looking to use the property for?",
            top_pick_id=None,
            top_pick_reasoning=None,
            listings=[],
        )

    # --- Step 2: fetch candidates ---
    # Keys + call pattern match GET /listings in app/routers/listings.py exactly
    # (query_listings returns (results, total); has_rental_yield is a "true"/"false"
    # string, not a bool, per that route's Query param).
    intent_dict = intent.model_dump()

    has_rental_yield_str = None
    if intent_dict.get("has_rental_yield") is True:
        has_rental_yield_str = "true"
    elif intent_dict.get("has_rental_yield") is False:
        has_rental_yield_str = "false"

    results, _total = query_listings(
        city=intent_dict.get("city") or None,
        state=intent_dict.get("state") or None,
        property_type=(intent_dict.get("property_type") or None)
        if intent_dict.get("property_type") != "any"
        else None,
        bank_name=intent_dict.get("bank_name") or None,
        source=intent_dict.get("source") or None,
        min_price=intent_dict.get("min_price"),
        max_price=intent_dict.get("max_price"),
        max_emd=intent_dict.get("max_emd"),
        price_availability=intent_dict.get("price_availability") or None,
        has_rental_yield=has_rental_yield_str,
        closing_within=intent_dict.get("closing_within"),
        locations=None,
        auction_date=None,
        sort=None,
        limit=20,
        offset=0,
    )
    _t2 = time.monotonic()
    print(f"[chat] step2 query_listings: {_t2 - _t1:.2f}s ({len(results)} results)")

    candidates = [_attach_roi_estimate(_attach_residex_comparison(r)) for r in results]
    _t3 = time.monotonic()
    print(f"[chat] step2 attach roi/residex ({len(results)} candidates): {_t3 - _t2:.2f}s")

    if not candidates:
        return ChatResponse(
            reply="I couldn't find any listings matching that right now — want to try a wider price range or a nearby city?",
            top_pick_id=None,
            top_pick_reasoning=None,
            listings=[],
        )

    # --- Step 3: reasoned recommendation over candidates ---
    compact_candidates = [
        {
            "id": c["id"],
            "type": c.get("property_type"),
            "location": c.get("city"),
            "reserve_price": c.get("reserve_price"),
            "emd": c.get("emd"),
            "previous_price": c.get("previous_price"),
            "roi_estimate": c.get("roi_estimate"),
            "residex_comparison": c.get("residex_comparison"),
            "auction_date": c.get("auction_date"),
        }
        for c in candidates
    ]

    reco_contents = contents + [
        types.Content(
            role="user",
            parts=[
                types.Part(
                    text=(
                        "Here are the candidate listings as JSON (for your reasoning only, "
                        "don't repeat raw JSON in your reply):\n"
                        + json.dumps(compact_candidates)
                        + f"\n\nUser's stated priority: {intent.priority or 'not specified'}. "
                        f"User's intent: {intent.intent}."
                    )
                )
            ],
        )
    ]

    reco_response = client.models.generate_content(
        model=MODEL,
        contents=reco_contents,
        config=types.GenerateContentConfig(
            system_instruction=RECOMMEND_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=Recommendation,
            thinking_config=LOW_THINKING,
        ),
    )
    _t4 = time.monotonic()
    print(f"[chat] step3 recommendation: {_t4 - _t3:.2f}s")
    try:
        reco = Recommendation.model_validate_json(reco_response.text)
    except Exception:
        raise HTTPException(status_code=502, detail="Model returned malformed recommendation JSON")

    # NOTE: candidate ids from Supabase are ints (bigserial column), but
    # ranked_ids/top_pick_id come back from Gemini as strings (Recommendation
    # types them `str` so the structured-output schema is JSON-string typed).
    # Key by_id on the stringified id so the lookup below actually matches —
    # previously this silently produced an empty `listings` list even when
    # the model picked good candidates.
    by_id = {str(c["id"]): c for c in candidates}
    ranked_listings = [by_id[i] for i in reco.ranked_ids if i in by_id]

    print(f"[chat] TOTAL: {time.monotonic() - _t0:.2f}s")

    return ChatResponse(
        reply=reco.reply,
        top_pick_id=reco.top_pick_id or None,
        top_pick_reasoning=reco.top_pick_reasoning,
        listings=ranked_listings,
    )
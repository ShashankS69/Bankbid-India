// Central place to point at your FastAPI backend.
// Local dev: uvicorn is running at http://127.0.0.1:8000 (confirmed from your terminal).

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

/**
 * Fetch listings with optional filters.
 * Matches GET /api/listings in app/routers/listings.py exactly:
 * city, state, property_type, bank_name, source, min_price, max_price,
 * max_emd, price_availability, has_rental_yield, closing_within, sort,
 * limit (default 50, max 500), offset (default 0).
 * Response shape: { count, listings }.
 */
export async function fetchListings(filters = {}) {
  const params = new URLSearchParams();

  if (filters.city) params.set("city", filters.city);

  if (filters.locations && filters.locations.length) {
    params.set("locations", filters.locations.join("|"));
  }

  if (filters.auctionDate) {
    params.set("auction_date", filters.auctionDate);
  }

  if (filters.bank) params.set("bank_name", filters.bank);   // FilterBar uses `bank`, backend expects `bank_name`
  if (filters.property_type) params.set("property_type", filters.property_type);
  if (filters.state) params.set("state", filters.state);
  if (filters.source) params.set("source", filters.source);
  if (filters.min_price) params.set("min_price", filters.min_price);
  if (filters.max_price) params.set("max_price", filters.max_price);
  if (filters.max_emd) params.set("max_emd", filters.max_emd);   // EMD affordability filter (Feature #2)
  if (filters.price_availability) params.set("price_availability", filters.price_availability);
  if (filters.has_rental_yield) params.set("has_rental_yield", filters.has_rental_yield);   // Rental yield availability filter (Feature #5)
  if (filters.closing_within) params.set("closing_within", filters.closing_within);   // Closing-soon filter (Feature #6)
  if (filters.sort) params.set("sort", filters.sort);

  params.set("limit", filters.limit || 24);
  params.set("offset", filters.offset || 0);

  const res = await fetch(`${API_BASE}/api/listings?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch listings: ${res.status}`);
  }

  const data = await res.json();

  // { count, listings } -> normalize to { total, results }
  return { total: data.count, results: data.listings };
}

/**
 * Fetch every listing matching `filters`, paging past the backend's
 * 500-row-per-request cap.
 *
 * Needed for full-dataset views (calendar, map) where you can't just
 * bump `limit` — the API clamps it server-side regardless of what you
 * ask for, so a single fetchListings({ limit: 50000 }) call silently
 * returns only the first 500 rows with no error.
 *
 * @param {object} filters - same filters fetchListings takes (limit/offset ignored)
 * @param {(loaded: number, total: number) => void} [onProgress] - optional progress callback
 */
export async function fetchAllListings(filters = {}, onProgress) {
  const PAGE_SIZE = 500; // matches backend's max
  let offset = 0;
  let total = Infinity;
  const all = [];

  while (offset < total) {
    const { total: count, results } = await fetchListings({
      ...filters,
      limit: PAGE_SIZE,
      offset,
    });

    total = count ?? 0;
    all.push(...(results || []));
    offset += PAGE_SIZE;
    onProgress?.(all.length, total);

    // Safety valve: if the backend ever returns an empty page before
    // we've reached `total`, stop instead of looping forever.
    if (!results || results.length === 0) break;
  }

  return all;
}

/**
 * Trigger a fresh fetch-all across the 3 sources.
 * Matches POST /api/fetch-all in app/routers/fetch.py.
 * Response shape: { total_new_listings, sources: { ibapi: {...}, bankauctions: {...}, auctiontiger: {...} } }.
 */
export async function triggerFetchAll() {
  const res = await fetch(`${API_BASE}/api/fetch-all`, { method: "POST" });

  if (!res.ok) {
    throw new Error(`Fetch-all failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Summary counts by source, for the "Fetch latest" panel or a future stats strip.
 * Matches GET /api/listings/stats/summary. Response shape: { sources: [{ source, count }] }.
 */
export async function fetchSourceSummary() {
  const res = await fetch(`${API_BASE}/api/listings/stats/summary`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch summary: ${res.status}`);
  }

  return res.json();
}

/**
 * Save the current filter set as an alert.
 * Matches POST /api/saved-searches in app/routers/saved_searches.py.
 * Translates FilterBar's `bank` key to the backend's `bank_name`,
 * same as fetchListings does. `phone` is optional and unused for now
 * (WhatsApp/SMS alerts deferred) — stored for when that channel is built.
 */
export async function saveSearch(filters, email, phone) {
  const body = {
    email,
    phone: phone || undefined,
    city: filters.city || undefined,
    state: filters.state || undefined,
    property_type: filters.property_type || undefined,
    bank_name: filters.bank || undefined,
    source: filters.source || undefined,
    min_price: filters.min_price || undefined,
    max_price: filters.max_price || undefined,
    max_emd: filters.max_emd || undefined,
    price_availability: filters.price_availability || undefined,
  };

  const res = await fetch(`${API_BASE}/api/saved-searches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to save search: ${res.status}`);
  }

  return res.json();
}

/**
 * Send a chat message + prior turns to the AI recommendation feature.
 * Matches POST /api/chat in app/routers/chat.py.
 * Response shape: { reply, top_pick_id, top_pick_reasoning, listings }.
 */
export async function sendChatMessage(message, history = []) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  return res.json();
}
// Central place to point at your FastAPI backend.
// Local dev: uvicorn is running at http://127.0.0.1:8000 (confirmed from your terminal).
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

/**
 * Fetch listings with optional filters.
 * Matches GET /api/listings in app/routers/listings.py exactly:
 * city, state, property_type, bank_name, source, min_price, max_price,
 * max_emd, price_availability, sort, limit (default 50, max 500), offset (default 0).
 * Response shape: { count, listings }.
 */
export async function fetchListings(filters = {}) {
  const params = new URLSearchParams();

  if (filters.city) params.set("city", filters.city);
  if (filters.bank) params.set("bank_name", filters.bank);   // FilterBar uses `bank`, backend expects `bank_name`
  if (filters.property_type) params.set("property_type", filters.property_type);
  if (filters.state) params.set("state", filters.state);
  if (filters.source) params.set("source", filters.source);
  if (filters.min_price) params.set("min_price", filters.min_price);
  if (filters.max_price) params.set("max_price", filters.max_price);
  if (filters.max_emd) params.set("max_emd", filters.max_emd);   // EMD affordability filter (Feature #2)
  if (filters.price_availability) params.set("price_availability", filters.price_availability);
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
"use client";

import useFavorites from "@/lib/useFavorites";
import { formatINR, titleCase, formatDate } from "@/lib/format";

const MAX_COMPARE = 3;

export default function CompareFavorites({ selectedIds, onAdd }) {
  const { favoritesList, removeFavorite, loaded } = useFavorites();

  const atLimit = selectedIds.length >= MAX_COMPARE;

  return (
    <div className="lot-ticket rounded-sm p-4 flex flex-col gap-4">
      <span className="lot-notch-l" aria-hidden="true" />
      <span className="lot-notch-r" aria-hidden="true" />

      <div>
        <p className="font-mono text-lg font-extrabold tracking-widest text-gold uppercase mb-1">
          Your Favorites
        </p>
        <p className="text-slate text-sm font-body">
          Star a listing from the main grid to save it here, then pick up to {MAX_COMPARE} to compare.
        </p>
      </div>

      {!loaded && <p className="text-slate text-sm font-mono">Loading…</p>}

      {loaded && favoritesList.length === 0 && (
        <p className="text-slate-dim text-sm font-mono">
          No favorites yet — tap the ☆ on any listing to add it here.
        </p>
      )}

      {loaded && favoritesList.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
          {favoritesList.map((l) => {
            const isSelected = selectedIds.includes(l.id);
            const place = [titleCase(l.location), titleCase(l.state)]
              .filter(Boolean)
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .join(", ");

            return (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 border border-ledger-line rounded-sm px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm text-ink truncate">
                    Lot {l.property_id || "—"} · {place || "Undisclosed"}
                  </p>
                  <p className="text-[11px] font-mono text-slate-dim truncate">
                    {l.bank_name ? titleCase(l.bank_name) : "Bank N/A"} · {formatINR(l.reserve_price)} · {formatDate(l.auction_date)}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => onAdd(l)}
                    disabled={isSelected || atLimit}
                    className="text-xs font-mono uppercase tracking-wide text-gold hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSelected ? "Added" : atLimit ? "Limit reached" : "Add to Compare"}
                  </button>
                  <button
                    onClick={() => removeFavorite(l.id)}
                    className="text-[10px] font-mono uppercase tracking-wide !text-red-600 hover:!text-red-800 transition-colors"
                  >
                    Unfavorite
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
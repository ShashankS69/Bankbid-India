"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import PropertyCard from "./PropertyCard";
import { fetchListings } from "@/lib/api";

export default function ListingGrid({ filters, onFilterChange, refreshKey }) {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const limit = filters.limit || 54;
  const offset = filters.offset || 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = total ? Math.ceil(total / limit) : 1;

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { total: count, results: rows } = await fetchListings(filters);
      setListings(rows || []);
      setTotal(count ?? (rows || []).length);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    const newOffset = (newPage - 1) * limit;
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        offset: newOffset,
      });
    }
  };

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="lot-ticket rounded-sm p-5 pt-6 h-48 animate-pulse opacity-40"
          />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="lot-ticket rounded-sm p-8 text-center">
        <p className="font-display text-lg text-ink">Ledger unreachable</p>
        <p className="text-sm text-slate mt-2 font-body">
          The listings service is temporarily unreachable. This can happen if{" "}
          the backend is waking up after a period of inactivity — please wait a{" "}
          moment and retry.
        </p>
        <button
          onClick={load}
          className="mt-4 font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-sm border border-gold text-gold hover:bg-gold hover:text-ledger transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="lot-ticket rounded-sm p-8 text-center flex flex-col items-center justify-center gap-3 min-h-[220px]">
        <span className="lot-notch-l" aria-hidden="true" />
        <span className="lot-notch-r" aria-hidden="true" />
        <p className="font-display text-lg text-ink">No lots match this search</p>
        <p className="text-sm text-slate font-body max-w-md">
          No auction listings were found matching your current filter criteria.
          Try widening the price range or clearing active filters.
        </p>
        {onFilterChange && (
          <button
            onClick={() => onFilterChange({ offset: 0, limit })}
            className="mt-2 font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-sm border border-gold text-gold hover:bg-gold hover:text-ledger transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  const startIdx = offset + 1;
  const endIdx = Math.min(offset + listings.length, total || offset + listings.length);

  const topListings = listings.slice(0, 12);
  const secondaryListings = listings.slice(12);

  const portalSlot = mounted ? document.getElementById("full-width-listings-slot") : null;

  const bottomContent = (
    <div className="flex flex-col gap-6 w-full">
      {/* ROW 5 ONWARDS: PROPERTY CARDS SPANNING FULL PAGE WIDTH */}
      {secondaryListings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {secondaryListings.map((listing, idx) => (
            <PropertyCard
              key={listing.id ?? `${listing.source}-${listing.source_id}` ?? idx + 12}
              listing={listing}
            />
          ))}
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-ledger-line/50 font-mono text-xs">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`px-5 py-2.5 rounded-sm border transition-colors ${
              currentPage <= 1
                ? "border-ledger-line text-slate-dim opacity-50 cursor-not-allowed"
                : "border-gold/40 text-gold hover:bg-gold/10 hover:border-gold cursor-pointer"
            }`}
          >
            ← Previous Page
          </button>

          <div className="text-ink font-medium flex items-center gap-3">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1}
              className={`px-3 py-1 rounded-sm text-xs transition-colors ${
                currentPage <= 1
                  ? "border-ledger-line text-slate-dim opacity-50 cursor-not-allowed"
                  : "border-gold/30 text-gold hover:bg-gold/8 hover:border-gold cursor-pointer"
              }`}
            >
              First
            </button>

            <div>
              Page <span className="text-gold font-bold">{currentPage}</span> of <span className="text-slate font-bold">{totalPages}</span>
            </div>

            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages}
              className={`px-3 py-1 rounded-sm text-xs transition-colors ${
                currentPage >= totalPages
                  ? "border-ledger-line text-slate-dim opacity-50 cursor-not-allowed"
                  : "border-gold/30 text-gold hover:bg-gold/8 hover:border-gold cursor-pointer"
              }`}
            >
              Last
            </button>
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`px-5 py-2.5 rounded-sm border transition-colors ${
              currentPage >= totalPages
                ? "border-ledger-line text-slate-dim opacity-50 cursor-not-allowed"
                : "border-gold/40 text-gold hover:bg-gold/10 hover:border-gold cursor-pointer"
            }`}
          >
            Next Page →
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {total !== null && (
        <div className="flex items-center justify-between font-mono text-xs text-slate">
          <span>
            {total.toLocaleString("en-IN")} lots on record
            {filters.city && (
              <span className="text-gold ml-1">in {filters.city}</span>
            )}
          </span>
          {totalPages > 1 && (
            <span>
              Showing {startIdx}–{endIdx} (Page {currentPage} of {totalPages})
            </span>
          )}
        </div>
      )}

      {/* ROWS 1–4: 3 PROPERTY CARDS PER ROW (12 CARDS TOTAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {topListings.map((listing, idx) => (
          <PropertyCard
            key={listing.id ?? `${listing.source}-${listing.source_id}` ?? idx}
            listing={listing}
          />
        ))}
      </div>

      {/* PORTAL SECONDARY LISTINGS TO FULL-WIDTH SLOT IF AVAILABLE */}
      {portalSlot
        ? createPortal(bottomContent, portalSlot)
        : bottomContent}
    </div>
  );
}
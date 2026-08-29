"use client";

import { useState } from "react";

import { parsePrice, formatPriceHint } from "@/lib/parsePrice";

const PROPERTY_TYPES = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "OTHERS"];

const SOURCES = [
  { value: "ibapi", label: "IBAPI" },
  { value: "bankauctions", label: "bankauctions.in" },
  { value: "auctiontiger", label: "auctiontiger.in" },
];

const SORT_OPTIONS = [
  { value: "auction_soonest", label: "Auction Soonest" },
  { value: "auction_latest", label: "Auction Latest" },
  { value: "latest", label: "Latest Listings" },
  { value: "oldest", label: "Oldest Listings" },
  { value: "price_low", label: "Price: Low → High" },
  { value: "price_high", label: "Price: High → Low" },
];

const PRICE_AVAILABILITY_OPTIONS = [
  { value: "", label: "All Prices" },
  { value: "priced", label: "Priced Properties Only" },
  { value: "on_request", label: "Price on Request Only" },
];

const BANKS = [
  "State Bank of India",
  "Bank of India",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Indian Bank",
  "Central Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "IDBI Bank",
  "UCO Bank",
  "Indian Overseas Bank",
  "Bank of Maharashtra",
];

function PriceInput({ placeholder, value, onCommit }) {
  const [text, setText] = useState(value ? String(value) : "");

  function commit() {
    const parsed = parsePrice(text);
    onCommit(parsed);
  }

  return (
    <div className="flex flex-col">
      <input
        type="text"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="w-28 bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-slate-dim font-mono"
      />

      {text && (
        <span className="text-xs text-gold font-mono font-semibold mt-1 tracking-wide">
          {formatPriceHint(parsePrice(text))}
        </span>
      )}
    </div>
  );
}

export default function FilterBar({ filters, onChange }) {
  function set(key, value) {
    onChange({
      ...filters,
      [key]: value,
      offset: 0,
    });
  }

  const hasFilters =
    filters.city ||
    filters.property_type ||
    filters.source ||
    filters.state ||
    filters.bank ||
    filters.min_price ||
    filters.max_price ||
    filters.price_availability ||
    filters.max_emd ||
    filters.sort;

  return (
    <div className="lot-ticket rounded-sm p-4 flex flex-col gap-3">
      <span className="lot-notch-l" aria-hidden="true" />
      <span className="lot-notch-r" aria-hidden="true" />

      {/* Main filters */}
      <div className="flex flex-col md:flex-row gap-3 md:items-start md:flex-wrap">
        <input
          type="text"
          placeholder="City…"
          value={filters.city || ""}
          onChange={(e) => set("city", e.target.value)}
          className="flex-1 min-w-[160px] bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-slate-dim font-body focus:outline-none"
        />

        <select
          value={filters.property_type || ""}
          onChange={(e) => set("property_type", e.target.value)}
          className="bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink font-body"
        >
          <option value="">All types</option>

          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <select
          value={filters.bank || ""}
          onChange={(e) => set("bank", e.target.value)}
          className="bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink font-body min-w-[170px]"
        >
          <option value="">All banks</option>

          {BANKS.map((bank) => (
            <option key={bank} value={bank}>
              {bank}
            </option>
          ))}
        </select>

        <select
          value={filters.source || ""}
          onChange={(e) => set("source", e.target.value)}
          className="bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink font-body"
        >
          <option value="">All sources</option>

          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="State"
          value={filters.state || ""}
          onChange={(e) => set("state", e.target.value)}
          className="w-28 bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-slate-dim font-body"
        />
      </div>

      {/* Price + EMD + availability + sorting */}
      <div className="flex flex-col md:flex-row gap-3 md:items-start md:flex-wrap">
        <div className="flex items-start gap-2">
          <PriceInput
            placeholder="Min ₹ (e.g. 5L)"
            value={filters.min_price}
            onCommit={(v) => set("min_price", v)}
          />

          <span className="text-slate-dim text-sm mt-2">–</span>

          <PriceInput
            placeholder="Max ₹ (e.g. 1.2Cr)"
            value={filters.max_price}
            onCommit={(v) => set("max_price", v)}
          />
        </div>

        <PriceInput
          placeholder="Max EMD (e.g. 2L)"
          value={filters.max_emd}
          onCommit={(v) => set("max_emd", v)}
        />

        <select
          value={filters.price_availability || ""}
          onChange={(e) => set("price_availability", e.target.value)}
          className="bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink font-body min-w-[190px]"
        >
          {PRICE_AVAILABILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.sort || "auction_soonest"}
          onChange={(e) => set("sort", e.target.value)}
          className="bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink font-body min-w-[180px]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          onClick={() =>
            onChange({
              offset: 0,
              limit: filters.limit,
            })
          }
          className="text-xs font-mono uppercase tracking-wide text-rust hover:text-gold transition-colors mt-1 self-start"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
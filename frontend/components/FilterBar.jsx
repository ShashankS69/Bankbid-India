"use client";

import { useState, useRef, useEffect } from "react";

import { parsePrice, formatPriceHint } from "@/lib/parsePrice";
import { saveSearch } from "@/lib/api";
import { STATES, getCitiesForState, findStateForCity } from "@/lib/indiaLocations";

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

// Shortened labels so this select doesn't need a wide min-width
const PRICE_AVAILABILITY_OPTIONS = [
  { value: "", label: "All Prices" },
  { value: "priced", label: "Priced Only" },
  { value: "on_request", label: "On Request Only" },
];

// Shortened labels so this select doesn't need a wide min-width
const RENTAL_YIELD_OPTIONS = [
  { value: "", label: "All Properties" },
  { value: "true", label: "Has Rental Yield" },
  { value: "false", label: "No Rental Yield" },
];

// Feature #6 -- own filter, independent of sort. Values are the number
// of days as a string (matches the `closing_within` query param); ""
// means no filter (all auctions, regardless of date).
const CLOSING_SOON_OPTIONS = [
  { value: "", label: "All Auctions" },
  { value: "3", label: "Within 3 Days" },
  { value: "7", label: "Within 7 Days" },
  { value: "14", label: "Within 14 Days" },
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

/**
 * Generic searchable dropdown: typing filters the option list by prefix,
 * clicking an option selects it, and free typing without selecting still
 * flows through onInputChange (so it behaves like a normal text filter
 * if the user just types and moves on, e.g. a city not in our dataset).
 */
function Combobox({ value, options, placeholder, className, onInputChange, onSelect, onBlurCheck }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = (value || "").toLowerCase();
  const filtered = query
    ? options.filter((o) => o.toLowerCase().startsWith(query)).slice(0, 50)
    : options.slice(0, 50);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => {
          onInputChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => onBlurCheck?.(value)}
        className={`${className} focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold`}
      />

      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full max-h-64 overflow-auto bg-[#1c2333] border border-ledger-line rounded-xl shadow-2xl py-1.5 list-none m-0">
          {filtered.map((opt) => {
            const isSelected = opt.toLowerCase() === query;
            return (
              <li
                key={opt}
                // onMouseDown (not onClick) + preventDefault so this fires
                // before the input's onBlur, avoiding a race where blur
                // closes the list before the click registers.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(opt);
                  setOpen(false);
                }}
                className={[
                  "flex items-center gap-2 mx-1.5 px-3 py-1.5 rounded-lg text-sm font-body leading-snug cursor-pointer m-0",
                  isSelected
                    ? "bg-rust text-white font-semibold"
                    : "text-ink hover:bg-white/5",
                ].join(" ")}
              >
                <span className="w-4 shrink-0">
                  {isSelected ? "✓" : ""}
                </span>
                {opt}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SaveSearchForm({ filters }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle"); // idle | saving | success | error

  async function handleSave() {
    if (!email || !email.includes("@")) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    try {
      await saveSearch(filters, email, phone);
      setStatus("success");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
        setEmail("");
        setPhone("");
      }, 2500);
    } catch {
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-mono uppercase tracking-wide text-gold hover:text-ink transition-colors mt-1 self-start"
      >
        Save this search
      </button>
    );
  }

  if (status === "success") {
    return (
      <span className="text-xs font-mono text-gold mt-1 self-start">
        Saved — you'll get an email when new matches come in.
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex items-center gap-2">
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-48 bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-slate-dim font-mono"
        />
        <input
          type="tel"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-40 bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-slate-dim font-mono"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="text-xs font-mono uppercase tracking-wide text-gold hover:text-ink transition-colors disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Confirm"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs font-mono uppercase tracking-wide !text-red-600 hover:!text-red-800 transition-colors"
        >
          Cancel
        </button>
        {status === "error" && (
          <span className="text-xs font-mono text-rust">Enter a valid email</span>
        )}
      </div>
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

  // City selected from the dropdown (or an exact typed match on blur)
  // also fills in the matching state, in one combined update.
  function applyCitySelection(city) {
    const matchedState = findStateForCity(city);
    onChange({
      ...filters,
      city,
      state: matchedState || filters.state,
      offset: 0,
    });
  }

  function handleCityBlurCheck(typedValue) {
    if (!typedValue) return;
    const matchedState = findStateForCity(typedValue);
    if (matchedState && matchedState !== filters.state) {
      onChange({
        ...filters,
        city: typedValue,
        state: matchedState,
        offset: 0,
      });
    }
  }

  const cityOptions = getCitiesForState(filters.state);

  const hasFilters =
    filters.city ||
    filters.property_type ||
    filters.source ||
    filters.state ||
    filters.bank ||
    filters.min_price ||
    filters.max_price ||
    filters.price_availability ||
    filters.has_rental_yield ||
    filters.closing_within ||
    filters.max_emd ||
    filters.sort;

  return (
    <div className="lot-ticket rounded-sm p-4 flex flex-col gap-3">
      <span className="lot-notch-l" aria-hidden="true" />
      <span className="lot-notch-r" aria-hidden="true" />

      {/* Row 1: State / City / Property type / Bank */}
      <div className="flex flex-col md:flex-row gap-3 md:items-start md:flex-wrap">
        <div className="w-44">
          <Combobox
            placeholder="State"
            value={filters.state || ""}
            options={STATES}
            onInputChange={(v) => set("state", v)}
            onSelect={(v) => set("state", v)}
            className="w-full bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-slate-dim font-body"
          />
        </div>

        <div className="w-32">
          <Combobox
            placeholder="City…"
            value={filters.city || ""}
            options={cityOptions}
            onInputChange={(v) => set("city", v)}
            onSelect={applyCitySelection}
            onBlurCheck={handleCityBlurCheck}
            className="w-full bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-slate-dim font-body focus:outline-none"
          />
        </div>

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
      </div>

      {/* Row 2: Source / Price availability / Rental yield / Closing soon
          -- flex-1 with a small min-w so all four share the row's width
          instead of each demanding a large fixed minimum */}
      <div className="flex flex-row gap-3 flex-wrap">
        <select
          value={filters.source || ""}
          onChange={(e) => set("source", e.target.value)}
          className="bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink font-body flex-1 min-w-[120px]"
        >
          <option value="">All sources</option>

          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={filters.price_availability || ""}
          onChange={(e) => set("price_availability", e.target.value)}
          className="bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink font-body flex-1 min-w-[120px]"
        >
          {PRICE_AVAILABILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.has_rental_yield || ""}
          onChange={(e) => set("has_rental_yield", e.target.value)}
          className="bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink font-body flex-1 min-w-[130px]"
        >
          {RENTAL_YIELD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.closing_within || ""}
          onChange={(e) => set("closing_within", e.target.value)}
          className="bg-ledger border border-ledger-line rounded-sm px-3 py-2 text-sm text-ink font-body flex-1 min-w-[130px]"
        >
          {CLOSING_SOON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Row 3: Sort / Price range / EMD */}
      <div className="flex flex-col md:flex-row gap-3 md:items-start md:flex-wrap">
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
      </div>

      <div className="flex items-center gap-4">
        {hasFilters && (
          <button
            onClick={() =>
              onChange({
                offset: 0,
                limit: filters.limit,
              })
            }
            className="text-xs font-mono uppercase tracking-wide !text-red-600 hover:!text-red-800 transition-colors mt-1 self-start"
          >
            Clear filters
          </button>
        )}

        {hasFilters && <SaveSearchForm filters={filters} />}
      </div>
    </div>
  );
}
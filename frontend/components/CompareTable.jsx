"use client";

import { formatINR, titleCase, formatDate } from "@/lib/format";

const TYPE_LABELS = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  INDUSTRIAL: "Industrial",
  OTHERS: "Other",
};

const SOURCE_LABELS = {
  ibapi: "IBAPI",
  bankauctions: "bankauctions.in",
  auctiontiger: "auctiontiger.in",
};

// Each row: a label + a function that pulls the display value out of a listing.
// Keeping this as a data table (rather than hardcoded JSX per field) means
// adding a new comparison row later is a one-line change.
const ROWS = [
  {
    label: "Lot",
    render: (l) => l.property_id || "—",
  },
  {
    label: "Type & Location",
    render: (l) => {
      const place = [titleCase(l.location), titleCase(l.district), titleCase(l.state)]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .slice(0, 2)
        .join(", ");
      const typeLabel = TYPE_LABELS[l.property_type?.toUpperCase()] || titleCase(l.property_type) || "Property";
      return `${typeLabel} · ${place || "Undisclosed"}`;
    },
  },
  {
    label: "Bank",
    render: (l) => (l.bank_name ? titleCase(l.bank_name) : "Undisclosed"),
  },
  {
    label: "Source",
    render: (l) => SOURCE_LABELS[l.source?.toLowerCase()] || l.source || "—",
  },
  {
    label: "Reserve Price",
    render: (l) => l.reserve_price ? formatINR(l.reserve_price) : "On request",
    sub: (l) => {
      const hasPriceCut = l.previous_price && l.reserve_price && l.previous_price > l.reserve_price;
      if (!hasPriceCut) return null;
      const pct = Math.round(((l.previous_price - l.reserve_price) / l.previous_price) * 100);
      return `cut ${pct}% from ${formatINR(l.previous_price)}`;
    },
  },
  {
    label: "EMD",
    render: (l) => (l.emd ? formatINR(l.emd) : "—"),
  },
  {
    label: "Auction Date",
    render: (l) => formatDate(l.auction_date) || "TBA",
  },
  {
    label: "Status",
    render: (l) => l.status || "—",
  },
  {
    label: "Area (est.)",
    render: (l) => l.area_sqft_estimated ? `~${Math.round(l.area_sqft_estimated).toLocaleString("en-IN")} sq ft` : "—",
  },
  {
    label: "vs. RESIDEX",
    render: (l) => {
      if (!l.residex_comparison) return "—";
      const { pct_vs_market, city_matched, quarter_label } = l.residex_comparison;
      return `${Math.abs(pct_vs_market)}% ${pct_vs_market < 0 ? "below" : "above"} ${city_matched} (${quarter_label})`;
    },
  },
  {
    label: "Est. Rental Yield",
    render: (l) => {
      if (!l.roi_estimate) return "—";
      const { effective_yield_pct, comparison, assumed_yield_pct } = l.roi_estimate;
      return `~${effective_yield_pct}%${comparison !== "at" ? ` (${comparison} typical ${assumed_yield_pct}%)` : ""}`;
    },
  },
];

export default function CompareTable({ listings, onRemove }) {
  if (listings.length === 0) {
    return (
      <div className="lot-ticket rounded-sm p-6 text-center">
        <span className="lot-notch-l" aria-hidden="true" />
        <span className="lot-notch-r" aria-hidden="true" />
        <p className="text-slate text-sm font-body">
          Add up to 3 listings below to compare them side by side.
        </p>
      </div>
    );
  }

  return (
    <div className="lot-ticket rounded-sm p-4 overflow-x-auto">
      <span className="lot-notch-l" aria-hidden="true" />
      <span className="lot-notch-r" aria-hidden="true" />

      <table className="w-full border-collapse min-w-[500px]">
        <thead>
          <tr>
            <th className="text-left align-bottom pb-3 pr-4 w-32 shrink-0">
              <span className="font-mono text-[10px] tracking-widest text-gold uppercase">
                Comparing {listings.length} of 3
              </span>
            </th>
            {listings.map((l) => (
              <th key={l.id} className="text-left align-bottom pb-3 px-3 min-w-[220px]">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-sm text-ink leading-snug">
                    Lot {l.property_id || "—"}
                  </p>
                  <button
                    onClick={() => onRemove(l.id)}
                    className="text-[10px] font-mono uppercase tracking-wide !text-red-600 hover:!text-red-800 transition-colors shrink-0"
                  >
                    Remove
                  </button>
                </div>
                {l.source_url && (
                  <a
                    href={l.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-mono text-gold uppercase tracking-wide underline underline-offset-2 hover:text-gold/80"
                  >
                    View source listing
                  </a>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-t border-ledger-line">
              <td className="py-3 pr-4 text-[11px] uppercase tracking-wide text-slate align-top">
                {row.label}
              </td>
              {listings.map((l) => (
                <td key={l.id} className="py-3 px-3 text-sm text-ink font-body align-top">
                  {row.render(l)}
                  {row.sub && row.sub(l) && (
                    <p className="text-[10px] font-mono text-moss mt-0.5">{row.sub(l)}</p>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
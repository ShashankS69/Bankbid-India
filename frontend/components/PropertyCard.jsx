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

export default function PropertyCard({ listing, compact = false }) {
  const {
    property_id,
    bank_name,
    property_type,
    location,
    reserve_price,
    auction_date,
    emd,
    status,
    state,
    district,
    source,
    area_sqft_estimated,
    residex_comparison,
  } = listing;

  const typeLabel = TYPE_LABELS[property_type?.toUpperCase()] || titleCase(property_type) || "Property";
  const sourceLabel = SOURCE_LABELS[source?.toLowerCase()] || source;
  const place = [titleCase(location), titleCase(district), titleCase(state)]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 2)
    .join(", ");

  const isExpired = (() => {
    if (!auction_date) return false;
    const d = new Date(auction_date);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  })();

  const isActive = (() => {
    if (isExpired) return false;
    if (!auction_date) return true; // treat undated as active for the badge tint per summary definition
    const d = new Date(auction_date);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  })();

  if (compact) {
    return (
      <article className="lot-ticket rounded-sm p-3.5 pt-4 flex flex-col gap-2.5 transition-transform hover:-translate-y-0.5 min-w-0">
        <span className="lot-notch-l" aria-hidden="true" />
        <span className="lot-notch-r" aria-hidden="true" />

        <header className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-widest text-gold uppercase truncate">
              Lot {property_id || "—"}
            </p>
            <h3 className="font-display text-sm text-ink mt-0.5 leading-snug line-clamp-2">
              {typeLabel} · {place || "Undisclosed"}
            </h3>
          </div>
          {isExpired ? (
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm border border-red-800/60 text-red-200 bg-red-900/30">
              Passed
            </span>
          ) : status ? (
            <span className={`shrink-0 font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${isActive ? 'border-emerald-700 text-emerald-200 bg-emerald-800/30' : 'border-moss/50 text-moss'}`}>
              {status}
            </span>
          ) : null}
        </header>

        <div className="perf-divider" />

        <div>
          <p className="text-[9px] uppercase tracking-wide text-slate">Reserve price</p>
          <p className="font-display text-xl text-gold leading-none mt-0.5">
            {formatINR(reserve_price)}
          </p>
        </div>

        <div className="flex flex-col gap-0.5 text-[11px] font-mono text-slate pt-0.5">
          <span className="truncate">{bank_name ? titleCase(bank_name) : "Bank N/A"}</span>
          <span className="text-slate-dim">{formatDate(auction_date)}</span>
        </div>

        {area_sqft_estimated && (
          <p className="text-[10px] font-mono text-slate-dim -mt-1 truncate">
            ~{Math.round(area_sqft_estimated).toLocaleString("en-IN")} sq ft
          </p>
        )}

        {sourceLabel && (
          <p className="text-[9px] font-mono text-slate-dim uppercase tracking-wide -mb-0.5">
            via {sourceLabel}
          </p>
        )}
      </article>
    );
  }

  return (
    <article className="lot-ticket rounded-sm p-5 pt-6 flex flex-col gap-4 transition-transform hover:-translate-y-0.5">
      <span className="lot-notch-l" aria-hidden="true" />
      <span className="lot-notch-r" aria-hidden="true" />

      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-gold uppercase">
            Lot {property_id || "—"}
          </p>
          <h3 className="font-display text-lg text-ink mt-1 leading-snug">
            {typeLabel} · {place || "Location undisclosed"}
          </h3>
        </div>
        {isExpired ? (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-sm border border-red-800/60 text-red-200 bg-red-900/30">
            Passed
          </span>
        ) : status ? (
          <span className={`shrink-0 font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-sm ${isActive ? 'border-emerald-700 text-emerald-200 bg-emerald-800/30' : 'border-moss/50 text-moss'}`}>
            {status}
          </span>
        ) : null}
      </header>

      <div className="perf-divider" />

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate">Reserve price</p>
          <p className="font-display text-3xl text-gold leading-none mt-1">
            {formatINR(reserve_price)}
          </p>
        </div>
        {emd ? (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate">EMD</p>
            <p className="font-mono text-sm text-ink mt-1">{formatINR(emd)}</p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-slate pt-1">
        <span>{bank_name ? titleCase(bank_name) : "Bank undisclosed"}</span>
        <span>{formatDate(auction_date)}</span>
      </div>

      {area_sqft_estimated && (
        <p className="text-xs font-mono text-slate-dim -mt-2">
          ~{Math.round(area_sqft_estimated).toLocaleString("en-IN")} sq ft (est.)
        </p>
      )}

      {residex_comparison && (
        <p
          className={[
            "text-xs font-mono -mt-1",
            residex_comparison.pct_vs_market < 0 ? "text-moss" : "text-rust",
          ].join(" ")}
          title={`NHB RESIDEX composite rate for ${residex_comparison.city_matched}, ${residex_comparison.quarter_label}: ${formatINR(residex_comparison.market_price_per_sqft)}/sq ft`}
        >
          {Math.abs(residex_comparison.pct_vs_market)}%{" "}
          {residex_comparison.pct_vs_market < 0 ? "below" : "above"} RESIDEX{" "}
          {residex_comparison.city_matched} ({residex_comparison.quarter_label})
        </p>
      )}

      {sourceLabel && (
        <p className="text-[10px] font-mono text-slate-dim uppercase tracking-wide -mb-1">
          via {sourceLabel}
        </p>
      )}
    </article>
  );
}

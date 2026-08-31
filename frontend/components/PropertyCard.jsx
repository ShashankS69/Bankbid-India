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

const CLOSING_SOON_WINDOW_DAYS = 7;

export default function PropertyCard({ listing, compact = false }) {
  const {
    property_id,
    bank_name,
    property_type,
    location,
    reserve_price,
    auction_date,
    auction_date_parsed,
    emd,
    status,
    state,
    district,
    source,
    source_url,
    area_sqft_estimated,
    residex_comparison,
    roi_estimate,
    previous_price,
    price_changed_at,
  } = listing;

  const typeLabel = TYPE_LABELS[property_type?.toUpperCase()] || titleCase(property_type) || "Property";
  const sourceLabel = SOURCE_LABELS[source?.toLowerCase()] || source;
  const isIbapi = source?.toLowerCase() === "ibapi";
  const sourceLinkLabel = isIbapi ? "Search on IBAPI" : "View source listing";
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
    if (!auction_date) return true;
    const d = new Date(auction_date);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  })();

  // Feature #6 -- days until auction, computed from auction_date_parsed
  // (a clean ISO date, e.g. "2026-09-10") rather than the raw auction_date
  // free-text field (e.g. "10 September 2026"), which varies by source
  // and isn't safe to diff directly.
  const daysUntilAuction = (() => {
    if (!auction_date_parsed) return null;
    const d = new Date(`${auction_date_parsed}T00:00:00`);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = d.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  })();

  const isClosingSoon =
    isActive &&
    daysUntilAuction !== null &&
    daysUntilAuction >= 0 &&
    daysUntilAuction <= CLOSING_SOON_WINDOW_DAYS;

  const closingSoonLabel =
    daysUntilAuction === 0
      ? "Closing Today"
      : daysUntilAuction === 1
      ? "Closing Tomorrow"
      : `Closing in ${daysUntilAuction} Days`;

  const hasPriceCut = previous_price && reserve_price && previous_price > reserve_price;
  const priceCutPct = hasPriceCut
    ? Math.round(((previous_price - reserve_price) / previous_price) * 100)
    : null;

  const linkClassCompact = "text-[9px] font-mono text-gold uppercase tracking-wide underline underline-offset-2 hover:text-gold/80";
  const linkClassFull = "text-[10px] font-mono text-gold uppercase tracking-wide underline underline-offset-2 hover:text-gold/80";

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
          <div className="shrink-0 flex flex-col items-end gap-1">
            {isExpired ? (
              <span className="font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm border border-red-800/60 text-red-200 bg-red-900/30">
                Passed
              </span>
            ) : status ? (
              <span className={`font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${isActive ? 'border-emerald-700 text-emerald-200 bg-emerald-800/30' : 'border-moss/50 text-moss'}`}>
                {status}
              </span>
            ) : null}
            {isClosingSoon && (
              <span className="font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm border border-rust/60 text-rust bg-rust/10">
                {closingSoonLabel}
              </span>
            )}
          </div>
        </header>

        <div className="perf-divider" />

        <div>
          <p className="text-[9px] uppercase tracking-wide text-slate">Reserve price</p>
          <p className="font-display text-xl text-gold leading-none mt-0.5">
            {formatINR(reserve_price)}
          </p>
          {hasPriceCut && (
            <p className="text-[9px] font-mono text-moss mt-1">
              <span className="line-through text-slate-dim">{formatINR(previous_price)}</span>
              {" "}· cut {priceCutPct}%
            </p>
          )}
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

        {source_url && <a href={source_url} target="_blank" rel="noopener noreferrer" className={linkClassCompact}>{sourceLinkLabel}</a>}

        {source_url && isIbapi && property_id && (
          <p className="text-[9px] font-mono text-slate-dim -mt-1">
            Type &quot;{property_id}&quot; in Property ID to find it
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
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {isExpired ? (
            <span className="font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-sm border border-red-800/60 text-red-200 bg-red-900/30">
              Passed
            </span>
          ) : status ? (
            <span className={`font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-sm ${isActive ? 'border-emerald-700 text-emerald-200 bg-emerald-800/30' : 'border-moss/50 text-moss'}`}>
              {status}
            </span>
          ) : null}
          {isClosingSoon && (
            <span className="font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-sm border border-rust/60 text-rust bg-rust/10">
              {closingSoonLabel}
            </span>
          )}
        </div>
      </header>

      <div className="perf-divider" />

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate">Reserve price</p>
          <p className="font-display text-3xl text-gold leading-none mt-1">
            {formatINR(reserve_price)}
          </p>
          {hasPriceCut && (
            <p
              className="text-xs font-mono text-moss mt-1.5"
              title={price_changed_at ? `Price cut on ${formatDate(price_changed_at)}` : undefined}
            >
              <span className="line-through text-slate-dim">{formatINR(previous_price)}</span>
              {" "}· cut {priceCutPct}%
            </p>
          )}
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

      {roi_estimate && (
        <p
          className={[
            "text-xs font-mono -mt-1",
            roi_estimate.comparison === "below" ? "text-rust" : "text-moss",
          ].join(" ")}
          title={`Estimated using NHB RESIDEX ${roi_estimate.city_matched} composite price (${roi_estimate.quarter_label}) and an assumed ${roi_estimate.assumed_yield_pct}% gross yield`}
        >
          Rental yield: ~{roi_estimate.effective_yield_pct}%
          {roi_estimate.comparison !== "at" && (
            <> ({roi_estimate.comparison} typical {roi_estimate.assumed_yield_pct}%)</>
          )}
        </p>
      )}

      {sourceLabel && (
        <p className="text-[10px] font-mono text-slate-dim uppercase tracking-wide -mb-1">
          via {sourceLabel}
        </p>
      )}

      {source_url && <a href={source_url} target="_blank" rel="noopener noreferrer" className={linkClassFull}>{sourceLinkLabel}</a>}

      {source_url && isIbapi && property_id && (
        <p className="text-[10px] font-mono text-slate-dim -mt-1">
          Type &quot;{property_id}&quot; in Property ID to find it
        </p>
      )}
    </article>
  );
}

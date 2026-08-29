"use client";

import { useEffect, useState } from "react";
import { fetchSourceSummary } from "@/lib/api";

const SOURCE_LABELS = {
  ibapi: "IBAPI",
  bankauctions: "bankauctions.in",
  auctiontiger: "auctiontiger.in",
};

/**
 * Ledger panel showing where the register's lots come from — source
 * breakdown up top, bank-wise ranking below. Reads a single
 * /listings/stats/summary response ({ sources, banks }).
 *
 * variant="sidebar" (default): fixed-width, desktop left column — hidden
 * below lg since the desktop 3-column layout only shows at that width.
 * variant="mobile": full-width, always visible — used inside the Stats
 * tab of the mobile tabbed layout, where visibility is already handled
 * by which tab is active, not by viewport width.
 *
 * Drop this in the page layout alongside the filter bar + grid, e.g.:
 *   <div className="flex gap-8">
 *     <RegisterStats />
 *     <main>...filter bar + card grid...</main>
 *   </div>
 */
export default function RegisterStats({ variant = "sidebar" }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchSourceSummary()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null; // fail quiet — the grid is the primary content, not this panel

  const sources = stats?.sources ?? [];
  const banks = stats?.banks ?? [];
  const totals = stats?.totals ?? {};
  const sourceTotal = sources.reduce((sum, s) => sum + s.count, 0) || 1;
  const bankTotal = banks.reduce((sum, b) => sum + b.count, 0) || 1;
  const totalsTotal = totals.total || 1;

  const wrapperClass =
    variant === "mobile"
      ? "w-full flex flex-col gap-8 pt-1"
      : "w-64 shrink-0 hidden lg:flex flex-col gap-8 pt-1";

  return (
    <aside className={wrapperClass}>
      <RegisterSection title="By source" loading={!stats}>
        {sources.map((s) => (
          <StatRow
            key={s.source}
            label={SOURCE_LABELS[s.source] || s.source}
            count={s.count}
            pct={s.count / sourceTotal}
            note={s.source === "auctiontiger" ? "passed listings will redirect to homepage" : null}
          />
        ))}
      </RegisterSection>

      <RegisterSection title="By bank" loading={!stats}>
        {banks.map((b) => (
          <StatRow
            key={b.bank}
            label={b.bank}
            count={b.count}
            pct={b.count / bankTotal}
            muted={b.bank === "Others"}
          />
        ))}
      </RegisterSection>

      <RegisterSection title="Quick stats" loading={!stats}>
        <StatRow label="Total properties in the lot" count={totals.total || 0} pct={(totals.total || 0) / totalsTotal} />
        <StatRow label="Active listings" count={totals.active || 0} pct={(totals.active || 0) / totalsTotal} status="active" />
        <StatRow label="Passed listings" count={totals.passed || 0} pct={(totals.passed || 0) / totalsTotal} status="passed" />
        <StatRow label="Listings with price" count={totals.priced || 0} pct={(totals.priced || 0) / totalsTotal} />
        <StatRow label="Price on request properties" count={totals.price_on_request || 0} pct={(totals.price_on_request || 0) / totalsTotal} />
      </RegisterSection>
    </aside>
  );
}

function RegisterSection({ title, loading, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-lg font-extrabold uppercase tracking-widest text-gold">
          {title}
        </span>
        <span className="perf-divider flex-1" />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-3 rounded-sm bg-ink/10 animate-pulse"
              style={{ width: `${70 - i * 12}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">{children}</div>
      )}
    </section>
  );
}

function StatRow({ label, count, pct, muted, status, note }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={[
            "text-sm font-medium leading-snug",
            muted ? "text-slate-dim italic" : "text-ink",
          ].join(" ")}
        >
          {label}
          {note && (
            <span className="text-[10px] font-mono text-slate-dim italic ml-1">
              ({note})
            </span>
          )}
        </span>
        <span
          className={[
            "font-mono text-xs font-semibold shrink-0",
            status === "active"
              ? "bg-emerald-800/30 text-emerald-200 border border-emerald-700 px-2 py-0.5 rounded-sm"
              : status === "passed"
              ? "bg-red-900/30 text-red-300 border border-red-800 px-2 py-0.5 rounded-sm"
              : "text-slate",
          ].join(" ")}
        >
          {count.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="h-[4px] rounded-full bg-ink/10 overflow-hidden">
        <div
          className={
            muted
              ? "h-full bg-slate-dim/60"
              : status === "active"
              ? "h-full bg-emerald-500"
              : status === "passed"
              ? "h-full bg-red-500"
              : "h-full bg-gold"
          }
          style={{ width: `${Math.max(pct * 100, 2)}%` }}
        />
      </div>
    </div>
  );
}
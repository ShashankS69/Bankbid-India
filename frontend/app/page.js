"use client";

import { useEffect, useState } from "react";

import FilterBar from "@/components/FilterBar";
import ListingGrid from "@/components/ListingGrid";
import MapView from "@/components/MapView";
import FetchLatestButton from "@/components/FetchLatestButton";
import RegisterStats from "@/components/RegisterStats";
import CalendarView from "@/components/CalendarView";

import { fetchAllListings } from "@/lib/api";

export default function Home() {
  const [filters, setFilters] = useState({ offset: 0, limit: 54 });
  const [refreshKey, setRefreshKey] = useState(0);

  const [lots, setLots] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [calendarError, setCalendarError] = useState(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;

    async function loadCalendar() {
      setLoadingCalendar(true);
      setCalendarError(null);

      try {
        const rows = await fetchAllListings({}, (loaded, total) => {
          if (!cancelled) {
            setProgress({ loaded, total });
          }
        });

        if (!cancelled) {
          setLots(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setCalendarError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingCalendar(false);
        }
      }
    }

    loadCalendar();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleSelectCity = (city) => {
    setFilters((prev) => ({
      ...prev,
      city,
      offset: 0,
      limit: 54,
    }));
  };

  return (
    <main className="w-full max-w-[1700px] mx-auto px-6 lg:px-8 py-10 md:py-14">
      <header className="flex flex-col items-center text-center gap-6 mb-10">
        <div className="flex flex-col items-center">
          <p className="font-mono text-[11px] tracking-widest text-gold uppercase">
            SARFAESI Auction Register
          </p>

          <div className="flex items-center">
            <span className="bankbid-emblem" aria-hidden="true">
              <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 36 L6 18 L12 12 L18 18 L18 36" />
                <path d="M30 36 L30 14 L34 10 L40 14 L40 36" />
                <path d="M22 36 L22 8 L26 4 L30 8 L30 36" />
                <path d="M4 40 L44 40" stroke-linecap="round" />
              </svg>
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-ink mt-2 leading-tight">
              BankBid <span className="italic text-gold">India</span>
            </h1>
          </div>

          <p className="text-slate text-sm mt-3 max-w-lg font-body text-center">
            A single ledger of distressed real estate auction lots, aggregated across
            IBAPI, bankauctions.in, and auctiontiger.in.
          </p>
        </div>

        <FetchLatestButton
          onDone={() => setRefreshKey((k) => k + 1)}
        />
      </header>

      {/* THREE-COLUMN MAIN LAYOUT */}
      <div
        className="
          grid
          grid-cols-1
          xl:grid-cols-[230px_minmax(0,1fr)_520px]
          gap-8
          items-start
        "
      >
        {/* LEFT — Source / Bank statistics */}
        <aside className="w-full min-w-0">
          <RegisterStats />
        </aside>

        {/* MIDDLE — Filters + Property Listings Grid */}
        <section className="min-w-0">
          <div className="mb-8">
            <FilterBar
              filters={filters}
              onChange={setFilters}
            />
          </div>

          <ListingGrid
            filters={filters}
            onFilterChange={setFilters}
            refreshKey={refreshKey}
          />
        </section>

        {/* RIGHT — Auction Calendar + Leaflet Map */}
        <aside
          className="w-full min-w-0 flex flex-col gap-10"
          aria-label="Auction calendar and map"
        >
          <div>
            <div className="mb-5">
              <p className="font-mono text-lg font-extrabold tracking-widest text-gold uppercase">
                Auction Calendar
              </p>

              <p className="text-slate text-sm mt-2 leading-relaxed font-body max-w-md">
                View upcoming bank property auctions by date. Select a highlighted
                date to see the lots scheduled for auction.
              </p>
            </div>

            {loadingCalendar && progress.total > 0 && (
              <div className="font-mono text-xs text-slate mb-4">
                Loading{" "}
                {progress.loaded.toLocaleString("en-IN")} /{" "}
                {progress.total.toLocaleString("en-IN")} lots…
              </div>
            )}

            <CalendarView
              lots={lots}
              loading={loadingCalendar}
              error={calendarError}
            />
          </div>

          {/* LEAFLET MAP VIEW */}
          <div>
            <div className="mb-4">
              <p className="font-mono text-lg font-extrabold tracking-widest text-gold uppercase">
                Auction Lot Map
              </p>
              <p className="text-slate text-sm mt-1 leading-relaxed font-body max-w-md">
                Explore property density across Indian cities. Click a cluster marker to filter the ledger.
              </p>
            </div>

            <MapView
              lots={lots}
              onSelectCity={handleSelectCity}
            />
          </div>
        </aside>

        {/* FULL-WIDTH SLOT FOR ROW 5+ (Spans across all 3 columns from left stats to right map) */}
        <div id="full-width-listings-slot" className="xl:col-span-3 w-full pt-4" />
      </div>
    </main>
  );
}
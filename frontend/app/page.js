"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import FilterBar from "@/components/FilterBar";
import ListingGrid from "@/components/ListingGrid";
import MapView from "@/components/MapView";
import FetchLatestButton from "@/components/FetchLatestButton";
import RegisterStats from "@/components/RegisterStats";
import CalendarView from "@/components/CalendarView";
import MobileHome from "@/components/MobileHome";
import ChatWidget from "@/components/ChatWidget";

import { fetchAllListings } from "@/lib/api";
import useIsMobile from "@/lib/useIsMobile";

export default function Home() {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState({ offset: 0, limit: 57 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [noteOpen, setNoteOpen] = useState(false);

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

  const handleSelectCity = (locations) => {
    // fetchListings() (lib/api.js) reads filters.locations, not
    // filters.cityList — the old key name meant this filter was never
    // actually sent to the backend, so clicking a map cluster re-fetched
    // the full unfiltered dataset instead of filtering by that location.
    setFilters((prev) => ({
      ...prev,
      locations,
      city: undefined,
      offset: 0,
      limit: 57,
    }));
  };

  const handleSelectDate = (date) => {
    // Build the "YYYY-MM-DD" string from LOCAL calendar components.
    // date.toISOString() converts to UTC first, which shifts the date
    // back by one day for any timezone ahead of UTC (e.g. IST, UTC+5:30) —
    // that was the cause of "select Sept 2, get Sept 1's listings".
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    setFilters((prev) => ({
      ...prev,
      auctionDate: `${year}-${month}-${day}`,
      offset: 0,
      limit: 57,
    }));
  };

  // isMobile is null until the viewport check runs on mount — hold off
  // rendering either layout until then so we never mount both (Leaflet map +
  // calendar) at once, and never flash the wrong one.
  if (isMobile === null) {
    return null;
  }

  if (isMobile) {
    return (
      <>
        <ChatWidget />
        <MobileHome
          filters={filters}
          setFilters={setFilters}
          refreshKey={refreshKey}
          setRefreshKey={setRefreshKey}
          lots={lots}
          loadingCalendar={loadingCalendar}
          calendarError={calendarError}
          progress={progress}
          handleSelectCity={handleSelectCity}
          handleSelectDate={handleSelectDate}
        />
      </>
    );
  }

  return (
    <>
      <ChatWidget />
      <main className="w-full max-w-[1700px] mx-auto px-6 lg:px-8 py-10 md:py-14">
        <header className="flex flex-col items-center text-center gap-6 mb-10">
          <div className="flex flex-col items-center">
            <p className="font-mono text-[11px] tracking-widest text-gold uppercase">
              SARFAESI Auction Register
            </p>

            <div className="flex items-center gap-2">
              <span className="bankbid-emblem text-gold" aria-hidden="true">
                <svg
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  role="img"
                  width="32"
                  height="32"
                >
                  <path
                    d="M24 6 L28.5 18.5 L41.5 19.5 L31.3 27.6 L34.8 40 L24 32.8 L13.2 40 L16.7 27.6 L6.5 19.5 L19.5 18.5 Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </span>

              <h1 className="font-display text-4xl md:text-5xl text-ink mt-2 leading-tight">
                BankBid <span className="italic text-gold">India</span>
              </h1>

              <span className="bankbid-emblem" aria-hidden="true">
                <svg
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  role="img"
                  width="36"
                  height="36"
                >
                  { /* Refined architectural emblem: layered pediment, central arch, flanking columns */ }
                  <g
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  >
                    { /* base line */ }
                    <path d="M6 36h36" />

                    { /* left column cluster */ }
                    <path d="M10 34v-10a1 1 0 011-1h2a1 1 0 011 1v10" />
                    <path d="M16 34v-8a1 1 0 011-1h2a1 1 0 011 1v8" />

                    { /* right column cluster */ }
                    <path d="M32 34v-8a1 1 0 011-1h2a1 1 0 011 1v8" />
                    <path d="M38 34v-10a1 1 0 00-1-1h-2a1 1 0 00-1 1v10" />

                    { /* central arch */ }
                    <path d="M18 30c0-6 3-12 6-12s6 6 6 12" />

                    { /* pediment / roof lines */ }
                    <path d="M8 20l8-6 8 6 8-6 8 6" opacity="0.9" />
                  </g>
                </svg>
              </span>
            </div>

            <p className="text-slate text-sm mt-3 max-w-lg font-body text-center">
              A single ledger of distressed real estate auction lots, aggregated across
              IBAPI, bankauctions.in, and auctiontiger.in.
            </p>
          </div>
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
            {/* COMPARE + FETCH LATEST BUTTONS */}
            <div className="flex gap-3">
              <Link
                href="/compare"
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-sm border border-gold text-gold hover:bg-gold hover:text-ledger transition-colors"
              >
                ★ Compare Properties
              </Link>

              <FetchLatestButton
                onDone={() => setRefreshKey((k) => k + 1)}
              />
            </div>

            {/* EMD EXPLAINER - COLLAPSIBLE */}
            <div className="lot-ticket rounded-sm p-4">
              <button
                onClick={() => setNoteOpen(!noteOpen)}
                className="flex items-center justify-between w-full gap-2 hover:opacity-80 transition-opacity border-0 bg-transparent"
              >
                <p className="font-mono text-lg font-extrabold tracking-widest text-gold uppercase">
                  Notes
                </p>

                <span className="text-gold text-3xl leading-none flex items-center -mt-1">
                  {noteOpen ? "^" : "⌄"}
                </span>
              </button>

              {noteOpen && (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="font-mono text-xs font-extrabold tracking-widest text-gold uppercase mb-2">
                      What is EMD?
                    </p>

                    <p className="text-slate text-sm leading-relaxed font-body">
                      EMD (Earnest Money Deposit) is a refundable deposit you must pay
                      upfront to be eligible to bid in a bank auction — separate from
                      the property&apos;s reserve price. It&apos;s usually around 10%
                      of the reserve price, but each bank sets its own amount per
                      listing. Use the EMD filter to only see auctions you can
                      actually afford to enter, since a lower reserve price doesn&apos;t
                      always mean a lower upfront deposit.
                    </p>
                  </div>

                  <div className="perf-divider" />

                  <div>
                    <p className="font-mono text-xs font-extrabold tracking-widest text-gold uppercase mb-2">
                      Save this Search
                    </p>

                    <p className="text-slate text-sm leading-relaxed font-body">
                      Lets users save their desired search criteria and receive notifications when new properties match their filters.
                    </p>
                  </div>

                  <div className="perf-divider" />

                  <div>
                    <p className="font-mono text-xs font-extrabold tracking-widest text-gold uppercase mb-2">
                      Rental Yield
                    </p>

                    <p className="text-slate text-sm leading-relaxed font-body">
                      Listings in cities covered by NHB RESIDEX also show an estimated
                      rental yield alongside the reserve price it would come in handy if you&apos;re
                      evaluating a property as an investment rather than for personal
                      use, since it points to the ongoing return you could expect
                      relative to what you&apos;d pay to win the auction.
                    </p>
                  </div>

                  <div className="perf-divider" />

                  <div>
                    <p className="font-mono text-xs font-extrabold tracking-widest text-gold uppercase mb-2">
                      AUCTION SOONEST / LATEST
                    </p>

                    <p className="text-slate text-sm leading-relaxed font-body">
                      <p>Sorts listings by their scheduled auction date:</p>
                      <p><b>Soonest</b> puts auctions happening next at the top, useful if you're
                      ready to bid now and want to see what's closing fastest.</p>
                      <p><b>Latest</b> flips it, surfacing auctions further out, useful
                      if you want more time to arrange financing or do due
                      diligence before bidding.</p>
                    </p>

                    <div className="perf-divider" />

                    <p className="font-mono text-xs font-extrabold tracking-widest text-gold uppercase mb-2">
                      vs. RESIDEX
                    </p>

                    <p className="text-slate text-sm leading-relaxed font-body">
                      Compares the auction&apos;s reserve price per sq ft against NHB&apos;s
                      official RESIDEX housing price index for that city and quarter —
                      a quick read on whether a lot is priced below or above the going
                      market rate. A negative % means the reserve price is cheaper than
                      comparable non-auction property nearby; a positive % means you&apos;d
                      likely pay more. Only shown for listings with an estimated area in a
                      RESIDEX-covered city, and it&apos;s a rough citywide signal rather than
                      a valuation — it doesn&apos;t account for the specific building, floor,
                      or locality.
                    </p>
                  </div>

                  <div className="perf-divider" />

                  <div>
                    <p className="font-mono text-xs font-extrabold tracking-widest text-gold uppercase mb-2">
                      Compare Properties
                    </p>

                    <p className="text-slate text-sm leading-relaxed font-body">
                      Star the properties to compare them side by side — see reserve prices, EMD amounts, RESIDEX comparisons, and estimated rental yields all at once for the properties that have them available.
                    </p>
                  </div>
                </div>
              )}
            </div>

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
                onSelectDate={handleSelectDate}
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
    </>
  );
}
"use client";

import { useState } from "react";

import FilterBar from "@/components/FilterBar";

import ListingGrid from "@/components/ListingGrid";

import MapView from "@/components/MapView";

import FetchLatestButton from "@/components/FetchLatestButton";

import RegisterStats from "@/components/RegisterStats";

import CalendarView from "@/components/CalendarView";

const TABS = [
  { id: "property", label: "Property" },

  { id: "stats", label: "Stats" },

  { id: "calendar", label: "Calendar" },

  { id: "map", label: "Map" },
];

export default function MobileHome({
  filters = {},
  setFilters = () => {},
  refreshKey = 0,
  setRefreshKey = () => {},
  lots = [],
  loadingCalendar = false,
  calendarError = null,
  progress = { loaded: 0, total: 0 },
  handleSelectCity = () => {},
  handleSelectDate = () => {},
} = {}) {
  const [activeTab, setActiveTab] = useState("property");
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <main className="w-full mx-auto px-4 py-6">
      {/* LOGO HEADER — shared across every tab, identical to desktop */}
      <header className="flex flex-col items-center text-center gap-2 mb-4">
        <p className="font-mono text-[10px] tracking-widest text-gold uppercase">
          SARFAESI Auction Register
        </p>

        <div className="flex items-center gap-2">
          <span className="bankbid-emblem text-gold" aria-hidden="true">
            <svg
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              role="img"
              width="24"
              height="24"
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

          <h1 className="font-display text-2xl text-ink leading-tight">
            BankBid <span className="italic text-gold">India</span>
          </h1>
        </div>
      </header>

      {/* TAB NAV — note-arrow toggle lives at the right end of this same bar */}
      <div className="flex items-center border-t border-b border-ledger-line/60 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 font-mono text-[11px] uppercase tracking-widest py-2.5 transition-colors ${
              activeTab === tab.id
                ? "text-gold border-b-2 border-gold"
                : "text-slate border-b-2 border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {activeTab === "property" && (
          <button
            onClick={() => setNoteOpen((v) => !v)}
            aria-label={noteOpen ? "Hide notes" : "Show notes"}
            aria-expanded={noteOpen}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center border-l border-ledger-line/60 text-gold"
          >
            <span
              className={`transition-transform ${
                noteOpen ? "rotate-180" : ""
              }`}
            >
              ▾
            </span>
          </button>
        )}
      </div>

      {/* PROPERTY TAB */}
      {activeTab === "property" && (
        <div className="flex flex-col gap-4">
          {noteOpen && (
            <div className="lot-ticket rounded-sm p-4">
              <p className="font-mono text-lg font-extrabold tracking-widest text-gold uppercase mb-2">
                Note
              </p>

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

              <div className="h-4"></div>

              <p className="font-mono text-xs font-extrabold tracking-widest text-gold uppercase mb-2">
                Save this Search
              </p>

              <p className="text-slate text-sm leading-relaxed font-body">
                Lets users save their desired search criteria and receive
                notifications when new properties match their filters.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <FetchLatestButton
              onDone={() => setRefreshKey((k) => k + 1)}
            />
          </div>

          <FilterBar
            filters={filters}
            onChange={setFilters}
          />

          <ListingGrid
            filters={filters}
            onFilterChange={setFilters}
            refreshKey={refreshKey}
            compact
          />
        </div>
      )}

      {/* STATS TAB — same RegisterStats panel that sits in the desktop left column */}
      {activeTab === "stats" && (
        <div>
          <RegisterStats variant="mobile" />
        </div>
      )}

      {/* CALENDAR TAB */}
      {activeTab === "calendar" && (
        <div>
          <div className="mb-5">
            <p className="font-mono text-lg font-extrabold tracking-widest text-gold uppercase">
              Auction Calendar
            </p>

            <p className="text-slate text-sm mt-2 leading-relaxed font-body">
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
            onSelectDate={(date) => {
              setActiveTab("property");
              handleSelectDate(date);
            }}
          />
        </div>
      )}

      {/* MAP TAB */}
      {activeTab === "map" && (
        <div>
          <div className="mb-4">
            <p className="font-mono text-lg font-extrabold tracking-widest text-gold uppercase">
              Auction Lot Map
            </p>

            <p className="text-slate text-sm mt-1 leading-relaxed font-body">
              Explore property density across Indian cities. Click a cluster
              marker to filter the ledger.
            </p>
          </div>

          <MapView
            lots={lots}
            onSelectCity={handleSelectCity}
          />
        </div>
      )}
    </main>
  );
}
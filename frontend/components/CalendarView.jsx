/**
 * CalendarView.jsx
 *
 * Month-grid calendar of auction dates, plus a separate "Date to be
 * announced" panel for lots without a date — mainly IBAPI listings
 * (99.7% of IBAPI's ~11.5K rows have no auction_date; auctiontiger.in
 * and bankauctions.in are both 100% dated, per Aug 25 audit).
 *
 * No calendar library dependency — plain Date math, kept intentionally
 * simple since this is a lot-count-per-day view, not a full scheduler.
 *
 * ASSUMED LISTING SHAPE (matches PropertyCard.jsx / backend response):
 *   { property_id, bank_name, location, state, district, property_type,
 *     reserve_price, auction_date, source }
 * auction_date is expected as anything `new Date()` can parse — same
 * assumption PropertyCard.jsx already makes via formatDate() in
 * lib/format.js, so this stays consistent with the rest of the app.
 */

import { useMemo, useState } from "react";
import { formatINR } from "@/lib/format";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function parseAuctionDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function CalendarView({ lots, loading, error }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [showTBA, setShowTBA] = useState(false);

  const { dated, undated } = useMemo(() => {
    const dated = [];
    const undated = [];
    for (const lot of lots || []) {
      const d = parseAuctionDate(lot.auction_date);
      if (d) dated.push({ ...lot, _date: d });
      else undated.push(lot);
    }
    return { dated, undated };
  }, [lots]);

  const lotsByDay = useMemo(() => {
    const map = new Map();
    for (const lot of dated) {
      const key = dateKey(lot._date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(lot);
    }
    return map;
  }, [dated]);

  const monthGrid = useMemo(() => {
    const firstOfMonth = new Date(cursor.year, cursor.month, 1);
    const startOffset = firstOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(cursor.year, cursor.month, day);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  const today = new Date();
  const isToday = (d) =>
    d && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  const goToMonth = (delta) => {
    setSelectedDay(null);
    setCursor((prev) => {
      let month = prev.month + delta;
      let year = prev.year;
      if (month < 0) { month = 11; year -= 1; }
      if (month > 11) { month = 0; year += 1; }
      return { year, month };
    });
  };

  if (loading) return <div style={centeredText}>Loading auction calendar…</div>;
  if (error) return <div style={centeredText}>Couldn't load the calendar. {error}</div>;

  const selectedLots = selectedDay ? lotsByDay.get(dateKey(selectedDay)) || [] : [];

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      {/* Calendar */}
      <div style={{ flex: "1 1 480px", minWidth: 320 }}>
          <div style={header}>
            <button onClick={() => goToMonth(-1)} style={navButton} aria-label="Previous month">‹</button>
            <div style={monthLabel}>
              {MONTH_NAMES[cursor.month]} {cursor.year}
            </div>
            <button onClick={() => goToMonth(1)} style={navButton} aria-label="Next month">›</button>
          </div>

        <div style={weekdayRow}>
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i} style={weekdayCell}>{w}</div>
          ))}
        </div>

        <div style={gridStyle}>
          {monthGrid.map((d, i) => {
            if (!d) return <div key={i} style={emptyCell} />;
            const count = lotsByDay.get(dateKey(d))?.length || 0;
            const selected = selectedDay && dateKey(selectedDay) === dateKey(d);
            return (
              <button
                key={i}
                onClick={() => count > 0 && setSelectedDay(d)}
                style={{
                  ...dayCell,
                  cursor: count > 0 ? "pointer" : "default",
                  borderColor: selected ? "#D4AF6A" : "rgba(212, 175, 106, 0.15)",
                  background: isToday(d) ? "rgba(212, 175, 106, 0.08)" : "transparent",
                }}
              >
                <div style={dayNumber}>{d.getDate()}</div>
                {count > 0 && <div style={dayCount}>{count}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day / TBA panel */}
      <div style={{ flex: "1 1 320px", minWidth: 280 }}>
        {selectedDay ? (
          <>
            <div style={panelTitle}>
              {selectedDay.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {" · "}{selectedLots.length} lot{selectedLots.length === 1 ? "" : "s"}
            </div>
            <div style={panelList}>
              {selectedLots.map((lot) => (
                <LotRow key={`${lot.source}-${lot.property_id}`} lot={lot} />
              ))}
            </div>
          </>
        ) : (
          <div style={{ color: "#5A6478", fontFamily: "monospace", fontSize: 12 }}>
            Select a highlighted date to see lots.
          </div>
        )}

        <button onClick={() => setShowTBA((s) => !s)} style={tbaToggle}>
          {showTBA ? "▾" : "▸"} Date to be announced ({undated.length.toLocaleString("en-IN")})
        </button>
        {showTBA && (
          <div style={{ ...panelList, marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#5A6478", marginBottom: 8, fontFamily: "monospace" }}>
              Mostly IBAPI listings — this source rarely publishes an auction date upfront.
            </div>
            {undated.slice(0, 100).map((lot) => (
              <LotRow key={`${lot.source}-${lot.property_id}`} lot={lot} />
            ))}
            {undated.length > 100 && (
              <div style={{ fontSize: 11, color: "#5A6478", marginTop: 8 }}>
                +{(undated.length - 100).toLocaleString("en-IN")} more — filter by bank or use search to narrow down.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LotRow({ lot }) {
  return (
    <div style={lotRow}>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: "#D4AF6A" }}>LOT {lot.property_id ?? "—"}</div>
      <div style={{ fontFamily: "serif", fontSize: 14, color: "#F4F1EA", margin: "2px 0" }}>
        {lot.property_type} · {lot.location}{lot.state ? `, ${lot.state}` : ""}
      </div>
      <div style={{ fontSize: 12, color: "#8A94A6" }}>
        {formatINR(lot.reserve_price)} · {lot.bank_name}
      </div>
    </div>
  );
}

const centeredText = { color: "#8A94A6", fontFamily: "monospace", fontSize: 14, padding: 40, textAlign: "center" };
const header = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 };
const monthLabel = { fontFamily: "serif", fontSize: 24, fontWeight: 700, color: "#F4F1EA" };
const navButton = {
  background: "transparent", border: "1px solid rgba(242, 140, 38, 0.28)", color: "#F28C26",
  width: 32, height: 32, borderRadius: 3, cursor: "pointer", fontSize: 16,
};
const weekdayRow = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 };
const weekdayCell = { textAlign: "center", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#8792A1", padding: "4px 0" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 };
const emptyCell = { minHeight: 56 };
const dayCell = {
  minHeight: 56, border: "1px solid rgba(242, 140, 38, 0.12)", borderRadius: 3,
  background: "transparent", display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", padding: 4,
};
const dayNumber = { fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "#8A94A6" };
const dayCount = { fontFamily: "serif", fontSize: 17, fontWeight: 700, color: "#F28C26", marginTop: 2 };
const panelTitle = { fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#F28C26", marginBottom: 10, letterSpacing: "0.03em" };
const panelList = { display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" };
const lotRow = { borderBottom: "1px solid rgba(242, 140, 38, 0.08)", paddingBottom: 8 };
const tbaToggle = {
  marginTop: 20, background: "transparent", border: "1px solid rgba(242, 140, 38, 0.18)",
  color: "#8A94A6", fontFamily: "monospace", fontSize: 13, fontWeight: 600, padding: "8px 12px",
  borderRadius: 3, cursor: "pointer", width: "100%", textAlign: "left",
};

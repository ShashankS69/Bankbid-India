"use client";

/**
 * Feature #8 — AI chatbot + recommendation feature.
 *
 * Drop this in as components/ChatBot.jsx.
 *
 * CHANGES IN THIS VERSION:
 *  - ChatListingRow no longer splits into `sm:w-1/4` columns. That split
 *    was keyed off the *viewport* width (Tailwind's `sm:` is a media
 *    query on the window, not the drawer), so on a normal desktop window
 *    it always rendered as 4 cramped quarter-width columns squeezed into
 *    the ~420px drawer — hence the "RES…" / "Na…" / "Karur…" truncation.
 *    Replaced with a layout built for the drawer's actual fixed width:
 *    a top line (type/location left, price right), a wrapping badge row
 *    (status/closing/yield/RESIDEX/date), and a bottom line (favorite +
 *    source). Nothing here depends on window size.
 *  - Dropped `truncate` on the type/location line in favor of wrapping
 *    (`line-clamp-2`), since a full "Residential · Karur, Tamil Nadu"
 *    string cut to "RES…" / "Na…" / "Karur…" isn't useful to read.
 *  - "TOP PICK" badge: `text-ledger` on `bg-gold` wasn't legible in
 *    practice — switched to solid black text, heavier weight, more
 *    padding, and a thin dark border for contrast regardless of the
 *    exact gold hex.
 *  - `listing.id === m.topPickId` fixed to `String(listing.id) === m.topPickId`
 *    (listing.id is a number from the API; top_pick_id comes back from
 *    chat.py's Recommendation schema as a string).
 */

import { useState, useRef, useEffect } from "react";
import { formatINR, titleCase, formatDate } from "@/lib/format";
import useFavorites from "@/lib/useFavorites";
import { sendChatMessage } from "@/lib/api";

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

function FavoriteButton({ active, onClick }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      className={`text-base leading-none transition-colors shrink-0 ${
        active ? "text-gold" : "text-slate-dim hover:text-gold"
      }`}
    >
      {active ? "★" : "☆"}
    </button>
  );
}

function Badge({ tone, children }) {
  const tones = {
    passed: "border-red-800/60 text-red-200 bg-red-900/30",
    active: "border-emerald-700 text-emerald-200 bg-emerald-800/30",
    pending: "border-moss/50 text-moss",
    closing: "border-rust/60 text-rust bg-rust/10",
  };
  return (
    <span className={`font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm border whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

/**
 * One listing as a wide row for the chat panel. Built for the drawer's
 * fixed ~380-420px width, not for viewport breakpoints — see the note at
 * the top of this file.
 */
function ChatListingRow({ listing, isTopPick, topPickReasoning }) {
  const { isFavorite, toggleFavorite } = useFavorites();

  const {
    id,
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
    residex_comparison,
    roi_estimate,
    previous_price,
    price_changed_at,
  } = listing;

  const favorited = isFavorite(id);

  const typeLabel = TYPE_LABELS[property_type?.toUpperCase()] || titleCase(property_type) || "Property";
  const sourceLabel = SOURCE_LABELS[source?.toLowerCase()] || source;
  const isIbapi = source?.toLowerCase() === "ibapi";
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

  const Row = source_url ? "a" : "div";
  const rowProps = source_url
    ? { href: source_url, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Row
      {...rowProps}
      className={`lot-ticket relative flex flex-col gap-2.5 rounded-sm px-4 pt-4 pb-3 w-full transition-transform hover:-translate-y-0.5 ${
        isTopPick ? "ring-1 ring-gold" : ""
      }`}
    >
      <span className="lot-notch-l" aria-hidden="true" />
      <span className="lot-notch-r" aria-hidden="true" />

      {isTopPick && (
        <span className="absolute -top-3 left-3 bg-black text-white font-mono text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-sm shadow-md border border-gold z-10">
          Top pick
        </span>
      )}

      {/* Top line: lot/type/location (left) — price (right) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-widest text-gold uppercase">
            Lot {property_id || "—"}
          </p>
          <p className="font-display text-sm text-ink leading-snug line-clamp-2 mt-0.5">
            {typeLabel} · {place || "Undisclosed"}
          </p>
          <p className="text-[11px] font-mono text-slate mt-0.5">
            {bank_name ? titleCase(bank_name) : "Bank undisclosed"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-lg text-gold leading-none">{formatINR(reserve_price)}</p>
          {hasPriceCut && (
            <p
              className="text-[10px] font-mono text-moss mt-1 whitespace-nowrap"
              title={price_changed_at ? `Price cut on ${formatDate(price_changed_at)}` : undefined}
            >
              <span className="line-through text-slate-dim">{formatINR(previous_price)}</span> · cut {priceCutPct}%
            </p>
          )}
          {emd ? <p className="text-[10px] font-mono text-slate mt-1 whitespace-nowrap">EMD {formatINR(emd)}</p> : null}
        </div>
      </div>

      {/* Wrapping badge row: status / closing / yield / RESIDEX / date */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {isExpired ? (
          <Badge tone="passed">Passed</Badge>
        ) : status ? (
          <Badge tone={isActive ? "active" : "pending"}>{status}</Badge>
        ) : null}
        {isClosingSoon && <Badge tone="closing">{closingSoonLabel}</Badge>}
        {roi_estimate && (
          <span className={`text-[11px] font-mono ${roi_estimate.comparison === "below" ? "text-rust" : "text-moss"}`}>
            ~{roi_estimate.effective_yield_pct}% yield
          </span>
        )}
        {residex_comparison && (
          <span className={`text-[11px] font-mono ${residex_comparison.pct_vs_market < 0 ? "text-moss" : "text-rust"}`}>
            {Math.abs(residex_comparison.pct_vs_market)}% {residex_comparison.pct_vs_market < 0 ? "below" : "above"} RESIDEX
          </span>
        )}
        <span className="text-[11px] font-mono text-slate-dim ml-auto whitespace-nowrap">{formatDate(auction_date)}</span>
      </div>

      {/* Bottom line: favorite + source */}
      <div className="flex items-center justify-between pt-2 border-t border-gold/10">
        <FavoriteButton active={favorited} onClick={() => toggleFavorite(listing)} />
        {source_url && (
          <span className="text-[9px] font-mono text-slate-dim uppercase tracking-wide">
            {isIbapi ? "IBAPI" : sourceLabel}
          </span>
        )}
      </div>

      {isTopPick && topPickReasoning && (
        <p className="text-xs text-slate/80 font-body pt-2 mt-0.5 border-t border-gold/10">
          {topPickReasoning}
        </p>
      )}
    </Row>
  );
}

export default function ChatBot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Tell me what you're looking for — e.g. \"3BHK in Pune under 40 lakh for renting out\" or \"office space in Mumbai, need it to close within 2 weeks.\"",
      listings: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text, listings: [] }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(text, history);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          listings: res.listings || [],
          topPickId: res.top_pick_id,
          topPickReasoning: res.top_pick_reasoning,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong on my end — mind trying that again?",
          listings: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-ledger">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex flex-col gap-3"}>
            <div
              className={
                m.role === "user"
                  ? "bg-gold text-ledger rounded-sm px-4 py-2 max-w-[80%] text-sm font-body"
                  : "bg-white/5 border border-gold/20 text-slate rounded-sm px-4 py-2 max-w-[80%] text-sm font-body"
              }
            >
              {m.content}
            </div>

            {m.listings && m.listings.length > 0 && (
              <div className="flex flex-col gap-3 w-full">
                {m.listings.map((listing) => (
                  <ChatListingRow
                    key={listing.id}
                    listing={listing}
                    isTopPick={String(listing.id) === m.topPickId}
                    topPickReasoning={m.topPickReasoning}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="bg-white/5 border border-gold/20 rounded-sm px-4 py-2 max-w-[80%] text-slate/70 text-sm font-body">
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-gold/30 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe what you're looking for…"
          className="flex-1 bg-white/5 border border-gold/30 text-ink placeholder:text-slate/50 rounded-sm px-4 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-gold"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-gold text-ledger font-mono text-xs uppercase tracking-widest rounded-sm px-4 py-2 disabled:opacity-40 hover:bg-white transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

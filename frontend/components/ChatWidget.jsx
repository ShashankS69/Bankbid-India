"use client";

/**
 * Feature #8 UI — collapsed tab + slide-out drawer, replaces the earlier
 * dedicated /chat page approach.
 *
 * Mount this ONCE at the top level of app/page.js, above the
 * `isMobile ? <MobileHome /> : <desktop 3-column JSX>` branch — same
 * reasoning as why MapView only mounts once: no need for a second copy
 * inside MobileHome.jsx, this is a fixed-position overlay independent of
 * the grid/tab layout underneath it.
 *
 * TODO(wire): fix the ChatBot import path to match your project structure.
 */

import { useState } from "react";
import ChatBot from "@/components/ChatBot";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Collapsed tab — sits flush against the left edge, reads normally
          left-to-right, matching the site's gold-outline button style
          (★ Compare Properties / Fetch Latest Listings). */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI chat"
          className="fixed left-0 top-24 z-40 flex items-center gap-2 bg-ledger border border-gold text-gold font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-r-sm hover:bg-gold hover:text-ledger transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>AI Chat</span>
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-full sm:w-[420px] bg-ledger border-r border-gold/30 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gold/30">
          <p className="font-mono text-xs font-extrabold tracking-widest text-gold uppercase">
            AI Chat
          </p>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close AI chat"
            className="text-gold hover:text-white text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
        <div className="h-[calc(100%-52px)]">
          <ChatBot />
        </div>
      </div>
    </>
  );
}

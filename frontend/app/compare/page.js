"use client";

import { useState } from "react";
import Link from "next/link";
import CompareFavorites from "@/components/CompareFavorites";
import CompareTable from "@/components/CompareTable";

const MAX_COMPARE = 3;

export default function ComparePage() {
  const [selected, setSelected] = useState([]);

  function handleAdd(listing) {
    setSelected((prev) => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.some((l) => l.id === listing.id)) return prev;
      return [...prev, listing];
    });
  }

  function handleRemove(id) {
    setSelected((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <main className="w-full max-w-[1100px] mx-auto px-6 lg:px-8 py-10 md:py-14 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[11px] tracking-widest text-gold uppercase">
          SARFAESI Auction Register
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
          Compare <span className="italic text-gold">Listings</span>
        </h1>
        <p className="text-slate text-sm font-body max-w-lg">
          Line up up to {MAX_COMPARE} auction lots side by side — price, EMD, RESIDEX
          comparison, and estimated rental yield.
        </p>
        <Link
          href="/"
          className="self-start flex items-center gap-2 font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-sm border border-gold text-gold hover:bg-gold hover:text-ledger transition-colors"
        >
          ← Back to Home
        </Link>
      </header>

      <CompareTable listings={selected} onRemove={handleRemove} />
      <CompareFavorites selectedIds={selected.map((l) => l.id)} onAdd={handleAdd} />
    </main>
  );
}
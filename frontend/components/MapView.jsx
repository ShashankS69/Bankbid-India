"use client";

import dynamic from "next/dynamic";

const MapViewInner = dynamic(() => import("./MapViewInner"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-[480px] rounded-sm overflow-hidden border border-ledger-line lot-ticket flex items-center justify-center">
      <span className="lot-notch-l" aria-hidden="true" />
      <span className="lot-notch-r" aria-hidden="true" />
      <div className="text-center font-mono text-xs text-slate">
        <p className="text-gold uppercase tracking-widest text-[11px] mb-2">Interactive Map</p>
        <p className="animate-pulse">Loading Leaflet Map View…</p>
      </div>
    </div>
  ),
});

export default function MapView({ lots, onSelectCity }) {
  return <MapViewInner lots={lots} onSelectCity={onSelectCity} />;
}

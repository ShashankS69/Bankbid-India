"use client";

import { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { formatINR } from "@/lib/format";

// Comprehensive Indian city and state centroid coordinates
const CITY_COORDINATES = {
  // Major Tier-1 / Tier-2 Metro Cities
  "mumbai": [19.0760, 72.8777],
  "delhi": [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090],
  "bengaluru": [12.9716, 77.5946],
  "bangalore": [12.9716, 77.5946],
  "hyderabad": [17.3850, 78.4867],
  "ahmedabad": [23.0225, 72.5714],
  "chennai": [13.0827, 80.2707],
  "kolkata": [22.5726, 88.3639],
  "surat": [21.1702, 72.8311],
  "pune": [18.5204, 73.8567],
  "jaipur": [26.9124, 75.7873],
  "lucknow": [26.8467, 80.9462],
  "kanpur": [26.4499, 80.3319],
  "nagpur": [21.1458, 79.0882],
  "indore": [22.7196, 75.8577],
  "thane": [19.2183, 72.9781],
  "bhopal": [23.2599, 77.4126],
  "visakhapatnam": [17.6868, 83.2185],
  "patna": [25.5941, 85.1376],
  "vadodara": [22.3072, 73.1812],
  "ghaziabad": [28.6692, 77.4538],
  "ludhiana": [30.9010, 75.8573],
  "agra": [27.1767, 78.0081],
  "nashik": [19.9975, 73.7898],
  "faridabad": [28.4089, 77.3178],
  "meerut": [28.9845, 77.7064],
  "rajkot": [22.3039, 70.8022],
  "varanasi": [25.3176, 82.9739],
  "srinagar": [34.0837, 74.7973],
  "aurangabad": [19.8762, 75.3433],
  "chhatrapati sambhajinagar": [19.8762, 75.3433],
  "dhanbad": [23.7957, 86.4304],
  "amritsar": [31.6340, 74.8723],
  "navi mumbai": [19.0330, 73.0297],
  "allahabad": [25.4358, 81.8463],
  "prayagraj": [25.4358, 81.8463],
  "ranchi": [23.3441, 85.3096],
  "howrah": [22.5958, 88.2636],
  "coimbatore": [11.0168, 76.9558],
  "jabalpur": [23.1815, 79.9864],
  "gwalior": [26.2183, 78.1828],
  "vijayawada": [16.5062, 80.6480],
  "jodhpur": [26.2389, 73.0243],
  "madurai": [9.9252, 78.1198],
  "raipur": [21.2514, 81.6296],
  "kota": [25.2138, 75.8648],
  "guwahati": [26.1445, 91.7362],
  "chandigarh": [30.7333, 76.7794],
  "solapur": [17.6599, 75.9064],
  "hubli": [15.3647, 75.1240],
  "bareilly": [28.3670, 79.4304],
  "mysore": [12.2958, 76.6394],
  "mysuru": [12.2958, 76.6394],
  "moradabad": [28.8386, 78.7733],
  "gurgaon": [28.4595, 77.0266],
  "gurugram": [28.4595, 77.0266],
  "aligarh": [27.8974, 78.0880],
  "jalandhar": [31.3260, 75.5762],
  "tiruchirappalli": [10.7905, 78.7047],
  "bhubaneswar": [20.2961, 85.8245],
  "salem": [11.6643, 78.1460],
  "warangal": [17.9689, 79.5941],
  "noida": [28.5355, 77.3910],
  "greater noida": [28.4744, 77.5040],
  "kochi": [9.9312, 76.2673],
  "cochin": [9.9312, 76.2673],
  "dehradun": [30.3165, 78.0322],
  "jammu": [32.7266, 74.8570],
  "shimla": [31.1048, 77.1734],
  "goa": [15.2993, 74.1240],
  "panaji": [15.4909, 73.8278],
  "mangalore": [12.9141, 74.8560],
  "mangaluru": [12.9141, 74.8560],
  "trivandrum": [8.5241, 76.9366],
  "thiruvananthapuram": [8.5241, 76.9366],

  // State Centroids (fallback if city exact match isn't in dictionary)
  "maharashtra": [19.7515, 75.7139],
  "karnataka": [15.3173, 75.7139],
  "tamil nadu": [11.1271, 78.6569],
  "telangana": [18.1124, 79.0193],
  "andhra pradesh": [15.9129, 79.7400],
  "west bengal": [22.9868, 87.8550],
  "gujarat": [22.2587, 71.1924],
  "uttar pradesh": [26.8467, 80.9462],
  "rajasthan": [27.0238, 74.2179],
  "kerala": [10.8505, 76.2711],
  "punjab": [31.1471, 75.3412],
  "haryana": [29.0588, 76.0856],
  "madhya pradesh": [22.9734, 78.6569],
  "bihar": [25.0961, 85.3131],
  "odisha": [20.9517, 85.0985],
  "jharkhand": [23.6102, 85.2799],
  "assam": [26.2006, 92.9376],
  "uttarakhand": [30.0668, 79.0193],
  "himachal pradesh": [31.1048, 77.1734],
};

function resolveCoords(location, district, state) {
  const locKey = (location || "").trim().toLowerCase();
  const distKey = (district || "").trim().toLowerCase();
  const stateKey = (state || "").trim().toLowerCase();

  // 1. Direct location match
  if (CITY_COORDINATES[locKey]) return CITY_COORDINATES[locKey];

  // 2. Substring match against city keys
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (locKey.includes(key) || key.includes(locKey)) {
      return coords;
    }
  }

  // 3. District match
  if (CITY_COORDINATES[distKey]) return CITY_COORDINATES[distKey];

  // 4. State match
  if (CITY_COORDINATES[stateKey]) return CITY_COORDINATES[stateKey];

  return null;
}

function createCustomIcon(count) {
  const display = count > 999 ? Math.round(count / 1000) + "k" : count;
  // show the exact count on hover using data-count attribute, keep compact display in pin
  return L.divIcon({
    className: "custom-map-icon",
    html: `<div class="map-pin" data-count="${count}"><div class="map-marker-badge">${display}</div></div>`,
    iconSize: [36, 28],
    iconAnchor: [18, 14],
  });
}

function MapUpdater({ clusters }) {
  const map = useMap();
  useEffect(() => {
    if (!clusters || clusters.length === 0) return;
    const bounds = L.latLngBounds(clusters.map((c) => c.coords));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 });
    }
  }, [clusters, map]);
  return null;
}

export default function MapViewInner({ lots, onSelectCity }) {
  const clusters = useMemo(() => {
    const map = new Map();

    for (const lot of lots || []) {
      const city = lot.location || lot.district || lot.state || "Undisclosed";
      const coords = resolveCoords(lot.location, lot.district, lot.state);
      if (!coords) continue;

      const key = `${coords[0].toFixed(2)},${coords[1].toFixed(2)}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          city: (city.charAt(0).toUpperCase() + city.slice(1)).trim(),
          coords,
          lots: [],
        });
      }
      map.get(key).lots.push(lot);
    }

    return Array.from(map.values()).map((cluster) => {
      const prices = cluster.lots
        .map((l) => l.reserve_price)
        .filter((p) => p && p > 0);
      const minPrice = prices.length ? Math.min(...prices) : null;
      const maxPrice = prices.length ? Math.max(...prices) : null;

      const bankCounts = {};
      for (const l of cluster.lots) {
        if (l.bank_name) {
          bankCounts[l.bank_name] = (bankCounts[l.bank_name] || 0) + 1;
        }
      }
      const topBank = Object.entries(bankCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

      return {
        ...cluster,
        count: cluster.lots.length,
        minPrice,
        maxPrice,
        topBank,
      };
    });
  }, [lots]);

  const defaultCenter = [20.5937, 78.9629]; // Center of India

  return (
    <div className="relative w-full h-[480px] rounded-sm overflow-hidden border border-ledger-line lot-ticket">
      <span className="lot-notch-l" aria-hidden="true" />
      <span className="lot-notch-r" aria-hidden="true" />

      <MapContainer
        center={defaultCenter}
        zoom={5}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapUpdater clusters={clusters} />

        {clusters.map((cluster) => (
          <Marker
            key={cluster.key}
            position={cluster.coords}
            icon={createCustomIcon(cluster.count)}
          >
            <Popup>
              <div className="p-1 min-w-[200px] font-body text-ink">
                <div className="font-mono text-xs text-gold uppercase tracking-wider">
                  {cluster.city}
                </div>
                <div className="font-display text-base text-ink mt-1">
                  {cluster.count.toLocaleString("en-IN")} Auction Lot{cluster.count === 1 ? "" : "s"}
                </div>

                <div className="my-2 border-t border-ledger-line/60 pt-2 text-xs space-y-1 font-mono text-slate">
                  {cluster.minPrice ? (
                    <div>
                      <span className="text-slate-dim">Price range: </span>
                      <span className="text-gold">{formatINR(cluster.minPrice)}</span>
                      {cluster.maxPrice !== cluster.minPrice && (
                        <span> – {formatINR(cluster.maxPrice)}</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-dim">Price on request</div>
                  )}

                  {cluster.topBank && (
                    <div>
                      <span className="text-slate-dim">Lead bank: </span>
                      <span className="text-ink">{cluster.topBank}</span>
                    </div>
                  )}
                </div>

                {onSelectCity && (
                  <button
                    onClick={() => onSelectCity(cluster.city)}
                    className="w-full mt-2 font-mono text-[11px] uppercase tracking-wider py-1.5 px-3 rounded-sm border border-gold text-gold hover:bg-gold hover:text-ledger transition-colors"
                  >
                    Filter lots by {cluster.city}
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

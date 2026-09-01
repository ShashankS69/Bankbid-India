"use client";

import { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { formatINR } from "@/lib/format";
import { ALL_CITIES, STATES, findStateForCity } from "@/lib/indiaLocations";

// ---------------------------------------------------------------------------
// Coordinates, keyed EXACTLY to the canonical names in lib/indiaLocations.js
// (ALL_CITIES / STATES). No fuzzy matching against these — a listing's
// location either resolves to one of these keys or it doesn't, so the map's
// per-marker count always matches what the backend filter returns for the
// same value.
// ---------------------------------------------------------------------------

const CITY_COORDINATES = {
  "visakhapatnam": [17.6868, 83.2185], "vijayawada": [16.5062, 80.6480], "guntur": [16.3067, 80.4365],
  "nellore": [14.4426, 79.9865], "kurnool": [15.8281, 78.0373], "rajahmundry": [17.0005, 81.8040],
  "tirupati": [13.6288, 79.4192], "kadapa": [14.4674, 78.8241], "kakinada": [16.9891, 82.2475],
  "anantapur": [14.6819, 77.6006], "eluru": [16.7107, 81.0952], "ongole": [15.5057, 80.0499], "chittoor": [13.2172, 79.1003],
  "itanagar": [27.0844, 93.6053], "naharlagun": [27.1040, 93.6950], "pasighat": [28.0669, 95.3269],
  "guwahati": [26.1445, 91.7362], "silchar": [24.8333, 92.7789], "dibrugarh": [27.4728, 94.9120],
  "jorhat": [26.7509, 94.2037], "nagaon": [26.3480, 92.6840], "tezpur": [26.6338, 92.8000], "tinsukia": [27.4906, 95.3600],
  "patna": [25.5941, 85.1376], "gaya": [24.7955, 85.0002], "bhagalpur": [25.2425, 86.9842], "muzaffarpur": [26.1225, 85.3906],
  "darbhanga": [26.1542, 85.8918], "purnia": [25.7771, 87.4753], "arrah": [25.5541, 84.6634],
  "begusarai": [25.4182, 86.1272], "chapra": [25.7810, 84.7500], "katihar": [25.5391, 87.5710],
  "raipur": [21.2514, 81.6296], "bhilai": [21.2090, 81.4285], "bilaspur": [22.0797, 82.1409],
  "korba": [22.3595, 82.7501], "durg": [21.1904, 81.2849], "rajnandgaon": [21.0974, 81.0388], "raigarh": [21.8974, 83.3950],
  "panaji": [15.4909, 73.8278], "margao": [15.2832, 73.9862], "vasco da gama": [15.3981, 73.8114],
  "mapusa": [15.5937, 73.8142], "ponda": [15.4030, 74.0155],
  "ahmedabad": [23.0225, 72.5714], "surat": [21.1702, 72.8311], "vadodara": [22.3072, 73.1812],
  "rajkot": [22.3039, 70.8022], "bhavnagar": [21.7645, 72.1519], "jamnagar": [22.4707, 70.0577],
  "gandhinagar": [23.2156, 72.6369], "junagadh": [21.5222, 70.4579], "anand": [22.5645, 72.9289],
  "nadiad": [22.6939, 72.8618], "mehsana": [23.5880, 72.3693], "bharuch": [21.7051, 72.9959],
  "navsari": [20.9467, 72.9520], "valsad": [20.5992, 72.9342], "vapi": [20.3893, 72.9106], "morbi": [22.8173, 70.8378],
  "faridabad": [28.4089, 77.3178], "gurugram": [28.4595, 77.0266], "panipat": [29.3909, 76.9635],
  "ambala": [30.3752, 76.7821], "yamunanagar": [30.1290, 77.2674], "rohtak": [28.8955, 76.6066],
  "hisar": [29.1492, 75.7217], "karnal": [29.6857, 76.9905], "sonipat": [28.9931, 77.0151],
  "panchkula": [30.6942, 76.8606], "bhiwani": [28.7975, 76.1322],
  "shimla": [31.1048, 77.1734], "dharamshala": [32.2190, 76.3234], "solan": [30.9084, 77.0999],
  "mandi": [31.7080, 76.9319], "kullu": [31.9576, 77.1095], "una": [31.4685, 76.2708],
  "ranchi": [23.3441, 85.3096], "jamshedpur": [22.8046, 86.2029], "dhanbad": [23.7957, 86.4304],
  "bokaro": [23.6693, 86.1511], "deoghar": [24.4823, 86.6944], "hazaribagh": [23.9925, 85.3637], "giridih": [24.1913, 86.3020],
  "bengaluru": [12.9716, 77.5946], "mysuru": [12.2958, 76.6394], "hubballi": [15.3647, 75.1240],
  "dharwad": [15.4589, 75.0078], "mangaluru": [12.9141, 74.8560], "belagavi": [15.8497, 74.4977],
  "ballari": [15.1394, 76.9214], "davangere": [14.4644, 75.9218], "shivamogga": [13.9299, 75.5681],
  "tumakuru": [13.3379, 77.1173], "kalaburagi": [17.3297, 76.8343], "vijayapura": [16.8302, 75.7100],
  "hassan": [13.0072, 76.0964], "udupi": [13.3409, 74.7421], "bidar": [17.9104, 77.5199],
  "thiruvananthapuram": [8.5241, 76.9366], "kochi": [9.9312, 76.2673], "kozhikode": [11.2588, 75.7804],
  "thrissur": [10.5276, 76.2144], "kollam": [8.8932, 76.6141], "kannur": [11.8745, 75.3704],
  "alappuzha": [9.4981, 76.3388], "palakkad": [10.7867, 76.6548], "malappuram": [11.0510, 76.0711], "kottayam": [9.5916, 76.5222],
  "bhopal": [23.2599, 77.4126], "indore": [22.7196, 75.8577], "jabalpur": [23.1815, 79.9864],
  "gwalior": [26.2183, 78.1828], "ujjain": [23.1765, 75.7885], "sagar": [23.8388, 78.7378],
  "dewas": [22.9676, 76.0534], "satna": [24.6005, 80.8322], "ratlam": [23.3315, 75.0367],
  "rewa": [24.5362, 81.3037], "bhind": [26.5646, 78.7873],
  "mumbai": [19.0760, 72.8777], "pune": [18.5204, 73.8567], "nagpur": [21.1458, 79.0882],
  "nashik": [19.9975, 73.7898], "thane": [19.2183, 72.9781], "chhatrapati sambhajinagar": [19.8762, 75.3433],
  "solapur": [17.6599, 75.9064], "kolhapur": [16.7050, 74.2433], "amravati": [20.9374, 77.7796],
  "navi mumbai": [19.0330, 73.0297], "vasai-virar": [19.4914, 72.8054], "kalyan-dombivli": [19.2403, 73.1305],
  "ahmednagar": [19.0952, 74.7496], "akola": [20.7002, 77.0082], "latur": [18.4088, 76.5604],
  "jalgaon": [21.0077, 75.5626], "sangli": [16.8524, 74.5815], "satara": [17.6805, 74.0183],
  "ratnagiri": [16.9902, 73.3120], "chandrapur": [19.9615, 79.2961],
  "imphal": [24.8170, 93.9368], "thoubal": [24.6333, 94.0167],
  "shillong": [25.5788, 91.8933], "tura": [25.5138, 90.2027],
  "aizawl": [23.7271, 92.7176], "lunglei": [22.8850, 92.7370],
  "kohima": [25.6751, 94.1086], "dimapur": [25.9091, 93.7267],
  "bhubaneswar": [20.2961, 85.8245], "cuttack": [20.4625, 85.8830], "rourkela": [22.2604, 84.8536],
  "berhampur": [19.3149, 84.7941], "sambalpur": [21.4669, 83.9756], "puri": [19.8135, 85.8312], "balasore": [21.4942, 86.9317],
  "ludhiana": [30.9010, 75.8573], "amritsar": [31.6340, 74.8723], "jalandhar": [31.3260, 75.5762],
  "patiala": [30.3398, 76.3869], "bathinda": [30.2110, 74.9455], "mohali": [30.7046, 76.7179],
  "pathankot": [32.2643, 75.6421], "hoshiarpur": [31.5344, 75.9119],
  "jaipur": [26.9124, 75.7873], "jodhpur": [26.2389, 73.0243], "udaipur": [24.5854, 73.7125],
  "kota": [25.2138, 75.8648], "bikaner": [28.0229, 73.3119], "ajmer": [26.4499, 74.6399],
  "bhilwara": [25.3407, 74.6313], "alwar": [27.5530, 76.6346], "sikar": [27.6094, 75.1399],
  "bharatpur": [27.2152, 77.4909], "pali": [25.7711, 73.3234],
  "gangtok": [27.3389, 88.6065], "namchi": [27.1660, 88.3639],
  "chennai": [13.0827, 80.2707], "coimbatore": [11.0168, 76.9558], "madurai": [9.9252, 78.1198],
  "tiruchirappalli": [10.7905, 78.7047], "salem": [11.6643, 78.1460], "tirunelveli": [8.7139, 77.7567],
  "erode": [11.3410, 77.7172], "vellore": [12.9165, 79.1325], "thoothukudi": [8.7642, 78.1348],
  "thanjavur": [10.7870, 79.1378], "dindigul": [10.3673, 77.9803], "kanchipuram": [12.8342, 79.7036],
  "karur": [10.9601, 78.0766], "nagercoil": [8.1790, 77.4338],
  "hyderabad": [17.3850, 78.4867], "warangal": [17.9689, 79.5941], "nizamabad": [18.6725, 78.0941],
  "karimnagar": [18.4386, 79.1288], "khammam": [17.2473, 80.1514], "ramagundam": [18.7563, 79.4747],
  "mahbubnagar": [16.7460, 77.9977], "nalgonda": [17.0575, 79.2670], "adilabad": [19.6633, 78.5320], "secunderabad": [17.4399, 78.4983],
  "agartala": [23.8315, 91.2868],
  "lucknow": [26.8467, 80.9462], "kanpur": [26.4499, 80.3319], "ghaziabad": [28.6692, 77.4538],
  "agra": [27.1767, 78.0081], "varanasi": [25.3176, 82.9739], "meerut": [28.9845, 77.7064],
  "prayagraj": [25.4358, 81.8463], "bareilly": [28.3670, 79.4304], "aligarh": [27.8974, 78.0880],
  "moradabad": [28.8386, 78.7733], "noida": [28.5355, 77.3910], "gorakhpur": [26.7606, 83.3732],
  "jhansi": [25.4484, 78.5685], "muzaffarnagar": [29.4727, 77.7085], "mathura": [27.4924, 77.6737], "saharanpur": [29.9640, 77.5460],
  "firozabad": [27.1592, 78.3957],
  "dehradun": [30.3165, 78.0322], "haridwar": [29.9457, 78.1642], "roorkee": [29.8543, 77.8880],
  "haldwani": [29.2183, 79.5130], "rudrapur": [28.9873, 79.4041], "nainital": [29.3919, 79.4542],
  "kolkata": [22.5726, 88.3639], "howrah": [22.5958, 88.2636], "durgapur": [23.5204, 87.3119],
  "asansol": [23.6739, 86.9524], "siliguri": [26.7271, 88.3953], "bardhaman": [23.2324, 87.8615],
  "malda": [25.0108, 88.1435], "kharagpur": [22.3460, 87.2320], "haldia": [22.0667, 88.0698], "darjeeling": [27.0410, 88.2663],
  "port blair": [11.6234, 92.7265],
  "chandigarh": [30.7333, 76.7794],
  "silvassa": [20.2738, 73.0165], "daman": [20.3974, 72.8328], "diu": [20.7144, 70.9874],
  "new delhi": [28.6139, 77.2090], "dwarka": [28.5921, 77.0460], "rohini": [28.7495, 77.0565],
  "saket": [28.5244, 77.2066], "karol bagh": [28.6519, 77.1909],
  "srinagar": [34.0837, 74.7973], "jammu": [32.7266, 74.8570], "anantnag": [33.7311, 75.1487], "baramulla": [34.2090, 74.3436],
  "leh": [34.1526, 77.5771], "kargil": [34.5539, 76.1349],
  "kavaratti": [10.5669, 72.6420],
  "puducherry": [11.9416, 79.8083], "karaikal": [10.9254, 79.8380],
};

// State centroids -- fallback when a listing only gives a state (or the
// city string genuinely isn't in our dictionary and we can't map it to
// a state via findStateForCity either).
const STATE_COORDINATES = {
  "andhra pradesh": [15.9129, 79.7400], "arunachal pradesh": [28.2180, 94.7278],
  "assam": [26.2006, 92.9376], "bihar": [25.0961, 85.3131], "chhattisgarh": [21.2787, 81.8661],
  "goa": [15.2993, 74.1240], "gujarat": [22.2587, 71.1924], "haryana": [29.0588, 76.0856],
  "himachal pradesh": [31.1048, 77.1734], "jharkhand": [23.6102, 85.2799], "karnataka": [15.3173, 75.7139],
  "kerala": [10.8505, 76.2711], "madhya pradesh": [22.9734, 78.6569], "maharashtra": [19.7515, 75.7139],
  "manipur": [24.6637, 93.9063], "meghalaya": [25.4670, 91.3662], "mizoram": [23.1645, 92.9376],
  "nagaland": [26.1584, 94.5624], "odisha": [20.9517, 85.0985], "punjab": [31.1471, 75.3412],
  "rajasthan": [27.0238, 74.2179], "sikkim": [27.5330, 88.5122], "tamil nadu": [11.1271, 78.6569],
  "telangana": [18.1124, 79.0193], "tripura": [23.9408, 91.9882], "uttar pradesh": [26.8467, 80.9462],
  "uttarakhand": [30.0668, 79.0193], "west bengal": [22.9868, 87.8550],
  "andaman and nicobar islands": [11.7401, 92.6586], "chandigarh": [30.7333, 76.7794],
  "dadra and nagar haveli and daman and diu": [20.2738, 73.0165], "delhi": [28.6139, 77.2090],
  "jammu and kashmir": [33.7782, 76.5762], "ladakh": [34.2268, 77.5619],
  "lakshadweep": [10.5669, 72.6420], "puducherry": [11.9416, 79.8083],
};

function normKey(s) {
  return (s || "").trim().toLowerCase();
}

/**
 * Resolves a listing to map coordinates using ONLY exact, canonical
 * matches -- the same normalized values the backend filter and
 * FilterBar's comboboxes use (lib/indiaLocations.js). No substring
 * fuzzy-matching: that was silently mis-bucketing listings into the
 * wrong cluster (or dropping them) whenever one place name happened to
 * be a substring of another (e.g. "Kotagiri" containing "Kota").
 *
 * Returns { coords, resolvedBy } or null if genuinely unresolvable.
 */
function resolveCoords(location, district, state) {
  const locKey = normKey(location);
  const distKey = normKey(district);
  const stateKey = normKey(state);

  if (CITY_COORDINATES[locKey]) return { coords: CITY_COORDINATES[locKey], resolvedBy: "location" };
  if (CITY_COORDINATES[distKey]) return { coords: CITY_COORDINATES[distKey], resolvedBy: "district" };

  // Try resolving the location/district string to its state via the
  // canonical city->state map, then fall back to that state's centroid.
  const stateFromLoc = findStateForCity(location) || findStateForCity(district);
  if (stateFromLoc && STATE_COORDINATES[normKey(stateFromLoc)]) {
    return { coords: STATE_COORDINATES[normKey(stateFromLoc)], resolvedBy: "state-inferred" };
  }

  if (STATE_COORDINATES[stateKey]) return { coords: STATE_COORDINATES[stateKey], resolvedBy: "state" };

  return null;
}

function createCustomIcon(count, isUnmapped) {
  const display = count > 999 ? Math.round(count / 1000) + "k" : count;
  return L.divIcon({
    className: "custom-map-icon",
    html: `<div class="map-pin${isUnmapped ? " map-pin-unmapped" : ""}" data-count="${count}"><div class="map-marker-badge">${display}</div></div>`,
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
  const { clusters, unmappedCount } = useMemo(() => {
    const map = new Map();
    let unmapped = 0;

    for (const lot of lots || []) {
      const city = lot.location || lot.district || lot.state || "Undisclosed";
      const resolved = resolveCoords(lot.location, lot.district, lot.state);

      if (!resolved) {
        // Never silently drop -- count it so totals are auditable even
        // though it can't be placed on the map.
        unmapped += 1;
        continue;
      }

      const { coords } = resolved;
      const key = `${coords[0].toFixed(2)},${coords[1].toFixed(2)}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          city: (city.charAt(0).toUpperCase() + city.slice(1)).trim(),
          coords,
          lots: [],
          locations: new Set(),
        });
      }
      const entry = map.get(key);
      entry.lots.push(lot);
      if (lot.location) entry.locations.add(lot.location.trim());
    }

    const built = Array.from(map.values()).map((cluster) => {
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
        locations: Array.from(cluster.locations),
        count: cluster.lots.length,
        minPrice,
        maxPrice,
        topBank,
      };
    });

    return { clusters: built, unmappedCount: unmapped };
  }, [lots]);

  const defaultCenter = [20.5937, 78.9629]; // Center of India

  // Sanity check in dev: cluster counts + unmapped should always equal
  // lots.length. If this ever fires, something upstream changed shape
  // (e.g. lot.location renamed) and coords are silently failing again.
  if (process.env.NODE_ENV !== "production") {
    const total = clusters.reduce((sum, c) => sum + c.count, 0) + unmappedCount;
    if (lots && total !== lots.length) {
      console.warn(
        `MapViewInner: accounted for ${total} of ${lots.length} lots (mismatch of ${lots.length - total}).`
      );
    }
  }

  return (
    <div className="relative w-full h-[480px] rounded-sm overflow-hidden border border-ledger-line lot-ticket">
      <span className="lot-notch-l" aria-hidden="true" />
      <span className="lot-notch-r" aria-hidden="true" />

      {unmappedCount > 0 && (
        <div className="absolute top-2 right-2 z-[1000] font-mono text-[10px] uppercase tracking-wider bg-ledger/90 border border-ledger-line text-slate-dim px-2 py-1 rounded-sm">
          {unmappedCount} unmapped
        </div>
      )}

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
                    onClick={() => onSelectCity(cluster.locations.length ? cluster.locations : [cluster.city])}
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

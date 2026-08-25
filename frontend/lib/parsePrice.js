// Parses Indian shorthand price input into a raw rupee number.
// Accepts: "500000", "5L", "5 lakh", "1.2cr", "1.2 crore", "50k", "50 thousand"
export function parsePrice(input) {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim().toLowerCase();
  if (raw === "") return null;

  const match = raw.match(/^([\d,]*\.?\d+)\s*(k|thousand|l|lac|lakh|lakhs|cr|crore|crores)?$/);
  if (!match) return null;

  const num = parseFloat(match[1].replace(/,/g, ""));
  if (isNaN(num)) return null;

  const unit = match[2];
  const multipliers = {
    k: 1e3,
    thousand: 1e3,
    l: 1e5,
    lac: 1e5,
    lakh: 1e5,
    lakhs: 1e5,
    cr: 1e7,
    crore: 1e7,
    crores: 1e7,
  };

  return unit ? Math.round(num * multipliers[unit]) : Math.round(num);
}

// Formats a raw rupee number back into short display form for a hint label.
export function formatPriceHint(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (isNaN(n)) return "";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)} K`;
  return `₹${n}`;
}
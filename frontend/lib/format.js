export function formatINR(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Price on request";
  }
  const num = Number(value);
  if (num >= 1_00_00_000) {
    return `₹${(num / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (num >= 1_00_000) {
    return `₹${(num / 1_00_000).toFixed(2)} L`;
  }
  return `₹${num.toLocaleString("en-IN")}`;
}

export function titleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function formatDate(dateStr) {
  if (!dateStr) return "Date TBA";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

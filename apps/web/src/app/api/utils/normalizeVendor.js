export default function normalizeVendor(vendor) {
  if (!vendor) return null;
  const trimmed = String(vendor).trim().toLowerCase();
  if (!trimmed) return null;
  // Collapse whitespace and remove obvious punctuation noise.
  return trimmed.replace(/\s+/g, " ").replace(/[\u2019']/g, "'");
}

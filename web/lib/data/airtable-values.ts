/** Normalize messy Airtable field values into display primitives. */

export function asText(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const joined = value.map((item) => asText(item, "")).filter(Boolean).join(", ");
    return joined || fallback;
  }
  if (typeof value === "object" && value !== null && "name" in value) {
    return asText((value as { name: unknown }).name, fallback);
  }
  return String(value);
}

export function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (Array.isArray(value) && value.length > 0) return asNumber(value[0]);
  return 0;
}

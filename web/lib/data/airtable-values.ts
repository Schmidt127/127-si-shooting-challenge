/** Normalize messy Airtable field values into display primitives. */

function readObjectField(value: object, key: string): unknown {
  return key in value ? (value as Record<string, unknown>)[key] : undefined;
}

export function asText(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const joined = value.map((item) => asText(item, "")).filter(Boolean).join(", ");
    return joined || fallback;
  }
  if (typeof value === "object" && value !== null) {
    for (const key of ["name", "value", "text", "url"] as const) {
      const nested = readObjectField(value, key);
      if (nested != null && nested !== "") {
        const parsed = asText(nested, "");
        if (parsed) return parsed;
      }
    }
  }
  return fallback;
}

export function asUrl(value: unknown): string {
  const text = asText(value, "");
  return text === "—" ? "" : text;
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

/** Like asNumber, but blank / missing / unparsable → null (never invents 0). */
export function asOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return asOptionalNumber(value[0]);
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Airtable percent formulas return 0–1 ratios (or blank).
 * Returns null when the underlying attempts were never recorded.
 */
export function asOptionalPercentRatio(value: unknown): number | null {
  const n = asOptionalNumber(value);
  if (n == null) return null;
  // Guard absurd values; treat > 1.5 as already-percent (legacy) → ratio.
  if (n > 1.5) return Math.min(1, n / 100);
  return n;
}

export function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

export function asOptionalDateKey(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Airtable date fields often YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;
    return parsed.toLocaleDateString("en-CA", { timeZone: "America/Denver" });
  }
  if (Array.isArray(value) && value.length > 0) return asOptionalDateKey(value[0]);
  return null;
}

export function linkedRecordIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string" && item.startsWith("rec")) return item;
      if (typeof item === "object" && item !== null && "id" in item) {
        const id = String((item as { id: unknown }).id ?? "");
        return id.startsWith("rec") ? id : "";
      }
      return "";
    })
    .filter(Boolean);
}

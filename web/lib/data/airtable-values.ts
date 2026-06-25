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

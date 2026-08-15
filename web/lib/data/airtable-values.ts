/**
 * Normalize Airtable REST field values into display primitives and strict
 * public-adapter contracts. Prefer these helpers over ad-hoc parsing in
 * leaderboard, homework, levels, or profile mappers.
 *
 * Live REST shapes (classic API):
 * - linked records → `["rec…"]` (or rarely `[{ id: "rec…" }]`)
 * - lookups → often one-item arrays (`[1]`, `["text"]`) even when prefersSingle
 * - single selects → string name or `{ id, name, color }`
 * - multi selects → string[] or `{ id, name, color }[]`
 * - checkboxes → `true` when checked, otherwise omitted/false
 * - attachments → `[{ id, url, filename, … }]`
 */

function readObjectField(value: object, key: string): unknown {
  return key in value ? (value as Record<string, unknown>)[key] : undefined;
}

/** Thrown when a strict public-adapter field contract is violated. */
export class AirtableFieldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AirtableFieldError";
  }
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

/**
 * Checkbox / boolean lookup normalization.
 * Lookup arrays use OR semantics (`some`): any true-ish item makes the whole value true.
 * Callers that require exactly one settled boolean should validate length themselves.
 */
export function asBoolean(value: unknown): boolean {
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    return value.some((item) => asBoolean(item));
  }
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

/** Linked-record IDs from a classic REST link field (`["rec…"]`). */
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

/** First linked record id, or empty string when missing (lenient catalog mappers). */
export function firstLinkedRecordId(value: unknown): string {
  return linkedRecordIds(value)[0] ?? "";
}

export function requireExactlyOneLinkedRecordId(
  value: unknown,
  fieldName: string,
  recordLabel = "Record",
): string {
  const values = linkedRecordIds(value);
  if (values.length !== 1) {
    throw new AirtableFieldError(
      `${recordLabel} requires exactly one ${fieldName}; found ${values.length}.`,
    );
  }
  return values[0];
}

/**
 * Normalize a lookup (or scalar) into a list of raw items.
 * Lookups frequently arrive as one-item arrays even when prefersSingle is set.
 */
export function lookupItems(value: unknown): unknown[] {
  if (value == null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

export function requireExactlyOneLookupNumber(
  value: unknown,
  fieldName: string,
  recordLabel = "Record",
): number {
  const items = lookupItems(value);
  if (items.length !== 1) {
    throw new AirtableFieldError(
      `${recordLabel} has missing or invalid ${fieldName}; expected exactly one lookup value, found ${items.length}.`,
    );
  }
  const parsed = parseNonNegativeNumber(items[0]);
  if (parsed === null) {
    throw new AirtableFieldError(
      `${recordLabel} has missing or invalid ${fieldName}; value remains unsettled.`,
    );
  }
  return parsed;
}

export function requireExactlyOneLookupText(
  value: unknown,
  fieldName: string,
  recordLabel = "Record",
): string {
  const items = lookupItems(value);
  if (items.length !== 1) {
    throw new AirtableFieldError(
      `${recordLabel} requires exactly one ${fieldName}; found ${items.length}.`,
    );
  }
  const text = asText(items[0], "");
  if (!text || text === "—") {
    throw new AirtableFieldError(`${recordLabel} has missing ${fieldName}.`);
  }
  return text;
}

/**
 * Single-select display name from a string or `{ id, name, color }` object.
 * Also accepts a one-item lookup/select array.
 */
export function selectName(value: unknown, fallback = ""): string {
  const items = lookupItems(value);
  if (items.length === 0) return fallback;
  if (items.length > 1) {
    return items.map((item) => selectName(item, "")).filter(Boolean).join(", ") || fallback;
  }
  const item = items[0];
  if (typeof item === "string") return item.trim() || fallback;
  if (typeof item === "object" && item !== null && "name" in item) {
    return asText((item as { name?: unknown }).name, fallback);
  }
  return asText(item, fallback);
}

export function requireSelectName(
  value: unknown,
  fieldName: string,
  recordLabel = "Record",
): string {
  const items = lookupItems(value);
  if (items.length !== 1) {
    throw new AirtableFieldError(
      `${recordLabel} requires exactly one ${fieldName}; found ${items.length}.`,
    );
  }
  const name = selectName(items[0], "");
  if (!name || name === "—") {
    throw new AirtableFieldError(`${recordLabel} has missing ${fieldName}.`);
  }
  return name;
}

/** Multi-select or single-select names (catalog surfaces). */
export function selectNames(value: unknown): string[] {
  if (value == null || value === "") return [];
  if (!Array.isArray(value)) {
    const name = selectName(value, "");
    return name ? [name] : [];
  }
  return value
    .map((item) => selectName(item, ""))
    .filter(Boolean);
}

/**
 * Exact-one linked display name — only when a display token is intentionally
 * required (not for relational identity checks; use record IDs for those).
 */
export function requireExactlyOneLinkedDisplayName(
  value: unknown,
  fieldName: string,
  recordLabel = "Record",
): string {
  if (!Array.isArray(value)) {
    throw new AirtableFieldError(
      `${recordLabel} requires exactly one ${fieldName}; found 0.`,
    );
  }
  const names = value
    .map((entry) => {
      if (typeof entry === "string") {
        // Record ids are not display names.
        if (entry.startsWith("rec")) return "";
        return entry.trim();
      }
      if (typeof entry === "object" && entry !== null && "name" in entry) {
        return asText((entry as { name?: unknown }).name, "");
      }
      return "";
    })
    .filter(Boolean);
  if (names.length !== 1) {
    throw new AirtableFieldError(
      `${recordLabel} requires exactly one ${fieldName}; found ${names.length}.`,
    );
  }
  return names[0];
}

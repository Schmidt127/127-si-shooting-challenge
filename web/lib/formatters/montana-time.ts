/**
 * Canonical Montana display timezone for public UI timestamps.
 * Use America/Denver for conversion; always show the fixed label "MT"
 * (never locale MST/MDT short names).
 */

export const MONTANA_TIME_ZONE = "America/Denver";
export const MONTANA_TIME_ZONE_LABEL = "MT";

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Calendar day key (YYYY-MM-DD) in America/Denver. */
export function montanaDateKey(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: MONTANA_TIME_ZONE });
}

/** Add whole calendar days to a YYYY-MM-DD key without timezone drift. */
export function addCalendarDays(dateKey: string, days: number): string | null {
  const match = DATE_ONLY_RE.exec(dateKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format a date-only YYYY-MM-DD for display without shifting the calendar day.
 * Uses the UTC midnight of that key so America/Denver never moves the date back.
 */
export function formatMontanaDateOnly(dateKey: string | null | undefined): string | null {
  if (!dateKey) return null;
  const match = DATE_ONLY_RE.exec(String(dateKey).trim());
  if (!match) return null;
  const iso = `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type MontanaDateTimeParts = {
  month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
  day?: "numeric" | "2-digit";
  year?: "numeric" | "2-digit";
  weekday?: "long" | "short" | "narrow";
  hour?: "numeric" | "2-digit";
  minute?: "numeric" | "2-digit";
  hour12?: boolean;
};

/**
 * Format an instant in America/Denver and append the fixed "MT" label.
 * Does not use Intl timeZoneName (avoids MST/MDT).
 */
export function formatMontanaDateTime(
  iso: string | null | undefined,
  parts: MontanaDateTimeParts = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
): string | null {
  if (!iso || !String(iso).trim()) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const formatted = date.toLocaleString("en-US", {
    timeZone: MONTANA_TIME_ZONE,
    ...parts,
  });
  return `${formatted} ${MONTANA_TIME_ZONE_LABEL}`;
}

/**
 * Parent-friendly error copy for athlete dashboard surfaces.
 * Log diagnostic details server-side only — never expose Airtable internals,
 * record IDs, tokens, or query details to visitors.
 */

import { XpActivityLoadError } from "@/lib/data/xp-activity-loader";

const RECORD_ID_PATTERN = /\brec[a-zA-Z0-9]{14,}\b/g;
const AIRTABLE_TOKEN_PATTERN = /pat[a-zA-Z0-9._-]+/gi;

export const DASHBOARD_GENERIC_UNAVAILABLE =
  "We could not load this information right now. Please try again in a few minutes.";

export const DASHBOARD_PREVIEW_BLOCKED =
  "This preview is not available. Sign-in for athletes and staff tools are still being set up.";

export const DASHBOARD_PREVIEW_MISSING_ENROLLMENT =
  "This staff preview needs a valid enrollment reference before it can load.";

export const DASHBOARD_PREVIEW_MISSING_ENROLLMENT_DEV =
  "Add ?enrollmentId= to the URL with a DEV enrollment record id to load XP activity.";

/** Strip record ids and other sensitive fragments from arbitrary text. */
export function sanitizePublicText(value: string): string {
  return value
    .replace(RECORD_ID_PATTERN, "[redacted]")
    .replace(AIRTABLE_TOKEN_PATTERN, "[redacted]")
    .replace(/\bapp[a-zA-Z0-9]{14,}\b/g, "[redacted]");
}

/** Map loader failures to parent-safe copy; log the original error server-side. */
export function xpActivityPublicErrorMessage(error: unknown, context?: string): string {
  if (error instanceof XpActivityLoadError) {
    console.error("[xp-activity]", context ?? "load", sanitizePublicText(error.message), error);
    return DASHBOARD_GENERIC_UNAVAILABLE;
  }

  console.error("[xp-activity]", context ?? "load", error);
  return DASHBOARD_GENERIC_UNAVAILABLE;
}

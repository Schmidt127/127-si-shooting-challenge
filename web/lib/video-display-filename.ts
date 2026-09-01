/**
 * Parent/coach-facing video filename resolution (FUT-008 display wiring).
 *
 * Keep in sync with lib/video-display-filename/index.js and
 * communications/emails/lib/formatters.js (resolveVideoFileName).
 */

export const VIDEO_SUBMISSION_FALLBACK = "Video submission";

const EM_DASH = "—";

function trimValue(value: unknown): string {
  return String(value ?? "").trim();
}

function isPresentDisplayName(value: unknown): boolean {
  const trimmed = trimValue(value);
  return Boolean(trimmed && trimmed !== EM_DASH);
}

/** Resolved display name, or null when neither source is usable. */
export function resolveVideoDisplayFileName(
  customVideoFileName?: string | null,
  originalFileName?: string | null,
): string | null {
  if (isPresentDisplayName(customVideoFileName)) return trimValue(customVideoFileName);
  if (isPresentDisplayName(originalFileName)) return trimValue(originalFileName);
  return null;
}

/** Resolved display name with "Video submission" as the final fallback. */
export function resolveVideoDisplayFileNameWithFallback(
  customVideoFileName?: string | null,
  originalFileName?: string | null,
): string {
  return resolveVideoDisplayFileName(customVideoFileName, originalFileName) ?? VIDEO_SUBMISSION_FALLBACK;
}

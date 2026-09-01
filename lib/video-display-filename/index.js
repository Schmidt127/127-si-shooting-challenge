"use strict";

/**
 * Parent/coach-facing video filename resolution (FUT-008 display wiring).
 *
 * Precedence:
 * 1. Custom Video File Name (trimmed, nonblank, not em dash)
 * 2. Video Asset File Name / original upload name (same rules)
 * 3. Caller may apply "Video submission" via resolveVideoDisplayFileNameWithFallback
 *
 * Keep in sync with:
 * - web/lib/video-display-filename.ts
 * - communications/emails/lib/formatters.js (resolveVideoFileName)
 * - Airtable 072/073 inline copies (paste-deployed; parity-tested)
 */

const EM_DASH = "—";
const FALLBACK_LABEL = "Video submission";

function trimValue(value) {
  return String(value ?? "").trim();
}

function isPresentDisplayName(value) {
  const trimmed = trimValue(value);
  return Boolean(trimmed && trimmed !== EM_DASH);
}

/**
 * @param {unknown} customVideoFileName
 * @param {unknown} originalFileName Video Asset File Name or original upload name
 * @returns {string} Resolved display name, or "" when neither source is usable
 */
function resolveVideoDisplayFileName(customVideoFileName, originalFileName) {
  if (isPresentDisplayName(customVideoFileName)) return trimValue(customVideoFileName);
  if (isPresentDisplayName(originalFileName)) return trimValue(originalFileName);
  return "";
}

/**
 * @param {unknown} customVideoFileName
 * @param {unknown} originalFileName
 * @returns {string}
 */
function resolveVideoDisplayFileNameWithFallback(customVideoFileName, originalFileName) {
  return resolveVideoDisplayFileName(customVideoFileName, originalFileName) || FALLBACK_LABEL;
}

/**
 * Resolve a weekly/video submission row label.
 * Applies canonical filename precedence, then legacy `label` when no filename fields exist.
 *
 * @param {{ customVideoFileName?: unknown, originalFileName?: unknown, label?: unknown }} entry
 */
function resolveWeeklyVideoSubmissionLabel(entry = {}) {
  const resolved = resolveVideoDisplayFileName(entry.customVideoFileName, entry.originalFileName);
  if (resolved) return resolved;
  const legacy = String(entry.label ?? "").trim();
  if (legacy && legacy !== EM_DASH) return legacy;
  return FALLBACK_LABEL;
}

module.exports = {
  EM_DASH,
  FALLBACK_LABEL,
  isPresentDisplayName,
  resolveVideoDisplayFileName,
  resolveVideoDisplayFileNameWithFallback,
  resolveWeeklyVideoSubmissionLabel,
};

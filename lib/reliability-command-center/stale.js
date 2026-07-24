/**
 * Stale processing detection.
 */

"use strict";

/** Default thresholds in hours */
const DEFAULT_THRESHOLDS_HOURS = Object.freeze({
  processing: 6,
  awaitingAssets: 24,
  buildFlag: 12,
  levelRecalc: 12,
  makeHandoff: 6,
  uploadProcessing: 4,
});

/**
 * @param {unknown} timestamp
 * @returns {number|null} epoch ms
 */
function parseTimestampMs(timestamp) {
  if (timestamp == null || timestamp === "") return null;
  if (typeof timestamp === "number" && Number.isFinite(timestamp)) return timestamp;
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * @param {unknown} lastAttemptedAt
 * @param {{ nowMs?: number, thresholdHours?: number }} [opts]
 */
function isStale(lastAttemptedAt, opts = {}) {
  const thresholdHours =
    opts.thresholdHours != null
      ? opts.thresholdHours
      : DEFAULT_THRESHOLDS_HOURS.processing;
  const nowMs = opts.nowMs != null ? opts.nowMs : Date.now();
  const ms = parseTimestampMs(lastAttemptedAt);
  if (ms == null) {
    return {
      stale: false,
      reason: "missing_timestamp",
      ageHours: null,
      thresholdHours,
    };
  }
  const ageHours = (nowMs - ms) / (1000 * 60 * 60);
  const stale = ageHours >= thresholdHours;
  return {
    stale,
    reason: stale ? "exceeded_threshold" : "within_threshold",
    ageHours: Math.round(ageHours * 100) / 100,
    thresholdHours,
  };
}

/**
 * Stale when a processing flag is set and last touch exceeds threshold.
 * Missing timestamp while still processing is treated as stale (unknown age).
 *
 * @param {{
 *   isProcessing: boolean,
 *   lastAttemptedAt?: unknown,
 *   thresholdHours?: number,
 *   nowMs?: number,
 *   treatMissingTimestampAsStale?: boolean,
 * }} input
 */
function assessStaleProcessing(input = {}) {
  if (!input.isProcessing) {
    return { stale: false, reason: "not_processing", ageHours: null };
  }
  const check = isStale(input.lastAttemptedAt, {
    thresholdHours: input.thresholdHours,
    nowMs: input.nowMs,
  });
  if (check.reason === "missing_timestamp") {
    const treatMissing =
      input.treatMissingTimestampAsStale !== false; // default true
    return {
      stale: treatMissing,
      reason: treatMissing
        ? "processing_without_timestamp"
        : "processing_missing_timestamp_ignored",
      ageHours: null,
      thresholdHours: check.thresholdHours,
    };
  }
  return check;
}

module.exports = {
  DEFAULT_THRESHOLDS_HOURS,
  parseTimestampMs,
  isStale,
  assessStaleProcessing,
};

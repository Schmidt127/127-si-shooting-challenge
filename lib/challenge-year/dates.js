/**
 * America/Denver date helpers for challenge-year calendars.
 * Pure Node — no Airtable runtime.
 */

"use strict";

const DEFAULT_TIMEZONE = "America/Denver";

/**
 * @param {unknown} value
 * @param {string} [timeZone]
 * @returns {string} YYYY-MM-DD or ""
 */
function toDateKey(value, timeZone = DEFAULT_TIMEZONE) {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // US style M/D/YYYY or MM/DD/YYYY — do not use Date.parse alone.
    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
    if (us) {
      const mo = String(Number(us[1])).padStart(2, "0");
      const day = String(Number(us[2])).padStart(2, "0");
      return `${us[3]}-${mo}-${day}`;
    }
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const y = get("year");
  const mo = get("month");
  const day = get("day");
  if (!y || !mo || !day) return "";
  return `${y}-${mo}-${day}`;
}

/**
 * @param {string} dateKey YYYY-MM-DD
 * @returns {{ y: number, m: number, d: number } | null}
 */
function parseDateKey(dateKey) {
  const key = toDateKey(dateKey);
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

/**
 * UTC noon anchor so weekday math is stable across DST for calendar dates.
 * @param {string} dateKey
 * @returns {Date | null}
 */
function dateKeyToUtcNoon(dateKey) {
  const p = parseDateKey(dateKey);
  if (!p) return null;
  return new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0));
}

/**
 * @param {string} dateKey
 * @returns {number} 0=Sunday … 6=Saturday, or -1
 */
function weekdaySunday0(dateKey) {
  const d = dateKeyToUtcNoon(dateKey);
  if (!d) return -1;
  return d.getUTCDay();
}

/**
 * @param {string} dateKey
 * @param {number} days
 * @returns {string}
 */
function addDays(dateKey, days) {
  const d = dateKeyToUtcNoon(dateKey);
  if (!d) return "";
  d.setUTCDate(d.getUTCDate() + Number(days));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareDateKeys(a, b) {
  const ka = toDateKey(a);
  const kb = toDateKey(b);
  if (!ka && !kb) return 0;
  if (!ka) return -1;
  if (!kb) return 1;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/**
 * Inclusive range check.
 * @param {string} dateKey
 * @param {string} startKey
 * @param {string} endKey
 */
function isDateInRange(dateKey, startKey, endKey) {
  const d = toDateKey(dateKey);
  const s = toDateKey(startKey);
  const e = toDateKey(endKey);
  if (!d || !s || !e) return false;
  return compareDateKeys(d, s) >= 0 && compareDateKeys(d, e) <= 0;
}

/**
 * @param {string} startKey
 * @param {string} endKey
 */
function rangesOverlap(startA, endA, startB, endB) {
  const a0 = toDateKey(startA);
  const a1 = toDateKey(endA);
  const b0 = toDateKey(startB);
  const b1 = toDateKey(endB);
  if (!a0 || !a1 || !b0 || !b1) return false;
  return compareDateKeys(a0, b1) <= 0 && compareDateKeys(b0, a1) <= 0;
}

/**
 * Days between inclusive start and end (end - start in days).
 * @param {string} startKey
 * @param {string} endKey
 */
function daysBetween(startKey, endKey) {
  const a = dateKeyToUtcNoon(startKey);
  const b = dateKeyToUtcNoon(endKey);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

module.exports = {
  DEFAULT_TIMEZONE,
  toDateKey,
  parseDateKey,
  dateKeyToUtcNoon,
  weekdaySunday0,
  addDays,
  compareDateKeys,
  isDateInRange,
  rangesOverlap,
  daysBetween,
};

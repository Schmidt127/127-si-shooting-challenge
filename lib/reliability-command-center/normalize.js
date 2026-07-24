/**
 * Shared normalization helpers for Reliability Command Center.
 * Safe for Node audits and for reuse inside Airtable automation scripts
 * (copy or require via shared paste patterns — no live Airtable access here).
 */

"use strict";

/**
 * Normalize blank / empty values to empty string or null.
 * @param {unknown} value
 * @param {{ asNull?: boolean }} [opts]
 */
function normalizeBlank(value, opts = {}) {
  if (value === null || value === undefined) {
    return opts.asNull ? null : "";
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return opts.asNull ? null : "";
    return t;
  }
  if (Array.isArray(value) && value.length === 0) {
    return opts.asNull ? null : "";
  }
  return value;
}

/**
 * Flatten Airtable lookup / linked-record style arrays to string IDs or names.
 * Handles: ["rec…"], [{ id }], [{ name }], nested arrays, single values.
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeLookupArray(value) {
  if (value === null || value === undefined || value === "") return [];
  const list = Array.isArray(value) ? value : [value];
  const out = [];
  for (const item of list) {
    if (item === null || item === undefined || item === "") continue;
    if (typeof item === "string" || typeof item === "number") {
      const s = String(item).trim();
      if (s) out.push(s);
      continue;
    }
    if (Array.isArray(item)) {
      out.push(...normalizeLookupArray(item));
      continue;
    }
    if (typeof item === "object") {
      if (item.id != null && String(item.id).trim()) {
        out.push(String(item.id).trim());
      } else if (item.name != null && String(item.name).trim()) {
        out.push(String(item.name).trim());
      } else if (item.value != null && String(item.value).trim()) {
        out.push(String(item.value).trim());
      }
    }
  }
  return [...new Set(out)];
}

/**
 * First linked / lookup id or empty string.
 * @param {unknown} value
 */
function firstLinkedId(value) {
  const ids = normalizeLookupArray(value).filter((v) => /^rec[a-zA-Z0-9]{14}$/.test(v));
  return ids[0] || "";
}

/**
 * Interpret Airtable checkbox / booleanish values.
 * @param {unknown} value
 * @returns {boolean}
 */
function getBooleanish(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (!s) return false;
    if (["1", "true", "yes", "y", "checked", "on"].includes(s)) return true;
    if (["0", "false", "no", "n", "unchecked", "off"].includes(s)) return false;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    return getBooleanish(value[0]);
  }
  return Boolean(value);
}

/**
 * Single-select / status text (name from object or string).
 * @param {unknown} value
 * @returns {string}
 */
function getSelectText(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    return getSelectText(value[0]);
  }
  if (typeof value === "object") {
    if (value.name != null) return String(value.name).trim();
    if (value.value != null) return String(value.value).trim();
    if (value.id != null && !String(value.id).startsWith("sel")) {
      return String(value.id).trim();
    }
  }
  return "";
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function getNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return getNumber(value[0]);
  }
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Calendar date key YYYY-MM-DD when parseable.
 * @param {unknown} value
 * @param {string} [timeZone]
 */
function toDateKey(value, timeZone = "America/Denver") {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const mdY = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdY) {
      const mm = mdY[1].padStart(2, "0");
      const dd = mdY[2].padStart(2, "0");
      return `${mdY[3]}-${mm}-${dd}`;
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
 * Normalize sendMode to "test" | "live" | "".
 * @param {unknown} value
 */
function normalizeSendMode(value) {
  const s = getSelectText(value).toLowerCase();
  if (!s) return "";
  if (s === "test" || s === "t") return "test";
  if (s === "live" || s === "l" || s === "production" || s === "prod") return "live";
  return s;
}

/**
 * Fields map helper: read from record.fields or flat record.
 * @param {object} record
 * @param {string} fieldName
 */
function getField(record, fieldName) {
  if (!record || typeof record !== "object") return undefined;
  if (record.fields && typeof record.fields === "object" && fieldName in record.fields) {
    return record.fields[fieldName];
  }
  return record[fieldName];
}

/**
 * @param {object} record
 */
function getRecordId(record) {
  if (!record || typeof record !== "object") return "";
  const id = record.id || record.recordId || record.RecordId || "";
  return String(id || "").trim();
}

module.exports = {
  normalizeBlank,
  normalizeLookupArray,
  firstLinkedId,
  getBooleanish,
  getSelectText,
  getNumber,
  toDateKey,
  normalizeSendMode,
  getField,
  getRecordId,
};

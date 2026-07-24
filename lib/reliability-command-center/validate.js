/**
 * Validation helpers: record IDs, required fields, source/dedupe keys.
 */

"use strict";

const { normalizeBlank, normalizeLookupArray, getField, getRecordId } = require("./normalize");

const REC_ID_RE = /^rec[a-zA-Z0-9]{14}$/;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isRecId(value) {
  return typeof value === "string" && REC_ID_RE.test(value);
}

/**
 * @param {unknown} value
 * @returns {{ ok: boolean, ids: string[], invalid: string[] }}
 */
function validateLinkedIds(value) {
  const raw = normalizeLookupArray(value);
  const ids = [];
  const invalid = [];
  for (const item of raw) {
    if (isRecId(item)) ids.push(item);
    else invalid.push(item);
  }
  return { ok: invalid.length === 0 && ids.length > 0, ids, invalid };
}

/**
 * @param {object} record
 * @param {string[]} fieldNames
 * @returns {{ ok: boolean, missing: string[] }}
 */
function validateRequiredFields(record, fieldNames = []) {
  const missing = [];
  for (const name of fieldNames) {
    const v = getField(record, name);
    if (v === null || v === undefined) {
      missing.push(name);
      continue;
    }
    if (typeof v === "string" && !v.trim()) {
      missing.push(name);
      continue;
    }
    if (Array.isArray(v) && v.length === 0) {
      missing.push(name);
    }
  }
  return { ok: missing.length === 0, missing };
}

/**
 * Source Key shape: PREFIX|parts… (non-empty segments preferred).
 * @param {unknown} value
 * @param {{ requirePrefix?: string, minParts?: number }} [opts]
 */
function validateSourceKey(value, opts = {}) {
  const key = String(normalizeBlank(value) || "").trim();
  if (!key) {
    return { ok: false, key: "", reason: "blank_source_key" };
  }
  const parts = key.split("|");
  if (opts.requirePrefix && parts[0] !== opts.requirePrefix) {
    return {
      ok: false,
      key,
      reason: `prefix_mismatch_expected_${opts.requirePrefix}`,
    };
  }
  const minParts = opts.minParts != null ? opts.minParts : 2;
  if (parts.length < minParts) {
    return { ok: false, key, reason: "too_few_parts" };
  }
  if (parts.some((p) => !String(p).trim())) {
    return { ok: false, key, reason: "empty_segment" };
  }
  return { ok: true, key, reason: "ok", parts };
}

/**
 * @param {unknown} value
 */
function validateDedupeKey(value) {
  const key = String(normalizeBlank(value) || "").trim();
  if (!key) return { ok: false, key: "", reason: "blank_dedupe_key" };
  return { ok: true, key, reason: "ok" };
}

/**
 * Group records by a key extractor; return groups with count > 1.
 * @param {object[]} records
 * @param {(r: object) => string} keyFn
 */
function findDuplicateGroups(records, keyFn) {
  /** @type {Map<string, object[]>} */
  const map = new Map();
  for (const r of records || []) {
    const key = String(keyFn(r) || "").trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  const duplicates = [];
  for (const [key, group] of map.entries()) {
    if (group.length > 1) {
      duplicates.push({
        key,
        count: group.length,
        recordIds: group.map((g) => getRecordId(g)).filter(Boolean),
        records: group,
      });
    }
  }
  return duplicates;
}

module.exports = {
  REC_ID_RE,
  isRecId,
  validateLinkedIds,
  validateRequiredFields,
  validateSourceKey,
  validateDedupeKey,
  findDuplicateGroups,
};

/**
 * FUT-009 / FUT-010 — Storage Key format validation (dual-prefix grandfathering).
 *
 * Accepts:
 * - Gen A / Option D: shooting-challenge/{Athlete}/{Program}/{YYYY-MM-DD}/{basename}
 * - Gen B (live Lambda): {Athlete}/{Program}/{YYYY-MM-DD}/{UTC}_{Slot}_{recId}_{original}
 * - FUT-007 basename segment on either prefix shape
 *
 * Authority: docs/next-wave/aws-media/FUT-007-S3-NAMING-CONTRACT-BRIEF.md
 */

"use strict";

/** Approved Option D layout prefix (Mike decision 2026-09-01). */
const FUT009_LAYOUT_PREFIX = "shooting-challenge";

/** FUT-007 basename filename segment (no record id). */
const FUT007_BASENAME_RE =
  /^\d{8}_(HW|VIDEO|HEADSHOT)_[A-Za-z0-9]+_[A-Za-z0-9]+_[A-Za-z0-9]+(_\d+)?\.[a-z0-9]+$/;

/** Gen B legacy filename segment (UTC stamp + slot + recId + original). */
const GEN_B_FILENAME_RE =
  /^\d{8}T\d{6}Z_[A-Za-z0-9]+_rec[a-zA-Z0-9]{14}_[\w.\-]+$/;

/**
 * @param {string} key
 * @returns {boolean}
 */
function isPathSafeStorageKey(key) {
  const text = String(key || "").trim();
  if (!text || text.startsWith("/") || text.startsWith("\\") || text.includes("\\")) {
    return false;
  }
  if (text.includes("..") || text.includes("\0")) {
    return false;
  }
  const parts = text.split("/");
  if (parts.length < 4) {
    return false;
  }
  return parts.every((part) => part && part !== "." && part !== "..");
}

/**
 * @param {string} key
 * @returns {string[]|null}
 */
function storageKeyParts(key) {
  if (!isPathSafeStorageKey(key)) {
    return null;
  }
  return String(key).trim().split("/");
}

/**
 * @param {string} key
 * @returns {boolean}
 */
function hasFut009LayoutPrefix(key) {
  return String(key || "")
    .trim()
    .startsWith(`${FUT009_LAYOUT_PREFIX}/`);
}

/**
 * @param {string} key
 * @returns {"gen_a"|"gen_b"|"fut007"|"invalid"}
 */
function classifyStorageKeyGeneration(key) {
  const parts = storageKeyParts(key);
  if (!parts) {
    return "invalid";
  }

  const basename = parts[parts.length - 1] || "";
  if (FUT007_BASENAME_RE.test(basename)) {
    return "fut007";
  }
  if (GEN_B_FILENAME_RE.test(basename)) {
    return "gen_b";
  }
  if (hasFut009LayoutPrefix(key)) {
    return "gen_a";
  }
  return "invalid";
}

/**
 * Dual-prefix verification regex for FUT-010 / FUT-040 gates.
 * @param {string} key
 * @returns {boolean}
 */
function isValidStorageKeyFormat(key) {
  const parts = storageKeyParts(key);
  if (!parts) {
    return false;
  }

  if (hasFut009LayoutPrefix(key)) {
    // Gen A legacy paths under shooting-challenge/ (season-first, test fixtures, etc.)
    if (parts.length >= 3) {
      return true;
    }
    return false;
  }

  if (parts.length < 4) {
    return false;
  }
  const dateFolder = parts[parts.length - 2];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFolder)) {
    return false;
  }

  const basename = parts[parts.length - 1] || "";
  return FUT007_BASENAME_RE.test(basename) || GEN_B_FILENAME_RE.test(basename);
}

/**
 * @param {string} key
 * @returns {string}
 */
function extractBasenameFromKey(key) {
  const parts = storageKeyParts(key);
  if (!parts) {
    return "";
  }
  return parts[parts.length - 1] || "";
}

/**
 * Strip Option D layout prefix when present.
 * @param {string} key
 * @returns {string}
 */
function stripLayoutPrefix(key) {
  const text = String(key || "").trim();
  const prefix = `${FUT009_LAYOUT_PREFIX}/`;
  if (text.startsWith(prefix)) {
    return text.slice(prefix.length);
  }
  return text;
}

/**
 * Prepend approved Option D prefix unless already present.
 * @param {string} relativeKey
 * @returns {string}
 */
function prependLayoutPrefix(relativeKey) {
  const trimmed = String(relativeKey || "")
    .trim()
    .replace(/^\/+/, "");
  if (!trimmed) {
    return `${FUT009_LAYOUT_PREFIX}/upload.bin`;
  }
  if (trimmed.startsWith(`${FUT009_LAYOUT_PREFIX}/`)) {
    return trimmed;
  }
  return `${FUT009_LAYOUT_PREFIX}/${trimmed}`;
}

module.exports = {
  FUT009_LAYOUT_PREFIX,
  FUT007_BASENAME_RE,
  GEN_B_FILENAME_RE,
  classifyStorageKeyGeneration,
  extractBasenameFromKey,
  hasFut009LayoutPrefix,
  isPathSafeStorageKey,
  isValidStorageKeyFormat,
  prependLayoutPrefix,
  storageKeyParts,
  stripLayoutPrefix,
};

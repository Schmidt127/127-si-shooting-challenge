/**
 * Canonical Week key helpers.
 *
 * Product calendar (2026-08-08):
 * - Early Bird is the full Sunday-Saturday period ending on the May 1 program start.
 * - Numbered challenge Weeks begin the following Sunday.
 * - The final numbered Week may truncate at the hard June 30 program end.
 * - Post-Challenge is a calendar period, not required to have Sunday-Saturday geometry.
 */

"use strict";

const { normalizeSchoolYear } = require("../config-selection");
const { toDateKey, weekdaySunday0 } = require("./dates");

const WEEK_LABEL_RE = /^Week\s+(\d+)$/i;
const POST_CHALLENGE_LABELS = new Set(["post-challenge", "post challenge"]);
const WEEK_ZERO_LABELS = new Set(["week 0", "week0", "early bird"]);

function buildCanonicalWeekKey(challengeYear, displayLabel) {
  const year = normalizeSchoolYear(challengeYear);
  if (!year.ok) return { ok: false, code: year.code, message: year.message };
  const label = String(displayLabel || "").trim();
  if (!label) {
    return { ok: false, code: "blank_week_label", message: "Week display label is blank." };
  }
  return {
    ok: true,
    weekKey: `${year.key}|${label}`,
    challengeYear: year.key,
    displayLabel: label,
  };
}

function parseCanonicalWeekKey(raw) {
  const text = String(raw || "").trim();
  if (!text) return { ok: false, code: "blank_week_key", message: "Week key is blank." };
  if (/^rec[a-zA-Z0-9]{14}$/.test(text)) {
    return {
      ok: false,
      code: "record_id_week_key",
      message: "Value looks like an Airtable record id. Canonical Week Key is {challengeYear}|{label}.",
    };
  }
  const pipe = text.indexOf("|");
  if (pipe <= 0 || pipe === text.length - 1) {
    return {
      ok: false,
      code: "malformed_week_key",
      message: `Week key is malformed: "${text}". Expected {YYYY-YYYY}|{label}.`,
    };
  }
  const year = normalizeSchoolYear(text.slice(0, pipe));
  if (!year.ok) return { ok: false, code: year.code, message: year.message };
  const label = text.slice(pipe + 1).trim();
  if (!label) return { ok: false, code: "blank_week_label", message: "Week label portion is blank." };
  return { ok: true, weekKey: `${year.key}|${label}`, challengeYear: year.key, displayLabel: label };
}

function buildWeekEndKey(endDate, timeZone = "America/Denver") {
  const key = toDateKey(endDate, timeZone);
  if (!key) {
    return {
      ok: false,
      code: "malformed_week_end_key",
      message: "Could not derive Week End Key (YYYY-MM-DD) from End Date.",
    };
  }
  return { ok: true, weekEndKey: key };
}

function classifyWeekType(displayLabel, explicitType) {
  const explicit = String(explicitType || "").trim().toLowerCase();
  if (explicit) {
    if (["week_0", "week0", "early_bird", "early bird"].includes(explicit)) return "week_0";
    if (["regular", "challenge", "final"].includes(explicit)) return "regular";
    if (["post_challenge", "post-challenge"].includes(explicit)) return "post_challenge";
    return explicit;
  }

  const label = String(displayLabel || "").trim();
  const lower = label.toLowerCase();
  if (WEEK_ZERO_LABELS.has(lower) || /^week\s*0$/i.test(label)) return "week_0";
  if (POST_CHALLENGE_LABELS.has(lower)) return "post_challenge";
  if (WEEK_LABEL_RE.test(label)) return "regular";
  return "unknown";
}

function weekOrdinal(displayLabel, weekType) {
  const type = weekType || classifyWeekType(displayLabel);
  if (type === "post_challenge") return null;
  const label = String(displayLabel || "").trim();
  const m = WEEK_LABEL_RE.exec(label);
  if (m) return Number(m[1]);
  if (type === "week_0") return 0;
  return null;
}

function expectedDisplayLabel(weekType, ordinal) {
  if (weekType === "week_0") return "Early Bird";
  if (weekType === "post_challenge") return "Post-Challenge";
  return `Week ${ordinal}`;
}

function validateSundaySaturday(startKey, endKey) {
  const findings = [];
  const startDow = weekdaySunday0(startKey);
  const endDow = weekdaySunday0(endKey);
  if (startDow !== 0) {
    findings.push({
      severity: "FAIL",
      code: "start_not_sunday",
      message: `Start Date ${startKey} is not Sunday (dow=${startDow}).`,
    });
  }
  if (endDow !== 6) {
    findings.push({
      severity: "FAIL",
      code: "end_not_saturday",
      message: `End Date ${endKey} is not Saturday (dow=${endDow}).`,
    });
  }
  return findings;
}

module.exports = {
  buildCanonicalWeekKey,
  parseCanonicalWeekKey,
  buildWeekEndKey,
  classifyWeekType,
  weekOrdinal,
  expectedDisplayLabel,
  validateSundaySaturday,
  WEEK_LABEL_RE,
};

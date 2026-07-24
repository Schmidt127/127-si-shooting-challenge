/**
 * Season-sensitive automation inventory + hard-coded year/Config detection.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_AUTOMATIONS_DIR = path.join(
  __dirname,
  "..",
  "..",
  "airtable",
  "automations",
  "shooting-challenge"
);

/** Season-sensitive automations to inspect for launch. */
const SEASON_SENSITIVE_AUTOMATIONS = Object.freeze([
  { number: "001", name: "Enrollment intake find/create athlete", readsConfig: false, readsWeek: false, activityDate: false, notes: "Creates Athlete/Enrollment; School Year from intake" },
  { number: "002", name: "Assign Grade Band initial", readsConfig: false, readsWeek: false, activityDate: false },
  { number: "003", name: "Assign Grade Band on grade change", readsConfig: false, readsWeek: false, activityDate: false },
  { number: "005", name: "Assign Week to Submission — Homework First", readsConfig: false, readsWeek: true, activityDate: true, notes: "Activity Date fallback to Weeks date range; multi-match throws" },
  { number: "010", name: "Submission Base XP", readsConfig: true, readsWeek: true, activityDate: true, notes: "XP via Enrollment; year via Enrollment/Week links" },
  { number: "013", name: "Create/link Video Feedback", readsConfig: false, readsWeek: false, activityDate: false },
  { number: "020", name: "Homework Completion path", readsConfig: false, readsWeek: true, activityDate: false },
  { number: "031", name: "Find/create WAS from submission", readsConfig: false, readsWeek: true, activityDate: false, notes: "Summary Key Enrollment|Week" },
  { number: "034", name: "Previous-week helpers", readsConfig: false, readsWeek: true, activityDate: false },
  { number: "041", name: "Level Recalc Needed", readsConfig: false, readsWeek: false, activityDate: false },
  { number: "042", name: "Level assignment", readsConfig: true, readsWeek: false, activityDate: false, notes: "May use year-aware Config selection" },
  { number: "053", name: "Streak occurrences", readsConfig: false, readsWeek: true, activityDate: true },
  { number: "054", name: "Streak XP", readsConfig: true, readsWeek: true, activityDate: false },
  { number: "057", name: "Perfect Week helpers", readsConfig: true, readsWeek: true, activityDate: false },
  { number: "058", name: "Perfect Week unlock", readsConfig: false, readsWeek: true, activityDate: false },
  { number: "059", name: "Achievement Unlock → XP", readsConfig: true, readsWeek: true, activityDate: false },
  { number: "066", name: "Shot milestones", readsConfig: true, readsWeek: true, activityDate: false },
  { number: "072", name: "Build weekly email package", readsConfig: false, readsWeek: true, activityDate: false },
  { number: "074", name: "Send weekly email to Make", readsConfig: false, readsWeek: true, activityDate: false, notes: "sendMode Live required in PROD" },
  { number: "101", name: "Zoom attendance WAS/XP", readsConfig: false, readsWeek: true, activityDate: false },
  { number: "114", name: "Video XP", readsConfig: true, readsWeek: true, activityDate: false },
  { number: "118", name: "Schedule weekly summary email build", readsConfig: false, readsWeek: true, activityDate: false, notes: "Prior Saturday Week End; schedules ON verified 2026-07-24" },
  { number: "119", name: "Schedule weekly summary email send", readsConfig: false, readsWeek: true, activityDate: false, notes: "Schedules ON verified 2026-07-24" },
]);

const YEAR_RE = /\b(20\d{2})[-–—](20\d{2})\b/g;
// Airtable record ids: rec + 14 [A-Za-z0-9], must include a digit (avoids vars like recordingZaToMark).
const REC_RE = /\brec(?=[a-zA-Z0-9]{14}\b)(?=[a-zA-Z]*\d)[a-zA-Z0-9]{14}\b/g;

/**
 * @param {string} text
 * @param {object} options
 */
function stripComments(text) {
  return String(text || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

function scanScriptText(text, options = {}) {
  const allowYears = new Set(options.allowYears || []);
  const allowRecIds = new Set(options.allowRecIds || []);
  const findings = [];
  // Docblocks/comments often mention seasons; scan executable-ish text by default.
  const scanText = options.includeComments ? String(text || "") : stripComments(text);

  const years = new Set();
  let m;
  const yearRe = new RegExp(YEAR_RE.source, "g");
  while ((m = yearRe.exec(scanText))) {
    const start = Number(m[1]);
    const end = Number(m[2]);
    if (end !== start + 1) continue; // ignore non school-year pairs
    const key = `${m[1]}-${m[2]}`;
    years.add(key);
  }
  for (const year of years) {
    if (allowYears.has(year)) continue;
    findings.push({
      severity: "FAIL",
      code: "hardcoded_year_label",
      message: `Hard-coded challenge-year label "${year}"`,
      year,
    });
  }

  const recs = new Set();
  const recRe = new RegExp(REC_RE.source, "g");
  while ((m = recRe.exec(scanText))) {
    recs.add(m[0]);
  }
  const staleConfigIds = new Set(options.staleConfigIds || []);
  for (const id of recs) {
    if (allowRecIds.has(id)) continue;
    if (staleConfigIds.has(id)) {
      findings.push({
        severity: "FAIL",
        code: "hardcoded_config_record_id",
        message: `Hard-coded stale Config record id "${id}"`,
        recordId: id,
      });
      continue;
    }
    // Generic rec… literals are common in comments/examples — warn only.
    findings.push({
      severity: "WARNING",
      code: "hardcoded_record_id_literal",
      message: `Hard-coded record id literal "${id}" (review if season-specific)`,
      recordId: id,
    });
  }

  return {
    years: [...years],
    recordIds: [...recs],
    findings,
  };
}

function listAutomationFiles(dir = DEFAULT_AUTOMATIONS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}-.*\.js$/.test(f) || /^\d{3}[a-z]-.*\.js$/.test(f))
    .map((f) => path.join(dir, f));
}

function fileForNumber(number, dir = DEFAULT_AUTOMATIONS_DIR) {
  const files = listAutomationFiles(dir);
  const prefix = `${number}-`;
  return files.find((f) => path.basename(f).startsWith(prefix)) || null;
}

/**
 * Audit season-sensitive automations on disk.
 */
function auditSeasonSensitiveAutomations(options = {}) {
  const dir = options.automationsDir || DEFAULT_AUTOMATIONS_DIR;
  const allowYears = new Set([
    ...(options.allowYears || []),
    // Docblock/historical examples commonly reference these in comments — still report unless allowlisted per file
  ]);
  const allowRecIds = new Set(options.allowRecIds || []);
  const allowlistByFile = options.allowlistByFile || {};

  const results = [];
  for (const meta of SEASON_SENSITIVE_AUTOMATIONS) {
    const file = fileForNumber(meta.number, dir);
    const entry = {
      ...meta,
      file: file ? path.basename(file) : null,
      present: Boolean(file),
      scan: null,
      requiresProductionUpdate: true,
      verificationProcedure: `Dry-run/fixture: confirm ${meta.name} resolves ${meta.readsWeek ? "Week" : "no Week"} ${meta.activityDate ? "via Activity Date" : ""} for target challenge year; no historical selection.`,
    };
    if (!file) {
      entry.findings = [
        {
          severity: "WARNING",
          code: "automation_file_missing",
          message: `No file found for automation ${meta.number}`,
        },
      ];
      results.push(entry);
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    const fileAllow = allowlistByFile[path.basename(file)] || {};
    const scan = scanScriptText(text, {
      allowYears: [...allowYears, ...(fileAllow.years || [])],
      allowRecIds: [...allowRecIds, ...(fileAllow.recordIds || [])],
    });
    entry.scan = { years: scan.years, recordIds: scan.recordIds };
    entry.findings = scan.findings;
    entry.canSelectHistorical =
      meta.readsWeek || meta.activityDate
        ? "Possible if Week/Enrollment filters omit year — verify current-year views"
        : "Low if Enrollment-scoped only";
    entry.hasTestOnlyInputs = /dryRun|includeSchmidt|sendMode|testSeason/i.test(text);
    results.push(entry);
  }

  const findings = results.flatMap((r) =>
    (r.findings || []).map((f) => ({ ...f, automation: r.number, file: r.file }))
  );
  const overall = findings.some((f) => f.severity === "FAIL")
    ? "FAIL"
    : findings.some((f) => f.severity === "WARNING")
      ? "PASS WITH WARNINGS"
      : "PASS";

  return {
    overall,
    automations: results,
    findings,
    inventory: SEASON_SENSITIVE_AUTOMATIONS,
  };
}

/**
 * Test helper: scan a single script string with allowlists.
 */
function detectDisallowedHardcodes(text, options = {}) {
  return scanScriptText(text, options);
}

module.exports = {
  SEASON_SENSITIVE_AUTOMATIONS,
  scanScriptText,
  detectDisallowedHardcodes,
  auditSeasonSensitiveAutomations,
  listAutomationFiles,
  fileForNumber,
  DEFAULT_AUTOMATIONS_DIR,
};

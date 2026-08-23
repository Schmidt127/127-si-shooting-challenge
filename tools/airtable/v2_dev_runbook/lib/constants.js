"use strict";

const path = require("path");

const DEV_BASE_ID = "appTetnuCZlCZdTCT";
const PROD_BASE_ID = "appn84sqPw03zEbTT";

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../../..");
const CLASSIFICATION_PATH = path.join(PACKAGE_ROOT, "matrix-classification.json");
const FIXTURES_DIR = path.join(PACKAGE_ROOT, "fixtures");
/** Overridable for tests via V2_DEV_RUNBOOK_STATE_DIR / V2_DEV_RUNBOOK_EVIDENCE_ROOT */
function getRunStateDir() {
  return (
    process.env.V2_DEV_RUNBOOK_STATE_DIR || path.join(PACKAGE_ROOT, ".run-state")
  );
}

function getEvidenceRoot() {
  return (
    process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT ||
    path.join(REPO_ROOT, "docs/v2/evidence/dev-runs")
  );
}

/** Defaults at load time (prefer getRunStateDir/getEvidenceRoot in new code). */
const RUN_STATE_DIR = getRunStateDir();
const EVIDENCE_ROOT = getEvidenceRoot();

/**
 * Live CLI support (no Make/email/M1/M2).
 * Wave 1: A3 B1 B2 F1–F3
 * Wave 2: C4 D3 G3 H2 J1 J4 J5 L1 L2
 */
const SUPPORTED_LIVE_TESTS = Object.freeze([
  "A3",
  "B1",
  "B2",
  "C4",
  "D3",
  "F1",
  "F2",
  "F3",
  "G3",
  "H2",
  "J1",
  "J4",
  "J5",
  "L1",
  "L2",
]);

const REQUIRED_TABLES = Object.freeze([
  "Enrollments",
  "Submissions",
  "Weeks",
  "XP Events",
  "Achievement Unlocks",
  "Homework Completions",
  "Video Feedback",
  "Weekly Athlete Summary",
  "Zoom Meetings",
]);

/** Minimal field checks used by verify-env (names only). */
const REQUIRED_FIELDS = Object.freeze({
  Enrollments: ["Enrollment Name"],
  Submissions: ["Shot Total", "Count This Submission?"],
  "XP Events": ["Source Key"],
  "Homework Completions": ["Satisfactory?"],
  "Video Feedback": ["Ready for XP Automation?"],
});

const TEST_ID_RE = /^[A-Z]\d{1,2}$/;

module.exports = {
  DEV_BASE_ID,
  PROD_BASE_ID,
  PACKAGE_ROOT,
  REPO_ROOT,
  CLASSIFICATION_PATH,
  FIXTURES_DIR,
  RUN_STATE_DIR,
  EVIDENCE_ROOT,
  getRunStateDir,
  getEvidenceRoot,
  SUPPORTED_LIVE_TESTS,
  REQUIRED_TABLES,
  REQUIRED_FIELDS,
  TEST_ID_RE,
};

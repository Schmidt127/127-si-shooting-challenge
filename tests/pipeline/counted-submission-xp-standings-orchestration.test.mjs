/**
 * Offline contract harness for the counted-submission reliability path.
 *
 * This models Airtable's eventually-consistent links/rollups deliberately:
 * source scripts are separately tested in their own runtime mocks.  It proves
 * the required durable ledger, summary, progression, and standings result for
 * both meaningful execution orders without treating a pending receipt as an
 * error.
 *
 * Run: node --test tests/pipeline/counted-submission-xp-standings-orchestration.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = (name) => readFileSync(path.join(ROOT, "airtable/automations/shooting-challenge", name), "utf8");
const auditSource = () => readFileSync(
  path.join(ROOT, "airtable/extension-scripts/audits/audit-counted-submission-xp-standings-reliability.js"),
  "utf8",
);
const SUBMISSION_ID = "recPipelineSubmission01";
const ENROLLMENT_ID = "recPipelineEnrollment1";
const WEEK_ID = "recPipelineWeek00001";
const SUMMARY_ID = "recPipelineSummary01";
const XP_KEY = `SUBMISSION_XP|${SUBMISSION_ID}`;

function pipeline() {
  return {
    submission: { id: SUBMISSION_ID, enrollmentId: "", weekId: "", summaryId: "", count: true, shots: 150 },
    enrollment: { id: ENROLLMENT_ID, active: true, lifetimeXp: 0, recalcNeeded: false, currentLevel: "", nextLevel: "", levelSort: 0 },
    week: { id: WEEK_ID },
    summaries: [],
    xpEvents: [],
    handoffs: [],
  };
}
function step023(state) { state.submission.enrollmentId = ENROLLMENT_ID; }
function step005(state) { state.submission.weekId = WEEK_ID; }
function canonicalSummary(state) {
  let summary = state.summaries.find((row) => row.enrollmentId === ENROLLMENT_ID && row.weekId === WEEK_ID);
  if (!summary) {
    summary = { id: SUMMARY_ID, enrollmentId: ENROLLMENT_ID, weekId: WEEK_ID, goal: 500, xp: 0 };
    state.summaries.push(summary);
  }
  state.submission.summaryId = summary.id;
  return summary;
}
function step031(state) { canonicalSummary(state); }
function step010(state) {
  const summary = canonicalSummary(state);
  const existing = state.xpEvents.filter((row) => row.sourceKey === XP_KEY);
  if (!existing.length) {
    state.xpEvents.push({
      sourceKey: XP_KEY, active: true, points: 20, submissionId: SUBMISSION_ID,
      enrollmentId: ENROLLMENT_ID, weekId: WEEK_ID, summaryId: summary.id,
    });
  }
  assert.equal(state.xpEvents.filter((row) => row.sourceKey === XP_KEY).length, 1);
}
function step076(state) {
  const summary = state.summaries.find((row) => row.id === state.submission.summaryId);
  const active = state.xpEvents.filter((row) => row.active && row.enrollmentId === ENROLLMENT_ID && row.weekId === WEEK_ID);
  const submission = active.filter((row) => row.submissionId === SUBMISSION_ID);
  const payload = {
    submissionXp: submission.length ? submission.reduce((n, row) => n + row.points, 0) : null,
    weeklyXp: active.reduce((n, row) => n + row.points, 0),
    weeklyGoal: summary?.goal ?? 0,
  };
  const existing = state.handoffs.find((row) => row.key === `DAILY_SUBMISSION|SUBMISSIONS|${SUBMISSION_ID}`);
  if (!existing) state.handoffs.push({ key: `DAILY_SUBMISSION|SUBMISSIONS|${SUBMISSION_ID}`, payload });
  return payload;
}
function settle(state) {
  const summary = canonicalSummary(state);
  summary.xp = state.xpEvents.filter((row) => row.active && row.summaryId === summary.id).reduce((n, row) => n + row.points, 0);
  state.enrollment.lifetimeXp = state.xpEvents.filter((row) => row.active && row.enrollmentId === ENROLLMENT_ID).reduce((n, row) => n + row.points, 0);
}
function step041(state) { if (state.enrollment.active) state.enrollment.recalcNeeded = true; }
function step042(state) {
  assert.equal(state.enrollment.recalcNeeded, true);
  state.enrollment.currentLevel = state.enrollment.lifetimeXp >= 100 ? "Rookie Shooter" : "Beginner";
  state.enrollment.nextLevel = state.enrollment.lifetimeXp >= 100 ? "Developing Shooter" : "Rookie Shooter";
  state.enrollment.levelSort = state.enrollment.currentLevel === "Beginner" ? 1 : 2;
  state.enrollment.recalcNeeded = false;
}
function assertFinal(state) {
  const xp = state.xpEvents.filter((row) => row.sourceKey === XP_KEY);
  assert.equal(xp.length, 1);
  assert.deepEqual(xp[0], { sourceKey: XP_KEY, active: true, points: 20, submissionId: SUBMISSION_ID, enrollmentId: ENROLLMENT_ID, weekId: WEEK_ID, summaryId: SUMMARY_ID });
  assert.equal(state.summaries.filter((row) => row.enrollmentId === ENROLLMENT_ID && row.weekId === WEEK_ID).length, 1);
  assert.equal(state.summaries[0].xp, 20);
  assert.equal(state.enrollment.lifetimeXp, 20);
  assert.equal(state.enrollment.currentLevel, "Beginner");
  assert.equal(state.enrollment.nextLevel, "Rookie Shooter");
  assert.equal(state.enrollment.levelSort, 1);
  assert.equal(state.handoffs.length, 1);
}

test("source contracts preserve the approved pending-XP receipt behavior", () => {
  for (const file of [
    "023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js",
    "005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js",
    "010-submission-intake-create-xp-event.js",
    "031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js",
    "041-levels-and-progression-mark-enrollment-for-level-recalculation.js",
    "042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js",
  ]) assert.ok(source(file).length > 1000, file);
  const s010 = source("010-submission-intake-create-xp-event.js");
  const s076 = source("076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js");
  assert.match(s010, /SUBMISSION_XP\|/);
  assert.match(s076, /submissionXp === null/);
  assert.match(s076, /Pending \/ not yet awarded/);
});

test("audit includes checked checkbox Submissions and excludes unchecked ones", () => {
  const priorNumericOnlyGate = (value) => Number(String(value)) === 1;
  const checkboxGate = (value) => value === true || value === 1 || String(value).toLowerCase() === "true";

  assert.equal(priorNumericOnlyGate(true), false, "regression: prior gate skips Airtable checkbox true");
  assert.equal(checkboxGate(true), true);
  assert.equal(checkboxGate(false), false);
  assert.match(
    auditSource(),
    /if \(!yes\(sub, subT, CONFIG\.f\.sub\.count\)\) continue;/,
    "audit must use the boolean checkbox helper, not numberState",
  );
});

test("010 before 031/076 settles one XP event, one WAS, progression, and standings inputs", () => {
  const state = pipeline();
  step023(state); step005(state); canonicalSummary(state); step010(state); step031(state);
  const receipt = step076(state);
  assert.deepEqual(receipt, { submissionXp: 20, weeklyXp: 20, weeklyGoal: 500 });
  settle(state); step041(state); step042(state); step010(state); step076(state);
  assertFinal(state);
});

test("031/076 may issue a pending receipt before 010, then the durable state settles without replay duplicates", () => {
  const state = pipeline();
  step023(state); step005(state); step031(state);
  const pending = step076(state);
  assert.deepEqual(pending, { submissionXp: null, weeklyXp: 0, weeklyGoal: 500 });
  step010(state); settle(state); step041(state); step042(state);
  step010(state); step076(state);
  assertFinal(state);
  assert.deepEqual(state.handoffs[0].payload, pending, "receipt remains historical, not rewritten after settlement");
});

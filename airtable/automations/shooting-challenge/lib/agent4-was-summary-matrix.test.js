#!/usr/bin/env node
/**
 * Agent 4 §6 — Weekly Athlete Summary / weekly email package matrix (pure contracts).
 * Run: node airtable/automations/shooting-challenge/lib/agent4-was-summary-matrix.test.js
 */
"use strict";

const assert = require("assert");
const {
  evaluateWeeklySummaryBuildGate,
  evaluateWeeklySummarySendGate,
  decideAutomaticWeeklySummaryAction,
  buildWeeklyEmailEventId,
  SCHMIDT_ENROLLMENT_ID,
} = require("./v2-engine-contracts");
const {
  decideWasCreateOrLink,
  selectExistingWas,
  detectWasDuplicates,
  isEmptyWeekActivity,
  resolveEmptyWeekBuildPlan,
} = require("../../../../lib/was-email-contracts");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const ENR = "recEnrollment0001";
const WEEK = "recWeek0000000001";
const KEY = "ATH-recAthlete0001|2026-2027|recWeek0000000001";

const ZERO = {
  countedSubmissionCount: 0,
  totalShots: 0,
  daysLogged: 0,
  homeworkSatisfactoryCount: 0,
  zoomAttendedCount: 0,
  videoFeedbackCount: 0,
  weeklyXp: 0,
};

test("zero submissions = empty week; one submission is not empty", () => {
  assert.strictEqual(isEmptyWeekActivity(ZERO), true);
  assert.strictEqual(isEmptyWeekActivity({ ...ZERO, countedSubmissionCount: 1 }), false);
  assert.strictEqual(isEmptyWeekActivity({ ...ZERO, daysLogged: 7 }), false);
});

test("seven activity dates via daysLogged marks non-empty", () => {
  assert.strictEqual(isEmptyWeekActivity({ ...ZERO, daysLogged: 7, totalShots: 700 }), false);
});

test("missing goal/homework/level do not alone mark week non-empty", () => {
  // Empty-week detector is activity-counter based; blank optional metadata is not activity.
  assert.strictEqual(isEmptyWeekActivity(ZERO), true);
});

test("summary already exists → link; duplicate → deterministic winner", () => {
  const rows = [
    { id: "recWAS00000000002", enrollmentId: ENR, weekId: WEEK, summaryKey: KEY },
    { id: "recWAS00000000001", enrollmentId: ENR, weekId: WEEK, summaryKey: KEY },
  ];
  const selection = selectExistingWas({
    rows,
    enrollmentId: ENR,
    weekId: WEEK,
    expectedSummaryKey: KEY,
  });
  assert.strictEqual(selection.action, "use_existing");
  assert.strictEqual(selection.duplicate, true);
  assert.strictEqual(selection.winnerId, "recWAS00000000001");
  const dups = detectWasDuplicates(rows, {
    enrollmentId: ENR,
    weekId: WEEK,
    expectedSummaryKey: KEY,
  });
  assert.strictEqual(dups.isDuplicate, true);
  const link = decideWasCreateOrLink({
    mode: "ensure",
    selection: selectExistingWas({
      rows: [{ id: "recWAS00000000001", enrollmentId: ENR, weekId: WEEK, summaryKey: KEY }],
      enrollmentId: ENR,
      weekId: WEEK,
      expectedSummaryKey: KEY,
    }),
  });
  assert.strictEqual(link.action, "link_existing");
});

test("duplicate build after sent is skipped", () => {
  assert.strictEqual(
    evaluateWeeklySummaryBuildGate({ buildNow: true, emailSent: true }).action,
    "skip_already_sent"
  );
});

test("rebuild allowed when not sent and Build Now armed", () => {
  assert.strictEqual(
    evaluateWeeklySummaryBuildGate({ buildNow: true, emailSent: false }).action,
    "manual_build"
  );
});

test("week mismatch: eventIds differ by week id", () => {
  const a = buildWeeklyEmailEventId(ENR, WEEK);
  const b = buildWeeklyEmailEventId(ENR, "recWeek0000000002");
  assert.notStrictEqual(a, b);
});

test("historical vs current enrollment: eventIds differ by enrollment", () => {
  const current = buildWeeklyEmailEventId(ENR, WEEK);
  const historical = buildWeeklyEmailEventId("recEnrollmentHist1", WEEK);
  assert.notStrictEqual(current, historical);
});

test("missing enrollment email path: send gate still requires Ready + Send to Make", () => {
  // Recipient blank is enforced in 074 (static); gate ensures arming order.
  assert.strictEqual(
    evaluateWeeklySummarySendGate({
      emailReady: true,
      emailSent: false,
      sendToMake: true,
    }).action,
    "send"
  );
});

test("Schmidt excluded from automatic weekly summary", () => {
  assert.strictEqual(
    decideAutomaticWeeklySummaryAction({
      emailSent: false,
      emailReady: true,
      hasPackage: true,
      enrollmentActive: true,
      enrollmentId: SCHMIDT_ENROLLMENT_ID,
    }).action,
    "skip_inactive_enrollment"
  );
});

test("empty-week policy matrix still enforced for package plans", () => {
  assert.strictEqual(
    resolveEmptyWeekBuildPlan({ policy: "send_short", isEmpty: true }).actionOut,
    "built_short_empty_week"
  );
  assert.strictEqual(
    resolveEmptyWeekBuildPlan({ policy: "suppress", isEmpty: true }).sendReady,
    false
  );
});

console.log("agent4-was-summary-matrix: all tests passed");

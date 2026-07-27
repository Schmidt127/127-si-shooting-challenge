#!/usr/bin/env node
/**
 * Append hardening coverage for Agent 1 wave (035/057/067/074 contracts).
 * Run via Agent 4 suite or: node airtable/automations/shooting-challenge/lib/agent1-contract-hardening.test.js
 */
"use strict";

const assert = require("assert");
const {
  planWeeklyThresholdAwards,
  buildWeeklyThresholdSourceKey,
  detectDuplicateActiveRewardRuleKeys,
  normalizeLinkedRecordIds,
  evaluatePerfectWeekEligibility,
  buildRequiredWeekDates,
  toDateKeyFromDateObject,
  toDateKeyFromText,
  planWeeklyEmailWebhookOutcome,
  decideWeeklyEmailRetryAction,
  classifyWeeklyEmailWebhookResponse,
  planHomeworkMultiAssetCompletion,
  decideHomeworkCompletionAction,
  decideXpEventAction,
  buildPerfectWeekSourceKey,
} = require("./v2-engine-contracts");

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
const RULES = {
  WEEKLY_THRESHOLD_100_K2: { xpAmount: 10 },
  WEEKLY_THRESHOLD_125_K2: { xpAmount: 20 },
  WEEKLY_THRESHOLD_150_K2: { xpAmount: 30 },
};

// --- 035 Weekly Threshold ---

test("035 missing enrollment id / week id fails source-key mint (assert path)", () => {
  assert.throws(() => buildWeeklyThresholdSourceKey("", WEEK, 100));
  assert.throws(() => buildWeeklyThresholdSourceKey(ENR, "", 100));
});

test("035 incomplete WAS (null goal) awards nothing", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: null,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: RULES,
  });
  assert.strictEqual(plan.anyMet, false);
  assert.strictEqual(plan.createCount, 0);
});

test("035 blank Active? does not skip (enrollmentActive default true)", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 1.0,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: RULES,
    // omit enrollmentActive
  });
  assert.strictEqual(plan.createCount, 1);
});

test("035 duplicate active reward rules detected", () => {
  const d = detectDuplicateActiveRewardRuleKeys([
    { id: "recRuleA", ruleKey: "WEEKLY_THRESHOLD_100_K2", active: true },
    { id: "recRuleB", ruleKey: "WEEKLY_THRESHOLD_100_K2", active: true },
    { id: "recRuleC", ruleKey: "WEEKLY_THRESHOLD_125_K2", active: false },
  ]);
  assert.strictEqual(d.ok, false);
  assert.strictEqual(d.action, "error_duplicate_active_rules");
  assert.strictEqual(d.duplicates[0].ruleKey, "WEEKLY_THRESHOLD_100_K2");
});

test("035 linked/lookup arrays normalize to unique ids", () => {
  assert.deepStrictEqual(
    normalizeLinkedRecordIds([{ id: ENR }, { id: ENR }, ENR]),
    [ENR]
  );
  assert.deepStrictEqual(normalizeLinkedRecordIds([[{ id: WEEK }]]), [WEEK]);
  assert.deepStrictEqual(normalizeLinkedRecordIds(null), []);
  assert.deepStrictEqual(normalizeLinkedRecordIds({ id: ENR }), [ENR]);
});

test("035 no award when below every threshold", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 0.5,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: RULES,
  });
  assert.strictEqual(plan.createCount, 0);
  assert.ok(plan.plans.every((p) => p.action === "skip_not_met"));
});

// --- 057 Perfect Week ---

test("057 future-dated activity outside week fails dailyMet", () => {
  const start = "2026-07-19";
  const required = buildRequiredWeekDates(start, 7);
  const withFuture = [...required.slice(0, 6), "2026-08-01"];
  const result = evaluatePerfectWeekEligibility({
    weekStartDateKey: start,
    countedSubmissionDateKeys: withFuture,
    homeworkSatisfactoryCount: 1,
    homeworkRequired: 1,
    videoCount: 3,
    videoRequired: 3,
    zoomAttendanceCount: 0,
    zoomRequired: 0,
    requiredDailyCount: 7,
  });
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.dailyMet, false);
});

test("057 duplicate same-day submissions do not count as seven days", () => {
  const start = "2026-07-19";
  const day = start;
  const result = evaluatePerfectWeekEligibility({
    weekStartDateKey: start,
    countedSubmissionDateKeys: [day, day, day, day, day, day, day],
    homeworkSatisfactoryCount: 1,
    homeworkRequired: 1,
    videoCount: 3,
    videoRequired: 3,
    zoomAttendanceCount: 0,
    zoomRequired: 0,
    requiredDailyCount: 7,
  });
  assert.strictEqual(result.eligible, false);
});

test("057 DST spring: UTC timestamp near midnight maps Denver calendar day", () => {
  // 2026-03-08 06:30 UTC = 2026-03-07 23:30 MST
  assert.strictEqual(
    toDateKeyFromDateObject(new Date("2026-03-08T06:30:00.000Z"), "America/Denver"),
    "2026-03-07"
  );
  // After spring forward: 2026-03-08 08:30 UTC = 2026-03-08 02:30 MDT (skipped hour → still 08)
  assert.strictEqual(
    toDateKeyFromDateObject(new Date("2026-03-08T08:30:00.000Z"), "America/Denver"),
    "2026-03-08"
  );
});

test("057 date-only text ignores timezone shift", () => {
  assert.strictEqual(toDateKeyFromText("2026-03-08"), "2026-03-08");
  assert.strictEqual(toDateKeyFromText("3/8/2026"), "2026-03-08");
});

test("057 Perfect Week XP idempotent on source key", () => {
  const key = buildPerfectWeekSourceKey(ENR, WEEK);
  assert.strictEqual(
    decideXpEventAction({ sourceKey: key, existingKeys: [key] }).action,
    "skip_existing"
  );
});

// --- 067 Homework ---

test("067 zero-asset Option B creates one completion path", () => {
  const plan = planHomeworkMultiAssetCompletion({
    existingCompletionIds: [],
    assetCount: 0,
    gradingStatus: "",
    enrollmentId: ENR,
    homeworkAssignmentId: "recHWAssign000001",
  });
  assert.strictEqual(plan.action, "create");
  assert.strictEqual(plan.allowsZeroAssets, true);
  assert.strictEqual(plan.xpAllowed, false);
  assert.strictEqual(plan.statusTransition, "ready_for_review");
});

test("067 multi-asset links one existing completion", () => {
  const plan = planHomeworkMultiAssetCompletion({
    existingCompletionIds: ["recHC000000000001"],
    assetCount: 3,
    gradingStatus: "Satisfactory",
  });
  assert.strictEqual(plan.action, "link_existing");
  assert.strictEqual(plan.oneCompletionManyAssets, true);
  assert.strictEqual(plan.xpAllowed, true);
});

test("067 partial-processing recovery links existing", () => {
  const plan = planHomeworkMultiAssetCompletion({
    existingCompletionIds: ["recHC000000000001"],
    assetCount: 1,
    alreadyProcessed: true,
  });
  assert.strictEqual(plan.reason, "partial_processing_recovery");
});

test("067 ambiguous duplicates error", () => {
  const plan = planHomeworkMultiAssetCompletion({
    existingCompletionIds: ["recHC000000000001", "recHC000000000002"],
    assetCount: 2,
  });
  assert.strictEqual(plan.action, "error");
  assert.strictEqual(plan.reason, "ambiguous_duplicate_completions");
});

test("067 unsatisfactory blocks XP", () => {
  const plan = planHomeworkMultiAssetCompletion({
    existingCompletionIds: ["recHC000000000001"],
    gradingStatus: "Unsatisfactory",
  });
  assert.strictEqual(plan.xpAllowed, false);
  assert.strictEqual(plan.statusTransition, "unsatisfactory_no_xp");
});

test("067 decideHomeworkCompletionAction mirrors create/link", () => {
  assert.strictEqual(
    decideHomeworkCompletionAction({
      existingCompletionIdsForAsset: [],
      enrollmentId: ENR,
      homeworkAssignmentId: "recHWAssign000001",
    }).action,
    "create"
  );
});

// --- 074 / SC-041 weekly email ---

test("074 classify success / timeout / malformed / retryable 502", () => {
  assert.strictEqual(classifyWeeklyEmailWebhookResponse({ httpStatus: 200 }).class, "success");
  assert.strictEqual(classifyWeeklyEmailWebhookResponse({ timedOut: true }).class, "timeout");
  assert.strictEqual(
    classifyWeeklyEmailWebhookResponse({ parseError: true }).class,
    "malformed_response"
  );
  assert.strictEqual(
    classifyWeeklyEmailWebhookResponse({ httpStatus: 502 }).class,
    "retryable_http"
  );
});

test("074 timeout maps to retryable handoff failure", () => {
  const classified = classifyWeeklyEmailWebhookResponse({ timedOut: true });
  const outcome = planWeeklyEmailWebhookOutcome({
    webhookOk: classified.webhookOk,
    emailSent: false,
    errorMessage: classified.errorMessage,
  });
  assert.strictEqual(outcome.allowRetry, true);
  assert.ok(outcome.mustNotClear.includes("Send to Make?"));
  assert.ok(outcome.mustNotWrite.includes("Weekly Email Sent?"));
});

test("074 malformed response does not write Sent?", () => {
  const classified = classifyWeeklyEmailWebhookResponse({ parseError: true, bodyText: "{bad" });
  const outcome = planWeeklyEmailWebhookOutcome({
    webhookOk: classified.webhookOk,
    emailSent: false,
    errorMessage: classified.errorMessage,
  });
  assert.ok(outcome.mustNotWrite.includes("Weekly Email Sent?"));
});

test("074 duplicate success callback: already sent never retries", () => {
  const outcome = planWeeklyEmailWebhookOutcome({ webhookOk: true, emailSent: true });
  assert.strictEqual(outcome.action, "never_retry_already_completed");
  assert.strictEqual(
    decideWeeklyEmailRetryAction({
      emailSent: true,
      sendToMake: false,
      emailReady: true,
      makeSendStatus: "Sent",
    }).retryClass,
    "never_retry_already_completed"
  );
});

test("074 contradictory Make Sent + checkbox false requires manual review", () => {
  const d = decideWeeklyEmailRetryAction({
    emailSent: false,
    sendToMake: true,
    emailReady: true,
    makeSendStatus: "Sent",
  });
  assert.strictEqual(d.retryClass, "manual_review_required");
  assert.strictEqual(d.action, "do_not_retry");
});

test("074 no blind bulk rearm: rearm only when package ready and trigger cleared", () => {
  const d = decideWeeklyEmailRetryAction({
    emailSent: false,
    sendToMake: false,
    emailReady: true,
  });
  assert.strictEqual(d.action, "rearm_send_to_make");
  assert.strictEqual(d.retryClass, "retryable_after_correcting_data");
});

console.log("agent1-contract-hardening: all tests passed");

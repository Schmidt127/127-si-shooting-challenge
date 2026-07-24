#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  isRecId,
  validateLinkedIds,
  validateRequiredFields,
  validateSourceKey,
  validateDedupeKey,
  findDuplicateGroups,
} = require("../../lib/reliability-command-center/validate");
const {
  isStale,
  assessStaleProcessing,
  DEFAULT_THRESHOLDS_HOURS,
} = require("../../lib/reliability-command-center/stale");
const {
  classifyRetry,
  RETRY_CLASS,
} = require("../../lib/reliability-command-center/retry");
const {
  detectWeeklyEmailConflicts,
  detectLevelConflicts,
} = require("../../lib/reliability-command-center/conflicts");
const {
  HEALTH_STATUS,
  isHealthStatus,
  guessHealthFromRawStatus,
  priorityForHealth,
} = require("../../lib/reliability-command-center/health-status");
const {
  buildIssue,
  summarizeIssue,
  countIssues,
} = require("../../lib/reliability-command-center/issue");
const {
  buildReportJson,
  buildReportMarkdown,
} = require("../../lib/reliability-command-center/report");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("isRecId and linked validation", () => {
  assert.strictEqual(isRecId("recEnroll00000001"), true);
  assert.strictEqual(isRecId("recShort"), false);
  const v = validateLinkedIds(["recEnroll00000001", "bad"]);
  assert.strictEqual(v.ok, false);
  assert.deepStrictEqual(v.ids, ["recEnroll00000001"]);
});

test("required fields and source/dedupe keys", () => {
  const req = validateRequiredFields({ fields: { A: "x", B: "" } }, ["A", "B", "C"]);
  assert.deepStrictEqual(req.missing.sort(), ["B", "C"]);
  assert.strictEqual(validateSourceKey("SUB|recX").ok, true);
  assert.strictEqual(validateSourceKey("ONLY").ok, false);
  assert.strictEqual(validateSourceKey("A|", { minParts: 2 }).ok, false);
  assert.strictEqual(validateDedupeKey("").ok, false);
  assert.strictEqual(validateDedupeKey("k").ok, true);
});

test("findDuplicateGroups", () => {
  const dups = findDuplicateGroups(
    [{ id: "recaaaaaaaaaaaaaa", k: "a" }, { id: "recbbbbbbbbbbbbbb", k: "a" }, { id: "reccccccccccccccccc", k: "b" }],
    (r) => r.k
  );
  assert.strictEqual(dups.length, 1);
  assert.strictEqual(dups[0].count, 2);
});

test("stale thresholds", () => {
  const now = Date.parse("2026-07-24T12:00:00.000Z");
  const stale = isStale("2026-07-23T00:00:00.000Z", { nowMs: now, thresholdHours: 6 });
  assert.strictEqual(stale.stale, true);
  const fresh = isStale("2026-07-24T10:00:00.000Z", { nowMs: now, thresholdHours: 6 });
  assert.strictEqual(fresh.stale, false);
  const missing = assessStaleProcessing({
    isProcessing: true,
    lastAttemptedAt: null,
    thresholdHours: DEFAULT_THRESHOLDS_HOURS.processing,
  });
  assert.strictEqual(missing.stale, true);
});

test("retry classification matrix", () => {
  assert.strictEqual(
    classifyRetry({ healthStatus: HEALTH_STATUS.SENT_OR_COMPLETED }).retryEligibility,
    RETRY_CLASS.NEVER_RETRY_COMPLETED
  );
  assert.strictEqual(
    classifyRetry({ healthStatus: HEALTH_STATUS.DUPLICATE_RISK }).retryEligibility,
    RETRY_CLASS.DUPLICATE_RISK
  );
  assert.strictEqual(
    classifyRetry({ healthStatus: HEALTH_STATUS.RETRYABLE_ERROR }).retryEligibility,
    RETRY_CLASS.AUTOMATICALLY_RETRYABLE
  );
  assert.strictEqual(
    classifyRetry({ healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY }).retryEligibility,
    RETRY_CLASS.RETRYABLE_AFTER_DATA_FIX
  );
  assert.strictEqual(
    classifyRetry({ healthStatus: HEALTH_STATUS.TEST_ONLY }).retryEligibility,
    RETRY_CLASS.PROD_ACTION_PROHIBITED
  );
  assert.strictEqual(
    classifyRetry({ healthStatus: HEALTH_STATUS.HISTORICAL }).retryEligibility,
    RETRY_CLASS.PROD_ACTION_PROHIBITED
  );
});

test("weekly email conflict rules", () => {
  const conflicts = detectWeeklyEmailConflicts({
    "Weekly Email Ready?": true,
    "Weekly Email Subject": "",
    "Weekly Email Recipients": "",
    "Weekly Email HTML": "",
    "Send to Make?": true,
    "Weekly Email Sent?": true,
    "Make Send Status": "Queued",
    "Weekly Email Sent At": "",
    sendMode: "Live",
  });
  const codes = new Set(conflicts.map((c) => c.code));
  assert.ok(codes.has("ready_subject_blank"));
  assert.ok(codes.has("ready_recipients_blank"));
  assert.ok(codes.has("ready_html_blank"));
  assert.ok(codes.has("sent_still_armed"));
  assert.ok(codes.has("sent_checkbox_make_status_mismatch"));
  assert.ok(codes.has("sent_timestamp_blank"));
});

test("test sendMode armed handoff conflict", () => {
  const conflicts = detectWeeklyEmailConflicts({
    "Weekly Email Ready?": true,
    "Weekly Email Subject": "s",
    "Weekly Email Recipients": "a@b.test",
    "Weekly Email HTML": "<p>x</p>",
    "Send to Make?": true,
    "Weekly Email Sent?": false,
    sendMode: "Test",
  });
  assert.ok(conflicts.some((c) => c.code === "live_forced_test_handoff"));
});
test("make sent without checkbox", () => {
  const conflicts = detectWeeklyEmailConflicts({
    "Weekly Email Ready?": true,
    "Weekly Email Subject": "s",
    "Weekly Email Recipients": "a@b.test",
    "Weekly Email HTML": "<p>x</p>",
    "Weekly Email Sent?": false,
    "Make Send Status": "Sent",
  });
  assert.ok(conflicts.some((c) => c.code === "make_sent_checkbox_blank"));
});

test("sent timestamp accepts Weekly Summary Sent At (PROD Make writeback field)", () => {
  const ok = detectWeeklyEmailConflicts({
    "Weekly Email Ready?": true,
    "Weekly Email Subject": "s",
    "Weekly Email Recipients": "a@b.test",
    "Weekly Email HTML": "<p>x</p>",
    "Weekly Email Sent?": true,
    "Make Send Status": "Sent",
    "Weekly Summary Sent At": "2026-07-20T16:00:00.000Z",
    sendMode: "Live",
  });
  assert.ok(!ok.some((c) => c.code === "sent_timestamp_blank"));

  const blank = detectWeeklyEmailConflicts({
    "Weekly Email Ready?": true,
    "Weekly Email Subject": "s",
    "Weekly Email Recipients": "a@b.test",
    "Weekly Email HTML": "<p>x</p>",
    "Weekly Email Sent?": true,
    "Make Send Status": "Sent",
    sendMode: "Live",
  });
  assert.ok(blank.some((c) => c.code === "sent_timestamp_blank"));
});

test("level conflicts", () => {
  const conflicts = detectLevelConflicts({
    "Current Level": "L5",
    "Next Level": "L5",
    "Lifetime XP Total": 10,
    _currentLevelMinXp: 100,
    _gateShouldRollback: true,
    _rolledBack: false,
    "Level Gate Blocked?": true,
  });
  const codes = conflicts.map((c) => c.code);
  assert.ok(codes.includes("current_equals_next"));
  assert.ok(codes.includes("level_exceeds_xp"));
  assert.ok(codes.includes("gate_blocked_not_rolled_back"));
});

test("health status helpers and issue/report builders", () => {
  assert.ok(isHealthStatus(HEALTH_STATUS.HEALTHY));
  assert.strictEqual(guessHealthFromRawStatus("Sent"), HEALTH_STATUS.SENT_OR_COMPLETED);
  assert.strictEqual(priorityForHealth(HEALTH_STATUS.BLOCKING_ERROR), "P0");
  const issue = buildIssue({
    workflow: "Weekly email build",
    sourceTable: "Weekly Athlete Summary",
    sourceRecordId: "recWAS00000000001",
    healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
    recommendedAction: "Fix package",
    code: "test_code",
  });
  assert.ok(summarizeIssue(issue).includes("P0"));
  const report = buildReportJson({ issues: [issue], fixturePath: "/tmp/x.json" });
  assert.strictEqual(report.summary.total, 1);
  const md = buildReportMarkdown(report);
  assert.ok(md.includes("Reliability Command Center"));
  assert.ok(md.includes("P0 findings"));
  assert.strictEqual(countIssues([]).total, 0);
});

console.log("helpers.test.js passed");

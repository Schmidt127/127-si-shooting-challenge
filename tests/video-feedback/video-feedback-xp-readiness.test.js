#!/usr/bin/env node
"use strict";

/**
 * Offline/static contract coverage for the Video Feedback XP readiness package.
 * This test never connects to Airtable and does not claim installed automation
 * behavior. Run: node tests/video-feedback/video-feedback-xp-readiness.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "../..");
const scriptPath = path.join(
  ROOT,
  "airtable/automations/shooting-challenge/114-video-review-and-xp-create-or-update-video-xp-event.js"
);
const auditPath = path.join(
  ROOT,
  "airtable/extension-scripts/audits/audit-video-xp-pipeline-integrity.js"
);
const emailPath = path.join(
  ROOT,
  "airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js"
);
const source = fs.readFileSync(scriptPath, "utf8");
const audit = fs.readFileSync(auditPath, "utf8");
const email = fs.readFileSync(emailPath, "utf8");

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

function checkSyntax(filePath) {
  const result = spawnSync(process.execPath, ["--check", filePath], { encoding: "utf8" });
  assert.strictEqual(result.status, 0, result.stderr);
}

function eligibleForVideoXp(row) {
  if (!row.videoActive || !row.feedbackPosted || row.doNotAward || !row.ready || row.points <= 0) {
    return false;
  }
  if (row.videoEnrollmentIds.length !== 1 || row.videoSubmissionIds.length !== 1) return false;
  if (!row.enrollmentActive || row.submissionEnrollmentIds.length !== 1) return false;
  if (row.submissionEnrollmentIds[0] !== row.videoEnrollmentIds[0]) return false;
  if (row.submissionWeekIds.length !== 1 || !row.countThisSubmission) return false;
  return Boolean(row.activityDate) && row.activityDate <= row.today;
}

const valid = {
  videoActive: true,
  feedbackPosted: true,
  doNotAward: false,
  ready: true,
  points: 25,
  videoEnrollmentIds: ["recEnrollment"],
  videoSubmissionIds: ["recSubmission"],
  enrollmentActive: true,
  submissionEnrollmentIds: ["recEnrollment"],
  submissionWeekIds: ["recWeek"],
  countThisSubmission: true,
  activityDate: "2026-08-12",
  today: "2026-08-12",
};

test("114 syntax", () => checkSyntax(scriptPath));
test("Video XP audit syntax", () => checkSyntax(auditPath));

test("stable writer and source key are documented", () => {
  assert.match(source, /Version: v6\.0/);
  assert.match(source, /sourceKey = `VIDEO_SUBMISSION\|\$\{recordId\}`/);
  assert.match(source, /One Video Feedback record = one XP Event/);
  assert.match(source, /Last-Chance XP Event Recheck Before Create/);
});

test("eligible source model produces one active source-keyed event", () => {
  assert.strictEqual(eligibleForVideoXp(valid), true);
  const event = {
    sourceKey: `VIDEO_SUBMISSION|${valid.videoSubmissionIds[0].replace("recSubmission", "recVideoFeedback")}`,
    active: true,
    enrollmentId: valid.videoEnrollmentIds[0],
    submissionId: valid.videoSubmissionIds[0],
    weekId: valid.submissionWeekIds[0],
  };
  assert.strictEqual(event.active, true);
  assert.strictEqual(event.enrollmentId, "recEnrollment");
  assert.strictEqual(event.submissionId, "recSubmission");
  assert.strictEqual(event.weekId, "recWeek");
  assert.strictEqual(event.sourceKey, "VIDEO_SUBMISSION|recVideoFeedback");
});

test("replay model reuses the stable source key", () => {
  const sourceKey = "VIDEO_SUBMISSION|recVideoFeedback";
  const events = new Map([[sourceKey, { id: "recXp", active: true }]]);
  const action = events.has(sourceKey) ? "update" : "create";
  assert.strictEqual(action, "update");
  assert.strictEqual(events.size, 1);
});

test("inactive, rejected, incomplete, mismatched, uncountable, and future inputs fail closed", () => {
  const cases = [
    { videoActive: false },
    { doNotAward: true },
    { videoEnrollmentIds: [] },
    { videoSubmissionIds: ["recSubmission", "recOther"] },
    { enrollmentActive: false },
    { submissionEnrollmentIds: ["recOther"] },
    { submissionWeekIds: [] },
    { countThisSubmission: false },
    { activityDate: "2026-08-13" },
  ];
  for (const change of cases) {
    assert.strictEqual(eligibleForVideoXp({ ...valid, ...change }), false, JSON.stringify(change));
  }
});

test("114 implements all source eligibility guards before XP Event matching", () => {
  for (const token of [
    "skipped_invalid_submission_link",
    "skipped_invalid_enrollment_link",
    "skipped_inactive_enrollment",
    "skipped_submission_enrollment_mismatch",
    "skipped_submission_not_countable",
    "skipped_submission_activity_date_missing",
    "skipped_submission_activity_date_future",
    "Submission Week",
  ]) {
    assert.ok(source.includes(token), `missing 114 guard: ${token}`);
  }
});

test("114 writes the active Video Submission / Video Feedback contract links", () => {
  for (const token of [
    "CONFIG.xpEvents.enrollment",
    "CONFIG.xpEvents.submission",
    "CONFIG.xpEvents.week",
    "CONFIG.xpEvents.videoFeedback",
    "CONFIG.xpEvents.weeklySummary",
    "CONFIG.values.xpSource",
    "CONFIG.values.xpBucketKey",
    "CONFIG.xpEvents.active",
  ]) {
    assert.ok(source.includes(token), `missing XP payload contract: ${token}`);
  }
});

test("read-only audit detects required Video XP integrity states", () => {
  for (const token of [
    "dryRun: true",
    "invalid_source_identity",
    "inactive_or_ineligible_source",
    "missing_xp_event",
    "duplicate_xp_event",
    "inactive_xp_event",
    "mislinked_xp_event",
    "source_key_mismatch",
    "xp_type_mismatch",
    "missing_weekly_summary_on_xp",
    "never creates, updates, activates, deactivates, deletes, queues, or sends",
  ]) {
    assert.ok(audit.includes(token), `missing audit coverage: ${token}`);
  }
  assert.doesNotMatch(audit, /\.createRecordAsync\(|\.updateRecordAsync\(|\.deleteRecordAsync\(/);
});

test("114 does not contain email or queue side effects", () => {
  assert.doesNotMatch(source, /\bfetch\(|\bremoteFetchAsync\b|\bmakeWebhook\b/i);
  assert.match(source, /does not create Email Handoff Queue/);
  assert.match(email, /Video Feedback is inactive\/retired\. Email blocked\./);
  assert.match(email, /Parent Feedback Ready\? is not checked\. Email blocked\./);
});

test("114 neither references nor recreates retired Automation 043", () => {
  assert.doesNotMatch(source, /\b043\b/);
  assert.doesNotMatch(source, /Level Gate Rule/);
});

console.log(`PASS ${passed} Video Feedback XP readiness contracts`);

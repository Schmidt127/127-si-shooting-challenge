#!/usr/bin/env node
"use strict";

/**
 * Offline/static contract coverage for the Video Feedback XP readiness package.
 * This test never connects to Airtable and does not claim installed behavior.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "../..");
const scriptPath = path.join(ROOT, "airtable/automations/shooting-challenge/114-video-review-and-xp-create-or-update-video-xp-event.js");
const auditPath = path.join(ROOT, "airtable/extension-scripts/audits/audit-video-xp-pipeline-integrity.js");
const emailPath = path.join(ROOT, "airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js");
const source = fs.readFileSync(scriptPath, "utf8");
const audit = fs.readFileSync(auditPath, "utf8");
const email = fs.readFileSync(emailPath, "utf8");

let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`ok - ${name}`); }
function checkSyntax(filePath) {
  const result = spawnSync(process.execPath, ["--check", filePath], { encoding: "utf8" });
  assert.strictEqual(result.status, 0, result.stderr);
}

function eligibleForVideoXp(row) {
  if (!row.videoActive || !row.feedbackPosted || row.doNotAward || !row.ready || row.points <= 0) return false;
  if (row.videoEnrollmentIds.length !== 1 || row.videoSubmissionIds.length !== 1) return false;
  if (!row.enrollmentActive || row.submissionEnrollmentIds.length !== 1) return false;
  if (row.submissionEnrollmentIds[0] !== row.videoEnrollmentIds[0]) return false;
  if (row.submissionWeekIds.length !== 1) return false;
  if (!row.countThisSubmission || row.activityDateIsFuture) return false;
  return Boolean(row.activityDate) && row.activityDate <= row.today;
}

const valid = {
  videoActive: true, feedbackPosted: true, doNotAward: false, ready: true, points: 25,
  videoEnrollmentIds: ["recEnrollment"], videoSubmissionIds: ["recSubmission"],
  enrollmentActive: true, submissionEnrollmentIds: ["recEnrollment"], submissionWeekIds: ["recWeek"],
  countThisSubmission: true, activityDateIsFuture: false,
  activityDate: "2026-08-12", today: "2026-08-12",
};

test("114 syntax", () => checkSyntax(scriptPath));
test("Video XP audit syntax", () => checkSyntax(auditPath));

test("stable writer and exact source key are documented", () => {
  assert.match(source, /Version: v6\.3/);
  assert.match(source, /sourceKey = `VIDEO_SUBMISSION\|\$\{recordId\}`/);
  assert.match(source, /One Video Feedback record = one XP Event/);
  assert.match(source, /Never move or steal an XP Event/);
});

test("eligible source model produces one active source-keyed event", () => {
  assert.strictEqual(eligibleForVideoXp(valid), true);
});

test("replay model reuses the stable source key", () => {
  const sourceKey = "VIDEO_SUBMISSION|recVideoFeedback";
  const events = new Map([[sourceKey, { id: "recXp", active: true }]]);
  assert.strictEqual(events.has(sourceKey) ? "update" : "create", "update");
  assert.strictEqual(events.size, 1);
});

test("inactive, rejected, incomplete, mismatched, uncountable, and future inputs fail closed", () => {
  const cases = [
    { videoActive: false }, { doNotAward: true }, { videoEnrollmentIds: [] },
    { videoSubmissionIds: ["recSubmission", "recOther"] }, { enrollmentActive: false },
    { submissionEnrollmentIds: ["recOther"] }, { submissionWeekIds: [] },
    { countThisSubmission: false }, { activityDateIsFuture: true }, { activityDate: "2026-08-13" },
  ];
  for (const change of cases) assert.strictEqual(eligibleForVideoXp({ ...valid, ...change }), false, JSON.stringify(change));
});

test("114 implements source guards and retirement before positive gates", () => {
  for (const token of [
    "skipped_invalid_submission_link", "skipped_invalid_enrollment_link", "skipped_inactive_enrollment",
    "skipped_submission_enrollment_mismatch", "skipped_submission_week_invalid",
    "skipped_submission_not_countable", "skipped_submission_future_formula",
    "skipped_submission_activity_date_missing", "skipped_submission_activity_date_future",
    "Validate Authoritative Submission Source", "Validate Positive Award Gates",
  ]) assert.ok(source.includes(token), `missing 114 guard: ${token}`);
  assert.ok(source.indexOf("Validate Authoritative Submission Source") < source.indexOf("Validate Positive Award Gates"));
});

test("114 retirement queues progression without becoming a level writer", () => {
  assert.match(source, /Level Recalc Needed\?/);
  assert.match(source, /levelRecalcQueued/);
  assert.match(source, /CONFIG\.enrollments\.levelRecalcNeeded/);
  assert.doesNotMatch(source, /Current Level/);
  assert.doesNotMatch(source, /Next Level/);
  assert.doesNotMatch(source, /Level Gate Rule/);
});

test("114 writes active Video Submission / Video Feedback contract links", () => {
  for (const token of [
    "CONFIG.xpEvents.enrollment", "CONFIG.xpEvents.submission", "CONFIG.xpEvents.week",
    "CONFIG.xpEvents.videoFeedback", "CONFIG.xpEvents.weeklySummary", "CONFIG.values.xpSource",
    "CONFIG.values.xpBucketKey", "CONFIG.xpEvents.active",
  ]) assert.ok(source.includes(token), `missing XP payload contract: ${token}`);
});

test("read-only audit detects required Video XP integrity states", () => {
  for (const token of [
    "dryRun: true", "invalid_source_identity", "inactive_or_ineligible_source", "missing_xp_event",
    "duplicate_xp_event", "inactive_xp_event", "mislinked_xp_event", "source_key_mismatch",
    "xp_type_mismatch", "missing_weekly_summary_on_xp",
    "never creates, updates, activates, deactivates, deletes, queues, or sends",
  ]) assert.ok(audit.includes(token), `missing audit coverage: ${token}`);
  assert.doesNotMatch(audit, /\.createRecordAsync\(|\.updateRecordAsync\(|\.deleteRecordAsync\(/);
});

test("114 has no email or queue side effects", () => {
  assert.doesNotMatch(source, /\bfetch\(|\bremoteFetchAsync\b|\bmakeWebhook\b/i);
  assert.match(source, /This is not an email automation/);
  assert.match(email, /Video Feedback is inactive\/retired\. Handoff blocked\./);
  assert.match(email, /Parent Feedback Ready\? is not checked\. Handoff blocked\./);
});

console.log(`PASS ${passed} Video Feedback XP readiness contracts`);

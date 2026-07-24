#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const {
  runAudit,
  normalizeInput,
  RETRY_CLASS,
  HEALTH_STATUS,
} = require("../../lib/reliability-command-center");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

function load(name) {
  return JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "fixtures", name),
      "utf8"
    )
  );
}

function codes(result) {
  return new Set(result.issues.map((i) => i.code));
}

test("healthy fixture has no P0 findings", () => {
  const result = runAudit(load("healthy.json"), { fixturePath: "healthy.json" });
  assert.strictEqual(result.summary.byPriority.P0, 0);
  assert.ok(result.markdown.includes("Summary"));
});

test("mixed fixture detects enrollment problems", () => {
  const c = codes(runAudit(load("mixed-health.json")));
  assert.ok(c.has("enrollment_missing_config"));
  assert.ok(c.has("enrollment_missing_challenge_year"));
  assert.ok(c.has("enrollment_missing_grade_band"));
  assert.ok(c.has("multiple_active_enrollments_same_athlete_year"));
  assert.ok(c.has("inactive_enrollment_still_processing"));
  assert.ok(c.has("enrollment_missing_email"));
  assert.ok(c.has("historical_enrollment_active_processing"));
});

test("mixed fixture detects submission and XP problems", () => {
  const c = codes(runAudit(load("mixed-health.json")));
  assert.ok(c.has("submission_missing_enrollment"));
  assert.ok(c.has("submission_week_activity_date_mismatch"));
  assert.ok(c.has("duplicate_submission_source_key"));
  assert.ok(c.has("submission_awaiting_assets_too_long"));
  assert.ok(c.has("submission_processed_without_xp_event"));
  assert.ok(c.has("xp_duplicate_source_key"));
  assert.ok(c.has("xp_duplicate_dedupe_key"));
  assert.ok(c.has("source_completed_without_xp_event"));
});

test("mixed fixture detects homework zoom video achievement level", () => {
  const c = codes(runAudit(load("mixed-health.json")));
  assert.ok(c.has("asset_ready_without_homework_completion"));
  assert.ok(c.has("duplicate_homework_completion_same_asset_slot"));
  assert.ok(c.has("homework_awarded_without_xp"));
  assert.ok(c.has("homework_completion_no_linked_source"));
  assert.ok(c.has("homework_xp_without_completion"));
  assert.ok(c.has("zoom_attendance_without_meeting"));
  assert.ok(c.has("zoom_attendance_without_enrollment"));
  assert.ok(c.has("zoom_meeting_wrong_week"));
  assert.ok(c.has("zoom_xp_awarded_twice"));
  assert.ok(c.has("video_feedback_missing_activity_date"));
  assert.ok(c.has("video_graded_without_feedback"));
  assert.ok(c.has("duplicate_streak_unlock_key"));
  assert.ok(c.has("invalid_streak_threshold"));
  assert.ok(c.has("milestone_wrong_grade_band"));
  assert.ok(c.has("perfect_week_eligible_without_unlock"));
  assert.ok(c.has("perfect_week_unlock_without_eligibility"));
  assert.ok(c.has("duplicate_perfect_week_xp"));
  assert.ok(c.has("achievement_xp_without_unlock"));
  assert.ok(c.has("level_recalc_flag_stuck"));
  assert.ok(c.has("current_equals_next"));
  assert.ok(c.has("level_exceeds_xp"));
  assert.ok(c.has("gate_blocked_not_rolled_back"));
});

test("mixed fixture detects WAS and weekly email conflicts", () => {
  const c = codes(runAudit(load("mixed-health.json")));
  assert.ok(c.has("duplicate_was_enrollment_week"));
  assert.ok(c.has("ready_subject_blank"));
  assert.ok(c.has("send_armed_not_ready") || c.has("ready_html_blank"));
  assert.ok(c.has("sent_still_armed"));
  assert.ok(c.has("make_sent_checkbox_blank"));
  assert.ok(c.has("production_parent_test_send_mode") || c.has("live_forced_test_handoff"));
  assert.ok(c.has("historical_was_processed_as_current"));
  assert.ok(c.has("was_build_flag_stuck"));
});

test("weekly email writeback fixture", () => {
  const result = runAudit(load("weekly-email-writeback.json"));
  const c = codes(result);
  assert.ok(c.has("live_forced_test_handoff") || c.has("production_parent_test_send_mode"));
  assert.ok(c.has("already_sent_eligible_to_resend"));
  assert.ok(c.has("email_package_wrong_week"));
  const alreadySent = result.issues.find((i) => i.code === "already_sent_eligible_to_resend");
  assert.strictEqual(alreadySent.retryEligibility, RETRY_CLASS.NEVER_RETRY_COMPLETED);
});

test("historical year isolation sets prohibited retry", () => {
  const result = runAudit(load("mixed-health.json"));
  const hist = result.issues.filter((i) => i.healthStatus === HEALTH_STATUS.HISTORICAL);
  assert.ok(hist.length >= 1);
  assert.ok(
    hist.every(
      (i) =>
        i.retryEligibility === RETRY_CLASS.PROD_ACTION_PROHIBITED ||
        i.retryEligibility === RETRY_CLASS.MANUAL_REVIEW
    )
  );
});

test("malformed fixture handling", () => {
  const result = runAudit(null, { fixturePath: "null.json" });
  assert.ok(result.issues.some((i) => i.code === "malformed_fixture"));
  assert.ok(result.summary.byPriority.P0 >= 1);
});

test("normalizeInput supports tables map", () => {
  const data = normalizeInput({
    tables: {
      Enrollments: [{ id: "recEnroll00000001", fields: { "Active?": true } }],
      Submissions: [{ id: "recSub00000000001" }],
    },
    currentChallengeYear: "2026-2027",
  });
  assert.strictEqual(data.enrollments.length, 1);
  assert.strictEqual(data.submissions.length, 1);
  assert.strictEqual(data.currentChallengeYear, "2026-2027");
});

test("duplicate risk findings are not automatically retryable", () => {
  const result = runAudit(load("mixed-health.json"));
  const dups = result.issues.filter((i) => i.healthStatus === HEALTH_STATUS.DUPLICATE_RISK);
  assert.ok(dups.length >= 1);
  assert.ok(
    dups.every((i) =>
      [
        RETRY_CLASS.DUPLICATE_RISK,
        RETRY_CLASS.NEVER_RETRY_COMPLETED,
        RETRY_CLASS.PROD_ACTION_PROHIBITED,
      ].includes(i.retryEligibility)
    )
  );
  assert.ok(dups.every((i) => i.retryEligibility !== RETRY_CLASS.AUTOMATICALLY_RETRYABLE));
});

test("report includes affected record ids and workflow names", () => {
  const result = runAudit(load("mixed-health.json"), { fixturePath: "mixed-health.json" });
  assert.ok(result.report.affectedRecordIds.length > 0);
  assert.ok(result.report.workflows.includes("Weekly email build") || result.report.workflows.length > 0);
  assert.ok(result.markdown.includes("Affected record IDs"));
});

console.log("workflows.test.js passed");

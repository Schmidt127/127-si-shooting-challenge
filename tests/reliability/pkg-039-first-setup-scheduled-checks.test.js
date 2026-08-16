#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  resolveFirstCreate,
  resolveScheduledRun,
  auditSetupState,
  canonicalWasKey,
} = require("../../lib/reliability/first-setup-scheduled-checks");

function run(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

run("empty scope reports setup gaps without creating records", () => {
  const report = auditSetupState({});
  assert.strictEqual(report.readOnly, true);
  assert.ok(report.findings.some((f) => f.code === "setup_no_enrollments"));
  assert.ok(report.findings.some((f) => f.code === "missing_ownership"));
});

run("first create succeeds once and reuses on rerun", () => {
  const first = resolveFirstCreate({ existingCount: 0, eligible: true, writerReady: true });
  assert.strictEqual(first.status, "created");
  const rerun = resolveFirstCreate({ existingCount: 1, eligible: true, writerReady: true });
  assert.strictEqual(rerun.status, "reused");
});

run("concurrent first-create attempts fail closed", () => {
  const result = resolveFirstCreate({
    existingCount: 0,
    eligible: true,
    writerReady: true,
    concurrentStarts: 2,
  });
  assert.strictEqual(result.status, "error");
  assert.strictEqual(result.reason, "concurrent_create_conflict");
});

run("duplicate canonical WAS is an error", () => {
  const report = auditSetupState({
    enrollments: [{ id: "recEnr1" }],
    submissions: [{ id: "recSub1" }],
    weeklySummaries: [
      { id: "recWas1", enrollmentId: "recEnr1", weekId: "recWeek1" },
      { id: "recWas2", enrollmentId: "recEnr1", weekId: "recWeek1" },
    ],
    ownership: [
      { function: "canonical_was_create", owner: "031" },
      { function: "submission_base_xp", owner: "010" },
      { function: "weekly_goal_link", owner: "032" },
      { function: "weekly_email_schedule", owner: "118" },
    ],
  });
  assert.ok(report.findings.some((f) => f.code === "duplicate_canonical_was"));
});

run("scheduled run with zero eligible records is skipped", () => {
  const result = resolveScheduledRun({ eligibleRecords: [], dryRun: true, emailPathEnabled: false });
  assert.strictEqual(result.status, "skipped");
  assert.strictEqual(result.reason, "zero_eligible_records");
});

run("scheduled run blocks when email path is enabled during integrity test", () => {
  const result = resolveScheduledRun({
    eligibleRecords: [{ id: "recWas1" }],
    dryRun: true,
    emailPathEnabled: true,
  });
  assert.strictEqual(result.status, "error");
  assert.strictEqual(result.reason, "email_path_must_be_disabled");
});

run("canonical WAS key uses enrollment and week record ids", () => {
  assert.strictEqual(canonicalWasKey("recEnr1", "recWeek1"), "recEnr1|recWeek1");
});

console.log(`\n${7} tests passed`);

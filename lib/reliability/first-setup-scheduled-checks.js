/**
 * PKG-039 offline contracts for first-record and scheduled-check behavior.
 * Pure Node — no Airtable writes.
 */
"use strict";

const FIRST_RECORD_MILESTONES = Object.freeze([
  "first_enrollment",
  "first_submission",
  "first_xp_event",
  "first_weekly_summary",
]);

const SCHEDULED_JOBS = Object.freeze([
  { id: "041", cadence: "every_15_minutes", table: "Enrollments", createsRecords: false },
  { id: "056", cadence: "daily", table: "Enrollments", createsRecords: false },
  { id: "118", cadence: "weekly_sunday_05_denver", table: "Weeks", createsRecords: false },
  { id: "119", cadence: "weekly_sunday_10_denver", table: "Weeks", createsRecords: false },
]);

const OWNERS = Object.freeze({
  firstEnrollment: { automation: "001", writers: ["001"], consumers: ["002", "041"] },
  firstSubmission: {
    automation: "031",
    writers: ["023", "005", "007", "009", "031"],
    consumers: ["010", "076", "053"],
  },
  firstXpEvent: {
    automation: "010",
    writers: ["010", "065", "114", "054", "059", "035", "101"],
    consumers: ["041", "042"],
  },
  firstWeeklySummary: {
    automation: "031",
    writers: ["031"],
    consumers: ["032", "033", "035", "057", "072", "118"],
  },
});

function assertRecordId(value, label) {
  const id = String(value || "").trim();
  if (!id.startsWith("rec")) {
    throw new Error(`${label} must be a non-empty Airtable record id`);
  }
  return id;
}

function canonicalWasKey(enrollmentId, weekId) {
  return `${assertRecordId(enrollmentId, "enrollmentId")}|${assertRecordId(weekId, "weekId")}`;
}

function resolveFirstCreate({ existingCount, eligible, writerReady, concurrentStarts = 1 }) {
  if (!eligible) return { status: "skipped", reason: "ineligible" };
  if (!writerReady) return { status: "error", reason: "writer_not_ready" };
  if (existingCount > 1) return { status: "error", reason: "duplicate_canonical_identity" };
  if (existingCount === 1) return { status: "reused", reason: "canonical_exists" };
  if (concurrentStarts > 1) {
    return { status: "error", reason: "concurrent_create_conflict" };
  }
  return { status: "created", reason: "first_record" };
}

function resolveScheduledRun({ eligibleRecords, dryRun, emailPathEnabled }) {
  if (!Array.isArray(eligibleRecords)) {
    throw new Error("eligibleRecords must be an array");
  }
  if (eligibleRecords.length === 0) {
    return { status: "skipped", armed: 0, reason: "zero_eligible_records" };
  }
  if (eligibleRecords.length > 1 && dryRun !== true) {
    return {
      status: "error",
      armed: 0,
      reason: "multiple_eligible_without_dry_run_guard",
    };
  }
  if (emailPathEnabled) {
    return { status: "error", armed: 0, reason: "email_path_must_be_disabled" };
  }
  return {
    status: dryRun ? "dry_run" : "armed",
    armed: eligibleRecords.length,
    reason: eligibleRecords.length === 1 ? "one_eligible_record" : "dry_run_multi_scan",
  };
}

function auditSetupState({
  enrollments = [],
  submissions = [],
  xpEvents = [],
  weeklySummaries = [],
  ownership = [],
}) {
  const findings = [];
  const add = (code, severity, detail) => findings.push({ code, severity, detail });

  if (enrollments.length === 0) add("setup_no_enrollments", "info", "No enrollments in scope");
  if (submissions.length === 0 && enrollments.length > 0) {
    add("setup_no_submissions", "warn", "Enrollment exists without submissions");
  }
  if (xpEvents.length === 0 && submissions.length > 0) {
    add("setup_no_xp_events", "warn", "Submissions exist without XP events");
  }
  if (weeklySummaries.length === 0 && submissions.length > 0) {
    add("setup_no_weekly_summaries", "warn", "Submissions exist without canonical WAS");
  }

  const wasPairs = new Map();
  for (const summary of weeklySummaries) {
    const key = canonicalWasKey(summary.enrollmentId, summary.weekId);
    wasPairs.set(key, [...(wasPairs.get(key) || []), summary.id]);
  }
  for (const [key, ids] of wasPairs.entries()) {
    if (ids.length > 1) {
      add("duplicate_canonical_was", "error", { key, ids });
    }
  }

  const ownerByFunction = new Map(ownership.map((row) => [row.function, row.owner]));
  const requiredOwners = [
    ["canonical_was_create", "031"],
    ["submission_base_xp", "010"],
    ["weekly_goal_link", "032"],
    ["weekly_email_schedule", "118"],
  ];
  for (const [fn, expected] of requiredOwners) {
    const actual = ownerByFunction.get(fn);
    if (!actual) add("missing_ownership", "error", { function: fn, expected });
    else if (actual !== expected) add("wrong_ownership", "error", { function: fn, expected, actual });
  }

  const duplicateWork = ownership.filter(
    (row, index, all) => all.filter((other) => other.function === row.function).length > 1,
  );
  for (const row of duplicateWork) {
    add("duplicate_ownership", "error", { function: row.function, owner: row.owner });
  }

  return {
    audit: "PKG-039-first-setup-scheduled-checks",
    readOnly: true,
    counts: {
      enrollments: enrollments.length,
      submissions: submissions.length,
      xpEvents: xpEvents.length,
      weeklySummaries: weeklySummaries.length,
      findings: findings.length,
    },
    findings,
  };
}

module.exports = {
  FIRST_RECORD_MILESTONES,
  SCHEDULED_JOBS,
  OWNERS,
  assertRecordId,
  canonicalWasKey,
  resolveFirstCreate,
  resolveScheduledRun,
  auditSetupState,
};

/**
 * Expected-versus-actual verification helpers (read-only evaluation).
 *
 * Accepts already-fetched Airtable-shaped records (or offline fixtures).
 * Does not write to Airtable. Produces structured JSON check results.
 *
 * Statuses: PASS | FAIL | BLOCKED | NOT_TESTED | MANUAL_REQUIRED
 */

"use strict";

const STATUSES = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  BLOCKED: "BLOCKED",
  NOT_TESTED: "NOT_TESTED",
  MANUAL_REQUIRED: "MANUAL_REQUIRED",
});

function linkIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : v && v.id))
      .filter(Boolean);
  }
  if (typeof value === "object" && value.id) return [value.id];
  return [];
}

function field(record, name) {
  if (!record) return undefined;
  if (record.fields && Object.prototype.hasOwnProperty.call(record.fields, name)) {
    return record.fields[name];
  }
  return record[name];
}

function makeCheck({
  id,
  table = null,
  field: fieldName = null,
  expected,
  actual,
  status,
  record_ids = [],
  probable_cause = null,
  suggested_next_action = null,
  notes = null,
}) {
  return {
    id,
    status,
    table,
    field: fieldName,
    expected,
    actual,
    record_ids,
    probable_cause,
    suggested_next_action,
    notes,
  };
}

function compareEqual(id, { table, field: fieldName, expected, actual, record_ids = [] }) {
  const pass = Object.is(expected, actual) || expected === actual;
  if (pass) {
    return makeCheck({
      id,
      table,
      field: fieldName,
      expected,
      actual,
      status: STATUSES.PASS,
      record_ids,
    });
  }
  return makeCheck({
    id,
    table,
    field: fieldName,
    expected,
    actual,
    status: STATUSES.FAIL,
    record_ids,
    probable_cause: "Value mismatch",
    suggested_next_action: "Inspect record in Airtable; re-run production writer if safe",
  });
}

function compareIncludes(id, { table, field: fieldName, expectedId, actualLinks, record_ids = [] }) {
  const ids = linkIds(actualLinks);
  if (ids.includes(expectedId)) {
    return makeCheck({
      id,
      table,
      field: fieldName,
      expected: expectedId,
      actual: ids,
      status: STATUSES.PASS,
      record_ids,
    });
  }
  return makeCheck({
    id,
    table,
    field: fieldName,
    expected: expectedId,
    actual: ids,
    status: STATUSES.FAIL,
    record_ids,
    probable_cause: "Expected linked record missing",
    suggested_next_action: "Check upstream automation that owns this link field",
  });
}

function compareCount(id, { table, expected, actual, record_ids = [] }) {
  return compareEqual(id, {
    table,
    field: "count",
    expected,
    actual,
    record_ids,
  });
}

function compareUnique(id, { table, key, groups, record_ids = [] }) {
  const duplicates = Object.entries(groups || {}).filter(([, ids]) => ids.length > 1);
  if (duplicates.length === 0) {
    return makeCheck({
      id,
      table,
      field: key,
      expected: "unique",
      actual: "unique",
      status: STATUSES.PASS,
      record_ids,
    });
  }
  return makeCheck({
    id,
    table,
    field: key,
    expected: "unique",
    actual: duplicates.map(([k, ids]) => ({ key: k, ids })),
    status: STATUSES.FAIL,
    record_ids: duplicates.flatMap(([, ids]) => ids),
    probable_cause: "Duplicate records for uniqueness contract",
    suggested_next_action: "Stop writers; dedupe manually; add guard before re-enable",
  });
}

/**
 * Verify a Daily Submission happy-path bundle.
 *
 * @param {object} input
 * @param {object} input.scenario - Testing Scenarios record
 * @param {object|null} input.submission - created Submission
 * @param {object[]} input.xpEvents - XP Events linked to submission
 * @param {object[]} input.wasRecords - WAS for enrollment+week
 * @param {object} [input.expect]
 */
function verifyDailySubmissionBundle(input) {
  const {
    scenario,
    submission,
    xpEvents = [],
    wasRecords = [],
    expect = {},
  } = input;

  const checks = [];
  const enrollmentId = expect.enrollmentId || "recgP9qZYjAhE7NXm";
  const shotTotal = expect.shotTotal ?? 25;
  const xpAmount = expect.xpAmount ?? 20;
  const sourcePrefix = "SUBMISSION_XP|";

  if (!scenario) {
    checks.push(
      makeCheck({
        id: "scenario.exists",
        table: "Testing Scenarios",
        expected: "present",
        actual: null,
        status: STATUSES.BLOCKED,
        probable_cause: "Scenario record not provided",
        suggested_next_action: "Pass scenario record into verifier",
      })
    );
    return summarize(checks, { kind: "daily_submission_bundle" });
  }

  const scenarioId = scenario.id || scenario.recordId;
  const lastRun = field(scenario, "Last Run Status");
  checks.push(
    compareEqual("scenario.last_run_status", {
      table: "Testing Scenarios",
      field: "Last Run Status",
      expected: expect.lastRunStatus || "Pass",
      actual: typeof lastRun === "object" && lastRun ? lastRun.name : lastRun,
      record_ids: [scenarioId],
    })
  );

  const runTest = field(scenario, "Run Test?");
  checks.push(
    compareEqual("scenario.run_test_cleared", {
      table: "Testing Scenarios",
      field: "Run Test?",
      expected: false,
      actual: Boolean(runTest),
      record_ids: [scenarioId],
    })
  );

  const linked = linkIds(field(scenario, "Linked Submission"));
  if (expect.mode === "dry_run") {
    checks.push(
      compareCount("submission.count_dry_run", {
        table: "Submissions",
        expected: 0,
        actual: submission ? 1 : 0,
        record_ids: [scenarioId],
      })
    );
    checks.push(
      makeCheck({
        id: "xp.not_created_by_115",
        table: "XP Events",
        expected: 0,
        actual: xpEvents.length,
        status: xpEvents.length === 0 ? STATUSES.PASS : STATUSES.FAIL,
        record_ids: xpEvents.map((e) => e.id).filter(Boolean),
        probable_cause: xpEvents.length ? "Unexpected XP on dry run" : null,
        suggested_next_action: xpEvents.length ? "Investigate writer; dry run must not award XP" : null,
      })
    );
    return summarize(checks, { kind: "daily_submission_bundle", mode: "dry_run" });
  }

  if (!submission) {
    checks.push(
      makeCheck({
        id: "submission.exists",
        table: "Submissions",
        expected: "present",
        actual: null,
        status: STATUSES.FAIL,
        record_ids: linked,
        probable_cause: "Linked Submission missing or not fetched",
        suggested_next_action: "Fetch Linked Submission; re-run 115 live if safe",
      })
    );
    return summarize(checks, { kind: "daily_submission_bundle" });
  }

  const submissionId = submission.id || submission.recordId;
  checks.push(
    compareIncludes("scenario.linked_submission", {
      table: "Testing Scenarios",
      field: "Linked Submission",
      expectedId: submissionId,
      actualLinks: field(scenario, "Linked Submission"),
      record_ids: [scenarioId, submissionId],
    })
  );
  checks.push(
    compareIncludes("submission.enrollment", {
      table: "Submissions",
      field: "Enrollment",
      expectedId: enrollmentId,
      actualLinks: field(submission, "Enrollment"),
      record_ids: [submissionId],
    })
  );

  const actualShots = field(submission, "Shot Total");
  checks.push(
    compareEqual("submission.shot_total", {
      table: "Submissions",
      field: "Shot Total",
      expected: shotTotal,
      actual: actualShots,
      record_ids: [submissionId],
    })
  );

  const dupStatus = field(submission, "Duplicate Review Status");
  const dupName = typeof dupStatus === "object" && dupStatus ? dupStatus.name : dupStatus;
  if (expect.requireCountIt !== false) {
    checks.push(
      compareEqual("submission.duplicate_review_status", {
        table: "Submissions",
        field: "Duplicate Review Status",
        expected: "Count It",
        actual: dupName,
        record_ids: [submissionId],
      })
    );
  }

  const weekIds = linkIds(field(submission, "Week"));
  if (expect.requireWeek) {
    checks.push(
      makeCheck({
        id: "submission.week",
        table: "Submissions",
        field: "Week",
        expected: "non-empty",
        actual: weekIds,
        status: weekIds.length ? STATUSES.PASS : STATUSES.FAIL,
        record_ids: [submissionId, ...weekIds],
        probable_cause: weekIds.length ? null : "005 did not assign Week (missing seeded Week?)",
        suggested_next_action: weekIds.length
          ? null
          : "Seed Week covering Activity Date; do not auto-generate Weeks",
      })
    );
  } else if (!weekIds.length) {
    checks.push(
      makeCheck({
        id: "submission.week",
        table: "Submissions",
        field: "Week",
        expected: "optional",
        actual: weekIds,
        status: STATUSES.NOT_TESTED,
        record_ids: [submissionId],
        notes: "Week not required by this expectation set",
      })
    );
  }

  const expectedSourceKey = `${sourcePrefix}${submissionId}`;
  const matchingXp = xpEvents.filter((e) => field(e, "Source Key") === expectedSourceKey);
  checks.push(
    compareCount("xp.count_for_submission_source_key", {
      table: "XP Events",
      expected: expect.expectXp === false ? 0 : 1,
      actual: matchingXp.length,
      record_ids: matchingXp.map((e) => e.id).filter(Boolean),
    })
  );

  if (matchingXp.length === 1 && expect.expectXp !== false) {
    const xp = matchingXp[0];
    const points = field(xp, "XP Points") ?? field(xp, "Active XP Points");
    checks.push(
      compareEqual("xp.amount", {
        table: "XP Events",
        field: "XP Points",
        expected: xpAmount,
        actual: points,
        record_ids: [xp.id],
      })
    );
    checks.push(
      compareEqual("xp.source_key", {
        table: "XP Events",
        field: "Source Key",
        expected: expectedSourceKey,
        actual: field(xp, "Source Key"),
        record_ids: [xp.id],
      })
    );
  }

  if (expect.requireWas !== false && weekIds.length) {
    const wasGroups = {};
    for (const w of wasRecords) {
      const enr = linkIds(field(w, "Enrollment"))[0] || "";
      const week = linkIds(field(w, "Week"))[0] || "";
      const key = `${enr}|${week}`;
      wasGroups[key] = wasGroups[key] || [];
      wasGroups[key].push(w.id);
    }
    checks.push(
      compareUnique("was.unique_enrollment_week", {
        table: "Weekly Athlete Summary",
        key: "Enrollment|Week",
        groups: wasGroups,
        record_ids: wasRecords.map((w) => w.id),
      })
    );
    const targetKey = `${enrollmentId}|${weekIds[0]}`;
    const target = wasGroups[targetKey] || [];
    checks.push(
      compareCount("was.count_for_enrollment_week", {
        table: "Weekly Athlete Summary",
        expected: 1,
        actual: target.length,
        record_ids: target,
      })
    );
  }

  // Prohibited: more than one XP Event attached to submission regardless of key
  if (expect.expectXp !== false) {
    checks.push(
      makeCheck({
        id: "xp.no_duplicate_events_on_submission",
        table: "XP Events",
        field: "Submission link count",
        expected: "<=1 Submission Base event",
        actual: xpEvents.length,
        status: xpEvents.length <= 1 ? STATUSES.PASS : STATUSES.FAIL,
        record_ids: xpEvents.map((e) => e.id).filter(Boolean),
        probable_cause: xpEvents.length > 1 ? "Multiple XP Events on one Submission" : null,
        suggested_next_action:
          xpEvents.length > 1 ? "Audit Source Keys; keep one SUBMISSION_XP|{rid}" : null,
      })
    );
  }

  return summarize(checks, {
    kind: "daily_submission_bundle",
    scenario_id: scenarioId,
    submission_id: submissionId,
  });
}

function summarize(checks, meta = {}) {
  const counts = {
    PASS: 0,
    FAIL: 0,
    BLOCKED: 0,
    NOT_TESTED: 0,
    MANUAL_REQUIRED: 0,
  };
  for (const c of checks) {
    counts[c.status] = (counts[c.status] || 0) + 1;
  }
  let overall = STATUSES.PASS;
  if (counts.FAIL > 0) overall = STATUSES.FAIL;
  else if (counts.BLOCKED > 0) overall = STATUSES.BLOCKED;
  else if (counts.MANUAL_REQUIRED > 0) overall = STATUSES.MANUAL_REQUIRED;
  else if (counts.PASS === 0 && counts.NOT_TESTED > 0) overall = STATUSES.NOT_TESTED;

  return {
    overall,
    meta,
    counts,
    checks,
    generated_at: new Date().toISOString(),
    read_only: true,
  };
}

/**
 * Scan XP Events for blank / duplicate Source Keys (read-only).
 */
function verifyXpIdempotencyInventory(xpEvents = []) {
  const checks = [];
  const byKey = {};
  let blank = 0;
  for (const e of xpEvents) {
    const key = String(field(e, "Source Key") || "").trim();
    if (!key) {
      blank += 1;
      continue;
    }
    byKey[key] = byKey[key] || [];
    byKey[key].push(e.id);
  }
  checks.push(
    compareCount("xp.blank_source_keys", {
      table: "XP Events",
      expected: 0,
      actual: blank,
      record_ids: xpEvents.filter((e) => !String(field(e, "Source Key") || "").trim()).map((e) => e.id),
    })
  );
  checks.push(
    compareUnique("xp.unique_source_keys", {
      table: "XP Events",
      key: "Source Key",
      groups: byKey,
    })
  );
  return summarize(checks, { kind: "xp_idempotency_inventory", total: xpEvents.length });
}

/**
 * Build expected Source Key for known XP sources (contract mirror).
 */
function expectedSourceKey(source, parts = {}) {
  switch (source) {
    case "Submission Base":
      return `SUBMISSION_XP|${parts.submissionId || ""}`;
    case "Homework Completion":
      return `HOMEWORK_XP|${parts.homeworkCompletionId || ""}`;
    case "Video Feedback":
      return `VIDEO_SUBMISSION|${parts.videoFeedbackId || ""}`;
    case "Zoom Attendance":
      return `ZOOM_ATTEND_BASE|${parts.meetingId || ""}|${parts.enrollmentId || ""}`;
    case "Zoom Recording Credit":
      return `ZOOM_CREDIT|${parts.enrollmentId || ""}|${parts.meetingId || ""}`;
    case "Streak":
      return `STREAK_XP|${parts.enrollmentId || ""}|${parts.achievementId || ""}|${parts.streakEndDate || ""}`;
    case "Shot Milestone":
      return `SHOT_MILESTONE|${parts.enrollmentId || ""}|${parts.shotMilestoneId || ""}`;
    case "Perfect Week":
      return `PERFECT_WEEK|${parts.enrollmentId || ""}|${parts.weekId || ""}`;
    case "Weekly Threshold":
      return parts.sourceKey || null;
    case "Manual Bonus":
      return parts.sourceKey || null;
    default:
      return null;
  }
}

export {
  STATUSES,
  linkIds,
  field,
  makeCheck,
  compareEqual,
  compareIncludes,
  compareCount,
  compareUnique,
  verifyDailySubmissionBundle,
  verifyXpIdempotencyInventory,
  expectedSourceKey,
  summarize,
};

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

/**
 * Verify permanent Schmidt testing identity + pipeline links (read-only).
 */
function verifySchmidtIdentity(input = {}) {
  const {
    athlete,
    enrollment,
    foundationWeek = null,
    scenario = null,
    submissions = [],
    wasRecords = [],
    xpBySubmission = [],
    homeworkCompletion = null,
    homeworkXp = null,
    videoFeedbackIds = [],
    zoomAttendanceIds = [],
    expect = {},
  } = input;

  const checks = [];
  const athleteId = expect.athleteId || "recgqVstObQRzgXJF";
  const enrollmentId = expect.enrollmentId || "recgP9qZYjAhE7NXm";
  const foundationWeekId = expect.foundationWeekId || "recVDKiYATgzsfpmE";

  if (!athlete) {
    checks.push(
      makeCheck({
        id: "athlete.exists",
        table: "Athletes",
        expected: athleteId,
        actual: null,
        status: STATUSES.FAIL,
        probable_cause: "Schmidt athlete missing",
        suggested_next_action: "Recreate Testing Schmidt athlete in PROD",
      })
    );
  } else {
    checks.push(
      compareEqual("athlete.id", {
        table: "Athletes",
        field: "id",
        expected: athleteId,
        actual: athlete.id,
        record_ids: [athlete.id],
      })
    );
    const active = field(athlete, "Active?");
    checks.push(
      compareEqual("athlete.active", {
        table: "Athletes",
        field: "Active?",
        expected: true,
        actual: Boolean(active),
        record_ids: [athlete.id],
      })
    );
  }

  if (!enrollment) {
    checks.push(
      makeCheck({
        id: "enrollment.exists",
        table: "Enrollments",
        expected: enrollmentId,
        actual: null,
        status: STATUSES.FAIL,
        probable_cause: "Schmidt enrollment missing",
        suggested_next_action: "Recreate Schmidt testing enrollment",
      })
    );
    return summarize(checks, { kind: "schmidt_identity" });
  }

  checks.push(
    compareEqual("enrollment.id", {
      table: "Enrollments",
      field: "id",
      expected: enrollmentId,
      actual: enrollment.id,
      record_ids: [enrollment.id],
    })
  );
  checks.push(
    compareIncludes("enrollment.athlete", {
      table: "Enrollments",
      field: "Athlete",
      expectedId: athleteId,
      actualLinks: field(enrollment, "Athlete"),
      record_ids: [enrollment.id, athleteId],
    })
  );
  if (expect.requireActiveEnrollment !== false) {
    checks.push(
      compareEqual("enrollment.active", {
        table: "Enrollments",
        field: "Active?",
        expected: true,
        actual: Boolean(field(enrollment, "Active?")),
        record_ids: [enrollment.id],
      })
    );
  }

  const band = linkIds(field(enrollment, "Grade Band"));
  checks.push(
    makeCheck({
      id: "enrollment.grade_band",
      table: "Enrollments",
      field: "Grade Band",
      expected: "non-empty",
      actual: band,
      status: band.length ? STATUSES.PASS : STATUSES.FAIL,
      record_ids: [enrollment.id, ...band],
      probable_cause: band.length ? null : "Grade Band missing on Schmidt enrollment",
      suggested_next_action: band.length ? null : "Run/repair grade-band assignment (003)",
    })
  );

  if (foundationWeek) {
    checks.push(
      compareEqual("foundation_week.id", {
        table: "Weeks",
        field: "id",
        expected: foundationWeekId,
        actual: foundationWeek.id,
        record_ids: [foundationWeek.id],
      })
    );
  } else {
    checks.push(
      makeCheck({
        id: "foundation_week.id",
        table: "Weeks",
        expected: foundationWeekId,
        actual: null,
        status: STATUSES.FAIL,
        probable_cause: "Foundation week missing",
        suggested_next_action: "Reseed foundation week or update verifier IDs",
      })
    );
  }

  checks.push(
    makeCheck({
      id: "submission_path.count",
      table: "Submissions",
      expected: ">=1",
      actual: submissions.length,
      status: submissions.length >= 1 ? STATUSES.PASS : STATUSES.FAIL,
      record_ids: submissions.map((s) => s.id).filter(Boolean),
      probable_cause: submissions.length ? null : "No Schmidt submissions linked on enrollment",
      suggested_next_action: submissions.length ? null : "Run 115 live or create Fillout-shaped submission",
    })
  );

  let countedWithXp = 0;
  let countedWithoutXp = 0;
  for (const row of xpBySubmission) {
    const sub = submissions.find((s) => s.id === row.submissionId);
    const countIt =
      Boolean(field(sub, "Count This Submission?")) ||
      String(
        typeof field(sub, "Duplicate Review Status") === "object"
          ? field(sub, "Duplicate Review Status")?.name
          : field(sub, "Duplicate Review Status") || ""
      ) === "Count It";
    const xpCount = (row.events || []).length;
    if (countIt) {
      if (xpCount === 1) countedWithXp += 1;
      else countedWithoutXp += 1;
    }
  }
  checks.push(
    makeCheck({
      id: "xp_path.counted_submissions_have_one_event",
      table: "XP Events",
      expected: "each counted submission has exactly one SUBMISSION_XP|{id}",
      actual: { countedWithXp, countedWithoutXp },
      status: countedWithoutXp === 0 && countedWithXp >= 1 ? STATUSES.PASS : countedWithXp >= 1 ? STATUSES.FAIL : STATUSES.NOT_TESTED,
      record_ids: xpBySubmission.flatMap((r) => (r.events || []).map((e) => e.id)),
      probable_cause: countedWithoutXp ? "Counted submission missing Submission Base XP" : null,
      suggested_next_action: countedWithoutXp ? "Re-run 010 on affected Submission only" : null,
    })
  );

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
  checks.push(
    makeCheck({
      id: "was_path.linked_from_enrollment",
      table: "Weekly Athlete Summary",
      expected: ">=1",
      actual: wasRecords.length,
      status: wasRecords.length >= 1 ? STATUSES.PASS : STATUSES.FAIL,
      record_ids: wasRecords.map((w) => w.id),
      probable_cause: wasRecords.length ? null : "No WAS linked on Schmidt enrollment",
      suggested_next_action: wasRecords.length ? null : "Run WAS builder (031) for a counted Schmidt submission week",
    })
  );

  if (homeworkCompletion) {
    checks.push(
      compareIncludes("homework.enrollment", {
        table: "Homework Completions",
        field: "Enrollment",
        expectedId: enrollmentId,
        actualLinks: field(homeworkCompletion, "Enrollment"),
        record_ids: [homeworkCompletion.id],
      })
    );
    const expectedHwKey = expectedSourceKey("Homework Completion", {
      homeworkCompletionId: homeworkCompletion.id,
    });
    const hwXpKey = homeworkXp ? field(homeworkXp, "Source Key") : null;
    if (field(homeworkCompletion, "Satisfactory?") && field(homeworkCompletion, "Award Status") === "Awarded") {
      checks.push(
        compareEqual("homework.xp_source_key", {
          table: "XP Events",
          field: "Source Key",
          expected: expectedHwKey,
          actual: hwXpKey,
          record_ids: [homeworkCompletion.id, homeworkXp?.id].filter(Boolean),
        })
      );
    } else {
      checks.push(
        makeCheck({
          id: "homework.xp_source_key",
          table: "XP Events",
          expected: expectedHwKey,
          actual: hwXpKey,
          status: STATUSES.NOT_TESTED,
          record_ids: [homeworkCompletion.id],
          notes: "Homework not in Awarded/Satisfactory state for XP assert",
        })
      );
    }
  } else {
    checks.push(
      makeCheck({
        id: "homework.path",
        table: "Homework Completions",
        expected: "optional live proof",
        actual: null,
        status: STATUSES.NOT_TESTED,
        notes: "No homework completion provided to verifier",
      })
    );
  }

  checks.push(
    makeCheck({
      id: "video.path_presence",
      table: "Video Feedback",
      expected: ">=0 linked rows (presence check)",
      actual: videoFeedbackIds.length,
      status: videoFeedbackIds.length >= 1 ? STATUSES.PASS : STATUSES.NOT_TESTED,
      record_ids: videoFeedbackIds,
      notes: videoFeedbackIds.length ? null : "No Video Feedback linked yet",
    })
  );
  checks.push(
    makeCheck({
      id: "zoom.path_presence",
      table: "Zoom Attendance",
      expected: ">=0 linked rows (presence check)",
      actual: zoomAttendanceIds.length,
      status: zoomAttendanceIds.length >= 1 ? STATUSES.PASS : STATUSES.NOT_TESTED,
      record_ids: zoomAttendanceIds,
      notes: zoomAttendanceIds.length ? null : "No Zoom Attendance linked yet",
    })
  );

  if (scenario) {
    checks.push(
      compareIncludes("scenario.related_enrollment", {
        table: "Testing Scenarios",
        field: "Related Enrollment",
        expectedId: enrollmentId,
        actualLinks: field(scenario, "Related Enrollment"),
        record_ids: [scenario.id],
      })
    );
  }

  if (expect.requirePublicStandingsVisibilityPolicy) {
    checks.push(
      makeCheck({
        id: "policy.schmidt_visible_on_standings",
        table: null,
        field: null,
        expected: "Schmidt remains visible on public standings",
        actual: "policy_keep_visible",
        status: STATUSES.PASS,
        notes:
          "Completion master SC-004: do not hide Schmidt unless Mike changes the decision. This check records policy compliance only.",
      })
    );
  }

  return summarize(checks, {
    kind: "schmidt_identity",
    enrollment_id: enrollmentId,
    athlete_id: athleteId,
  });
}

/**
 * Verify homework completion → XP bundle (read-only).
 */
function verifyHomeworkBundle(input = {}) {
  const {
    homeworkCompletion,
    xpEvents = [],
    expect = {},
  } = input;
  const checks = [];
  const enrollmentId = expect.enrollmentId || "recgP9qZYjAhE7NXm";

  if (!homeworkCompletion) {
    return summarize(
      [
        makeCheck({
          id: "homework.exists",
          table: "Homework Completions",
          expected: "present",
          actual: null,
          status: STATUSES.BLOCKED,
          probable_cause: "Homework Completion not provided",
          suggested_next_action: "Pass HC record into verifier",
        }),
      ],
      { kind: "homework_bundle" }
    );
  }

  const hcId = homeworkCompletion.id;
  checks.push(
    compareIncludes("homework.enrollment", {
      table: "Homework Completions",
      field: "Enrollment",
      expectedId: enrollmentId,
      actualLinks: field(homeworkCompletion, "Enrollment"),
      record_ids: [hcId],
    })
  );

  const expectedKey = expectedSourceKey("Homework Completion", { homeworkCompletionId: hcId });
  const matching = xpEvents.filter((e) => field(e, "Source Key") === expectedKey);
  const expectXp = expect.expectXp !== false && Boolean(field(homeworkCompletion, "Satisfactory?"));

  checks.push(
    compareCount("homework.xp_count_for_source_key", {
      table: "XP Events",
      expected: expectXp ? 1 : 0,
      actual: matching.length,
      record_ids: matching.map((e) => e.id),
    })
  );

  if (matching.length === 1 && expectXp) {
    const pts = field(matching[0], "XP Points") ?? field(matching[0], "Active XP Points");
    if (expect.xpAmount != null) {
      checks.push(
        compareEqual("homework.xp_amount", {
          table: "XP Events",
          field: "XP Points",
          expected: expect.xpAmount,
          actual: pts,
          record_ids: [matching[0].id],
        })
      );
    }
  }

  return summarize(checks, { kind: "homework_bundle", homework_completion_id: hcId });
}

/**
 * Verify video feedback presence / XP key when awarded (read-only).
 */
function verifyVideoFeedbackBundle(input = {}) {
  const { videoFeedback, xpEvents = [], expect = {} } = input;
  const checks = [];
  const enrollmentId = expect.enrollmentId || "recgP9qZYjAhE7NXm";

  if (!videoFeedback) {
    return summarize(
      [
        makeCheck({
          id: "video.exists",
          table: "Video Feedback",
          expected: "present",
          actual: null,
          status: STATUSES.NOT_TESTED,
          notes: "No Video Feedback record provided",
        }),
      ],
      { kind: "video_feedback_bundle" }
    );
  }

  const vfId = videoFeedback.id;
  checks.push(
    compareIncludes("video.enrollment", {
      table: "Video Feedback",
      field: "Enrollment",
      expectedId: enrollmentId,
      actualLinks: field(videoFeedback, "Enrollment"),
      record_ids: [vfId],
    })
  );

  const expectedKey = expectedSourceKey("Video Feedback", { videoFeedbackId: vfId });
  const matching = xpEvents.filter((e) => field(e, "Source Key") === expectedKey);
  if (expect.expectXp === true) {
    checks.push(
      compareCount("video.xp_count_for_source_key", {
        table: "XP Events",
        expected: 1,
        actual: matching.length,
        record_ids: matching.map((e) => e.id),
      })
    );
  } else {
    checks.push(
      makeCheck({
        id: "video.xp_count_for_source_key",
        table: "XP Events",
        expected: expect.expectXp === false ? 0 : "optional",
        actual: matching.length,
        status: STATUSES.NOT_TESTED,
        record_ids: matching.map((e) => e.id),
        notes: "Video XP assert skipped unless expect.expectXp=true",
      })
    );
  }

  return summarize(checks, { kind: "video_feedback_bundle", video_feedback_id: vfId });
}

/**
 * Verify Zoom attendance enrollment link / optional XP key (read-only).
 */
function verifyZoomAttendanceBundle(input = {}) {
  const { attendance, xpEvents = [], expect = {} } = input;
  const checks = [];
  const enrollmentId = expect.enrollmentId || "recgP9qZYjAhE7NXm";

  if (!attendance) {
    return summarize(
      [
        makeCheck({
          id: "zoom.exists",
          table: "Zoom Attendance",
          expected: "present",
          actual: null,
          status: STATUSES.NOT_TESTED,
          notes: "No Zoom Attendance record provided",
        }),
      ],
      { kind: "zoom_attendance_bundle" }
    );
  }

  const zaId = attendance.id;
  checks.push(
    compareIncludes("zoom.enrollment", {
      table: "Zoom Attendance",
      field: "Enrollment",
      expectedId: enrollmentId,
      actualLinks: field(attendance, "Enrollment"),
      record_ids: [zaId],
    })
  );

  const meetingId = linkIds(field(attendance, "Zoom Meeting"))[0];
  if (expect.expectXp === true && meetingId) {
    const expectedKey = expectedSourceKey("Zoom Attendance", {
      meetingId,
      enrollmentId,
    });
    const matching = xpEvents.filter((e) => field(e, "Source Key") === expectedKey);
    checks.push(
      compareCount("zoom.xp_count_for_source_key", {
        table: "XP Events",
        expected: 1,
        actual: matching.length,
        record_ids: matching.map((e) => e.id),
      })
    );
  } else {
    checks.push(
      makeCheck({
        id: "zoom.xp_count_for_source_key",
        table: "XP Events",
        expected: "optional",
        actual: (xpEvents || []).length,
        status: STATUSES.NOT_TESTED,
        record_ids: [zaId],
        notes: "Zoom XP assert skipped unless expect.expectXp=true and meeting linked",
      })
    );
  }

  return summarize(checks, { kind: "zoom_attendance_bundle", zoom_attendance_id: zaId });
}

/**
 * Documented decision: Pass/Fail writeback stays off unless a single writer is approved.
 */
function airtableWritebackPolicy() {
  return {
    enabled: false,
    mode: "read_only",
    reason:
      "Testing Scenarios Pass/Fail / Actual Result fields already have production writers (115 and operator edits). Automatic verifier writeback would create competing writers and ambiguous ownership.",
    allowed_when:
      "Mike explicitly designates one writeback owner automation/script and disables competing writers for those fields.",
  };
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
  verifySchmidtIdentity,
  verifyHomeworkBundle,
  verifyVideoFeedbackBundle,
  verifyZoomAttendanceBundle,
  airtableWritebackPolicy,
  expectedSourceKey,
  summarize,
};

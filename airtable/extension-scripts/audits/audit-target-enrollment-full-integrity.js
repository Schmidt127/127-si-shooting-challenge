/*
Extension Script: Target Enrollment — Full Integrity Audit
System: 127 SI Shooting Challenge
Purpose:
  Read-only deep audit for ONE enrollment: shot totals, submission counting,
  XP parity, and weekly rollups. Use when a parent reports missing shots/XP.

  Default target: Lyle Kimm (override ENROLLMENT_RECORD_ID or name filters below).

Business rules (shots):
  - Athletes MAY submit multiple times per calendar day (e.g. 450 morning + 300 evening).
  - Submissions.Duplicate Key = Enrollment | Activity Date | Stat Mode | shot stats.
  - Different shot totals on the same day => different Duplicate Keys => both can count.
  - Identical Duplicate Keys => flagged by automation 007 (Needs Review / Exclude It).
  - Exclude It is NOT assumed correct — this audit flags identical-key exclusions for review.

Schema gate: 20260629_045741
Default: read-only (no writes)
*/

// @ts-nocheck

const SCHEMA_SNAPSHOT = "20260629_045741";

/** Set to rec... to skip name search. */
const ENROLLMENT_RECORD_ID = "";

/** Name search when ENROLLMENT_RECORD_ID is empty. */
const FIRST_NAME_MATCH = "Lyle";
const LAST_NAME_MATCH = "Kimm";

const CONFIG = {
  scriptName: "audit-target-enrollment-full-integrity",
  version: "v1.1",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  tables: {
    enrollments: "Enrollments",
    submissions: "Submissions",
    weeks: "Weeks",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  enrollments: {
    active: "Active?",
    firstName: "Athlete First Name",
    lastName: "Athlete Last Name",
    fullName: "Full Athlete Name",
    fullNameBackward: "Full Athlete Name - Backward",
    parentEmail: "Parent Email - Cleaned",
    totalShotsCounted: "Total Shots Counted",
    totalShotsSubmitted: "Total Shots Submitted",
    lifetimeXpEarned: "Lifetime XP Earned",
    lifetimeXpTotal: "Lifetime XP Total",
    currentLevel: "Current Level",
    xpEvents: "XP Events",
    submissions: "Submissions",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    activityDate: "Activity Date",
    activityDateKey: "Activity Date Key",
    submittedAt: "Submitted At",
    duplicateKey: "Duplicate Key",
    countThisSubmission: "Count This Submission?",
    duplicateReviewStatus: "Duplicate Review Status",
    submissionStatMode: "Submission Stat Mode",
    detailedStatsValid: "Detailed Stats Valid?",
    shotTotal: "Shot Total",
    totalShotsCanonical: "Total Shots Canonical",
    totalShotsCounted: "Total Shots Counted",
    totalMakesCanonical: "Total Makes Canonical",
    totalMakesCounted: "Total Makes Counted",
    xpAwardStatus: "XP Award Status",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  weeks: {
    weekName: "Week Name",
    weekNumber: "Week Number",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
    weekDisplay: "Week - Display",
    totalShotsThisWeek: "Total Shots This Week",
    xpEarnedThisWeek: "XP Earned This Week",
    totalXpAfterWeek: "Total XP After Week",
  },

  xpEvents: {
    sourceKey: "Source Key",
    submission: "Submission",
    enrollment: "Enrollment",
    xpPoints: "XP Points",
    activeXpPoints: "Active XP Points",
    active: "Active?",
    duplicateStatus: "Duplicate Status",
    xpSource: "XP Source",
  },

  values: {
    submissionXpPrefix: "SUBMISSION_XP|",
    xpAwarded: "Awarded",
    duplicateExclude: "Exclude It",
    duplicateNeedsReview: "Needs Review",
    duplicateCountIt: "Count It",
  },
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function getText(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : getText(record, table, fieldName);
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getNumberish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(
    String(record.getCellValueAsString(fieldName) || "").replace(/,/g, "")
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBooleanish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function inferCountExclusionReason(submission, submissionsTable) {
  const countThis = getNumberish(
    submission,
    submissionsTable,
    CONFIG.submissions.countThisSubmission
  );
  if (countThis === 1) return "";

  const duplicateReview = getSelectName(
    submission,
    submissionsTable,
    CONFIG.submissions.duplicateReviewStatus
  );
  if (
    duplicateReview === CONFIG.values.duplicateExclude ||
    duplicateReview === CONFIG.values.duplicateNeedsReview
  ) {
    return `duplicate_review_${duplicateReview.toLowerCase().replace(/\s+/g, "_")}`;
  }

  const statMode = getSelectName(
    submission,
    submissionsTable,
    CONFIG.submissions.submissionStatMode
  );
  const shotTotal = getNumberish(submission, submissionsTable, CONFIG.submissions.shotTotal);
  const detailedValid = getBooleanish(
    submission,
    submissionsTable,
    CONFIG.submissions.detailedStatsValid
  );

  if (!statMode) return "missing_submission_stat_mode";

  if (statMode === "Simple Total") {
    if (shotTotal === 0 && getText(submission, submissionsTable, CONFIG.submissions.shotTotal) === "") {
      return "simple_total_missing_shot_total";
    }
    if (shotTotal < 0) return "simple_total_negative_shots";
    return "simple_total_not_counted_unknown";
  }

  if (statMode === "Detailed Shooting") {
    if (!detailedValid) return "detailed_stats_invalid";
    return "detailed_not_counted_unknown";
  }

  return "count_this_submission_zero";
}

function classifyDuplicateExclusion(row, allRows, byDuplicateKey) {
  if (row.countThis || row.shotsCanonical <= 0) return null;

  const status = row.duplicateReviewStatus;

  if (status === CONFIG.values.duplicateNeedsReview) {
    return {
      classification: "needs_review_open",
      recommendedAction: "resolve_needs_review",
      explanation:
        "Duplicate Review Status is Needs Review — not yet resolved to Count It or Exclude It.",
      potentiallyRecoverableShots: row.shotsCanonical,
      siblingCountedSubmissionIds: [],
    };
  }

  if (status !== CONFIG.values.duplicateExclude) return null;

  const duplicateKey = row.duplicateKey;
  const sameKeyRows = duplicateKey ? byDuplicateKey.get(duplicateKey) || [] : [];
  const countedSameKey = sameKeyRows.filter(sibling => sibling.countThis);

  if (countedSameKey.length > 0) {
    return {
      classification: "identical_duplicate_key_excluded_while_sibling_counted",
      recommendedAction: "manual_review_may_need_count_it",
      explanation:
        "Same Duplicate Key as a counted submission (same calendar day + same shot stats). " +
        "If these were two real sessions with coincidentally identical totals, change Exclude It → Count It.",
      potentiallyRecoverableShots: row.shotsCanonical,
      siblingCountedSubmissionIds: countedSameKey.map(sibling => sibling.submissionId),
      duplicateKey,
    };
  }

  const sameDayRows = allRows.filter(
    sibling =>
      row.activityDateKey &&
      sibling.activityDateKey === row.activityDateKey &&
      sibling.submissionId !== row.submissionId
  );
  const countedSameDayDifferentKey = sameDayRows.filter(
    sibling => sibling.countThis && sibling.duplicateKey !== duplicateKey
  );

  if (countedSameDayDifferentKey.length > 0) {
    return {
      classification: "excluded_same_day_different_shot_total_exists",
      recommendedAction: "likely_false_exclude_review_count_it",
      explanation:
        "Excluded on a day that already has counted submission(s) with a different Duplicate Key (different shot total). " +
        "Multiple sessions per day are valid — this exclusion may be incorrect.",
      potentiallyRecoverableShots: row.shotsCanonical,
      siblingCountedSubmissionIds: countedSameDayDifferentKey.map(sibling => sibling.submissionId),
      duplicateKey,
    };
  }

  return {
    classification: "excluded_duplicate_key_no_counted_sibling",
    recommendedAction: "manual_review",
    explanation: "Excluded with no counted sibling sharing the same Duplicate Key.",
    potentiallyRecoverableShots: row.shotsCanonical,
    siblingCountedSubmissionIds: [],
    duplicateKey,
  };
}

function buildSameDayGroups(enrollmentSubmissions) {
  const byDay = new Map();

  for (const row of enrollmentSubmissions) {
    if (!row.activityDateKey) continue;
    if (!byDay.has(row.activityDateKey)) byDay.set(row.activityDateKey, []);
    byDay.get(row.activityDateKey).push(row);
  }

  const groups = [];

  for (const [activityDateKey, rows] of byDay.entries()) {
    if (rows.length < 2) continue;

    const duplicateKeys = [...new Set(rows.map(row => row.duplicateKey).filter(Boolean))];
    const shotTotals = [...new Set(rows.map(row => row.shotTotal))];
    const counted = rows.filter(row => row.countThis);
    const excludedWithShots = rows.filter(row => !row.countThis && row.shotsCanonical > 0);

    groups.push({
      activityDateKey,
      activityDate: rows[0]?.activityDate || "",
      submissionCount: rows.length,
      distinctDuplicateKeys: duplicateKeys.length,
      distinctShotTotals: shotTotals,
      countedSubmissionCount: counted.length,
      countedShots: counted.reduce((sum, row) => sum + row.shotsCounted, 0),
      excludedWithShotsCount: excludedWithShots.length,
      excludedShots: excludedWithShots.reduce((sum, row) => sum + row.shotsCanonical, 0),
      multipleSessionsPerDayAllowed:
        duplicateKeys.length > 1 || shotTotals.length > 1,
      submissions: rows.map(row => ({
        submissionId: row.submissionId,
        submittedAt: row.submittedAt,
        shotTotal: row.shotTotal,
        shotsCounted: row.shotsCounted,
        countThis: row.countThis,
        duplicateKey: row.duplicateKey,
        duplicateReviewStatus: row.duplicateReviewStatus,
        duplicateExcludeReview: row.duplicateExcludeReview || null,
      })),
    });
  }

  return groups.sort((a, b) => a.activityDateKey.localeCompare(b.activityDateKey));
}

function buildDuplicateKeyGroups(enrollmentSubmissions) {
  const byKey = new Map();

  for (const row of enrollmentSubmissions) {
    if (!row.duplicateKey) continue;
    if (!byKey.has(row.duplicateKey)) byKey.set(row.duplicateKey, []);
    byKey.get(row.duplicateKey).push(row);
  }

  const groups = [];

  for (const [duplicateKey, rows] of byKey.entries()) {
    if (rows.length < 2) continue;

    const counted = rows.filter(row => row.countThis);
    const excluded = rows.filter(row => !row.countThis);

    groups.push({
      duplicateKey,
      submissionCount: rows.length,
      countedSubmissionIds: counted.map(row => row.submissionId),
      excludedSubmissionIds: excluded.map(row => row.submissionId),
      shotTotal: rows[0]?.shotTotal ?? 0,
      activityDateKey: rows[0]?.activityDateKey || "",
      issue:
        counted.length > 0 && excluded.some(row => row.shotsCanonical > 0)
          ? "identical_key_mixed_count_and_exclude"
          : excluded.length === rows.length
            ? "identical_key_all_excluded"
            : "identical_key_needs_review",
      recommendedAction:
        counted.length > 0 && excluded.some(row => row.shotsCanonical > 0)
          ? "Review excluded rows — may be false duplicate if two real same-total sessions"
          : "manual_review",
      submissions: rows.map(row => ({
        submissionId: row.submissionId,
        submittedAt: row.submittedAt,
        countThis: row.countThis,
        duplicateReviewStatus: row.duplicateReviewStatus,
        shotsCanonical: row.shotsCanonical,
      })),
    });
  }

  return groups.sort((a, b) =>
    String(a.activityDateKey).localeCompare(String(b.activityDateKey))
  );
}

function getSubmissionBaseXpIds(submissionId, xpQuery, xpEventsTable, xpBySourceKey) {
  const expectedKey = `${CONFIG.values.submissionXpPrefix}${submissionId}`;
  const ids = new Set(xpBySourceKey.get(expectedKey) || []);

  for (const xp of xpQuery.records) {
    if (!getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.submission).includes(submissionId)) {
      continue;
    }
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (
      sourceKey === expectedKey ||
      sourceKey.startsWith(CONFIG.values.submissionXpPrefix)
    ) {
      ids.add(xp.id);
    }
  }
  return [...ids];
}

function classifySubmissionXpIssue(submission, submissionsTable, submissionBaseXpIds) {
  const countThis =
    getNumberish(submission, submissionsTable, CONFIG.submissions.countThisSubmission) === 1;
  if (!countThis) return null;

  const xpAwardStatus = getSelectName(
    submission,
    submissionsTable,
    CONFIG.submissions.xpAwardStatus
  );

  if (submissionBaseXpIds.length === 0) return "missing_submission_xp";
  if (submissionBaseXpIds.length > 1) return "duplicate_submission_base_xp";
  if (xpAwardStatus !== CONFIG.values.xpAwarded) return "xp_award_status_not_awarded";
  return null;
}

async function resolveEnrollment(enrollmentsTable) {
  if (ENROLLMENT_RECORD_ID && ENROLLMENT_RECORD_ID.startsWith("rec")) {
    const record = await enrollmentsTable.selectRecordAsync(ENROLLMENT_RECORD_ID);
    if (!record) throw new Error(`Enrollment not found: ${ENROLLMENT_RECORD_ID}`);
    return { enrollment: record, matchMode: "enrollment_record_id" };
  }

  const nameFields = [
    CONFIG.enrollments.firstName,
    CONFIG.enrollments.lastName,
    CONFIG.enrollments.fullName,
    CONFIG.enrollments.fullNameBackward,
    CONFIG.enrollments.active,
  ].filter(name => fieldExists(enrollmentsTable, name));

  const query = await enrollmentsTable.selectRecordsAsync({ fields: nameFields });
  const firstNeedle = normalizeName(FIRST_NAME_MATCH);
  const lastNeedle = normalizeName(LAST_NAME_MATCH);

  const matches = query.records.filter(record => {
    const first = normalizeName(getText(record, enrollmentsTable, CONFIG.enrollments.firstName));
    const last = normalizeName(getText(record, enrollmentsTable, CONFIG.enrollments.lastName));
    const full = normalizeName(getText(record, enrollmentsTable, CONFIG.enrollments.fullName));
    const backward = normalizeName(
      getText(record, enrollmentsTable, CONFIG.enrollments.fullNameBackward)
    );

    const firstOk = !firstNeedle || first.includes(firstNeedle) || full.includes(firstNeedle);
    const lastOk =
      !lastNeedle ||
      last.includes(lastNeedle) ||
      full.includes(lastNeedle) ||
      backward.includes(lastNeedle);

    return firstOk && lastOk;
  });

  if (matches.length === 0) {
    throw new Error(
      `No enrollment matched FIRST_NAME_MATCH="${FIRST_NAME_MATCH}" LAST_NAME_MATCH="${LAST_NAME_MATCH}". Set ENROLLMENT_RECORD_ID.`
    );
  }

  if (matches.length > 1) {
    return {
      enrollment: null,
      matchMode: "multiple_matches",
      candidates: matches.map(record => ({
        enrollmentId: record.id,
        firstName: getText(record, enrollmentsTable, CONFIG.enrollments.firstName),
        lastName: getText(record, enrollmentsTable, CONFIG.enrollments.lastName),
        fullName: getText(record, enrollmentsTable, CONFIG.enrollments.fullName),
        active: getBooleanish(record, enrollmentsTable, CONFIG.enrollments.active),
      })),
    };
  }

  return { enrollment: matches[0], matchMode: "name_search" };
}

async function main() {
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const resolved = await resolveEnrollment(enrollmentsTable);

  if (!resolved.enrollment) {
    const report = {
      script: CONFIG.scriptName,
      version: CONFIG.version,
      schemaSnapshot: SCHEMA_SNAPSHOT,
      dryRun: true,
      status: "needs_enrollment_record_id",
      matchMode: resolved.matchMode,
      search: { firstName: FIRST_NAME_MATCH, lastName: LAST_NAME_MATCH },
      candidates: resolved.candidates,
      nextSteps: "Set ENROLLMENT_RECORD_ID to one candidate and re-run.",
    };
    console.log("===== TARGET ENROLLMENT — FULL INTEGRITY AUDIT =====");
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const enrollment = resolved.enrollment;
  const enrollmentId = enrollment.id;

  const enrollmentFields = Object.values(CONFIG.enrollments).filter(name =>
    fieldExists(enrollmentsTable, name)
  );
  const enrollmentFresh = await enrollmentsTable.selectRecordAsync(enrollmentId, {
    fields: enrollmentFields,
  });

  const submissionFields = Object.values(CONFIG.submissions).filter(name =>
    fieldExists(submissionsTable, name)
  );
  const xpFields = Object.values(CONFIG.xpEvents).filter(name =>
    fieldExists(xpEventsTable, name)
  );
  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );
  const weekFields = Object.values(CONFIG.weeks).filter(name =>
    fieldExists(weeksTable, name)
  );

  const [submissionQuery, xpQuery, summaryQuery, weekQuery] = await Promise.all([
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
    weeksTable.selectRecordsAsync({ fields: weekFields }),
  ]);

  const weekById = new Map();
  for (const week of weekQuery.records) {
    weekById.set(week.id, {
      weekId: week.id,
      weekName: getText(week, weeksTable, CONFIG.weeks.weekName),
      weekNumber: getNumberish(week, weeksTable, CONFIG.weeks.weekNumber),
    });
  }

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
    xpBySourceKey.get(sourceKey).push(xp.id);
  }

  const enrollmentSubmissions = submissionQuery.records
    .filter(submission => {
      return getLinkedIds(submission, submissionsTable, CONFIG.submissions.enrollment).includes(
        enrollmentId
      );
    })
    .map(submission => {
      const weekId = getLinkedIds(submission, submissionsTable, CONFIG.submissions.week)[0] || "";
      const weekMeta = weekById.get(weekId) || { weekId, weekName: "", weekNumber: 0 };
      const countThis =
        getNumberish(submission, submissionsTable, CONFIG.submissions.countThisSubmission) === 1;
      const shotsCanonical = getNumberish(
        submission,
        submissionsTable,
        CONFIG.submissions.totalShotsCanonical
      );
      const shotsCounted = getNumberish(
        submission,
        submissionsTable,
        CONFIG.submissions.totalShotsCounted
      );
      const submissionBaseXpIds = getSubmissionBaseXpIds(
        submission.id,
        xpQuery,
        xpEventsTable,
        xpBySourceKey
      );
      const xpIssue = classifySubmissionXpIssue(
        submission,
        submissionsTable,
        submissionBaseXpIds
      );
      const exclusionReason = countThis
        ? ""
        : inferCountExclusionReason(submission, submissionsTable);

      return {
        submissionId: submission.id,
        name: submission.name,
        activityDate: getText(submission, submissionsTable, CONFIG.submissions.activityDate),
        activityDateKey: getText(submission, submissionsTable, CONFIG.submissions.activityDateKey),
        submittedAt: getText(submission, submissionsTable, CONFIG.submissions.submittedAt),
        duplicateKey: getText(submission, submissionsTable, CONFIG.submissions.duplicateKey),
        weekId,
        weekName: weekMeta.weekName,
        weekNumber: weekMeta.weekNumber,
        countThis,
        duplicateReviewStatus: getSelectName(
          submission,
          submissionsTable,
          CONFIG.submissions.duplicateReviewStatus
        ),
        submissionStatMode: getSelectName(
          submission,
          submissionsTable,
          CONFIG.submissions.submissionStatMode
        ),
        detailedStatsValid: getBooleanish(
          submission,
          submissionsTable,
          CONFIG.submissions.detailedStatsValid
        ),
        shotTotal: getNumberish(submission, submissionsTable, CONFIG.submissions.shotTotal),
        shotsCanonical,
        shotsCounted,
        makesCanonical: getNumberish(
          submission,
          submissionsTable,
          CONFIG.submissions.totalMakesCanonical
        ),
        makesCounted: getNumberish(
          submission,
          submissionsTable,
          CONFIG.submissions.totalMakesCounted
        ),
        xpAwardStatus: getSelectName(
          submission,
          submissionsTable,
          CONFIG.submissions.xpAwardStatus
        ),
        submissionBaseXpEventIds: submissionBaseXpIds,
        xpIssue,
        exclusionReason,
        missingShotsIfExcluded: !countThis && shotsCanonical > 0 ? shotsCanonical : 0,
        duplicateExcludeReview: null,
      };
    })
    .sort((a, b) => {
      return (
        String(a.activityDateKey || a.activityDate).localeCompare(
          String(b.activityDateKey || b.activityDate)
        ) ||
        String(a.submittedAt).localeCompare(String(b.submittedAt)) ||
        a.submissionId.localeCompare(b.submissionId)
      );
    });

  const byDuplicateKey = new Map();
  for (const row of enrollmentSubmissions) {
    if (!row.duplicateKey) continue;
    if (!byDuplicateKey.has(row.duplicateKey)) byDuplicateKey.set(row.duplicateKey, []);
    byDuplicateKey.get(row.duplicateKey).push(row);
  }

  for (const row of enrollmentSubmissions) {
    row.duplicateExcludeReview = classifyDuplicateExclusion(
      row,
      enrollmentSubmissions,
      byDuplicateKey
    );
  }

  const sameDayGroups = buildSameDayGroups(enrollmentSubmissions);
  const duplicateKeyGroups = buildDuplicateKeyGroups(enrollmentSubmissions);

  let computedCountedShots = 0;
  let computedCanonicalCounted = 0;
  let excludedCanonicalShots = 0;
  let submissionXpIssueCount = 0;

  const excludedWithShots = [];
  const potentiallyRecoverableExcluded = [];
  const submissionXpIssues = [];
  const weeklyFromSubmissions = new Map();

  for (const row of enrollmentSubmissions) {
    if (row.countThis) {
      computedCountedShots += row.shotsCounted;
      computedCanonicalCounted += row.shotsCanonical;
    } else if (row.shotsCanonical > 0) {
      excludedCanonicalShots += row.shotsCanonical;
      excludedWithShots.push(row);
      if (row.duplicateExcludeReview?.potentiallyRecoverableShots > 0) {
        potentiallyRecoverableExcluded.push({
          submissionId: row.submissionId,
          activityDate: row.activityDate,
          submittedAt: row.submittedAt,
          shotsCanonical: row.shotsCanonical,
          duplicateKey: row.duplicateKey,
          duplicateReviewStatus: row.duplicateReviewStatus,
          classification: row.duplicateExcludeReview.classification,
          recommendedAction: row.duplicateExcludeReview.recommendedAction,
          siblingCountedSubmissionIds: row.duplicateExcludeReview.siblingCountedSubmissionIds,
        });
      }
    }

    if (row.xpIssue) {
      submissionXpIssueCount += 1;
      submissionXpIssues.push({
        submissionId: row.submissionId,
        activityDate: row.activityDate,
        issue: row.xpIssue,
        xpAwardStatus: row.xpAwardStatus,
        submissionBaseXpEventIds: row.submissionBaseXpEventIds,
      });
    }

    if (row.weekId) {
      if (!weeklyFromSubmissions.has(row.weekId)) {
        weeklyFromSubmissions.set(row.weekId, {
          weekId: row.weekId,
          weekName: row.weekName,
          weekNumber: row.weekNumber,
          countedShots: 0,
          excludedCanonicalShots: 0,
          countedSubmissions: 0,
          excludedSubmissionsWithShots: 0,
        });
      }
      const bucket = weeklyFromSubmissions.get(row.weekId);
      if (row.countThis) {
        bucket.countedShots += row.shotsCounted;
        bucket.countedSubmissions += 1;
      } else if (row.shotsCanonical > 0) {
        bucket.excludedCanonicalShots += row.shotsCanonical;
        bucket.excludedSubmissionsWithShots += 1;
      }
    }
  }

  const enrollmentRollupShots = getNumberish(
    enrollmentFresh,
    enrollmentsTable,
    CONFIG.enrollments.totalShotsCounted
  );
  const enrollmentSubmittedRollup = fieldExists(
    enrollmentsTable,
    CONFIG.enrollments.totalShotsSubmitted
  )
    ? getNumberish(enrollmentFresh, enrollmentsTable, CONFIG.enrollments.totalShotsSubmitted)
    : null;

  const linkedXpRecords = xpQuery.records.filter(xp =>
    getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.enrollment).includes(enrollmentId)
  );

  let computedXpSum = 0;
  let computedActiveXpRollup = 0;
  for (const xp of linkedXpRecords) {
    if (getBooleanish(xp, xpEventsTable, CONFIG.xpEvents.active)) {
      computedXpSum += getNumberish(xp, xpEventsTable, CONFIG.xpEvents.xpPoints);
    }
    computedActiveXpRollup += getNumberish(xp, xpEventsTable, CONFIG.xpEvents.activeXpPoints);
  }

  const lifetimeXpEarned = getNumberish(
    enrollmentFresh,
    enrollmentsTable,
    CONFIG.enrollments.lifetimeXpEarned
  );
  const lifetimeXpTotal = getNumberish(
    enrollmentFresh,
    enrollmentsTable,
    CONFIG.enrollments.lifetimeXpTotal
  );

  const weeklySummaries = summaryQuery.records
    .filter(summary =>
      getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment).includes(
        enrollmentId
      )
    )
    .map(summary => {
      const weekId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.week)[0] || "";
      const weekMeta = weekById.get(weekId) || { weekName: "", weekNumber: 0 };
      const submissionWeek = weeklyFromSubmissions.get(weekId);
      const wasShots = getNumberish(
        summary,
        weeklySummaryTable,
        CONFIG.weeklySummary.totalShotsThisWeek
      );

      return {
        weeklySummaryId: summary.id,
        weekId,
        weekName:
          getText(summary, weeklySummaryTable, CONFIG.weeklySummary.weekDisplay) ||
          weekMeta.weekName,
        weekNumber: weekMeta.weekNumber,
        wasShotsThisWeek: wasShots,
        countedShotsFromSubmissions: submissionWeek?.countedShots || 0,
        shotsDelta: (submissionWeek?.countedShots || 0) - wasShots,
        xpEarnedThisWeek: getNumberish(
          summary,
          weeklySummaryTable,
          CONFIG.weeklySummary.xpEarnedThisWeek
        ),
        totalXpAfterWeek: getNumberish(
          summary,
          weeklySummaryTable,
          CONFIG.weeklySummary.totalXpAfterWeek
        ),
      };
    })
    .sort((a, b) => a.weekNumber - b.weekNumber || a.weekName.localeCompare(b.weekName));

  const exclusionReasonCounts = excludedWithShots.reduce((acc, row) => {
    const key = row.exclusionReason || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const shotsDeltaRollupVsComputed = enrollmentRollupShots - computedCountedShots;
  const parentClaimGap = 300;
  const potentiallyRecoverableShots = potentiallyRecoverableExcluded.reduce(
    (sum, row) => sum + row.shotsCanonical,
    0
  );
  const shotsTotalIfRecoverableExcludedWereCounted =
    computedCountedShots + potentiallyRecoverableShots;
  const closestExcludedBundles = excludedWithShots
    .slice()
    .sort((a, b) => b.missingShotsIfExcluded - a.missingShotsIfExcluded);

  const duplicateExcludeReviewCounts = potentiallyRecoverableExcluded.reduce((acc, row) => {
    acc[row.classification] = (acc[row.classification] || 0) + 1;
    return acc;
  }, {});

  let diagnosis = "Shot and XP totals appear aligned for this enrollment.";
  if (potentiallyRecoverableShots > 0) {
    diagnosis =
      `${potentiallyRecoverableShots} shots are on Exclude It submissions that may be false duplicates ` +
      "(identical Duplicate Key to a counted row, or same day with different shot totals elsewhere). " +
      "Multiple submissions per day are valid when shot totals differ — review duplicateKeyGroups and sameDayGroups.";
  } else if (excludedCanonicalShots > 0) {
    diagnosis =
      "Some excluded submissions have shot totals, but none matched false-duplicate patterns. " +
      "Review exclusionReason on each row.";
  } else if (shotsDeltaRollupVsComputed !== 0) {
    diagnosis = "Rollup vs computed counted shots mismatch — check enrollment submission links.";
  } else if (submissionXpIssueCount > 0) {
    diagnosis = "Shot totals look aligned but submission XP has issues.";
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    matchMode: resolved.matchMode,
    search: {
      enrollmentRecordId: ENROLLMENT_RECORD_ID || null,
      firstName: FIRST_NAME_MATCH,
      lastName: LAST_NAME_MATCH,
    },

    enrollment: {
      enrollmentId,
      firstName: getText(enrollmentFresh, enrollmentsTable, CONFIG.enrollments.firstName),
      lastName: getText(enrollmentFresh, enrollmentsTable, CONFIG.enrollments.lastName),
      fullName: getText(enrollmentFresh, enrollmentsTable, CONFIG.enrollments.fullName),
      active: getBooleanish(enrollmentFresh, enrollmentsTable, CONFIG.enrollments.active),
      parentEmail: getText(enrollmentFresh, enrollmentsTable, CONFIG.enrollments.parentEmail),
      currentLevel: getSelectName(enrollmentFresh, enrollmentsTable, CONFIG.enrollments.currentLevel),
    },

    shotReconciliation: {
      businessRule:
        "Multiple submissions per calendar day are allowed when Duplicate Key differs (different shot totals). " +
        "Identical Duplicate Key => flagged; Exclude It requires manual review in this audit.",
      enrollmentRollupTotalShotsCounted: enrollmentRollupShots,
      enrollmentRollupTotalShotsSubmitted: enrollmentSubmittedRollup,
      computedCountedShotsFromSubmissions: computedCountedShots,
      computedCanonicalOnCountedSubmissions: computedCanonicalCounted,
      excludedCanonicalShotsNotCounted: excludedCanonicalShots,
      potentiallyRecoverableExcludedShots: potentiallyRecoverableShots,
      shotsTotalIfRecoverableExcludedWereCounted,
      rollupMinusComputed: shotsDeltaRollupVsComputed,
      parentReportedMissingShots: parentClaimGap,
      potentiallyRecoverableExplainsParentClaim:
        potentiallyRecoverableShots >= parentClaimGap - 50 &&
        potentiallyRecoverableShots <= parentClaimGap + 50,
      submissionCountTotal: enrollmentSubmissions.length,
      submissionCountCounted: enrollmentSubmissions.filter(row => row.countThis).length,
      submissionCountExcluded: enrollmentSubmissions.filter(row => !row.countThis).length,
      submissionCountExcludedWithShots: excludedWithShots.length,
      sameDayMultiSubmissionGroupCount: sameDayGroups.length,
      duplicateKeyCollisionGroupCount: duplicateKeyGroups.length,
      exclusionReasonCounts,
      duplicateExcludeReviewCounts,
    },

    xpReconciliation: {
      lifetimeXpEarned,
      lifetimeXpTotal,
      computedActiveXpFromEvents: computedXpSum,
      rollupActiveXpFromEvents: computedActiveXpRollup,
      lifetimeXpDelta: computedXpSum - lifetimeXpEarned,
      submissionXpIssueCount,
      submissionXpIssues,
    },

    weeklySummaries,
    weeklyFromSubmissions: [...weeklyFromSubmissions.values()].sort(
      (a, b) => a.weekNumber - b.weekNumber
    ),

    sameDayGroups,
    duplicateKeyGroups,
    potentiallyRecoverableExcluded,
    excludedSubmissionsWithShots: closestExcludedBundles,
    allSubmissions: enrollmentSubmissions,

    diagnosis,

    recommendedFollowUp: [
      potentiallyRecoverableShots > 0
        ? "Review duplicateKeyGroups — for legitimate separate same-day sessions, set Duplicate Review Status → Count It on excluded rows, then re-trigger submission XP (010) if needed."
        : null,
      excludedCanonicalShots > 0 && potentiallyRecoverableShots === 0
        ? "Review excludedSubmissionsWithShots exclusionReason fields."
        : null,
      submissionXpIssueCount > 0
        ? "Run backfill-submission-xp-events.js for affected submission IDs."
        : null,
      "Re-run this audit after any fixes.",
    ].filter(Boolean),
  };

  console.log("===== TARGET ENROLLMENT — FULL INTEGRITY AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();

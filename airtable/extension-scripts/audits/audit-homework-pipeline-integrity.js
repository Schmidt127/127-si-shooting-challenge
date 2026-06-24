/*
Extension Script: Audit Homework Pipeline Integrity
System: 127 SI Shooting Challenge
Purpose:
  Read-only parity check for reviewed Homework Completions vs Homework XP Events
  (Automation 065 logic): missing XP, duplicates, Source Key drift, points mismatch,
  Award Status gaps, and missing Weekly Athlete Summary on XP.

Default: read-only (no writes)

Recommended follow-up:
  backfill-homework-xp-from-reviewed.js (dry run first)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;

const CONFIG = {
  scriptName: "audit-homework-pipeline-integrity",
  version: "v1.0",

  tables: {
    homework: "Homework Completions",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  homework: {
    enrollment: "Enrollment",
    homework: "Homework",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary Link",
    submission: "Submissions - Linked",
    satisfactory: "Satisfactory?",
    reviewComplete: "Review Complete",
    coachFeedback: "Coach Feedback",
    baseXp: "Base XP Awarded",
    extraXp: "Extra Credit XP Awarded",
    totalXp: "Total Homework XP Awarded",
    awardStatus: "Award Status",
    xpEvents: "XP Events",
    completionKey: "Homework Completion Key",
    submissionDate: "Submission Date",
    submissionDateDateOnly: "Submission Date - Date Only",
    uploadStatus: "Upload Status",
  },

  xpEvents: {
    sourceKey: "Source Key",
    homeworkCompletion: "Homework Completion",
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    xpPoints: "XP Points",
    xpSource: "XP Source",
    xpBucket: "XP Bucket",
    active: "Active?",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  values: {
    sourceKeyPrefix: "HOMEWORK_XP|",
    awardPending: "Pending",
    awardAwarded: "Awarded",
    xpSourceHomework: "Homework Completion",
    xpBucketHomework: "Homework Completion",
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
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getNumberish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function getDateValue(record, table, fieldNames) {
  for (const fieldName of fieldNames) {
    if (!fieldName || !fieldExists(table, fieldName)) continue;
    const value = record.getCellValue(fieldName);
    if (!value) continue;
    if (value instanceof Date && !isNaN(value)) return value;
    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return null;
}

function buildSourceKey(homeworkId) {
  return `${CONFIG.values.sourceKeyPrefix}${homeworkId}`;
}

function isHomeworkXpEvent(xpRecord, xpEventsTable, homeworkId) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  const expectedKey = buildSourceKey(homeworkId);
  if (sourceKey === expectedKey) return true;

  const xpSource = getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpSource);
  const xpBucket = getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpBucket);
  const linkedHomework = getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.homeworkCompletion);

  return (
    linkedHomework.includes(homeworkId) ||
    sourceKey.startsWith(CONFIG.values.sourceKeyPrefix) ||
    xpSource === CONFIG.values.xpSourceHomework ||
    xpBucket === CONFIG.values.xpBucketHomework
  );
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function assessReviewReadiness(homeworkRecord, homeworkTable) {
  const missing = [];

  if (!getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.enrollment).length) {
    missing.push("enrollment");
  }
  if (!getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.homework).length) {
    missing.push("homework");
  }
  if (!getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.week).length) {
    missing.push("week");
  }
  if (!getText(homeworkRecord, homeworkTable, CONFIG.homework.completionKey)) {
    missing.push("completion_key");
  }
  if (!getText(homeworkRecord, homeworkTable, CONFIG.homework.coachFeedback)) {
    missing.push("coach_feedback");
  }
  if (!getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.satisfactory)) {
    missing.push("satisfactory");
  }
  if (!getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.reviewComplete)) {
    missing.push("review_complete");
  }
  if (getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.baseXp) <= 0) {
    missing.push("base_xp");
  }
  if (getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp) <= 0) {
    missing.push("total_xp");
  }
  if (
    !getDateValue(homeworkRecord, homeworkTable, [
      CONFIG.homework.submissionDateDateOnly,
      CONFIG.homework.submissionDate,
    ])
  ) {
    missing.push("submission_date");
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}

function getHomeworkXpIds(homeworkId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey) {
  const ids = new Set(linkedXpIds);
  const expectedKey = buildSourceKey(homeworkId);

  for (const xpId of xpBySourceKey.get(expectedKey) || []) {
    ids.add(xpId);
  }

  for (const xp of xpQuery.records) {
    if (isHomeworkXpEvent(xp, xpEventsTable, homeworkId)) {
      ids.add(xp.id);
    }
  }

  return [...ids];
}

async function main() {
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));

  const [homeworkQuery, xpQuery, summaryQuery] = await Promise.all([
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    weeklySummaryTable.selectRecordsAsync({
      fields: Object.values(CONFIG.weeklySummary).filter(name => fieldExists(weeklySummaryTable, name)),
    }),
  ]);

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
    xpBySourceKey.get(sourceKey).push(xp.id);
  }

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment)[0] || "";
    const weekId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.week)[0] || "";
    if (!enrollmentId || !weekId) continue;
    const key = buildSummaryIndexKey(enrollmentId, weekId);
    if (!summaryIndex.has(key)) summaryIndex.set(key, []);
    summaryIndex.get(key).push(summary.id);
  }

  const issueCounts = {};
  const buckets = {
    ok: [],
    not_ready_for_xp: [],
    missing_xp_event: [],
    duplicate_xp_event: [],
    source_key_mismatch: [],
    xp_points_mismatch: [],
    award_status_gap: [],
    missing_weekly_summary_on_xp: [],
  };

  function bump(issue) {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  }

  function pushSample(bucket, row) {
    if (buckets[bucket].length < SAMPLE_LIMIT) buckets[bucket].push(row);
  }

  for (const homeworkRecord of homeworkQuery.records) {
    const homeworkId = homeworkRecord.id;
    const readiness = assessReviewReadiness(homeworkRecord, homeworkTable);

    if (!readiness.ready) {
      bump("not_ready_for_xp");
      pushSample("not_ready_for_xp", {
        homeworkId,
        name: homeworkRecord.name,
        missing: readiness.missing,
        uploadStatus: getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus),
        awardStatus: getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.awardStatus),
        recommendedAction: "Complete review (064) or skip if coach-accepted without review",
      });
      continue;
    }

    const linkedXpIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.xpEvents);
    const xpIds = getHomeworkXpIds(homeworkId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey);
    const awardStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.awardStatus);
    const totalXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp);
    const expectedKey = buildSourceKey(homeworkId);
    const enrollmentId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.enrollment)[0] || "";
    const weekId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.week)[0] || "";
    const weeklySummaryId =
      getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.weeklySummary)[0] ||
      (summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || [])[0] ||
      "";

    if (xpIds.length === 0) {
      bump("missing_xp_event");
      pushSample("missing_xp_event", {
        homeworkId,
        name: homeworkRecord.name,
        awardStatus,
        totalXp,
        expectedSourceKey: expectedKey,
        recommendedAction: "Run 065 or backfill-homework-xp-from-reviewed.js",
      });
      continue;
    }

    if (xpIds.length > 1) {
      bump("duplicate_xp_event");
      pushSample("duplicate_xp_event", {
        homeworkId,
        name: homeworkRecord.name,
        xpEventIds: xpIds,
        recommendedAction: "Manual dedupe — keep one HOMEWORK_XP event",
      });
    }

    const primaryXp = xpQuery.getRecord(xpIds[0]);
    const primarySourceKey = primaryXp
      ? getText(primaryXp, xpEventsTable, CONFIG.xpEvents.sourceKey)
      : "";
    const primaryPoints = primaryXp ? getNumberish(primaryXp, xpEventsTable, CONFIG.xpEvents.xpPoints) : 0;
    const primaryWasId = primaryXp
      ? getLinkedIds(primaryXp, xpEventsTable, CONFIG.xpEvents.weeklySummary)[0] || ""
      : "";

    let hasIssue = xpIds.length > 1;

    if (primarySourceKey && primarySourceKey !== expectedKey) {
      bump("source_key_mismatch");
      pushSample("source_key_mismatch", {
        homeworkId,
        name: homeworkRecord.name,
        xpEventId: xpIds[0],
        expectedSourceKey: expectedKey,
        actualSourceKey: primarySourceKey,
        recommendedAction: "Repair Source Key on XP Event",
      });
      hasIssue = true;
    }

    if (primaryPoints !== totalXp) {
      bump("xp_points_mismatch");
      pushSample("xp_points_mismatch", {
        homeworkId,
        name: homeworkRecord.name,
        xpEventId: xpIds[0],
        homeworkTotalXp: totalXp,
        xpEventPoints: primaryPoints,
        recommendedAction: "Align XP Points with Total Homework XP Awarded",
      });
      hasIssue = true;
    }

    if (awardStatus !== CONFIG.values.awardAwarded) {
      bump("award_status_gap");
      pushSample("award_status_gap", {
        homeworkId,
        name: homeworkRecord.name,
        awardStatus,
        xpEventId: xpIds[0],
        recommendedAction: "Set Award Status = Awarded after XP exists",
      });
      hasIssue = true;
    }

    if (weeklySummaryId && primaryXp && !primaryWasId) {
      bump("missing_weekly_summary_on_xp");
      pushSample("missing_weekly_summary_on_xp", {
        homeworkId,
        name: homeworkRecord.name,
        xpEventId: xpIds[0],
        expectedWeeklySummaryId: weeklySummaryId,
        recommendedAction: "Link XP Event to Weekly Athlete Summary",
      });
      hasIssue = true;
    }

    if (!hasIssue) {
      bump("ok");
      if (buckets.ok.length < 5) {
        pushSample("ok", { homeworkId, name: homeworkRecord.name, xpEventId: xpIds[0] });
      }
    }
  }

  const reviewedReadyCount = homeworkQuery.records.length - (issueCounts.not_ready_for_xp || 0);
  const issueTotal =
    (issueCounts.missing_xp_event || 0) +
    (issueCounts.duplicate_xp_event || 0) +
    (issueCounts.source_key_mismatch || 0) +
    (issueCounts.xp_points_mismatch || 0) +
    (issueCounts.award_status_gap || 0) +
    (issueCounts.missing_weekly_summary_on_xp || 0);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: true,
    homeworkChecked: homeworkQuery.records.length,
    reviewedReadyCount,
    okCount: issueCounts.ok || 0,
    issueTotal,
    issueCounts,
    missingXpSample: buckets.missing_xp_event,
    duplicateXpSample: buckets.duplicate_xp_event,
    sourceKeyMismatchSample: buckets.source_key_mismatch,
    xpPointsMismatchSample: buckets.xp_points_mismatch,
    awardStatusGapSample: buckets.award_status_gap,
    missingWasSample: buckets.missing_weekly_summary_on_xp,
    notReadySample: buckets.not_ready_for_xp,
    okSample: buckets.ok,
  };

  console.log("===== HOMEWORK PIPELINE INTEGRITY AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();

/*
Extension Script: Repair Audit 009 — Davison Shot Tracker Homework Credit
System: 127 SI Shooting Challenge
Purpose:
  Coach-credit path for Week 2 Shot Tracker homework with no upload file (accept-as-uploaded).

  Homework Completions:
  - rec2zZneEiNzXfJlP — Nora Davison
  - recUyVb0l5B9XR7ZA — Charlotte Davison

  Steps (064 + 065 parity):
  1. Ensure coach review gate (feedback, Satisfactory?, Review Complete)
  2. Set Base XP Awarded from HOMEWORK_COMPLETION rule + Award Status = Pending
  3. Create HOMEWORK_XP| XP Event and mark Award Status = Awarded

  Does not link a Submission Asset (no file exists). Upload/accept fields should already
  be set via backfill-homework-completion-orphan-resolve.js.

Safety:
  - DRY_RUN = true by default
  - Set CONFIRM_WRITE = true AND DRY_RUN = false to apply
  - Skips rows that already have linked HOMEWORK_XP| event and Award Status = Awarded

Setup:
  1. Edit COACH_FEEDBACK_IF_BLANK if you want custom feedback text
  2. Dry run; review plannedActions
  3. Live write; re-run audit-homework-pipeline-integrity.js optional
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;

const TARGET_HOMEWORK_IDS = [
  "rec2zZneEiNzXfJlP", // Nora Davison — Week 2 Shot Tracker
  "recUyVb0l5B9XR7ZA", // Charlotte Davison — Week 2 Shot Tracker
];

/** Used only when Coach Feedback is blank on the homework row */
const COACH_FEEDBACK_IF_BLANK =
  "Great job using the shot tracker this week. Coach accepted this submission without a separate upload file. Mike";

const CONFIG = {
  scriptName: "repair-audit-009-davison-shot-tracker-homework-credit",
  version: "v1.0",

  tables: {
    homework: "Homework Completions",
    xpEvents: "XP Events",
    xpRewardRules: "XP Reward Rules",
    weeklySummary: "Weekly Athlete Summary",
  },

  homework: {
    name: "Homework Completion Full Name",
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
    reviewedAt: "Reviewed At",
    reviewedBy: "Reviewed By",
    automationError: "Automation Error",
  },

  xpRules: {
    ruleKey: "Rule Key",
    xpAmount: "XP Amount",
    active: "Active?",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  xpEvents: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    submission: "Submission",
    homeworkCompletion: "Homework Completion",
    xpBucket: "XP Bucket",
    xpSource: "XP Source",
    xpPoints: "XP Points",
    sourceKey: "Source Key",
    reasonPublic: "XP Reason Public",
    reasonDebug: "XP Reason Debug",
    awardedAt: "Awarded At",
    active: "Active?",
    processed: "Processed",
    xpActivityDateCandidates: ["XP Activity Date", "XP Source Date"],
    xpActivityDateSourceCandidates: ["XP Activity Date Source", "XP Date Source"],
  },

  values: {
    homeworkRuleKey: "HOMEWORK_COMPLETION",
    sourceKeyPrefix: "HOMEWORK_XP|",
    awardPending: "Pending",
    awardAwarded: "Awarded",
    reviewedBy: "Mike Schmidt",
    xpBucketHomework: "Homework Completion",
    xpSourceHomework: "Homework Completion",
    xpActivityDateSource: "Homework Submission Activity Date",
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

function isWritableField(table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  try {
    return table.getField(fieldName).isComputed !== true;
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

function linkedCell(ids) {
  return ids.filter(Boolean).map(id => ({ id }));
}

function buildCellValueForField(table, fieldName, value) {
  const field = table.getField(fieldName);
  if (field.type === "singleSelect") return { name: value };
  if (field.type === "multipleSelects") return [{ name: value }];
  return value;
}

function getFirstWritableFieldName(table, candidates) {
  for (const fieldName of candidates) {
    if (isWritableField(table, fieldName)) return fieldName;
  }
  return "";
}

function buildSourceKey(homeworkId) {
  return `${CONFIG.values.sourceKeyPrefix}${homeworkId}`;
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function resolveWeeklySummaryId({ sourceWeeklySummaryIds, enrollmentId, weekId, summaryIndex }) {
  if (sourceWeeklySummaryIds.length === 1) return sourceWeeklySummaryIds[0];
  if (sourceWeeklySummaryIds.length > 1) {
    throw new Error(`Multiple WAS links on homework: ${sourceWeeklySummaryIds.join(", ")}`);
  }
  const matches = summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || [];
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`Multiple WAS for enrollment+week: ${matches.join(", ")}`);
  }
  return "";
}

async function loadHomeworkRuleBaseXp(xpRulesTable) {
  const ruleFields = Object.values(CONFIG.xpRules).filter(name => fieldExists(xpRulesTable, name));
  const query = await xpRulesTable.selectRecordsAsync({ fields: ruleFields });
  const matches = query.records.filter(rule => {
    return (
      getText(rule, xpRulesTable, CONFIG.xpRules.ruleKey) === CONFIG.values.homeworkRuleKey &&
      getBooleanish(rule, xpRulesTable, CONFIG.xpRules.active)
    );
  });
  if (matches.length !== 1) {
    throw new Error(
      `Expected one active XP Reward Rule for ${CONFIG.values.homeworkRuleKey}; found ${matches.length}`
    );
  }
  const baseXp = getNumberish(matches[0], xpRulesTable, CONFIG.xpRules.xpAmount);
  if (baseXp <= 0) throw new Error(`Invalid XP Amount on ${CONFIG.values.homeworkRuleKey} rule`);
  return baseXp;
}

function buildReviewPrepFields(homeworkRecord, homeworkTable) {
  const fields = {};

  if (
    !getText(homeworkRecord, homeworkTable, CONFIG.homework.coachFeedback) &&
    isWritableField(homeworkTable, CONFIG.homework.coachFeedback)
  ) {
    fields[CONFIG.homework.coachFeedback] = COACH_FEEDBACK_IF_BLANK;
  }

  if (
    !getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.satisfactory) &&
    isWritableField(homeworkTable, CONFIG.homework.satisfactory)
  ) {
    fields[CONFIG.homework.satisfactory] = true;
  }

  if (
    !getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.reviewComplete) &&
    isWritableField(homeworkTable, CONFIG.homework.reviewComplete)
  ) {
    fields[CONFIG.homework.reviewComplete] = true;
  }

  return fields;
}

function build064PrepFields(homeworkRecord, homeworkTable, baseXpFromRule) {
  const fields = {};
  const existingBaseXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.baseXp);
  const awardStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.awardStatus);

  if (existingBaseXp <= 0 && isWritableField(homeworkTable, CONFIG.homework.baseXp)) {
    fields[CONFIG.homework.baseXp] = baseXpFromRule;
  }

  if (
    awardStatus !== CONFIG.values.awardPending &&
    awardStatus !== CONFIG.values.awardAwarded &&
    isWritableField(homeworkTable, CONFIG.homework.awardStatus)
  ) {
    fields[CONFIG.homework.awardStatus] = buildCellValueForField(
      homeworkTable,
      CONFIG.homework.awardStatus,
      CONFIG.values.awardPending
    );
  }

  if (existingBaseXp <= 0) {
    const now = new Date();
    if (isWritableField(homeworkTable, CONFIG.homework.reviewedAt)) {
      fields[CONFIG.homework.reviewedAt] = now;
    }
    if (isWritableField(homeworkTable, CONFIG.homework.reviewedBy)) {
      fields[CONFIG.homework.reviewedBy] = CONFIG.values.reviewedBy;
    }
  }

  if (isWritableField(homeworkTable, CONFIG.homework.automationError)) {
    fields[CONFIG.homework.automationError] = "";
  }

  return fields;
}

function findExistingXpId(homeworkId, linkedXpIds, xpQuery, xpEventsTable) {
  const sourceKey = buildSourceKey(homeworkId);
  for (const xpId of linkedXpIds) {
    const xp = xpQuery.getRecord(xpId);
    if (!xp) continue;
    if (getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey) === sourceKey) return xpId;
    if (getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.homeworkCompletion).includes(homeworkId)) {
      return xpId;
    }
  }
  return "";
}

async function main() {
  if (CONFIRM_WRITE && DRY_RUN) {
    throw new Error("CONFIRM_WRITE is true but DRY_RUN is still true. Set DRY_RUN = false to apply writes.");
  }

  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const xpRulesTable = base.getTable(CONFIG.tables.xpRewardRules);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const writableXpDateField = getFirstWritableFieldName(
    xpEventsTable,
    CONFIG.xpEvents.xpActivityDateCandidates
  );
  const writableXpDateSourceField = getFirstWritableFieldName(
    xpEventsTable,
    CONFIG.xpEvents.xpActivityDateSourceCandidates
  );

  if (!writableXpDateField || !writableXpDateSourceField) {
    throw new Error("Missing writable XP activity date fields on XP Events");
  }

  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));

  const [homeworkQuery, xpQuery, summaryQuery, baseXpFromRule] = await Promise.all([
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    weeklySummaryTable.selectRecordsAsync({
      fields: Object.values(CONFIG.weeklySummary).filter(name => fieldExists(weeklySummaryTable, name)),
    }),
    loadHomeworkRuleBaseXp(xpRulesTable),
  ]);

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment)[0] || "";
    const weekId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.week)[0] || "";
    if (!enrollmentId || !weekId) continue;
    const key = buildSummaryIndexKey(enrollmentId, weekId);
    if (!summaryIndex.has(key)) summaryIndex.set(key, []);
    summaryIndex.get(key).push(summary.id);
  }

  const planned = [];

  for (const homeworkId of TARGET_HOMEWORK_IDS) {
    const homeworkRecord = homeworkQuery.getRecord(homeworkId);
    if (!homeworkRecord) {
      planned.push({ homeworkId, action: "error", error: "homework_not_found" });
      continue;
    }

    const enrollmentId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.enrollment)[0] || "";
    const weekId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.week)[0] || "";
    const submissionId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submission)[0] || "";
    const completionKey = getText(homeworkRecord, homeworkTable, CONFIG.homework.completionKey);
    const activityDate = getDateValue(homeworkRecord, homeworkTable, [
      CONFIG.homework.submissionDateDateOnly,
      CONFIG.homework.submissionDate,
    ]);
    const awardStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.awardStatus);
    const linkedXpIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.xpEvents);
    const existingXpId = findExistingXpId(homeworkId, linkedXpIds, xpQuery, xpEventsTable);

    const missing = [];
    if (!enrollmentId) missing.push("enrollment");
    if (!getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.homework)[0]) missing.push("homework");
    if (!weekId) missing.push("week");
    if (!completionKey) missing.push("completion_key");
    if (!activityDate) missing.push("submission_date");

    if (missing.length > 0) {
      planned.push({
        homeworkId,
        name: homeworkRecord.name,
        action: "blocked",
        missing,
      });
      continue;
    }

    if (existingXpId && awardStatus === CONFIG.values.awardAwarded) {
      planned.push({
        homeworkId,
        name: homeworkRecord.name,
        action: "skipped_already_awarded",
        existingXpEventId: existingXpId,
      });
      continue;
    }

    const reviewPrepFields = buildReviewPrepFields(homeworkRecord, homeworkTable);
    const prep064Fields = build064PrepFields(homeworkRecord, homeworkTable, baseXpFromRule);
    const homeworkPrepFields = { ...reviewPrepFields, ...prep064Fields };

    const projectedBaseXp =
      getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.baseXp) || baseXpFromRule;
    const projectedExtraXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.extraXp);
    let projectedTotalXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp);
    if (projectedTotalXp <= 0) projectedTotalXp = projectedBaseXp + projectedExtraXp;

    let weeklySummaryId = "";
    try {
      weeklySummaryId = resolveWeeklySummaryId({
        sourceWeeklySummaryIds: getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.weeklySummary),
        enrollmentId,
        weekId,
        summaryIndex,
      });
    } catch (error) {
      planned.push({
        homeworkId,
        name: homeworkRecord.name,
        action: "blocked",
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    planned.push({
      homeworkId,
      name: homeworkRecord.name,
      action: existingXpId ? "link_and_mark_awarded" : "prepare_review_and_create_xp",
      homeworkPrepFields,
      existingXpEventId: existingXpId,
      createXp: !existingXpId,
      sourceKey: buildSourceKey(homeworkId),
      enrollmentId,
      weekId,
      submissionId,
      weeklySummaryId,
      projectedBaseXp,
      projectedExtraXp,
      projectedTotalXp,
      completionKey,
      activityDate: activityDate ? activityDate.toISOString() : "",
    });
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    coachFeedbackIfBlank: COACH_FEEDBACK_IF_BLANK,
    baseXpFromRule,
    plannedCount: planned.filter(row => row.action !== "skipped_already_awarded" && row.action !== "blocked").length,
    planned,
  };

  console.log("===== Repair Audit 009 — Davison Shot Tracker Homework Credit =====");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE WRITE"}`);
  console.log(JSON.stringify(report, null, 2));

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("\nTo apply: set DRY_RUN = false and CONFIRM_WRITE = true, then re-run.");
    return;
  }

  const results = [];

  for (const row of planned) {
    if (row.action === "skipped_already_awarded" || row.action === "blocked" || row.action === "error") {
      results.push(row);
      continue;
    }

    if (Object.keys(row.homeworkPrepFields || {}).length > 0) {
      await homeworkTable.updateRecordAsync(row.homeworkId, row.homeworkPrepFields);
    }

    let xpEventId = row.existingXpEventId || "";

    if (row.createXp) {
      const homeworkRecord = await homeworkTable.selectRecordAsync(row.homeworkId, { fields: homeworkFields });
      const totalXp =
        getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp) || row.projectedTotalXp;
      const baseXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.baseXp) || row.projectedBaseXp;
      const extraXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.extraXp);
      const activityDate = getDateValue(homeworkRecord, homeworkTable, [
        CONFIG.homework.submissionDateDateOnly,
        CONFIG.homework.submissionDate,
      ]);

      const publicReason = `Homework completed: ${getText(homeworkRecord, homeworkTable, CONFIG.homework.homework) || homeworkRecord.name}`;
      const debugReason = [
        `Repair 009 Davison shot tracker credit for ${row.homeworkId}.`,
        `Base XP: ${baseXp}`,
        `Extra Credit XP: ${extraXp}`,
        `Total XP: ${totalXp}`,
        `Source Key: ${row.sourceKey}`,
      ].join("\n");

      const createFields = {
        [CONFIG.xpEvents.enrollment]: linkedCell([row.enrollmentId]),
        [CONFIG.xpEvents.week]: linkedCell([row.weekId]),
        [CONFIG.xpEvents.homeworkCompletion]: linkedCell([row.homeworkId]),
        [CONFIG.xpEvents.xpBucket]: buildCellValueForField(
          xpEventsTable,
          CONFIG.xpEvents.xpBucket,
          CONFIG.values.xpBucketHomework
        ),
        [CONFIG.xpEvents.xpSource]: buildCellValueForField(
          xpEventsTable,
          CONFIG.xpEvents.xpSource,
          CONFIG.values.xpSourceHomework
        ),
        [CONFIG.xpEvents.xpPoints]: totalXp,
        [CONFIG.xpEvents.sourceKey]: row.sourceKey,
        [writableXpDateField]: activityDate,
        [writableXpDateSourceField]: buildCellValueForField(
          xpEventsTable,
          writableXpDateSourceField,
          CONFIG.values.xpActivityDateSource
        ),
      };

      if (row.weeklySummaryId && isWritableField(xpEventsTable, CONFIG.xpEvents.weeklySummary)) {
        createFields[CONFIG.xpEvents.weeklySummary] = linkedCell([row.weeklySummaryId]);
      }
      if (row.submissionId && isWritableField(xpEventsTable, CONFIG.xpEvents.submission)) {
        createFields[CONFIG.xpEvents.submission] = linkedCell([row.submissionId]);
      }
      if (isWritableField(xpEventsTable, CONFIG.xpEvents.reasonPublic)) {
        createFields[CONFIG.xpEvents.reasonPublic] = publicReason;
      }
      if (isWritableField(xpEventsTable, CONFIG.xpEvents.reasonDebug)) {
        createFields[CONFIG.xpEvents.reasonDebug] = debugReason;
      }
      if (isWritableField(xpEventsTable, CONFIG.xpEvents.awardedAt)) {
        createFields[CONFIG.xpEvents.awardedAt] = new Date();
      }
      if (isWritableField(xpEventsTable, CONFIG.xpEvents.active)) {
        createFields[CONFIG.xpEvents.active] = true;
      }
      if (isWritableField(xpEventsTable, CONFIG.xpEvents.processed)) {
        createFields[CONFIG.xpEvents.processed] = true;
      }

      xpEventId = await xpEventsTable.createRecordAsync(createFields);
    }

    const homeworkAwardFields = {
      [CONFIG.homework.xpEvents]: linkedCell([xpEventId]),
      [CONFIG.homework.awardStatus]: buildCellValueForField(
        homeworkTable,
        CONFIG.homework.awardStatus,
        CONFIG.values.awardAwarded
      ),
    };

    await homeworkTable.updateRecordAsync(row.homeworkId, homeworkAwardFields);

    results.push({
      homeworkId: row.homeworkId,
      action: row.action,
      xpEventId,
      status: "success",
    });
  }

  console.log(JSON.stringify({ status: "success", results }, null, 2));
}

await main();

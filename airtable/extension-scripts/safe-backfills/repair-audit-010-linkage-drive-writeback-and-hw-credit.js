/*
Extension Script: Repair Audit 010 — Linkage Drive Writeback + Homework Credit
System: 127 SI Shooting Challenge
Purpose:
  Closes remaining audit-video-and-homework-attachment-linkage v1.2 drift for three
  Homework Completions after repair-audit-linkage-full.js canonicalized assets but
  left stale Google Drive URLs on homework:

  - recs06QtifrE5iJUN (Ryder Elders HW2) ← asset rec8dyKUzsLq3qXj9
  - recPi0hpqI1Knw7ej (Maizee Mitchell HW1) ← asset recd0qrej5K2GUzNV
  - recItusIPVzmOxwct (Clara Hardy HW2) ← asset recV3YuKm3U5uIZU4

  Per row:
  1. Sync 022-style upload writeback from canonical Submission Asset → Homework
  2. Ensure review gates for 065 (placeholder coach feedback only if blank)
  3. Create HOMEWORK_XP| event + Award Status = Awarded when missing (064/065 parity)

Safety:
  - DRY_RUN = true by default
  - Set CONFIRM_WRITE = true AND DRY_RUN = false to apply
  - Skips XP create when HOMEWORK_XP| already linked and Award Status = Awarded
  - Does not delete records; does not re-trigger Make uploads

Setup:
  1. Dry run; review plannedActions
  2. Live write; re-run audit-video-and-homework-attachment-linkage.js
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;

const TARGETS = [
  {
    homeworkId: "recs06QtifrE5iJUN",
    assetId: "rec8dyKUzsLq3qXj9",
    label: "Ryder Elders — HW2 Week 6",
  },
  {
    homeworkId: "recPi0hpqI1Knw7ej",
    assetId: "recd0qrej5K2GUzNV",
    label: "Maizee Mitchell — HW1 Week 3",
  },
  {
    homeworkId: "recItusIPVzmOxwct",
    assetId: "recV3YuKm3U5uIZU4",
    label: "Clara Hardy — HW2 Week 6",
  },
];

const COACH_FEEDBACK_IF_BLANK =
  "Great work on this homework assignment. Coach accepted this submission for season credit. Mike";

const CONFIG = {
  scriptName: "repair-audit-010-linkage-drive-writeback-and-hw-credit",
  version: "v1.0",

  tables: {
    assets: "Submission Assets",
    homework: "Homework Completions",
    xpEvents: "XP Events",
    xpRewardRules: "XP Reward Rules",
    weeklySummary: "Weekly Athlete Summary",
  },

  assets: {
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
  },

  homework: {
    name: "Homework Completion Full Name",
    enrollment: "Enrollment",
    homework: "Homework",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary Link",
    submission: "Submissions - Linked",
    submissionAssets: "Submission Assets",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    writebackComplete: "Writeback Complete?",
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
    uploadedStatus: "Uploaded",
    syncableAssetStatuses: ["Uploaded", "Processing", "Error"],
    xpBucketHomework: "Homework Completion",
    xpSourceHomework: "Homework Completion",
    xpActivityDateSource: "Homework Submission Activity Date",
  },
};

function fieldExists(table, fieldName) {
  if (!fieldName) return false;
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

function getCell(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
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

function datesEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const left = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const right = b instanceof Date ? b.getTime() : new Date(b).getTime();
  return left === right;
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

function mapAssetUploadStatusToHomeworkStatus(assetStatus) {
  if (assetStatus === "Uploaded") return "Uploaded";
  if (assetStatus === "Processing") return "Processing";
  if (assetStatus === "Error") return "Error";
  return "Pending";
}

function buildHomeworkWritebackFields(homeworkTable, homeworkRecord, assetRecord, assetsTable) {
  const fields = {};
  const assetUploadStatus = getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus);

  if (!CONFIG.values.syncableAssetStatuses.includes(assetUploadStatus)) {
    return fields;
  }

  const targetStatus = mapAssetUploadStatusToHomeworkStatus(assetUploadStatus);
  const currentStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus);

  if (targetStatus && targetStatus !== currentStatus && isWritableField(homeworkTable, CONFIG.homework.uploadStatus)) {
    fields[CONFIG.homework.uploadStatus] = { name: targetStatus };
  }

  const textPairs = [
    [CONFIG.homework.googleDriveFileUrl, CONFIG.assets.googleDriveFileUrl],
    [CONFIG.homework.googleDriveFileId, CONFIG.assets.googleDriveFileId],
    [CONFIG.homework.googleDriveFolderId, CONFIG.assets.googleDriveFolderId],
    [CONFIG.homework.googleDriveFolderUrl, CONFIG.assets.googleDriveFolderUrl],
  ];

  for (const [homeworkField, assetField] of textPairs) {
    if (!isWritableField(homeworkTable, homeworkField) || !fieldExists(assetsTable, assetField)) continue;
    const assetValue = getText(assetRecord, assetsTable, assetField);
    const homeworkValue = getText(homeworkRecord, homeworkTable, homeworkField);
    if (assetValue !== homeworkValue) {
      fields[homeworkField] = assetValue;
    }
  }

  if (isWritableField(homeworkTable, CONFIG.homework.uploadError)) {
    const assetError = getText(assetRecord, assetsTable, CONFIG.assets.uploadError);
    const homeworkError = getText(homeworkRecord, homeworkTable, CONFIG.homework.uploadError);
    if (assetError !== homeworkError) {
      fields[CONFIG.homework.uploadError] = assetError;
    }
  }

  const assetUploadedAt = getCell(assetRecord, assetsTable, CONFIG.assets.uploadedAt);
  const homeworkUploadedAt = getCell(homeworkRecord, homeworkTable, CONFIG.homework.uploadedAt);

  if (
    assetUploadedAt &&
    !datesEqual(assetUploadedAt, homeworkUploadedAt) &&
    isWritableField(homeworkTable, CONFIG.homework.uploadedAt)
  ) {
    fields[CONFIG.homework.uploadedAt] = assetUploadedAt;
  }

  if (
    assetUploadStatus === CONFIG.values.uploadedStatus &&
    getCell(homeworkRecord, homeworkTable, CONFIG.homework.writebackComplete) !== true &&
    isWritableField(homeworkTable, CONFIG.homework.writebackComplete)
  ) {
    fields[CONFIG.homework.writebackComplete] = true;
  }

  return fields;
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

function resolveWeeklySummaryId({ sourceWeeklySummaryIds, enrollmentId, weekId, summaryIndex }) {
  if (sourceWeeklySummaryIds.length === 1) return sourceWeeklySummaryIds[0];
  const matches = summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || [];
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return matches[0];
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

  const assetsTable = base.getTable(CONFIG.tables.assets);
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

  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));

  const [xpQuery, summaryQuery, baseXpFromRule] = await Promise.all([
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

  for (const target of TARGETS) {
    const homeworkRecord = await homeworkTable.selectRecordAsync(target.homeworkId, {
      fields: homeworkFields,
    });
    const assetRecord = await assetsTable.selectRecordAsync(target.assetId, { fields: assetFields });

    if (!homeworkRecord) {
      planned.push({ ...target, action: "error", error: "homework_not_found" });
      continue;
    }
    if (!assetRecord) {
      planned.push({ ...target, action: "error", error: "asset_not_found" });
      continue;
    }

    const writebackFields = buildHomeworkWritebackFields(
      homeworkTable,
      homeworkRecord,
      assetRecord,
      assetsTable
    );

    const linkFields = {};
    if (isWritableField(homeworkTable, CONFIG.homework.submissionAssets)) {
      linkFields[CONFIG.homework.submissionAssets] = [{ id: target.assetId }];
    }

    const enrollmentId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.enrollment)[0] || "";
    const weekId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.week)[0] || "";
    const submissionId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submission)[0] || "";
    const awardStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.awardStatus);
    const linkedXpIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.xpEvents);
    const existingXpId = findExistingXpId(target.homeworkId, linkedXpIds, xpQuery, xpEventsTable);

    let activityDate =
      getDateValue(homeworkRecord, homeworkTable, [
        CONFIG.homework.submissionDateDateOnly,
        CONFIG.homework.submissionDate,
      ]) || getCell(assetRecord, assetsTable, CONFIG.assets.uploadedAt);

    if (!activityDate) activityDate = new Date();

    const writePhaseFields = { ...linkFields, ...writebackFields };

    if (existingXpId && awardStatus === CONFIG.values.awardAwarded) {
      planned.push({
        ...target,
        action: "writeback_only",
        writePhaseFields,
        existingXpEventId: existingXpId,
        note: "XP already awarded; sync Drive writeback only",
      });
      continue;
    }

    const reviewPrepFields = buildReviewPrepFields(homeworkRecord, homeworkTable);
    const prep064Fields = build064PrepFields(homeworkRecord, homeworkTable, baseXpFromRule);
    const xpPrepFields = { ...reviewPrepFields, ...prep064Fields };

    const projectedBaseXp =
      getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.baseXp) || baseXpFromRule;
    const projectedExtraXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.extraXp);
    let projectedTotalXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp);
    if (projectedTotalXp <= 0) projectedTotalXp = projectedBaseXp + projectedExtraXp;

    const weeklySummaryId = resolveWeeklySummaryId({
      sourceWeeklySummaryIds: getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.weeklySummary),
      enrollmentId,
      weekId,
      summaryIndex,
    });

    planned.push({
      ...target,
      action: existingXpId ? "writeback_and_mark_awarded" : "writeback_and_create_xp",
      writePhaseFields,
      xpPrepFields,
      existingXpEventId: existingXpId,
      createXp: !existingXpId,
      sourceKey: buildSourceKey(target.homeworkId),
      enrollmentId,
      weekId,
      submissionId,
      weeklySummaryId,
      projectedTotalXp,
      projectedBaseXp,
      projectedExtraXp,
      activityDate: activityDate.toISOString(),
    });
  }

  console.log("===== Repair Audit 010 — Linkage Drive Writeback + Homework Credit =====");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE WRITE"}`);
  console.log(
    JSON.stringify(
      {
        script: CONFIG.scriptName,
        version: CONFIG.version,
        dryRun: DRY_RUN,
        confirmWrite: CONFIRM_WRITE,
        baseXpFromRule,
        plannedCount: planned.length,
        planned,
      },
      null,
      2
    )
  );

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("\nTo apply: set DRY_RUN = false and CONFIRM_WRITE = true, then re-run.");
    return;
  }

  const results = [];

  for (const row of planned) {
    if (row.action === "error") {
      results.push(row);
      continue;
    }

    if (Object.keys(row.writePhaseFields || {}).length > 0) {
      await homeworkTable.updateRecordAsync(row.homeworkId, row.writePhaseFields);
    }

    if (row.action === "writeback_only") {
      results.push({ ...row, status: "success_writeback_only" });
      continue;
    }

    if (Object.keys(row.xpPrepFields || {}).length > 0) {
      await homeworkTable.updateRecordAsync(row.homeworkId, row.xpPrepFields);
    }

    let xpEventId = row.existingXpEventId || "";

    if (row.createXp) {
      const homeworkRecord = await homeworkTable.selectRecordAsync(row.homeworkId, {
        fields: homeworkFields,
      });
      const totalXp =
        getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp) || row.projectedTotalXp;
      const baseXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.baseXp) || row.projectedBaseXp;
      const extraXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.extraXp);
      const activityDate = new Date(row.activityDate);

      const publicReason = `Homework completed: ${getText(homeworkRecord, homeworkTable, CONFIG.homework.homework) || homeworkRecord.name}`;
      const debugReason = [
        `Repair 010 linkage drive writeback + credit for ${row.homeworkId}.`,
        `Canonical asset: ${row.assetId}`,
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

    await homeworkTable.updateRecordAsync(row.homeworkId, {
      [CONFIG.homework.xpEvents]: linkedCell([xpEventId]),
      [CONFIG.homework.awardStatus]: buildCellValueForField(
        homeworkTable,
        CONFIG.homework.awardStatus,
        CONFIG.values.awardAwarded
      ),
    });

    results.push({
      homeworkId: row.homeworkId,
      assetId: row.assetId,
      action: row.action,
      xpEventId,
      status: "success",
    });
  }

  console.log(JSON.stringify({ status: "success", results }, null, 2));
}

await main();

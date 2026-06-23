/*
Extension Script: Backfill Submission Pipeline Links
System: 127 SI Shooting Challenge
Purpose:
  Repairs counted-submission pipeline gaps detected by audit-submission-pipeline-integrity.js:
  - Weekly Athlete Summary link on Submission (canonical enrollment + week)
  - Asset Slot / Item Slot on Homework Completions (infer from submission HW1/HW2)
  - Submission Asset links on Homework Completions (all matching slot assets; multi-file OK)
  - Upload writeback sync when linked assets are Uploaded

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_WRITE must be true to write
  - BATCH_LIMIT caps planned fixes per run (default 50)
  - Skips missing Week, ambiguous WAS, and submissions with no matching homework assets

Does NOT:
  - Create Submission Assets or upload files (Nora Drive URL still manual if asset empty)
  - Fix Ryder Elders 1999 / missing Week rows (reported as skipped_missing_week)
  - Run backfill-submission-xp-events (run that separately after Week is set)

Setup:
  1. Run audit-submission-pipeline-integrity.js
  2. Dry run this script; review planned fixes
  3. CONFIRM_WRITE = true; re-run until remainingCount is 0
  4. Re-run audit; then edge upload backfill if needed
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 50;
const ONLY_COUNTED_SUBMISSIONS = true;

const CONFIG = {
  tables: {
    submissions: "Submissions",
    assets: "Submission Assets",
    homework: "Homework Completions",
    weeklySummary: "Weekly Athlete Summary",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    countThisSubmission: "Count This Submission?",
    homeworkName1: "Homework Name 1",
    homeworkName2: "Homework Name 2",
  },

  assets: {
    submission: "Submission - Linked",
    uploadDestination: "Upload Destination",
    assetPurpose: "Asset Purpose",
    assetSlot: "Asset Slot",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    homeworkCompletions: "Homework Completions",
  },

  homework: {
    submission: "Submissions - Linked",
    homework: "Homework",
    assetSlot: "Asset Slot",
    itemSlot: "Item Slot",
    submissionAssets: "Submission Assets",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    writebackComplete: "Writeback Complete?",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  values: {
    uploadDestinationHomework: "Homework Completions",
    syncableAssetStatuses: ["Uploaded", "Processing", "Error"],
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

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function getCell(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getNumberish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function uniqueIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

function linkedCell(ids) {
  return uniqueIds(ids).map(id => ({ id }));
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function purposeForSlot(slot) {
  if (slot === "HW1") return "Homework 1";
  if (slot === "HW2") return "Homework 2";
  return "";
}

function inferSlotFromCurriculum(submission, homeworkRecord, submissionsTable, homeworkTable) {
  const curriculumId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.homework);
  const hw1Id = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.homeworkName1);
  const hw2Id = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.homeworkName2);

  if (curriculumId && curriculumId === hw1Id) return "HW1";
  if (curriculumId && curriculumId === hw2Id) return "HW2";
  return "";
}

function slotFromAssetRecord(asset, assetsTable) {
  const assetSlot = getSelectName(asset, assetsTable, CONFIG.assets.assetSlot);
  if (assetSlot === "HW1" || assetSlot === "HW2") return assetSlot;

  const purpose = getSelectName(asset, assetsTable, CONFIG.assets.assetPurpose);
  if (purpose === "Homework 1") return "HW1";
  if (purpose === "Homework 2") return "HW2";
  return "";
}

function inferSlotFromLinkedAssets(homeworkRecord, homeworkTable, assetsTable, allAssets) {
  const linkedAssetIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submissionAssets);
  for (const assetId of linkedAssetIds) {
    const asset = allAssets.find(row => row.id === assetId);
    if (!asset) continue;
    const slot = slotFromAssetRecord(asset, assetsTable);
    if (slot) return slot;
  }

  for (const asset of allAssets) {
    const hwLinks = getLinkedIds(asset, assetsTable, CONFIG.assets.homeworkCompletions);
    if (!hwLinks.includes(homeworkRecord.id)) continue;
    const slot = slotFromAssetRecord(asset, assetsTable);
    if (slot) return slot;
  }

  return "";
}

function inferSlotFromSubmissionHomeworkRows(
  homeworkRecord,
  homeworkTable,
  homeworkRowsOnSubmission,
  submissionId,
  allAssets,
  assetsTable
) {
  const rowsNeedingSlot = homeworkRowsOnSubmission.filter(row => !getHomeworkSlot(row, homeworkTable));
  if (!rowsNeedingSlot.some(row => row.id === homeworkRecord.id)) return "";

  const usedSlots = new Set(
    homeworkRowsOnSubmission
      .map(row => getHomeworkSlot(row, homeworkTable))
      .filter(slot => slot === "HW1" || slot === "HW2")
  );

  if (submissionId && allAssets && assetsTable) {
    const submissionAssets = allAssets.filter(asset => {
      if (getFirstLinkedId(asset, assetsTable, CONFIG.assets.submission) !== submissionId) return false;
      return (
        getText(asset, assetsTable, CONFIG.assets.uploadDestination) ===
        CONFIG.values.uploadDestinationHomework
      );
    });

    const reverseLinked = submissionAssets.filter(asset =>
      getLinkedIds(asset, assetsTable, CONFIG.assets.homeworkCompletions).includes(homeworkRecord.id)
    );
    for (const asset of reverseLinked) {
      const slot = slotFromAssetRecord(asset, assetsTable);
      if (slot) return slot;
    }

    const unlinkedSlotted = submissionAssets.filter(asset => {
      const hwLinks = getLinkedIds(asset, assetsTable, CONFIG.assets.homeworkCompletions);
      return hwLinks.length === 0 && slotFromAssetRecord(asset, assetsTable);
    });

    if (unlinkedSlotted.length === 1) {
      return slotFromAssetRecord(unlinkedSlotted[0], assetsTable);
    }

    if (rowsNeedingSlot.length === unlinkedSlotted.length && unlinkedSlotted.length > 1) {
      const sortedRows = [...rowsNeedingSlot].sort((a, b) => a.id.localeCompare(b.id));
      const sortedAssets = [...unlinkedSlotted].sort((a, b) => a.id.localeCompare(b.id));
      const idx = sortedRows.findIndex(row => row.id === homeworkRecord.id);
      if (idx >= 0 && sortedAssets[idx]) {
        return slotFromAssetRecord(sortedAssets[idx], assetsTable);
      }
    }
  }

  if (rowsNeedingSlot.length === 1) {
    if (!usedSlots.has("HW1")) return "HW1";
    if (!usedSlots.has("HW2")) return "HW2";
    return "";
  }

  const sortedNeeding = [...rowsNeedingSlot].sort((a, b) => a.id.localeCompare(b.id));
  const idx = sortedNeeding.findIndex(row => row.id === homeworkRecord.id);
  if (idx === 0 && !usedSlots.has("HW1")) return "HW1";
  if (idx === 1 && !usedSlots.has("HW2")) return "HW2";
  if (idx >= 0 && sortedNeeding.length === 2) {
    if (!usedSlots.has("HW1")) return "HW1";
    if (!usedSlots.has("HW2")) return "HW2";
  }

  return "";
}

function getHomeworkSlot(homeworkRecord, homeworkTable) {
  return (
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.assetSlot) ||
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.itemSlot)
  );
}

function findHomeworkAssetsForSlot(allAssets, assetsTable, submissionId, slot) {
  if (!submissionId || !slot) return [];

  return allAssets.filter(asset => {
    if (getFirstLinkedId(asset, assetsTable, CONFIG.assets.submission) !== submissionId) return false;
    if (getText(asset, assetsTable, CONFIG.assets.uploadDestination) !== CONFIG.values.uploadDestinationHomework) {
      return false;
    }

    const assetSlot = getSelectName(asset, assetsTable, CONFIG.assets.assetSlot);
    if (assetSlot === slot) return true;

    const purpose = purposeForSlot(slot);
    return purpose && getSelectName(asset, assetsTable, CONFIG.assets.assetPurpose) === purpose;
  });
}

function deriveAggregateUploadStatus(assetRecords, assetsTable) {
  if (!assetRecords.length) return "";
  const statuses = assetRecords.map(asset => getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus));
  if (statuses.every(status => status === "Uploaded")) return "Uploaded";
  if (statuses.some(status => status === "Error")) return "Error";
  if (statuses.some(status => status === "Processing")) return "Processing";
  if (statuses.some(status => status === "Uploaded")) return "Processing";
  return "Pending";
}

function latestUploadedAt(assetRecords, assetsTable) {
  let latest = null;
  for (const asset of assetRecords) {
    const value = getCell(asset, assetsTable, CONFIG.assets.uploadedAt);
    if (!value) continue;
    const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (!latest || time > latest.time) latest = { time, value };
  }
  return latest?.value || null;
}

function datesEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const left = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const right = b instanceof Date ? b.getTime() : new Date(b).getTime();
  return left === right;
}

function buildHomeworkSyncFields(homeworkRecord, homeworkTable, assetRecords, assetsTable) {
  const aggregateStatus = deriveAggregateUploadStatus(assetRecords, assetsTable);
  if (!CONFIG.values.syncableAssetStatuses.includes(aggregateStatus)) return {};

  const fields = {};
  const currentStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus);

  if (
    aggregateStatus &&
    aggregateStatus !== currentStatus &&
    isWritableField(homeworkTable, CONFIG.homework.uploadStatus)
  ) {
    fields[CONFIG.homework.uploadStatus] = { name: aggregateStatus };
  }

  const primaryAsset =
    assetRecords.find(asset => getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus) === "Uploaded") ||
    assetRecords[0];

  if (primaryAsset) {
    const textPairs = [
      [CONFIG.homework.googleDriveFileUrl, CONFIG.assets.googleDriveFileUrl],
      [CONFIG.homework.googleDriveFileId, CONFIG.assets.googleDriveFileId],
      [CONFIG.homework.googleDriveFolderId, CONFIG.assets.googleDriveFolderId],
      [CONFIG.homework.googleDriveFolderUrl, CONFIG.assets.googleDriveFolderUrl],
    ];

    for (const [homeworkField, assetField] of textPairs) {
      if (!isWritableField(homeworkTable, homeworkField) || !fieldExists(assetsTable, assetField)) continue;
      const assetValue = getText(primaryAsset, assetsTable, assetField);
      const homeworkValue = getText(homeworkRecord, homeworkTable, homeworkField);
      if (assetValue && assetValue !== homeworkValue) {
        fields[homeworkField] = assetValue;
      }
    }
  }

  if (isWritableField(homeworkTable, CONFIG.homework.uploadError)) {
    const errors = assetRecords
      .map(asset => getText(asset, assetsTable, CONFIG.assets.uploadError))
      .filter(Boolean);
    const combinedError = [...new Set(errors)].join(" | ");
    const currentError = getText(homeworkRecord, homeworkTable, CONFIG.homework.uploadError);
    if (combinedError !== currentError) {
      fields[CONFIG.homework.uploadError] = combinedError;
    }
  }

  const aggregateUploadedAt = latestUploadedAt(assetRecords, assetsTable);
  const homeworkUploadedAt = getCell(homeworkRecord, homeworkTable, CONFIG.homework.uploadedAt);
  if (
    aggregateUploadedAt &&
    !datesEqual(aggregateUploadedAt, homeworkUploadedAt) &&
    isWritableField(homeworkTable, CONFIG.homework.uploadedAt)
  ) {
    fields[CONFIG.homework.uploadedAt] = aggregateUploadedAt;
  }

  if (
    aggregateStatus === "Uploaded" &&
    getCell(homeworkRecord, homeworkTable, CONFIG.homework.writebackComplete) !== true &&
    isWritableField(homeworkTable, CONFIG.homework.writebackComplete)
  ) {
    fields[CONFIG.homework.writebackComplete] = true;
  }

  return fields;
}

async function main() {
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const submissionFields = Object.values(CONFIG.submissions).filter(name =>
    fieldExists(submissionsTable, name)
  );
  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );

  const [submissionQuery, assetQuery, homeworkQuery, summaryQuery] = await Promise.all([
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
    assetsTable.selectRecordsAsync({ fields: assetFields }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
  ]);

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment);
    const weekId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.week);
    if (!enrollmentId || !weekId) continue;
    const key = buildSummaryIndexKey(enrollmentId, weekId);
    if (!summaryIndex.has(key)) summaryIndex.set(key, []);
    summaryIndex.get(key).push(summary.id);
  }

  const homeworkBySubmission = new Map();
  for (const hw of homeworkQuery.records) {
    const submissionId = getFirstLinkedId(hw, homeworkTable, CONFIG.homework.submission);
    if (!submissionId) continue;
    if (!homeworkBySubmission.has(submissionId)) homeworkBySubmission.set(submissionId, []);
    homeworkBySubmission.get(submissionId).push(hw);
  }

  const planned = [];
  const skipped = [];
  const skipCounts = {};

  function skip(reason, row) {
    skipCounts[reason] = (skipCounts[reason] || 0) + 1;
    skipped.push({ reason, ...row });
  }

  for (const submission of submissionQuery.records) {
    if (ONLY_COUNTED_SUBMISSIONS && getNumberish(submission, submissionsTable, CONFIG.submissions.countThisSubmission) !== 1) {
      continue;
    }

    const submissionId = submission.id;
    const enrollmentId = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.enrollment);
    const weekId = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.week);
    const weeklySummaryId = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.weeklySummary);

    if (!weekId) {
      skip("skipped_missing_week", { submissionId, name: submission.name });
      continue;
    }

    const summaryMatches = summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || [];

    if (summaryMatches.length > 1) {
      skip("skipped_ambiguous_weekly_summary", {
        submissionId,
        name: submission.name,
        summaryIds: summaryMatches,
      });
    } else if (summaryMatches.length === 1 && weeklySummaryId !== summaryMatches[0]) {
      planned.push({
        action: "fix_weekly_summary_link",
        submissionId,
        name: submission.name,
        fromWeeklySummaryId: weeklySummaryId,
        toWeeklySummaryId: summaryMatches[0],
      });
    }

    const homeworkRows = homeworkBySubmission.get(submissionId) || [];

    for (const homeworkRecord of homeworkRows) {
      const homeworkId = homeworkRecord.id;
      let slot = getHomeworkSlot(homeworkRecord, homeworkTable);

      if (!slot) {
        let inferred = inferSlotFromCurriculum(submission, homeworkRecord, submissionsTable, homeworkTable);
        if (!inferred) {
          inferred = inferSlotFromLinkedAssets(
            homeworkRecord,
            homeworkTable,
            assetsTable,
            assetQuery.records
          );
        }
        if (!inferred) {
          inferred = inferSlotFromSubmissionHomeworkRows(
            homeworkRecord,
            homeworkTable,
            homeworkRows,
            submissionId,
            assetQuery.records,
            assetsTable
          );
        }
        if (!inferred) {
          skip("skipped_cannot_infer_homework_slot", {
            submissionId,
            homeworkId,
            name: submission.name,
          });
          continue;
        }
        slot = inferred;
      }

      const matchingAssets = findHomeworkAssetsForSlot(
        assetQuery.records,
        assetsTable,
        submissionId,
        slot
      );

      if (matchingAssets.length === 0) {
        skip("skipped_no_homework_asset_on_submission", {
          submissionId,
          homeworkId,
          slot,
          name: submission.name,
        });

        if (!getHomeworkSlot(homeworkRecord, homeworkTable) && slot) {
          planned.push({
            action: "set_homework_slot_only",
            submissionId,
            homeworkId,
            name: submission.name,
            slot,
          });
        }
        continue;
      }

      const assetIds = matchingAssets.map(asset => asset.id);
      const currentAssetIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submissionAssets);
      const mergedAssetIds = uniqueIds([...currentAssetIds, ...assetIds]);
      const needsAssetLink =
        mergedAssetIds.length !== currentAssetIds.length ||
        mergedAssetIds.some(id => !currentAssetIds.includes(id));

      const syncFields = buildHomeworkSyncFields(
        homeworkRecord,
        homeworkTable,
        matchingAssets,
        assetsTable
      );

      const needsSlotWrite = !getHomeworkSlot(homeworkRecord, homeworkTable);

      if (!needsSlotWrite && !needsAssetLink && Object.keys(syncFields).length === 0) {
        continue;
      }

      planned.push({
        action: needsAssetLink ? "link_homework_assets_and_sync" : "set_homework_slot_and_sync",
        submissionId,
        homeworkId,
        name: submission.name,
        slot,
        assetIds: mergedAssetIds,
        assetIdsToLink: assetIds,
        syncFieldCount: Object.keys(syncFields).length,
      });
    }
  }

  const batch = planned.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      if (row.action === "fix_weekly_summary_link") {
        if (!DRY_RUN && CONFIRM_WRITE && isWritableField(submissionsTable, CONFIG.submissions.weeklySummary)) {
          await submissionsTable.updateRecordAsync(row.submissionId, {
            [CONFIG.submissions.weeklySummary]: linkedCell([row.toWeeklySummaryId]),
          });
        }
        applied.push(row);
        continue;
      }

      if (row.action === "set_homework_slot_only") {
        const homeworkFieldsUpdate = {};
        if (isWritableField(homeworkTable, CONFIG.homework.assetSlot)) {
          homeworkFieldsUpdate[CONFIG.homework.assetSlot] = { name: row.slot };
        }
        if (isWritableField(homeworkTable, CONFIG.homework.itemSlot)) {
          homeworkFieldsUpdate[CONFIG.homework.itemSlot] = { name: row.slot };
        }

        if (!DRY_RUN && CONFIRM_WRITE && Object.keys(homeworkFieldsUpdate).length > 0) {
          await homeworkTable.updateRecordAsync(row.homeworkId, homeworkFieldsUpdate);
        }
        applied.push(row);
        continue;
      }

      const homeworkRecord = homeworkQuery.getRecord(row.homeworkId);
      const matchingAssets = row.assetIdsToLink
        .map(id => assetQuery.getRecord(id))
        .filter(Boolean);

      const homeworkFieldsUpdate = {};

      if (isWritableField(homeworkTable, CONFIG.homework.assetSlot)) {
        homeworkFieldsUpdate[CONFIG.homework.assetSlot] = { name: row.slot };
      }
      if (isWritableField(homeworkTable, CONFIG.homework.itemSlot)) {
        homeworkFieldsUpdate[CONFIG.homework.itemSlot] = { name: row.slot };
      }
      if (isWritableField(homeworkTable, CONFIG.homework.submissionAssets)) {
        homeworkFieldsUpdate[CONFIG.homework.submissionAssets] = linkedCell(row.assetIds);
      }

      Object.assign(
        homeworkFieldsUpdate,
        buildHomeworkSyncFields(homeworkRecord, homeworkTable, matchingAssets, assetsTable)
      );

      if (!DRY_RUN && CONFIRM_WRITE && Object.keys(homeworkFieldsUpdate).length > 0) {
        await homeworkTable.updateRecordAsync(row.homeworkId, homeworkFieldsUpdate);
      }

      for (const assetId of row.assetIdsToLink) {
        const assetRecord = assetQuery.getRecord(assetId);
        if (!assetRecord) continue;

        const assetUpdate = {};
        const existingHwLinks = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.homeworkCompletions);
        const mergedHwLinks = uniqueIds([...existingHwLinks, row.homeworkId]);

        if (isWritableField(assetsTable, CONFIG.assets.homeworkCompletions)) {
          assetUpdate[CONFIG.assets.homeworkCompletions] = linkedCell(mergedHwLinks);
        }
        if (
          !getSelectName(assetRecord, assetsTable, CONFIG.assets.assetSlot) &&
          isWritableField(assetsTable, CONFIG.assets.assetSlot)
        ) {
          assetUpdate[CONFIG.assets.assetSlot] = { name: row.slot };
        }

        if (!DRY_RUN && CONFIRM_WRITE && Object.keys(assetUpdate).length > 0) {
          await assetsTable.updateRecordAsync(assetId, assetUpdate);
        }
      }

      applied.push(row);
    } catch (error) {
      errors.push({
        action: row.action,
        submissionId: row.submissionId,
        homeworkId: row.homeworkId || "",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    script: "backfill-submission-pipeline-links",
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    batchLimit: BATCH_LIMIT,
    plannedCount: planned.length,
    batchCount: batch.length,
    appliedCount: DRY_RUN || !CONFIRM_WRITE ? 0 : applied.length,
    remainingCount: Math.max(0, planned.length - batch.length),
    skipCounts,
    actionCounts: applied.reduce((acc, row) => {
      acc[row.action] = (acc[row.action] || 0) + 1;
      return acc;
    }, {}),
    errors,
    skippedSample: skipped.slice(0, 15),
    sample: applied.slice(0, 20),
  };

  console.log("===== BACKFILL SUBMISSION PIPELINE LINKS =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();

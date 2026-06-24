/*
Extension Script: Backfill Homework Completion Orphan Resolve
System: 127 SI Shooting Challenge
Purpose:
  Resolves Homework Completions with no linked Submission Assets (orphans):
  - Repair: infer HW1/HW2 slot, link matching submission assets, sync upload fields
  - Accept as uploaded: coach override for known rows (no file required)
  - Archive: when no homework asset on the submission has a file (never uploaded)

  Known manual exceptions (2026-06-23):
  - rec2zZneEiNzXfJlP / recUyVb0l5B9XR7ZA — Davison, accept-as-uploaded override
  - rectbtMV34S0AuDAV / recosswni7z7MuKuQ — Tracen / Allie Heidema Week 3 Char33, accept-as-uploaded override
  - recOzuFYHazBth8Eg / rec7nSabIJO1WfRJx — Dayton Fox Week 4 HW1/HW2, accept-as-uploaded override

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_WRITE must be true to write
  - ARCHIVE_IF_NO_FILE must be true to archive (otherwise report-only)
  - BATCH_LIMIT caps planned fixes per run (default 50)

Setup:
  1. Dry run; review planned repair vs archive actions
  2. CONFIRM_WRITE = true; ARCHIVE_IF_NO_FILE = true if archiving empty uploads
  3. Re-run audit-field-coverage-report.js and audit-homework-completion-upload-edge-cases.js
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const ARCHIVE_IF_NO_FILE = true;
const BATCH_LIMIT = 50;

/** Optional filter — null scans all orphans with zero linked Submission Assets */
const TARGET_HOMEWORK_IDS = null;

/** Coach override: mark upload fields complete without Submission Assets or Drive files */
const MANUAL_ACCEPT_AS_UPLOADED_IDS = [
  "rec2zZneEiNzXfJlP", // Nora Davison (done)
  "recUyVb0l5B9XR7ZA", // Charlotte Davison (done)
  "rectbtMV34S0AuDAV", // Tracen Heidema Week 3 (done)
  "recosswni7z7MuKuQ", // Allie Heidema Week 3
  "recOzuFYHazBth8Eg", // Dayton Fox Week 4 HW1 (done)
  "rec7nSabIJO1WfRJx", // Dayton Fox Week 4 HW2 (done)
];

const CONFIG = {
  scriptName: "backfill-homework-completion-orphan-resolve",
  version: "v1.3",

  tables: {
    submissions: "Submissions",
    assets: "Submission Assets",
    homework: "Homework Completions",
  },

  submissions: {
    homeworkName1: "Homework Name 1",
    homeworkName2: "Homework Name 2",
  },

  assets: {
    submission: "Submission - Linked",
    uploadDestination: "Upload Destination",
    assetPurpose: "Asset Purpose",
    assetSlot: "Asset Slot",
    attachment: "Airtable Attachment",
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
    reviewStatus: "Review Status",
    completionStatus: "Completion Status",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    writebackComplete: "Writeback Complete?",
  },

  values: {
    uploadDestinationHomework: "Homework Completions",
    syncableAssetStatuses: ["Uploaded", "Processing", "Error"],
    archiveReviewStatus: "Archived",
    archiveCompletionStatus: "Not Accepted",
    acceptUploadStatus: "Uploaded",
    acceptCompletionStatus: "Submitted",
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

function hasAttachments(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return Array.isArray(raw) && raw.length > 0;
}

function assetHasFile(asset, assetsTable) {
  return (
    hasAttachments(asset, assetsTable, CONFIG.assets.attachment) ||
    Boolean(getText(asset, assetsTable, CONFIG.assets.googleDriveFileUrl))
  );
}

function uniqueIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

function linkedCell(ids) {
  return uniqueIds(ids).map(id => ({ id }));
}

function getHomeworkSlot(homeworkRecord, homeworkTable) {
  return (
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.assetSlot) ||
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.itemSlot)
  );
}

function purposeForSlot(slot) {
  if (slot === "HW1") return "Homework 1";
  if (slot === "HW2") return "Homework 2";
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

function inferSlotFromCurriculum(submission, homeworkRecord, submissionsTable, homeworkTable) {
  const curriculumId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.homework);
  const hw1Id = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.homeworkName1);
  const hw2Id = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.homeworkName2);

  if (curriculumId && curriculumId === hw1Id) return "HW1";
  if (curriculumId && curriculumId === hw2Id) return "HW2";
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

  if (rowsNeedingSlot.length === 1) {
    if (!usedSlots.has("HW1")) return "HW1";
    if (!usedSlots.has("HW2")) return "HW2";
    return "";
  }

  const sortedNeeding = [...rowsNeedingSlot].sort((a, b) => a.id.localeCompare(b.id));
  const idx = sortedNeeding.findIndex(row => row.id === homeworkRecord.id);
  if (idx === 0 && !usedSlots.has("HW1")) return "HW1";
  if (idx === 1 && !usedSlots.has("HW2")) return "HW2";

  return "";
}

function findHomeworkAssetsForSlot(allAssets, assetsTable, submissionId, slot) {
  if (!submissionId || !slot) return [];

  return allAssets.filter(asset => {
    if (getFirstLinkedId(asset, assetsTable, CONFIG.assets.submission) !== submissionId) return false;
    if (
      getText(asset, assetsTable, CONFIG.assets.uploadDestination) !==
      CONFIG.values.uploadDestinationHomework
    ) {
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

function syncTextFromAsset(fields, childTable, childField, childRecord, asset, assetsTable, assetField) {
  if (!isWritableField(childTable, childField) || !fieldExists(assetsTable, assetField)) return;
  const assetValue = getText(asset, assetsTable, assetField);
  const childValue = getText(childRecord, childTable, childField);
  if (assetValue !== childValue) fields[childField] = assetValue;
}

function buildHomeworkSyncFields(homeworkRecord, homeworkTable, assetRecords, assetsTable) {
  const fields = {};
  const aggregateStatus = deriveAggregateUploadStatus(assetRecords, assetsTable);
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
    syncTextFromAsset(
      fields,
      homeworkTable,
      CONFIG.homework.googleDriveFileUrl,
      homeworkRecord,
      primaryAsset,
      assetsTable,
      CONFIG.assets.googleDriveFileUrl
    );
    syncTextFromAsset(
      fields,
      homeworkTable,
      CONFIG.homework.googleDriveFileId,
      homeworkRecord,
      primaryAsset,
      assetsTable,
      CONFIG.assets.googleDriveFileId
    );
    syncTextFromAsset(
      fields,
      homeworkTable,
      CONFIG.homework.googleDriveFolderId,
      homeworkRecord,
      primaryAsset,
      assetsTable,
      CONFIG.assets.googleDriveFolderId
    );
    syncTextFromAsset(
      fields,
      homeworkTable,
      CONFIG.homework.googleDriveFolderUrl,
      homeworkRecord,
      primaryAsset,
      assetsTable,
      CONFIG.assets.googleDriveFolderUrl
    );

    const assetError = getText(primaryAsset, assetsTable, CONFIG.assets.uploadError);
    const currentError = getText(homeworkRecord, homeworkTable, CONFIG.homework.uploadError);
    if (assetError !== currentError && isWritableField(homeworkTable, CONFIG.homework.uploadError)) {
      fields[CONFIG.homework.uploadError] = assetError;
    }

    const assetUploadedAt = getCell(primaryAsset, assetsTable, CONFIG.assets.uploadedAt);
    const currentUploadedAt = getCell(homeworkRecord, homeworkTable, CONFIG.homework.uploadedAt);
    if (
      assetUploadedAt &&
      !datesEqual(assetUploadedAt, currentUploadedAt) &&
      isWritableField(homeworkTable, CONFIG.homework.uploadedAt)
    ) {
      fields[CONFIG.homework.uploadedAt] = assetUploadedAt;
    }
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

function buildAcceptAsUploadedFields(homeworkRecord, homeworkTable, slot) {
  const fields = {};
  const currentUpload = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus);
  const currentCompletion = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.completionStatus);

  if (slot && !getHomeworkSlot(homeworkRecord, homeworkTable)) {
    if (isWritableField(homeworkTable, CONFIG.homework.assetSlot)) {
      fields[CONFIG.homework.assetSlot] = { name: slot };
    }
    if (isWritableField(homeworkTable, CONFIG.homework.itemSlot)) {
      fields[CONFIG.homework.itemSlot] = { name: slot };
    }
  }

  if (
    currentUpload !== CONFIG.values.acceptUploadStatus &&
    isWritableField(homeworkTable, CONFIG.homework.uploadStatus)
  ) {
    fields[CONFIG.homework.uploadStatus] = { name: CONFIG.values.acceptUploadStatus };
  }

  if (
    getCell(homeworkRecord, homeworkTable, CONFIG.homework.writebackComplete) !== true &&
    isWritableField(homeworkTable, CONFIG.homework.writebackComplete)
  ) {
    fields[CONFIG.homework.writebackComplete] = true;
  }

  if (
    currentCompletion !== CONFIG.values.acceptCompletionStatus &&
    isWritableField(homeworkTable, CONFIG.homework.completionStatus)
  ) {
    fields[CONFIG.homework.completionStatus] = { name: CONFIG.values.acceptCompletionStatus };
  }

  return fields;
}

function buildArchiveFields(homeworkRecord, homeworkTable) {
  const fields = {};
  const currentReview = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.reviewStatus);
  const currentCompletion = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.completionStatus);

  if (
    currentReview !== CONFIG.values.archiveReviewStatus &&
    isWritableField(homeworkTable, CONFIG.homework.reviewStatus)
  ) {
    fields[CONFIG.homework.reviewStatus] = { name: CONFIG.values.archiveReviewStatus };
  }

  if (
    currentCompletion !== CONFIG.values.archiveCompletionStatus &&
    isWritableField(homeworkTable, CONFIG.homework.completionStatus)
  ) {
    fields[CONFIG.homework.completionStatus] = { name: CONFIG.values.archiveCompletionStatus };
  }

  return fields;
}

function needsAcceptAsUploaded(homeworkRecord, homeworkTable) {
  const upload = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus);
  const writeback = getCell(homeworkRecord, homeworkTable, CONFIG.homework.writebackComplete);
  const completion = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.completionStatus);

  return (
    upload !== CONFIG.values.acceptUploadStatus ||
    writeback !== true ||
    completion !== CONFIG.values.acceptCompletionStatus
  );
}

function inferHomeworkSlot(homeworkRecord, homeworkTable, submission, submissionsTable, homeworkRows, submissionId, allAssets, assetsTable) {
  let slot = getHomeworkSlot(homeworkRecord, homeworkTable);
  if (slot) return slot;

  return (
    inferSlotFromCurriculum(submission, homeworkRecord, submissionsTable, homeworkTable) ||
    inferSlotFromSubmissionHomeworkRows(
      homeworkRecord,
      homeworkTable,
      homeworkRows,
      submissionId,
      allAssets,
      assetsTable
    ) ||
    "HW1"
  );
}

function submissionHasFileAssetForSlot(allAssets, assetsTable, submissionId, slot) {
  const assets = findHomeworkAssetsForSlot(allAssets, assetsTable, submissionId, slot);
  return assets.some(asset => assetHasFile(asset, assetsTable));
}

async function main() {
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);

  const homeworkQuery = await homeworkTable.selectRecordsAsync({
    fields: Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name)),
  });

  const submissionQuery = await submissionsTable.selectRecordsAsync({
    fields: Object.values(CONFIG.submissions).filter(name => fieldExists(submissionsTable, name)),
  });

  const assetQuery = await assetsTable.selectRecordsAsync({
    fields: Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name)),
  });

  const homeworkBySubmission = new Map();
  for (const homeworkRecord of homeworkQuery.records) {
    const submissionId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.submission);
    if (!submissionId) continue;
    if (!homeworkBySubmission.has(submissionId)) homeworkBySubmission.set(submissionId, []);
    homeworkBySubmission.get(submissionId).push(homeworkRecord);
  }

  const planned = [];
  const skipped = [];

  for (const homeworkRecord of homeworkQuery.records) {
    const homeworkId = homeworkRecord.id;

    if (Array.isArray(TARGET_HOMEWORK_IDS) && TARGET_HOMEWORK_IDS.length > 0) {
      if (!TARGET_HOMEWORK_IDS.includes(homeworkId)) continue;
    }

    const submissionId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.submission);
    if (!submissionId) {
      skipped.push({ reason: "skipped_missing_submission_link", homeworkId, name: homeworkRecord.name });
      continue;
    }

    const submission = submissionQuery.getRecord(submissionId);
    if (!submission) {
      skipped.push({ reason: "skipped_submission_not_found", homeworkId, submissionId });
      continue;
    }

    const homeworkRows = homeworkBySubmission.get(submissionId) || [];
    const slot = inferHomeworkSlot(
      homeworkRecord,
      homeworkTable,
      submission,
      submissionsTable,
      homeworkRows,
      submissionId,
      assetQuery.records,
      assetsTable
    );

    if (MANUAL_ACCEPT_AS_UPLOADED_IDS.includes(homeworkId)) {
      if (!needsAcceptAsUploaded(homeworkRecord, homeworkTable)) {
        skipped.push({ reason: "skipped_already_accepted", homeworkId, name: homeworkRecord.name });
        continue;
      }

      planned.push({
        action: "accept_as_uploaded",
        homeworkId,
        name: homeworkRecord.name,
        submissionId,
        slot,
        reason: "Coach override — count as uploaded (linked assets OK)",
      });
      continue;
    }

    const linkedAssetIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submissionAssets);
    if (linkedAssetIds.length > 0) {
      skipped.push({ reason: "skipped_has_linked_assets", homeworkId, name: homeworkRecord.name });
      continue;
    }

    const matchingAssets = slot
      ? findHomeworkAssetsForSlot(assetQuery.records, assetsTable, submissionId, slot)
      : [];

    const fileAssets = matchingAssets.filter(asset => assetHasFile(asset, assetsTable));

    if (fileAssets.length > 0 && slot) {
      planned.push({
        action: "repair_link_and_sync",
        homeworkId,
        name: homeworkRecord.name,
        submissionId,
        slot,
        assetIds: matchingAssets.map(asset => asset.id),
        fileAssetCount: fileAssets.length,
      });
      continue;
    }

    if (slot && submissionHasFileAssetForSlot(assetQuery.records, assetsTable, submissionId, slot)) {
      skipped.push({
        reason: "skipped_assets_exist_but_not_matched",
        homeworkId,
        submissionId,
        slot,
        name: homeworkRecord.name,
      });
      continue;
    }

    if (!ARCHIVE_IF_NO_FILE) {
      skipped.push({
        reason: "skipped_no_file_archive_disabled",
        homeworkId,
        submissionId,
        slot: slot || "",
        name: homeworkRecord.name,
      });
      continue;
    }

    planned.push({
      action: "archive_no_upload",
      homeworkId,
      name: homeworkRecord.name,
      submissionId,
      slot: slot || "",
      reason: slot
        ? "No homework asset with file on submission for inferred slot"
        : "Could not infer slot and no linked assets",
    });
  }

  const batch = planned.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      const homeworkRecord = homeworkQuery.getRecord(row.homeworkId);
      if (!homeworkRecord) continue;

      if (row.action === "archive_no_upload") {
        const fields = buildArchiveFields(homeworkRecord, homeworkTable);
        if (!DRY_RUN && CONFIRM_WRITE && Object.keys(fields).length > 0) {
          await homeworkTable.updateRecordAsync(row.homeworkId, fields);
        }
        applied.push(row);
        continue;
      }

      if (row.action === "accept_as_uploaded") {
        const fields = buildAcceptAsUploadedFields(homeworkRecord, homeworkTable, row.slot);
        if (!DRY_RUN && CONFIRM_WRITE && Object.keys(fields).length > 0) {
          await homeworkTable.updateRecordAsync(row.homeworkId, fields);
        }
        applied.push(row);
        continue;
      }

      const matchingAssets = row.assetIds
        .map(id => assetQuery.getRecord(id))
        .filter(Boolean);

      const homeworkFields = {};
      if (isWritableField(homeworkTable, CONFIG.homework.assetSlot)) {
        homeworkFields[CONFIG.homework.assetSlot] = { name: row.slot };
      }
      if (isWritableField(homeworkTable, CONFIG.homework.itemSlot)) {
        homeworkFields[CONFIG.homework.itemSlot] = { name: row.slot };
      }
      if (isWritableField(homeworkTable, CONFIG.homework.submissionAssets)) {
        homeworkFields[CONFIG.homework.submissionAssets] = linkedCell(row.assetIds);
      }

      Object.assign(
        homeworkFields,
        buildHomeworkSyncFields(homeworkRecord, homeworkTable, matchingAssets, assetsTable)
      );

      if (!DRY_RUN && CONFIRM_WRITE && Object.keys(homeworkFields).length > 0) {
        await homeworkTable.updateRecordAsync(row.homeworkId, homeworkFields);
      }

      for (const assetId of row.assetIds) {
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
        homeworkId: row.homeworkId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    archiveIfNoFile: ARCHIVE_IF_NO_FILE,
    manualAcceptAsUploadedIds: MANUAL_ACCEPT_AS_UPLOADED_IDS,
    batchLimit: BATCH_LIMIT,
    plannedCount: planned.length,
    batchCount: batch.length,
    appliedCount: DRY_RUN || !CONFIRM_WRITE ? 0 : applied.length,
    remainingCount: Math.max(0, planned.length - batch.length),
    actionCounts: applied.reduce((acc, row) => {
      acc[row.action] = (acc[row.action] || 0) + 1;
      return acc;
    }, {}),
    errors,
    skippedSample: skipped.slice(0, 15),
    sample: applied.slice(0, 20),
  };

  console.log("===== BACKFILL HOMEWORK COMPLETION ORPHAN RESOLVE =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();

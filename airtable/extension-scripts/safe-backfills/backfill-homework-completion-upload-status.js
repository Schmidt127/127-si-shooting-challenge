/*
Extension Script: Backfill Homework Completion Upload Status from Submission Assets
System: 127 SI Shooting Challenge
Purpose:
  Syncs Homework Completions that are still Pending (or Processing/Error mismatch)
  when their linked Submission Asset is already Uploaded (or Processing/Error).

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true to apply updates
  - BATCH_LIMIT caps writes per run (default 50); re-run until remainingCount is 0
  - Only updates rows with exactly one linked Submission Asset
  - Skips when asset and homework upload fields already match

Setup:
  1. Run with DRY_RUN = true and review stalePendingCount
  2. Set CONFIRM_WRITE = true and re-run in batches until complete
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 50;

const CONFIG = {
  tables: {
    assets: "Submission Assets",
    homework: "Homework Completions",
  },

  assets: {
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
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    submissionAssets: "Submission Assets",
    writebackComplete: "Writeback Complete?",
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
    const field = table.getField(fieldName);
    return field.isComputed !== true;
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

function getCell(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function datesEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const left = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const right = b instanceof Date ? b.getTime() : new Date(b).getTime();

  return left === right;
}

function mapAssetUploadStatusToHomeworkStatus(assetStatus) {
  if (assetStatus === "Uploaded") return "Uploaded";
  if (assetStatus === "Processing") return "Processing";
  if (assetStatus === "Error") return "Error";
  return "Pending";
}

function buildSyncFields(homeworkTable, homeworkRecord, assetRecord, assetsTable) {
  const fields = {};
  const assetUploadStatus = getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus);

  if (!["Uploaded", "Processing", "Error"].includes(assetUploadStatus)) {
    return null;
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

  if (!datesEqual(assetUploadedAt, homeworkUploadedAt) && isWritableField(homeworkTable, CONFIG.homework.uploadedAt)) {
    if (assetUploadedAt) {
      fields[CONFIG.homework.uploadedAt] = assetUploadedAt;
    }
  }

  if (
    assetUploadStatus === "Uploaded" &&
    getCell(homeworkRecord, homeworkTable, CONFIG.homework.writebackComplete) !== true &&
    isWritableField(homeworkTable, CONFIG.homework.writebackComplete)
  ) {
    fields[CONFIG.homework.writebackComplete] = true;
  }

  return Object.keys(fields).length > 0 ? fields : null;
}

async function main() {
  if (CONFIRM_WRITE && DRY_RUN) {
    throw new Error("CONFIRM_WRITE is true but DRY_RUN is still true. Set DRY_RUN = false to apply writes.");
  }

  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);

  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));

  const [assetQuery, homeworkQuery] = await Promise.all([
    assetsTable.selectRecordsAsync({ fields: assetFields }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
  ]);

  const assetById = new Map(assetQuery.records.map(record => [record.id, record]));

  const candidates = [];
  let alreadySyncedCount = 0;
  let skippedMultipleAssetsCount = 0;
  let skippedNoAssetCount = 0;
  let skippedAssetNotReadyCount = 0;

  for (const homeworkRecord of homeworkQuery.records) {
    const assetIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submissionAssets);

    if (assetIds.length === 0) {
      skippedNoAssetCount += 1;
      continue;
    }

    if (assetIds.length > 1) {
      skippedMultipleAssetsCount += 1;
      continue;
    }

    const assetRecord = assetById.get(assetIds[0]);
    if (!assetRecord) {
      skippedNoAssetCount += 1;
      continue;
    }

    const assetStatus = getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus);

    if (!["Uploaded", "Processing", "Error"].includes(assetStatus)) {
      skippedAssetNotReadyCount += 1;
      continue;
    }

    const syncFields = buildSyncFields(homeworkTable, homeworkRecord, assetRecord, assetsTable);

    if (!syncFields) {
      alreadySyncedCount += 1;
      continue;
    }

    candidates.push({
      homeworkId: homeworkRecord.id,
      assetId: assetRecord.id,
      homeworkStatus: getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus),
      assetStatus: getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus),
      fields: syncFields,
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  let updatedCount = 0;

  for (const row of batch) {
    if (!DRY_RUN && CONFIRM_WRITE) {
      await homeworkTable.updateRecordAsync(row.homeworkId, row.fields);
      updatedCount += 1;
    }
  }

  const summary = {
    script: "backfill-homework-completion-upload-status",
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    batchLimit: BATCH_LIMIT,
    candidateCount: candidates.length,
    batchCount: batch.length,
    updatedCount: DRY_RUN ? 0 : updatedCount,
    remainingCount: Math.max(candidates.length - batch.length, 0),
    alreadySyncedCount,
    skippedNoAssetCount,
    skippedMultipleAssetsCount,
    skippedAssetNotReadyCount,
    sample: batch.slice(0, 10).map(row => ({
      homeworkId: row.homeworkId,
      assetId: row.assetId,
      fromStatus: row.homeworkStatus,
      toStatus: row.fields[CONFIG.homework.uploadStatus]?.name || row.assetStatus,
      fieldCount: Object.keys(row.fields).length,
    })),
  };

  console.log(JSON.stringify(summary, null, 2));
}

await main();

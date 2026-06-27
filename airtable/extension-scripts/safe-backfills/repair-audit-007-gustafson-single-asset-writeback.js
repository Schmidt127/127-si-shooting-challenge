/*
Extension Script: Repair Audit 007 — Gustafson Single-Asset Writeback
System: 127 SI Shooting Challenge
Purpose:
  Fix #7 in the audit repair sequence (v1.2 linkage audit).

  Homework Completion: recjwd9KhNtPT8g41
  Submission Asset: rec4kJ7tOhsqmQ1hR
  (Gustafson, Emmet — last remaining writeback-only row from original audit)

  Resolves:
  - SUBMISSION_ASSET_UPLOAD_COMPLETE_BUT_TARGET_NOT_UPDATED
  - UPLOAD_STATUS_MISMATCH

  Action:
  - Sync Homework upload writeback from linked asset (022 parity)
  - No link changes (single asset expected)

Safety:
  - DRY_RUN = true by default
  - Set CONFIRM_WRITE = true AND DRY_RUN = false to apply
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;

const TARGET_HOMEWORK_ID = "recjwd9KhNtPT8g41";
const TARGET_ASSET_ID = "rec4kJ7tOhsqmQ1hR";

const CONFIG = {
  tables: {
    assets: "Submission Assets",
    homework: "Homework Completions",
  },

  assets: {
    fullName: "Submission Assets Full Name",
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
    name: "Homework Completion Full Name",
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

  values: {
    uploadedStatus: "Uploaded",
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

async function main() {
  if (CONFIRM_WRITE && DRY_RUN) {
    throw new Error("CONFIRM_WRITE is true but DRY_RUN is still true. Set DRY_RUN = false to apply writes.");
  }

  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);

  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));

  const [homeworkRecord, assetRecord] = await Promise.all([
    homeworkTable.selectRecordAsync(TARGET_HOMEWORK_ID, { fields: homeworkFields }),
    assetsTable.selectRecordAsync(TARGET_ASSET_ID, { fields: assetFields }),
  ]);

  if (!homeworkRecord) throw new Error(`Homework Completion not found: ${TARGET_HOMEWORK_ID}`);
  if (!assetRecord) throw new Error(`Submission Asset not found: ${TARGET_ASSET_ID}`);

  const linkedAssetIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submissionAssets);
  const assetHomeworkIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.homeworkCompletions);

  if (!linkedAssetIds.includes(TARGET_ASSET_ID)) {
    throw new Error(
      `Asset ${TARGET_ASSET_ID} is not linked on homework ${TARGET_HOMEWORK_ID}. Linked: ${linkedAssetIds.join(", ") || "(none)"}`
    );
  }

  const updateFields = buildHomeworkWritebackFields(
    homeworkTable,
    homeworkRecord,
    assetRecord,
    assetsTable
  );

  const plan = {
    script: "repair-audit-007-gustafson-single-asset-writeback",
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    homework: {
      recordId: TARGET_HOMEWORK_ID,
      name: getText(homeworkRecord, homeworkTable, CONFIG.homework.name) || homeworkRecord.name,
      linkedAssetIds,
      assetHomeworkLinks: assetHomeworkIds,
      updateFields,
    },
    asset: {
      recordId: TARGET_ASSET_ID,
      name: getText(assetRecord, assetsTable, CONFIG.assets.fullName) || assetRecord.name,
      uploadStatus: getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus),
      googleDriveFileUrl: getText(assetRecord, assetsTable, CONFIG.assets.googleDriveFileUrl),
    },
    issuesAddressed: [
      "SUBMISSION_ASSET_UPLOAD_COMPLETE_BUT_TARGET_NOT_UPDATED",
      "UPLOAD_STATUS_MISMATCH",
    ],
  };

  console.log("===== Repair Audit 007 — Gustafson Single-Asset Writeback =====");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE WRITE"}`);
  console.log(JSON.stringify(plan, null, 2));

  if (Object.keys(updateFields).length === 0) {
    console.log("\nNo writeback changes needed — homework already matches asset.");
    return;
  }

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("\nTo apply: set DRY_RUN = false and CONFIRM_WRITE = true, then re-run.");
    return;
  }

  await homeworkTable.updateRecordAsync(TARGET_HOMEWORK_ID, updateFields);

  console.log(
    JSON.stringify({
      status: "success",
      homeworkId: TARGET_HOMEWORK_ID,
      assetId: TARGET_ASSET_ID,
      homeworkFieldsUpdated: Object.keys(updateFields),
    })
  );
}

await main();

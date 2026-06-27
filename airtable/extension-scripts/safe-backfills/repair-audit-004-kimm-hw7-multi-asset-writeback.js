/*
Extension Script: Repair Audit 004 — Kimm HW7 Multi-Asset + Writeback
System: 127 SI Shooting Challenge
Purpose:
  Fix #4 in the audit repair sequence (v1.2 linkage audit).

  Homework Completion: recPzxYW8oCTezrCB
  (Kimm, Koen — Week 7 — Coach Yourself / HW1)
  Linked assets: recRXB7F2oIL2o1sU, rec0pcb7tqVqvDCYl

  Resolves:
  - HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS
  - SUBMISSION_ASSET_UPLOAD_COMPLETE_BUT_TARGET_NOT_UPDATED
  - UPLOAD_STATUS_MISMATCH
  - (may also clear TARGET_AND_ASSET_DRIVE_FILE_MISMATCH for this homework)

  Actions:
  1. Pick canonical Submission Asset (default: latest Uploaded with empty Upload Error)
  2. Homework → keep only canonical asset link
  3. Stale assets → remove this homework from Homework Completions link
  4. Sync Homework upload writeback from canonical asset (022 parity)

Safety:
  - DRY_RUN = true by default (report only)
  - Set CONFIRM_WRITE = true AND DRY_RUN = false to apply
  - Does not delete records; only updates links and homework upload fields
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;

const TARGET_HOMEWORK_ID = "recPzxYW8oCTezrCB";
const CANONICAL_ASSET_ID = ""; // leave blank to auto-pick latest clean Uploaded asset

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

function uploadedAtMs(record, table, fieldName) {
  const value = getCell(record, table, fieldName);
  if (!value) return 0;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function pickCanonicalAsset(linkedAssetRecords, assetsTable) {
  const uploadedClean = linkedAssetRecords.filter(asset => {
    const status = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
    const error = getText(asset, assetsTable, CONFIG.assets.uploadError);
    return status === CONFIG.values.uploadedStatus && !error;
  });

  const pool = uploadedClean.length ? uploadedClean : linkedAssetRecords;

  return [...pool].sort(
    (left, right) =>
      uploadedAtMs(right, assetsTable, CONFIG.assets.uploadedAt) -
      uploadedAtMs(left, assetsTable, CONFIG.assets.uploadedAt)
  )[0];
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

  if (!TARGET_HOMEWORK_ID || !TARGET_HOMEWORK_ID.startsWith("rec")) {
    throw new Error("TARGET_HOMEWORK_ID must be a valid Airtable record id.");
  }

  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);

  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));

  const homeworkRecord = await homeworkTable.selectRecordAsync(TARGET_HOMEWORK_ID, {
    fields: homeworkFields,
  });
  if (!homeworkRecord) {
    throw new Error(`Homework Completion not found: ${TARGET_HOMEWORK_ID}`);
  }

  const linkedAssetIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submissionAssets);
  const linkedAssetRecords = [];

  for (const assetId of linkedAssetIds) {
    const assetRecord = await assetsTable.selectRecordAsync(assetId, { fields: assetFields });
    if (assetRecord) linkedAssetRecords.push(assetRecord);
  }

  if (linkedAssetRecords.length < 2) {
    console.log(
      JSON.stringify({
        status: "skipped",
        reason: "Homework does not have multiple linked Submission Assets",
        homeworkId: TARGET_HOMEWORK_ID,
        linkedAssetIds,
      })
    );
    return;
  }

  let canonicalAsset = null;
  if (CANONICAL_ASSET_ID) {
    canonicalAsset = linkedAssetRecords.find(record => record.id === CANONICAL_ASSET_ID) || null;
    if (!canonicalAsset) {
      throw new Error(`CANONICAL_ASSET_ID ${CANONICAL_ASSET_ID} is not linked to this homework.`);
    }
  } else {
    canonicalAsset = pickCanonicalAsset(linkedAssetRecords, assetsTable);
  }

  if (!canonicalAsset) {
    throw new Error("Could not determine canonical Submission Asset.");
  }

  const staleAssets = linkedAssetRecords.filter(record => record.id !== canonicalAsset.id);

  const homeworkLinkFields = {};
  if (isWritableField(homeworkTable, CONFIG.homework.submissionAssets)) {
    homeworkLinkFields[CONFIG.homework.submissionAssets] = [{ id: canonicalAsset.id }];
  }

  const homeworkWritebackFields = buildHomeworkWritebackFields(
    homeworkTable,
    homeworkRecord,
    canonicalAsset,
    assetsTable
  );

  const homeworkUpdateFields = { ...homeworkLinkFields, ...homeworkWritebackFields };

  const assetUpdates = [];
  for (const staleAsset of staleAssets) {
    const currentHomeworkLinks = getLinkedIds(
      staleAsset,
      assetsTable,
      CONFIG.assets.homeworkCompletions
    );
    const nextHomeworkLinks = currentHomeworkLinks.filter(id => id !== TARGET_HOMEWORK_ID);

    if (
      nextHomeworkLinks.length !== currentHomeworkLinks.length &&
      isWritableField(assetsTable, CONFIG.assets.homeworkCompletions)
    ) {
      assetUpdates.push({
        table: CONFIG.tables.assets,
        recordId: staleAsset.id,
        name: getText(staleAsset, assetsTable, CONFIG.assets.fullName) || staleAsset.name,
        fields: {
          [CONFIG.assets.homeworkCompletions]: nextHomeworkLinks.map(id => ({ id })),
        },
        action: "unlink_stale_homework_from_asset",
      });
    }
  }

  const plan = {
    script: "repair-audit-004-kimm-hw7-multi-asset-writeback",
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    homework: {
      recordId: TARGET_HOMEWORK_ID,
      name: getText(homeworkRecord, homeworkTable, CONFIG.homework.name) || homeworkRecord.name,
      currentLinkedAssetIds: linkedAssetIds,
      canonicalAssetId: canonicalAsset.id,
      canonicalAssetName:
        getText(canonicalAsset, assetsTable, CONFIG.assets.fullName) || canonicalAsset.name,
      staleAssetIds: staleAssets.map(record => record.id),
      updateFields: homeworkUpdateFields,
    },
    assetUpdates,
    issuesAddressed: [
      "HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS",
      "SUBMISSION_ASSET_UPLOAD_COMPLETE_BUT_TARGET_NOT_UPDATED",
      "UPLOAD_STATUS_MISMATCH",
    ],
  };

  console.log("===== Repair Audit 004 — Kimm HW7 Multi-Asset + Writeback =====");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE WRITE"}`);
  console.log(JSON.stringify(plan, null, 2));

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("\nTo apply: set DRY_RUN = false and CONFIRM_WRITE = true, then re-run.");
    return;
  }

  if (Object.keys(homeworkUpdateFields).length > 0) {
    await homeworkTable.updateRecordAsync(TARGET_HOMEWORK_ID, homeworkUpdateFields);
  }

  for (const assetUpdate of assetUpdates) {
    await assetsTable.updateRecordAsync(assetUpdate.recordId, assetUpdate.fields);
  }

  console.log(
    JSON.stringify({
      status: "success",
      homeworkId: TARGET_HOMEWORK_ID,
      canonicalAssetId: canonicalAsset.id,
      homeworkFieldsUpdated: Object.keys(homeworkUpdateFields),
      assetsUnlinked: assetUpdates.map(row => row.recordId),
    })
  );
}

await main();

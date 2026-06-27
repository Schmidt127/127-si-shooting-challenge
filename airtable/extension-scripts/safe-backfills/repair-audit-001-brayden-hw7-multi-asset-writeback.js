/*
Extension Script: Repair Audit 001 — Brayden HW7 Multi-Asset + Writeback
System: 127 SI Shooting Challenge
Purpose:
  Fix #1 in the audit repair sequence (v1.2 linkage audit).

  Homework Completion: recxelFDevJ0HWgw0
  (Elders, Brayden — Week 7 — Coach Yourself / HW1)

  Resolves:
  - HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS
  - SUBMISSION_ASSET_UPLOAD_COMPLETE_BUT_TARGET_NOT_UPDATED
  - UPLOAD_STATUS_MISMATCH
  - (stale asset reciVBMYUcyVr1hAQ unlinked; ASSET_HAS_UPLOAD_ERROR handled in fix #2)

  Actions:
  1. Pick canonical Submission Asset (prefer homework Drive match, else latest Uploaded)
  2. Stale assets first → unlink homework + uncheck Send to Make Trigger
  3. Homework → keep only canonical asset link + sync writeback (022 parity)
  4. Submission → remove stale asset ids (prevents 020 re-link drift)

Safety:
  - DRY_RUN = true by default (report only)
  - Set CONFIRM_WRITE = true AND DRY_RUN = false to apply
  - Does not delete records; only updates links and homework upload fields
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;

const TARGET_HOMEWORK_ID = "recxelFDevJ0HWgw0";
const CANONICAL_ASSET_ID = ""; // leave blank to auto-pick; or set recJ3jN7JZTw0eG2B

const CONFIG = {
  tables: {
    assets: "Submission Assets",
    homework: "Homework Completions",
    submissions: "Submissions",
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
    sendToMakeTrigger: "Send to Make Trigger",
  },

  homework: {
    name: "Homework Completion Full Name",
    submission: "Submissions - Linked",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    submissionAssets: "Submission Assets",
    writebackComplete: "Writeback Complete?",
    parentFeedbackSent: "Parent Feedback Sent?",
  },

  submissions: {
    name: "Submission Full Name",
    submissionAssets: "Submission Assets",
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

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function getCheckbox(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  return record.getCellValue(fieldName) === true;
}

function linkedCell(ids) {
  return [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
}

function extractDriveFileId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/\/d\/([^/?#]+)/) || text.match(/[?&]id=([^&]+)/);
  return match ? match[1] : text;
}

function driveIdsMatch(leftId, leftUrl, rightId, rightUrl) {
  const left = extractDriveFileId(leftId) || extractDriveFileId(leftUrl);
  const right = extractDriveFileId(rightId) || extractDriveFileId(rightUrl);
  if (!left || !right) return false;
  return left === right;
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

function pickCanonicalAsset(linkedAssetRecords, assetsTable, homeworkRecord, homeworkTable) {
  const uploadedClean = linkedAssetRecords.filter(asset => {
    const status = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
    const error = getText(asset, assetsTable, CONFIG.assets.uploadError);
    return status === CONFIG.values.uploadedStatus && !error;
  });

  const pool = uploadedClean.length ? uploadedClean : linkedAssetRecords;

  // Duplicate re-upload: keep latest successful upload (see repair-audit-linkage-full.js).
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
  const submissionsTable = base.getTable(CONFIG.tables.submissions);

  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const submissionFields = Object.values(CONFIG.submissions).filter(name =>
    fieldExists(submissionsTable, name)
  );

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
    canonicalAsset = pickCanonicalAsset(linkedAssetRecords, assetsTable, homeworkRecord, homeworkTable);
  }

  if (!canonicalAsset) {
    throw new Error("Could not determine canonical Submission Asset.");
  }

  const staleAssets = linkedAssetRecords.filter(record => record.id !== canonicalAsset.id);
  const submissionId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.submission);

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

    const staleFields = {};

    if (
      nextHomeworkLinks.length !== currentHomeworkLinks.length &&
      isWritableField(assetsTable, CONFIG.assets.homeworkCompletions)
    ) {
      staleFields[CONFIG.assets.homeworkCompletions] = linkedCell(nextHomeworkLinks);
    }

    if (
      getCheckbox(staleAsset, assetsTable, CONFIG.assets.sendToMakeTrigger) &&
      isWritableField(assetsTable, CONFIG.assets.sendToMakeTrigger)
    ) {
      staleFields[CONFIG.assets.sendToMakeTrigger] = false;
    }

    if (Object.keys(staleFields).length > 0) {
      assetUpdates.push({
        table: CONFIG.tables.assets,
        recordId: staleAsset.id,
        name: getText(staleAsset, assetsTable, CONFIG.assets.fullName) || staleAsset.name,
        fields: staleFields,
        action: "unlink_stale_homework_and_clear_send_trigger",
      });
    }
  }

  const submissionUpdates = [];
  if (submissionId && staleAssets.length > 0) {
    const submissionRecord = await submissionsTable.selectRecordAsync(submissionId, {
      fields: submissionFields,
    });

    if (submissionRecord && isWritableField(submissionsTable, CONFIG.submissions.submissionAssets)) {
      const currentSubmissionAssets = getLinkedIds(
        submissionRecord,
        submissionsTable,
        CONFIG.submissions.submissionAssets
      );
      const staleIds = new Set(staleAssets.map(record => record.id));
      const nextSubmissionAssets = currentSubmissionAssets.filter(id => !staleIds.has(id));

      if (nextSubmissionAssets.length !== currentSubmissionAssets.length) {
        submissionUpdates.push({
          table: CONFIG.tables.submissions,
          recordId: submissionId,
          name: getText(submissionRecord, submissionsTable, CONFIG.submissions.name) || submissionRecord.name,
          fields: {
            [CONFIG.submissions.submissionAssets]: linkedCell(nextSubmissionAssets),
          },
          action: "remove_stale_assets_from_submission",
          removedAssetIds: currentSubmissionAssets.filter(id => staleIds.has(id)),
        });
      }
    }
  }

  const plan = {
    script: "repair-audit-001-brayden-hw7-multi-asset-writeback",
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
    submissionUpdates,
    issuesAddressed: [
      "HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS",
      "TARGET_AND_ASSET_DRIVE_FILE_MISMATCH",
      "SEND_TRIGGER_STILL_CHECKED_AFTER_UPLOAD",
      "SUBMISSION_ASSET_UPLOAD_COMPLETE_BUT_TARGET_NOT_UPDATED",
      "UPLOAD_STATUS_MISMATCH",
    ],
  };

  console.log("===== Repair Audit 001 — Brayden HW7 Multi-Asset + Writeback =====");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE WRITE"}`);
  console.log(JSON.stringify(plan, null, 2));

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("\nTo apply: set DRY_RUN = false and CONFIRM_WRITE = true, then re-run.");
    return;
  }

  for (const assetUpdate of assetUpdates) {
    await assetsTable.updateRecordAsync(assetUpdate.recordId, assetUpdate.fields);
  }

  if (Object.keys(homeworkUpdateFields).length > 0) {
    await homeworkTable.updateRecordAsync(TARGET_HOMEWORK_ID, homeworkUpdateFields);
  }

  for (const submissionUpdate of submissionUpdates) {
    await submissionsTable.updateRecordAsync(submissionUpdate.recordId, submissionUpdate.fields);
  }

  console.log(
    JSON.stringify({
      status: "success",
      homeworkId: TARGET_HOMEWORK_ID,
      canonicalAssetId: canonicalAsset.id,
      homeworkFieldsUpdated: Object.keys(homeworkUpdateFields),
      assetsUnlinked: assetUpdates.map(row => row.recordId),
      submissionsUpdated: submissionUpdates.map(row => row.recordId),
    })
  );
}

await main();

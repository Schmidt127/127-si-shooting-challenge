/*
Extension Script: Repair Audit 002 — Brayden Stale Asset Upload Error
System: 127 SI Shooting Challenge
Purpose:
  Fix #2 in the audit repair sequence (v1.2 linkage audit).

  Submission Asset: reciVBMYUcyVr1hAQ
  (Elders, Brayden — HW1 re-upload attempt; orphaned after Fix #001)

  Resolves:
  - ASSET_HAS_UPLOAD_ERROR_BUT_STATUS_UPLOADED

  Actions:
  - Remove stale Homework Completion link from asset (if Fix #001 left a backlink)
  - Clear Upload Error when Upload Status is Uploaded and Drive file exists
  - Does not change Upload Status or Drive fields

Safety:
  - DRY_RUN = true by default
  - Set CONFIRM_WRITE = true AND DRY_RUN = false to apply
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;

const TARGET_ASSET_ID = "reciVBMYUcyVr1hAQ";
const STALE_HOMEWORK_ID = "recxelFDevJ0HWgw0";

const CONFIG = {
  tables: {
    assets: "Submission Assets",
  },

  assets: {
    fullName: "Submission Assets Full Name",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    homeworkCompletions: "Homework Completions",
  },

  values: {
    uploadedStatus: "Uploaded",
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

async function main() {
  if (CONFIRM_WRITE && DRY_RUN) {
    throw new Error("CONFIRM_WRITE is true but DRY_RUN is still true. Set DRY_RUN = false to apply writes.");
  }

  if (!TARGET_ASSET_ID || !TARGET_ASSET_ID.startsWith("rec")) {
    throw new Error("TARGET_ASSET_ID must be a valid Airtable record id.");
  }

  const assetsTable = base.getTable(CONFIG.tables.assets);
  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));

  const assetRecord = await assetsTable.selectRecordAsync(TARGET_ASSET_ID, { fields: assetFields });
  if (!assetRecord) {
    throw new Error(`Submission Asset not found: ${TARGET_ASSET_ID}`);
  }

  const uploadStatus = getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus);
  const uploadError = getText(assetRecord, assetsTable, CONFIG.assets.uploadError);
  const driveUrl = getText(assetRecord, assetsTable, CONFIG.assets.googleDriveFileUrl);
  const driveId = getText(assetRecord, assetsTable, CONFIG.assets.googleDriveFileId);
  const homeworkLinks = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.homeworkCompletions);

  if (uploadStatus !== CONFIG.values.uploadedStatus) {
    console.log(
      JSON.stringify({
        status: "skipped",
        reason: "Upload Status is not Uploaded",
        assetId: TARGET_ASSET_ID,
        uploadStatus,
      })
    );
    return;
  }

  if (!uploadError) {
    console.log(
      JSON.stringify({
        status: "skipped",
        reason: "Upload Error is already empty",
        assetId: TARGET_ASSET_ID,
      })
    );
    return;
  }

  if (!driveUrl && !driveId) {
    throw new Error(
      "Upload Error is set but no Drive file is present. Manual review required before clearing error."
    );
  }

  const updateFields = {};
  const unlinkActions = [];

  if (homeworkLinks.length > 0) {
    if (!isWritableField(assetsTable, CONFIG.assets.homeworkCompletions)) {
      throw new Error("Homework Completions field is missing or not writable on Submission Assets.");
    }

    const nextHomeworkLinks = homeworkLinks.filter(id => id !== STALE_HOMEWORK_ID);
    updateFields[CONFIG.assets.homeworkCompletions] = nextHomeworkLinks.map(id => ({ id }));
    unlinkActions.push({
      action: "unlink_stale_homework_from_asset",
      homeworkIdsRemoved: homeworkLinks.filter(id => id === STALE_HOMEWORK_ID),
      homeworkIdsRemaining: nextHomeworkLinks,
    });
  }

  if (isWritableField(assetsTable, CONFIG.assets.uploadError)) {
    updateFields[CONFIG.assets.uploadError] = "";
  } else {
    throw new Error("Upload Error field is missing or not writable.");
  }

  const plan = {
    script: "repair-audit-002-brayden-stale-asset-upload-error",
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    asset: {
      recordId: TARGET_ASSET_ID,
      name: getText(assetRecord, assetsTable, CONFIG.assets.fullName) || assetRecord.name,
      uploadStatus,
      uploadErrorBefore: uploadError,
      googleDriveFileUrl: driveUrl,
      googleDriveFileId: driveId,
      homeworkCompletionLinksBefore: homeworkLinks,
      unlinkActions,
      updateFields,
    },
    issuesAddressed: ["ASSET_HAS_UPLOAD_ERROR_BUT_STATUS_UPLOADED"],
    note:
      "Orphan re-upload asset after Fix #001. Clears stale asset-side homework backlink if present, then clears Upload Error.",
  };

  console.log("===== Repair Audit 002 — Brayden Stale Asset Upload Error =====");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE WRITE"}`);
  console.log(JSON.stringify(plan, null, 2));

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("\nTo apply: set DRY_RUN = false and CONFIRM_WRITE = true, then re-run.");
    return;
  }

  await assetsTable.updateRecordAsync(TARGET_ASSET_ID, updateFields);

  console.log(
    JSON.stringify({
      status: "success",
      assetId: TARGET_ASSET_ID,
      fieldsUpdated: Object.keys(updateFields),
    })
  );
}

await main();

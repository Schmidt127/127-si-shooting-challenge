/*
Extension Script: Backfill Homework Completion Upload Edge Cases
System: 127 SI Shooting Challenge
Purpose:
  Fixes Homework Completions skipped by backfill-homework-completion-upload-status.js:
  - multiple linked Submission Assets (sync from slot-matched or only-uploaded asset)
  - zero linked Submission Assets (link canonical asset from reverse lookup or submission+slot)

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true to apply updates
  - BATCH_LIMIT caps writes per run (default 50)
  - Skips manual_review_* actions from audit logic
  - REPAIR_LINKS=false by default; set true to replace multi-asset links with one canonical asset

Setup:
  1. Run audit-homework-completion-upload-edge-cases.js and review actionCounts
  2. Run this script with DRY_RUN = true
  3. Set CONFIRM_WRITE = true and re-run until remainingCount is 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 50;
const REPAIR_LINKS = false;

const CONFIG = {
  tables: {
    assets: "Submission Assets",
    homework: "Homework Completions",
  },

  assets: {
    submission: "Submission - Linked",
    uploadDestination: "Upload Destination",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    assetSlot: "Asset Slot",
    assetPurpose: "Asset Purpose",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    homeworkCompletions: "Homework Completions",
  },

  homework: {
    submission: "Submissions - Linked",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    submissionAssets: "Submission Assets",
    assetSlot: "Asset Slot",
    itemSlot: "Item Slot",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    writebackComplete: "Writeback Complete?",
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

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
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

function getHomeworkSlot(homeworkRecord, homeworkTable) {
  return (
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.assetSlot) ||
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.itemSlot)
  );
}

function pickAssetsBySlot(assetRecords, assetsTable, slot) {
  if (!slot) return [];
  return assetRecords.filter(
    asset => getSelectName(asset, assetsTable, CONFIG.assets.assetSlot) === slot
  );
}

function pickUploadedAssets(assetRecords, assetsTable) {
  return assetRecords.filter(asset => {
    const status = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
    return CONFIG.values.syncableAssetStatuses.includes(status);
  });
}

function purposeForSlot(slot) {
  if (slot === "HW1") return "Homework 1";
  if (slot === "HW2") return "Homework 2";
  return "";
}

function isExclusiveHomeworkLink(assetRecord, assetsTable, homeworkId) {
  const homeworkIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.homeworkCompletions);
  return homeworkIds.length === 1 && homeworkIds[0] === homeworkId;
}

function pickAssetsBySlotOrPurpose(assetRecords, assetsTable, slot) {
  if (!slot) return [];

  const slotMatches = pickAssetsBySlot(assetRecords, assetsTable, slot);
  if (slotMatches.length > 0) return slotMatches;

  const purpose = purposeForSlot(slot);
  if (!purpose) return [];

  return assetRecords.filter(
    asset => getSelectName(asset, assetsTable, CONFIG.assets.assetPurpose) === purpose
  );
}

function pickBestCanonicalAsset(assetRecords, assetsTable, homeworkId) {
  if (!assetRecords.length) return null;
  if (assetRecords.length === 1) return assetRecords[0];

  const exclusive = assetRecords.filter(asset =>
    isExclusiveHomeworkLink(asset, assetsTable, homeworkId)
  );
  const exclusivePool = exclusive.length > 0 ? exclusive : assetRecords;

  const uploaded = pickUploadedAssets(exclusivePool, assetsTable);
  const pool = uploaded.length > 0 ? uploaded : exclusivePool;

  if (pool.length === 1) return pool[0];

  return [...pool].sort((left, right) => left.id.localeCompare(right.id))[0];
}

function findAssetsBySubmissionAndSlot(allAssets, assetsTable, submissionId, slot) {
  if (!submissionId || !slot) return [];

  return allAssets.filter(asset => {
    const assetSubmissionId = getFirstLinkedId(asset, assetsTable, CONFIG.assets.submission);
    const destination = getText(asset, assetsTable, CONFIG.assets.uploadDestination);

    if (assetSubmissionId !== submissionId || destination !== CONFIG.values.uploadDestinationHomework) {
      return false;
    }

    const assetSlot = getSelectName(asset, assetsTable, CONFIG.assets.assetSlot);
    if (assetSlot === slot) return true;

    const purpose = purposeForSlot(slot);
    return purpose && getSelectName(asset, assetsTable, CONFIG.assets.assetPurpose) === purpose;
  });
}

function resolveCanonicalAsset({
  linkedAssetIds,
  homeworkRecord,
  homeworkTable,
  assetById,
  reverseLinkedAssets,
  submissionLookupAssets,
  assetsTable,
}) {
  const homeworkId = homeworkRecord.id;
  const homeworkSlot = getHomeworkSlot(homeworkRecord, homeworkTable);
  const linkedAssets = linkedAssetIds.map(id => assetById.get(id)).filter(Boolean);
  const edgeCase = linkedAssetIds.length === 0 ? "no_asset" : "multiple_assets";

  if (edgeCase === "no_asset") {
    if (reverseLinkedAssets.length === 1) {
      return { action: "link_reverse_asset_and_sync", asset: reverseLinkedAssets[0] };
    }

    if (reverseLinkedAssets.length > 1) {
      const slotMatches = pickAssetsBySlotOrPurpose(reverseLinkedAssets, assetsTable, homeworkSlot);
      const best = pickBestCanonicalAsset(slotMatches.length ? slotMatches : reverseLinkedAssets, assetsTable, homeworkId);
      if (best) {
        return {
          action: slotMatches.length ? "link_slot_match_and_sync" : "link_reverse_asset_tiebreak_and_sync",
          asset: best,
        };
      }

      return { action: "manual_review_no_homework_link", asset: null };
    }

    if (submissionLookupAssets.length >= 1) {
      const best = pickBestCanonicalAsset(submissionLookupAssets, assetsTable, homeworkId);
      if (best) {
        return {
          action: submissionLookupAssets.length === 1
            ? "link_submission_slot_asset_and_sync"
            : "link_submission_slot_tiebreak_and_sync",
          asset: best,
        };
      }
    }

    return { action: "manual_review_no_asset_found", asset: null };
  }

  const slotMatches = pickAssetsBySlotOrPurpose(linkedAssets, assetsTable, homeworkSlot);
  if (slotMatches.length === 1) {
    return { action: "sync_from_slot_match", asset: slotMatches[0] };
  }

  if (slotMatches.length > 1) {
    return {
      action: "sync_from_slot_match_tiebreak",
      asset: pickBestCanonicalAsset(slotMatches, assetsTable, homeworkId),
    };
  }

  const uploaded = pickUploadedAssets(linkedAssets, assetsTable);
  if (uploaded.length === 1) {
    return { action: "sync_from_only_uploaded_asset", asset: uploaded[0] };
  }

  if (uploaded.length > 1) {
    return {
      action: "sync_from_uploaded_tiebreak",
      asset: pickBestCanonicalAsset(uploaded, assetsTable, homeworkId),
    };
  }

  return { action: "manual_review_ambiguous_assets", asset: null };
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

  if (!CONFIG.values.syncableAssetStatuses.includes(assetUploadStatus)) {
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

function buildLinkFields(homeworkRecord, homeworkTable, canonicalAssetId, linkedAssetIds, repairLinks) {
  if (!isWritableField(homeworkTable, CONFIG.homework.submissionAssets)) {
    return {};
  }

  if (linkedAssetIds.length === 0) {
    return {
      [CONFIG.homework.submissionAssets]: [{ id: canonicalAssetId }],
    };
  }

  if (repairLinks && linkedAssetIds.length > 1) {
    return {
      [CONFIG.homework.submissionAssets]: [{ id: canonicalAssetId }],
    };
  }

  return {};
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
  const reverseAssetIndex = new Map();

  for (const assetRecord of assetQuery.records) {
    const homeworkIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.homeworkCompletions);
    for (const homeworkId of homeworkIds) {
      if (!reverseAssetIndex.has(homeworkId)) {
        reverseAssetIndex.set(homeworkId, []);
      }
      reverseAssetIndex.get(homeworkId).push(assetRecord);
    }
  }

  const candidates = [];
  const skippedManualReview = [];
  const skippedAlreadySynced = [];
  let skippedNotEdgeCaseCount = 0;

  for (const homeworkRecord of homeworkQuery.records) {
    const linkedAssetIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submissionAssets);

    if (linkedAssetIds.length === 1) {
      skippedNotEdgeCaseCount += 1;
      continue;
    }

    const homeworkSlot = getHomeworkSlot(homeworkRecord, homeworkTable);
    const submissionId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.submission);
    const reverseLinkedAssets = reverseAssetIndex.get(homeworkRecord.id) || [];
    const submissionLookupAssets = findAssetsBySubmissionAndSlot(
      assetQuery.records,
      assetsTable,
      submissionId,
      homeworkSlot
    );

    const resolution = resolveCanonicalAsset({
      linkedAssetIds,
      homeworkRecord,
      homeworkTable,
      assetById,
      reverseLinkedAssets,
      submissionLookupAssets,
      assetsTable,
    });

    if (!resolution.asset || resolution.action.startsWith("manual_review")) {
      skippedManualReview.push({
        homeworkId: homeworkRecord.id,
        edgeCase: linkedAssetIds.length === 0 ? "no_asset" : "multiple_assets",
        action: resolution.action,
        linkedAssetIds,
        homeworkSlot,
      });
      continue;
    }

    const syncFields = buildSyncFields(
      homeworkTable,
      homeworkRecord,
      resolution.asset,
      assetsTable
    );

    const linkFields = buildLinkFields(
      homeworkRecord,
      homeworkTable,
      resolution.asset.id,
      linkedAssetIds,
      REPAIR_LINKS
    );

    const updateFields = {
      ...(syncFields || {}),
      ...linkFields,
    };

    if (Object.keys(updateFields).length === 0) {
      skippedAlreadySynced.push({
        homeworkId: homeworkRecord.id,
        action: resolution.action,
        canonicalAssetId: resolution.asset.id,
      });
      continue;
    }

    candidates.push({
      homeworkId: homeworkRecord.id,
      edgeCase: linkedAssetIds.length === 0 ? "no_asset" : "multiple_assets",
      action: resolution.action,
      canonicalAssetId: resolution.asset.id,
      homeworkSlot,
      homeworkStatus: getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus),
      assetStatus: getSelectName(resolution.asset, assetsTable, CONFIG.assets.uploadStatus),
      fieldCount: Object.keys(updateFields).length,
      fields: updateFields,
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
    script: "backfill-homework-completion-upload-edge-cases",
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    repairLinks: REPAIR_LINKS,
    batchLimit: BATCH_LIMIT,
    candidateCount: candidates.length,
    batchCount: batch.length,
    updatedCount: DRY_RUN ? 0 : updatedCount,
    remainingCount: Math.max(candidates.length - batch.length, 0),
    skippedNotEdgeCaseCount,
    skippedManualReviewCount: skippedManualReview.length,
    skippedAlreadySyncedCount: skippedAlreadySynced.length,
    actionCounts: candidates.reduce((counts, row) => {
      counts[row.action] = (counts[row.action] || 0) + 1;
      return counts;
    }, {}),
    manualReviewSample: skippedManualReview.slice(0, 10),
    sample: batch.slice(0, 10).map(row => ({
      homeworkId: row.homeworkId,
      edgeCase: row.edgeCase,
      action: row.action,
      canonicalAssetId: row.canonicalAssetId,
      homeworkSlot: row.homeworkSlot,
      fromStatus: row.homeworkStatus,
      toStatus: row.fields[CONFIG.homework.uploadStatus]?.name || row.assetStatus,
      fieldCount: row.fieldCount,
    })),
  };

  console.log(JSON.stringify(summary, null, 2));
}

await main();

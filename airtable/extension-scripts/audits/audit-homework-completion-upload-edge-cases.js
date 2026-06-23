/*
Extension Script: Audit Homework Completion Upload Edge Cases
System: 127 SI Shooting Challenge
Purpose:
  Read-only report of Homework Completions skipped by backfill-homework-completion-upload-status.js:
  - zero linked Submission Assets (true edge case)
  - multiple linked Submission Assets (often EXPECTED — athletes may upload several files
    for one HW1/HW2 assignment; all files link to one Homework Completion)

Default: read-only (no writes)
*/

// @ts-nocheck

const CONFIG = {
  tables: {
    assets: "Submission Assets",
    homework: "Homework Completions",
  },

  assets: {
    submission: "Submission - Linked",
    uploadDestination: "Upload Destination",
    uploadStatus: "Upload Status",
    assetSlot: "Asset Slot",
    assetPurpose: "Asset Purpose",
    googleDriveFileUrl: "Google Drive File URL",
    homeworkCompletions: "Homework Completions",
  },

  homework: {
    submission: "Submissions - Linked",
    homework: "Homework",
    uploadStatus: "Upload Status",
    submissionAssets: "Submission Assets",
    assetSlot: "Asset Slot",
    itemSlot: "Item Slot",
    writebackComplete: "Writeback Complete?",
    googleDriveFileUrl: "Google Drive File URL",
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

function getHomeworkSlot(homeworkRecord, homeworkTable) {
  return (
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.assetSlot) ||
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.itemSlot)
  );
}

function describeAsset(assetRecord, assetsTable) {
  return {
    id: assetRecord.id,
    slot: getSelectName(assetRecord, assetsTable, CONFIG.assets.assetSlot),
    purpose: getSelectName(assetRecord, assetsTable, CONFIG.assets.assetPurpose),
    uploadStatus: getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus),
    hasDriveUrl: Boolean(getText(assetRecord, assetsTable, CONFIG.assets.googleDriveFileUrl)),
  };
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

function deriveAggregateUploadStatus(assetRecords, assetsTable) {
  if (!assetRecords.length) return "";

  const statuses = assetRecords.map(asset =>
    getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus)
  );

  if (statuses.every(status => status === "Uploaded")) return "Uploaded";
  if (statuses.some(status => status === "Error")) return "Error";
  if (statuses.some(status => status === "Processing")) return "Processing";
  if (statuses.some(status => status === "Uploaded")) return "Processing";
  return "Pending";
}

function resolveRecommendedAction({
  edgeCase,
  homeworkId,
  homeworkSlot,
  linkedAssets,
  reverseLinkedAssets,
  submissionLookupAssets,
  assetsTable,
}) {
  if (edgeCase === "no_asset") {
    if (reverseLinkedAssets.length === 1) {
      return {
        action: "link_reverse_asset_and_sync",
        canonicalAssetId: reverseLinkedAssets[0].id,
        reason: "Asset links to homework but homework link is missing",
      };
    }

    if (reverseLinkedAssets.length > 1) {
      const slotMatches = pickAssetsBySlotOrPurpose(reverseLinkedAssets, assetsTable, homeworkSlot);
      const best = pickBestCanonicalAsset(slotMatches.length ? slotMatches : reverseLinkedAssets, assetsTable, homeworkId);
      if (best) {
        return {
          action: slotMatches.length ? "link_slot_match_and_sync" : "link_reverse_asset_tiebreak_and_sync",
          canonicalAssetId: best.id,
          reason: slotMatches.length > 1
            ? `Tie-break among ${slotMatches.length} reverse-linked slot matches (exclusive link, then record id)`
            : `Tie-break among ${reverseLinkedAssets.length} reverse-linked assets`,
        };
      }

      return {
        action: "manual_review_no_homework_link",
        canonicalAssetId: "",
        reason: `Multiple reverse-linked assets (${reverseLinkedAssets.length}); could not resolve`,
      };
    }

    if (submissionLookupAssets.length >= 1) {
      const best = pickBestCanonicalAsset(submissionLookupAssets, assetsTable, homeworkId);
      if (best) {
        return {
          action: submissionLookupAssets.length === 1
            ? "link_submission_slot_asset_and_sync"
            : "link_submission_slot_tiebreak_and_sync",
          canonicalAssetId: best.id,
          reason: submissionLookupAssets.length === 1
            ? "Found one submission asset for homework slot"
            : `Tie-break among ${submissionLookupAssets.length} submission+slot assets`,
        };
      }
    }

    return {
      action: "manual_review_no_asset_found",
      canonicalAssetId: "",
      reason: "No asset found via homework link, reverse link, or submission+slot",
    };
  }

  const slotMatches = pickAssetsBySlotOrPurpose(linkedAssets, assetsTable, homeworkSlot);
  const aggregateStatus = deriveAggregateUploadStatus(linkedAssets, assetsTable);

  if (linkedAssets.length > 1) {
    if (!["Uploaded", "Processing", "Error"].includes(aggregateStatus)) {
      return {
        action: "expected_multi_file_pending_upload",
        canonicalAssetId: linkedAssets.map(asset => asset.id).join(","),
        reason: "Multiple files linked to one homework assignment; not all assets are uploaded yet",
      };
    }

    return {
      action: "sync_from_all_linked_assets",
      canonicalAssetId: linkedAssets.map(asset => asset.id).join(","),
      reason: `Multi-file homework: derive Upload Status from all ${linkedAssets.length} linked assets (${aggregateStatus})`,
    };
  }

  if (slotMatches.length === 1) {
    return {
      action: "sync_from_slot_match",
      canonicalAssetId: slotMatches[0].id,
      reason: "Exactly one linked asset matches homework slot",
    };
  }

  if (slotMatches.length > 1) {
    const best = pickBestCanonicalAsset(slotMatches, assetsTable, homeworkId);
    return {
      action: "sync_from_slot_match_tiebreak",
      canonicalAssetId: best.id,
      reason: `Tie-break among ${slotMatches.length} linked slot matches (exclusive link, uploaded, record id)`,
    };
  }

  const uploaded = pickUploadedAssets(linkedAssets, assetsTable);
  if (uploaded.length === 1) {
    return {
      action: "sync_from_only_uploaded_asset",
      canonicalAssetId: uploaded[0].id,
      reason: "Exactly one linked asset is Uploaded/Processing/Error",
    };
  }

  if (uploaded.length > 1) {
    const best = pickBestCanonicalAsset(uploaded, assetsTable, homeworkId);
    return {
      action: "sync_from_uploaded_tiebreak",
      canonicalAssetId: best.id,
      reason: `Tie-break among ${uploaded.length} uploaded linked assets`,
    };
  }

  return {
    action: "manual_review_ambiguous_assets",
    canonicalAssetId: "",
    reason: `Linked asset count ${linkedAssets.length} with no clear slot/upload winner`,
  };
}

async function main() {
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

  const noAssetRows = [];
  const multipleAssetRows = [];
  const actionCounts = {};

  for (const homeworkRecord of homeworkQuery.records) {
    const linkedAssetIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submissionAssets);
    const isEdgeCase = linkedAssetIds.length === 0 || linkedAssetIds.length > 1;
    if (!isEdgeCase) continue;

    const homeworkSlot = getHomeworkSlot(homeworkRecord, homeworkTable);
    const submissionId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.submission);
    const linkedAssets = linkedAssetIds.map(id => assetById.get(id)).filter(Boolean);
    const reverseLinkedAssets = reverseAssetIndex.get(homeworkRecord.id) || [];
    const submissionLookupAssets = findAssetsBySubmissionAndSlot(
      assetQuery.records,
      assetsTable,
      submissionId,
      homeworkSlot
    );

    const edgeCase = linkedAssetIds.length === 0 ? "no_asset" : "multiple_assets";
    const recommendation = resolveRecommendedAction({
      edgeCase,
      homeworkId: homeworkRecord.id,
      homeworkSlot,
      linkedAssets,
      reverseLinkedAssets,
      submissionLookupAssets,
      assetsTable,
    });

    actionCounts[recommendation.action] = (actionCounts[recommendation.action] || 0) + 1;

    const row = {
      homeworkId: homeworkRecord.id,
      edgeCase,
      homeworkSlot,
      submissionId,
      homeworkIdCurriculum: getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.homework),
      uploadStatus: getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus),
      writebackComplete: getCellCheckbox(homeworkRecord, homeworkTable, CONFIG.homework.writebackComplete),
      hasDriveUrl: Boolean(getText(homeworkRecord, homeworkTable, CONFIG.homework.googleDriveFileUrl)),
      linkedAssetIds,
      linkedAssets: linkedAssets.map(asset => describeAsset(asset, assetsTable)),
      reverseLinkedAssets: reverseLinkedAssets.map(asset => describeAsset(asset, assetsTable)),
      submissionLookupAssetIds: submissionLookupAssets.map(asset => asset.id),
      recommendedAction: recommendation.action,
      canonicalAssetId: recommendation.canonicalAssetId,
      reason: recommendation.reason,
    };

    if (edgeCase === "no_asset") {
      noAssetRows.push(row);
    } else {
      multipleAssetRows.push(row);
    }
  }

  const autoFixableCount = [...noAssetRows, ...multipleAssetRows].filter(row =>
    row.recommendedAction.startsWith("sync_") ||
    row.recommendedAction.startsWith("link_")
  ).length;

  const manualReviewCount = [...noAssetRows, ...multipleAssetRows].filter(row =>
    row.recommendedAction.startsWith("manual_review")
  ).length;

  const expectedMultiFileCount = multipleAssetRows.length;

  const report = {
    script: "audit-homework-completion-upload-edge-cases",
    dryRun: true,
    homeworkChecked: homeworkQuery.records.length,
    noAssetCount: noAssetRows.length,
    multipleAssetCount: multipleAssetRows.length,
    edgeCaseTotal: noAssetRows.length + multipleAssetRows.length,
    expectedMultiFileCount,
    note: "Multiple Submission Assets per Homework Completion is expected when athletes upload several files for one HW1/HW2 assignment. Do not remove extra asset links.",
    autoFixableCount,
    manualReviewCount,
    actionCounts,
    noAssetRows,
    multipleAssetRows,
  };

  console.log("===== HOMEWORK UPLOAD EDGE CASE AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

function getCellCheckbox(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName) === true;
}

await main();

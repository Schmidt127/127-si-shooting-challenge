/*
Extension Script: Audit Homework Completion Upload Edge Cases
System: 127 SI Shooting Challenge
Purpose:
  Read-only report of Homework Completions skipped by backfill-homework-completion-upload-status.js:
  - zero linked Submission Assets
  - multiple linked Submission Assets

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

function findAssetsBySubmissionAndSlot(allAssets, assetsTable, submissionId, slot) {
  if (!submissionId || !slot) return [];

  return allAssets.filter(asset => {
    const assetSubmissionId = getFirstLinkedId(asset, assetsTable, CONFIG.assets.submission);
    const assetSlot = getSelectName(asset, assetsTable, CONFIG.assets.assetSlot);
    const destination = getText(asset, assetsTable, CONFIG.assets.uploadDestination);

    return (
      assetSubmissionId === submissionId &&
      assetSlot === slot &&
      destination === CONFIG.values.uploadDestinationHomework
    );
  });
}

function resolveRecommendedAction({
  edgeCase,
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
      const slotMatches = pickAssetsBySlot(reverseLinkedAssets, assetsTable, homeworkSlot);
      if (slotMatches.length === 1) {
        return {
          action: "link_slot_match_and_sync",
          canonicalAssetId: slotMatches[0].id,
          reason: "One reverse-linked asset matches homework slot",
        };
      }

      const uploaded = pickUploadedAssets(reverseLinkedAssets, assetsTable);
      if (uploaded.length === 1) {
        return {
          action: "link_only_uploaded_reverse_asset_and_sync",
          canonicalAssetId: uploaded[0].id,
          reason: "Exactly one reverse-linked asset is Uploaded/Processing/Error",
        };
      }

      return {
        action: "manual_review_no_homework_link",
        canonicalAssetId: "",
        reason: `Multiple reverse-linked assets (${reverseLinkedAssets.length}); slot/upload ambiguous`,
      };
    }

    if (submissionLookupAssets.length === 1) {
      return {
        action: "link_submission_slot_asset_and_sync",
        canonicalAssetId: submissionLookupAssets[0].id,
        reason: "Found one submission asset for homework slot",
      };
    }

    if (submissionLookupAssets.length > 1) {
      const uploaded = pickUploadedAssets(submissionLookupAssets, assetsTable);
      if (uploaded.length === 1) {
        return {
          action: "link_submission_slot_uploaded_and_sync",
          canonicalAssetId: uploaded[0].id,
          reason: "One uploaded asset on submission + slot",
        };
      }

      return {
        action: "manual_review_submission_slot_ambiguous",
        canonicalAssetId: "",
        reason: `Multiple submission+slot assets (${submissionLookupAssets.length})`,
      };
    }

    return {
      action: "manual_review_no_asset_found",
      canonicalAssetId: "",
      reason: "No asset found via homework link, reverse link, or submission+slot",
    };
  }

  const slotMatches = pickAssetsBySlot(linkedAssets, assetsTable, homeworkSlot);
  if (slotMatches.length === 1) {
    return {
      action: "sync_from_slot_match",
      canonicalAssetId: slotMatches[0].id,
      reason: "Exactly one linked asset matches homework slot",
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

  if (slotMatches.length > 1) {
    return {
      action: "manual_review_multiple_slot_matches",
      canonicalAssetId: "",
      reason: `Multiple linked assets (${slotMatches.length}) match homework slot ${homeworkSlot}`,
    };
  }

  if (uploaded.length > 1) {
    return {
      action: "manual_review_multiple_uploaded_assets",
      canonicalAssetId: "",
      reason: `Multiple linked assets (${uploaded.length}) are Uploaded/Processing/Error`,
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

  const report = {
    script: "audit-homework-completion-upload-edge-cases",
    dryRun: true,
    homeworkChecked: homeworkQuery.records.length,
    noAssetCount: noAssetRows.length,
    multipleAssetCount: multipleAssetRows.length,
    edgeCaseTotal: noAssetRows.length + multipleAssetRows.length,
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

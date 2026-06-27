/*
Extension Script: Repair Audit 008 — Hartlie Video Feedback Asset Link
System: 127 SI Shooting Challenge
Purpose:
  Fix #8 in the audit repair sequence (v1.2 linkage audit).

  Video Feedback: reciyqAeOlQfxKt1J (Hartlie Week 2)
  Submission Asset: recMtr3amtoewxHaI (Video For Feedback)
  Submission: recS7hgu2KAnuN3qV

  Legacy Video Feedback Key pointed at deleted asset reczdOlFqFSLe7OcD.
  Links VF to the live submission asset and restores canonical key + bidirectional link.

  Resolves:
  - VIDEO_FEEDBACK_WITHOUT_SUBMISSION_ASSET

Safety:
  - DRY_RUN = true by default
  - Set CONFIRM_WRITE = true AND DRY_RUN = false to apply
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;

const TARGET_VIDEO_ID = "reciyqAeOlQfxKt1J";
const TARGET_ASSET_ID = "recMtr3amtoewxHaI";
const TARGET_SUBMISSION_ID = "recS7hgu2KAnuN3qV";
const LEGACY_KEY_ASSET_ID = "reczdOlFqFSLe7OcD";

const CONFIG = {
  scriptName: "repair-audit-008-hartlie-video-feedback-asset-link",
  version: "v1.0",

  tables: {
    assets: "Submission Assets",
    video: "Video Feedback",
    submissions: "Submissions",
  },

  assets: {
    fullName: "Submission Assets Full Name",
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    assetPurpose: "Asset Purpose",
    videoFeedback: "Video Feedback",
  },

  video: {
    name: "Video Feedback Name",
    key: "Video Feedback Key",
    submissionAsset: "Submission Asset",
    submission: "Submission",
    enrollment: "Enrollment",
  },

  values: {
    videoKeyPrefix: "VIDEO_FEEDBACK|",
    assetPurposeVideoForFeedback: "Video For Feedback",
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

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function linkedCell(ids) {
  return ids.map(id => ({ id }));
}

function idsMatch(left, right) {
  const a = [...left].sort().join(",");
  const b = [...right].sort().join(",");
  return a === b;
}

function buildCanonicalKey(assetId) {
  return `${CONFIG.values.videoKeyPrefix}${assetId}`;
}

function buildVideoUpdateFields(videoRecord, videoTable, assetRecord, assetsTable) {
  const fields = {};
  const canonicalKey = buildCanonicalKey(TARGET_ASSET_ID);
  const assetSubmissionIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.submission);
  const assetEnrollmentIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.enrollment);

  const currentAssetIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset);
  if (!idsMatch(currentAssetIds, [TARGET_ASSET_ID]) && isWritableField(videoTable, CONFIG.video.submissionAsset)) {
    fields[CONFIG.video.submissionAsset] = linkedCell([TARGET_ASSET_ID]);
  }

  const currentKey = getText(videoRecord, videoTable, CONFIG.video.key);
  if (currentKey !== canonicalKey && isWritableField(videoTable, CONFIG.video.key)) {
    fields[CONFIG.video.key] = canonicalKey;
  }

  const currentSubmissionIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.submission);
  if (!idsMatch(currentSubmissionIds, [TARGET_SUBMISSION_ID]) && isWritableField(videoTable, CONFIG.video.submission)) {
    fields[CONFIG.video.submission] = linkedCell([TARGET_SUBMISSION_ID]);
  }

  if (
    assetEnrollmentIds.length > 0 &&
    !idsMatch(getLinkedIds(videoRecord, videoTable, CONFIG.video.enrollment), assetEnrollmentIds) &&
    isWritableField(videoTable, CONFIG.video.enrollment)
  ) {
    fields[CONFIG.video.enrollment] = linkedCell(assetEnrollmentIds);
  }

  if (
    assetSubmissionIds.length > 0 &&
    !assetSubmissionIds.includes(TARGET_SUBMISSION_ID)
  ) {
    throw new Error(
      `Asset ${TARGET_ASSET_ID} is not linked to submission ${TARGET_SUBMISSION_ID}. Asset submissions: ${assetSubmissionIds.join(", ") || "(none)"}`
    );
  }

  return fields;
}

function buildAssetUpdateFields(assetRecord, assetsTable) {
  const fields = {};
  const currentVideoIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.videoFeedback);

  if (!currentVideoIds.includes(TARGET_VIDEO_ID) && isWritableField(assetsTable, CONFIG.assets.videoFeedback)) {
    fields[CONFIG.assets.videoFeedback] = linkedCell([...new Set([...currentVideoIds, TARGET_VIDEO_ID])]);
  }

  return fields;
}

async function main() {
  if (CONFIRM_WRITE && DRY_RUN) {
    throw new Error("CONFIRM_WRITE is true but DRY_RUN is still true. Set DRY_RUN = false to apply writes.");
  }

  const assetsTable = base.getTable(CONFIG.tables.assets);
  const videoTable = base.getTable(CONFIG.tables.video);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);

  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const videoFields = Object.values(CONFIG.video).filter(name => fieldExists(videoTable, name));
  const [videoRecord, assetRecord, submissionRecord] = await Promise.all([
    videoTable.selectRecordAsync(TARGET_VIDEO_ID, { fields: videoFields }),
    assetsTable.selectRecordAsync(TARGET_ASSET_ID, { fields: assetFields }),
    submissionsTable.selectRecordAsync(TARGET_SUBMISSION_ID),
  ]);

  if (!videoRecord) throw new Error(`Video Feedback not found: ${TARGET_VIDEO_ID}`);
  if (!assetRecord) throw new Error(`Submission Asset not found: ${TARGET_ASSET_ID}`);
  if (!submissionRecord) throw new Error(`Submission not found: ${TARGET_SUBMISSION_ID}`);

  const assetPurpose = getText(assetRecord, assetsTable, CONFIG.assets.assetPurpose);
  if (assetPurpose && assetPurpose !== CONFIG.values.assetPurposeVideoForFeedback) {
    console.log(
      JSON.stringify({
        warning: "asset_purpose_unexpected",
        expected: CONFIG.values.assetPurposeVideoForFeedback,
        actual: assetPurpose,
      })
    );
  }

  const videoFieldsUpdate = buildVideoUpdateFields(videoRecord, videoTable, assetRecord, assetsTable);
  const assetFieldsUpdate = buildAssetUpdateFields(assetRecord, assetsTable);

  const plan = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    legacyKeyAssetId: LEGACY_KEY_ASSET_ID,
    currentVideoKey: getText(videoRecord, videoTable, CONFIG.video.key),
    canonicalVideoKey: buildCanonicalKey(TARGET_ASSET_ID),
    video: {
      recordId: TARGET_VIDEO_ID,
      name: getText(videoRecord, videoTable, CONFIG.video.name) || videoRecord.name,
      currentSubmissionAssetIds: getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset),
      currentSubmissionIds: getLinkedIds(videoRecord, videoTable, CONFIG.video.submission),
      updateFields: videoFieldsUpdate,
    },
    asset: {
      recordId: TARGET_ASSET_ID,
      name: getText(assetRecord, assetsTable, CONFIG.assets.fullName) || assetRecord.name,
      currentVideoFeedbackIds: getLinkedIds(assetRecord, assetsTable, CONFIG.assets.videoFeedback),
      updateFields: assetFieldsUpdate,
    },
    submission: {
      recordId: TARGET_SUBMISSION_ID,
      name: submissionRecord.name,
    },
    issuesAddressed: ["VIDEO_FEEDBACK_WITHOUT_SUBMISSION_ASSET"],
  };

  console.log("===== Repair Audit 008 — Hartlie Video Feedback Asset Link =====");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE WRITE"}`);
  console.log(JSON.stringify(plan, null, 2));

  if (Object.keys(videoFieldsUpdate).length === 0 && Object.keys(assetFieldsUpdate).length === 0) {
    console.log("\nNo changes needed — Video Feedback and asset links already match.");
    return;
  }

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("\nTo apply: set DRY_RUN = false and CONFIRM_WRITE = true, then re-run.");
    return;
  }

  if (Object.keys(videoFieldsUpdate).length > 0) {
    await videoTable.updateRecordAsync(TARGET_VIDEO_ID, videoFieldsUpdate);
  }

  if (Object.keys(assetFieldsUpdate).length > 0) {
    await assetsTable.updateRecordAsync(TARGET_ASSET_ID, assetFieldsUpdate);
  }

  console.log(
    JSON.stringify({
      status: "success",
      videoId: TARGET_VIDEO_ID,
      assetId: TARGET_ASSET_ID,
      submissionId: TARGET_SUBMISSION_ID,
      videoFieldsUpdated: Object.keys(videoFieldsUpdate),
      assetFieldsUpdated: Object.keys(assetFieldsUpdate),
    })
  );
}

await main();

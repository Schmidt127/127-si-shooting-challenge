/*
Extension Script: Audit Video Pipeline Integrity
System: 127 SI Shooting Challenge
Purpose:
  Read-only parity check for video Submission Assets vs Video Feedback records
  (Automation 013 + 022 logic): missing VF links, duplicate VF, intake link gaps,
  Grade Band drift, upload writeback mismatch, and orphan Video Feedback rows.

Default: read-only (no writes)

Recommended follow-up:
  backfill-video-pipeline-links.js (dry run first)
  audit-stuck-upload-processing.js (Processing-without-Drive)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;

const CONFIG = {
  scriptName: "audit-video-pipeline-integrity",
  version: "v1.1",

  tables: {
    assets: "Submission Assets",
    video: "Video Feedback",
    enrollments: "Enrollments",
  },

  assets: {
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    assetPurpose: "Asset Purpose",
    uploadDestination: "Upload Destination",
    attachment: "Airtable Attachment",
    assetType: "Asset Type",
    assetSlot: "Asset Slot",
    videoFeedback: "Video Feedback",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
  },

  video: {
    key: "Video Feedback Key",
    submissionAsset: "Submission Asset",
    submission: "Submission",
    enrollment: "Enrollment",
    gradeBand: "Grade Band",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    videoUrlOrDriveLink: "Video URL or Drive Link",
    active: "Active?",
  },

  enrollment: {
    gradeBand: "Grade Band",
  },

  values: {
    uploadDestinationVideo: "Video Feedback",
    videoKeyPrefix: "VIDEO_FEEDBACK|",
    syncableAssetStatuses: ["Uploaded", "Processing", "Error"],
    pendingLinkStatus: "Pending Link",
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

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function hasAttachments(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return Array.isArray(raw) && raw.length > 0;
}

function hasUploadFile(record, table) {
  return (
    hasAttachments(record, table, CONFIG.assets.attachment) ||
    Boolean(getText(record, table, CONFIG.assets.googleDriveFileUrl)) ||
    Boolean(getText(record, table, CONFIG.assets.googleDriveFileId))
  );
}

function isVideoFeedbackAsset(assetRecord, assetsTable) {
  const uploadDestination = getText(assetRecord, assetsTable, CONFIG.assets.uploadDestination);
  const assetPurpose = getText(assetRecord, assetsTable, CONFIG.assets.assetPurpose);
  const assetType = getText(assetRecord, assetsTable, CONFIG.assets.assetType);
  const assetSlot = getText(assetRecord, assetsTable, CONFIG.assets.assetSlot);

  return (
    uploadDestination === CONFIG.values.uploadDestinationVideo ||
    assetPurpose === "Video For Feedback" ||
    assetType === "Video Feedback" ||
    assetSlot === "VIDEO"
  );
}

function buildVideoFeedbackKey(assetId) {
  return `${CONFIG.values.videoKeyPrefix}${assetId}`;
}

function isLegacyVideoFeedbackKey(key, assetId) {
  return Boolean(key && assetId && key === assetId);
}

function isCanonicalVideoFeedbackKey(key, assetId) {
  return key === buildVideoFeedbackKey(assetId);
}

function getSourceKeysForAsset(assetId) {
  return [buildVideoFeedbackKey(assetId), assetId];
}

function getVideoDriveUrl(videoRecord, videoTable) {
  return (
    getText(videoRecord, videoTable, CONFIG.video.googleDriveFileUrl) ||
    getText(videoRecord, videoTable, CONFIG.video.videoUrlOrDriveLink)
  );
}

function findVideoFeedbackIds(assetId, assetLinkedVideoIds, videoQuery, videoTable, videoByKey) {
  const ids = new Set();

  for (const videoId of assetLinkedVideoIds) {
    ids.add(videoId);
  }

  for (const sourceKey of getSourceKeysForAsset(assetId)) {
    for (const videoId of videoByKey.get(sourceKey) || []) {
      ids.add(videoId);
    }
  }

  for (const videoRecord of videoQuery.records) {
    if (getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset).includes(assetId)) {
      ids.add(videoRecord.id);
    }
  }

  return [...ids];
}

function pickPrimaryVideoFeedbackId(videoIds, assetId, assetLinkedVideoIds, videoQuery, videoTable) {
  const scored = videoIds
    .map(videoId => {
      const videoRecord = videoQuery.getRecord(videoId);
      if (!videoRecord) return { videoId, score: -1 };

      const key = getText(videoRecord, videoTable, CONFIG.video.key);
      let score = 0;

      if (isCanonicalVideoFeedbackKey(key, assetId)) score = 4;
      else if (isLegacyVideoFeedbackKey(key, assetId)) score = 3;
      else if (assetLinkedVideoIds.includes(videoId)) score = 3;
      else if (getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset).includes(assetId)) {
        score = 2;
      } else {
        score = 1;
      }

      return { videoId, score };
    })
    .filter(row => row.score >= 0)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.videoId || videoIds[0] || "";
}

function idsMatch(leftIds, rightIds) {
  const left = [...new Set(leftIds.filter(Boolean))].sort();
  const right = [...new Set(rightIds.filter(Boolean))].sort();
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}

function buildVideoByKeyIndex(videoQuery, videoTable) {
  const videoByKey = new Map();

  for (const videoRecord of videoQuery.records) {
    const key = getText(videoRecord, videoTable, CONFIG.video.key);
    if (!key) continue;

    if (!videoByKey.has(key)) {
      videoByKey.set(key, []);
    }
    videoByKey.get(key).push(videoRecord.id);
  }

  return videoByKey;
}

function buildEnrollmentGradeBandIndex(enrollmentQuery, enrollmentsTable) {
  const gradeBandByEnrollment = new Map();

  for (const enrollmentRecord of enrollmentQuery.records) {
    gradeBandByEnrollment.set(
      enrollmentRecord.id,
      getLinkedIds(enrollmentRecord, enrollmentsTable, CONFIG.enrollment.gradeBand)
    );
  }

  return gradeBandByEnrollment;
}

function buildAssetIndexBySubmission(assetQuery, assetsTable) {
  const videoAssetsBySubmission = new Map();

  for (const assetRecord of assetQuery.records) {
    if (!isVideoFeedbackAsset(assetRecord, assetsTable)) continue;

    const submissionId = getFirstLinkedId(assetRecord, assetsTable, CONFIG.assets.submission);
    if (!submissionId) continue;

    if (!videoAssetsBySubmission.has(submissionId)) {
      videoAssetsBySubmission.set(submissionId, []);
    }
    videoAssetsBySubmission.get(submissionId).push(assetRecord.id);
  }

  return videoAssetsBySubmission;
}

async function main() {
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const videoTable = base.getTable(CONFIG.tables.video);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const videoFields = Object.values(CONFIG.video).filter(name => fieldExists(videoTable, name));
  const enrollmentFields = Object.values(CONFIG.enrollment).filter(name =>
    fieldExists(enrollmentsTable, name)
  );

  const [assetQuery, videoQuery, enrollmentQuery] = await Promise.all([
    assetsTable.selectRecordsAsync({ fields: assetFields }),
    videoTable.selectRecordsAsync({ fields: videoFields }),
    enrollmentsTable.selectRecordsAsync({ fields: enrollmentFields }),
  ]);

  const videoByKey = buildVideoByKeyIndex(videoQuery, videoTable);
  const gradeBandByEnrollment = buildEnrollmentGradeBandIndex(enrollmentQuery, enrollmentsTable);
  const videoAssetsBySubmission = buildAssetIndexBySubmission(assetQuery, assetsTable);

  const issueCounts = {};
  const buckets = {};
  const matchedVideoIds = new Set();
  let videoAssetsChecked = 0;
  let videoAssetsWithFile = 0;
  let okCount = 0;

  function bump(issue) {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  }

  function pushSample(issue, row) {
    if (!buckets[issue]) buckets[issue] = [];
    if (buckets[issue].length < SAMPLE_LIMIT) {
      buckets[issue].push(row);
    }
  }

  for (const assetRecord of assetQuery.records) {
    if (!isVideoFeedbackAsset(assetRecord, assetsTable)) continue;

    videoAssetsChecked += 1;

    if (!hasUploadFile(assetRecord, assetsTable)) continue;

    videoAssetsWithFile += 1;

    const assetId = assetRecord.id;
    const submissionId = getFirstLinkedId(assetRecord, assetsTable, CONFIG.assets.submission);
    const enrollmentId = getFirstLinkedId(assetRecord, assetsTable, CONFIG.assets.enrollment);
    const assetLinkedVideoIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.videoFeedback);
    const assetUploadStatus = getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus);
    const videoIds = findVideoFeedbackIds(
      assetId,
      assetLinkedVideoIds,
      videoQuery,
      videoTable,
      videoByKey
    );

    let hasIssue = false;

    if (!submissionId) {
      bump("asset_missing_submission_link");
      pushSample("asset_missing_submission_link", {
        assetId,
        name: assetRecord.name,
        recommendedAction: "Link Submission - Linked on asset before 013",
      });
      hasIssue = true;
    }

    if (!enrollmentId) {
      bump("asset_missing_enrollment_link");
      pushSample("asset_missing_enrollment_link", {
        assetId,
        name: assetRecord.name,
        submissionId,
        recommendedAction: "Link Enrollment - Linked on asset before 013",
      });
      hasIssue = true;
    }

    const submissionVideoAssetIds = videoAssetsBySubmission.get(submissionId) || [];
    if (submissionId && submissionVideoAssetIds.length > 1) {
      bump("multiple_video_assets_per_submission");
      if ((buckets.multiple_video_assets_per_submission || []).length < SAMPLE_LIMIT) {
        pushSample("multiple_video_assets_per_submission", {
          assetId,
          submissionId,
          videoAssetIds: submissionVideoAssetIds,
          recommendedAction: "Expected when HW1+HW2 or retakes; ensure each asset has its own Video Feedback",
        });
      }
    }

    if (videoIds.length === 0) {
      bump("missing_video_feedback");
      pushSample("missing_video_feedback", {
        assetId,
        name: assetRecord.name,
        submissionId,
        enrollmentId,
        assetUploadStatus,
        recommendedAction: "Run 013 or backfill-video-pipeline-links.js (planned)",
      });
      hasIssue = true;
      continue;
    }

    if (videoIds.length > 1) {
      bump("duplicate_video_feedback");
      pushSample("duplicate_video_feedback", {
        assetId,
        name: assetRecord.name,
        videoFeedbackIds: videoIds,
        recommendedAction: "Manual dedupe — keep one Video Feedback keyed to asset",
      });
      hasIssue = true;
    }

    const primaryVideoId = pickPrimaryVideoFeedbackId(
      videoIds,
      assetId,
      assetLinkedVideoIds,
      videoQuery,
      videoTable
    );
    const videoRecord = primaryVideoId ? videoQuery.getRecord(primaryVideoId) : null;

    if (!videoRecord) {
      bump("missing_video_feedback");
      pushSample("missing_video_feedback", {
        assetId,
        name: assetRecord.name,
        recommendedAction: "Run 013 or backfill-video-pipeline-links.js (planned)",
      });
      continue;
    }

    matchedVideoIds.add(primaryVideoId);

    const expectedKey = buildVideoFeedbackKey(assetId);
    const actualKey = getText(videoRecord, videoTable, CONFIG.video.key);
    const videoAssetIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset);
    const videoSubmissionIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.submission);
    const videoEnrollmentIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.enrollment);
    const videoGradeBandIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.gradeBand);
    const videoUploadStatus = getSelectName(videoRecord, videoTable, CONFIG.video.uploadStatus);
    const enrollmentGradeBandIds = enrollmentId
      ? gradeBandByEnrollment.get(enrollmentId) || []
      : [];

    if (!assetLinkedVideoIds.includes(primaryVideoId)) {
      bump("asset_missing_video_feedback_link");
      pushSample("asset_missing_video_feedback_link", {
        assetId,
        videoFeedbackId: primaryVideoId,
        recommendedAction: "Run 013 to link asset → Video Feedback",
      });
      hasIssue = true;
    }

    if (!videoAssetIds.includes(assetId)) {
      bump("video_feedback_missing_asset_link");
      pushSample("video_feedback_missing_asset_link", {
        assetId,
        videoFeedbackId: primaryVideoId,
        name: videoRecord.name,
        recommendedAction: "Run 013 repair path or backfill-video-pipeline-links.js (planned)",
      });
      hasIssue = true;
    } else if (!idsMatch(videoAssetIds, [assetId])) {
      bump("video_feedback_asset_link_mismatch");
      pushSample("video_feedback_asset_link_mismatch", {
        assetId,
        videoFeedbackId: primaryVideoId,
        linkedAssetIds: videoAssetIds,
        recommendedAction: "Repair Video Feedback → Submission Asset to single canonical asset",
      });
      hasIssue = true;
    }

    if (submissionId && !videoSubmissionIds.includes(submissionId)) {
      bump("missing_submission_on_video_feedback");
      pushSample("missing_submission_on_video_feedback", {
        assetId,
        videoFeedbackId: primaryVideoId,
        submissionId,
        recommendedAction: "Run 013 repair path",
      });
      hasIssue = true;
    }

    if (enrollmentId && !videoEnrollmentIds.includes(enrollmentId)) {
      bump("missing_enrollment_on_video_feedback");
      pushSample("missing_enrollment_on_video_feedback", {
        assetId,
        videoFeedbackId: primaryVideoId,
        enrollmentId,
        recommendedAction: "Run 013 repair path",
      });
      hasIssue = true;
    }

    if (isCanonicalVideoFeedbackKey(actualKey, assetId)) {
      // Key is canonical.
    } else if (isLegacyVideoFeedbackKey(actualKey, assetId)) {
      bump("legacy_video_feedback_key");
      pushSample("legacy_video_feedback_key", {
        assetId,
        videoFeedbackId: primaryVideoId,
        expectedKey,
        actualKey,
        recommendedAction: "Run backfill repair_video_feedback_key (bare asset ID → VIDEO_FEEDBACK|{assetId})",
      });
      hasIssue = true;
    } else if (actualKey) {
      bump("video_feedback_key_mismatch");
      pushSample("video_feedback_key_mismatch", {
        assetId,
        videoFeedbackId: primaryVideoId,
        expectedKey,
        actualKey,
        recommendedAction: "Repair Video Feedback Key to VIDEO_FEEDBACK|{assetId}",
      });
      hasIssue = true;
    } else if (!actualKey) {
      bump("video_feedback_key_missing");
      pushSample("video_feedback_key_missing", {
        assetId,
        videoFeedbackId: primaryVideoId,
        expectedKey,
        recommendedAction: "Run 013 repair path to set Video Feedback Key",
      });
      hasIssue = true;
    }

    if (
      enrollmentGradeBandIds.length > 0 &&
      !idsMatch(videoGradeBandIds, enrollmentGradeBandIds)
    ) {
      bump("missing_grade_band_on_video_feedback");
      pushSample("missing_grade_band_on_video_feedback", {
        assetId,
        videoFeedbackId: primaryVideoId,
        enrollmentId,
        expectedGradeBandIds: enrollmentGradeBandIds,
        actualGradeBandIds: videoGradeBandIds,
        recommendedAction: "Run 111 - Copy Enrollment Grade Band to Video Feedback",
      });
      hasIssue = true;
    }

    if (
      fieldExists(videoTable, CONFIG.video.active) &&
      !getBooleanish(videoRecord, videoTable, CONFIG.video.active)
    ) {
      bump("video_feedback_not_active");
      pushSample("video_feedback_not_active", {
        assetId,
        videoFeedbackId: primaryVideoId,
        recommendedAction: "Run 013 repair path to set Active?",
      });
      hasIssue = true;
    }

    if (CONFIG.values.syncableAssetStatuses.includes(assetUploadStatus)) {
      if (assetUploadStatus !== videoUploadStatus) {
        bump("upload_status_mismatch");
        pushSample("upload_status_mismatch", {
          assetId,
          videoFeedbackId: primaryVideoId,
          assetUploadStatus,
          videoUploadStatus,
          recommendedAction: "Run 022 or backfill video upload writeback sync",
        });
        hasIssue = true;
      }

      const assetDriveUrl = getText(assetRecord, assetsTable, CONFIG.assets.googleDriveFileUrl);
      const videoDriveUrl = getVideoDriveUrl(videoRecord, videoTable);

      if (
        assetUploadStatus === "Uploaded" &&
        assetDriveUrl &&
        !videoDriveUrl
      ) {
        bump("drive_writeback_mismatch");
        pushSample("drive_writeback_mismatch", {
          assetId,
          videoFeedbackId: primaryVideoId,
          assetDriveUrl,
          recommendedAction: "Run 022 to copy Drive URL to Video Feedback",
        });
        hasIssue = true;
      }
    }

    if (!hasIssue) {
      okCount += 1;
      bump("ok");
      if ((buckets.ok || []).length < 5) {
        pushSample("ok", {
          assetId,
          name: assetRecord.name,
          videoFeedbackId: primaryVideoId,
          assetUploadStatus,
          videoUploadStatus,
        });
      }
    }
  }

  for (const videoRecord of videoQuery.records) {
    if (matchedVideoIds.has(videoRecord.id)) continue;

    const videoAssetIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset);
    const key = getText(videoRecord, videoTable, CONFIG.video.key);
    const uploadStatus = getSelectName(videoRecord, videoTable, CONFIG.video.uploadStatus);

    if (videoAssetIds.length === 0 && !key) {
      bump("orphan_video_feedback");
      pushSample("orphan_video_feedback", {
        videoFeedbackId: videoRecord.id,
        name: videoRecord.name,
        uploadStatus,
        recommendedAction: "Link to Submission Asset or archive if obsolete test row",
      });
      continue;
    }

    if (videoAssetIds.length === 0 && key.startsWith(CONFIG.values.videoKeyPrefix)) {
      const assetIdFromKey = key.slice(CONFIG.values.videoKeyPrefix.length);
      const assetRecord = assetQuery.getRecord(assetIdFromKey);

      if (!assetRecord) {
        bump("orphan_video_feedback_stale_key");
        pushSample("orphan_video_feedback_stale_key", {
          videoFeedbackId: videoRecord.id,
          name: videoRecord.name,
          videoFeedbackKey: key,
          recommendedAction: "Archive or repair key/asset link manually",
        });
      } else if (!isVideoFeedbackAsset(assetRecord, assetsTable)) {
        bump("orphan_video_feedback_wrong_asset_type");
        pushSample("orphan_video_feedback_wrong_asset_type", {
          videoFeedbackId: videoRecord.id,
          assetIdFromKey,
          recommendedAction: "Repair Video Feedback Key or asset destination",
        });
      } else {
        bump("video_feedback_unmatched_by_asset_scan");
        pushSample("video_feedback_unmatched_by_asset_scan", {
          videoFeedbackId: videoRecord.id,
          assetIdFromKey,
          recommendedAction: "Run 013 or backfill-video-pipeline-links.js (planned)",
        });
      }
    }
  }

  const repairIssues = Object.entries(issueCounts).filter(
    ([issue]) => issue !== "ok" && issue !== "multiple_video_assets_per_submission"
  );
  const issueTotal = repairIssues.reduce((sum, [, count]) => sum + count, 0);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: true,
    videoAssetsChecked,
    videoAssetsWithFile,
    videoFeedbackChecked: videoQuery.records.length,
    okCount,
    issueTotal,
    issueCounts,
    note: "multiple_video_assets_per_submission may be expected for retakes; review before deduping.",
    missingVideoFeedbackSample: buckets.missing_video_feedback || [],
    duplicateVideoFeedbackSample: buckets.duplicate_video_feedback || [],
    linkMismatchSample: [
      ...(buckets.asset_missing_video_feedback_link || []),
      ...(buckets.video_feedback_missing_asset_link || []),
      ...(buckets.video_feedback_asset_link_mismatch || []),
    ].slice(0, SAMPLE_LIMIT),
    legacyKeySample: buckets.legacy_video_feedback_key || [],
    keyMismatchSample: [
      ...(buckets.video_feedback_key_mismatch || []),
      ...(buckets.video_feedback_key_missing || []),
    ].slice(0, SAMPLE_LIMIT),
    uploadMismatchSample: [
      ...(buckets.upload_status_mismatch || []),
      ...(buckets.drive_writeback_mismatch || []),
    ].slice(0, SAMPLE_LIMIT),
    gradeBandMismatchSample: buckets.missing_grade_band_on_video_feedback || [],
    orphanVideoFeedbackSample: [
      ...(buckets.orphan_video_feedback || []),
      ...(buckets.orphan_video_feedback_stale_key || []),
      ...(buckets.orphan_video_feedback_wrong_asset_type || []),
      ...(buckets.video_feedback_unmatched_by_asset_scan || []),
    ].slice(0, SAMPLE_LIMIT),
    okSample: buckets.ok || [],
  };

  console.log("===== VIDEO PIPELINE INTEGRITY AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();

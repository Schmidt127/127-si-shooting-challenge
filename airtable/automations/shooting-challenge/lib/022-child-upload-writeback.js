/**
 * Pure helpers for Automation 022 child upload writeback (v2.2).
 * Used by offline tests. Airtable automation script keeps an equivalent inline copy
 * (Airtable cannot import repo modules).
 */

"use strict";

const {
  classifySecureVideoUrl,
  resolveParentFacingVideoUrl,
} = require("./secure-video-url");

/**
 * Parent-facing URL uses Reviewer File URL only — never Canonical File URL.
 * @deprecated Use resolveParentFacingVideoUrl for writeback planning.
 */
function resolvePreferredVideoUrl(fields = {}) {
  const result = resolveParentFacingVideoUrl({
    reviewerFileUrl: fields.reviewerFileUrl,
    canonicalFileUrl: fields.canonicalFileUrl,
    currentChildUrl: fields.currentChildUrl,
    assetUploadStatus: fields.assetUploadStatus,
  });
  if (result.url === null) {
    return String(fields.currentChildUrl || "").trim();
  }
  return result.url;
}

/**
 * Plan Video Feedback writeback fields from a Submission Asset snapshot.
 * Only includes fields that differ (idempotent). Never creates child records.
 */
function planVideoFeedbackWriteback({
  assetUploadStatus = "",
  assetReviewerFileUrl = "",
  assetCanonicalFileUrl = "",
  assetOriginalFileName = "",
  assetUploadedAt = null,
  assetUploadError = "",
  childUploadStatus = "",
  childVideoUrlOrDriveLink = "",
  childVideoAssetFileName = "",
  childVideoAssetUploadedAt = null,
  childUploadError = "",
  childWritebackComplete = false,
  mapStatus = (status) => status,
} = {}) {
  const fields = {};
  const targetStatus = mapStatus(assetUploadStatus);

  if (targetStatus && String(targetStatus).trim() !== String(childUploadStatus || "").trim()) {
    fields.uploadStatus = targetStatus;
  }

  const urlPlan = resolveParentFacingVideoUrl({
    reviewerFileUrl: assetReviewerFileUrl,
    canonicalFileUrl: assetCanonicalFileUrl,
    currentChildUrl: childVideoUrlOrDriveLink,
    assetUploadStatus,
  });
  if (urlPlan.shouldWriteUrl) {
    fields.videoUrlOrDriveLink = urlPlan.url ?? "";
  }

  const assetError = String(assetUploadError || "").trim();
  const repairNote = String(urlPlan.repairNote || "").trim();
  const nextUploadError = assetError || repairNote;
  if (nextUploadError !== String(childUploadError || "").trim()) {
    fields.uploadError = nextUploadError;
  }

  const fileName = String(assetOriginalFileName || "").trim();
  if (fileName && fileName !== String(childVideoAssetFileName || "").trim()) {
    fields.videoAssetFileName = fileName;
  }

  const left = assetUploadedAt ? new Date(assetUploadedAt).getTime() : NaN;
  const right = childVideoAssetUploadedAt
    ? new Date(childVideoAssetUploadedAt).getTime()
    : NaN;
  const datesMatch =
    (!assetUploadedAt && !childVideoAssetUploadedAt) ||
    (Number.isFinite(left) && Number.isFinite(right) && left === right);
  if (!datesMatch) {
    fields.videoAssetUploadedAt = assetUploadedAt;
  }

  if (assetUploadStatus === "Uploaded" && childWritebackComplete !== true) {
    fields.writebackComplete = true;
  }

  return fields;
}

/**
 * Second run with identical child state must plan an empty update (no duplicate writeback).
 */
function isIdempotentReplay(plannedFields) {
  return !plannedFields || Object.keys(plannedFields).length === 0;
}

module.exports = {
  classifySecureVideoUrl,
  resolveParentFacingVideoUrl,
  resolvePreferredVideoUrl,
  planVideoFeedbackWriteback,
  isIdempotentReplay,
};

/**
 * Pure helpers for Automation 022 child upload writeback (v2.0).
 * Used by offline tests. Airtable automation script keeps an equivalent inline copy
 * (Airtable cannot import repo modules).
 */

"use strict";

/**
 * Prefer Reviewer File URL; fall back to Canonical File URL.
 * Does not invent a third URL field.
 */
function resolvePreferredVideoUrl(fields = {}) {
  const reviewer = String(fields.reviewerFileUrl || "").trim();
  if (reviewer) return reviewer;
  const canonical = String(fields.canonicalFileUrl || "").trim();
  if (canonical) return canonical;
  return "";
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

  const preferredUrl = resolvePreferredVideoUrl({
    reviewerFileUrl: assetReviewerFileUrl,
    canonicalFileUrl: assetCanonicalFileUrl,
  });
  if (preferredUrl && preferredUrl !== String(childVideoUrlOrDriveLink || "").trim()) {
    fields.videoUrlOrDriveLink = preferredUrl;
  }

  const fileName = String(assetOriginalFileName || "").trim();
  if (fileName && fileName !== String(childVideoAssetFileName || "").trim()) {
    fields.videoAssetFileName = fileName;
  }

  const errorText = String(assetUploadError || "").trim();
  if (errorText !== String(childUploadError || "").trim()) {
    fields.uploadError = errorText;
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
  resolvePreferredVideoUrl,
  planVideoFeedbackWriteback,
  isIdempotentReplay,
};

/**
 * Shared secure parent-facing video URL validator.
 * Lambda viewer URLs only — never direct S3, presigned S3, or Google Drive.
 *
 * Used by: 022/072/073 offline tests, weekly email contracts, repair probes.
 * Airtable automation scripts embed an equivalent inline copy (no imports).
 */

"use strict";

const LAMBDA_VIEWER_HOST_RE = /\.lambda-url\.us-east-2\.on\.aws$/i;
const RECORD_ID_RE = /^rec[a-zA-Z0-9]{14}$/;
const FILE_PATH_RE = /^\/file\/(rec[a-zA-Z0-9]{14})\/?$/;
const S3_HOST_RE =
  /(?:^|\.)s3[.-][a-z0-9-]+\.amazonaws\.com$|\.s3\.amazonaws\.com$|\.s3\.[a-z0-9-]+\.amazonaws\.com$|shooting-challenge-assets/i;
const GOOGLE_DRIVE_HOST_RE = /^(?:drive|docs)\.google\.com$/i;
const PRESIGNED_QUERY_RE = /(?:^|[?&])(?:X-Amz-|AWSAccessKeyId=|Signature=)/i;
const AWS_ACCESS_KEY_RE = /AKIA[0-9A-Z]{16}/;

/** @typedef {'valid_lambda_viewer'|'missing_reviewer_url'|'direct_s3_rejected'|'presigned_s3_rejected'|'google_drive_rejected'|'invalid_host'|'malformed_url'|'missing_token'} SecureVideoUrlClassification */

/**
 * Redact tokens and presigned query strings for safe logs/reports.
 * @param {unknown} url
 * @returns {string}
 */
function redactSecureVideoUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.searchParams.has("token")) {
      parsed.searchParams.set("token", "[REDACTED]");
    }
    if (PRESIGNED_QUERY_RE.test(parsed.search)) {
      return `${parsed.origin}${parsed.pathname}?[PRESIGNED_REDACTED]`;
    }
    const search = parsed.search ? parsed.search.replace(/token=[^&]+/i, "token=[REDACTED]") : "";
    return `${parsed.origin}${parsed.pathname}${search}`;
  } catch {
    return "[unparseable]";
  }
}

/**
 * @param {unknown} url
 * @returns {{ classification: SecureVideoUrlClassification, safeUrl: string, redactedUrl: string }}
 */
function classifySecureVideoUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) {
    return {
      classification: "missing_reviewer_url",
      safeUrl: "",
      redactedUrl: "",
    };
  }

  if (AWS_ACCESS_KEY_RE.test(raw)) {
    return {
      classification: "presigned_s3_rejected",
      safeUrl: "",
      redactedUrl: "[credentials-redacted]",
    };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      classification: "malformed_url",
      safeUrl: "",
      redactedUrl: "[unparseable]",
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      classification: "malformed_url",
      safeUrl: "",
      redactedUrl: redactSecureVideoUrl(raw),
    };
  }

  if (GOOGLE_DRIVE_HOST_RE.test(parsed.hostname)) {
    return {
      classification: "google_drive_rejected",
      safeUrl: "",
      redactedUrl: redactSecureVideoUrl(raw),
    };
  }

  if (S3_HOST_RE.test(parsed.hostname) || S3_HOST_RE.test(raw)) {
    if (PRESIGNED_QUERY_RE.test(parsed.search) || PRESIGNED_QUERY_RE.test(raw)) {
      return {
        classification: "presigned_s3_rejected",
        safeUrl: "",
        redactedUrl: redactSecureVideoUrl(raw),
      };
    }
    return {
      classification: "direct_s3_rejected",
      safeUrl: "",
      redactedUrl: redactSecureVideoUrl(raw),
    };
  }

  if (PRESIGNED_QUERY_RE.test(parsed.search)) {
    return {
      classification: "presigned_s3_rejected",
      safeUrl: "",
      redactedUrl: redactSecureVideoUrl(raw),
    };
  }

  if (LAMBDA_VIEWER_HOST_RE.test(parsed.hostname)) {
    const pathMatch = parsed.pathname.match(FILE_PATH_RE);
    if (!pathMatch || !RECORD_ID_RE.test(pathMatch[1])) {
      return {
        classification: "malformed_url",
        safeUrl: "",
        redactedUrl: redactSecureVideoUrl(raw),
      };
    }
    const token = String(parsed.searchParams.get("token") || "").trim();
    if (!token) {
      return {
        classification: "missing_token",
        safeUrl: "",
        redactedUrl: redactSecureVideoUrl(raw),
      };
    }
    return {
      classification: "valid_lambda_viewer",
      safeUrl: raw,
      redactedUrl: redactSecureVideoUrl(raw),
    };
  }

  return {
    classification: "invalid_host",
    safeUrl: "",
    redactedUrl: redactSecureVideoUrl(raw),
  };
}

/**
 * @param {unknown} url
 * @returns {boolean}
 */
function isValidLambdaViewerUrl(url) {
  return classifySecureVideoUrl(url).classification === "valid_lambda_viewer";
}

/**
 * Resolve parent-facing Video Feedback URL from Submission Asset fields.
 * Never falls back to Canonical File URL. Preserves an existing valid Lambda URL.
 *
 * @param {{
 *   reviewerFileUrl?: unknown,
 *   canonicalFileUrl?: unknown,
 *   currentChildUrl?: unknown,
 *   assetUploadStatus?: string,
 * }} input
 * @returns {{
 *   url: string|null,
 *   shouldWriteUrl: boolean,
 *   repairNote: string,
 *   classification: SecureVideoUrlClassification,
 * }}
 */
function resolveParentFacingVideoUrl({
  reviewerFileUrl = "",
  canonicalFileUrl = "",
  currentChildUrl = "",
  assetUploadStatus = "",
} = {}) {
  const reviewer = classifySecureVideoUrl(reviewerFileUrl);
  if (reviewer.classification === "valid_lambda_viewer") {
    const current = String(currentChildUrl || "").trim();
    return {
      url: reviewer.safeUrl,
      shouldWriteUrl: reviewer.safeUrl !== current,
      repairNote: "",
      classification: reviewer.classification,
    };
  }

  const current = classifySecureVideoUrl(currentChildUrl);
  if (current.classification === "valid_lambda_viewer") {
    return {
      url: null,
      shouldWriteUrl: false,
      repairNote: "",
      classification: current.classification,
    };
  }

  const hasCanonical = Boolean(String(canonicalFileUrl || "").trim());
  const uploaded = String(assetUploadStatus || "").trim() === "Uploaded";
  let repairNote = "";
  if (uploaded && reviewer.classification === "missing_reviewer_url") {
    repairNote =
      "022: Missing Reviewer File URL — parent video link withheld (repair Reviewer Access Token required).";
  } else if (uploaded) {
    repairNote = `022: Unsafe reviewer URL (${reviewer.classification}) — parent video link withheld.`;
  } else if (hasCanonical) {
    repairNote =
      "022: Canonical File URL is internal-only — parent video link requires Reviewer File URL.";
  }

  const currentText = String(currentChildUrl || "").trim();
  return {
    url: "",
    shouldWriteUrl: Boolean(currentText),
    repairNote,
    classification: reviewer.classification,
  };
}

module.exports = {
  classifySecureVideoUrl,
  isValidLambdaViewerUrl,
  redactSecureVideoUrl,
  resolveParentFacingVideoUrl,
};

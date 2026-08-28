/*
Extension Script: FUT-010 — Clear intake attachments after verified S3 upload
System: 127 SI Shooting Challenge
Purpose:
  After a Submission Asset has Upload Status=Uploaded and durable S3 writeback,
  remove ONLY the Airtable Attachment field contents. Never delete the record
  or S3 object.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_DELETE = true to apply attachment clears
  - BATCH_LIMIT caps writes per run (default 25)
  - Requires field eligibility + external verification flags passed in via
    VERIFY_S3_OBJECT_EXISTS (set true only after operator HeadObject check)
  - Video assets require valid Reviewer File URL (Lambda viewer)
  - Idempotent: already-empty attachments are skipped
  - Never clears attachments when Send to Make Trigger is still checked

Operator flow:
  1. Run tools/airtable/fut_010_intake_attachment_cleanup.py dry-run first
  2. For extension batch apply: set VERIFY_S3_OBJECT_EXISTS=true only on rows
     already verified by the CLI report for that record
  3. Set CONFIRM_DELETE=true and DRY_RUN=false for apply

Rollback:
  Attachment bytes cannot be restored from Airtable after delete. Rollback is
  re-upload from S3 via Canonical File URL / Storage Key (object remains in S3).
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_DELETE = false;
const BATCH_LIMIT = 25;
/** Set true only when operator has confirmed S3 HeadObject for the batch. */
const VERIFY_S3_OBJECT_EXISTS = false;

const CONFIG = {
  tables: {
    assets: "Submission Assets",
  },
  fields: {
    airtableAttachment: "Airtable Attachment",
    uploadStatus: "Upload Status",
    uploadDestination: "Upload Destination",
    assetPurpose: "Asset Purpose",
    storageKey: "Storage Key",
    canonicalFileUrl: "Canonical File URL",
    reviewerFileUrl: "Reviewer File URL",
    uploadError: "Upload Error",
    writebackComplete: "Writeback Complete?",
    sendToMakeTrigger: "Send to Make Trigger",
    fileContentHash: "File Content Hash",
    fileHashAlgorithm: "File Hash Algorithm",
    uploadedAt: "Uploaded At",
  },
  values: {
    uploaded: "Uploaded",
    hashAlg: "SHA-256",
    homeworkDest: "Homework Completions",
    videoDest: "Video Feedback",
  },
};

const LAMBDA_VIEWER_HOST_RE = /\.lambda-url\.us-east-2\.on\.aws$/i;
const RECORD_ID_RE = /^rec[a-zA-Z0-9]{14}$/;
const FILE_PATH_RE = /^\/file\/(rec[a-zA-Z0-9]{14})\/?$/;
const S3_HOST_RE =
  /(?:^|\.)s3[.-][a-z0-9-]+\.amazonaws\.com$|\.s3\.amazonaws\.com$|shooting-challenge-assets/i;

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

function getCheckbox(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  return record.getCellValue(fieldName) === true;
}

function countAttachments(record, table) {
  if (!fieldExists(table, CONFIG.fields.airtableAttachment)) return 0;
  const raw = record.getCellValue(CONFIG.fields.airtableAttachment);
  return Array.isArray(raw) ? raw.length : 0;
}

function resolveCategory(record, table) {
  const dest = getText(record, table, CONFIG.fields.uploadDestination);
  if (dest === CONFIG.values.homeworkDest) return "homework";
  if (dest === CONFIG.values.videoDest) return "video";
  const purpose = getText(record, table, CONFIG.fields.assetPurpose);
  if (/homework/i.test(purpose)) return "homework";
  if (/video/i.test(purpose)) return "video";
  return "unknown";
}

function isWritebackComplete(record, table) {
  const flag = record.getCellValue(CONFIG.fields.writebackComplete);
  if (flag === 1 || flag === true) return true;
  if (getSelectName(record, table, CONFIG.fields.uploadStatus) !== CONFIG.values.uploaded) {
    return false;
  }
  const required = [
    CONFIG.fields.canonicalFileUrl,
    CONFIG.fields.storageKey,
    CONFIG.fields.fileContentHash,
    CONFIG.fields.uploadedAt,
  ];
  for (const name of required) {
    if (!getText(record, table, name)) return false;
  }
  if (getText(record, table, CONFIG.fields.fileHashAlgorithm) !== CONFIG.values.hashAlg) {
    return false;
  }
  if (getText(record, table, CONFIG.fields.uploadError)) return false;
  return true;
}

function classifyReviewerUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "missing_reviewer_url";
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return "malformed_url";
  }
  if (parsed.protocol !== "https:") return "malformed_url";
  if (S3_HOST_RE.test(parsed.hostname) || S3_HOST_RE.test(raw)) return "direct_s3_rejected";
  if (LAMBDA_VIEWER_HOST_RE.test(parsed.hostname)) {
    const pathMatch = parsed.pathname.match(FILE_PATH_RE);
    if (!pathMatch || !RECORD_ID_RE.test(pathMatch[1])) return "malformed_url";
    if (!parsed.searchParams.get("token")) return "missing_token";
    return "valid_lambda_viewer";
  }
  return "invalid_host";
}

function evaluateEligibility(record, table) {
  const attachmentCount = countAttachments(record, table);
  const category = resolveCategory(record, table);
  const storageKey = getText(record, table, CONFIG.fields.storageKey);
  const uploadStatus = getSelectName(record, table, CONFIG.fields.uploadStatus);
  const sendChecked = getCheckbox(record, table, CONFIG.fields.sendToMakeTrigger);

  if (attachmentCount === 0) {
    return { eligible: false, action: "skipped_already_empty", reason: "Attachment already empty" };
  }
  if (category === "unknown") {
    return { eligible: false, action: "skipped_ineligible", reason: "Unsupported destination" };
  }
  if (uploadStatus !== CONFIG.values.uploaded) {
    return {
      eligible: false,
      action: "skipped_ineligible",
      reason: `Upload Status is ${uploadStatus || "blank"}`,
    };
  }
  if (!storageKey || !storageKey.startsWith("shooting-challenge/")) {
    return { eligible: false, action: "skipped_ineligible", reason: "Storage Key missing or invalid" };
  }
  if (!isWritebackComplete(record, table)) {
    return { eligible: false, action: "skipped_ineligible", reason: "Writeback incomplete" };
  }
  if (sendChecked) {
    return {
      eligible: false,
      action: "skipped_uncertain_upload",
      reason: "Send to Make Trigger still checked",
    };
  }
  if (!VERIFY_S3_OBJECT_EXISTS) {
    return {
      eligible: false,
      action: "skipped_verification_failed",
      reason: "VERIFY_S3_OBJECT_EXISTS is false — run CLI dry-run + HeadObject first",
    };
  }
  if (category === "video") {
    const reviewer = classifyReviewerUrl(getText(record, table, CONFIG.fields.reviewerFileUrl));
    if (reviewer !== "valid_lambda_viewer") {
      return {
        eligible: false,
        action: "skipped_verification_failed",
        reason: `Reviewer URL invalid (${reviewer})`,
      };
    }
  }
  return { eligible: true, action: "eligible", reason: "Eligible for attachment clear", category };
}

function formatLogLine(record, table, result) {
  return [
    `recordId=${record.id}`,
    `assetPurpose=${JSON.stringify(getText(record, table, CONFIG.fields.assetPurpose))}`,
    `storageKey=${JSON.stringify(getText(record, table, CONFIG.fields.storageKey))}`,
    `verificationResult=${result.verificationResult}`,
    `deletionResult=${result.deletionResult}`,
    result.failureReason ? `failureReason=${JSON.stringify(result.failureReason)}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function main() {
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const query = await assetsTable.selectRecordsAsync({
    fields: Object.values(CONFIG.fields).filter((name) => fieldExists(assetsTable, name)),
  });

  const candidates = [];
  for (const record of query.records) {
    if (getSelectName(record, assetsTable, CONFIG.fields.uploadStatus) !== CONFIG.values.uploaded) {
      continue;
    }
    if (countAttachments(record, assetsTable) === 0) continue;
    if (!getText(record, assetsTable, CONFIG.fields.storageKey)) continue;
    candidates.push(record);
  }

  const toProcess = candidates.slice(0, BATCH_LIMIT);
  const report = {
    dryRun: DRY_RUN || !CONFIRM_DELETE,
    confirmDelete: CONFIRM_DELETE,
    verifyS3ObjectExists: VERIFY_S3_OBJECT_EXISTS,
    candidateCount: candidates.length,
    batchLimit: BATCH_LIMIT,
    processingCount: toProcess.length,
    rows: [],
  };

  for (const record of toProcess) {
    const eligibility = evaluateEligibility(record, assetsTable);
    const row = {
      recordId: record.id,
      assetPurpose: getText(record, assetsTable, CONFIG.fields.assetPurpose),
      storageKey: getText(record, assetsTable, CONFIG.fields.storageKey),
      attachmentCount: countAttachments(record, assetsTable),
      action: eligibility.action,
      failureReason: eligibility.reason,
    };

    if (!eligibility.eligible) {
      row.verificationResult = eligibility.action;
      row.deletionResult = "not_attempted";
      row.logLine = formatLogLine(record, assetsTable, row);
      report.rows.push(row);
      continue;
    }

    if (DRY_RUN || !CONFIRM_DELETE) {
      row.action = "dry_run_would_delete";
      row.verificationResult = "passed";
      row.deletionResult = "dry_run_would_delete";
      row.logLine = formatLogLine(record, assetsTable, row);
      report.rows.push(row);
      continue;
    }

    try {
      await assetsTable.updateRecordAsync(record.id, {
        [CONFIG.fields.airtableAttachment]: [],
      });
      row.action = "deleted";
      row.verificationResult = "passed";
      row.deletionResult = "deleted";
    } catch (error) {
      row.action = "delete_failed";
      row.verificationResult = "passed";
      row.deletionResult = "delete_failed";
      row.failureReason = String(error?.message || error);
    }
    row.logLine = formatLogLine(record, assetsTable, row);
    report.rows.push(row);
  }

  console.log(JSON.stringify(report, null, 2));
  if (DRY_RUN || !CONFIRM_DELETE) {
    console.log(
      "Dry run only — set DRY_RUN=false and CONFIRM_DELETE=true (and VERIFY_S3_OBJECT_EXISTS=true) to apply."
    );
  }
}

await main();

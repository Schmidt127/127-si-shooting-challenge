/*
Extension Script: FUT-009 — Safe post-feedback S3 video rename (report / apply)
System: 127 SI Shooting Challenge

Purpose:
  After coach sets Custom Video File Name on Video Feedback and confirms rename,
  copy the uploaded video object to the official FUT-007 Option D Storage Key.
  Updates Submission Asset Storage Key + Canonical File URL after S3 verify.
  Never deletes the source S3 object or Airtable record.

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_RENAME must be true for writes
  - Requires Confirm S3 Video Rename on linked Video Feedback (PKG-004 field)
  - Video-route Submission Assets only (Upload Destination = Video Feedback)
  - Never runs when Send to Make Trigger is checked

Operator flow:
  1. Run tools/airtable/fut_009_video_rename.py dry-run --record-id rec…
  2. Add Confirm S3 Video Rename checkbox on Video Feedback (Mike / PKG-004)
  3. Coach checks confirmation after entering Custom Video File Name
  4. Set CONFIRM_RENAME=true, DRY_RUN=false for single-record apply in extension
     OR use CLI apply --confirm-rename (recommended for S3 CopyObject)

Note: Airtable extension sandbox cannot call AWS CopyObject directly.
      Use the Python CLI for apply; this extension validates eligibility and
      documents writeback fields for operator review.

Rollback:
  Previous Storage Key object remains in S3. Revert Storage Key + Canonical URL
  on Submission Asset to Previous Storage Key if audit fields were written.
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_RENAME = false;
const BATCH_LIMIT = 10;

const CONFIG = {
  tables: {
    assets: "Submission Assets",
    videoFeedback: "Video Feedback",
  },
  fields: {
    storageKey: "Storage Key",
    canonicalFileUrl: "Canonical File URL",
    originalFileName: "Original File Name",
    uploadStatus: "Upload Status",
    uploadDestination: "Upload Destination",
    sendToMakeTrigger: "Send to Make Trigger",
    videoFeedback: "Video Feedback",
    activityDate: "Activity Date",
    activityDateFromSubmission: "Activity Date (from Submissions)",
    customVideoFileName: "Custom Video File Name",
    confirmS3Rename: "Confirm S3 Video Rename",
    formattedUploadName: "Formatted Upload Name",
  },
  values: {
    uploaded: "Uploaded",
    videoDest: "Video Feedback",
  },
};

const BLANK_CUSTOM = new Set(["", "—", "-", "\u2014", "\u2013"]);

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

function firstLinkId(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value) || !value.length) return "";
  const item = value[0];
  if (typeof item === "string") return item;
  if (item && item.id) return item.id;
  return "";
}

function isBlankCustom(value) {
  return BLANK_CUSTOM.has(String(value || "").trim());
}

function reportLine(parts) {
  return JSON.stringify(parts);
}

async function main() {
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const vfTable = base.getTable(CONFIG.tables.videoFeedback);

  const query = await assetsTable.selectRecordsAsync({
    fields: [
      CONFIG.fields.storageKey,
      CONFIG.fields.uploadStatus,
      CONFIG.fields.uploadDestination,
      CONFIG.fields.sendToMakeTrigger,
      CONFIG.fields.videoFeedback,
      CONFIG.fields.originalFileName,
      CONFIG.fields.activityDate,
      CONFIG.fields.activityDateFromSubmission,
    ],
  });

  const results = [];
  let processed = 0;

  for (const record of query.records) {
    if (processed >= BATCH_LIMIT) break;

    const destination = getText(record, assetsTable, CONFIG.fields.uploadDestination);
    if (destination !== CONFIG.values.videoDest) continue;

    const status = getText(record, assetsTable, CONFIG.fields.uploadStatus);
    if (status !== CONFIG.values.uploaded) continue;

    if (record.getCellValue(CONFIG.fields.sendToMakeTrigger) === true) continue;

    const vfId = firstLinkId(record, assetsTable, CONFIG.fields.videoFeedback);
    if (!vfId) continue;

    const vfRecord = query.records.find((r) => r.id === vfId);
    let vfQueryRecord = vfRecord;
    if (!vfQueryRecord) {
      const vfQuery = await vfTable.selectRecordAsync(vfId);
      vfQueryRecord = vfQuery;
    }
    if (!vfQueryRecord) continue;

    const customName = getText(vfQueryRecord, vfTable, CONFIG.fields.customVideoFileName);
    if (isBlankCustom(customName)) continue;

    const coachConfirmed =
      fieldExists(vfTable, CONFIG.fields.confirmS3Rename) &&
      vfQueryRecord.getCellValue(CONFIG.fields.confirmS3Rename) === true;

    if (!coachConfirmed && !CONFIRM_RENAME) {
      results.push({
        recordId: record.id,
        action: "skipped_missing_confirmation",
        reason: "Set Confirm S3 Video Rename on Video Feedback or CONFIRM_RENAME in script.",
      });
      processed += 1;
      continue;
    }

    results.push({
      recordId: record.id,
      action: DRY_RUN || !CONFIRM_RENAME ? "dry_run_report" : "use_cli_apply",
      customVideoFileName: customName,
      sourceStorageKey: getText(record, assetsTable, CONFIG.fields.storageKey),
      note:
        "Run: python tools/airtable/fut_009_video_rename.py apply --confirm-rename --record-id " +
        record.id,
    });
    processed += 1;
  }

  output.set(
    "results",
    results.map((row) => reportLine(row)).join("\n"),
  );
  output.set("dryRun", DRY_RUN);
  output.set("confirmRename", CONFIRM_RENAME);
  output.set("processed", processed);
}

await main();

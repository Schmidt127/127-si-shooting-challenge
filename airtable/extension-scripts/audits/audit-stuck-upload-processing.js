/*
Extension Script: Audit Stuck Upload Processing
System: 127 SI Shooting Challenge
Purpose:
  Read-only report of Submission Assets and Video Feedback stuck in non-terminal
  upload states (Processing without Drive URL, Ready gate mismatch, etc.).

Default: DRY_RUN = true (always read-only; no writes)
*/

// @ts-nocheck

const CONFIG = {
  stuckProcessingMinutes: 30,

  tables: {
    submissionAssets: "Submission Assets",
    videoFeedback: "Video Feedback",
  },

  assetFields: {
    name: "Submission Assets Full Name",
    uploadStatus: "Upload Status",
    uploadDestination: "Upload Destination",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    uploadError: "Upload Error",
    sendToMakeTrigger: "Send to Make Trigger",
    readyToSendToMake: "Ready to Send to Make?",
    submissionLinked: "Submission - Linked",
    enrollmentLinked: "Enrollment - Linked",
  },

  videoFields: {
    name: "Video Feedback Full Name",
    uploadStatus: "Upload Status",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    uploadError: "Upload Error",
  },

  statuses: {
    pendingLink: "Pending Link",
    ready: "Ready",
    processing: "Processing",
    uploaded: "Uploaded",
    error: "Error",
  },
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

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

function getCheckbox(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  return record.getCellValue(fieldName) === true;
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function minutesSince(isoTime) {
  if (!isoTime) return null;
  const ms = Date.now() - new Date(isoTime).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round(ms / 60000));
}

function classifyAsset(record, table) {
  const uploadStatus = getText(record, table, CONFIG.assetFields.uploadStatus);
  const statusKey = normalizeKey(uploadStatus);
  const driveUrl = getText(record, table, CONFIG.assetFields.googleDriveFileUrl);
  const driveId = getText(record, table, CONFIG.assetFields.googleDriveFileId);
  const uploadError = getText(record, table, CONFIG.assetFields.uploadError);
  const sendTrigger = getCheckbox(record, table, CONFIG.assetFields.sendToMakeTrigger);
  const readyToSend = getText(record, table, CONFIG.assetFields.readyToSendToMake);
  const ageMinutes = minutesSince(record.lastModifiedTime);

  const issues = [];

  if (
    statusKey === normalizeKey(CONFIG.statuses.processing) &&
    !driveUrl &&
    !driveId
  ) {
    issues.push(
      ageMinutes !== null && ageMinutes >= CONFIG.stuckProcessingMinutes
        ? "stuck_processing_no_drive"
        : "processing_no_drive_recent"
    );
  }

  if (statusKey === normalizeKey(CONFIG.statuses.ready) && sendTrigger) {
    issues.push("ready_gate_mismatch_use_pending_link");
  }

  if (
    statusKey === normalizeKey(CONFIG.statuses.pendingLink) &&
    sendTrigger &&
    String(readyToSend).includes("READY_TO_SEND") &&
    !driveUrl
  ) {
    issues.push("ready_to_send_pending_link");
  }

  if (statusKey === normalizeKey(CONFIG.statuses.error) && !uploadError) {
    issues.push("error_status_missing_message");
  }

  if (issues.length === 0) return null;

  return {
    table: CONFIG.tables.submissionAssets,
    id: record.id,
    name: getText(record, table, CONFIG.assetFields.name) || record.name,
    uploadStatus,
    uploadDestination: getText(record, table, CONFIG.assetFields.uploadDestination),
    sendToMakeTrigger: sendTrigger,
    readyToSendToMake: readyToSend,
    googleDriveFileUrl: driveUrl,
    uploadError,
    ageMinutes,
    issues,
  };
}

function classifyVideo(record, table) {
  const uploadStatus = getText(record, table, CONFIG.videoFields.uploadStatus);
  const statusKey = normalizeKey(uploadStatus);
  const driveUrl = getText(record, table, CONFIG.videoFields.googleDriveFileUrl);
  const driveId = getText(record, table, CONFIG.videoFields.googleDriveFileId);
  const uploadError = getText(record, table, CONFIG.videoFields.uploadError);
  const ageMinutes = minutesSince(record.lastModifiedTime);

  const issues = [];

  if (
    statusKey === normalizeKey(CONFIG.statuses.processing) &&
    !driveUrl &&
    !driveId
  ) {
    issues.push(
      ageMinutes !== null && ageMinutes >= CONFIG.stuckProcessingMinutes
        ? "stuck_processing_no_drive"
        : "processing_no_drive_recent"
    );
  }

  if (statusKey === normalizeKey(CONFIG.statuses.error) && !uploadError) {
    issues.push("error_status_missing_message");
  }

  if (issues.length === 0) return null;

  return {
    table: CONFIG.tables.videoFeedback,
    id: record.id,
    name: getText(record, table, CONFIG.videoFields.name) || record.name,
    uploadStatus,
    googleDriveFileUrl: driveUrl,
    uploadError,
    ageMinutes,
    issues,
  };
}

async function main() {
  const assetsTable = base.getTable(CONFIG.tables.submissionAssets);
  const videoTable = base.getTable(CONFIG.tables.videoFeedback);

  const assetFields = Object.values(CONFIG.assetFields).filter(name =>
    fieldExists(assetsTable, name)
  );
  const videoFields = Object.values(CONFIG.videoFields).filter(name =>
    fieldExists(videoTable, name)
  );

  const [assetQuery, videoQuery] = await Promise.all([
    assetsTable.selectRecordsAsync({ fields: assetFields }),
    videoTable.selectRecordsAsync({ fields: videoFields }),
  ]);

  const assetFindings = assetQuery.records
    .map(record => classifyAsset(record, assetsTable))
    .filter(Boolean);

  const videoFindings = videoQuery.records
    .map(record => classifyVideo(record, videoTable))
    .filter(Boolean);

  const report = {
    dryRun: true,
    stuckProcessingMinutes: CONFIG.stuckProcessingMinutes,
    assetIssueCount: assetFindings.length,
    videoIssueCount: videoFindings.length,
    assetFindings,
    videoFindings,
  };

  console.log("===== STUCK UPLOAD AUDIT =====");
  console.log(JSON.stringify(report, null, 2));

  if (assetFindings.length === 0 && videoFindings.length === 0) {
    console.log("No stuck upload issues found.");
  }
}

await main();

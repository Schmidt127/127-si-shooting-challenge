/*
GitHub Source of Truth — paste into Airtable starting AFTER this header block
(skip this GitHub header when pasting).
System: 127 SI Shooting Challenge
Backlog: Phase A / S22 — consolidate former 006 + 021
Folder: 02 - Submission Intake and Asset Creation
Rollback: airtable/automations/shooting-challenge/_rollback/phase-a-006-021-2026-07-14/
*/

/************************************************************
 * 021 - Submission Intake and Asset Creation -
 *       Set Attachment Status and Video Count
 *
 * Version: v1.0.0
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-14
 * Supersedes: separate 006 (video count) + prior 021 (attachment status)
 *
 * PURPOSE
 * - One Submissions prep pass that replaces two automations.
 * - Ordered steps (single atomic write when possible):
 *   1) Attachment Upload Status (No Files | Processing) — unlocks 009
 *   2) Video Count from Video Upload attachment length
 *
 * IMPORTANT DESIGN RULES
 * - Idempotent: skip each field if already correct.
 * - Only rewrite Attachment Upload Status when current is empty, No Files,
 *   or Processing (same effective gate as former 021 trigger). Never clobber
 *   terminal values such as Sent.
 * - Never write formula fields (Has Video?, Has Review Assets?).
 * - Prefer one updateRecordAsync for both fields to reduce races with 009.
 * - This is not asset creation (009), XP (010), VF (013), or HW link (020).
 * - Former automation 006 must be retired only after DEV tests PASS.
 *
 * INPUT
 * - recordId (Submissions) — required, must start with "rec"
 *
 * OUTPUTS
 * - statusOut: success | skipped | error
 * - errorOut
 * - debugStep
 * - actionOut: pipe of step actions (e.g. status_updated|video_count_updated)
 * - attachmentStatusOut, previousAttachmentStatusOut
 * - videoCountOut, existingVideoCountOut
 * - hasHwSub1Out, hasHwSub2Out, hasVideoUploadOut, hasAnyFilesOut
 * - updatedFields
 *
 * TRIGGER (recommended — covers former 006 ∪ 021 + attachment edits)
 * - Table: Submissions
 * - Type: When record is updated
 * - Watch fields: HW Sub 1, HW Sub 2, Video Upload
 * - Conditions — Match ANY:
 *   1) Attachment Upload Status is empty
 *   2) Attachment Upload Status is No Files
 *   3) Video Upload is not empty AND Video Count is empty
 * - Script also corrects Video Count when attachment watch fires while
 *   status is already Processing (former 006 re-fire gap).
 *
 * RECOMMENDED / OPTIONAL
 * - Optional tighten: add formula Needs Attachment Prep? later
 *
 * DO NOT USE
 * - Folder 07 email/upload automations
 * - Trigger that omits HW Sub / Video Upload watch (misses count changes)
 *
 * AUTOMATION NAME
 * - 021 - Submission Intake and Asset Creation - Set Attachment Status and Video Count
 *
 * FOLDER
 * - 02 - Submission Intake and Asset Creation
 ************************************************************/

// @ts-nocheck

async function main() {
  const SCRIPT = {
    scriptName:
      "021 - Submission Intake and Asset Creation - Set Attachment Status and Video Count",
    version: "v1.0.0",
    versionDate: "2026-07-14",
    originalWrittenDate: "2026-07-14",
    lastUpdated: "2026-07-14",
    folder: "02 - Submission Intake and Asset Creation",
    automationName:
      "021 - Submission Intake and Asset Creation - Set Attachment Status and Video Count",
  };

  const CONFIG = {
    tables: {
      submissions: "Submissions",
    },
    submissions: {
      hwSub1: "HW Sub 1",
      hwSub2: "HW Sub 2",
      videoUpload: "Video Upload",
      attachmentStatus: "Attachment Upload Status",
      videoCount: "Video Count",
      hasVideo: "Has Video?",
      hasReviewAssets: "Has Review Assets?",
    },
    statusValues: {
      noFiles: "No Files",
      processing: "Processing",
    },
    statuses: {
      success: "success",
      skipped: "skipped",
      error: "error",
    },
  };

  const fieldCache = new Map();
  let debugStep = "Start";

  function setOutputSafe(key, value) {
    try {
      output.set(key, value);
    } catch {
      // ignore
    }
  }

  function setDebug(step) {
    debugStep = step;
    setOutputSafe("debugStep", step);
  }

  function getFieldSafe(table, fieldName) {
    if (!table || !fieldName) return null;
    const cacheKey = `${table.name}:${fieldName}`;
    if (fieldCache.has(cacheKey)) return fieldCache.get(cacheKey);
    try {
      const field = table.getField(fieldName);
      fieldCache.set(cacheKey, field);
      return field;
    } catch {
      fieldCache.set(cacheKey, null);
      return null;
    }
  }

  function fieldExists(table, fieldName) {
    return !!getFieldSafe(table, fieldName);
  }

  function requireField(table, fieldName) {
    if (!fieldExists(table, fieldName)) {
      throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
    }
    return fieldName;
  }

  function isWritableField(table, fieldName) {
    const field = getFieldSafe(table, fieldName);
    if (!field) return false;
    const nonWritable = new Set([
      "formula",
      "rollup",
      "count",
      "lookup",
      "multipleLookupValues",
      "createdTime",
      "lastModifiedTime",
      "createdBy",
      "lastModifiedBy",
      "autoNumber",
      "button",
      "aiText",
      "externalSyncSource",
    ]);
    return !nonWritable.has(field.type);
  }

  function requireWritableField(table, fieldName) {
    requireField(table, fieldName);
    if (!isWritableField(table, fieldName)) {
      throw new Error(`Field is not writable on ${table.name}: ${fieldName}`);
    }
  }

  function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
  }

  function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return "";
    return String(record.getCellValueAsString(fieldName) || "").trim();
  }

  function getNumber(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);
    if (raw === null || raw === undefined || raw === "") return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function hasAttachmentFiles(value) {
    return Array.isArray(value) && value.length > 0;
  }

  function getAttachmentCount(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);
    if (!Array.isArray(raw)) return 0;
    return raw.length;
  }

  function buildSingleSelectValue(table, fieldName, optionName) {
    if (!fieldExists(table, fieldName)) return optionName;
    const field = table.getField(fieldName);
    if (field.type !== "singleSelect") return optionName;
    const choices = field?.options?.choices || [];
    const match = choices.find(
      (choice) =>
        String(choice?.name || "")
          .trim()
          .toLowerCase() ===
        String(optionName || "")
          .trim()
          .toLowerCase()
    );
    if (!match) {
      throw new Error(
        `Missing single-select option "${optionName}" in ${table.name}.${fieldName}`
      );
    }
    return { id: match.id };
  }

  function decideAttachmentStatus(hasAnyFiles) {
    return hasAnyFiles
      ? CONFIG.statusValues.processing
      : CONFIG.statusValues.noFiles;
  }

  function decideVideoCount(attachmentCount) {
    return attachmentCount;
  }

  // Exported for offline tests via global when present
  if (typeof globalThis !== "undefined") {
    globalThis.__SC_021_COMBINED__ = {
      decideAttachmentStatus,
      decideVideoCount,
      hasAttachmentFiles,
      CONFIG,
      SCRIPT,
    };
  }

  const inputConfig =
    typeof input !== "undefined" && input && typeof input.config === "function"
      ? input.config()
      : {};
  const recordId = String(inputConfig.recordId || "").trim();

  setDebug("1 - Validate recordId");
  if (!recordId) {
    throw new Error("Missing required input: recordId");
  }
  if (!recordId.startsWith("rec")) {
    throw new Error(`Invalid Submission recordId input: ${recordId}`);
  }

  const submissionsTable = base.getTable(CONFIG.tables.submissions);

  setDebug("2 - Validate schema");
  requireField(submissionsTable, CONFIG.submissions.hwSub1);
  requireField(submissionsTable, CONFIG.submissions.hwSub2);
  requireField(submissionsTable, CONFIG.submissions.videoUpload);
  requireWritableField(submissionsTable, CONFIG.submissions.attachmentStatus);
  requireWritableField(submissionsTable, CONFIG.submissions.videoCount);

  setDebug("3 - Load Submission");
  const fieldsToLoad = [
    CONFIG.submissions.hwSub1,
    CONFIG.submissions.hwSub2,
    CONFIG.submissions.videoUpload,
    CONFIG.submissions.attachmentStatus,
    CONFIG.submissions.videoCount,
  ].filter((name) => fieldExists(submissionsTable, name));

  const submission = await submissionsTable.selectRecordAsync(recordId, {
    fields: fieldsToLoad,
  });

  if (!submission) {
    setOutputSafe("statusOut", CONFIG.statuses.skipped);
    setOutputSafe("errorOut", `Submission not found: ${recordId}`);
    setOutputSafe("actionOut", "skipped_not_found");
    setDebug("Skipped: Submission not found");
    return;
  }

  setDebug("4 - Step A Attachment Upload Status");
  const hwSub1 = getRaw(submission, submissionsTable, CONFIG.submissions.hwSub1);
  const hwSub2 = getRaw(submission, submissionsTable, CONFIG.submissions.hwSub2);
  const videoUpload = getRaw(
    submission,
    submissionsTable,
    CONFIG.submissions.videoUpload
  );

  const hasHwSub1 = hasAttachmentFiles(hwSub1);
  const hasHwSub2 = hasAttachmentFiles(hwSub2);
  const hasVideoUpload = hasAttachmentFiles(videoUpload);
  const hasAnyFiles = hasHwSub1 || hasHwSub2 || hasVideoUpload;

  const previousAttachmentStatus = getText(
    submission,
    submissionsTable,
    CONFIG.submissions.attachmentStatus
  );
  const managedStatuses = new Set([
    "",
    CONFIG.statusValues.noFiles,
    CONFIG.statusValues.processing,
  ]);
  const nextAttachmentStatus = decideAttachmentStatus(hasAnyFiles);
  const actions = [];
  const updates = {};

  if (!managedStatuses.has(previousAttachmentStatus)) {
    // e.g. Sent — former 021 trigger never fired on these; do not clobber.
    actions.push("status_unmanaged_skip");
  } else if (previousAttachmentStatus !== nextAttachmentStatus) {
    updates[CONFIG.submissions.attachmentStatus] = buildSingleSelectValue(
      submissionsTable,
      CONFIG.submissions.attachmentStatus,
      nextAttachmentStatus
    );
    actions.push("status_updated");
  } else {
    actions.push("status_skipped");
  }

  setDebug("5 - Step B Video Count");
  const videoCount = decideVideoCount(
    getAttachmentCount(submission, submissionsTable, CONFIG.submissions.videoUpload)
  );
  const existingVideoCount = getNumber(
    submission,
    submissionsTable,
    CONFIG.submissions.videoCount
  );

  if (existingVideoCount !== videoCount) {
    updates[CONFIG.submissions.videoCount] = videoCount;
    actions.push("video_count_updated");
  } else {
    actions.push("video_count_skipped");
  }

  setDebug("6 - Atomic write");
  const updatedFields = Object.keys(updates);
  if (updatedFields.length > 0) {
    await submissionsTable.updateRecordAsync(recordId, updates);
  }

  const statusIdle =
    actions.includes("status_skipped") ||
    actions.includes("status_unmanaged_skip");
  const allSkipped =
    statusIdle &&
    actions.includes("video_count_skipped") &&
    updatedFields.length === 0;

  setDebug("7 - Outputs");
  setOutputSafe("statusOut", allSkipped ? CONFIG.statuses.skipped : CONFIG.statuses.success);
  setOutputSafe("errorOut", "");
  setOutputSafe("actionOut", actions.join("|"));
  setOutputSafe(
    "attachmentStatusOut",
    actions.includes("status_unmanaged_skip")
      ? previousAttachmentStatus
      : nextAttachmentStatus
  );
  setOutputSafe("previousAttachmentStatusOut", previousAttachmentStatus);
  setOutputSafe("videoCountOut", videoCount);
  setOutputSafe(
    "existingVideoCountOut",
    existingVideoCount === null || existingVideoCount === undefined
      ? ""
      : existingVideoCount
  );
  setOutputSafe("hasHwSub1Out", hasHwSub1);
  setOutputSafe("hasHwSub2Out", hasHwSub2);
  setOutputSafe("hasVideoUploadOut", hasVideoUpload);
  setOutputSafe("hasAnyFilesOut", hasAnyFiles);
  setOutputSafe("updatedFields", updatedFields.join(", "));
  setOutputSafe("recordId", recordId);

  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: allSkipped ? CONFIG.statuses.skipped : CONFIG.statuses.success,
        recordId,
        actionOut: actions.join("|"),
        attachmentStatusOut: nextAttachmentStatus,
        previousAttachmentStatusOut: previousAttachmentStatus,
        videoCountOut: videoCount,
        existingVideoCountOut: existingVideoCount,
        updatedFields,
        debugStep,
      },
      null,
      2
    )
  );
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  try {
    output.set("statusOut", "error");
    output.set("errorOut", message);
    output.set("debugStep", `FAILED`);
  } catch {
    // ignore
  }
  console.log(
    JSON.stringify({
      automation:
        "021 - Submission Intake and Asset Creation - Set Attachment Status and Video Count",
      statusOut: "error",
      errorOut: message,
    })
  );
  throw error;
}

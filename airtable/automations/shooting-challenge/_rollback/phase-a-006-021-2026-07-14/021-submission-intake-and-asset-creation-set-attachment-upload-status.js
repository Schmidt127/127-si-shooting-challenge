/*
Automation: 021 - Submission Intake and Asset Creation - Set Attachment Upload Status
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: 2026-06-20

Purpose:
To be confirmed from production script.

Trigger:
To be confirmed from Airtable automation.

Important Tables:
To be confirmed from production script.

Important Fields:
To be confirmed from production script.

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/

/************************************************************
 * 021 - SUBMISSION INTAKE AND ASSET CREATION
 * Set Attachment Upload Status
 *
 * Version: v2.0
 * Date Written: 2026-04-13
 * Last Reviewed: 2026-05-23
 *
 * PURPOSE
 * - Runs from one Submissions record.
 * - Checks whether the submission has files in:
 *   1) HW Sub 1
 *   2) HW Sub 2
 *   3) Video Upload
 * - Sets Submissions → Attachment Upload Status to:
 *   - No Files when no upload fields contain files.
 *   - Processing when one or more upload fields contain files.
 * - Avoids unnecessary writeback when the status is already correct.
 *
 * FOLDER
 * - 02 - Submission Intake and Asset Creation
 *
 * AUTOMATION NAME
 * - 021 - Submission Intake and Asset Creation - Set Attachment Upload Status
 *
 * TRIGGER TABLE
 * - Submissions
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Attachment Upload Status is empty
 *   OR
 * - Attachment Upload Status is No Files
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Submission record
 *
 * PRIMARY TABLES USED
 * - Submissions
 *
 * CURRENT SCHEMA FIELDS USED
 * - Submissions → HW Sub 1
 * - Submissions → HW Sub 2
 * - Submissions → Video Upload
 * - Submissions → Attachment Upload Status
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Submissions → Attachment Upload Status = No Files or Processing
 *
 * IMPORTANT NOTES
 * - This is not the Submission Assets creation automation.
 * - This is not the Google Drive upload automation.
 * - This is not an XP automation.
 * - This script only flags whether attachment processing is needed.
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: EASY-EDIT VARIABLES
   ========================================================= */

const TABLE_NAME = "Submissions";

/* ---------- Attachment fields ---------- */

const FIELD_HW_SUB_1 = "HW Sub 1";
const FIELD_HW_SUB_2 = "HW Sub 2";
const FIELD_VIDEO_UPLOAD = "Video Upload";

/* ---------- Status field ---------- */

const FIELD_ATTACHMENT_STATUS = "Attachment Upload Status";

/* ---------- Status values ---------- */

const STATUS_NO_FILES = "No Files";
const STATUS_PROCESSING = "Processing";

/* ---------- Output statuses ---------- */

const STATUS_SUCCESS = "success";
const STATUS_SKIPPED = "skipped";
const STATUS_ERROR = "error";

/* =========================================================
   SECTION 2: INPUTS
   ========================================================= */

const cfg = input.config();
const recordId = String(cfg.recordId || "").trim();

if (!recordId) {
    throw new Error("Missing required input: recordId");
}

/* =========================================================
   SECTION 3: TABLE REFERENCE
   ========================================================= */

const submissionsTable = base.getTable(TABLE_NAME);

/* =========================================================
   SECTION 4: HELPER FUNCTIONS
   ========================================================= */

function fieldExists(table, fieldName) {
    if (!table || !fieldName) return false;

    try {
        table.getField(fieldName);
        return true;
    } catch {
        return false;
    }
}

function requireField(table, fieldName) {
    if (!fieldExists(table, fieldName)) {
        throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
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

function hasAttachmentFiles(value) {
    return Array.isArray(value) && value.length > 0;
}

function buildSingleSelectValue(table, fieldName, optionName) {
    if (!fieldExists(table, fieldName)) return optionName;

    const field = table.getField(fieldName);

    if (field.type !== "singleSelect") {
        return optionName;
    }

    const choices = field?.options?.choices || [];

    const match = choices.find(choice =>
        String(choice?.name || "").trim().toLowerCase() ===
        String(optionName || "").trim().toLowerCase()
    );

    if (!match) {
        throw new Error(`Missing single-select option "${optionName}" in ${table.name}.${fieldName}`);
    }

    return { id: match.id };
}

function setOutputSafe(name, value) {
    try {
        output.set(name, value);
    } catch {
        // Ignore output mapping errors.
    }
}

function exitSkipped(reason, details = {}) {
    setOutputSafe("statusOut", STATUS_SKIPPED);
    setOutputSafe("errorOut", reason || "");
    setOutputSafe("recordIdOut", recordId);
    setOutputSafe("currentStatusOut", details.currentStatus || "");
    setOutputSafe("newStatusOut", details.newStatus || "");
    setOutputSafe("hasHwSub1Out", Boolean(details.hasHwSub1));
    setOutputSafe("hasHwSub2Out", Boolean(details.hasHwSub2));
    setOutputSafe("hasVideoUploadOut", Boolean(details.hasVideoUpload));
    setOutputSafe("hasAnyFilesOut", Boolean(details.hasAnyFiles));
}

/* =========================================================
   SECTION 5: VALIDATE REQUIRED FIELDS
   ========================================================= */

requireField(submissionsTable, FIELD_HW_SUB_1);
requireField(submissionsTable, FIELD_HW_SUB_2);
requireField(submissionsTable, FIELD_VIDEO_UPLOAD);
requireField(submissionsTable, FIELD_ATTACHMENT_STATUS);

/* =========================================================
   SECTION 6: LOAD SUBMISSION RECORD
   ========================================================= */

const submissionRecord = await submissionsTable.selectRecordAsync(recordId, {
    fields: [
        FIELD_HW_SUB_1,
        FIELD_HW_SUB_2,
        FIELD_VIDEO_UPLOAD,
        FIELD_ATTACHMENT_STATUS,
    ],
});

if (!submissionRecord) {
    throw new Error(`Submission record not found: ${recordId}`);
}

/* =========================================================
   SECTION 7: READ ATTACHMENT VALUES
   ========================================================= */

const hwSub1 = getRaw(submissionRecord, submissionsTable, FIELD_HW_SUB_1);
const hwSub2 = getRaw(submissionRecord, submissionsTable, FIELD_HW_SUB_2);
const videoUpload = getRaw(submissionRecord, submissionsTable, FIELD_VIDEO_UPLOAD);

const hasHwSub1 = hasAttachmentFiles(hwSub1);
const hasHwSub2 = hasAttachmentFiles(hwSub2);
const hasVideoUpload = hasAttachmentFiles(videoUpload);

const hasAnyFiles = hasHwSub1 || hasHwSub2 || hasVideoUpload;

const currentStatus = getText(
    submissionRecord,
    submissionsTable,
    FIELD_ATTACHMENT_STATUS
);

/* =========================================================
   SECTION 8: DETERMINE NEXT STATUS
   ========================================================= */

const newStatus = hasAnyFiles
    ? STATUS_PROCESSING
    : STATUS_NO_FILES;

/* =========================================================
   SECTION 9: AVOID UNNECESSARY WRITEBACK
   ========================================================= */

if (currentStatus === newStatus) {
    exitSkipped("Attachment Upload Status is already correct.", {
        currentStatus,
        newStatus,
        hasHwSub1,
        hasHwSub2,
        hasVideoUpload,
        hasAnyFiles,
    });

    return;
}

/* =========================================================
   SECTION 10: WRITE ATTACHMENT STATUS
   ========================================================= */

await submissionsTable.updateRecordAsync(recordId, {
    [FIELD_ATTACHMENT_STATUS]: buildSingleSelectValue(
        submissionsTable,
        FIELD_ATTACHMENT_STATUS,
        newStatus
    ),
});

/* =========================================================
   SECTION 11: OUTPUTS
   ========================================================= */

setOutputSafe("statusOut", STATUS_SUCCESS);
setOutputSafe("errorOut", "");
setOutputSafe("recordIdOut", recordId);
setOutputSafe("previousStatusOut", currentStatus);
setOutputSafe("newStatusOut", newStatus);
setOutputSafe("hasHwSub1Out", hasHwSub1);
setOutputSafe("hasHwSub2Out", hasHwSub2);
setOutputSafe("hasVideoUploadOut", hasVideoUpload);
setOutputSafe("hasAnyFilesOut", hasAnyFiles);

console.log(JSON.stringify({
    automation: "021 - Submission Intake and Asset Creation - Set Attachment Upload Status",
    statusOut: STATUS_SUCCESS,
    recordIdOut: recordId,
    previousStatusOut: currentStatus,
    newStatusOut: newStatus,
    hasHwSub1Out: hasHwSub1,
    hasHwSub2Out: hasHwSub2,
    hasVideoUploadOut: hasVideoUpload,
    hasAnyFilesOut: hasAnyFiles,
}, null, 2));

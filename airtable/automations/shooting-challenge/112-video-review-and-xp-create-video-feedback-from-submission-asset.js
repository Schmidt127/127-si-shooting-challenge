/*
Automation: 112 - Video Review and XP - Create Video Feedback from Submission Asset
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
 * 112 - VIDEO REVIEW AND XP
 * Create Video Feedback from Submission Asset
 *
 * Version: v2.1
 * Date Written: 2026-05-19
 * Last Reviewed: 2026-05-23
 *
 * PURPOSE
 * - Runs from one Submission Assets record.
 * - Creates one linked Video Feedback record when the asset is routed
 *   to Video Feedback.
 * - Uses the Submission Asset record ID as the stable Video Feedback Key.
 * - Prevents duplicate Video Feedback records by checking:
 *   1. Submission Assets → Video Feedback linked record field
 *   2. Video Feedback → Video Feedback Key
 * - Skips incomplete or incorrectly routed records without creating
 *   partial Video Feedback records.
 *
 * FOLDER
 * - 11 - Video Review and XP
 *
 * AUTOMATION NAME
 * - 112 - Video Review and XP - Create Video Feedback from Submission Asset
 *
 * TRIGGER TABLE
 * - Submission Assets
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Upload Destination is Video Feedback
 * - Airtable Attachment is not empty
 * - Submission - Linked is not empty
 * - Enrollment - Linked is not empty
 * - Video Feedback is empty
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Submission Assets record
 *
 * PRIMARY TABLES USED
 * - Submission Assets
 * - Video Feedback
 *
 * IMPORTANT NOTES
 * - This is not the Video Feedback parent email automation.
 * - This is not the Video XP award automation.
 * - This creates the Video Feedback review record only.
 * - Grade Band can still be filled later by Automation 111.
 * - XP can still be awarded later by a separate Video XP automation.
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: INPUTS
   ========================================================= */

const cfg = input.config();
const recordId = String(cfg.recordId || "").trim();

if (!recordId) {
    throw new Error("Missing required input: recordId");
}

/* =========================================================
   SECTION 2: TABLES / FIELDS / CONSTANTS
   ========================================================= */

const ASSETS_TABLE = "Submission Assets";
const VIDEO_TABLE = "Video Feedback";

/* ---------- Submission Assets fields ---------- */

const FIELD_ASSET_SUBMISSION = "Submission - Linked";
const FIELD_ASSET_ENROLLMENT = "Enrollment - Linked";
const FIELD_ASSET_WEEK = "Week";
const FIELD_ASSET_VIDEO_FEEDBACK = "Video Feedback";
const FIELD_ASSET_UPLOAD_DESTINATION = "Upload Destination";
const FIELD_ASSET_ASSET_PURPOSE = "Asset Purpose";
const FIELD_ASSET_ATTACHMENT = "Airtable Attachment";
const FIELD_ASSET_ORIGINAL_FILE_NAME = "Original File Name";
const FIELD_ASSET_GOOGLE_FILE_URL = "Google Drive File URL";
const FIELD_ASSET_UPLOADED_AT = "Uploaded At";

/* ---------- Video Feedback fields ---------- */

const FIELD_VIDEO_SUBMISSION_ASSET = "Submission Asset";
const FIELD_VIDEO_SUBMISSION = "Submission";
const FIELD_VIDEO_ENROLLMENT = "Enrollment";
const FIELD_VIDEO_KEY = "Video Feedback Key";
const FIELD_VIDEO_AWARD_STATUS = "Award Status";
const FIELD_VIDEO_ACTIVE = "Active?";
const FIELD_VIDEO_URL = "Video URL or Drive Link";
const FIELD_VIDEO_FILE_NAME = "Video Asset File Name";
const FIELD_VIDEO_UPLOADED_AT = "Video Asset Uploaded At";

/* ---------- Routing values ---------- */

const DEST_VIDEO_FEEDBACK = "video feedback";
const PURPOSE_VIDEO_FEEDBACK = "video for feedback";

/* ---------- Select values ---------- */

const AWARD_STATUS_PENDING = "Pending";

/* =========================================================
   SECTION 3: TABLE REFERENCES
   ========================================================= */

const assetsTable = base.getTable(ASSETS_TABLE);
const videoTable = base.getTable(VIDEO_TABLE);

/* =========================================================
   SECTION 4: HELPERS
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

function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return "";
    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getLinkedIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (!Array.isArray(raw)) return [];

    return raw
        .map(item => item?.id)
        .filter(Boolean);
}

function firstLinkedId(record, table, fieldName) {
    const ids = getLinkedIds(record, table, fieldName);
    return ids[0] || "";
}

function getAttachmentCount(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);
    return Array.isArray(raw) ? raw.length : 0;
}

function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function setOutputSafe(name, value) {
    try {
        output.set(name, value);
    } catch {
        // Ignore output mapping issues.
    }
}

function exitSkipped(reason, details = {}) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped");
    setOutputSafe("reasonOut", reason);
    setOutputSafe("submissionAssetIdOut", recordId);
    setOutputSafe("videoFeedbackIdOut", details.videoFeedbackIdOut || "");
    setOutputSafe("videoFeedbackKeyOut", recordId);
    setOutputSafe("uploadDestinationOut", details.uploadDestination || "");
    setOutputSafe("assetPurposeOut", details.assetPurpose || "");
    setOutputSafe("errorOut", details.errorOut || "");
}

function buildSingleSelectValue(table, fieldName, optionName) {
    if (!fieldExists(table, fieldName)) return null;

    const field = table.getField(fieldName);

    if (field.type !== "singleSelect") {
        return optionName;
    }

    const choices = field?.options?.choices || [];
    const match = choices.find(choice =>
        String(choice?.name || "").trim().toLowerCase() === String(optionName).trim().toLowerCase()
    );

    if (!match) {
        throw new Error(`Missing single-select option "${optionName}" in ${table.name}.${fieldName}`);
    }

    return { id: match.id };
}

function addIfFieldExists(payload, table, fieldName, value) {
    if (!fieldExists(table, fieldName)) return;

    if (value === null || value === undefined) return;

    if (typeof value === "string" && value.trim() === "") return;

    payload[fieldName] = value;
}

/* =========================================================
   SECTION 5: LOAD SUBMISSION ASSET
   ========================================================= */

const assetFieldsToLoad = [
    FIELD_ASSET_SUBMISSION,
    FIELD_ASSET_ENROLLMENT,
    FIELD_ASSET_WEEK,
    FIELD_ASSET_VIDEO_FEEDBACK,
    FIELD_ASSET_UPLOAD_DESTINATION,
    FIELD_ASSET_ASSET_PURPOSE,
    FIELD_ASSET_ATTACHMENT,
    FIELD_ASSET_ORIGINAL_FILE_NAME,
    FIELD_ASSET_GOOGLE_FILE_URL,
    FIELD_ASSET_UPLOADED_AT,
].filter(fieldName => fieldExists(assetsTable, fieldName));

const assetRecord = await assetsTable.selectRecordAsync(recordId, {
    fields: assetFieldsToLoad,
});

if (!assetRecord) {
    throw new Error(`Submission Asset record not found: ${recordId}`);
}

/* =========================================================
   SECTION 6: READ SOURCE VALUES
   ========================================================= */

const submissionId = firstLinkedId(
    assetRecord,
    assetsTable,
    FIELD_ASSET_SUBMISSION
);

const enrollmentId = firstLinkedId(
    assetRecord,
    assetsTable,
    FIELD_ASSET_ENROLLMENT
);

const existingLinkedVideoFeedbackIds = getLinkedIds(
    assetRecord,
    assetsTable,
    FIELD_ASSET_VIDEO_FEEDBACK
);

const uploadDestination = normalize(
    getText(assetRecord, assetsTable, FIELD_ASSET_UPLOAD_DESTINATION)
);

const assetPurpose = normalize(
    getText(assetRecord, assetsTable, FIELD_ASSET_ASSET_PURPOSE)
);

const attachmentCount = getAttachmentCount(
    assetRecord,
    assetsTable,
    FIELD_ASSET_ATTACHMENT
);

const originalFileName = getText(
    assetRecord,
    assetsTable,
    FIELD_ASSET_ORIGINAL_FILE_NAME
);

const googleFileUrl = getText(
    assetRecord,
    assetsTable,
    FIELD_ASSET_GOOGLE_FILE_URL
);

const uploadedAtRaw = getRaw(
    assetRecord,
    assetsTable,
    FIELD_ASSET_UPLOADED_AT
);

const videoFeedbackKey = recordId;

/* =========================================================
   SECTION 7: ROUTING / READINESS GUARDS
   ========================================================= */

const routedToVideoFeedback =
    uploadDestination === DEST_VIDEO_FEEDBACK ||
    assetPurpose === PURPOSE_VIDEO_FEEDBACK;

if (!routedToVideoFeedback) {
    exitSkipped("Submission Asset is not routed to Video Feedback.", {
        uploadDestination,
        assetPurpose,
    });
    return;
}

if (!submissionId) {
    exitSkipped("Submission - Linked is blank.", {
        uploadDestination,
        assetPurpose,
        errorOut: "Submission - Linked is blank.",
    });
    return;
}

if (!enrollmentId) {
    exitSkipped("Enrollment - Linked is blank.", {
        uploadDestination,
        assetPurpose,
        errorOut: "Enrollment - Linked is blank.",
    });
    return;
}

if (attachmentCount < 1) {
    exitSkipped("Airtable Attachment is blank.", {
        uploadDestination,
        assetPurpose,
        errorOut: "Airtable Attachment is blank.",
    });
    return;
}

if (existingLinkedVideoFeedbackIds.length > 0) {
    exitSkipped("Video Feedback already linked on Submission Asset.", {
        uploadDestination,
        assetPurpose,
        videoFeedbackIdOut: existingLinkedVideoFeedbackIds[0] || "",
    });
    return;
}

/* =========================================================
   SECTION 8: SECOND DEDUPE CHECK BY VIDEO FEEDBACK KEY
   ========================================================= */

const videoFieldsToLoad = [
    FIELD_VIDEO_KEY,
    FIELD_VIDEO_SUBMISSION_ASSET,
    FIELD_VIDEO_SUBMISSION,
    FIELD_VIDEO_ENROLLMENT,
    FIELD_VIDEO_AWARD_STATUS,
].filter(fieldName => fieldExists(videoTable, fieldName));

const videoQuery = await videoTable.selectRecordsAsync({
    fields: videoFieldsToLoad,
});

const existingVideoFeedback = videoQuery.records.find(record => {
    const existingKey = normalize(getText(record, videoTable, FIELD_VIDEO_KEY));
    return existingKey === normalize(videoFeedbackKey);
});

if (existingVideoFeedback) {
    exitSkipped("Video Feedback already exists for this Video Feedback Key.", {
        uploadDestination,
        assetPurpose,
        videoFeedbackIdOut: existingVideoFeedback.id,
    });
    return;
}

/* =========================================================
   SECTION 9: BUILD VIDEO FEEDBACK PAYLOAD
   ========================================================= */

const payload = {};

addIfFieldExists(payload, videoTable, FIELD_VIDEO_SUBMISSION_ASSET, [{ id: recordId }]);
addIfFieldExists(payload, videoTable, FIELD_VIDEO_SUBMISSION, [{ id: submissionId }]);
addIfFieldExists(payload, videoTable, FIELD_VIDEO_ENROLLMENT, [{ id: enrollmentId }]);
addIfFieldExists(payload, videoTable, FIELD_VIDEO_KEY, videoFeedbackKey);
addIfFieldExists(payload, videoTable, FIELD_VIDEO_ACTIVE, true);
addIfFieldExists(payload, videoTable, FIELD_VIDEO_URL, googleFileUrl);
addIfFieldExists(payload, videoTable, FIELD_VIDEO_FILE_NAME, originalFileName);

if (uploadedAtRaw) {
    addIfFieldExists(payload, videoTable, FIELD_VIDEO_UPLOADED_AT, uploadedAtRaw);
}

if (fieldExists(videoTable, FIELD_VIDEO_AWARD_STATUS)) {
    const pendingValue = buildSingleSelectValue(
        videoTable,
        FIELD_VIDEO_AWARD_STATUS,
        AWARD_STATUS_PENDING
    );

    addIfFieldExists(payload, videoTable, FIELD_VIDEO_AWARD_STATUS, pendingValue);
}

if (Object.keys(payload).length === 0) {
    throw new Error("No writable fields were found for Video Feedback payload.");
}

/* =========================================================
   SECTION 10: CREATE VIDEO FEEDBACK RECORD
   ========================================================= */

const videoFeedbackId = await videoTable.createRecordAsync(payload);

/* =========================================================
   SECTION 11: OUTPUTS
   ========================================================= */

setOutputSafe("statusOut", "success");
setOutputSafe("actionOut", "created");
setOutputSafe("reasonOut", "");
setOutputSafe("submissionAssetIdOut", recordId);
setOutputSafe("videoFeedbackIdOut", videoFeedbackId);
setOutputSafe("videoFeedbackKeyOut", videoFeedbackKey);
setOutputSafe("uploadDestinationOut", uploadDestination);
setOutputSafe("assetPurposeOut", assetPurpose);
setOutputSafe("errorOut", "");

console.log(JSON.stringify({
    automation: "112 - Video Review and XP - Create Video Feedback from Submission Asset",
    statusOut: "success",
    actionOut: "created",
    submissionAssetIdOut: recordId,
    videoFeedbackIdOut: videoFeedbackId,
    videoFeedbackKeyOut: videoFeedbackKey,
    uploadDestinationOut: uploadDestination,
    assetPurposeOut: assetPurpose,
    originalFileName,
    googleFileUrl,
}, null, 2));

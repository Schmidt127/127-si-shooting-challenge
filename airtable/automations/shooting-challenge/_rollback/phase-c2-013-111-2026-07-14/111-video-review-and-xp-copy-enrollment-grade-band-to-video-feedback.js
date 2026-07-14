/*
Automation: 111 - Video Review and XP - Copy Enrollment Grade Band to Video Feedback
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
 * 111 - VIDEO REVIEW AND XP
 * Copy Enrollment Grade Band to Video Feedback
 *
 * Version: v1.1
 * Date Written: 2026-04-27
 * Last Reviewed: 2026-05-23
 *
 * PURPOSE
 * - Runs from one Video Feedback record.
 * - Reads the linked Enrollment record.
 * - Pulls the linked Grade Band from the Enrollment record.
 * - Writes that Grade Band back to the Video Feedback record.
 *
 * FOLDER
 * - 11 - Video Review and XP
 *
 * AUTOMATION NAME
 * - 111 - Video Review and XP - Copy Enrollment Grade Band to Video Feedback
 *
 * TRIGGER TABLE
 * - Video Feedback
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Enrollment is not empty
 * - Grade Band is empty
 *
 * OPTIONAL TRIGGER CONDITION
 * - Feedback Posted? is unchecked
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Video Feedback record
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Video Feedback → Grade Band = Enrollment → Grade Band
 *
 * IMPORTANT NOTES
 * - This is not an email automation.
 * - This is not the Video Feedback parent email webhook.
 * - This prepares Video Feedback records for later Video XP processing.
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: EASY-EDIT VARIABLES
   ========================================================= */

const VIDEO_TABLE = "Video Feedback";
const ENROLLMENTS_TABLE = "Enrollments";

const FIELD_VIDEO_ENROLLMENT = "Enrollment";
const FIELD_VIDEO_GRADE_BAND = "Grade Band";

const FIELD_ENROLLMENT_GRADE_BAND = "Grade Band";

/* =========================================================
   SECTION 2: INPUTS
   ========================================================= */

const cfg = input.config();
const recordId = String(cfg.recordId || "").trim();

if (!recordId) {
    throw new Error("Missing required input: recordId");
}

/* =========================================================
   SECTION 3: TABLE REFERENCES
   ========================================================= */

const videoTable = base.getTable(VIDEO_TABLE);
const enrollmentsTable = base.getTable(ENROLLMENTS_TABLE);

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

function getLinkedIds(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return [];

    const value = record.getCellValue(fieldName);

    if (!Array.isArray(value)) return [];

    return value
        .map(item => item?.id)
        .filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
    const ids = getLinkedIds(record, table, fieldName);
    return ids[0] || "";
}

function buildLinkedRecordArray(ids) {
    return ids.map(id => ({ id }));
}

/* =========================================================
   SECTION 5: LOAD VIDEO FEEDBACK RECORD
   ========================================================= */

const videoRecord = await videoTable.selectRecordAsync(recordId);

if (!videoRecord) {
    throw new Error(`Video Feedback record not found: ${recordId}`);
}

/* =========================================================
   SECTION 6: VALIDATE VIDEO FEEDBACK FIELDS
   ========================================================= */

if (!fieldExists(videoTable, FIELD_VIDEO_ENROLLMENT)) {
    throw new Error(`Missing field on Video Feedback table: ${FIELD_VIDEO_ENROLLMENT}`);
}

if (!fieldExists(videoTable, FIELD_VIDEO_GRADE_BAND)) {
    throw new Error(`Missing field on Video Feedback table: ${FIELD_VIDEO_GRADE_BAND}`);
}

/* =========================================================
   SECTION 7: GET LINKED ENROLLMENT
   ========================================================= */

const enrollmentId = getFirstLinkedId(
    videoRecord,
    videoTable,
    FIELD_VIDEO_ENROLLMENT
);

if (!enrollmentId) {
    throw new Error("Video Feedback record is missing Enrollment.");
}

/* =========================================================
   SECTION 8: LOAD ENROLLMENT RECORD
   ========================================================= */

const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId);

if (!enrollmentRecord) {
    throw new Error(`Enrollment not found: ${enrollmentId}`);
}

if (!fieldExists(enrollmentsTable, FIELD_ENROLLMENT_GRADE_BAND)) {
    throw new Error(`Missing field on Enrollments table: ${FIELD_ENROLLMENT_GRADE_BAND}`);
}

/* =========================================================
   SECTION 9: GET GRADE BAND FROM ENROLLMENT
   ========================================================= */

const enrollmentGradeBandIds = getLinkedIds(
    enrollmentRecord,
    enrollmentsTable,
    FIELD_ENROLLMENT_GRADE_BAND
);

if (!enrollmentGradeBandIds.length) {
    throw new Error("Linked Enrollment is missing Grade Band.");
}

/* =========================================================
   SECTION 10: AVOID UNNECESSARY WRITEBACK
   ========================================================= */

const currentVideoGradeBandIds = getLinkedIds(
    videoRecord,
    videoTable,
    FIELD_VIDEO_GRADE_BAND
);

const currentKey = currentVideoGradeBandIds.slice().sort().join("|");
const nextKey = enrollmentGradeBandIds.slice().sort().join("|");

if (currentKey === nextKey) {
    output.set("statusOut", "SKIPPED_ALREADY_MATCHES");
    output.set("recordIdOut", recordId);
    output.set("enrollmentIdOut", enrollmentId);
    output.set("gradeBandCountOut", enrollmentGradeBandIds.length);
    output.set("messageOut", "Video Feedback Grade Band already matches Enrollment Grade Band.");
    return;
}

/* =========================================================
   SECTION 11: WRITE GRADE BAND BACK TO VIDEO FEEDBACK
   ========================================================= */

await videoTable.updateRecordAsync(recordId, {
    [FIELD_VIDEO_GRADE_BAND]: buildLinkedRecordArray(enrollmentGradeBandIds),
});

/* =========================================================
   SECTION 12: OUTPUTS
   ========================================================= */

output.set("statusOut", "SUCCESS");
output.set("recordIdOut", recordId);
output.set("enrollmentIdOut", enrollmentId);
output.set("gradeBandCountOut", enrollmentGradeBandIds.length);
output.set("gradeBandIdsOut", enrollmentGradeBandIds.join(","));

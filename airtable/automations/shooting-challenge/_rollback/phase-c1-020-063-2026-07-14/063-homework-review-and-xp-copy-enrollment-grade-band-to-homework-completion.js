/*
Automation: 063 - Homework Review and XP - Copy Enrollment Grade Band to Homework Completion
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
 * 063 - HOMEWORK REVIEW AND XP - Copy Enrollment Grade Band to Homework Completion
 *
 * Version: v2.0
 * Date Written: 2026-04-27
 * Last Reviewed: 2026-05-23
 *
 * PURPOSE
 * - Runs from one Homework Completions record.
 * - Reads the linked Enrollment record.
 * - Pulls the linked Grade Band from the Enrollment record.
 * - Writes that Grade Band back to the Homework Completions record.
 *
 * FOLDER
 * - 06 - Homework Review and XP
 *
 * AUTOMATION NAME
 * - 063 - Homework Review and XP - Copy Enrollment Grade Band to Homework Completion
 *
 * TRIGGER TABLE
 * - Homework Completions
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Enrollment is not empty
 * - Grade Band is empty
 *
 * OPTIONAL TRIGGER CONDITION
 * - Satisfactory? is unchecked
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Homework Completions record
 *
 * PRIMARY TABLES USED
 * - Homework Completions
 * - Enrollments
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Homework Completions → Grade Band = Enrollment → Grade Band
 *
 * IMPORTANT NOTES
 * - This is not a parent feedback email automation.
 * - This is not the homework XP event automation.
 * - This prepares Homework Completions records for later review/XP processing.
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: EASY-EDIT VARIABLES
   ========================================================= */

const HOMEWORK_TABLE = "Homework Completions";
const ENROLLMENTS_TABLE = "Enrollments";

/* ---------- Homework Completions fields ---------- */

const FIELD_HW_ENROLLMENT = "Enrollment";
const FIELD_HW_GRADE_BAND = "Grade Band";

/* ---------- Enrollments fields ---------- */

const FIELD_ENR_GRADE_BAND = "Grade Band";

/* ---------- Status values ---------- */

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
   SECTION 3: TABLE REFERENCES
   ========================================================= */

const homeworkTable = base.getTable(HOMEWORK_TABLE);
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

function requireField(table, fieldName) {
    if (!fieldExists(table, fieldName)) {
        throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
    }
}

function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
}

function getLinkedIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (!Array.isArray(raw)) return [];

    return raw
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

function arraysMatch(a, b) {
    const left = [...a].sort().join("|");
    const right = [...b].sort().join("|");

    return left === right;
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
    setOutputSafe("errorOut", reason);
    setOutputSafe("recordIdOut", recordId);
    setOutputSafe("homeworkCompletionIdOut", recordId);
    setOutputSafe("enrollmentIdOut", details.enrollmentId || "");
    setOutputSafe("gradeBandIdsOut", details.gradeBandIds || "");
}

/* =========================================================
   SECTION 5: VALIDATE REQUIRED FIELDS
   ========================================================= */

requireField(homeworkTable, FIELD_HW_ENROLLMENT);
requireField(homeworkTable, FIELD_HW_GRADE_BAND);
requireField(enrollmentsTable, FIELD_ENR_GRADE_BAND);

/* =========================================================
   SECTION 6: LOAD HOMEWORK COMPLETION RECORD
   ========================================================= */

const homeworkRecord = await homeworkTable.selectRecordAsync(recordId, {
    fields: [
        FIELD_HW_ENROLLMENT,
        FIELD_HW_GRADE_BAND,
    ],
});

if (!homeworkRecord) {
    throw new Error(`Homework Completion record not found: ${recordId}`);
}

/* =========================================================
   SECTION 7: READ HOMEWORK COMPLETION VALUES
   ========================================================= */

const enrollmentId = getFirstLinkedId(
    homeworkRecord,
    homeworkTable,
    FIELD_HW_ENROLLMENT
);

const existingHomeworkGradeBandIds = getLinkedIds(
    homeworkRecord,
    homeworkTable,
    FIELD_HW_GRADE_BAND
);

if (!enrollmentId) {
    exitSkipped("Homework Completion is missing Enrollment.");
    return;
}

/* =========================================================
   SECTION 8: LOAD ENROLLMENT RECORD
   ========================================================= */

const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId, {
    fields: [FIELD_ENR_GRADE_BAND],
});

if (!enrollmentRecord) {
    throw new Error(`Enrollment record not found: ${enrollmentId}`);
}

/* =========================================================
   SECTION 9: READ ENROLLMENT GRADE BAND
   ========================================================= */

const enrollmentGradeBandIds = getLinkedIds(
    enrollmentRecord,
    enrollmentsTable,
    FIELD_ENR_GRADE_BAND
);

if (!enrollmentGradeBandIds.length) {
    exitSkipped("Linked Enrollment is missing Grade Band.", {
        enrollmentId,
    });
    return;
}

/* =========================================================
   SECTION 10: AVOID UNNECESSARY WRITEBACK
   ========================================================= */

if (
    existingHomeworkGradeBandIds.length > 0 &&
    arraysMatch(existingHomeworkGradeBandIds, enrollmentGradeBandIds)
) {
    exitSkipped("Homework Completion Grade Band already matches Enrollment Grade Band.", {
        enrollmentId,
        gradeBandIds: existingHomeworkGradeBandIds.join(","),
    });
    return;
}

/* =========================================================
   SECTION 11: WRITE GRADE BAND TO HOMEWORK COMPLETION
   ========================================================= */

await homeworkTable.updateRecordAsync(recordId, {
    [FIELD_HW_GRADE_BAND]: buildLinkedRecordArray(enrollmentGradeBandIds),
});

/* =========================================================
   SECTION 12: OUTPUTS
   ========================================================= */

setOutputSafe("statusOut", STATUS_SUCCESS);
setOutputSafe("errorOut", "");
setOutputSafe("recordIdOut", recordId);
setOutputSafe("homeworkCompletionIdOut", recordId);
setOutputSafe("enrollmentIdOut", enrollmentId);
setOutputSafe("gradeBandIdsOut", enrollmentGradeBandIds.join(","));

console.log(JSON.stringify({
    automation: "063 - Homework Review and XP - Copy Enrollment Grade Band to Homework Completion",
    statusOut: STATUS_SUCCESS,
    recordIdOut: recordId,
    homeworkCompletionIdOut: recordId,
    enrollmentIdOut: enrollmentId,
    gradeBandIdsOut: enrollmentGradeBandIds.join(","),
}, null, 2));

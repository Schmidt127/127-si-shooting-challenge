/*
Automation: 007 - Submission Intake and Asset Creation - Duplicate Checker for Submissions
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
 * AUTOMATION NAME
 * 007 - Submission Intake and Asset Creation - Duplicate Checker for Submissions
 *
 * Version: v2.0
 * Date Written: 2026-05-20
 *
 * PURPOSE
 * - Reads one Submission record.
 * - Reads the formula field Duplicate Key.
 * - Finds other Submissions with the same Duplicate Key.
 * - Excludes the current Submission from the duplicate search.
 * - Updates Duplicate Review Status on the current Submission.
 * - Sets Count It when no duplicates are found.
 * - Sets Needs Review when one or more duplicates are found.
 *
 * CURRENT SCHEMA NOTES
 * - Submissions.Duplicate Key is a formula field and must NOT be written by script.
 * - Submissions.Duplicate Review Status is a writable single-select field.
 * - Valid Duplicate Review Status choices:
 *   - Needs Review
 *   - Count It
 *   - Exclude It
 * - Submissions.Count This Submission? is a formula that depends on Duplicate Review Status.
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId: Airtable record ID from Submissions
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Duplicate Key is not empty.
 * - Duplicate Review Status is empty OR needs recalculation.
 *
 * OUTPUTS
 * - ok
 * - recordId
 * - duplicateKeyOut
 * - duplicateReviewStatus
 * - matchCount
 * - matchingRecordIds
 * - actionTaken
 * - updatedFields
 * - statusOut
 * - errorOut
 * - debugStep
 ************************************************************/

/// <reference path="../../Welcome Email/airtable-automation-script.d.ts" />
// @ts-nocheck

/* =========================================================
   SECTION 1: CONFIG
   ========================================================= */

const CONFIG = {
    tables: {
        submissions: "Submissions",
    },

    submissions: {
        recordId: "RecordId", // formula; read only
        duplicateKey: "Duplicate Key", // formula; read only
        duplicateReviewStatus: "Duplicate Review Status",
        countThisSubmission: "Count This Submission?", // formula; read only
    },

    duplicateStatuses: {
        countIt: "Count It",
        needsReview: "Needs Review",
        excludeIt: "Exclude It",
    },

    runStatuses: {
        complete: "Complete",
        skipped: "Skipped",
        error: "Error",
    },

    debug: {
        logToConsole: true,

        // Keep false so a manually excluded record stays excluded unless you intentionally reset it.
        overwriteExcludeIt: false,
    },
};

/* =========================================================
   SECTION 2: INPUTS
   ========================================================= */

const cfg =
    typeof input !== "undefined" && input && typeof input.config === "function"
        ? input.config()
        : {};

const recordId = String(cfg.recordId || "").trim();

if (!recordId) {
    throw new Error("Missing required input: recordId");
}

/* =========================================================
   SECTION 3: TABLES
   ========================================================= */

const submissionsTable = base.getTable(CONFIG.tables.submissions);

/* =========================================================
   SECTION 4: HELPERS
   ========================================================= */

function log(message, data = null) {
    if (!CONFIG.debug.logToConsole) return;

    if (data === null || data === undefined) {
        console.log(message);
    } else {
        console.log(message, JSON.stringify(data, null, 2));
    }
}

function setOutputSafe(key, value) {
    try {
        output.set(key, value);
    } catch {
        // Output is unavailable in some testing contexts.
    }
}

function fieldExists(table, fieldName) {
    if (!table || !fieldName) return false;

    try {
        table.getField(fieldName);
        return true;
    } catch {
        return false;
    }
}

function getFieldSafe(table, fieldName) {
    if (!table || !fieldName) return null;

    try {
        return table.getField(fieldName);
    } catch {
        return null;
    }
}

function isWritableField(table, fieldName) {
    const field = getFieldSafe(table, fieldName);
    if (!field) return false;

    const nonWritableTypes = new Set([
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

    return !nonWritableTypes.has(field.type);
}

function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) {
        return null;
    }

    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) {
        return "";
    }

    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function buildCellValueForField(table, fieldName, value) {
    const field = getFieldSafe(table, fieldName);

    if (!field) {
        return undefined;
    }

    if (field.type === "singleSelect") {
        return { name: String(value || "").trim() };
    }

    return value;
}

function getSingleSelectName(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (raw && typeof raw === "object" && raw.name) {
        return String(raw.name || "").trim();
    }

    return getText(record, table, fieldName);
}

async function updateSubmissionSafe(targetRecordId, updates) {
    const safeUpdates = {};

    for (const [fieldName, value] of Object.entries(updates || {})) {
        if (!fieldExists(submissionsTable, fieldName)) {
            log(`Skipped missing Submission field: ${fieldName}`);
            continue;
        }

        if (!isWritableField(submissionsTable, fieldName)) {
            log(`Skipped non-writable Submission field: ${fieldName}`);
            continue;
        }

        if (value === undefined) {
            continue;
        }

        safeUpdates[fieldName] = value;
    }

    if (Object.keys(safeUpdates).length === 0) {
        return [];
    }

    await submissionsTable.updateRecordAsync(targetRecordId, safeUpdates);

    return Object.keys(safeUpdates);
}

function buildSubmissionFieldsToLoad() {
    return [
        CONFIG.submissions.recordId,
        CONFIG.submissions.duplicateKey,
        CONFIG.submissions.duplicateReviewStatus,
        CONFIG.submissions.countThisSubmission,
    ].filter((fieldName) => fieldExists(submissionsTable, fieldName));
}

function normalizeDuplicateKey(value) {
    return String(value || "").trim();
}

/* =========================================================
   SECTION 5: MAIN
   ========================================================= */

async function main() {
    let debugStep = "Start";
    let submission = null;
    let duplicateKey = "";
    let existingStatus = "";
    let newStatus = "";
    let matchCount = 0;
    let matchingRecordIds = [];
    let actionTaken = "";
    let updatedFields = [];

    setOutputSafe("debugStep", debugStep);

    try {
        debugStep = "1 - Validate recordId";
        setOutputSafe("debugStep", debugStep);

        if (!recordId.startsWith("rec")) {
            throw new Error(`Invalid Submission recordId input: ${recordId}`);
        }

        debugStep = "2 - Validate Required Fields";
        setOutputSafe("debugStep", debugStep);

        if (!fieldExists(submissionsTable, CONFIG.submissions.duplicateKey)) {
            throw new Error(
                `Missing required field on Submissions: ${CONFIG.submissions.duplicateKey}`
            );
        }

        if (!fieldExists(submissionsTable, CONFIG.submissions.duplicateReviewStatus)) {
            throw new Error(
                `Missing required field on Submissions: ${CONFIG.submissions.duplicateReviewStatus}`
            );
        }

        if (!isWritableField(submissionsTable, CONFIG.submissions.duplicateReviewStatus)) {
            throw new Error(
                `Field is not writable on Submissions: ${CONFIG.submissions.duplicateReviewStatus}`
            );
        }

        debugStep = "3 - Load Current Submission";
        setOutputSafe("debugStep", debugStep);

        submission = await submissionsTable.selectRecordAsync(recordId, {
            fields: buildSubmissionFieldsToLoad(),
        });

        if (!submission) {
            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("duplicateKeyOut", "");
            setOutputSafe("duplicateReviewStatus", "");
            setOutputSafe("matchCount", 0);
            setOutputSafe("matchingRecordIds", "");
            setOutputSafe("actionTaken", "");
            setOutputSafe("updatedFields", "");
            setOutputSafe("statusOut", CONFIG.runStatuses.skipped);
            setOutputSafe("errorOut", `Submission not found: ${recordId}`);
            setOutputSafe("debugStep", "Skipped: Submission not found");
            return;
        }

        debugStep = "4 - Read Current Values";
        setOutputSafe("debugStep", debugStep);

        duplicateKey = normalizeDuplicateKey(
            getText(submission, submissionsTable, CONFIG.submissions.duplicateKey)
        );

        existingStatus = getSingleSelectName(
            submission,
            submissionsTable,
            CONFIG.submissions.duplicateReviewStatus
        );

        log("Duplicate checker input", {
            recordId,
            duplicateKey,
            existingStatus,
        });

        if (!duplicateKey) {
            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("duplicateKeyOut", "");
            setOutputSafe("duplicateReviewStatus", existingStatus);
            setOutputSafe("matchCount", 0);
            setOutputSafe("matchingRecordIds", "");
            setOutputSafe("actionTaken", "skipped_no_duplicate_key");
            setOutputSafe("updatedFields", "");
            setOutputSafe("statusOut", CONFIG.runStatuses.skipped);
            setOutputSafe("errorOut", "Current Submission has no Duplicate Key.");
            setOutputSafe("debugStep", "Skipped: Duplicate Key blank");
            return;
        }

        debugStep = "5 - Preserve Manual Exclude It";
        setOutputSafe("debugStep", debugStep);

        if (
            existingStatus === CONFIG.duplicateStatuses.excludeIt &&
            CONFIG.debug.overwriteExcludeIt === false
        ) {
            setOutputSafe("ok", true);
            setOutputSafe("recordId", recordId);
            setOutputSafe("duplicateKeyOut", duplicateKey);
            setOutputSafe("duplicateReviewStatus", existingStatus);
            setOutputSafe("matchCount", 0);
            setOutputSafe("matchingRecordIds", "");
            setOutputSafe("actionTaken", "preserved_manual_exclude_it");
            setOutputSafe("updatedFields", "");
            setOutputSafe("statusOut", CONFIG.runStatuses.complete);
            setOutputSafe("errorOut", "");
            setOutputSafe("debugStep", "Done - Manual Exclude It preserved");
            return;
        }

        debugStep = "6 - Load Submissions for Duplicate Scan";
        setOutputSafe("debugStep", debugStep);

        const submissionsQuery = await submissionsTable.selectRecordsAsync({
            fields: buildSubmissionFieldsToLoad(),
        });

        debugStep = "7 - Find Matching Duplicate Keys";
        setOutputSafe("debugStep", debugStep);

        const matchingOtherRecords = submissionsQuery.records.filter((record) => {
            if (record.id === recordId) return false;

            const otherDuplicateKey = normalizeDuplicateKey(
                getText(record, submissionsTable, CONFIG.submissions.duplicateKey)
            );

            return otherDuplicateKey && otherDuplicateKey === duplicateKey;
        });

        matchCount = matchingOtherRecords.length;
        matchingRecordIds = matchingOtherRecords.map((record) => record.id);

        debugStep = "8 - Determine New Status";
        setOutputSafe("debugStep", debugStep);

        newStatus =
            matchCount === 0
                ? CONFIG.duplicateStatuses.countIt
                : CONFIG.duplicateStatuses.needsReview;

        actionTaken =
            matchCount === 0
                ? "count_it_no_duplicates_found"
                : "needs_review_duplicate_found";

        debugStep = "9 - Write Duplicate Review Status";
        setOutputSafe("debugStep", debugStep);

        const updates = {};

        if (existingStatus !== newStatus) {
            updates[CONFIG.submissions.duplicateReviewStatus] = buildCellValueForField(
                submissionsTable,
                CONFIG.submissions.duplicateReviewStatus,
                newStatus
            );
        }

        updatedFields = await updateSubmissionSafe(recordId, updates);

        debugStep = "10 - Outputs";
        setOutputSafe("debugStep", debugStep);

        setOutputSafe("ok", true);
        setOutputSafe("recordId", recordId);
        setOutputSafe("duplicateKeyOut", duplicateKey);
        setOutputSafe("duplicateReviewStatus", newStatus);
        setOutputSafe("matchCount", matchCount);
        setOutputSafe("matchingRecordIds", matchingRecordIds.join(", "));
        setOutputSafe("actionTaken", actionTaken);
        setOutputSafe("updatedFields", updatedFields.join(", "));
        setOutputSafe("statusOut", CONFIG.runStatuses.complete);
        setOutputSafe("errorOut", "");

        log("Duplicate checker completed", {
            recordId,
            duplicateKey,
            existingStatus,
            newStatus,
            matchCount,
            matchingRecordIds,
            updatedFields,
            actionTaken,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        setOutputSafe("ok", false);
        setOutputSafe("recordId", recordId);
        setOutputSafe("duplicateKeyOut", duplicateKey);
        setOutputSafe("duplicateReviewStatus", newStatus || existingStatus);
        setOutputSafe("matchCount", matchCount);
        setOutputSafe("matchingRecordIds", matchingRecordIds.join(", "));
        setOutputSafe("actionTaken", actionTaken);
        setOutputSafe("updatedFields", updatedFields.join(", "));
        setOutputSafe("statusOut", CONFIG.runStatuses.error);
        setOutputSafe("errorOut", message);
        setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);

        log("Duplicate checker failed", {
            recordId,
            debugStep,
            error: message,
        });

        throw error;
    }
}

/* =========================================================
   SECTION 6: RUN
   ========================================================= */

await main();

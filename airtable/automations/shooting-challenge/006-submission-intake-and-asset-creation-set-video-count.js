/*
Automation: 006 - Submission Intake and Asset Creation - Set Video Count
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
 * 006 - Submission Intake and Asset Creation - Set Video Count
 *
 * Version: v3.0
 * Date Written: 2026-05-20
 *
 * PURPOSE
 * - Reads one Submission record.
 * - Counts attachments in Submissions.Video Upload.
 * - Writes the attachment count into Submissions.Video Count.
 * - Skips the update when the existing count already matches.
 *
 * CURRENT SCHEMA NOTES
 * - Submissions.Video Upload is a multipleAttachments field.
 * - Submissions.Video Count is a writable number field.
 * - Submissions.Has Video? is a formula field and must NOT be written by script.
 * - Submissions.Has Review Assets? is a formula field and must NOT be written by script.
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId: Airtable record ID from Submissions
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Video Upload is not empty.
 * - OR Video Count does not equal the current number of attached video files.
 *
 * OUTPUTS
 * - ok
 * - recordId
 * - videoCountOut
 * - existingVideoCountOut
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
        videoUpload: "Video Upload",
        videoCount: "Video Count",
        hasVideo: "Has Video?", // formula; read only
        hasReviewAssets: "Has Review Assets?", // formula; read only
    },

    statuses: {
        complete: "Complete",
        skipped: "Skipped",
        error: "Error",
    },

    debug: {
        logToConsole: true,
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

function getNumber(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (raw === null || raw === undefined || raw === "") {
        return null;
    }

    if (typeof raw === "number") {
        return Number.isFinite(raw) ? raw : null;
    }

    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

function getAttachmentCount(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (!Array.isArray(raw)) {
        return 0;
    }

    return raw.length;
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
        CONFIG.submissions.videoUpload,
        CONFIG.submissions.videoCount,
        CONFIG.submissions.hasVideo,
        CONFIG.submissions.hasReviewAssets,
    ].filter((fieldName) => fieldExists(submissionsTable, fieldName));
}

/* =========================================================
   SECTION 5: MAIN
   ========================================================= */

async function main() {
    let debugStep = "Start";
    let videoCount = 0;
    let existingVideoCount = null;
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

        if (!fieldExists(submissionsTable, CONFIG.submissions.videoUpload)) {
            throw new Error(
                `Missing required field on Submissions: ${CONFIG.submissions.videoUpload}`
            );
        }

        if (!fieldExists(submissionsTable, CONFIG.submissions.videoCount)) {
            throw new Error(
                `Missing required field on Submissions: ${CONFIG.submissions.videoCount}`
            );
        }

        if (!isWritableField(submissionsTable, CONFIG.submissions.videoCount)) {
            throw new Error(
                `Field is not writable on Submissions: ${CONFIG.submissions.videoCount}`
            );
        }

        debugStep = "3 - Load Submission";
        setOutputSafe("debugStep", debugStep);

        const submission = await submissionsTable.selectRecordAsync(recordId, {
            fields: buildSubmissionFieldsToLoad(),
        });

        if (!submission) {
            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("videoCountOut", "");
            setOutputSafe("existingVideoCountOut", "");
            setOutputSafe("updatedFields", "");
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", `Submission not found: ${recordId}`);
            setOutputSafe("debugStep", "Skipped: Submission not found");
            return;
        }

        debugStep = "4 - Count Video Attachments";
        setOutputSafe("debugStep", debugStep);

        videoCount = getAttachmentCount(
            submission,
            submissionsTable,
            CONFIG.submissions.videoUpload
        );

        existingVideoCount = getNumber(
            submission,
            submissionsTable,
            CONFIG.submissions.videoCount
        );

        log("Video count input", {
            recordId,
            videoCount,
            existingVideoCount,
        });

        debugStep = "5 - Build Update";
        setOutputSafe("debugStep", debugStep);

        const updates = {};

        if (existingVideoCount !== videoCount) {
            updates[CONFIG.submissions.videoCount] = videoCount;
        }

        debugStep = "6 - Write Update";
        setOutputSafe("debugStep", debugStep);

        updatedFields = await updateSubmissionSafe(recordId, updates);

        debugStep = "7 - Outputs";
        setOutputSafe("debugStep", debugStep);

        setOutputSafe("ok", true);
        setOutputSafe("recordId", recordId);
        setOutputSafe("videoCountOut", videoCount);
        setOutputSafe("existingVideoCountOut", existingVideoCount ?? "");
        setOutputSafe("updatedFields", updatedFields.join(", "));
        setOutputSafe("statusOut", CONFIG.statuses.complete);
        setOutputSafe("errorOut", "");

        log("Video Count automation completed", {
            recordId,
            videoCount,
            existingVideoCount,
            updatedFields,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        setOutputSafe("ok", false);
        setOutputSafe("recordId", recordId);
        setOutputSafe("videoCountOut", videoCount);
        setOutputSafe("existingVideoCountOut", existingVideoCount ?? "");
        setOutputSafe("updatedFields", updatedFields.join(", "));
        setOutputSafe("statusOut", CONFIG.statuses.error);
        setOutputSafe("errorOut", message);
        setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);

        log("Video Count automation failed", {
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

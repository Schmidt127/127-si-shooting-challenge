/*
Automation: 023 - Submission Intake and Asset Creation - Assign Enrollment to Submission
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
 * 023 - Submission Intake and Asset Creation - Assign Enrollment to Submission
 *
 * Version: v2.0
 * Date Written: 2026-05-20
 *
 * PURPOSE
 * - Reads one Submission record.
 * - Reads the linked Athlete on the Submission.
 * - Finds the matching active Enrollment for that Athlete.
 * - If Program Instance exists on both Submission and Enrollment, uses it to narrow the match.
 * - Writes the matching Enrollment link back to the Submission.
 * - Does not guess if zero or multiple active Enrollments match.
 *
 * CURRENT SCHEMA NOTES
 * - Submissions.Athlete is a writable linked-record field.
 * - Submissions.Enrollment is a writable linked-record field.
 * - Submissions.Program Instance is treated as optional because it is not present in the current schema snapshot.
 * - Enrollments.Athlete is a linked-record field.
 * - Enrollments.Active? is a writable checkbox.
 * - Enrollments.Program Instance is a linked-record field.
 * - Enrollments.Enrollment Key is a formula field and is read only.
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId: Airtable record ID from Submissions
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Athlete is not empty.
 * - Enrollment is empty.
 *
 * OUTPUTS
 * - ok
 * - recordId
 * - athleteIdOut
 * - submissionProgramInstanceIdOut
 * - matchedEnrollmentId
 * - matchedEnrollmentKey
 * - candidateCountOut
 * - matchModeOut
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
        enrollments: "Enrollments",
    },

    submissions: {
        athlete: "Athlete",
        enrollment: "Enrollment",
        programInstance: "Program Instance", // optional; not present in current schema snapshot
    },

    enrollments: {
        athlete: "Athlete",
        active: "Active?",
        programInstance: "Program Instance",
        enrollmentKey: "Enrollment Key", // formula; read only
    },

    statuses: {
        complete: "Complete",
        skipped: "Skipped",
        error: "Error",
    },

    debug: {
        logToConsole: true,
        clearBadEnrollmentLinks: true,
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
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

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
    if (!record || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return "";
    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSingleLinkedId(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (Array.isArray(raw) && raw.length > 0 && raw[0]?.id) {
        return raw[0].id;
    }

    return "";
}

function getLinkedRecordIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.map((item) => item?.id).filter(Boolean);
}

function getBooleanish(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (raw === true) return true;
    if (raw === false) return false;
    if (raw === 1) return true;
    if (raw === 0) return false;

    const value = String(raw ?? "").trim().toLowerCase();
    return ["1", "true", "yes", "checked", "active"].includes(value);
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
        return false;
    }

    await submissionsTable.updateRecordAsync(targetRecordId, safeUpdates);
    return true;
}

async function clearSubmissionEnrollmentIfNeeded(submissionRecord) {
    if (!CONFIG.debug.clearBadEnrollmentLinks) {
        return false;
    }

    if (!fieldExists(submissionsTable, CONFIG.submissions.enrollment)) {
        return false;
    }

    if (!isWritableField(submissionsTable, CONFIG.submissions.enrollment)) {
        return false;
    }

    const existingEnrollmentLinks = getLinkedRecordIds(
        submissionRecord,
        submissionsTable,
        CONFIG.submissions.enrollment
    );

    if (existingEnrollmentLinks.length === 0) {
        return false;
    }

    await updateSubmissionSafe(recordId, {
        [CONFIG.submissions.enrollment]: [],
    });

    return true;
}

function buildEnrollmentFieldsToLoad() {
    return [
        CONFIG.enrollments.athlete,
        CONFIG.enrollments.active,
        CONFIG.enrollments.programInstance,
        CONFIG.enrollments.enrollmentKey,
    ].filter((fieldName) => fieldExists(enrollmentsTable, fieldName));
}

function buildCandidateFromEnrollment(record) {
    const enrollmentAthleteId = getSingleLinkedId(
        record,
        enrollmentsTable,
        CONFIG.enrollments.athlete
    );

    const enrollmentProgramInstanceId = fieldExists(
        enrollmentsTable,
        CONFIG.enrollments.programInstance
    )
        ? getSingleLinkedId(record, enrollmentsTable, CONFIG.enrollments.programInstance)
        : "";

    const enrollmentKey = fieldExists(enrollmentsTable, CONFIG.enrollments.enrollmentKey)
        ? getText(record, enrollmentsTable, CONFIG.enrollments.enrollmentKey)
        : "";

    const isActive = fieldExists(enrollmentsTable, CONFIG.enrollments.active)
        ? getBooleanish(record, enrollmentsTable, CONFIG.enrollments.active)
        : true;

    return {
        id: record.id,
        enrollmentKey,
        athleteId: enrollmentAthleteId,
        programInstanceId: enrollmentProgramInstanceId,
        isActive,
    };
}

/* =========================================================
   SECTION 5: MAIN
   ========================================================= */

async function main() {
    let debugStep = "Start";
    let submission = null;
    let athleteId = "";
    let existingEnrollmentId = "";
    let submissionProgramInstanceId = "";
    let matchedEnrollmentId = "";
    let matchedEnrollmentKey = "";
    let candidateCount = 0;
    let matchMode = "not-started";

    setOutputSafe("debugStep", debugStep);

    try {
        debugStep = "1 - Validate recordId";
        setOutputSafe("debugStep", debugStep);

        if (!recordId.startsWith("rec")) {
            throw new Error(`Invalid Submission recordId input: ${recordId}`);
        }

        debugStep = "2 - Load Submission";
        setOutputSafe("debugStep", debugStep);

        submission = await submissionsTable.selectRecordAsync(recordId);

        if (!submission) {
            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("athleteIdOut", "");
            setOutputSafe("submissionProgramInstanceIdOut", "");
            setOutputSafe("matchedEnrollmentId", "");
            setOutputSafe("matchedEnrollmentKey", "");
            setOutputSafe("candidateCountOut", 0);
            setOutputSafe("matchModeOut", "");
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", `Submission not found: ${recordId}`);
            setOutputSafe("debugStep", "Skipped: Submission not found");
            return;
        }

        debugStep = "3 - Read Submission Values";
        setOutputSafe("debugStep", debugStep);

        athleteId = getSingleLinkedId(
            submission,
            submissionsTable,
            CONFIG.submissions.athlete
        );

        existingEnrollmentId = getSingleLinkedId(
            submission,
            submissionsTable,
            CONFIG.submissions.enrollment
        );

        submissionProgramInstanceId = fieldExists(
            submissionsTable,
            CONFIG.submissions.programInstance
        )
            ? getSingleLinkedId(
                  submission,
                  submissionsTable,
                  CONFIG.submissions.programInstance
              )
            : "";

        log("Submission input", {
            recordId,
            athleteId,
            existingEnrollmentId,
            submissionProgramInstanceId,
            hasSubmissionProgramInstanceField: fieldExists(
                submissionsTable,
                CONFIG.submissions.programInstance
            ),
        });

        debugStep = "4 - Validate Athlete";
        setOutputSafe("debugStep", debugStep);

        if (!athleteId) {
            await clearSubmissionEnrollmentIfNeeded(submission);

            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("athleteIdOut", "");
            setOutputSafe("submissionProgramInstanceIdOut", submissionProgramInstanceId);
            setOutputSafe("matchedEnrollmentId", "");
            setOutputSafe("matchedEnrollmentKey", "");
            setOutputSafe("candidateCountOut", 0);
            setOutputSafe("matchModeOut", "no-athlete");
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", "Submission is missing Athlete.");
            setOutputSafe("debugStep", "Skipped: Submission missing Athlete");
            return;
        }

        debugStep = "5 - Load Enrollments";
        setOutputSafe("debugStep", debugStep);

        const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
            fields: buildEnrollmentFieldsToLoad(),
        });

        debugStep = "6 - Find Active Athlete Matches";
        setOutputSafe("debugStep", debugStep);

        let candidates = enrollmentQuery.records
            .map((record) => buildCandidateFromEnrollment(record))
            .filter((candidate) => {
                return candidate.athleteId === athleteId && candidate.isActive;
            });

        matchMode = "athlete-only";

        const canUseProgramInstance =
            fieldExists(submissionsTable, CONFIG.submissions.programInstance) &&
            fieldExists(enrollmentsTable, CONFIG.enrollments.programInstance) &&
            !!submissionProgramInstanceId;

        if (canUseProgramInstance) {
            const narrowed = candidates.filter((candidate) => {
                return candidate.programInstanceId === submissionProgramInstanceId;
            });

            if (narrowed.length > 0) {
                candidates = narrowed;
                matchMode = "athlete-plus-program-instance";
            } else {
                matchMode = "athlete-only-program-instance-no-match";
            }
        }

        candidateCount = candidates.length;

        log("Enrollment match candidates", {
            candidateCount,
            matchMode,
            candidates,
        });

        debugStep = "7 - Resolve Candidate Count";
        setOutputSafe("debugStep", debugStep);

        if (candidates.length === 0) {
            await clearSubmissionEnrollmentIfNeeded(submission);

            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("athleteIdOut", athleteId);
            setOutputSafe("submissionProgramInstanceIdOut", submissionProgramInstanceId);
            setOutputSafe("matchedEnrollmentId", "");
            setOutputSafe("matchedEnrollmentKey", "");
            setOutputSafe("candidateCountOut", 0);
            setOutputSafe("matchModeOut", matchMode);
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", "No matching active Enrollment found for this Submission.");
            setOutputSafe("debugStep", "Skipped: No matching Enrollment");
            return;
        }

        if (candidates.length > 1) {
            await clearSubmissionEnrollmentIfNeeded(submission);

            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("athleteIdOut", athleteId);
            setOutputSafe("submissionProgramInstanceIdOut", submissionProgramInstanceId);
            setOutputSafe("matchedEnrollmentId", "");
            setOutputSafe("matchedEnrollmentKey", "");
            setOutputSafe("candidateCountOut", candidates.length);
            setOutputSafe("matchModeOut", matchMode);
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe(
                "errorOut",
                `Multiple matching active Enrollments found (${candidates.length}). Submission was not updated.`
            );
            setOutputSafe("debugStep", "Skipped: Multiple matching Enrollments");
            return;
        }

        const chosen = candidates[0];
        matchedEnrollmentId = chosen.id;
        matchedEnrollmentKey = chosen.enrollmentKey;

        debugStep = "8 - Write Enrollment Link";
        setOutputSafe("debugStep", debugStep);

        const shouldWrite =
            !existingEnrollmentId || existingEnrollmentId !== matchedEnrollmentId;

        if (shouldWrite) {
            await updateSubmissionSafe(recordId, {
                [CONFIG.submissions.enrollment]: [{ id: matchedEnrollmentId }],
            });
        }

        debugStep = "9 - Outputs";
        setOutputSafe("debugStep", debugStep);

        setOutputSafe("ok", true);
        setOutputSafe("recordId", recordId);
        setOutputSafe("athleteIdOut", athleteId);
        setOutputSafe("submissionProgramInstanceIdOut", submissionProgramInstanceId);
        setOutputSafe("matchedEnrollmentId", matchedEnrollmentId);
        setOutputSafe("matchedEnrollmentKey", matchedEnrollmentKey);
        setOutputSafe("candidateCountOut", 1);
        setOutputSafe("matchModeOut", matchMode);
        setOutputSafe("statusOut", CONFIG.statuses.complete);
        setOutputSafe("errorOut", "");

        log("Submission Enrollment assignment completed", {
            recordId,
            athleteId,
            matchedEnrollmentId,
            matchedEnrollmentKey,
            matchMode,
            wroteUpdate: shouldWrite,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        setOutputSafe("ok", false);
        setOutputSafe("recordId", recordId);
        setOutputSafe("athleteIdOut", athleteId);
        setOutputSafe("submissionProgramInstanceIdOut", submissionProgramInstanceId);
        setOutputSafe("matchedEnrollmentId", matchedEnrollmentId);
        setOutputSafe("matchedEnrollmentKey", matchedEnrollmentKey);
        setOutputSafe("candidateCountOut", candidateCount);
        setOutputSafe("matchModeOut", matchMode);
        setOutputSafe("statusOut", CONFIG.statuses.error);
        setOutputSafe("errorOut", message);
        setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);

        log("Submission Enrollment assignment failed", {
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

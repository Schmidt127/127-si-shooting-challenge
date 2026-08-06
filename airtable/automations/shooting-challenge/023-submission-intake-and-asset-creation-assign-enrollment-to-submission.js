/*
Automation: 023 - Submission Intake and Asset Creation - Assign Enrollment to Submission
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: 2026-06-20

Purpose:
Assigns the correct Enrollment to a Submission with Program Instance isolation.

Trigger:
To be confirmed from Airtable automation.

Important Tables:
Submissions, Enrollments

Important Fields:
Athlete, Enrollment, Program Instance, Active?, Enrollment Key, School Year

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/

/************************************************************
 * AUTOMATION NAME
 * 023 - Submission Intake and Asset Creation - Assign Enrollment to Submission
 *
 * Version: v3.0
 * Date Written: 2026-05-20
 * Last Updated: 2026-08-06
 * Updated Reason: Program Instance isolation — never select Enrollment by Athlete
 *   alone when multiple Program Instances / active Enrollments are possible.
 *
 * PURPOSE
 * - Reads one Submission record.
 * - Resolves exactly one Enrollment using a strict priority order.
 * - Writes the matching Enrollment link back to the Submission.
 * - Never guesses between multiple Enrollments.
 *
 * MATCHING ORDER (preferred → last resort)
 * 1. Existing valid Submission.Enrollment (Athlete match + Active? + has Program Instance)
 * 2. Submission.Program Instance + Athlete (when Submission PI field exists and is set)
 * 3. Submission Program/Year key (School Year) + Athlete (when year field exists and is set)
 * 4. Fillout-supplied Enrollment record ID (optional text/link field when present)
 * 5. Explicit safe fallback ONLY when exactly one valid active candidate exists for Athlete
 *
 * IMPORTANT DESIGN RULES — PROGRAM INSTANCE ISOLATION
 * - Athlete-only matching is NOT the normal production selector when multiple
 *   Program Instances / Enrollments exist.
 * - Do not rely only on deactivating prior Enrollments.
 * - Ambiguous matches → skip with diagnostics (do not pick).
 * - Prefer durable record IDs over names/emails.
 *
 * FILLOUT MAPPING IMPROVEMENT (recommended)
 * - Daily submission Fillout should map Program Instance and/or Enrollment RID
 *   when known (hidden field → Submissions.Program Instance or Fillout Enrollment Id).
 * - Repo contracts currently mark submission Fillout enrollmentLookup as
 *   UNKNOWN_UI_ATTESTATION — Mike should confirm live mapping (F-ATT-04).
 * - Schema snapshot (2026-07-23): Submissions has Enrollment + Athlete but NO
 *   native Program Instance field. PI is resolved via Enrollment when linked,
 *   or via optional Submission fields if added later (fieldExists-guarded).
 *
 * CURRENT SCHEMA NOTES
 * - Submissions.Athlete is a writable linked-record field.
 * - Submissions.Enrollment is a writable linked-record field.
 * - Submissions.Program Instance may be absent; treated as optional via fieldExists.
 * - Enrollments.Athlete / Active? / Program Instance / Enrollment Key / School Year.
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId: Airtable record ID from Submissions
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Athlete is not empty.
 * - Enrollment is empty OR Needs Enrollment Assignment.
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
 *
 * SCRIPT
 * - scriptName: 023 - Submission Intake — Assign Enrollment
 * - version: v3.0
 * - versionDate: 2026-08-06
 * - originalWrittenDate: 2026-05-20
 * - lastUpdated: 2026-08-06
 * - folder: 02 - Submission Intake and Asset Creation
 * - automationName: 023 - Submission Intake and Asset Creation - Assign Enrollment to Submission
 ************************************************************/

/// <reference path="../../Welcome Email/airtable-automation-script.d.ts" />
// @ts-nocheck

/* =========================================================
   SECTION 1: CONFIG
   ========================================================= */

const SCRIPT = {
    scriptName: "023 - Submission Intake — Assign Enrollment",
    version: "v3.0",
    versionDate: "2026-08-06",
    originalWrittenDate: "2026-05-20",
    lastUpdated: "2026-08-06",
    folder: "02 - Submission Intake and Asset Creation",
    automationName:
        "023 - Submission Intake and Asset Creation - Assign Enrollment to Submission",
};

const CONFIG = {
    tables: {
        submissions: "Submissions",
        enrollments: "Enrollments",
    },

    submissions: {
        athlete: "Athlete",
        enrollment: "Enrollment",
        // Optional — may be absent on current PROD schema; fieldExists-guarded.
        programInstance: "Program Instance",
        schoolYear: "School Year",
        // Optional Fillout-supplied Enrollment RID (text or link); fieldExists-guarded.
        filloutEnrollmentId: "Fillout Enrollment Id",
        filloutEnrollmentIdAlt: "Enrollment Record ID",
    },

    enrollments: {
        athlete: "Athlete",
        active: "Active?",
        programInstance: "Program Instance",
        enrollmentKey: "Enrollment Key", // formula; read only
        schoolYear: "School Year",
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

function getLinkedRecordIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.map((item) => item?.id).filter(Boolean);
}

function getSingleLinkedId(record, table, fieldName) {
    return getLinkedRecordIds(record, table, fieldName)[0] || "";
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

function normalizeYearKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/–/g, "-");
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
        CONFIG.enrollments.schoolYear,
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

    const schoolYear = fieldExists(enrollmentsTable, CONFIG.enrollments.schoolYear)
        ? getText(record, enrollmentsTable, CONFIG.enrollments.schoolYear)
        : "";

    const isActive = fieldExists(enrollmentsTable, CONFIG.enrollments.active)
        ? getBooleanish(record, enrollmentsTable, CONFIG.enrollments.active)
        : true;

    return {
        id: record.id,
        enrollmentKey,
        athleteId: enrollmentAthleteId,
        programInstanceId: enrollmentProgramInstanceId,
        schoolYear,
        isActive,
    };
}

function readFilloutEnrollmentId(submissionRecord) {
    const candidates = [
        CONFIG.submissions.filloutEnrollmentId,
        CONFIG.submissions.filloutEnrollmentIdAlt,
    ];

    for (const fieldName of candidates) {
        if (!fieldExists(submissionsTable, fieldName)) continue;

        const linked = getSingleLinkedId(submissionRecord, submissionsTable, fieldName);
        if (linked && linked.startsWith("rec")) return linked;

        const text = getText(submissionRecord, submissionsTable, fieldName);
        if (text && text.startsWith("rec")) return text;
    }

    return "";
}

function emitSkipOutputs({
    athleteId,
    submissionProgramInstanceId,
    matchMode,
    candidateCount,
    errorOut,
    debugLabel,
}) {
    setOutputSafe("ok", false);
    setOutputSafe("recordId", recordId);
    setOutputSafe("athleteIdOut", athleteId || "");
    setOutputSafe("submissionProgramInstanceIdOut", submissionProgramInstanceId || "");
    setOutputSafe("matchedEnrollmentId", "");
    setOutputSafe("matchedEnrollmentKey", "");
    setOutputSafe("candidateCountOut", candidateCount || 0);
    setOutputSafe("matchModeOut", matchMode || "");
    setOutputSafe("statusOut", CONFIG.statuses.skipped);
    setOutputSafe("errorOut", errorOut || "");
    setOutputSafe("debugStep", debugLabel || "Skipped");
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
    let submissionSchoolYear = "";
    let filloutEnrollmentId = "";
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
            emitSkipOutputs({
                athleteId: "",
                submissionProgramInstanceId: "",
                matchMode: "",
                candidateCount: 0,
                errorOut: `Submission not found: ${recordId}`,
                debugLabel: "Skipped: Submission not found",
            });
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

        submissionSchoolYear = fieldExists(submissionsTable, CONFIG.submissions.schoolYear)
            ? getText(submission, submissionsTable, CONFIG.submissions.schoolYear)
            : "";

        filloutEnrollmentId = readFilloutEnrollmentId(submission);

        log("Submission input", {
            recordId,
            athleteId,
            existingEnrollmentId,
            submissionProgramInstanceId,
            submissionSchoolYear,
            filloutEnrollmentId,
            hasSubmissionProgramInstanceField: fieldExists(
                submissionsTable,
                CONFIG.submissions.programInstance
            ),
            scriptVersion: SCRIPT.version,
        });

        debugStep = "4 - Validate Athlete";
        setOutputSafe("debugStep", debugStep);

        if (!athleteId) {
            await clearSubmissionEnrollmentIfNeeded(submission);
            emitSkipOutputs({
                athleteId: "",
                submissionProgramInstanceId,
                matchMode: "no-athlete",
                candidateCount: 0,
                errorOut: "Submission is missing Athlete.",
                debugLabel: "Skipped: Submission missing Athlete",
            });
            return;
        }

        debugStep = "5 - Load Enrollments";
        setOutputSafe("debugStep", debugStep);

        const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
            fields: buildEnrollmentFieldsToLoad(),
        });

        const allCandidates = enrollmentQuery.records.map((record) =>
            buildCandidateFromEnrollment(record)
        );

        const byId = new Map(allCandidates.map((c) => [c.id, c]));

        const activeForAthlete = allCandidates.filter((candidate) => {
            return candidate.athleteId === athleteId && candidate.isActive;
        });

        debugStep = "6 - Resolve Enrollment (priority order)";
        setOutputSafe("debugStep", debugStep);

        let chosen = null;

        // 1) Existing valid Submission.Enrollment
        if (existingEnrollmentId) {
            const existing = byId.get(existingEnrollmentId);
            if (
                existing &&
                existing.athleteId === athleteId &&
                existing.isActive &&
                existing.programInstanceId
            ) {
                chosen = existing;
                matchMode = "existing-valid-enrollment";
                candidateCount = 1;
            } else {
                log("Existing Enrollment rejected", {
                    existingEnrollmentId,
                    existing: existing || null,
                    reason: !existing
                        ? "not-found"
                        : existing.athleteId !== athleteId
                          ? "athlete-mismatch"
                          : !existing.isActive
                            ? "inactive"
                            : "missing-program-instance",
                });
            }
        }

        // 2) Submission.Program Instance + Athlete
        if (!chosen && submissionProgramInstanceId) {
            const narrowed = activeForAthlete.filter((candidate) => {
                return candidate.programInstanceId === submissionProgramInstanceId;
            });
            candidateCount = narrowed.length;
            if (narrowed.length === 1) {
                chosen = narrowed[0];
                matchMode = "athlete-plus-program-instance";
            } else if (narrowed.length > 1) {
                matchMode = "ambiguous-athlete-plus-program-instance";
                await clearSubmissionEnrollmentIfNeeded(submission);
                emitSkipOutputs({
                    athleteId,
                    submissionProgramInstanceId,
                    matchMode,
                    candidateCount,
                    errorOut:
                        `Multiple active Enrollments for Athlete ${athleteId} ` +
                        `and Program Instance ${submissionProgramInstanceId} ` +
                        `(${narrowed.length}): ${narrowed.map((c) => c.id).join(", ")}. ` +
                        `Submission was not updated.`,
                    debugLabel: "Skipped: Ambiguous Program Instance match",
                });
                return;
            } else {
                matchMode = "no-match-athlete-plus-program-instance";
                await clearSubmissionEnrollmentIfNeeded(submission);
                emitSkipOutputs({
                    athleteId,
                    submissionProgramInstanceId,
                    matchMode,
                    candidateCount: 0,
                    errorOut:
                        `No active Enrollment for Athlete ${athleteId} ` +
                        `and Program Instance ${submissionProgramInstanceId}.`,
                    debugLabel: "Skipped: No Program Instance Enrollment",
                });
                return;
            }
        }

        // 3) Submission Program/Year key + Athlete
        if (!chosen && submissionSchoolYear) {
            const yearKey = normalizeYearKey(submissionSchoolYear);
            const narrowed = activeForAthlete.filter((candidate) => {
                return normalizeYearKey(candidate.schoolYear) === yearKey;
            });
            candidateCount = narrowed.length;
            if (narrowed.length === 1) {
                chosen = narrowed[0];
                matchMode = "athlete-plus-school-year";
            } else if (narrowed.length > 1) {
                matchMode = "ambiguous-athlete-plus-school-year";
                await clearSubmissionEnrollmentIfNeeded(submission);
                emitSkipOutputs({
                    athleteId,
                    submissionProgramInstanceId,
                    matchMode,
                    candidateCount,
                    errorOut:
                        `Multiple active Enrollments for Athlete ${athleteId} ` +
                        `and School Year ${submissionSchoolYear} (${narrowed.length}): ` +
                        `${narrowed.map((c) => c.id).join(", ")}. Submission was not updated.`,
                    debugLabel: "Skipped: Ambiguous School Year match",
                });
                return;
            }
        }

        // 4) Fillout-supplied Enrollment record ID
        if (!chosen && filloutEnrollmentId) {
            const filloutCandidate = byId.get(filloutEnrollmentId);
            if (
                filloutCandidate &&
                filloutCandidate.athleteId === athleteId &&
                filloutCandidate.isActive &&
                filloutCandidate.programInstanceId
            ) {
                chosen = filloutCandidate;
                matchMode = "fillout-enrollment-id";
                candidateCount = 1;
            } else {
                log("Fillout Enrollment Id rejected", {
                    filloutEnrollmentId,
                    filloutCandidate: filloutCandidate || null,
                });
                matchMode = "fillout-enrollment-id-invalid";
                await clearSubmissionEnrollmentIfNeeded(submission);
                emitSkipOutputs({
                    athleteId,
                    submissionProgramInstanceId,
                    matchMode,
                    candidateCount: 0,
                    errorOut:
                        `Fillout Enrollment Id ${filloutEnrollmentId} is invalid for Athlete ` +
                        `${athleteId} (missing, inactive, athlete mismatch, or no Program Instance).`,
                    debugLabel: "Skipped: Invalid Fillout Enrollment Id",
                });
                return;
            }
        }

        // 5) Safe fallback — exactly one valid active Enrollment for Athlete
        if (!chosen) {
            const valid = activeForAthlete.filter((c) => !!c.programInstanceId);
            candidateCount = valid.length;
            if (valid.length === 1) {
                chosen = valid[0];
                matchMode = "single-active-enrollment-safe-fallback";
            } else if (valid.length === 0) {
                matchMode = "no-active-enrollment-with-program-instance";
                await clearSubmissionEnrollmentIfNeeded(submission);
                emitSkipOutputs({
                    athleteId,
                    submissionProgramInstanceId,
                    matchMode,
                    candidateCount: 0,
                    errorOut:
                        `No matching active Enrollment with Program Instance for Athlete ${athleteId}. ` +
                        `Active-without-PI count=${activeForAthlete.length}.`,
                    debugLabel: "Skipped: No matching Enrollment",
                });
                return;
            } else {
                matchMode = "ambiguous-multiple-active-enrollments";
                await clearSubmissionEnrollmentIfNeeded(submission);
                const diag = valid
                    .map(
                        (c) =>
                            `${c.id}|PI=${c.programInstanceId}|key=${c.enrollmentKey || "?"}|year=${c.schoolYear || "?"}`
                    )
                    .join("; ");
                emitSkipOutputs({
                    athleteId,
                    submissionProgramInstanceId,
                    matchMode,
                    candidateCount,
                    errorOut:
                        `Multiple active Enrollments for Athlete ${athleteId} (${valid.length}). ` +
                        `Cannot safely choose without Program Instance / School Year / Fillout Enrollment Id. ` +
                        `Candidates: ${diag}`,
                    debugLabel: "Skipped: Multiple matching Enrollments",
                });
                return;
            }
        }

        matchedEnrollmentId = chosen.id;
        matchedEnrollmentKey = chosen.enrollmentKey;
        candidateCount = 1;

        debugStep = "7 - Write Enrollment Link";
        setOutputSafe("debugStep", debugStep);

        const shouldWrite =
            !existingEnrollmentId || existingEnrollmentId !== matchedEnrollmentId;

        if (shouldWrite) {
            await updateSubmissionSafe(recordId, {
                [CONFIG.submissions.enrollment]: [{ id: matchedEnrollmentId }],
            });
        }

        debugStep = "8 - Outputs";
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
            automation: SCRIPT.scriptName,
            version: SCRIPT.version,
            recordId,
            athleteId,
            matchedEnrollmentId,
            matchedEnrollmentKey,
            matchMode,
            programInstanceId: chosen.programInstanceId,
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
            automation: SCRIPT.scriptName,
            version: SCRIPT.version,
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

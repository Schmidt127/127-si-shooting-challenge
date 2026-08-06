/*
Automation: 005 - Submission Intake and Asset Creation - Assign Week to Submission - Homework First
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: 2026-08-06

Purpose:
Assign Submissions.Week using Homework Name 1/2 first, then Activity Date fallback scoped to the Submission Enrollment's Program Instance.

Trigger:
Submissions — Week empty or Needs Week Assignment?; Activity Date and/or Homework Name 1/2 present.

Important Tables:
Submissions, Enrollments, FBC Curriculum - SYNC, Weeks

Important Fields:
Submissions.Enrollment, Submissions.Week, Submissions.Activity Date, Submissions.Homework Name 1/2; Enrollments.Program Instance; Weeks.Program Instance, Weeks.Start Date, Weeks.End Date, Weeks.Active Week?

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/

/************************************************************
 * AUTOMATION NAME
 * 005 - Submission Intake and Asset Creation - Assign Week to Submission - Homework First
 *
 * Version: v4.1
 * Date Written: 2026-05-20
 * Last Updated: 2026-08-06
 *
 * PURPOSE
 * - Reads one Submission record.
 * - Assigns Week primarily from the selected homework record.
 * - Uses Homework Name 1 -> FBC Curriculum - SYNC.Week first.
 * - Uses Homework Name 2 -> FBC Curriculum - SYNC.Week second.
 * - Falls back to Activity Date -> Weeks date range only if needed.
 * - Activity Date fallback scopes candidate Weeks to the Enrollment's Program Instance.
 * - Writes the resulting Week link back to Submissions.Week.
 * - Clears Submissions.Week only when no match is found and an incorrect week already exists.
 *
 * IMPORTANT DESIGN RULES
 * - Homework-first precedence is preserved (Name 1, then Name 2, then Activity Date).
 * - Activity Date fallback matches only Weeks linked to the same Program Instance as
 *   Submission.Enrollment.Program Instance (never cross-year / other-instance Weeks).
 * - Missing Enrollment or missing Enrollment.Program Instance → clear skip (no Week write).
 * - Multiple active Weeks inside the same Program Instance for one Activity Date → error.
 * - Idempotent: skip Week write when the linked Week is already correct.
 * - Do not create or modify Week records.
 * - Submissions.Week Assignment Status is formula — never write it.
 *
 * CURRENT SCHEMA NOTES
 * - Submissions.Enrollment links to Enrollments.
 * - Enrollments.Program Instance links to Program Instance - Synced.
 * - Weeks.Program Instance links to Program Instance - Synced.
 * - Submissions.Week is a writable linked-record field.
 * - Submissions.Activity Date is a writable date field and can be read safely.
 * - Submissions.Homework Name 1 links to FBC Curriculum - SYNC.
 * - Submissions.Homework Name 2 links to FBC Curriculum - SYNC.
 * - FBC Curriculum - SYNC.Week links to Weeks.
 * - Weeks.Week Name is the primary field.
 * - Weeks.Start Date and Weeks.End Date are dateTime fields using America/Denver.
 * - Weeks.Active Week? may be absent; if missing, all Weeks are treated as active.
 * - Submissions.Week Assignment Status is a formula field and must NOT be written by script.
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId: Airtable record ID from Submissions
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Week is empty OR Needs Week Assignment? = 1.
 * - Activity Date is not empty OR Homework Name 1/Homework Name 2 is not empty.
 *
 * OUTPUTS
 * - ok
 * - recordId
 * - enrollmentId
 * - programInstanceId
 * - matchedWeekId
 * - matchedWeekName
 * - sourceUsed
 * - homework1Id
 * - homework2Id
 * - activityDateKey
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
        enrollments: "Enrollments",
        homework: "FBC Curriculum - SYNC",
        weeks: "Weeks",
    },

    submissions: {
        enrollment: "Enrollment",
        week: "Week",
        activityDate: "Activity Date",
        homework1: "Homework Name 1",
        homework2: "Homework Name 2",
        weekAssignmentStatus: "Week Assignment Status", // formula; read only
    },

    enrollments: {
        programInstance: "Program Instance",
    },

    homework: {
        week: "Week",
    },

    weeks: {
        name: "Week Name",
        startDate: "Start Date",
        endDate: "End Date",
        active: "Active Week?",
        programInstance: "Program Instance",
    },

    statuses: {
        complete: "Complete",
        skipped: "Skipped",
        error: "Error",
    },

    timeZone: "America/Denver",

    debug: {
        logToConsole: true,
        clearWeekWhenNoMatch: true,
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
const homeworkTable = base.getTable(CONFIG.tables.homework);
const weeksTable = base.getTable(CONFIG.tables.weeks);

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

function getFirstLinkedRecordId(record, table, fieldName) {
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

function toDateKeyFromText(textValue) {
    const text = String(textValue || "").trim();
    if (!text) return "";

    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const localMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (localMatch) {
        const month = localMatch[1].padStart(2, "0");
        const day = localMatch[2].padStart(2, "0");
        const year = localMatch[3];
        return `${year}-${month}-${day}`;
    }

    return "";
}

function toDateKeyFromDateObject(value, timeZone = CONFIG.timeZone) {
    if (!value) return "";

    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) return "";

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(dateValue);

    const year = parts.find((part) => part.type === "year")?.value || "";
    const month = parts.find((part) => part.type === "month")?.value || "";
    const day = parts.find((part) => part.type === "day")?.value || "";

    if (!year || !month || !day) return "";

    return `${year}-${month}-${day}`;
}

function toSafeDateKey(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);
    const text = getText(record, table, fieldName);

    const fromText = toDateKeyFromText(text);
    if (fromText) return fromText;

    return toDateKeyFromDateObject(raw, CONFIG.timeZone);
}

function compareDateKeys(a, b) {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;

    return String(a).localeCompare(String(b));
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
        CONFIG.submissions.enrollment,
        CONFIG.submissions.week,
        CONFIG.submissions.activityDate,
        CONFIG.submissions.homework1,
        CONFIG.submissions.homework2,
        CONFIG.submissions.weekAssignmentStatus,
    ].filter((fieldName) => fieldExists(submissionsTable, fieldName));
}

function buildEnrollmentFieldsToLoad() {
    return [CONFIG.enrollments.programInstance].filter((fieldName) =>
        fieldExists(enrollmentsTable, fieldName)
    );
}

function buildHomeworkFieldsToLoad() {
    return [CONFIG.homework.week].filter((fieldName) =>
        fieldExists(homeworkTable, fieldName)
    );
}

function buildWeekFieldsToLoad(includeDateRange = true) {
    const fields = [CONFIG.weeks.name, CONFIG.weeks.programInstance];

    if (includeDateRange) {
        fields.push(CONFIG.weeks.startDate);
        fields.push(CONFIG.weeks.endDate);
        fields.push(CONFIG.weeks.active);
    }

    return fields.filter((fieldName) => fieldExists(weeksTable, fieldName));
}

function setBaseOutputs({
    ok,
    enrollmentId = "",
    programInstanceId = "",
    matchedWeekId = "",
    matchedWeekName = "",
    sourceUsed = "",
    homework1Id = "",
    homework2Id = "",
    activityDateKey = "",
    updatedFields = "",
    statusOut,
    errorOut = "",
    debugStep,
}) {
    setOutputSafe("ok", ok);
    setOutputSafe("recordId", recordId);
    setOutputSafe("enrollmentId", enrollmentId);
    setOutputSafe("programInstanceId", programInstanceId);
    setOutputSafe("matchedWeekId", matchedWeekId);
    setOutputSafe("matchedWeekName", matchedWeekName);
    setOutputSafe("sourceUsed", sourceUsed);
    setOutputSafe("homework1Id", homework1Id);
    setOutputSafe("homework2Id", homework2Id);
    setOutputSafe("activityDateKey", activityDateKey);
    setOutputSafe("updatedFields", updatedFields);
    setOutputSafe("statusOut", statusOut);
    setOutputSafe("errorOut", errorOut);
    setOutputSafe("debugStep", debugStep);
}

async function loadWeekName(weekId) {
    if (!weekId) return "";

    const weekRecord = await weeksTable.selectRecordAsync(weekId, {
        fields: buildWeekFieldsToLoad(false),
    });

    if (!weekRecord) return "";

    return getText(weekRecord, weeksTable, CONFIG.weeks.name);
}

async function loadHomeworkWeekFromHomeworkId(homeworkId, sourceLabel) {
    if (!homeworkId) return null;

    const homeworkRecord = await homeworkTable.selectRecordAsync(homeworkId, {
        fields: buildHomeworkFieldsToLoad(),
    });

    if (!homeworkRecord) {
        return null;
    }

    const weekId = getFirstLinkedRecordId(
        homeworkRecord,
        homeworkTable,
        CONFIG.homework.week
    );

    if (!weekId) {
        return null;
    }

    const weekName = await loadWeekName(weekId);

    return {
        id: weekId,
        weekName,
        sourceUsed: sourceLabel,
    };
}

/**
 * Activity Date fallback: only Weeks linked to submissionProgramInstanceId.
 * Pure matching helpers are mirrored in tools/testing/lib/005_week_match.js for offline tests.
 */
async function findWeekByActivityDate(activityDateKey, submissionProgramInstanceId) {
    if (!activityDateKey) return null;
    if (!submissionProgramInstanceId) {
        throw new Error(
            "Activity Date fallback requires Enrollment.Program Instance. Submission has no Program Instance."
        );
    }

    const weekQuery = await weeksTable.selectRecordsAsync({
        fields: buildWeekFieldsToLoad(true),
    });

    const mapped = weekQuery.records.map((record) => {
        const weekName = getText(record, weeksTable, CONFIG.weeks.name);
        const startKey = toSafeDateKey(record, weeksTable, CONFIG.weeks.startDate);
        const endKey = toSafeDateKey(record, weeksTable, CONFIG.weeks.endDate);
        const programInstanceId = getFirstLinkedRecordId(
            record,
            weeksTable,
            CONFIG.weeks.programInstance
        );

        const isActive = fieldExists(weeksTable, CONFIG.weeks.active)
            ? getBooleanish(record, weeksTable, CONFIG.weeks.active)
            : true;

        return {
            id: record.id,
            weekName,
            startKey,
            endKey,
            isActive,
            programInstanceId,
        };
    });

    try {
        weekQuery.unloadData();
    } catch {
        // unloadData may be unavailable in some runtimes.
    }

    const sameProgramInstance = mapped.filter(
        (item) => item.programInstanceId === submissionProgramInstanceId
    );

    const candidates = sameProgramInstance
        .filter((item) => {
            return (
                item.isActive &&
                item.startKey &&
                item.endKey &&
                compareDateKeys(activityDateKey, item.startKey) >= 0 &&
                compareDateKeys(activityDateKey, item.endKey) <= 0
            );
        })
        .sort((a, b) => {
            const startCompare = compareDateKeys(a.startKey, b.startKey);
            if (startCompare !== 0) return startCompare;

            const endCompare = compareDateKeys(a.endKey, b.endKey);
            if (endCompare !== 0) return endCompare;

            return String(a.weekName || "").localeCompare(String(b.weekName || ""));
        });

    log("Activity Date fallback candidates (Program Instance scoped)", {
        recordId,
        submissionProgramInstanceId,
        activityDateKey,
        candidateWeekIds: candidates.map((item) => item.id),
        candidateWeekNames: candidates.map((item) => item.weekName),
        candidateWeekProgramInstanceIds: candidates.map(
            (item) => item.programInstanceId
        ),
        sameProgramInstanceWeekCount: sameProgramInstance.length,
        excludedOtherProgramInstanceWeekCount:
            mapped.length - sameProgramInstance.length,
    });

    if (candidates.length === 0) {
        return null;
    }

    if (candidates.length > 1) {
        throw new Error(
            `Multiple active Weeks matched Activity Date ${activityDateKey} within Program Instance ${submissionProgramInstanceId}. Review Week date ranges for this Program Instance. Candidates: ${candidates
                .map((item) => `${item.weekName} (${item.id})`)
                .join(", ")}`
        );
    }

    return {
        id: candidates[0].id,
        weekName: candidates[0].weekName,
        sourceUsed: "Activity Date Fallback",
    };
}

/* =========================================================
   SECTION 5: MAIN
   ========================================================= */

async function main() {
    let debugStep = "Start";
    let submission = null;
    let enrollmentId = "";
    let programInstanceId = "";
    let homeworkId1 = "";
    let homeworkId2 = "";
    let activityDateKey = "";
    let matchedWeek = null;
    let sourceUsed = "";
    let updatedFields = [];

    setOutputSafe("debugStep", debugStep);

    try {
        debugStep = "1 - Validate recordId";
        setOutputSafe("debugStep", debugStep);

        if (!recordId.startsWith("rec")) {
            throw new Error(`Invalid Submission recordId input: ${recordId}`);
        }

        debugStep = "2 - Load Submission";
        setOutputSafe("debugStep", debugStep);

        submission = await submissionsTable.selectRecordAsync(recordId, {
            fields: buildSubmissionFieldsToLoad(),
        });

        if (!submission) {
            setBaseOutputs({
                ok: false,
                statusOut: CONFIG.statuses.skipped,
                errorOut: `Submission not found: ${recordId}`,
                debugStep: "Skipped: Submission not found",
            });
            return;
        }

        debugStep = "3 - Resolve Enrollment and Program Instance";
        setOutputSafe("debugStep", debugStep);

        enrollmentId = getFirstLinkedRecordId(
            submission,
            submissionsTable,
            CONFIG.submissions.enrollment
        );

        if (!enrollmentId) {
            setBaseOutputs({
                ok: false,
                statusOut: CONFIG.statuses.skipped,
                errorOut:
                    "Submission has no Enrollment. Cannot resolve Program Instance for Week assignment.",
                debugStep: "Skipped: Missing Enrollment",
            });
            log("Week assignment skipped — missing Enrollment", { recordId });
            return;
        }

        const enrollmentRecord = await enrollmentsTable.selectRecordAsync(
            enrollmentId,
            {
                fields: buildEnrollmentFieldsToLoad(),
            }
        );

        if (!enrollmentRecord) {
            setBaseOutputs({
                ok: false,
                enrollmentId,
                statusOut: CONFIG.statuses.skipped,
                errorOut: `Enrollment not found: ${enrollmentId}`,
                debugStep: "Skipped: Enrollment not found",
            });
            return;
        }

        programInstanceId = getFirstLinkedRecordId(
            enrollmentRecord,
            enrollmentsTable,
            CONFIG.enrollments.programInstance
        );

        if (!programInstanceId) {
            setBaseOutputs({
                ok: false,
                enrollmentId,
                statusOut: CONFIG.statuses.skipped,
                errorOut: `Enrollment ${enrollmentId} has no Program Instance. Cannot scope Week matching.`,
                debugStep: "Skipped: Missing Enrollment Program Instance",
            });
            log("Week assignment skipped — missing Program Instance", {
                recordId,
                enrollmentId,
            });
            return;
        }

        debugStep = "4 - Read Submission Values";
        setOutputSafe("debugStep", debugStep);

        homeworkId1 = getFirstLinkedRecordId(
            submission,
            submissionsTable,
            CONFIG.submissions.homework1
        );

        homeworkId2 = getFirstLinkedRecordId(
            submission,
            submissionsTable,
            CONFIG.submissions.homework2
        );

        activityDateKey = toSafeDateKey(
            submission,
            submissionsTable,
            CONFIG.submissions.activityDate
        );

        log("Week assignment input", {
            recordId,
            enrollmentId,
            submissionProgramInstanceId: programInstanceId,
            homeworkId1,
            homeworkId2,
            activityDateKey,
            existingWeekIds: getLinkedRecordIds(
                submission,
                submissionsTable,
                CONFIG.submissions.week
            ),
        });

        debugStep = "5 - Try Homework Name 1";
        setOutputSafe("debugStep", debugStep);

        if (homeworkId1) {
            matchedWeek = await loadHomeworkWeekFromHomeworkId(
                homeworkId1,
                "Homework Name 1"
            );
        }

        debugStep = "6 - Try Homework Name 2";
        setOutputSafe("debugStep", debugStep);

        if (!matchedWeek && homeworkId2) {
            matchedWeek = await loadHomeworkWeekFromHomeworkId(
                homeworkId2,
                "Homework Name 2"
            );
        }

        debugStep = "7 - Try Activity Date Fallback";
        setOutputSafe("debugStep", debugStep);

        if (!matchedWeek && activityDateKey) {
            matchedWeek = await findWeekByActivityDate(
                activityDateKey,
                programInstanceId
            );
        }

        debugStep = "8 - Handle No Match";
        setOutputSafe("debugStep", debugStep);

        if (!matchedWeek) {
            const existingWeekLinks = getLinkedRecordIds(
                submission,
                submissionsTable,
                CONFIG.submissions.week
            );

            const updates = {};

            if (
                CONFIG.debug.clearWeekWhenNoMatch &&
                existingWeekLinks.length > 0 &&
                fieldExists(submissionsTable, CONFIG.submissions.week) &&
                isWritableField(submissionsTable, CONFIG.submissions.week)
            ) {
                updates[CONFIG.submissions.week] = [];
            }

            updatedFields = await updateSubmissionSafe(recordId, updates);

            setBaseOutputs({
                ok: false,
                enrollmentId,
                programInstanceId,
                sourceUsed: "None",
                homework1Id: homeworkId1,
                homework2Id: homeworkId2,
                activityDateKey,
                updatedFields: updatedFields.join(", "),
                statusOut: CONFIG.statuses.complete,
                errorOut:
                    "No Week found from Homework Name 1, Homework Name 2, or Activity Date fallback within Enrollment Program Instance.",
                debugStep: "Done - No Week Match",
            });

            log("No Week match found", {
                recordId,
                enrollmentId,
                submissionProgramInstanceId: programInstanceId,
                homeworkId1,
                homeworkId2,
                activityDateKey,
                clearedExistingWeek: updatedFields.includes(CONFIG.submissions.week),
            });

            return;
        }

        sourceUsed = matchedWeek.sourceUsed || "";

        debugStep = "9 - Write Week Result";
        setOutputSafe("debugStep", debugStep);

        const existingWeekLinks = getLinkedRecordIds(
            submission,
            submissionsTable,
            CONFIG.submissions.week
        );

        const weekAlreadyCorrect =
            existingWeekLinks.length === 1 && existingWeekLinks[0] === matchedWeek.id;

        const updates = {};

        if (!weekAlreadyCorrect) {
            updates[CONFIG.submissions.week] = [{ id: matchedWeek.id }];
        }

        updatedFields = await updateSubmissionSafe(recordId, updates);

        debugStep = "10 - Outputs";
        setOutputSafe("debugStep", debugStep);

        setBaseOutputs({
            ok: true,
            enrollmentId,
            programInstanceId,
            matchedWeekId: matchedWeek.id,
            matchedWeekName: matchedWeek.weekName,
            sourceUsed,
            homework1Id: homeworkId1,
            homework2Id: homeworkId2,
            activityDateKey,
            updatedFields: updatedFields.join(", "),
            statusOut: CONFIG.statuses.complete,
            errorOut: "",
            debugStep: "Done",
        });

        log("Week assignment completed", {
            recordId,
            enrollmentId,
            submissionProgramInstanceId: programInstanceId,
            activityDateKey,
            candidateWeekIds: [matchedWeek.id],
            candidateWeekNames: [matchedWeek.weekName],
            candidateWeekProgramInstanceIds: [programInstanceId],
            finalSelectedWeekId: matchedWeek.id,
            finalSelectedWeekName: matchedWeek.weekName,
            sourceUsed,
            updatedFields,
            weekAlreadyCorrect,
        });

        console.log(
            JSON.stringify({
                automation: "005",
                version: "v4.1",
                recordId,
                enrollmentId,
                programInstanceId,
                activityDateKey,
                matchedWeekId: matchedWeek.id,
                matchedWeekName: matchedWeek.weekName,
                sourceUsed,
                weekAlreadyCorrect,
            })
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        setBaseOutputs({
            ok: false,
            enrollmentId,
            programInstanceId,
            matchedWeekId: matchedWeek?.id || "",
            matchedWeekName: matchedWeek?.weekName || "",
            sourceUsed,
            homework1Id: homeworkId1,
            homework2Id: homeworkId2,
            activityDateKey,
            updatedFields: updatedFields.join(", "),
            statusOut: CONFIG.statuses.error,
            errorOut: message,
            debugStep: `FAILED AT: ${debugStep}`,
        });

        log("Week assignment failed", {
            recordId,
            enrollmentId,
            submissionProgramInstanceId: programInstanceId,
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

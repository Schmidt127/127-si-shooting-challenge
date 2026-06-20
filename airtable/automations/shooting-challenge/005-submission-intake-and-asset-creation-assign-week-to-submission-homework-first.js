/*
Automation: 005 - Submission Intake and Asset Creation - Assign Week to Submission - Homework First
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
 * 005 - Submission Intake and Asset Creation - Assign Week to Submission - Homework First
 *
 * Version: v4.0
 * Date Written: 2026-05-20
 *
 * PURPOSE
 * - Reads one Submission record.
 * - Assigns Week primarily from the selected homework record.
 * - Uses Homework Name 1 -> FBC Curriculum - SYNC.Week first.
 * - Uses Homework Name 2 -> FBC Curriculum - SYNC.Week second.
 * - Falls back to Activity Date -> Weeks date range only if needed.
 * - Writes the resulting Week link back to Submissions.Week.
 * - Clears Submissions.Week only when no match is found and an incorrect week already exists.
 *
 * CURRENT SCHEMA NOTES
 * - Submissions.Week is a writable linked-record field.
 * - Submissions.Activity Date is a writable date field and can be read safely.
 * - Submissions.Homework Name 1 links to FBC Curriculum - SYNC.
 * - Submissions.Homework Name 2 links to FBC Curriculum - SYNC.
 * - FBC Curriculum - SYNC.Week links to Weeks.
 * - Weeks.Week Name is the primary field.
 * - Weeks.Start Date and Weeks.End Date are dateTime fields using America/Denver.
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
        homework: "FBC Curriculum - SYNC",
        weeks: "Weeks",
    },

    submissions: {
        week: "Week",
        activityDate: "Activity Date",
        homework1: "Homework Name 1",
        homework2: "Homework Name 2",
        weekAssignmentStatus: "Week Assignment Status", // formula; read only
    },

    homework: {
        week: "Week",
    },

    weeks: {
        name: "Week Name",
        startDate: "Start Date",
        endDate: "End Date",
        active: "Active Week?",
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
        CONFIG.submissions.week,
        CONFIG.submissions.activityDate,
        CONFIG.submissions.homework1,
        CONFIG.submissions.homework2,
        CONFIG.submissions.weekAssignmentStatus,
    ].filter((fieldName) => fieldExists(submissionsTable, fieldName));
}

function buildHomeworkFieldsToLoad() {
    return [CONFIG.homework.week].filter((fieldName) =>
        fieldExists(homeworkTable, fieldName)
    );
}

function buildWeekFieldsToLoad(includeDateRange = true) {
    const fields = [CONFIG.weeks.name];

    if (includeDateRange) {
        fields.push(CONFIG.weeks.startDate);
        fields.push(CONFIG.weeks.endDate);
        fields.push(CONFIG.weeks.active);
    }

    return fields.filter((fieldName) => fieldExists(weeksTable, fieldName));
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

async function findWeekByActivityDate(activityDateKey) {
    if (!activityDateKey) return null;

    const weekQuery = await weeksTable.selectRecordsAsync({
        fields: buildWeekFieldsToLoad(true),
    });

    const candidates = weekQuery.records
        .map((record) => {
            const weekName = getText(record, weeksTable, CONFIG.weeks.name);
            const startKey = toSafeDateKey(record, weeksTable, CONFIG.weeks.startDate);
            const endKey = toSafeDateKey(record, weeksTable, CONFIG.weeks.endDate);

            const isActive = fieldExists(weeksTable, CONFIG.weeks.active)
                ? getBooleanish(record, weeksTable, CONFIG.weeks.active)
                : true;

            return {
                id: record.id,
                weekName,
                startKey,
                endKey,
                isActive,
            };
        })
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

    if (candidates.length === 0) {
        return null;
    }

    if (candidates.length > 1) {
        throw new Error(
            `Multiple active Weeks matched Activity Date ${activityDateKey}. Review Week date ranges.`
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
            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("matchedWeekId", "");
            setOutputSafe("matchedWeekName", "");
            setOutputSafe("sourceUsed", "");
            setOutputSafe("homework1Id", "");
            setOutputSafe("homework2Id", "");
            setOutputSafe("activityDateKey", "");
            setOutputSafe("updatedFields", "");
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", `Submission not found: ${recordId}`);
            setOutputSafe("debugStep", "Skipped: Submission not found");
            return;
        }

        debugStep = "3 - Read Submission Values";
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
            homeworkId1,
            homeworkId2,
            activityDateKey,
            existingWeekIds: getLinkedRecordIds(
                submission,
                submissionsTable,
                CONFIG.submissions.week
            ),
        });

        debugStep = "4 - Try Homework Name 1";
        setOutputSafe("debugStep", debugStep);

        if (homeworkId1) {
            matchedWeek = await loadHomeworkWeekFromHomeworkId(
                homeworkId1,
                "Homework Name 1"
            );
        }

        debugStep = "5 - Try Homework Name 2";
        setOutputSafe("debugStep", debugStep);

        if (!matchedWeek && homeworkId2) {
            matchedWeek = await loadHomeworkWeekFromHomeworkId(
                homeworkId2,
                "Homework Name 2"
            );
        }

        debugStep = "6 - Try Activity Date Fallback";
        setOutputSafe("debugStep", debugStep);

        if (!matchedWeek && activityDateKey) {
            matchedWeek = await findWeekByActivityDate(activityDateKey);
        }

        debugStep = "7 - Handle No Match";
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

            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("matchedWeekId", "");
            setOutputSafe("matchedWeekName", "");
            setOutputSafe("sourceUsed", "None");
            setOutputSafe("homework1Id", homeworkId1);
            setOutputSafe("homework2Id", homeworkId2);
            setOutputSafe("activityDateKey", activityDateKey);
            setOutputSafe("updatedFields", updatedFields.join(", "));
            setOutputSafe("statusOut", CONFIG.statuses.complete);
            setOutputSafe(
                "errorOut",
                "No Week found from Homework Name 1, Homework Name 2, or Activity Date fallback."
            );
            setOutputSafe("debugStep", "Done - No Week Match");

            log("No Week match found", {
                recordId,
                homeworkId1,
                homeworkId2,
                activityDateKey,
                clearedExistingWeek: updatedFields.includes(CONFIG.submissions.week),
            });

            return;
        }

        sourceUsed = matchedWeek.sourceUsed || "";

        debugStep = "8 - Write Week Result";
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

        debugStep = "9 - Outputs";
        setOutputSafe("debugStep", debugStep);

        setOutputSafe("ok", true);
        setOutputSafe("recordId", recordId);
        setOutputSafe("matchedWeekId", matchedWeek.id);
        setOutputSafe("matchedWeekName", matchedWeek.weekName);
        setOutputSafe("sourceUsed", sourceUsed);
        setOutputSafe("homework1Id", homeworkId1);
        setOutputSafe("homework2Id", homeworkId2);
        setOutputSafe("activityDateKey", activityDateKey);
        setOutputSafe("updatedFields", updatedFields.join(", "));
        setOutputSafe("statusOut", CONFIG.statuses.complete);
        setOutputSafe("errorOut", "");

        log("Week assignment completed", {
            recordId,
            matchedWeekId: matchedWeek.id,
            matchedWeekName: matchedWeek.weekName,
            sourceUsed,
            updatedFields,
            weekAlreadyCorrect,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        setOutputSafe("ok", false);
        setOutputSafe("recordId", recordId);
        setOutputSafe("matchedWeekId", matchedWeek?.id || "");
        setOutputSafe("matchedWeekName", matchedWeek?.weekName || "");
        setOutputSafe("sourceUsed", sourceUsed);
        setOutputSafe("homework1Id", homeworkId1);
        setOutputSafe("homework2Id", homeworkId2);
        setOutputSafe("activityDateKey", activityDateKey);
        setOutputSafe("updatedFields", updatedFields.join(", "));
        setOutputSafe("statusOut", CONFIG.statuses.error);
        setOutputSafe("errorOut", message);
        setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);

        log("Week assignment failed", {
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

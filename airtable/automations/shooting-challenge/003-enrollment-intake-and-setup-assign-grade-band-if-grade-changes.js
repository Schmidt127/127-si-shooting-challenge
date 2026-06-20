/*
Automation: 003 - Enrollment Intake and Setup - Assign Grade Band - If Grade Changes
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
 * 003 - Enrollment Intake and Setup - Assign Grade Band - If Grade Changes
 *
 * Version: v2.0
 * Date Written: 2026-05-20
 *
 * PURPOSE
 * - Reads one Enrollment record.
 * - Checks whether Grade Band should be refreshed after a Grade change.
 * - Uses the formula field Grade Band Refresh Needed as the main refresh flag.
 * - Matches the correct Grade Band by Min Grade / Max Grade range.
 * - Updates the Enrollment Grade Band link.
 * - Updates Grade Band (Auto Assign).
 * - Updates Last Grade Used for Grade Band.
 * - Updates Grade Band Status.
 * - Updates Grade Band Assignment Status.
 *
 * CURRENT SCHEMA NOTES
 * - Grade Band is a writable linked-record field.
 * - Grade Band (Auto Assign) is writable single-line text.
 * - Grade Band Assignment Status is writable single-line text.
 * - Grade Band Status is writable single select.
 * - Last Grade Used for Grade Band is writable single select.
 * - Grade Band Refresh Needed is a formula field and must NOT be written by script.
 * - Grade Band Refresh Needed? is a writable checkbox, but this script does not require it.
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId: Airtable record ID from Enrollments
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Grade is not empty.
 * - Athlete is not empty.
 * - Grade Band is not empty.
 * - Grade Band Refresh Needed = 1.
 *
 * OUTPUTS
 * - enrollmentId
 * - gradeOut
 * - gradeNumericOut
 * - oldGradeBandId
 * - gradeBandId
 * - gradeBandName
 * - refreshNeededOut
 * - statusOut
 * - errorOut
 * - debugStep
 * - errorSaveFailed
 ************************************************************/

/// <reference path="../../Welcome Email/airtable-automation-script.d.ts" />
// @ts-nocheck

/* =========================================================
   SECTION 1: CONFIG
   ========================================================= */

const CONFIG = {
    tables: {
        enrollments: "Enrollments",
        gradeBands: "Grade Bands",
    },

    enrollments: {
        grade: "Grade",
        athlete: "Athlete",
        gradeBand: "Grade Band",
        gradeBandAutoAssign: "Grade Band (Auto Assign)",
        lastGradeUsedForGradeBand: "Last Grade Used for Grade Band",
        gradeBandStatus: "Grade Band Status",
        gradeBandAssignmentStatus: "Grade Band Assignment Status",
        gradeBandRefreshNeededFormula: "Grade Band Refresh Needed",
        gradeBandRefreshNeededCheckbox: "Grade Band Refresh Needed?",
    },

    gradeBands: {
        name: "Grade Band Name",
        minGrade: "Min Grade",
        maxGrade: "Max Grade",
        sortOrder: "Sort Order",
        active: "Active?",
    },

    statuses: {
        processing: "Processing",
        assigned: "Assigned",
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

const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const gradeBandsTable = base.getTable(CONFIG.tables.gradeBands);

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
    if (!record || !table || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !table || !fieldExists(table, fieldName)) return "";
    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (raw === null || raw === undefined || raw === "") {
        return null;
    }

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

function getFirstLinkedRecordId(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (Array.isArray(raw) && raw.length > 0 && raw[0]?.id) {
        return raw[0].id;
    }

    return "";
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

function normalizeGradeToNumber(gradeText) {
    const value = String(gradeText || "").trim().replace(/\s+/g, " ");

    if (!value) return null;

    const lower = value.toLowerCase();

    if (
        lower === "pre k" ||
        lower === "pre-k" ||
        lower === "prek" ||
        lower === "pk" ||
        lower === "preschool"
    ) {
        return -1;
    }

    if (
        lower === "k" ||
        lower === "kindergarten" ||
        lower === "kindergarden"
    ) {
        return 0;
    }

    const ordinal = value.match(/^(\d+)(?:st|nd|rd|th)?$/i);
    if (ordinal) {
        const n = Number(ordinal[1]);
        return Number.isFinite(n) ? n : null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function buildCellValueForField(table, fieldName, value) {
    const field = getFieldSafe(table, fieldName);
    if (!field) return value;

    if (field.type === "singleSelect") {
        return { name: String(value || "").trim() };
    }

    return value;
}

async function updateRecordSafe(table, recordIdToUpdate, updates) {
    const safeUpdates = {};

    for (const [fieldName, value] of Object.entries(updates || {})) {
        if (!fieldExists(table, fieldName)) {
            log(`Skipped missing field: ${fieldName}`);
            continue;
        }

        if (!isWritableField(table, fieldName)) {
            log(`Skipped non-writable field: ${fieldName}`);
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

    await table.updateRecordAsync(recordIdToUpdate, safeUpdates);
    return true;
}

async function setGradeBandStatuses(targetRecordId, statusText) {
    const updates = {};

    if (fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBandStatus)) {
        updates[CONFIG.enrollments.gradeBandStatus] = buildCellValueForField(
            enrollmentsTable,
            CONFIG.enrollments.gradeBandStatus,
            statusText
        );
    }

    if (fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBandAssignmentStatus)) {
        updates[CONFIG.enrollments.gradeBandAssignmentStatus] = statusText;
    }

    return await updateRecordSafe(enrollmentsTable, targetRecordId, updates);
}

function buildLastGradeUsedValue(gradeText) {
    if (!fieldExists(enrollmentsTable, CONFIG.enrollments.lastGradeUsedForGradeBand)) {
        return undefined;
    }

    return buildCellValueForField(
        enrollmentsTable,
        CONFIG.enrollments.lastGradeUsedForGradeBand,
        gradeText
    );
}

function getRefreshNeeded(enrollment) {
    if (
        fieldExists(
            enrollmentsTable,
            CONFIG.enrollments.gradeBandRefreshNeededFormula
        )
    ) {
        return getBooleanish(
            enrollment,
            enrollmentsTable,
            CONFIG.enrollments.gradeBandRefreshNeededFormula
        );
    }

    if (
        fieldExists(
            enrollmentsTable,
            CONFIG.enrollments.gradeBandRefreshNeededCheckbox
        )
    ) {
        return getBooleanish(
            enrollment,
            enrollmentsTable,
            CONFIG.enrollments.gradeBandRefreshNeededCheckbox
        );
    }

    return false;
}

function buildGradeBandFieldsToLoad() {
    return [
        CONFIG.gradeBands.name,
        CONFIG.gradeBands.minGrade,
        CONFIG.gradeBands.maxGrade,
        CONFIG.gradeBands.sortOrder,
        CONFIG.gradeBands.active,
    ].filter((fieldName) => fieldExists(gradeBandsTable, fieldName));
}

function findMatchingGradeBands(gradeBandRecords, gradeNumeric) {
    return gradeBandRecords
        .map((record) => {
            const minGrade = getNumber(record, gradeBandsTable, CONFIG.gradeBands.minGrade);
            const maxGrade = getNumber(record, gradeBandsTable, CONFIG.gradeBands.maxGrade);
            const sortOrder =
                getNumber(record, gradeBandsTable, CONFIG.gradeBands.sortOrder) ?? 999999;

            const isActive = fieldExists(gradeBandsTable, CONFIG.gradeBands.active)
                ? getBooleanish(record, gradeBandsTable, CONFIG.gradeBands.active)
                : true;

            return {
                id: record.id,
                gradeBandName: getText(record, gradeBandsTable, CONFIG.gradeBands.name),
                minGrade,
                maxGrade,
                sortOrder,
                isActive,
            };
        })
        .filter((item) => {
            return (
                item.isActive &&
                item.minGrade !== null &&
                item.maxGrade !== null &&
                gradeNumeric >= item.minGrade &&
                gradeNumeric <= item.maxGrade
            );
        })
        .sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            if (a.minGrade !== b.minGrade) return a.minGrade - b.minGrade;
            if (a.maxGrade !== b.maxGrade) return a.maxGrade - b.maxGrade;
            return String(a.gradeBandName || "").localeCompare(String(b.gradeBandName || ""));
        });
}

/* =========================================================
   SECTION 5: MAIN
   ========================================================= */

async function main() {
    let debugStep = "Start";
    let gradeValue = "";
    let gradeNumeric = null;
    let oldGradeBandId = "";
    let refreshNeeded = false;

    setOutputSafe("debugStep", debugStep);

    try {
        debugStep = "1 - Validate recordId";
        setOutputSafe("debugStep", debugStep);

        if (!recordId.startsWith("rec")) {
            throw new Error(`Invalid Enrollment recordId input: ${recordId}`);
        }

        debugStep = "2 - Load Enrollment";
        setOutputSafe("debugStep", debugStep);

        const enrollment = await enrollmentsTable.selectRecordAsync(recordId);

        if (!enrollment) {
            setOutputSafe("enrollmentId", recordId);
            setOutputSafe("gradeOut", "");
            setOutputSafe("gradeNumericOut", "");
            setOutputSafe("oldGradeBandId", "");
            setOutputSafe("gradeBandId", "");
            setOutputSafe("gradeBandName", "");
            setOutputSafe("refreshNeededOut", false);
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", `Enrollment record not found: ${recordId}`);
            setOutputSafe("debugStep", "Skipped: Enrollment not found");
            return;
        }

        debugStep = "3 - Read Enrollment Fields";
        setOutputSafe("debugStep", debugStep);

        gradeValue = getText(enrollment, enrollmentsTable, CONFIG.enrollments.grade);
        gradeNumeric = normalizeGradeToNumber(gradeValue);

        const athleteId = getFirstLinkedRecordId(
            enrollment,
            enrollmentsTable,
            CONFIG.enrollments.athlete
        );

        oldGradeBandId = getFirstLinkedRecordId(
            enrollment,
            enrollmentsTable,
            CONFIG.enrollments.gradeBand
        );

        refreshNeeded = getRefreshNeeded(enrollment);

        log("Grade Band refresh input", {
            enrollmentId: recordId,
            gradeValue,
            gradeNumeric,
            athleteId,
            oldGradeBandId,
            refreshNeeded,
        });

        debugStep = "4 - Validate Basic Requirements";
        setOutputSafe("debugStep", debugStep);

        if (!gradeValue) {
            await setGradeBandStatuses(recordId, CONFIG.statuses.skipped);

            setOutputSafe("enrollmentId", recordId);
            setOutputSafe("gradeOut", "");
            setOutputSafe("gradeNumericOut", "");
            setOutputSafe("oldGradeBandId", oldGradeBandId);
            setOutputSafe("gradeBandId", "");
            setOutputSafe("gradeBandName", "");
            setOutputSafe("refreshNeededOut", refreshNeeded);
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", "Skipped because Grade is blank.");
            setOutputSafe("debugStep", "Skipped: Grade blank");
            return;
        }

        if (gradeNumeric === null) {
            throw new Error(
                `Cannot refresh Grade Band because Grade "${gradeValue}" could not be converted to a numeric value.`
            );
        }

        if (!athleteId) {
            throw new Error("Cannot refresh Grade Band because Athlete is not linked.");
        }

        if (!oldGradeBandId) {
            await setGradeBandStatuses(recordId, CONFIG.statuses.skipped);

            setOutputSafe("enrollmentId", recordId);
            setOutputSafe("gradeOut", gradeValue);
            setOutputSafe("gradeNumericOut", gradeNumeric);
            setOutputSafe("oldGradeBandId", "");
            setOutputSafe("gradeBandId", "");
            setOutputSafe("gradeBandName", "");
            setOutputSafe("refreshNeededOut", refreshNeeded);
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe(
                "errorOut",
                "Skipped because Grade Band is blank. Run the initial Grade Band assignment automation instead."
            );
            setOutputSafe("debugStep", "Skipped: Grade Band blank");
            return;
        }

        if (!refreshNeeded) {
            await setGradeBandStatuses(recordId, CONFIG.statuses.assigned);

            setOutputSafe("enrollmentId", recordId);
            setOutputSafe("gradeOut", gradeValue);
            setOutputSafe("gradeNumericOut", gradeNumeric);
            setOutputSafe("oldGradeBandId", oldGradeBandId);
            setOutputSafe("gradeBandId", oldGradeBandId);
            setOutputSafe("gradeBandName", "No refresh needed");
            setOutputSafe("refreshNeededOut", false);
            setOutputSafe("statusOut", CONFIG.statuses.assigned);
            setOutputSafe("errorOut", "");
            setOutputSafe("debugStep", "Done - no refresh needed");
            return;
        }

        debugStep = "5 - Set Processing Status";
        setOutputSafe("debugStep", debugStep);

        await setGradeBandStatuses(recordId, CONFIG.statuses.processing);

        debugStep = "6 - Load Grade Bands";
        setOutputSafe("debugStep", debugStep);

        const gradeBandQuery = await gradeBandsTable.selectRecordsAsync({
            fields: buildGradeBandFieldsToLoad(),
        });

        debugStep = "7 - Find Matching Grade Band";
        setOutputSafe("debugStep", debugStep);

        const candidates = findMatchingGradeBands(gradeBandQuery.records, gradeNumeric);

        if (candidates.length === 0) {
            throw new Error(
                `No active Grade Band match found for Grade "${gradeValue}" (numeric ${gradeNumeric}).`
            );
        }

        if (candidates.length > 1) {
            throw new Error(
                `Multiple active Grade Bands matched Grade "${gradeValue}" (numeric ${gradeNumeric}). Review Grade Band ranges.`
            );
        }

        const chosen = candidates[0];

        debugStep = "8 - Write Refreshed Grade Band";
        setOutputSafe("debugStep", debugStep);

        const updates = {};

        updates[CONFIG.enrollments.gradeBand] = [{ id: chosen.id }];

        if (fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBandAutoAssign)) {
            updates[CONFIG.enrollments.gradeBandAutoAssign] = chosen.gradeBandName;
        }

        if (fieldExists(enrollmentsTable, CONFIG.enrollments.lastGradeUsedForGradeBand)) {
            updates[CONFIG.enrollments.lastGradeUsedForGradeBand] =
                buildLastGradeUsedValue(gradeValue);
        }

        await updateRecordSafe(enrollmentsTable, recordId, updates);

        debugStep = "9 - Set Assigned Status";
        setOutputSafe("debugStep", debugStep);

        await setGradeBandStatuses(recordId, CONFIG.statuses.assigned);

        debugStep = "10 - Outputs";
        setOutputSafe("debugStep", debugStep);

        setOutputSafe("enrollmentId", recordId);
        setOutputSafe("gradeOut", gradeValue);
        setOutputSafe("gradeNumericOut", gradeNumeric);
        setOutputSafe("oldGradeBandId", oldGradeBandId);
        setOutputSafe("gradeBandId", chosen.id);
        setOutputSafe("gradeBandName", chosen.gradeBandName);
        setOutputSafe("refreshNeededOut", true);
        setOutputSafe("statusOut", CONFIG.statuses.assigned);
        setOutputSafe("errorOut", "");

        log("Grade Band refresh completed", {
            enrollmentId: recordId,
            gradeValue,
            gradeNumeric,
            oldGradeBandId,
            newGradeBandId: chosen.id,
            gradeBandName: chosen.gradeBandName,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);
        setOutputSafe("enrollmentId", recordId);
        setOutputSafe("gradeOut", gradeValue);
        setOutputSafe("gradeNumericOut", gradeNumeric ?? "");
        setOutputSafe("oldGradeBandId", oldGradeBandId);
        setOutputSafe("gradeBandId", "");
        setOutputSafe("gradeBandName", "");
        setOutputSafe("refreshNeededOut", refreshNeeded);
        setOutputSafe("statusOut", CONFIG.statuses.error);
        setOutputSafe("errorOut", message);

        try {
            const stillExists = await enrollmentsTable.selectRecordAsync(recordId);
            if (stillExists) {
                await setGradeBandStatuses(recordId, CONFIG.statuses.error);
            }
        } catch (innerError) {
            const innerMessage =
                innerError instanceof Error ? innerError.message : String(innerError || "");
            setOutputSafe("errorSaveFailed", innerMessage);
        }

        log("Grade Band refresh failed", {
            enrollmentId: recordId,
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

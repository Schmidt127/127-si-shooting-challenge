/*
Automation: 002 - Enrollment Intake and Setup - Assign Grade Band - Initial
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
 * 002 - Enrollment Intake and Setup - Assign Grade Band - Initial
 *
 * Version: v8.1
 * Date Written: 2026-05-20
 * Date Updated: 2026-06-17
 * Updated Reason: Added safe field caching, computed-field checks, best-effort status writes,
 * guarded Grade Band writes, Enrollment recheck before assignment, clearer errors, and safer optional writes.
 *
 * PURPOSE
 * - Reads one Enrollment record.
 * - Assigns the correct Grade Band when Grade Band is blank.
 * - Matches Grade Band by Min Grade / Max Grade range.
 * - Writes Grade Band link.
 * - Writes Grade Band (Auto Assign).
 * - Writes Last Grade Used for Grade Band.
 * - Updates Grade Band Status.
 * - Updates Grade Band Assignment Status.
 *
 * CURRENT SCHEMA NOTES
 * - Grade Band is a writable linked-record field.
 * - Grade Band (Auto Assign) is writable single-line text.
 * - Grade Band Status is writable single select.
 * - Grade Band Assignment Status is writable single-line text.
 * - Last Grade Used for Grade Band is writable single select.
 * - Grade Band Refresh Needed is a formula and must NOT be written by script.
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId: Airtable record ID from Enrollments
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Grade is not empty.
 * - Athlete is not empty.
 * - Grade Band is empty.
 * - Ready for Grade Band Assignment? = 1, if using that helper field.
 *
 * OUTPUTS
 * - enrollmentId
 * - gradeOut
 * - gradeNumericOut
 * - gradeBandId
 * - gradeBandName
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
        error: "Error",
        skipped: "Skipped",
    },

    debug: {
        logToConsole: true,
    },
};

/* =========================================================
   SECTION 2: RUNTIME CONTEXT
   ========================================================= */

let recordId = "";
let enrollmentsTable = null;
let gradeBandsTable = null;

/* =========================================================
   SECTION 3: FIELD CACHE
   ========================================================= */

const fieldCache = new Map();

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

function getFieldSafe(table, fieldName) {
    if (!table || !fieldName) return null;

    const tableName = table.name || "unknown-table";
    const cacheKey = `${tableName}:${fieldName}`;

    if (fieldCache.has(cacheKey)) {
        return fieldCache.get(cacheKey);
    }

    try {
        const field = table.getField(fieldName);
        fieldCache.set(cacheKey, field);
        return field;
    } catch {
        fieldCache.set(cacheKey, null);
        return null;
    }
}

function fieldExists(table, fieldName) {
    return !!getFieldSafe(table, fieldName);
}

function fieldHasType(table, fieldName, allowedTypes) {
    const field = getFieldSafe(table, fieldName);
    return !!field && allowedTypes.includes(field.type);
}

function isWritableField(table, fieldName) {
    const field = getFieldSafe(table, fieldName);
    if (!field) return false;

    if (field.isComputed === true) {
        return false;
    }

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

function singleSelectOptionExists(table, fieldName, optionName) {
    const field = getFieldSafe(table, fieldName);

    if (!field || field.type !== "singleSelect") {
        return true;
    }

    return field.options?.choices?.some((choice) => choice.name === optionName) === true;
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

    if (raw && typeof raw === "object" && raw.name) {
        const optionValue = String(raw.name || "").trim().toLowerCase();
        return ["1", "true", "yes", "checked", "active", "enabled"].includes(optionValue);
    }

    const value = String(raw ?? "").trim().toLowerCase();

    if (!value) return false;

    return ["1", "true", "yes", "checked", "active", "enabled"].includes(value);
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

function canWriteSingleSelectValue(table, fieldName, value) {
    const field = getFieldSafe(table, fieldName);

    if (!field || field.type !== "singleSelect") {
        return true;
    }

    return singleSelectOptionExists(table, fieldName, String(value || "").trim());
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

async function updateRecordBestEffort(table, recordIdToUpdate, updates) {
    const safeUpdates = {};

    for (const [fieldName, value] of Object.entries(updates || {})) {
        if (!fieldExists(table, fieldName)) {
            log(`Best-effort update skipped missing field: ${fieldName}`);
            continue;
        }

        if (!isWritableField(table, fieldName)) {
            log(`Best-effort update skipped non-writable field: ${fieldName}`);
            continue;
        }

        if (value === undefined) {
            continue;
        }

        const field = getFieldSafe(table, fieldName);

        if (
            field &&
            field.type === "singleSelect" &&
            value &&
            typeof value === "object" &&
            value.name &&
            !singleSelectOptionExists(table, fieldName, value.name)
        ) {
            log(`Best-effort update skipped missing single-select option: ${fieldName} = ${value.name}`);
            continue;
        }

        safeUpdates[fieldName] = value;
    }

    if (Object.keys(safeUpdates).length === 0) {
        return false;
    }

    try {
        await table.updateRecordAsync(recordIdToUpdate, safeUpdates);
        return true;
    } catch (error) {
        log("Best-effort update failed", {
            recordId: recordIdToUpdate,
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

async function setGradeBandStatuses(targetRecordId, statusText) {
    const updates = {};

    if (fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBandStatus)) {
        if (
            canWriteSingleSelectValue(
                enrollmentsTable,
                CONFIG.enrollments.gradeBandStatus,
                statusText
            )
        ) {
            updates[CONFIG.enrollments.gradeBandStatus] = buildCellValueForField(
                enrollmentsTable,
                CONFIG.enrollments.gradeBandStatus,
                statusText
            );
        } else {
            log(`Grade Band Status option does not exist: ${statusText}`);
        }
    }

    if (fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBandAssignmentStatus)) {
        updates[CONFIG.enrollments.gradeBandAssignmentStatus] = statusText;
    }

    return await updateRecordBestEffort(enrollmentsTable, targetRecordId, updates);
}

function buildLastGradeUsedValue(gradeText) {
    if (!fieldExists(enrollmentsTable, CONFIG.enrollments.lastGradeUsedForGradeBand)) {
        return undefined;
    }

    if (
        !canWriteSingleSelectValue(
            enrollmentsTable,
            CONFIG.enrollments.lastGradeUsedForGradeBand,
            gradeText
        )
    ) {
        log(`Last Grade Used for Grade Band option does not exist: ${gradeText}`);
        return undefined;
    }

    return buildCellValueForField(
        enrollmentsTable,
        CONFIG.enrollments.lastGradeUsedForGradeBand,
        gradeText
    );
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

function describeGradeBandCandidates(candidates) {
    return candidates
        .map((item) => {
            return `${item.gradeBandName || item.id} [${item.minGrade}-${item.maxGrade}, sort ${item.sortOrder}]`;
        })
        .join("; ");
}

async function writeRequiredGradeBandLink(targetRecordId, gradeBandId) {
    const fieldName = CONFIG.enrollments.gradeBand;

    if (!fieldExists(enrollmentsTable, fieldName)) {
        throw new Error(`Required field is missing: ${fieldName}`);
    }

    if (!isWritableField(enrollmentsTable, fieldName)) {
        throw new Error(`Required field is not writable: ${fieldName}`);
    }

    if (!fieldHasType(enrollmentsTable, fieldName, ["multipleRecordLinks"])) {
        throw new Error(`Field "${fieldName}" must be a linked-record field before it can be updated.`);
    }

    await enrollmentsTable.updateRecordAsync(targetRecordId, {
        [fieldName]: [{ id: gradeBandId }],
    });

    return true;
}

/* =========================================================
   SECTION 5: MAIN
   ========================================================= */

async function main() {
    const cfg =
        typeof input !== "undefined" && input && typeof input.config === "function"
            ? input.config()
            : {};

    recordId = String(cfg.recordId || "").trim();

    if (!recordId) {
        throw new Error("Missing required input: recordId");
    }

    enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
    gradeBandsTable = base.getTable(CONFIG.tables.gradeBands);

    let debugStep = "Start";
    let gradeValue = "";
    let gradeNumeric = null;

    setOutputSafe("debugStep", debugStep);
    setOutputSafe("errorSaveFailed", "");

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
            setOutputSafe("gradeBandId", "");
            setOutputSafe("gradeBandName", "");
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

        const existingGradeBandId = getFirstLinkedRecordId(
            enrollment,
            enrollmentsTable,
            CONFIG.enrollments.gradeBand
        );

        log("Grade Band assignment input", {
            enrollmentId: recordId,
            gradeValue,
            gradeNumeric,
            athleteId,
            existingGradeBandId,
        });

        debugStep = "4 - Set Processing Status";
        setOutputSafe("debugStep", debugStep);
        await setGradeBandStatuses(recordId, CONFIG.statuses.processing);

        debugStep = "5 - Validate Enrollment";
        setOutputSafe("debugStep", debugStep);

        if (!gradeValue) {
            throw new Error("Cannot assign Grade Band because Grade is blank.");
        }

        if (gradeNumeric === null) {
            throw new Error(
                `Cannot assign Grade Band because Grade "${gradeValue}" could not be converted to a numeric value.`
            );
        }

        if (!athleteId) {
            throw new Error("Cannot assign Grade Band because Athlete is not linked.");
        }

        if (existingGradeBandId) {
            debugStep = "6 - Already Assigned";
            setOutputSafe("debugStep", debugStep);

            const alreadyAssignedUpdates = {};

            const lastGradeUsedValue = buildLastGradeUsedValue(gradeValue);
            if (lastGradeUsedValue !== undefined) {
                alreadyAssignedUpdates[CONFIG.enrollments.lastGradeUsedForGradeBand] =
                    lastGradeUsedValue;
            }

            await updateRecordBestEffort(enrollmentsTable, recordId, alreadyAssignedUpdates);
            await setGradeBandStatuses(recordId, CONFIG.statuses.assigned);

            setOutputSafe("enrollmentId", recordId);
            setOutputSafe("gradeOut", gradeValue);
            setOutputSafe("gradeNumericOut", gradeNumeric);
            setOutputSafe("gradeBandId", existingGradeBandId);
            setOutputSafe("gradeBandName", "Already assigned");
            setOutputSafe("statusOut", CONFIG.statuses.assigned);
            setOutputSafe("errorOut", "");
            setOutputSafe("errorSaveFailed", "");
            setOutputSafe("debugStep", "Done - already assigned");

            return;
        }

        debugStep = "7 - Load Grade Bands";
        setOutputSafe("debugStep", debugStep);

        const gradeBandQuery = await gradeBandsTable.selectRecordsAsync({
            fields: buildGradeBandFieldsToLoad(),
        });

        debugStep = "8 - Find Matching Grade Band";
        setOutputSafe("debugStep", debugStep);

        const candidates = findMatchingGradeBands(gradeBandQuery.records, gradeNumeric);

        if (candidates.length === 0) {
            gradeBandQuery.unloadData();

            throw new Error(
                `No active Grade Band match found for Grade "${gradeValue}" (numeric ${gradeNumeric}).`
            );
        }

        if (candidates.length > 1) {
            const candidateDetails = describeGradeBandCandidates(candidates);
            gradeBandQuery.unloadData();

            throw new Error(
                `Multiple active Grade Bands matched Grade "${gradeValue}" (numeric ${gradeNumeric}): ${candidateDetails}. Review Grade Band ranges.`
            );
        }

        const chosen = candidates[0];

        gradeBandQuery.unloadData();

        debugStep = "9 - Recheck Enrollment Before Write";
        setOutputSafe("debugStep", debugStep);

        const latestEnrollment = await enrollmentsTable.selectRecordAsync(recordId);

        if (!latestEnrollment) {
            throw new Error(`Enrollment record no longer exists before Grade Band write: ${recordId}`);
        }

        const latestGradeBandId = getFirstLinkedRecordId(
            latestEnrollment,
            enrollmentsTable,
            CONFIG.enrollments.gradeBand
        );

        if (latestGradeBandId) {
            await setGradeBandStatuses(recordId, CONFIG.statuses.assigned);

            setOutputSafe("enrollmentId", recordId);
            setOutputSafe("gradeOut", gradeValue);
            setOutputSafe("gradeNumericOut", gradeNumeric);
            setOutputSafe("gradeBandId", latestGradeBandId);
            setOutputSafe("gradeBandName", "Already assigned before final write");
            setOutputSafe("statusOut", CONFIG.statuses.assigned);
            setOutputSafe("errorOut", "");
            setOutputSafe("errorSaveFailed", "");
            setOutputSafe("debugStep", "Done - already assigned before final write");

            return;
        }

        debugStep = "10 - Write Required Grade Band Link";
        setOutputSafe("debugStep", debugStep);

        await writeRequiredGradeBandLink(recordId, chosen.id);

        debugStep = "11 - Write Optional Grade Band Helper Fields";
        setOutputSafe("debugStep", debugStep);

        const optionalUpdates = {};

        if (fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBandAutoAssign)) {
            optionalUpdates[CONFIG.enrollments.gradeBandAutoAssign] = chosen.gradeBandName;
        }

        const lastGradeUsedValue = buildLastGradeUsedValue(gradeValue);
        if (lastGradeUsedValue !== undefined) {
            optionalUpdates[CONFIG.enrollments.lastGradeUsedForGradeBand] = lastGradeUsedValue;
        }

        await updateRecordBestEffort(enrollmentsTable, recordId, optionalUpdates);

        debugStep = "12 - Set Assigned Status";
        setOutputSafe("debugStep", debugStep);

        await setGradeBandStatuses(recordId, CONFIG.statuses.assigned);

        debugStep = "13 - Outputs";
        setOutputSafe("debugStep", debugStep);

        setOutputSafe("enrollmentId", recordId);
        setOutputSafe("gradeOut", gradeValue);
        setOutputSafe("gradeNumericOut", gradeNumeric);
        setOutputSafe("gradeBandId", chosen.id);
        setOutputSafe("gradeBandName", chosen.gradeBandName);
        setOutputSafe("statusOut", CONFIG.statuses.assigned);
        setOutputSafe("errorOut", "");
        setOutputSafe("errorSaveFailed", "");

        log("Grade Band assignment completed", {
            enrollmentId: recordId,
            gradeValue,
            gradeNumeric,
            gradeBandId: chosen.id,
            gradeBandName: chosen.gradeBandName,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);
        setOutputSafe("enrollmentId", recordId);
        setOutputSafe("gradeOut", gradeValue);
        setOutputSafe("gradeNumericOut", gradeNumeric ?? "");
        setOutputSafe("gradeBandId", "");
        setOutputSafe("gradeBandName", "");
        setOutputSafe("statusOut", CONFIG.statuses.error);
        setOutputSafe("errorOut", message);

        try {
            const stillExists = await enrollmentsTable.selectRecordAsync(recordId);
            if (stillExists) {
                await setGradeBandStatuses(recordId, CONFIG.statuses.error);
            }
            setOutputSafe("errorSaveFailed", "");
        } catch (innerError) {
            const innerMessage =
                innerError instanceof Error ? innerError.message : String(innerError || "");
            setOutputSafe("errorSaveFailed", innerMessage);
        }

        log("Grade Band assignment failed", {
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

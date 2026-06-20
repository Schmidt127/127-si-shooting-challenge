/*
Automation: 001 -  Enrollment Intake and Setup - Find or Create Athlete and Link Enrollment
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
 * 001 - Enrollment Intake and Setup - Find or Create Athlete and Link Enrollment
 *
 * Version: v5.1
 * Date Written: 2026-05-20
 * Date Updated: 2026-06-17
 * Updated Reason: Added safe field caching, computed-field checks, status option validation,
 * field-type guards, clearer email debugging, and a last-chance duplicate check before Athlete creation.
 *
 * PURPOSE
 * - Reads one Enrollment record from the Enrollments table.
 * - Validates athlete identity fields.
 * - Builds a normalized match key in the script for matching only.
 * - Finds an existing Athlete record when possible.
 * - Creates a new Athlete record when no match exists.
 * - Links the Enrollment to the Athlete.
 * - Activates the Athlete and Enrollment.
 * - Updates Athlete Match Status when the field exists and accepts the value.
 *
 * CURRENT SCHEMA NOTES
 * - Do NOT write to Athletes.{Athlete Match Key}; it is a formula field.
 * - Do NOT write to Enrollments formula/lookup/rollup/count fields.
 * - The script only writes to safe editable fields.
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId: Airtable record ID from Enrollments
 *
 * OUTPUTS
 * - athleteId
 * - athleteMatchKey
 * - actionTaken
 * - parentEmailUsed
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
        enrollments: "Enrollments",
        athletes: "Athletes",
    },

    enrollments: {
        athleteFirstName: "Athlete First Name",
        athleteLastName: "Athlete Last Name",
        parentEmail: "Parent Email",
        parentEmailCleaned: "Parent Email - Cleaned",
        parentEmailSubmitted: "Parent Email Submitted",
        athleteLink: "Athlete",
        active: "Active?",
        athleteMatchStatus: "Athlete Match Status",
    },

    athletes: {
        firstName: "First Name",
        lastName: "Last Name",
        parentEmail: "Parent Email",
        athleteMatchKey: "Athlete Match Key",
        active: "Active?",
    },

    statuses: {
        pending: "Pending",
        processing: "Processing",
        linked: "Linked",
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
let athletesTable = null;

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
        // Airtable output is unavailable in some testing contexts.
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

function getText(record, table, fieldName) {
    if (!record || !table || !fieldExists(table, fieldName)) return "";
    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getRaw(record, table, fieldName) {
    if (!record || !table || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
}

function getFirstLinkedRecordId(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (Array.isArray(raw) && raw.length > 0 && raw[0]?.id) {
        return raw[0].id;
    }

    return "";
}

function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function normalizeEmail(value) {
    let email = String(value || "").trim().toLowerCase();

    const angleMatch = email.match(/<([^>]+)>/);
    if (angleMatch && angleMatch[1]) {
        email = angleMatch[1].trim().toLowerCase();
    }

    email = email
        .replace(/^["']+|["']+$/g, "")
        .replace(/[,;]+$/g, "")
        .replace(/\s+/g, "");

    return email;
}

function buildAthleteMatchKey(parentEmail, firstName, lastName) {
    return [
        normalizeEmail(parentEmail),
        normalizeText(firstName),
        normalizeText(lastName),
    ].join("|");
}

function valuesEqual(a, b) {
    return String(a || "").trim() === String(b || "").trim();
}

function getFirstAvailableText(record, table, fieldNames) {
    for (const fieldName of fieldNames) {
        if (!fieldExists(table, fieldName)) continue;

        const value = getText(record, table, fieldName);
        if (value) {
            return {
                fieldName,
                value,
            };
        }
    }

    return {
        fieldName: "",
        value: "",
    };
}

function buildSingleSelectValue(table, fieldName, optionName) {
    const field = getFieldSafe(table, fieldName);
    if (!field) return null;

    if (field.type !== "singleSelect") {
        return optionName;
    }

    return { name: optionName };
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

        safeUpdates[fieldName] = value;
    }

    if (Object.keys(safeUpdates).length === 0) {
        return false;
    }

    await table.updateRecordAsync(recordIdToUpdate, safeUpdates);
    return true;
}

async function createRecordSafe(table, createValues) {
    const safeCreateValues = {};

    for (const [fieldName, value] of Object.entries(createValues || {})) {
        if (!fieldExists(table, fieldName)) {
            log(`Skipped missing create field: ${fieldName}`);
            continue;
        }

        if (!isWritableField(table, fieldName)) {
            log(`Skipped non-writable create field: ${fieldName}`);
            continue;
        }

        safeCreateValues[fieldName] = value;
    }

    if (Object.keys(safeCreateValues).length === 0) {
        throw new Error("No writable fields available to create Athlete record.");
    }

    return await table.createRecordAsync(safeCreateValues);
}

async function setEnrollmentStatus(statusName) {
    const fieldName = CONFIG.enrollments.athleteMatchStatus;

    if (!fieldExists(enrollmentsTable, fieldName)) {
        return false;
    }

    if (!isWritableField(enrollmentsTable, fieldName)) {
        return false;
    }

    if (!singleSelectOptionExists(enrollmentsTable, fieldName, statusName)) {
        log(`Status update skipped because single-select option does not exist: ${statusName}`);
        return false;
    }

    const value = buildSingleSelectValue(enrollmentsTable, fieldName, statusName);

    try {
        await enrollmentsTable.updateRecordAsync(recordId, {
            [fieldName]: value,
        });
        return true;
    } catch (error) {
        log(`Status update skipped/failed for value: ${statusName}`, {
            error: error.message,
        });
        return false;
    }
}

function buildAthleteFieldList() {
    const possibleFields = [
        CONFIG.athletes.firstName,
        CONFIG.athletes.lastName,
        CONFIG.athletes.parentEmail,
        CONFIG.athletes.athleteMatchKey,
        CONFIG.athletes.active,
    ];

    return possibleFields.filter((fieldName) =>
        fieldExists(athletesTable, fieldName)
    );
}

function findMatchingAthlete(athleteRecords, athleteMatchKey, firstName, lastName, parentEmail) {
    const normalizedFirstName = normalizeText(firstName);
    const normalizedLastName = normalizeText(lastName);
    const normalizedParentEmail = normalizeEmail(parentEmail);

    let matchedAthlete = null;

    if (fieldExists(athletesTable, CONFIG.athletes.athleteMatchKey)) {
        matchedAthlete =
            athleteRecords.find((record) => {
                const existingMatchKey = getText(
                    record,
                    athletesTable,
                    CONFIG.athletes.athleteMatchKey
                );

                return valuesEqual(existingMatchKey, athleteMatchKey);
            }) || null;

        if (matchedAthlete) {
            return {
                record: matchedAthlete,
                matchMethod: "formula-match-key",
            };
        }
    }

    matchedAthlete =
        athleteRecords.find((record) => {
            const existingFirstName = normalizeText(
                getText(record, athletesTable, CONFIG.athletes.firstName)
            );

            const existingLastName = normalizeText(
                getText(record, athletesTable, CONFIG.athletes.lastName)
            );

            const existingParentEmail = normalizeEmail(
                getText(record, athletesTable, CONFIG.athletes.parentEmail)
            );

            return (
                valuesEqual(existingFirstName, normalizedFirstName) &&
                valuesEqual(existingLastName, normalizedLastName) &&
                valuesEqual(existingParentEmail, normalizedParentEmail)
            );
        }) || null;

    if (matchedAthlete) {
        return {
            record: matchedAthlete,
            matchMethod: "first-last-parent-email",
        };
    }

    return {
        record: null,
        matchMethod: "none",
    };
}

/* =========================================================
   SECTION 5: MAIN
   ========================================================= */

async function main() {
    let debugStep = "Start";
    setOutputSafe("debugStep", debugStep);

    try {
        debugStep = "1 - Initialize Runtime Context";
        setOutputSafe("debugStep", debugStep);

        const cfg =
            typeof input !== "undefined" && input && typeof input.config === "function"
                ? input.config()
                : {};

        recordId = String(cfg.recordId || "").trim();

        if (!recordId) {
            throw new Error("Missing required input: recordId");
        }

        enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
        athletesTable = base.getTable(CONFIG.tables.athletes);

        debugStep = "2 - Validate recordId";
        setOutputSafe("debugStep", debugStep);

        if (!recordId.startsWith("rec")) {
            throw new Error(`Invalid Enrollment recordId input: ${recordId}`);
        }

        debugStep = "3 - Load Enrollment";
        setOutputSafe("debugStep", debugStep);

        const enrollment = await enrollmentsTable.selectRecordAsync(recordId);

        if (!enrollment) {
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", `Enrollment record not found: ${recordId}`);
            setOutputSafe("debugStep", "Skipped: Enrollment not found");
            return;
        }

        debugStep = "4 - Read Enrollment Fields";
        setOutputSafe("debugStep", debugStep);

        const athleteFirstName = getText(
            enrollment,
            enrollmentsTable,
            CONFIG.enrollments.athleteFirstName
        );

        const athleteLastName = getText(
            enrollment,
            enrollmentsTable,
            CONFIG.enrollments.athleteLastName
        );

        const parentEmailResult = getFirstAvailableText(enrollment, enrollmentsTable, [
            CONFIG.enrollments.parentEmailCleaned,
            CONFIG.enrollments.parentEmail,
            CONFIG.enrollments.parentEmailSubmitted,
        ]);

        const parentEmailToUse = normalizeEmail(parentEmailResult.value);

        const existingLinkedAthleteId = getFirstLinkedRecordId(
            enrollment,
            enrollmentsTable,
            CONFIG.enrollments.athleteLink
        );

        const athleteMatchKey = buildAthleteMatchKey(
            parentEmailToUse,
            athleteFirstName,
            athleteLastName
        );

        setOutputSafe("athleteMatchKey", athleteMatchKey);
        setOutputSafe("parentEmailUsed", parentEmailToUse);
        setOutputSafe("debugFirstName", athleteFirstName);
        setOutputSafe("debugLastName", athleteLastName);
        setOutputSafe("debugParentEmailSourceField", parentEmailResult.fieldName);

        log("Enrollment input", {
            recordId,
            athleteFirstName,
            athleteLastName,
            parentEmailToUse,
            parentEmailSourceField: parentEmailResult.fieldName,
            existingLinkedAthleteId,
            athleteMatchKey,
        });

        debugStep = "5 - Validate Required Enrollment Values";
        setOutputSafe("debugStep", debugStep);

        if (!athleteFirstName || !athleteLastName || !parentEmailToUse) {
            const missing = [];

            if (!athleteFirstName) missing.push(CONFIG.enrollments.athleteFirstName);
            if (!athleteLastName) missing.push(CONFIG.enrollments.athleteLastName);
            if (!parentEmailToUse) {
                missing.push("Parent Email - Cleaned / Parent Email / Parent Email Submitted");
            }

            const message = `Missing required Enrollment data: ${missing.join(", ")}`;

            await setEnrollmentStatus(CONFIG.statuses.skipped);

            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", message);
            setOutputSafe("debugStep", "Skipped: Missing required Enrollment data");

            log(message);
            return;
        }

        if (!athleteMatchKey || athleteMatchKey === "||") {
            const message = "Athlete Match Key could not be built from Enrollment data.";

            await setEnrollmentStatus(CONFIG.statuses.skipped);

            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", message);
            setOutputSafe("debugStep", "Skipped: Match key missing");

            log(message);
            return;
        }

        debugStep = "6 - Set Processing Status";
        setOutputSafe("debugStep", debugStep);
        await setEnrollmentStatus(CONFIG.statuses.processing);

        let athleteId = "";
        let actionTaken = "";
        let matchMethod = "";

        debugStep = "7 - Existing Link Check";
        setOutputSafe("debugStep", debugStep);

        if (existingLinkedAthleteId) {
            athleteId = existingLinkedAthleteId;
            actionTaken = "already-linked";
            matchMethod = "existing-enrollment-link";

            const athleteUpdate = {};

            if (fieldExists(athletesTable, CONFIG.athletes.active)) {
                athleteUpdate[CONFIG.athletes.active] = true;
            }

            if (Object.keys(athleteUpdate).length > 0) {
                await updateRecordSafe(athletesTable, athleteId, athleteUpdate);
                actionTaken = "already-linked-and-activated";
            }
        } else {
            debugStep = "8 - Load Athletes";
            setOutputSafe("debugStep", debugStep);

            const athleteFieldsToLoad = buildAthleteFieldList();

            const athletesQuery = await athletesTable.selectRecordsAsync({
                fields: athleteFieldsToLoad,
            });

            debugStep = "9 - Match Existing Athlete";
            setOutputSafe("debugStep", debugStep);

            const matchResult = findMatchingAthlete(
                athletesQuery.records,
                athleteMatchKey,
                athleteFirstName,
                athleteLastName,
                parentEmailToUse
            );

            matchMethod = matchResult.matchMethod;

            if (matchResult.record) {
                debugStep = "10 - Update Existing Athlete";
                setOutputSafe("debugStep", debugStep);

                athleteId = matchResult.record.id;

                const athleteUpdates = {};

                if (fieldExists(athletesTable, CONFIG.athletes.firstName)) {
                    athleteUpdates[CONFIG.athletes.firstName] = athleteFirstName;
                }

                if (fieldExists(athletesTable, CONFIG.athletes.lastName)) {
                    athleteUpdates[CONFIG.athletes.lastName] = athleteLastName;
                }

                if (fieldExists(athletesTable, CONFIG.athletes.parentEmail)) {
                    athleteUpdates[CONFIG.athletes.parentEmail] = parentEmailToUse;
                }

                if (fieldExists(athletesTable, CONFIG.athletes.active)) {
                    athleteUpdates[CONFIG.athletes.active] = true;
                }

                await updateRecordSafe(athletesTable, athleteId, athleteUpdates);

                actionTaken = "matched-existing-and-linked";
            } else {
                debugStep = "11 - Last-Chance Duplicate Check Before Create";
                setOutputSafe("debugStep", debugStep);

                const latestAthletesQuery = await athletesTable.selectRecordsAsync({
                    fields: athleteFieldsToLoad,
                });

                const latestMatchResult = findMatchingAthlete(
                    latestAthletesQuery.records,
                    athleteMatchKey,
                    athleteFirstName,
                    athleteLastName,
                    parentEmailToUse
                );

                if (latestMatchResult.record) {
                    athleteId = latestMatchResult.record.id;
                    matchMethod = latestMatchResult.matchMethod;
                    actionTaken = "matched-existing-and-linked";

                    const athleteUpdates = {};

                    if (fieldExists(athletesTable, CONFIG.athletes.firstName)) {
                        athleteUpdates[CONFIG.athletes.firstName] = athleteFirstName;
                    }

                    if (fieldExists(athletesTable, CONFIG.athletes.lastName)) {
                        athleteUpdates[CONFIG.athletes.lastName] = athleteLastName;
                    }

                    if (fieldExists(athletesTable, CONFIG.athletes.parentEmail)) {
                        athleteUpdates[CONFIG.athletes.parentEmail] = parentEmailToUse;
                    }

                    if (fieldExists(athletesTable, CONFIG.athletes.active)) {
                        athleteUpdates[CONFIG.athletes.active] = true;
                    }

                    await updateRecordSafe(athletesTable, athleteId, athleteUpdates);
                } else {
                    debugStep = "12 - Create New Athlete";
                    setOutputSafe("debugStep", debugStep);

                    const athleteCreate = {};

                    if (fieldExists(athletesTable, CONFIG.athletes.firstName)) {
                        athleteCreate[CONFIG.athletes.firstName] = athleteFirstName;
                    }

                    if (fieldExists(athletesTable, CONFIG.athletes.lastName)) {
                        athleteCreate[CONFIG.athletes.lastName] = athleteLastName;
                    }

                    if (fieldExists(athletesTable, CONFIG.athletes.parentEmail)) {
                        athleteCreate[CONFIG.athletes.parentEmail] = parentEmailToUse;
                    }

                    if (fieldExists(athletesTable, CONFIG.athletes.active)) {
                        athleteCreate[CONFIG.athletes.active] = true;
                    }

                    athleteId = await createRecordSafe(athletesTable, athleteCreate);

                    actionTaken = "created-and-linked";
                    matchMethod = "created-new";
                }

                latestAthletesQuery.unloadData();
            }

            athletesQuery.unloadData();
        }

        debugStep = "13 - Link Enrollment and Activate Enrollment";
        setOutputSafe("debugStep", debugStep);

        if (!athleteId) {
            throw new Error("Athlete ID is blank after match/create logic.");
        }

        const enrollmentUpdates = {};

        if (fieldExists(enrollmentsTable, CONFIG.enrollments.athleteLink)) {
            if (!fieldHasType(enrollmentsTable, CONFIG.enrollments.athleteLink, ["multipleRecordLinks"])) {
                throw new Error(
                    `Field "${CONFIG.enrollments.athleteLink}" must be a linked-record field before it can be updated.`
                );
            }

            enrollmentUpdates[CONFIG.enrollments.athleteLink] = [{ id: athleteId }];
        }

        if (fieldExists(enrollmentsTable, CONFIG.enrollments.active)) {
            enrollmentUpdates[CONFIG.enrollments.active] = true;
        }

        await updateRecordSafe(enrollmentsTable, recordId, enrollmentUpdates);

        debugStep = "14 - Set Linked Status";
        setOutputSafe("debugStep", debugStep);

        await setEnrollmentStatus(CONFIG.statuses.linked);

        debugStep = "15 - Outputs";
        setOutputSafe("debugStep", debugStep);

        setOutputSafe("athleteId", athleteId);
        setOutputSafe("athleteMatchKey", athleteMatchKey);
        setOutputSafe("actionTaken", actionTaken);
        setOutputSafe("matchMethod", matchMethod);
        setOutputSafe("parentEmailUsed", parentEmailToUse);
        setOutputSafe("statusOut", CONFIG.statuses.linked);
        setOutputSafe("errorOut", "");

        log("Enrollment Intake completed", {
            enrollmentId: recordId,
            athleteId,
            actionTaken,
            matchMethod,
            athleteMatchKey,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        setOutputSafe("statusOut", CONFIG.statuses.error);
        setOutputSafe("errorOut", message);
        setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);

        log("Enrollment Intake failed", {
            recordId,
            debugStep,
            error: message,
        });

        try {
            await setEnrollmentStatus(CONFIG.statuses.error);
        } catch {
            // Keep original error visible.
        }

        throw error;
    }
}

/* =========================================================
   SECTION 6: RUN
   ========================================================= */

await main();

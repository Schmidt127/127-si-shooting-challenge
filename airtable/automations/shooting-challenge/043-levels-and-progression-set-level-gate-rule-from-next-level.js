/*
Automation: 043 - Levels and Progression - Set Level Gate Rule from Next Level
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
 * 043 - Levels and Progression - Set Level Gate Rule from Next Level
 *
 * Version: v2.0
 * Date Written: 2026-05-20
 *
 * PURPOSE
 * - Reads one Enrollment record.
 * - Reads the linked Next Level.
 * - Finds the matching Level Gate Rules record where Level = Next Level.
 * - Preferably uses only active Level Gate Rules when Version Active? exists.
 * - Writes the matching Level Gate Rule into Enrollments.Level Gate Rule.
 *
 * CURRENT SCHEMA NOTES
 * - Enrollments.Next Level is a linked-record field.
 * - Enrollments.Level Gate Rule is a writable linked-record field.
 * - Level Gate Rules.Level is a linked-record field.
 * - Level Gate Rules.Version Active? is a checkbox and should be used when present.
 * - Gate minimum fields on Enrollments are lookups from Level Gate Rule and must not be written by script.
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId: Airtable record ID from Enrollments
 *
 * CORRECT TRIGGER CONDITIONS
 * - Next Level is not empty.
 * - Level Gate Rule is empty.
 * - Optional: Active? is checked.
 *
 * OUTPUTS
 * - ok
 * - recordId
 * - nextLevelId
 * - levelGateRuleId
 * - matchCount
 * - actionTaken
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
        levelGateRules: "Level Gate Rules",
    },

    enrollments: {
        nextLevel: "Next Level",
        levelGateRule: "Level Gate Rule",
        active: "Active?",
    },

    levelGateRules: {
        level: "Level",
        versionActive: "Version Active?",
        name: "Level Gate Rule Name",
    },

    statuses: {
        success: "success",
        skipped: "skipped",
        error: "error",
    },

    debug: {
        logToConsole: true,
        requireActiveGateRuleWhenFieldExists: true,
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
const levelGateRulesTable = base.getTable(CONFIG.tables.levelGateRules);

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

function requireField(table, fieldName, label) {
    if (!fieldExists(table, fieldName)) {
        throw new Error(`Missing required field: ${label} (${table.name} -> ${fieldName})`);
    }
}

function requireWritableField(table, fieldName, label) {
    requireField(table, fieldName, label);

    if (!isWritableField(table, fieldName)) {
        throw new Error(`Required field is not writable: ${label} (${table.name} -> ${fieldName})`);
    }
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

async function updateRecordSafe(table, targetRecordId, updates) {
    const safeUpdates = {};

    for (const [fieldName, value] of Object.entries(updates || {})) {
        if (!fieldExists(table, fieldName)) {
            log(`Skipped missing field: ${table.name}.${fieldName}`);
            continue;
        }

        if (!isWritableField(table, fieldName)) {
            log(`Skipped non-writable field: ${table.name}.${fieldName}`);
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

    await table.updateRecordAsync(targetRecordId, safeUpdates);

    return Object.keys(safeUpdates);
}

function buildEnrollmentFieldsToLoad() {
    return [
        CONFIG.enrollments.nextLevel,
        CONFIG.enrollments.levelGateRule,
        CONFIG.enrollments.active,
    ].filter((fieldName) => fieldExists(enrollmentsTable, fieldName));
}

function buildGateRuleFieldsToLoad() {
    return [
        CONFIG.levelGateRules.level,
        CONFIG.levelGateRules.versionActive,
        CONFIG.levelGateRules.name,
    ].filter((fieldName) => fieldExists(levelGateRulesTable, fieldName));
}

/* =========================================================
   SECTION 5: FIELD VALIDATION
   ========================================================= */

requireField(
    enrollmentsTable,
    CONFIG.enrollments.nextLevel,
    "Enrollments -> Next Level"
);

requireWritableField(
    enrollmentsTable,
    CONFIG.enrollments.levelGateRule,
    "Enrollments -> Level Gate Rule"
);

requireField(
    levelGateRulesTable,
    CONFIG.levelGateRules.level,
    "Level Gate Rules -> Level"
);

/* =========================================================
   SECTION 6: MAIN
   ========================================================= */

async function main() {
    let debugStep = "Start";

    let enrollment = null;
    let nextLevelId = "";
    let existingLevelGateRuleId = "";
    let levelGateRuleId = "";
    let matchCount = 0;
    let actionTaken = "";

    setOutputSafe("debugStep", debugStep);

    try {
        debugStep = "1 - Validate recordId";
        setOutputSafe("debugStep", debugStep);

        if (!recordId.startsWith("rec")) {
            throw new Error(`Invalid Enrollment recordId input: ${recordId}`);
        }

        debugStep = "2 - Load Enrollment";
        setOutputSafe("debugStep", debugStep);

        enrollment = await enrollmentsTable.selectRecordAsync(recordId, {
            fields: buildEnrollmentFieldsToLoad(),
        });

        if (!enrollment) {
            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("nextLevelId", "");
            setOutputSafe("levelGateRuleId", "");
            setOutputSafe("matchCount", 0);
            setOutputSafe("actionTaken", "skipped_enrollment_not_found");
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", `Enrollment record not found: ${recordId}`);
            setOutputSafe("debugStep", "Skipped: Enrollment not found");
            return;
        }

        debugStep = "3 - Read Enrollment Values";
        setOutputSafe("debugStep", debugStep);

        nextLevelId = getFirstLinkedRecordId(
            enrollment,
            enrollmentsTable,
            CONFIG.enrollments.nextLevel
        );

        existingLevelGateRuleId = getFirstLinkedRecordId(
            enrollment,
            enrollmentsTable,
            CONFIG.enrollments.levelGateRule
        );

        log("Level Gate Rule input", {
            recordId,
            nextLevelId,
            existingLevelGateRuleId,
        });

        debugStep = "4 - Validate Next Level";
        setOutputSafe("debugStep", debugStep);

        if (!nextLevelId) {
            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("nextLevelId", "");
            setOutputSafe("levelGateRuleId", "");
            setOutputSafe("matchCount", 0);
            setOutputSafe("actionTaken", "skipped_no_next_level");
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", "No Next Level is linked on this Enrollment.");
            setOutputSafe("debugStep", "Skipped: Next Level blank");
            return;
        }

        if (existingLevelGateRuleId) {
            setOutputSafe("ok", true);
            setOutputSafe("recordId", recordId);
            setOutputSafe("nextLevelId", nextLevelId);
            setOutputSafe("levelGateRuleId", existingLevelGateRuleId);
            setOutputSafe("matchCount", 1);
            setOutputSafe("actionTaken", "already_linked");
            setOutputSafe("statusOut", CONFIG.statuses.success);
            setOutputSafe("errorOut", "");
            setOutputSafe("debugStep", "Done - Already linked");
            return;
        }

        debugStep = "5 - Load Level Gate Rules";
        setOutputSafe("debugStep", debugStep);

        const gateRuleQuery = await levelGateRulesTable.selectRecordsAsync({
            fields: buildGateRuleFieldsToLoad(),
        });

        debugStep = "6 - Find Matching Level Gate Rule";
        setOutputSafe("debugStep", debugStep);

        const matches = gateRuleQuery.records.filter((ruleRecord) => {
            const linkedLevelIds = getLinkedRecordIds(
                ruleRecord,
                levelGateRulesTable,
                CONFIG.levelGateRules.level
            );

            const levelMatches = linkedLevelIds.includes(nextLevelId);

            if (!levelMatches) return false;

            if (
                CONFIG.debug.requireActiveGateRuleWhenFieldExists &&
                fieldExists(levelGateRulesTable, CONFIG.levelGateRules.versionActive)
            ) {
                return getBooleanish(
                    ruleRecord,
                    levelGateRulesTable,
                    CONFIG.levelGateRules.versionActive
                );
            }

            return true;
        });

        matchCount = matches.length;

        if (matches.length === 0) {
            setOutputSafe("ok", false);
            setOutputSafe("recordId", recordId);
            setOutputSafe("nextLevelId", nextLevelId);
            setOutputSafe("levelGateRuleId", "");
            setOutputSafe("matchCount", 0);
            setOutputSafe("actionTaken", "skipped_no_matching_gate_rule");
            setOutputSafe("statusOut", CONFIG.statuses.skipped);
            setOutputSafe("errorOut", "No matching active Level Gate Rule found for this Next Level.");
            setOutputSafe("debugStep", "Skipped: No matching gate rule");
            return;
        }

        if (matches.length > 1) {
            const duplicateIds = matches.map((record) => record.id).join(", ");
            throw new Error(
                `Multiple active Level Gate Rules matched this Next Level. Record IDs: ${duplicateIds}`
            );
        }

        const matchingGateRule = matches[0];
        levelGateRuleId = matchingGateRule.id;

        debugStep = "7 - Write Level Gate Rule";
        setOutputSafe("debugStep", debugStep);

        await updateRecordSafe(enrollmentsTable, recordId, {
            [CONFIG.enrollments.levelGateRule]: [{ id: levelGateRuleId }],
        });

        actionTaken = "linked_level_gate_rule";

        debugStep = "8 - Outputs";
        setOutputSafe("debugStep", debugStep);

        setOutputSafe("ok", true);
        setOutputSafe("recordId", recordId);
        setOutputSafe("nextLevelId", nextLevelId);
        setOutputSafe("levelGateRuleId", levelGateRuleId);
        setOutputSafe("matchCount", matchCount);
        setOutputSafe("actionTaken", actionTaken);
        setOutputSafe("statusOut", CONFIG.statuses.success);
        setOutputSafe("errorOut", "");

        log("Level Gate Rule assigned successfully", {
            recordId,
            nextLevelId,
            levelGateRuleId,
            matchCount,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        setOutputSafe("ok", false);
        setOutputSafe("recordId", recordId);
        setOutputSafe("nextLevelId", nextLevelId);
        setOutputSafe("levelGateRuleId", levelGateRuleId);
        setOutputSafe("matchCount", matchCount);
        setOutputSafe("actionTaken", actionTaken || "error");
        setOutputSafe("statusOut", CONFIG.statuses.error);
        setOutputSafe("errorOut", message);
        setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);

        log("Level Gate Rule assignment failed", {
            recordId,
            debugStep,
            error: message,
        });

        throw error;
    }
}

/* =========================================================
   SECTION 7: RUN
   ========================================================= */

await main();

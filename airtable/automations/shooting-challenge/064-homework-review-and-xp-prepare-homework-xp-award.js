/*
Automation: 064 - Homework Review and XP - Prepare Homework XP Award
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

/************************************************************************************************
 * 064 - Homework Review and XP - Prepare Homework XP Award
 * Version: 2026-06-17 v12.1
 *
 * PURPOSE
 * - Reads one Homework Completions record.
 * - Confirms coach grading is complete.
 * - Requires:
 *      Coach Feedback is not blank
 *      Satisfactory? is checked
 *      Review Complete is checked
 *      Enrollment exists
 *      Homework exists
 *      Week exists
 *      Submission Date exists
 * - Finds the active XP Reward Rule for HOMEWORK_COMPLETION.
 * - Writes XP Reward Rules -> XP Amount into Homework Completions -> Base XP Awarded.
 * - Sets Award Status = Pending.
 * - Re-arms Shot Milestone checking on the linked Enrollment.
 *
 * IMPORTANT
 * - This script does NOT create the XP Event.
 * - Automation 065 creates the XP Event after Total Homework XP Awarded updates.
 *
 * REQUIRED INPUT
 * - recordId = triggering Homework Completions record ID
 ************************************************************************************************/


/************************************************************************************************
 * SECTION 1 — CONFIGURATION
 ************************************************************************************************/

const CONFIG = {
    tables: {
        homeworkCompletions: "Homework Completions",
        xpRewardRules: "XP Reward Rules",
        enrollments: "Enrollments",
    },

    homework: {
        homework: "Homework",
        enrollment: "Enrollment",
        week: "Week",
        submissionDate: "Submission Date",

        satisfactory: "Satisfactory?",
        reviewComplete: "Review Complete",
        coachFeedback: "Coach Feedback",

        baseXpAwarded: "Base XP Awarded",
        extraCreditXpAwarded: "Extra Credit XP Awarded",
        totalHomeworkXpAwarded: "Total Homework XP Awarded",

        awardStatus: "Award Status",
        reviewedAt: "Reviewed At",
        reviewedBy: "Reviewed By",

        automationError: "Automation Error",
    },

    enrollments: {
        runShotMilestoneCheck: "Run Shot Milestone Check?",
    },

    xpRules: {
        ruleKey: "Rule Key",
        xpAmount: "XP Amount",
        active: "Active?",
    },

    values: {
        homeworkRuleKey: "HOMEWORK_COMPLETION",
        pendingStatus: "Pending",
        errorStatus: "Error",
        reviewedBy: "Mike Schmidt",
    },

    debug: {
        logToConsole: true,
    },
};


/************************************************************************************************
 * SECTION 2 — INPUT
 ************************************************************************************************/

const inputConfig = input.config();
const recordId = String(inputConfig.recordId || "").trim();

if (!recordId) {
    throw new Error("Missing required input variable: recordId");
}

if (!recordId.startsWith("rec")) {
    throw new Error(`Invalid Homework Completion recordId input: ${recordId}`);
}


/************************************************************************************************
 * SECTION 3 — TABLES
 ************************************************************************************************/

const homeworkTable = base.getTable(CONFIG.tables.homeworkCompletions);
const xpRulesTable = base.getTable(CONFIG.tables.xpRewardRules);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);


/************************************************************************************************
 * SECTION 4 — HELPERS
 ************************************************************************************************/

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
        // Ignore output errors.
    }
}

function setOutputs(values) {
    for (const [key, value] of Object.entries(values)) {
        setOutputSafe(key, value);
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

function fieldExists(table, fieldName) {
    return Boolean(getFieldSafe(table, fieldName));
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

function requireField(table, fieldName) {
    if (!fieldExists(table, fieldName)) {
        throw new Error(`Missing required field: ${table.name} -> ${fieldName}`);
    }
}

function requireWritableField(table, fieldName) {
    requireField(table, fieldName);

    if (!isWritableField(table, fieldName)) {
        throw new Error(`Required field is not writable: ${table.name} -> ${fieldName}`);
    }
}

function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return "";

    const raw = record.getCellValue(fieldName);

    if (raw === null || raw === undefined) return "";
    if (typeof raw === "string") return raw.trim();
    if (typeof raw === "number") return String(raw);

    if (typeof raw === "object" && raw.name) {
        return String(raw.name).trim();
    }

    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (raw === null || raw === undefined || raw === "") return 0;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;

    const text = String(record.getCellValueAsString(fieldName) || "")
        .replace(/,/g, "")
        .trim();

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getBooleanish(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (raw === true || raw === 1) return true;
    if (raw === false || raw === 0 || raw === null || raw === undefined) return false;

    if (typeof raw === "object" && raw.name) {
        return ["1", "true", "yes", "checked", "active"].includes(
            String(raw.name).trim().toLowerCase()
        );
    }

    const text = String(record.getCellValueAsString(fieldName) || "")
        .trim()
        .toLowerCase();

    return ["1", "true", "yes", "checked", "active"].includes(text);
}

function getLinkedRecordIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (!Array.isArray(raw)) return [];

    return raw
        .map((item) => item?.id)
        .filter(Boolean);
}

function buildCellValueForField(table, fieldName, value) {
    const field = getFieldSafe(table, fieldName);

    if (!field) {
        throw new Error(`Field not found: ${table.name} -> ${fieldName}`);
    }

    if (field.type === "singleSelect") return { name: value };
    if (field.type === "multipleSelects") return [{ name: value }];

    return value;
}

function hasSingleSelectChoice(table, fieldName, choiceName) {
    const field = getFieldSafe(table, fieldName);

    if (!field || field.type !== "singleSelect") return true;

    const choices = field.options?.choices || [];
    return choices.some((choice) => choice.name === choiceName);
}

function uniqueFields(fields) {
    return [...new Set(fields.filter(Boolean))];
}

function buildHomeworkFieldsToLoad() {
    const fields = [
        CONFIG.homework.homework,
        CONFIG.homework.enrollment,
        CONFIG.homework.week,
        CONFIG.homework.submissionDate,

        CONFIG.homework.satisfactory,
        CONFIG.homework.reviewComplete,
        CONFIG.homework.coachFeedback,

        CONFIG.homework.baseXpAwarded,
        CONFIG.homework.extraCreditXpAwarded,
        CONFIG.homework.totalHomeworkXpAwarded,

        CONFIG.homework.awardStatus,
    ];

    const optionalFields = [
        CONFIG.homework.reviewedAt,
        CONFIG.homework.reviewedBy,
        CONFIG.homework.automationError,
    ];

    for (const fieldName of optionalFields) {
        if (fieldExists(homeworkTable, fieldName)) {
            fields.push(fieldName);
        }
    }

    return uniqueFields(fields);
}

function buildXpRuleFieldsToLoad() {
    return [
        CONFIG.xpRules.ruleKey,
        CONFIG.xpRules.xpAmount,
        CONFIG.xpRules.active,
    ];
}

async function rearmShotMilestoneCheck(enrollmentId) {
    if (!enrollmentId) return false;

    const fieldName = CONFIG.enrollments.runShotMilestoneCheck;

    if (!fieldExists(enrollmentsTable, fieldName)) {
        log("Shot milestone re-arm skipped because field is missing", {
            table: CONFIG.tables.enrollments,
            fieldName,
            enrollmentId,
        });
        return false;
    }

    if (!isWritableField(enrollmentsTable, fieldName)) {
        log("Shot milestone re-arm skipped because field is not writable", {
            table: CONFIG.tables.enrollments,
            fieldName,
            enrollmentId,
        });
        return false;
    }

    await enrollmentsTable.updateRecordAsync(enrollmentId, {
        [fieldName]: true,
    });

    return true;
}

async function markError(message) {
    const fields = {};

    if (
        fieldExists(homeworkTable, CONFIG.homework.awardStatus) &&
        isWritableField(homeworkTable, CONFIG.homework.awardStatus)
    ) {
        fields[CONFIG.homework.awardStatus] = buildCellValueForField(
            homeworkTable,
            CONFIG.homework.awardStatus,
            CONFIG.values.errorStatus
        );
    }

    if (
        fieldExists(homeworkTable, CONFIG.homework.automationError) &&
        isWritableField(homeworkTable, CONFIG.homework.automationError)
    ) {
        fields[CONFIG.homework.automationError] = String(message || "");
    }

    if (Object.keys(fields).length > 0) {
        await homeworkTable.updateRecordAsync(recordId, fields);
    }
}


/************************************************************************************************
 * SECTION 5 — FIELD VALIDATION
 ************************************************************************************************/

for (const fieldName of [
    CONFIG.homework.homework,
    CONFIG.homework.enrollment,
    CONFIG.homework.week,
    CONFIG.homework.submissionDate,

    CONFIG.homework.satisfactory,
    CONFIG.homework.reviewComplete,
    CONFIG.homework.coachFeedback,

    CONFIG.homework.baseXpAwarded,
    CONFIG.homework.extraCreditXpAwarded,
    CONFIG.homework.totalHomeworkXpAwarded,

    CONFIG.homework.awardStatus,
]) {
    requireField(homeworkTable, fieldName);
}

for (const fieldName of [
    CONFIG.homework.baseXpAwarded,
    CONFIG.homework.awardStatus,
]) {
    requireWritableField(homeworkTable, fieldName);
}

requireWritableField(
    enrollmentsTable,
    CONFIG.enrollments.runShotMilestoneCheck
);

for (const fieldName of buildXpRuleFieldsToLoad()) {
    requireField(xpRulesTable, fieldName);
}

if (!hasSingleSelectChoice(homeworkTable, CONFIG.homework.awardStatus, CONFIG.values.pendingStatus)) {
    throw new Error(
        `Missing single-select option "${CONFIG.values.pendingStatus}" on Homework Completions -> Award Status.`
    );
}

if (!hasSingleSelectChoice(homeworkTable, CONFIG.homework.awardStatus, CONFIG.values.errorStatus)) {
    throw new Error(
        `Missing single-select option "${CONFIG.values.errorStatus}" on Homework Completions -> Award Status.`
    );
}


/************************************************************************************************
 * SECTION 6 — MAIN
 ************************************************************************************************/

async function main() {
    let homeworkRecord = null;
    let debugStep = "1 - Start";

    try {
        setOutputSafe("debugStep", debugStep);

        debugStep = "2 - Load Homework Completion";
        setOutputSafe("debugStep", debugStep);

        homeworkRecord = await homeworkTable.selectRecordAsync(recordId, {
            fields: buildHomeworkFieldsToLoad(),
        });

        if (!homeworkRecord) {
            throw new Error(`Homework Completion not found: ${recordId}`);
        }

        debugStep = "3 - Read Homework Completion Values";
        setOutputSafe("debugStep", debugStep);

        const enrollmentIds = getLinkedRecordIds(homeworkRecord, homeworkTable, CONFIG.homework.enrollment);
        const homeworkIds = getLinkedRecordIds(homeworkRecord, homeworkTable, CONFIG.homework.homework);
        const weekIds = getLinkedRecordIds(homeworkRecord, homeworkTable, CONFIG.homework.week);

        const enrollmentId = enrollmentIds[0] || "";

        const submissionDate = getRaw(homeworkRecord, homeworkTable, CONFIG.homework.submissionDate);
        const satisfactory = getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.satisfactory);
        const reviewComplete = getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.reviewComplete);
        const coachFeedback = getText(homeworkRecord, homeworkTable, CONFIG.homework.coachFeedback);

        const existingBaseXp = getNumber(homeworkRecord, homeworkTable, CONFIG.homework.baseXpAwarded);
        const extraCreditXp = getNumber(homeworkRecord, homeworkTable, CONFIG.homework.extraCreditXpAwarded);

        log("064 input", {
            recordId,
            enrollmentIds,
            homeworkIds,
            weekIds,
            submissionDate,
            satisfactory,
            reviewComplete,
            coachFeedbackPresent: Boolean(coachFeedback),
            existingBaseXp,
            extraCreditXp,
        });

        debugStep = "4 - Validate Grading Gate";
        setOutputSafe("debugStep", debugStep);

        if (!enrollmentIds.length) throw new Error("Missing Enrollment.");
        if (!homeworkIds.length) throw new Error("Missing Homework.");
        if (!weekIds.length) throw new Error("Missing Week.");
        if (!submissionDate) throw new Error("Missing Submission Date.");
        if (!coachFeedback) throw new Error("Coach Feedback is blank.");
        if (!satisfactory) throw new Error("Satisfactory? is not checked.");
        if (!reviewComplete) throw new Error("Review Complete is not checked.");

        if (existingBaseXp > 0) {
            debugStep = "5 - Existing Base XP Found - Re-arm Shot Milestones";
            setOutputSafe("debugStep", debugStep);

            const shotMilestoneRearmed = await rearmShotMilestoneCheck(enrollmentId);

            setOutputs({
                ok: true,
                result: "Skipped: Base XP Awarded is already filled. Shot milestone check re-armed.",
                homeworkCompletionId: recordId,
                enrollmentId,
                existingBaseXp,
                shotMilestoneRearmed,
                debugStep,
            });

            return;
        }

        debugStep = "5 - Load XP Reward Rule";
        setOutputSafe("debugStep", debugStep);

        const xpRuleQuery = await xpRulesTable.selectRecordsAsync({
            fields: buildXpRuleFieldsToLoad(),
        });

        const matchingRules = xpRuleQuery.records.filter((rule) => {
            const ruleKey = getText(rule, xpRulesTable, CONFIG.xpRules.ruleKey);
            const active = getBooleanish(rule, xpRulesTable, CONFIG.xpRules.active);

            return ruleKey === CONFIG.values.homeworkRuleKey && active;
        });

        if (matchingRules.length === 0) {
            throw new Error(`No active XP Reward Rule found for Rule Key: ${CONFIG.values.homeworkRuleKey}`);
        }

        if (matchingRules.length > 1) {
            throw new Error(
                `Multiple active XP Reward Rules found for Rule Key ${CONFIG.values.homeworkRuleKey}: ${matchingRules.map((rule) => rule.id).join(", ")}`
            );
        }

        const baseXp = getNumber(matchingRules[0], xpRulesTable, CONFIG.xpRules.xpAmount);

        if (!baseXp || baseXp <= 0) {
            throw new Error(`Invalid XP Amount for Rule Key: ${CONFIG.values.homeworkRuleKey}`);
        }

        debugStep = "6 - Update Homework Completion";
        setOutputSafe("debugStep", debugStep);

        const updateFields = {
            [CONFIG.homework.baseXpAwarded]: baseXp,

            [CONFIG.homework.awardStatus]: buildCellValueForField(
                homeworkTable,
                CONFIG.homework.awardStatus,
                CONFIG.values.pendingStatus
            ),
        };

        const now = new Date();

        if (fieldExists(homeworkTable, CONFIG.homework.reviewedAt) && isWritableField(homeworkTable, CONFIG.homework.reviewedAt)) {
            updateFields[CONFIG.homework.reviewedAt] = now;
        }

        if (fieldExists(homeworkTable, CONFIG.homework.reviewedBy) && isWritableField(homeworkTable, CONFIG.homework.reviewedBy)) {
            updateFields[CONFIG.homework.reviewedBy] = CONFIG.values.reviewedBy;
        }

        if (fieldExists(homeworkTable, CONFIG.homework.automationError) && isWritableField(homeworkTable, CONFIG.homework.automationError)) {
            updateFields[CONFIG.homework.automationError] = "";
        }

        await homeworkTable.updateRecordAsync(recordId, updateFields);

        debugStep = "7 - Re-arm Shot Milestone Check";
        setOutputSafe("debugStep", debugStep);

        const shotMilestoneRearmed = await rearmShotMilestoneCheck(enrollmentId);

        debugStep = "8 - Complete";
        setOutputSafe("debugStep", debugStep);

        setOutputs({
            ok: true,
            result: "Homework base XP prepared. Award Status set to Pending. Shot milestone check re-armed.",
            homeworkCompletionId: recordId,
            enrollmentId,
            baseXp,
            extraCreditXp,
            awardStatus: CONFIG.values.pendingStatus,
            shotMilestoneRearmed,
            debugStep,
        });
    } catch (error) {
        log("064 error", {
            recordId,
            debugStep,
            error: error.message,
        });

        if (homeworkRecord) {
            try {
                await markError(error.message);
            } catch (markErrorProblem) {
                log("Could not mark error on Homework Completion", {
                    recordId,
                    markErrorProblem: markErrorProblem.message,
                });
            }
        }

        setOutputs({
            ok: false,
            result: "Error",
            errorOut: error.message,
            homeworkCompletionId: recordId,
            debugStep,
        });

        throw error;
    }
}


/************************************************************************************************
 * SECTION 7 — RUN
 ************************************************************************************************/

await main();

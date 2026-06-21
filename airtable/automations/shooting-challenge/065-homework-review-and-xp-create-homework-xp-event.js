/*
Automation: 065 - Homework Review and XP - Create Homework XP Event
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-21
Last GitHub Update: 2026-06-21

Purpose:
Creates Homework Completion XP Events from reviewed homework records.

Trigger:
Homework Completions when review is complete, satisfactory, and XP is pending.

Important Tables:
Homework Completions, XP Events, Weekly Athlete Summary

Important Fields:
Satisfactory?, Review Complete, Total Homework XP Awarded, Weekly Athlete Summary Link, XP Events

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************************************************
 * 065 - Homework Review and XP - Create Homework XP Event
 *
 * Version: v9.2
 * Date Written: 2026-06-06
 * Last Updated: 2026-06-21
 *
 * PURPOSE
 * - Reads one Homework Completions record after 064 prepares it.
 * - Requires:
 *      Coach Feedback is not blank
 *      Satisfactory? is checked
 *      Review Complete is checked
 *      Base XP Awarded > 0
 *      Total Homework XP Awarded > 0
 *      Award Status = Pending
 *      XP Events is empty
 * - Creates exactly one XP Event for the Homework Completion.
 * - Links the XP Event to Weekly Athlete Summary from Homework Completion or Enrollment + Week lookup.
 * - Links the XP Event back to the Homework Completion.
 * - Sets Award Status = Awarded.
 *
 * IMPORTANT
 * - This script uses XP Events -> XP Bucket only.
 * - This script does NOT use XP Bucket Key.
 * - This script does NOT require Parent Feedback Ready?.
 * - This script does NOT mark Parent Feedback Sent?.
 * - This script does NOT fill Parent Feedback Sent On.
 *
 * FOLDER
 * - 06 - Homework Review and XP
 *
 * AUTOMATION NAME
 * - 065 - Homework Review and XP - Create Homework XP Event
 *
 * TRIGGER TABLE
 * - Homework Completions
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED INPUT
 * - recordId = triggering Homework Completions record ID
 *
 * REQUIRED OUTPUTS
 * - statusOut = created | updated | skipped | error
 * - actionOut
 * - errorOut
 * - debugStep
 ************************************************************************************************/

// @ts-nocheck

/************************************************************************************************
 * SECTION 1 — CONFIGURATION
 ************************************************************************************************/

const CONFIG = {
    scriptName: "065 - Homework Review and XP - Create Homework XP Event",
    version: "v9.2",

    tables: {
        homeworkCompletions: "Homework Completions",
        xpEvents: "XP Events",
        weeklySummary: "Weekly Athlete Summary",
    },

    homework: {
        enrollment: "Enrollment",
        homework: "Homework",
        week: "Week",
        weeklySummary: "Weekly Athlete Summary Link",
        submission: "Submissions - Linked",

        satisfactory: "Satisfactory?",
        reviewComplete: "Review Complete",
        coachFeedback: "Coach Feedback",

        baseXp: "Base XP Awarded",
        extraXp: "Extra Credit XP Awarded",
        totalXp: "Total Homework XP Awarded",

        awardStatus: "Award Status",
        xpEvents: "XP Events",
        completionKey: "Homework Completion Key",

        submissionDateDateOnly: "Submission Date - Date Only",
        submissionDate: "Submission Date",

        automationError: "Automation Error",
    },

    weeklySummary: {
        enrollment: "Enrollment",
        week: "Week",
    },

    xpEvents: {
        enrollment: "Enrollment",
        week: "Week",
        weeklySummary: "Weekly Athlete Summary",
        submission: "Submission",
        homeworkCompletion: "Homework Completion",

        xpBucket: "XP Bucket",
        xpSource: "XP Source",
        xpPoints: "XP Points",

        sourceKey: "Source Key",

        xpActivityDateCandidates: [
            "XP Activity Date",
            "XP Source Date",
        ],

        xpActivityDateSourceCandidates: [
            "XP Activity Date Source",
            "XP Date Source",
        ],

        reasonPublic: "XP Reason Public",
        reasonDebug: "XP Reason Debug",

        awardedAt: "Awarded At",
        active: "Active?",
        processed: "Processed",
    },

    values: {
        xpBucketName: "Homework Completion",
        xpSourceName: "Homework Completion",
        xpActivityDateSourceName: "Homework Submission Activity Date",

        pendingStatus: "Pending",
        awardedStatus: "Awarded",
        errorStatus: "Error",

        sourceKeyPrefix: "HOMEWORK_XP|",
    },

    outputStatuses: {
        created: "created",
        updated: "updated",
        skipped: "skipped",
        error: "error",
    },

    debug: {
        logToConsole: true,
    },
};


let homeworkTable = null;
let xpEventsTable = null;
let weeklySummaryTable = null;
let weeklySummaryQueryCache = null;
let writableXpActivityDateField = "";
let writableXpActivityDateSourceField = "";


/************************************************************************************************
 * SECTION 2 — HELPERS
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

function getFirstWritableFieldName(table, fieldNames) {
    for (const fieldName of fieldNames) {
        if (fieldExists(table, fieldName) && isWritableField(table, fieldName)) {
            return fieldName;
        }
    }

    return "";
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

function getLinkedRecordName(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (Array.isArray(raw) && raw.length > 0) {
        return raw[0]?.name || "";
    }

    return "";
}

function linkedCell(ids) {
    return [...new Set((ids || []).filter(Boolean))].map((id) => ({ id }));
}

function uniqueIds(ids) {
    return [...new Set((ids || []).filter(Boolean))];
}

async function loadWeeklySummaryQuery() {
    if (weeklySummaryQueryCache) {
        return weeklySummaryQueryCache;
    }

    weeklySummaryQueryCache = await weeklySummaryTable.selectRecordsAsync({
        fields: [
            CONFIG.weeklySummary.enrollment,
            CONFIG.weeklySummary.week,
        ],
    });

    return weeklySummaryQueryCache;
}

async function findWeeklySummaryId(enrollmentId, weekId) {
    const cleanEnrollmentId = String(enrollmentId || "").trim();
    const cleanWeekId = String(weekId || "").trim();

    if (!cleanEnrollmentId || !cleanWeekId) {
        return "";
    }

    const query = await loadWeeklySummaryQuery();

    const matches = query.records.filter((record) => {
        const summaryEnrollmentIds = getLinkedRecordIds(
            record,
            weeklySummaryTable,
            CONFIG.weeklySummary.enrollment
        );
        const summaryWeekIds = getLinkedRecordIds(
            record,
            weeklySummaryTable,
            CONFIG.weeklySummary.week
        );

        return (
            summaryEnrollmentIds.includes(cleanEnrollmentId) &&
            summaryWeekIds.includes(cleanWeekId)
        );
    });

    if (matches.length > 1) {
        throw new Error(
            `Multiple Weekly Athlete Summary records for Enrollment ${cleanEnrollmentId} + Week ${cleanWeekId}: ${matches.map((record) => record.id).join(", ")}`
        );
    }

    return matches.length === 1 ? matches[0].id : "";
}

async function resolveWeeklySummaryId({
    sourceWeeklySummaryIds = [],
    enrollmentId = "",
    weekId = "",
}) {
    const fromSource = uniqueIds(sourceWeeklySummaryIds);

    if (fromSource.length === 1) {
        return fromSource[0];
    }

    if (fromSource.length > 1) {
        throw new Error(
            `Source record has multiple Weekly Athlete Summary links: ${fromSource.join(", ")}`
        );
    }

    return findWeeklySummaryId(enrollmentId, weekId);
}

function addWeeklySummaryLink(payload, table, fieldName, weeklySummaryId) {
    if (!weeklySummaryId) {
        return payload;
    }

    if (!fieldExists(table, fieldName) || !isWritableField(table, fieldName)) {
        return payload;
    }

    payload[fieldName] = linkedCell([weeklySummaryId]);
    return payload;
}

async function ensureXpEventWeeklySummaryLink(xpEventId, weeklySummaryId) {
    if (!xpEventId || !weeklySummaryId) {
        return false;
    }

    const payload = {};
    addWeeklySummaryLink(
        payload,
        xpEventsTable,
        CONFIG.xpEvents.weeklySummary,
        weeklySummaryId
    );

    if (Object.keys(payload).length === 0) {
        return false;
    }

    await xpEventsTable.updateRecordAsync(xpEventId, payload);
    return true;
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

function buildSourceKey(homeworkCompletionId) {
    return `${CONFIG.values.sourceKeyPrefix}${homeworkCompletionId}`;
}

function getDateValue(record, table, fieldNames) {
    for (const fieldName of fieldNames) {
        if (!fieldName || !fieldExists(table, fieldName)) continue;

        const value = record.getCellValue(fieldName);

        if (!value) continue;

        if (value instanceof Date && !isNaN(value)) {
            return value;
        }

        if (typeof value === "string") {
            const parsed = new Date(value);
            if (!isNaN(parsed)) return parsed;
        }

        if (Array.isArray(value) && value.length > 0) {
            const first = value[0];

            if (first instanceof Date && !isNaN(first)) {
                return first;
            }

            if (typeof first === "string") {
                const parsed = new Date(first);
                if (!isNaN(parsed)) return parsed;
            }
        }
    }

    return null;
}

function buildHomeworkFieldsToLoad() {
    const fields = [
        CONFIG.homework.enrollment,
        CONFIG.homework.homework,
        CONFIG.homework.week,

        CONFIG.homework.satisfactory,
        CONFIG.homework.reviewComplete,
        CONFIG.homework.coachFeedback,

        CONFIG.homework.baseXp,
        CONFIG.homework.extraXp,
        CONFIG.homework.totalXp,

        CONFIG.homework.awardStatus,
        CONFIG.homework.xpEvents,
        CONFIG.homework.completionKey,
    ];

    const optionalFields = [
        CONFIG.homework.weeklySummary,
        CONFIG.homework.submission,
        CONFIG.homework.submissionDateDateOnly,
        CONFIG.homework.submissionDate,
        CONFIG.homework.automationError,
    ];

    for (const fieldName of optionalFields) {
        if (fieldExists(homeworkTable, fieldName)) {
            fields.push(fieldName);
        }
    }

    return uniqueFields(fields);
}

function buildXpEventFieldsToLoad() {
    return uniqueFields([
        CONFIG.xpEvents.sourceKey,
        CONFIG.xpEvents.homeworkCompletion,
    ]);
}

async function markHomeworkError(homeworkRecordId, message) {
    const fields = {};

    if (fieldExists(homeworkTable, CONFIG.homework.awardStatus) && isWritableField(homeworkTable, CONFIG.homework.awardStatus)) {
        fields[CONFIG.homework.awardStatus] = buildCellValueForField(
            homeworkTable,
            CONFIG.homework.awardStatus,
            CONFIG.values.errorStatus
        );
    }

    if (fieldExists(homeworkTable, CONFIG.homework.automationError) && isWritableField(homeworkTable, CONFIG.homework.automationError)) {
        fields[CONFIG.homework.automationError] = String(message || "");
    }

    if (Object.keys(fields).length > 0) {
        await homeworkTable.updateRecordAsync(homeworkRecordId, fields);
    }
}


function assertRequiredSchema() {
    for (const fieldName of [
        CONFIG.homework.enrollment,
        CONFIG.homework.homework,
        CONFIG.homework.week,

        CONFIG.homework.satisfactory,
        CONFIG.homework.reviewComplete,
        CONFIG.homework.coachFeedback,

        CONFIG.homework.baseXp,
        CONFIG.homework.extraXp,
        CONFIG.homework.totalXp,

        CONFIG.homework.awardStatus,
        CONFIG.homework.xpEvents,
        CONFIG.homework.completionKey,
    ]) {
        requireField(homeworkTable, fieldName);
    }

    for (const fieldName of [
        CONFIG.homework.awardStatus,
        CONFIG.homework.xpEvents,
    ]) {
        requireWritableField(homeworkTable, fieldName);
    }

    for (const fieldName of [
        CONFIG.xpEvents.enrollment,
        CONFIG.xpEvents.week,
        CONFIG.xpEvents.weeklySummary,
        CONFIG.xpEvents.homeworkCompletion,

        CONFIG.xpEvents.xpBucket,
        CONFIG.xpEvents.xpSource,
        CONFIG.xpEvents.xpPoints,

        CONFIG.xpEvents.sourceKey,
    ]) {
        requireWritableField(xpEventsTable, fieldName);
    }

    writableXpActivityDateField = getFirstWritableFieldName(
        xpEventsTable,
        CONFIG.xpEvents.xpActivityDateCandidates
    );

    writableXpActivityDateSourceField = getFirstWritableFieldName(
        xpEventsTable,
        CONFIG.xpEvents.xpActivityDateSourceCandidates
    );

    if (!writableXpActivityDateField) {
        throw new Error(
            `Missing writable XP activity date field. Expected one of: ${CONFIG.xpEvents.xpActivityDateCandidates.join(", ")}`
        );
    }

    if (!writableXpActivityDateSourceField) {
        throw new Error(
            `Missing writable XP activity date source field. Expected one of: ${CONFIG.xpEvents.xpActivityDateSourceCandidates.join(", ")}`
        );
    }

    if (!hasSingleSelectChoice(homeworkTable, CONFIG.homework.awardStatus, CONFIG.values.pendingStatus)) {
        throw new Error(
            `Missing single-select option "${CONFIG.values.pendingStatus}" on Homework Completions -> Award Status.`
        );
    }

    if (!hasSingleSelectChoice(homeworkTable, CONFIG.homework.awardStatus, CONFIG.values.awardedStatus)) {
        throw new Error(
            `Missing single-select option "${CONFIG.values.awardedStatus}" on Homework Completions -> Award Status.`
        );
    }

    if (!hasSingleSelectChoice(homeworkTable, CONFIG.homework.awardStatus, CONFIG.values.errorStatus)) {
        throw new Error(
            `Missing single-select option "${CONFIG.values.errorStatus}" on Homework Completions -> Award Status.`
        );
    }

    if (!hasSingleSelectChoice(xpEventsTable, CONFIG.xpEvents.xpBucket, CONFIG.values.xpBucketName)) {
        throw new Error(
            `Missing single-select option "${CONFIG.values.xpBucketName}" on XP Events -> XP Bucket.`
        );
    }

    if (!hasSingleSelectChoice(xpEventsTable, CONFIG.xpEvents.xpSource, CONFIG.values.xpSourceName)) {
        throw new Error(
            `Missing single-select option "${CONFIG.values.xpSourceName}" on XP Events -> XP Source.`
        );
    }

    if (!hasSingleSelectChoice(xpEventsTable, writableXpActivityDateSourceField, CONFIG.values.xpActivityDateSourceName)) {
        throw new Error(
            `Missing single-select option "${CONFIG.values.xpActivityDateSourceName}" on XP Events -> ${writableXpActivityDateSourceField}.`
        );
    }
}


/************************************************************************************************
 * SECTION 3 — MAIN
 ************************************************************************************************/

async function main() {
    let homeworkRecord = null;
    let debugStep = "1 - Start";
    let recordId = "";

    try {
        setOutputSafe("debugStep", debugStep);

        debugStep = "2 - Read Input";
        setOutputSafe("debugStep", debugStep);

        const inputConfig = input.config();
        recordId = String(inputConfig.recordId || "").trim();

        if (!recordId) {
            throw new Error("Missing required input variable: recordId");
        }

        if (!recordId.startsWith("rec")) {
            throw new Error(`Invalid Homework Completions recordId input: ${recordId}`);
        }

        debugStep = "3 - Load Tables";
        setOutputSafe("debugStep", debugStep);

        homeworkTable = base.getTable(CONFIG.tables.homeworkCompletions);
        xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
        weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
        weeklySummaryQueryCache = null;

        debugStep = "4 - Validate Schema";
        setOutputSafe("debugStep", debugStep);
        assertRequiredSchema();

        debugStep = "5 - Load Homework Completion";
        setOutputSafe("debugStep", debugStep);

        homeworkRecord = await homeworkTable.selectRecordAsync(recordId, {
            fields: buildHomeworkFieldsToLoad(),
        });

        if (!homeworkRecord) {
            throw new Error(`Homework Completion not found: ${recordId}`);
        }

        debugStep = "6 - Read Homework Completion Values";
        setOutputSafe("debugStep", debugStep);

        const enrollmentIds = getLinkedRecordIds(homeworkRecord, homeworkTable, CONFIG.homework.enrollment);
        const homeworkIds = getLinkedRecordIds(homeworkRecord, homeworkTable, CONFIG.homework.homework);
        const weekIds = getLinkedRecordIds(homeworkRecord, homeworkTable, CONFIG.homework.week);

        const weeklySummaryIds = fieldExists(homeworkTable, CONFIG.homework.weeklySummary)
            ? getLinkedRecordIds(homeworkRecord, homeworkTable, CONFIG.homework.weeklySummary)
            : [];

        const submissionIds = fieldExists(homeworkTable, CONFIG.homework.submission)
            ? getLinkedRecordIds(homeworkRecord, homeworkTable, CONFIG.homework.submission)
            : [];

        const existingXpEventIds = getLinkedRecordIds(homeworkRecord, homeworkTable, CONFIG.homework.xpEvents);

        const satisfactory = getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.satisfactory);
        const reviewComplete = getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.reviewComplete);
        const coachFeedback = getText(homeworkRecord, homeworkTable, CONFIG.homework.coachFeedback);

        const awardStatus = getText(homeworkRecord, homeworkTable, CONFIG.homework.awardStatus);
        const baseXp = getNumber(homeworkRecord, homeworkTable, CONFIG.homework.baseXp);
        const extraXp = getNumber(homeworkRecord, homeworkTable, CONFIG.homework.extraXp);
        const totalXp = getNumber(homeworkRecord, homeworkTable, CONFIG.homework.totalXp);

        const completionKey = getText(homeworkRecord, homeworkTable, CONFIG.homework.completionKey);

        const activityDate = getDateValue(homeworkRecord, homeworkTable, [
            CONFIG.homework.submissionDateDateOnly,
            CONFIG.homework.submissionDate,
        ]);

        const sourceKey = buildSourceKey(recordId);

        log("065 input", {
            recordId,
            enrollmentIds,
            homeworkIds,
            weekIds,
            weeklySummaryIds,
            submissionIds,
            existingXpEventIds,
            satisfactory,
            reviewComplete,
            coachFeedbackPresent: Boolean(coachFeedback),
            awardStatus,
            baseXp,
            extraXp,
            totalXp,
            completionKey,
            activityDate,
            sourceKey,
        });

        debugStep = "7 - Validate Homework Completion";
        setOutputSafe("debugStep", debugStep);

        if (!enrollmentIds.length) throw new Error("Missing Enrollment.");
        if (!homeworkIds.length) throw new Error("Missing Homework.");
        if (!weekIds.length) throw new Error("Missing Week.");
        if (!completionKey) throw new Error("Missing Homework Completion Key.");
        if (!activityDate) throw new Error("Missing Submission Date.");
        if (!coachFeedback) throw new Error("Coach Feedback is blank.");
        if (!satisfactory) throw new Error("Satisfactory? is not checked.");
        if (!reviewComplete) throw new Error("Review Complete is not checked.");

        if (awardStatus !== CONFIG.values.pendingStatus) {
            setOutputs({
                ok: true,
                statusOut: CONFIG.outputStatuses.skipped,
                actionOut: "skipped_award_status_not_pending",
                errorOut: "",
                result: `Skipped: Award Status is "${awardStatus || "blank"}", not Pending.`,
                homeworkCompletionId: recordId,
                awardStatus,
                debugStep,
            });
            return;
        }

        if (baseXp <= 0) {
            throw new Error(`Base XP Awarded must be greater than 0. Current value: ${baseXp}`);
        }

        if (totalXp <= 0) {
            throw new Error(`Total Homework XP Awarded must be greater than 0. Current value: ${totalXp}`);
        }

        debugStep = "8 - Load Existing XP Events";
        setOutputSafe("debugStep", debugStep);

        const xpEventQuery = await xpEventsTable.selectRecordsAsync({
            fields: buildXpEventFieldsToLoad(),
        });

        const existingXpEventBySourceKey = xpEventQuery.records.find((record) => {
            return getText(record, xpEventsTable, CONFIG.xpEvents.sourceKey) === sourceKey;
        });

        let xpEventId = "";
        let actionOut = "";

        if (existingXpEventIds.length > 1) {
            throw new Error(
                `Homework Completion already has multiple linked XP Events. Review manually: ${existingXpEventIds.join(", ")}`
            );
        }

        if (existingXpEventIds.length === 1) {
            xpEventId = existingXpEventIds[0];
            actionOut = "existing_linked_xp_event";

            const weeklySummaryId = await resolveWeeklySummaryId({
                sourceWeeklySummaryIds: weeklySummaryIds,
                enrollmentId: enrollmentIds[0] || "",
                weekId: weekIds[0] || "",
            });

            await ensureXpEventWeeklySummaryLink(xpEventId, weeklySummaryId);

            await homeworkTable.updateRecordAsync(recordId, {
                [CONFIG.homework.awardStatus]: buildCellValueForField(
                    homeworkTable,
                    CONFIG.homework.awardStatus,
                    CONFIG.values.awardedStatus
                ),
            });

            setOutputs({
                ok: true,
                statusOut: CONFIG.outputStatuses.updated,
                actionOut,
                errorOut: "",
                result: "Skipped: XP Event already linked. Marked Awarded.",
                homeworkCompletionId: recordId,
                xpEventId,
                weeklySummaryId: weeklySummaryId || "",
                sourceKey,
                debugStep,
            });
            return;
        }

        if (existingXpEventBySourceKey) {
            xpEventId = existingXpEventBySourceKey.id;
            actionOut = "linked_existing_xp_event_by_source_key";

            const weeklySummaryId = await resolveWeeklySummaryId({
                sourceWeeklySummaryIds: weeklySummaryIds,
                enrollmentId: enrollmentIds[0] || "",
                weekId: weekIds[0] || "",
            });

            await ensureXpEventWeeklySummaryLink(xpEventId, weeklySummaryId);

            await homeworkTable.updateRecordAsync(recordId, {
                [CONFIG.homework.xpEvents]: linkedCell([xpEventId]),

                [CONFIG.homework.awardStatus]: buildCellValueForField(
                    homeworkTable,
                    CONFIG.homework.awardStatus,
                    CONFIG.values.awardedStatus
                ),
            });

            setOutputs({
                ok: true,
                statusOut: CONFIG.outputStatuses.updated,
                actionOut,
                errorOut: "",
                result: "Existing XP Event found by Source Key. Linked and marked Awarded.",
                homeworkCompletionId: recordId,
                xpEventId,
                weeklySummaryId: weeklySummaryId || "",
                sourceKey,
                debugStep,
            });
            return;
        }

        debugStep = "9 - Build XP Event";
        setOutputSafe("debugStep", debugStep);

        const athleteName = getLinkedRecordName(homeworkRecord, homeworkTable, CONFIG.homework.enrollment) || "Athlete";
        const homeworkName = getLinkedRecordName(homeworkRecord, homeworkTable, CONFIG.homework.homework) || "Homework";
        const weekName = getLinkedRecordName(homeworkRecord, homeworkTable, CONFIG.homework.week) || "Week";

        const publicReason = `Homework completed: ${homeworkName}`;

        const debugReason = [
            `Homework XP created from Homework Completion ${recordId}.`,
            `Athlete: ${athleteName}`,
            `Week: ${weekName}`,
            `Homework: ${homeworkName}`,
            `Base XP: ${baseXp}`,
            `Extra Credit XP: ${extraXp}`,
            `Total XP: ${totalXp}`,
            `Homework Completion Key: ${completionKey}`,
            `Source Key: ${sourceKey}`,
            `XP Activity Date Field: ${writableXpActivityDateField}`,
            `XP Activity Date Source Field: ${writableXpActivityDateSourceField}`,
            `XP Activity Date Source: ${CONFIG.values.xpActivityDateSourceName}`,
            `XP Activity Date: ${activityDate.toISOString()}`,
        ].join("\n");

        const weeklySummaryId = await resolveWeeklySummaryId({
            sourceWeeklySummaryIds: weeklySummaryIds,
            enrollmentId: enrollmentIds[0] || "",
            weekId: weekIds[0] || "",
        });

        const createFields = {
            [CONFIG.xpEvents.enrollment]: linkedCell(enrollmentIds),
            [CONFIG.xpEvents.week]: linkedCell(weekIds),
            [CONFIG.xpEvents.homeworkCompletion]: linkedCell([recordId]),

            [CONFIG.xpEvents.xpBucket]: buildCellValueForField(
                xpEventsTable,
                CONFIG.xpEvents.xpBucket,
                CONFIG.values.xpBucketName
            ),

            [CONFIG.xpEvents.xpSource]: buildCellValueForField(
                xpEventsTable,
                CONFIG.xpEvents.xpSource,
                CONFIG.values.xpSourceName
            ),

            [CONFIG.xpEvents.xpPoints]: totalXp,
            [CONFIG.xpEvents.sourceKey]: sourceKey,

            [writableXpActivityDateField]: activityDate,

            [writableXpActivityDateSourceField]: buildCellValueForField(
                xpEventsTable,
                writableXpActivityDateSourceField,
                CONFIG.values.xpActivityDateSourceName
            ),
        };

        addWeeklySummaryLink(
            createFields,
            xpEventsTable,
            CONFIG.xpEvents.weeklySummary,
            weeklySummaryId
        );

        if (fieldExists(xpEventsTable, CONFIG.xpEvents.submission) && isWritableField(xpEventsTable, CONFIG.xpEvents.submission) && submissionIds.length) {
            createFields[CONFIG.xpEvents.submission] = linkedCell([submissionIds[0]]);
        }

        if (fieldExists(xpEventsTable, CONFIG.xpEvents.reasonPublic) && isWritableField(xpEventsTable, CONFIG.xpEvents.reasonPublic)) {
            createFields[CONFIG.xpEvents.reasonPublic] = publicReason;
        }

        if (fieldExists(xpEventsTable, CONFIG.xpEvents.reasonDebug) && isWritableField(xpEventsTable, CONFIG.xpEvents.reasonDebug)) {
            createFields[CONFIG.xpEvents.reasonDebug] = debugReason;
        }

        if (fieldExists(xpEventsTable, CONFIG.xpEvents.awardedAt) && isWritableField(xpEventsTable, CONFIG.xpEvents.awardedAt)) {
            createFields[CONFIG.xpEvents.awardedAt] = new Date();
        }

        if (fieldExists(xpEventsTable, CONFIG.xpEvents.active) && isWritableField(xpEventsTable, CONFIG.xpEvents.active)) {
            createFields[CONFIG.xpEvents.active] = true;
        }

        if (fieldExists(xpEventsTable, CONFIG.xpEvents.processed) && isWritableField(xpEventsTable, CONFIG.xpEvents.processed)) {
            createFields[CONFIG.xpEvents.processed] = true;
        }

        debugStep = "10 - Create XP Event";
        setOutputSafe("debugStep", debugStep);

        xpEventId = await xpEventsTable.createRecordAsync(createFields);
        actionOut = "created_new_xp_event";
        await ensureXpEventWeeklySummaryLink(xpEventId, weeklySummaryId);

        debugStep = "11 - Write Back to Homework Completion";
        setOutputSafe("debugStep", debugStep);

        const homeworkUpdateFields = {
            [CONFIG.homework.xpEvents]: linkedCell([xpEventId]),

            [CONFIG.homework.awardStatus]: buildCellValueForField(
                homeworkTable,
                CONFIG.homework.awardStatus,
                CONFIG.values.awardedStatus
            ),
        };

        if (fieldExists(homeworkTable, CONFIG.homework.automationError) && isWritableField(homeworkTable, CONFIG.homework.automationError)) {
            homeworkUpdateFields[CONFIG.homework.automationError] = "";
        }

        await homeworkTable.updateRecordAsync(recordId, homeworkUpdateFields);

        debugStep = "12 - Complete";
        setOutputSafe("debugStep", debugStep);

        setOutputs({
            ok: true,
            statusOut: CONFIG.outputStatuses.created,
            actionOut,
            errorOut: "",
            result: "Homework XP Event created and Homework Completion marked Awarded.",
            homeworkCompletionId: recordId,
            xpEventId,
            weeklySummaryId: weeklySummaryId || "",
            sourceKey,

            athlete: athleteName,
            homework: homeworkName,
            week: weekName,

            baseXp,
            extraXp,
            totalXp,

            xpBucket: CONFIG.values.xpBucketName,
            xpSource: CONFIG.values.xpSourceName,
            xpActivityDateSource: CONFIG.values.xpActivityDateSourceName,
            xpActivityDate: activityDate.toISOString(),

            debugStep,
        });

        console.log(JSON.stringify({
            automation: CONFIG.scriptName,
            version: CONFIG.version,
            statusOut: CONFIG.outputStatuses.created,
            actionOut,
            homeworkCompletionId: recordId,
            xpEventId,
            weeklySummaryId: weeklySummaryId || "",
            sourceKey,
            debugStep,
        }));
    } catch (error) {
        log("065 error", {
            recordId,
            debugStep,
            error: error.message,
        });

        if (homeworkRecord) {
            try {
                await markHomeworkError(recordId, error.message);
            } catch (markErrorProblem) {
                log("Could not mark error on Homework Completion", {
                    recordId,
                    markErrorProblem: markErrorProblem.message,
                });
            }
        }

        setOutputs({
            ok: false,
            statusOut: CONFIG.outputStatuses.error,
            actionOut: "error",
            result: "Error",
            errorOut: error.message,
            homeworkCompletionId: recordId,
            debugStep,
        });

        throw error;
    }
}


/************************************************************************************************
 * SECTION 4 — RUN
 ************************************************************************************************/

await main();

/*
Automation: 010 - Submission Intake and Asset Creation - Create XP Event from Submission
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-21
Last GitHub Update: 2026-06-22

Purpose:
Creates or repairs Submission Base XP Events from counted shooting submissions.

Trigger:
Submissions when Count This Submission? is checked and XP should be awarded.

Important Tables:
Submissions, XP Events, XP Reward Rules, Enrollments, Weekly Athlete Summary

Important Fields:
Count This Submission?, Total Shots Counted, XP Events, Weekly Athlete Summary, XP Award Status

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************************************************
 * 010 - Submission Intake and Asset Creation - Create XP Event from Submission
 *
 * Version: 10.4
 * Date Written: 2026-06-06
 * Last Updated: 2026-06-22
 *
 * PURPOSE
 * - Reads one Submission record.
 * - Confirms the Submission should receive daily shooting submission XP.
 * - Uses Total Shots Counted so both Simple Total and Detailed Shooting entries are supported.
 * - Prevents excluded, duplicate-review, homework-only, video-only, and zero-shot submissions
 *   from receiving daily shooting submission XP.
 * - Finds the active XP Reward Rule for SHOOTING_BASE.
 * - Finds an existing daily shooting XP Event using duplicate-safe checks.
 * - Repairs the existing XP Event when found.
 * - Creates a new XP Event only when no valid existing XP Event is found.
 * - Writes a simple public-facing reason to XP Reason Public.
 * - Writes technical audit wording to XP Reason Debug.
 * - Writes the XP activity/source date when a writable date field exists.
 * - Writes the XP activity/source date label when a writable select/text field exists.
 * - Links the XP Event back to the Submission.
 * - Links the XP Event to Weekly Athlete Summary when resolvable from the Submission
 *   or by Enrollment + Week lookup, with a repair pass after create/update.
 * - Marks Submission XP Award Status as Awarded.
 * - Re-arms Shot Milestone checking on the linked Enrollment after successful counted-shot XP processing.
 *
 * FOLDER
 * - 01 - Submission Intake and Asset Creation
 *
 * AUTOMATION NAME
 * - 010 - Submission Intake and Asset Creation - Create XP Event from Submission
 *
 * TRIGGER TABLE
 * - Submissions
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED INPUT
 * - recordId = triggering Submission record ID
 *
 * REQUIRED BUSINESS RULE
 * - Daily shooting submission XP is awarded only when:
 *      Count This Submission? = 1
 *      Total Shots Counted > 0
 *
 * IMPORTANT FIELD STANDARD
 * - XP Events -> XP Source = Submission Base
 * - XP Events -> XP Bucket = Shooting Base
 * - XP Reward Rules -> Rule Key = SHOOTING_BASE
 *
 * IMPORTANT DATE STANDARD
 * - Daily shooting submission XP uses Submissions -> Activity Date.
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Submissions -> XP Events = linked XP Event
 * - Submissions -> XP Award Status = Awarded
 * - XP Events -> Enrollment, Week, Submission, Weekly Athlete Summary, XP Source, XP Bucket,
 *   XP Points, XP Reason Public, XP Reason Debug, Active?, Source Key, optional date fields
 * - Enrollments -> Run Shot Milestone Check? = checked after successful XP processing
 *
 * REQUIRED OUTPUTS
 * - statusOut = created | updated | skipped | error
 * - actionOut
 * - errorOut
 * - debugStep
 *
 * IMPORTANT
 * - This script does not skip a record solely because XP Award Status is already Awarded.
 *   This allows a manual rerun to repair an existing XP Event.
 ************************************************************************************************/

// @ts-nocheck

/************************************************************************************************
 * SECTION 1 — CONFIGURATION
 ************************************************************************************************/

const CONFIG = {
    scriptName: "010 - Submission Intake and Asset Creation - Create XP Event from Submission",
    version: "10.4",

    tables: {
        submissions: "Submissions",
        xpEvents: "XP Events",
        xpRules: "XP Reward Rules",
        enrollments: "Enrollments",
        weeklySummary: "Weekly Athlete Summary",
    },

    submissions: {
        enrollment: "Enrollment",
        week: "Week",
        weeklySummary: "Weekly Athlete Summary",
        submissionKey: "Submission Key",
        activityDate: "Activity Date",

        totalShotsCounted: "Total Shots Counted",
        countThisSubmission: "Count This Submission?",

        xpAwardStatus: "XP Award Status",
        xpEvents: "XP Events",
    },

    weeklySummary: {
        enrollment: "Enrollment",
        week: "Week",
    },

    enrollments: {
        runShotMilestoneCheck: "Run Shot Milestone Check?",
    },

    xpRules: {
        ruleKey: "Rule Key",
        xpAmount: "XP Amount",
        active: "Active?",
    },

    xpEvents: {
        enrollment: "Enrollment",
        submission: "Submission",
        week: "Week",
        weeklySummary: "Weekly Athlete Summary",

        xpSource: "XP Source",
        xpBucket: "XP Bucket",
        xpPoints: "XP Points",

        xpReasonPublic: "XP Reason Public",
        xpReasonDebug: "XP Reason Debug",

        active: "Active?",
        sourceKey: "Source Key",

        xpDateFieldCandidates: [
            "XP Source Date",
            "XP Activity Date",
        ],

        xpDateSourceFieldCandidates: [
            "XP Date Source",
            "XP Activity Date Source",
        ],

        xpDedupeKey: "XP Dedupe Key",
        xpDedupeKeyNormalized: "XP Dedupe Key Normalized",
        weeklySummaryKey: "Weekly Summary Key",
        streakOccurrenceKey: "Streak Occurrence Key",
    },

    values: {
        ruleKeyDailyShootingBase: "SHOOTING_BASE",

        xpSourceSubmissionBase: "Submission Base",
        xpBucketShootingBase: "Shooting Base",

        xpDateSourceSubmissionActivity: "Submission Activity Date",

        publicReason: "Shooting submission completed.",

        sourceKeyPrefix: "SUBMISSION_XP|",

        statusAwarded: "Awarded",
        statusError: "Error",
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


let submissionsTable = null;
let xpEventsTable = null;
let xpRulesTable = null;
let enrollmentsTable = null;
let weeklySummaryTable = null;
let weeklySummaryQueryCache = null;
let writableXpDateField = "";
let writableXpDateSourceField = "";


/************************************************************************************************
 * SECTION 2 — HELPERS
 ************************************************************************************************/

function log(message, data = null) {
    if (!CONFIG.debug.logToConsole) {
        return;
    }

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
        // Ignore output errors where output is unavailable.
    }
}

function setOutputs(values) {
    for (const [key, value] of Object.entries(values)) {
        setOutputSafe(key, value);
    }
}

function getFieldSafe(table, fieldName) {
    if (!table || !fieldName) {
        return null;
    }

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

    if (!field) {
        return false;
    }

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

function requireField(table, fieldName, label = fieldName) {
    if (!fieldExists(table, fieldName)) {
        throw new Error(
            `Missing required field: ${label} (${table.name} -> ${fieldName})`
        );
    }
}

function requireWritableField(table, fieldName, label = fieldName) {
    requireField(table, fieldName, label);

    if (!isWritableField(table, fieldName)) {
        throw new Error(
            `Required field is not writable: ${label} (${table.name} -> ${fieldName})`
        );
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

function getExistingFieldNames(table, fieldNames) {
    return fieldNames.filter((fieldName) => fieldExists(table, fieldName));
}

function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) {
        return null;
    }

    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) {
        return "";
    }

    const raw = record.getCellValue(fieldName);

    if (raw === null || raw === undefined) {
        return "";
    }

    if (typeof raw === "string") {
        return raw.trim();
    }

    if (typeof raw === "number") {
        return String(raw);
    }

    if (typeof raw === "object" && raw.name) {
        return String(raw.name).trim();
    }

    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (raw === null || raw === undefined || raw === "") {
        return null;
    }

    if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw;
    }

    if (Array.isArray(raw)) {
        const numericValue = raw.find(
            (item) => typeof item === "number" && Number.isFinite(item)
        );

        if (numericValue !== undefined) {
            return numericValue;
        }
    }

    const text = String(record.getCellValueAsString(fieldName) || "")
        .replace(/,/g, "")
        .trim();

    const parsed = Number(text);

    return Number.isFinite(parsed) ? parsed : null;
}

function getBooleanish(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (raw === true || raw === 1) {
        return true;
    }

    if (raw === false || raw === 0 || raw === null || raw === undefined) {
        return false;
    }

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

    if (!Array.isArray(raw)) {
        return [];
    }

    return raw
        .map((item) => item?.id)
        .filter(Boolean);
}

function getFirstLinkedRecordId(record, table, fieldName) {
    return getLinkedRecordIds(record, table, fieldName)[0] || "";
}

function uniqueIds(ids) {
    return [...new Set((ids || []).filter(Boolean))];
}

function linkedCell(ids) {
    return uniqueIds(ids).map((id) => ({ id }));
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
        const summaryEnrollmentId = getFirstLinkedRecordId(
            record,
            weeklySummaryTable,
            CONFIG.weeklySummary.enrollment
        );
        const summaryWeekId = getFirstLinkedRecordId(
            record,
            weeklySummaryTable,
            CONFIG.weeklySummary.week
        );

        return (
            summaryEnrollmentId === cleanEnrollmentId &&
            summaryWeekId === cleanWeekId
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

    if (field.type === "singleSelect") {
        return { name: value };
    }

    if (field.type === "multipleSelects") {
        return [{ name: value }];
    }

    return value;
}

function buildSubmissionSourceKey(submissionId) {
    return `${CONFIG.values.sourceKeyPrefix}${submissionId}`;
}

function normalizeKeyPart(value) {
    return String(value || "").trim().toLowerCase();
}

function buildSubmissionNormalizedDedupeKey({
    enrollmentId,
    submissionId,
    xpSource,
}) {
    if (!enrollmentId || !submissionId || !xpSource) {
        return "";
    }

    return [
        normalizeKeyPart(enrollmentId),
        normalizeKeyPart(submissionId),
        normalizeKeyPart(xpSource),
    ].join("|");
}

function buildSubmissionDedupeKey({
    enrollmentId,
    submissionId,
    xpSource,
}) {
    if (!enrollmentId || !submissionId || !xpSource) {
        return "";
    }

    return [
        enrollmentId,
        submissionId,
        xpSource,
    ].join("|");
}

function buildPublicReason() {
    return CONFIG.values.publicReason;
}

function buildDebugReason({
    ruleKey,
    xpPoints,
    submissionId,
    submissionKey,
    xpSource,
    xpBucket,
    xpDateSource,
}) {
    return [
        `Daily shooting submission XP awarded from XP Reward Rule: ${ruleKey}.`,
        `XP Source: ${xpSource}.`,
        `XP Bucket: ${xpBucket}.`,
        `XP Points: ${xpPoints}.`,
        `XP Date Source: ${xpDateSource}.`,
        `Submission Record ID: ${submissionId}.`,
        submissionKey ? `Submission Key: ${submissionKey}.` : "",
    ]
        .filter(Boolean)
        .join(" ");
}

function buildSubmissionFieldsToLoad() {
    const fields = [
        CONFIG.submissions.enrollment,
        CONFIG.submissions.week,
        CONFIG.submissions.submissionKey,
        CONFIG.submissions.activityDate,
        CONFIG.submissions.totalShotsCounted,
        CONFIG.submissions.countThisSubmission,
        CONFIG.submissions.xpAwardStatus,
        CONFIG.submissions.xpEvents,
    ];

    if (fieldExists(submissionsTable, CONFIG.submissions.weeklySummary)) {
        fields.push(CONFIG.submissions.weeklySummary);
    }

    return fields;
}

function buildXpRuleFieldsToLoad() {
    return [
        CONFIG.xpRules.ruleKey,
        CONFIG.xpRules.xpAmount,
        CONFIG.xpRules.active,
    ];
}

function buildXpEventFieldsToLoad() {
    const fields = [
        CONFIG.xpEvents.enrollment,
        CONFIG.xpEvents.submission,
        CONFIG.xpEvents.week,
        CONFIG.xpEvents.xpSource,
        CONFIG.xpEvents.xpBucket,
        CONFIG.xpEvents.xpPoints,
        CONFIG.xpEvents.xpReasonPublic,
        CONFIG.xpEvents.xpReasonDebug,
        CONFIG.xpEvents.active,
        CONFIG.xpEvents.sourceKey,
    ];

    const dateFields = getExistingFieldNames(
        xpEventsTable,
        CONFIG.xpEvents.xpDateFieldCandidates
    );

    const dateSourceFields = getExistingFieldNames(
        xpEventsTable,
        CONFIG.xpEvents.xpDateSourceFieldCandidates
    );

    const optionalFields = [
        ...dateFields,
        ...dateSourceFields,
        CONFIG.xpEvents.xpDedupeKey,
        CONFIG.xpEvents.xpDedupeKeyNormalized,
        CONFIG.xpEvents.weeklySummaryKey,
        CONFIG.xpEvents.streakOccurrenceKey,
    ];

    for (const optionalField of optionalFields) {
        if (fieldExists(xpEventsTable, optionalField) && !fields.includes(optionalField)) {
            fields.push(optionalField);
        }
    }

    return fields;
}

async function rearmShotMilestoneCheck(enrollmentId) {
    if (!enrollmentId) {
        return false;
    }

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

async function markSubmissionStatus(submissionRecordId, statusName) {
    if (!isWritableField(submissionsTable, CONFIG.submissions.xpAwardStatus)) {
        return;
    }

    await submissionsTable.updateRecordAsync(submissionRecordId, {
        [CONFIG.submissions.xpAwardStatus]: buildCellValueForField(
            submissionsTable,
            CONFIG.submissions.xpAwardStatus,
            statusName
        ),
    });
}


function assertRequiredSchema() {
    for (const fieldName of buildSubmissionFieldsToLoad()) {
        requireField(submissionsTable, fieldName);
    }

    requireWritableField(
        submissionsTable,
        CONFIG.submissions.xpAwardStatus
    );

    requireWritableField(
        submissionsTable,
        CONFIG.submissions.xpEvents
    );

    requireWritableField(
        enrollmentsTable,
        CONFIG.enrollments.runShotMilestoneCheck,
        "Run Shot Milestone Check?"
    );

    for (const fieldName of buildXpRuleFieldsToLoad()) {
        requireField(xpRulesTable, fieldName);
    }

    for (const fieldName of [
        CONFIG.xpEvents.enrollment,
        CONFIG.xpEvents.submission,
        CONFIG.xpEvents.week,
        CONFIG.xpEvents.xpSource,
        CONFIG.xpEvents.xpBucket,
        CONFIG.xpEvents.xpPoints,
        CONFIG.xpEvents.xpReasonPublic,
        CONFIG.xpEvents.xpReasonDebug,
        CONFIG.xpEvents.active,
        CONFIG.xpEvents.sourceKey,
    ]) {
        requireWritableField(xpEventsTable, fieldName);
    }

    writableXpDateField = getFirstWritableFieldName(
        xpEventsTable,
        CONFIG.xpEvents.xpDateFieldCandidates
    );

    writableXpDateSourceField = getFirstWritableFieldName(
        xpEventsTable,
        CONFIG.xpEvents.xpDateSourceFieldCandidates
    );

    log("Resolved optional XP date fields", {
        writableXpDateField: writableXpDateField || "none",
        writableXpDateSourceField: writableXpDateSourceField || "none",
    });
}


/************************************************************************************************
 * SECTION 3 — MAIN
 ************************************************************************************************/

async function main() {
    let submission = null;
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
            throw new Error(`Invalid Submission recordId input: ${recordId}`);
        }

        debugStep = "3 - Load Tables";
        setOutputSafe("debugStep", debugStep);

        submissionsTable = base.getTable(CONFIG.tables.submissions);
        xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
        xpRulesTable = base.getTable(CONFIG.tables.xpRules);
        enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
        weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
        weeklySummaryQueryCache = null;

        debugStep = "4 - Validate Schema";
        setOutputSafe("debugStep", debugStep);
        assertRequiredSchema();

        debugStep = "5 - Load Submission";
        setOutputSafe("debugStep", debugStep);

        submission = await submissionsTable.selectRecordAsync(recordId, {
            fields: buildSubmissionFieldsToLoad(),
        });

        if (!submission) {
            throw new Error(`Submission not found: ${recordId}`);
        }

        debugStep = "6 - Read Submission Values";
        setOutputSafe("debugStep", debugStep);

        const enrollmentId = getFirstLinkedRecordId(
            submission,
            submissionsTable,
            CONFIG.submissions.enrollment
        );

        const weekId = getFirstLinkedRecordId(
            submission,
            submissionsTable,
            CONFIG.submissions.week
        );

        const submissionKey = getText(
            submission,
            submissionsTable,
            CONFIG.submissions.submissionKey
        );

        const activityDate = getRaw(
            submission,
            submissionsTable,
            CONFIG.submissions.activityDate
        );

        const totalShotsCounted = getNumber(
            submission,
            submissionsTable,
            CONFIG.submissions.totalShotsCounted
        );

        const countThisSubmission = getBooleanish(
            submission,
            submissionsTable,
            CONFIG.submissions.countThisSubmission
        );

        const existingXpEventIds = getLinkedRecordIds(
            submission,
            submissionsTable,
            CONFIG.submissions.xpEvents
        );

        const sourceKey = buildSubmissionSourceKey(recordId);
        const legacySourceKey = submissionKey;

        const dedupeKey = buildSubmissionDedupeKey({
            enrollmentId,
            submissionId: recordId,
            xpSource: CONFIG.values.xpSourceSubmissionBase,
        });

        const normalizedDedupeKey = buildSubmissionNormalizedDedupeKey({
            enrollmentId,
            submissionId: recordId,
            xpSource: CONFIG.values.xpSourceSubmissionBase,
        });

        log("Submission XP input", {
            submissionId: recordId,
            submissionKey,
            enrollmentId,
            weekId,
            activityDate,
            totalShotsCounted,
            countThisSubmission,
            existingXpEventIds,
            sourceKey,
            legacySourceKey,
            dedupeKey,
            normalizedDedupeKey,
            expectedXpSource: CONFIG.values.xpSourceSubmissionBase,
            expectedXpBucket: CONFIG.values.xpBucketShootingBase,
            expectedRuleKey: CONFIG.values.ruleKeyDailyShootingBase,
        });

        debugStep = "7 - Validate Submission";
        setOutputSafe("debugStep", debugStep);

        if (!enrollmentId) {
            throw new Error(`Submission ${recordId} is missing Enrollment.`);
        }

        if (!weekId) {
            throw new Error(`Submission ${recordId} is missing Week.`);
        }

        if (!submissionKey) {
            throw new Error(`Submission ${recordId} has a blank Submission Key.`);
        }

        if (!activityDate) {
            throw new Error(`Submission ${recordId} is missing Activity Date.`);
        }

        if (!countThisSubmission) {
            setOutputs({
                ok: true,
                statusOut: CONFIG.outputStatuses.skipped,
                actionOut: "skipped_submission_not_counted",
                errorOut: "",
                debugStep: "Skipped: Count This Submission? is false or blank",
                submissionId: recordId,
                submissionKey,
                enrollmentId,
                weekId,
                totalShotsCounted: totalShotsCounted ?? "",
            });

            return;
        }

        if (totalShotsCounted === null || totalShotsCounted <= 0) {
            setOutputs({
                ok: true,
                statusOut: CONFIG.outputStatuses.skipped,
                actionOut: "skipped_no_counted_shots",
                errorOut: "",
                debugStep: "Skipped: Total Shots Counted is zero or blank",
                submissionId: recordId,
                submissionKey,
                enrollmentId,
                weekId,
                totalShotsCounted: totalShotsCounted ?? "",
            });

            return;
        }

        debugStep = "8 - Load XP Reward Rule";
        setOutputSafe("debugStep", debugStep);

        const xpRuleQuery = await xpRulesTable.selectRecordsAsync({
            fields: buildXpRuleFieldsToLoad(),
        });

        const matchingRules = xpRuleQuery.records.filter((rule) => {
            const ruleKey = getText(
                rule,
                xpRulesTable,
                CONFIG.xpRules.ruleKey
            );

            const isActive = getBooleanish(
                rule,
                xpRulesTable,
                CONFIG.xpRules.active
            );

            return (
                ruleKey === CONFIG.values.ruleKeyDailyShootingBase &&
                isActive
            );
        });

        if (matchingRules.length === 0) {
            throw new Error(
                `No active XP Reward Rule found for Rule Key: ${CONFIG.values.ruleKeyDailyShootingBase}`
            );
        }

        if (matchingRules.length > 1) {
            const duplicateRuleIds = matchingRules
                .map((rule) => rule.id)
                .join(", ");

            throw new Error(
                `Multiple active XP Reward Rules found for Rule Key ${CONFIG.values.ruleKeyDailyShootingBase}: ${duplicateRuleIds}`
            );
        }

        const baseRule = matchingRules[0];

        const xpPoints = getNumber(
            baseRule,
            xpRulesTable,
            CONFIG.xpRules.xpAmount
        );

        if (xpPoints === null || xpPoints <= 0) {
            throw new Error(
                `XP Amount is blank, invalid, or not positive for Rule Key: ${CONFIG.values.ruleKeyDailyShootingBase}`
            );
        }

        debugStep = "9 - Load XP Events";
        setOutputSafe("debugStep", debugStep);

        const xpEventQuery = await xpEventsTable.selectRecordsAsync({
            fields: buildXpEventFieldsToLoad(),
        });

        debugStep = "10 - Find Existing Daily Shooting XP Event";
        setOutputSafe("debugStep", debugStep);

        const existingXpEventIdSet = new Set(existingXpEventIds);

        const candidateEvents = xpEventQuery.records.filter((event) => {
            const eventId = event.id;

            const eventXpSource = getText(
                event,
                xpEventsTable,
                CONFIG.xpEvents.xpSource
            );

            const eventXpBucket = getText(
                event,
                xpEventsTable,
                CONFIG.xpEvents.xpBucket
            );

            const eventSourceKey = getText(
                event,
                xpEventsTable,
                CONFIG.xpEvents.sourceKey
            );

            const eventSubmissionIds = getLinkedRecordIds(
                event,
                xpEventsTable,
                CONFIG.xpEvents.submission
            );

            const eventDedupeKey = fieldExists(
                xpEventsTable,
                CONFIG.xpEvents.xpDedupeKey
            )
                ? getText(
                    event,
                    xpEventsTable,
                    CONFIG.xpEvents.xpDedupeKey
                )
                : "";

            const eventNormalizedDedupeKey = fieldExists(
                xpEventsTable,
                CONFIG.xpEvents.xpDedupeKeyNormalized
            )
                ? getText(
                    event,
                    xpEventsTable,
                    CONFIG.xpEvents.xpDedupeKeyNormalized
                )
                : "";

            const isDailyShootingEvent =
                eventXpSource === CONFIG.values.xpSourceSubmissionBase ||
                eventXpBucket === CONFIG.values.xpBucketShootingBase ||
                eventSourceKey.startsWith(CONFIG.values.sourceKeyPrefix);

            if (!isDailyShootingEvent) {
                return false;
            }

            const sourceKeyMatches =
                eventSourceKey === sourceKey ||
                Boolean(
                    legacySourceKey &&
                    eventSourceKey === legacySourceKey
                );

            const submissionLinkMatches =
                eventSubmissionIds.includes(recordId);

            const directSubmissionLinkedMatch =
                existingXpEventIdSet.has(eventId);

            const dedupeKeyMatches =
                Boolean(dedupeKey) &&
                eventDedupeKey === dedupeKey;

            const normalizedKeyMatches =
                Boolean(normalizedDedupeKey) &&
                eventNormalizedDedupeKey === normalizedDedupeKey;

            return (
                sourceKeyMatches ||
                submissionLinkMatches ||
                directSubmissionLinkedMatch ||
                dedupeKeyMatches ||
                normalizedKeyMatches
            );
        });

        log("Daily shooting XP Event candidates", {
            submissionId: recordId,
            dedupeKey,
            normalizedDedupeKey,
            candidateEventCount: candidateEvents.length,
            candidateEventIds: candidateEvents.map((event) => event.id),
        });

        if (candidateEvents.length > 1) {
            const candidateIds = candidateEvents
                .map((event) => event.id)
                .join(", ");

            throw new Error(
                `Multiple daily shooting XP Events matched Submission ${recordId}. Review duplicates before continuing. XP Event IDs: ${candidateIds}`
            );
        }

        debugStep = "11 - Build XP Event Values";
        setOutputSafe("debugStep", debugStep);

        const submissionWeeklySummaryIds = fieldExists(
            submissionsTable,
            CONFIG.submissions.weeklySummary
        )
            ? getLinkedRecordIds(
                submission,
                submissionsTable,
                CONFIG.submissions.weeklySummary
            )
            : [];

        const weeklySummaryId = await resolveWeeklySummaryId({
            sourceWeeklySummaryIds: submissionWeeklySummaryIds,
            enrollmentId,
            weekId,
        });

        log("Weekly Athlete Summary resolution", {
            submissionWeeklySummaryIds,
            weeklySummaryId: weeklySummaryId || "",
            enrollmentId,
            weekId,
        });

        const publicReason = buildPublicReason();

        const debugReason = buildDebugReason({
            ruleKey: CONFIG.values.ruleKeyDailyShootingBase,
            xpPoints,
            submissionId: recordId,
            submissionKey,
            xpSource: CONFIG.values.xpSourceSubmissionBase,
            xpBucket: CONFIG.values.xpBucketShootingBase,
            xpDateSource: CONFIG.values.xpDateSourceSubmissionActivity,
        });

        const xpEventFields = {
            [CONFIG.xpEvents.enrollment]: linkedCell([enrollmentId]),

            [CONFIG.xpEvents.submission]: linkedCell([recordId]),

            [CONFIG.xpEvents.week]: linkedCell([weekId]),

            [CONFIG.xpEvents.xpSource]: buildCellValueForField(
                xpEventsTable,
                CONFIG.xpEvents.xpSource,
                CONFIG.values.xpSourceSubmissionBase
            ),

            [CONFIG.xpEvents.xpBucket]: buildCellValueForField(
                xpEventsTable,
                CONFIG.xpEvents.xpBucket,
                CONFIG.values.xpBucketShootingBase
            ),

            [CONFIG.xpEvents.xpPoints]: xpPoints,

            [CONFIG.xpEvents.xpReasonPublic]: publicReason,

            [CONFIG.xpEvents.xpReasonDebug]: debugReason,

            [CONFIG.xpEvents.active]: true,

            [CONFIG.xpEvents.sourceKey]: sourceKey,
        };

        if (writableXpDateField) {
            xpEventFields[writableXpDateField] = activityDate;
        }

        if (writableXpDateSourceField) {
            xpEventFields[writableXpDateSourceField] = buildCellValueForField(
                xpEventsTable,
                writableXpDateSourceField,
                CONFIG.values.xpDateSourceSubmissionActivity
            );
        }

        addWeeklySummaryLink(
            xpEventFields,
            xpEventsTable,
            CONFIG.xpEvents.weeklySummary,
            weeklySummaryId
        );

        debugStep = "12 - Create or Update XP Event";
        setOutputSafe("debugStep", debugStep);

        let xpEventId = "";
        let actionOut = "";
        let statusOut = "";

        if (candidateEvents.length === 1) {
            xpEventId = candidateEvents[0].id;

            await xpEventsTable.updateRecordAsync(
                xpEventId,
                xpEventFields
            );

            actionOut = "updated_existing_xp_event";
            statusOut = CONFIG.outputStatuses.updated;
        } else {
            xpEventId = await xpEventsTable.createRecordAsync(
                xpEventFields
            );

            actionOut = "created_new_xp_event";
            statusOut = CONFIG.outputStatuses.created;
        }

        await ensureXpEventWeeklySummaryLink(xpEventId, weeklySummaryId);

        debugStep = "13 - Link XP Event to Submission";
        setOutputSafe("debugStep", debugStep);

        const mergedXpEventIds = uniqueIds([
            ...existingXpEventIds,
            xpEventId,
        ]);

        await submissionsTable.updateRecordAsync(recordId, {
            [CONFIG.submissions.xpEvents]: linkedCell(mergedXpEventIds),

            [CONFIG.submissions.xpAwardStatus]: buildCellValueForField(
                submissionsTable,
                CONFIG.submissions.xpAwardStatus,
                CONFIG.values.statusAwarded
            ),
        });

        debugStep = "14 - Re-arm Shot Milestone Check";
        setOutputSafe("debugStep", debugStep);

        const shotMilestoneRearmed = await rearmShotMilestoneCheck(enrollmentId);

        debugStep = "15 - Complete";
        setOutputSafe("debugStep", debugStep);

        setOutputs({
            ok: true,
            statusOut,
            actionOut,
            errorOut: "",
            debugStep,

            submissionId: recordId,
            submissionKey,
            enrollmentId,
            weekId,

            totalShotsCounted,
            xpPoints,

            xpEventId,
            weeklySummaryId: weeklySummaryId || "",
            sourceKey,
            dedupeKey,
            normalizedDedupeKey,

            xpSource: CONFIG.values.xpSourceSubmissionBase,
            xpBucket: CONFIG.values.xpBucketShootingBase,
            ruleKey: CONFIG.values.ruleKeyDailyShootingBase,

            xpDateFieldUsed: writableXpDateField || "",
            xpDateSourceFieldUsed: writableXpDateSourceField || "",

            publicReason,
            debugReason,

            candidateEventCount: candidateEvents.length,
            shotMilestoneRearmed,
        });

        console.log(JSON.stringify({
            automation: CONFIG.scriptName,
            version: CONFIG.version,
            statusOut,
            actionOut,
            submissionId: recordId,
            xpEventId,
            weeklySummaryId: weeklySummaryId || "",
            sourceKey,
            debugStep,
        }));
    } catch (error) {
        log("Automation 010 error", {
            submissionId: recordId,
            debugStep,
            error: error.message,
        });

        if (submission) {
            try {
                await markSubmissionStatus(recordId, CONFIG.values.statusError);
            } catch (statusError) {
                log("Could not mark Submission XP Award Status as Error", {
                    submissionId: recordId,
                    statusError: statusError.message,
                });
            }
        }

        setOutputs({
            ok: false,
            statusOut: CONFIG.outputStatuses.error,
            actionOut: "error",
            errorOut: error.message,
            debugStep,
            submissionId: recordId,
        });

        throw error;
    }
}


/************************************************************************************************
 * SECTION 4 — RUN
 ************************************************************************************************/

await main();

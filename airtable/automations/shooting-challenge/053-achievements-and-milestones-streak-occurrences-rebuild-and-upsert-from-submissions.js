/*
Automation: 053 - Achievements and Milestones - Streak Occurrences - Rebuild and Upsert From Submissions
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
 * 053 - Achievements and Milestones - Streak Occurrences - Rebuild and Upsert From Submissions
 * Version: 5.1
 * Date Written: 2026-06-09
 *
 * SCRIPT TYPE
 * - Airtable Automation Script
 * - Required input variable: recordId
 *
 * PURPOSE
 * - Rebuild streak milestone occurrences for one Enrollment after a valid Submission changes.
 * - Count only valid shooting Submissions:
 *      Count This Submission? = 1
 *      Total Shots Counted > 0
 *      Activity Date is not empty
 * - Treat multiple valid submissions on the same Activity Date as one streak day.
 * - Use active Achievements where Trigger Type = "Streak Length".
 * - Create or repair one canonical Streak Occurrence per:
 *      Enrollment + Achievement + Streak End Date
 * - Allow the same streak achievement to be earned again only after a streak breaks
 *   and a new streak block reaches the threshold again.
 * - Set Week based on the week containing the Streak End Date.
 * - Never create XP Events directly.
 * - Never write to formula fields such as Streak Occurrence Key.
 *
 * IMPORTANT FIX IN THIS VERSION
 * - Streak Occurrences → Source Status is a single-select field.
 * - This script now writes Source Status as { name: "Ready for XP" }, etc.
 ************************************************************************************************/

async function main() {
    /************************************************************************************************
     * SECTION 1 — CONFIGURATION
     ************************************************************************************************/

    const CONFIG = {
        tables: {
            submissions: "Submissions",
            achievements: "Achievements",
            streakOccurrences: "Streak Occurrences",
            weeks: "Weeks",
        },

        submissions: {
            enrollment: "Enrollment",
            activityDate: "Activity Date",
            totalShotsCounted: "Total Shots Counted",
            countThisSubmission: "Count This Submission?",
        },

        achievements: {
            active: "Active?",
            triggerType: "Trigger Type",
            triggerThreshold: "Trigger Threshold",
            rewardRuleKey: "Reward Rule Key",
            achievementName: "Achievement Name",
        },

        streakOccurrences: {
            active: "Active?",
            enrollment: "Enrollment",
            achievement: "Achievement",
            streakDays: "Streak Days",
            streakStartDate: "Streak Start Date",
            streakEndDate: "Streak End Date",
            week: "Week",
            xpEvents: "XP Events",
            sourceStatus: "Source Status",
            sourceSubmissionDate: "Source Submission Date",
            triggerSubmissionDate: "Trigger Submission Date",
            lastEvaluatedAt: "Last Evaluated At",
            notes: "Notes",
        },

        weeks: {
            startDate: "Start Date",
            endDate: "End Date",
        },

        values: {
            triggerTypeStreakLength: "Streak Length",
            statusReady: "Ready for XP",
            statusAwarded: "Awarded",
            statusDuplicate: "Duplicate",
            statusError: "Error",
        },

        outputs: {
            success: "success",
            skipped: "skipped",
            error: "error",
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


    /************************************************************************************************
     * SECTION 3 — TABLES
     ************************************************************************************************/

    const submissionsTable = base.getTable(CONFIG.tables.submissions);
    const achievementsTable = base.getTable(CONFIG.tables.achievements);
    const streakOccurrencesTable = base.getTable(CONFIG.tables.streakOccurrences);
    const weeksTable = base.getTable(CONFIG.tables.weeks);


    /************************************************************************************************
     * SECTION 4 — HELPERS
     ************************************************************************************************/

    function setOutputs(values) {
        for (const [key, value] of Object.entries(values)) {
            output.set(key, value);
        }
    }

    function fieldExists(table, fieldName) {
        return !!fieldName && table.fields.some((field) => field.name === fieldName);
    }

    function getField(table, fieldName) {
        return table.fields.find((field) => field.name === fieldName) || null;
    }

    function fieldType(table, fieldName) {
        const field = getField(table, fieldName);
        return field ? field.type : null;
    }

    function isWritableField(table, fieldName) {
        const type = fieldType(table, fieldName);

        if (!type) {
            return false;
        }

        return !new Set([
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
        ]).has(type);
    }

    function requireField(table, fieldName) {
        if (!fieldExists(table, fieldName)) {
            throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
        }
    }

    function optionalFields(table, fieldNames) {
        return [...new Set(fieldNames.filter((fieldName) => fieldExists(table, fieldName)))];
    }

    function getLinkedRecordId(record, table, fieldName) {
        if (!fieldExists(table, fieldName)) {
            return null;
        }

        const value = record.getCellValue(fieldName);
        return Array.isArray(value) && value.length > 0 ? value[0].id : null;
    }

    function getLinkedRecordIds(record, table, fieldName) {
        if (!fieldExists(table, fieldName)) {
            return [];
        }

        const value = record.getCellValue(fieldName);
        return Array.isArray(value) ? value.map((item) => item.id).filter(Boolean) : [];
    }

    function getSelectName(record, table, fieldName) {
        if (!fieldExists(table, fieldName)) {
            return "";
        }

        const value = record.getCellValue(fieldName);
        return value && value.name ? value.name : "";
    }

    function getText(record, table, fieldName) {
        if (!record || !fieldExists(table, fieldName)) {
            return "";
        }

        const value = record.getCellValue(fieldName);

        if (value === null || value === undefined) {
            return "";
        }

        if (typeof value === "string") {
            return value.trim();
        }

        if (typeof value === "number") {
            return String(value);
        }

        if (value && value.name) {
            return String(value.name).trim();
        }

        if (Array.isArray(value)) {
            return value
                .map((item) => {
                    if (item && item.name) return item.name;
                    if (item !== null && item !== undefined) return String(item);
                    return "";
                })
                .filter(Boolean)
                .join(", ")
                .trim();
        }

        return String(value).trim();
    }

    function getNumber(record, table, fieldName) {
        if (!fieldExists(table, fieldName)) {
            return 0;
        }

        const value = record.getCellValue(fieldName);

        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        if (Array.isArray(value) && value.length > 0) {
            const parsed = Number(value[0]);
            return Number.isFinite(parsed) ? parsed : 0;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function isChecked(record, table, fieldName) {
        if (!fieldExists(table, fieldName)) {
            return false;
        }

        return record.getCellValue(fieldName) === true;
    }

    function toDateKey(value) {
        if (!value) {
            return "";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toISOString().slice(0, 10);
    }

    function dateValue(dateKey) {
        return dateKey ? `${dateKey}T12:00:00.000Z` : null;
    }

    function daysBetween(previousDateKey, nextDateKey) {
        const previousDate = new Date(`${previousDateKey}T00:00:00.000Z`);
        const nextDate = new Date(`${nextDateKey}T00:00:00.000Z`);
        return Math.round((nextDate - previousDate) / 86400000);
    }

    function makeOccurrenceKey(enrollmentId, achievementId, streakEndDateKey) {
        return `${enrollmentId}|${achievementId}|${streakEndDateKey}`;
    }

    function chunkArray(items, chunkSize) {
        const chunks = [];

        for (let i = 0; i < items.length; i += chunkSize) {
            chunks.push(items.slice(i, i + chunkSize));
        }

        return chunks;
    }

    async function batchCreate(table, records) {
        for (const chunk of chunkArray(records, 50)) {
            await table.createRecordsAsync(chunk);
        }
    }

    async function batchUpdate(table, records) {
        for (const chunk of chunkArray(records, 50)) {
            await table.updateRecordsAsync(chunk);
        }
    }

    function coerceForField(table, fieldName, value) {
        const type = fieldType(table, fieldName);

        if (type === "singleSelect") {
            if (value && typeof value === "object" && value.name) {
                return value;
            }

            return { name: String(value) };
        }

        return value;
    }

    function addWritable(fields, table, fieldName, value) {
        if (value === undefined || value === null) {
            return;
        }

        if (!fieldExists(table, fieldName) || !isWritableField(table, fieldName)) {
            return;
        }

        fields[fieldName] = coerceForField(table, fieldName, value);
    }

    function addWritableRaw(fields, table, fieldName, value) {
        if (value === undefined || value === null) {
            return;
        }

        if (!fieldExists(table, fieldName) || !isWritableField(table, fieldName)) {
            return;
        }

        fields[fieldName] = value;
    }

    function validateSingleSelectChoice(table, fieldName, choiceName) {
        const field = getField(table, fieldName);

        if (!field || field.type !== "singleSelect") {
            return true;
        }

        const choices = field.options && Array.isArray(field.options.choices)
            ? field.options.choices.map((choice) => choice.name)
            : [];

        return choices.includes(choiceName);
    }

    function findWeekForDate(weekRecords, dateKey) {
        if (!dateKey) {
            return null;
        }

        const target = new Date(`${dateKey}T12:00:00.000Z`);

        for (const week of weekRecords) {
            const startRaw = week.getCellValue(CONFIG.weeks.startDate);
            const endRaw = week.getCellValue(CONFIG.weeks.endDate);

            if (!startRaw || !endRaw) {
                continue;
            }

            const start = new Date(startRaw);
            const end = new Date(endRaw);

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                continue;
            }

            const startDateOnly = new Date(Date.UTC(
                start.getUTCFullYear(),
                start.getUTCMonth(),
                start.getUTCDate(),
                0,
                0,
                0,
                0
            ));

            const endDateOnly = new Date(Date.UTC(
                end.getUTCFullYear(),
                end.getUTCMonth(),
                end.getUTCDate(),
                23,
                59,
                59,
                999
            ));

            if (target >= startDateOnly && target <= endDateOnly) {
                return week;
            }
        }

        return null;
    }

    function buildStreakBlocks(dateKeys) {
        const blocks = [];

        if (dateKeys.length === 0) {
            return blocks;
        }

        let currentBlock = [dateKeys[0]];

        for (let i = 1; i < dateKeys.length; i++) {
            const previousDateKey = dateKeys[i - 1];
            const currentDateKey = dateKeys[i];

            if (daysBetween(previousDateKey, currentDateKey) === 1) {
                currentBlock.push(currentDateKey);
            } else {
                blocks.push(currentBlock);
                currentBlock = [currentDateKey];
            }
        }

        blocks.push(currentBlock);
        return blocks;
    }


    /************************************************************************************************
     * SECTION 5 — REQUIRED FIELD CHECKS
     ************************************************************************************************/

    requireField(submissionsTable, CONFIG.submissions.enrollment);
    requireField(submissionsTable, CONFIG.submissions.activityDate);
    requireField(submissionsTable, CONFIG.submissions.totalShotsCounted);
    requireField(submissionsTable, CONFIG.submissions.countThisSubmission);

    requireField(achievementsTable, CONFIG.achievements.active);
    requireField(achievementsTable, CONFIG.achievements.triggerType);
    requireField(achievementsTable, CONFIG.achievements.triggerThreshold);

    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.active);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.enrollment);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.achievement);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.streakDays);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.streakStartDate);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.streakEndDate);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.week);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.xpEvents);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus);

    requireField(weeksTable, CONFIG.weeks.startDate);
    requireField(weeksTable, CONFIG.weeks.endDate);

    if (!validateSingleSelectChoice(streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus, CONFIG.values.statusReady)) {
        throw new Error(`Streak Occurrences → Source Status is missing single-select option: ${CONFIG.values.statusReady}`);
    }

    if (!validateSingleSelectChoice(streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus, CONFIG.values.statusAwarded)) {
        throw new Error(`Streak Occurrences → Source Status is missing single-select option: ${CONFIG.values.statusAwarded}`);
    }

    if (!validateSingleSelectChoice(streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus, CONFIG.values.statusDuplicate)) {
        throw new Error(`Streak Occurrences → Source Status is missing single-select option: ${CONFIG.values.statusDuplicate}`);
    }


    /************************************************************************************************
     * SECTION 6 — LOAD TRIGGER SUBMISSION
     ************************************************************************************************/

    const triggerSubmission = await submissionsTable.selectRecordAsync(recordId);

    if (!triggerSubmission) {
        setOutputs({
            ok: false,
            actionOut: "skipped_missing_trigger_submission",
            statusOut: CONFIG.outputs.skipped,
            errorOut: `Submission not found: ${recordId}`,
        });
        return;
    }

    const enrollmentId = getLinkedRecordId(
        triggerSubmission,
        submissionsTable,
        CONFIG.submissions.enrollment
    );

    if (!enrollmentId) {
        setOutputs({
            ok: true,
            actionOut: "skipped_submission_missing_enrollment",
            statusOut: CONFIG.outputs.skipped,
            errorOut: "",
            submissionId: recordId,
        });
        return;
    }


    /************************************************************************************************
     * SECTION 7 — LOAD RECORDS
     ************************************************************************************************/

    const [
        submissionsQuery,
        achievementsQuery,
        streakOccurrencesQuery,
        weeksQuery,
    ] = await Promise.all([
        submissionsTable.selectRecordsAsync({
            fields: optionalFields(submissionsTable, [
                CONFIG.submissions.enrollment,
                CONFIG.submissions.activityDate,
                CONFIG.submissions.totalShotsCounted,
                CONFIG.submissions.countThisSubmission,
            ]),
        }),
        achievementsTable.selectRecordsAsync({
            fields: optionalFields(achievementsTable, [
                CONFIG.achievements.active,
                CONFIG.achievements.triggerType,
                CONFIG.achievements.triggerThreshold,
                CONFIG.achievements.rewardRuleKey,
                CONFIG.achievements.achievementName,
            ]),
        }),
        streakOccurrencesTable.selectRecordsAsync({
            fields: optionalFields(streakOccurrencesTable, [
                CONFIG.streakOccurrences.active,
                CONFIG.streakOccurrences.enrollment,
                CONFIG.streakOccurrences.achievement,
                CONFIG.streakOccurrences.streakDays,
                CONFIG.streakOccurrences.streakStartDate,
                CONFIG.streakOccurrences.streakEndDate,
                CONFIG.streakOccurrences.week,
                CONFIG.streakOccurrences.xpEvents,
                CONFIG.streakOccurrences.sourceStatus,
                CONFIG.streakOccurrences.sourceSubmissionDate,
                CONFIG.streakOccurrences.triggerSubmissionDate,
                CONFIG.streakOccurrences.lastEvaluatedAt,
                CONFIG.streakOccurrences.notes,
            ]),
        }),
        weeksTable.selectRecordsAsync({
            fields: optionalFields(weeksTable, [
                CONFIG.weeks.startDate,
                CONFIG.weeks.endDate,
            ]),
        }),
    ]);


    /************************************************************************************************
     * SECTION 8 — BUILD VALID DISTINCT SHOOTING DATES
     ************************************************************************************************/

    const validDateSet = new Set();

    for (const submission of submissionsQuery.records) {
        const submissionEnrollmentId = getLinkedRecordId(
            submission,
            submissionsTable,
            CONFIG.submissions.enrollment
        );

        if (submissionEnrollmentId !== enrollmentId) {
            continue;
        }

        const countThisSubmission = getNumber(
            submission,
            submissionsTable,
            CONFIG.submissions.countThisSubmission
        );

        const totalShotsCounted = getNumber(
            submission,
            submissionsTable,
            CONFIG.submissions.totalShotsCounted
        );

        const activityDateKey = toDateKey(
            submission.getCellValue(CONFIG.submissions.activityDate)
        );

        if (
            countThisSubmission === 1 &&
            totalShotsCounted > 0 &&
            activityDateKey
        ) {
            validDateSet.add(activityDateKey);
        }
    }

    const validDateKeys = Array.from(validDateSet).sort();

    if (validDateKeys.length === 0) {
        setOutputs({
            ok: true,
            actionOut: "skipped_no_valid_counted_shooting_dates",
            statusOut: CONFIG.outputs.skipped,
            errorOut: "",
            enrollmentId,
            validDatesProcessed: 0,
        });
        return;
    }


    /************************************************************************************************
     * SECTION 9 — LOAD ACTIVE STREAK ACHIEVEMENTS
     ************************************************************************************************/

    const activeStreakAchievements = achievementsQuery.records
        .filter((achievement) => {
            const active = isChecked(
                achievement,
                achievementsTable,
                CONFIG.achievements.active
            );

            const triggerType = getSelectName(
                achievement,
                achievementsTable,
                CONFIG.achievements.triggerType
            );

            const threshold = getNumber(
                achievement,
                achievementsTable,
                CONFIG.achievements.triggerThreshold
            );

            return (
                active &&
                triggerType === CONFIG.values.triggerTypeStreakLength &&
                threshold > 0
            );
        })
        .sort((a, b) => {
            return (
                getNumber(a, achievementsTable, CONFIG.achievements.triggerThreshold) -
                getNumber(b, achievementsTable, CONFIG.achievements.triggerThreshold)
            );
        });

    if (activeStreakAchievements.length === 0) {
        setOutputs({
            ok: true,
            actionOut: "skipped_no_active_streak_achievements",
            statusOut: CONFIG.outputs.skipped,
            errorOut: "",
            enrollmentId,
            validDatesProcessed: validDateKeys.length,
        });
        return;
    }


    /************************************************************************************************
     * SECTION 10 — BUILD TARGET STREAK OCCURRENCES
     ************************************************************************************************/

    const streakBlocks = buildStreakBlocks(validDateKeys);
    const targetOccurrencesByKey = new Map();

    for (const block of streakBlocks) {
        const streakStartDateKey = block[0];

        for (const achievement of activeStreakAchievements) {
            const threshold = getNumber(
                achievement,
                achievementsTable,
                CONFIG.achievements.triggerThreshold
            );

            if (block.length < threshold) {
                continue;
            }

            const streakEndDateKey = block[threshold - 1];
            const week = findWeekForDate(weeksQuery.records, streakEndDateKey);

            const occurrenceKey = makeOccurrenceKey(
                enrollmentId,
                achievement.id,
                streakEndDateKey
            );

            targetOccurrencesByKey.set(occurrenceKey, {
                occurrenceKey,
                enrollmentId,
                achievementId: achievement.id,
                streakDays: threshold,
                streakStartDateKey,
                streakEndDateKey,
                weekId: week ? week.id : null,
            });
        }
    }


    /************************************************************************************************
     * SECTION 11 — INDEX EXISTING STREAK OCCURRENCES
     ************************************************************************************************/

    const existingOccurrencesByKey = new Map();

    for (const occurrence of streakOccurrencesQuery.records) {
        const occurrenceEnrollmentId = getLinkedRecordId(
            occurrence,
            streakOccurrencesTable,
            CONFIG.streakOccurrences.enrollment
        );

        if (occurrenceEnrollmentId !== enrollmentId) {
            continue;
        }

        const achievementId = getLinkedRecordId(
            occurrence,
            streakOccurrencesTable,
            CONFIG.streakOccurrences.achievement
        );

        const streakEndDateKey = toDateKey(
            occurrence.getCellValue(CONFIG.streakOccurrences.streakEndDate)
        );

        if (!achievementId || !streakEndDateKey) {
            continue;
        }

        const occurrenceKey = makeOccurrenceKey(
            occurrenceEnrollmentId,
            achievementId,
            streakEndDateKey
        );

        if (!existingOccurrencesByKey.has(occurrenceKey)) {
            existingOccurrencesByKey.set(occurrenceKey, []);
        }

        existingOccurrencesByKey.get(occurrenceKey).push(occurrence);
    }


    /************************************************************************************************
     * SECTION 12 — CREATE MISSING OCCURRENCES
     ************************************************************************************************/

    const nowIso = new Date().toISOString();
    const recordsToCreate = [];

    for (const target of targetOccurrencesByKey.values()) {
        const existing = existingOccurrencesByKey.get(target.occurrenceKey) || [];

        if (existing.length > 0) {
            continue;
        }

        const fields = {};

        addWritable(fields, streakOccurrencesTable, CONFIG.streakOccurrences.active, true);
        addWritableRaw(fields, streakOccurrencesTable, CONFIG.streakOccurrences.enrollment, [{ id: target.enrollmentId }]);
        addWritableRaw(fields, streakOccurrencesTable, CONFIG.streakOccurrences.achievement, [{ id: target.achievementId }]);
        addWritable(fields, streakOccurrencesTable, CONFIG.streakOccurrences.streakDays, target.streakDays);
        addWritable(fields, streakOccurrencesTable, CONFIG.streakOccurrences.streakStartDate, dateValue(target.streakStartDateKey));
        addWritable(fields, streakOccurrencesTable, CONFIG.streakOccurrences.streakEndDate, dateValue(target.streakEndDateKey));
        addWritable(fields, streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus, CONFIG.values.statusReady);
        addWritable(fields, streakOccurrencesTable, CONFIG.streakOccurrences.sourceSubmissionDate, dateValue(target.streakEndDateKey));
        addWritable(fields, streakOccurrencesTable, CONFIG.streakOccurrences.triggerSubmissionDate, dateValue(target.streakEndDateKey));
        addWritable(fields, streakOccurrencesTable, CONFIG.streakOccurrences.lastEvaluatedAt, nowIso);

        if (target.weekId) {
            addWritableRaw(fields, streakOccurrencesTable, CONFIG.streakOccurrences.week, [{ id: target.weekId }]);
        }

        recordsToCreate.push({ fields });
    }

    if (recordsToCreate.length > 0) {
        await batchCreate(streakOccurrencesTable, recordsToCreate);
    }


    /************************************************************************************************
     * SECTION 13 — RELOAD AND REPAIR / DEDUPE OCCURRENCES
     ************************************************************************************************/

    const refreshedOccurrencesQuery = await streakOccurrencesTable.selectRecordsAsync({
        fields: optionalFields(streakOccurrencesTable, [
            CONFIG.streakOccurrences.active,
            CONFIG.streakOccurrences.enrollment,
            CONFIG.streakOccurrences.achievement,
            CONFIG.streakOccurrences.streakDays,
            CONFIG.streakOccurrences.streakStartDate,
            CONFIG.streakOccurrences.streakEndDate,
            CONFIG.streakOccurrences.week,
            CONFIG.streakOccurrences.xpEvents,
            CONFIG.streakOccurrences.sourceStatus,
            CONFIG.streakOccurrences.sourceSubmissionDate,
            CONFIG.streakOccurrences.triggerSubmissionDate,
            CONFIG.streakOccurrences.lastEvaluatedAt,
            CONFIG.streakOccurrences.notes,
        ]),
    });

    const refreshedByKey = new Map();

    for (const occurrence of refreshedOccurrencesQuery.records) {
        const occurrenceEnrollmentId = getLinkedRecordId(
            occurrence,
            streakOccurrencesTable,
            CONFIG.streakOccurrences.enrollment
        );

        if (occurrenceEnrollmentId !== enrollmentId) {
            continue;
        }

        const achievementId = getLinkedRecordId(
            occurrence,
            streakOccurrencesTable,
            CONFIG.streakOccurrences.achievement
        );

        const streakEndDateKey = toDateKey(
            occurrence.getCellValue(CONFIG.streakOccurrences.streakEndDate)
        );

        if (!achievementId || !streakEndDateKey) {
            continue;
        }

        const occurrenceKey = makeOccurrenceKey(
            occurrenceEnrollmentId,
            achievementId,
            streakEndDateKey
        );

        if (!refreshedByKey.has(occurrenceKey)) {
            refreshedByKey.set(occurrenceKey, []);
        }

        refreshedByKey.get(occurrenceKey).push(occurrence);
    }

    const recordsToUpdate = [];
    let canonicalCount = 0;
    let duplicateCount = 0;

    for (const target of targetOccurrencesByKey.values()) {
        const matchingOccurrences = refreshedByKey.get(target.occurrenceKey) || [];

        if (matchingOccurrences.length === 0) {
            continue;
        }

        matchingOccurrences.sort((a, b) => {
            const aHasXp = getLinkedRecordIds(
                a,
                streakOccurrencesTable,
                CONFIG.streakOccurrences.xpEvents
            ).length > 0;

            const bHasXp = getLinkedRecordIds(
                b,
                streakOccurrencesTable,
                CONFIG.streakOccurrences.xpEvents
            ).length > 0;

            if (aHasXp && !bHasXp) {
                return -1;
            }

            if (!aHasXp && bHasXp) {
                return 1;
            }

            return a.id.localeCompare(b.id);
        });

        const canonical = matchingOccurrences[0];

        const canonicalXpEventIds = getLinkedRecordIds(
            canonical,
            streakOccurrencesTable,
            CONFIG.streakOccurrences.xpEvents
        );

        const canonicalStatus = canonicalXpEventIds.length > 0
            ? CONFIG.values.statusAwarded
            : CONFIG.values.statusReady;

        const canonicalFields = {};

        addWritable(canonicalFields, streakOccurrencesTable, CONFIG.streakOccurrences.active, true);
        addWritable(canonicalFields, streakOccurrencesTable, CONFIG.streakOccurrences.streakDays, target.streakDays);
        addWritable(canonicalFields, streakOccurrencesTable, CONFIG.streakOccurrences.streakStartDate, dateValue(target.streakStartDateKey));
        addWritable(canonicalFields, streakOccurrencesTable, CONFIG.streakOccurrences.streakEndDate, dateValue(target.streakEndDateKey));
        addWritable(canonicalFields, streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus, canonicalStatus);
        addWritable(canonicalFields, streakOccurrencesTable, CONFIG.streakOccurrences.sourceSubmissionDate, dateValue(target.streakEndDateKey));
        addWritable(canonicalFields, streakOccurrencesTable, CONFIG.streakOccurrences.triggerSubmissionDate, dateValue(target.streakEndDateKey));
        addWritable(canonicalFields, streakOccurrencesTable, CONFIG.streakOccurrences.lastEvaluatedAt, nowIso);

        if (target.weekId) {
            addWritableRaw(canonicalFields, streakOccurrencesTable, CONFIG.streakOccurrences.week, [{ id: target.weekId }]);
        }

        if (Object.keys(canonicalFields).length > 0) {
            recordsToUpdate.push({
                id: canonical.id,
                fields: canonicalFields,
            });
        }

        canonicalCount++;

        for (let i = 1; i < matchingOccurrences.length; i++) {
            const duplicate = matchingOccurrences[i];

            const duplicateFields = {};

            addWritable(duplicateFields, streakOccurrencesTable, CONFIG.streakOccurrences.active, false);
            addWritable(duplicateFields, streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus, CONFIG.values.statusDuplicate);
            addWritable(duplicateFields, streakOccurrencesTable, CONFIG.streakOccurrences.lastEvaluatedAt, nowIso);
            addWritable(
                duplicateFields,
                streakOccurrencesTable,
                CONFIG.streakOccurrences.notes,
                `Duplicate streak occurrence. Canonical record: ${canonical.id}`
            );

            if (Object.keys(duplicateFields).length > 0) {
                recordsToUpdate.push({
                    id: duplicate.id,
                    fields: duplicateFields,
                });
            }

            duplicateCount++;
        }
    }

    if (recordsToUpdate.length > 0) {
        await batchUpdate(streakOccurrencesTable, recordsToUpdate);
    }


    /************************************************************************************************
     * SECTION 14 — OUTPUTS
     ************************************************************************************************/

    setOutputs({
        ok: true,
        actionOut: "rebuilt_and_upserted_streak_occurrences",
        statusOut: CONFIG.outputs.success,
        errorOut: "",
        modeOut: "single_enrollment_rebuild",
        submissionId: recordId,
        enrollmentId,
        validDatesProcessed: validDateKeys.length,
        streakBlocksFound: streakBlocks.length,
        activeStreakAchievements: activeStreakAchievements.length,
        targetOccurrences: targetOccurrencesByKey.size,
        recordsCreated: recordsToCreate.length,
        recordsUpdated: recordsToUpdate.length,
        canonicalRecords: canonicalCount,
        duplicateRecordsMarked: duplicateCount,
    });
}

await main();

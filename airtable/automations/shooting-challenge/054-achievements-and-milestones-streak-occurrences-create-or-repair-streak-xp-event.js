/*
Automation: 054 - Achievements and Milestones - Streak Occurrences - Create or Repair Streak XP Event
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
 * 054 - Achievements and Milestones - Streak Occurrences - Create or Repair Streak XP Event
 * Version: 5.2
 * Date Written: 2026-06-09
 *
 * SCRIPT TYPE
 * - Airtable Automation Script
 * - Required input variable: recordId
 *
 * CURRENT SCHEMA FIXES
 * - Does NOT use XP Bucket Key.
 * - Uses XP Bucket only.
 * - Uses XP Activity Date.
 * - Uses XP Activity Date Source.
 *
 * PURPOSE
 * - Reads one Streak Occurrence.
 * - Creates or repairs exactly one XP Event for that Streak Occurrence.
 * - Prevents duplicate streak XP using Source Key:
 *      STREAK_XP|Enrollment ID|Achievement ID|Streak End Date
 * - Links XP Event back to Streak Occurrence.
 * - Marks Streak Occurrence Source Status = Awarded.
 ************************************************************************************************/

async function main() {
    const CONFIG = {
        tables: {
            streakOccurrences: "Streak Occurrences",
            achievements: "Achievements",
            xpEvents: "XP Events",
            xpRules: "XP Reward Rules",
        },

        streakOccurrences: {
            active: "Active?",
            enrollment: "Enrollment",
            achievement: "Achievement",
            streakDays: "Streak Days",
            streakEndDate: "Streak End Date",
            week: "Week",
            sourceStatus: "Source Status",
            xpEvents: "XP Events",
            occurrenceKey: "Streak Occurrence Key",
            lastEvaluatedAt: "Last Evaluated At",
            notes: "Notes",
        },

        achievements: {
            achievementName: "Achievement Name",
            fallbackName: "Name",
            triggerThreshold: "Trigger Threshold",
            rewardRuleKey: "Reward Rule Key",
        },

        xpRules: {
            active: "Active?",
            ruleKey: "Rule Key",
            xpAmount: "XP Amount",
        },

        xpEvents: {
            enrollment: "Enrollment",
            week: "Week",
            streakOccurrence: "Streak Occurrence",
            xpSource: "XP Source",
            xpBucket: "XP Bucket",
            xpPoints: "XP Points",
            xpReasonPublic: "XP Reason Public",
            active: "Active?",
            sourceKey: "Source Key",
            xpActivityDate: "XP Activity Date",
            xpActivityDateSource: "XP Activity Date Source",
            awardMode: "Award Mode",
            processed: "Processed",
            xpAwardStatus: "XP Award Status",
        },

        values: {
            statusReady: "Ready for XP",
            statusAwarded: "Awarded",
            statusError: "Error",

            xpBucket: "Streak",
            xpActivityDateSource: "Streak End Date",
            awardModeAutomatic: "Automatic",
            xpAwardStatusAwarded: "Awarded",

            sourceKeyPrefix: "STREAK_XP|",
        },
    };

    const inputConfig = input.config();
    const recordId = String(inputConfig.recordId || "").trim();

    if (!recordId) {
        throw new Error("Missing required input variable: recordId");
    }

    const streakOccurrencesTable = base.getTable(CONFIG.tables.streakOccurrences);
    const achievementsTable = base.getTable(CONFIG.tables.achievements);
    const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
    const xpRulesTable = base.getTable(CONFIG.tables.xpRules);

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

        if (!type) return false;

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

    function getLinkedIds(record, table, fieldName) {
        if (!fieldExists(table, fieldName)) return [];
        const value = record.getCellValue(fieldName);
        return Array.isArray(value) ? value.map((item) => item.id).filter(Boolean) : [];
    }

    function getFirstLinkedId(record, table, fieldName) {
        const ids = getLinkedIds(record, table, fieldName);
        return ids.length ? ids[0] : "";
    }

    function getText(record, table, fieldName) {
        if (!record || !fieldExists(table, fieldName)) return "";

        const value = record.getCellValue(fieldName);

        if (value === null || value === undefined) return "";
        if (typeof value === "string") return value.trim();
        if (typeof value === "number") return String(value);

        if (value && value.name) return String(value.name).trim();

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

    function getSelectName(record, table, fieldName) {
        if (!fieldExists(table, fieldName)) return "";
        const value = record.getCellValue(fieldName);
        return value && value.name ? value.name : "";
    }

    function getNumber(record, table, fieldName) {
        if (!fieldExists(table, fieldName)) return 0;

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
        if (!fieldExists(table, fieldName)) return false;
        return record.getCellValue(fieldName) === true;
    }

    function toDateKey(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
    }

    function dateValue(dateKey) {
        return dateKey ? `${dateKey}T12:00:00.000Z` : null;
    }

    function makeSourceKey(enrollmentId, achievementId, streakEndDateKey) {
        return `${CONFIG.values.sourceKeyPrefix}${enrollmentId}|${achievementId}|${streakEndDateKey}`;
    }

    function makeFallbackRuleKey(streakDays) {
        return `STREAK_${streakDays}DAY`;
    }

    function makeReason(achievementName, streakDays, streakEndDateKey) {
        return `${achievementName}: ${streakDays}-day shooting streak reached on ${streakEndDateKey}.`;
    }

    function coerceValueForField(table, fieldName, value) {
        const type = fieldType(table, fieldName);

        if (type === "singleSelect") {
            return { name: String(value) };
        }

        return value;
    }

    function addWritable(fields, table, fieldName, value) {
        if (value === undefined || value === null) return;
        if (!fieldExists(table, fieldName)) return;
        if (!isWritableField(table, fieldName)) return;

        fields[fieldName] = coerceValueForField(table, fieldName, value);
    }

    function addWritableRaw(fields, table, fieldName, value) {
        if (value === undefined || value === null) return;
        if (!fieldExists(table, fieldName)) return;
        if (!isWritableField(table, fieldName)) return;

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

    function appendNote(existingNote, newNote) {
        const existing = String(existingNote || "").trim();
        if (!existing) return newNote;
        return `${existing}\n${newNote}`;
    }

    async function markOccurrenceError(reason, extraOutputs = {}) {
        const occurrenceForError = await streakOccurrencesTable.selectRecordAsync(recordId);

        const existingNote = occurrenceForError
            ? getText(occurrenceForError, streakOccurrencesTable, CONFIG.streakOccurrences.notes)
            : "";

        const updateFields = {};

        addWritable(updateFields, streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus, CONFIG.values.statusError);
        addWritable(updateFields, streakOccurrencesTable, CONFIG.streakOccurrences.lastEvaluatedAt, new Date().toISOString());
        addWritable(
            updateFields,
            streakOccurrencesTable,
            CONFIG.streakOccurrences.notes,
            appendNote(existingNote, `054 error: ${reason}`)
        );

        if (Object.keys(updateFields).length > 0 && occurrenceForError) {
            await streakOccurrencesTable.updateRecordAsync(recordId, updateFields);
        }

        output.set("ok", false);
        output.set("actionOut", "error");
        output.set("errorOut", reason);
        output.set("streakOccurrenceId", recordId);

        for (const [key, value] of Object.entries(extraOutputs)) {
            output.set(key, value);
        }
    }

    /************************************************************************************************
     * REQUIRED FIELDS
     ************************************************************************************************/

    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.active);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.enrollment);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.achievement);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.streakDays);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.streakEndDate);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus);
    requireField(streakOccurrencesTable, CONFIG.streakOccurrences.xpEvents);

    requireField(achievementsTable, CONFIG.achievements.achievementName);
    requireField(achievementsTable, CONFIG.achievements.triggerThreshold);
    requireField(achievementsTable, CONFIG.achievements.rewardRuleKey);

    requireField(xpRulesTable, CONFIG.xpRules.active);
    requireField(xpRulesTable, CONFIG.xpRules.ruleKey);
    requireField(xpRulesTable, CONFIG.xpRules.xpAmount);

    requireField(xpEventsTable, CONFIG.xpEvents.enrollment);
    requireField(xpEventsTable, CONFIG.xpEvents.streakOccurrence);
    requireField(xpEventsTable, CONFIG.xpEvents.xpSource);
    requireField(xpEventsTable, CONFIG.xpEvents.xpBucket);
    requireField(xpEventsTable, CONFIG.xpEvents.xpPoints);
    requireField(xpEventsTable, CONFIG.xpEvents.active);
    requireField(xpEventsTable, CONFIG.xpEvents.sourceKey);

    /************************************************************************************************
     * LOAD AND VALIDATE STREAK OCCURRENCE
     ************************************************************************************************/

    const occurrence = await streakOccurrencesTable.selectRecordAsync(recordId);

    if (!occurrence) {
        output.set("ok", false);
        output.set("actionOut", "skipped_missing_streak_occurrence");
        output.set("errorOut", `Streak Occurrence not found: ${recordId}`);
        return;
    }

    const active = isChecked(occurrence, streakOccurrencesTable, CONFIG.streakOccurrences.active);
    const sourceStatus = getSelectName(occurrence, streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus);

    if (!active) {
        output.set("ok", true);
        output.set("actionOut", "skipped_inactive_streak_occurrence");
        output.set("streakOccurrenceId", recordId);
        return;
    }

    if (sourceStatus !== CONFIG.values.statusReady) {
        output.set("ok", true);
        output.set("actionOut", "skipped_not_ready_for_xp");
        output.set("streakOccurrenceId", recordId);
        output.set("sourceStatus", sourceStatus);
        return;
    }

    const enrollmentId = getFirstLinkedId(occurrence, streakOccurrencesTable, CONFIG.streakOccurrences.enrollment);
    const achievementId = getFirstLinkedId(occurrence, streakOccurrencesTable, CONFIG.streakOccurrences.achievement);
    const weekId = getFirstLinkedId(occurrence, streakOccurrencesTable, CONFIG.streakOccurrences.week);
    const existingLinkedXpEventIds = getLinkedIds(occurrence, streakOccurrencesTable, CONFIG.streakOccurrences.xpEvents);

    const streakEndDateKey = toDateKey(occurrence.getCellValue(CONFIG.streakOccurrences.streakEndDate));
    const streakDays = getNumber(occurrence, streakOccurrencesTable, CONFIG.streakOccurrences.streakDays);

    if (!enrollmentId || !achievementId || !streakEndDateKey || streakDays <= 0) {
        await markOccurrenceError("Missing Enrollment, Achievement, Streak End Date, or Streak Days.", {
            enrollmentId,
            achievementId,
            streakEndDateKey,
            streakDays,
        });
        return;
    }

    /************************************************************************************************
     * ACHIEVEMENT AND XP RULE
     ************************************************************************************************/

    const achievement = await achievementsTable.selectRecordAsync(achievementId);

    if (!achievement) {
        await markOccurrenceError(`Achievement not found: ${achievementId}`);
        return;
    }

    const achievementName =
        getText(achievement, achievementsTable, CONFIG.achievements.achievementName) ||
        getText(achievement, achievementsTable, CONFIG.achievements.fallbackName);

    const achievementThreshold = getNumber(achievement, achievementsTable, CONFIG.achievements.triggerThreshold);
    const configuredRuleKey = getText(achievement, achievementsTable, CONFIG.achievements.rewardRuleKey);
    const fallbackRuleKey = makeFallbackRuleKey(achievementThreshold || streakDays);

    const allowedRuleKeys = [configuredRuleKey, fallbackRuleKey].filter(Boolean);

    if (!achievementName) {
        await markOccurrenceError(`Achievement has no usable name: ${achievementId}`);
        return;
    }

    if (!validateSingleSelectChoice(xpEventsTable, CONFIG.xpEvents.xpSource, achievementName)) {
        await markOccurrenceError(`XP Events → XP Source is missing this option: ${achievementName}`, {
            achievementName,
        });
        return;
    }

    if (!validateSingleSelectChoice(xpEventsTable, CONFIG.xpEvents.xpBucket, CONFIG.values.xpBucket)) {
        await markOccurrenceError(`XP Events → XP Bucket is missing this option: ${CONFIG.values.xpBucket}`);
        return;
    }

    const xpRulesQuery = await xpRulesTable.selectRecordsAsync({
        fields: optionalFields(xpRulesTable, [
            CONFIG.xpRules.active,
            CONFIG.xpRules.ruleKey,
            CONFIG.xpRules.xpAmount,
        ]),
    });

    const matchingRule = xpRulesQuery.records.find((rule) => {
        const ruleActive = isChecked(rule, xpRulesTable, CONFIG.xpRules.active);
        const ruleKey = getText(rule, xpRulesTable, CONFIG.xpRules.ruleKey);
        return ruleActive && allowedRuleKeys.includes(ruleKey);
    });

    if (!matchingRule) {
        await markOccurrenceError(`No active XP Reward Rule found. Tried: ${allowedRuleKeys.join(", ")}`, {
            achievementName,
            allowedRuleKeys: allowedRuleKeys.join(", "),
        });
        return;
    }

    const xpAmount = getNumber(matchingRule, xpRulesTable, CONFIG.xpRules.xpAmount);

    if (xpAmount <= 0) {
        await markOccurrenceError(`XP Reward Rule has no positive XP Amount: ${matchingRule.id}`, {
            xpRuleId: matchingRule.id,
            achievementName,
        });
        return;
    }

    /************************************************************************************************
     * FIND EXISTING XP EVENT
     ************************************************************************************************/

    const sourceKey = makeSourceKey(enrollmentId, achievementId, streakEndDateKey);

    const xpEventsQuery = await xpEventsTable.selectRecordsAsync({
        fields: optionalFields(xpEventsTable, [
            CONFIG.xpEvents.enrollment,
            CONFIG.xpEvents.week,
            CONFIG.xpEvents.streakOccurrence,
            CONFIG.xpEvents.xpSource,
            CONFIG.xpEvents.xpBucket,
            CONFIG.xpEvents.xpPoints,
            CONFIG.xpEvents.xpReasonPublic,
            CONFIG.xpEvents.active,
            CONFIG.xpEvents.sourceKey,
            CONFIG.xpEvents.xpActivityDate,
            CONFIG.xpEvents.xpActivityDateSource,
            CONFIG.xpEvents.awardMode,
            CONFIG.xpEvents.processed,
            CONFIG.xpEvents.xpAwardStatus,
        ]),
    });

    const existingMap = new Map();

    for (const xpEvent of xpEventsQuery.records) {
        const existingSourceKey = getText(xpEvent, xpEventsTable, CONFIG.xpEvents.sourceKey);
        const linkedOccurrenceIds = getLinkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.streakOccurrence);

        const matchesSourceKey = existingSourceKey === sourceKey;
        const matchesOccurrenceLink = linkedOccurrenceIds.includes(recordId);
        const matchesLinkedFromOccurrence = existingLinkedXpEventIds.includes(xpEvent.id);

        if (matchesSourceKey || matchesOccurrenceLink || matchesLinkedFromOccurrence) {
            existingMap.set(xpEvent.id, xpEvent);
        }
    }

    const existingXpEvents = [...existingMap.values()].sort((a, b) => a.id.localeCompare(b.id));
    const canonicalXpEvent = existingXpEvents.length > 0 ? existingXpEvents[0] : null;
    const duplicateXpEvents = existingXpEvents.slice(1);

    /************************************************************************************************
     * CREATE OR REPAIR XP EVENT
     ************************************************************************************************/

    const xpDateIso = dateValue(streakEndDateKey);
    const xpReason = makeReason(achievementName, streakDays, streakEndDateKey);

    const xpFields = {};

    addWritableRaw(xpFields, xpEventsTable, CONFIG.xpEvents.enrollment, [{ id: enrollmentId }]);
    addWritableRaw(xpFields, xpEventsTable, CONFIG.xpEvents.streakOccurrence, [{ id: recordId }]);

    if (weekId) {
        addWritableRaw(xpFields, xpEventsTable, CONFIG.xpEvents.week, [{ id: weekId }]);
    }

    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.xpSource, achievementName);
    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.xpBucket, CONFIG.values.xpBucket);
    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.xpPoints, xpAmount);
    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.xpReasonPublic, xpReason);
    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.active, true);
    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.sourceKey, sourceKey);
    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.xpActivityDate, xpDateIso);
    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.xpActivityDateSource, CONFIG.values.xpActivityDateSource);
    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.awardMode, CONFIG.values.awardModeAutomatic);
    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.processed, true);
    addWritable(xpFields, xpEventsTable, CONFIG.xpEvents.xpAwardStatus, CONFIG.values.xpAwardStatusAwarded);

    let xpEventId = "";
    let actionOut = "";

    try {
        if (canonicalXpEvent) {
            await xpEventsTable.updateRecordAsync(canonicalXpEvent.id, xpFields);
            xpEventId = canonicalXpEvent.id;
            actionOut = "updated_xp_event";
        } else {
            xpEventId = await xpEventsTable.createRecordAsync(xpFields);
            actionOut = "created_xp_event";
        }
    } catch (error) {
        await markOccurrenceError(`Failed to create/update XP Event: ${error.message || error}`, {
            achievementName,
            sourceKey,
        });
        return;
    }

    /************************************************************************************************
     * MARK DUPLICATE XP EVENTS INACTIVE
     ************************************************************************************************/

    let duplicateXpEventsMarkedInactive = 0;

    for (const duplicate of duplicateXpEvents) {
        const duplicateFields = {};

        addWritable(duplicateFields, xpEventsTable, CONFIG.xpEvents.active, false);
        addWritable(
            duplicateFields,
            xpEventsTable,
            CONFIG.xpEvents.xpReasonPublic,
            `Duplicate streak XP event. Canonical XP Event: ${xpEventId}. Source Key: ${sourceKey}`
        );

        if (Object.keys(duplicateFields).length > 0) {
            await xpEventsTable.updateRecordAsync(duplicate.id, duplicateFields);
            duplicateXpEventsMarkedInactive++;
        }
    }

    /************************************************************************************************
     * LINK SOURCE RECORD AND MARK AWARDED
     ************************************************************************************************/

    const occurrenceFields = {};

    addWritableRaw(occurrenceFields, streakOccurrencesTable, CONFIG.streakOccurrences.xpEvents, [{ id: xpEventId }]);
    addWritable(occurrenceFields, streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus, CONFIG.values.statusAwarded);
    addWritable(occurrenceFields, streakOccurrencesTable, CONFIG.streakOccurrences.lastEvaluatedAt, new Date().toISOString());

    const existingOccurrenceNote = getText(occurrence, streakOccurrencesTable, CONFIG.streakOccurrences.notes);

    addWritable(
        occurrenceFields,
        streakOccurrencesTable,
        CONFIG.streakOccurrences.notes,
        appendNote(existingOccurrenceNote, `054 awarded/repaired streak XP through XP Event ${xpEventId}. Source Key: ${sourceKey}.`)
    );

    await streakOccurrencesTable.updateRecordAsync(recordId, occurrenceFields);

    /************************************************************************************************
     * OUTPUTS
     ************************************************************************************************/

    output.set("ok", true);
    output.set("actionOut", actionOut);
    output.set("errorOut", "");
    output.set("streakOccurrenceId", recordId);
    output.set("xpEventId", xpEventId);
    output.set("enrollmentId", enrollmentId);
    output.set("achievementId", achievementId);
    output.set("achievementName", achievementName);
    output.set("streakDays", streakDays);
    output.set("streakEndDateKey", streakEndDateKey);
    output.set("weekId", weekId || "");
    output.set("xpAmount", xpAmount);
    output.set("xpRuleId", matchingRule.id);
    output.set("sourceKey", sourceKey);
    output.set("duplicateXpEventsMarkedInactive", duplicateXpEventsMarkedInactive);
}

await main();

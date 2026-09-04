/*
Automation: 059 - Achievements and Milestones - Create XP Event from Achievement Unlock
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-21
Last GitHub Update: 2026-09-04

Purpose:
Creates one XP Event from one Athlete Achievement Unlock for Perfect Week or Shot Milestone.

Trigger:
Athlete Achievement Unlock lifecycle reconciliation; native configuration must
reach both Pending award/restoration and Active? withdrawal updates.

Important Tables:
Athlete Achievement Unlocks, Achievements, XP Reward Rules, XP Events, Shot Milestones, Weeks, Weekly Athlete Summary

Important Fields:
Achievement, Enrollment, Week, XP Events, XP Award Status, Source Key, Milestone Activity Date, Weekly Athlete Summary

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/***************************************************************************************************
 * 059 - Achievements and Milestones - Create XP Event from Achievement Unlock
 *
 * Version: v3.8
 * Date Written: 2026-06-05
 * Last Updated: 2026-09-04
 *
 * PURPOSE
 * - Creates one XP Event from one Athlete Achievement Unlock.
 * - Links XP Event to Weekly Athlete Summary from unlock or Enrollment + Week lookup.
 * - Supports Perfect Week and Shot Milestone achievement types.
 *
 * CHANGELOG
 * - 2026-09-04: SC-159 - nested OR not representable in Automation UI; trigger via formula
 *   field 059 Lifecycle Trigger? (or dual 059/059B). OR checklist superseded.
 * - 2026-09-04: SF-08 - Pending+Active alone left orphan XP on Active? clear; script
 *   withdraw/restore + lifecycleOut; Unlock notes = Trigger Context; Milestone Source Key alias.
 * - 2026-08-29: Perfect Week XP Source Key prefers Unlocks Milestone Source Key; unlock notes field = Coach Note.
 * - 2026-08-05: Recommended trigger lock — Pending only (no Shot Milestone filter) so Perfect Week unlocks from 058 fire 059.
 *
 * IMPORTANT DESIGN RULES
 * - Never writes a field named "undefined".
 * - Writes Shot Milestone XP Activity Date from Milestone Activity Date.
 * - Writes XP Activity Date Source = Shot Milestone Activity Date for shot milestones.
 * - Uses XP Bucket, not XP Bucket Key.
 * - Uses XP Activity Date, not old XP Source Date.
 * - Uses XP Activity Date Source, not old XP Date Source.
 * - One unlock record -> one XP Event; duplicate protection by Source Key and Achievement Unlock link.
 * - For Shot Milestone unlocks only, Active? is the observable lifecycle
 *   contract: an inactive exact unlock deactivates its same XP Event and a
 *   restored Pending unlock reactivates it. Perfect Week remains unchanged.
 *
 * FOLDER
 * - 05 - Achievements and Milestones
 *
 * AUTOMATION NAME
 * - 059 - Achievements and Milestones - Create XP Event from Achievement Unlock
 *
 * TRIGGER TABLE
 * - Athlete Achievement Unlocks
 *
 * TRIGGER TYPE
 * - When record updated (or an equivalent native configuration that re-enters
 *   both award/restoration and inactive-withdrawal updates).
 *
 * REQUIRED LIFECYCLE TRIGGER (Airtable UI) - SC-159
 * - Automation UI cannot nest OR-of-AND groups on "When record matches conditions".
 * - REQUIRED supported design: formula field "059 Lifecycle Trigger?" = 1, then
 *   recordMatchesConditions on that single field (see deploy checklist).
 * - Exact formula:
 *     IF(OR(AND({XP Award Status}="Pending",{Active?}),
 *           AND(NOT({Active?}),{Shot Milestone},{XP Award Status}="Awarded")),1,0)
 * - Awarded gate on withdraw branch forces formula to 0 after Skipped settle so restore can re-enter.
 * - Do NOT use nested OR checklist (superseded). Do NOT flatten four conditions.
 * - Do NOT filter on Ready for 059 XP? or XP Events empty.
 * - Alternative: dual automations 059 + 059B (same script) - see redesign audit.
 * - Dynamic recordId maps to the triggering Athlete Achievement Unlock ID.
 * - PROD: docs/deploy-checklists/059-sc159-lifecycle-formula-trigger.md
 *   Design: docs/audits/SC-159-LIFECYCLE-TRIGGER-REDESIGN-20260904.md
 *   SF-08 proof: docs/audits/SF-08-059-LIFECYCLE-CLOSEOUT-20260904.md
 *
 * RECOMMENDED TRIGGER
 * - recordMatchesConditions: 059 Lifecycle Trigger? = 1 only.
 *   Do NOT filter on Ready for 059 XP.
 *
 * STUCK ROW REPAIR
 * - Pending + XP Events linked + Ready for 059 XP? = 0 → run extension script
 *   backfill-shot-milestone-unlock-mark-awarded.js
 *
 * REQUIRED INPUT
 * - recordId = Airtable record ID from triggering Athlete Achievement Unlock
 *
 * REQUIRED OUTPUTS
 * - statusOut = created | updated | skipped | error
 * - actionOut
 * - errorOut
 * - debugStep
 * - lifecycleOut = award | withdraw | restore | skip | error (visible reconciliation)
 ***************************************************************************************************/

// @ts-nocheck

/***************************************************************************************************
 * SECTION 1 — CONFIGURATION
 ***************************************************************************************************/

const CONFIG = {
    scriptName: "059 - Achievements and Milestones - Create XP Event from Achievement Unlock",
    version: "v3.8",

    tables: {
        unlocks: "Athlete Achievement Unlocks",
        achievements: "Achievements",
        xpRewardRules: "XP Reward Rules",
        xpEvents: "XP Events",
        shotMilestones: "Shot Milestones",
        weeks: "Weeks",
        weeklySummary: "Weekly Athlete Summary",
    },

    statuses: {
        pending: "Pending",
        awarded: "Awarded",
        error: "Error",
        skipped: "Skipped",
    },

    ruleKeys: {
        perfectWeek: "PERFECT_WEEK",
        shotMilestone: "SHOT_MILESTONE",
    },

    xpBuckets: {
        perfectWeek: "Perfect Week",
        shotMilestone: "Shot Milestone",
    },

    xpSources: {
        perfectWeek: "Perfect Week",
        shotMilestone: "Shot Milestone",
    },

    xpActivityDateSources: {
        perfectWeek: "Perfect Week End Date",
        shotMilestone: "Shot Milestone Activity Date",
    },

    unlockFields: {
        achievement: "Achievement",
        enrollment: "Enrollment",
        week: "Week",
        xpEvents: "XP Events",
        xpAwardStatus: "XP Award Status",
        xpAwarded: "XP Awarded",
        active: "Active?",

        shotMilestone: "Shot Milestone",
        milestoneSourceKey: "Milestone Source Key",
        milestoneActivityDate: "Milestone Activity Date",

        // Live Unlocks key text (Milestone Source Key). XP Events keeps its own "Source Key".
        sourceKey: "Milestone Source Key",
        unlockKey: "Unlock Key",
        // Live Unlocks operator notes field (Trigger Context). Coach Note remains unused by 059.
        notes: "Trigger Context",

        unlockedDate: "Unlocked Date",
        fallbackUnlockedDate: "Date Unlocked",

        weeklySummary: "Weekly Athlete Summary",
    },

    achievementFields: {
        achievementName: "Achievement Name",
        fallbackName: "Name",
        rewardRuleKey: "Reward Rule Key",
        active: "Active?",
    },

    rewardRuleFields: {
        ruleKey: "Rule Key",
        xpAmount: "XP Amount",
        active: "Active?",
    },

    shotMilestoneFields: {
        pointsAwarded: "Points Awarded",
        milestoneUniqueKey: "Milestone Unique Key",
        milestoneLabel: "Milestone Label",
        milestonePercent: "Milestone Percent",
        milestoneTier: "Milestone Tier",
        milestoneShotCount: "Milestone Shot Count",
        active: "Active?",
        fallbackActive: "Active",
    },

    weekFields: {
        weekEndDate: "Week End Date",
        fallbackEndDate: "End Date",
    },

    weeklySummaryFields: {
        enrollment: "Enrollment",
        week: "Week",
    },

    xpEventFields: {
        enrollment: "Enrollment",
        week: "Week",
        achievementUnlock: "Achievement Unlock",
        shotMilestones: "Shot Milestones",
        weeklySummary: "Weekly Athlete Summary",

        xpPoints: "XP Points",
        xpSource: "XP Source",
        xpBucket: "XP Bucket",
        sourceKey: "Source Key",

        xpReasonPublic: "XP Reason Public",
        xpReasonDebug: "XP Reason Debug",
        notes: "Notes",

        xpActivityDate: "XP Activity Date",
        xpActivityDateSource: "XP Activity Date Source",

        awardedAt: "Awarded At",
        active: "Active?",
        processed: "Processed",
        awardMode: "Award Mode",
        active: "Active?",
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

let unlocksTable = null;
let achievementsTable = null;
let xpRewardRulesTable = null;
let xpEventsTable = null;
let shotMilestonesTable = null;
let weeksTable = null;
let weeklySummaryTable = null;
let weeklySummaryQueryCache = null;
let achievementNameFieldName = "";
let summaryEnrollmentField = null;
let summaryWeekField = null;
let unlockRecord = null;

let unlock = {};
let achievement = {};
let rewardRule = {};
let shotMilestone = {};
let week = {};
let xp = {};


/***************************************************************************************************
 * SECTION 2 — HELPERS
 ***************************************************************************************************/

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
        // Ignore output mapping errors.
    }
}

function setOutputs(values) {
    for (const [key, value] of Object.entries(values)) {
        setOutputSafe(key, value);
    }
}

function findField(table, fieldName) {
    return table.fields.find((field) => field.name === fieldName) || null;
}

function requireFieldOnTable(table, fieldName) {
    const field = findField(table, fieldName);

    if (!field) {
        throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
    }

    return field;
}

function optionalField(table, fieldName) {
    return findField(table, fieldName);
}

function getAvailableFieldName(table, preferredName, fallbackName = null) {
    if (findField(table, preferredName)) return preferredName;
    if (fallbackName && findField(table, fallbackName)) return fallbackName;
    return null;
}

function fieldNames(fields) {
    return fields
        .filter((field) => field && field.name)
        .map((field) => field.name);
}

function getLinkedIds(record, field) {
    if (!field) return [];

    const value = record.getCellValue(field);

    if (!Array.isArray(value)) return [];

    return value.map((item) => item.id).filter(Boolean);
}

function getFirstLinkedId(record, field) {
    const ids = getLinkedIds(record, field);
    return ids.length > 0 ? ids[0] : null;
}

async function loadWeeklySummaryQuery() {
    if (weeklySummaryQueryCache) {
        return weeklySummaryQueryCache;
    }

    weeklySummaryQueryCache = await weeklySummaryTable.selectRecordsAsync({
        fields: fieldNames([summaryEnrollmentField, summaryWeekField]),
    });

    return weeklySummaryQueryCache;
}

async function findWeeklySummaryId(enrollmentId, weekId) {
    const cleanEnrollmentId = String(enrollmentId || "").trim();
    const cleanWeekId = String(weekId || "").trim();

    if (!cleanEnrollmentId || !cleanWeekId || !summaryEnrollmentField || !summaryWeekField) {
        return "";
    }

    const query = await loadWeeklySummaryQuery();

    const matches = query.records.filter((record) => {
        const summaryEnrollmentId = getFirstLinkedId(record, summaryEnrollmentField);
        const summaryWeekId = getFirstLinkedId(record, summaryWeekField);

        return summaryEnrollmentId === cleanEnrollmentId && summaryWeekId === cleanWeekId;
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
    const fromSource = [...new Set((sourceWeeklySummaryIds || []).filter(Boolean))];

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

async function ensureXpEventWeeklySummaryLink(xpEventId, weeklySummaryId) {
    if (!xpEventId || !weeklySummaryId || !xp.weeklySummary) {
        return false;
    }

    const payload = {};

    addToPayload(payload, xp.weeklySummary, [{ id: weeklySummaryId }]);

    if (Object.keys(payload).length === 0) {
        return false;
    }

    await xpEventsTable.updateRecordAsync(xpEventId, payload);
    return true;
}

function getText(record, field) {
    if (!field) return "";

    try {
        return record.getCellValueAsString(field).trim();
    } catch {
        return "";
    }
}

function getSingleSelectName(record, field) {
    if (!field) return "";

    const value = record.getCellValue(field);

    if (value && value.name) return value.name;

    return "";
}

function getNumber(record, field) {
    if (!field) return 0;

    const value = record.getCellValue(field);

    if (typeof value === "number") return value;

    if (Array.isArray(value) && value.length > 0) {
        const first = value[0];

        if (typeof first === "number") return first;

        const parsedFirst = Number(first);
        return Number.isFinite(parsedFirst) ? parsedFirst : 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getDateValue(record, field) {
    if (!field) return null;

    const value = record.getCellValue(field);

    if (!value) return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (Array.isArray(value) && value.length > 0) {
        const first = value[0];

        if (first instanceof Date && !Number.isNaN(first.getTime())) {
            return first;
        }

        if (typeof first === "string") {
            const parsed = new Date(first);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
    }

    return null;
}

function formatDate(dateValue) {
    if (!dateValue) return "No date";

    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function hasSingleSelectChoice(field, choiceName) {
    if (!field || field.type !== "singleSelect") return true;

    const choices = field.options?.choices || [];

    return choices.some((choice) => choice.name === choiceName);
}

function valueForField(field, value, options = {}) {
    const required = options.required === true;

    if (!field) {
        if (required) {
            throw new Error(`Missing required field for value: ${value}`);
        }

        return undefined;
    }

    if (field.type === "singleSelect") {
        if (!hasSingleSelectChoice(field, value)) {
            if (required) {
                throw new Error(
                    `Missing single-select option "${value}" on field "${field.name}".`
                );
            }

            return undefined;
        }

        return { name: value };
    }

    return value;
}

function addToPayload(payload, field, value) {
    if (!field) return;
    if (!field.name) return;
    if (field.name === "undefined") return;
    if (value === undefined) return;

    payload[field.name] = value;
}

function addTextToPayload(payload, field, value) {
    if (!field) return;
    if (!field.name) return;
    if (field.name === "undefined") return;
    if (value === undefined || value === null) return;

    payload[field.name] = String(value);
}

function buildSafeUpdate(fields) {
    const safeFields = {};

    for (const [fieldName, value] of Object.entries(fields)) {
        if (!fieldName) continue;
        if (fieldName === "undefined") continue;
        if (value === undefined) continue;

        safeFields[fieldName] = value;
    }

    return safeFields;
}

function addUpdateField(update, field, value) {
    if (!field) return;
    if (!field.name) return;
    if (field.name === "undefined") return;
    if (value === undefined) return;

    update[field.name] = value;
}

function buildPerfectWeekSourceKey(enrollmentId, weekId, fallbackKey) {
    if (fallbackKey) return fallbackKey;
    return `PERFECT_WEEK|${enrollmentId}|${weekId}`;
}

function buildShotMilestoneSourceKey(enrollmentId, shotMilestoneId, fallbackKey) {
    if (fallbackKey) return fallbackKey;
    return `SHOT_MILESTONE|${enrollmentId}|${shotMilestoneId}`;
}

function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return number.toLocaleString("en-US");
}

function sentence(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/[.!?]$/.test(text)) return text;
    return `${text}.`;
}

function buildShotMilestoneReasonPublic(percent, tier, shotCount) {
    let reason = "Shot milestone reached";

    if (percent && tier) {
        reason = `Shot milestone reached: ${percent}% ${tier} milestone`;
    } else if (percent) {
        reason = `Shot milestone reached: ${percent}% milestone`;
    }

    if (shotCount) {
        reason += ` — ${formatNumber(shotCount)} shots`;
    }

    return sentence(reason);
}

function buildPerfectWeekReasonPublic() {
    return "Perfect Week completed.";
}

function buildUnlockFieldsToLoad() {
    return fieldNames([
        unlock.achievement,
        unlock.enrollment,
        unlock.week,
        unlock.xpEvents,
        unlock.xpAwardStatus,
        unlock.xpAwarded,
        unlock.active,

        unlock.shotMilestone,
        unlock.milestoneSourceKey,
        unlock.milestoneActivityDate,

        unlock.sourceKey,
        unlock.unlockKey,
        unlock.notes,

        unlock.unlockedDate,
        unlock.fallbackUnlockedDate,

        unlock.weeklySummary,
    ]);
}

async function updateUnlock(fields) {
    const safeFields = buildSafeUpdate(fields);

    if (Object.keys(safeFields).length > 0) {
        await unlocksTable.updateRecordAsync(unlockRecord.id, safeFields);
    }
}

async function markUnlockError(message, debugStep, actionOut = "unlock_validation_error") {
    const update = {};

    addUpdateField(
        update,
        unlock.xpAwardStatus,
        valueForField(unlock.xpAwardStatus, CONFIG.statuses.error, { required: false })
    );

    addUpdateField(update, unlock.notes, message);

    await updateUnlock(update);

    setOutputs({
        statusOut: CONFIG.outputStatuses.error,
        actionOut,
        errorOut: message,
        result: message,
        unlockId: unlockRecord ? unlockRecord.id : "",
        debugStep,
        lifecycleOut: "error",
    });
}

async function markUnlockSkipped(message, debugStep, actionOut = "unlock_skipped") {
    const update = {};

    addUpdateField(
        update,
        unlock.xpAwardStatus,
        valueForField(unlock.xpAwardStatus, CONFIG.statuses.skipped, { required: false })
    );

    addUpdateField(update, unlock.notes, message);

    await updateUnlock(update);

    setOutputs({
        statusOut: CONFIG.outputStatuses.skipped,
        actionOut,
        errorOut: "",
        result: message,
        unlockId: unlockRecord ? unlockRecord.id : "",
        debugStep,
    });
}

async function getXpAmountFromRewardRule(ruleKey) {
    if (!ruleKey) return 0;

    const rewardRuleQuery = await xpRewardRulesTable.selectRecordsAsync({
        fields: fieldNames([
            rewardRule.ruleKey,
            rewardRule.xpAmount,
            rewardRule.active,
        ]),
    });

    const matchingRules = rewardRuleQuery.records.filter((rule) => {
        const existingRuleKey = getText(rule, rewardRule.ruleKey);

        const active = rewardRule.active
            ? rule.getCellValue(rewardRule.active) === true
            : true;

        return active && existingRuleKey === ruleKey;
    });

    if (matchingRules.length === 0) return 0;

    if (matchingRules.length > 1) {
        throw new Error(`Multiple active XP Reward Rules found for Rule Key "${ruleKey}".`);
    }

    return getNumber(matchingRules[0], rewardRule.xpAmount);
}

function assertRequiredSchema() {
    summaryEnrollmentField = optionalField(
        weeklySummaryTable,
        CONFIG.weeklySummaryFields.enrollment
    );
    summaryWeekField = optionalField(
        weeklySummaryTable,
        CONFIG.weeklySummaryFields.week
    );

    unlock = {
        achievement: requireFieldOnTable(unlocksTable, CONFIG.unlockFields.achievement),
        enrollment: requireFieldOnTable(unlocksTable, CONFIG.unlockFields.enrollment),
        week: optionalField(unlocksTable, CONFIG.unlockFields.week),
        xpEvents: requireFieldOnTable(unlocksTable, CONFIG.unlockFields.xpEvents),
        xpAwardStatus: requireFieldOnTable(unlocksTable, CONFIG.unlockFields.xpAwardStatus),
        xpAwarded: optionalField(unlocksTable, CONFIG.unlockFields.xpAwarded),
        active: optionalField(unlocksTable, CONFIG.unlockFields.active),

        shotMilestone: optionalField(unlocksTable, CONFIG.unlockFields.shotMilestone),
        milestoneSourceKey: optionalField(unlocksTable, CONFIG.unlockFields.milestoneSourceKey),
        milestoneActivityDate: optionalField(unlocksTable, CONFIG.unlockFields.milestoneActivityDate),

        sourceKey: optionalField(unlocksTable, CONFIG.unlockFields.sourceKey),
        unlockKey: optionalField(unlocksTable, CONFIG.unlockFields.unlockKey),
        notes:
            optionalField(unlocksTable, CONFIG.unlockFields.notes) ||
            optionalField(unlocksTable, "Coach Note"),

        unlockedDate: optionalField(unlocksTable, CONFIG.unlockFields.unlockedDate),
        fallbackUnlockedDate: optionalField(unlocksTable, CONFIG.unlockFields.fallbackUnlockedDate),

        weeklySummary: optionalField(unlocksTable, CONFIG.unlockFields.weeklySummary),
    };

    achievementNameFieldName = getAvailableFieldName(
        achievementsTable,
        CONFIG.achievementFields.achievementName,
        CONFIG.achievementFields.fallbackName
    );

    if (!achievementNameFieldName) {
        throw new Error("Achievements table is missing Achievement Name or Name field.");
    }

    achievement = {
        name: requireFieldOnTable(achievementsTable, achievementNameFieldName),
        rewardRuleKey: requireFieldOnTable(achievementsTable, CONFIG.achievementFields.rewardRuleKey),
        active: optionalField(achievementsTable, CONFIG.achievementFields.active),
    };

    rewardRule = {
        ruleKey: requireFieldOnTable(xpRewardRulesTable, CONFIG.rewardRuleFields.ruleKey),
        xpAmount: requireFieldOnTable(xpRewardRulesTable, CONFIG.rewardRuleFields.xpAmount),
        active: optionalField(xpRewardRulesTable, CONFIG.rewardRuleFields.active),
    };

    shotMilestone = {
        pointsAwarded: optionalField(shotMilestonesTable, CONFIG.shotMilestoneFields.pointsAwarded),
        milestoneUniqueKey: optionalField(shotMilestonesTable, CONFIG.shotMilestoneFields.milestoneUniqueKey),
        milestoneLabel: optionalField(shotMilestonesTable, CONFIG.shotMilestoneFields.milestoneLabel),
        milestonePercent: optionalField(shotMilestonesTable, CONFIG.shotMilestoneFields.milestonePercent),
        milestoneTier: optionalField(shotMilestonesTable, CONFIG.shotMilestoneFields.milestoneTier),
        milestoneShotCount: optionalField(shotMilestonesTable, CONFIG.shotMilestoneFields.milestoneShotCount),
        active:
            optionalField(shotMilestonesTable, CONFIG.shotMilestoneFields.active) ||
            optionalField(shotMilestonesTable, CONFIG.shotMilestoneFields.fallbackActive),
    };

    week = {
        weekEndDate:
            optionalField(weeksTable, CONFIG.weekFields.weekEndDate) ||
            optionalField(weeksTable, CONFIG.weekFields.fallbackEndDate),
    };

    xp = {
        enrollment: requireFieldOnTable(xpEventsTable, CONFIG.xpEventFields.enrollment),
        week: optionalField(xpEventsTable, CONFIG.xpEventFields.week),
        achievementUnlock: requireFieldOnTable(xpEventsTable, CONFIG.xpEventFields.achievementUnlock),
        shotMilestones: optionalField(xpEventsTable, CONFIG.xpEventFields.shotMilestones),
        weeklySummary: optionalField(xpEventsTable, CONFIG.xpEventFields.weeklySummary),

        xpPoints: requireFieldOnTable(xpEventsTable, CONFIG.xpEventFields.xpPoints),
        xpSource: requireFieldOnTable(xpEventsTable, CONFIG.xpEventFields.xpSource),
        xpBucket: requireFieldOnTable(xpEventsTable, CONFIG.xpEventFields.xpBucket),
        sourceKey: requireFieldOnTable(xpEventsTable, CONFIG.xpEventFields.sourceKey),

        xpReasonPublic: optionalField(xpEventsTable, CONFIG.xpEventFields.xpReasonPublic),
        xpReasonDebug: optionalField(xpEventsTable, CONFIG.xpEventFields.xpReasonDebug),
        notes: optionalField(xpEventsTable, CONFIG.xpEventFields.notes),

        xpActivityDate: requireFieldOnTable(xpEventsTable, CONFIG.xpEventFields.xpActivityDate),
        xpActivityDateSource: requireFieldOnTable(xpEventsTable, CONFIG.xpEventFields.xpActivityDateSource),

        awardedAt: optionalField(xpEventsTable, CONFIG.xpEventFields.awardedAt),
        active: optionalField(xpEventsTable, CONFIG.xpEventFields.active),
        processed: optionalField(xpEventsTable, CONFIG.xpEventFields.processed),
        awardMode: optionalField(xpEventsTable, CONFIG.xpEventFields.awardMode),
    };

    for (const statusName of [
        CONFIG.statuses.pending,
        CONFIG.statuses.awarded,
        CONFIG.statuses.error,
        CONFIG.statuses.skipped,
    ]) {
        if (!hasSingleSelectChoice(unlock.xpAwardStatus, statusName)) {
            throw new Error(
                `Missing single-select option "${statusName}" on Athlete Achievement Unlocks -> XP Award Status.`
            );
        }
    }

    for (const [fieldRef, value] of [
        [xp.xpSource, CONFIG.xpSources.perfectWeek],
        [xp.xpSource, CONFIG.xpSources.shotMilestone],
        [xp.xpBucket, CONFIG.xpBuckets.perfectWeek],
        [xp.xpBucket, CONFIG.xpBuckets.shotMilestone],
        [xp.xpActivityDateSource, CONFIG.xpActivityDateSources.perfectWeek],
        [xp.xpActivityDateSource, CONFIG.xpActivityDateSources.shotMilestone],
    ]) {
        if (!hasSingleSelectChoice(fieldRef, value)) {
            throw new Error(
                `Missing single-select option "${value}" on XP Events -> ${fieldRef.name}.`
            );
        }
    }
}


/***************************************************************************************************
 * SECTION 3 — MAIN
 ***************************************************************************************************/

async function main() {
    let debugStep = "1 - Start";
    let recordId = "";

    try {
        setOutputSafe("debugStep", debugStep);

        debugStep = "2 - Read Input";
        setOutputSafe("debugStep", debugStep);

        const inputConfig = input.config();
        recordId = String(inputConfig.recordId || "").trim();

        if (!recordId) {
            throw new Error("Missing input variable: recordId");
        }

        if (!recordId.startsWith("rec")) {
            throw new Error(`Invalid Athlete Achievement Unlock recordId input: ${recordId}`);
        }

        debugStep = "3 - Load Tables";
        setOutputSafe("debugStep", debugStep);

        unlocksTable = base.getTable(CONFIG.tables.unlocks);
        achievementsTable = base.getTable(CONFIG.tables.achievements);
        xpRewardRulesTable = base.getTable(CONFIG.tables.xpRewardRules);
        xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
        shotMilestonesTable = base.getTable(CONFIG.tables.shotMilestones);
        weeksTable = base.getTable(CONFIG.tables.weeks);
        weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
        weeklySummaryQueryCache = null;

        debugStep = "4 - Validate Schema";
        setOutputSafe("debugStep", debugStep);
        assertRequiredSchema();

        debugStep = "5 - Load Trigger Unlock";
        setOutputSafe("debugStep", debugStep);

        unlockRecord = await unlocksTable.selectRecordAsync(recordId, {
            fields: buildUnlockFieldsToLoad(),
        });

        if (!unlockRecord) {
            throw new Error(`Athlete Achievement Unlock record not found: ${recordId}`);
        }

        debugStep = "6 - Validate Trigger Unlock";
        setOutputSafe("debugStep", debugStep);

        const achievementId = getFirstLinkedId(unlockRecord, unlock.achievement);
        const enrollmentId = getFirstLinkedId(unlockRecord, unlock.enrollment);
        const weekId = unlock.week ? getFirstLinkedId(unlockRecord, unlock.week) : null;
        const existingXpEventIds = getLinkedIds(unlockRecord, unlock.xpEvents);

        const linkedShotMilestoneId = unlock.shotMilestone
            ? getFirstLinkedId(unlockRecord, unlock.shotMilestone)
            : null;

        const weeklySummaryIds = unlock.weeklySummary
            ? getLinkedIds(unlockRecord, unlock.weeklySummary)
            : [];

        const awardStatus = getSingleSelectName(unlockRecord, unlock.xpAwardStatus);
        const unlockActive = unlock.active
            ? unlockRecord.getCellValue(unlock.active) === true
            : true;

        if (!achievementId) {
            await markUnlockError("059 error: Missing Achievement.", debugStep, "missing_achievement");
            return;
        }

        if (!enrollmentId) {
            await markUnlockError("059 error: Missing Enrollment.", debugStep, "missing_enrollment");
            return;
        }

        // 066 supplies Active? only for Shot Milestone lifecycle reconciliation.
        // Perfect Week has no Shot Milestone link and must not enter this branch.
        if (linkedShotMilestoneId && !unlockActive) {
            const milestoneSourceKey = getText(unlockRecord, unlock.milestoneSourceKey);
            if (!milestoneSourceKey) {
                await markUnlockError("059 error: Inactive Shot Milestone unlock is missing Milestone Source Key.", debugStep);
                return;
            }
            const candidatesQuery = await xpEventsTable.selectRecordsAsync({
                fields: fieldNames([xp.achievementUnlock, xp.sourceKey, xp.active]),
            });
            const candidates = candidatesQuery.records.filter((event) =>
                getText(event, xp.sourceKey) === milestoneSourceKey ||
                getLinkedIds(event, xp.achievementUnlock).includes(unlockRecord.id)
            );
            if (candidates.length > 1) {
                await markUnlockError(
                    `059 error: duplicate XP candidates for inactive milestone unlock: ${candidates.map((event) => event.id).join(", ")}.`,
                    debugStep
                );
                return;
            }
            if (candidates.length === 1) {
                const event = candidates[0];
                const eventUnlockIds = getLinkedIds(event, xp.achievementUnlock);
                if (
                    getText(event, xp.sourceKey) !== milestoneSourceKey ||
                    eventUnlockIds.length !== 1 ||
                    eventUnlockIds[0] !== unlockRecord.id
                ) {
                    await markUnlockError(`059 error: XP Event ${event.id} failed exact milestone ownership.`, debugStep);
                    return;
                }
                const deactivate = {};
                addUpdateField(deactivate, xp.active, false);
                await xpEventsTable.updateRecordAsync(event.id, buildSafeUpdate(deactivate));
            }
            const inactiveUpdate = {};
            addUpdateField(
                inactiveUpdate,
                unlock.xpAwardStatus,
                valueForField(unlock.xpAwardStatus, CONFIG.statuses.skipped, { required: true })
            );
            addUpdateField(inactiveUpdate, unlock.notes, "059 deactivated exact Shot Milestone XP lifecycle event.");
            await updateUnlock(inactiveUpdate);
            setOutputs({
                statusOut: CONFIG.outputStatuses.updated,
                actionOut: candidates.length ? "deactivated_same_milestone_xp_event" : "skipped_no_milestone_xp_event",
                errorOut: "",
                unlockId: unlockRecord.id,
                xpEventId: candidates[0]?.id || "",
                debugStep,
                lifecycleOut: candidates.length ? "withdraw" : "skip",
            });
            return;
        }

        if (awardStatus !== CONFIG.statuses.pending) {
            setOutputs({
                statusOut: CONFIG.outputStatuses.skipped,
                actionOut: "skipped_award_status_not_pending",
                errorOut: "",
                result: `Skipped: XP Award Status is "${awardStatus || "blank"}", not Pending.`,
                unlockId: unlockRecord.id,
                debugStep,
                milestoneReconciliation: "blocked_no_unlock_eligibility_signal",
                lifecycleOut: "skip",
            });
            return;
        }

        if (existingXpEventIds.length > 0) {
            if (existingXpEventIds.length !== 1) {
                await markUnlockError(
                    `059 error: Achievement Unlock has ambiguous XP Event links: ${existingXpEventIds.join(", ")}.`,
                    debugStep
                );
                return;
            }
            // A direct unlock backlink must not hide a second, unlinked event
            // with the same canonical milestone Source Key.
            if (linkedShotMilestoneId) {
                const expectedSourceKey = getText(unlockRecord, unlock.milestoneSourceKey);
                const candidateQuery = await xpEventsTable.selectRecordsAsync({
                    fields: fieldNames([xp.achievementUnlock, xp.sourceKey]),
                });
                const candidates = candidateQuery.records.filter((event) =>
                    getText(event, xp.sourceKey) === expectedSourceKey ||
                    getLinkedIds(event, xp.achievementUnlock).includes(unlockRecord.id)
                );
                if (
                    !expectedSourceKey ||
                    candidates.length !== 1 ||
                    candidates[0].id !== existingXpEventIds[0]
                ) {
                    await markUnlockError(
                        `059 error: duplicate or mismatched XP candidates for milestone unlock: ${candidates.map((event) => event.id).join(", ") || "none"}.`,
                        debugStep
                    );
                    return;
                }
            }
            const existingEvent = await xpEventsTable.selectRecordAsync(existingXpEventIds[0], {
                fields: fieldNames([xp.achievementUnlock, xp.sourceKey, xp.active, xp.xpPoints]),
            });
            if (!existingEvent) {
                await markUnlockError(`059 error: Linked XP Event not found: ${existingXpEventIds[0]}.`, debugStep);
                return;
            }
            if (linkedShotMilestoneId) {
                const expectedSourceKey = getText(unlockRecord, unlock.milestoneSourceKey);
                const eventUnlockIds = getLinkedIds(existingEvent, xp.achievementUnlock);
                if (
                    !expectedSourceKey ||
                    getText(existingEvent, xp.sourceKey) !== expectedSourceKey ||
                    eventUnlockIds.length !== 1 ||
                    eventUnlockIds[0] !== unlockRecord.id
                ) {
                    await markUnlockError(`059 error: Linked XP Event ${existingEvent.id} failed exact milestone ownership.`, debugStep);
                    return;
                }
                const restorePayload = {};
                addUpdateField(restorePayload, xp.active, true);
                await xpEventsTable.updateRecordAsync(existingEvent.id, buildSafeUpdate(restorePayload));
            }
            const weeklySummaryId = await resolveWeeklySummaryId({
                sourceWeeklySummaryIds: weeklySummaryIds,
                enrollmentId,
                weekId,
            });

            await ensureXpEventWeeklySummaryLink(existingXpEventIds[0], weeklySummaryId);

            const update = {};

            addUpdateField(
                update,
                unlock.xpAwardStatus,
                valueForField(unlock.xpAwardStatus, CONFIG.statuses.awarded, { required: true })
            );

            addUpdateField(update, unlock.notes, "059 skipped: XP Event already linked.");

            await updateUnlock(update);

            setOutputs({
                statusOut: CONFIG.outputStatuses.updated,
                actionOut: "existing_linked_xp_event",
                errorOut: "",
                result: "Skipped: XP Event already linked. Marked Awarded.",
                unlockId: unlockRecord.id,
                xpEventId: existingXpEventIds[0],
                existingXpEventIds: existingXpEventIds.join(", "),
                weeklySummaryId: weeklySummaryId || "",
                debugStep,
                lifecycleOut: linkedShotMilestoneId ? "restore" : "award",
            });

            console.log(JSON.stringify({
                automation: CONFIG.scriptName,
                version: CONFIG.version,
                statusOut: CONFIG.outputStatuses.updated,
                actionOut: "existing_linked_xp_event",
                unlockId: unlockRecord.id,
                xpEventId: existingXpEventIds[0],
                weeklySummaryId: weeklySummaryId || "",
                debugStep,
                milestoneReconciliation: "blocked_no_unlock_eligibility_signal",
                lifecycleOut: linkedShotMilestoneId ? "restore" : "award",
            }));

            return;
        }

        debugStep = "7 - Load Linked Achievement";
        setOutputSafe("debugStep", debugStep);

        const achievementRecord = await achievementsTable.selectRecordAsync(achievementId, {
            fields: fieldNames([
                achievement.name,
                achievement.rewardRuleKey,
                achievement.active,
            ]),
        });

        if (!achievementRecord) {
            await markUnlockError(
                "059 error: Linked Achievement record could not be found.",
                debugStep,
                "achievement_not_found"
            );
            return;
        }

        const achievementName = getText(achievementRecord, achievement.name);
        const achievementRuleKey = getText(achievementRecord, achievement.rewardRuleKey);

        const achievementActive = achievement.active
            ? achievementRecord.getCellValue(achievement.active) === true
            : true;

        if (!achievementActive) {
            await markUnlockSkipped(
                "059 skipped: Linked Achievement is not active.",
                debugStep,
                "skipped_achievement_not_active"
            );
            return;
        }

        debugStep = "8 - Determine XP Event Details";
        setOutputSafe("debugStep", debugStep);

        let xpAmount = 0;
        let xpSourceValue = "";
        let xpBucketValue = "";
        let sourceKey = "";
        let xpReasonPublic = "";
        let xpReasonDebug = "";
        let xpActivityDate = null;
        let xpActivityDateSourceValue = "";
        let detailNote = "";

        const isPerfectWeek = achievementRuleKey === CONFIG.ruleKeys.perfectWeek;
        const isShotMilestone =
            achievementRuleKey === CONFIG.ruleKeys.shotMilestone || !!linkedShotMilestoneId;

        if (isPerfectWeek) {
            if (!weekId) {
                await markUnlockError(
                    "059 error: Perfect Week unlock is missing Week.",
                    debugStep,
                    "perfect_week_missing_week"
                );
                return;
            }

            xpAmount = await getXpAmountFromRewardRule(CONFIG.ruleKeys.perfectWeek);

            if (!xpAmount || xpAmount <= 0) {
                await markUnlockError(
                    "059 error: No valid XP amount found for Perfect Week.",
                    debugStep,
                    "perfect_week_missing_xp_amount"
                );
                return;
            }

            xpSourceValue = CONFIG.xpSources.perfectWeek;
            xpBucketValue = CONFIG.xpBuckets.perfectWeek;

            // Prefer Milestone Source Key (058 v1.5+ / production Unlocks). Do not use
            // Unlock Key formula text as the XP Source Key — it is not PERFECT_WEEK|… shape.
            const fallbackKey =
                getText(unlockRecord, unlock.milestoneSourceKey) ||
                getText(unlockRecord, unlock.sourceKey);

            sourceKey = buildPerfectWeekSourceKey(enrollmentId, weekId, fallbackKey);

            let weekEndDate = null;

            if (week.weekEndDate) {
                const weekRecord = await weeksTable.selectRecordAsync(weekId, {
                    fields: fieldNames([week.weekEndDate]),
                });

                weekEndDate = weekRecord ? getDateValue(weekRecord, week.weekEndDate) : null;
            }

            xpActivityDate =
                weekEndDate ||
                getDateValue(unlockRecord, unlock.unlockedDate) ||
                getDateValue(unlockRecord, unlock.fallbackUnlockedDate);

            if (!xpActivityDate) {
                await markUnlockError(
                    "059 error: Could not determine Perfect Week XP Activity Date.",
                    debugStep,
                    "perfect_week_missing_activity_date"
                );
                return;
            }

            xpActivityDateSourceValue = CONFIG.xpActivityDateSources.perfectWeek;
            xpReasonPublic = buildPerfectWeekReasonPublic();

            xpReasonDebug = [
                `Created by 059 v3.5.`,
                `Type: Perfect Week`,
                `Achievement: ${achievementName}`,
                `Reward Rule Key: ${achievementRuleKey}`,
                `Enrollment ID: ${enrollmentId}`,
                `Week ID: ${weekId}`,
                `XP Points: ${xpAmount}`,
                `Source Key: ${sourceKey}`,
                `XP Activity Date: ${formatDate(xpActivityDate)}`,
                `XP Activity Date Source: ${xpActivityDateSourceValue}`,
            ].join("\n");

            detailNote = xpReasonDebug;
        }

        if (isShotMilestone) {
            if (!linkedShotMilestoneId) {
                await markUnlockError(
                    "059 error: Shot Milestone unlock is missing linked Shot Milestone.",
                    debugStep,
                    "shot_milestone_missing_link"
                );
                return;
            }

            const shotMilestoneRecord = await shotMilestonesTable.selectRecordAsync(linkedShotMilestoneId, {
                fields: fieldNames([
                    shotMilestone.pointsAwarded,
                    shotMilestone.milestoneUniqueKey,
                    shotMilestone.milestoneLabel,
                    shotMilestone.milestonePercent,
                    shotMilestone.milestoneTier,
                    shotMilestone.milestoneShotCount,
                    shotMilestone.active,
                ]),
            });

            if (!shotMilestoneRecord) {
                await markUnlockError(
                    "059 error: Linked Shot Milestone record could not be found.",
                    debugStep,
                    "shot_milestone_not_found"
                );
                return;
            }

            const milestoneActive = shotMilestone.active
                ? shotMilestoneRecord.getCellValue(shotMilestone.active) === true ||
                  shotMilestoneRecord.getCellValueAsString(shotMilestone.active).toLowerCase() === "checked"
                : true;

            if (!milestoneActive) {
                await markUnlockSkipped(
                    "059 skipped: Linked Shot Milestone is not active.",
                    debugStep,
                    "skipped_shot_milestone_not_active"
                );
                return;
            }

            xpAmount = getNumber(shotMilestoneRecord, shotMilestone.pointsAwarded);

            if (!xpAmount || xpAmount <= 0) {
                xpAmount = await getXpAmountFromRewardRule(CONFIG.ruleKeys.shotMilestone);
            }

            if (!xpAmount || xpAmount <= 0) {
                await markUnlockError(
                    "059 error: No valid XP amount found for Shot Milestone.",
                    debugStep,
                    "shot_milestone_missing_xp_amount"
                );
                return;
            }

            const milestoneLabel = getText(shotMilestoneRecord, shotMilestone.milestoneLabel);
            const milestonePercent = getNumber(shotMilestoneRecord, shotMilestone.milestonePercent);
            const milestoneTier = getText(shotMilestoneRecord, shotMilestone.milestoneTier);
            const milestoneShotCount = getNumber(shotMilestoneRecord, shotMilestone.milestoneShotCount);

            xpSourceValue = CONFIG.xpSources.shotMilestone;
            xpBucketValue = CONFIG.xpBuckets.shotMilestone;

            const milestoneSourceKey = getText(unlockRecord, unlock.milestoneSourceKey);

            sourceKey = buildShotMilestoneSourceKey(
                enrollmentId,
                linkedShotMilestoneId,
                milestoneSourceKey
            );

            xpActivityDate = getDateValue(unlockRecord, unlock.milestoneActivityDate);

            if (!xpActivityDate) {
                await markUnlockError(
                    "059 error: Shot Milestone unlock is missing Milestone Activity Date. Run 066 v2.0 or backfill this field before awarding XP.",
                    debugStep,
                    "shot_milestone_missing_activity_date"
                );
                return;
            }

            xpActivityDateSourceValue = CONFIG.xpActivityDateSources.shotMilestone;

            xpReasonPublic = buildShotMilestoneReasonPublic(
                milestonePercent,
                milestoneTier,
                milestoneShotCount
            );

            xpReasonDebug = [
                `Created by 059 v3.5.`,
                `Type: Shot Milestone`,
                `Achievement: ${achievementName}`,
                `Reward Rule Key: ${achievementRuleKey}`,
                `Enrollment ID: ${enrollmentId}`,
                `Shot Milestone ID: ${linkedShotMilestoneId}`,
                `Milestone Label: ${milestoneLabel}`,
                `Milestone Percent: ${milestonePercent}`,
                `Milestone Tier: ${milestoneTier}`,
                `Milestone Shot Count: ${milestoneShotCount}`,
                `XP Points: ${xpAmount}`,
                `Source Key: ${sourceKey}`,
                `XP Activity Date: ${formatDate(xpActivityDate)}`,
                `XP Activity Date Source: ${xpActivityDateSourceValue}`,
            ].join("\n");

            detailNote = xpReasonDebug;
        }

        if (!isPerfectWeek && !isShotMilestone) {
            await markUnlockSkipped(
                `059 skipped: Unsupported Achievement Reward Rule Key "${achievementRuleKey}".`,
                debugStep,
                "skipped_unsupported_rule_key"
            );
            return;
        }

        debugStep = "9 - Preflight Single Select Options";
        setOutputSafe("debugStep", debugStep);

        valueForField(xp.xpSource, xpSourceValue, { required: true });
        valueForField(xp.xpBucket, xpBucketValue, { required: true });
        valueForField(xp.xpActivityDateSource, xpActivityDateSourceValue, { required: true });
        valueForField(unlock.xpAwardStatus, CONFIG.statuses.awarded, { required: true });

        debugStep = "10 - Duplicate Protection";
        setOutputSafe("debugStep", debugStep);

        const xpQuery = await xpEventsTable.selectRecordsAsync({
            fields: fieldNames([
                xp.achievementUnlock,
                xp.sourceKey,
                xp.xpPoints,
                xp.active,
            ]),
        });

        const duplicateCandidates = xpQuery.records.filter((xpEvent) =>
            getText(xpEvent, xp.sourceKey) === sourceKey ||
            getLinkedIds(xpEvent, xp.achievementUnlock).includes(unlockRecord.id)
        );
        if (duplicateCandidates.length > 1) {
            await markUnlockError(
                `059 error: Duplicate XP Event candidates for ${sourceKey}: ${duplicateCandidates.map((event) => event.id).join(", ")}.`,
                debugStep
            );
            return;
        }
        const duplicateXpEvent = duplicateCandidates[0] || null;
        const duplicateXpPoints = duplicateXpEvent ? getNumber(duplicateXpEvent, xp.xpPoints) : 0;

        if (duplicateXpEvent) {
            const candidateUnlockIds = getLinkedIds(duplicateXpEvent, xp.achievementUnlock);
            if (
                getText(duplicateXpEvent, xp.sourceKey) !== sourceKey ||
                candidateUnlockIds.length !== 1 ||
                candidateUnlockIds[0] !== unlockRecord.id
            ) {
                await markUnlockError(
                    `059 error: XP Event ${duplicateXpEvent.id} failed exact ownership for ${sourceKey}.`,
                    debugStep
                );
                return;
            }
            const weeklySummaryId = await resolveWeeklySummaryId({
                sourceWeeklySummaryIds: weeklySummaryIds,
                enrollmentId,
                weekId,
            });

            await ensureXpEventWeeklySummaryLink(duplicateXpEvent.id, weeklySummaryId);
            const reactivate = {};
            addUpdateField(reactivate, xp.active, true);
            await xpEventsTable.updateRecordAsync(duplicateXpEvent.id, buildSafeUpdate(reactivate));

            const duplicateUpdate = {};

            addUpdateField(duplicateUpdate, unlock.xpEvents, [{ id: duplicateXpEvent.id }]);

            addUpdateField(
                duplicateUpdate,
                unlock.xpAwardStatus,
                valueForField(unlock.xpAwardStatus, CONFIG.statuses.awarded, { required: true })
            );

            if (unlock.xpAwarded && duplicateXpPoints > 0) {
                addUpdateField(duplicateUpdate, unlock.xpAwarded, duplicateXpPoints);
            }

            addUpdateField(
                duplicateUpdate,
                unlock.notes,
                `059 linked existing duplicate-protected XP Event ${duplicateXpEvent.id}.`
            );

            await updateUnlock(duplicateUpdate);

            setOutputs({
                statusOut: CONFIG.outputStatuses.updated,
                actionOut: "linked_existing_duplicate_xp_event",
                errorOut: "",
                result: "Existing XP Event found. Linked and marked Awarded.",
                unlockId: unlockRecord.id,
                xpEventId: duplicateXpEvent.id,
                sourceKey,
                weeklySummaryId: weeklySummaryId || "",
                debugStep,
                milestoneReconciliation: "blocked_no_unlock_eligibility_signal",
                lifecycleOut: "restore",
            });

            console.log(JSON.stringify({
                automation: CONFIG.scriptName,
                version: CONFIG.version,
                statusOut: CONFIG.outputStatuses.updated,
                actionOut: "linked_existing_duplicate_xp_event",
                unlockId: unlockRecord.id,
                xpEventId: duplicateXpEvent.id,
                sourceKey,
                weeklySummaryId: weeklySummaryId || "",
                debugStep,
                milestoneReconciliation: "blocked_no_unlock_eligibility_signal",
            }));

            return;
        }

        debugStep = "11 - Build XP Event Payload";
        setOutputSafe("debugStep", debugStep);

        const weeklySummaryId = await resolveWeeklySummaryId({
            sourceWeeklySummaryIds: weeklySummaryIds,
            enrollmentId,
            weekId,
        });

        const xpPayload = {};

        addToPayload(xpPayload, xp.enrollment, [{ id: enrollmentId }]);

        if (weekId) {
            addToPayload(xpPayload, xp.week, [{ id: weekId }]);
        }

        addToPayload(xpPayload, xp.achievementUnlock, [{ id: unlockRecord.id }]);

        if (isShotMilestone && linkedShotMilestoneId) {
            addToPayload(xpPayload, xp.shotMilestones, [{ id: linkedShotMilestoneId }]);
        }

        if (weeklySummaryId) {
            addToPayload(xpPayload, xp.weeklySummary, [{ id: weeklySummaryId }]);
        }

        addToPayload(xpPayload, xp.xpPoints, xpAmount);
        addToPayload(xpPayload, xp.xpSource, valueForField(xp.xpSource, xpSourceValue, { required: true }));
        addToPayload(xpPayload, xp.xpBucket, valueForField(xp.xpBucket, xpBucketValue, { required: true }));
        addToPayload(xpPayload, xp.sourceKey, sourceKey);

        addToPayload(xpPayload, xp.xpActivityDate, xpActivityDate);
        addToPayload(
            xpPayload,
            xp.xpActivityDateSource,
            valueForField(xp.xpActivityDateSource, xpActivityDateSourceValue, { required: true })
        );

        addTextToPayload(xpPayload, xp.xpReasonPublic, xpReasonPublic);
        addTextToPayload(xpPayload, xp.xpReasonDebug, xpReasonDebug);
        addTextToPayload(xpPayload, xp.notes, detailNote);

        addToPayload(xpPayload, xp.awardedAt, new Date());
        addToPayload(xpPayload, xp.active, true);
        addToPayload(xpPayload, xp.processed, true);

        if (xp.awardMode) {
            addToPayload(
                xpPayload,
                xp.awardMode,
                valueForField(xp.awardMode, "Automatic", { required: false })
            );
        }

        debugStep = "12 - Recheck and Create XP Event";
        setOutputSafe("debugStep", debugStep);

        const recheckQuery = await xpEventsTable.selectRecordsAsync({
            fields: fieldNames([xp.achievementUnlock, xp.sourceKey, xp.active]),
        });
        const recheckCandidates = recheckQuery.records.filter((event) =>
            getText(event, xp.sourceKey) === sourceKey ||
            getLinkedIds(event, xp.achievementUnlock).includes(unlockRecord.id)
        );
        if (recheckCandidates.length > 0) {
            throw new Error(
                `059 create recheck found candidate(s) for ${sourceKey}: ${recheckCandidates.map((event) => event.id).join(", ")}. Retry to reconcile exact ownership.`
            );
        }
        const newXpEventId = await xpEventsTable.createRecordAsync(xpPayload);

        await ensureXpEventWeeklySummaryLink(newXpEventId, weeklySummaryId);

        debugStep = "13 - Link XP Event Back and Mark Unlock Awarded";
        setOutputSafe("debugStep", debugStep);

        const unlockUpdate = {};

        addUpdateField(unlockUpdate, unlock.xpEvents, [{ id: newXpEventId }]);

        addUpdateField(
            unlockUpdate,
            unlock.xpAwardStatus,
            valueForField(unlock.xpAwardStatus, CONFIG.statuses.awarded, { required: true })
        );

        if (unlock.xpAwarded) {
            addUpdateField(unlockUpdate, unlock.xpAwarded, xpAmount);
        }

        const existingNotes = getText(unlockRecord, unlock.notes);

        addUpdateField(
            unlockUpdate,
            unlock.notes,
            [
                existingNotes,
                `059 v3.5 created XP Event ${newXpEventId}. XP Points: ${xpAmount}. Source Key: ${sourceKey}. Activity Date: ${formatDate(xpActivityDate)}. Activity Date Source: ${xpActivityDateSourceValue}.`,
            ]
                .filter(Boolean)
                .join("\n")
        );

        await updateUnlock(unlockUpdate);

        debugStep = "14 - Complete";
        setOutputSafe("debugStep", debugStep);

        setOutputs({
            statusOut: CONFIG.outputStatuses.created,
            actionOut: "created_new_xp_event",
            errorOut: "",
            result: "059 created XP Event and marked Achievement Unlock awarded.",
            unlockId: unlockRecord.id,
            xpEventId: newXpEventId,
            xpBucket: xpBucketValue,
            xpSource: xpSourceValue,
            xpPoints: xpAmount,
            sourceKey,
            weeklySummaryId: weeklySummaryId || "",
            xpActivityDate: xpActivityDate ? xpActivityDate.toISOString() : "",
            xpActivityDateSource: xpActivityDateSourceValue,
            debugStep,
            milestoneReconciliation: "blocked_no_unlock_eligibility_signal",
            lifecycleOut: "award",
        });

        console.log(JSON.stringify({
            automation: CONFIG.scriptName,
            version: CONFIG.version,
            statusOut: CONFIG.outputStatuses.created,
            actionOut: "created_new_xp_event",
            unlockId: unlockRecord.id,
            xpEventId: newXpEventId,
            sourceKey,
            weeklySummaryId: weeklySummaryId || "",
            debugStep,
            milestoneReconciliation: "blocked_no_unlock_eligibility_signal",
        }));
    } catch (error) {
        log("059 error", {
            recordId,
            debugStep,
            error: error.message,
        });

        if (unlockRecord) {
            try {
                await markUnlockError(error.message, debugStep, "error");
            } catch (markErrorProblem) {
                log("Could not mark error on Achievement Unlock", {
                    recordId,
                    markErrorProblem: markErrorProblem.message,
                });
            }
        } else {
            setOutputs({
                statusOut: CONFIG.outputStatuses.error,
                actionOut: "error",
                errorOut: error.message,
                result: "Error",
                unlockId: recordId,
                debugStep,
            });
        }

        throw error;
    }
}


/***************************************************************************************************
 * SECTION 4 — RUN
 ***************************************************************************************************/

await main();

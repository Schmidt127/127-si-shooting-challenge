/*
Automation: 059 - Achievements and Milestones - Create XP Event from Achievement Unlock
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: 2026-06-21

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

/***************************************************************************************************
 * 059 - Achievements and Milestones - Create XP Event from Achievement Unlock
 * Version: 2026-06-05 v3.4
 * Last Updated: 2026-06-21
 *
 * Purpose:
 * Creates one XP Event from one Athlete Achievement Unlock.
 * Links XP Event to Weekly Athlete Summary from unlock or Enrollment + Week lookup.
 *
 * Supports:
 * - Shot Milestone
 * - Perfect Week
 *
 * Critical fixes:
 * - Never writes a field named "undefined".
 * - Writes Shot Milestone XP Activity Date from Milestone Activity Date.
 * - Writes XP Activity Date Source = Shot Milestone Activity Date.
 * - Uses XP Bucket, not XP Bucket Key.
 * - Uses XP Activity Date, not old XP Source Date.
 * - Uses XP Activity Date Source, not old XP Date Source.
 *
 * Required input variable:
 * - recordId = Airtable record ID from triggering Athlete Achievement Unlock
 ***************************************************************************************************/

async function main() {
  /*************************************************************************************************
   * 1. Configuration
   *************************************************************************************************/

  const CONFIG = {
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

      shotMilestone: "Shot Milestone",
      milestoneSourceKey: "Milestone Source Key",
      milestoneActivityDate: "Milestone Activity Date",

      sourceKey: "Source Key",
      unlockKey: "Unlock Key",
      notes: "Notes",

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
    },
  };

  /*************************************************************************************************
   * 2. General Helpers
   *************************************************************************************************/

  function findField(table, fieldName) {
    return table.fields.find((field) => field.name === fieldName) || null;
  }

  function requireField(table, fieldName) {
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

  let weeklySummaryQueryCache = null;

  async function loadWeeklySummaryQuery(weeklySummaryTable, summaryEnrollmentField, summaryWeekField) {
    if (weeklySummaryQueryCache) {
      return weeklySummaryQueryCache;
    }

    weeklySummaryQueryCache = await weeklySummaryTable.selectRecordsAsync({
      fields: fieldNames([summaryEnrollmentField, summaryWeekField]),
    });

    return weeklySummaryQueryCache;
  }

  async function findWeeklySummaryId(
    weeklySummaryTable,
    summaryEnrollmentField,
    summaryWeekField,
    enrollmentId,
    weekId
  ) {
    const cleanEnrollmentId = String(enrollmentId || "").trim();
    const cleanWeekId = String(weekId || "").trim();

    if (!cleanEnrollmentId || !cleanWeekId || !summaryEnrollmentField || !summaryWeekField) {
      return "";
    }

    const query = await loadWeeklySummaryQuery(
      weeklySummaryTable,
      summaryEnrollmentField,
      summaryWeekField
    );

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
    weeklySummaryTable,
    summaryEnrollmentField,
    summaryWeekField,
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

    return findWeeklySummaryId(
      weeklySummaryTable,
      summaryEnrollmentField,
      summaryWeekField,
      enrollmentId,
      weekId
    );
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

  /*************************************************************************************************
   * 3. Load Tables
   *************************************************************************************************/

  const inputConfig = input.config();
  const recordId = inputConfig.recordId;

  if (!recordId) {
    throw new Error("Missing input variable: recordId");
  }

  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const achievementsTable = base.getTable(CONFIG.tables.achievements);
  const xpRewardRulesTable = base.getTable(CONFIG.tables.xpRewardRules);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const shotMilestonesTable = base.getTable(CONFIG.tables.shotMilestones);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const summaryEnrollmentField = optionalField(
    weeklySummaryTable,
    CONFIG.weeklySummaryFields.enrollment
  );
  const summaryWeekField = optionalField(
    weeklySummaryTable,
    CONFIG.weeklySummaryFields.week
  );

  /*************************************************************************************************
   * 4. Field References
   *************************************************************************************************/

  const unlock = {
    achievement: requireField(unlocksTable, CONFIG.unlockFields.achievement),
    enrollment: requireField(unlocksTable, CONFIG.unlockFields.enrollment),
    week: optionalField(unlocksTable, CONFIG.unlockFields.week),
    xpEvents: requireField(unlocksTable, CONFIG.unlockFields.xpEvents),
    xpAwardStatus: requireField(unlocksTable, CONFIG.unlockFields.xpAwardStatus),
    xpAwarded: optionalField(unlocksTable, CONFIG.unlockFields.xpAwarded),

    shotMilestone: optionalField(unlocksTable, CONFIG.unlockFields.shotMilestone),
    milestoneSourceKey: optionalField(unlocksTable, CONFIG.unlockFields.milestoneSourceKey),
    milestoneActivityDate: optionalField(unlocksTable, CONFIG.unlockFields.milestoneActivityDate),

    sourceKey: optionalField(unlocksTable, CONFIG.unlockFields.sourceKey),
    unlockKey: optionalField(unlocksTable, CONFIG.unlockFields.unlockKey),
    notes: optionalField(unlocksTable, CONFIG.unlockFields.notes),

    unlockedDate: optionalField(unlocksTable, CONFIG.unlockFields.unlockedDate),
    fallbackUnlockedDate: optionalField(unlocksTable, CONFIG.unlockFields.fallbackUnlockedDate),

    weeklySummary: optionalField(unlocksTable, CONFIG.unlockFields.weeklySummary),
  };

  const achievementNameFieldName = getAvailableFieldName(
    achievementsTable,
    CONFIG.achievementFields.achievementName,
    CONFIG.achievementFields.fallbackName
  );

  if (!achievementNameFieldName) {
    throw new Error("Achievements table is missing Achievement Name or Name field.");
  }

  const achievement = {
    name: requireField(achievementsTable, achievementNameFieldName),
    rewardRuleKey: requireField(achievementsTable, CONFIG.achievementFields.rewardRuleKey),
    active: optionalField(achievementsTable, CONFIG.achievementFields.active),
  };

  const rewardRule = {
    ruleKey: requireField(xpRewardRulesTable, CONFIG.rewardRuleFields.ruleKey),
    xpAmount: requireField(xpRewardRulesTable, CONFIG.rewardRuleFields.xpAmount),
    active: optionalField(xpRewardRulesTable, CONFIG.rewardRuleFields.active),
  };

  const shotMilestone = {
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

  const week = {
    weekEndDate:
      optionalField(weeksTable, CONFIG.weekFields.weekEndDate) ||
      optionalField(weeksTable, CONFIG.weekFields.fallbackEndDate),
  };

  const xp = {
    enrollment: requireField(xpEventsTable, CONFIG.xpEventFields.enrollment),
    week: optionalField(xpEventsTable, CONFIG.xpEventFields.week),
    achievementUnlock: requireField(xpEventsTable, CONFIG.xpEventFields.achievementUnlock),
    shotMilestones: optionalField(xpEventsTable, CONFIG.xpEventFields.shotMilestones),
    weeklySummary: optionalField(xpEventsTable, CONFIG.xpEventFields.weeklySummary),

    xpPoints: requireField(xpEventsTable, CONFIG.xpEventFields.xpPoints),
    xpSource: requireField(xpEventsTable, CONFIG.xpEventFields.xpSource),
    xpBucket: requireField(xpEventsTable, CONFIG.xpEventFields.xpBucket),
    sourceKey: requireField(xpEventsTable, CONFIG.xpEventFields.sourceKey),

    xpReasonPublic: optionalField(xpEventsTable, CONFIG.xpEventFields.xpReasonPublic),
    xpReasonDebug: optionalField(xpEventsTable, CONFIG.xpEventFields.xpReasonDebug),
    notes: optionalField(xpEventsTable, CONFIG.xpEventFields.notes),

    xpActivityDate: requireField(xpEventsTable, CONFIG.xpEventFields.xpActivityDate),
    xpActivityDateSource: requireField(xpEventsTable, CONFIG.xpEventFields.xpActivityDateSource),

    awardedAt: optionalField(xpEventsTable, CONFIG.xpEventFields.awardedAt),
    active: optionalField(xpEventsTable, CONFIG.xpEventFields.active),
    processed: optionalField(xpEventsTable, CONFIG.xpEventFields.processed),
    awardMode: optionalField(xpEventsTable, CONFIG.xpEventFields.awardMode),
  };

  /*************************************************************************************************
   * 5. Local Helpers That Require Loaded Tables
   *************************************************************************************************/

  let unlockRecord = null;

  async function updateUnlock(fields) {
    const safeFields = buildSafeUpdate(fields);

    if (Object.keys(safeFields).length > 0) {
      await unlocksTable.updateRecordAsync(unlockRecord.id, safeFields);
    }
  }

  async function markUnlockError(message) {
    const update = {};

    addUpdateField(
      update,
      unlock.xpAwardStatus,
      valueForField(unlock.xpAwardStatus, CONFIG.statuses.error, { required: false })
    );

    addUpdateField(update, unlock.notes, message);

    await updateUnlock(update);

    output.set("result", message);
    output.set("unlockId", unlockRecord ? unlockRecord.id : "");
  }

  async function markUnlockSkipped(message) {
    const update = {};

    addUpdateField(
      update,
      unlock.xpAwardStatus,
      valueForField(unlock.xpAwardStatus, CONFIG.statuses.skipped, { required: false })
    );

    addUpdateField(update, unlock.notes, message);

    await updateUnlock(update);

    output.set("result", message);
    output.set("unlockId", unlockRecord ? unlockRecord.id : "");
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

  /*************************************************************************************************
   * 6. Load Trigger Unlock Record
   *************************************************************************************************/

  unlockRecord = await unlocksTable.selectRecordAsync(recordId, {
    fields: fieldNames([
      unlock.achievement,
      unlock.enrollment,
      unlock.week,
      unlock.xpEvents,
      unlock.xpAwardStatus,
      unlock.xpAwarded,

      unlock.shotMilestone,
      unlock.milestoneSourceKey,
      unlock.milestoneActivityDate,

      unlock.sourceKey,
      unlock.unlockKey,
      unlock.notes,

      unlock.unlockedDate,
      unlock.fallbackUnlockedDate,

      unlock.weeklySummary,
    ]),
  });

  if (!unlockRecord) {
    throw new Error(`Athlete Achievement Unlock record not found: ${recordId}`);
  }

  /*************************************************************************************************
   * 7. Validate Trigger Unlock
   *************************************************************************************************/

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

  if (!achievementId) {
    await markUnlockError("059 error: Missing Achievement.");
    return;
  }

  if (!enrollmentId) {
    await markUnlockError("059 error: Missing Enrollment.");
    return;
  }

  if (awardStatus !== CONFIG.statuses.pending) {
    output.set("result", `Skipped: XP Award Status is "${awardStatus || "blank"}", not Pending.`);
    output.set("unlockId", unlockRecord.id);
    return;
  }

  if (existingXpEventIds.length > 0) {
    const update = {};

    addUpdateField(
      update,
      unlock.xpAwardStatus,
      valueForField(unlock.xpAwardStatus, CONFIG.statuses.awarded, { required: true })
    );

    addUpdateField(update, unlock.notes, "059 skipped: XP Event already linked.");

    await updateUnlock(update);

    output.set("result", "Skipped: XP Event already linked. Marked Awarded.");
    output.set("unlockId", unlockRecord.id);
    output.set("existingXpEventIds", existingXpEventIds.join(", "));
    return;
  }

  /*************************************************************************************************
   * 8. Load Linked Achievement
   *************************************************************************************************/

  const achievementRecord = await achievementsTable.selectRecordAsync(achievementId, {
    fields: fieldNames([
      achievement.name,
      achievement.rewardRuleKey,
      achievement.active,
    ]),
  });

  if (!achievementRecord) {
    await markUnlockError("059 error: Linked Achievement record could not be found.");
    return;
  }

  const achievementName = getText(achievementRecord, achievement.name);
  const achievementRuleKey = getText(achievementRecord, achievement.rewardRuleKey);

  const achievementActive = achievement.active
    ? achievementRecord.getCellValue(achievement.active) === true
    : true;

  if (!achievementActive) {
    await markUnlockSkipped("059 skipped: Linked Achievement is not active.");
    return;
  }

  /*************************************************************************************************
   * 9. Determine XP Event Details
   *************************************************************************************************/

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
      await markUnlockError("059 error: Perfect Week unlock is missing Week.");
      return;
    }

    xpAmount = await getXpAmountFromRewardRule(CONFIG.ruleKeys.perfectWeek);

    if (!xpAmount || xpAmount <= 0) {
      await markUnlockError("059 error: No valid XP amount found for Perfect Week.");
      return;
    }

    xpSourceValue = CONFIG.xpSources.perfectWeek;
    xpBucketValue = CONFIG.xpBuckets.perfectWeek;

    const fallbackKey =
      getText(unlockRecord, unlock.sourceKey) ||
      getText(unlockRecord, unlock.unlockKey);

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
      await markUnlockError("059 error: Could not determine Perfect Week XP Activity Date.");
      return;
    }

    xpActivityDateSourceValue = CONFIG.xpActivityDateSources.perfectWeek;
    xpReasonPublic = buildPerfectWeekReasonPublic();

    xpReasonDebug = [
      `Created by 059 v3.3.`,
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
      await markUnlockError("059 error: Shot Milestone unlock is missing linked Shot Milestone.");
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
      await markUnlockError("059 error: Linked Shot Milestone record could not be found.");
      return;
    }

    const milestoneActive = shotMilestone.active
      ? shotMilestoneRecord.getCellValue(shotMilestone.active) === true ||
        shotMilestoneRecord.getCellValueAsString(shotMilestone.active).toLowerCase() === "checked"
      : true;

    if (!milestoneActive) {
      await markUnlockSkipped("059 skipped: Linked Shot Milestone is not active.");
      return;
    }

    xpAmount = getNumber(shotMilestoneRecord, shotMilestone.pointsAwarded);

    if (!xpAmount || xpAmount <= 0) {
      xpAmount = await getXpAmountFromRewardRule(CONFIG.ruleKeys.shotMilestone);
    }

    if (!xpAmount || xpAmount <= 0) {
      await markUnlockError("059 error: No valid XP amount found for Shot Milestone.");
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
        "059 error: Shot Milestone unlock is missing Milestone Activity Date. Run 066 v2.0 or backfill this field before awarding XP."
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
      `Created by 059 v3.3.`,
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
      `059 skipped: Unsupported Achievement Reward Rule Key "${achievementRuleKey}".`
    );
    return;
  }

  /*************************************************************************************************
   * 10. Preflight Single Select Options
   *************************************************************************************************/

  valueForField(xp.xpSource, xpSourceValue, { required: true });
  valueForField(xp.xpBucket, xpBucketValue, { required: true });
  valueForField(xp.xpActivityDateSource, xpActivityDateSourceValue, { required: true });
  valueForField(unlock.xpAwardStatus, CONFIG.statuses.awarded, { required: true });

  /*************************************************************************************************
   * 11. Duplicate Protection
   *************************************************************************************************/

  const xpQuery = await xpEventsTable.selectRecordsAsync({
    fields: fieldNames([
      xp.achievementUnlock,
      xp.sourceKey,
      xp.xpPoints,
    ]),
  });

  let duplicateXpEvent = null;
  let duplicateXpPoints = 0;

  for (const xpEvent of xpQuery.records) {
    const existingSourceKey = getText(xpEvent, xp.sourceKey);

    if (existingSourceKey && existingSourceKey === sourceKey) {
      duplicateXpEvent = xpEvent;
      duplicateXpPoints = getNumber(xpEvent, xp.xpPoints);
      break;
    }

    const existingUnlockId = getFirstLinkedId(xpEvent, xp.achievementUnlock);

    if (existingUnlockId === unlockRecord.id) {
      duplicateXpEvent = xpEvent;
      duplicateXpPoints = getNumber(xpEvent, xp.xpPoints);
      break;
    }
  }

  if (duplicateXpEvent) {
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

    output.set("result", "Existing XP Event found. Linked and marked Awarded.");
    output.set("xpEventId", duplicateXpEvent.id);
    output.set("sourceKey", sourceKey);
    return;
  }

  /*************************************************************************************************
   * 12. Build XP Event Payload
   *************************************************************************************************/

  const weeklySummaryId = await resolveWeeklySummaryId({
    weeklySummaryTable,
    summaryEnrollmentField,
    summaryWeekField,
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

  /*************************************************************************************************
   * 13. Create XP Event
   *************************************************************************************************/

  const newXpEventId = await xpEventsTable.createRecordAsync(xpPayload);

  /*************************************************************************************************
   * 14. Link XP Event Back and Mark Unlock Awarded
   *************************************************************************************************/

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
      `059 v3.3 created XP Event ${newXpEventId}. XP Points: ${xpAmount}. Source Key: ${sourceKey}. Activity Date: ${formatDate(xpActivityDate)}. Activity Date Source: ${xpActivityDateSourceValue}.`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  await updateUnlock(unlockUpdate);

  output.set("result", "059 created XP Event and marked Achievement Unlock awarded.");
  output.set("unlockId", unlockRecord.id);
  output.set("xpEventId", newXpEventId);
  output.set("xpBucket", xpBucketValue);
  output.set("xpSource", xpSourceValue);
  output.set("xpPoints", xpAmount);
  output.set("sourceKey", sourceKey);
  output.set("weeklySummaryId", weeklySummaryId || "");
  output.set("xpActivityDate", xpActivityDate ? xpActivityDate.toISOString() : "");
  output.set("xpActivityDateSource", xpActivityDateSourceValue);
}

await main();

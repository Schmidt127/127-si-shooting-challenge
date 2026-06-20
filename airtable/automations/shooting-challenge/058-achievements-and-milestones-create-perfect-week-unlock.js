/*
Automation: 058 - Achievements and Milestones - Create Perfect Week Unlock
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

/***************************************************************************************************
 * 058 - Achievements and Milestones - Create Perfect Week Unlock
 * Version: 1.0
 * Date written: 2026-05-30
 *
 * Purpose:
 * Creates one Athlete Achievement Unlock when a Weekly Athlete Summary record qualifies
 * for Perfect Week.
 *
 * This automation does NOT create the XP Event directly.
 * The unlock should later be processed by the achievement/unlock-to-XP automation using
 * XP Reward Rules where Rule Key = PERFECT_WEEK.
 *
 * Trigger:
 * Table: Weekly Athlete Summary
 * Conditions:
 * - Perfect Week Eligible? = 1
 * - Perfect Week Unlock is empty
 * - Perfect Week Automation Status = Ready
 *
 * Required input variable:
 * - recordId = Airtable record ID from triggering Weekly Athlete Summary record
 ***************************************************************************************************/

/***************************************************************************************************
 * 1. Configuration
 ***************************************************************************************************/

const CONFIG = {
  tables: {
    weekly: "Weekly Athlete Summary",
    achievements: "Achievements",
    unlocks: "Athlete Achievement Unlocks",
  },

  achievementLookup: {
    ruleKey: "PERFECT_WEEK",
    achievementName: "Perfect Week",
  },

  weeklyFields: {
    enrollment: "Enrollment",
    week: "Week",
    perfectWeekEligible: "Perfect Week Eligible?",
    perfectWeekUnlock: "Perfect Week Unlock",
    automationStatus: "Perfect Week Automation Status",
    automationError: "Perfect Week Automation Error",
  },

  achievementFields: {
    name: "Achievement Name",
    fallbackName: "Name",
    rewardRuleKey: "Reward Rule Key",
    active: "Active?",
  },

  unlockFields: {
    enrollment: "Enrollment",
    week: "Week",
    achievement: "Achievement",
    sourceStatus: "Source Status",
    xpAwardStatus: "XP Award Status",
    sourceKey: "Source Key",
    notes: "Notes",
  },
};

/***************************************************************************************************
 * 2. Helper Functions
 ***************************************************************************************************/

function getFirstLinkedId(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value) || value.length === 0) return null;
  return value[0].id;
}

function getLinkedIds(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.id);
}

function getSingleSelectName(record, fieldName) {
  const value = record.getCellValue(fieldName);
  return value?.name || "";
}

function getText(record, fieldName) {
  return record.getCellValueAsString(fieldName).trim();
}

function isTruthy(value) {
  return value === true || value === 1 || value === "1";
}

function fieldExists(table, fieldName) {
  return table.fields.some((field) => field.name === fieldName);
}

function getAvailableField(table, preferredName, fallbackName = null) {
  if (fieldExists(table, preferredName)) return preferredName;
  if (fallbackName && fieldExists(table, fallbackName)) return fallbackName;
  return null;
}

async function updateWeekly(fields) {
  await weeklyTable.updateRecordAsync(weeklyRecord.id, fields);
}

/***************************************************************************************************
 * 3. Load Tables and Trigger Record
 ***************************************************************************************************/

const inputConfig = input.config();
const recordId = inputConfig.recordId;

if (!recordId) {
  throw new Error("Missing input variable: recordId");
}

const weeklyTable = base.getTable(CONFIG.tables.weekly);
const achievementsTable = base.getTable(CONFIG.tables.achievements);
const unlocksTable = base.getTable(CONFIG.tables.unlocks);

const weeklyRecord = await weeklyTable.selectRecordAsync(recordId);

if (!weeklyRecord) {
  throw new Error(`Weekly Athlete Summary record not found: ${recordId}`);
}

/***************************************************************************************************
 * 4. Validate Weekly Athlete Summary Record
 ***************************************************************************************************/

try {
  const enrollmentId = getFirstLinkedId(weeklyRecord, CONFIG.weeklyFields.enrollment);
  const weekId = getFirstLinkedId(weeklyRecord, CONFIG.weeklyFields.week);
  const existingUnlockIds = getLinkedIds(weeklyRecord, CONFIG.weeklyFields.perfectWeekUnlock);

  const eligibleValue = weeklyRecord.getCellValue(CONFIG.weeklyFields.perfectWeekEligible);
  const isEligible = isTruthy(eligibleValue);

  const automationStatus = getSingleSelectName(weeklyRecord, CONFIG.weeklyFields.automationStatus);

  if (!enrollmentId) {
    await updateWeekly({
      [CONFIG.weeklyFields.automationError]: "058 skipped: Missing Enrollment.",
    });
    return;
  }

  if (!weekId) {
    await updateWeekly({
      [CONFIG.weeklyFields.automationError]: "058 skipped: Missing Week.",
    });
    return;
  }

  if (!isEligible) {
    await updateWeekly({
      [CONFIG.weeklyFields.automationError]: "058 skipped: Perfect Week Eligible? is not 1.",
    });
    return;
  }

  if (automationStatus !== "Ready") {
    await updateWeekly({
      [CONFIG.weeklyFields.automationError]: `058 skipped: Perfect Week Automation Status is '${automationStatus}', not 'Ready'.`,
    });
    return;
  }

  if (existingUnlockIds.length > 0) {
    await updateWeekly({
      [CONFIG.weeklyFields.automationError]: "",
    });
    return;
  }

  /*************************************************************************************************
   * 5. Find Perfect Week Achievement
   *************************************************************************************************/

  const achievementNameField = getAvailableField(
    achievementsTable,
    CONFIG.achievementFields.name,
    CONFIG.achievementFields.fallbackName
  );

  if (!achievementNameField) {
    throw new Error("Achievements table is missing Achievement Name or Name field.");
  }

  if (!fieldExists(achievementsTable, CONFIG.achievementFields.rewardRuleKey)) {
    throw new Error(`Achievements table is missing field: ${CONFIG.achievementFields.rewardRuleKey}`);
  }

  const achievementQuery = await achievementsTable.selectRecordsAsync({
    fields: [
      achievementNameField,
      CONFIG.achievementFields.rewardRuleKey,
      CONFIG.achievementFields.active,
    ].filter((fieldName) => fieldExists(achievementsTable, fieldName)),
  });

  const matchingAchievements = achievementQuery.records.filter((achievement) => {
    const ruleKey = getText(achievement, CONFIG.achievementFields.rewardRuleKey);
    const name = getText(achievement, achievementNameField);
    const activeFieldExists = fieldExists(achievementsTable, CONFIG.achievementFields.active);
    const active = activeFieldExists ? achievement.getCellValue(CONFIG.achievementFields.active) === true : true;

    return (
      active &&
      (
        ruleKey === CONFIG.achievementLookup.ruleKey ||
        name === CONFIG.achievementLookup.achievementName
      )
    );
  });

  if (matchingAchievements.length === 0) {
    throw new Error(
      `No active Perfect Week achievement found. Expected Reward Rule Key '${CONFIG.achievementLookup.ruleKey}' or name '${CONFIG.achievementLookup.achievementName}'.`
    );
  }

  if (matchingAchievements.length > 1) {
    throw new Error(
      `Multiple active Perfect Week achievements found. Keep only one active achievement with Reward Rule Key '${CONFIG.achievementLookup.ruleKey}'.`
    );
  }

  const achievementRecord = matchingAchievements[0];

  /*************************************************************************************************
   * 6. Duplicate Protection by Source Key
   *************************************************************************************************/

  const sourceKey = `PERFECT_WEEK|${enrollmentId}|${weekId}`;

  const unlockFieldsToQuery = [
    CONFIG.unlockFields.enrollment,
    CONFIG.unlockFields.week,
    CONFIG.unlockFields.achievement,
  ];

  if (fieldExists(unlocksTable, CONFIG.unlockFields.sourceKey)) {
    unlockFieldsToQuery.push(CONFIG.unlockFields.sourceKey);
  }

  const unlockQuery = await unlocksTable.selectRecordsAsync({
    fields: unlockFieldsToQuery,
  });

  let duplicateUnlock = null;

  for (const unlock of unlockQuery.records) {
    if (fieldExists(unlocksTable, CONFIG.unlockFields.sourceKey)) {
      const existingSourceKey = getText(unlock, CONFIG.unlockFields.sourceKey);
      if (existingSourceKey && existingSourceKey === sourceKey) {
        duplicateUnlock = unlock;
        break;
      }
    }

    const unlockEnrollmentId = getFirstLinkedId(unlock, CONFIG.unlockFields.enrollment);
    const unlockWeekId = getFirstLinkedId(unlock, CONFIG.unlockFields.week);
    const unlockAchievementId = getFirstLinkedId(unlock, CONFIG.unlockFields.achievement);

    if (
      unlockEnrollmentId === enrollmentId &&
      unlockWeekId === weekId &&
      unlockAchievementId === achievementRecord.id
    ) {
      duplicateUnlock = unlock;
      break;
    }
  }

  if (duplicateUnlock) {
    await updateWeekly({
      [CONFIG.weeklyFields.perfectWeekUnlock]: [{ id: duplicateUnlock.id }],
      [CONFIG.weeklyFields.automationError]: "",
    });

    return;
  }

  /*************************************************************************************************
   * 7. Create Unlock
   *************************************************************************************************/

  const unlockPayload = {
    [CONFIG.unlockFields.enrollment]: [{ id: enrollmentId }],
    [CONFIG.unlockFields.week]: [{ id: weekId }],
    [CONFIG.unlockFields.achievement]: [{ id: achievementRecord.id }],
  };

  if (fieldExists(unlocksTable, CONFIG.unlockFields.sourceKey)) {
    unlockPayload[CONFIG.unlockFields.sourceKey] = sourceKey;
  }

  if (fieldExists(unlocksTable, CONFIG.unlockFields.sourceStatus)) {
    unlockPayload[CONFIG.unlockFields.sourceStatus] = { name: "Ready for XP" };
  }

  if (fieldExists(unlocksTable, CONFIG.unlockFields.xpAwardStatus)) {
    unlockPayload[CONFIG.unlockFields.xpAwardStatus] = { name: "Pending" };
  }

  if (fieldExists(unlocksTable, CONFIG.unlockFields.notes)) {
    unlockPayload[CONFIG.unlockFields.notes] =
      "Created by 058 after Weekly Athlete Summary qualified for Perfect Week.";
  }

  const newUnlockId = await unlocksTable.createRecordAsync(unlockPayload);

  /*************************************************************************************************
   * 8. Write Unlock Back to Weekly Athlete Summary
   *************************************************************************************************/

  await updateWeekly({
    [CONFIG.weeklyFields.perfectWeekUnlock]: [{ id: newUnlockId }],
    [CONFIG.weeklyFields.automationError]: "",
  });

} catch (error) {
  await updateWeekly({
    [CONFIG.weeklyFields.automationError]: `058 error: ${error.message}`,
  });

  throw error;
}

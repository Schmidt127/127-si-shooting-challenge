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
 * Version: 1.2
 * Date written: 2026-05-30
 * Last updated: 2026-08-13
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
 * Lifecycle trigger contract:
 * - Trigger on record updates that include Perfect Week Eligible?, Perfect Week
 *   Automation Status, Enrollment, Week, Goal Record, and Perfect Week Unlock.
 * - Do not use positive-only eligibility or empty-unlock conditions: they block
 *   withdrawal and same-unlock restoration.
 *
 * Required input variable:
 * - recordId = Airtable record ID from triggering Weekly Athlete Summary record
 *
 * PKG-039 safety boundary:
 * - An inactive Enrollment never creates or replays a Perfect Week Unlock.
 * - The linked Goal Record must be the one active, exact Program Instance +
 *   Grade Band configuration with an explicit numeric target. Blank/unsettled
 *   goal state never qualifies as configured zero.
 ***************************************************************************************************/

/***************************************************************************************************
 * 1. Configuration
 ***************************************************************************************************/

const CONFIG = {
  tables: {
    weekly: "Weekly Athlete Summary",
    enrollments: "Enrollments",
    targetGoals: "Target Goal Shots",
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
    gradeBand: "Grade Band",
    goalRecord: "Goal Record",
    weeklyGoal: "Weekly Goal Shots Target",
    perfectWeekEligible: "Perfect Week Eligible?",
    perfectWeekUnlock: "Perfect Week Unlock",
    automationStatus: "Perfect Week Automation Status",
    automationError: "Perfect Week Automation Error",
  },
  enrollmentFields: {
    active: "Active?",
    programInstance: "Program Instance",
  },
  targetGoalFields: {
    active: "Active?",
    programInstance: "Program Instance",
    gradeBand: "Grade Band",
    totalShotTarget: "Total Shot Target",
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
    active: "Active?",
    sourceStatus: "Source Status",
    xpAwardStatus: "XP Award Status",
    sourceKey: "Source Key",
    notes: "Notes",
  },
};

/***************************************************************************************************
 * 2. Helper Functions
 ***************************************************************************************************/

function getExactlyOneLinkedId(record, fieldName, label) {
  const values = [...new Set(getLinkedIds(record, fieldName).filter(Boolean))];
  if (values.length !== 1) {
    throw new Error(`${label} must have exactly one linked record; found ${values.length}.`);
  }
  return values[0];
}

function getLinkedIds(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.id);
}

function isExactOwnedUnlock(unlock, {
  sourceKey,
  enrollmentId,
  weekId,
  achievementId,
}) {
  return (
    getText(unlock, CONFIG.unlockFields.sourceKey) === sourceKey &&
    getLinkedIds(unlock, CONFIG.unlockFields.enrollment).length === 1 &&
    getLinkedIds(unlock, CONFIG.unlockFields.enrollment)[0] === enrollmentId &&
    getLinkedIds(unlock, CONFIG.unlockFields.week).length === 1 &&
    getLinkedIds(unlock, CONFIG.unlockFields.week)[0] === weekId &&
    getLinkedIds(unlock, CONFIG.unlockFields.achievement).length === 1 &&
    getLinkedIds(unlock, CONFIG.unlockFields.achievement)[0] === achievementId
  );
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

function getOptionalNumber(record, fieldName) {
  const value = record.getCellValue(fieldName);
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) {
    if (value.length !== 1) return null;
    const parsed = typeof value[0] === "number" ? value[0] : Number(value[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const targetGoalsTable = base.getTable(CONFIG.tables.targetGoals);
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
  const enrollmentId = getExactlyOneLinkedId(
    weeklyRecord, CONFIG.weeklyFields.enrollment, "Weekly Athlete Summary Enrollment"
  );
  const weekId = getExactlyOneLinkedId(
    weeklyRecord, CONFIG.weeklyFields.week, "Weekly Athlete Summary Week"
  );
  const linkedUnlockIds = [...new Set(
    getLinkedIds(weeklyRecord, CONFIG.weeklyFields.perfectWeekUnlock).filter(Boolean)
  )];
  if (linkedUnlockIds.length > 1) {
    throw new Error(
      `Weekly Athlete Summary has ambiguous Perfect Week Unlock ownership: ${linkedUnlockIds.join(", ")}.`
    );
  }

  const eligibleValue = weeklyRecord.getCellValue(CONFIG.weeklyFields.perfectWeekEligible);
  const isEligible = isTruthy(eligibleValue);
  const automationStatus = getSingleSelectName(weeklyRecord, CONFIG.weeklyFields.automationStatus);

  const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId);
  if (!enrollmentRecord) throw new Error(`Enrollment ${enrollmentId} not found.`);
  if (!fieldExists(enrollmentsTable, CONFIG.enrollmentFields.active)) {
    throw new Error("Enrollments table is missing required Active? field.");
  }
  const enrollmentIsActive = isTruthy(enrollmentRecord.getCellValue(CONFIG.enrollmentFields.active));

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
  const sourceKey = `PERFECT_WEEK|${enrollmentId}|${weekId}`;

  /*************************************************************************************************
   * 6. Resolve Exact-Owned Unlock Candidate
   *************************************************************************************************/

  if (!fieldExists(unlocksTable, CONFIG.unlockFields.sourceKey)) {
    throw new Error("Athlete Achievement Unlocks table is missing required Source Key field.");
  }
  if (!fieldExists(unlocksTable, CONFIG.unlockFields.active)) {
    throw new Error("Athlete Achievement Unlocks table is missing required Active? field.");
  }

  const unlockFieldsToQuery = [
    CONFIG.unlockFields.enrollment,
    CONFIG.unlockFields.week,
    CONFIG.unlockFields.achievement,
    CONFIG.unlockFields.sourceKey,
    CONFIG.unlockFields.active,
    CONFIG.unlockFields.xpAwardStatus,
  ];

  const unlockQuery = await unlocksTable.selectRecordsAsync({
    fields: unlockFieldsToQuery,
  });

  const unlockCandidates = new Map();
  for (const unlock of unlockQuery.records) {
    const existingSourceKey = getText(unlock, CONFIG.unlockFields.sourceKey);
    if (
      existingSourceKey === sourceKey ||
      linkedUnlockIds.includes(unlock.id)
    ) {
      unlockCandidates.set(unlock.id, unlock);
    }
  }

  const candidateUnlocks = [...unlockCandidates.values()].sort((a, b) => a.id.localeCompare(b.id));
  if (candidateUnlocks.length > 1) {
    throw new Error(
      `Duplicate or ambiguous Perfect Week Unlock candidates for ${sourceKey}: ${candidateUnlocks.map((unlock) => unlock.id).join(", ")}.`
    );
  }

  const existingUnlock = candidateUnlocks[0] || null;
  if (existingUnlock && !isExactOwnedUnlock(existingUnlock, {
    sourceKey,
    enrollmentId,
    weekId,
    achievementId: achievementRecord.id,
  })) {
    throw new Error(
      `Perfect Week Unlock ${existingUnlock.id} failed exact ownership for ${sourceKey}.`
    );
  }

  /*************************************************************************************************
   * 7. Reconcile Withdrawal or Eligibility Configuration
   *************************************************************************************************/

  const mayQualify = enrollmentIsActive && isEligible && automationStatus === "Ready";
  if (!mayQualify) {
    if (existingUnlock && isTruthy(existingUnlock.getCellValue(CONFIG.unlockFields.active))) {
      await unlocksTable.updateRecordAsync(existingUnlock.id, {
        [CONFIG.unlockFields.active]: false,
      });
    }

    const reason = !enrollmentIsActive
      ? "Enrollment is inactive"
      : !isEligible
        ? "Perfect Week Eligible? is not 1"
        : `Perfect Week Automation Status is '${automationStatus}', not 'Ready'`;
    await updateWeekly({
      [CONFIG.weeklyFields.automationError]: `058 skipped: ${reason}.`,
    });
    return;
  }

  const gradeBandId = getExactlyOneLinkedId(
    weeklyRecord, CONFIG.weeklyFields.gradeBand, "Weekly Athlete Summary Grade Band"
  );
  const goalRecordId = getExactlyOneLinkedId(
    weeklyRecord, CONFIG.weeklyFields.goalRecord, "Weekly Athlete Summary Goal Record"
  );
  const programInstanceId = getExactlyOneLinkedId(
    enrollmentRecord, CONFIG.enrollmentFields.programInstance, "Enrollment Program Instance"
  );
  const goalRecord = await targetGoalsTable.selectRecordAsync(goalRecordId);
  if (!goalRecord) throw new Error(`Goal Record ${goalRecordId} not found.`);
  const goalProgramInstanceId = getExactlyOneLinkedId(
    goalRecord, CONFIG.targetGoalFields.programInstance, "Goal Record Program Instance"
  );
  const goalGradeBandId = getExactlyOneLinkedId(
    goalRecord, CONFIG.targetGoalFields.gradeBand, "Goal Record Grade Band"
  );
  const goalTarget = getOptionalNumber(goalRecord, CONFIG.targetGoalFields.totalShotTarget);
  const settledWeeklyGoal = getOptionalNumber(weeklyRecord, CONFIG.weeklyFields.weeklyGoal);
  if (
    !isTruthy(goalRecord.getCellValue(CONFIG.targetGoalFields.active)) ||
    goalProgramInstanceId !== programInstanceId ||
    goalGradeBandId !== gradeBandId ||
    goalTarget === null ||
    settledWeeklyGoal === null ||
    settledWeeklyGoal !== goalTarget
  ) {
    throw new Error(
      "058 requires one active, exact Program Instance + Grade Band Goal Record and a settled matching Weekly Goal Shots Target."
    );
  }

  /*************************************************************************************************
   * 8. Restore Exact-Owned Unlock or Create One
   *************************************************************************************************/

  if (existingUnlock) {
    const unlockUpdate = {};
    if (!isTruthy(existingUnlock.getCellValue(CONFIG.unlockFields.active))) {
      unlockUpdate[CONFIG.unlockFields.active] = true;
    }
    if (fieldExists(unlocksTable, CONFIG.unlockFields.xpAwardStatus)) {
      unlockUpdate[CONFIG.unlockFields.xpAwardStatus] = { name: "Pending" };
    }
    if (Object.keys(unlockUpdate).length > 0) {
      await unlocksTable.updateRecordAsync(existingUnlock.id, unlockUpdate);
    }
    await updateWeekly({
      [CONFIG.weeklyFields.perfectWeekUnlock]: [{ id: existingUnlock.id }],
      [CONFIG.weeklyFields.automationError]: "",
    });
    return;
  }

  // Last-chance recheck avoids creating a replacement unlock during a concurrent retry.
  const recheck = await unlocksTable.selectRecordsAsync({
    fields: unlockFieldsToQuery,
  });
  const recheckCandidates = recheck.records.filter(
    (unlock) => getText(unlock, CONFIG.unlockFields.sourceKey) === sourceKey
  );
  if (recheckCandidates.length > 1) {
    throw new Error(
      `Duplicate Perfect Week Unlocks found during create recheck for ${sourceKey}: ${recheckCandidates.map((unlock) => unlock.id).join(", ")}.`
    );
  }
  if (recheckCandidates.length === 1) {
    const recheckedUnlock = recheckCandidates[0];
    if (!isExactOwnedUnlock(recheckedUnlock, {
      sourceKey,
      enrollmentId,
      weekId,
      achievementId: achievementRecord.id,
    })) {
      throw new Error(
        `Perfect Week Unlock ${recheckedUnlock.id} failed exact ownership during create recheck for ${sourceKey}.`
      );
    }
    await updateWeekly({
      [CONFIG.weeklyFields.perfectWeekUnlock]: [{ id: recheckedUnlock.id }],
      [CONFIG.weeklyFields.automationError]: "",
    });
    return;
  }

  const unlockPayload = {
    [CONFIG.unlockFields.enrollment]: [{ id: enrollmentId }],
    [CONFIG.unlockFields.week]: [{ id: weekId }],
    [CONFIG.unlockFields.achievement]: [{ id: achievementRecord.id }],
    [CONFIG.unlockFields.active]: true,
    [CONFIG.unlockFields.sourceKey]: sourceKey,
  };

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
   * 9. Write Unlock Back to Weekly Athlete Summary
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

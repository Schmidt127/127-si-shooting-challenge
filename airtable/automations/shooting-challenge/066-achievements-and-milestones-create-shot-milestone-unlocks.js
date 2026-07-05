/*
Automation: 066 - Achievements and Milestones - Create Shot Milestone Unlocks
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-20
Last GitHub Update: 2026-07-05

Purpose:
Creates Athlete Achievement Unlock rows when an Enrollment crosses configured Shot Milestone thresholds.

Trigger:
Enrollments when Run Shot Milestone Check? is checked (confirm conditions in Airtable UI).

Important Tables:
Enrollments, Submissions, Shot Milestones, Achievements, Athlete Achievement Unlocks, Weeks

Important Fields:
Run Shot Milestone Check?, Grade Band, Milestone Source Key, Milestone Activity Date, Week

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
First automation upgraded to V2 Automation Standard (2026-07-05).
*/

/************************************************************
 * 066 - ACHIEVEMENTS AND MILESTONES
 * Create Shot Milestone Unlocks
 *
 * Version: v3.0
 * Date Written: 2026-06-17
 * Last Updated: 2026-07-05
 *
 * VERSION HISTORY
 * - v3.0 (2026-07-05): V2 standard rewrite — Week write from Milestone Activity Date;
 *   CONFIG/scriptName/version alignment; required outputs; numbered sections; schema gates.
 * - v2.1 (2026-06-17): Writable-field protection; skip computed Unlock Key writes.
 * - v2.0: Milestone crossing from counted submissions; Milestone Source Key idempotency.
 *
 * PURPOSE
 * - Runs from one Enrollment record when Run Shot Milestone Check? is checked.
 * - Calculates total counted shots from linked Submissions (Activity Date + Total Shots Counted).
 * - Finds active Shot Milestones for the enrollment Grade Band (config table — not hardcoded).
 * - Determines which milestones were crossed and on which submission date.
 * - Creates one Athlete Achievement Unlock per milestone using Milestone Source Key dedupe.
 * - Writes Milestone Activity Date, Week (from Weeks date ranges), and Pending XP status.
 * - Clears Run Shot Milestone Check? when finished (except on error — leave checked for triage).
 *
 * IMPORTANT DESIGN RULES
 * - One Milestone Source Key = one unlock: SHOT_MILESTONE|{enrollmentId}|{shotMilestoneId}
 * - Multiple milestones may unlock in the same Week — that is valid (not a duplicate).
 * - Do NOT write Athlete Achievement Unlocks.Unlock Key (computed/formula in this base).
 * - Skip inactive enrollments without error.
 * - Grade Band and milestone thresholds come from linked config records — config-over-code.
 * - Week resolution uses Weeks.Start Date / End Date ranges (America/Denver dateTime fields).
 *
 * THIS IS NOT
 * - XP award automation (059 / achievement-to-XP chain handles Pending unlocks).
 * - Perfect Week unlocks (058).
 * - Streak unlocks (053–054).
 *
 * FOLDER
 * - 06 - Achievements and Milestones
 *
 * AUTOMATION NAME
 * - 066 - Achievements and Milestones - Create Shot Milestone Unlocks
 *
 * TRIGGER TABLE
 * - Enrollments
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Run Shot Milestone Check? is checked
 *
 * OPTIONAL TRIGGER CONDITIONS
 * - Active? is checked (script also skips inactive enrollments)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Enrollment record
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created | updated | skipped_inactive | skipped_no_submissions | skipped_no_milestones | skipped_zero_total | skipped_existing | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - enrollmentIdOut
 * - createdUnlocksOut
 * - updatedUnlocksOut
 * - skippedExistingUnlocksOut
 *
 * PRIMARY TABLES USED
 * - Enrollments, Submissions, Shot Milestones, Achievements, Athlete Achievement Unlocks, Weeks
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Athlete Achievement Unlocks → Enrollment, Achievement, Shot Milestone, Milestone Source Key,
 *   Milestone Activity Date, Week, XP Award Status, Notes
 * - Enrollments → Run Shot Milestone Check? (cleared on success/skip paths)
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — CONFIGURATION
========================================================= */

const CONFIG = {
  scriptName: "066 - Achievements and Milestones - Create Shot Milestone Unlocks",
  version: "v3.0",
  timeZone: "America/Denver",

  tables: {
    enrollments: "Enrollments",
    submissions: "Submissions",
    shotMilestones: "Shot Milestones",
    achievements: "Achievements",
    unlocks: "Athlete Achievement Unlocks",
    weeks: "Weeks",
  },

  achievementLookup: {
    name: "Shot Milestone",
    rewardRuleKey: "SHOT_MILESTONE",
  },

  enrollmentFields: {
    active: "Active?",
    gradeBand: "Grade Band",
    totalShots: "Total Shots Submitted",
    runCheck: "Run Shot Milestone Check?",
  },

  submissionFields: {
    enrollment: "Enrollment",
    activityDate: "Activity Date",
    totalShotsCounted: "Total Shots Counted",
  },

  shotMilestoneFields: {
    label: "Milestone Label",
    gradeBand: "Grade Band",
    milestonePercent: "Milestone Percent",
    milestoneShotCount: "Milestone Shot Count",
    pointsAwarded: "Points Awarded",
    active: "Active",
    uniqueKey: "Milestone Unique Key",
  },

  achievementFields: {
    name: "Achievement Name",
    fallbackName: "Name",
    rewardRuleKey: "Reward Rule Key",
    active: "Active?",
  },

  unlockFields: {
    enrollment: "Enrollment",
    achievement: "Achievement",
    week: "Week",
    shotMilestone: "Shot Milestone",
    milestoneSourceKey: "Milestone Source Key",
    milestoneActivityDate: "Milestone Activity Date",
    xpAwardStatus: "XP Award Status",
    unlockKey: "Unlock Key",
    notes: "Notes",
  },

  weekFields: {
    startDate: "Start Date",
    endDate: "End Date",
    active: "Active Week?",
  },

  statuses: {
    pending: "Pending",
    success: "success",
    skipped: "skipped",
    error: "error",
  },

  actions: {
    created: "created",
    updated: "updated",
    skippedInactive: "skipped_inactive",
    skippedNoSubmissions: "skipped_no_submissions",
    skippedNoMilestones: "skipped_no_milestones",
    skippedZeroTotal: "skipped_zero_total",
    skippedExisting: "skipped_existing",
    error: "error",
  },

  sourceKeyPrefix: "SHOT_MILESTONE|",
};

const fieldCache = new Map();

/* =========================================================
   SECTION 2 — OUTPUT HELPERS
========================================================= */

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch {
    // Ignore output mapping errors.
  }
}

function log(message, data = null) {
  if (data === null || data === undefined) {
    console.log(message);
  } else {
    console.log(message, JSON.stringify(data, null, 2));
  }
}

function setSkippedOutputs({ actionOut, errorOut, debugStep, enrollmentId = "" }) {
  setOutputSafe("statusOut", CONFIG.statuses.skipped);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut || "");
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("enrollmentIdOut", enrollmentId);
}

function setErrorOutputs({ errorOut, debugStep, enrollmentId = "" }) {
  setOutputSafe("statusOut", CONFIG.statuses.error);
  setOutputSafe("actionOut", CONFIG.actions.error);
  setOutputSafe("errorOut", errorOut || "Unknown error");
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("enrollmentIdOut", enrollmentId);
}

/* =========================================================
   SECTION 3 — FIELD / SCHEMA HELPERS
========================================================= */

function getFieldSafe(table, fieldName) {
  if (!table || !fieldName) return null;

  const cacheKey = `${table.name}:${fieldName}`;
  if (fieldCache.has(cacheKey)) {
    return fieldCache.get(cacheKey);
  }

  try {
    const field = table.getField(fieldName);
    fieldCache.set(cacheKey, field);
    return field;
  } catch {
    fieldCache.set(cacheKey, null);
    return null;
  }
}

function fieldExists(table, fieldName) {
  return !!getFieldSafe(table, fieldName);
}

function requireField(table, fieldName) {
  if (!fieldExists(table, fieldName)) {
    throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
  }
}

function isWritableField(table, fieldName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return false;
  if (field.isComputed === true) return false;

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

function getAvailableField(table, preferredName, fallbackName = null) {
  if (fieldExists(table, preferredName)) return preferredName;
  if (fallbackName && fieldExists(table, fallbackName)) return fallbackName;
  return null;
}

function fieldList(table, fieldNames) {
  return fieldNames.filter((fieldName) => fieldName && fieldExists(table, fieldName));
}

function hasSelectChoice(table, fieldName, choiceName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return false;
  if (field.type !== "singleSelect") return true;
  const choices = field.options?.choices || [];
  return choices.some((choice) => choice.name === choiceName);
}

function singleSelectValue(table, fieldName, choiceName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return undefined;

  if (field.type === "singleSelect") {
    if (!hasSelectChoice(table, fieldName, choiceName)) {
      throw new Error(
        `Missing single-select option "${choiceName}" on ${table.name} -> ${fieldName}.`
      );
    }
    return { name: choiceName };
  }

  return choiceName;
}

function validateRequiredSchema(tables) {
  requireField(tables.enrollments, CONFIG.enrollmentFields.gradeBand);
  requireField(tables.enrollments, CONFIG.enrollmentFields.runCheck);
  requireField(tables.submissions, CONFIG.submissionFields.enrollment);
  requireField(tables.submissions, CONFIG.submissionFields.activityDate);
  requireField(tables.submissions, CONFIG.submissionFields.totalShotsCounted);
  requireField(tables.shotMilestones, CONFIG.shotMilestoneFields.gradeBand);
  requireField(tables.shotMilestones, CONFIG.shotMilestoneFields.milestoneShotCount);
  requireField(tables.unlocks, CONFIG.unlockFields.enrollment);
  requireField(tables.unlocks, CONFIG.unlockFields.achievement);
  requireField(tables.unlocks, CONFIG.unlockFields.shotMilestone);
  requireField(tables.unlocks, CONFIG.unlockFields.milestoneSourceKey);
  requireField(tables.unlocks, CONFIG.unlockFields.milestoneActivityDate);
  requireField(tables.weeks, CONFIG.weekFields.startDate);
  requireField(tables.weeks, CONFIG.weekFields.endDate);

  if (!isWritableField(tables.unlocks, CONFIG.unlockFields.week)) {
    throw new Error(
      `Field is not writable: ${CONFIG.tables.unlocks}.${CONFIG.unlockFields.week}`
    );
  }
}

/* =========================================================
   SECTION 4 — DATA HELPERS
========================================================= */

function getLinkedIds(record, fieldName) {
  if (!fieldName) return [];
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.id).filter(Boolean);
}

function getLinkedNames(record, fieldName) {
  if (!fieldName) return [];
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.name || "").filter(Boolean);
}

function getText(record, fieldName) {
  if (!fieldName) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, fieldName) {
  if (!fieldName) return 0;
  const value = record.getCellValue(fieldName);
  if (typeof value === "number") return value;
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === "number") return first;
    const parsed = Number(first);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBooleanish(record, fieldName, fallback = false) {
  if (!fieldName) return fallback;
  const value = record.getCellValue(fieldName);
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;
  if (value && typeof value === "object" && value.name) {
    const name = String(value.name).trim().toLowerCase();
    return ["1", "true", "yes", "checked", "active"].includes(name);
  }
  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "checked", "active"].includes(text);
}

function getGradeBandLabel(record, fieldName) {
  const linkedNames = getLinkedNames(record, fieldName);
  if (linkedNames.length > 0) return linkedNames[0];
  return getText(record, fieldName);
}

function getDateValue(record, fieldName) {
  if (!fieldName) return null;
  const value = record.getCellValue(fieldName);
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function toDateKey(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateForNotes(dateValue) {
  if (!dateValue) return "No date";
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addIfWritable(table, payload, fieldName, value) {
  if (!fieldName || !fieldExists(table, fieldName)) return;
  if (!isWritableField(table, fieldName)) {
    console.log(`Skipped non-writable field: ${table.name} -> ${fieldName}`);
    return;
  }
  if (value === undefined) return;
  payload[fieldName] = value;
}

function buildSafeUpdatePayload(table, fields) {
  const safeFields = {};
  for (const [fieldName, value] of Object.entries(fields || {})) {
    addIfWritable(table, safeFields, fieldName, value);
  }
  return safeFields;
}

async function updateEnrollment(enrollmentsTable, enrollmentRecord, fields) {
  const safeFields = buildSafeUpdatePayload(enrollmentsTable, fields);
  if (Object.keys(safeFields).length > 0) {
    await enrollmentsTable.updateRecordAsync(enrollmentRecord.id, safeFields);
  }
}

function buildMilestoneSourceKey(enrollmentId, shotMilestoneId) {
  return `${CONFIG.sourceKeyPrefix}${enrollmentId}|${shotMilestoneId}`;
}

/* =========================================================
   SECTION 5 — WEEK RESOLUTION
========================================================= */

function findWeekForDate(weekRecords, weeksTable, dateKey) {
  if (!dateKey) return null;

  const target = new Date(`${dateKey}T12:00:00.000Z`);

  for (const week of weekRecords) {
    const startRaw = getDateValue(week, CONFIG.weekFields.startDate);
    const endRaw = getDateValue(week, CONFIG.weekFields.endDate);
    if (!startRaw || !endRaw) continue;

    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const startDateOnly = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0)
    );
    const endDateOnly = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999)
    );

    if (target >= startDateOnly && target <= endDateOnly) {
      const isActive = fieldExists(weeksTable, CONFIG.weekFields.active)
        ? getBooleanish(week, CONFIG.weekFields.active, true)
        : true;
      if (!isActive) continue;
      return week;
    }
  }

  return null;
}

function resolveWeekIdForActivityDate(weekRecords, weeksTable, activityDate) {
  const dateKey = toDateKey(activityDate);
  if (!dateKey) return { weekId: "", dateKey: "" };
  const weekRecord = findWeekForDate(weekRecords, weeksTable, dateKey);
  return {
    weekId: weekRecord ? weekRecord.id : "",
    dateKey,
    weekName: weekRecord ? weekRecord.name : "",
  };
}

/* =========================================================
   SECTION 6 — MAIN
========================================================= */

async function main() {
  let debugStep = "0 - Start";
  setOutputSafe("debugStep", debugStep);

  const inputConfig = input.config();
  const recordId = String(inputConfig.recordId || "").trim();

  debugStep = "1 - Validate recordId";
  setOutputSafe("debugStep", debugStep);

  if (!recordId) {
    throw new Error("Missing input variable: recordId");
  }
  if (!recordId.startsWith("rec")) {
    throw new Error(`Invalid Enrollment recordId input: ${recordId}`);
  }

  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const shotMilestonesTable = base.getTable(CONFIG.tables.shotMilestones);
  const achievementsTable = base.getTable(CONFIG.tables.achievements);
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const weeksTable = base.getTable(CONFIG.tables.weeks);

  debugStep = "2 - Validate schema";
  setOutputSafe("debugStep", debugStep);

  validateRequiredSchema({
    enrollments: enrollmentsTable,
    submissions: submissionsTable,
    shotMilestones: shotMilestonesTable,
    achievements: achievementsTable,
    unlocks: unlocksTable,
    weeks: weeksTable,
  });

  debugStep = "3 - Load Enrollment";
  setOutputSafe("debugStep", debugStep);

  const enrollmentFieldsToLoad = fieldList(enrollmentsTable, [
    CONFIG.enrollmentFields.active,
    CONFIG.enrollmentFields.gradeBand,
    CONFIG.enrollmentFields.totalShots,
    CONFIG.enrollmentFields.runCheck,
  ]);

  const enrollmentRecord = await enrollmentsTable.selectRecordAsync(recordId, {
    fields: enrollmentFieldsToLoad,
  });

  if (!enrollmentRecord) {
    throw new Error(`Enrollment record not found: ${recordId}`);
  }

  const enrollmentId = enrollmentRecord.id;

  debugStep = "4 - Check enrollment active";
  setOutputSafe("debugStep", debugStep);

  const enrollmentActive = fieldExists(enrollmentsTable, CONFIG.enrollmentFields.active)
    ? getBooleanish(enrollmentRecord, CONFIG.enrollmentFields.active, true)
    : true;

  if (!enrollmentActive) {
    await updateEnrollment(enrollmentsTable, enrollmentRecord, {
      [CONFIG.enrollmentFields.runCheck]: false,
    });
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedInactive,
      errorOut: "Skipped: Enrollment is not active.",
      debugStep,
      enrollmentId,
    });
    console.log(
      JSON.stringify({
        automation: CONFIG.scriptName,
        version: CONFIG.version,
        statusOut: CONFIG.statuses.skipped,
        actionOut: CONFIG.actions.skippedInactive,
        enrollmentId,
      })
    );
    return;
  }

  const enrollmentGradeBand = getGradeBandLabel(
    enrollmentRecord,
    CONFIG.enrollmentFields.gradeBand
  );

  if (!enrollmentGradeBand) {
    await updateEnrollment(enrollmentsTable, enrollmentRecord, {
      [CONFIG.enrollmentFields.runCheck]: false,
    });
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedInactive,
      errorOut: "Skipped: Enrollment is missing Grade Band.",
      debugStep,
      enrollmentId,
    });
    return;
  }

  debugStep = "5 - Load submissions and weeks";
  setOutputSafe("debugStep", debugStep);

  const [submissionQuery, weekQuery, unlockQuery, achievementQuery, shotMilestoneQuery] =
    await Promise.all([
      submissionsTable.selectRecordsAsync({
        fields: fieldList(submissionsTable, [
          CONFIG.submissionFields.enrollment,
          CONFIG.submissionFields.activityDate,
          CONFIG.submissionFields.totalShotsCounted,
        ]),
      }),
      weeksTable.selectRecordsAsync({
        fields: fieldList(weeksTable, [
          CONFIG.weekFields.startDate,
          CONFIG.weekFields.endDate,
          CONFIG.weekFields.active,
        ]),
      }),
      unlocksTable.selectRecordsAsync({
        fields: fieldList(unlocksTable, [
          CONFIG.unlockFields.milestoneSourceKey,
          CONFIG.unlockFields.enrollment,
          CONFIG.unlockFields.shotMilestone,
          CONFIG.unlockFields.milestoneActivityDate,
          CONFIG.unlockFields.week,
        ]),
      }),
      achievementsTable.selectRecordsAsync({
        fields: fieldList(achievementsTable, [
          getAvailableField(
            achievementsTable,
            CONFIG.achievementFields.name,
            CONFIG.achievementFields.fallbackName
          ),
          CONFIG.achievementFields.rewardRuleKey,
          CONFIG.achievementFields.active,
        ].filter(Boolean)),
      }),
      shotMilestonesTable.selectRecordsAsync({
        fields: fieldList(shotMilestonesTable, [
          CONFIG.shotMilestoneFields.label,
          CONFIG.shotMilestoneFields.gradeBand,
          CONFIG.shotMilestoneFields.milestonePercent,
          CONFIG.shotMilestoneFields.milestoneShotCount,
          CONFIG.shotMilestoneFields.pointsAwarded,
          CONFIG.shotMilestoneFields.active,
          CONFIG.shotMilestoneFields.uniqueKey,
        ]),
      }),
    ]);

  const enrollmentSubmissions = submissionQuery.records
    .filter((submission) =>
      getLinkedIds(submission, CONFIG.submissionFields.enrollment).includes(enrollmentId)
    )
    .map((submission) => ({
      record: submission,
      activityDate: getDateValue(submission, CONFIG.submissionFields.activityDate),
      totalShotsCounted: getNumber(submission, CONFIG.submissionFields.totalShotsCounted),
    }))
    .filter((submission) => submission.activityDate && submission.totalShotsCounted > 0)
    .sort((a, b) => {
      const dateDiff = a.activityDate.getTime() - b.activityDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      const createdA = a.record.createdTime ? new Date(a.record.createdTime).getTime() : 0;
      const createdB = b.record.createdTime ? new Date(b.record.createdTime).getTime() : 0;
      if (createdA !== createdB) return createdA - createdB;
      return a.record.id.localeCompare(b.record.id);
    });

  if (enrollmentSubmissions.length === 0) {
    await updateEnrollment(enrollmentsTable, enrollmentRecord, {
      [CONFIG.enrollmentFields.runCheck]: false,
    });
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedNoSubmissions,
      errorOut: "Skipped: No counted submissions with Activity Date found.",
      debugStep,
      enrollmentId,
    });
    return;
  }

  const calculatedTotalShots = enrollmentSubmissions.reduce(
    (sum, submission) => sum + submission.totalShotsCounted,
    0
  );

  const enrollmentReportedTotalShots = getNumber(
    enrollmentRecord,
    CONFIG.enrollmentFields.totalShots
  );

  if (!calculatedTotalShots || calculatedTotalShots <= 0) {
    await updateEnrollment(enrollmentsTable, enrollmentRecord, {
      [CONFIG.enrollmentFields.runCheck]: false,
    });
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedZeroTotal,
      errorOut: "Skipped: Calculated submission total is zero.",
      debugStep,
      enrollmentId,
    });
    return;
  }

  debugStep = "6 - Resolve Shot Milestone achievement";
  setOutputSafe("debugStep", debugStep);

  const achievementNameField = getAvailableField(
    achievementsTable,
    CONFIG.achievementFields.name,
    CONFIG.achievementFields.fallbackName
  );

  if (!achievementNameField) {
    throw new Error("Achievements table is missing Achievement Name or Name field.");
  }

  requireField(achievementsTable, CONFIG.achievementFields.rewardRuleKey);

  const matchingAchievements = achievementQuery.records.filter((achievement) => {
    const achievementName = getText(achievement, achievementNameField);
    const rewardRuleKey = getText(achievement, CONFIG.achievementFields.rewardRuleKey);
    const active = fieldExists(achievementsTable, CONFIG.achievementFields.active)
      ? getBooleanish(achievement, CONFIG.achievementFields.active, true)
      : true;

    return (
      active &&
      (achievementName === CONFIG.achievementLookup.name ||
        rewardRuleKey === CONFIG.achievementLookup.rewardRuleKey)
    );
  });

  if (matchingAchievements.length === 0) {
    throw new Error(
      `No active Achievement found for "${CONFIG.achievementLookup.name}" or Reward Rule Key "${CONFIG.achievementLookup.rewardRuleKey}".`
    );
  }
  if (matchingAchievements.length > 1) {
    throw new Error(
      `Multiple active Shot Milestone achievements found. Keep only one active "${CONFIG.achievementLookup.name}" achievement.`
    );
  }

  const shotMilestoneAchievement = matchingAchievements[0];

  const existingUnlockBySourceKey = new Map();
  for (const unlock of unlockQuery.records) {
    const sourceKey = getText(unlock, CONFIG.unlockFields.milestoneSourceKey);
    if (sourceKey) {
      existingUnlockBySourceKey.set(sourceKey, unlock);
    }
  }

  debugStep = "7 - Build eligible milestones";
  setOutputSafe("debugStep", debugStep);

  const eligibleMilestones = [];

  for (const milestone of shotMilestoneQuery.records) {
    const active = fieldExists(shotMilestonesTable, CONFIG.shotMilestoneFields.active)
      ? getBooleanish(milestone, CONFIG.shotMilestoneFields.active, true)
      : true;
    if (!active) continue;

    const milestoneGradeBand = getGradeBandLabel(
      milestone,
      CONFIG.shotMilestoneFields.gradeBand
    );
    if (milestoneGradeBand !== enrollmentGradeBand) continue;

    const milestoneShotCount = getNumber(
      milestone,
      CONFIG.shotMilestoneFields.milestoneShotCount
    );
    if (!milestoneShotCount || milestoneShotCount <= 0) continue;
    if (calculatedTotalShots < milestoneShotCount) continue;

    eligibleMilestones.push({
      record: milestone,
      sourceKey: buildMilestoneSourceKey(enrollmentId, milestone.id),
      shotCount: milestoneShotCount,
      percent: getNumber(milestone, CONFIG.shotMilestoneFields.milestonePercent),
      label: getText(milestone, CONFIG.shotMilestoneFields.label),
      points: getNumber(milestone, CONFIG.shotMilestoneFields.pointsAwarded),
    });
  }

  eligibleMilestones.sort((a, b) => {
    if (a.shotCount !== b.shotCount) return a.shotCount - b.shotCount;
    return a.percent - b.percent;
  });

  if (eligibleMilestones.length === 0) {
    await updateEnrollment(enrollmentsTable, enrollmentRecord, {
      [CONFIG.enrollmentFields.runCheck]: false,
    });
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedNoMilestones,
      errorOut: "Skipped: No eligible shot milestones for current total.",
      debugStep,
      enrollmentId,
    });
    return;
  }

  debugStep = "8 - Determine milestone crossings";
  setOutputSafe("debugStep", debugStep);

  const crossingByMilestoneId = new Map();
  let runningTotal = 0;

  for (const submission of enrollmentSubmissions) {
    const beforeTotal = runningTotal;
    runningTotal += submission.totalShotsCounted;

    for (const milestone of eligibleMilestones) {
      if (crossingByMilestoneId.has(milestone.record.id)) continue;

      if (beforeTotal < milestone.shotCount && runningTotal >= milestone.shotCount) {
        crossingByMilestoneId.set(milestone.record.id, {
          activityDate: submission.activityDate,
          submissionRecordId: submission.record.id,
          beforeTotal,
          afterTotal: runningTotal,
          submissionShots: submission.totalShotsCounted,
        });
      }
    }
  }

  debugStep = "9 - Create or update unlocks";
  setOutputSafe("debugStep", debugStep);

  let createdCount = 0;
  let updatedExistingCount = 0;
  let skippedExistingCount = 0;
  let missingCrossingDateCount = 0;
  let weekWriteCount = 0;

  for (const milestone of eligibleMilestones) {
    const crossing = crossingByMilestoneId.get(milestone.record.id);

    if (!crossing || !crossing.activityDate) {
      missingCrossingDateCount += 1;
      continue;
    }

    const weekResolved = resolveWeekIdForActivityDate(
      weekQuery.records,
      weeksTable,
      crossing.activityDate
    );

    const existingUnlock = existingUnlockBySourceKey.get(milestone.sourceKey);

    if (existingUnlock) {
      const updatePayload = {};
      let didUpdate = false;

      const existingActivityDate = getDateValue(
        existingUnlock,
        CONFIG.unlockFields.milestoneActivityDate
      );
      if (!existingActivityDate) {
        addIfWritable(
          unlocksTable,
          updatePayload,
          CONFIG.unlockFields.milestoneActivityDate,
          crossing.activityDate
        );
        didUpdate = true;
      }

      const existingWeekId = getLinkedIds(existingUnlock, CONFIG.unlockFields.week)[0] || "";
      if (!existingWeekId && weekResolved.weekId) {
        addIfWritable(unlocksTable, updatePayload, CONFIG.unlockFields.week, [
          { id: weekResolved.weekId },
        ]);
        didUpdate = true;
        weekWriteCount += 1;
      }

      if (fieldExists(unlocksTable, CONFIG.unlockFields.notes) && didUpdate) {
        addIfWritable(
          unlocksTable,
          updatePayload,
          CONFIG.unlockFields.notes,
          [
            getText(existingUnlock, CONFIG.unlockFields.notes),
            `Updated by ${CONFIG.scriptName} ${CONFIG.version}. Milestone Activity Date: ${formatDateForNotes(crossing.activityDate)}. Week: ${weekResolved.weekName || weekResolved.weekId || "unresolved"}. Crossing Submission: ${crossing.submissionRecordId}.`,
          ]
            .filter(Boolean)
            .join("\n")
        );
      }

      if (Object.keys(updatePayload).length > 0) {
        await unlocksTable.updateRecordAsync(existingUnlock.id, updatePayload);
        updatedExistingCount += 1;
      } else {
        skippedExistingCount += 1;
      }

      continue;
    }

    const unlockPayload = {};

    addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.enrollment, [
      { id: enrollmentId },
    ]);
    addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.achievement, [
      { id: shotMilestoneAchievement.id },
    ]);
    addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.shotMilestone, [
      { id: milestone.record.id },
    ]);
    addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.milestoneSourceKey, milestone.sourceKey);
    addIfWritable(
      unlocksTable,
      unlockPayload,
      CONFIG.unlockFields.milestoneActivityDate,
      crossing.activityDate
    );

    if (weekResolved.weekId) {
      addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.week, [
        { id: weekResolved.weekId },
      ]);
      weekWriteCount += 1;
    }

    if (fieldExists(unlocksTable, CONFIG.unlockFields.xpAwardStatus)) {
      addIfWritable(
        unlocksTable,
        unlockPayload,
        CONFIG.unlockFields.xpAwardStatus,
        singleSelectValue(unlocksTable, CONFIG.unlockFields.xpAwardStatus, CONFIG.statuses.pending)
      );
    }

    addIfWritable(
      unlocksTable,
      unlockPayload,
      CONFIG.unlockFields.notes,
      [
        `Created by ${CONFIG.scriptName} ${CONFIG.version}.`,
        `Calculated total shots from Submissions: ${calculatedTotalShots}.`,
        `Enrollment reported total shots: ${enrollmentReportedTotalShots || 0}.`,
        `Milestone: ${milestone.label || milestone.shotCount}.`,
        `Milestone Shot Count: ${milestone.shotCount}.`,
        `Points Awarded: ${milestone.points}.`,
        `Milestone Activity Date: ${formatDateForNotes(crossing.activityDate)}.`,
        `Week: ${weekResolved.weekName || weekResolved.weekId || "unresolved"}.`,
        `Crossing Submission: ${crossing.submissionRecordId}.`,
        `Running total crossed from ${crossing.beforeTotal} to ${crossing.afterTotal}.`,
        `Submission shots counted: ${crossing.submissionShots}.`,
      ].join("\n")
    );

    if (Object.keys(unlockPayload).length === 0) {
      throw new Error("No writable fields available to create Athlete Achievement Unlock.");
    }

    await unlocksTable.createRecordAsync(unlockPayload);
    createdCount += 1;
  }

  debugStep = "10 - Clear run check and finish";
  setOutputSafe("debugStep", debugStep);

  await updateEnrollment(enrollmentsTable, enrollmentRecord, {
    [CONFIG.enrollmentFields.runCheck]: false,
  });

  const actionOut =
    createdCount > 0
      ? CONFIG.actions.created
      : updatedExistingCount > 0
        ? CONFIG.actions.updated
        : skippedExistingCount > 0
          ? CONFIG.actions.skippedExisting
          : CONFIG.actions.created;

  setOutputSafe("statusOut", CONFIG.statuses.success);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", "");
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("enrollmentIdOut", enrollmentId);
  setOutputSafe("createdUnlocksOut", createdCount);
  setOutputSafe("updatedUnlocksOut", updatedExistingCount);
  setOutputSafe("skippedExistingUnlocksOut", skippedExistingCount);

  console.log(
    JSON.stringify(
      {
        automation: CONFIG.scriptName,
        version: CONFIG.version,
        statusOut: CONFIG.statuses.success,
        actionOut,
        enrollmentId,
        gradeBand: enrollmentGradeBand,
        calculatedTotalShots,
        enrollmentReportedTotalShots: enrollmentReportedTotalShots || 0,
        eligibleMilestones: eligibleMilestones.length,
        createdUnlocks: createdCount,
        updatedExistingUnlockDates: updatedExistingCount,
        skippedExistingUnlocks: skippedExistingCount,
        missingCrossingDates: missingCrossingDateCount,
        weekWrites: weekWriteCount,
      },
      null,
      2
    )
  );
}

/* =========================================================
   SECTION 7 — RUN
========================================================= */

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputSafe("statusOut", CONFIG.statuses.error);
  setOutputSafe("actionOut", CONFIG.actions.error);
  setOutputSafe("errorOut", message);
  console.log(
    JSON.stringify(
      {
        automation: CONFIG.scriptName,
        version: CONFIG.version,
        statusOut: CONFIG.statuses.error,
        errorOut: message,
      },
      null,
      2
    )
  );
  throw error;
}

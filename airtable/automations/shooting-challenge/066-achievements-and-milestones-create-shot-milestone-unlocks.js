/*
Automation: 066 - Achievements and Milestones - Create Shot Milestone Unlocks
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
 * 066 - Achievements and Milestones - Create Shot Milestone Unlocks
 * Version: 2026-06-17 v2.1
 *
 * Purpose:
 * Creates Athlete Achievement Unlock records for active Shot Milestones reached by an Enrollment.
 *
 * Fix:
 * - Does NOT write to Athlete Achievement Unlocks -> Unlock Key because it is a computed/formula field.
 * - Adds writable-field protection so computed fields are skipped safely.
 *
 * Required input variable:
 * - recordId = Airtable record ID from triggering Enrollment record
 ***************************************************************************************************/

// @ts-nocheck

async function main() {
  const CONFIG = {
    tables: {
      enrollments: "Enrollments",
      submissions: "Submissions",
      shotMilestones: "Shot Milestones",
      achievements: "Achievements",
      unlocks: "Athlete Achievement Unlocks",
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
      targetGoalShot: "Target Goal Shot",
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
      shotMilestone: "Shot Milestone",
      milestoneSourceKey: "Milestone Source Key",
      milestoneActivityDate: "Milestone Activity Date",
      xpAwardStatus: "XP Award Status",
      unlockKey: "Unlock Key",
      notes: "Notes",
    },

    statuses: {
      pending: "Pending",
    },
  };

  const fieldCache = new Map();

  function setOutputSafe(key, value) {
    try {
      output.set(key, value);
    } catch {
      // Ignore output errors.
    }
  }

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

    return fieldName;
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

  function getAvailableField(table, preferredName, fallbackName = null) {
    if (fieldExists(table, preferredName)) return preferredName;
    if (fallbackName && fieldExists(table, fallbackName)) return fallbackName;
    return null;
  }

  function fieldList(table, fieldNames) {
    return fieldNames.filter((fieldName) => fieldName && fieldExists(table, fieldName));
  }

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

  function getSingleSelectName(record, fieldName) {
    if (!fieldName) return "";

    const value = record.getCellValue(fieldName);

    return value?.name || "";
  }

  function getText(record, fieldName) {
    if (!fieldName) return "";

    return String(record.getCellValueAsString(fieldName) || "").trim();
  }

  function getNumber(record, fieldName) {
    if (!fieldName) return 0;

    const value = record.getCellValue(fieldName);

    if (typeof value === "number") {
      return value;
    }

    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];

      if (typeof first === "number") {
        return first;
      }

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
    if (!fieldName) return "";

    const linkedNames = getLinkedNames(record, fieldName);
    if (linkedNames.length > 0) return linkedNames[0];

    const singleSelectName = getSingleSelectName(record, fieldName);
    if (singleSelectName) return singleSelectName;

    return getText(record, fieldName);
  }

  function getDateValue(record, fieldName) {
    if (!fieldName) return null;

    const value = record.getCellValue(fieldName);

    if (!value) return null;

    if (value instanceof Date && !isNaN(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = new Date(value);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  function formatDateForNotes(dateValue) {
    if (!dateValue) return "No date";

    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function addIfWritable(table, payload, fieldName, value) {
    if (!fieldName || !fieldExists(table, fieldName)) {
      return;
    }

    if (!isWritableField(table, fieldName)) {
      console.log(`Skipped non-writable field: ${table.name} -> ${fieldName}`);
      return;
    }

    if (value === undefined) {
      return;
    }

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
    return `SHOT_MILESTONE|${enrollmentId}|${shotMilestoneId}`;
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

  const inputConfig = input.config();
  const recordId = String(inputConfig.recordId || "").trim();

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

  requireField(enrollmentsTable, CONFIG.enrollmentFields.gradeBand);
  requireField(enrollmentsTable, CONFIG.enrollmentFields.runCheck);

  requireField(submissionsTable, CONFIG.submissionFields.enrollment);
  requireField(submissionsTable, CONFIG.submissionFields.activityDate);
  requireField(submissionsTable, CONFIG.submissionFields.totalShotsCounted);

  requireField(shotMilestonesTable, CONFIG.shotMilestoneFields.gradeBand);
  requireField(shotMilestonesTable, CONFIG.shotMilestoneFields.milestoneShotCount);

  requireField(unlocksTable, CONFIG.unlockFields.enrollment);
  requireField(unlocksTable, CONFIG.unlockFields.achievement);
  requireField(unlocksTable, CONFIG.unlockFields.shotMilestone);
  requireField(unlocksTable, CONFIG.unlockFields.milestoneSourceKey);
  requireField(unlocksTable, CONFIG.unlockFields.milestoneActivityDate);

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

  try {
    const enrollmentId = enrollmentRecord.id;

    const enrollmentActive = fieldExists(enrollmentsTable, CONFIG.enrollmentFields.active)
      ? getBooleanish(enrollmentRecord, CONFIG.enrollmentFields.active, true)
      : true;

    if (!enrollmentActive) {
      await updateEnrollment(enrollmentsTable, enrollmentRecord, {
        [CONFIG.enrollmentFields.runCheck]: false,
      });

      setOutputSafe("result", "Skipped: Enrollment is not active.");
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

      setOutputSafe("result", "Skipped: Enrollment is missing Grade Band.");
      return;
    }

    const submissionQuery = await submissionsTable.selectRecordsAsync({
      fields: fieldList(submissionsTable, [
        CONFIG.submissionFields.enrollment,
        CONFIG.submissionFields.activityDate,
        CONFIG.submissionFields.totalShotsCounted,
      ]),
    });

    const enrollmentSubmissions = submissionQuery.records
      .filter((submission) => {
        const linkedEnrollmentIds = getLinkedIds(
          submission,
          CONFIG.submissionFields.enrollment
        );

        return linkedEnrollmentIds.includes(enrollmentId);
      })
      .map((submission) => {
        return {
          record: submission,
          activityDate: getDateValue(submission, CONFIG.submissionFields.activityDate),
          totalShotsCounted: getNumber(
            submission,
            CONFIG.submissionFields.totalShotsCounted
          ),
        };
      })
      .filter((submission) => {
        return submission.activityDate && submission.totalShotsCounted > 0;
      })
      .sort((a, b) => {
        const dateDiff = a.activityDate.getTime() - b.activityDate.getTime();
        if (dateDiff !== 0) return dateDiff;

        const createdA = a.record.createdTime
          ? new Date(a.record.createdTime).getTime()
          : 0;

        const createdB = b.record.createdTime
          ? new Date(b.record.createdTime).getTime()
          : 0;

        if (createdA !== createdB) return createdA - createdB;

        return a.record.id.localeCompare(b.record.id);
      });

    if (enrollmentSubmissions.length === 0) {
      await updateEnrollment(enrollmentsTable, enrollmentRecord, {
        [CONFIG.enrollmentFields.runCheck]: false,
      });

      setOutputSafe("result", "Skipped: No counted submissions with Activity Date found.");
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

      setOutputSafe("result", "Skipped: Calculated submission total is zero.");
      return;
    }

    const achievementNameField = getAvailableField(
      achievementsTable,
      CONFIG.achievementFields.name,
      CONFIG.achievementFields.fallbackName
    );

    if (!achievementNameField) {
      throw new Error("Achievements table is missing Achievement Name or Name field.");
    }

    requireField(achievementsTable, CONFIG.achievementFields.rewardRuleKey);

    const achievementQuery = await achievementsTable.selectRecordsAsync({
      fields: fieldList(achievementsTable, [
        achievementNameField,
        CONFIG.achievementFields.rewardRuleKey,
        CONFIG.achievementFields.active,
      ]),
    });

    const matchingAchievements = achievementQuery.records.filter((achievement) => {
      const achievementName = getText(achievement, achievementNameField);
      const rewardRuleKey = getText(achievement, CONFIG.achievementFields.rewardRuleKey);

      const active = fieldExists(achievementsTable, CONFIG.achievementFields.active)
        ? getBooleanish(achievement, CONFIG.achievementFields.active, true)
        : true;

      return (
        active &&
        (
          achievementName === CONFIG.achievementLookup.name ||
          rewardRuleKey === CONFIG.achievementLookup.rewardRuleKey
        )
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

    const unlockQuery = await unlocksTable.selectRecordsAsync({
      fields: fieldList(unlocksTable, [
        CONFIG.unlockFields.milestoneSourceKey,
        CONFIG.unlockFields.enrollment,
        CONFIG.unlockFields.shotMilestone,
        CONFIG.unlockFields.milestoneActivityDate,
      ]),
    });

    const existingUnlockBySourceKey = new Map();

    for (const unlock of unlockQuery.records) {
      const sourceKey = getText(unlock, CONFIG.unlockFields.milestoneSourceKey);

      if (sourceKey) {
        existingUnlockBySourceKey.set(sourceKey, unlock);
      }
    }

    const shotMilestoneQuery = await shotMilestonesTable.selectRecordsAsync({
      fields: fieldList(shotMilestonesTable, [
        CONFIG.shotMilestoneFields.label,
        CONFIG.shotMilestoneFields.gradeBand,
        CONFIG.shotMilestoneFields.milestonePercent,
        CONFIG.shotMilestoneFields.milestoneShotCount,
        CONFIG.shotMilestoneFields.pointsAwarded,
        CONFIG.shotMilestoneFields.active,
        CONFIG.shotMilestoneFields.uniqueKey,
      ]),
    });

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

    let createdCount = 0;
    let updatedExistingCount = 0;
    let skippedExistingCount = 0;
    let missingCrossingDateCount = 0;

    for (const milestone of eligibleMilestones) {
      const crossing = crossingByMilestoneId.get(milestone.record.id);

      if (!crossing || !crossing.activityDate) {
        missingCrossingDateCount += 1;
        continue;
      }

      const existingUnlock = existingUnlockBySourceKey.get(milestone.sourceKey);

      if (existingUnlock) {
        const existingActivityDate = getDateValue(
          existingUnlock,
          CONFIG.unlockFields.milestoneActivityDate
        );

        if (!existingActivityDate) {
          const updatePayload = {};

          addIfWritable(
            unlocksTable,
            updatePayload,
            CONFIG.unlockFields.milestoneActivityDate,
            crossing.activityDate
          );

          if (fieldExists(unlocksTable, CONFIG.unlockFields.notes)) {
            addIfWritable(
              unlocksTable,
              updatePayload,
              CONFIG.unlockFields.notes,
              [
                getText(existingUnlock, CONFIG.unlockFields.notes),
                `Updated by 066 v2.1. Milestone Activity Date set to ${formatDateForNotes(crossing.activityDate)}. Running total crossed ${milestone.shotCount} from ${crossing.beforeTotal} to ${crossing.afterTotal}. Crossing Submission: ${crossing.submissionRecordId}.`,
              ]
                .filter(Boolean)
                .join("\n")
            );
          }

          if (Object.keys(updatePayload).length > 0) {
            await unlocksTable.updateRecordAsync(existingUnlock.id, updatePayload);
            updatedExistingCount += 1;
          }
        } else {
          skippedExistingCount += 1;
        }

        continue;
      }

      const unlockPayload = {};

      addIfWritable(
        unlocksTable,
        unlockPayload,
        CONFIG.unlockFields.enrollment,
        [{ id: enrollmentId }]
      );

      addIfWritable(
        unlocksTable,
        unlockPayload,
        CONFIG.unlockFields.achievement,
        [{ id: shotMilestoneAchievement.id }]
      );

      addIfWritable(
        unlocksTable,
        unlockPayload,
        CONFIG.unlockFields.shotMilestone,
        [{ id: milestone.record.id }]
      );

      addIfWritable(
        unlocksTable,
        unlockPayload,
        CONFIG.unlockFields.milestoneSourceKey,
        milestone.sourceKey
      );

      /*
       * IMPORTANT:
       * Do NOT write CONFIG.unlockFields.unlockKey / "Unlock Key".
       * In this base it is a computed/formula field and Airtable will reject writes to it.
       */

      addIfWritable(
        unlocksTable,
        unlockPayload,
        CONFIG.unlockFields.milestoneActivityDate,
        crossing.activityDate
      );

      if (fieldExists(unlocksTable, CONFIG.unlockFields.xpAwardStatus)) {
        addIfWritable(
          unlocksTable,
          unlockPayload,
          CONFIG.unlockFields.xpAwardStatus,
          singleSelectValue(
            unlocksTable,
            CONFIG.unlockFields.xpAwardStatus,
            CONFIG.statuses.pending
          )
        );
      }

      addIfWritable(
        unlocksTable,
        unlockPayload,
        CONFIG.unlockFields.notes,
        [
          `Created by 066 v2.1.`,
          `Calculated total shots from Submissions: ${calculatedTotalShots}.`,
          `Enrollment reported total shots: ${enrollmentReportedTotalShots || 0}.`,
          `Milestone: ${milestone.label || milestone.shotCount}.`,
          `Milestone Shot Count: ${milestone.shotCount}.`,
          `Points Awarded: ${milestone.points}.`,
          `Milestone Activity Date: ${formatDateForNotes(crossing.activityDate)}.`,
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

    await updateEnrollment(enrollmentsTable, enrollmentRecord, {
      [CONFIG.enrollmentFields.runCheck]: false,
    });

    const resultMessage = [
      `066 complete.`,
      `Enrollment: ${enrollmentId}.`,
      `Grade Band: ${enrollmentGradeBand}.`,
      `Calculated Total Shots: ${calculatedTotalShots}.`,
      `Enrollment Reported Total Shots: ${enrollmentReportedTotalShots || 0}.`,
      `Eligible Milestones: ${eligibleMilestones.length}.`,
      `Created Unlocks: ${createdCount}.`,
      `Updated Existing Unlock Dates: ${updatedExistingCount}.`,
      `Skipped Existing Unlocks: ${skippedExistingCount}.`,
      `Missing Crossing Dates: ${missingCrossingDateCount}.`,
    ].join(" ");

    console.log(resultMessage);

    setOutputSafe("result", resultMessage);
    setOutputSafe("enrollmentId", enrollmentId);
    setOutputSafe("gradeBand", enrollmentGradeBand);
    setOutputSafe("calculatedTotalShots", calculatedTotalShots);
    setOutputSafe("enrollmentReportedTotalShots", enrollmentReportedTotalShots || 0);
    setOutputSafe("eligibleMilestones", eligibleMilestones.length);
    setOutputSafe("createdUnlocks", createdCount);
    setOutputSafe("updatedExistingUnlockDates", updatedExistingCount);
    setOutputSafe("skippedExistingUnlocks", skippedExistingCount);
    setOutputSafe("missingCrossingDates", missingCrossingDateCount);
    setOutputSafe("errorOut", "");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.log(`066 error: ${message}`);

    setOutputSafe("result", "Error");
    setOutputSafe("errorOut", message);
    setOutputSafe("enrollmentId", recordId);

    /*
     * Keep Run Shot Milestone Check? checked on error so the record remains visible for troubleshooting.
     */

    throw error;
  }
}

await main();

/*
Automation: 032 - Weekly Summary and Goal Logic - Link Challenge Goal Record to Weekly Athlete Summary
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

/************************************************************
 * 032 - WEEKLY SUMMARY AND GOAL LOGIC
 * Link Challenge Goal Record to Weekly Athlete Summary
 *
 * Version: v3.4
 * Date Written: 2026-05-27
 * Last Updated: 2026-08-13
 *
 * PURPOSE
 * - Runs from one Weekly Athlete Summary record.
 * - Reads the linked Enrollment and Grade Band.
 * - Derives Program Instance from the Enrollment (the authoritative season identity).
 * - Finds exactly one eligible Target Goal Shots record for that Program Instance + Grade Band.
 * - Validates an existing Goal Record rather than trusting a non-empty link.
 * - Matches Target Goal Shots by exact Program Instance + Grade Band, Active?, and
 *   an explicit numeric Total Shot Target; numeric zero remains an allowed configured value.
 * - Requires Target Goal Shots.Active? to be checked if that field exists.
 * - Writes the matching Target Goal Shots record into Weekly Athlete Summary → Goal Record.
 *
 * IMPORTANT DESIGN RULES
 * - Target Goal Shots are Program Instance-scoped goals, not weekly goals.
 * - Do NOT match Target Goal Shots by Week.
 * - Week may exist on Weekly Athlete Summary, but it is not used for goal matching.
 * - One active Target Goal Shots record with an explicit numeric target should exist
 *   per Program Instance + Grade Band; missing, malformed, and ambiguous configuration
 *   fails closed. Never select a first candidate.
 * - Do not create Target Goal Shots records here.
 * - Do not write to formula, lookup, rollup, or other read-only fields.
 *
 * FOLDER
 * - 03 - Weekly Summary and Goal Logic
 *
 * AUTOMATION NAME
 * - 032 - Weekly Summary and Goal Logic - Link Challenge Goal Record to Weekly Athlete Summary
 *
 * TRIGGER TABLE
 * - Weekly Athlete Summary
 *
 * TRIGGER TYPE
 * - When record enters view
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Enrollment and Grade Band are not empty
 * - Goal Record is empty
 * - Week is not empty
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId = Airtable record ID from the triggering Weekly Athlete Summary record
 *
 * TABLES USED
 * - Weekly Athlete Summary
 * - Target Goal Shots
 *
 * OUTPUTS
 * - ok
 * - weeklySummaryId
 * - gradeBandId
 * - Program Instance is verified internally from the authoritative Enrollment link.
 * - goalRecordId
 * - goalLabel
 * - matchCount
 * - actionTaken
 * - statusOut
 * - errorOut
 * - debugStep
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: CONFIG
========================================================= */

const CONFIG = {
  scriptName: "032 - Weekly Summary and Goal Logic - Link Challenge Goal Record to Weekly Athlete Summary",
  version: "v3.4",

  tables: {
    weeklySummary: "Weekly Athlete Summary",
    enrollments: "Enrollments",
    targetGoalShots: "Target Goal Shots",
  },

  weeklySummary: {
    week: "Week",
    enrollment: "Enrollment",
    gradeBand: "Grade Band",
    goalRecord: "Goal Record",
  },

  enrollments: {
    programInstance: "Program Instance",
  },

  targetGoalShots: {
    targetLabel: "Target Label",
    goalKey: "Goal Key",
    gradeBand: "Grade Band",
    programInstance: "Program Instance",
    totalShotTarget: "Total Shot Target",
    active: "Active?",
  },

  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },

  actions: {
    linkedGoalRecord: "linked_goal_record",
    alreadyLinked: "already_linked",
    skippedNoMatch: "skipped_no_matching_challenge_goal_record",
    errorDuplicateMatches: "error_duplicate_challenge_goal_records",
  },

  debug: {
    logToConsole: true,
    requireActiveGoalRecord: true,
  },
};

/* =========================================================
   SECTION 2: INPUTS
========================================================= */

const cfg = input.config();
const recordId = String(cfg.recordId || "").trim();

if (!recordId) {
  throw new Error("Missing required input: recordId");
}

/* =========================================================
   SECTION 3: TABLE REFERENCES
========================================================= */

const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const targetGoalShotsTable = base.getTable(CONFIG.tables.targetGoalShots);

/* =========================================================
   SECTION 4: HELPER FUNCTIONS
========================================================= */

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

function fieldExists(table, fieldName) {
  if (!table || !fieldName) return false;

  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
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

function requireField(table, fieldName, label) {
  if (!fieldExists(table, fieldName)) {
    throw new Error(`Missing required field: ${label} (${table.name} -> ${fieldName})`);
  }
}

function requireWritableField(table, fieldName, label) {
  requireField(table, fieldName, label);

  if (!isWritableField(table, fieldName)) {
    throw new Error(`Required field is not writable: ${label} (${table.name} -> ${fieldName})`);
  }
}

function getRaw(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getBooleanish(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (raw === true) return true;
  if (raw === false) return false;
  if (raw === 1) return true;
  if (raw === 0) return false;

  const text = String(raw ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "checked", "active"].includes(text);
}

function getLinkedRecordIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (!Array.isArray(raw)) return [];

  return raw
    .map(item => item?.id)
    .filter(Boolean);
}

function getFirstLinkedRecordId(record, table, fieldName) {
  const ids = getLinkedRecordIds(record, table, fieldName);
  return ids[0] || "";
}

function getExactlyOneLinkedRecordId(record, table, fieldName, label) {
  const ids = [...new Set(getLinkedRecordIds(record, table, fieldName))];
  if (ids.length !== 1) {
    throw new Error(`${label} must have exactly one ${fieldName} link; found ${ids.length}.`);
  }
  return ids[0];
}

function hasExplicitNumericTarget(record) {
  const value = getRaw(record, targetGoalShotsTable, CONFIG.targetGoalShots.totalShotTarget);
  if (value === null || value === undefined || value === "") return false;
  return Number.isFinite(typeof value === "number" ? value : Number(String(value).replace(/,/g, "")));
}

async function updateRecordSafe(table, targetRecordId, updates) {
  const safeUpdates = {};

  for (const [fieldName, value] of Object.entries(updates || {})) {
    if (!fieldExists(table, fieldName)) {
      log(`Skipped missing field: ${table.name}.${fieldName}`);
      continue;
    }

    if (!isWritableField(table, fieldName)) {
      log(`Skipped non-writable field: ${table.name}.${fieldName}`);
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    safeUpdates[fieldName] = value;
  }

  if (Object.keys(safeUpdates).length === 0) {
    return [];
  }

  await table.updateRecordAsync(targetRecordId, safeUpdates);
  return Object.keys(safeUpdates);
}

function buildTargetGoalFieldsToLoad() {
  return [
    CONFIG.targetGoalShots.targetLabel,
    CONFIG.targetGoalShots.goalKey,
    CONFIG.targetGoalShots.gradeBand,
    CONFIG.targetGoalShots.programInstance,
    CONFIG.targetGoalShots.totalShotTarget,
    CONFIG.targetGoalShots.active,
  ].filter(fieldName => fieldExists(targetGoalShotsTable, fieldName));
}

function setFinalOutputs({
  ok,
  weeklySummaryId,
  gradeBandId,
  goalRecordId,
  goalLabel,
  matchCount,
  actionTaken,
  statusOut,
  errorOut,
  debugStep,
}) {
  setOutputSafe("ok", ok);
  setOutputSafe("weeklySummaryId", weeklySummaryId || recordId);
  setOutputSafe("gradeBandId", gradeBandId || "");
  setOutputSafe("goalRecordId", goalRecordId || "");
  setOutputSafe("goalLabel", goalLabel || "");
  setOutputSafe("matchCount", matchCount || 0);
  setOutputSafe("actionTaken", actionTaken || "");
  setOutputSafe("statusOut", statusOut || "");
  setOutputSafe("errorOut", errorOut || "");
  setOutputSafe("debugStep", debugStep || "");
}

/* =========================================================
   SECTION 5: FIELD VALIDATION
========================================================= */

requireField(
  weeklySummaryTable,
  CONFIG.weeklySummary.week,
  "Weekly Athlete Summary -> Week"
);

requireField(
  weeklySummaryTable,
  CONFIG.weeklySummary.enrollment,
  "Weekly Athlete Summary -> Enrollment"
);

requireField(
  weeklySummaryTable,
  CONFIG.weeklySummary.gradeBand,
  "Weekly Athlete Summary -> Grade Band"
);

requireWritableField(
  weeklySummaryTable,
  CONFIG.weeklySummary.goalRecord,
  "Weekly Athlete Summary -> Goal Record"
);

requireField(
  targetGoalShotsTable,
  CONFIG.targetGoalShots.gradeBand,
  "Target Goal Shots -> Grade Band"
);

requireField(
  targetGoalShotsTable,
  CONFIG.targetGoalShots.programInstance,
  "Target Goal Shots -> Program Instance"
);

requireField(
  enrollmentsTable,
  CONFIG.enrollments.programInstance,
  "Enrollments -> Program Instance"
);

requireField(
  targetGoalShotsTable,
  CONFIG.targetGoalShots.totalShotTarget,
  "Target Goal Shots -> Total Shot Target"
);

if (
  CONFIG.debug.requireActiveGoalRecord &&
  fieldExists(targetGoalShotsTable, CONFIG.targetGoalShots.active)
) {
  requireField(
    targetGoalShotsTable,
    CONFIG.targetGoalShots.active,
    "Target Goal Shots -> Active?"
  );
}

/* =========================================================
   SECTION 6: MAIN
========================================================= */

async function main() {
  let debugStep = "Start";

  let enrollmentId = "";
  let programInstanceId = "";
  let gradeBandId = "";
  let goalRecordId = "";
  let goalLabel = "";
  let matchCount = 0;
  let actionTaken = "";

  try {
    debugStep = "1 - Validate recordId";
    setOutputSafe("debugStep", debugStep);

    if (!recordId.startsWith("rec")) {
      throw new Error(`Invalid Weekly Athlete Summary recordId input: ${recordId}`);
    }

    debugStep = "2 - Load Weekly Athlete Summary";
    setOutputSafe("debugStep", debugStep);

    const summaryRecord = await weeklySummaryTable.selectRecordAsync(recordId);

    if (!summaryRecord) {
      setFinalOutputs({
        ok: false,
        weeklySummaryId: recordId,
        actionTaken: "summary_not_found",
        statusOut: CONFIG.statuses.error,
        errorOut: `Weekly Athlete Summary record not found: ${recordId}`,
        debugStep,
      });
      return;
    }

    debugStep = "3 - Read Weekly Summary Links";
    setOutputSafe("debugStep", debugStep);

    const weekId = getExactlyOneLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.week,
      `Weekly Athlete Summary ${recordId}`
    );

    enrollmentId = getExactlyOneLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.enrollment,
      `Weekly Athlete Summary ${recordId}`
    );

    gradeBandId = getExactlyOneLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.gradeBand,
      `Weekly Athlete Summary ${recordId}`
    );

    const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId);
    if (!enrollmentRecord) {
      throw new Error(`Enrollment not found for Weekly Athlete Summary ${recordId}: ${enrollmentId}`);
    }
    programInstanceId = getExactlyOneLinkedRecordId(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.programInstance,
      `Enrollment ${enrollmentId}`
    );

    const existingGoalRecordIds = getLinkedRecordIds(
      summaryRecord, weeklySummaryTable, CONFIG.weeklySummary.goalRecord
    );
    const existingGoalRecordId = existingGoalRecordIds.length
      ? getExactlyOneLinkedRecordId(
        summaryRecord, weeklySummaryTable, CONFIG.weeklySummary.goalRecord,
        `Weekly Athlete Summary ${recordId}`
      )
      : "";

    log("032 input", {
      recordId,
      weekId,
      enrollmentId,
      programInstanceId,
      gradeBandId,
      existingGoalRecordId,
      matchingRule: "Program Instance + Grade Band + Active. Week is not used.",
    });

    debugStep = "4 - Validate Weekly Summary State";
    setOutputSafe("debugStep", debugStep);

    debugStep = "5 - Load Target Goal Shots";
    setOutputSafe("debugStep", debugStep);

    const goalsQuery = await targetGoalShotsTable.selectRecordsAsync({
      fields: buildTargetGoalFieldsToLoad(),
    });

    debugStep = "6 - Find Matching Challenge Goal Record";
    setOutputSafe("debugStep", debugStep);

    const matchingGoals = goalsQuery.records.filter(goalRecord => {
      const goalGradeBandIds = getLinkedRecordIds(
        goalRecord,
        targetGoalShotsTable,
        CONFIG.targetGoalShots.gradeBand
      );

      if (goalGradeBandIds.length !== 1 || goalGradeBandIds[0] !== gradeBandId) {
        return false;
      }

      const goalProgramInstanceIds = getLinkedRecordIds(
        goalRecord,
        targetGoalShotsTable,
        CONFIG.targetGoalShots.programInstance
      );
      if (
        goalProgramInstanceIds.length !== 1 ||
        goalProgramInstanceIds[0] !== programInstanceId
      ) {
        return false;
      }

      if (
        CONFIG.debug.requireActiveGoalRecord &&
        fieldExists(targetGoalShotsTable, CONFIG.targetGoalShots.active)
      ) {
        if (!getBooleanish(
          goalRecord,
          targetGoalShotsTable,
          CONFIG.targetGoalShots.active
        )) return false;
      }

      return hasExplicitNumericTarget(goalRecord);
    });

    matchCount = matchingGoals.length;

    if (existingGoalRecordId) {
      if (matchCount !== 1 || matchingGoals[0].id !== existingGoalRecordId) {
        throw new Error(
          `Existing Goal Record ${existingGoalRecordId} is not the one eligible active configured goal for Program Instance ${programInstanceId} + Grade Band ${gradeBandId}.`
        );
      }
      goalRecordId = existingGoalRecordId;
      actionTaken = CONFIG.actions.alreadyLinked;
      setFinalOutputs({
        ok: true, weeklySummaryId: recordId, gradeBandId, goalRecordId,
        goalLabel: getText(matchingGoals[0], targetGoalShotsTable, CONFIG.targetGoalShots.targetLabel),
        matchCount, actionTaken, statusOut: CONFIG.statuses.skipped, errorOut: "",
        debugStep: "Done - Existing goal validated",
      });
      return;
    }

    if (matchCount === 0) {
      actionTaken = CONFIG.actions.skippedNoMatch;

      setFinalOutputs({
        ok: true,
        weeklySummaryId: recordId,
        gradeBandId,
        goalRecordId: "",
        goalLabel: "",
        matchCount,
        actionTaken,
        statusOut: CONFIG.statuses.skipped,
        errorOut: "No active Target Goal Shots record found for this Program Instance + Grade Band.",
        debugStep,
      });

      log("032 skipped: no matching Program Instance-scoped Target Goal Shots record", {
        recordId,
        programInstanceId,
        gradeBandId,
      });

      return;
    }

    if (matchCount > 1) {
      const duplicateIds = matchingGoals.map(record => record.id).join(", ");

      actionTaken = CONFIG.actions.errorDuplicateMatches;

      throw new Error(
        `Multiple active Target Goal Shots records found for Program Instance ${programInstanceId} + Grade Band ${gradeBandId}. Record IDs: ${duplicateIds}`
      );
    }

    const matchedGoal = matchingGoals[0];
    goalRecordId = matchedGoal.id;

    goalLabel =
      getText(matchedGoal, targetGoalShotsTable, CONFIG.targetGoalShots.targetLabel) ||
      getText(matchedGoal, targetGoalShotsTable, CONFIG.targetGoalShots.goalKey) ||
      matchedGoal.name ||
      goalRecordId;

    debugStep = "7 - Write Goal Record Link";
    setOutputSafe("debugStep", debugStep);

    const updatedFields = await updateRecordSafe(weeklySummaryTable, recordId, {
      [CONFIG.weeklySummary.goalRecord]: [{ id: goalRecordId }],
    });

    actionTaken = CONFIG.actions.linkedGoalRecord;

    debugStep = "8 - Outputs";
    setOutputSafe("debugStep", debugStep);

    setFinalOutputs({
      ok: true,
      weeklySummaryId: recordId,
      gradeBandId,
      goalRecordId,
      goalLabel,
      matchCount,
      actionTaken,
      statusOut: CONFIG.statuses.success,
      errorOut: "",
      debugStep,
    });

    log("032 completed", {
      scriptName: CONFIG.scriptName,
      version: CONFIG.version,
      recordId,
      enrollmentId,
      programInstanceId,
      gradeBandId,
      goalRecordId,
      goalLabel,
      updatedFields,
      actionTaken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    setFinalOutputs({
      ok: false,
      weeklySummaryId: recordId,
      gradeBandId,
      goalRecordId,
      goalLabel,
      matchCount,
      actionTaken: actionTaken || "error",
      statusOut: CONFIG.statuses.error,
      errorOut: message,
      debugStep: `FAILED AT: ${debugStep}`,
    });

    log("032 failed", {
      scriptName: CONFIG.scriptName,
      version: CONFIG.version,
      recordId,
      debugStep,
      error: message,
      gradeBandId,
    });

    throw error;
  }
}

/* =========================================================
   SECTION 7: RUN
========================================================= */

await main();

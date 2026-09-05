/*
Automation: 122 - Achievements and Milestones - Stamp Goal Met Date
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: (not installed)

Purpose:
Stamps Enrollments.Goal Met Date with the FIRST Activity Date where cumulative
counted shots cross Target Goal Shots. Never overwrites an existing date.

Trigger:
Enrollments when Goal Met? is not empty AND Goal Met Date is empty
(after Goal Met Date is converted from lookup → date). Optional manual re-run
via Run Goal Met Date Check? if that checkbox is installed.

Important Tables:
Enrollments, Submissions

Important Fields:
Goal Met?, Goal Met Date, Target Goal Shots, Total Shots Counted,
Activity Date, Count This Submission?

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Requires Mike schema change: Goal Met Date lookup → writable date (see
docs/deploy-checklists/SC-163-goal-met-date.md). Do not claim live-complete
until installed.
*/

/************************************************************
 * 122 - ACHIEVEMENTS AND MILESTONES
 * Stamp Goal Met Date
 *
 * Version: v1.0
 * Date Written: 2026-09-05
 * Last Updated: 2026-09-05
 *
 * PURPOSE
 * - Runs from one Enrollment record.
 * - When Goal Met? is true (or counted shots >= Target Goal Shots) and
 *   Goal Met Date is blank, writes the first provable Activity Date from
 *   counted Submissions where the cumulative Total Shots Counted crosses
 *   the Target Goal Shots line.
 * - Never invents a date. Never overwrites an existing Goal Met Date.
 * - Stable if later rollups change (totals drop below target keeps the date).
 *
 * IMPORTANT DESIGN RULES
 * - Authority for "met" is the same line as Goal Met?: counted shots vs target.
 * - Authority for the date is submission Activity Date order (America/Denver),
 *   matching Automation 066 milestone-crossing chronology.
 * - Award Recipients.Date Awarded is fulfillment (Conquered Goal), not this field.
 * - If Goal Met Date is still a lookup / non-writable, skip without error so
 *   pre-schema installs do not break.
 * - Retry-safe: blank → write once; subsequent runs skip_already_set.
 *
 * THIS IS NOT
 * - Conquered Goal award creation / gift-card fulfillment.
 * - Shot milestone unlocks (066) or XP writers.
 * - Perfect Week / Automation 021 / 013 / 067.
 *
 * FOLDER
 * - 06 - Achievements and Milestones
 *
 * AUTOMATION NAME
 * - 122 - Achievements and Milestones - Stamp Goal Met Date
 *
 * TRIGGER TABLE
 * - Enrollments
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Goal Met? is not empty
 * - Goal Met Date is empty
 *
 * OPTIONAL TRIGGER CONDITIONS
 * - Run Goal Met Date Check? is checked (if checkbox installed)
 * - Active? is checked
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Enrollment record ID
 *
 * OUTPUTS
 * - statusOut = success | skipped | error
 * - actionOut = updated | skipped_already_set | skipped_not_met | skipped_unprovable |
 *   skipped_inactive | skipped_field_not_writable | skipped_no_target | error
 * - errorOut
 * - debugStep
 * - enrollmentIdOut
 * - goalMetDateOut
 * - crossingSubmissionIdOut
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "122 - Achievements and Milestones - Stamp Goal Met Date",
  version: "v1.0",
  versionDate: "2026-09-05",
  originalWrittenDate: "2026-09-05",
  lastUpdated: "2026-09-05",
  folder: "06 - Achievements and Milestones",
  automationName: "122 - Achievements and Milestones - Stamp Goal Met Date",
};

/* =========================================================
   SECTION 2 — CONFIGURATION
========================================================= */

const CONFIG = {
  timeZone: "America/Denver",

  tables: {
    enrollments: "Enrollments",
    submissions: "Submissions",
  },

  enrollmentFields: {
    active: "Active?",
    goalMet: "Goal Met?",
    goalMetDate: "Goal Met Date",
    targetGoalShots: "Target Goal Shots",
    totalShotsCounted: "Total Shots Counted",
    runCheck: "Run Goal Met Date Check?",
  },

  submissionFields: {
    enrollment: "Enrollment",
    activityDate: "Activity Date",
    totalShotsCounted: "Total Shots Counted",
    countThisSubmission: "Count This Submission?",
  },

  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },

  actions: {
    updated: "updated",
    skippedAlreadySet: "skipped_already_set",
    skippedNotMet: "skipped_not_met",
    skippedUnprovable: "skipped_unprovable",
    skippedInactive: "skipped_inactive",
    skippedFieldNotWritable: "skipped_field_not_writable",
    skippedNoTarget: "skipped_no_target",
    error: "error",
  },
};

/* =========================================================
   SECTION 3 — OUTPUT HELPERS
========================================================= */

function setOutputSafe(key, value) {
  try {
    if (typeof output !== "undefined" && output && typeof output.set === "function") {
      output.set(key, value == null ? "" : value);
    }
  } catch (_err) {
    // ignore missing output bindings in local harnesses
  }
}

function setSkippedOutputs(payload) {
  setOutputSafe("statusOut", CONFIG.statuses.skipped);
  setOutputSafe("actionOut", payload.actionOut || "");
  setOutputSafe("errorOut", payload.errorOut || "");
  setOutputSafe("debugStep", payload.debugStep || "");
  setOutputSafe("enrollmentIdOut", payload.enrollmentId || "");
  setOutputSafe("goalMetDateOut", payload.goalMetDateOut || "");
  setOutputSafe("crossingSubmissionIdOut", payload.crossingSubmissionIdOut || "");
}

/* =========================================================
   SECTION 4 — SCHEMA HELPERS
========================================================= */

function fieldExists(table, fieldName) {
  if (!table || !fieldName) return false;
  try {
    table.getField(fieldName);
    return true;
  } catch (_err) {
    return false;
  }
}

function isWritableField(table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  try {
    const field = table.getField(fieldName);
    if (field.isComputed) return false;
    const type = String(field.type || "");
    return type === "date" || type === "dateTime";
  } catch (_err) {
    return false;
  }
}

function fieldList(table, names) {
  return names.filter((name) => fieldExists(table, name));
}

function requireField(table, fieldName) {
  if (!fieldExists(table, fieldName)) {
    throw new Error(`Missing required field "${fieldName}" on ${table.name}.`);
  }
}

/* =========================================================
   SECTION 5 — DATA HELPERS
========================================================= */

function getLinkedIds(record, fieldName) {
  if (!fieldName) return [];
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.id).filter(Boolean);
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
  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "checked", "active"].includes(text);
}

function coerceDate(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function getDateValue(record, fieldName) {
  if (!fieldName) return null;
  const value = record.getCellValue(fieldName);
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = coerceDate(item);
      if (parsed) return parsed;
    }
    return null;
  }
  return coerceDate(value);
}

function goalMetTruthy(record, fieldName) {
  const text = getText(record, fieldName);
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower !== "false" && lower !== "0" && lower !== "no";
}

function toDenverDateKey(value, timeZone = CONFIG.timeZone) {
  if (!value) return "";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function findFirstGoalMetCrossing(submissions, targetGoalShots) {
  const target = Number(targetGoalShots);
  if (!Number.isFinite(target) || target <= 0) return null;
  let runningTotal = 0;
  for (const submission of submissions) {
    const shots = Number(submission.totalShotsCounted) || 0;
    if (shots <= 0 || !(submission.activityDate instanceof Date)) continue;
    const beforeTotal = runningTotal;
    runningTotal += shots;
    if (beforeTotal < target && runningTotal >= target) {
      return {
        date: submission.activityDate,
        dateKey: toDenverDateKey(submission.activityDate),
        submissionId: submission.record.id,
        beforeTotal,
        afterTotal: runningTotal,
        submissionShots: shots,
      };
    }
  }
  return null;
}

function readTriggerRecordId() {
  const cfg = input.config();
  const recordId = String(cfg.recordId || "").trim();
  if (!recordId || !recordId.startsWith("rec")) {
    throw new Error(
      'Invalid or missing input "recordId". Map the triggering Enrollment record ID dynamically.'
    );
  }
  return recordId;
}

/* =========================================================
   SECTION 6 — MAIN
========================================================= */

async function main() {
  let debugStep = "0 - Start";
  setOutputSafe("debugStep", debugStep);

  debugStep = "1 - Validate recordId";
  setOutputSafe("debugStep", debugStep);
  const recordId = readTriggerRecordId();

  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);

  debugStep = "2 - Validate schema";
  setOutputSafe("debugStep", debugStep);
  requireField(enrollmentsTable, CONFIG.enrollmentFields.goalMet);
  requireField(enrollmentsTable, CONFIG.enrollmentFields.goalMetDate);
  requireField(enrollmentsTable, CONFIG.enrollmentFields.targetGoalShots);
  requireField(submissionsTable, CONFIG.submissionFields.enrollment);
  requireField(submissionsTable, CONFIG.submissionFields.activityDate);
  requireField(submissionsTable, CONFIG.submissionFields.totalShotsCounted);
  requireField(submissionsTable, CONFIG.submissionFields.countThisSubmission);

  if (!isWritableField(enrollmentsTable, CONFIG.enrollmentFields.goalMetDate)) {
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedFieldNotWritable,
      errorOut:
        "Skipped: Goal Met Date is not a writable date/dateTime field. Convert lookup → date first (SC-163 checklist).",
      debugStep,
      enrollmentId: recordId,
    });
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.skipped,
        actionOut: CONFIG.actions.skippedFieldNotWritable,
        enrollmentId: recordId,
      })
    );
    return;
  }

  debugStep = "3 - Load Enrollment";
  setOutputSafe("debugStep", debugStep);
  const enrollmentFieldsToLoad = fieldList(enrollmentsTable, [
    CONFIG.enrollmentFields.active,
    CONFIG.enrollmentFields.goalMet,
    CONFIG.enrollmentFields.goalMetDate,
    CONFIG.enrollmentFields.targetGoalShots,
    CONFIG.enrollmentFields.totalShotsCounted,
    CONFIG.enrollmentFields.runCheck,
  ]);

  const enrollmentRecord = await enrollmentsTable.selectRecordAsync(recordId, {
    fields: enrollmentFieldsToLoad,
  });
  if (!enrollmentRecord) {
    throw new Error(`Enrollment record not found: ${recordId}`);
  }
  const enrollmentId = enrollmentRecord.id;

  const enrollmentActive = fieldExists(enrollmentsTable, CONFIG.enrollmentFields.active)
    ? getBooleanish(enrollmentRecord, CONFIG.enrollmentFields.active, true)
    : true;
  if (!enrollmentActive) {
    await clearOptionalRunCheck(enrollmentsTable, enrollmentRecord);
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedInactive,
      errorOut: "Skipped: Enrollment is not active.",
      debugStep,
      enrollmentId,
    });
    return;
  }

  const existingDate = getDateValue(enrollmentRecord, CONFIG.enrollmentFields.goalMetDate);
  if (existingDate) {
    await clearOptionalRunCheck(enrollmentsTable, enrollmentRecord);
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedAlreadySet,
      errorOut: "",
      debugStep,
      enrollmentId,
      goalMetDateOut: toDenverDateKey(existingDate),
    });
    return;
  }

  const target = getNumber(enrollmentRecord, CONFIG.enrollmentFields.targetGoalShots);
  if (!target || target <= 0) {
    await clearOptionalRunCheck(enrollmentsTable, enrollmentRecord);
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedNoTarget,
      errorOut: "Skipped: Target Goal Shots is missing or zero.",
      debugStep,
      enrollmentId,
    });
    return;
  }

  const reportedTotal = getNumber(enrollmentRecord, CONFIG.enrollmentFields.totalShotsCounted);
  const goalMetNow =
    goalMetTruthy(enrollmentRecord, CONFIG.enrollmentFields.goalMet) || reportedTotal >= target;

  if (!goalMetNow) {
    await clearOptionalRunCheck(enrollmentsTable, enrollmentRecord);
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedNotMet,
      errorOut: "",
      debugStep,
      enrollmentId,
    });
    return;
  }

  debugStep = "4 - Load counted submissions";
  setOutputSafe("debugStep", debugStep);
  const submissionQuery = await submissionsTable.selectRecordsAsync({
    fields: fieldList(submissionsTable, [
      CONFIG.submissionFields.enrollment,
      CONFIG.submissionFields.activityDate,
      CONFIG.submissionFields.totalShotsCounted,
      CONFIG.submissionFields.countThisSubmission,
    ]),
  });

  const enrollmentSubmissions = submissionQuery.records
    .filter((submission) =>
      getLinkedIds(submission, CONFIG.submissionFields.enrollment).includes(enrollmentId)
    )
    .map((submission) => ({
      record: submission,
      activityDate: getDateValue(submission, CONFIG.submissionFields.activityDate),
      totalShotsCounted: getNumber(submission, CONFIG.submissionFields.totalShotsCounted),
      countThisSubmission: getBooleanish(
        submission,
        CONFIG.submissionFields.countThisSubmission,
        false
      ),
    }))
    .filter(
      (submission) =>
        submission.countThisSubmission &&
        submission.activityDate &&
        submission.totalShotsCounted > 0
    )
    .sort((a, b) => {
      const dateDiff = a.activityDate.getTime() - b.activityDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      const createdA = a.record.createdTime ? new Date(a.record.createdTime).getTime() : 0;
      const createdB = b.record.createdTime ? new Date(b.record.createdTime).getTime() : 0;
      if (createdA !== createdB) return createdA - createdB;
      return a.record.id.localeCompare(b.record.id);
    });

  if (typeof submissionQuery.unloadData === "function") {
    submissionQuery.unloadData();
  }

  debugStep = "5 - Compute first crossing";
  setOutputSafe("debugStep", debugStep);
  const crossing = findFirstGoalMetCrossing(enrollmentSubmissions, target);
  if (!crossing || !crossing.dateKey) {
    await clearOptionalRunCheck(enrollmentsTable, enrollmentRecord);
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedUnprovable,
      errorOut:
        "Skipped: Goal Met? is true but no Activity Date crossing can be proven from counted submissions.",
      debugStep,
      enrollmentId,
    });
    return;
  }

  debugStep = "6 - Recheck blank then write";
  setOutputSafe("debugStep", debugStep);
  const recheck = await enrollmentsTable.selectRecordAsync(enrollmentId, {
    fields: fieldList(enrollmentsTable, [CONFIG.enrollmentFields.goalMetDate, CONFIG.enrollmentFields.runCheck]),
  });
  const recheckExisting = recheck
    ? getDateValue(recheck, CONFIG.enrollmentFields.goalMetDate)
    : existingDate;
  if (recheckExisting) {
    await clearOptionalRunCheck(enrollmentsTable, recheck || enrollmentRecord);
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedAlreadySet,
      errorOut: "",
      debugStep,
      enrollmentId,
      goalMetDateOut: toDenverDateKey(recheckExisting),
      crossingSubmissionIdOut: crossing.submissionId,
    });
    return;
  }

  const updateFields = {
    [CONFIG.enrollmentFields.goalMetDate]: crossing.date,
  };
  if (fieldExists(enrollmentsTable, CONFIG.enrollmentFields.runCheck)) {
    try {
      const runField = enrollmentsTable.getField(CONFIG.enrollmentFields.runCheck);
      if (!runField.isComputed) {
        updateFields[CONFIG.enrollmentFields.runCheck] = false;
      }
    } catch (_err) {
      // optional checkbox
    }
  }

  await enrollmentsTable.updateRecordAsync(enrollmentId, updateFields);

  setOutputSafe("statusOut", CONFIG.statuses.success);
  setOutputSafe("actionOut", CONFIG.actions.updated);
  setOutputSafe("errorOut", "");
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("enrollmentIdOut", enrollmentId);
  setOutputSafe("goalMetDateOut", crossing.dateKey);
  setOutputSafe("crossingSubmissionIdOut", crossing.submissionId);

  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.success,
        actionOut: CONFIG.actions.updated,
        enrollmentId,
        goalMetDate: crossing.dateKey,
        crossingSubmissionId: crossing.submissionId,
        beforeTotal: crossing.beforeTotal,
        afterTotal: crossing.afterTotal,
        target,
        reportedTotal,
      },
      null,
      2
    )
  );
}

async function clearOptionalRunCheck(enrollmentsTable, enrollmentRecord) {
  if (!fieldExists(enrollmentsTable, CONFIG.enrollmentFields.runCheck)) return;
  try {
    const runField = enrollmentsTable.getField(CONFIG.enrollmentFields.runCheck);
    if (runField.isComputed) return;
    await enrollmentsTable.updateRecordAsync(enrollmentRecord.id, {
      [CONFIG.enrollmentFields.runCheck]: false,
    });
  } catch (_err) {
    // optional checkbox
  }
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
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: CONFIG.statuses.error,
      errorOut: message,
    })
  );
  throw error;
}

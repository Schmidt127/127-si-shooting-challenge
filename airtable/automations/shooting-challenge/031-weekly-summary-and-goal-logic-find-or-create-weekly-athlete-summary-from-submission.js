/*
Automation: 031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-20
Last GitHub Update: 2026-08-12

Purpose:
Finds the unique canonical Weekly Athlete Summary for counted submissions,
repairs orphan XP links, and arms Automation 076 only after final validation.

Trigger:
Submissions when Count This Submission? is checked and Weekly Athlete Summary is empty,
or a controlled rerun/repair targets an existing stale Weekly Athlete Summary link.

Important Tables:
Submissions, Enrollments, Weeks, Weekly Athlete Summary, XP Events

Important Fields:
Enrollment, Week, Weekly Athlete Summary, Count This Submission?, Submission Stat Mode,
Build Daily Email Now?, Summary Key, XP Source

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************
 * 031 - WEEKLY SUMMARY AND GOAL LOGIC
 * Resolve Canonical Weekly Athlete Summary from Submission
 *
 * Version: v4.0
 * Date Written: 2026-05-20
 * Last Updated: 2026-08-12
 * Updated Reason: Restore authoritative Weekly Athlete Summary find-or-create behavior
 * when no fully valid canonical summary exists, while preserving formula-backed
 * readiness inputs, strict writable-checkbox validation, and post-create concurrency
 * revalidation before arming Build Daily Email Now?;
 * canonical summary resolution, eligible XP-link repair, and final summary validation.
 *
 * PURPOSE
 * - Runs from one counted Submission record.
 * - Verifies the Submission has Enrollment and Week links.
 * - Builds the target Summary Key from Enrollment Key + Week Key.
 * - Validates any pre-existing Submission -> Weekly Athlete Summary link against the
 *   current Submission Enrollment + Week + Summary Key.
 * - Finds exactly one fully valid matching Weekly Athlete Summary record.
 * - Fails closed when zero or multiple fully valid candidates exist; it never creates one.
 * - Links the Submission to the Weekly Athlete Summary.
 * - Links the Weekly Athlete Summary back to the Submission.
 * - Repairs matching XP Events for the same Enrollment + Week when they are missing a
 *   summary or still linked to the stale summary being repaired.
 * - Automation 031 is the sole owner that checks Submissions.Build Daily Email Now? = true.
 * - Automation 076 consumes and clears Build Daily Email Now? after queue create/reuse.
 * - Submission XP may remain pending; Automation 010 retains ownership of Submission Base
 *   XP Events and 031 continues to exclude them from summary-link repair.
 *
 * IMPORTANT DESIGN RULES
 * - Weekly Athlete Summary is the weekly reporting / rollup table.
 * - Weekly Athlete Summary.Summary Key is a formula field and must NOT be written by script.
 * - Enrollments.Enrollment Key is a formula field and must NOT be written by script.
 * - Weeks.Week Key is a formula field and must NOT be written by script.
 * - One Enrollment + one Week should create exactly one Weekly Athlete Summary record.
 * - Multiple counted Submissions for the same Enrollment + Week should link to the same Weekly Athlete Summary.
 * - A stale existing Weekly Athlete Summary link must not survive replay when the script can
 *   prove the one canonical Enrollment + Week summary; otherwise fail closed.
 * - Automation 031 repairs only non-Submission-Base XP Event summary links. Automation 010
 *   owns Submission Base XP Events, identified by XP Source option ID selZw4nOkwMJCgGyR.
 *
 * FOLDER
 * - 03 - Weekly Summary and Goal Logic
 *
 * AUTOMATION NAME
 * - 031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission
 *
 * TRIGGER TABLE
 * - Submissions
 *
 * TRIGGER TYPE
 * - When record enters view
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Activity Date is not empty
 * - Week is not empty
 * - Enrollment is not empty
 * - Count This Submission? = 1
 * - Weekly Athlete Summary is empty OR the automation is run in a controlled repair flow
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId = Airtable record ID from the triggering Submission record
 *
 * OUTPUTS
 * - statusOut = created | found | skipped | error
 * - actionOut = created_canonical_summary | found_existing_summary |
 *   repaired_stale_summary_link | skipped_* | error
 * - readinessOut = set | unchanged | error
 * - errorOut
 * - debugStep
 * - ok
 * - recordId
 * - weeklySummaryId
 * - summaryKeyOut
 * - weekId
 * - weekName
 * - actionTaken
 * - orphanXpLinkedCount
 ************************************************************/

/// <reference path="../../Welcome Email/airtable-automation-script.d.ts" />
// @ts-nocheck

/* =========================================================
   SECTION 1: CONFIG
========================================================= */

const CONFIG = {
  scriptName:
    "031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission",
  version: "v4.0",

  tables: {
    submissions: "Submissions",
    enrollments: "Enrollments",
    weeks: "Weeks",
    summaries: "Weekly Athlete Summary",
    xpEvents: "XP Events",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    activityDate: "Activity Date",
    weeklySummary: "Weekly Athlete Summary",
    countThisSubmission: "Count This Submission?",
    submissionStatMode: "Submission Stat Mode",
    buildDailyEmailNow: "Build Daily Email Now?",
  },

  enrollments: {
    enrollmentKey: "Enrollment Key",
    programInstance: "Program Instance",
  },

  weeks: {
    weekKey: "Week Key",
    weekName: "Week Name",
    programInstance: "Program Instance",
  },

  summaries: {
    summaryKey: "Summary Key",
    enrollment: "Enrollment",
    week: "Week",
    submissions: "Submissions",
    summaryCalculationStatus: "Summary Calculation Status",
    created: "Created", // formula/read-only
  },

  xpEvents: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    xpSource: "XP Source",
    submissionBaseSourceOptionId: "selZw4nOkwMJCgGyR",
  },

  statusValues: {
    complete: "Complete",
  },

  outputStatuses: {
    created: "created",
    found: "found",
    skipped: "skipped",
    error: "error",
  },

  flags: {
    throwOnDuplicateSummaryKey: true,
  },

  debug: {
    logToConsole: true,
  },
};

/* =========================================================
   SECTION 2: INPUTS
========================================================= */

const cfg =
  typeof input !== "undefined" && input && typeof input.config === "function"
    ? input.config()
    : {};

const recordId = String(cfg.recordId || "").trim();

if (!recordId) {
  throw new Error("Missing required input: recordId");
}

/* =========================================================
   SECTION 3: TABLES
========================================================= */

const submissionsTable = base.getTable(CONFIG.tables.submissions);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const weeksTable = base.getTable(CONFIG.tables.weeks);
const summariesTable = base.getTable(CONFIG.tables.summaries);
const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

/* =========================================================
   SECTION 4: HELPERS
========================================================= */

function log(message, data = null) {
  if (!CONFIG.debug.logToConsole) return;

  if (data === null || data === undefined) {
    console.log(message);
  } else {
    console.log(message, JSON.stringify(data, null, 2));
  }
}

/**
 * Airtable Scripting sometimes exposes unloadData on QueryResult; some automation
 * runtimes do not. Never let cleanup throw after successful business work.
 */
function unloadQuerySafe(queryResult) {
  if (typeof queryResult?.unloadData === "function") {
    try {
      queryResult.unloadData();
    } catch (error) {
      log("Query unloadData skipped/failed (non-fatal)", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch {
    // Output is unavailable in some testing contexts.
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

function requireFieldType(table, fieldName, expectedType, label) {
  requireField(table, fieldName, label);

  const field = getFieldSafe(table, fieldName);
  if (field?.type !== expectedType) {
    throw new Error(
      `Required field has unexpected type: ${label} (${table.name} -> ${fieldName}); expected ${expectedType}, found ${field?.type || "unknown"}.`
    );
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

function isChecked(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (raw === true || raw === 1) return true;
  return ["true", "yes", "checked", "1"].includes(
    getText(record, table, fieldName).toLowerCase()
  );
}

function normalizeSubmissionStatMode(record, table, fieldName) {
  return getText(record, table, fieldName).toLowerCase();
}

function getLinkedRecordIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedRecordId(record, table, fieldName) {
  return getLinkedRecordIds(record, table, fieldName)[0] || "";
}

function getSingleSelectOptionId(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (!raw || Array.isArray(raw) || typeof raw !== "object") {
    return "";
  }

  return String(raw.id || "").trim();
}

function isSubmissionBaseXpEvent(record) {
  return (
    getSingleSelectOptionId(
      record,
      xpEventsTable,
      CONFIG.xpEvents.xpSource
    ) === CONFIG.xpEvents.submissionBaseSourceOptionId
  );
}

function getExactlyOneLinkedRecordId(record, table, fieldName, label) {
  const ids = uniqueIds(getLinkedRecordIds(record, table, fieldName));

  if (ids.length !== 1) {
    throw new Error(
      `${label} must have exactly one linked ${fieldName}; found ${ids.length}.`
    );
  }

  return ids[0];
}

function uniqueIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

function linkedCell(ids) {
  return uniqueIds(ids).map(id => ({ id }));
}

function sameIdArray(a, b) {
  const aa = uniqueIds(a);
  const bb = uniqueIds(b);

  if (aa.length !== bb.length) return false;

  const sortedA = [...aa].sort();
  const sortedB = [...bb].sort();

  return sortedA.every((id, index) => id === sortedB[index]);
}

function buildSingleSelectValue(table, fieldName, optionName) {
  const field = getFieldSafe(table, fieldName);

  if (!field) {
    return undefined;
  }

  if (field.type !== "singleSelect") {
    return optionName;
  }

  const cleanOptionName = String(optionName || "").trim();
  const choices = field?.options?.choices || [];

  const match = choices.find(choice => {
    return (
      String(choice.name || "").trim().toLowerCase() ===
      cleanOptionName.toLowerCase()
    );
  });

  if (!match) {
    log(`Skipped status update because option does not exist: ${cleanOptionName}`);
    return undefined;
  }

  return { id: match.id };
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

    if (value === undefined) {
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

async function loadProgramInstanceContext(enrollmentId, weekId) {
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId);
  if (!enrollment) {
    throw new Error(`Enrollment not found: ${enrollmentId}`);
  }

  const week = await weeksTable.selectRecordAsync(weekId);
  if (!week) {
    throw new Error(`Week not found: ${weekId}`);
  }

  const enrollmentProgramInstanceId = getExactlyOneLinkedRecordId(
    enrollment,
    enrollmentsTable,
    CONFIG.enrollments.programInstance,
    `Enrollment ${enrollmentId}`
  );
  const weekProgramInstanceId = getExactlyOneLinkedRecordId(
    week,
    weeksTable,
    CONFIG.weeks.programInstance,
    `Week ${weekId}`
  );

  if (enrollmentProgramInstanceId !== weekProgramInstanceId) {
    throw new Error(
      `Enrollment ${enrollmentId} and Week ${weekId} belong to different Program Instances.`
    );
  }

  return {
    enrollmentProgramInstanceId,
    weekProgramInstanceId,
    programInstanceId: enrollmentProgramInstanceId,
  };
}

async function validateSummaryForContext(summaryRecord, {
  enrollmentId,
  weekId,
  programInstanceId,
  summaryKey,
}) {
  if (!summaryRecord) {
    return false;
  }

  const summaryEnrollmentId = getExactlyOneLinkedRecordId(
    summaryRecord,
    summariesTable,
    CONFIG.summaries.enrollment,
    `Weekly Athlete Summary ${summaryRecord.id}`
  );
  const summaryWeekId = getExactlyOneLinkedRecordId(
    summaryRecord,
    summariesTable,
    CONFIG.summaries.week,
    `Weekly Athlete Summary ${summaryRecord.id}`
  );
  const existingSummaryKey = getText(
    summaryRecord,
    summariesTable,
    CONFIG.summaries.summaryKey
  );

  if (
    summaryEnrollmentId !== enrollmentId ||
    summaryWeekId !== weekId ||
    existingSummaryKey !== summaryKey
  ) {
    return false;
  }

  const summaryProgramInstance = await loadProgramInstanceContext(
    summaryEnrollmentId,
    summaryWeekId
  );

  return summaryProgramInstance.programInstanceId === programInstanceId;
}

async function findValidCanonicalSummaries(summaryRecords, context) {
  const valid = [];

  for (const summary of summaryRecords || []) {
    try {
      if (await validateSummaryForContext(summary, context)) {
        valid.push(summary);
      }
    } catch (error) {
      log("Ignored malformed Weekly Athlete Summary candidate", {
        candidateRecordId: summary?.id || "(unknown)",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return valid;
}

function findSummaryRecordById(summaryRecords, summaryId) {
  return (summaryRecords || []).find(summary => summary.id === summaryId) || null;
}

async function updateRecordsInBatchesSafe(table, updates) {
  const cleanUpdates = Array.isArray(updates)
    ? updates.filter(update => update?.id && update?.fields)
    : [];

  if (cleanUpdates.length === 0) {
    return;
  }

  if (typeof table.updateRecordsAsync === "function") {
    for (let index = 0; index < cleanUpdates.length; index += 50) {
      await table.updateRecordsAsync(cleanUpdates.slice(index, index + 50));
    }
    return;
  }

  for (const update of cleanUpdates) {
    await table.updateRecordAsync(update.id, update.fields);
  }
}

function buildSummaryStatusUpdate() {
  const updates = {};

  const fieldName = CONFIG.summaries.summaryCalculationStatus;

  if (fieldExists(summariesTable, fieldName) && isWritableField(summariesTable, fieldName)) {
    const value = buildSingleSelectValue(
      summariesTable,
      fieldName,
      CONFIG.statusValues.complete
    );

    if (value !== undefined) {
      updates[fieldName] = value;
    }
  }

  return updates;
}

async function createCanonicalSummary({ enrollmentId, weekId }) {
  const fields = {
    [CONFIG.summaries.enrollment]: linkedCell([enrollmentId]),
    [CONFIG.summaries.week]: linkedCell([weekId]),
    ...buildSummaryStatusUpdate(),
  };

  // Summary Key is intentionally omitted: Airtable computes it from the
  // authoritative Enrollment and Week links.
  const createdId = await summariesTable.createRecordAsync(fields);
  log("Created candidate Weekly Athlete Summary", {
    createdSummaryId: createdId,
    enrollmentId,
    weekId,
    wroteSummaryKey: false,
  });
  return createdId;
}

async function loadCanonicalSummaries(context) {
  const query = await summariesTable.selectRecordsAsync({
    fields: buildSummaryFieldsToLoad(),
  });

  return {
    query,
    matches: await findValidCanonicalSummaries(query.records, context),
  };
}

async function repairXpEventsForEnrollmentWeek({
  enrollmentId,
  weekId,
  weeklySummaryId,
  staleSummaryId = "",
}) {
  if (!enrollmentId || !weekId || !weeklySummaryId) {
    return { repairedCount: 0, repairedIds: [] };
  }

  if (
    !fieldExists(xpEventsTable, CONFIG.xpEvents.weeklySummary) ||
    !isWritableField(xpEventsTable, CONFIG.xpEvents.weeklySummary)
  ) {
    return { repairedCount: 0, repairedIds: [] };
  }

  const xpFields = [
    CONFIG.xpEvents.enrollment,
    CONFIG.xpEvents.week,
    CONFIG.xpEvents.weeklySummary,
    CONFIG.xpEvents.xpSource,
  ].filter(fieldName => fieldExists(xpEventsTable, fieldName));

  const xpQuery = await xpEventsTable.selectRecordsAsync({ fields: xpFields });
  const toRepair = [];

  try {
    for (const xpRecord of xpQuery.records) {
      const xpEnrollmentId = getFirstLinkedRecordId(
        xpRecord,
        xpEventsTable,
        CONFIG.xpEvents.enrollment
      );
      const xpWeekId = getFirstLinkedRecordId(
        xpRecord,
        xpEventsTable,
        CONFIG.xpEvents.week
      );
      const xpSummaryId = getFirstLinkedRecordId(
        xpRecord,
        xpEventsTable,
        CONFIG.xpEvents.weeklySummary
      );

      if (xpEnrollmentId !== enrollmentId || xpWeekId !== weekId) continue;
      if (isSubmissionBaseXpEvent(xpRecord)) continue;
      if (xpSummaryId && xpSummaryId !== staleSummaryId) continue;
      if (xpSummaryId === weeklySummaryId) continue;

      toRepair.push(xpRecord.id);
    }
  } finally {
    unloadQuerySafe(xpQuery);
  }

  const repairedIds = [...toRepair];

  await updateRecordsInBatchesSafe(
    xpEventsTable,
    repairedIds.map(id => ({
      id,
      fields: {
        [CONFIG.xpEvents.weeklySummary]: [{ id: weeklySummaryId }],
      },
    }))
  );

  return { repairedCount: repairedIds.length, repairedIds };
}

function buildSummaryFieldsToLoad() {
  return [
    CONFIG.summaries.summaryKey,
    CONFIG.summaries.enrollment,
    CONFIG.summaries.week,
    CONFIG.summaries.submissions,
    CONFIG.summaries.summaryCalculationStatus,
    CONFIG.summaries.created,
  ].filter(fieldName => fieldExists(summariesTable, fieldName));
}

/* =========================================================
   SECTION 5: FIELD VALIDATION
========================================================= */

// Submission Enrollment and Week are required linked inputs.
// Weekly Athlete Summary is a writable output link.
requireField(
  submissionsTable,
  CONFIG.submissions.enrollment,
  "Submissions -> Enrollment"
);

requireField(
  submissionsTable,
  CONFIG.submissions.week,
  "Submissions -> Week"
);

requireWritableField(
  submissionsTable,
  CONFIG.submissions.weeklySummary,
  "Submissions -> Weekly Athlete Summary"
);

// Count This Submission? is a formula/read-only readiness input. Its evaluated
// value is read through isChecked(); do not require the physical field type to
// be checkbox.
requireField(
  submissionsTable,
  CONFIG.submissions.countThisSubmission,
  "Submissions -> Count This Submission?"
);

// Submission Stat Mode is a formula/read-only readiness input. Its evaluated
// text is read through getText(); do not require the physical field type to be
// singleSelect.
requireField(
  submissionsTable,
  CONFIG.submissions.submissionStatMode,
  "Submissions -> Submission Stat Mode"
);

// Build Daily Email Now? is the writable readiness output; retain both its
// physical checkbox and writability gates.
requireFieldType(
  submissionsTable,
  CONFIG.submissions.buildDailyEmailNow,
  "checkbox",
  "Submissions -> Build Daily Email Now?"
);

requireWritableField(
  submissionsTable,
  CONFIG.submissions.buildDailyEmailNow,
  "Submissions -> Build Daily Email Now?"
);

// Enrollment Key is a required read-only/formula input; Program Instance is a
// required linked input.
requireField(
  enrollmentsTable,
  CONFIG.enrollments.enrollmentKey,
  "Enrollments -> Enrollment Key"
);

requireField(
  enrollmentsTable,
  CONFIG.enrollments.programInstance,
  "Enrollments -> Program Instance"
);

// Week Key is a required read-only/formula input; Program Instance is a
// required linked input; Week Name is a required read-only input.
requireField(
  weeksTable,
  CONFIG.weeks.weekKey,
  "Weeks -> Week Key"
);

requireField(
  weeksTable,
  CONFIG.weeks.programInstance,
  "Weeks -> Program Instance"
);

requireField(
  weeksTable,
  CONFIG.weeks.weekName,
  "Weeks -> Week Name"
);

// Summary Key is a required read-only/formula input. Summary Enrollment, Week,
// and Submissions are writable outputs.
requireField(
  summariesTable,
  CONFIG.summaries.summaryKey,
  "Weekly Athlete Summary -> Summary Key"
);

requireWritableField(
  summariesTable,
  CONFIG.summaries.enrollment,
  "Weekly Athlete Summary -> Enrollment"
);

requireWritableField(
  summariesTable,
  CONFIG.summaries.week,
  "Weekly Athlete Summary -> Week"
);

requireWritableField(
  summariesTable,
  CONFIG.summaries.submissions,
  "Weekly Athlete Summary -> Submissions"
);

// XP Source is a required read-only configuration input used to preserve
// Automation 010 ownership boundaries.
requireFieldType(
  xpEventsTable,
  CONFIG.xpEvents.xpSource,
  "singleSelect",
  "XP Events -> XP Source"
);

/* =========================================================
   SECTION 6: MAIN
========================================================= */

async function main() {
  let debugStep = "Start";

  let submissionEnrollmentId = "";
  let submissionWeekId = "";
  let existingSubmissionSummaryIds = [];
  let existingSubmissionSummaryId = "";
  let resolvedWeekName = "";
  let targetSummaryKey = "";
  let weeklySummaryId = "";
  let actionTaken = "";
  let updatedFields = [];
  let orphanXpLinkedCount = 0;
  let staleSummaryIdRepaired = "";

  setOutputSafe("debugStep", debugStep);

  try {
    debugStep = "1 - Validate recordId";
    setOutputSafe("debugStep", debugStep);

    if (!recordId.startsWith("rec")) {
      throw new Error(`Invalid Submission recordId input: ${recordId}`);
    }

    debugStep = "2 - Load Submission";
    setOutputSafe("debugStep", debugStep);

    const submission = await submissionsTable.selectRecordAsync(recordId);

    if (!submission) {
      setOutputSafe("ok", false);
      setOutputSafe("recordId", recordId);
      setOutputSafe("weeklySummaryId", "");
      setOutputSafe("summaryKeyOut", "");
      setOutputSafe("weekId", "");
      setOutputSafe("weekName", "");
      setOutputSafe("actionTaken", "skipped_submission_not_found");
      setOutputSafe("statusOut", CONFIG.outputStatuses.skipped);
      setOutputSafe("errorOut", `Submission not found: ${recordId}`);
      setOutputSafe("debugStep", "Skipped: Submission not found");
      return;
    }

    debugStep = "3 - Validate Counted Submission Readiness";
    setOutputSafe("debugStep", debugStep);

    if (!isChecked(submission, submissionsTable, CONFIG.submissions.countThisSubmission)) {
      setOutputSafe("ok", false);
      setOutputSafe("recordId", recordId);
      setOutputSafe("actionTaken", "skipped_uncounted_submission");
      setOutputSafe("actionOut", "skipped_uncounted_submission");
      setOutputSafe("readinessOut", "unchanged");
      setOutputSafe("statusOut", CONFIG.outputStatuses.skipped);
      setOutputSafe("errorOut", "");
      setOutputSafe("debugStep", "Skipped: Submission is not counted");
      return;
    }

    const submissionStatMode = normalizeSubmissionStatMode(
      submission,
      submissionsTable,
      CONFIG.submissions.submissionStatMode
    );
    if (!["simple total", "detailed shooting"].includes(submissionStatMode)) {
      setOutputSafe("ok", false);
      setOutputSafe("recordId", recordId);
      setOutputSafe("actionTaken", "skipped_unsupported_stat_mode");
      setOutputSafe("actionOut", "skipped_unsupported_stat_mode");
      setOutputSafe("readinessOut", "unchanged");
      setOutputSafe("statusOut", CONFIG.outputStatuses.skipped);
      setOutputSafe("errorOut", "");
      setOutputSafe(
        "debugStep",
        "Skipped: Submission Stat Mode is blank or unsupported"
      );
      return;
    }

    debugStep = "4 - Read Submission Links";
    setOutputSafe("debugStep", debugStep);

    submissionEnrollmentId = getFirstLinkedRecordId(
      submission,
      submissionsTable,
      CONFIG.submissions.enrollment
    );

    submissionWeekId = getFirstLinkedRecordId(
      submission,
      submissionsTable,
      CONFIG.submissions.week
    );

    existingSubmissionSummaryIds = getLinkedRecordIds(
      submission,
      submissionsTable,
      CONFIG.submissions.weeklySummary
    );
    existingSubmissionSummaryId = existingSubmissionSummaryIds[0] || "";

    log("Weekly Summary input", {
      recordId,
      submissionEnrollmentId,
      submissionWeekId,
      existingSubmissionSummaryIds,
      existingSubmissionSummaryId,
    });

    debugStep = "5 - Validate Submission Links";
    setOutputSafe("debugStep", debugStep);

    if (!submissionEnrollmentId) {
      throw new Error(`Submission ${recordId} is missing Enrollment link.`);
    }

    if (!submissionWeekId) {
      throw new Error(
        `Submission ${recordId} is missing Week link. Run the Week assignment automation before this automation.`
      );
    }

    if (existingSubmissionSummaryIds.length > 1) {
      throw new Error(
        `Submission ${recordId} has multiple Weekly Athlete Summary links: ${existingSubmissionSummaryIds.join(", ")}`
      );
    }

    debugStep = "6 - Load Enrollment";
    setOutputSafe("debugStep", debugStep);

    const enrollment = await enrollmentsTable.selectRecordAsync(submissionEnrollmentId);

    if (!enrollment) {
      throw new Error(`Enrollment not found: ${submissionEnrollmentId}`);
    }

    const enrollmentKey = getText(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.enrollmentKey
    );

    if (!enrollmentKey) {
      throw new Error(`Enrollment Key is blank for Enrollment ${submissionEnrollmentId}.`);
    }

    debugStep = "7 - Load Week";
    setOutputSafe("debugStep", debugStep);

    const weekRecord = await weeksTable.selectRecordAsync(submissionWeekId);

    if (!weekRecord) {
      throw new Error(`Week not found: ${submissionWeekId}`);
    }

    const resolvedWeekKey = getText(weekRecord, weeksTable, CONFIG.weeks.weekKey);
    resolvedWeekName = getText(weekRecord, weeksTable, CONFIG.weeks.weekName);

    if (!resolvedWeekKey) {
      throw new Error(`Week Key is blank for Week ${submissionWeekId}.`);
    }

    const enrollmentProgramInstanceId = getExactlyOneLinkedRecordId(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.programInstance,
      `Enrollment ${submissionEnrollmentId}`
    );
    const weekProgramInstanceId = getExactlyOneLinkedRecordId(
      weekRecord,
      weeksTable,
      CONFIG.weeks.programInstance,
      `Week ${submissionWeekId}`
    );

    if (enrollmentProgramInstanceId !== weekProgramInstanceId) {
      throw new Error(
        `Submission ${recordId} links Enrollment and Week from different Program Instances.`
      );
    }

    const programInstanceId = enrollmentProgramInstanceId;
    targetSummaryKey = `${enrollmentKey}|${resolvedWeekKey}`;

    debugStep = "8 - Load Weekly Athlete Summaries";
    setOutputSafe("debugStep", debugStep);

    let summariesQuery = await summariesTable.selectRecordsAsync({
      fields: buildSummaryFieldsToLoad(),
    });

    debugStep = "9 - Find Matching Summary";
    setOutputSafe("debugStep", debugStep);

    let matchingSummaries = await findValidCanonicalSummaries(
      summariesQuery.records,
      {
        enrollmentId: submissionEnrollmentId,
        weekId: submissionWeekId,
        programInstanceId,
        summaryKey: targetSummaryKey,
      }
    );

    if (matchingSummaries.length > 1 && CONFIG.flags.throwOnDuplicateSummaryKey) {
      const duplicateIds = matchingSummaries.map(record => record.id).join(", ");
      throw new Error(
        `Multiple fully valid Weekly Athlete Summary records found for Summary Key ${targetSummaryKey} and Program Instance ${programInstanceId}: ${duplicateIds}`
      );
    }

    debugStep = "10 - Find or Create Summary";
    setOutputSafe("debugStep", debugStep);

    const existingSummaryRecord = existingSubmissionSummaryId
      ? findSummaryRecordById(summariesQuery.records, existingSubmissionSummaryId)
      : null;
    const existingSummaryIsValid =
      !!existingSummaryRecord &&
      matchingSummaries.some(summary => summary.id === existingSummaryRecord.id);

    if (existingSummaryIsValid) {
      weeklySummaryId = existingSubmissionSummaryId;
      actionTaken = "found_existing_summary";
    } else if (matchingSummaries.length === 1) {
      const matchingSummary = matchingSummaries[0];
      weeklySummaryId = matchingSummary.id;
      actionTaken = existingSubmissionSummaryId
        ? "repaired_stale_summary_link"
        : "found_existing_summary";
      staleSummaryIdRepaired =
        existingSubmissionSummaryId && existingSubmissionSummaryId !== matchingSummary.id
          ? existingSubmissionSummaryId
          : "";
    } else if (matchingSummaries.length === 0) {
      debugStep = "10 - Create Canonical Summary";
      setOutputSafe("debugStep", debugStep);

      weeklySummaryId = await createCanonicalSummary({
        enrollmentId: submissionEnrollmentId,
        weekId: submissionWeekId,
      });
      actionTaken = "created_canonical_summary";
      staleSummaryIdRepaired = existingSubmissionSummaryId || "";

      const postCreate = await loadCanonicalSummaries({
        enrollmentId: submissionEnrollmentId,
        weekId: submissionWeekId,
        programInstanceId,
        summaryKey: targetSummaryKey,
      });
      summariesQuery = postCreate.query;
      matchingSummaries = postCreate.matches;

      if (matchingSummaries.length !== 1) {
        const postCreateIds = matchingSummaries.map(record => record.id).join(", ") || "(none)";
        throw new Error(
          `Canonical Weekly Athlete Summary create conflict for Submission ${recordId}; created ${weeklySummaryId}; found ${matchingSummaries.length} valid candidates after requery: ${postCreateIds}. Airtable has no unique constraint; stop for review.`
        );
      }

      if (matchingSummaries[0].id !== weeklySummaryId) {
        throw new Error(
          `Canonical Weekly Athlete Summary create race for Submission ${recordId}; created ${weeklySummaryId}, but post-create canonical result was ${matchingSummaries[0].id}. Stop for review.`
        );
      }
    } else if (existingSubmissionSummaryId) {
      throw new Error(
        `Submission ${recordId} has stale Weekly Athlete Summary ${existingSubmissionSummaryId}, and no canonical summary can be resolved safely for Summary Key ${targetSummaryKey}.`
      );
    }

    const matchingSummary = findSummaryRecordById(summariesQuery.records, weeklySummaryId) ||
      matchingSummaries.find(summary => summary.id === weeklySummaryId);
    if (!matchingSummary) {
      throw new Error(`Resolved Weekly Athlete Summary not found in loaded query: ${weeklySummaryId}`);
    }

    const existingSubmissionIds = getLinkedRecordIds(
      matchingSummary,
      summariesTable,
      CONFIG.summaries.submissions
    );

    const mergedSubmissionIds = uniqueIds([...existingSubmissionIds, recordId]);

    const summaryUpdates = {
      ...buildSummaryStatusUpdate(),
    };

    if (!sameIdArray(existingSubmissionIds, mergedSubmissionIds)) {
      summaryUpdates[CONFIG.summaries.submissions] = linkedCell(mergedSubmissionIds);
    }

    updatedFields = await updateRecordSafe(
      summariesTable,
      weeklySummaryId,
      summaryUpdates
    );

    debugStep = "11 - Link Summary Back to Submission";
    setOutputSafe("debugStep", debugStep);

    await updateRecordSafe(submissionsTable, recordId, {
      [CONFIG.submissions.weeklySummary]: [{ id: weeklySummaryId }],
    });

    if (staleSummaryIdRepaired) {
      debugStep = "11a - Remove Submission from Stale Summary";
      setOutputSafe("debugStep", debugStep);

      const staleSummaryRecord = findSummaryRecordById(
        summariesQuery.records,
        staleSummaryIdRepaired
      );

      if (staleSummaryRecord) {
        const staleSubmissionIds = getLinkedRecordIds(
          staleSummaryRecord,
          summariesTable,
          CONFIG.summaries.submissions
        );
        const cleanedSubmissionIds = staleSubmissionIds.filter(id => id !== recordId);

        if (!sameIdArray(staleSubmissionIds, cleanedSubmissionIds)) {
          await updateRecordSafe(summariesTable, staleSummaryIdRepaired, {
            [CONFIG.summaries.submissions]: linkedCell(cleanedSubmissionIds),
          });
        }
      }
    }

    debugStep = "11b - Repair XP Event Summary Links";
    setOutputSafe("debugStep", debugStep);

    const orphanLinkResult = await repairXpEventsForEnrollmentWeek({
      enrollmentId: submissionEnrollmentId,
      weekId: submissionWeekId,
      weeklySummaryId,
      staleSummaryId: staleSummaryIdRepaired,
    });

    orphanXpLinkedCount = orphanLinkResult.repairedCount || 0;

    log("XP Event summary links repaired", orphanLinkResult);

    debugStep = "12 - Validate Final Summary";
    setOutputSafe("debugStep", debugStep);

    const finalSummary = await summariesTable.selectRecordAsync(weeklySummaryId);

    if (!finalSummary) {
      throw new Error(
        `Weekly Athlete Summary could not be reloaded after find/create: ${weeklySummaryId}`
      );
    }

    const finalEnrollmentId = getFirstLinkedRecordId(
      finalSummary,
      summariesTable,
      CONFIG.summaries.enrollment
    );

    const finalWeekId = getFirstLinkedRecordId(
      finalSummary,
      summariesTable,
      CONFIG.summaries.week
    );

    const finalSubmissionIds = getLinkedRecordIds(
      finalSummary,
      summariesTable,
      CONFIG.summaries.submissions
    );

    if (finalEnrollmentId !== submissionEnrollmentId) {
      throw new Error(
        `Weekly Athlete Summary has wrong Enrollment. Expected ${submissionEnrollmentId}, got ${finalEnrollmentId || "(blank)"}`
      );
    }

    if (finalWeekId !== submissionWeekId) {
      throw new Error(
        `Weekly Athlete Summary has wrong Week. Expected ${submissionWeekId}, got ${finalWeekId || "(blank)"}`
      );
    }

    const finalSummaryKey = getText(
      finalSummary,
      summariesTable,
      CONFIG.summaries.summaryKey
    );
    if (finalSummaryKey !== targetSummaryKey) {
      throw new Error(
        `Weekly Athlete Summary has wrong Summary Key. Expected ${targetSummaryKey}, got ${finalSummaryKey || "(blank)"}`
      );
    }

    const finalProgramInstance = await loadProgramInstanceContext(
      finalEnrollmentId,
      finalWeekId
    );
    if (finalProgramInstance.programInstanceId !== programInstanceId) {
      throw new Error(
        `Weekly Athlete Summary has wrong Program Instance. Expected ${programInstanceId}, got ${finalProgramInstance.programInstanceId || "(blank)"}`
      );
    }

    if (!finalSubmissionIds.includes(recordId)) {
      throw new Error("Weekly Athlete Summary is missing the source Submission link.");
    }

    debugStep = "13 - Arm Daily Email Readiness";
    setOutputSafe("debugStep", debugStep);

    const readinessFieldsUpdated = await updateRecordSafe(submissionsTable, recordId, {
      [CONFIG.submissions.buildDailyEmailNow]: true,
    });

    updatedFields = [...new Set([...updatedFields, ...readinessFieldsUpdated])];
    setOutputSafe("readinessOut", "set");
    setOutputSafe("buildDailyEmailNow", true);

    debugStep = "14 - Outputs";
    setOutputSafe("debugStep", debugStep);

    setOutputSafe("ok", true);
    setOutputSafe("recordId", recordId);
    setOutputSafe("weeklySummaryId", weeklySummaryId);
    setOutputSafe("summaryKeyOut", targetSummaryKey);
    setOutputSafe("weekId", submissionWeekId);
    setOutputSafe("weekName", resolvedWeekName);
    setOutputSafe("actionTaken", actionTaken);
    setOutputSafe("actionOut", actionTaken || "");
    setOutputSafe("orphanXpLinkedCount", orphanXpLinkedCount);
    setOutputSafe(
      "statusOut",
      actionTaken === "created_canonical_summary"
        ? CONFIG.outputStatuses.created
        : CONFIG.outputStatuses.found
    );
    setOutputSafe("errorOut", "");

    log("Weekly Summary canonical resolution completed", {
      recordId,
      weeklySummaryId,
      summaryKeyOut: targetSummaryKey,
      actionTaken,
      updatedFields,
      orphanXpLinkedCount,
      readinessOut: "set",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    setOutputSafe("ok", false);
    setOutputSafe("recordId", recordId);
    setOutputSafe("weeklySummaryId", weeklySummaryId);
    setOutputSafe("summaryKeyOut", targetSummaryKey);
    setOutputSafe("weekId", submissionWeekId);
    setOutputSafe("weekName", resolvedWeekName);
    setOutputSafe("actionTaken", actionTaken);
    setOutputSafe("statusOut", CONFIG.outputStatuses.error);
    setOutputSafe("errorOut", message);
    setOutputSafe("readinessOut", "error");
    setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);

    log("Weekly Summary find/create failed", {
      recordId,
      debugStep,
      error: message,
    });

    throw error;
  }
}

/* =========================================================
   SECTION 7: RUN
========================================================= */

await main();

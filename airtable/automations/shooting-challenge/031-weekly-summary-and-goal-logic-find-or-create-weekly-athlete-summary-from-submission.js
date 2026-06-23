/*
Automation: 031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-20
Last GitHub Update: 2026-06-22

Purpose:
Finds or creates Weekly Athlete Summary from counted submissions and repairs orphan XP links.

Trigger:
Submissions when Count This Submission? is checked and Weekly Athlete Summary is empty.

Important Tables:
Submissions, Enrollments, Weeks, Weekly Athlete Summary, XP Events

Important Fields:
Enrollment, Week, Weekly Athlete Summary, Count This Submission?, Summary Key

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************
 * 031 - WEEKLY SUMMARY AND GOAL LOGIC
 * Find or Create Weekly Athlete Summary from Submission
 *
 * Version: v3.1
 * Date Written: 2026-05-20
 * Last Updated: 2026-06-22
 *
 * PURPOSE
 * - Runs from one counted Submission record.
 * - Verifies the Submission has Enrollment and Week links.
 * - Builds the target Summary Key from Enrollment Key + Week Key.
 * - Finds the matching Weekly Athlete Summary record.
 * - Creates a Weekly Athlete Summary if one does not exist.
 * - Links the Submission to the Weekly Athlete Summary.
 * - Links the Weekly Athlete Summary back to the Submission.
 * - Repairs orphan XP Events for the same Enrollment + Week missing summary links.
 *
 * IMPORTANT DESIGN RULES
 * - Weekly Athlete Summary is the weekly reporting / rollup table.
 * - Weekly Athlete Summary.Summary Key is a formula field and must NOT be written by script.
 * - Enrollments.Enrollment Key is a formula field and must NOT be written by script.
 * - Weeks.Week Key is a formula field and must NOT be written by script.
 * - One Enrollment + one Week should create exactly one Weekly Athlete Summary record.
 * - Multiple counted Submissions for the same Enrollment + Week should link to the same Weekly Athlete Summary.
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
 * - Weekly Athlete Summary is empty
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId = Airtable record ID from the triggering Submission record
 *
 * OUTPUTS
 * - statusOut = created | found | skipped | error
 * - actionOut
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
  version: "v3.1",

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
  },

  enrollments: {
    enrollmentKey: "Enrollment Key",
  },

  weeks: {
    weekKey: "Week Key",
    weekName: "Week Name",
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

async function createRecordSafe(table, createFields) {
  const safeCreateFields = {};

  for (const [fieldName, value] of Object.entries(createFields || {})) {
    if (!fieldExists(table, fieldName)) {
      log(`Skipped missing create field: ${table.name}.${fieldName}`);
      continue;
    }

    if (!isWritableField(table, fieldName)) {
      log(`Skipped non-writable create field: ${table.name}.${fieldName}`);
      continue;
    }

    if (value === undefined) {
      continue;
    }

    safeCreateFields[fieldName] = value;
  }

  if (Object.keys(safeCreateFields).length === 0) {
    throw new Error(`No writable fields available to create record in ${table.name}.`);
  }

  return await table.createRecordAsync(safeCreateFields);
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

async function linkOrphanXpEventsForEnrollmentWeek(enrollmentId, weekId, weeklySummaryId) {
  if (!enrollmentId || !weekId || !weeklySummaryId) {
    return { linkedCount: 0, linkedIds: [] };
  }

  if (
    !fieldExists(xpEventsTable, CONFIG.xpEvents.weeklySummary) ||
    !isWritableField(xpEventsTable, CONFIG.xpEvents.weeklySummary)
  ) {
    return { linkedCount: 0, linkedIds: [] };
  }

  const xpFields = [
    CONFIG.xpEvents.enrollment,
    CONFIG.xpEvents.week,
    CONFIG.xpEvents.weeklySummary,
  ].filter(fieldName => fieldExists(xpEventsTable, fieldName));

  const xpQuery = await xpEventsTable.selectRecordsAsync({ fields: xpFields });
  const toLink = [];

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
    if (xpSummaryId) continue;

    toLink.push(xpRecord.id);
  }

  if (typeof xpQuery.unloadData === "function") {
    xpQuery.unloadData();
  }

  const linkedIds = [];

  for (let index = 0; index < toLink.length; index += 50) {
    const batch = toLink.slice(index, index + 50);

    await xpEventsTable.updateRecordsAsync(
      batch.map(id => ({
        id,
        fields: {
          [CONFIG.xpEvents.weeklySummary]: [{ id: weeklySummaryId }],
        },
      }))
    );

    linkedIds.push(...batch);
  }

  return { linkedCount: linkedIds.length, linkedIds };
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

requireField(
  enrollmentsTable,
  CONFIG.enrollments.enrollmentKey,
  "Enrollments -> Enrollment Key"
);

requireField(
  weeksTable,
  CONFIG.weeks.weekKey,
  "Weeks -> Week Key"
);

requireField(
  weeksTable,
  CONFIG.weeks.weekName,
  "Weeks -> Week Name"
);

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

/* =========================================================
   SECTION 6: MAIN
========================================================= */

async function main() {
  let debugStep = "Start";

  let submissionEnrollmentId = "";
  let submissionWeekId = "";
  let existingSubmissionSummaryId = "";
  let resolvedWeekName = "";
  let targetSummaryKey = "";
  let weeklySummaryId = "";
  let actionTaken = "";
  let updatedFields = [];
  let orphanXpLinkedCount = 0;

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

    debugStep = "3 - Read Submission Links";
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

    existingSubmissionSummaryId = getFirstLinkedRecordId(
      submission,
      submissionsTable,
      CONFIG.submissions.weeklySummary
    );

    log("Weekly Summary input", {
      recordId,
      submissionEnrollmentId,
      submissionWeekId,
      existingSubmissionSummaryId,
    });

    debugStep = "4 - Validate Submission Links";
    setOutputSafe("debugStep", debugStep);

    if (!submissionEnrollmentId) {
      throw new Error(`Submission ${recordId} is missing Enrollment link.`);
    }

    if (!submissionWeekId) {
      throw new Error(
        `Submission ${recordId} is missing Week link. Run the Week assignment automation before this automation.`
      );
    }

    if (existingSubmissionSummaryId) {
      weeklySummaryId = existingSubmissionSummaryId;
      actionTaken = "already_linked_to_summary";

      setOutputSafe("ok", true);
      setOutputSafe("recordId", recordId);
      setOutputSafe("weeklySummaryId", weeklySummaryId);
      setOutputSafe("summaryKeyOut", "");
      setOutputSafe("weekId", submissionWeekId);
      setOutputSafe("weekName", "");
      setOutputSafe("actionTaken", actionTaken);
      setOutputSafe("statusOut", CONFIG.outputStatuses.found);
      setOutputSafe("errorOut", "");
      setOutputSafe("debugStep", "Done - Already linked");

      log("Submission already linked to Weekly Athlete Summary", {
        recordId,
        weeklySummaryId,
      });

      return;
    }

    debugStep = "5 - Load Enrollment";
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

    debugStep = "6 - Load Week";
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

    targetSummaryKey = `${enrollmentKey}|${resolvedWeekKey}`;

    debugStep = "7 - Load Weekly Athlete Summaries";
    setOutputSafe("debugStep", debugStep);

    const summariesQuery = await summariesTable.selectRecordsAsync({
      fields: buildSummaryFieldsToLoad(),
    });

    debugStep = "8 - Find Matching Summary";
    setOutputSafe("debugStep", debugStep);

    const matchingSummaries = summariesQuery.records.filter(summary => {
      const summaryKey = getText(
        summary,
        summariesTable,
        CONFIG.summaries.summaryKey
      );

      return summaryKey === targetSummaryKey;
    });

    if (
      matchingSummaries.length > 1 &&
      CONFIG.flags.throwOnDuplicateSummaryKey
    ) {
      const duplicateIds = matchingSummaries.map(record => record.id).join(", ");

      throw new Error(
        `Duplicate Weekly Athlete Summary records found for Summary Key ${targetSummaryKey}. Record IDs: ${duplicateIds}`
      );
    }

    debugStep = "9 - Find or Create Summary";
    setOutputSafe("debugStep", debugStep);

    if (matchingSummaries.length === 1) {
      const matchingSummary = matchingSummaries[0];

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
        matchingSummary.id,
        summaryUpdates
      );

      weeklySummaryId = matchingSummary.id;
      actionTaken = "found_existing_summary";
    } else {
      const createFields = {
        [CONFIG.summaries.enrollment]: [{ id: submissionEnrollmentId }],
        [CONFIG.summaries.week]: [{ id: submissionWeekId }],
        [CONFIG.summaries.submissions]: [{ id: recordId }],
        ...buildSummaryStatusUpdate(),
      };

      weeklySummaryId = await createRecordSafe(summariesTable, createFields);
      actionTaken = "created_new_summary";
    }

    debugStep = "10 - Link Summary Back to Submission";
    setOutputSafe("debugStep", debugStep);

    await updateRecordSafe(submissionsTable, recordId, {
      [CONFIG.submissions.weeklySummary]: [{ id: weeklySummaryId }],
    });

    debugStep = "10b - Link Orphan XP Events";
    setOutputSafe("debugStep", debugStep);

    const orphanLinkResult = await linkOrphanXpEventsForEnrollmentWeek(
      submissionEnrollmentId,
      submissionWeekId,
      weeklySummaryId
    );

    orphanXpLinkedCount = orphanLinkResult.linkedCount || 0;

    log("Orphan XP Event summary links repaired", orphanLinkResult);

    debugStep = "11 - Validate Final Summary";
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

    if (!finalSubmissionIds.includes(recordId)) {
      throw new Error("Weekly Athlete Summary is missing the source Submission link.");
    }

    debugStep = "12 - Outputs";
    setOutputSafe("debugStep", debugStep);

    setOutputSafe("ok", true);
    setOutputSafe("recordId", recordId);
    setOutputSafe("weeklySummaryId", weeklySummaryId);
    setOutputSafe("summaryKeyOut", targetSummaryKey);
    setOutputSafe("weekId", submissionWeekId);
    setOutputSafe("weekName", resolvedWeekName);
    setOutputSafe("actionTaken", actionTaken);
    setOutputSafe(
      "statusOut",
      actionTaken === "created_new_summary"
        ? CONFIG.outputStatuses.created
        : CONFIG.outputStatuses.found
    );
    setOutputSafe("errorOut", "");

    log("Weekly Summary find/create completed", {
      recordId,
      weeklySummaryId,
      summaryKeyOut: targetSummaryKey,
      actionTaken,
      updatedFields,
      orphanXpLinkedCount,
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

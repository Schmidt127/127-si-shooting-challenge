/*
Automation: 030 - Weekly Summary and Goal Logic - Copy Enrollment Grade Band to Weekly Summary
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
 * 030 - WEEKLY SUMMARY AND GOAL LOGIC
 * Copy Enrollment Grade Band to Weekly Summary
 *
 * Version: v3.0
 * Date Written: 2026-05-27
 * Last Updated: 2026-05-27
 *
 * PURPOSE
 * - Runs from one Weekly Athlete Summary record.
 * - Reads the linked Enrollment.
 * - Reads the Enrollment's Grade Band.
 * - Writes that Grade Band to Weekly Athlete Summary → Grade Band.
 *
 * IMPORTANT DESIGN RULES
 * - This automation only copies Grade Band.
 * - It does not assign Goal Record.
 * - It does not assign Homework.
 * - It does not calculate previous-week values.
 * - It does not write to formula, lookup, rollup, or other read-only fields.
 *
 * FOLDER
 * - 03 - Weekly Summary and Goal Logic
 *
 * AUTOMATION NAME
 * - 030 - Weekly Summary and Goal Logic - Copy Enrollment Grade Band to Weekly Summary
 *
 * TRIGGER TABLE
 * - Weekly Athlete Summary
 *
 * TRIGGER TYPE
 * - When record enters view
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Enrollment is not empty
 * - Week is not empty
 * - Grade Band is empty
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId = Airtable record ID from the triggering Weekly Athlete Summary record
 *
 * TABLES USED
 * - Weekly Athlete Summary
 * - Enrollments
 *
 * OUTPUTS
 * - ok
 * - weeklySummaryId
 * - enrollmentId
 * - gradeBandId
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
  scriptName: "030 - Weekly Summary and Goal Logic - Copy Enrollment Grade Band to Weekly Summary",
  version: "v3.0",

  tables: {
    weeklySummary: "Weekly Athlete Summary",
    enrollments: "Enrollments",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
    gradeBand: "Grade Band",
  },

  enrollments: {
    gradeBand: "Grade Band",
  },

  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },

  actions: {
    copiedGradeBand: "copied_grade_band",
    alreadyHasGradeBand: "already_has_grade_band",
    skippedNoEnrollmentGradeBand: "skipped_no_enrollment_grade_band",
  },

  debug: {
    logToConsole: true,
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

function linkedCell(ids) {
  return [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
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

function setFinalOutputs({
  ok,
  weeklySummaryId,
  enrollmentId,
  gradeBandId,
  actionTaken,
  statusOut,
  errorOut,
  debugStep,
}) {
  setOutputSafe("ok", ok);
  setOutputSafe("weeklySummaryId", weeklySummaryId || recordId);
  setOutputSafe("enrollmentId", enrollmentId || "");
  setOutputSafe("gradeBandId", gradeBandId || "");
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
  CONFIG.weeklySummary.enrollment,
  "Weekly Athlete Summary -> Enrollment"
);

requireField(
  weeklySummaryTable,
  CONFIG.weeklySummary.week,
  "Weekly Athlete Summary -> Week"
);

requireWritableField(
  weeklySummaryTable,
  CONFIG.weeklySummary.gradeBand,
  "Weekly Athlete Summary -> Grade Band"
);

requireField(
  enrollmentsTable,
  CONFIG.enrollments.gradeBand,
  "Enrollments -> Grade Band"
);

/* =========================================================
   SECTION 6: MAIN
========================================================= */

async function main() {
  let debugStep = "Start";

  let enrollmentId = "";
  let gradeBandId = "";
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
        enrollmentId: "",
        gradeBandId: "",
        actionTaken: "summary_not_found",
        statusOut: CONFIG.statuses.error,
        errorOut: `Weekly Athlete Summary record not found: ${recordId}`,
        debugStep,
      });
      return;
    }

    debugStep = "3 - Read Weekly Summary Links";
    setOutputSafe("debugStep", debugStep);

    enrollmentId = getFirstLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.enrollment
    );

    const weekId = getFirstLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.week
    );

    const existingGradeBandId = getFirstLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.gradeBand
    );

    if (existingGradeBandId) {
      gradeBandId = existingGradeBandId;
      actionTaken = CONFIG.actions.alreadyHasGradeBand;

      setFinalOutputs({
        ok: true,
        weeklySummaryId: recordId,
        enrollmentId,
        gradeBandId,
        actionTaken,
        statusOut: CONFIG.statuses.skipped,
        errorOut: "",
        debugStep: "Done - Already has Grade Band",
      });

      return;
    }

    if (!enrollmentId) {
      throw new Error("Weekly Athlete Summary is missing Enrollment.");
    }

    if (!weekId) {
      throw new Error("Weekly Athlete Summary is missing Week.");
    }

    debugStep = "4 - Load Enrollment";
    setOutputSafe("debugStep", debugStep);

    const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId);

    if (!enrollmentRecord) {
      throw new Error(`Linked Enrollment record not found: ${enrollmentId}`);
    }

    debugStep = "5 - Read Enrollment Grade Band";
    setOutputSafe("debugStep", debugStep);

    gradeBandId = getFirstLinkedRecordId(
      enrollmentRecord,
      enrollmentsTable,
      CONFIG.enrollments.gradeBand
    );

    if (!gradeBandId) {
      actionTaken = CONFIG.actions.skippedNoEnrollmentGradeBand;

      setFinalOutputs({
        ok: true,
        weeklySummaryId: recordId,
        enrollmentId,
        gradeBandId: "",
        actionTaken,
        statusOut: CONFIG.statuses.skipped,
        errorOut: "Enrollment does not have a Grade Band.",
        debugStep,
      });

      log("030 skipped: Enrollment has no Grade Band", {
        weeklySummaryId: recordId,
        enrollmentId,
      });

      return;
    }

    debugStep = "6 - Write Grade Band to Weekly Summary";
    setOutputSafe("debugStep", debugStep);

    const updatedFields = await updateRecordSafe(weeklySummaryTable, recordId, {
      [CONFIG.weeklySummary.gradeBand]: linkedCell([gradeBandId]),
    });

    actionTaken = CONFIG.actions.copiedGradeBand;

    debugStep = "7 - Outputs";
    setOutputSafe("debugStep", debugStep);

    setFinalOutputs({
      ok: true,
      weeklySummaryId: recordId,
      enrollmentId,
      gradeBandId,
      actionTaken,
      statusOut: CONFIG.statuses.success,
      errorOut: "",
      debugStep,
    });

    log("030 completed", {
      scriptName: CONFIG.scriptName,
      version: CONFIG.version,
      weeklySummaryId: recordId,
      enrollmentId,
      gradeBandId,
      updatedFields,
      actionTaken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    setFinalOutputs({
      ok: false,
      weeklySummaryId: recordId,
      enrollmentId,
      gradeBandId,
      actionTaken: actionTaken || "error",
      statusOut: CONFIG.statuses.error,
      errorOut: message,
      debugStep: `FAILED AT: ${debugStep}`,
    });

    log("030 failed", {
      scriptName: CONFIG.scriptName,
      version: CONFIG.version,
      weeklySummaryId: recordId,
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

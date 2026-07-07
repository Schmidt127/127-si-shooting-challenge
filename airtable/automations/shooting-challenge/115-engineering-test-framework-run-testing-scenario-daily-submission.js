/*
Automation: 115 - Engineering Test Framework - Run Testing Scenario Daily Submission
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-07-06 (DEV paste + verify)
Last GitHub Update: 2026-07-06 (v1.0 MVP — Schmidt Daily Submission DEV verified)

Purpose:
Creates a Fillout-shaped Submission from a Testing Scenarios row (Daily Submission MVP).

Trigger:
Testing Scenarios when Run Test? is checked (DEV only).

Important Tables:
Testing Scenarios, Enrollments, Athletes, Submissions

Important Fields:
Run Test?, Dry Run?, Related Enrollment, Submission Date, Shot Total, Linked Submission

Notes:
GitHub is the source-of-truth copy. DEV only until promotion doc + Mike approval.
Requires Testing Scenarios.Shot Total field on DEV (see C-020 checklist G1).
*/

/************************************************************
 * 115 - ENGINEERING TEST FRAMEWORK
 * Run Testing Scenario — Daily Submission (MVP)
 *
 * Version: v1.0
 * Date Written: 2026-07-06
 * Last Updated: 2026-07-06
 *
 * VERSION HISTORY
 * - v1.0 (2026-07-06): MVP — Schmidt-only allowlist; Daily Submission; dry-run preview.
 *
 * PURPOSE
 * - Runs from one Testing Scenarios record when Run Test? is checked.
 * - MVP Scenario Type: Daily Submission only.
 * - Creates one production-shaped Submission (Enrollment + Athlete pre-linked).
 * - Links Submission back to Testing Scenarios; writes run metadata on Testing Scenarios only.
 * - Never writes test flags or framework fields to pipeline tables.
 *
 * IMPORTANT DESIGN RULES
 * - MVP allowlist: Related Enrollment must be Schmidt test enrollment (recgP9qZYjAhE7NXm).
 * - Expanded DEV test enrollment allowlist deferred post-MVP.
 * - Pre-link Enrollment on Submission (023 skipped for inactive Schmidt enrollment).
 * - Writable Submission fields only: Enrollment, Athlete, Activity Date, Shot Total, Duplicate Review Status.
 * - Do NOT write Week, Submission Assets, XP Events, or computed fields.
 * - Dry Run? = preview/log only; no Submission create.
 * - Clear Run Test? on success, dry-run, and skip paths; leave checked on error for triage.
 *
 * THIS IS NOT
 * - Fillout intake replacement in Production.
 * - A pipeline-table test flag or Is Test Record? writer.
 * - Homework / video / milestone scenario runner (future versions).
 *
 * FOLDER
 * - 12 - Engineering Test Framework
 *
 * AUTOMATION NAME
 * - 115 - Engineering Test Framework - Run Testing Scenario Daily Submission
 *
 * TRIGGER TABLE
 * - Testing Scenarios
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Run Test? is checked
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Testing Scenarios record
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created | dry_run | skipped_invalid_enrollment | skipped_wrong_scenario | skipped_missing_input | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - testingScenarioIdOut
 * - createdSubmissionIdOut
 *
 * PRIMARY TABLES USED
 * - Testing Scenarios, Enrollments, Submissions
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Testing Scenarios → Linked Submission, Last Run Status, Last Run At, Actual Result, Pass/Fail Notes, Run Test? (cleared)
 * - Submissions → production-shaped intake fields only (no test metadata)
 *
 * DEV DEPENDENCY
 * - Testing Scenarios.Shot Total (number) — on DEV since 2026-07-06 (verified).
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "115 - Engineering Test Framework - Run Testing Scenario Daily Submission",
  version: "v1.0",
  versionDate: "2026-07-06",
  originalWrittenDate: "2026-07-06",
  lastUpdated: "2026-07-06",
  folder: "12 - Engineering Test Framework",
  automationName: "115 - Engineering Test Framework - Run Testing Scenario Daily Submission",
};

/* =========================================================
   SECTION 2 — CONFIGURATION
========================================================= */

const CONFIG = {
  timeZone: "America/Denver",

  tables: {
    testingScenarios: "Testing Scenarios",
    enrollments: "Enrollments",
    submissions: "Submissions",
  },

  /** MVP Schmidt-only. Expanded allowlist deferred (C-019 / post-MVP). */
  allowedEnrollmentIds: ["recgP9qZYjAhE7NXm"],

  scenarioTypes: {
    dailySubmission: "Daily Submission",
  },

  testingScenarioFields: {
    scenarioType: "Scenario Type",
    relatedEnrollment: "Related Enrollment",
    submissionDate: "Submission Date",
    shotTotal: "Shot Total",
    scenarioRequirements: "Scenario Requirements",
    runTest: "Run Test?",
    dryRun: "Dry Run?",
    linkedSubmission: "Linked Submission",
    lastRunStatus: "Last Run Status",
    lastRunAt: "Last Run At",
    actualResult: "Actual Result",
    passFailNotes: "Pass/Fail Notes",
  },

  enrollmentFields: {
    athlete: "Athlete",
  },

  submissionFields: {
    enrollment: "Enrollment",
    athlete: "Athlete",
    activityDate: "Activity Date",
    shotTotal: "Shot Total",
    duplicateReviewStatus: "Duplicate Review Status",
  },

  duplicateReviewStatus: {
    countIt: "Count It",
  },

  lastRunStatuses: {
    pass: "Pass",
    fail: "Fail",
    blocked: "Blocked",
    error: "Error",
    notRun: "Not Run",
  },

  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },

  actions: {
    created: "created",
    dryRun: "dry_run",
    skippedInvalidEnrollment: "skipped_invalid_enrollment",
    skippedWrongScenario: "skipped_wrong_scenario",
    skippedMissingInput: "skipped_missing_input",
    error: "error",
  },
};

const fieldCache = new Map();

/* =========================================================
   SECTION 3 — OUTPUT HELPERS
========================================================= */

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch {
    // Ignore output mapping errors.
  }
}

function setSkippedOutputs({ actionOut, errorOut, debugStep, testingScenarioId = "" }) {
  setOutputSafe("statusOut", CONFIG.statuses.skipped);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut || "");
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("testingScenarioIdOut", testingScenarioId);
  setOutputSafe("createdSubmissionIdOut", "");
}

/* =========================================================
   SECTION 4 — FIELD / SCHEMA HELPERS
========================================================= */

function getFieldSafe(table, fieldName) {
  if (!table || !fieldName) return null;
  const cacheKey = `${table.name}:${fieldName}`;
  if (fieldCache.has(cacheKey)) return fieldCache.get(cacheKey);
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

function getText(record, fieldName) {
  if (!fieldName) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, fieldName) {
  if (!fieldName) return 0;
  const value = record.getCellValue(fieldName);
  if (typeof value === "number") return value;
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
  return ["1", "true", "yes", "checked"].includes(text);
}

function getLinkedIds(record, fieldName) {
  if (!fieldName) return [];
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.id).filter(Boolean);
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

function singleSelectValue(table, fieldName, choiceName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return undefined;
  if (field.type === "singleSelect") {
    const choices = field.options?.choices || [];
    if (!choices.some((choice) => choice.name === choiceName)) {
      throw new Error(
        `Missing single-select option "${choiceName}" on ${table.name} -> ${fieldName}.`
      );
    }
    return { name: choiceName };
  }
  return choiceName;
}

function validateRequiredSchema(tables) {
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.scenarioType);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.relatedEnrollment);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.submissionDate);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.shotTotal);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.runTest);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.dryRun);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.linkedSubmission);
  requireField(tables.enrollments, CONFIG.enrollmentFields.athlete);
  requireField(tables.submissions, CONFIG.submissionFields.enrollment);
  requireField(tables.submissions, CONFIG.submissionFields.athlete);
  requireField(tables.submissions, CONFIG.submissionFields.activityDate);
  requireField(tables.submissions, CONFIG.submissionFields.shotTotal);
  requireField(tables.submissions, CONFIG.submissionFields.duplicateReviewStatus);
}

function isAllowedEnrollmentId(enrollmentId) {
  return CONFIG.allowedEnrollmentIds.includes(enrollmentId);
}

function buildDryRunPreview({ scenarioRecord, enrollmentId, athleteId, activityDate, shotTotal }) {
  return {
    mode: "dry_run",
    scenarioType: getText(scenarioRecord, CONFIG.testingScenarioFields.scenarioType),
    enrollmentId,
    athleteId,
    activityDate: activityDate ? activityDate.toISOString() : "",
    shotTotal,
    submissionPayload: {
      [CONFIG.submissionFields.enrollment]: [{ id: enrollmentId }],
      [CONFIG.submissionFields.athlete]: [{ id: athleteId }],
      [CONFIG.submissionFields.activityDate]: activityDate,
      [CONFIG.submissionFields.shotTotal]: shotTotal,
      [CONFIG.submissionFields.duplicateReviewStatus]: CONFIG.duplicateReviewStatus.countIt,
    },
    note: "No Submission created. Uncheck Dry Run? and re-trigger to create.",
  };
}

async function updateTestingScenario(testingScenariosTable, scenarioId, fields) {
  const safeFields = buildSafeUpdatePayload(testingScenariosTable, fields);
  if (Object.keys(safeFields).length > 0) {
    await testingScenariosTable.updateRecordAsync(scenarioId, safeFields);
  }
}

async function finishScenarioRun({
  testingScenariosTable,
  scenarioId,
  debugStep,
  actionOut,
  statusOut,
  errorOut,
  createdSubmissionId,
  runMetadata,
  clearRunTest,
}) {
  const updateFields = {
    [CONFIG.testingScenarioFields.lastRunAt]: new Date(),
    ...runMetadata,
  };
  if (clearRunTest) {
    updateFields[CONFIG.testingScenarioFields.runTest] = false;
  }
  await updateTestingScenario(testingScenariosTable, scenarioId, updateFields);

  setOutputSafe("statusOut", statusOut);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut || "");
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("testingScenarioIdOut", scenarioId);
  setOutputSafe("createdSubmissionIdOut", createdSubmissionId || "");
}

/* =========================================================
   SECTION 5 — MAIN
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
    throw new Error(`Invalid Testing Scenarios recordId input: ${recordId}`);
  }

  const testingScenariosTable = base.getTable(CONFIG.tables.testingScenarios);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);

  debugStep = "2 - Validate schema";
  setOutputSafe("debugStep", debugStep);
  validateRequiredSchema({
    testingScenarios: testingScenariosTable,
    enrollments: enrollmentsTable,
    submissions: submissionsTable,
  });

  debugStep = "3 - Load Testing Scenarios row";
  setOutputSafe("debugStep", debugStep);

  const scenarioFieldsToLoad = [
    CONFIG.testingScenarioFields.scenarioType,
    CONFIG.testingScenarioFields.relatedEnrollment,
    CONFIG.testingScenarioFields.submissionDate,
    CONFIG.testingScenarioFields.shotTotal,
    CONFIG.testingScenarioFields.scenarioRequirements,
    CONFIG.testingScenarioFields.runTest,
    CONFIG.testingScenarioFields.dryRun,
    CONFIG.testingScenarioFields.linkedSubmission,
    CONFIG.testingScenarioFields.actualResult,
    CONFIG.testingScenarioFields.passFailNotes,
  ].filter((fieldName) => fieldExists(testingScenariosTable, fieldName));

  const scenarioRecord = await testingScenariosTable.selectRecordAsync(recordId, {
    fields: scenarioFieldsToLoad,
  });

  if (!scenarioRecord) {
    throw new Error(`Testing Scenarios record not found: ${recordId}`);
  }

  const scenarioType = getText(scenarioRecord, CONFIG.testingScenarioFields.scenarioType);
  if (scenarioType !== CONFIG.scenarioTypes.dailySubmission) {
    await finishScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      debugStep,
      actionOut: CONFIG.actions.skippedWrongScenario,
      statusOut: CONFIG.statuses.skipped,
      errorOut: `MVP supports "${CONFIG.scenarioTypes.dailySubmission}" only. Found: "${scenarioType || "blank"}".`,
      createdSubmissionId: "",
      clearRunTest: true,
      runMetadata: {
        [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
          testingScenariosTable,
          CONFIG.testingScenarioFields.lastRunStatus,
          CONFIG.lastRunStatuses.blocked
        ),
        [CONFIG.testingScenarioFields.actualResult]: `Skipped — scenario type not supported in v1.0.`,
        [CONFIG.testingScenarioFields.passFailNotes]: `Use Scenario Type = ${CONFIG.scenarioTypes.dailySubmission}.`,
      },
    });
    return;
  }

  const enrollmentIds = getLinkedIds(
    scenarioRecord,
    CONFIG.testingScenarioFields.relatedEnrollment
  );
  const enrollmentId = enrollmentIds[0] || "";

  if (!enrollmentId) {
    await finishScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      debugStep,
      actionOut: CONFIG.actions.skippedMissingInput,
      statusOut: CONFIG.statuses.skipped,
      errorOut: "Related Enrollment is required.",
      createdSubmissionId: "",
      clearRunTest: true,
      runMetadata: {
        [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
          testingScenariosTable,
          CONFIG.testingScenarioFields.lastRunStatus,
          CONFIG.lastRunStatuses.blocked
        ),
        [CONFIG.testingScenarioFields.actualResult]: "Missing Related Enrollment.",
      },
    });
    return;
  }

  if (!isAllowedEnrollmentId(enrollmentId)) {
    await finishScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      debugStep,
      actionOut: CONFIG.actions.skippedInvalidEnrollment,
      statusOut: CONFIG.statuses.skipped,
      errorOut: `Enrollment ${enrollmentId} is not in MVP allowlist. Schmidt only: ${CONFIG.allowedEnrollmentIds.join(", ")}.`,
      createdSubmissionId: "",
      clearRunTest: true,
      runMetadata: {
        [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
          testingScenariosTable,
          CONFIG.testingScenarioFields.lastRunStatus,
          CONFIG.lastRunStatuses.blocked
        ),
        [CONFIG.testingScenarioFields.actualResult]: "Enrollment not allowed for MVP.",
        [CONFIG.testingScenarioFields.passFailNotes]:
          "Use Schmidt test enrollment recgP9qZYjAhE7NXm. Expanded allowlist deferred.",
      },
    });
    return;
  }

  const activityDate = getDateValue(scenarioRecord, CONFIG.testingScenarioFields.submissionDate);
  if (!activityDate) {
    await finishScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      debugStep,
      actionOut: CONFIG.actions.skippedMissingInput,
      statusOut: CONFIG.statuses.skipped,
      errorOut: "Submission Date is required.",
      createdSubmissionId: "",
      clearRunTest: true,
      runMetadata: {
        [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
          testingScenariosTable,
          CONFIG.testingScenarioFields.lastRunStatus,
          CONFIG.lastRunStatuses.blocked
        ),
        [CONFIG.testingScenarioFields.actualResult]: "Missing Submission Date.",
      },
    });
    return;
  }

  const shotTotal = getNumber(scenarioRecord, CONFIG.testingScenarioFields.shotTotal);
  if (!shotTotal || shotTotal <= 0) {
    await finishScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      debugStep,
      actionOut: CONFIG.actions.skippedMissingInput,
      statusOut: CONFIG.statuses.skipped,
      errorOut: "Shot Total must be a positive number on Testing Scenarios.",
      createdSubmissionId: "",
      clearRunTest: true,
      runMetadata: {
        [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
          testingScenariosTable,
          CONFIG.testingScenarioFields.lastRunStatus,
          CONFIG.lastRunStatuses.blocked
        ),
        [CONFIG.testingScenarioFields.actualResult]:
          "Missing or invalid Shot Total. Add Testing Scenarios.Shot Total on DEV.",
      },
    });
    return;
  }

  debugStep = "4 - Load Enrollment and resolve Athlete";
  setOutputSafe("debugStep", debugStep);

  const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId, {
    fields: [CONFIG.enrollmentFields.athlete],
  });

  if (!enrollmentRecord) {
    throw new Error(`Enrollment record not found: ${enrollmentId}`);
  }

  const athleteId = getLinkedIds(enrollmentRecord, CONFIG.enrollmentFields.athlete)[0] || "";
  if (!athleteId) {
    throw new Error(`Enrollment ${enrollmentId} is missing linked Athlete.`);
  }

  const isDryRun = getBooleanish(scenarioRecord, CONFIG.testingScenarioFields.dryRun, false);

  if (isDryRun) {
    debugStep = "5 - Dry run preview";
    setOutputSafe("debugStep", debugStep);

    const preview = buildDryRunPreview({
      scenarioRecord,
      enrollmentId,
      athleteId,
      activityDate,
      shotTotal,
    });

    await finishScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      debugStep,
      actionOut: CONFIG.actions.dryRun,
      statusOut: CONFIG.statuses.success,
      errorOut: "",
      createdSubmissionId: "",
      clearRunTest: true,
      runMetadata: {
        [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
          testingScenariosTable,
          CONFIG.testingScenarioFields.lastRunStatus,
          CONFIG.lastRunStatuses.pass
        ),
        [CONFIG.testingScenarioFields.actualResult]: JSON.stringify(preview, null, 2),
        [CONFIG.testingScenarioFields.passFailNotes]:
          "Dry run — no Submission created. Pipeline automations not triggered.",
      },
    });

    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.success,
        actionOut: CONFIG.actions.dryRun,
        testingScenarioId: recordId,
        preview,
      })
    );
    return;
  }

  debugStep = "6 - Create Submission";
  setOutputSafe("debugStep", debugStep);

  const submissionPayload = {};
  addIfWritable(submissionsTable, submissionPayload, CONFIG.submissionFields.enrollment, [
    { id: enrollmentId },
  ]);
  addIfWritable(submissionsTable, submissionPayload, CONFIG.submissionFields.athlete, [
    { id: athleteId },
  ]);
  addIfWritable(
    submissionsTable,
    submissionPayload,
    CONFIG.submissionFields.activityDate,
    activityDate
  );
  addIfWritable(submissionsTable, submissionPayload, CONFIG.submissionFields.shotTotal, shotTotal);
  addIfWritable(
    submissionsTable,
    submissionPayload,
    CONFIG.submissionFields.duplicateReviewStatus,
    singleSelectValue(
      submissionsTable,
      CONFIG.submissionFields.duplicateReviewStatus,
      CONFIG.duplicateReviewStatus.countIt
    )
  );

  if (Object.keys(submissionPayload).length === 0) {
    throw new Error("No writable Submission fields available for create.");
  }

  const createdSubmissionId = await submissionsTable.createRecordAsync(submissionPayload);

  debugStep = "7 - Link Submission and write run metadata";
  setOutputSafe("debugStep", debugStep);

  const actualResultLines = [
    `Created Submission ${createdSubmissionId}.`,
    `Enrollment: ${enrollmentId}.`,
    `Athlete: ${athleteId}.`,
    `Activity Date: ${activityDate.toISOString()}.`,
    `Shot Total: ${shotTotal}.`,
    `Duplicate Review Status: ${CONFIG.duplicateReviewStatus.countIt}.`,
    "Downstream automations (005, 009, 010, …) should run from normal triggers.",
  ];

  await finishScenarioRun({
    testingScenariosTable,
    scenarioId: recordId,
    debugStep: "8 - Finish",
    actionOut: CONFIG.actions.created,
    statusOut: CONFIG.statuses.success,
    errorOut: "",
    createdSubmissionId,
    clearRunTest: true,
    runMetadata: {
      [CONFIG.testingScenarioFields.linkedSubmission]: [{ id: createdSubmissionId }],
      [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
        testingScenariosTable,
        CONFIG.testingScenarioFields.lastRunStatus,
        CONFIG.lastRunStatuses.pass
      ),
      [CONFIG.testingScenarioFields.actualResult]: actualResultLines.join("\n"),
      [CONFIG.testingScenarioFields.passFailNotes]:
        "Verify Testing views on Submissions / assets / XP for Schmidt enrollment.",
    },
  });

  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.success,
        actionOut: CONFIG.actions.created,
        testingScenarioId: recordId,
        createdSubmissionId,
        enrollmentId,
        athleteId,
        shotTotal,
      },
      null,
      2
    )
  );
}

/* =========================================================
   SECTION 6 — RUN
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
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.error,
        errorOut: message,
      },
      null,
      2
    )
  );
  throw error;
}

/*
Automation: 115 - Engineering Test Framework - Run Testing Scenario Daily Submission
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-07-07 (DEV v1.3 Tests A–D verified)
Last GitHub Update: 2026-07-07 (v1.3 — Video attachment field detection fix)

Purpose:
Creates a Fillout-shaped Submission from a Testing Scenarios row (Daily Submission, Homework, or Video).

Trigger:
Testing Scenarios when Run Test? is checked (DEV only).

Important Tables:
Testing Scenarios, Enrollments, Athletes, Submissions

Important Fields:
Run Test?, Dry Run?, Related Enrollment, Submission Date, Shot Total, Homework Assignment,
Intake Attachments, Video Feedback Focus, Video Feedback Question, Linked Submission

Notes:
GitHub is the source-of-truth copy. DEV only until promotion doc + Mike approval.
*/

/************************************************************
 * 115 - ENGINEERING TEST FRAMEWORK
 * Run Testing Scenario — Daily Submission + Homework + Video
 *
 * Version: v1.3
 * Date Written: 2026-07-06
 * Last Updated: 2026-07-07
 *
 * VERSION HISTORY
 * - v1.0 (2026-07-06): MVP — Schmidt-only allowlist; Daily Submission; dry-run preview.
 * - v1.1 (2026-07-06): Homework dry-run/live-write support validated by Tests A/B.
 * - v1.2 (2026-07-07): Added Video branch but failed Test C due to attachment field detection.
 * - v1.3 (2026-07-07): Video attachment read from Testing Scenarios **Intake Attachments** → Submissions **Video Upload**.
 *
 * PURPOSE
 * - Runs from one Testing Scenarios record when Run Test? is checked.
 * - Scenario Types: Daily Submission, Homework, Video.
 * - Creates one production-shaped Submission (Enrollment + Athlete pre-linked).
 * - Links Submission back to Testing Scenarios; writes run metadata on Testing Scenarios only.
 * - Never writes test flags or framework fields to pipeline tables.
 *
 * IMPORTANT DESIGN RULES
 * - MVP allowlist: Related Enrollment must be Schmidt test enrollment (recgP9qZYjAhE7NXm).
 * - Pre-link Enrollment on Submission (023 skipped for inactive Schmidt enrollment).
 * - Daily: writable fields — Enrollment, Athlete, Activity Date, Shot Total, Duplicate Review Status.
 * - Homework: writable fields — Enrollment, Athlete, Activity Date, Homework Name 1, HW Sub 1.
 *   Omit Shot Total and Duplicate Review Status (homework-only; no shot-count XP path).
 * - Homework: max 3 Intake Attachments; do not write Homework Name 2 / HW Sub 2.
 * - Video: read **Intake Attachments** on Testing Scenarios; copy to Submissions **Video Upload**.
 *   (Testing Scenarios has no Video Upload field — confirmed DEV schema + reck9d758vX5yLneq.)
 * - Do NOT write Week, Submission Assets, Homework Completions, Video Feedback, XP Events, or computed fields.
 * - Dry Run? = preview/log only; no Submission create.
 * - Clear Run Test? on success, dry-run, skip, and blocked paths; leave checked on error for triage.
 *
 * THIS IS NOT
 * - Fillout intake replacement in Production.
 * - A pipeline-table test flag or Is Test Record? writer.
 * - Milestone / combined Homework + Video scenario runner (future versions).
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
 * - actionOut = created | dry_run | blocked_* | skipped_* | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - testingScenarioIdOut
 * - createdSubmissionIdOut
 * - scenarioTypeOut
 * - createdRecordSummaryOut
 *
 * PRIMARY TABLES USED
 * - Testing Scenarios, Enrollments, Submissions
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Testing Scenarios → Linked Submission, Last Run Status, Last Run At, Actual Result, Pass/Fail Notes, Run Test? (cleared)
 * - Submissions → production-shaped intake fields only (no test metadata)
 *
 * DEV DEPENDENCY
 * - Testing Scenarios.Shot Total (number) — Daily Submission only.
 * - Testing Scenarios.Homework Assignment, Intake Attachments — Homework only.
 * - Testing Scenarios.Intake Attachments — Video file source (same field as Homework).
 * - Submissions.Video Upload — Video file destination for 009.
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "115 - Engineering Test Framework - Run Testing Scenario Daily Submission",
  version: "v1.3",
  versionDate: "2026-07-07",
  originalWrittenDate: "2026-07-06",
  lastUpdated: "2026-07-07",
  folder: "12 - Engineering Test Framework",
  automationName: "115 - Engineering Test Framework - Run Testing Scenario Daily Submission",
};

/* =========================================================
   SECTION 2 — CONFIGURATION
========================================================= */

const CONFIG = {
  timeZone: "America/Denver",
  maxHomeworkFiles: 3,
  maxVideoFiles: 3,

  tables: {
    testingScenarios: "Testing Scenarios",
    enrollments: "Enrollments",
    submissions: "Submissions",
  },

  /** MVP Schmidt-only. Expanded allowlist deferred (C-019 / post-MVP). */
  allowedEnrollmentIds: ["recgP9qZYjAhE7NXm"],

  scenarioTypes: {
    dailySubmission: "Daily Submission",
    homework: "Homework",
    video: "Video",
    threeVideoUpload: "Three Video Upload",
  },

  /** Testing Scenarios video file source — canonical DEV field (no Video Upload on this table). */
  testingScenarioVideoAttachmentFields: ["Intake Attachments"],

  testingScenarioFields: {
    scenarioType: "Scenario Type",
    relatedEnrollment: "Related Enrollment",
    submissionDate: "Submission Date",
    shotTotal: "Shot Total",
    homeworkAssignment: "Homework Assignment",
    intakeAttachments: "Intake Attachments",
    videoFeedbackFocus: "Video Feedback Focus",
    videoFeedbackQuestion: "Video Feedback Question",
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
    homeworkName1: "Homework Name 1",
    hwSub1: "HW Sub 1",
    videoFeedbackFocus: "Video Feedback Focus",
    videoFeedbackNote: "Video Feedback Note",
    videoUpload: "Video Upload",
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
    blockedNoFiles: "blocked_no_files",
    blockedTooManyFiles: "blocked_too_many_files",
    error: "error",
  },
};

const SUPPORTED_SCENARIO_TYPES = new Set([
  CONFIG.scenarioTypes.dailySubmission,
  CONFIG.scenarioTypes.homework,
  CONFIG.scenarioTypes.video,
  CONFIG.scenarioTypes.threeVideoUpload,
]);

function isVideoScenarioType(scenarioType) {
  return (
    scenarioType === CONFIG.scenarioTypes.video ||
    scenarioType === CONFIG.scenarioTypes.threeVideoUpload
  );
}

function normalizeScenarioTypeForOutput(scenarioType) {
  return isVideoScenarioType(scenarioType) ? CONFIG.scenarioTypes.video : scenarioType;
}

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

function getAttachments(record, fieldName) {
  if (!fieldName || !record) return [];
  try {
    const value = record.getCellValue(fieldName);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function attachmentFilename(file) {
  return String(file?.filename || file?.name || "").trim();
}

function listAttachmentFilenames(files) {
  return (files || []).map(attachmentFilename).filter(Boolean);
}

function getTestingScenarioVideoAttachmentFieldNames(table) {
  return CONFIG.testingScenarioVideoAttachmentFields.filter((fieldName) =>
    fieldExists(table, fieldName)
  );
}

function getVideoAttachmentsFromScenario(record, table) {
  const candidateFields = getTestingScenarioVideoAttachmentFieldNames(table);
  let best = { files: [], sourceField: "", candidateFields };

  for (const fieldName of candidateFields) {
    const files = getAttachments(record, fieldName);
    if (files.length > best.files.length) {
      best = { files, sourceField: fieldName, candidateFields };
    }
  }

  return best;
}

function buildAttachmentWritePayload(files) {
  return (files || [])
    .filter((file) => file && file.url)
    .map((file) => ({
      url: file.url,
      filename: file.filename || "uploaded_file",
    }));
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

function validateCommonSchema(tables) {
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.scenarioType);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.relatedEnrollment);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.submissionDate);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.runTest);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.dryRun);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.linkedSubmission);
  requireField(tables.enrollments, CONFIG.enrollmentFields.athlete);
  requireField(tables.submissions, CONFIG.submissionFields.enrollment);
  requireField(tables.submissions, CONFIG.submissionFields.athlete);
  requireField(tables.submissions, CONFIG.submissionFields.activityDate);
}

function validateDailySubmissionSchema(tables) {
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.shotTotal);
  requireField(tables.submissions, CONFIG.submissionFields.shotTotal);
  requireField(tables.submissions, CONFIG.submissionFields.duplicateReviewStatus);
}

function validateHomeworkSchema(tables) {
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.homeworkAssignment);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.intakeAttachments);
  requireField(tables.submissions, CONFIG.submissionFields.homeworkName1);
  requireField(tables.submissions, CONFIG.submissionFields.hwSub1);
}

function validateVideoSchema(tables) {
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.videoFeedbackFocus);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.videoFeedbackQuestion);
  requireField(tables.testingScenarios, CONFIG.testingScenarioFields.intakeAttachments);
  requireField(tables.submissions, CONFIG.submissionFields.videoFeedbackFocus);
  requireField(tables.submissions, CONFIG.submissionFields.videoFeedbackNote);
  requireField(tables.submissions, CONFIG.submissionFields.videoUpload);
}

function isAllowedEnrollmentId(enrollmentId) {
  return CONFIG.allowedEnrollmentIds.includes(enrollmentId);
}

function buildDailyDryRunPreview({ scenarioRecord, enrollmentId, athleteId, activityDate, shotTotal }) {
  return {
    mode: "dry_run",
    scenarioType: CONFIG.scenarioTypes.dailySubmission,
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

function buildHomeworkDryRunPreview({
  enrollmentId,
  athleteId,
  activityDate,
  homeworkAssignmentId,
  intakeFiles,
}) {
  const attachmentPayload = buildAttachmentWritePayload(intakeFiles);
  return {
    mode: "dry_run",
    scenarioType: CONFIG.scenarioTypes.homework,
    enrollmentId,
    athleteId,
    activityDate: activityDate ? activityDate.toISOString() : "",
    homeworkAssignmentId,
    fileCount: attachmentPayload.length,
    submissionPayload: {
      [CONFIG.submissionFields.enrollment]: [{ id: enrollmentId }],
      [CONFIG.submissionFields.athlete]: [{ id: athleteId }],
      [CONFIG.submissionFields.activityDate]: activityDate,
      [CONFIG.submissionFields.homeworkName1]: [{ id: homeworkAssignmentId }],
      [CONFIG.submissionFields.hwSub1]: attachmentPayload,
    },
    omittedFields: ["Shot Total", "Duplicate Review Status", "Homework Name 2", "HW Sub 2"],
    note: "No Submission created. Uncheck Dry Run? and re-trigger to create.",
  };
}

function buildVideoDryRunPreview({
  enrollmentId,
  athleteId,
  activityDate,
  videoFeedbackFocus,
  videoFeedbackQuestion,
  videoFiles,
  sourceField,
  candidateFields,
}) {
  const attachmentPayload = buildAttachmentWritePayload(videoFiles);
  const filenames = listAttachmentFilenames(videoFiles);
  return {
    mode: "dry_run",
    scenarioType: CONFIG.scenarioTypes.video,
    enrollmentId,
    athleteId,
    activityDate: activityDate ? activityDate.toISOString() : "",
    videoFeedbackFocus,
    videoFeedbackQuestion,
    sourceField,
    candidateAttachmentFields: candidateFields,
    fileCount: videoFiles.length,
    filenames,
    submissionPayload: {
      [CONFIG.submissionFields.enrollment]: [{ id: enrollmentId }],
      [CONFIG.submissionFields.athlete]: [{ id: athleteId }],
      [CONFIG.submissionFields.activityDate]: activityDate,
      [CONFIG.submissionFields.videoFeedbackFocus]: videoFeedbackFocus,
      [CONFIG.submissionFields.videoFeedbackNote]: videoFeedbackQuestion,
      [CONFIG.submissionFields.videoUpload]: attachmentPayload,
    },
    omittedFields: [
      "Shot Total",
      "Duplicate Review Status",
      "Homework Name 1",
      "HW Sub 1",
      "Homework Name 2",
      "HW Sub 2",
    ],
    downstreamExpectation:
      "005 (Week) → 009 (N video assets) → 013 (N Video Feedback rows). 070b OFF on DEV.",
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
  scenarioType,
  debugStep,
  actionOut,
  statusOut,
  errorOut,
  createdSubmissionId,
  createdRecordSummary,
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
  setOutputSafe("scenarioTypeOut", scenarioType || "");
  setOutputSafe("createdRecordSummaryOut", createdRecordSummary || "");
}

async function blockScenarioRun({
  testingScenariosTable,
  scenarioId,
  scenarioType,
  debugStep,
  actionOut,
  errorOut,
  actualResult,
  passFailNotes,
  statusOut = CONFIG.statuses.skipped,
  lastRunStatus = CONFIG.lastRunStatuses.blocked,
}) {
  await finishScenarioRun({
    testingScenariosTable,
    scenarioId,
    scenarioType,
    debugStep,
    actionOut,
    statusOut,
    errorOut,
    createdSubmissionId: "",
    createdRecordSummary: "",
    clearRunTest: true,
    runMetadata: {
      [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
        testingScenariosTable,
        CONFIG.testingScenarioFields.lastRunStatus,
        lastRunStatus
      ),
      [CONFIG.testingScenarioFields.actualResult]: actualResult,
      [CONFIG.testingScenarioFields.passFailNotes]: passFailNotes || errorOut,
    },
  });
}

/* =========================================================
   SECTION 5 — SCENARIO BRANCHES
========================================================= */

async function runDailySubmissionBranch({
  testingScenariosTable,
  submissionsTable,
  scenarioRecord,
  recordId,
  enrollmentId,
  athleteId,
  activityDate,
  isDryRun,
  debugStep,
}) {
  validateDailySubmissionSchema({
    testingScenarios: testingScenariosTable,
    submissions: submissionsTable,
  });

  const shotTotal = getNumber(scenarioRecord, CONFIG.testingScenarioFields.shotTotal);
  if (!shotTotal || shotTotal <= 0) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.dailySubmission,
      debugStep,
      actionOut: CONFIG.actions.skippedMissingInput,
      errorOut: "Shot Total must be a positive number on Testing Scenarios.",
      actualResult:
        "Missing or invalid Shot Total. Add Testing Scenarios.Shot Total on DEV.",
    });
    return;
  }

  if (isDryRun) {
    const preview = buildDailyDryRunPreview({
      scenarioRecord,
      enrollmentId,
      athleteId,
      activityDate,
      shotTotal,
    });

    await finishScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.dailySubmission,
      debugStep: "5 - Daily dry run preview",
      actionOut: CONFIG.actions.dryRun,
      statusOut: CONFIG.statuses.success,
      errorOut: "",
      createdSubmissionId: "",
      createdRecordSummary: `Dry run — Daily Submission; Shot Total ${shotTotal}.`,
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
        scenarioType: CONFIG.scenarioTypes.dailySubmission,
        testingScenarioId: recordId,
        preview,
      })
    );
    return;
  }

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
    throw new Error("No writable Submission fields available for Daily Submission create.");
  }

  const createdSubmissionId = await submissionsTable.createRecordAsync(submissionPayload);

  const actualResultLines = [
    `Created Submission ${createdSubmissionId}.`,
    `Scenario Type: ${CONFIG.scenarioTypes.dailySubmission}.`,
    `Enrollment: ${enrollmentId}.`,
    `Athlete: ${athleteId}.`,
    `Activity Date: ${activityDate.toISOString()}.`,
    `Shot Total: ${shotTotal}.`,
    `Duplicate Review Status: ${CONFIG.duplicateReviewStatus.countIt}.`,
    "Downstream automations (005, 009, 010, …) should run from normal triggers.",
  ];

  const summary = `Daily Submission ${createdSubmissionId}; Shot Total ${shotTotal}.`;

  await finishScenarioRun({
    testingScenariosTable,
    scenarioId: recordId,
    scenarioType: CONFIG.scenarioTypes.dailySubmission,
    debugStep: "8 - Finish daily",
    actionOut: CONFIG.actions.created,
    statusOut: CONFIG.statuses.success,
    errorOut: "",
    createdSubmissionId,
    createdRecordSummary: summary,
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
        scenarioType: CONFIG.scenarioTypes.dailySubmission,
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

async function runHomeworkBranch({
  testingScenariosTable,
  submissionsTable,
  scenarioRecord,
  recordId,
  enrollmentId,
  athleteId,
  activityDate,
  isDryRun,
  debugStep,
}) {
  validateHomeworkSchema({
    testingScenarios: testingScenariosTable,
    submissions: submissionsTable,
  });

  const homeworkAssignmentIds = getLinkedIds(
    scenarioRecord,
    CONFIG.testingScenarioFields.homeworkAssignment
  );
  const homeworkAssignmentId = homeworkAssignmentIds[0] || "";

  if (!homeworkAssignmentId) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.homework,
      debugStep,
      actionOut: CONFIG.actions.skippedMissingInput,
      errorOut: "Homework Assignment is required.",
      actualResult: "Missing Homework Assignment link on Testing Scenarios.",
      passFailNotes: "Link one FBC Curriculum - SYNC record to Homework Assignment.",
    });
    return;
  }

  const intakeFiles = getAttachments(
    scenarioRecord,
    CONFIG.testingScenarioFields.intakeAttachments
  );
  const fileCount = intakeFiles.length;

  if (fileCount === 0) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.homework,
      debugStep,
      actionOut: CONFIG.actions.blockedNoFiles,
      errorOut: "Intake Attachments must include at least one homework file.",
      actualResult: "Blocked — no Intake Attachments on Testing Scenarios.",
      passFailNotes: "Add 1–3 homework files to Intake Attachments.",
      lastRunStatus: CONFIG.lastRunStatuses.fail,
    });
    return;
  }

  if (fileCount > CONFIG.maxHomeworkFiles) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.homework,
      debugStep,
      actionOut: CONFIG.actions.blockedTooManyFiles,
      errorOut: `Intake Attachments count ${fileCount} exceeds max ${CONFIG.maxHomeworkFiles}.`,
      actualResult: `Blocked — ${fileCount} files attached; maximum is ${CONFIG.maxHomeworkFiles}. No Submission created.`,
      passFailNotes:
        "Homework MVP allows 1–3 files for one assignment. Remove extra files and re-run.",
      lastRunStatus: CONFIG.lastRunStatuses.blocked,
    });
    return;
  }

  const hwSub1Payload = buildAttachmentWritePayload(intakeFiles);
  if (hwSub1Payload.length === 0) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.homework,
      debugStep,
      actionOut: CONFIG.actions.blockedNoFiles,
      errorOut: "Intake Attachments have no usable file URLs.",
      actualResult: "Blocked — attachment rows missing url.",
      passFailNotes: "Re-attach homework files on Testing Scenarios.",
      lastRunStatus: CONFIG.lastRunStatuses.fail,
    });
    return;
  }

  if (isDryRun) {
    const preview = buildHomeworkDryRunPreview({
      enrollmentId,
      athleteId,
      activityDate,
      homeworkAssignmentId,
      intakeFiles,
    });

    await finishScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.homework,
      debugStep: "5 - Homework dry run preview",
      actionOut: CONFIG.actions.dryRun,
      statusOut: CONFIG.statuses.success,
      errorOut: "",
      createdSubmissionId: "",
      createdRecordSummary: `Dry run — Homework; ${hwSub1Payload.length} file(s); assignment ${homeworkAssignmentId}.`,
      clearRunTest: true,
      runMetadata: {
        [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
          testingScenariosTable,
          CONFIG.testingScenarioFields.lastRunStatus,
          CONFIG.lastRunStatuses.pass
        ),
        [CONFIG.testingScenarioFields.actualResult]: JSON.stringify(preview, null, 2),
        [CONFIG.testingScenarioFields.passFailNotes]:
          "Dry run — no Submission created. Expect 005 → 009 → 020 on live run.",
      },
    });

    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.success,
        actionOut: CONFIG.actions.dryRun,
        scenarioType: CONFIG.scenarioTypes.homework,
        testingScenarioId: recordId,
        preview,
      })
    );
    return;
  }

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
  addIfWritable(submissionsTable, submissionPayload, CONFIG.submissionFields.homeworkName1, [
    { id: homeworkAssignmentId },
  ]);
  addIfWritable(submissionsTable, submissionPayload, CONFIG.submissionFields.hwSub1, hwSub1Payload);

  if (Object.keys(submissionPayload).length === 0) {
    throw new Error("No writable Submission fields available for Homework create.");
  }

  const createdSubmissionId = await submissionsTable.createRecordAsync(submissionPayload);

  const actualResultLines = [
    `Created Submission ${createdSubmissionId}.`,
    `Scenario Type: ${CONFIG.scenarioTypes.homework}.`,
    `Enrollment: ${enrollmentId}.`,
    `Athlete: ${athleteId}.`,
    `Activity Date: ${activityDate.toISOString()}.`,
    `Homework Name 1: ${homeworkAssignmentId}.`,
    `HW Sub 1 file count: ${hwSub1Payload.length}.`,
    "Omitted: Shot Total, Duplicate Review Status, Homework Name 2, HW Sub 2, Video fields.",
    "Downstream: 005 (Week) → 009 (assets) → 020 (one Homework Completion). 070a OFF on DEV.",
  ];

  const summary = `Homework Submission ${createdSubmissionId}; ${hwSub1Payload.length} file(s); assignment ${homeworkAssignmentId}.`;

  await finishScenarioRun({
    testingScenariosTable,
    scenarioId: recordId,
    scenarioType: CONFIG.scenarioTypes.homework,
    debugStep: "8 - Finish homework",
    actionOut: CONFIG.actions.created,
    statusOut: CONFIG.statuses.success,
    errorOut: "",
    createdSubmissionId,
    createdRecordSummary: summary,
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
        "Verify: N Submission Assets (HW1-1…), one Homework Completion, all assets linked.",
    },
  });

  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.success,
        actionOut: CONFIG.actions.created,
        scenarioType: CONFIG.scenarioTypes.homework,
        testingScenarioId: recordId,
        createdSubmissionId,
        enrollmentId,
        athleteId,
        homeworkAssignmentId,
        fileCount: hwSub1Payload.length,
      },
      null,
      2
    )
  );
}

async function runVideoBranch({
  testingScenariosTable,
  submissionsTable,
  scenarioRecord,
  recordId,
  enrollmentId,
  athleteId,
  activityDate,
  isDryRun,
  debugStep,
}) {
  validateVideoSchema({
    testingScenarios: testingScenariosTable,
    submissions: submissionsTable,
  });

  const videoFeedbackFocus = getText(
    scenarioRecord,
    CONFIG.testingScenarioFields.videoFeedbackFocus
  );
  if (!videoFeedbackFocus) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.video,
      debugStep,
      actionOut: CONFIG.actions.skippedMissingInput,
      errorOut: "Video Feedback Focus is required.",
      actualResult: "Missing Video Feedback Focus on Testing Scenarios.",
      passFailNotes: "Select one Video Feedback Focus before running.",
    });
    return;
  }

  const videoFeedbackQuestion = getText(
    scenarioRecord,
    CONFIG.testingScenarioFields.videoFeedbackQuestion
  );
  if (!videoFeedbackQuestion) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.video,
      debugStep,
      actionOut: CONFIG.actions.skippedMissingInput,
      errorOut: "Video Feedback Question is required.",
      actualResult: "Missing Video Feedback Question on Testing Scenarios.",
      passFailNotes: "Enter a Video Feedback Question before running.",
    });
    return;
  }

  const {
    files: videoFiles,
    sourceField: videoAttachmentSourceField,
    candidateFields: videoAttachmentCandidateFields,
  } = getVideoAttachmentsFromScenario(scenarioRecord, testingScenariosTable);
  const fileCount = videoFiles.length;

  if (fileCount === 0) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.video,
      debugStep,
      actionOut: CONFIG.actions.blockedNoFiles,
      errorOut: "Video scenario must include at least one attachment on Testing Scenarios.",
      actualResult: `Blocked — no video attachments found on Testing Scenarios (checked: ${videoAttachmentCandidateFields.join(", ") || "none"}).`,
      passFailNotes:
        "Add 1–3 video files to Intake Attachments on Testing Scenarios.",
      lastRunStatus: CONFIG.lastRunStatuses.fail,
    });
    return;
  }

  if (fileCount > CONFIG.maxVideoFiles) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.video,
      debugStep,
      actionOut: CONFIG.actions.blockedTooManyFiles,
      errorOut: `Video attachment count ${fileCount} exceeds max ${CONFIG.maxVideoFiles}.`,
      actualResult: `Blocked — ${fileCount} videos attached on ${videoAttachmentSourceField}; maximum is ${CONFIG.maxVideoFiles}. No Submission created.`,
      passFailNotes: "Video MVP allows 1–3 files per submission. Remove extra files and re-run.",
      lastRunStatus: CONFIG.lastRunStatuses.blocked,
    });
    return;
  }

  const videoUploadPayload = buildAttachmentWritePayload(videoFiles);
  const videoFilenames = listAttachmentFilenames(videoFiles);
  if (videoUploadPayload.length === 0) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.video,
      debugStep,
      actionOut: CONFIG.actions.blockedNoFiles,
      errorOut: "Video attachments have no usable file URLs.",
      actualResult: `Blocked — attachment rows on ${videoAttachmentSourceField} missing url.`,
      passFailNotes: "Re-attach video files on Testing Scenarios.",
      lastRunStatus: CONFIG.lastRunStatuses.fail,
    });
    return;
  }

  if (isDryRun) {
    const preview = buildVideoDryRunPreview({
      enrollmentId,
      athleteId,
      activityDate,
      videoFeedbackFocus,
      videoFeedbackQuestion,
      videoFiles,
      sourceField: videoAttachmentSourceField,
      candidateFields: videoAttachmentCandidateFields,
    });

    await finishScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType: CONFIG.scenarioTypes.video,
      debugStep: "5 - Video dry run preview",
      actionOut: CONFIG.actions.dryRun,
      statusOut: CONFIG.statuses.success,
      errorOut: "",
      createdSubmissionId: "",
      createdRecordSummary: `Dry run — Video; ${videoUploadPayload.length} file(s) from ${videoAttachmentSourceField}; focus ${videoFeedbackFocus}.`,
      clearRunTest: true,
      runMetadata: {
        [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
          testingScenariosTable,
          CONFIG.testingScenarioFields.lastRunStatus,
          CONFIG.lastRunStatuses.pass
        ),
        [CONFIG.testingScenarioFields.actualResult]: JSON.stringify(preview, null, 2),
        [CONFIG.testingScenarioFields.passFailNotes]:
          "Dry run — no Submission created. Expect 005 → 009 → 013 on live run. 070b OFF on DEV.",
      },
    });

    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.success,
        actionOut: CONFIG.actions.dryRun,
        scenarioType: CONFIG.scenarioTypes.video,
        testingScenarioId: recordId,
        preview,
      })
    );
    return;
  }

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
  addIfWritable(
    submissionsTable,
    submissionPayload,
    CONFIG.submissionFields.videoFeedbackFocus,
    singleSelectValue(
      submissionsTable,
      CONFIG.submissionFields.videoFeedbackFocus,
      videoFeedbackFocus
    )
  );
  addIfWritable(
    submissionsTable,
    submissionPayload,
    CONFIG.submissionFields.videoFeedbackNote,
    videoFeedbackQuestion
  );
  addIfWritable(
    submissionsTable,
    submissionPayload,
    CONFIG.submissionFields.videoUpload,
    videoUploadPayload
  );

  if (Object.keys(submissionPayload).length === 0) {
    throw new Error("No writable Submission fields available for Video create.");
  }

  const createdSubmissionId = await submissionsTable.createRecordAsync(submissionPayload);

  const actualResultLines = [
    `Created Submission ${createdSubmissionId}.`,
    `Scenario Type: ${CONFIG.scenarioTypes.video}.`,
    `Enrollment: ${enrollmentId}.`,
    `Athlete: ${athleteId}.`,
    `Activity Date: ${activityDate.toISOString()}.`,
    `Video Feedback Focus: ${videoFeedbackFocus}.`,
    `Video Feedback Note: ${videoFeedbackQuestion.slice(0, 120)}${videoFeedbackQuestion.length > 120 ? "…" : ""}.`,
    `Video Upload file count: ${videoUploadPayload.length}.`,
    `Video source field (Testing Scenarios): ${videoAttachmentSourceField}.`,
    `Filenames: ${videoFilenames.join(", ")}.`,
    "Omitted: Shot Total, Duplicate Review Status, Homework fields, Week.",
    "Downstream: 005 (Week) → 009 (N video assets) → 013 (N Video Feedback rows). 070b OFF on DEV.",
  ];

  const summary = `Video Submission ${createdSubmissionId}; ${videoUploadPayload.length} file(s); focus ${videoFeedbackFocus}.`;

  await finishScenarioRun({
    testingScenariosTable,
    scenarioId: recordId,
    scenarioType: CONFIG.scenarioTypes.video,
    debugStep: "8 - Finish video",
    actionOut: CONFIG.actions.created,
    statusOut: CONFIG.statuses.success,
    errorOut: "",
    createdSubmissionId,
    createdRecordSummary: summary,
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
        "Verify: N Submission Assets (VID-1…), N Video Feedback rows, same Focus + Question on all.",
    },
  });

  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.success,
        actionOut: CONFIG.actions.created,
        scenarioType: CONFIG.scenarioTypes.video,
        testingScenarioId: recordId,
        createdSubmissionId,
        enrollmentId,
        athleteId,
        videoFeedbackFocus,
        fileCount: videoUploadPayload.length,
      },
      null,
      2
    )
  );
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
    throw new Error(`Invalid Testing Scenarios recordId input: ${recordId}`);
  }

  const testingScenariosTable = base.getTable(CONFIG.tables.testingScenarios);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);

  debugStep = "2 - Validate common schema";
  setOutputSafe("debugStep", debugStep);
  validateCommonSchema({
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
    CONFIG.testingScenarioFields.homeworkAssignment,
    CONFIG.testingScenarioFields.intakeAttachments,
    CONFIG.testingScenarioFields.videoFeedbackFocus,
    CONFIG.testingScenarioFields.videoFeedbackQuestion,
    CONFIG.testingScenarioFields.scenarioRequirements,
    CONFIG.testingScenarioFields.runTest,
    CONFIG.testingScenarioFields.dryRun,
    CONFIG.testingScenarioFields.linkedSubmission,
    CONFIG.testingScenarioFields.actualResult,
    CONFIG.testingScenarioFields.passFailNotes,
  ]
    .concat(getTestingScenarioVideoAttachmentFieldNames(testingScenariosTable))
    .filter((fieldName, index, all) => fieldExists(testingScenariosTable, fieldName) && all.indexOf(fieldName) === index);

  const scenarioRecord = await testingScenariosTable.selectRecordAsync(recordId, {
    fields: scenarioFieldsToLoad,
  });

  if (!scenarioRecord) {
    throw new Error(`Testing Scenarios record not found: ${recordId}`);
  }

  const scenarioType = getText(scenarioRecord, CONFIG.testingScenarioFields.scenarioType);
  setOutputSafe("scenarioTypeOut", normalizeScenarioTypeForOutput(scenarioType));

  if (!SUPPORTED_SCENARIO_TYPES.has(scenarioType)) {
    await finishScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType,
      debugStep,
      actionOut: CONFIG.actions.skippedWrongScenario,
      statusOut: CONFIG.statuses.skipped,
      errorOut: `v1.3 supports "${CONFIG.scenarioTypes.dailySubmission}", "${CONFIG.scenarioTypes.homework}", "${CONFIG.scenarioTypes.video}", and "${CONFIG.scenarioTypes.threeVideoUpload}" only. Found: "${scenarioType || "blank"}".`,
      createdSubmissionId: "",
      createdRecordSummary: "",
      clearRunTest: true,
      runMetadata: {
        [CONFIG.testingScenarioFields.lastRunStatus]: singleSelectValue(
          testingScenariosTable,
          CONFIG.testingScenarioFields.lastRunStatus,
          CONFIG.lastRunStatuses.blocked
        ),
        [CONFIG.testingScenarioFields.actualResult]: "Skipped — scenario type not supported in v1.3.",
        [CONFIG.testingScenarioFields.passFailNotes]:
          `Use Scenario Type = ${CONFIG.scenarioTypes.dailySubmission}, ${CONFIG.scenarioTypes.homework}, or ${CONFIG.scenarioTypes.video}.`,
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
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType,
      debugStep,
      actionOut: CONFIG.actions.skippedMissingInput,
      errorOut: "Related Enrollment is required.",
      actualResult: "Missing Related Enrollment.",
    });
    return;
  }

  if (!isAllowedEnrollmentId(enrollmentId)) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType,
      debugStep,
      actionOut: CONFIG.actions.skippedInvalidEnrollment,
      errorOut: `Enrollment ${enrollmentId} is not in MVP allowlist. Schmidt only: ${CONFIG.allowedEnrollmentIds.join(", ")}.`,
      actualResult: "Enrollment not allowed for MVP.",
      passFailNotes:
        "Use Schmidt test enrollment recgP9qZYjAhE7NXm. Expanded allowlist deferred.",
    });
    return;
  }

  const activityDate = getDateValue(scenarioRecord, CONFIG.testingScenarioFields.submissionDate);
  if (!activityDate) {
    await blockScenarioRun({
      testingScenariosTable,
      scenarioId: recordId,
      scenarioType,
      debugStep,
      actionOut: CONFIG.actions.skippedMissingInput,
      errorOut: "Submission Date is required.",
      actualResult: "Missing Submission Date.",
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

  if (scenarioType === CONFIG.scenarioTypes.dailySubmission) {
    await runDailySubmissionBranch({
      testingScenariosTable,
      submissionsTable,
      scenarioRecord,
      recordId,
      enrollmentId,
      athleteId,
      activityDate,
      isDryRun,
      debugStep,
    });
    return;
  }

  if (scenarioType === CONFIG.scenarioTypes.homework) {
    await runHomeworkBranch({
      testingScenariosTable,
      submissionsTable,
      scenarioRecord,
      recordId,
      enrollmentId,
      athleteId,
      activityDate,
      isDryRun,
      debugStep,
    });
    return;
  }

  if (isVideoScenarioType(scenarioType)) {
    await runVideoBranch({
      testingScenariosTable,
      submissionsTable,
      scenarioRecord,
      recordId,
      enrollmentId,
      athleteId,
      activityDate,
      isDryRun,
      debugStep,
    });
    return;
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

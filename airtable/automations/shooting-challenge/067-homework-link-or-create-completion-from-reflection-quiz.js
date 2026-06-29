/*
Automation: 067 - Homework - Link or Create Completion from Reflection Quiz
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: (new - not yet deployed)
Last GitHub Update: 2026-06-28

Purpose:
Links or creates one normal Homework Completion from a Final Reflection Quiz
Submissions row (the Fillout Homework 17 test), so Homework 17 flows through the
same grading / satisfactory / feedback / XP pipeline as all other homework.

Trigger:
Final Reflection Quiz Submissions when a row is ready to process
(recommended: when record is created, or Processing Status is Pending,
with Enrollment not empty).

Important Tables:
Final Reflection Quiz Submissions, Homework Completions, FBC Curriculum - SYNC, Enrollments

Important Fields:
Enrollment, Homework Completion, Submitted At, Processing Status, Homework, Week, Source System

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
This automation NEVER creates or modifies XP Events and NEVER marks Satisfactory.
XP is awarded only by the normal homework pipeline (064 then 065) after coach review.
*/

/************************************************************
 * 067 - Homework - Link or Create Completion from Reflection Quiz
 *
 * Version: v1.0
 * Date Written: 2026-06-28
 *
 * PURPOSE
 * - Runs from one Final Reflection Quiz Submissions record (the HW17 Fillout test).
 * - Uses the quiz row's Enrollment link to identify the athlete (never guesses).
 * - Resolves the single active HW 17 record in FBC Curriculum - SYNC and its Week.
 * - Finds or creates the matching Homework Completion using the native dedupe
 *   identity Enrollment + Week + Homework (mirrors Homework Completion Key).
 * - Links the quiz row and the completion to each other and stamps Source System = Fillout.
 * - Leaves Satisfactory? / Review Complete / Coach Feedback untouched so the normal
 *   coach review + 064/065 XP pipeline runs.
 *
 * IMPORTANT DESIGN RULES
 * - Intake only: the quiz row feeds the Homework Completion; it is not the credit record.
 * - No special pipeline: a new completion is created as Completion Status = Submitted,
 *   Review Status = Ready for Review (exactly like other homework awaiting review).
 * - Conservative matching: blank or multiple Enrollment -> Processing Status = Needs Review.
 * - Re-queries Homework Completions immediately before create to avoid duplicate rows.
 * - Never creates / modifies XP Events. Never marks Satisfactory or awards XP.
 *
 * FOLDER
 * - 06 - Homework Review and XP
 *
 * TRIGGER TABLE
 * - Final Reflection Quiz Submissions
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Final Reflection Quiz Submissions record
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created_new | linked_existing | skipped_already_linked | needs_review | error
 * - errorOut
 * - debugStep
 * - quizSubmissionId, homeworkCompletionId
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — CONFIGURATION
========================================================= */

const CONFIG = {
  scriptName: "067 - Homework - Link or Create Completion from Reflection Quiz",
  version: "v1.0",

  tables: {
    quiz: "Final Reflection Quiz Submissions",
    homework: "Homework Completions",
    curriculum: "FBC Curriculum - SYNC",
    enrollments: "Enrollments",
  },

  quiz: {
    enrollment: "Enrollment",
    homeworkCompletion: "Homework Completion",
    submittedAt: "Submitted At",
    processingStatus: "Processing Status",
    processingError: "Processing Error",
  },

  homework: {
    enrollment: "Enrollment",
    homework: "Homework",
    week: "Week",
    gradeBand: "Grade Band",
    finalQuiz: "Final Reflection Quiz Submissions",
    sourceSystem: "Source System",
    itemType: "Item Type",
    completionStatus: "Completion Status",
    reviewStatus: "Review Status",
    submissionDate: "Submission Date",
  },

  curriculum: {
    homeworkNumber: "Homework Number",
    active: "Active?",
    week: "Week",
  },

  enrollments: {
    gradeBand: "Grade Band",
  },

  values: {
    homeworkNumber17: "HW 17",
    sourceSystemFillout: "Fillout",
    itemTypeHomework: "Homework",
    completionStatusSubmitted: "Submitted",
    reviewStatusReady: "Ready for Review",
    processingProcessed: "Processed",
    processingNeedsReview: "Needs Review",
    processingError: "Error",
  },

  outputStatuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
};

let quizTable;
let homeworkTable;
let curriculumTable;
let enrollmentsTable;

/* =========================================================
   SECTION 2 — HELPERS
========================================================= */

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore unmapped outputs.
  }
}

function getField(table, fieldName) {
  return table.fields.find(field => field.name === fieldName);
}

function fieldExists(table, fieldName) {
  return Boolean(getField(table, fieldName));
}

function isWritable(table, fieldName) {
  const field = getField(table, fieldName);
  if (!field) return false;

  const readOnlyTypes = new Set([
    "formula",
    "rollup",
    "count",
    "lookup",
    "multipleLookupValues",
    "createdTime",
    "lastModifiedTime",
    "autoNumber",
    "createdBy",
    "lastModifiedBy",
    "button",
    "aiText",
    "externalSyncSource",
  ]);

  return !readOnlyTypes.has(field.type);
}

function safeFields(table, fieldNames) {
  return [...new Set(fieldNames)].filter(name => fieldExists(table, name));
}

function cell(record, fieldName) {
  try {
    return record.getCellValue(fieldName);
  } catch {
    return null;
  }
}

function selectName(record, fieldName) {
  const value = cell(record, fieldName);
  return value?.name ? String(value.name).trim() : "";
}

function booleanish(record, fieldName) {
  const value = cell(record, fieldName);
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

function linkedIds(record, fieldName) {
  const value = cell(record, fieldName);
  if (!Array.isArray(value)) return [];
  return value.map(item => item?.id).filter(Boolean);
}

function dateValue(record, fieldName) {
  const value = cell(record, fieldName);
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

function choiceExists(table, fieldName, choiceName) {
  const field = getField(table, fieldName);
  if (!field?.options?.choices) return false;
  return field.options.choices.some(choice => choice.name === choiceName);
}

function setLink(fields, table, fieldName, ids) {
  if (!isWritable(table, fieldName)) return;
  const cleaned = [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
  if (cleaned.length === 0) return;
  fields[fieldName] = cleaned;
}

function setSingleSelect(fields, table, fieldName, choiceName) {
  if (!isWritable(table, fieldName) || !choiceName) return;
  if (!choiceExists(table, fieldName, choiceName)) return;
  fields[fieldName] = { name: choiceName };
}

function setDate(fields, table, fieldName, value) {
  if (!isWritable(table, fieldName) || !value) return;
  fields[fieldName] = value;
}

function setText(fields, table, fieldName, value) {
  if (!isWritable(table, fieldName)) return;
  if (value === undefined || value === null) return;
  fields[fieldName] = String(value);
}

function setFinalOutputs({ statusOut, actionOut, errorOut = "", debugStep, quizSubmissionId = "", homeworkCompletionId = "" }) {
  setOutputSafe("statusOut", statusOut);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut);
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("quizSubmissionId", quizSubmissionId);
  setOutputSafe("homeworkCompletionId", homeworkCompletionId);

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut,
    actionOut,
    errorOut,
    debugStep,
    quizSubmissionId,
    homeworkCompletionId,
  }));
}

async function markQuizReview(quizId, status, note) {
  const fields = {};
  setSingleSelect(fields, quizTable, CONFIG.quiz.processingStatus, status);
  setText(fields, quizTable, CONFIG.quiz.processingError, note);
  if (Object.keys(fields).length > 0) {
    await quizTable.updateRecordAsync(quizId, fields);
  }
}

function buildDedupeKey(enrollmentId, weekId, homeworkId) {
  return `${enrollmentId || ""}|${weekId || ""}|${homeworkId || ""}`;
}

async function resolveHw17() {
  const curriculumQuery = await curriculumTable.selectRecordsAsync({
    fields: safeFields(curriculumTable, Object.values(CONFIG.curriculum)),
  });

  const hw17Records = curriculumQuery.records.filter(record => {
    const number = selectName(record, CONFIG.curriculum.homeworkNumber);
    const active = booleanish(record, CONFIG.curriculum.active);
    return number === CONFIG.values.homeworkNumber17 && active;
  });

  if (hw17Records.length !== 1) {
    throw new Error(`Expected exactly one active HW 17 record in FBC Curriculum - SYNC, found ${hw17Records.length}.`);
  }

  const weekIds = linkedIds(hw17Records[0], CONFIG.curriculum.week);
  if (weekIds.length !== 1) {
    throw new Error(`Expected exactly one Week linked to HW 17, found ${weekIds.length}.`);
  }

  return { hw17Id: hw17Records[0].id, hw17WeekId: weekIds[0] };
}

function findCompletionMatch(homeworkRecords, enrollmentId, weekId, homeworkId) {
  const targetKey = buildDedupeKey(enrollmentId, weekId, homeworkId);

  const matches = homeworkRecords.filter(hw => {
    const hwEnrollmentId = linkedIds(hw, CONFIG.homework.enrollment)[0] || "";
    const hwWeekId = linkedIds(hw, CONFIG.homework.week)[0] || "";
    const hwHomeworkId = linkedIds(hw, CONFIG.homework.homework)[0] || "";
    return buildDedupeKey(hwEnrollmentId, hwWeekId, hwHomeworkId) === targetKey;
  });

  return matches;
}

/* =========================================================
   SECTION 3 — MAIN
========================================================= */

async function main() {
  let debugStep = "start";

  const inputConfig = input.config();
  const recordId = String(inputConfig.recordId || "").trim();

  if (!recordId) {
    throw new Error("Missing required input variable: recordId");
  }
  if (!recordId.startsWith("rec")) {
    throw new Error(`Invalid recordId input. Expected Airtable record ID, received: ${recordId}`);
  }

  setOutputSafe("debugStep", debugStep);

  quizTable = base.getTable(CONFIG.tables.quiz);
  homeworkTable = base.getTable(CONFIG.tables.homework);
  curriculumTable = base.getTable(CONFIG.tables.curriculum);
  enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  debugStep = "load_quiz_submission";
  setOutputSafe("debugStep", debugStep);

  const quiz = await quizTable.selectRecordAsync(recordId, {
    fields: safeFields(quizTable, Object.values(CONFIG.quiz)),
  });

  if (!quiz) {
    throw new Error(`Final Reflection Quiz Submission not found: ${recordId}`);
  }

  // Idempotency: already bridged to a Homework Completion.
  const existingCompletionIds = linkedIds(quiz, CONFIG.quiz.homeworkCompletion);
  if (existingCompletionIds.length > 0) {
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.skipped,
      actionOut: "skipped_already_linked",
      debugStep: "skipped_already_linked",
      quizSubmissionId: quiz.id,
      homeworkCompletionId: existingCompletionIds[0],
    });
    return;
  }

  debugStep = "validate_enrollment";
  setOutputSafe("debugStep", debugStep);

  const enrollmentIds = linkedIds(quiz, CONFIG.quiz.enrollment);

  if (enrollmentIds.length === 0) {
    await markQuizReview(quiz.id, CONFIG.values.processingNeedsReview, "No Enrollment linked on quiz row. Cannot create Homework Completion.");
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.skipped,
      actionOut: "needs_review",
      errorOut: "No Enrollment linked.",
      debugStep: "needs_review_no_enrollment",
      quizSubmissionId: quiz.id,
    });
    return;
  }

  if (enrollmentIds.length > 1) {
    await markQuizReview(quiz.id, CONFIG.values.processingNeedsReview, `Multiple Enrollments linked: ${enrollmentIds.join(", ")}. Resolve to one.`);
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.skipped,
      actionOut: "needs_review",
      errorOut: "Multiple Enrollments linked.",
      debugStep: "needs_review_multiple_enrollment",
      quizSubmissionId: quiz.id,
    });
    return;
  }

  const enrollmentId = enrollmentIds[0];

  debugStep = "resolve_hw17";
  setOutputSafe("debugStep", debugStep);

  const { hw17Id, hw17WeekId } = await resolveHw17();

  debugStep = "resolve_grade_band";
  setOutputSafe("debugStep", debugStep);

  let gradeBandId = "";
  if (fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBand)) {
    const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId, {
      fields: safeFields(enrollmentsTable, [CONFIG.enrollments.gradeBand]),
    });
    if (enrollment) {
      gradeBandId = linkedIds(enrollment, CONFIG.enrollments.gradeBand)[0] || "";
    }
  }

  debugStep = "find_homework_completion";
  setOutputSafe("debugStep", debugStep);

  const homeworkFieldsToLoad = safeFields(homeworkTable, Object.values(CONFIG.homework));
  let homeworkQuery = await homeworkTable.selectRecordsAsync({ fields: homeworkFieldsToLoad });
  let matches = findCompletionMatch(homeworkQuery.records, enrollmentId, hw17WeekId, hw17Id);

  let homeworkCompletionId = "";
  let actionOut = "";

  if (matches.length > 0) {
    actionOut = "linked_existing";
    const target = matches[0];
    homeworkCompletionId = target.id;

    const completionUpdate = {};
    const mergedQuizIds = [...new Set([...linkedIds(target, CONFIG.homework.finalQuiz), quiz.id])];
    setLink(completionUpdate, homeworkTable, CONFIG.homework.finalQuiz, mergedQuizIds);
    if (!selectName(target, CONFIG.homework.sourceSystem)) {
      setSingleSelect(completionUpdate, homeworkTable, CONFIG.homework.sourceSystem, CONFIG.values.sourceSystemFillout);
    }
    if (Object.keys(completionUpdate).length > 0) {
      await homeworkTable.updateRecordAsync(target.id, completionUpdate);
    }
  } else {
    // Race guard: re-query immediately before create.
    debugStep = "recheck_before_create";
    setOutputSafe("debugStep", debugStep);

    homeworkQuery = await homeworkTable.selectRecordsAsync({ fields: homeworkFieldsToLoad });
    matches = findCompletionMatch(homeworkQuery.records, enrollmentId, hw17WeekId, hw17Id);

    if (matches.length > 0) {
      actionOut = "linked_existing";
      const target = matches[0];
      homeworkCompletionId = target.id;

      const completionUpdate = {};
      const mergedQuizIds = [...new Set([...linkedIds(target, CONFIG.homework.finalQuiz), quiz.id])];
      setLink(completionUpdate, homeworkTable, CONFIG.homework.finalQuiz, mergedQuizIds);
      if (!selectName(target, CONFIG.homework.sourceSystem)) {
        setSingleSelect(completionUpdate, homeworkTable, CONFIG.homework.sourceSystem, CONFIG.values.sourceSystemFillout);
      }
      if (Object.keys(completionUpdate).length > 0) {
        await homeworkTable.updateRecordAsync(target.id, completionUpdate);
      }
    } else {
      actionOut = "created_new";
      debugStep = "create_homework_completion";
      setOutputSafe("debugStep", debugStep);

      const createFields = {};
      setLink(createFields, homeworkTable, CONFIG.homework.enrollment, [enrollmentId]);
      setLink(createFields, homeworkTable, CONFIG.homework.homework, [hw17Id]);
      setLink(createFields, homeworkTable, CONFIG.homework.week, [hw17WeekId]);
      if (gradeBandId) {
        setLink(createFields, homeworkTable, CONFIG.homework.gradeBand, [gradeBandId]);
      }
      setLink(createFields, homeworkTable, CONFIG.homework.finalQuiz, [quiz.id]);
      setSingleSelect(createFields, homeworkTable, CONFIG.homework.sourceSystem, CONFIG.values.sourceSystemFillout);
      setSingleSelect(createFields, homeworkTable, CONFIG.homework.itemType, CONFIG.values.itemTypeHomework);
      setSingleSelect(createFields, homeworkTable, CONFIG.homework.completionStatus, CONFIG.values.completionStatusSubmitted);
      setSingleSelect(createFields, homeworkTable, CONFIG.homework.reviewStatus, CONFIG.values.reviewStatusReady);
      setDate(createFields, homeworkTable, CONFIG.homework.submissionDate, dateValue(quiz, CONFIG.quiz.submittedAt));

      homeworkCompletionId = await homeworkTable.createRecordAsync(createFields);
    }
  }

  debugStep = "link_quiz_to_completion";
  setOutputSafe("debugStep", debugStep);

  const quizUpdate = {};
  setLink(quizUpdate, quizTable, CONFIG.quiz.homeworkCompletion, [homeworkCompletionId]);
  setSingleSelect(quizUpdate, quizTable, CONFIG.quiz.processingStatus, CONFIG.values.processingProcessed);
  setText(quizUpdate, quizTable, CONFIG.quiz.processingError, "");
  if (Object.keys(quizUpdate).length > 0) {
    await quizTable.updateRecordAsync(quiz.id, quizUpdate);
  }

  setFinalOutputs({
    statusOut: CONFIG.outputStatuses.success,
    actionOut,
    errorOut: "",
    debugStep: "complete",
    quizSubmissionId: quiz.id,
    homeworkCompletionId,
  });
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  setOutputSafe("statusOut", CONFIG.outputStatuses.error);
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", "error");

  try {
    const inputConfig = input.config();
    const recordId = String(inputConfig.recordId || "").trim();
    if (recordId.startsWith("rec") && quizTable) {
      await markQuizReview(recordId, CONFIG.values.processingError, message);
    }
  } catch {
    // Ignore secondary failure while recording the error.
  }

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut: CONFIG.outputStatuses.error,
    actionOut: "error",
    errorOut: message,
    debugStep: "error",
  }));

  throw error;
}

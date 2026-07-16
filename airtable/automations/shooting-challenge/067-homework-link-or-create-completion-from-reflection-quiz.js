/*
Automation: 067 - Homework - Link or Create Completion from Reflection Quiz
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: (new - not yet deployed)
Last GitHub Update: 2026-07-16

Purpose:
Links or creates one Homework Completion from a Final Reflection Quiz
Submissions row (HW17 Fillout), then (when a quiz PDF attachment exists)
creates/finds a parent Submission and Submission Assets so HW17 rejoins
the normal 070a / coach file pipeline. Compatible with Fillout-aware 071.

Trigger:
Final Reflection Quiz Submissions when a row is ready to process
(recommended: when record is created, or Processing Status is Pending,
with Enrollment not empty).

Important Tables:
Final Reflection Quiz Submissions, Homework Completions, Submissions,
Submission Assets, FBC Curriculum - SYNC, Enrollments

Important Fields:
Enrollment, Homework Completion, Quiz Result PDF (recommended attachment),
Submitted At, Processing Status, Homework, Week, Source System,
Asset Purpose/Slot/Type, Source Attachment ID, Upload Status

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
This automation NEVER creates or modifies XP Events and NEVER marks Satisfactory.
XP is awarded only by the normal homework pipeline (064 then 065) after coach review.
DEV schema 2026-07-06: quiz had no attachment field yet — asset path no-ops until
Mike/OMNI creates Quiz Result PDF (or another candidate field listed in CONFIG).
*/

/************************************************************
 * 067 - Homework - Link or Create Completion from Reflection Quiz
 *
 * Version: v2.0
 * Date Written: 2026-06-28
 * Last Updated: 2026-07-16
 *
 * PURPOSE
 * - Runs from one Final Reflection Quiz Submissions record (HW17 Fillout).
 * - Uses the quiz row's Enrollment link to identify the athlete (never guesses).
 * - Resolves the single active HW 17 record in FBC Curriculum - SYNC and its Week.
 * - Finds or creates the matching Homework Completion (Enrollment + Week + Homework).
 * - Links quiz ↔ completion; stamps Source System = Fillout; Item Slot / Asset Slot = HW1.
 * - When quiz PDF attachment(s) exist: find/create parent Submission, create Submission
 *   Assets (dedupe by Source Attachment ID), link assets ↔ completion, leave Upload Status
 *   = Pending Link and Send to Make Trigger = false (020/070a arm separately).
 * - Leaves Satisfactory? / Review Complete / Coach Feedback untouched.
 *
 * IMPORTANT DESIGN RULES
 * - Parent Submission is required for Upload Ready formulas (Submission - Linked).
 * - Asset Purpose = Homework 1; Asset Slot = HW1; Asset Type inferred (usually Homework PDF).
 * - Multi-attachment: one asset per file; never collapse.
 * - Missing attachment field or empty attachments → completion bridge still succeeds
 *   (actionOut may include no_attachment_field / no_attachment_yet).
 * - Never creates / modifies XP Events. Never marks Satisfactory or awards XP.
 * - 071 must keep Fillout path without requiring assets on its trigger.
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
 * OUTPUTS
 * - statusOut = success | skipped | error
 * - actionOut = created_new | linked_existing | assets_created | assets_linked |
 *               skipped_already_linked | needs_review | no_attachment_field |
 *               no_attachment_yet | error
 * - errorOut, debugStep, quizSubmissionId, homeworkCompletionId, submissionIdOut, assetIdsOut
 *
 * AUTHORITY
 * - docs/v2/C009_HW17_ATTACHMENT_DEV_INSTALL.md
 * - docs/v2/DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — CONFIGURATION
========================================================= */

const CONFIG = {
  scriptName: "067 - Homework - Link or Create Completion from Reflection Quiz",
  version: "v2.0",

  tables: {
    quiz: "Final Reflection Quiz Submissions",
    homework: "Homework Completions",
    curriculum: "FBC Curriculum - SYNC",
    enrollments: "Enrollments",
    submissions: "Submissions",
    assets: "Submission Assets",
  },

  quiz: {
    enrollment: "Enrollment",
    homeworkCompletion: "Homework Completion",
    submittedAt: "Submitted At",
    processingStatus: "Processing Status",
    processingError: "Processing Error",
    // Preferred first; others are fallbacks if Mike names the field differently.
    attachmentCandidates: [
      "Quiz Result PDF",
      "Quiz PDF",
      "Reflection Quiz PDF",
      "PDF Attachment",
      "Attachment",
    ],
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
    submissionAssets: "Submission Assets",
    submissionsLinked: "Submissions - Linked",
    itemSlot: "Item Slot",
    assetSlot: "Asset Slot",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    homeworkName1: "Homework Name 1",
    hwSub1: "HW Sub 1",
    submissionAssets: "Submission Assets",
  },

  assets: {
    enrollment: "Enrollment - Linked",
    submission: "Submission - Linked",
    attachment: "Airtable Attachment",
    sourceAttachmentId: "Source Attachment ID",
    originalFileName: "Original File Name",
    assetPurpose: "Asset Purpose",
    assetType: "Asset Type",
    assetSlot: "Asset Slot",
    assetLabel: "Asset Label",
    uploadStatus: "Upload Status",
    sendToMakeTrigger: "Send to Make Trigger",
    homeworkCompletions: "Homework Completions",
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
    purposeHomework1: "Homework 1",
    slotHw1: "HW1",
    uploadPendingLink: "Pending Link",
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
let submissionsTable;
let assetsTable;

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
  return table.fields.find((field) => field.name === fieldName);
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
  return [...new Set(fieldNames)].filter((name) => fieldExists(table, name));
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
  return value.map((item) => item?.id).filter(Boolean);
}

function attachments(record, fieldName) {
  const value = cell(record, fieldName);
  if (!Array.isArray(value)) return [];
  return value.filter((file) => file && file.id);
}

function text(record, fieldName) {
  const value = cell(record, fieldName);
  if (value === null || value === undefined) return "";
  return String(value).trim();
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
  return field.options.choices.some((choice) => choice.name === choiceName);
}

function setLink(fields, table, fieldName, ids) {
  if (!isWritable(table, fieldName)) return;
  const cleaned = [...new Set((ids || []).filter(Boolean))].map((id) => ({ id }));
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

function setCheckbox(fields, table, fieldName, value) {
  if (!isWritable(table, fieldName)) return;
  fields[fieldName] = Boolean(value);
}

function setAttachment(fields, table, fieldName, file) {
  if (!isWritable(table, fieldName) || !file) return;
  fields[fieldName] = [file];
}

function fileExtension(filename) {
  const clean = String(filename || "").toLowerCase();
  const parts = clean.split(".");
  if (parts.length < 2) return "";
  return parts.pop();
}

function inferAssetType(file) {
  const type = String(file.type || "").toLowerCase();
  const ext = fileExtension(file.filename);
  const imageExts = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic"]);
  const pdfExts = new Set(["pdf"]);
  const docExts = new Set(["doc", "docx", "pages"]);

  if (type === "application/pdf" || pdfExts.has(ext)) return "Homework PDF";
  if (type.startsWith("image/") || imageExts.has(ext)) return "Homework Image";
  if (docExts.has(ext)) return "Homework Document";
  return "Other";
}

function resolveQuizAttachmentField() {
  for (const name of CONFIG.quiz.attachmentCandidates) {
    if (fieldExists(quizTable, name) && isWritable(quizTable, name)) {
      return name;
    }
  }
  // Last resort: any writable attachment field on the quiz table.
  for (const field of quizTable.fields) {
    if (field.type === "multipleAttachments" && isWritable(quizTable, field.name)) {
      return field.name;
    }
  }
  return "";
}

function setFinalOutputs({
  statusOut,
  actionOut,
  errorOut = "",
  debugStep,
  quizSubmissionId = "",
  homeworkCompletionId = "",
  submissionIdOut = "",
  assetIdsOut = "",
}) {
  setOutputSafe("statusOut", statusOut);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut);
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("quizSubmissionId", quizSubmissionId);
  setOutputSafe("homeworkCompletionId", homeworkCompletionId);
  setOutputSafe("submissionIdOut", submissionIdOut);
  setOutputSafe("assetIdsOut", assetIdsOut);

  console.log(
    JSON.stringify({
      automation: CONFIG.scriptName,
      version: CONFIG.version,
      statusOut,
      actionOut,
      errorOut,
      debugStep,
      quizSubmissionId,
      homeworkCompletionId,
      submissionIdOut,
      assetIdsOut,
    })
  );
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

  const hw17Records = curriculumQuery.records.filter((record) => {
    const number = selectName(record, CONFIG.curriculum.homeworkNumber);
    const active = booleanish(record, CONFIG.curriculum.active);
    return number === CONFIG.values.homeworkNumber17 && active;
  });

  if (hw17Records.length !== 1) {
    throw new Error(
      `Expected exactly one active HW 17 record in FBC Curriculum - SYNC, found ${hw17Records.length}.`
    );
  }

  const weekIds = linkedIds(hw17Records[0], CONFIG.curriculum.week);
  if (weekIds.length !== 1) {
    throw new Error(`Expected exactly one Week linked to HW 17, found ${weekIds.length}.`);
  }

  return { hw17Id: hw17Records[0].id, hw17WeekId: weekIds[0] };
}

function findCompletionMatch(homeworkRecords, enrollmentId, weekId, homeworkId) {
  const targetKey = buildDedupeKey(enrollmentId, weekId, homeworkId);

  return homeworkRecords.filter((hw) => {
    const hwEnrollmentId = linkedIds(hw, CONFIG.homework.enrollment)[0] || "";
    const hwWeekId = linkedIds(hw, CONFIG.homework.week)[0] || "";
    const hwHomeworkId = linkedIds(hw, CONFIG.homework.homework)[0] || "";
    return buildDedupeKey(hwEnrollmentId, hwWeekId, hwHomeworkId) === targetKey;
  });
}

async function findOrCreateParentSubmission(enrollmentId, weekId, homeworkId, files) {
  const fieldsToLoad = safeFields(submissionsTable, Object.values(CONFIG.submissions));
  const query = await submissionsTable.selectRecordsAsync({ fields: fieldsToLoad });

  const matches = query.records.filter((sub) => {
    const e = linkedIds(sub, CONFIG.submissions.enrollment)[0] || "";
    const w = linkedIds(sub, CONFIG.submissions.week)[0] || "";
    const hw1 = linkedIds(sub, CONFIG.submissions.homeworkName1)[0] || "";
    return e === enrollmentId && w === weekId && hw1 === homeworkId;
  });

  if (matches.length > 0) {
    return { submissionId: matches[0].id, created: false };
  }

  const createFields = {};
  setLink(createFields, submissionsTable, CONFIG.submissions.enrollment, [enrollmentId]);
  setLink(createFields, submissionsTable, CONFIG.submissions.week, [weekId]);
  setLink(createFields, submissionsTable, CONFIG.submissions.homeworkName1, [homeworkId]);
  // Optional mirror of first file onto HW Sub 1 for Fillout-shaped parity.
  if (files.length > 0 && isWritable(submissionsTable, CONFIG.submissions.hwSub1)) {
    createFields[CONFIG.submissions.hwSub1] = files;
  }

  const submissionId = await submissionsTable.createRecordAsync(createFields);
  return { submissionId, created: true };
}

async function ensureAssets({
  files,
  enrollmentId,
  submissionId,
  homeworkCompletionId,
}) {
  const assetFieldNames = safeFields(assetsTable, Object.values(CONFIG.assets));
  const assetsQuery = await assetsTable.selectRecordsAsync({ fields: assetFieldNames });

  const existingBySource = new Map();
  for (const asset of assetsQuery.records) {
    const sourceId = text(asset, CONFIG.assets.sourceAttachmentId);
    if (sourceId) existingBySource.set(sourceId, asset);
  }

  const createdIds = [];
  const linkedIdsOut = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const sourceId = file.id;
    const existing = existingBySource.get(sourceId);

    if (existing) {
      linkedIdsOut.push(existing.id);
      const merge = {};
      const hcIds = [
        ...new Set([
          ...linkedIds(existing, CONFIG.assets.homeworkCompletions),
          homeworkCompletionId,
        ]),
      ];
      setLink(merge, assetsTable, CONFIG.assets.homeworkCompletions, hcIds);
      if (!linkedIds(existing, CONFIG.assets.submission).includes(submissionId)) {
        setLink(merge, assetsTable, CONFIG.assets.submission, [submissionId]);
      }
      if (Object.keys(merge).length > 0) {
        await assetsTable.updateRecordAsync(existing.id, merge);
      }
      continue;
    }

    const fields = {};
    setLink(fields, assetsTable, CONFIG.assets.enrollment, [enrollmentId]);
    setLink(fields, assetsTable, CONFIG.assets.submission, [submissionId]);
    setAttachment(fields, assetsTable, CONFIG.assets.attachment, file);
    setText(fields, assetsTable, CONFIG.assets.sourceAttachmentId, sourceId);
    setText(fields, assetsTable, CONFIG.assets.originalFileName, file.filename || "");
    setText(fields, assetsTable, CONFIG.assets.assetLabel, `HW1-${index + 1}`);
    setSingleSelect(fields, assetsTable, CONFIG.assets.assetPurpose, CONFIG.values.purposeHomework1);
    setSingleSelect(fields, assetsTable, CONFIG.assets.assetType, inferAssetType(file));
    setSingleSelect(fields, assetsTable, CONFIG.assets.assetSlot, CONFIG.values.slotHw1);
    setSingleSelect(fields, assetsTable, CONFIG.assets.uploadStatus, CONFIG.values.uploadPendingLink);
    setCheckbox(fields, assetsTable, CONFIG.assets.sendToMakeTrigger, false);
    setLink(fields, assetsTable, CONFIG.assets.homeworkCompletions, [homeworkCompletionId]);

    const newId = await assetsTable.createRecordAsync(fields);
    createdIds.push(newId);
    linkedIdsOut.push(newId);
    existingBySource.set(sourceId, { id: newId });
  }

  return { createdIds, linkedIdsOut };
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
  submissionsTable = base.getTable(CONFIG.tables.submissions);
  assetsTable = base.getTable(CONFIG.tables.assets);

  debugStep = "load_quiz_submission";
  setOutputSafe("debugStep", debugStep);

  const attachmentFieldName = resolveQuizAttachmentField();
  const quizFields = safeFields(quizTable, [
    ...Object.values(CONFIG.quiz).filter((v) => typeof v === "string"),
    attachmentFieldName,
  ]);

  const quiz = await quizTable.selectRecordAsync(recordId, { fields: quizFields });
  if (!quiz) {
    throw new Error(`Final Reflection Quiz Submission not found: ${recordId}`);
  }

  const alreadyLinkedIds = linkedIds(quiz, CONFIG.quiz.homeworkCompletion);
  let homeworkCompletionId = alreadyLinkedIds[0] || "";
  let actionOut = alreadyLinkedIds.length > 0 ? "linked_existing" : "";

  debugStep = "validate_enrollment";
  setOutputSafe("debugStep", debugStep);

  const enrollmentIds = linkedIds(quiz, CONFIG.quiz.enrollment);

  if (enrollmentIds.length === 0) {
    await markQuizReview(
      quiz.id,
      CONFIG.values.processingNeedsReview,
      "No Enrollment linked on quiz row. Cannot create Homework Completion."
    );
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
    await markQuizReview(
      quiz.id,
      CONFIG.values.processingNeedsReview,
      `Multiple Enrollments linked: ${enrollmentIds.join(", ")}. Resolve to one.`
    );
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

  if (!homeworkCompletionId) {
    debugStep = "find_homework_completion";
    setOutputSafe("debugStep", debugStep);

    const homeworkFieldsToLoad = safeFields(homeworkTable, Object.values(CONFIG.homework));
    let homeworkQuery = await homeworkTable.selectRecordsAsync({ fields: homeworkFieldsToLoad });
    let matches = findCompletionMatch(homeworkQuery.records, enrollmentId, hw17WeekId, hw17Id);

    if (matches.length > 0) {
      actionOut = "linked_existing";
      homeworkCompletionId = matches[0].id;

      const completionUpdate = {};
      const mergedQuizIds = [...new Set([...linkedIds(matches[0], CONFIG.homework.finalQuiz), quiz.id])];
      setLink(completionUpdate, homeworkTable, CONFIG.homework.finalQuiz, mergedQuizIds);
      if (!selectName(matches[0], CONFIG.homework.sourceSystem)) {
        setSingleSelect(
          completionUpdate,
          homeworkTable,
          CONFIG.homework.sourceSystem,
          CONFIG.values.sourceSystemFillout
        );
      }
      setSingleSelect(completionUpdate, homeworkTable, CONFIG.homework.itemSlot, CONFIG.values.slotHw1);
      setSingleSelect(completionUpdate, homeworkTable, CONFIG.homework.assetSlot, CONFIG.values.slotHw1);
      if (Object.keys(completionUpdate).length > 0) {
        await homeworkTable.updateRecordAsync(matches[0].id, completionUpdate);
      }
    } else {
      debugStep = "recheck_before_create";
      setOutputSafe("debugStep", debugStep);

      homeworkQuery = await homeworkTable.selectRecordsAsync({ fields: homeworkFieldsToLoad });
      matches = findCompletionMatch(homeworkQuery.records, enrollmentId, hw17WeekId, hw17Id);

      if (matches.length > 0) {
        actionOut = "linked_existing";
        homeworkCompletionId = matches[0].id;
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
        setSingleSelect(
          createFields,
          homeworkTable,
          CONFIG.homework.sourceSystem,
          CONFIG.values.sourceSystemFillout
        );
        setSingleSelect(
          createFields,
          homeworkTable,
          CONFIG.homework.itemType,
          CONFIG.values.itemTypeHomework
        );
        setSingleSelect(
          createFields,
          homeworkTable,
          CONFIG.homework.completionStatus,
          CONFIG.values.completionStatusSubmitted
        );
        setSingleSelect(
          createFields,
          homeworkTable,
          CONFIG.homework.reviewStatus,
          CONFIG.values.reviewStatusReady
        );
        setSingleSelect(createFields, homeworkTable, CONFIG.homework.itemSlot, CONFIG.values.slotHw1);
        setSingleSelect(createFields, homeworkTable, CONFIG.homework.assetSlot, CONFIG.values.slotHw1);
        setDate(
          createFields,
          homeworkTable,
          CONFIG.homework.submissionDate,
          dateValue(quiz, CONFIG.quiz.submittedAt)
        );

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
  }

  // ---- Asset / Submission intake (C-009) ----
  debugStep = "resolve_attachment_field";
  setOutputSafe("debugStep", debugStep);

  let submissionIdOut = "";
  let assetIdsOut = "";

  if (!attachmentFieldName) {
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.success,
      actionOut: actionOut || "no_attachment_field",
      errorOut: "Quiz attachment field not present (create Quiz Result PDF).",
      debugStep: "no_attachment_field",
      quizSubmissionId: quiz.id,
      homeworkCompletionId,
    });
    return;
  }

  // Reload quiz with attachment field if not already loaded.
  const quizWithFiles = await quizTable.selectRecordAsync(recordId, {
    fields: safeFields(quizTable, [attachmentFieldName, CONFIG.quiz.homeworkCompletion]),
  });
  const files = attachments(quizWithFiles, attachmentFieldName);

  if (files.length === 0) {
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.success,
      actionOut: actionOut || "no_attachment_yet",
      errorOut: "",
      debugStep: "no_attachment_yet",
      quizSubmissionId: quiz.id,
      homeworkCompletionId,
    });
    return;
  }

  debugStep = "find_or_create_parent_submission";
  setOutputSafe("debugStep", debugStep);

  const { submissionId } = await findOrCreateParentSubmission(
    enrollmentId,
    hw17WeekId,
    hw17Id,
    files
  );
  submissionIdOut = submissionId;

  debugStep = "ensure_submission_assets";
  setOutputSafe("debugStep", debugStep);

  const { createdIds, linkedIdsOut } = await ensureAssets({
    files,
    enrollmentId,
    submissionId,
    homeworkCompletionId,
  });
  assetIdsOut = linkedIdsOut.join(",");

  debugStep = "link_assets_and_submission_to_completion";
  setOutputSafe("debugStep", debugStep);

  const hcUpdate = {};
  const hcRecord = await homeworkTable.selectRecordAsync(homeworkCompletionId, {
    fields: safeFields(homeworkTable, [
      CONFIG.homework.submissionAssets,
      CONFIG.homework.submissionsLinked,
      CONFIG.homework.itemSlot,
      CONFIG.homework.assetSlot,
    ]),
  });
  if (hcRecord) {
    const mergedAssets = [
      ...new Set([...linkedIds(hcRecord, CONFIG.homework.submissionAssets), ...linkedIdsOut]),
    ];
    setLink(hcUpdate, homeworkTable, CONFIG.homework.submissionAssets, mergedAssets);
    setLink(hcUpdate, homeworkTable, CONFIG.homework.submissionsLinked, [submissionId]);
    setSingleSelect(hcUpdate, homeworkTable, CONFIG.homework.itemSlot, CONFIG.values.slotHw1);
    setSingleSelect(hcUpdate, homeworkTable, CONFIG.homework.assetSlot, CONFIG.values.slotHw1);
    if (Object.keys(hcUpdate).length > 0) {
      await homeworkTable.updateRecordAsync(homeworkCompletionId, hcUpdate);
    }
  }

  if (createdIds.length > 0) {
    actionOut = "assets_created";
  } else if (linkedIdsOut.length > 0) {
    actionOut = "assets_linked";
  }

  setFinalOutputs({
    statusOut: CONFIG.outputStatuses.success,
    actionOut: actionOut || "success",
    errorOut: "",
    debugStep: "complete",
    quizSubmissionId: quiz.id,
    homeworkCompletionId,
    submissionIdOut,
    assetIdsOut,
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

  console.log(
    JSON.stringify({
      automation: CONFIG.scriptName,
      version: CONFIG.version,
      statusOut: CONFIG.outputStatuses.error,
      actionOut: "error",
      errorOut: message,
      debugStep: "error",
    })
  );

  throw error;
}

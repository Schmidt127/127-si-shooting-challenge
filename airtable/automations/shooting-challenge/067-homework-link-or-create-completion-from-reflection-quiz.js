/*
Automation: 067 - Homework - Link or Create Completion from Reflection Quiz
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-10
Last GitHub Update: 2026-08-20 (v3.5 V2 standard structure)

Purpose:
Link or create a Homework Completion from a Final Reflection Quiz Submission
(HW17 PHA-first schedule; attachment-less bridge allowed).

Trigger:
Final Reflection Quiz Submissions when ready
(confirm exact conditions in Airtable UI); pass the dynamic recordId.

Important Tables:
Final Reflection Quiz Submissions, Homework Completions, Homework Library,
Program Homework Assignments, Enrollments, Submissions, Submission Assets,
Weekly Athlete Summary

Important Fields:
Enrollment, Homework Completion, Processing Status, Homework Name 1,
Program Homework Assignment, Homework, Week, Weekly Athlete Summary Link

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Repo v3.4 / PROD paste not confirmed; v3.5 is structure-only.
SC-014 Option B: attachment-less reflection quiz bridge succeeds with zero assets.
*/

/************************************************************
 * 067 - HOMEWORK
 * Link or Create Completion from Reflection Quiz
 *
 * Version: v3.5
 * Date Written: 2026-06-28
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v3.5 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, SCRIPT metadata separated from CONFIG, numbered
 *   sections, debugStep reporting. Business logic unchanged from v3.4.
 * - v3.4 (2026-08-10): Exact-link cardinality on linked HC; PHA-first HW17;
 *   Grade Band never used for schedule.
 *
 * PURPOSE
 * - Runs from one Final Reflection Quiz Submission.
 * - Resolves HW17 schedule PI-first from active PHA rows (HW1 slot), then
 *   content-checks via PHA.Homework Assignment → Homework Library HW 17.
 * - Links an existing Homework Completion or creates one when none matches.
 * - Optionally bridges quiz attachments into Submission + Submission Assets.
 *
 * SCHEDULING RULE
 * - Submissions.Homework Name 1 stores Program Homework Assignment (PHA) record IDs.
 * - HW17 schedule is resolved PI-first from active PHA rows (HW1 slot), then content-checked via PHA.Homework Assignment → Homework Library HW 17.
 * - Homework Completions.Homework = library ID; Program Homework Assignment = PHA ID when field exists.
 * - Quiz-linked and discovered Homework Completions must match Enrollment + Week + Library + PHA exactly (exactly one link each); duplicate matches fail closed.
 * - PHA Grade Band is eligibility/descriptive metadata only and is NEVER used to resolve the schedule.
 * - Athlete Grade Band may still be copied to Homework Completion as metadata.
 *
 * PRODUCT RULE
 * - Approved product path remains SC-014 Option B: attachment-less reflection quiz bridge succeeds with zero assets.
 * - Optional attachment handling is retained when a quiz attachment field/file is present.
 *
 * IMPORTANT DESIGN RULES
 * - Exactly one Enrollment on the quiz (else Needs Review + skip).
 * - Exactly one active HW17 PHA for Program Instance + HW1 slot.
 * - Race recheck before create.
 * - Canonical WAS link when exactly one exists; otherwise defer (no fail).
 * - Multiple WAS for Enrollment + Week fails closed before completion write paths that need it.
 * - Never write formula / rollup / lookup / count fields.
 *
 * THIS IS NOT
 * - Standard homework asset → HC path (020).
 * - Homework XP prepare/create (064 / 065).
 * - Make / S3 homework upload handoff (070a).
 *
 * FOLDER
 * - 02 - Homework Review and XP
 *
 * AUTOMATION NAME
 * - 067 - Homework - Link or Create Completion from Reflection Quiz
 *
 * TRIGGER TABLE
 * - Final Reflection Quiz Submissions
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Quiz submission ready for Homework Completion prep (confirm exact UI conditions)
 * - Input variable recordId = triggering Final Reflection Quiz Submission record ID
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Final Reflection Quiz Submission record ID
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created_new | linked_existing | linked_existing_quiz |
 *   linked_existing_quiz_populated_pha | assets_created | assets_linked |
 *   no_attachment_field | no_attachment_yet | needs_review | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - quizSubmissionId / homeworkCompletionId / weeklySummaryId /
 *   weeklySummaryLinkStatus / phaId / libraryId / gradeBandSchedulingUsed
 * - submissionIdOut / assetIdsOut (when attachments processed)
 *
 * PRIMARY TABLES USED
 * - Final Reflection Quiz Submissions, Homework Completions, Homework Library,
 *   Program Homework Assignments, Enrollments, Submissions, Submission Assets,
 *   Weekly Athlete Summary
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Homework Completions → Enrollment, Homework, PHA, Week, quiz link, statuses, WAS link
 * - Final Reflection Quiz Submissions → Homework Completion, Processing Status/Error
 * - Submissions / Submission Assets (optional attachment bridge only)
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "067 - Homework - Link or Create Completion from Reflection Quiz",
  version: "v3.5",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-06-28",
  lastUpdated: "2026-08-20",
  folder: "02 - Homework Review and XP",
  automationName: "067 - Homework - Link or Create Completion from Reflection Quiz",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  tables: {
    quiz: "Final Reflection Quiz Submissions",
    homework: "Homework Completions",
    homeworkLibrary: "Homework Library",
    programHomeworkAssignments: "Program Homework Assignments",
    enrollments: "Enrollments",
    submissions: "Submissions",
    assets: "Submission Assets",
    weeklySummaries: "Weekly Athlete Summary",
  },
  quiz: {
    enrollment: "Enrollment",
    homeworkCompletion: "Homework Completion",
    submittedAt: "Submitted At",
    processingStatus: "Processing Status",
    processingError: "Processing Error",
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
    programHomeworkAssignment: "Program Homework Assignment",
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
    weeklySummaryLink: "Weekly Athlete Summary Link",
    itemSlot: "Item Slot",
    assetSlot: "Asset Slot",
  },
  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    homeworkName1: "Homework Name 1", // PHA record ID (Program Homework Assignments)
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
  homeworkLibrary: {
    homeworkNumber: "Homework Number",
    active: "Active?",
  },
  pha: {
    homeworkAssignment: "Homework Assignment",
    programInstance: "Program Instance",
    week: "Week",
    gradeBand: "Grade Band", // eligibility metadata only; ignored for matching
    slot: "Homework Slot",
    active: "Active?",
  },
  enrollments: {
    gradeBand: "Grade Band",
    programInstance: "Program Instance",
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
  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
  actions: {
    createdNew: "created_new",
    linkedExisting: "linked_existing",
    linkedExistingQuiz: "linked_existing_quiz",
    linkedExistingQuizPopulatedPha: "linked_existing_quiz_populated_pha",
    assetsCreated: "assets_created",
    assetsLinked: "assets_linked",
    noAttachmentField: "no_attachment_field",
    noAttachmentYet: "no_attachment_yet",
    needsReview: "needs_review",
    error: "error",
  },
};

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

let debugStep = "0 - Start";
let quizTable;
let homeworkTable;
let homeworkLibraryTable;
let phaTable;
let enrollmentsTable;
let submissionsTable;
let assetsTable;
let weeklySummariesTable;

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore unmapped output keys.
  }
}

function step(name) {
  debugStep = name;
  setOutputSafe("debugStep", debugStep);
}

function setFinalOutputs(payload) {
  for (const [k, v] of Object.entries(payload)) setOutputSafe(k, v);
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      ...payload,
    })
  );
}

function getField(table, fieldName) {
  return table.fields.find((f) => f.name === fieldName);
}

function fieldExists(table, fieldName) {
  return Boolean(getField(table, fieldName));
}

function isWritable(table, fieldName) {
  const field = getField(table, fieldName);
  if (!field) return false;
  return !new Set([
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
  ]).has(field.type);
}

function safeFields(table, names) {
  return [...new Set(names)].filter((n) => fieldExists(table, n));
}

function cell(record, fieldName) {
  try {
    return record.getCellValue(fieldName);
  } catch {
    return null;
  }
}

function selectName(record, fieldName) {
  const v = cell(record, fieldName);
  return v?.name ? String(v.name).trim() : "";
}

function booleanish(record, fieldName) {
  const v = cell(record, fieldName);
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  return ["true", "yes", "checked", "active", "1"].includes(String(v).trim().toLowerCase());
}

function linkedIds(record, fieldName) {
  const v = cell(record, fieldName);
  return Array.isArray(v) ? v.map((x) => x?.id).filter(Boolean) : [];
}

function attachments(record, fieldName) {
  const v = cell(record, fieldName);
  return Array.isArray(v) ? v.filter((f) => f?.id) : [];
}

function text(record, fieldName) {
  const v = cell(record, fieldName);
  return v == null ? "" : String(v).trim();
}

function dateValue(record, fieldName) {
  const v = cell(record, fieldName);
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d) ? null : d;
}

function choiceExists(table, fieldName, choiceName) {
  return Boolean(getField(table, fieldName)?.options?.choices?.some((c) => c.name === choiceName));
}

function setLink(fields, table, fieldName, ids) {
  if (!isWritable(table, fieldName)) return;
  const cleaned = [...new Set((ids || []).filter(Boolean))].map((id) => ({ id }));
  if (cleaned.length) fields[fieldName] = cleaned;
}

function setSingleSelect(fields, table, fieldName, choiceName) {
  if (isWritable(table, fieldName) && choiceName && choiceExists(table, fieldName, choiceName)) {
    fields[fieldName] = { name: choiceName };
  }
}

function setDate(fields, table, fieldName, value) {
  if (isWritable(table, fieldName) && value) fields[fieldName] = value;
}

function setText(fields, table, fieldName, value) {
  if (isWritable(table, fieldName) && value !== undefined && value !== null) {
    fields[fieldName] = String(value);
  }
}

function setCheckbox(fields, table, fieldName, value) {
  if (isWritable(table, fieldName)) fields[fieldName] = Boolean(value);
}

function setAttachment(fields, table, fieldName, file) {
  if (isWritable(table, fieldName) && file) fields[fieldName] = [file];
}

function fileExtension(filename) {
  const parts = String(filename || "")
    .toLowerCase()
    .split(".");
  return parts.length < 2 ? "" : parts.pop();
}

function inferAssetType(file) {
  const type = String(file.type || "").toLowerCase();
  const ext = fileExtension(file.filename);
  if (type === "application/pdf" || ext === "pdf") return "Homework PDF";
  if (type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext)) {
    return "Homework Image";
  }
  if (["doc", "docx", "pages"].includes(ext)) return "Homework Document";
  return "Other";
}

function resolveQuizAttachmentField() {
  for (const name of CONFIG.quiz.attachmentCandidates) {
    if (fieldExists(quizTable, name) && isWritable(quizTable, name)) return name;
  }
  for (const field of quizTable.fields) {
    if (field.type === "multipleAttachments" && isWritable(quizTable, field.name)) return field.name;
  }
  return "";
}

async function markQuizReview(quizId, status, note) {
  const fields = {};
  setSingleSelect(fields, quizTable, CONFIG.quiz.processingStatus, status);
  setText(fields, quizTable, CONFIG.quiz.processingError, note);
  if (Object.keys(fields).length) await quizTable.updateRecordAsync(quizId, fields);
}

function buildDedupeKey(enrollmentId, weekId, homeworkId) {
  return `${enrollmentId || ""}|${weekId || ""}|${homeworkId || ""}`;
}

async function resolveHw17PhaForEnrollment(enrollmentId) {
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId, {
    fields: safeFields(enrollmentsTable, [CONFIG.enrollments.programInstance, CONFIG.enrollments.gradeBand]),
  });
  if (!enrollment) throw new Error(`Enrollment not found: ${enrollmentId}`);
  const piIds = linkedIds(enrollment, CONFIG.enrollments.programInstance);
  if (piIds.length !== 1) {
    throw new Error(`Enrollment ${enrollmentId} must have exactly one Program Instance; found ${piIds.length}.`);
  }
  const programInstanceId = piIds[0];
  const gradeBandIds = fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBand)
    ? linkedIds(enrollment, CONFIG.enrollments.gradeBand)
    : [];
  const gradeBandId = gradeBandIds.length === 1 ? gradeBandIds[0] : "";

  const phaFields = [
    CONFIG.pha.homeworkAssignment,
    CONFIG.pha.programInstance,
    CONFIG.pha.week,
    CONFIG.pha.slot,
    CONFIG.pha.active,
  ];
  const query = await phaTable.selectRecordsAsync({ fields: safeFields(phaTable, phaFields) });
  const slotCandidates = query.records.filter((record) => {
    const pi = linkedIds(record, CONFIG.pha.programInstance);
    return (
      pi.length === 1 &&
      pi[0] === programInstanceId &&
      selectName(record, CONFIG.pha.slot) === CONFIG.values.slotHw1 &&
      booleanish(record, CONFIG.pha.active)
    );
  });

  const hw17Matches = [];
  for (const pha of slotCandidates) {
    const libraryIds = linkedIds(pha, CONFIG.pha.homeworkAssignment);
    if (libraryIds.length !== 1) continue;
    const lib = await homeworkLibraryTable.selectRecordAsync(libraryIds[0], {
      fields: safeFields(homeworkLibraryTable, Object.values(CONFIG.homeworkLibrary)),
    });
    if (!lib) continue;
    if (selectName(lib, CONFIG.homeworkLibrary.homeworkNumber) !== CONFIG.values.homeworkNumber17) continue;
    if (fieldExists(homeworkLibraryTable, CONFIG.homeworkLibrary.active) && !booleanish(lib, CONFIG.homeworkLibrary.active)) {
      continue;
    }
    hw17Matches.push({ pha, libraryId: libraryIds[0] });
  }

  if (hw17Matches.length !== 1) {
    throw new Error(
      `Expected exactly one active HW17 PHA for Program Instance ${programInstanceId} (Slot ${CONFIG.values.slotHw1}); found ${hw17Matches.length}. Grade Band is not part of scheduling.`
    );
  }
  const { pha, libraryId: hw17LibraryId } = hw17Matches[0];
  const weekIds = linkedIds(pha, CONFIG.pha.week);
  if (weekIds.length !== 1) {
    throw new Error(`Expected exactly one Week on HW17 PHA ${pha.id}, found ${weekIds.length}.`);
  }
  return {
    hw17WeekId: weekIds[0],
    phaId: pha.id,
    hw17LibraryId,
    programInstanceId,
    gradeBandId,
  };
}

function isExactCompletionIdentity(record, enrollmentId, weekId, homeworkId) {
  const enrollmentIds = linkedIds(record, CONFIG.homework.enrollment);
  const weekIds = linkedIds(record, CONFIG.homework.week);
  const homeworkIds = linkedIds(record, CONFIG.homework.homework);
  if (enrollmentIds.length !== 1 || weekIds.length !== 1 || homeworkIds.length !== 1) return false;
  return (
    buildDedupeKey(enrollmentIds[0], weekIds[0], homeworkIds[0]) ===
    buildDedupeKey(enrollmentId, weekId, homeworkId)
  );
}

function findCompletionMatch(records, enrollmentId, weekId, homeworkId) {
  return records.filter((hw) => isExactCompletionIdentity(hw, enrollmentId, weekId, homeworkId));
}

function requireSingleCompletionMatch(matches, contextLabel) {
  if (matches.length > 1) {
    throw new Error(`Multiple Homework Completions match ${contextLabel}: ${matches.map((r) => r.id).join(", ")}`);
  }
  return matches[0] || null;
}

async function validateLinkedHomeworkCompletion(hcId, { enrollmentId, weekId, libraryId, phaId }) {
  const fields = safeFields(homeworkTable, [
    CONFIG.homework.enrollment,
    CONFIG.homework.week,
    CONFIG.homework.homework,
    CONFIG.homework.programHomeworkAssignment,
  ]);
  const hc = await homeworkTable.selectRecordAsync(hcId, { fields });
  if (!hc) throw new Error(`Homework Completion not found: ${hcId}`);
  const hcEnrollmentIds = linkedIds(hc, CONFIG.homework.enrollment);
  const hcWeekIds = linkedIds(hc, CONFIG.homework.week);
  const hcHomeworkIds = linkedIds(hc, CONFIG.homework.homework);
  const hcPhaIds = fieldExists(homeworkTable, CONFIG.homework.programHomeworkAssignment)
    ? linkedIds(hc, CONFIG.homework.programHomeworkAssignment)
    : [];

  if (hcEnrollmentIds.length !== 1) {
    throw new Error(
      `Homework Completion ${hcId} Enrollment must have exactly one link, found ${hcEnrollmentIds.length}: ${hcEnrollmentIds.join(", ") || "blank"}.`
    );
  }
  if (hcEnrollmentIds[0] !== enrollmentId) {
    throw new Error(`Homework Completion ${hcId} Enrollment mismatch: expected ${enrollmentId}, got ${hcEnrollmentIds[0]}.`);
  }
  if (hcWeekIds.length !== 1) {
    throw new Error(
      `Homework Completion ${hcId} Week must have exactly one link, found ${hcWeekIds.length}: ${hcWeekIds.join(", ") || "blank"}.`
    );
  }
  if (hcWeekIds[0] !== weekId) {
    throw new Error(`Homework Completion ${hcId} Week mismatch: expected ${weekId}, got ${hcWeekIds[0]}.`);
  }
  if (hcHomeworkIds.length !== 1) {
    throw new Error(
      `Homework Completion ${hcId} Homework must have exactly one link, found ${hcHomeworkIds.length}: ${hcHomeworkIds.join(", ") || "blank"}.`
    );
  }
  if (hcHomeworkIds[0] !== libraryId) {
    throw new Error(`Homework Completion ${hcId} Homework mismatch: expected ${libraryId}, got ${hcHomeworkIds[0]}.`);
  }

  let populatePha = false;
  if (fieldExists(homeworkTable, CONFIG.homework.programHomeworkAssignment)) {
    if (!hcPhaIds.length) populatePha = true;
    else if (hcPhaIds.length > 1) {
      throw new Error(
        `Homework Completion ${hcId} Program Homework Assignment must have exactly one link, found ${hcPhaIds.length}: ${hcPhaIds.join(", ")}.`
      );
    } else if (hcPhaIds[0] !== phaId) {
      throw new Error(
        `Homework Completion ${hcId} Program Homework Assignment mismatch: expected ${phaId}, got ${hcPhaIds[0]}.`
      );
    }
  }
  return { hc, populatePha };
}

async function populateBlankPhaOnCompletion(hcId, phaId) {
  const updates = {};
  setLink(updates, homeworkTable, CONFIG.homework.programHomeworkAssignment, [phaId]);
  if (Object.keys(updates).length) await homeworkTable.updateRecordAsync(hcId, updates);
}

async function linkQuizToCompletion(quiz, hcId, hcRecord) {
  const updates = {};
  setLink(updates, homeworkTable, CONFIG.homework.finalQuiz, [
    ...linkedIds(hcRecord, CONFIG.homework.finalQuiz),
    quiz.id,
  ]);
  if (!selectName(hcRecord, CONFIG.homework.sourceSystem)) {
    setSingleSelect(updates, homeworkTable, CONFIG.homework.sourceSystem, CONFIG.values.sourceSystemFillout);
  }
  setSingleSelect(updates, homeworkTable, CONFIG.homework.itemSlot, CONFIG.values.slotHw1);
  setSingleSelect(updates, homeworkTable, CONFIG.homework.assetSlot, CONFIG.values.slotHw1);
  if (Object.keys(updates).length) await homeworkTable.updateRecordAsync(hcId, updates);

  const quizUpdates = {};
  setLink(quizUpdates, quizTable, CONFIG.quiz.homeworkCompletion, [hcId]);
  setSingleSelect(quizUpdates, quizTable, CONFIG.quiz.processingStatus, CONFIG.values.processingProcessed);
  setText(quizUpdates, quizTable, CONFIG.quiz.processingError, "");
  if (Object.keys(quizUpdates).length) await quizTable.updateRecordAsync(quiz.id, quizUpdates);
}

async function resolveWeeklySummaryId(enrollmentId, weekId) {
  const query = await weeklySummariesTable.selectRecordsAsync({
    fields: safeFields(weeklySummariesTable, ["Enrollment", "Week"]),
  });
  const matches = query.records.filter((summary) => {
    const e = linkedIds(summary, "Enrollment");
    const w = linkedIds(summary, "Week");
    return e.length === 1 && w.length === 1 && e[0] === enrollmentId && w[0] === weekId;
  });
  if (matches.length > 1) {
    throw new Error(
      `Multiple Weekly Athlete Summary records for Enrollment ${enrollmentId} + Week ${weekId}: ${matches.map((r) => r.id).join(", ")}`
    );
  }
  return matches[0]?.id || "";
}

async function ensureWeeklySummaryLink(hcId, enrollmentId, weekId, summaryId = "") {
  if (!fieldExists(homeworkTable, CONFIG.homework.weeklySummaryLink)) {
    throw new Error(`Required Homework Completions field is missing: ${CONFIG.homework.weeklySummaryLink}`);
  }
  if (!summaryId) return "";
  const hc = await homeworkTable.selectRecordAsync(hcId, {
    fields: [CONFIG.homework.weeklySummaryLink],
  });
  const ids = linkedIds(hc, CONFIG.homework.weeklySummaryLink);
  if (ids.length === 1 && ids[0] === summaryId) return summaryId;
  const fields = {};
  setLink(fields, homeworkTable, CONFIG.homework.weeklySummaryLink, [summaryId]);
  if (Object.keys(fields).length) await homeworkTable.updateRecordAsync(hcId, fields);
  return summaryId;
}

async function findOrCreateParentSubmission(enrollmentId, weekId, phaId, files) {
  const query = await submissionsTable.selectRecordsAsync({
    fields: safeFields(submissionsTable, Object.values(CONFIG.submissions)),
  });
  const matches = query.records.filter(
    (submission) =>
      (linkedIds(submission, CONFIG.submissions.enrollment)[0] || "") === enrollmentId &&
      (linkedIds(submission, CONFIG.submissions.week)[0] || "") === weekId &&
      (linkedIds(submission, CONFIG.submissions.homeworkName1)[0] || "") === phaId
  );
  if (matches.length) return { submissionId: matches[0].id, created: false };

  const fields = {};
  setLink(fields, submissionsTable, CONFIG.submissions.enrollment, [enrollmentId]);
  setLink(fields, submissionsTable, CONFIG.submissions.week, [weekId]);
  setLink(fields, submissionsTable, CONFIG.submissions.homeworkName1, [phaId]);
  if (files.length && isWritable(submissionsTable, CONFIG.submissions.hwSub1)) {
    fields[CONFIG.submissions.hwSub1] = files;
  }
  return { submissionId: await submissionsTable.createRecordAsync(fields), created: true };
}

async function ensureAssets({ files, enrollmentId, submissionId, homeworkCompletionId }) {
  const query = await assetsTable.selectRecordsAsync({
    fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
  });
  const existingBySource = new Map();
  for (const asset of query.records) {
    const sourceId = text(asset, CONFIG.assets.sourceAttachmentId);
    if (sourceId) existingBySource.set(sourceId, asset);
  }

  const createdIds = [];
  const linkedIdsOut = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const existing = existingBySource.get(file.id);
    if (existing) {
      linkedIdsOut.push(existing.id);
      const fields = {};
      setLink(fields, assetsTable, CONFIG.assets.homeworkCompletions, [
        ...linkedIds(existing, CONFIG.assets.homeworkCompletions),
        homeworkCompletionId,
      ]);
      if (!linkedIds(existing, CONFIG.assets.submission).includes(submissionId)) {
        setLink(fields, assetsTable, CONFIG.assets.submission, [submissionId]);
      }
      if (Object.keys(fields).length) await assetsTable.updateRecordAsync(existing.id, fields);
      continue;
    }

    const fields = {};
    setLink(fields, assetsTable, CONFIG.assets.enrollment, [enrollmentId]);
    setLink(fields, assetsTable, CONFIG.assets.submission, [submissionId]);
    setAttachment(fields, assetsTable, CONFIG.assets.attachment, file);
    setText(fields, assetsTable, CONFIG.assets.sourceAttachmentId, file.id);
    setText(fields, assetsTable, CONFIG.assets.originalFileName, file.filename || "");
    setText(fields, assetsTable, CONFIG.assets.assetLabel, `HW1-${i + 1}`);
    setSingleSelect(fields, assetsTable, CONFIG.assets.assetPurpose, CONFIG.values.purposeHomework1);
    setSingleSelect(fields, assetsTable, CONFIG.assets.assetType, inferAssetType(file));
    setSingleSelect(fields, assetsTable, CONFIG.assets.assetSlot, CONFIG.values.slotHw1);
    setSingleSelect(fields, assetsTable, CONFIG.assets.uploadStatus, CONFIG.values.uploadPendingLink);
    setCheckbox(fields, assetsTable, CONFIG.assets.sendToMakeTrigger, false);
    setLink(fields, assetsTable, CONFIG.assets.homeworkCompletions, [homeworkCompletionId]);
    const id = await assetsTable.createRecordAsync(fields);
    createdIds.push(id);
    linkedIdsOut.push(id);
  }
  return { createdIds, linkedIdsOut };
}

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  step("1 - Validate recordId");
  const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
  const recordId = String(cfg.recordId || "").trim();
  if (!recordId) throw new Error("Missing required input variable: recordId");
  if (!recordId.startsWith("rec")) throw new Error(`Invalid recordId: ${recordId}`);

  step("2 - Load tables");
  quizTable = base.getTable(CONFIG.tables.quiz);
  homeworkTable = base.getTable(CONFIG.tables.homework);
  homeworkLibraryTable = base.getTable(CONFIG.tables.homeworkLibrary);
  phaTable = base.getTable(CONFIG.tables.programHomeworkAssignments);
  enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  submissionsTable = base.getTable(CONFIG.tables.submissions);
  assetsTable = base.getTable(CONFIG.tables.assets);
  weeklySummariesTable = base.getTable(CONFIG.tables.weeklySummaries);

  step("3 - Load quiz submission");
  const attachmentFieldName = resolveQuizAttachmentField();
  const quizFields = safeFields(quizTable, [
    ...Object.values(CONFIG.quiz).filter((v) => typeof v === "string"),
    attachmentFieldName,
  ]);
  const quiz = await quizTable.selectRecordAsync(recordId, { fields: quizFields });
  if (!quiz) throw new Error(`Final Reflection Quiz Submission not found: ${recordId}`);

  const alreadyLinked = linkedIds(quiz, CONFIG.quiz.homeworkCompletion);
  if (alreadyLinked.length > 1) {
    throw new Error(`Quiz links multiple Homework Completions (${alreadyLinked.length}): ${alreadyLinked.join(", ")}`);
  }

  let homeworkCompletionId = alreadyLinked[0] || "";
  let actionOut = homeworkCompletionId ? CONFIG.actions.linkedExistingQuiz : "";

  const enrollmentIds = linkedIds(quiz, CONFIG.quiz.enrollment);
  if (enrollmentIds.length !== 1) {
    const note = enrollmentIds.length
      ? `Multiple Enrollments linked: ${enrollmentIds.join(", ")}. Resolve to one.`
      : "No Enrollment linked on quiz row.";
    await markQuizReview(quiz.id, CONFIG.values.processingNeedsReview, note);
    setFinalOutputs({
      statusOut: CONFIG.statuses.skipped,
      actionOut: CONFIG.actions.needsReview,
      errorOut: note,
      debugStep: "needs_review_enrollment",
      quizSubmissionId: quiz.id,
    });
    return;
  }

  step("4 - Resolve HW17 PHA");
  const enrollmentId = enrollmentIds[0];
  const { hw17WeekId, gradeBandId, phaId, hw17LibraryId } = await resolveHw17PhaForEnrollment(enrollmentId);
  const canonicalWeeklySummaryId = await resolveWeeklySummaryId(enrollmentId, hw17WeekId);
  const weeklySummaryLinkStatus = canonicalWeeklySummaryId ? "linked" : "deferred_no_canonical_summary";

  if (homeworkCompletionId) {
    step("5 - Validate quiz-linked completion");
    const { populatePha } = await validateLinkedHomeworkCompletion(homeworkCompletionId, {
      enrollmentId,
      weekId: hw17WeekId,
      libraryId: hw17LibraryId,
      phaId,
    });
    if (populatePha) {
      await populateBlankPhaOnCompletion(homeworkCompletionId, phaId);
      actionOut = CONFIG.actions.linkedExistingQuizPopulatedPha;
    }
  }

  if (!homeworkCompletionId) {
    step("5 - Find or create homework completion");
    const fields = safeFields(homeworkTable, Object.values(CONFIG.homework));
    let query = await homeworkTable.selectRecordsAsync({ fields });
    let matches = findCompletionMatch(query.records, enrollmentId, hw17WeekId, hw17LibraryId);
    let match = requireSingleCompletionMatch(matches, "Enrollment + Week + Homework Library");

    if (match) {
      homeworkCompletionId = match.id;
      actionOut = CONFIG.actions.linkedExisting;
      const validated = await validateLinkedHomeworkCompletion(homeworkCompletionId, {
        enrollmentId,
        weekId: hw17WeekId,
        libraryId: hw17LibraryId,
        phaId,
      });
      if (validated.populatePha) await populateBlankPhaOnCompletion(homeworkCompletionId, phaId);
      await linkQuizToCompletion(quiz, homeworkCompletionId, match);
    } else {
      query = await homeworkTable.selectRecordsAsync({ fields });
      matches = findCompletionMatch(query.records, enrollmentId, hw17WeekId, hw17LibraryId);
      match = requireSingleCompletionMatch(matches, "Enrollment + Week + Homework Library (recheck)");

      if (match) {
        homeworkCompletionId = match.id;
        actionOut = CONFIG.actions.linkedExisting;
        const validated = await validateLinkedHomeworkCompletion(homeworkCompletionId, {
          enrollmentId,
          weekId: hw17WeekId,
          libraryId: hw17LibraryId,
          phaId,
        });
        if (validated.populatePha) await populateBlankPhaOnCompletion(homeworkCompletionId, phaId);
        await linkQuizToCompletion(quiz, homeworkCompletionId, match);
      } else {
        actionOut = CONFIG.actions.createdNew;
        const createFields = {};
        setLink(createFields, homeworkTable, CONFIG.homework.enrollment, [enrollmentId]);
        setLink(createFields, homeworkTable, CONFIG.homework.homework, [hw17LibraryId]);
        if (fieldExists(homeworkTable, CONFIG.homework.programHomeworkAssignment)) {
          setLink(createFields, homeworkTable, CONFIG.homework.programHomeworkAssignment, [phaId]);
        }
        setLink(createFields, homeworkTable, CONFIG.homework.week, [hw17WeekId]);
        if (gradeBandId) setLink(createFields, homeworkTable, CONFIG.homework.gradeBand, [gradeBandId]);
        setLink(createFields, homeworkTable, CONFIG.homework.finalQuiz, [quiz.id]);
        setSingleSelect(createFields, homeworkTable, CONFIG.homework.sourceSystem, CONFIG.values.sourceSystemFillout);
        setSingleSelect(createFields, homeworkTable, CONFIG.homework.itemType, CONFIG.values.itemTypeHomework);
        setSingleSelect(
          createFields,
          homeworkTable,
          CONFIG.homework.completionStatus,
          CONFIG.values.completionStatusSubmitted
        );
        setSingleSelect(createFields, homeworkTable, CONFIG.homework.reviewStatus, CONFIG.values.reviewStatusReady);
        setSingleSelect(createFields, homeworkTable, CONFIG.homework.itemSlot, CONFIG.values.slotHw1);
        setSingleSelect(createFields, homeworkTable, CONFIG.homework.assetSlot, CONFIG.values.slotHw1);
        setDate(createFields, homeworkTable, CONFIG.homework.submissionDate, dateValue(quiz, CONFIG.quiz.submittedAt));
        homeworkCompletionId = await homeworkTable.createRecordAsync(createFields);

        const quizUpdates = {};
        setLink(quizUpdates, quizTable, CONFIG.quiz.homeworkCompletion, [homeworkCompletionId]);
        setSingleSelect(quizUpdates, quizTable, CONFIG.quiz.processingStatus, CONFIG.values.processingProcessed);
        setText(quizUpdates, quizTable, CONFIG.quiz.processingError, "");
        if (Object.keys(quizUpdates).length) await quizTable.updateRecordAsync(quiz.id, quizUpdates);
      }
    }
  }

  step("6 - Ensure weekly summary link");
  const weeklySummaryId = await ensureWeeklySummaryLink(
    homeworkCompletionId,
    enrollmentId,
    hw17WeekId,
    canonicalWeeklySummaryId
  );
  setOutputSafe("weeklySummaryId", weeklySummaryId);
  setOutputSafe("weeklySummaryLinkStatus", weeklySummaryLinkStatus);
  setOutputSafe("phaId", phaId);
  setOutputSafe("libraryId", hw17LibraryId);
  setOutputSafe("gradeBandSchedulingUsed", false);

  let submissionIdOut = "";
  let assetIdsOut = "";

  if (!attachmentFieldName) {
    setFinalOutputs({
      statusOut: CONFIG.statuses.success,
      actionOut: actionOut || CONFIG.actions.noAttachmentField,
      errorOut: "",
      debugStep: "no_attachment_field",
      quizSubmissionId: quiz.id,
      homeworkCompletionId,
      weeklySummaryId,
      weeklySummaryLinkStatus,
      phaId,
      gradeBandSchedulingUsed: false,
    });
    return;
  }

  step("7 - Process optional attachments");
  const quizWithFiles = await quizTable.selectRecordAsync(recordId, {
    fields: safeFields(quizTable, [attachmentFieldName, CONFIG.quiz.homeworkCompletion]),
  });
  const files = attachments(quizWithFiles, attachmentFieldName);
  if (!files.length) {
    setFinalOutputs({
      statusOut: CONFIG.statuses.success,
      actionOut: actionOut || CONFIG.actions.noAttachmentYet,
      errorOut: "",
      debugStep: "no_attachment_yet",
      quizSubmissionId: quiz.id,
      homeworkCompletionId,
      weeklySummaryId,
      weeklySummaryLinkStatus,
      phaId,
      gradeBandSchedulingUsed: false,
    });
    return;
  }

  const { submissionId } = await findOrCreateParentSubmission(enrollmentId, hw17WeekId, phaId, files);
  submissionIdOut = submissionId;
  const { createdIds, linkedIdsOut } = await ensureAssets({
    files,
    enrollmentId,
    submissionId,
    homeworkCompletionId,
  });
  assetIdsOut = linkedIdsOut.join(",");

  const hc = await homeworkTable.selectRecordAsync(homeworkCompletionId, {
    fields: safeFields(homeworkTable, [
      CONFIG.homework.submissionAssets,
      CONFIG.homework.submissionsLinked,
      CONFIG.homework.itemSlot,
      CONFIG.homework.assetSlot,
    ]),
  });
  if (hc) {
    const updates = {};
    setLink(updates, homeworkTable, CONFIG.homework.submissionAssets, [
      ...linkedIds(hc, CONFIG.homework.submissionAssets),
      ...linkedIdsOut,
    ]);
    setLink(updates, homeworkTable, CONFIG.homework.submissionsLinked, [submissionId]);
    setSingleSelect(updates, homeworkTable, CONFIG.homework.itemSlot, CONFIG.values.slotHw1);
    setSingleSelect(updates, homeworkTable, CONFIG.homework.assetSlot, CONFIG.values.slotHw1);
    if (Object.keys(updates).length) await homeworkTable.updateRecordAsync(homeworkCompletionId, updates);
  }

  if (createdIds.length) actionOut = CONFIG.actions.assetsCreated;
  else if (linkedIdsOut.length) actionOut = CONFIG.actions.assetsLinked;

  step("8 - Complete");
  setFinalOutputs({
    statusOut: CONFIG.statuses.success,
    actionOut: actionOut || "success",
    errorOut: "",
    debugStep,
    quizSubmissionId: quiz.id,
    homeworkCompletionId,
    weeklySummaryId,
    weeklySummaryLinkStatus,
    submissionIdOut,
    assetIdsOut,
    phaId,
    libraryId: hw17LibraryId,
    gradeBandSchedulingUsed: false,
  });
}

/* =========================================================
   SECTION 5: RUN
========================================================= */

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputSafe("statusOut", CONFIG.statuses.error);
  setOutputSafe("actionOut", CONFIG.actions.error);
  setOutputSafe("errorOut", `FAILED AT: ${debugStep} | ${message}`);
  setOutputSafe("debugStep", debugStep);
  try {
    const id = String(
      (typeof input !== "undefined" && input?.config ? input.config() : {}).recordId || ""
    ).trim();
    if (id.startsWith("rec") && quizTable) {
      await markQuizReview(id, CONFIG.values.processingError, message);
    }
  } catch {
    // Best-effort quiz error writeback.
  }
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: CONFIG.statuses.error,
      errorOut: message,
      debugStep,
    })
  );
  throw error;
}

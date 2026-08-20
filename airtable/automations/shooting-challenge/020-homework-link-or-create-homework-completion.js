/*
Automation: 020 - Homework - Link or Create Homework Completion
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-19
Last GitHub Update: 2026-08-20 (v3.7 V2 standard structure)

Purpose:
Link or create one Homework Completion from a homework Submission Asset,
using PHA-first intake (library via PHA.Homework Assignment).

Trigger:
Submission Assets when a homework asset is ready for Homework Completion prep
(confirm exact conditions in Airtable UI); pass the dynamic recordId.

Important Tables:
Submission Assets, Submissions, Homework Completions, Enrollments,
Program Homework Assignments

Important Fields:
Upload Destination, Asset Purpose, Asset Slot, Homework Name 1/2,
Program Homework Assignment, Homework, Enrollment, Week, Send to Make Trigger

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
v3.6 is live in Production Airtable (Mike 2026-08-19); v3.7 is structure-only.
*/

/************************************************************
 * 020 - HOMEWORK
 * Link or Create Homework Completion
 *
 * Version: v3.7
 * Date Written: 2026-06-20
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v3.7 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, SCRIPT metadata separated from CONFIG, numbered
 *   sections, debugStep reporting. Business logic unchanged from v3.6.
 * - v3.6 (2026-08-17): PHA-first intake; HC.Homework = library;
 *   HC.Program Homework Assignment = PHA; Grade Band never used for schedule.
 * - v3.5 / earlier: Asset-driven Homework Completion link/create path.
 *
 * PURPOSE
 * - Runs from one Submission Asset when the homework asset is ready for
 *   Homework Completion prep.
 * - Links an existing Homework Completion or creates one when none matches.
 * - Arms Send to Make Trigger and Pending Link for 070a.
 *
 * INTAKE CONTRACT
 * - Submissions.Homework Name 1/2 store Program Homework Assignment (PHA) record IDs.
 * - 020 loads the selected PHA directly and validates PI + Week + Slot + Active + Homework Assignment.
 * - Homework Library content ID comes from PHA.Homework Assignment (exactly one link).
 * - HC.Homework = library ID; HC.Program Homework Assignment = PHA ID.
 *
 * SCHEDULING RULE
 * - Operational identity is Program Instance + Week + Homework Assignment + Homework Slot (+ Active).
 * - PHA Grade Band is eligibility/descriptive metadata only and is NEVER used to resolve schedule ownership.
 * - A PHA may list all grade bands (K-2 … 9-12). Multi-band Grade Band never rejects a valid match.
 * - Athlete Grade Band may still be copied to Homework Completions as athlete metadata when available.
 *
 * PRODUCT RULE
 * - One Homework Completion per Enrollment + Week + Homework (library) + Slot.
 * - Re-submits in the same week merge onto the same Homework Completion.
 *
 * IMPORTANT DESIGN RULES
 * - Fail closed on Upload Destination / Asset Purpose / attachment / link count errors
 *   (marks asset Upload Status = Error before throwing).
 * - Multiple canonical HC candidates refuse to choose.
 * - Conflicting PHA ownership on an existing HC fails closed.
 * - Race recheck before create.
 * - Never write formula / rollup / lookup / count fields.
 *
 * THIS IS NOT
 * - Submission asset creation (009).
 * - Homework XP prepare/create (064 / 065).
 * - Make / S3 homework upload handoff (070a).
 * - Child upload writeback sync (022).
 * - HW17 reflection-quiz completion path (067).
 * - Full Enrollment Grade Band copy automation (063 — retired).
 *
 * FOLDER
 * - 02 - Homework Review and XP
 *
 * AUTOMATION NAME
 * - 020 - Homework - Link or Create Homework Completion
 *
 * TRIGGER TABLE
 * - Submission Assets
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Upload Destination = Homework Completions
 * - Asset Purpose = Homework 1 or Homework 2
 * - Homework asset ready for Homework Completion prep (confirm exact UI conditions)
 * - Input variable recordId = triggering Submission Asset record ID
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - Video / VIDEO slot assets (013 owns Video Feedback)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Submission Asset record ID
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created_new | linked_existing | linked_existing_enrollment_identity | error
 * - gradeBandActionOut = copied_grade_band | already_has_grade_band |
 *   skipped_no_enrollment_grade_band | (empty when N/A)
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - submissionAssetId / homeworkCompletionId / slot / phaId / libraryId
 * - gradeBandSchedulingUsed = false (always; Grade Band is not scheduling)
 *
 * PRIMARY TABLES USED
 * - Submission Assets, Submissions, Homework Completions, Enrollments,
 *   Program Homework Assignments
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Homework Completions → Homework, Program Homework Assignment, links,
 *   upload/review status fields, Grade Band (athlete metadata only)
 * - Submission Assets → Homework Completions, Asset Slot, Upload Status,
 *   Send to Make Trigger, Upload Error (on fail path)
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "020 - Homework - Link or Create Homework Completion",
  version: "v3.7",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-06-20",
  lastUpdated: "2026-08-20",
  folder: "02 - Homework Review and XP",
  automationName: "020 - Homework - Link or Create Homework Completion",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  tables: {
    assets: "Submission Assets",
    submissions: "Submissions",
    homework: "Homework Completions",
    enrollments: "Enrollments",
    programHomeworkAssignments: "Program Homework Assignments",
  },
  assets: {
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    assetLabel: "Asset Label",
    uploadDestination: "Upload Destination",
    assetPurpose: "Asset Purpose",
    attachment: "Airtable Attachment",
    homeworkCompletions: "Homework Completions",
    originalFileName: "Original File Name",
    assetType: "Asset Type",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    assetSlot: "Asset Slot",
    sendToMakeTrigger: "Send to Make Trigger",
  },
  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    activityDate: "Activity Date",
    gradeBand: "Grade Band",
    weeklySummary: "Weekly Athlete Summary",
    homeworkName1: "Homework Name 1", // PHA record ID (Program Homework Assignments)
    homeworkName2: "Homework Name 2", // PHA record ID (Program Homework Assignments)
  },
  enrollments: {
    gradeBand: "Grade Band",
    programInstance: "Program Instance",
  },
  pha: {
    homeworkAssignment: "Homework Assignment",
    programInstance: "Program Instance",
    week: "Week",
    gradeBand: "Grade Band", // eligibility metadata only; ignored for matching
    slot: "Homework Slot",
    active: "Active?",
  },
  homework: {
    homework: "Homework",
    programHomeworkAssignment: "Program Homework Assignment",
    submission: "Submissions - Linked",
    uploadStatus: "Upload Status",
    submissionAssets: "Submission Assets",
    enrollment: "Enrollment",
    week: "Week",
    gradeBand: "Grade Band",
    weeklySummaryLink: "Weekly Athlete Summary Link",
    submissionDate: "Submission Date",
    completionStatus: "Completion Status",
    assetLabel: "Asset Label",
    originalFileName: "Original File Name",
    assetType: "Asset Type",
    assetPurpose: "Asset Purpose",
    sourceSystem: "Source System",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    assetSlot: "Asset Slot",
    itemType: "Item Type",
    itemSlot: "Item Slot",
    reviewStatus: "Review Status",
    writebackComplete: "Writeback Complete?",
    satisfactory: "Satisfactory?",
  },
  values: {
    uploadDestinationHomework: "Homework Completions",
    makeSendStatus: "Pending Link",
    uploadStatusError: "Error",
  },
  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
  actions: {
    createdNew: "created_new",
    linkedExisting: "linked_existing",
    linkedExistingEnrollmentIdentity: "linked_existing_enrollment_identity",
    error: "error",
  },
};

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

let debugStep = "0 - Start";
let assetsTable;
let submissionsTable;
let homeworkTable;
let enrollmentsTable;
let phaTable;

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
  return table.fields.find((field) => field.name === fieldName);
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
    "externalSyncSource",
  ]).has(field.type);
}

function safeFields(table, names) {
  return [...new Set(names)].filter((name) => fieldExists(table, name));
}

function cell(record, fieldName) {
  try {
    return record.getCellValue(fieldName);
  } catch {
    return null;
  }
}

function text(record, fieldName) {
  try {
    return String(record.getCellValueAsString(fieldName) || "").trim();
  } catch {
    return "";
  }
}

function selectName(record, fieldName) {
  const v = cell(record, fieldName);
  return v?.name ? String(v.name).trim() : "";
}

function linkedIds(record, fieldName) {
  const v = cell(record, fieldName);
  return Array.isArray(v) ? v.map((x) => x?.id).filter(Boolean) : [];
}

function firstLinkedId(record, fieldName) {
  return linkedIds(record, fieldName)[0] || "";
}

function attachments(record, fieldName) {
  const v = cell(record, fieldName);
  return Array.isArray(v) ? v : [];
}

function choiceExists(table, fieldName, choiceName) {
  return Boolean(getField(table, fieldName)?.options?.choices?.some((c) => c.name === choiceName));
}

function setLink(fields, table, fieldName, ids) {
  if (isWritable(table, fieldName)) fields[fieldName] = [...new Set((ids || []).filter(Boolean))].map((id) => ({ id }));
}

function setSingleSelect(fields, table, fieldName, choiceName) {
  if (isWritable(table, fieldName) && choiceName && choiceExists(table, fieldName, choiceName)) {
    fields[fieldName] = { name: choiceName };
  }
}

function setCheckbox(fields, table, fieldName, value) {
  if (isWritable(table, fieldName)) fields[fieldName] = Boolean(value);
}

function setTextField(fields, table, fieldName, value) {
  if (isWritable(table, fieldName) && value !== undefined && value !== null && value !== "") {
    fields[fieldName] = String(value);
  }
}

function setDate(fields, table, fieldName, value) {
  if (isWritable(table, fieldName) && value) fields[fieldName] = value;
}

function booleanish(record, fieldName) {
  const v = cell(record, fieldName);
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  return ["1", "true", "yes", "checked", "active"].includes(String(v).trim().toLowerCase());
}

function inferSlot(asset) {
  const existing = selectName(asset, CONFIG.assets.assetSlot);
  if (existing === "HW1" || existing === "HW2") return existing;
  const purpose = selectName(asset, CONFIG.assets.assetPurpose);
  if (purpose === "Homework 1") return "HW1";
  if (purpose === "Homework 2") return "HW2";
  const label = text(asset, CONFIG.assets.assetLabel);
  if (label.startsWith("HW1")) return "HW1";
  if (label.startsWith("HW2")) return "HW2";
  return "";
}

function homeworkFieldForSlot(slot) {
  return slot === "HW1"
    ? CONFIG.submissions.homeworkName1
    : slot === "HW2"
      ? CONFIG.submissions.homeworkName2
      : "";
}

function getHomeworkSlot(hw) {
  return selectName(hw, CONFIG.homework.assetSlot) || selectName(hw, CONFIG.homework.itemSlot);
}

function unloadQuerySafe(q) {
  if (typeof q?.unloadData === "function") {
    try {
      q.unloadData();
    } catch {
      // unload is best-effort
    }
  }
}

async function validateSelectedPha({ phaId, slot, programInstanceId, weekId }) {
  if (!phaTable) throw new Error("Program Homework Assignments table is unavailable; cannot validate scheduled homework.");
  if (!fieldExists(homeworkTable, CONFIG.homework.programHomeworkAssignment)) {
    throw new Error("Homework Completions.Program Homework Assignment field is unavailable.");
  }
  if (!phaId) throw new Error(`Submission must link exactly one Program Homework Assignment for ${slot || "homework"}.`);
  if (!weekId || !programInstanceId || !slot) {
    throw new Error(
      `Cannot validate PHA without Week, Program Instance, and slot. week=${weekId || "blank"}, programInstance=${programInstanceId || "blank"}, slot=${slot || "blank"}, pha=${phaId || "blank"}`
    );
  }
  const fields = [
    CONFIG.pha.homeworkAssignment,
    CONFIG.pha.programInstance,
    CONFIG.pha.week,
    CONFIG.pha.slot,
    CONFIG.pha.active,
  ];
  const pha = await phaTable.selectRecordAsync(phaId, { fields: safeFields(phaTable, fields) });
  if (!pha) throw new Error(`Program Homework Assignment not found: ${phaId}. Grade Band is not part of scheduling.`);
  if (fieldExists(phaTable, CONFIG.pha.active) && !booleanish(pha, CONFIG.pha.active)) {
    throw new Error(`Program Homework Assignment ${phaId} is inactive. Grade Band is not part of scheduling.`);
  }
  const phaPi = firstLinkedId(pha, CONFIG.pha.programInstance);
  const phaWeek = firstLinkedId(pha, CONFIG.pha.week);
  const recordSlot = selectName(pha, CONFIG.pha.slot);
  const libraryIds = linkedIds(pha, CONFIG.pha.homeworkAssignment);
  if (phaPi !== programInstanceId) {
    throw new Error(
      `Program Homework Assignment ${phaId} Program Instance mismatch: expected ${programInstanceId}, got ${phaPi || "blank"}. Grade Band is not part of scheduling.`
    );
  }
  if (phaWeek !== weekId) {
    throw new Error(
      `Program Homework Assignment ${phaId} Week mismatch: expected ${weekId}, got ${phaWeek || "blank"}. Grade Band is not part of scheduling.`
    );
  }
  if (recordSlot !== slot) {
    throw new Error(
      `Program Homework Assignment ${phaId} slot mismatch: expected ${slot}, got ${recordSlot || "blank"}. Grade Band is not part of scheduling.`
    );
  }
  if (libraryIds.length !== 1) {
    throw new Error(
      `Program Homework Assignment ${phaId} must link exactly one Homework Assignment; found ${libraryIds.length}. Grade Band is not part of scheduling.`
    );
  }
  return { phaId, libraryId: libraryIds[0] };
}

function pickPreferredHomeworkCompletion(candidates) {
  if (!candidates?.length) return null;
  if (candidates.length === 1) return candidates[0];
  return [...candidates].sort((a, b) => {
    const aSat =
      fieldExists(homeworkTable, CONFIG.homework.satisfactory) && cell(a, CONFIG.homework.satisfactory) === true
        ? 1
        : 0;
    const bSat =
      fieldExists(homeworkTable, CONFIG.homework.satisfactory) && cell(b, CONFIG.homework.satisfactory) === true
        ? 1
        : 0;
    if (bSat !== aSat) return bSat - aSat;
    const aAssets = linkedIds(a, CONFIG.homework.submissionAssets).length;
    const bAssets = linkedIds(b, CONFIG.homework.submissionAssets).length;
    if (bAssets !== aAssets) return bAssets - aAssets;
    return a.id.localeCompare(b.id);
  })[0];
}

function findHomeworkCompletionMatch(records, { submissionId, enrollmentId, weekId, homeworkId, slot }) {
  const c = records.filter(
    (hw) =>
      firstLinkedId(hw, CONFIG.homework.enrollment) === enrollmentId &&
      firstLinkedId(hw, CONFIG.homework.week) === weekId &&
      firstLinkedId(hw, CONFIG.homework.homework) === homeworkId &&
      getHomeworkSlot(hw) === slot
  );
  if (c.length) {
    return {
      homeworkCompletion: pickPreferredHomeworkCompletion(c),
      matchType: "enrollment_week_homework_slot",
      candidateCount: c.length,
    };
  }
  const e = records.filter(
    (hw) =>
      firstLinkedId(hw, CONFIG.homework.submission) === submissionId &&
      firstLinkedId(hw, CONFIG.homework.homework) === homeworkId &&
      getHomeworkSlot(hw) === slot
  );
  if (e.length) {
    return {
      homeworkCompletion: pickPreferredHomeworkCompletion(e),
      matchType: "exact",
      candidateCount: e.length,
    };
  }
  const b = records.filter(
    (hw) =>
      firstLinkedId(hw, CONFIG.homework.submission) === submissionId &&
      firstLinkedId(hw, CONFIG.homework.homework) === homeworkId &&
      !getHomeworkSlot(hw)
  );
  if (b.length) {
    return {
      homeworkCompletion: pickPreferredHomeworkCompletion(b),
      matchType: "blank_slot",
      candidateCount: b.length,
    };
  }
  return { homeworkCompletion: null, matchType: "", candidateCount: 0 };
}

function mapAssetUploadStatusToHomeworkStatus(s) {
  return s === "Uploaded" ? "Uploaded" : s === "Processing" ? "Processing" : s === "Error" ? "Error" : "Pending";
}

function datesEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function buildHomeworkUploadSyncFields(hw, asset) {
  const fields = {};
  const assetStatus = selectName(asset, CONFIG.assets.uploadStatus);
  const targetStatus = mapAssetUploadStatusToHomeworkStatus(assetStatus);
  if (targetStatus !== selectName(hw, CONFIG.homework.uploadStatus)) {
    setSingleSelect(fields, homeworkTable, CONFIG.homework.uploadStatus, targetStatus);
  }
  const assetError = text(asset, CONFIG.assets.uploadError);
  const currentError = text(hw, CONFIG.homework.uploadError);
  if (assetError !== currentError && isWritable(homeworkTable, CONFIG.homework.uploadError)) {
    fields[CONFIG.homework.uploadError] = assetError;
  }
  const assetUploadedAt = cell(asset, CONFIG.assets.uploadedAt);
  const currentUploadedAt = cell(hw, CONFIG.homework.uploadedAt);
  if (!datesEqual(assetUploadedAt, currentUploadedAt)) {
    setDate(fields, homeworkTable, CONFIG.homework.uploadedAt, assetUploadedAt);
  }
  if (assetStatus === "Uploaded" && cell(hw, CONFIG.homework.writebackComplete) !== true) {
    setCheckbox(fields, homeworkTable, CONFIG.homework.writebackComplete, true);
  }
  return fields;
}

async function markAssetError(asset, message) {
  const fields = {};
  setSingleSelect(fields, assetsTable, CONFIG.assets.uploadStatus, CONFIG.values.uploadStatusError);
  if (isWritable(assetsTable, CONFIG.assets.uploadError)) fields[CONFIG.assets.uploadError] = message;
  if (Object.keys(fields).length) await assetsTable.updateRecordAsync(asset.id, fields);
  throw new Error(message);
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
  assetsTable = base.getTable(CONFIG.tables.assets);
  submissionsTable = base.getTable(CONFIG.tables.submissions);
  homeworkTable = base.getTable(CONFIG.tables.homework);
  enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  phaTable = base.getTable(CONFIG.tables.programHomeworkAssignments);

  step("3 - Load submission asset");
  const assetQuery = await assetsTable.selectRecordsAsync({
    fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
  });
  const asset = assetQuery.getRecord(recordId);
  if (!asset) throw new Error(`Submission Asset not found: ${recordId}`);

  const existingHomeworkIds = linkedIds(asset, CONFIG.assets.homeworkCompletions);
  const uploadDestination = text(asset, CONFIG.assets.uploadDestination);
  const assetPurpose = selectName(asset, CONFIG.assets.assetPurpose);
  const assetAttachments = attachments(asset, CONFIG.assets.attachment);
  const submissionIds = linkedIds(asset, CONFIG.assets.submission);
  const enrollmentIds = linkedIds(asset, CONFIG.assets.enrollment);
  const slot = inferSlot(asset);

  step("4 - Validate asset gates");
  if (uploadDestination !== CONFIG.values.uploadDestinationHomework) {
    await markAssetError(asset, `Upload Destination is not Homework Completions. Actual: ${uploadDestination}`);
  }
  if (!(assetPurpose === "Homework 1" || assetPurpose === "Homework 2")) {
    await markAssetError(asset, `Asset Purpose must be Homework 1 or Homework 2. Actual: ${assetPurpose}`);
  }
  if (!assetAttachments.length) await markAssetError(asset, "Asset has no Airtable Attachment.");
  if (submissionIds.length !== 1) {
    await markAssetError(asset, `Asset must have exactly one linked Submission; found ${submissionIds.length}.`);
  }
  if (enrollmentIds.length !== 1) {
    await markAssetError(asset, `Asset must have exactly one linked Enrollment; found ${enrollmentIds.length}.`);
  }
  if (!(slot === "HW1" || slot === "HW2")) await markAssetError(asset, "Could not infer HW1/HW2.");

  step("5 - Load submission and enrollment");
  const submissionId = submissionIds[0];
  const submissionsQuery = await submissionsTable.selectRecordsAsync({
    fields: safeFields(submissionsTable, Object.values(CONFIG.submissions)),
  });
  const submission = submissionsQuery.getRecord(submissionId);
  if (!submission) await markAssetError(asset, `Linked Submission could not be loaded: ${submissionId}`);

  const homeworkField = homeworkFieldForSlot(slot);
  const phaIds = linkedIds(submission, homeworkField);
  if (phaIds.length !== 1) {
    await markAssetError(asset, `Submission must have exactly one ${homeworkField}; found ${phaIds.length}.`);
  }
  const phaIdFromSubmission = phaIds[0];

  const submissionEnrollmentIds = linkedIds(submission, CONFIG.submissions.enrollment);
  if (submissionEnrollmentIds.length !== 1 || submissionEnrollmentIds[0] !== enrollmentIds[0]) {
    await markAssetError(asset, "Submission Enrollment does not match Submission Asset Enrollment.");
  }
  const weekIds = linkedIds(submission, CONFIG.submissions.week);
  if (weekIds.length !== 1) {
    await markAssetError(asset, `Submission must have exactly one Week; found ${weekIds.length}.`);
  }

  const enrollmentFields = [CONFIG.enrollments.programInstance];
  if (fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBand)) {
    enrollmentFields.push(CONFIG.enrollments.gradeBand);
  }
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentIds[0], {
    fields: safeFields(enrollmentsTable, enrollmentFields),
  });
  if (!enrollment) await markAssetError(asset, `Enrollment could not be loaded: ${enrollmentIds[0]}`);
  const programInstanceIds = linkedIds(enrollment, CONFIG.enrollments.programInstance);
  if (programInstanceIds.length !== 1) {
    await markAssetError(
      asset,
      `Enrollment must have exactly one Program Instance; found ${programInstanceIds.length}.`
    );
  }
  const athleteGradeBandIds = fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBand)
    ? linkedIds(enrollment, CONFIG.enrollments.gradeBand)
    : [];
  const gradeBandId = athleteGradeBandIds.length === 1 ? athleteGradeBandIds[0] : "";

  step("6 - Validate selected PHA");
  const { phaId, libraryId } = await validateSelectedPha({
    phaId: phaIdFromSubmission,
    slot,
    programInstanceId: programInstanceIds[0],
    weekId: weekIds[0],
  });

  step("7 - Find existing homework completion");
  const homeworkFields = safeFields(homeworkTable, Object.values(CONFIG.homework));
  const homeworkQuery = await homeworkTable.selectRecordsAsync({ fields: homeworkFields });
  const matchArgs = {
    submissionId,
    enrollmentId: enrollmentIds[0],
    weekId: weekIds[0],
    homeworkId: libraryId,
    slot,
  };
  let match = findHomeworkCompletionMatch(homeworkQuery.records, matchArgs);
  if (match.candidateCount > 1) {
    await markAssetError(
      asset,
      `Multiple canonical Homework Completion candidates found (${match.candidateCount}); refusing to choose a preferred record.`
    );
  }
  let homeworkCompletion = match.homeworkCompletion;
  if (!homeworkCompletion) {
    step("8 - Recheck before create");
    const recheck = await homeworkTable.selectRecordsAsync({ fields: homeworkFields });
    match = findHomeworkCompletionMatch(recheck.records, matchArgs);
    if (match.candidateCount > 1) {
      await markAssetError(
        asset,
        `Multiple canonical Homework Completion candidates found during create recheck (${match.candidateCount}); refusing to create or choose.`
      );
    }
    homeworkCompletion = match.homeworkCompletion;
    unloadQuerySafe(recheck);
  }
  unloadQuerySafe(homeworkQuery);
  unloadQuerySafe(submissionsQuery);
  unloadQuerySafe(assetQuery);

  if (existingHomeworkIds.length > 1) {
    await markAssetError(asset, `Submission Asset links multiple Homework Completions (${existingHomeworkIds.length}).`);
  }
  if (
    existingHomeworkIds.length === 1 &&
    homeworkCompletion &&
    existingHomeworkIds[0] !== homeworkCompletion.id
  ) {
    await markAssetError(
      asset,
      `Asset links Homework Completion ${existingHomeworkIds[0]}, but canonical assignment resolves to ${homeworkCompletion.id}.`
    );
  }

  let homeworkCompletionId = "";
  let actionOut = "";
  let gradeBandActionOut = gradeBandId ? "" : "skipped_no_enrollment_grade_band";

  if (homeworkCompletion) {
    step("9 - Link existing homework completion");
    actionOut =
      match.matchType === "enrollment_week_homework_slot"
        ? CONFIG.actions.linkedExistingEnrollmentIdentity
        : CONFIG.actions.linkedExisting;
    const updates = {};
    setLink(updates, homeworkTable, CONFIG.homework.submissionAssets, [
      ...linkedIds(homeworkCompletion, CONFIG.homework.submissionAssets),
      asset.id,
    ]);
    setLink(updates, homeworkTable, CONFIG.homework.submission, [
      ...linkedIds(homeworkCompletion, CONFIG.homework.submission),
      submissionId,
    ]);
    if (!selectName(homeworkCompletion, CONFIG.homework.assetSlot)) {
      setSingleSelect(updates, homeworkTable, CONFIG.homework.assetSlot, slot);
    }
    if (!selectName(homeworkCompletion, CONFIG.homework.itemSlot)) {
      setSingleSelect(updates, homeworkTable, CONFIG.homework.itemSlot, slot);
    }
    if (!firstLinkedId(homeworkCompletion, CONFIG.homework.homework)) {
      setLink(updates, homeworkTable, CONFIG.homework.homework, [libraryId]);
    }
    const existingPhaIds = linkedIds(homeworkCompletion, CONFIG.homework.programHomeworkAssignment);
    if (!existingPhaIds.length) {
      setLink(updates, homeworkTable, CONFIG.homework.programHomeworkAssignment, [phaId]);
    } else if (existingPhaIds.length !== 1 || existingPhaIds[0] !== phaId) {
      await markAssetError(
        asset,
        `Homework Completion ${homeworkCompletion.id} has conflicting Program Homework Assignment ownership.`
      );
    }
    Object.assign(updates, buildHomeworkUploadSyncFields(homeworkCompletion, asset));
    if (gradeBandId && linkedIds(homeworkCompletion, CONFIG.homework.gradeBand).length === 0) {
      setLink(updates, homeworkTable, CONFIG.homework.gradeBand, [gradeBandId]);
      gradeBandActionOut = "copied_grade_band";
    } else if (linkedIds(homeworkCompletion, CONFIG.homework.gradeBand).length) {
      gradeBandActionOut = "already_has_grade_band";
    }
    if (Object.keys(updates).length) await homeworkTable.updateRecordAsync(homeworkCompletion.id, updates);
    homeworkCompletionId = homeworkCompletion.id;
  } else {
    step("9 - Create homework completion");
    actionOut = CONFIG.actions.createdNew;
    const fields = {};
    setLink(fields, homeworkTable, CONFIG.homework.homework, [libraryId]);
    setLink(fields, homeworkTable, CONFIG.homework.programHomeworkAssignment, [phaId]);
    setLink(fields, homeworkTable, CONFIG.homework.submission, [submissionId]);
    setLink(fields, homeworkTable, CONFIG.homework.enrollment, enrollmentIds);
    setLink(fields, homeworkTable, CONFIG.homework.week, weekIds);
    if (gradeBandId) {
      setLink(fields, homeworkTable, CONFIG.homework.gradeBand, [gradeBandId]);
      gradeBandActionOut = "copied_grade_band";
    }
    setLink(fields, homeworkTable, CONFIG.homework.weeklySummaryLink, linkedIds(submission, CONFIG.submissions.weeklySummary));
    setLink(fields, homeworkTable, CONFIG.homework.submissionAssets, [asset.id]);
    setDate(fields, homeworkTable, CONFIG.homework.submissionDate, cell(submission, CONFIG.submissions.activityDate));
    setSingleSelect(
      fields,
      homeworkTable,
      CONFIG.homework.uploadStatus,
      mapAssetUploadStatusToHomeworkStatus(selectName(asset, CONFIG.assets.uploadStatus))
    );
    setSingleSelect(fields, homeworkTable, CONFIG.homework.completionStatus, "Submitted");
    setSingleSelect(fields, homeworkTable, CONFIG.homework.reviewStatus, "Ready for Review");
    setSingleSelect(fields, homeworkTable, CONFIG.homework.assetSlot, slot);
    setSingleSelect(fields, homeworkTable, CONFIG.homework.itemSlot, slot);
    setSingleSelect(fields, homeworkTable, CONFIG.homework.assetType, selectName(asset, CONFIG.assets.assetType));
    setSingleSelect(fields, homeworkTable, CONFIG.homework.assetPurpose, "Homework Turn-In");
    setSingleSelect(fields, homeworkTable, CONFIG.homework.sourceSystem, "Fillout");
    setSingleSelect(fields, homeworkTable, CONFIG.homework.itemType, "Homework");
    setTextField(fields, homeworkTable, CONFIG.homework.assetLabel, text(asset, CONFIG.assets.assetLabel));
    setTextField(fields, homeworkTable, CONFIG.homework.originalFileName, text(asset, CONFIG.assets.originalFileName));
    setTextField(fields, homeworkTable, CONFIG.homework.uploadError, text(asset, CONFIG.assets.uploadError));
    setDate(fields, homeworkTable, CONFIG.homework.uploadedAt, cell(asset, CONFIG.assets.uploadedAt));
    if (selectName(asset, CONFIG.assets.uploadStatus) === "Uploaded") {
      setCheckbox(fields, homeworkTable, CONFIG.homework.writebackComplete, true);
    }
    homeworkCompletionId = await homeworkTable.createRecordAsync(fields);
  }

  step("10 - Update asset and finish");
  const assetUpdates = {};
  setLink(assetUpdates, assetsTable, CONFIG.assets.homeworkCompletions, [homeworkCompletionId]);
  if (!selectName(asset, CONFIG.assets.assetSlot)) {
    setSingleSelect(assetUpdates, assetsTable, CONFIG.assets.assetSlot, slot);
  }
  const currentStatus = selectName(asset, CONFIG.assets.uploadStatus);
  if (!currentStatus || currentStatus === CONFIG.values.uploadStatusError) {
    setSingleSelect(assetUpdates, assetsTable, CONFIG.assets.uploadStatus, CONFIG.values.makeSendStatus);
  }
  setCheckbox(assetUpdates, assetsTable, CONFIG.assets.sendToMakeTrigger, true);
  if (Object.keys(assetUpdates).length) await assetsTable.updateRecordAsync(asset.id, assetUpdates);

  setFinalOutputs({
    statusOut: CONFIG.statuses.success,
    actionOut,
    errorOut: "",
    debugStep,
    submissionAssetId: asset.id,
    homeworkCompletionId,
    slot,
    gradeBandActionOut,
    gradeBandSchedulingUsed: false,
    phaId,
    libraryId,
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
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: CONFIG.statuses.error,
      actionOut: CONFIG.actions.error,
      errorOut: message,
      debugStep,
    })
  );
  throw error;
}

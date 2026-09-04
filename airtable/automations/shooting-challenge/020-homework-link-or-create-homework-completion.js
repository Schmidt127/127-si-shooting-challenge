/*
Automation: 020 - Homework - Link or Create Homework Completion
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-19
Last GitHub Update: 2026-09-04 (v4.0 SC-160 PHA Week + Early/On Time/Late timing)

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
 * Version: v4.0
 * Date Written: 2026-06-20
 * Last Updated: 2026-09-04
 *
 * VERSION HISTORY
 * - v4.0 (2026-09-04): SC-160 — HC Week from PHA.Week (Submission.Week optional).
 *   Early / On Time / Late from qualifying asset Uploaded At (latest wins) vs
 *   PHA Due Date or Week End Saturday 11:59:59pm America/Denver. Early counts
 *   toward assigned Week; Perfect Week award waits for week evaluation time.
 * - v3.9 (2026-09-03): Late submissions remain credit-eligible for homework XP.
 *   Notes still record late timing; Perfect Week on-time gate stays in 057.
 * - v3.8 (2026-08-28): FUT-001 — match Homework Completion by Enrollment + PHA
 *   identity (not upload slot); accept alternate HW1/HW2 upload slot when assignment
 *   identity is unambiguous; enforce PHA Due Date with Week End Date fallback;
 *   mark late submissions in Notes without deleting HC.
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
 * - 020 resolves the selected PHA by assignment identity (Homework Name 1/2), not by
 *   upload slot alone. Upload slot (HW Sub 1/2) is routing metadata only.
 * - 020 loads the selected PHA directly and validates PI + Active + Homework Assignment.
 * - HC.Week comes from PHA.Week (authoritative). Submission.Week may be empty (early /
 *   outside-calendar Activity Date). Submission.Week is never required for HC create/link.
 * - Homework Library content ID comes from PHA.Homework Assignment (exactly one link).
 * - HC.Homework = library ID; HC.Program Homework Assignment = PHA ID.
 * - HC Item Slot / Asset Slot are normalized to PHA.Homework Slot (official schedule slot).
 *
 * SCHEDULING RULE
 * - Operational identity is Enrollment + Program Homework Assignment (PHA record id).
 * - PHA.Week is the assigned Week for timing, XP week link, and Perfect Week.
 * - PHA Grade Band is eligibility/descriptive metadata only and is NEVER used to resolve schedule ownership.
 * - A PHA may list all grade bands (K-2 … 9-12). Multi-band Grade Band never rejects a valid match.
 * - Athlete Grade Band may still be copied to Homework Completions as athlete metadata when available.
 *
 * PRODUCT RULE
 * - One Homework Completion per Enrollment + Program Homework Assignment (same assignment identity).
 * - Repeat uploads and multi-file submissions link to the same Homework Completion.
 * - Qualifying timestamp = latest linked asset Uploaded At (else Activity Date). Placeholder
 *   before deadline + satisfactory replacement after → late for Perfect Week.
 * - Early / On Time / Late recorded in Notes; late remains full XP via 065; Perfect Week
 *   on-time/early gate stays in 057.
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
 * - submissionAssetId / homeworkCompletionId / uploadSlot / officialSlot / phaId / libraryId
 * - creditEligible / timingStatus / dueDateKey / assignmentIdentityMethod
 * - gradeBandSchedulingUsed = false (always; Grade Band is not scheduling)
 *
 * PRIMARY TABLES USED
 * - Submission Assets, Submissions, Homework Completions, Enrollments,
 *   Program Homework Assignments, Weeks
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
  version: "v4.0",
  versionDate: "2026-09-04",
  originalWrittenDate: "2026-06-20",
  lastUpdated: "2026-09-04",
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
    weeks: "Weeks",
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
    dueDate: "Due Date",
  },
  weeks: {
    startDate: "Start Date",
    endDate: "End Date",
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
    notes: "Notes",
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
let weeksTable;

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

function isRecId(value) {
  return typeof value === "string" && /^rec[a-zA-Z0-9]{14}$/.test(value.trim());
}

function toDateKeyFromText(textValue) {
  const text = String(textValue || "").trim();
  if (!text) return "";
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const localMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (localMatch) {
    const month = localMatch[1].padStart(2, "0");
    const day = localMatch[2].padStart(2, "0");
    return `${localMatch[3]}-${month}-${day}`;
  }
  return "";
}

function resolveHomeworkAssignmentIdentity({ hw1PhaId, hw2PhaId, assetUploadSlot }) {
  const hw1 = isRecId(hw1PhaId) ? String(hw1PhaId).trim() : "";
  const hw2 = isRecId(hw2PhaId) ? String(hw2PhaId).trim() : "";
  const slot = String(assetUploadSlot || "").trim().toUpperCase();
  const unique = [...new Set([hw1, hw2].filter(Boolean))];
  if (unique.length === 0) return { ok: false, reason: "missing_pha_selection", phaId: "", method: "" };
  if (unique.length === 1) {
    return {
      ok: true,
      reason: "single_assignment_identity",
      phaId: unique[0],
      method: unique[0] === hw1 ? "homework_name_1" : "homework_name_2",
      alternateUploadSlot: slot === "HW1" || slot === "HW2" ? (unique[0] === hw1 ? slot === "HW2" : slot === "HW1") : false,
    };
  }
  const slotFieldPha = slot === "HW1" ? hw1 : slot === "HW2" ? hw2 : "";
  if (slotFieldPha && unique.includes(slotFieldPha)) {
    return {
      ok: true,
      reason: "dual_assignment_slot_field_match",
      phaId: slotFieldPha,
      method: slot === "HW1" ? "homework_name_1" : "homework_name_2",
      alternateUploadSlot: false,
    };
  }
  return { ok: false, reason: "ambiguous_dual_assignment", phaId: "", method: "", candidatePhaIds: unique };
}

function resolveAssignmentDueDateKey(phaDueDate, weekEndDate) {
  const fromPha = toDateKeyFromText(phaDueDate);
  if (fromPha) return fromPha;
  return toDateKeyFromText(weekEndDate) || "";
}

/**
 * SC-160: PHA.Week is authoritative for Homework Completion Week.
 * Submission.Week may be empty (early / outside official calendar).
 */
function resolveHomeworkAssignedWeekId({ phaWeekId = "", submissionWeekId = "" } = {}) {
  const phaWeek = String(phaWeekId || "").trim();
  const submissionWeek = String(submissionWeekId || "").trim();
  if (phaWeek) {
    return {
      ok: true,
      weekId: phaWeek,
      source: "pha_week",
      submissionWeekIgnored: Boolean(submissionWeek && submissionWeek !== phaWeek),
      reason:
        submissionWeek && submissionWeek !== phaWeek
          ? "Submission.Week differs from PHA.Week; PHA.Week is authoritative for Homework Completion."
          : "PHA.Week is authoritative for Homework Completion.",
    };
  }
  if (submissionWeek) {
    return {
      ok: true,
      weekId: submissionWeek,
      source: "submission_week_fallback",
      submissionWeekIgnored: false,
      reason: "PHA.Week missing; falling back to Submission.Week.",
    };
  }
  return {
    ok: false,
    weekId: "",
    source: "",
    submissionWeekIgnored: false,
    reason: "Neither PHA.Week nor Submission.Week is available.",
  };
}

/**
 * Qualifying athlete timestamp = latest Uploaded At among candidates (placeholder rule).
 */
function resolveQualifyingSubmissionDateKey({ assetUploadedAts = [], activityDateKey = "" } = {}) {
  const keys = [];
  for (const value of assetUploadedAts || []) {
    const key = toDateKeyFromText(value);
    if (key) keys.push(key);
  }
  if (keys.length) {
    keys.sort();
    return { dateKey: keys[keys.length - 1], source: "asset_uploaded_at" };
  }
  if (activityDateKey) return { dateKey: activityDateKey, source: "activity_date" };
  return { dateKey: "", source: "" };
}

function evaluateHomeworkSubmissionDeadline({
  submissionDateKey,
  phaDueDate,
  weekEndDate,
  weekStartDate = "",
}) {
  const submitKey = toDateKeyFromText(submissionDateKey);
  const dueKey = resolveAssignmentDueDateKey(phaDueDate, weekEndDate);
  const weekStartKey = toDateKeyFromText(weekStartDate);
  if (!submitKey) {
    return {
      creditEligible: true,
      timingStatus: "unknown_submission_date",
      dueDateKey: dueKey,
      weekStartDateKey: weekStartKey,
      perfectWeekEligible: false,
      reason:
        "Submission date missing; deadline not enforced for XP. Perfect Week requires a known on-time Submission Date.",
    };
  }
  if (!dueKey) {
    const early = Boolean(weekStartKey && submitKey < weekStartKey);
    return {
      creditEligible: true,
      timingStatus: early ? "early" : "no_due_date",
      dueDateKey: "",
      weekStartDateKey: weekStartKey,
      perfectWeekEligible: true,
      reason: early
        ? `Qualifying submit ${submitKey} is before assigned Week Start ${weekStartKey}.`
        : "No PHA Due Date or Week End Date; deadline not enforced.",
    };
  }
  if (submitKey > dueKey) {
    return {
      creditEligible: true,
      timingStatus: "late",
      dueDateKey: dueKey,
      weekStartDateKey: weekStartKey,
      perfectWeekEligible: false,
      reason: `Submission date ${submitKey} is after assignment due date ${dueKey}. Full XP credit allowed; does not count toward Perfect Week.`,
    };
  }
  if (weekStartKey && submitKey < weekStartKey) {
    return {
      creditEligible: true,
      timingStatus: "early",
      dueDateKey: dueKey,
      weekStartDateKey: weekStartKey,
      perfectWeekEligible: true,
      reason: `Qualifying submit ${submitKey} is before assigned Week Start ${weekStartKey}. Counts toward assigned Week; Perfect Week award waits for week evaluation time.`,
    };
  }
  return {
    creditEligible: true,
    timingStatus: "on_time",
    dueDateKey: dueKey,
    weekStartDateKey: weekStartKey,
    perfectWeekEligible: true,
    reason: "",
  };
}

function buildLateSubmissionNote({ timingStatus, dueDateKey, submissionDateKey, weekStartDateKey = "" }) {
  return buildTimingSubmissionNote({ timingStatus, dueDateKey, submissionDateKey, weekStartDateKey });
}

function buildTimingSubmissionNote({ timingStatus, dueDateKey, submissionDateKey, weekStartDateKey = "" }) {
  if (timingStatus === "late" || timingStatus === "late_ineligible") {
    return `Late submission: activity date ${submissionDateKey} is after due date ${dueDateKey}. Full homework XP credit still applies once satisfactory; does not count toward Perfect Week for the original week.`;
  }
  if (timingStatus === "early") {
    return `Early submission: qualifying date ${submissionDateKey} is before assigned Week Start ${weekStartDateKey || "(unknown)"}. Counts toward assigned Week; Perfect Week award waits until that Week's evaluation time (after Week End 11:59:59pm America/Denver).`;
  }
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

async function validateSelectedPha({ phaId, programInstanceId, weekId = "" }) {
  if (!phaTable) throw new Error("Program Homework Assignments table is unavailable; cannot validate scheduled homework.");
  if (!fieldExists(homeworkTable, CONFIG.homework.programHomeworkAssignment)) {
    throw new Error("Homework Completions.Program Homework Assignment field is unavailable.");
  }
  if (!phaId) throw new Error("Submission must link exactly one Program Homework Assignment for homework.");
  if (!programInstanceId) {
    throw new Error(
      `Cannot validate PHA without Program Instance. programInstance=${programInstanceId || "blank"}, pha=${phaId || "blank"}`
    );
  }
  const fields = [
    CONFIG.pha.homeworkAssignment,
    CONFIG.pha.programInstance,
    CONFIG.pha.week,
    CONFIG.pha.slot,
    CONFIG.pha.active,
  ];
  if (fieldExists(phaTable, CONFIG.pha.dueDate)) fields.push(CONFIG.pha.dueDate);
  const pha = await phaTable.selectRecordAsync(phaId, { fields: safeFields(phaTable, fields) });
  if (!pha) throw new Error(`Program Homework Assignment not found: ${phaId}. Grade Band is not part of scheduling.`);
  if (fieldExists(phaTable, CONFIG.pha.active) && !booleanish(pha, CONFIG.pha.active)) {
    throw new Error(`Program Homework Assignment ${phaId} is inactive. Grade Band is not part of scheduling.`);
  }
  const phaPi = firstLinkedId(pha, CONFIG.pha.programInstance);
  const phaWeek = firstLinkedId(pha, CONFIG.pha.week);
  const officialSlot = selectName(pha, CONFIG.pha.slot);
  const libraryIds = linkedIds(pha, CONFIG.pha.homeworkAssignment);
  if (phaPi !== programInstanceId) {
    throw new Error(
      `Program Homework Assignment ${phaId} Program Instance mismatch: expected ${programInstanceId}, got ${phaPi || "blank"}. Grade Band is not part of scheduling.`
    );
  }
  if (!phaWeek) {
    throw new Error(
      `Program Homework Assignment ${phaId} is missing Week. PHA.Week is required for Homework Completion ownership.`
    );
  }
  // When a Week is supplied for validation, it must be the PHA Week (SC-160).
  if (weekId && phaWeek !== weekId) {
    throw new Error(
      `Program Homework Assignment ${phaId} Week mismatch: expected ${weekId}, got ${phaWeek}. PHA.Week is authoritative.`
    );
  }
  if (!(officialSlot === "HW1" || officialSlot === "HW2")) {
    throw new Error(
      `Program Homework Assignment ${phaId} has invalid Homework Slot "${officialSlot || "blank"}". Expected HW1 or HW2.`
    );
  }
  if (libraryIds.length !== 1) {
    throw new Error(
      `Program Homework Assignment ${phaId} must link exactly one Homework Assignment; found ${libraryIds.length}. Grade Band is not part of scheduling.`
    );
  }
  return {
    phaId,
    libraryId: libraryIds[0],
    officialSlot,
    phaWeekId: phaWeek,
    phaDueDate: fieldExists(phaTable, CONFIG.pha.dueDate) ? text(pha, CONFIG.pha.dueDate) : "",
  };
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

function findHomeworkCompletionMatch(records, { enrollmentId, weekId, homeworkId, phaId }) {
  const byPha = records.filter(
    (hw) =>
      firstLinkedId(hw, CONFIG.homework.enrollment) === enrollmentId &&
      firstLinkedId(hw, CONFIG.homework.programHomeworkAssignment) === phaId
  );
  if (byPha.length) {
    return {
      homeworkCompletion: pickPreferredHomeworkCompletion(byPha),
      matchType: "enrollment_pha_identity",
      candidateCount: byPha.length,
    };
  }

  const byLibrary = records.filter(
    (hw) =>
      firstLinkedId(hw, CONFIG.homework.enrollment) === enrollmentId &&
      firstLinkedId(hw, CONFIG.homework.week) === weekId &&
      firstLinkedId(hw, CONFIG.homework.homework) === homeworkId
  );
  if (byLibrary.length) {
    return {
      homeworkCompletion: pickPreferredHomeworkCompletion(byLibrary),
      matchType: "enrollment_week_homework",
      candidateCount: byLibrary.length,
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
  weeksTable = base.getTable(CONFIG.tables.weeks);

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
  const uploadSlot = inferSlot(asset);

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
  if (!(uploadSlot === "HW1" || uploadSlot === "HW2")) await markAssetError(asset, "Could not infer HW1/HW2.");

  step("5 - Load submission and enrollment");
  const submissionId = submissionIds[0];
  const submissionsQuery = await submissionsTable.selectRecordsAsync({
    fields: safeFields(submissionsTable, Object.values(CONFIG.submissions)),
  });
  const submission = submissionsQuery.getRecord(submissionId);
  if (!submission) await markAssetError(asset, `Linked Submission could not be loaded: ${submissionId}`);

  const hw1PhaId = firstLinkedId(submission, CONFIG.submissions.homeworkName1);
  const hw2PhaId = firstLinkedId(submission, CONFIG.submissions.homeworkName2);
  const identity = resolveHomeworkAssignmentIdentity({
    hw1PhaId,
    hw2PhaId,
    assetUploadSlot: uploadSlot,
  });
  if (!identity.ok) {
    if (identity.reason === "ambiguous_dual_assignment") {
      await markAssetError(
        asset,
        `Ambiguous homework assignment selection: ${(identity.candidatePhaIds || []).join(", ")}. Correct Homework Name 1/2 selections.`
      );
    }
    await markAssetError(asset, "Submission must link exactly one Program Homework Assignment for homework.");
  }
  const phaIdFromSubmission = identity.phaId;

  const submissionEnrollmentIds = linkedIds(submission, CONFIG.submissions.enrollment);
  if (submissionEnrollmentIds.length !== 1 || submissionEnrollmentIds[0] !== enrollmentIds[0]) {
    await markAssetError(asset, "Submission Enrollment does not match Submission Asset Enrollment.");
  }
  const submissionWeekIds = linkedIds(submission, CONFIG.submissions.week);
  const submissionWeekId = submissionWeekIds.length === 1 ? submissionWeekIds[0] : "";

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

  step("6 - Validate selected PHA (PHA.Week authoritative)");
  const { phaId, libraryId, officialSlot, phaWeekId, phaDueDate } = await validateSelectedPha({
    phaId: phaIdFromSubmission,
    programInstanceId: programInstanceIds[0],
  });
  const assignedWeek = resolveHomeworkAssignedWeekId({
    phaWeekId,
    submissionWeekId,
  });
  if (!assignedWeek.ok) {
    await markAssetError(asset, assignedWeek.reason || "Unable to resolve assigned Week from PHA.");
  }
  const weekIds = [assignedWeek.weekId];

  let weekEndDate = "";
  let weekStartDate = "";
  if (weeksTable) {
    const weekFields = safeFields(weeksTable, [CONFIG.weeks.startDate, CONFIG.weeks.endDate]);
    const weekRecord = await weeksTable.selectRecordAsync(weekIds[0], { fields: weekFields });
    if (weekRecord && fieldExists(weeksTable, CONFIG.weeks.endDate)) {
      weekEndDate = text(weekRecord, CONFIG.weeks.endDate);
    }
    if (weekRecord && fieldExists(weeksTable, CONFIG.weeks.startDate)) {
      weekStartDate = text(weekRecord, CONFIG.weeks.startDate);
    }
  }

  const activityDateKey = toDateKeyFromText(text(submission, CONFIG.submissions.activityDate));
  const existingAssetUploadKeys = [];
  const assetUploadedAtText = text(asset, CONFIG.assets.uploadedAt);
  if (assetUploadedAtText) existingAssetUploadKeys.push(assetUploadedAtText);
  // Include Uploaded At from assets already linked on an existing HC when present later;
  // for first-pass timing before HC load, current asset + activity date are enough.
  const qualifying = resolveQualifyingSubmissionDateKey({
    assetUploadedAts: existingAssetUploadKeys,
    activityDateKey,
  });
  const submissionDateKey = qualifying.dateKey || activityDateKey;
  const deadline = evaluateHomeworkSubmissionDeadline({
    submissionDateKey,
    phaDueDate,
    weekEndDate,
    weekStartDate,
  });
  const timingNote = buildTimingSubmissionNote({
    timingStatus: deadline.timingStatus,
    dueDateKey: deadline.dueDateKey,
    submissionDateKey,
    weekStartDateKey: deadline.weekStartDateKey,
  });
  const lateNote = timingNote;

  step("7 - Find existing homework completion");
  const homeworkFields = safeFields(homeworkTable, Object.values(CONFIG.homework));
  const homeworkQuery = await homeworkTable.selectRecordsAsync({ fields: homeworkFields });
  const matchArgs = {
    enrollmentId: enrollmentIds[0],
    weekId: weekIds[0],
    homeworkId: libraryId,
    phaId,
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
      match.matchType === "enrollment_pha_identity"
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
    setSingleSelect(updates, homeworkTable, CONFIG.homework.assetSlot, officialSlot);
    setSingleSelect(updates, homeworkTable, CONFIG.homework.itemSlot, officialSlot);
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
    // Keep HC.Week aligned to PHA.Week (SC-160).
    if (firstLinkedId(homeworkCompletion, CONFIG.homework.week) !== weekIds[0]) {
      setLink(updates, homeworkTable, CONFIG.homework.week, weekIds);
    }
    // Qualifying Submission Date = latest asset upload day when it is later than stored date.
    const priorUploadKeys = [];
    if (assetUploadedAtText) priorUploadKeys.push(assetUploadedAtText);
    const currentUploadedAt = text(homeworkCompletion, CONFIG.homework.uploadedAt);
    if (currentUploadedAt) priorUploadKeys.push(currentUploadedAt);
    const refinedQualifying = resolveQualifyingSubmissionDateKey({
      assetUploadedAts: priorUploadKeys,
      activityDateKey,
    });
    if (refinedQualifying.dateKey) {
      const existingSubmitKey = toDateKeyFromText(text(homeworkCompletion, CONFIG.homework.submissionDate));
      if (!existingSubmitKey || refinedQualifying.dateKey > existingSubmitKey) {
        setDate(updates, homeworkTable, CONFIG.homework.submissionDate, refinedQualifying.dateKey);
      }
    }
    if (timingNote && isWritable(homeworkTable, CONFIG.homework.notes)) {
      const existingNotes = text(homeworkCompletion, CONFIG.homework.notes);
      const hasTimingNote =
        existingNotes.includes("Late submission:") || existingNotes.includes("Early submission:");
      if (!hasTimingNote) {
        setTextField(
          updates,
          homeworkTable,
          CONFIG.homework.notes,
          existingNotes ? `${existingNotes}\n${timingNote}` : timingNote
        );
      } else if (
        deadline.timingStatus === "late" &&
        existingNotes.includes("Early submission:") &&
        !existingNotes.includes("Late submission:")
      ) {
        // Placeholder early then late replacement — record late for Perfect Week.
        setTextField(
          updates,
          homeworkTable,
          CONFIG.homework.notes,
          `${existingNotes}\n${timingNote}`
        );
      }
    }
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
    // Prefer qualifying asset upload day for Submission Date (timeliness); else Activity Date.
    if (submissionDateKey) {
      setDate(fields, homeworkTable, CONFIG.homework.submissionDate, submissionDateKey);
    } else {
      setDate(fields, homeworkTable, CONFIG.homework.submissionDate, cell(submission, CONFIG.submissions.activityDate));
    }
    setSingleSelect(
      fields,
      homeworkTable,
      CONFIG.homework.uploadStatus,
      mapAssetUploadStatusToHomeworkStatus(selectName(asset, CONFIG.assets.uploadStatus))
    );
    setSingleSelect(fields, homeworkTable, CONFIG.homework.completionStatus, "Submitted");
    setSingleSelect(fields, homeworkTable, CONFIG.homework.reviewStatus, "Ready for Review");
    setSingleSelect(fields, homeworkTable, CONFIG.homework.assetSlot, officialSlot);
    setSingleSelect(fields, homeworkTable, CONFIG.homework.itemSlot, officialSlot);
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
    if (timingNote) {
      setTextField(fields, homeworkTable, CONFIG.homework.notes, timingNote);
    }
    homeworkCompletionId = await homeworkTable.createRecordAsync(fields);
  }

  step("10 - Update asset and finish");
  const assetUpdates = {};
  setLink(assetUpdates, assetsTable, CONFIG.assets.homeworkCompletions, [homeworkCompletionId]);
  if (!selectName(asset, CONFIG.assets.assetSlot)) {
    setSingleSelect(assetUpdates, assetsTable, CONFIG.assets.assetSlot, uploadSlot);
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
    uploadSlot,
    officialSlot,
    gradeBandActionOut,
    gradeBandSchedulingUsed: false,
    phaId,
    libraryId,
    creditEligible: deadline.creditEligible,
    timingStatus: deadline.timingStatus,
    dueDateKey: deadline.dueDateKey,
    assignedWeekId: weekIds[0],
    assignedWeekSource: assignedWeek.source,
    assignmentIdentityMethod: identity.method,
    alternateUploadSlot: Boolean(identity.alternateUploadSlot),
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

/*
Automation: 005 - Submission Intake and Asset Creation - Assign Week to Submission - Homework First
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Version: v5.5
Last Updated: 2026-08-21

Scheduling authority:
- Week comes from Activity Date within the Enrollment Program Instance calendar.
- Submissions.Homework Name 1/2 store Program Homework Assignment (PHA) record IDs.
- 005 loads each selected PHA directly and validates Program Instance + Week + Active + exactly one Homework Assignment.
- PHA.Homework Slot is authoritative for official HW1/HW2 placement. Wrong Fillout field placement is auto-corrected.
- Homework Library content identity comes from PHA.Homework Assignment (exactly one link).
- PHA Grade Band is eligibility/descriptive metadata only and is never used for scheduling matches.

Input:
- recordId = Submission record ID.
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "005 - Submission Intake — Assign Week (Activity Date + PHA validate)",
  version: "v5.5",
  versionDate: "2026-08-21",
  originalWrittenDate: "2026-05-20",
  lastUpdated: "2026-08-21",
  folder: "005 - Submission Intake and Asset Creation",
  automationName: "005 - Submission Intake and Asset Creation - Assign Week to Submission - Homework First",
};

const CONFIG = {
  tables: {
    submissions: "Submissions",
    enrollments: "Enrollments",
    weeks: "Weeks",
    programHomeworkAssignments: "Program Homework Assignments",
  },
  submissions: {
    week: "Week",
    enrollment: "Enrollment",
    activityDate: "Activity Date",
    homework1: "Homework Name 1", // PHA record ID (Program Homework Assignments)
    homework2: "Homework Name 2", // PHA record ID (Program Homework Assignments)
    weekAssignmentStatus: "Week Assignment Status",
  },
  enrollments: {
    programInstance: "Program Instance",
    gradeBand: "Grade Band", // metadata only for this automation
  },
  pha: {
    homeworkAssignment: "Homework Assignment",
    programInstance: "Program Instance",
    week: "Week",
    gradeBand: "Grade Band", // eligibility metadata only; ignored for matching
    slot: "Homework Slot",
    active: "Active?",
  },
  weeks: {
    name: "Week Name",
    startDate: "Start Date",
    endDate: "End Date",
    active: "Active Week?",
    activeAlt: "Active?",
    programInstance: "Program Instance",
  },
  slots: {
    hw1: "HW1",
    hw2: "HW2",
  },
  statuses: { complete: "Complete", skipped: "Skipped", error: "Error" },
  timeZone: "America/Denver",
  debug: { logToConsole: true, clearWeekWhenNoMatch: true },
};

const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
const recordId = String(cfg.recordId || "").trim();
if (!recordId) throw new Error("Missing required input: recordId");

const submissionsTable = base.getTable(CONFIG.tables.submissions);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const weeksTable = base.getTable(CONFIG.tables.weeks);
let phaTable = null;
try { phaTable = base.getTable(CONFIG.tables.programHomeworkAssignments); } catch { phaTable = null; }

function log(message, data = null) {
  if (!CONFIG.debug.logToConsole) return;
  data == null ? console.log(message) : console.log(message, JSON.stringify(data, null, 2));
}
function setOutputSafe(key, value) { try { output.set(key, value); } catch {} }
function fieldExists(table, fieldName) { try { table.getField(fieldName); return true; } catch { return false; } }
function getFieldSafe(table, fieldName) { try { return table.getField(fieldName); } catch { return null; } }
function isWritableField(table, fieldName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return false;
  return !new Set(["formula","rollup","count","lookup","multipleLookupValues","createdTime","lastModifiedTime","createdBy","lastModifiedBy","autoNumber","button","aiText","externalSyncSource"]).has(field.type);
}
function getRaw(record, table, fieldName) { return record && fieldExists(table, fieldName) ? record.getCellValue(fieldName) : null; }
function getText(record, table, fieldName) { return record && fieldExists(table, fieldName) ? String(record.getCellValueAsString(fieldName) || "").trim() : ""; }
function linkedIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  return Array.isArray(raw) ? raw.map(v => v?.id).filter(Boolean) : [];
}
function firstLinkedId(record, table, fieldName) { return linkedIds(record, table, fieldName)[0] || ""; }
function booleanish(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0 || raw == null) return false;
  return ["1","true","yes","checked","active"].includes(String(raw).trim().toLowerCase());
}
function dateKeyFromText(textValue) {
  const text = String(textValue || "").trim();
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}` : "";
}
function dateKeyFromDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  // Airtable date-only values are stored as midnight UTC for the entered calendar
  // day. Do not shift that into the previous America/Denver day.
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: CONFIG.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const y = parts.find(p => p.type === "year")?.value;
  const m = parts.find(p => p.type === "month")?.value;
  const day = parts.find(p => p.type === "day")?.value;
  return y && m && day ? `${y}-${m}-${day}` : "";
}
function safeDateKey(record, table, fieldName) {
  // Prefer the raw Date/object path first so Denver display strings for midnight-UTC
  // date-only values cannot win with the previous Mountain calendar day.
  return dateKeyFromDate(getRaw(record, table, fieldName)) || dateKeyFromText(getText(record, table, fieldName));
}
async function updateSubmissionSafe(id, updates) {
  const safe = {};
  for (const [name, value] of Object.entries(updates || {})) {
    if (fieldExists(submissionsTable, name) && isWritableField(submissionsTable, name) && value !== undefined) safe[name] = value;
  }
  if (!Object.keys(safe).length) return [];
  await submissionsTable.updateRecordAsync(id, safe);
  return Object.keys(safe);
}
function weekActiveField() {
  if (fieldExists(weeksTable, CONFIG.weeks.active)) return CONFIG.weeks.active;
  if (fieldExists(weeksTable, CONFIG.weeks.activeAlt)) return CONFIG.weeks.activeAlt;
  return "";
}
function phaSlot(record) {
  const raw = getRaw(record, phaTable, CONFIG.pha.slot);
  return raw?.name ? String(raw.name).trim() : getText(record, phaTable, CONFIG.pha.slot);
}
function isOfficialSlot(slotValue) {
  return slotValue === CONFIG.slots.hw1 || slotValue === CONFIG.slots.hw2;
}
function sameSingleLink(existingIds, nextId) {
  if (!nextId) return !existingIds.length;
  return existingIds.length === 1 && existingIds[0] === nextId;
}
function linkOrClear(nextId) {
  return nextId ? [{ id: nextId }] : [];
}

async function loadEnrollmentContext(enrollmentId) {
  if (!enrollmentId) return { programInstanceId: "", gradeBandIds: [] };
  if (!fieldExists(enrollmentsTable, CONFIG.enrollments.programInstance)) throw new Error("Enrollments is missing Program Instance.");
  const fields = [CONFIG.enrollments.programInstance];
  if (fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBand)) fields.push(CONFIG.enrollments.gradeBand);
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId, { fields });
  if (!enrollment) throw new Error(`Enrollment not found: ${enrollmentId}`);
  return {
    programInstanceId: firstLinkedId(enrollment, enrollmentsTable, CONFIG.enrollments.programInstance),
    gradeBandIds: fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBand) ? linkedIds(enrollment, enrollmentsTable, CONFIG.enrollments.gradeBand) : [],
  };
}

async function findWeekByActivityDate(activityDateKey, programInstanceId) {
  if (!activityDateKey) return null;
  if (!programInstanceId) throw new Error("Activity Date Week assignment requires Enrollment Program Instance.");
  if (!fieldExists(weeksTable, CONFIG.weeks.programInstance)) throw new Error("Weeks is missing Program Instance.");
  const activeField = weekActiveField();
  const fields = [CONFIG.weeks.name, CONFIG.weeks.startDate, CONFIG.weeks.endDate, CONFIG.weeks.programInstance];
  if (activeField) fields.push(activeField);
  const query = await weeksTable.selectRecordsAsync({ fields: fields.filter(f => fieldExists(weeksTable, f)) });
  const candidates = query.records.filter(r => {
    const pi = firstLinkedId(r, weeksTable, CONFIG.weeks.programInstance);
    const start = safeDateKey(r, weeksTable, CONFIG.weeks.startDate);
    const end = safeDateKey(r, weeksTable, CONFIG.weeks.endDate);
    const active = activeField ? booleanish(r, weeksTable, activeField) : true;
    return pi === programInstanceId && active && start && end && activityDateKey >= start && activityDateKey <= end;
  });
  if (candidates.length === 0) return null;
  if (candidates.length > 1) throw new Error(`Multiple active Weeks matched Activity Date ${activityDateKey} in Program Instance ${programInstanceId}: ${candidates.map(r => r.id).join(", ")}`);
  return { id: candidates[0].id, weekName: getText(candidates[0], weeksTable, CONFIG.weeks.name), sourceUsed: "Activity Date Fallback (Program Instance scoped)" };
}

/**
 * Validate a selected PHA for schedule identity. Does NOT require the Fillout
 * input field to match PHA.Homework Slot — that is normalized separately.
 */
async function validateSelectedPha({ phaId, inputField, programInstanceId, weekId }) {
  if (!phaId) return null;
  if (!phaTable) throw new Error("Program Homework Assignments table is required when Homework Name 1/2 are linked.");
  if (!programInstanceId || !weekId) throw new Error(`PHA validation for ${inputField} requires Program Instance and Week.`);
  const fields = [CONFIG.pha.homeworkAssignment, CONFIG.pha.programInstance, CONFIG.pha.week, CONFIG.pha.slot, CONFIG.pha.active];
  const pha = await phaTable.selectRecordAsync(phaId, { fields: fields.filter(f => fieldExists(phaTable, f)) });
  if (!pha) throw new Error(`Program Homework Assignment not found: ${phaId} (${inputField}).`);
  if (fieldExists(phaTable, CONFIG.pha.active) && !booleanish(pha, phaTable, CONFIG.pha.active)) {
    throw new Error(`Program Homework Assignment ${phaId} is inactive (${inputField}). Grade Band is not part of scheduling.`);
  }
  const phaPi = firstLinkedId(pha, phaTable, CONFIG.pha.programInstance);
  const phaWeek = firstLinkedId(pha, phaTable, CONFIG.pha.week);
  const officialSlot = phaSlot(pha);
  const libraryIds = linkedIds(pha, phaTable, CONFIG.pha.homeworkAssignment);
  if (phaPi !== programInstanceId) {
    throw new Error(`Program Homework Assignment ${phaId} Program Instance mismatch: expected ${programInstanceId}, got ${phaPi || "blank"}. Grade Band is not part of scheduling.`);
  }
  if (phaWeek !== weekId) {
    throw new Error(`Program Homework Assignment ${phaId} Week mismatch: expected ${weekId}, got ${phaWeek || "blank"}. Grade Band is not part of scheduling.`);
  }
  if (!officialSlot) {
    throw new Error(`Program Homework Assignment ${phaId} has a blank Homework Slot (${inputField}). Expected HW1 or HW2.`);
  }
  if (!isOfficialSlot(officialSlot)) {
    throw new Error(`Program Homework Assignment ${phaId} has an invalid Homework Slot "${officialSlot}" (${inputField}). Expected HW1 or HW2.`);
  }
  if (libraryIds.length !== 1) {
    throw new Error(`Program Homework Assignment ${phaId} must link exactly one Homework Assignment; found ${libraryIds.length}. Grade Band is not part of scheduling.`);
  }
  return { phaId, libraryId: libraryIds[0], officialSlot, inputField };
}

/**
 * Place each validated PHA into the official HW1/HW2 field from PHA.Homework Slot.
 * Duplicate official slots fail closed (no silent overwrite).
 */
function normalizeHomeworkPlacement(selections) {
  let officialHw1 = null;
  let officialHw2 = null;
  const messages = [];

  for (const sel of selections) {
    if (sel.officialSlot === CONFIG.slots.hw1) {
      if (officialHw1) {
        throw new Error(
          `Duplicate official HW1 slot: Program Homework Assignments ${officialHw1.phaId} and ${sel.phaId} both resolve to HW1. Do not overwrite; correct the submission selections.`
        );
      }
      officialHw1 = sel;
      if (sel.inputField !== CONFIG.slots.hw1) {
        const msg = `Normalized selected assignment from ${sel.inputField} input to official HW1 slot.`;
        messages.push(msg);
        log(msg, { phaId: sel.phaId, from: sel.inputField, to: CONFIG.slots.hw1 });
      }
    } else if (sel.officialSlot === CONFIG.slots.hw2) {
      if (officialHw2) {
        throw new Error(
          `Duplicate official HW2 slot: Program Homework Assignments ${officialHw2.phaId} and ${sel.phaId} both resolve to HW2. Do not overwrite; correct the submission selections.`
        );
      }
      officialHw2 = sel;
      if (sel.inputField !== CONFIG.slots.hw2) {
        const msg = `Normalized selected assignment from ${sel.inputField} input to official HW2 slot.`;
        messages.push(msg);
        log(msg, { phaId: sel.phaId, from: sel.inputField, to: CONFIG.slots.hw2 });
      }
    } else {
      throw new Error(`Program Homework Assignment ${sel.phaId} has an invalid Homework Slot "${sel.officialSlot || "blank"}". Expected HW1 or HW2.`);
    }
  }

  return {
    officialHw1,
    officialHw2,
    normalized: messages.length > 0,
    message: messages.join(" "),
  };
}

async function main() {
  let debugStep = "Start";
  let submission = null;
  let originalPhaId1 = "";
  let originalPhaId2 = "";
  let phaId1 = "";
  let phaId2 = "";
  let homework1LibraryId = "";
  let homework2LibraryId = "";
  let homeworkSlotNormalized = false;
  let homeworkSlotNormalizationMessage = "";
  let activityDateKey = "";
  let enrollmentId = "";
  let programInstanceId = "";
  let gradeBandIds = [];
  let matchedWeek = null;
  let sourceUsed = "";
  let updatedFields = [];
  try {
    if (!recordId.startsWith("rec")) throw new Error(`Invalid Submission recordId input: ${recordId}`);
    debugStep = "Load Submission";
    const submissionFields = [CONFIG.submissions.week, CONFIG.submissions.enrollment, CONFIG.submissions.activityDate, CONFIG.submissions.homework1, CONFIG.submissions.homework2]
      .filter(f => fieldExists(submissionsTable, f));
    submission = await submissionsTable.selectRecordAsync(recordId, { fields: submissionFields });
    if (!submission) {
      setOutputSafe("ok", false); setOutputSafe("statusOut", CONFIG.statuses.skipped); setOutputSafe("errorOut", `Submission not found: ${recordId}`); return;
    }

    enrollmentId = firstLinkedId(submission, submissionsTable, CONFIG.submissions.enrollment);
    originalPhaId1 = firstLinkedId(submission, submissionsTable, CONFIG.submissions.homework1);
    originalPhaId2 = firstLinkedId(submission, submissionsTable, CONFIG.submissions.homework2);
    phaId1 = originalPhaId1;
    phaId2 = originalPhaId2;
    activityDateKey = safeDateKey(submission, submissionsTable, CONFIG.submissions.activityDate);

    if (enrollmentId) {
      const context = await loadEnrollmentContext(enrollmentId);
      programInstanceId = context.programInstanceId;
      gradeBandIds = context.gradeBandIds;
    }

    if (activityDateKey) {
      if (!enrollmentId) throw new Error("Activity Date Week assignment requires Submission.Enrollment.");
      if (!programInstanceId) throw new Error(`Enrollment ${enrollmentId} is missing Program Instance.`);
      matchedWeek = await findWeekByActivityDate(activityDateKey, programInstanceId);
    }

    if (!matchedWeek) {
      if (originalPhaId1 || originalPhaId2) throw new Error("Homework is selected but no Week could be assigned from Activity Date. Week is assigned from Activity Date only; PHA validates schedule selection.");
      const existingWeekLinks = linkedIds(submission, submissionsTable, CONFIG.submissions.week);
      const updates = {};
      if (CONFIG.debug.clearWeekWhenNoMatch && existingWeekLinks.length && isWritableField(submissionsTable, CONFIG.submissions.week)) updates[CONFIG.submissions.week] = [];
      updatedFields = await updateSubmissionSafe(recordId, updates);
      setOutputSafe("ok", false); setOutputSafe("statusOut", CONFIG.statuses.complete); setOutputSafe("errorOut", "No Week found from Program Instance-scoped Activity Date."); setOutputSafe("debugStep", "Done - No Week Match");
      setOutputSafe("originalHomework1PhaId", originalPhaId1);
      setOutputSafe("originalHomework2PhaId", originalPhaId2);
      setOutputSafe("normalizedHomework1PhaId", "");
      setOutputSafe("normalizedHomework2PhaId", "");
      setOutputSafe("homeworkSlotNormalized", false);
      setOutputSafe("homeworkSlotNormalizationMessage", "");
      return;
    }

    sourceUsed = matchedWeek.sourceUsed || "";
    debugStep = "Validate Homework selections against PHA";
    const selections = [];
    if (originalPhaId1) {
      const hw1 = await validateSelectedPha({
        phaId: originalPhaId1,
        inputField: CONFIG.slots.hw1,
        programInstanceId,
        weekId: matchedWeek.id,
      });
      if (hw1) selections.push(hw1);
    }
    if (originalPhaId2) {
      const hw2 = await validateSelectedPha({
        phaId: originalPhaId2,
        inputField: CONFIG.slots.hw2,
        programInstanceId,
        weekId: matchedWeek.id,
      });
      if (hw2) selections.push(hw2);
    }

    debugStep = "Normalize Homework Name 1/2 from PHA Homework Slot";
    const placement = normalizeHomeworkPlacement(selections);
    phaId1 = placement.officialHw1?.phaId || "";
    phaId2 = placement.officialHw2?.phaId || "";
    homework1LibraryId = placement.officialHw1?.libraryId || "";
    homework2LibraryId = placement.officialHw2?.libraryId || "";
    homeworkSlotNormalized = placement.normalized;
    homeworkSlotNormalizationMessage = placement.message;

    const existingWeekLinks = linkedIds(submission, submissionsTable, CONFIG.submissions.week);
    const existingHw1 = linkedIds(submission, submissionsTable, CONFIG.submissions.homework1);
    const existingHw2 = linkedIds(submission, submissionsTable, CONFIG.submissions.homework2);
    const updates = {};
    if (!(existingWeekLinks.length === 1 && existingWeekLinks[0] === matchedWeek.id)) {
      updates[CONFIG.submissions.week] = [{ id: matchedWeek.id }];
    }
    if (!sameSingleLink(existingHw1, phaId1)) {
      updates[CONFIG.submissions.homework1] = linkOrClear(phaId1);
    }
    if (!sameSingleLink(existingHw2, phaId2)) {
      updates[CONFIG.submissions.homework2] = linkOrClear(phaId2);
    }
    updatedFields = await updateSubmissionSafe(recordId, updates);

    setOutputSafe("ok", true);
    setOutputSafe("recordId", recordId);
    setOutputSafe("matchedWeekId", matchedWeek.id);
    setOutputSafe("matchedWeekName", matchedWeek.weekName);
    setOutputSafe("sourceUsed", sourceUsed);
    setOutputSafe("originalHomework1PhaId", originalPhaId1);
    setOutputSafe("originalHomework2PhaId", originalPhaId2);
    setOutputSafe("normalizedHomework1PhaId", phaId1);
    setOutputSafe("normalizedHomework2PhaId", phaId2);
    setOutputSafe("homeworkSlotNormalized", homeworkSlotNormalized);
    setOutputSafe("homeworkSlotNormalizationMessage", homeworkSlotNormalizationMessage);
    setOutputSafe("homework1PhaId", phaId1);
    setOutputSafe("homework1LibraryId", homework1LibraryId);
    setOutputSafe("homework2PhaId", phaId2);
    setOutputSafe("homework2LibraryId", homework2LibraryId);
    setOutputSafe("activityDateKey", activityDateKey);
    setOutputSafe("enrollmentIdOut", enrollmentId);
    setOutputSafe("programInstanceIdOut", programInstanceId);
    setOutputSafe("gradeBandIdsOut", gradeBandIds.join(","));
    setOutputSafe("gradeBandSchedulingUsed", false);
    setOutputSafe("updatedFields", updatedFields.join(", "));
    setOutputSafe("statusOut", CONFIG.statuses.complete);
    setOutputSafe("errorOut", "");
    setOutputSafe("debugStep", "complete");
    log("Week assignment completed", {
      version: SCRIPT.version,
      recordId,
      programInstanceId,
      matchedWeekId: matchedWeek.id,
      gradeBandSchedulingUsed: false,
      homeworkSlotNormalized,
      originalHomework1PhaId: originalPhaId1,
      originalHomework2PhaId: originalPhaId2,
      normalizedHomework1PhaId: phaId1,
      normalizedHomework2PhaId: phaId2,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setOutputSafe("ok", false);
    setOutputSafe("recordId", recordId);
    setOutputSafe("matchedWeekId", matchedWeek?.id || "");
    setOutputSafe("matchedWeekName", matchedWeek?.weekName || "");
    setOutputSafe("sourceUsed", sourceUsed);
    setOutputSafe("originalHomework1PhaId", originalPhaId1);
    setOutputSafe("originalHomework2PhaId", originalPhaId2);
    setOutputSafe("normalizedHomework1PhaId", phaId1);
    setOutputSafe("normalizedHomework2PhaId", phaId2);
    setOutputSafe("homeworkSlotNormalized", homeworkSlotNormalized);
    setOutputSafe("homeworkSlotNormalizationMessage", homeworkSlotNormalizationMessage);
    setOutputSafe("homework1PhaId", phaId1);
    setOutputSafe("homework1LibraryId", homework1LibraryId);
    setOutputSafe("homework2PhaId", phaId2);
    setOutputSafe("homework2LibraryId", homework2LibraryId);
    setOutputSafe("activityDateKey", activityDateKey);
    setOutputSafe("enrollmentIdOut", enrollmentId);
    setOutputSafe("programInstanceIdOut", programInstanceId);
    setOutputSafe("gradeBandIdsOut", gradeBandIds.join(","));
    setOutputSafe("gradeBandSchedulingUsed", false);
    setOutputSafe("updatedFields", updatedFields.join(", "));
    setOutputSafe("statusOut", CONFIG.statuses.error);
    setOutputSafe("errorOut", message);
    setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);
    throw error;
  }
}

await main();

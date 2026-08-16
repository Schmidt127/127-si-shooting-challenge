/*
Automation: 005 - Submission Intake and Asset Creation - Assign Week to Submission - Homework First
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Version: v5.4
Last Updated: 2026-08-16

Scheduling authority:
- Week comes from Activity Date within the Enrollment Program Instance calendar.
- Submissions.Homework Name 1/2 store Program Homework Assignment (PHA) record IDs.
- 005 loads each selected PHA directly and validates Program Instance + Week + Homework Slot + Active.
- Homework Library content identity comes from PHA.Homework Assignment (exactly one link).
- PHA Grade Band is eligibility/descriptive metadata only and is never used for scheduling matches.

Input:
- recordId = Submission record ID.
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "005 - Submission Intake — Assign Week (Activity Date + PHA validate)",
  version: "v5.4",
  versionDate: "2026-08-16",
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

async function validateSelectedPha({ phaId, slot, programInstanceId, weekId }) {
  if (!phaId) return { phaId: "", libraryId: "" };
  if (!phaTable) throw new Error("Program Homework Assignments table is required when Homework Name 1/2 are linked.");
  if (!programInstanceId || !weekId) throw new Error(`PHA validation for ${slot} requires Program Instance and Week.`);
  const fields = [CONFIG.pha.homeworkAssignment, CONFIG.pha.programInstance, CONFIG.pha.week, CONFIG.pha.slot, CONFIG.pha.active];
  const pha = await phaTable.selectRecordAsync(phaId, { fields: fields.filter(f => fieldExists(phaTable, f)) });
  if (!pha) throw new Error(`Program Homework Assignment not found: ${phaId} (${slot}).`);
  if (fieldExists(phaTable, CONFIG.pha.active) && !booleanish(pha, phaTable, CONFIG.pha.active)) {
    throw new Error(`Program Homework Assignment ${phaId} is inactive (${slot}). Grade Band is not part of scheduling.`);
  }
  const phaPi = firstLinkedId(pha, phaTable, CONFIG.pha.programInstance);
  const phaWeek = firstLinkedId(pha, phaTable, CONFIG.pha.week);
  const phaSlotValue = phaSlot(pha);
  const libraryIds = linkedIds(pha, phaTable, CONFIG.pha.homeworkAssignment);
  if (phaPi !== programInstanceId) {
    throw new Error(`Program Homework Assignment ${phaId} Program Instance mismatch: expected ${programInstanceId}, got ${phaPi || "blank"}. Grade Band is not part of scheduling.`);
  }
  if (phaWeek !== weekId) {
    throw new Error(`Program Homework Assignment ${phaId} Week mismatch: expected ${weekId}, got ${phaWeek || "blank"}. Grade Band is not part of scheduling.`);
  }
  if (phaSlotValue !== slot) {
    throw new Error(`Program Homework Assignment ${phaId} slot mismatch: expected ${slot}, got ${phaSlotValue || "blank"}. Grade Band is not part of scheduling.`);
  }
  if (libraryIds.length !== 1) {
    throw new Error(`Program Homework Assignment ${phaId} must link exactly one Homework Assignment; found ${libraryIds.length}. Grade Band is not part of scheduling.`);
  }
  return { phaId, libraryId: libraryIds[0] };
}

async function main() {
  let debugStep = "Start";
  let submission = null;
  let phaId1 = "";
  let phaId2 = "";
  let homework1LibraryId = "";
  let homework2LibraryId = "";
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
    phaId1 = firstLinkedId(submission, submissionsTable, CONFIG.submissions.homework1);
    phaId2 = firstLinkedId(submission, submissionsTable, CONFIG.submissions.homework2);
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
      if (phaId1 || phaId2) throw new Error("Homework is selected but no Week could be assigned from Activity Date. Week is assigned from Activity Date only; PHA validates schedule selection.");
      const existingWeekLinks = linkedIds(submission, submissionsTable, CONFIG.submissions.week);
      const updates = {};
      if (CONFIG.debug.clearWeekWhenNoMatch && existingWeekLinks.length && isWritableField(submissionsTable, CONFIG.submissions.week)) updates[CONFIG.submissions.week] = [];
      updatedFields = await updateSubmissionSafe(recordId, updates);
      setOutputSafe("ok", false); setOutputSafe("statusOut", CONFIG.statuses.complete); setOutputSafe("errorOut", "No Week found from Program Instance-scoped Activity Date."); setOutputSafe("debugStep", "Done - No Week Match");
      return;
    }

    sourceUsed = matchedWeek.sourceUsed || "";
    debugStep = "Validate Homework selections against PHA";
    if (phaId1) {
      const hw1 = await validateSelectedPha({ phaId: phaId1, slot: "HW1", programInstanceId, weekId: matchedWeek.id });
      homework1LibraryId = hw1.libraryId;
    }
    if (phaId2) {
      const hw2 = await validateSelectedPha({ phaId: phaId2, slot: "HW2", programInstanceId, weekId: matchedWeek.id });
      homework2LibraryId = hw2.libraryId;
    }

    const existingWeekLinks = linkedIds(submission, submissionsTable, CONFIG.submissions.week);
    const updates = {};
    if (!(existingWeekLinks.length === 1 && existingWeekLinks[0] === matchedWeek.id)) updates[CONFIG.submissions.week] = [{ id: matchedWeek.id }];
    updatedFields = await updateSubmissionSafe(recordId, updates);

    setOutputSafe("ok", true);
    setOutputSafe("recordId", recordId);
    setOutputSafe("matchedWeekId", matchedWeek.id);
    setOutputSafe("matchedWeekName", matchedWeek.weekName);
    setOutputSafe("sourceUsed", sourceUsed);
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
    log("Week assignment completed", { version: SCRIPT.version, recordId, programInstanceId, matchedWeekId: matchedWeek.id, gradeBandSchedulingUsed: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setOutputSafe("ok", false);
    setOutputSafe("recordId", recordId);
    setOutputSafe("matchedWeekId", matchedWeek?.id || "");
    setOutputSafe("matchedWeekName", matchedWeek?.weekName || "");
    setOutputSafe("sourceUsed", sourceUsed);
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

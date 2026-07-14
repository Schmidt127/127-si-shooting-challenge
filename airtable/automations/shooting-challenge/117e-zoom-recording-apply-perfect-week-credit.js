/*
GitHub Source of Truth — paste into Airtable starting AFTER this header block
(skip this GitHub header when pasting).
System: 127 SI Shooting Challenge
Backlog: C-025
Folder: 17 - Zoom Recording Credit

LIBRARY/REFERENCE ONLY (S20): Consolidated into
117-zoom-recording-credit-orchestrator.js for DEV automation slot limit.
Do NOT paste this file as one of six separate Airtable automations.
*/

/************************************************************
 * 117e - Zoom Recording Credit - Apply Perfect Week Credit
 *
 * Version: v1.0.0
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-14
 *
 * LIBRARY/REFERENCE (S20)
 * - Logic lives in 117-zoom-recording-credit-orchestrator.js (step E).
 * - Keep this file for contracts/reference; do not paste as a separate DEV slot.
 *
 * PURPOSE
 * - Idempotently ensure Enrollment is on Zoom Meeting Attendees for Perfect Week counting.
 *
 * IMPORTANT DESIGN RULES
 * - Independent Perfect Week Credit Applied? flag from 117d.
 *
 * INPUT
 * - recordId (Zoom Attendance record id)
 *
 * OUTPUTS
 * - statusOut: success | skipped | error
 * - errorOut
 * - debugStep
 * - actionOut
 *
 * TRIGGER
 * - Zoom Attendance (see design package C-025-automation-packages-stage17.md)
 *
 * AUTOMATION NAME
 * - 117e - Zoom Recording Credit - Apply Perfect Week Credit
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: '117e-zoom-recording-apply-perfect-week-credit',
  version: 'v1.0.0',
  versionDate: '2026-07-14',
  originalWrittenDate: '2026-07-14',
  lastUpdated: '2026-07-14',
  folder: "17 - Zoom Recording Credit",
  automationName: '117e - Zoom Recording Credit - Apply Perfect Week Credit',
};

const CONFIG = {
  tables: { zoomAttendance: "Zoom Attendance", zoomMeetings: "Zoom Meetings" },
  fields: {
    attendanceMethod: "Attendance Method",
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    approved: "Zoom Credit Approved?",
    conflict: "Zoom Credit Conflict?",
    pwFlag: "Effective Recording Counts for Perfect Week?",
    pwApplied: "Perfect Week Credit Applied?",
    attendees: "Attendees",
  },
  methods: { recordingQuiz: "Recording Quiz" },
};


function setOutputSafe(key, value) {
  try {
    if (typeof output !== "undefined" && output && typeof output.set === "function") {
      output.set(key, value);
    }
  } catch (e) {
    console.log(`setOutputSafe(${key}) failed: ${e && e.message ? e.message : e}`);
  }
}

function requireRecId(recordId) {
  if (!recordId || typeof recordId !== "string" || !recordId.startsWith("rec")) {
    throw new Error(`Invalid recordId: ${recordId}`);
  }
  return recordId;
}

function getLinkedIds(record, fieldName) {
  const v = record.getCellValue(fieldName);
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => (x && x.id) || x).filter(Boolean);
  if (v.id) return [v.id];
  return [];
}

function getText(record, fieldName) {
  const v = record.getCellValueAsString(fieldName);
  return v == null ? "" : String(v).trim();
}

function getNumber(record, fieldName) {
  const raw = record.getCellValue(fieldName);
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return raw;
  if (Array.isArray(raw) && raw.length === 1) return getNumber({ getCellValue: () => raw[0] }, "x");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getCheckbox(record, fieldName) {
  const v = record.getCellValue(fieldName);
  if (v === true || v === 1 || v === "1") return true;
  if (Array.isArray(v) && v.length === 1) return getCheckbox({ getCellValue: () => v[0] }, "x");
  return false;
}

function fieldExists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch (e) {
    return false;
  }
}

async function updateRecordSafe(table, recordId, fields) {
  const keys = Object.keys(fields || {});
  if (!keys.length) return;
  await table.updateRecordAsync(recordId, fields);
}



async function main() {
  let debugStep = "1 - Validate input";
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("errorOut", "");
  const cfg = input.config();
  const recordId = requireRecId(cfg.recordId);
  const zaTable = base.getTable(CONFIG.tables.zoomAttendance);
  const zmTable = base.getTable(CONFIG.tables.zoomMeetings);
  const rec = await zaTable.selectRecordAsync(recordId, { fields: Object.values(CONFIG.fields) });
  if (!rec) throw new Error(`Zoom Attendance not found: ${recordId}`);

  if (getText(rec, CONFIG.fields.attendanceMethod) !== CONFIG.methods.recordingQuiz) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_recording_quiz");
    return;
  }
  if (getCheckbox(rec, CONFIG.fields.conflict) || getNumber(rec, CONFIG.fields.conflict) === 1) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_conflict");
    return;
  }
  const approved = getCheckbox(rec, CONFIG.fields.approved) || getNumber(rec, CONFIG.fields.approved) === 1;
  const pw = getCheckbox(rec, CONFIG.fields.pwFlag) || getNumber(rec, CONFIG.fields.pwFlag) === 1;
  if (!approved || !pw) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_flag_off");
    return;
  }
  if (fieldExists(zaTable, CONFIG.fields.pwApplied) && getCheckbox(rec, CONFIG.fields.pwApplied)) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_already_applied");
    return;
  }

  const enrollIds = getLinkedIds(rec, CONFIG.fields.enrollment);
  const meetingIds = getLinkedIds(rec, CONFIG.fields.zoomMeeting);
  if (!enrollIds.length || !meetingIds.length) throw new Error("Missing Enrollment or Zoom Meeting");
  const meetingId = meetingIds[0];
  const enrollId = enrollIds[0];
  const meeting = await zmTable.selectRecordAsync(meetingId, { fields: [CONFIG.fields.attendees] });
  const attendees = getLinkedIds(meeting, CONFIG.fields.attendees);
  const already = attendees.includes(enrollId);
  if (!already) {
    await updateRecordSafe(zmTable, meetingId, {
      [CONFIG.fields.attendees]: attendees.concat([enrollId]).map((id) => ({ id })),
    });
  }
  if (fieldExists(zaTable, CONFIG.fields.pwApplied)) {
    await updateRecordSafe(zaTable, recordId, { [CONFIG.fields.pwApplied]: true });
  }
  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", already ? "skipped_already_applied" : "linked_attendee_for_perfect_week");
  setOutputSafe("errorOut", "");
}


try {
  await main();
} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  setOutputSafe("statusOut", "error");
  setOutputSafe("errorOut", msg);
  setOutputSafe("actionOut", "error");
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "error", errorOut: msg }));
  throw err;
}

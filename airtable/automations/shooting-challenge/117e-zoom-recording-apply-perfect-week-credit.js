/*
GitHub Source of Truth — paste into Airtable starting AFTER this header block
(skip this GitHub header when pasting).
System: 127 SI Shooting Challenge
Backlog: C-025
Folder: 17 - Zoom Recording Credit
*/

/************************************************************
 * 117e - Zoom Recording Credit - Apply Perfect Week Credit
 *
 * Version: v1.1.0
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-18
 *
 * VERSION HISTORY
 * - v1.1.0 (2026-07-18): REMOVED Zoom Meetings.Attendees write (double-credit
 *   risk via Automation 101). Marks Perfect Week Credit Applied? only and
 *   documents downstream gap (057 counts live Attendees only).
 * - v1.0.0: Idempotent Attendees add (superseded — unsafe with 101).
 *
 * Architecture: Stage 17 Zoom Attendance path
 * Prefer single orchestrator: 117-zoom-recording-credit-orchestrator.js
 *
 * PURPOSE
 * - When Effective Recording Counts for Perfect Week? and approved, mark
 *   Perfect Week Credit Applied? on the ZA row.
 * - Do NOT add Enrollment to Zoom Meetings.Attendees.
 *
 * IMPORTANT DESIGN RULES
 * - Live Attendees roster is reserved for actual live attendance / Automation 101.
 * - Downstream gap: 057 Perfect Week Zoom Attendance Count iterates
 *   Zoom Meetings.Attendees only — recording flags are not consumed yet.
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
 * - Zoom Attendance (modular; DEV prefers 117 orchestrator)
 *
 * AUTOMATION NAME
 * - 117e - Zoom Recording Credit - Apply Perfect Week Credit
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "117e-zoom-recording-apply-perfect-week-credit",
  version: "v1.1.0",
  versionDate: "2026-07-18",
  originalWrittenDate: "2026-07-14",
  lastUpdated: "2026-07-18",
  folder: "17 - Zoom Recording Credit",
  automationName: "117e - Zoom Recording Credit - Apply Perfect Week Credit",
};

const CONFIG = {
  tables: { zoomAttendance: "Zoom Attendance" },
  fields: {
    attendanceMethod: "Attendance Method",
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    approved: "Zoom Credit Approved?",
    conflict: "Zoom Credit Conflict?",
    pwFlag: "Effective Recording Counts for Perfect Week?",
    pwApplied: "Perfect Week Credit Applied?",
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
  if (Object.prototype.hasOwnProperty.call(fields, "Attendees")) {
    throw new Error("Refuse write to Attendees — live roster reserved for Automation 101");
  }
  await table.updateRecordAsync(recordId, fields);
}

async function main() {
  let debugStep = "1 - Validate input";
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("errorOut", "");
  const cfg = input.config();
  const recordId = requireRecId(cfg.recordId);
  const zaTable = base.getTable(CONFIG.tables.zoomAttendance);
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
  const approved =
    getCheckbox(rec, CONFIG.fields.approved) || getNumber(rec, CONFIG.fields.approved) === 1;
  const pw =
    getCheckbox(rec, CONFIG.fields.pwFlag) || getNumber(rec, CONFIG.fields.pwFlag) === 1;
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

  // Flag only — never mutate Zoom Meetings.Attendees (Automation 101 risk).
  if (fieldExists(zaTable, CONFIG.fields.pwApplied)) {
    await updateRecordSafe(zaTable, recordId, { [CONFIG.fields.pwApplied]: true });
  }
  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", "marked_perfect_week_applied_flag_only");
  setOutputSafe("errorOut", "");
  setOutputSafe(
    "downstreamGapOut",
    "057 Perfect Week Zoom Attendance Count still iterates live Attendees only — recording PW not counted"
  );
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      actionOut: "marked_perfect_week_applied_flag_only",
      attendeesWriteAttempted: false,
    })
  );
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

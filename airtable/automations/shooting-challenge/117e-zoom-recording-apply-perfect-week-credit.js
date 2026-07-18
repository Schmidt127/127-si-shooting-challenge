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
 * Version: v1.2.0
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-18
 *
 * VERSION HISTORY
 * - v1.2.0 (2026-07-18): Observation-only. Perfect Week Credit Applied? is
 *   owned by Automation 057 after it counts the credit. Never writes Attendees.
 * - v1.1.0: Flag-only (no Attendees) — superseded semantics for Applied?.
 * - v1.0.0: Attendees add (unsafe with 101) — superseded.
 *
 * PURPOSE
 * - Report whether this recording row is eligible for Perfect Week Zoom credit.
 * - Do NOT set Perfect Week Credit Applied? (that means downstream consumption).
 * - Do NOT add Enrollment to Zoom Meetings.Attendees.
 *
 * Prefer Automation 057 v1.3 for actual Perfect Week Zoom counting + Applied?.
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "117e-zoom-recording-apply-perfect-week-credit",
  version: "v1.2.0",
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

async function main() {
  setOutputSafe("debugStep", "1 - Validate input");
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
  const pw = getCheckbox(rec, CONFIG.fields.pwFlag) || getNumber(rec, CONFIG.fields.pwFlag) === 1;
  if (!approved || !pw) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_flag_off");
    return;
  }
  if (!getLinkedIds(rec, CONFIG.fields.enrollment).length || !getLinkedIds(rec, CONFIG.fields.zoomMeeting).length) {
    throw new Error("Missing Enrollment or Zoom Meeting");
  }
  if (getCheckbox(rec, CONFIG.fields.pwApplied)) {
    setOutputSafe("statusOut", "success");
    setOutputSafe("actionOut", "already_applied_by_057");
    return;
  }
  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", "eligible_awaiting_057");
  setOutputSafe("errorOut", "");
  setOutputSafe(
    "downstreamOwnerOut",
    "Automation 057 v1.3 counts this credit and sets Perfect Week Credit Applied?"
  );
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, actionOut: "eligible_awaiting_057" }));
}

try {
  await main();
} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  setOutputSafe("statusOut", "error");
  setOutputSafe("errorOut", msg);
  setOutputSafe("actionOut", "error");
  throw err;
}

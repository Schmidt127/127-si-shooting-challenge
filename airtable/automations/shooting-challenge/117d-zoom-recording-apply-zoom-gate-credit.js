/*
GitHub Source of Truth — paste into Airtable starting AFTER this header block
(skip this GitHub header when pasting).
System: 127 SI Shooting Challenge
Backlog: C-025
Folder: 17 - Zoom Recording Credit
*/

/************************************************************
 * 117d - Zoom Recording Credit - Apply Zoom Gate Credit
 *
 * Version: v1.2.0
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-18
 *
 * VERSION HISTORY
 * - v1.2.0 (2026-07-18): Observation-only. Gate Credit Applied? is owned by
 *   Automation 042 after it counts the credit. Never writes Attendees.
 * - v1.1.0: Flag-only (no Attendees) — superseded semantics for Applied?.
 * - v1.0.0: Attendees add (unsafe with 101) — superseded.
 *
 * PURPOSE
 * - Report whether Zoom Gate Credit Earned? makes this row eligible for 042.
 * - Do NOT set Gate Credit Applied? (that means downstream consumption).
 * - Do NOT add Enrollment to Zoom Meetings.Attendees.
 *
 * Prefer Automation 042 v3.1 for actual gate counting + Applied? updates.
 * This modular script remains for diagnostics / optional DEV runs only.
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "117d-zoom-recording-apply-zoom-gate-credit",
  version: "v1.2.0",
  versionDate: "2026-07-18",
  originalWrittenDate: "2026-07-14",
  lastUpdated: "2026-07-18",
  folder: "17 - Zoom Recording Credit",
  automationName: "117d - Zoom Recording Credit - Apply Zoom Gate Credit",
};

const CONFIG = {
  tables: { zoomAttendance: "Zoom Attendance" },
  fields: {
    attendanceMethod: "Attendance Method",
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    gateEarned: "Zoom Gate Credit Earned?",
    conflict: "Zoom Credit Conflict?",
    gateApplied: "Gate Credit Applied?",
    approved: "Zoom Credit Approved?",
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
  const gate = getCheckbox(rec, CONFIG.fields.gateEarned) || getNumber(rec, CONFIG.fields.gateEarned) === 1;
  if (!gate) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_no_gate_credit");
    return;
  }
  if (!getLinkedIds(rec, CONFIG.fields.enrollment).length || !getLinkedIds(rec, CONFIG.fields.zoomMeeting).length) {
    throw new Error("Missing Enrollment or Zoom Meeting");
  }
  if (getCheckbox(rec, CONFIG.fields.gateApplied)) {
    setOutputSafe("statusOut", "success");
    setOutputSafe("actionOut", "already_applied_by_042");
    return;
  }
  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", "eligible_awaiting_042");
  setOutputSafe("errorOut", "");
  setOutputSafe(
    "downstreamOwnerOut",
    "Automation 042 v3.1 counts this credit and sets Gate Credit Applied?"
  );
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, actionOut: "eligible_awaiting_042" }));
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

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
 * 117c - Zoom Recording Credit - Create Zoom XP Event
 *
 * Version: v1.0.1
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-14
 *
 * LIBRARY/REFERENCE (S20)
 * - Logic lives in 117-zoom-recording-credit-orchestrator.js (step C).
 * - Keep this file for contracts/reference; do not paste as a separate DEV slot.
 *
 * PURPOSE
 * - Create/update/deactivate exactly one XP Event per Zoom Credit Key.
 *
 * IMPORTANT DESIGN RULES
 * - Recording Quiz rows only (skip Live — live XP remains automation 101).
 * - Source Key read from Zoom Credit Key (ZOOM_CREDIT|{Enrollment RID}|{Zoom Meeting RID}).
 * - Recheck-before-create; never steal another automation's XP Event.
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
 * - 117c - Zoom Recording Credit - Create Zoom XP Event
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: '117c-zoom-recording-create-zoom-xp-event',
  version: 'v1.0.1',
  versionDate: '2026-07-14',
  originalWrittenDate: '2026-07-14',
  lastUpdated: '2026-07-14',
  folder: "17 - Zoom Recording Credit",
  automationName: '117c - Zoom Recording Credit - Create Zoom XP Event',
};

const CONFIG = {
  tables: {
    zoomAttendance: "Zoom Attendance",
    xpEvents: "XP Events",
  },
  fields: {
    attendanceMethod: "Attendance Method",
    creditKey: "Zoom Credit Key",
    creditApproved: "Zoom Credit Approved?",
    creditConflict: "Zoom Credit Conflict?",
    xpAmount: "Zoom XP Amount",
    creditDebug: "Zoom Credit Debug",
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    xpSourceKey: "Source Key",
    xpPoints: "XP Points",
    xpActive: "Active?",
    xpReasonPublic: "XP Reason Public",
    xpReasonDebug: "XP Reason Debug",
    xpEnrollment: "Enrollment",
    xpSource: "XP Source",
  },
  methods: { recordingQuiz: "Recording Quiz" },
  xpSourceName: "Zoom Attendance",
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
  const xpTable = base.getTable(CONFIG.tables.xpEvents);

  debugStep = "2 - Load schema / row";
  setOutputSafe("debugStep", debugStep);
  const rec = await zaTable.selectRecordAsync(recordId, {
    fields: [
      CONFIG.fields.attendanceMethod,
      CONFIG.fields.creditKey,
      CONFIG.fields.creditApproved,
      CONFIG.fields.creditConflict,
      CONFIG.fields.xpAmount,
      CONFIG.fields.creditDebug,
      CONFIG.fields.enrollment,
      CONFIG.fields.zoomMeeting,
    ],
  });
  if (!rec) throw new Error(`Zoom Attendance not found: ${recordId}`);

  if (getText(rec, CONFIG.fields.attendanceMethod) !== CONFIG.methods.recordingQuiz) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_recording_quiz");
    setOutputSafe("xpEventId", "");
    setOutputSafe("xpPoints", 0);
    return;
  }

  debugStep = "3 - Load credit fields";
  setOutputSafe("debugStep", debugStep);
  const key = getText(rec, CONFIG.fields.creditKey);
  const approved = getCheckbox(rec, CONFIG.fields.creditApproved) || getNumber(rec, CONFIG.fields.creditApproved) === 1;
  const conflict = getCheckbox(rec, CONFIG.fields.creditConflict) || getNumber(rec, CONFIG.fields.creditConflict) === 1;
  const amount = getNumber(rec, CONFIG.fields.xpAmount) || 0;
  const enrollIds = getLinkedIds(rec, CONFIG.fields.enrollment);

  if (!key) {
    throw new Error("Blank Zoom Credit Key — refuse XP create");
  }

  debugStep = "4 - Query existing XP Events by Source Key";
  setOutputSafe("debugStep", debugStep);
  const xpQuery = await xpTable.selectRecordsAsync({
    fields: [CONFIG.fields.xpSourceKey, CONFIG.fields.xpPoints, CONFIG.fields.xpActive, CONFIG.fields.xpEnrollment].filter((n) => fieldExists(xpTable, n)),
  });
  const matches = xpQuery.records.filter((r) => getText(r, CONFIG.fields.xpSourceKey) === key);
  xpQuery.unloadData();
  const existing = matches[0] || null;

  debugStep = "5 - Branch approved/not-approved";
  setOutputSafe("debugStep", debugStep);
  if (!approved || conflict || amount <= 0) {
    if (existing && fieldExists(xpTable, CONFIG.fields.xpActive) && getCheckbox(existing, CONFIG.fields.xpActive)) {
      await updateRecordSafe(xpTable, existing.id, { [CONFIG.fields.xpActive]: false });
      setOutputSafe("statusOut", "success");
      setOutputSafe("actionOut", "deactivated_on_conflict");
      setOutputSafe("xpEventId", existing.id);
      setOutputSafe("xpPoints", 0);
      console.log(JSON.stringify({ automation: SCRIPT.scriptName, actionOut: "deactivated_on_conflict", key }));
      return;
    }
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", !approved || conflict ? "skipped_not_approved" : "skipped_zero_amount");
    setOutputSafe("xpEventId", existing ? existing.id : "");
    return;
  }

  debugStep = "6 - Recheck before create";
  setOutputSafe("debugStep", debugStep);
  if (existing) {
    const patch = {};
    if (fieldExists(xpTable, CONFIG.fields.xpPoints) && getNumber(existing, CONFIG.fields.xpPoints) !== amount) {
      patch[CONFIG.fields.xpPoints] = amount;
    }
    if (fieldExists(xpTable, CONFIG.fields.xpActive) && !getCheckbox(existing, CONFIG.fields.xpActive)) {
      patch[CONFIG.fields.xpActive] = true;
    }
    if (Object.keys(patch).length) {
      await updateRecordSafe(xpTable, existing.id, patch);
      setOutputSafe("actionOut", "updated");
    } else {
      setOutputSafe("actionOut", "skipped_exists");
    }
    setOutputSafe("statusOut", "success");
    setOutputSafe("xpEventId", existing.id);
    setOutputSafe("xpPoints", amount);
    setOutputSafe("errorOut", "");
    return;
  }

  debugStep = "7 - Create";
  setOutputSafe("debugStep", debugStep);
  const createFields = {
    [CONFIG.fields.xpSourceKey]: key,
  };
  if (fieldExists(xpTable, CONFIG.fields.xpPoints)) createFields[CONFIG.fields.xpPoints] = amount;
  if (fieldExists(xpTable, CONFIG.fields.xpActive)) createFields[CONFIG.fields.xpActive] = true;
  if (fieldExists(xpTable, CONFIG.fields.xpEnrollment) && enrollIds.length) {
    createFields[CONFIG.fields.xpEnrollment] = enrollIds.map((id) => ({ id }));
  }
  if (fieldExists(xpTable, CONFIG.fields.xpReasonPublic)) {
    createFields[CONFIG.fields.xpReasonPublic] = "Zoom recording quiz credit";
  }
  if (fieldExists(xpTable, CONFIG.fields.xpReasonDebug)) {
    createFields[CONFIG.fields.xpReasonDebug] = getText(rec, CONFIG.fields.creditDebug) || `117c|${recordId}|${key}`;
  }
  if (fieldExists(xpTable, CONFIG.fields.xpSource)) {
    try {
      createFields[CONFIG.fields.xpSource] = { name: CONFIG.xpSourceName };
    } catch (e) {
      /* optional */
    }
  }

  const created = await xpTable.createRecordAsync(createFields);
  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", "created");
  setOutputSafe("xpEventId", created);
  setOutputSafe("xpPoints", amount);
  setOutputSafe("errorOut", "");
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "success", actionOut: "created", key, xpEventId: created }));
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

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
 * 117f - Zoom Recording Credit - Send Approval Email
 *
 * Version: v1.0.1
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-14
 *
 * LIBRARY/REFERENCE (S20)
 * - Logic lives in 117-zoom-recording-credit-orchestrator.js (step F).
 * - Keep this file for contracts/reference; do not paste as a separate DEV slot.
 *
 * PURPOSE
 * - Parent notification once after Satisfactory when Config enables email.
 * - Requires Zoom Credit Approved? and not Zoom Credit Conflict?.
 *
 * IMPORTANT DESIGN RULES
 * - Safe default: missing/disabled config => no send. Missing webhook => skip (DEV-safe).
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
 * - 117f - Zoom Recording Credit - Send Approval Email
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: '117f-zoom-recording-send-approval-email',
  version: 'v1.0.1',
  versionDate: '2026-07-14',
  originalWrittenDate: '2026-07-14',
  lastUpdated: '2026-07-14',
  folder: "17 - Zoom Recording Credit",
  automationName: '117f - Zoom Recording Credit - Send Approval Email',
};

const CONFIG = {
  tables: { zoomAttendance: "Zoom Attendance" },
  fields: {
    attendanceMethod: "Attendance Method",
    satisfactory: "Recording Quiz Satisfactory?",
    approved: "Zoom Credit Approved?",
    conflict: "Zoom Credit Conflict?",
    emailEnabled: "Effective Recording Approval Email Enabled?",
    emailTiming: "Effective Recording Approval Email Timing",
    emailTemplate: "Effective Recording Approval Email Template Key",
    enrollmentRid: "Enrollment RID",
    zoomMeetingRid: "Zoom Meeting RID",
    sendKey: "Recording Approval Email Send Key",
    sentAt: "Recording Approval Email Sent At",
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
  const webhookUrl = (cfg.webhookUrl || "").trim();
  const zaTable = base.getTable(CONFIG.tables.zoomAttendance);
  const rec = await zaTable.selectRecordAsync(recordId, { fields: Object.values(CONFIG.fields) });
  if (!rec) throw new Error(`Zoom Attendance not found: ${recordId}`);

  if (getText(rec, CONFIG.fields.attendanceMethod) !== CONFIG.methods.recordingQuiz) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_recording_quiz");
    return;
  }
  if (!getCheckbox(rec, CONFIG.fields.satisfactory)) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_satisfactory");
    return;
  }
  const approved = getCheckbox(rec, CONFIG.fields.approved) || getNumber(rec, CONFIG.fields.approved) === 1;
  const conflict = getCheckbox(rec, CONFIG.fields.conflict) || getNumber(rec, CONFIG.fields.conflict) === 1;
  if (!approved || conflict) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_approved");
    return;
  }

  debugStep = "4 - Evaluate send decision";
  setOutputSafe("debugStep", debugStep);
  // Effective email enabled is number 1/0 or checkbox after conversion
  const enabledRaw = rec.getCellValue(CONFIG.fields.emailEnabled);
  let enabled = null;
  if (enabledRaw === true || enabledRaw === 1 || enabledRaw === "1" || enabledRaw === "Yes") enabled = true;
  else if (enabledRaw === false || enabledRaw === 0 || enabledRaw === "0" || enabledRaw === "No") enabled = false;

  if (enabled === null) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_config_missing");
    return;
  }
  if (!enabled) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_disabled");
    return;
  }

  const template = getText(rec, CONFIG.fields.emailTemplate);
  if (!template) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_missing_template_key");
    return;
  }

  const enrollRid = getText(rec, CONFIG.fields.enrollmentRid);
  const meetingRid = getText(rec, CONFIG.fields.zoomMeetingRid);
  const sendKey = `ZOOM_REC_EMAIL|${enrollRid}|${meetingRid}`;
  if (fieldExists(zaTable, CONFIG.fields.sendKey) && getText(rec, CONFIG.fields.sendKey) === sendKey) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_already_sent");
    setOutputSafe("sendKey", sendKey);
    return;
  }

  if (!webhookUrl) {
    // DEV-safe: never invent a webhook; leave retryable
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_no_webhook");
    setOutputSafe("sendKey", sendKey);
    return;
  }

  debugStep = "5 - Build email package";
  setOutputSafe("debugStep", debugStep);
  const payload = {
    templateKey: template,
    sendKey,
    enrollmentRid: enrollRid,
    zoomMeetingRid: meetingRid,
    zoomAttendanceId: recordId,
    timing: getText(rec, CONFIG.fields.emailTiming) || "On Satisfactory",
  };

  debugStep = "7 - POST to Make webhook";
  setOutputSafe("debugStep", debugStep);
  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const bodyText = await resp.text();
  if (!resp.ok) {
    throw new Error(`Webhook failed ${resp.status}: ${bodyText.slice(0, 500)}`);
  }

  const stamp = {};
  if (fieldExists(zaTable, CONFIG.fields.sendKey)) stamp[CONFIG.fields.sendKey] = sendKey;
  if (fieldExists(zaTable, CONFIG.fields.sentAt)) stamp[CONFIG.fields.sentAt] = new Date();
  if (Object.keys(stamp).length) await updateRecordSafe(zaTable, recordId, stamp);

  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", "sent");
  setOutputSafe("sendKey", sendKey);
  setOutputSafe("errorOut", "");
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, actionOut: "sent", sendKey }));
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

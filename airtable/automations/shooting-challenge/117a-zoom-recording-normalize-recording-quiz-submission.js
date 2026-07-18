/*
GitHub Source of Truth — paste into Airtable starting AFTER this header block
(skip this GitHub header when pasting).
System: 127 SI Shooting Challenge
Backlog: C-025
Folder: 17 - Zoom Recording Credit
*/

/************************************************************
 * 117a - Zoom Recording Credit - Normalize Recording Quiz Submission
 *
 * Version: v1.1.0
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-18
 *
 * Architecture: Stage 17 Zoom Attendance path (S16 HC path superseded)
 *
 * PURPOSE
 * - Find-or-normalize one Zoom Attendance Recording Quiz row per Enrollment+Meeting.
 *
 * IMPORTANT DESIGN RULES
 * - Never creates a second credit identity for the same Enrollment+Meeting pair.
 * - Sets Review Status to Needs Review when blank.
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
 * - 117a - Zoom Recording Credit - Normalize Recording Quiz Submission
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: '117a-zoom-recording-normalize-recording-quiz-submission',
  version: 'v1.1.0',
  versionDate: '2026-07-18',
  originalWrittenDate: '2026-07-14',
  lastUpdated: '2026-07-18',
  folder: "17 - Zoom Recording Credit",
  automationName: '117a - Zoom Recording Credit - Normalize Recording Quiz Submission',
};

const CONFIG = {
  tables: { zoomAttendance: "Zoom Attendance" },
  fields: {
    attendanceMethod: "Attendance Method",
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    enrollmentRid: "Enrollment RID",
    zoomMeetingRid: "Zoom Meeting RID",
    reviewStatus: "Recording Quiz Review Status",
    submittedAt: "Recording Quiz Submitted At",
  },
  methods: { recordingQuiz: "Recording Quiz" },
  review: { needsReview: "Needs Review" },
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
  let debugStep = "1 - Validate recordId";
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("errorOut", "");
  const cfg = input.config();
  const recordId = requireRecId(cfg.recordId);

  debugStep = "2 - Load schema";
  setOutputSafe("debugStep", debugStep);
  const zaTable = base.getTable(CONFIG.tables.zoomAttendance);
  const rec = await zaTable.selectRecordAsync(recordId, {
    fields: Object.values(CONFIG.fields),
  });
  if (!rec) throw new Error(`Zoom Attendance not found: ${recordId}`);

  debugStep = "3 - Load Zoom Attendance row";
  setOutputSafe("debugStep", debugStep);
  const method = getText(rec, CONFIG.fields.attendanceMethod);
  if (method !== CONFIG.methods.recordingQuiz) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_recording_quiz");
    setOutputSafe("debugStep", debugStep);
    console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "skipped", actionOut: "skipped_not_recording_quiz" }));
    return;
  }

  debugStep = "4 - Resolve Enrollment + Zoom Meeting RID";
  setOutputSafe("debugStep", debugStep);
  const enrollRid = getText(rec, CONFIG.fields.enrollmentRid);
  const meetingRid = getText(rec, CONFIG.fields.zoomMeetingRid);
  const enrollIds = getLinkedIds(rec, CONFIG.fields.enrollment);
  const meetingIds = getLinkedIds(rec, CONFIG.fields.zoomMeeting);
  if (!enrollRid || !meetingRid || !enrollIds.length || !meetingIds.length) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_missing_links");
    setOutputSafe("errorOut", "Missing Enrollment or Zoom Meeting link/RID");
    console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "skipped", actionOut: "skipped_missing_links" }));
    return;
  }

  debugStep = "5 - Query sibling rows for pair";
  setOutputSafe("debugStep", debugStep);
  const query = await zaTable.selectRecordsAsync({ fields: [CONFIG.fields.enrollmentRid, CONFIG.fields.zoomMeetingRid, CONFIG.fields.reviewStatus, CONFIG.fields.attendanceMethod] });
  const siblings = query.records.filter((r) => {
    return (
      getText(r, CONFIG.fields.attendanceMethod) === CONFIG.methods.recordingQuiz &&
      getText(r, CONFIG.fields.enrollmentRid) === enrollRid &&
      getText(r, CONFIG.fields.zoomMeetingRid) === meetingRid
    );
  });
  query.unloadData();

  const older = siblings
    .filter((r) => r.id !== recordId)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (older.length) {
    const olderHasReview = older.some((r) => getText(r, CONFIG.fields.reviewStatus));
    if (olderHasReview) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_duplicate_pair");
      setOutputSafe("zoomAttendanceId", older[0].id);
      setOutputSafe("enrollmentRid", enrollRid);
      setOutputSafe("zoomMeetingRid", meetingRid);
      console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "skipped", actionOut: "skipped_duplicate_pair", keep: older[0].id }));
      return;
    }
  }

  debugStep = "6 - Normalize review state";
  setOutputSafe("debugStep", debugStep);
  const currentStatus = getText(rec, CONFIG.fields.reviewStatus);
  const patch = {};
  if (!currentStatus) {
    if (fieldExists(zaTable, CONFIG.fields.reviewStatus)) {
      patch[CONFIG.fields.reviewStatus] = { name: CONFIG.review.needsReview };
    }
  }
  if (fieldExists(zaTable, CONFIG.fields.submittedAt) && !rec.getCellValue(CONFIG.fields.submittedAt)) {
    patch[CONFIG.fields.submittedAt] = new Date();
  }

  debugStep = "7 - Write + outputs";
  setOutputSafe("debugStep", debugStep);
  if (Object.keys(patch).length) {
    await updateRecordSafe(zaTable, recordId, patch);
    setOutputSafe("statusOut", "success");
    setOutputSafe("actionOut", "normalized");
  } else {
    setOutputSafe("statusOut", "success");
    setOutputSafe("actionOut", "skipped_already_normalized");
  }
  setOutputSafe("zoomAttendanceId", recordId);
  setOutputSafe("enrollmentRid", enrollRid);
  setOutputSafe("zoomMeetingRid", meetingRid);
  setOutputSafe("errorOut", "");
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "success", actionOut: "normalized_or_noop", recordId }));
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

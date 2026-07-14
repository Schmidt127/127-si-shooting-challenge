#!/usr/bin/env python3
"""Generate lean C-025 117a-f Airtable automation scripts from shared template."""

from __future__ import annotations

from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "airtable" / "automations" / "shooting-challenge"

HEADER = """/*
GitHub Source of Truth — paste into Airtable starting AFTER this header block
(skip this GitHub header when pasting).
System: 127 SI Shooting Challenge
Backlog: C-025
Folder: 17 - Zoom Recording Credit
*/

"""

COMMON_HELPERS = r'''
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
'''


def wrap(script_name, version, automation_name, purpose, design_rules, config_js, main_js, version_date="2026-07-14"):
    return (
        HEADER
        + f"""/************************************************************
 * {automation_name}
 *
 * Version: {version}
 * Date Written: {version_date}
 * Last Updated: {version_date}
 *
 * PURPOSE
{purpose}
 *
 * IMPORTANT DESIGN RULES
{design_rules}
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
 * - {automation_name}
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 ************************************************************/

// @ts-nocheck

const SCRIPT = {{
  scriptName: {script_name!r},
  version: {version!r},
  versionDate: {version_date!r},
  originalWrittenDate: {version_date!r},
  lastUpdated: {version_date!r},
  folder: "17 - Zoom Recording Credit",
  automationName: {automation_name!r},
}};

const CONFIG = {config_js};

{COMMON_HELPERS}

{main_js}

try {{
  await main();
}} catch (err) {{
  const msg = err && err.message ? err.message : String(err);
  setOutputSafe("statusOut", "error");
  setOutputSafe("errorOut", msg);
  setOutputSafe("actionOut", "error");
  console.log(JSON.stringify({{ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "error", errorOut: msg }}));
  throw err;
}}
"""
    )


def write(name: str, body: str):
    path = OUT / name
    path.write_text(body, encoding="utf-8")
    print("wrote", path.name, "bytes", path.stat().st_size)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    # --- 117a ---
    write(
        "117a-zoom-recording-normalize-recording-quiz-submission.js",
        wrap(
            "117a-zoom-recording-normalize-recording-quiz-submission",
            "v1.0.0",
            "117a - Zoom Recording Credit - Normalize Recording Quiz Submission",
            " * - Find-or-normalize one Zoom Attendance Recording Quiz row per Enrollment+Meeting.",
            " * - Never creates a second credit identity for the same Enrollment+Meeting pair.\n * - Sets Review Status to Needs Review when blank.",
            """{
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
}""",
            r'''
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
''',
        )
    )

    # --- 117b ---
    write(
        "117b-zoom-recording-coach-review-and-needs-correction-handling.js",
        wrap(
            "117b-zoom-recording-coach-review-and-needs-correction-handling",
            "v1.0.0",
            "117b - Zoom Recording Credit - Coach Review and Needs Correction Handling",
            " * - Sync Recording Quiz Satisfactory? from Review Status.",
            " * - Skip if already matches. Needs Correction clears Satisfactory without changing Zoom Credit Key.",
            """{
  tables: { zoomAttendance: "Zoom Attendance" },
  fields: {
    attendanceMethod: "Attendance Method",
    reviewStatus: "Recording Quiz Review Status",
    satisfactory: "Recording Quiz Satisfactory?",
    correctionCount: "Recording Quiz Correction Count",
    reviewedAt: "Recording Quiz Reviewed At",
    needsCorrectionAt: "Recording Quiz Needs Correction At",
  },
  methods: { recordingQuiz: "Recording Quiz" },
  review: {
    satisfactory: "Satisfactory",
    needsCorrection: "Needs Correction",
    needsReview: "Needs Review",
  },
}""",
            r'''
async function main() {
  let debugStep = "1 - Validate input";
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("errorOut", "");
  const cfg = input.config();
  const recordId = requireRecId(cfg.recordId);
  const zaTable = base.getTable(CONFIG.tables.zoomAttendance);
  const rec = await zaTable.selectRecordAsync(recordId, { fields: Object.values(CONFIG.fields) });
  if (!rec) throw new Error(`Zoom Attendance not found: ${recordId}`);

  debugStep = "2 - Load row";
  setOutputSafe("debugStep", debugStep);
  if (getText(rec, CONFIG.fields.attendanceMethod) !== CONFIG.methods.recordingQuiz) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_recording_quiz");
    return;
  }

  debugStep = "3 - Read Review Status";
  setOutputSafe("debugStep", debugStep);
  const status = getText(rec, CONFIG.fields.reviewStatus);
  const sat = getCheckbox(rec, CONFIG.fields.satisfactory);

  debugStep = "4 - Compare to current Satisfactory?";
  setOutputSafe("debugStep", debugStep);
  const patch = {};
  let actionOut = "skipped_unchanged";

  if (status === CONFIG.review.satisfactory) {
    if (!sat) {
      patch[CONFIG.fields.satisfactory] = true;
      if (fieldExists(zaTable, CONFIG.fields.reviewedAt)) patch[CONFIG.fields.reviewedAt] = new Date();
      actionOut = "marked_satisfactory";
    }
  } else if (status === CONFIG.review.needsCorrection) {
    if (sat) {
      patch[CONFIG.fields.satisfactory] = false;
      if (fieldExists(zaTable, CONFIG.fields.needsCorrectionAt)) patch[CONFIG.fields.needsCorrectionAt] = new Date();
      if (fieldExists(zaTable, CONFIG.fields.correctionCount)) {
        const cur = getNumber(rec, CONFIG.fields.correctionCount) || 0;
        patch[CONFIG.fields.correctionCount] = cur + 1;
      }
      actionOut = "marked_needs_correction";
    }
  }

  debugStep = "5 - Branch / write";
  setOutputSafe("debugStep", debugStep);
  if (Object.keys(patch).length) await updateRecordSafe(zaTable, recordId, patch);

  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("correctionCount", fieldExists(zaTable, CONFIG.fields.correctionCount) ? (getNumber(rec, CONFIG.fields.correctionCount) || 0) : 0);
  setOutputSafe("errorOut", "");
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "success", actionOut }));
}
''',
        )
    )

    # --- 117c ---
    write(
        "117c-zoom-recording-create-zoom-xp-event.js",
        wrap(
            "117c-zoom-recording-create-zoom-xp-event",
            "v1.0.0",
            "117c - Zoom Recording Credit - Create Zoom XP Event",
            " * - Create/update/deactivate exactly one XP Event per Zoom Credit Key.",
            " * - Source Key read from Zoom Credit Key (ZOOM_CREDIT|{Enrollment RID}|{Zoom Meeting RID}).\n * - Recheck-before-create; never steal another automation's XP Event.",
            """{
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
  xpSourceName: "Zoom Attendance",
}""",
            r'''
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
''',
        )
    )

    # --- 117d ---
    write(
        "117d-zoom-recording-apply-zoom-gate-credit.js",
        wrap(
            "117d-zoom-recording-apply-zoom-gate-credit",
            "v1.0.0",
            "117d - Zoom Recording Credit - Apply Zoom Gate Credit",
            " * - Idempotently add Enrollment to Zoom Meeting Attendees when gate credit earned.",
            " * - Live rows are out of scope. Uses Gate Credit Applied? when present.",
            """{
  tables: { zoomAttendance: "Zoom Attendance", zoomMeetings: "Zoom Meetings" },
  fields: {
    attendanceMethod: "Attendance Method",
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    gateEarned: "Zoom Gate Credit Earned?",
    conflict: "Zoom Credit Conflict?",
    gateApplied: "Gate Credit Applied?",
    attendees: "Attendees",
  },
  methods: { recordingQuiz: "Recording Quiz" },
}""",
            r'''
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
  const gate = getCheckbox(rec, CONFIG.fields.gateEarned) || getNumber(rec, CONFIG.fields.gateEarned) === 1;
  if (!gate) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_no_gate_credit");
    return;
  }
  if (fieldExists(zaTable, CONFIG.fields.gateApplied) && getCheckbox(rec, CONFIG.fields.gateApplied)) {
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
  if (!meeting) throw new Error(`Zoom Meeting not found: ${meetingId}`);
  const attendees = getLinkedIds(meeting, CONFIG.fields.attendees);
  const already = attendees.includes(enrollId);
  if (!already) {
    await updateRecordSafe(zmTable, meetingId, {
      [CONFIG.fields.attendees]: attendees.concat([enrollId]).map((id) => ({ id })),
    });
  }
  if (fieldExists(zaTable, CONFIG.fields.gateApplied)) {
    await updateRecordSafe(zaTable, recordId, { [CONFIG.fields.gateApplied]: true });
  }
  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", already ? "skipped_already_applied" : "linked_attendee_for_gate");
  setOutputSafe("errorOut", "");
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, actionOut: already ? "skipped_already_applied" : "linked_attendee_for_gate" }));
}
''',
        )
    )

    # --- 117e ---
    write(
        "117e-zoom-recording-apply-perfect-week-credit.js",
        wrap(
            "117e-zoom-recording-apply-perfect-week-credit",
            "v1.0.0",
            "117e - Zoom Recording Credit - Apply Perfect Week Credit",
            " * - Idempotently ensure Enrollment is on Zoom Meeting Attendees for Perfect Week counting.",
            " * - Independent Perfect Week Credit Applied? flag from 117d.",
            """{
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
}""",
            r'''
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
''',
        )
    )

    # --- 117f ---
    write(
        "117f-zoom-recording-send-approval-email.js",
        wrap(
            "117f-zoom-recording-send-approval-email",
            "v1.0.0",
            "117f - Zoom Recording Credit - Send Approval Email",
            " * - Parent notification once after Satisfactory when Config enables email.",
            " * - Safe default: missing/disabled config => no send. Missing webhook => skip (DEV-safe).",
            """{
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
}""",
            r'''
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
''',
        )
    )


if __name__ == "__main__":
    main()

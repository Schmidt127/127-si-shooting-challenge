/*
GitHub Source of Truth — paste into Airtable starting AFTER this header block
(skip this GitHub header when pasting).
System: 127 SI Shooting Challenge
Backlog: C-025 / S20
Folder: 17 - Zoom Recording Credit
*/

/************************************************************
 * 117 - Zoom Recording Credit - Orchestrator (A→F)
 *
 * Version: v1.0.1
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-14
 *
 * PURPOSE
 * - Single automation slot for C-025 recording-credit pipeline.
 * - Runs former 117a–f stages as internal steps in order on one
 *   Zoom Attendance Recording Quiz update:
 *   A normalize → B coach review → C XP → D gate → E Perfect Week → F email.
 *
 * IMPORTANT DESIGN RULES
 * - Prefer this file over pasting 117a–f as six separate automations
 *   (DEV hit Airtable automation slot limit).
 * - 117a–f remain library/reference in GitHub; do not paste as six slots.
 * - Idempotent per step (skip if already matches / already applied).
 * - One Zoom Credit Key → at most one active XP Event (recheck-before-create).
 * - Conflict / not approved → deactivate XP if active; never award on conflict.
 * - Gate + Perfect Week use independent applied flags; Live rows skipped.
 * - 117f safe defaults: blank webhook → skip; missing/disabled email config → no send;
 *   only after Satisfactory + Approved + not conflict; stamp send key only after
 *   successful webhook.
 * - After step B writes Satisfactory?, reload the row so formula credit fields
 *   (Approved / XP Amount / Gate / PW) are fresh before C–F.
 * - This is not live Zoom XP (101) and not video feedback (013/114).
 *
 * INPUT
 * - recordId (Zoom Attendance record id) — required, must start with "rec"
 * - webhookUrl (Make webhook for approval email) — optional; blank = no send
 *
 * OUTPUTS
 * - statusOut: success | skipped | error
 * - errorOut
 * - debugStep
 * - actionOut: composite pipe of step actions (e.g. normalized|marked_satisfactory|created|…)
 * - actionAOut … actionFOut
 * - zoomAttendanceId, enrollmentRid, zoomMeetingRid
 * - xpEventId, xpPoints, correctionCount, sendKey
 *
 * TRIGGER
 * - Zoom Attendance · When record matches conditions:
 *   Attendance Method = Recording Quiz
 * - Broad match covers review edits AND credit formula recalcs (Approved, Gate,
 *   Conflict, Satisfactory, Review Status). Narrow field-equality triggers are
 *   not required; each step self-gates. See C-025-s20-orchestrator-slot-plan.md.
 *
 * RECOMMENDED CONDITIONS
 * - Attendance Method is Recording Quiz
 * - Enrollment is not empty
 * - Zoom Meeting is not empty
 *
 * OPTIONAL (tighten if noise)
 * - OR of: Review Status / Satisfactory? / Zoom Credit Approved? / Gate Credit
 *   Earned? / Conflict? / Correction Count changed — only if Mike confirms Airtable
 *   still re-fires when formula values change under the preferred broad condition.
 *
 * DO NOT USE
 * - Live attendance rows (101 owns live XP)
 * - Zoom Meetings table trigger
 *
 * AUTOMATION NAME
 * - 117 - Zoom Recording Credit - Orchestrator
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 *
 * FIELD RENAME FIX
 * - If DEV field labels drift, fix CONFIG.fields names only (not logic).
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "117-zoom-recording-credit-orchestrator",
  version: "v1.0.1",
  versionDate: "2026-07-14",
  originalWrittenDate: "2026-07-14",
  lastUpdated: "2026-07-14",
  folder: "17 - Zoom Recording Credit",
  automationName: "117 - Zoom Recording Credit - Orchestrator",
};

const CONFIG = {
  tables: {
    zoomAttendance: "Zoom Attendance",
    zoomMeetings: "Zoom Meetings",
    xpEvents: "XP Events",
  },
  fields: {
    attendanceMethod: "Attendance Method",
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    enrollmentRid: "Enrollment RID",
    zoomMeetingRid: "Zoom Meeting RID",
    reviewStatus: "Recording Quiz Review Status",
    submittedAt: "Recording Quiz Submitted At",
    satisfactory: "Recording Quiz Satisfactory?",
    correctionCount: "Recording Quiz Correction Count",
    reviewedAt: "Recording Quiz Reviewed At",
    needsCorrectionAt: "Recording Quiz Needs Correction At",
    creditKey: "Zoom Credit Key",
    creditApproved: "Zoom Credit Approved?",
    creditConflict: "Zoom Credit Conflict?",
    xpAmount: "Zoom XP Amount",
    creditDebug: "Zoom Credit Debug",
    gateEarned: "Zoom Gate Credit Earned?",
    gateApplied: "Gate Credit Applied?",
    pwFlag: "Effective Recording Counts for Perfect Week?",
    pwApplied: "Perfect Week Credit Applied?",
    attendees: "Attendees",
    emailEnabled: "Effective Recording Approval Email Enabled?",
    emailTiming: "Effective Recording Approval Email Timing",
    emailTemplate: "Effective Recording Approval Email Template Key",
    sendKey: "Recording Approval Email Send Key",
    sentAt: "Recording Approval Email Sent At",
    xpSourceKey: "Source Key",
    xpPoints: "XP Points",
    xpActive: "Active?",
    xpReasonPublic: "XP Reason Public",
    xpReasonDebug: "XP Reason Debug",
    xpEnrollment: "Enrollment",
    xpSource: "XP Source",
  },
  methods: { recordingQuiz: "Recording Quiz" },
  review: {
    needsReview: "Needs Review",
    satisfactory: "Satisfactory",
    needsCorrection: "Needs Correction",
  },
  xpSourceName: "Zoom Attendance",
};

// SECTION 1: Shared helpers

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

function isTruthyFlag(record, fieldName) {
  return getCheckbox(record, fieldName) || getNumber(record, fieldName) === 1;
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

function zaFieldList() {
  return [
    CONFIG.fields.attendanceMethod,
    CONFIG.fields.enrollment,
    CONFIG.fields.zoomMeeting,
    CONFIG.fields.enrollmentRid,
    CONFIG.fields.zoomMeetingRid,
    CONFIG.fields.reviewStatus,
    CONFIG.fields.submittedAt,
    CONFIG.fields.satisfactory,
    CONFIG.fields.correctionCount,
    CONFIG.fields.reviewedAt,
    CONFIG.fields.needsCorrectionAt,
    CONFIG.fields.creditKey,
    CONFIG.fields.creditApproved,
    CONFIG.fields.creditConflict,
    CONFIG.fields.xpAmount,
    CONFIG.fields.creditDebug,
    CONFIG.fields.gateEarned,
    CONFIG.fields.gateApplied,
    CONFIG.fields.pwFlag,
    CONFIG.fields.pwApplied,
    CONFIG.fields.emailEnabled,
    CONFIG.fields.emailTiming,
    CONFIG.fields.emailTemplate,
    CONFIG.fields.sendKey,
    CONFIG.fields.sentAt,
  ];
}

async function loadZa(zaTable, recordId) {
  const existingNames = zaFieldList().filter((n) => fieldExists(zaTable, n));
  const rec = await zaTable.selectRecordAsync(recordId, { fields: existingNames });
  if (!rec) throw new Error(`Zoom Attendance not found: ${recordId}`);
  return rec;
}

// SECTION 2: Step A — Normalize

async function stepA(ctx) {
  const { zaTable, recordId, rec } = ctx;
  const method = getText(rec, CONFIG.fields.attendanceMethod);
  if (method !== CONFIG.methods.recordingQuiz) {
    return { actionOut: "skipped_not_recording_quiz", abort: true, enrollRid: "", meetingRid: "" };
  }

  const enrollRid = getText(rec, CONFIG.fields.enrollmentRid);
  const meetingRid = getText(rec, CONFIG.fields.zoomMeetingRid);
  const enrollIds = getLinkedIds(rec, CONFIG.fields.enrollment);
  const meetingIds = getLinkedIds(rec, CONFIG.fields.zoomMeeting);
  if (!enrollRid || !meetingRid || !enrollIds.length || !meetingIds.length) {
    return {
      actionOut: "skipped_missing_links",
      abort: true,
      enrollRid,
      meetingRid,
      errorOut: "Missing Enrollment or Zoom Meeting link/RID",
    };
  }

  const query = await zaTable.selectRecordsAsync({
    fields: [
      CONFIG.fields.enrollmentRid,
      CONFIG.fields.zoomMeetingRid,
      CONFIG.fields.reviewStatus,
      CONFIG.fields.attendanceMethod,
    ],
  });
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
      return {
        actionOut: "skipped_duplicate_pair",
        abort: true,
        enrollRid,
        meetingRid,
        keepId: older[0].id,
      };
    }
  }

  const currentStatus = getText(rec, CONFIG.fields.reviewStatus);
  const patch = {};
  if (!currentStatus && fieldExists(zaTable, CONFIG.fields.reviewStatus)) {
    patch[CONFIG.fields.reviewStatus] = { name: CONFIG.review.needsReview };
  }
  if (fieldExists(zaTable, CONFIG.fields.submittedAt) && !rec.getCellValue(CONFIG.fields.submittedAt)) {
    patch[CONFIG.fields.submittedAt] = new Date();
  }

  if (Object.keys(patch).length) {
    await updateRecordSafe(zaTable, recordId, patch);
    return { actionOut: "normalized", abort: false, enrollRid, meetingRid, wrote: true };
  }
  return { actionOut: "skipped_already_normalized", abort: false, enrollRid, meetingRid, wrote: false };
}

// SECTION 3: Step B — Coach review / Needs Correction

async function stepB(ctx) {
  const { zaTable, recordId, rec } = ctx;
  if (getText(rec, CONFIG.fields.attendanceMethod) !== CONFIG.methods.recordingQuiz) {
    return { actionOut: "skipped_not_recording_quiz", wrote: false, correctionCount: 0 };
  }

  const status = getText(rec, CONFIG.fields.reviewStatus);
  const sat = getCheckbox(rec, CONFIG.fields.satisfactory);
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
      if (fieldExists(zaTable, CONFIG.fields.needsCorrectionAt)) {
        patch[CONFIG.fields.needsCorrectionAt] = new Date();
      }
      if (fieldExists(zaTable, CONFIG.fields.correctionCount)) {
        const cur = getNumber(rec, CONFIG.fields.correctionCount) || 0;
        patch[CONFIG.fields.correctionCount] = cur + 1;
      }
      actionOut = "marked_needs_correction";
    }
  }

  if (Object.keys(patch).length) await updateRecordSafe(zaTable, recordId, patch);

  const correctionOut = Object.prototype.hasOwnProperty.call(patch, CONFIG.fields.correctionCount)
    ? patch[CONFIG.fields.correctionCount]
    : fieldExists(zaTable, CONFIG.fields.correctionCount)
      ? getNumber(rec, CONFIG.fields.correctionCount) || 0
      : 0;

  return {
    actionOut,
    wrote: Object.keys(patch).length > 0,
    correctionCount: correctionOut,
  };
}

// SECTION 4: Step C — XP Event create / update / deactivate

async function stepC(ctx) {
  const { zaTable, xpTable, recordId, rec } = ctx;
  if (getText(rec, CONFIG.fields.attendanceMethod) !== CONFIG.methods.recordingQuiz) {
    return { actionOut: "skipped_not_recording_quiz", xpEventId: "", xpPoints: 0 };
  }

  const key = getText(rec, CONFIG.fields.creditKey);
  const approved = isTruthyFlag(rec, CONFIG.fields.creditApproved);
  const conflict = isTruthyFlag(rec, CONFIG.fields.creditConflict);
  const amount = getNumber(rec, CONFIG.fields.xpAmount) || 0;
  const enrollIds = getLinkedIds(rec, CONFIG.fields.enrollment);

  if (!key) {
    throw new Error("Blank Zoom Credit Key — refuse XP create");
  }

  const xpFields = [CONFIG.fields.xpSourceKey, CONFIG.fields.xpPoints, CONFIG.fields.xpActive, CONFIG.fields.xpEnrollment].filter(
    (n) => fieldExists(xpTable, n)
  );
  const xpQuery = await xpTable.selectRecordsAsync({ fields: xpFields });
  const matches = xpQuery.records.filter((r) => getText(r, CONFIG.fields.xpSourceKey) === key);
  xpQuery.unloadData();
  const existing = matches[0] || null;

  if (!approved || conflict || amount <= 0) {
    if (existing && fieldExists(xpTable, CONFIG.fields.xpActive) && getCheckbox(existing, CONFIG.fields.xpActive)) {
      await updateRecordSafe(xpTable, existing.id, { [CONFIG.fields.xpActive]: false });
      return { actionOut: "deactivated_on_conflict", xpEventId: existing.id, xpPoints: 0 };
    }
    return {
      actionOut: !approved || conflict ? "skipped_not_approved" : "skipped_zero_amount",
      xpEventId: existing ? existing.id : "",
      xpPoints: 0,
    };
  }

  async function applyExistingXp(xpRec) {
    const patch = {};
    if (fieldExists(xpTable, CONFIG.fields.xpPoints) && getNumber(xpRec, CONFIG.fields.xpPoints) !== amount) {
      patch[CONFIG.fields.xpPoints] = amount;
    }
    if (fieldExists(xpTable, CONFIG.fields.xpActive) && !getCheckbox(xpRec, CONFIG.fields.xpActive)) {
      patch[CONFIG.fields.xpActive] = true;
    }
    if (Object.keys(patch).length) {
      await updateRecordSafe(xpTable, xpRec.id, patch);
      return { actionOut: "updated", xpEventId: xpRec.id, xpPoints: amount };
    }
    return { actionOut: "skipped_exists", xpEventId: xpRec.id, xpPoints: amount };
  }

  if (existing) {
    return await applyExistingXp(existing);
  }

  // Recheck immediately before create (automation standard — guards race / retrigger)
  const recheckFields = [CONFIG.fields.xpSourceKey, CONFIG.fields.xpPoints, CONFIG.fields.xpActive].filter((n) =>
    fieldExists(xpTable, n)
  );
  const recheckQuery = await xpTable.selectRecordsAsync({ fields: recheckFields });
  const recheckMatch = recheckQuery.records.find((r) => getText(r, CONFIG.fields.xpSourceKey) === key) || null;
  recheckQuery.unloadData();
  if (recheckMatch) {
    return await applyExistingXp(recheckMatch);
  }

  const createFields = { [CONFIG.fields.xpSourceKey]: key };
  if (fieldExists(xpTable, CONFIG.fields.xpPoints)) createFields[CONFIG.fields.xpPoints] = amount;
  if (fieldExists(xpTable, CONFIG.fields.xpActive)) createFields[CONFIG.fields.xpActive] = true;
  if (fieldExists(xpTable, CONFIG.fields.xpEnrollment) && enrollIds.length) {
    createFields[CONFIG.fields.xpEnrollment] = enrollIds.map((id) => ({ id }));
  }
  if (fieldExists(xpTable, CONFIG.fields.xpReasonPublic)) {
    createFields[CONFIG.fields.xpReasonPublic] = "Zoom recording quiz credit";
  }
  if (fieldExists(xpTable, CONFIG.fields.xpReasonDebug)) {
    createFields[CONFIG.fields.xpReasonDebug] = getText(rec, CONFIG.fields.creditDebug) || `117|${recordId}|${key}`;
  }
  if (fieldExists(xpTable, CONFIG.fields.xpSource)) {
    try {
      createFields[CONFIG.fields.xpSource] = { name: CONFIG.xpSourceName };
    } catch (e) {
      /* optional single-select */
    }
  }

  const created = await xpTable.createRecordAsync(createFields);
  return { actionOut: "created", xpEventId: created, xpPoints: amount };
}

// SECTION 5: Step D — Gate credit → Meeting Attendees

async function stepD(ctx) {
  const { zaTable, zmTable, recordId, rec } = ctx;
  if (getText(rec, CONFIG.fields.attendanceMethod) !== CONFIG.methods.recordingQuiz) {
    return { actionOut: "skipped_not_recording_quiz" };
  }
  if (isTruthyFlag(rec, CONFIG.fields.creditConflict)) {
    return { actionOut: "skipped_conflict" };
  }
  if (!isTruthyFlag(rec, CONFIG.fields.gateEarned)) {
    return { actionOut: "skipped_no_gate_credit" };
  }
  if (fieldExists(zaTable, CONFIG.fields.gateApplied) && getCheckbox(rec, CONFIG.fields.gateApplied)) {
    return { actionOut: "skipped_already_applied" };
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
  return { actionOut: already ? "skipped_already_applied" : "linked_attendee_for_gate" };
}

// SECTION 6: Step E — Perfect Week credit → Meeting Attendees

async function stepE(ctx) {
  const { zaTable, zmTable, recordId, rec } = ctx;
  if (getText(rec, CONFIG.fields.attendanceMethod) !== CONFIG.methods.recordingQuiz) {
    return { actionOut: "skipped_not_recording_quiz" };
  }
  if (isTruthyFlag(rec, CONFIG.fields.creditConflict)) {
    return { actionOut: "skipped_conflict" };
  }
  const approved = isTruthyFlag(rec, CONFIG.fields.creditApproved);
  const pw = isTruthyFlag(rec, CONFIG.fields.pwFlag);
  if (!approved || !pw) {
    return { actionOut: "skipped_flag_off" };
  }
  if (fieldExists(zaTable, CONFIG.fields.pwApplied) && getCheckbox(rec, CONFIG.fields.pwApplied)) {
    return { actionOut: "skipped_already_applied" };
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
  if (fieldExists(zaTable, CONFIG.fields.pwApplied)) {
    await updateRecordSafe(zaTable, recordId, { [CONFIG.fields.pwApplied]: true });
  }
  return { actionOut: already ? "skipped_already_applied" : "linked_attendee_for_perfect_week" };
}

// SECTION 7: Step F — Approval email (safe no-send defaults)

async function stepF(ctx) {
  const { zaTable, recordId, rec, webhookUrl } = ctx;
  if (getText(rec, CONFIG.fields.attendanceMethod) !== CONFIG.methods.recordingQuiz) {
    return { actionOut: "skipped_not_recording_quiz", sendKey: "" };
  }
  if (!getCheckbox(rec, CONFIG.fields.satisfactory)) {
    return { actionOut: "skipped_not_satisfactory", sendKey: "" };
  }
  const approved = isTruthyFlag(rec, CONFIG.fields.creditApproved);
  const conflict = isTruthyFlag(rec, CONFIG.fields.creditConflict);
  if (!approved || conflict) {
    return { actionOut: "skipped_not_approved", sendKey: "" };
  }

  let enabled = null;
  if (fieldExists(zaTable, CONFIG.fields.emailEnabled)) {
    const enabledRaw = rec.getCellValue(CONFIG.fields.emailEnabled);
    if (enabledRaw === true || enabledRaw === 1 || enabledRaw === "1" || enabledRaw === "Yes") enabled = true;
    else if (enabledRaw === false || enabledRaw === 0 || enabledRaw === "0" || enabledRaw === "No") enabled = false;
  }

  if (enabled === null) {
    return { actionOut: "skipped_config_missing", sendKey: "" };
  }
  if (!enabled) {
    return { actionOut: "skipped_disabled", sendKey: "" };
  }

  const template = getText(rec, CONFIG.fields.emailTemplate);
  if (!template) {
    return { actionOut: "skipped_missing_template_key", sendKey: "" };
  }

  const enrollRid = getText(rec, CONFIG.fields.enrollmentRid);
  const meetingRid = getText(rec, CONFIG.fields.zoomMeetingRid);
  const sendKey = `ZOOM_REC_EMAIL|${enrollRid}|${meetingRid}`;
  if (fieldExists(zaTable, CONFIG.fields.sendKey) && getText(rec, CONFIG.fields.sendKey) === sendKey) {
    return { actionOut: "skipped_already_sent", sendKey };
  }

  if (!webhookUrl) {
    return { actionOut: "skipped_no_webhook", sendKey };
  }

  const payload = {
    templateKey: template,
    sendKey,
    enrollmentRid: enrollRid,
    zoomMeetingRid: meetingRid,
    zoomAttendanceId: recordId,
    timing: getText(rec, CONFIG.fields.emailTiming) || "On Satisfactory",
  };

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

  return { actionOut: "sent", sendKey };
}

function isMutatingAction(action) {
  if (!action) return false;
  if (action === "error") return false;
  if (String(action).startsWith("skipped_")) return false;
  return true;
}

// SECTION 8: main — run A→F

async function main() {
  let debugStep = "1 - Validate recordId";
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("errorOut", "");
  setOutputSafe("actionAOut", "");
  setOutputSafe("actionBOut", "");
  setOutputSafe("actionCOut", "");
  setOutputSafe("actionDOut", "");
  setOutputSafe("actionEOut", "");
  setOutputSafe("actionFOut", "");

  const cfg = input.config();
  const recordId = requireRecId(cfg.recordId);
  const webhookUrl = (cfg.webhookUrl || "").trim();

  debugStep = "2 - Load tables / schema";
  setOutputSafe("debugStep", debugStep);
  const zaTable = base.getTable(CONFIG.tables.zoomAttendance);
  const zmTable = base.getTable(CONFIG.tables.zoomMeetings);
  const xpTable = base.getTable(CONFIG.tables.xpEvents);

  let rec = await loadZa(zaTable, recordId);
  const ctx = { zaTable, zmTable, xpTable, recordId, rec, webhookUrl };

  debugStep = "A - Normalize recording quiz submission";
  setOutputSafe("debugStep", debugStep);
  const a = await stepA(ctx);
  setOutputSafe("actionAOut", a.actionOut);
  setOutputSafe("enrollmentRid", a.enrollRid || "");
  setOutputSafe("zoomMeetingRid", a.meetingRid || "");
  setOutputSafe("zoomAttendanceId", a.keepId || recordId);
  if (a.errorOut) setOutputSafe("errorOut", a.errorOut);

  if (a.abort) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", a.actionOut);
    setOutputSafe("xpEventId", "");
    setOutputSafe("xpPoints", 0);
    setOutputSafe("correctionCount", 0);
    setOutputSafe("sendKey", "");
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: "skipped",
        actionOut: a.actionOut,
        recordId,
      })
    );
    return;
  }

  if (a.wrote) {
    rec = await loadZa(zaTable, recordId);
    ctx.rec = rec;
  }

  debugStep = "B - Coach review / Needs Correction";
  setOutputSafe("debugStep", debugStep);
  const b = await stepB(ctx);
  setOutputSafe("actionBOut", b.actionOut);
  setOutputSafe("correctionCount", b.correctionCount || 0);

  // Reload so Zoom Credit Approved? / XP Amount / gate / PW formulas see Satisfactory? write
  rec = await loadZa(zaTable, recordId);
  ctx.rec = rec;

  debugStep = "C - Create / update / deactivate Zoom XP Event";
  setOutputSafe("debugStep", debugStep);
  const c = await stepC(ctx);
  setOutputSafe("actionCOut", c.actionOut);
  setOutputSafe("xpEventId", c.xpEventId || "");
  setOutputSafe("xpPoints", c.xpPoints || 0);

  // Refresh ZA flags after possible applied writes downstream
  rec = await loadZa(zaTable, recordId);
  ctx.rec = rec;

  debugStep = "D - Apply Zoom gate credit";
  setOutputSafe("debugStep", debugStep);
  const d = await stepD(ctx);
  setOutputSafe("actionDOut", d.actionOut);

  rec = await loadZa(zaTable, recordId);
  ctx.rec = rec;

  debugStep = "E - Apply Perfect Week credit";
  setOutputSafe("debugStep", debugStep);
  const e = await stepE(ctx);
  setOutputSafe("actionEOut", e.actionOut);

  rec = await loadZa(zaTable, recordId);
  ctx.rec = rec;

  debugStep = "F - Send approval email";
  setOutputSafe("debugStep", debugStep);
  const f = await stepF(ctx);
  setOutputSafe("actionFOut", f.actionOut);
  setOutputSafe("sendKey", f.sendKey || "");

  const actions = [a.actionOut, b.actionOut, c.actionOut, d.actionOut, e.actionOut, f.actionOut];
  const composite = actions.join("|");
  const anyMutation = actions.some(isMutatingAction);
  // Prefer success when any non-skip action ran; pure all-skips → skipped
  const finalStatus = anyMutation ? "success" : "skipped";

  debugStep = "9 - Outputs";
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("statusOut", finalStatus);
  setOutputSafe("actionOut", composite);
  setOutputSafe("errorOut", "");
  setOutputSafe("zoomAttendanceId", recordId);

  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: finalStatus,
      actionOut: composite,
      actionAOut: a.actionOut,
      actionBOut: b.actionOut,
      actionCOut: c.actionOut,
      actionDOut: d.actionOut,
      actionEOut: e.actionOut,
      actionFOut: f.actionOut,
      recordId,
      xpEventId: c.xpEventId || "",
      sendKey: f.sendKey || "",
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
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "error",
      errorOut: msg,
    })
  );
  throw err;
}

/*
GitHub header
Automation: 117 - Zoom - Create Zoom Recording Approval Communications Hub Handoff
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Version: v2.0
Date Written: 2026-07-20
Last Updated: 2026-08-17

PURPOSE
- Validate one Zoom Attendance recording-approval path for parent email.
- Create exactly one Ready Email Handoff Queue row for Communications Hub.
- Hand off template data to Automation 079 / Communications Hub / Resend.

IMPORTANT DESIGN RULES
- Hub owns subject, HTML, plain text, branding, delivery, and Delivery proof.
- This script never calls Make, Gmail, Resend, or the Communications Hub ingress.
- Only Automation 079 may send Email Handoff Queue rows to the Hub.
- One Zoom Attendance maps to ZOOM_RECORDING_APPROVED|ZOOM_ATTENDANCE|{ZA Record ID}.
- Idempotent: reuse an existing matching Handoff Key; conflicting payload → Needs Review.
- Do not write Airtable "sent" fields (none historically on this path).
- Validate enrollmentRid and zoomMeetingRid match linked records when links exist.
- Never mention Make route 117f in runtime payload.
- testMode defaults true for controlled Hub sends.

THIS IS NOT
- Automation 117 orchestrator (normalize / XP / gate / perfect-week).
- Make Gmail composition (retired for this GitHub path).

FOLDER
- 17 - Zoom Recording Credit

AUTOMATION NAME
- 117 - Zoom - Create Zoom Recording Approval Communications Hub Handoff

TRIGGER TABLE
- Zoom Attendance

RECOMMENDED TRIGGER CONDITIONS
- Attendance Method is Recording Quiz
- Recording Quiz Satisfactory? is checked

INPUT
- recordId (required Zoom Attendance record ID)
- enrollmentRid (required Enrollment record ID)
- zoomMeetingRid (required Zoom Meeting record ID)
- testMode (optional; default true)

OUTPUTS
- statusOut: success | skipped | error
- actionOut: created_handoff | existing_handoff | needs_review | error
- queueRecordId, handoffKey, errorOut, debugStep, zoomAttendanceId
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "117 - Zoom - Create Zoom Recording Approval Communications Hub Handoff",
  version: "v2.0",
  versionDate: "2026-08-17",
  originalWrittenDate: "2026-07-20",
  lastUpdated: "2026-08-17",
  folder: "17 - Zoom Recording Credit",
  automationName: "117 - Zoom - Create Zoom Recording Approval Communications Hub Handoff",
};

const CONFIG = {
  tables: {
    za: "Zoom Attendance",
    enr: "Enrollments",
    zm: "Zoom Meetings",
    queue: "Email Handoff Queue",
  },
  statuses: { draft: "Draft", ready: "Ready", needsReview: "Needs Review" },
  fields: {
    za: {
      enrollment: "Enrollment",
      zoomMeeting: "Zoom Meeting",
      satisfactory: "Recording Quiz Satisfactory?",
      xpAmount: "Zoom XP Amount",
    },
    enr: {
      active: "Active?",
      program: "Program Instance",
      parentClean: "Parent Email - Cleaned",
      parentFirst: "Parent First Name",
      athlete: "Full Athlete Name",
    },
    zm: {
      meetingName: "Meeting Name",
      recordingVideo: "Recording Link - Video",
      startTime: "Start Time",
    },
    queue: {
      key: "Handoff Key",
      status: "Status",
      sourceTable: "Source Table",
      eventType: "Event Type",
      payload: "Payload JSON",
      attempts: "Attempt Count",
      pi: "Program Instance Record ID",
      source: "Source Record ID",
      enrollment: "Enrollment Record ID",
      recipients: "Recipients JSON",
      template: "Template Key",
      testMode: "Test Mode?",
    },
  },
  values: {
    eventType: "ZOOM_RECORDING_APPROVED",
    templateKey: "ZOOM_RECORDING_APPROVED",
    sourceTableToken: "ZOOM_ATTENDANCE",
    approvalResult: "Satisfactory",
    timing: "On Satisfactory",
  },
};

const TZ = "America/Denver";

function setOutput(name, value) {
  try {
    output.set(name, value);
  } catch {}
}

function debug(value) {
  setOutput("debugStep", value);
}

function exists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch {
    return false;
  }
}

function raw(rec, table, name) {
  return rec && exists(table, name) ? rec.getCellValue(name) : null;
}

function text(rec, table, name) {
  return rec && exists(table, name) ? String(rec.getCellValueAsString(name) || "").trim() : "";
}

function ids(rec, table, name) {
  const value = raw(rec, table, name);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}

function checked(rec, table, name) {
  return raw(rec, table, name) === true;
}

function number(rec, table, name) {
  const value = raw(rec, table, name);
  const n = typeof value === "number" ? value : Number(text(rec, table, name).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function one(values, label) {
  if (values.length !== 1) throw new Error(`${label} must contain exactly one linked record; found ${values.length}.`);
  return values[0];
}

function first(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function recipientEmail(rec, table, name) {
  const email = cleanEmail(text(rec, table, name));
  return validEmail(email) ? email : "";
}

function requireRecId(label, value) {
  const id = String(value || "").trim();
  if (!id) throw new Error(`Missing required input: ${label}`);
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) {
    throw new Error(`Invalid ${label}: must be a valid Airtable record ID.`);
  }
  return id;
}

function parseDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateText(value) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function selectValue(table, name, value) {
  const field = table.getField(name);
  if (field.type !== "singleSelect") return value;
  const choice = (field.options?.choices || []).find(
    (item) => String(item.name || "").toLowerCase() === String(value || "").toLowerCase()
  );
  if (!choice) throw new Error(`Missing option ${value} on ${table.name}.${name}`);
  return { name: choice.name };
}

function queueFields(queueTable, values) {
  return Object.fromEntries(Object.entries(values).filter(([name]) => exists(queueTable, name)));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function samePayload(left, right) {
  try {
    return stableJson(JSON.parse(left || "{}")) === stableJson(right);
  } catch {
    return false;
  }
}

async function markQueueNeedsReview(queueTable, rows) {
  for (const row of rows) {
    if (exists(queueTable, CONFIG.fields.queue.status)) {
      await queueTable.updateRecordAsync(row.id, {
        [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.needsReview),
      });
    }
  }
}

async function main() {
  const cfg = input.config();
  const zoomAttendanceId = requireRecId("recordId", cfg.recordId);
  const enrollmentRid = requireRecId("enrollmentRid", cfg.enrollmentRid);
  const zoomMeetingRid = requireRecId("zoomMeetingRid", cfg.zoomMeetingRid);
  const testMode = cfg.testMode === undefined ? true : Boolean(cfg.testMode);
  setOutput("zoomAttendanceId", zoomAttendanceId);

  const zaT = base.getTable(CONFIG.tables.za);
  const enrT = base.getTable(CONFIG.tables.enr);
  const zmT = base.getTable(CONFIG.tables.zm);
  const queueT = base.getTable(CONFIG.tables.queue);

  debug("01 - Load Zoom Attendance, Enrollment, Zoom Meeting");
  const [za, enr, zm] = await Promise.all([
    zaT.selectRecordAsync(zoomAttendanceId),
    enrT.selectRecordAsync(enrollmentRid),
    zmT.selectRecordAsync(zoomMeetingRid),
  ]);
  if (!za) throw new Error(`Zoom Attendance not found: ${zoomAttendanceId}`);
  if (!enr) throw new Error(`Enrollment not found: ${enrollmentRid}`);
  if (!zm) throw new Error(`Zoom Meeting not found: ${zoomMeetingRid}`);

  const handoffKey = `${CONFIG.values.eventType}|${CONFIG.values.sourceTableToken}|${zoomAttendanceId}`;

  debug("02 - Validate links and readiness");
  const linkedEnrollmentIds = ids(za, zaT, CONFIG.fields.za.enrollment);
  if (linkedEnrollmentIds.length && !linkedEnrollmentIds.includes(enrollmentRid)) {
    throw new Error("enrollmentRid does not match Zoom Attendance Enrollment link.");
  }
  const linkedMeetingIds = ids(za, zaT, CONFIG.fields.za.zoomMeeting);
  if (linkedMeetingIds.length && !linkedMeetingIds.includes(zoomMeetingRid)) {
    throw new Error("zoomMeetingRid does not match Zoom Attendance Zoom Meeting link.");
  }
  if (exists(zaT, CONFIG.fields.za.satisfactory) && !checked(za, zaT, CONFIG.fields.za.satisfactory)) {
    throw new Error("Recording Quiz Satisfactory? is not checked. Handoff blocked.");
  }
  if (exists(enrT, CONFIG.fields.enr.active) && !checked(enr, enrT, CONFIG.fields.enr.active)) {
    throw new Error("Enrollment is inactive. Handoff blocked.");
  }

  debug("03 - Resolve recipients and Hub payload");
  const programId = one(ids(enr, enrT, CONFIG.fields.enr.program), "Enrollment Program Instance");
  const parent = recipientEmail(enr, enrT, CONFIG.fields.enr.parentClean);
  if (!parent) throw new Error("No usable cleaned parent recipient on Enrollment.");

  const athleteName = first(text(enr, enrT, CONFIG.fields.enr.athlete), "Athlete");
  const meetingName = first(text(zm, zmT, CONFIG.fields.zm.meetingName), zm.name, "Zoom Meeting");
  const meetingStartText = dateText(raw(zm, zmT, CONFIG.fields.zm.startTime));
  const recordingUrl = text(zm, zmT, CONFIG.fields.zm.recordingVideo);
  const recordingXpValue = number(za, zaT, CONFIG.fields.za.xpAmount);

  const recipients = [{ email: parent, role: "guardian" }];
  const payload = {
    athleteName,
    parentFirstName: text(enr, enrT, CONFIG.fields.enr.parentFirst),
    meetingName,
    approvalResult: CONFIG.values.approvalResult,
    timing: CONFIG.values.timing,
  };
  if (meetingStartText) {
    payload.meetingDate = meetingStartText;
    payload.meetingStartText = meetingStartText;
  }
  if (recordingUrl) payload.recordingUrl = recordingUrl;
  if (Number.isFinite(recordingXpValue) && recordingXpValue > 0) {
    payload.recordingXp = recordingXpValue;
  }

  const queueData = queueFields(queueT, {
    [CONFIG.fields.queue.key]: handoffKey,
    [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.draft),
    [CONFIG.fields.queue.sourceTable]: CONFIG.tables.za,
    [CONFIG.fields.queue.eventType]: selectValue(queueT, CONFIG.fields.queue.eventType, CONFIG.values.eventType),
    [CONFIG.fields.queue.template]: CONFIG.values.templateKey,
    [CONFIG.fields.queue.source]: zoomAttendanceId,
    [CONFIG.fields.queue.enrollment]: enrollmentRid,
    [CONFIG.fields.queue.pi]: programId,
    [CONFIG.fields.queue.recipients]: JSON.stringify(recipients),
    [CONFIG.fields.queue.payload]: JSON.stringify(payload),
    [CONFIG.fields.queue.testMode]: testMode,
    [CONFIG.fields.queue.attempts]: 0,
  });

  debug("04 - Idempotent Email Handoff Queue create");
  const existing = (
    await queueT.selectRecordsAsync({
      fields: Object.values(CONFIG.fields.queue).filter((name) => exists(queueT, name)),
    })
  ).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);

  if (existing.length > 1) {
    await markQueueNeedsReview(queueT, existing);
    setOutput("statusOut", "error");
    setOutput("actionOut", "needs_review");
    throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey}.`);
  }

  if (existing.length === 1) {
    if (!samePayload(text(existing[0], queueT, CONFIG.fields.queue.payload), payload)) {
      await markQueueNeedsReview(queueT, existing);
      setOutput("statusOut", "error");
      setOutput("actionOut", "needs_review");
      throw new Error(`Conflicting Email Handoff Queue payload for ${handoffKey}.`);
    }
    setOutput("statusOut", "success");
    setOutput("actionOut", "existing_handoff");
    setOutput("queueRecordId", existing[0].id);
    setOutput("handoffKey", handoffKey);
    setOutput("errorOut", "");
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: "success",
        actionOut: "existing_handoff",
        queueRecordId: existing[0].id,
        handoffKey,
        zoomAttendanceId,
      })
    );
    return;
  }

  const recheck = (
    await queueT.selectRecordsAsync({
      fields: [CONFIG.fields.queue.key].filter((name) => exists(queueT, name)),
    })
  ).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);
  if (recheck.length) {
    if (recheck.length > 1) {
      await markQueueNeedsReview(queueT, recheck);
      throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey} after recheck.`);
    }
    setOutput("statusOut", "success");
    setOutput("actionOut", "existing_handoff");
    setOutput("queueRecordId", recheck[0].id);
    setOutput("handoffKey", handoffKey);
    setOutput("errorOut", "");
    return;
  }

  const created = await queueT.createRecordAsync(queueData);
  const afterCreate = (
    await queueT.selectRecordsAsync({
      fields: [CONFIG.fields.queue.key].filter((name) => exists(queueT, name)),
    })
  ).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);
  if (afterCreate.length !== 1) {
    await markQueueNeedsReview(queueT, afterCreate);
    throw new Error(`Concurrent Email Handoff Queue creation requires review for ${handoffKey}.`);
  }

  await queueT.updateRecordAsync(created, {
    [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.ready),
  });

  setOutput("statusOut", "success");
  setOutput("actionOut", "created_handoff");
  setOutput("queueRecordId", created);
  setOutput("handoffKey", handoffKey);
  setOutput("errorOut", "");
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "success",
      actionOut: "created_handoff",
      queueRecordId: created,
      handoffKey,
      zoomAttendanceId,
    })
  );
}

try {
  await main();
} catch (error) {
  setOutput("statusOut", "error");
  setOutput("actionOut", "error");
  setOutput("errorOut", String(error.message || error));
  throw error;
}

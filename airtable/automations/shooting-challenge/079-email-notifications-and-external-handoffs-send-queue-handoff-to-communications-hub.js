/*
Automation: 079 – Send to Communications Hub - NEW
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-17
Last GitHub Update: 2026-08-20 (v2.5 V2 standard structure)

Purpose:
Dispatch one Ready Email Handoff Queue row to the Communications Hub.
Remain the single shared dispatcher for WELCOME, DAILY_SUBMISSION,
VIDEO_FEEDBACK, HOMEWORK_FEEDBACK, WEEKLY_ATHLETE_SUMMARY, and
ZOOM_RECORDING_APPROVAL.

Trigger:
Email Handoff Queue when Status is Ready; pass the dynamic recordId
and ingressSecret.

Important Tables:
Email Handoff Queue

Important Fields:
Status, Event Type, Handoff Key, Source Table, Source Record ID,
Recipients JSON, Template Key, Payload JSON, Test Mode?, Attempt Count,
Hub Event ID, Hub Response JSON

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Only this script may POST Email Handoff Queue rows to Hub ingress.
*/

/************************************************************
 * 079 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Send Queue Handoff to Communications Hub
 *
 * Version: v2.5
 * Date Written: 2026-08-11
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v2.5 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, numbered sections, hoisted debugStep, outer run
 *   wrapper. Business logic unchanged from v2.4.
 * - v2.4 (2026-08-17): Shared dispatcher for WELCOME, DAILY_SUBMISSION,
 *   VIDEO_FEEDBACK, HOMEWORK_FEEDBACK, WEEKLY_ATHLETE_SUMMARY, and
 *   ZOOM_RECORDING_APPROVAL (Event Type ≠ Template Key for Zoom).
 *
 * PURPOSE
 * - Dispatch one Ready Email Handoff Queue row to the Communications Hub.
 * - Remain the single shared dispatcher for all Shooting Challenge Hub events.
 *
 * IMPORTANT DESIGN RULES
 * - Use Airtable Scripting fetch(...) for Communications Hub ingress.
 * - Preserve the existing WELCOME envelope, validation, retry, and replay behavior.
 * - DAILY_SUBMISSION accepts only DAILY_SUBMISSION|SUBMISSIONS|<Submission Record ID>
 *   and requires the key suffix to equal Source Record ID.
 * - VIDEO_FEEDBACK accepts only VIDEO_FEEDBACK|VIDEO_FEEDBACK|<Video Feedback Record ID>
 *   and requires the key suffix to equal Source Record ID.
 * - HOMEWORK_FEEDBACK accepts only HOMEWORK_FEEDBACK|HOMEWORK_COMPLETIONS|<HC Record ID>
 *   and requires the key suffix to equal Source Record ID.
 * - WEEKLY_ATHLETE_SUMMARY accepts only
 *   WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|<WAS Record ID>
 *   and requires the key suffix to equal Source Record ID.
 * - ZOOM_RECORDING_APPROVAL (Airtable Event Type) accepts only
 *   ZOOM_RECORDING_APPROVAL|ZOOM_ATTENDANCE|<ZA Record ID> and requires Template Key
 *   ZOOM_RECORDING_APPROVED (Event Type and Template Key are intentionally different).
 * - Validate actual Email Handoff Queue Event Type single-select choices; do not invent options.
 * - Reuse the existing queue record by deterministic Handoff Key; never create duplicate
 *   queue rows, Hub Messages, or Deliveries from this dispatcher.
 * - Never call Make, Gmail, or Resend directly. Never mark source records sent merely
 *   because the Hub accepted the request.
 * - The Hub owns rendering and delivery; this script never rebuilds email content.
 * - The ingress secret is an Airtable input and is never logged or stored.
 *
 * THIS IS NOT
 * - Queue row creators (071 / 073 / 074 / 076 / welcome creators).
 * - Email package builders (072).
 * - Source-record Sent? writeback (Hub / downstream).
 * - Make / Gmail / Resend direct send.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 079 – Send to Communications Hub - NEW
 *
 * TRIGGER TABLE
 * - Email Handoff Queue
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Status is Ready
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Email Handoff Queue record ID
 * - ingressSecret = Communications Hub bearer secret
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = accepted | skipped | error
 * - actionOut = accepted_new | accepted_duplicate | skipped_not_ready | error
 * - queueRecordId / handoffKey / hubEventId / attemptCount / hubResponseJson
 * - errorOut / debugStep
 *
 * PRIMARY TABLES USED
 * - Email Handoff Queue
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Email Handoff Queue → Status, Attempt Count, Last Attempt At, Last Error,
 *   Hub Event ID, Hub Response JSON, Accepted At
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "079 – Send to Communications Hub - NEW",
  version: "v2.5",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-08-11",
  lastUpdated: "2026-08-20",
  folder: "07 - Email, Notifications, and External Handoffs",
  automationName: "079 – Send to Communications Hub - NEW",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  tables: {
    queue: "Email Handoff Queue",
  },
  fields: {
    status: "Status",
    eventType: "Event Type",
    handoffKey: "Handoff Key",
    sourceTable: "Source Table",
    sourceRecordId: "Source Record ID",
    enrollmentRecordId: "Enrollment Record ID",
    programInstanceRecordId: "Program Instance Record ID",
    recipientsJson: "Recipients JSON",
    templateKey: "Template Key",
    payloadJson: "Payload JSON",
    testMode: "Test Mode?",
    attemptCount: "Attempt Count",
    lastAttemptAt: "Last Attempt At",
    lastError: "Last Error",
    hubEventId: "Hub Event ID",
    hubResponseJson: "Hub Response JSON",
    acceptedAt: "Accepted At",
  },
  values: {
    statusReady: "Ready",
    statusSending: "Sending",
    statusAccepted: "Accepted",
    statusFailed: "Failed",
    statusNeedsReview: "Needs Review",
    eventWelcome: "WELCOME",
    eventDailySubmission: "DAILY_SUBMISSION",
    eventVideoFeedback: "VIDEO_FEEDBACK",
    eventHomeworkFeedback: "HOMEWORK_FEEDBACK",
    eventWeeklyAthleteSummary: "WEEKLY_ATHLETE_SUMMARY",
    // Airtable Event Type choice (not the Hub template key).
    eventZoomRecordingApproval: "ZOOM_RECORDING_APPROVAL",
    templateWelcome: "WELCOME",
    templateDailySubmission: "DAILY_SUBMISSION",
    templateVideoFeedback: "VIDEO_FEEDBACK",
    templateHomeworkFeedback: "HOMEWORK_FEEDBACK",
    templateWeeklyAthleteSummary: "WEEKLY_ATHLETE_SUMMARY",
    // Hub / registered template key (intentionally differs from Event Type).
    templateZoomRecordingApproved: "ZOOM_RECORDING_APPROVED",
    sourceEnrollments: "Enrollments",
    sourceSubmissions: "Submissions",
    sourceVideoFeedback: "Video Feedback",
    sourceHomeworkCompletions: "Homework Completions",
    sourceWeeklyAthleteSummary: "Weekly Athlete Summary",
    sourceZoomAttendance: "Zoom Attendance",
    sourceSystem: "SHOOTING_CHALLENGE",
    schemaVersion: "1.0",
    maxAttemptsBeforeReview: 3,
  },
  communicationsHub: {
    ingestUrl: "https://communications-two-blue.vercel.app/api/events/ingest",
  },
};

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

const fieldCache = new Map();
let debugStep = "0 - Start";

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore unmapped output keys.
  }
}

function step(name) {
  debugStep = name;
  setOutputSafe("debugStep", debugStep);
}

function log(message, data) {
  console.log(data === undefined ? message : `${message} ${JSON.stringify(data)}`);
}

function getFieldSafe(table, fieldName) {
  const key = `${table?.name || "unknown"}:${fieldName}`;
  if (fieldCache.has(key)) return fieldCache.get(key);
  try {
    const field = table.getField(fieldName);
    fieldCache.set(key, field);
    return field;
  } catch {
    fieldCache.set(key, null);
    return null;
  }
}

function requireField(table, fieldName, expectedTypes) {
  const field = getFieldSafe(table, fieldName);
  if (!field) throw new Error(`Missing required field: ${table.name}.${fieldName}`);
  if (expectedTypes && !expectedTypes.includes(field.type)) {
    throw new Error(
      `Invalid field type: ${table.name}.${fieldName} is ${field.type}; expected ${expectedTypes.join(", ")}`
    );
  }
  return field;
}

function requireWritableField(table, fieldName, expectedTypes) {
  const field = requireField(table, fieldName, expectedTypes);
  const computedTypes = new Set([
    "formula",
    "rollup",
    "count",
    "lookup",
    "multipleLookupValues",
    "createdTime",
    "lastModifiedTime",
    "createdBy",
    "lastModifiedBy",
    "autoNumber",
    "button",
    "aiText",
    "externalSyncSource",
  ]);
  if (field.isComputed === true || computedTypes.has(field.type)) {
    throw new Error(`Required queue field is not writable: ${table.name}.${fieldName}`);
  }
  return field;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function requireSingleSelectValue(table, fieldName, value) {
  const field = requireWritableField(table, fieldName, ["singleSelect"]);
  const choice = (field.options?.choices || []).find(
    (item) => normalizeText(item.name) === normalizeText(value)
  );
  if (!choice) throw new Error(`Missing option "${value}" in ${table.name}.${fieldName}`);
  return { name: choice.name };
}

function getRaw(record, fieldName) {
  return record?.getCellValue(fieldName);
}

function getText(record, fieldName) {
  return String(record?.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, fieldName) {
  const raw = getRaw(record, fieldName);
  const value = typeof raw === "number" ? raw : Number(String(raw || "").trim());
  if (!Number.isFinite(value) || value < 0) throw new Error(`${fieldName} must be a non-negative number`);
  return value;
}

function getBoolean(record, fieldName) {
  return getRaw(record, fieldName) === true;
}

function requireRecordId(value, label) {
  const recordId = String(value || "").trim();
  if (!recordId || !recordId.startsWith("rec")) {
    throw new Error(`Invalid ${label} record ID: ${recordId || "blank"}`);
  }
  return recordId;
}

function requireEmail(value, label) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || /\s/.test(email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error(`Invalid ${label} email`);
  }
  return email;
}

function parseJson(value, fieldName) {
  try {
    return JSON.parse(String(value || ""));
  } catch (error) {
    throw new Error(`${fieldName} is not valid JSON: ${error.message}`);
  }
}

function parseWelcomeRecipients(value) {
  const recipients = parseJson(value, CONFIG.fields.recipientsJson);
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error(`${CONFIG.fields.recipientsJson} must be a non-empty array`);
  }
  const seenRoles = new Set();
  return recipients.map((recipient, index) => {
    if (!recipient || typeof recipient !== "object" || Array.isArray(recipient)) {
      throw new Error(`Recipient ${index + 1} must be an object`);
    }
    if (recipient.role !== "PARENT" && recipient.role !== "ATHLETE") {
      throw new Error(`Invalid recipient role for ${recipient.email || "blank"}`);
    }
    if (seenRoles.has(recipient.role)) throw new Error(`Duplicate recipient role: ${recipient.role}`);
    seenRoles.add(recipient.role);
    return { role: recipient.role, email: requireEmail(recipient.email, `recipient ${recipient.role}`) };
  });
}

function parseDailyRecipients(value) {
  const recipients = parseJson(value, CONFIG.fields.recipientsJson);
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error(`${CONFIG.fields.recipientsJson} must be a non-empty array`);
  }
  return recipients.map((recipient, index) => {
    if (!recipient || typeof recipient !== "object" || Array.isArray(recipient)) {
      throw new Error(`Recipient ${index + 1} must be an object`);
    }
    const email = requireEmail(recipient.email, `recipient ${index + 1}`);
    return { ...recipient, email };
  });
}

function parsePayload(value, eventType) {
  const payload = parseJson(value, CONFIG.fields.payloadJson);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`${CONFIG.fields.payloadJson} must be an object`);
  }
  if (eventType === CONFIG.values.eventWelcome) {
    for (const key of ["athleteName", "programName", "message"]) {
      if (!String(payload?.[key] || "").trim()) {
        throw new Error(`${CONFIG.fields.payloadJson} is missing ${key}`);
      }
    }
  }
  if (eventType === CONFIG.values.eventVideoFeedback) {
    for (const key of ["athleteName", "coachFeedback", "totalVideoXpAwarded"]) {
      if (payload?.[key] === undefined || payload?.[key] === null || String(payload?.[key]).trim() === "") {
        throw new Error(`${CONFIG.fields.payloadJson} is missing ${key}`);
      }
    }
  }
  if (eventType === CONFIG.values.eventHomeworkFeedback) {
    for (const key of ["athleteName", "coachFeedback"]) {
      if (payload?.[key] === undefined || payload?.[key] === null || String(payload?.[key]).trim() === "") {
        throw new Error(`${CONFIG.fields.payloadJson} is missing ${key}`);
      }
    }
    const xp = payload?.totalHomeworkXpAwarded ?? payload?.totalXp;
    if (xp === undefined || xp === null || String(xp).trim() === "") {
      throw new Error(`${CONFIG.fields.payloadJson} is missing totalHomeworkXpAwarded (or totalXp)`);
    }
  }
  if (eventType === CONFIG.values.eventWeeklyAthleteSummary) {
    if (payload?.athleteName === undefined || payload?.athleteName === null || String(payload.athleteName).trim() === "") {
      throw new Error(`${CONFIG.fields.payloadJson} is missing athleteName`);
    }
    const weekLabel = payload?.weekLabel ?? payload?.weekName;
    if (weekLabel === undefined || weekLabel === null || String(weekLabel).trim() === "") {
      throw new Error(`${CONFIG.fields.payloadJson} is missing weekLabel (or weekName)`);
    }
  }
  if (eventType === CONFIG.values.eventZoomRecordingApproval) {
    for (const key of ["athleteName", "meetingName"]) {
      if (payload?.[key] === undefined || payload?.[key] === null || String(payload?.[key]).trim() === "") {
        throw new Error(`${CONFIG.fields.payloadJson} is missing ${key}`);
      }
    }
    const approvalOrTiming = payload?.approvalResult ?? payload?.timing;
    if (approvalOrTiming === undefined || approvalOrTiming === null || String(approvalOrTiming).trim() === "") {
      throw new Error(`${CONFIG.fields.payloadJson} is missing approvalResult (or timing)`);
    }
  }
  return payload;
}

function sanitizeText(value, secret = "") {
  let text = String(value || "");
  if (secret) text = text.split(secret).join("[REDACTED]");
  text = text.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]");
  return text.slice(0, 10000);
}

function sanitizeJson(value, secret = "") {
  return sanitizeText(JSON.stringify(value), secret);
}

function buildStatusValue(queueTable, value) {
  return requireSingleSelectValue(queueTable, CONFIG.fields.status, value);
}

function setQueueOutputs(context) {
  for (const [key, value] of Object.entries(context)) setOutputSafe(key, value);
}

async function postJson(url, secret, payload) {
  const request = {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
  return fetch(url, request);
}

function validateHandoff(eventType, templateKey, handoffKey, sourceTable, sourceRecordId) {
  if (eventType === CONFIG.values.eventWelcome) {
    if (!handoffKey.startsWith("WELCOME|")) throw new Error(`Invalid WELCOME Handoff Key: ${handoffKey || "blank"}`);
    if (templateKey !== CONFIG.values.templateWelcome) throw new Error("Template Key must be WELCOME");
    if (sourceTable !== CONFIG.values.sourceEnrollments) {
      throw new Error(`Source Table must be ${CONFIG.values.sourceEnrollments}`);
    }
    return;
  }
  if (eventType === CONFIG.values.eventDailySubmission) {
    const match = /^DAILY_SUBMISSION\|SUBMISSIONS\|(rec[A-Za-z0-9]{14})$/.exec(handoffKey);
    if (!match) throw new Error(`Invalid DAILY_SUBMISSION Handoff Key: ${handoffKey || "blank"}`);
    if (match[1] !== sourceRecordId) {
      throw new Error("DAILY_SUBMISSION Handoff Key does not match Source Record ID");
    }
    if (templateKey !== CONFIG.values.templateDailySubmission) {
      throw new Error("Template Key must be DAILY_SUBMISSION");
    }
    if (sourceTable !== CONFIG.values.sourceSubmissions) {
      throw new Error(`Source Table must be ${CONFIG.values.sourceSubmissions}`);
    }
    return;
  }
  if (eventType === CONFIG.values.eventVideoFeedback) {
    const match = /^VIDEO_FEEDBACK\|VIDEO_FEEDBACK\|(rec[A-Za-z0-9]{14})$/.exec(handoffKey);
    if (!match) throw new Error(`Invalid VIDEO_FEEDBACK Handoff Key: ${handoffKey || "blank"}`);
    if (match[1] !== sourceRecordId) {
      throw new Error("VIDEO_FEEDBACK Handoff Key does not match Source Record ID");
    }
    if (templateKey !== CONFIG.values.templateVideoFeedback) {
      throw new Error("Template Key must be VIDEO_FEEDBACK");
    }
    if (sourceTable !== CONFIG.values.sourceVideoFeedback) {
      throw new Error(`Source Table must be ${CONFIG.values.sourceVideoFeedback}`);
    }
    return;
  }
  if (eventType === CONFIG.values.eventHomeworkFeedback) {
    const match = /^HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|(rec[A-Za-z0-9]{14})$/.exec(handoffKey);
    if (!match) throw new Error(`Invalid HOMEWORK_FEEDBACK Handoff Key: ${handoffKey || "blank"}`);
    if (match[1] !== sourceRecordId) {
      throw new Error("HOMEWORK_FEEDBACK Handoff Key does not match Source Record ID");
    }
    if (templateKey !== CONFIG.values.templateHomeworkFeedback) {
      throw new Error("Template Key must be HOMEWORK_FEEDBACK");
    }
    if (sourceTable !== CONFIG.values.sourceHomeworkCompletions) {
      throw new Error(`Source Table must be ${CONFIG.values.sourceHomeworkCompletions}`);
    }
    return;
  }
  if (eventType === CONFIG.values.eventWeeklyAthleteSummary) {
    const match = /^WEEKLY_ATHLETE_SUMMARY\|WEEKLY_ATHLETE_SUMMARY\|(rec[A-Za-z0-9]{14})$/.exec(handoffKey);
    if (!match) throw new Error(`Invalid WEEKLY_ATHLETE_SUMMARY Handoff Key: ${handoffKey || "blank"}`);
    if (match[1] !== sourceRecordId) {
      throw new Error("WEEKLY_ATHLETE_SUMMARY Handoff Key does not match Source Record ID");
    }
    if (templateKey !== CONFIG.values.templateWeeklyAthleteSummary) {
      throw new Error("Template Key must be WEEKLY_ATHLETE_SUMMARY");
    }
    if (sourceTable !== CONFIG.values.sourceWeeklyAthleteSummary) {
      throw new Error(`Source Table must be ${CONFIG.values.sourceWeeklyAthleteSummary}`);
    }
    return;
  }
  if (eventType === CONFIG.values.eventZoomRecordingApproval) {
    const match = /^ZOOM_RECORDING_APPROVAL\|ZOOM_ATTENDANCE\|(rec[A-Za-z0-9]{14})$/.exec(handoffKey);
    if (!match) throw new Error(`Invalid ZOOM_RECORDING_APPROVAL Handoff Key: ${handoffKey || "blank"}`);
    if (match[1] !== sourceRecordId) {
      throw new Error("ZOOM_RECORDING_APPROVAL Handoff Key does not match Source Record ID");
    }
    if (templateKey !== CONFIG.values.templateZoomRecordingApproved) {
      throw new Error("Template Key must be ZOOM_RECORDING_APPROVED");
    }
    if (sourceTable !== CONFIG.values.sourceZoomAttendance) {
      throw new Error(`Source Table must be ${CONFIG.values.sourceZoomAttendance}`);
    }
    return;
  }
  throw new Error(`Unknown Email Handoff Queue Event Type: ${eventType || "blank"}`);
}

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  let queueTable;
  let recordId = "";
  let ingressSecret = "";
  const context = {
    queueRecordId: "",
    handoffKey: "",
    hubEventId: "",
    attemptCount: 0,
    hubResponseJson: "",
  };

  try {
    step("1 - Validate inputs");
    const cfg = input.config();
    recordId = requireRecordId(cfg.recordId, "Email Handoff Queue");
    ingressSecret = String(cfg.ingressSecret || "").trim();
    if (!ingressSecret) throw new Error("Missing required input: ingressSecret");
    context.queueRecordId = recordId;

    step("2 - Load table and validate schema");
    queueTable = base.getTable(CONFIG.tables.queue);
    requireField(queueTable, CONFIG.fields.status, ["singleSelect"]);
    requireField(queueTable, CONFIG.fields.eventType, ["singleSelect"]);
    requireField(queueTable, CONFIG.fields.testMode, ["checkbox"]);
    for (const fieldName of [
      CONFIG.fields.handoffKey,
      CONFIG.fields.sourceTable,
      CONFIG.fields.sourceRecordId,
      CONFIG.fields.recipientsJson,
      CONFIG.fields.templateKey,
      CONFIG.fields.payloadJson,
      CONFIG.fields.enrollmentRecordId,
      CONFIG.fields.programInstanceRecordId,
    ]) {
      requireField(queueTable, fieldName, ["singleLineText", "multilineText", "richText"]);
    }
    requireField(queueTable, CONFIG.fields.attemptCount, ["number"]);
    requireField(queueTable, CONFIG.fields.lastAttemptAt, ["date", "dateTime"]);
    requireField(queueTable, CONFIG.fields.acceptedAt, ["date", "dateTime"]);
    for (const fieldName of [
      CONFIG.fields.attemptCount,
      CONFIG.fields.lastAttemptAt,
      CONFIG.fields.lastError,
      CONFIG.fields.hubEventId,
      CONFIG.fields.hubResponseJson,
      CONFIG.fields.acceptedAt,
    ]) {
      requireWritableField(
        queueTable,
        fieldName,
        fieldName === CONFIG.fields.attemptCount
          ? ["number"]
          : fieldName === CONFIG.fields.lastAttemptAt || fieldName === CONFIG.fields.acceptedAt
            ? ["date", "dateTime"]
            : ["singleLineText", "multilineText", "richText"]
      );
    }
    for (const status of [
      CONFIG.values.statusReady,
      CONFIG.values.statusSending,
      CONFIG.values.statusAccepted,
      CONFIG.values.statusFailed,
      CONFIG.values.statusNeedsReview,
    ]) {
      requireSingleSelectValue(queueTable, CONFIG.fields.status, status);
    }
    for (const eventType of [
      CONFIG.values.eventWelcome,
      CONFIG.values.eventDailySubmission,
      CONFIG.values.eventVideoFeedback,
      CONFIG.values.eventHomeworkFeedback,
      CONFIG.values.eventWeeklyAthleteSummary,
      CONFIG.values.eventZoomRecordingApproval,
    ]) {
      requireSingleSelectValue(queueTable, CONFIG.fields.eventType, eventType);
    }

    step("3 - Load queue record");
    const row = await queueTable.selectRecordAsync(recordId);
    if (!row) throw new Error(`Email Handoff Queue record not found: ${recordId}`);
    const status = getText(row, CONFIG.fields.status);
    if (normalizeText(status) !== normalizeText(CONFIG.values.statusReady)) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_not_ready");
      setOutputSafe("errorOut", "");
      log("079 result", { queueRecordId: recordId, statusOut: "skipped", actionOut: "skipped_not_ready" });
      return;
    }

    step("4 - Validate queue contract");
    context.handoffKey = getText(row, CONFIG.fields.handoffKey);
    const eventType = getText(row, CONFIG.fields.eventType);
    const templateKey = getText(row, CONFIG.fields.templateKey);
    const sourceTable = getText(row, CONFIG.fields.sourceTable);
    const sourceRecordId = requireRecordId(getText(row, CONFIG.fields.sourceRecordId), "source");
    validateHandoff(eventType, templateKey, context.handoffKey, sourceTable, sourceRecordId);
    const enrollmentRecordId = requireRecordId(getText(row, CONFIG.fields.enrollmentRecordId), "Enrollment");
    const programInstanceRecordId = requireRecordId(
      getText(row, CONFIG.fields.programInstanceRecordId),
      "Program Instance"
    );
    const recipients =
      eventType === CONFIG.values.eventWelcome
        ? parseWelcomeRecipients(getText(row, CONFIG.fields.recipientsJson))
        : parseDailyRecipients(getText(row, CONFIG.fields.recipientsJson));
    // Non-WELCOME event types share the flexible recipient object shape.
    const payload = parsePayload(getText(row, CONFIG.fields.payloadJson), eventType);
    const testMode = getBoolean(row, CONFIG.fields.testMode);
    context.attemptCount = getNumber(row, CONFIG.fields.attemptCount) + 1;

    step("5 - Mark Sending");
    await queueTable.updateRecordAsync(recordId, {
      [CONFIG.fields.attemptCount]: context.attemptCount,
      [CONFIG.fields.status]: buildStatusValue(queueTable, CONFIG.values.statusSending),
      [CONFIG.fields.lastAttemptAt]: new Date().toISOString(),
      [CONFIG.fields.lastError]: "",
    });

    step("6 - Send Communications Hub event");
    const requestPayload = {
      schemaVersion: CONFIG.values.schemaVersion,
      sourceSystem: CONFIG.values.sourceSystem,
      eventType,
      templateKey,
      handoffKey: context.handoffKey,
      source: { table: sourceTable, recordId: sourceRecordId },
      enrollmentRecordId,
      programInstanceRecordId,
      recipients,
      data: payload,
      testMode,
    };
    const response = await postJson(CONFIG.communicationsHub.ingestUrl, ingressSecret, requestPayload);
    const responseText = await response.text();
    const safeResponseText = sanitizeText(responseText, ingressSecret);
    if (!response.ok) {
      throw new Error(`Communications Hub ingress failed with HTTP ${response.status}: ${safeResponseText}`);
    }
    const responseBody = parseJson(responseText, "Communications Hub response");
    if (responseBody?.accepted !== true || !String(responseBody?.eventId || "").trim()) {
      throw new Error("Communications Hub response must contain accepted=true and eventId");
    }
    context.hubEventId = String(responseBody.eventId).trim();
    context.hubResponseJson = sanitizeJson(responseBody, ingressSecret);
    const acceptedDuplicate =
      responseBody.duplicate === true ||
      responseBody.acceptedDuplicate === true ||
      normalizeText(responseBody.result) === "duplicate";
    const actionOut = acceptedDuplicate ? "accepted_duplicate" : "accepted_new";

    step("7 - Mark Accepted");
    await queueTable.updateRecordAsync(recordId, {
      [CONFIG.fields.status]: buildStatusValue(queueTable, CONFIG.values.statusAccepted),
      [CONFIG.fields.hubEventId]: context.hubEventId,
      [CONFIG.fields.hubResponseJson]: context.hubResponseJson,
      [CONFIG.fields.acceptedAt]: new Date().toISOString(),
      [CONFIG.fields.lastError]: "",
    });
    setQueueOutputs(context);
    setOutputSafe("statusOut", "accepted");
    setOutputSafe("actionOut", actionOut);
    setOutputSafe("errorOut", "");
    setOutputSafe("debugStep", debugStep);
    log("079 result", {
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      queueRecordId: recordId,
      handoffKey: context.handoffKey,
      hubEventId: context.hubEventId,
      attemptCount: context.attemptCount,
      statusOut: "accepted",
      actionOut,
    });
  } catch (error) {
    const message = sanitizeText(error instanceof Error ? error.message : String(error), ingressSecret);
    if (queueTable && recordId && context.attemptCount > 0) {
      try {
        const failureStatus =
          context.attemptCount >= CONFIG.values.maxAttemptsBeforeReview
            ? CONFIG.values.statusNeedsReview
            : CONFIG.values.statusFailed;
        await queueTable.updateRecordAsync(recordId, {
          [CONFIG.fields.status]: buildStatusValue(queueTable, failureStatus),
          [CONFIG.fields.lastError]: message,
        });
      } catch (writebackError) {
        log("079 failure writeback failed", {
          queueRecordId: recordId,
          error: sanitizeText(writebackError.message, ingressSecret),
        });
      }
    }
    setQueueOutputs(context);
    setOutputSafe("statusOut", "error");
    setOutputSafe("actionOut", "error");
    setOutputSafe("errorOut", message);
    setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);
    log("079 result", {
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      queueRecordId: recordId,
      handoffKey: context.handoffKey,
      attemptCount: context.attemptCount,
      statusOut: "error",
      errorOut: message,
    });
    throw error;
  }
}

/* =========================================================
   SECTION 5: RUN
========================================================= */

try {
  await main();
} catch (error) {
  throw error;
}

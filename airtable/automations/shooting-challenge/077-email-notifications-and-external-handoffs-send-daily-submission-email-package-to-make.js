/*
Automation: 077 - Email, Notifications, and External Handoffs - Send Daily Submission Email Package to Make
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: 2026-06-20

Purpose:
To be confirmed from production script.

Trigger:
To be confirmed from Airtable automation.

Important Tables:
To be confirmed from production script.

Important Fields:
To be confirmed from production script.

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/

/************************************************************
 * 077 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Send Daily Submission Email Package to Make
 *
 * Version: v5.0
 * Date Written: 2026-05-29
 *
 * PURPOSE
 * - Runs from one Submissions record.
 * - Reads the daily email package created by Automation 076.
 * - Sends a clean, clearly labeled payload to Make.com.
 * - Uses only dailySubmission_* payload fields to avoid old Make.com mapping confusion.
 * - Supports TEST and LIVE modes.
 * - TEST mode sends only to dailySubmission_testRecipientEmail.
 * - LIVE mode sends to dailySubmission_liveRecipientsCsv.
 * - Sends dailySubmission_finalRecipientsCsv so Make.com can map one To field for both TEST and LIVE.
 * - Updates only the Make.com handoff fields after successful webhook handoff.
 * - Does NOT mark Daily Email Status as Sent.
 * - Does NOT write Daily Email Sent At.
 * - Make.com owns final Gmail-success writeback after the Gmail module succeeds.
 *
 * IMPORTANT WRITEBACK RULE
 * - 077 confirms handoff to Make.com only.
 * - Make.com confirms final Gmail delivery.
 *
 * 077 WRITES AFTER SUCCESSFUL WEBHOOK HANDOFF
 * - Send Daily Email to Make Now? = unchecked
 * - Daily Email Sent to Make.com Status = Sent to Make.com
 * - Daily Email Sent to Make.com At = current timestamp
 * - Daily Email Error = cleared, if field exists
 *
 * MAKE.COM SHOULD WRITE AFTER GMAIL SUCCESS
 * - Daily Email Status = Sent
 * - Daily Email Sent At = now
 * - Daily Email Error = blank
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 077 - Email, Notifications, and External Handoffs - Send Daily Submission Email Package to Make
 *
 * TRIGGER TABLE
 * - Submissions
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Send Daily Email to Make Now? is checked
 * - Daily Email Status is Ready
 * - Daily Email Sent to Make.com Status is Ready
 * - Daily Email To is not empty
 * - Daily Email Subject is not empty
 * - Daily Email HTML is not empty
 * - Daily Email Sent to Make.com At is empty
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Submissions record
 * - webhookUrl = Make.com webhook URL
 * - sendMode = TEST or LIVE
 *
 * OPTIONAL INPUT VARIABLES
 * - testRecipientEmail = test recipient used when sendMode = TEST
 *
 * PRIMARY TABLES USED
 * - Submissions
 *
 * MAKE.COM CLEAN PAYLOAD FIELDS
 * - dailySubmission_recordId
 * - dailySubmission_sendMode
 * - dailySubmission_liveRecipientsCsv
 * - dailySubmission_testRecipientEmail
 * - dailySubmission_finalRecipientsCsv
 * - dailySubmission_bccCsv
 * - dailySubmission_replyTo
 * - dailySubmission_subject
 * - dailySubmission_html
 * - dailySubmission_emailVersion
 * - dailySubmission_source
 * - dailySubmission_sentFromAirtableAt
 *
 * IMPORTANT NOTES
 * - This script does not directly send Gmail.
 * - This script only posts the prepared daily email package to Make.com.
 * - Make.com sends the actual Gmail message.
 * - Do not use old Make fields such as submissionRecordId, to, subjectOut, htmlOut, or recipientsCsv.
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: EASY-EDIT CONFIG
========================================================= */

const CONFIG = {
  scriptName: "077 - Email, Notifications, and External Handoffs - Send Daily Submission Email Package to Make",
  version: "v5.0",

  tables: {
    submissions: "Submissions",
  },

  fields: {
    sendNow: "Send Daily Email to Make Now?",

    dailyEmailTo: "Daily Email To",
    dailyEmailSubject: "Daily Email Subject",
    dailyEmailHtml: "Daily Email HTML",
    dailyEmailVersion: "Daily Email Version",

    dailyEmailStatus: "Daily Email Status",
    dailyEmailSentAt: "Daily Email Sent At",

    makeStatus: "Daily Email Sent to Make.com Status",
    makeSentAt: "Daily Email Sent to Make.com At",

    optionalError: "Daily Email Error",
  },

  statuses: {
    ready: "Ready",
    sent: "Sent",
    sentToMake: "Sent to Make.com",
    error: "Error",
  },

  sendModes: {
    test: "TEST",
    live: "LIVE",
  },

  defaults: {
    adminBcc: "mschmidt@fairfield.k12.mt.us",
    replyTo: "mschmidt@fairfield.k12.mt.us",
    defaultTestRecipient: "mschmidt@fairfield.k12.mt.us",
  },
};

/* =========================================================
   SECTION 2: TABLE REFERENCES
========================================================= */

const submissionsTable = base.getTable(CONFIG.tables.submissions);

/* =========================================================
   SECTION 3: HELPER FUNCTIONS
========================================================= */

function fieldExists(table, fieldName) {
  if (!table || !fieldName) return false;

  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function requireField(table, fieldName) {
  if (!fieldExists(table, fieldName)) {
    throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
  }
}

function getRaw(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getCheckbox(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (raw === true) return true;
  if (raw === false) return false;

  const text = String(raw ?? "").trim().toLowerCase();
  return ["true", "yes", "checked", "1"].includes(text);
}

function cleanCsvEmails(value) {
  const emails = String(value || "")
    .split(/[,\n;]+/)
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(emails)].join(",");
}

function normalizeSendMode(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (["live", "l", "real", "send", "parent"].includes(raw)) {
    return CONFIG.sendModes.live;
  }

  if (["test", "t", "preview", "practice", "draft"].includes(raw)) {
    return CONFIG.sendModes.test;
  }

  return "";
}

function buildSingleSelectValue(table, fieldName, optionName) {
  if (!fieldExists(table, fieldName)) return optionName;

  const field = table.getField(fieldName);

  if (field.type !== "singleSelect") {
    return optionName;
  }

  const choices = field?.options?.choices || [];

  const match = choices.find(choice =>
    String(choice?.name || "").trim().toLowerCase() ===
    String(optionName || "").trim().toLowerCase()
  );

  if (!match) {
    throw new Error(`Missing single-select option "${optionName}" in ${table.name}.${fieldName}`);
  }

  return { id: match.id };
}

function addIfFieldExists(payload, table, fieldName, value) {
  if (!fieldExists(table, fieldName)) return;
  if (value === undefined || value === null) return;

  payload[fieldName] = value;
}

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore output mapping errors.
  }
}

async function writeSubmissionUpdates(recordId, fields) {
  const safeFields = {};

  for (const [fieldName, value] of Object.entries(fields)) {
    if (fieldExists(submissionsTable, fieldName)) {
      safeFields[fieldName] = value;
    }
  }

  if (Object.keys(safeFields).length) {
    await submissionsTable.updateRecordAsync(recordId, safeFields);
  }
}

async function writeErrorStatus(recordId, message) {
  const updateFields = {};

  /*
   * Do not change Daily Email Status here.
   * Daily Email Status represents final Gmail delivery and should be owned by Make.com.
   */

  if (fieldExists(submissionsTable, CONFIG.fields.sendNow)) {
    updateFields[CONFIG.fields.sendNow] = false;
  }

  if (fieldExists(submissionsTable, CONFIG.fields.makeStatus)) {
    updateFields[CONFIG.fields.makeStatus] = buildSingleSelectValue(
      submissionsTable,
      CONFIG.fields.makeStatus,
      CONFIG.statuses.error
    );
  }

  addIfFieldExists(
    updateFields,
    submissionsTable,
    CONFIG.fields.optionalError,
    message
  );

  await writeSubmissionUpdates(recordId, updateFields);

  setOutputSafe("errorOut", message);
}

function validateRequiredFields() {
  requireField(submissionsTable, CONFIG.fields.sendNow);
  requireField(submissionsTable, CONFIG.fields.dailyEmailTo);
  requireField(submissionsTable, CONFIG.fields.dailyEmailSubject);
  requireField(submissionsTable, CONFIG.fields.dailyEmailHtml);
  requireField(submissionsTable, CONFIG.fields.dailyEmailVersion);
  requireField(submissionsTable, CONFIG.fields.dailyEmailStatus);
  requireField(submissionsTable, CONFIG.fields.makeStatus);
  requireField(submissionsTable, CONFIG.fields.makeSentAt);
}

async function postJson(url, payload) {
  const request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };

  if (typeof remoteFetchAsync === "function") {
    return await remoteFetchAsync(url, request);
  }

  if (typeof fetch === "function") {
    return await fetch(url, request);
  }

  throw new Error("No supported HTTP method is available in this Airtable automation environment.");
}

/* =========================================================
   SECTION 4: WEBHOOK PAYLOAD
========================================================= */

function buildCleanWebhookPayload({
  recordId,
  sendMode,
  liveRecipientsCsv,
  testRecipientEmail,
  subject,
  html,
  emailVersion,
}) {
  const cleanLiveRecipientsCsv = cleanCsvEmails(liveRecipientsCsv);
  const cleanTestRecipientEmail = cleanCsvEmails(testRecipientEmail);

  if (!cleanLiveRecipientsCsv) {
    throw new Error("Daily Email To is blank. No LIVE recipient list is available.");
  }

  if (sendMode === CONFIG.sendModes.test && !cleanTestRecipientEmail) {
    throw new Error("TEST mode requires testRecipientEmail.");
  }

  const finalRecipientsCsv = sendMode === CONFIG.sendModes.test
    ? cleanTestRecipientEmail
    : cleanLiveRecipientsCsv;

  const bccCsv = sendMode === CONFIG.sendModes.live
    ? cleanCsvEmails(CONFIG.defaults.adminBcc)
    : "";

  if (!finalRecipientsCsv) {
    throw new Error(`No final recipient resolved for sendMode=${sendMode}.`);
  }

  return {
    dailySubmission_recordId: recordId,
    dailySubmission_sendMode: sendMode,

    dailySubmission_liveRecipientsCsv: cleanLiveRecipientsCsv,
    dailySubmission_testRecipientEmail: cleanTestRecipientEmail,
    dailySubmission_finalRecipientsCsv: finalRecipientsCsv,

    dailySubmission_bccCsv: bccCsv,
    dailySubmission_replyTo: CONFIG.defaults.replyTo,

    dailySubmission_subject: subject,
    dailySubmission_html: html,
    dailySubmission_emailVersion: emailVersion,

    dailySubmission_source: "Airtable Automation 077",
    dailySubmission_automationName: CONFIG.scriptName,
    dailySubmission_scriptVersion: CONFIG.version,
    dailySubmission_sentFromAirtableAt: new Date().toISOString(),
  };
}

async function postToMake(webhookUrl, payload) {
  const response = await postJson(webhookUrl, payload);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Make webhook failed. HTTP ${response.status}. Response: ${responseText || "(empty response)"}`
    );
  }

  return {
    status: response.status,
    responseText,
  };
}

/* =========================================================
   SECTION 5: MAIN
========================================================= */

async function main() {
  const cfg = input.config();

  const recordId = String(cfg.recordId || "").trim();
  const webhookUrl = String(cfg.webhookUrl || "").trim();
  const sendMode = normalizeSendMode(cfg.sendMode || CONFIG.sendModes.test);
  const testRecipientEmail = String(
    cfg.testRecipientEmail || CONFIG.defaults.defaultTestRecipient
  ).trim();

  if (!recordId) {
    throw new Error("Missing required input: recordId");
  }

  if (!webhookUrl) {
    throw new Error("Missing required input: webhookUrl");
  }

  if (!sendMode) {
    throw new Error(`Invalid sendMode: "${cfg.sendMode}". Use TEST or LIVE. Capitalization does not matter.`);
  }

  if (sendMode === CONFIG.sendModes.test && !testRecipientEmail) {
    throw new Error("Missing required input: testRecipientEmail for TEST mode");
  }

  try {
    validateRequiredFields();

    const submissionRecord = await submissionsTable.selectRecordAsync(recordId);

    if (!submissionRecord) {
      throw new Error(`Submission record not found: ${recordId}`);
    }

    const sendNow = getCheckbox(
      submissionRecord,
      submissionsTable,
      CONFIG.fields.sendNow
    );

    if (!sendNow) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("recordId", recordId);
      setOutputSafe("errorOut", "Send Daily Email to Make Now? is not checked.");
      return;
    }

    const dailyEmailStatus = getText(
      submissionRecord,
      submissionsTable,
      CONFIG.fields.dailyEmailStatus
    );

    const makeStatus = getText(
      submissionRecord,
      submissionsTable,
      CONFIG.fields.makeStatus
    );

    const makeSentAt = getText(
      submissionRecord,
      submissionsTable,
      CONFIG.fields.makeSentAt
    );

    if (dailyEmailStatus !== CONFIG.statuses.ready) {
      throw new Error(`Daily Email Status must be Ready. Current value: ${dailyEmailStatus || "(blank)"}`);
    }

    if (makeStatus !== CONFIG.statuses.ready) {
      throw new Error(`Daily Email Sent to Make.com Status must be Ready. Current value: ${makeStatus || "(blank)"}`);
    }

    if (makeSentAt) {
      throw new Error(`Daily Email Sent to Make.com At is already filled. Duplicate handoff blocked.`);
    }

    const liveRecipientsCsv = cleanCsvEmails(
      getText(submissionRecord, submissionsTable, CONFIG.fields.dailyEmailTo)
    );

    const subject = getText(
      submissionRecord,
      submissionsTable,
      CONFIG.fields.dailyEmailSubject
    );

    const html = getText(
      submissionRecord,
      submissionsTable,
      CONFIG.fields.dailyEmailHtml
    );

    const emailVersion = getText(
      submissionRecord,
      submissionsTable,
      CONFIG.fields.dailyEmailVersion
    ) || "v2";

    if (!liveRecipientsCsv) {
      throw new Error("Daily Email To is blank.");
    }

    if (!subject) {
      throw new Error("Daily Email Subject is blank.");
    }

    if (!html) {
      throw new Error("Daily Email HTML is blank.");
    }

    const payload = buildCleanWebhookPayload({
      recordId,
      sendMode,
      liveRecipientsCsv,
      testRecipientEmail,
      subject,
      html,
      emailVersion,
    });

    const makeResponse = await postToMake(webhookUrl, payload);

    const nowIso = new Date().toISOString();

    const updateFields = {};

    /*
     * 077 writes only Make.com handoff fields.
     * Daily Email Status and Daily Email Sent At are owned by Make.com after Gmail succeeds.
     */

    updateFields[CONFIG.fields.sendNow] = false;

    updateFields[CONFIG.fields.makeStatus] = buildSingleSelectValue(
      submissionsTable,
      CONFIG.fields.makeStatus,
      CONFIG.statuses.sentToMake
    );

    updateFields[CONFIG.fields.makeSentAt] = nowIso;

    addIfFieldExists(
      updateFields,
      submissionsTable,
      CONFIG.fields.optionalError,
      ""
    );

    await writeSubmissionUpdates(recordId, updateFields);

    setOutputSafe("statusOut", "success");
    setOutputSafe("recordId", recordId);
    setOutputSafe("sendMode", sendMode);
    setOutputSafe("emailVersion", emailVersion);

    setOutputSafe("dailySubmission_recordId", payload.dailySubmission_recordId);
    setOutputSafe("dailySubmission_sendMode", payload.dailySubmission_sendMode);
    setOutputSafe("dailySubmission_liveRecipientsCsv", payload.dailySubmission_liveRecipientsCsv);
    setOutputSafe("dailySubmission_testRecipientEmail", payload.dailySubmission_testRecipientEmail);
    setOutputSafe("dailySubmission_finalRecipientsCsv", payload.dailySubmission_finalRecipientsCsv);
    setOutputSafe("dailySubmission_bccCsv", payload.dailySubmission_bccCsv);
    setOutputSafe("dailySubmission_replyTo", payload.dailySubmission_replyTo);
    setOutputSafe("dailySubmission_subject", payload.dailySubmission_subject);
    setOutputSafe("dailySubmission_html", payload.dailySubmission_html);

    setOutputSafe("makeStatusCode", makeResponse.status);
    setOutputSafe("makeResponseText", makeResponse.responseText);
    setOutputSafe("errorOut", "");

    console.log(JSON.stringify({
      automation: CONFIG.scriptName,
      version: CONFIG.version,
      statusOut: "success",
      recordId,
      sendMode,
      emailVersion,
      cleanPayloadFields: Object.keys(payload),
      dailySubmission_finalRecipientsCsv: payload.dailySubmission_finalRecipientsCsv,
      dailySubmission_bccCsv: payload.dailySubmission_bccCsv,
      dailySubmission_subject: payload.dailySubmission_subject,
      makeStatusCode: makeResponse.status,
      makeResponseText: makeResponse.responseText,
      dailyEmailStatusWriteback: "Not updated by 077. Make.com updates after Gmail succeeds.",
    }, null, 2));

  } catch (error) {
    const message = String(error.message || error);

    await writeErrorStatus(recordId, message);

    setOutputSafe("statusOut", "error");
    setOutputSafe("recordId", recordId);
    setOutputSafe("sendMode", sendMode);
    setOutputSafe("errorOut", message);

    throw error;
  }
}

/* =========================================================
   SECTION 6: RUN
========================================================= */

await main();

/*
Automation: 074 - Email, Notifications, and External Handoffs - Send Weekly Summary Email Package to Make
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
 * 074 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Send Weekly Summary Email Package to Make
 *
 * Version: v2.0
 * Date Written: 2026-05-29
 *
 * PURPOSE
 * - Runs from one Weekly Athlete Summary record.
 * - Reads the prepared weekly email package built by 072.
 * - Sends the package to Make.com.
 * - Clears handoff trigger/status fields after successful webhook handoff.
 *
 * IMPORTANT WRITEBACK RULE
 * - This script does NOT check Weekly Email Sent?.
 * - This script does NOT write Weekly Email Sent At.
 * - Make.com owns final Gmail-success writeback after the Gmail module succeeds.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 074 - Email, Notifications, and External Handoffs - Send Weekly Summary Email Package to Make
 *
 * TRIGGER TABLE
 * - Weekly Athlete Summary
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Weekly Email Ready? is checked
 * - Weekly Email Sent? is unchecked
 * - Send to Make? is checked
 * - Weekly Email Subject is not empty
 * - Weekly Email Recipients is not empty
 * - Weekly Email HTML is not empty
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from triggering Weekly Athlete Summary record
 * - makeWebhookUrl = Make.com webhook URL
 *
 * OPTIONAL INPUT VARIABLES
 * - sendModeInput = Test or Live
 * - testRecipientEmail = test recipient email address
 * - replyTo = reply-to email address
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: CONSTANTS / EASY-EDIT VARIABLES
   ========================================================= */

const TABLE_WEEKLY_SUMMARY = "Weekly Athlete Summary";

const FIELD_ENROLLMENT = "Enrollment";
const FIELD_WEEK = "Week";

const FIELD_EMAIL_READY = "Weekly Email Ready?";
const FIELD_EMAIL_SENT = "Weekly Email Sent?";
const FIELD_SEND_TO_MAKE = "Send to Make?";

const FIELD_EMAIL_SUBJECT = "Weekly Email Subject";
const FIELD_EMAIL_RECIPIENTS = "Weekly Email Recipients";
const FIELD_EMAIL_HTML = "Weekly Email HTML";
const FIELD_EMAIL_TEXT = "Weekly Email Text";
const FIELD_EMAIL_PAYLOAD_JSON = "Weekly Email Payload JSON";
const FIELD_EMAIL_WEEK_LABEL = "Weekly Email Week Label";
const FIELD_EMAIL_ERROR = "Weekly Email Error";
const FIELD_EMAIL_SENT_AT = "Weekly Email Sent At";

const FIELD_SEND_MODE = "sendMode";

const DEFAULT_REPLY_TO = "mschmidt@fairfield.k12.mt.us";

const SEND_TYPE = "weekly_summary";
const SEND_TAG = "WEEKLY_SUMMARY_PARENT";

/* =========================================================
   SECTION 2: INPUTS
   ========================================================= */

const cfg = input.config();

const recordId = String(cfg.recordId || "").trim();
const makeWebhookUrl = String(cfg.makeWebhookUrl || "").trim();

/*
 * Preferred input variable:
 * - sendMode
 *
 * Legacy supported input variable:
 * - sendModeInput
 */
const sendModeInput = String(cfg.sendMode || cfg.sendModeInput || "").trim();

const testRecipientEmail = String(cfg.testRecipientEmail || "").trim();
const replyTo = String(cfg.replyTo || DEFAULT_REPLY_TO).trim();

if (!recordId) {
    throw new Error("Missing required input: recordId");
}

if (!makeWebhookUrl) {
    throw new Error("Missing required input: makeWebhookUrl");
}

/* =========================================================
   SECTION 3: TABLES
   ========================================================= */

const weeklySummaryTable = base.getTable(TABLE_WEEKLY_SUMMARY);

/* =========================================================
   SECTION 4: HELPERS
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

function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return "";
    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getCheckboxValue(record, table, fieldName) {
    return getRaw(record, table, fieldName) === true;
}

function getLinkedIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);
    if (!Array.isArray(raw)) return [];
    return raw.map(item => item?.id).filter(Boolean);
}

function firstNonBlank(...values) {
    for (const value of values) {
        const text = String(value ?? "").trim();
        if (text) return text;
    }

    return "";
}

function cleanCsvEmails(value) {
    const items = String(value || "")
        .split(/[,\n;]+/)
        .map(v => v.trim())
        .filter(Boolean);

    return [...new Set(items)].join(",");
}

function normalizeSendMode(value) {
    const raw = String(value || "").trim().toLowerCase();

    if (["live", "l", "real", "send", "parent"].includes(raw)) {
        return "live";
    }

    if (["test", "t", "preview", "practice", "draft"].includes(raw)) {
        return "test";
    }

    return "";
}

function safeJsonParse(value) {
    const text = String(value || "").trim();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

async function postJson(url, payload) {
    const request = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    };

    if (typeof fetch === "function") {
        return await fetch(url, request);
    }

    if (typeof remoteFetchAsync === "function") {
        return await remoteFetchAsync(url, request);
    }

    throw new Error("No supported HTTP method is available in this Airtable automation environment.");
}

/* =========================================================
   SECTION 5: LOAD RECORD
   ========================================================= */

const weeklySummaryRecord = await weeklySummaryTable.selectRecordAsync(recordId);

if (!weeklySummaryRecord) {
    throw new Error(`Weekly Athlete Summary record not found: ${recordId}`);
}

/* =========================================================
   SECTION 6: READ RECORD VALUES
   ========================================================= */

const weeklyEmailReady = getCheckboxValue(
    weeklySummaryRecord,
    weeklySummaryTable,
    FIELD_EMAIL_READY
);

const weeklyEmailSent = getCheckboxValue(
    weeklySummaryRecord,
    weeklySummaryTable,
    FIELD_EMAIL_SENT
);

const sendToMake = getCheckboxValue(
    weeklySummaryRecord,
    weeklySummaryTable,
    FIELD_SEND_TO_MAKE
);

const enrollmentIds = getLinkedIds(
    weeklySummaryRecord,
    weeklySummaryTable,
    FIELD_ENROLLMENT
);

const weekIds = getLinkedIds(
    weeklySummaryRecord,
    weeklySummaryTable,
    FIELD_WEEK
);

const subjectOut = getText(
    weeklySummaryRecord,
    weeklySummaryTable,
    FIELD_EMAIL_SUBJECT
);

const recipientsCsv = cleanCsvEmails(
    getText(weeklySummaryRecord, weeklySummaryTable, FIELD_EMAIL_RECIPIENTS)
);

const htmlOut = getText(
    weeklySummaryRecord,
    weeklySummaryTable,
    FIELD_EMAIL_HTML
);

const textOut = getText(
    weeklySummaryRecord,
    weeklySummaryTable,
    FIELD_EMAIL_TEXT
);

const weekLabel = getText(
    weeklySummaryRecord,
    weeklySummaryTable,
    FIELD_EMAIL_WEEK_LABEL
);

const payloadJsonText = getText(
    weeklySummaryRecord,
    weeklySummaryTable,
    FIELD_EMAIL_PAYLOAD_JSON
);

const payloadJson = safeJsonParse(payloadJsonText);

const sendModeFromRecord = fieldExists(weeklySummaryTable, FIELD_SEND_MODE)
    ? getText(weeklySummaryRecord, weeklySummaryTable, FIELD_SEND_MODE)
    : "";

const sendMode = firstNonBlank(
    normalizeSendMode(sendModeInput),
    normalizeSendMode(sendModeFromRecord),
    normalizeSendMode(payloadJson?.sendMode),
    "test"
);

/* =========================================================
   SECTION 7: VALIDATION
   ========================================================= */

if (!weeklyEmailReady) {
    throw new Error("Weekly Email Ready? is not checked. Handoff stopped.");
}

if (weeklyEmailSent) {
    throw new Error("Weekly Email Sent? is already checked. Duplicate send blocked.");
}

if (!sendToMake) {
    throw new Error("Send to Make? is not checked. Handoff stopped.");
}

if (!enrollmentIds.length) {
    throw new Error("Weekly Athlete Summary is missing Enrollment.");
}

if (!weekIds.length) {
    throw new Error("Weekly Athlete Summary is missing Week.");
}

if (!subjectOut) {
    throw new Error("Weekly Email Subject is blank.");
}

if (!recipientsCsv) {
    throw new Error("Weekly Email Recipients is blank.");
}

if (!htmlOut) {
    throw new Error("Weekly Email HTML is blank.");
}

if (!["test", "live"].includes(sendMode)) {
    throw new Error(`Invalid send mode after normalization: ${sendMode}`);
}

if (sendMode === "test" && !testRecipientEmail) {
    throw new Error("Missing testRecipientEmail for test mode.");
}

/* =========================================================
   SECTION 8: BUILD MAKE PAYLOAD
   ========================================================= */

const payload = {
    recordId,
    weeklySummaryRecordId: recordId,
    weeklyEmailRecordId: recordId,

    sourceTable: TABLE_WEEKLY_SUMMARY,
    sendType: SEND_TYPE,
    sendTag: SEND_TAG,
    sendMode,

    enrollmentId: enrollmentIds[0] || "",
    weekId: weekIds[0] || "",
    weekLabel,

    /*
     * Current standardized field names
     */
    subjectOut,
    htmlOut,
    textOut,
    recipientsCsv,

    /*
     * Legacy Make.com field-name aliases
     * Keep these so the existing Weekly Athlete Summary Make scenario still works.
     */
    subject: subjectOut,
    html: htmlOut,
    text: textOut,
    csvemail: recipientsCsv,
    payloadJson: payloadJsonText || "",

    toEmail: sendMode === "test" ? testRecipientEmail : recipientsCsv,
    liveRecipientEmail: recipientsCsv,
    testRecipientEmail,
    replyTo,

    preparedPayload: payloadJson || {},
    parsedPayload: payloadJson || {},
    rawPreparedPayloadJson: payloadJsonText || "",

    revision: payloadJson?.revision || "",
    handoffBuiltAt: new Date().toISOString(),
};




/* =========================================================
   SECTION 9: SEND TO MAKE
   ========================================================= */

let response;
let responseText = "";

try {
    response = await postJson(makeWebhookUrl, payload);
    responseText = await response.text();

    if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}: ${responseText}`);
    }
} catch (error) {
    const errorUpdates = {};

    if (fieldExists(weeklySummaryTable, FIELD_EMAIL_ERROR)) {
        errorUpdates[FIELD_EMAIL_ERROR] = String(error.message || error);
    }

    /*
     * Do not uncheck Send to Make? on webhook failure.
     * Leaving it checked makes the failed handoff visible and retryable.
     */

    if (Object.keys(errorUpdates).length) {
        await weeklySummaryTable.updateRecordAsync(recordId, errorUpdates);
    }

    output.set("ok", false);
    output.set("recordId", recordId);
    output.set("sendType", SEND_TYPE);
    output.set("sendMode", sendMode);
    output.set("subjectOut", subjectOut);
    output.set("recipientsCsv", recipientsCsv);
    output.set("errorOut", String(error.message || error));

    throw error;
}

/* =========================================================
   SECTION 10: SUCCESS WRITEBACK
   ========================================================= */

const successUpdates = {};

/*
IMPORTANT:
- This script only confirms successful handoff to Make.com.
- Make.com owns final Gmail-success writeback.
- Do NOT check Weekly Email Sent? here.
- Do NOT write Weekly Email Sent At here.
*/

if (fieldExists(weeklySummaryTable, FIELD_SEND_TO_MAKE)) {
    successUpdates[FIELD_SEND_TO_MAKE] = false;
}

if (fieldExists(weeklySummaryTable, FIELD_EMAIL_ERROR)) {
    successUpdates[FIELD_EMAIL_ERROR] = "";
}

if (fieldExists(weeklySummaryTable, FIELD_EMAIL_READY)) {
    successUpdates[FIELD_EMAIL_READY] = true;
}

if (fieldExists(weeklySummaryTable, FIELD_EMAIL_SENT)) {
    successUpdates[FIELD_EMAIL_SENT] = false;
}

if (Object.keys(successUpdates).length) {
    await weeklySummaryTable.updateRecordAsync(recordId, successUpdates);
}

/* =========================================================
   SECTION 11: OUTPUTS
   ========================================================= */

output.set("ok", true);
output.set("recordId", recordId);
output.set("weeklySummaryRecordId", recordId);
output.set("sourceTable", TABLE_WEEKLY_SUMMARY);
output.set("sendType", SEND_TYPE);
output.set("sendTag", SEND_TAG);
output.set("sendMode", sendMode);
output.set("subjectOut", subjectOut);
output.set("recipientsCsv", recipientsCsv);
output.set("toEmail", payload.toEmail);
output.set("liveRecipientEmail", recipientsCsv);
output.set("testRecipientEmail", testRecipientEmail);
output.set("replyTo", replyTo);
output.set("htmlOut", htmlOut);
output.set("textOut", textOut);
output.set("weekLabel", weekLabel);
output.set("makeResponse", responseText);
output.set("errorOut", "");

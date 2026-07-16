/*
Automation: 117b - Zoom Recording Credit - Send Approval Email Webhook
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth — READY FOR DEV INSTALL (not live-verified)
Last GitHub Update: 2026-07-15

Purpose:
Queue/send parent Zoom recording approval email ONLY after Satisfactory, when Config enables it.

Trigger:
Homework Completions when Satisfactory and recording XP already awarded (or Send Email Trigger checked).
Confirm exact conditions in Airtable UI.

Notes:
Does not award XP (117a). Does not alter 071 homework feedback email.
*/

/************************************************************
 * 117b - ZOOM RECORDING CREDIT
 * Send Approval Email Webhook (C-025)
 *
 * Version: v1.0
 * Date Written: 2026-07-15
 * Last Updated: 2026-07-15
 *
 * PURPOSE
 * - After coach Satisfactory + Config email enabled, POST a minimal package to Make.
 * - Never send on Needs Review.
 *
 * IMPORTANT DESIGN RULES
 * - Missing Config email enabled flag → do not send (safe fallback).
 * - Webhook failure must not clear send trigger (074 pattern).
 * - Template key from Config `Recording Approval Email Template Key`.
 *
 * THIS IS NOT
 * - XP award (117a) or live attendance (101).
 *
 * FOLDER
 * - 10 - Zoom Attendance and Recording Credit
 *
 * AUTOMATION NAME
 * - 117b - Zoom Recording Credit - Send Approval Email Webhook
 *
 * TRIGGER TABLE
 * - Homework Completions
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Completion Status is Satisfactory
 * - Send Recording Approval Email? is checked (operator/automation flag — confirm field name in DEV)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Homework Completion record ID
 * - makeWebhookUrl = Make webhook URL (secret — Airtable input only)
 *
 * OUTPUTS
 * - statusOut, actionOut, errorOut, debugStep, templateKeyOut
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "117b - Zoom Recording Credit - Send Approval Email Webhook",
  version: "v1.0",
  versionNumber: "v1.0",
  versionDate: "2026-07-15",
  originalWrittenDate: "2026-07-15",
  lastUpdated: "2026-07-15",
  folder: "10 - Zoom Attendance and Recording Credit",
  automationName: "117b - Zoom Recording Credit - Send Approval Email Webhook",
};

const CONFIG = {
  tables: {
    homeworkCompletions: "Homework Completions",
    config: "Config",
    enrollments: "Enrollments",
    zoomMeetings: "Zoom Meetings",
  },
  homework: {
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    completionStatus: "Completion Status",
    satisfactory: "Satisfactory?",
    sendEmailTrigger: "Send Recording Approval Email?",
    emailSent: "Recording Approval Email Sent?",
  },
  configFields: {
    emailEnabled: "Recording Approval Email Enabled?",
    emailTiming: "Recording Approval Email Timing",
    templateKey: "Recording Approval Email Template Key",
  },
};

function setOutputSafe(key, value) {
  try { output.set(key, value); } catch (e) { console.log(`output.set failed ${key}`); }
}

function fieldExists(table, fieldName) {
  return Boolean(table.fields.find((f) => f.name === fieldName));
}

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getCheckbox(record, table, fieldName, fallback = false) {
  if (!fieldExists(table, fieldName)) return fallback;
  const raw = record.getCellValue(fieldName);
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  return fallback;
}

function firstLinkedId(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw) || !raw.length) return "";
  return raw[0].id || "";
}

async function main() {
  let debugStep = "Start";
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("statusOut", "");
  setOutputSafe("actionOut", "");
  setOutputSafe("errorOut", "");
  setOutputSafe("templateKeyOut", "");

  try {
    debugStep = "1 - Inputs";
    setOutputSafe("debugStep", debugStep);
    const inputConfig = input.config();
    const recordId = String(inputConfig.recordId || "").trim();
    const webhookUrl = String(inputConfig.makeWebhookUrl || inputConfig.webhookUrl || "").trim();
    if (!recordId.startsWith("rec")) {
      throw new Error(`Invalid recordId: ${recordId || "(empty)"}`);
    }
    if (!webhookUrl) {
      throw new Error("Missing input makeWebhookUrl");
    }

    const hcTable = base.getTable(CONFIG.tables.homeworkCompletions);
    const configTable = base.getTable(CONFIG.tables.config);
    const completion = await hcTable.selectRecordAsync(recordId);
    if (!completion) throw new Error(`Homework Completion not found: ${recordId}`);

    const status = getText(completion, hcTable, CONFIG.homework.completionStatus);
    const satisfactory = getCheckbox(completion, hcTable, CONFIG.homework.satisfactory, false)
      || status.toLowerCase().includes("satisfactory");
    if (!satisfactory) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_not_satisfactory");
      return;
    }

    if (fieldExists(hcTable, CONFIG.homework.emailSent)
      && getCheckbox(completion, hcTable, CONFIG.homework.emailSent, false)) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_already_sent");
      return;
    }

    debugStep = "2 - Config email gates";
    setOutputSafe("debugStep", debugStep);
    const configQuery = await configTable.selectRecordsAsync({
      fields: Object.values(CONFIG.configFields).filter((n) => fieldExists(configTable, n)),
    });
    const cfg = configQuery.records[0];
    try { configQuery.unloadData(); } catch (e) { /* ignore */ }

    if (!cfg || !fieldExists(configTable, CONFIG.configFields.emailEnabled)) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_config_missing_email_enabled");
      return;
    }
    if (!getCheckbox(cfg, configTable, CONFIG.configFields.emailEnabled, false)) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_email_disabled");
      return;
    }
    const timing = getText(cfg, configTable, CONFIG.configFields.emailTiming) || "On Satisfactory";
    if (timing !== "On Satisfactory") {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_timing_unsupported");
      return;
    }
    const templateKey = getText(cfg, configTable, CONFIG.configFields.templateKey);
    if (!templateKey) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_missing_template_key");
      return;
    }
    setOutputSafe("templateKeyOut", templateKey);

    const enrollmentId = firstLinkedId(completion, hcTable, CONFIG.homework.enrollment);
    const meetingId = firstLinkedId(completion, hcTable, CONFIG.homework.zoomMeeting);

    debugStep = "3 - POST webhook";
    setOutputSafe("debugStep", debugStep);
    const payload = {
      sourceName: "Airtable Zoom Recording Approval",
      automationNumber: "117b",
      templateKey,
      homeworkCompletionRecordId: recordId,
      enrollmentRecordId: enrollmentId,
      zoomMeetingRecordId: meetingId,
    };

    let response;
    try {
      response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (fetchError) {
      // Do not clear send trigger on webhook failure
      setOutputSafe("statusOut", "error");
      setOutputSafe("actionOut", "error_webhook_network");
      setOutputSafe("errorOut", String(fetchError));
      throw fetchError;
    }

    if (!response.ok) {
      const bodyText = await response.text();
      setOutputSafe("statusOut", "error");
      setOutputSafe("actionOut", "error_webhook_http");
      setOutputSafe("errorOut", `HTTP ${response.status}: ${bodyText.slice(0, 500)}`);
      throw new Error(`Webhook failed HTTP ${response.status}`);
    }

    if (fieldExists(hcTable, CONFIG.homework.emailSent)) {
      await hcTable.updateRecordAsync(recordId, {
        [CONFIG.homework.emailSent]: true,
      });
    }
    if (fieldExists(hcTable, CONFIG.homework.sendEmailTrigger)) {
      await hcTable.updateRecordAsync(recordId, {
        [CONFIG.homework.sendEmailTrigger]: false,
      });
    }

    setOutputSafe("statusOut", "success");
    setOutputSafe("actionOut", "sent");
    setOutputSafe("debugStep", "Done");
    console.log(JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "success",
      actionOut: "sent",
      templateKeyOut: templateKey,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setOutputSafe("statusOut", "error");
    setOutputSafe("actionOut", "error");
    setOutputSafe("errorOut", message);
    setOutputSafe("debugStep", debugStep);
    throw error;
  }
}

try {
  await main();
} catch (error) {
  throw error;
}

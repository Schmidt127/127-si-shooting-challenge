/*
Automation: 117 — Zoom — Send Recording Approval Email to Make
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-07-20
Last GitHub Update: 2026-07-20

Purpose:
POSTs a Zoom recording approval email handoff payload to Make (US1 webhook).
Does not write Airtable records; Make owns send/dedupe outcomes.

Trigger:
Zoom Attendance — Recording Quiz path after Satisfactory (configure in Airtable UI).

Important Tables:
(none written) — inputs supply Zoom Attendance / Enrollment / Zoom Meeting RIDs

Important Fields:
(none written) — outputs only: makeStatus, sendKey, zoomAttendanceId

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
Webhook URL is an Airtable input variable only — never hard-code or commit secrets.
*/

/************************************************************
 * 117 — Zoom — Send Recording Approval Email to Make
 *
 * Version: v1.1
 * Date Written: 2026-07-20
 * Last Updated: 2026-07-20
 *
 * PURPOSE
 * - Validate Make US1 webhook URL and Airtable record ID inputs.
 * - Build canonical send key and fixed Zoom recording approval payload.
 * - POST JSON to Make and accept only sent | already_sent as success.
 * - Expose makeStatus, sendKey, and zoomAttendanceId as script outputs.
 *
 * IMPORTANT DESIGN RULES
 * - Payload automationNumber is always "117f" (Make route key).
 * - templateKey is always ZOOM_RECORDING_APPROVED.
 * - timing is always "On Satisfactory".
 * - Send key: ZOOM_REC_EMAIL|{enrollmentRid}|{zoomMeetingRid}|{zoomAttendanceId}
 * - Duplicate-send safety is Make-side (already_sent); this script does not stamp fields.
 * - No Airtable record writes from this script.
 * - Never invent or hard-code webhook URLs, email recipients, or secrets.
 *
 * THIS IS NOT
 * - Automation 117 orchestrator (normalize / XP / gate / perfect-week).
 * - Make Gmail composition or recipient resolution (Make owns that).
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 *
 * AUTOMATION NAME
 * - 117 — Zoom — Send Recording Approval Email to Make
 *
 * TRIGGER TABLE
 * - Zoom Attendance
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Attendance Method is Recording Quiz
 * - Recording Quiz Satisfactory? is checked
 *
 * REQUIRED INPUT VARIABLES
 * - webhookUrl = Make.com custom webhook URL (US1 hook host only)
 * - recordId = Zoom Attendance record ID (used as zoomAttendanceId)
 * - enrollmentRid = Enrollment record ID
 * - zoomMeetingRid = Zoom Meeting record ID
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | error
 * - actionOut = sent | already_sent | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - makeStatus = Make response status (sent | already_sent) on success
 * - sendKey = canonical idempotency key
 * - zoomAttendanceId = same as validated recordId
 *
 * PRIMARY TABLES USED
 * - (none — ID-only handoff)
 *
 * OUTPUT / WRITEBACK FIELDS
 * - none (no record writes)
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA + CONFIG
========================================================= */

const SCRIPT = {
  scriptName: "117 — Zoom — Send Recording Approval Email to Make",
  version: "v1.1",
  versionDate: "2026-07-20",
  originalWrittenDate: "2026-07-20",
  lastUpdated: "2026-07-20",
  folder: "17 - Zoom Recording Credit",
  automationName: "117 — Zoom — Send Recording Approval Email to Make",
};

const CONFIG = {
  makeUs1WebhookHost: "hook.us1.make.com",
  sendKeyPrefix: "ZOOM_REC_EMAIL",
  automationNumber: "117f",
  templateKey: "ZOOM_RECORDING_APPROVED",
  timing: "On Satisfactory",
  successStatuses: ["sent", "already_sent"],
  debug: {
    logToConsole: true,
  },
};

/* =========================================================
   SECTION 2: HELPERS
========================================================= */

let debugStep = "0 - Start";

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore unmapped outputs.
  }
}

function setDebug(step) {
  debugStep = step;
  setOutputSafe("debugStep", debugStep);
}

function log(message, data) {
  if (!CONFIG.debug.logToConsole) return;
  if (data === undefined) {
    console.log(message);
    return;
  }
  try {
    console.log(message, JSON.stringify(data, null, 2));
  } catch {
    console.log(message, data);
  }
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function requireRecId(label, value) {
  const id = normalizeText(value);
  if (!id) {
    throw new Error(`Missing required input: ${label}`);
  }
  if (!id.startsWith("rec")) {
    throw new Error(`Invalid ${label}: must begin with "rec" (received: ${id})`);
  }
  return id;
}

function requireMakeUs1WebhookUrl(value) {
  const urlText = normalizeText(value);
  if (!urlText) {
    throw new Error("Missing required input: webhookUrl");
  }

  let parsed;
  try {
    parsed = new URL(urlText);
  } catch {
    throw new Error("Invalid webhookUrl: not a valid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Invalid webhookUrl: must use https");
  }

  if (parsed.hostname.toLowerCase() !== CONFIG.makeUs1WebhookHost) {
    throw new Error(
      `Invalid webhookUrl: host must be ${CONFIG.makeUs1WebhookHost} (Make US1)`
    );
  }

  if (!parsed.pathname || parsed.pathname === "/") {
    throw new Error("Invalid webhookUrl: missing webhook path");
  }

  return urlText;
}

function buildSendKey(enrollmentRid, zoomMeetingRid, zoomAttendanceId) {
  return `${CONFIG.sendKeyPrefix}|${enrollmentRid}|${zoomMeetingRid}|${zoomAttendanceId}`;
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

async function readResponseBody(response) {
  let rawText = "";
  try {
    rawText = await response.text();
  } catch {
    rawText = "";
  }

  if (!rawText) {
    return { rawText: "", json: null };
  }

  try {
    return { rawText, json: JSON.parse(rawText) };
  } catch {
    return { rawText, json: null, invalidJson: true };
  }
}

function finishError(actionOut, errorOut, extras = {}) {
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", actionOut || "error");
  setOutputSafe("errorOut", errorOut || "");
  setOutputSafe("debugStep", debugStep);
  if (extras.sendKey) setOutputSafe("sendKey", extras.sendKey);
  if (extras.zoomAttendanceId) setOutputSafe("zoomAttendanceId", extras.zoomAttendanceId);
  if (extras.makeStatus) setOutputSafe("makeStatus", extras.makeStatus);

  log("117f Make handoff failed", {
    automation: SCRIPT.scriptName,
    version: SCRIPT.version,
    statusOut: "error",
    actionOut: actionOut || "error",
    errorOut,
    debugStep,
    sendKey: extras.sendKey || "",
    zoomAttendanceId: extras.zoomAttendanceId || "",
    makeStatus: extras.makeStatus || "",
  });
}

/* =========================================================
   SECTION 3: MAIN
========================================================= */

async function main() {
  setDebug("1 - Validate inputs");
  setOutputSafe("errorOut", "");
  setOutputSafe("makeStatus", "");
  setOutputSafe("sendKey", "");
  setOutputSafe("zoomAttendanceId", "");

  const cfg = input.config();

  const webhookUrl = requireMakeUs1WebhookUrl(cfg.webhookUrl);
  const zoomAttendanceId = requireRecId("recordId", cfg.recordId);
  const enrollmentRid = requireRecId("enrollmentRid", cfg.enrollmentRid);
  const zoomMeetingRid = requireRecId("zoomMeetingRid", cfg.zoomMeetingRid);

  setOutputSafe("zoomAttendanceId", zoomAttendanceId);

  setDebug("2 - Build payload");

  const sendKey = buildSendKey(enrollmentRid, zoomMeetingRid, zoomAttendanceId);
  setOutputSafe("sendKey", sendKey);

  const payload = {
    automationNumber: CONFIG.automationNumber,
    templateKey: CONFIG.templateKey,
    timing: CONFIG.timing,
    sendKey,
    enrollmentRid,
    zoomMeetingRid,
    zoomAttendanceId,
  };

  log("117f Make handoff payload", {
    automation: SCRIPT.scriptName,
    version: SCRIPT.version,
    payload,
  });

  setDebug("3 - POST to Make webhook");

  let response;
  try {
    response = await postJson(webhookUrl, payload);
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
    finishError("error", `Network failure posting to Make: ${message}`, {
      sendKey,
      zoomAttendanceId,
    });
    throw new Error(`FAILED AT: ${debugStep} — Network failure posting to Make: ${message}`);
  }

  const httpStatus = response && response.status != null ? response.status : "unknown";
  const responseBody = await readResponseBody(response);

  log("117f Make handoff HTTP response", {
    automation: SCRIPT.scriptName,
    version: SCRIPT.version,
    httpStatus,
    responseText: responseBody.rawText,
    responseJson: responseBody.json,
  });

  if (!response || !response.ok) {
    const message = `Make webhook returned non-2xx HTTP ${httpStatus}: ${String(responseBody.rawText).slice(0, 500)}`;
    finishError("error", message, { sendKey, zoomAttendanceId });
    throw new Error(`FAILED AT: ${debugStep} — ${message}`);
  }

  if (responseBody.invalidJson || !responseBody.json || typeof responseBody.json !== "object") {
    const message = `Make webhook returned invalid JSON: ${String(responseBody.rawText).slice(0, 500)}`;
    finishError("error", message, { sendKey, zoomAttendanceId });
    throw new Error(`FAILED AT: ${debugStep} — ${message}`);
  }

  setDebug("4 - Validate Make status");

  const makeStatus = normalizeText(responseBody.json.status);
  setOutputSafe("makeStatus", makeStatus);

  if (!CONFIG.successStatuses.includes(makeStatus)) {
    const message = `Unexpected Make status "${makeStatus || "(blank)"}". Expected one of: ${CONFIG.successStatuses.join(", ")}`;
    finishError("error", message, { sendKey, zoomAttendanceId, makeStatus });
    throw new Error(`FAILED AT: ${debugStep} — ${message}`);
  }

  setDebug("5 - Complete");
  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", makeStatus);
  setOutputSafe("errorOut", "");
  setOutputSafe("sendKey", sendKey);
  setOutputSafe("zoomAttendanceId", zoomAttendanceId);
  setOutputSafe("makeStatus", makeStatus);
  setOutputSafe("debugStep", debugStep);

  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: "success",
        actionOut: makeStatus,
        makeStatus,
        sendKey,
        zoomAttendanceId,
        httpStatus,
        debugStep,
      },
      null,
      2
    )
  );
}

/* =========================================================
   SECTION 4: RUN
========================================================= */

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", debugStep || "error");

  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: "error",
        actionOut: "error",
        errorOut: message,
        debugStep,
      },
      null,
      2
    )
  );

  throw error;
}

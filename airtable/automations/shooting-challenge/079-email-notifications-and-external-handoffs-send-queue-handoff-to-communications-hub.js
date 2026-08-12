/*
GitHub header
Automation: 079 - Email, Notifications, and External Handoffs - Send Queue Handoff to Communications Hub
System: 127 SI Shooting Challenge
Version: v3.0
Date Written: 2026-08-11
Last Updated: 2026-08-12

PURPOSE
- Dispatch one Ready Email Handoff Queue row to the Communications Hub.
- Remain the single shared dispatcher for every Communications Hub event type.

IMPORTANT DESIGN RULES
- Validate one universal queue envelope instead of branching by email type.
- Canonical handoff keys use <EVENT_TYPE>|<SOURCE_TABLE_TOKEN>|<SOURCE_RECORD_ID>.
- Preserve a narrow compatibility path for legacy WELCOME keys that begin WELCOME|.
- The Hub owns event/template/payload-specific validation.
- The Hub owns rendering and delivery; this script never rebuilds email content.
- The ingress secret is an Airtable input and is never logged or stored.

TRIGGER
- Email Handoff Queue when Status is Ready.

INPUT
- recordId: triggering Email Handoff Queue record ID
- ingressSecret: Communications Hub bearer secret

OUTPUTS
- statusOut, actionOut, errorOut, debugStep, queueRecordId, handoffKey,
  hubEventId, attemptCount, hubResponseJson

FOLDER
- 07 - Email, Notifications, and External Handoffs
*/

// @ts-nocheck

const SCRIPT = {
    scriptName: "079 - Email, Notifications, and External Handoffs - Send Queue Handoff to Communications Hub",
    version: "v3.0",
    versionDate: "2026-08-12",
    originalWrittenDate: "2026-08-11",
    lastUpdated: "2026-08-12",
    folder: "07 - Email, Notifications, and External Handoffs",
    automationName: "079 - Email, Notifications, and External Handoffs - Send Queue Handoff to Communications Hub",
};

const CONFIG = {
    tables: { queue: "Email Handoff Queue" },
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
        sourceSystem: "SHOOTING_CHALLENGE",
        schemaVersion: "1.0",
        maxAttemptsBeforeReview: 3,
    },
    communicationsHub: {
        ingestUrl: "https://communications-two-blue.vercel.app/api/events/ingest",
    },
};

const fieldCache = new Map();

function setOutputSafe(name, value) {
    try { output.set(name, value); } catch {}
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
        throw new Error(`Invalid field type: ${table.name}.${fieldName} is ${field.type}; expected ${expectedTypes.join(", ")}`);
    }
    return field;
}

function requireWritableField(table, fieldName, expectedTypes) {
    const field = requireField(table, fieldName, expectedTypes);
    const computedTypes = new Set([
        "formula", "rollup", "count", "lookup", "multipleLookupValues",
        "createdTime", "lastModifiedTime", "createdBy", "lastModifiedBy",
        "autoNumber", "button", "aiText", "externalSyncSource",
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

function parseRecipients(value) {
    const recipients = parseJson(value, CONFIG.fields.recipientsJson);
    if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error(`${CONFIG.fields.recipientsJson} must be a non-empty array`);
    }
    const seenEmails = new Set();
    return recipients.map((recipient, index) => {
        if (!recipient || typeof recipient !== "object" || Array.isArray(recipient)) {
            throw new Error(`Recipient ${index + 1} must be an object`);
        }
        const email = requireEmail(recipient.email, `recipient ${index + 1}`);
        if (seenEmails.has(email)) throw new Error(`Duplicate recipient email: ${email}`);
        seenEmails.add(email);
        return { ...recipient, email };
    });
}

function parsePayload(value) {
    const payload = parseJson(value, CONFIG.fields.payloadJson);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error(`${CONFIG.fields.payloadJson} must be an object`);
    }
    return payload;
}

function getOptionalRecordId(value, label) {
    const recordId = String(value || "").trim();
    return recordId ? requireRecordId(recordId, label) : "";
}

function toEnvelopeToken(value, label) {
    const token = String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (!token) throw new Error(`${label} must not be blank`);
    return token;
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
    if (typeof fetch === "function") return fetch(url, request);
    if (typeof remoteFetchAsync === "function") return remoteFetchAsync(url, request);
    throw new Error("No supported HTTP method is available in this Airtable automation environment.");
}

function validateHandoff(eventType, templateKey, handoffKey, sourceTable, sourceRecordId) {
    const eventToken = toEnvelopeToken(eventType, "Event Type");
    toEnvelopeToken(templateKey, "Template Key");
    const sourceToken = toEnvelopeToken(sourceTable, "Source Table");
    const canonicalKey = `${eventToken}|${sourceToken}|${sourceRecordId}`;
    if (handoffKey === canonicalKey) return { keyFormat: "canonical" };

    // Compatibility only: previously accepted WELCOME rows required only a
    // WELCOME| prefix. New producers must always create the canonical key.
    if (eventToken === CONFIG.values.eventWelcome && handoffKey.startsWith("WELCOME|")) {
        if (normalizeText(templateKey) !== "welcome" || normalizeText(sourceTable) !== "enrollments") {
            throw new Error("Legacy WELCOME requires Template Key WELCOME and Source Table Enrollments");
        }
        return { keyFormat: "legacy_welcome" };
    }
    throw new Error(`Invalid canonical Handoff Key: expected ${canonicalKey}`);
}

async function main() {
    let debugStep = "Start";
    let queueTable;
    let recordId = "";
    let ingressSecret = "";
    const context = { queueRecordId: "", handoffKey: "", hubEventId: "", attemptCount: 0, hubResponseJson: "" };

    try {
        debugStep = "1 - Validate inputs";
        setOutputSafe("debugStep", debugStep);
        const cfg = input.config();
        recordId = requireRecordId(cfg.recordId, "Email Handoff Queue");
        ingressSecret = String(cfg.ingressSecret || "").trim();
        if (!ingressSecret) throw new Error("Missing required input: ingressSecret");
        context.queueRecordId = recordId;

        debugStep = "2 - Load table and validate schema";
        setOutputSafe("debugStep", debugStep);
        queueTable = base.getTable(CONFIG.tables.queue);
        requireField(queueTable, CONFIG.fields.status, ["singleSelect"]);
        requireField(queueTable, CONFIG.fields.eventType, ["singleSelect"]);
        requireField(queueTable, CONFIG.fields.testMode, ["checkbox"]);
        for (const fieldName of [
            CONFIG.fields.handoffKey, CONFIG.fields.sourceTable, CONFIG.fields.sourceRecordId,
            CONFIG.fields.recipientsJson, CONFIG.fields.templateKey, CONFIG.fields.payloadJson,
            CONFIG.fields.enrollmentRecordId, CONFIG.fields.programInstanceRecordId,
        ]) requireField(queueTable, fieldName, ["singleLineText", "multilineText", "richText"]);
        requireField(queueTable, CONFIG.fields.attemptCount, ["number"]);
        requireField(queueTable, CONFIG.fields.lastAttemptAt, ["date", "dateTime"]);
        requireField(queueTable, CONFIG.fields.acceptedAt, ["date", "dateTime"]);
        for (const fieldName of [
            CONFIG.fields.attemptCount, CONFIG.fields.lastAttemptAt, CONFIG.fields.lastError,
            CONFIG.fields.hubEventId, CONFIG.fields.hubResponseJson, CONFIG.fields.acceptedAt,
        ]) requireWritableField(
            queueTable,
            fieldName,
            fieldName === CONFIG.fields.attemptCount ? ["number"]
                : fieldName === CONFIG.fields.lastAttemptAt || fieldName === CONFIG.fields.acceptedAt
                    ? ["date", "dateTime"] : ["singleLineText", "multilineText", "richText"]
        );
        for (const status of [
            CONFIG.values.statusReady, CONFIG.values.statusSending, CONFIG.values.statusAccepted,
            CONFIG.values.statusFailed, CONFIG.values.statusNeedsReview,
        ]) requireSingleSelectValue(queueTable, CONFIG.fields.status, status);

        debugStep = "3 - Load queue record";
        setOutputSafe("debugStep", debugStep);
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

        debugStep = "4 - Validate queue contract";
        setOutputSafe("debugStep", debugStep);
        context.handoffKey = getText(row, CONFIG.fields.handoffKey);
        const eventType = getText(row, CONFIG.fields.eventType);
        const templateKey = getText(row, CONFIG.fields.templateKey);
        const sourceTable = getText(row, CONFIG.fields.sourceTable);
        const sourceRecordId = requireRecordId(getText(row, CONFIG.fields.sourceRecordId), "source");
        const { keyFormat } = validateHandoff(eventType, templateKey, context.handoffKey, sourceTable, sourceRecordId);
        const enrollmentRecordId = getOptionalRecordId(getText(row, CONFIG.fields.enrollmentRecordId), "Enrollment");
        const programInstanceRecordId = getOptionalRecordId(
            getText(row, CONFIG.fields.programInstanceRecordId), "Program Instance"
        );
        const recipients = parseRecipients(getText(row, CONFIG.fields.recipientsJson));
        const payload = parsePayload(getText(row, CONFIG.fields.payloadJson));
        const testMode = getBoolean(row, CONFIG.fields.testMode);
        context.attemptCount = getNumber(row, CONFIG.fields.attemptCount) + 1;

        debugStep = "5 - Mark Sending";
        setOutputSafe("debugStep", debugStep);
        await queueTable.updateRecordAsync(recordId, {
            [CONFIG.fields.attemptCount]: context.attemptCount,
            [CONFIG.fields.status]: buildStatusValue(queueTable, CONFIG.values.statusSending),
            [CONFIG.fields.lastAttemptAt]: new Date().toISOString(),
            [CONFIG.fields.lastError]: "",
        });

        debugStep = "6 - Send Communications Hub event";
        setOutputSafe("debugStep", debugStep);
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
        if (!enrollmentRecordId) delete requestPayload.enrollmentRecordId;
        if (!programInstanceRecordId) delete requestPayload.programInstanceRecordId;
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
        const acceptedDuplicate = responseBody.duplicate === true
            || responseBody.acceptedDuplicate === true
            || normalizeText(responseBody.result) === "duplicate";
        const actionOut = acceptedDuplicate ? "accepted_duplicate" : "accepted_new";

        debugStep = "7 - Mark Accepted";
        setOutputSafe("debugStep", debugStep);
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
        log("079 result", { queueRecordId: recordId, handoffKey: context.handoffKey, keyFormat, hubEventId: context.hubEventId, attemptCount: context.attemptCount, statusOut: "accepted", actionOut });
    } catch (error) {
        const message = sanitizeText(error instanceof Error ? error.message : String(error), ingressSecret);
        if (queueTable && recordId && context.attemptCount > 0) {
            try {
                const failureStatus = context.attemptCount >= CONFIG.values.maxAttemptsBeforeReview
                    ? CONFIG.values.statusNeedsReview : CONFIG.values.statusFailed;
                await queueTable.updateRecordAsync(recordId, {
                    [CONFIG.fields.status]: buildStatusValue(queueTable, failureStatus),
                    [CONFIG.fields.lastError]: message,
                });
            } catch (writebackError) {
                log("079 failure writeback failed", { queueRecordId: recordId, error: sanitizeText(writebackError.message, ingressSecret) });
            }
        }
        setQueueOutputs(context);
        setOutputSafe("statusOut", "error");
        setOutputSafe("actionOut", "error");
        setOutputSafe("errorOut", message);
        setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);
        log("079 result", { queueRecordId: recordId, handoffKey: context.handoffKey, attemptCount: context.attemptCount, statusOut: "error", errorOut: message });
        throw error;
    }
}

try { await main(); } catch (error) { throw error; }

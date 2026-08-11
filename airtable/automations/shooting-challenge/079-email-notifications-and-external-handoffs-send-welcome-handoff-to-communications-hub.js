/*
Automation: 079 - Email, Notifications, and External Handoffs - Send WELCOME Handoff to Communications Hub
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-11
Last GitHub Update: 2026-08-11

Purpose:
Dispatches one Ready Email Handoff Queue WELCOME row to the Communications Hub.

Trigger:
Email Handoff Queue when Status is Ready.

Important Tables:
Email Handoff Queue

Important Fields:
Status, Event Type, Handoff Key, Source Table, Source Record ID,
Recipients JSON, Template Key, Payload JSON, Test Mode?, Attempt Count,
Last Attempt At, Last Error, Hub Event ID, Hub Response JSON, Accepted At

Notes:
GitHub is the source-of-truth copy. Mike must paste into Airtable.
The ingress secret is an Airtable automation input variable named ingressSecret.
The script never logs, outputs, or stores the secret.
*/

/************************************************************
 * 079 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Send WELCOME Handoff to Communications Hub
 *
 * Version: v1.1
 * Date Written: 2026-08-11
 * Last Updated: 2026-08-11
 *
 * VERSION HISTORY
 * - v1.1 (2026-08-11): Match the current Hub WELCOME envelope exactly:
 *   schemaVersion 1.0, sourceSystem SHOOTING_CHALLENGE, source object, and data.
 * - v1.0 (2026-08-11): First repository source for the live 079 behavior;
 *   adds role-qualified recipient validation, retry state, safe response storage,
 *   and idempotent Hub handoff.
 *
 * PURPOSE
 * - Runs from one Email Handoff Queue record.
 * - Processes only Status = Ready.
 * - Sends a validated WELCOME event to the Communications Hub ingress endpoint.
 * - Records Sending, Accepted, Failed, or Needs Review state on the queue row.
 *
 * WORKFLOW / CONTRACT NOTES
 * - 078A creates the queue row; 079 is the only sender in this path.
 * - The Hub owns WELCOME subject, HTML, plain-text rendering, deduplication,
 *   and delivery. Accepted means Hub intake, not final delivery.
 * - Handoff Key is the idempotency key. A Hub duplicate acceptance returns
 *   accepted_duplicate and must not create a second Delivery.
 * - Recipients JSON objects require exact roles PARENT or ATHLETE.
 * - Test Mode? is forwarded to the Hub and must remain checked for controlled tests.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 079 - Email, Notifications, and External Handoffs - Send WELCOME Handoff to Communications Hub
 *
 * TRIGGER TABLE
 * - Email Handoff Queue
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Status is Ready.
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Email Handoff Queue record ID.
 * - ingressSecret = Communications Hub bearer secret.
 *
 * REQUIRED OUTPUTS
 * - statusOut = accepted | skipped | error
 * - actionOut = accepted_new | accepted_duplicate | skipped_not_ready | error
 * - errorOut = empty on success/skip; safe message on error
 * - debugStep = last numbered step reached
 * - queueRecordId, handoffKey, hubEventId, attemptCount, hubResponseJson
 *
 * RETRY BEHAVIOR
 * - Every send attempt increments Attempt Count before the HTTP request.
 * - A failed attempt writes Status = Failed.
 * - Once Attempt Count reaches the configured threshold, Status = Needs Review.
 * - Last Error is cleared before sending and populated after failure.
 * - Accepted rows are not retried by this script.
 *
 * INSTALLATION / TESTING
 * - Add recordId mapped to the triggering Email Handoff Queue record ID.
 * - Add ingressSecret as a secret/input value; never hardcode it.
 * - Paste the production docblock through the end into the Airtable script action.
 * - Test with an allowlisted Test Mode? queue row and verify Hub Event intake.
 * - Verify Delivery status = Sent separately in Communications Hub.
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
    scriptName: "079 - Email, Notifications, and External Handoffs - Send WELCOME Handoff to Communications Hub",
    version: "v1.1",
    versionDate: "2026-08-11",
    originalWrittenDate: "2026-08-11",
    lastUpdated: "2026-08-11",
    folder: "07 - Email, Notifications, and External Handoffs",
    automationName: "079 - Email, Notifications, and External Handoffs - Send WELCOME Handoff to Communications Hub",
};

const CONFIG = {
    tables: {
        queue: "Email Handoff Queue",
    },
    queueFields: {
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
        eventTypeWelcome: "WELCOME",
        templateKeyWelcome: "WELCOME",
        sourceTableEnrollments: "Enrollments",
        sourceSystemShootingChallenge: "SHOOTING_CHALLENGE",
        schemaVersion: "1.0",
        maxAttemptsBeforeReview: 3,
    },
    communicationsHub: {
        ingestUrl: "https://communications-two-blue.vercel.app/api/events/ingest",
    },
};

const fieldCache = new Map();

function setOutputSafe(name, value) {
    try {
        output.set(name, value);
    } catch {
        // Output mappings are optional in Airtable test harnesses.
    }
}

function log(message, data) {
    if (data === undefined) {
        console.log(message);
        return;
    }
    console.log(message, JSON.stringify(data));
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
    const nonWritableTypes = new Set([
        "formula", "rollup", "count", "lookup", "multipleLookupValues",
        "createdTime", "lastModifiedTime", "createdBy", "lastModifiedBy",
        "autoNumber", "button", "aiText", "externalSyncSource",
    ]);
    if (field.isComputed === true || nonWritableTypes.has(field.type)) {
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
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${fieldName} must be a non-negative number`);
    }
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
    const recipients = parseJson(value, CONFIG.queueFields.recipientsJson);
    if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error(`${CONFIG.queueFields.recipientsJson} must be a non-empty array`);
    }
    const seenRoles = new Set();
    return recipients.map((recipient, index) => {
        if (!recipient || typeof recipient !== "object" || Array.isArray(recipient)) {
            throw new Error(`Recipient ${index + 1} must be an object`);
        }
        if (recipient.role !== "PARENT" && recipient.role !== "ATHLETE") {
            throw new Error(`Invalid recipient role for ${recipient.email || "blank"}`);
        }
        if (seenRoles.has(recipient.role)) {
            throw new Error(`Duplicate recipient role: ${recipient.role}`);
        }
        seenRoles.add(recipient.role);
        return {
            role: recipient.role,
            email: requireEmail(recipient.email, `recipient ${recipient.role}`),
        };
    });
}

function parsePayload(value) {
    const payload = parseJson(value, CONFIG.queueFields.payloadJson);
    for (const key of ["athleteName", "programName", "message"]) {
        if (!String(payload?.[key] || "").trim()) {
            throw new Error(`${CONFIG.queueFields.payloadJson} is missing ${key}`);
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
    return requireSingleSelectValue(queueTable, CONFIG.queueFields.status, value);
}

function setQueueOutputs(context) {
    for (const [key, value] of Object.entries(context)) setOutputSafe(key, value);
}

async function postJson(url, secret, payload) {
    const request = {
        method: "POST",
        headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    };
    if (typeof fetch === "function") return fetch(url, request);
    if (typeof remoteFetchAsync === "function") return remoteFetchAsync(url, request);
    throw new Error("No supported HTTP method is available in this Airtable automation environment.");
}

async function main() {
    let debugStep = "Start";
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
        requireField(queueTable, CONFIG.queueFields.status, ["singleSelect"]);
        requireField(queueTable, CONFIG.queueFields.eventType, ["singleSelect"]);
        requireField(queueTable, CONFIG.queueFields.testMode, ["checkbox"]);
        for (const fieldName of [
            CONFIG.queueFields.handoffKey, CONFIG.queueFields.sourceTable,
            CONFIG.queueFields.sourceRecordId, CONFIG.queueFields.recipientsJson,
            CONFIG.queueFields.templateKey, CONFIG.queueFields.payloadJson,
            CONFIG.queueFields.enrollmentRecordId, CONFIG.queueFields.programInstanceRecordId,
        ]) requireField(queueTable, fieldName, ["singleLineText", "multilineText", "richText"]);
        requireField(queueTable, CONFIG.queueFields.attemptCount, ["number"]);
        requireField(queueTable, CONFIG.queueFields.lastAttemptAt, ["date", "dateTime"]);
        requireField(queueTable, CONFIG.queueFields.acceptedAt, ["date", "dateTime"]);
        for (const fieldName of [
            CONFIG.queueFields.attemptCount, CONFIG.queueFields.lastAttemptAt,
            CONFIG.queueFields.lastError, CONFIG.queueFields.hubEventId,
            CONFIG.queueFields.hubResponseJson, CONFIG.queueFields.acceptedAt,
        ]) requireWritableField(
            queueTable,
            fieldName,
            fieldName === CONFIG.queueFields.attemptCount
                ? ["number"]
                : fieldName === CONFIG.queueFields.lastAttemptAt || fieldName === CONFIG.queueFields.acceptedAt
                    ? ["date", "dateTime"]
                    : ["singleLineText", "multilineText", "richText"]
        );
        for (const status of [
            CONFIG.values.statusReady, CONFIG.values.statusSending,
            CONFIG.values.statusAccepted, CONFIG.values.statusFailed,
            CONFIG.values.statusNeedsReview,
        ]) requireSingleSelectValue(queueTable, CONFIG.queueFields.status, status);
        requireSingleSelectValue(queueTable, CONFIG.queueFields.eventType, CONFIG.values.eventTypeWelcome);

        debugStep = "3 - Load queue record";
        setOutputSafe("debugStep", debugStep);
        const row = await queueTable.selectRecordAsync(recordId);
        if (!row) throw new Error(`Email Handoff Queue record not found: ${recordId}`);
        const status = getText(row, CONFIG.queueFields.status);
        if (normalizeText(status) !== normalizeText(CONFIG.values.statusReady)) {
            setOutputSafe("statusOut", "skipped");
            setOutputSafe("actionOut", "skipped_not_ready");
            setOutputSafe("errorOut", "");
            setOutputSafe("debugStep", debugStep);
            log("079 result", { queueRecordId: recordId, statusOut: "skipped", actionOut: "skipped_not_ready" });
            return;
        }

        debugStep = "4 - Validate queue contract";
        setOutputSafe("debugStep", debugStep);
        context.handoffKey = getText(row, CONFIG.queueFields.handoffKey);
        if (!context.handoffKey || !context.handoffKey.startsWith("WELCOME|")) {
            throw new Error(`Invalid WELCOME Handoff Key: ${context.handoffKey || "blank"}`);
        }
        if (getText(row, CONFIG.queueFields.eventType) !== CONFIG.values.eventTypeWelcome) {
            throw new Error("Event Type must be WELCOME");
        }
        if (getText(row, CONFIG.queueFields.templateKey) !== CONFIG.values.templateKeyWelcome) {
            throw new Error("Template Key must be WELCOME");
        }
        const sourceTable = getText(row, CONFIG.queueFields.sourceTable);
        if (sourceTable !== CONFIG.values.sourceTableEnrollments) {
            throw new Error(`Source Table must be ${CONFIG.values.sourceTableEnrollments}`);
        }
        const sourceRecordId = requireRecordId(getText(row, CONFIG.queueFields.sourceRecordId), "source");
        const enrollmentRecordId = requireRecordId(
            getText(row, CONFIG.queueFields.enrollmentRecordId),
            "Enrollment"
        );
        const programInstanceRecordId = requireRecordId(
            getText(row, CONFIG.queueFields.programInstanceRecordId),
            "Program Instance"
        );
        const recipients = parseRecipients(getText(row, CONFIG.queueFields.recipientsJson));
        const payload = parsePayload(getText(row, CONFIG.queueFields.payloadJson));
        const testMode = getBoolean(row, CONFIG.queueFields.testMode);
        context.attemptCount = getNumber(row, CONFIG.queueFields.attemptCount) + 1;

        debugStep = "5 - Mark Sending";
        setOutputSafe("debugStep", debugStep);
        await queueTable.updateRecordAsync(recordId, {
            [CONFIG.queueFields.attemptCount]: context.attemptCount,
            [CONFIG.queueFields.status]: buildStatusValue(queueTable, CONFIG.values.statusSending),
            [CONFIG.queueFields.lastAttemptAt]: new Date().toISOString(),
            [CONFIG.queueFields.lastError]: "",
        });

        debugStep = "6 - Send Communications Hub event";
        setOutputSafe("debugStep", debugStep);
        const requestPayload = {
            schemaVersion: CONFIG.values.schemaVersion,
            sourceSystem: CONFIG.values.sourceSystemShootingChallenge,
            eventType: CONFIG.values.eventTypeWelcome,
            templateKey: CONFIG.values.templateKeyWelcome,
            handoffKey: context.handoffKey,
            source: {
                table: sourceTable,
                recordId: sourceRecordId,
            },
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
        const acceptedDuplicate = responseBody.duplicate === true
            || responseBody.acceptedDuplicate === true
            || normalizeText(responseBody.result) === "duplicate";
        const actionOut = acceptedDuplicate ? "accepted_duplicate" : "accepted_new";

        debugStep = "7 - Mark Accepted";
        setOutputSafe("debugStep", debugStep);
        await queueTable.updateRecordAsync(recordId, {
            [CONFIG.queueFields.status]: buildStatusValue(queueTable, CONFIG.values.statusAccepted),
            [CONFIG.queueFields.hubEventId]: context.hubEventId,
            [CONFIG.queueFields.hubResponseJson]: context.hubResponseJson,
            [CONFIG.queueFields.acceptedAt]: new Date().toISOString(),
            [CONFIG.queueFields.lastError]: "",
        });
        setQueueOutputs(context);
        setOutputSafe("statusOut", "accepted");
        setOutputSafe("actionOut", actionOut);
        setOutputSafe("errorOut", "");
        log("079 result", {
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
                const failureStatus = context.attemptCount >= CONFIG.values.maxAttemptsBeforeReview
                    ? CONFIG.values.statusNeedsReview
                    : CONFIG.values.statusFailed;
                await queueTable.updateRecordAsync(recordId, {
                    [CONFIG.queueFields.status]: buildStatusValue(queueTable, failureStatus),
                    [CONFIG.queueFields.lastError]: message,
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
            queueRecordId: recordId,
            handoffKey: context.handoffKey,
            attemptCount: context.attemptCount,
            statusOut: "error",
            errorOut: message,
        });
        throw error;
    }
}

try {
    await main();
} catch (error) {
    throw error;
}

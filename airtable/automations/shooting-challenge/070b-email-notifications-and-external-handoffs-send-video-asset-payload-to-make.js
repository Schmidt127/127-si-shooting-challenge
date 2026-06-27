/*
Automation: 070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-27
Last GitHub Update: 2026-06-27

Purpose:
Sends one video Submission Asset to the shared Make Upload Engine (minimal v4.0 payload).

Trigger:
Submission Assets when Send to Make Trigger is checked and video asset is ready.

Important Tables:
Submission Assets

Important Fields:
Upload Status, Send to Make Trigger, Video Feedback, Google Drive File URL

Notes:
Same script body as 070a — set input automationNumber to 070b in Airtable.
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/********************************************************************
 * AUTOMATION:
 * 070a / 070b - Send Upload Asset Payload to Make
 *
 * SYSTEM:
 * 127 Sports Intensity - Shooting Challenge App
 *
 * BASE:
 * 127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026
 *
 * TABLE:
 * Submission Assets
 *
 * VERSION:
 * v4.0 - Minimal Canonical Webhook Payload
 *
 * CREATED:
 * 2026-06-27
 *
 * LAST UPDATED:
 * 2026-06-27
 *
 * CHANGE HISTORY:
 * 2026-06-27 - v4.0
 * - Rewritten to use one shared script for both 070a and 070b.
 * - Removed duplicate webhook fields such as singular/plural homework and video IDs.
 * - Sends only the minimum Make needs:
 *      submissionAssetRecordId
 *      routeKey
 *      uploadDestination
 *      targetTable
 *      targetRecordId
 *      automationNumber
 *      sentAtIso
 * - Uses targetRecordId as the single canonical destination record.
 * - Supports both Homework Completions and Video Feedback assets.
 * - Stops safely with Pending Link if the target Homework Completion or Video Feedback record is missing.
 * - Stops safely with Error if required Submission Asset fields are missing.
 * - Stops safely if Google Drive File URL or File ID already exists to prevent duplicate uploads.
 * - Sends webhook first, then marks the Submission Asset as Processing only after Make responds successfully.
 * - Clears Upload Error and unchecks Send to Make Trigger after successful webhook delivery.
 *
 * PURPOSE:
 * Sends one Submission Asset record to the shared Make Upload Engine.
 *
 * WORKS FOR:
 * - 070a: Homework Completions assets
 * - 070b: Video Feedback assets
 *
 * REQUIRED AIRTABLE INPUT VARIABLES:
 * - recordId
 * - makeWebhookUrl (or webhookUrl)
 * - automationNumber — "070a" or "070b"
 *
 * OUTPUTS:
 * - statusOut = success | skipped | error
 * - actionOut
 * - errorOut
 * - debugStep
 *
 * IMPORTANT:
 * Do not add duplicate fields back into the webhook payload.
 * The Make scenario gets all fresh Airtable details from Module 2.
 ********************************************************************/

// @ts-nocheck

async function main() {
    /************************************************************
     * SECTION 1: CONFIG
     ************************************************************/

    const CONFIG = {
        scriptName: "070a/070b - Send Upload Asset Payload to Make",
        version: "v4.0",

        tables: {
            submissionAssets: "Submission Assets",
        },

        fields: {
            uploadDestination: "Upload Destination",
            sendToMakeTrigger: "Send to Make Trigger",
            readyToSendToMake: "Ready to Send to Make?",
            whyNotReadyForMake: "Why Not Ready for Make?",
            uploadStatus: "Upload Status",
            uploadError: "Upload Error",

            airtableAttachment: "Airtable Attachment",
            submissionLinked: "Submission - Linked",
            enrollmentLinked: "Enrollment - Linked",

            homeworkCompletions: "Homework Completions",
            homeworkCompletionsRid: "Homework Completions RID",
            homeworkCompletionRecordId: "Homework Completion Record ID",

            videoFeedback: "Video Feedback",

            googleDriveFileId: "Google Drive File ID",
            googleDriveFileUrl: "Google Drive File URL",
        },

        values: {
            readyToSendToken: "READY_TO_SEND",
            statusPendingLink: "Pending Link",
            statusProcessing: "Processing",
            statusError: "Error",
        },

        routes: {
            "070a": {
                automationNumber: "070a",
                automationName:
                    "070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make",
                routeKey: "homework",
                uploadDestination: "Homework Completions",
                targetTable: "Homework Completions",
                targetLinkField: "Homework Completions",
                targetRecordIdField: "Homework Completion Record ID",
                targetRidField: "Homework Completions RID",
                sourceName: "Airtable Homework Submission Asset Automation",
            },
            "070b": {
                automationNumber: "070b",
                automationName:
                    "070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make",
                routeKey: "video_feedback",
                uploadDestination: "Video Feedback",
                targetTable: "Video Feedback",
                targetLinkField: "Video Feedback",
                targetRecordIdField: "",
                targetRidField: "",
                sourceName: "Airtable Video Submission Asset Automation",
            },
        },
    };

    /************************************************************
     * SECTION 2: OUTPUT HELPERS
     ************************************************************/

    let debugStep = "1 - Start";

    function setOutputSafe(name, value) {
        try {
            output.set(name, value);
        } catch {
            // ignore unmapped outputs
        }
    }

    function setDebug(step) {
        debugStep = step;
        setOutputSafe("debugStep", debugStep);
    }

    function setStandardOutputs(result) {
        setOutputSafe("statusOut", result.statusOut || "");
        setOutputSafe("actionOut", result.actionOut || "");
        setOutputSafe("errorOut", result.errorOut || "");
        setOutputSafe("debugStep", debugStep);
        setOutputSafe("ok", result.ok === true);
        setOutputSafe("skipped", result.skipped === true);
        setOutputSafe("submissionAssetRecordId", result.submissionAssetRecordId || "");
        setOutputSafe("targetRecordId", result.targetRecordId || "");
        setOutputSafe("targetTable", result.targetTable || "");
        setOutputSafe("routeKey", result.routeKey || "");
        setOutputSafe("uploadDestination", result.uploadDestination || "");
        setOutputSafe("automationNumber", result.automationNumber || "");
        setOutputSafe("makeStatus", result.makeStatus || "");
        setOutputSafe("makeResponse", result.makeResponse || "");
    }

    function normalizeText(value) {
        return String(value ?? "").trim();
    }

    function comparable(value) {
        return normalizeText(value).replace(/\u00A0/g, " ").toLowerCase();
    }

    function fieldExists(table, fieldName) {
        if (!table || !fieldName) return false;
        try {
            table.getField(fieldName);
            return true;
        } catch {
            return false;
        }
    }

    function getField(table, fieldName) {
        return fieldExists(table, fieldName) ? table.getField(fieldName) : null;
    }

    function getSafeFields(table, fieldNames) {
        return [...new Set(fieldNames)].filter((name) => fieldExists(table, name));
    }

    function getRaw(record, table, fieldName) {
        if (!record || !fieldExists(table, fieldName)) return null;
        return record.getCellValue(fieldName);
    }

    function getText(record, table, fieldName) {
        if (!record || !fieldExists(table, fieldName)) return "";
        return normalizeText(record.getCellValueAsString(fieldName));
    }

    function getCheckbox(record, table, fieldName) {
        return getRaw(record, table, fieldName) === true;
    }

    function getSingleSelectName(record, table, fieldName) {
        const raw = getRaw(record, table, fieldName);
        if (raw && typeof raw === "object" && "name" in raw) {
            return normalizeText(raw.name);
        }
        return getText(record, table, fieldName);
    }

    function getLinkedIds(record, table, fieldName) {
        const raw = getRaw(record, table, fieldName);
        if (!Array.isArray(raw)) return [];
        return raw.map((item) => item?.id).filter(Boolean);
    }

    function isWritableField(table, fieldName) {
        const field = getField(table, fieldName);
        if (!field) return false;

        const nonWritable = new Set([
            "formula",
            "rollup",
            "multipleLookupValues",
            "lookup",
            "createdTime",
            "lastModifiedTime",
            "autoNumber",
            "count",
            "createdBy",
            "lastModifiedBy",
            "button",
            "externalSyncSource",
            "aiText",
        ]);

        return !nonWritable.has(field.type);
    }

    function hasSingleSelectOption(table, fieldName, optionName) {
        const field = getField(table, fieldName);
        if (!field || field.type !== "singleSelect") return false;
        return (field.options?.choices || []).some((choice) => choice.name === optionName);
    }

    function setStatus(fields, table, statusName) {
        const fieldName = CONFIG.fields.uploadStatus;
        if (!isWritableField(table, fieldName)) return;

        const field = getField(table, fieldName);
        if (field?.type === "singleSelect" && hasSingleSelectOption(table, fieldName, statusName)) {
            fields[fieldName] = { name: statusName };
            return;
        }

        fields[fieldName] = statusName;
    }

    function setWritable(fields, table, fieldName, value) {
        if (isWritableField(table, fieldName)) {
            fields[fieldName] = value;
        }
    }

    async function updateAsset(table, recordId, fields) {
        if (!fields || Object.keys(fields).length === 0) return;
        await table.updateRecordAsync(recordId, fields);
    }

    function getResponsePreview(text) {
        const raw = String(text || "");
        return raw.length > 1000 ? `${raw.slice(0, 1000)}...` : raw;
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

        throw new Error("No supported HTTP method is available in this Airtable environment.");
    }

    function resolveTargetRecordId(assetRecord, table, route) {
        const linkedIds = getLinkedIds(assetRecord, table, route.targetLinkField);

        if (route.targetRecordIdField) {
            const explicit = getText(assetRecord, table, route.targetRecordIdField);
            if (explicit) return explicit;
        }

        if (route.targetRidField) {
            const rid = getText(assetRecord, table, route.targetRidField);
            if (rid) return rid;
        }

        return linkedIds[0] || "";
    }

    async function finishSkipped(message, extra = {}) {
        const result = {
            ok: true,
            skipped: true,
            statusOut: "skipped",
            actionOut: "skipped_pending_link",
            errorOut: "",
            message,
            ...extra,
        };

        setStandardOutputs(result);
        console.log(
            JSON.stringify({
                automation: CONFIG.scriptName,
                version: CONFIG.version,
                ...result,
            }),
        );

        return result;
    }

    async function finishError(table, recordId, message, extra = {}) {
        const fields = {};
        setStatus(fields, table, CONFIG.values.statusError);
        setWritable(fields, table, CONFIG.fields.uploadError, message);
        await updateAsset(table, recordId, fields);

        const result = {
            ok: false,
            skipped: false,
            statusOut: "error",
            actionOut: "error",
            errorOut: message,
            message,
            submissionAssetRecordId: recordId,
            ...extra,
        };

        setStandardOutputs(result);
        console.log(
            JSON.stringify({
                automation: CONFIG.scriptName,
                version: CONFIG.version,
                ...result,
            }),
        );

        throw new Error(message);
    }

    /************************************************************
     * SECTION 3: INPUTS
     ************************************************************/

    setDebug("1 - Read Input");

    const inputConfig = input.config();
    const recordId = normalizeText(inputConfig.recordId);
    const makeWebhookUrl = normalizeText(
        inputConfig.makeWebhookUrl || inputConfig.webhookUrl,
    );
    const automationNumber = normalizeText(inputConfig.automationNumber);

    if (!recordId) {
        throw new Error("Missing required input variable: recordId");
    }

    if (!recordId.startsWith("rec")) {
        throw new Error(`Invalid recordId. Expected Airtable record ID, received: ${recordId}`);
    }

    if (!makeWebhookUrl) {
        throw new Error("Missing required input variable: makeWebhookUrl (or webhookUrl)");
    }

    if (!automationNumber) {
        throw new Error('Missing required input variable: automationNumber ("070a" or "070b")');
    }

    const route = CONFIG.routes[automationNumber];

    if (!route) {
        throw new Error(
            `Invalid automationNumber "${automationNumber}". Expected "070a" or "070b".`,
        );
    }

    /************************************************************
     * SECTION 4: LOAD RECORD
     ************************************************************/

    setDebug("2 - Load Submission Asset");

    const assetsTable = base.getTable(CONFIG.tables.submissionAssets);
    const fieldsToLoad = getSafeFields(assetsTable, Object.values(CONFIG.fields));

    const assetRecord = await assetsTable.selectRecordAsync(recordId, {
        fields: fieldsToLoad.length ? fieldsToLoad : undefined,
    });

    if (!assetRecord) {
        throw new Error(`Submission Assets record not found: ${recordId}`);
    }

    /************************************************************
     * SECTION 5: READ STATE
     ************************************************************/

    setDebug("3 - Read Asset State");

    const uploadDestination = getText(assetRecord, assetsTable, CONFIG.fields.uploadDestination);
    const sendToMakeTrigger = getCheckbox(assetRecord, assetsTable, CONFIG.fields.sendToMakeTrigger);
    const readyToSendToMake = getText(assetRecord, assetsTable, CONFIG.fields.readyToSendToMake);
    const uploadStatus = getSingleSelectName(assetRecord, assetsTable, CONFIG.fields.uploadStatus);
    const googleDriveFileId = getText(assetRecord, assetsTable, CONFIG.fields.googleDriveFileId);
    const googleDriveFileUrl = getText(assetRecord, assetsTable, CONFIG.fields.googleDriveFileUrl);
    const submissionRecordIds = getLinkedIds(assetRecord, assetsTable, CONFIG.fields.submissionLinked);
    const enrollmentRecordIds = getLinkedIds(assetRecord, assetsTable, CONFIG.fields.enrollmentLinked);
    const attachments = getRaw(assetRecord, assetsTable, CONFIG.fields.airtableAttachment);
    const attachmentCount = Array.isArray(attachments) ? attachments.length : 0;
    const targetRecordId = resolveTargetRecordId(assetRecord, assetsTable, route);

    /************************************************************
     * SECTION 6: VALIDATE ROUTE + REQUIRED FIELDS
     ************************************************************/

    setDebug("4 - Validate Route");

    if (comparable(uploadDestination) !== comparable(route.uploadDestination)) {
        await finishError(
            assetsTable,
            recordId,
            `${route.automationNumber} route mismatch: expected Upload Destination = ${route.uploadDestination}, got "${uploadDestination || "[blank]"}".`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
            },
        );
    }

    if (!sendToMakeTrigger) {
        await finishError(
            assetsTable,
            recordId,
            `${route.automationNumber} cannot send: Send to Make Trigger is not checked.`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
            },
        );
    }

    if (!readyToSendToMake.includes(CONFIG.values.readyToSendToken)) {
        await finishError(
            assetsTable,
            recordId,
            `${route.automationNumber} cannot send: Ready to Send to Make? is "${readyToSendToMake || "[blank]"}", not ${CONFIG.values.readyToSendToken}.`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
            },
        );
    }

    if (comparable(uploadStatus) !== comparable(CONFIG.values.statusPendingLink)) {
        await finishError(
            assetsTable,
            recordId,
            `${route.automationNumber} cannot send: Upload Status must be Pending Link. Current value: ${uploadStatus || "[blank]"}.`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
                uploadStatus,
            },
        );
    }

    if (googleDriveFileId || googleDriveFileUrl) {
        await finishError(
            assetsTable,
            recordId,
            `${route.automationNumber} cannot send: Google Drive File ID or URL already exists. Duplicate upload blocked.`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
                googleDriveFileId,
                googleDriveFileUrl,
            },
        );
    }

    if (submissionRecordIds.length === 0) {
        await finishError(
            assetsTable,
            recordId,
            `${route.automationNumber} cannot send: Submission - Linked is missing.`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
            },
        );
    }

    if (enrollmentRecordIds.length === 0) {
        await finishError(
            assetsTable,
            recordId,
            `${route.automationNumber} cannot send: Enrollment - Linked is missing.`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
            },
        );
    }

    if (attachmentCount === 0) {
        await finishError(
            assetsTable,
            recordId,
            `${route.automationNumber} cannot send: Airtable Attachment is empty.`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
            },
        );
    }

    /************************************************************
     * SECTION 7: TARGET RECORD CHECK
     ************************************************************/

    setDebug("5 - Resolve Target Record");

    if (!targetRecordId) {
        await finishSkipped(
            `${route.automationNumber} waiting for ${route.targetTable} link. Upload Status remains Pending Link.`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
                targetRecordId: "",
                submissionAssetRecordId: recordId,
            },
        );
        return;
    }

    /************************************************************
     * SECTION 8: BUILD MINIMAL PAYLOAD
     ************************************************************/

    setDebug("6 - Build Payload");

    const sentAtIso = new Date().toISOString();

    const payload = {
        sourceName: route.sourceName,
        automationNumber: route.automationNumber,
        sentAtIso,
        routeKey: route.routeKey,
        uploadDestination,
        sourceTable: CONFIG.tables.submissionAssets,
        submissionAssetRecordId: recordId,
        targetTable: route.targetTable,
        targetRecordId,
    };

    console.log(`${route.automationNumber} payload`);
    console.log(JSON.stringify(payload, null, 2));

    /************************************************************
     * SECTION 9: SEND WEBHOOK (before Processing)
     ************************************************************/

    setDebug("7 - Send Webhook");

    let response = null;
    let responseText = "";

    try {
        response = await postJson(makeWebhookUrl, payload);
        responseText = await response.text();
    } catch (error) {
        await finishError(
            assetsTable,
            recordId,
            `${route.automationNumber} Make webhook request failed: ${error.message || error}`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
                targetRecordId,
            },
        );
    }

    if (!response || !response.ok) {
        await finishError(
            assetsTable,
            recordId,
            `${route.automationNumber} Make webhook returned HTTP ${response?.status || "unknown"}: ${getResponsePreview(responseText)}`,
            {
                automationNumber: route.automationNumber,
                routeKey: route.routeKey,
                uploadDestination,
                targetTable: route.targetTable,
                targetRecordId,
                makeStatus: String(response?.status || ""),
                makeResponse: getResponsePreview(responseText),
            },
        );
    }

    /************************************************************
     * SECTION 10: SUCCESS WRITEBACK
     ************************************************************/

    setDebug("8 - Success Writeback");

    const successFields = {};

    setStatus(successFields, assetsTable, CONFIG.values.statusProcessing);
    setWritable(successFields, assetsTable, CONFIG.fields.uploadError, "");
    setWritable(successFields, assetsTable, CONFIG.fields.sendToMakeTrigger, false);

    await updateAsset(assetsTable, recordId, successFields);

    /************************************************************
     * SECTION 11: OUTPUTS
     ************************************************************/

    setDebug("9 - Done");

    const result = {
        ok: true,
        skipped: false,
        statusOut: "success",
        actionOut: "sent_to_make",
        errorOut: "",
        message: `${route.automationNumber} asset sent to Make successfully.`,
        submissionAssetRecordId: recordId,
        targetRecordId,
        targetTable: route.targetTable,
        routeKey: route.routeKey,
        uploadDestination,
        automationNumber: route.automationNumber,
        makeStatus: String(response.status),
        makeResponse: getResponsePreview(responseText),
    };

    setStandardOutputs(result);

    console.log(
        JSON.stringify({
            automation: CONFIG.scriptName,
            version: CONFIG.version,
            ...result,
        }),
    );
}

try {
    await main();
} catch (error) {
    console.error(String(error?.message || error));
    throw error;
}

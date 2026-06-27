/*
Automation: 070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-27
Last GitHub Update: 2026-06-27

Purpose:
Sends one video Submission Asset to the shared Make Upload Engine (v4.1 minimal payload).

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
 * v4.1 - Minimal Canonical Webhook Payload, routeKey corrected
 *
 * CREATED:
 * 2026-06-27
 *
 * LAST UPDATED:
 * 2026-06-27
 *
 * CHANGE HISTORY:
 * 2026-06-27 - v4.1
 * - Corrected homework routeKey from "homework" to "homework_completion".
 * - Kept one shared script body for 070a and 070b.
 * - Kept minimal canonical webhook payload.
 * - Sends only submissionAssetRecordId and targetRecordId for Make routing.
 * - Prevents duplicate uploads if Google Drive File URL or File ID already exists.
 * - Stops safely with Pending Link if target Homework Completion or Video Feedback record is missing.
 *
 * 2026-06-27 - v4.0
 * - Rewritten to use one shared script for both 070a and 070b.
 * - Removed duplicate webhook fields from payload.
 * - Sends webhook first; sets Processing only after Make responds successfully.
 *
 * PURPOSE:
 * Sends one Submission Asset record to the shared Make Upload Engine.
 *
 * WORKS FOR:
 * - 070a: Homework Completions assets (automationNumber input = "070a")
 * - 070b: Video Feedback assets (automationNumber input = "070b")
 *
 * REQUIRED AIRTABLE INPUT VARIABLES:
 * - recordId — Submission Assets record ID from trigger
 * - makeWebhookUrl — Make Upload Engine webhook URL
 * - automationNumber — "070a" or "070b"
 *
 * OPTIONAL INPUT ALIAS:
 * - webhookUrl — fallback for makeWebhookUrl
 *
 * MINIMAL WEBHOOK PAYLOAD:
 * {
 *   "sourceName": "Airtable Upload Engine",
 *   "automationNumber": "070a" | "070b",
 *   "sentAtIso": "ISO timestamp",
 *   "routeKey": "homework_completion" | "video_feedback",
 *   "uploadDestination": "Homework Completions" | "Video Feedback",
 *   "sourceTable": "Submission Assets",
 *   "submissionAssetRecordId": "rec...",
 *   "targetTable": "Homework Completions" | "Video Feedback",
 *   "targetRecordId": "rec..."
 * }
 *
 * MAKE MAPPING EXPECTATIONS:
 * - Module 2 Get Submission Asset: Record ID = {{1.submissionAssetRecordId}}
 * - Submission Assets writeback: Record ID = {{1.submissionAssetRecordId}}
 * - Homework Completion / Video Feedback writeback: Record ID = {{1.targetRecordId}}
 *
 * ROUTING (from Upload Destination on Submission Asset):
 * - Homework Completions → routeKey homework_completion, targetTable Homework Completions
 * - Video Feedback → routeKey video_feedback, targetTable Video Feedback
 * - targetRecordId = first linked record on Homework Completions or Video Feedback field
 ********************************************************************/

// @ts-nocheck

async function main() {
    /************************************************************
     * SECTION 1: CONFIG
     ************************************************************/

    const CONFIG = {
        scriptName: "070a/070b - Send Upload Asset Payload to Make",
        version: "v4.1",

        tables: {
            submissionAssets: "Submission Assets",
        },

        fields: {
            uploadDestination: "Upload Destination",
            sendToMakeTrigger: "Send to Make Trigger",
            uploadStatus: "Upload Status",
            uploadError: "Upload Error",

            airtableAttachment: "Airtable Attachment",
            submissionLinked: "Submission - Linked",
            enrollmentLinked: "Enrollment - Linked",

            homeworkCompletions: "Homework Completions",
            videoFeedback: "Video Feedback",

            googleDriveFileId: "Google Drive File ID",
            googleDriveFileUrl: "Google Drive File URL",
        },

        values: {
            statusPendingLink: "Pending Link",
            statusProcessing: "Processing",
            statusError: "Error",
            statusUploaded: "Uploaded",
            sourceName: "Airtable Upload Engine",
        },

        routes: {
            homework: {
                uploadDestination: "Homework Completions",
                routeKey: "homework_completion",
                targetTable: "Homework Completions",
                targetLinkField: "Homework Completions",
            },
            video: {
                uploadDestination: "Video Feedback",
                routeKey: "video_feedback",
                targetTable: "Video Feedback",
                targetLinkField: "Video Feedback",
            },
        },
    };

    /************************************************************
     * SECTION 2: HELPERS
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
        return normalizeText(value)
            .replace(/\u00A0/g, " ")
            .replace(/\s+/g, " ")
            .toLowerCase();
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

    function resolveRoute(uploadDestination) {
        const normalized = comparable(uploadDestination);

        if (normalized === comparable(CONFIG.routes.homework.uploadDestination)) {
            return CONFIG.routes.homework;
        }

        if (normalized === comparable(CONFIG.routes.video.uploadDestination)) {
            return CONFIG.routes.video;
        }

        return null;
    }

    async function stopWithAssetUpdate(options) {
        const {
            statusOut,
            actionOut,
            uploadStatus,
            uploadError,
            uncheckTrigger = true,
            message,
            extra = {},
        } = options;

        const fields = {};

        if (uploadStatus) {
            setStatus(fields, assetsTable, uploadStatus);
        }

        if (uploadError !== undefined) {
            setWritable(fields, assetsTable, CONFIG.fields.uploadError, uploadError);
        }

        if (uncheckTrigger) {
            setWritable(fields, assetsTable, CONFIG.fields.sendToMakeTrigger, false);
        }

        await updateAsset(assetsTable, recordId, fields);

        const result = {
            ok: statusOut !== "error",
            skipped: statusOut === "skipped",
            statusOut,
            actionOut,
            errorOut: uploadError || "",
            message,
            submissionAssetRecordId: recordId,
            automationNumber,
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

    if (automationNumber !== "070a" && automationNumber !== "070b") {
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
    const submissionRecordIds = getLinkedIds(assetRecord, assetsTable, CONFIG.fields.submissionLinked);
    const enrollmentRecordIds = getLinkedIds(assetRecord, assetsTable, CONFIG.fields.enrollmentLinked);
    const googleDriveFileId = getText(assetRecord, assetsTable, CONFIG.fields.googleDriveFileId);
    const googleDriveFileUrl = getText(assetRecord, assetsTable, CONFIG.fields.googleDriveFileUrl);
    const attachments = getRaw(assetRecord, assetsTable, CONFIG.fields.airtableAttachment);
    const attachmentCount = Array.isArray(attachments) ? attachments.length : 0;

    const route = resolveRoute(uploadDestination);

    if (!route) {
        await stopWithAssetUpdate({
            statusOut: "error",
            actionOut: "error_unsupported_destination",
            uploadStatus: CONFIG.values.statusError,
            uploadError: `Unsupported Upload Destination: "${uploadDestination || "[blank]"}".`,
            message: "Unsupported Upload Destination.",
            extra: { uploadDestination },
        });
        return;
    }

    const targetRecordId = getLinkedIds(assetRecord, assetsTable, route.targetLinkField)[0] || "";

    /************************************************************
     * SECTION 6: SAFETY CHECKS
     ************************************************************/

    setDebug("4 - Safety Checks");

    if (googleDriveFileId || googleDriveFileUrl) {
        await stopWithAssetUpdate({
            statusOut: "skipped",
            actionOut: "skipped_already_uploaded",
            uploadStatus: CONFIG.values.statusUploaded,
            uploadError:
                "Upload stopped: Google Drive File URL or File ID already exists. Duplicate upload prevented.",
            message: "Duplicate upload blocked — Drive file already present.",
            extra: {
                uploadDestination,
                routeKey: route.routeKey,
                targetTable: route.targetTable,
                targetRecordId,
                googleDriveFileId,
                googleDriveFileUrl,
            },
        });
        return;
    }

    if (submissionRecordIds.length === 0) {
        await stopWithAssetUpdate({
            statusOut: "error",
            actionOut: "error_missing_submission",
            uploadStatus: CONFIG.values.statusError,
            uploadError: "Submission - Linked is missing.",
            message: "Missing Submission - Linked.",
            extra: { uploadDestination, routeKey: route.routeKey, targetTable: route.targetTable },
        });
        return;
    }

    if (enrollmentRecordIds.length === 0) {
        await stopWithAssetUpdate({
            statusOut: "error",
            actionOut: "error_missing_enrollment",
            uploadStatus: CONFIG.values.statusError,
            uploadError: "Enrollment - Linked is missing.",
            message: "Missing Enrollment - Linked.",
            extra: { uploadDestination, routeKey: route.routeKey, targetTable: route.targetTable },
        });
        return;
    }

    if (!targetRecordId) {
        await stopWithAssetUpdate({
            statusOut: "skipped",
            actionOut: "skipped_pending_link",
            uploadStatus: CONFIG.values.statusPendingLink,
            uploadError: `Waiting for linked ${route.targetTable} record before Make upload.`,
            message: `Missing target ${route.targetTable} link.`,
            extra: {
                uploadDestination,
                routeKey: route.routeKey,
                targetTable: route.targetTable,
                targetRecordId: "",
            },
        });
        return;
    }

    if (attachmentCount === 0) {
        await stopWithAssetUpdate({
            statusOut: "error",
            actionOut: "error_missing_attachment",
            uploadStatus: CONFIG.values.statusError,
            uploadError: "Airtable Attachment is missing.",
            message: "Missing Airtable Attachment.",
            extra: {
                uploadDestination,
                routeKey: route.routeKey,
                targetTable: route.targetTable,
                targetRecordId,
            },
        });
        return;
    }

    /************************************************************
     * SECTION 7: BUILD MINIMAL PAYLOAD
     ************************************************************/

    setDebug("5 - Build Payload");

    const sentAtIso = new Date().toISOString();

    const payload = {
        sourceName: CONFIG.values.sourceName,
        automationNumber,
        sentAtIso,
        routeKey: route.routeKey,
        uploadDestination: route.uploadDestination,
        sourceTable: CONFIG.tables.submissionAssets,
        submissionAssetRecordId: recordId,
        targetTable: route.targetTable,
        targetRecordId,
    };

    console.log(`${automationNumber} payload`);
    console.log(JSON.stringify(payload, null, 2));

    /************************************************************
     * SECTION 8: SEND WEBHOOK
     ************************************************************/

    setDebug("6 - Send Webhook");

    let response = null;
    let responseText = "";

    try {
        response = await postJson(makeWebhookUrl, payload);
        responseText = await response.text();
    } catch (error) {
        const message = `${automationNumber} Make webhook request failed: ${error.message || error}`;

        await stopWithAssetUpdate({
            statusOut: "error",
            actionOut: "error_webhook_request",
            uploadStatus: CONFIG.values.statusError,
            uploadError: message,
            message,
            extra: {
                uploadDestination,
                routeKey: route.routeKey,
                targetTable: route.targetTable,
                targetRecordId,
            },
        });
        return;
    }

    if (!response || !response.ok) {
        const message = `${automationNumber} Make webhook returned HTTP ${response?.status || "unknown"}: ${getResponsePreview(responseText)}`;

        await stopWithAssetUpdate({
            statusOut: "error",
            actionOut: "error_webhook_response",
            uploadStatus: CONFIG.values.statusError,
            uploadError: message,
            message,
            extra: {
                uploadDestination,
                routeKey: route.routeKey,
                targetTable: route.targetTable,
                targetRecordId,
                makeStatus: String(response?.status || ""),
                makeResponse: getResponsePreview(responseText),
            },
        });
        return;
    }

    /************************************************************
     * SECTION 9: SUCCESS WRITEBACK
     ************************************************************/

    setDebug("7 - Success Writeback");

    const successFields = {};

    setStatus(successFields, assetsTable, CONFIG.values.statusProcessing);
    setWritable(successFields, assetsTable, CONFIG.fields.uploadError, "");
    setWritable(successFields, assetsTable, CONFIG.fields.sendToMakeTrigger, false);

    await updateAsset(assetsTable, recordId, successFields);

    /************************************************************
     * SECTION 10: OUTPUTS
     ************************************************************/

    setDebug("8 - Done");

    const result = {
        ok: true,
        skipped: false,
        statusOut: "success",
        actionOut: "sent_to_make",
        errorOut: "",
        message: `${automationNumber} asset sent to Make successfully.`,
        submissionAssetRecordId: recordId,
        targetRecordId,
        targetTable: route.targetTable,
        routeKey: route.routeKey,
        uploadDestination: route.uploadDestination,
        automationNumber,
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

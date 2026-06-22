/*
Automation: 070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-22
Last GitHub Update: 2026-06-22

Purpose:
Sends one homework Submission Asset to the Make Upload Engine when Upload Status is Pending Link.

Trigger:
Submission Assets when Send to Make Trigger is checked and homework asset is ready.

Important Tables:
Submission Assets

Important Fields:
Upload Status, Send to Make Trigger, Airtable Attachment, Homework Completions, Google Drive File URL

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************
 * 070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make
 *
 * Version: v2.2
 * Date Written: 2026-06-19
 * Last Updated: 2026-06-22
 *
 * PURPOSE
 * - Sends one homework Submission Assets record to Make.com Upload Engine.
 * - Requires Upload Destination = Homework Completions and Upload Status = Pending Link.
 * - Marks Upload Status Processing before webhook; Make writes Uploaded or Error.
 *
 * IMPORTANT DESIGN RULES
 * - Make send gate is Pending Link (same ladder as 009, 013, 020, 070b).
 * - Does not set final Uploaded status; Make owns writeback.
 * - Payload must include attachment.url for Make HTTP download.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make
 *
 * TRIGGER TABLE
 * - Submission Assets
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Send to Make Trigger is checked
 * - Ready to Send to Make? contains READY_TO_SEND
 * - Upload Status is Pending Link
 * - Upload Destination is Homework Completions
 * - Google Drive File URL is empty
 * - Google Drive File ID is empty
 * - Submission - Linked is not empty
 * - Enrollment - Linked is not empty
 * - Airtable Attachment is not empty
 * - Homework Completions is not empty
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Submission Assets record
 * - webhookUrl = Make.com webhook URL
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut, actionOut, errorOut, debugStep (when mapped)
 * - ok, skipped, message, submissionAssetRecordId, makeStatus, makeResponse
 *
 * IMPORTANT NOTES
 * - Map Make HTTP Download URL to {{1.attachment.url}}.
 * - This is not the video upload automation (070b).
 ************************************************************/

// @ts-nocheck

async function main() {
    /************************************************************
     * SECTION 1: CONFIG
     ************************************************************/

    const CONFIG = {
        scriptName: "070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make",
        version: "v2.2",

        automation: {
            number: "070a",
            name: "070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make",
            routeKey: "homework",
            sourceName: "Airtable Homework Submission Asset Automation",
        },

        tables: {
            submissionAssets: "Submission Assets",
        },

        fields: {
            assetKey: "Asset Key",
            assetLabel: "Asset Label",
            assetType: "Asset Type",
            assetPurpose: "Asset Purpose",
            assetSlot: "Asset Slot",
            assetSlotBase: "Asset Slot Base",

            uploadDestination: "Upload Destination",

            originalFileName: "Original File Name",
            airtableAttachment: "Airtable Attachment",

            googleDriveFolderId: "Google Drive Folder ID",
            googleDriveFolderUrl: "Google Drive Folder URL",
            googleDriveFolderName: "Google Drive Folder Name",
            googleDriveFileName: "Create Google Drive File Name",
            googleDriveFileId: "Google Drive File ID",
            googleDriveFileUrl: "Google Drive File URL",

            sourceAttachmentId: "Source Attachment ID",

            submissionLinked: "Submission - Linked",
            enrollmentLinked: "Enrollment - Linked",

            homeworkCompletions: "Homework Completions",
            homeworkCompletionsRid: "Homework Completions RID",
            homeworkCompletionRecordId: "Homework Completion Record ID",

            videoFeedback: "Video Feedback",

            sendToMakeTrigger: "Send to Make Trigger",
            uploadStatus: "Upload Status",
            uploadError: "Upload Error",
            uploadedAt: "Uploaded At",

            readyToSendToMake: "Ready to Send to Make?",
            whyNotReadyForMake: "Why Not Ready for Make?",
        },

        values: {
            uploadDestinationHomework: "Homework Completions",

            statusPendingLink: "Pending Link",
            statusProcessing: "Processing",
            statusError: "Error",
        },

        debug: {
            logToConsole: true,
        },
    };


    /************************************************************
     * SECTION 2: INPUTS
     ************************************************************/

    const inputConfig = input.config();

    const recordId = normalizeText(inputConfig.recordId);
    const webhookUrl = normalizeText(inputConfig.webhookUrl);

    if (!recordId) {
        throw new Error("Missing required input variable: recordId");
    }

    if (!recordId.startsWith("rec")) {
        throw new Error(`Invalid recordId input. Expected Airtable record ID, received: ${recordId}`);
    }

    if (!webhookUrl) {
        throw new Error("Missing required input variable: webhookUrl");
    }


    /************************************************************
     * SECTION 3: TABLE
     ************************************************************/

    const assetsTable = base.getTable(CONFIG.tables.submissionAssets);


    /************************************************************
     * SECTION 4: HELPERS
     ************************************************************/

    function logDebug(label, value = null) {
        if (!CONFIG.debug.logToConsole) {
            return;
        }

        if (value === null || value === undefined) {
            console.log(label);
            return;
        }

        try {
            console.log(label, JSON.stringify(value, null, 2));
        } catch {
            console.log(label, value);
        }
    }

    function normalizeText(value) {
        return String(value ?? "").trim();
    }

    function normalizeRouteValue(value) {
        return String(value ?? "")
            .replace(/\u00A0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function fieldExists(table, fieldName) {
        if (!table || !fieldName) {
            return false;
        }

        try {
            table.getField(fieldName);
            return true;
        } catch {
            return false;
        }
    }

    function getField(table, fieldName) {
        if (!fieldExists(table, fieldName)) {
            return null;
        }

        return table.getField(fieldName);
    }

    function getSafeFields(table, fieldNames) {
        return [...new Set(fieldNames)].filter((fieldName) => fieldExists(table, fieldName));
    }

    function getRaw(record, fieldName) {
        if (!record || !fieldExists(assetsTable, fieldName)) {
            return null;
        }

        return record.getCellValue(fieldName);
    }

    function getText(record, fieldName) {
        if (!record || !fieldExists(assetsTable, fieldName)) {
            return "";
        }

        return normalizeText(record.getCellValueAsString(fieldName));
    }

    function getCheckbox(record, fieldName) {
        return getRaw(record, fieldName) === true;
    }

    function getSingleSelectName(record, fieldName) {
        const raw = getRaw(record, fieldName);

        if (raw && typeof raw === "object" && "name" in raw) {
            return normalizeText(raw.name);
        }

        return getText(record, fieldName);
    }

    function getLinkedIds(record, fieldName) {
        const raw = getRaw(record, fieldName);

        if (!Array.isArray(raw)) {
            return [];
        }

        return raw
            .map((item) => item?.id)
            .filter(Boolean);
    }

    function getAttachments(record, fieldName) {
        const raw = getRaw(record, fieldName);

        if (!Array.isArray(raw)) {
            return [];
        }

        return raw;
    }

    function isWritableField(table, fieldName) {
        const field = getField(table, fieldName);

        if (!field) {
            return false;
        }

        const nonWritableTypes = new Set([
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

        return !nonWritableTypes.has(field.type);
    }

    function hasSingleSelectOption(table, fieldName, optionName) {
        const field = getField(table, fieldName);

        if (!field || field.type !== "singleSelect") {
            return false;
        }

        const choices = field.options?.choices || [];
        return choices.some((choice) => choice.name === optionName);
    }

    function setStatus(fields, statusName) {
        const fieldName = CONFIG.fields.uploadStatus;

        if (!isWritableField(assetsTable, fieldName)) {
            return;
        }

        const field = getField(assetsTable, fieldName);

        if (field?.type === "singleSelect") {
            if (hasSingleSelectOption(assetsTable, fieldName, statusName)) {
                fields[fieldName] = { name: statusName };
            }
            return;
        }

        fields[fieldName] = statusName;
    }

    function setWritable(fields, fieldName, value) {
        if (!isWritableField(assetsTable, fieldName)) {
            return;
        }

        fields[fieldName] = value;
    }

    async function updateAsset(fields) {
        if (!fields || Object.keys(fields).length === 0) {
            return;
        }

        await assetsTable.updateRecordAsync(recordId, fields);
    }

    function buildAttachmentPayload(attachments) {
        return attachments.map((attachment, index) => {
            const thumbnailSmall = attachment.thumbnails?.small?.url || "";
            const thumbnailLarge = attachment.thumbnails?.large?.url || "";
            const thumbnailFull = attachment.thumbnails?.full?.url || "";

            return {
                index,

                airtableAttachmentId: attachment.id || "",
                id: attachment.id || "",

                url: attachment.url || "",

                originalFileName: attachment.filename || "",
                filename: attachment.filename || "",
                fileName: attachment.filename || "",

                fileSizeBytes: attachment.size || null,
                size: attachment.size || null,

                mimeType: attachment.type || "",
                type: attachment.type || "",

                thumbnailUrl: thumbnailFull || thumbnailLarge || thumbnailSmall || "",
                thumbnails: attachment.thumbnails || null,
            };
        });
    }

    function getResponseTextPreview(text) {
        const raw = String(text || "");

        if (raw.length > 1000) {
            return `${raw.slice(0, 1000)}...`;
        }

        return raw;
    }

    function setOutputs(result) {
        output.set("ok", !!result.ok);
        output.set("skipped", !!result.skipped);
        output.set("submissionAssetRecordId", result.submissionAssetRecordId || recordId);
        output.set("uploadDestination", result.uploadDestination || "");
        output.set("routeKey", result.routeKey || CONFIG.automation.routeKey);
        output.set("homeworkCompletionRecordId", result.homeworkCompletionRecordId || "");
        output.set("videoFeedbackRecordId", result.videoFeedbackRecordId || "");
        output.set("attachmentUrlPresent", !!result.attachmentUrlPresent);
        output.set("makeStatus", result.makeStatus || "");
        output.set("makeResponse", result.makeResponse || "");
        output.set("statusOut", result.statusOut || "");
        output.set("errorOut", result.errorOut || "");
        output.set("detailsJson", JSON.stringify(result, null, 2));
    }

    async function failAndStop(message, extra = {}) {
        const fields = {};

        setStatus(fields, CONFIG.values.statusError);
        setWritable(fields, CONFIG.fields.uploadError, message);

        await updateAsset(fields);

        const result = {
            ok: false,
            skipped: false,
            message,
            routeKey: CONFIG.automation.routeKey,
            submissionAssetRecordId: recordId,
            statusOut: CONFIG.values.statusError,
            errorOut: message,
            ...extra,
        };

        logDebug("070a failed", result);
        setOutputs(result);

        throw new Error(message);
    }


    /************************************************************
     * SECTION 5: LOAD RECORD
     ************************************************************/

    const fieldsToLoad = getSafeFields(assetsTable, Object.values(CONFIG.fields));

    const query = await assetsTable.selectRecordsAsync({
        fields: fieldsToLoad,
    });

    const assetRecord = query.records.find((record) => record.id === recordId);

    if (!assetRecord) {
        throw new Error(`Submission Assets record not found: ${recordId}`);
    }


    /************************************************************
     * SECTION 6: READ CURRENT RECORD STATE
     ************************************************************/

    const uploadDestination = getText(assetRecord, CONFIG.fields.uploadDestination);
    const normalizedDestination = normalizeRouteValue(uploadDestination);
    const expectedDestination = normalizeRouteValue(CONFIG.values.uploadDestinationHomework);

    const sendToMakeTrigger = getCheckbox(assetRecord, CONFIG.fields.sendToMakeTrigger);
    const readyToSendToMake = getText(assetRecord, CONFIG.fields.readyToSendToMake);
    const whyNotReadyForMake = getText(assetRecord, CONFIG.fields.whyNotReadyForMake);
    const uploadStatus = getSingleSelectName(assetRecord, CONFIG.fields.uploadStatus);

    const attachments = getAttachments(assetRecord, CONFIG.fields.airtableAttachment);
    const attachmentPayload = buildAttachmentPayload(attachments);
    const firstAttachment = attachmentPayload[0] || null;

    const homeworkCompletionIds = getLinkedIds(assetRecord, CONFIG.fields.homeworkCompletions);
    const homeworkCompletionsRid = getText(assetRecord, CONFIG.fields.homeworkCompletionsRid);

    const homeworkCompletionRecordId = (
        getText(assetRecord, CONFIG.fields.homeworkCompletionRecordId) ||
        homeworkCompletionsRid ||
        homeworkCompletionIds[0] ||
        ""
    );

    const submissionRecordIds = getLinkedIds(assetRecord, CONFIG.fields.submissionLinked);
    const enrollmentRecordIds = getLinkedIds(assetRecord, CONFIG.fields.enrollmentLinked);

    const googleDriveFileId = getText(assetRecord, CONFIG.fields.googleDriveFileId);
    const googleDriveFileUrl = getText(assetRecord, CONFIG.fields.googleDriveFileUrl);

    const googleDriveFolderId = getText(assetRecord, CONFIG.fields.googleDriveFolderId);
    const googleDriveFolderUrl = getText(assetRecord, CONFIG.fields.googleDriveFolderUrl);
    const googleDriveFolderName = getText(assetRecord, CONFIG.fields.googleDriveFolderName);
    const googleDriveFileName = getText(assetRecord, CONFIG.fields.googleDriveFileName);

    logDebug("070a current asset state", {
        recordId,
        uploadDestination,
        sendToMakeTrigger,
        readyToSendToMake,
        whyNotReadyForMake,
        uploadStatus,
        attachmentCount: attachmentPayload.length,
        firstAttachmentUrlPresent: Boolean(firstAttachment?.url),
        homeworkCompletionIds,
        homeworkCompletionsRid,
        homeworkCompletionRecordId,
        submissionRecordIds,
        enrollmentRecordIds,
        googleDriveFileId,
        googleDriveFileUrl,
        googleDriveFolderId,
        googleDriveFolderUrl,
        googleDriveFolderName,
        googleDriveFileName,
    });


    /************************************************************
     * SECTION 7: VALIDATE HOMEWORK ROUTE
     ************************************************************/

    if (normalizedDestination !== expectedDestination) {
        await failAndStop(`070a route mismatch: expected Upload Destination = Homework Completions, got "${uploadDestination}".`, {
            uploadDestination,
        });
    }

    if (!sendToMakeTrigger) {
        await failAndStop("070a cannot send: Send to Make Trigger is not checked.", {
            uploadDestination,
            readyToSendToMake,
            whyNotReadyForMake,
            uploadStatus,
        });
    }

    if (!String(readyToSendToMake || "").includes("READY_TO_SEND")) {
        await failAndStop(`070a cannot send: Ready to Send to Make? is "${readyToSendToMake || "blank"}", not READY_TO_SEND.`, {
            uploadDestination,
            readyToSendToMake,
            whyNotReadyForMake,
            uploadStatus,
        });
    }

    if (normalizeRouteValue(uploadStatus) !== normalizeRouteValue(CONFIG.values.statusPendingLink)) {
        await failAndStop(`070a cannot send: Upload Status must be Pending Link. Current value: ${uploadStatus || "[blank]"}.`, {
            uploadDestination,
            readyToSendToMake,
            whyNotReadyForMake,
            uploadStatus,
        });
    }

    if (attachments.length === 0) {
        await failAndStop("070a cannot send: Airtable Attachment is empty.", {
            uploadDestination,
            readyToSendToMake,
            whyNotReadyForMake,
            uploadStatus,
        });
    }

    if (!firstAttachment || !firstAttachment.url) {
        await failAndStop("070a cannot send: First Airtable Attachment does not have a URL.", {
            uploadDestination,
            attachmentCount: attachmentPayload.length,
            firstAttachment,
        });
    }

    if (submissionRecordIds.length === 0) {
        await failAndStop("070a cannot send: Submission - Linked is missing.", {
            uploadDestination,
        });
    }

    if (enrollmentRecordIds.length === 0) {
        await failAndStop("070a cannot send: Enrollment - Linked is missing.", {
            uploadDestination,
        });
    }

    if (homeworkCompletionIds.length === 0 && !homeworkCompletionRecordId) {
        await failAndStop("070a cannot send: Homework Completions link/RID is missing. Run the Homework Completion linking automation first.", {
            uploadDestination,
        });
    }

    if (googleDriveFileId || googleDriveFileUrl) {
        await failAndStop("070a cannot send: Google Drive File ID or URL already exists. Duplicate upload blocked.", {
            uploadDestination,
            googleDriveFileId,
            googleDriveFileUrl,
        });
    }

    if (!googleDriveFolderName) {
        await failAndStop("070a cannot send: Google Drive Folder Name is blank.", {
            uploadDestination,
        });
    }

    if (!googleDriveFileName) {
        await failAndStop("070a cannot send: Create Google Drive File Name is blank.", {
            uploadDestination,
        });
    }


    /************************************************************
     * SECTION 8: PRE-SEND UPDATE
     ************************************************************/

    const preSendFields = {};

    setStatus(preSendFields, CONFIG.values.statusProcessing);
    setWritable(preSendFields, CONFIG.fields.uploadError, "");

    await updateAsset(preSendFields);


    /************************************************************
     * SECTION 9: BUILD MAKE PAYLOAD
     ************************************************************/

    const sentAtIso = new Date().toISOString();

    const payload = {
        sourceName: CONFIG.automation.sourceName,
        automationNumber: CONFIG.automation.number,
        automationName: CONFIG.automation.name,
        sentAtIso,
        sentAt: sentAtIso,

        submissionAssetRecordId: recordId,

        assetKey: getText(assetRecord, CONFIG.fields.assetKey),
        assetLabel: getText(assetRecord, CONFIG.fields.assetLabel),
        assetType: getSingleSelectName(assetRecord, CONFIG.fields.assetType),
        assetPurpose: getSingleSelectName(assetRecord, CONFIG.fields.assetPurpose),
        assetSlot: getSingleSelectName(assetRecord, CONFIG.fields.assetSlot),
        assetSlotBase: getText(assetRecord, CONFIG.fields.assetSlotBase),

        uploadDestination,
        uploadDestinationRaw: uploadDestination,
        routeKey: CONFIG.automation.routeKey,

        targetRecordId: homeworkCompletionRecordId,

        submissionRecordId: submissionRecordIds[0] || "",
        submissionRecordIds,

        enrollmentRecordId: enrollmentRecordIds[0] || "",
        enrollmentRecordIds,

        homeworkCompletionRecordId,
        homeworkCompletionRecordIds: homeworkCompletionIds,
        homeworkCompletionsRid,

        videoFeedbackRecordId: "",
        videoFeedbackRecordIds: [],

        originalFileName: getText(assetRecord, CONFIG.fields.originalFileName),
        sourceAttachmentId: getText(assetRecord, CONFIG.fields.sourceAttachmentId),

        googleDriveFolderId,
        googleDriveFolderUrl,
        googleDriveFolderName,
        googleDriveFileName,

        attachmentCount: attachmentPayload.length,
        attachments: attachmentPayload,

        /*
         * Preferred current single-file object for Make.com.
         * Map HTTP > Download a file > URL to:
         * {{1.attachment.url}}
         */
        attachment: firstAttachment,

        /*
         * Backward-compatible aliases.
         * These prevent old Make mappings from failing while you clean up the webhook structure.
         */
        firstAttachment,
        primaryAttachment: firstAttachment,

        readyToSendToMake,
        whyNotReadyForMake,
        uploadStatusBeforeSend: uploadStatus,

        makeWriteback: {
            baseId: "appn84sqPw03zEbTT",
            tableName: CONFIG.tables.submissionAssets,
            recordId,

            uploadStatusField: CONFIG.fields.uploadStatus,
            uploadErrorField: CONFIG.fields.uploadError,
            uploadedAtField: CONFIG.fields.uploadedAt,

            googleDriveFileIdField: CONFIG.fields.googleDriveFileId,
            googleDriveFileUrlField: CONFIG.fields.googleDriveFileUrl,
            googleDriveFolderIdField: CONFIG.fields.googleDriveFolderId,
            googleDriveFolderUrlField: CONFIG.fields.googleDriveFolderUrl,
        },
    };

    logDebug("070a payload sent to Make", payload);


    /************************************************************
     * SECTION 10: SEND TO MAKE
     ************************************************************/

    let response = null;
    let responseText = "";

    try {
        response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        responseText = await response.text();
    } catch (error) {
        await failAndStop(`070a Make webhook request failed: ${error.message || error}`, {
            uploadDestination,
            homeworkCompletionRecordId,
            attachmentUrlPresent: Boolean(firstAttachment?.url),
        });
    }

    if (!response || !response.ok) {
        await failAndStop(`070a Make webhook returned HTTP ${response?.status || "unknown"}: ${getResponseTextPreview(responseText)}`, {
            uploadDestination,
            homeworkCompletionRecordId,
            makeStatus: String(response?.status || ""),
            makeResponse: getResponseTextPreview(responseText),
            attachmentUrlPresent: Boolean(firstAttachment?.url),
        });
    }


    /************************************************************
     * SECTION 11: SUCCESS WRITEBACK
     ************************************************************/

    const successFields = {};

    /*
     * This script only confirms handoff to Make.
     * Make must write final Upload Status = Uploaded after Google Drive succeeds.
     */
    setWritable(successFields, CONFIG.fields.sendToMakeTrigger, false);
    setWritable(successFields, CONFIG.fields.uploadError, "");

    await updateAsset(successFields);


    /************************************************************
     * SECTION 12: OUTPUTS
     ************************************************************/

    const result = {
        ok: true,
        skipped: false,
        message: "070a homework asset sent to Make successfully.",
        submissionAssetRecordId: recordId,
        uploadDestination,
        routeKey: CONFIG.automation.routeKey,
        homeworkCompletionRecordId,
        videoFeedbackRecordId: "",
        attachmentUrlPresent: Boolean(firstAttachment?.url),
        makeStatus: String(response.status),
        makeResponse: getResponseTextPreview(responseText),
        statusOut: CONFIG.values.statusProcessing,
        errorOut: "",
    };

    logDebug("070a result", result);
    setOutputs(result);
}

await main();

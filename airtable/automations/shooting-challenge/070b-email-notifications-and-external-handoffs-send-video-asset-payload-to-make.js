/*
Automation: 070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make
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

/********************************************************************
 * AUTOMATION:
 * 070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make
 *
 * VERSION:
 * v2.1
 *
 * SYSTEM:
 * Shooting Challenge App
 *
 * PURPOSE:
 * - Sends one Video Feedback Submission Asset to the shared Make.com Upload Engine.
 * - Uses the same payload structure as the working homework upload path.
 * - Critical Make field:
 *      attachment.url
 * - Make HTTP Download File module should map URL to:
 *      {{1.attachment.url}}
 *
 * TRIGGER TABLE:
 * - Submission Assets
 *
 * REQUIRED TRIGGER CONDITIONS:
 * - Ready to Send to Make? contains READY_TO_SEND
 * - Google Drive File URL is empty
 * - Google Drive File ID is empty
 * - Upload Destination is Video Feedback
 * - Submission - Linked is not empty
 * - Enrollment - Linked is not empty
 * - Airtable Attachment is not empty
 * - Video Feedback is not empty
 * - Upload Status is Pending Link
 *
 * REQUIRED INPUT VARIABLE:
 * - recordId = Airtable record ID from triggering Submission Assets record
 *
 * MAKE OWNS:
 * - Downloading file from Airtable attachment URL
 * - Uploading file to Google Drive
 * - Writing back Uploaded status / file IDs / URLs to Submission Assets
 * - Writing back Uploaded status / file IDs / URLs to Video Feedback
 ********************************************************************/

// @ts-nocheck

async function main() {
    /* =========================================================
       CONFIG
       ========================================================= */

    const CONFIG = {
        automationNumber: "070b",
        automationName: "070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make",
        sourceName: "Airtable Video Submission Asset Automation",
        routeKey: "video_feedback",

        makeWebhookUrl: "https://hook.us1.make.com/xlthbec9y6104mqr53y3sl9k7socmfwm",

        tables: {
            submissionAssets: "Submission Assets",
            videoFeedback: "Video Feedback",
        },

        assetFields: {
            primaryName: "Submission Assets Full Name",
            recordIdFormula: "RecordId",

            submissionLinked: "Submission - Linked",
            enrollmentLinked: "Enrollment - Linked",
            videoFeedback: "Video Feedback",

            assetKey: "Asset Key",
            assetLabel: "Asset Label",
            assetType: "Asset Type",
            assetPurpose: "Asset Purpose",
            assetSlot: "Asset Slot",
            assetSlotBase: "Asset Slot Base",

            uploadDestination: "Upload Destination",
            readyToSendToMake: "Ready to Send to Make?",
            whyNotReadyForMake: "Why Not Ready for Make?",
            workflowNextStep: "Workflow Next Step",

            airtableAttachment: "Airtable Attachment",
            originalFileName: "Original File Name",
            sourceAttachmentId: "Source Attachment ID",

            googleDriveFolderName: "Google Drive Folder Name",
            googleDriveFileName: "Create Google Drive File Name",
            googleDriveFolderId: "Google Drive Folder ID",
            googleDriveFolderUrl: "Google Drive Folder URL",
            googleDriveFileId: "Google Drive File ID",
            googleDriveFileUrl: "Google Drive File URL",

            sendToMakeTrigger: "Send to Make Trigger",
            uploadStatus: "Upload Status",
            uploadError: "Upload Error",
            uploadedAt: "Uploaded At",
        },

        videoFields: {
            uploadStatus: "Upload Status",
            uploadError: "Upload Error",
            submissionAsset: "Submission Asset",
            googleDriveFileId: "Google Drive File ID",
            googleDriveFileUrl: "Google Drive File URL",
            googleDriveViewUrl: "Google Drive View URL",
            googleDriveDownloadUrl: "Google Drive Download URL",
            googleDriveFolderId: "Google Drive Folder ID",
            googleDriveFolderUrl: "Google Drive Folder URL",
            videoAssetUploadedAt: "Video Asset Uploaded At",
            videoAssetFileName: "Video Asset File Name",
            videoUrlOrDriveLink: "Video URL or Drive Link",
        },

        values: {
            uploadDestinationVideo: "Video Feedback",
            readyToSendValue: "READY_TO_SEND",
            statusPendingLink: "Pending Link",
            statusProcessing: "Processing",
            statusError: "Error",
        },
    };

    /* =========================================================
       HELPERS
       ========================================================= */

    function text(value) {
        return String(value ?? "").trim();
    }

    function comparable(value) {
        return String(value ?? "")
            .replace(/\u00A0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function fieldExists(table, fieldName) {
        try {
            table.getField(fieldName);
            return true;
        } catch {
            return false;
        }
    }

    function requireField(table, fieldName) {
        if (!fieldExists(table, fieldName)) {
            throw new Error(`Missing required field: ${table.name} -> ${fieldName}`);
        }
    }

    function getRaw(record, table, fieldName) {
        if (!record || !fieldExists(table, fieldName)) return null;
        return record.getCellValue(fieldName);
    }

    function getText(record, table, fieldName) {
        if (!record || !fieldExists(table, fieldName)) return "";
        return text(record.getCellValueAsString(fieldName));
    }

    function getSingleSelectName(record, table, fieldName) {
        const raw = getRaw(record, table, fieldName);

        if (raw && typeof raw === "object" && raw.name) {
            return text(raw.name);
        }

        return getText(record, table, fieldName);
    }

    function getLinkedIds(record, table, fieldName) {
        const raw = getRaw(record, table, fieldName);
        if (!Array.isArray(raw)) return [];

        return raw
            .map(item => item && item.id)
            .filter(Boolean);
    }

    function firstLinkedId(record, table, fieldName) {
        const ids = getLinkedIds(record, table, fieldName);
        return ids[0] || "";
    }

    function getAttachments(record, table, fieldName) {
        const raw = getRaw(record, table, fieldName);
        if (!Array.isArray(raw)) return [];
        return raw;
    }

    function singleSelectValue(optionName) {
        return { name: optionName };
    }

    function writableField(table, fieldName) {
        if (!fieldExists(table, fieldName)) return false;

        const field = table.getField(fieldName);

        const nonWritable = new Set([
            "formula",
            "rollup",
            "multipleLookupValues",
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

    function setWritable(fields, table, fieldName, value) {
        if (writableField(table, fieldName)) {
            fields[fieldName] = value;
        }
    }

    function setSingleSelect(fields, table, fieldName, optionName) {
        if (writableField(table, fieldName)) {
            fields[fieldName] = singleSelectValue(optionName);
        }
    }

    function buildAttachmentObject(attachment, fallbackOriginalFileName) {
        const thumbnails = attachment?.thumbnails || {};

        return {
            airtableAttachmentId: attachment?.id || "",
            originalFileName: attachment?.filename || fallbackOriginalFileName || "",
            mimeType: attachment?.type || "",
            fileSizeBytes: attachment?.size || null,
            url: attachment?.url || "",
            thumbnailUrl:
                thumbnails?.large?.url ||
                thumbnails?.full?.url ||
                thumbnails?.small?.url ||
                "",
        };
    }

    function buildFirstAttachmentAlias(attachment) {
        return {
            id: attachment?.id || "",
            url: attachment?.url || "",
            filename: attachment?.filename || "",
            size: attachment?.size || null,
            type: attachment?.type || "",
            thumbnails: attachment?.thumbnails || null,
        };
    }

    async function postJson(url, payload) {
        const request = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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

    function setOutputs(values) {
        output.set("ok", !!values.ok);
        output.set("automationNumber", CONFIG.automationNumber);
        output.set("automationName", CONFIG.automationName);
        output.set("routeKey", CONFIG.routeKey);

        output.set("submissionAssetRecordId", values.submissionAssetRecordId || "");
        output.set("videoFeedbackRecordId", values.videoFeedbackRecordId || "");
        output.set("submissionRecordId", values.submissionRecordId || "");
        output.set("enrollmentRecordId", values.enrollmentRecordId || "");

        output.set("uploadDestination", values.uploadDestination || "");
        output.set("uploadStatus", values.uploadStatus || "");
        output.set("readyToSendToMake", values.readyToSendToMake || "");

        output.set("attachmentUrl", values.attachmentUrl || "");
        output.set("originalFileName", values.originalFileName || "");
        output.set("googleDriveFileName", values.googleDriveFileName || "");
        output.set("googleDriveFolderName", values.googleDriveFolderName || "");

        output.set("makeStatus", values.makeStatus || "");
        output.set("makeResponse", values.makeResponse || "");
        output.set("errorOut", values.errorOut || "");
    }

    /* =========================================================
       INPUT
       ========================================================= */

    const cfg = input.config();

    const recordId = text(cfg.recordId);
    const makeWebhookUrl = text(cfg.makeWebhookUrl || CONFIG.makeWebhookUrl);

    if (!recordId) {
        throw new Error("Missing required input variable: recordId");
    }

    if (!makeWebhookUrl) {
        throw new Error("Missing Make webhook URL.");
    }

    /* =========================================================
       TABLES AND REQUIRED FIELDS
       ========================================================= */

    const assetTable = base.getTable(CONFIG.tables.submissionAssets);
    const videoTable = base.getTable(CONFIG.tables.videoFeedback);

    [
        CONFIG.assetFields.submissionLinked,
        CONFIG.assetFields.enrollmentLinked,
        CONFIG.assetFields.videoFeedback,
        CONFIG.assetFields.uploadDestination,
        CONFIG.assetFields.readyToSendToMake,
        CONFIG.assetFields.airtableAttachment,
        CONFIG.assetFields.googleDriveFileId,
        CONFIG.assetFields.googleDriveFileUrl,
        CONFIG.assetFields.googleDriveFolderName,
        CONFIG.assetFields.googleDriveFileName,
        CONFIG.assetFields.uploadStatus,
        CONFIG.assetFields.uploadError,
    ].forEach(fieldName => requireField(assetTable, fieldName));

    [
        CONFIG.videoFields.uploadStatus,
        CONFIG.videoFields.uploadError,
    ].forEach(fieldName => requireField(videoTable, fieldName));

    /* =========================================================
       LOAD RECORD
       ========================================================= */

    const assetRecord = await assetTable.selectRecordAsync(recordId);

    if (!assetRecord) {
        throw new Error(`Submission Assets record not found: ${recordId}`);
    }

    const uploadDestination = getText(assetRecord, assetTable, CONFIG.assetFields.uploadDestination);
    const readyToSendToMake = getText(assetRecord, assetTable, CONFIG.assetFields.readyToSendToMake);
    const whyNotReadyForMake = getText(assetRecord, assetTable, CONFIG.assetFields.whyNotReadyForMake);
    const workflowNextStep = getText(assetRecord, assetTable, CONFIG.assetFields.workflowNextStep);

    const uploadStatus = getSingleSelectName(assetRecord, assetTable, CONFIG.assetFields.uploadStatus);

    const googleDriveFileUrl = getText(assetRecord, assetTable, CONFIG.assetFields.googleDriveFileUrl);
    const googleDriveFileId = getText(assetRecord, assetTable, CONFIG.assetFields.googleDriveFileId);

    const submissionRecordId = firstLinkedId(assetRecord, assetTable, CONFIG.assetFields.submissionLinked);
    const enrollmentRecordId = firstLinkedId(assetRecord, assetTable, CONFIG.assetFields.enrollmentLinked);
    const videoFeedbackRecordId = firstLinkedId(assetRecord, assetTable, CONFIG.assetFields.videoFeedback);

    const attachments = getAttachments(assetRecord, assetTable, CONFIG.assetFields.airtableAttachment);
    const primaryAttachment = attachments[0] || null;

    const originalFileName = getText(assetRecord, assetTable, CONFIG.assetFields.originalFileName);
    const sourceAttachmentId = getText(assetRecord, assetTable, CONFIG.assetFields.sourceAttachmentId);

    const assetKey = getText(assetRecord, assetTable, CONFIG.assetFields.assetKey);
    const assetLabel = getText(assetRecord, assetTable, CONFIG.assetFields.assetLabel);
    const assetType = getSingleSelectName(assetRecord, assetTable, CONFIG.assetFields.assetType);
    const assetPurpose = getSingleSelectName(assetRecord, assetTable, CONFIG.assetFields.assetPurpose);
    const assetSlot = getSingleSelectName(assetRecord, assetTable, CONFIG.assetFields.assetSlot);
    const assetSlotBase = getText(assetRecord, assetTable, CONFIG.assetFields.assetSlotBase);

    const googleDriveFolderName = getText(assetRecord, assetTable, CONFIG.assetFields.googleDriveFolderName);
    const googleDriveFileName = getText(assetRecord, assetTable, CONFIG.assetFields.googleDriveFileName);
    const existingGoogleDriveFolderId = getText(assetRecord, assetTable, CONFIG.assetFields.googleDriveFolderId);
    const existingGoogleDriveFolderUrl = getText(assetRecord, assetTable, CONFIG.assetFields.googleDriveFolderUrl);

    /* =========================================================
       VALIDATION
       ========================================================= */

    if (comparable(uploadDestination) !== comparable(CONFIG.values.uploadDestinationVideo)) {
        throw new Error(`Upload Destination must be Video Feedback. Current value: ${uploadDestination || "[blank]"}`);
    }

    if (!readyToSendToMake.includes(CONFIG.values.readyToSendValue)) {
        throw new Error(`Ready to Send to Make? must contain ${CONFIG.values.readyToSendValue}. Current value: ${readyToSendToMake || "[blank]"}`);
    }

    if (comparable(uploadStatus) !== comparable(CONFIG.values.statusPendingLink)) {
        throw new Error(`Upload Status must be Pending Link. Current value: ${uploadStatus || "[blank]"}`);
    }

    if (googleDriveFileUrl) {
        throw new Error("Google Drive File URL is already populated. Duplicate upload blocked.");
    }

    if (googleDriveFileId) {
        throw new Error("Google Drive File ID is already populated. Duplicate upload blocked.");
    }

    if (!submissionRecordId) {
        throw new Error("Submission - Linked is empty.");
    }

    if (!enrollmentRecordId) {
        throw new Error("Enrollment - Linked is empty.");
    }

    if (!videoFeedbackRecordId) {
        throw new Error("Video Feedback is empty.");
    }

    if (!attachments.length || !primaryAttachment || !primaryAttachment.url) {
        throw new Error("Airtable Attachment is empty or missing attachment URL.");
    }

    if (!googleDriveFolderName) {
        throw new Error("Google Drive Folder Name is empty.");
    }

    if (!googleDriveFileName) {
        throw new Error("Create Google Drive File Name is empty.");
    }

    const videoRecord = await videoTable.selectRecordAsync(videoFeedbackRecordId);

    if (!videoRecord) {
        throw new Error(`Linked Video Feedback record not found: ${videoFeedbackRecordId}`);
    }

    /* =========================================================
       MARK PROCESSING BEFORE WEBHOOK
       ========================================================= */

    const assetProcessingUpdate = {};
    const videoProcessingUpdate = {};

    setSingleSelect(
        assetProcessingUpdate,
        assetTable,
        CONFIG.assetFields.uploadStatus,
        CONFIG.values.statusProcessing
    );

    setWritable(
        assetProcessingUpdate,
        assetTable,
        CONFIG.assetFields.uploadError,
        ""
    );

    setSingleSelect(
        videoProcessingUpdate,
        videoTable,
        CONFIG.videoFields.uploadStatus,
        CONFIG.values.statusProcessing
    );

    setWritable(
        videoProcessingUpdate,
        videoTable,
        CONFIG.videoFields.uploadError,
        ""
    );

    setWritable(
        videoProcessingUpdate,
        videoTable,
        CONFIG.videoFields.videoAssetFileName,
        originalFileName || primaryAttachment.filename || googleDriveFileName
    );

    if (Object.keys(assetProcessingUpdate).length) {
        await assetTable.updateRecordAsync(recordId, assetProcessingUpdate);
    }

    if (Object.keys(videoProcessingUpdate).length) {
        await videoTable.updateRecordAsync(videoFeedbackRecordId, videoProcessingUpdate);
    }

    /* =========================================================
       PAYLOAD
       ========================================================= */

    const attachment = buildAttachmentObject(primaryAttachment, originalFileName);
    const firstAttachment = buildFirstAttachmentAlias(primaryAttachment);

    const payload = {
        sourceName: CONFIG.sourceName,
        automationNumber: CONFIG.automationNumber,
        automationName: CONFIG.automationName,
        sentAtIso: new Date().toISOString(),

        routeKey: CONFIG.routeKey,
        uploadDestination,
        uploadDestinationRaw: uploadDestination,

        sourceTable: CONFIG.tables.submissionAssets,
        sourceRecordId: recordId,
        recordId,

        submissionAssetRecordId: recordId,
        targetRecordId: videoFeedbackRecordId,

        submissionRecordId,
        submissionRecordIds: submissionRecordId ? [submissionRecordId] : [],

        enrollmentRecordId,
        enrollmentRecordIds: enrollmentRecordId ? [enrollmentRecordId] : [],

        homeworkCompletionRecordId: "",
        videoFeedbackRecordId,

        assetKey,
        assetLabel,
        assetType,
        assetPurpose,
        assetSlot,
        assetSlotBase,

        readyToSendToMake,
        whyNotReadyForMake,
        workflowNextStep,

        googleDriveFolderName,
        googleDriveFileName,

        existingGoogleDriveFolderId,
        existingGoogleDriveFolderUrl,

        originalFileName: attachment.originalFileName,
        sourceAttachmentId: sourceAttachmentId || attachment.airtableAttachmentId,

        /*
         * THIS IS THE IMPORTANT OBJECT FOR MAKE.
         * HTTP > Download a file > URL must be mapped to:
         * {{1.attachment.url}}
         */
        attachment,

        /*
         * Backward-compatible aliases.
         */
        firstAttachment,
        primaryAttachment: firstAttachment,

        attachmentCount: attachments.length,

        attachments: attachments.map((item, index) => ({
            index,
            airtableAttachmentId: item.id || "",
            id: item.id || "",
            originalFileName: item.filename || "",
            filename: item.filename || "",
            mimeType: item.type || "",
            type: item.type || "",
            fileSizeBytes: item.size || null,
            size: item.size || null,
            url: item.url || "",
            thumbnailUrl:
                item.thumbnails?.large?.url ||
                item.thumbnails?.full?.url ||
                item.thumbnails?.small?.url ||
                "",
            thumbnails: item.thumbnails || null,
        })),

        writebackTargets: {
            submissionAssets: {
                tableName: CONFIG.tables.submissionAssets,
                recordId,
            },
            videoFeedback: {
                tableName: CONFIG.tables.videoFeedback,
                recordId: videoFeedbackRecordId,
            },
        },

        expectedMakeMappings: {
            httpDownloadUrl: "attachment.url",
            googleDriveFolderName: "googleDriveFolderName",
            googleDriveFileName: "googleDriveFileName",
            submissionAssetRecordId: "submissionAssetRecordId",
            videoFeedbackRecordId: "videoFeedbackRecordId",
        },
    };

    console.log("070b payload");
    console.log(JSON.stringify(payload, null, 2));

    /* =========================================================
       POST TO MAKE
       ========================================================= */

    let response = null;
    let responseText = "";

    try {
        response = await postJson(makeWebhookUrl, payload);
        responseText = await response.text();

        if (!response.ok) {
            throw new Error(`Make webhook failed with HTTP ${response.status}: ${responseText}`);
        }

        const assetSuccessUpdate = {};
        const videoSuccessUpdate = {};

        setWritable(
            assetSuccessUpdate,
            assetTable,
            CONFIG.assetFields.uploadError,
            ""
        );

        if (fieldExists(assetTable, CONFIG.assetFields.sendToMakeTrigger)) {
            setWritable(
                assetSuccessUpdate,
                assetTable,
                CONFIG.assetFields.sendToMakeTrigger,
                false
            );
        }

        setWritable(
            videoSuccessUpdate,
            videoTable,
            CONFIG.videoFields.uploadError,
            ""
        );

        if (Object.keys(assetSuccessUpdate).length) {
            await assetTable.updateRecordAsync(recordId, assetSuccessUpdate);
        }

        if (Object.keys(videoSuccessUpdate).length) {
            await videoTable.updateRecordAsync(videoFeedbackRecordId, videoSuccessUpdate);
        }

        setOutputs({
            ok: true,
            submissionAssetRecordId: recordId,
            videoFeedbackRecordId,
            submissionRecordId,
            enrollmentRecordId,
            uploadDestination,
            uploadStatus: CONFIG.values.statusProcessing,
            readyToSendToMake,
            attachmentUrl: attachment.url,
            originalFileName: attachment.originalFileName,
            googleDriveFileName,
            googleDriveFolderName,
            makeStatus: String(response.status),
            makeResponse: responseText,
            errorOut: "",
        });

    } catch (error) {
        const message = String(error?.message || error);

        const assetErrorUpdate = {};
        const videoErrorUpdate = {};

        setSingleSelect(
            assetErrorUpdate,
            assetTable,
            CONFIG.assetFields.uploadStatus,
            CONFIG.values.statusError
        );

        setWritable(
            assetErrorUpdate,
            assetTable,
            CONFIG.assetFields.uploadError,
            message
        );

        setSingleSelect(
            videoErrorUpdate,
            videoTable,
            CONFIG.videoFields.uploadStatus,
            CONFIG.values.statusError
        );

        setWritable(
            videoErrorUpdate,
            videoTable,
            CONFIG.videoFields.uploadError,
            message
        );

        if (Object.keys(assetErrorUpdate).length) {
            await assetTable.updateRecordAsync(recordId, assetErrorUpdate);
        }

        if (Object.keys(videoErrorUpdate).length) {
            await videoTable.updateRecordAsync(videoFeedbackRecordId, videoErrorUpdate);
        }

        setOutputs({
            ok: false,
            submissionAssetRecordId: recordId,
            videoFeedbackRecordId,
            submissionRecordId,
            enrollmentRecordId,
            uploadDestination,
            uploadStatus: CONFIG.values.statusError,
            readyToSendToMake,
            attachmentUrl: attachment?.url || "",
            originalFileName: attachment?.originalFileName || "",
            googleDriveFileName,
            googleDriveFolderName,
            makeStatus: response ? String(response.status) : "",
            makeResponse: responseText,
            errorOut: message,
        });

        throw error;
    }
}

await main();

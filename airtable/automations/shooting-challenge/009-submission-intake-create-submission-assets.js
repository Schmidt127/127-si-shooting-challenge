/*
Automation: 009 - Submission Intake - Create Submission Assets
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
 * 009 - Submission Intake - Create Submission Assets
 * Trigger Table: Submissions
 *
 * PURPOSE
 * For one Submission record:
 * - Create one Submission Assets record per uploaded file.
 * - Supports:
 *   - HW Sub 1 -> Homework 1 assets
 *   - HW Sub 2 -> Homework 2 assets
 *   - Video Upload -> Video For Feedback assets
 *
 * IMPORTANT
 * This script does NOT send files to Make.
 * This script does NOT mark homework assets Ready.
 * This script does NOT check Send to Make Trigger.
 *
 * Correct sequence:
 * 009 creates Submission Assets.
 * 020 creates/links Homework Completions and marks homework assets Ready.
 * 070a sends homework assets to Make only after Homework Completion link exists.
 ************************************************************/

const { recordId } = input.config();

if (!recordId) {
    throw new Error("Missing required input variable: recordId");
}

const CONFIG = {
    tables: {
        submissions: "Submissions",
        assets: "Submission Assets",
    },

    submissions: {
        name: "Submission Full Name",
        enrollment: "Enrollment",
        week: "Week",
        hwSub1: "HW Sub 1",
        hwSub2: "HW Sub 2",
        videoUpload: "Video Upload",
        homeworkName1: "Homework Name 1",
        homeworkName2: "Homework Name 2",
        submissionAssets: "Submission Assets",
        attachmentUploadStatus: "Attachment Upload Status",
        attachmentUploadError: "Attachment Upload Error",
    },

    assets: {
        name: "Submission Assets Full Name",
        submission: "Submission - Linked",
        enrollment: "Enrollment - Linked",
        assetLabel: "Asset Label",
        assetPurpose: "Asset Purpose",
        attachment: "Airtable Attachment",
        sourceAttachmentId: "Source Attachment ID",
        originalFileName: "Original File Name",
        assetType: "Asset Type",
        uploadStatus: "Upload Status",
        uploadError: "Upload Error",
        assetSlot: "Asset Slot",
        sendToMakeTrigger: "Send to Make Trigger",
    },
};

/************************************************************
 * Utility helpers
 ************************************************************/

function getField(table, fieldName) {
    return table.fields.find(f => f.name === fieldName);
}

function fieldExists(table, fieldName) {
    return Boolean(getField(table, fieldName));
}

function isWritable(table, fieldName) {
    const field = getField(table, fieldName);
    if (!field) return false;

    const readOnlyTypes = new Set([
        "formula",
        "rollup",
        "count",
        "lookup",
        "multipleLookupValues",
        "createdTime",
        "lastModifiedTime",
        "autoNumber",
        "createdBy",
        "lastModifiedBy",
        "button",
        "externalSyncSource",
    ]);

    return !readOnlyTypes.has(field.type);
}

function safeFields(table, fieldNames) {
    return [...new Set(fieldNames)].filter(name => fieldExists(table, name));
}

function cell(record, fieldName) {
    try {
        return record.getCellValue(fieldName);
    } catch {
        return null;
    }
}

function text(record, fieldName) {
    try {
        return record.getCellValueAsString(fieldName) || "";
    } catch {
        return "";
    }
}

function linkedIds(record, fieldName) {
    const value = cell(record, fieldName);
    if (!Array.isArray(value)) return [];
    return value.map(v => v.id).filter(Boolean);
}

function attachments(record, fieldName) {
    const value = cell(record, fieldName);
    return Array.isArray(value) ? value : [];
}

function choiceExists(table, fieldName, choiceName) {
    const field = getField(table, fieldName);
    if (!field || !field.options || !field.options.choices) return false;
    return field.options.choices.some(choice => choice.name === choiceName);
}

function setLink(fields, table, fieldName, ids) {
    if (!isWritable(table, fieldName)) return;

    const cleanIds = [...new Set((ids || []).filter(Boolean))];
    fields[fieldName] = cleanIds.map(id => ({ id }));
}

function setSingleSelect(fields, table, fieldName, choiceName) {
    if (!isWritable(table, fieldName)) return;
    if (!choiceName) return;
    if (!choiceExists(table, fieldName, choiceName)) return;

    fields[fieldName] = { name: choiceName };
}

function setCheckbox(fields, table, fieldName, value) {
    if (!isWritable(table, fieldName)) return;
    fields[fieldName] = Boolean(value);
}

function setText(fields, table, fieldName, value) {
    if (!isWritable(table, fieldName)) return;
    if (value === undefined || value === null || value === "") return;

    fields[fieldName] = String(value);
}

function setAttachment(fields, table, fieldName, file) {
    if (!isWritable(table, fieldName)) return;
    if (!file || !file.url) return;

    fields[fieldName] = [
        {
            url: file.url,
            filename: file.filename || "uploaded_file",
        },
    ];
}

function fileExtension(filename) {
    const clean = String(filename || "").toLowerCase();
    const parts = clean.split(".");
    if (parts.length < 2) return "";
    return parts.pop();
}

function inferAssetType(file, purpose) {
    const type = String(file.type || "").toLowerCase();
    const ext = fileExtension(file.filename);

    const imageExts = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic"]);
    const videoExts = new Set(["mp4", "mov", "m4v", "avi", "webm"]);
    const pdfExts = new Set(["pdf"]);
    const docExts = new Set(["doc", "docx", "pages"]);

    if (purpose === "Video For Feedback") return "Video Feedback";

    if (type.startsWith("image/") || imageExts.has(ext)) return "Homework Image";
    if (type.startsWith("video/") || videoExts.has(ext)) return "Video Feedback";
    if (type === "application/pdf" || pdfExts.has(ext)) return "Homework PDF";
    if (docExts.has(ext)) return "Homework Document";

    return "Other";
}

function sourceAttachmentId(file) {
    return file && file.id ? file.id : "";
}

function originalFileName(file) {
    return file && file.filename ? file.filename : "";
}

/************************************************************
 * Load tables and triggering Submission
 ************************************************************/

const submissionsTable = base.getTable(CONFIG.tables.submissions);
const assetsTable = base.getTable(CONFIG.tables.assets);

const submissionsQuery = await submissionsTable.selectRecordsAsync({
    fields: safeFields(submissionsTable, Object.values(CONFIG.submissions)),
});

const submission = submissionsQuery.getRecord(recordId);

if (!submission) {
    throw new Error(`Submission not found: ${recordId}`);
}

const enrollmentIds = linkedIds(submission, CONFIG.submissions.enrollment);
const weekIds = linkedIds(submission, CONFIG.submissions.week);

if (enrollmentIds.length === 0) {
    throw new Error(`Submission is missing Enrollment: ${recordId}`);
}

if (weekIds.length === 0) {
    throw new Error(`Submission is missing Week: ${recordId}`);
}

/************************************************************
 * Load existing assets to prevent duplicates
 ************************************************************/

const assetsQuery = await assetsTable.selectRecordsAsync({
    fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
});

const existingAssetKeys = new Set();

for (const asset of assetsQuery.records) {
    const linkedSubmissionIds = linkedIds(asset, CONFIG.assets.submission);
    if (!linkedSubmissionIds.includes(submission.id)) continue;

    const sourceId = text(asset, CONFIG.assets.sourceAttachmentId);
    if (sourceId) {
        existingAssetKeys.add(sourceId);
    }
}

/************************************************************
 * Build asset creation list
 ************************************************************/

const assetSources = [
    {
        fieldName: CONFIG.submissions.hwSub1,
        purpose: "Homework 1",
        slot: "HW1",
        labelPrefix: "HW1",
    },
    {
        fieldName: CONFIG.submissions.hwSub2,
        purpose: "Homework 2",
        slot: "HW2",
        labelPrefix: "HW2",
    },
    {
        fieldName: CONFIG.submissions.videoUpload,
        purpose: "Video For Feedback",
        slot: "VIDEO",
        labelPrefix: "VID",
    },
];

const creates = [];
const skipped = [];

for (const source of assetSources) {
    const files = attachments(submission, source.fieldName);

    files.forEach((file, index) => {
        const sourceId = sourceAttachmentId(file);

        if (!sourceId) {
            skipped.push({
                Reason: "Missing Airtable attachment ID",
                Field: source.fieldName,
                File: originalFileName(file),
            });
            return;
        }

        if (existingAssetKeys.has(sourceId)) {
            skipped.push({
                Reason: "Asset already exists",
                Field: source.fieldName,
                File: originalFileName(file),
                SourceAttachmentId: sourceId,
            });
            return;
        }

        const assetLabel = `${source.labelPrefix}-${index + 1}`;
        const assetType = inferAssetType(file, source.purpose);

        const fields = {};

        setLink(fields, assetsTable, CONFIG.assets.submission, [submission.id]);
        setLink(fields, assetsTable, CONFIG.assets.enrollment, enrollmentIds);

        setText(fields, assetsTable, CONFIG.assets.assetLabel, assetLabel);
        setText(fields, assetsTable, CONFIG.assets.sourceAttachmentId, sourceId);
        setText(fields, assetsTable, CONFIG.assets.originalFileName, originalFileName(file));

        setSingleSelect(fields, assetsTable, CONFIG.assets.assetPurpose, source.purpose);
        setSingleSelect(fields, assetsTable, CONFIG.assets.assetType, assetType);
        setSingleSelect(fields, assetsTable, CONFIG.assets.assetSlot, source.slot);

        /*
         * CRITICAL:
         * Do not set Upload Status to Ready here.
         * Do not check Send to Make Trigger here.
         *
         * 020 must link/create the Homework Completion first.
         * Then 020 marks homework assets Ready and checks Send to Make Trigger.
         */
        setSingleSelect(fields, assetsTable, CONFIG.assets.uploadStatus, "Pending Link");
        setCheckbox(fields, assetsTable, CONFIG.assets.sendToMakeTrigger, false);

        setAttachment(fields, assetsTable, CONFIG.assets.attachment, file);

        creates.push({
            fields,
            _meta: {
                field: source.fieldName,
                purpose: source.purpose,
                slot: source.slot,
                label: assetLabel,
                file: originalFileName(file),
                sourceAttachmentId: sourceId,
            },
        });
    });
}

/************************************************************
 * Create records
 ************************************************************/

console.log("===== 009 CREATE SUBMISSION ASSETS =====");
console.log(`Submission: ${submission.name}`);
console.log(`Submission ID: ${submission.id}`);
console.log(`Assets to create: ${creates.length}`);
console.log(`Skipped: ${skipped.length}`);

if (skipped.length > 0) {
    console.table(skipped);
}

let createdIds = [];

if (creates.length > 0) {
    for (let i = 0; i < creates.length; i += 50) {
        const batch = creates.slice(i, i + 50);
        const ids = await assetsTable.createRecordsAsync(
            batch.map(item => ({ fields: item.fields }))
        );
        createdIds.push(...ids);
    }
}

/************************************************************
 * Update parent Submission status
 ************************************************************/

const submissionUpdateFields = {};

if (createdIds.length > 0 || skipped.length > 0) {
    setSingleSelect(
        submissionUpdateFields,
        submissionsTable,
        CONFIG.submissions.attachmentUploadStatus,
        "Processing"
    );

    setText(
        submissionUpdateFields,
        submissionsTable,
        CONFIG.submissions.attachmentUploadError,
        ""
    );
} else {
    setSingleSelect(
        submissionUpdateFields,
        submissionsTable,
        CONFIG.submissions.attachmentUploadStatus,
        "No Files"
    );
}

if (Object.keys(submissionUpdateFields).length > 0) {
    await submissionsTable.updateRecordAsync(submission.id, submissionUpdateFields);
}

/************************************************************
 * Output
 ************************************************************/

if (createdIds.length > 0) {
    console.log("Created Submission Asset IDs:");
    console.table(createdIds.map((id, index) => ({
        CreatedAssetId: id,
        Field: creates[index]._meta.field,
        Purpose: creates[index]._meta.purpose,
        Slot: creates[index]._meta.slot,
        Label: creates[index]._meta.label,
        File: creates[index]._meta.file,
        SourceAttachmentId: creates[index]._meta.sourceAttachmentId,
    })));
} else {
    console.log("No new Submission Assets created.");
}

output.set("status", createdIds.length > 0 ? "assets_created" : "no_new_assets");
output.set("submissionId", submission.id);
output.set("createdAssetCount", createdIds.length);
output.set("createdAssetIds", createdIds);

console.log("009 complete.");

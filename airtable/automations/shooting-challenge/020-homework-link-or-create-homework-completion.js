/*
Automation: 020 - Homework - Link or Create Homework Completion
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
 * 020 - Homework - Link or Create Homework Completion
 * Trigger Table: Submission Assets
 *
 * PURPOSE
 * For one homework asset:
 * 1. Confirm it is a homework asset.
 * 2. Infer HW1/HW2.
 * 3. Find the correct Homework assignment from the linked Submission.
 * 4. Find or create the matching Homework Completion.
 * 5. Link the Submission Asset to the Homework Completion.
 * 6. Mark the asset ready for Make.com.
 *
 * IMPORTANT
 * This is asset-driven.
 * It does NOT stop just because the parent Submission already has
 * another Homework Completion.
 *
 * IMPORTANT ATTACHMENT NOTE
 * This script intentionally does NOT write to:
 * Homework Completions -> Airtable Attachment
 *
 * Reason:
 * That field is throwing:
 * Field "fldFTRL2bgrlhxSoD" cannot accept the provided value.
 *
 * Files remain available through the linked Submission Assets records.
 ************************************************************/

const { recordId } = input.config();

if (!recordId) {
    throw new Error("Missing required input variable: recordId");
}

const CONFIG = {
    tables: {
        assets: "Submission Assets",
        submissions: "Submissions",
        homework: "Homework Completions",
    },

    assets: {
        name: "Submission Assets Full Name",
        submission: "Submission - Linked",
        enrollment: "Enrollment - Linked",
        assetLabel: "Asset Label",
        uploadDestination: "Upload Destination",
        assetPurpose: "Asset Purpose",
        attachment: "Airtable Attachment",
        homeworkCompletions: "Homework Completions",
        sourceAttachmentId: "Source Attachment ID",
        originalFileName: "Original File Name",
        assetType: "Asset Type",
        uploadStatus: "Upload Status",
        uploadError: "Upload Error",
        uploadedAt: "Uploaded At",
        assetSlot: "Asset Slot",
        googleDriveFileUrl: "Google Drive File URL",
        googleDriveFileId: "Google Drive File ID",
        googleDriveFolderId: "Google Drive Folder ID",
        googleDriveFolderUrl: "Google Drive Folder URL",
        sendToMakeTrigger: "Send to Make Trigger",
    },

    submissions: {
        name: "Submission Full Name",
        enrollment: "Enrollment",
        week: "Week",
        activityDate: "Activity Date",
        gradeBand: "Grade Band",
        weeklySummary: "Weekly Athlete Summary",
        homeworkName1: "Homework Name 1",
        homeworkName2: "Homework Name 2",
    },

    homework: {
        name: "Homework Completion Full Name",
        homework: "Homework",
        submission: "Submissions - Linked",
        uploadStatus: "Upload Status",
        submissionAssets: "Submission Assets",
        enrollment: "Enrollment",
        week: "Week",
        gradeBand: "Grade Band",
        weeklySummaryLink: "Weekly Athlete Summary Link",
        submissionDate: "Submission Date",
        completionStatus: "Completion Status",
        assetLabel: "Asset Label",
        originalFileName: "Original File Name",
        assetType: "Asset Type",
        assetPurpose: "Asset Purpose",
        sourceSystem: "Source System",
        googleDriveFileId: "Google Drive File ID",
        googleDriveFileUrl: "Google Drive File URL",
        googleDriveFolderId: "Google Drive Folder ID",
        googleDriveFolderUrl: "Google Drive Folder URL",
        uploadError: "Upload Error",
        uploadedAt: "Uploaded At",
        assetSlot: "Asset Slot",
        itemType: "Item Type",
        itemSlot: "Item Slot",
        reviewStatus: "Review Status",
        automationError: "Automation Error",
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

function selectName(record, fieldName) {
    const value = cell(record, fieldName);
    return value && value.name ? value.name : "";
}

function linkedIds(record, fieldName) {
    const value = cell(record, fieldName);
    if (!Array.isArray(value)) return [];
    return value.map(v => v.id).filter(Boolean);
}

function firstLinkedId(record, fieldName) {
    return linkedIds(record, fieldName)[0] || null;
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

function setDate(fields, table, fieldName, value) {
    if (!isWritable(table, fieldName)) return;
    if (!value) return;

    fields[fieldName] = value;
}

function inferSlot(asset) {
    const existingSlot = selectName(asset, CONFIG.assets.assetSlot);
    if (existingSlot === "HW1" || existingSlot === "HW2") return existingSlot;

    const purpose = selectName(asset, CONFIG.assets.assetPurpose);
    if (purpose === "Homework 1") return "HW1";
    if (purpose === "Homework 2") return "HW2";

    const label = text(asset, CONFIG.assets.assetLabel);
    if (label.startsWith("HW1")) return "HW1";
    if (label.startsWith("HW2")) return "HW2";

    return "";
}

function homeworkFieldForSlot(slot) {
    if (slot === "HW1") return CONFIG.submissions.homeworkName1;
    if (slot === "HW2") return CONFIG.submissions.homeworkName2;
    return "";
}

function mapAssetUploadStatusToHomeworkStatus(assetStatus) {
    if (assetStatus === "Uploaded") return "Uploaded";
    if (assetStatus === "Processing") return "Processing";
    if (assetStatus === "Error") return "Error";
    return "Pending";
}

async function markAssetError(asset, message) {
    const fields = {};

    setSingleSelect(fields, assetsTable, CONFIG.assets.uploadStatus, "Error");
    setText(fields, assetsTable, CONFIG.assets.uploadError, message);

    if (Object.keys(fields).length > 0) {
        await assetsTable.updateRecordAsync(asset.id, fields);
    }

    throw new Error(message);
}

/************************************************************
 * Load tables
 ************************************************************/

const assetsTable = base.getTable(CONFIG.tables.assets);
const submissionsTable = base.getTable(CONFIG.tables.submissions);
const homeworkTable = base.getTable(CONFIG.tables.homework);

/************************************************************
 * Load triggering asset
 ************************************************************/

const assetQuery = await assetsTable.selectRecordsAsync({
    fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
});

const asset = assetQuery.getRecord(recordId);

if (!asset) {
    throw new Error(`Submission Asset not found: ${recordId}`);
}

/************************************************************
 * Stop safely if already linked
 ************************************************************/

const existingHomeworkIds = linkedIds(asset, CONFIG.assets.homeworkCompletions);

if (existingHomeworkIds.length > 0) {
    output.set("status", "already_linked");
    output.set("submissionAssetId", asset.id);
    output.set("homeworkCompletionId", existingHomeworkIds[0]);

    console.log("Asset already linked to Homework Completion. No action needed.");
    return;
}

/************************************************************
 * Validate asset
 ************************************************************/

const uploadDestination = text(asset, CONFIG.assets.uploadDestination);
const assetPurpose = selectName(asset, CONFIG.assets.assetPurpose);
const assetAttachments = attachments(asset, CONFIG.assets.attachment);
const submissionId = firstLinkedId(asset, CONFIG.assets.submission);
const enrollmentIds = linkedIds(asset, CONFIG.assets.enrollment);
const slot = inferSlot(asset);

if (uploadDestination !== "Homework Completions") {
    await markAssetError(
        asset,
        `Upload Destination is not Homework Completions. Actual: ${uploadDestination}`
    );
}

if (!(assetPurpose === "Homework 1" || assetPurpose === "Homework 2")) {
    await markAssetError(
        asset,
        `Asset Purpose must be Homework 1 or Homework 2. Actual: ${assetPurpose}`
    );
}

if (assetAttachments.length === 0) {
    await markAssetError(asset, "Asset has no Airtable Attachment.");
}

if (!submissionId) {
    await markAssetError(
        asset,
        "Asset has no linked Submission. Cannot safely create Homework Completion."
    );
}

if (enrollmentIds.length === 0) {
    await markAssetError(asset, "Asset has no linked Enrollment.");
}

if (!(slot === "HW1" || slot === "HW2")) {
    await markAssetError(
        asset,
        "Could not infer HW1/HW2 from Asset Slot, Asset Purpose, or Asset Label."
    );
}

/************************************************************
 * Load linked Submission
 ************************************************************/

const submissionsQuery = await submissionsTable.selectRecordsAsync({
    fields: safeFields(submissionsTable, Object.values(CONFIG.submissions)),
});

const submission = submissionsQuery.getRecord(submissionId);

if (!submission) {
    await markAssetError(
        asset,
        `Linked Submission could not be loaded: ${submissionId}`
    );
}

const homeworkField = homeworkFieldForSlot(slot);
const homeworkId = firstLinkedId(submission, homeworkField);

if (!homeworkId) {
    await markAssetError(
        asset,
        `Submission is missing ${homeworkField}. Cannot create Homework Completion.`
    );
}

/************************************************************
 * Find existing Homework Completion
 ************************************************************/

const homeworkQuery = await homeworkTable.selectRecordsAsync({
    fields: safeFields(homeworkTable, Object.values(CONFIG.homework)),
});

const exactCandidates = homeworkQuery.records.filter(hw => {
    const hwSubmissionId = firstLinkedId(hw, CONFIG.homework.submission);
    const hwHomeworkId = firstLinkedId(hw, CONFIG.homework.homework);
    const hwSlot =
        selectName(hw, CONFIG.homework.assetSlot) ||
        selectName(hw, CONFIG.homework.itemSlot);

    return (
        hwSubmissionId === submission.id &&
        hwHomeworkId === homeworkId &&
        hwSlot === slot
    );
});

const blankSlotCandidates = homeworkQuery.records.filter(hw => {
    const hwSubmissionId = firstLinkedId(hw, CONFIG.homework.submission);
    const hwHomeworkId = firstLinkedId(hw, CONFIG.homework.homework);
    const hwSlot =
        selectName(hw, CONFIG.homework.assetSlot) ||
        selectName(hw, CONFIG.homework.itemSlot);

    return (
        hwSubmissionId === submission.id &&
        hwHomeworkId === homeworkId &&
        !hwSlot
    );
});

let homeworkCompletion = null;

if (exactCandidates.length === 1) {
    homeworkCompletion = exactCandidates[0];
} else if (exactCandidates.length > 1) {
    await markAssetError(
        asset,
        `Multiple exact Homework Completions found for Submission + Homework + Slot. Count: ${exactCandidates.length}`
    );
} else if (blankSlotCandidates.length === 1) {
    homeworkCompletion = blankSlotCandidates[0];
} else if (blankSlotCandidates.length > 1) {
    await markAssetError(
        asset,
        `Multiple blank-slot Homework Completions found for Submission + Homework. Count: ${blankSlotCandidates.length}`
    );
}

/************************************************************
 * Create or update Homework Completion
 ************************************************************/

let homeworkCompletionId = null;

if (homeworkCompletion) {
    const updateFields = {};
    const existingAssetIds = linkedIds(homeworkCompletion, CONFIG.homework.submissionAssets);

    setLink(updateFields, homeworkTable, CONFIG.homework.submissionAssets, [
        ...existingAssetIds,
        asset.id,
    ]);

    if (!selectName(homeworkCompletion, CONFIG.homework.assetSlot)) {
        setSingleSelect(updateFields, homeworkTable, CONFIG.homework.assetSlot, slot);
    }

    if (!selectName(homeworkCompletion, CONFIG.homework.itemSlot)) {
        setSingleSelect(updateFields, homeworkTable, CONFIG.homework.itemSlot, slot);
    }

    if (!firstLinkedId(homeworkCompletion, CONFIG.homework.homework)) {
        setLink(updateFields, homeworkTable, CONFIG.homework.homework, [homeworkId]);
    }

    if (!text(homeworkCompletion, CONFIG.homework.assetLabel)) {
        setText(updateFields, homeworkTable, CONFIG.homework.assetLabel, text(asset, CONFIG.assets.assetLabel));
    }

    if (!text(homeworkCompletion, CONFIG.homework.originalFileName)) {
        setText(updateFields, homeworkTable, CONFIG.homework.originalFileName, text(asset, CONFIG.assets.originalFileName));
    }

    if (!selectName(homeworkCompletion, CONFIG.homework.assetType)) {
        setSingleSelect(updateFields, homeworkTable, CONFIG.homework.assetType, selectName(asset, CONFIG.assets.assetType));
    }

    if (!text(homeworkCompletion, CONFIG.homework.googleDriveFileUrl) && text(asset, CONFIG.assets.googleDriveFileUrl)) {
        setText(updateFields, homeworkTable, CONFIG.homework.googleDriveFileUrl, text(asset, CONFIG.assets.googleDriveFileUrl));
    }

    if (!text(homeworkCompletion, CONFIG.homework.googleDriveFileId) && text(asset, CONFIG.assets.googleDriveFileId)) {
        setText(updateFields, homeworkTable, CONFIG.homework.googleDriveFileId, text(asset, CONFIG.assets.googleDriveFileId));
    }

    if (Object.keys(updateFields).length > 0) {
        await homeworkTable.updateRecordAsync(homeworkCompletion.id, updateFields);
    }

    homeworkCompletionId = homeworkCompletion.id;
    console.log(`Linked existing Homework Completion: ${homeworkCompletionId}`);
} else {
    const createFields = {};

    setLink(createFields, homeworkTable, CONFIG.homework.homework, [homeworkId]);
    setLink(createFields, homeworkTable, CONFIG.homework.submission, [submission.id]);
    setLink(createFields, homeworkTable, CONFIG.homework.enrollment, enrollmentIds);
    setLink(createFields, homeworkTable, CONFIG.homework.week, linkedIds(submission, CONFIG.submissions.week));
    setLink(createFields, homeworkTable, CONFIG.homework.gradeBand, linkedIds(submission, CONFIG.submissions.gradeBand));
    setLink(createFields, homeworkTable, CONFIG.homework.weeklySummaryLink, linkedIds(submission, CONFIG.submissions.weeklySummary));
    setLink(createFields, homeworkTable, CONFIG.homework.submissionAssets, [asset.id]);

    setDate(createFields, homeworkTable, CONFIG.homework.submissionDate, cell(submission, CONFIG.submissions.activityDate));

    setSingleSelect(
        createFields,
        homeworkTable,
        CONFIG.homework.uploadStatus,
        mapAssetUploadStatusToHomeworkStatus(selectName(asset, CONFIG.assets.uploadStatus))
    );

    setSingleSelect(createFields, homeworkTable, CONFIG.homework.completionStatus, "Submitted");
    setSingleSelect(createFields, homeworkTable, CONFIG.homework.reviewStatus, "Ready for Review");
    setSingleSelect(createFields, homeworkTable, CONFIG.homework.assetSlot, slot);
    setSingleSelect(createFields, homeworkTable, CONFIG.homework.itemSlot, slot);
    setSingleSelect(createFields, homeworkTable, CONFIG.homework.assetType, selectName(asset, CONFIG.assets.assetType));
    setSingleSelect(createFields, homeworkTable, CONFIG.homework.assetPurpose, "Homework Turn-In");
    setSingleSelect(createFields, homeworkTable, CONFIG.homework.sourceSystem, "Fillout");
    setSingleSelect(createFields, homeworkTable, CONFIG.homework.itemType, "Homework");

    setText(createFields, homeworkTable, CONFIG.homework.assetLabel, text(asset, CONFIG.assets.assetLabel));
    setText(createFields, homeworkTable, CONFIG.homework.originalFileName, text(asset, CONFIG.assets.originalFileName));
    setText(createFields, homeworkTable, CONFIG.homework.googleDriveFileId, text(asset, CONFIG.assets.googleDriveFileId));
    setText(createFields, homeworkTable, CONFIG.homework.googleDriveFileUrl, text(asset, CONFIG.assets.googleDriveFileUrl));
    setText(createFields, homeworkTable, CONFIG.homework.googleDriveFolderId, text(asset, CONFIG.assets.googleDriveFolderId));
    setText(createFields, homeworkTable, CONFIG.homework.googleDriveFolderUrl, text(asset, CONFIG.assets.googleDriveFolderUrl));
    setText(createFields, homeworkTable, CONFIG.homework.uploadError, text(asset, CONFIG.assets.uploadError));

    setDate(createFields, homeworkTable, CONFIG.homework.uploadedAt, cell(asset, CONFIG.assets.uploadedAt));

    /*
     * Do NOT write to Homework Completions -> Airtable Attachment.
     * Files remain available through linked Submission Assets.
     */

    homeworkCompletionId = await homeworkTable.createRecordAsync(createFields);

    console.log(`Created Homework Completion: ${homeworkCompletionId}`);
}

/************************************************************
 * Update Submission Asset
 ************************************************************/

const assetUpdateFields = {};

setLink(assetUpdateFields, assetsTable, CONFIG.assets.homeworkCompletions, [homeworkCompletionId]);

if (!selectName(asset, CONFIG.assets.assetSlot)) {
    setSingleSelect(assetUpdateFields, assetsTable, CONFIG.assets.assetSlot, slot);
}

/*
 * After the correction record exists, the asset can be sent to Make.
 * Keep Pending Link — same Make send gate as video (070b) and 009.
 */
const currentUploadStatus = selectName(asset, CONFIG.assets.uploadStatus);

if (
    !currentUploadStatus ||
    currentUploadStatus === "Error"
) {
    setSingleSelect(assetUpdateFields, assetsTable, CONFIG.assets.uploadStatus, "Pending Link");
}

setCheckbox(assetUpdateFields, assetsTable, CONFIG.assets.sendToMakeTrigger, true);

if (Object.keys(assetUpdateFields).length > 0) {
    await assetsTable.updateRecordAsync(asset.id, assetUpdateFields);
}

output.set("status", homeworkCompletion ? "linked_existing" : "created_new");
output.set("submissionAssetId", asset.id);
output.set("homeworkCompletionId", homeworkCompletionId);
output.set("slot", slot);

console.log("020 complete.");

/*
Automation: 013 - Submission Intake - Create or Link Video Feedback
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
 * 013 - Submission Intake - Create or Link Video Feedback
 * Trigger Table: Submission Assets
 *
 * PURPOSE
 * For one video Submission Asset:
 * - Confirm the asset is a Video Feedback asset.
 * - Create or link one Video Feedback record.
 * - Link Video Feedback to:
 *   - Submission Asset
 *   - Submission
 *   - Enrollment
 *   - Grade Band, when available from Enrollment
 * - Link the Video Feedback record back to the Submission Asset.
 * - Mark the Submission Asset ready for Make:
 *   - Upload Status = Ready / Ready for Upload / Pending Upload / Pending
 *   - Send to Make Trigger = checked
 *
 * IMPORTANT
 * This script does NOT upload files to Google Drive.
 * It prepares the Video Feedback record and hands the asset off to Make.
 ************************************************************/

const { recordId } = input.config();

if (!recordId) {
    throw new Error("Missing required input variable: recordId");
}

const CONFIG = {
    tables: {
        assets: "Submission Assets",
        videoFeedback: "Video Feedback",
        submissions: "Submissions",
        enrollments: "Enrollments",
    },

    assets: {
        name: "Submission Assets Full Name",
        submission: "Submission - Linked",
        enrollment: "Enrollment - Linked",
        assetPurpose: "Asset Purpose",
        uploadDestination: "Upload Destination",
        attachment: "Airtable Attachment",
        assetType: "Asset Type",
        assetSlot: "Asset Slot",
        videoFeedback: "Video Feedback",
        uploadStatus: "Upload Status",
        uploadError: "Upload Error",
        sendToMakeTrigger: "Send to Make Trigger",
        sourceAttachmentId: "Source Attachment ID",
        originalFileName: "Original File Name",
        readyToSendToMake: "Ready to Send to Make?",
        whyNotReadyForMake: "Why Not Ready for Make?",
    },

    video: {
        name: "Video Feedback Full Name",
        key: "Video Feedback Key",
        submissionAsset: "Submission Asset",
        submission: "Submission",
        enrollment: "Enrollment",
        gradeBand: "Grade Band",
        assetType: "Asset Type",
        active: "Active?",
        workflowStatus: "Video Feedback Workflow Status",
        uploadStatus: "Upload Status",
        uploadError: "Upload Error",
    },

    enrollment: {
        gradeBand: "Grade Band",
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

function attachmentCount(record, fieldName) {
    const value = cell(record, fieldName);
    return Array.isArray(value) ? value.length : 0;
}

function sameIdSet(a, b) {
    const aa = [...new Set((a || []).filter(Boolean))].sort();
    const bb = [...new Set((b || []).filter(Boolean))].sort();

    if (aa.length !== bb.length) return false;

    for (let i = 0; i < aa.length; i++) {
        if (aa[i] !== bb[i]) return false;
    }

    return true;
}

function mergeIds(existingIds, addIds) {
    return [...new Set([...(existingIds || []), ...(addIds || [])].filter(Boolean))];
}

function choiceExists(table, fieldName, choiceName) {
    const field = getField(table, fieldName);
    if (!field || !field.options || !field.options.choices) return false;
    return field.options.choices.some(choice => choice.name === choiceName);
}

function firstExistingChoice(table, fieldName, choices) {
    for (const choice of choices) {
        if (choice && choiceExists(table, fieldName, choice)) return choice;
    }
    return null;
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
    if (value === undefined || value === null) return;

    fields[fieldName] = String(value);
}

function summarizeFields(fields) {
    return Object.keys(fields).join(", ") || "No writable fields";
}

/************************************************************
 * Load tables
 ************************************************************/

const assetsTable = base.getTable(CONFIG.tables.assets);
const videoTable = base.getTable(CONFIG.tables.videoFeedback);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

/************************************************************
 * Load triggering Submission Asset
 ************************************************************/

const assetQuery = await assetsTable.selectRecordsAsync({
    fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
});

const asset = assetQuery.getRecord(recordId);

if (!asset) {
    throw new Error(`Submission Asset not found: ${recordId}`);
}

const uploadDestination = text(asset, CONFIG.assets.uploadDestination);
const assetPurpose = text(asset, CONFIG.assets.assetPurpose);
const assetType = text(asset, CONFIG.assets.assetType);
const assetSlot = text(asset, CONFIG.assets.assetSlot);

const submissionIds = linkedIds(asset, CONFIG.assets.submission);
const enrollmentIds = linkedIds(asset, CONFIG.assets.enrollment);
const existingVideoIdsFromAsset = linkedIds(asset, CONFIG.assets.videoFeedback);
const fileCount = attachmentCount(asset, CONFIG.assets.attachment);

console.log("===== 013 CREATE OR LINK VIDEO FEEDBACK =====");
console.log(`Submission Asset: ${asset.name}`);
console.log(`Submission Asset ID: ${asset.id}`);
console.log(`Upload Destination: ${uploadDestination}`);
console.log(`Asset Purpose: ${assetPurpose}`);
console.log(`Asset Type: ${assetType}`);
console.log(`Asset Slot: ${assetSlot}`);
console.log(`File Count: ${fileCount}`);

/************************************************************
 * Validate this is truly a video feedback asset
 ************************************************************/

const isVideoFeedbackAsset =
    uploadDestination === "Video Feedback" ||
    assetPurpose === "Video For Feedback" ||
    assetType === "Video Feedback" ||
    assetSlot === "VIDEO";

if (!isVideoFeedbackAsset) {
    throw new Error(
        `This asset is not a Video Feedback asset. Destination='${uploadDestination}', Purpose='${assetPurpose}', Type='${assetType}', Slot='${assetSlot}'`
    );
}

if (fileCount === 0) {
    throw new Error(`Video asset has no Airtable Attachment: ${asset.id}`);
}

if (submissionIds.length === 0) {
    throw new Error(`Video asset is missing Submission - Linked: ${asset.id}`);
}

if (enrollmentIds.length === 0) {
    throw new Error(`Video asset is missing Enrollment - Linked: ${asset.id}`);
}

/************************************************************
 * Load Enrollment to pull Grade Band when available
 ************************************************************/

let gradeBandIds = [];

if (fieldExists(enrollmentsTable, CONFIG.enrollment.gradeBand)) {
    const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
        fields: safeFields(enrollmentsTable, [CONFIG.enrollment.gradeBand]),
    });

    const enrollment = enrollmentQuery.getRecord(enrollmentIds[0]);

    if (enrollment) {
        gradeBandIds = linkedIds(enrollment, CONFIG.enrollment.gradeBand);
    }
}

/************************************************************
 * Load existing Video Feedback records to prevent duplicates
 ************************************************************/

const videoQuery = await videoTable.selectRecordsAsync({
    fields: safeFields(videoTable, Object.values(CONFIG.video)),
});

const videoKey = `VIDEO_FEEDBACK|${asset.id}`;
let existingVideo = null;

if (existingVideoIdsFromAsset.length > 0) {
    existingVideo = videoQuery.getRecord(existingVideoIdsFromAsset[0]) || null;
}

if (!existingVideo) {
    for (const vf of videoQuery.records) {
        const vfAssetIds = linkedIds(vf, CONFIG.video.submissionAsset);
        const vfKey = text(vf, CONFIG.video.key);

        if (vfAssetIds.includes(asset.id) || vfKey === videoKey) {
            existingVideo = vf;
            break;
        }
    }
}

/************************************************************
 * Create or repair Video Feedback
 ************************************************************/

let videoFeedbackId = null;
let actionTaken = "";

if (existingVideo) {
    videoFeedbackId = existingVideo.id;
    actionTaken = "linked_existing_or_repaired";

    const updateFields = {};

    const currentAssetIds = linkedIds(existingVideo, CONFIG.video.submissionAsset);
    const currentSubmissionIds = linkedIds(existingVideo, CONFIG.video.submission);
    const currentEnrollmentIds = linkedIds(existingVideo, CONFIG.video.enrollment);
    const currentGradeBandIds = linkedIds(existingVideo, CONFIG.video.gradeBand);
    const currentActive = cell(existingVideo, CONFIG.video.active);

    if (!sameIdSet(currentAssetIds, [asset.id])) {
        setLink(updateFields, videoTable, CONFIG.video.submissionAsset, [asset.id]);
    }

    if (!sameIdSet(currentSubmissionIds, submissionIds)) {
        setLink(updateFields, videoTable, CONFIG.video.submission, submissionIds);
    }

    if (!sameIdSet(currentEnrollmentIds, enrollmentIds)) {
        setLink(updateFields, videoTable, CONFIG.video.enrollment, enrollmentIds);
    }

    if (gradeBandIds.length > 0 && !sameIdSet(currentGradeBandIds, gradeBandIds)) {
        setLink(updateFields, videoTable, CONFIG.video.gradeBand, gradeBandIds);
    }

    setText(updateFields, videoTable, CONFIG.video.key, videoKey);

    if (currentActive !== true) {
        setCheckbox(updateFields, videoTable, CONFIG.video.active, true);
    }

    const currentWorkflowStatus = text(existingVideo, CONFIG.video.workflowStatus);
    const currentUploadStatus = text(existingVideo, CONFIG.video.uploadStatus);

    const workflowChoice = firstExistingChoice(videoTable, CONFIG.video.workflowStatus, [
        "Pending Upload",
        "Pending",
        "Ready",
        "Processing",
    ]);

    const uploadChoice = firstExistingChoice(videoTable, CONFIG.video.uploadStatus, [
        "Pending Upload",
        "Pending",
        "Ready",
    ]);

    if (workflowChoice && !currentWorkflowStatus) {
        setSingleSelect(updateFields, videoTable, CONFIG.video.workflowStatus, workflowChoice);
    }

    if (uploadChoice && !currentUploadStatus) {
        setSingleSelect(updateFields, videoTable, CONFIG.video.uploadStatus, uploadChoice);
    }

    setText(updateFields, videoTable, CONFIG.video.uploadError, "");

    if (Object.keys(updateFields).length > 0) {
        await videoTable.updateRecordAsync(existingVideo.id, updateFields);
        console.log(`Updated existing Video Feedback ${existingVideo.id}: ${summarizeFields(updateFields)}`);
    } else {
        console.log(`Existing Video Feedback already linked correctly: ${existingVideo.id}`);
    }
} else {
    actionTaken = "created_new_video_feedback";

    const createFields = {};

    setLink(createFields, videoTable, CONFIG.video.submissionAsset, [asset.id]);
    setLink(createFields, videoTable, CONFIG.video.submission, submissionIds);
    setLink(createFields, videoTable, CONFIG.video.enrollment, enrollmentIds);
    setLink(createFields, videoTable, CONFIG.video.gradeBand, gradeBandIds);

    setText(createFields, videoTable, CONFIG.video.key, videoKey);
    setCheckbox(createFields, videoTable, CONFIG.video.active, true);
    setText(createFields, videoTable, CONFIG.video.uploadError, "");

    const videoAssetTypeChoice = firstExistingChoice(videoTable, CONFIG.video.assetType, [
        assetType,
        "Video Feedback",
        "Video",
    ]);

    const workflowChoice = firstExistingChoice(videoTable, CONFIG.video.workflowStatus, [
        "Pending Upload",
        "Pending",
        "Ready",
        "Processing",
    ]);

    const uploadChoice = firstExistingChoice(videoTable, CONFIG.video.uploadStatus, [
        "Pending Upload",
        "Pending",
        "Ready",
    ]);

    setSingleSelect(createFields, videoTable, CONFIG.video.assetType, videoAssetTypeChoice);
    setSingleSelect(createFields, videoTable, CONFIG.video.workflowStatus, workflowChoice);
    setSingleSelect(createFields, videoTable, CONFIG.video.uploadStatus, uploadChoice);

    videoFeedbackId = await videoTable.createRecordAsync(createFields);

    console.log(`Created Video Feedback: ${videoFeedbackId}`);
}

/************************************************************
 * Always update Submission Asset for Make handoff
 *
 * This is the key fix:
 * Even if Video Feedback already existed, the asset must be marked ready.
 ************************************************************/

const assetUpdateFields = {};

const currentAssetVideoIds = linkedIds(asset, CONFIG.assets.videoFeedback);
const desiredAssetVideoIds = mergeIds(currentAssetVideoIds, [videoFeedbackId]);

if (!sameIdSet(currentAssetVideoIds, desiredAssetVideoIds)) {
    setLink(assetUpdateFields, assetsTable, CONFIG.assets.videoFeedback, desiredAssetVideoIds);
}

const currentAssetUploadStatus = text(asset, CONFIG.assets.uploadStatus);
const currentSendTrigger = cell(asset, CONFIG.assets.sendToMakeTrigger);
const currentUploadError = text(asset, CONFIG.assets.uploadError);

const assetReadyChoice = firstExistingChoice(assetsTable, CONFIG.assets.uploadStatus, [
    "Ready",
    "Ready for Upload",
    "Pending Upload",
    "Pending",
]);

if (assetReadyChoice && currentAssetUploadStatus !== assetReadyChoice) {
    setSingleSelect(assetUpdateFields, assetsTable, CONFIG.assets.uploadStatus, assetReadyChoice);
}

if (currentSendTrigger !== true) {
    setCheckbox(assetUpdateFields, assetsTable, CONFIG.assets.sendToMakeTrigger, true);
}

if (currentUploadError) {
    setText(assetUpdateFields, assetsTable, CONFIG.assets.uploadError, "");
}

if (Object.keys(assetUpdateFields).length > 0) {
    await assetsTable.updateRecordAsync(asset.id, assetUpdateFields);
    console.log(`Updated Submission Asset for Make handoff: ${summarizeFields(assetUpdateFields)}`);
} else {
    console.log("Submission Asset already ready for Make handoff.");
}

/************************************************************
 * Reload asset to show final readiness diagnostics
 ************************************************************/

const finalAssetQuery = await assetsTable.selectRecordsAsync({
    fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
});

const finalAsset = finalAssetQuery.getRecord(asset.id);

const finalReadyToSend = finalAsset ? text(finalAsset, CONFIG.assets.readyToSendToMake) : "";
const finalWhyNotReady = finalAsset ? text(finalAsset, CONFIG.assets.whyNotReadyForMake) : "";
const finalSendTrigger = finalAsset ? cell(finalAsset, CONFIG.assets.sendToMakeTrigger) : null;
const finalUploadStatus = finalAsset ? text(finalAsset, CONFIG.assets.uploadStatus) : "";
const finalVideoIds = finalAsset ? linkedIds(finalAsset, CONFIG.assets.videoFeedback) : [];

console.log("===== 013 FINAL STATUS =====");
console.table([{
    SubmissionAssetId: asset.id,
    VideoFeedbackId: videoFeedbackId,
    ActionTaken: actionTaken,
    FinalUploadStatus: finalUploadStatus,
    FinalSendToMakeTrigger: finalSendTrigger,
    FinalVideoFeedbackLinked: finalVideoIds.join(", "),
    FinalReadyToSendToMake: finalReadyToSend,
    FinalWhyNotReadyForMake: finalWhyNotReady,
}]);

/************************************************************
 * Output
 ************************************************************/

output.set("status", actionTaken);
output.set("submissionAssetId", asset.id);
output.set("videoFeedbackId", videoFeedbackId);
output.set("submissionId", submissionIds[0]);
output.set("enrollmentId", enrollmentIds[0]);
output.set("gradeBandId", gradeBandIds[0] || "");
output.set("readyToSendToMake", finalReadyToSend);
output.set("whyNotReadyForMake", finalWhyNotReady);

console.log("013 complete.");

/*
Automation: 013 - Submission Intake - Create or Link Video Feedback
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-22
Last GitHub Update: 2026-06-22

Purpose:
Creates or links Video Feedback for one video Submission Asset and marks the asset Pending Link for Make.

Trigger:
Submission Assets when a video asset is ready for Video Feedback prep.

Important Tables:
Submission Assets, Video Feedback, Submissions, Enrollments

Important Fields:
Video Feedback, Upload Status, Send to Make Trigger, Submission - Linked, Enrollment - Linked

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************
 * 013 - Submission Intake - Create or Link Video Feedback
 *
 * Version: v2.0
 * Date Written: 2026-05-20
 * Last Updated: 2026-06-22
 *
 * PURPOSE
 * - Runs from one Submission Assets record.
 * - Confirms the asset is a Video Feedback asset.
 * - Creates or links one Video Feedback record.
 * - Links Video Feedback to Submission Asset, Submission, Enrollment, and Grade Band when available.
 * - Marks the Submission Asset Pending Link and checks Send to Make Trigger for 070b.
 *
 * IMPORTANT DESIGN RULES
 * - Upload Status Make send gate is Pending Link (same ladder as 009, 020, 070a, 070b).
 * - Does not upload files to Google Drive.
 * - Idempotent: reuses existing Video Feedback keyed by asset link or Video Feedback Key.
 *
 * FOLDER
 * - 02 - Submission Intake and Asset Creation
 *
 * AUTOMATION NAME
 * - 013 - Submission Intake - Create or Link Video Feedback
 *
 * TRIGGER TABLE
 * - Submission Assets
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Upload Destination is Video Feedback
 * - Airtable Attachment is not empty
 * - Submission - Linked is not empty
 * - Enrollment - Linked is not empty
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Submission Assets record
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created_new_video_feedback | linked_existing_or_repaired | error
 * - errorOut
 * - debugStep
 * - submissionAssetId, videoFeedbackId, submissionId, enrollmentId, gradeBandId
 * - readyToSendToMake, whyNotReadyForMake
 *
 * PRIMARY TABLES USED
 * - Submission Assets
 * - Video Feedback
 * - Enrollments
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Video Feedback links and initial workflow/upload status when blank
 * - Submission Assets → Video Feedback, Upload Status, Send to Make Trigger, Upload Error
 *
 * IMPORTANT NOTES
 * - This is not the Make upload automation (070b).
 * - This is not the video XP automation (114).
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — CONFIGURATION
========================================================= */

const CONFIG = {
  scriptName: "013 - Submission Intake - Create or Link Video Feedback",
  version: "v2.0",

  tables: {
    assets: "Submission Assets",
    videoFeedback: "Video Feedback",
    submissions: "Submissions",
    enrollments: "Enrollments",
  },

  assets: {
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
    readyToSendToMake: "Ready to Send to Make?",
    whyNotReadyForMake: "Why Not Ready for Make?",
  },

  video: {
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

  values: {
    uploadDestinationVideo: "Video Feedback",
    makeSendStatus: "Pending Link",
    videoKeyPrefix: "VIDEO_FEEDBACK",
  },

  outputStatuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
};

/* =========================================================
   SECTION 2 — HELPERS
========================================================= */

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore unmapped outputs.
  }
}

function getField(table, fieldName) {
  return table.fields.find(field => field.name === fieldName);
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
    return String(record.getCellValueAsString(fieldName) || "").trim();
  } catch {
    return "";
  }
}

function linkedIds(record, fieldName) {
  const value = cell(record, fieldName);
  if (!Array.isArray(value)) return [];
  return value.map(item => item?.id).filter(Boolean);
}

function attachmentCount(record, fieldName) {
  const value = cell(record, fieldName);
  return Array.isArray(value) ? value.length : 0;
}

function sameIdSet(a, b) {
  const left = [...new Set((a || []).filter(Boolean))].sort();
  const right = [...new Set((b || []).filter(Boolean))].sort();

  if (left.length !== right.length) return false;

  return left.every((id, index) => id === right[index]);
}

function mergeIds(existingIds, addIds) {
  return [...new Set([...(existingIds || []), ...(addIds || [])].filter(Boolean))];
}

function choiceExists(table, fieldName, choiceName) {
  const field = getField(table, fieldName);
  if (!field?.options?.choices) return false;
  return field.options.choices.some(choice => choice.name === choiceName);
}

function firstExistingChoice(table, fieldName, choices) {
  for (const choice of choices) {
    if (choice && choiceExists(table, fieldName, choice)) {
      return choice;
    }
  }
  return null;
}

function setLink(fields, table, fieldName, ids) {
  if (!isWritable(table, fieldName)) return;

  fields[fieldName] = [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
}

function setSingleSelect(fields, table, fieldName, choiceName) {
  if (!isWritable(table, fieldName) || !choiceName) return;
  if (!choiceExists(table, fieldName, choiceName)) return;

  fields[fieldName] = { name: choiceName };
}

function setCheckbox(fields, table, fieldName, value) {
  if (!isWritable(table, fieldName)) return;
  fields[fieldName] = Boolean(value);
}

function setTextField(fields, table, fieldName, value) {
  if (!isWritable(table, fieldName)) return;
  if (value === undefined || value === null) return;

  fields[fieldName] = String(value);
}

function summarizeFields(fields) {
  return Object.keys(fields).join(", ") || "No writable fields";
}

function buildVideoFeedbackKey(assetId) {
  return `${CONFIG.values.videoKeyPrefix}|${assetId}`;
}

function setFinalOutputs({
  statusOut,
  actionOut,
  errorOut = "",
  debugStep,
  submissionAssetId = "",
  videoFeedbackId = "",
  submissionId = "",
  enrollmentId = "",
  gradeBandId = "",
  readyToSendToMake = "",
  whyNotReadyForMake = "",
}) {
  setOutputSafe("statusOut", statusOut);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut);
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("submissionAssetId", submissionAssetId);
  setOutputSafe("videoFeedbackId", videoFeedbackId);
  setOutputSafe("submissionId", submissionId);
  setOutputSafe("enrollmentId", enrollmentId);
  setOutputSafe("gradeBandId", gradeBandId);
  setOutputSafe("readyToSendToMake", readyToSendToMake);
  setOutputSafe("whyNotReadyForMake", whyNotReadyForMake);

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut,
    actionOut,
    errorOut,
    debugStep,
    submissionAssetId,
    videoFeedbackId,
    submissionId,
    enrollmentId,
    gradeBandId,
    readyToSendToMake,
    whyNotReadyForMake,
  }));
}

/* =========================================================
   SECTION 3 — MAIN
========================================================= */

async function main() {
  let debugStep = "start";

  const inputConfig = input.config();
  const recordId = String(inputConfig.recordId || "").trim();

  if (!recordId) {
    throw new Error("Missing required input variable: recordId");
  }

  if (!recordId.startsWith("rec")) {
    throw new Error(`Invalid recordId input. Expected Airtable record ID, received: ${recordId}`);
  }

  setOutputSafe("debugStep", debugStep);

  const assetsTable = base.getTable(CONFIG.tables.assets);
  const videoTable = base.getTable(CONFIG.tables.videoFeedback);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  debugStep = "load_submission_asset";
  setOutputSafe("debugStep", debugStep);

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

  debugStep = "validate_video_asset";
  setOutputSafe("debugStep", debugStep);

  const isVideoFeedbackAsset =
    uploadDestination === CONFIG.values.uploadDestinationVideo ||
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

  debugStep = "load_enrollment_grade_band";
  setOutputSafe("debugStep", debugStep);

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

  debugStep = "find_existing_video_feedback";
  setOutputSafe("debugStep", debugStep);

  const videoQuery = await videoTable.selectRecordsAsync({
    fields: safeFields(videoTable, Object.values(CONFIG.video)),
  });

  const videoKey = buildVideoFeedbackKey(asset.id);
  let existingVideo = null;

  if (existingVideoIdsFromAsset.length > 0) {
    existingVideo = videoQuery.getRecord(existingVideoIdsFromAsset[0]) || null;
  }

  if (!existingVideo) {
    for (const videoRecord of videoQuery.records) {
      const videoAssetIds = linkedIds(videoRecord, CONFIG.video.submissionAsset);
      const existingKey = text(videoRecord, CONFIG.video.key);

      if (videoAssetIds.includes(asset.id) || existingKey === videoKey) {
        existingVideo = videoRecord;
        break;
      }
    }
  }

  debugStep = "create_or_repair_video_feedback";
  setOutputSafe("debugStep", debugStep);

  let videoFeedbackId = "";
  let actionOut = "";

  if (existingVideo) {
    videoFeedbackId = existingVideo.id;
    actionOut = "linked_existing_or_repaired";

    const updateFields = {};
    const currentAssetIds = linkedIds(existingVideo, CONFIG.video.submissionAsset);
    const currentSubmissionIds = linkedIds(existingVideo, CONFIG.video.submission);
    const currentEnrollmentIds = linkedIds(existingVideo, CONFIG.video.enrollment);
    const currentGradeBandIds = linkedIds(existingVideo, CONFIG.video.gradeBand);
    const currentActive = cell(existingVideo, CONFIG.video.active);
    const currentWorkflowStatus = text(existingVideo, CONFIG.video.workflowStatus);
    const currentUploadStatus = text(existingVideo, CONFIG.video.uploadStatus);

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

    setTextField(updateFields, videoTable, CONFIG.video.key, videoKey);

    if (currentActive !== true) {
      setCheckbox(updateFields, videoTable, CONFIG.video.active, true);
    }

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

    setTextField(updateFields, videoTable, CONFIG.video.uploadError, "");

    if (Object.keys(updateFields).length > 0) {
      await videoTable.updateRecordAsync(existingVideo.id, updateFields);
    }
  } else {
    actionOut = "created_new_video_feedback";

    const createFields = {};

    setLink(createFields, videoTable, CONFIG.video.submissionAsset, [asset.id]);
    setLink(createFields, videoTable, CONFIG.video.submission, submissionIds);
    setLink(createFields, videoTable, CONFIG.video.enrollment, enrollmentIds);
    setLink(createFields, videoTable, CONFIG.video.gradeBand, gradeBandIds);
    setTextField(createFields, videoTable, CONFIG.video.key, videoKey);
    setCheckbox(createFields, videoTable, CONFIG.video.active, true);
    setTextField(createFields, videoTable, CONFIG.video.uploadError, "");

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
  }

  debugStep = "mark_asset_pending_link";
  setOutputSafe("debugStep", debugStep);

  const assetUpdateFields = {};
  const currentAssetVideoIds = linkedIds(asset, CONFIG.assets.videoFeedback);
  const desiredAssetVideoIds = mergeIds(currentAssetVideoIds, [videoFeedbackId]);
  const currentAssetUploadStatus = text(asset, CONFIG.assets.uploadStatus);
  const currentSendTrigger = cell(asset, CONFIG.assets.sendToMakeTrigger);
  const currentUploadError = text(asset, CONFIG.assets.uploadError);
  const makeSendStatus = firstExistingChoice(
    assetsTable,
    CONFIG.assets.uploadStatus,
    [CONFIG.values.makeSendStatus]
  );

  if (!sameIdSet(currentAssetVideoIds, desiredAssetVideoIds)) {
    setLink(assetUpdateFields, assetsTable, CONFIG.assets.videoFeedback, desiredAssetVideoIds);
  }

  if (makeSendStatus && currentAssetUploadStatus !== makeSendStatus) {
    setSingleSelect(assetUpdateFields, assetsTable, CONFIG.assets.uploadStatus, makeSendStatus);
  }

  if (currentSendTrigger !== true) {
    setCheckbox(assetUpdateFields, assetsTable, CONFIG.assets.sendToMakeTrigger, true);
  }

  if (currentUploadError) {
    setTextField(assetUpdateFields, assetsTable, CONFIG.assets.uploadError, "");
  }

  if (Object.keys(assetUpdateFields).length > 0) {
    await assetsTable.updateRecordAsync(asset.id, assetUpdateFields);
  }

  debugStep = "finalize_outputs";
  setOutputSafe("debugStep", debugStep);

  const finalAssetQuery = await assetsTable.selectRecordsAsync({
    fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
  });

  const finalAsset = finalAssetQuery.getRecord(asset.id);
  const finalReadyToSend = finalAsset ? text(finalAsset, CONFIG.assets.readyToSendToMake) : "";
  const finalWhyNotReady = finalAsset ? text(finalAsset, CONFIG.assets.whyNotReadyForMake) : "";

  setFinalOutputs({
    statusOut: CONFIG.outputStatuses.success,
    actionOut,
    errorOut: "",
    debugStep,
    submissionAssetId: asset.id,
    videoFeedbackId,
    submissionId: submissionIds[0] || "",
    enrollmentId: enrollmentIds[0] || "",
    gradeBandId: gradeBandIds[0] || "",
    readyToSendToMake: finalReadyToSend,
    whyNotReadyForMake: finalWhyNotReady,
  });
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  setOutputSafe("statusOut", CONFIG.outputStatuses.error);
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", "error");

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut: CONFIG.outputStatuses.error,
    actionOut: "error",
    errorOut: message,
    debugStep: "error",
  }));

  throw error;
}

/*
Automation: 020 - Homework - Link or Create Homework Completion
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-21
Last GitHub Update: 2026-06-21

Purpose:
Links or creates a Homework Completion for one homework Submission Asset and marks the asset Pending Link for Make.

Trigger:
Submission Assets when a homework asset is ready for Homework Completion prep.

Important Tables:
Submission Assets, Submissions, Homework Completions

Important Fields:
Homework Completions, Upload Status, Send to Make Trigger, Asset Slot, Submission - Linked

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************
 * 020 - Homework - Link or Create Homework Completion
 *
 * Version: v2.2
 * Date Written: 2026-05-20
 * Last Updated: 2026-06-21
 *
 * PURPOSE
 * - Runs from one Submission Assets record.
 * - Confirms the asset is a homework asset and infers HW1/HW2.
 * - Finds the homework assignment from the linked Submission.
 * - Finds or creates the matching Homework Completion.
 * - Links the Submission Asset to the Homework Completion.
 * - Marks the asset Pending Link and checks Send to Make Trigger for 070a.
 *
 * IMPORTANT DESIGN RULES
 * - Upload Status Make send gate is Pending Link (same ladder as 009, 013, 070a, 070b).
 * - Asset-driven: does not stop because the parent Submission already has another Homework Completion.
 * - Does not write Homework Completions → Airtable Attachment (files stay on Submission Assets).
 * - When asset is already linked, syncs upload writeback fields from the asset (022 also runs post-Make).
 *
 * FOLDER
 * - 02 - Submission Intake and Asset Creation
 *
 * AUTOMATION NAME
 * - 020 - Homework - Link or Create Homework Completion
 *
 * TRIGGER TABLE
 * - Submission Assets
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Upload Destination is Homework Completions
 * - Asset Purpose is Homework 1 or Homework 2
 * - Airtable Attachment is not empty
 * - Submission - Linked is not empty
 * - Enrollment - Linked is not empty
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Submission Assets record
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created_new | linked_existing | synced_upload_writeback | skipped_already_linked | error
 * - errorOut
 * - debugStep
 * - submissionAssetId, homeworkCompletionId, slot
 *
 * PRIMARY TABLES USED
 * - Submission Assets
 * - Submissions
 * - Homework Completions
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Homework Completions create/link fields from Submission + asset
 * - Submission Assets → Homework Completions, Asset Slot, Upload Status, Send to Make Trigger
 *
 * IMPORTANT NOTES
 * - This is not the Make upload automation (070a).
 * - This is not the homework XP automation (065).
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — CONFIGURATION
========================================================= */

const CONFIG = {
  scriptName: "020 - Homework - Link or Create Homework Completion",
  version: "v2.2",

  tables: {
    assets: "Submission Assets",
    submissions: "Submissions",
    homework: "Homework Completions",
  },

  assets: {
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    assetLabel: "Asset Label",
    uploadDestination: "Upload Destination",
    assetPurpose: "Asset Purpose",
    attachment: "Airtable Attachment",
    homeworkCompletions: "Homework Completions",
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
    enrollment: "Enrollment",
    week: "Week",
    activityDate: "Activity Date",
    gradeBand: "Grade Band",
    weeklySummary: "Weekly Athlete Summary",
    homeworkName1: "Homework Name 1",
    homeworkName2: "Homework Name 2",
  },

  homework: {
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
    writebackComplete: "Writeback Complete?",
  },

  values: {
    uploadDestinationHomework: "Homework Completions",
    makeSendStatus: "Pending Link",
    uploadStatusError: "Error",
  },

  outputStatuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
};

let assetsTable;
let submissionsTable;
let homeworkTable;

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

function selectName(record, fieldName) {
  const value = cell(record, fieldName);
  return value?.name ? String(value.name).trim() : "";
}

function linkedIds(record, fieldName) {
  const value = cell(record, fieldName);
  if (!Array.isArray(value)) return [];
  return value.map(item => item?.id).filter(Boolean);
}

function firstLinkedId(record, fieldName) {
  return linkedIds(record, fieldName)[0] || "";
}

function attachments(record, fieldName) {
  const value = cell(record, fieldName);
  return Array.isArray(value) ? value : [];
}

function choiceExists(table, fieldName, choiceName) {
  const field = getField(table, fieldName);
  if (!field?.options?.choices) return false;
  return field.options.choices.some(choice => choice.name === choiceName);
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

function datesEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const left = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const right = b instanceof Date ? b.getTime() : new Date(b).getTime();

  return left === right;
}

function syncTextFromAsset(fields, childTable, childField, childRecord, asset, assetField) {
  if (!isWritable(childTable, childField) || !fieldExists(assetsTable, assetField)) return;

  const assetValue = text(asset, assetField);
  const childValue = text(childRecord, childField);

  if (assetValue !== childValue) {
    fields[childField] = assetValue;
  }
}

function buildHomeworkUploadSyncFields(homeworkRecord, asset) {
  const fields = {};
  const assetUploadStatus = selectName(asset, CONFIG.assets.uploadStatus);
  const targetStatus = mapAssetUploadStatusToHomeworkStatus(assetUploadStatus);
  const currentStatus = selectName(homeworkRecord, CONFIG.homework.uploadStatus);

  if (targetStatus && targetStatus !== currentStatus) {
    setSingleSelect(fields, homeworkTable, CONFIG.homework.uploadStatus, targetStatus);
  }

  syncTextFromAsset(fields, homeworkTable, CONFIG.homework.googleDriveFileUrl, homeworkRecord, asset, CONFIG.assets.googleDriveFileUrl);
  syncTextFromAsset(fields, homeworkTable, CONFIG.homework.googleDriveFileId, homeworkRecord, asset, CONFIG.assets.googleDriveFileId);
  syncTextFromAsset(fields, homeworkTable, CONFIG.homework.googleDriveFolderId, homeworkRecord, asset, CONFIG.assets.googleDriveFolderId);
  syncTextFromAsset(fields, homeworkTable, CONFIG.homework.googleDriveFolderUrl, homeworkRecord, asset, CONFIG.assets.googleDriveFolderUrl);

  const assetError = text(asset, CONFIG.assets.uploadError);
  const currentError = text(homeworkRecord, CONFIG.homework.uploadError);
  if (assetError !== currentError && isWritable(homeworkTable, CONFIG.homework.uploadError)) {
    fields[CONFIG.homework.uploadError] = assetError;
  }

  const assetUploadedAt = cell(asset, CONFIG.assets.uploadedAt);
  const currentUploadedAt = cell(homeworkRecord, CONFIG.homework.uploadedAt);
  if (!datesEqual(assetUploadedAt, currentUploadedAt)) {
    setDate(fields, homeworkTable, CONFIG.homework.uploadedAt, assetUploadedAt);
  }

  if (assetUploadStatus === "Uploaded" && cell(homeworkRecord, CONFIG.homework.writebackComplete) !== true) {
    setCheckbox(fields, homeworkTable, CONFIG.homework.writebackComplete, true);
  }

  return fields;
}

function setFinalOutputs({
  statusOut,
  actionOut,
  errorOut = "",
  debugStep,
  submissionAssetId = "",
  homeworkCompletionId = "",
  slot = "",
}) {
  setOutputSafe("statusOut", statusOut);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut);
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("submissionAssetId", submissionAssetId);
  setOutputSafe("homeworkCompletionId", homeworkCompletionId);
  setOutputSafe("slot", slot);

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut,
    actionOut,
    errorOut,
    debugStep,
    submissionAssetId,
    homeworkCompletionId,
    slot,
  }));
}

async function markAssetError(asset, message) {
  const fields = {};

  setSingleSelect(fields, assetsTable, CONFIG.assets.uploadStatus, CONFIG.values.uploadStatusError);
  setTextField(fields, assetsTable, CONFIG.assets.uploadError, message);

  if (Object.keys(fields).length > 0) {
    await assetsTable.updateRecordAsync(asset.id, fields);
  }

  throw new Error(message);
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

  assetsTable = base.getTable(CONFIG.tables.assets);
  submissionsTable = base.getTable(CONFIG.tables.submissions);
  homeworkTable = base.getTable(CONFIG.tables.homework);

  debugStep = "load_submission_asset";
  setOutputSafe("debugStep", debugStep);

  const assetQuery = await assetsTable.selectRecordsAsync({
    fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
  });

  const asset = assetQuery.getRecord(recordId);

  if (!asset) {
    throw new Error(`Submission Asset not found: ${recordId}`);
  }

  const existingHomeworkIds = linkedIds(asset, CONFIG.assets.homeworkCompletions);

  if (existingHomeworkIds.length > 0) {
    const homeworkRecord = await homeworkTable.selectRecordAsync(existingHomeworkIds[0], {
      fields: safeFields(homeworkTable, Object.values(CONFIG.homework)),
    });
    let actionOut = "skipped_already_linked";
    let statusOut = CONFIG.outputStatuses.skipped;

    if (homeworkRecord) {
      const syncFields = buildHomeworkUploadSyncFields(homeworkRecord, asset);

      if (Object.keys(syncFields).length > 0) {
        await homeworkTable.updateRecordAsync(homeworkRecord.id, syncFields);
        actionOut = "synced_upload_writeback";
        statusOut = CONFIG.outputStatuses.success;
      }
    }

    setFinalOutputs({
      statusOut,
      actionOut,
      errorOut: "",
      debugStep: actionOut === "synced_upload_writeback" ? "synced_upload_writeback" : "skipped_already_linked",
      submissionAssetId: asset.id,
      homeworkCompletionId: existingHomeworkIds[0],
      slot: selectName(asset, CONFIG.assets.assetSlot),
    });
    return;
  }

  debugStep = "validate_asset";
  setOutputSafe("debugStep", debugStep);

  const uploadDestination = text(asset, CONFIG.assets.uploadDestination);
  const assetPurpose = selectName(asset, CONFIG.assets.assetPurpose);
  const assetAttachments = attachments(asset, CONFIG.assets.attachment);
  const submissionId = firstLinkedId(asset, CONFIG.assets.submission);
  const enrollmentIds = linkedIds(asset, CONFIG.assets.enrollment);
  const slot = inferSlot(asset);

  if (uploadDestination !== CONFIG.values.uploadDestinationHomework) {
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

  debugStep = "load_submission";
  setOutputSafe("debugStep", debugStep);

  const submissionsQuery = await submissionsTable.selectRecordsAsync({
    fields: safeFields(submissionsTable, Object.values(CONFIG.submissions)),
  });

  const submission = submissionsQuery.getRecord(submissionId);

  if (!submission) {
    await markAssetError(asset, `Linked Submission could not be loaded: ${submissionId}`);
  }

  const homeworkField = homeworkFieldForSlot(slot);
  const homeworkId = firstLinkedId(submission, homeworkField);

  if (!homeworkId) {
    await markAssetError(
      asset,
      `Submission is missing ${homeworkField}. Cannot create Homework Completion.`
    );
  }

  debugStep = "find_homework_completion";
  setOutputSafe("debugStep", debugStep);

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

  debugStep = "create_or_link_homework_completion";
  setOutputSafe("debugStep", debugStep);

  let homeworkCompletionId = "";
  let actionOut = "";

  if (homeworkCompletion) {
    actionOut = "linked_existing";

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
      setTextField(updateFields, homeworkTable, CONFIG.homework.assetLabel, text(asset, CONFIG.assets.assetLabel));
    }

    if (!text(homeworkCompletion, CONFIG.homework.originalFileName)) {
      setTextField(
        updateFields,
        homeworkTable,
        CONFIG.homework.originalFileName,
        text(asset, CONFIG.assets.originalFileName)
      );
    }

    if (!selectName(homeworkCompletion, CONFIG.homework.assetType)) {
      setSingleSelect(
        updateFields,
        homeworkTable,
        CONFIG.homework.assetType,
        selectName(asset, CONFIG.assets.assetType)
      );
    }

    if (
      !text(homeworkCompletion, CONFIG.homework.googleDriveFileUrl) &&
      text(asset, CONFIG.assets.googleDriveFileUrl)
    ) {
      setTextField(
        updateFields,
        homeworkTable,
        CONFIG.homework.googleDriveFileUrl,
        text(asset, CONFIG.assets.googleDriveFileUrl)
      );
    }

    if (
      !text(homeworkCompletion, CONFIG.homework.googleDriveFileId) &&
      text(asset, CONFIG.assets.googleDriveFileId)
    ) {
      setTextField(
        updateFields,
        homeworkTable,
        CONFIG.homework.googleDriveFileId,
        text(asset, CONFIG.assets.googleDriveFileId)
      );
    }

    Object.assign(
      updateFields,
      buildHomeworkUploadSyncFields(homeworkCompletion, asset)
    );

    if (Object.keys(updateFields).length > 0) {
      await homeworkTable.updateRecordAsync(homeworkCompletion.id, updateFields);
    }

    homeworkCompletionId = homeworkCompletion.id;
  } else {
    actionOut = "created_new";

    const createFields = {};

    setLink(createFields, homeworkTable, CONFIG.homework.homework, [homeworkId]);
    setLink(createFields, homeworkTable, CONFIG.homework.submission, [submission.id]);
    setLink(createFields, homeworkTable, CONFIG.homework.enrollment, enrollmentIds);
    setLink(createFields, homeworkTable, CONFIG.homework.week, linkedIds(submission, CONFIG.submissions.week));
    setLink(createFields, homeworkTable, CONFIG.homework.gradeBand, linkedIds(submission, CONFIG.submissions.gradeBand));
    setLink(
      createFields,
      homeworkTable,
      CONFIG.homework.weeklySummaryLink,
      linkedIds(submission, CONFIG.submissions.weeklySummary)
    );
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

    setTextField(createFields, homeworkTable, CONFIG.homework.assetLabel, text(asset, CONFIG.assets.assetLabel));
    setTextField(createFields, homeworkTable, CONFIG.homework.originalFileName, text(asset, CONFIG.assets.originalFileName));
    setTextField(createFields, homeworkTable, CONFIG.homework.googleDriveFileId, text(asset, CONFIG.assets.googleDriveFileId));
    setTextField(createFields, homeworkTable, CONFIG.homework.googleDriveFileUrl, text(asset, CONFIG.assets.googleDriveFileUrl));
    setTextField(createFields, homeworkTable, CONFIG.homework.googleDriveFolderId, text(asset, CONFIG.assets.googleDriveFolderId));
    setTextField(createFields, homeworkTable, CONFIG.homework.googleDriveFolderUrl, text(asset, CONFIG.assets.googleDriveFolderUrl));
    setTextField(createFields, homeworkTable, CONFIG.homework.uploadError, text(asset, CONFIG.assets.uploadError));

    setDate(createFields, homeworkTable, CONFIG.homework.uploadedAt, cell(asset, CONFIG.assets.uploadedAt));

    if (selectName(asset, CONFIG.assets.uploadStatus) === "Uploaded") {
      setCheckbox(createFields, homeworkTable, CONFIG.homework.writebackComplete, true);
    }

    homeworkCompletionId = await homeworkTable.createRecordAsync(createFields);
  }

  debugStep = "mark_asset_pending_link";
  setOutputSafe("debugStep", debugStep);

  const assetUpdateFields = {};

  setLink(assetUpdateFields, assetsTable, CONFIG.assets.homeworkCompletions, [homeworkCompletionId]);

  if (!selectName(asset, CONFIG.assets.assetSlot)) {
    setSingleSelect(assetUpdateFields, assetsTable, CONFIG.assets.assetSlot, slot);
  }

  const currentUploadStatus = selectName(asset, CONFIG.assets.uploadStatus);

  if (!currentUploadStatus || currentUploadStatus === CONFIG.values.uploadStatusError) {
    setSingleSelect(assetUpdateFields, assetsTable, CONFIG.assets.uploadStatus, CONFIG.values.makeSendStatus);
  }

  setCheckbox(assetUpdateFields, assetsTable, CONFIG.assets.sendToMakeTrigger, true);

  if (Object.keys(assetUpdateFields).length > 0) {
    await assetsTable.updateRecordAsync(asset.id, assetUpdateFields);
  }

  setFinalOutputs({
    statusOut: CONFIG.outputStatuses.success,
    actionOut,
    errorOut: "",
    debugStep: "complete",
    submissionAssetId: asset.id,
    homeworkCompletionId,
    slot,
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

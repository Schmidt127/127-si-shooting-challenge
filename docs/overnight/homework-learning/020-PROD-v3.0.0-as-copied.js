
/************************************************************
 * 020 - Homework - Link or Create Homework Completion
 *
 * Version: v3.0.0
 * Date Written: 2026-05-20
 * Last Updated: 2026-07-14
 * Supersedes: separate 063 (copy Enrollment Grade Band → HC)
 *
 * PURPOSE
 * - Runs from one Submission Assets record.
 * - Confirms the asset is a homework asset and infers HW1/HW2.
 * - Finds the homework assignment from the linked Submission.
 * - Finds or creates the matching Homework Completion.
 * - Links the Submission Asset to the Homework Completion.
 * - Marks the asset Pending Link and checks Send to Make Trigger for 070a.
 * - Sets or repairs Homework Completions → Grade Band from Submission
 *   Grade Band when present, else Enrollment Grade Band (former 063).
 *
 * IMPORTANT DESIGN RULES
 * - Upload Status Make send gate is Pending Link (same ladder as 009, 013, 070a, 070b).
 * - Asset-driven: does not stop because the parent Submission already has another Homework Completion.
 * - Does not write Homework Completions → Airtable Attachment (files stay on Submission Assets).
 * - When asset is already linked, syncs upload writeback fields from the asset (022 also runs post-Make).
 * - Re-queries Homework Completions immediately before create to avoid duplicate rows when 009
 *   creates multiple assets for the same HW slot in parallel (020 race guard).
 * - When multiple matching Homework Completions exist, links to the preferred row instead of erroring.
 * - Grade Band repair is idempotent: skip when HC already has Grade Band; only write when blank.
 * - Missing Enrollment Grade Band → soft-skip GB repair (do not invent).
 * - Former automation 063 must be retired only after DEV live smoke PASS.
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
 * - actionOut = created_new | linked_existing | linked_existing_duplicate_resolved | synced_upload_writeback | skipped_already_linked | error
 * - gradeBandActionOut = copied_grade_band | already_has_grade_band | skipped_no_enrollment_grade_band | skipped_no_enrollment | ""
 * - errorOut
 * - debugStep
 * - submissionAssetId, homeworkCompletionId, slot
 *
 * PRIMARY TABLES USED
 * - Submission Assets
 * - Submissions
 * - Homework Completions
 * - Enrollments (Grade Band repair — former 063)
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Homework Completions create/link fields from Submission + asset
 * - Homework Completions → Grade Band (create + blank repair)
 * - Submission Assets → Homework Completions, Asset Slot, Upload Status, Send to Make Trigger
 *
 * IMPORTANT NOTES
 * - This is not the Make upload automation (070a).
 * - This is not the homework XP automation (065).
 * - This is not parent feedback email.
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — CONFIGURATION
========================================================= */

const CONFIG = {
  scriptName: "020 - Homework - Link or Create Homework Completion",
  version: "v3.0.0",

  tables: {
    assets: "Submission Assets",
    submissions: "Submissions",
    homework: "Homework Completions",
    enrollments: "Enrollments",
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

  enrollments: {
    gradeBand: "Grade Band",
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
let enrollmentsTable;

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

function getHomeworkSlot(homeworkRecord) {
  return (
    selectName(homeworkRecord, CONFIG.homework.assetSlot) ||
    selectName(homeworkRecord, CONFIG.homework.itemSlot)
  );
}

function pickPreferredHomeworkCompletion(candidates) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const ranked = [...candidates].sort((a, b) => {
    const aAssets = linkedIds(a, CONFIG.homework.submissionAssets).length;
    const bAssets = linkedIds(b, CONFIG.homework.submissionAssets).length;
    if (bAssets !== aAssets) return bAssets - aAssets;
    return a.id.localeCompare(b.id);
  });

  console.log(
    JSON.stringify({
      automation: CONFIG.scriptName,
      version: CONFIG.version,
      warning: "multiple_homework_completion_candidates_resolved",
      chosenId: ranked[0].id,
      candidateIds: candidates.map(record => record.id),
    })
  );

  return ranked[0];
}

function findHomeworkCompletionMatch(homeworkRecords, submissionId, homeworkId, slot) {
  const exactCandidates = homeworkRecords.filter(hw => {
    const hwSubmissionId = firstLinkedId(hw, CONFIG.homework.submission);
    const hwHomeworkId = firstLinkedId(hw, CONFIG.homework.homework);
    const hwSlot = getHomeworkSlot(hw);

    return hwSubmissionId === submissionId && hwHomeworkId === homeworkId && hwSlot === slot;
  });

  if (exactCandidates.length > 0) {
    return {
      homeworkCompletion: pickPreferredHomeworkCompletion(exactCandidates),
      matchType: "exact",
      candidateCount: exactCandidates.length,
    };
  }

  const blankSlotCandidates = homeworkRecords.filter(hw => {
    const hwSubmissionId = firstLinkedId(hw, CONFIG.homework.submission);
    const hwHomeworkId = firstLinkedId(hw, CONFIG.homework.homework);
    const hwSlot = getHomeworkSlot(hw);

    return hwSubmissionId === submissionId && hwHomeworkId === homeworkId && !hwSlot;
  });

  if (blankSlotCandidates.length > 0) {
    return {
      homeworkCompletion: pickPreferredHomeworkCompletion(blankSlotCandidates),
      matchType: "blank_slot",
      candidateCount: blankSlotCandidates.length,
    };
  }

  return { homeworkCompletion: null, matchType: "", candidateCount: 0 };
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

async function loadEnrollmentGradeBandIds(enrollmentId) {
  if (!enrollmentId || !enrollmentsTable) return [];
  if (!fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBand)) return [];

  const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId, {
    fields: [CONFIG.enrollments.gradeBand],
  });
  if (!enrollmentRecord) return [];
  return linkedIds(enrollmentRecord, CONFIG.enrollments.gradeBand);
}

/**
 * Prefer Submission Grade Band; fall back to Enrollment Grade Band (former 063).
 * Returns { ids, source }.
 */
async function resolveGradeBandIds({ submissionGradeBandIds, enrollmentId }) {
  if ((submissionGradeBandIds || []).length > 0) {
    return { ids: [...submissionGradeBandIds], source: "submission" };
  }
  if (!enrollmentId) {
    return { ids: [], source: "none" };
  }
  const enrollmentIds = await loadEnrollmentGradeBandIds(enrollmentId);
  if (enrollmentIds.length > 0) {
    return { ids: enrollmentIds, source: "enrollment" };
  }
  return { ids: [], source: "none" };
}

/**
 * Idempotent blank Grade Band repair on an existing HC (former 063).
 * Does not overwrite a non-empty Grade Band.
 */
async function repairHomeworkGradeBandIfBlank(homeworkRecordOrId, enrollmentIdHint) {
  let homeworkRecord = homeworkRecordOrId;
  if (typeof homeworkRecordOrId === "string") {
    homeworkRecord = await homeworkTable.selectRecordAsync(homeworkRecordOrId, {
      fields: safeFields(homeworkTable, [
        CONFIG.homework.enrollment,
        CONFIG.homework.gradeBand,
      ]),
    });
  }
  if (!homeworkRecord) {
    return { action: "skipped_hc_not_found", gradeBandIds: [] };
  }

  const existing = linkedIds(homeworkRecord, CONFIG.homework.gradeBand);
  if (existing.length > 0) {
    return { action: "already_has_grade_band", gradeBandIds: existing };
  }

  const enrollmentId =
    enrollmentIdHint || firstLinkedId(homeworkRecord, CONFIG.homework.enrollment);
  if (!enrollmentId) {
    return { action: "skipped_no_enrollment", gradeBandIds: [] };
  }

  const enrollmentGb = await loadEnrollmentGradeBandIds(enrollmentId);
  if (enrollmentGb.length === 0) {
    return { action: "skipped_no_enrollment_grade_band", gradeBandIds: [] };
  }

  const fields = {};
  setLink(fields, homeworkTable, CONFIG.homework.gradeBand, enrollmentGb);
  if (Object.keys(fields).length > 0) {
    await homeworkTable.updateRecordAsync(homeworkRecord.id, fields);
  }
  return { action: "copied_grade_band", gradeBandIds: enrollmentGb };
}

function setFinalOutputs({
  statusOut,
  actionOut,
  errorOut = "",
  debugStep,
  submissionAssetId = "",
  homeworkCompletionId = "",
  slot = "",
  gradeBandActionOut = "",
}) {
  setOutputSafe("statusOut", statusOut);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut);
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("submissionAssetId", submissionAssetId);
  setOutputSafe("homeworkCompletionId", homeworkCompletionId);
  setOutputSafe("slot", slot);
  setOutputSafe("gradeBandActionOut", gradeBandActionOut);

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut,
    actionOut,
    gradeBandActionOut,
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
  enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

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
    let gradeBandActionOut = "";

    if (homeworkRecord) {
      const syncFields = buildHomeworkUploadSyncFields(homeworkRecord, asset);

      if (Object.keys(syncFields).length > 0) {
        await homeworkTable.updateRecordAsync(homeworkRecord.id, syncFields);
        actionOut = "synced_upload_writeback";
        statusOut = CONFIG.outputStatuses.success;
      }

      debugStep = "repair_grade_band_if_blank";
      setOutputSafe("debugStep", debugStep);
      const repair = await repairHomeworkGradeBandIfBlank(
        homeworkRecord,
        firstLinkedId(asset, CONFIG.assets.enrollment)
      );
      gradeBandActionOut = repair.action;
      if (repair.action === "copied_grade_band" && statusOut === CONFIG.outputStatuses.skipped) {
        statusOut = CONFIG.outputStatuses.success;
        actionOut = "repaired_grade_band";
      }
    }

    setFinalOutputs({
      statusOut,
      actionOut,
      errorOut: "",
      debugStep:
        gradeBandActionOut === "copied_grade_band"
          ? "repaired_grade_band"
          : actionOut === "synced_upload_writeback"
            ? "synced_upload_writeback"
            : "skipped_already_linked",
      submissionAssetId: asset.id,
      homeworkCompletionId: existingHomeworkIds[0],
      slot: selectName(asset, CONFIG.assets.assetSlot),
      gradeBandActionOut,
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

  const homeworkFieldsToLoad = safeFields(homeworkTable, Object.values(CONFIG.homework));

  const homeworkQuery = await homeworkTable.selectRecordsAsync({
    fields: homeworkFieldsToLoad,
  });

  let matchResult = findHomeworkCompletionMatch(
    homeworkQuery.records,
    submission.id,
    homeworkId,
    slot
  );
  let homeworkCompletion = matchResult.homeworkCompletion;

  if (!homeworkCompletion) {
    debugStep = "recheck_homework_completion_before_create";
    setOutputSafe("debugStep", debugStep);

    const recheckQuery = await homeworkTable.selectRecordsAsync({
      fields: homeworkFieldsToLoad,
    });

    matchResult = findHomeworkCompletionMatch(
      recheckQuery.records,
      submission.id,
      homeworkId,
      slot
    );
    homeworkCompletion = matchResult.homeworkCompletion;

    if (homeworkCompletion) {
      console.log(
        JSON.stringify({
          automation: CONFIG.scriptName,
          version: CONFIG.version,
          action: "recheck_found_existing_before_create",
          homeworkCompletionId: homeworkCompletion.id,
          submissionAssetId: asset.id,
          slot,
          matchType: matchResult.matchType,
        })
      );
    }
  }

  debugStep = "create_or_link_homework_completion";
  setOutputSafe("debugStep", debugStep);

  let homeworkCompletionId = "";
  let actionOut = "";
  let gradeBandActionOut = "";

  if (homeworkCompletion) {
    actionOut =
      matchResult.matchType === "exact" && matchResult.candidateCount > 1
        ? "linked_existing_duplicate_resolved"
        : "linked_existing";

    const updateFields = {};
    const existingAssetIds = linkedIds(homeworkCompletion, CONFIG.homework.submissionAssets);
    const mergedAssetIds = [...new Set([...existingAssetIds, asset.id])];

    setLink(updateFields, homeworkTable, CONFIG.homework.submissionAssets, mergedAssetIds);

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

    // Grade Band repair while linking (blank only)
    if (linkedIds(homeworkCompletion, CONFIG.homework.gradeBand).length === 0) {
      const resolved = await resolveGradeBandIds({
        submissionGradeBandIds: linkedIds(submission, CONFIG.submissions.gradeBand),
        enrollmentId: enrollmentIds[0] || firstLinkedId(homeworkCompletion, CONFIG.homework.enrollment),
      });
      if (resolved.ids.length > 0) {
        setLink(updateFields, homeworkTable, CONFIG.homework.gradeBand, resolved.ids);
        gradeBandActionOut = "copied_grade_band";
      } else if (!enrollmentIds[0] && !firstLinkedId(homeworkCompletion, CONFIG.homework.enrollment)) {
        gradeBandActionOut = "skipped_no_enrollment";
      } else {
        gradeBandActionOut = "skipped_no_enrollment_grade_band";
      }
    } else {
      gradeBandActionOut = "already_has_grade_band";
    }

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

    const resolvedCreateGb = await resolveGradeBandIds({
      submissionGradeBandIds: linkedIds(submission, CONFIG.submissions.gradeBand),
      enrollmentId: enrollmentIds[0],
    });
    if (resolvedCreateGb.ids.length > 0) {
      setLink(createFields, homeworkTable, CONFIG.homework.gradeBand, resolvedCreateGb.ids);
      gradeBandActionOut = "copied_grade_band";
    } else if (!enrollmentIds[0]) {
      gradeBandActionOut = "skipped_no_enrollment";
    } else {
      gradeBandActionOut = "skipped_no_enrollment_grade_band";
    }

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
    gradeBandActionOut,
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

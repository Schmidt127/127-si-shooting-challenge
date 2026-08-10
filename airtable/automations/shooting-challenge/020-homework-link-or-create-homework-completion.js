/************************************************************
 * 020 - Homework - Link or Create Homework Completion
 *
 * Version: v3.4.1
 * Date Written: 2026-05-19
 * Last Updated: 2026-08-10
 *
 * PURPOSE
 * - Runs from one Submission Asset when homework upload is ready for HC prep.
 * - Reads authoritative Program Homework Assignment (PHA) from Submission Homework Name 1/2.
 * - Derives curriculum Homework from PHA.Homework Assignment.
 * - Links or creates exactly one Homework Completion per Enrollment + Week + Homework + Slot.
 *
 * IMPORTANT DESIGN RULES
 * - Submissions.Homework Name 1/2 link to PHA (not FBC Curriculum directly).
 * - PHA must match Submission Week, Enrollment Program Instance, and asset slot (HW1/HW2).
 * - Grade Band on PHA is eligibility metadata only — never used for schedule matching.
 * - Uses Submission Asset Enrollment only — never falls back to legacy enrollment.
 * - Fail closed on missing/duplicate/misaligned PHA.
 *
 * INPUT
 * - recordId (Submission Asset rec…)
 *
 * OUTPUTS
 * - statusOut, actionOut, errorOut, debugStep
 * - submissionAssetId, enrollmentId, phaId, homeworkId, homeworkCompletionId, slot
 *
 * TRIGGER
 * - Submission Assets when homework asset ready (Upload Destination = Homework Completions)
 *
 * AUTOMATION NAME
 * - 020 - Homework - Link or Create Homework Completion
 *
 * FOLDER
 * - 02 - Homework
 *
 * SCHEDULING RULE
 * - PHA schedule identity is Homework + Program Instance + Week + Slot + Active.
 * - PHA Grade Band is eligibility/descriptive metadata only and is NEVER used to resolve schedule ownership.
 * - Athlete Grade Band may still be copied to Homework Completions as athlete metadata when available.
 *
 * PRODUCT RULE
 * - One Homework Completion per Enrollment + Week + Homework + Slot.
 * - Re-submits in the same week merge onto the same Homework Completion.
 ************************************************************/

// @ts-nocheck

/** SCRIPT */
const SCRIPT = {
  scriptName: "020 - Homework - Link or Create Homework Completion",
  version: "v3.4.1",
  versionDate: "2026-08-10",
  originalWrittenDate: "2026-05-19",
  lastUpdated: "2026-08-10",
  folder: "02 - Homework",
  automationName: "020 - Homework - Link or Create Homework Completion",
};

const CONFIG = {
  scriptName: SCRIPT.scriptName,
  version: SCRIPT.version,
  tables: {
    assets: "Submission Assets",
    submissions: "Submissions",
    homework: "Homework Completions",
    enrollments: "Enrollments",
    programHomeworkAssignments: "Program Homework Assignments",
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
    programInstance: "Program Instance",
  },
  pha: {
    homeworkAssignment: "Homework Assignment",
    programInstance: "Program Instance",
    week: "Week",
    gradeBand: "Grade Band", // eligibility metadata only; ignored for matching
    slot: "Homework Slot",
    active: "Active?",
  },
  homework: {
    homework: "Homework",
    programHomeworkAssignment: "Program Homework Assignment",
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
    satisfactory: "Satisfactory?",
  },
  values: {
    uploadDestinationHomework: "Homework Completions",
    makeSendStatus: "Pending Link",
    uploadStatusError: "Error",
  },
  outputStatuses: { success: "success", skipped: "skipped", error: "error" },
};

let assetsTable;
let submissionsTable;
let homeworkTable;
let enrollmentsTable;
let phaTable;

function setOutputSafe(name, value) { try { output.set(name, value); } catch {} }
function getField(table, fieldName) { return table.fields.find(field => field.name === fieldName); }
function fieldExists(table, fieldName) { return Boolean(getField(table, fieldName)); }
function isWritable(table, fieldName) {
  const field = getField(table, fieldName);
  if (!field) return false;
  return !new Set(["formula","rollup","count","lookup","multipleLookupValues","createdTime","lastModifiedTime","autoNumber","createdBy","lastModifiedBy","button","externalSyncSource"]).has(field.type);
}
function safeFields(table, names) { return [...new Set(names)].filter(name => fieldExists(table, name)); }
function cell(record, fieldName) { try { return record.getCellValue(fieldName); } catch { return null; } }
function text(record, fieldName) { try { return String(record.getCellValueAsString(fieldName) || "").trim(); } catch { return ""; } }
function selectName(record, fieldName) { const v = cell(record, fieldName); return v?.name ? String(v.name).trim() : ""; }
function linkedIds(record, fieldName) { const v = cell(record, fieldName); return Array.isArray(v) ? v.map(x => x?.id).filter(Boolean) : []; }
function firstLinkedId(record, fieldName) { return linkedIds(record, fieldName)[0] || ""; }
function attachments(record, fieldName) { const v = cell(record, fieldName); return Array.isArray(v) ? v : []; }
function choiceExists(table, fieldName, choiceName) { return Boolean(getField(table, fieldName)?.options?.choices?.some(c => c.name === choiceName)); }
function setLink(fields, table, fieldName, ids) { if (isWritable(table, fieldName)) fields[fieldName] = [...new Set((ids || []).filter(Boolean))].map(id => ({ id })); }
function setSingleSelect(fields, table, fieldName, choiceName) { if (isWritable(table, fieldName) && choiceName && choiceExists(table, fieldName, choiceName)) fields[fieldName] = { name: choiceName }; }
function setCheckbox(fields, table, fieldName, value) { if (isWritable(table, fieldName)) fields[fieldName] = Boolean(value); }
function setTextField(fields, table, fieldName, value) { if (isWritable(table, fieldName) && value !== undefined && value !== null && value !== "") fields[fieldName] = String(value); }
function setDate(fields, table, fieldName, value) { if (isWritable(table, fieldName) && value) fields[fieldName] = value; }
function booleanish(record, fieldName) {
  const v = cell(record, fieldName);
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  return ["1","true","yes","checked","active"].includes(String(v).trim().toLowerCase());
}
function inferSlot(asset) {
  const existing = selectName(asset, CONFIG.assets.assetSlot);
  if (existing === "HW1" || existing === "HW2") return existing;
  const purpose = selectName(asset, CONFIG.assets.assetPurpose);
  if (purpose === "Homework 1") return "HW1";
  if (purpose === "Homework 2") return "HW2";
  const label = text(asset, CONFIG.assets.assetLabel);
  if (label.startsWith("HW1")) return "HW1";
  if (label.startsWith("HW2")) return "HW2";
  return "";
}
function homeworkFieldForSlot(slot) { return slot === "HW1" ? CONFIG.submissions.homeworkName1 : slot === "HW2" ? CONFIG.submissions.homeworkName2 : ""; }
function getHomeworkSlot(hw) { return selectName(hw, CONFIG.homework.assetSlot) || selectName(hw, CONFIG.homework.itemSlot); }
function unloadQuerySafe(q) { if (typeof q?.unloadData === "function") try { q.unloadData(); } catch {} }

/**
 * Load PHA from Submission Homework Name field and validate schedule alignment.
 * Submissions.Homework Name 1/2 must link to Program Homework Assignments (authoritative).
 */
async function loadAndValidateSubmissionPha({ submission, slot, weekId, programInstanceId }) {
  if (!phaTable) throw new Error("Program Homework Assignments table is unavailable; cannot validate scheduled homework.");
  if (!fieldExists(homeworkTable, CONFIG.homework.programHomeworkAssignment)) {
    throw new Error("Homework Completions.Program Homework Assignment field is unavailable.");
  }

  const phaField = homeworkFieldForSlot(slot);
  if (!phaField) throw new Error(`Cannot resolve PHA field for slot ${slot || "blank"}.`);

  const phaIds = linkedIds(submission, phaField);
  if (phaIds.length === 0) {
    throw new Error(`Submission must have exactly one ${phaField} (Program Homework Assignment); found 0.`);
  }
  if (phaIds.length > 1) {
    throw new Error(`Submission must have exactly one ${phaField} (Program Homework Assignment); found ${phaIds.length}.`);
  }

  const phaId = phaIds[0];
  const phaFields = [
    CONFIG.pha.homeworkAssignment,
    CONFIG.pha.programInstance,
    CONFIG.pha.week,
    CONFIG.pha.slot,
    CONFIG.pha.active,
  ];
  if (fieldExists(phaTable, CONFIG.pha.gradeBand)) phaFields.push(CONFIG.pha.gradeBand);

  const pha = await phaTable.selectRecordAsync(phaId, { fields: safeFields(phaTable, phaFields) });
  if (!pha) throw new Error(`Program Homework Assignment not found: ${phaId}`);

  if (!booleanish(pha, CONFIG.pha.active)) {
    throw new Error(`Program Homework Assignment ${phaId} is missing or inactive.`);
  }

  const phaWeekIds = linkedIds(pha, CONFIG.pha.week);
  if (phaWeekIds.length !== 1 || phaWeekIds[0] !== weekId) {
    throw new Error(
      `PHA Week mismatch: submission week=${weekId || "blank"}, pha week=${phaWeekIds.join(",") || "blank"}.`
    );
  }

  const phaPiIds = linkedIds(pha, CONFIG.pha.programInstance);
  if (phaPiIds.length !== 1 || phaPiIds[0] !== programInstanceId) {
    throw new Error(
      `PHA Program Instance mismatch: enrollment programInstance=${programInstanceId || "blank"}, pha programInstance=${phaPiIds.join(",") || "blank"}.`
    );
  }

  const phaSlot = selectName(pha, CONFIG.pha.slot);
  if (phaSlot !== slot) {
    throw new Error(`PHA Homework Slot mismatch: asset slot=${slot}, pha slot=${phaSlot || "blank"}.`);
  }

  const homeworkIds = linkedIds(pha, CONFIG.pha.homeworkAssignment);
  if (homeworkIds.length !== 1) {
    throw new Error(
      `Program Homework Assignment ${phaId} must have exactly one Homework Assignment; found ${homeworkIds.length}.`
    );
  }

  return { phaId, homeworkId: homeworkIds[0] };
}

function pickPreferredHomeworkCompletion(candidates) {
  if (!candidates?.length) return null;
  if (candidates.length === 1) return candidates[0];
  return [...candidates].sort((a,b) => {
    const aSat = fieldExists(homeworkTable, CONFIG.homework.satisfactory) && cell(a, CONFIG.homework.satisfactory) === true ? 1 : 0;
    const bSat = fieldExists(homeworkTable, CONFIG.homework.satisfactory) && cell(b, CONFIG.homework.satisfactory) === true ? 1 : 0;
    if (bSat !== aSat) return bSat - aSat;
    const aAssets = linkedIds(a, CONFIG.homework.submissionAssets).length;
    const bAssets = linkedIds(b, CONFIG.homework.submissionAssets).length;
    if (bAssets !== aAssets) return bAssets - aAssets;
    return a.id.localeCompare(b.id);
  })[0];
}
function findHomeworkCompletionMatch(records, { submissionId, enrollmentId, weekId, homeworkId, slot }) {
  const c = records.filter(hw => firstLinkedId(hw, CONFIG.homework.enrollment) === enrollmentId && firstLinkedId(hw, CONFIG.homework.week) === weekId && firstLinkedId(hw, CONFIG.homework.homework) === homeworkId && getHomeworkSlot(hw) === slot);
  if (c.length) return { homeworkCompletion: pickPreferredHomeworkCompletion(c), matchType: "enrollment_week_homework_slot", candidateCount: c.length };
  const e = records.filter(hw => firstLinkedId(hw, CONFIG.homework.submission) === submissionId && firstLinkedId(hw, CONFIG.homework.homework) === homeworkId && getHomeworkSlot(hw) === slot);
  if (e.length) return { homeworkCompletion: pickPreferredHomeworkCompletion(e), matchType: "exact", candidateCount: e.length };
  const b = records.filter(hw => firstLinkedId(hw, CONFIG.homework.submission) === submissionId && firstLinkedId(hw, CONFIG.homework.homework) === homeworkId && !getHomeworkSlot(hw));
  if (b.length) return { homeworkCompletion: pickPreferredHomeworkCompletion(b), matchType: "blank_slot", candidateCount: b.length };
  return { homeworkCompletion: null, matchType: "", candidateCount: 0 };
}
function mapAssetUploadStatusToHomeworkStatus(s) { return s === "Uploaded" ? "Uploaded" : s === "Processing" ? "Processing" : s === "Error" ? "Error" : "Pending"; }
function datesEqual(a,b) { if (!a && !b) return true; if (!a || !b) return false; return new Date(a).getTime() === new Date(b).getTime(); }
function syncTextFromAsset(fields, childField, childRecord, asset, assetField) {
  if (!isWritable(homeworkTable, childField) || !fieldExists(assetsTable, assetField)) return;
  const av = text(asset, assetField), cv = text(childRecord, childField);
  if (av !== cv) fields[childField] = av;
}
function buildHomeworkUploadSyncFields(hw, asset) {
  const fields = {};
  const assetStatus = selectName(asset, CONFIG.assets.uploadStatus);
  const targetStatus = mapAssetUploadStatusToHomeworkStatus(assetStatus);
  if (targetStatus !== selectName(hw, CONFIG.homework.uploadStatus)) setSingleSelect(fields, homeworkTable, CONFIG.homework.uploadStatus, targetStatus);
  syncTextFromAsset(fields, CONFIG.homework.googleDriveFileUrl, hw, asset, CONFIG.assets.googleDriveFileUrl);
  syncTextFromAsset(fields, CONFIG.homework.googleDriveFileId, hw, asset, CONFIG.assets.googleDriveFileId);
  syncTextFromAsset(fields, CONFIG.homework.googleDriveFolderId, hw, asset, CONFIG.assets.googleDriveFolderId);
  syncTextFromAsset(fields, CONFIG.homework.googleDriveFolderUrl, hw, asset, CONFIG.assets.googleDriveFolderUrl);
  const assetError = text(asset, CONFIG.assets.uploadError), currentError = text(hw, CONFIG.homework.uploadError);
  if (assetError !== currentError && isWritable(homeworkTable, CONFIG.homework.uploadError)) fields[CONFIG.homework.uploadError] = assetError;
  const assetUploadedAt = cell(asset, CONFIG.assets.uploadedAt), currentUploadedAt = cell(hw, CONFIG.homework.uploadedAt);
  if (!datesEqual(assetUploadedAt, currentUploadedAt)) setDate(fields, homeworkTable, CONFIG.homework.uploadedAt, assetUploadedAt);
  if (assetStatus === "Uploaded" && cell(hw, CONFIG.homework.writebackComplete) !== true) setCheckbox(fields, homeworkTable, CONFIG.homework.writebackComplete, true);
  return fields;
}
function setFinalOutputs(p) { for (const [k,v] of Object.entries(p)) setOutputSafe(k,v); console.log(JSON.stringify({ automation: CONFIG.scriptName, version: CONFIG.version, ...p })); }
async function markAssetError(asset, message) {
  const fields = {};
  setSingleSelect(fields, assetsTable, CONFIG.assets.uploadStatus, CONFIG.values.uploadStatusError);
  if (isWritable(assetsTable, CONFIG.assets.uploadError)) fields[CONFIG.assets.uploadError] = message;
  if (Object.keys(fields).length) await assetsTable.updateRecordAsync(asset.id, fields);
  throw new Error(message);
}

async function main() {
  setOutputSafe("debugStep", "start");
  setOutputSafe("version", CONFIG.version);

  const recordId = String(input.config().recordId || "").trim();
  if (!recordId) throw new Error("Missing required input variable: recordId");
  if (!recordId.startsWith("rec")) throw new Error(`Invalid recordId: ${recordId}`);

  assetsTable = base.getTable(CONFIG.tables.assets);
  submissionsTable = base.getTable(CONFIG.tables.submissions);
  homeworkTable = base.getTable(CONFIG.tables.homework);
  enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  phaTable = base.getTable(CONFIG.tables.programHomeworkAssignments);

  setOutputSafe("debugStep", "load_asset");
  const assetQuery = await assetsTable.selectRecordsAsync({ fields: safeFields(assetsTable, Object.values(CONFIG.assets)) });
  const asset = assetQuery.getRecord(recordId);
  if (!asset) throw new Error(`Submission Asset not found: ${recordId}`);

  const existingHomeworkIds = linkedIds(asset, CONFIG.assets.homeworkCompletions);
  const uploadDestination = text(asset, CONFIG.assets.uploadDestination);
  const assetPurpose = selectName(asset, CONFIG.assets.assetPurpose);
  const assetAttachments = attachments(asset, CONFIG.assets.attachment);
  const submissionIds = linkedIds(asset, CONFIG.assets.submission);
  const enrollmentIds = linkedIds(asset, CONFIG.assets.enrollment);
  const slot = inferSlot(asset);

  if (uploadDestination !== CONFIG.values.uploadDestinationHomework) await markAssetError(asset, `Upload Destination is not Homework Completions. Actual: ${uploadDestination}`);
  if (!(assetPurpose === "Homework 1" || assetPurpose === "Homework 2")) await markAssetError(asset, `Asset Purpose must be Homework 1 or Homework 2. Actual: ${assetPurpose}`);
  if (!assetAttachments.length) await markAssetError(asset, "Asset has no Airtable Attachment.");
  if (submissionIds.length !== 1) await markAssetError(asset, `Asset must have exactly one linked Submission; found ${submissionIds.length}.`);
  if (enrollmentIds.length !== 1) await markAssetError(asset, `Asset must have exactly one linked Enrollment; found ${enrollmentIds.length}.`);
  if (!(slot === "HW1" || slot === "HW2")) await markAssetError(asset, "Could not infer HW1/HW2.");

  const submissionId = submissionIds[0];
  const enrollmentId = enrollmentIds[0];
  setOutputSafe("submissionAssetId", asset.id);
  setOutputSafe("enrollmentId", enrollmentId);

  setOutputSafe("debugStep", "load_submission");
  const submissionsQuery = await submissionsTable.selectRecordsAsync({ fields: safeFields(submissionsTable, Object.values(CONFIG.submissions)) });
  const submission = submissionsQuery.getRecord(submissionId);
  if (!submission) await markAssetError(asset, `Linked Submission could not be loaded: ${submissionId}`);

  const submissionEnrollmentIds = linkedIds(submission, CONFIG.submissions.enrollment);
  if (submissionEnrollmentIds.length !== 1 || submissionEnrollmentIds[0] !== enrollmentId) {
    await markAssetError(asset, "Submission Enrollment does not match Submission Asset Enrollment. Legacy enrollment fallback is not permitted.");
  }
  const weekIds = linkedIds(submission, CONFIG.submissions.week);
  if (weekIds.length !== 1) await markAssetError(asset, `Submission must have exactly one Week; found ${weekIds.length}.`);
  const weekId = weekIds[0];

  setOutputSafe("debugStep", "load_enrollment");
  const enrollmentFields = [CONFIG.enrollments.programInstance];
  if (fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBand)) enrollmentFields.push(CONFIG.enrollments.gradeBand);
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId, { fields: safeFields(enrollmentsTable, enrollmentFields) });
  if (!enrollment) await markAssetError(asset, `Enrollment could not be loaded: ${enrollmentId}`);
  const programInstanceIds = linkedIds(enrollment, CONFIG.enrollments.programInstance);
  if (programInstanceIds.length !== 1) await markAssetError(asset, `Enrollment must have exactly one Program Instance; found ${programInstanceIds.length}.`);
  const programInstanceId = programInstanceIds[0];
  const athleteGradeBandIds = fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBand) ? linkedIds(enrollment, CONFIG.enrollments.gradeBand) : [];
  const gradeBandId = athleteGradeBandIds.length === 1 ? athleteGradeBandIds[0] : "";

  setOutputSafe("debugStep", "validate_pha");
  const { phaId, homeworkId } = await loadAndValidateSubmissionPha({
    submission,
    slot,
    weekId,
    programInstanceId,
  });
  setOutputSafe("phaId", phaId);
  setOutputSafe("homeworkId", homeworkId);

  setOutputSafe("debugStep", "match_homework_completion");
  const homeworkFields = safeFields(homeworkTable, Object.values(CONFIG.homework));
  const homeworkQuery = await homeworkTable.selectRecordsAsync({ fields: homeworkFields });
  const matchArgs = { submissionId, enrollmentId, weekId, homeworkId, slot };
  let match = findHomeworkCompletionMatch(homeworkQuery.records, matchArgs);
  let homeworkCompletion = match.homeworkCompletion;
  if (!homeworkCompletion) {
    const recheck = await homeworkTable.selectRecordsAsync({ fields: homeworkFields });
    match = findHomeworkCompletionMatch(recheck.records, matchArgs);
    homeworkCompletion = match.homeworkCompletion;
    unloadQuerySafe(recheck);
  }
  unloadQuerySafe(homeworkQuery);
  unloadQuerySafe(submissionsQuery);
  unloadQuerySafe(assetQuery);

  if (existingHomeworkIds.length > 1) await markAssetError(asset, `Submission Asset links multiple Homework Completions (${existingHomeworkIds.length}).`);
  if (existingHomeworkIds.length === 1 && homeworkCompletion && existingHomeworkIds[0] !== homeworkCompletion.id) {
    await markAssetError(asset, `Asset links Homework Completion ${existingHomeworkIds[0]}, but canonical assignment resolves to ${homeworkCompletion.id}.`);
  }

  let homeworkCompletionId = "";
  let actionOut = "";
  let gradeBandActionOut = gradeBandId ? "" : "skipped_no_enrollment_grade_band";

  if (homeworkCompletion) {
    actionOut = match.candidateCount > 1 ? "linked_existing_duplicate_resolved" : match.matchType === "enrollment_week_homework_slot" ? "linked_existing_enrollment_identity" : "linked_existing";
    const updates = {};
    setLink(updates, homeworkTable, CONFIG.homework.submissionAssets, [...linkedIds(homeworkCompletion, CONFIG.homework.submissionAssets), asset.id]);
    setLink(updates, homeworkTable, CONFIG.homework.submission, [...linkedIds(homeworkCompletion, CONFIG.homework.submission), submissionId]);
    if (!selectName(homeworkCompletion, CONFIG.homework.assetSlot)) setSingleSelect(updates, homeworkTable, CONFIG.homework.assetSlot, slot);
    if (!selectName(homeworkCompletion, CONFIG.homework.itemSlot)) setSingleSelect(updates, homeworkTable, CONFIG.homework.itemSlot, slot);
    if (!firstLinkedId(homeworkCompletion, CONFIG.homework.homework)) setLink(updates, homeworkTable, CONFIG.homework.homework, [homeworkId]);
    const existingPhaIds = linkedIds(homeworkCompletion, CONFIG.homework.programHomeworkAssignment);
    if (!existingPhaIds.length) setLink(updates, homeworkTable, CONFIG.homework.programHomeworkAssignment, [phaId]);
    else if (existingPhaIds.length !== 1 || existingPhaIds[0] !== phaId) {
      await markAssetError(asset, `Homework Completion ${homeworkCompletion.id} has conflicting Program Homework Assignment ownership.`);
    }
    Object.assign(updates, buildHomeworkUploadSyncFields(homeworkCompletion, asset));
    if (gradeBandId && linkedIds(homeworkCompletion, CONFIG.homework.gradeBand).length === 0) { setLink(updates, homeworkTable, CONFIG.homework.gradeBand, [gradeBandId]); gradeBandActionOut = "copied_grade_band"; }
    else if (linkedIds(homeworkCompletion, CONFIG.homework.gradeBand).length) gradeBandActionOut = "already_has_grade_band";
    if (Object.keys(updates).length) await homeworkTable.updateRecordAsync(homeworkCompletion.id, updates);
    homeworkCompletionId = homeworkCompletion.id;
  } else {
    actionOut = "created_new";
    const fields = {};
    setLink(fields, homeworkTable, CONFIG.homework.homework, [homeworkId]);
    setLink(fields, homeworkTable, CONFIG.homework.programHomeworkAssignment, [phaId]);
    setLink(fields, homeworkTable, CONFIG.homework.submission, [submissionId]);
    setLink(fields, homeworkTable, CONFIG.homework.enrollment, [enrollmentId]);
    setLink(fields, homeworkTable, CONFIG.homework.week, [weekId]);
    if (gradeBandId) { setLink(fields, homeworkTable, CONFIG.homework.gradeBand, [gradeBandId]); gradeBandActionOut = "copied_grade_band"; }
    setLink(fields, homeworkTable, CONFIG.homework.weeklySummaryLink, linkedIds(submission, CONFIG.submissions.weeklySummary));
    setLink(fields, homeworkTable, CONFIG.homework.submissionAssets, [asset.id]);
    setDate(fields, homeworkTable, CONFIG.homework.submissionDate, cell(submission, CONFIG.submissions.activityDate));
    setSingleSelect(fields, homeworkTable, CONFIG.homework.uploadStatus, mapAssetUploadStatusToHomeworkStatus(selectName(asset, CONFIG.assets.uploadStatus)));
    setSingleSelect(fields, homeworkTable, CONFIG.homework.completionStatus, "Submitted");
    setSingleSelect(fields, homeworkTable, CONFIG.homework.reviewStatus, "Ready for Review");
    setSingleSelect(fields, homeworkTable, CONFIG.homework.assetSlot, slot);
    setSingleSelect(fields, homeworkTable, CONFIG.homework.itemSlot, slot);
    setSingleSelect(fields, homeworkTable, CONFIG.homework.assetType, selectName(asset, CONFIG.assets.assetType));
    setSingleSelect(fields, homeworkTable, CONFIG.homework.assetPurpose, "Homework Turn-In");
    setSingleSelect(fields, homeworkTable, CONFIG.homework.sourceSystem, "Fillout");
    setSingleSelect(fields, homeworkTable, CONFIG.homework.itemType, "Homework");
    setTextField(fields, homeworkTable, CONFIG.homework.assetLabel, text(asset, CONFIG.assets.assetLabel));
    setTextField(fields, homeworkTable, CONFIG.homework.originalFileName, text(asset, CONFIG.assets.originalFileName));
    setTextField(fields, homeworkTable, CONFIG.homework.googleDriveFileId, text(asset, CONFIG.assets.googleDriveFileId));
    setTextField(fields, homeworkTable, CONFIG.homework.googleDriveFileUrl, text(asset, CONFIG.assets.googleDriveFileUrl));
    setTextField(fields, homeworkTable, CONFIG.homework.googleDriveFolderId, text(asset, CONFIG.assets.googleDriveFolderId));
    setTextField(fields, homeworkTable, CONFIG.homework.googleDriveFolderUrl, text(asset, CONFIG.assets.googleDriveFolderUrl));
    setTextField(fields, homeworkTable, CONFIG.homework.uploadError, text(asset, CONFIG.assets.uploadError));
    setDate(fields, homeworkTable, CONFIG.homework.uploadedAt, cell(asset, CONFIG.assets.uploadedAt));
    if (selectName(asset, CONFIG.assets.uploadStatus) === "Uploaded") setCheckbox(fields, homeworkTable, CONFIG.homework.writebackComplete, true);
    homeworkCompletionId = await homeworkTable.createRecordAsync(fields);
  }

  setOutputSafe("debugStep", "update_asset");
  const assetUpdates = {};
  setLink(assetUpdates, assetsTable, CONFIG.assets.homeworkCompletions, [homeworkCompletionId]);
  if (!selectName(asset, CONFIG.assets.assetSlot)) setSingleSelect(assetUpdates, assetsTable, CONFIG.assets.assetSlot, slot);
  const currentStatus = selectName(asset, CONFIG.assets.uploadStatus);
  if (!currentStatus || currentStatus === CONFIG.values.uploadStatusError) setSingleSelect(assetUpdates, assetsTable, CONFIG.assets.uploadStatus, CONFIG.values.makeSendStatus);
  setCheckbox(assetUpdates, assetsTable, CONFIG.assets.sendToMakeTrigger, true);
  if (Object.keys(assetUpdates).length) await assetsTable.updateRecordAsync(asset.id, assetUpdates);

  setFinalOutputs({
    statusOut: CONFIG.outputStatuses.success,
    actionOut,
    errorOut: "",
    debugStep: "complete",
    version: CONFIG.version,
    submissionAssetId: asset.id,
    enrollmentId,
    phaId,
    homeworkId,
    homeworkCompletionId,
    slot,
    gradeBandActionOut,
    gradeBandSchedulingUsed: false,
  });
}

try { await main(); }
catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputSafe("version", CONFIG.version);
  setOutputSafe("statusOut", CONFIG.outputStatuses.error);
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", "error");
  console.log(JSON.stringify({ automation: CONFIG.scriptName, version: CONFIG.version, statusOut: "error", actionOut: "error", errorOut: message }));
  throw error;
}

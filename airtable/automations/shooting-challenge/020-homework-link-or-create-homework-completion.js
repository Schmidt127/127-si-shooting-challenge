/************************************************************
 * 020 - Homework - Link or Create Homework Completion
 *
 * Version: v3.3.0
 * Date Written: 2026-05-20
 * Last Updated: 2026-08-09
 * Supersedes: separate 063 (copy Enrollment Grade Band → HC)
 *
 * PURPOSE
 * - Runs from one Submission Assets record.
 * - Confirms the asset is a homework asset and infers HW1/HW2.
 * - Finds the homework assignment from the linked Submission.
 * - Finds or creates the matching Homework Completion.
 * - Links the Submission Asset to the Homework Completion.
 * - When Program Homework Assignments exist, resolves the active junction
 *   record (Program Instance + Week + Grade Band + Slot) and links it on HC.
 * - Marks the asset Pending Link and checks Send to Make Trigger for 070a.
 * - Sets or repairs Homework Completions → Grade Band from Submission
 *   Grade Band when present, else Enrollment Grade Band (former 063).
 *
 * Version 3.3.0 updates (2026-08-09):
 * - #103: Fail closed unless asset has exactly one Submission and Enrollment,
 *   the same-slot Homework Name exists exactly once, Submission Enrollment matches,
 *   Week is exactly one, and Enrollment resolves exactly one Program Instance + Grade Band.
 * - #103: Require exactly one ACTIVE Program Homework Assignment matching
 *   Homework + Program Instance + Week + Grade Band + slot; no blank wildcard,
 *   no zero-match continuation, and no first-of-multiple behavior.
 * - #103: Existing Homework Completion must preserve the exact PHA link;
 *   conflicting PHA ownership fails closed.
 *
 * Version 3.2.0 updates (2026-08-05):
 * - SC-016: Prefer Enrollment + Week + Homework + Slot identity so re-submits
 *   in the same week attach to one HC (not one HC per Submission).
 * - Still accepts exact Submission+Homework+Slot and blank-slot matches.
 * - unloadQuerySafe for large selectRecordsAsync results.
 *
 * Version 3.1.0 updates (2026-08-05):
 * - Additive link to Program Homework Assignment on create/update when resolvable.
 * - Legacy Homework library link on HC retained.
 *
 * IMPORTANT DESIGN RULES
 * - Upload Status Make send gate is Pending Link (same ladder as 009, 013, 070a, 070b).
 * - Asset-driven: does not stop because the parent Submission already has another Homework Completion.
 * - Does not write Homework Completions → Airtable Attachment (files stay on Submission Assets).
 * - When asset is already linked, syncs upload writeback fields from the asset (022 also runs post-Make).
 * - SC-016 product rule: one Homework Completion per Enrollment + Week + Homework + Slot.
 *   Multiple Submissions in the same week for the same slot merge onto that HC.
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

const CONFIG = {
  scriptName: "020 - Homework - Link or Create Homework Completion",
  version: "v3.3.0",

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
    gradeBand: "Grade Band",
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
let phaTable;

function setOutputSafe(name, value) {
  try { output.set(name, value); } catch {}
}
function getField(table, fieldName) { return table.fields.find(field => field.name === fieldName); }
function fieldExists(table, fieldName) { return Boolean(getField(table, fieldName)); }
function isWritable(table, fieldName) {
  const field = getField(table, fieldName);
  if (!field) return false;
  const readOnlyTypes = new Set(["formula","rollup","count","lookup","multipleLookupValues","createdTime","lastModifiedTime","autoNumber","createdBy","lastModifiedBy","button","externalSyncSource"]);
  return !readOnlyTypes.has(field.type);
}
function safeFields(table, fieldNames) { return [...new Set(fieldNames)].filter(name => fieldExists(table, name)); }
function cell(record, fieldName) { try { return record.getCellValue(fieldName); } catch { return null; } }
function text(record, fieldName) { try { return String(record.getCellValueAsString(fieldName) || "").trim(); } catch { return ""; } }
function selectName(record, fieldName) { const value = cell(record, fieldName); return value?.name ? String(value.name).trim() : ""; }
function linkedIds(record, fieldName) { const value = cell(record, fieldName); return Array.isArray(value) ? value.map(item => item?.id).filter(Boolean) : []; }
function firstLinkedId(record, fieldName) { return linkedIds(record, fieldName)[0] || ""; }
function attachments(record, fieldName) { const value = cell(record, fieldName); return Array.isArray(value) ? value : []; }
function choiceExists(table, fieldName, choiceName) { const field = getField(table, fieldName); return Boolean(field?.options?.choices?.some(choice => choice.name === choiceName)); }
function setLink(fields, table, fieldName, ids) { if (isWritable(table, fieldName)) fields[fieldName] = [...new Set((ids || []).filter(Boolean))].map(id => ({ id })); }
function setSingleSelect(fields, table, fieldName, choiceName) { if (isWritable(table, fieldName) && choiceName && choiceExists(table, fieldName, choiceName)) fields[fieldName] = { name: choiceName }; }
function setCheckbox(fields, table, fieldName, value) { if (isWritable(table, fieldName)) fields[fieldName] = Boolean(value); }
function setTextField(fields, table, fieldName, value) { if (isWritable(table, fieldName) && value !== undefined && value !== null && value !== "") fields[fieldName] = String(value); }
function setDate(fields, table, fieldName, value) { if (isWritable(table, fieldName) && value) fields[fieldName] = value; }

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

async function resolveProgramHomeworkAssignmentId({ weekId, gradeBandId, programInstanceId, slot, homeworkLibraryId }) {
  if (!phaTable) throw new Error("Program Homework Assignments table is unavailable; cannot validate scheduled homework.");
  if (!fieldExists(homeworkTable, CONFIG.homework.programHomeworkAssignment)) throw new Error("Homework Completions.Program Homework Assignment field is unavailable.");
  if (!weekId || !gradeBandId || !programInstanceId || !slot || !homeworkLibraryId) {
    throw new Error(`Cannot resolve PHA without exact Week, Grade Band, Program Instance, slot, and Homework. week=${weekId || "blank"}, gradeBand=${gradeBandId || "blank"}, programInstance=${programInstanceId || "blank"}, slot=${slot || "blank"}, homework=${homeworkLibraryId || "blank"}`);
  }
  const query = await phaTable.selectRecordsAsync({ fields: safeFields(phaTable, Object.values(CONFIG.pha)) });
  const matches = query.records.filter(record => {
    const weekIds = linkedIds(record, CONFIG.pha.week);
    const homeworkIds = linkedIds(record, CONFIG.pha.homeworkAssignment);
    const gbIds = linkedIds(record, CONFIG.pha.gradeBand);
    const piIds = linkedIds(record, CONFIG.pha.programInstance);
    const recordSlot = selectName(record, CONFIG.pha.slot);
    const active = cell(record, CONFIG.pha.active);
    return weekIds.length === 1 && weekIds[0] === weekId && homeworkIds.length === 1 && homeworkIds[0] === homeworkLibraryId && gbIds.length === 1 && gbIds[0] === gradeBandId && piIds.length === 1 && piIds[0] === programInstanceId && recordSlot === slot && (active === true || active === 1 || active === "1");
  });
  if (matches.length === 0) throw new Error(`No active Program Homework Assignment matches Homework=${homeworkLibraryId}, Program Instance=${programInstanceId}, Week=${weekId}, Grade Band=${gradeBandId}, Slot=${slot}.`);
  if (matches.length > 1) throw new Error(`Multiple active Program Homework Assignments match the same homework context: ${matches.map(r => r.id).join(", ")}`);
  return matches[0].id;
}

function getHomeworkSlot(homeworkRecord) { return selectName(homeworkRecord, CONFIG.homework.assetSlot) || selectName(homeworkRecord, CONFIG.homework.itemSlot); }
function unloadQuerySafe(queryResult) { if (typeof queryResult?.unloadData === "function") { try { queryResult.unloadData(); } catch {} } }
function pickPreferredHomeworkCompletion(candidates) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return [...candidates].sort((a,b) => {
    const aSat = fieldExists(homeworkTable, CONFIG.homework.satisfactory) && cell(a, CONFIG.homework.satisfactory) === true ? 1 : 0;
    const bSat = fieldExists(homeworkTable, CONFIG.homework.satisfactory) && cell(b, CONFIG.homework.satisfactory) === true ? 1 : 0;
    if (bSat !== aSat) return bSat-aSat;
    const aAssets = linkedIds(a, CONFIG.homework.submissionAssets).length;
    const bAssets = linkedIds(b, CONFIG.homework.submissionAssets).length;
    if (bAssets !== aAssets) return bAssets-aAssets;
    return a.id.localeCompare(b.id);
  })[0];
}
function findHomeworkCompletionMatch(homeworkRecords, { submissionId, enrollmentId, weekId, homeworkId, slot }) {
  if (enrollmentId && weekId && homeworkId && slot) {
    const c = homeworkRecords.filter(hw => firstLinkedId(hw, CONFIG.homework.enrollment) === enrollmentId && firstLinkedId(hw, CONFIG.homework.week) === weekId && firstLinkedId(hw, CONFIG.homework.homework) === homeworkId && getHomeworkSlot(hw) === slot);
    if (c.length) return { homeworkCompletion: pickPreferredHomeworkCompletion(c), matchType: "enrollment_week_homework_slot", candidateCount: c.length };
  }
  const e = homeworkRecords.filter(hw => firstLinkedId(hw, CONFIG.homework.submission) === submissionId && firstLinkedId(hw, CONFIG.homework.homework) === homeworkId && getHomeworkSlot(hw) === slot);
  if (e.length) return { homeworkCompletion: pickPreferredHomeworkCompletion(e), matchType: "exact", candidateCount: e.length };
  const b = homeworkRecords.filter(hw => firstLinkedId(hw, CONFIG.homework.submission) === submissionId && firstLinkedId(hw, CONFIG.homework.homework) === homeworkId && !getHomeworkSlot(hw));
  if (b.length) return { homeworkCompletion: pickPreferredHomeworkCompletion(b), matchType: "blank_slot", candidateCount: b.length };
  return { homeworkCompletion: null, matchType: "", candidateCount: 0 };
}
function mapAssetUploadStatusToHomeworkStatus(assetStatus) { if (assetStatus === "Uploaded") return "Uploaded"; if (assetStatus === "Processing") return "Processing"; if (assetStatus === "Error") return "Error"; return "Pending"; }
function datesEqual(a,b) { if (!a && !b) return true; if (!a || !b) return false; return new Date(a).getTime() === new Date(b).getTime(); }
function syncTextFromAsset(fields, childTable, childField, childRecord, asset, assetField) { if (!isWritable(childTable, childField) || !fieldExists(assetsTable, assetField)) return; const av=text(asset,assetField), cv=text(childRecord,childField); if (av!==cv) fields[childField]=av; }
function buildHomeworkUploadSyncFields(homeworkRecord, asset) {
  const fields={}; const assetUploadStatus=selectName(asset,CONFIG.assets.uploadStatus); const targetStatus=mapAssetUploadStatusToHomeworkStatus(assetUploadStatus); const currentStatus=selectName(homeworkRecord,CONFIG.homework.uploadStatus);
  if (targetStatus && targetStatus!==currentStatus) setSingleSelect(fields,homeworkTable,CONFIG.homework.uploadStatus,targetStatus);
  syncTextFromAsset(fields,homeworkTable,CONFIG.homework.googleDriveFileUrl,homeworkRecord,asset,CONFIG.assets.googleDriveFileUrl);
  syncTextFromAsset(fields,homeworkTable,CONFIG.homework.googleDriveFileId,homeworkRecord,asset,CONFIG.assets.googleDriveFileId);
  syncTextFromAsset(fields,homeworkTable,CONFIG.homework.googleDriveFolderId,homeworkRecord,asset,CONFIG.assets.googleDriveFolderId);
  syncTextFromAsset(fields,homeworkTable,CONFIG.homework.googleDriveFolderUrl,homeworkRecord,asset,CONFIG.assets.googleDriveFolderUrl);
  const assetError=text(asset,CONFIG.assets.uploadError), currentError=text(homeworkRecord,CONFIG.homework.uploadError); if (assetError!==currentError && isWritable(homeworkTable,CONFIG.homework.uploadError)) fields[CONFIG.homework.uploadError]=assetError;
  const assetUploadedAt=cell(asset,CONFIG.assets.uploadedAt), currentUploadedAt=cell(homeworkRecord,CONFIG.homework.uploadedAt); if (!datesEqual(assetUploadedAt,currentUploadedAt)) setDate(fields,homeworkTable,CONFIG.homework.uploadedAt,assetUploadedAt);
  if (assetUploadStatus==="Uploaded" && cell(homeworkRecord,CONFIG.homework.writebackComplete)!==true) setCheckbox(fields,homeworkTable,CONFIG.homework.writebackComplete,true);
  return fields;
}
async function loadEnrollmentGradeBandIds(enrollmentId) { if (!enrollmentId || !enrollmentsTable || !fieldExists(enrollmentsTable,CONFIG.enrollments.gradeBand)) return []; const r=await enrollmentsTable.selectRecordAsync(enrollmentId,{fields:[CONFIG.enrollments.gradeBand]}); return r?linkedIds(r,CONFIG.enrollments.gradeBand):[]; }
async function resolveGradeBandIds({ submissionGradeBandIds, enrollmentId }) { if ((submissionGradeBandIds||[]).length>0) return {ids:[...submissionGradeBandIds],source:"submission"}; if(!enrollmentId)return{ids:[],source:"none"}; const ids=await loadEnrollmentGradeBandIds(enrollmentId); return ids.length?{ids,source:"enrollment"}:{ids:[],source:"none"}; }
function setFinalOutputs({statusOut,actionOut,errorOut="",debugStep,submissionAssetId="",homeworkCompletionId="",slot="",gradeBandActionOut=""}) { const p={statusOut,actionOut,errorOut,debugStep,submissionAssetId,homeworkCompletionId,slot,gradeBandActionOut}; for(const[k,v]of Object.entries(p))setOutputSafe(k,v); console.log(JSON.stringify({automation:CONFIG.scriptName,version:CONFIG.version,...p})); }
async function markAssetError(asset,message){ const fields={}; setSingleSelect(fields,assetsTable,CONFIG.assets.uploadStatus,CONFIG.values.uploadStatusError); if(isWritable(assetsTable,CONFIG.assets.uploadError))fields[CONFIG.assets.uploadError]=message; if(Object.keys(fields).length)await assetsTable.updateRecordAsync(asset.id,fields); throw new Error(message); }

async function main(){
  let debugStep="start";
  const recordId=String(input.config().recordId||"").trim();
  if(!recordId)throw new Error("Missing required input variable: recordId");
  if(!recordId.startsWith("rec"))throw new Error(`Invalid recordId input. Expected Airtable record ID, received: ${recordId}`);
  assetsTable=base.getTable(CONFIG.tables.assets); submissionsTable=base.getTable(CONFIG.tables.submissions); homeworkTable=base.getTable(CONFIG.tables.homework); enrollmentsTable=base.getTable(CONFIG.tables.enrollments); try{phaTable=base.getTable(CONFIG.tables.programHomeworkAssignments);}catch{phaTable=null;}
  const assetQuery=await assetsTable.selectRecordsAsync({fields:safeFields(assetsTable,Object.values(CONFIG.assets))}); const asset=assetQuery.getRecord(recordId); if(!asset)throw new Error(`Submission Asset not found: ${recordId}`);
  const existingHomeworkIds=linkedIds(asset,CONFIG.assets.homeworkCompletions);
  const uploadDestination=text(asset,CONFIG.assets.uploadDestination); const assetPurpose=selectName(asset,CONFIG.assets.assetPurpose); const assetAttachments=attachments(asset,CONFIG.assets.attachment); const submissionIds=linkedIds(asset,CONFIG.assets.submission); const submissionId=submissionIds[0]||""; const enrollmentIds=linkedIds(asset,CONFIG.assets.enrollment); const slot=inferSlot(asset);
  if(uploadDestination!==CONFIG.values.uploadDestinationHomework)await markAssetError(asset,`Upload Destination is not Homework Completions. Actual: ${uploadDestination}`);
  if(!(assetPurpose==="Homework 1"||assetPurpose==="Homework 2"))await markAssetError(asset,`Asset Purpose must be Homework 1 or Homework 2. Actual: ${assetPurpose}`);
  if(assetAttachments.length===0)await markAssetError(asset,"Asset has no Airtable Attachment.");
  if(submissionIds.length!==1)await markAssetError(asset,`Asset must have exactly one linked Submission; found ${submissionIds.length}.`);
  if(enrollmentIds.length!==1)await markAssetError(asset,`Asset must have exactly one linked Enrollment; found ${enrollmentIds.length}.`);
  if(!(slot==="HW1"||slot==="HW2"))await markAssetError(asset,"Could not infer HW1/HW2 from Asset Slot, Asset Purpose, or Asset Label.");
  const submissionsQuery=await submissionsTable.selectRecordsAsync({fields:safeFields(submissionsTable,Object.values(CONFIG.submissions))}); const submission=submissionsQuery.getRecord(submissionId); if(!submission){unloadQuerySafe(submissionsQuery);await markAssetError(asset,`Linked Submission could not be loaded: ${submissionId}`);}
  const homeworkField=homeworkFieldForSlot(slot); const homeworkIds=linkedIds(submission,homeworkField); if(homeworkIds.length!==1)await markAssetError(asset,`Submission must have exactly one ${homeworkField}; found ${homeworkIds.length}.`); const homeworkId=homeworkIds[0];
  const submissionEnrollmentIds=linkedIds(submission,CONFIG.submissions.enrollment); if(submissionEnrollmentIds.length!==1)await markAssetError(asset,`Submission must have exactly one Enrollment; found ${submissionEnrollmentIds.length}.`); if(submissionEnrollmentIds[0]!==enrollmentIds[0])await markAssetError(asset,"Submission Enrollment does not match Submission Asset Enrollment.");
  const weekIds=linkedIds(submission,CONFIG.submissions.week); if(weekIds.length!==1)await markAssetError(asset,`Submission must have exactly one Week; found ${weekIds.length}.`);
  const enrollmentRecord=await enrollmentsTable.selectRecordAsync(enrollmentIds[0],{fields:safeFields(enrollmentsTable,[CONFIG.enrollments.programInstance,CONFIG.enrollments.gradeBand])}); if(!enrollmentRecord)await markAssetError(asset,`Enrollment could not be loaded: ${enrollmentIds[0]}`);
  const programInstanceIds=linkedIds(enrollmentRecord,CONFIG.enrollments.programInstance); if(programInstanceIds.length!==1)await markAssetError(asset,`Enrollment must have exactly one Program Instance; found ${programInstanceIds.length}.`);
  const enrollmentGradeBandIds=linkedIds(enrollmentRecord,CONFIG.enrollments.gradeBand); if(enrollmentGradeBandIds.length!==1)await markAssetError(asset,`Enrollment must have exactly one Grade Band; found ${enrollmentGradeBandIds.length}.`);
  const submissionGradeBandIds=linkedIds(submission,CONFIG.submissions.gradeBand); if(submissionGradeBandIds.length>0&&(submissionGradeBandIds.length!==1||submissionGradeBandIds[0]!==enrollmentGradeBandIds[0]))await markAssetError(asset,"Submission Grade Band conflicts with authoritative Enrollment Grade Band.");
  const programInstanceId=programInstanceIds[0], gradeBandId=enrollmentGradeBandIds[0]; const phaId=await resolveProgramHomeworkAssignmentId({weekId:weekIds[0],gradeBandId,programInstanceId,slot,homeworkLibraryId:homeworkId});
  const homeworkFieldsToLoad=safeFields(homeworkTable,Object.values(CONFIG.homework)); const homeworkQuery=await homeworkTable.selectRecordsAsync({fields:homeworkFieldsToLoad}); const matchArgs={submissionId:submission.id,enrollmentId:enrollmentIds[0],weekId:weekIds[0],homeworkId,slot}; let matchResult=findHomeworkCompletionMatch(homeworkQuery.records,matchArgs); let homeworkCompletion=matchResult.homeworkCompletion;
  if(!homeworkCompletion){const recheckQuery=await homeworkTable.selectRecordsAsync({fields:homeworkFieldsToLoad}); matchResult=findHomeworkCompletionMatch(recheckQuery.records,matchArgs); homeworkCompletion=matchResult.homeworkCompletion; unloadQuerySafe(recheckQuery);} unloadQuerySafe(homeworkQuery); unloadQuerySafe(submissionsQuery);
  if(existingHomeworkIds.length>1)await markAssetError(asset,`Submission Asset links multiple Homework Completions (${existingHomeworkIds.length}).`); if(existingHomeworkIds.length===1&&homeworkCompletion&&existingHomeworkIds[0]!==homeworkCompletion.id)await markAssetError(asset,`Submission Asset links Homework Completion ${existingHomeworkIds[0]}, but canonical assignment resolves to ${homeworkCompletion.id}.`);
  let homeworkCompletionId="",actionOut="",gradeBandActionOut="";
  if(homeworkCompletion){actionOut=matchResult.candidateCount>1?"linked_existing_duplicate_resolved":matchResult.matchType==="enrollment_week_homework_slot"?"linked_existing_enrollment_identity":"linked_existing"; const updateFields={}; const existingAssetIds=linkedIds(homeworkCompletion,CONFIG.homework.submissionAssets); setLink(updateFields,homeworkTable,CONFIG.homework.submissionAssets,[...new Set([...existingAssetIds,asset.id])]); const existingSubmissionIds=linkedIds(homeworkCompletion,CONFIG.homework.submission); setLink(updateFields,homeworkTable,CONFIG.homework.submission,[...new Set([...existingSubmissionIds,submission.id])]); if(!selectName(homeworkCompletion,CONFIG.homework.assetSlot))setSingleSelect(updateFields,homeworkTable,CONFIG.homework.assetSlot,slot); if(!selectName(homeworkCompletion,CONFIG.homework.itemSlot))setSingleSelect(updateFields,homeworkTable,CONFIG.homework.itemSlot,slot); if(!firstLinkedId(homeworkCompletion,CONFIG.homework.homework))setLink(updateFields,homeworkTable,CONFIG.homework.homework,[homeworkId]); const existingPhaIds=linkedIds(homeworkCompletion,CONFIG.homework.programHomeworkAssignment); if(existingPhaIds.length===0)setLink(updateFields,homeworkTable,CONFIG.homework.programHomeworkAssignment,[phaId]); else if(existingPhaIds.length!==1||existingPhaIds[0]!==phaId)await markAssetError(asset,`Homework Completion ${homeworkCompletion.id} has conflicting Program Homework Assignment ownership.`); Object.assign(updateFields,buildHomeworkUploadSyncFields(homeworkCompletion,asset)); if(linkedIds(homeworkCompletion,CONFIG.homework.gradeBand).length===0){setLink(updateFields,homeworkTable,CONFIG.homework.gradeBand,[gradeBandId]);gradeBandActionOut="copied_grade_band";}else gradeBandActionOut="already_has_grade_band"; if(Object.keys(updateFields).length)await homeworkTable.updateRecordAsync(homeworkCompletion.id,updateFields); homeworkCompletionId=homeworkCompletion.id;
  }else{actionOut="created_new"; const createFields={}; setLink(createFields,homeworkTable,CONFIG.homework.homework,[homeworkId]); setLink(createFields,homeworkTable,CONFIG.homework.programHomeworkAssignment,[phaId]); setLink(createFields,homeworkTable,CONFIG.homework.submission,[submission.id]); setLink(createFields,homeworkTable,CONFIG.homework.enrollment,enrollmentIds); setLink(createFields,homeworkTable,CONFIG.homework.week,weekIds); setLink(createFields,homeworkTable,CONFIG.homework.gradeBand,[gradeBandId]); gradeBandActionOut="copied_grade_band"; setLink(createFields,homeworkTable,CONFIG.homework.weeklySummaryLink,linkedIds(submission,CONFIG.submissions.weeklySummary)); setLink(createFields,homeworkTable,CONFIG.homework.submissionAssets,[asset.id]); setDate(createFields,homeworkTable,CONFIG.homework.submissionDate,cell(submission,CONFIG.submissions.activityDate)); setSingleSelect(createFields,homeworkTable,CONFIG.homework.uploadStatus,mapAssetUploadStatusToHomeworkStatus(selectName(asset,CONFIG.assets.uploadStatus))); setSingleSelect(createFields,homeworkTable,CONFIG.homework.completionStatus,"Submitted"); setSingleSelect(createFields,homeworkTable,CONFIG.homework.reviewStatus,"Ready for Review"); setSingleSelect(createFields,homeworkTable,CONFIG.homework.assetSlot,slot); setSingleSelect(createFields,homeworkTable,CONFIG.homework.itemSlot,slot); setSingleSelect(createFields,homeworkTable,CONFIG.homework.assetType,selectName(asset,CONFIG.assets.assetType)); setSingleSelect(createFields,homeworkTable,CONFIG.homework.assetPurpose,"Homework Turn-In"); setSingleSelect(createFields,homeworkTable,CONFIG.homework.sourceSystem,"Fillout"); setSingleSelect(createFields,homeworkTable,CONFIG.homework.itemType,"Homework"); setTextField(createFields,homeworkTable,CONFIG.homework.assetLabel,text(asset,CONFIG.assets.assetLabel)); setTextField(createFields,homeworkTable,CONFIG.homework.originalFileName,text(asset,CONFIG.assets.originalFileName)); setTextField(createFields,homeworkTable,CONFIG.homework.googleDriveFileId,text(asset,CONFIG.assets.googleDriveFileId)); setTextField(createFields,homeworkTable,CONFIG.homework.googleDriveFileUrl,text(asset,CONFIG.assets.googleDriveFileUrl)); setTextField(createFields,homeworkTable,CONFIG.homework.googleDriveFolderId,text(asset,CONFIG.assets.googleDriveFolderId)); setTextField(createFields,homeworkTable,CONFIG.homework.googleDriveFolderUrl,text(asset,CONFIG.assets.googleDriveFolderUrl)); setTextField(createFields,homeworkTable,CONFIG.homework.uploadError,text(asset,CONFIG.assets.uploadError)); setDate(createFields,homeworkTable,CONFIG.homework.uploadedAt,cell(asset,CONFIG.assets.uploadedAt)); if(selectName(asset,CONFIG.assets.uploadStatus)==="Uploaded")setCheckbox(createFields,homeworkTable,CONFIG.homework.writebackComplete,true); homeworkCompletionId=await homeworkTable.createRecordAsync(createFields); }
  const assetUpdateFields={}; setLink(assetUpdateFields,assetsTable,CONFIG.assets.homeworkCompletions,[homeworkCompletionId]); if(!selectName(asset,CONFIG.assets.assetSlot))setSingleSelect(assetUpdateFields,assetsTable,CONFIG.assets.assetSlot,slot); const currentUploadStatus=selectName(asset,CONFIG.assets.uploadStatus); if(!currentUploadStatus||currentUploadStatus===CONFIG.values.uploadStatusError)setSingleSelect(assetUpdateFields,assetsTable,CONFIG.assets.uploadStatus,CONFIG.values.makeSendStatus); setCheckbox(assetUpdateFields,assetsTable,CONFIG.assets.sendToMakeTrigger,true); if(Object.keys(assetUpdateFields).length)await assetsTable.updateRecordAsync(asset.id,assetUpdateFields);
  setFinalOutputs({statusOut:CONFIG.outputStatuses.success,actionOut,errorOut:"",debugStep:"complete",submissionAssetId:asset.id,homeworkCompletionId,slot,gradeBandActionOut});
}

try{await main();}catch(error){const message=error instanceof Error?error.message:String(error);setOutputSafe("statusOut",CONFIG.outputStatuses.error);setOutputSafe("actionOut","error");setOutputSafe("errorOut",message);setOutputSafe("debugStep","error");console.log(JSON.stringify({automation:CONFIG.scriptName,version:CONFIG.version,statusOut:CONFIG.outputStatuses.error,actionOut:"error",errorOut:message,debugStep:"error"}));throw error;}

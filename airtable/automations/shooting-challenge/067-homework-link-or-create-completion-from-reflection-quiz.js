/*
Automation: 067 - Homework - Link or Create Completion from Reflection Quiz
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Version: v3.4
Last Updated: 2026-08-10

Scheduling rule:
- Submissions.Homework Name 1 stores Program Homework Assignment (PHA) record IDs.
- HW17 schedule is resolved PI-first from active PHA rows (HW1 slot), then content-checked via PHA.Homework Assignment → Homework Library HW 17.
- Homework Completions.Homework = library ID; Program Homework Assignment = PHA ID when field exists.
- Quiz-linked and discovered Homework Completions must match Enrollment + Week + Library + PHA exactly; duplicate matches fail closed.
- PHA Grade Band is eligibility/descriptive metadata only and is NEVER used to resolve the schedule.
- Athlete Grade Band may still be copied to Homework Completion as metadata.

Approved product path remains SC-014 Option B: attachment-less reflection quiz bridge succeeds with zero assets.
Optional attachment handling is retained when a quiz attachment field/file is present.
*/

// @ts-nocheck

const CONFIG = {
  scriptName: "067 - Homework - Link or Create Completion from Reflection Quiz",
  version: "v3.4",
  tables: {
    quiz: "Final Reflection Quiz Submissions",
    homework: "Homework Completions",
    homeworkLibrary: "Homework Library",
    programHomeworkAssignments: "Program Homework Assignments",
    enrollments: "Enrollments",
    submissions: "Submissions",
    assets: "Submission Assets",
    weeklySummaries: "Weekly Athlete Summary",
  },
  quiz: {
    enrollment: "Enrollment",
    homeworkCompletion: "Homework Completion",
    submittedAt: "Submitted At",
    processingStatus: "Processing Status",
    processingError: "Processing Error",
    attachmentCandidates: ["Quiz Result PDF","Quiz PDF","Reflection Quiz PDF","PDF Attachment","Attachment"],
  },
  homework: {
    enrollment: "Enrollment",
    homework: "Homework",
    programHomeworkAssignment: "Program Homework Assignment",
    week: "Week",
    gradeBand: "Grade Band",
    finalQuiz: "Final Reflection Quiz Submissions",
    sourceSystem: "Source System",
    itemType: "Item Type",
    completionStatus: "Completion Status",
    reviewStatus: "Review Status",
    submissionDate: "Submission Date",
    submissionAssets: "Submission Assets",
    submissionsLinked: "Submissions - Linked",
    weeklySummaryLink: "Weekly Athlete Summary Link",
    itemSlot: "Item Slot",
    assetSlot: "Asset Slot",
  },
  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    homeworkName1: "Homework Name 1", // PHA record ID (Program Homework Assignments)
    hwSub1: "HW Sub 1",
    submissionAssets: "Submission Assets",
  },
  assets: {
    enrollment: "Enrollment - Linked",
    submission: "Submission - Linked",
    attachment: "Airtable Attachment",
    sourceAttachmentId: "Source Attachment ID",
    originalFileName: "Original File Name",
    assetPurpose: "Asset Purpose",
    assetType: "Asset Type",
    assetSlot: "Asset Slot",
    assetLabel: "Asset Label",
    uploadStatus: "Upload Status",
    sendToMakeTrigger: "Send to Make Trigger",
    homeworkCompletions: "Homework Completions",
  },
  homeworkLibrary: { homeworkNumber: "Homework Number", active: "Active?" },
  pha: {
    homeworkAssignment: "Homework Assignment",
    programInstance: "Program Instance",
    week: "Week",
    gradeBand: "Grade Band", // eligibility metadata only; ignored for matching
    slot: "Homework Slot",
    active: "Active?",
  },
  enrollments: { gradeBand: "Grade Band", programInstance: "Program Instance" },
  values: {
    homeworkNumber17: "HW 17",
    sourceSystemFillout: "Fillout",
    itemTypeHomework: "Homework",
    completionStatusSubmitted: "Submitted",
    reviewStatusReady: "Ready for Review",
    processingProcessed: "Processed",
    processingNeedsReview: "Needs Review",
    processingError: "Error",
    purposeHomework1: "Homework 1",
    slotHw1: "HW1",
    uploadPendingLink: "Pending Link",
  },
  outputStatuses: { success: "success", skipped: "skipped", error: "error" },
};

let quizTable, homeworkTable, homeworkLibraryTable, phaTable, enrollmentsTable, submissionsTable, assetsTable, weeklySummariesTable;

function setOutputSafe(name, value) { try { output.set(name, value); } catch {} }
function getField(table, fieldName) { return table.fields.find(f => f.name === fieldName); }
function fieldExists(table, fieldName) { return Boolean(getField(table, fieldName)); }
function isWritable(table, fieldName) {
  const field = getField(table, fieldName);
  if (!field) return false;
  return !new Set(["formula","rollup","count","lookup","multipleLookupValues","createdTime","lastModifiedTime","autoNumber","createdBy","lastModifiedBy","button","aiText","externalSyncSource"]).has(field.type);
}
function safeFields(table, names) { return [...new Set(names)].filter(n => fieldExists(table, n)); }
function cell(record, fieldName) { try { return record.getCellValue(fieldName); } catch { return null; } }
function selectName(record, fieldName) { const v = cell(record, fieldName); return v?.name ? String(v.name).trim() : ""; }
function booleanish(record, fieldName) {
  const v = cell(record, fieldName);
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  return ["true","yes","checked","active","1"].includes(String(v).trim().toLowerCase());
}
function linkedIds(record, fieldName) { const v = cell(record, fieldName); return Array.isArray(v) ? v.map(x => x?.id).filter(Boolean) : []; }
function attachments(record, fieldName) { const v = cell(record, fieldName); return Array.isArray(v) ? v.filter(f => f?.id) : []; }
function text(record, fieldName) { const v = cell(record, fieldName); return v == null ? "" : String(v).trim(); }
function dateValue(record, fieldName) { const v = cell(record, fieldName); if (!v) return null; const d = v instanceof Date ? v : new Date(v); return isNaN(d) ? null : d; }
function choiceExists(table, fieldName, choiceName) { return Boolean(getField(table, fieldName)?.options?.choices?.some(c => c.name === choiceName)); }
function setLink(fields, table, fieldName, ids) { if (isWritable(table, fieldName)) { const cleaned=[...new Set((ids||[]).filter(Boolean))].map(id=>({id})); if(cleaned.length) fields[fieldName]=cleaned; } }
function setSingleSelect(fields, table, fieldName, choiceName) { if (isWritable(table, fieldName) && choiceName && choiceExists(table, fieldName, choiceName)) fields[fieldName] = { name: choiceName }; }
function setDate(fields, table, fieldName, value) { if (isWritable(table, fieldName) && value) fields[fieldName] = value; }
function setText(fields, table, fieldName, value) { if (isWritable(table, fieldName) && value !== undefined && value !== null) fields[fieldName] = String(value); }
function setCheckbox(fields, table, fieldName, value) { if (isWritable(table, fieldName)) fields[fieldName] = Boolean(value); }
function setAttachment(fields, table, fieldName, file) { if (isWritable(table, fieldName) && file) fields[fieldName] = [file]; }
function fileExtension(filename) { const p=String(filename||"").toLowerCase().split("."); return p.length<2?"":p.pop(); }
function inferAssetType(file) {
  const type=String(file.type||"").toLowerCase(), ext=fileExtension(file.filename);
  if(type==="application/pdf"||ext==="pdf") return "Homework PDF";
  if(type.startsWith("image/")||["jpg","jpeg","png","gif","webp","heic"].includes(ext)) return "Homework Image";
  if(["doc","docx","pages"].includes(ext)) return "Homework Document";
  return "Other";
}
function resolveQuizAttachmentField() {
  for (const name of CONFIG.quiz.attachmentCandidates) if (fieldExists(quizTable,name) && isWritable(quizTable,name)) return name;
  for (const field of quizTable.fields) if (field.type === "multipleAttachments" && isWritable(quizTable, field.name)) return field.name;
  return "";
}
function setFinalOutputs(p) { for(const[k,v]of Object.entries(p)) setOutputSafe(k,v); console.log(JSON.stringify({automation:CONFIG.scriptName,version:CONFIG.version,...p})); }
async function markQuizReview(quizId,status,note){const f={};setSingleSelect(f,quizTable,CONFIG.quiz.processingStatus,status);setText(f,quizTable,CONFIG.quiz.processingError,note);if(Object.keys(f).length)await quizTable.updateRecordAsync(quizId,f);}
function buildDedupeKey(enrollmentId,weekId,homeworkId){return `${enrollmentId||""}|${weekId||""}|${homeworkId||""}`;}

async function resolveHw17PhaForEnrollment(enrollmentId) {
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId, { fields: safeFields(enrollmentsTable, [CONFIG.enrollments.programInstance, CONFIG.enrollments.gradeBand]) });
  if (!enrollment) throw new Error(`Enrollment not found: ${enrollmentId}`);
  const piIds = linkedIds(enrollment, CONFIG.enrollments.programInstance);
  if (piIds.length !== 1) throw new Error(`Enrollment ${enrollmentId} must have exactly one Program Instance; found ${piIds.length}.`);
  const programInstanceId = piIds[0];
  const gradeBandIds = fieldExists(enrollmentsTable, CONFIG.enrollments.gradeBand) ? linkedIds(enrollment, CONFIG.enrollments.gradeBand) : [];
  const gradeBandId = gradeBandIds.length === 1 ? gradeBandIds[0] : "";

  const phaFields = [CONFIG.pha.homeworkAssignment, CONFIG.pha.programInstance, CONFIG.pha.week, CONFIG.pha.slot, CONFIG.pha.active];
  const q = await phaTable.selectRecordsAsync({ fields: safeFields(phaTable, phaFields) });
  const slotCandidates = q.records.filter((r) => {
    const pi = linkedIds(r, CONFIG.pha.programInstance);
    return pi.length === 1 && pi[0] === programInstanceId && selectName(r, CONFIG.pha.slot) === CONFIG.values.slotHw1 && booleanish(r, CONFIG.pha.active);
  });

  const hw17Matches = [];
  for (const pha of slotCandidates) {
    const libraryIds = linkedIds(pha, CONFIG.pha.homeworkAssignment);
    if (libraryIds.length !== 1) continue;
    const lib = await homeworkLibraryTable.selectRecordAsync(libraryIds[0], { fields: safeFields(homeworkLibraryTable, Object.values(CONFIG.homeworkLibrary)) });
    if (!lib) continue;
    if (selectName(lib, CONFIG.homeworkLibrary.homeworkNumber) !== CONFIG.values.homeworkNumber17) continue;
    if (fieldExists(homeworkLibraryTable, CONFIG.homeworkLibrary.active) && !booleanish(lib, CONFIG.homeworkLibrary.active)) continue;
    hw17Matches.push({ pha, libraryId: libraryIds[0] });
  }

  if (hw17Matches.length !== 1) {
    throw new Error(`Expected exactly one active HW17 PHA for Program Instance ${programInstanceId} (Slot ${CONFIG.values.slotHw1}); found ${hw17Matches.length}. Grade Band is not part of scheduling.`);
  }
  const { pha, libraryId: hw17LibraryId } = hw17Matches[0];
  const weekIds = linkedIds(pha, CONFIG.pha.week);
  if (weekIds.length !== 1) throw new Error(`Expected exactly one Week on HW17 PHA ${pha.id}, found ${weekIds.length}.`);
  return { hw17WeekId: weekIds[0], phaId: pha.id, hw17LibraryId, programInstanceId, gradeBandId };
}

function findCompletionMatch(records,enrollmentId,weekId,homeworkId){
  const target=buildDedupeKey(enrollmentId,weekId,homeworkId);
  return records.filter(hw=>buildDedupeKey(linkedIds(hw,CONFIG.homework.enrollment)[0]||"",linkedIds(hw,CONFIG.homework.week)[0]||"",linkedIds(hw,CONFIG.homework.homework)[0]||"")===target);
}
function requireSingleCompletionMatch(matches,contextLabel){
  if(matches.length>1)throw new Error(`Multiple Homework Completions match ${contextLabel}: ${matches.map(r=>r.id).join(", ")}`);
  return matches[0]||null;
}
async function validateLinkedHomeworkCompletion(hcId,{enrollmentId,weekId,libraryId,phaId}){
  const fields=safeFields(homeworkTable,[CONFIG.homework.enrollment,CONFIG.homework.week,CONFIG.homework.homework,CONFIG.homework.programHomeworkAssignment]);
  const hc=await homeworkTable.selectRecordAsync(hcId,{fields});
  if(!hc)throw new Error(`Homework Completion not found: ${hcId}`);
  const hcEnrollment=linkedIds(hc,CONFIG.homework.enrollment)[0]||"";
  const hcWeek=linkedIds(hc,CONFIG.homework.week)[0]||"";
  const hcHomework=linkedIds(hc,CONFIG.homework.homework)[0]||"";
  const hcPhaIds=fieldExists(homeworkTable,CONFIG.homework.programHomeworkAssignment)?linkedIds(hc,CONFIG.homework.programHomeworkAssignment):[];
  if(hcEnrollment!==enrollmentId)throw new Error(`Homework Completion ${hcId} Enrollment mismatch: expected ${enrollmentId}, got ${hcEnrollment||"blank"}.`);
  if(hcWeek!==weekId)throw new Error(`Homework Completion ${hcId} Week mismatch: expected ${weekId}, got ${hcWeek||"blank"}.`);
  if(hcHomework!==libraryId)throw new Error(`Homework Completion ${hcId} Homework mismatch: expected ${libraryId}, got ${hcHomework||"blank"}.`);
  let populatePha=false;
  if(fieldExists(homeworkTable,CONFIG.homework.programHomeworkAssignment)){
    if(!hcPhaIds.length)populatePha=true;
    else if(hcPhaIds.length!==1||hcPhaIds[0]!==phaId)throw new Error(`Homework Completion ${hcId} Program Homework Assignment mismatch: expected ${phaId}, got ${hcPhaIds.join(", ")||"blank"}.`);
  }
  return {hc,populatePha};
}
async function populateBlankPhaOnCompletion(hcId,phaId){
  const u={};setLink(u,homeworkTable,CONFIG.homework.programHomeworkAssignment,[phaId]);if(Object.keys(u).length)await homeworkTable.updateRecordAsync(hcId,u);
}
async function linkQuizToCompletion(quiz,hcId,hcRecord){
  const u={};
  setLink(u,homeworkTable,CONFIG.homework.finalQuiz,[...linkedIds(hcRecord,CONFIG.homework.finalQuiz),quiz.id]);
  if(!selectName(hcRecord,CONFIG.homework.sourceSystem))setSingleSelect(u,homeworkTable,CONFIG.homework.sourceSystem,CONFIG.values.sourceSystemFillout);
  setSingleSelect(u,homeworkTable,CONFIG.homework.itemSlot,CONFIG.values.slotHw1);
  setSingleSelect(u,homeworkTable,CONFIG.homework.assetSlot,CONFIG.values.slotHw1);
  if(Object.keys(u).length)await homeworkTable.updateRecordAsync(hcId,u);
  const qu={};setLink(qu,quizTable,CONFIG.quiz.homeworkCompletion,[hcId]);setSingleSelect(qu,quizTable,CONFIG.quiz.processingStatus,CONFIG.values.processingProcessed);setText(qu,quizTable,CONFIG.quiz.processingError,"");if(Object.keys(qu).length)await quizTable.updateRecordAsync(quiz.id,qu);
}
async function resolveWeeklySummaryId(enrollmentId,weekId){
  const q=await weeklySummariesTable.selectRecordsAsync({fields:safeFields(weeklySummariesTable,["Enrollment","Week"])});
  const matches=q.records.filter(s=>{const e=linkedIds(s,"Enrollment"),w=linkedIds(s,"Week");return e.length===1&&w.length===1&&e[0]===enrollmentId&&w[0]===weekId;});
  if(matches.length>1)throw new Error(`Multiple Weekly Athlete Summary records for Enrollment ${enrollmentId} + Week ${weekId}: ${matches.map(r=>r.id).join(", ")}`);
  return matches[0]?.id||"";
}
async function ensureWeeklySummaryLink(hcId,enrollmentId,weekId,summaryId=""){
  if(!fieldExists(homeworkTable,CONFIG.homework.weeklySummaryLink))throw new Error(`Required Homework Completions field is missing: ${CONFIG.homework.weeklySummaryLink}`);
  if(!summaryId)return "";
  const hc=await homeworkTable.selectRecordAsync(hcId,{fields:[CONFIG.homework.weeklySummaryLink]});
  const ids=linkedIds(hc,CONFIG.homework.weeklySummaryLink);
  if(ids.length===1&&ids[0]===summaryId)return summaryId;
  const f={};setLink(f,homeworkTable,CONFIG.homework.weeklySummaryLink,[summaryId]);if(Object.keys(f).length)await homeworkTable.updateRecordAsync(hcId,f);return summaryId;
}

async function findOrCreateParentSubmission(enrollmentId,weekId,phaId,files){
  const q=await submissionsTable.selectRecordsAsync({fields:safeFields(submissionsTable,Object.values(CONFIG.submissions))});
  const matches=q.records.filter(s=>(linkedIds(s,CONFIG.submissions.enrollment)[0]||"")===enrollmentId&&(linkedIds(s,CONFIG.submissions.week)[0]||"")===weekId&&(linkedIds(s,CONFIG.submissions.homeworkName1)[0]||"")===phaId);
  if(matches.length)return{submissionId:matches[0].id,created:false};
  const f={};setLink(f,submissionsTable,CONFIG.submissions.enrollment,[enrollmentId]);setLink(f,submissionsTable,CONFIG.submissions.week,[weekId]);setLink(f,submissionsTable,CONFIG.submissions.homeworkName1,[phaId]);if(files.length&&isWritable(submissionsTable,CONFIG.submissions.hwSub1))f[CONFIG.submissions.hwSub1]=files;
  return{submissionId:await submissionsTable.createRecordAsync(f),created:true};
}
async function ensureAssets({files,enrollmentId,submissionId,homeworkCompletionId}){
  const q=await assetsTable.selectRecordsAsync({fields:safeFields(assetsTable,Object.values(CONFIG.assets))});
  const existingBySource=new Map();for(const a of q.records){const s=text(a,CONFIG.assets.sourceAttachmentId);if(s)existingBySource.set(s,a);}
  const createdIds=[],linkedIdsOut=[];
  for(let i=0;i<files.length;i++){
    const file=files[i],existing=existingBySource.get(file.id);
    if(existing){linkedIdsOut.push(existing.id);const f={};setLink(f,assetsTable,CONFIG.assets.homeworkCompletions,[...linkedIds(existing,CONFIG.assets.homeworkCompletions),homeworkCompletionId]);if(!linkedIds(existing,CONFIG.assets.submission).includes(submissionId))setLink(f,assetsTable,CONFIG.assets.submission,[submissionId]);if(Object.keys(f).length)await assetsTable.updateRecordAsync(existing.id,f);continue;}
    const f={};setLink(f,assetsTable,CONFIG.assets.enrollment,[enrollmentId]);setLink(f,assetsTable,CONFIG.assets.submission,[submissionId]);setAttachment(f,assetsTable,CONFIG.assets.attachment,file);setText(f,assetsTable,CONFIG.assets.sourceAttachmentId,file.id);setText(f,assetsTable,CONFIG.assets.originalFileName,file.filename||"");setText(f,assetsTable,CONFIG.assets.assetLabel,`HW1-${i+1}`);setSingleSelect(f,assetsTable,CONFIG.assets.assetPurpose,CONFIG.values.purposeHomework1);setSingleSelect(f,assetsTable,CONFIG.assets.assetType,inferAssetType(file));setSingleSelect(f,assetsTable,CONFIG.assets.assetSlot,CONFIG.values.slotHw1);setSingleSelect(f,assetsTable,CONFIG.assets.uploadStatus,CONFIG.values.uploadPendingLink);setCheckbox(f,assetsTable,CONFIG.assets.sendToMakeTrigger,false);setLink(f,assetsTable,CONFIG.assets.homeworkCompletions,[homeworkCompletionId]);const id=await assetsTable.createRecordAsync(f);createdIds.push(id);linkedIdsOut.push(id);
  }
  return{createdIds,linkedIdsOut};
}

async function main(){
  const recordId=String(input.config().recordId||"").trim();
  if(!recordId)throw new Error("Missing required input variable: recordId");
  if(!recordId.startsWith("rec"))throw new Error(`Invalid recordId: ${recordId}`);

  quizTable=base.getTable(CONFIG.tables.quiz);homeworkTable=base.getTable(CONFIG.tables.homework);homeworkLibraryTable=base.getTable(CONFIG.tables.homeworkLibrary);phaTable=base.getTable(CONFIG.tables.programHomeworkAssignments);enrollmentsTable=base.getTable(CONFIG.tables.enrollments);submissionsTable=base.getTable(CONFIG.tables.submissions);assetsTable=base.getTable(CONFIG.tables.assets);weeklySummariesTable=base.getTable(CONFIG.tables.weeklySummaries);

  const attachmentFieldName=resolveQuizAttachmentField();
  const quizFields=safeFields(quizTable,[...Object.values(CONFIG.quiz).filter(v=>typeof v==="string"),attachmentFieldName]);
  const quiz=await quizTable.selectRecordAsync(recordId,{fields:quizFields});
  if(!quiz)throw new Error(`Final Reflection Quiz Submission not found: ${recordId}`);

  const alreadyLinked=linkedIds(quiz,CONFIG.quiz.homeworkCompletion);
  if(alreadyLinked.length>1)throw new Error(`Quiz links multiple Homework Completions (${alreadyLinked.length}): ${alreadyLinked.join(", ")}`);
  let homeworkCompletionId=alreadyLinked[0]||"";
  let actionOut=homeworkCompletionId?"linked_existing_quiz":"";
  const enrollmentIds=linkedIds(quiz,CONFIG.quiz.enrollment);
  if(enrollmentIds.length!==1){const note=enrollmentIds.length?`Multiple Enrollments linked: ${enrollmentIds.join(", ")}. Resolve to one.`:"No Enrollment linked on quiz row.";await markQuizReview(quiz.id,CONFIG.values.processingNeedsReview,note);setFinalOutputs({statusOut:CONFIG.outputStatuses.skipped,actionOut:"needs_review",errorOut:note,debugStep:"needs_review_enrollment",quizSubmissionId:quiz.id});return;}
  const enrollmentId=enrollmentIds[0];
  const {hw17WeekId,gradeBandId,phaId,hw17LibraryId}=await resolveHw17PhaForEnrollment(enrollmentId);
  const canonicalWeeklySummaryId=await resolveWeeklySummaryId(enrollmentId,hw17WeekId);
  const weeklySummaryLinkStatus=canonicalWeeklySummaryId?"linked":"deferred_no_canonical_summary";

  if(homeworkCompletionId){
    const {hc,populatePha}=await validateLinkedHomeworkCompletion(homeworkCompletionId,{enrollmentId,weekId:hw17WeekId,libraryId:hw17LibraryId,phaId});
    if(populatePha){await populateBlankPhaOnCompletion(homeworkCompletionId,phaId);actionOut="linked_existing_quiz_populated_pha";}
  }

  if(!homeworkCompletionId){
    const fields=safeFields(homeworkTable,Object.values(CONFIG.homework));
    let q=await homeworkTable.selectRecordsAsync({fields});
    let matches=findCompletionMatch(q.records,enrollmentId,hw17WeekId,hw17LibraryId);
    let match=requireSingleCompletionMatch(matches,"Enrollment + Week + Homework Library");
    if(match){
      homeworkCompletionId=match.id;
      actionOut="linked_existing";
      const validated=await validateLinkedHomeworkCompletion(homeworkCompletionId,{enrollmentId,weekId:hw17WeekId,libraryId:hw17LibraryId,phaId});
      if(validated.populatePha)await populateBlankPhaOnCompletion(homeworkCompletionId,phaId);
      await linkQuizToCompletion(quiz,homeworkCompletionId,match);
    }else{
      q=await homeworkTable.selectRecordsAsync({fields});
      matches=findCompletionMatch(q.records,enrollmentId,hw17WeekId,hw17LibraryId);
      match=requireSingleCompletionMatch(matches,"Enrollment + Week + Homework Library (recheck)");
      if(match){
        homeworkCompletionId=match.id;
        actionOut="linked_existing";
        const validated=await validateLinkedHomeworkCompletion(homeworkCompletionId,{enrollmentId,weekId:hw17WeekId,libraryId:hw17LibraryId,phaId});
        if(validated.populatePha)await populateBlankPhaOnCompletion(homeworkCompletionId,phaId);
        await linkQuizToCompletion(quiz,homeworkCompletionId,match);
      }else{
        actionOut="created_new";
        const f={};
        setLink(f,homeworkTable,CONFIG.homework.enrollment,[enrollmentId]);
        setLink(f,homeworkTable,CONFIG.homework.homework,[hw17LibraryId]);
        if(fieldExists(homeworkTable,CONFIG.homework.programHomeworkAssignment))setLink(f,homeworkTable,CONFIG.homework.programHomeworkAssignment,[phaId]);
        setLink(f,homeworkTable,CONFIG.homework.week,[hw17WeekId]);
        if(gradeBandId)setLink(f,homeworkTable,CONFIG.homework.gradeBand,[gradeBandId]);
        setLink(f,homeworkTable,CONFIG.homework.finalQuiz,[quiz.id]);
        setSingleSelect(f,homeworkTable,CONFIG.homework.sourceSystem,CONFIG.values.sourceSystemFillout);
        setSingleSelect(f,homeworkTable,CONFIG.homework.itemType,CONFIG.values.itemTypeHomework);
        setSingleSelect(f,homeworkTable,CONFIG.homework.completionStatus,CONFIG.values.completionStatusSubmitted);
        setSingleSelect(f,homeworkTable,CONFIG.homework.reviewStatus,CONFIG.values.reviewStatusReady);
        setSingleSelect(f,homeworkTable,CONFIG.homework.itemSlot,CONFIG.values.slotHw1);
        setSingleSelect(f,homeworkTable,CONFIG.homework.assetSlot,CONFIG.values.slotHw1);
        setDate(f,homeworkTable,CONFIG.homework.submissionDate,dateValue(quiz,CONFIG.quiz.submittedAt));
        homeworkCompletionId=await homeworkTable.createRecordAsync(f);
        const qu={};setLink(qu,quizTable,CONFIG.quiz.homeworkCompletion,[homeworkCompletionId]);setSingleSelect(qu,quizTable,CONFIG.quiz.processingStatus,CONFIG.values.processingProcessed);setText(qu,quizTable,CONFIG.quiz.processingError,"");if(Object.keys(qu).length)await quizTable.updateRecordAsync(quiz.id,qu);
      }
    }
  }

  const weeklySummaryId=await ensureWeeklySummaryLink(homeworkCompletionId,enrollmentId,hw17WeekId,canonicalWeeklySummaryId);
  setOutputSafe("weeklySummaryId",weeklySummaryId);setOutputSafe("weeklySummaryLinkStatus",weeklySummaryLinkStatus);setOutputSafe("phaId",phaId);setOutputSafe("libraryId",hw17LibraryId);setOutputSafe("gradeBandSchedulingUsed",false);

  let submissionIdOut="",assetIdsOut="";
  if(!attachmentFieldName){setFinalOutputs({statusOut:CONFIG.outputStatuses.success,actionOut:actionOut||"no_attachment_field",errorOut:"",debugStep:"no_attachment_field",quizSubmissionId:quiz.id,homeworkCompletionId,weeklySummaryId,weeklySummaryLinkStatus,phaId,gradeBandSchedulingUsed:false});return;}
  const quizWithFiles=await quizTable.selectRecordAsync(recordId,{fields:safeFields(quizTable,[attachmentFieldName,CONFIG.quiz.homeworkCompletion])});
  const files=attachments(quizWithFiles,attachmentFieldName);
  if(!files.length){setFinalOutputs({statusOut:CONFIG.outputStatuses.success,actionOut:actionOut||"no_attachment_yet",errorOut:"",debugStep:"no_attachment_yet",quizSubmissionId:quiz.id,homeworkCompletionId,weeklySummaryId,weeklySummaryLinkStatus,phaId,gradeBandSchedulingUsed:false});return;}

  const {submissionId}=await findOrCreateParentSubmission(enrollmentId,hw17WeekId,phaId,files);submissionIdOut=submissionId;
  const {createdIds,linkedIdsOut}=await ensureAssets({files,enrollmentId,submissionId,homeworkCompletionId});assetIdsOut=linkedIdsOut.join(",");
  const hc=await homeworkTable.selectRecordAsync(homeworkCompletionId,{fields:safeFields(homeworkTable,[CONFIG.homework.submissionAssets,CONFIG.homework.submissionsLinked,CONFIG.homework.itemSlot,CONFIG.homework.assetSlot])});
  if(hc){const u={};setLink(u,homeworkTable,CONFIG.homework.submissionAssets,[...linkedIds(hc,CONFIG.homework.submissionAssets),...linkedIdsOut]);setLink(u,homeworkTable,CONFIG.homework.submissionsLinked,[submissionId]);setSingleSelect(u,homeworkTable,CONFIG.homework.itemSlot,CONFIG.values.slotHw1);setSingleSelect(u,homeworkTable,CONFIG.homework.assetSlot,CONFIG.values.slotHw1);if(Object.keys(u).length)await homeworkTable.updateRecordAsync(homeworkCompletionId,u);}
  if(createdIds.length)actionOut="assets_created";else if(linkedIdsOut.length)actionOut="assets_linked";
  setFinalOutputs({statusOut:CONFIG.outputStatuses.success,actionOut:actionOut||"success",errorOut:"",debugStep:"complete",quizSubmissionId:quiz.id,homeworkCompletionId,weeklySummaryId,weeklySummaryLinkStatus,submissionIdOut,assetIdsOut,phaId,libraryId:hw17LibraryId,gradeBandSchedulingUsed:false});
}

try{await main();}catch(error){const message=error instanceof Error?error.message:String(error);setOutputSafe("statusOut",CONFIG.outputStatuses.error);setOutputSafe("actionOut","error");setOutputSafe("errorOut",message);setOutputSafe("debugStep","error");try{const id=String(input.config().recordId||"").trim();if(id.startsWith("rec")&&quizTable)await markQuizReview(id,CONFIG.values.processingError,message);}catch{}console.log(JSON.stringify({automation:CONFIG.scriptName,version:CONFIG.version,statusOut:"error",errorOut:message}));throw error;}

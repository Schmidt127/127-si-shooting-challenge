/*
 * 020 - Homework - Link or Create Homework Completion
 * Version: v3.3.0
 * Rebuilt: 2026-08-09
 * Contract: GitHub issue #103
 *
 * REQUIRED INPUT
 * - recordId = triggering Submission Assets record ID
 *
 * Key v3.3.0 change:
 * - Homework Completion creation/repair is allowed only with exactly one ACTIVE
 *   Program Homework Assignment matching Homework + Program Instance + Week +
 *   Grade Band + slot. No wildcard/first-match behavior.
 */
// @ts-nocheck

const CONFIG = {
  scriptName:"020 - Homework - Link or Create Homework Completion",
  version:"v3.3.0",
  tables:{
    assets:"Submission Assets", submissions:"Submissions", homework:"Homework Completions",
    enrollments:"Enrollments", pha:"Program Homework Assignments",
  },
  assets:{
    submission:"Submission - Linked", enrollment:"Enrollment - Linked", assetLabel:"Asset Label",
    uploadDestination:"Upload Destination", assetPurpose:"Asset Purpose", attachment:"Airtable Attachment",
    homeworkCompletions:"Homework Completions", originalFileName:"Original File Name", assetType:"Asset Type",
    uploadStatus:"Upload Status", uploadError:"Upload Error", uploadedAt:"Uploaded At", assetSlot:"Asset Slot",
    googleDriveFileUrl:"Google Drive File URL", googleDriveFileId:"Google Drive File ID",
    googleDriveFolderId:"Google Drive Folder ID", googleDriveFolderUrl:"Google Drive Folder URL",
    sendToMakeTrigger:"Send to Make Trigger",
  },
  submissions:{
    enrollment:"Enrollment", week:"Week", activityDate:"Activity Date", gradeBand:"Grade Band",
    weeklySummary:"Weekly Athlete Summary", homeworkName1:"Homework Name 1", homeworkName2:"Homework Name 2",
  },
  enrollments:{ gradeBand:"Grade Band", programInstance:"Program Instance" },
  pha:{
    homeworkAssignment:"Homework Assignment", programInstance:"Program Instance", week:"Week",
    gradeBand:"Grade Band", slot:"Homework Slot", active:"Active?",
  },
  homework:{
    homework:"Homework", programHomeworkAssignment:"Program Homework Assignment",
    submission:"Submissions - Linked", uploadStatus:"Upload Status", submissionAssets:"Submission Assets",
    enrollment:"Enrollment", week:"Week", gradeBand:"Grade Band", weeklySummaryLink:"Weekly Athlete Summary Link",
    submissionDate:"Submission Date", completionStatus:"Completion Status", assetLabel:"Asset Label",
    originalFileName:"Original File Name", assetType:"Asset Type", assetPurpose:"Asset Purpose",
    sourceSystem:"Source System", googleDriveFileId:"Google Drive File ID", googleDriveFileUrl:"Google Drive File URL",
    googleDriveFolderId:"Google Drive Folder ID", googleDriveFolderUrl:"Google Drive Folder URL",
    uploadError:"Upload Error", uploadedAt:"Uploaded At", assetSlot:"Asset Slot", itemType:"Item Type",
    itemSlot:"Item Slot", reviewStatus:"Review Status", writebackComplete:"Writeback Complete?", satisfactory:"Satisfactory?",
  },
  values:{ makeSendStatus:"Pending Link" },
};

function out(n,v){ try{output.set(n,v);}catch{} }
function getField(t,n){return t.fields.find(f=>f.name===n);}
function exists(t,n){return Boolean(getField(t,n));}
function writable(t,n){
  const f=getField(t,n); if(!f)return false;
  return !new Set(["formula","rollup","count","lookup","multipleLookupValues","createdTime","lastModifiedTime",
    "autoNumber","createdBy","lastModifiedBy","button","externalSyncSource"]).has(f.type);
}
function safe(t,names){return [...new Set(names)].filter(n=>exists(t,n));}
function cell(r,n){try{return r.getCellValue(n);}catch{return null;}}
function text(r,n){try{return String(r.getCellValueAsString(n)||"").trim();}catch{return "";}}
function links(r,n){const v=cell(r,n);return Array.isArray(v)?v.map(x=>x?.id).filter(Boolean):[];}
function choiceName(r,n){const v=cell(r,n);return v?.name?String(v.name).trim():text(r,n);}
function choiceExists(t,n,c){const f=getField(t,n);return Boolean(f?.options?.choices?.some(x=>x.name===c));}
function setLink(f,t,n,ids){if(writable(t,n))f[n]=[...new Set(ids.filter(Boolean))].map(id=>({id}));}
function setText(f,t,n,v,allowBlank=false){if(writable(t,n)&&(allowBlank||!(v===undefined||v===null||v==="")))f[n]=String(v??"");}
function setChoice(f,t,n,v){if(writable(t,n)&&choiceExists(t,n,v))f[n]={name:v};}
function setCheck(f,t,n,v){if(writable(t,n))f[n]=Boolean(v);}
function setDate(f,t,n,v){if(writable(t,n)&&v)f[n]=v;}
function merge(a,b){return [...new Set([...(a||[]),...(b||[])].filter(Boolean))];}
function fail(message,debugStep,extra={}){
  const p={statusOut:"error",actionOut:"error",gradeBandActionOut:"",errorOut:message,debugStep,...extra};
  console.log(JSON.stringify({automation:CONFIG.scriptName,version:CONFIG.version,...p},null,2));
  for(const [k,v] of Object.entries(p))out(k,v);
  throw new Error(message);
}
function slotFromAsset(asset){
  const slot=choiceName(asset,CONFIG.assets.assetSlot);
  if(slot==="HW1"||slot==="HW2")return slot;
  const purpose=choiceName(asset,CONFIG.assets.assetPurpose);
  if(purpose==="Homework 1")return "HW1";
  if(purpose==="Homework 2")return "HW2";
  return "";
}
function homeworkField(slot){return slot==="HW1"?CONFIG.submissions.homeworkName1:slot==="HW2"?CONFIG.submissions.homeworkName2:"";}
function hcSlot(hc){return choiceName(hc,CONFIG.homework.assetSlot)||choiceName(hc,CONFIG.homework.itemSlot);}
function isActive(v){return v===true||v===1||v==="1";}
function pickPreferred(rows){
  if(rows.length<=1)return rows[0]||null;
  return [...rows].sort((a,b)=>{
    const as=exists(homeworkTable,CONFIG.homework.satisfactory)&&cell(a,CONFIG.homework.satisfactory)===true?1:0;
    const bs=exists(homeworkTable,CONFIG.homework.satisfactory)&&cell(b,CONFIG.homework.satisfactory)===true?1:0;
    if(bs!==as)return bs-as;
    const aa=links(a,CONFIG.homework.submissionAssets).length, ba=links(b,CONFIG.homework.submissionAssets).length;
    if(ba!==aa)return ba-aa;
    return a.id.localeCompare(b.id);
  })[0];
}

let homeworkTable;

function findHcCandidates(records,{submissionId,enrollmentId,weekId,homeworkId,slot}){
  const canonical=records.filter(h=>
    links(h,CONFIG.homework.enrollment).includes(enrollmentId)
    && links(h,CONFIG.homework.week).includes(weekId)
    && links(h,CONFIG.homework.homework).includes(homeworkId)
    && hcSlot(h)===slot
  );
  if(canonical.length)return canonical;

  const legacyExact=records.filter(h=>
    links(h,CONFIG.homework.submission).includes(submissionId)
    && links(h,CONFIG.homework.homework).includes(homeworkId)
    && hcSlot(h)===slot
  );
  if(legacyExact.length)return legacyExact;

  return records.filter(h=>
    links(h,CONFIG.homework.submission).includes(submissionId)
    && links(h,CONFIG.homework.homework).includes(homeworkId)
    && !hcSlot(h)
  );
}

async function repairHomeworkCompletion(hc,{homeworkId,phaId,enrollmentId,weekId,gradeBandId,submission,asset,slot}){
  const existingPha=links(hc,CONFIG.homework.programHomeworkAssignment);
  if(existingPha.length>1)throw new Error(`Homework Completion ${hc.id} links multiple Program Homework Assignments`);
  if(existingPha.length===1&&existingPha[0]!==phaId)throw new Error(`Homework Completion ${hc.id} belongs to a different Program Homework Assignment`);

  const fields={};
  setLink(fields,homeworkTable,CONFIG.homework.homework,[homeworkId]);
  setLink(fields,homeworkTable,CONFIG.homework.programHomeworkAssignment,[phaId]);
  setLink(fields,homeworkTable,CONFIG.homework.enrollment,[enrollmentId]);
  setLink(fields,homeworkTable,CONFIG.homework.week,[weekId]);
  setLink(fields,homeworkTable,CONFIG.homework.gradeBand,[gradeBandId]);
  setLink(fields,homeworkTable,CONFIG.homework.submission,merge(links(hc,CONFIG.homework.submission),[submission.id]));
  setLink(fields,homeworkTable,CONFIG.homework.submissionAssets,merge(links(hc,CONFIG.homework.submissionAssets),[asset.id]));
  const was=links(submission,CONFIG.submissions.weeklySummary);
  if(was.length)setLink(fields,homeworkTable,CONFIG.homework.weeklySummaryLink,was);
  if(!choiceName(hc,CONFIG.homework.assetSlot))setChoice(fields,homeworkTable,CONFIG.homework.assetSlot,slot);
  if(!choiceName(hc,CONFIG.homework.itemSlot))setChoice(fields,homeworkTable,CONFIG.homework.itemSlot,slot);
  if(Object.keys(fields).length)await homeworkTable.updateRecordAsync(hc.id,fields);
}

async function main(){
  let debugStep="start";
  const recordId=String(input.config().recordId||"").trim();
  if(!recordId)fail("Missing required input variable: recordId",debugStep);

  const assetsTable=base.getTable(CONFIG.tables.assets);
  const submissionsTable=base.getTable(CONFIG.tables.submissions);
  homeworkTable=base.getTable(CONFIG.tables.homework);
  const enrollmentsTable=base.getTable(CONFIG.tables.enrollments);
  const phaTable=base.getTable(CONFIG.tables.pha);

  debugStep="load_asset";
  const aq=await assetsTable.selectRecordsAsync({fields:safe(assetsTable,Object.values(CONFIG.assets))});
  const asset=aq.getRecord(recordId);
  if(!asset)fail(`Submission Asset not found: ${recordId}`,debugStep);

  const submissionIds=links(asset,CONFIG.assets.submission);
  const assetEnrollmentIds=links(asset,CONFIG.assets.enrollment);
  const slot=slotFromAsset(asset);

  debugStep="validate_asset";
  if(submissionIds.length!==1)fail(`Homework asset must link exactly one Submission; found ${submissionIds.length}`,debugStep,{submissionAssetId:asset.id,slot});
  if(assetEnrollmentIds.length!==1)fail(`Homework asset must link exactly one Enrollment; found ${assetEnrollmentIds.length}`,debugStep,{submissionAssetId:asset.id,slot});
  if(slot!=="HW1"&&slot!=="HW2")fail(`Asset slot must be HW1 or HW2; found '${slot}'`,debugStep,{submissionAssetId:asset.id});

  debugStep="load_submission";
  const sq=await submissionsTable.selectRecordsAsync({fields:safe(submissionsTable,Object.values(CONFIG.submissions))});
  const submission=sq.getRecord(submissionIds[0]);
  if(!submission)fail(`Submission not found: ${submissionIds[0]}`,debugStep,{submissionAssetId:asset.id,slot});

  const submissionEnrollmentIds=links(submission,CONFIG.submissions.enrollment);
  const weekIds=links(submission,CONFIG.submissions.week);
  const hwIds=links(submission,homeworkField(slot));

  if(submissionEnrollmentIds.length!==1)fail(`Submission must have exactly one Enrollment; found ${submissionEnrollmentIds.length}`,debugStep,{submissionAssetId:asset.id,submissionId:submission.id,slot});
  if(submissionEnrollmentIds[0]!==assetEnrollmentIds[0])fail("Submission Enrollment does not match asset Enrollment",debugStep,{submissionAssetId:asset.id,submissionId:submission.id,slot});
  if(weekIds.length!==1)fail(`Submission must have exactly one Week; found ${weekIds.length}`,debugStep,{submissionAssetId:asset.id,submissionId:submission.id,slot});
  if(hwIds.length!==1)fail(`${homeworkField(slot)} must contain exactly one Homework assignment; found ${hwIds.length}`,debugStep,{submissionAssetId:asset.id,submissionId:submission.id,slot});

  const enrollmentId=assetEnrollmentIds[0], weekId=weekIds[0], homeworkId=hwIds[0];

  debugStep="resolve_enrollment_context";
  const eq=await enrollmentsTable.selectRecordsAsync({fields:safe(enrollmentsTable,Object.values(CONFIG.enrollments))});
  const enrollment=eq.getRecord(enrollmentId);
  if(!enrollment)fail(`Enrollment not found: ${enrollmentId}`,debugStep,{submissionAssetId:asset.id,submissionId:submission.id,slot});

  const piIds=links(enrollment,CONFIG.enrollments.programInstance);
  const enrollmentGbIds=links(enrollment,CONFIG.enrollments.gradeBand);
  const submissionGbIds=links(submission,CONFIG.submissions.gradeBand);

  if(piIds.length!==1)fail(`Enrollment must have exactly one Program Instance; found ${piIds.length}`,debugStep,{submissionAssetId:asset.id,submissionId:submission.id,enrollmentId,slot});
  if(enrollmentGbIds.length!==1)fail(`Enrollment must have exactly one Grade Band; found ${enrollmentGbIds.length}`,debugStep,{submissionAssetId:asset.id,submissionId:submission.id,enrollmentId,slot});
  if(submissionGbIds.length>1)fail(`Submission has multiple Grade Bands; found ${submissionGbIds.length}`,debugStep,{submissionAssetId:asset.id,submissionId:submission.id,enrollmentId,slot});
  if(submissionGbIds.length===1&&submissionGbIds[0]!==enrollmentGbIds[0])fail("Submission Grade Band conflicts with Enrollment Grade Band",debugStep,{submissionAssetId:asset.id,submissionId:submission.id,enrollmentId,slot});

  const programInstanceId=piIds[0], gradeBandId=enrollmentGbIds[0];

  debugStep="resolve_unique_active_pha";
  const pq=await phaTable.selectRecordsAsync({fields:safe(phaTable,Object.values(CONFIG.pha))});
  const matches=pq.records.filter(r=>{
    if(links(r,CONFIG.pha.homeworkAssignment).length!==1||links(r,CONFIG.pha.homeworkAssignment)[0]!==homeworkId)return false;
    if(links(r,CONFIG.pha.programInstance).length!==1||links(r,CONFIG.pha.programInstance)[0]!==programInstanceId)return false;
    if(links(r,CONFIG.pha.week).length!==1||links(r,CONFIG.pha.week)[0]!==weekId)return false;
    if(links(r,CONFIG.pha.gradeBand).length!==1||links(r,CONFIG.pha.gradeBand)[0]!==gradeBandId)return false;
    if(choiceName(r,CONFIG.pha.slot)!==slot)return false;
    if(!isActive(cell(r,CONFIG.pha.active)))return false;
    return true;
  });
  if(matches.length===0)fail("No active Program Homework Assignment matches Homework + Program Instance + Week + Grade Band + slot",debugStep,{submissionAssetId:asset.id,submissionId:submission.id,enrollmentId,slot});
  if(matches.length>1)fail(`Multiple active Program Homework Assignments match (${matches.map(r=>r.id).join(", ")})`,debugStep,{submissionAssetId:asset.id,submissionId:submission.id,enrollmentId,slot});
  const phaId=matches[0].id;

  debugStep="find_canonical_homework_completion";
  let hq=await homeworkTable.selectRecordsAsync({fields:safe(homeworkTable,Object.values(CONFIG.homework))});
  let candidates=findHcCandidates(hq.records,{submissionId:submission.id,enrollmentId,weekId,homeworkId,slot});

  let hc=pickPreferred(candidates);
  let actionOut="";
  let homeworkCompletionId="";

  if(hc){
    debugStep="validate_and_repair_existing_hc";
    try{
      await repairHomeworkCompletion(hc,{homeworkId,phaId,enrollmentId,weekId,gradeBandId,submission,asset,slot});
    }catch(error){
      fail(error instanceof Error?error.message:String(error),debugStep,{submissionAssetId:asset.id,homeworkCompletionId:hc.id,slot});
    }
    homeworkCompletionId=hc.id;
    actionOut=candidates.length>1?"linked_existing_duplicate_resolved":"linked_existing";
  } else {
    hq=await homeworkTable.selectRecordsAsync({fields:safe(homeworkTable,Object.values(CONFIG.homework))});
    candidates=findHcCandidates(hq.records,{submissionId:submission.id,enrollmentId,weekId,homeworkId,slot});
    hc=pickPreferred(candidates);
    if(hc){
      try{
        await repairHomeworkCompletion(hc,{homeworkId,phaId,enrollmentId,weekId,gradeBandId,submission,asset,slot});
      }catch(error){
        fail(error instanceof Error?error.message:String(error),debugStep,{submissionAssetId:asset.id,homeworkCompletionId:hc.id,slot});
      }
      homeworkCompletionId=hc.id;
      actionOut="linked_existing";
    } else {
      debugStep="create_homework_completion";
      const fields={};
      setLink(fields,homeworkTable,CONFIG.homework.homework,[homeworkId]);
      setLink(fields,homeworkTable,CONFIG.homework.programHomeworkAssignment,[phaId]);
      setLink(fields,homeworkTable,CONFIG.homework.submission,[submission.id]);
      setLink(fields,homeworkTable,CONFIG.homework.submissionAssets,[asset.id]);
      setLink(fields,homeworkTable,CONFIG.homework.enrollment,[enrollmentId]);
      setLink(fields,homeworkTable,CONFIG.homework.week,[weekId]);
      setLink(fields,homeworkTable,CONFIG.homework.gradeBand,[gradeBandId]);
      const was=links(submission,CONFIG.submissions.weeklySummary); if(was.length)setLink(fields,homeworkTable,CONFIG.homework.weeklySummaryLink,was);
      setDate(fields,homeworkTable,CONFIG.homework.submissionDate,cell(submission,CONFIG.submissions.activityDate));
      setText(fields,homeworkTable,CONFIG.homework.assetLabel,text(asset,CONFIG.assets.assetLabel));
      setText(fields,homeworkTable,CONFIG.homework.originalFileName,text(asset,CONFIG.assets.originalFileName));
      setChoice(fields,homeworkTable,CONFIG.homework.assetType,choiceName(asset,CONFIG.assets.assetType));
      setChoice(fields,homeworkTable,CONFIG.homework.assetPurpose,choiceName(asset,CONFIG.assets.assetPurpose));
      setChoice(fields,homeworkTable,CONFIG.homework.assetSlot,slot);
      setChoice(fields,homeworkTable,CONFIG.homework.itemSlot,slot);
      setChoice(fields,homeworkTable,CONFIG.homework.itemType,"Homework");
      setChoice(fields,homeworkTable,CONFIG.homework.sourceSystem,"Shooting Challenge");
      const completionChoice=["Submitted","Pending Review","Pending"].find(c=>choiceExists(homeworkTable,CONFIG.homework.completionStatus,c));
      if(completionChoice)setChoice(fields,homeworkTable,CONFIG.homework.completionStatus,completionChoice);
      homeworkCompletionId=await homeworkTable.createRecordAsync(fields);
      actionOut="created_new";
    }
  }

  debugStep="sync_asset_upload_and_link";
  const assetFields={};
  setLink(assetFields,assetsTable,CONFIG.assets.homeworkCompletions,[homeworkCompletionId]);
  setChoice(assetFields,assetsTable,CONFIG.assets.assetSlot,slot);
  setChoice(assetFields,assetsTable,CONFIG.assets.uploadStatus,CONFIG.values.makeSendStatus);
  setCheck(assetFields,assetsTable,CONFIG.assets.sendToMakeTrigger,true);
  if(writable(assetsTable,CONFIG.assets.uploadError))assetFields[CONFIG.assets.uploadError]="";
  await assetsTable.updateRecordAsync(asset.id,assetFields);

  const hFields={};
  const pairs=[
    [CONFIG.assets.googleDriveFileId,CONFIG.homework.googleDriveFileId],
    [CONFIG.assets.googleDriveFileUrl,CONFIG.homework.googleDriveFileUrl],
    [CONFIG.assets.googleDriveFolderId,CONFIG.homework.googleDriveFolderId],
    [CONFIG.assets.googleDriveFolderUrl,CONFIG.homework.googleDriveFolderUrl],
  ];
  for(const [from,to] of pairs){const v=text(asset,from);if(v)setText(hFields,homeworkTable,to,v);}
  const uploadedAt=cell(asset,CONFIG.assets.uploadedAt);if(uploadedAt)setDate(hFields,homeworkTable,CONFIG.homework.uploadedAt,uploadedAt);
  const assetUpload=text(asset,CONFIG.assets.uploadStatus);
  if(assetUpload&&assetUpload!==CONFIG.values.makeSendStatus)setChoice(hFields,homeworkTable,CONFIG.homework.uploadStatus,assetUpload);
  if(writable(homeworkTable,CONFIG.homework.uploadError))hFields[CONFIG.homework.uploadError]=text(asset,CONFIG.assets.uploadError);
  if(Object.keys(hFields).length)await homeworkTable.updateRecordAsync(homeworkCompletionId,hFields);

  const payload={
    statusOut:"success",actionOut,gradeBandActionOut:"copied_grade_band",errorOut:"",debugStep:"complete",
    submissionAssetId:asset.id,homeworkCompletionId,slot,programHomeworkAssignmentId:phaId,
    submissionId:submission.id,enrollmentId,weekId,homeworkId,programInstanceId,gradeBandId,
  };
  console.log(JSON.stringify({automation:CONFIG.scriptName,version:CONFIG.version,...payload},null,2));
  for(const [k,v] of Object.entries(payload))out(k,v);
}

await main();

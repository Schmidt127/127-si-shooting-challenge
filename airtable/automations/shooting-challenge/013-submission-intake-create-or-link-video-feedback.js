/*
 * 013 - Submission Intake - Create or Link Video Feedback
 * Version: v2.1
 * Rebuilt: 2026-08-09
 * Contract: GitHub issue #103
 *
 * Canonical Video Feedback writer. Automation 112 must remain OFF.
 */
// @ts-nocheck

const CONFIG = {
  scriptName: "013 - Submission Intake - Create or Link Video Feedback",
  version: "v2.1",
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
    sourceAttachmentId: "Source Attachment ID",
    assetType: "Asset Type",
    assetSlot: "Asset Slot",
    videoFeedback: "Video Feedback",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    sendToMakeTrigger: "Send to Make Trigger",
    readyToSendToMake: "Ready to Send to Make?",
    whyNotReadyForMake: "Why Not Ready for Make?",
  },
  submissions: {
    videoUpload: "Video Upload",
    enrollment: "Enrollment",
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
  enrollment: { gradeBand: "Grade Band" },
  values: {
    makeSendStatus: "Pending Link",
    videoKeyPrefix: "VIDEO_FEEDBACK",
  },
};

function out(name, value){ try { output.set(name,value); } catch {} }
function getField(t,n){ return t.fields.find(f=>f.name===n); }
function exists(t,n){ return Boolean(getField(t,n)); }
function writable(t,n){
  const f=getField(t,n); if(!f) return false;
  return !new Set(["formula","rollup","count","lookup","multipleLookupValues","createdTime","lastModifiedTime",
    "autoNumber","createdBy","lastModifiedBy","button","externalSyncSource"]).has(f.type);
}
function safe(t,names){ return [...new Set(names)].filter(n=>exists(t,n)); }
function cell(r,n){ try{return r.getCellValue(n);}catch{return null;} }
function text(r,n){ try{return String(r.getCellValueAsString(n)||"").trim();}catch{return "";} }
function links(r,n){ const v=cell(r,n); return Array.isArray(v)?v.map(x=>x?.id).filter(Boolean):[]; }
function atts(r,n){ const v=cell(r,n); return Array.isArray(v)?v:[]; }
function choiceExists(t,n,c){ const f=getField(t,n); return Boolean(f?.options?.choices?.some(x=>x.name===c)); }
function setLink(f,t,n,ids){ if(writable(t,n)) f[n]=[...new Set(ids.filter(Boolean))].map(id=>({id})); }
function setText(f,t,n,v,allowBlank=false){ if(writable(t,n)&&(allowBlank||!(v===undefined||v===null||v===""))) f[n]=String(v??""); }
function setChoice(f,t,n,v){ if(writable(t,n)&&choiceExists(t,n,v)) f[n]={name:v}; }
function setCheck(f,t,n,v){ if(writable(t,n)) f[n]=Boolean(v); }
function firstChoice(t,n,choices){ return choices.find(c=>choiceExists(t,n,c)) || ""; }
function same(a,b){ a=[...new Set(a)].sort(); b=[...new Set(b)].sort(); return a.length===b.length&&a.every((x,i)=>x===b[i]); }
function key(assetId){ return `${CONFIG.values.videoKeyPrefix}|${assetId}`; }
function fail(message, debugStep, extra={}){
  const payload={automation:CONFIG.scriptName,version:CONFIG.version,statusOut:"error",actionOut:"error",errorOut:message,debugStep,...extra};
  console.log(JSON.stringify(payload,null,2));
  for(const [k,v] of Object.entries(payload)) out(k,v);
  throw new Error(message);
}

async function main(){
  let debugStep="start";
  const recordId=String(input.config().recordId||"").trim();
  if(!recordId) fail("Missing required input variable: recordId",debugStep);
  if(!recordId.startsWith("rec")) fail(`Invalid recordId: ${recordId}`,debugStep);

  const assetsTable=base.getTable(CONFIG.tables.assets);
  const videoTable=base.getTable(CONFIG.tables.videoFeedback);
  const submissionsTable=base.getTable(CONFIG.tables.submissions);
  const enrollmentsTable=base.getTable(CONFIG.tables.enrollments);

  debugStep="load_asset";
  const aq=await assetsTable.selectRecordsAsync({fields:safe(assetsTable,Object.values(CONFIG.assets))});
  const asset=aq.getRecord(recordId);
  if(!asset) fail(`Submission Asset not found: ${recordId}`,debugStep);

  const slot=text(asset,CONFIG.assets.assetSlot);
  const submissionIds=links(asset,CONFIG.assets.submission);
  const enrollmentIds=links(asset,CONFIG.assets.enrollment);
  const sourceAttachmentId=text(asset,CONFIG.assets.sourceAttachmentId);
  const fileCount=atts(asset,CONFIG.assets.attachment).length;

  debugStep="validate_asset_contract";
  if(slot!=="VIDEO") fail(`Asset Slot must be VIDEO exactly; found '${slot}'`,debugStep,{submissionAssetId:asset.id});
  if(submissionIds.length!==1) fail(`Video asset must link exactly one Submission; found ${submissionIds.length}`,debugStep,{submissionAssetId:asset.id});
  if(enrollmentIds.length!==1) fail(`Video asset must link exactly one Enrollment; found ${enrollmentIds.length}`,debugStep,{submissionAssetId:asset.id});
  if(fileCount===0) fail("Video asset has no Airtable Attachment",debugStep,{submissionAssetId:asset.id});
  if(!sourceAttachmentId) fail("Video asset is missing Source Attachment ID",debugStep,{submissionAssetId:asset.id});

  debugStep="prove_submission_provenance";
  const sq=await submissionsTable.selectRecordsAsync({fields:safe(submissionsTable,Object.values(CONFIG.submissions))});
  const submission=sq.getRecord(submissionIds[0]);
  if(!submission) fail(`Linked Submission not found: ${submissionIds[0]}`,debugStep,{submissionAssetId:asset.id});

  const submissionEnrollmentIds=links(submission,CONFIG.submissions.enrollment);
  if(submissionEnrollmentIds.length!==1) fail(`Submission must have exactly one Enrollment; found ${submissionEnrollmentIds.length}`,debugStep,{submissionAssetId:asset.id,submissionId:submission.id});
  if(submissionEnrollmentIds[0]!==enrollmentIds[0]) fail("Submission Enrollment does not match asset Enrollment",debugStep,{submissionAssetId:asset.id,submissionId:submission.id,enrollmentId:enrollmentIds[0]});

  const videoSourceIds=atts(submission,CONFIG.submissions.videoUpload).map(a=>String(a?.id||"")).filter(Boolean);
  if(!videoSourceIds.includes(sourceAttachmentId)){
    fail("Asset Source Attachment ID is not present in Submission.Video Upload; run/repair 009 provenance first",
      debugStep,{submissionAssetId:asset.id,submissionId:submission.id,enrollmentId:enrollmentIds[0]});
  }

  debugStep="resolve_grade_band";
  let gradeBandIds=[];
  const eq=await enrollmentsTable.selectRecordsAsync({fields:safe(enrollmentsTable,[CONFIG.enrollment.gradeBand])});
  const enrollment=eq.getRecord(enrollmentIds[0]);
  if(enrollment) gradeBandIds=links(enrollment,CONFIG.enrollment.gradeBand);

  debugStep="find_canonical_video_feedback";
  const vq=await videoTable.selectRecordsAsync({fields:safe(videoTable,Object.values(CONFIG.video))});
  const expectedKey=key(asset.id);
  const assetLinkedVFIds=links(asset,CONFIG.assets.videoFeedback);
  if(assetLinkedVFIds.length>1) fail(`Asset links multiple Video Feedback records (${assetLinkedVFIds.length})`,debugStep,{submissionAssetId:asset.id});

  const candidates=vq.records.filter(v=>{
    return links(v,CONFIG.video.submissionAsset).includes(asset.id) || text(v,CONFIG.video.key)===expectedKey || assetLinkedVFIds.includes(v.id);
  });
  const unique=[...new Map(candidates.map(v=>[v.id,v])).values()];
  if(unique.length>1) fail(`Multiple canonical Video Feedback candidates found: ${unique.map(v=>v.id).join(", ")}`,debugStep,{submissionAssetId:asset.id});

  let vf=unique[0]||null;
  let videoFeedbackId="";
  let actionOut="";

  if(vf){
    debugStep="validate_existing_ownership";
    const ownedAsset=links(vf,CONFIG.video.submissionAsset);
    const ownedSubmission=links(vf,CONFIG.video.submission);
    const ownedEnrollment=links(vf,CONFIG.video.enrollment);
    const existingKey=text(vf,CONFIG.video.key);

    if(ownedAsset.length && !same(ownedAsset,[asset.id])) fail(`Existing Video Feedback ${vf.id} belongs to another Submission Asset`,debugStep,{submissionAssetId:asset.id,videoFeedbackId:vf.id});
    if(ownedSubmission.length && !same(ownedSubmission,[submission.id])) fail(`Existing Video Feedback ${vf.id} belongs to another Submission`,debugStep,{submissionAssetId:asset.id,videoFeedbackId:vf.id});
    if(ownedEnrollment.length && !same(ownedEnrollment,enrollmentIds)) fail(`Existing Video Feedback ${vf.id} belongs to another Enrollment`,debugStep,{submissionAssetId:asset.id,videoFeedbackId:vf.id});
    if(existingKey && existingKey!==expectedKey) fail(`Existing Video Feedback ${vf.id} has conflicting key '${existingKey}'`,debugStep,{submissionAssetId:asset.id,videoFeedbackId:vf.id});

    const fields={};
    setLink(fields,videoTable,CONFIG.video.submissionAsset,[asset.id]);
    setLink(fields,videoTable,CONFIG.video.submission,[submission.id]);
    setLink(fields,videoTable,CONFIG.video.enrollment,enrollmentIds);
    if(gradeBandIds.length) setLink(fields,videoTable,CONFIG.video.gradeBand,gradeBandIds);
    setText(fields,videoTable,CONFIG.video.key,expectedKey);
    setCheck(fields,videoTable,CONFIG.video.active,true);
    if(!text(vf,CONFIG.video.workflowStatus)){
      const c=firstChoice(videoTable,CONFIG.video.workflowStatus,["Pending Upload","Pending","Ready","Processing"]);
      if(c) setChoice(fields,videoTable,CONFIG.video.workflowStatus,c);
    }
    if(!text(vf,CONFIG.video.uploadStatus)){
      const c=firstChoice(videoTable,CONFIG.video.uploadStatus,["Pending Upload","Pending","Ready"]);
      if(c) setChoice(fields,videoTable,CONFIG.video.uploadStatus,c);
    }
    if(writable(videoTable,CONFIG.video.uploadError)) fields[CONFIG.video.uploadError]="";
    if(Object.keys(fields).length) await videoTable.updateRecordAsync(vf.id,fields);
    videoFeedbackId=vf.id;
    actionOut="linked_existing_or_repaired";
  } else {
    debugStep="create_video_feedback";
    const fields={};
    setText(fields,videoTable,CONFIG.video.key,expectedKey);
    setLink(fields,videoTable,CONFIG.video.submissionAsset,[asset.id]);
    setLink(fields,videoTable,CONFIG.video.submission,[submission.id]);
    setLink(fields,videoTable,CONFIG.video.enrollment,enrollmentIds);
    if(gradeBandIds.length) setLink(fields,videoTable,CONFIG.video.gradeBand,gradeBandIds);
    setCheck(fields,videoTable,CONFIG.video.active,true);
    const workflowChoice=firstChoice(videoTable,CONFIG.video.workflowStatus,["Pending Upload","Pending","Ready","Processing"]);
    const uploadChoice=firstChoice(videoTable,CONFIG.video.uploadStatus,["Pending Upload","Pending","Ready"]);
    if(workflowChoice) setChoice(fields,videoTable,CONFIG.video.workflowStatus,workflowChoice);
    if(uploadChoice) setChoice(fields,videoTable,CONFIG.video.uploadStatus,uploadChoice);
    videoFeedbackId=await videoTable.createRecordAsync(fields);
    actionOut="created_new_video_feedback";
  }

  debugStep="link_asset_and_gate_make";
  const assetFields={};
  setLink(assetFields,assetsTable,CONFIG.assets.videoFeedback,[videoFeedbackId]);
  setChoice(assetFields,assetsTable,CONFIG.assets.uploadStatus,CONFIG.values.makeSendStatus);
  setCheck(assetFields,assetsTable,CONFIG.assets.sendToMakeTrigger,true);
  if(writable(assetsTable,CONFIG.assets.uploadError)) assetFields[CONFIG.assets.uploadError]="";
  await assetsTable.updateRecordAsync(asset.id,assetFields);

  const ready=text(asset,CONFIG.assets.readyToSendToMake);
  const why=text(asset,CONFIG.assets.whyNotReadyForMake);
  const payload={
    statusOut:"success",actionOut,errorOut:"",debugStep:"complete",
    submissionAssetId:asset.id,videoFeedbackId,submissionId:submission.id,enrollmentId:enrollmentIds[0],
    gradeBandId:gradeBandIds[0]||"",readyToSendToMake:ready,whyNotReadyForMake:why,
  };
  console.log(JSON.stringify({automation:CONFIG.scriptName,version:CONFIG.version,...payload},null,2));
  for(const [k,v] of Object.entries(payload)) out(k,v);
}

await main();

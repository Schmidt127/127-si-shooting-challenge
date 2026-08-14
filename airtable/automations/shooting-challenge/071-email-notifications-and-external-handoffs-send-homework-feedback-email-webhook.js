/*
Automation: 071 - Email, Notifications, and External Handoffs - Send Homework Feedback Email Webhook
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Version: v3.6
Date: 2026-08-08

Issue #105 hardening:
- Validate canonical Program Homework Assignment schedule when present.
- Require active PHA and Program Instance + Week + Grade Band + Homework + slot compatibility.
- Validate every linked Submission Asset against HC Enrollment, source Submission, Week, and HW slot.
- Fail closed on inactive/mismatched schedule chains and semantic Make failures.
- Preserve attachment-less Final Reflection quiz path, Test/Live recipient isolation, and Make final Sent writeback ownership.
*/

// @ts-nocheck

const VERSION = "v3.6";
const T = {hc:"Homework Completions",enr:"Enrollments",pha:"Program Homework Assignments",asset:"Submission Assets",sub:"Submissions",quiz:"Final Reflection Quiz Submissions"};
const F = {
  hc:{enr:"Enrollment",week:"Week",grade:"Grade Band",homework:"Homework",slot:"Item Slot",pha:"Program Homework Assignment",assets:"Submission Assets",subs:"Submissions - Linked",quiz:"Final Reflection Quiz Submissions",source:"Source System",satisfactory:"Satisfactory?",award:"Award Status",xp:"XP Events",coach:"Coach Feedback",ready:"Parent Feedback Ready?",sent:"Parent Feedback Sent?",error:"Parent Feedback Send Error",subject:"Parent Feedback Subject",totalXp:"Total Homework XP Awarded",baseXp:"Base XP Awarded"},
  enr:{active:"Active?",program:"Program Instance",grade:"Grade Band",parentClean:"Parent Email - Cleaned",parent:"Parent Email",parentFirst:"Parent First Name",athlete:"Full Athlete Name"},
  pha:{homework:"Homework Assignment",program:"Program Instance",week:"Week",grade:"Grade Band",slot:"Homework Slot",active:"Active?"},
  asset:{sub:"Submission - Linked",enr:"Enrollment - Linked",slot:"Asset Slot",purpose:"Asset Purpose",original:"Original File Name",label:"Asset Label",reviewer:"Reviewer File URL",driveView:"Google Drive View URL",driveFile:"Google Drive File URL"},
  sub:{enr:"Enrollment",week:"Week"},
  quiz:{summary:"Quiz Result Summary",score:"Score"},
};
const DEFAULT_REPLY_TO = "coach@127sportsintensity.com";
function hasField(t,n){try{t.getField(n);return true}catch{return false}}
function raw(r,t,n){return r&&hasField(t,n)?r.getCellValue(n):null}
function text(r,t,n){return r&&hasField(t,n)?String(r.getCellValueAsString(n)||"").trim():""}
function ids(r,t,n){const v=raw(r,t,n);return Array.isArray(v)?v.map(x=>x?.id).filter(Boolean):[]}
function checked(r,t,n){return raw(r,t,n)===true}
function num(r,t,n){const v=raw(r,t,n);const x=typeof v==="number"?v:Number(text(r,t,n).replace(/,/g,""));return Number.isFinite(x)?x:0}
function first(...v){return v.map(x=>String(x??"").trim()).find(Boolean)||""}
function cleanEmails(v){return [...new Set(String(v||"").split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean))].join(",")}
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;")}
function sameSet(a,b){return a.length===b.length&&a.every(x=>b.includes(x))}
function one(idsIn,label){if(idsIn.length!==1)throw new Error(`${label} must contain exactly one linked record; found ${idsIn.length}.`);return idsIn[0]}
function normalizeSlot(v){const s=String(v||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");if(["HW1","HOMEWORK1"].includes(s))return"HW1";if(["HW2","HOMEWORK2"].includes(s))return"HW2";return""}
function semanticFailure(body){const s=String(body||"").trim();if(!s)return"";try{const j=JSON.parse(s);for(const k of["ok","success","sent"])if(Object.prototype.hasOwnProperty.call(j,k)&&j[k]===false)return`${k}=false`}catch{}return""}
async function postJson(url,payload){const req={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)};return await remoteFetchAsync(url,req)}
function mode(v){const s=String(v||"").trim().toLowerCase();if(["live","l","real","send","parent"].includes(s))return"live";if(["test","t","preview","practice","draft"].includes(s))return"test";return""}
function assetUrl(a,t){return first(text(a,t,F.asset.reviewer),text(a,t,F.asset.driveView),text(a,t,F.asset.driveFile))}
function emailHtml({parentFirst,athlete,homeworkLabel,coach,totalXp,files,quizSummary,sendMode}){const links=files.map(f=>`<li><a href="${esc(f.url)}">${esc(f.label)}</a></li>`).join("");return`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#262626">${sendMode==="test"?"<p><strong>TEST MODE — not sent to the real parent.</strong></p>":""}<h2 style="color:#0034B7">Homework Feedback</h2><p>Hello ${esc(parentFirst||"Parent")},</p><p>I finished reviewing ${esc(athlete||"your athlete")}'s homework: <strong>${esc(homeworkLabel||"Homework")}</strong>.</p><p><strong>XP Awarded:</strong> ${esc(totalXp)}</p>${quizSummary?`<p><strong>Quiz:</strong> ${esc(quizSummary)}</p>`:""}<h3 style="color:#0034B7">Coach Feedback</h3><p>${esc(coach).replace(/\n/g,"<br>")}</p>${links?`<h3 style="color:#0034B7">Submitted Files</h3><ul>${links}</ul>`:""}<p>Thank you,<br>Coach Mike</p></body></html>`}

async function main(){
  const cfg=input.config();const recordId=String(cfg.recordId||"").trim(),webhook=String(cfg.makeWebhookUrl||"").trim(),sendMode=mode(cfg.sendMode),testRecipient=String(cfg.testRecipientEmail||"").trim(),replyTo=String(cfg.replyTo||DEFAULT_REPLY_TO).trim();
  if(!recordId)throw new Error("Missing required input: recordId");if(!webhook)throw new Error("Missing required input: makeWebhookUrl");if(!sendMode)throw new Error("Invalid sendMode. Expected Test or Live.");if(sendMode==="test"&&!testRecipient)throw new Error("Missing testRecipientEmail for Test mode.");
  const hcT=base.getTable(T.hc),enrT=base.getTable(T.enr),phaT=base.getTable(T.pha),assetT=base.getTable(T.asset),subT=base.getTable(T.sub),quizT=base.getTable(T.quiz);
  const hc=await hcT.selectRecordAsync(recordId);if(!hc)throw new Error(`Homework Completion not found: ${recordId}`);
  if(!checked(hc,hcT,F.hc.ready))throw new Error("Parent Feedback Ready? is not checked. Email blocked.");if(checked(hc,hcT,F.hc.sent))throw new Error("Parent Feedback Sent? is already checked. Duplicate send blocked.");if(!checked(hc,hcT,F.hc.satisfactory))throw new Error("Satisfactory? is not checked. Email blocked.");if(text(hc,hcT,F.hc.award)!=="Awarded")throw new Error("Award Status is not Awarded. Email blocked.");const coach=text(hc,hcT,F.hc.coach);if(!coach)throw new Error("Coach Feedback is blank. Email blocked.");if(ids(hc,hcT,F.hc.xp).length===0||num(hc,hcT,F.hc.totalXp)<=0||num(hc,hcT,F.hc.baseXp)<=0)throw new Error("Homework XP evidence is incomplete. Email blocked.");
  const enrollmentId=one(ids(hc,hcT,F.hc.enr),"Homework Completion Enrollment"),weekId=one(ids(hc,hcT,F.hc.week),"Homework Completion Week"),homeworkId=one(ids(hc,hcT,F.hc.homework),"Homework Completion Homework");
  const enr=await enrT.selectRecordAsync(enrollmentId);if(!enr||!checked(enr,enrT,F.enr.active))throw new Error("Enrollment is missing or inactive. Email blocked.");const programId=one(ids(enr,enrT,F.enr.program),"Enrollment Program Instance");
  const hcGradeIds=ids(hc,hcT,F.hc.grade),enrGradeIds=ids(enr,enrT,F.enr.grade),gradeIds=hcGradeIds.length?hcGradeIds:enrGradeIds;if(gradeIds.length!==1)throw new Error("Exactly one Grade Band is required for homework schedule validation.");const gradeId=gradeIds[0];
  const hcSlot=normalizeSlot(text(hc,hcT,F.hc.slot));if(!hcSlot)throw new Error("Homework Completion Item Slot must resolve to HW1 or HW2.");

  const phaIds=ids(hc,hcT,F.hc.pha);let canonicalPha=null;
  if(phaIds.length>1)throw new Error("Homework Completion links multiple Program Homework Assignments. Email blocked.");
  if(phaIds.length===1){canonicalPha=await phaT.selectRecordAsync(phaIds[0]);if(!canonicalPha||!checked(canonicalPha,phaT,F.pha.active))throw new Error("Linked Program Homework Assignment is missing/inactive. Email blocked.");}
  else {
    const q=await phaT.selectRecordsAsync({fields:[F.pha.homework,F.pha.program,F.pha.week,F.pha.grade,F.pha.slot,F.pha.active]});
    const candidates=q.records.filter(r=>checked(r,phaT,F.pha.active)&&sameSet(ids(r,phaT,F.pha.program),[programId])&&sameSet(ids(r,phaT,F.pha.week),[weekId])&&sameSet(ids(r,phaT,F.pha.grade),[gradeId])&&normalizeSlot(text(r,phaT,F.pha.slot))===hcSlot);
    if(candidates.length>0)throw new Error("A current PHA schedule exists but Homework Completion is not linked to it. Email blocked.");
  }
  if(canonicalPha){if(!sameSet(ids(canonicalPha,phaT,F.pha.program),[programId]))throw new Error("PHA Program Instance mismatch.");if(!sameSet(ids(canonicalPha,phaT,F.pha.week),[weekId]))throw new Error("PHA Week mismatch.");if(!sameSet(ids(canonicalPha,phaT,F.pha.grade),[gradeId]))throw new Error("PHA Grade Band mismatch.");if(!sameSet(ids(canonicalPha,phaT,F.pha.homework),[homeworkId]))throw new Error("PHA Homework mismatch.");if(normalizeSlot(text(canonicalPha,phaT,F.pha.slot))!==hcSlot)throw new Error("PHA Homework Slot mismatch.");}

  const hcSubIds=ids(hc,hcT,F.hc.subs);for(const sid of hcSubIds){const s=await subT.selectRecordAsync(sid);if(!s)throw new Error(`Linked Submission not found: ${sid}`);if(!sameSet(ids(s,subT,F.sub.enr),[enrollmentId]))throw new Error(`Submission ${sid} Enrollment mismatch.`);if(!sameSet(ids(s,subT,F.sub.week),[weekId]))throw new Error(`Submission ${sid} Week mismatch.`);}
  const assetIds=ids(hc,hcT,F.hc.assets),files=[];for(const aid of assetIds){const a=await assetT.selectRecordAsync(aid);if(!a)throw new Error(`Submission Asset not found: ${aid}`);if(!sameSet(ids(a,assetT,F.asset.enr),[enrollmentId]))throw new Error(`Asset ${aid} Enrollment mismatch.`);const slot=normalizeSlot(text(a,assetT,F.asset.slot));if(slot!==hcSlot)throw new Error(`Asset ${aid} slot ${slot||"blank"} does not match ${hcSlot}.`);const sourceSubs=ids(a,assetT,F.asset.sub);if(sourceSubs.length!==1)throw new Error(`Asset ${aid} must link exactly one Submission.`);const s=await subT.selectRecordAsync(sourceSubs[0]);if(!s||!sameSet(ids(s,subT,F.sub.enr),[enrollmentId])||!sameSet(ids(s,subT,F.sub.week),[weekId]))throw new Error(`Asset ${aid} source Submission ownership/Week mismatch.`);const url=assetUrl(a,assetT);if(!url)throw new Error(`Asset ${aid} has no safe parent-facing URL.`);files.push({id:aid,url,label:first(text(a,assetT,F.asset.original),text(a,assetT,F.asset.label),"View submitted homework")});}
  const quizIds=ids(hc,hcT,F.hc.quiz);if(assetIds.length===0&&quizIds.length===0)throw new Error("Homework Completion has neither validated Submission Assets nor Final Reflection Quiz source. Email blocked.");
  let quizSummary="";if(quizIds.length){if(quizIds.length!==1)throw new Error("Multiple Final Reflection Quiz sources linked. Email blocked.");const q=await quizT.selectRecordAsync(quizIds[0]);if(!q)throw new Error("Final Reflection Quiz source not found.");quizSummary=first(text(q,quizT,F.quiz.summary),text(q,quizT,F.quiz.score));}

  const parentCsv=cleanEmails(first(text(enr,enrT,F.enr.parentClean),text(enr,enrT,F.enr.parent)));if(!parentCsv)throw new Error("No parent recipient email found.");const toEmail=sendMode==="test"?testRecipient:parentCsv;const athlete=text(enr,enrT,F.enr.athlete),homeworkLabel=text(hc,hcT,F.hc.homework),subjectBase=`Homework Feedback for ${athlete||"Athlete"}`,subjectOut=sendMode==="test"?`[TEST] ${subjectBase}`:subjectBase,htmlOut=emailHtml({parentFirst:text(enr,enrT,F.enr.parentFirst),athlete,homeworkLabel,coach,totalXp:num(hc,hcT,F.hc.totalXp),files,quizSummary,sendMode});
  const payload={recordId,sourceTable:T.hc,sendType:"homework_feedback",sendMode,sendTag:"HOMEWORK_FEEDBACK_PARENT",toEmail,liveRecipientEmail:parentCsv,testRecipientEmail:testRecipient,athleteName:athlete,subjectOut,htmlOut,replyTo,assetFiles:files,canonicalProgramHomeworkAssignmentId:canonicalPha?.id||"",canonicalProgramInstanceId:programId,canonicalWeekId:weekId,canonicalGradeBandId:gradeId,homeworkSlot:hcSlot,quizSummary,totalHomeworkXpAwarded:num(hc,hcT,F.hc.totalXp)};
  try{const r=await postJson(webhook,payload),body=await r.text();if(!r.ok)throw new Error(`Webhook failed with status ${r.status}: ${body}`);const sem=semanticFailure(body);if(sem)throw new Error(`Webhook semantic failure: ${sem}: ${body}`);const u={};if(hasField(hcT,F.hc.error))u[F.hc.error]="";if(hasField(hcT,F.hc.subject))u[F.hc.subject]=subjectOut;if(Object.keys(u).length)await hcT.updateRecordAsync(recordId,u);for(const[k,v]of Object.entries({ok:true,version:VERSION,recordId,sendMode,toEmail,subjectOut,canonicalProgramHomeworkAssignmentId:canonicalPha?.id||"",canonicalProgramInstanceId:programId,canonicalWeekId:weekId,homeworkSlot:hcSlot,assetCount:files.length,makeResponse:body,errorOut:""}))output.set(k,v)}catch(err){if(hasField(hcT,F.hc.error))await hcT.updateRecordAsync(recordId,{[F.hc.error]:String(err.message||err)});output.set("ok",false);output.set("version",VERSION);output.set("recordId",recordId);output.set("errorOut",String(err.message||err));throw err}
}
await main();
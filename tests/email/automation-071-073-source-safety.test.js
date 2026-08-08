#!/usr/bin/env node
"use strict";
const assert=require("assert");const fs=require("fs");const path=require("path");const {spawnSync}=require("child_process");
const root=path.join(__dirname,"../..");
const p071=path.join(root,"airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js");
const p073=path.join(root,"airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js");
const s071=fs.readFileSync(p071,"utf8"),s073=fs.readFileSync(p073,"utf8");let pass=0;
function t(name,fn){fn();pass++;console.log(`ok - ${name}`)}
function checkSyntax(p){const r=spawnSync(process.execPath,["--check",p],{encoding:"utf8"});assert.strictEqual(r.status,0,r.stderr)}
t("071 syntax",()=>checkSyntax(p071));t("073 syntax",()=>checkSyntax(p073));
t("071 v3.6 requires active canonical PHA when linked",()=>{assert.match(s071,/Version: v3\.6/);assert.match(s071,/Program Homework Assignment/);assert.match(s071,/Linked Program Homework Assignment is missing\/inactive/);assert.match(s071,/PHA Program Instance mismatch/);assert.match(s071,/PHA Week mismatch/);assert.match(s071,/PHA Grade Band mismatch/);assert.match(s071,/PHA Homework mismatch/);assert.match(s071,/PHA Homework Slot mismatch/)});
t("071 validates asset ownership and HW slot",()=>{assert.match(s071,/Asset .* Enrollment mismatch/);assert.match(s071,/does not match \$\{hcSlot\}/);assert.match(s071,/source Submission ownership\/Week mismatch/)});
t("071 preserves attachment-less quiz source",()=>{assert.match(s071,/Final Reflection Quiz/);assert.match(s071,/neither validated Submission Assets nor Final Reflection Quiz source/)});
t("071 semantic Make failure is rejected",()=>{assert.match(s071,/semanticFailure/);assert.match(s071,/Webhook semantic failure/);for(const k of ["ok","success","sent"])assert.match(s071,new RegExp(`\\"${k}\\"`))});
t("071 strict Test Live recipient isolation",()=>{assert.match(s071,/sendMode===\"test\"\?testRecipient:parentCsv/);assert.match(s071,/liveRecipientEmail:parentCsv/)});
t("071 does not write final sent fields",()=>{assert.doesNotMatch(s071,/updateRecordAsync\([^\n]+Parent Feedback Sent\?/);assert.doesNotMatch(s071,/Parent Feedback Sent On/)});
t("073 v3.3 requires active canonical source",()=>{assert.match(s073,/Version: v3\.3/);assert.match(s073,/Video Feedback is inactive\/retired/);assert.match(s073,/must contain exactly one linked record/);assert.match(s073,/VIDEO_FEEDBACK\|\$\{assetId\}/)});
t("073 validates asset and submission ownership",()=>{assert.match(s073,/Submission Asset does not belong exclusively/);assert.match(s073,/Submission Asset Enrollment does not match/);assert.match(s073,/does not link back to this canonical Video Feedback/);assert.match(s073,/Submission Enrollment does not match/)});
t("073 requires countable non-future video submission",()=>{assert.match(s073,/Linked Submission is not countable\/current/);assert.match(s073,/has no Video Upload/);assert.match(s073,/Activity Date is in the future/)});
t("073 requires active source-linked XP ownership",()=>{assert.match(s073,/checked\(xp,xpT,F\.xp\.active\)/);assert.match(s073,/F\.xp\.enrollment/);assert.match(s073,/F\.xp\.week/);assert.match(s073,/F\.xp\.videoFeedback/);assert.match(s073,/No active Video Feedback XP Event matches Enrollment \+ Week \+ source/)});
t("073 semantic Make failure is rejected",()=>{assert.match(s073,/semanticFailure/);assert.match(s073,/Webhook semantic failure/)});
t("073 strict Test Live recipient isolation",()=>{assert.match(s073,/sendMode === \"test\" \? testRecipientEmail : parentEmailsCsv/);assert.match(s073,/liveRecipientEmail:parentEmailsCsv/)});
t("073 does not write final sent fields",()=>{assert.doesNotMatch(s073,/Parent Feedback Sent On/);assert.doesNotMatch(s073,/updates\[F\.vf\.sent\]/)});
console.log(`PASS ${pass} source-safety contracts`);

#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const root = path.join(__dirname, "../..");
const p071 = path.join(root, "airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js");
const p073 = path.join(root, "airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js");
const p074 = path.join(root, "airtable/automations/shooting-challenge/074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js");
const p079 = path.join(root, "airtable/automations/shooting-challenge/079-email-notifications-and-external-handoffs-send-queue-handoff-to-communications-hub.js");
const p117 = path.join(root, "airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js");
const s071 = fs.readFileSync(p071, "utf8");
const s073 = fs.readFileSync(p073, "utf8");
const s074 = fs.readFileSync(p074, "utf8");
const s079 = fs.readFileSync(p079, "utf8");
const s117 = fs.readFileSync(p117, "utf8");
let pass = 0;
function t(name, fn) { fn(); pass++; console.log(`ok - ${name}`); }
function checkSyntax(p) { const r = spawnSync(process.execPath, ["--check", p], { encoding: "utf8" }); assert.strictEqual(r.status, 0, r.stderr); }
t("071 syntax", () => checkSyntax(p071));
t("073 syntax", () => checkSyntax(p073));
t("074 syntax", () => checkSyntax(p074));
t("079 syntax", () => checkSyntax(p079));
t("117 syntax", () => checkSyntax(p117));
t("071 v4.0 creates Communications Hub queue handoff (not Make webhook)", () => {
  assert.match(s071, /Version: v4\.0/);
  assert.match(s071, /Email Handoff Queue/);
  assert.match(s071, /HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|/);
  assert.match(s071, /created_handoff/);
  assert.match(s071, /existing_handoff/);
  assert.doesNotMatch(s071, /makeWebhookUrl|hook\.us1\.make\.com|remoteFetchAsync|sendTag:"HOMEWORK_FEEDBACK_PARENT"|semanticFailure/);
});
t("071 v4.0 requires active canonical PHA when linked", () => {
  assert.match(s071, /Program Homework Assignment/);
  assert.match(s071, /Linked Program Homework Assignment is missing\/inactive/);
  assert.match(s071, /PHA Program Instance mismatch/);
  assert.match(s071, /PHA Week mismatch/);
  assert.match(s071, /PHA Grade Band mismatch/);
  assert.match(s071, /PHA Homework mismatch/);
  assert.match(s071, /PHA Homework Slot mismatch/);
});
t("071 validates asset ownership and HW slot", () => {
  assert.match(s071, /Asset .* Enrollment mismatch/);
  assert.match(s071, /does not match \$\{hcSlot\}/);
  assert.match(s071, /source Submission ownership\/Week mismatch/);
});
t("071 preserves attachment-less quiz source", () => {
  assert.match(s071, /Final Reflection Quiz/);
  assert.match(s071, /neither validated Submission Assets nor Final Reflection Quiz source/);
});
t("071 homework asset URL may use Reviewer then Google Drive", () => {
  assert.match(s071, /Reviewer File URL/);
  assert.match(s071, /Google Drive View URL/);
  assert.match(s071, /Google Drive File URL/);
});
t("071 does not write final sent fields", () => {
  assert.match(s071, /Do not write Parent Feedback Sent\?/);
  assert.doesNotMatch(s071, /updateRecordAsync\([^\n]*(Parent Feedback Sent On|Parent Feedback Sent\?)/);
  assert.doesNotMatch(s071, /\[["']Parent Feedback Sent On["']\]\s*:/);
  assert.doesNotMatch(s071, /\[["']Parent Feedback Sent\?["']\]\s*:/);
});
t("073 v4.1 creates Communications Hub queue handoff (not Make webhook)", () => {
  assert.match(s073, /Version: v4\.1/);
  assert.match(s073, /Email Handoff Queue/);
  assert.match(s073, /VIDEO_FEEDBACK\|VIDEO_FEEDBACK\|/);
  assert.match(s073, /created_handoff/);
  assert.match(s073, /existing_handoff/);
  assert.doesNotMatch(s073, /makeWebhookUrl|hook\.us1\.make\.com|remoteFetchAsync|sendTag:"VIDEO_FEEDBACK_PARENT"/);
});
t("073 validates active canonical Video Feedback source", () => {
  assert.match(s073, /Video Feedback is inactive\/retired/);
  assert.match(s073, /must contain exactly one linked record/);
  assert.match(s073, /VIDEO_FEEDBACK\|\$\{assetId\}/);
  assert.match(s073, /No active Video Feedback XP Event matches Enrollment \+ Week \+ source/);
});
t("073 uses only VF Video URL or Drive Link — no Reviewer/Canonical/Drive fields", () => {
  assert.match(s073, /videoUrl: "Video URL or Drive Link"/);
  assert.match(s073, /Parent handoff blocked \(022 writeback required; no asset URL fallback\)/);
  assert.doesNotMatch(s073, /Google Drive File URL|Google Drive View URL|Google Drive File ID|Google Drive Folder/);
  assert.doesNotMatch(s073, /parentVideoUrl\(vf, vfTable, asset/);
  assert.doesNotMatch(s073, /reviewer:\s*"Reviewer File URL"/);
  assert.doesNotMatch(s073, /canonical:\s*"Canonical File URL"/);
  const assetBlock = s073.slice(s073.indexOf("asset: {"), s073.indexOf("xp: {"));
  assert.doesNotMatch(assetBlock, /"Reviewer File URL"|"Canonical File URL"/);
});
t("073 does not write final Sent fields", () => {
  assert.match(s073, /Do not write Parent Feedback Sent\? or Parent Feedback Sent On/);
  assert.doesNotMatch(s073, /updateRecordAsync\([^\n]*(Parent Feedback Sent On|Parent Feedback Sent\?)/);
  assert.doesNotMatch(s073, /\[["']Parent Feedback Sent On["']\]\s*:/);
  assert.doesNotMatch(s073, /\[["']Parent Feedback Sent\?["']\]\s*:/);
});
t("074 v3.0 creates Communications Hub queue handoff (not Make webhook)", () => {
  assert.match(s074, /Version: v3\.0/);
  assert.match(s074, /Email Handoff Queue/);
  assert.match(s074, /WEEKLY_ATHLETE_SUMMARY\|WEEKLY_ATHLETE_SUMMARY\|/);
  assert.match(s074, /created_handoff/);
  assert.doesNotMatch(s074, /makeWebhookUrl|hook\.us1\.make\.com|remoteFetchAsync|SEND_TAG|WEEKLY_SUMMARY_PARENT/);
});
t("074 clears Send to Make? and does not write Sent fields", () => {
  assert.match(s074, /sendToMake.*false|Send to Make\?.*false/);
  assert.match(s074, /Do not write Weekly Email Sent\?/);
  assert.doesNotMatch(s074, /\[["']Weekly Email Sent\?["']\]\s*:\s*true/);
  assert.doesNotMatch(s074, /\[["']Weekly Email Sent At["']\]\s*:/);
});
t("117 v2.1 creates Communications Hub queue handoff (not Make webhook)", () => {
  assert.match(s117, /version: "v2\.1"/);
  assert.match(s117, /Email Handoff Queue/);
  assert.match(s117, /eventType: "ZOOM_RECORDING_APPROVAL"/);
  assert.match(s117, /templateKey: "ZOOM_RECORDING_APPROVED"/);
  assert.match(s117, /ZOOM_RECORDING_APPROVAL\|ZOOM_ATTENDANCE\|/);
  assert.match(s117, /created_handoff/);
  assert.doesNotMatch(s117, /makeWebhookUrl|webhookUrl|hook\.us1\.make\.com|remoteFetchAsync/);
  assert.doesNotMatch(s117, /automationNumber\s*[:=]/);
});
t("117 does not write Sent fields and omits Make route from payload", () => {
  assert.doesNotMatch(s117, /Weekly Email Sent\?|Parent Feedback Sent\?/);
  assert.doesNotMatch(s117, /automationNumber\s*[:=]/);
  assert.doesNotMatch(s117, /payload\s*=\s*\{[\s\S]*117f/);
  const payloadBlock = s117.slice(s117.indexOf("const payload = {"), s117.indexOf("const queueData"));
  assert.doesNotMatch(payloadBlock, /117f|automationNumber|make/i);
});
t("079 v2.4 accepts ZOOM_RECORDING_APPROVAL Event Type with ZOOM_RECORDING_APPROVED Template Key", () => {
  assert.match(s079, /version: "v2\.4"/);
  assert.match(s079, /eventVideoFeedback: "VIDEO_FEEDBACK"/);
  assert.match(s079, /eventHomeworkFeedback: "HOMEWORK_FEEDBACK"/);
  assert.match(s079, /eventWeeklyAthleteSummary: "WEEKLY_ATHLETE_SUMMARY"/);
  assert.match(s079, /eventZoomRecordingApproval: "ZOOM_RECORDING_APPROVAL"/);
  assert.match(s079, /templateZoomRecordingApproved: "ZOOM_RECORDING_APPROVED"/);
  assert.match(s079, /HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|/);
  assert.match(s079, /WEEKLY_ATHLETE_SUMMARY\|WEEKLY_ATHLETE_SUMMARY\|/);
  assert.match(s079, /ZOOM_RECORDING_APPROVAL\|ZOOM_ATTENDANCE\|/);
  assert.match(s079, /return fetch\(url, request\)/);
  assert.doesNotMatch(s079, /remoteFetchAsync\s*\(/);
  assert.match(s079, /"athleteName", "coachFeedback", "totalVideoXpAwarded"/);
  assert.match(s079, /totalHomeworkXpAwarded \(or totalXp\)/);
  assert.match(s079, /weekLabel \(or weekName\)/);
  assert.match(s079, /approvalResult \(or timing\)/);
  assert.doesNotMatch(s079, /eventZoomRecordingApproved: "ZOOM_RECORDING_APPROVED"/);
});
console.log(`PASS ${pass} 071/073/074/079/117 Hub handoff contracts`);

#!/usr/bin/env node
"use strict";
/**
 * Static contract checks for 074 / 117 Communications Hub handoffs.
 * Run: node tests/email/automation-074-117-hub-handoff.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "../..");
const p074 = path.join(
  root,
  "airtable/automations/shooting-challenge/074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js"
);
const p117 = path.join(
  root,
  "airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js"
);
const s074 = fs.readFileSync(p074, "utf8");
const s117 = fs.readFileSync(p117, "utf8");

let pass = 0;
function t(name, fn) {
  fn();
  pass++;
  console.log(`ok - ${name}`);
}
function checkSyntax(p) {
  const r = spawnSync(process.execPath, ["--check", p], { encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr);
}

t("074 syntax", () => checkSyntax(p074));
t("117 syntax", () => checkSyntax(p117));

t("074 Hub key and event/template", () => {
  assert.match(s074, /version: "v3\.1"/);
  assert.match(s074, /eventType: "WEEKLY_ATHLETE_SUMMARY"/);
  assert.match(s074, /templateKey: "WEEKLY_ATHLETE_SUMMARY"/);
  assert.match(s074, /sourceTableToken: "WEEKLY_ATHLETE_SUMMARY"/);
  assert.match(s074, /handoffKey = `\$\{CONFIG\.values\.eventType\}\|\$\{CONFIG\.values\.sourceTableToken\}\|\$\{recordId\}`/);
});

t("074 no Make POST and clears handoff trigger only", () => {
  assert.doesNotMatch(s074, /remoteFetchAsync|makeWebhookUrl|hook\.us1\.make\.com/);
  assert.match(s074, /sendToMake/);
  assert.match(s074, /CONFIG\.fields\.was\.sendToMake\]\s*=\s*false/);
  assert.doesNotMatch(s074, /\[["']Weekly Email Sent\?["']\]\s*:\s*true/);
  assert.doesNotMatch(s074, /\[["']Weekly Email Sent At["']\]\s*:/);
  assert.doesNotMatch(s074, /sentAt:/);
});

t("074 payload includes athlete and week fields", () => {
  assert.match(s074, /athleteName/);
  assert.match(s074, /weekLabel/);
  assert.match(s074, /daysLogged/);
  assert.match(s074, /weeklyXp/);
  assert.match(s074, /testMode/);
});

t("117 Hub key and event/template", () => {
  assert.match(s117, /version: "v2\.1"/);
  assert.match(s117, /eventType: "ZOOM_RECORDING_APPROVAL"/);
  assert.match(s117, /templateKey: "ZOOM_RECORDING_APPROVED"/);
  assert.match(s117, /sourceTableToken: "ZOOM_ATTENDANCE"/);
  assert.match(s117, /handoffKey = `\$\{CONFIG\.values\.eventType\}\|\$\{CONFIG\.values\.sourceTableToken\}\|\$\{zoomAttendanceId\}`/);
});

t("117 no Make POST and no 117f runtime payload", () => {
  assert.doesNotMatch(s117, /remoteFetchAsync|makeWebhookUrl|webhookUrl|hook\.us1\.make\.com/);
  assert.doesNotMatch(s117, /automationNumber\s*[:=]/);
  const payloadBlock = s117.slice(s117.indexOf("const payload = {"), s117.indexOf("const queueData"));
  assert.doesNotMatch(payloadBlock, /117f|automationNumber|make/i);
  assert.match(s117, /approvalResult: CONFIG\.values\.approvalResult/);
  assert.match(s117, /timing: CONFIG\.values\.timing/);
});

t("117 validates enrollment/meeting inputs against links", () => {
  assert.match(s117, /enrollmentRid does not match/);
  assert.match(s117, /zoomMeetingRid does not match/);
  assert.match(s117, /Recording Quiz Satisfactory\?/);
});

console.log(`PASS ${pass} 074/117 Hub handoff contracts`);

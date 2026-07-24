#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const root = path.join(__dirname, "../..");
const s074 = fs.readFileSync(
  path.join(root, "airtable/automations/shooting-challenge/074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js"),
  "utf8"
);
const architecture = fs.readFileSync(
  path.join(root, "docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md"),
  "utf8"
);
const index = fs.readFileSync(path.join(root, "docs/automation-index.md"), "utf8");

test("074 documents production sendMode Live rule and never-clear Sent?", () => {
  assert.ok(/IMPORTANT PRODUCTION sendMode RULE/.test(s074));
  assert.ok(/must not force automation input sendMode=Test/i.test(s074));
  assert.ok(/must NOT clear Weekly Email Sent\?/.test(s074));
  assert.ok(/Duplicate send blocked/.test(s074));
});

test("074 resolves sendMode input → WAS → payload → default test", () => {
  assert.ok(/normalizeSendMode\(sendModeInput\)/.test(s074));
  assert.ok(/normalizeSendMode\(sendModeFromRecord\)/.test(s074));
  assert.ok(/payloadJson\?\.sendMode/.test(s074));
});

test("architecture + automation-index require PROD Live and Make writeback ownership", () => {
  assert.ok(/sendMode = Live/.test(architecture) || /sendMode=Live/.test(architecture));
  assert.ok(/never fixed Test/i.test(architecture) || /must not be forced to Test/i.test(architecture));
  assert.ok(/Bulk Email - May 18/.test(architecture));
  assert.ok(/074 PROD sendMode=Live/.test(index) || /sendMode=Live/.test(index));
});

test("ownership: 119 must not fetch; 074 owns webhook", () => {
  const s119 = fs.readFileSync(
    path.join(root, "airtable/automations/shooting-challenge/119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js"),
    "utf8"
  );
  assert.ok(!/\bfetch\s*\(/.test(s119));
  assert.ok(/\bfetch\s*\(/.test(s074) || /postJson\(/.test(s074));
});

console.log("sendmode-prod-contract tests passed");

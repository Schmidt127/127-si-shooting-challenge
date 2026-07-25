#!/usr/bin/env node
/**
 * Agent 4 §8 — failure visibility contracts for weekly email chain.
 * Static source checks: errors must surface on WAS fields and/or outputs.
 */
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

const root = path.join(__dirname, "../../airtable/automations/shooting-challenge");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

const s072 = read(
  "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"
);
const s074 = read(
  "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js"
);
const s118 = read(
  "118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js"
);
const s119 = read(
  "119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js"
);

test("072 sets statusOut + errorOut + debugStep on skip/success paths", () => {
  assert.ok(/setOutputSafe\("statusOut"/.test(s072));
  assert.ok(/setOutputSafe\("errorOut"/.test(s072));
  assert.ok(/setOutputSafe\("debugStep"/.test(s072));
  assert.ok(/Weekly Email Error/.test(s072));
});

test("074 webhook failure writes Weekly Email Error and keeps Send to Make?", () => {
  assert.ok(/FIELD_EMAIL_ERROR/.test(s074) || /Weekly Email Error/.test(s074));
  assert.ok(/Do not uncheck Send to Make\? on webhook failure/.test(s074));
  assert.ok(/statusOut", "error"/.test(s074) || /statusOut', 'error'/.test(s074) || /"statusOut", "error"/.test(s074));
  assert.ok(/debugStep", "webhook_failed"/.test(s074));
  assert.ok(/errorOut/.test(s074));
});

test("074 success emits statusOut success without writing Sent?", () => {
  assert.ok(/statusOut", "success"/.test(s074));
  assert.ok(/debugStep", "handoff_complete"/.test(s074));
  assert.ok(/Do NOT check Weekly Email Sent\? here/.test(s074) || /must NOT clear Weekly Email Sent\?/.test(s074));
});

test("074 Make payload includes Live/Test aliases used by Bulk Email May 18", () => {
  for (const key of [
    "sendMode",
    "weeklySummaryRecordId",
    "subject",
    "html",
    "text",
    "csvemail",
    "payloadJson",
    "weekLabel",
    "revision",
    "eventId",
    "toEmail",
  ]) {
    assert.ok(s074.includes(key), `missing payload key ${key}`);
  }
});

test("118/119 expose statusOut errorOut debugStep", () => {
  for (const [name, src] of [
    ["118", s118],
    ["119", s119],
  ]) {
    assert.ok(/statusOut/.test(src), name);
    assert.ok(/errorOut/.test(src), name);
    assert.ok(/debugStep/.test(src), name);
  }
});

test("silent-failure guards documented for Test-mode writeback gap", () => {
  assert.ok(/PROD must not force automation input sendMode=Test/.test(s074));
  assert.ok(/Make\.com owns final Gmail-success writeback/.test(s074));
});

console.log("failure-visibility tests passed");

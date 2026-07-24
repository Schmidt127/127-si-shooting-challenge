#!/usr/bin/env node
/**
 * Static ownership contracts for WAS weekly email handoff.
 * Validates 072 does not send, 119 only arms, 074 owns webhook.
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  resolveEmptyWeekBuildPlan,
  normalizeEmptyWeekPolicy,
} = require("../../lib/was-email-contracts/empty-week-policy");

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
const s119 = read(
  "119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js"
);
const s074 = read(
  "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js"
);
const s118 = read(
  "118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js"
);

test("072 v4.0 enforces empty-week policies and does not call Make/fetch webhook", () => {
  assert.ok(/version:\s*"v4\.0"/.test(s072));
  assert.ok(/emptyWeekPolicy/.test(s072));
  assert.ok(/built_short_empty_week/.test(s072));
  assert.ok(/skipped_empty_week_suppress/.test(s072));
  assert.ok(/Does NOT send the email to Make\.com or Gmail directly/.test(s072));
  assert.ok(!/\bfetch\s*\(/.test(s072), "072 must not fetch/webhook");
  assert.ok(!/makeWebhookUrl/.test(s072), "072 must not take Make webhook input");
});

test("119 v1.4 only arms Send to Make? and does not post webhook", () => {
  assert.ok(/version:\s*"v1\.4"/.test(s119));
  assert.ok(/Send to Make\?/.test(s119) || /sendToMake/.test(s119));
  assert.ok(/Does not POST Make/.test(s119) || /Does not call Make itself/.test(s119));
  assert.ok(!/\bfetch\s*\(/.test(s119), "119 must not fetch/webhook");
  assert.ok(!/makeWebhookUrl/.test(s119));
  assert.ok(!/emptyWeekPolicy recorded but not enforced/.test(s119));
  assert.ok(/send_short/.test(s119));
});

test("118 v1.4 does not build HTML or post webhook", () => {
  assert.ok(/version:\s*"v1\.4"/.test(s118));
  assert.ok(/Build Weekly Email Now\?/.test(s118) || /buildNow/.test(s118));
  assert.ok(!/\bfetch\s*\(/.test(s118));
  assert.ok(!/emptyWeekPolicy recorded but not enforced/.test(s118));
});

test("074 owns webhook handoff; does not mark Sent?; blocks duplicate Sent?", () => {
  assert.ok(/makeWebhookUrl/.test(s074));
  assert.ok(/\bfetch\s*\(/.test(s074) || /postJson\(/.test(s074));
  assert.ok(/Do NOT write Weekly Email Sent\? = false/.test(s074) || /must NOT clear Weekly Email Sent\?/.test(s074));
  assert.ok(/Duplicate send blocked/.test(s074));
  assert.ok(/testRecipientEmail/.test(s074));
  assert.ok(/sendMode === "test"/.test(s074) || /sendMode === 'test'/.test(s074));
  assert.ok(/Version:\s*v2\.1/.test(s074));
  assert.ok(/IMPORTANT PRODUCTION sendMode RULE/.test(s074));
  assert.ok(/must not force automation input sendMode=Test/i.test(s074));
});

test("policy matrix: short / normal / suppress + non-empty full", () => {
  assert.strictEqual(normalizeEmptyWeekPolicy(""), "send_short");
  assert.strictEqual(
    resolveEmptyWeekBuildPlan({ policy: "send_short", isEmpty: true }).buildMode,
    "short"
  );
  assert.strictEqual(
    resolveEmptyWeekBuildPlan({ policy: "send_normal", isEmpty: true }).buildMode,
    "full"
  );
  assert.strictEqual(
    resolveEmptyWeekBuildPlan({ policy: "suppress", isEmpty: true }).sendReady,
    false
  );
  assert.strictEqual(
    resolveEmptyWeekBuildPlan({ policy: "suppress", isEmpty: false }).buildMode,
    "full"
  );
});

test("074 test mode prefers testRecipientEmail over csvemail in payload toEmail", () => {
  assert.ok(/toEmail:\s*sendMode === "test" \? testRecipientEmail : recipientsCsv/.test(s074));
});

console.log("handoff-ownership tests passed");

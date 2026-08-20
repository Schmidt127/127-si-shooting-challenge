#!/usr/bin/env node
/**
 * Static ownership contracts for WAS weekly email handoff.
 * Validates 072 does not send, 119 only arms, 074 owns Hub queue handoff.
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

test("072 v4.2 enforces empty-week policies and does not call Make/fetch webhook", () => {
  assert.ok(/Version:\s*v4\.2/.test(s072));
  assert.ok(/emptyWeekPolicy/.test(s072));
  assert.ok(/built_short_empty_week/.test(s072));
  assert.ok(/suppressed_empty_week/.test(s072));
  assert.ok(!/\bfetch\s*\(/.test(s072), "072 must not fetch/webhook");
  assert.ok(!/makeWebhookUrl/.test(s072), "072 must not take Make webhook input");
});

test("119 v1.7 only arms Send to Make? and does not post webhook", () => {
  assert.ok(/version:\s*"v1\.7"/.test(s119));
  assert.ok(/Send to Make\?/.test(s119) || /sendToMake/.test(s119));
  assert.ok(/Does not POST Make/.test(s119) || /Does not call Make itself/.test(s119));
  assert.ok(!/\bfetch\s*\(/.test(s119), "119 must not fetch/webhook");
  assert.ok(!/makeWebhookUrl/.test(s119));
  assert.ok(!/emptyWeekPolicy recorded but not enforced/.test(s119));
  assert.ok(/send_short/.test(s119));
});

test("118 v2.0 does not create WAS, build HTML, or post webhook; arms sendMode from input", () => {
  assert.ok(/version:\s*"v2\.0"/.test(s118));
  assert.ok(/Build Weekly Email Now\?/.test(s118) || /buildNow/.test(s118));
  assert.ok(!/\bfetch\s*\(/.test(s118));
  assert.ok(!/wasTable\.createRecordAsync/.test(s118), "118 must never create a WAS");
  assert.ok(/skipped unsettled canonical Summary Key/.test(s118));
  assert.ok(!/emptyWeekPolicy recorded but not enforced/.test(s118));
  assert.ok(/refuses sendMode=Live when includeSchmidt=true/.test(s118));
  assert.ok(/update\[CONFIG\.was\.sendMode\]\s*=\s*\{\s*name:\s*sendMode\s*\}/.test(s118));
});

test("074 owns Hub queue handoff; does not mark Sent?; blocks duplicate Sent?", () => {
  assert.ok(/Version:\s*v3\.1/.test(s074));
  assert.ok(/Email Handoff Queue/.test(s074));
  assert.ok(/WEEKLY_ATHLETE_SUMMARY\|WEEKLY_ATHLETE_SUMMARY\|/.test(s074));
  assert.ok(/created_handoff/.test(s074));
  assert.ok(!/\bfetch\s*\(/.test(s074), "074 must not fetch/webhook");
  assert.ok(!/makeWebhookUrl/.test(s074), "074 must not take Make webhook input");
  assert.ok(/Do not write Weekly Email Sent\?/.test(s074));
  assert.ok(/Duplicate handoff blocked/.test(s074));
  assert.ok(/testMode/.test(s074));
  assert.ok(/sendToMake/.test(s074));
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

test("074 clears Send to Make? and leaves Sent fields to Hub writeback", () => {
  assert.ok(/CONFIG\.fields\.was\.sendToMake\]\s*=\s*false/.test(s074));
  assert.ok(!/\[["']Weekly Email Sent\?["']\]\s*:\s*true/.test(s074));
  assert.ok(!/\[["']Weekly Email Sent At["']\]\s*:/.test(s074));
});

console.log("handoff-ownership tests passed");

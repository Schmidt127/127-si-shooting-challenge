#!/usr/bin/env node
/**
 * Regression for the current Communications Hub email plane.
 * Historical 074 -> Make/Gmail send-mode behavior is retained in evidence
 * documents, not asserted against the current v3 queue producer.
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  evaluateWeeklySummarySendGate,
  evaluateWeeklySummaryBuildGate,
} = require("../../airtable/automations/shooting-challenge/lib/v2-engine-contracts");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const root = path.join(__dirname, "../../airtable/automations/shooting-challenge");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const s072 = read("072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js");
const s074 = read("074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js");
const s079 = read("079-email-notifications-and-external-handoffs-send-queue-handoff-to-communications-hub.js");
const s118 = read("118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js");
const s119 = read("119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js");

test("074 creates a deterministic weekly-summary Hub key", () => {
  assert.ok(/CONFIG\.values\.eventType\}\|\$\{CONFIG\.values\.sourceTableToken\}\|\$\{recordId\}/.test(s074));
  assert.ok(/existing_handoff/.test(s074));
  assert.ok(/Conflicting Email Handoff Queue payload/.test(s074));
});

test("074 never performs delivery or writes delivery proof", () => {
  assert.ok(!/\bfetch\s*\(/.test(s074));
  assert.ok(/Only Automation 079 may send/.test(s074));
  assert.ok(/Do not write Weekly Email Sent\? or Weekly Email Sent At/.test(s074));
  assert.ok(!/Weekly Email Sent\?\s*[:=]\s*true/.test(s074));
});

test("079 alone owns Hub network ingress", () => {
  assert.ok(/\bfetch\s*\(/.test(s079));
  for (const source of [s072, s074, s118, s119]) {
    assert.ok(!/\bfetch\s*\(/.test(source));
  }
});

test("duplicate-send and already-sent gates remain fail closed", () => {
  assert.strictEqual(
    evaluateWeeklySummarySendGate({
      emailReady: true,
      emailSent: true,
      sendToMake: true,
    }).action,
    "error_duplicate_send_blocked",
  );
  assert.strictEqual(
    evaluateWeeklySummaryBuildGate({
      buildNow: true,
      emailSent: true,
      autoMode: false,
    }).action,
    "skip_already_sent",
  );
  assert.ok(/Weekly Email Sent\? is already checked/.test(s074));
});

test("schedulers only arm build/send state", () => {
  assert.ok(/Build Weekly Email Now\?/.test(s118));
  assert.ok(/Send to Make\?/.test(s119));
  assert.ok(!/makeWebhookUrl/.test(s118));
  assert.ok(!/makeWebhookUrl/.test(s119));
});

console.log("current email-plane regression tests passed");

#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const root = path.join(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const s074 = read(
  "airtable/automations/shooting-challenge/074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js",
);
const s079 = read(
  "airtable/automations/shooting-challenge/079-email-notifications-and-external-handoffs-send-queue-handoff-to-communications-hub.js",
);
const architecture = read("docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md");
const index = read("docs/automation-index.md");

test("074 v3.5 records test mode but never owns network delivery", () => {
  assert.ok(/Version:\s*v3\.5/.test(s074));
  assert.ok(/testMode defaults true/.test(s074));
  assert.ok(/Email Handoff Queue/.test(s074));
  assert.ok(/Only Automation 079 may send/.test(s074));
  assert.ok(!/\bfetch\s*\(/.test(s074));
});

test("074 leaves Sent proof to Hub writeback and fails closed on queue conflict", () => {
  assert.ok(/Do not write Weekly Email Sent\? or Weekly Email Sent At/.test(s074));
  assert.ok(/needs_review/.test(s074));
  assert.ok(/Conflicting Email Handoff Queue payload/.test(s074));
  assert.ok(/Multiple Email Handoff Queue rows/.test(s074));
});

test("079 owns Communications Hub ingress", () => {
  assert.ok(/Communications Hub/.test(s079));
  assert.ok(/\bfetch\s*\(/.test(s079));
  assert.ok(/Email Handoff Queue/.test(s079));
});

test("historical architecture redirects to current Hub authority", () => {
  assert.ok(/HISTORICAL/.test(architecture));
  assert.ok(/Communications Hub/i.test(architecture));
  assert.ok(/docs\/integrations\/email-send-plane\.md/.test(architecture));
  assert.ok(/Communications Hub/i.test(index));
  assert.ok(/079/.test(index));
});

console.log("sendmode-prod-contract tests passed");

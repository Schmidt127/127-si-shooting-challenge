#!/usr/bin/env node
/**
 * Current weekly-email source contracts.
 *
 * 072 owns safe package rendering. 074 v3 owns a durable, idempotent
 * Communications Hub queue handoff; it no longer renders or performs a
 * network send. These assertions intentionally follow that ownership split.
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..");
const s072 = fs.readFileSync(
  path.join(dir, "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"),
  "utf8",
);
const s074 = fs.readFileSync(
  path.join(dir, "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js"),
  "utf8",
);

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS  ${name}`);
}

test("072 v4.6 owns escaped HTML and plain-text package rendering", () => {
  assert.ok(/Version:\s*v4\.6/.test(s072));
  assert.ok(/Shooting Days Logged/.test(s072));
  assert.ok(/Perfect Week Qualifying Days/.test(s072));
  assert.ok(/function escapeHtml\(value\)/.test(s072));
  for (const entity of ["&amp;", "&lt;", "&gt;", "&quot;", "&#39;"]) {
    assert.ok(s072.includes(entity), `072 escapeHtml must emit ${entity}`);
  }
  assert.ok(/function fullHtml\(data\)/.test(s072));
  assert.ok(/function shortHtml\(data\)/.test(s072));
  assert.ok(/function plainText\(data, short\)/.test(s072));
});

test("072 remains Denver-safe and fails closed on reporting disagreement", () => {
  assert.ok(/timeZone:\s*"America\/Denver"/.test(s072));
  assert.ok(/Intl\.DateTimeFormat/.test(s072));
  assert.ok(/toDateKey/.test(s072));
  assert.ok(/canonicalDaysLogged/.test(s072));
  assert.ok(/Weekly shots disagreement/.test(s072));
  assert.ok(/Weekly makes disagreement/.test(s072));
  assert.ok(/Weekly XP disagreement/.test(s072));
  assert.ok(/WAS-linked active XP/.test(s072));
  assert.ok(/Unlinked canonical XP/.test(s072));
  assert.ok(/Perfect Week Progress/.test(s072));
  assert.ok(/perfectWeekCountable/.test(s072));
  assert.ok(/buildPerfectWeekEmailCriteria/.test(s072));
  assert.ok(/Achievements/.test(s072));
});

test("072 never performs external delivery", () => {
  assert.ok(!/\bfetch\s*\(/.test(s072));
  assert.ok(!/makeWebhookUrl/.test(s072));
});

test("074 v3.2 creates one canonical Hub handoff", () => {
  assert.ok(/Version:\s*v3\.2/.test(s074));
  assert.ok(/Email Handoff Queue/.test(s074));
  assert.ok(/CONFIG\.values\.eventType\}\|\$\{CONFIG\.values\.sourceTableToken\}\|\$\{recordId\}/.test(s074));
  assert.ok(/existing_handoff/.test(s074));
  assert.ok(/created_handoff/.test(s074));
  assert.ok(/needs_review/.test(s074));
  assert.ok(/samePayload/.test(s074));
});

test("074 delegates delivery and delivery proof", () => {
  assert.ok(!/\bfetch\s*\(/.test(s074));
  assert.ok(/Only Automation 079 may send/.test(s074));
  assert.ok(/canonicalDaysLogged/.test(s074));
  assert.ok(/videoSubmissions/.test(s074));
  assert.ok(/perfectWeekCriteria/.test(s074));
  assert.ok(/goalCompletionPercent/.test(s074));
  assert.ok(/Do not write Weekly Email Sent\?/.test(s074));
  assert.ok(/sendToMake\]\s*=\s*false/.test(s074));
});

console.log(`Summary: ${passed} passed, 0 failed`);

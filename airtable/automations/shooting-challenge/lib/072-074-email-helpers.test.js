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

test("072 v4.1 owns escaped HTML and plain-text package rendering", () => {
  assert.ok(/Version:\s*v4\.1/.test(s072));
  assert.ok(/function esc\(v\)/.test(s072));
  for (const entity of ["&amp;", "&lt;", "&gt;", "&quot;", "&#39;"]) {
    assert.ok(s072.includes(entity), `072 esc must emit ${entity}`);
  }
  assert.ok(/function fullHtml\(d\)/.test(s072));
  assert.ok(/function shortHtml\(d\)/.test(s072));
  assert.ok(/function plain\(d,short\)/.test(s072));
});

test("072 remains Denver-safe and fails closed on reporting disagreement", () => {
  assert.ok(/TZ="America\/Denver"/.test(s072));
  assert.ok(/Intl\.DateTimeFormat/.test(s072));
  assert.ok(/Weekly shots disagreement/.test(s072));
  assert.ok(/Weekly XP disagreement/.test(s072));
  assert.ok(/active canonical XP/.test(s072));
});

test("072 never performs external delivery", () => {
  assert.ok(!/\bfetch\s*\(/.test(s072));
  assert.ok(!/makeWebhookUrl/.test(s072));
});

test("074 v3.0 creates one canonical Hub handoff", () => {
  assert.ok(/Version:\s*v3\.0/.test(s074));
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
  assert.ok(/Do not write Weekly Email Sent\?/.test(s074));
  assert.ok(/sendToMake\]\s*=\s*false/.test(s074));
});

console.log(`Summary: ${passed} passed, 0 failed`);

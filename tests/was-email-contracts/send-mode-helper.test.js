#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  normalizeSendMode,
  resolveWeeklyEmailSendMode,
  describeMakeRouteExpectations,
  select074ToEmail,
  script074MayWriteSentStatus,
} = require("../../lib/was-email-contracts/send-mode");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("normalizeSendMode maps live/test aliases", () => {
  assert.strictEqual(normalizeSendMode("Live"), "live");
  assert.strictEqual(normalizeSendMode("TEST"), "test");
  assert.strictEqual(normalizeSendMode(""), "");
});

test("resolveWeeklyEmailSendMode prefers input over WAS over payload", () => {
  assert.strictEqual(
    resolveWeeklyEmailSendMode({ input: "Live", wasSendMode: "test", payloadSendMode: "test" }),
    "live"
  );
  assert.strictEqual(
    resolveWeeklyEmailSendMode({ input: "", wasSendMode: "Live", payloadSendMode: "test" }),
    "live"
  );
  assert.strictEqual(
    resolveWeeklyEmailSendMode({ input: "", wasSendMode: "", payloadSendMode: "test" }),
    "test"
  );
});

test("Make Live route expects Sent? writeback; Test does not", () => {
  const live = describeMakeRouteExpectations("live");
  assert.strictEqual(live.writesSentStatus, true);
  assert.strictEqual(live.makeBranch, "live");
  const testMode = describeMakeRouteExpectations("test");
  assert.strictEqual(testMode.writesSentStatus, false);
  assert.strictEqual(testMode.makeBranch, "test");
});

test("074 toEmail uses test recipient only in test mode", () => {
  assert.strictEqual(
    select074ToEmail({ sendMode: "test", testRecipientEmail: "a@x.com", recipientsCsv: "b@y.com" }),
    "a@x.com"
  );
  assert.strictEqual(
    select074ToEmail({ sendMode: "live", testRecipientEmail: "a@x.com", recipientsCsv: "b@y.com" }),
    "b@y.com"
  );
});

test("074 must never write Sent? (Make owns Live writeback)", () => {
  assert.strictEqual(script074MayWriteSentStatus(), false);
});

console.log("send-mode-helper tests passed");

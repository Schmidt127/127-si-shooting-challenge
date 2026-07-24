#!/usr/bin/env node
/**
 * Agent 4 — Live/Test sendMode regression (PROD incident 2026-07-24).
 *
 * Verified production facts:
 * - Fixed 074 input sendMode=Test forced Make Test branch (email OK, no Sent? writeback).
 * - Changing 074 to sendMode=Live → Make Live writeback PASS.
 * - Flow: 118 → 072 → 119 → 074 → Make → Gmail → Make Airtable writeback.
 *
 * Evidence types: script source contracts + pure helpers + architecture doc.
 * Does NOT send email or touch live Airtable/Make.
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  normalizeSendMode,
  resolveWeeklyEmailSendMode,
  describeMakeRouteExpectations,
  select074ToEmail,
  script074MayWriteSentStatus,
} = require("../../lib/was-email-contracts/send-mode");
const {
  evaluateWeeklySummarySendGate,
  evaluateWeeklySummaryBuildGate,
  buildWeeklyEmailEventId,
} = require("../../airtable/automations/shooting-challenge/lib/v2-engine-contracts");

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
const s074 = read(
  "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js"
);
const s119 = read(
  "119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js"
);
const s072 = read(
  "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"
);
const s118 = read(
  "118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js"
);

test("normalizeSendMode maps Live/Test synonyms", () => {
  assert.strictEqual(normalizeSendMode("Live"), "live");
  assert.strictEqual(normalizeSendMode("parent"), "live");
  assert.strictEqual(normalizeSendMode("TEST"), "test");
  assert.strictEqual(normalizeSendMode("preview"), "test");
  assert.strictEqual(normalizeSendMode("banana"), "");
});

test("Live mode resolves when automation input is Live", () => {
  assert.strictEqual(
    resolveWeeklyEmailSendMode({
      input: "Live",
      wasSendMode: "test",
      payloadSendMode: "test",
    }),
    "live"
  );
});

test("Test mode resolves when automation input is Test (PROD incident root cause)", () => {
  assert.strictEqual(
    resolveWeeklyEmailSendMode({
      input: "Test",
      wasSendMode: "live",
      payloadSendMode: "live",
    }),
    "test"
  );
});

test("blank input inherits WAS.sendMode (Live)", () => {
  assert.strictEqual(
    resolveWeeklyEmailSendMode({
      input: "",
      wasSendMode: "Live",
      payloadSendMode: "",
    }),
    "live"
  );
});

test("blank input + blank WAS falls through to payload then default test", () => {
  assert.strictEqual(
    resolveWeeklyEmailSendMode({
      input: "",
      wasSendMode: "",
      payloadSendMode: "live",
    }),
    "live"
  );
  assert.strictEqual(
    resolveWeeklyEmailSendMode({
      input: "",
      wasSendMode: "",
      payloadSendMode: "",
    }),
    "test"
  );
});

test("Test mode uses test recipient; Live mode uses csvemail", () => {
  assert.strictEqual(
    select074ToEmail({
      sendMode: "test",
      testRecipientEmail: "mschmidt@fairfield.k12.mt.us",
      recipientsCsv: "parent@example.com",
    }),
    "mschmidt@fairfield.k12.mt.us"
  );
  assert.strictEqual(
    select074ToEmail({
      sendMode: "live",
      testRecipientEmail: "mschmidt@fairfield.k12.mt.us",
      recipientsCsv: "parent@example.com",
    }),
    "parent@example.com"
  );
});

test("Make Live route expects Sent? writeback; Test does not falsely claim it", () => {
  const live = describeMakeRouteExpectations("live");
  assert.strictEqual(live.makeBranch, "live");
  assert.strictEqual(live.writesSentStatus, true);
  assert.strictEqual(live.writesMakeSendStatus, true);
  assert.strictEqual(live.writesSentTimestamp, true);

  const testMode = describeMakeRouteExpectations("test");
  assert.strictEqual(testMode.makeBranch, "test");
  assert.strictEqual(testMode.writesSentStatus, false);
  assert.strictEqual(testMode.writesMakeSendStatus, false);
  assert.strictEqual(testMode.writesSentTimestamp, false);
  assert.strictEqual(testMode.falselyClaimsLiveWriteback, false);
});

test("074 must never write Weekly Email Sent? (Make owns writeback)", () => {
  assert.strictEqual(script074MayWriteSentStatus(), false);
  assert.ok(/Do NOT write Weekly Email Sent\? = false/.test(s074) || /must NOT clear Weekly Email Sent\?/.test(s074));
  assert.ok(/Make\.com owns final Gmail-success writeback/.test(s074));
  assert.ok(!/Weekly Email Sent\?\s*[:=]\s*true/.test(s074));
  assert.ok(!/FIELD_EMAIL_SENT[^\n]*=\s*true/.test(s074));
});

test("074 source keeps input → WAS → payload → test resolution order", () => {
  assert.ok(/normalizeSendMode\(sendModeInput\)/.test(s074));
  assert.ok(/normalizeSendMode\(sendModeFromRecord\)/.test(s074));
  assert.ok(/normalizeSendMode\(payloadJson\?\.sendMode\)/.test(s074));
  assert.ok(/firstNonBlank\(\s*normalizeSendMode\(sendModeInput\)/.test(s074));
  assert.ok(/PROD must not force automation input sendMode=Test/.test(s074));
});

test("074 owns webhook; 119/072/118 do not fetch", () => {
  assert.ok(/\bfetch\s*\(/.test(s074) || /postJson\(/.test(s074));
  assert.ok(!/\bfetch\s*\(/.test(s119));
  assert.ok(!/\bfetch\s*\(/.test(s072));
  assert.ok(!/\bfetch\s*\(/.test(s118));
  assert.ok(/makeWebhookUrl/.test(s074));
  assert.ok(!/makeWebhookUrl/.test(s119));
  assert.ok(!/makeWebhookUrl/.test(s072));
});

test("074 duplicate-send blocked when already sent", () => {
  assert.strictEqual(
    evaluateWeeklySummarySendGate({
      emailReady: true,
      emailSent: true,
      sendToMake: true,
    }).action,
    "error_duplicate_send_blocked"
  );
  assert.ok(/Duplicate send blocked/.test(s074));
});

test("072 build gate skips when already sent; 119 arms only", () => {
  assert.strictEqual(
    evaluateWeeklySummaryBuildGate({
      buildNow: true,
      emailSent: true,
      autoMode: false,
    }).action,
    "skip_already_sent"
  );
  assert.ok(/Send to Make\?/.test(s119) || /sendToMake/.test(s119));
  assert.ok(/Does not POST Make/.test(s119) || /Does not call Make itself/.test(s119));
});

test("eventId WEEKLY_EMAIL|enrollment|week is stable", () => {
  const enr = "recEnrollment0001";
  const week = "recWeek0000000001";
  assert.strictEqual(buildWeeklyEmailEventId(enr, week), `WEEKLY_EMAIL|${enr}|${week}`);
  assert.ok(/WEEKLY_EMAIL\|/.test(s074));
});

test("Test mode requires testRecipientEmail in 074", () => {
  assert.ok(/Missing testRecipientEmail for test mode/.test(s074));
  assert.ok(/toEmail:\s*sendMode === "test" \? testRecipientEmail : recipientsCsv/.test(s074));
});

console.log("send-mode-live-test-regression tests passed");

#!/usr/bin/env node
/**
 * Offline contract tests for MRW-F07 WE-06 WAS Hub writeback (FUT-006).
 *   node tools/testing/tests/test_mrw_f07_was_writeback_contract.mjs
 */
import assert from "node:assert/strict";
import {
  HARNESS_ID,
  WAS_WRITEBACK_FIELDS,
  WAS_STATUS,
  buildWeeklyHandoffKey,
  determineWritebackPhase,
  evaluateWritebackContract,
  pickWritebackFields,
} from "../lib/mrw-f07-weekly-email-lib.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const wasId = "recWasWriteback01";

test("pickWritebackFields selects FUT-006 field subset", () => {
  const fields = {
    "Build Weekly Email Now?": true,
    [WAS_WRITEBACK_FIELDS.hubEventId]: "recHubEvent001",
    [WAS_WRITEBACK_FIELDS.sent]: false,
    [WAS_WRITEBACK_FIELDS.status]: WAS_STATUS.readyForSend,
  };
  const picked = pickWritebackFields(fields);
  assert.equal(Object.keys(picked).length, 3);
  assert.equal(picked[WAS_WRITEBACK_FIELDS.hubEventId], "recHubEvent001");
});

test("determineWritebackPhase — none before Hub accept", () => {
  const phase = determineWritebackPhase({}, wasId, []);
  assert.equal(phase.phase, "none");
  assert.equal(phase.observable, false);
});

test("determineWritebackPhase — hub_accept from Hub Event ID", () => {
  const fields = {
    [WAS_WRITEBACK_FIELDS.hubEventId]: "recHubEvent001",
    [WAS_WRITEBACK_FIELDS.sent]: false,
  };
  const phase = determineWritebackPhase(fields, wasId, []);
  assert.equal(phase.phase, "hub_accept");
  assert.equal(phase.observable, true);
});

test("determineWritebackPhase — hub_accept from queue Accepted", () => {
  const queue = [
    {
      fields: {
        "Handoff Key": buildWeeklyHandoffKey(wasId),
        Status: "Accepted",
      },
    },
  ];
  const phase = determineWritebackPhase({ [WAS_WRITEBACK_FIELDS.sent]: false }, wasId, queue);
  assert.equal(phase.phase, "hub_accept");
});

test("evaluateWritebackContract — hub_accept pass", () => {
  const fields = {
    [WAS_WRITEBACK_FIELDS.hubEventId]: "recHubEvent001",
    [WAS_WRITEBACK_FIELDS.sent]: false,
    [WAS_WRITEBACK_FIELDS.sentAt]: null,
    [WAS_WRITEBACK_FIELDS.summarySentAt]: null,
    [WAS_WRITEBACK_FIELDS.status]: WAS_STATUS.readyForSend,
    [WAS_WRITEBACK_FIELDS.error]: "",
  };
  const result = evaluateWritebackContract(fields, wasId, []);
  assert.equal(result.id, "WE-06");
  assert.equal(result.phase, "hub_accept");
  assert.equal(result.pass, true);
  assert.ok(result.checks.every((check) => check.pass));
});

test("evaluateWritebackContract — hub_accept fail when Sent? checked early", () => {
  const fields = {
    [WAS_WRITEBACK_FIELDS.hubEventId]: "recHubEvent001",
    [WAS_WRITEBACK_FIELDS.sent]: true,
    [WAS_WRITEBACK_FIELDS.status]: WAS_STATUS.readyForSend,
  };
  const result = evaluateWritebackContract(fields, wasId, []);
  assert.notEqual(result.phase, "hub_accept");
});

test("evaluateWritebackContract — hub_accept fail without Hub Event ID", () => {
  const queue = [
    {
      fields: {
        "Handoff Key": buildWeeklyHandoffKey(wasId),
        Status: "Accepted",
      },
    },
  ];
  const fields = {
    [WAS_WRITEBACK_FIELDS.sent]: false,
    [WAS_WRITEBACK_FIELDS.status]: WAS_STATUS.readyForSend,
  };
  const result = evaluateWritebackContract(fields, wasId, queue);
  assert.equal(result.phase, "hub_accept");
  assert.equal(result.pass, false);
  const hubCheck = result.checks.find((c) => c.field === WAS_WRITEBACK_FIELDS.hubEventId);
  assert.equal(hubCheck.pass, false);
});

test("evaluateWritebackContract — resend_success pass", () => {
  const sentAt = "2026-09-01T12:00:00.000Z";
  const fields = {
    [WAS_WRITEBACK_FIELDS.hubEventId]: "recHubEvent001",
    [WAS_WRITEBACK_FIELDS.sent]: true,
    [WAS_WRITEBACK_FIELDS.sentAt]: sentAt,
    [WAS_WRITEBACK_FIELDS.summarySentAt]: sentAt,
    [WAS_WRITEBACK_FIELDS.status]: WAS_STATUS.sent,
    [WAS_WRITEBACK_FIELDS.error]: "",
  };
  const result = evaluateWritebackContract(fields, wasId, []);
  assert.equal(result.phase, "resend_success");
  assert.equal(result.pass, true);
  assert.equal(result.checks.length, 5);
});

test("evaluateWritebackContract — resend_success fail when Error not cleared", () => {
  const sentAt = "2026-09-01T12:00:00.000Z";
  const fields = {
    [WAS_WRITEBACK_FIELDS.sent]: true,
    [WAS_WRITEBACK_FIELDS.sentAt]: sentAt,
    [WAS_WRITEBACK_FIELDS.summarySentAt]: sentAt,
    [WAS_WRITEBACK_FIELDS.status]: WAS_STATUS.sent,
    [WAS_WRITEBACK_FIELDS.error]: "provider timeout",
  };
  const result = evaluateWritebackContract(fields, wasId, []);
  assert.equal(result.phase, "resend_success");
  assert.equal(result.pass, false);
});

test("evaluateWritebackContract — resend_failure pass", () => {
  const fields = {
    [WAS_WRITEBACK_FIELDS.sent]: false,
    [WAS_WRITEBACK_FIELDS.status]: WAS_STATUS.error,
    [WAS_WRITEBACK_FIELDS.error]: "bounce: mailbox unavailable",
  };
  const result = evaluateWritebackContract(fields, wasId, []);
  assert.equal(result.phase, "resend_failure");
  assert.equal(result.pass, true);
});

test("evaluateWritebackContract — skipped when phase none", () => {
  const result = evaluateWritebackContract({}, wasId, []);
  assert.equal(result.skipped, true);
  assert.equal(result.pass, false);
});

console.log(`\n${HARNESS_ID} WE-06 writeback contract tests passed.`);

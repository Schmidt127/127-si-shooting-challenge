/**
 * Offline regression tests for shared Automation 079 Hub dispatch.
 * Run: node --test tests/email/automation-079-offline.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  MockBase,
  MockOutput,
  MockRecord,
  MockTable,
  makeConsole,
  makeInput,
} from "../../tools/testing/tests/airtable_mock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../airtable/automations/shooting-challenge/079-email-notifications-and-external-handoffs-send-queue-handoff-to-communications-hub.js"
);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const WELCOME_QUEUE_ID = "recWelcome07900001";
const DAILY_QUEUE_ID = "recaZyyMx9Tf6zzNU";
const SUBMISSION_ID = "rec58gdymfPKKeVRI";

function singleSelect(name, choices) {
  return {
    name,
    type: "singleSelect",
    options: { choices: choices.map((choice) => ({ id: `sel${choice}`, name: choice })) },
  };
}

function buildQueueRecord({
  id,
  eventType,
  templateKey,
  handoffKey,
  sourceTable,
  sourceRecordId,
  recipients,
  payload,
}) {
  return new MockRecord(id, {
    Status: { name: "Ready" },
    "Event Type": { name: eventType },
    "Handoff Key": handoffKey,
    "Source Table": sourceTable,
    "Source Record ID": sourceRecordId,
    "Enrollment Record ID": "recEnrollment079001",
    "Program Instance Record ID": "recProgram0790001",
    "Recipients JSON": JSON.stringify(recipients),
    "Template Key": templateKey,
    "Payload JSON": JSON.stringify(payload),
    "Test Mode?": true,
    "Attempt Count": 0,
    "Last Attempt At": null,
    "Last Error": "",
    "Hub Event ID": "",
    "Hub Response JSON": "",
    "Accepted At": null,
  });
}

function build079Base(record) {
  const queue = new MockTable(
    "Email Handoff Queue",
    [
      singleSelect("Status", ["Ready", "Sending", "Accepted", "Failed", "Needs Review"]),
      singleSelect("Event Type", ["WELCOME", "DAILY_SUBMISSION"]),
      { name: "Handoff Key", type: "singleLineText" },
      { name: "Source Table", type: "singleLineText" },
      { name: "Source Record ID", type: "singleLineText" },
      { name: "Enrollment Record ID", type: "singleLineText" },
      { name: "Program Instance Record ID", type: "singleLineText" },
      { name: "Recipients JSON", type: "multilineText" },
      { name: "Template Key", type: "singleLineText" },
      { name: "Payload JSON", type: "multilineText" },
      { name: "Test Mode?", type: "checkbox" },
      { name: "Attempt Count", type: "number" },
      { name: "Last Attempt At", type: "dateTime" },
      { name: "Last Error", type: "multilineText" },
      { name: "Hub Event ID", type: "singleLineText" },
      { name: "Hub Response JSON", type: "multilineText" },
      { name: "Accepted At", type: "dateTime" },
    ],
    [record]
  );
  return { base: new MockBase([queue]), queue };
}

function welcomeRecord() {
  return buildQueueRecord({
    id: WELCOME_QUEUE_ID,
    eventType: "WELCOME",
    templateKey: "WELCOME",
    handoffKey: "WELCOME|ENROLLMENTS|recEnrollment079001",
    sourceTable: "Enrollments",
    sourceRecordId: "recEnrollment079001",
    recipients: [
      { role: "PARENT", email: "parent@example.com" },
      { role: "ATHLETE", email: "athlete@example.com" },
    ],
    payload: { athleteName: "Test Athlete", programName: "Shooting Challenge", message: "Welcome!" },
  });
}

function dailyRecord(overrides = {}) {
  return buildQueueRecord({
    id: DAILY_QUEUE_ID,
    eventType: "DAILY_SUBMISSION",
    templateKey: "DAILY_SUBMISSION",
    handoffKey: `DAILY_SUBMISSION|SUBMISSIONS|${SUBMISSION_ID}`,
    sourceTable: "Submissions",
    sourceRecordId: SUBMISSION_ID,
    recipients: [{ email: "parent@example.com", role: "guardian" }],
    payload: { athleteName: "Test Athlete", shots: 20, makes: 10, submissionXpStatus: "Pending / not yet awarded" },
    ...overrides,
  });
}

function acceptedResponse({ duplicate = false } = {}) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ accepted: true, eventId: "evt079001", ...(duplicate ? { duplicate: true } : {}) }),
  };
}

async function run079({ record, response = acceptedResponse() }) {
  const { base, queue } = build079Base(record);
  const output = new MockOutput();
  const capturedConsole = makeConsole();
  const requests = [];
  const fetch = async (_url, request) => {
    requests.push(JSON.parse(request.body));
    return typeof response === "function" ? response(requests.length) : response;
  };
  const code = readFileSync(SCRIPT_PATH, "utf8");
  const fn = new AsyncFunction("base", "input", "output", "console", "fetch", code);
  let error = null;
  try {
    await fn(base, makeInput({ recordId: record.id, ingressSecret: "test-secret" }), output, capturedConsole, fetch);
  } catch (caught) {
    error = caught;
  }
  return { base, queue, output, error, requests, console: capturedConsole };
}

test("079 dispatches an existing WELCOME row and accepts replay without duplicate delivery", async () => {
  const first = await run079({ record: welcomeRecord() });
  assert.equal(first.error, null, first.error?.message);
  assert.equal(first.requests.length, 1);
  assert.equal(first.requests[0].eventType, "WELCOME");
  assert.equal(first.requests[0].templateKey, "WELCOME");
  assert.equal(first.queue.records.get(WELCOME_QUEUE_ID).cells.Status, "Accepted");
  assert.equal(first.output.values.actionOut, "accepted_new");

  const second = await run079({ record: first.queue.records.get(WELCOME_QUEUE_ID) });
  assert.equal(second.error, null, second.error?.message);
  assert.equal(second.requests.length, 0);
  assert.equal(second.output.values.actionOut, "skipped_not_ready");
});

test("079 dispatches DAILY_SUBMISSION using stored event, recipients, payload, and source IDs", async () => {
  const record = dailyRecord();
  const result = await run079({ record });

  assert.equal(result.error, null, result.error?.message);
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].eventType, "DAILY_SUBMISSION");
  assert.equal(result.requests[0].templateKey, "DAILY_SUBMISSION");
  assert.equal(result.requests[0].handoffKey, `DAILY_SUBMISSION|SUBMISSIONS|${SUBMISSION_ID}`);
  assert.deepEqual(result.requests[0].recipients, [{ email: "parent@example.com", role: "guardian" }]);
  assert.deepEqual(result.requests[0].data, JSON.parse(record.cells["Payload JSON"]));
  assert.deepEqual(result.requests[0].source, {
    table: "Submissions",
    recordId: SUBMISSION_ID,
  });
  assert.equal(result.requests[0].enrollmentRecordId, "recEnrollment079001");
  assert.equal(result.requests[0].programInstanceRecordId, "recProgram0790001");
  assert.equal(result.requests[0].testMode, true);
  assert.equal(result.queue.records.get(DAILY_QUEUE_ID).cells.Status, "Accepted");
});

test("079 requires the exact DAILY_SUBMISSION handoff key format", async () => {
  const result = await run079({
    record: dailyRecord({ handoffKey: `DAILY_SUBMISSION|SUBMISSIONS|${SUBMISSION_ID}|extra` }),
  });

  assert.ok(result.error);
  assert.match(result.error.message, /Invalid DAILY_SUBMISSION Handoff Key/);
  assert.equal(result.requests.length, 0);
  assert.deepEqual(result.queue.records.get(DAILY_QUEUE_ID).cells.Status, { name: "Ready" });
});

test("079 rejects a DAILY_SUBMISSION key whose suffix differs from Source Record ID", async () => {
  const result = await run079({
    record: dailyRecord({ handoffKey: "DAILY_SUBMISSION|SUBMISSIONS|rec12345678901234" }),
  });

  assert.ok(result.error);
  assert.match(result.error.message, /does not match Source Record ID/);
  assert.equal(result.requests.length, 0);
  assert.deepEqual(result.queue.records.get(DAILY_QUEUE_ID).cells.Status, { name: "Ready" });
});

test("079 rejects unknown event types without sending", async () => {
  const result = await run079({
    record: dailyRecord({ eventType: "UNKNOWN", templateKey: "UNKNOWN" }),
  });

  assert.ok(result.error);
  assert.match(result.error.message, /Unknown Email Handoff Queue Event Type/);
  assert.equal(result.requests.length, 0);
  assert.deepEqual(result.queue.records.get(DAILY_QUEUE_ID).cells.Status, { name: "Ready" });
});

test("079 writes failed status and error after a Hub error", async () => {
  const result = await run079({
    record: dailyRecord(),
    response: {
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: "temporary outage" }),
    },
  });

  assert.ok(result.error);
  const row = result.queue.records.get(DAILY_QUEUE_ID);
  assert.equal(row.cells.Status, "Failed");
  assert.equal(row.cells["Attempt Count"], 1);
  assert.match(row.cells["Last Error"], /HTTP 500/);
  assert.equal(result.requests.length, 1);
});

test("079 forwards an accepted duplicate without creating a second delivery", async () => {
  const first = await run079({ record: dailyRecord(), response: acceptedResponse({ duplicate: true }) });
  assert.equal(first.error, null, first.error?.message);
  assert.equal(first.output.values.actionOut, "accepted_duplicate");
  assert.equal(first.requests.length, 1);

  const second = await run079({ record: first.queue.records.get(DAILY_QUEUE_ID), response: acceptedResponse() });
  assert.equal(second.error, null, second.error?.message);
  assert.equal(second.requests.length, 0);
  assert.equal(second.output.values.actionOut, "skipped_not_ready");
});

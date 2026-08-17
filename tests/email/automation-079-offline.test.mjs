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
const SCRIPT_SOURCE = readFileSync(SCRIPT_PATH, "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const WELCOME_QUEUE_ID = "recWelcome07900001";
const DAILY_QUEUE_ID = "recaZyyMx9Tf6zzNU";
const SUBMISSION_ID = "rec58gdymfPKKeVRI";
const FAILED_ZOOM_QUEUE_ID = "recpbXCopQxIvISq5";

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
  status = "Ready",
  attemptCount = 0,
  lastError = "",
}) {
  return new MockRecord(id, {
    Status: { name: status },
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
    "Attempt Count": attemptCount,
    "Last Attempt At": null,
    "Last Error": lastError,
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
      singleSelect("Event Type", [
        "WELCOME",
        "DAILY_SUBMISSION",
        "VIDEO_FEEDBACK",
        "HOMEWORK_FEEDBACK",
        "WEEKLY_ATHLETE_SUMMARY",
        "ZOOM_RECORDING_APPROVAL",
      ]),
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

const VIDEO_QUEUE_ID = "recVideoFbQueue0001";
const VIDEO_FEEDBACK_ID = "recVideoFbSrc0001";
const HOMEWORK_QUEUE_ID = "recHomeworkQ079001";
const HOMEWORK_COMPLETION_ID = "recHomeworkSrc001";
const WEEKLY_QUEUE_ID = "recWeeklyQ07900001";
const WEEKLY_SUMMARY_ID = "recWeeklySrc00001";
const ZOOM_QUEUE_ID = "recZoomQ0790000001";
const ZOOM_ATTENDANCE_ID = "recZoomAttSrc0001";

function videoRecord(overrides = {}) {
  return buildQueueRecord({
    id: VIDEO_QUEUE_ID,
    eventType: "VIDEO_FEEDBACK",
    templateKey: "VIDEO_FEEDBACK",
    handoffKey: `VIDEO_FEEDBACK|VIDEO_FEEDBACK|${VIDEO_FEEDBACK_ID}`,
    sourceTable: "Video Feedback",
    sourceRecordId: VIDEO_FEEDBACK_ID,
    recipients: [{ email: "parent@example.com", role: "guardian" }],
    payload: {
      athleteName: "Test Athlete",
      coachFeedback: "Keep your elbow under the ball.",
      totalVideoXpAwarded: 20,
      videoUrl: "https://example.com/reviewer/file",
    },
    ...overrides,
  });
}

function homeworkRecord(overrides = {}) {
  return buildQueueRecord({
    id: HOMEWORK_QUEUE_ID,
    eventType: "HOMEWORK_FEEDBACK",
    templateKey: "HOMEWORK_FEEDBACK",
    handoffKey: `HOMEWORK_FEEDBACK|HOMEWORK_COMPLETIONS|${HOMEWORK_COMPLETION_ID}`,
    sourceTable: "Homework Completions",
    sourceRecordId: HOMEWORK_COMPLETION_ID,
    recipients: [{ email: "parent@example.com", role: "guardian" }],
    payload: {
      athleteName: "Test Athlete",
      coachFeedback: "Nice form on the free throws.",
      totalHomeworkXpAwarded: 15,
    },
    ...overrides,
  });
}

function weeklyRecord(overrides = {}) {
  return buildQueueRecord({
    id: WEEKLY_QUEUE_ID,
    eventType: "WEEKLY_ATHLETE_SUMMARY",
    templateKey: "WEEKLY_ATHLETE_SUMMARY",
    handoffKey: `WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|${WEEKLY_SUMMARY_ID}`,
    sourceTable: "Weekly Athlete Summary",
    sourceRecordId: WEEKLY_SUMMARY_ID,
    recipients: [{ email: "parent@example.com", role: "guardian" }],
    payload: {
      athleteName: "Test Athlete",
      weekLabel: "Week 3",
      daysLogged: 4,
      shots: 250,
    },
    ...overrides,
  });
}

function zoomRecord(overrides = {}) {
  return buildQueueRecord({
    id: ZOOM_QUEUE_ID,
    eventType: "ZOOM_RECORDING_APPROVAL",
    templateKey: "ZOOM_RECORDING_APPROVED",
    handoffKey: `ZOOM_RECORDING_APPROVAL|ZOOM_ATTENDANCE|${ZOOM_ATTENDANCE_ID}`,
    sourceTable: "Zoom Attendance",
    sourceRecordId: ZOOM_ATTENDANCE_ID,
    recipients: [{ email: "parent@example.com", role: "guardian" }],
    payload: {
      athleteName: "Test Athlete",
      meetingName: "Thursday Recording Quiz",
      approvalResult: "Satisfactory",
      timing: "On Satisfactory",
    },
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
  const remoteFetchAsync = async (_url, request) => {
    requests.push(JSON.parse(request.body));
    return typeof response === "function" ? response(requests.length) : response;
  };
  const fn = new AsyncFunction("base", "input", "output", "console", "remoteFetchAsync", SCRIPT_SOURCE);
  let error = null;
  try {
    await fn(
      base,
      makeInput({ recordId: record.id, ingressSecret: "test-secret" }),
      output,
      capturedConsole,
      remoteFetchAsync
    );
  } catch (caught) {
    error = caught;
  }
  return { base, queue, output, error, requests, console: capturedConsole };
}

test("079 script is v2.3 and never calls Make/Gmail/Resend directly", () => {
  assert.match(SCRIPT_SOURCE, /version:\s*"v2\.3"/);
  assert.match(SCRIPT_SOURCE, /079 – Send to Communications Hub - NEW/);
  assert.match(SCRIPT_SOURCE, /eventZoomRecordingApproval:\s*"ZOOM_RECORDING_APPROVAL"/);
  assert.match(SCRIPT_SOURCE, /templateZoomRecordingApproved:\s*"ZOOM_RECORDING_APPROVED"/);
  assert.doesNotMatch(SCRIPT_SOURCE, /makeWebhookUrl|hook\.us1\.make\.com|resend\.com|api\.resend|gmail\.googleapis/i);
  assert.match(SCRIPT_SOURCE, /Never call Make, Gmail, or Resend directly/);
  assert.match(SCRIPT_SOURCE, /communications-two-blue\.vercel\.app\/api\/events\/ingest/);
});

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

test("079 dispatches VIDEO_FEEDBACK using stored event, recipients, payload, and source IDs", async () => {
  const record = videoRecord();
  const result = await run079({ record });

  assert.equal(result.error, null, result.error?.message);
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].eventType, "VIDEO_FEEDBACK");
  assert.equal(result.requests[0].templateKey, "VIDEO_FEEDBACK");
  assert.equal(result.requests[0].handoffKey, `VIDEO_FEEDBACK|VIDEO_FEEDBACK|${VIDEO_FEEDBACK_ID}`);
  assert.deepEqual(result.requests[0].source, {
    table: "Video Feedback",
    recordId: VIDEO_FEEDBACK_ID,
  });
  assert.equal(result.requests[0].data.coachFeedback, "Keep your elbow under the ball.");
  assert.equal(result.queue.records.get(VIDEO_QUEUE_ID).cells.Status, "Accepted");
});

test("079 requires the exact VIDEO_FEEDBACK handoff key format", async () => {
  const result = await run079({
    record: videoRecord({ handoffKey: `VIDEO_FEEDBACK|VIDEO_FEEDBACK|${VIDEO_FEEDBACK_ID}|extra` }),
  });

  assert.ok(result.error);
  assert.match(result.error.message, /Invalid VIDEO_FEEDBACK Handoff Key/);
  assert.equal(result.requests.length, 0);
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

test("079 rejects obsolete Event Type ZOOM_RECORDING_APPROVED", async () => {
  const result = await run079({
    record: zoomRecord({
      eventType: "ZOOM_RECORDING_APPROVED",
      handoffKey: `ZOOM_RECORDING_APPROVED|ZOOM_ATTENDANCE|${ZOOM_ATTENDANCE_ID}`,
    }),
  });

  assert.ok(result.error);
  assert.match(result.error.message, /Unknown Email Handoff Queue Event Type|Missing option "ZOOM_RECORDING_APPROVED"/);
  assert.equal(result.requests.length, 0);
});

test("079 dispatches HOMEWORK_FEEDBACK using stored event, recipients, payload, and source IDs", async () => {
  const record = homeworkRecord();
  const result = await run079({ record });

  assert.equal(result.error, null, result.error?.message);
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].eventType, "HOMEWORK_FEEDBACK");
  assert.equal(result.requests[0].templateKey, "HOMEWORK_FEEDBACK");
  assert.equal(result.requests[0].handoffKey, `HOMEWORK_FEEDBACK|HOMEWORK_COMPLETIONS|${HOMEWORK_COMPLETION_ID}`);
  assert.deepEqual(result.requests[0].source, {
    table: "Homework Completions",
    recordId: HOMEWORK_COMPLETION_ID,
  });
  assert.equal(result.requests[0].data.totalHomeworkXpAwarded, 15);
  assert.equal(result.queue.records.get(HOMEWORK_QUEUE_ID).cells.Status, "Accepted");
});

test("079 requires the exact HOMEWORK_FEEDBACK handoff key format", async () => {
  const result = await run079({
    record: homeworkRecord({ handoffKey: `HOMEWORK_FEEDBACK|HOMEWORK_COMPLETIONS|${HOMEWORK_COMPLETION_ID}|extra` }),
  });

  assert.ok(result.error);
  assert.match(result.error.message, /Invalid HOMEWORK_FEEDBACK Handoff Key/);
  assert.equal(result.requests.length, 0);
});

test("079 rejects HOMEWORK_FEEDBACK payload missing XP", async () => {
  const result = await run079({
    record: homeworkRecord({
      payload: { athleteName: "Test Athlete", coachFeedback: "Good work." },
    }),
  });

  assert.ok(result.error);
  assert.match(result.error.message, /totalHomeworkXpAwarded \(or totalXp\)/);
  assert.equal(result.requests.length, 0);
});

test("079 dispatches WEEKLY_ATHLETE_SUMMARY using stored event and week label", async () => {
  const record = weeklyRecord();
  const result = await run079({ record });

  assert.equal(result.error, null, result.error?.message);
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].eventType, "WEEKLY_ATHLETE_SUMMARY");
  assert.equal(result.requests[0].templateKey, "WEEKLY_ATHLETE_SUMMARY");
  assert.equal(result.requests[0].handoffKey, `WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|${WEEKLY_SUMMARY_ID}`);
  assert.equal(result.requests[0].data.weekLabel, "Week 3");
  assert.equal(result.queue.records.get(WEEKLY_QUEUE_ID).cells.Status, "Accepted");
});

test("079 accepts WEEKLY_ATHLETE_SUMMARY with weekName instead of weekLabel", async () => {
  const result = await run079({
    record: weeklyRecord({
      payload: { athleteName: "Test Athlete", weekName: "Week 4" },
    }),
  });

  assert.equal(result.error, null, result.error?.message);
  assert.equal(result.requests[0].data.weekName, "Week 4");
});

test("079 accepts ZOOM_RECORDING_APPROVAL Event Type with ZOOM_RECORDING_APPROVED Template Key", async () => {
  const record = zoomRecord({
    payload: {
      athleteName: "Test Athlete",
      meetingName: "Thursday Recording Quiz",
      approvalResult: "Satisfactory",
      recordingUrl: "https://zoom.us/rec/share/abc",
    },
  });
  const result = await run079({ record });

  assert.equal(result.error, null, result.error?.message);
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].eventType, "ZOOM_RECORDING_APPROVAL");
  assert.equal(result.requests[0].templateKey, "ZOOM_RECORDING_APPROVED");
  assert.equal(result.requests[0].handoffKey, `ZOOM_RECORDING_APPROVAL|ZOOM_ATTENDANCE|${ZOOM_ATTENDANCE_ID}`);
  assert.equal(result.requests[0].data.meetingName, "Thursday Recording Quiz");
  assert.equal(result.requests[0].data.recordingUrl, "https://zoom.us/rec/share/abc");
  assert.equal(result.requests[0].testMode, true);
  assert.equal(result.queue.records.get(ZOOM_QUEUE_ID).cells.Status, "Accepted");
});

test("079 accepts ZOOM_RECORDING_APPROVAL without a recording link", async () => {
  const result = await run079({ record: zoomRecord() });

  assert.equal(result.error, null, result.error?.message);
  assert.equal(result.requests[0].eventType, "ZOOM_RECORDING_APPROVAL");
  assert.equal(result.requests[0].templateKey, "ZOOM_RECORDING_APPROVED");
  assert.equal(result.requests[0].data.recordingUrl, undefined);
});

test("079 requires ZOOM_RECORDING_APPROVAL key suffix to match Source Record ID", async () => {
  const result = await run079({
    record: zoomRecord({ handoffKey: "ZOOM_RECORDING_APPROVAL|ZOOM_ATTENDANCE|rec12345678901234" }),
  });

  assert.ok(result.error);
  assert.match(result.error.message, /does not match Source Record ID/);
  assert.equal(result.requests.length, 0);
});

test("079 rejects ZOOM_RECORDING_APPROVAL when Template Key is wrong", async () => {
  const result = await run079({
    record: zoomRecord({ templateKey: "ZOOM_RECORDING_APPROVAL" }),
  });

  assert.ok(result.error);
  assert.match(result.error.message, /Template Key must be ZOOM_RECORDING_APPROVED/);
  assert.equal(result.requests.length, 0);
});

test("079 retries a failed Zoom queue row after Event Type contract correction", async () => {
  const armed = buildQueueRecord({
    id: FAILED_ZOOM_QUEUE_ID,
    eventType: "ZOOM_RECORDING_APPROVAL",
    templateKey: "ZOOM_RECORDING_APPROVED",
    handoffKey: `ZOOM_RECORDING_APPROVAL|ZOOM_ATTENDANCE|${ZOOM_ATTENDANCE_ID}`,
    sourceTable: "Zoom Attendance",
    sourceRecordId: ZOOM_ATTENDANCE_ID,
    recipients: [{ email: "parent@example.com", role: "guardian" }],
    payload: {
      athleteName: "Test Athlete",
      meetingName: "Thursday Recording Quiz",
      approvalResult: "Satisfactory",
    },
    status: "Ready",
    attemptCount: 1,
    lastError: 'Missing option "ZOOM_RECORDING_APPROVED" in Email Handoff Queue.Event Type',
  });
  const result = await run079({ record: armed });

  assert.equal(result.error, null, result.error?.message);
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].eventType, "ZOOM_RECORDING_APPROVAL");
  assert.equal(result.requests[0].templateKey, "ZOOM_RECORDING_APPROVED");
  assert.equal(result.queue.records.get(FAILED_ZOOM_QUEUE_ID).cells.Status, "Accepted");
  assert.equal(result.queue.records.get(FAILED_ZOOM_QUEUE_ID).cells["Attempt Count"], 2);
  assert.equal(result.output.values.actionOut, "accepted_new");
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

test("079 same-request Zoom replay returns existing Accepted result without a second Hub POST", async () => {
  const first = await run079({ record: zoomRecord() });
  assert.equal(first.error, null, first.error?.message);
  assert.equal(first.output.values.actionOut, "accepted_new");

  const second = await run079({
    record: first.queue.records.get(ZOOM_QUEUE_ID),
    response: acceptedResponse({ duplicate: true }),
  });
  assert.equal(second.error, null, second.error?.message);
  assert.equal(second.requests.length, 0);
  assert.equal(second.output.values.actionOut, "skipped_not_ready");
});

test("079 preserves testMode true on Zoom Hub payload", async () => {
  const result = await run079({ record: zoomRecord() });
  assert.equal(result.error, null, result.error?.message);
  assert.equal(result.requests[0].testMode, true);
});

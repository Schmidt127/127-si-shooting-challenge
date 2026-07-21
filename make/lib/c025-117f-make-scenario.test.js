/**
 * Offline tests for C-025 117f DEV Make scenario helpers.
 * Run: node make/lib/c025-117f-make-scenario.test.js
 */

const fs = require("fs");
const path = require("path");
const m = require("./c025-117f-make-scenario");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const ENROLL = "recEnrollTest00001";
const MEETING = "recMeetingTest0001";
const ZA = "recZoomAttend00001";
const SEND_KEY = `ZOOM_REC_EMAIL|${ENROLL}|${MEETING}|${ZA}`;

/** Synthetic Mike-controlled inbox for offline tests only — not a parent address. */
const MIKE_TEST_INBOX = "mike-c025-117f-test@127si.invalid";

const basePayload = {
  automationNumber: "117f",
  templateKey: "ZOOM_RECORDING_APPROVED",
  sendKey: SEND_KEY,
  enrollmentRid: ENROLL,
  zoomMeetingRid: MEETING,
  zoomAttendanceId: ZA,
  timing: "On Satisfactory",
};

const goodZa = {
  attendanceMethod: "Recording Quiz",
  satisfactory: true,
  conflict: 0,
  enrollmentLink: [{ id: ENROLL }],
  zoomMeetingLink: [{ id: MEETING }],
  xpAmountText: "30",
};

const goodEnrollment = {
  parentEmailCleaned: "parent-should-never-receive@example.com",
  parentEmail: "parent-fallback@example.com",
  parentFirstName: "Alex",
  athleteName: "Test Athlete",
};

const goodMeeting = {
  meetingName: "DEV Recording Quiz Meeting",
  startTimeText: "2026-07-18 6:00 PM MDT",
};

test("reject wrong automationNumber", () => {
  const r = m.validateInboundPayload({ ...basePayload, automationNumber: "117" });
  assert(!r.ok && r.httpStatus === 400, "400");
});

test("reject wrong templateKey", () => {
  const r = m.validateInboundPayload({ ...basePayload, templateKey: "OTHER" });
  assert(!r.ok && r.httpStatus === 400, "400");
});

test("reject sendKey without ZOOM_REC_EMAIL| prefix", () => {
  const r = m.validateInboundPayload({
    ...basePayload,
    sendKey: `ZOOM_REC_APPROVAL|${ENROLL}|${MEETING}`,
  });
  assert(!r.ok, "reject approval prefix");
});

test("reject missing record ids", () => {
  const r = m.validateInboundPayload({ ...basePayload, enrollmentRid: "" });
  assert(!r.ok && r.httpStatus === 400, "missing enroll");
});

test("accept valid inbound payload", () => {
  const r = m.validateInboundPayload(basePayload);
  assert(r.ok && r.normalized.sendKey === SEND_KEY, "ok");
});

test("Data Store duplicate skips Gmail and returns 200", () => {
  const ds = m.evaluateDataStoreLookup({
    sendKey: SEND_KEY,
    existingRecord: { sendKey: SEND_KEY, status: "sent" },
  });
  assert(ds.duplicate && ds.skipGmail && ds.httpStatus === 200, "dup");
  assert(ds.body.status === "already_sent", "status");
});

test("revalidate fails on conflict = 1", () => {
  const r = m.revalidateAirtableRecords({
    payload: basePayload,
    zoomAttendance: { ...goodZa, conflict: 1 },
    enrollment: goodEnrollment,
    zoomMeeting: goodMeeting,
  });
  assert(!r.ok && r.conflict === true, "conflict");
});

test("revalidate fails on relationship mismatch", () => {
  const r = m.revalidateAirtableRecords({
    payload: basePayload,
    zoomAttendance: { ...goodZa, enrollmentLink: [{ id: "recOtherEnroll0001" }] },
    enrollment: goodEnrollment,
    zoomMeeting: goodMeeting,
  });
  assert(!r.ok, "mismatch");
});

test("test mode uses only Mike test inbox — never parent", () => {
  const r = m.resolveRecipient({
    sendMode: "test",
    testRecipientEmail: MIKE_TEST_INBOX,
    parentEmailCleaned: "parent-should-never-receive@example.com",
    parentEmail: "parent-fallback@example.com",
  });
  assert(r.ok && r.toEmail === MIKE_TEST_INBOX, "test to");
  assert(r.usedParentAddress === false, "no parent");
});

test("test mode rejects placeholder recipient", () => {
  const r = m.resolveRecipient({
    sendMode: "test",
    testRecipientEmail: m.REDACTED_MIKE_TEST_INBOX_PLACEHOLDER,
  });
  assert(!r.ok && r.httpStatus === 400, "placeholder blocked");
});

test("live mode missing recipient → non-2xx", () => {
  const r = m.resolveRecipient({
    sendMode: "live",
    parentEmailCleaned: "",
    parentEmail: "",
  });
  assert(!r.ok && r.httpStatus === 422, "missing");
});

test("live mode prefers Parent Email - Cleaned", () => {
  const r = m.resolveRecipient({
    sendMode: "live",
    parentEmailCleaned: "cleaned@example.com",
    parentEmail: "raw@example.com",
  });
  assert(r.ok && r.toEmail === "cleaned@example.com", "cleaned");
});

test("branded subject and HTML structure", () => {
  const subject = m.buildSubject("Test Athlete");
  assert(subject === "Zoom Recording Quiz Approved for Test Athlete", "subject");
  const html = m.buildApprovalEmailHtml({
    parentFirstName: "Alex",
    athleteName: "Test Athlete",
    meetingName: "Meeting A",
    meetingStartText: "2026-07-18",
    timing: "On Satisfactory",
    xpAmountText: "30",
    sendMode: "test",
    intendedLiveRecipient: "parent-should-never-receive@example.com",
  });
  assert(html.includes("127 Sports Intensity"), "brand");
  assert(html.includes("#0034B7"), "blue");
  assert(html.includes("#FF8B00"), "orange");
  assert(html.includes("Zoom Recording Quiz Approved"), "title");
  assert(html.includes("TEST MODE"), "test banner");
  assert(html.includes("Coach Mike"), "signoff");
  assert(html.includes(m.BRAND.logoUrl), "logo");
});

test("simulate happy path: Gmail to test inbox only; DS write; HTTP 200", () => {
  const r = m.simulateMakeScenario({
    payload: basePayload,
    zoomAttendance: goodZa,
    enrollment: goodEnrollment,
    zoomMeeting: goodMeeting,
    sendMode: "test",
    testRecipientEmail: MIKE_TEST_INBOX,
    gmailSucceeds: true,
  });
  assert(r.ok && r.httpStatus === 200 && r.body.status === "sent", "sent");
  assert(r.toEmail === MIKE_TEST_INBOX, "test inbox");
  assert(r.usedParentAddress === false, "not parent");
  assert(r.dataStoreWrite && r.dataStoreWrite.key === SEND_KEY, "ds");
  assert(r.gmailAttempted === true, "gmail");
});

test("simulate duplicate: skip Gmail, HTTP 200 already_sent", () => {
  const r = m.simulateMakeScenario({
    payload: basePayload,
    dataStoreRecord: { sendKey: SEND_KEY, status: "sent" },
    zoomAttendance: goodZa,
    enrollment: goodEnrollment,
    zoomMeeting: goodMeeting,
    sendMode: "test",
    testRecipientEmail: MIKE_TEST_INBOX,
  });
  assert(r.ok && r.duplicate && r.body.status === "already_sent", "dup");
  assert(r.gmailAttempted === false, "no gmail");
  assert(r.dataStoreWrite == null, "no ds write");
});

test("simulate Gmail failure: 502, no Data Store write", () => {
  const r = m.simulateMakeScenario({
    payload: basePayload,
    zoomAttendance: goodZa,
    enrollment: goodEnrollment,
    zoomMeeting: goodMeeting,
    sendMode: "test",
    testRecipientEmail: MIKE_TEST_INBOX,
    gmailSucceeds: false,
  });
  assert(!r.ok && r.httpStatus === 502, "502");
  assert(r.dataStoreWrite == null, "no ds");
});

test("blueprint template has no webhook URL secret", () => {
  const bpPath = path.join(
    __dirname,
    "..",
    "blueprints",
    "c025-117f-zoom-recording-approval-email-dev-v1.template.json"
  );
  const raw = fs.readFileSync(bpPath, "utf8");
  assert(!/https?:\/\/hook\./i.test(raw), "no hook host");
  assert(!/make\.com\/[^\s"]*hook/i.test(raw), "no make hook path");
  assert(raw.includes("REPLACE_WITH_MIKE_CONTROLLED_TEST_INBOX"), "placeholder");
  assert(raw.includes("appTetnuCZlCZdTCT"), "DEV base");
  const bp = JSON.parse(raw);
  assert(bp.c025.environment === "DEV", "DEV");
  assert(bp.c025.containsOperationalSecrets === false, "no secrets flag");
});

test("sample payload shape matches contract (placeholder ids allowed in file)", () => {
  const sample = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "test-payloads", "c025-117f-zoom-recording-approved.sample.json"),
      "utf8"
    )
  );
  assert(sample.automationNumber === "117f", "auto");
  assert(sample.templateKey === "ZOOM_RECORDING_APPROVED", "tmpl");
  assert(String(sample.sendKey).startsWith("ZOOM_REC_EMAIL|"), "key");
  assert(!JSON.stringify(sample).includes("hook."), "no webhook in sample");
});

console.log("\nAll c025-117f-make-scenario tests passed.");

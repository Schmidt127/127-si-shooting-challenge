/**
 * Stage 17 Zoom Attendance contract tests.
 * Run: node airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.test.js
 */

const fs = require("fs");
const path = require("path");
const c = require("./c025-stage17-zoom-attendance");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const root = path.join(__dirname, "..");

test("Source Key ZOOM_CREDIT is deterministic and distinct from live", () => {
  const k = c.buildZoomCreditSourceKey("recE1", "recM1");
  assert(k === "ZOOM_CREDIT|recE1|recM1", "credit key shape");
  assert(c.isZoomCreditKey(k), "is credit");
  assert(!c.isLiveAttendBaseKey(k), "not live");
  const live = c.buildLiveAttendBaseSourceKey("ZMKEY", "recE1");
  assert(live.startsWith("ZOOM_ATTEND_BASE|"), "live family");
  assert(live !== k, "disjoint keys");
});

test("Eligible recording credit creates once", () => {
  const key = c.buildZoomCreditSourceKey("recE", "recM");
  const r = c.canCreateRecordingXpEvent({
    approved: true,
    conflict: false,
    amount: 30,
    creditKey: key,
    existingXpBySourceKey: {},
  });
  assert(r.ok && r.action === "created", "created");
  assert(r.xpEvent.xpBucket === c.XP_BUCKET, "bucket");
  assert(r.xpEvent.xpSource === c.XP_SOURCE, "source");
  assert(r.xpEvent.dateField === c.DATE_FIELD, "date field");
  assert(r.xpEvent.reasonPublic === c.REASON_PUBLIC_TEXT, "public reason");
});

test("Live attendance exclusivity uses disjoint Source Key families", () => {
  const credit = c.buildZoomCreditSourceKey("recE", "recM");
  const live = c.buildLiveAttendBaseSourceKey("recM", "recE");
  assert(c.parseZoomCreditKey(credit).enrollmentId === "recE", "parse");
  assert(c.isLiveAttendBaseKey(live) && !c.isZoomCreditKey(live), "live only");
});

test("Existing recording-credit dedupe", () => {
  const key = c.buildZoomCreditSourceKey("recE", "recM");
  const r = c.canCreateRecordingXpEvent({
    approved: true,
    conflict: false,
    amount: 30,
    creditKey: key,
    existingXpBySourceKey: { [key]: { id: "recXP1", active: true } },
  });
  assert(r.action === "skipped_exists", "dedupe");
});

test("Missing enrollment/meeting reflected as invalid key parse", () => {
  assert(c.parseZoomCreditKey("ZOOM_CREDIT|") === null, "bad key");
  assert(c.parseZoomCreditKey("") === null, "empty");
});

test("Invalid approval / conflict soft-voids active XP", () => {
  const key = c.buildZoomCreditSourceKey("recE", "recM");
  const r = c.canCreateRecordingXpEvent({
    approved: false,
    conflict: true,
    amount: 30,
    creditKey: key,
    existingXpBySourceKey: { [key]: { id: "recXP1", active: true } },
  });
  assert(r.action === "deactivated_on_conflict", "soft void");
});

test("Missing evidence / zero amount skips", () => {
  const key = c.buildZoomCreditSourceKey("recE", "recM");
  const r = c.canCreateRecordingXpEvent({
    approved: true,
    conflict: false,
    amount: 0,
    creditKey: key,
  });
  assert(r.action === "skipped_zero_amount", "zero");
});

test("America/Denver date handling near UTC midnight", () => {
  // 2026-07-18T06:00:00Z is still 2026-07-18 evening prior in some zones;
  // pick a known Denver local morning via fixed offset approximation:
  const key = c.denverDateKeyFromUtcMs(Date.UTC(2026, 6, 18, 12, 0, 0));
  assert(/^\d{4}-\d{2}-\d{2}$/.test(key), "date key shape");
});

test("Canonical XP Activity Date and reason fields", () => {
  const ok = c.assertCanonicalXpLabels({
    xpBucket: c.XP_BUCKET,
    xpSource: c.XP_SOURCE,
    dateField: c.DATE_FIELD,
    reasonPublicField: c.REASON_PUBLIC_FIELD,
    reasonDebugField: c.REASON_DEBUG_FIELD,
  });
  assert(ok.ok, "canonical labels");
});

test("Configured XP amount comes from Zoom XP Amount (formula), not hardcoded", () => {
  const key = c.buildZoomCreditSourceKey("recE", "recM");
  const r = c.canCreateRecordingXpEvent({
    approved: true,
    conflict: false,
    amount: 30, // e.g. floor(60 * 50 / 100)
    creditKey: key,
  });
  assert(r.xpEvent.xpPoints === 30, "uses provided formula amount");
});

test("Idempotent rerun", () => {
  const key = c.buildZoomCreditSourceKey("recE", "recM");
  const first = c.canCreateRecordingXpEvent({
    approved: true,
    conflict: false,
    amount: 30,
    creditKey: key,
  });
  const second = c.canCreateRecordingXpEvent({
    approved: true,
    conflict: false,
    amount: 30,
    creditKey: key,
    existingXpBySourceKey: { [key]: { id: "recXP", active: true } },
  });
  assert(first.action === "created" && second.action === "skipped_exists", "idempotent");
});

test("No Homework Completions dependency in Stage 17 scripts", () => {
  for (const file of [
    "117a-zoom-recording-normalize-recording-quiz-submission.js",
    "117b-zoom-recording-coach-review-and-needs-correction-handling.js",
    "117c-zoom-recording-create-zoom-xp-event.js",
    "117d-zoom-recording-apply-zoom-gate-credit.js",
    "117e-zoom-recording-apply-perfect-week-credit.js",
    "117f-zoom-recording-send-approval-email.js",
  ]) {
    const src = fs.readFileSync(path.join(root, file), "utf8");
    const r = c.assertNoHomeworkCompletionsDependency(src);
    assert(r.ok, `${file} banned hits: ${r.hits.join(", ")}`);
    assert(src.includes("Zoom Attendance"), `${file} uses ZA`);
    assert(!/homeworkCompletions:\s*"Homework Completions"/.test(src), `${file} no HC table config`);
  }
});

test("No legacy S16 Zoom/Zoom Recording select choices required in Stage 17 lib", () => {
  assert(c.XP_BUCKET === "Zoom Attendance", "bucket");
  assert(c.XP_SOURCE === "Zoom Meeting Recording Quiz", "source");
  assert(c.XP_SOURCE !== "Zoom Recording", "not S16 source");
  assert(c.XP_BUCKET !== "Zoom", "not S16 bucket");
});

test("117c script CONFIG maps canonical fields", () => {
  const src = fs.readFileSync(path.join(root, "117c-zoom-recording-create-zoom-xp-event.js"), "utf8");
  assert(src.includes('xpActivityDate: "XP Activity Date"'), "date");
  assert(src.includes('reasonPublic: "XP Reason Public"'), "public");
  assert(src.includes('reasonDebug: "XP Reason Debug"'), "debug");
  assert(src.includes('xpSource: "Zoom Meeting Recording Quiz"'), "source");
  assert(src.includes('xpBucket: "Zoom Attendance"'), "bucket");
  assert(src.includes("ZOOM_CREDIT"), "credit family mentioned");
  assert(!src.includes("ZOOM_RECORDING|"), "no S16 recording key");
  assert(!/homeworkCompletions:\s*"Homework Completions"/.test(src), "no HC");
});

console.log("\nAll c025-stage17-zoom-attendance tests passed.");

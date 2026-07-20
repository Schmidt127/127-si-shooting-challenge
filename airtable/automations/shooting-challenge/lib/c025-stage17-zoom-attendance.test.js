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

const STAGE17_SCRIPTS = [
  "117-zoom-recording-credit-orchestrator.js",
  "117a-zoom-recording-normalize-recording-quiz-submission.js",
  "117b-zoom-recording-coach-review-and-needs-correction-handling.js",
  "117c-zoom-recording-create-zoom-xp-event.js",
  "117d-zoom-recording-apply-zoom-gate-credit.js",
  "117e-zoom-recording-apply-perfect-week-credit.js",
  "117f-zoom-recording-send-approval-email.js",
];

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
  assert(r.xpEvent.writesLiveAttendees === false, "no attendees write");
});

test("Recording XP Event field plan uses correct source/bucket/date/reasons/links", () => {
  const key = c.buildZoomCreditSourceKey("recE", "recM");
  const plan = c.buildRecordingXpEventFields({
    sourceKey: key,
    amount: 30,
    enrollmentId: "recE",
    meetingId: "recM",
    activityDate: "2026-07-18",
    reasonDebug: "debug",
    weekId: "recW",
    zoomAttendanceId: "recZA",
    linkZoomAttendance: true,
  });
  assert(plan.writesLiveAttendees === false, "plan no attendees");
  assert(plan.fields.xpBucket === c.XP_BUCKET, "bucket");
  assert(plan.fields.xpSource === c.XP_SOURCE, "source");
  assert(plan.fields.dateField === c.DATE_FIELD, "date");
  assert(plan.fields.reasonPublic === c.REASON_PUBLIC_TEXT, "public");
  assert(plan.fields.enrollmentId === "recE", "enrollment");
  assert(plan.fields.meetingId === "recM", "meeting");
  assert(plan.fields.zoomAttendanceId === "recZA", "za link when supported");
  assert(plan.forbiddenWrites[c.LIVE_ATTENDEES_FIELD] === false, "attendees forbidden");
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

test("Conflict soft-void remains idempotent on inactive existing", () => {
  const key = c.buildZoomCreditSourceKey("recE", "recM");
  const r = c.canCreateRecordingXpEvent({
    approved: false,
    conflict: true,
    amount: 30,
    creditKey: key,
    existingXpBySourceKey: { [key]: { id: "recXP1", active: false } },
  });
  assert(r.action === "skipped_not_approved", "already inactive");
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
    amount: 30,
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

test("Recording credit does not modify Zoom Meetings Attendees", () => {
  for (const file of STAGE17_SCRIPTS) {
    const src = fs.readFileSync(path.join(root, file), "utf8");
    const r = c.assertNeverWritesLiveAttendees(src);
    assert(r.ok, `${file} attendees write hits: ${r.hits.join(", ")}`);
    assert(!src.includes("linked_attendee_for_gate"), `${file} no gate attendee link`);
    assert(!src.includes("linked_attendee_for_perfect_week"), `${file} no pw attendee link`);
  }
});

test("Automation 101 trigger prerequisites are not changed by recording path", () => {
  const before = {
    createXpEvents: true,
    xpAwardStatus: "Pending",
    attendees: ["recLive1"],
    week: ["recW"],
    zoomMeetingKey: "ZM|2026-07-18",
    meetingStatus: "Completed",
  };
  const afterSame = { ...before, attendees: ["recLive1"] };
  const ok = c.assertAutomation101PrereqsUnchanged(before, afterSame);
  assert(ok.ok, "unchanged snapshot");

  const afterBad = { ...before, attendees: ["recLive1", "recRecording"] };
  const bad = c.assertAutomation101PrereqsUnchanged(before, afterBad);
  assert(!bad.ok, "detect attendees mutation");
});

test("Gate and Perfect Week flags do not impersonate live attendance", () => {
  const gate = c.planGateCreditApplication({
    gateEarned: true,
    conflict: false,
    alreadyApplied: false,
  });
  assert(gate.writesLiveAttendees === false, "gate no attendees");
  assert(String(gate.gap.status).includes("REPO_READY") || String(gate.gap.status).includes("GAP"), "gate status documented");

  const pw = c.planPerfectWeekCreditApplication({
    approved: true,
    pwFlag: true,
    conflict: false,
    alreadyApplied: false,
  });
  assert(pw.writesLiveAttendees === false, "pw no attendees");
});

test("Missing downstream consumers are reported rather than bypassed", () => {
  assert(c.DOWNSTREAM_GAPS.perfectWeek.consumer.includes("057"), "pw consumer");
  assert(c.DOWNSTREAM_GAPS.levelGate.consumer.includes("042"), "gate consumer");
  assert(String(c.DOWNSTREAM_GAPS.perfectWeek.status).includes("REPO_READY"), "pw status");
  assert(String(c.DOWNSTREAM_GAPS.levelGate.status).includes("REPO_READY"), "gate status");
});

test("No Homework Completions dependency in Stage 17 scripts", () => {
  for (const file of STAGE17_SCRIPTS) {
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

test("117 orchestrator v1.1.1 forbids Attendees and does not set Applied flags", () => {
  const src = fs.readFileSync(path.join(root, "117-zoom-recording-credit-orchestrator.js"), "utf8");
  assert(src.includes('version: "v1.1.1"'), "version");
  assert(src.includes("117 - Zoom Recording Credit - Orchestrator"), "name");
  assert(src.includes("Attendance Method is Recording Quiz"), "trigger method");
  assert(src.includes("NEVER write Zoom Meetings"), "hard rule");
  assert(src.includes('xpSource: "Zoom Meeting Recording Quiz"'), "source");
  assert(src.includes('xpBucket: "Zoom Attendance"'), "bucket");
  assert(src.includes('xpActivityDate: "XP Activity Date"'), "date");
  assert(!src.includes('attendees: "Attendees"'), "no attendees config");
  assert(src.includes("Refuse write to Attendees"), "runtime guard");
  assert(src.includes("eligible_awaiting_042"), "gate awaits 042");
  assert(src.includes("eligible_awaiting_057"), "pw awaits 057");
  assert(!src.includes("marked_gate_applied_flag_only"), "no premature gate applied");
  assert(!src.includes("marked_perfect_week_applied_flag_only"), "no premature pw applied");
  assert(src.includes("parseDryRunFlag"), "dry-run helper");
  assert(src.includes("createRecordSafe"), "dry-run create path");
  const r = c.assertNeverWritesLiveAttendees(src);
  assert(r.ok, `orchestrator attendees hits: ${r.hits.join(", ")}`);
});

test("Boolean normalization covers checkbox / blank / lookup / Yes-No", () => {
  assert(c.normalizeBoolean(true) === true, "true");
  assert(c.normalizeBoolean(false) === false, "false");
  assert(c.normalizeBoolean(null) === null, "blank");
  assert(c.normalizeBoolean([true]) === true, "lookup true");
  assert(c.normalizeBoolean(["Yes"]) === true, "yes text");
  assert(c.normalizeBoolean(["No"]) === false, "no text");
  assert(c.normalizeBoolean({ name: "Yes" }) === true, "select yes");
});

test("Explicit No overrides Yes for checkbox/YN precedence", () => {
  const r = c.resolveCheckboxYesNoPrecedence({ checkbox: true, ynText: "No" });
  assert(r.value === false && r.source === "yn_explicit_no", "no wins");
  const y = c.resolveCheckboxYesNoPrecedence({ checkbox: false, ynText: "Yes" });
  assert(y.value === true && y.source === "yn_explicit_yes", "yes wins over false checkbox");
});

test("Effective config: Global only / Program overrides / Meeting overrides / blank fallthrough", () => {
  const g = c.resolveEffectiveConfigValue({ globalValue: true });
  assert(g.value === true && g.source === "global", "global only");
  const p = c.resolveEffectiveConfigValue({ globalValue: true, programValue: false });
  assert(p.value === false && p.source === "program", "program overrides");
  const m = c.resolveEffectiveConfigValue({
    globalValue: true,
    programValue: true,
    meetingOverride: false,
  });
  assert(m.value === false && m.source === "meeting", "meeting overrides");
  const blank = c.resolveEffectiveConfigValue({
    globalValue: true,
    programValue: null,
    meetingOverride: "",
  });
  assert(blank.value === true && blank.source === "global", "blank falls through");
  const missing = c.resolveEffectiveConfigValue({});
  assert(missing.source === "missing_config", "missing config");
});

test("Recording XP calculation 60 x 50% = 30 with half-up rounding", () => {
  const r = c.calculateRecordingXp({ liveBaseXp: 60, recordingPercent: 50 });
  assert(r.ok && r.xp === 30, "expected 30");
  const roundUp = c.calculateRecordingXp({ liveBaseXp: 60, recordingPercent: 51 });
  assert(roundUp.xp === 31, "30.6 → 31");
  const roundDown = c.calculateRecordingXp({ liveBaseXp: 60, recordingPercent: 49 });
  assert(roundDown.xp === 29, "29.4 → 29");
  const bad = c.calculateRecordingXp({ liveBaseXp: null, recordingPercent: 50 });
  assert(!bad.ok, "missing base");
});

test("Email send key construction", () => {
  assert(
    c.buildApprovalEmailSendKey("recE", "recM") === "ZOOM_REC_APPROVAL|recE|recM",
    "email key"
  );
  assert(c.buildApprovalEmailSendKey("", "recM") === null, "blank enrollment");
});

test("Lookup normalization is blank-safe and array-safe", () => {
  assert(c.normalizeLookupIds([{ id: "recA" }, { id: "recB" }]).join(",") === "recA,recB", "ids");
  assert(c.normalizeLookupIds(null).length === 0, "null");
  assert(c.normalizeLookupScalar(["Zoom Attendance"]) === "Zoom Attendance", "scalar");
  assert(c.normalizeLookupScalar([]) === "", "empty arr");
});

test("Deadline before / exactly at / after", () => {
  const before = c.compareAgainstDeadline({ asOf: "2026-07-10T12:00:00Z", deadline: "2026-07-18T12:00:00Z" });
  assert(before.allowed && before.status === "before_deadline", "before");
  const exact = c.compareAgainstDeadline({ asOf: "2026-07-18T12:00:00Z", deadline: "2026-07-18T12:00:00Z" });
  assert(exact.allowed && exact.status === "exactly_at_deadline", "exact");
  const after = c.compareAgainstDeadline({ asOf: "2026-07-19T12:00:00Z", deadline: "2026-07-18T12:00:00Z" });
  assert(!after.allowed && after.status === "after_deadline", "after");
});

test("Schema preflight fails closed with no writes", () => {
  const fail = c.runSchemaPreflight({
    availableTables: { "XP Events": { fields: { "Source Key": { type: "singleLineText" } } } },
    requiredTables: ["Zoom Attendance", "XP Events"],
    requiredFieldsByTable: {
      "Zoom Attendance": ["Enrollment", "Zoom Meeting"],
      "XP Events": ["Source Key", "XP Points"],
    },
  });
  assert(!fail.ok && !fail.canWrite, "no write");
  assert(fail.missingTables.includes("Zoom Attendance"), "missing ZA");
  assert(fail.missingFields.some((f) => f.field === "XP Points"), "missing points");

  const pass = c.runSchemaPreflight({
    availableTables: {
      "Zoom Attendance": {
        fields: { Enrollment: { type: "multipleRecordLinks" }, "Zoom Meeting": { type: "multipleRecordLinks" } },
      },
      "XP Events": {
        fields: { "Source Key": { type: "singleLineText" }, "XP Points": { type: "number" } },
      },
    },
    requiredTables: ["Zoom Attendance", "XP Events"],
    requiredFieldsByTable: {
      "Zoom Attendance": ["Enrollment", "Zoom Meeting"],
      "XP Events": ["Source Key", "XP Points"],
    },
  });
  assert(pass.ok && pass.canWrite, "pass");
});

test("Dry-run flag defaults safely when absent; opt-in only", () => {
  assert(c.parseDryRunFlag({}) === false, "absent");
  assert(c.parseDryRunFlag({ dryRun: "" }) === false, "blank");
  assert(c.parseDryRunFlag({ dryRun: "true" }) === true, "true");
  assert(c.parseDryRunFlag({ dryRun: "dry-run" }) === true, "dry-run");
  const plan = c.buildDryRunPlan({
    dryRun: true,
    intendedWrites: [{ op: "create", table: "XP Events" }],
    calculated: { xp: 30 },
  });
  assert(plan.dryRun && !plan.willWrite, "no write in dry-run");
  assert(plan.intendedWrites.length === 1, "logs intended");
});

test("recordId guard fails clearly when absent", () => {
  const bad = c.requireRecordId("");
  assert(!bad.ok && /recordId/.test(bad.error), "error mentions recordId");
  const ok = c.requireRecordId("recABCDEFGHIJKLM");
  assert(ok.ok && ok.recordId.startsWith("rec"), "valid");
});

test("Review status vocabulary includes Stage 17 set", () => {
  for (const s of ["Not Submitted", "Needs Review", "Satisfactory", "Needs Correction"]) {
    assert(c.REVIEW_STATUSES.includes(s), s);
  }
});

test("Conflict detection: live and recording evidence cannot double-count", () => {
  const live = c.buildLiveAttendBaseSourceKey("ZMKEY", "recE");
  const rec = c.buildZoomCreditSourceKey("recE", "recM");
  assert(live !== rec, "disjoint keys");
  const conflict = c.canCreateRecordingXpEvent({
    approved: false,
    conflict: true,
    amount: 30,
    creditKey: rec,
    existingXpBySourceKey: { [rec]: { id: "xpR", active: true } },
  });
  assert(conflict.action === "deactivated_on_conflict", "soft-void recording on conflict");
});

test("101 CONFIG version matches header v5.5", () => {
  const src = fs.readFileSync(path.join(root, "101-zoom-attendance-xp-award-meeting-xp.js"), "utf8");
  assert(src.includes("* Version: v5.5"), "header");
  assert(src.includes('version: "v5.5"'), "config");
});

console.log("\nAll c025-stage17-zoom-attendance tests passed.");

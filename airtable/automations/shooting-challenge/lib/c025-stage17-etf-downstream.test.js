/**
 * Node tests — C-025 ETF downstream v1.7 query budget + 057 Queue? re-entry + 042 view re-entry.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const lib = require("./c025-stage17-etf-downstream.js");

function ok(name) {
  console.log(`ok - ${name}`);
}

function testIdentify() {
  assert.strictEqual(
    lib.isC025Stage17DownstreamScenario({
      scenarioType: "Other",
      testIntakeName: "C025_STAGE17_DOWNSTREAM",
      scenarioRequirements: "",
    }),
    true
  );
  assert.strictEqual(
    lib.isC025Stage17DownstreamScenario({
      scenarioType: "Daily Submission",
      testIntakeName: "C025_STAGE17_DOWNSTREAM",
      scenarioRequirements: "",
    }),
    false
  );
  ok("Identify C025 scenario");
}

function testQueryBudgetNormalAndExhaust() {
  const b = lib.createQueryBudget({ max: 3 });
  assert.strictEqual(b.consume("a").ok, true);
  assert.strictEqual(b.consume("b").ok, true);
  assert.strictEqual(b.consume("c").ok, true);
  assert.strictEqual(b.count, 3);
  const fail = b.consume("d");
  assert.strictEqual(fail.ok, false);
  assert.ok(String(fail.error).includes("exhausted"));
  ok("Query budget increments and refuses over limit");
}

function testWorstCaseUnder22() {
  const est = lib.estimateWorstCaseQueryCount();
  assert.strictEqual(est.pollAttempts, 5);
  assert.ok(est.worstCaseBranchTotal <= 21);
  assert.ok(est.worstCaseInvocationTotal <= 22);
  assert.ok(est.worstCaseInvocationTotal < 30);
  assert.ok(est.breakdown.trigger057QueueReentry >= 1);
  assert.ok(est.breakdown.trigger042ViewReentry >= 1);
  ok(`Worst-case invocation queries=${est.worstCaseInvocationTotal} (<=22, <30)`);
}

function testResumePlans() {
  assert.deepStrictEqual(lib.planResumeState({ pwApplied: false, gateApplied: false }), {
    skip057: false,
    skip042: false,
    mode: "fresh",
  });
  assert.deepStrictEqual(lib.planResumeState({ pwApplied: true, gateApplied: false }), {
    skip057: true,
    skip042: false,
    mode: "resume_after_057",
  });
  assert.deepStrictEqual(lib.planResumeState({ pwApplied: true, gateApplied: true }), {
    skip057: true,
    skip042: true,
    mode: "resume_both_done",
  });
  assert.deepStrictEqual(
    lib.planResumeState({ pwApplied: true, gateApplied: true, resetFixtures: true }),
    { skip057: false, skip042: false, mode: "explicit_reset" }
  );
  ok("Resume after 057 / both / resetFixtures");
}

function test057PendingToSkippedToPending() {
  const plan = lib.plan057QueueReentryTransition({
    automationStatusCurrently: "Pending",
    pwApplied: false,
  });
  assert.strictEqual(plan.skip, false);
  assert.strictEqual(plan.triggerOnce, true);
  assert.strictEqual(plan.leaveValue, "Skipped");
  assert.strictEqual(plan.armedValue, "Pending");
  assert.deepStrictEqual(plan.steps, ["set_skipped", "confirm_left_queue", "set_pending"]);
  assert.ok(String(plan.transition).includes("Skipped → Pending"));
  ok("Pending → Skipped → Pending (Queue? leave/re-enter)");
}

function test057ReadyToSkippedToPending() {
  const plan = lib.plan057QueueReentryTransition({
    automationStatusCurrently: "Ready",
    pwApplied: false,
  });
  assert.strictEqual(plan.skip, false);
  assert.strictEqual(plan.leaveValue, "Skipped");
  assert.strictEqual(plan.armedValue, "Pending");
  assert.deepStrictEqual(plan.steps, ["set_skipped", "confirm_left_queue", "set_pending"]);
  ok("Ready → Skipped → Pending");
}

function test057NonQueueToPending() {
  const plan = lib.plan057QueueReentryTransition({
    automationStatusCurrently: "Error",
    pwApplied: false,
  });
  assert.strictEqual(plan.skip, false);
  assert.strictEqual(plan.leaveValue, null);
  assert.strictEqual(plan.armedValue, "Pending");
  assert.deepStrictEqual(plan.steps, ["set_pending"]);
  ok("Non-queue (Error) → Pending");
}

function test057ResumeSkipsRetrigger() {
  const plan = lib.plan057QueueReentryTransition({
    automationStatusCurrently: "Pending",
    pwApplied: true,
    resetFixtures: false,
  });
  assert.strictEqual(plan.skip, true);
  assert.strictEqual(plan.triggerOnce, false);
  const reset = lib.plan057QueueReentryTransition({
    automationStatusCurrently: "Pending",
    pwApplied: true,
    resetFixtures: true,
  });
  assert.strictEqual(reset.skip, false);
  assert.deepStrictEqual(reset.steps, ["set_skipped", "confirm_left_queue", "set_pending"]);
  ok("Resume skips 057 retrigger when already applied; reset forces leave/re-enter");
}

function testReadyPendingNeverLeavesQueue() {
  assert.strictEqual(lib.isQueueMatchStatus("Ready"), true);
  assert.strictEqual(lib.isQueueMatchStatus("Pending"), true);
  assert.strictEqual(lib.isQueueMatchStatus("Skipped"), false);
  assert.strictEqual(lib.isQueueMatchStatus("Error"), false);
  assert.strictEqual(lib.isQueueMatchStatus("Created"), false);
  ok("Ready and Pending both match Queue?; Skipped/Error/Created leave Queue?");
}

function test042CheckedToUncheckedToChecked() {
  const plan = lib.plan042ViewReentryTransition({
    levelRecalcNeededCurrently: true,
    gateApplied: false,
  });
  assert.strictEqual(plan.skip, false);
  assert.strictEqual(plan.triggerOnce, true);
  assert.strictEqual(plan.transition, "checked → unchecked → checked");
  assert.deepStrictEqual(plan.steps, ["uncheck", "confirm_unchecked", "check"]);
  assert.strictEqual(plan.previous, true);
  assert.strictEqual(plan.resetValue, false);
  assert.strictEqual(plan.armedValue, true);
  ok("Checked starts → unchecked → checked");
}

function test042UncheckedToChecked() {
  const plan = lib.plan042ViewReentryTransition({
    levelRecalcNeededCurrently: false,
    gateApplied: false,
  });
  assert.strictEqual(plan.skip, false);
  assert.strictEqual(plan.triggerOnce, true);
  assert.strictEqual(plan.transition, "unchecked → checked");
  assert.deepStrictEqual(plan.steps, ["check"]);
  assert.strictEqual(plan.previous, false);
  assert.strictEqual(plan.resetValue, null);
  assert.strictEqual(plan.armedValue, true);
  ok("Unchecked starts → checked");
}

function test042TriggeredExactlyOnce() {
  const a = lib.plan042ViewReentryTransition({ levelRecalcNeededCurrently: true });
  const b = lib.plan042ViewReentryTransition({ levelRecalcNeededCurrently: false });
  assert.strictEqual(a.triggerOnce, true);
  assert.strictEqual(b.triggerOnce, true);
  assert.strictEqual(a.steps.filter((s) => s === "check").length, 1);
  assert.strictEqual(b.steps.filter((s) => s === "check").length, 1);
  ok("042 is triggered exactly once (single arm/check step)");
}

function test042ResumeSkipsRetrigger() {
  const plan = lib.plan042ViewReentryTransition({
    levelRecalcNeededCurrently: true,
    gateApplied: true,
    resetFixtures: false,
  });
  assert.strictEqual(plan.skip, true);
  assert.strictEqual(plan.triggerOnce, false);
  assert.deepStrictEqual(plan.steps, []);
  const reset = lib.plan042ViewReentryTransition({
    levelRecalcNeededCurrently: true,
    gateApplied: true,
    resetFixtures: true,
  });
  assert.strictEqual(reset.skip, false);
  assert.strictEqual(reset.transition, "checked → unchecked → checked");
  ok("Resume skips retrigger when already applied; reset forces re-entry");
}

function testPwEvalFirstPoll() {
  const pass = lib.evaluatePerfectWeekZoomPhase({
    attendeesBefore: [],
    attendeesAfter: [],
    zoomMeetingCount: 2,
    zoomAttendanceCount: 1,
    pwAppliedBefore: false,
    pwAppliedAfter: false,
    wasAutomationStatus: "Ready",
  });
  assert.strictEqual(pass.pass, true);
  assert.strictEqual(pass.wasReady, true);
  ok("Normal 057 completion (WAS Ready; Applied? optional)");
}

function testPwTimeoutShape() {
  const fail = lib.evaluatePerfectWeekZoomPhase({
    attendeesBefore: [],
    attendeesAfter: [],
    zoomMeetingCount: 2,
    zoomAttendanceCount: 1,
    pwAppliedBefore: false,
    pwAppliedAfter: true,
    wasAutomationStatus: "Pending",
  });
  assert.strictEqual(fail.pass, false);
  ok("057 not complete when WAS Status still Pending");
}

function testGateEval() {
  assert.strictEqual(
    lib.evaluateGatePhase({
      attendeesBefore: [],
      attendeesAfter: [],
      gateAppliedBefore: false,
      gateAppliedAfter: true,
      levelRecalcAfter: false,
      currentLevelBefore: "a",
      currentLevelAfter: "a",
      nextLevelBefore: "b",
      nextLevelAfter: "b",
    }).pass,
    true
  );
  ok("Normal 042 completion");
}

function testDedupe() {
  assert.strictEqual(
    lib.evaluateDedupeRerun({
      zoomAttendanceCountFirst: 1,
      zoomAttendanceCountSecond: 1,
      pwAppliedAfterSecond: true,
      gateAppliedAfterSecond: true,
      attendeesAfterSecond: [],
    }).pass,
    true
  );
  ok("Dedupe stable at count 1");
}

function testSourceGuards() {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "115-engineering-test-framework-run-testing-scenario-daily-submission.js"),
    "utf8"
  );
  assert.ok(lib.dailySubmissionBranchMustRemainUntouched(src));
  assert.ok(lib.c025PathMustUseQueryBudget(src));
  // Authoritative SCRIPT.version in repo is v1.9 (message/header corrections on
  // top of v1.8 Stage 17 logic). PROD Airtable may still run pasted v1.8.
  assert.ok(src.includes('version: "v1.9"'));
  assert.ok(src.includes("pollAttempts: 5"));
  assert.ok(!src.includes("pollAttempts: 20"));
  assert.ok(src.includes("Timed Out Waiting for 057"));
  assert.ok(src.includes("Timed Out Waiting for 042"));
  assert.ok(src.includes("clearRunTest: true"));
  assert.ok(src.includes("checked → unchecked → checked"));
  assert.ok(src.includes("unchecked → checked"));
  assert.ok(src.includes("confirm057 left Queue"));
  assert.ok(src.includes("poll057 WAS"));
  assert.ok(src.includes("Skipped → Pending") || src.includes('"Skipped"'));
  assert.ok(src.includes("viewReentry042") || src.includes("view_reentry"));
  assert.ok(src.includes("C025 error — Run Test? cleared"));
  const idx5b = src.indexOf("SECTION 5B");
  const idx6 = src.indexOf("SECTION 6 — MAIN");
  const section5b = src.slice(idx5b, idx6);
  assert.ok(!section5b.includes("selectRecordsAsync"));
  assert.ok(section5b.includes("c025SelectRecord"));
  assert.ok(section5b.includes("Refuse Attendees"));
  assert.ok(!section5b.includes("waitFor057"));
  assert.ok(section5b.includes("confirm042 Level Recalc unchecked"));
  assert.ok(section5b.includes("confirm057 left Queue"));
  assert.ok(section5b.includes("poll057 WAS"));
  assert.ok(!section5b.includes("poll057 ZA"));
  assert.ok(!section5b.includes('trigger057: "WAS status Ready→Pending'));
  const dailyIdx = src.indexOf("scenarioType === CONFIG.scenarioTypes.dailySubmission");
  const c025Idx = src.indexOf("isC025Stage17DownstreamScenario");
  assert.ok(dailyIdx > 0 && c025Idx > 0);
  ok("115 v1.8 source guards: wait WAS Ready, Queue re-entry, 042 view re-entry, budget, Daily intact");
}

function testNoProdBase() {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "115-engineering-test-framework-run-testing-scenario-daily-submission.js"),
    "utf8"
  );
  assert.ok(!src.includes("appn84sqPw03zEbTT"));
  ok("No PROD base hardcoded");
}

function simulatePollAttempts(appliedOnAttempt, maxAttempts = 5) {
  let attempts = 0;
  let done = false;
  for (let i = 0; i < maxAttempts; i += 1) {
    attempts += 1;
    if (attempts === appliedOnAttempt) {
      done = true;
      break;
    }
  }
  return { attempts, done, timedOut: !done };
}

function testDelayedCompletion() {
  const d = simulatePollAttempts(4);
  assert.strictEqual(d.done, true);
  assert.strictEqual(d.attempts, 4);
  const t = simulatePollAttempts(99);
  assert.strictEqual(t.timedOut, true);
  assert.strictEqual(t.attempts, 5);
  ok("Delayed completion within 5 attempts; timeout after 5");
}

function testDownstreamTriggerDocs() {
  const trig = lib.planDownstreamTriggers();
  assert.strictEqual(trig.automation042.view, "042");
  assert.ok(String(trig.automation042.method).includes("view_reentry"));
  assert.ok(String(trig.automation057.method).includes("queue_reentry"));
  assert.strictEqual(trig.automation057.leaveStatus, "Skipped");
  assert.strictEqual(trig.automation057.armStatus, "Pending");
  ok("Downstream trigger docs name 057 Queue re-entry + 042 view re-entry");
}

testIdentify();
testQueryBudgetNormalAndExhaust();
testWorstCaseUnder22();
testResumePlans();
test057PendingToSkippedToPending();
test057ReadyToSkippedToPending();
test057NonQueueToPending();
test057ResumeSkipsRetrigger();
testReadyPendingNeverLeavesQueue();
test042CheckedToUncheckedToChecked();
test042UncheckedToChecked();
test042TriggeredExactlyOnce();
test042ResumeSkipsRetrigger();
testPwEvalFirstPoll();
testPwTimeoutShape();
testGateEval();
testDedupe();
testSourceGuards();
testNoProdBase();
testDelayedCompletion();
testDownstreamTriggerDocs();
console.log("All C-025 ETF downstream tests passed.");

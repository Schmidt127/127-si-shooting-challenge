/**
 * Node tests — C-025 ETF downstream v1.5 query budget + resume + regression.
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
  assert.ok(est.worstCaseBranchTotal <= 20);
  assert.ok(est.worstCaseInvocationTotal <= 22);
  assert.ok(est.worstCaseInvocationTotal < 30);
  ok(`Worst-case invocation queries=${est.worstCaseInvocationTotal} (<=22)`);
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

function testPwEvalFirstPoll() {
  const pass = lib.evaluatePerfectWeekZoomPhase({
    attendeesBefore: [],
    attendeesAfter: [],
    zoomMeetingCount: 2,
    zoomAttendanceCount: 1,
    pwAppliedBefore: false,
    pwAppliedAfter: true,
    wasAutomationStatus: "Pending",
  });
  assert.strictEqual(pass.pass, true);
  ok("Normal 057 completion (Applied? true; Ready not required)");
}

function testPwTimeoutShape() {
  const fail = lib.evaluatePerfectWeekZoomPhase({
    attendeesBefore: [],
    attendeesAfter: [],
    zoomMeetingCount: 2,
    zoomAttendanceCount: 0,
    pwAppliedBefore: false,
    pwAppliedAfter: false,
    wasAutomationStatus: "Pending",
  });
  assert.strictEqual(fail.pass, false);
  ok("057 not complete when Applied? false");
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
  assert.ok(src.includes('version: "v1.5"'));
  assert.ok(src.includes("pollAttempts: 5"));
  assert.ok(!src.includes("pollAttempts: 20"));
  assert.ok(src.includes("Timed Out Waiting for 057"));
  assert.ok(src.includes("Timed Out Waiting for 042"));
  assert.ok(src.includes("clearRunTest: true"));
  assert.ok(src.includes("resume_both_done") || src.includes("resume_after_057"));
  assert.ok(src.includes("C025 error — Run Test? cleared"));
  // Daily branch historically may not use selectRecordsAsync — ensure C025 section has no selectRecordsAsync
  const idx5b = src.indexOf("SECTION 5B");
  const idx6 = src.indexOf("SECTION 6 — MAIN");
  const section5b = src.slice(idx5b, idx6);
  assert.ok(!section5b.includes("selectRecordsAsync"));
  assert.ok(section5b.includes("c025SelectRecord"));
  assert.ok(section5b.includes("Refuse Attendees"));
  assert.ok(!section5b.includes("waitFor057"));
  assert.ok((section5b.match(/pollAttempts/g) || []).length >= 1);
  // Daily still routed first
  const dailyIdx = src.indexOf("scenarioType === CONFIG.scenarioTypes.dailySubmission");
  const c025Idx = src.indexOf("isC025Stage17DownstreamScenario");
  assert.ok(dailyIdx > 0 && c025Idx > 0);
  ok("115 v1.5 source guards: budget, no full-table in 5B, Daily intact, Attendees refused");
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

testIdentify();
testQueryBudgetNormalAndExhaust();
testWorstCaseUnder22();
testResumePlans();
testPwEvalFirstPoll();
testPwTimeoutShape();
testGateEval();
testDedupe();
testSourceGuards();
testNoProdBase();
testDelayedCompletion();

console.log("\nAll c025-stage17-etf-downstream tests passed.");

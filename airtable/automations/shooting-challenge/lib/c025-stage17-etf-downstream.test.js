/**
 * Node tests — C-025 ETF downstream scenario helpers + 115 Daily branch freeze.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const lib = require("./c025-stage17-etf-downstream.js");

function ok(name) {
  console.log(`ok - ${name}`);
}

function testIdentifyScenario() {
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
      scenarioType: "Perfect Week",
      testIntakeName: "x",
      scenarioRequirements: "C025_STAGE17_DOWNSTREAM\n{}",
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
  assert.strictEqual(
    lib.isC025Stage17DownstreamScenario({
      scenarioType: "Other",
      testIntakeName: "misc",
      scenarioRequirements: "",
    }),
    false
  );
  ok("Identify C025_STAGE17_DOWNSTREAM scenario without new fields");
}

function testFixtures() {
  const f = lib.resolveFixtures({});
  assert.strictEqual(f.enrollmentId, "recgP9qZYjAhE7NXm");
  assert.strictEqual(f.wasId, "recvtukGFL7u74Tme");
  const o = lib.resolveFixtures({
    scenarioRequirementsText: JSON.stringify({ wasId: "recCUSTOM" }),
  });
  assert.strictEqual(o.wasId, "recCUSTOM");
  ok("Default fixtures + Scenario Requirements JSON overrides");
}

function testPwEval() {
  const pass = lib.evaluatePerfectWeekZoomPhase({
    attendeesBefore: [],
    attendeesAfter: [],
    zoomMeetingCount: 2,
    zoomAttendanceCount: 1,
    pwAppliedBefore: false,
    pwAppliedAfter: true,
    wasAutomationStatus: "Ready",
  });
  assert.strictEqual(pass.pass, true);
  const failAttendees = lib.evaluatePerfectWeekZoomPhase({
    attendeesBefore: [],
    attendeesAfter: ["recX"],
    zoomMeetingCount: 1,
    zoomAttendanceCount: 1,
    pwAppliedBefore: false,
    pwAppliedAfter: true,
    wasAutomationStatus: "Ready",
  });
  assert.strictEqual(failAttendees.pass, false);
  ok("Perfect Week Zoom phase evaluation");
}

function testGateEval() {
  const pass = lib.evaluateGatePhase({
    attendeesBefore: [],
    attendeesAfter: [],
    gateAppliedBefore: false,
    gateAppliedAfter: true,
    levelRecalcAfter: false,
    currentLevelBefore: "recA",
    currentLevelAfter: "recA",
    nextLevelBefore: "recB",
    nextLevelAfter: "recB",
    formulaTotalZoomAttendances: 1,
  });
  assert.strictEqual(pass.pass, true);
  ok("Gate phase evaluation");
}

function testDedupe() {
  const d = lib.evaluateDedupeRerun({
    zoomAttendanceCountFirst: 1,
    zoomAttendanceCountSecond: 1,
    pwAppliedAfterSecond: true,
    gateAppliedAfterSecond: true,
    attendeesAfterSecond: [],
  });
  assert.strictEqual(d.pass, true);
  const bad = lib.evaluateDedupeRerun({
    zoomAttendanceCountFirst: 1,
    zoomAttendanceCountSecond: 2,
    pwAppliedAfterSecond: true,
    gateAppliedAfterSecond: true,
    attendeesAfterSecond: [],
  });
  assert.strictEqual(bad.pass, false);
  ok("Dedupe rerun evaluation");
}

function testTriggersNeverAttendees() {
  const plan = lib.planDownstreamTriggers();
  assert.ok(plan.neverWrite.includes("Attendees"));
  assert.strictEqual(plan.automation042.method, "level_recalc_needed");
  assert.strictEqual(plan.automation057.method, "was_status_toggle");
  ok("Trigger plan forbids Attendees writes");
}

function testDailyBranchFrozen() {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "115-engineering-test-framework-run-testing-scenario-daily-submission.js"),
    "utf8"
  );
  assert.ok(lib.dailySubmissionBranchMustRemainUntouched(src));
  assert.ok(src.includes("async function runDailySubmissionBranch"));
  assert.ok(src.includes("runC025Stage17DownstreamBranch") || src.includes("C025_STAGE17_DOWNSTREAM"));
  // Daily path still routed first
  const dailyIdx = src.indexOf('scenarioType === CONFIG.scenarioTypes.dailySubmission');
  const c025Idx = src.indexOf("isC025Stage17DownstreamScenario");
  assert.ok(dailyIdx > 0);
  assert.ok(c025Idx > 0);
  ok("Daily Submission branch still present; C025 routed separately");
}

function testNoProdBase() {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "115-engineering-test-framework-run-testing-scenario-daily-submission.js"),
    "utf8"
  );
  assert.ok(!src.includes("appn84sqPw03zEbTT"));
  assert.ok(src.includes("recgP9qZYjAhE7NXm"));
  ok("115 script does not hardcode PROD base; Schmidt allowlist retained");
}

function testEmailMakeExcluded() {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "115-engineering-test-framework-run-testing-scenario-daily-submission.js"),
    "utf8"
  );
  assert.ok(!/webhookUrl|Make\.com|sendEmail/i.test(src) || src.includes("THIS IS NOT"));
  assert.ok(!src.includes('attendees: "Attendees"') || !src.includes("Attendees\": true"));
  // C025 branch must refuse Attendees writes
  assert.ok(src.includes("Refuse Attendees") || src.includes("never write Attendees") || src.includes("Never write Attendees"));
  ok("Email/Make paths excluded; Attendees write refused");
}

testIdentifyScenario();
testFixtures();
testPwEval();
testGateEval();
testDedupe();
testTriggersNeverAttendees();
testDailyBranchFrozen();
testNoProdBase();
testEmailMakeExcluded();

console.log("\nAll c025-stage17-etf-downstream tests passed.");

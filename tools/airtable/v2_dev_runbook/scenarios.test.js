#!/usr/bin/env node
/**
 * Handler tests for expanded live CLI scenarios (C4, D3, G3, H2, J1, J4, J5, L1, L2 + wave1).
 * No live Airtable. Dry-run client only.
 *
 *   node tools/airtable/v2_dev_runbook/scenarios.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { SUPPORTED_LIVE_TESTS } = require("./lib/constants");
const { getScenario, listScenarioSpecs, SCENARIOS } = require("./lib/scenarios");
const { assertSupportedLiveTest, SafetyError } = require("./lib/safety");
const { createRunState } = require("./lib/run_state");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${error && error.message ? error.message : error}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${error && error.message ? error.message : error}`);
  }
}

function dryClient() {
  return {
    dryRun: true,
    async createRecord(table, fields) {
      return { dryRun: true, table, fields };
    },
    async updateRecord(table, id, fields) {
      return { dryRun: true, table, id, fields };
    },
  };
}

const NEW_HANDLERS = ["C4", "D3", "G3", "H2", "J1", "J4", "J5", "L1", "L2"];
const WAVE1 = ["A3", "B1", "B2", "F1", "F2", "F3"];

async function main() {
  console.log("V2 DEV Runbook scenario handler tests");
  console.log("");

  test("SUPPORTED_LIVE_TESTS includes wave2 handlers and excludes Make/M1/M2", () => {
    for (const id of [...WAVE1, ...NEW_HANDLERS]) {
      assert.ok(SUPPORTED_LIVE_TESTS.includes(id), `missing ${id}`);
      assert.strictEqual(assertSupportedLiveTest(id), id);
    }
    for (const id of ["M1", "M2", "I6", "J6", "C7", "L3"]) {
      assert.ok(!SUPPORTED_LIVE_TESTS.includes(id), `${id} should not be supported`);
      assert.throws(() => assertSupportedLiveTest(id), (err) => err instanceof SafetyError);
    }
  });

  test("every supported scenario has spec + plan + execute", () => {
    const specs = listScenarioSpecs();
    assert.strictEqual(specs.length, SUPPORTED_LIVE_TESTS.length);
    for (const row of specs) {
      assert.ok(row.spec, `${row.id} missing spec`);
      const requiredSpecKeys = [
        "purpose",
        "requiredTables",
        "requiredFields",
        "setup",
        "writeOperations",
        "expectedAutomation",
        "expectedOutputs",
        "cleanup",
        "rollback",
        "blockers",
      ];
      for (const key of requiredSpecKeys) {
        assert.ok(row.spec[key], `${row.id} spec missing ${key}`);
      }
      assert.ok(typeof SCENARIOS[row.id].plan === "function");
      assert.ok(typeof SCENARIOS[row.id].execute === "function");
    }
  });

  for (const id of NEW_HANDLERS) {
    await testAsync(`handler ${id}: plan+execute dry-run captures pre-test and no live writes`, async () => {
      const scenario = getScenario(id);
      const plan = await scenario.plan({
        enrollmentId: "recEnrollFixture001",
        assignmentId: "recHwAssignFixture01",
        meetingId: "recZoomMeetFix0001",
        weekId: "recWeekFixture00001",
      });
      assert.ok(plan.preTestState, `${id} plan missing preTestState`);
      assert.ok(Array.isArray(plan.writes), `${id} plan.writes must be array`);

      const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), `scen-${id}-`));
      try {
        const { state } = createRunState({
          testId: id,
          enrollmentId: "recEnrollFixture001",
          dryRun: true,
          dir: stateDir,
        });
        const out = await scenario.execute({
          client: dryClient(),
          plan,
          state,
        });
        assert.ok(out.state.preTestState);
        assert.ok(Array.isArray(out.recordsCreated));
        assert.strictEqual(out.result, "blocked");
        assert.ok(String(out.actualResult).includes("DRY-RUN"));
        for (const rec of out.recordsCreated) {
          assert.ok(rec.id === "(dry-run)" || rec.kind === "update");
        }
      } finally {
        fs.rmSync(stateDir, { recursive: true, force: true });
      }
    });
  }

  await testAsync("C4 plan includes Satisfactory Homework Completions write", async () => {
    const plan = await getScenario("C4").plan({
      enrollmentId: "recEnrollFixture001",
      assignmentId: "recHwAssignFixture01",
    });
    assert.strictEqual(plan.writes.length, 1);
    assert.strictEqual(plan.writes[0].table, "Homework Completions");
    assert.strictEqual(plan.writes[0].fields["Satisfactory?"], true);
  });

  await testAsync("D3 plan sets Ready for XP Automation", async () => {
    const plan = await getScenario("D3").plan({ enrollmentId: "recEnrollFixture001" });
    assert.strictEqual(plan.writes[0].table, "Video Feedback");
    assert.strictEqual(plan.writes[0].fields["Ready for XP Automation?"], true);
  });

  await testAsync("G3 plan targets Weekly Athlete Summary", async () => {
    const plan = await getScenario("G3").plan({
      enrollmentId: "recEnrollFixture001",
      weekId: "recWeekFixture00001",
    });
    assert.strictEqual(plan.writes[0].table, "Weekly Athlete Summary");
  });

  await testAsync("H2 with enrollment plans rollback patch update", async () => {
    const plan = await getScenario("H2").plan({ enrollmentId: "recEnrollFixture001" });
    assert.strictEqual(plan.writes[0].kind, "update");
    assert.ok(plan.writes[0].previousFields);
  });

  await testAsync("J1/J5/L1/L2 are operator-rerun (no creates)", async () => {
    for (const id of ["J1", "J5", "L1", "L2"]) {
      const plan = await getScenario(id).plan({
        enrollmentId: "recEnrollFixture001",
        meetingId: "recZoomMeetFix0001",
      });
      assert.strictEqual(plan.writes.length, 0, `${id} should not create records by default`);
    }
  });

  await testAsync("J4 plan creates Satisfactory completion with Zoom Meeting", async () => {
    const plan = await getScenario("J4").plan({
      enrollmentId: "recEnrollFixture001",
      meetingId: "recZoomMeetFix0001",
    });
    assert.strictEqual(plan.writes[0].table, "Homework Completions");
    assert.strictEqual(plan.writes[0].fields["Satisfactory?"], true);
    assert.deepStrictEqual(plan.writes[0].fields["Zoom Meeting"], ["recZoomMeetFix0001"]);
  });

  // Integration: CLI dry-run for each new handler
  const { main: cliMain } = require("./cli");
  const { DEV_BASE_ID } = require("./lib/constants");
  for (const id of NEW_HANDLERS) {
    await testAsync(`CLI dry-run run-test ${id}`, async () => {
      const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), `cli-${id}-`));
      const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), `cli-${id}-ev-`));
      process.env.V2_DEV_RUNBOOK_STATE_DIR = stateDir;
      process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT = evidenceDir;
      try {
        const result = await cliMain(
          [
            "run-test",
            id,
            "--dev-confirm",
            "--enrollment",
            "recEnrollFixture001",
            "--assignment",
            "recHwAssignFixture01",
            "--meeting",
            "recZoomMeetFix0001",
            "--week",
            "recWeekFixture00001",
          ],
          {
            env: { BASE_ID: DEV_BASE_ID, AIRTABLE_TOKEN: "patTest" },
            loadDotenv: false,
          },
        );
        assert.strictEqual(result.ok, true, `${id} ok`);
        assert.strictEqual(result.dryRun, true, `${id} dryRun`);
        assert.ok(fs.existsSync(result.evidencePath), `${id} evidence`);
      } finally {
        delete process.env.V2_DEV_RUNBOOK_STATE_DIR;
        delete process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT;
        fs.rmSync(stateDir, { recursive: true, force: true });
        fs.rmSync(evidenceDir, { recursive: true, force: true });
      }
    });
  }

  console.log("");
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("OK — scenario handler tests green (no live Airtable)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

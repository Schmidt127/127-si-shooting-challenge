#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SCRIPT_PATH = path.join(
  __dirname,
  "..",
  "..",
  "airtable",
  "automations",
  "shooting-challenge",
  "120-weekly-threshold-xp-eligibility-reconciliation.js"
);

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

assert.ok(fs.existsSync(SCRIPT_PATH), "Automation 120 script must exist");
const body = fs.readFileSync(SCRIPT_PATH, "utf8");

function loadHelpers() {
  const prefix = body.split("const inputConfig = input.config();")[0];
  const source = `${prefix}\nmodule.exports = { meetsTier, sourceKey, sourceLabel, ownerMatches, programOwnershipIsValid, appendDebug };`;
  const sandbox = { module: { exports: {} }, console };
  vm.runInNewContext(source, sandbox, { filename: SCRIPT_PATH });
  return sandbox.module.exports;
}

const helpers = loadHelpers();

function fakeRecord(fields) {
  return {
    getCellValue(name) { return fields[name]; },
    getCellValueAsString(name) {
      const value = fields[name];
      if (value == null) return "";
      if (Array.isArray(value)) return value.map((x) => x && (x.name || x.id || x)).join(", ");
      if (value && value.name) return value.name;
      return String(value);
    },
  };
}

test("Automation 120 is dry-run by default and requires explicit execute=true for writes", () => {
  assert.ok(body.includes("const execute ="));
  assert.ok(body.includes("dryRun: !execute"));
  assert.ok(body.includes("if (execute) {"));
});

test("Automation 120 never creates XP Events and delegates missing eligible awards to 035", () => {
  assert.ok(!body.includes("xpTable.createRecordAsync"));
  assert.ok(!body.includes("xpTable.createRecordsAsync"));
  assert.ok(body.includes("eligible_award_missing_delegate_to_035"));
  assert.ok(body.includes("Automation 035 remains the sole creator"));
});

test("canonical threshold identity remains Enrollment + Week + tier", () => {
  assert.strictEqual(
    helpers.sourceKey("recEnrollment0001", "recWeek0000000001", 125),
    "WEEKLY_THRESHOLD|recEnrollment0001|recWeek0000000001|125"
  );
  assert.strictEqual(helpers.sourceLabel(150), "Weekly Threshold 150");
});

test("Airtable percent ratio semantics are preserved", () => {
  assert.strictEqual(helpers.meetsTier(0.99, 100), false);
  assert.strictEqual(helpers.meetsTier(1, 100), true);
  assert.strictEqual(helpers.meetsTier(1.24, 125), false);
  assert.strictEqual(helpers.meetsTier(1.25, 125), true);
  assert.strictEqual(helpers.meetsTier(1.5, 150), true);
  assert.strictEqual(helpers.meetsTier(83.7, 150), true);
});

test("ownership validation requires exact Enrollment + Week and does not steal another WAS", () => {
  const xp = fakeRecord({
    Enrollment: [{ id: "recEnrollment0001" }],
    Week: [{ id: "recWeek0000000001" }],
    "Weekly Athlete Summary": [{ id: "recSummary00000001" }],
  });
  assert.strictEqual(
    helpers.ownerMatches(xp, "recEnrollment0001", "recWeek0000000001", "recSummary00000001"),
    true
  );
  assert.strictEqual(
    helpers.ownerMatches(xp, "recEnrollment0002", "recWeek0000000001", "recSummary00000001"),
    false
  );
  assert.strictEqual(
    helpers.ownerMatches(xp, "recEnrollment0001", "recWeek0000000002", "recSummary00000001"),
    false
  );
  assert.strictEqual(
    helpers.ownerMatches(xp, "recEnrollment0001", "recWeek0000000001", "recSummary00000002"),
    false
  );
});

test("reactivation requires matching Enrollment and Week Program Instance", () => {
  const enrollment = fakeRecord({ "Program Instance": [{ id: "recProgram0000001" }] });
  const weekSame = fakeRecord({ "Program Instance": [{ id: "recProgram0000001" }] });
  const weekOther = fakeRecord({ "Program Instance": [{ id: "recProgram0000002" }] });
  const weekBlank = fakeRecord({ "Program Instance": [] });
  assert.strictEqual(helpers.programOwnershipIsValid(enrollment, weekSame), true);
  assert.strictEqual(helpers.programOwnershipIsValid(enrollment, weekOther), false);
  assert.strictEqual(helpers.programOwnershipIsValid(enrollment, weekBlank), false);
});

test("lost eligibility retires and regained eligibility reactivates the same event", () => {
  assert.ok(body.includes("[CONFIG.xp.active]: false"));
  assert.ok(body.includes("[CONFIG.xp.active]: true"));
  assert.ok(body.includes("reactivation_blocked_owner_or_program_instance"));
  assert.ok(body.includes("legacy) update[CONFIG.xp.sourceKey] = key"));
  assert.ok(!body.includes("XP Points"] ="));
});

test("every lifecycle transition queues existing Enrollment level recalculation flag", () => {
  assert.ok(body.includes("recalcEnrollmentIds.add(enrollmentId)"));
  assert.ok(body.includes("[CONFIG.enrollment.levelRecalcNeeded]: true"));
  assert.ok(!body.includes("Current Level"));
  assert.ok(!body.includes("Next Level"));
});

test("ambiguous canonical/legacy matches fail closed", () => {
  assert.ok(body.includes("threshold_xp_ambiguous"));
  assert.ok(body.includes("candidates.length > 1"));
  assert.ok(body.includes("exact.length > 0 && semanticLegacy.length > 0"));
});

test("replay-safe debug note helper does not append duplicate identical lifecycle notes", () => {
  const once = helpers.appendDebug("prior", "same-note");
  const twice = helpers.appendDebug(once, "same-note");
  assert.strictEqual(once, twice);
});

console.log("Automation 120 threshold reconciliation contracts: PASS");

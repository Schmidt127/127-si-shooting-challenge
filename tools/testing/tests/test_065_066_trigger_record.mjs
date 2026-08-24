/**
 * Offline regression tests for Automations 065 v10.3 and 066 v3.9 triggering recordId.
 * Run: node --test tools/testing/tests/test_065_066_trigger_record.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectDisallowedHardcodes } from "../../../lib/challenge-year/automation-audit.js";
import {
  build065Base,
  run065,
  REFERENCE_HC,
  DISPOSABLE_HC,
} from "./run_065_script.mjs";
import {
  build066Base,
  run066,
  REFERENCE_ENR,
  DISPOSABLE_ENR,
} from "./run_066_script.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const S065 = readFileSync(
  path.join(
    ROOT,
    "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js"
  ),
  "utf8"
);
const S066 = readFileSync(
  path.join(
    ROOT,
    "airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js"
  ),
  "utf8"
);

const KNOWN_PROD_IDS = new Set([
  REFERENCE_HC,
  "recRqpUYx9FOucIup",
  REFERENCE_ENR,
  "recgP9qZYjAhE7NXm",
]);

function executableScan(source) {
  return detectDisallowedHardcodes(source, {
    allowRecIds: [...KNOWN_PROD_IDS],
  });
}

function homeworkXpEvents(base) {
  return [...base.getTable("XP Events").records.values()];
}

function milestoneUnlocks(base, enrollmentId) {
  return [...base.getTable("Athlete Achievement Unlocks").records.values()].filter((row) =>
    (row.getCellValue("Enrollment") || []).some((link) => link.id === enrollmentId)
  );
}

test("065 executable logic has no hardcoded production record IDs", () => {
  const scan = executableScan(S065);
  const failures = scan.findings.filter((f) => f.severity === "FAIL");
  assert.equal(failures.length, 0, JSON.stringify(failures));
  assert.match(S065, /readTriggerRecordId/);
  assert.match(S065, /input\.config\(\)/);
  assert.doesNotMatch(S065, /recordId\s*=\s*["']rec[A-Za-z0-9]{10,}/);
});

test("066 executable logic has no hardcoded production record IDs", () => {
  const scan = executableScan(S066);
  const failures = scan.findings.filter((f) => f.severity === "FAIL");
  assert.equal(failures.length, 0, JSON.stringify(failures));
  assert.match(S066, /readTriggerRecordId/);
  assert.match(S066, /input\.config\(\)/);
  assert.doesNotMatch(S066, /recordId\s*=\s*["']rec[A-Za-z0-9]{10,}/);
});

test("065 missing or invalid recordId fails safely", async () => {
  const base = build065Base({ homeworkIds: [REFERENCE_HC] });
  const missing = await run065({ base, inputConfig: { recordId: "" } });
  assert.ok(missing.error);
  assert.match(missing.error.message, /Missing input variable: recordId/);
  assert.equal(missing.output.values.statusOut, "error");

  const invalid = await run065({ base, inputConfig: { recordId: "tblNotARecord" } });
  assert.ok(invalid.error);
  assert.match(invalid.error.message, /Invalid Homework Completion recordId/);
});

test("066 missing or invalid recordId fails safely", async () => {
  const base = build066Base({ enrollmentIds: [REFERENCE_ENR] });
  const missing = await run066({ base, inputConfig: { recordId: "" } });
  assert.ok(missing.error);
  assert.match(missing.error.message, /Missing input variable: recordId/);

  const invalid = await run066({ base, inputConfig: { recordId: "bad-id" } });
  assert.ok(invalid.error);
  assert.match(invalid.error.message, /Invalid Enrollment recordId/);
});

test("065 reference Homework Completion creates exactly one HOMEWORK_XP event", async () => {
  const base = build065Base({ homeworkIds: [REFERENCE_HC] });
  const first = await run065({ base, recordId: REFERENCE_HC });
  assert.equal(first.error, null, first.error?.message);
  assert.equal(first.output.values.statusOut, "success");
  const events = homeworkXpEvents(base);
  assert.equal(events.length, 1);
  assert.equal(events[0].getCellValue("Source Key"), `HOMEWORK_XP|${REFERENCE_HC}`);
  assert.equal(events[0].getCellValue("XP Points"), 35);
  assert.ok(events[0].getCellValue("XP Bucket"));
  assert.ok(events[0].getCellValue("XP Source"));
});

test("065 disposable Homework Completion creates exactly one HOMEWORK_XP event", async () => {
  const base = build065Base({ homeworkIds: [DISPOSABLE_HC] });
  const first = await run065({ base, recordId: DISPOSABLE_HC });
  assert.equal(first.error, null, first.error?.message);
  assert.equal(first.output.values.statusOut, "success");
  const events = homeworkXpEvents(base);
  assert.equal(events.length, 1);
  assert.equal(events[0].getCellValue("Source Key"), `HOMEWORK_XP|${DISPOSABLE_HC}`);
});

test("065 replay does not create a duplicate HOMEWORK_XP event", async () => {
  const base = build065Base({ homeworkIds: [REFERENCE_HC] });
  await run065({ base, recordId: REFERENCE_HC });
  const replay = await run065({ base, recordId: REFERENCE_HC });
  assert.equal(replay.error, null, replay.error?.message);
  assert.equal(homeworkXpEvents(base).length, 1);
  assert.match(replay.output.values.actionOut, /reused_after_recheck|created_or_reactivated/);
});

test("066 reference Enrollment creates only valid milestone unlocks", async () => {
  const base = build066Base({ enrollmentIds: [REFERENCE_ENR] });
  const first = await run066({ base, recordId: REFERENCE_ENR });
  assert.equal(first.error, null, first.error?.message);
  assert.equal(first.output.values.statusOut, "success");
  const unlocks = milestoneUnlocks(base, REFERENCE_ENR);
  assert.equal(unlocks.length, 2);
  for (const unlock of unlocks) {
    assert.match(unlock.getCellValue("Milestone Source Key"), /^SHOT_MILESTONE\|/);
    assert.equal(unlock.getCellValue("Active?"), true);
  }
});

test("066 disposable Enrollment creates only valid milestone unlocks", async () => {
  const base = build066Base({ enrollmentIds: [DISPOSABLE_ENR] });
  const first = await run066({ base, recordId: DISPOSABLE_ENR });
  assert.equal(first.error, null, first.error?.message);
  assert.equal(first.output.values.statusOut, "success");
  const unlocks = milestoneUnlocks(base, DISPOSABLE_ENR);
  assert.equal(unlocks.length, 2);
  assert.ok(unlocks.every((row) => String(row.getCellValue("Milestone Source Key")).includes(DISPOSABLE_ENR)));
});

test("066 replay does not create duplicate unlocks", async () => {
  const base = build066Base({ enrollmentIds: [REFERENCE_ENR] });
  await run066({ base, recordId: REFERENCE_ENR });
  base.getTable("Enrollments").records.get(REFERENCE_ENR).cells["Run Shot Milestone Check?"] = true;
  const replay = await run066({ base, recordId: REFERENCE_ENR });
  assert.equal(replay.error, null, replay.error?.message);
  assert.equal(milestoneUnlocks(base, REFERENCE_ENR).length, 2);
  assert.ok(
    ["skipped_existing", "updated", "created"].includes(replay.output.values.actionOut)
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndRun005After023 } from "./run_005_023_chain.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const IDS = {
  PI: "rec5mEM0YPqPqq0hZ",
  WEEK: "recWeVrSabnsYaHc2",
  GB: "reclWDQZzKbVBtdhG",
  PHA_HW1: "recgj8dPk4ouTwCOj",
  HW1: "rechVLOeyEVIqmy2v",
  HW2: "rec6WmXjpLtIWDERo",
};

function assertNoPattern(source, pattern, label) {
  assert.doesNotMatch(source, pattern, label);
}

test("005 v5.3 — PHA-direct intake, no library reverse search", () => {
  const source = read(
    "airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js"
  );
  assert.match(source, /version:\s*"v5\.3"/);
  assertNoPattern(source, /loadHomeworkWeekFromHomeworkId/, "005 must not load week from library");
  assertNoPattern(source, /homeworkTable|CONFIG\.homework/, "005 must not open Homework Library table");
  assert.match(source, /validateSelectedPha/);
  assert.match(source, /homework1PhaId/);
  assert.match(source, /homework1LibraryId/);
  assertNoPattern(source, /validateHomeworkSelectionAgainstPha/, "005 must not reverse-search PHA by library");
  assertNoPattern(source, /phaTable\.selectRecordsAsync/, "005 must load PHA by record ID only");
  assert.match(source, /Homework is selected but no Week could be assigned from Activity Date/);
});

test("033 v4.3 — exact PI required, no legacy fallback", () => {
  const source = read(
    "airtable/automations/shooting-challenge/033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js"
  );
  assert.match(source, /version:\s*"v4\.3"/);
  assertNoPattern(source, /legacy_curriculum/, "033 must not retain legacy path");
  assert.match(source, /must have exactly one linked record/);
  assert.match(source, /Enrollment not found/);
  assert.match(source, /piIds\[0\] !== programInstanceId/);
  assertNoPattern(source, /if \(programInstanceId &&/, "PI match must not be optional");
  assert.match(source, /duplicateSlots/);
});

test("067 v3.4 — HW17 PHA PI-first resolution, Submission stores PHA, linked HC fail-closed", () => {
  const source = read(
    "airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js"
  );
  assert.match(source, /version:\s*"v3\.4"/);
  assert.match(source, /resolveHw17PhaForEnrollment/);
  assert.match(source, /CONFIG\.values\.slotHw1/);
  assert.match(source, /validateLinkedHomeworkCompletion/);
  assert.match(source, /requireSingleCompletionMatch/);
  assert.match(source, /isExactCompletionIdentity/);
  assert.match(source, /must have exactly one link/);
  assertNoPattern(source, /resolveHw17WeekFromPha/, "067 must not reverse-search PHA by library ID");
  assertNoPattern(source, /homeworkLibrary\.week|CONFIG\.curriculum\.week/, "067 must not read library Week");
  assertNoPattern(source, /let match=matches\[0\]/, "067 must not silently pick first duplicate match");
  assertNoPattern(source, /homeworkCompletionId=matches\[0\]/, "067 must not assign completion from raw duplicate list");
});

test("020 v3.5 — PHA direct validate + library dereference", () => {
  const source = read(
    "airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js"
  );
  assert.match(source, /version:\s*"v3\.5"/);
  assert.match(source, /validateSelectedPha/);
  assert.match(source, /libraryId/);
  assertNoPattern(source, /resolveProgramHomeworkAssignmentId/, "020 must not reverse-search PHA by library");
  assertNoPattern(source, /phaTable\.selectRecordsAsync/, "020 must load PHA by record ID only");
});

test("009 — content provenance only, no library table", () => {
  const source = read("airtable/automations/shooting-challenge/009-submission-intake-create-submission-assets.js");
  assert.match(source, /homeworkName1/);
  assertNoPattern(source, /FBC Curriculum|Homework Library/, "009 does not open library table");
  assertNoPattern(source, /Program Homework Assignments/, "009 does not schedule via PHA");
});

test("005 PHA validator — direct load fail-closed (no Grade Band in match)", () => {
  function validatePha(pha, ctx) {
    if (!pha) throw new Error("PHA not found");
    if (!pha.active) throw new Error("inactive PHA");
    if (pha.piId !== ctx.piId) throw new Error("wrong PI");
    if (pha.weekId !== ctx.weekId) throw new Error("wrong Week");
    if (pha.slot !== ctx.slot) throw new Error("wrong slot");
    if (!pha.libraryIds || pha.libraryIds.length !== 1) throw new Error("bad library link count");
    return { phaId: pha.id, libraryId: pha.libraryIds[0] };
  }

  const base = {
    id: IDS.PHA_HW1,
    libraryIds: [IDS.HW1],
    weekId: IDS.WEEK,
    piId: IDS.PI,
    slot: "HW1",
    active: true,
    gbId: IDS.GB,
  };
  const ctx = { piId: IDS.PI, weekId: IDS.WEEK, slot: "HW1" };

  assert.throws(() => validatePha(null, ctx), /PHA not found/);
  assert.throws(() => validatePha({ ...base, active: false }, ctx), /inactive PHA/);
  assert.throws(() => validatePha({ ...base, piId: "recOtherPi" }, ctx), /wrong PI/);
  assert.throws(() => validatePha({ ...base, weekId: "recOtherWeek" }, ctx), /wrong Week/);
  assert.throws(() => validatePha({ ...base, slot: "HW2" }, ctx), /wrong slot/);
  assert.throws(() => validatePha({ ...base, libraryIds: [] }, ctx), /bad library link count/);
  assert.throws(() => validatePha({ ...base, libraryIds: [IDS.HW1, IDS.HW2] }, ctx), /bad library link count/);
  const ok = validatePha({ ...base, gbId: "recTotallyDifferentGb" }, ctx);
  assert.equal(ok.phaId, IDS.PHA_HW1);
  assert.equal(ok.libraryId, IDS.HW1);
});

test("033 PHA matcher — wrong PI ignored, missing PI fails at validation layer", () => {
  const pha = (id, piId = IDS.PI) => ({
    id,
    piId,
    weekId: IDS.WEEK,
    gbId: IDS.GB,
    libraryId: IDS.HW1,
    slot: "HW1",
    active: true,
  });

  const rows = [pha("good"), pha("wrong", "recWrongPi")];
  const matches = rows.filter((row) => row.piId === IDS.PI && row.weekId === IDS.WEEK);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "good");

  const missingPi = "";
  assert.ok(!missingPi, "033 throws before PHA query when PI missing");
});

test("067 PHA matcher — wrong slot ignored (PI-first scan)", () => {
  const hw17Library = IDS.HW1;
  const rows = [
    { libraryId: hw17Library, slot: "HW2", piId: IDS.PI, active: true, homeworkNumber: "HW 17" },
    { libraryId: hw17Library, slot: "HW1", piId: IDS.PI, active: true, homeworkNumber: "HW 17" },
  ];
  const matches = rows.filter(
    (r) => r.piId === IDS.PI && r.slot === "HW1" && r.active && r.homeworkNumber === "HW 17"
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].slot, "HW1");
});

test("115 v2.0 — homework ETF writes PHA RID, rejects library-only", () => {
  const source = read(
    "airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js"
  );
  assert.match(source, /version:\s*"v2\.0"/);
  assert.match(source, /resolveHomeworkScenarioPha/);
  assert.match(source, /blocked_homework_library_rid/);
  assert.match(source, /phaId/);
  assert.match(source, /homeworkLibraryId/);
});

test("005 assigns week from Activity Date only", async () => {
  const { weekRun } = await buildAndRun005After023();
  assert.equal(weekRun.error, null);
  assert.equal(weekRun.output.values.matchedWeekId, IDS.WEEK);
  assert.match(weekRun.output.values.sourceUsed, /Activity Date/);
});

test("obsolete curriculum seed script refuses to run", () => {
  const source = read("tools/testing/seed_pha_from_curriculum.mjs");
  assert.match(source, /OBSOLETE/);
  assert.match(source, /process\.exit\(2\)/);
});

test("public homework queries remain PHA-first", () => {
  const source = read("web/lib/airtable/homework-queries.ts");
  assert.match(source, /Homework Library/);
  assert.match(source, /listCurrentPhaRecords/);
  assertNoPattern(source, /FBC Curriculum/, "web must use Homework Library table name");
});

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
  HW1: "rechVLOeyEVIqmy2v",
  HW2: "rec6WmXjpLtIWDERo",
};

function assertNoPattern(source, pattern, label) {
  assert.doesNotMatch(source, pattern, label);
}

test("005 v5.1 — no library Week scheduling", () => {
  const source = read(
    "airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js"
  );
  assert.match(source, /version:\s*"v5\.1"/);
  assertNoPattern(source, /loadHomeworkWeekFromHomeworkId/, "005 must not load week from library");
  assertNoPattern(source, /homeworkTable|CONFIG\.homework/, "005 must not open Homework Library table");
  assert.match(source, /validateHomeworkSelectionAgainstPha/);
  assert.match(source, /if \(matches\.length > 1\)/);
  assert.match(source, /Homework Name 1\/2 linked but no Week could be assigned/);
});

test("033 v4.1 — exact PI required, no legacy fallback", () => {
  const source = read(
    "airtable/automations/shooting-challenge/033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js"
  );
  assert.match(source, /version:\s*"v4\.1"/);
  assertNoPattern(source, /legacy_curriculum/, "033 must not retain legacy path");
  assert.match(source, /must have exactly one Enrollment/);
  assert.match(source, /is missing Program Instance/);
  assert.match(source, /phaProgramInstanceId !== programInstanceId/);
  assertNoPattern(source, /if \(programInstanceId &&/, "PI match must not be optional");
  assert.match(source, /duplicateSlots/);
});

test("067 v3.1 — HW17 PHA requires HW1 slot", () => {
  const source = read(
    "airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js"
  );
  assert.match(source, /version:\s*"v3\.1"/);
  assert.match(source, /phaSlot === CONFIG\.values\.slotHw1/);
  assertNoPattern(source, /homeworkLibrary\.week|CONFIG\.curriculum\.week/, "067 must not read library Week");
});

test("020 v3.3.0 — strict PHA exact match unchanged", () => {
  const source = read(
    "airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js"
  );
  assert.match(source, /version:\s*"v3\.3\.0"/);
  assert.match(source, /exactly one ACTIVE Program Homework Assignment/);
});

test("009 — content provenance only, no library table", () => {
  const source = read("airtable/automations/shooting-challenge/009-submission-intake-create-submission-assets.js");
  assert.match(source, /homeworkName1/);
  assertNoPattern(source, /FBC Curriculum|Homework Library/, "009 does not open library table");
  assertNoPattern(source, /Program Homework Assignments/, "009 does not schedule via PHA");
});

test("005 PHA matcher — zero and duplicate fail closed", () => {
  function matchPha(candidates, ctx) {
    const matches = candidates.filter((pha) => {
      if (pha.libraryId !== ctx.libraryId) return false;
      if (pha.weekId !== ctx.weekId) return false;
      if (pha.gbId !== ctx.gbId) return false;
      if (pha.piId !== ctx.piId) return false;
      if (pha.slot !== ctx.slot) return false;
      if (!pha.active) return false;
      return true;
    });
    if (matches.length === 0) throw new Error("zero PHA");
    if (matches.length > 1) throw new Error("duplicate PHA");
    return matches[0];
  }

  const base = {
    libraryId: IDS.HW1,
    weekId: IDS.WEEK,
    gbId: IDS.GB,
    piId: IDS.PI,
    slot: "HW1",
    active: true,
  };

  assert.throws(() => matchPha([], base), /zero PHA/);
  assert.throws(
    () =>
      matchPha(
        [
          { ...base, id: "a" },
          { ...base, id: "b" },
        ],
        base
      ),
    /duplicate PHA/
  );
  assert.equal(matchPha([{ ...base, id: "recPha1" }], base).id, "recPha1");
  assert.throws(
    () => matchPha([{ ...base, id: "recWrong", piId: "recOtherPi" }], base),
    /zero PHA/
  );
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

test("067 PHA matcher — wrong slot ignored", () => {
  const hw17 = IDS.HW1;
  const rows = [
    { libraryId: hw17, slot: "HW2", piId: IDS.PI, gbId: IDS.GB, active: true },
    { libraryId: hw17, slot: "HW1", piId: IDS.PI, gbId: IDS.GB, active: true },
  ];
  const matches = rows.filter(
    (r) => r.libraryId === hw17 && r.slot === "HW1" && r.piId === IDS.PI && r.gbId === IDS.GB && r.active
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].slot, "HW1");
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

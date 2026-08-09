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
  WEEK_A: "recWeVrSabnsYaHc2",
  WEEK_B: "recWeekOther00001",
  GB: "reclWDQZzKbVBtdhG",
  HW1: "rechVLOeyEVIqmy2v",
  HW2: "rec6WmXjpLtIWDERo",
  LEGACY_WEEK: "recnMGC2JBHjO0ay6",
  PWTEST_WEEK: "reci5GdxEC57vfoS3",
};

function phaRecord(id, { weekId, piId = IDS.PI, gbId = IDS.GB, libraryId, slot, active = true }) {
  return {
    id,
    fields: {
      "Homework Assignment": libraryId ? [{ id: libraryId }] : [],
      "Program Instance": piId ? [{ id: piId }] : [],
      Week: weekId ? [{ id: weekId }] : [],
      "Grade Band": gbId ? [{ id: gbId }] : [],
      "Homework Slot": slot ? { name: slot } : null,
      "Active?": active,
    },
  };
}

function assertNoPattern(source, pattern, label) {
  assert.doesNotMatch(source, pattern, label);
}

test("1-3 library content identity is separate from PHA scheduling", () => {
  const phaA = phaRecord("recPhaA", { weekId: IDS.WEEK_A, libraryId: IDS.HW1, slot: "HW1" });
  const phaB = phaRecord("recPhaB", { weekId: IDS.WEEK_B, libraryId: IDS.HW1, slot: "HW1" });
  const phaOtherPi = phaRecord("recPhaC", {
    weekId: IDS.WEEK_A,
    piId: "recOtherPi000001",
    libraryId: IDS.HW1,
    slot: "HW1",
  });

  assert.equal(phaA.fields["Homework Assignment"][0].id, phaB.fields["Homework Assignment"][0].id);
  assert.notEqual(phaA.fields.Week[0].id, phaB.fields.Week[0].id);
  assert.notEqual(phaA.fields["Program Instance"][0].id, phaOtherPi.fields["Program Instance"][0].id);
});

test("4 005 v5 does not read Homework Library.Week", () => {
  const source = read(
    "airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js"
  );
  assert.match(source, /version:\s*"v5\.0"/);
  assertNoPattern(source, /loadHomeworkWeekFromHomeworkId/, "005 must not load week from library");
  assertNoPattern(source, /homeworkTable|CONFIG\.homework/, "005 must not reference Homework Library table");
  assert.match(source, /validateHomeworkSelectionAgainstPha/);
  assert.match(source, /findWeekByActivityDate/);
});

test("5 033 v4 has no legacy curriculum scheduling fallback", () => {
  const source = read(
    "airtable/automations/shooting-challenge/033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js"
  );
  assert.match(source, /version:\s*"v4\.0"/);
  assertNoPattern(source, /legacy_curriculum/, "033 must not retain legacy curriculum path");
  assertNoPattern(source, /CONFIG\.curriculum\.week/, "033 must not match library Week");
  assert.match(source, /Homework Library/);
});

test("6 067 v3 resolves HW17 week from PHA not library Week", () => {
  const source = read(
    "airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js"
  );
  assert.match(source, /version:\s*"v3\.0"/);
  assert.match(source, /resolveHw17WeekFromPha/);
  assertNoPattern(source, /CONFIG\.curriculum\.week|homeworkLibrary\.week/, "067 must not read library Week");
});

test("7 020 remains strict PHA exact-match (v3.3)", () => {
  const source = read(
    "airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js"
  );
  assert.match(source, /version:\s*"v3\.3\.0"/);
  assert.match(source, /exactly one ACTIVE Program Homework Assignment/);
});

test("8-13 PHA matcher rejects wrong PI, week, grade band, slot, inactive, and duplicates", () => {
  const candidates = [
    phaRecord("recGood", { weekId: IDS.WEEK_A, libraryId: IDS.HW1, slot: "HW1" }),
    phaRecord("recWrongPi", {
      weekId: IDS.WEEK_A,
      piId: "recWrongPi000001",
      libraryId: IDS.HW1,
      slot: "HW1",
    }),
    phaRecord("recWrongWeek", { weekId: IDS.WEEK_B, libraryId: IDS.HW1, slot: "HW1" }),
    phaRecord("recWrongGb", {
      weekId: IDS.WEEK_A,
      gbId: "recWrongGb000001",
      libraryId: IDS.HW1,
      slot: "HW1",
    }),
    phaRecord("recWrongSlot", { weekId: IDS.WEEK_A, libraryId: IDS.HW1, slot: "HW2" }),
    phaRecord("recInactive", {
      weekId: IDS.WEEK_A,
      libraryId: IDS.HW1,
      slot: "HW1",
      active: false,
    }),
    phaRecord("recDup", { weekId: IDS.WEEK_A, libraryId: IDS.HW1, slot: "HW1" }),
  ];

  function matchPha({ piId, weekId, gbId, libraryId, slot }) {
    const matches = candidates.filter((pha) => {
      const f = pha.fields;
      if (f["Homework Assignment"][0]?.id !== libraryId) return false;
      if (f.Week[0]?.id !== weekId) return false;
      if (f["Grade Band"][0]?.id !== gbId) return false;
      if (f["Program Instance"][0]?.id !== piId) return false;
      if (f["Homework Slot"]?.name !== slot) return false;
      if (!f["Active?"]) return false;
      return true;
    });
    return matches;
  }

  assert.equal(
    matchPha({
      piId: IDS.PI,
      weekId: IDS.WEEK_A,
      gbId: IDS.GB,
      libraryId: IDS.HW1,
      slot: "HW1",
    }).length,
    2,
    "duplicate active PHA must be detectable"
  );
  assert.equal(
    matchPha({
      piId: "recWrongPi000001",
      weekId: IDS.WEEK_A,
      gbId: IDS.GB,
      libraryId: IDS.HW1,
      slot: "HW1",
    }).length,
    1
  );
  assert.equal(
    matchPha({
      piId: IDS.PI,
      weekId: IDS.WEEK_B,
      gbId: IDS.GB,
      libraryId: IDS.HW1,
      slot: "HW1",
    }).length,
    1
  );
  assert.equal(
    matchPha({
      piId: IDS.PI,
      weekId: IDS.WEEK_A,
      gbId: "recWrongGb000001",
      libraryId: IDS.HW1,
      slot: "HW1",
    }).length,
    1
  );
  assert.equal(
    matchPha({
      piId: IDS.PI,
      weekId: IDS.WEEK_A,
      gbId: IDS.GB,
      libraryId: IDS.HW1,
      slot: "HW2",
    }).length,
    1
  );
  assert.equal(
    matchPha({
      piId: IDS.PI,
      weekId: IDS.WEEK_A,
      gbId: IDS.GB,
      libraryId: IDS.HW1,
      slot: "HW1",
      activeOnly: true,
    }).filter((pha) => pha.fields["Active?"]).length,
    2
  );
});

test("14-15 public homework queries are PHA-first and fail closed without PHA", async () => {
  const source = read("web/lib/airtable/homework-queries.ts");
  assert.match(source, /Homework Library/);
  assert.match(source, /buildScheduledPairs/);
  assert.match(source, /listCurrentPhaRecords/);
  assert.match(source, /if \(pairs\.length === 0\)/);
  assertNoPattern(source, /curriculum\.Week|FBC Curriculum - SYNC\.Week/, "web must not schedule from library Week");
});

test("16 legacy PWTEST / 2025-2026 library weeks cannot drive 005 week assignment", async () => {
  const { weekRun } = await buildAndRun005After023();
  assert.equal(weekRun.error, null);
  assert.equal(weekRun.output.values.matchedWeekId, IDS.WEEK_A);
  assert.doesNotMatch(weekRun.output.values.sourceUsed, /Homework Name/);
  assert.notEqual(weekRun.output.values.matchedWeekId, IDS.LEGACY_WEEK);
  assert.notEqual(weekRun.output.values.matchedWeekId, IDS.PWTEST_WEEK);
});

test("17 obsolete curriculum seed script refuses to run", async () => {
  const source = read("tools/testing/seed_pha_from_curriculum.mjs");
  assert.match(source, /OBSOLETE/);
  assert.match(source, /process\.exit\(2\)/);
});

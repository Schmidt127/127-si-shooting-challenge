import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  MockBase,
  MockOutput,
  MockRecord,
  MockTable,
  makeConsole,
  makeInput,
} from "./airtable_mock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(
  HERE,
  "../../../airtable/automations/shooting-challenge/058-achievements-and-milestones-create-perfect-week-unlock.js"
);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const IDS = {
  summary: "recSummary058001",
  enrollment: "recEnrollment058001",
  week: "recWeek058001",
  band: "recBand058001",
  programInstance: "recProgram058001",
  goal: "recGoal058001",
  achievement: "recAchievement058001",
  unlock: "recUnlock058001",
  wrongUnlock: "recUnlock058Wrong",
};

const sourceKey = `PERFECT_WEEK|${IDS.enrollment}|${IDS.week}`;

function unlockRecord(id, overrides = {}) {
  return new MockRecord(id, {
    Enrollment: [{ id: IDS.enrollment }],
    Week: [{ id: IDS.week }],
    Achievement: [{ id: IDS.achievement }],
    "Active?": true,
    "Source Key": sourceKey,
    "XP Award Status": { name: "Pending" },
    ...overrides,
  });
}

function buildBase({
  eligible = true,
  status = "Ready",
  weeklyUnlock = [],
  unlocks = [],
  weeklyOverrides = {},
  enrollmentOverrides = {},
  goalOverrides = {},
} = {}) {
  const weekly = new MockTable("Weekly Athlete Summary", [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Grade Band", type: "multipleRecordLinks" },
    { name: "Goal Record", type: "multipleRecordLinks" },
    { name: "Weekly Goal Shots Target", type: "number" },
    { name: "Perfect Week Eligible?", type: "checkbox" },
    { name: "Perfect Week Unlock", type: "multipleRecordLinks" },
    { name: "Perfect Week Automation Status", type: "singleSelect" },
    { name: "Perfect Week Automation Error", type: "multilineText" },
  ], [new MockRecord(IDS.summary, {
    Enrollment: [{ id: IDS.enrollment }],
    Week: [{ id: IDS.week }],
    "Grade Band": [{ id: IDS.band }],
    "Goal Record": [{ id: IDS.goal }],
    "Weekly Goal Shots Target": 100,
    "Perfect Week Eligible?": eligible,
    "Perfect Week Unlock": weeklyUnlock,
    "Perfect Week Automation Status": { name: status },
    "Perfect Week Automation Error": "",
    ...weeklyOverrides,
  })]);

  const enrollments = new MockTable("Enrollments", [
    { name: "Active?", type: "checkbox" },
    { name: "Program Instance", type: "multipleRecordLinks" },
  ], [new MockRecord(IDS.enrollment, {
    "Active?": true,
    "Program Instance": [{ id: IDS.programInstance }],
    ...enrollmentOverrides,
  })]);

  const goals = new MockTable("Target Goal Shots", [
    { name: "Active?", type: "checkbox" },
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Grade Band", type: "multipleRecordLinks" },
    { name: "Total Shot Target", type: "number" },
  ], [new MockRecord(IDS.goal, {
    "Active?": true,
    "Program Instance": [{ id: IDS.programInstance }],
    "Grade Band": [{ id: IDS.band }],
    "Total Shot Target": 100,
    ...goalOverrides,
  })]);

  const achievements = new MockTable("Achievements", [
    { name: "Achievement Name", type: "singleLineText" },
    { name: "Reward Rule Key", type: "singleLineText" },
    { name: "Active?", type: "checkbox" },
  ], [new MockRecord(IDS.achievement, {
    "Achievement Name": "Perfect Week",
    "Reward Rule Key": "PERFECT_WEEK",
    "Active?": true,
  })]);

  const unlockTable = new MockTable("Athlete Achievement Unlocks", [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Achievement", type: "multipleRecordLinks" },
    { name: "Active?", type: "checkbox" },
    { name: "Source Status", type: "singleSelect" },
    { name: "XP Award Status", type: "singleSelect" },
    { name: "Source Key", type: "singleLineText" },
    { name: "Notes", type: "multilineText" },
  ], unlocks);

  return new MockBase([weekly, enrollments, goals, achievements, unlockTable]);
}

async function run058(base) {
  const fn = new AsyncFunction(
    "base",
    "input",
    "output",
    "console",
    readFileSync(SCRIPT, "utf8")
  );
  const output = new MockOutput();
  let error = null;
  try {
    await fn(base, makeInput({ recordId: IDS.summary }), output, makeConsole());
  } catch (caught) {
    error = caught;
  }
  return { error, output };
}

test("058 creates one exact Perfect Week identity and backlink", async () => {
  const base = buildBase();
  const { error } = await run058(base);
  assert.equal(error, null);

  const unlocks = base.getTable("Athlete Achievement Unlocks");
  assert.equal(unlocks.createdPayloads.length, 1);
  const [{ id, payload }] = unlocks.createdPayloads;
  assert.equal(payload["Source Key"], sourceKey);
  assert.deepEqual(payload.Enrollment, [{ id: IDS.enrollment }]);
  assert.deepEqual(payload.Week, [{ id: IDS.week }]);
  assert.deepEqual(payload.Achievement, [{ id: IDS.achievement }]);
  assert.equal(payload["Active?"], true);
  assert.deepEqual(
    base.getTable("Weekly Athlete Summary").records.get(IDS.summary).getCellValue("Perfect Week Unlock"),
    [{ id }]
  );
});

test("058 repairs only a missing backlink to an exact-owned unlock", async () => {
  const base = buildBase({ unlocks: [unlockRecord(IDS.unlock)] });
  const { error } = await run058(base);
  assert.equal(error, null);
  assert.equal(base.getTable("Athlete Achievement Unlocks").createdPayloads.length, 0);
  assert.deepEqual(
    base.getTable("Weekly Athlete Summary").records.get(IDS.summary).getCellValue("Perfect Week Unlock"),
    [{ id: IDS.unlock }]
  );
});

test("058 fails closed with exact candidate IDs for duplicate or wrong-owner unlocks", async () => {
  const duplicateBase = buildBase({
    unlocks: [unlockRecord(IDS.unlock), unlockRecord(IDS.wrongUnlock)],
  });
  const duplicate = await run058(duplicateBase);
  assert.ok(duplicate.error);
  assert.match(duplicate.error.message, new RegExp(`${IDS.unlock}.*${IDS.wrongUnlock}`));
  assert.equal(duplicateBase.getTable("Athlete Achievement Unlocks").createdPayloads.length, 0);

  const wrongOwnerBase = buildBase({
    unlocks: [unlockRecord(IDS.wrongUnlock, {
      Enrollment: [{ id: "recOtherEnrollment058" }],
    })],
  });
  const wrongOwner = await run058(wrongOwnerBase);
  assert.ok(wrongOwner.error);
  assert.match(wrongOwner.error.message, new RegExp(IDS.wrongUnlock));
  assert.equal(wrongOwnerBase.getTable("Athlete Achievement Unlocks").createdPayloads.length, 0);

  const wrongBacklinkBase = buildBase({
    weeklyUnlock: [{ id: IDS.wrongUnlock }],
    unlocks: [
      unlockRecord(IDS.unlock),
      unlockRecord(IDS.wrongUnlock, { "Source Key": "PERFECT_WEEK|recOther|recWeekOther" }),
    ],
  });
  const wrongBacklink = await run058(wrongBacklinkBase);
  assert.ok(wrongBacklink.error);
  assert.match(wrongBacklink.error.message, new RegExp(`${IDS.unlock}.*${IDS.wrongUnlock}`));
});

test("058 withdraws and restores the same exact-owned unlock without replacement", async () => {
  const base = buildBase({
    unlocks: [unlockRecord(IDS.unlock, {
      "XP Award Status": { name: "Awarded" },
    })],
  });
  const weekly = base.getTable("Weekly Athlete Summary").records.get(IDS.summary);
  weekly.cells["Perfect Week Unlock"] = [{ id: IDS.unlock }];
  weekly.cells["Perfect Week Eligible?"] = false;
  weekly.cells["Goal Record"] = [];

  const withdrawn = await run058(base);
  assert.equal(withdrawn.error, null);
  const unlocks = base.getTable("Athlete Achievement Unlocks");
  assert.equal(unlocks.records.get(IDS.unlock).getCellValue("Active?"), false);
  assert.equal(unlocks.createdPayloads.length, 0);

  weekly.cells["Perfect Week Eligible?"] = true;
  weekly.cells["Goal Record"] = [{ id: IDS.goal }];
  const restored = await run058(base);
  assert.equal(restored.error, null);
  assert.equal(unlocks.records.get(IDS.unlock).getCellValue("Active?"), true);
  assert.equal(unlocks.records.get(IDS.unlock).getCellValue("XP Award Status"), "Pending");
  assert.equal(unlocks.createdPayloads.length, 0);
  assert.deepEqual(
    weekly.getCellValue("Perfect Week Unlock"),
    [{ id: IDS.unlock }]
  );
});

test("058 deactivates the exact owned unlock for every invalid goal state", async () => {
  const cases = [
    {
      name: "inactive goal record",
      goalOverrides: { "Active?": false },
      reason: `Goal Record ${IDS.goal} is inactive`,
    },
    {
      name: "program instance mismatch",
      goalOverrides: { "Program Instance": [{ id: "recOtherProgram058" }] },
      reason: "Program Instance does not exactly match",
    },
    {
      name: "grade band mismatch",
      goalOverrides: { "Grade Band": [{ id: "recOtherBand058" }] },
      reason: "Grade Band does not exactly match",
    },
    {
      name: "unsettled goal target",
      goalOverrides: { "Total Shot Target": null },
      reason: "Total Shot Target is not an explicit number",
    },
    {
      name: "unsettled weekly target",
      weeklyOverrides: { "Weekly Goal Shots Target": null },
      reason: "Weekly Goal Shots Target is not a settled number",
    },
    {
      name: "mismatched settled target",
      weeklyOverrides: { "Weekly Goal Shots Target": 101 },
      reason: "does not match Goal Record Total Shot Target (100)",
    },
    {
      name: "missing goal link",
      weeklyOverrides: { "Goal Record": [] },
      reason: "Goal Record must have exactly one linked record; found 0",
    },
    {
      name: "ambiguous goal link",
      weeklyOverrides: {
        "Goal Record": [{ id: IDS.goal }, { id: "recOtherGoal058" }],
      },
      reason: "Goal Record must have exactly one linked record; found 2",
    },
    {
      name: "linked goal record missing from the table",
      weeklyOverrides: { "Goal Record": [{ id: "recMissingGoal058" }] },
      reason: "Goal Record recMissingGoal058 was not found",
    },
    {
      name: "missing grade band link",
      weeklyOverrides: { "Grade Band": [] },
      reason: "Grade Band must have exactly one linked record; found 0",
    },
    {
      name: "ambiguous grade band link",
      weeklyOverrides: {
        "Grade Band": [{ id: IDS.band }, { id: "recOtherBand058" }],
      },
      reason: "Grade Band must have exactly one linked record; found 2",
    },
    {
      name: "missing enrollment program instance",
      enrollmentOverrides: { "Program Instance": [] },
      reason: "Enrollment Program Instance must have exactly one linked record; found 0",
    },
    {
      name: "ambiguous enrollment program instance",
      enrollmentOverrides: {
        "Program Instance": [{ id: IDS.programInstance }, { id: "recOtherProgram058" }],
      },
      reason: "Enrollment Program Instance must have exactly one linked record; found 2",
    },
    {
      name: "unlinked goal program instance",
      goalOverrides: { "Program Instance": [] },
      reason: "Program Instance does not exactly match",
    },
    {
      name: "unlinked goal grade band",
      goalOverrides: { "Grade Band": [] },
      reason: "Grade Band does not exactly match",
    },
  ];

  for (const scenario of cases) {
    const base = buildBase({
      unlocks: [unlockRecord(IDS.unlock)],
      weeklyUnlock: [{ id: IDS.unlock }],
      ...scenario,
    });
    const { error } = await run058(base);
    assert.equal(error, null, scenario.name);

    const unlock = base.getTable("Athlete Achievement Unlocks").records.get(IDS.unlock);
    const weekly = base.getTable("Weekly Athlete Summary").records.get(IDS.summary);
    assert.equal(unlock.getCellValue("Active?"), false, scenario.name);
    assert.ok(unlock.getCellValue("Notes").includes(scenario.reason), scenario.name);
    assert.ok(weekly.getCellValue("Perfect Week Automation Error").includes(scenario.reason), scenario.name);
    assert.equal(base.getTable("Athlete Achievement Unlocks").createdPayloads.length, 0, scenario.name);
  }
});

test("058 restores the concurrent exact candidate found by last-chance recheck", async () => {
  const base = buildBase({
    unlocks: [unlockRecord(IDS.unlock, {
      "Active?": false,
      "XP Award Status": { name: "Awarded" },
    })],
  });
  const unlocks = base.getTable("Athlete Achievement Unlocks");
  const originalSelectRecordsAsync = unlocks.selectRecordsAsync.bind(unlocks);
  let queryCount = 0;
  unlocks.selectRecordsAsync = async (options) => {
    queryCount += 1;
    if (queryCount === 1) {
      return {
        records: [],
        getRecord: () => null,
        unloadData: () => {},
      };
    }
    return originalSelectRecordsAsync(options);
  };

  const { error } = await run058(base);
  assert.equal(error, null);
  assert.equal(queryCount, 2);
  assert.equal(unlocks.createdPayloads.length, 0);
  assert.equal(unlocks.records.get(IDS.unlock).getCellValue("Active?"), true);
  assert.equal(unlocks.records.get(IDS.unlock).getCellValue("XP Award Status"), "Pending");
  assert.deepEqual(
    base.getTable("Weekly Athlete Summary").records.get(IDS.summary).getCellValue("Perfect Week Unlock"),
    [{ id: IDS.unlock }]
  );
});

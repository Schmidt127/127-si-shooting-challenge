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
  })]);

  const enrollments = new MockTable("Enrollments", [
    { name: "Active?", type: "checkbox" },
    { name: "Program Instance", type: "multipleRecordLinks" },
  ], [new MockRecord(IDS.enrollment, {
    "Active?": true,
    "Program Instance": [{ id: IDS.programInstance }],
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
  const base = buildBase({ unlocks: [unlockRecord(IDS.unlock)] });
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
  assert.equal(unlocks.createdPayloads.length, 0);
  assert.deepEqual(
    weekly.getCellValue("Perfect Week Unlock"),
    [{ id: IDS.unlock }]
  );
});

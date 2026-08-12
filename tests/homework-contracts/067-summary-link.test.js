#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const scriptPath = path.resolve(
  __dirname,
  "../../airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js"
);
const source = fs.readFileSync(scriptPath, "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

class MockRecord {
  constructor(id, fields) {
    this.id = id;
    this.fields = { ...fields };
  }

  getCellValue(fieldName) {
    return this.fields[fieldName] ?? null;
  }
}

class MockTable {
  constructor(name, fields, records = []) {
    this.name = name;
    this.fields = fields;
    this.records = new Map(records.map((record) => [record.id, record]));
    this.createdPayloads = [];
    this.updates = [];
  }

  async selectRecordAsync(recordId) {
    return this.records.get(recordId) || null;
  }

  async selectRecordsAsync() {
    return { records: [...this.records.values()] };
  }

  async createRecordAsync(fields) {
    const recordId = `recCreated${this.createdPayloads.length + 1}`;
    this.createdPayloads.push(fields);
    this.records.set(recordId, new MockRecord(recordId, fields));
    return recordId;
  }

  async updateRecordAsync(recordId, fields) {
    this.updates.push({ recordId, fields });
    const record = this.records.get(recordId);
    if (record) Object.assign(record.fields, fields);
  }
}

class MockBase {
  constructor(tables) {
    this.tables = new Map(tables.map((table) => [table.name, table]));
  }

  getTable(name) {
    return this.tables.get(name);
  }
}

function link(id, name = id) {
  return [{ id, name }];
}

function field(name, type = "multipleRecordLinks", options) {
  return { name, type, ...(options ? { options } : {}) };
}

function buildBase({ summaries = [], homework = [], quizFields = {} } = {}) {
  const choiceField = (name, choices) =>
    field(name, "singleSelect", { choices: choices.map((name) => ({ name })) });
  const homeworkTable = new MockTable(
    "Homework Completions",
    [
      field("Enrollment"),
      field("Homework"),
      field("Week"),
      field("Grade Band"),
      field("Final Reflection Quiz Submissions"),
      choiceField("Source System", ["Fillout"]),
      choiceField("Item Type", ["Homework"]),
      choiceField("Completion Status", ["Submitted"]),
      choiceField("Review Status", ["Ready for Review"]),
      field("Submission Date", "date"),
      field("Submission Assets"),
      field("Submissions - Linked"),
      field("Weekly Athlete Summary Link"),
      choiceField("Item Slot", ["HW1"]),
      choiceField("Asset Slot", ["HW1"]),
    ],
    homework
  );
  return new MockBase([
    new MockTable(
      "Final Reflection Quiz Submissions",
      [
        field("Enrollment"),
        field("Homework Completion"),
        field("Submitted At", "date"),
        choiceField("Processing Status", ["Processed", "Needs Review", "Error"]),
        field("Processing Error", "singleLineText"),
      ],
      [
        new MockRecord("recQuiz067", {
          Enrollment: link("recEnrollment067", "Schmidt"),
          "Homework Completion": [],
          "Submitted At": "2026-08-07T12:00:00.000Z",
          ...quizFields,
        }),
      ]
    ),
    homeworkTable,
    new MockTable(
      "Homework Library",
      [
        field("Homework Number", "singleLineText"),
        field("Active?", "checkbox"),
      ],
      [
        new MockRecord("recHw17", {
          "Homework Number": { name: "HW 17" },
          "Active?": true,
        }),
      ]
    ),
    new MockTable(
      "Program Homework Assignments",
      [
        field("Homework Assignment"),
        field("Program Instance"),
        field("Week"),
        field("Grade Band"),
        field("Homework Slot", "singleSelect", { choices: [{ name: "HW1" }, { name: "HW2" }] }),
        field("Active?", "checkbox"),
      ],
      [
        new MockRecord("recPhaHw17", {
          "Homework Assignment": link("recHw17", "HW 17"),
          "Program Instance": link("recPi067", "PI"),
          Week: link("recWeek067", "Week 10"),
          "Grade Band": link("recGb067", "3-4"),
          "Homework Slot": { name: "HW1" },
          "Active?": true,
        }),
      ]
    ),
    new MockTable(
      "Enrollments",
      [field("Grade Band"), field("Program Instance")],
      [
        new MockRecord("recEnrollment067", {
          "Grade Band": link("recGb067", "3-4"),
          "Program Instance": link("recPi067", "PI"),
        }),
      ]
    ),
    new MockTable("Submissions", [field("Enrollment"), field("Week"), field("Homework Name 1"), field("HW Sub 1"), field("Submission Assets")]),
    new MockTable("Submission Assets", [field("Enrollment - Linked"), field("Submission - Linked"), field("Airtable Attachment"), field("Source Attachment ID")]),
    new MockTable(
      "Weekly Athlete Summary",
      [field("Enrollment"), field("Week")],
      summaries
    ),
  ]);
}

async function run067(base) {
  const outputValues = {};
  const code = fs.readFileSync(scriptPath, "utf8");
  const fn = new AsyncFunction(
    "base",
    "input",
    "output",
    "console",
    code
  );
  const output = { set: (name, value) => { outputValues[name] = value; } };
  let error = null;
  try {
    await fn(
      base,
      { config: () => ({ recordId: "recQuiz067" }) },
      output,
      { log: () => {} }
    );
  } catch (caught) {
    error = caught;
  }
  return { error, outputValues };
}

function canonicalSummary(id = "recSummary067") {
  return new MockRecord(id, {
    Enrollment: link("recEnrollment067", "Schmidt"),
    Week: link("recWeek067", "Week 10"),
  });
}

test("067 behaviorally links one existing canonical summary", async () => {
  const base = buildBase({ summaries: [canonicalSummary()] });
  const result = await run067(base);
  const homework = base.getTable("Homework Completions");
  const created = homework.records.get("recCreated1");
  assert.equal(result.error, null);
  assert.deepEqual(created.fields["Weekly Athlete Summary Link"], [{ id: "recSummary067" }]);
  assert.equal(result.outputValues.weeklySummaryLinkStatus, "linked");
});

test("067 behaviorally defers safely when no canonical summary exists", async () => {
  const base = buildBase();
  const result = await run067(base);
  assert.equal(result.error, null);
  assert.equal(result.outputValues.weeklySummaryLinkStatus, "deferred_no_canonical_summary");
  assert.deepEqual(
    base.getTable("Homework Completions").records.get("recCreated1").fields["Weekly Athlete Summary Link"],
    null
  );
});

test("067 fails closed on two canonical summaries before any completion write", async () => {
  const base = buildBase({
    summaries: [canonicalSummary("recSummary067A"), canonicalSummary("recSummary067B")],
  });
  const result = await run067(base);
  assert.ok(result.error);
  assert.match(result.error.message, /Multiple Weekly Athlete Summary/);
  assert.equal(base.getTable("Homework Completions").createdPayloads.length, 0);
  assert.equal(base.getTable("Homework Completions").updates.length, 0);
});

test("067 does not write when completion already has the canonical summary", async () => {
  const base = buildBase({
    summaries: [canonicalSummary()],
    homework: [
      new MockRecord("recHomework067", {
        Enrollment: link("recEnrollment067", "Schmidt"),
        Homework: link("recHw17", "HW 17"),
        Week: link("recWeek067", "Week 10"),
        "Weekly Athlete Summary Link": link("recSummary067"),
        "Final Reflection Quiz Submissions": link("recQuiz067"),
      }),
    ],
    quizFields: { "Homework Completion": link("recHomework067") },
  });
  const result = await run067(base);
  assert.equal(result.error, null);
  assert.equal(base.getTable("Homework Completions").updates.length, 0);
});

test("067 retry links a deferred completion after the canonical summary appears", async () => {
  const base = buildBase();
  const first = await run067(base);
  assert.equal(first.error, null);
  const summaries = base.getTable("Weekly Athlete Summary");
  summaries.records.set("recSummary067", canonicalSummary());
  const second = await run067(base);
  assert.equal(second.error, null);
  assert.equal(second.outputValues.weeklySummaryLinkStatus, "linked");
  assert.deepEqual(
    base.getTable("Homework Completions").records.get("recCreated1").fields["Weekly Athlete Summary Link"],
    [{ id: "recSummary067" }]
  );
});

test("067 keeps XP ownership outside the reflection bridge", () => {
  assert.doesNotMatch(source, /xpEvents\s*:/);
  assert.doesNotMatch(source, /["']XP Events["']/);
  assert.doesNotMatch(source, /HOMEWORK_XP\|/);
});

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`FAIL - ${name}`);
      throw error;
    }
  }
  console.log("067 summary-link behavioral tests passed");
})();

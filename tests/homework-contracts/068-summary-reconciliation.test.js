#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const scriptPath = path.resolve(
  __dirname,
  "../../airtable/automations/shooting-challenge/068-homework-reconcile-deferred-weekly-summary-links.js"
);
const source = fs.readFileSync(scriptPath, "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

class RecordMock {
  constructor(id, fields) {
    this.id = id;
    this.fields = { ...fields };
  }
  getCellValue(name) {
    return this.fields[name] ?? null;
  }
}

class TableMock {
  constructor(name, fields, records) {
    this.name = name;
    this.fields = fields.map((field) => ({ name: field }));
    this.records = new Map(records.map((record) => [record.id, record]));
    this.updates = [];
  }
  async selectRecordsAsync() {
    return { records: [...this.records.values()] };
  }
  async updateRecordAsync(id, fields) {
    this.updates.push({ id, fields });
    Object.assign(this.records.get(id).fields, fields);
  }
}

function link(id) {
  return [{ id }];
}

function summary(id) {
  return new RecordMock(id, { Enrollment: link("recEnrollment"), Week: link("recWeek") });
}

function buildBase(summaries = [], homeworkSummary = []) {
  const curriculum = new TableMock("FBC Curriculum - SYNC", [
    "Homework Number",
    "Active?",
    "Week",
  ], [new RecordMock("recHw17", {
    "Homework Number": { name: "HW 17" },
    "Active?": true,
    Week: link("recWeek"),
  })]);
  const homework = new TableMock("Homework Completions", [
    "Enrollment",
    "Week",
    "Homework",
    "Weekly Athlete Summary Link",
  ], [new RecordMock("recCompletion", {
    Enrollment: link("recEnrollment"),
    Week: link("recWeek"),
    Homework: link("recHw17"),
    "Weekly Athlete Summary Link": homeworkSummary,
  })]);
  const weeklySummaries = new TableMock("Weekly Athlete Summary", [
    "Enrollment",
    "Week",
  ], summaries);
  return {
    tables: new Map([
      [curriculum.name, curriculum],
      [homework.name, homework],
      [weeklySummaries.name, weeklySummaries],
    ]),
  };
}

async function run(base) {
  const outputValues = {};
  const fn = new AsyncFunction("base", "output", "console", source);
  await fn(
    { getTable: (name) => base.tables.get(name) },
    { set: (name, value) => { outputValues[name] = value; } },
    { log() {} }
  );
  return outputValues;
}

(async () => {
  {
    const base = buildBase([summary("recSummary")]);
    const output = await run(base);
    assert.equal(output.actionOut, "linked_deferred");
    assert.deepEqual(
      base.tables.get("Homework Completions").records.get("recCompletion")
        .fields["Weekly Athlete Summary Link"],
      link("recSummary")
    );
    assert.equal(base.tables.get("Homework Completions").updates.length, 1);
  }

  {
    const base = buildBase([]);
    await run(base);
    assert.deepEqual(
      base.tables.get("Homework Completions").records.get("recCompletion")
        .fields["Weekly Athlete Summary Link"],
      []
    );
    assert.equal(base.tables.get("Homework Completions").updates.length, 0);
  }

  {
    const base = buildBase([summary("recSummaryA"), summary("recSummaryB")]);
    await run(base);
    assert.deepEqual(
      base.tables.get("Homework Completions").records.get("recCompletion")
        .fields["Weekly Athlete Summary Link"],
      []
    );
    assert.equal(base.tables.get("Homework Completions").updates.length, 0);
  }

  {
    const base = buildBase([summary("recSummary")], link("recSummary"));
    const output = await run(base);
    assert.equal(output.actionOut, "no_changes");
    assert.equal(base.tables.get("Homework Completions").updates.length, 0);
  }

  {
    const base = buildBase([summary("recSummary")]);
    await run(base);
    await run(base);
    assert.equal(base.tables.get("Homework Completions").updates.length, 1);
  }

  assert.doesNotMatch(source, /createRecordAsync/);
  assert.doesNotMatch(source, /getTable\(["']XP Events["']\)/);
  console.log("068 deferred-summary reconciliation behavioral tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

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

function summary(id, weekId = "recWeek9") {
  return new RecordMock(id, { Enrollment: link("recEnrollment"), Week: link(weekId) });
}

function buildBase(summaries = [], homeworkSummary = [], completionWeek = "recWeek9") {
  // The reusable curriculum record intentionally carries a stale/legacy Week 10 link.
  // 068 must ignore it and reconcile from the Homework Completion's season-scoped Week.
  const homeworkLibrary = new TableMock("Homework Library", [
    "Homework Number",
    "Active?",
    "Week",
  ], [new RecordMock("recHw17", {
    "Homework Number": { name: "HW 17" },
    "Active?": true,
    Week: link("recLegacyWeek10"),
  })]);
  const homework = new TableMock("Homework Completions", [
    "Enrollment",
    "Week",
    "Homework",
    "Weekly Athlete Summary Link",
  ], [new RecordMock("recCompletion", {
    Enrollment: link("recEnrollment"),
    Week: completionWeek ? link(completionWeek) : [],
    Homework: link("recHw17"),
    "Weekly Athlete Summary Link": homeworkSummary,
  })]);
  const weeklySummaries = new TableMock("Weekly Athlete Summary", [
    "Enrollment",
    "Week",
  ], summaries);
  return {
    tables: new Map([
      [homeworkLibrary.name, homeworkLibrary],
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
  assert.match(source, /Automation 068 is retired/);
  assert.match(source, /Automation 033 v4\.2/);
  console.log("068 retirement contract tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
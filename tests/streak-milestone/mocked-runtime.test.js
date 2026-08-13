#!/usr/bin/env node
"use strict";

// Offline Airtable-compatible lifecycle coverage. This executes the committed
// automation sources; it is not installed-Airtable or Production evidence.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "../..");
const source = (n) => fs.readFileSync(path.join(ROOT, "airtable/automations/shooting-challenge", n), "utf8");
const S053 = source("053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js");
const S054 = source("054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js");
const S059 = source("059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js");
const S066 = source("066-achievements-and-milestones-create-shot-milestone-unlocks.js");

const fieldNames = [...new Set([S053, S054, S059, S066].flatMap((text) =>
  [...text.matchAll(/"([^"\n]+)"/g)].map((match) => match[1])
))];
const selectFields = new Set(["Source Status", "XP Award Status", "XP Source", "XP Bucket", "XP Activity Date Source", "Trigger Type"]);
const formulaFields = new Set(["Count This Submission?"]);
const selectChoices = [...new Set([...fieldNames, "3-Day Streak", "Streak", "Streak End Date", "Automatic", "Awarded", "Shot Milestone", "Perfect Week", "Shot Milestone Activity Date", "Perfect Week End Date"])];
const tableNames = [
  "Submissions", "Achievements", "Streak Occurrences", "Weeks", "Enrollments",
  "XP Events", "XP Reward Rules", "Weekly Athlete Summary", "Athlete Achievement Unlocks",
  "Shot Milestones",
];
const link = (ids) => ids.map((id) => ({ id }));
const clone = (x) => x === undefined ? undefined : JSON.parse(JSON.stringify(x));

function runtime(seed) {
  const rows = Object.fromEntries(tableNames.map((name) => [name, new Map((seed[name] || []).map((r) => [r.id, clone(r)]))]));
  let counter = 1;
  const view = (row) => ({
    id: row.id, name: row.name || row.id, createdTime: row.createdTime,
    getCellValue: (name) => clone(row.fields[typeof name === "string" ? name : name?.name] ?? null),
    getCellValueAsString(name) {
      const value = this.getCellValue(name);
      return Array.isArray(value) ? value.map((x) => x.name || x.id).join(", ") : value?.name || String(value ?? "");
    },
  });
  const table = (name) => ({
    name,
    fields: fieldNames.map((field) => ({
      name: field,
      type: formulaFields.has(field) ? "formula" : selectFields.has(field) ? "singleSelect" : "singleLineText",
      isComputed: formulaFields.has(field),
      options: { choices: selectChoices.map((name) => ({ name })) },
    })),
    getField(field) { return this.fields.find((x) => x.name === field) || { name: field, type: formulaFields.has(field) ? "formula" : selectFields.has(field) ? "singleSelect" : "singleLineText", isComputed: formulaFields.has(field), options: { choices: selectChoices.map((name) => ({ name })) } }; },
    async selectRecordAsync(id) { const row = rows[name].get(id); return row ? view(row) : null; },
    async selectRecordsAsync() { return { records: [...rows[name].values()].map(view), unloadData() {} }; },
    async updateRecordAsync(id, fields) { Object.assign(rows[name].get(id).fields, clone(fields)); },
    async updateRecordsAsync(updates) { for (const update of updates) await this.updateRecordAsync(update.id, update.fields); },
    async createRecordAsync(fields) { const id = `recNew${counter++}`; rows[name].set(id, { id, fields: clone(fields) }); return id; },
    async createRecordsAsync(records) { for (const record of records) await this.createRecordAsync(record.fields); },
  });
  return {
    rows,
    async run(script, recordId) {
      const outputs = {};
      await vm.runInNewContext(`(async()=>{${script}})()`, {
        base: { getTable: table }, input: { config: () => ({ recordId }) },
        output: { set: (key, value) => { outputs[key] = value; } },
        console, Date, Intl, Promise, Map, Set, Object, String, Number, Array, Error,
      });
      return outputs;
    },
  };
}

function seed() {
  return {
    Enrollments: [{ id: "recEnrollment", fields: { "Active?": true, "Grade Band": link(["recGrade"]), "Program Instance": link(["recPi"]), "Run Shot Milestone Check?": true } }],
    Submissions: [
      { id: "recSub1", fields: { Enrollment: link(["recEnrollment"]), "Activity Date": "2026-08-01", "Total Shots Counted": 10, "Count This Submission?": 1 } },
      { id: "recSub2", fields: { Enrollment: link(["recEnrollment"]), "Activity Date": "2026-08-02", "Total Shots Counted": 10, "Count This Submission?": 1 } },
      { id: "recSub3", fields: { Enrollment: link(["recEnrollment"]), "Activity Date": "2026-08-03", "Total Shots Counted": 10, "Count This Submission?": 1 } },
    ],
    Achievements: [
      { id: "recStreakAchievement", fields: { "Active?": true, "Trigger Type": { name: "Streak Length" }, "Trigger Threshold": 3, "Achievement Name": "3-Day Streak", "Reward Rule Key": "STREAK_3DAY" } },
      { id: "recMilestoneAchievement", fields: { "Active?": true, "Achievement Name": "Shot Milestone", "Reward Rule Key": "SHOT_MILESTONE" } },
    ],
    Weeks: [{ id: "recWeek", fields: { "Start Date": "2026-08-01", "End Date": "2026-08-07", "Active Week?": true, "Program Instance": link(["recPi"]) } }],
    "XP Reward Rules": [{ id: "recRule", fields: { "Active?": true, "Rule Key": "STREAK_3DAY", "XP Amount": 25 } }, { id: "recMilestoneRule", fields: { "Active?": true, "Rule Key": "SHOT_MILESTONE", "XP Amount": 10 } }],
    "Shot Milestones": [{ id: "recM10", fields: { Active: true, "Active?": true, "Grade Band": link(["recGrade"]), "Milestone Shot Count": 10, "Points Awarded": 10 } }, { id: "recM20", fields: { Active: true, "Active?": true, "Grade Band": link(["recGrade"]), "Milestone Shot Count": 20, "Points Awarded": 20 } }],
    "Streak Occurrences": [], "Athlete Achievement Unlocks": [], "XP Events": [], "Weekly Athlete Summary": [],
  };
}

(async () => {
  const r = runtime(seed());
  await r.run(S053, "recSub3");
  const occurrence = [...r.rows["Streak Occurrences"].values()][0];
  assert.ok(occurrence);
  await r.run(S054, occurrence.id);
  const streakEvent = [...r.rows["XP Events"].values()][0];
  assert.equal(streakEvent.fields["Active?"], true);
  r.rows.Submissions.get("recSub2").fields["Count This Submission?"] = 0;
  await r.run(S053, "recSub2"); await r.run(S054, occurrence.id);
  assert.equal(streakEvent.fields["Active?"], false);
  r.rows.Submissions.get("recSub2").fields["Count This Submission?"] = 1;
  await r.run(S053, "recSub2"); await r.run(S054, occurrence.id);
  assert.equal([...r.rows["XP Events"].values()].filter((x) => x.fields["Source Key"] === streakEvent.fields["Source Key"]).length, 1);
  assert.equal(streakEvent.fields["Active?"], true);

  await r.run(S066, "recEnrollment");
  const unlocks = [...r.rows["Athlete Achievement Unlocks"].values()];
  assert.equal(unlocks.length, 2);
  const milestoneResults = [];
  for (const unlock of unlocks) milestoneResults.push(await r.run(S059, unlock.id));
  const milestoneEvents = [...r.rows["XP Events"].values()].filter((event) => String(event.fields["Source Key"]).startsWith("SHOT_MILESTONE|"));
  assert.equal(milestoneEvents.length, 2, JSON.stringify(milestoneResults));
  r.rows.Submissions.get("recSub2").fields["Total Shots Counted"] = 0;
  r.rows.Submissions.get("recSub3").fields["Total Shots Counted"] = 0;
  r.rows.Enrollments.get("recEnrollment").fields["Run Shot Milestone Check?"] = true;
  await r.run(S066, "recEnrollment");
  assert.equal(unlocks.filter((x) => x.fields["Active?"] === false).length, 1);
  const withdrawn = unlocks.find((unlock) => unlock.fields["Active?"] === false);
  await r.run(S059, withdrawn.id);
  const withdrawnEvent = milestoneEvents.find((event) => event.fields["Source Key"] === withdrawn.fields["Milestone Source Key"]);
  assert.equal(withdrawnEvent.fields["Active?"], false);
  r.rows.Submissions.get("recSub2").fields["Total Shots Counted"] = 10;
  r.rows.Submissions.get("recSub3").fields["Total Shots Counted"] = 10;
  r.rows.Enrollments.get("recEnrollment").fields["Run Shot Milestone Check?"] = true;
  await r.run(S066, "recEnrollment"); await r.run(S059, withdrawn.id);
  assert.equal(withdrawnEvent.fields["Active?"], true, "restoration reuses the same milestone event");

  // A direct unlock backlink cannot mask an unlinked duplicate Source Key.
  withdrawn.fields["XP Award Status"] = { name: "Pending" };
  r.rows["XP Events"].set("recHiddenMilestoneDuplicate", {
    id: "recHiddenMilestoneDuplicate",
    fields: {
      "Source Key": withdrawn.fields["Milestone Source Key"],
      "Achievement Unlock": [],
      "Active?": true,
    },
  });
  const duplicateResult = await r.run(S059, withdrawn.id);
  assert.equal(duplicateResult.statusOut, "error");
  assert.match(duplicateResult.errorOut, /duplicate or mismatched XP candidates/i);
  console.log("PASS mocked 053/054 and 066/059 lifecycle execution");
})().catch((error) => { console.error(error); process.exitCode = 1; });

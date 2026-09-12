#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { resolveWeekForActivityDate } = require("../../lib/challenge-year");
function test(name, fn) { try { fn(); console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}`); throw error; } }
const weeks = [
  { id: "rech8lgJkNMStWh9A", displayLabel: "Week 9", weekKey: "2026-2027|Week 9", challengeYear: "2026-2027", startDate: "2027-06-27", endDate: "2027-06-30", active: true },
  { id: "recsWuPMbRH0W5aRU", displayLabel: "Post-Challenge", weekKey: "2026-2027|Post-Challenge", challengeYear: "2026-2027", startDate: "2027-07-01", endDate: "2027-07-03", active: true },
];
function resolve(activityDate) { return resolveWeekForActivityDate({ activityDate, weeks, challengeYear: "2026-2027", timezone: "America/Denver" }); }
test("June 30 resolves to Week 9", () => { const r = resolve("2027-06-30"); assert.equal(r.ok, true); assert.equal(r.week.displayLabel, "Week 9"); });
test("July 1 resolves to Post-Challenge", () => { const r = resolve("2027-07-01"); assert.equal(r.ok, true); assert.equal(r.week.displayLabel, "Post-Challenge"); });
test("Automation 005 uses inclusive Program-Instance-scoped Week matching", () => {
  const body = fs.readFileSync(path.join(__dirname, "../../airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js"), "utf8");
  assert.ok(body.includes("activityDateKey >= start && activityDateKey <= end"));
  assert.ok(body.includes("pi === programInstanceId"));
});
test("057 v2.7 derives official dates from Week Start and End", () => {
  const body = fs.readFileSync(path.join(__dirname, "../../airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"), "utf8");
  assert.ok(body.includes("Version: 2.7"));
  assert.ok(body.includes("buildRequiredWeekDates(weekStartDateKey, weekEndDateKey)"));
  assert.ok(body.includes("requiredDateKeys[requiredDateKeys.length - 1]"));
  assert.ok(body.includes("Passing official days: ${passingDays.length}/${requiredDateKeys.length}"));
  assert.ok(!body.includes("requiredDateKeys[6]"));
});
test("057 preserves normal 1/7 daily shot pace in partial terminal Week", () => {
  const body = fs.readFileSync(path.join(__dirname, "../../airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"), "utf8");
  assert.ok(body.includes("dailyMinimum = Math.ceil(weeklyGoal / CONFIG.requiredDailyCount)"));
  assert.ok(body.includes("requiredDailyCount: 7"));
});
test("Week 9 and Post-Challenge are contiguous", () => { assert.equal(weeks[0].endDate, "2027-06-30"); assert.equal(weeks[1].startDate, "2027-07-01"); });
console.log("SC-121 season boundary contracts: PASS");

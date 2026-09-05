"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const automation066 = fs.readFileSync(
  path.join(root, "066-achievements-and-milestones-create-shot-milestone-unlocks.js"),
  "utf8"
);
const automation122 = fs.readFileSync(
  path.join(root, "122-achievements-and-milestones-stamp-goal-met-date.js"),
  "utf8"
);

test("066 v4.0 owns SC-163 Goal Met Date", () => {
  assert.match(automation066, /Version: v4\.0/);
  assert.match(automation066, /version: "v4\.0"/);
  assert.match(automation066, /maybeStampGoalMetDateIsolated/);
  assert.match(automation066, /goalMetDateActionOut/);
  assert.match(automation066, /stamped/);
  assert.match(automation066, /skipped_already_set/);
  assert.match(automation066, /skipped_not_met/);
  assert.match(automation066, /error_unprovable/);
  assert.match(automation066, /error_ambiguous/);
  assert.match(automation066, /Never overwrite/i);
  assert.match(automation066, /do not install Automation 122/i);
  assert.doesNotMatch(automation066, /tables:\s*\{[^}]*Award Recipients/s);
  assert.match(automation066, /Conquered Goal award fulfillment \/ Award Recipients\.Date Awarded/);
});

test("122 is superseded and refuses install", () => {
  assert.match(automation122, /SUPERSEDED/i);
  assert.match(automation122, /Do NOT create or paste/i);
  assert.match(automation122, /throw new Error/);
  assert.match(automation122, /066 v4\.0/);
});

test("066 Goal Met Date outputs omit athlete/submission public IDs", () => {
  assert.match(automation066, /goalMetDateOut/);
  assert.doesNotMatch(automation066, /crossingSubmissionIdOut/);
  assert.match(
    automation066,
    /no athlete names \/ no submission IDs|Public outputs omit athlete/
  );
});

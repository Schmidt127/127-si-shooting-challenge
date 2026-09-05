"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const automationPath = path.join(
  root,
  "122-achievements-and-milestones-stamp-goal-met-date.js"
);
const body = fs.readFileSync(automationPath, "utf8");

test("122 script exists and is SC-163 Goal Met Date writer", () => {
  assert.match(body, /Stamp Goal Met Date/);
  assert.match(body, /Goal Met Date/);
  assert.match(body, /skipped_already_set/);
  assert.match(body, /skipped_unprovable/);
  assert.match(body, /Never overwrite/i);
  assert.match(body, /findFirstGoalMetCrossing/);
  assert.match(body, /Award Recipients\.Date Awarded is fulfillment/);
  assert.doesNotMatch(body, /tables:\s*\{[^}]*Award Recipients/s);
  assert.doesNotMatch(body, /recordLinkFieldName.: .Award Recipients/);
});

test("122 refuses non-writable Goal Met Date (lookup still installed)", () => {
  assert.match(body, /skipped_field_not_writable/);
  assert.match(body, /isWritableField/);
});

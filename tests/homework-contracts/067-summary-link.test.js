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

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("067 resolves and links an existing Weekly Athlete Summary", () => {
  assert.match(source, /weeklySummaries:\s*"Weekly Athlete Summary"/);
  assert.match(source, /weeklySummaryLink:\s*"Weekly Athlete Summary Link"/);
  assert.match(source, /async function resolveWeeklySummaryId/);
  assert.match(source, /async function ensureWeeklySummaryLink/);
  assert.match(source, /Multiple Weekly Athlete Summary records/);
  assert.match(source, /No canonical Weekly Athlete Summary exists yet/);
});

test("067 keeps XP ownership outside the reflection bridge", () => {
  assert.doesNotMatch(source, /xpEvents\s*:/);
  assert.doesNotMatch(source, /XP Events.*create/i);
  assert.match(source, /Never creates \/ modifies XP Events/);
});

console.log("067 summary-link tests passed");

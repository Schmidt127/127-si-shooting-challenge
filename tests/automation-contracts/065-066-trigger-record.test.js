#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { detectDisallowedHardcodes } = require("../../lib/challenge-year/automation-audit");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const root = path.join(__dirname, "../..");
const s065 = fs.readFileSync(
  path.join(
    root,
    "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js"
  ),
  "utf8"
);
const s066 = fs.readFileSync(
  path.join(
    root,
    "airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js"
  ),
  "utf8"
);

test("065 documents dynamic triggering recordId input", () => {
  assert.match(s065, /v10\.3/);
  assert.match(s065, /readTriggerRecordId/);
  assert.match(s065, /Missing input variable: recordId/);
  assert.match(s065, /Invalid Homework Completion recordId/);
  assert.match(s065, /never paste a literal test record ID/);
});

test("066 documents dynamic triggering recordId input", () => {
  assert.match(s066, /v3\.9/);
  assert.match(s066, /readTriggerRecordId/);
  assert.match(s066, /Missing input variable: recordId/);
  assert.match(s066, /Invalid Enrollment recordId/);
  assert.match(s066, /never paste a literal test record ID/);
});

test("065 executable logic contains no hardcoded record literals", () => {
  const scan = detectDisallowedHardcodes(s065);
  const hardFails = scan.findings.filter((f) => f.severity === "FAIL");
  assert.equal(hardFails.length, 0, JSON.stringify(hardFails));
  assert.doesNotMatch(s065, /recordId\s*=\s*["']rec[A-Za-z0-9]{10,}/);
});

test("066 executable logic contains no hardcoded record literals", () => {
  const scan = detectDisallowedHardcodes(s066);
  const hardFails = scan.findings.filter((f) => f.severity === "FAIL");
  assert.equal(hardFails.length, 0, JSON.stringify(hardFails));
  assert.doesNotMatch(s066, /recordId\s*=\s*["']rec[A-Za-z0-9]{10,}/);
});

console.log("065-066-trigger-record contract tests passed");

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const card067 = read("docs/prod-completion/2026-08-10/AUTOMATION-067-V3.4-PROD-TEST-CARD.md");
const card115 = read("docs/prod-completion/2026-08-10/AUTOMATION-115-V2.0-PROD-TEST-CARD.md");
const source067 = read("airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js");
const source115 = read("airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js");

test("067 operator card matches the installed source contract", () => {
  assert.match(source067, /version:\s*"v3\.4"/);
  for (const required of [
    "Final Reflection Quiz Submissions",
    "Program Homework Assignment",
    "Homework Library",
    "HW 17",
    "exactly one",
    "XP Events created directly by 067",
    "Submission Assets created by this attachment-less run",
  ]) assert.ok(card067.includes(required), `067 card missing: ${required}`);
});

test("115 operator card enforces PHA-first homework intake", () => {
  assert.match(source115, /version:\s*"v2\.0"/);
  assert.match(source115, /blocked_homework_library_rid/);
  for (const required of [
    "Testing Scenarios",
    "Scenario Type",
    "Homework Assignment",
    "PHA RID",
    "Homework Name 1",
    "005 → 009 → 020",
    "XP Events created directly by 115",
    "creates an additional Submission by design",
  ]) assert.ok(card115.includes(required), `115 card missing: ${required}`);
});

test("both operator cards preserve evidence by default", () => {
  assert.match(card067, /None by default/);
  assert.match(card115, /None by default/);
  assert.doesNotMatch(card067, /delete.*Enrollment/i);
  assert.doesNotMatch(card115, /delete.*Enrollment/i);
});

#!/usr/bin/env node
/**
 * Field-contract tests for Shooting Challenge Airtable data model (Agent 2).
 *
 * Validates:
 * - Critical fields exist in PROD schema snapshot markdown
 * - Week Key formula is RECORD_ID() (not year|Week Name)
 * - Summary Key / Enrollment Key formula shapes
 * - WAS email status field set
 * - XP Source Key registry prefixes align with automation scripts
 * - Scripts do not write formula-only identity fields
 *
 * Run: node tests/data-model/field-contracts.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const SCHEMA_DOC = path.join(
  ROOT,
  "airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts",
  "schema_doc_appn84sqPw03zEbTT_20260723_152229.md"
);
const REGISTRY = path.join(
  ROOT,
  "docs/next-wave/automation-ownership/xp-source-key-registry.json"
);
const AUTO_DIR = path.join(ROOT, "airtable/automations/shooting-challenge");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${error && error.message ? error.message : error}`);
  }
}

function read(p) {
  assert.ok(fs.existsSync(p), `missing file: ${p}`);
  // Normalize CRLF so multiline field parsers are stable on Windows.
  return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
}

function sectionAfter(doc, heading) {
  const idx = doc.indexOf(heading);
  assert.ok(idx >= 0, `heading not found: ${heading}`);
  const next = doc.indexOf("\n## Table:", idx + heading.length);
  return next >= 0 ? doc.slice(idx, next) : doc.slice(idx);
}

function fieldBlock(section, fieldName) {
  const marker = `- **${fieldName}**`;
  const start = section.indexOf(marker);
  assert.ok(start >= 0, `field not found: ${fieldName}`);
  const after = start + marker.length;
  const rest = section.slice(after);
  const nextField = rest.search(/\n- \*\*/);
  const nextTable = rest.search(/\n## /);
  let end = rest.length;
  if (nextField >= 0) end = Math.min(end, nextField);
  if (nextTable >= 0) end = Math.min(end, nextTable);
  return section.slice(start, after + end);
}

const schema = read(SCHEMA_DOC);
const weeks = sectionAfter(schema, "## Table: **Weeks**");
const enrollments = sectionAfter(schema, "## Table: **Enrollments**");
const was = sectionAfter(schema, "## Table: **Weekly Athlete Summary**");
const xp = sectionAfter(schema, "## Table: **XP Events**");
const unlocks = sectionAfter(schema, "## Table: **Athlete Achievement Unlocks**");
const hc = sectionAfter(schema, "## Table: **Homework Completions**");
const config = sectionAfter(schema, "## Table: **Config**");

test("PROD snapshot lists core SC tables (not Team Shot Tracker inactivity)", () => {
  for (const t of [
    "Enrollments",
    "Weeks",
    "Config",
    "Submissions",
    "Submission Assets",
    "Homework Completions",
    "XP Events",
    "Weekly Athlete Summary",
    "Athlete Achievement Unlocks",
    "Level Gate Rules",
    "Video Feedback",
    "Zoom Meetings",
    "Zoom Attendance",
    "XP Reward Rules",
    "Shot Milestones",
  ]) {
    assert.ok(schema.includes(`## Table: **${t}**`), `missing table ${t}`);
  }
  assert.ok(!/inactivity.?alert/i.test(schema), "unexpected inactivity alert wording in schema doc");
});

test("Week Key formula is RECORD_ID() — not year|Week Name", () => {
  const block = fieldBlock(weeks, "Week Key");
  assert.ok(/type: `formula`/.test(block));
  assert.ok(/RECORD_ID\(\)/.test(block), "Week Key must be RECORD_ID()");
  assert.ok(!/2026-2027/.test(block), "Week Key must not embed school year string");
});

test("Weeks primary is Week Name text; Start/End are America/Denver dateTime", () => {
  assert.ok(/primary field: \*\*Week Name\*\*/.test(weeks));
  const start = fieldBlock(weeks, "Start Date");
  const end = fieldBlock(weeks, "End Date");
  assert.ok(/dateTime/.test(start) && /America\/Denver/.test(start));
  assert.ok(/dateTime/.test(end) && /America\/Denver/.test(end));
  assert.ok(!/^\*\*Week End Key\*\*/m.test(weeks) && !/- \*\*Week End Key\*\*/.test(weeks),
    "Week End Key must not exist as a Weeks field (118 derives from End Date)");
});

test("Enrollment Key = Athlete ID Lookup | School Year", () => {
  const block = fieldBlock(enrollments, "Enrollment Key");
  assert.ok(/Athlete ID Lookup/.test(block));
  assert.ok(/School Year/.test(block));
  assert.ok(/& \\"\|\\" &/.test(block) || /& \"\|\" &/.test(block) || /\|/.test(block));
});

test("WAS Summary Key joins Enrollment Key - Lkp and Week Key - Lkp", () => {
  const block = fieldBlock(was, "Summary Key");
  assert.ok(/Enrollment Key - Lkp/.test(block));
  assert.ok(/Week Key - Lkp/.test(block));
  assert.ok(/type: `formula`/.test(block));
});

test("WAS weekly email status field contract present", () => {
  for (const f of [
    "Build Weekly Email Now?",
    "Weekly Email Ready?",
    "Send to Make?",
    "Weekly Email Sent?",
    "Weekly Email Sent At",
    "Make Send Status",
    "Weekly Summary Email Status",
    "Weekly Summary Sent At",
    "sendMode",
    "Weekly Email Subject",
    "Weekly Email HTML",
    "Weekly Email Recipients",
  ]) {
    fieldBlock(was, f);
  }
  const mode = fieldBlock(was, "sendMode");
  assert.ok(/Test/.test(mode) && /Live/.test(mode));
});

test("XP Events Source Key is writable text; dedupe keys are formula-only", () => {
  const source = fieldBlock(xp, "Source Key");
  assert.ok(/singleLineText/.test(source));
  const dedupe = fieldBlock(xp, "XP Dedupe Key");
  const norm = fieldBlock(xp, "XP Dedupe Key Normalized");
  assert.ok(/type: `formula`/.test(dedupe));
  assert.ok(/type: `formula`/.test(norm));
});

test("Unlock Key formula-only; Milestone Source Key text", () => {
  assert.ok(/type: `formula`/.test(fieldBlock(unlocks, "Unlock Key")));
  assert.ok(/singleLineText/.test(fieldBlock(unlocks, "Milestone Source Key")));
});

test("Homework Completion Key formula depends on Enrollment|Week|Homework", () => {
  const block = fieldBlock(hc, "Homework Completion Key");
  assert.ok(/Enrollment/.test(block) && /Week/.test(block) && /Homework/.test(block));
  assert.ok(/type: `formula`/.test(block));
});

test("Config primary is Active School Year", () => {
  assert.ok(/primary field: \*\*Active School Year\*\*/.test(config));
});

test("XP Source Key registry prefixes appear in named automation scripts", () => {
  const registry = JSON.parse(read(REGISTRY));
  const checks = [
    { prefix: "SUBMISSION_XP|", file: "010-submission-intake-create-xp-event.js" },
    { prefix: "HOMEWORK_XP|", file: "065-homework-review-and-xp-create-homework-xp-event.js" },
    { prefix: "VIDEO_SUBMISSION|", file: "114-video-review-and-xp-create-or-update-video-xp-event.js" },
    { prefix: "STREAK_XP|", file: "054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js" },
    { prefix: "SHOT_MILESTONE|", file: "066-achievements-and-milestones-create-shot-milestone-unlocks.js" },
    { prefix: "PERFECT_WEEK|", file: "058-achievements-and-milestones-create-perfect-week-unlock.js" },
    { prefix: "ZOOM_ATTEND_BASE|", file: "101-zoom-attendance-xp-award-meeting-xp.js" },
    { prefix: "WEEKLY_EMAIL|", file: "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js" },
  ];
  for (const c of checks) {
    const entry = registry.prefixes.find((p) => p.prefix === c.prefix);
    assert.ok(entry, `registry missing ${c.prefix}`);
    const text = read(path.join(AUTO_DIR, c.file));
    const needle = c.prefix.replace(/\|$/, "");
    assert.ok(text.includes(needle), `${c.file} missing ${needle}`);
  }
});

test("031/101/118 do not assign Summary Key on create payloads", () => {
  const files = [
    "031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js",
    "101-zoom-attendance-xp-award-meeting-xp.js",
    "118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js",
  ];
  for (const f of files) {
    const text = read(path.join(AUTO_DIR, f));
    assert.ok(
      !/"Summary Key"\s*:/.test(text) && !/\["Summary Key"\]\s*=/.test(text),
      `${f} must not write Summary Key`
    );
  }
});

test("074 sendMode resolution does not hardcode permanent Test as sole mode", () => {
  const text = read(
    path.join(
      AUTO_DIR,
      "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js"
    )
  );
  assert.ok(/sendMode/.test(text));
  assert.ok(/live/i.test(text), "074 must support live mode");
  // Allowed to default to test when blank — must not remove Live branch handling
  assert.ok(/test/i.test(text));
});

test("data-model pack documents Week Key correction", () => {
  const audit = read(path.join(ROOT, "docs/next-wave/data-model/UNIQUE-KEY-AUDIT.md"));
  assert.ok(/RECORD_ID\(\)/.test(audit));
  assert.ok(/not\*\* the Week Key formula/i.test(audit) || /NOT\*\* the Week Key/i.test(audit) || /not the Week Key/i.test(audit));
});

console.log("");
console.log(`Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

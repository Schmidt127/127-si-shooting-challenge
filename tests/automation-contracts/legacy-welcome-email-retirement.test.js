#!/usr/bin/env node
/**
 * Contract: legacy Enrollment welcome-email fields + Automation 075 are retired.
 * Live welcome path is 078A → Email Handoff Queue → 079 → Hub → Resend.
 * Protected fields (shot milestone trigger + Public Missing*) must stay wired.
 *
 * Run: node tests/automation-contracts/legacy-welcome-email-retirement.test.js
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const AUTO = path.join(ROOT, "airtable/automations/shooting-challenge");
const WEB_QUERIES = path.join(ROOT, "web/lib/airtable/queries.ts");
const WEB_PROFILE = path.join(ROOT, "web/lib/data/public-athlete-profile.ts");
const PROBE = path.join(ROOT, "tools/testing/ops_email_readiness_probe.mjs");
const INDEX = path.join(ROOT, "docs/automation-index.md");
const RETIRE = path.join(
  ROOT,
  "docs/deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md"
);

const LEGACY_ENROLLMENT_FIELDS = [
  "Parent Email Subject",
  "Parent Email HTML",
  "Welcome Email Status",
  "Welcome Email Sent At",
  "Welcome Email Error",
  "Welcome Email Ready?",
];

const PROTECTED_FIELDS = [
  "Run Shot Milestone Check?",
  "Public Missing Homework",
  "Public Missing Zoom",
  "Public Missing Streak",
];

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

function read(relOrAbs) {
  const p = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(ROOT, relOrAbs);
  assert.ok(fs.existsSync(p), `missing: ${p}`);
  return fs.readFileSync(p, "utf8");
}

function script(namePrefix) {
  const files = fs.readdirSync(AUTO).filter((f) => f.endsWith(".js"));
  const hit = files.find((f) => f.startsWith(namePrefix));
  assert.ok(hit, `expected script starting with ${namePrefix}`);
  return { file: hit, body: read(path.join(AUTO, hit)) };
}

test("075 archive is labeled LEGACY/RETIRED and is not Zoom XP", () => {
  const { file, body } = script("075-");
  assert.match(file, /welcome-email/i);
  assert.match(body, /LEGACY\s*\/\s*RETIRED/i);
  assert.match(body, /DO NOT (PASTE|DEPLOY|ENABLE|RESTORE)/i);
  assert.match(body, /078A/);
  assert.match(body, /Automation 101/);
  assert.doesNotMatch(body, /Zoom\s*\/\s*Attendance XP is Automation 075/i);
});

test("078A and 079 do not read or write retired Enrollment welcome fields", () => {
  const a078 = script("078A-");
  const a079 = script("079-");
  for (const field of LEGACY_ENROLLMENT_FIELDS) {
    assert.ok(
      !a078.body.includes(field),
      `078A must not reference ${field}`
    );
    assert.ok(
      !a079.body.includes(field),
      `079 must not reference ${field}`
    );
  }
  assert.match(a078.body, /Email Handoff Queue|HANDOFF|WELCOME/);
  assert.match(a079.body, /Communications Hub|WELCOME|Email Handoff Queue/);
});

test("101 Zoom/Attendance XP script is present and untouched by welcome retirement", () => {
  const { file, body } = script("101-");
  assert.match(file, /zoom/i);
  assert.match(body, /XP/i);
  for (const field of LEGACY_ENROLLMENT_FIELDS) {
    assert.ok(!body.includes(field), `101 must not reference ${field}`);
  }
});

test("010 and 066 still depend on Run Shot Milestone Check?", () => {
  const a010 = script("010-");
  const a066 = script("066-");
  assert.ok(a010.body.includes("Run Shot Milestone Check?"));
  assert.ok(a066.body.includes("Run Shot Milestone Check?"));
});

test("web public profile still selects all three Public Missing fields", () => {
  const queries = read(WEB_QUERIES);
  const profile = read(WEB_PROFILE);
  for (const field of [
    "Public Missing Homework",
    "Public Missing Zoom",
    "Public Missing Streak",
  ]) {
    assert.ok(queries.includes(`"${field}"`), `queries.ts missing ${field}`);
    assert.ok(
      profile.includes(`fields["${field}"]`) || profile.includes(`['${field}']`),
      `public-athlete-profile.ts missing ${field}`
    );
  }
});

test("ops email readiness probe no longer arms Welcome Email Ready? / 075", () => {
  const probe = read(PROBE);
  assert.doesNotMatch(probe, /Arm Welcome Email Ready\?/);
  assert.doesNotMatch(probe, /run 075/);
  assert.match(probe, /078A/);
  assert.match(probe, /legacy Enrollment welcome/i);
  for (const field of LEGACY_ENROLLMENT_FIELDS) {
    // Mentions in "do not restore" guidance are OK; field must not be fetched.
    if (field === "Parent Email Subject" || field === "Parent Email HTML") {
      continue;
    }
  }
  assert.doesNotMatch(
    probe,
    /"Welcome Email Status"|"Welcome Email Ready\?"|"Welcome Email Sent At"|"Welcome Email Error"|"Parent Email Subject"|"Parent Email HTML"/
  );
});

test("automation-index and retire packet document 075 retirement + protected fields", () => {
  const index = read(INDEX);
  const retire = read(RETIRE);
  assert.match(index, /075 is LEGACY RETIRED/i);
  assert.match(index, /078A → Email Handoff Queue → 079/);
  assert.match(index, /Zoom live XP=\*\*101\*\*/);
  for (const field of LEGACY_ENROLLMENT_FIELDS) {
    assert.ok(retire.includes(field), `retire packet missing ${field}`);
  }
  for (const field of PROTECTED_FIELDS) {
    assert.ok(retire.includes(field), `retire packet must protect ${field}`);
  }
  assert.match(retire, /Delete \*\*first\*\*/);
  assert.match(retire, /fldoXWryfQ32rsx3x/);
});

test("active automations exclude 075 from live email package section claims", () => {
  const map = read("airtable/schema/current/automation-trigger-map.md");
  assert.match(map, /LEGACY RETIRED/);
  assert.match(map, /\*\*078A\*\*/);
  assert.doesNotMatch(
    map,
    /\|\s*075\s*\|\s*Enrollments\s*\|\s*\*confirm\*/
  );
});

console.log("legacy-welcome-email-retirement tests passed");

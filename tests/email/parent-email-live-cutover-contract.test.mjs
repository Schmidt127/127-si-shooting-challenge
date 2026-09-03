#!/usr/bin/env node
/**
 * Parent-email Live cutover contracts — GitHub source assertions only.
 * Run: node --test tests/email/parent-email-live-cutover-contract.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const AUTO = join(ROOT, "airtable/automations/shooting-challenge");
const HARNESS = readFileSync(
  join(ROOT, "tools/testing/parent-email-live-cutover.mjs"),
  "utf8",
);
const CHECKLIST = readFileSync(
  join(ROOT, "docs/deploy-checklists/parent-email-live-cutover-2026-09-02.md"),
  "utf8",
);

function script(slotPrefix) {
  const file = readdirSync(AUTO).find((f) => f.startsWith(`${slotPrefix}-`));
  assert.ok(file, `missing script for ${slotPrefix}`);
  const body = readFileSync(join(AUTO, file), "utf8");
  return { file, body };
}

const PRODUCERS = [
  { slot: "071", version: "v4.3" },
  { slot: "073", version: "v4.6" },
  { slot: "074", version: "v3.5" },
  { slot: "076", version: "v8.12" },
  { slot: "078A", version: "v1.5" },
  { slot: "117", version: "v2.1" },
];

test("queue producers default testMode to safe true", () => {
  for (const { slot, version } of PRODUCERS) {
    const { body } = script(slot);
    assert.match(body, new RegExp(`version:\\s*"${version.replace(".", "\\.")}"`));
    assert.match(
      body,
      /testMode[\s\S]{0,400}default\s+true|testMode === undefined \? true|cfg\.testMode === undefined \? true/i,
      `${slot} must default testMode true`,
    );
  }
});

test("078A v1.5 exposes optional testMode automation input without hardcoded recipient", () => {
  const { body } = script("078A");
  assert.match(body, /version:\s*"v1\.5"/);
  assert.match(body, /testMode/);
  assert.match(body, /Parent Email - Cleaned/);
  assert.doesNotMatch(body, /schmidt@|mschmidt@fairfield/i);
  assert.doesNotMatch(body, /\brec[a-zA-Z0-9]{14}\b/);
});

test("Live cutover checklist documents explicit Live inputs", () => {
  assert.match(CHECKLIST, /testMode.*false/i);
  assert.match(CHECKLIST, /dryRun.*false/i);
  assert.match(CHECKLIST, /sendMode.*Live/i);
  assert.match(CHECKLIST, /ingressSecret/);
  assert.match(CHECKLIST, /enrollmentRid/);
  assert.match(CHECKLIST, /zoomMeetingRid/);
});

test("producers require dynamic recordId and use Parent Email - Cleaned", () => {
  for (const { slot } of PRODUCERS) {
    const { body } = script(slot);
    assert.match(body, /recordId/, `${slot} must use recordId input`);
    assert.match(body, /Parent Email - Cleaned/, `${slot} must use Cleaned parent email`);
    if (slot !== "078A") {
      assert.match(body, /guardian|"guardian"/, `${slot} recipient role`);
    }
  }
  const s078 = script("078A").body;
  assert.match(s078, /PARENT|ATHLETE/);
});

test("072 weekly builder is documented exception for raw Parent Email fallback", () => {
  const { body } = script("072");
  assert.match(body, /Parent Email - Cleaned/);
  assert.match(body, /Parent Email/);
  assert.match(CHECKLIST, /072.*raw.*Parent Email/i);
});

test("duplicate handoff keys are stable per event type", () => {
  const keys = [
    ["076", "DAILY_SUBMISSION\\|SUBMISSIONS\\|"],
    ["071", "HOMEWORK_FEEDBACK\\|HOMEWORK_COMPLETIONS\\|"],
    ["073", "VIDEO_FEEDBACK\\|VIDEO_FEEDBACK\\|"],
    ["074", "WEEKLY_ATHLETE_SUMMARY\\|WEEKLY_ATHLETE_SUMMARY\\|"],
    ["078A", "WELCOME\\|ENROLLMENTS\\|"],
    ["117", "ZOOM_RECORDING_APPROVAL\\|ZOOM_ATTENDANCE\\|"],
  ];
  for (const [slot, pattern] of keys) {
    assert.match(script(slot).body, new RegExp(pattern));
  }
  const s079 = script("079").body;
  assert.match(s079, /accepted_duplicate|Attempt Count/);
  assert.match(s079, /Needs Review/);
});

test("079 retry and failure handling without secret logging", () => {
  const { body } = script("079");
  assert.match(body, /Attempt Count/);
  assert.match(body, /Failed/);
  assert.match(body, /ingressSecret/);
  assert.doesNotMatch(body, /console\.log\([^)]*ingressSecret/);
});

test("118 and 119 schedulers default dryRun true", () => {
  const s118 = script("118").body;
  const s119 = script("119").body;
  assert.match(s118, /dryRun[\s\S]{0,200}default\s+true|dryRun\s*=\s*true/i);
  assert.match(s119, /dryRun[\s\S]{0,200}default\s+true|dryRun\s*=\s*true/i);
  assert.doesNotMatch(s118, /makeWebhookUrl|hook\.us1\.make\.com/);
  assert.doesNotMatch(s119, /remoteFetchAsync/);
});

test("email producers do not call Make or Gmail directly", () => {
  for (const { slot } of PRODUCERS) {
    const { body } = script(slot);
    assert.doesNotMatch(body, /hook\.us1\.make\.com/);
    assert.doesNotMatch(body, /gmail\.com/i);
  }
});

test("verification harness redacts emails and avoids secret logging", () => {
  assert.match(HARNESS, /redactEmail/);
  assert.match(HARNESS, /never logs secrets/i);
  assert.doesNotMatch(HARNESS, /console\.(log|info|error)\([^)]*AIRTABLE_API_TOKEN/);
  assert.doesNotMatch(HARNESS, /console\.(log|info|error)\([^)]*ingressSecret/);
  assert.match(HARNESS, /078A/);
  assert.match(HARNESS, /SAFE_EMAIL/);
});

test("117 requires enrollmentRid and zoomMeetingRid inputs", () => {
  const { body } = script("117");
  assert.match(body, /enrollmentRid/);
  assert.match(body, /zoomMeetingRid/);
});
